"""
Email inbox scanner — connects to Gmail/Workspace via IMAP,
classifies emails (CV, proposal, inquiry), and auto-processes CVs.

Uses App Passwords for authentication (works with both Gmail and Workspace).
"""
import email
import imaplib
import io
import json
import logging
import os
import re
from email.header import decode_header
from typing import Optional

from app.database import get_db_connection
from app.email_utils import send_credentials_email

logger = logging.getLogger(__name__)

# Mapa categoria -> etiqueta de Gmail. Toda categoria clasificable tiene etiqueta
# (incluido OTRO) para que ningun mail procesado quede sin etiquetar.
LABEL_MAP = {
    "CV": "FAP/CVs",
    "PROPUESTA": "FAP/Propuestas",
    "CONSULTA": "FAP/Consultas",
    "OFERTA": "FAP/Ofertas",
    "SPAM": "FAP/Spam",
    "OTRO": "FAP/Otros",
}

# Classification prompt
CLASSIFY_PROMPT = """Clasifica este email en UNA de estas categorias:
- CV: el email contiene o adjunta un curriculum vitae / hoja de vida
- PROPUESTA: el email es una propuesta comercial, presupuesto o cotizacion
- CONSULTA: el email es una consulta, pregunta o solicitud de informacion
- OFERTA: el email contiene una oferta de trabajo o busqueda de personal
- SPAM: publicidad, newsletters, notificaciones automaticas
- OTRO: no encaja en ninguna categoria anterior

Responde SOLO con la categoria (una palabra)."""


def scan_inbox(account_config: dict, max_emails: int = 20, scan_all: bool = False) -> dict:
    """
    Scan an email inbox for new unprocessed emails.

    account_config: {
        "email": "user@example.com",
        "password": "app_password",
        "imap_host": "imap.gmail.com",
        "imap_port": 993,
        "label": "INBOX"
    }

    Returns summary of processed emails.
    """
    results = {"processed": 0, "cvs": 0, "proposals": 0, "inquiries": 0, "errors": 0, "details": []}

    try:
        mail = imaplib.IMAP4_SSL(
            account_config.get("imap_host", "imap.gmail.com"),
            account_config.get("imap_port", 993),
        )
        mail.login(account_config["email"], account_config["password"])
        mail.select(account_config.get("label", "INBOX"))

        # Search emails: ALL for first sync, UNSEEN for regular scans
        search_criteria = "ALL" if scan_all else "UNSEEN"
        status, messages = mail.search(None, search_criteria)
        if status != "OK":
            return {"error": "No se pudo buscar emails"}

        email_ids = messages[0].split()
        if not email_ids:
            return {**results, "message": "No hay emails nuevos", "total_found": 0, "remaining": 0}

        to_process, total_found, remaining = _select_email_ids(email_ids, max_emails, scan_all)
        results["total_found"] = total_found
        results["remaining"] = remaining
        if remaining:
            logger.info(
                "Inbox %s: %d emails encontrados, procesando %d en esta corrida (faltan %d; "
                "usa scan_all=true o max_emails=0 para procesar todos)",
                account_config.get("email"), total_found, len(to_process), remaining,
            )

        # Process the selected emails
        for eid in to_process:
            try:
                detail = _process_email(mail, eid, account_config["email"])
                results["processed"] += 1
                results["details"].append(detail)

                if detail.get("category") == "CV":
                    results["cvs"] += 1
                elif detail.get("category") == "PROPUESTA":
                    results["proposals"] += 1
                elif detail.get("category") == "CONSULTA":
                    results["inquiries"] += 1

            except Exception as e:
                logger.error("Error processing email %s: %s", eid, e)
                results["errors"] += 1
                results["details"].append({"error": str(e)})

        mail.close()
        mail.logout()

    except imaplib.IMAP4.error as e:
        logger.error("IMAP connection error: %s", e)
        return {"error": f"Error de conexion IMAP: {e}"}
    except Exception as e:
        logger.error("Inbox scan error: %s", e)
        return {"error": str(e)}

    return results


def _process_email(mail, email_id, account_email: str) -> dict:
    """Process a single email: extract info, classify, and handle."""
    status, data = mail.fetch(email_id, "(RFC822)")
    if status != "OK":
        return {"error": "No se pudo obtener el email"}

    msg = email.message_from_bytes(data[0][1])

    # Extract headers
    subject = _decode_header(msg.get("Subject", ""))
    from_addr = _decode_header(msg.get("From", ""))
    from_email = _extract_email_from_header(from_addr)
    date_str = msg.get("Date", "")

    # Extract body text
    body_text = _get_body_text(msg)

    # Check for PDF attachments (likely CVs)
    attachments = _get_attachments(msg)
    has_pdf = any(a["filename"].lower().endswith(".pdf") for a in attachments)

    # Classify
    category = _classify_email(subject, body_text, has_pdf)

    detail = {
        "from": from_email,
        "subject": subject,
        "date": date_str,
        "category": category,
        "has_pdf": has_pdf,
        "attachments": len(attachments),
    }

    # Auto-process CVs
    if category == "CV" and has_pdf:
        for att in attachments:
            if att["filename"].lower().endswith(".pdf"):
                cv_result = _process_cv_attachment(
                    att["data"], from_email, account_email, original_name=att["filename"]
                )
                detail["cv_processed"] = cv_result
                break

    # Label/flag the email based on category
    _label_email(mail, email_id, category)

    return detail


