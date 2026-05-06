// pages/api/auth/resend-code.js
import { PrismaClient } from '@prisma/client';
import { generarCodigo } from '../../../lib/generateCode';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "El correo es requerido" });
  }

  try {
    const usuario = await prisma.user.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    if (usuario.verified) {
      return res.status(400).json({ error: "El usuario ya está verificado" });
    }

    // Comprueba si se puede reenviar: deben haber pasado al menos 2 minutos
    if (usuario.lastResend && new Date() - new Date(usuario.lastResend) < 2 * 60 * 1000) {
      return res.status(400).json({ error: "Por favor, espere al menos 2 minutos para reenviar el código." });
    }

    // Verifica que no se haya excedido el límite de 3 reenvíos
    if (usuario.resendCount >= 3) {
      return res.status(400).json({ error: "Ha excedido el límite de reenvíos. Reinicie el proceso de registro." });
    }

    // Genera un nuevo código y actualiza la expiración (15 minutos)
    const nuevoCodigo = generarCodigo(6);
    const nuevaExpiracion = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: nuevoCodigo,
        codeExpiration: nuevaExpiracion,
        verificationAttempts: 0, // Reinicia los intentos
        resendCount: usuario.resendCount + 1,
        lastResend: new Date(),
      },
    });

    // Configura el transporte SMTP
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: Number(process.env.SMTP_PORT) === 587 ? { rejectUnauthorized: false } : undefined,
    });

    // Envía el correo con el nuevo código usando el alias "No Reply"
    await transporter.sendMail({
      from: `"No Reply" <no-reply@fapmendoza.com>`,
      to: email,
      subject: "Nuevo Código de Verificación de Fap Mendoza",
      text: `Estimado usuario,

Gracias por utilizar los servicios de Fap Mendoza. Se ha generado un nuevo código de verificación para completar su registro. Por favor, utilice el siguiente código:

${nuevoCodigo}

Este código es válido por los próximos 15 minutos. Si no solicitó este reenvío, ignore este mensaje.

Atentamente,
El equipo de Fap Mendoza`,
      html: `<p>Estimado usuario,</p>
<p>Gracias por utilizar los servicios de <strong>Fap Mendoza</strong>. Se ha generado un nuevo código de verificación para completar su registro. Por favor, utilice el siguiente código:</p>
<h2>${nuevoCodigo}</h2>
<p>Este código es válido por los próximos 15 minutos. Si no solicitó este reenvío, ignore este mensaje.</p>
<p>Atentamente,<br/>El equipo de Fap Mendoza</p>`,
    });

    return res.status(200).json({ message: "Nuevo código enviado correctamente" });
  } catch (error) {
    console.error("Error al reenviar el código:", error);
    return res.status(500).json({ error: "Error al reenviar el código" });
  }
}
