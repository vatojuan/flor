# app/routers/mailing.py
"""
Segmented mailing — send targeted emails to groups of candidates
filtered by rubro, keyword, or custom selection.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.database import get_db_connection
from app.utils.auth_utils import get_current_admin
from app.email_utils import send_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mailing", tags=["mailing"])


class SegmentFilter(BaseModel):
    rubro: Optional[str] = None
    keyword: Optional[str] = None


class MailingRequest(BaseModel):
    subject: str
    body: str
    recipient_ids: Optional[list[int]] = None
    segment: Optional[SegmentFilter] = None


class PreviewRequest(BaseModel):
    rubro: Optional[str] = None
    keyword: Optional[str] = None


@router.post("/preview", dependencies=[Depends(get_current_admin)])
def preview_segment(req: PreviewRequest):
    """
    Preview recipients for a segment before sending.
    Returns count and list of candidates that would receive the email.
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        conditions = ["u.role = 'empleado'", "u.confirmed = TRUE", "u.email IS NOT NULL", "COALESCE(u.active, TRUE) = TRUE"]
        params = []

        if req.rubro:
            conditions.append("u.rubro ILIKE %s")
            params.append(f"%{req.rubro}%")

        if req.keyword:
            conditions.append("(u.name ILIKE %s OR u.description ILIKE %s)")
            params.extend([f"%{req.keyword}%", f"%{req.keyword}%"])

        where = " AND ".join(conditions)

        cur.execute(f"""
            SELECT u.id, u.name, u.email, u.rubro
              FROM "User" u
             WHERE {where}
             ORDER BY u.rubro, u.name
        """, params)

        cols = [c[0] for c in cur.description]
        recipients = [dict(zip(cols, row)) for row in cur.fetchall()]

        rubros_summary = {}
        for r in recipients:
            rb = r.get("rubro") or "General"
            rubros_summary[rb] = rubros_summary.get(rb, 0) + 1

        return {
            "count": len(recipients),
            "recipients": recipients,
            "rubros_summary": rubros_summary,
        }
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/send", dependencies=[Depends(get_current_admin)])
def send_segmented_mailing(req: MailingRequest, background_tasks: BackgroundTasks):
    """
    Send emails to a segment or specific list of recipients.
    Body can use {nombre} for personalization.
    """
    if not req.subject or not req.body:
        raise HTTPException(400, "subject y body son obligatorios")

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if req.recipient_ids:
            # Send to specific IDs
            placeholders = ",".join(["%s"] * len(req.recipient_ids))
            cur.execute(
                f'SELECT id, name, email FROM "User" WHERE id IN ({placeholders}) AND email IS NOT NULL',
                req.recipient_ids,
            )
        elif req.segment:
            # Send to segment
            conditions = ["u.role = 'empleado'", "u.confirmed = TRUE", "u.email IS NOT NULL", "COALESCE(u.active, TRUE) = TRUE"]
            params = []

            if req.segment.rubro:
                conditions.append("u.rubro ILIKE %s")
                params.append(f"%{req.segment.rubro}%")
            if req.segment.keyword:
                conditions.append("(u.name ILIKE %s OR u.description ILIKE %s)")
                params.extend([f"%{req.segment.keyword}%", f"%{req.segment.keyword}%"])

            where = " AND ".join(conditions)
            cur.execute(f'SELECT id, name, email FROM "User" u WHERE {where}', params)
        else:
            raise HTTPException(400, "Debes enviar recipient_ids o segment")

        recipients = cur.fetchall()
        if not recipients:
            raise HTTPException(404, "No se encontraron destinatarios")

        # Queue emails in background
        for user_id, name, email in recipients:
            personalized_body = req.body.replace("{nombre}", name or "Candidato")
            background_tasks.add_task(send_email, email, req.subject, personalized_body)

        logger.info("Mailing queued: %d recipients, subject='%s'", len(recipients), req.subject)

        return {
            "message": f"Email en cola para {len(recipients)} destinatarios",
            "count": len(recipients),
        }
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/rubros", dependencies=[Depends(get_current_admin)])
def list_rubros_with_counts():
    """List all rubros with candidate counts for segment building."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT COALESCE(rubro, 'General') as rubro, COUNT(*) as count
              FROM "User"
             WHERE role = 'empleado' AND confirmed = TRUE AND email IS NOT NULL
             GROUP BY rubro
             ORDER BY count DESC
        """)
        return [{"rubro": r[0], "count": r[1]} for r in cur.fetchall()]
    finally:
        if cur: cur.close()
        if conn: conn.close()
