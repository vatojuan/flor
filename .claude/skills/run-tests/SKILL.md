---
name: run-tests
description: Usar al correr los tests del proyecto, al escribir un test bajo SDD, o antes de un deploy. Explica unit vs integración por app y los comandos exactos. Hoy el harness vive en webflor_backend (pytest); mobile/web lo suman cuando toquen features.
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

## mobile / webflor / webflor_frontend

Todavía sin harness. Al tocar una feature ahí, montar el suyo siguiendo el mismo patrón (spec → test rojo → código → verde):
- `mobile` (Expo): `jest-expo`.
- `webflor` / `webflor_frontend` (Next.js): `vitest`.

## Antes de deployar

Tests verdes son precondición del deploy. Ver skill `deploy-subtree` (gate de CI verde en `origin/master`).
