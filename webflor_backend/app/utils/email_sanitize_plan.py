"""Planificador puro del saneo de emails (sin I/O).

Decide, por fila, qué hacer con un email almacenado a partir de su clasificación
(`classify_email`) y de un email opcional ya recuperado de la fuente (CV/registro).
Separado del script para poder testearlo en CI sin DB ni GCS.

Spec: specs/email-sanitation.md (sección D).
"""
from app.utils.email_extraction import classify_email, normalize_phone

# Acciones posibles sobre una fila:
SKIP = "skip"        # ya está bien
UPDATE = "update"    # reescribir el email (seguro: trim inequívoco o recuperado de la fuente)
FLAG = "flag"        # email_contacts: marcar valid=false (sacar del mailing)
REPORT = "report"    # User: solo reportar (no se toca la columna de identidad sin email nuevo)


def build_phone_index(user_rows):
    """Índice {clave_telefono -> [emails limpios]} a partir de filas de User.

    `user_rows`: iterable de (email, phone, name). Solo entran emails que ya están
    'clean' (para no propagar basura). Sirve para recuperar el email de un contacto
    de email_contacts cruzando por teléfono.
    """
    index = {}
    for email, phone, _name in user_rows:
        if not email:
            continue
        if classify_email(email)[0] != "clean":
            continue
        key = normalize_phone(phone)
        if not key:
            continue
        index.setdefault(key, [])
        if email.lower() not in index[key]:
            index[key].append(email.lower())
    return index


def recover_by_phone(phone, phone_index):
    """Devuelve el email recuperado si hay una ÚNICA coincidencia por teléfono; si no, None."""
    key = normalize_phone(phone)
    if not key:
        return None
    matches = phone_index.get(key)
    if matches and len(matches) == 1:
        return matches[0]
    return None


def plan_action(table, row_id, email, *, recovered=None, existing_emails=frozenset(),
                name=None, phone=None):
    """Decide la acción para una fila. Función pura.

    - table: 'email_contacts' | 'User'
    - email: valor actual almacenado
    - recovered: email recuperado de la fuente (CV/registro/teléfono) o None
    - existing_emails: set de emails ya presentes en la tabla (lowercase) para detectar colisión

    Devuelve un dict con: action, table, id, before, after, classification, source, note.
    """
    label, value = classify_email(email)
    cur = (email or "").strip().lower()

    def out(action, after=None, source="", note=""):
        return {
            "action": action, "table": table, "id": row_id, "before": email,
            "after": after, "classification": label, "source": source, "note": note,
            "name": name, "phone": phone,
        }

    if label == "clean":
        return out(SKIP, after=cur, source="ya-ok")

    if label == "auto_fix":
        target = (value or "").lower()
        if not target or target == cur:
            return out(SKIP, after=cur, source="sin-cambio")
        if target in existing_emails:
            return out(FLAG if table == "email_contacts" else REPORT,
                       after=None, source="trim", note=f"colisión con {target}")
        return out(UPDATE, after=target, source="trim")

    # needs_review / invalid → intentar usar el email recuperado de la fuente.
    # El recuperado se valida (y repara si hace falta): solo se usa si queda limpio.
    if recovered:
        rlabel, rvalue = classify_email(recovered)
        rec = None
        if rlabel == "clean":
            rec = recovered.strip().lower()
        elif rlabel == "auto_fix":
            rec = (rvalue or "").lower()
        if rec and rec != cur:
            if rec in existing_emails:
                return out(FLAG if table == "email_contacts" else REPORT,
                           after=None, source="recuperado", note=f"colisión con {rec}")
            return out(UPDATE, after=rec, source="recuperado")

    # sin recuperación posible
    if table == "email_contacts":
        return out(FLAG, after=None, source="sin-fuente",
                   note=f"sugerencia: {value}" if value else "irrecuperable")
    return out(REPORT, after=None, source="sin-fuente",
               note=f"sugerencia: {value}" if value else "irrecuperable")
