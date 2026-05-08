# app/routers/reputation.py
"""
Sistema de Reputacion + Favoritos
─────────────────────────────────
Reviews:
  POST   /api/reputation/reviews                – crear resena
  GET    /api/reputation/reviews/{candidate_id}  – resenas de un candidato
  GET    /api/reputation/my-reviews              – resenas que yo (empleador) hice

Favorites:
  POST   /api/reputation/favorites              – agregar favorito
  DELETE /api/reputation/favorites/{candidate_id} – quitar favorito
  GET    /api/reputation/favorites               – listar mis favoritos

Reputation summary (public):
  GET    /api/reputation/summary/{candidate_id}  – promedio, cantidad, badge
"""
from __future__ import annotations

import logging
from typing import List, Optional
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from pydantic import BaseModel, Field

from app.database import get_db_connection
from app.core.auth import SECRET_KEY, ALGORITHM
from app.email_utils import send_match_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reputation", tags=["reputation"])

oauth2_user = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_user)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalido")
        return SimpleNamespace(id=int(sub))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalido")


def _require_employer(user_id: int):
    """Verify the user is an employer."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT role FROM "User" WHERE id = %s', (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row or row[0] != "empleador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo empleadores pueden realizar esta accion")


# ─────────────────── Pydantic models ────────────────────

class ReviewCreate(BaseModel):
    candidate_id: int = Field(..., description="ID del candidato a calificar")
    job_id: Optional[int] = Field(None, description="ID del trabajo relacionado")
    rating: int = Field(..., ge=1, le=5, description="Calificacion 1-5")
    comment: Optional[str] = Field(None, description="Comentario opcional")


class FavoriteCreate(BaseModel):
    candidate_id: int = Field(..., description="ID del candidato a agregar como favorito")


class ReviewOut(BaseModel):
    id: int
    employer_id: int
    employer_name: Optional[str] = None
    candidate_id: int
    candidate_name: Optional[str] = None
    job_id: Optional[int] = None
    job_title: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: Optional[str] = None


class FavoriteOut(BaseModel):
    id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    candidate_rubro: Optional[str] = None
    candidate_picture: Optional[str] = None
    avg_rating: Optional[float] = None
    review_count: int = 0
    created_at: Optional[str] = None


class ReputationSummary(BaseModel):
    candidate_id: int
    avg_rating: Optional[float] = None
    review_count: int = 0
    jobs_completed: int = 0
    badge_verified: bool = False


# ═══════════ REVIEWS ═══════════

@router.post("/reviews", status_code=status.HTTP_201_CREATED, summary="Crear resena sobre un candidato")
def create_review(data: ReviewCreate, current_user=Depends(get_current_user)):
    _require_employer(current_user.id)

    if data.candidate_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes calificarte a ti mismo")

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verify candidate exists and is empleado
        cur.execute('SELECT id FROM "User" WHERE id = %s AND role = %s', (data.candidate_id, "empleado"))
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidato no encontrado")

        # Verify job exists if provided
        if data.job_id:
            cur.execute('SELECT id FROM "Job" WHERE id = %s', (data.job_id,))
            if not cur.fetchone():
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta no encontrada")

        # Insert or update review
        cur.execute("""
            INSERT INTO reviews (employer_id, candidate_id, job_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (employer_id, candidate_id, job_id)
            DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
            RETURNING id
        """, (current_user.id, data.candidate_id, data.job_id, data.rating, data.comment))
        review_id = cur.fetchone()[0]
        conn.commit()

        return {"message": "Resena guardada", "reviewId": review_id}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error creating review: %s", e)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al guardar resena")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/reviews/{candidate_id}", response_model=List[ReviewOut], summary="Resenas de un candidato (publico)")
def get_candidate_reviews(candidate_id: int):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT r.id, r.employer_id, e.name AS employer_name,
                   r.candidate_id, c.name AS candidate_name,
                   r.job_id, j.title AS job_title,
                   r.rating, r.comment, r.created_at
              FROM reviews r
              JOIN "User" e ON e.id = r.employer_id
              JOIN "User" c ON c.id = r.candidate_id
              LEFT JOIN "Job" j ON j.id = r.job_id
             WHERE r.candidate_id = %s
             ORDER BY r.created_at DESC
        """, (candidate_id,))

        cols = [d[0] for d in cur.description]
        reviews = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            reviews.append(d)
        return reviews
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/my-reviews", response_model=List[ReviewOut], summary="Resenas que yo hice")
def get_my_reviews(current_user=Depends(get_current_user)):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT r.id, r.employer_id, e.name AS employer_name,
                   r.candidate_id, c.name AS candidate_name,
                   r.job_id, j.title AS job_title,
                   r.rating, r.comment, r.created_at
              FROM reviews r
              JOIN "User" e ON e.id = r.employer_id
              JOIN "User" c ON c.id = r.candidate_id
              LEFT JOIN "Job" j ON j.id = r.job_id
             WHERE r.employer_id = %s
             ORDER BY r.created_at DESC
        """, (current_user.id,))

        cols = [d[0] for d in cur.description]
        reviews = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            reviews.append(d)
        return reviews
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ FAVORITES ═══════════

@router.post("/favorites", status_code=status.HTTP_201_CREATED, summary="Agregar candidato a favoritos")
def add_favorite(data: FavoriteCreate, current_user=Depends(get_current_user)):
    _require_employer(current_user.id)

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute('SELECT id FROM "User" WHERE id = %s AND role = %s', (data.candidate_id, "empleado"))
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidato no encontrado")

        cur.execute("""
            INSERT INTO favorites (employer_id, candidate_id)
            VALUES (%s, %s)
            ON CONFLICT (employer_id, candidate_id) DO NOTHING
            RETURNING id
        """, (current_user.id, data.candidate_id))
        row = cur.fetchone()
        conn.commit()

        return {"message": "Favorito agregado", "favoriteId": row[0] if row else None}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error adding favorite: %s", e)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al agregar favorito")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.delete("/favorites/{candidate_id}", summary="Quitar candidato de favoritos")
def remove_favorite(candidate_id: int, current_user=Depends(get_current_user)):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM favorites WHERE employer_id = %s AND candidate_id = %s",
            (current_user.id, candidate_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Favorito no encontrado")
        conn.commit()
        return {"message": "Favorito eliminado"}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error removing favorite: %s", e)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al eliminar favorito")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/favorites", response_model=List[FavoriteOut], summary="Listar mis favoritos")
def list_favorites(current_user=Depends(get_current_user)):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT f.id, f.candidate_id,
                   c.name AS candidate_name,
                   c.rubro AS candidate_rubro,
                   c."profilePicture" AS candidate_picture,
                   ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
                   COUNT(r.id)::int AS review_count,
                   f.created_at
              FROM favorites f
              JOIN "User" c ON c.id = f.candidate_id
              LEFT JOIN reviews r ON r.candidate_id = f.candidate_id
             WHERE f.employer_id = %s
             GROUP BY f.id, f.candidate_id, c.name, c.rubro, c."profilePicture", f.created_at
             ORDER BY f.created_at DESC
        """, (current_user.id,))

        cols = [d[0] for d in cur.description]
        favorites = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            if d.get("avg_rating"):
                d["avg_rating"] = float(d["avg_rating"])
            favorites.append(d)
        return favorites
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/is-favorite/{candidate_id}", summary="Verificar si un candidato es favorito")
def is_favorite(candidate_id: int, current_user=Depends(get_current_user)):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM favorites WHERE employer_id = %s AND candidate_id = %s",
            (current_user.id, candidate_id),
        )
        return {"isFavorite": cur.fetchone() is not None}
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ REPUTATION SUMMARY ═══════════

