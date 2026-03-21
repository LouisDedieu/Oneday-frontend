/**
 * app/(tabs)/trips/city/[cityId].tsx
 *
 * City detail page with new interface: Hero map, tabs, category filters, TicketCards
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {getCity} from '@/services/cityService';
import {
  createHighlight,
  type CreateHighlightPayload,
  deleteHighlight,
  type HighlightUpdatePayload,
  updateHighlight,
  updateHighlightCoordinates,
} from '@/services/cityReviewService';
import {geocodeAddress} from '@/services/geocodingService';
import {CityData, Highlight, HIGHLIGHT_CATEGORIES, HighlightCategory} from '@/types/api';
import {CityBudgetCard} from '@/components/city/CityBudgetCard';
import {CityHighlightsMap} from '@/components/city/CityHighlightsMap';
import {Navbar} from '@/components/navigation/Navbar';
import {Pill} from '@/components/Pill';
import {PracticalCard} from '@/components/PracticalCard';
import {HighlightFormModal} from '@/components/city/HighlightFormModal';
import {type ColorScheme, SecondaryButton} from '@/components/SecondaryButton';
import {type CategoryType, TicketCard} from '@/components/TicketCard';
import {PrimaryButton} from '@/components/PrimaryButton';
import Loader from '@/components/Loader';
import Icon from 'react-native-remix-icon';

type TabKey = 'highlights' | 'budget' | 'practical';

// -- Category to ColorScheme mapping -----------------------------------------

const CATEGORY_TO_COLOR_SCHEME: Record<HighlightCategory, ColorScheme> = {
  food: 'restaurant',
  culture: 'culture',
  nature: 'nature',
  shopping: 'shopping',
  nightlife: 'nightlife',
  other: 'location',
};

const CATEGORY_ICONS: Record<HighlightCategory, string> = {
  food: 'restaurant-line',
  culture: 'bank-line',
  nature: 'hand-heart-line',
  shopping: 'shopping-bag-line',
  nightlife: 'moon-line',
  other: 'map-pin-line',
};

// -- Main Component -----------------------------------------------------------

export default function CityDetailPage() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('highlights');
  const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);
  const [selectedMustSee, setSelectedMustSee] = useState<boolean | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [approximateCount, setApproximateCount] = useState(0);

  // Add highlight state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingHighlight, setAddingHighlight] = useState(false);
  const [newHighlight, setNewHighlight] = useState<CreateHighlightPayload>({
    name: '',
    category: 'other',
    address: '',
  });
  const [addAddrStatus, setAddAddrStatus] = useState<null | 'loading' | 'found' | 'not_found'>(null);
  const [addAddrCoords, setAddAddrCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Edit highlight state
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<HighlightUpdatePayload>({});
  const [editAddrStatus, setEditAddrStatus] = useState<null | 'loading' | 'found' | 'not_found'>(null);
  const [editAddrCoords, setEditAddrCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Map animation
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const MAP_DEFAULT_HEIGHT = 300;
  const MAP_EXPANDED_HEIGHT = SCREEN_HEIGHT - 120;

  const mapExpandAnim = useRef(new Animated.Value(MAP_DEFAULT_HEIGHT)).current;
  const mapGradientOpacity = useRef(new Animated.Value(1)).current;

  // Scroll-driven animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYJS = useRef(new Animated.Value(0)).current;
  const outerScrollRef = useRef<Animated.ScrollView>(null);
  const scrollContentHeight = useRef(0);
  const scrollViewHeight = useRef(0);

  const COLLAPSE_RANGE = 120;

  const vibeAndStatsOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const vibeAndStatsTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const vibeAndStatsMaxHeight = scrollYJS.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [80, 0],
    extrapolate: 'clamp',
  });

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

  // Load city data
  const loadCity = useCallback(async (showLoading = false) => {
    if (!cityId) return;
    if (showLoading) setLoading(true);
    try {
      const data = await getCity(cityId);
      setCity(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  // Initial load
  useEffect(() => {
    loadCity(true);
  }, [cityId]);

  // Reload when page regains focus
  useFocusEffect(
    useCallback(() => {
      if (!loading && cityId) {
        loadCity(false);
      }
    }, [cityId, loading, loadCity])
  );

  // Add new highlight
  const handleAddHighlight = useCallback(async () => {
    if (!cityId || !newHighlight.name.trim()) return;

    setAddingHighlight(true);
    try {
      let coords = addAddrCoords;
      const addr = newHighlight.address?.trim();
      if (addr && !coords && addAddrStatus !== 'not_found') {
        const cityContext = [city?.city_name, city?.country].filter(Boolean).join(', ');
        coords = await geocodeAddress(addr, cityContext);
      }

      const created = await createHighlight(cityId, {
        ...newHighlight,
        name: newHighlight.name.trim(),
        address: addr || undefined,
        latitude: coords?.lat,
        longitude: coords?.lon,
      });
      setCity((prev) => {
        if (!prev) return prev;
        const existingHighlights = prev.city_highlights || prev.highlights || [];
        return {
          ...prev,
          city_highlights: [...existingHighlights, created],
          highlights: [...existingHighlights, created],
        };
      });
      setNewHighlight({ name: '', category: 'other', address: '' });
      setAddAddrCoords(null);
      setAddAddrStatus(null);
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert(t('cityDetail.error'), err.message || t('cityDetail.cannotCreatePoint'));
    } finally {
      setAddingHighlight(false);
    }
  }, [cityId, newHighlight, addAddrCoords, addAddrStatus, city]);

  // Open edit modal
  const handleOpenEdit = useCallback((highlight: Highlight) => {
    setEditingHighlight(highlight);
    setEditForm({
      name: highlight.name,
      category: highlight.category,
      subtype: highlight.subtype,
      address: highlight.address,
      description: highlight.description,
      price_range: highlight.price_range,
      tips: highlight.tips,
      is_must_see: highlight.is_must_see,
    });
    setEditAddrCoords(null);
    setEditAddrStatus(null);
    setShowEditModal(true);
  }, []);

  // Save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editingHighlight) return;

    setSavingEdit(true);
    try {
      const addressChanged = editForm.address !== editingHighlight.address;

      let coords = editAddrCoords;
      if (addressChanged && editForm.address?.trim() && !coords && editAddrStatus !== 'not_found') {
        const cityContext = [city?.city_name, city?.country].filter(Boolean).join(', ');
        coords = await geocodeAddress(editForm.address.trim(), cityContext);
      }

      await updateHighlight(editingHighlight.id, editForm);

      if (addressChanged && coords) {
        await updateHighlightCoordinates(editingHighlight.id, coords.lat, coords.lon);
      }

      setCity((prev) => {
        if (!prev) return prev;
        const updateHighlights = (hs: Highlight[]) =>
          hs.map((h) =>
            h.id === editingHighlight.id
              ? {
                  ...h,
                  ...editForm,
                  ...(addressChanged && coords
                    ? { latitude: coords.lat, longitude: coords.lon }
                    : {}),
                }
              : h
          );
        return {
          ...prev,
          city_highlights: updateHighlights(prev.city_highlights || []),
          highlights: updateHighlights(prev.highlights || []),
        };
      });

      setShowEditModal(false);
      setEditingHighlight(null);
      setEditAddrCoords(null);
      setEditAddrStatus(null);
    } catch (err: any) {
      Alert.alert(t('cityDetail.error'), err.message || t('cityDetail.cannotEditPoint'));
    } finally {
      setSavingEdit(false);
    }
  }, [editingHighlight, editForm, editAddrCoords, editAddrStatus, city]);

  // Delete highlight
  const handleDeleteHighlight = useCallback(async (highlightId: string) => {
    Alert.alert(
      t('cityDetail.delete'),
      t('cityDetail.deleteConfirmMessage'),
      [
        { text: t('cityDetail.cancel'), style: 'cancel' },
        {
          text: t('cityDetail.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHighlight(highlightId);
              setCity((prev) => {
                if (!prev) return prev;
                const filterHighlights = (highlights: Highlight[]) =>
                  highlights.filter((h) => h.id !== highlightId);
                return {
                  ...prev,
                  city_highlights: filterHighlights(prev.city_highlights || []),
                  highlights: filterHighlights(prev.highlights || []),
                };
              });
            } catch (err: any) {
              Alert.alert(t('cityDetail.error'), err.message || t('cityDetail.cannotDeletePoint'));
            }
          },
        },
      ]
    );
  }, []);

  // Open map for highlight
  const handleOpenMap = useCallback((highlight: Highlight) => {
    const lat = highlight.latitude;
    const lon = highlight.longitude;
    const label = encodeURIComponent(highlight.name);
    
    if (lat && lon) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}&query_place_id=${label}`);
    } else if (highlight.address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(highlight.address)}`);
    } else {
      Alert.alert(t('cityDetail.error'), t('cityDetail.noLocationForPoint'));
    }
  }, []);

  // Get highlights from city data
  const highlights = useMemo(() => {
    if (!city) return [];
    return city.city_highlights || city.highlights || [];
  }, [city]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<HighlightCategory, number> = {
      food: 0,
      culture: 0,
      nature: 0,
      shopping: 0,
      nightlife: 0,
      other: 0,
    };
    highlights.forEach((h) => {
      const cat = (h.category || 'other') as HighlightCategory;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [highlights]);

  // Get available categories (those with count > 0)
  const availableCategories = useMemo(() => {
    return (Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).filter(
      (cat) => categoryCounts[cat] > 0
    );
  }, [categoryCounts]);

  // Calculate must see count
  const mustSeeCount = useMemo(() => {
    return highlights.filter((h) => h.is_must_see).length;
  }, [highlights]);

  // Check if filters should be shown (must see OR more than 1 category)
  const showFilters = useMemo(() => {
    return mustSeeCount > 0 || availableCategories.length > 1;
  }, [availableCategories.length, mustSeeCount]);

  // Check if category filters should be shown (more than 1 category)
  const showCategoryFilters = useMemo(() => {
    return availableCategories.length > 1;
  }, [availableCategories.length]);

  // Filter highlights by selected categories and must see
  const filteredHighlights = useMemo(() => {
    let result = highlights;

    if (selectedMustSee !== null) {
      result = result.filter((h) =>
        selectedMustSee ? h.is_must_see : !h.is_must_see
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((h) =>
        selectedCategories.includes((h.category || 'other') as HighlightCategory)
      );
    }

    return result;
  }, [highlights, selectedCategories, selectedMustSee]);

  // Toggle category filter
  const toggleCategory = useCallback((category: HighlightCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        const newList = prev.filter((c) => c !== category);
        return newList;
      }
      return [...prev, category];
    });
  }, []);

  // Toggle must see filter
  const toggleMustSee = useCallback(() => {
    setSelectedMustSee((prev) => (prev === true ? null : true));
  }, []);

  // Get budget and practical info
  const budget = city?.city_budgets?.[0] || city?.budget;
  const practicalInfo = city?.city_practical_info?.[0] || city?.practical_info;

  // Loading state
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

  // Error state
  if (error || !city) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="center-content px-4" style={{ paddingTop: insets.top }}>
          <Text className="text-zinc-400 text-sm mb-4 font-dmsans">{error || t('cityDetail.cityNotFound')}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-zinc-800 px-6 py-3 rounded-lg"
          >
            <Text className="text-label">{t('cityDetail.back')}</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // Get vibe tag for the pill
  const vibeTag = city.vibe_tags?.[0] || city.vibe || null;

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      {/* Floating Back Button */}
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

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Hero Map with gradient mask */}
        <Animated.View style={{ width: '100%', height: mapExpandAnim }}>
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
              <CityHighlightsMap
                highlights={highlights}
                cityName={city.city_name}
                country={city.country}
                cityLat={city.latitude}
                cityLon={city.longitude}
                selectedCategories={selectedCategories}
                height={MAP_DEFAULT_HEIGHT}
                hideApproximateBadge
                onApproximateCount={setApproximateCount}
              />
            </MaskedView>
          </Animated.View>

          {/* Map shown without gradient when expanded */}
          {isMapExpanded && (
            <View style={{ position: 'absolute', inset: 0 }}>
              <CityHighlightsMap
                highlights={highlights}
                cityName={city.city_name}
                country={city.country}
                cityLat={city.latitude}
                cityLon={city.longitude}
                selectedCategories={selectedCategories}
                height={MAP_EXPANDED_HEIGHT}
                hideApproximateBadge
                onApproximateCount={setApproximateCount}
              />
            </View>
          )}

          {/* Approximate badge + Expand/collapse button row */}
          <View
            style={{
              position: 'absolute',
              bottom: isMapExpanded ? insets.top + 16 : 28,
              right: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Approximate badge */}
            {approximateCount > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
              >
                <Text className="font-dmsans" style={{ color: '#fbbf24', fontSize: 10 }}>
                  ⚠️ {approximateCount} {t('cityDetail.approx')}
                </Text>
              </View>
            )}

            {/* Expand/collapse button */}
            {highlights.length > 0 && (
              <TouchableOpacity
                onPress={toggleMapExpanded}
                style={{
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
          </View>
        </Animated.View>

        {/* Title */}
        <View className="px-8 mt-2">
          <Text
            style={{ fontFamily: 'Righteous', fontSize: 24, color: '#FAFAFF' }}
            numberOfLines={2}
          >
            {city.city_title || city.city_name}
          </Text>
        </View>

        {/* Vibe Pill - with scroll animation */}
        <Animated.View
          style={{
            maxHeight: vibeAndStatsMaxHeight,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              opacity: vibeAndStatsOpacity,
              transform: [{ translateY: vibeAndStatsTranslateY }],
            }}
          >
            {vibeTag && (
              <View className="px-8 mt-4 flex-row">
                <Pill
                  label={vibeTag}
                  backgroundColor="#306A9F"
                  textColor="#C7E0F8"
                />
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Navbar */}
        <View className="px-4 mt-8">
          <Navbar
            variant="secondary"
            size="sm"
            tabs={[
              { icon: 'star-line', label: t('cityDetail.highlights') },
              { icon: 'money-dollar-circle-line', label: t('cityDetail.budget') },
              { icon: 'compass-line', label: t('cityDetail.practical') },
            ]}
            activeIndex={activeTab === 'highlights' ? 0 : activeTab === 'budget' ? 1 : 2}
            onTabChange={(index) => {
              const tabs: TabKey[] = ['highlights', 'budget', 'practical'];
              setActiveTab(tabs[index]);
            }}
          />
        </View>

        {/* Tab Content */}
        <Animated.ScrollView
          ref={outerScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => {
            scrollViewHeight.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_, h) => {
            scrollContentHeight.current = h;
          }}
          onScroll={(e: any) => {
            const y = e.nativeEvent.contentOffset.y;
            const isScrollable = scrollContentHeight.current > scrollViewHeight.current;
            const effectiveY = isScrollable ? Math.max(0, y) : 0;
            scrollY.setValue(effectiveY);
            scrollYJS.setValue(effectiveY);
          }}
        >
          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <View style={{ paddingHorizontal: 16 }}>
              {/* Category Filters with SecondaryButton */}
              {showFilters && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                >
                  {/* Must See Filter */}
                  {mustSeeCount > 0 && (
                    <SecondaryButton
                      title={String(mustSeeCount)}
                      leftIcon="star-line"
                      colorScheme="mustsee"
                      active={selectedMustSee === true}
                      onPress={toggleMustSee}
                    />
                  )}
                  {/* Category Filters - only show if more than 1 category */}
                  {showCategoryFilters && availableCategories.map((cat) => {
                    const count = categoryCounts[cat];
                    const isActive = selectedCategories.includes(cat);
                    return (
                      <SecondaryButton
                        key={cat}
                        title={String(count)}
                        leftIcon={CATEGORY_ICONS[cat]}
                        colorScheme={CATEGORY_TO_COLOR_SCHEME[cat]}
                        active={isActive}
                        onPress={() => toggleCategory(cat)}
                      />
                    );
                  })}
                </ScrollView>
              )}

              {/* TicketCard List */}
              <View style={{ gap: 12 }}>
                {filteredHighlights.map((highlight) => (
                  <View key={highlight.id} style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <TicketCard
                        category={(highlight.category || 'other') as CategoryType}
                        title={highlight.name}
                        price={
                          highlight.price_range === 'free' || highlight.price_range === 'gratuit'
                            ? 'free'
                            : highlight.price_range
                              ? parseInt(highlight.price_range.replace(/[^0-9]/g, '')) || 0
                              : 0
                        }
                        tags={highlight.subtype ? [highlight.subtype] : []}
                        description={highlight.description || t('cityDetail.noDescription')}
                        tip={highlight.tips}
                        isMustSee={highlight.is_must_see}
                        colorScheme={CATEGORY_TO_COLOR_SCHEME[highlight.category || 'other']}
                      />
                    </View>
                    {/* Action buttons column */}
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
                      <TouchableOpacity
                        onPress={() => handleOpenMap(highlight)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {/* Inverser horizontalement l'icône en appliquant scaleX: -1 */}
                        <Icon name="navigation-line" size={17} color="#1084FE" style={{ transform: [{ scaleX: -1 }] }} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOpenEdit(highlight)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="pencil-line" size={17} color="rgba(255, 255, 255, 0.4)" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteHighlight(highlight.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="delete-bin-line" size={17} color="rgba(255, 144, 144, 0.4)" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {filteredHighlights.length === 0 && (
                  <View className="empty-state">
                    <Icon name={"information-2-fill"} size={32} color="#a1a1aa" style={{ opacity: 1 }} />
                    <Text className="text-sm text-zinc-400 mt-2 font-dmsans">{t('cityDetail.noPointsFound')}</Text>
                  </View>
                )}
              </View>

              {/* Add highlight button */}
              <View style={{ marginTop: 16, marginBottom: 16 }}>
                <PrimaryButton
                  title={t('cityDetail.addHighlight')}
                  leftIcon="add-line"
                  color="purple"
                  size="sm"
                  fullWidth
                  onPress={() => setShowAddModal(true)}
                  style={{ opacity: 0.8 }}
                />
              </View>
            </View>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <View className="px-4 pt-4 pb-6">
              {budget ? (
                <CityBudgetCard budget={budget} />
              ) : (
                <View className="empty-state">
                  <Icon name={"information-2-fill"} size={32} color="#a1a1aa" style={{ opacity: 1 }} />
                  <Text className="text-sm text-zinc-400 mt-2 font-dmsans">{t('cityDetail.noBudgetInfo')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Practical Tab */}
          {activeTab === 'practical' && (
            <View className="px-4 pt-4 pb-6">
              {!practicalInfo ? (
                <PracticalCard info={practicalInfo} />
              ) : (
                <View className="empty-state">
                  <Icon name={"information-2-fill"} size={32} color="#a1a1aa" style={{ opacity: 1 }} />
                  <Text className="text-sm text-zinc-400 mt-2 font-dmsans">{t('cityDetail.noPracticalInfo')}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.ScrollView>
      </View>

      {/* Add Highlight Modal */}
      <HighlightFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('cityDetail.addPoint')}
        form={newHighlight}
        setForm={setNewHighlight}
        addressStatus={addAddrStatus}
        onSubmit={handleAddHighlight}
        submitting={addingHighlight}
        submitLabel={t('cityDetail.add')}
      />

      {/* Edit Highlight Modal */}
      <HighlightFormModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('cityDetail.editPoint')}
        form={editForm}
        setForm={setEditForm}
        addressStatus={editAddrStatus}
        onSubmit={handleSaveEdit}
        submitting={savingEdit}
        submitLabel={t('cityDetail.save')}
      />
    </ImageBackground>
  );
}

