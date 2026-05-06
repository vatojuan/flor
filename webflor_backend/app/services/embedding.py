# app/services/embedding.py
import os
from dotenv import load_dotenv
from openai import OpenAI
from app.database import get_db_connection

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def update_user_embedding(user_id: str):
    """
    Actualiza el embedding del usuario basado en su descripción actual.
    Se asume que la tabla "User" tiene la columna "embedding".
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT description FROM "User" WHERE id = %s', (user_id,))
        row = cur.fetchone()
        if not row:
            raise Exception("Usuario no encontrado")
        description = row[0]
        if not description:
            raise Exception("El usuario no tiene descripción para generar embedding")
        embedding_response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=description
        )
        embedding_desc = embedding_response.data[0].embedding
        cur.execute('UPDATE "User" SET embedding = %s WHERE id = %s', (embedding_desc, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Embedding de usuario actualizado exitosamente"}
    except Exception as e:
        raise Exception(f"Error al actualizar el embedding del usuario: {e}")

def generate_file_embedding(text: str):
    """
    Genera un embedding para el contenido de un archivo.
    """
    try:
        embedding_response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        embedding_file = embedding_response.data[0].embedding
        return embedding_file
    except Exception as e:
        raise Exception(f"Error al generar el embedding del archivo: {e}")
