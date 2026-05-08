# Society Mobile App (Android + iOS)

This is an Expo React Native app connected to the Flask backend in the parent folder.

## 1) Start backend API

From project root:

```bash
cd /Users/pintoopaswan/Documents/coding/db-app
source .venv/bin/activate
python app.py
```

Backend runs at: `http://127.0.0.1:5050`

## 2) Configure API URL for your target

Edit `src/lib/config.js`:

- Android emulator: `http://10.0.2.2:5050`
- iOS simulator: `http://127.0.0.1:5050`
- Physical phone: `http://<your-mac-lan-ip>:5050`

## 3) Install dependencies

```bash
cd /Users/pintoopaswan/Documents/coding/db-app/mobile-app
npm install
```

## 4) Run app

```bash
npm run start
```

Then:

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Or scan QR in Expo Go on phone

## Login

Use the same backend credentials:

- Username: `admin`
- Password: `MigSociety@123`

## Implemented screens

- Login
- Dashboard summary
- Payments list + add payment + edit/delete current-month payment
- Expenses list + add expense + edit/delete expense
- Expense bill image upload from mobile gallery

## API endpoints used

- `POST /api/login`
- `GET /api/dashboard`
- `GET /api/payments`
- `POST /api/payments` (auth)
- `PUT /api/payments/<property_id>/<year>/<month>` (auth)
- `DELETE /api/payments/<property_id>/<year>/<month>` (auth)
- `GET /api/expenses`
- `POST /api/expenses` (auth, supports multipart/form-data with `bill`)
- `PUT /api/expenses/<expense_id>` (auth, supports multipart/form-data with `bill`)
- `DELETE /api/expenses/<expense_id>` (auth)
