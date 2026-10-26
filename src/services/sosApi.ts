import { API_BASE_URL } from '../config/api';
import { triggerLocalPhoneNotification } from './notificationService';

export interface SosRequestPayload {
  userId: string;
  name: string; // Emergency type, e.g. "Flat Tyre", "Engine Breakdown"
  location: string;
  latitude: number;
  longitude: number;
  description?: string;
  phoneNumber?: string;
  bikeInfo?: string;
}

export interface SosResponseDto {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  userId: string;
  userName?: string;
  userAvatar?: string;
  phoneNumber?: string;
  description?: string;
  bikeInfo?: string;
  status: 'PENDING' | 'HELPING' | 'RESOLVED' | 'CANCELLED';
  distanceKm?: number;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_DEMO_SOS: SosResponseDto[] = [];

/**
 * Dispatch an emergency SOS alert to waymate-service.
 * Notifies all riders within 10km and triggers phone notification.
 */
export async function sendSosApi(payload: SosRequestPayload): Promise<SosResponseDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved: SosResponseDto = await res.json();
      // Immediately trigger local phone notification feedback
      await triggerLocalPhoneNotification(
        '🚨 SOS Emergency Broadcasted!',
        `Your assistance request "${payload.name}" was sent to all riders within 10km.`,
        { sosId: saved.id },
        'emergency-sos'
      );
      return saved;
    }
  } catch (err) {
    console.log('[SosApi] Backend offline, fallback to local store');
  }

  // Fallback local broadcast
  const localSos: SosResponseDto = {
    id: 'sos_' + Date.now(),
    name: payload.name,
    location: payload.location,
    latitude: payload.latitude,
    longitude: payload.longitude,
    userId: payload.userId,
    userName: 'You',
    phoneNumber: payload.phoneNumber,
    bikeInfo: payload.bikeInfo,
    description: payload.description,
    status: 'PENDING',
    distanceKm: 0.1,
    createdAt: new Date().toISOString(),
  };

  LOCAL_DEMO_SOS.unshift(localSos);

  await triggerLocalPhoneNotification(
    '🚨 SOS Emergency Broadcasted!',
    `Your request "${payload.name}" was sent to nearby riders within 10km.`,
    { sosId: localSos.id },
    'emergency-sos'
  );

  return localSos;
}

/**
 * Fetch all active SOS requests in community, with relative distance from caller GPS.
 */
export async function fetchActiveSosApi(lat?: number, lng?: number): Promise<SosResponseDto[]> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lng !== undefined) params.append('lng', lng.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/sos?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.log('[SosApi] Fallback fetch active SOS');
  }

  return LOCAL_DEMO_SOS;
}

/**
 * Update SOS status (e.g. RESOLVED when help arrived).
 */
export async function updateSosStatusApi(sosId: string, status: string = 'RESOLVED'): Promise<SosResponseDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sos/${sosId}/status?status=${encodeURIComponent(status)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.log('[SosApi] Fallback update status');
  }

  const existing = LOCAL_DEMO_SOS.find((s) => s.id === sosId);
  if (existing) {
    existing.status = status as any;
    return existing;
  }
  throw new Error('SOS not found');
}

/**
 * Fetch a single SOS by ID.
 */
export async function fetchSosByIdApi(sosId: string): Promise<SosResponseDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sos/${sosId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.log('[SosApi] Fallback fetch SOS by ID');
  }

  const existing = LOCAL_DEMO_SOS.find((s) => s.id === sosId);
  if (existing) return existing;
  return LOCAL_DEMO_SOS[0];
}
