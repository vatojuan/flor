import prisma from "../../../lib/prisma";

const FASTAPI = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: "id_token es requerido" });
  }

  try {
    // 1) Verificar el id_token con Google
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`
    );
    if (!googleRes.ok) {
      return res.status(401).json({ error: "Token de Google inválido" });
    }
    const idinfo = await googleRes.json();

    const email = idinfo.email;
    const name = idinfo.name || email.split("@")[0];
    const picture = idinfo.picture || null;
    const googleId = idinfo.sub;

    if (!email) {
      return res.status(400).json({ error: "Email no válido en el token" });
    }

    // 2) Upsert en nuestra BD (mismo que NextAuth)
    await prisma.user.upsert({
      where: { email },
      update: { name, profilePicture: picture },
      create: {
        email,
        name,
        confirmed: true,
        googleId,
        profilePicture: picture,
      },
    });

    // 3) Obtener JWT de FastAPI
    const fastapiRes = await fetch(`${FASTAPI}/auth/login-google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token }),
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      return res.status(500).json({ error: `Error FastAPI: ${errText}` });
    }

    const { access_token } = await fastapiRes.json();
    return res.status(200).json({ token: access_token });
  } catch (err) {
    console.error("google-mobile error:", err);
    return res.status(500).json({ error: "Error interno en login con Google" });
  }
}