@router.get("/summary/{candidate_id}", response_model=ReputationSummary, summary="Resumen de reputacion (publico)")
def get_reputation_summary(candidate_id: int):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Average rating and count
        cur.execute("""
            SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)::int
              FROM reviews
             WHERE candidate_id = %s
        """, (candidate_id,))
        avg_rating, review_count = cur.fetchone()

        # Jobs completed (proposals with status 'accepted')
        cur.execute("""
            SELECT COUNT(DISTINCT job_id)::int
              FROM proposals
             WHERE applicant_id = %s AND status = 'accepted'
        """, (candidate_id,))
        jobs_completed = cur.fetchone()[0]

        # Badge: 5+ reviews with avg >= 4.0
        positive_reviews = 0
        if review_count > 0:
            cur.execute("""
                SELECT COUNT(*)::int FROM reviews
                 WHERE candidate_id = %s AND rating >= 4
            """, (candidate_id,))
            positive_reviews = cur.fetchone()[0]

        badge_verified = positive_reviews >= 5

        return {
            "candidate_id": candidate_id,
            "avg_rating": float(avg_rating) if avg_rating else None,
            "review_count": review_count,
            "jobs_completed": jobs_completed,
            "badge_verified": badge_verified,
        }
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ REPEAT OFFER TO FAVORITES ═══════════

