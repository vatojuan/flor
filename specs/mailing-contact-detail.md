# Detalle de contacto en el mailing (CV + info de contacto)

- **Estado:** Aprobado
- **Fecha:** 2026-06-04
- **Tipo:** feature
- **Componente:** webflor_backend + webflor_frontend

## Contexto / problema
En el panel de mailing del admin (`webflor_frontend/pages/admin/mailing.js`) hoy solo se ven
columnas planas: en **Contactos** (nombre, email, teléfono, rubro) y en **Ver miembros** de un
grupo (nombre, email, rubro). El admin no puede ver el **CV cargado** ni la **descripción** ni el
resto de la info de contacto de cada persona sin salir a otra pantalla. Hace falta poder abrir el
detalle de un contacto desde ambos lugares.

## Comportamiento esperado (criterios de aceptación)
- [ ] Existe `GET /api/mailing/contacts/{user_id}` (admin only) que devuelve el detalle de un
      contacto: `id, name, email, phone, rubro, description, cvUrl, profilePicture, createdAt` y
      `files` (documentos cargados desde `EmployeeDocument`, cada uno `{id, url, filename}`).
      (→ `tests/unit/test_mailing_contacts.py`)
- [ ] El detalle incluye la **descripción** y la **info de contacto** (email, teléfono, rubro).
- [ ] El detalle incluye el **CV**: `cvUrl` (link directo) y la lista de documentos cargados con su
      `id`, para descargarlos con el endpoint firmado existente
      `GET /admin/users/files/{file_id}/signed-url`.
- [ ] Si el contacto no existe, la función devuelve `None` (el endpoint responde 404) y **no**
      consulta documentos.
- [ ] En el front, tanto en **Contactos** como en **Ver miembros** de un grupo, cada fila tiene una
      acción "Ver detalle" que abre un diálogo con esa info y botones para ver/descargar el CV y los
      documentos.

## Fuera de alcance
- No se toca el flujo de envío ni la creación de grupos.
- No se agrega harness de tests JS a `webflor_frontend` todavía (el cambio de front es
  presentacional; el harness JS queda como follow-up cuando se profundice ahí). La lógica nueva
  testeable vive en el backend.
- No se exponen datos sensibles extra (password, tokens, etc.).

## Notas de implementación
- La lógica de armado del detalle va en `app/services/mailing_contacts.py` como **función pura sobre
  un cursor** (`build_contact_detail(cur, user_id)`), igual que `app.services.admin_settings`, para
  testear en CI sin DB real.
- La descarga segura de documentos reusa la ruta firmada ya existente en `admin_users.py`
  (`/admin/users/files/{file_id}/signed-url`, signed URL de 15 min de GCS) — no se crea endpoint
  nuevo de descarga.
- `cvUrl` es una URL pública de GCS (el perfil público del candidato la abre directo con `href`), así
  que el botón "Ver CV" puede apuntar directo a `cvUrl`.
