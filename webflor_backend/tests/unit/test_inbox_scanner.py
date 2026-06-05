"""Unit tests para app.services.inbox_scanner.

Spec: specs/inbox-cv-attachment.md. La persistencia se extrae a persist_cv_account
con I/O inyectable (upload_pdf/make_embedding/gen_password/send_credentials) y el
etiquetado a _label_email sobre un objeto `mail` fake → sin GCS/OpenAI/IMAP real,
corre en CI (mismo patrón que test_telegram_bot / test_mailing_contacts).
"""
import pytest

from app.services import inbox_scanner

pytestmark = pytest.mark.unit


# --- Fakes -------------------------------------------------------------------

class FakeCursor:
    """Cursor fake: encola un resultado de fetchone() por execute(), en orden.

    `fetch_results` es una lista de filas (o None) que se devuelven, una por cada
    execute() que el código asocie a un fetchone(). Las queries que no hacen fetch
    simplemente consumen su turno con None.
    """

    def __init__(self, fetch_results):
        self._fetch = list(fetch_results)
        self.executed = []
        self._last = None

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        self._last = self._fetch.pop(0) if self._fetch else None

    def fetchone(self):
        return self._last

    def close(self):
        pass


class FakeConn:
    def __init__(self):
        self.commits = 0

    def commit(self):
        self.commits += 1

    def cursor(self):
        raise AssertionError("persist_cv_account no debe abrir su propio cursor")

    def close(self):
        pass


def _sqls(cur):
    return [sql for sql, _ in cur.executed]


def _find(cur, needle):
    """Devuelve (sql, params) del primer execute cuyo SQL contiene `needle`."""
    for sql, params in cur.executed:
        if needle in sql:
            return sql, params
    return None, None


def _base_kwargs(**over):
    kw = dict(
        user_email="ana@example.com",
        name="Ana Gomez",
        description="Moza con experiencia",
        phone="+542610000000",
        rubro="Gastronomia",
        cv_text="x" * 200,
        pdf_bytes=b"%PDF-1.4 fake",
        original_name="CV Ana.pdf",
        upload_pdf=lambda b, path, **k: f"https://storage.googleapis.com/bucket/{path}",
        make_embedding=lambda text: [0.1, 0.2, 0.3],
        gen_password=lambda: ("plain-pw", "hashed-pw"),
        send_credentials=lambda *a, **k: None,
    )
    kw.update(over)
    return kw


# --- persist_cv_account: usuario nuevo --------------------------------------

def test_new_user_creates_account_and_attaches_cv():
    # SELECT User -> no existe; INSERT User RETURNING id -> 55
    cur = FakeCursor([None, (55,)])
    conn = FakeConn()
    result = inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs())

    assert result["status"] == "created"
    assert result["user_id"] == 55
    # el User se inserta con cvUrl
    user_sql, _ = _find(cur, 'INSERT INTO "User"')
    assert user_sql is not None and '"cvUrl"' in user_sql


def test_new_user_inserts_employee_document_so_cv_shows_on_profile():
    cur = FakeCursor([None, (55,)])
    conn = FakeConn()
    inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs())

    doc_sql, doc_params = _find(cur, 'INSERT INTO "EmployeeDocument"')
    assert doc_sql is not None, "sin EmployeeDocument el CV no aparece en el perfil"
    # userId y fileKey del blob subido
    assert 55 in doc_params
    assert any(isinstance(p, str) and p.startswith("employee-documents/") for p in doc_params)


def test_new_user_uploads_pdf_and_stores_file_embedding():
    uploaded = {}
    cur = FakeCursor([None, (55,)])
    conn = FakeConn()

    def fake_upload(b, path, **k):
        uploaded["bytes"] = b
        uploaded["path"] = path
        return f"https://storage.googleapis.com/bucket/{path}"

    inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs(upload_pdf=fake_upload))

    assert uploaded["bytes"] == b"%PDF-1.4 fake"
    assert uploaded["path"].startswith("employee-documents/")
    fe_sql, _ = _find(cur, 'INSERT INTO "FileEmbedding"')
    assert fe_sql is not None


def test_new_user_sends_credentials():
    sent = []
    cur = FakeCursor([None, (55,)])
    conn = FakeConn()
    inbox_scanner.persist_cv_account(
        cur, conn, **_base_kwargs(send_credentials=lambda *a, **k: sent.append(a))
    )
    assert len(sent) == 1
    assert sent[0][0] == "ana@example.com"


# --- persist_cv_account: saneamiento (usuario existe, sin documento) ---------

def test_existing_user_without_document_attaches_cv():
    # SELECT User -> existe (id 7); SELECT EmployeeDocument -> None (no tiene)
    cur = FakeCursor([(7,), None])
    conn = FakeConn()
    result = inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs())

    assert result["status"] == "attached"
    assert result["user_id"] == 7
    # adjunta el documento al usuario existente
    doc_sql, doc_params = _find(cur, 'INSERT INTO "EmployeeDocument"')
    assert doc_sql is not None and 7 in doc_params
    # NO re-inserta el User
    assert _find(cur, 'INSERT INTO "User"')[0] is None


def test_existing_user_without_document_does_not_resend_credentials():
    sent = []
    cur = FakeCursor([(7,), None])
    conn = FakeConn()
    inbox_scanner.persist_cv_account(
        cur, conn, **_base_kwargs(send_credentials=lambda *a, **k: sent.append(a))
    )
    assert sent == []


