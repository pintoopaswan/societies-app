import { Platform } from 'react-native';

const defaultApiBaseUrlByPlatform =
  Platform.OS === 'web'
    ? 'http://localhost:5050'
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:5050'
      : 'http://127.0.0.1:5050';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultApiBaseUrlByPlatform;

// Web: http://localhost:5050
// Android emulator: http://10.0.2.2:5050
// iOS simulator: http://127.0.0.1:5050
// Physical device: use your machine LAN IP, e.g. http://192.168.1.10:5050
