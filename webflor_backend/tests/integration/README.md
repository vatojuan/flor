# tests/integration

Tests que tocan **servicios reales** (DB / Supabase / OpenAI / GCS). A diferencia de `tests/unit`:

- Se marcan con `@pytest.mark.integration`.
- Se **auto-saltean** si falta el entorno (env vars / credenciales), para que sea seguro tenerlos en el repo.
- **No** corren en el gate de CI (el CI solo corre `tests/unit`, sin las deps pesadas del backend).

## Correrlos

```bash
# con el .env del backend cargado (DATABASE_URL, credenciales, etc.)
pytest tests/integration -m integration
```

`test_db_smoke.py` es la plantilla: skip si no hay `DATABASE_URL`, `importorskip` del driver, y un `SELECT 1`. Copiar ese patrón para nuevos tests de integración.
