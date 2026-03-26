/**
 * app/review/city/[cityId].tsx
 * Route: /review/city/:cityId
 * City review page with drag & drop highlight reordering
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isCitySaved, saveCity, unsaveCity, checkCityMatch, mergeCities } from '@/services/cityService';
import { markNotificationsReadByEntity } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCityForEdit,
  updateHighlight,
  deleteHighlight,
  reorderHighlights,
  syncCityData,
  setHighlightValidated,
  createHighlight,
  deleteCity,
  isNotTravelCity,
  type DbCity,
  type HighlightUpdatePayload,
  type CreateHighlightPayload,
} from '@/services/cityReviewService';
import { deleteInboxJob, findJobByEntityId } from '@/services/inboxService';
import { Highlight, HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';
import { HighlightReviewCard } from '@/components/city/HighlightReviewCard';
import { Button } from '@/components/Button';
import {PrimaryButton} from "@/components/PrimaryButton";
import {SecondaryButton} from "@/components/SecondaryButton";
import Loader from "@/components/Loader";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CityReviewPage() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
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
    // Marquer les notifications liées comme lues
    markNotificationsReadByEntity('city', cityId);
    fetchCityForEdit(cityId).then((c) => {
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
        if (cityId) fetchCityForEdit(cityId).then((c) => c && setCity(c));
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
        if (cityId) fetchCityForEdit(cityId).then((c) => c && setCity(c));
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
        fetchCityForEdit(cityId).then((c) => c && setCity(c));
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
      Alert.alert(t('cityReview.noPointToMerge'));
      return;
    }

    setMerging(true);
    try {
      const result = await mergeCities(existingMatch.city_id, cityId, validatedIds, true);
      console.log('[Merge] Result:', result);
      Alert.alert(
        t('cityReview.mergeCompleteTitle'),
        t('cityReview.pointsAdded', { count: result.highlights_merged, plural: result.highlights_merged > 1 ? 's' : '', city: existingMatch.city_name }),
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/trips'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('cityReview.error'), err.message);
    } finally {
      setMerging(false);
    }
  }, [existingMatch, cityId, city, router, t]);

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
      Alert.alert(t('cityReview.error'), err.message || t('cityReview.error'));
    } finally {
      setAddingHighlight(false);
    }
  }, [cityId, newHighlight, t]);

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
        router.replace('/(tabs)/trips');
      }
    } catch (err: any) {
      Alert.alert(t('cityReview.error'), err.message);
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
      <View className="center-content">
        <Loader size={32} color="#60a5fa" />
      </View>
    );
  }

  if (!city) {
    return (
      <View className="center-content gap-4">
        <Text className="text-body-muted">{t('review.cityNotFound')}</Text>
        <Button onPress={() => router.navigate('/(tabs)')}>{t('review.back')}</Button>
      </View>
    );
  }

  if (isNotTravelCity(city)) {
    const handleBackAndDelete = async () => {
      try {
        const job = await findJobByEntityId('city', city.id);
        if (job) {
          await deleteInboxJob(job.jobId);
        }
        await deleteCity(city.id);
      } catch (err) {
        console.warn('Failed to delete city (may already be deleted):', err);
      }
      router.replace('/(tabs)');
    };

    return (
      <View className="flex-1" style={{ backgroundColor: '#0F0E23' }}>
        <View
          className="flex-1 center-content px-8"
          style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
        >
          <View className="bg-surface-secondary rounded-full p-6 mb-6">
            <View className="relative">
              <Icon name="global-line" size={64} color="#8C92B5" />
              <View className="absolute -top-1 -right-1">
                <Icon name="close-line" size={24} color="#ef4444" />
              </View>
            </View>
          </View>
          <Text className="text-title text-center text-text-primary font-righteous mb-3">
            {t('notTravel.title')}
          </Text>
          <Text className="text-body text-center text-text-secondary mb-8">
            {t('notTravel.subtitle')}
          </Text>
          <PrimaryButton
            title={t('notTravel.back')}
            onPress={handleBackAndDelete}
            leftIcon="arrow-left-line"
          />
        </View>
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0)' }}>
      <View className="flex-1">
        {/* ── Header ── */}
        <View
          className="bg-surface-secondary px-4 py-4"
          style={{
            paddingTop: insets.top + 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.navigate('/(tabs)')} style={{ padding: 8 }}>
              <View pointerEvents="none">
                <Icon name={'arrow-left-s-line'} size={24} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
            <View className="flex-min-width">
              <Text className="title-lg-bold" numberOfLines={1}>
                {city.city_title}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Icon name={'map-pin-2-line'} size={12} color="#a855f7" />
                <Text className="text-sm text-body-muted">
                  {city.city_name}, {city.country} · {totalHighlights} {t('cityReview.points')}
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
                    backgroundColor: 'rgba(168,85,247,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.3)',
                  }}
                >
                  <View className="row-center">
                    <Icon name={'merge-cells-horizontal'} size={18} color="#a855f7" />
                    <View className="flex-1">
                      <Text className="text-sm text-purple-300 font-dmsans-medium">
                        {existingMatch.city_name} {t('cityReview.alreadyExists')}
                      </Text>
                      <Text className="text-xs text-purple-400 mt-0.5 font-dmsans">
                        {existingMatch.highlights_count} {t('cityReview.existing')} · {t('cityReview.addPoints', { count: validatedCount, plural: validatedCount > 1 ? 's' : '' })}
                      </Text>
                    </View>
                    <PrimaryButton
                      title={merging ? '' : t('cityReview.merge')}
                      leftIcon={merging ? undefined : 'share-forward-line'}
                      onPress={handleMerge}
                      loading={merging}
                      disabled={validatedCount === 0}
                      size="sm"
                    />
                    <TouchableOpacity
                      onPress={() => setShowMergeBanner(false)}
                      className="p-1"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name={'close-line'} size={16} color="#a855f7" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Selection panel - compact */}
              <View
                className="mx-4 mt-3 bg-surface-secondary rounded-xl p-3"
                style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="row-center">
                    <Text className="text-sm font-medium text-white font-righteous">
                      {validatedCount}/{totalHighlights}
                    </Text>
                    <Text className="label-micro">{t('cityReview.points')}</Text>
                  </View>
                  <View className="flex-row gap-1.5">
                    {([t('cityReview.allPoints'), t('cityReview.noPoints')] as const).map((label) => {
                      const isAll = label === t('cityReview.allPoints');
                      const disabled = isAll
                        ? validatedCount === totalHighlights
                        : validatedCount === 0;
                      return (
                        <SecondaryButton
                          key={label}
                          title={label}
                          active={false}
                          variant="pill"
                          size="sm"
                          onPress={() => handleToggleAll(isAll)}
                          disabled={disabled}
                        />
                      );
                    })}
                  </View>
                </View>
                {/* Progress bar */}
                <View className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${progressPct}%`, backgroundColor: '#a855f7' }}
                  />
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
                style={{ paddingVertical: 8 }}
              >
                {(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).map((cat) => {
                  const count = categoryCounts[cat] || 0;
                  if (count === 0) return null;
                  return (
                    <SecondaryButton
                      key={cat}
                      title={String(count)}
                      active={selectedCategories.includes(cat)}
                      leftIcon={HIGHLIGHT_CATEGORIES[cat].icon}
                      variant="pill"
                      size="sm"
                      colorScheme={cat}
                      onPress={() => handleToggleCategory(cat)}
                    />
                  );
                })}
              </ScrollView>

              {/* Add highlight button */}
              <View className="mx-4 mt-3 my-2">
                <SecondaryButton
                  title={t('cityReview.addPoint')}
                  leftIcon="add-line"
                  onPress={() => setShowAddModal(true)}
                  variant={'square'}
                  style={{ height: 30 }}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-white/50 font-dmsans">{t('cityReview.noPointInCategory')}</Text>
            </View>
          }
        />

        {/* ── Footer sticky ── */}
        <View
          className="absolute left-0 right-0 bottom-0 px-4 py-4 bg-bg-primary"
          style={{ paddingBottom: insets.bottom, borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.1)' }}
        >
          {isSaved ? (
            <PrimaryButton
              title={t('cityReview.removeFromCollection')}
              leftIcon="delete-bin-line"
              onPress={handleValidate}
              loading={validating}
              color="purple"
              fullWidth
            />
          ) : validatedCount === 0 ? (
            <PrimaryButton
              title={t('cityReview.selectAtLeastOnePoint')}
              leftIcon="information-line"
              onPress={() => {}}
              disabled
              fullWidth
            />
          ) : (
            <PrimaryButton
              title={t('cityReview.savePoint', { count: validatedCount, plural: validatedCount > 1 ? 's' : '' })}
              leftIcon="check-line"
              onPress={handleValidate}
              loading={validating}
              fullWidth
            />
          )}
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
              className="bg-surface-secondary rounded-t-3xl p-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="title-lg-bold">{t('cityReview.addPoint')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-2">
                  <Icon name={'close-line'} size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View className="gap-4">
                {/* Name */}
                <View>
                  <Text className="text-xs text-white/50 uppercase mb-1 font-dmsans">{t('cityReview.nameRequired')}</Text>
                  <TextInput
                    value={newHighlight.name}
                    onChangeText={(v) => setNewHighlight((f) => ({ ...f, name: v }))}
                    placeholder={t('cityReview.namePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="rounded-lg px-3 py-3 text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </View>

                {/* Category */}
                <View>
                  <Text className="text-xs text-white/50 uppercase mb-1 font-dmsans">{t('cityReview.category')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).map((cat) => {
                        const isSelected = newHighlight.category === cat;
                        return (
                          <SecondaryButton
                            key={cat}
                            title={HIGHLIGHT_CATEGORIES[cat].label}
                            active={isSelected}
                            variant="pill"
                            size="sm"
                            onPress={() => setNewHighlight((f) => ({ ...f, category: cat }))}
                          />
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Address */}
                <View>
                  <Text className="text-xs text-white/50 uppercase mb-1 font-dmsans">{t('cityReview.address')}</Text>
                  <TextInput
                    value={newHighlight.address ?? ''}
                    onChangeText={(v) => setNewHighlight((f) => ({ ...f, address: v }))}
                    placeholder={t('cityReview.addressOptional')}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="rounded-lg px-3 py-3 text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </View>

                {/* Submit */}
                <PrimaryButton
                  title={t('cityReview.add')}
                  leftIcon={addingHighlight ? undefined : 'add-line'}
                  onPress={handleAddHighlight}
                  loading={addingHighlight}
                  disabled={!newHighlight.name.trim()}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}