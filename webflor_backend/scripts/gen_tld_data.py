"""Genera app/utils/iana_tlds.py a partir de la lista oficial de IANA.

Reproducible: vuelve a correr esto cuando quieras refrescar el set de TLDs.

    python scripts/gen_tld_data.py

El set se usa en app/utils/email_extraction.py para decidir si la etiqueta
final de un dominio es un TLD real (y así NO recortar dominios válidos como
`.art`, `.coop`, `.community`) o basura pegada que hay que recortar
(`gmail.comExperiencia` -> `gmail.com`).
"""
import textwrap
import urllib.request
from pathlib import Path

URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt"
OUT = Path(__file__).resolve().parent.parent / "app" / "utils" / "iana_tlds.py"


def main():
    raw = urllib.request.urlopen(URL, timeout=30).read().decode("utf-8")
    lines = raw.splitlines()
    version = lines[0].lstrip("# ").strip() if lines and lines[0].startswith("#") else "unknown"
    tlds = sorted(s.strip().lower() for s in lines if s and not s.startswith("#"))

    joined = ", ".join(repr(t) for t in tlds)
    body = textwrap.fill(
        joined,
        width=96,
        initial_indent="    ",
        subsequent_indent="    ",
        break_long_words=False,
        break_on_hyphens=False,  # no partir tokens punycode 'xn--...'
    )

    header = (
        '"""Set de TLDs vigentes de IANA — ARCHIVO GENERADO, no editar a mano.\n\n'
        f"Fuente: {URL}\n"
        f"{version}\n"
        "Regenerar: python scripts/gen_tld_data.py\n"
        '"""\n\n'
    )
    OUT.write_text(header + "VALID_TLDS = frozenset({\n" + body + "\n})\n", encoding="utf-8")
    print(f"Escrito {OUT} con {len(tlds)} TLDs ({version})")


if __name__ == "__main__":
    main()
