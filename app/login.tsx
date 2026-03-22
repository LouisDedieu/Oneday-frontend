import React, {useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import Loader from '@/components/Loader';
import * as AppleAuthentication from 'expo-apple-authentication';
import {PrimaryButton} from '@/components/PrimaryButton';
import {useAuth} from '@/context/AuthContext';
import {SafeAreaView} from 'react-native-safe-area-context';

// ── Types ──────────────────────────────────────────────────────────────────────
type Flow = 'signin' | 'signup' | 'forgot';

// ── Error mapping ──────────────────────────────────────────────────────────────
function friendlyError(msg: string, t: (key: string) => string): string {
  if (msg.includes('Invalid login credentials')) return t('auth.emailOrPasswordIncorrect');
  if (msg.includes('Email not confirmed')) return t('auth.confirmEmailFirst');
  if (msg.includes('User already registered')) return t('auth.accountAlreadyExists');
  if (msg.includes('Password should be')) return t('auth.passwordTooShort');
  if (msg.includes('rate limit') || msg.includes('too many')) return t('auth.tooManyAttempts');
  if (msg.includes('Unable to validate') || msg.includes('network')) return t('auth.connectionFailed');
  if (msg.includes('Email link is invalid') || msg.includes('Token has expired')) return t('auth.linkExpired');
  return msg;
}

// ── Password strength ──────────────────────────────────────────────────────────
function PasswordStrength({ password, email, t }: { password: string; email: string; t: (key: string) => string }) {
  if (!password) return null;
  
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
    password.toLowerCase() !== email.toLowerCase(),
  ];
  const score = checks.filter(Boolean).length;
  const levels = [
    t('auth.strengthVeryWeak'),
    t('auth.strengthWeak'),
    t('auth.strengthMedium'),
    t('auth.strengthStrong'),
    t('auth.strengthVeryStrong'),
  ];
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];
  const color = colors[Math.min(score, 4)];

  return (
    <View className="mt-1">
      <View className="flex-row gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-sm"
            style={{ backgroundColor: i < score ? color : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </View>
      <Text className="text-[11px] text-white/50 mt-1 font-dmsans">{levels[score]}</Text>
    </View>
  );
}

// ── Field component ────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
  keyboardType?: 'email-address' | 'default';
  error?: boolean;
  suffix?: React.ReactNode;
  inputRef?: React.RefObject<TextInput | null>;
  autoCapitalize?: 'none' | 'sentences';
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  error,
  suffix,
  inputRef,
  autoCapitalize = 'none',
}: FieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.8px] font-dmsans">{label}</Text>
      <View
        className={`flex-row items-center bg-surface-secondary rounded-[10px] border ${
          error ? 'border-red-500/60' : 'border-white/10'
        }`}
      >
        <TextInput
          ref={inputRef}
          className="flex-1 text-white text-sm px-[14px] py-3"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {suffix && <View className="absolute right-3">{suffix}</View>}
      </View>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, resendConfirmation } = useAuth();
  const { t } = useTranslation();

  const [flow, setFlow] = useState<Flow>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resending, setResending] = useState(false);

  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url?.includes('confirmed=true')) {
        setSuccessMsg(t('auth.emailConfirmed'));
      }
    });
  }, [t]);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [flow]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (flow === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(friendlyError(error.message, t));
      } else if (flow === 'signup') {
        if (password.length < 8) {
          setError(t('auth.passwordTooShort'));
          setLoading(false);
          return;
        }
        if (password.toLowerCase() === email.toLowerCase()) {
          setError(t('auth.passwordCannotBeEmail'));
          setLoading(false);
          return;
        }
        const { error, emailSent: sent } = await signUp(email, password);
        if (error) {
          setError(friendlyError(error.message, t));
        } else if (sent) {
          setEmailSent(true);
        }
      } else if (flow === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(friendlyError(error.message, t));
        } else {
          setResetSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await resendConfirmation(email);
    setResending(false);
    if (error) {
      setError(friendlyError(error.message, t));
    } else {
      setSuccessMsg(t('auth.emailResent'));
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    setSocialLoading(false);
    if (error) setError(t('auth.googleLoginFailed'));
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError(null);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error && !error.message.includes('cancelled')) {
      setError(t('auth.appleLoginFailed'));
    }
  };

  // ── Email envoyé (signup) ──────────────────────────────────────────────────
  if (emailSent) {
    return (
      <View className="center-content p-6">
        <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-blue-500/15 border border-blue-500/30">
          <Icon name="mail-check-line" size={28} color="#60a5fa" />
        </View>
        <Text className="text-xl font-bold text-white mb-2.5 text-center font-righteous">{t('authGuard.confirmYourEmail')}</Text>
        <Text className="text-sm text-white/50 text-center leading-[22px] mb-6 font-dmsans">
          {t('auth.confirmationEmailSent', { email })}
        </Text>
        <View className="bg-surface-secondary border border-white/10 rounded-[20px] p-5 gap-4 w-full">
          <Text className="text-xs text-white/50 text-center font-dmsans">{t('auth.resendEmail')}</Text>
          <TouchableOpacity
            className={`border border-white/10 rounded-[10px] h-11 items-center justify-center px-4 ${resending ? 'opacity-60' : ''}`}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.8}
          >
            {resending ? (
              <Loader size={24} color="#a1a1aa" />
            ) : (
              <Text className="text-white/80 text-[13px] font-medium font-dmsans">{t('auth.resendEmail')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { setEmailSent(false); setFlow('signin'); }}>
          <Text className="text-[13px] text-white/50 mt-4 font-dmsans">{t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Reset envoyé ───────────────────────────────────────────────────────────
  if (resetSent) {
    return (
      <View className="center-content p-6">
        <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-emerald-500/15 border border-emerald-500/30">
          <Icon name="mail-send-line" size={28} color="#34d399" />
        </View>
        <Text className="text-xl font-bold text-white mb-2.5 text-center font-righteous">{t('auth.passwordUpdated')}</Text>
        <Text className="text-sm text-white/50 text-center leading-[22px] mb-6 font-dmsans">
          {t('auth.passwordResetSent', { email })}
        </Text>
        <TouchableOpacity onPress={() => { setResetSent(false); setFlow('signin'); }}>
          <Text className="text-[13px] font-dmsans-medium text-white/50 mt-4">← {t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form titles ─────────────────────────────────────────────────────────────
  const titles: Record<Flow, string> = {
    signin: t('auth.logIn'),
    signup: t('auth.createAccount'),
    forgot: t('auth.passwordRecovery'),
  };

  const subtitles: Record<Flow, string> = {
    signin: t('auth.connectToAccess'),
    signup: t('auth.joinUs'),
    forgot: t('auth.enterEmailForReset'),
  };

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View className="items-center mb-7">
          <Text className="text-2xl font-bold text-white mb-1 font-righteous">{titles[flow]}</Text>
          <Text className="text-[13px] text-white/50 text-center font-dmsans">{subtitles[flow]}</Text>
        </View>

        {/* Card */}
        <View className="bg-surface-secondary border border-white/10 rounded-[20px] p-5 gap-4">
          {/* Success banner */}
          {successMsg && (
            <View className="flex-row items-start gap-2.5 rounded-[10px] px-[14px] py-3 bg-emerald-500/10 border border-emerald-500/20">
              <Icon name="checkbox-circle-line" size={16} color="#34d399" />
              <Text className="text-emerald-400 text-[13px] flex-1 leading-[18px] font-dmsans">{successMsg}</Text>
            </View>
          )}

          {/* Back arrow (forgot) */}
          {flow === 'forgot' && (
            <TouchableOpacity className="flex-row items-center gap-1.5" onPress={() => setFlow('signin')} activeOpacity={0.7}>
              <Icon name="arrow-left-line" size={14} color="#71717a" />
              <Text className="label-micro">{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          )}

          {/* Email */}
          <Field
            label={t('auth.emailLabel')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoComplete="email"
            error={!!error}
            inputRef={emailRef}
          />

          {/* Password (sauf forgot) */}
          {flow !== 'forgot' && (
            <View>
              <Field
                label={t('auth.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry={!showPass}
                autoComplete={flow === 'signup' ? 'new-password' : 'password'}
                error={!!error}
                suffix={
                  <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Icon name={showPass ? 'eye-off-line' : 'eye-line'} size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                }
              />
              {flow === 'signup' ? (
                <View className="mt-2">
                  <PasswordStrength password={password} email={email} t={t} />
                </View>
              ) : (
                <TouchableOpacity onPress={() => setFlow('forgot')} activeOpacity={0.7} className="mt-2">
                  <Text className="text-xs text-white/50 text-right font-dmsans">{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2 rounded-[8px] h-10 mt-1 ${resending ? 'opacity-60' : 'bg-accent/20 border border-accent/40'}`}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.8}
          >
            {resending ? (
              <Loader size={20} color="#a1a1aa" />
            ) : (
              <>
                <Icon name="refresh-line" size={16} color="#8b8bf5" />
                <Text className="text-[#8b8bf5] text-[13px] font-medium font-dmsans">{t('auth.resendConfirmationEmail')}</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Error banner */}
          {error && (
            <View className="gap-2.5 rounded-[10px] px-[14px] py-3 bg-red-500/10 border border-red-500/20">
              <View className="flex-row items-start gap-2.5">
                <Icon name={'alert-fill'} size={16} color="#f87171" />
                <Text className="text-red-400 text-[13px] flex-1 leading-[18px] font-dmsans">{error}</Text>
              </View>
              {error === t('auth.confirmEmailFirst') && (
                <TouchableOpacity
                  className={`flex-row items-center justify-center gap-2 rounded-[8px] h-10 mt-1 ${resending ? 'opacity-60' : 'bg-accent/20 border border-accent/40'}`}
                  onPress={handleResend}
                  disabled={resending}
                  activeOpacity={0.8}
                >
                  {resending ? (
                    <Loader size={20} color="#a1a1aa" />
                  ) : (
                    <>
                      <Icon name="refresh-line" size={16} color="#8b8bf5" />
                      <Text className="text-accent text-[13px] font-medium font-dmsans">{t('auth.resendConfirmationEmail')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Submit */}
          <PrimaryButton
            title={flow === 'signin' ? t('auth.signIn') : flow === 'signup' ? t('auth.createAccount') : t('auth.sendResetLink')}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
          />

          {/* Social login (signin + signup) */}
          {flow !== 'forgot' && (
            <>
              <TouchableOpacity
                className={`flex-row items-center justify-center gap-3 border border-white/10 bg-surface-secondary rounded-[10px] h-[46px] ${socialLoading ? 'opacity-50' : ''}`}
                onPress={handleGoogleSignIn}
                disabled={socialLoading || loading || appleLoading}
                activeOpacity={0.8}
              >
                {socialLoading ? (
                  <Loader size={24} color="#a1a1aa" />
                ) : (
                  <>
                    <Icon name="google-fill" size={18} color="#fff" />
                    <Text className="text-white/80 text-[15px] font-medium font-dmsans">{t('auth.continueWithGoogle')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {appleAvailable && (
                <TouchableOpacity
                  className={`flex-row items-center justify-center gap-3 border border-white/10 bg-surface-secondary rounded-[10px] h-[46px] ${appleLoading ? 'opacity-50' : ''}`}
                  onPress={handleAppleSignIn}
                  disabled={appleLoading || loading || socialLoading}
                  activeOpacity={0.8}
                >
                  {appleLoading ? (
                    <Loader size={24} color="#a1a1aa" />
                  ) : (
                    <>
                      <Icon name="apple-fill" size={18} color="#fff" />
                      <Text className="text-white/80 text-[15px] font-medium font-dmsans">{t('auth.continueWithApple')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Footer links */}
          <View className="gap-3">
            {flow === 'signin' && (
              <>
                <View className="flex-row items-center gap-2.5">
                  <View className="flex-1 h-px bg-white/10" />
                  <Text className="text-white/30 text-xs font-dmsans">{t('common.or')}</Text>
                  <View className="flex-1 h-px bg-white/10" />
                </View>
                <TouchableOpacity onPress={() => setFlow('signup')} activeOpacity={0.7}>
                  <Text className="text-white/50 text-[13px] text-center font-dmsans">
                    {t('auth.noAccount')}
                    <Text className="text-blue-400 font-dmsans-semibold">{t('auth.signUp')}</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {flow === 'signup' && (
              <>
                <View className="flex-row items-center gap-2.5">
                  <View className="flex-1 h-px bg-white/10" />
                  <Text className="text-white/30 text-xs font-dmsans">{t('common.or')}</Text>
                  <View className="flex-1 h-px bg-white/10" />
                </View>
                <TouchableOpacity onPress={() => setFlow('signin')} activeOpacity={0.7}>
                  <Text className="text-white/50 text-[13px] text-center font-dmsans">
                    {t('auth.alreadyHaveAccount')}
                    <Text className="text-blue-400 font-dmsans-semibold">{t('auth.signIn')}</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* legal */}
          <Text className="text-center text-[11px] text-white/30 mt-4 font-dmsans">
            {t('auth.termsAgreement')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}