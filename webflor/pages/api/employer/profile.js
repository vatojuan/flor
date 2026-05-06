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
    console.log(`[API /api/employer/profile] GET: Buscando perfil para el ID: ${userId}`);
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
        console.error(`[API /api/employer/profile] Usuario no encontrado para el ID: ${userId}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log("[API /api/employer/profile] Perfil de usuario encontrado:", userProfile);
      return res.status(200).json(userProfile);

    } catch (error) {
      console.error('[API /api/employer/profile] Error en GET:', error);
      return res.status(500).json({ error: 'Error del servidor al obtener el perfil' });
    }
  } 
  // --- Lógica para PUT (actualizar datos del perfil) ---
  else if (req.method === 'PUT') {
    const { name, companyName, description, phone } = req.body;
    console.log(`[API /api/employer/profile] PUT: Actualizando perfil para el ID: ${userId}`);

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

      console.log(`✅ Perfil de usuario actualizado para ${userId}`);
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
