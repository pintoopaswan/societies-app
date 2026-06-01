# Production Deployment Guide

## Backend + Postgres

```bash
cp .env.example .env
# edit SECRET_KEY, LOGIN_USERNAME, LOGIN_PASSWORD, DATABASE_URL if needed
docker compose up --build -d
```

The backend API runs on `http://localhost:5050`.

Notes:
- `docker-compose.yml` sets `DATABASE_URL` to the bundled Postgres service.
- Uploaded files are persisted in `./backend/static/uploads`.
- Local SQLite data, when used, lives in `./backend/data`.

## Environment Variables

Required in production:
- `SECRET_KEY`
- `LOGIN_USERNAME`
- `LOGIN_PASSWORD`
- `DATABASE_URL`
- `SESSION_COOKIE_SECURE=true` when served behind HTTPS

Optional:
- `PAYMENT_UPI_ID`
- `PAYMENT_QR_FILENAME`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ADMIN_SMS_NUMBER`

## Mobile Builds With EAS

```bash
cd mobile-app
npm install
npx eas login
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

Set the production API URL through `EXPO_PUBLIC_API_BASE_URL` in the EAS environment/profile.
