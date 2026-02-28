export interface AnalysisResponse {
  job_id: string;
  trip_id: string | null;
  city_id: string | null;
  entity_type: EntityType;
  duration_seconds: number;
  source_url: string;
  raw_json: TripData | CityData;
  existing_city_match?: {
    city_id: string;
    city_name: string;
    existing_highlights_count: number;
  };
}

// ── Entity Type ─────────────────────────────────────────────────────────────
export type EntityType = 'trip' | 'city';

// ── Highlight Categories ────────────────────────────────────────────────────
export type HighlightCategory = 'food' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'other';

export const HIGHLIGHT_CATEGORIES: Record<HighlightCategory, {
  icon: string;
  color: string;
  label: string;
}> = {
  food: { icon: 'Utensils', color: 'orange', label: 'Food & Drinks' },
  culture: { icon: 'Landmark', color: 'blue', label: 'Culture' },
  nature: { icon: 'Trees', color: 'green', label: 'Nature' },
  shopping: { icon: 'ShoppingBag', color: 'pink', label: 'Shopping' },
  nightlife: { icon: 'Moon', color: 'purple', label: 'Nightlife' },
  other: { icon: 'MapPin', color: 'zinc', label: 'Other' },
};

// ── Vibe Tags ───────────────────────────────────────────────────────────────
export type VibeTag =
  | 'romantic'
  | 'trendy'
  | 'historic'
  | 'bohemian'
  | 'luxurious'
  | 'budget-friendly'
  | 'foodie'
  | 'artsy'
  | 'family-friendly'
  | 'adventurous'
  | 'relaxing'
  | 'nightlife'
  | 'cultural'
  | 'off-the-beaten-path'
  | 'instagrammable';

// ── Highlight (POI) ─────────────────────────────────────────────────────────
export interface Highlight {
  id: string;
  name: string;
  category: HighlightCategory;
  subtype?: string;
  address?: string;
  description?: string;
  price_range?: string;
  tips?: string;
  is_must_see?: boolean;
  latitude?: number;
  longitude?: number;
  highlight_order?: number;
  validated?: boolean;
}

// ── City Budget ─────────────────────────────────────────────────────────────
export interface CityBudget {
  currency: string;
  daily_average?: number;
  food_average?: number;
  transport_average?: number;
  activities_average?: number;
  accommodation_range?: string;
}

// ── City Data ───────────────────────────────────────────────────────────────
export interface CityData {
  id?: string;
  city_title: string;
  city_name: string;
  country: string;
  vibe_tags?: VibeTag[];
  best_season?: string;
  latitude?: number;
  longitude?: number;
  source_url?: string;
  thumbnail_url?: string;
  content_creator_handle?: string;
  content_creator_links?: string[];
  highlights?: Highlight[];
  city_highlights?: Highlight[];
  budget?: CityBudget;
  city_budgets?: CityBudget[];
  practical_info?: PracticalInfo;
  city_practical_info?: PracticalInfo[];
  is_public?: boolean;
  created_at?: string;
}

// ── Type Guards ─────────────────────────────────────────────────────────────
export function isTripData(data: TripData | CityData): data is TripData {
  return 'itinerary' in data || 'duration_days' in data || 'destinations' in data;
}

export function isCityData(data: TripData | CityData): data is CityData {
  return 'highlights' in data || 'city_highlights' in data || 'city_name' in data;
}

export interface AnalysisError {
  error: string;
  message: string;
}

// ── Shape of the AI output ─────────────────────────────────────────────────

export interface TripData {
  trip_title: string;
  vibe?: string;
  duration_days?: number;
  best_season?: string;
  destinations?: Destination[];
  itinerary?: ItineraryDay[];
  logistics?: LogisticsItem[];
  budget?: Budget;
  practical_info?: PracticalInfo;
  content_creator?: ContentCreator;
}

export interface Destination {
  id: string;
  city: string | null;
  country: string | null;
  days_spent: number | null;
  visit_order: number;
  latitude: number | null;
  longitude: number | null;
}

export interface ItineraryDay {
  day: number;
  location: string;
  theme?: string;
  accommodation?: Accommodation;
  meals?: Meals;
  spots?: Spot[];
}

export interface Accommodation {
  name: string;
  type?: string;
  price_per_night?: number;
  tips?: string;
}

export interface Meals {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

export interface Spot {
  name: string;
  type?: string;
  address?: string;
  duration_minutes?: number;
  price_range?: string;
  price_detail?: string;
  tips?: string;
  highlight?: boolean;
  verified?: boolean;
}

export interface LogisticsItem {
  from: string;
  to: string;
  mode: string;
  duration?: string;
  cost?: string;
  tips?: string;
}

export interface Budget {
  total_estimated?: number;
  currency?: string;
  per_day?: { min: number; max: number };
  breakdown?: { accommodation?: number; food?: number; transport?: number; activities?: number };
  money_saving_tips?: string[];
}

export interface PracticalInfo {
  visa_required?: boolean;
  local_currency?: string;
  language?: string;
  best_apps?: string[];
  what_to_pack?: string[];
  safety_tips?: string[];
  avoid?: string[];
}

export interface ContentCreator {
  handle?: string;
  links_mentioned?: string[];
}