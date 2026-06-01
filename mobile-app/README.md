# Society Mobile App

Expo React Native client for the Societies App backend.

## Setup

```bash
npm install
npm start
```

## Backend URL

The app reads `EXPO_PUBLIC_API_BASE_URL` when it is set. Defaults are defined in `src/lib/config.js`.

Common local values:
- Android emulator: `http://10.0.2.2:5050`
- iOS simulator: `http://127.0.0.1:5050`
- Physical device: `http://<your-computer-lan-ip>:5050`

## Native Projects

This repository includes prebuilt `android/` and `ios/` folders, so use:

```bash
npm run android
npm run ios
```

Use `npm start` for Expo development server workflows.
