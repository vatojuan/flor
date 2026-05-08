# app/routers/job.py

"""
Ofertas de empleo
────────────────────────────────────────────────────────────
• GET    /api/job/                      – listar ofertas vigentes (con candidatesCount)
• GET    /api/job/list                  – alias legacy
• GET    /api/job/my-applications       – postulaciones del usuario (con objeto job detallado)
• GET    /api/job/apply/{token}         – confirma enlace y crea postulación
• POST   /api/job/apply                 – postularse a una oferta directamente
• DELETE /api/job/cancel-application    – cancelar postulación
• GET    /api/job/{job_id}              – detalles de una oferta (con createdAt y expirationDate)
• POST   /api/job/create                – alta de oferta por EMPLEADOR
• POST   /api/job/create-admin          – alta de oferta por ADMIN
"""

from __future__ import annotations

import json
import logging
import os
import threading
import traceback

logger = logging.getLogger(__name__)
from datetime import datetime
from types import SimpleNamespace
from typing import List, Optional, Tuple, Dict, Any
from pgvector.psycopg2 import register_vector


import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Path, UploadFile, File, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from pydantic import BaseModel, Field

from app.database import get_db_connection
from app.core.auth import SECRET_KEY, ALGORITHM
from app.routers.match import run_matching_for_job
from app.routers.proposal import deliver

load_dotenv()


# ─────────────────── Pydantic models ────────────────────

class JobCreateRequest(BaseModel):
    """Payload para crear una oferta de empleo."""
    title: str = Field(..., min_length=1, description="Título de la oferta")
    description: str = Field(..., min_length=1, description="Descripción del puesto")
    requirements: str = Field("", description="Requisitos del puesto")
    expirationDate: Optional[str] = Field(None, description="Fecha de expiración ISO 8601 (ej. 2025-12-31T00:00:00Z)")
    label: str = Field("manual", description="Etiqueta: 'manual' o 'automatic'")
    isPaid: bool = Field(False, description="Si la oferta es paga")
    contactEmail: Optional[str] = Field(None, description="Email de contacto del empleador")
    contactPhone: Optional[str] = Field(None, description="Teléfono de contacto del empleador")
    rubro: Optional[str] = Field(None, description="Rubro/categoría profesional (se clasifica automáticamente si no se envía)")
    # ── Enhanced job fields ──
    contract_type: str = Field("efectivo", description="Tipo de contratación: ocasional, temporal, contrato, efectivo, freelance")
    modality: str = Field("presencial", description="Modalidad: presencial, remoto, hibrido")
    location: Optional[str] = Field(None, description="Ubicación del puesto")
    salary_min: Optional[float] = Field(None, description="Sueldo mínimo")
    salary_max: Optional[float] = Field(None, description="Sueldo máximo")
    salary_visible: bool = Field(True, description="Mostrar sueldo públicamente")
    benefits: Optional[List[str]] = Field(None, description="Lista de beneficios")
    tags: Optional[List[str]] = Field(None, description="Tags/etiquetas de la oferta")


class JobCreateAdminRequest(JobCreateRequest):
    """Payload extendido para creación de oferta por admin."""
    userId: Optional[int] = Field(None, description="ID del usuario dueño de la oferta (opcional, se usa el admin si no se envía)")
    source: str = Field("admin", description="Origen de la oferta")


class CancelApplicationRequest(BaseModel):
    """Payload para cancelar una postulación."""
    jobId: int = Field(..., description="ID de la oferta a la cual se quiere cancelar la postulación")


class ApplyToJobRequest(BaseModel):
    """Payload para postularse a una oferta."""
    jobId: int = Field(..., description="ID de la oferta a la que se postula")


class JobResponse(BaseModel):
    """Respuesta estándar al crear una oferta."""
    message: str
    jobId: int


oauth2_admin = OAuth2PasswordBearer(tokenUrl="/auth/admin-login")
oauth2_user = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_user)):
    token = credentials.credentials
    sub = _decode(token).get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token usuario inválido")
    return SimpleNamespace(id=int(sub))

router = APIRouter(prefix="/api/job", tags=["job"])


