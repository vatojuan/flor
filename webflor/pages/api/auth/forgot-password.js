import prisma from '../../../lib/prisma';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El correo es requerido' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: 'Si existe una cuenta con ese correo, se enviarán instrucciones.' });
    }

    // Generamos un token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiration = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiration },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    if (!resetUrl || typeof resetUrl !== "string" || resetUrl.includes("undefined")) {
      console.error("❌ ERROR: resetUrl es inválido.");
      return res.status(500).json({ error: "Error generando el enlace de restablecimiento." });
    }

    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 🚨 FORZAMOS `mailOptions` A EVITAR VALORES NULL
    let mailOptions = {
      from: `"No Reply" <no-reply@fapmendoza.com>`,
      to: email || "no-email@example.com",
      subject: "Restablecer contraseña - Fap Mendoza",
      text: `Hemos recibido una solicitud para restablecer su contraseña.\n\nSi no ha sido usted, ignore este correo.\n\nPara restablecer su contraseña, haga clic en este enlace:\n${resetUrl}\n\nEste enlace caduca en 15 minutos.`,
      html: `<p>Hemos recibido una solicitud para restablecer su contraseña.</p>
             <p>Si no ha sido usted, ignore este correo.</p>
             <p>Para restablecer su contraseña, haga clic en el siguiente enlace:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>Este enlace caduca en 15 minutos.</p>`,
    };

    // 🚨 DETECTAMOS Y EVITAMOS CAMPOS INVÁLIDOS EN `mailOptions`
    Object.keys(mailOptions).forEach(key => {
      if (!mailOptions[key] || typeof mailOptions[key] !== "string") {
        // Field is null or invalid, replace with fallback
        mailOptions[key] = "Campo inválido"; // Evita valores nulos
      }
    });

    // 🚨 SI `mailOptions` SIGUE TENIENDO ERRORES, DETENEMOS EL PROCESO
    if (!mailOptions.to || !mailOptions.from || !mailOptions.subject || !mailOptions.text) {
      console.error("❌ ERROR: mailOptions contiene valores inválidos.");
      return res.status(500).json({ error: "Error en la estructura del correo." });
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: 'Si existe una cuenta con ese correo, se enviarán instrucciones para restablecer la contraseña.' });
    } catch (error) {
      console.error("❌ Error al enviar el correo:", error);
      return res.status(500).json({ error: 'Error en el proceso de restablecimiento de contraseña' });
    }

  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    return res.status(500).json({ error: 'Error en el proceso de forgot-password' });
  }
}
