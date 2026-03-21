import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import Loader from '@/components/Loader';
import { MapMarker, MapRegion } from './types';

export interface BaseMapRef {
  animateToCoordinate: (coords: [number, number], duration?: number) => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
}

export interface BaseMapProps {
  /** Markers to display on the map */
  markers: MapMarker[];
  /** Current map region */
  region: MapRegion;
  /** Whether the map is loading */
  loading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Hide the approximate location badge */
  hideApproximateBadge?: boolean;
  /** Render function for markers */
  renderMarkers: () => React.ReactNode;
  /** Optional polyline or other overlays */
  renderOverlays?: () => React.ReactNode;
  /** Optional legend overlay */
  renderLegend?: () => React.ReactNode;
  /** Enable rotation (default: true for trip, false for city) */
  rotateEnabled?: boolean;
  /** Enable pitch (default: true for trip, false for city) */
  pitchEnabled?: boolean;
}

export const BaseMap = forwardRef<BaseMapRef, BaseMapProps>(function BaseMap(
  {
    markers,
    region,
    loading = false,
    loadingMessage = 'Chargement...',
    emptyMessage = 'Aucun point à afficher',
    hideApproximateBadge = false,
    renderMarkers,
    renderOverlays,
    renderLegend,
    rotateEnabled = false,
    pitchEnabled = false,
  },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateToCoordinate: (coords: [number, number], duration = 600) => {
      mapRef.current?.animateCamera(
        { center: { latitude: coords[0], longitude: coords[1] } },
        { duration }
      );
    },
    animateToRegion: (newRegion: MapRegion, duration = 600) => {
      mapRef.current?.animateToRegion(newRegion as Region, duration);
    },
  }));

  const approximateCount = markers.filter((m) => m.confidence === 'low').length;

  if (loading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12 }}
        className="items-center justify-center gap-2"
      >
        <Loader size={40} />
        <Text className="text-muted-micro">{loadingMessage}</Text>
      </View>
    );
  }

  if (markers.length === 0) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12 }}
        className="items-center justify-center"
      >
        <Text className="text-muted-micro">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', position: 'relative' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1, width: '100%', height: '100%' }}
        region={region}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        showsUserLocation={false}
      >
        {renderOverlays?.()}
        {renderMarkers()}
      </MapView>

      {/* Legend overlay */}
      {renderLegend?.()}

      {/* Approximate warning badge */}
      {!hideApproximateBadge && approximateCount > 0 && (
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
            {approximateCount} approximatif{approximateCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
});
