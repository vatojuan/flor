# app/routers/match.py
"""
Matching logic between candidates and job offers.

Uses pgvector cosine similarity with rubro-based pre-filtering
and dynamic threshold for better precision.
"""
from __future__ import annotations

import os
import uuid
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel

from app.database import get_db_connection
from app.core.auth import SECRET_KEY, ALGORITHM
from app.email_utils import send_match_notification, send_admin_alert

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://fapmendoza.com").rstrip("/")
# Minimum score to consider a match (0-1 scale)
MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.75"))
# Bonus applied when rubro matches exactly
RUBRO_BONUS: float = 0.05
# Only notify matches above this score
NOTIFY_THRESHOLD: float = float(os.getenv("NOTIFY_THRESHOLD", "0.78"))

oauth2_admin = OAuth2PasswordBearer(tokenUrl="/auth/admin-login")
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/match", tags=["matchings"])


# ─────────────────── Response models ────────────────────

class MatchJobInfo(BaseModel):
    id: int
    title: str
    rubro: str | None = None

class MatchUserInfo(BaseModel):
    id: int
    email: str | None = None
    name: str | None = None
    rubro: str | None = None

class MatchItem(BaseModel):
    """Un match entre candidato y oferta."""
    id: int
    score: float
    sent_at: str | None = None
    status: str | None = None
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
    """Calculate and notify matches for a new job offer."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get job embedding and rubro
        cur.execute(
            'SELECT embedding, rubro FROM "Job" WHERE id = %s AND embedding IS NOT NULL',
            (job_id,),
        )
        row = cur.fetchone()
        if not row:
            logger.info("Matching skipped: Job %s has no embedding", job_id)
            return
        job_embedding, job_rubro = row

        # Clear previous matches for this job
        cur.execute("DELETE FROM matches WHERE job_id = %s", (job_id,))

        # Insert matches with combined score:
        # Base: cosine similarity between user embedding and job embedding
        # Bonus: +0.05 if rubro matches exactly
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
        """, (job_id, job_embedding, job_rubro, RUBRO_BONUS))
        conn.commit()
        logger.info("Inserted %d matches for job %s", cur.rowcount, job_id)

        # Notify matches above threshold, ordered by score
        cur.execute("""
            SELECT m.id, m.score, u.name, u.email, j.title
              FROM matches m
              JOIN "User" u ON u.id = m.user_id
              JOIN "Job"  j ON j.id = m.job_id
             WHERE m.job_id = %s AND (m.score)::float >= %s
             ORDER BY m.score DESC
        """, (job_id, NOTIFY_THRESHOLD))

        matches_to_notify = cur.fetchall()
        logger.info("Notifying %d matches (score >= %.0f%%)", len(matches_to_notify), NOTIFY_THRESHOLD * 100)

        for match_id, score, user_name, user_email, job_title in matches_to_notify:
            if not user_email:
                continue

            apply_token = str(uuid.uuid4())
            apply_link = f"{FRONTEND_URL}/apply/{apply_token}"

            context = {
                "applicant_name": user_name or "Candidato",
                "job_title": job_title,
                "score": f"{float(score) * 100:.0f}%",
                "apply_link": apply_link,
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
            except Exception as e:
                logger.error("Error notifying match %s: %s", match_id, e)
                cur.execute(
                    "UPDATE matches SET status='error', error_msg=%s WHERE id=%s",
                    (str(e)[:250], match_id),
                )
                conn.commit()

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


# ═══════════ Matching: New User Registered ═══════════

def run_matching_for_user(user_id: int) -> None:
    """Pre-calculate match scores for a new user against all jobs."""
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
    rubro: str = Query(None, description="Filter by rubro"),
):
    """List matches sorted by score (highest first)."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT m.id, m.score, m.sent_at, m.status,
                   json_build_object('id', j.id, 'title', j.title, 'rubro', j.rubro) AS job,
                   json_build_object('id', u.id, 'email', u.email, 'name', u.name, 'rubro', u.rubro) AS "user"
              FROM matches m
              JOIN "Job"  j ON j.id = m.job_id
              JOIN "User" u ON u.id = m.user_id
             WHERE (m.score)::float >= %s
        """
        params = [min_score]

        if rubro:
            query += ' AND (u.rubro = %s OR j.rubro = %s)'
            params.extend([rubro, rubro])

        query += " ORDER BY m.score DESC, m.id DESC"
        cur.execute(query, params)
        return _cur_to_dicts(cur)
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/rubros", dependencies=[Depends(get_current_admin)], summary="List available rubros")
def list_rubros():
    """Get all rubros from users and jobs for filtering."""
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
        if not token:
            raise HTTPException(status_code=400, detail="Este match no tiene token de aplicacion")

        apply_link = f"{FRONTEND_URL}/apply/{token}"
        context = {
            "applicant_name": user_name or "Candidato",
            "job_title": job_title,
            "score": f"{float(score) * 100:.0f}%",
            "apply_link": apply_link,
        }

        send_match_notification(user_email, context)

        cur.execute("UPDATE matches SET sent_at=NOW(), status='resent' WHERE id=%s", (match_id,))
        conn.commit()
        return {"message": "Notificacion de matching reenviada exitosamente."}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error resending match %s", match_id)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        if cur: cur.close()
        if conn: conn.close()
