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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, MapPin, Loader2,
  Star, Clock, ExternalLink, ChevronDown, ChevronUp,
  Trash2, Pencil, X, Save, Plus,
} from 'lucide-react-native';
import { isTripSaved, saveTrip, unsaveTrip } from '@/services/tripService';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTripForReview,
  setDayValidated,
  syncDestinations,
  updateSpot,
  deleteSpot,
} from '@/services/reviewService';
import type { DbTrip, DbDay, DbSpot, SpotUpdatePayload } from '@/services/reviewService';
import Button from '@/components/Button';

// ── Constantes ────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍽️', bar: '🍷', hotel: '🏨',
  attraction: '🏛️', activite: '🎯', activity: '🎯',
  transport: '🚗', shopping: '🛍️', other: '📍',
};

const SPOT_TYPES = [
  'restaurant', 'bar', 'hotel', 'attraction',
  'activite', 'transport', 'shopping', 'other',
] as const;

const PRICE_OPTIONS = ['gratuit', '€', '€€', '€€€', '€€€€'] as const;

const PRICE_LABEL: Record<string, string> = {
  gratuit: '🆓 Gratuit', '€': '€ Budget',
  '€€': '€€ Modéré', '€€€': '€€€ Cher', '€€€€': '€€€€ Luxe',
};

// ── SpinningLoader ─────────────────────────────────────────────────────────────

