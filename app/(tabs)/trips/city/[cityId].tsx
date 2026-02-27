/**
 * app/(tabs)/trips/city/[cityId].tsx
 *
 * City detail page with tabs: Highlights, Budget, Practical
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Building2,
  Wallet,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Smartphone,
  Package,
  Shield,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { getCity, isCitySaved, saveCity, unsaveCity } from '@/services/cityService';
import { CityData, Highlight, HighlightCategory, PracticalInfo } from '@/types/api';
import { CategoryFilterChips } from '@/components/city/CategoryFilterChips';
import { HighlightCard } from '@/components/city/HighlightCard';
import { CityBudgetCard } from '@/components/city/CityBudgetCard';
import { CityHighlightsMap } from '@/components/city/CityHighlightsMap';

type TabKey = 'highlights' | 'budget' | 'practical';

// -- SpinningLoader -----------------------------------------------------------

function SpinningLoader({ size = 32, color = '#a855f7' }: { size?: number; color?: string }) {
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

// -- Tab Button ---------------------------------------------------------------

function TabButton({
  label,
  icon: Icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 py-3 flex-row items-center justify-center gap-1.5"
      style={{
        borderBottomWidth: 2,
        borderBottomColor: isActive ? '#a855f7' : 'transparent',
      }}
    >
      <Icon size={16} color={isActive ? '#a855f7' : '#71717a'} />
      <Text
        className={`text-sm font-medium ${
          isActive ? 'text-purple-400' : 'text-zinc-500'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// -- Main Component -----------------------------------------------------------

export default function CityDetailPage() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('highlights');
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);

  // Load city data
  useEffect(() => {
    if (!cityId) return;

    const loadCity = async () => {
      try {
        const data = await getCity(cityId);
        setCity(data);

        // Check if saved
        if (user) {
          const saved = await isCitySaved(user.id, cityId);
          setIsSaved(saved);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCity();
  }, [cityId, user]);

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

  // Filter highlights by selected categories
  const filteredHighlights = useMemo(() => {
    if (selectedCategories.length === 0) return highlights;
    return highlights.filter((h) =>
      selectedCategories.includes((h.category || 'other') as HighlightCategory)
    );
  }, [highlights, selectedCategories]);

  // Toggle category filter
  const toggleCategory = useCallback((category: HighlightCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
  }, []);

  // Get budget and practical info
  const budget = city?.city_budgets?.[0] || city?.budget;
  const practicalInfo =
    city?.city_practical_info?.[0] || city?.practical_info;

  // Handle save/unsave
  const handleToggleSave = async () => {
    if (!user || !cityId || savingState) return;
    setSavingState(true);
    try {
      if (isSaved) {
        await unsaveCity(user.id, cityId);
        setIsSaved(false);
      } else {
        await saveCity(user.id, cityId);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    } finally {
      setSavingState(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <SpinningLoader size={32} color="#a855f7" />
      </View>
    );
  }

  // Error state
  if (error || !city) {
    return (
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-red-400">{error || 'City not found'}</Text>
        <TouchableOpacity
          onPress={() => router.navigate('/(tabs)/trips')}
          className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg"
        >
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        className="px-4 pb-4 border-b border-zinc-800"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Top row: Back + Save */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/trips')}
            className="flex-row items-center gap-1"
          >
            <ChevronLeft size={24} color="#fff" />
            <Text className="text-white">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleSave}
            className="flex-row items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: isSaved ? '#4ade8033' : '#27272a',
            }}
            disabled={savingState}
          >
            {isSaved ? (
              <BookmarkCheck size={18} color="#4ade80" />
            ) : (
              <Bookmark size={18} color="#71717a" />
            )}
            <Text
              className={`text-sm ${isSaved ? 'text-green-400' : 'text-zinc-400'}`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* City info */}
        <View className="flex-row items-start gap-3">
          <View className="w-12 h-12 bg-purple-500/20 rounded-full items-center justify-center">
            <Building2 size={24} color="#a855f7" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold" numberOfLines={2}>
              {city.city_title}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <MapPin size={14} color="#71717a" />
              <Text className="text-zinc-400 text-sm">
                {city.city_name}, {city.country}
              </Text>
            </View>
          </View>
        </View>

        {/* Vibe tags */}
        {city.vibe_tags && city.vibe_tags.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {city.vibe_tags.map((tag, idx) => (
              <View
                key={idx}
                className="px-2 py-1 bg-purple-500/20 rounded-full"
              >
                <Text className="text-purple-400 text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats row */}
        <View className="flex-row items-center gap-4 mt-3">
          <View className="flex-row items-center gap-1.5">
            <Star size={16} color="#a855f7" />
            <Text className="text-zinc-300 text-sm">
              {highlights.length} highlights
            </Text>
          </View>
          {city.content_creator_handle && (
            <TouchableOpacity
              onPress={() => {
                if (city.source_url) Linking.openURL(city.source_url);
              }}
              className="flex-row items-center gap-1.5"
            >
              <Text className="text-zinc-500 text-sm">
                @{city.content_creator_handle}
              </Text>
              <ExternalLink size={12} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab navigation */}
        <View className="flex-row mt-4 border-b border-zinc-800 -mx-4 px-4">
          <TabButton
            label="Highlights"
            icon={Star}
            isActive={activeTab === 'highlights'}
            onPress={() => setActiveTab('highlights')}
          />
          <TabButton
            label="Budget"
            icon={Wallet}
            isActive={activeTab === 'budget'}
            onPress={() => setActiveTab('budget')}
          />
          <TabButton
            label="Practical"
            icon={Globe}
            isActive={activeTab === 'practical'}
            onPress={() => setActiveTab('practical')}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === 'highlights' && (
          <HighlightsTab
            highlights={filteredHighlights}
            allHighlights={highlights}
            categoryCounts={categoryCounts}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            cityName={city.city_name}
            country={city.country}
            cityLat={city.latitude}
            cityLon={city.longitude}
          />
        )}
        {activeTab === 'budget' && budget && <BudgetTab budget={budget} />}
        {activeTab === 'practical' && practicalInfo && (
          <PracticalTab info={practicalInfo} />
        )}
      </ScrollView>
    </View>
  );
}

// -- Highlights Tab -----------------------------------------------------------

function HighlightsTab({
  highlights,
  allHighlights,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  cityName,
  country,
  cityLat,
  cityLon,
}: {
  highlights: Highlight[];
  allHighlights: Highlight[];
  categoryCounts: Record<HighlightCategory, number>;
  selectedCategories: HighlightCategory[];
  onToggleCategory: (cat: HighlightCategory) => void;
  cityName: string;
  country?: string;
  cityLat?: number;
  cityLon?: number;
}) {
  return (
    <View>
      {/* Map with geocoding - always show, will geocode missing coords */}
      <View className="px-4 pt-4">
        <CityHighlightsMap
          highlights={allHighlights}
          cityName={cityName}
          country={country}
          cityLat={cityLat}
          cityLon={cityLon}
          selectedCategories={selectedCategories}
          height={180}
        />
      </View>

      {/* Category filters */}
      <CategoryFilterChips
        selectedCategories={selectedCategories}
        categoryCounts={categoryCounts}
        onToggle={onToggleCategory}
      />

      {/* Highlights list */}
      <View className="px-4 gap-3 mt-2">
        {highlights.map((highlight) => (
          <HighlightCard key={highlight.id} highlight={highlight} />
        ))}

        {highlights.length === 0 && (
          <View className="py-8 items-center">
            <Text className="text-zinc-500">No highlights in this category</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// -- Budget Tab ---------------------------------------------------------------

function BudgetTab({ budget }: { budget: any }) {
  return (
    <View className="px-4 pt-4">
      <CityBudgetCard budget={budget} />
    </View>
  );
}

// -- Practical Tab ------------------------------------------------------------

function PracticalTab({ info }: { info: PracticalInfo }) {
  return (
    <View className="px-4 pt-4 gap-4">
      {/* Essential info */}
      <View
        className="bg-zinc-900 rounded-xl p-4"
        style={{ borderWidth: 1, borderColor: '#27272a' }}
      >
        <Text className="text-white font-semibold mb-3">Essential Info</Text>
        <View className="gap-3">
          {info.visa_required !== undefined && (
            <View className="flex-row items-center justify-between">
              <Text className="text-zinc-400">Visa</Text>
              <Text
                className={
                  info.visa_required ? 'text-orange-400' : 'text-green-400'
                }
              >
                {info.visa_required ? 'Required' : 'Not required'}
              </Text>
            </View>
          )}
          {info.local_currency && (
            <View className="flex-row items-center justify-between">
              <Text className="text-zinc-400">Currency</Text>
              <Text className="text-white">{info.local_currency}</Text>
            </View>
          )}
          {info.language && (
            <View className="flex-row items-center justify-between">
              <Text className="text-zinc-400">Language</Text>
              <Text className="text-white">{info.language}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Apps */}
      {info.best_apps && info.best_apps.length > 0 && (
        <View
          className="bg-zinc-900 rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <Smartphone size={18} color="#3b82f6" />
            <Text className="text-white font-semibold">Useful Apps</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {info.best_apps.map((app, idx) => (
              <View key={idx} className="px-3 py-1.5 bg-blue-500/20 rounded-full">
                <Text className="text-blue-400 text-sm">{app}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* What to pack */}
      {info.what_to_pack && info.what_to_pack.length > 0 && (
        <View
          className="bg-zinc-900 rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <Package size={18} color="#a855f7" />
            <Text className="text-white font-semibold">What to Pack</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {info.what_to_pack.map((item, idx) => (
              <View key={idx} className="px-3 py-1.5 bg-purple-500/20 rounded-full">
                <Text className="text-purple-400 text-sm">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Safety tips */}
      {info.safety_tips && info.safety_tips.length > 0 && (
        <View
          className="bg-zinc-900 rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <Shield size={18} color="#22c55e" />
            <Text className="text-white font-semibold">Safety Tips</Text>
          </View>
          <View className="gap-2">
            {info.safety_tips.map((tip, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <Text className="text-green-400">•</Text>
                <Text className="text-zinc-300 text-sm flex-1">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Things to avoid */}
      {info.avoid && info.avoid.length > 0 && (
        <View
          className="bg-zinc-900 rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <AlertTriangle size={18} color="#ef4444" />
            <Text className="text-white font-semibold">Things to Avoid</Text>
          </View>
          <View className="gap-2">
            {info.avoid.map((item, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <Text className="text-red-400">✗</Text>
                <Text className="text-zinc-300 text-sm flex-1">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
