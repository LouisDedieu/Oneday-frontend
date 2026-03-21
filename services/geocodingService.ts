/**
 * services/geocodingService.ts — Service de géocodage via le backend
 *
 * Proxy les requêtes de géocodage via le backend pour protéger la clé API LocationIQ.
 */
import { apiFetch } from '@/lib/api';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name?: string;
}

interface GeocodingResponse {
  results: GeocodingResult[];
}

/**
 * Normalise le texte pour améliorer les résultats de géocodage.
 * Supprime les accents et caractères spéciaux.
 */
export function normalizeTextForGeocoding(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, "'")
    .replace(/[""„]/g, '"')
    .replace(/[^\w\s,.-]/g, '')
    .trim();
}

/**
 * Géocode une requête textuelle en coordonnées.
 * @param query - La chaîne de recherche (adresse, ville, etc.)
 * @param limit - Nombre maximum de résultats (défaut: 1)
 * @returns Les résultats de géocodage ou un tableau vide si aucun résultat
 */
export async function geocodeQuery(
  query: string,
  limit: number = 1
): Promise<GeocodingResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await apiFetch<GeocodingResponse>(
      `/geocoding/search?q=${encodedQuery}&limit=${limit}`
    );
    return response.results;
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Géocode une adresse avec un contexte de ville.
 * Essaie plusieurs variantes pour maximiser les chances de succès.
 * @param address - L'adresse à géocoder
 * @param cityContext - Le contexte de la ville (ex: "Paris, France")
 * @returns Les coordonnées ou null si non trouvé
 */
export async function geocodeAddress(
  address: string,
  cityContext: string
): Promise<{ lat: number; lon: number } | null> {
  const queries = [
    `${address.trim()}, ${cityContext}`,
    `${normalizeTextForGeocoding(address)}, ${cityContext}`,
  ];

  for (const query of queries) {
    const results = await geocodeQuery(query);
    if (results.length > 0) {
      return { lat: results[0].lat, lon: results[0].lon };
    }
  }

  return null;
}

/**
 * Géocode une destination de voyage (ville + pays).
 * Essaie d'abord la requête originale, puis une version normalisée,
 * et enfin tombe en fallback sur le pays seul.
 * @param city - Nom de la ville
 * @param country - Nom du pays
 * @returns Les coordonnées et le niveau de confiance
 */
export async function geocodeDestination(
  city: string | null,
  country: string | null
): Promise<{
  coords: [number, number];
  confidence: 'high' | 'low';
  source: string;
} | null> {
  const query = [city, country].filter(Boolean).join(', ');
  if (!query) return null;

  // Essai 1: requête originale
  let results = await geocodeQuery(query);
  if (results.length > 0) {
    return {
      coords: [results[0].lat, results[0].lon],
      confidence: 'high',
      source: 'LocationIQ API',
    };
  }

  // Essai 2: requête normalisée
  const normalizedQuery = normalizeTextForGeocoding(query);
  if (normalizedQuery !== query) {
    results = await geocodeQuery(normalizedQuery);
    if (results.length > 0) {
      return {
        coords: [results[0].lat, results[0].lon],
        confidence: 'high',
        source: 'LocationIQ API (normalized)',
      };
    }
  }

  // Essai 3: fallback sur le pays uniquement
  if (country) {
    results = await geocodeQuery(country);
    if (results.length > 0) {
      return {
        coords: [results[0].lat, results[0].lon],
        confidence: 'low',
        source: `Centre du pays (${country})`,
      };
    }
  }

  return null;
}

/**
 * Géocode un point d'intérêt (highlight) avec plusieurs stratégies.
 * @param name - Nom du POI
 * @param address - Adresse du POI (optionnel)
 * @param cityContext - Contexte de la ville (ex: "Paris, France")
 * @returns Les coordonnées et le niveau de confiance
 */
export async function geocodeHighlight(
  name: string,
  address: string | null | undefined,
  cityContext: string
): Promise<{
  coords: [number, number];
  confidence: 'high' | 'low';
  source: string;
} | null> {
  const queries: string[] = [];

  // Stratégie 1: adresse + contexte ville
  if (address) {
    queries.push(`${address}, ${cityContext}`);
  }

  // Stratégie 2: nom + contexte ville
  queries.push(`${name}, ${cityContext}`);

  // Stratégie 3: version normalisée
  queries.push(normalizeTextForGeocoding(`${name}, ${cityContext}`));

  for (const query of queries) {
    const results = await geocodeQuery(query);
    if (results.length > 0) {
      return {
        coords: [results[0].lat, results[0].lon],
        confidence: 'high',
        source: 'LocationIQ API',
      };
    }
  }

  return null;
}
