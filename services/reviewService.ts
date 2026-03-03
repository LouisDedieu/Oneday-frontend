import { apiFetch, apiPatch, apiPost, apiDelete } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbSpot {
  id: string;
  name: string;
  spot_type: string | null;
  address: string | null;
  duration_minutes: number | null;
  price_range: string | null;
  tips: string | null;
  highlight: boolean;
  latitude: number | null;
  longitude: number | null;
  // Lien vers la ville source (pour navigation et sync)
  source_city_id: string | null;
  city_highlight_id: string | null;
  _synced_from_highlight?: boolean;
}

export interface DbDay {
  id: string;
  day_number: number;
  location: string | null;
  destination_id: string | null;
  theme: string | null;
  accommodation_name: string | null;
  breakfast_spot: string | null;
  lunch_spot: string | null;
  dinner_spot: string | null;
  validated: boolean;
  spots: DbSpot[];
}

export interface DbTrip {
  id: string;
  trip_title: string;
  vibe: string | null;
  duration_days: number;
  source_url: string;
  content_creator_handle: string | null;
  destination: string;
  days: DbDay[];
}

export type SpotUpdatePayload = Partial<Pick<
  DbSpot,
  'name' | 'spot_type' | 'address' | 'duration_minutes' | 'price_range' | 'tips' | 'highlight'
>>;

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchTripForReview(tripId: string): Promise<DbTrip | null> {
  try {
    return await apiFetch<DbTrip>(`/review/${tripId}`);
  } catch {
    return null;
  }
}

// ── Day mutations ─────────────────────────────────────────────────────────────

export async function setDayValidated(dayId: string, validated: boolean): Promise<void> {
  await apiPatch(`/review/days/${dayId}/validate`, { validated });
}

/**
 * Appelé au moment du save dans ReviewMode (usage unique).
 * Délègue au backend la synchronisation des destinations.
 */
export async function syncDestinations(tripId: string): Promise<void> {
  await apiPost(`/review/${tripId}/sync`);
}

// ── Spot mutations ────────────────────────────────────────────────────────────

export async function updateSpot(spotId: string, payload: SpotUpdatePayload): Promise<void> {
  await apiPatch(`/review/spots/${spotId}`, payload);
}

export async function deleteSpot(spotId: string): Promise<void> {
  await apiDelete(`/review/spots/${spotId}`);
}

// ── Add city to trip ─────────────────────────────────────────────────────────

export interface AddCityToTripPayload {
  city_id: string;
  day_id?: string;
  create_new_day?: boolean;
}

export interface AddCityToTripResult {
  added: boolean;
  spots_count: number;
  day_id: string;
  city_name: string;
}

export async function addCityToTrip(
  tripId: string,
  payload: AddCityToTripPayload
): Promise<AddCityToTripResult> {
  return apiPost<AddCityToTripResult>(`/review/${tripId}/add-city`, payload);
}

// ── Add new destination (manual city) ────────────────────────────────────────

export interface AddDestinationPayload {
  city_name: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface AddDestinationResult {
  added: boolean;
  destination_id: string;
  day_id: string;
  city_name: string;
}

export async function addDestinationToTrip(
  tripId: string,
  payload: AddDestinationPayload
): Promise<AddDestinationResult> {
  return apiPost<AddDestinationResult>(`/review/${tripId}/add-destination`, payload);
}

// ── Delete destination ────────────────────────────────────────────────────────

export async function deleteDestination(tripId: string, destId: string): Promise<void> {
  await apiDelete(`/review/${tripId}/destinations/${destId}`);
}

// ── Reorder destinations ──────────────────────────────────────────────────────

export interface ReorderDestinationsPayload {
  destinations: Array<{ id: string; order: number }>;
}

export async function reorderDestinations(
  tripId: string,
  payload: ReorderDestinationsPayload
): Promise<void> {
  await apiPatch(`/review/${tripId}/destinations/reorder`, payload);
}
