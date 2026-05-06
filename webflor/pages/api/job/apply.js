// pages/api/job/apply.js

import prisma from '../../../lib/prisma';
import { SignJWT } from 'jose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    // 1) Sesión NextAuth para userId
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const userId = Number(session.user.id);

    // 2) jobId en body
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Falta el ID del empleo' });
    }

    // 3) Evitar duplicados en Prisma
    const existingApp = await prisma.application.findFirst({
      where: { userId, jobId: Number(jobId) },
    });
    if (existingApp) {
      return res.status(409).json({ error: 'Ya has postulado a este empleo' });
    }

    // 4) Crear en Prisma
    const application = await prisma.application.create({
      data: { userId, jobId: Number(jobId) },
    });

    // 5) Consultar etiqueta de la oferta para FastAPI
    const job = await prisma.job.findUnique({
      where: { id: Number(jobId) },
      select: { label: true },
    });
    const label = job?.label === 'automatic' ? 'automatic' : 'manual';

    // 6) Llamar a FastAPI
    const FASTAPI = process.env.NEXT_PUBLIC_API_URL || process.env.FASTAPI_URL;
    await fetch(`${FASTAPI}/api/proposals/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: Number(jobId),
        applicant_id: userId,
        label,
      }),
    }).catch((err) => {
      console.error('Error FastAPI:', err);
    });

    // 7) Generar JWT local para localStorage
    const secretKey = new TextEncoder().encode(process.env.SECRET_KEY);
    const userToken = await new SignJWT({ sub: String(userId), role: 'empleado' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secretKey);

    // 8) Responder OK con datos
    return res.status(200).json({
      message: 'Postulación exitosa',
      application,
      token: userToken,
    });
  } catch (error) {
    console.error('Error al postular:', error);
    return res.status(500).json({ error: 'Error interno al postular' });
  }
}
