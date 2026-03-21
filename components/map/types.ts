import { HighlightCategory } from '@/types/api';

/**
 * Geocoding result for a map marker
 */
export interface GeocodingResult {
  coords: [number, number];
  confidence: 'high' | 'low';
  source: string;
}

/**
 * Generic map marker used by BaseMap
 */
export interface MapMarker {
  id: string;
  coords: [number, number];
  confidence: 'high' | 'low';
}

/**
 * Extended marker for trip destinations
 */
export interface TripMarker extends MapMarker {
  visitOrder: number;
  city: string;
  country?: string;
}

/**
 * Extended marker for city highlights
 */
export interface CityMarker extends MapMarker {
  name: string;
  category: HighlightCategory;
  isMustSee?: boolean;
  subtype?: string;
}

/**
 * Map region definition
 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Calculate region that fits all markers with padding
 */
export function calculateRegion(
  coords: [number, number][],
  padding: number = 1.5,
  minDelta: number = 0.02
): MapRegion {
  if (coords.length === 0) {
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }

  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, minDelta),
    longitudeDelta: Math.max((maxLon - minLon) * padding, minDelta),
  };
}

/**
 * Category colors for city highlights
 */
export const CATEGORY_COLORS: Record<HighlightCategory, string> = {
  food: '#f97316',
  culture: '#3b82f6',
  nature: '#22c55e',
  shopping: '#ec4899',
  nightlife: '#a855f7',
  other: '#71717a',
};

/**
 * Category labels for city highlights
 */
export const CATEGORY_LABELS: Record<HighlightCategory, string> = {
  food: 'Food',
  culture: 'Culture',
  nature: 'Nature',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  other: 'Other',
};

/**
 * Confidence colors for markers
 */
export const CONFIDENCE_COLORS = {
  high: '#3b82f6',
  low: '#f59e0b',
} as const;
