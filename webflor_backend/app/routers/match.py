# app/routers/match.py
"""
Matching logic between candidates and job offers.

- Gratis: matching se calcula y guarda, pero NO se envían emails
- Paga (is_paid): matching se calcula Y se envían emails a candidatos
- Admin: puede ver todos los matches y enviar emails manualmente
"""
from __future__ import annotations

import os
import uuid
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel

from app.database import get_db_connection
from app.core.auth import SECRET_KEY, ALGORITHM
from app.email_utils import send_match_notification, send_admin_alert

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://fapmendoza.com").rstrip("/")
MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.75"))
RUBRO_BONUS: float = 0.05
NOTIFY_THRESHOLD: float = float(os.getenv("NOTIFY_THRESHOLD", "0.78"))

oauth2_admin = OAuth2PasswordBearer(tokenUrl="/auth/admin-login")
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/match", tags=["matchings"])


# ─────────────────── Response models ────────────────────

class MatchJobInfo(BaseModel):
    id: int
    title: str
    rubro: Optional[str] = None
    is_paid: Optional[bool] = None

class MatchUserInfo(BaseModel):
    id: int
    email: Optional[str] = None
    name: Optional[str] = None
    rubro: Optional[str] = None
    phone: Optional[str] = None

class MatchItem(BaseModel):
    id: int
    score: float
    sent_at: Optional[str] = None
    status: Optional[str] = None
    job: MatchJobInfo
    user: MatchUserInfo


def get_current_admin(token: str = Depends(oauth2_admin)) -> str:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("sub") or ""
    except JWTError:
        raise HTTPException(status_code=401, detail="Token admin invalido o requerido")


def _cur_to_dicts(cur) -> List[Dict[str, Any]]:
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


# ═══════════ Matching: New Job Created ═══════════

def run_matching_for_job(job_id: int) -> None:
    """
    Calculate matches for a job offer.
    - ALWAYS calculates and stores match scores
    - Only sends notification emails if the job is PAID (is_paid=True)
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get job embedding, rubro, and payment status
        cur.execute(
            'SELECT embedding, rubro, is_paid FROM "Job" WHERE id = %s AND embedding IS NOT NULL',
            (job_id,),
        )
        row = cur.fetchone()
        if not row:
            logger.info("Matching skipped: Job %s has no embedding", job_id)
            return
        job_embedding, job_rubro, is_paid = row

        # Clear previous matches for this job
        cur.execute("DELETE FROM matches WHERE job_id = %s", (job_id,))

        # Insert matches with combined score
        cur.execute("""
            INSERT INTO matches (job_id, user_id, score, status)
            SELECT %s, u.id,
                   LEAST(1.0,
                       (1.0 - (u.embedding::vector <=> %s::vector))
                       + CASE WHEN u.rubro IS NOT NULL AND u.rubro = %s THEN %s ELSE 0 END
                   ),
                   'pending'
              FROM "User" u
             WHERE u.embedding IS NOT NULL
               AND u.role = 'empleado'
               AND u.confirmed = TRUE
               AND COALESCE(u.active, TRUE) = TRUE
        """, (job_id, job_embedding, job_rubro, RUBRO_BONUS))
        conn.commit()
        logger.info("Inserted %d matches for job %s (is_paid=%s)", cur.rowcount, job_id, is_paid)

        # Only send emails if the job is PAID
        if not is_paid:
            logger.info("Job %s is free — matches saved but no emails sent", job_id)
            return

        # Notify matches above threshold (PAID jobs only)
        _send_match_notifications(conn, cur, job_id)

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Critical error in run_matching_for_job for job_id=%s", job_id)
        send_admin_alert(
            subject="Fallo Critico en Matching por Oferta",
            details=f"Oferta ID {job_id} fallo.\nError: {e}",
        )
    finally:
        if cur: cur.close()
        if conn: conn.close()


def _send_match_notifications(conn, cur, job_id: int) -> int:
    """Send notification emails for matches above threshold. Returns count sent."""
    backend_url = os.getenv("BACKEND_URL", "https://api.fapmendoza.online")
    cur.execute("""
        SELECT m.id, m.score, u.id, u.name, u.email, j.title
          FROM matches m
          JOIN "User" u ON u.id = m.user_id
          JOIN "Job"  j ON j.id = m.job_id
         WHERE m.job_id = %s AND (m.score)::float >= %s AND m.status = 'pending'
         ORDER BY m.score DESC
    """, (job_id, NOTIFY_THRESHOLD))

    matches_to_notify = cur.fetchall()
    sent_count = 0
    logger.info("Sending %d match notifications for job %s", len(matches_to_notify), job_id)

    for match_id, score, user_id, user_name, user_email, job_title in matches_to_notify:
        if not user_email:
            continue

        apply_token = str(uuid.uuid4())
        apply_link = f"{FRONTEND_URL}/apply/{apply_token}"

        context = {
            "applicant_name": user_name or "Candidato",
            "job_title": job_title,
            "score": f"{float(score) * 100:.0f}%",
            "apply_link": apply_link,
            "unsubscribe_link": f"{backend_url}/api/users/unsubscribe/{user_id}",
        }

        try:
            send_match_notification(user_email, context)
            cur.execute(
                "UPDATE matches SET apply_token=%s, status='sent', sent_at=NOW() WHERE id=%s",
                (apply_token, match_id),
            )
            cur.execute("""
                INSERT INTO apply_tokens (token, job_id, applicant_id, expires_at, used)
                VALUES (%s, %s, (SELECT user_id FROM matches WHERE id=%s), NOW() + INTERVAL '30 days', FALSE)
                ON CONFLICT(token) DO NOTHING
            """, (apply_token, job_id, match_id))
            conn.commit()
            sent_count += 1
        except Exception as e:
            logger.error("Error notifying match %s: %s", match_id, e)
            cur.execute(
                "UPDATE matches SET status='error', error_msg=%s WHERE id=%s",
                (str(e)[:250], match_id),
            )
            conn.commit()

    return sent_count


# ═══════════ Matching: New User Registered ═══════════

def run_matching_for_user(user_id: int) -> None:
    """Pre-calculate match scores for a new user against all jobs (no emails sent)."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            'SELECT embedding, rubro FROM "User" WHERE id = %s AND embedding IS NOT NULL',
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            logger.info("Matching skipped: User %s has no embedding", user_id)
            return
        user_embedding, user_rubro = row

        cur.execute("DELETE FROM matches WHERE user_id = %s", (user_id,))

        cur.execute("""
            INSERT INTO matches (job_id, user_id, score, status)
            SELECT j.id, %s,
                   LEAST(1.0,
                       (1.0 - (j.embedding::vector <=> %s::vector))
                       + CASE WHEN j.rubro IS NOT NULL AND j.rubro = %s THEN %s ELSE 0 END
                   ),
                   'pending'
              FROM "Job" j
             WHERE j.embedding IS NOT NULL
        """, (user_id, user_embedding, user_rubro, RUBRO_BONUS))
        conn.commit()
        logger.info("Inserted %d matches for user %s", cur.rowcount, user_id)

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Critical error in run_matching_for_user for user_id=%s", user_id)
        send_admin_alert(
            subject="Fallo Critico en Matching por Usuario",
            details=f"Usuario ID {user_id} fallo.\nError: {e}",
        )
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ Admin Panel ═══════════

