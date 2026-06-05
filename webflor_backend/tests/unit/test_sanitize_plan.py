"""Unit tests del planificador puro de saneo (app.utils.email_sanitize_plan).

Spec: specs/email-sanitation.md (sección D). Sin DB ni GCS → corre en CI.
"""
import pytest

from app.utils.email_sanitize_plan import (
    SKIP, UPDATE, FLAG, REPORT,
    plan_action, build_phone_index, recover_by_phone,
)

pytestmark = pytest.mark.unit


# ───────────────────────── auto_fix (trim inequívoco) ─────────────────────────
def test_glued_autofix_updates_in_email_contacts():
    a = plan_action("email_contacts", 1, "escajadilla.elias9@gmail.comexperiencia")
    assert a["action"] == UPDATE
    assert a["after"] == "escajadilla.elias9@gmail.com"
    assert a["source"] == "trim"


def test_glued_autofix_updates_in_user_table_too():
    a = plan_action("User", 7, "agustinpereyra1003@gmail.comauxiliar")
    assert a["action"] == UPDATE
    assert a["after"] == "agustinpereyra1003@gmail.com"


def test_autofix_collision_does_not_overwrite():
    # el limpio ya existe en la tabla → no pisar, marcar
    a = plan_action(
        "email_contacts", 2, "agustinpereyra1003@gmail.comauxiliar",
        existing_emails={"agustinpereyra1003@gmail.com"},
    )
    assert a["action"] == FLAG
    assert a["after"] is None
    assert "colisión" in a["note"]


# ───────────────────────── clean ─────────────────────────
def test_clean_is_skipped():
    a = plan_action("email_contacts", 3, "persona@empresa.com.ar")
    assert a["action"] == SKIP


# ───────────────────────── needs_review / invalid + recuperación ─────────────────────────
def test_invalid_without_recovery_flags_in_email_contacts():
    a = plan_action("email_contacts", 4, "com@hotmail.com")
    assert a["action"] == FLAG
    assert a["after"] is None


def test_invalid_without_recovery_only_reports_in_user_table():
    # User no tiene columna 'valid' → solo se reporta, no se toca la identidad
    a = plan_action("User", 5, "com@hotmail.com")
    assert a["action"] == REPORT
    assert a["after"] is None


def test_invalid_with_recovered_email_updates():
    a = plan_action("email_contacts", 6, "com@hotmail.com",
                    recovered="humberto.oliveira@hotmail.com")
    assert a["action"] == UPDATE
    assert a["after"] == "humberto.oliveira@hotmail.com"
    assert a["source"] == "recuperado"


def test_needs_review_truncado_recuperado_por_telefono():
    a = plan_action("email_contacts", 8, "galdameemi42@gmail.co",
                    recovered="galdameemi42@gmail.com")
    assert a["action"] == UPDATE
    assert a["after"] == "galdameemi42@gmail.com"


def test_recovered_email_dirty_but_fixable_is_repaired():
    # si lo "recuperado" viene con basura pegada PERO es arreglable → se usa reparado
    a = plan_action("email_contacts", 9, "com@hotmail.com",
                    recovered="otra@gmail.comExtra")
    assert a["action"] == UPDATE
    assert a["after"] == "otra@gmail.com"


def test_recovered_email_unrecoverable_is_ignored():
    # si lo "recuperado" es dudoso/irrecuperable (no clean ni auto_fix) → cae a FLAG
    a = plan_action("email_contacts", 9, "com@hotmail.com",
                    recovered="otro@gmail.co")   # needs_review (truncado de proveedor)
    assert a["action"] == FLAG


def test_recovered_collision_does_not_overwrite():
    a = plan_action("email_contacts", 10, "com@hotmail.com",
                    recovered="ya.existe@gmail.com",
                    existing_emails={"ya.existe@gmail.com"})
    assert a["action"] == FLAG
    assert "colisión" in a["note"]


# ───────────────────────── índice de teléfonos ─────────────────────────
def test_phone_index_only_clean_and_dedup():
    rows = [
        ("juan@gmail.com", "+54 9 261 592 5106", "Juan"),
        ("juan@gmail.com", "0261 5925106", "Juan"),         # mismo email, otra forma de tel
        ("roto@gmail.comExtra", "261 111 2222", "Roto"),    # sucio → no entra
    ]
    idx = build_phone_index(rows)
    assert idx["2615925106"] == ["juan@gmail.com"]
    assert "2611112222" not in idx                          # email sucio no indexado


def test_recover_by_phone_single_vs_multiple():
    idx = {"2615925106": ["juan@gmail.com"], "2613135974": ["a@x.com", "b@y.com"]}
    assert recover_by_phone("+54 9 261 592 5106", idx) == "juan@gmail.com"
    assert recover_by_phone("261 3135974", idx) is None     # ambiguo → no recupera
    assert recover_by_phone("000", idx) is None
