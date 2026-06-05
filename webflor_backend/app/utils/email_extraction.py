"""Extracción y saneo canónico de emails de CVs/contactos.

Fuente única de verdad. Solo usa stdlib `re` + el set de TLDs de IANA
(`app/utils/iana_tlds.py`, generado), así que es testeable sin las deps pesadas
del backend y corre en CI.

Spec: specs/email-sanitation.md.

Tres niveles:
  - `extract_email(text)`  → saca el primer email de texto libre y recorta basura
                             pegada al TLD, validando la etiqueta final contra IANA
                             (NO chopea TLDs reales como .art/.coop/.community).
  - `classify_email(stored)` → clasifica un valor YA guardado en la BD para el saneo:
                             clean / auto_fix / needs_review / invalid.
  - `normalize_phone(raw)` → clave canónica de teléfono para cruzar contactos.
"""
import re

from app.utils.iana_tlds import VALID_TLDS

# Token de email. El TLD final captura letras de más ([a-zA-Z]{2,}) a propósito,
# para poder detectar y recortar palabras pegadas (gmail.comExperiencia).
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Cuántas letras pegadas hacen falta tras un TLD completo para considerarlo
# "palabra pegada" inequívoca (auto_fix). Por debajo (typos, punto perdido como
# .comar) va a revisión manual. Los 3 casos reales del bug quitan 5/8/11 letras.
_MIN_GLUED_WORD = 4

# Proveedores de correo con su(s) dominio(s) válido(s). Si el dominio usa el nombre
# del proveedor pero NO uno de estos, es casi seguro un truncado/typo → needs_review.
_PROVIDER_DOMAINS = {
    "gmail": {"gmail.com"},
    "googlemail": {"googlemail.com"},
    "hotmail": {"hotmail.com", "hotmail.com.ar", "hotmail.es"},
    "outlook": {"outlook.com", "outlook.com.ar", "outlook.es"},
    "live": {"live.com", "live.com.ar"},
    "yahoo": {"yahoo.com", "yahoo.com.ar", "yahoo.es"},
    "icloud": {"icloud.com"},
    "proton": {"proton.me"},
    "protonmail": {"protonmail.com"},
    "gmx": {"gmx.com", "gmx.net"},
}

# Tokens TLD cortos/no-palabra que como local-part delatan una cola de palabra pegada
# (el nombre real del buzón se perdió: "com@hotmail.com"). Se EXCLUYEN TLDs que sí son
# nombres de buzón plausibles (info@, art@, name@, web@, dev@, shop@...).
_EATEN_LOCAL_TOKENS = {"com", "org", "net", "edu", "gov", "co", "ar", "io", "us", "comar"}

# Typos frecuentes del NOMBRE del proveedor → canónico (para sugerir, no auto-aplicar).
_PROVIDER_TYPOS = {
    "gmial": "gmail", "gmai": "gmail", "gmal": "gmail", "gail": "gmail", "gmaill": "gmail",
    "hotmial": "hotmail", "hotmal": "hotmail", "hotmai": "hotmail", "hotamail": "hotmail",
    "outlok": "outlook", "outloo": "outlook", "yaho": "yahoo", "yahooo": "yahoo",
}


def _trim_to_valid_tld(candidate):
    """Recorta letras pegadas al TLD final usando el set de IANA.

    - Si la etiqueta final ya es un TLD real → se devuelve igual (no toca .art/.coop/...).
    - Si no, recorta al prefijo de TLD válido más largo (gmail.comExtra → gmail.com).
    - Si ningún prefijo es TLD válido → se devuelve igual (lo marcará classify_email).
    """
    last_dot = candidate.rfind(".")
    if last_dot == -1:
        return candidate
    head = candidate[: last_dot + 1]          # incluye el punto
    label = candidate[last_dot + 1:]          # letras tras el último punto
    low = label.lower()
    if low in VALID_TLDS:
        return candidate
    for i in range(len(low), 1, -1):          # prefijo válido más largo
        if low[:i] in VALID_TLDS:
            return head + label[:i]
    return candidate


