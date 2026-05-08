import prisma from "../../../lib/prisma";

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
    // Decode JWT payload without verification (FastAPI uses its own secret)
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.sub;

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
