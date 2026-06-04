---
name: deploy-subtree
description: Usar al deployar a producción cualquier app del monorepo (webflor, webflor_backend, webflor_frontend). Hace git subtree split + push al repo de producción correspondiente. Incluye el gate de CI verde y las branches correctas (webflor=master, resto=main).
---

# Deploy por subtree a producción

El monorepo `flor` se deploya empujando cada subdirectorio a su repo de producción separado. Vercel/Render auto-deployan desde esos repos.

## Gate previo (obligatorio — "no deploy sin verde")

1. Estar en `master` con el árbol limpio (`git status`).
2. Tests verdes localmente: ver skill `run-tests` (al menos `pytest tests/unit` en `webflor_backend`).
3. **CI verde en `origin/master`**: `git push origin master` y confirmar que el workflow de GitHub Actions pasó antes de empujar a producción. Verificar con `gh run list --branch master --limit 1` (o en la pestaña Actions del repo `vatojuan/flor`).

Si CI está en rojo, **no** se empuja a producción. Se arregla primero.

## Mapa app → repo → branch

| Prefix | Remote | Repo | Branch | Hosting |
|--------|--------|------|--------|---------|
| `webflor/` | `production-webflor` | vatojuan/plataforma-empleo | **master** | Vercel |
| `webflor_frontend/` | `production-frontend` | vatojuan/webflor_frontend | **main** | Vercel |
| `webflor_backend/` | `production-backend` | vatojuan/webflor_backend | **main** | Render |

⚠️ Las branches difieren: `webflor` usa `master`, los otros dos `main`. Empujar a la branch equivocada solo genera un Preview deploy, no Production.

## Comandos (split + push forzado)

```bash
# webflor (Vercel - master)
git subtree split --prefix=webflor -b tmp && git push production-webflor tmp:master --force && git branch -D tmp

# webflor_frontend (Vercel - main)
git subtree split --prefix=webflor_frontend -b tmp && git push production-frontend tmp:main --force && git branch -D tmp

# webflor_backend (Render - main)
git subtree split --prefix=webflor_backend -b tmp && git push production-backend tmp:main --force && git branch -D tmp
```

## Después de deployar

- Confirmar el deploy en el dashboard de Vercel/Render.
- Si la app que se deployó tiene migraciones nuevas en `webflor_backend/migrations/`, aplicarlas según la skill `db-migration`.

Contexto en memoria: [[project_monorepo]], [[feedback_subtree_branches]].
