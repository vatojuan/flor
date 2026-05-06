// pages/api/auth/reset-password.js
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Correo, token y nueva contraseña son requeridos' });
  }
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || user.resetToken !== token) {
      return res.status(400).json({ error: 'Token inválido o caducado' });
    }
    
    if (new Date() > new Date(user.resetTokenExpiration)) {
      return res.status(400).json({ error: 'El token ha caducado. Por favor, solicite uno nuevo.' });
    }
    
    const hashedPassword = await hash(newPassword, 12);
    
    // Actualiza la contraseña y limpia los campos del token
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiration: null,
      },
    });
    
    return res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}
