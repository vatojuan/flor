// pages/api/user/delete.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  // Obtener la sesión actual
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const userId = Number(session.user.id);
    // Eliminar el usuario; gracias al onDelete: Cascade se eliminarán sus relaciones
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });
    return res.status(200).json({ message: 'Cuenta eliminada correctamente', deletedUser });
  } catch (error) {
    console.error('Error eliminando la cuenta:', error);
    return res.status(500).json({ error: 'Error al eliminar la cuenta' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