function SpinningLoader({ size = 16, color = '#60a5fa' }: { size?: number; color?: string }) {
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

// ── SpotReviewCard ────────────────────────────────────────────────────────────

interface SpotReviewCardProps {
  spot: DbSpot;
  onUpdate: (payload: SpotUpdatePayload) => void;
  onDelete: () => void;
}

function SpotReviewCard({ spot, onUpdate, onDelete }: SpotReviewCardProps) {
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

  // web: bg-yellow-500/5 border-yellow-500/20 si highlight, sinon bg-zinc-800/50 border-zinc-700/50
  const cardBg     = spot.highlight ? '#eab3080D' : '#27272a80';
  const cardBorder = spot.highlight ? '#eab30833' : '#3f3f4680';

  if (!isEditing) {
    return (
      <View className="rounded-lg p-2.5" style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }}>
        <View className="flex-row items-start gap-2">
          <Text style={{ fontSize: 16 }}>{TYPE_EMOJI[spot.spot_type ?? ''] ?? '📍'}</Text>
          <View className="flex-1 min-w-0">
            {/* Nom + actions */}
            <View className="flex-row items-center justify-between gap-1">
              <View className="flex-row items-center gap-1 flex-1 min-w-0">
                <Text className="text-white font-medium flex-shrink-1" numberOfLines={1}>{spot.name}</Text>
                {spot.highlight && <Star size={12} color="#facc15" fill="#facc15" />}
              </View>
              <View className="flex-row items-center gap-1 flex-shrink-0">
                {canOpen && (
                  <TouchableOpacity onPress={openMap} className="p-1" hitSlop={4}>
                    <ExternalLink size={12} color="#71717a" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { setIsEditing(true); setConfirmDel(false); }} className="p-1" hitSlop={4}>
                  <Pencil size={12} color="#71717a" />
                </TouchableOpacity>
                {confirmDel ? (
                  <View className="flex-row items-center gap-1">
                    <TouchableOpacity
                      onPress={onDelete}
                      className="px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      <Text style={{ fontSize: 12, color: '#fff' }}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setConfirmDel(false)} className="p-1" hitSlop={4}>
                      <X size={12} color="#71717a" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setConfirmDel(true)} className="p-1" hitSlop={4}>
                    <Trash2 size={12} color="#71717a" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {spot.address && (
              <Text className="text-xs text-zinc-500 mt-0.5" numberOfLines={1}>{spot.address}</Text>
            )}

            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              {!!spot.duration_minutes && (
                <View className="flex-row items-center gap-0.5">
                  <Clock size={12} color="#71717a" />
                  <Text className="text-xs text-zinc-500">{spot.duration_minutes}min</Text>
                </View>
              )}
              {spot.price_range && (
                <Text className="text-xs text-green-400">
                  {PRICE_LABEL[spot.price_range] ?? spot.price_range}
                </Text>
              )}
            </View>

            {spot.tips && (
              <Text className="text-xs text-blue-300 italic mt-1">💡 {spot.tips}</Text>
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
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nom</Text>
        <TextInput
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: '#3f3f4680', borderWidth: 1, borderColor: '#52525b' }}
          placeholderTextColor="#71717a"
        />
      </View>

      {/* Type + Prix */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</Text>
          {/* Picker simplifié — ScrollView horizontal des options */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-0.5" contentContainerStyle={{ gap: 4 }}>
            {SPOT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setForm((f) => ({ ...f, spot_type: t }))}
                className="px-2 py-1 rounded-lg"
                style={{
                  backgroundColor: form.spot_type === t ? '#3b82f633' : '#3f3f4680',
                  borderWidth: 1,
                  borderColor: form.spot_type === t ? '#3b82f64D' : '#52525b',
                }}
              >
                <Text style={{ fontSize: 12, color: form.spot_type === t ? '#93c5fd' : '#a1a1aa' }}>
                  {TYPE_EMOJI[t]} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Prix */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Prix</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-0.5" contentContainerStyle={{ gap: 4 }}>
          {PRICE_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setForm((f) => ({ ...f, price_range: p }))}
              className="px-2 py-1 rounded-lg"
              style={{
                backgroundColor: form.price_range === p ? '#3b82f633' : '#3f3f4680',
                borderWidth: 1,
                borderColor: form.price_range === p ? '#3b82f64D' : '#52525b',
              }}
            >
              <Text style={{ fontSize: 12, color: form.price_range === p ? '#93c5fd' : '#a1a1aa' }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Adresse */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Adresse</Text>
        <TextInput
          value={form.address ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, address: v || null }))}
          placeholder="Optionnel"
          placeholderTextColor="#71717a"
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: '#3f3f4680', borderWidth: 1, borderColor: '#52525b' }}
        />
      </View>

      {/* Durée */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Durée (min)</Text>
        <TextInput
          value={form.duration_minutes != null ? String(form.duration_minutes) : ''}
          onChangeText={(v) => setForm((f) => ({ ...f, duration_minutes: v ? Number(v) : null }))}
          placeholder="Optionnel"
          placeholderTextColor="#71717a"
          keyboardType="numeric"
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: '#3f3f4680', borderWidth: 1, borderColor: '#52525b' }}
        />
      </View>

      {/* Conseil */}
      <View>
        <Text style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Conseil</Text>
        <TextInput
          value={form.tips ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, tips: v || null }))}
          placeholder="Optionnel"
          placeholderTextColor="#71717a"
          multiline
          numberOfLines={2}
          className="mt-0.5 rounded-lg px-2.5 py-1.5 text-sm text-white"
          style={{ backgroundColor: '#3f3f4680', borderWidth: 1, borderColor: '#52525b', textAlignVertical: 'top' }}
        />
      </View>

      {/* Highlight toggle */}
      <TouchableOpacity
        onPress={() => setForm((f) => ({ ...f, highlight: !f.highlight }))}
        className="flex-row items-center gap-2 px-2.5 py-1.5 rounded-lg self-start"
        style={{
          backgroundColor: form.highlight ? '#eab3081A' : '#3f3f4680',
          borderWidth: 1,
          borderColor: form.highlight ? '#eab3084D' : '#52525b',
        }}
      >
        <Star size={12} color={form.highlight ? '#facc15' : '#71717a'} fill={form.highlight ? '#facc15' : 'none'} />
        <Text style={{ fontSize: 12, color: form.highlight ? '#fde68a' : '#71717a' }}>Coup de cœur</Text>
      </TouchableOpacity>

      {/* Actions */}
      <View className="flex-row gap-2 pt-1">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg"
          style={{ backgroundColor: '#2563eb' }}
        >
          {saving
            ? <SpinningLoader size={12} color="#fff" />
            : <Save size={12} color="#fff" />}
          <Text style={{ fontSize: 12, color: '#fff', fontWeight: '500' }}>Enregistrer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsEditing(false)}
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#3f3f4680' }}
        >
          <X size={12} color="#a1a1aa" />
          <Text style={{ fontSize: 12, color: '#a1a1aa' }}>Annuler</Text>
        </TouchableOpacity>
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
}

