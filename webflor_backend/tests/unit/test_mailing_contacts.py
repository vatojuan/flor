"""Unit tests para app.services.mailing_contacts.

Spec: specs/mailing-contact-detail.md. Función pura sobre un cursor →
corre en CI sin DB real (mismo patrón que test_admin_settings).
"""
import pytest

from app.services.mailing_contacts import build_contact_detail

pytestmark = pytest.mark.unit


class FakeCursor:
    """Cursor fake: encola un resultado por cada execute() (FIFO).

    Cada item de `results` es un dict {"one": row} y/o {"all": rows}, en el
    orden en que el código hace los execute().
    """

    def __init__(self, results):
        self._results = list(results)
        self._current = {}
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        self._current = self._results.pop(0) if self._results else {}

    def fetchone(self):
        return self._current.get("one")

    def fetchall(self):
        return self._current.get("all", [])


# Fila de perfil en el orden del SELECT de build_contact_detail:
# id, name, email, phone, rubro, description, cvUrl, profilePicture, createdAt
_PROFILE_ROW = (
    7, "Ana Gómez", "ana@example.com", "+542610000000", "Gastronomía",
    "Mozo con 5 años de experiencia",
    "https://storage.googleapis.com/bucket/ana-cv.pdf",
    None, "2026-01-02T10:00:00",
)


def test_returns_none_when_contact_not_found():
    cur = FakeCursor([{"one": None}])
    assert build_contact_detail(cur, 999) is None


def test_does_not_query_documents_when_contact_missing():
    cur = FakeCursor([{"one": None}])
    build_contact_detail(cur, 7)
    # Corta tras no encontrar el perfil: solo 1 query.
    assert len(cur.executed) == 1


def test_includes_contact_info_and_description():
    cur = FakeCursor([{"one": _PROFILE_ROW}, {"all": []}])
    detail = build_contact_detail(cur, 7)
    assert detail["id"] == 7
    assert detail["name"] == "Ana Gómez"
    assert detail["email"] == "ana@example.com"
    assert detail["phone"] == "+542610000000"
    assert detail["rubro"] == "Gastronomía"
    assert detail["description"] == "Mozo con 5 años de experiencia"


def test_includes_cv_url():
    cur = FakeCursor([{"one": _PROFILE_ROW}, {"all": []}])
    detail = build_contact_detail(cur, 7)
    assert detail["cvUrl"] == "https://storage.googleapis.com/bucket/ana-cv.pdf"


def test_includes_uploaded_documents_with_id_for_signed_url():
    docs = [
        (101, "https://storage.googleapis.com/bucket/cv.pdf", "cv.pdf"),
        (102, "https://storage.googleapis.com/bucket/dni.pdf", "dni.pdf"),
    ]
    cur = FakeCursor([{"one": _PROFILE_ROW}, {"all": docs}])
    detail = build_contact_detail(cur, 7)
    assert detail["files"] == [
        {"id": 101, "url": "https://storage.googleapis.com/bucket/cv.pdf", "filename": "cv.pdf"},
        {"id": 102, "url": "https://storage.googleapis.com/bucket/dni.pdf", "filename": "dni.pdf"},
    ]


def test_queries_user_and_employee_documents_by_id():
    cur = FakeCursor([{"one": _PROFILE_ROW}, {"all": []}])
    build_contact_detail(cur, 7)
    assert len(cur.executed) == 2
    profile_sql, profile_params = cur.executed[0]
    docs_sql, docs_params = cur.executed[1]
    assert '"User"' in profile_sql and profile_params == (7,)
    assert '"EmployeeDocument"' in docs_sql and docs_params == (7,)
