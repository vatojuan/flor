import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Se requiere el ID de la oferta" });
    }

    console.log(`📌 Buscando oferta con ID: ${id}`);

    const job = await prisma.job.findUnique({
      where: { id: Number(id) },
      include: { applications: true },
    });

    if (!job) {
      return res.status(404).json({ error: "Oferta no encontrada" });
    }

    return res.status(200).json({
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements || "No especificados",
      postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : "",
      expirationDate: job.expirationDate ? new Date(job.expirationDate).toISOString() : null,
      candidatesCount: job.applications.length,
    });
  } catch (error) {
    console.error("Error al obtener la oferta:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
