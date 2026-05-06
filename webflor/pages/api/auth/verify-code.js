// pages/api/auth/verify-code.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Correo y código son requeridos" });
  }

  try {
    const usuario = await prisma.user.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Si el código expiró, se rechaza (y se puede indicar que reinicie el proceso)
    if (!usuario.codeExpiration || new Date() > new Date(usuario.codeExpiration)) {
      return res.status(400).json({ error: "El código ha expirado. Por favor, solicita uno nuevo." });
    }

    // Si ya se superaron 3 intentos, se rechaza
    if (usuario.verificationAttempts >= 3) {
      return res.status(400).json({ error: "Se superaron los intentos. Solicita un nuevo código." });
    }

    if (usuario.verificationCode === code) {
      // Código correcto: actualiza el usuario para marcarlo como verificado y limpia campos
      await prisma.user.update({
        where: { email },
        data: {
          verified: true,
          confirmed: true, // Actualiza también este campo
          verificationCode: null,
          codeExpiration: null,
          verificationAttempts: 0,
          resendCount: 0,
          lastResend: null,
        },
      });      
      return res.status(200).json({ message: "Correo verificado exitosamente." });
    } else {
      // Incrementa los intentos fallidos
      await prisma.user.update({
        where: { email },
        data: { verificationAttempts: usuario.verificationAttempts + 1 },
      });
      return res.status(400).json({ error: "Código incorrecto. Inténtalo de nuevo." });
    }
  } catch (error) {
    console.error("Error en la verificación:", error);
    return res.status(500).json({ error: "Error en la verificación" });
  }
}
