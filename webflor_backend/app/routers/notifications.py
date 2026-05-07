# app/routers/notifications.py
"""
Virtual notifications for the admin panel.

Instead of a dedicated notifications table, we generate notifications
on-the-fly by querying existing tables:
  - service_requests with status='paid'  (new paid search requests)
  - User with role='empleado' created in last 7 days (new candidates)
  - matches with score >= 0.85 (high-quality matches)

Read-status is tracked client-side (localStorage).
"""
import logging
from fastapi import APIRouter, Depends
from app.database import get_db_connection
from app.utils.auth_utils import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", dependencies=[Depends(get_current_admin)])
def get_notifications():
    """
    Return recent notifications generated from existing data.
    Each has: id, type, message, date, extra metadata.
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            (
                SELECT
                    'sr-' || request_id AS id,
                    'service_request' AS type,
                    'Nueva solicitud de búsqueda: ' || position || ' — ' || company_name AS message,
                    created_at AS date
                FROM service_requests
                WHERE status = 'paid'
                ORDER BY created_at DESC
                LIMIT 20
            )
            UNION ALL
            (
                SELECT
                    'user-' || id AS id,
                    'new_candidate' AS type,
                    'Nuevo candidato: ' || COALESCE(name, email) || ' (' || COALESCE(rubro, 'Sin rubro') || ')' AS message,
                    created_at AS date
                FROM "User"
                WHERE role = 'empleado'
                  AND created_at >= NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 20
            )
            UNION ALL
            (
                SELECT
                    'match-' || m.id AS id,
                    'high_match' AS type,
                    'Match alto: ' || COALESCE(u.name, u.email) || ' ↔ ' || j.title
                        || ' (' || ROUND((m.score * 100)::numeric, 0) || '%)' AS message,
                    m.sent_at AS date
                FROM matches m
                JOIN "User" u ON u.id = m.user_id
                JOIN "Job"  j ON j.id = m.job_id
                WHERE (m.score)::float >= 0.85
                ORDER BY m.sent_at DESC NULLS LAST
                LIMIT 20
            )
            ORDER BY date DESC NULLS LAST
            LIMIT 30
        """)

        cols = [c[0] for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        # Serialize dates to ISO strings
        for row in rows:
            if row.get("date"):
                row["date"] = row["date"].isoformat()

        return rows

    except Exception as e:
        logger.error("Error fetching notifications: %s", e)
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/unread-count", dependencies=[Depends(get_current_admin)])
def get_unread_count():
    """
    Return total count of notification items.
    Actual read-tracking is done on the frontend via localStorage,
    so this returns the total count of recent notifications.
    The frontend subtracts the ones already marked as read.
    """
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM service_requests WHERE status = 'paid')
              + (SELECT COUNT(*) FROM "User"
                  WHERE role = 'empleado' AND created_at >= NOW() - INTERVAL '7 days')
              + (SELECT COUNT(*) FROM matches WHERE (score)::float >= 0.85)
            AS total
        """)
        row = cur.fetchone()
        return {"total": row[0] if row else 0}

    except Exception as e:
        logger.error("Error fetching notification count: %s", e)
        return {"total": 0}
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.patch("/{notification_id}/read", dependencies=[Depends(get_current_admin)])
def mark_as_read(notification_id: str):
    """
    No-op on the backend — read status is tracked in localStorage.
    This endpoint exists so the frontend has a standard REST interface
    and can be upgraded to server-side tracking later.
    """
    return {"id": notification_id, "read": True}
