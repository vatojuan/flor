// pages/api/auth/register.js
import { PrismaClient } from '@prisma/client';
import { generarCodigo } from '../../../lib/generateCode';
import { hash } from 'bcryptjs';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email, name, password, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    // Si el email ya existe y está verificado, no se permite
    const usuarioExistente = await prisma.user.findUnique({ where: { email } });
    if (usuarioExistente && usuarioExistente.verified) {
      return res.status(400).json({ error: "El email ya está registrado y verificado" });
    }

    // Genera el código de verificación (6 caracteres) y establece su expiración a 15 minutos
    const verificationCode = generarCodigo(6);
    const codeExpiration = new Date(Date.now() + 15 * 60 * 1000);

    // Hashea la contraseña
    const hashedPassword = await hash(password, 12);

    // Si el usuario existe pero no está verificado, actualiza su registro.
    // Si no existe, lo crea.
    if (usuarioExistente) {
      await prisma.user.update({
        where: { email },
        data: {
          name,
          password: hashedPassword,
          role,
          verificationCode,
          codeExpiration,
          verificationAttempts: 0,
          resendCount: 0,
          lastResend: new Date(),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
          verificationCode,
          codeExpiration,
          verified: false,
          verificationAttempts: 0,
          resendCount: 0,
          lastResend: new Date(),
        },
      });
    }

    // Configura el transporte SMTP (asegúrate de tener las variables en .env.local)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // ej.: smtp.gmail.com
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: Number(process.env.SMTP_PORT) === 587 ? { rejectUnauthorized: false } : undefined,
    });

    // Envía el correo de verificación con un contenido formal
    await transporter.sendMail({
      from: `"No Reply" <no-reply@fapmendoza.com>`,
      to: email,
      subject: "Código de verificación de Fap Mendoza",
      text: `Estimado usuario,

Gracias por registrarse en Fap Mendoza. Para completar su proceso de registro, utilice el siguiente código de verificación:

${verificationCode}

Este código es válido por 15 minutos. Si usted no ha solicitado este registro, por favor ignore este mensaje.

Atentamente,
El equipo de Fap Mendoza`,
      html: `<p>Estimado usuario,</p>
<p>Gracias por registrarse en <strong>Fap Mendoza</strong>. Para completar su proceso de registro, utilice el siguiente código de verificación:</p>
<h2>${verificationCode}</h2>
<p>Este código es válido por 15 minutos. Si usted no ha solicitado este registro, por favor ignore este mensaje.</p>
<p>Atentamente,<br/>El equipo de Fap Mendoza</p>`,
    });

    return res.status(200).json({ message: "Registro exitoso. Revisa tu correo para confirmar la cuenta." });
  } catch (error) {
    console.error("Error en el registro:", error);
    return res.status(500).json({ error: "Error en el registro" });
  }
}
