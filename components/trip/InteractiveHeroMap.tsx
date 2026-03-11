import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import MapView, { Marker, Polyline, Callout, Region } from 'react-native-maps';
import { Destination } from '@/types/api';
import { normalizeTextForLocationIQAPI, updateDestinationCoordinates } from '@/services/tripService';
import Loader from "@/components/Loader";

type GeocodingResult = {
  coords: [number, number];
  confidence: 'high' | 'low';
  source: string;
  destination: Destination;
};

const MARKER_COLORS: Record<string, string> = {
  high: '#3b82f6',
  low: '#f59e0b',
};

function SpinningLoader({ size = 24, color = '#3b82f6' }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View>
      <Loader size={size} color={color} />
    </Animated.View>
  );
}

interface InteractiveHeroMapProps {
  destinations: Destination[];
  highlightedCity?: string | null;
}

export function InteractiveHeroMap({ destinations, highlightedCity }: InteractiveHeroMapProps) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const mapRef = useRef<MapView>(null);
  const hasFetched = useRef(false);

  // Center map on highlighted city
  useEffect(() => {
    if (!highlightedCity || !mapRef.current) return;
    const match = results.find(
      r => r.destination.city?.toLowerCase() === highlightedCity.toLowerCase()
    );
    if (!match) return;
    mapRef.current.animateCamera({
      center: { latitude: match.coords[0], longitude: match.coords[1] },
    }, { duration: 600 });
  }, [highlightedCity, results]);

  async function geocodeLocation(
    query: string,
    country: string | null,
    destination: Destination
  ): Promise<GeocodingResult | null> {
    const attempts = [
      { q: query, label: 'original' },
      { q: normalizeTextForLocationIQAPI(query), label: 'normalisé' },
    ];

    for (const attempt of attempts) {
      try {
        await new Promise(r => setTimeout(r, 1100));

        const response = await fetch(
          `https://us1.locationiq.com/v1/search?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_KEY}&q=${encodeURIComponent(attempt.q)}&format=json`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.status === 429) {
          return null;
        }

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            return {
              coords: [lat, lon],
              confidence: 'high',
              source: 'LocationIQ API',
              destination
            };
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    if (country) {
      try {
        await new Promise(r => setTimeout(r, 1100));

        const response = await fetch(
          `https://us1.locationiq.com/v1/search?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_KEY}&q=${encodeURIComponent(country)}&format=json`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            return {
              coords: [lat, lon],
              confidence: 'low',
              source: `Centre du pays (${country})`,
              destination
            };
          }
        }
      } catch (err) {
        console.error('Fallback geocoding error:', err);
      }
    }

    return null;
  }

  useEffect(() => {
    setResults([]);
    setLoading(true);
    hasFetched.current = false;
  }, [destinations]);

  useEffect(() => {
    if (hasFetched.current) return;

    const resolveCoordinates = async () => {
      setLoading(true);
      const resultsArray: GeocodingResult[] = [];

      for (const dest of destinations) {
        if (dest.latitude && dest.longitude) {
          resultsArray.push({
            coords: [Number(dest.latitude), Number(dest.longitude)],
            confidence: 'high',
            source: 'Base de données',
            destination: dest
          });
          continue;
        }

        if (dest.city || dest.country) {
          const query = [dest.city, dest.country].filter(Boolean).join(', ');
          const result = await geocodeLocation(query, dest.country ?? null, dest);

          if (result) {
            resultsArray.push(result);

            if (result.confidence === 'high') {
              updateDestinationCoordinates(dest.id, result.coords[0], result.coords[1])
                .then(() => console.log('Persisted coordinates:', dest.city))
                .catch((err) => console.error('Persistence error:', err));
            }
          }
        }
      }

      setResults(resultsArray);
      setLoading(false);
      hasFetched.current = true;

      if (resultsArray.length > 0) {
        const lats = resultsArray.map(r => r.coords[0]);
        const lons = resultsArray.map(r => r.coords[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: (maxLat - minLat) * 1.5 || 0.5,
          longitudeDelta: (maxLon - minLon) * 1.5 || 0.5,
        });
      }
    };

    resolveCoordinates();
  }, [destinations]);

  const positions = results.map(r => r.coords);
  const preciseResults = results.filter(r => r.confidence === 'high');
  const approximateResults = results.filter(r => r.confidence === 'low');
  const precisePositions = preciseResults.map(r => r.coords);

  if (loading) {
    return (
      <View className="flex-1 flex-col items-center justify-center bg-zinc-950 gap-2">
        <SpinningLoader size={24} color="#3b82f6" />
        <Text className="text-muted-micro">Calcul de l'itinéraire...</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="text-muted-micro">Impossible de localiser les étapes.</Text>
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
        rotateEnabled={true}
        pitchEnabled={true}
        showsUserLocation={false}
      >
        {precisePositions.length > 1 && (
          <Polyline
            coordinates={precisePositions.map(p => ({ latitude: p[0], longitude: p[1] }))}
            strokeColor="#3b82f6"
            strokeWidth={3}
            lineDashPattern={[5, 10]}
          />
        )}

        {results.map((result, idx) => {
          const isHighlighted = highlightedCity != null &&
            result.destination.city?.toLowerCase() === highlightedCity.toLowerCase();

          return (
            <Marker
              key={`marker-${idx}`}
              coordinate={{ latitude: result.coords[0], longitude: result.coords[1] }}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isHighlighted ? 10 : 1}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {/* Glow ring — visible only when highlighted */}
                {isHighlighted && (
                  <View style={{
                    position: 'absolute',
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: 'rgba(82, 72, 212, 0.25)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(82, 72, 212, 0.6)',
                    top: -12,
                    left: -12,
                  }} />
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
                    backgroundColor: isHighlighted ? '#5248D4' : MARKER_COLORS[result.confidence],
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {result.destination.visit_order}
                  </Text>
                </View>
              </View>
              <Callout tooltip>
                <View style={{ backgroundColor: '#18181b', borderRadius: 8, padding: 12, minWidth: 150, maxWidth: 250 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    Étape {result.destination.visit_order} : {result.destination.city}
                  </Text>
                  {result.destination.country && (
                    <Text style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4 }}>
                      {result.destination.country}
                    </Text>
                  )}
                  {result.confidence === 'low' && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#3f3f46' }}>
                      <Text style={{ color: '#f59e0b', fontSize: 11 }}>⚠️ Position approximative</Text>
                    </View>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, backgroundColor: 'transparent', pointerEvents: 'none' }} />

      {approximateResults.length > 0 && (
        <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#fbbf24', fontSize: 10 }}>
            ⚠️ {approximateResults.length} point{approximateResults.length > 1 ? 's' : ''} approximatif{approximateResults.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];