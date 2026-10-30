import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the API host address:
 * - On Web (browser): uses window.location.hostname
 * - On Native (Android / iOS via Expo Go): automatically detects the PC's host IP
 *   from Metro bundler (`Constants.expoConfig?.hostUri`), with fallback to LAN IP.
 *   On mobile devices, 'localhost' refers to the phone itself, so it must be replaced
 *   with the PC's actual reachable IP address.
 */
const getHostAddress = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  return '192.168.2.6';
};

const host = getHostAddress();

const resolveUrl = (envUrl?: string, port = 8781): string => {
  if (!envUrl) {
    return `http://${host}:${port}`;
  }
  // Replace localhost or 127.0.0.1 with the actual reachable host (dynamic LAN IP or browser hostname)
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return envUrl.replace(/localhost|127\.0\.0\.1/, host);
  }
  return envUrl;
};

export const API_BASE_URL = resolveUrl(process.env.EXPO_PUBLIC_API_URL, 8781);

export const HELLO_ENDPOINT = `${API_BASE_URL}/api/hello`;

export const AI_AGENT_BASE_URL = resolveUrl(process.env.EXPO_PUBLIC_AI_AGENT_URL, 8000);

export const AI_AGENT_WS_URL = AI_AGENT_BASE_URL.replace(/^http/, 'ws');

export const CHAT_WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws/chat';
