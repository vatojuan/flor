// pages/api/job/create.js
// -----------------------------------------------------------
// Crea una oferta, genera embedding y lo guarda en pgvector.
//
//  ✅  No expone Typescript
//  ✅  Evita que Prisma lea la columna vector
//  ✅  Usa $executeRawUnsafe sólo para el UPDATE del vector
// -----------------------------------------------------------

import prisma from "../../../lib/prisma";
import fetch  from "node-fetch";           //  npm i node-fetch@^3

/* ---------- Config ------------------------------------------------- */

const OPENAI_URL   = "https://api.openai.com/v1/embeddings";
const OPENAI_MODEL = "text-embedding-ada-002";

/* ---------- Helpers ------------------------------------------------ */

/** [0.1,0.2] -> '[0.1,0.2]' (pgvector literal) */
const toVector = (arr) => `'[${arr.join(",")}]'`;

/** Devuelve array<float> ó null */
async function getEmbedding(text) {
  try {
    const r = await fetch(OPENAI_URL, {
      method : "POST",
      headers : {
        "Content-Type" : "application/json",
        Authorization  : `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body : JSON.stringify({ model: OPENAI_MODEL, input: text }),
    });
    if (!r.ok) throw new Error(await r.text());

    const emb = (await r.json())?.data?.[0]?.embedding;
    if (!Array.isArray(emb)) throw new Error("Respuesta inesperada de OpenAI");
    return emb;
  } catch (e) {
    console.error("⚠️  Error embedding:", e.message || e);
    return null;
  }
}

/* ---------- API Route ---------------------------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { title, description, requirements, userId, expirationDate } = req.body;

  if (!title || !description || !userId) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  /* 1. Generamos embedding – no abortamos si falla */
  const emb = await getEmbedding(`${title}\n\n${description}\n\n${requirements || ""}`);

  /* 2. Insertamos la oferta SIN la columna vector */
  const created = await prisma.job.create({
    data: {
      title,
      description,
      requirements,
      userId: Number(userId),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
    },
    // ⛔ NO devolvemos embedding ⇒ evitamos el P2023
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      userId: true,
      expirationDate: true,
      createdAt: true,
    },
  });

  /* 3. Si hay embedding => UPDATE aparte */
  if (emb) {
    await prisma.$executeRawUnsafe(`
      UPDATE "Job"
         SET embedding = ${toVector(emb)}::vector
       WHERE id       = ${created.id};
    `);
  }

  return res.status(200).json({ message: "Oferta creada", job: created });
}
