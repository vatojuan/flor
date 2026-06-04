"""Unit tests para app.utils.email_extraction.extract_email.

Spec: specs/email-extraction.md. Función pura (solo stdlib) → corre sin deps pesadas.
"""
import pytest

from app.utils.email_extraction import extract_email

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "text,expected",
    [
        # recorta texto pegado al TLD usando la lista de TLDs comunes
        (
            "Mi correo es jonathanguarnier2017@gmail.comExperiencia laboral...",
            "jonathanguarnier2017@gmail.com",
        ),
        ("Correo: persona@example.orgExtra", "persona@example.org"),
        ("Dirección: prueba@empresa.comarDoc adicional", "prueba@empresa.comar"),
        # email ya limpio se devuelve igual
        ("Email: hola.mundo123@miempresa.com", "hola.mundo123@miempresa.com"),
    ],
)
def test_extracts_first_email_trimming_glued_text(text, expected):
    assert extract_email(text) == expected


def test_returns_none_when_no_email():
    assert extract_email("Sin mail acá.") is None


def test_returns_none_without_tld_dot():
    # "user@dominio" no tiene punto → no es un email válido
    assert extract_email("Otro: user@dominio") is None
