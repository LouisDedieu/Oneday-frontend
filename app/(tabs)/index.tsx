/**
 * pages/Inbox.tsx
 *
 * Affiche :
 *  - Les jobs en cours d'analyse (pending / downloading / analyzing)
 *  - Les voyages terminés mais pas encore validés (done, absent de user_saved_trips)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Share2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Cpu,
  ExternalLink,
  Plus,
  Loader2,
  Map,
  MapPin,
  Trash2,
} from 'lucide-react-native';
import { apiFetch, apiDelete } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {Button} from '@/components/Button';
import AddTripModal from '@/components/AddTripModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type JobStatus = 'pending' | 'downloading' | 'analyzing' | 'done' | 'error';
type EntityType = 'trip' | 'city';

interface InboxJob {
  jobId: string;
  tripId: string | null;
  cityId: string | null;
  entityType: EntityType;
  title: string;
  sourceUrl: string;
  platform: 'tiktok' | 'instagram' | 'unknown';
  createdAt: string;
  status: JobStatus;
  progressPct: number;
  errorMessage: string | null;
  isLocal: boolean;
  highlightsCount?: number;
}

type RootStackParamList = {
  InboxTab: undefined;
  Review: { tripId: string };
};

// ── Status config — hex équivalents des classes web par statut ────────────────
// web: pending   → bg-zinc-700/50  text-zinc-400  border-zinc-600
//      downloading→ bg-blue-500/20  text-blue-300  border-blue-500/30
//      analyzing  → bg-purple-500/20 text-purple-300 border-purple-500/30
//      done       → bg-green-500/20  text-green-300  border-green-500/30
//      error      → bg-red-500/20    text-red-300    border-red-500/30
const STATUS_CONFIG: Record<JobStatus, {
  label: string;
  iconColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: React.ComponentType<{ size?: number; color: string }>;
}> = {
  pending: {
    label: 'En attente',
    iconColor: '#a1a1aa',   // zinc-400
    textColor: '#a1a1aa',
    badgeBg: '#3f3f461A',   // zinc-700 / 10 %
    badgeBorder: '#52525b', // zinc-600
    icon: Clock,
  },
  downloading: {
    label: 'Téléchargement',
    iconColor: '#93c5fd',   // blue-300
    textColor: '#93c5fd',
    badgeBg: '#3b82f633',   // blue-500 / 20 %
    badgeBorder: '#3b82f64D', // blue-500 / 30 %
    icon: Download,
  },
  analyzing: {
    label: 'Analyse IA',
    iconColor: '#d8b4fe',   // purple-300
    textColor: '#d8b4fe',
    badgeBg: '#a855f733',   // purple-500 / 20 %
    badgeBorder: '#a855f74D', // purple-500 / 30 %
    icon: Cpu,
  },
  done: {
    label: 'Terminé',
    iconColor: '#86efac',   // green-300
    textColor: '#86efac',
    badgeBg: '#22c55e33',   // green-500 / 20 %
    badgeBorder: '#22c55e4D', // green-500 / 30 %
    icon: CheckCircle2,
  },
  error: {
    label: 'Erreur',
    iconColor: '#fca5a5',   // red-300
    textColor: '#fca5a5',
    badgeBg: '#ef444433',   // red-500 / 20 %
    badgeBorder: '#ef44444D', // red-500 / 30 %
    icon: AlertCircle,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectPlatform(url: string): InboxJob['platform'] {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'unknown';
}

// ── SpinningLoader — équivalent de <Loader2 className="animate-spin" /> ───────

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

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({
                   job,
                   onPress,
                   onDelete,
                   animIndex,
                 }: {
  job: InboxJob;
  onPress: () => void;
  onDelete: () => void;
  animIndex: number;
}) {
  const cfg = STATUS_CONFIG[job.status];
  const Icon = cfg.icon;
  const isClickable = job.status === 'done' && (!!job.tripId || !!job.cityId);
  const isInProgress = ['pending', 'downloading', 'analyzing'].includes(job.status);
  const isCity = job.entityType === 'city';

  // Entrée staggerée — web: motion initial { opacity:0, x:-20 } → { opacity:1, x:0 }, delay index*0.04
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: animIndex * 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: animIndex * 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Barre de progression animée — web: motion.div width 0%→progressPct% transition duration:0.5
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: job.progressPct,
      duration: 500,
      useNativeDriver: false, // width ne supporte pas useNativeDriver
    }).start();
  }, [job.progressPct]);

  const relativeTime = (() => {
    const diff = Date.now() - new Date(job.createdAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)}j`;
  })();

  const platformEmoji =
    job.platform === 'tiktok' ? '🎵' : job.platform === 'instagram' ? '📸' : '🎬';

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={!isClickable}
        activeOpacity={isClickable ? 0.7 : 1}
        className="bg-zinc-900 rounded-xl p-4"
        style={{
          borderWidth: 1,
          // web: isClickable → hover:border-zinc-600, sinon border-zinc-800
          borderColor: isClickable ? '#52525b' : '#27272a',
        }}
      >
        <View className="flex-row items-start gap-3">
          {/* Icône plateforme */}
          <View className="w-10 h-10 rounded-lg bg-zinc-800 items-center justify-center flex-shrink-0">
            <Text style={{ fontSize: 18 }}>{platformEmoji}</Text>
          </View>

          <View className="flex-1 min-w-0">
            {/* Titre + badges */}
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 min-w-0">
                <Text className="text-white font-medium" numberOfLines={1}>
                  {job.title}
                </Text>
                {/* City preview text */}
                {isCity && job.highlightsCount && job.status === 'done' && (
                  <Text className="text-xs text-purple-400 mt-0.5">
                    {job.highlightsCount} points d'interet
                  </Text>
                )}
              </View>
              {/* Badges row */}
              <View className="flex-row items-center gap-1.5 flex-shrink-0">
                {/* Entity type badge */}
                {job.status === 'done' && (
                  <View
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isCity ? '#a855f733' : '#3b82f633',
                      borderWidth: 1,
                      borderColor: isCity ? '#a855f74D' : '#3b82f64D',
                    }}
                  >
                    {isCity ? (
                      <MapPin size={10} color="#d8b4fe" />
                    ) : (
                      <Map size={10} color="#93c5fd" />
                    )}
                    <Text style={{ fontSize: 10, fontWeight: '500', color: isCity ? '#d8b4fe' : '#93c5fd' }}>
                      {isCity ? 'Ville' : 'Voyage'}
                    </Text>
                  </View>
                )}
                {/* Status badge */}
                <View
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: cfg.badgeBg,
                    borderWidth: 1,
                    borderColor: cfg.badgeBorder,
                  }}
                >
                  <Icon size={12} color={cfg.iconColor} />
                  <Text style={{ fontSize: 10, fontWeight: '500', color: cfg.textColor }}>
                    {cfg.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* URL source */}
            <Text className="text-xs text-zinc-500 mt-0.5" numberOfLines={1}>
              {job.sourceUrl}
            </Text>

            {/* Progression — web: Loader2 animate-spin + motion.div width animée */}
            {isInProgress && (
              <View className="mt-3">
                <View className="flex-row items-center gap-2 mb-1">
                  <SpinningLoader size={12} color="#60a5fa" /* blue-400 */ />
                  <Text className="text-xs text-zinc-400">
                    {job.progressPct > 0 ? `${job.progressPct}%` : 'Traitement en cours…'}
                  </Text>
                </View>
                {job.progressPct > 0 && (
                  <View className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    {/* web: bg-gradient-to-r from-blue-500 to-purple-600 */}
                    <Animated.View
                      style={{
                        height: '100%',
                        borderRadius: 9999,
                        backgroundColor: '#3b82f6', // blue-500 (gradient simplifié)
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      }}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Message d'erreur */}
            {job.status === 'error' && job.errorMessage && (
              <Text className="text-xs text-red-400 mt-2">{job.errorMessage}</Text>
            )}

            {/* Footer : date relative + actions */}
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center gap-3">
                <Text className="text-xs text-zinc-600">{relativeTime}</Text>
                <TouchableOpacity
                  onPress={onDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="flex-row items-center gap-1"
                >
                  <Trash2 size={12} color="#ef4444" />
                  <Text className="text-xs text-red-500">Supprimer</Text>
                </TouchableOpacity>
              </View>
              {isClickable && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs" style={{ color: isCity ? '#a855f7' : '#60a5fa' }}>
                    {isCity ? 'Voir la ville' : "Voir l'itineraire"}
                  </Text>
                  <ExternalLink size={12} color={isCity ? '#a855f7' : '#60a5fa'} />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [jobs,         setJobs]         = useState<InboxJob[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // FAB — web: motion initial scale:0 → animate scale:1
  const fabScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start();
  }, []);

  const inProgressCount = jobs.filter(
    (j) => ['pending', 'downloading', 'analyzing'].includes(j.status)
  ).length;

  const loadFromDb = useCallback(async (showLoader = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const fetched = await apiFetch<InboxJob[]>('/inbox');
      const now = Date.now();
      setJobs(prev => {
        // Garde les jobs optimistes qui ne sont pas encore dans la DB (max 15s)
        const keepOptimistic = prev.filter(j =>
          j.isLocal &&
          !fetched.some(f => f.sourceUrl === j.sourceUrl) &&
          now - new Date(j.createdAt).getTime() < 15_000
        );
        return [...keepOptimistic, ...fetched];
      });
    } catch (err: any) {
      setError('Impossible de charger vos analyses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFromDb(true);
  }, [loadFromDb]);

  // Rechargement à chaque focus (retour sur l'onglet)
  useFocusEffect(useCallback(() => {
    loadFromDb(false);
  }, [loadFromDb]));

  // Polling 15s si jobs en cours
  useEffect(() => {
    if (inProgressCount === 0) return;
    const interval = setInterval(() => loadFromDb(false), 15_000);
    return () => clearInterval(interval);
  }, [inProgressCount, loadFromDb]);

  const handleJobClick = (job: InboxJob) => {
    if (job.status !== 'done') return;

    // Route based on entity type
    if (job.entityType === 'city' && job.cityId) {
      router.push(`/review/city/${job.cityId}`);
    } else if (job.tripId) {
      router.push(`/review/${job.tripId}`);
    }
  };

  const handleDeleteJob = (job: InboxJob) => {
    Alert.alert(
      'Supprimer cette analyse ?',
      `Toutes les données associées à "${job.title}" seront supprimées définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/inbox/${job.jobId}`);
              setJobs((prev) => prev.filter((j) => j.jobId !== job.jobId));
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer cette analyse.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-black">
      {/* ── Chargement initial ───────────────────────────────────────────────── */}
      {loading ? (
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top }}>
          <SpinningLoader size={32} color="#60a5fa" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.jobId}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFromDb(false)}
              tintColor="#60a5fa"
              progressViewOffset={insets.top}
            />
          }
          ListHeaderComponent={
            <>
              {/* Erreur DB */}
              {error && (
                <View
                  className="rounded-xl p-4 items-center mb-3"
                  style={{
                    backgroundColor: '#ef44441A', // red-500/10
                    borderWidth: 1,
                    borderColor: '#ef44444D',      // red-500/30
                  }}
                >
                  <AlertCircle size={24} color="#fca5a5" /* red-300 */ />
                  <Text className="text-sm text-red-300 my-2 text-center">{error}</Text>
                  <Button variant="ghost" onPress={() => loadFromDb(true)}>
                    Réessayer
                  </Button>
                </View>
              )}

              {/* Empty state — web: motion initial opacity:0 y:20 → animate opacity:1 y:0 */}
              {!error && jobs.length === 0 && (
                <View className="items-center py-16">
                  <View className="w-20 h-20 bg-zinc-800 rounded-full items-center justify-center mb-4">
                    <Share2 size={40} color="#52525b" /* zinc-600 */ />
                  </View>
                  <Text className="text-xl font-medium text-white mb-2">
                    Aucune analyse pour le moment
                  </Text>
                  <Text
                    className="text-zinc-400 text-center mb-6"
                    style={{ maxWidth: 280 }}
                  >
                    Partagez une vidéo TikTok ou Instagram pour extraire votre itinéraire
                  </Text>
                  {/* web: Button bg-gradient-to-r from-blue-600 to-purple-600 */}
                  <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#2563eb' /* blue-600 */ }}
                  >
                    <Plus size={20} color="#ffffff" />
                    <Text className="text-white font-medium">Analyser une vidéo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <JobCard
              job={item}
              onPress={() => handleJobClick(item)}
              onDelete={() => handleDeleteJob(item)}
              animIndex={index}
            />
          )}
          ListFooterComponent={
            jobs.length > 0 ? (
              <Text className="text-center text-xs text-zinc-500 pt-2">
                Les analyses terminées disparaissent une fois le voyage validé
              </Text>
            ) : null
          }
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      {/* web: fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient from-blue-600 to-purple-600 */}
      <Animated.View
        className="absolute bottom-24 right-4"
        style={{ transform: [{ scale: fabScale }] }}
      >
        <Pressable
          onPress={() => setShowAddModal(true)}
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{
            backgroundColor: '#7c3aed', // violet-700 — centre du gradient blue→purple
            shadowColor: '#7c3aed',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Sparkles size={24} color="#ffffff" />
        </Pressable>
      </Animated.View>

      {/* ── Modal ajout ─────────────────────────────────────────────────────── */}
      <AddTripModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAnalysisStarted={(url) => {
          const optimistic: InboxJob = {
            jobId: `optimistic-${Date.now()}`,
            tripId: null,
            cityId: null,
            entityType: 'trip',
            title: url,
            sourceUrl: url,
            platform: detectPlatform(url),
            createdAt: new Date().toISOString(),
            status: 'pending',
            progressPct: 0,
            errorMessage: null,
            isLocal: true,
          };
          setJobs(prev => [optimistic, ...prev]);
        }}
      />
    </View>
  );
}