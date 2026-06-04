# Extracción de email desde texto de CV

- **Estado:** Implementado
- **Fecha:** 2026-06-04
- **Tipo:** feature (módulo canónico + tests) — también estrena el harness de SDD
- **Componente:** webflor_backend

## Contexto / problema

Al procesar CVs (PDF/DOCX/TXT) hay que extraer el email del candidato del texto crudo. El texto suele venir con basura **pegada al TLD** (ej. `juan@gmail.comExperiencia laboral...`), así que un regex de email simple devuelve dominio contaminado.

Hoy la función `extract_email` está **copiada en 3 routers** (`cv_processing.py`, `cv_upload.py`, `email_db_admin.py`) con dos comportamientos distintos. Este spec define la versión canónica y la cubre con tests.

## Comportamiento esperado (criterios de aceptación)

- [x] Extrae el primer email del texto. (→ `tests/unit/test_email_extraction.py`)
- [x] Recorta texto extra pegado al TLD usando una lista de TLDs comunes:
  - `...jonathanguarnier2017@gmail.comExperiencia...` → `jonathanguarnier2017@gmail.com`
  - `persona@example.orgExtra` → `persona@example.org`
  - `prueba@empresa.comarDoc adicional` → `prueba@empresa.comar`
- [x] Email limpio sin basura se devuelve igual: `hola.mundo123@miempresa.com`.
- [x] Si no hay email válido (sin `@dominio.tld`) → `None`. Ej. `"Sin mail acá."` y `"user@dominio"` (sin punto) → `None`.

## Fuera de alcance

- **NO** se reconectan los 3 routers a este módulo todavía: es un refactor que cambia comportamiento (uno de ellos lowercasea, otro no) y requiere OK explícito de Juan. Follow-up registrado en memoria [[project_status]].
- No se cambia el set de TLDs ni el manejo de `.com.ar` (la entrada `comar` es intencional para datos malformados de CVs reales).

## Notas de implementación

- Módulo canónico: `app/utils/email_extraction.py` (solo stdlib `re` → testeable sin deps pesadas, corre en CI).
- Comportamiento idéntico a la "versión corregida" que ya estaba en `cv_processing.py`.
