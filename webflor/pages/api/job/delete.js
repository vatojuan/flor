import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    // Obtener la sesión del usuario
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Asegurar que el `jobId` se proporciona en el cuerpo de la solicitud
    const { jobId } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ error: 'No se proporcionó el jobId' });
    }

    // Verificar si la oferta existe antes de eliminarla
    const job = await prisma.job.findUnique({
      where: { id: Number(jobId) },
      select: { id: true, title: true, embedding: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Oferta de trabajo no encontrada' });
    }

    // Eliminar la oferta (esto incluye el embedding porque está en la misma tabla)
    await prisma.job.delete({
      where: { id: Number(jobId) },
    });

    return res.status(200).json({
      message: 'Oferta eliminada correctamente',
      deletedJob: job,
    });

  } catch (error) {
    console.error('❌ Error eliminando la oferta:', error);
    return res.status(500).json({ error: 'Error al eliminar la oferta' });
  }
}

export const config = {
  api: {
    bodyParser: true, // Para que Next.js procese el JSON del body en DELETE
  },
};
