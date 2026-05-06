// pages/api/user/select-role.js

import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
    });
    return res.status(200).json({ message: "Rol actualizado", user: updatedUser });
  } catch (error) {
    console.error("Error actualizando rol:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
