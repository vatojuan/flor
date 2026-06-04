---
name: db-migration
description: Usar al crear o aplicar una migración de base de datos del backend (Postgres / Supabase). Las migraciones son SQL idempotente en webflor_backend/migrations/, se aplican a mano y en orden contra la DB de producción. No hay runner automático.
---

# Migraciones de base de datos

El backend (`webflor_backend`) usa PostgreSQL (Supabase). **No hay framework de migraciones ni runner automático**: las migraciones son archivos `.sql` que se aplican manualmente.

## Convenciones

- Ubicación: `webflor_backend/migrations/`.
- Nombre descriptivo: `add_<qué>.sql` (ej. `add_reviews_favorites.sql`, `add_enhanced_job_fields.sql`).
- **SQL idempotente**: usar siempre `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` para que re-correr sea seguro.
- Encabezado con un comentario que diga qué hace y contra qué DB se corre.
- Las tablas existentes con mayúscula van entre comillas: `"User"`, `"Job"`.

## Crear una migración (bajo SDD)

1. Si la migración acompaña una feature, primero el spec en `specs/` y el test de la lógica que la usa.
2. Escribir el `.sql` idempotente en `migrations/`.
3. Probarlo contra una DB de desarrollo antes de prod.

## Aplicar a producción

No hay comando del repo que las corra. Aplicar **en orden** una de estas formas:

- **Supabase SQL Editor**: pegar el contenido del `.sql` y ejecutar.
- **psql**: `psql "$DATABASE_URL" -f webflor_backend/migrations/<archivo>.sql`
  (el connection string está en el `.env` del backend; nunca commitearlo).

Por ser idempotentes, aplicar dos veces no rompe. Confirmar el cambio (p. ej. `\d+ "Job"`) después de correrlas.

Estado de migraciones pendientes: ver [[project_status]].
