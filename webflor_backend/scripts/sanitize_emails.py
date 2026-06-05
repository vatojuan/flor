"""Saneo de emails mal extraídos en email_contacts y "User".

Lo corre Juan a mano contra producción (necesita la DB del backend y, para recuperar
emails desde el CV, GCS). NO es gate de CI: la lógica pura ya está testeada en
tests/unit/test_email_sanitize.py y test_sanitize_plan.py.

Por defecto es DRY-RUN: no toca nada, solo escribe un CSV con lo que haría.

    # ver qué haría (no escribe nada)
    python scripts/sanitize_emails.py

    # aplicar de verdad
    python scripts/sanitize_emails.py --apply

Opciones:
    --apply                 escribe los cambios (sin esto, dry-run)
    --tables email_contacts,User   qué tablas sanear (default: ambas)
    --no-recover            no intenta recuperar emails desde el CV/teléfono (más rápido)
    --out archivo.csv       ruta del reporte (default: email_sanitation_report.csv)
    --limit N               procesa solo N filas por tabla (para probar)

Estrategia (ver specs/email-sanitation.md):
  - clean      → no toca.
  - auto_fix   → reescribe el email (recorte inequívoco de basura pegada al TLD).
  - needs_review/invalid → intenta recuperar el email REAL desde la fuente:
       · "User": re-extrae del CV en GCS (cvUrl) con el extractor endurecido.
       · email_contacts: cruza por teléfono contra "User" (email de registro).
     Si recupera uno limpio → lo usa; si no → email_contacts: valid=false; "User": solo reporta.
  - Nunca pisa un email si el destino ya existe (colisión de unique key) → lo manda a revisión.
"""
import argparse
import csv
import sys

from app.database import get_db_connection
from app.utils.email_extraction import extract_email, classify_email
from app.utils.email_sanitize_plan import (
    UPDATE, FLAG, REPORT, SKIP,
    plan_action, build_phone_index, recover_by_phone,
)

GCS_PREFIX = "https://storage.googleapis.com/"


# ───────────────────────────── recuperación desde el CV (GCS) ─────────────────────────────
_bucket = None


