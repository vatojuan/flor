// pages/api/employer/profile.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const userId = Number(session.user.id);

  // --- Lógica para GET (obtener datos del perfil) ---
  if (req.method === 'GET') {
    try {
      // Leemos todo desde el modelo 'User', que es donde están los datos.
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profilePicture: true,
          companyName: true,
          description: true,
          phone: true,
        },
      });

      if (!userProfile) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.status(200).json(userProfile);

    } catch (error) {
      console.error('[API /api/employer/profile] Error en GET:', error);
      return res.status(500).json({ error: 'Error del servidor al obtener el perfil' });
    }
  } 
  // --- Lógica para PUT (actualizar datos del perfil) ---
  else if (req.method === 'PUT') {
    const { name, companyName, description, phone } = req.body;
    try {
      // Actualizamos todo directamente en el modelo 'User'.
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          companyName,
          description,
          phone,
        },
      });

      return res.status(200).json(updatedUser);

    } catch (error) {
      console.error('[API /api/employer/profile] Error en PUT:', error);
      return res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
  } 
  // --- Manejo de otros métodos HTTP ---
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }
}
