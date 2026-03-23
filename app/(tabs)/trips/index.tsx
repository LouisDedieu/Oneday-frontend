/**
 * app/(tabs)/trips/index.tsx
 *
 * Route: /trips (now labeled "Saved")
 * Displays user's saved items (trips and cities) with filter tabs
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ImageBackground,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/navigation/Navbar';
import Loader from '@/components/Loader';
import { ContentCard } from '@/components/ContentCard';
import { colors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { deleteTrip } from '@/services/tripService';
import { deleteCity } from '@/services/cityService';
import { getUserSavedItems, SavedItem } from '@/services/savedService';
import { CreateContentFAB } from '@/components/CreateContentFAB';
import Icon from "react-native-remix-icon";

// -- Filter type (without 'all') ----------------------------------------------

type FilterType = 'trip' | 'city';

// -- Main Component -----------------------------------------------------------

export default function SavedPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterType>('trip');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Header title animation
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: isFabExpanded ? 0 : 1,
        duration: 200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateX, {
        toValue: isFabExpanded ? -20 : 0,
        duration: 200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFabExpanded]);

  // Cache items per filter
  const [tripItems, setTripItems] = useState<SavedItem[]>([]);
  const [cityItems, setCityItems] = useState<SavedItem[]>([]);
  const [tripLoaded, setTripLoaded] = useState(false);
  const [cityLoaded, setCityLoaded] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current items based on filter
  const items = filter === 'trip' ? tripItems : cityItems;

  const loadItems = useCallback(
    async (pageNum: number, append = false, forceFilter?: FilterType) => {
      const targetFilter = forceFilter ?? filter;
      const targetSetItems = targetFilter === 'trip' ? setTripItems : setCityItems;
      const targetSetLoaded = targetFilter === 'trip' ? setTripLoaded : setCityLoaded;

      if (!user) {
        setInitialLoading(false);
        return;
      }
      try {
        const response = await getUserSavedItems(user.id, targetFilter, pageNum, 20);
        if (append) {
          targetSetItems((prev) => [...prev, ...response.items]);
        } else {
          targetSetItems(response.items);
        }
        setHasMore(response.has_more);
        targetSetLoaded(true);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitialLoading(false);
        setFilterLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user, filter]
  );

  // Initial load (trip)
  useEffect(() => {
    if (user && !tripLoaded) {
      setPage(1);
      loadItems(1, false, 'trip');
    } else if (!user) {
      setInitialLoading(false);
    }
  }, [user]);


  // Handle tab change
  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
    const newFilter: FilterType = index === 0 ? 'trip' : 'city';
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
      setHasMore(true);

      // Only load if not already loaded
      const alreadyLoaded = newFilter === 'trip' ? tripLoaded : cityLoaded;
      if (!alreadyLoaded) {
        setFilterLoading(true);
        loadItems(1, false, newFilter);
      }
    }
  };

  // Load more (infinite scroll)
  const handleLoadMore = () => {
    // Don't trigger if list is too short (less than a full page)
    if (items.length < 20) return;
    if (!hasMore || loadingMore || filterLoading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    loadItems(nextPage, true, filter);
  };

  // Refresh (pull-to-refresh)
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadItems(1, false, filter);
  };

  // Delete handler
  const handleDelete = async (item: SavedItem) => {
    const alertTitle = item.entity_type === 'city' ? t('trips.deleteCity') : t('trips.deleteTrip');
    Alert.alert(
      alertTitle,
      `Toutes les données associées à "${item.title}" seront supprimées définitivement.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.entity_type === 'city') {
                await deleteCity(item.entity_id);
                setCityItems((prev) => prev.filter((i) => i.id !== item.id));
              } else {
                await deleteTrip(item.entity_id);
                setTripItems((prev) => prev.filter((i) => i.id !== item.id));
              }
            } catch (err) {
              Alert.alert(t('trips.error'), t('trips.cannotDelete'));
            }
          },
        },
      ]
    );
  };

  // Navigation handler
  const handlePress = (item: SavedItem) => {
    if (item.entity_type === 'city') {
      router.push(`/(tabs)/trips/city/${item.entity_id}`);
    } else {
      router.push(`/(tabs)/trips/${item.entity_id}`);
    }
  };

  // Initial loading state (only on first load)
  if (initialLoading) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View
          className="flex-1 justify-center items-center"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <Loader />
        </View>
      </ImageBackground>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View
          className="center-content"
          style={{ paddingTop: insets.top }}
        >
          <Text className="text-sm text-error font-dmsans">Erreur : {error}</Text>
        </View>
      </ImageBackground>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View
          className="center-content"
          style={{ paddingTop: insets.top }}
        >
          <Text className="text-text-secondary font-dmsans">{t('trips.signInToView')}</Text>
        </View>
      </ImageBackground>
    );
  }

  const navbarTabs = [
    { icon: 'signpost-line', label: 'Trip', badge: tripItems.length },
    { icon: 'building-line', label: 'City', badge: cityItems.length },
  ];

  return (
    <ImageBackground
      source={require('@/assets/images/bg-gradient.png')}
      className="flex-1"
      resizeMode="cover"
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        {/* Title */}
        <Animated.View
          className="flex-row mb-4"
          style={{
            opacity: headerOpacity,
            transform: [{ translateX: headerTranslateX }],
          }}
        >
          <Text className="section-title">
            {t('trips.your')}{' '}
          </Text>
          <Text
            className="section-title-accent"
            style={{
              textShadowColor: colors.shadowDark,
              textShadowOffset: { width: 0, height: 4 },
              textShadowRadius: 4,
            }}
          >
            {`${t('trips.collection')}`}
          </Text>
        </Animated.View>

        {/* Navbar */}
        <Navbar
          tabs={navbarTabs}
          activeIndex={activeTabIndex}
          onTabChange={handleTabChange}
          variant="secondary"
          size="default"
        />
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 120,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          // Parse city subtitle "Nice, France" → country = "France"
          const countryFromSubtitle = item.subtitle?.split(', ').slice(1).join(', ') || undefined;

          // Transform days data for ContentCard
          const daysForCard = item.days?.map((d) => ({
            dayNumber: d.day_number,
            count: d.spots_count,
          }));

          // Transform categories data for ContentCard
          const categoriesForCard = item.categories?.map((c) => ({
            category: c.category,
            count: c.count,
          }));

          return (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              {item.entity_type === 'trip' ? (
                <ContentCard
                  variant="trip"
                  title={item.title}
                  daysCount={item.duration_days ?? undefined}
                  days={daysForCard}
                />
              ) : (
                <ContentCard
                  variant="city"
                  title={item.title}
                  highlightsCount={item.highlights_count ?? undefined}
                  country={countryFromSubtitle}
                  categories={categoriesForCard}
                />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          filterLoading ? (
            <View className="items-center py-16">
              <Loader size={72} />
            </View>
          ) : (
            <EmptyState filter={filter} />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <Loader size={48} />
            </View>
          ) : null
        }
      />

      {/* Create Content FAB */}
      <CreateContentFAB
        onExpandChange={setIsFabExpanded}
        onContentCreated={() => {
          setTripLoaded(false);
          setCityLoaded(false);
          setPage(1);
          loadItems(1, false, filter);
        }}
      />
    </ImageBackground>
  );
}

// -- Empty State --------------------------------------------------------------

function EmptyState({ filter }: { filter: FilterType }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isCity = filter === 'city';
  const icon = isCity ? 'building-line' : 'signpost-line';
  const title = isCity ? t('trips.noCities') : t('trips.noTrips');
  const subtitle = isCity
    ? t('trips.analyzeCityVideos')
    : t('trips.analyzeVideosToCreate');

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="items-center py-16"
    >
      <View className="w-20 h-20 bg-bg-primary/50 rounded-full items-center justify-center mb-4">
        <Icon name={icon} size={40} color={colors.textMuted} />
      </View>
      <Text className="text-xl font-dmsans-medium text-text-primary mb-2">{title}</Text>
      <Text className="text-text-secondary font-dmsans text-center" style={{ maxWidth: 280 }}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}
