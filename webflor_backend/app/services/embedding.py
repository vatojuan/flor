# app/services/embedding.py
import logging
import os
from dotenv import load_dotenv
from openai import OpenAI
from app.database import get_db_connection

load_dotenv()
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=30)


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text."""
    resp = client.embeddings.create(model="text-embedding-ada-002", input=text)
    return resp.data[0].embedding


def update_user_embedding(user_id: str):
    """
    Update the user's embedding based on their description.
    Combines description with any available metadata for richer representation.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT description, rubro FROM "User" WHERE id = %s', (user_id,))
        row = cur.fetchone()
        if not row:
            raise Exception("Usuario no encontrado")
        description, rubro = row
        if not description:
            raise Exception("El usuario no tiene descripcion para generar embedding")

        # Enrich embedding text with rubro context
        embed_text = description
        if rubro and rubro != "General":
            embed_text = f"[{rubro}] {description}"

        embedding_desc = generate_embedding(embed_text)
        cur.execute('UPDATE "User" SET embedding = %s WHERE id = %s', (embedding_desc, user_id))
        conn.commit()
        cur.close()
        conn.close()
        logger.info("User %s embedding updated", user_id)
        return {"message": "Embedding de usuario actualizado exitosamente"}
    except Exception as e:
        logger.error("Error updating user embedding: %s", e)
        raise


def generate_file_embedding(text: str) -> list[float]:
    """Generate an embedding for file content."""
    return generate_embedding(text)
