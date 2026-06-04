# FAP RRHH — Guía de trabajo (CLAUDE.md)

Monorepo de la plataforma de RRHH de FAP Mendoza. Son 4 apps independientes; el deploy se hace por `git subtree push` a 3 repos de producción separados.

## Componentes

| Dir | Qué es | Stack | Deploy |
|-----|--------|-------|--------|
| `webflor/` | Plataforma / landing (candidatos + empleadores) | Next.js 15 + Prisma + NextAuth + PostgreSQL + GCS | Vercel ← `production-webflor` (branch **master**) |
| `webflor_backend/` | API | FastAPI (Python 3.11) + Supabase + OpenAI + embeddings | Render ← `production-backend` (branch **main**) |
| `webflor_frontend/` | Panel admin | Next.js 15 | Vercel ← `production-frontend` (branch **main**) |
| `mobile/` | App móvil | Expo / React Native + TypeScript | — (sin store todavía) |

Detalle vivo en memoria (`[[project_monorepo]]`, `[[project_stack]]`) y en la skill `deploy-subtree`. `origin` = `github.com/vatojuan/flor.git` (acá corre CI).

## Cómo trabajo en este repo (reglas duras)

### 1. SDD — Spec-Driven Development (obligatorio para feature nueva o bug)

1. **Spec corto** en `specs/` (plantilla en `specs/README.md`).
2. **Test que falla** primero (rojo).
3. Recién ahí, el **código**.
4. **Test verde.**

- **Unitarios** (`tests/unit/`): puros, con stubs, sin servicios externos. Corren en cualquier lado y en CI.
- **Integración** (`tests/integration/`): servicios reales (DB / Supabase / OpenAI / GCS). Se auto-saltean si falta el entorno; **no** son gate de CI.
- Política: **no se deploya sin test verde.** El deploy verifica CI verde en `origin/master` antes del subtree push (lo exige la skill `deploy-subtree`).
- Alcance actual: el harness vive en `webflor_backend` (pytest). Al tocar features en `mobile` / `webflor` / `webflor_frontend`, montar su harness ahí (jest-expo / vitest) con el mismo patrón. SDD aplica **de acá en más**; el código viejo se testea cuando se toca.

### 2. Skills

Procedimiento repetido o con reglas no obvias (deploy, migración, correr tests, checklist de seguridad) → documentarlo en `.claude/skills/<nombre>/SKILL.md`. La `description` del frontmatter dice **cuándo** usar la skill (el trigger). Existentes: `deploy-subtree`, `db-migration`, `run-tests`.

### 3. Memoria persistente

Hechos **no derivables** del código ni de git (quién es el usuario, correcciones + el porqué, decisiones de producto/infra, constraints de prod) → carpeta `memory/` con índice `MEMORY.md`. Un archivo por hecho, fechas absolutas, sin duplicar. Antes de crear, revisar si ya existe y actualizar.

## Contexto operativo

- Usuario: **Juan** (`vatojuan`), habla español, **delega las operaciones de git**. Respondé en español.
- Deploy = subtree push a 3 repos. **Ojo con las branches**: `webflor` usa `master`, los otros dos usan `main`. Ver skill `deploy-subtree`.
- Migraciones de DB: SQL idempotente en `webflor_backend/migrations/`, manual y en orden. Ver skill `db-migration`.
