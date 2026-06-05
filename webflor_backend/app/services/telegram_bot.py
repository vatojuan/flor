"""
Integración de Telegram con el admin agent (Fapy).

Dos capacidades, ambas por el webhook de Telegram:
  1. Chat de texto con Fapy (`app.services.admin_agent.chat`).
  2. Publicación de ofertas por foto: el admin manda un screenshot de una oferta, la IA
     extrae los datos (reusa `app.services.job_extraction`), y tras confirmar en el chat se
     publica con `app.routers.job._insert_job`.

Spec: specs/telegram-fapy.md.

Diseño para testeo: las funciones puras (`parse_message`, `parse_photo`, `is_authorized`,
`build_job_payload`, `format_job_preview`) no hacen I/O. `process_update` recibe
`agent_chat`, `send`, `conversations`, `pending_jobs`, `extract_job`, `download_photo` y
`create_job` como parámetros inyectables, así los tests unit corren sin red ni OpenAI. A
nivel de módulo NO se importan deps pesadas ni externas (`requests`, `openai`,
`app.routers.job`): esos imports son lazy dentro de las funciones para que el módulo sea
importable en CI (solo stdlib + pytest).
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"

# Mensajes (user+assistant) que se recuerdan por chat. Acota el historial para no crecer
# sin límite ni inflar el costo de tokens de OpenAI en cada turno.
MAX_HISTORY_MESSAGES = 20

# Estado en memoria, por chat_id. Se pierde si el proceso reinicia (redeploy de Render) —
# es intencional para v1 (ver "Fuera de alcance" en el spec).
_conversations: dict[int, list[dict]] = {}   # historial de chat con Fapy
_pending_jobs: dict[int, dict] = {}           # oferta extraída esperando confirmación

WELCOME = (
    "¡Hola! Soy *Fapy*, el asistente de FAP Mendoza. 🤖\n\n"
    "• Preguntame por candidatos, ofertas, matches o estadísticas.\n"
    "• Mandame el *screenshot* de una oferta (de redes, WhatsApp, etc.) y la publico en la "
    "plataforma después de que la revises."
)

# Respuestas de confirmación para publicar una oferta pendiente.
_AFFIRMATIVE = {
    "si", "sí", "s", "dale", "ok", "oka", "okay", "publicar", "publica", "publicá",
    "publicalo", "publicala", "confirmar", "confirmo", "confirma", "yes", "sip", "va", "obvio",
}
_NEGATIVE = {
    "no", "n", "cancelar", "cancela", "cancelá", "descartar", "descarta", "descartá",
    "nop", "negativo",
}


def _bot_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "")


def allowed_chat_ids() -> set[int]:
    """IDs autorizados, leídos de `TELEGRAM_ALLOWED_CHAT_IDS` (coma-separado)."""
    raw = os.getenv("TELEGRAM_ALLOWED_CHAT_IDS", "")
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.add(int(part))
        except ValueError:
            logger.warning("TELEGRAM_ALLOWED_CHAT_IDS: '%s' no es un entero válido", part)
    return ids


def is_authorized(chat_id: int) -> bool:
    """True sólo si `chat_id` está en la allowlist.

    Cerrado por defecto: si no hay IDs configurados, nadie está autorizado. Esto es a
    propósito — el bot puede publicar ofertas y disparar mailing.
    """
    return chat_id in allowed_chat_ids()


def _extract_chat_id(update: dict) -> Optional[int]:
    """chat_id de un update (sea texto o foto), o None si no se puede determinar."""
    if not isinstance(update, dict):
        return None
    message = update.get("message") or update.get("edited_message")
    if not isinstance(message, dict):
        return None
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    return chat_id if isinstance(chat_id, int) else None


def parse_message(update: dict) -> Optional[tuple[int, str]]:
    """Extrae `(chat_id, text)` de un update de texto; None si no es texto procesable."""
    if not isinstance(update, dict):
        return None
    message = update.get("message") or update.get("edited_message")
    if not isinstance(message, dict):
        return None
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = message.get("text")
    if not isinstance(chat_id, int) or not isinstance(text, str) or not text.strip():
        return None
    return chat_id, text


def parse_photo(update: dict) -> Optional[tuple[int, str]]:
    """Extrae `(chat_id, file_id)` de un update con imagen.

    Soporta las dos formas en que Telegram entrega una imagen:
      - foto comprimida: `message.photo` (lista de `PhotoSize`; el último es el de mayor
        resolución);
      - imagen como archivo: `message.document` con `mime_type` `image/*` (p. ej. un .jpg
        adjunto sin comprimir — así la mandan muchos al reenviar un aviso).
    None si el update no trae una imagen procesable.
    """
    if not isinstance(update, dict):
        return None
    message = update.get("message") or update.get("edited_message")
    if not isinstance(message, dict):
        return None
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if not isinstance(chat_id, int):
        return None

    # Foto comprimida: el último PhotoSize es el de mayor resolución.
    photos = message.get("photo")
    if isinstance(photos, list) and photos:
        last = photos[-1]
        file_id = last.get("file_id") if isinstance(last, dict) else None
        if file_id:
            return chat_id, file_id

    # Imagen enviada como archivo/documento (mime image/*).
    document = message.get("document")
    if isinstance(document, dict):
        file_id = document.get("file_id")
        mime = document.get("mime_type") or ""
        if file_id and isinstance(mime, str) and mime.startswith("image/"):
            return chat_id, file_id

    return None


def send_message(chat_id: int, text: str) -> None:
    """Envía un mensaje de texto al chat vía la API de Telegram.

    Intenta con Markdown; si Telegram lo rechaza (parseo inválido), reintenta en texto
    plano. `requests` se importa acá (lazy) para no exigirlo en import-time.
    """
    token = _bot_token()
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN no configurado; no se puede responder")
        return
    import requests

    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    try:
        resp = requests.post(
            url,
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=30,
        )
        if resp.status_code != 200:
            logger.warning("sendMessage %s: %s", resp.status_code, resp.text[:200])
            # Markdown malformado es la causa típica → reintentar en texto plano.
            requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=30)
    except Exception as e:  # noqa: BLE001 — un fallo de red no debe romper el worker
        logger.error("Error enviando mensaje a Telegram (chat %s): %s", chat_id, e)


_IMAGE_EXT_TO_MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif",
}


def _guess_image_media_type(file_path: str, header_content_type, content: bytes) -> str:
    """Determina un media_type de imagen válido para la API de visión.

    Telegram sirve las imágenes enviadas como **documento** con Content-Type
    'application/octet-stream'; pasarle eso a OpenAI Vision (`data:application/octet-stream;…`)
    hace fallar la extracción. Orden de preferencia: header `image/*` → extensión del
    `file_path` → magic bytes → `image/jpeg` por defecto.
    """
    ct = header_content_type if isinstance(header_content_type, str) else ""
    ct = ct.split(";")[0].strip().lower()
    if ct.startswith("image/"):
        return ct
    ext = os.path.splitext(file_path or "")[1].lower()
    if ext in _IMAGE_EXT_TO_MIME:
        return _IMAGE_EXT_TO_MIME[ext]
    head = content[:12] if content else b""
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return "image/jpeg"


def download_telegram_file(file_id: str) -> tuple[bytes, str]:
    """Descarga un archivo de Telegram por `file_id`. Devuelve `(bytes, media_type)`.

    Resuelve el `file_path` con getFile y baja el binario del file API. El media_type se
    deriva de forma robusta (no se confía en el Content-Type, que para documentos suele ser
    octet-stream y rompe la visión). `requests` lazy.
    """
    token = _bot_token()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN no configurado")
    import requests

    meta = requests.get(
        f"{TELEGRAM_API_BASE}/bot{token}/getFile",
        params={"file_id": file_id},
        timeout=30,
    )
    meta.raise_for_status()
    file_path = meta.json()["result"]["file_path"]

    binary = requests.get(f"{TELEGRAM_API_BASE}/file/bot{token}/{file_path}", timeout=60)
    binary.raise_for_status()
    media_type = _guess_image_media_type(file_path, binary.headers.get("Content-Type"), binary.content)
    return binary.content, media_type


# ─────────────────── Publicación de ofertas ────────────────────

def build_job_payload(extracted: dict) -> dict:
    """Mapea los campos extraídos de la imagen al payload que espera `_insert_job`.

    Se crea con `isPaid=True` para entrar al camino de notificación; el envío real lo
    gobierna el toggle `matching_emails_enabled` del admin. El sueldo viene como texto
    libre (no hay min/max confiable), así que se anexa a la descripción para no perderlo.
    """
    desc = (extracted.get("description") or "").strip()
    salary = extracted.get("salary")
    salary = salary.strip() if isinstance(salary, str) else ""
    if salary:
        desc = (desc + f"\n\nRemuneración: {salary}").strip()
    return {
        "title": (extracted.get("title") or "").strip(),
        "description": desc,
        "requirements": (extracted.get("requirements") or "").strip(),
        "rubro": extracted.get("rubro") or None,
        "contactEmail": extracted.get("contactEmail") or None,
        "contactPhone": extracted.get("contactPhone") or None,
        "location": extracted.get("location") or None,
        "isPaid": True,
        "label": "automatic",
    }


def format_job_preview(job: dict) -> str:
    """Arma el resumen markdown de la oferta extraída para que el admin la revise."""
    lines = ["*Revisá la oferta que leí:*", ""]
    lines.append(f"📌 *Título:* {job.get('title') or '—'}")
    lines.append(f"🏷️ *Rubro:* {job.get('rubro') or '—'}")
    if job.get("location"):
        lines.append(f"📍 *Ubicación:* {job['location']}")
    if job.get("salary"):
        lines.append(f"💰 *Sueldo:* {job['salary']}")
    if job.get("contactEmail"):
        lines.append(f"✉️ *Email:* {job['contactEmail']}")
    if job.get("contactPhone"):
        lines.append(f"📞 *Teléfono:* {job['contactPhone']}")
    desc = (job.get("description") or "").strip()
    if desc:
        lines.append("")
        lines.append(f"📝 {desc}")
    reqs = (job.get("requirements") or "").strip()
    if reqs and reqs.lower() != "no especificados":
        lines.append("")
        lines.append(f"✅ *Requisitos:* {reqs}")
    return "\n".join(lines)


def _job_owner_id() -> int:
    """userId dueño de las ofertas publicadas desde Telegram (env TELEGRAM_JOB_OWNER_ID)."""
    raw = os.getenv("TELEGRAM_JOB_OWNER_ID", "").strip()
    if not raw:
        raise RuntimeError("TELEGRAM_JOB_OWNER_ID no configurado")
    return int(raw)


def publish_job(payload: dict, *, create_job=None, owner_id: Optional[int] = None) -> int:
    """Publica la oferta vía `_insert_job` y devuelve el job_id. `create_job` inyectable."""
    if owner_id is None:
        owner_id = _job_owner_id()
    if create_job is None:
        from app.routers.job import _insert_job as create_job
    job_id, _ = create_job(payload, owner_id, "telegram", "automatic")
    return job_id


def _first_word(text: str) -> str:
    t = text.strip().lower()
    for ch in ",.!¡¿?":
        t = t.replace(ch, " ")
    parts = t.split()
    return parts[0] if parts else ""


def _is_affirmative(text: str) -> bool:
    return _first_word(text) in _AFFIRMATIVE


def _is_negative(text: str) -> bool:
    return _first_word(text) in _NEGATIVE


def _handle_photo(chat_id: int, file_id: str, *, send, pending_jobs,
                  extract_job=None, download_photo=None) -> None:
    if download_photo is None:
        download_photo = download_telegram_file
    if extract_job is None:
        from app.services.job_extraction import extract_job_from_image as extract_job

    send(chat_id, "📸 Recibí la imagen, dame unos segundos para leer la oferta…")
    try:
        image_bytes, media_type = download_photo(file_id)
    except Exception as e:  # noqa: BLE001
        logger.error("Telegram: no se pudo descargar la foto %s: %s", file_id, e)
        send(chat_id, "No pude descargar la imagen. Probá de nuevo. 🙏")
        return

    try:
        result = extract_job(image_bytes, media_type)
    except Exception as e:  # noqa: BLE001
        logger.error("Telegram: extracción de oferta falló: %s", e)
        send(chat_id, "No pude leer la oferta de la imagen. Probá con otra captura.")
        return

    if not result.get("success"):
        send(chat_id, f"⚠️ {result.get('error') or 'No se detectó una oferta en la imagen.'}")
        return

    payload = build_job_payload(result["job"])
    if not payload.get("title") or not payload.get("description"):
        send(chat_id, "La imagen no tenía datos suficientes (falta título o descripción).")
        return

    pending_jobs[chat_id] = payload
    send(chat_id, format_job_preview(result["job"]) + "\n\n¿*Publico* esta oferta? Respondé *sí* o *no*.")


def _handle_confirmation(chat_id: int, text: str, *, send, pending_jobs, create_job=None) -> None:
    if _is_affirmative(text):
        payload = pending_jobs.pop(chat_id, None)
        if payload is None:
            return
        try:
            job_id = publish_job(payload, create_job=create_job)
        except Exception as e:  # noqa: BLE001
            logger.error("Telegram: error publicando oferta de %s: %s", chat_id, e)
            pending_jobs[chat_id] = payload  # la devolvemos para poder reintentar
            send(chat_id, "Hubo un error al publicar la oferta. Probá de nuevo en un rato.")
            return
        send(chat_id, f"✅ ¡Oferta publicada! (ID {job_id}). Ya entró al matching.")
    elif _is_negative(text):
        pending_jobs.pop(chat_id, None)
        send(chat_id, "Listo, descarté esa oferta. Mandame otra captura cuando quieras. 👍")
    else:
        send(chat_id, "Tenés una oferta pendiente. Respondé *sí* para publicarla o *no* para descartarla.")


def process_update(update: dict, *, agent_chat=None, send=send_message, conversations=None,
                   pending_jobs=None, extract_job=None, download_photo=None, create_job=None) -> None:
    """Procesa un update de Telegram de punta a punta.

    Las dependencias son inyectables para testear sin OpenAI ni red.
    """
    if conversations is None:
        conversations = _conversations
    if pending_jobs is None:
        pending_jobs = _pending_jobs

    chat_id = _extract_chat_id(update)
    if chat_id is None:
        return  # update sin chat reconocible → se ignora

    if not is_authorized(chat_id):
        logger.warning("Telegram: mensaje de chat no autorizado %s", chat_id)
        send(chat_id, "No estás autorizado para usar este asistente.")
        return

    # 1) Foto → descargar, extraer y pedir confirmación (no publica todavía)
    photo = parse_photo(update)
    if photo is not None:
        _handle_photo(chat_id, photo[1], send=send, pending_jobs=pending_jobs,
                      extract_job=extract_job, download_photo=download_photo)
        return

    # 2) Texto
    parsed = parse_message(update)
    if parsed is None:
        return  # ni foto ni texto → se ignora
    text = parsed[1].strip()

    # 2a) ¿Está confirmando una oferta pendiente?
    if chat_id in pending_jobs:
        _handle_confirmation(chat_id, text, send=send, pending_jobs=pending_jobs, create_job=create_job)
        return

    # 2b) Bienvenida
    if text == "/start":
        send(chat_id, WELCOME)
        return

    # 2c) Chat normal con Fapy
    if agent_chat is None:
        from app.services.admin_agent import chat as agent_chat

    history = conversations.setdefault(chat_id, [])
    history.append({"role": "user", "content": text})
    try:
        reply = agent_chat(history)
    except Exception as e:  # noqa: BLE001
        logger.error("Fapy falló procesando update de %s: %s", chat_id, e)
        history.pop()  # no dejamos el turno del user colgado si falló
        send(chat_id, "Uy, hubo un error procesando tu mensaje. Probá de nuevo. 🙏")
        return

    history.append({"role": "assistant", "content": reply})
    if len(history) > MAX_HISTORY_MESSAGES:
        del history[: len(history) - MAX_HISTORY_MESSAGES]

    send(chat_id, reply)
