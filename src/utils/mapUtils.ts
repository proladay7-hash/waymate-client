import { Linking, Platform } from 'react-native';

/**
 * Opens Google Maps to preview the trip route to the specified destination coordinates.
 * Displays the route overview, ETA, distance, and landmarks without entering
 * active turn-by-turn driving / navigation mode.
 */
export async function openGoogleMapsTripPreview(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  // Universal Google Maps directions URL (opens trip route preview without auto-starting drive mode)
  const webDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

  // On iOS, comgooglemaps directly opens the Google Maps app in route preview mode if installed
  const iosAppUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;

  if (Platform.OS === 'ios') {
    try {
      const canOpen = await Linking.canOpenURL(iosAppUrl);
      if (canOpen) {
        await Linking.openURL(iosAppUrl);
        return;
      }
    } catch (err) {
      console.warn('[openGoogleMapsTripPreview] iOS Google Maps app check failed:', err);
    }
  }

  // On Android and Web, opening the universal directions URL opens Google Maps app directly
  // in trip preview mode (not driving mode)
  try {
    await Linking.openURL(webDirectionsUrl);
  } catch (err) {
    console.error('[openGoogleMapsTripPreview] Failed to open Google Maps URL:', err);
  }
}

// Backwards-compatible alias
export const openGoogleMapsNavigation = openGoogleMapsTripPreview;

/**
 * Opens a Google Maps URL directly (e.g. https://maps.app.goo.gl/... or custom Google Maps link),
 * or falls back to coordinates preview if no direct URL is provided.
 * Handles both (mapUrl, lat, lng, label) and (lat, lng, undefined, label) call signatures safely.
 */
export async function openGoogleMapsLinkOrCoords(
  mapUrlOrLat?: string | number,
  latitudeOrLng?: number,
  longitudeOrLabel?: number | string,
  labelParam?: string
): Promise<void> {
  let mapUrl: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let label: string | undefined;

  if (typeof mapUrlOrLat === 'number') {
    // Called as: openGoogleMapsLinkOrCoords(lat, lng, undefined, label) or (lat, lng, label)
    latitude = mapUrlOrLat;
    longitude = typeof latitudeOrLng === 'number' ? latitudeOrLng : undefined;
    label = typeof longitudeOrLabel === 'string' ? longitudeOrLabel : labelParam;
  } else {
    // Called as: openGoogleMapsLinkOrCoords(mapUrl, lat, lng, label)
    mapUrl = typeof mapUrlOrLat === 'string' ? mapUrlOrLat : undefined;
    latitude = typeof latitudeOrLng === 'number' ? latitudeOrLng : undefined;
    longitude = typeof longitudeOrLabel === 'number' ? longitudeOrLabel : undefined;
    label = labelParam;
  }

  if (typeof mapUrl === 'string' && mapUrl.trim().length > 0) {
    let url = mapUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch (err) {
      console.warn('[openGoogleMapsLinkOrCoords] Direct map link open failed, falling back:', err);
    }
  }

  if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
    await openGoogleMapsLocation(latitude, longitude, label);
  }
}

/**
 * Opens Google Maps to view the pinned location pin/marker.
 */
export async function openGoogleMapsLocation(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  const encodedLabel = encodeURIComponent(label || 'Shared Location');
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const nativeAppUrl = Platform.select({
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    ios: `comgooglemaps://?q=${encodedLabel}&center=${latitude},${longitude}`,
    default: webUrl,
  });

  try {
    const canOpen = await Linking.canOpenURL(nativeAppUrl);
    if (canOpen) {
      await Linking.openURL(nativeAppUrl);
      return;
    }
  } catch (err) {
    console.warn('[openGoogleMapsLocation] Native map intent check failed:', err);
  }

  try {
    await Linking.openURL(webUrl);
  } catch (err) {
    console.error('[openGoogleMapsLocation] Failed to open Google Maps web URL:', err);
  }
}
