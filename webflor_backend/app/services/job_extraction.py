"""
Extracción de datos de una oferta de trabajo desde una imagen (screenshot).

Reutilizable desde el endpoint HTTP del panel (`POST /api/screenshot-job/extract`) y
desde el bot de Telegram. La llamada a OpenAI Vision es I/O (integración); el parseo de
la respuesta (`parse_extraction_response`) es puro y se testea en unit. El import de
OpenAI es lazy para no exigirlo en import-time (los unitarios corren en CI con solo pytest).

Spec: specs/telegram-fapy.md.
"""
import base64
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

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


def parse_extraction_response(raw: str) -> dict:
    """Parsea la respuesta del modelo de visión a una forma normalizada.

    Limpia fences markdown (```json ... ```), hace `json.loads` y devuelve:
      - `{"success": True, "job": {...}}` si es una oferta;
      - `{"success": False, "error": "..."}` si el modelo reportó un error.

    Lanza `json.JSONDecodeError` si el texto no es JSON parseable (el caller decide
    cómo avisarlo).
    """
    raw = (raw or "").strip()

    # Clean markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    data = json.loads(raw)

    if isinstance(data, dict) and "error" in data:
        return {"success": False, "error": data["error"]}
    return {"success": True, "job": data}


def extract_job_from_image(image_bytes: bytes, media_type: str, *, client: Any = None) -> dict:
    """Extrae los datos de una oferta desde los bytes de una imagen usando GPT-4 Vision.

    Devuelve lo mismo que `parse_extraction_response`. `client` es inyectable (para tests
    o para reusar un cliente ya configurado); por defecto crea un `OpenAI()` lazy.
    """
    if client is None:
        import os
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""), timeout=60)

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
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
    raw = response.choices[0].message.content
    return parse_extraction_response(raw)
