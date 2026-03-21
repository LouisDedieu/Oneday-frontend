import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import { Marker, Polyline, Callout } from 'react-native-maps';
import { Destination } from '@/types/api';
import { updateDestinationCoordinates } from '@/services/tripService';
import { geocodeDestination } from '@/services/geocodingService';
import { BaseMap, BaseMapRef } from './BaseMap';
import {
  TripMarker,
  MapRegion,
  calculateRegion,
  CONFIDENCE_COLORS,
} from './types';

interface TripMapProps {
  /** Trip destinations to display */
  destinations: Destination[];
  /** City name to highlight (will animate camera to it) */
  highlightedCity?: string | null;
  /** Callback when a marker is pressed */
  onMarkerPress?: (cityName: string) => void;
  /** Callback with count of approximate locations */
  onApproximateCount?: (count: number) => void;
  /** Hide the approximate location badge */
  hideApproximateBadge?: boolean;
}

export function TripMap({
  destinations,
  highlightedCity,
  onMarkerPress,
  onApproximateCount,
  hideApproximateBadge = false,
}: TripMapProps) {
  const [markers, setMarkers] = useState<TripMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<MapRegion>({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const mapRef = useRef<BaseMapRef>(null);
  const hasFetched = useRef(false);

  // Animate to highlighted city
  useEffect(() => {
    if (!highlightedCity || !mapRef.current) return;
    const match = markers.find(
      (m) => m.city.toLowerCase() === highlightedCity.toLowerCase()
    );
    if (match) {
      mapRef.current.animateToCoordinate(match.coords);
    }
  }, [highlightedCity, markers]);

  // Reset when destinations change
  useEffect(() => {
    setMarkers([]);
    setLoading(true);
    hasFetched.current = false;
  }, [destinations]);

  // Geocode destinations
  useEffect(() => {
    if (hasFetched.current) return;

    const resolveCoordinates = async () => {
      setLoading(true);
      const results: TripMarker[] = [];

      for (const dest of destinations) {
        // Use existing coordinates if available
        if (dest.latitude && dest.longitude) {
          results.push({
            id: dest.id,
            coords: [Number(dest.latitude), Number(dest.longitude)],
            confidence: 'high',
            visitOrder: dest.visit_order,
            city: dest.city || 'Unknown',
            country: dest.country || undefined,
          });
          continue;
        }

        // Geocode the destination
        if (dest.city || dest.country) {
          try {
            const result = await geocodeDestination(
              dest.city ?? null,
              dest.country ?? null
            );

            if (result) {
              results.push({
                id: dest.id,
                coords: result.coords,
                confidence: result.confidence,
                visitOrder: dest.visit_order,
                city: dest.city || 'Unknown',
                country: dest.country || undefined,
              });

              // Persist high confidence coordinates
              if (result.confidence === 'high') {
                updateDestinationCoordinates(
                  dest.id,
                  result.coords[0],
                  result.coords[1]
                ).catch((err) => console.error('Persistence error:', err));
              }
            }
          } catch (err) {
            console.error('Geocoding error:', err);
          }
        }
      }

      setMarkers(results);
      setLoading(false);
      hasFetched.current = true;

      // Calculate region to fit all markers
      if (results.length > 0) {
        setRegion(calculateRegion(results.map((r) => r.coords)));
      }
    };

    resolveCoordinates();
  }, [destinations]);

  // Notify parent of approximate count
  useEffect(() => {
    if (!loading && onApproximateCount) {
      const count = markers.filter((m) => m.confidence === 'low').length;
      onApproximateCount(count);
    }
  }, [loading, markers, onApproximateCount]);

  const preciseMarkers = markers.filter((m) => m.confidence === 'high');

  const renderOverlays = useCallback(() => {
    if (preciseMarkers.length <= 1) return null;

    return (
      <Polyline
        coordinates={preciseMarkers.map((m) => ({
          latitude: m.coords[0],
          longitude: m.coords[1],
        }))}
        strokeColor="#3b82f6"
        strokeWidth={3}
        lineDashPattern={[5, 10]}
      />
    );
  }, [preciseMarkers]);

  const renderMarkers = useCallback(() => {
    return markers.map((marker) => {
      const isHighlighted =
        highlightedCity != null &&
        marker.city.toLowerCase() === highlightedCity.toLowerCase();

      return (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.coords[0],
            longitude: marker.coords[1],
          }}
          anchor={{ x: 0.5, y: 1 }}
          zIndex={isHighlighted ? 10 : 1}
          onPress={() => onMarkerPress?.(marker.city)}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Glow ring when highlighted */}
            {isHighlighted && (
              <View
                style={{
                  position: 'absolute',
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: 'rgba(82, 72, 212, 0.25)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(82, 72, 212, 0.6)',
                  top: -12,
                  left: -12,
                }}
              />
            )}
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#fff',
                backgroundColor: isHighlighted
                  ? '#5248D4'
                  : CONFIDENCE_COLORS[marker.confidence],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                {marker.visitOrder}
              </Text>
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
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                Étape {marker.visitOrder} : {marker.city}
              </Text>
              {marker.country && (
                <Text style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4 }}>
                  {marker.country}
                </Text>
              )}
              {marker.confidence === 'low' && (
                <View
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#3f3f46',
                  }}
                >
                  <Text style={{ color: '#f59e0b', fontSize: 11 }}>
                    Position approximative
                  </Text>
                </View>
              )}
            </View>
          </Callout>
        </Marker>
      );
    });
  }, [markers, highlightedCity, onMarkerPress]);

  return (
    <BaseMap
      ref={mapRef}
      markers={markers}
      region={region}
      loading={loading}
      loadingMessage="Calcul de l'itinéraire..."
      emptyMessage="Impossible de localiser les étapes."
      hideApproximateBadge={hideApproximateBadge}
      renderMarkers={renderMarkers}
      renderOverlays={renderOverlays}
      rotateEnabled={true}
      pitchEnabled={true}
    />
  );
}
