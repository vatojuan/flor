// pages/api/job/cancel-application.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'No autorizado' });

    const userId = Number(session.user.id);
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Falta el ID del empleo' });

    // 1) Elimino la aplicación local
    const deleted = await prisma.application.deleteMany({
      where: { userId, jobId: Number(jobId) },
    });

    // 2) Notifico a FastAPI para cancelar la propuesta pendiente
    const fastApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/proposals/cancel`;
    const token = req.cookies['adminToken']; // o adaptarlo si usas otro esquema
    await fetch(fastApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ job_id: jobId, applicant_id: userId }),
    });

    return res.status(200).json({ message: 'Postulación cancelada', deleted });
  } catch (error) {
    console.error('Error al cancelar postulación:', error);
    return res.status(500).json({ error: 'Error al cancelar postulación' });
  }
}