def _get_bucket():
    """Lazy: solo importa GCS/creds si de verdad vamos a recuperar desde el CV."""
    global _bucket
    if _bucket is not None:
        return _bucket
    import json
    import os
    from google.cloud import storage

    info = json.loads(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
    client = storage.Client.from_service_account_info(info)
    _bucket = client.bucket(os.getenv("GOOGLE_STORAGE_BUCKET"))
    return _bucket


def recover_from_cv(cv_url):
    """Re-extrae el email del CV apuntado por cv_url usando el extractor endurecido."""
    if not cv_url or not cv_url.startswith(GCS_PREFIX):
        return None
    try:
        import io
        import urllib.parse
        from PyPDF2 import PdfReader

        path = urllib.parse.unquote(cv_url[len(GCS_PREFIX):]).split("/", 1)[1]  # quita el bucket
        blob = _get_bucket().blob(path)
        if not blob.exists():
            return None
        data = blob.download_as_bytes()
        text = " ".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        return extract_email(text)
    except Exception as e:  # GCS/PDF roto → sin recuperación, no abortamos el saneo
        print(f"  ! no se pudo recuperar de {cv_url}: {e}", file=sys.stderr)
        return None


# ───────────────────────────── carga de datos ─────────────────────────────
def load_users(cur):
    cur.execute('SELECT id, email, name, phone, "cvUrl" FROM "User"')
    return [
        {"id": r[0], "email": r[1], "name": r[2], "phone": r[3], "cv_url": r[4]}
        for r in cur.fetchall()
    ]


def load_contacts(cur, limit=None):
    q = "SELECT id, email, name, phone FROM email_contacts ORDER BY id"
    if limit:
        q += f" LIMIT {int(limit)}"
    cur.execute(q)
    return [
        {"id": r[0], "email": r[1], "name": r[2], "phone": r[3]}
        for r in cur.fetchall()
    ]


# ───────────────────────────── planificación por tabla ─────────────────────────────
def plan_table(table, rows, *, phone_index=None, recover=True, limit=None):
    """Devuelve la lista de acciones para una tabla, resolviendo recuperación de fuente."""
    if limit:
        rows = rows[:limit]
    existing = {(r["email"] or "").strip().lower() for r in rows if r["email"]}
    applied_targets = set()
    actions = []
    for r in rows:
        recovered = None
        if recover:
            if table == "User":
                # solo vale la pena re-extraer si el valor actual está sucio
                if classify_email(r["email"])[0] not in ("clean", "auto_fix"):
                    recovered = recover_from_cv(r.get("cv_url"))
            elif table == "email_contacts" and phone_index is not None:
                recovered = recover_by_phone(r.get("phone"), phone_index)

        # las colisiones tienen en cuenta tanto lo ya existente como lo ya planificado en esta corrida
        a = plan_action(
            table, r["id"], r["email"],
            recovered=recovered,
            existing_emails=existing | applied_targets,
            name=r.get("name"), phone=r.get("phone"),
        )
        if a["action"] == UPDATE and a["after"]:
            applied_targets.add(a["after"])
        actions.append(a)
    return actions


# ───────────────────────────── aplicación (solo con --apply) ─────────────────────────────
def apply_actions(conn, actions):
    cur = conn.cursor()
    counts = {"updated": 0, "flagged": 0}
    for a in actions:
        if a["action"] == UPDATE:
            if a["table"] == "email_contacts":
                cur.execute(
                    "UPDATE email_contacts SET email = %s, valid = TRUE WHERE id = %s",
                    (a["after"], a["id"]),
                )
            else:
                cur.execute('UPDATE "User" SET email = %s WHERE id = %s', (a["after"], a["id"]))
            counts["updated"] += 1
        elif a["action"] == FLAG and a["table"] == "email_contacts":
            cur.execute("UPDATE email_contacts SET valid = FALSE WHERE id = %s", (a["id"],))
            counts["flagged"] += 1
        # REPORT/SKIP: no se escribe nada
    conn.commit()
    cur.close()
    return counts


# ───────────────────────────── reporte ─────────────────────────────
def write_csv(path, actions):
    cols = ["table", "id", "name", "phone", "before", "after",
            "classification", "action", "source", "note"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for a in actions:
            w.writerow(a)


def summarize(actions):
    from collections import Counter
    c = Counter((a["table"], a["action"]) for a in actions)
    print("\nResumen:")
    for (table, action), n in sorted(c.items()):
        print(f"  {table:<14} {action:<8} {n}")
    changes = [a for a in actions if a["action"] in (UPDATE, FLAG)]
    print(f"\n  Cambios propuestos: {len(changes)}  (de {len(actions)} filas)")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Saneo de emails de email_contacts y User")
    ap.add_argument("--apply", action="store_true", help="escribe los cambios (default: dry-run)")
    ap.add_argument("--tables", default="email_contacts,User")
    ap.add_argument("--no-recover", action="store_true", help="no recupera desde CV/teléfono")
    ap.add_argument("--out", default="email_sanitation_report.csv")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args(argv)

    tables = [t.strip() for t in args.tables.split(",") if t.strip()]
    recover = not args.no_recover

    conn = get_db_connection()
    cur = conn.cursor()

    users = load_users(cur)
    phone_index = build_phone_index((u["email"], u["phone"], u["name"]) for u in users)

    all_actions = []
    if "email_contacts" in tables:
        contacts = load_contacts(cur, limit=args.limit)
        print(f"email_contacts: {len(contacts)} filas")
        all_actions += plan_table("email_contacts", contacts,
                                   phone_index=phone_index, recover=recover, limit=args.limit)
    if "User" in tables:
        print(f'"User": {len(users)} filas')
        all_actions += plan_table("User", users, recover=recover, limit=args.limit)

    cur.close()

    write_csv(args.out, all_actions)
    print(f"Reporte escrito en {args.out}")
    summarize(all_actions)

    if args.apply:
        print("\n--apply: ESCRIBIENDO cambios en la base de datos...")
        counts = apply_actions(conn, all_actions)
        print(f"  Hechos: {counts['updated']} emails reescritos, {counts['flagged']} marcados valid=false")
    else:
        print("\nDRY-RUN (no se escribió nada). Revisá el CSV y corré con --apply para aplicar.")

    conn.close()


if __name__ == "__main__":
    main()
