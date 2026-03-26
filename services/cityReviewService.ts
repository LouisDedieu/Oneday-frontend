/**
 * Service for city review operations
 */
import { apiFetch, apiPatch, apiPost, apiDelete } from '@/lib/api';
import { Highlight, HighlightCategory, CityBudget } from '@/types/api';

/**
 * City data structure for review mode
 */
export interface DbCity {
  id: string;
  city_title: string;
  city_name: string;
  country: string;
  vibe_tags: string[];
  source_url: string;
  content_creator_handle: string | null;
  highlights: Highlight[];
  highlights_count: number;
  category_counts: Record<string, number>;
  budget: CityBudget | null;
  job_id?: string;
}

/**
 * Detect if a city result is not travel-related (video was not about travel)
 */
export function isNotTravelCity(city: DbCity): boolean {
  return (
    city.city_title === 'N/A' ||
    city.city_name === 'N/A' ||
    city.country === 'N/A'
  );
}

/**
 * Payload for updating a highlight
 */
export type HighlightUpdatePayload = Partial<
  Pick<
    Highlight,
    | 'name'
    | 'category'
    | 'subtype'
    | 'address'
    | 'description'
    | 'price_range'
    | 'tips'
    | 'is_must_see'
    | 'validated'
  >
>;

/**
 * Payload for creating a new highlight
 */
export interface CreateHighlightPayload {
  name: string;
  category?: string;
  subtype?: string;
  address?: string;
  description?: string;
  price_range?: string;
  tips?: string;
  is_must_see?: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch a city for editing (includes all highlights, validated or not)
 */
export async function fetchCityForEdit(cityId: string): Promise<DbCity | null> {
  try {
    return await apiFetch<DbCity>(`/cities/${cityId}/edit`);
  } catch {
    return null;
  }
}

/**
 * Update a highlight's fields
 */
export async function updateHighlight(
  highlightId: string,
  payload: HighlightUpdatePayload
): Promise<void> {
  await apiPatch(`/cities/highlights/${highlightId}`, payload);
}

/**
 * Update a highlight's coordinates
 */
export async function updateHighlightCoordinates(
  highlightId: string,
  lat: number,
  lon: number
): Promise<void> {
  await apiPatch(`/cities/highlights/${highlightId}/coordinates`, { lat, lon });
}

/**
 * Reorder highlights (for drag & drop)
 */
export async function reorderHighlights(
  cityId: string,
  highlights: Array<{ id: string; order: number }>
): Promise<void> {
  await apiPatch(`/cities/highlights/reorder`, {
    city_id: cityId,
    highlights,
  });
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(highlightId: string): Promise<void> {
  await apiDelete(`/cities/highlights/${highlightId}`);
}

/**
 * Create a new highlight for a city
 */
export async function createHighlight(
  cityId: string,
  payload: CreateHighlightPayload
): Promise<Highlight> {
  return apiPost<Highlight>(`/cities/${cityId}/highlights`, payload);
}

/**
 * Sync city data after review
 * - Removes non-validated highlights
 * - Recalculates highlight order
 */
export async function syncCityData(cityId: string): Promise<{
  synced: boolean;
  remaining_highlights: number;
}> {
  return apiPost(`/cities/${cityId}/sync`);
}

/**
 * Validate or invalidate a single highlight
 */
export async function setHighlightValidated(
  highlightId: string,
  validated: boolean
): Promise<void> {
  await updateHighlight(highlightId, { validated });
}

/**
 * Change a highlight's category
 */
export async function setHighlightCategory(
  highlightId: string,
  category: HighlightCategory
): Promise<void> {
  await updateHighlight(highlightId, { category });
}

/**
 * Delete a city
 */
export async function deleteCity(cityId: string): Promise<void> {
  await apiDelete(`/cities/${cityId}`);
}