# ─────────────────── Auth helpers ────────────────────
def _decode(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")


def get_current_admin_sub(tok: str = Depends(oauth2_admin)) -> str:
    return _decode(tok).get("sub", "")


# ─────────────────── DB helpers ──────────────────────
def get_admin_id_by_email(mail: str) -> Optional[int]:
    conn = get_db_connection()
    register_vector(conn)
    cur  = conn.cursor()
    try:
        cur.execute('SELECT id FROM "User" WHERE email=%s LIMIT 1;', (mail,))
        row = cur.fetchone()
        return row[0] if row else None
    finally:
        cur.close()
        conn.close()


def job_has_column(cur, col: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public'
           AND table_name='Job'
           AND column_name=%s
         LIMIT 1
        """,
        (col,),
    )
    return bool(cur.fetchone())


# ─────────────────── Embeddings ───────────────────────
from openai import OpenAI as _OpenAI
_oai_client = _OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""), timeout=30)

def generate_embedding(txt: str) -> Optional[List[float]]:
    try:
        resp = _oai_client.embeddings.create(model="text-embedding-ada-002", input=txt)
        return resp.data[0].embedding
    except Exception:
        logger.exception("Failed to generate embedding")
        return None


def _classify_rubro(title: str, description: str) -> str:
    """Use GPT to classify the job into a rubro category."""
    try:
        resp = _oai_client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "Clasifica la siguiente oferta de trabajo en UNA sola categoria profesional. Responde SOLO con el nombre de la categoria. Categorias posibles: Gastronomia, Construccion, Administracion, IT/Sistemas, Salud, Educacion, Comercio/Ventas, Logistica/Transporte, Produccion/Industria, Servicios Generales, Diseno/Comunicacion, Derecho, Contabilidad/Finanzas, Recursos Humanos, Agricultura, Turismo/Hoteleria. Si no encaja en ninguna, responde General."},
                {"role": "user", "content": f"Titulo: {title}\nDescripcion: {description[:500]}"},
            ],
            max_tokens=20,
            temperature=0.1,
        )
        rubro = resp.choices[0].message.content.strip().strip('"')
        return rubro if rubro else "General"
    except Exception:
        logger.warning("Failed to classify rubro, defaulting to General")
        return "General"


def _generate_tags(title: str, description: str) -> List[str]:
    """Use GPT to generate relevant tags for a job offer."""
    try:
        resp = _oai_client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": (
                    "Genera entre 3 y 6 tags relevantes para la siguiente oferta de trabajo. "
                    "Los tags deben ser en español, en minúsculas, sin #, separados por coma. "
                    "Incluye tags de rubro, puesto, horario, ubicación si se menciona, y nivel de experiencia. "
                    "Ejemplo: gastronomia, mozo, turno-noche, godoy-cruz, con-experiencia. "
                    "Responde SOLO con los tags separados por coma."
                )},
                {"role": "user", "content": f"Titulo: {title}\nDescripcion: {description[:500]}"},
            ],
            max_tokens=80,
            temperature=0.3,
        )
        raw = resp.choices[0].message.content.strip()
        tags = [t.strip().lower().replace(" ", "-").lstrip("#") for t in raw.split(",") if t.strip()]
        return tags[:6]
    except Exception:
        logger.warning("Failed to generate tags")
        return []


# ═══════════ Helpers comunes (inserción + matching) ═══════════
def _insert_job(
    payload: Dict[str, Any],
    owner_id: int,
    source: str,
    label_default: str = "manual",
) -> Tuple[int, str]:
    title = (payload.get("title") or "").strip()
    desc  = (payload.get("description") or "").strip()
    reqs  = (payload.get("requirements") or "").strip()

    if not title or not desc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "title y description son obligatorios")

    expiration = payload.get("expirationDate")
    try:
        exp_dt = datetime.fromisoformat(expiration.replace("Z", "+00:00")) if expiration else None
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "expirationDate inválida")

    label         = payload.get("label", label_default)
    is_paid       = bool(payload.get("isPaid", False))
    contact_email = payload.get("contactEmail") or payload.get("contact_email")
    contact_phone = payload.get("contactPhone") or payload.get("contact_phone")

    if not contact_email or not contact_phone:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT email, phone FROM "User" WHERE id=%s', (owner_id,))
        mail_fb, phone_fb = cur.fetchone() or ("", "")
        cur.close(); conn.close()
        contact_email = contact_email or mail_fb
        contact_phone = contact_phone or phone_fb

    embedding = generate_embedding(f"{title}\n{desc}\n{reqs}")
    rubro = payload.get("rubro") or _classify_rubro(title, desc)

    # ── Enhanced fields ──
    contract_type  = payload.get("contract_type", "efectivo")
    modality       = payload.get("modality", "presencial")
    location       = (payload.get("location") or "").strip() or None
    salary_min     = payload.get("salary_min")
    salary_max     = payload.get("salary_max")
    salary_visible = payload.get("salary_visible", True)
    benefits       = payload.get("benefits") or None
    tags           = payload.get("tags")
    banner_url     = payload.get("banner_url")

    # Auto-generate tags if not provided
    if not tags:
        tags = _generate_tags(title, desc)

    conn = cur = None
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        has_is_paid       = job_has_column(cur, "is_paid")
        has_snake_contact = job_has_column(cur, "contact_email")
        has_camel_contact = job_has_column(cur, "contactEmail")

        email_col = phone_col = None
        if has_snake_contact:
            email_col, phone_col = "contact_email", "contact_phone"
        elif has_camel_contact:
            email_col, phone_col = "contactEmail", "contactPhone"

        fields = [
            "title", "description", "requirements", '"expirationDate"',
            '"userId"', "embedding", "label", "source", "rubro",
            "contract_type", "modality", "location",
            "salary_min", "salary_max", "salary_visible",
            "benefits", "tags", "banner_url"
        ]
        values = [
            title, desc, reqs, exp_dt, owner_id, embedding, label, source, rubro,
            contract_type, modality, location,
            salary_min, salary_max, salary_visible,
            benefits, tags, banner_url
        ]

        if has_is_paid:
            fields.append("is_paid");        values.append(is_paid)
        if email_col:
            fields.extend([email_col, phone_col]); values.extend([contact_email, contact_phone])

        ph = ", ".join(["%s"] * len(fields))
        cur.execute(
            f'INSERT INTO "Job" ({", ".join(fields)}) VALUES ({ph}) RETURNING id;',
            tuple(values),
        )
        job_id = cur.fetchone()[0]
        conn.commit()
    except Exception:
        if conn:
            conn.rollback()
        traceback.print_exc()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al crear oferta")
    finally:
        if cur: cur.close()
        if conn: conn.close()

    # lanzar matching en background
    threading.Thread(target=run_matching_for_job, args=(job_id,), daemon=True).start()
    return job_id, contact_email or ""


# ═════════════ RUTAS FIJAS ─═══════════════

@router.get("/my-applications", summary="Postulaciones del usuario")
async def my_applications(current_user=Depends(get_current_user)):
    conn = cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            """
            SELECT
              p.id,
              j.id               AS job_id,
              j.title            AS job_title,
              j."createdAt"      AS job_created_at,
              j."expirationDate" AS job_expiration_at,
              COUNT(p2.*) FILTER (WHERE p2.status NOT IN ('cancelled','rejected')) AS job_candidates_count,
              p.label,
              p.status,
              p.created_at       AS applied_at
            FROM proposals p
            JOIN "Job" j           ON j.id = p.job_id
            LEFT JOIN proposals p2 ON p2.job_id = j.id
            WHERE p.applicant_id = %s
              AND p.status NOT IN ('cancelled','rejected')
            GROUP BY p.id, j.id, j."createdAt", j."expirationDate"
            ORDER BY p.created_at DESC
            """,
            (current_user.id,),
        )

        applications = []
        for (
            pid,
            jid,
            jtitle,
            jcreated,
            jexp,
            jcount,
            plabel,
            pstatus,
            papplied
        ) in cur.fetchall():
            job_obj = {
                "id": jid,
                "title": jtitle,
                "createdAt": jcreated.isoformat() if jcreated else None,
                "expirationDate": jexp.isoformat() if jexp else None,
                "candidatesCount": jcount
            }
            applications.append({
                "id": pid,
                "label": plabel,
                "status": pstatus,
                "createdAt": papplied.isoformat() if papplied else None,
                "job": job_obj
            })

        return {"applications": applications}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/list", include_in_schema=False, summary="Alias legacy de list()")
@router.get("/", summary="Listar ofertas activas con conteo de postulaciones")
async def list_jobs(userId: Optional[int] = None):
    conn = cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            """
            SELECT
              j.id,
              j.title,
              j.description,
              j.requirements,
              j."createdAt",
              j."expirationDate",
              j."userId",
              COALESCE(j.source, '') AS source,
              COALESCE(j.label,  '') AS label,
              j.contract_type,
              j.modality,
              j.location,
              j.salary_min,
              j.salary_max,
              j.salary_visible,
              j.benefits,
              j.tags,
              j.banner_url,
              j.is_paid,
              j.rubro,
              COUNT(p.*) FILTER (WHERE p.status NOT IN ('cancelled','rejected')) AS "candidatesCount"
            FROM "Job" j
            LEFT JOIN proposals p ON p.job_id = j.id
            WHERE j."expirationDate" IS NULL OR j."expirationDate" > NOW()
            """ + (' AND j."userId"=%s' if userId else '') + """
            GROUP BY j.id, j."createdAt", j."expirationDate"
            ORDER BY j.id DESC
            """,
            (userId,) if userId else (),
        )

        cols   = [d[0] for d in cur.description]
        offers = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("createdAt"):
                d["createdAt"] = d["createdAt"].isoformat()
            if d.get("expirationDate"):
                d["expirationDate"] = d["expirationDate"].isoformat()
            offers.append(d)

        return {"offers": offers}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/apply/{token}", summary="Confirma y crea postulación vía enlace")
async def confirm_apply(token: str = Path(..., description="Token enviado por email")):
    conn = cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()

        # Buscar el token en la tabla matches
        cur.execute("""
            SELECT id, job_id, user_id, apply_token_used
              FROM matches
             WHERE apply_token = %s
             LIMIT 1
        """, (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Token inválido o expirado")

        match_id, job_id, applicant_id, used = row

        if used:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Este enlace ya fue utilizado")

        cur.execute("""
            INSERT INTO proposals (job_id, applicant_id, label, status, created_at)
            VALUES (%s, %s, 'automatic', 'waiting', NOW())
            RETURNING id
        """, (job_id, applicant_id))
        pid = cur.fetchone()[0]

        cur.execute("""
            UPDATE matches
               SET apply_token_used = TRUE
             WHERE id = %s
        """, (match_id,))

        conn.commit()

        threading.Thread(target=deliver, args=(pid, True), daemon=True).start()

        jwt_user = jwt.encode({"sub": str(applicant_id), "role": "empleado"}, SECRET_KEY, algorithm=ALGORITHM)
        return {"success": True, "token": jwt_user, "jobId": job_id}
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        traceback.print_exc()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.delete("/cancel-application", summary="Cancelar la postulación del usuario")
async def cancel_application(
    payload: CancelApplicationRequest,
    current_user=Depends(get_current_user),
):
    job_id = payload.jobId
    conn = cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            """
            SELECT id
              FROM proposals
             WHERE job_id=%s AND applicant_id=%s AND status NOT IN ('cancelled','rejected')
             LIMIT 1
            """,
            (job_id, current_user.id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No existe postulación activa")
        cur.execute("UPDATE proposals SET status='cancelled', cancelled_at=NOW() WHERE id=%s", (row[0],))
        conn.commit()
        return {"message": "Postulación cancelada"}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/{job_id}", summary="Obtener detalles de una oferta")
async def get_job(job_id: int = Path(..., description="ID de la oferta")):
    conn = cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            """
            SELECT
              j.id,
              j.title,
              j.description,
              j.requirements,
              j."createdAt",
              j."expirationDate",
              j."userId",
              j.contract_type,
              j.modality,
              j.location,
              j.salary_min,
              j.salary_max,
              j.salary_visible,
              j.benefits,
              j.tags,
              j.banner_url,
              j.is_paid,
              j.rubro,
              COUNT(p.*) FILTER (WHERE p.status NOT IN ('cancelled','rejected')) AS "candidatesCount"
            FROM "Job" j
            LEFT JOIN proposals p ON p.job_id = j.id
            WHERE j.id = %s
            GROUP BY j.id, j."createdAt", j."expirationDate"
            """,
            (job_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta no encontrada")
        cols = [d[0] for d in cur.description]
        job = dict(zip(cols, row))
        if job.get("createdAt"):
            job["createdAt"] = job["createdAt"].isoformat()
        if job.get("expirationDate"):
            job["expirationDate"] = job["expirationDate"].isoformat()
        return {"job": job}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=JobResponse, summary="Crear oferta (empleador)")
async def create_job(data: JobCreateRequest, current_user=Depends(get_current_user)):
    job_id, _ = _insert_job(
        data.model_dump(),
        owner_id=current_user.id,
        source="employer",
        label_default="automatic",
    )
    return {"message": "Oferta creada", "jobId": job_id}

@router.delete("/delete/{job_id}", summary="Eliminar una oferta (empleador)")
async def delete_job(
    job_id: int = Path(..., description="ID de la oferta"),
    current_user=Depends(get_current_user)
):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verificar que la oferta le pertenece al usuario
        cur.execute('SELECT id FROM "Job" WHERE id=%s AND "userId"=%s', (job_id, current_user.id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta oferta")

        # Eliminar la oferta
        cur.execute('DELETE FROM "Job" WHERE id = %s', (job_id,))
        conn.commit()
        return {"message": "Oferta eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar oferta")
    finally:
        if cur: cur.close()
        if conn: conn.close()

@router.post(
    "/create-admin",
    status_code=status.HTTP_201_CREATED,
    response_model=JobResponse,
    dependencies=[Depends(oauth2_admin)],
    summary="Crear oferta (admin)",
)
async def create_admin_job(data: JobCreateAdminRequest, admin_sub: str = Depends(get_current_admin_sub)):
    owner_id = data.userId
    if not owner_id:
        owner_id = get_admin_id_by_email(admin_sub)
        if not owner_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admin sin usuario asociado")
    job_id, _ = _insert_job(
        data.model_dump(),
        owner_id=owner_id,
        source=data.source,
        label_default=data.label,
    )
    return {"message": "Oferta creada", "jobId": job_id}

@router.post("/apply", status_code=status.HTTP_201_CREATED, summary="Postularse a una oferta")
async def apply_to_job(data: ApplyToJobRequest, current_user=Depends(get_current_user)):
    job_id = data.jobId

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verificar si ya existe una propuesta para este job y usuario
        cur.execute("""
            SELECT id, label FROM proposals
             WHERE job_id = %s AND applicant_id = %s
             LIMIT 1
        """, (job_id, current_user.id))
        row = cur.fetchone()

        if row:
            pid, label = row
            if label == "automatic":
                cur.execute("""
                    UPDATE proposals
                       SET status='waiting', cancelled_at=NULL, created_at=NOW()
                     WHERE id = %s
                     RETURNING id
                """, (pid,))
                conn.commit()

                # Relanzar entrega automática
                threading.Thread(target=deliver, args=(pid, True), daemon=True).start()
                return {"message": "Reactivada como automática", "proposalId": pid}
            else:
                cur.execute("""
                    UPDATE proposals
                       SET status='pending', cancelled_at=NULL, created_at=NOW()
                     WHERE id = %s
                     RETURNING id
                """, (pid,))
                conn.commit()
                return {"message": "Reactivada como manual", "proposalId": pid}

        # No existía propuesta previa, determinar tipo de oferta
        cur.execute("""
            SELECT label FROM "Job" WHERE id = %s
        """, (job_id,))
        job_row = cur.fetchone()
        if not job_row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Oferta no encontrada")
        
        job_label = job_row[0] or "manual"

        if job_label == "automatic":
            cur.execute("""
                INSERT INTO proposals (job_id, applicant_id, label, status, created_at)
                VALUES (%s, %s, 'automatic', 'waiting', NOW())
                RETURNING id
            """, (job_id, current_user.id))
            pid = cur.fetchone()[0]
            conn.commit()

            threading.Thread(target=deliver, args=(pid, True), daemon=True).start()
            return {"message": "Postulación automática registrada", "proposalId": pid}
        else:
            cur.execute("""
                INSERT INTO proposals (job_id, applicant_id, label, status, created_at)
                VALUES (%s, %s, 'manual', 'pending', NOW())
                RETURNING id
            """, (job_id, current_user.id))
            pid = cur.fetchone()[0]
            conn.commit()
            return {"message": "Postulación manual registrada", "proposalId": pid}

    except Exception as e:
        if conn:
            conn.rollback()
        traceback.print_exc()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al postularse")
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═════════════ Banner upload ═════════════

@router.post("/upload-banner", summary="Subir imagen/banner para una oferta")
async def upload_banner(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Sube una imagen a GCS y devuelve la URL pública."""
    import uuid
    from google.cloud import storage as gcs

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se permiten imágenes (JPEG, PNG, WebP, GIF)")

    try:
        sa_info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", "{}"))
        client = gcs.Client.from_service_account_info(sa_info)
        bucket = client.bucket(os.getenv("GOOGLE_STORAGE_BUCKET", ""))

        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
        blob_name = f"job-banners/{uuid.uuid4().hex}.{ext}"
        blob = bucket.blob(blob_name)

        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)
        blob.make_public()

        return {"banner_url": blob.public_url}
    except Exception:
        logger.exception("Error uploading banner")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al subir imagen")


# ═════════════ Auto-generate tags endpoint ═════════════

class GenerateTagsRequest(BaseModel):
    title: str
    description: str

@router.post("/generate-tags", summary="Generar tags automáticos para una oferta")
async def generate_tags_endpoint(data: GenerateTagsRequest):
    tags = _generate_tags(data.title, data.description)
    return {"tags": tags}