def _classify_email(subject: str, body: str, has_pdf: bool) -> str:
    """Classify an email using heuristics (fast, no API call needed)."""
    text = f"{subject} {body}".lower()

    # CV indicators
    cv_keywords = ["curriculum", "cv ", "hoja de vida", "adjunto mi cv", "envio mi cv",
                   "postulacion", "me postulo", "busco trabajo", "busco empleo"]
    if has_pdf and any(kw in text for kw in cv_keywords):
        return "CV"
    if has_pdf and ("curriculum" in subject.lower() or "cv" in subject.lower()):
        return "CV"
    # If it has a PDF and comes from a person (not automated), likely a CV
    if has_pdf and not any(kw in text for kw in ["factura", "presupuesto", "cotizacion", "newsletter"]):
        return "CV"

    # Proposal indicators
    proposal_keywords = ["presupuesto", "cotizacion", "propuesta comercial", "oferta comercial"]
    if any(kw in text for kw in proposal_keywords):
        return "PROPUESTA"

    # Job offer indicators
    offer_keywords = ["busco personal", "necesito personal", "oferta laboral", "busqueda de personal",
                      "puesto disponible", "vacante"]
    if any(kw in text for kw in offer_keywords):
        return "OFERTA"

    # Spam indicators
    spam_keywords = ["unsubscribe", "newsletter", "no-reply", "noreply", "promocion", "descuento"]
    if any(kw in text for kw in spam_keywords):
        return "SPAM"

    # Inquiry (default for non-automated emails)
    if len(body.strip()) > 20:
        return "CONSULTA"

    return "OTRO"


def _select_email_ids(email_ids, max_emails, scan_all=False):
    """Decide qué ids procesar y cuántos quedan fuera del tope.

    Devuelve (ids_a_procesar, total_found, remaining).

    - Scan histórico (`scan_all=True`) o `max_emails <= 0`: procesa TODO el inbox
      sin tope (la "Sincronización inicial" debe procesar el 100%); remaining=0.
    - Scan incremental (UNSEEN del cron): procesa los más recientes (cola de la lista,
      como devuelve IMAP) hasta `max_emails`; remaining = cuántos quedaron sin tocar.
    """
    total = len(email_ids)
    if scan_all or not max_emails or max_emails <= 0 or total <= max_emails:
        return list(email_ids), total, 0
    return list(email_ids[-max_emails:]), total, total - max_emails


# --- I/O por defecto (lazy: no se importan deps pesadas a nivel modulo) ------

_storage_client = None
_openai_client = None


def _default_upload_pdf(pdf_bytes: bytes, blob_path: str, content_type: str = "application/pdf") -> str:
    """Sube el PDF a GCS y devuelve la URL publica. Inicializa el cliente lazy."""
    global _storage_client
    if _storage_client is None:
        from google.cloud import storage
        info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
        _storage_client = storage.Client.from_service_account_info(info)
    bucket_name = os.getenv("GOOGLE_STORAGE_BUCKET")
    bucket = _storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(pdf_bytes, content_type=content_type)
    return f"https://storage.googleapis.com/{bucket_name}/{blob_path}"


def _default_make_embedding(text: str):
    """Genera un embedding con OpenAI. Inicializa el cliente lazy."""
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=30)
    resp = _openai_client.embeddings.create(model="text-embedding-ada-002", input=text)
    return resp.data[0].embedding


def _default_gen_password(length: int = 12):
    """Devuelve (plano, hasheado) — mismo esquema que cv_admin_upload."""
    import random
    import string
    import bcrypt

    plain = "".join(random.choice(string.ascii_letters + string.digits + "!@#$%^&*") for _ in range(length))
    hashed = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return plain, hashed


def _sanitize_filename(filename: str) -> str:
    filename = (filename or "").replace(" ", "_")
    return re.sub(r"[^a-zA-Z0-9_.-]", "", filename)


