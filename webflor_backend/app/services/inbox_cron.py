"""
Scheduled inbox scanning — runs automatically every N minutes.
Configuration stored in admin_config table.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import get_db_connection
from app.services.inbox_scanner import scan_inbox

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()
CRON_JOB_ID = "inbox_auto_scan"


def _get_cron_config() -> dict:
    """Read cron config from admin_config table."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT key, value FROM admin_config WHERE key IN ('inbox_cron_enabled', 'inbox_cron_interval')")
        rows = cur.fetchall()
        config = {r[0]: r[1] for r in rows}
        return {
            "enabled": config.get("inbox_cron_enabled", "true").lower() == "true",
            "interval_minutes": int(config.get("inbox_cron_interval", "30")),
        }
    except Exception as e:
        logger.warning("Could not read cron config: %s — using defaults", e)
        return {"enabled": True, "interval_minutes": 30}
    finally:
        if cur: cur.close()
        if conn: conn.close()


def _run_auto_scan():
    """Execute scan on all enabled accounts."""
    logger.info("Auto-scan triggered by cron")
    conn = cur = None
    try:
        # Check if still enabled (in case it was toggled between runs)
        config = _get_cron_config()
        if not config["enabled"]:
            logger.info("Auto-scan skipped: cron is disabled")
            return

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, imap_host, imap_port FROM email_accounts WHERE enabled = TRUE")
        accounts = cur.fetchall()
        cur.close()
        conn.close()

        if not accounts:
            logger.info("Auto-scan: no enabled accounts")
            return

        total_processed = 0
        for acc_id, acc_email, acc_pw, host, port in accounts:
            account_config = {"email": acc_email, "password": acc_pw, "imap_host": host, "imap_port": port}
            result = scan_inbox(account_config, max_emails=50)
            processed = result.get("processed", 0)
            total_processed += processed

            # Update stats
            try:
                conn2 = get_db_connection()
                cur2 = conn2.cursor()
                cur2.execute("""
                    UPDATE email_accounts SET last_scan = NOW(),
                        emails_processed = COALESCE(emails_processed, 0) + %s
                    WHERE id = %s
                """, (processed, acc_id))
                conn2.commit()
                cur2.close()
                conn2.close()
            except Exception:
                pass

        logger.info("Auto-scan completed: %d emails processed across %d accounts", total_processed, len(accounts))

    except Exception as e:
        logger.error("Auto-scan error: %s", e)


def start_cron():
    """Start the background scheduler with the configured interval."""
    config = _get_cron_config()

    if not config["enabled"]:
        logger.info("Inbox cron is disabled — not starting scheduler")
        return

    interval = config["interval_minutes"]

    # Remove existing job if any
    if scheduler.get_job(CRON_JOB_ID):
        scheduler.remove_job(CRON_JOB_ID)

    scheduler.add_job(
        _run_auto_scan,
        trigger=IntervalTrigger(minutes=interval),
        id=CRON_JOB_ID,
        replace_existing=True,
        max_instances=1,
    )

    if not scheduler.running:
        scheduler.start()

    logger.info("Inbox cron started: scanning every %d minutes", interval)


def stop_cron():
    """Stop the scheduled scanning."""
    if scheduler.get_job(CRON_JOB_ID):
        scheduler.remove_job(CRON_JOB_ID)
    logger.info("Inbox cron stopped")


def restart_cron():
    """Restart with fresh config (after settings change)."""
    stop_cron()
    start_cron()
