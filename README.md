# Society Payment DB App

This is a separate full web app with SQL database storage.

## Stack
- Flask (Python)
- SQLite (`data/society.db`)

## What it includes
- SQL schema with relevant tables:
  - `properties`
  - `payments`
  - `resident_directory`
- Import script to pull data from Google Sheets:
  - 2025 and 2026 monthly payment sheets
  - owner/tenant sheet
- Pages:
  - `/payments` monthly received list from DB
  - `/entry` manual payment data entry (writes to DB)
  - `/directory` owner/tenant search view from DB

## Setup
1. Create venv and install deps
```bash
cd db-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Import sheet data into SQL DB
```bash
python import_sheets.py
```

3. Run app
```bash
python app.py
```

Open: http://127.0.0.1:5050

## Notes
- In `import_sheets.py`, update `OWNER_TENANT_TAB_NAME` if your tab is not `Sheet1`.
- If more years are added, extend `SHEET_IDS_BY_YEAR` + `MONTH_TABS_BY_YEAR`.
