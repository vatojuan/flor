# Fapy en Telegram: chat + publicación de ofertas por foto

- **Estado:** Aprobado
- **Fecha:** 2026-06-04
- **Tipo:** feature
- **Componente:** webflor_backend

## Contexto / problema

Fapy (el admin agent, `app/services/admin_agent.py::chat`) hoy sólo es accesible vía
`POST /api/agent/chat` con JWT de admin desde el panel. Juan quiere usarlo desde
**Telegram**, desde el celular: (a) chatear con Fapy y (b) **mandar un screenshot de una
oferta** (de redes sociales, WhatsApp, etc.) para que la IA extraiga los datos y la
**publique** en la plataforma.

El agente y la publicación ejecutan **acciones reales** (mailing masivo, crear ofertas
visibles a candidatos), así que la integración debe estar **cerrada**: sólo los chats
explícitamente autorizados pueden hablarle.

## Comportamiento esperado (criterios de aceptación)

### Chat de texto
- [ ] `parse_message(update)` extrae `(chat_id, text)` de un update tipo `message` o
  `edited_message`; devuelve `None` para updates sin texto procesable. (→ `tests/unit/test_telegram_bot.py`)
- [ ] `is_authorized(chat_id)` es `True` sólo si el id está en `TELEGRAM_ALLOWED_CHAT_IDS`
  (coma-separado). **Cerrado por defecto**: sin la env var, nadie está autorizado.
- [ ] Un texto de chat **no autorizado** NO invoca al agente y responde un aviso.
- [ ] Un texto de chat autorizado invoca a `agent_chat` con el historial (incluye el
  mensaje nuevo) y envía la respuesta. El historial se mantiene por `chat_id` y se trunca
  a `MAX_HISTORY_MESSAGES`.
- [ ] `/start` (autorizado) responde bienvenida sin invocar al agente.

### Publicación de ofertas por foto
- [ ] `parse_photo(update)` devuelve `(chat_id, file_id)`: para fotos comprimidas toma el
  `PhotoSize` de **mayor resolución** (último); también acepta imágenes enviadas como
  **documento** (`message.document` con `mime_type` `image/*`, p. ej. un .jpg adjunto sin
  comprimir). `None` si el update no trae imagen.
- [ ] `parse_extraction_response(raw)` limpia fences markdown, parsea el JSON y normaliza
  a `{"success": True, "job": {...}}` o `{"success": False, "error": ...}`. (→ `tests/unit/test_job_extraction.py`)
- [ ] `build_job_payload(extracted)` mapea los campos extraídos al payload de
  `_insert_job`, con `isPaid=True` y el sueldo libre anexado a la descripción.
- [ ] Una foto de chat autorizado: descarga la imagen, la extrae (reusa la lógica de
  visión), guarda la oferta como **pendiente de confirmación** (NO publica), y responde un
  resumen pidiendo confirmación. Si la extracción falla / no es una oferta, avisa y no
  deja nada pendiente.
- [ ] Con una oferta pendiente: un texto **afirmativo** (sí/dale/publicar) la publica vía
  `_insert_job(payload, owner_id, source="telegram", "automatic")` y confirma con el ID; un
  texto **negativo** (no/cancelar) la descarta; cualquier **otro** texto recuerda que hay
  algo pendiente (no publica ni va a Fapy).
- [ ] Las fotos de chats no autorizados se rechazan igual que el texto (no se descarga ni
  extrae nada).

### Webhook
- [ ] `POST /telegram/webhook` valida el header `X-Telegram-Bot-Api-Secret-Token` contra
  `TELEGRAM_WEBHOOK_SECRET` (si está configurado), encola el procesamiento en background y
  responde `200` de inmediato.

## Fuera de alcance

- **Editar campos** de la oferta desde Telegram (la confirmación es sí/no; los retoques se
  hacen en el panel después).
- **Audio, documentos u otros adjuntos**: sólo texto y fotos. El resto se ignora.
- **Persistencia**: historial y ofertas pendientes viven en memoria del proceso; se
  pierden en cada redeploy/reinicio de Render. Follow-up si hace falta DB.
- **Dedupe** de updates reentregados por Telegram.

## Notas de implementación

- **Reuso, no duplicación**: la extracción de visión se mueve de
  `app/routers/screenshot_to_job.py` (lógica inline) a `app/services/job_extraction.py`
  (`EXTRACTION_PROMPT`, `parse_extraction_response`, `extract_job_from_image`). El endpoint
  del panel `POST /api/screenshot-job/extract` sigue funcionando, ahora llamando al servicio.
- **Publicación**: `_insert_job(payload, owner_id, "telegram", "automatic")` (en
  `app/routers/job.py`) ya genera embedding, clasifica rubro, tags y dispara el matching.
  `owner_id` se lee de `TELEGRAM_JOB_OWNER_ID` (la cuenta admin dueña de las ofertas).
- **Notificaciones**: la oferta se crea con `isPaid=True` para entrar al camino de
  notificación; el envío real lo gobierna el toggle `matching_emails_enabled` del admin
  (decisión de Juan: si está activado notifica, si no, no). `isPaid` es el mismo flag de
  "destacada" que activa el pago de MercadoPago — aceptable para ofertas curadas por el admin.
- **Aislamiento para tests**: `telegram_bot` y `job_extraction` no importan deps pesadas
  (`requests`/`openai`/`app.routers.job`) en import-time; esos imports son lazy dentro de
  las funciones. `process_update` recibe `agent_chat`, `send`, `conversations`,
  `pending_jobs`, `extract_job`, `download_photo`, `create_job` inyectables → unit sin red.
- **Descarga de la foto**: `getFile` + `https://api.telegram.org/file/bot<token>/<path>`.
- Estado pendiente y procesamiento pesado (visión + matching) corren en el `BackgroundTask`
  del webhook; el 200 sale al instante.
- Env vars nuevas: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_IDS`,
  `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_JOB_OWNER_ID`.
