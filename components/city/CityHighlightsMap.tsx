/**
 * CityHighlightsMap - Map view for city highlights with geocoding support
 * Similar to InteractiveHeroMap but adapted for city POIs
 */
import React, {useEffect, useRef, useState} from 'react';
import {Text, View} from 'react-native';
import MapView, {Callout, Marker, Region} from 'react-native-maps';
import {Highlight, HighlightCategory} from '@/types/api';
import {updateHighlightCoordinates} from '@/services/cityReviewService';
import {geocodeHighlight as geocodeHighlightService} from '@/services/geocodingService';
import Loader from "@/components/Loader";

const CATEGORY_COLORS: Record<HighlightCategory, string> = {
  food: '#f97316',
  culture: '#3b82f6',
  nature: '#22c55e',
  shopping: '#ec4899',
  nightlife: '#a855f7',
  other: '#71717a',
};

const CATEGORY_LABELS: Record<HighlightCategory, string> = {
  food: 'Food',
  culture: 'Culture',
  nature: 'Nature',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  other: 'Other',
};

type GeocodingResult = {
  coords: [number, number];
  confidence: 'high' | 'low';
  source: string;
  highlight: Highlight;
};

interface CityHighlightsMapProps {
  highlights: Highlight[];
  cityName: string;
  country?: string;
  cityLat?: number;
  cityLon?: number;
  selectedCategories?: HighlightCategory[];
  height?: number;
  /** Hide the internal approximate badge (for custom placement) */
  hideApproximateBadge?: boolean;
  /** Callback with approximate count when results are ready */
  onApproximateCount?: (count: number) => void;
}

