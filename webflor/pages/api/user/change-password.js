// pages/api/user/change-password.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { hash, compare } from "bcryptjs";
import prisma from "../../../lib/prisma"; // Asegúrate de la ruta correcta

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  // Usamos getServerSession para obtener la sesión
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  try {
    // Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar la contraseña actual
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(422).json({ message: "Contraseña actual incorrecta" });
    }

    // Hashear la nueva contraseña y actualizar la base de datos
    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { email: user.email },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
