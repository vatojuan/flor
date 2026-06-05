"""Unit tests para la clasificación/reparación de emails almacenados.

Spec: specs/email-sanitation.md (sección B). Funciones puras → corren en CI.

`classify_email(stored)` devuelve `(label, value)`:
  - clean        → value = el email (ya está bien)
  - auto_fix     → value = email reparado, SEGURO de escribir sin intervención
  - needs_review → value = sugerencia opcional (NUNCA se auto-aplica)
  - invalid      → value = None (irrecuperable del string guardado)
"""
import pytest

from app.utils.email_extraction import classify_email, normalize_phone

pytestmark = pytest.mark.unit


def label(stored):
    return classify_email(stored)[0]


# ───────────────────────── auto_fix (los 3 casos reales del bug) ─────────────────────────
@pytest.mark.parametrize(
    "stored,repaired",
    [
        ("escajadilla.elias9@gmail.comexperiencia", "escajadilla.elias9@gmail.com"),
        ("habilidadesmangiapane2020@gmail.comvilla", "habilidadesmangiapane2020@gmail.com"),
        ("agustinpereyra1003@gmail.comauxiliar", "agustinpereyra1003@gmail.com"),
        ("persona@example.orgExtra", "persona@example.org"),
        # normalización no destructiva (envoltorios / prosa / punto final)
        ("<john@gmail.com>", "john@gmail.com"),
        ("contacto@gmail.com.", "contacto@gmail.com"),
        ("Email: john@empresa.com.ar end", "john@empresa.com.ar"),
    ],
)
def test_auto_fix(stored, repaired):
    lab, value = classify_email(stored)
    assert lab == "auto_fix"
    assert value == repaired


# ───────────────────────── clean (NO tocar) ─────────────────────────
@pytest.mark.parametrize(
    "stored",
    [
        "hola.mundo123@miempresa.com",
        "juan@empresa.com.ar",
        "diego@firma.org.ar",
        "name+tag@gmail.com",
        "user%test@gmail.com",
        "user@sub.domain.com",
        "info@comercial.com",          # nombre empieza con 'com', TLD real
        "z@iolab.io",
        "x@estudio.art",               # TLD real, NO se chopa a .ar
        "y@cooperativa.coop",          # TLD real, NO se chopa a .co
        "w@grupo.community",           # TLD real, NO se chopa a .com
    ],
)
def test_clean(stored):
    lab, value = classify_email(stored)
    assert lab == "clean"
    assert value == stored


# ───────────────────────── needs_review (proponer, jamás auto-aplicar) ─────────────────────────
@pytest.mark.parametrize(
    "stored",
    [
        "galdameemi42@gmail.co",       # truncado: gmail.co (existe .co Colombia real → revisar)
        "juan@gmail.con",              # typo de TLD
        "juan@gmial.com",              # typo del proveedor
        "juan@hotmial.com",            # typo del proveedor
        "user@host.comar",            # punto perdido de .com.ar (remanente corto)
        "user@host..com",              # doble punto
        "john@gmail.com;next@x.com",   # dos emails en una celda
        "trailing space@x.com",        # espacio interno → local-part real perdido
        "a@host.zzqq",                 # TLD inexistente sin prefijo conocido
        "user@host.com2",              # alfanumérico pegado tras TLD completo (intención desconocida)
    ],
)
def test_needs_review(stored):
    assert label(stored) == "needs_review"


def test_provider_truncation_suggests_canonical():
    lab, suggestion = classify_email("galdameemi42@gmail.co")
    assert lab == "needs_review"
    assert suggestion == "galdameemi42@gmail.com"   # pista para el CSV/recuperación, no se auto-aplica


# ───────────────────────── invalid (local-part devorado / sin email) ─────────────────────────
@pytest.mark.parametrize(
    "stored",
    [
        "com@hotmail.com",             # el nombre del buzón se perdió (local == token TLD)
        "org@gmail.com",
        "juan@@gmail.com",
        "user@123.456",
        "Sin mail acá.",
        "",
        None,
    ],
)
def test_invalid(stored):
    lab, value = classify_email(stored)
    assert lab == "invalid"
    assert value is None


# ───────────────────────── normalize_phone (cruce por teléfono) ─────────────────────────
@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+54 9 261 592 5106", "2615925106"),
        ("261 3135974", "2613135974"),
        ("2613831527", "2613831527"),
        ("+54 2612696686", "2612696686"),
        ("2622 224852", "2622224852"),
        ("0261 5925106", "2615925106"),        # trunk 0 + área + número
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_normalize_phone_garbage_returns_empty():
    assert normalize_phone("DNI 12") == ""        # < 8 dígitos → no sirve para cruzar
    assert normalize_phone(None) == ""