export function CityHighlightsMap({
  highlights,
  cityName,
  country,
  cityLat,
  cityLon,
  selectedCategories = [],
  height = 200,
  hideApproximateBadge = false,
  onApproximateCount,
}: CityHighlightsMapProps) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: cityLat || 48.8566,
    longitude: cityLon || 2.3522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView>(null);
  const hasFetched = useRef(false);

  // Geocode a highlight location
  async function geocodeHighlight(
    highlight: Highlight,
    cityContext: string
  ): Promise<GeocodingResult | null> {
    try {
      const result = await geocodeHighlightService(
        highlight.name,
        highlight.address,
        cityContext
      );

      if (result) {
        return {
          coords: result.coords,
          confidence: result.confidence,
          source: result.source,
          highlight,
        };
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }

    // Fallback: use city center as approximation
    if (cityLat && cityLon) {
      // Add small random offset to avoid stacking markers
      const offset = () => (Math.random() - 0.5) * 0.01;
      return {
        coords: [cityLat + offset(), cityLon + offset()],
        confidence: 'low',
        source: `Centre de ${cityName}`,
        highlight,
      };
    }

    return null;
  }

  // Reset when highlights change
  useEffect(() => {
    setResults([]);
    setLoading(true);
    hasFetched.current = false;
  }, [highlights]);

  // Geocode all highlights
  useEffect(() => {
    if (hasFetched.current) return;

    const resolveCoordinates = async () => {
      setLoading(true);
      const resultsArray: GeocodingResult[] = [];
      const cityContext = [cityName, country].filter(Boolean).join(', ');

      for (const highlight of highlights) {
        // Skip if already has coordinates
        if (highlight.latitude && highlight.longitude) {
          resultsArray.push({
            coords: [Number(highlight.latitude), Number(highlight.longitude)],
            confidence: 'high',
            source: 'Base de donnees',
            highlight,
          });
          continue;
        }

        // Geocode
        const result = await geocodeHighlight(highlight, cityContext);

        if (result) {
          resultsArray.push(result);

          // Persist high confidence coordinates
          if (result.confidence === 'high') {
            updateHighlightCoordinates(highlight.id, result.coords[0], result.coords[1])
              .then(() => console.log('Persisted coordinates:', highlight.name))
              .catch((err) => console.error('Persistence error:', err));
          }
        }
      }

      setResults(resultsArray);
      setLoading(false);
      hasFetched.current = true;

      // Calculate region to fit all markers
      if (resultsArray.length > 0) {
        const lats = resultsArray.map((r) => r.coords[0]);
        const lons = resultsArray.map((r) => r.coords[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
          longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.02),
        });
      }
    };

    resolveCoordinates();
  }, [highlights, cityName, country, cityLat, cityLon]);

  // Filter results by selected categories
  const filteredResults =
    selectedCategories.length === 0
      ? results
      : results.filter((r) => selectedCategories.includes(r.highlight.category));

  const approximateResults = filteredResults.filter((r) => r.confidence === 'low');

  // Notify parent of approximate count
  useEffect(() => {
    if (!loading && onApproximateCount) {
      onApproximateCount(approximateResults.length);
    }
  }, [loading, approximateResults.length, onApproximateCount]);

  // Loading state
  if (loading) {
    return (
      <View
        style={{ height, backgroundColor: '#18181b', borderRadius: 12 }}
        className="items-center justify-center gap-2"
      >
        <Loader size={40} />
        <Text className="text-muted-micro">Localisation des points...</Text>
      </View>
    );
  }

  // No results
  if (filteredResults.length === 0) {
    return (
      <View
        style={{ height, backgroundColor: '#18181b', borderRadius: 12 }}
        className="items-center justify-center"
      >
        <Text className="text-muted-micro">Aucun point a afficher</Text>
      </View>
    );
  }

  // Key based on selected categories to force re-render (fixes react-native-maps crash)
  const mapKey = `map-${selectedCategories.sort().join('-') || 'all'}`;

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <MapView
        key={mapKey}
        ref={mapRef}
        style={{ flex: 1 }}
        region={region}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
      >
        {filteredResults.map((result, idx) => {
          const color = CATEGORY_COLORS[result.highlight.category] || CATEGORY_COLORS.other;
          const isApproximate = result.confidence === 'low';

          return (
            <Marker
              key={result.highlight.id || idx}
              coordinate={{
                latitude: result.coords[0],
                longitude: result.coords[1],
              }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: result.highlight.is_must_see ? 32 : 24,
                    height: result.highlight.is_must_see ? 32 : 24,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: isApproximate ? '#f59e0b' : '#fff',
                    backgroundColor: color,
                    opacity: isApproximate ? 0.7 : 1,
                  }}
                >
                  {result.highlight.is_must_see && (
                    <Text style={{ color: '#fff', fontSize: 10 }}>★</Text>
                  )}
                </View>
              </View>
              <Callout tooltip>
                <View
                  style={{
                    backgroundColor: '#18181b',
                    borderRadius: 8,
                    padding: 12,
                    minWidth: 150,
                    maxWidth: 250,
                    borderWidth: 1,
                    borderColor: color,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: color,
                      }}
                    />
                    <Text style={{ color: '#a1a1aa', fontSize: 10 }}>
                      {CATEGORY_LABELS[result.highlight.category]}
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    {result.highlight.name}
                  </Text>
                  {result.highlight.subtype && (
                    <Text style={{ color: '#a1a1aa', fontSize: 11, marginTop: 2 }}>
                      {result.highlight.subtype}
                    </Text>
                  )}
                  {isApproximate && (
                    <View
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: '#3f3f46',
                      }}
                    >
                      <Text style={{ color: '#f59e0b', fontSize: 11 }}>
                        ⚠️ Position approximative
                      </Text>
                    </View>
                  )}
                  {result.highlight.is_must_see && !isApproximate && (
                    <View
                      style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: '#3f3f46',
                      }}
                    >
                      <Text style={{ color: '#facc15', fontSize: 11 }}>★ Must-see</Text>
                    </View>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend overlay */}
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          backgroundColor: 'rgba(24, 24, 27, 0.9)',
          borderRadius: 8,
          padding: 6,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Text style={{ color: '#71717a', fontSize: 10 }}>
          {filteredResults.length} point{filteredResults.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Approximate warning */}
      {!hideApproximateBadge && approximateResults.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: '#fbbf24', fontSize: 10 }}>
            ⚠️ {approximateResults.length} approximatif
            {approximateResults.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
