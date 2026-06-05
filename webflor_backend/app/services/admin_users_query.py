"""Helpers puros para el listado y los archivos de Editar BD (admin_users).

Módulo liviano a propósito: solo stdlib (`unicodedata`, `os`). No abre conexiones ni
importa deps pesadas, así los tests unitarios corren en CI igual que
`app.services.admin_settings`. Acá vive únicamente el armado de SQL+params y el mapeo
de mimes; el router (`app.routers.admin_users`) hace el I/O.

Spec: specs/admin-editar-db-rubro-preview.md.
"""
from __future__ import annotations

import os
import unicodedata

# Mapa de acentos para `translate()` en Postgres (misma técnica que app.services.
# agent_tools): ILIKE es case-insensitive pero no accent-insensitive, así que buscar
# "Gastronomia" no matchearía "Gastronomía" guardado en la DB.
_ACCENT_SRC = "áéíóúñüÁÉÍÓÚÑÜ"
_ACCENT_DST = "aeiounuAEIOUNU"

_RUBRO_MATCH = f"translate(rubro, '{_ACCENT_SRC}', '{_ACCENT_DST}') ILIKE %s"

_MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
}


def strip_accents(text: str) -> str:
    """Quita tildes/diacríticos para matching insensible a acentos.

    `'Gastronomía' → 'Gastronomia'`. Acepta None/"" → "".
    """
    nfkd = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def build_user_filters(search: str = "", rubro: str = ""):
    """Arma el WHERE para listar usuarios en Editar BD.

    Devuelve `(where_sql, params)` listo para interpolar en el `FROM "User"`:
    - `search`: matchea name/email/phone (LOWER LIKE) **y** rubro (accent-insensitive).
    - `rubro`: filtro del dropdown, accent-insensitive sobre la columna rubro.
    - Sin filtros → `("", [])`.

    Los params van en orden: primero los de `search`, después el de `rubro`.
    """
    clauses = []
    params: list = []

    if search:
        term = f"%{search.lower()}%"
        clauses.append(
            "(LOWER(name) LIKE %s OR LOWER(email) LIKE %s OR LOWER(phone) LIKE %s "
            f"OR {_RUBRO_MATCH})"
        )
        params += [term, term, term, f"%{strip_accents(search)}%"]

    if rubro:
        clauses.append(_RUBRO_MATCH)
        params.append(f"%{strip_accents(rubro)}%")

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where_sql, params


def guess_content_type(filename: str) -> str:
    """Mime por extensión del nombre. Desconocido/sin-extensión → octet-stream."""
    _, ext = os.path.splitext((filename or "").lower())
    return _MIME_BY_EXT.get(ext, "application/octet-stream")


def is_previewable(content_type: str) -> bool:
    """True si el navegador puede mostrarlo embebido (PDF o imagen)."""
    ct = content_type or ""
    return ct == "application/pdf" or ct.startswith("image/")
