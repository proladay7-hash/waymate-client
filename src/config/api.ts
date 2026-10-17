import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://192.168.2.7:8781' : 'http://localhost:8781');

export const HELLO_ENDPOINT = `${API_BASE_URL}/api/hello`;
