/**
 * [tripId].tsx - React Native version
 * Complete refactor with NativeWind, preserving all React source features
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { InteractiveHeroMap } from '@/components/InteractiveHeroMap';
import {
  X,
  MapPin,
  ExternalLink,
  Star,
  Clock,
  DollarSign,
  Globe,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Truck,
  Info,
  Utensils,
  BedDouble,
  AlertTriangle,
  Lightbulb,
  Package,
  Smartphone,
  Navigation,
  Wifi,
  Shield,
  TrendingDown,
  Coffee,
  Sun,
  Moon,
  Camera,
} from 'lucide-react-native';
import { getTrip } from '@/services/tripService';
import { Destination } from '@/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DbSpot {
  id: string;
  name: string;
  spot_type: string | null;
  address: string | null;
  duration_minutes: number | null;
  price_range: string | null;
  price_detail: string | null;
  tips: string | null;
  highlight: boolean;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  spot_order: number;
  verified: boolean;
}

interface DbDay {
  id: string;
  day_number: number;
  location: string | null;
  theme: string | null;
  accommodation_name: string | null;
  accommodation_type: string | null;
  accommodation_price_per_night: string | null;
  accommodation_tips: string | null;
  breakfast_spot: string | null;
  lunch_spot: string | null;
  dinner_spot: string | null;
  spots: DbSpot[];
}

interface DbLogistics {
  id: string;
  from_location: string | null;
  to_location: string | null;
  transport_mode: string | null;
  duration: string | null;
  cost: string | null;
  tips: string | null;
  travel_order: number;
}

interface DbBudget {
  id: string;
  total_estimated: string | null;
  currency: string | null;
  per_day_min: string | null;
  per_day_max: string | null;
  accommodation_cost: string | null;
  food_cost: string | null;
  transport_cost: string | null;
  activities_cost: string | null;
  money_saving_tips: string[] | null;
}

interface DbPracticalInfo {
  id: string;
  visa_required: boolean | null;
  local_currency: string | null;
  language: string | null;
  best_apps: string[] | null;
  what_to_pack: string[] | null;
  safety_tips: string[] | null;
  things_to_avoid: string[] | null;
}

interface FullTrip {
  id: string;
  trip_title: string;
  vibe: string | null;
  duration_days: number;
  best_season: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  content_creator_handle: string | null;
  content_creator_links: string[] | null;
  is_public: boolean;
  views_count: number;
  saves_count: number;
  created_at: string;
  destinations: Destination[];
  itinerary_days: DbDay[];
  logistics: DbLogistics[];
  budgets: DbBudget[];
  practical_info: DbPracticalInfo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SPOT_EMOJI: Record<string, string> = {
  restaurant: '🍽️', bar: '🍷', hotel: '🏨', attraction: '🏛️',
  activite: '🎯', activity: '🎯', transport: '🚗', shopping: '🛍️',
  museum: '🏛️', beach: '🏖️', park: '🌳', viewpoint: '🔭',
  cafe: '☕', market: '🛒', nightlife: '🎶', spa: '💆', other: '📍',
};

const TRANSPORT_CONFIG: Record<string, { emoji: string; label: string }> = {
  plane: { emoji: '✈️', label: 'Vol' },
  train: { emoji: '🚆', label: 'Train' },
  bus: { emoji: '🚌', label: 'Bus' },
  car: { emoji: '🚗', label: 'Voiture' },
  ferry: { emoji: '⛴️', label: 'Ferry' },
  walk: { emoji: '🚶', label: 'À pied' },
  taxi: { emoji: '🚕', label: 'Taxi' },
  metro: { emoji: '🚇', label: 'Métro' },
  bike: { emoji: '🚲', label: 'Vélo' },
  boat: { emoji: '🛥️', label: 'Bateau' },
};

const PRICE_CONFIG: Record<string, { label: string; color: string }> = {
  gratuit: { label: 'Gratuit', color: 'text-emerald-400' },
  '€': { label: 'Budget', color: 'text-green-400' },
  '€€': { label: 'Modéré', color: 'text-yellow-400' },
  '€€€': { label: 'Cher', color: 'text-orange-400' },
  '€€€€': { label: 'Luxe', color: 'text-red-400' },
};

const SEASON_EMOJI: Record<string, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', fall: '🍂', winter: '❄️',
  'all year': '🌍', printemps: '🌸', été: '☀️', automne: '🍂', hiver: '❄️',
};

type Tab = 'itinerary' | 'budget' | 'practical' | 'logistics';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<FullTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [expandedDay, setExpandedDay] = useState<number>(1);

  useEffect(() => {
    if (!tripId) return;
    getTrip(tripId)
      .then((data) => setTrip(data as FullTrip))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tripId]);

  // Derived data
  const derived = useMemo(() => {
    if (!trip) return null;
    const destinations = [...(trip.destinations ?? [])].sort((a, b) => a.visit_order - b.visit_order);
    const days = [...(trip.itinerary_days ?? [])].sort((a, b) => a.day_number - b.day_number);
    const logistics = [...(trip.logistics ?? [])].sort((a, b) => (a.travel_order ?? 0) - (b.travel_order ?? 0));
    const budget = trip.budgets?.[0] ?? null;
    const practical = trip.practical_info?.[0] ?? null;
    const totalSpots = days.reduce((n, d) => n + (d.spots?.length ?? 0), 0);
    const highlights = days.flatMap(d => d.spots?.filter(s => s.highlight) ?? []);
    const destLabel = destinations.map(d => [d.city, d.country].filter(Boolean).join(', ')).join(' → ') || '—';
    const seasonEmoji = trip.best_season ? (SEASON_EMOJI[trip.best_season.toLowerCase()] ?? '🌍') : null;
    return { destinations, days, logistics, budget, practical, totalSpots, highlights, destLabel, seasonEmoji };
  }, [trip]);

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!trip || !derived) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-4" style={{ paddingTop: insets.top }}>
        <Text className="text-zinc-400 text-sm mb-4">Voyage introuvable.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/trips')}
          className="bg-zinc-800 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Mes voyages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { destinations, days, logistics, budget, practical, totalSpots, highlights, destLabel, seasonEmoji } = derived;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'itinerary', label: 'Itinéraire', icon: <CalendarDays size={14} color="#60a5fa" />, count: days.length },
    { id: 'budget', label: 'Budget', icon: <DollarSign size={14} color="#60a5fa" /> },
    { id: 'practical', label: 'Pratique', icon: <Globe size={14} color="#60a5fa" /> },
    { id: 'logistics', label: 'Transport', icon: <Truck size={14} color="#60a5fa" />, count: logistics.length },
  ];

  return (
    <View className="flex-1 bg-black">
      {/* ════════════════════════════════════════════
          HEADER STICKY
      ════════════════════════════════════════════ */}
      <View className="bg-zinc-950/95 border-b border-zinc-800/80" style={{ paddingTop: insets.top }}>
        <View className="max-w-2xl mx-auto px-4 py-3 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.replace('/(tabs)/trips')} className="p-2 -ml-2">
            <X size={20} color="#a1a1aa" />
          </TouchableOpacity>

          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {trip.trip_title}
            </Text>

            <View className="flex-row items-center gap-1 mt-0.5 mb-1">
              <MapPin size={12} color="#60a5fa" />
              <Text className="text-xs text-zinc-500" numberOfLines={1}>{destLabel}</Text>
            </View>

            <View className="flex-row flex-wrap gap-1.5">
              {trip.vibe && (
                <View className="bg-blue-500/20 border border-blue-500/30 rounded-full px-2 py-0.5">
                  <Text className="text-blue-300 text-[10px]">✨ {trip.vibe}</Text>
                </View>
              )}
              {trip.best_season && (
                <View className="bg-blue-500/40 border border-blue-400/30 rounded-full px-2 py-0.5">
                  <Text className="text-blue-200 text-[10px]">{seasonEmoji} {trip.best_season}</Text>
                </View>
              )}
            </View>
          </View>

          {trip.source_url && (
            <TouchableOpacity onPress={() => Linking.openURL(trip.source_url!)} className="p-2">
              <ExternalLink size={16} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View className="max-w-2xl mx-auto px-4 flex-row border-t border-zinc-800/60">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 border-b-2 ${
                activeTab === tab.id ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              {tab.icon}
              <Text className={`text-xs font-medium ${
                activeTab === tab.id ? 'text-blue-400' : 'text-zinc-500'
              }`}>
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View className={`rounded-full px-1 min-w-[16px] ${
                  activeTab === tab.id ? 'bg-blue-500/20' : 'bg-zinc-800'
                }`}>
                  <Text className={`text-[10px] text-center ${
                    activeTab === tab.id ? 'text-blue-300' : 'text-zinc-500'
                  }`}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ════════════════════════════════════════════
          CONTENT BY TAB
      ════════════════════════════════════════════ */}
      <ScrollView
        className="flex-1 max-w-2xl mx-auto w-full"
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >

        {/* ─────────────────── ITINERARY ─────────────────── */}
        {activeTab === 'itinerary' && (
          <View className="gap-3 pb-6 px-4">
            {/* HERO - Map with destinations */}
            <View className="h-72 mt-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
              {destinations.length > 0 ? (
                <InteractiveHeroMap destinations={destinations} />
              ) : (
                <View className="w-full h-full relative">
                  <Image
                    source={{ uri: trip.thumbnail_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800' }}
                    className="w-full h-full opacity-60"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/40" />
                </View>
              )}
            </View>

            {/* QUICK STATS + CREATOR INFO */}
            <View className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Stats bar */}
              <View className="flex-row px-4 py-3">
                <StatCell
                  icon={<CalendarDays size={14} color="#60a5fa" />}
                  value={`${trip.duration_days}j`}
                  label="Durée"
                />
                <View className="w-px bg-zinc-800 mx-2" />
                <StatCell
                  icon={<MapPin size={14} color="#c084fc" />}
                  value={String(destinations.length)}
                  label={destinations.length > 1 ? 'Villes' : 'Ville'}
                />
                <View className="w-px bg-zinc-800 mx-2" />
                <StatCell
                  icon={<Navigation size={14} color="#34d399" />}
                  value={String(totalSpots)}
                  label="Lieux"
                />
              </View>

              {/* Creator info (if present) */}
              {trip.content_creator_handle && (
                <View className="border-t border-zinc-800 px-4 py-3 flex-row items-center gap-3">
                  <Camera size={16} color="#a1a1aa" />
                  <View className="flex-1">
                    <Text className="text-xs text-zinc-500">Créateur de contenu</Text>
                    <Text className="text-sm text-white font-medium">@{trip.content_creator_handle}</Text>
                  </View>
                  {trip.source_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(trip.source_url!)}>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs text-blue-400">Voir la vidéo</Text>
                        <ExternalLink size={12} color="#60a5fa" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            {/* Destinations overview (multi-stop) */}
            {destinations.length > 1 && (
              <View className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
                  Étapes du voyage
                </Text>
                <View>
                  {destinations.map((dest, i) => (
                    <View key={dest.id} className="flex-row gap-3 pb-3">
                      <View className="items-center">
                        <View className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 items-center justify-center">
                          <Text className="text-blue-400 text-xs font-bold">{i + 1}</Text>
                        </View>
                        {i < destinations.length - 1 && (
                          <View className="w-px flex-1 bg-zinc-700 mt-1" />
                        )}
                      </View>
                      <View className="flex-1 pt-1">
                        <Text className="text-sm font-medium text-white">
                          {[dest.city, dest.country].filter(Boolean).join(', ')}
                        </Text>
                        {dest.days_spent && (
                          <Text className="text-xs text-zinc-500 mt-0.5">
                            {dest.days_spent} jour{dest.days_spent > 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Days */}
            {days.length === 0 ? (
              <EmptyState message="Aucun itinéraire extrait pour ce voyage." />
            ) : (
              days.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  isExpanded={expandedDay === day.day_number}
                  onToggle={() => setExpandedDay(expandedDay === day.day_number ? -1 : day.day_number)}
                />
              ))
            )}
          </View>
        )}

        {/* ─────────────────── BUDGET ─────────────────── */}
        {activeTab === 'budget' && (
          <View className="gap-3 pb-6 px-4 pt-4">
            {!budget ? (
              <EmptyState message="Aucune information budget disponible." />
            ) : (
              <>
                {/* Total hero */}
                {budget.total_estimated && (
                  <View className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-5">
                    <Text className="text-xs text-zinc-400 mb-1">Budget total estimé</Text>
                    <View className="flex-row items-end gap-2">
                      <Text className="text-4xl font-bold text-white">{budget.total_estimated}</Text>
                      {budget.currency && (
                        <Text className="text-xl text-zinc-400 mb-1">{budget.currency}</Text>
                      )}
                    </View>
                    {(budget.per_day_min || budget.per_day_max) && (
                      <View className="mt-3 bg-white/5 rounded-lg px-3 py-2 flex-row items-center gap-2 self-start">
                        <TrendingDown size={14} color="#60a5fa" />
                        <Text className="text-sm text-zinc-300">
                          {budget.per_day_min && budget.per_day_max
                            ? `${budget.per_day_min} – ${budget.per_day_max} / jour`
                            : `${budget.per_day_min || budget.per_day_max} / jour`}
                        </Text>
                        {budget.currency && (
                          <Text className="text-xs text-zinc-500">{budget.currency}</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Breakdown */}
                {(budget.accommodation_cost || budget.food_cost || budget.transport_cost || budget.activities_cost) && (
                  <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
                      Répartition
                    </Text>
                    <View className="gap-3">
                      {budget.accommodation_cost && (
                        <BudgetLine
                          icon="🏨"
                          label="Hébergement"
                          value={budget.accommodation_cost}
                          currency={budget.currency}
                          color="bg-blue-500"
                        />
                      )}
                      {budget.food_cost && (
                        <BudgetLine
                          icon="🍽️"
                          label="Nourriture"
                          value={budget.food_cost}
                          currency={budget.currency}
                          color="bg-orange-500"
                        />
                      )}
                      {budget.transport_cost && (
                        <BudgetLine
                          icon="🚗"
                          label="Transport"
                          value={budget.transport_cost}
                          currency={budget.currency}
                          color="bg-purple-500"
                        />
                      )}
                      {budget.activities_cost && (
                        <BudgetLine
                          icon="🎯"
                          label="Activités"
                          value={budget.activities_cost}
                          currency={budget.currency}
                          color="bg-emerald-500"
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* Money saving tips */}
                {budget.money_saving_tips && budget.money_saving_tips.length > 0 && (
                  <View className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4">
                    <View className="flex-row items-center gap-1.5 mb-3">
                      <Lightbulb size={14} color="#eab308" />
                      <Text className="text-xs font-medium text-yellow-500 uppercase tracking-wide">
                        Conseils pour économiser
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {budget.money_saving_tips.map((tip, i) => (
                        <View key={i} className="flex-row gap-2.5">
                          <Text className="text-yellow-500 mt-0.5">💡</Text>
                          <Text className="text-sm text-zinc-300 flex-1">{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ─────────────────── PRACTICAL ─────────────────── */}
        {activeTab === 'practical' && (
          <View className="gap-3 pb-6 px-4 pt-4">
            {!practical ? (
              <EmptyState message="Aucune info pratique disponible." />
            ) : (
              <>
                {/* Essential info */}
                <View className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 pt-4 pb-2">
                    Informations essentielles
                  </Text>
                  <View>
                    {practical.visa_required !== null && (
                      <PracticalRow
                        icon={practical.visa_required
                          ? <AlertTriangle size={16} color="#fb923c" />
                          : <Shield size={16} color="#34d399" />}
                        label="Visa"
                        value={practical.visa_required ? 'Requis' : 'Non requis'}
                        valueClass={practical.visa_required ? 'text-orange-300' : 'text-emerald-300'}
                      />
                    )}
                    {practical.local_currency && (
                      <PracticalRow
                        icon={<DollarSign size={16} color="#60a5fa" />}
                        label="Devise locale"
                        value={practical.local_currency}
                      />
                    )}
                    {practical.language && (
                      <PracticalRow
                        icon={<Globe size={16} color="#c084fc" />}
                        label="Langue"
                        value={practical.language}
                      />
                    )}
                  </View>
                </View>

                {/* Apps */}
                {practical.best_apps && practical.best_apps.length > 0 && (
                  <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <View className="flex-row items-center gap-1.5 mb-3">
                      <Smartphone size={14} color="#60a5fa" />
                      <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        Applications utiles
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {practical.best_apps.map((app, i) => (
                        <View key={i} className="flex-row items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                          <Wifi size={12} color="#60a5fa" />
                          <Text className="text-sm text-blue-300">{app}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* What to pack */}
                {practical.what_to_pack && practical.what_to_pack.length > 0 && (
                  <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <View className="flex-row items-center gap-1.5 mb-3">
                      <Package size={14} color="#34d399" />
                      <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        À emporter
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {practical.what_to_pack.map((item, i) => (
                        <View key={i} className="bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1">
                          <Text className="text-xs text-zinc-300">{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Safety tips */}
                {practical.safety_tips && practical.safety_tips.length > 0 && (
                  <View className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <View className="flex-row items-center gap-1.5 mb-3">
                      <Shield size={14} color="#eab308" />
                      <Text className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        Conseils de sécurité
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {practical.safety_tips.map((tip, i) => (
                        <View key={i} className="flex-row gap-2.5">
                          <Text className="text-yellow-400">•</Text>
                          <Text className="text-sm text-zinc-300 flex-1">{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Things to avoid */}
                {practical.things_to_avoid && practical.things_to_avoid.length > 0 && (
                  <View className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
                    <View className="flex-row items-center gap-1.5 mb-3">
                      <AlertTriangle size={14} color="#f87171" />
                      <Text className="text-xs font-medium text-red-400 uppercase tracking-wide">
                        À éviter absolument
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {practical.things_to_avoid.map((item, i) => (
                        <View key={i} className="flex-row gap-2.5">
                          <Text className="text-red-400">✗</Text>
                          <Text className="text-sm text-zinc-300 flex-1">{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ─────────────────── LOGISTICS ─────────────────── */}
        {activeTab === 'logistics' && (
          <View className="gap-3 pb-6 px-4 pt-4">
            {logistics.length === 0 ? (
              <EmptyState message="Aucune information de transport disponible." />
            ) : (
              <>
                <Text className="text-xs text-zinc-500 pb-1">
                  {logistics.length} trajet{logistics.length > 1 ? 's' : ''} planifié{logistics.length > 1 ? 's' : ''}
                </Text>

                {/* Timeline */}
                <View>
                  {logistics.map((leg, i) => {
                    const cfg = TRANSPORT_CONFIG[leg.transport_mode ?? ''] ?? { emoji: '🚌', label: leg.transport_mode ?? 'Transport' };
                    return (
                      <View key={leg.id} className="flex-row gap-3 pb-3">
                        <View className="items-center">
                          <View className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center">
                            <Text className="text-lg">{cfg.emoji}</Text>
                          </View>
                          {i < logistics.length - 1 && (
                            <View className="w-px flex-1 bg-zinc-700 mt-1 min-h-[24px]" />
                          )}
                        </View>

                        <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 mb-3">
                          <View className="flex-row items-start justify-between gap-2 mb-2">
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-white">
                                {leg.from_location} <Text className="text-zinc-500">→</Text> {leg.to_location}
                              </Text>
                              <View className="bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5 mt-1 self-start">
                                <Text className="text-zinc-400 text-xs">{cfg.label}</Text>
                              </View>
                            </View>
                          </View>

                          <View className="flex-row flex-wrap gap-3">
                            {leg.duration && (
                              <View className="flex-row items-center gap-1">
                                <Clock size={12} color="#60a5fa" />
                                <Text className="text-xs text-zinc-400">{leg.duration}</Text>
                              </View>
                            )}
                            {leg.cost && (
                              <View className="flex-row items-center gap-1">
                                <DollarSign size={12} color="#34d399" />
                                <Text className="text-xs text-zinc-400">{leg.cost}</Text>
                              </View>
                            )}
                          </View>

                          {leg.tips && (
                            <Text className="text-xs text-blue-300 italic mt-2 pt-2 border-t border-zinc-800">
                              💡 {leg.tips}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DayCard({ day, isExpanded, onToggle }: {
  day: DbDay; isExpanded: boolean; onToggle: () => void;
}) {
  const sortedSpots = useMemo(
    () => [...(day.spots ?? [])].sort((a, b) => (a.spot_order ?? 0) - (b.spot_order ?? 0)),
    [day.spots]
  );
  const hasMeals = day.breakfast_spot || day.lunch_spot || day.dinner_spot;

  return (
    <View className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        onPress={onToggle}
        className="px-4 py-3.5 flex-row items-center gap-3"
        activeOpacity={0.7}
      >
        <View className="w-9 h-9 rounded-full bg-blue-500/30 border border-blue-500/30 items-center justify-center">
          <Text className="text-blue-400 font-bold text-sm">{day.day_number}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>
            {day.location ?? `Jour ${day.day_number}`}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {sortedSpots.some(s => s.highlight) && (
            <Star size={14} color="#facc15" fill="#facc15" />
          )}
          <Text className="text-xs text-zinc-600">{sortedSpots.length} lieux</Text>
          {isExpanded ? (
            <ChevronUp size={16} color="#71717a" />
          ) : (
            <ChevronDown size={16} color="#71717a" />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View className="border-t border-zinc-800 p-3 gap-2">
          {/* Spots */}
          {sortedSpots.length > 0 && (
            <View className="gap-2">
              {sortedSpots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} />
              ))}
            </View>
          )}

          {/* Meals */}
          {hasMeals && (
            <View className="bg-zinc-800/50 rounded-lg p-3 gap-2 border border-zinc-700/40">
              <View className="flex-row items-center gap-1.5">
                <Utensils size={12} color="#a1a1aa" />
                <Text className="text-xs text-zinc-500 font-medium">Où manger</Text>
              </View>
              {day.breakfast_spot && (
                <MealRow icon={<Coffee size={12} color="#f59e0b" />} label="Matin" value={day.breakfast_spot} />
              )}
              {day.lunch_spot && (
                <MealRow icon={<Sun size={12} color="#eab308" />} label="Midi" value={day.lunch_spot} />
              )}
              {day.dinner_spot && (
                <MealRow icon={<Moon size={12} color="#60a5fa" />} label="Soir" value={day.dinner_spot} />
              )}
            </View>
          )}

          {/* Accommodation */}
          {day.accommodation_name && (
            <View className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/40">
              <View className="flex-row items-center gap-1.5 mb-2">
                <BedDouble size={12} color="#a1a1aa" />
                <Text className="text-xs text-zinc-500 font-medium">Hébergement</Text>
              </View>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-sm text-white font-medium">{day.accommodation_name}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    {day.accommodation_type && (
                      <Text className="text-xs text-zinc-500 capitalize">{day.accommodation_type}</Text>
                    )}
                    {day.accommodation_price_per_night && (
                      <Text className="text-xs text-emerald-400">{day.accommodation_price_per_night} / nuit</Text>
                    )}
                  </View>
                </View>
              </View>
              {day.accommodation_tips && (
                <Text className="text-xs text-blue-300 italic mt-2">💡 {day.accommodation_tips}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function SpotCard({ spot }: { spot: DbSpot }) {
  const priceCfg = spot.price_range ? PRICE_CONFIG[spot.price_range] : null;

  const openMap = () => {
    const lat = spot.latitude;
    const lng = spot.longitude;
    const address = spot.address;
    const label = encodeURIComponent(spot.name);

    // Build URLs for each map app
    const getUrls = () => {
      if (lat && lng) {
        return {
          appleMaps: `maps://maps.apple.com/?q=${label}&ll=${lat},${lng}`,
          googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          waze: `waze://?ll=${lat},${lng}&navigate=yes`,
        };
      } else if (address) {
        const encodedAddress = encodeURIComponent(address);
        return {
          appleMaps: `maps://maps.apple.com/?q=${encodedAddress}`,
          googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
          waze: `waze://?q=${encodedAddress}`,
        };
      }
      return null;
    };

    const urls = getUrls();
    if (!urls) return;

    const openUrl = async (url: string, fallbackUrl?: string) => {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else if (fallbackUrl) {
        Linking.openURL(fallbackUrl);
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir l'application");
      }
    };

    const options = ['Apple Maps', 'Google Maps', 'Waze', 'Annuler'];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Ouvrir avec',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openUrl(urls.appleMaps);
          } else if (buttonIndex === 1) {
            openUrl(urls.googleMaps);
          } else if (buttonIndex === 2) {
            openUrl(urls.waze, `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
          }
        }
      );
    } else {
      // Android - use Alert as ActionSheet alternative
      Alert.alert('Ouvrir avec', undefined, [
        { text: 'Google Maps', onPress: () => openUrl(urls.googleMaps) },
        {
          text: 'Waze',
          onPress: () => openUrl(urls.waze, `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`),
        },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  return (
    <View className={`rounded-lg border p-3 ${
      spot.highlight
        ? 'bg-yellow-500/8 border-yellow-500/25'
        : 'bg-zinc-800/40 border-zinc-700/40'
    }`}>
      <View className="flex-row items-start gap-2.5">
        <Text className="text-base mt-0.5">{SPOT_EMOJI[spot.spot_type ?? ''] ?? '📍'}</Text>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1 flex-1">
              <Text className="text-sm font-medium text-white" numberOfLines={1}>{spot.name}</Text>
              {spot.highlight && <Star size={12} color="#facc15" fill="#facc15" />}
              {spot.verified && (
                <View className="bg-emerald-400/10 border border-emerald-400/20 rounded px-1">
                  <Text className="text-[10px] text-emerald-400">✓</Text>
                </View>
              )}
            </View>
            {(spot.latitude && spot.longitude || spot.address) && (
              <TouchableOpacity onPress={openMap} className="p-1">
                <Navigation size={12} color="#71717a" />
              </TouchableOpacity>
            )}
          </View>

          {spot.address && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <MapPin size={10} color="#71717a" />
              <Text className="text-xs text-zinc-500" numberOfLines={1}>{spot.address}</Text>
            </View>
          )}

          <View className="flex-row items-center gap-3 mt-1.5 flex-wrap">
            {spot.duration_minutes && (
              <View className="flex-row items-center gap-0.5">
                <Clock size={12} color="#71717a" />
                <Text className="text-xs text-zinc-500">{spot.duration_minutes} min</Text>
              </View>
            )}
            {spot.price_range && priceCfg && (
              <Text className={`text-xs font-medium ${priceCfg.color}`}>
                {spot.price_range === 'gratuit' ? '🆓 Gratuit' : `${spot.price_range} ${priceCfg.label}`}
              </Text>
            )}
            {spot.price_detail && (
              <Text className="text-xs text-zinc-500 italic">{spot.price_detail}</Text>
            )}
          </View>

          {spot.tips && (
            <Text className="text-xs text-blue-300/90 italic mt-1.5">{`💡 ${spot.tips}`}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function MealRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="text-xs text-zinc-500 w-8">{label}</Text>
      <Text className="text-xs text-zinc-300 flex-1" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function BudgetLine({ icon, label, value, currency, color }: {
  icon: string; label: string; value: string; currency: string | null; color: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className={`w-1 h-8 rounded-full ${color} opacity-80`} />
      <Text className="text-sm text-zinc-400 flex-1">{icon} {label}</Text>
      <Text className="text-sm font-semibold text-white">
        {value}{currency ? ` ${currency}` : ''}
      </Text>
    </View>
  );
}

function PracticalRow({ icon, label, value, valueClass = 'text-white' }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3 border-b border-zinc-800">
      {icon}
      <Text className="text-sm text-zinc-400 flex-1">{label}</Text>
      <Text className={`text-sm font-medium ${valueClass}`}>{value}</Text>
    </View>
  );
}

function StatCell({ icon, value, label }: {
  icon: React.ReactNode; value: string; label: string;
}) {
  return (
    <View className="flex-1 items-center gap-0.5 py-1">
      {icon}
      <Text className="text-base font-bold text-white">{value}</Text>
      <Text className="text-[10px] text-zinc-500">{label}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center py-14">
      <Info size={32} color="#52525b" style={{ opacity: 0.4 }} />
      <Text className="text-sm text-zinc-500 mt-2">{message}</Text>
    </View>
  );
}