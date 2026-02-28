/**
 * HighlightReviewCard - Editable highlight card for review mode
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import {
  Utensils,
  Landmark,
  Trees,
  ShoppingBag,
  Moon,
  MapPin,
  Star,
  Pencil,
  Trash2,
  X,
  Save,
  Check,
  GripVertical,
  Loader2,
} from 'lucide-react-native';
import { Highlight, HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';
import type { HighlightUpdatePayload } from '@/services/cityReviewService';

const CATEGORY_ICONS: Record<HighlightCategory, React.ComponentType<any>> = {
  food: Utensils,
  culture: Landmark,
  nature: Trees,
  shopping: ShoppingBag,
  nightlife: Moon,
  other: MapPin,
};

const CATEGORY_COLORS: Record<HighlightCategory, string> = {
  food: '#f97316',
  culture: '#3b82f6',
  nature: '#22c55e',
  shopping: '#ec4899',
  nightlife: '#a855f7',
  other: '#71717a',
};

const PRICE_OPTIONS = ['gratuit', '€', '€€', '€€€', '€€€€'] as const;

const PRICE_COLORS: Record<string, string> = {
  gratuit: '#4ade80',
  '€': '#4ade80',
  '€€': '#facc15',
  '€€€': '#f97316',
  '€€€€': '#ef4444',
};

function SpinningLoader({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

interface HighlightReviewCardProps {
  highlight: Highlight;
  onUpdate: (payload: HighlightUpdatePayload) => Promise<void>;
  onDelete: () => void;
  onValidatedChange: (validated: boolean) => void;
  isDragging?: boolean;
  drag?: () => void;
}

export function HighlightReviewCard({
  highlight,
  onUpdate,
  onDelete,
  onValidatedChange,
  isDragging,
  drag,
}: HighlightReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<HighlightUpdatePayload>({
    name: highlight.name,
    category: highlight.category,
    subtype: highlight.subtype,
    address: highlight.address,
    description: highlight.description,
    price_range: highlight.price_range,
    tips: highlight.tips,
    is_must_see: highlight.is_must_see,
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({
        name: highlight.name,
        category: highlight.category,
        subtype: highlight.subtype,
        address: highlight.address,
        description: highlight.description,
        price_range: highlight.price_range,
        tips: highlight.tips,
        is_must_see: highlight.is_must_see,
      });
    }
  }, [highlight, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(form);
    setSaving(false);
    setIsEditing(false);
  };

  const category = highlight.category || 'other';
  const Icon = CATEGORY_ICONS[category];
  const color = CATEGORY_COLORS[category];
  const included = highlight.validated !== false;

  // Styling based on included state
  const cardBg = included ? '#18181b' : '#18181b4D';
  const cardBorder = included ? '#27272a' : '#27272a66';

  if (!isEditing) {
    return (
      <View
        className="rounded-xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: cardBorder,
          backgroundColor: cardBg,
          opacity: isDragging ? 0.8 : 1,
        }}
      >
        <View className="flex-row">
          {/* Category colored bar */}
          <View style={{ width: 3, backgroundColor: included ? color : 'transparent' }} />

          <View className="flex-1 p-3">
            <View className="flex-row items-start gap-3">
              {/* Drag handle */}
              {drag && (
                <TouchableOpacity
                  onLongPress={drag}
                  delayLongPress={100}
                  className="pt-0.5"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <GripVertical size={16} color="#52525b" />
                </TouchableOpacity>
              )}

              {/* Category Icon */}
              <View
                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                style={{ backgroundColor: included ? `${color}22` : '#27272a66' }}
              >
                <Icon size={20} color={included ? color : '#52525b'} />
              </View>

              {/* Content */}
              <View className="flex-1 min-w-0">
                {/* Header: Name + Must-see */}
                <View className="flex-row items-center gap-2">
                  <Text
                    className="font-semibold flex-1"
                    numberOfLines={1}
                    style={{
                      color: included ? '#fff' : '#52525b',
                      textDecorationLine: included ? 'none' : 'line-through',
                    }}
                  >
                    {highlight.name}
                  </Text>
                  {highlight.is_must_see && included && (
                    <View className="flex-row items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                      <Star size={10} color="#facc15" fill="#facc15" />
                      <Text className="text-yellow-400 text-xs">Must-see</Text>
                    </View>
                  )}
                </View>

                {/* Subtype + price */}
                <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                  {highlight.subtype && (
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: included ? `${color}22` : '#27272a66' }}
                    >
                      <Text style={{ color: included ? color : '#52525b', fontSize: 11 }}>
                        {highlight.subtype}
                      </Text>
                    </View>
                  )}
                  {highlight.price_range && included && (
                    <Text
                      className="text-sm font-medium"
                      style={{ color: PRICE_COLORS[highlight.price_range] || '#71717a' }}
                    >
                      {highlight.price_range}
                    </Text>
                  )}
                </View>

                {/* Address */}
                {highlight.address && included && (
                  <Text className="text-xs text-zinc-500 mt-1" numberOfLines={1}>
                    {highlight.address}
                  </Text>
                )}

                {/* Tips */}
                {highlight.tips && included && (
                  <Text className="text-xs text-blue-400 italic mt-1" numberOfLines={2}>
                    {highlight.tips}
                  </Text>
                )}
              </View>

              {/* Actions */}
              <View className="flex-row items-center gap-1 flex-shrink-0">
                {/* Include/Exclude toggle */}
                <TouchableOpacity
                  onPress={() => onValidatedChange(!included)}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: included ? `${color}26` : '#27272acc',
                    borderWidth: 1,
                    borderColor: included ? `${color}4D` : '#3f3f46',
                  }}
                >
                  {included ? (
                    <Check size={10} color={color} />
                  ) : (
                    <X size={10} color="#71717a" />
                  )}
                  <Text style={{ fontSize: 10, color: included ? color : '#71717a' }}>
                    {included ? 'Inclus' : 'Exclu'}
                  </Text>
                </TouchableOpacity>

                {/* Edit button */}
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(true);
                    setConfirmDel(false);
                  }}
                  className="p-1.5"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Pencil size={14} color="#71717a" />
                </TouchableOpacity>

                {/* Delete button */}
                {confirmDel ? (
                  <View className="flex-row items-center gap-1">
                    <TouchableOpacity
                      onPress={onDelete}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      <Text style={{ fontSize: 10, color: '#fff' }}>Suppr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setConfirmDel(false)} className="p-1">
                      <X size={12} color="#71717a" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setConfirmDel(true)}
                    className="p-1.5"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color="#71717a" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <View
      className="rounded-xl p-4 gap-3"
      style={{ borderWidth: 1, borderColor: '#3b82f64D', backgroundColor: '#18181b' }}
    >
      {/* Name */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Nom
        </Text>
        <TextInput
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
          placeholderTextColor="#71717a"
        />
      </View>

      {/* Category */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Categorie
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-1"
          contentContainerStyle={{ gap: 6 }}
        >
          {(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).map((cat) => {
            const CatIcon = CATEGORY_ICONS[cat];
            const catColor = CATEGORY_COLORS[cat];
            const isSelected = form.category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setForm((f) => ({ ...f, category: cat }))}
                className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: isSelected ? `${catColor}33` : '#27272a',
                  borderWidth: 1,
                  borderColor: isSelected ? `${catColor}4D` : '#3f3f46',
                }}
              >
                <CatIcon size={14} color={isSelected ? catColor : '#71717a'} />
                <Text style={{ fontSize: 12, color: isSelected ? catColor : '#a1a1aa' }}>
                  {HIGHLIGHT_CATEGORIES[cat].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Subtype */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Sous-type
        </Text>
        <TextInput
          value={form.subtype ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, subtype: v || undefined }))}
          placeholder="Ex: Restaurant italien, Musee d'art..."
          placeholderTextColor="#52525b"
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
        />
      </View>

      {/* Price */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Prix
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-1"
          contentContainerStyle={{ gap: 6 }}
        >
          {PRICE_OPTIONS.map((p) => {
            const isSelected = form.price_range === p;
            const priceColor = PRICE_COLORS[p];
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setForm((f) => ({ ...f, price_range: p }))}
                className="px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: isSelected ? `${priceColor}33` : '#27272a',
                  borderWidth: 1,
                  borderColor: isSelected ? `${priceColor}4D` : '#3f3f46',
                }}
              >
                <Text style={{ fontSize: 12, color: isSelected ? priceColor : '#a1a1aa' }}>
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Address */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Adresse
        </Text>
        <TextInput
          value={form.address ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, address: v || undefined }))}
          placeholder="Optionnel"
          placeholderTextColor="#52525b"
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
        />
      </View>

      {/* Description */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Description
        </Text>
        <TextInput
          value={form.description ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v || undefined }))}
          placeholder="Optionnel"
          placeholderTextColor="#52525b"
          multiline
          numberOfLines={2}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{
            backgroundColor: '#27272a',
            borderWidth: 1,
            borderColor: '#3f3f46',
            textAlignVertical: 'top',
            minHeight: 60,
          }}
        />
      </View>

      {/* Tips */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Conseil
        </Text>
        <TextInput
          value={form.tips ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, tips: v || undefined }))}
          placeholder="Optionnel"
          placeholderTextColor="#52525b"
          multiline
          numberOfLines={2}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
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
        onPress={() => setForm((f) => ({ ...f, is_must_see: !f.is_must_see }))}
        className="flex-row items-center gap-2 px-3 py-2 rounded-lg self-start"
        style={{
          backgroundColor: form.is_must_see ? '#eab3081A' : '#27272a',
          borderWidth: 1,
          borderColor: form.is_must_see ? '#eab3084D' : '#3f3f46',
        }}
      >
        <Star
          size={14}
          color={form.is_must_see ? '#facc15' : '#71717a'}
          fill={form.is_must_see ? '#facc15' : 'none'}
        />
        <Text style={{ fontSize: 12, color: form.is_must_see ? '#fde68a' : '#71717a' }}>
          Incontournable
        </Text>
      </TouchableOpacity>

      {/* Actions */}
      <View className="flex-row gap-2 pt-2">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg"
          style={{ backgroundColor: '#2563eb' }}
        >
          {saving ? <SpinningLoader size={14} color="#fff" /> : <Save size={14} color="#fff" />}
          <Text style={{ fontSize: 13, color: '#fff', fontWeight: '500' }}>Enregistrer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsEditing(false)}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: '#27272a' }}
        >
          <X size={14} color="#a1a1aa" />
          <Text style={{ fontSize: 13, color: '#a1a1aa' }}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
