# app/routers/inbox.py
"""
Email inbox management — configure accounts and trigger scans.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from app.database import get_db_connection
from app.utils.auth_utils import get_current_admin
from app.services.inbox_scanner import scan_inbox

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class EmailAccountConfig(BaseModel):
    name: str
    email: str
    password: str
    imap_host: str = "imap.gmail.com"
    imap_port: int = 993
    enabled: bool = True


@router.get("/accounts", dependencies=[Depends(get_current_admin)])
def list_accounts():
    """List configured email accounts (passwords masked)."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, email, imap_host, imap_port, enabled, last_scan, emails_processed
            FROM email_accounts ORDER BY id
        """)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/accounts", dependencies=[Depends(get_current_admin)])
def add_account(config: EmailAccountConfig):
    """Add or update an email account for scanning."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO email_accounts (name, email, password, imap_host, imap_port, enabled)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name, password = EXCLUDED.password,
                imap_host = EXCLUDED.imap_host, imap_port = EXCLUDED.imap_port,
                enabled = EXCLUDED.enabled
            RETURNING id
        """, (config.name, config.email, config.password, config.imap_host, config.imap_port, config.enabled))
        account_id = cur.fetchone()[0]
        conn.commit()
        return {"id": account_id, "message": f"Cuenta {config.email} configurada"}
    except Exception as e:
        logger.error("Error adding account: %s", e)
        raise HTTPException(500, "Error guardando la cuenta")
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.delete("/accounts/{account_id}", dependencies=[Depends(get_current_admin)])
def delete_account(account_id: int):
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM email_accounts WHERE id = %s", (account_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Cuenta no encontrada")
        conn.commit()
        return {"message": "Cuenta eliminada"}
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.post("/scan/{account_id}", dependencies=[Depends(get_current_admin)])
def trigger_scan(account_id: int, background_tasks: BackgroundTasks):
    """Manually trigger a scan of a specific email account."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT email, password, imap_host, imap_port FROM email_accounts WHERE id = %s AND enabled = TRUE", (account_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Cuenta no encontrada o deshabilitada")

        account_config = {
            "email": row[0], "password": row[1],
            "imap_host": row[2], "imap_port": row[3],
        }
        cur.close()
        conn.close()

        # Run scan synchronously for immediate feedback
        results = scan_inbox(account_config)

        # Update last scan stats
        conn2 = get_db_connection()
        cur2 = conn2.cursor()
        cur2.execute("""
            UPDATE email_accounts SET last_scan = NOW(),
                emails_processed = COALESCE(emails_processed, 0) + %s
            WHERE id = %s
        """, (results.get("processed", 0), account_id))
        conn2.commit()
        cur2.close()
        conn2.close()

        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Scan trigger error: %s", e)
        raise HTTPException(500, f"Error ejecutando scan: {e}")


@router.post("/scan-all", dependencies=[Depends(get_current_admin)])
def trigger_scan_all():
    """Scan all enabled email accounts."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, imap_host, imap_port FROM email_accounts WHERE enabled = TRUE")
        accounts = cur.fetchall()
        cur.close()
        conn.close()

        all_results = []
        for acc_id, acc_email, acc_pw, host, port in accounts:
            config = {"email": acc_email, "password": acc_pw, "imap_host": host, "imap_port": port}
            result = scan_inbox(config)
            result["account"] = acc_email

            # Update stats
            conn2 = get_db_connection()
            cur2 = conn2.cursor()
            cur2.execute("""
                UPDATE email_accounts SET last_scan = NOW(),
                    emails_processed = COALESCE(emails_processed, 0) + %s
                WHERE id = %s
            """, (result.get("processed", 0), acc_id))
            conn2.commit()
            cur2.close()
            conn2.close()

            all_results.append(result)

        return {"accounts_scanned": len(all_results), "results": all_results}
    except Exception as e:
        logger.error("Scan all error: %s", e)
        raise HTTPException(500, str(e))