def extract_email(text):
    """Extrae el primer email de `text` y recorta basura pegada al TLD.

    Devuelve None si no encuentra algo con forma `usuario@dominio.tld`.
    """
    if not text:
        return None
    cleaned = re.sub(r"[\r\n\t]+", " ", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    match = _EMAIL_RE.search(cleaned)
    if not match:
        return None
    return _trim_to_valid_tld(match.group(0))


def _provider_issue(domain):
    """Si el dominio aparenta ser un proveedor conocido pero mal escrito/truncado,
    devuelve el dominio canónico sugerido; si está bien o no es proveedor, None."""
    labels = domain.lower().split(".")
    if len(labels) < 2:
        return None
    sld = labels[-2]
    if sld in _PROVIDER_DOMAINS and domain.lower() not in _PROVIDER_DOMAINS[sld]:
        return f"{sld}.com"
    if sld in _PROVIDER_TYPOS:
        return f"{_PROVIDER_TYPOS[sld]}.com"
    return None


def classify_email(stored):
    """Clasifica un email YA almacenado para el saneo de la BD.

    Devuelve `(label, value)`:
      - ("clean", email)          ya está bien, no tocar.
      - ("auto_fix", repaired)    SEGURO de reescribir sin intervención.
      - ("needs_review", hint)    sospechoso; `hint` es una sugerencia (o None). NO auto-aplicar.
      - ("invalid", None)         irrecuperable desde el string (re-extraer del CV / manual).

    Principio duro: la salida del recorte es un CANDIDATO, nunca la verdad.
    """
    if not stored or not str(stored).strip():
        return ("invalid", None)
    s = str(stored).strip()

    # Dos o más emails distintos en una sola celda → humano decide cuál es el bueno.
    found = {m.lower() for m in _EMAIL_RE.findall(s)}
    if len(found) >= 2:
        return ("needs_review", None)

    match = _EMAIL_RE.search(s)
    if not match:
        return ("invalid", None)
    raw = match.group(0)

    # Palabra pegada por un espacio justo antes del local-part → el local real se perdió.
    pre = s[: match.start()]
    if pre and pre[-1].isspace() and pre.rstrip() and pre.rstrip()[-1].isalnum():
        return ("needs_review", None)

    local, _, domain = raw.rpartition("@")
    # local-part vacío o cola de palabra pegada (com@hotmail.com) → identidad devorada.
    if not local or local.lower() in _EATEN_LOCAL_TOKENS:
        return ("invalid", None)
    if ".." in domain or domain.startswith(".") or domain.endswith("."):
        return ("needs_review", None)

    raw_label = domain.rsplit(".", 1)[-1].lower()
    repaired = extract_email(s)
    if repaired is None:
        return ("invalid", None)
    trimmed_label = repaired.rpartition("@")[2].rsplit(".", 1)[-1].lower()

    if raw_label not in VALID_TLDS:
        # El TLD final no es real: ¿basura pegada (auto_fix) o typo/punto perdido (review)?
        removed = len(raw_label) - len(trimmed_label)
        if trimmed_label in VALID_TLDS and raw_label.startswith(trimmed_label) and removed >= _MIN_GLUED_WORD:
            return ("auto_fix", repaired)
        return ("needs_review", None)

    # raw_label ES un TLD real → dominio estructuralmente completo.
    issue = _provider_issue(domain)
    if issue:
        return ("needs_review", f"{local}@{issue}")

    # Alfanumérico pegado justo después de un TLD completo (host.com2) → intención desconocida.
    after = s[match.end(): match.end() + 1]
    if after.isalnum():
        return ("needs_review", None)

    if repaired == s:
        return ("clean", repaired)
    # Solo difería envoltorio/prosa/puntuación externa al token → reparación no destructiva.
    return ("auto_fix", repaired)


def normalize_phone(raw):
    """Clave canónica de teléfono argentino para cruzar contactos.

    Quita prefijos de país (54), troncal (0) y celular (9) y se queda con los
    últimos 10 dígitos. Devuelve "" si quedan menos de 8 dígitos (no sirve para cruzar).
    """
    if not raw:
        return ""
    d = re.sub(r"\D", "", str(raw))
    if len(d) > 10 and d.startswith("54"):
        d = d[2:]
    d = d.lstrip("0")
    if len(d) == 11 and d.startswith("9"):
        d = d[1:]
    if len(d) < 8:
        return ""
    return d[-10:] if len(d) >= 10 else d
