"""Unit tests para app.services.admin_users_query.

Spec: specs/admin-editar-db-rubro-preview.md. Módulo puro (solo arma SQL+params y
mapea mimes) → corre en CI sin DB ni deps pesadas.
"""
import pytest

from app.services.admin_users_query import (
    build_user_filters,
    guess_content_type,
    is_previewable,
    strip_accents,
)

pytestmark = pytest.mark.unit


# --- strip_accents ---------------------------------------------------------

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Gastronomía", "Gastronomia"),
        ("ALBAÑILERÍA", "ALBANILERIA"),
        ("construcción", "construccion"),
        ("sin tildes", "sin tildes"),
        ("", ""),
    ],
)
def test_strip_accents(raw, expected):
    assert strip_accents(raw) == expected


def test_strip_accents_handles_none():
    assert strip_accents(None) == ""


# --- build_user_filters ----------------------------------------------------

def test_build_user_filters_empty():
    where, params = build_user_filters("", "")
    assert where == ""
    assert params == []


def test_build_user_filters_search_only():
    where, params = build_user_filters("juan", "")
    assert where.startswith("WHERE ")
    # matchea name/email/phone + rubro accent-insensitive
    assert "LOWER(name) LIKE %s" in where
    assert "LOWER(email) LIKE %s" in where
    assert "LOWER(phone) LIKE %s" in where
    assert "translate(rubro" in where
    assert "ILIKE %s" in where
    assert "AND" not in where  # una sola cláusula
    # 3 LOWER LIKE (lowercased) + 1 rubro (accent-stripped)
    assert params == ["%juan%", "%juan%", "%juan%", "%juan%"]


def test_build_user_filters_search_lowercases_name_and_strips_accents_for_rubro():
    where, params = build_user_filters("Gastronomía", "")
    # name/email/phone usan LOWER() → término en minúsculas con tilde original.
    # rubro usa ILIKE (case-insensitive) + strip_accents → preserva mayúsculas, sin tilde.
    assert params == [
        "%gastronomía%",
        "%gastronomía%",
        "%gastronomía%",
        "%Gastronomia%",
    ]


def test_build_user_filters_rubro_only():
    where, params = build_user_filters("", "Gastronomía")
    assert where.startswith("WHERE ")
    assert "translate(rubro" in where
    assert "LOWER(name)" not in where
    assert params == ["%Gastronomia%"]


def test_build_user_filters_both_joined_with_and():
    where, params = build_user_filters("juan", "Construcción")
    assert " AND " in where
    # search primero, rubro después
    assert params == [
        "%juan%",
        "%juan%",
        "%juan%",
        "%juan%",
        "%Construccion%",
    ]


# --- guess_content_type ----------------------------------------------------

@pytest.mark.parametrize(
    "filename,expected",
    [
        ("cv.pdf", "application/pdf"),
        ("CV.PDF", "application/pdf"),
        ("foto.jpg", "image/jpeg"),
        ("foto.jpeg", "image/jpeg"),
        ("logo.png", "image/png"),
        ("anim.gif", "image/gif"),
        ("img.webp", "image/webp"),
        ("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("notas.txt", "text/plain"),
        ("raro.xyz", "application/octet-stream"),
        ("sin_extension", "application/octet-stream"),
        ("", "application/octet-stream"),
    ],
)
def test_guess_content_type(filename, expected):
    assert guess_content_type(filename) == expected


# --- is_previewable --------------------------------------------------------

@pytest.mark.parametrize(
    "content_type,expected",
    [
        ("application/pdf", True),
        ("image/png", True),
        ("image/jpeg", True),
        ("application/octet-stream", False),
        ("text/plain", False),
        ("", False),
    ],
)
def test_is_previewable(content_type, expected):
    assert is_previewable(content_type) is expected
