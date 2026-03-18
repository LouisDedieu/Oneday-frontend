/**
 * pages/ResetPassword.tsx
 *
 * Shown when user arrives via password recovery email link.
 * Supabase fires PASSWORD_RECOVERY event which sets isPasswordRecovery=true in AuthContext.
 * AuthGuard redirects here automatically.
 */

import React, {useEffect, useRef, useState} from 'react';
import {Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,} from 'react-native';
import {useRouter} from 'expo-router';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import {useAuth} from "@/context/AuthContext";
import {PrimaryButton} from '@/components/PrimaryButton';

// ─── Strength bar colors ─────────────────────────────────────────────────────
const STRENGTH_BAR_COLORS: Record<number, string> = {
  1: '#ef4444', // red-500
  2: '#f97316', // orange-500
  3: '#eab308', // yellow-500
  4: '#3b82f6', // blue-500
};

// ─── Password strength indicator ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  return (
    <View className="flex-row gap-1 mt-1.5">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{ backgroundColor: i < score ? STRENGTH_BAR_COLORS[score] : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </View>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ t }: { t: (key: string) => string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Animated.View style={{ opacity, transform: [{ scale }] }} className="items-center gap-4">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{
            backgroundColor: 'rgba(34,197,94,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(34,197,94,0.2)',
          }}
        >
          <Icon name="shield-check-fill" size={28} color="#4ade80" />
        </View>

        <View className="items-center gap-1">
          <Text className="text-xl font-bold text-white font-righteous">{t('auth.passwordUpdated')}</Text>
          <Text className="text-sm text-white/50 font-dmsans">{t('auth.redirecting')}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResetPassword() {
  const router = useRouter();
  const { t } = useTranslation();
  const { updatePassword, clearPasswordRecovery } = useAuth();

  const [password,        setPassword]        = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [success,         setSuccess]         = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused,  setConfirmFocused]  = useState(false);

  const confirmHasError = !!confirm && confirm !== password;

  const handleSubmit = async () => {
    setError(null);

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    const { error: updateError } = await updatePassword(password);
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message.includes('expired')
          ? t('auth.linkExpiredRequestNew')
          : updateError.message,
      );
    } else {
      setSuccess(true);
      setTimeout(() => {
        clearPasswordRecovery();
        router.replace('/');
      }, 2000);
    }
  };

  if (success) return <SuccessScreen t={t} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 items-center justify-center p-4">

          <View className="w-full max-w-sm">

            {/* ── Logo / heading ── */}
            <View className="items-center mb-8">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
                style={{
                  backgroundColor: '#a855f7',
                  shadowColor: '#a855f7',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Icon name="shield-check-fill" size={24} color="#ffffff" />
              </View>
              <Text className="text-2xl font-bold text-white font-righteous">{t('auth.newPassword')}</Text>
              <Text className="text-sm text-white/50 mt-1 font-dmsans">{t('auth.chooseSecurePassword')}</Text>
            </View>

            {/* ── Card ── */}
            <View 
              className="rounded-2xl p-6 gap-4"
              style={{
                backgroundColor: '#1e1a64',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >

              {/* Password field */}
              <View className="gap-1.5">
                <Text className="text-xs font-medium text-white/60 uppercase tracking-wide font-dmsans">
                  {t('auth.newPassword')}
                </Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="new-password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className="rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderColor: passwordFocused ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    hitSlop={8}
                    accessibilityLabel={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <Icon 
                      name={showPass ? 'eye-off-line' : 'eye-line'} 
                      size={16} 
                      color="rgba(255,255,255,0.5)" 
                    />
                  </Pressable>
                </View>
                <PasswordStrength password={password} />
              </View>

              {/* Confirm field */}
              <View className="gap-1.5">
                <Text className="text-xs font-medium text-white/60 uppercase tracking-wide font-dmsans">
                  {t('auth.confirmPassword')}
                </Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showPass}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="new-password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  className="rounded-lg px-3.5 py-2.5 text-sm text-white"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: confirmHasError
                      ? 'rgba(239,68,68,0.6)'
                      : confirmFocused
                        ? 'rgba(168,85,247,0.6)'
                        : 'rgba(255,255,255,0.1)',
                  }}
                />
                {confirmHasError && (
                  <Text className="text-xs text-red-400 font-dmsans">
                    {t('auth.passwordsDoNotMatch')}
                  </Text>
                )}
              </View>

              {/* Error banner */}
              {error && (
                <View
                  className="flex-row items-start rounded-lg px-3.5 py-3 gap-2.5"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.2)',
                  }}
                >
                  <Icon name="error-warning-line" size={16} color="#f87171" />
                  <Text className="text-sm text-red-400 flex-1 font-dmsans">{error}</Text>
                </View>
              )}

              {/* Submit button */}
              <PrimaryButton
                title={t('auth.updatePassword')}
                leftIcon="lock-unlock-line"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
              />

            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
