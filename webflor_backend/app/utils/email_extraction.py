"""Extracción canónica de email desde texto de CV.

Fuente única de verdad para `extract_email` (hoy duplicada en varios routers).
Solo usa stdlib `re`, así que es testeable sin las deps pesadas del backend.

Spec: specs/email-extraction.md.
"""
import re

# TLDs comunes (en minúsculas) usados para recortar texto pegado al final del dominio.
COMMON_TLDS = {"com", "org", "net", "edu", "gov", "io", "co", "us", "ar", "comar"}


def extract_email(text):
    """Extrae el primer email del texto y recorta cualquier texto extra pegado al TLD.

    Usa COMMON_TLDS para decidir dónde cortar cuando hay basura pegada al dominio.

    Ejemplos:
      "jonathanguarnier2017@gmail.comExperiencia laboral..." -> "jonathanguarnier2017@gmail.com"
      "persona@example.orgExtra"                             -> "persona@example.org"
      "prueba@empresa.comarDoc adicional"                    -> "prueba@empresa.comar"

    Devuelve None si no encuentra un email con la forma `usuario@dominio.tld`.
    """
    # 1. Limpieza básica: eliminar saltos y reducir espacios.
    cleaned_text = re.sub(r'[\r\n\t]+', ' ', text)
    cleaned_text = re.sub(r'\s{2,}', ' ', cleaned_text)

    # 2. Candidato a email que puede traer letras extra pegadas al TLD.
    pattern = r'\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[A-Za-z]*'
    match = re.search(pattern, cleaned_text)
    if not match:
        return None
    candidate = match.group(0)

    # 3. Último punto = comienzo del TLD.
    last_dot = candidate.rfind('.')
    if last_dot == -1:
        return candidate

    # 4. Secuencia de letras desde el último punto hasta el primer carácter no alfabético.
    tld_contig = ""
    for ch in candidate[last_dot + 1:]:
        if ch.isalpha():
            tld_contig += ch
        else:
            break

    # 5. Buscar el TLD válido más largo (de hasta 8 letras hacia abajo, mínimo 2).
    max_length = min(9, len(tld_contig) + 1)
    valid_tld = None
    for i in range(max_length - 1, 1, -1):
        possible_tld = tld_contig[:i].lower()
        if possible_tld in COMMON_TLDS:
            valid_tld = possible_tld
            break

    if valid_tld:
        # Recortar justo hasta el final del TLD válido.
        return candidate[:last_dot + 1 + len(valid_tld)]
    return candidate
