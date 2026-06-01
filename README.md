# Societies App

Mobile-first society management app with a Flask API backend and an Expo React Native mobile client.

## Structure

```text
societies-app/
  backend/       Flask API, database schema, import utilities, runtime uploads
  mobile-app/    Expo React Native app
  Dockerfile     Backend container
  docker-compose.yml
```

## Backend

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://127.0.0.1:5050`.

Runtime data is stored under `backend/data/` and `backend/static/uploads/`. These paths are intentionally ignored by git.

## Mobile App

```bash
cd mobile-app
npm install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` when the mobile app should call a backend other than the default development URL.

## Import Utility

```bash
cd backend
python import_sheets.py
```

Update the sheet constants in `backend/import_sheets.py` before importing from a new source.
