import '../styles/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { AuthProvider } from '@/context/AuthContext';
import { useAuthGuardState, LoadingScreen, NetworkErrorScreen, EmailPendingScreen } from '@/components/AuthGuard';
import DebugPanel from '../components/DebugPanel';
import { useCallback, useState, useEffect } from 'react';

function AuthGate({ onRetry }: { onRetry: () => void }) {
  const { group, isPasswordRecovery } = useAuthGuardState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (group === 'loading') return;

    const inTabs = segments[0] === '(tabs)';

    if (group === 'network_error') return; // géré via rendu conditionnel
    if (group === 'email_pending') return; // idem

    if (group === 'auth' && inTabs) {
      router.replace('/login');
    } else if (group === 'main' && isPasswordRecovery) {
      router.replace('/reset-password');
    } else if (group === 'main' && !inTabs) {
      router.replace('/');
    }
  }, [group, isPasswordRecovery, segments]);

  if (group === 'loading') return <LoadingScreen />;
  if (group === 'network_error') return <NetworkErrorScreen onRetry={onRetry} />;
  if (group === 'email_pending') return <EmailPendingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" />
        <AuthProvider key={retryKey}>
          <AuthGate onRetry={handleRetry} />
          <Toaster position="top-center" />
          {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && <DebugPanel />}
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}