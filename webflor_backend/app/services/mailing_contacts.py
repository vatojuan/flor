"""Detalle de un contacto del mailing: perfil + CV/documentos cargados.

Función pura sobre un cursor (no abre conexión propia) para poder testear en
CI sin DB real, igual que `app.services.admin_settings`.

Spec: specs/mailing-contact-detail.md
"""
from typing import Optional

# Campos del perfil que exponemos en el detalle (sin datos sensibles).
# El orden debe coincidir con el desempaquetado posicional de abajo.
_PROFILE_SQL = (
    'SELECT id, name, email, phone, rubro, description, "cvUrl", '
    '"profilePicture", "createdAt" '
    'FROM "User" WHERE id = %s'
)

# Documentos cargados por el candidato (CV y otros), más recientes primero.
# Se devuelve el id para poder pedir la URL firmada de descarga
# (GET /admin/users/files/{id}/signed-url).
_DOCS_SQL = (
    'SELECT id, url, "originalName" '
    'FROM "EmployeeDocument" WHERE "userId" = %s '
    'ORDER BY "createdAt" DESC'
)


def build_contact_detail(cur, user_id: int) -> Optional[dict]:
    """Arma el detalle completo de un contacto, o None si no existe.

    Incluye datos de contacto, descripción, CV (`cvUrl`) y los documentos
    cargados (`files`), cada uno con su `id` para la descarga firmada.
    """
    cur.execute(_PROFILE_SQL, (user_id,))
    row = cur.fetchone()
    if not row:
        return None

    contact = {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "phone": row[3],
        "rubro": row[4],
        "description": row[5],
        "cvUrl": row[6],
        "profilePicture": row[7],
        "createdAt": row[8],
    }

    cur.execute(_DOCS_SQL, (user_id,))
    contact["files"] = [
        {"id": r[0], "url": r[1], "filename": r[2]} for r in cur.fetchall()
    ]
    return contact
