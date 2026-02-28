import '../styles/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import { Toaster } from 'sonner-native';
import { AuthProvider } from '@/context/AuthContext';
import { useAuthGuardState, LoadingScreen, NetworkErrorScreen, EmailPendingScreen } from '@/components/AuthGuard';
import DebugPanel from '../components/DebugPanel';
import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncJwtToSharedStorage } from '@/lib/syncJwtToSharedStorage';
import { useAndroidShareHandler } from '@/hooks/useAndroidShareHandler';

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
    <Stack screenOptions={{ headerShown: false }}>
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
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

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

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" />
        <AuthProvider key={retryKey}>
          <AuthGate onRetry={handleRetry} />
          <Toaster position="top-center" />
          {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && <DebugPanel />}
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}