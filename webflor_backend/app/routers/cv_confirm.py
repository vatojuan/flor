import io
import logging
import random
import string
import re
import os
import json
import uuid
import psycopg2
import time # Importar la librería time
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File, Form
from dotenv import load_dotenv
from google.cloud import storage
from PyPDF2 import PdfReader
import openai # Importar openai para manejar sus excepciones específicas
from app.email_utils import send_credentials_email
from app.utils.auth_utils import get_current_admin
from app.database import get_db_connection
from app.services.cv_extraction import extract_cv_data
from pgvector.psycopg2 import register_vector
import bcrypt
import urllib.parse

logger = logging.getLogger(__name__)

load_dotenv()

# Configuración de Google Cloud Storage
# Asegúrate de que la variable de entorno está correctamente configurada.
service_account_info_str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
if not service_account_info_str:
    raise ValueError("La variable de entorno GOOGLE_APPLICATION_CREDENTIALS_JSON no está configurada.")
service_account_info = json.loads(service_account_info_str)
storage_client = storage.Client.from_service_account_info(service_account_info)
BUCKET_NAME = os.getenv("GOOGLE_STORAGE_BUCKET")

# Configuración de OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY, timeout=30)


def generate_secure_password(length=12):
    """Genera una contraseña segura aleatoria y la hashea con bcrypt."""
    plain_password = "".join(random.choice(string.ascii_letters + string.digits + "!@#$%^&*()") for _ in range(length))
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
    return plain_password, hashed.decode('utf-8')

# El prefijo es "/cv" (sin /api) — consistente con cv_upload y las llamadas del frontend
router = APIRouter(prefix="/cv", tags=["cv"])

