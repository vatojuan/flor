# app/routers/cv_processing.py
import io
import logging
import random
import string
import re
import os
import json
import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from google.cloud import storage
from PyPDF2 import PdfReader
from openai import OpenAI
from app.email_utils import send_confirmation_email
from app.routers.match import run_matching_for_user  # <-- Importación añadida
from app.database import get_db_connection
from app.utils.email_extraction import extract_email  # fuente única (recorta TLD vía IANA)

logger = logging.getLogger(__name__)

load_dotenv()

# Configuración de Google Cloud Storage
service_account_info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
storage_client = storage.Client.from_service_account_info(service_account_info)
BUCKET_NAME = os.getenv("GOOGLE_STORAGE_BUCKET")

# Configuración de OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=30)

router = APIRouter(prefix="/cv", tags=["cv"])

def extract_text_from_pdf(pdf_bytes):
    """Extrae el texto completo de un PDF en formato bytes sin necesidad de guardarlo en disco."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = " ".join([page.extract_text() or "" for page in reader.pages])
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extrayendo texto del PDF: {e}")

def sanitize_filename(filename: str) -> str:
    filename = filename.replace(" ", "_")
    filename = re.sub(r"[^a-zA-Z0-9_.-]", "", filename)
    return filename

@router.post("/upload")
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    email: str = Form(None)
):
    try:
        # 1) Leer bytes del CV
        file_bytes = await file.read()
        logger.info("Archivo recibido: %s, tamano: %d bytes", file.filename, len(file_bytes))

        # 2) Normalizar nombre y subir a GCS
        safe_filename = sanitize_filename(file.filename)
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(f"pending_cv_uploads/{safe_filename}")
        blob.upload_from_string(file_bytes, content_type=file.content_type)
        logger.info("Archivo subido a GCS: %s", blob.public_url)

        # 3) Extraer texto y email
        text_content = extract_text_from_pdf(file_bytes)
        if not text_content:
            raise HTTPException(status_code=400, detail="No se pudo extraer texto del CV")
        extracted_email = extract_email(text_content)
        user_email = (email or extracted_email)
        if not user_email:
            raise HTTPException(status_code=400, detail="No se encontró un email válido en el CV")
        user_email = user_email.lower()
        logger.info("Email extraido para usuario")

        # 4) Generar código de confirmación y guardar en pending_users
        confirmation_code = str(uuid.uuid4())
        logger.info("Codigo de confirmacion generado")

        user_id = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO pending_users (id, email, confirmation_code, cv_url)
                VALUES (gen_random_uuid(), %s, %s, %s)
                ON CONFLICT (email)
                DO UPDATE SET confirmation_code = EXCLUDED.confirmation_code, cv_url = EXCLUDED.cv_url
                RETURNING id
                """,
                (user_email, confirmation_code, blob.public_url)
            )
            result = cur.fetchone()
            if result:
                user_id = result[0]
            conn.commit()
            cur.close()
            conn.close()
            logger.info("Registro pendiente insertado/actualizado en la base de datos")
        except Exception as db_err:
            logger.error("Error insertando en la base de datos: %s", db_err)
            raise HTTPException(status_code=500, detail=f"Error base de datos: {db_err}")

        # 5) Enviar email de confirmación en segundo plano
        background_tasks.add_task(send_confirmation_email, user_email, confirmation_code)

        # 6) Si user_id se obtuvo (nueva fila o actualizada), disparar matching
        if user_id:
            background_tasks.add_task(run_matching_for_user, user_id)

        return {
            "message": f"Se ha enviado un email de confirmación a {user_email}. "
                       f"Revisa tu bandeja de correo no deseado o spam.",
            "email": user_email
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error procesando el CV: %s", e)
        raise HTTPException(status_code=500, detail=f"Error procesando el CV: {e}")
