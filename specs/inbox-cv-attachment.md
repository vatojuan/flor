# Inbox scanner: adjuntar el CV al perfil + etiquetado robusto

- **Estado:** Aprobado
- **Fecha:** 2026-06-04
- **Tipo:** bugfix
- **Componente:** webflor_backend

## Contexto / problema

El scanner de la bandeja (`app/services/inbox_scanner.py`) lee la casilla por IMAP,
clasifica los mails y, cuando detecta un CV, crea la cuenta del candidato. Hay dos fallas:

1. **El CV no llega al perfil.** `_process_cv_attachment` crea el `User` pero **nunca**
   sube el PDF a GCS ni inserta el registro en `EmployeeDocument`. El perfil del candidato
   muestra sus documentos desde `EmployeeDocument` (vía `/api/employee/documents`), así que
   el archivo queda solo en el mail y **no aparece en la cuenta**. Tampoco genera embeddings,
   por lo que esos candidatos no entran al matching por similitud. (Comparar con el flujo
   correcto en `routers/cv_confirm.py::confirm_email` y `routers/cv_admin_upload.py`.)

2. **Muchos mails quedan sin etiqueta.** `_label_email` tiene un `except: pass` que se traga
   todos los errores sin loguear, **no chequea el status** que devuelve `mail.store`
   (Gmail puede responder `NO` sin lanzar excepción) y la categoría `OTRO` no tiene etiqueta
   en el mapa, así que esos mails nunca se etiquetan. No hay forma de diagnosticar la falla.

Saneamiento: los PDFs de las cuentas ya creadas **solo existen en el inbox** (nunca se
subieron a GCS), no se pueden recuperar de la DB. Por eso el scanner se hace **idempotente**:
al re-escanear, si el usuario ya existe pero **no tiene `EmployeeDocument`**, sube el CV del
mail y lo adjunta. Un `scan-all` con `scan_all=true` repara todas las cuentas viejas.

## Comportamiento esperado (criterios de aceptación)

### Adjuntar CV al perfil (`persist_cv_account`)
- [ ] Usuario nuevo → sube el PDF (vía `upload_pdf` inyectable), inserta `User` con `"cvUrl"`
  y `embedding`, inserta `EmployeeDocument` (lo que ve el perfil), inserta `FileEmbedding`
  y manda credenciales. Devuelve `status="created"`. (→ `tests/unit/test_inbox_scanner.py`)
- [ ] **Siempre** se crea el `EmployeeDocument` apuntando al `fileKey` subido — sin esto el
  CV no aparece en el perfil (el bug original).
- [ ] **Saneamiento:** usuario ya existe **sin** `EmployeeDocument` → sube y adjunta el CV,
  completa `cvUrl`/`embedding` si faltan, **no** re-crea la cuenta ni reenvía credenciales.
  Devuelve `status="attached"`.
- [ ] Usuario ya existe **con** `EmployeeDocument` → no hace nada (idempotente). Devuelve
  `status="exists"`. Garantiza que re-escanear no duplique documentos.
- [ ] Embeddings **best-effort**: si `make_embedding` falla, igual se crea la cuenta y se
  adjunta el archivo (no bloquea); se omiten las columnas/filas de embedding.

### Etiquetado robusto (`_label_email`)
- [ ] Cada categoría conocida (incluida **`OTRO`**) tiene etiqueta y aplica el
  `+X-GM-LABELS` correcto; devuelve `True`.
- [ ] Si `mail.store` devuelve un status distinto de `OK`, **loguea un warning** y devuelve
  `False` (antes lo ignoraba en silencio).
- [ ] Categoría sin etiqueta mapeada → devuelve `False` sin tocar el buzón.

### Visibilidad de cuántos faltan + procesar todo (`_select_email_ids`)
- [ ] El scan reporta `total_found` (cuántos mails matchearon la búsqueda) y `remaining`
  (cuántos quedaron sin procesar por el tope) — antes truncaba en silencio y no se sabía
  cuántos faltaban. (→ `tests/unit/test_inbox_scanner.py`)
- [ ] Scan **incremental** (`scan_all=False`, UNSEEN del cron): procesa los más recientes
  hasta `max_emails`; `remaining = total - max_emails` cuando hay más.
- [ ] **Sincronización histórica** (`scan_all=True`): procesa **todo el inbox sin tope**
  (ignora `max_emails`); `remaining = 0`. Así la "Sincronización inicial" del panel procesa
  el 100% y el número que se muestra es el total real.
- [ ] `max_emails <= 0` también significa "sin tope" (procesar todos los encontrados).

## Fuera de alcance
- Cambiar la heurística de clasificación (`_classify_email`).
- Backfill de embeddings de cuentas viejas más allá de lo que repara el re-scan.
- UI del panel admin.

## Notas de implementación
- La lógica de persistencia se extrae a `persist_cv_account(cur, conn, *, ..., upload_pdf,
  make_embedding, gen_password, send_credentials)` con I/O inyectable, igual que el patrón de
  `telegram_bot.process_update` → testeable con `FakeCursor`/stubs, sin GCS/OpenAI en CI.
- Clientes GCS/OpenAI se inicializan **lazy** (no a nivel módulo) para que importar el
  scanner no requiera credenciales en CI.
- `User.embedding` se pasa como lista directa y `FileEmbedding` usa `%s::vector`, igual que
  `cv_confirm.confirm_email` (código probado en prod).
- El nombre del blob se prefija con un slug del email para evitar pisar CVs de otros
  candidatos (`employee-documents/<slug>_<archivo>.pdf`).
- Operación de saneamiento: `POST /api/inbox/scan-all?scan_all=true&max_emails=<N>`.