# --- persist_cv_account: idempotencia (usuario existe, con documento) --------

def test_existing_user_with_document_is_skipped():
    # SELECT User -> existe (id 7); SELECT EmployeeDocument -> tiene (1,)
    cur = FakeCursor([(7,), (1,)])
    conn = FakeConn()
    result = inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs())

    assert result["status"] == "exists"
    # no sube ni adjunta nada nuevo
    assert _find(cur, 'INSERT INTO "EmployeeDocument"')[0] is None
    assert _find(cur, 'INSERT INTO "User"')[0] is None


def test_skip_does_not_call_upload():
    called = []
    cur = FakeCursor([(7,), (1,)])
    conn = FakeConn()
    inbox_scanner.persist_cv_account(
        cur, conn, **_base_kwargs(upload_pdf=lambda b, p, **k: called.append(p) or "url")
    )
    assert called == []


# --- persist_cv_account: embeddings best-effort -----------------------------

def test_embedding_failure_still_creates_account_and_document():
    cur = FakeCursor([None, (55,)])
    conn = FakeConn()

    def boom(text):
        raise RuntimeError("OpenAI caido")

    result = inbox_scanner.persist_cv_account(cur, conn, **_base_kwargs(make_embedding=boom))

    assert result["status"] == "created"
    # la cuenta se crea sin la columna embedding...
    user_sql, _ = _find(cur, 'INSERT INTO "User"')
    assert user_sql is not None and "embedding" not in user_sql
    # ...pero el documento (lo que importa para el perfil) igual se adjunta
    assert _find(cur, 'INSERT INTO "EmployeeDocument"')[0] is not None
    # y no se intenta guardar FileEmbedding
    assert _find(cur, 'INSERT INTO "FileEmbedding"')[0] is None


# --- _label_email ------------------------------------------------------------

class FakeMail:
    def __init__(self, store_status="OK"):
        self.store_status = store_status
        self.stored = []
        self.created = []

    def create(self, mailbox):
        self.created.append(mailbox)
        return ("OK", [b""])

    def store(self, email_id, flags, value):
        self.stored.append((email_id, flags, value))
        return (self.store_status, [b""])


@pytest.mark.parametrize(
    "category,label",
    [
        ("CV", "FAP/CVs"),
        ("PROPUESTA", "FAP/Propuestas"),
        ("CONSULTA", "FAP/Consultas"),
        ("OFERTA", "FAP/Ofertas"),
        ("SPAM", "FAP/Spam"),
        ("OTRO", "FAP/Otros"),
    ],
)
def test_label_email_applies_gmail_label(category, label):
    mail = FakeMail(store_status="OK")
    ok = inbox_scanner._label_email(mail, b"42", category)
    assert ok is True
    assert len(mail.stored) == 1
    email_id, flags, value = mail.stored[0]
    assert flags == "+X-GM-LABELS"
    assert label in value


def test_label_email_covers_otro_so_nothing_is_left_unlabeled():
    # regresion del bug "muchos mails sin etiqueta": OTRO tambien se etiqueta
    assert "OTRO" in inbox_scanner.LABEL_MAP


def test_label_email_warns_and_returns_false_on_store_failure(caplog):
    mail = FakeMail(store_status="NO")
    import logging
    with caplog.at_level(logging.WARNING):
        ok = inbox_scanner._label_email(mail, b"42", "CV")
    assert ok is False
    assert any("CV" in r.message or "FAP/CVs" in r.message for r in caplog.records)


def test_label_email_unknown_category_does_not_touch_mailbox():
    mail = FakeMail()
    ok = inbox_scanner._label_email(mail, b"42", "DESCONOCIDA")
    assert ok is False
    assert mail.stored == []


# --- _select_email_ids: cuántos procesar / cuántos faltan --------------------

def _ids(n):
    return [str(i).encode() for i in range(n)]


def test_select_incremental_under_cap_processes_all():
    ids, total, remaining = inbox_scanner._select_email_ids(_ids(5), max_emails=20, scan_all=False)
    assert total == 5 and remaining == 0
    assert len(ids) == 5


def test_select_incremental_over_cap_reports_remaining():
    ids, total, remaining = inbox_scanner._select_email_ids(_ids(50), max_emails=20, scan_all=False)
    assert total == 50
    assert len(ids) == 20
    assert remaining == 30  # antes truncaba en silencio; ahora se sabe cuantos faltan


def test_select_incremental_processes_most_recent():
    # IMAP devuelve los ids en orden; los mas recientes estan al final
    ids, _, _ = inbox_scanner._select_email_ids(_ids(50), max_emails=3, scan_all=False)
    assert ids == [b"47", b"48", b"49"]


def test_select_scan_all_ignores_cap_and_processes_everything():
    ids, total, remaining = inbox_scanner._select_email_ids(_ids(50), max_emails=20, scan_all=True)
    assert total == 50
    assert len(ids) == 50  # la sync historica procesa TODO, sin tope
    assert remaining == 0


def test_select_max_emails_zero_means_all():
    ids, total, remaining = inbox_scanner._select_email_ids(_ids(50), max_emails=0, scan_all=False)
    assert len(ids) == 50
    assert remaining == 0