@router.get("/admin", dependencies=[Depends(get_current_admin)], response_model=List[MatchItem], summary="List matches")
def list_matchings(
    min_score: float = Query(MATCH_THRESHOLD, ge=0, le=1, description="Minimum score filter"),
    rubro: Optional[str] = Query(None, description="Filter by rubro"),
    job_id: Optional[int] = Query(None, description="Filter by job ID"),
    only_pending: bool = Query(False, description="Only show unsent matches"),
):
    """List matches sorted by score (highest first). Admin can see ALL matches including free jobs."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT m.id, m.score, m.sent_at, m.status,
                   json_build_object('id', j.id, 'title', j.title, 'rubro', j.rubro, 'is_paid', j.is_paid) AS job,
                   json_build_object('id', u.id, 'email', u.email, 'name', u.name, 'rubro', u.rubro, 'phone', u.phone) AS "user"
              FROM matches m
              JOIN "Job"  j ON j.id = m.job_id
              JOIN "User" u ON u.id = m.user_id
             WHERE (m.score)::float >= %s
        """
        params: list = [min_score]

        if rubro:
            query += " AND (u.rubro = %s OR j.rubro = %s)"
            params.extend([rubro, rubro])

        if job_id:
            query += " AND m.job_id = %s"
            params.append(job_id)

        if only_pending:
            query += " AND m.status = 'pending'"

        query += " ORDER BY m.score DESC, m.id DESC"
        cur.execute(query, params)
        return _cur_to_dicts(cur)
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/rubros", dependencies=[Depends(get_current_admin)], summary="List available rubros")
def list_rubros():
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT rubro FROM (
                SELECT rubro FROM "User" WHERE rubro IS NOT NULL AND rubro != 'General'
                UNION
                SELECT rubro FROM "Job" WHERE rubro IS NOT NULL AND rubro != 'General'
            ) rubros ORDER BY rubro
        """)
        return [row[0] for row in cur.fetchall()]
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/send-notifications/{job_id}", dependencies=[Depends(get_current_admin)], summary="Admin: send match emails for a job")
def admin_send_notifications(job_id: int):
    """
    Admin manually triggers match notification emails for a specific job.
    Works for both free and paid jobs. Only sends to pending (unsent) matches.
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verify job exists
        cur.execute('SELECT title, is_paid FROM "Job" WHERE id = %s', (job_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Oferta no encontrada")

        job_title, is_paid = row
        sent_count = _send_match_notifications(conn, cur, job_id)

        return {
            "message": f"Se enviaron {sent_count} notificaciones para '{job_title}'",
            "sent": sent_count,
            "job_id": job_id,
            "is_paid": is_paid,
        }
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        logger.exception("Error sending notifications for job %s", job_id)
        raise HTTPException(500, "Error enviando notificaciones")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/resend/{match_id}", dependencies=[Depends(get_current_admin)], summary="Resend match notification")
def resend_matching(match_id: int):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT m.score, m.apply_token, u.name, u.email, j.title
              FROM matches m
              JOIN "User" u ON u.id = m.user_id
              JOIN "Job"  j ON j.id = m.job_id
             WHERE m.id = %s
        """, (match_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Matching no encontrado")

        score, token, user_name, user_email, job_title = row
        if not user_email:
            raise HTTPException(status_code=400, detail="El candidato no tiene email registrado")

        # Generate new token if doesn't have one
        if not token:
            token = str(uuid.uuid4())

        apply_link = f"{FRONTEND_URL}/apply/{token}"
        context = {
            "applicant_name": user_name or "Candidato",
            "job_title": job_title,
            "score": f"{float(score) * 100:.0f}%",
            "apply_link": apply_link,
        }

        send_match_notification(user_email, context)

        cur.execute(
            "UPDATE matches SET apply_token=%s, sent_at=NOW(), status='sent' WHERE id=%s",
            (token, match_id),
        )
        conn.commit()
        return {"message": "Notificacion reenviada exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.rollback()
        logger.exception("Error resending match %s", match_id)
        raise HTTPException(status_code=500, detail="Error interno")
    finally:
        if cur: cur.close()
        if conn: conn.close()
