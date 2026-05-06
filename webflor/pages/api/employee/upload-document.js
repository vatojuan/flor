// pages/api/employee/upload-document.js
import { Storage } from "@google-cloud/storage";
import prisma from "../../../lib/prisma"; // Verifica que prisma está correctamente importado
import { IncomingForm } from "formidable";
import fs from "fs";
import fetch from "node-fetch"; // Asegúrate de tener node-fetch instalado (npm install node-fetch)
// Si usas node-fetch v2 y no cuenta con AbortController, instala "abort-controller" (npm install abort-controller)
// y luego: import AbortController from "abort-controller";

export const config = {
  api: {
    bodyParser: false, // Desactivar el bodyParser para manejar archivos correctamente
  },
};

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GCLOUD_CREDENTIALS),
});

//const storage = new Storage({
  //projectId: process.env.GCLOUD_PROJECT_ID,
  //keyFilename: process.env.GCLOUD_KEYFILE,
//});

const bucketName = process.env.GCLOUD_BUCKET;
console.log("Bucket Name:", bucketName);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!bucketName) {
    return res
      .status(500)
      .json({ error: "No se encontró el nombre del bucket en las variables de entorno." });
  }

  const form = new IncomingForm();

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    console.log("Fields:", fields);
    console.log("Files:", files.document);

    if (!files.document) {
      return res.status(400).json({ error: "No se encontró el archivo" });
    }

    const uploadedFile = Array.isArray(files.document)
      ? files.document[0]
      : files.document;
    console.log("Uploaded file:", uploadedFile);

    if (!uploadedFile.filepath) {
      return res.status(500).json({ error: "Error: La ruta del archivo está vacía." });
    }

    console.log("Ruta del archivo:", uploadedFile.filepath);

    // Genera un nombre único para el archivo
    const fileKey = `employee-documents/${Date.now()}_${
      uploadedFile.originalFilename || "archivo_sin_nombre"
    }`;
    console.log(`Subiendo archivo ${fileKey} al bucket ${bucketName}`);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileKey);

    // Convertir el archivo a Stream
    const fileStream = fs.createReadStream(uploadedFile.filepath);

    // Subir el archivo a Google Cloud Storage usando createWriteStream()
    await new Promise((resolve, reject) => {
      const writeStream = file.createWriteStream({
        resumable: false,
        contentType: uploadedFile.mimetype,
      });

      writeStream.on("finish", () => {
        console.log("✅ Archivo subido exitosamente a Google Cloud Storage");
        resolve();
      });

      writeStream.on("error", (err) => {
        console.error("❌ Error en writeStream:", err);
        reject(err);
      });

      fileStream.pipe(writeStream);
    });

    // Validaciones antes de guardar en la base de datos
    const userId = Number(fields.userId) || 1; // Asegura que userId no sea null
    const originalName = uploadedFile.originalFilename || "archivo_sin_nombre";

    console.log("📌 Verificando datos antes de la inserción en BD:");
    console.log(`🔹 fileKey: ${fileKey}`);
    console.log(`🔹 originalName: ${originalName}`);
    console.log(`🔹 userId: ${userId}`);

    console.log("💾 Verificando conexión con Prisma...");

    // Prueba simple de conexión con Prisma
    try {
      const testQuery = await prisma.user.findFirst();
      console.log("✅ Conexión con Prisma exitosa:", testQuery);
    } catch (dbTestError) {
      console.error("❌ Error al probar la conexión con Prisma:", dbTestError);
      return res.status(500).json({
        error: "Error al conectar con la base de datos",
        details: dbTestError.message,
      });
    }

    console.log("💾 Insertando en la base de datos...");

    // Guarda el documento en la base de datos con manejo de errores detallado
    let newDocument;
    try {
      newDocument = await prisma.employeeDocument.create({
        data: {
          url: "", // Se generará la URL on-demand, o puedes almacenarla luego
          fileKey: fileKey,
          originalName: originalName,
          userId: userId,
        },
      });
      console.log("✅ Documento guardado en la base de datos:", newDocument);
    } catch (dbError) {
      console.error("❌ Error en la base de datos:", dbError);
      return res.status(500).json({
        error: "Error al insertar en la base de datos",
        details: dbError.message,
      });
    }

    // Enviar webhook a la API de FastAPI para procesar el archivo y generar embedding
    try {
      // Aumentamos el timeout a 10 segundos
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.error("❌ Timeout alcanzado en la petición webhook, abortando...");
        controller.abort();
      }, 10000);

      const webhookResponse = await fetch("http://127.0.0.1:8000/webhooks/file_uploaded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: fields.userId, // O userId, según lo que uses
          file_url: fileKey,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!webhookResponse.ok) {
        const errBody = await webhookResponse.text();
        console.error("❌ Error en la respuesta del webhook:", errBody);
      } else {
        const webhookData = await webhookResponse.json();
        console.log("✅ Webhook response:", webhookData);
      }
    } catch (webhookError) {
      if (webhookError.name === "AbortError") {
        console.error("❌ Webhook request timed out.");
      } else {
        console.error("❌ Error al enviar webhook:", webhookError);
      }
      // Continuamos sin bloquear la respuesta principal
    }

    return res.status(200).json({ document: newDocument });
  } catch (error) {
    console.error("❌ Error general en la subida de documento:", error);
    return res.status(500).json({
      error: "Error subiendo el documento",
      details: error.message,
    });
  }
}
