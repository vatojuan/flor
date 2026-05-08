import logging
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db_connection
from app.models.user import User
from pydantic import BaseModel
import requests  # Para conectar con Supabase
from app.routers.match import run_matching_for_user  # <-- Importamos la función

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
)

# Supabase Config
SUPABASE_URL = "https://apnfioxjddccokgkljvd.supabase.co"
SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbmZpb3hqZGRjY29rZ2tsanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MzYxMTMsImV4cCI6MjA1NjExMjExM30.dXasbL1EJi_yefvOlEA7UA6MYMjXw7jFYKjWTMjBNHI"

# Pydantic models
class UserUpdate(BaseModel):
    description: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str = None
    description: str = None
    is_active: bool

    class Config:
        orm_mode = True

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependencia ficticia que obtiene al usuario logueado
def get_current_user():
    """
    Aquí debes usar tu propia lógica para obtener el usuario autenticado,
    p. ej. leyendo el token JWT y cargando el User correspondiente.
    """
    raise NotImplementedError("Implementar autenticación")

@router.get("/{user_id}/public-profile")
async def get_public_profile(user_id: int):
    """
    Devuelve información pública de un candidato (empleado),
    incluyendo resumen de reputación y reseñas recientes.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'SELECT id, name, rubro, description, phone, "profilePicture", "cvUrl" '
            'FROM "User" WHERE id = %s AND role = %s',
            (user_id, "empleado"),
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            raise HTTPException(404, "Candidato no encontrado")

        profile = {
            "id": row[0],
            "name": row[1],
            "rubro": row[2],
            "description": row[3],
            "phone": row[4],
            "profilePicture": row[5],
            "cvUrl": row[6],
        }

        # Reputation summary
        cur.execute("""
            SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)::int
              FROM reviews WHERE candidate_id = %s
        """, (user_id,))
        avg_rating, review_count = cur.fetchone()

        cur.execute("""
            SELECT COUNT(*)::int FROM reviews
             WHERE candidate_id = %s AND rating >= 4
        """, (user_id,))
        positive_reviews = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT job_id)::int FROM proposals
             WHERE applicant_id = %s AND status = 'accepted'
        """, (user_id,))
        jobs_completed = cur.fetchone()[0]

        profile["reputation"] = {
            "avgRating": float(avg_rating) if avg_rating else None,
            "reviewCount": review_count,
            "jobsCompleted": jobs_completed,
            "badgeVerified": positive_reviews >= 5,
        }

        # Recent reviews (last 10)
        cur.execute("""
            SELECT r.id, r.rating, r.comment, r.created_at,
                   e.name AS employer_name, j.title AS job_title
              FROM reviews r
              JOIN "User" e ON e.id = r.employer_id
              LEFT JOIN "Job" j ON j.id = r.job_id
             WHERE r.candidate_id = %s
             ORDER BY r.created_at DESC
             LIMIT 10
        """, (user_id,))
        cols = [d[0] for d in cur.description]
        reviews = []
        for r in cur.fetchall():
            d = dict(zip(cols, r))
            if d.get("created_at"):
                d["created_at"] = d["created_at"].isoformat()
            reviews.append(d)
        profile["reviews"] = reviews

        cur.close()
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error obteniendo perfil público del usuario %d: %s", user_id, e)
        raise HTTPException(500, "Error interno al obtener el perfil público")
    finally:
        if conn:
            conn.close()


@router.patch("/toggle-active")
def toggle_active(request: Request, db: Session = Depends(get_db)):
    """Toggle the active/searching status of the authenticated user."""
    from app.utils.auth_utils import get_current_active_user
    from fastapi import Depends as _Dep
    # Simple token extraction
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Token requerido")
    token = auth.replace("Bearer ", "")
    from app.utils.auth_utils import get_current_user_from_token
    user = get_current_user_from_token(token)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT COALESCE(active, TRUE) FROM "User" WHERE id = %s', (user.id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(404, "Usuario no encontrado")

    new_active = not row[0]
    cur.execute('UPDATE "User" SET active = %s WHERE id = %s', (new_active, user.id))
    conn.commit()
    cur.close()
    conn.close()
    return {"active": new_active, "message": "Perfil activado" if new_active else "Perfil pausado — no recibiras mas emails de ofertas"}


@router.get("/unsubscribe/{user_id}")
def unsubscribe(user_id: int, token: str = None):
    """
    Public one-click unsubscribe link (included in match notification emails).
    Sets the user as inactive without requiring login.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('UPDATE "User" SET active = FALSE WHERE id = %s AND role = %s', (user_id, "empleado"))
    if cur.rowcount == 0:
        cur.close(); conn.close()
        raise HTTPException(404, "Usuario no encontrado")
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Te has dado de baja de las notificaciones de ofertas. Podes reactivar tu perfil desde tu cuenta en cualquier momento."}


@router.put("/me", response_model=UserOut)
async def update_my_profile(
    request: Request,
    background_tasks: BackgroundTasks,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualiza la descripción del usuario autenticado y luego dispara
    en segundo plano el recalculo de sus matchings.
    """
    user_id = current_user.id
    new_description = user_update.description.strip()

    if not new_description:
        raise HTTPException(400, "La descripción no puede estar vacía")

    try:
        # 1) Actualizar la descripción en la base de datos
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(404, "Usuario no encontrado")

        db_user.description = new_description
        db.commit()

        # 2) Disparar en segundo plano el recálculo de matchings
        background_tasks.add_task(run_matching_for_user, user_id)

        return db_user

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.exception("Error actualizando perfil usuario %d: %s", user_id, e)
        raise HTTPException(500, f"Error interno actualizando perfil: {e}")
