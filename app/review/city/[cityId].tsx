/**
 * app/review/city/[cityId].tsx
 * Route: /review/city/:cityId
 * City review page with drag & drop highlight reordering
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Linking,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  MapPin,
  Loader2,
  ExternalLink,
  Trash2,
  Merge,
  X,
  Plus,
} from 'lucide-react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isCitySaved, saveCity, unsaveCity, checkCityMatch, mergeCities } from '@/services/cityService';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCityForReview,
  updateHighlight,
  deleteHighlight,
  reorderHighlights,
  syncCityData,
  setHighlightValidated,
  createHighlight,
  type DbCity,
  type HighlightUpdatePayload,
  type CreateHighlightPayload,
} from '@/services/cityReviewService';
import { Highlight, HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';
import { HighlightReviewCard } from '@/components/city/HighlightReviewCard';
import { CategoryFilterChips, CATEGORY_COLORS } from '@/components/city/CategoryFilterChips';
import { Button } from '@/components/Button';

// ── SpinningLoader ─────────────────────────────────────────────────────────────

function SpinningLoader({ size = 16, color = '#60a5fa' }: { size?: number; color?: string }) {
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
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CityReviewPage() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [city, setCity] = useState<DbCity | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);

  // Merge detection state
  const [existingMatch, setExistingMatch] = useState<{
    city_id: string;
    city_name: string;
    highlights_count: number;
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [showMergeBanner, setShowMergeBanner] = useState(true);

  // Add highlight state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingHighlight, setAddingHighlight] = useState(false);
  const [newHighlight, setNewHighlight] = useState<CreateHighlightPayload>({
    name: '',
    category: 'other',
    address: '',
  });

  // Load city data
  useEffect(() => {
    if (!cityId) return;
    fetchCityForReview(cityId).then((c) => {
      setCity(c);
      setLoading(false);

      // Check for existing city match
      if (c?.city_name) {
        console.log('[Merge] Checking match for city_name:', c.city_name);
        checkCityMatch(c.city_name).then((match) => {
          console.log('[Merge] API response:', match, 'current cityId:', cityId);
          if (match.match && match.city_id !== cityId) {
            console.log('[Merge] Match found! Showing banner');
            setExistingMatch({
              city_id: match.city_id!,
              city_name: match.city_name!,
              highlights_count: match.highlights_count || 0,
            });
          } else {
            console.log('[Merge] No match or same city');
          }
        }).catch((err) => {
          console.error('[Merge] Error checking match:', err);
        });
      }
    });
  }, [cityId]);

  // Check if saved
  useEffect(() => {
    if (user?.id && cityId) {
      isCitySaved(user.id, cityId).then(setIsSaved).catch(console.error);
    }
  }, [user?.id, cityId]);

  // ── Category filtering ───────────────────────────────────────────────────────

  const categoryCounts = React.useMemo(() => {
    const counts: Record<HighlightCategory, number> = {
      food: 0,
      culture: 0,
      nature: 0,
      shopping: 0,
      nightlife: 0,
      other: 0,
    };
    city?.highlights.forEach((h) => {
      if (h.validated !== false) {
        counts[h.category] = (counts[h.category] || 0) + 1;
      }
    });
    return counts;
  }, [city?.highlights]);

  const handleToggleCategory = useCallback((category: HighlightCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
  }, []);

  const filteredHighlights = React.useMemo(() => {
    if (!city?.highlights) return [];
    if (selectedCategories.length === 0) return city.highlights;
    return city.highlights.filter((h) => selectedCategories.includes(h.category));
  }, [city?.highlights, selectedCategories]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleHighlightUpdate = useCallback(
    async (highlightId: string, payload: HighlightUpdatePayload) => {
      // Optimistic update
      setCity((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          highlights: prev.highlights.map((h) =>
            h.id === highlightId ? { ...h, ...payload } : h
          ),
        };
      });
      try {
        await updateHighlight(highlightId, payload);
      } catch {
        // Revert on error
        if (cityId) fetchCityForReview(cityId).then((c) => c && setCity(c));
      }
    },
    [cityId]
  );

  const handleHighlightDelete = useCallback(
    async (highlightId: string) => {
      // Optimistic update
      setCity((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          highlights: prev.highlights.filter((h) => h.id !== highlightId),
        };
      });
      try {
        await deleteHighlight(highlightId);
      } catch {
        if (cityId) fetchCityForReview(cityId).then((c) => c && setCity(c));
      }
    },
    [cityId]
  );

  const handleValidatedChange = useCallback(
    async (highlightId: string, validated: boolean) => {
      // Optimistic update
      setCity((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          highlights: prev.highlights.map((h) =>
            h.id === highlightId ? { ...h, validated } : h
          ),
        };
      });
      try {
        await setHighlightValidated(highlightId, validated);
      } catch {
        // Revert
        setCity((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            highlights: prev.highlights.map((h) =>
              h.id === highlightId ? { ...h, validated: !validated } : h
            ),
          };
        });
      }
    },
    []
  );

  const handleToggleAll = useCallback(
    async (validated: boolean) => {
      if (!city) return;
      const prev = city.highlights.map((h) => ({ id: h.id, val: h.validated }));
      // Optimistic update
      setCity((p) =>
        p ? { ...p, highlights: p.highlights.map((h) => ({ ...h, validated })) } : p
      );
      try {
        await Promise.all(prev.map((h) => setHighlightValidated(h.id, validated)));
      } catch {
        // Revert
        setCity((p) =>
          p
            ? {
                ...p,
                highlights: p.highlights.map((h) => ({
                  ...h,
                  validated: prev.find((u) => u.id === h.id)?.val ?? h.validated,
                })),
              }
            : p
        );
      }
    },
    [city]
  );

  // Drag & drop reorder
  const handleDragEnd = useCallback(
    async ({ data }: { data: Highlight[] }) => {
      if (!city || !cityId) return;

      // Update local state immediately
      setCity((prev) => (prev ? { ...prev, highlights: data } : prev));

      // Build reorder payload
      const reorderPayload = data.map((h, idx) => ({
        id: h.id,
        order: idx,
      }));

      try {
        await reorderHighlights(cityId, reorderPayload);
      } catch {
        // Revert on error
        fetchCityForReview(cityId).then((c) => c && setCity(c));
      }
    },
    [city, cityId]
  );

  // Merge with existing city - only merge validated (included) highlights
  const handleMerge = useCallback(async () => {
    if (!existingMatch || !cityId || !city) return;

    // Get only validated highlight IDs
    const validatedIds = city.highlights
      .filter((h) => h.validated !== false)
      .map((h) => h.id);

    console.log('[Merge] All highlights:', city.highlights.map(h => ({ id: h.id, name: h.name, validated: h.validated })));
    console.log('[Merge] Validated IDs to send:', validatedIds);

    if (validatedIds.length === 0) {
      Alert.alert('Aucun point', 'Selectionnez au moins un point a fusionner.');
      return;
    }

    setMerging(true);
    try {
      const result = await mergeCities(existingMatch.city_id, cityId, validatedIds, true);
      console.log('[Merge] Result:', result);
      Alert.alert(
        'Fusion terminee',
        `${result.highlights_merged} point${result.highlights_merged > 1 ? 's' : ''} ajouté${result.highlights_merged > 1 ? 's' : ''} a ${existingMatch.city_name}.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/(tabs)/trips/city/${existingMatch.city_id}`),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setMerging(false);
    }
  }, [existingMatch, cityId, city, router]);

  // Add new highlight
  const handleAddHighlight = useCallback(async () => {
    if (!cityId || !newHighlight.name.trim()) return;

    setAddingHighlight(true);
    try {
      const created = await createHighlight(cityId, {
        ...newHighlight,
        name: newHighlight.name.trim(),
        address: newHighlight.address?.trim() || undefined,
      });
      // Add to local state
      setCity((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          highlights: [...prev.highlights, created],
        };
      });
      // Reset form and close modal
      setNewHighlight({ name: '', category: 'other', address: '' });
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le point');
    } finally {
      setAddingHighlight(false);
    }
  }, [cityId, newHighlight]);

  // Save/unsave
  const handleValidate = async () => {
    if (!city || !user?.id) return;
    setValidating(true);
    try {
      if (isSaved) {
        await unsaveCity(user.id, city.id);
        setIsSaved(false);
      } else {
        await syncCityData(city.id);
        await saveCity(user.id, city.id);
        setIsSaved(true);
        // Replace to avoid stacking review page in history
        router.replace(`/(tabs)/trips/city/${city.id}`);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setValidating(false);
    }
  };

  // ── Render item for draggable list ───────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Highlight>) => (
      <ScaleDecorator>
        <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          <HighlightReviewCard
            highlight={item}
            onUpdate={(payload) => handleHighlightUpdate(item.id, payload)}
            onDelete={() => handleHighlightDelete(item.id)}
            onValidatedChange={(v) => handleValidatedChange(item.id, v)}
            isDragging={isActive}
            drag={drag}
          />
        </View>
      </ScaleDecorator>
    ),
    [handleHighlightUpdate, handleHighlightDelete, handleValidatedChange]
  );

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <SpinningLoader size={32} color="#60a5fa" />
      </View>
    );
  }

  if (!city) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4">
        <Text className="text-zinc-400">Ville introuvable</Text>
        <Button onPress={() => router.navigate('/(tabs)')}>Retour</Button>
      </View>
    );
  }

  const validatedHighlights = city.highlights.filter((h) => h.validated !== false);
  const totalHighlights = city.highlights.length;
  const validatedCount = validatedHighlights.length;
  const progressPct = totalHighlights > 0 ? Math.round((validatedCount / totalHighlights) * 100) : 0;

  const footerBg = isSaved
    ? '#b91c1c' // red-700
    : validatedCount === 0
    ? '#3f3f46' // zinc-700
    : '#a855f7'; // purple-500 for cities

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <View className="flex-1 bg-black">
        {/* ── Header ── */}
        <View
          className="bg-zinc-900 px-4 py-4"
          style={{
            paddingTop: insets.top + 16,
            borderBottomWidth: 1,
            borderBottomColor: '#27272a',
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.navigate('/(tabs)')} style={{ padding: 8 }}>
              <View pointerEvents="none">
                <ArrowLeft size={24} color="#a1a1aa" />
              </View>
            </Pressable>
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-bold text-white" numberOfLines={1}>
                {city.city_title}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={12} color="#a855f7" />
                <Text className="text-sm text-zinc-400">
                  {city.city_name}, {city.country} · {totalHighlights} points
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Content with DraggableFlatList ── */}
        <DraggableFlatList
          data={filteredHighlights}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              {/* Merge banner */}
              {existingMatch && showMergeBanner && (
                <View
                  className="mx-4 mt-3 rounded-xl p-3"
                  style={{
                    backgroundColor: '#7c3aed22',
                    borderWidth: 1,
                    borderColor: '#7c3aed4D',
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <Merge size={18} color="#a78bfa" />
                    <View className="flex-1">
                      <Text className="text-sm text-purple-300 font-medium">
                        {existingMatch.city_name} existe deja
                      </Text>
                      <Text className="text-xs text-purple-400 mt-0.5">
                        {existingMatch.highlights_count} existants · Ajouter {validatedCount} point{validatedCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleMerge}
                      disabled={merging || validatedCount === 0}
                      className="px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: '#7c3aed',
                        opacity: validatedCount === 0 ? 0.5 : 1,
                      }}
                    >
                      {merging ? (
                        <SpinningLoader size={14} color="#fff" />
                      ) : (
                        <Text className="text-white text-xs font-medium">Fusionner</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowMergeBanner(false)}
                      className="p-1"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color="#a78bfa" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Selection panel - compact */}
              <View
                className="mx-4 mt-3 bg-zinc-900 rounded-xl p-3"
                style={{ borderWidth: 1, borderColor: '#27272a' }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-white">
                      {validatedCount}/{totalHighlights}
                    </Text>
                    <Text className="text-xs text-zinc-500">points</Text>
                  </View>
                  <View className="flex-row gap-1.5">
                    {(['Tout', 'Aucun'] as const).map((label) => {
                      const isAll = label === 'Tout';
                      const disabled = isAll
                        ? validatedCount === totalHighlights
                        : validatedCount === 0;
                      return (
                        <TouchableOpacity
                          key={label}
                          onPress={() => handleToggleAll(isAll)}
                          disabled={disabled}
                          className="px-2 py-1 rounded"
                          style={{
                            backgroundColor: '#27272a',
                            opacity: disabled ? 0.3 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {/* Progress bar */}
                <View className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${progressPct}%`, backgroundColor: '#a855f7' }}
                  />
                </View>
              </View>

              {/* Category filters - horizontal scroll, minimal height */}
              <CategoryFilterChips
                selectedCategories={selectedCategories}
                categoryCounts={categoryCounts}
                onToggle={handleToggleCategory}
              />

              {/* Add highlight button */}
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="mx-4 mt-3 flex-row items-center justify-center gap-2 py-3 rounded-xl"
                style={{
                  backgroundColor: '#27272a',
                  borderWidth: 1,
                  borderColor: '#3f3f46',
                  borderStyle: 'dashed',
                }}
              >
                <Plus size={18} color="#a855f7" />
                <Text className="text-purple-400 font-medium">Ajouter un point</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-zinc-500">Aucun point dans cette categorie</Text>
            </View>
          }
        />

        {/* ── Footer sticky ── */}
        <View
          className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black"
          style={{ borderTopWidth: 1, borderTopColor: '#27272a' }}
        >
          <TouchableOpacity
            onPress={handleValidate}
            disabled={validating || validatedCount === 0}
            className="w-full flex-row items-center justify-center gap-2 py-3 rounded-xl"
            style={{
              backgroundColor: footerBg,
              opacity: validatedCount === 0 && !isSaved ? 0.6 : 1,
            }}
          >
            {validating ? (
              <>
                <SpinningLoader size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '500' }}>Chargement...</Text>
              </>
            ) : isSaved ? (
              <>
                <Trash2 size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '500' }}>Retirer de ma collection</Text>
              </>
            ) : validatedCount === 0 ? (
              <Text style={{ color: '#fff', fontWeight: '500' }}>Selectionne au moins un point</Text>
            ) : (
              <>
                <Check size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '500' }}>
                  Sauvegarder {validatedCount} point{validatedCount > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Add Highlight Modal ── */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddModal(false)}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View
              className="bg-zinc-900 rounded-t-3xl p-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-white">Ajouter un point</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-2">
                  <X size={20} color="#71717a" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View className="gap-4">
                {/* Name */}
                <View>
                  <Text className="text-xs text-zinc-500 uppercase mb-1">Nom *</Text>
                  <TextInput
                    value={newHighlight.name}
                    onChangeText={(v) => setNewHighlight((f) => ({ ...f, name: v }))}
                    placeholder="Ex: Tour Eiffel, Cafe de Flore..."
                    placeholderTextColor="#52525b"
                    className="rounded-lg px-3 py-3 text-white"
                    style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
                  />
                </View>

                {/* Category */}
                <View>
                  <Text className="text-xs text-zinc-500 uppercase mb-1">Catégorie</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).map((cat) => {
                        const isSelected = newHighlight.category === cat;
                        const catColor = CATEGORY_COLORS[cat];
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => setNewHighlight((f) => ({ ...f, category: cat }))}
                            className="px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor: isSelected ? `${catColor}33` : '#27272a',
                              borderWidth: 1,
                              borderColor: isSelected ? `${catColor}4D` : '#3f3f46',
                            }}
                          >
                            <Text style={{ fontSize: 13, color: isSelected ? catColor : '#a1a1aa' }}>
                              {HIGHLIGHT_CATEGORIES[cat].label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Address */}
                <View>
                  <Text className="text-xs text-zinc-500 uppercase mb-1">Adresse</Text>
                  <TextInput
                    value={newHighlight.address ?? ''}
                    onChangeText={(v) => setNewHighlight((f) => ({ ...f, address: v }))}
                    placeholder="Optionnel"
                    placeholderTextColor="#52525b"
                    className="rounded-lg px-3 py-3 text-white"
                    style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
                  />
                </View>

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleAddHighlight}
                  disabled={addingHighlight || !newHighlight.name.trim()}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl mt-2"
                  style={{
                    backgroundColor: '#a855f7',
                    opacity: !newHighlight.name.trim() ? 0.5 : 1,
                  }}
                >
                  {addingHighlight ? (
                    <SpinningLoader size={16} color="#fff" />
                  ) : (
                    <Plus size={18} color="#fff" />
                  )}
                  <Text className="text-white font-medium">Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}