function DayReviewCard({ day, isExpanded, onToggle, onValidatedChange, onSpotUpdate, onSpotDelete }: DayReviewCardProps) {
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

  // web: included → bg-zinc-900 border-zinc-800, excluded → bg-zinc-900/30 border-zinc-800/40
  const cardBg     = included ? '#18181b' : '#18181b4D';
  const cardBorder = included ? '#27272a' : '#27272a66';
  // web: barre latérale bg-blue-500 si inclus, transparent sinon
  const barColor   = included ? '#3b82f6' : 'transparent';
  // web: numéro bg-blue-500/20 border-blue-500/30 texte blue-400, sinon bg-zinc-800/40 texte zinc-600
  const numBg      = included ? '#3b82f633' : '#27272a66';
  const numBorder  = included ? '#3b82f64D' : '#3f3f4680';
  const numColor   = included ? '#60a5fa' : '#52525b';
  // web: toggle pill : inclus → bg-blue-500/15 text-blue-400 border-blue-500/30, sinon bg-zinc-800/80 text-zinc-500
  const toggleBg     = included ? '#3b82f626' : '#27272acc';
  const toggleBorder = included ? '#3b82f64D' : '#3f3f46';
  const toggleColor  = included ? '#60a5fa'   : '#71717a';

  return (
    <View className="rounded-xl overflow-hidden" style={{ borderWidth: 1, borderColor: cardBorder, backgroundColor: cardBg }}>
      <View className="flex-row">
        {/* Barre latérale colorée */}
        <View style={{ width: 2, backgroundColor: barColor }} />

        <View className="flex-1 min-w-0">
          {/* Header */}
          <View className="flex-row items-center px-3 py-3 gap-3">

            {/* Numéro */}
            <View
              className="w-8 h-8 rounded-full items-center justify-center flex-shrink-0"
              style={{ backgroundColor: numBg, borderWidth: 1, borderColor: numBorder }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: numColor }}>{day.day_number}</Text>
            </View>

            {/* Localisation — cliquable pour déplier si inclus */}
            <TouchableOpacity
              onPress={included ? onToggle : undefined}
              disabled={!included}
              className="flex-1 min-w-0"
            >
              <Text
                className="text-sm font-medium"
                numberOfLines={1}
                style={{
                  color: included ? '#ffffff' : '#52525b',
                  textDecorationLine: included ? 'none' : 'line-through',
                }}
              >
                {day.location ?? `Jour ${day.day_number}`}
              </Text>
              {included && day.spots.length > 0 && (
                <Text className="text-xs text-zinc-600 mt-0.5">
                  {day.spots.length} lieu{day.spots.length > 1 ? 'x' : ''}
                </Text>
              )}
            </TouchableOpacity>

            {/* Actions droite : toggle pill + chevron */}
            <View className="flex-row items-center gap-2 flex-shrink-0">
              <TouchableOpacity
                onPress={() => onValidatedChange(!included)}
                className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: toggleBg, borderWidth: 1, borderColor: toggleBorder }}
              >
                {included
                  ? <Check size={12} color={toggleColor} />
                  : <Plus  size={12} color={toggleColor} />}
                <Text style={{ fontSize: 12, fontWeight: '500', color: toggleColor }}>
                  {included ? 'Inclus' : 'Inclure'}
                </Text>
              </TouchableOpacity>

              {included && (
                <TouchableOpacity onPress={onToggle} className="p-0.5" hitSlop={6}>
                  {isExpanded
                    ? <ChevronUp   size={16} color="#71717a" />
                    : <ChevronDown size={16} color="#71717a" />}
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
                style={{ borderTopWidth: 1, borderTopColor: '#27272a99' }}
              >
                {day.spots.length === 0 ? (
                  <Text className="text-xs text-zinc-600 text-center py-2 italic">
                    Aucun lieu pour ce jour.
                  </Text>
                ) : (
                  day.spots.map((spot) => (
                    <SpotReviewCard
                      key={spot.id}
                      spot={spot}
                      onUpdate={(payload) => onSpotUpdate(spot.id, payload)}
                      onDelete={() => onSpotDelete(spot.id)}
                    />
                  ))
                )}

                {/* Repas — web: breakfast/lunch/dinner */}
                {(day.breakfast_spot || day.lunch_spot || day.dinner_spot) && (
                  <View className="pt-2 gap-1" style={{ borderTopWidth: 1, borderTopColor: '#27272a99' }}>
                    {day.breakfast_spot && <Text className="text-xs text-zinc-400">🌅 {day.breakfast_spot}</Text>}
                    {day.lunch_spot     && <Text className="text-xs text-zinc-400">☀️ {day.lunch_spot}</Text>}
                    {day.dinner_spot    && <Text className="text-xs text-zinc-400">🌙 {day.dinner_spot}</Text>}
                  </View>
                )}

                {/* Hébergement */}
                {day.accommodation_name && (
                  <Text
                    className="text-xs text-zinc-500 pt-2"
                    style={{ borderTopWidth: 1, borderTopColor: '#27272a99' }}
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
  const insets = useSafeAreaInsets();

  const [trip,        setTrip]       = useState<DbTrip | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [validating,  setValidating] = useState(false);
  const [isSaved,     setIsSaved]    = useState(false);
  const [expandedDay, setExpandedDay] = useState<number>(0);

  useEffect(() => {
    if (!tripId) return;
    fetchTripForReview(tripId).then((t) => {
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
      if (tripId) fetchTripForReview(tripId).then((t) => t && setTrip(t));
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
      if (tripId) fetchTripForReview(tripId).then((t) => t && setTrip(t));
    }
  }, [tripId]);

  // handleValidate — web: save/unsave + syncDestinations
  const handleValidate = async () => {
    if (!trip || !user?.id) return;
    setValidating(true);
    try {
      if (isSaved) {
        await unsaveTrip(user.id, trip.id);
        setIsSaved(false);
      } else {
        await syncDestinations(trip.id);
        await saveTrip(user.id, trip.id);
        setIsSaved(true);
        // Rediriger vers la page du trip après sauvegarde
        router.push(`/(tabs)/trips/${trip.id}`);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setValidating(false);
    }
  };

  // ── Chargement ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <SpinningLoader size={32} color="#60a5fa" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4">
        <Text className="text-zinc-400">Voyage introuvable</Text>
        <Button onPress={() => router.back()}>Retour</Button>
      </View>
    );
  }

  const validatedDays  = trip.days.filter((d) => d.validated);
  const totalDays      = trip.days.length;
  const validatedCount = validatedDays.length;
  const totalSpots     = validatedDays.reduce((n, d) => n + d.spots.length, 0);
  const progressPct    = totalDays > 0 ? Math.round((validatedCount / totalDays) * 100) : 0;

  // Footer button : 3 états comme le web
  const footerBg = isSaved
    ? '#b91c1c'     // red-700
    : validatedCount === 0
      ? '#3f3f46'   // zinc-700
      : '#16a34a';  // green-600

  return (
    <View className="flex-1 bg-black">

      {/* ── Header ── */}
      {/* web: sticky bg-zinc-900/95 backdrop-blur border-b border-zinc-800 */}
      <View
        className="bg-zinc-900 px-4 py-4"
        style={{ paddingTop: insets.top + 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.navigate('/(tabs)')}
            style={{ padding: 8 }}
          >
            <View pointerEvents="none">
              <ArrowLeft size={24} color="#a1a1aa" />
            </View>
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text className="text-lg font-bold text-white" numberOfLines={1}>{trip.trip_title}</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <MapPin size={12} color="#71717a" />
              <Text className="text-sm text-zinc-400">
                {trip.destination} · {trip.duration_days} jours
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>

        {/* ── Résumé trip ── */}
        {/* web: badges vibe/duration/isSaved + creator handle + source_url */}
        <View
          className="bg-zinc-900 rounded-xl p-4 gap-2"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          {/* Badges */}
          <View className="flex-row flex-wrap gap-2">
            {trip.vibe && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#a855f733', borderWidth: 1, borderColor: '#a855f74D' }}
              >
                <Text style={{ fontSize: 12, color: '#d8b4fe' }}>{trip.vibe}</Text>
              </View>
            )}
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46' }}
            >
              <Text style={{ fontSize: 12, color: '#d4d4d8' }}>{trip.duration_days} jours</Text>
            </View>
            {isSaved && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#22c55e33', borderWidth: 1, borderColor: '#22c55e4D' }}
              >
                <Text style={{ fontSize: 12, color: '#86efac' }}>✓ Déjà sauvegardé</Text>
              </View>
            )}
          </View>

          {/* Créateur */}
          {trip.content_creator_handle && (
            <Text className="text-xs text-zinc-500">
              📹 Créateur : <Text className="text-zinc-400">@{trip.content_creator_handle}</Text>
            </Text>
          )}

          {/* Lien vidéo source */}
          {trip.source_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(trip.source_url)}
              className="flex-row items-center gap-1"
            >
              <Text className="text-xs text-blue-400">Voir la vidéo originale</Text>
              <ExternalLink size={12} color="#60a5fa" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Panneau sélection ── */}
        <View
          className="bg-zinc-900 rounded-xl p-4"
          style={{ borderWidth: 1, borderColor: '#27272a' }}
        >
          {/* Titre + bulk actions */}
          <View className="flex-row items-start justify-between gap-3 mb-3">
            <View>
              <Text className="text-sm font-semibold text-white">Sélectionne tes jours</Text>
              <Text className="text-xs text-zinc-500 mt-0.5">
                {validatedCount === 0
                  ? 'Aucun jour sélectionné'
                  : `${validatedCount} jour${validatedCount > 1 ? 's' : ''} · ${totalSpots} lieu${totalSpots > 1 ? 'x' : ''}`}
              </Text>
            </View>
            <View className="flex-row gap-1.5 flex-shrink-0">
              {(['Tout', 'Aucun'] as const).map((label) => {
                const isAll = label === 'Tout';
                const disabled = isAll ? validatedCount === totalDays : validatedCount === 0;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => handleToggleAll(isAll)}
                    disabled={disabled}
                    className="px-2.5 py-1 rounded-lg"
                    style={{
                      backgroundColor: '#27272a',
                      borderWidth: 1,
                      borderColor: '#3f3f46',
                      opacity: disabled ? 0.3 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#a1a1aa' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Barre de progression — web: motion.div width animée */}
          <View className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <View
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, backgroundColor: '#3b82f6' }}
            />
          </View>

          {/* Pills des jours */}
          <View className="flex-row flex-wrap gap-1.5">
            {trip.days.map((day) => (
              <TouchableOpacity
                key={day.id}
                onPress={() => handleDayValidated(day.id, !day.validated)}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: day.validated ? '#3b82f633' : '#27272a',
                  borderWidth: 1,
                  borderColor: day.validated ? '#3b82f64D' : '#3f3f46',
                }}
              >
                {day.validated && <Check size={10} color="#93c5fd" />}
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: day.validated ? '#93c5fd' : '#71717a',
                }}>
                  J{day.day_number}
                </Text>
              </TouchableOpacity>
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
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Footer sticky ── */}
      {/* web: fixed bottom-16 — 3 états: validating / isSaved→retirer / vide / sauvegarder */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black"
        style={{ borderTopWidth: 1, borderTopColor: '#27272a' }}
      >
        <TouchableOpacity
          onPress={handleValidate}
          disabled={validating || validatedCount === 0}
          className="w-full flex-row items-center justify-center gap-2 py-3 rounded-xl"
          style={{ backgroundColor: footerBg, opacity: validatedCount === 0 && !isSaved ? 0.6 : 1 }}
        >
          {validating ? (
            <>
              <SpinningLoader size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '500' }}>Chargement…</Text>
            </>
          ) : isSaved ? (
            <>
              <Trash2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '500' }}>Retirer de ma collection</Text>
            </>
          ) : validatedCount === 0 ? (
            <Text style={{ color: '#fff', fontWeight: '500' }}>Sélectionne au moins un jour</Text>
          ) : (
            <>
              <Check size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '500' }}>
                Sauvegarder {validatedCount} jour{validatedCount > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}