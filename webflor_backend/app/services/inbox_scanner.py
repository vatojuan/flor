"""
Email inbox scanner — connects to Gmail/Workspace via IMAP,
classifies emails (CV, proposal, inquiry), and auto-processes CVs.

Uses App Passwords for authentication (works with both Gmail and Workspace).
"""
import email
import imaplib
import io
import logging
import os
import re
from email.header import decode_header
from typing import Optional

from app.database import get_db_connection
from app.services.cv_extraction import extract_cv_data
from app.email_utils import send_credentials_email

logger = logging.getLogger(__name__)

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
            return {**results, "message": "No hay emails nuevos"}

        # Process latest N emails
        for eid in email_ids[-max_emails:]:
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
                cv_result = _process_cv_attachment(att["data"], from_email, account_email)
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


def _process_cv_attachment(pdf_bytes: bytes, sender_email: str, account_email: str) -> dict:
    """Process a CV PDF attachment: extract data and create user account."""
    import random
    import string
    import bcrypt

    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = " ".join([page.extract_text() or "" for page in reader.pages]).strip()

        if not text or len(text) < 50:
            return {"status": "skipped", "reason": "PDF sin texto extraible"}

        # Extract structured data
        cv_data = extract_cv_data(text)
        user_email = cv_data.get("email") or sender_email
        if not user_email:
            return {"status": "skipped", "reason": "Sin email"}

        user_email = user_email.lower()
        name = cv_data.get("nombre") or user_email.split("@")[0].replace(".", " ").title()
        phone = cv_data.get("telefono")
        description = cv_data.get("descripcion") or ""
        rubro = cv_data.get("rubro") or "General"

        # Check if user already exists
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT id FROM "User" WHERE email = %s', (user_email,))
        existing = cur.fetchone()

        if existing:
            cur.close()
            conn.close()
            return {"status": "exists", "email": user_email}

        # Generate password and create account
        plain_pw = "".join(random.choice(string.ascii_letters + string.digits + "!@#$%^&*") for _ in range(12))
        hashed_pw = bcrypt.hashpw(plain_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        cur.execute(
            'INSERT INTO "User" (email, name, role, description, phone, password, confirmed, rubro) '
            "VALUES (%s, %s, 'empleado', %s, %s, %s, TRUE, %s) RETURNING id",
            (user_email, name, description, phone, hashed_pw, rubro),
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        # Send credentials
        try:
            send_credentials_email(user_email, name, plain_pw)
        except Exception as e:
            logger.error("Failed to send credentials to %s: %s", user_email, e)

        return {"status": "created", "email": user_email, "name": name, "rubro": rubro, "user_id": user_id}

    except Exception as e:
        logger.error("CV processing error: %s", e)
        return {"status": "error", "reason": str(e)}


def _label_email(mail, email_id, category: str):
    """Try to label/flag the email based on category (Gmail labels)."""
    try:
        label_map = {
            "CV": "FAP/CVs",
            "PROPUESTA": "FAP/Propuestas",
            "CONSULTA": "FAP/Consultas",
            "OFERTA": "FAP/Ofertas",
            "SPAM": "FAP/Spam",
        }
        label = label_map.get(category)
        if label:
            # Gmail uses X-GM-LABELS for labeling
            mail.store(email_id, "+X-GM-LABELS", f'"{label}"')
    except Exception:
        # Labeling is best-effort, don't fail the whole process
        pass


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
    """Extract email address from From header."""
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", from_header)
    return match.group(0).lower() if match else None


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
