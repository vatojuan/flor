"""Lectura de flags de configuración del admin (tabla admin_config).

Módulo liviano a propósito: recibe un cursor ya abierto y solo usa stdlib, así los
tests unitarios corren en CI sin SECRET_KEY ni deps pesadas (a diferencia de los
routers, que arrastran app.core.auth / jose / passlib al importarse).

La tabla admin_config es un store clave→valor de strings ("true"/"false").
"""
from __future__ import annotations


def get_bool_setting(cur, key: str, default: bool = False) -> bool:
    """Lee una flag booleana de admin_config con el cursor dado.

    Devuelve `default` si la key no existe o su valor es NULL. Cualquier otro valor
    se interpreta como booleano: "true"/"TRUE"/" true " → True, el resto → False.
    """
    cur.execute("SELECT value FROM admin_config WHERE key = %s", (key,))
    row = cur.fetchone()
    if row is None or row[0] is None:
        return default
    return str(row[0]).strip().lower() == "true"


def matching_emails_enabled(cur) -> bool:
    """True si el admin tiene habilitado el envío de mails de coincidencia.

    Default True = comportamiento histórico: si la flag nunca se seteó, los mails
    salen como siempre (no romper prod). Se apaga desde /admin/configuraciones para
    frenar los mails durante pruebas de publicación de ofertas.
    """
    return get_bool_setting(cur, "matching_emails_enabled", default=True)
