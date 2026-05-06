// pages/api/auth/[...nextauth].js

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

const FASTAPI = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",

  providers: [
    // ――――――――――――――― Credenciales propias ―――――――――――――――
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email:    { label: "Email",      type: "email",    placeholder: "tu@correo.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize({ email, password }) {
        // 1. Validación local
        const u = await prisma.user.findUnique({ where: { email } });
        if (!u)            throw new Error("Usuario no encontrado");
        if (!u.password)   throw new Error("Este usuario se registró con Google. Usa Google para iniciar sesión.");
        if (!u.confirmed)  throw new Error("Debes confirmar tu correo antes de iniciar sesión.");
        const ok = await bcrypt.compare(password, u.password);
        if (!ok)           throw new Error("Contraseña incorrecta");

        // 2. Login en FastAPI para obtener el JWT
        const body = new URLSearchParams({ username: email, password });
        const r = await fetch(`${FASTAPI}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!r.ok) {
          console.error("FastAPI /auth/login falló:", await r.text());
          throw new Error("No se pudo autenticar en el backend");
        }
        const { access_token } = await r.json();
        if (!access_token) throw new Error("No se recibió token desde FastAPI");

        // 3. Devolvemos los datos que irán al callback `jwt`
        return {
          id:   u.id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          image: u.profilePicture || "/images/default-user.png",
          fastapiToken: access_token,          //  ← guardar JWT
        };
      },
    }),

    // ――――――――――――――― Google OAuth ―――――――――――――――
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  // ────────────────────────── Callbacks ─────────────────────────
  callbacks: {
    // 1) Después de sign-in
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        // upsert en nuestra BD
        const dbUser = await prisma.user.upsert({
          where:  { email: user.email },
          update: { name: user.name, profilePicture: user.image || profile.picture },
          create: {
            email: user.email,
            name:  user.name,
            confirmed: true,
            googleId: profile.sub,
            profilePicture: user.image || profile.picture,
          },
        });

        // Obtener JWT FastAPI
        if (account.id_token) {
          const r = await fetch(`${FASTAPI}/auth/login-google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          });
          if (r.ok) {
            const { access_token } = await r.json();
            account.fastapiToken = access_token;        //  ← guardar JWT
          } else {
            console.warn("FastAPI /auth/login-google error:", await r.text());
            return false;
          }
        }

        // Propagar datos actualizados al objeto user
        user.id    = dbUser.id.toString();
        user.role  = dbUser.role;
        user.image = dbUser.profilePicture || user.image;
      }
      return true;
    },

    // 2) Construye / actualiza el JWT interno de Next-Auth
    async jwt({ token, user, account, trigger }) {
      if (user) {                // en sign-in
        token.id     = user.id;
        token.name   = user.name;
        token.email  = user.email;
        token.role   = user.role;
        token.image  = user.image;
        token.provider = account?.provider;

        token.fastapiToken =
          user.fastapiToken ??
          account?.fastapiToken ??
          token.fastapiToken;
      }

      // refresco manual (cuando llamas session.update())
      if (trigger === "update") {
        const db = await prisma.user.findUnique({ where: { id: Number(token.id) } });
        if (db) {
          token.name  = db.name;
          token.image = db.profilePicture;
          token.role  = db.role;
        }
      }
      return token;
    },

    // 3) Lo que llega al cliente
    async session({ session, token }) {
      session.user = {
        id:    token.id,
        name:  token.name,
        email: token.email,
        role:  token.role,
        image: token.image,
        provider: token.provider,
        token: token.fastapiToken || null,   // <─ compatibilidad antigua
      };

      session.accessToken = token.fastapiToken || null; // <─ NUEVO (para JobCreate)

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/auth/error",
  },
};

export default NextAuth(authOptions);
