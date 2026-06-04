"""Ejemplo de test de integración: requiere una DB real.

Se auto-saltea si falta el entorno, así que es seguro tenerlo en el repo.
Está marcado @pytest.mark.integration → NO corre en el gate de CI (que solo corre tests/unit).
Correr a propósito con:  pytest tests/integration -m integration   (con el .env del backend cargado)
"""
import os

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL no seteada; la integración necesita una DB real",
)
def test_database_is_reachable():
    psycopg2 = pytest.importorskip("psycopg2")
    conn = psycopg2.connect(os.environ["DATABASE_URL"], sslmode="require")
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            assert cur.fetchone()[0] == 1
    finally:
        conn.close()
