/**
 * profile.tsx - React Native version
 * Complete refactor with NativeWind, preserving all React source features
 *
 * Données réelles depuis Supabase :
 * - profiles  → username, full_name, bio
 * - trips     → nombre créés, vues totales reçues
 * - user_saved_trips → nombre sauvegardés
 * - analysis_jobs   → vidéos analysées
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  LogOut,
  MapPin,
  Bookmark,
  Eye,
  Video,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileData {
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Stats {
  tripsCreated: number;
  tripsSaved: number;
  totalViews: number;
  videosAnalyzed: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
                    icon,
                    value,
                    label,
                    color,
                  }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <View className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 items-center gap-2">
      <View className={`w-9 h-9 rounded-full items-center justify-center ${color}`}>
        {icon}
      </View>
      <Text className="text-2xl font-bold text-white">{value}</Text>
      <Text className="text-xs text-zinc-500 text-center">{label}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    fetchAll();
  }, [user?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ profile: ProfileData | null; stats: Stats }>('/profile');
      if (res.profile) setProfile(res.profile);
      setStats(res.stats);
    } catch (err) {
      console.error('[Profile] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    setSigning(true);
    await signOut();
    // AuthGuard redirigera vers /login automatiquement
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  const displayName = profile?.full_name ?? profile?.username ?? user?.email ?? 'Utilisateur';
  const isTestMode = false; // En React: import.meta.env.VITE_TEST_MODE === 'true'

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      {/* ══════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════ */}
      <View className="max-w-2xl mx-auto w-full px-4 gap-4">

        {/* ── Carte utilisateur ── */}
        <View className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
          <View className="flex-row items-start gap-4">
            {/* Avatar */}
            {profile?.avatar_url ? (
              <View className="w-16 h-16 rounded-full bg-zinc-800">
                {/* Image would go here if available */}
              </View>
            ) : (
              <View className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center">
                {user?.email ? (
                  <Text className="text-white font-bold text-lg">
                    {initials(user.email)}
                  </Text>
                ) : (
                  <UserIcon size={28} color="#ffffff" />
                )}
              </View>
            )}

            {/* Infos */}
            <View className="flex-1 min-w-0">
              {/* Name + Badges */}
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-lg font-bold text-white" numberOfLines={1}>
                  {displayName}
                </Text>

                {/* Email confirmé badge */}
                {user?.emailConfirmed ? (
                  <View className="bg-emerald-500/15 border border-emerald-500/25 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                    <CheckCircle2 size={10} color="#34d399" />
                    <Text className="text-emerald-400 text-[10px] font-medium">Vérifié</Text>
                  </View>
                ) : (
                  <View className="bg-yellow-500/15 border border-yellow-500/25 rounded-full px-2 py-0.5">
                    <Text className="text-yellow-400 text-[10px] font-medium">
                      En attente de confirmation
                    </Text>
                  </View>
                )}

                {/* Test mode badge */}
                {isTestMode && (
                  <View className="bg-purple-500/15 border border-purple-500/25 rounded-full px-2 py-0.5">
                    <Text className="text-purple-400 text-[10px] font-medium">Test</Text>
                  </View>
                )}
              </View>

              {/* Username */}
              {profile?.username && (
                <Text className="text-sm text-zinc-500 mt-0.5">@{profile.username}</Text>
              )}

              {/* Email */}
              <Text className="text-xs text-zinc-600 mt-0.5">{user?.email}</Text>

              {/* Bio */}
              {profile?.bio && (
                <Text className="text-sm text-zinc-400 mt-2 leading-5">{profile.bio}</Text>
              )}

              {/* Member since */}
              {profile?.created_at && (
                <View className="flex-row items-center gap-1 mt-2">
                  <Clock size={12} color="#52525b" />
                  <Text className="text-xs text-zinc-600">
                    Membre depuis {formatDate(profile.created_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        {stats && (
          <View className="gap-3">
            {/* First row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <StatCard
                  icon={<MapPin size={16} color="#60a5fa" />}
                  value={stats.tripsCreated}
                  label="Voyages créés"
                  color="bg-blue-500/15"
                />
              </View>
              <View className="flex-1">
                <StatCard
                  icon={<Bookmark size={16} color="#c084fc" />}
                  value={stats.tripsSaved}
                  label="Voyages sauvegardés"
                  color="bg-purple-500/15"
                />
              </View>
            </View>

            {/* Second row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <StatCard
                  icon={<Eye size={16} color="#34d399" />}
                  value={stats.totalViews}
                  label="Vues reçues"
                  color="bg-emerald-500/15"
                />
              </View>
              <View className="flex-1">
                <StatCard
                  icon={<Video size={16} color="#fb923c" />}
                  value={stats.videosAnalyzed}
                  label="Vidéos analysées"
                  color="bg-orange-500/15"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Raccourcis ── */}
        <View className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          {/* Mes voyages sauvegardés */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            className="flex-row items-center justify-between px-4 py-3.5 border-b border-zinc-800"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Bookmark size={16} color="#a1a1aa" />
              <Text className="text-sm text-white">Mes voyages sauvegardés</Text>
            </View>
            <ChevronRight size={16} color="#52525b" />
          </TouchableOpacity>

          {/* Analyser une nouvelle vidéo */}
          <TouchableOpacity
            onPress={() => router.push('/')}
            className="flex-row items-center justify-between px-4 py-3.5"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Video size={16} color="#a1a1aa" />
              <Text className="text-sm text-white">Analyser une nouvelle vidéo</Text>
            </View>
            <ChevronRight size={16} color="#52525b" />
          </TouchableOpacity>
        </View>

        {/* ── Déconnexion ── */}
        <View>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signing || isTestMode}
            className={`w-full flex-row items-center justify-center gap-2 border border-zinc-800 rounded-lg px-6 py-3 ${
              signing || isTestMode ? 'opacity-40' : ''
            }`}
            activeOpacity={0.7}
          >
            {signing ? (
              <>
                <ActivityIndicator size="small" color="#a1a1aa" />
                <Text className="text-zinc-400 font-medium">Déconnexion…</Text>
              </>
            ) : (
              <>
                <LogOut size={16} color="#a1a1aa" />
                <Text className="text-zinc-400 font-medium">Se déconnecter</Text>
              </>
            )}
          </TouchableOpacity>

          {isTestMode && (
            <Text className="text-xs text-zinc-600 text-center mt-2">
              Déconnexion désactivée en mode test
            </Text>
          )}
        </View>

      </View>
    </ScrollView>
  );
}