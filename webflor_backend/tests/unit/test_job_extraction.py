"""Unit tests para app.services.job_extraction.parse_extraction_response.

Spec: specs/telegram-fapy.md. Parseo puro (stdlib) → corre en CI sin OpenAI.
"""
import json

import pytest

from app.services.job_extraction import parse_extraction_response

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
