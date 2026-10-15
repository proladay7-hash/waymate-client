import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8780' : 'http://localhost:8780');

export const HELLO_ENDPOINT = `${API_BASE_URL}/api/hello`;
