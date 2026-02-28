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
  TextInput,
  Modal,
  Alert,
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
  Smartphone,
  Package,
  Shield,
  AlertTriangle,
  Plus,
  X,
  Save,
} from 'lucide-react-native';
import { getCity } from '@/services/cityService';
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
  type CreateHighlightPayload,
  type HighlightUpdatePayload,
} from '@/services/cityReviewService';
import { CityData, Highlight, HighlightCategory, PracticalInfo, HIGHLIGHT_CATEGORIES } from '@/types/api';
import { CategoryFilterChips, CATEGORY_COLORS } from '@/components/city/CategoryFilterChips';
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
  const insets = useSafeAreaInsets();

  const [city, setCity] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('highlights');
  const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);

  // Add highlight state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingHighlight, setAddingHighlight] = useState(false);
  const [newHighlight, setNewHighlight] = useState<CreateHighlightPayload>({
    name: '',
    category: 'other',
    address: '',
  });

  // Edit highlight state
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<HighlightUpdatePayload>({});

  // Load city data
  useEffect(() => {
    if (!cityId) return;

    const loadCity = async () => {
      try {
        const data = await getCity(cityId);
        setCity(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCity();
  }, [cityId]);

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
        const existingHighlights = prev.city_highlights || prev.highlights || [];
        return {
          ...prev,
          city_highlights: [...existingHighlights, created],
          highlights: [...existingHighlights, created],
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
    setShowEditModal(true);
  }, []);

  // Save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editingHighlight) return;

    setSavingEdit(true);
    try {
      await updateHighlight(editingHighlight.id, editForm);
      // Update local state
      setCity((prev) => {
        if (!prev) return prev;
        const updateHighlights = (highlights: Highlight[]) =>
          highlights.map((h) => (h.id === editingHighlight.id ? { ...h, ...editForm } : h));
        return {
          ...prev,
          city_highlights: updateHighlights(prev.city_highlights || []),
          highlights: updateHighlights(prev.highlights || []),
        };
      });
      setShowEditModal(false);
      setEditingHighlight(null);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de modifier le point');
    } finally {
      setSavingEdit(false);
    }
  }, [editingHighlight, editForm]);

  // Delete highlight
  const handleDeleteHighlight = useCallback(async (highlightId: string) => {
    try {
      await deleteHighlight(highlightId);
      // Remove from local state
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
      Alert.alert('Erreur', err.message || 'Impossible de supprimer le point');
    }
  }, []);

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
        {/* Top row: Back */}
        <View className="flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/trips')}
            className="flex-row items-center gap-1"
          >
            <ChevronLeft size={24} color="#fff" />
            <Text className="text-white">Back</Text>
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
            onAddHighlight={() => setShowAddModal(true)}
            onEditHighlight={handleOpenEdit}
            onDeleteHighlight={handleDeleteHighlight}
          />
        )}
        {activeTab === 'budget' && budget && <BudgetTab budget={budget} />}
        {activeTab === 'practical' && practicalInfo && (
          <PracticalTab info={practicalInfo} />
        )}
      </ScrollView>

      {/* Add Highlight Modal */}
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

      {/* Edit Highlight Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <ScrollView
            className="bg-zinc-900 rounded-t-3xl"
            style={{ maxHeight: '80%' }}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-white">Modifier le point</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} className="p-2">
                <X size={20} color="#71717a" />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View className="gap-4">
              {/* Name */}
              <View>
                <Text className="text-xs text-zinc-500 uppercase mb-1">Nom *</Text>
                <TextInput
                  value={editForm.name ?? ''}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, name: v }))}
                  placeholder="Nom du point"
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
                      const isSelected = editForm.category === cat;
                      const catColor = CATEGORY_COLORS[cat];
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setEditForm((f) => ({ ...f, category: cat }))}
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

              {/* Subtype */}
              <View>
                <Text className="text-xs text-zinc-500 uppercase mb-1">Sous-type</Text>
                <TextInput
                  value={editForm.subtype ?? ''}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, subtype: v || undefined }))}
                  placeholder="Ex: Restaurant italien..."
                  placeholderTextColor="#52525b"
                  className="rounded-lg px-3 py-3 text-white"
                  style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
                />
              </View>

              {/* Address */}
              <View>
                <Text className="text-xs text-zinc-500 uppercase mb-1">Adresse</Text>
                <TextInput
                  value={editForm.address ?? ''}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, address: v || undefined }))}
                  placeholder="Optionnel"
                  placeholderTextColor="#52525b"
                  className="rounded-lg px-3 py-3 text-white"
                  style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
                />
              </View>

              {/* Description */}
              <View>
                <Text className="text-xs text-zinc-500 uppercase mb-1">Description</Text>
                <TextInput
                  value={editForm.description ?? ''}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, description: v || undefined }))}
                  placeholder="Optionnel"
                  placeholderTextColor="#52525b"
                  multiline
                  numberOfLines={3}
                  className="rounded-lg px-3 py-3 text-white"
                  style={{
                    backgroundColor: '#27272a',
                    borderWidth: 1,
                    borderColor: '#3f3f46',
                    textAlignVertical: 'top',
                    minHeight: 80,
                  }}
                />
              </View>

              {/* Tips */}
              <View>
                <Text className="text-xs text-zinc-500 uppercase mb-1">Conseils</Text>
                <TextInput
                  value={editForm.tips ?? ''}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, tips: v || undefined }))}
                  placeholder="Optionnel"
                  placeholderTextColor="#52525b"
                  multiline
                  numberOfLines={2}
                  className="rounded-lg px-3 py-3 text-white"
                  style={{
                    backgroundColor: '#27272a',
                    borderWidth: 1,
                    borderColor: '#3f3f46',
                    textAlignVertical: 'top',
                    minHeight: 60,
                  }}
                />
              </View>

              {/* Must-see toggle */}
              <TouchableOpacity
                onPress={() => setEditForm((f) => ({ ...f, is_must_see: !f.is_must_see }))}
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg self-start"
                style={{
                  backgroundColor: editForm.is_must_see ? '#eab3081A' : '#27272a',
                  borderWidth: 1,
                  borderColor: editForm.is_must_see ? '#eab3084D' : '#3f3f46',
                }}
              >
                <Star
                  size={14}
                  color={editForm.is_must_see ? '#facc15' : '#71717a'}
                  fill={editForm.is_must_see ? '#facc15' : 'none'}
                />
                <Text style={{ fontSize: 12, color: editForm.is_must_see ? '#fde68a' : '#71717a' }}>
                  Incontournable
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={savingEdit || !editForm.name?.trim()}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl mt-2"
                style={{
                  backgroundColor: '#a855f7',
                  opacity: !editForm.name?.trim() ? 0.5 : 1,
                }}
              >
                {savingEdit ? (
                  <SpinningLoader size={16} color="#fff" />
                ) : (
                  <Save size={18} color="#fff" />
                )}
                <Text className="text-white font-medium">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  onAddHighlight,
  onEditHighlight,
  onDeleteHighlight,
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
  onAddHighlight: () => void;
  onEditHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: string) => void;
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
          <HighlightCard
            key={highlight.id}
            highlight={highlight}
            editable
            onEdit={() => onEditHighlight(highlight)}
            onDelete={() => onDeleteHighlight(highlight.id)}
          />
        ))}

        {highlights.length === 0 && (
          <View className="py-8 items-center">
            <Text className="text-zinc-500">No highlights in this category</Text>
          </View>
        )}

        {/* Add highlight button */}
        <TouchableOpacity
          onPress={onAddHighlight}
          className="flex-row items-center justify-center gap-2 py-3 rounded-xl mt-2"
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
