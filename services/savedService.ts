/**
 * Service for unified saved items (trips + cities)
 */
import { apiFetch } from '@/lib/api';
import { EntityType } from '@/types/api';

export type SavedFilter = 'all' | 'trip' | 'city';

/**
 * Unified saved item structure
 */
export interface SavedItem {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  title: string;
  subtitle: string;
  thumbnail_url: string | null;
  vibe: string | null;
  duration_days: number | null;
  highlights_count: number | null;
  created_at: string;
  notes: string | null;
  source_url: string | null;
  content_creator_handle: string | null;
}

/**
 * Response from the unified saved endpoint
 */
export interface SavedItemsResponse {
  items: SavedItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

/**
 * Get all saved items (trips and/or cities) with pagination
 *
 * @param userId - User ID (passed for API compatibility, auth handled by backend)
 * @param filter - Filter by type: 'all' | 'trip' | 'city'
 * @param page - Page number (1-based)
 * @param limit - Items per page
 */
export async function getUserSavedItems(
  _userId: string,
  filter: SavedFilter = 'all',
  page = 1,
  limit = 20
): Promise<SavedItemsResponse> {
  return apiFetch<SavedItemsResponse>(
    `/trips/saved/all?type=${filter}&page=${page}&limit=${limit}`
  );
}

/**
 * Helper to format the subtitle for display
 */
export function formatSubtitle(item: SavedItem): string {
  if (item.entity_type === 'trip' && item.duration_days) {
    return `${item.duration_days} jours`;
  }
  if (item.entity_type === 'city' && item.highlights_count) {
    return `${item.highlights_count} highlights`;
  }
  return item.subtitle || '';
}

/**
 * Helper to get the accent color for an entity type
 */
export function getEntityAccentColor(entityType: EntityType): string {
  return entityType === 'city' ? '#a855f7' : '#3b82f6'; // purple vs blue
}

/**
 * Helper to get the entity type label
 */
export function getEntityTypeLabel(entityType: EntityType): string {
  return entityType === 'city' ? 'City Guide' : 'Trip';
}
