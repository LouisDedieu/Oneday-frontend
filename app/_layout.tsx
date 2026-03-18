import '../styles/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ImageBackground, Platform } from 'react-native';
import { Toaster } from 'sonner-native';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { useAuthGuardState, LoadingScreen, NetworkErrorScreen, EmailPendingScreen } from '@/components/AuthGuard';
import DebugPanel from '../components/DebugPanel';
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncJwtToSharedStorage } from '@/lib/syncJwtToSharedStorage';
import { useAndroidShareHandler } from '@/hooks/useAndroidShareHandler';
import { useFonts, Righteous_400Regular } from '@expo-google-fonts/righteous';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import {AnalysisProvider} from "@/context/AnalysisContext";
import { initPostHog } from '@/lib/posthog';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { initI18n } from '../src/i18n/index';

SplashScreen.preventAutoHideAsync();

function AuthGate({ onRetry }: { onRetry: () => void }) {
  const { group, isPasswordRecovery } = useAuthGuardState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (group === 'loading') return;

    const inTabs = segments[0] === '(tabs)';
    const inReview = segments[0] === 'review';

    if (group === 'network_error') return; // géré via rendu conditionnel
    if (group === 'email_pending') return; // idem

    if (group === 'auth' && inTabs) {
      router.replace('/login');
    } else if (group === 'main' && isPasswordRecovery) {
      router.replace('/reset-password');
    } else if (group === 'main' && !inTabs && !inReview) {
      router.replace('/');
    }
  }, [group, isPasswordRecovery, segments]);

  if (group === 'loading') return <LoadingScreen />;
  if (group === 'network_error') return <NetworkErrorScreen onRetry={onRetry} />;
  if (group === 'email_pending') return <EmailPendingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="review/[tripId]" />
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [retryKey, setRetryKey] = useState(0);
  const [i18nReady, setI18nReady] = useState(false);
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Init i18n (runs once)
  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((err) => {
        console.error('[i18n] init failed:', err);
        setI18nReady(true);
      });
  }, []);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Righteous: Righteous_400Regular,
    DMSans: DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold': DMSans_700Bold,
  });

  // Hide splash screen once fonts and i18n are ready
  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady]);

  // Sync JWT to shared storage for iOS Share Extension
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    syncJwtToSharedStorage().catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        syncJwtToSharedStorage().catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Android share intent
  useAndroidShareHandler();

  // Track UTM parameters from deep links
  useUTMTracking();

  // Initialize PostHog analytics
  useEffect(() => {
    initPostHog();
  }, []);

  // Don't render until fonts and i18n are ready
  if (!fontsLoaded || !i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ImageBackground
        source={require('../assets/images/bg-gradient.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <StatusBar style="light" />
        <AuthProvider key={retryKey}>
          <NotificationProvider>
            <AnalysisProvider>
              <AuthGate onRetry={handleRetry} />
              <Toaster position="top-center" />
              {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && <DebugPanel />}
            </AnalysisProvider>
          </NotificationProvider>
        </AuthProvider>
      </ImageBackground>
    </SafeAreaProvider>
  );
}