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
  job_id?: string;
}

/**
 * Detect if a trip result is not travel-related (video was not about travel)
 */
export function isNotTravelTrip(trip: DbTrip): boolean {
  return (
    trip.trip_title === 'N/A' ||
    trip.destination === 'N/A' ||
    trip.days.length === 0
  );
}

export type SpotUpdatePayload = Partial<Pick<
  DbSpot,
  'name' | 'spot_type' | 'address' | 'duration_minutes' | 'price_range' | 'tips' | 'highlight'
>>;

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchTripForEdit(tripId: string): Promise<DbTrip | null> {
  try {
    return await apiFetch<DbTrip>(`/trips/${tripId}/edit`);
  } catch {
    return null;
  }
}

// ── Day mutations ─────────────────────────────────────────────────────────────

export async function setDayValidated(dayId: string, validated: boolean): Promise<void> {
  await apiPatch(`/trips/days/${dayId}/validate`, { validated });
}

/**
 * Appelé au moment du save dans ReviewMode (usage unique).
 * Délègue au backend la synchronisation des destinations.
 */
export async function syncDestinations(tripId: string): Promise<void> {
  await apiPost(`/trips/${tripId}/sync`);
}

// ── Spot mutations ────────────────────────────────────────────────────────────

export async function updateSpot(spotId: string, payload: SpotUpdatePayload): Promise<void> {
  await apiPatch(`/trips/spots/${spotId}`, payload);
}

export async function deleteSpot(spotId: string): Promise<void> {
  await apiDelete(`/trips/spots/${spotId}`);
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
  return apiPost<AddCityToTripResult>(`/trips/${tripId}/add-city`, payload);
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
  return apiPost<AddDestinationResult>(`/trips/${tripId}/add-destination`, payload);
}

// ── Delete destination ────────────────────────────────────────────────────────

export async function deleteDestination(tripId: string, destId: string): Promise<void> {
  await apiDelete(`/trips/${tripId}/destinations/${destId}`);
}

// ── Reorder destinations ──────────────────────────────────────────────────────

export interface ReorderDestinationsPayload {
  destinations: Array<{ id: string; order: number }>;
}

export async function reorderDestinations(
  tripId: string,
  payload: ReorderDestinationsPayload
): Promise<void> {
  await apiPatch(`/trips/${tripId}/destinations/reorder`, payload);
}

// ── Create spot (manual) ─────────────────────────────────────────────────────

export interface CreateSpotPayload {
  day_id: string;
  name: string;
  spot_type?: string;
  address?: string;
  duration_minutes?: number;
  price_range?: string;
  tips?: string;
  highlight?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface CreateSpotResult {
  id: string;
  name: string;
  day_id: string;
}

export async function createSpot(
  tripId: string,
  payload: CreateSpotPayload
): Promise<CreateSpotResult> {
  return apiPost<CreateSpotResult>(`/trips/${tripId}/spots`, payload);
}

// ── Reorder spots ────────────────────────────────────────────────────────────

export interface ReorderSpotsPayload {
  spots: Array<{ id: string; order: number }>;
}

export async function reorderSpots(
  dayId: string,
  payload: ReorderSpotsPayload
): Promise<void> {
  await apiPatch(`/trips/days/${dayId}/spots/reorder`, payload);
}

// ── Move spot to another day ─────────────────────────────────────────────────

export interface MoveSpotPayload {
  target_day_id: string;
  order?: number;
}

export async function moveSpotToDay(
  spotId: string,
  payload: MoveSpotPayload
): Promise<void> {
  await apiPatch(`/trips/spots/${spotId}/move`, payload);
}

// ── Update destination (name/country) ────────────────────────────────────────

export interface UpdateDestinationPayload {
  city_name?: string;
  country?: string;
}

export async function updateDestination(
  destId: string,
  payload: UpdateDestinationPayload
): Promise<void> {
  await apiPatch(`/trips/destinations/${destId}`, payload);
}

// ── Delete trip ────────────────────────────────────────────────────────────────

export async function deleteTrip(tripId: string): Promise<void> {
  await apiDelete(`/trips/${tripId}`);
}