class RepeatOfferRequest(BaseModel):
    job_id: int = Field(..., description="ID de la oferta a repetir")
    rubro: Optional[str] = Field(None, description="Filtrar favoritos por rubro (opcional)")


@router.post("/repeat-to-favorites", summary="Repetir oferta a mis favoritos")
def repeat_offer_to_favorites(data: RepeatOfferRequest, current_user=Depends(get_current_user)):
    """
    Crea una copia de la oferta y envia notificaciones
    solo a los candidatos favoritos del empleador.
    """
    import os
    import uuid
    import threading
    from app.routers.match import run_matching_for_job

    _require_employer(current_user.id)

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get original job
        cur.execute("""
            SELECT title, description, requirements, embedding, rubro, source,
                   label, is_paid
              FROM "Job"
             WHERE id = %s AND "userId" = %s
        """, (data.job_id, current_user.id))
        job = cur.fetchone()
        if not job:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta no encontrada o no te pertenece")

        title, description, requirements, embedding, rubro, source, label, is_paid = job

        # Duplicate the job
        cur.execute("""
            INSERT INTO "Job" (title, description, requirements, embedding, rubro,
                               "userId", source, label, is_paid)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (title, description, requirements, embedding, rubro,
              current_user.id, source or "employer", label or "automatic", is_paid))
        new_job_id = cur.fetchone()[0]
        conn.commit()

        # Get favorites (optionally filtered by rubro)
        fav_query = """
            SELECT c.id, c.name, c.email
              FROM favorites f
              JOIN "User" c ON c.id = f.candidate_id
             WHERE f.employer_id = %s
               AND c.confirmed = TRUE
               AND COALESCE(c.active, TRUE) = TRUE
        """
        fav_params = [current_user.id]
        if data.rubro:
            fav_query += " AND c.rubro = %s"
            fav_params.append(data.rubro)

        cur.execute(fav_query, fav_params)
        favorites = cur.fetchall()

        if not favorites:
            return {
                "message": "Oferta duplicada pero no tienes favoritos para notificar",
                "jobId": new_job_id,
                "notified": 0,
            }

        # Send notifications to favorites
        frontend_url = os.getenv("FRONTEND_URL", "https://fapmendoza.com").rstrip("/")
        backend_url = os.getenv("BACKEND_URL", "https://api.fapmendoza.online")
        sent_count = 0

        for user_id, user_name, user_email in favorites:
            if not user_email:
                continue

            apply_token = str(uuid.uuid4())
            apply_link = f"{frontend_url}/apply/{apply_token}"

            # Insert match record
            cur.execute("""
                INSERT INTO matches (job_id, user_id, score, status, apply_token, sent_at)
                VALUES (%s, %s, 1.0, 'sent', %s, NOW())
            """, (new_job_id, user_id, apply_token))

            # Insert apply token
            cur.execute("""
                INSERT INTO apply_tokens (token, job_id, applicant_id, expires_at, used)
                VALUES (%s, %s, %s, NOW() + INTERVAL '30 days', FALSE)
                ON CONFLICT(token) DO NOTHING
            """, (apply_token, new_job_id, user_id))

            context = {
                "applicant_name": user_name or "Candidato",
                "job_title": title,
                "score": "Favorito",
                "apply_link": apply_link,
                "unsubscribe_link": f"{backend_url}/api/users/unsubscribe/{user_id}",
            }

            try:
                send_match_notification(user_email, context)
                sent_count += 1
            except Exception as e:
                logger.error("Error notifying favorite %s: %s", user_id, e)

        conn.commit()

        # Run matching in background for non-favorite candidates too
        threading.Thread(target=run_matching_for_job, args=(new_job_id,), daemon=True).start()

        return {
            "message": f"Oferta repetida y enviada a {sent_count} favoritos",
            "jobId": new_job_id,
            "notified": sent_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error repeating offer to favorites: %s", e)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Error al repetir oferta")
    finally:
        if cur: cur.close()
        if conn: conn.close()
