# Production Deployment Guide

## 1) Backend + Postgres with Docker

```bash
cp .env.example .env
# edit .env (SECRET_KEY, LOGIN_PASSWORD, DATABASE_URL optional)
docker compose up --build -d
```

API will run on `http://localhost:5050`.

Notes:
- `docker-compose.yml` already sets `DATABASE_URL` to Postgres service.
- Uploaded files are persisted in `./static/uploads`.

## 2) Environment Variables

Use `.env.example` as template. Required in production:
- `SECRET_KEY`
- `LOGIN_USERNAME`
- `LOGIN_PASSWORD`
- `DATABASE_URL` (postgres url)
- `SESSION_COOKIE_SECURE=true` (behind HTTPS)

## 3) Mobile Builds with EAS

```bash
cd mobile-app
npm install
npx eas login
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

Profiles are in `mobile-app/eas.json`.
Set real API URLs in `EXPO_PUBLIC_API_BASE_URL` for `preview` and `production` profiles.

## 4) Production Checklist

- Configure HTTPS domain for backend (e.g. `https://api.example.com`)
- Set secure env values in hosting platform
- Set `SESSION_COOKIE_SECURE=true`
- Point EAS production API URL to live backend
- Rotate default admin credentials before launch
