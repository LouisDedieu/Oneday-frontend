/**
 * components/AuthGuard.tsx - Auth screens with glassmorphism design
 *
 * Handles: Loading, Network error, Email pending, Unauthenticated redirect
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-remix-icon';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import { PrimaryButton } from '@/components/PrimaryButton';

// ── Loading Screen ─────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View className="center-content">
      <Loader size={48} />
      <Text className="text-white/50 mt-3 text-sm">Connexion en cours…</Text>
    </View>
  );
}

// ── Network Error Screen ───────────────────────────────────────────────────────
export function NetworkErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="center-content px-6">
      <View className="w-14 h-14 rounded-full items-center justify-center mb-4 bg-red-500/15 border border-red-500/30">
        <Icon name="wifi-off-line" size={24} color="#f87171" />
      </View>
      <Text className="text-white font-semibold mb-2 text-center">Connexion impossible</Text>
      <Text className="text-white/50 text-sm text-center leading-5 mb-6">
        Impossible de joindre les serveurs.{'\n'}Vérifiez votre connexion internet.
      </Text>
      <PrimaryButton title="Réessayer" onPress={onRetry} leftIcon="refresh-line" />
    </View>
  );
}

// ── Email Pending Screen ───────────────────────────────────────────────────────
export function EmailPendingScreen() {
  const router = useRouter();
  
  return (
    <View className="center-content px-6">
      <View className="w-14 h-14 rounded-full items-center justify-center mb-4 bg-blue-500/15 border border-blue-500/30">
        <Icon name="mail-check-line" size={24} color="#60a5fa" />
      </View>
      <Text className="text-white font-semibold mb-2 text-center">Confirmez votre email</Text>
      <Text className="text-white/50 text-sm text-center leading-5 mb-6">
        Un email de confirmation vous a été envoyé.{'\n'}Cliquez sur le lien pour activer votre compte.
      </Text>
      <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.7}>
        <Text className="text-white/50 text-sm">Retour à la connexion</Text>
      </TouchableOpacity>
      <PrimaryButton title="Retour à la connexion" onPress={() => router.replace('/login')} leftIcon="arrow-left-line" className="mt-4" />
    </View>
  );
}

// ── AuthGuard Hook ─────────────────────────────────────────────────────────────
export function useAuthGuardState(): {
  group: 'loading' | 'network_error' | 'email_pending' | 'auth' | 'main';
  isPasswordRecovery: boolean;
} {
  const { status, isPasswordRecovery } = useAuth();

  if (status === 'loading') return { group: 'loading', isPasswordRecovery };
  if (status === 'network_error') return { group: 'network_error', isPasswordRecovery };
  if (status === 'email_pending') return { group: 'email_pending', isPasswordRecovery };
  if (status === 'unauthenticated' || status === 'password_recovery') {
    return { group: 'auth', isPasswordRecovery };
  }
  return { group: 'main', isPasswordRecovery };
}
