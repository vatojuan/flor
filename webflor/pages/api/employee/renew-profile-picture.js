// pages/api/employee/renew-profile-picture.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { getNewSignedUrl } from '../../../lib/gcs';

export default async function handler(req, res) {
  // Verificar la sesión
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'No autorizado' });

  // Obtener el usuario y su referencia del archivo
  const userId = Number(session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.profilePictureFileName) {
    return res.status(404).json({ error: 'No se encontró la imagen de perfil' });
  }

  try {
    // Generar una nueva URL firmada usando el nombre del archivo
    const newUrl = await getNewSignedUrl(user.profilePictureFileName);
    return res.status(200).json({ url: newUrl });
  } catch (error) {
    console.error('Error al renovar la URL firmada:', error);
    return res.status(500).json({ error: 'Error al renovar la URL' });
  }
}
