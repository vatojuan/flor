// pages/api/job/apply.js

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const userId = Number(session.user.id);

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'Falta el ID del empleo' });
    }

    // Evitar duplicados
    const existingApp = await prisma.application.findFirst({
      where: { userId, jobId: Number(jobId) },
    });
    if (existingApp) {
      return res.status(409).json({ error: 'Ya has postulado a este empleo' });
    }

    // Crear aplicación y consultar job en transacción
    const [application, job] = await prisma.$transaction([
      prisma.application.create({
        data: { userId, jobId: Number(jobId) },
      }),
      prisma.job.findUnique({
        where: { id: Number(jobId) },
        select: { label: true },
      }),
    ]);

    // Llamar a FastAPI para crear propuesta (best-effort, no revierte la aplicación)
    const label = job?.label === 'automatic' ? 'automatic' : 'manual';
    const FASTAPI = process.env.NEXT_PUBLIC_API_URL || process.env.FASTAPI_URL;
    try {
      await fetch(`${FASTAPI}/api/proposals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: Number(jobId),
          applicant_id: userId,
          label,
        }),
      });
    } catch (err) {
      // Log pero no falla — la aplicación ya fue creada
      console.error('Error sincronizando con FastAPI:', err.message);
    }

    return res.status(200).json({
      message: 'Postulación exitosa',
      application,
    });
  } catch (error) {
    console.error('Error al postular:', error.message);
    return res.status(500).json({ error: 'Error interno al postular' });
  }
}
