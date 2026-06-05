"""Unit tests para app.utils.email_extraction.extract_email (endurecido con IANA).

Spec: specs/email-sanitation.md. Función pura (stdlib + set de TLDs) → corre en CI.
"""
import pytest

from app.utils.email_extraction import extract_email

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "text,expected",
    [
        # --- recorta palabra pegada al TLD (la fuga del bug) ---
        (
            "Mi correo es jonathanguarnier2017@gmail.comExperiencia laboral...",
            "jonathanguarnier2017@gmail.com",
        ),
        ("Correo: persona@example.orgExtra", "persona@example.org"),
        # casos reales de producción
        ("escajadilla.elias9@gmail.comexperiencia", "escajadilla.elias9@gmail.com"),
        ("habilidadesmangiapane2020@gmail.comvilla", "habilidadesmangiapane2020@gmail.com"),
        ("agustinpereyra1003@gmail.comauxiliar", "agustinpereyra1003@gmail.com"),
        # email ya limpio se devuelve igual
        ("Email: hola.mundo123@miempresa.com", "hola.mundo123@miempresa.com"),
        # --- endurecido: NO recorta TLDs reales que empiezan con un prefijo común ---
        ("Mi mail x@estudio.art es", "x@estudio.art"),          # .art no se chopa a .ar
        ("y@cooperativa.coop", "y@cooperativa.coop"),           # .coop no se chopa a .co
        ("z@grupo.community", "z@grupo.community"),             # .community no se chopa a .com
        ("w@red.network", "w@red.network"),                     # .network no se chopa a .net
        ("juan@empresa.com.ar", "juan@empresa.com.ar"),         # multinivel intacto
        ("info@comercial.com", "info@comercial.com"),           # nombre empieza con 'com' pero el TLD es real
        ("z@iolab.io", "z@iolab.io"),
    ],
)
def test_extracts_first_email_hardened(text, expected):
    assert extract_email(text) == expected


def test_returns_none_when_no_email():
    assert extract_email("Sin mail acá.") is None


def test_returns_none_without_tld_dot():
    # "user@dominio" no tiene punto → no es un email válido
    assert extract_email("Otro: user@dominio") is None


def test_unknown_tld_left_untouched():
    # TLD inexistente y sin prefijo conocido → se devuelve tal cual (lo marcará classify)
    assert extract_email("a@host.zzqq") == "a@host.zzqq"
