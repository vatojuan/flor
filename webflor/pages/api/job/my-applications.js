// pages/api/job/my-applications.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  try {
    // ───── Autenticación ─────
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    // ───── Extraer token Bearer desde las cabeceras ─────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];

    // ───── Hacer proxy al endpoint FastAPI ─────
    const apiRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/job/my-applications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!apiRes.ok) {
      const errBody = await apiRes.json();
      return res.status(apiRes.status).json(errBody);
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener postulaciones (proxy):", error);
    return res
      .status(500)
      .json({ error: error.message || "Error interno del servidor" });
  }
}
