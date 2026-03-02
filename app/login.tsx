/**
 * pages/Login.tsx (React Native — NativeWind)
 *
 * Port complet du Login React. Flows gérés :
 * - Sign in (avec détection "email non confirmé")
 * - Sign up (avec écran de confirmation email + renvoi)
 * - Forgot password (envoi du lien de reset)
 * - Post-confirmation return (bannière succès via Linking)
 * - Redirect vers destination initiale après login
 * - Erreurs réseau / rate-limit / génériques
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
 Linking } from 'react-native';
import { Eye, EyeOff, ArrowLeft, MailCheck, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {useAuth} from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────
type Flow = 'signin' | 'signup' | 'forgot';

// ── Error mapping ──────────────────────────────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed'))
    return 'Confirmez votre email avant de vous connecter. Vérifiez votre boîte mail.';
  if (msg.includes('User already registered'))
    return 'Un compte existe déjà avec cet email. Connectez-vous.';
  if (msg.includes('Password should be'))
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Trop de tentatives. Attendez quelques minutes avant de réessayer.';
  if (msg.includes('Unable to validate') || msg.includes('network'))
    return 'Connexion impossible. Vérifiez votre connexion internet.';
  if (msg.includes('Email link is invalid') || msg.includes('Token has expired'))
    return 'Ce lien a expiré. Demandez un nouveau lien de réinitialisation.';
  return msg;
}

// ── Password strength ──────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const levels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  return (
    <View className="mt-1">
      <View className="flex-row gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-sm"
            style={{ backgroundColor: i < score ? colors[score] : '#27272a' }}
          />
        ))}
      </View>
      <Text className="text-[11px] text-zinc-500">{levels[score]}</Text>
    </View>
  );
}

// ── Animated fade helper ───────────────────────────────────────────────────────
function FadeIn({
                  visible,
                  children,
                }: {
  visible: boolean;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;
  // opacity est une Animated.Value — doit rester en style inline
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
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
  inputRef?: React.RefObject<TextInput>;
  autoCapitalize?: 'none' | 'sentences';
}

function Field({
                 label,
                 value,
                 onChangeText,
                 placeholder,
                 secureTextEntry,
                 autoComplete,
                 keyboardType = 'default',
                 error,
                 suffix,
                 inputRef,
                 autoCapitalize = 'none',
               }: FieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.8px]">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-zinc-900 border rounded-[10px] ${
          error ? 'border-red-500/60' : 'border-zinc-800'
        }`}
      >
        <TextInput
          ref={inputRef}
          className="flex-1 text-white text-sm px-[14px] py-3"
          style={suffix ? { paddingRight: 40 } : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#52525b"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {suffix && (
          <View className="absolute right-3">{suffix}</View>
        )}
      </View>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, resendConfirmation, isAuthenticated, status } = useAuth();

  const [flow,          setFlow]         = useState<Flow>('signin');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [showPass,      setShowPass]     = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [successMsg,    setSuccessMsg]   = useState<string | null>(null);
  const [emailSent,     setEmailSent]    = useState(false);
  const [resetSent,     setResetSent]    = useState(false);
  const [resending,     setResending]    = useState(false);

  const emailRef = useRef<TextInput>(null);

  // Check if Apple Sign-In is available on this device
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Détection post-confirmation via deep link (?confirmed=true)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url?.includes('confirmed=true')) {
        setSuccessMsg('Email confirmé ! Vous pouvez maintenant vous connecter.');
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url?.includes('confirmed=true')) {
        setSuccessMsg('Email confirmé ! Vous pouvez maintenant vous connecter.');
      }
    });
    return () => sub.remove();
  }, []);

  // Redirect si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      // AppNavigator bascule automatiquement sur le groupe 'main'
      // via useAuthGuardState — pas besoin de navigation explicite.
    }
  }, [isAuthenticated]);

  // Focus email + reset erreurs au changement de flow
  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100);
    setError(null);
    setSuccessMsg(null);
  }, [flow]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (flow === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(friendlyError(error.message));
        // Le redirect est géré par AppNavigator dès que isAuthenticated passe à true

      } else if (flow === 'signup') {
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }
        const { error, emailSent: sent } = await signUp(email, password);
        if (error) {
          setError(friendlyError(error.message));
        } else if (sent) {
          setEmailSent(true);
        }

      } else if (flow === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setResetSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend confirmation ────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    const { error } = await resendConfirmation(email);
    setResending(false);
    if (error) {
      setError(friendlyError(error.message));
    } else {
      setSuccessMsg('Email renvoyé ! Vérifiez votre boîte mail.');
    }
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    setSocialLoading(false);
    if (error) setError('Connexion Google impossible. Réessayez.');
  };

  // ── Apple Sign-In ──────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError(null);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error && !error.message.includes('cancelled')) {
      setError('Connexion Apple impossible. Réessayez.');
    }
  };

  // ── Loading (vérification session initiale) ────────────────────────────────
  if (status === 'loading') {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  // ── Email envoyé (signup) ──────────────────────────────────────────────────
  if (emailSent) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        {/* Icône */}
        <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-blue-500/10 border border-blue-500/20">
          <MailCheck size={28} color="#60a5fa" />
        </View>

        <Text className="text-xl font-bold text-white mb-2.5 text-center">
          Vérifiez votre email
        </Text>
        <Text className="text-sm text-zinc-500 text-center leading-[22px] mb-6">
          Un lien de confirmation a été envoyé à{' '}
          <Text className="text-white font-semibold">{email}</Text>.
          {'\n'}Cliquez dessus pour activer votre compte.
        </Text>

        {/* Resend card */}
        <View
          className="bg-zinc-900 border border-zinc-800 rounded-[20px] p-5 gap-4 w-full"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Text className="text-xs text-zinc-500 text-center">
            Vous n'avez rien reçu ?
          </Text>
          <TouchableOpacity
            className={`border border-zinc-700 rounded-[10px] h-11 items-center justify-center px-4 ${resending ? 'opacity-60' : ''}`}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.8}
          >
            {resending
              ? <ActivityIndicator size="small" color="#a1a1aa" />
              : <Text className="text-zinc-400 text-[13px] font-medium">
                Renvoyer l'email de confirmation
              </Text>
            }
          </TouchableOpacity>

          <FadeIn visible={!!successMsg}>
            <View className="flex-row items-center gap-1.5 justify-center">
              <CheckCircle2 size={14} color="#34d399" />
              <Text className="text-emerald-400 text-xs">{successMsg}</Text>
            </View>
          </FadeIn>

          <FadeIn visible={!!error}>
            <Text className="text-red-400 text-xs text-center">{error}</Text>
          </FadeIn>
        </View>

        <TouchableOpacity onPress={() => { setEmailSent(false); setFlow('signin'); }}>
          <Text className="text-[13px] text-zinc-600 mt-4">
            Retour à la connexion
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Reset envoyé ───────────────────────────────────────────────────────────
  if (resetSent) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        {/* Icône */}
        <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-emerald-500/10 border border-emerald-500/20">
          <MailCheck size={28} color="#34d399" />
        </View>

        <Text className="text-xl font-bold text-white mb-2.5 text-center">
          Email envoyé !
        </Text>
        <Text className="text-sm text-zinc-500 text-center leading-[22px] mb-6">
          Un lien de réinitialisation a été envoyé à{' '}
          <Text className="text-white font-semibold">{email}</Text>.
          {'\n'}Le lien expire dans 24 heures.
        </Text>

        <TouchableOpacity onPress={() => { setResetSent(false); setFlow('signin'); }}>
          <Text className="text-[13px] text-zinc-600 mt-4">
            ← Retour à la connexion
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form titles / subtitles ────────────────────────────────────────────────
  const titles: Record<Flow, string> = {
    signin: 'Bon retour 👋',
    signup: 'Créer un compte',
    forgot: 'Réinitialiser le mot de passe',
  };

  const subtitles: Record<Flow, string> = {
    signin: 'Connectez-vous pour accéder à vos voyages.',
    signup: 'Rejoignez-nous pour découvrir et planifier vos voyages.',
    forgot: 'Entrez votre email pour recevoir un lien de réinitialisation.',
  };

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo / branding ── */}
        <View className="items-center mb-7">
          <View
            className="w-[52px] h-[52px] rounded-[14px] bg-blue-600 items-center justify-center mb-[14px]"
            style={{
              shadowColor: '#2563eb',
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 22 }}>✈️</Text>
          </View>
          <Text className="text-2xl font-bold text-white mb-1">{titles[flow]}</Text>
          <Text className="text-[13px] text-zinc-500 text-center">{subtitles[flow]}</Text>
        </View>

        {/* ── Card ── */}
        <View
          className="bg-zinc-900 border border-zinc-800 rounded-[20px] p-5 gap-4"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {/* Success banner */}
          <FadeIn visible={!!successMsg}>
            <View className="flex-row items-start gap-[10px] rounded-[10px] px-[14px] py-3 bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
              <Text className="text-emerald-400 text-[13px] flex-1 leading-[18px]">{successMsg}</Text>
            </View>
          </FadeIn>

          {/* Back arrow (forgot) */}
          {flow === 'forgot' && (
            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={() => setFlow('signin')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={14} color="#71717a" />
              <Text className="text-xs text-zinc-500">Retour à la connexion</Text>
            </TouchableOpacity>
          )}

          {/* Email */}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
            autoComplete="email"
            error={!!error}
            inputRef={emailRef}
          />

          {/* Password (sauf forgot) */}
          {flow !== 'forgot' && (
            <View className="gap-1.5">
              <Field
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPass}
                autoComplete={flow === 'signup' ? 'new-password' : 'password'}
                error={!!error}
                suffix={
                  <TouchableOpacity
                    onPress={() => setShowPass((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    {showPass
                      ? <EyeOff size={18} color="#52525b" />
                      : <Eye    size={18} color="#52525b" />
                    }
                  </TouchableOpacity>
                }
              />
              {/* Jauge de sécurité (signup seulement) */}
              {flow === 'signup' && <PasswordStrength password={password} />}
            </View>
          )}

          {/* Error banner */}
          <FadeIn visible={!!error}>
            <View className="flex-row items-start gap-[10px] rounded-[10px] px-[14px] py-3 bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
              <Text className="text-red-400 text-[13px] flex-1 leading-[18px]">{error}</Text>
            </View>
          </FadeIn>

          {/* Submit */}
          <TouchableOpacity
            className={`bg-blue-600 rounded-[10px] h-[46px] items-center justify-center mt-1 ${loading ? 'opacity-60' : ''}`}
            style={{
              shadowColor: '#2563eb',
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text className="text-white text-[15px] font-semibold">
                {flow === 'signin' ? 'Se connecter'
                  : flow === 'signup' ? 'Créer mon compte'
                    : 'Envoyer le lien'}
              </Text>
            }
          </TouchableOpacity>

          {/* ── Social login (signin + signup seulement) ── */}
          {flow !== 'forgot' && (
            <>
              <View className="flex-row items-center gap-2.5">
                <View className="flex-1 h-px bg-zinc-800" />
                <Text className="text-zinc-700 text-xs">ou continuer avec</Text>
                <View className="flex-1 h-px bg-zinc-800" />
              </View>

              <TouchableOpacity
                className={`flex-row items-center justify-center gap-3 border border-zinc-700 bg-zinc-900 rounded-[10px] h-[46px] ${socialLoading ? 'opacity-50' : ''}`}
                onPress={handleGoogleSignIn}
                disabled={socialLoading || loading || appleLoading}
                activeOpacity={0.8}
              >
                {socialLoading
                  ? <ActivityIndicator size="small" color="#a1a1aa" />
                  : <>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>G</Text>
                      <Text className="text-zinc-300 text-[15px] font-medium">Continuer avec Google</Text>
                    </>
                }
              </TouchableOpacity>

              {/* Apple Sign-In - Only shown on iOS devices that support it */}
              {appleAvailable && (
                <TouchableOpacity
                  className={`flex-row items-center justify-center gap-3 border border-zinc-700 bg-zinc-900 rounded-[10px] h-[46px] ${appleLoading ? 'opacity-50' : ''}`}
                  onPress={handleAppleSignIn}
                  disabled={appleLoading || loading || socialLoading}
                  activeOpacity={0.8}
                >
                  {appleLoading
                    ? <ActivityIndicator size="small" color="#a1a1aa" />
                    : <>
                        <Text style={{ fontSize: 18, color: '#fff' }}></Text>
                        <Text className="text-zinc-300 text-[15px] font-medium">Continuer avec Apple</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Footer links ── */}
          <View className="gap-3">
            {flow === 'signin' && (
              <>
                <TouchableOpacity onPress={() => setFlow('forgot')} activeOpacity={0.7}>
                  <Text className="text-zinc-400 text-[13px] text-center">
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center gap-2.5">
                  <View className="flex-1 h-px bg-zinc-800" />
                  <Text className="text-zinc-700 text-xs">ou</Text>
                  <View className="flex-1 h-px bg-zinc-800" />
                </View>

                <TouchableOpacity onPress={() => setFlow('signup')} activeOpacity={0.7}>
                  <Text className="text-zinc-400 text-[13px] text-center">
                    Pas encore de compte ?{' '}
                    <Text className="text-blue-400 font-semibold">S'inscrire</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {flow === 'signup' && (
              <TouchableOpacity onPress={() => setFlow('signin')} activeOpacity={0.7}>
                <Text className="text-zinc-400 text-[13px] text-center">
                  Déjà un compte ?{' '}
                  <Text className="text-blue-400 font-semibold">Se connecter</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Legal ── */}
        <Text className="text-center text-[11px] text-zinc-700 mt-4">
          En continuant, vous acceptez nos conditions d'utilisation.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}