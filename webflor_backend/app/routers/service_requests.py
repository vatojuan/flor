# app/routers/service_requests.py
"""
Headhunting service requests — companies pay for candidate search.

Flow:
1. Company fills form with what they need (position, requirements, urgency)
2. Payment via MercadoPago ($50,000 base)
3. Admin gets notified
4. Admin uses the Agent to search candidates and fulfill the request
5. Admin marks request as completed
"""
import logging
import os
import uuid
from datetime import datetime

import mercadopago
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from app.database import get_db_connection
from app.utils.auth_utils import get_current_admin
from app.email_utils import send_email, send_admin_alert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/services", tags=["services"])

MP_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

SEARCH_SERVICE_PRICE = float(os.getenv("SEARCH_SERVICE_PRICE", "50000"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fapmendoza.online")
BACKEND_URL = os.getenv("BACKEND_URL", "https://api.fapmendoza.online")


class SearchServiceRequest(BaseModel):
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str
    position: str
    quantity: int = 1
    requirements: str
    urgency: str = "normal"  # "urgente", "normal", "flexible"
    location: Optional[str] = None
    notes: Optional[str] = None


@router.post("/request-search")
async def request_search_service(req: SearchServiceRequest, background_tasks: BackgroundTasks):
    """
    Public endpoint — company requests headhunting service.
    Creates the request and returns a MercadoPago checkout URL.
    """
    if not MP_ACCESS_TOKEN:
        raise HTTPException(500, "Sistema de pagos no configurado")

    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        request_id = str(uuid.uuid4())[:12]
        external_ref = f"search_{request_id}"

        # Store request
        cur.execute("""
            INSERT INTO service_requests
            (request_id, company_name, contact_name, contact_email, contact_phone,
             position, quantity, requirements, urgency, location, notes, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending_payment', NOW())
        """, (request_id, req.company_name, req.contact_name, req.contact_email,
              req.contact_phone, req.position, req.quantity, req.requirements,
              req.urgency, req.location, req.notes))
        conn.commit()
        cur.close()
        conn.close()

        # Create MP preference
        urgency_label = {"urgente": " (URGENTE)", "normal": "", "flexible": ""}
        preference_data = {
            "items": [{
                "title": f"Busqueda de personal: {req.position}{urgency_label.get(req.urgency, '')}",
                "description": f"{req.quantity} candidato(s) — {req.company_name}",
                "quantity": 1,
                "unit_price": SEARCH_SERVICE_PRICE,
                "currency_id": "ARS",
            }],
            "external_reference": external_ref,
            "back_urls": {
                "success": f"{FRONTEND_URL}/servicios/confirmado?id={request_id}",
                "failure": f"{FRONTEND_URL}/servicios/busqueda?error=payment",
                "pending": f"{FRONTEND_URL}/servicios/confirmado?id={request_id}&pending=1",
            },
            "auto_return": "approved",
            "notification_url": f"{BACKEND_URL}/api/services/webhook",
            "payer": {
                "name": req.contact_name,
                "email": req.contact_email,
            },
            "metadata": {"request_id": request_id},
        }

        result = mp_sdk.preference().create(preference_data)
        preference = result["response"]

        return {
            "request_id": request_id,
            "checkout_url": preference["init_point"],
            "amount": SEARCH_SERVICE_PRICE,
        }

    except Exception as e:
        logger.error("Error creating service request: %s", e)
        raise HTTPException(500, "Error procesando la solicitud")


@router.post("/webhook")
async def service_webhook(request):
    """Webhook for service request payments."""
    from fastapi import Request
    req = request
    try:
        body = await req.json()
    except Exception:
        return {"status": "ignored"}

    topic = body.get("type") or body.get("topic")
    if topic != "payment":
        return {"status": "ignored"}

    payment_id = body.get("data", {}).get("id")
    if not payment_id:
        return {"status": "no_payment_id"}

    try:
        payment_info = mp_sdk.payment().get(payment_id)
        payment = payment_info["response"]
        status = payment.get("status")
        external_ref = payment.get("external_reference", "")
        metadata = payment.get("metadata", {})

        if not external_ref.startswith("search_"):
            return {"status": "not_service"}

        request_id = external_ref.replace("search_", "")

        conn = get_db_connection()
        cur = conn.cursor()

        if status == "approved":
            cur.execute("""
                UPDATE service_requests SET status = 'paid', paid_at = NOW()
                WHERE request_id = %s
            """, (request_id,))
            conn.commit()

            # Notify admin
            cur.execute("""
                SELECT company_name, position, quantity, requirements, urgency, contact_name, contact_phone
                FROM service_requests WHERE request_id = %s
            """, (request_id,))
            row = cur.fetchone()
            if row:
                send_admin_alert(
                    subject=f"Nueva solicitud de busqueda PAGADA — {row[1]}",
                    details=(
                        f"Empresa: {row[0]}\n"
                        f"Puesto: {row[1]} (x{row[2]})\n"
                        f"Requisitos: {row[3]}\n"
                        f"Urgencia: {row[4]}\n"
                        f"Contacto: {row[5]} — {row[6]}\n\n"
                        f"Usa el Asistente FAP para buscar candidatos y cumplir el pedido."
                    ),
                )
            logger.info("Service request %s paid", request_id)
        else:
            cur.execute("""
                UPDATE service_requests SET status = %s WHERE request_id = %s
            """, (status, request_id))
            conn.commit()

        cur.close()
        conn.close()
        return {"status": "processed"}

    except Exception as e:
        logger.error("Service webhook error: %s", e)
        return {"status": "error"}


# Admin endpoints

@router.get("/requests", dependencies=[Depends(get_current_admin)])
def list_service_requests(status: Optional[str] = None):
    """List all service requests (admin only)."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = "SELECT * FROM service_requests"
        params = []
        if status:
            query += " WHERE status = %s"
            params.append(status)
        query += " ORDER BY created_at DESC"

        cur.execute(query, params)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        if cur: cur.close()
        if conn: conn.close()


@router.patch("/requests/{request_id}/complete", dependencies=[Depends(get_current_admin)])
def complete_request(request_id: str):
    """Mark a service request as completed."""
    conn = cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE service_requests SET status = 'completed', completed_at = NOW()
            WHERE request_id = %s AND status = 'paid'
        """, (request_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Solicitud no encontrada o no esta pagada")
        conn.commit()
        return {"message": "Solicitud marcada como completada"}
    finally:
        if cur: cur.close()
        if conn: conn.close()
