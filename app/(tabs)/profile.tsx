/**
 * profile.tsx - Profile page with glassmorphism design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView, ImageBackground,
} from 'react-native';
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from 'react-native-remix-icon';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

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
  bgColor,
  borderColor,
}: {
  icon: string;
  value: number | string;
  label: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(30, 26, 100, 0.4)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: borderColor,
        padding: 14,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon as any} size={16} color="#FAFAFF" />
      </View>
      <Text className="font-righteous" style={{ fontSize: 24, fontWeight: 'bold', color: '#FAFAFF' }}>
        {value}
      </Text>
      <Text className="font-dmsans" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-gradient.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <View
          className="flex-1 justify-center items-center"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <Loader />
        </View>
      </ImageBackground>
    );
  }

  const displayName = profile?.full_name ?? profile?.username ?? user?.email ?? t('auth.signIn');
  const isTestMode = false;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, flexGrow: 1 }}
    >
      <View style={{ maxWidth: 400, marginHorizontal: 'auto', width: '100%', paddingHorizontal: 16, gap: 16 }}>

        {/* ── Carte utilisateur ── */}
        <View
          style={{
            backgroundColor: 'rgba(30, 26, 100, 0.6)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            padding: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
            {/* Avatar */}
            {profile?.avatar_url ? (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              </View>
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(96, 165, 250, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {user?.email ? (
                  <Text className="font-righteous" style={{ fontSize: 24, fontWeight: 'bold', color: '#FAFAFF' }}>
                    {initials(user.email)}
                  </Text>
                ) : (
                  <Icon name="user-line" size={28} color="#ffffff" />
                )}
              </View>
            )}

            {/* Infos */}
            <View style={{ flex: 1, minWidth: 0 }}>
              {/* Name + Badges */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 18, fontFamily: 'Righteous', fontWeight: 'bold', color: '#FAFAFF' }} numberOfLines={1}>
                  {displayName}
                </Text>

                {/* Email confirmé badge */}
                {user?.emailConfirmed ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(52, 211, 153, 0.25)',
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name="check-line" size={10} color="#34d399" />
                    <Text className="font-dmsans" style={{ color: '#34d399', fontSize: 10, fontWeight: '500' }}>{t('profile.verified')}</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(234, 179, 8, 0.25)',
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text className="font-dmsans" style={{ color: '#fbbf24', fontSize: 10, fontWeight: '500' }}>
                      {t('profile.pendingConfirmation')}
                    </Text>
                  </View>
                )}

                {/* Test mode badge */}
                {isTestMode && (
                  <View
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(168, 85, 247, 0.25)',
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text className="font-dmsans" style={{ color: '#a855f7', fontSize: 10, fontWeight: '500' }}>{t('profile.test')}</Text>
                  </View>
                )}
              </View>

              {/* Username */}
              {profile?.username && (
                <Text className="font-dmsans" style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                  @{profile.username}
                </Text>
              )}

              {/* Email */}
              <Text className="font-dmsans" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                {user?.email}
              </Text>

              {/* Bio */}
              {profile?.bio && (
                <Text className="font-dmsans" style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginTop: 8, lineHeight: 20 }}>
                  {profile.bio}
                </Text>
              )}

              {/* Member since */}
              {profile?.created_at && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <Icon name="time-line" size={12} color="rgba(255, 255, 255, 0.4)" />
                  <Text className="font-dmsans" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                    {t('profile.memberSince', { date: formatDate(profile.created_at) })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        {stats && (
          <View style={{ gap: 12 }}>
            {/* First row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon="map-pin-line"
                  value={stats.tripsCreated}
                  label={t('profile.tripsCreated')}
                  bgColor="rgba(59, 130, 246, 0.2)"
                  borderColor="rgba(59, 130, 246, 0.3)"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon="bookmark-line"
                  value={stats.tripsSaved}
                  label={t('profile.tripsSaved')}
                  bgColor="rgba(168, 85, 247, 0.2)"
                  borderColor="rgba(168, 85, 247, 0.3)"
                />
              </View>
            </View>

            {/* Second row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon="eye-line"
                  value={stats.totalViews}
                  label={t('profile.viewsReceived')}
                  bgColor="rgba(34, 197, 94, 0.2)"
                  borderColor="rgba(34, 197, 94, 0.3)"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon="movie-line"
                  value={stats.videosAnalyzed}
                  label={t('profile.videosAnalyzed')}
                  bgColor="rgba(251, 146, 60, 0.2)"
                  borderColor="rgba(251, 146, 60, 0.3)"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Language Picker ── */}
        <LanguagePicker />

        {/* ── Raccourcis ── */}
        <View
          style={{
            backgroundColor: 'rgba(30, 26, 100, 0.4)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Mes voyages sauvegardés */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.06)',
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="bookmark-line" size={16} color="rgba(255, 255, 255, 0.5)" />
              <Text className="font-dmsans" style={{ fontSize: 14, color: '#FAFAFF' }}>{t('profile.mySavedTrips')}</Text>
            </View>
            <Icon name="arrow-right-s-line" size={16} color="rgba(255, 255, 255, 0.3)" />
          </TouchableOpacity>

          {/* Analyser une nouvelle vidéo */}
          <TouchableOpacity
            onPress={() => router.push('/')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="movie-line" size={16} color="rgba(255, 255, 255, 0.5)" />
              <Text className="font-dmsans" style={{ fontSize: 14, color: '#FAFAFF' }}>{t('profile.analyzeNewVideo')}</Text>
            </View>
            <Icon name="arrow-right-s-line" size={16} color="rgba(255, 255, 255, 0.3)" />
          </TouchableOpacity>
        </View>

        {/* ── Déconnexion ── */}
        <View>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signing || isTestMode}
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: 'rgb(166,60,60)',
              borderRadius: 12,
              paddingVertical: 14,
              opacity: signing || isTestMode ? 0.4 : 1,
            }}
            activeOpacity={0.7}
          >
            {signing ? (
              <>
                <Loader size={20} color="rgba(255, 255, 255, 0.5)" />
                <Text className="font-dmsans" style={{ color: 'rgb(166,60,60)', fontWeight: '500' }}>{t('profile.signingOut')}</Text>
              </>
            ) : (
              <>
                <Icon name="logout-box-line" size={16} color="rgb(255,82,82)" />
                <Text className="font-dmsans" style={{ color: 'rgb(255,82,82)', fontWeight: '500' }}>{t('profile.signOut')}</Text>
              </>
            )}
          </TouchableOpacity>

          {isTestMode && (
            <Text className="font-dmsans" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: 8 }}>
              {t('authGuard.logoutDisabled')}
            </Text>
          )}
        </View>

      </View>
    </ScrollView>
  );
}
