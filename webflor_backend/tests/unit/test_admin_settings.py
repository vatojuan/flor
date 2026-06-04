"""Unit tests para app.services.admin_settings.

Spec: specs/matching-emails-toggle.md. Módulo liviano (solo recibe un cursor) →
corre en CI sin SECRET_KEY ni deps pesadas.
"""
import pytest

from app.services.admin_settings import get_bool_setting, matching_emails_enabled

pytestmark = pytest.mark.unit


class FakeCursor:
    """Cursor mínimo: guarda la última query/params y devuelve un row fijo."""

    def __init__(self, row):
        self._row = row
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self._row


def test_matching_emails_enabled_default_true_when_key_absent():
    # Key no existe en admin_config → fetchone devuelve None → default True (histórico)
    cur = FakeCursor(None)
    assert matching_emails_enabled(cur) is True


def test_matching_emails_enabled_false_when_value_false():
    cur = FakeCursor(("false",))
    assert matching_emails_enabled(cur) is False


@pytest.mark.parametrize("value", ["true", "TRUE", "True", " true "])
def test_matching_emails_enabled_true_for_truthy_values(value):
    cur = FakeCursor((value,))
    assert matching_emails_enabled(cur) is True


def test_matching_emails_enabled_queries_correct_key():
    cur = FakeCursor(("false",))
    matching_emails_enabled(cur)
    sql, params = cur.executed[-1]
    assert "admin_config" in sql
    assert params == ("matching_emails_enabled",)


def test_get_bool_setting_uses_default_when_none_row():
    assert get_bool_setting(FakeCursor(None), "whatever", default=False) is False
    assert get_bool_setting(FakeCursor(None), "whatever", default=True) is True


def test_get_bool_setting_uses_default_when_value_is_null():
    # Fila existe pero value es NULL → default
    assert get_bool_setting(FakeCursor((None,)), "k", default=True) is True
