// pages/api/employer/documents.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'No autorizado' });
    const employerId = Number(session.user.id);
    const documents = await prisma.legalDocument.findMany({
      where: { userId: employerId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
