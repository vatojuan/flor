import io
import logging
import random
import string
import re
import os
import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from google.cloud import storage
from PyPDF2 import PdfReader
from openai import OpenAI
from app.email_utils import send_credentials_email
from pgvector.psycopg2 import register_vector
from app.database import get_db_connection
from app.services.cv_extraction import extract_cv_data
import bcrypt

logger = logging.getLogger(__name__)
load_dotenv()

service_account_info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
storage_client = storage.Client.from_service_account_info(service_account_info)
BUCKET_NAME = os.getenv("GOOGLE_STORAGE_BUCKET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=30)


def generate_secure_password(length=12):
    plain_password = "".join(random.choice(string.ascii_letters + string.digits + "!@#$%^&*()") for _ in range(length))
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
    return plain_password, hashed.decode('utf-8')


def extract_text_from_pdf(pdf_bytes):
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = " ".join([page.extract_text() or "" for page in reader.pages])
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extrayendo texto del PDF: {e}")


def sanitize_filename(filename: str) -> str:
    filename = filename.replace(" ", "_")
    return re.sub(r"[^a-zA-Z0-9_.-]", "", filename)


router = APIRouter(tags=["cv_admin"])


@router.post("/admin_upload")
async def admin_upload_cv(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        logs = []
        logs.append(f"Procesando archivo: {file.filename}")
        try:
            file_bytes = await file.read()
            logs.append(f"Archivo leido, tamano: {len(file_bytes)} bytes")
            safe_filename = sanitize_filename(file.filename)

            # Upload to GCS
            blob_path = f"employee-documents/{safe_filename}"
            bucket = storage_client.bucket(BUCKET_NAME)
            blob = bucket.blob(blob_path)
            blob.upload_from_string(file_bytes, content_type=file.content_type)
            new_cv_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_path}"
            logs.append(f"Archivo subido a GCS")

            # Extract text
            text_content = extract_text_from_pdf(file_bytes)
            if not text_content:
                raise Exception("No se pudo extraer texto del CV")

            # Structured extraction with GPT-4
            cv_data = extract_cv_data(text_content)

            user_email = cv_data["email"]
            if not user_email:
                raise Exception("No se encontro un email valido en el CV")
            user_email = user_email.lower()
            logs.append(f"Email extraido")

            name_from_cv = cv_data["nombre"]
            if not name_from_cv:
                name_from_cv = user_email.split("@")[0].replace(".", " ").replace("_", " ").title()
            phone_number = cv_data["telefono"]
            description = cv_data["descripcion"] or ""
            rubro = cv_data["rubro"]
            habilidades = cv_data["habilidades"]

            logs.append(f"Datos extraidos: nombre={name_from_cv}, rubro={rubro}")

            # Generate embeddings
            profile_text = f"{description} Habilidades: {', '.join(habilidades)}" if habilidades else description
            embedding_response_desc = client.embeddings.create(model="text-embedding-ada-002", input=profile_text)
            embedding_desc = embedding_response_desc.data[0].embedding
            logs.append("Embedding generado")

            # Generate password
            plain_password, hashed_password = generate_secure_password()

            # Insert/update user
            conn = get_db_connection()
            register_vector(conn)
            cur = conn.cursor()
            cur.execute(
                'INSERT INTO "User" (email, name, role, description, phone, password, confirmed, "cvUrl", embedding, rubro) VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s) '
                'ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, phone = EXCLUDED.phone, '
                'password = EXCLUDED.password, confirmed = TRUE, "cvUrl" = EXCLUDED."cvUrl", embedding = EXCLUDED.embedding, rubro = EXCLUDED.rubro RETURNING id',
                (user_email, name_from_cv, "empleado", description, phone_number, hashed_password, new_cv_url, embedding_desc, rubro)
            )
            user_id = cur.fetchone()[0]
            conn.commit()

            cur.execute(
                'INSERT INTO "EmployeeDocument" ("userId", url, "fileKey", "originalName", "createdAt") VALUES (%s, %s, %s, %s, NOW())',
                (user_id, new_cv_url, blob_path, safe_filename)
            )
            conn.commit()
            cur.close()
            conn.close()

            send_credentials_email(user_email, user_email, plain_password)
            logs.append("Cuenta creada y credenciales enviadas")

            results.append({
                "file": file.filename,
                "email": user_email,
                "name": name_from_cv,
                "rubro": rubro,
                "status": "success",
                "message": "Cuenta creada y credenciales enviadas.",
                "logs": logs
            })
        except Exception as e:
            logger.error("Error procesando %s: %s", file.filename, str(e))
            logs.append(f"Error: {str(e)}")
            results.append({
                "file": file.filename,
                "status": "error",
                "message": str(e),
                "logs": logs
            })

    return {"results": results}
