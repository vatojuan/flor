import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";

const FASTAPI = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default async function handler(req, res) {
  // GET: user arrives here after Google OAuth via NextAuth session
  // The mobile app opens: /api/auth/signin/google?callbackUrl=/api/auth/google-mobile
  // After Google login, NextAuth redirects here with an active session
  if (req.method === "GET") {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session?.user?.email) {
        return res.redirect(302, "fapmendoza://login?error=no_session");
      }

      // Get or create FastAPI token
      // If session already has a token from NextAuth callback, use it
      if (session.user.token || session.accessToken) {
        const token = session.user.token || session.accessToken;
        return res.redirect(302, `fapmendoza://login?token=${token}`);
      }

      // Fallback: get token from FastAPI using user info
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return res.redirect(302, "fapmendoza://login?error=user_not_found");
      }

      // We need the Google id_token to call FastAPI, but we don't have it here.
      // Instead, create a simple JWT-like token based on user data.
      // The actual FastAPI token was stored in the NextAuth session callback.
      return res.redirect(
        302,
        `fapmendoza://login?error=token_unavailable`
      );
    } catch (err) {
      console.error("google-mobile GET error:", err);
      return res.redirect(302, "fapmendoza://login?error=server_error");
    }
  }

  // POST: direct call from mobile with id_token
  if (req.method === "POST") {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: "id_token es requerido" });
    }

    try {
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
        return res.status(400).json({ error: "Email no válido" });
      }

      await prisma.user.upsert({
        where: { email },
        update: { name, profilePicture: picture },
        create: { email, name, confirmed: true, googleId, profilePicture: picture },
      });

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
      console.error("google-mobile POST error:", err);
      return res.status(500).json({ error: "Error interno" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