def _safe_cv_filename(user_email: str, original_name: Optional[str]) -> str:
    """Nombre de blob unico-por-candidato: <slug-email>_<archivo>.pdf.

    Se prefija con un slug del email para no pisar el CV de otro candidato cuando
    el adjunto trae un nombre generico (ej. "CV.pdf").
    """
    base = _sanitize_filename(original_name) or "cv.pdf"
    if not base.lower().endswith(".pdf"):
        base = f"{base}.pdf"
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", user_email.split("@")[0]).strip("_").lower() or "cv"
    return f"{slug}_{base}"


def _safe_embedding(make_embedding, text: str):
    """Embedding best-effort: si falla (OpenAI caido/cuota), devuelve None y no bloquea."""
    if not text:
        return None
    try:
        return make_embedding(text)
    except Exception as e:
        logger.warning("No se pudo generar embedding (se omite): %s", e)
        return None


def persist_cv_account(
    cur,
    conn,
    *,
    user_email: str,
    name: str,
    description: str,
    phone,
    rubro: str,
    cv_text: str,
    pdf_bytes: bytes,
    original_name: Optional[str],
    upload_pdf,
    make_embedding,
    gen_password,
    send_credentials,
) -> dict:
    """Crea o repara la cuenta del candidato con el CV adjunto al perfil.

    Idempotente:
    - usuario no existe -> crea User (+cvUrl, embedding), EmployeeDocument, FileEmbedding
      y manda credenciales. status="created".
    - usuario existe SIN EmployeeDocument -> sube y adjunta el CV (saneamiento),
      completa cvUrl/embedding si faltan, sin re-crear ni reenviar credenciales. status="attached".
    - usuario existe CON EmployeeDocument -> no hace nada. status="exists".

    El EmployeeDocument es lo que ve el perfil del candidato (/api/employee/documents),
    asi que sin esa fila el CV no aparece en la cuenta — ese era el bug.
    """
    cur.execute('SELECT id FROM "User" WHERE email = %s', (user_email,))
    row = cur.fetchone()
    user_id = row[0] if row else None

    if user_id is not None:
        cur.execute('SELECT 1 FROM "EmployeeDocument" WHERE "userId" = %s LIMIT 1', (user_id,))
        if cur.fetchone():
            return {"status": "exists", "email": user_email, "user_id": user_id}

    # Subida del archivo (la misma ruta de blob es deterministica -> re-subir sobreescribe)
    safe_filename = _safe_cv_filename(user_email, original_name)
    blob_path = f"employee-documents/{safe_filename}"
    cv_url = upload_pdf(pdf_bytes, blob_path)

    # Embeddings best-effort
    profile_text = (f"{description} Rubro: {rubro}").strip()
    embedding_desc = _safe_embedding(make_embedding, profile_text)
    embedding_cv = _safe_embedding(make_embedding, (cv_text or "")[:8000])

    plain_pw = None
    if user_id is None:
        plain_pw, hashed_pw = gen_password()
        if embedding_desc is not None:
            cur.execute(
                'INSERT INTO "User" (email, name, role, description, phone, password, confirmed, rubro, "cvUrl", embedding) '
                "VALUES (%s, %s, 'empleado', %s, %s, %s, TRUE, %s, %s, %s) RETURNING id",
                (user_email, name, description, phone, hashed_pw, rubro, cv_url, embedding_desc),
            )
        else:
            cur.execute(
                'INSERT INTO "User" (email, name, role, description, phone, password, confirmed, rubro, "cvUrl") '
                "VALUES (%s, %s, 'empleado', %s, %s, %s, TRUE, %s, %s) RETURNING id",
                (user_email, name, description, phone, hashed_pw, rubro, cv_url),
            )
        user_id = cur.fetchone()[0]
        status = "created"
    else:
        # Saneamiento: el usuario ya existia; completar lo que falte sin pisar datos.
        cur.execute('UPDATE "User" SET "cvUrl" = COALESCE("cvUrl", %s) WHERE id = %s', (cv_url, user_id))
        if embedding_desc is not None:
            cur.execute('UPDATE "User" SET embedding = %s WHERE id = %s AND embedding IS NULL', (embedding_desc, user_id))
        status = "attached"

    # EmployeeDocument -> esto es lo que muestra el perfil del candidato
    cur.execute(
        'INSERT INTO "EmployeeDocument" ("userId", url, "fileKey", "originalName", "createdAt") VALUES (%s, %s, %s, %s, NOW())',
        (user_id, cv_url, blob_path, original_name or safe_filename),
    )

    # FileEmbedding -> matching por CV completo (mismo patron que cv_confirm)
    if embedding_cv is not None:
        cur.execute(
            'INSERT INTO "FileEmbedding" ("fileKey", embedding, "createdAt") VALUES (%s, %s::vector, NOW()) '
            'ON CONFLICT ("fileKey") DO UPDATE SET embedding = EXCLUDED.embedding, "createdAt" = NOW()',
            (blob_path, embedding_cv),
        )

    conn.commit()

    if status == "created":
        try:
            send_credentials(user_email, name, plain_pw)
        except Exception as e:
            logger.error("Failed to send credentials to %s: %s", user_email, e)

    return {
        "status": status,
        "email": user_email,
        "name": name,
        "rubro": rubro,
        "user_id": user_id,
        "cv_url": cv_url,
    }


