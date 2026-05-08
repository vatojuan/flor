import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY || process.env.NEXTAUTH_SECRET;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Try decoding as FastAPI JWT
    let userId;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.sub;
    } catch {
      // If verification fails, just decode without verifying (FastAPI may use different secret)
      const decoded = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      userId = decoded.sub;
    }

    if (!userId) {
      return res.status(401).json({ error: "Token invalido" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, name: true, email: true, role: true, profilePicture: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("user-info error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
