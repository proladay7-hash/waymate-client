import { API_BASE_URL } from '../config/api';
import { TripData } from '../data/mockTrips';

export interface BackendTripResponse {
  id: string;
  title: string;
  titleVie?: string;
  riderName?: string;
  riderAvatar?: string;
  riderBadge?: string;
  riderBadgeVie?: string;
  bikeModel?: string;
  distanceKm?: number;
  avgVelocityKmh?: number;
  maxVelocityKmh?: number;
  groupSize?: string;
  duration?: string;
  durationVie?: string;
  dates?: string;
  category?: 'all' | 'popular' | 'nearby' | 'international';
  coverImage?: string;
  likesCount?: number;
  commentsCount?: number;
  totalCostVnd?: string;
  totalCostUsd?: string;
  description?: string;
  descriptionVie?: string;
  googleMapsUrl?: string;
  destinationJson?: string;
  eatDrinkJson?: string;
  landmarksJson?: string;
  lodgingJson?: string;
}

export function mapBackendToClientTrip(b: BackendTripResponse): TripData {
  let destination = undefined;
  let eatDrink = [];
  let landmarks = [];
  let lodging = [];

  try {
    if (b.destinationJson) destination = JSON.parse(b.destinationJson);
  } catch (e) {}

  try {
    if (b.eatDrinkJson) eatDrink = JSON.parse(b.eatDrinkJson);
  } catch (e) {}

  try {
    if (b.landmarksJson) landmarks = JSON.parse(b.landmarksJson);
  } catch (e) {}

  try {
    if (b.lodgingJson) lodging = JSON.parse(b.lodgingJson);
  } catch (e) {}

  return {
    id: b.id,
    title: b.title || 'Adventure Trip',
    titleVie: b.titleVie || b.title || 'Cung đường phượt',
    riderName: b.riderName || 'Rider',
    riderAvatar:
      b.riderAvatar ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    riderBadge: b.riderBadge || 'Adventure Explorer',
    riderBadgeVie: b.riderBadgeVie || 'Nhà thám hiểm',
    bikeModel: b.bikeModel || 'Adventure Motorcycle',
    distanceKm: b.distanceKm || 300,
    avgVelocityKmh: b.avgVelocityKmh || 50,
    maxVelocityKmh: b.maxVelocityKmh || 80,
    groupSize: b.groupSize || '4 Riders',
    duration: b.duration || '2 Days, 1 Night',
    durationVie: b.durationVie || '2 Ngày, 1 Đêm',
    dates: b.dates || 'Upcoming',
    category: b.category || 'popular',
    coverImage:
      b.coverImage ||
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    likesCount: b.likesCount || 0,
    commentsCount: b.commentsCount || 0,
    totalCostVnd: b.totalCostVnd || '2,000,000 VND',
    totalCostUsd: b.totalCostUsd || '$80 USD',
    description: b.description || 'Scenic adventure tour.',
    descriptionVie: b.descriptionVie || 'Hành trình khám phá cung đường đẹp.',
    googleMapsUrl: b.googleMapsUrl,
    destination,
    eatDrink,
    landmarks,
    lodging,
  };
}

/**
 * Fetch all trips from Neo4j backend
 */
export async function fetchTripsApi(): Promise<TripData[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/trips`);
    if (res.ok) {
      const data: BackendTripResponse[] = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapBackendToClientTrip);
      }
    }
  } catch (err: any) {
    console.warn('[tripApi] Failed to fetch trips from server:', err.message);
  }
  return [];
}

/**
 * Create a new trip in Neo4j backend
 */
export async function createTripApi(trip: TripData): Promise<TripData> {
  const payload: BackendTripResponse = {
    id: trip.id,
    title: trip.title,
    titleVie: trip.titleVie,
    riderName: trip.riderName,
    riderAvatar: trip.riderAvatar,
    riderBadge: trip.riderBadge,
    riderBadgeVie: trip.riderBadgeVie,
    bikeModel: trip.bikeModel,
    distanceKm: trip.distanceKm,
    avgVelocityKmh: trip.avgVelocityKmh,
    maxVelocityKmh: trip.maxVelocityKmh,
    groupSize: trip.groupSize,
    duration: trip.duration,
    durationVie: trip.durationVie,
    dates: trip.dates,
    category: trip.category,
    coverImage: trip.coverImage,
    likesCount: trip.likesCount,
    commentsCount: trip.commentsCount,
    totalCostVnd: trip.totalCostVnd,
    totalCostUsd: trip.totalCostUsd,
    description: trip.description,
    descriptionVie: trip.descriptionVie,
    googleMapsUrl: trip.googleMapsUrl,
    destinationJson: trip.destination ? JSON.stringify(trip.destination) : undefined,
    eatDrinkJson: trip.eatDrink ? JSON.stringify(trip.eatDrink) : undefined,
    landmarksJson: trip.landmarks ? JSON.stringify(trip.landmarks) : undefined,
    lodgingJson: trip.lodging ? JSON.stringify(trip.lodging) : undefined,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data: BackendTripResponse = await res.json();
      return mapBackendToClientTrip(data);
    }
  } catch (err: any) {
    console.warn('[tripApi] Failed to create trip on server:', err.message);
  }
  return trip;
}

/**
 * Fetch a single trip by ID from Neo4j backend
 */
export async function fetchTripByIdApi(tripId: string): Promise<TripData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/trips/${tripId}`);
    if (res.ok) {
      const data: BackendTripResponse = await res.json();
      return mapBackendToClientTrip(data);
    }
  } catch (err: any) {
    console.warn('[tripApi] Failed to fetch trip by ID:', err.message);
  }
  return null;
}
