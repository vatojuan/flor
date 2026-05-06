// pages/api/picture/renew.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";
import { getNewSignedUrl } from "../../../lib/gcs";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.email) {
      return res.status(401).json({ error: "No autorizado" });
    }
    
    // Convertir id a número, asumiendo que en tu DB es numérico
    const userId = Number(session.user.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.profilePictureFileName) {
      return res.status(404).json({ error: "No se encontró la imagen de perfil" });
    }

    const newUrl = await getNewSignedUrl(user.profilePictureFileName);
    return res.status(200).json({ url: newUrl });
  } catch (error) {
    console.error("Error al renovar la URL firmada:", error);
    return res.status(500).json({ error: "Error interno al renovar la URL" });
  }
}
