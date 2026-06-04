# specs/ — Spec-Driven Development

Regla dura del proyecto: **feature nueva o bug → primero un spec corto acá + un test que falla → recién después el código → test verde.** (Ver `CLAUDE.md` raíz.)

El spec no es documentación pesada: es un acuerdo corto de *qué* tiene que pasar, que se traduce en tests. Un archivo por feature/bug: `specs/<nombre-kebab>.md`.

## Flujo

1. Escribir el spec (plantilla abajo). Definir los criterios de aceptación como afirmaciones verificables.
2. Traducir cada criterio a un test que **falle** (rojo) en `tests/unit/` (o `tests/integration/` si necesita servicios reales).
3. Escribir el código mínimo para pasar a **verde**.
4. Refactor con los tests en verde.

## Plantilla

```markdown
# <título>

- **Estado:** Borrador | Aprobado | Implementado
- **Fecha:** YYYY-MM-DD
- **Tipo:** feature | bugfix
- **Componente:** webflor_backend | mobile | webflor | webflor_frontend

## Contexto / problema
Qué falta o qué está mal, y por qué importa.

## Comportamiento esperado (criterios de aceptación)
- [ ] Criterio 1 — concreto y verificable (→ `tests/unit/test_x.py::test_...`)
- [ ] Criterio 2

## Fuera de alcance
Lo que este spec NO toca (para no hacer scope creep).

## Notas de implementación
Decisiones, edge cases, follow-ups.
```
