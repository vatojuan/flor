// pages/api/job/employer.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const userId = Number(session.user.id);
  try {
    const jobs = await prisma.job.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
