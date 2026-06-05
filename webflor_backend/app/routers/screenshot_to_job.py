# app/routers/screenshot_to_job.py
"""
Screenshot-to-Job: el admin sube un screenshot de una oferta (de redes sociales,
WhatsApp, etc.) y GPT-4 Vision extrae los datos estructurados listos para publicar.

La lógica de extracción vive en `app.services.job_extraction` (reutilizada también por el
bot de Telegram). Este router es sólo el endpoint HTTP del panel admin.
"""
import json
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from app.utils.auth_utils import get_current_admin
from app.services.job_extraction import extract_job_from_image

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/screenshot-job", tags=["screenshot_to_job"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=60)


class JobFromScreenshot(BaseModel):
    title: str
    description: str
    requirements: str
    rubro: str
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None


@router.post("/extract")
async def extract_job_from_screenshot(
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
):
    """
    Upload a screenshot and extract job offer data using GPT-4 Vision.
    Returns structured job data ready to be reviewed and published.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "El archivo debe ser una imagen (PNG, JPG, WEBP)")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB max
        raise HTTPException(400, "La imagen no debe superar los 10MB")

    try:
        # Reusa el servicio compartido (mismo cliente OpenAI ya configurado del router).
        return extract_job_from_image(file_bytes, file.content_type, client=client)
    except json.JSONDecodeError:
        logger.error("Failed to parse Vision response as JSON")
        raise HTTPException(500, "No se pudo interpretar la respuesta del modelo")
    except Exception as e:
        logger.error("Screenshot extraction failed: %s", e)
        raise HTTPException(500, "Error procesando la imagen")
