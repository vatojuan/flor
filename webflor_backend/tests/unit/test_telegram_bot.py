"""Unit tests para app.services.telegram_bot.

Spec: specs/telegram-fapy.md. Las funciones puras (parse_message, is_authorized) no
hacen I/O; process_update se prueba con agent_chat y send stubbeados → sin OpenAI ni
red, corre en CI.
"""
import pytest

from app.services import telegram_bot

pytestmark = pytest.mark.unit


def _text_update(chat_id, text, key="message"):
    """Construye un update de Telegram con un mensaje de texto."""
    return {
        "update_id": 1,
        key: {
            "message_id": 9,
            "chat": {"id": chat_id, "type": "private"},
            "text": text,
        },
    }


class _Recorder:
    """Captura las llamadas a send(chat_id, text)."""

    def __init__(self):
        self.sent = []

    def send(self, chat_id, text):
        self.sent.append((chat_id, text))


# --- parse_message ---

def test_parse_message_extracts_chat_id_and_text():
    assert telegram_bot.parse_message(_text_update(123, "hola")) == (123, "hola")


def test_parse_message_handles_edited_message():
    upd = _text_update(123, "editado", key="edited_message")
    assert telegram_bot.parse_message(upd) == (123, "editado")


@pytest.mark.parametrize(
    "update",
    [
        {},                                                # sin message
        {"message": {"chat": {"id": 1}}},                  # message sin text (ej. foto)
        {"message": {"chat": {"id": 1}, "text": "   "}},   # text en blanco
        {"message": {"text": "hola"}},                     # sin chat
        {"callback_query": {"id": "x"}},                   # otro tipo de update
        None,                                              # no-dict
        "nope",                                            # no-dict
    ],
)
def test_parse_message_returns_none_for_non_text(update):
    assert telegram_bot.parse_message(update) is None


# --- is_authorized ---

def test_is_authorized_reads_allowlist(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "8976510363, 42")
    assert telegram_bot.is_authorized(8976510363) is True
    assert telegram_bot.is_authorized(42) is True
    assert telegram_bot.is_authorized(999) is False


def test_is_authorized_closed_by_default(monkeypatch):
    monkeypatch.delenv("TELEGRAM_ALLOWED_CHAT_IDS", raising=False)
    assert telegram_bot.is_authorized(8976510363) is False


# --- process_update ---

def test_process_update_rejects_unauthorized(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "1")
    rec = _Recorder()
    calls = []
    telegram_bot.process_update(
        _text_update(999, "hola"),
        agent_chat=lambda msgs: calls.append(msgs) or "no deberia",
        send=rec.send,
        conversations={},
    )
    assert calls == []                       # el agente NO se invocó
    assert len(rec.sent) == 1
    assert rec.sent[0][0] == 999
    assert "autoriz" in rec.sent[0][1].lower()