def _process_cv_attachment(
    pdf_bytes: bytes,
    sender_email: str,
    account_email: str,
    *,
    original_name: Optional[str] = None,
    upload_pdf=None,
    make_embedding=None,
    gen_password=None,
    send_credentials=None,
) -> dict:
    """Procesa un PDF de CV adjunto: extrae datos, crea/repara la cuenta y adjunta el CV."""
    upload_pdf = upload_pdf or _default_upload_pdf
    make_embedding = make_embedding or _default_make_embedding
    gen_password = gen_password or _default_gen_password
    send_credentials = send_credentials or send_credentials_email

    try:
        from PyPDF2 import PdfReader
        from app.services.cv_extraction import extract_cv_data

        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = " ".join([page.extract_text() or "" for page in reader.pages]).strip()

        if not text or len(text) < 50:
            return {"status": "skipped", "reason": "PDF sin texto extraible"}

        # Extract structured data
        cv_data = extract_cv_data(text)

        # Email priority: CV extracted email > sender email
        cv_email = cv_data.get("email")
        if cv_email and "@" in cv_email and "." in cv_email.split("@")[-1]:
            user_email = cv_email.lower()
            email_source = "cv"
        elif sender_email and "@" in sender_email:
            user_email = sender_email.lower()
            email_source = "remitente"
        else:
            return {"status": "skipped", "reason": "Sin email valido (ni en CV ni en remitente)"}

        name = cv_data.get("nombre") or user_email.split("@")[0].replace(".", " ").title()
        phone = cv_data.get("telefono")
        description = cv_data.get("descripcion") or ""
        rubro = cv_data.get("rubro") or "General"
        logger.info("CV procesado: email=%s (fuente: %s), nombre=%s, rubro=%s", user_email, email_source, name, rubro)

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            return persist_cv_account(
                cur,
                conn,
                user_email=user_email,
                name=name,
                description=description,
                phone=phone,
                rubro=rubro,
                cv_text=text,
                pdf_bytes=pdf_bytes,
                original_name=original_name,
                upload_pdf=upload_pdf,
                make_embedding=make_embedding,
                gen_password=gen_password,
                send_credentials=send_credentials,
            )
        finally:
            cur.close()
            conn.close()

    except Exception as e:
        logger.error("CV processing error: %s", e)
        return {"status": "error", "reason": str(e)}


def _label_email(mail, email_id, category: str) -> bool:
    """Etiqueta el email en Gmail segun la categoria. Devuelve True si se aplico.

    A diferencia de la version anterior: chequea el status de mail.store (Gmail puede
    devolver 'NO' sin lanzar excepcion) y loguea las fallas en vez de tragarselas.
    """
    label = LABEL_MAP.get(category)
    if not label:
        return False
    try:
        # Asegurar que la etiqueta exista (best-effort; si ya existe Gmail devuelve NO).
        try:
            mail.create(label)
        except Exception:
            pass
        typ, data = mail.store(email_id, "+X-GM-LABELS", f'"{label}"')
        if typ != "OK":
            logger.warning("No se pudo etiquetar email %s como '%s': %s %s", email_id, label, typ, data)
            return False
        return True
    except Exception as e:
        logger.warning("Error etiquetando email %s como '%s': %s", email_id, label, e)
        return False


def _decode_header(header_value: str) -> str:
    """Decode email header (handles encoded subjects)."""
    if not header_value:
        return ""
    parts = decode_header(header_value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return " ".join(decoded)


def _extract_email_from_header(from_header: str) -> Optional[str]:
    """Extract email address from From header (vía extractor canónico, recorta TLD)."""
    from app.utils.email_extraction import extract_email
    email = extract_email(from_header)
    return email.lower() if email else None


def _get_body_text(msg) -> str:
    """Extract plain text body from email message."""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                payload = part.get_payload(decode=True)
                charset = part.get_content_charset() or "utf-8"
                return payload.decode(charset, errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
    return ""


def _get_attachments(msg) -> list:
    """Extract attachments from email message."""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_disposition() == "attachment":
                filename = part.get_filename()
                if filename:
                    filename = _decode_header(filename)
                    data = part.get_payload(decode=True)
                    if data:
                        attachments.append({"filename": filename, "data": data, "size": len(data)})
    return attachments