def extract_text_from_pdf(pdf_bytes):
    """Extrae el texto completo de un PDF dado en bytes."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = " ".join([page.extract_text() or "" for page in reader.pages])
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extrayendo texto del PDF: {e}")

# --- FUNCIÓN DE TELÉFONO MEJORADA Y MÁS PRECISA ---
def extract_phone(text):
    """
    Extrae un número de teléfono de forma precisa, utilizando un enfoque de múltiples pasos:
    1. Búsqueda amplia de candidatos potenciales.
    2. Aplicación de filtros agresivos para descartar falsos positivos (fechas, CUITs, etc.).
    3. Selección del candidato más probable basado en un sistema de puntuación.
    """
    # 1. BÚSQUEDA AMPLIA DE CANDIDATOS
    potential_candidates = re.findall(r'[\d\s\-\(\)\+]{8,25}', text)
    
    # Añade búsquedas cerca de palabras clave para darles prioridad.
    keyword_pattern = re.compile(r'(?:tel(?:éfono)?|cel(?:ular)?|whatsapp|contacto|m[óo]vil)[\s:.]*([+\d\s\-\(\)]{8,20})', re.IGNORECASE)
    potential_candidates.extend(keyword_pattern.findall(text))

    valid_phones = []

    # 2. FILTRADO AGRESIVO DE CANDIDATOS
    for candidate in potential_candidates:
        cleaned_candidate = candidate.strip()
        digits_only = re.sub(r'\D', '', cleaned_candidate)

        # Filtro 1: Longitud de dígitos. Un teléfono válido en Argentina tiene entre 8 y 13 dígitos.
        if not (8 <= len(digits_only) <= 13):
            continue

        # Filtro 2: Descartar si es un CUIT/CUIL obvio (11 dígitos y prefijo conocido).
        if len(digits_only) == 11 and digits_only.startswith(('20', '23', '24', '27', '30', '33', '34')):
            continue
        
        # Filtro 3: Descartar si parece un rango de años (ej: "2015 - 2020", "2015 a 2020").
        if re.search(r'\b(19|20)\d{2}\b\s*[-–aAtoTO\s]+\s*\b(19|20)\d{2}\b', cleaned_candidate):
            continue
        
        # Filtro 4: Descartar si contiene palabras clave de descarte como "actualidad", "presente", etc.
        if re.search(r'\b(actualidad|presente|hoy|fecha|nacimiento)\b', cleaned_candidate, re.IGNORECASE):
            continue

        # Filtro 5: Descartar si está cerca de palabras como DNI, Legajo, etc.
        pos = text.find(cleaned_candidate)
        if pos != -1:
            context = text[max(0, pos-20):pos+len(cleaned_candidate)+20]
            if re.search(r'\b(DNI|CUIT|CUIL|Legajo|Matr[íi]cula)\b', context, re.IGNORECASE):
                continue

        # Filtro 6: Demasiados separadores -> poco probable que sea un teléfono.
        if len(re.findall(r'[\s\-]', cleaned_candidate)) > 4:
            continue

        valid_phones.append(cleaned_candidate)

    if not valid_phones:
        return None

    # 3. SELECCIÓN DEL MEJOR CANDIDATO
    def score(p):
        digits = len(re.sub(r'\D', '', p))
        if 10 <= digits <= 13:
            return 100 + digits  # Máxima prioridad
        return digits # Menor prioridad para números más cortos

    best_phone = max(set(valid_phones), key=score)
    return best_phone.strip()


# --- FUNCIÓN DE NOMBRE PROFESIONAL ---
def extract_name(text):
    """
    Usa OpenAI para extraer el nombre completo con un prompt más robusto y filtros de validación.
    """
    name_prompt = [
        {"role": "system", "content": "Eres un analista de RR.HH. experto. Tu tarea es extraer el nombre y apellido del candidato del siguiente texto. El nombre suele ser lo primero y más destacado en el CV, a menudo en mayúsculas o en una fuente más grande. Ignora cualquier cargo, título profesional o email que pueda aparecer junto al nombre. Devuelve únicamente el nombre completo. Si no puedes identificar un nombre claro, responde 'No encontrado'."},
        {"role": "user", "content": f"A partir del siguiente CV, extrae solo el nombre completo del candidato.\n\nCV:\n{text[:2000]}"}
    ]
    name_response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=name_prompt,
        max_tokens=25
    )
    name_from_cv = name_response.choices[0].message.content.strip().replace('"', '').replace("'", "")
    if ("no encontrado" in name_from_cv.lower() or 
        not name_from_cv or 
        len(name_from_cv.split()) < 2 or 
        "@" in name_from_cv or
        "CV" in name_from_cv.upper() or
        "CURRICULUM" in name_from_cv.upper()):
        return None
    return name_from_cv

def sanitize_filename(filename: str) -> str:
    """Reemplaza espacios por guiones bajos y elimina caracteres problemáticos."""
    filename = filename.replace(" ", "_")
    filename = re.sub(r"[^a-zA-Z0-9_.-]", "", filename)
    return filename

def run_regeneration_for_all_users():
    """
    Tarea en segundo plano para regenerar los perfiles de todos los usuarios,
    con manejo de errores de API y pausas para evitar rate limiting.
    """
    logger.info("INICIANDO TAREA DE REGENERACION DE PERFILES PARA TODOS LOS USUARIOS")
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        register_vector(conn)
        cur = conn.cursor()
        cur.execute('SELECT id, email, "cvUrl", name FROM "User" WHERE rubro IS NULL OR rubro = \'\' OR LOWER(rubro) = \'general\'')
        users = cur.fetchall()
        logger.info("Se encontraron %d usuarios sin rubro o con rubro 'General' para procesar.", len(users))
        bucket = storage_client.bucket(BUCKET_NAME)

        for user_id, user_email, cv_url, current_name in users:
            try:
                logger.info("Procesando usuario ID: %s", user_id)
                
                if not cv_url or not cv_url.startswith(f"https://storage.googleapis.com/{BUCKET_NAME}/"):
                    logger.warning("URL de CV invalida o ausente para el usuario %s. Saltando.", user_id)
                    continue
                
                file_path = cv_url.replace(f"https://storage.googleapis.com/{BUCKET_NAME}/", "")
                blob = bucket.blob(file_path)
                if not blob.exists():
                    logger.warning("El archivo del CV no se encontro en GCS en la ruta: %s. Saltando.", file_path)
                    continue

                file_bytes = blob.download_as_bytes()
                logger.info("CV descargado desde: %s", cv_url)

                text_content = extract_text_from_pdf(file_bytes)
                if not text_content:
                    logger.warning("No se pudo extraer texto del CV para el usuario %s. Saltando.", user_id)
                    continue
                
                # --- Extracción estructurada con GPT-4 ---
                try:
                    cv_data = extract_cv_data(text_content)
                    new_name = cv_data["nombre"]
                    if not new_name:
                        if current_name and "no encontrado" not in current_name.lower() and "@" not in current_name:
                            new_name = current_name
                        else:
                            new_name = user_email.split("@")[0].replace(".", " ").replace("_", " ").title()

                    new_phone = cv_data["telefono"]
                    description = cv_data["descripcion"] or ""
                    habilidades = cv_data["habilidades"]

                    profile_text = f"{description} Habilidades: {', '.join(habilidades)}" if habilidades else description
                    embedding_response_desc = client.embeddings.create(model="text-embedding-ada-002", input=profile_text)
                    embedding_desc = embedding_response_desc.data[0].embedding
                    logger.info("Perfil regenerado: nombre=%s, rubro=%s", new_name, cv_data["rubro"])

                except openai.APIStatusError as e:
                    if e.status_code == 429:
                        logger.error("Cuota de OpenAI excedida. Deteniendo regeneracion.")
                        break
                    else:
                        logger.error("Error de OpenAI procesando usuario %s: %s", user_id, e)
                        continue

                cur.execute(
                    'UPDATE "User" SET name = %s, description = %s, phone = %s, embedding = %s, rubro = %s WHERE id = %s',
                    (new_name, description, new_phone, embedding_desc, cv_data["rubro"], user_id)
                )
                conn.commit()
                logger.info("Perfil del usuario %s actualizado en la base de datos.", user_id)

                # Pausa para no sobrecargar la API de OpenAI
                logger.info("Pausando por 2 segundos...")
                time.sleep(2)

            except Exception as e:
                logger.error("ERROR GENERAL procesando al usuario %s: %s", user_id, e)
                if conn: conn.rollback() 
    except Exception as e:
        logger.error("ERROR CRITICO durante la tarea de regeneracion: %s", e)
    finally:
        if cur: cur.close()
        if conn: conn.close()
        logger.info("TAREA DE REGENERACION DE PERFILES FINALIZADA")

# Acepta con y sin barra final
@router.post("/regenerate-all-profiles")
@router.post("/regenerate-all-profiles/")
async def regenerate_all_profiles(background_tasks: BackgroundTasks, admin=Depends(get_current_admin)):
    """
    Endpoint para administradores. Inicia la tarea de regeneración en segundo plano.
    """
    logger.info("Solicitud recibida para regenerar todos los perfiles. Anadiendo a tareas en segundo plano.")
    background_tasks.add_task(run_regeneration_for_all_users)
    return {"message": "El proceso de regeneración de perfiles ha comenzado en segundo plano. Revisa los logs del servidor para ver el progreso."}

# Acepta con y sin barra final
@router.get("/confirm")
@router.get("/confirm/")
async def confirm_email(code: str = Query(...)):
    """
    Endpoint para confirmar el email de un nuevo usuario y procesar su CV.
    """
    conn = None
    cur = None
    try:
        logger.info("Buscando codigo de confirmacion: %s", code)
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT email, cv_url FROM pending_users WHERE confirmation_code = %s", (code,))
        user_data = cur.fetchone()
        if not user_data:
            raise HTTPException(status_code=400, detail="Código de confirmación inválido")
        user_email, cv_url = user_data
        
        user_email = user_email.lower()
        logger.info("Registro encontrado para usuario con CV URL: %s", cv_url)

        decoded_url = urllib.parse.unquote(cv_url)
        old_path_full = decoded_url.replace(f"https://storage.googleapis.com/{BUCKET_NAME}/", "")
        parts = old_path_full.split("/", 1)
        if len(parts) == 2:
            folder, filename = parts
            filename = sanitize_filename(filename)
            old_path = f"{folder}/{filename}"
        else:
            old_path = sanitize_filename(old_path_full)
        logger.info("Path del archivo obtenido: %s", old_path)

        new_path = old_path.replace("pending_cv_uploads", "employee-documents")
        logger.info("Nuevo path: %s", new_path)

        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(old_path)
        new_blob = bucket.rename_blob(blob, new_path)
        new_cv_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{new_path}"
        logger.info("CV movido a %s", new_cv_url)

        file_bytes = new_blob.download_as_bytes()

        text_content = extract_text_from_pdf(file_bytes)
        if not text_content:
            raise HTTPException(status_code=400, detail="No se pudo extraer texto del CV")
        logger.info("Texto del CV obtenido (total de %d caracteres)", len(text_content))

        # --- Extracción estructurada con GPT-4 ---
        try:
            cv_data = extract_cv_data(text_content)
            name_from_cv = cv_data["nombre"]
            if not name_from_cv:
                name_from_cv = user_email.split("@")[0].replace(".", " ").replace("_", " ").title()
            phone_number = cv_data["telefono"]
            description = cv_data["descripcion"] or ""
            rubro = cv_data["rubro"]
            habilidades = cv_data["habilidades"]

            logger.info("Datos extraidos: nombre=%s, rubro=%s, habilidades=%d", name_from_cv, rubro, len(habilidades))

            # Embedding del CV completo para matching
            embedding_response = client.embeddings.create(model="text-embedding-ada-002", input=text_content[:8000])
            embedding_cv = embedding_response.data[0].embedding

            # Embedding combinado (descripción + habilidades) para perfil
            profile_text = f"{description} Habilidades: {', '.join(habilidades)}" if habilidades else description
            embedding_response_desc = client.embeddings.create(model="text-embedding-ada-002", input=profile_text)
            embedding_desc = embedding_response_desc.data[0].embedding
            logger.info("Embeddings generados exitosamente")

        except openai.APIStatusError as e:
            if e.status_code == 429:
                raise HTTPException(status_code=429, detail="La cuota de OpenAI ha sido excedida. Contacta al administrador.")
            else:
                raise HTTPException(status_code=500, detail="Error procesando el CV con OpenAI")

        plain_password, hashed_password = generate_secure_password()
        logger.info("Contrasena segura generada y hasheada")

        cur.execute(
            'INSERT INTO "User" (email, name, role, description, phone, password, confirmed, "cvUrl", embedding, rubro) VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s) '
            'ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, phone = EXCLUDED.phone, '
            'password = EXCLUDED.password, confirmed = TRUE, "cvUrl" = EXCLUDED."cvUrl", embedding = EXCLUDED.embedding, rubro = EXCLUDED.rubro RETURNING id',
            (user_email, name_from_cv, "empleado", description, phone_number, hashed_password, new_cv_url, embedding_desc, rubro)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        logger.info("Usuario insertado/actualizado en la base de datos con id: %s", user_id)

        cur.execute(
            'INSERT INTO "FileEmbedding" ("fileKey", embedding, "createdAt") VALUES (%s, %s::vector, NOW()) '
            'ON CONFLICT ("fileKey") DO UPDATE SET embedding = EXCLUDED.embedding, "createdAt" = NOW()',
            (new_path, embedding_cv)
        )
        conn.commit()
        logger.info("Embedding del CV almacenado en FileEmbedding")

        cur.execute(
            'INSERT INTO "EmployeeDocument" ("userId", url, "fileKey", "originalName", "createdAt") VALUES (%s, %s, %s, %s, NOW())',
            (user_id, new_cv_url, new_path, new_path.split("/")[-1])
        )
        conn.commit()
        logger.info("Registro en EmployeeDocument insertado")

        cur.execute("DELETE FROM pending_users WHERE email = %s", (user_email,))
        conn.commit()
        logger.info("Registro en pending_users eliminado")

        send_credentials_email(user_email, user_email, plain_password)
        logger.info("Credenciales enviadas al usuario")

        return {"message": "Cuenta confirmada exitosamente."}

    except HTTPException as http_exc:
        # Re-lanza las excepciones HTTP para que FastAPI las maneje
        raise http_exc
    except Exception as e:
        logger.error("Error confirmando cuenta: %s", e)
        if conn and not conn.closed: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno confirmando cuenta: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
