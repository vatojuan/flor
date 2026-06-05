# app/routers/telegram.py
"""Webhook de Telegram para el admin agent (Fapy). Spec: specs/telegram-fapy.md."""
import logging
import os

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from app.services.telegram_bot import process_update

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: str = Header(default=""),
):
    """Recibe los updates de Telegram.

    Valida el secret token (lo que garantiza que el POST viene de Telegram), encola el
    procesamiento en background y responde 200 al instante: el `chat()` de Fapy puede
    tardar (OpenAI + tools), y así Telegram no reintenta por timeout ni se duplica el
    trabajo.
    """
    secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    if secret and x_telegram_bot_api_secret_token != secret:
        logger.warning("Telegram webhook: secret token inválido")
        raise HTTPException(status_code=403, detail="invalid secret token")

    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid JSON")

    background_tasks.add_task(process_update, update)
    return {"ok": True}
