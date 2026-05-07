# app/routers/screenshot_to_job.py
"""
Screenshot-to-Job: Admin uploads a screenshot of a job offer
(from social media, WhatsApp, etc.) and GPT-4 Vision extracts
structured job data ready to publish.
"""
import base64
import json
import logging
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from app.utils.auth_utils import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/screenshot-job", tags=["screenshot_to_job"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=60)

EXTRACTION_PROMPT = """Analiza esta imagen que contiene una oferta de trabajo (puede ser un screenshot de una red social, WhatsApp, o similar).

Extrae la informacion y devuelve UNICAMENTE un JSON valido con estos campos:
- "title": Titulo del puesto (conciso, ej: "Mozo/a para restaurante")
- "description": Descripcion del puesto (lo que se pide, beneficios, horarios, etc)
- "requirements": Requisitos (edad, experiencia, zona, disponibilidad, etc). Si no hay requisitos explicitos, poner "No especificados"
- "rubro": Categoria profesional (Gastronomia, Seguridad, Comercio/Ventas, Administracion, IT/Sistemas, Construccion, Salud, Educacion, Logistica/Transporte, Produccion/Industria, Servicios Generales, Diseno/Comunicacion, Turismo/Hoteleria, Agricultura, General)
- "contactEmail": Email de contacto si aparece, o null
- "contactPhone": Telefono de contacto si aparece, o null
- "location": Ubicacion/zona si se menciona, o null
- "salary": Informacion de sueldo si se menciona, o null

Si la imagen NO contiene una oferta de trabajo, responde: {"error": "No se detecta una oferta de trabajo en la imagen"}

Responde SOLO con el JSON, sin markdown ni explicaciones."""


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

    # Encode image to base64
    b64_image = base64.b64encode(file_bytes).decode("utf-8")
    media_type = file.content_type

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{b64_image}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=800,
            temperature=0.2,
        )

        raw = response.choices[0].message.content.strip()

        # Clean markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        data = json.loads(raw)

        if "error" in data:
            return {"success": False, "error": data["error"]}

        return {"success": True, "job": data}

    except json.JSONDecodeError:
        logger.error("Failed to parse Vision response as JSON")
        raise HTTPException(500, "No se pudo interpretar la respuesta del modelo")
    except Exception as e:
        logger.error("Screenshot extraction failed: %s", e)
        raise HTTPException(500, "Error procesando la imagen")
