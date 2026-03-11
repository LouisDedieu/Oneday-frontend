/**
 * [tripId].tsx - React Native version
 * Complete refactor with NativeWind, preserving all React source features
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Animated, Dimensions, Image, ImageBackground, Text, TouchableOpacity, View,} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Loader from '@/components/Loader';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import DraggableFlatList, {RenderItemParams, ScaleDecorator,} from 'react-native-draggable-flatlist';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router';
import {InteractiveHeroMap} from '@/components/trip/InteractiveHeroMap';
import {getTrip} from '@/services/tripService';
import {getUserSavedCities} from '@/services/cityService';
import {useAuth} from '@/context/AuthContext';
import {Destination} from '@/types/api';
import {AddCityToTripModal} from '@/components/trip/AddCityToTripModal';
import type {DbDay as ReviewDbDay} from '@/services/reviewService';
import {deleteDestination, reorderDestinations} from '@/services/reviewService';
import {Navbar} from '@/components/navigation/Navbar';
import {Pill} from '@/components/Pill';
import {SecondaryButton} from '@/components/SecondaryButton';
import {type CategoryType, type DayData, TripStepCard} from '@/components/TripStepCard';
import {PrimaryButton} from '@/components/PrimaryButton';
import {TripBudgetCard} from '@/components/trip/TripBudgetCard';
import {PracticalCard} from '@/components/PracticalCard';
import {TransportCard} from '@/components/TransportCard';
import Icon from "react-native-remix-icon";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DbSpot {
  id: string;
  name: string;
  spot_type: string | null;
  address: string | null;
  duration_minutes: number | null;
  price_range: string | null;
  price_detail: string | null;
  tips: string | null;
  highlight: boolean;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  spot_order: number;
  verified: boolean;
  // Lien vers la ville source (pour navigation et sync)
  source_city_id: string | null;
  city_highlight_id: string | null;
  _synced_from_highlight?: boolean;
}

interface DbDay {
  id: string;
  day_number: number;
  location: string | null;
  theme: string | null;
  accommodation_name: string | null;
  accommodation_type: string | null;
  accommodation_price_per_night: string | null;
  accommodation_tips: string | null;
  breakfast_spot: string | null;
  lunch_spot: string | null;
  dinner_spot: string | null;
  spots: DbSpot[];
  // Lien vers la ville source pour sync automatique
  linked_city_id: string | null;
}

interface DbLogistics {
  id: string;
  from_location: string | null;
  to_location: string | null;
  transport_mode: string | null;
  duration: string | null;
  cost: string | null;
  tips: string | null;
  travel_order: number;
}

interface DbBudget {
  id: string;
  total_estimated: string | null;
  currency: string | null;
  per_day_min: string | null;
  per_day_max: string | null;
  accommodation_cost: string | null;
  food_cost: string | null;
  transport_cost: string | null;
  activities_cost: string | null;
  money_saving_tips: string[] | null;
}

interface DbPracticalInfo {
  id: string;
  visa_required: boolean | null;
  local_currency: string | null;
  language: string | null;
  best_apps: string[] | null;
  what_to_pack: string[] | null;
  safety_tips: string[] | null;
  things_to_avoid: string[] | null;
}

interface FullTrip {
  id: string;
  trip_title: string;
  vibe: string | null;
  duration_days: number;
  best_season: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  content_creator_handle: string | null;
  content_creator_links: string[] | null;
  is_public: boolean;
  views_count: number;
  saves_count: number;
  created_at: string;
  destinations: Destination[];
  itinerary_days: DbDay[];
  logistics: DbLogistics[];
  budgets: DbBudget[];
  practical_info: DbPracticalInfo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SEASON_EMOJI: Record<string, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', fall: '🍂', winter: '❄️',
  'all year': '🌍', printemps: '🌸', été: '☀️', automne: '🍂', hiver: '❄️',
};

type Tab = 'itinerary' | 'budget' | 'practical' | 'logistics';

// Helper function to map spot_type to CategoryType
function mapSpotTypeToCategory(spotType: string | null): CategoryType {
  if (!spotType) return 'other';
  const type = spotType.toLowerCase();
  if (['restaurant', 'cafe', 'bar', 'food', 'bakery', 'coffee'].some(t => type.includes(t))) return 'food';
  if (['museum', 'attraction', 'monument', 'temple', 'church', 'historic', 'cultural'].some(t => type.includes(t))) return 'culture';
  if (['nightlife', 'club', 'disco', 'party'].some(t => type.includes(t))) return 'nightlife';
  if (['shopping', 'market', 'mall', 'store', 'shop'].some(t => type.includes(t))) return 'shopping';
  if (['park', 'garden', 'nature', 'hike', 'mountain', 'forest', 'trail'].some(t => type.includes(t))) return 'nature';
  if (['beach', 'sea', 'ocean', 'coast', 'island'].some(t => type.includes(t))) return 'beach';
  return 'other';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

// Type for saved city mapping
interface SavedCityMap {
  [cityName: string]: string; // cityName -> cityId
}

export default function TripDetailPage() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [trip, setTrip] = useState<FullTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [savedCitiesMap, setSavedCitiesMap] = useState<SavedCityMap>({});
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [pendingDestinations, setPendingDestinations] = useState<Destination[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [highlightedCity, setHighlightedCity] = useState<string | null>(null);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const MAP_DEFAULT_HEIGHT = 300;
  const MAP_EXPANDED_HEIGHT = SCREEN_HEIGHT - 120; // leave room for status bar + close button

  const mapExpandAnim = useRef(new Animated.Value(MAP_DEFAULT_HEIGHT)).current;
  const mapGradientOpacity = useRef(new Animated.Value(1)).current;

  const toggleMapExpanded = useCallback(() => {
    const expanding = !isMapExpanded;
    setIsMapExpanded(expanding);
    Animated.parallel([
      Animated.spring(mapExpandAnim, {
        toValue: expanding ? MAP_EXPANDED_HEIGHT : MAP_DEFAULT_HEIGHT,
        damping: 20,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.timing(mapGradientOpacity, {
        toValue: expanding ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isMapExpanded, MAP_EXPANDED_HEIGHT]);

  // Animated.event connecte directement le scroll à scrollY (pas de JS intermédiaire).
  // Une seule valeur suffit — useNativeDriver: false car 'height' n'est pas supporté native.
  const scrollY = useRef(new Animated.Value(0)).current;
  const outerScrollRef = useRef<Animated.ScrollView>(null);
  const [headerHeight, setHeaderHeight] = useState(620);
  const headerMeasured = useRef(false);

  const COLLAPSIBLE_HEIGHT = 90;
  const COLLAPSE_RANGE = 90;

  const vibeAndStatsOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const vibeAndStatsTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

  const vibeAndStatsHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [COLLAPSIBLE_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  // Le top du ScrollView suit la réduction du header (collapse de COLLAPSIBLE_HEIGHT px)
  const scrollContainerTop = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [headerHeight, headerHeight - COLLAPSIBLE_HEIGHT],
    extrapolate: 'clamp',
  });

  const loadTrip = useCallback((showLoading = false) => {
    if (!tripId) return;
    if (showLoading) setLoading(true);
    getTrip(tripId)
      .then((data) => setTrip(data as FullTrip))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tripId]);

  // Charger le trip initialement
  useEffect(() => {
    loadTrip(true);
  }, [tripId]);

  // Recharger quand la page reprend le focus (retour de cityDetails, etc.)
  useFocusEffect(
    useCallback(() => {
      // Ne pas recharger si c'est le premier mount (loading est true)
      if (!loading && tripId) {
        loadTrip(false);
      }
    }, [tripId, loading, loadTrip])
  );

  // Load saved cities to create a mapping
  useEffect(() => {
    if (!user?.id) return;
    getUserSavedCities(user.id, 1, 100)
      .then((res) => {
        const map: SavedCityMap = {};
        res.items.forEach((item) => {
          if (item.cities?.city_name) {
            map[item.cities.city_name.toLowerCase()] = item.cities.id;
          }
        });
        setSavedCitiesMap(map);
      })
      .catch(console.error);
  }, [user?.id]);

  // Helper to find saved city ID by destination city name
  const getSavedCityId = (cityName: string | null | undefined): string | null => {
    if (!cityName) return null;
    return savedCitiesMap[cityName.toLowerCase()] || null;
  };

  // Derived data
  const derived = useMemo(() => {
    if (!trip) return null;
    const destinations = [...(trip.destinations ?? [])].sort((a, b) => a.visit_order - b.visit_order);
    const days = [...(trip.itinerary_days ?? [])].sort((a, b) => a.day_number - b.day_number);
    const logistics = [...(trip.logistics ?? [])].sort((a, b) => (a.travel_order ?? 0) - (b.travel_order ?? 0));
    const budget = trip.budgets?.[0] ?? null;
    const practical = trip.practical_info?.[0] ?? null;
    const totalSpots = days.reduce((n, d) => n + (d.spots?.length ?? 0), 0);
    const highlights = days.flatMap(d => d.spots?.filter(s => s.highlight) ?? []);
    const destLabel = destinations.map(d => [d.city, d.country].filter(Boolean).join(', ')).join(' → ') || '—';
    const seasonEmoji = trip.best_season ? (SEASON_EMOJI[trip.best_season.toLowerCase()] ?? '🌍') : null;
    return { destinations, days, logistics, budget, practical, totalSpots, highlights, destLabel, seasonEmoji };
  }, [trip]);

  const enterEditMode = useCallback(() => {
    if (!derived?.destinations) return;
    setPendingDestinations([...derived.destinations]);
    setIsEditingOrder(true);
  }, [derived?.destinations]);

  const cancelEditMode = useCallback(() => {
    setIsEditingOrder(false);
    setPendingDestinations([]);
  }, []);

  const confirmOrder = useCallback(async () => {
    if (!tripId) return;
    if (pendingDestinations.length === 0) {
      Alert.alert('Attention', "L'itinéraire doit contenir au moins une ville.");
      return;
    }
    setIsSavingOrder(true);
    try {
      const originalIds = new Set(derived?.destinations.map(d => d.id) ?? []);
      const pendingIds = new Set(pendingDestinations.map(d => d.id));
      const deletedIds = [...originalIds].filter(id => !pendingIds.has(id));

      if (deletedIds.length > 0) {
        await Promise.all(deletedIds.map(id => deleteDestination(tripId, id)));
      }

      await reorderDestinations(tripId, {
        destinations: pendingDestinations.map((d, idx) => ({ id: d.id, order: idx + 1 })),
      });

      loadTrip(false);
      setIsEditingOrder(false);
      setPendingDestinations([]);
    } catch (err) {
      console.error('[confirmOrder] Error:', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible de sauvegarder: ${message}`);
    } finally {
      setIsSavingOrder(false);
    }
  }, [tripId, pendingDestinations, derived?.destinations, loadTrip]);

  if (loading) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="center-content" style={{ paddingTop: insets.top }}>
          <Loader size={48} />
        </View>
      </ImageBackground>
    );
  }

  if (!trip || !derived) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="center-content px-4" style={{ paddingTop: insets.top }}>
          <Text className="text-zinc-400 text-sm mb-4 font-dmsans">Voyage introuvable.</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/trips')}
            className="bg-zinc-800 px-6 py-3 rounded-lg"
          >
            <Text className="text-label">Mes voyages</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  const { destinations, days, logistics, budget, practical, totalSpots } = derived;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        {/* ════════════════════════════════════════════
          FLOATING BACK BUTTON
      ════════════════════════════════════════════ */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            zIndex: 50,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingRight: 2
          }}
        >
          <Icon name={"arrow-left-s-line"} size={24} color="#fff" />
        </TouchableOpacity>

        {/* ════════════════════════════════════════════
          CONTENT
      ════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════
          LAYOUT: Header (static animated) + Tab content (scrollable)
      ════════════════════════════════════════════ */}
        <View style={{ flex: 1 }}>

          {/* ── HEADER BLOCK — position absolute pour que le ScrollView ne resize pas ── */}
          <Animated.View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
            pointerEvents="box-none"
            onLayout={(e) => {
              if (!headerMeasured.current) {
                setHeaderHeight(e.nativeEvent.layout.height);
                headerMeasured.current = true;
              }
            }}
          >

            {/* HERO MAP — animated height expand/collapse */}
            <Animated.View style={{ width: '100%', height: mapExpandAnim }}>
              {/* Gradient mask fades out when expanded */}
              <Animated.View style={{ flex: 1, opacity: mapGradientOpacity }}>
                <MaskedView
                  style={{ width: '100%', height: '100%' }}
                  maskElement={
                    <LinearGradient
                      colors={['#000', '#000', '#000', 'transparent']}
                      locations={[0, 0.6, 0.75, 1]}
                      style={{ flex: 1 }}
                    />
                  }
                >
                  {destinations.length > 0 ? (
                    <InteractiveHeroMap
                      destinations={destinations}
                      highlightedCity={highlightedCity}
                    />
                  ) : (
                    <View className="w-full h-full relative">
                      <Image
                        source={{ uri: trip.thumbnail_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800' }}
                        className="w-full h-full opacity-60"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-black/40" />
                    </View>
                  )}
                </MaskedView>
              </Animated.View>

              {/* Map shown without gradient when expanded */}
              {isMapExpanded && (
                <View style={{ position: 'absolute', inset: 0 }}>
                  <InteractiveHeroMap
                    destinations={destinations}
                    highlightedCity={highlightedCity}
                  />
                </View>
              )}

              {/* Expand/collapse button */}
              {destinations.length > 0 && (
                <TouchableOpacity
                  onPress={toggleMapExpanded}
                  style={{
                    position: 'absolute',
                    bottom: isMapExpanded ? insets.top + 16 : 28,
                    right: 14,
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isMapExpanded
                    ? <Icon name={"fullscreen-exit-line"} size={15} color="#fff" />
                    : <Icon name={"fullscreen-line"} size={15} color="#fff" />
                  }
                </TouchableOpacity>
              )}

              {/* Highlighted city pill — visible when expanded */}
              {isMapExpanded && highlightedCity && (
                <View style={{
                  position: 'absolute',
                  bottom: 24,
                  alignSelf: 'center',
                  left: 0, right: 0,
                  alignItems: 'center',
                }}>
                  <View style={{
                    backgroundColor: 'rgba(53, 41, 193, 0.85)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}>
                    <Text style={{ fontFamily: 'Righteous', fontSize: 14, color: '#fff' }}>
                      📍 {highlightedCity}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* TITLE */}
            <View className="px-8 mt-2">
              <Text
                style={{ fontFamily: 'Righteous', fontSize: 24, color: '#FAFAFF' }}
                numberOfLines={2}
              >
                {trip.trip_title}
              </Text>
            </View>

            {/* VIBE + STATS — height sur JS thread, opacity+transform sur native thread */}
            <Animated.View style={{ height: vibeAndStatsHeight, overflow: 'hidden' }}>
              <Animated.View style={{
                opacity: vibeAndStatsOpacity,
                transform: [{ translateY: vibeAndStatsTranslateY }],
              }}>
                {trip.vibe && (
                  <View className="px-8 mt-4 flex-row">
                    <Pill
                      label={`${trip.vibe}`}
                      backgroundColor="#656E57"
                      textColor="rgba(250, 250, 255, 0.9)"
                    />
                  </View>
                )}
                <View className="px-8 mt-3">
                  <View style={{
                    flexDirection: 'row',
                    backgroundColor: 'rgba(30, 26, 100, 0.55)',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#656E57',
                  }}>
                    <StatCell value={`${trip.duration_days}j`} label="Durée" />
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 }} />
                    <StatCell value={String(destinations.length)} label={destinations.length > 1 ? 'Villes' : 'Ville'} />
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 }} />
                    <StatCell value={String(totalSpots)} label="Lieux" />
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* NAVBAR */}
            <View className="px-4 mt-8">
              <Navbar
                variant="secondary"
                size="sm"
                tabs={[
                  { icon: 'route-line', label: 'Itinéraire' },
                  { icon: 'money-dollar-circle-line', label: 'Budget' },
                  { icon: 'compass-line', label: 'Pratique' },
                  { icon: 'bus-line', label: 'Transport' },
                ]}
                activeIndex={activeTab === 'itinerary' ? 0 : activeTab === 'budget' ? 1 : activeTab === 'practical' ? 2 : 3}
                onTabChange={(index) => {
                  const tabs: Tab[] = ['itinerary', 'budget', 'practical', 'logistics'];
                  setActiveTab(tabs[index]);
                }}
              />
            </View>

          </Animated.View>{/* end absolute header */}

          {/* ── TAB CONTENT — démarre sous le header, overflow hidden pour clipper le contenu ── */}
          <Animated.View style={{ position: 'absolute', top: scrollContainerTop, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            <Animated.ScrollView
              ref={outerScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
            >

              {/* ─────────────────── ITINERARY ─────────────────── */}
              {activeTab === 'itinerary' && (
                <View className="pb-6 px-4 pt-4" style={{minHeight: SCREEN_HEIGHT - headerHeight + COLLAPSE_RANGE}}>
                  {/* Section header: ETAPES DU VOYAGE + Reorder button */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text style={{
                      fontFamily: 'DM Sans',
                      fontWeight: '600',
                      fontSize: 12,
                      color: 'rgba(255, 255, 255, 0.5)',
                      letterSpacing: 1,
                    }}>
                      ÉTAPES DU VOYAGE
                    </Text>
                    {!isEditingOrder ? (
                      <SecondaryButton
                        title="Réordonner"
                        variant="square"
                        size="sm"
                        leftIcon="draggable"
                        onPress={enterEditMode}
                      />
                    ) : (
                      <View className="row-center">
                        <SecondaryButton title="Annuler" variant="square" size="sm" onPress={cancelEditMode} />
                        <SecondaryButton
                          title="OK"
                          leftIcon="check-line"
                          variant="square"
                          size="sm"
                          active={true}
                          onPress={confirmOrder}
                          disabled={isSavingOrder}
                        />
                      </View>
                    )}
                  </View>

                  {/* Mode normal - TripStepCards */}
                  {!isEditingOrder && (
                    <View style={{ gap: 12 }}>
                      {destinations.map((dest, i) => {
                        const destinationDays = days.filter(
                          (day) => day.location?.toLowerCase().includes(dest.city?.toLowerCase() || '')
                        );
                        const spotsCount = destinationDays.reduce((acc, day) => acc + (day.spots?.length || 0), 0);
                        const dayDataArray: DayData[] = destinationDays.map((day) => {
                          const categoryMap: Record<string, number> = {};
                          day.spots?.forEach((spot) => {
                            const category = mapSpotTypeToCategory(spot.spot_type);
                            categoryMap[category] = (categoryMap[category] || 0) + 1;
                          });
                          const categories = Object.entries(categoryMap).map(([cat, count]) => ({
                            category: cat as CategoryType,
                            count,
                          }));
                          return {
                            dayNumber: day.day_number,
                            spotName: day.theme || day.location || `Jour ${day.day_number}`,
                            duration: `${day.spots?.length || 0} spots`,
                            categories,
                          };
                        });
                        const savedCityId = getSavedCityId(dest.city);
                        return (
                          <TripStepCard
                            key={dest.id}
                            stepNumber={i + 1}
                            cityName={dest.city || 'Destination'}
                            daysCount={dest.days_spent || destinationDays.length || 1}
                            spotsCount={spotsCount}
                            days={dayDataArray}
                            onExpand={(city) => setHighlightedCity(city)}
                            onViewDetails={
                              savedCityId ? () => router.push(`/(tabs)/trips/city/${savedCityId}`) : undefined
                            }
                          />
                        );
                      })}
                    </View>
                  )}

                  {/* Mode édition - DraggableFlatList (scrollDisabled, scroll handled by outer ScrollView) */}
                  {isEditingOrder && (
                    <DraggableFlatList
                      data={pendingDestinations}
                      keyExtractor={(item) => item.id}
                      onDragEnd={({ data }) => setPendingDestinations(data)}
                      scrollEnabled={false}
                      renderItem={({ item: dest, drag, isActive, getIndex }: RenderItemParams<Destination>) => {
                        const i = getIndex() ?? 0;
                        return (
                          <ScaleDecorator activeScale={0.95}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onLongPress={drag}
                              delayLongPress={100}
                              disabled={isActive}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isActive ? 'rgba(30, 26, 100, 0.8)' : 'rgba(30, 26, 100, 0.55)',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isActive ? 'rgba(82, 72, 212, 0.5)' : 'rgba(255, 255, 255, 0.09)',
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                marginBottom: 8,
                              }}
                            >
                              <View style={{
                                width: 24, height: 24, borderRadius: 12,
                                backgroundColor: '#3529C1',
                                alignItems: 'center', justifyContent: 'center', marginRight: 10,
                              }}>
                                <Text style={{ fontFamily: 'Righteous', fontSize: 11, color: '#fff' }}>{i + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: 'Righteous', fontSize: 14, color: '#fff' }}>
                                  {dest.city || 'Destination'}
                                </Text>
                                {dest.days_spent && (
                                  <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                                    {dest.days_spent} jour{dest.days_spent > 1 ? 's' : ''}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    'Supprimer cette ville ?',
                                    `${dest.city} sera supprimée de l'itinéraire.`,
                                    [
                                      { text: 'Annuler', style: 'cancel' },
                                      {
                                        text: 'Supprimer',
                                        style: 'destructive',
                                        onPress: () => setPendingDestinations(prev => prev.filter(d => d.id !== dest.id)),
                                      },
                                    ]
                                  );
                                }}
                                style={{ padding: 8 }}
                              >
                                <Icon name={"delete-bin-2-line"} size={16} color="#f87171" />
                              </TouchableOpacity>
                              <View style={{ padding: 8 }}>
                                <Icon name={"draggable"} size={18} color={isActive ? '#5248D4' : 'rgba(255,255,255,0.45)'} />
                              </View>
                            </TouchableOpacity>
                          </ScaleDecorator>
                        );
                      }}
                    />
                  )}

                  {/* Add city button */}
                  <View style={{ marginTop: 16 }}>
                    <PrimaryButton
                      title="Ajouter une ville"
                      leftIcon="add-line"
                      color="purple"
                      size="sm"
                      fullWidth
                      onPress={() => setShowAddCityModal(true)}
                      style={{ opacity: 0.8 }}
                    />
                  </View>
                </View>
              )}

              {/* ─────────────────── BUDGET ─────────────────── */}
              {activeTab === 'budget' && (
                <View className="pb-6 px-4 pt-4" style={{minHeight: SCREEN_HEIGHT - headerHeight + COLLAPSE_RANGE}}>
                  {!budget ? (
                    <EmptyState message="Aucune information budget disponible." />
                  ) : (
                    <TripBudgetCard
                      totalEstimated={budget.total_estimated}
                      currency={budget.currency}
                      perDayMin={budget.per_day_min}
                      perDayMax={budget.per_day_max}
                      accommodationCost={budget.accommodation_cost}
                      foodCost={budget.food_cost}
                      transportCost={budget.transport_cost}
                      activitiesCost={budget.activities_cost}
                      moneySavingTips={budget.money_saving_tips}
                    />
                  )}
                </View>
              )}

              {/* ─────────────────── PRACTICAL ─────────────────── */}
              {activeTab === 'practical' && (
                <View className="pb-6 px-4 pt-4" style={{minHeight: SCREEN_HEIGHT - headerHeight + COLLAPSE_RANGE}}>
                  {!practical ? (
                    <EmptyState message="Aucune info pratique disponible." />
                  ) : (
                    <PracticalCard info={practical} />
                  )}
                </View>
              )}

              {/* ─────────────────── LOGISTICS ─────────────────── */}
              {activeTab === 'logistics' && (
                <View className="pb-6 px-4 pt-4" style={{minHeight: SCREEN_HEIGHT - headerHeight + COLLAPSE_RANGE}}>
                  <TransportCard legs={logistics} />
                </View>
              )}
            </Animated.ScrollView>
          </Animated.View>
        </View>

        {/* Add City Modal */}
        {tripId && (
          <AddCityToTripModal
            visible={showAddCityModal}
            onClose={() => setShowAddCityModal(false)}
            tripId={tripId}
            tripDays={days as unknown as ReviewDbDay[]}
            existingDestinations={days.map((d) => d.location).filter((loc): loc is string => !!loc)}
            onCityAdded={loadTrip}
          />
        )}
      </ImageBackground>
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({value, label }: {
  value: string; label: string;
}) {
  return (
    <View className="flex-1 items-center gap-0.5 py-2">
      <Text className="text-base font-bold text-white/80 font-righteous">{value}</Text>
      <Text className="text-[10px] text-white/60 font-dmsans">{label}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="empty-state">
      <Icon name={"information-2-fill"} size={32} color="#52525b" style={{ opacity: 0.4 }} />
      <Text className="text-sm text-zinc-500 mt-2 font-dmsans">{message}</Text>
    </View>
  );
}