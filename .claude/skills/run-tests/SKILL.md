---
name: run-tests
description: Usar al correr los tests del proyecto, al escribir un test bajo SDD, o antes de un deploy. Explica unit vs integración por app y los comandos exactos. Harness activo en webflor_backend (pytest) y webflor_frontend (vitest); mobile/webflor lo suman cuando toquen features.
---

# Correr los tests

Convención SDD: **unitarios** (puros, con stubs, corren en cualquier lado y en CI) viven en `tests/unit/`; **integración** (servicios reales: DB/Supabase/OpenAI/GCS) en `tests/integration/` y se auto-saltean si falta el entorno.

## webflor_backend (pytest) — el harness activo

Desde `webflor_backend/`:

```bash
# instalar deps de test (una vez)
pip install -r requirements-dev.txt

# unitarios (rápidos, sin servicios externos) — esto es lo que corre el CI
pytest tests/unit

# integración (requiere .env con credenciales reales)
pytest tests/integration -m integration

# todo
pytest
```

Notas:
- Config en `webflor_backend/pyproject.toml` (`[tool.pytest.ini_options]`): `pythonpath=["."]` para importar `app...`, markers `unit`/`integration`.
- Los unitarios **no** deben importar deps pesadas (torch/openai/supabase); por eso CI instala solo `requirements-dev.txt`, no `requirements.txt`.

## webflor_frontend (vitest) — harness activo para helpers puros

Desde `webflor_frontend/`:

```bash
npm install   # una vez (trae vitest)
npm test      # vitest run
```

Notas:
- Config en `webflor_frontend/vitest.config.js`: `environment: 'node'`, `include: ['lib/**/*.test.js']`.
- Por ahora solo se testea **lógica pura** en `lib/` (ej. `lib/filePreview.js` ↔ `lib/filePreview.test.js`). La UI/MUI se valida a mano; si hace falta cubrir componentes, sumar `jsdom` + `@testing-library/react`.

## mobile / webflor

Todavía sin harness. Al tocar una feature ahí, montar el suyo siguiendo el mismo patrón (spec → test rojo → código → verde):
- `mobile` (Expo): `jest-expo`.
- `webflor` (Next.js): `vitest` (mismo patrón que `webflor_frontend`).

## Antes de deployar

Tests verdes son precondición del deploy. Ver skill `deploy-subtree` (gate de CI verde en `origin/master`).
