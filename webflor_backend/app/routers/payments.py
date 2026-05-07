# app/routers/payments.py
"""
MercadoPago integration for paid job listings.

Flow:
1. Employer creates job offer → gets preference URL
2. Employer pays via MercadoPago checkout
3. Webhook confirms payment → job marked as paid/featured
4. Featured jobs get emailed to matching candidates automatically
"""
import logging
import os
import uuid
from datetime import datetime

import mercadopago
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.database import get_db_connection
from app.utils.auth_utils import get_current_active_user
from app.routers.match import run_matching_for_job
from app.email_utils import send_match_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

# MercadoPago SDK
MP_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# Pricing
FEATURED_JOB_PRICE = float(os.getenv("FEATURED_JOB_PRICE", "15000"))
CURRENCY = "ARS"

# URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fapmendoza.online")
BACKEND_URL = os.getenv("BACKEND_URL", "https://api.fapmendoza.online")


class CreatePreferenceRequest(BaseModel):
    job_id: int
    title: str


@router.post("/create-preference")
def create_payment_preference(req: CreatePreferenceRequest, user=Depends(get_current_active_user)):
    """
    Create a MercadoPago checkout preference for a featured job listing.
    Returns the checkout URL where the employer should be redirected.
    """
    if not MP_ACCESS_TOKEN:
        raise HTTPException(500, "MercadoPago no esta configurado")

    external_reference = f"job_{req.job_id}_{uuid.uuid4().hex[:8]}"

    preference_data = {
        "items": [
            {
                "title": f"Oferta Destacada: {req.title}",
                "description": "Publicacion destacada en FAP Mendoza con envio a candidatos compatibles",
                "quantity": 1,
                "unit_price": FEATURED_JOB_PRICE,
                "currency_id": CURRENCY,
            }
        ],
        "external_reference": external_reference,
        "back_urls": {
            "success": f"{FRONTEND_URL}/payment/success?job_id={req.job_id}",
            "failure": f"{FRONTEND_URL}/payment/failure?job_id={req.job_id}",
            "pending": f"{FRONTEND_URL}/payment/pending?job_id={req.job_id}",
        },
        "auto_return": "approved",
        "notification_url": f"{BACKEND_URL}/api/payments/webhook",
        "metadata": {
            "job_id": req.job_id,
            "user_id": user.id,
        },
    }

    try:
        result = mp_sdk.preference().create(preference_data)
        preference = result["response"]

        # Store payment reference in DB
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO payment_records (job_id, user_id, external_reference, preference_id, amount, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
            ON CONFLICT (external_reference) DO NOTHING
        """, (req.job_id, user.id, external_reference, preference["id"], FEATURED_JOB_PRICE))
        conn.commit()
        cur.close()
        conn.close()

        return {
            "checkout_url": preference["init_point"],
            "preference_id": preference["id"],
            "external_reference": external_reference,
            "amount": FEATURED_JOB_PRICE,
        }
    except Exception as e:
        logger.error("Error creating MP preference: %s", e)
        raise HTTPException(500, "Error creando preferencia de pago")


@router.post("/webhook")
async def mercadopago_webhook(request: Request):
    """
    Webhook called by MercadoPago when payment status changes.
    On approved: marks job as featured, triggers matching emails.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored"}

    # MercadoPago sends different notification types
    topic = body.get("type") or body.get("topic")
    if topic != "payment":
        return {"status": "ignored", "topic": topic}

    payment_id = body.get("data", {}).get("id")
    if not payment_id:
        return {"status": "no_payment_id"}

    try:
        # Get payment details from MP
        payment_info = mp_sdk.payment().get(payment_id)
        payment = payment_info["response"]

        status = payment.get("status")  # approved, pending, rejected
        external_ref = payment.get("external_reference", "")
        metadata = payment.get("metadata", {})
        job_id = metadata.get("job_id") or _extract_job_id(external_ref)

        if not job_id:
            logger.warning("Webhook: no job_id found in payment %s", payment_id)
            return {"status": "no_job_id"}

        conn = get_db_connection()
        cur = conn.cursor()

        # Update payment record
        cur.execute("""
            UPDATE payment_records SET status = %s, mp_payment_id = %s, updated_at = NOW()
            WHERE external_reference = %s
        """, (status, str(payment_id), external_ref))

        if status == "approved":
            # Mark job as paid/featured
            cur.execute("""
                UPDATE "Job" SET is_paid = TRUE, label = 'automatic'
                WHERE id = %s
            """, (job_id,))
            conn.commit()
            logger.info("Job %s marked as featured (payment approved)", job_id)

            # Trigger matching + notifications in background
            import threading
            threading.Thread(target=run_matching_for_job, args=(int(job_id),), daemon=True).start()
        else:
            conn.commit()

        cur.close()
        conn.close()

        return {"status": "processed", "payment_status": status}

    except Exception as e:
        logger.error("Webhook processing error: %s", e)
        return {"status": "error"}


@router.get("/status/{job_id}")
def get_payment_status(job_id: int, user=Depends(get_current_active_user)):
    """Check if a job has been paid for."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT status, amount, created_at FROM payment_records
        WHERE job_id = %s AND user_id = %s
        ORDER BY created_at DESC LIMIT 1
    """, (job_id, user.id))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"paid": False}

    return {
        "paid": row[0] == "approved",
        "status": row[0],
        "amount": row[1],
        "date": row[2],
    }


def _extract_job_id(external_ref: str) -> Optional[int]:
    """Extract job_id from external_reference format: job_{id}_{hash}"""
    try:
        parts = external_ref.split("_")
        if len(parts) >= 2 and parts[0] == "job":
            return int(parts[1])
    except (ValueError, IndexError):
        pass
    return None
