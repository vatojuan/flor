"""
Tools available to the Admin AI Agent.

Each function performs a database operation and returns a dict
that GPT-4 can use to formulate a response.
"""
import logging
import os
from typing import Optional
from app.database import get_db_connection

logger = logging.getLogger(__name__)


def search_candidates(
    rubro: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Search candidates in the database by rubro and/or keyword in name/description."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        conditions = ['u.role = %s', 'u.confirmed = TRUE', 'COALESCE(u.active, TRUE) = TRUE']
        params = ['empleado']

        if rubro:
            conditions.append('u.rubro ILIKE %s')
            params.append(f'%{rubro}%')

        if keyword:
            conditions.append('(u.name ILIKE %s OR u.description ILIKE %s OR u.email ILIKE %s)')
            params.extend([f'%{keyword}%', f'%{keyword}%', f'%{keyword}%'])

        where = ' AND '.join(conditions)
        params.append(limit)

        cur.execute(f"""
            SELECT u.id, u.name, u.email, u.phone, u.rubro, u.description,
                   u."cvUrl"
              FROM "User" u
             WHERE {where}
             ORDER BY u.name ASC
             LIMIT %s
        """, params)

        cols = [c[0] for c in cur.description]
        users = [dict(zip(cols, row)) for row in cur.fetchall()]

        return {"count": len(users), "candidates": users}
    except Exception as e:
        logger.error("search_candidates error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def search_jobs(
    rubro: Optional[str] = None,
    keyword: Optional[str] = None,
    active_only: bool = True,
    limit: int = 20,
) -> dict:
    """Search job offers by rubro and/or keyword."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        conditions = []
        params = []

        if active_only:
            conditions.append('(j."expirationDate" IS NULL OR j."expirationDate" > NOW())')

        if rubro:
            conditions.append('j.rubro ILIKE %s')
            params.append(f'%{rubro}%')

        if keyword:
            conditions.append('(j.title ILIKE %s OR j.description ILIKE %s)')
            params.extend([f'%{keyword}%', f'%{keyword}%'])

        where = ' AND '.join(conditions) if conditions else 'TRUE'
        params.append(limit)

        cur.execute(f"""
            SELECT j.id, j.title, j.description, j.requirements, j.rubro,
                   j."expirationDate", j.label, j.source,
                   (SELECT COUNT(*) FROM "Application" a WHERE a."jobId" = j.id) as candidates
              FROM "Job" j
             WHERE {where}
             ORDER BY j.id DESC
             LIMIT %s
        """, params)

        cols = [c[0] for c in cur.description]
        jobs = [dict(zip(cols, row)) for row in cur.fetchall()]

        return {"count": len(jobs), "jobs": jobs}
    except Exception as e:
        logger.error("search_jobs error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def get_matching_candidates(job_id: int, min_score: float = 0.70, limit: int = 20) -> dict:
    """Get candidates that match a specific job offer, sorted by score."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT m.score, u.id, u.name, u.email, u.phone, u.rubro, u.description
              FROM matches m
              JOIN "User" u ON u.id = m.user_id
             WHERE m.job_id = %s AND (m.score)::float >= %s
             ORDER BY m.score DESC
             LIMIT %s
        """, (job_id, min_score, limit))

        cols = [c[0] for c in cur.description]
        matches = [dict(zip(cols, row)) for row in cur.fetchall()]

        return {"job_id": job_id, "count": len(matches), "matches": matches}
    except Exception as e:
        logger.error("get_matching_candidates error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def get_candidates_for_mailing(
    rubro: Optional[str] = None,
    keyword: Optional[str] = None,
) -> dict:
    """Get a list of candidate emails for bulk mailing, filtered by rubro/keyword."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        conditions = ['u.role = %s', 'u.confirmed = TRUE', 'u.email IS NOT NULL']
        params = ['empleado']

        if rubro:
            conditions.append('u.rubro ILIKE %s')
            params.append(f'%{rubro}%')

        if keyword:
            conditions.append('(u.name ILIKE %s OR u.description ILIKE %s)')
            params.extend([f'%{keyword}%', f'%{keyword}%'])

        where = ' AND '.join(conditions)

        cur.execute(f"""
            SELECT u.id, u.name, u.email, u.rubro
              FROM "User" u
             WHERE {where}
             ORDER BY u.rubro, u.name
        """, params)

        cols = [c[0] for c in cur.description]
        recipients = [dict(zip(cols, row)) for row in cur.fetchall()]

        return {
            "count": len(recipients),
            "recipients": recipients,
            "rubros": list(set(r["rubro"] for r in recipients if r.get("rubro"))),
        }
    except Exception as e:
        logger.error("get_candidates_for_mailing error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def get_platform_stats() -> dict:
    """Get overview statistics of the platform."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        stats = {}

        cur.execute('SELECT COUNT(*) FROM "User" WHERE role = %s AND confirmed = TRUE', ('empleado',))
        stats["total_candidates"] = cur.fetchone()[0]

        cur.execute('SELECT COUNT(*) FROM "User" WHERE role = %s', ('empleador',))
        stats["total_employers"] = cur.fetchone()[0]

        cur.execute('SELECT COUNT(*) FROM "Job"')
        stats["total_jobs"] = cur.fetchone()[0]

        cur.execute('SELECT COUNT(*) FROM "Job" WHERE "expirationDate" IS NULL OR "expirationDate" > NOW()')
        stats["active_jobs"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM matches WHERE (score)::float >= 0.75")
        stats["total_matches"] = cur.fetchone()[0]

        cur.execute("""
            SELECT rubro, COUNT(*) as count
              FROM "User"
             WHERE role = 'empleado' AND rubro IS NOT NULL AND rubro != 'General'
             GROUP BY rubro
             ORDER BY count DESC
             LIMIT 10
        """)
        stats["top_rubros"] = [{"rubro": r[0], "count": r[1]} for r in cur.fetchall()]

        return stats
    except Exception as e:
        logger.error("get_platform_stats error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def send_bulk_email_to_group(
    recipient_ids: list[int],
    subject: str,
    body: str,
) -> dict:
    """Queue bulk emails to a list of user IDs."""
    from app.email_utils import send_email

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        placeholders = ','.join(['%s'] * len(recipient_ids))
        cur.execute(f'SELECT id, email, name FROM "User" WHERE id IN ({placeholders})', recipient_ids)
        recipients = cur.fetchall()

        sent = 0
        errors = 0
        for user_id, email, name in recipients:
            try:
                personalized_body = body.replace("{nombre}", name or "Candidato")
                send_email(email, subject, personalized_body)
                sent += 1
            except Exception as e:
                logger.error("Failed to send to %s: %s", email, e)
                errors += 1

        return {"sent": sent, "errors": errors, "total": len(recipients)}
    except Exception as e:
        logger.error("send_bulk_email error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def create_mailing_group(
    name: str,
    rubro: Optional[str] = None,
    keyword: Optional[str] = None,
) -> dict:
    """Create a saved mailing group based on filters."""
    import json
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        filters = {}
        if rubro: filters["rubro"] = rubro
        if keyword: filters["keyword"] = keyword

        # Resolve members
        conditions = ["u.role = 'empleado'", "u.confirmed = TRUE", "u.email IS NOT NULL", "COALESCE(u.active, TRUE) = TRUE"]
        params = []
        if rubro:
            conditions.append("u.rubro ILIKE %s"); params.append(f"%{rubro}%")
        if keyword:
            conditions.append("(u.name ILIKE %s OR u.description ILIKE %s)"); params.extend([f"%{keyword}%", f"%{keyword}%"])

        where = " AND ".join(conditions)
        cur.execute(f'SELECT u.id FROM "User" u WHERE {where}', params)
        member_ids = [row[0] for row in cur.fetchall()]

        cur.execute("""
            INSERT INTO mailing_groups (name, description, filters, member_ids, created_at)
            VALUES (%s, %s, %s, %s, NOW()) RETURNING id
        """, (name, f"Creado por FAPY — {rubro or ''} {keyword or ''}".strip(), json.dumps(filters) if filters else None, member_ids))

        group_id = cur.fetchone()[0]
        conn.commit()

        return {"group_id": group_id, "name": name, "members": len(member_ids), "message": f"Grupo '{name}' creado con {len(member_ids)} miembros. Lo podes ver en la seccion Mailing > Grupos."}
    except Exception as e:
        logger.error("create_mailing_group error: %s", e)
        return {"error": str(e)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


# OpenAI function definitions for the agent
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_candidates",
            "description": "Buscar candidatos/empleados en la base de datos. Puede filtrar por rubro profesional (ej: Gastronomia, IT/Sistemas) y/o palabra clave en nombre, descripcion o email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "rubro": {"type": "string", "description": "Rubro profesional para filtrar (ej: Gastronomia, Seguridad, IT/Sistemas)"},
                    "keyword": {"type": "string", "description": "Palabra clave para buscar en nombre, descripcion o email"},
                    "limit": {"type": "integer", "description": "Cantidad maxima de resultados", "default": 20},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_jobs",
            "description": "Buscar ofertas de trabajo. Puede filtrar por rubro y/o palabra clave en titulo o descripcion.",
            "parameters": {
                "type": "object",
                "properties": {
                    "rubro": {"type": "string", "description": "Rubro de la oferta"},
                    "keyword": {"type": "string", "description": "Palabra clave en titulo o descripcion"},
                    "active_only": {"type": "boolean", "description": "Solo ofertas vigentes", "default": True},
                    "limit": {"type": "integer", "default": 20},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_matching_candidates",
            "description": "Obtener candidatos que hacen match con una oferta especifica, ordenados por score de compatibilidad.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {"type": "integer", "description": "ID de la oferta de trabajo"},
                    "min_score": {"type": "number", "description": "Score minimo (0-1)", "default": 0.70},
                    "limit": {"type": "integer", "default": 20},
                },
                "required": ["job_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_candidates_for_mailing",
            "description": "Obtener lista de candidatos con sus emails para envio masivo, filtrados por rubro y/o palabra clave. Util para armar grupos de envio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "rubro": {"type": "string", "description": "Filtrar por rubro"},
                    "keyword": {"type": "string", "description": "Filtrar por palabra clave"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_platform_stats",
            "description": "Obtener estadisticas generales de la plataforma: total de candidatos, empleadores, ofertas, matches, y rubros mas populares.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_bulk_email_to_group",
            "description": "Enviar email masivo a un grupo de candidatos por sus IDs. El cuerpo puede incluir {nombre} para personalizacion. USAR SOLO CUANDO EL ADMIN LO PIDE EXPLICITAMENTE.",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Lista de IDs de usuarios destinatarios",
                    },
                    "subject": {"type": "string", "description": "Asunto del email"},
                    "body": {"type": "string", "description": "Cuerpo HTML del email. Puede usar {nombre} para personalizar."},
                },
                "required": ["recipient_ids", "subject", "body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_mailing_group",
            "description": "Crear un grupo de mailing guardado para enviar emails despues. Los grupos quedan guardados en la seccion Mailing del admin. Ejemplo: crear grupo 'Mozos Mendoza' filtrando por rubro Gastronomia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nombre del grupo (ej: 'Mozos Mendoza', 'IT seniors')"},
                    "rubro": {"type": "string", "description": "Filtrar por rubro profesional"},
                    "keyword": {"type": "string", "description": "Filtrar por palabra clave"},
                },
                "required": ["name"],
            },
        },
    },
]

# Map function names to implementations
TOOL_FUNCTIONS = {
    "search_candidates": search_candidates,
    "search_jobs": search_jobs,
    "get_matching_candidates": get_matching_candidates,
    "get_candidates_for_mailing": get_candidates_for_mailing,
    "get_platform_stats": get_platform_stats,
    "send_bulk_email_to_group": send_bulk_email_to_group,
    "create_mailing_group": create_mailing_group,
}
