import * as WebBrowser from 'expo-web-browser';
import { getDefaultReturnUrl } from 'expo-auth-session';
import { googleLoginApi, UserDto } from './authApi';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const GOOGLE_REDIRECT_URI = 'https://auth.expo.io/@lhlam.lehoang/waymate';

export interface GoogleAuthResult {
  success: boolean;
  user?: UserDto;
  token?: string;
  message?: string;
  isCancelled?: boolean;
}

/**
 * Extracts URL parameters from both hash fragments (#...) and query strings (?...)
 */
function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Parse query string if present (?key=value...)
  const queryMatch = url.match(/\?([^#]*)/);
  if (queryMatch && queryMatch[1]) {
    for (const pair of queryMatch[1].split('&')) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
  }

  // Parse hash fragment if present (#key=value...)
  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    const hashStr = url.substring(hashIdx + 1);
    for (const pair of hashStr.split('&')) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
  }

  return params;
}

/**
 * Prompts Google OAuth 2.0 sign-in via the Expo Auth Proxy (https://auth.expo.io).
 *
 * Correct Auth Proxy Flow:
 * 1. Computes the returnUrl (the deep link back to this device/Expo Go app).
 * 2. Opens the proxy /start endpoint: https://auth.expo.io/@lhlam.lehoang/waymate/start?authUrl=...&returnUrl=...
 * 3. The proxy registers the session with the returnUrl and forwards to Google with prompt=select_account.
 * 4. Google displays the official "Choose an account" screen.
 * 5. Google redirects to the proxy callback (https://auth.expo.io/@lhlam.lehoang/waymate) with genuine tokens.
 * 6. The proxy reads the registered session and redirects back to returnUrl with the tokens.
 * 7. WebBrowser.openAuthSessionAsync intercepts returnUrl, returns tokens to the app, and closes the browser.
 */
export async function promptGoogleLogin(): Promise<GoogleAuthResult> {
  try {
    const proxyRedirectUri = GOOGLE_REDIRECT_URI;
    const returnUrl = getDefaultReturnUrl();

    console.log('[GoogleAuth] Return URL:', returnUrl);
    console.log('[GoogleAuth] Proxy Redirect URI:', proxyRedirectUri);

    const nonce = Math.random().toString(36).substring(2, 14);
    const state = Math.random().toString(36).substring(2, 14);

    // Google authorization URL targeting the authorized proxy redirect URI
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(proxyRedirectUri)}` +
      `&response_type=${encodeURIComponent('token id_token')}` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;

    // Start URL routing through Expo Auth Proxy /start so auth.expo.io knows where to redirect back
    const startUrl =
      `${proxyRedirectUri}/start?` +
      `authUrl=${encodeURIComponent(googleAuthUrl)}` +
      `&returnUrl=${encodeURIComponent(returnUrl)}`;

    console.log('[GoogleAuth] Initiating real Google OAuth via Auth Proxy with account chooser');

    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
      showInRecents: true,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return {
        success: false,
        isCancelled: true,
        message: 'Google login was cancelled',
      };
    }

    if (result.type === 'success' && result.url) {
      console.log('[GoogleAuth] Auth session succeeded with callback URL');
      const params = parseUrlParams(result.url);

      if (params.error) {
        console.warn('[GoogleAuth] Google returned OAuth error:', params.error, params.error_description);
        let errorMsg = params.error_description || params.error;
        if (params.error === 'access_denied') {
          errorMsg =
            'Access Denied: Please add this Google account as a "Test user" in Google Cloud Console > OAuth consent screen.';
        } else if (params.error === 'invalid_request') {
          errorMsg = `Redirect URI mismatch. Authorized URI must be: ${proxyRedirectUri}`;
        }
        return {
          success: false,
          message: errorMsg,
        };
      }

      const accessToken = params.access_token;
      const idToken = params.id_token;

      if (!accessToken && !idToken) {
        return {
          success: false,
          message: 'No Google authentication token was received.',
        };
      }

      // Fetch verified profile from Google's official userinfo endpoint
      let verifiedEmail = '';
      let verifiedName = '';
      let verifiedPicture = '';
      let googleId = '';

      if (accessToken) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userinfoRes.ok) {
            const profile = await userinfoRes.json();
            verifiedEmail = profile.email || '';
            verifiedName = profile.name || '';
            verifiedPicture = profile.picture || '';
            googleId = profile.sub || '';
            console.log('[GoogleAuth] Successfully verified Google account:', verifiedEmail);
          }
        } catch (fetchErr) {
          console.warn('[GoogleAuth] Could not fetch Google userinfo client-side:', fetchErr);
        }
      }

      // Call waymate-service backend with real Google credentials
      const res = await googleLoginApi({
        idToken,
        accessToken,
        redirectUri: proxyRedirectUri,
        email: verifiedEmail,
        name: verifiedName,
        avatar: verifiedPicture,
        googleId,
      });

      return {
        success: res.success,
        user: res.user,
        token: res.token,
        message: res.message,
      };
    }

    return {
      success: false,
      message: 'Could not complete Google authentication session.',
    };
  } catch (error: any) {
    console.error('[GoogleAuth] Error during Google authentication:', error);
    return {
      success: false,
      message: error?.message || 'Google OAuth failed',
    };
  }
}
