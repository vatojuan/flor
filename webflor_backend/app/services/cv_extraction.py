"""
Structured CV data extraction using GPT-4 with JSON output.

Replaces the old approach of separate regex (phone/email) + multiple OpenAI calls
(name, description) with a single structured extraction call.
"""
import json
import logging
import os
from openai import OpenAI

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY, timeout=60)

EXTRACTION_SYSTEM_PROMPT = """Eres un analista de Recursos Humanos experto en lectura de CVs/hojas de vida.
Tu tarea es extraer información estructurada del siguiente CV y devolver ÚNICAMENTE un objeto JSON válido.

Reglas:
- "nombre": Nombre completo del candidato (nombre y apellido). Si no lo encuentras, null.
- "email": Email de contacto del candidato. Si hay varios, elige el personal (no laboral). Si no hay, null.
- "telefono": Número de teléfono/celular/WhatsApp del candidato. Formato original como aparece. Ignorar CUIT/CUIL, DNI, legajos. Si no hay, null.
- "rubro": Categoría profesional principal del candidato basada en su experiencia y formación. Ejemplos: "Gastronomía", "Construcción", "Administración", "IT/Sistemas", "Salud", "Educación", "Comercio/Ventas", "Logística/Transporte", "Producción/Industria", "Servicios Generales", "Diseño/Comunicación", "Derecho", "Contabilidad/Finanzas", "Recursos Humanos", "Agricultura". Elige la más representativa. Si no es claro, "General".
- "habilidades": Array con las 5-10 habilidades/competencias más relevantes (técnicas y blandas). Array vacío si no hay.
- "experiencia_anos": Años aproximados de experiencia laboral (número entero). 0 si es primer empleo o no se puede determinar.
- "descripcion": Resumen profesional atractivo de máximo 600 caracteres. Tono profesional y directo. Mencionar rubro, experiencia destacada, y valor que aporta. NO inventar información que no esté en el CV.

Responde SOLO con el JSON, sin markdown, sin explicaciones."""

EXTRACTION_USER_PROMPT = """Analiza el siguiente CV y extrae la información estructurada:

---
{cv_text}
---"""


def extract_cv_data(text_content: str) -> dict:
    """
    Extract structured data from CV text using GPT-4.

    Returns a dict with keys: nombre, email, telefono, rubro, habilidades,
    experiencia_anos, descripcion. Values are None/empty if not found.
    """
    default_result = {
        "nombre": None,
        "email": None,
        "telefono": None,
        "rubro": "General",
        "habilidades": [],
        "experiencia_anos": 0,
        "descripcion": None,
    }

    if not text_content or len(text_content.strip()) < 50:
        logger.warning("CV text too short for extraction (<%d chars)", len(text_content))
        return default_result

    # Use up to 6000 chars for better extraction (gpt-4-turbo handles this well)
    cv_text = text_content[:6000]

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": EXTRACTION_USER_PROMPT.format(cv_text=cv_text)},
            ],
            max_tokens=800,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)

        # Validate and normalize
        result = {
            "nombre": _clean_string(data.get("nombre")),
            "email": _clean_email(data.get("email")),
            "telefono": _clean_string(data.get("telefono")),
            "rubro": _clean_string(data.get("rubro")) or "General",
            "habilidades": data.get("habilidades", []) if isinstance(data.get("habilidades"), list) else [],
            "experiencia_anos": int(data.get("experiencia_anos", 0)) if str(data.get("experiencia_anos", "0")).isdigit() else 0,
            "descripcion": _clean_string(data.get("descripcion")),
        }

        logger.info("CV extraction successful: name=%s, rubro=%s", result["nombre"], result["rubro"])
        return result

    except json.JSONDecodeError as e:
        logger.error("Failed to parse GPT response as JSON: %s", str(e))
        return default_result
    except Exception as e:
        logger.error("CV extraction failed: %s", str(e))
        return default_result


def _clean_string(value) -> str | None:
    """Clean and validate a string value."""
    if not value or not isinstance(value, str):
        return None
    cleaned = value.strip().strip('"').strip("'")
    if not cleaned or cleaned.lower() in ("null", "none", "no encontrado", "n/a"):
        return None
    return cleaned


def _clean_email(value) -> str | None:
    """Validate email format."""
    cleaned = _clean_string(value)
    if not cleaned or "@" not in cleaned or "." not in cleaned:
        return None
    return cleaned.lower()
