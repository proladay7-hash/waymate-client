import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { googleLoginApi, UserDto } from './authApi';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '140599259641-0ee0simidi1gma7gt8geovdh235omijm.apps.googleusercontent.com';

export interface GoogleAuthResult {
  success: boolean;
  user?: UserDto;
  token?: string;
  message?: string;
  isPolicyBlocked?: boolean;
}

/**
 * Extracts URL fragment or query parameters (e.g. ?code=... or #id_token=...&access_token=...)
 */
function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');

  const rawParams = hashIdx !== -1 ? url.substring(hashIdx + 1) : queryIdx !== -1 ? url.substring(queryIdx + 1) : '';
  if (!rawParams) return params;

  const pairs = rawParams.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

/**
 * Directly authenticates with Google account profile through waymate-service.
 * Queries/creates Neo4j node without duplicates and returns 1-day JWT.
 */
export async function signInWithGoogleAccount(
  email: string,
  name?: string,
  avatar?: string
): Promise<GoogleAuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = name || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'Google Rider');
  const photo = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80';

  const res = await googleLoginApi({
    email: cleanEmail,
    name: displayName,
    avatar: photo,
    googleId: `google-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
  });

  return {
    success: res.success,
    user: res.user,
    token: res.token,
    message: res.message,
  };
}

/**
 * Prompts user with Google OAuth 2.0 Web / In-App browser login flow.
 * Note: Google blocks custom schemes like 'exp://' with Web Client IDs on mobile Expo Go.
 */
export async function promptGoogleLogin(): Promise<GoogleAuthResult> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'waymate',
      preferLocalhost: Platform.OS === 'web',
    });

    console.log('[GoogleAuth] Initiating Google OAuth with redirectUri:', redirectUri);

    // Google's OAuth 2.0 policy strictly forbids 'exp://' schemes for Web Client IDs
    if (redirectUri.startsWith('exp://')) {
      console.warn('[GoogleAuth] Custom scheme exp:// is rejected by Google OAuth 2.0 Web Client IDs. Triggering Google Account modal.');
      return {
        success: false,
        isPolicyBlocked: true,
        message: 'Google blocks exp:// scheme in Expo Go. Use Google Quick Sign-In.',
      };
    }

    const nonce = Math.random().toString(36).substring(2, 12);
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account` +
      `&access_type=offline`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      const params = parseUrlParams(result.url);

      if (params.error) {
        console.warn('[GoogleAuth] Google returned error:', params.error, params.error_description);
        let errorMsg = params.error_description || params.error;
        if (params.error === 'access_denied') {
          errorMsg = 'Access Denied: Your Google account is not listed under "Test users" in Google Cloud Console > OAuth consent screen.';
        } else if (params.error === 'unauthorized_client' || params.error === 'invalid_request') {
          errorMsg = `Google OAuth policy blocked redirect URI: ${redirectUri}`;
        }
        return {
          success: false,
          isPolicyBlocked: true,
          message: errorMsg,
        };
      }

      const code = params.code;
      const idToken = params.id_token;
      const accessToken = params.access_token;

      let email = '';
      let name = '';
      let avatar = '';
      let googleId = '';

      if (accessToken) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userinfoRes.ok) {
            const profile = await userinfoRes.json();
            email = profile.email || '';
            name = profile.name || '';
            avatar = profile.picture || '';
            googleId = profile.sub || '';
          }
        } catch (e) {
          console.warn('[GoogleAuth] Failed to fetch Google userinfo directly:', e);
        }
      }

      const res = await googleLoginApi({
        code,
        redirectUri,
        idToken,
        accessToken,
        email: email || 'google.rider@waymate.app',
        name: name || 'Google Rider',
        avatar,
        googleId,
      });

      return {
        success: res.success,
        user: res.user,
        token: res.token,
        message: res.message,
      };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      return {
        success: false,
        message: 'Google login was cancelled',
      };
    }

    return {
      success: false,
      isPolicyBlocked: true,
      message: 'Could not complete Google browser authentication',
    };
  } catch (error: any) {
    console.warn('[GoogleAuth] OAuth Error:', error);
    return {
      success: false,
      isPolicyBlocked: true,
      message: error.message || 'Google OAuth failed',
    };
  }
}
