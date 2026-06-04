# Toggle de envío de mails de coincidencia (matching)

- **Estado:** Aprobado
- **Fecha:** 2026-06-04
- **Tipo:** feature
- **Componente:** webflor_backend (+ webflor_frontend para el toggle de UI)

## Contexto / problema
Estamos haciendo pruebas publicando ofertas desde el panel admin. Hoy, al publicar
una oferta **paga**, el matching se calcula y se disparan automáticamente los mails de
coincidencia a los candidatos (`run_matching_for_job` → `_send_match_notifications`).
Durante las pruebas no queremos que salgan esos mails a candidatos reales.

Necesitamos un interruptor en las configuraciones del admin para frenar el **envío de
mails de coincidencia**, sin perder el cálculo de matches (así se siguen viendo en
`/admin/matchins` y se pueden enviar a mano cuando terminen las pruebas).

## Comportamiento esperado (criterios de aceptación)
- [ ] Nueva flag de config `matching_emails_enabled` en la tabla `admin_config`
      (reusa el sistema clave-valor existente; no requiere migración).
- [ ] `matching_emails_enabled(cur)` devuelve **True por defecto** cuando la key no existe
      (no romper el comportamiento histórico en prod) — (→ `tests/unit/test_admin_settings.py`)
- [ ] Devuelve `False` solo cuando el valor guardado es `"false"` (case-insensitive),
      `True` cuando es `"true"`/`"TRUE"` — (→ `tests/unit/test_admin_settings.py`)
- [ ] Con la flag en OFF, **no se envía ningún mail de coincidencia**:
      - automático al publicar oferta paga (`_send_match_notifications` corta y devuelve 0),
      - manual masivo (`POST /api/match/send-notifications/{job_id}`),
      - reenvío individual (`POST /api/match/resend/{match_id}` responde 403).
- [ ] El cálculo y guardado de matches **sigue funcionando** con la flag en OFF.
- [ ] El panel `/admin/configuraciones` tiene un Switch para prender/apagar la flag.

## Fuera de alcance
- No se cambian los umbrales (`MATCH_THRESHOLD`, `NOTIFY_THRESHOLD`).
- No se toca el matching por usuario (`run_matching_for_user`) que ya no manda mails.
- Harness de tests de `webflor_frontend` (vitest): queda como deuda; el toggle de UI
  reusa el patrón existente de `configuraciones.js`.

## Notas de implementación
- La lógica decisoria vive en `app/services/admin_settings.py` (módulo liviano, solo
  recibe un cursor) para que el test unitario corra en CI sin `SECRET_KEY` ni deps
  pesadas (importar `app.routers.match` arrastra `app.core.auth`, que exige `SECRET_KEY`).
- Default **True** = histórico: si la key nunca se seteó, los mails salen como siempre.
