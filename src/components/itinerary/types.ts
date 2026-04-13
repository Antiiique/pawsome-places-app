export interface ItineraryStep {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  address?: string;
  city?: string;
  phone?: string;
  opening_hours?: string;
  rating?: number;
  latitude: number;
  longitude: number;
  distance_from_start_km: number;
  accepts_dogs: boolean;
  accepts_cats: boolean;
  outdoor_seating: boolean;
  verified: boolean;
}

export interface ItineraryMapData {
  routePath: Array<{ lat: number; lng: number }>;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  steps: ItineraryStep[];
  pausePoints: Array<{ lat: number; lng: number; distance_km: number }>;
  totalDistance: string;
  totalDuration: string;
}

export interface PlaceSelection {
  location: { lat: number; lng: number };
  text: string;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  isPetFriendly: boolean;
}
