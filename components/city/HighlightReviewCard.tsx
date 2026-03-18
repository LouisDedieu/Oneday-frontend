/**
 * HighlightReviewCard - Editable highlight card for review mode
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import { Highlight, HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';
import type { HighlightUpdatePayload } from '@/services/cityReviewService';
import { SecondaryButton } from '@/components/SecondaryButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import Loader from '@/components/Loader';

const PRICE_OPTIONS = ['gratuit', '€', '€€', '€€€', '€€€€'] as const;

const PRICE_COLORS: Record<string, string> = {
  gratuit: '#4ade80',
  '€': '#4ade80',
  '€€': '#facc15',
  '€€€': '#f97316',
  '€€€€': '#ef4444',
};

const getPriceLabel = (price: string, t: (key: string) => string): string => {
  switch (price) {
    case 'gratuit': return t('spotReview.free');
    case '€': return t('spotReview.budget');
    case '€€': return t('spotReview.moderate');
    case '€€€': return t('spotReview.expensive');
    case '€€€€': return t('spotReview.luxury');
    default: return price;
  }
};

const CATEGORY_ICONS: Record<HighlightCategory, string> = {
  food: 'restaurant-line',
  culture: 'landscape-line',
  nature: 'leaf-line',
  shopping: 'shopping-bag-3-line',
  nightlife: 'moon-clear-line',
  other: 'map-pin-line',
};

const getCategoryLabel = (cat: HighlightCategory, t: (key: string) => string): string => {
  switch (cat) {
    case 'food': return t('spotReview.restaurant');
    case 'culture': return t('spotReview.attraction');
    case 'nature': return t('spotReview.activity');
    case 'shopping': return t('spotReview.shopping');
    case 'nightlife': return t('spotReview.bar');
    case 'other': return t('spotReview.other');
    default: return cat;
  }
};

const CATEGORY_TO_COLOR_SCHEME: Record<HighlightCategory, 'default' | 'restaurant' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'location' | 'mustsee'> = {
  food: 'restaurant',
  culture: 'culture',
  nature: 'nature',
  shopping: 'shopping',
  nightlife: 'nightlife',
  other: 'default',
};

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
  const { t } = useTranslation();
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
  const categoryIcon = CATEGORY_ICONS[category];
  const categoryColor = HIGHLIGHT_CATEGORIES[category].color;
  const included = highlight.validated !== false;

  // Glassmorphism styling
  const cardBg = included ? '#1e1a64' : '#1e1a644D';
  const cardBorder = included ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';

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
          <View style={{ width: 3, backgroundColor: included ? categoryColor : 'transparent' }} />

          <View className="flex-1 p-3">
            <View className="flex-row items-start gap-3">
              {/* Drag handle */}
              {drag && (
                <TouchableOpacity
                  onLongPress={drag}
                  delayLongPress={100}
                  className="my-auto"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="draggable" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}

              {/* Category Icon */}
              <View
                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                style={{ backgroundColor: included ? `${categoryColor}22` : 'rgba(255,255,255,0.05)' }}
              >
                <Icon name={categoryIcon as any} size={20} color={included ? categoryColor : 'rgba(255,255,255,0.3)'} />
              </View>

              {/* Content */}
              <View className="flex-min-width">
                {/* Header: Name + Must-see */}
                <View className="row-center">
                  <Text
                    className="font-semibold flex-1"
                    numberOfLines={1}
                    style={{
                      color: included ? '#FAFAFF' : 'rgba(255,255,255,0.3)',
                      textDecorationLine: included ? 'none' : 'line-through',
                    }}
                  >
                    {highlight.name}
                  </Text>
                  {highlight.is_must_see && included && (
                    <View className="flex-row items-center gap-1 bg-yellow-500/20 pill-small">
                      <Icon name="star-fill" size={10} color="#facc15" />
                      <Text className="text-yellow-400 text-xs">{t('highlightReview.mustSee')}</Text>
                    </View>
                  )}
                </View>

                {/* Subtype + price */}
                <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                  {highlight.subtype && (
                    <View
                      className="pill-small"
                      style={{ backgroundColor: included ? `${categoryColor}22` : 'rgba(255,255,255,0.05)' }}
                    >
                      <Text style={{ color: included ? categoryColor : 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {highlight.subtype}
                      </Text>
                    </View>
                  )}
                  {highlight.price_range && included && (
                    <Text
                      className="text-sm font-medium"
                      style={{ color: PRICE_COLORS[highlight.price_range] || 'rgba(255,255,255,0.5)' }}
                    >
                      {highlight.price_range}
                    </Text>
                  )}
                </View>

                {/* Address */}
                {highlight.address && included && (
                  <Text className="text-xs text-white/50 mt-1" numberOfLines={1}>
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
                <SecondaryButton
                  title={included ? t('highlightReview.included') : t('highlightReview.excluded')}
                  active={included}
                  variant="pill"
                  size="sm"
                  leftIcon={included ? 'check-line' : 'close-line'}
                  onPress={() => onValidatedChange(!included)}
                />

                {/* Edit button */}
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(true);
                    setConfirmDel(false);
                  }}
                  className="p-1.5"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="pencil-fill" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {/* Delete button */}
                {confirmDel ? (
                  <View className="flex-row items-center gap-1">
                    <PrimaryButton
                      title={t('highlightReview.delete')}
                      size="sm"
                      color="purple"
                      onPress={onDelete}
                    />
                    <SecondaryButton
                      title=""
                      variant="pill"
                      size="sm"
                      leftIcon="close-line"
                      onPress={() => setConfirmDel(false)}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setConfirmDel(true)}
                    className="p-1.5"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="delete-bin-2-fill" size={14} color="rgba(255,144,144,0.4)" />
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
      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1e1a64' }}
    >
      {/* Name */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.name')}
        </Text>
        <TextInput
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      {/* Category */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.category')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-1"
          contentContainerStyle={{ gap: 6 }}
        >
          {(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]).map((cat) => {
            const catIcon = CATEGORY_ICONS[cat];
            const isSelected = form.category === cat;
            return (
              <SecondaryButton
                key={cat}
                title={getCategoryLabel(cat, t)}
                active={isSelected}
                variant="pill"
                size="sm"
                leftIcon={catIcon as any}
                colorScheme={CATEGORY_TO_COLOR_SCHEME[cat]}
                onPress={() => setForm((f) => ({ ...f, category: cat }))}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Subtype */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.subtype')}
        </Text>
        <TextInput
          value={form.subtype ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, subtype: v || undefined }))}
          placeholder={t('highlightReview.subtypePlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        />
      </View>

      {/* Price */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.price')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-1"
          contentContainerStyle={{ gap: 6 }}
        >
          {PRICE_OPTIONS.map((p) => {
            const isSelected = form.price_range === p;
            return (
              <SecondaryButton
                key={p}
                title={getPriceLabel(p, t)}
                active={isSelected}
                variant="pill"
                size="sm"
                onPress={() => setForm((f) => ({ ...f, price_range: p }))}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Address */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('spotReview.address')}
        </Text>
        <TextInput
          value={form.address ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, address: v || undefined }))}
          placeholder={t('highlightReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        />
      </View>

      {/* Description */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.description')}
        </Text>
        <TextInput
          value={form.description ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v || undefined }))}
          placeholder={t('highlightReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={2}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            textAlignVertical: 'top',
            minHeight: 60,
          }}
        />
      </View>

      {/* Tips */}
      <View>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('highlightReview.tips')}
        </Text>
        <TextInput
          value={form.tips ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, tips: v || undefined }))}
          placeholder={t('highlightReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={2}
          className="mt-1 rounded-lg px-3 py-2 text-sm text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            textAlignVertical: 'top',
            minHeight: 60,
          }}
        />
      </View>

      {/* Must-see toggle */}
      <SecondaryButton
        title={t('highlightReview.mustSeeLabel')}
        active={form.is_must_see}
        variant="pill"
        size="sm"
        colorScheme="mustsee"
        leftIcon={form.is_must_see ? 'star-fill' : 'star-line'}
        onPress={() => setForm((f) => ({ ...f, is_must_see: !f.is_must_see }))}
      />

      {/* Actions */}
      <View className="flex-row justify-around gap-2 pt-2 w-full">
        <PrimaryButton
          title={t('highlightReview.save')}
          leftIcon="save-line"
          onPress={handleSave}
          loading={saving}
          size="sm"
          fullWidth={true}
          style={{flexGrow: 0.7}}
        />
        <SecondaryButton
          title={t('highlightReview.cancel')}
          variant="square"
          onPress={() => setIsEditing(false)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
