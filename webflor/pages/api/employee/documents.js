// pages/api/employee/documents.js

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  // Solo permitimos peticiones GET a esta ruta
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  // 1. Obtenemos la sesión del servidor para identificar al usuario
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const userId = Number(session.user.id);

  try {
    console.log(`[API /api/employee/documents] Buscando documentos para el usuario ID: ${userId}`);

    // 2. Buscamos en la base de datos TODOS los documentos que coincidan con el userId
    //    Asegúrate de que tu modelo en Prisma se llame 'employeeDocument' o ajústalo al nombre correcto.
    const documents = await prisma.employeeDocument.findMany({
      where: {
        userId: userId, // La condición clave: solo los documentos de este usuario
      },
      select: { // Seleccionamos solo los campos que el frontend necesita
        id: true,
        originalName: true,
        fileKey: true,
        // No incluimos datos sensibles o muy pesados
      },
    });

    // Si no se encuentran documentos, devolvemos un array vacío, lo cual es correcto.
    if (!documents) {
        console.log(`[API /api/employee/documents] No se encontraron documentos para el usuario ID: ${userId}`);
        return res.status(200).json({ documents: [] });
    }

    console.log(`[API /api/employee/documents] Se encontraron ${documents.length} documentos.`);
    
    // 3. Devolvemos la lista de documentos encontrados
    return res.status(200).json({ documents });

  } catch (error) {
    console.error('[API /api/employee/documents] Error al obtener documentos:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener los documentos' });
  }
}
