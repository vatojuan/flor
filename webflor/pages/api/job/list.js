import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : null;

    /* ── 1. Traemos SOLO los campos seguros ───────────────────────── */
    const jobs = await prisma.job.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        createdAt: true,
        expirationDate: true,
        _count: { select: { applications: true } }, // nº postulaciones
      },
    });

    /* ── 2. Serializamos para JSON ────────────────────────────────── */
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      postedAt: job.createdAt.toISOString(),
      expirationDate: job.expirationDate
        ? job.expirationDate.toISOString()
        : null,
      candidatesCount: job._count.applications,
    }));

    return res.status(200).json({ jobs: formattedJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message || "Sin detalles",
    });
  }
}
