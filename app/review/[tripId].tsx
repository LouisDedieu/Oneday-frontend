/**
 * app/review/[tripId].tsx
 * Route : /review/:tripId
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import { isTripSaved, unsaveTrip, validateAndSaveTrip } from '@/services/tripService';
import { markNotificationsReadByEntity } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTripForEdit,
  setDayValidated,
  updateSpot,
  deleteSpot,
} from '@/services/reviewService';
import type { DbTrip, DbDay, DbSpot, SpotUpdatePayload } from '@/services/reviewService';
import { Button } from '@/components/Button';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { AddCityToTripModal } from '@/components/trip/AddCityToTripModal';
import Loader from "@/components/Loader";

// ── Constantes ────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍽️', bar: '🍷', hotel: '🏨',
  attraction: '🏛️', activite: '🎯', activity: '🎯',
  transport: '🚗', shopping: '🛍️', other: '📍',
};

// Map spot_type to SecondaryButton color scheme
const SPOT_TYPE_TO_COLOR: Record<string, 'default' | 'restaurant' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'location' | 'mustsee'> = {
  restaurant: 'restaurant',
  bar: 'nightlife',
  hotel: 'location',
  attraction: 'culture',
  activite: 'default',
  activity: 'default',
  shopping: 'shopping',
  other: 'default',
};

const SPOT_TYPES = [
  'restaurant', 'bar', 'hotel', 'attraction',
  'activite', 'transport', 'shopping', 'other',
] as const;

const PRICE_OPTIONS = ['gratuit', '€', '€€', '€€€', '€€€€'] as const;

const getPriceLabel = (price: string, t: (key: string) => string): string => {
  switch (price) {
    case 'gratuit': return `${t('spotReview.free')}`;
    case '€': return `${price}`;
    case '€€': return `${price}`;
    case '€€€': return `${price}`;
    case '€€€€': return `${price}`;
    default: return price;
  }
};

const getSpotTypeLabel = (type: string, t: (key: string) => string): string => {
  switch (type) {
    case 'restaurant': return `${type_emoji('restaurant')} ${t('spotReview.restaurant')}`;
    case 'bar': return `${type_emoji('bar')} ${t('spotReview.bar')}`;
    case 'hotel': return `${type_emoji('hotel')} ${t('spotReview.hotel')}`;
    case 'attraction': return `${type_emoji('attraction')} ${t('spotReview.attraction')}`;
    case 'activite': return `${type_emoji('activite')} ${t('spotReview.activity')}`;
    case 'activity': return `${type_emoji('activity')} ${t('spotReview.activity')}`;
    case 'transport': return `${type_emoji('transport')} ${t('spotReview.transport')}`;
    case 'shopping': return `${type_emoji('shopping')} ${t('spotReview.shopping')}`;
    case 'other': return `${type_emoji('other')} ${t('spotReview.other')}`;
    default: return type;
  }
};

const type_emoji = (type: string): string => TYPE_EMOJI[type] ?? '📍';

// ── SpotReviewCard ────────────────────────────────────────────────────────────

interface SpotReviewCardProps {
  spot: DbSpot;
  onUpdate: (payload: SpotUpdatePayload) => void;
  onDelete: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function SpotReviewCard({ spot, onUpdate, onDelete, t }: SpotReviewCardProps) {
  const [isEditing,  setIsEditing]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [form, setForm] = useState<SpotUpdatePayload>({
    name: spot.name, spot_type: spot.spot_type, address: spot.address,
    duration_minutes: spot.duration_minutes, price_range: spot.price_range,
    tips: spot.tips, highlight: spot.highlight,
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({
        name: spot.name, spot_type: spot.spot_type, address: spot.address,
        duration_minutes: spot.duration_minutes, price_range: spot.price_range,
        tips: spot.tips, highlight: spot.highlight,
      });
    }
  }, [spot, isEditing]);

  const canOpen = !!(spot.latitude && spot.longitude) || !!spot.address;
  const openMap = () => {
    const url = spot.latitude && spot.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.address ?? '')}`;
    Linking.openURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(form);
    setSaving(false);
    setIsEditing(false);
  };

  // Glassmorphism: highlight → bg-yellow-500/5 border-yellow-500/20, sinon bg-white/10 border-white/10
  const cardBg     = spot.highlight ? 'rgba(234,179,8,0.05)' : 'rgba(255,255,255,0.1)';
  const cardBorder = spot.highlight ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.1)';

  if (!isEditing) {
    return (
      <View className="rounded-lg p-2.5" style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}>
        <View className="flex-row items-start gap-2">
          <Text className="font-dmsans" style={{ fontSize: 16 }}>{TYPE_EMOJI[spot.spot_type ?? ''] ?? '📍'}</Text>
          <View className="flex-min-width">
            {/* Nom + actions */}
            <View className="flex-row items-center justify-between gap-1">
              <View className="flex-row items-center gap-1 flex-min-width">
                <Text className="text-white font-dmsans-semibold text-sm flex-shrink-1" numberOfLines={1}>{spot.name}</Text>
                {spot.highlight && <Icon name={'star-fill'} size={12} color="#facc15" fill="#facc15" />}
              </View>
              <View className="flex-row items-center gap-1 flex-shrink-0">
                {canOpen && (
                  <TouchableOpacity onPress={openMap} className="p-1" hitSlop={4}>
                    <Icon name="navigation-line" size={12} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { setIsEditing(true); setConfirmDel(false); }} className="p-1" hitSlop={4}>
                  <Icon name={'pencil-fill'} size={12} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                {confirmDel ? (
                  <View className="flex-row items-center gap-1">
                    <SecondaryButton
                      title={t('spotReview.confirm')}
                      size="sm"
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
                  <TouchableOpacity onPress={() => setConfirmDel(true)} className="p-1" hitSlop={4}>
                    <Icon name={'delete-bin-2-fill'} size={12} color="rgba(255, 144, 144, 0.4)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {spot.address && (
              <Text className="text-xs text-white/50 mt-0.5 font-dmsans" numberOfLines={1}>{spot.address}</Text>
            )}

            <View className="row-center mt-1 flex-wrap">
              {!!spot.duration_minutes && (
                <View className="flex-row items-center gap-0.5">
                  <Icon name={'time-line'} size={12} color="rgba(255,255,255,0.5)" />
                  <Text className="label-micro">{spot.duration_minutes}{t('spotReview.min')}</Text>
                </View>
              )}
              {spot.price_range && (
                <Text className="text-xs text-green-400 font-dmsans">
                  {getPriceLabel(spot.price_range, t)}
                </Text>
              )}
            </View>

            {spot.tips && (
              <Text className="text-xs text-blue-300 italic mt-1 font-dmsans">💡 {spot.tips}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Mode édition ──────────────────────────────────────────────────────────
  return (
    <View className="rounded-lg p-3 gap-2.5" style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}>

      {/* Nom */}
      <View>
        <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.name')}</Text>
        <TextInput
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      {/* Type + Prix */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.type')}</Text>
          {/* Picker simplifié — ScrollView horizontal des options */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-0.5" contentContainerStyle={{ gap: 4 }}>
            {SPOT_TYPES.map((spotType) => (
              <SecondaryButton
                key={spotType}
                title={getSpotTypeLabel(spotType, t)}
                active={form.spot_type === spotType}
                variant="pill"
                size="sm"
                colorScheme={SPOT_TYPE_TO_COLOR[spotType]}
                onPress={() => setForm((f) => ({ ...f, spot_type: spotType }))}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Prix */}
      <View>
        <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.price')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-0.5" contentContainerStyle={{ gap: 4 }}>
          {PRICE_OPTIONS.map((p) => (
            <SecondaryButton
              key={p}
              title={getPriceLabel(p, t)}
              active={form.price_range === p}
              variant="pill"
              size="sm"
              onPress={() => setForm((f) => ({ ...f, price_range: p }))}
            />
          ))}
        </ScrollView>
      </View>

      {/* Adresse */}
      <View>
        <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.address')}</Text>
        <TextInput
          value={form.address ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, address: v || null }))}
          placeholder={t('spotReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        />
      </View>

      {/* Durée */}
      <View>
        <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.duration')}</Text>
        <TextInput
          value={form.duration_minutes != null ? String(form.duration_minutes) : ''}
          onChangeText={(v) => setForm((f) => ({ ...f, duration_minutes: v ? Number(v) : null }))}
          placeholder={t('spotReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="numeric"
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        />
      </View>

      {/* Conseil */}
      <View>
        <Text className="text-[10px] text-white/50 uppercase tracking-widest font-dmsans" style={{ fontSize: 10 }}>{t('spotReview.tip')}</Text>
        <TextInput
          value={form.tips ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, tips: v || null }))}
          placeholder={t('spotReview.optional')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={2}
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', textAlignVertical: 'top' }}
        />
      </View>

      {/* Highlight toggle */}
      <SecondaryButton
        title={t('spotReview.favorite')}
        active={form.highlight}
        variant="pill"
        size="sm"
        colorScheme="mustsee"
        leftIcon={form.highlight ? 'star-fill' : 'star-line'}
        onPress={() => setForm((f) => ({ ...f, highlight: !f.highlight }))}
      />

      {/* Actions */}
      <View className="flex-row gap-2 pt-1">
        <PrimaryButton
          title={t('spotReview.save')}
          leftIcon="save-line"
          onPress={handleSave}
          loading={saving}
          size="sm"
          fullWidth
        />
        <SecondaryButton
          title={t('spotReview.cancel')}
          variant="pill"
          size="sm"
          onPress={() => setIsEditing(false)}
        />
      </View>
    </View>
  );
}

// ── DayReviewCard ─────────────────────────────────────────────────────────────

interface DayReviewCardProps {
  day: DbDay;
  isExpanded: boolean;
  onToggle: () => void;
  onValidatedChange: (validated: boolean) => void;
  onSpotUpdate: (spotId: string, payload: SpotUpdatePayload) => void;
  onSpotDelete: (spotId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function DayReviewCard({ day, isExpanded, onToggle, onValidatedChange, onSpotUpdate, onSpotDelete, t }: DayReviewCardProps) {
  const included = day.validated;

  // Animation expand/collapse — web: motion.div height 0→auto opacity 0→1
  const heightAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (isExpanded && included) {
      setContentVisible(true);
      Animated.parallel([
        Animated.timing(heightAnim,  { toValue: 1, duration: 220, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(heightAnim,  { toValue: 0, duration: 220, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
      ]).start(() => setContentVisible(false));
    }
  }, [isExpanded, included]);

  // Glassmorphism: included → bg-surface-secondary border-white/10, excluded → bg-surface-secondary/30 border-white/5
  const cardBg     = included ? '#1e1a64' : '#1e1a644D';
  const cardBorder = included ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
  // Barre latérale colorée: accent violet si inclus, transparent sinon
  const barColor   = included ? '#a855f7' : 'transparent';
  // Numéro: bg-white/10 border-white/10 texte white/60, sinon bg-white/5 texte white/30
  const numBg      = included ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
  const numBorder  = included ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
  const numColor   = included ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';

  return (
    <View className="rounded-xl overflow-hidden" style={{ borderWidth: 1, borderColor: cardBorder, backgroundColor: cardBg }}>
      <View className="flex-row">
        {/* Barre latérale colorée */}

        <View className="flex-min-width">
          {/* Header */}
          <View className="flex-row items-center px-3 py-3 gap-3">

            {/* Numéro */}
            <View
              className="w-8 h-8 rounded-full items-center justify-center flex-shrink-0"
              style={{ backgroundColor: numBg, borderWidth: 1, borderColor: numBorder }}
            >
              <Text className="font-righteous" style={{ fontSize: 14, fontWeight: '700', color: numColor }}>{day.day_number}</Text>
            </View>

            {/* Localisation — cliquable pour déplier si inclus */}
            <TouchableOpacity
              onPress={included ? onToggle : undefined}
              disabled={!included}
              className="flex-min-width"
            >
              <Text
                className="font-righteous text-sm"
                numberOfLines={1}
                style={{
                  color: included ? '#FAFAFF' : 'rgba(255,255,255,0.3)',
                  textDecorationLine: included ? 'none' : 'line-through',
                }}
              >
                {day.location ?? t('dayReview.day', { number: day.day_number })}
              </Text>
              {included && day.spots.length > 0 && (
                <Text className="text-xs text-white/70 mt-0.5 font-dmsans">
                  {day.spots.length} {day.spots.length > 1 ? t('dayReview.places') : t('dayReview.place')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Actions droite : toggle pill + chevron */}
            <View className="row-center flex-shrink-0">
              <SecondaryButton
                title={included ? t('dayReview.included') : t('dayReview.include')}
                active={included}
                variant="pill"
                size="sm"
                onPress={() => onValidatedChange(!included)}
                leftIcon={included ? 'check-line' : 'add-line'}
              />

              {included && (
                <TouchableOpacity onPress={onToggle} className="p-0.5" hitSlop={6}>
                  {isExpanded
                    ? <Icon name={'arrow-up-s-line'}   size={16} color="rgba(255,255,255,0.5)" />
                    : <Icon name={'arrow-down-s-line'} size={16} color="rgba(255,255,255,0.5)" />}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Contenu dépliable — web: AnimatePresence + motion.div height 0→auto */}
          {contentVisible && (
            <Animated.View
              style={{ opacity: opacityAnim, overflow: 'hidden' }}
            >
              <View
                className="p-3 gap-2"
                style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}
              >
                {day.spots.length === 0 ? (
                  <Text className="text-xs text-white/70 text-center py-2 italic font-dmsans">
                    {t('dayReview.noPlaceForDay')}
                  </Text>
                ) : (
                  day.spots.map((spot) => (
                    <SpotReviewCard
                      key={spot.id}
                      spot={spot}
                      onUpdate={(payload) => onSpotUpdate(spot.id, payload)}
                      onDelete={() => onSpotDelete(spot.id)}
                      t={t}
                    />
                  ))
                )}

                {/* Repas — web: breakfast/lunch/dinner */}
                {(day.breakfast_spot || day.lunch_spot || day.dinner_spot) && (
                  <View className="pt-2 gap-1" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                    {day.breakfast_spot && <Text className="text-xs text-body-muted">🌅 {day.breakfast_spot}</Text>}
                    {day.lunch_spot     && <Text className="text-xs text-body-muted">☀️ {day.lunch_spot}</Text>}
                    {day.dinner_spot    && <Text className="text-xs text-body-muted">🌙 {day.dinner_spot}</Text>}
                  </View>
                )}

                {/* Hébergement */}
                {day.accommodation_name && (
                  <Text
                    className="text-xs text-white/50 pt-2 font-dmsans"
                    style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}
                  >
                    🏨 {day.accommodation_name}
                  </Text>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ReviewModePage() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [trip,        setTrip]       = useState<DbTrip | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [validating,  setValidating] = useState(false);
  const [isSaved,     setIsSaved]    = useState(false);
  const [expandedDay, setExpandedDay] = useState<number>(0);
  const [showAddCityModal, setShowAddCityModal] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    // Marquer les notifications liées comme lues
    markNotificationsReadByEntity('trip', tripId);
    fetchTripForEdit(tripId).then((t) => {
      setTrip(t);
      setLoading(false);
    });
  }, [tripId]);

  useEffect(() => {
    if (user?.id && tripId) {
      isTripSaved(user.id, tripId).then(setIsSaved).catch(console.error);
    }
  }, [user?.id, tripId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDayValidated = useCallback(async (dayId: string, validated: boolean) => {
    setTrip((prev) => {
      if (!prev) return prev;
      return { ...prev, days: prev.days.map((d) => d.id === dayId ? { ...d, validated } : d) };
    });
    try {
      await setDayValidated(dayId, validated);
    } catch (err: any) {
      setTrip((prev) => {
        if (!prev) return prev;
        return { ...prev, days: prev.days.map((d) => d.id === dayId ? { ...d, validated: !validated } : d) };
      });
    }
  }, []);

  const handleToggleAll = useCallback(async (validated: boolean) => {
    if (!trip) return;
    const prev = trip.days.map((d) => ({ id: d.id, val: d.validated }));
    setTrip((p) => p ? { ...p, days: p.days.map((d) => ({ ...d, validated })) } : p);
    try {
      await Promise.all(prev.map((u) => setDayValidated(u.id, validated)));
    } catch (err: any) {
      setTrip((p) =>
        p ? { ...p, days: p.days.map((d) => ({ ...d, validated: prev.find((u) => u.id === d.id)?.val ?? d.validated })) } : p
      );
    }
  }, [trip]);

  const handleSpotUpdate = useCallback(async (dayId: string, spotId: string, payload: SpotUpdatePayload) => {
    setTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.id !== dayId ? d : { ...d, spots: d.spots.map((s) => s.id === spotId ? { ...s, ...payload } : s) }
        ),
      };
    });
    try {
      await updateSpot(spotId, payload);
    } catch (err: any) {
      if (tripId) fetchTripForEdit(tripId).then((t) => t && setTrip(t));
    }
  }, [tripId]);

  const handleSpotDelete = useCallback(async (dayId: string, spotId: string) => {
    setTrip((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.id !== dayId ? d : { ...d, spots: d.spots.filter((s) => s.id !== spotId) }
        ),
      };
    });
    try {
      await deleteSpot(spotId);
    } catch (err: any) {
      if (tripId) fetchTripForEdit(tripId).then((t) => t && setTrip(t));
    }
  }, [tripId]);

  // Refresh trip after adding city
  const handleCityAdded = useCallback(() => {
    if (tripId) {
      fetchTripForEdit(tripId).then((t) => t && setTrip(t));
    }
  }, [tripId]);

  // Get existing destinations from trip days
  const existingDestinations = trip?.days
    .map((d) => d.location)
    .filter((loc): loc is string => !!loc) || [];

  // handleValidate — opération atomique (transactionnelle) pour valider et sauvegarder
  const handleValidate = async () => {
    if (!trip || !user?.id) return;
    setValidating(true);
    try {
      if (isSaved) {
        await unsaveTrip(user.id, trip.id);
        setIsSaved(false);
      } else {
        // Opération atomique : syncDestinations + saveTrip en une seule transaction
        // Si une étape échoue, tout est annulé (rollback)
        await validateAndSaveTrip(trip.id);
        setIsSaved(true);
        router.replace('/(tabs)/trips');
      }
    } catch (err: any) {
      Alert.alert(t('tripReview.error'), err.message);
    } finally {
      setValidating(false);
    }
  };

  // ── Chargement ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="center-content">
        <Loader size={32} color="#60a5fa" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="center-content gap-4">
        <Text className="text-body-muted">{t('review.tripNotFound')}</Text>
        <Button onPress={() => router.back()}>{t('review.back')}</Button>
      </View>
    );
  }

  const validatedDays  = trip.days.filter((d) => d.validated);
  const totalDays      = trip.days.length;
  const validatedCount = validatedDays.length;
  const totalSpots     = validatedDays.reduce((n, d) => n + d.spots.length, 0);
  const progressPct    = totalDays > 0 ? Math.round((validatedCount / totalDays) * 100) : 0;


  return (
    <View className="flex-1">

      {/* ── Header ── */}
      {/* web: sticky bg-surface-secondary/95 backdrop-blur border-b border-white/10 */}
      <View
        className="bg-surface-secondary px-4 py-4"
        style={{ paddingTop: insets.top + 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.navigate('/(tabs)')}
            style={{ padding: 8 }}
          >
            <View pointerEvents="none">
              <Icon name={'arrow-left-s-line'} size={24} color="#a1a1aa" />
            </View>
          </Pressable>
          <View className="flex-min-width">
            <Text className="title-lg-bold" numberOfLines={1}>{trip.trip_title}</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Icon name={'map-pin-2-line'} size={12} color="#71717a" />
              <Text className="text-sm text-body-muted">
                {trip.destination} · {trip.duration_days} {t('tripReview.days')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>

        {/* ── Résumé trip ── */}
        {/* web: badges vibe/duration/isSaved + creator handle + source_url */}
        <View
          className="bg-surface-secondary rounded-xl p-4 gap-2"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          {/* Badges */}
          <View className="flex-row flex-wrap gap-2">
            {trip.vibe && (
              <View
                className="pill-small"
                style={{ backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}
              >
                <Text className="font-dmsans" style={{ fontSize: 12, color: '#d8b4fe' }}>{trip.vibe}</Text>
              </View>
            )}
            <View
              className="pill-small"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Text className="font-dmsans" style={{ fontSize: 12, color: '#d4d4d8' }}>{trip.duration_days} {t('tripReview.days')}</Text>
            </View>
            {isSaved && (
              <View
                className="pill-small"
                style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' }}
              >
                <Text className="font-dmsans" style={{ fontSize: 12, color: '#86efac' }}>{t('review.alreadySaved')}</Text>
              </View>
            )}
          </View>

          {/* Créateur */}
          {trip.content_creator_handle && (
            <Text className="label-micro">
              📹 {t('tripReview.creator')} <Text className="text-body-muted">@{trip.content_creator_handle}</Text>
            </Text>
          )}

          {/* Lien vidéo source */}
          {trip.source_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(trip.source_url)}
              className="flex-row items-center gap-1"
            >
              <Text className="text-xs text-blue-400 font-dmsans">{t('review.viewOriginalVideo')}</Text>
              <Icon name={'external-link-line'} size={12} color="#60a5fa" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Panneau sélection ── */}
        <View
          className="bg-surface-secondary rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {/* Titre + bulk actions */}
          <View className="flex-row items-start justify-between gap-3 mb-3">
            <View>
              <Text className=" text-white font-righteous">{t('tripReview.selectDays')}</Text>
              <Text className="text-xs text-white/50 mt-0.5 font-dmsans">
                {validatedCount === 0
                  ? t('tripReview.noDaySelected')
                  : t('tripReview.daySelected', { count: validatedCount, spots: totalSpots, plural: validatedCount > 1 ? 's' : '' })}
              </Text>
            </View>
            <View className="flex-row gap-1.5 flex-shrink-0">
              {/* Add city button */}
              <TouchableOpacity
                onPress={() => setShowAddCityModal(true)}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: 'rgba(168,85,247,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.3)',
                }}
              >
                <Icon name={'add-fill'} size={12} color="#a855f7" />
                <Text className="font-dmsans-semibold" style={{ fontSize: 12, color: '#a855f7' }}>{t('tripReview.addCity')}</Text>
              </TouchableOpacity>
              {([t('tripReview.allDays'), t('tripReview.noDays')] as const).map((label) => {
                const isAll = label === t('tripReview.allDays');
                const disabled = isAll ? validatedCount === totalDays : validatedCount === 0;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => handleToggleAll(isAll)}
                    disabled={disabled}
                    className="px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      opacity: disabled ? 0.3 : 1,
                    }}
                  >
                    <Text className="font-dmsans-semibold" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Barre de progression — web: motion.div width animée */}
          <View className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
            <View
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, backgroundColor: '#a855f7' }}
            />
          </View>

          {/* Pills des jours */}
          <View className="flex-row flex-wrap gap-1.5">
            {trip.days.map((day) => (
              <SecondaryButton
                key={day.id}
                title={t('dayReview.dayNumber', { number: day.day_number })}
                active={day.validated}
                variant="pill"
                size="sm"
                onPress={() => handleDayValidated(day.id, !day.validated)}
                leftIcon={'check-line'}
              />
            ))}
          </View>
        </View>

        {/* ── Jours détaillés ── */}
        <View className="gap-2">
          {trip.days.map((day) => (
            <DayReviewCard
              key={day.id}
              day={day}
              isExpanded={expandedDay === day.day_number}
              onToggle={() => setExpandedDay(expandedDay === day.day_number ? -1 : day.day_number)}
              onValidatedChange={(v) => handleDayValidated(day.id, v)}
              onSpotUpdate={(spotId, payload) => handleSpotUpdate(day.id, spotId, payload)}
              onSpotDelete={(spotId) => handleSpotDelete(day.id, spotId)}
              t={t}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Footer sticky ── */}
      {/* web: fixed bottom-16 — 3 états: validating / isSaved→retirer / vide / sauvegarder */}
      <View
        className="absolute left-0 right-0 bottom-0 px-4 py-4 bg-bg-primary"
        style={{ paddingBottom: insets.bottom, borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.1)' }}
      >
        {isSaved ? (
          <PrimaryButton
            title={t('tripReview.removeFromCollection')}
            leftIcon="delete-bin-line"
            onPress={handleValidate}
            loading={validating}
            color="purple"
            fullWidth
          />
        ) : validatedCount === 0 ? (
          <PrimaryButton
            title={t('tripReview.selectAtLeastOneDay')}
            leftIcon="information-line"
            onPress={() => {}}
            disabled
            fullWidth
          />
        ) : (
          <PrimaryButton
            title={t('tripReview.saveDay', { count: validatedCount, plural: validatedCount > 1 ? 's' : '' })}
            leftIcon="check-line"
            onPress={handleValidate}
            loading={validating}
            fullWidth
          />
        )}
      </View>

      {/* Add City Modal */}
      {tripId && (
        <AddCityToTripModal
          visible={showAddCityModal}
          onClose={() => setShowAddCityModal(false)}
          tripId={tripId}
          tripDays={trip?.days || []}
          existingDestinations={existingDestinations}
          onCityAdded={handleCityAdded}
        />
      )}
    </View>
  );
}