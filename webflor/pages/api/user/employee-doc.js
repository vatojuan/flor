// pages/api/employee/documents.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'No autorizado' });
    const employeeId = Number(session.user.id);
    const documents = await prisma.employeeDocument.findMany({
      where: { userId: employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
