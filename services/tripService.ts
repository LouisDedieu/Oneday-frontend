import { apiFetch, apiPost, apiPatch, apiDelete } from '@/lib/api';

/** Full trip with nested relations — only validated itinerary days */
export async function getTrip(tripId: string) {
  return apiFetch<any>(`/trips/${tripId}`);
}

/** All public trips (for a discovery feed) */
export async function getPublicTrips(limit = 20) {
  return apiFetch<any[]>(`/trips/public?limit=${limit}`);
}


/** Delete a trip (user must own it — enforced by backend) */
export async function deleteTrip(tripId: string) {
  return apiDelete(`/trips/${tripId}`);
}

// ── Saved trips ──────────────────────────────────────────────────────────────

/** Check if a trip is already saved by the current user */
export async function isTripSaved(_userId: string, tripId: string): Promise<boolean> {
  const res = await apiFetch<{ saved: boolean }>(`/trips/${tripId}/saved`);
  return res.saved;
}

/** Save a trip for the current user (idempotent) */
export async function saveTrip(
  _userId: string,
  tripId: string,
  notes?: string
): Promise<void> {
  await apiPost(`/trips/${tripId}/save`, notes ? { notes } : {});
}

/** Remove a saved trip */
export async function unsaveTrip(_userId: string, tripId: string): Promise<void> {
  await apiDelete(`/trips/${tripId}/save`);
}

/** Toggle save/unsave — returns the new saved state */
export async function toggleSaveTrip(
  userId: string,
  tripId: string,
  notes?: string
): Promise<boolean> {
  const already = await isTripSaved(userId, tripId);
  if (already) {
    await unsaveTrip(userId, tripId);
    return false;
  } else {
    await saveTrip(userId, tripId, notes);
    return true;
  }
}

/**
 * Valide et sauvegarde un trip de manière atomique (transactionnelle).
 * Combine syncDestinations + saveTrip en une seule opération.
 * Si une étape échoue, toutes les modifications sont annulées.
 */
export async function validateAndSaveTrip(
  tripId: string,
  notes?: string
): Promise<{ success: boolean; synced: boolean; saved: boolean }> {
  return apiPost(`/trips/${tripId}/validate-and-save`, notes ? { notes } : {});
}

/** Get all trips saved by the current user */
export async function getUserSavedTrips(_userId: string) {
  return apiFetch<any[]>('/trips/saved');
}

export async function updateSpotCoordinates(spotId: string, lat: number, lon: number) {
  try {
    await apiPatch(`/review/spots/${spotId}/coordinates`, { lat, lon });
  } catch (e) {
    console.error(`Erreur update spot ${spotId}:`, e);
  }
}

export async function updateDestinationCoordinates(destId: string, lat: number, lon: number) {
  try {
    await apiPatch(`/review/destinations/${destId}/coordinates`, { lat, lon });
  } catch (e) {
    console.error(`Erreur update destination ${destId}:`, e);
  }
}

