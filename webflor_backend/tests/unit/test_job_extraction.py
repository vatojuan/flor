"""Unit tests para app.services.job_extraction.parse_extraction_response.

Spec: specs/telegram-fapy.md. Parseo puro (stdlib) → corre en CI sin OpenAI.
"""
import json
from types import SimpleNamespace

import pytest

from app.services.job_extraction import extract_job_from_image, parse_extraction_response

pytestmark = pytest.mark.unit


def test_parses_plain_json():
    raw = '{"title": "Mozo", "description": "Para restaurante", "rubro": "Gastronomia"}'
    out = parse_extraction_response(raw)
    assert out["success"] is True
    assert out["job"]["title"] == "Mozo"
    assert out["job"]["rubro"] == "Gastronomia"


def test_strips_markdown_fence():
    raw = '```json\n{"title": "Cajero", "description": "d"}\n```'
    out = parse_extraction_response(raw)
    assert out["success"] is True
    assert out["job"]["title"] == "Cajero"


def test_handles_error_object():
    raw = '{"error": "No se detecta una oferta de trabajo en la imagen"}'
    out = parse_extraction_response(raw)
    assert out["success"] is False
    assert "oferta" in out["error"].lower()


def test_raises_on_invalid_json():
    with pytest.raises(json.JSONDecodeError):
        parse_extraction_response("esto no es json")


def test_extract_job_uses_vision_model_and_builds_data_url():
    """Fija el modelo de visión (gpt-4o) y el armado del data URL. Cliente inyectado →
    unit sin red. Regresión: gpt-4-turbo rechaza image_url."""
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        msg = SimpleNamespace(content='{"title": "Mozo", "description": "d", "rubro": "Gastronomia"}')
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)])

    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=fake_create)))
    out = extract_job_from_image(b"fakebytes", "image/jpeg", client=client)

    assert captured["model"] == "gpt-4o"          # modelo con soporte de visión
    assert out["success"] is True
    assert out["job"]["title"] == "Mozo"
    # la imagen va como data URL con el media_type recibido
    content = captured["messages"][0]["content"]
    image_parts = [c for c in content if c.get("type") == "image_url"]
    assert image_parts and image_parts[0]["image_url"]["url"].startswith("data:image/jpeg;base64,")
