# app/routers/mailing.py
"""
Unified mailing system — contacts, groups, and sending.

Groups can be created manually, by filters, or by FAPY agent.
Contacts come from the User table (candidates) unified view.
"""
import logging
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from app.database import get_db_connection
from app.utils.auth_utils import get_current_admin
from app.email_utils import send_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mailing", tags=["mailing"])


# ═══════════ Models ═══════════

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filters: Optional[dict] = None  # {"rubro": "Gastronomia", "keyword": "mozo"}
    member_ids: Optional[list[int]] = None  # explicit user IDs


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[dict] = None
    member_ids: Optional[list[int]] = None


class MailingRequest(BaseModel):
    subject: str
    body: str
    group_id: Optional[int] = None
    recipient_ids: Optional[list[int]] = None
    segment: Optional[dict] = None  # {"rubro": "...", "keyword": "..."}


class PreviewRequest(BaseModel):
    rubro: Optional[str] = None
    keyword: Optional[str] = None


# ═══════════ Contacts (unified from User table) ═══════════

@router.get("/contacts", dependencies=[Depends(get_current_admin)])
def list_contacts(
    rubro: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """List all candidates as mailing contacts."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        conditions = ["u.role = 'empleado'", "u.confirmed = TRUE", "u.email IS NOT NULL", "COALESCE(u.active, TRUE) = TRUE"]
        params = []

        if rubro:
            conditions.append("u.rubro ILIKE %s")
            params.append(f"%{rubro}%")
        if keyword:
            conditions.append("(u.name ILIKE %s OR u.description ILIKE %s OR u.email ILIKE %s)")
            params.extend([f"%{keyword}%"] * 3)

        where = " AND ".join(conditions)
        offset = (page - 1) * per_page

        # Count
        cur.execute(f'SELECT COUNT(*) FROM "User" u WHERE {where}', params)
        total = cur.fetchone()[0]

        # Fetch
        cur.execute(f"""
            SELECT u.id, u.name, u.email, u.phone, u.rubro
              FROM "User" u
             WHERE {where}
             ORDER BY u.rubro, u.name
             LIMIT %s OFFSET %s
        """, params + [per_page, offset])

        cols = [c[0] for c in cur.description]
        contacts = [dict(zip(cols, row)) for row in cur.fetchall()]

        return {"total": total, "page": page, "per_page": per_page, "contacts": contacts}
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ Groups ═══════════

@router.get("/groups", dependencies=[Depends(get_current_admin)])
def list_groups():
    """List all saved mailing groups."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, description, filters, member_ids, created_at,
                   (SELECT COUNT(*) FROM "User" u WHERE u.id = ANY(mg.member_ids) AND u.email IS NOT NULL) as member_count
              FROM mailing_groups mg
             ORDER BY created_at DESC
        """)
        cols = [c[0] for c in cur.description]
        groups = []
        for row in cur.fetchall():
            g = dict(zip(cols, row))
            if isinstance(g.get("filters"), str):
                g["filters"] = json.loads(g["filters"])
            groups.append(g)
        return groups
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/groups", dependencies=[Depends(get_current_admin)])
def create_group(req: GroupCreate):
    """Create a mailing group. Can be filter-based or explicit member list."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        member_ids = req.member_ids or []

        # If filters provided, resolve them to member IDs
        if req.filters and not member_ids:
            member_ids = _resolve_filters(cur, req.filters)

        cur.execute("""
            INSERT INTO mailing_groups (name, description, filters, member_ids, created_at)
            VALUES (%s, %s, %s, %s, NOW()) RETURNING id
        """, (req.name, req.description, json.dumps(req.filters) if req.filters else None, member_ids))

        group_id = cur.fetchone()[0]
        conn.commit()

        return {"id": group_id, "name": req.name, "members": len(member_ids)}
    except Exception as e:
        logger.error("Error creating group: %s", e)
        raise HTTPException(500, "Error creando grupo")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.put("/groups/{group_id}", dependencies=[Depends(get_current_admin)])
def update_group(group_id: int, req: GroupUpdate):
    """Update a mailing group."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        updates = []
        params = []
        if req.name is not None:
            updates.append("name = %s"); params.append(req.name)
        if req.description is not None:
            updates.append("description = %s"); params.append(req.description)
        if req.filters is not None:
            updates.append("filters = %s"); params.append(json.dumps(req.filters))
        if req.member_ids is not None:
            updates.append("member_ids = %s"); params.append(req.member_ids)

        if not updates:
            raise HTTPException(400, "Nada que actualizar")

        params.append(group_id)
        cur.execute(f"UPDATE mailing_groups SET {', '.join(updates)} WHERE id = %s", params)
        if cur.rowcount == 0:
            raise HTTPException(404, "Grupo no encontrado")
        conn.commit()
        return {"message": "Grupo actualizado"}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.delete("/groups/{group_id}", dependencies=[Depends(get_current_admin)])
def delete_group(group_id: int):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM mailing_groups WHERE id = %s", (group_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Grupo no encontrado")
        conn.commit()
        return {"message": "Grupo eliminado"}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/groups/{group_id}/members", dependencies=[Depends(get_current_admin)])
def get_group_members(group_id: int):
    """Get members of a group with their details."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT member_ids, filters FROM mailing_groups WHERE id = %s", (group_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Grupo no encontrado")

        member_ids, filters = row

        # If group has filters, re-resolve for fresh results
        if filters and isinstance(filters, str):
            filters = json.loads(filters)
        if filters:
            member_ids = _resolve_filters(cur, filters)

        if not member_ids:
            return {"members": [], "count": 0}

        placeholders = ",".join(["%s"] * len(member_ids))
        cur.execute(f"""
            SELECT id, name, email, phone, rubro
              FROM "User" WHERE id IN ({placeholders}) AND email IS NOT NULL
              ORDER BY rubro, name
        """, member_ids)

        cols = [c[0] for c in cur.description]
        members = [dict(zip(cols, row)) for row in cur.fetchall()]
        return {"members": members, "count": len(members)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ Preview + Send ═══════════

@router.post("/preview", dependencies=[Depends(get_current_admin)])
def preview_segment(req: PreviewRequest):
    """Preview recipients for a segment before sending."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        filters = {}
        if req.rubro: filters["rubro"] = req.rubro
        if req.keyword: filters["keyword"] = req.keyword

        member_ids = _resolve_filters(cur, filters) if filters else []

        if not member_ids:
            # Return all active candidates
            cur.execute("""
                SELECT u.id, u.name, u.email, u.rubro
                  FROM "User" u
                 WHERE u.role = 'empleado' AND u.confirmed = TRUE AND u.email IS NOT NULL AND COALESCE(u.active, TRUE) = TRUE
                 ORDER BY u.rubro, u.name
            """)
        else:
            placeholders = ",".join(["%s"] * len(member_ids))
            cur.execute(f"""
                SELECT id, name, email, rubro FROM "User" WHERE id IN ({placeholders}) ORDER BY rubro, name
            """, member_ids)

        cols = [c[0] for c in cur.description]
        recipients = [dict(zip(cols, row)) for row in cur.fetchall()]

        rubros_summary = {}
        for r in recipients:
            rb = r.get("rubro") or "General"
            rubros_summary[rb] = rubros_summary.get(rb, 0) + 1

        return {"count": len(recipients), "recipients": recipients, "rubros_summary": rubros_summary}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/send", dependencies=[Depends(get_current_admin)])
def send_mailing(req: MailingRequest, background_tasks: BackgroundTasks):
    """Send emails to a group, explicit IDs, or segment."""
    if not req.subject or not req.body:
        raise HTTPException(400, "subject y body son obligatorios")

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Resolve recipients
        if req.group_id:
            cur.execute("SELECT member_ids, filters FROM mailing_groups WHERE id = %s", (req.group_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Grupo no encontrado")
            member_ids, filters = row
            if filters and isinstance(filters, str):
                filters = json.loads(filters)
            if filters:
                member_ids = _resolve_filters(cur, filters)
            if not member_ids:
                raise HTTPException(404, "Grupo sin miembros")
            placeholders = ",".join(["%s"] * len(member_ids))
            cur.execute(f'SELECT id, name, email FROM "User" WHERE id IN ({placeholders}) AND email IS NOT NULL', member_ids)
        elif req.recipient_ids:
            placeholders = ",".join(["%s"] * len(req.recipient_ids))
            cur.execute(f'SELECT id, name, email FROM "User" WHERE id IN ({placeholders}) AND email IS NOT NULL', req.recipient_ids)
        elif req.segment:
            ids = _resolve_filters(cur, req.segment)
            if not ids:
                raise HTTPException(404, "No se encontraron destinatarios")
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f'SELECT id, name, email FROM "User" WHERE id IN ({placeholders}) AND email IS NOT NULL', ids)
        else:
            raise HTTPException(400, "Debes enviar group_id, recipient_ids, o segment")

        recipients = cur.fetchall()
        if not recipients:
            raise HTTPException(404, "No se encontraron destinatarios")

        for user_id, name, email in recipients:
            personalized_body = req.body.replace("{nombre}", name or "Candidato")
            background_tasks.add_task(send_email, email, req.subject, personalized_body)

        logger.info("Mailing queued: %d recipients, subject='%s'", len(recipients), req.subject)
        return {"message": f"Email en cola para {len(recipients)} destinatarios", "count": len(recipients)}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.get("/rubros", dependencies=[Depends(get_current_admin)])
def list_rubros_with_counts():
    """List all rubros with candidate counts."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT COALESCE(rubro, 'General') as rubro, COUNT(*) as count
              FROM "User"
             WHERE role = 'empleado' AND confirmed = TRUE AND email IS NOT NULL AND COALESCE(active, TRUE) = TRUE
             GROUP BY rubro
             ORDER BY count DESC
        """)
        return [{"rubro": r[0], "count": r[1]} for r in cur.fetchall()]
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ═══════════ Helper ═══════════

def _resolve_filters(cur, filters: dict) -> list[int]:
    """Resolve filter criteria to a list of user IDs."""
    conditions = ["u.role = 'empleado'", "u.confirmed = TRUE", "u.email IS NOT NULL", "COALESCE(u.active, TRUE) = TRUE"]
    params = []

    rubro = filters.get("rubro")
    keyword = filters.get("keyword")

    if rubro:
        conditions.append("u.rubro ILIKE %s")
        params.append(f"%{rubro}%")
    if keyword:
        conditions.append("(u.name ILIKE %s OR u.description ILIKE %s)")
        params.extend([f"%{keyword}%", f"%{keyword}%"])

    where = " AND ".join(conditions)
    cur.execute(f'SELECT u.id FROM "User" u WHERE {where}', params)
    return [row[0] for row in cur.fetchall()]
