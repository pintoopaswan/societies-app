import csv
import hashlib
import io
import json
import ssl
import sqlite3
import urllib.parse
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "society.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"

SHEET_IDS_BY_YEAR = {
    2026: "1sPkVonPCAwM_avBVyQuJSSKRkx5wkB1XPHY1KiEulvU",
    2025: "1U8uoiXbtvzdJxjDTV_IXxAjI7pvzXTFP",
}

MONTH_TABS_BY_YEAR = {
    2026: [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ],
    2025: [
        None, None, None, None, None, "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ],
}

OWNER_TENANT_SHEET_ID = "15iii2nw4THbf-t-TdYNfj5WW2Aw4selhvfwu64YzisE"
OWNER_TENANT_TAB_NAME = "Sheet1"


def ensure_db(conn: sqlite3.Connection) -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema)
    conn.commit()


def fetch_sheet_csv(sheet_id: str, tab_name: str) -> list[list[str]]:
    url = (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq"
        f"?tqx=out:csv&sheet={urllib.parse.quote(tab_name)}"
    )
    ssl_context = ssl._create_unverified_context()
    with urllib.request.urlopen(url, timeout=30, context=ssl_context) as resp:
        content = resp.read().decode("utf-8", errors="ignore")

    trimmed = content.strip().lower()
    if not trimmed or trimmed.startswith("<!doctype html") or "google.visualization.query.setresponse" in trimmed:
        return []

    reader = csv.reader(io.StringIO(content))
    return [list(map(lambda c: c.strip(), row)) for row in reader if any(c.strip() for c in row)]


def upsert_property(conn: sqlite3.Connection, block: str, flat: str) -> int:
    conn.execute(
        """
        INSERT INTO properties(block, flat, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(block, flat) DO UPDATE SET updated_at=CURRENT_TIMESTAMP
        """,
        (block, flat),
    )
    row = conn.execute(
        "SELECT id FROM properties WHERE block=? AND flat=?",
        (block, flat),
    ).fetchone()
    return int(row[0])


def parse_amount(raw: str) -> float:
    try:
        return float((raw or "0").replace(",", "").strip() or 0)
    except Exception:
        return 0.0


def import_monthly_payments(conn: sqlite3.Connection) -> None:
    for year, sheet_id in SHEET_IDS_BY_YEAR.items():
        month_tabs = MONTH_TABS_BY_YEAR.get(year, [])
        for month_index, tab_name in enumerate(month_tabs, start=1):
            if not tab_name:
                continue

            rows = fetch_sheet_csv(sheet_id, tab_name)
            if len(rows) <= 1:
                continue

            for cols in rows[1:]:
                block = cols[0].strip() if len(cols) > 0 else ""
                flat = cols[1].strip() if len(cols) > 1 else ""
                amount = parse_amount(cols[2] if len(cols) > 2 else "0")
                payment_date = cols[4].strip() if len(cols) > 4 else ""
                status = (cols[5].strip().upper() if len(cols) > 5 else "") or "PENDING"

                if not block or not flat:
                    continue
                if block.upper() == "TOTAL":
                    continue

                property_id = upsert_property(conn, block, flat)

                conn.execute(
                    """
                    INSERT INTO payments(property_id, year, month, amount, payment_date, status, source, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'import', CURRENT_TIMESTAMP)
                    ON CONFLICT(property_id, year, month) DO UPDATE SET
                      amount=excluded.amount,
                      payment_date=excluded.payment_date,
                      status=excluded.status,
                      source='import',
                      updated_at=CURRENT_TIMESTAMP
                    """,
                    (property_id, year, month_index, amount if status == "DONE" else 0, payment_date or None, status),
                )


def import_owner_tenant_directory(conn: sqlite3.Connection) -> None:
    rows = fetch_sheet_csv(OWNER_TENANT_SHEET_ID, OWNER_TENANT_TAB_NAME)
    if not rows:
        return

    headers = rows[0]
    for row in rows[1:]:
        payload = {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))}
        serialized = json.dumps(payload, ensure_ascii=True, sort_keys=True)
        row_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        conn.execute(
            """
            INSERT INTO resident_directory(row_hash, raw_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(row_hash) DO UPDATE SET
              raw_json=excluded.raw_json,
              updated_at=CURRENT_TIMESTAMP
            """,
            (row_hash, serialized),
        )


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_db(conn)
        import_monthly_payments(conn)
        import_owner_tenant_directory(conn)
        conn.commit()
        print(f"Import complete. Database: {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
