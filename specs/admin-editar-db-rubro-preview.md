# Editar BD admin: filtro por rubro + previsualización de contacto y archivos

- **Estado:** Aprobado
- **Fecha:** 2026-06-04
- **Tipo:** feature
- **Componente:** webflor_backend + webflor_frontend

## Contexto / problema

En el panel admin, **Editar Base de Datos** (`webflor_frontend/pages/admin/editar_db.js`)
lista clientes con su rubro, pero:

1. El buscador del backend (`app/routers/admin_users.py::list_users`) sólo filtra por
   `name`/`email`/`phone`. **No se puede filtrar por rubro**, aunque la columna existe.
2. Para ver la descripción de un contacto hay que entrar al diálogo de **edición** (no hay
   vista de sólo lectura).
3. Los archivos subidos sólo se pueden **descargar / abrir en pestaña** (`window.open` de la
   signed URL). No hay forma de **previsualizarlos embebidos** sin bajarlos.

Juan quiere: filtrar por rubro (dropdown + que el buscador también matchee rubro),
previsualizar la info del contacto en modo lectura, y ver PDFs/imágenes embebidos.

## Comportamiento esperado (criterios de aceptación)

### Backend — helpers puros (`app/services/admin_users_query.py`)
- [ ] `strip_accents(text)` quita tildes/ñ→n para matching insensible a acentos
  (`'Gastronomía' → 'Gastronomia'`). (→ `tests/unit/test_admin_users_query.py`)
- [ ] `build_user_filters(search, rubro)` devuelve `(where_sql, params)`:
  - Sin filtros → `("", [])`.
  - Sólo `search` → una cláusula que matchea `name`/`email`/`phone` (LOWER LIKE) **y** `rubro`
    (accent-insensitive vía `translate(...) ILIKE`); 4 params.
  - Sólo `rubro` (dropdown) → cláusula `translate(rubro, ...) ILIKE %s`; 1 param.
  - Ambos → las dos cláusulas unidas con `AND`; params en orden (search primero).
- [ ] `guess_content_type(filename)` mapea por extensión: `pdf→application/pdf`,
  `jpg/jpeg→image/jpeg`, `png→image/png`, desconocido/sin-extensión→`application/octet-stream`,
  case-insensitive.
- [ ] `is_previewable(content_type)` es `True` para `application/pdf` e `image/*`, `False` para
  el resto.

### Backend — endpoints (`app/routers/admin_users.py`)
- [ ] `GET /admin/users` acepta `rubro` y aplica el filtro combinado vía `build_user_filters`.
- [ ] `GET /admin/users/rubros` devuelve `{"rubros": [...]}` con los rubros **distintos**, no
  vacíos, ordenados alfabéticamente.
- [ ] `GET /admin/users/files/{file_id}/signed-url` acepta `disposition` (`inline` por defecto |
  `attachment`), setea `response_disposition`/`response_type` en la URL firmada y devuelve
  `{url, filename, content_type, previewable}` (retrocompatible: `url` sigue presente).

### Frontend — helpers puros (`webflor_frontend/lib/filePreview.js`)
- [ ] `getPreviewKind(filename, contentType)` → `'pdf' | 'image' | 'unsupported'`: usa el
  content-type; si viene vacío o `application/octet-stream`, cae a la extensión del nombre.
  (→ `lib/filePreview.test.js`)
- [ ] `buildUsersQuery({page, limit, search, rubro})` arma el querystring con `page+1` y omite
  `search`/`rubro` cuando están vacíos.

### Frontend — UI (`editar_db.js`, validación manual)
- [ ] Dropdown "Rubro" (carga desde `/admin/users/rubros`, opción "Todos") que filtra la tabla.
- [ ] El buscador de texto también matchea por rubro (label actualizado).
- [ ] Acción "Ver" (sólo lectura) que muestra nombre, email, teléfono, rubro y descripción
  completa, más la lista de archivos con botón de preview.
- [ ] Preview de archivo embebido (iframe para PDF, img para imagen) sin descargar; con botones
  "Descargar" (disposition=attachment) y "Abrir en pestaña".

## Fuera de alcance

- **Editar el rubro** desde el panel (sólo se filtra/visualiza; el rubro lo asigna el pipeline).
- Preview de formatos no estándar (docx, etc.): se muestran como "no previsualizable" con
  opción de descargar.
- Migración de DB: la columna `rubro` ya existe → **sin cambios de schema**.
- Harness de render del front (jsdom/testing-library): por ahora sólo se testean los helpers
  puros; la UI se valida a mano. Follow-up si hace falta cobertura de componentes.

## Notas de implementación

- **Reuso**: la técnica accent-insensitive (`translate(rubro, 'áéíóúñüÁÉÍÓÚÑÜ',
  'aeiounuAEIOUNU') ILIKE` + `strip_accents`) es la misma del admin agent
  (`app/services/agent_tools.py`). El módulo nuevo es liviano (sólo stdlib) para correr en CI
  sin deps pesadas, igual que `app/services/admin_settings.py`.
- **Aislamiento para tests**: `build_user_filters` no toca DB (sólo arma SQL+params); los
  helpers del front son funciones puras → vitest en `environment: 'node'` sin jsdom.
- **Preview inline**: la signed URL de GCS con `response_disposition='inline'` hace que el
  navegador renderice el PDF/imagen en vez de forzar descarga; `attachment` fuerza la bajada.
