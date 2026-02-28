/**
 * Service for city-related operations
 */
import { apiFetch, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { CityData } from '@/types/api';

/**
 * Get a city with all its relations (highlights, budget, practical_info)
 */
export async function getCity(cityId: string): Promise<CityData> {
  return apiFetch<CityData>(`/cities/${cityId}`);
}

/**
 * Delete a city
 */
export async function deleteCity(cityId: string): Promise<void> {
  await apiDelete(`/cities/${cityId}`);
}

/**
 * Check if a city is saved by the current user
 */
export async function isCitySaved(_userId: string, cityId: string): Promise<boolean> {
  const res = await apiFetch<{ saved: boolean }>(`/cities/${cityId}/saved`);
  return res.saved;
}

/**
 * Save a city for the current user
 */
export async function saveCity(_userId: string, cityId: string, notes?: string): Promise<void> {
  await apiPost(`/cities/${cityId}/save`, notes ? { notes } : {});
}

/**
 * Unsave a city for the current user
 */
export async function unsaveCity(_userId: string, cityId: string): Promise<void> {
  await apiDelete(`/cities/${cityId}/save`);
}

/**
 * Toggle save/unsave a city
 * @returns The new saved state (true = now saved, false = now unsaved)
 */
export async function toggleSaveCity(
  userId: string,
  cityId: string,
  notes?: string
): Promise<boolean> {
  const alreadySaved = await isCitySaved(userId, cityId);
  if (alreadySaved) {
    await unsaveCity(userId, cityId);
    return false;
  }
  await saveCity(userId, cityId, notes);
  return true;
}

/**
 * Get user's saved cities with pagination
 */
export async function getUserSavedCities(
  _userId: string,
  page = 1,
  limit = 20
): Promise<{
  items: Array<{
    id: string;
    notes: string | null;
    created_at: string;
    cities: CityData | null;
  }>;
  page: number;
  limit: number;
  has_more: boolean;
}> {
  return apiFetch(`/cities/saved?page=${page}&limit=${limit}`);
}

/**
 * Check if a city with this name already exists (for merge detection)
 */
export async function checkCityMatch(cityName: string): Promise<{
  match: boolean;
  city_id?: string;
  city_name?: string;
  city_title?: string;
  highlights_count?: number;
}> {
  return apiFetch(`/cities/match?city_name=${encodeURIComponent(cityName)}`);
}

/**
 * Merge highlights from source city into target city
 * @param highlightIds - If provided, only merge these specific highlights
 * @param deleteSource - If true (default), delete source city after merge
 */
export async function mergeCities(
  targetCityId: string,
  sourceCityId: string,
  highlightIds?: string[],
  deleteSource = true
): Promise<{ merged: boolean; highlights_merged: number; source_deleted: boolean }> {
  return apiPost(`/cities/${targetCityId}/merge`, {
    source_city_id: sourceCityId,
    highlight_ids: highlightIds,
    delete_source: deleteSource,
  });
}

/**
 * Update a city's coordinates
 */
export async function updateCityCoordinates(
  cityId: string,
  lat: number,
  lon: number
): Promise<void> {
  await apiPatch(`/cities/${cityId}`, { latitude: lat, longitude: lon });
}
