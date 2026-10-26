import { Platform } from 'react-native';

/**
 * Dynamically resolves the API host address:
 * - On Web (browser): uses window.location.hostname (works for localhost and 192.168.x.x phone access)
 * - On Native (Expo Go / Android / iOS): connects to the local LAN IP where Docker ports are exposed
 */
const getHostAddress = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return '192.168.2.7';
};

const host = getHostAddress();

export const API_BASE_URL =
  Platform.OS === 'web'
    ? `http://${host}:8781`
    : (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.2.7:8781');

export const HELLO_ENDPOINT = `${API_BASE_URL}/api/hello`;

export const AI_AGENT_BASE_URL =
  Platform.OS === 'web'
    ? `http://${host}:8000`
    : (process.env.EXPO_PUBLIC_AI_AGENT_URL ?? 'http://192.168.2.7:8000');

export const AI_AGENT_WS_URL = AI_AGENT_BASE_URL.replace(/^http/, 'ws');

export const CHAT_WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws/chat';
