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
  Image,
  Animated,
  Easing,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

// Check if using native tabs (iOS 26+) which handles safe area automatically
const isExpoGo = Constants.appOwnership === 'expo';
const useNativeTabs = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26 && !isExpoGo;
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Map,
  MapPin,
  Calendar,
  Loader2,
  Bookmark,
  Trash2,
  Building2,
  Star,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { deleteTrip } from '@/services/tripService';
import { deleteCity } from '@/services/cityService';
import {
  getUserSavedItems,
  SavedItem,
  SavedFilter,
  getEntityAccentColor,
} from '@/services/savedService';

// -- Helpers ------------------------------------------------------------------

function timeAgo(dateString: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 86_400_000
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

// -- SpinningLoader -----------------------------------------------------------

function SpinningLoader({ size = 32, color = '#60a5fa' }: { size?: number; color?: string }) {
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

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

// -- Filter Tabs --------------------------------------------------------------

function FilterTabs({
  filter,
  onFilterChange,
}: {
  filter: SavedFilter;
  onFilterChange: (f: SavedFilter) => void;
}) {
  const filters: { key: SavedFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'trip', label: 'Trips' },
    { key: 'city', label: 'Cities' },
  ];

  return (
    <View
      className="flex-row border-b border-zinc-800"
      style={{ paddingHorizontal: 16 }}
    >
      {filters.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onFilterChange(key)}
          className="flex-1 py-3"
          style={{
            borderBottomWidth: filter === key ? 2 : 0,
            borderBottomColor: filter === key ? '#3b82f6' : 'transparent',
          }}
        >
          <Text
            className={`text-center text-sm font-medium ${
              filter === key ? 'text-blue-400' : 'text-zinc-500'
            }`}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// -- EntityCard ---------------------------------------------------------------

function EntityCard({
  item,
  animIndex,
  onPress,
  onDelete,
}: {
  item: SavedItem;
  animIndex: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isCity = item.entity_type === 'city';
  const accentColor = getEntityAccentColor(item.entity_type);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer definitivement ?',
      `Ce ${isCity ? 'guide' : 'voyage'} sera supprime de facon permanente.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  // Staggered entry animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: animIndex * 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: animIndex * 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className="bg-zinc-900 rounded-xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: '#27272a',
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
        }}
      >
        {/* Thumbnail */}
        {item.thumbnail_url ? (
          <View className="relative h-48 bg-zinc-800 overflow-hidden">
            <Image
              source={{ uri: item.thumbnail_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}
            />
            <View className="absolute bottom-4 left-4 right-4">
              {/* Entity type badge */}
              <View
                className="self-start px-2 py-0.5 rounded-full mb-2"
                style={{ backgroundColor: `${accentColor}33` }}
              >
                <Text style={{ color: accentColor, fontSize: 10, fontWeight: '600' }}>
                  {isCity ? 'City Guide' : 'Trip'}
                </Text>
              </View>
              <Text
                className="text-xl font-bold text-white leading-tight"
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {item.subtitle && (
                <Text className="text-xs text-zinc-300 mt-1">{item.subtitle}</Text>
              )}
            </View>
          </View>
        ) : (
          <View className="p-4 pb-0">
            {/* Entity type badge */}
            <View
              className="self-start px-2 py-0.5 rounded-full mb-2"
              style={{ backgroundColor: `${accentColor}33` }}
            >
              <Text style={{ color: accentColor, fontSize: 10, fontWeight: '600' }}>
                {isCity ? 'City Guide' : 'Trip'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-white">{item.title}</Text>
            {item.subtitle && (
              <Text className="text-xs text-zinc-400 mt-1">{item.subtitle}</Text>
            )}
          </View>
        )}

        {/* Info section */}
        <View className="p-4 gap-3">
          <View className="flex-row items-center gap-4 flex-wrap">
            {/* Duration or highlights count */}
            {isCity && item.highlights_count ? (
              <View className="flex-row items-center gap-1.5">
                <Star size={16} color={accentColor} />
                <Text className="text-sm text-zinc-400">
                  {item.highlights_count} highlights
                </Text>
              </View>
            ) : item.duration_days ? (
              <View className="flex-row items-center gap-1.5">
                <MapPin size={16} color={accentColor} />
                <Text className="text-sm text-zinc-400">{item.duration_days} jours</Text>
              </View>
            ) : null}

            {/* Date */}
            <View className="flex-row items-center gap-1.5">
              <Calendar size={16} color="#71717a" />
              <Text className="text-sm text-zinc-400">{timeAgo(item.created_at)}</Text>
            </View>

            {/* Creator */}
            {item.content_creator_handle && (
              <Text className="text-sm text-zinc-500">
                @{item.content_creator_handle}
              </Text>
            )}
          </View>

          {/* User notes */}
          {item.notes && (
            <Text
              className="text-xs text-zinc-500 italic pt-2"
              style={{ borderTopWidth: 1, borderTopColor: '#27272a' }}
            >
              {item.notes}
            </Text>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-1.5">
              <Bookmark size={14} color="#4ade80" fill="#4ade80" />
              <Text className="text-xs text-green-400">Sauvegarde</Text>
            </View>
            <TouchableOpacity
              onPress={handleDelete}
              className="p-2 -mr-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={18} color="#71717a" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// -- Main Component -----------------------------------------------------------

export default function SavedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<SavedFilter>('all');
  const [items, setItems] = useState<SavedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (pageNum: number, append = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const response = await getUserSavedItems(user.id, filter, pageNum, 20);
        if (append) {
          setItems((prev) => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        setHasMore(response.has_more);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user, filter]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadItems(1, false);
  }, [filter, user]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadItems(1, false);
    }, [loadItems])
  );

  // Handle filter change
  const handleFilterChange = (newFilter: SavedFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
      setItems([]);
      setHasMore(true);
    }
  };

  // Load more (infinite scroll)
  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    loadItems(nextPage, true);
  };

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadItems(1, false);
  };

  // Delete handler
  const handleDelete = async (item: SavedItem) => {
    try {
      if (item.entity_type === 'city') {
        await deleteCity(item.entity_id);
      } else {
        await deleteTrip(item.entity_id);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  // Navigation handler
  const handlePress = (item: SavedItem) => {
    if (item.entity_type === 'city') {
      router.push(`/(tabs)/trips/city/${item.entity_id}`);
    } else {
      router.push(`/(tabs)/trips/${item.entity_id}`);
    }
  };

  // Loading state
  if (loading && items.length === 0) {
    return (
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <SpinningLoader size={32} color="#60a5fa" />
      </View>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-sm text-red-400">Erreur : {error}</Text>
      </View>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-zinc-400">Connectez-vous pour voir vos sauvegardes.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header with filter tabs */}
      <View style={{ paddingTop: insets.top }}>
        <FilterTabs filter={filter} onFilterChange={handleFilterChange} />
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#60a5fa"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <EntityCard
            item={item}
            animIndex={index}
            onPress={() => handlePress(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={<EmptyState filter={filter} />}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <SpinningLoader size={24} color="#60a5fa" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

// -- Empty State --------------------------------------------------------------

function EmptyState({ filter }: { filter: SavedFilter }) {
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
  const Icon = isCity ? Building2 : Map;
  const title =
    filter === 'all'
      ? 'Aucune sauvegarde'
      : filter === 'city'
      ? 'Aucun guide de ville'
      : 'Aucun voyage';
  const subtitle =
    filter === 'all'
      ? "Validez des videos depuis l'Inbox pour creer vos premiers itineraires."
      : filter === 'city'
      ? "Analysez des videos de type 'city guide' pour decouvrir des villes."
      : "Analysez des videos de voyage pour creer des itineraires.";

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="items-center py-16"
    >
      <View className="w-20 h-20 bg-zinc-800 rounded-full items-center justify-center mb-4">
        <Icon size={40} color="#52525b" />
      </View>
      <Text className="text-xl font-medium text-white mb-2">{title}</Text>
      <Text className="text-zinc-400 text-center" style={{ maxWidth: 280 }}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}
