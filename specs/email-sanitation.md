# Saneo de emails de candidatos/contactos + endurecimiento del extractor

- **Estado:** En implementación
- **Fecha:** 2026-06-04
- **Tipo:** bug + feature (corrige fuga de extracción y limpia datos en prod)
- **Componente:** webflor_backend

## Contexto / problema

La tabla `email_contacts` (lista de mailing del panel admin) tiene emails mal extraídos
de CVs: `escajadilla.elias9@gmail.comexperiencia`, `habilidadesmangiapane2020@gmail.comvilla`,
`agustinpereyra1003@gmail.comauxiliar`, `galdameemi42@gmail.co`, `com@hotmail.com`.

**Causa raíz (auditoría adversarial, ver `[[project_status]]`):**

1. `app/routers/email_db_admin.py` extrae el email del texto del CV con un regex pelado
   `EMAIL_RE = [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` (goloso, **sin recortar**).
   Cuando el PDF pierde el espacio entre el email y la palabra siguiente, el regex se traga
   la palabra entera. Es la **única** vía que escribe `email_contacts` desde texto libre → es la fuga.
2. Hay **3 copias** de `extract_email` (en `email_db_admin.py`, `cv_processing.py`, `cv_upload.py`)
   más el path GPT (`cv_extraction._clean_email`) que tampoco recorta. El módulo canónico
   `app/utils/email_extraction.py` existía pero **ningún router lo usaba**.
3. El recorte canónico **anterior** (lista corta `COMMON_TLDS`, recorte por prefijo) **corrompía
   emails válidos**: `@host.coop`→`@host.co`, `@host.art`→`@host.ar` (peligroso en .ar),
   `@host.community`→`@host.com`. La entrada `comar` era además un TLD inexistente.

## Comportamiento esperado (criterios de aceptación)

### A. Extractor endurecido — `extract_email(text)` (→ `tests/unit/test_email_extraction.py`)

- [ ] Valida la **etiqueta final** del dominio contra el set **completo de IANA**
  (`app/utils/iana_tlds.py`, generado, refrescable con `scripts/gen_tld_data.py`).
- [ ] Si la etiqueta final es un TLD real → **no recorta** (protege `.coop`, `.art`, `.community`,
  `.international`, `.com.ar`, etc.).
- [ ] Si no es un TLD real pero un **prefijo** sí lo es → recorta al **prefijo válido más largo**
  (`gmail.comexperiencia`→`gmail.com`, `example.orgExtra`→`example.org`).
- [ ] Email limpio se devuelve igual. Sin email válido → `None`.
- [ ] Ya **no** existe la entrada `comar`; `.com.ar` se extrae bien porque el texto real trae los puntos.

### B. Clasificación/reparación — `classify_email(stored)` (→ `tests/unit/test_email_sanitize.py`)

Devuelve `(label, repaired)` con `label ∈ {clean, auto_fix, needs_review, invalid}`. Regla dura:
**la salida del recorte es un CANDIDATO, no la verdad.**

- [ ] `auto_fix` **solo** para basura pegada inequívoca tras un TLD completo (`com/org/net/...`),
  con local-part intacto, y donde el resultado **no acorta** la etiqueta a un TLD distinto.
  `repaired` = email recortado. (los 3 `...com<palabra>` de prod).
- [ ] `needs_review` cuando recortar acortaría la etiqueta a otro TLD válido (`.coop`,`.art`,…),
  truncados de proveedor (`gmail.co`), typos (`gmial.com`,`gmail.con`), `comar`, doble punto,
  múltiples emails, espacios internos, dígitos finales ambiguos. **Nunca** se auto-aplica.
- [ ] `invalid` cuando no hay email o el local-part fue devorado (`com@hotmail.com`,
  local == token TLD). `repaired = None` (irrecuperable del string).
- [ ] `clean` cuando ya está bien (incluye subdominios, `+tag`, `.com.ar`, dominios cuyo nombre
  empieza con un TLD como `comercial.com`, `iolab.io`).

### C. Reconexión de vías de ingesta (que no vuelva a pasar)

- [ ] `email_db_admin.py`, `cv_processing.py`, `cv_upload.py` usan el canónico (borran su copia).
- [ ] `cv_extraction._clean_email` pasa el valor de GPT por el canónico.
- [ ] `inbox_scanner._extract_email_from_header` queda anotado (riesgo bajo; headers RFC).

### D. Saneo de la BD — `scripts/sanitize_emails.py` (manual, lo corre Juan)

- [ ] **Dry-run por defecto**; `--apply` para escribir. Siempre emite un CSV `(tabla, id, antes, después, clase, fuente_recuperación)`.
- [ ] `auto_fix` → reescribe en `email_contacts` **y** `User` (decisión de Juan), manejando colisión
  de unique-key (si el limpio ya existe → no pisar, mandar a revisión).
- [ ] `needs_review`/`invalid` → **recuperar el email real desde la fuente** (decisión de Juan:
  "usar el email con el que mandó el CV / se registró"):
  - `User`: re-extraer del CV en GCS (`cvUrl`) con el extractor endurecido.
  - `email_contacts`: cruzar por **teléfono normalizado** (y nombre) contra `User`/`pending_users`
    y usar su email limpio.
  - Si se recupera un email válido → usarlo; si no → marcar `valid = false` (en `email_contacts`)
    / reportar (en `User`) y dejarlo en el CSV para revisión manual.

## Fuera de alcance

- No se reescribe el parser de PDF (la pérdida de espacios es de PyPDF2); se mitiga validando el TLD.
- El cruce por teléfono/nombre es heurístico: solo se usa con coincidencia única y email destino limpio.
- `inbox_scanner` y el path GPT se reconectan defensivamente pero no eran la fuente del bug reportado.

## Notas de implementación

- `app/utils/iana_tlds.py`: GENERADO (no editar). 1437 TLDs, versión IANA 2026-06-04.
- Lógica pura (`extract_email`/`classify_email`/`repair_email`/`normalize_phone`) en
  `app/utils/email_extraction.py` → unit-testeable sin deps pesadas (corre en CI).
- El script de saneo es integración (DB+GCS): lo corre Juan, no es gate de CI.