def test_process_update_authorized_calls_agent_and_replies(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    seen = {}

    def fake_agent(msgs):
        seen["msgs"] = [dict(m) for m in msgs]
        return "respuesta de fapy"

    telegram_bot.process_update(
        _text_update(5, "cuantos candidatos hay?"),
        agent_chat=fake_agent,
        send=rec.send,
        conversations={},
    )
    # el agente recibió el mensaje del usuario como último turno
    assert seen["msgs"][-1] == {"role": "user", "content": "cuantos candidatos hay?"}
    # la respuesta se envió al chat
    assert rec.sent == [(5, "respuesta de fapy")]


def test_process_update_keeps_history(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    convos = {}

    def first_agent(msgs):
        return "r1"

    telegram_bot.process_update(
        _text_update(5, "primero"), agent_chat=first_agent, send=rec.send, conversations=convos
    )

    captured = []

    def second_agent(msgs):
        captured.append([dict(m) for m in msgs])
        return "r2"

    telegram_bot.process_update(
        _text_update(5, "segundo"), agent_chat=second_agent, send=rec.send, conversations=convos
    )

    # en el segundo turno el historial incluye el primer intercambio + el mensaje nuevo
    roles = [(m["role"], m["content"]) for m in captured[0]]
    assert ("user", "primero") in roles
    assert ("assistant", "r1") in roles
    assert ("user", "segundo") in roles


def test_process_update_start_sends_welcome_without_agent(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    calls = []
    telegram_bot.process_update(
        _text_update(5, "/start"),
        agent_chat=lambda m: calls.append(m) or "x",
        send=rec.send,
        conversations={},
    )
    assert calls == []                       # /start no invoca al agente
    assert len(rec.sent) == 1 and rec.sent[0][0] == 5


def test_process_update_ignores_non_text(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    telegram_bot.process_update(
        {"message": {"chat": {"id": 5}}},    # sin texto
        agent_chat=lambda m: "x",
        send=rec.send,
        conversations={},
    )
    assert rec.sent == []


def test_process_update_truncates_history(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    monkeypatch.setattr(telegram_bot, "MAX_HISTORY_MESSAGES", 4)
    rec = _Recorder()
    convos = {}
    for i in range(5):
        telegram_bot.process_update(
            _text_update(5, f"msg{i}"), agent_chat=lambda m: "ok", send=rec.send, conversations=convos
        )
    # cada turno agrega 2 (user+assistant); con cap 4 quedan los 2 últimos pares
    assert len(convos[5]) == 4
    assert convos[5][-2] == {"role": "user", "content": "msg4"}
    assert convos[5][-1] == {"role": "assistant", "content": "ok"}


# --- fotos / publicación de ofertas ---

def _photo_update(chat_id, file_id="BIG"):
    """Update con una foto (varios PhotoSize; el último es el de mayor resolución)."""
    return {
        "update_id": 2,
        "message": {
            "message_id": 10,
            "chat": {"id": chat_id, "type": "private"},
            "photo": [
                {"file_id": "small", "width": 90, "height": 60},
                {"file_id": file_id, "width": 1280, "height": 720},
            ],
        },
    }


def test_parse_photo_takes_highest_resolution():
    assert telegram_bot.parse_photo(_photo_update(7, "BIG")) == (7, "BIG")


@pytest.mark.parametrize(
    "update",
    [
        {"message": {"chat": {"id": 1}, "text": "hola"}},   # texto, no foto
        {"message": {"chat": {"id": 1}, "photo": []}},       # photo vacío
        {"message": {"photo": [{"file_id": "x"}]}},          # sin chat
        {},
    ],
)
def test_parse_photo_returns_none(update):
    assert telegram_bot.parse_photo(update) is None


def test_build_job_payload_maps_fields_and_sets_paid():
    extracted = {
        "title": "Mozo/a", "description": "Para restaurante", "requirements": "Experiencia",
        "rubro": "Gastronomia", "contactEmail": "a@b.com", "contactPhone": "123",
        "location": "Centro", "salary": "$300.000",
    }
    p = telegram_bot.build_job_payload(extracted)
    assert p["title"] == "Mozo/a"
    assert p["isPaid"] is True
    assert p["rubro"] == "Gastronomia"
    assert p["contactEmail"] == "a@b.com"
    assert "300.000" in p["description"]   # el sueldo libre se anexa a la descripción


def test_photo_from_authorized_extracts_and_waits_confirmation(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    pending = {}
    created = []
    extracted = {"success": True, "job": {"title": "Cajero", "description": "d", "rubro": "Comercio/Ventas"}}
    telegram_bot.process_update(
        _photo_update(5, "F1"),
        send=rec.send,
        pending_jobs=pending,
        download_photo=lambda fid: (b"bytes", "image/jpeg"),
        extract_job=lambda b, mt: extracted,
        create_job=lambda *a, **k: created.append(a) or (1, ""),
        conversations={},
    )
    assert 5 in pending          # quedó pendiente de confirmación
    assert created == []         # NO publicó todavía
    assert any("public" in t.lower() for _, t in rec.sent)   # pidió confirmación


def test_photo_extraction_failure_leaves_nothing_pending(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    pending = {}
    telegram_bot.process_update(
        _photo_update(5, "F1"),
        send=rec.send,
        pending_jobs=pending,
        download_photo=lambda fid: (b"bytes", "image/jpeg"),
        extract_job=lambda b, mt: {"success": False, "error": "No se detecta una oferta"},
        conversations={},
    )
    assert pending == {}
    assert rec.sent  # avisó algo


def test_confirmation_publishes_pending_job(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    monkeypatch.setenv("TELEGRAM_JOB_OWNER_ID", "42")
    rec = _Recorder()
    payload = {"title": "Cajero", "description": "d", "isPaid": True}
    pending = {5: payload}
    captured = {}

    def fake_create(p, owner_id, source, label):
        captured["args"] = (p, owner_id, source, label)
        return 99, ""

    telegram_bot.process_update(
        _text_update(5, "sí"),
        send=rec.send,
        pending_jobs=pending,
        create_job=fake_create,
        agent_chat=lambda m: "no deberia",
        conversations={},
    )
    assert captured["args"][1] == 42           # owner_id desde env
    assert captured["args"][2] == "telegram"   # source
    assert 5 not in pending                     # limpió el pendiente
    assert any("99" in t for _, t in rec.sent)  # avisó el ID


def test_confirmation_negative_discards(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    pending = {5: {"title": "x", "description": "y"}}
    created = []
    telegram_bot.process_update(
        _text_update(5, "no"),
        send=rec.send,
        pending_jobs=pending,
        create_job=lambda *a, **k: created.append(a),
        agent_chat=lambda m: "x",
        conversations={},
    )
    assert 5 not in pending
    assert created == []


def test_pending_blocks_agent_chat(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    pending = {5: {"title": "x", "description": "y"}}
    agent_calls = []
    created = []
    telegram_bot.process_update(
        _text_update(5, "contame un chiste"),
        send=rec.send,
        pending_jobs=pending,
        create_job=lambda *a, **k: created.append(a),
        agent_chat=lambda m: agent_calls.append(m) or "x",
        conversations={},
    )
    assert agent_calls == []      # no fue a Fapy
    assert created == []          # no publicó
    assert 5 in pending           # sigue pendiente


def test_photo_from_unauthorized_does_not_extract(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ALLOWED_CHAT_IDS", "5")
    rec = _Recorder()
    touched = []
    telegram_bot.process_update(
        _photo_update(999, "F1"),
        send=rec.send,
        pending_jobs={},
        download_photo=lambda fid: touched.append(fid) or (b"", "image/jpeg"),
        extract_job=lambda b, mt: touched.append("x") or {"success": True, "job": {}},
        conversations={},
    )
    assert touched == []          # no descargó ni extrajo nada
    assert any("autoriz" in t.lower() for _, t in rec.sent)
