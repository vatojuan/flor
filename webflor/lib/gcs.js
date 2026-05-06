// lib/gcs.js
import { Storage } from '@google-cloud/storage';

const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
  throw new Error("La variable de entorno GCS_BUCKET_NAME no está definida");
}

const storage = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

export async function uploadFile(buffer, destination, contentType) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);
  // Guardar el archivo sin intentar modificar ACLs
  await file.save(buffer, { resumable: false, contentType });
  // Generar una URL firmada para lectura (válida por 15 minutos)
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutos
  };
  const [url] = await file.getSignedUrl(options);
  return url;
}

// Nueva función para generar una URL firmada nueva para un archivo existente
export async function getNewSignedUrl(fileName) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // URL válida por 1 hora
  };
  const [url] = await file.getSignedUrl(options);
  return url;
}
