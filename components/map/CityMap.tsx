import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Highlight, HighlightCategory } from '@/types/api';
import { updateHighlightCoordinates } from '@/services/cityReviewService';
import { geocodeHighlight as geocodeHighlightService } from '@/services/geocodingService';
import { BaseMap, BaseMapRef } from './BaseMap';
import {
  CityMarker,
  MapRegion,
  calculateRegion,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from './types';

interface CityMapProps {
  /** City highlights to display */
  highlights: Highlight[];
  /** City name for geocoding context */
  cityName: string;
  /** Country for geocoding context */
  country?: string;
  /** City center latitude (fallback for geocoding) */
  cityLat?: number;
  /** City center longitude (fallback for geocoding) */
  cityLon?: number;
  /** Filter by categories (empty = show all) */
  selectedCategories?: HighlightCategory[];
  /** Highlight ID to focus on */
  highlightedId?: string | null;
  /** Callback when a marker is pressed */
  onMarkerPress?: (highlightId: string) => void;
  /** Callback with count of approximate locations */
  onApproximateCount?: (count: number) => void;
  /** Hide the approximate location badge */
  hideApproximateBadge?: boolean;
}

export function CityMap({
  highlights,
  cityName,
  country,
  cityLat,
  cityLon,
  selectedCategories = [],
  highlightedId,
  onMarkerPress,
  onApproximateCount,
  hideApproximateBadge = false,
}: CityMapProps) {
  const [markers, setMarkers] = useState<CityMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<MapRegion>({
    latitude: cityLat || 48.8566,
    longitude: cityLon || 2.3522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<BaseMapRef>(null);
  const hasFetched = useRef(false);

  // Animate to highlighted marker
  useEffect(() => {
    if (!highlightedId || !mapRef.current) return;
    const match = markers.find((m) => m.id === highlightedId);
    if (match) {
      mapRef.current.animateToCoordinate(match.coords);
    }
  }, [highlightedId, markers]);

  // Reset when highlights change
  useEffect(() => {
    setMarkers([]);
    setLoading(true);
    hasFetched.current = false;
  }, [highlights]);

  // Geocode highlights
  useEffect(() => {
    if (hasFetched.current) return;

    const resolveCoordinates = async () => {
      setLoading(true);
      const results: CityMarker[] = [];
      const cityContext = [cityName, country].filter(Boolean).join(', ');

      for (const highlight of highlights) {
        // Use existing coordinates if available
        if (highlight.latitude && highlight.longitude) {
          results.push({
            id: highlight.id,
            coords: [Number(highlight.latitude), Number(highlight.longitude)],
            confidence: 'high',
            name: highlight.name,
            category: highlight.category,
            isMustSee: highlight.is_must_see,
            subtype: highlight.subtype,
          });
          continue;
        }

        // Geocode the highlight
        try {
          const result = await geocodeHighlightService(
            highlight.name,
            highlight.address,
            cityContext
          );

          if (result) {
            results.push({
              id: highlight.id,
              coords: result.coords,
              confidence: result.confidence,
              name: highlight.name,
              category: highlight.category,
              isMustSee: highlight.is_must_see,
              subtype: highlight.subtype,
            });

            // Persist high confidence coordinates
            if (result.confidence === 'high') {
              updateHighlightCoordinates(
                highlight.id,
                result.coords[0],
                result.coords[1]
              ).catch((err) => console.error('Persistence error:', err));
            }
          } else if (cityLat && cityLon) {
            // Fallback to city center with random offset
            const offset = () => (Math.random() - 0.5) * 0.01;
            results.push({
              id: highlight.id,
              coords: [cityLat + offset(), cityLon + offset()],
              confidence: 'low',
              name: highlight.name,
              category: highlight.category,
              isMustSee: highlight.is_must_see,
              subtype: highlight.subtype,
            });
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        }
      }

      setMarkers(results);
      setLoading(false);
      hasFetched.current = true;

      // Calculate region to fit all markers
      if (results.length > 0) {
        setRegion(calculateRegion(results.map((r) => r.coords), 1.5, 0.02));
      }
    };

    resolveCoordinates();
  }, [highlights, cityName, country, cityLat, cityLon]);

  // Filter markers by selected categories
  const filteredMarkers = useMemo(() => {
    if (selectedCategories.length === 0) return markers;
    return markers.filter((m) => selectedCategories.includes(m.category));
  }, [markers, selectedCategories]);

  // Notify parent of approximate count
  useEffect(() => {
    if (!loading && onApproximateCount) {
      const count = filteredMarkers.filter((m) => m.confidence === 'low').length;
      onApproximateCount(count);
    }
  }, [loading, filteredMarkers, onApproximateCount]);

  const renderMarkers = useCallback(() => {
    return filteredMarkers.map((marker) => {
      const color = CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.other;
      const isApproximate = marker.confidence === 'low';
      const isHighlighted = highlightedId === marker.id;

      return (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.coords[0],
            longitude: marker.coords[1],
          }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={isHighlighted ? 10 : 1}
          onPress={() => onMarkerPress?.(marker.id)}
        >
          <View style={{ alignItems: 'center' }}>
            {/* Glow ring when highlighted */}
            {isHighlighted && (
              <View
                style={{
                  position: 'absolute',
                  width: marker.isMustSee ? 56 : 48,
                  height: marker.isMustSee ? 56 : 48,
                  borderRadius: marker.isMustSee ? 28 : 24,
                  backgroundColor: 'rgba(82, 72, 212, 0.25)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(82, 72, 212, 0.6)',
                  top: marker.isMustSee ? -12 : -12,
                  left: marker.isMustSee ? -12 : -12,
                }}
              />
            )}
            <View
              style={{
                width: marker.isMustSee ? 32 : 24,
                height: marker.isMustSee ? 32 : 24,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: isHighlighted
                  ? '#5248D4'
                  : isApproximate
                  ? '#f59e0b'
                  : '#fff',
                backgroundColor: color,
                opacity: isApproximate && !isHighlighted ? 0.7 : 1,
              }}
            >
              {marker.isMustSee && (
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <Text style={{ color: '#a1a1aa', fontSize: 10 }}>
                  {CATEGORY_LABELS[marker.category]}
                </Text>
              </View>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {marker.name}
              </Text>
              {marker.subtype && (
                <Text style={{ color: '#a1a1aa', fontSize: 11, marginTop: 2 }}>
                  {marker.subtype}
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
                    Position approximative
                  </Text>
                </View>
              )}
              {marker.isMustSee && !isApproximate && (
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
    });
  }, [filteredMarkers, highlightedId, onMarkerPress]);

  const renderLegend = useCallback(() => {
    return (
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
          {filteredMarkers.length} point{filteredMarkers.length > 1 ? 's' : ''}
        </Text>
      </View>
    );
  }, [filteredMarkers.length]);

  // Key based on selected categories to force re-render (fixes react-native-maps crash)
  const mapKey = `map-${selectedCategories.sort().join('-') || 'all'}`;

  return (
    <BaseMap
      key={mapKey}
      ref={mapRef}
      markers={filteredMarkers}
      region={region}
      loading={loading}
      loadingMessage="Localisation des points..."
      emptyMessage="Aucun point à afficher"
      hideApproximateBadge={hideApproximateBadge}
      renderMarkers={renderMarkers}
      renderLegend={renderLegend}
      rotateEnabled={false}
      pitchEnabled={false}
    />
  );
}
