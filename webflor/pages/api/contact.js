// pages/api/contact.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  console.log("SMTP_HOST:", process.env.SMTP_HOST); // Verifica que se cargue la variable

  // Configurar el transporter con las variables SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true para 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER, // remitente
      to: process.env.SMTP_USER,   // destinatario (puedes cambiarlo si lo necesitas)
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      text: `Nombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`,
    });

    return res.status(200).json({ message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Error enviando email:", error);
    return res.status(500).json({ message: "Error al enviar el mensaje" });
  }
}
