export interface PitStop {
  name: string;
  type: string;
  rating: string;
  cost: string;
}

export interface Landmark {
  name: string;
  stopTime: string;
  fee: string;
}

export interface Lodging {
  name: string;
  price: string;
  status: string;
}

export interface DestinationCoord {
  name: string;
  nameVie?: string;
  latitude: number;
  longitude: number;
  address?: string;
  mapUrl?: string;
}

export interface TripData {
  id: string;
  googleMapsUrl?: string;
  title: string;
  titleVie: string;
  riderName: string;
  riderAvatar: string;
  riderBadge: string;
  riderBadgeVie: string;
  bikeModel: string;
  distanceKm: number;
  avgVelocityKmh: number;
  maxVelocityKmh: number;
  groupSize: string;
  duration: string;
  durationVie: string;
  dates: string;
  category: 'all' | 'popular' | 'nearby' | 'international';
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  totalCostVnd: string;
  totalCostUsd: string;
  description: string;
  descriptionVie: string;
  destination?: DestinationCoord;
  eatDrink: PitStop[];
  landmarks: Landmark[];
  lodging: Lodging[];
}

// Trips are loaded from Neo4j database via fetchTripsApi()
export const mockTripsData: TripData[] = [];
