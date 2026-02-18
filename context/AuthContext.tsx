import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, AuthError } from '@supabase/supabase-js';
import { Linking, Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'email_pending'
  | 'password_recovery'
  | 'network_error';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; emailSent: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  clearPasswordRecovery: () => void;
}

const TEST_MODE = process.env.EXPO_PUBLIC_TEST_MODE === 'true';
const TEST_USER_EMAIL = process.env.EXPO_PUBLIC_TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.EXPO_PUBLIC_TEST_USER_PASSWORD;

function sessionToUser(session: Session): User {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    emailConfirmed: !!session.user.email_confirmed_at,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const getOrigin = () => {
    if (Platform.OS === 'web') {
      return 'https://bombo.app';
    }
    return 'bombo://app';
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (TEST_MODE && TEST_USER_EMAIL && TEST_USER_PASSWORD) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(sessionToUser(session));
            setStatus('authenticated');
            return;
          }
          const { data, error } = await supabase.auth.signInWithPassword({
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
          });
          if (mounted) {
            if (data.session) {
              setUser(sessionToUser(data.session));
              setStatus('authenticated');
            } else {
              console.error('[Auth] Test login failed:', error?.message);
              setStatus('unauthenticated');
            }
          }
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          if (session?.user) {
            setUser(sessionToUser(session));
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) setStatus('network_error');
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        switch (event) {
          case 'SIGNED_IN':
            if (session) {
              setUser(sessionToUser(session));
              setStatus('authenticated');
            }
            break;
          case 'SIGNED_OUT':
            setUser(null);
            setStatus('unauthenticated');
            setIsPasswordRecovery(false);
            break;
          case 'TOKEN_REFRESHED':
            if (session) {
              setUser(sessionToUser(session));
            }
            break;
          case 'USER_UPDATED':
            if (session) {
              setUser(sessionToUser(session));
            }
            break;
          case 'PASSWORD_RECOVERY':
            if (session) {
              setUser(sessionToUser(session));
              setStatus('authenticated');
              setIsPasswordRecovery(true);
            }
            break;
          default:
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('type=recovery')) {
        setIsPasswordRecovery(true);
        setStatus('password_recovery');
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('type=recovery')) {
        setIsPasswordRecovery(true);
        setStatus('password_recovery');
      }
    });

    return () => subscription.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getOrigin()}/`,
      },
    });

    if (error) return { error, emailSent: false };

    if (data.user && data.user.identities?.length === 0) {
      return {
        error: {
          message: 'Un compte existe déjà avec cet email.',
        } as AuthError,
        emailSent: false,
      };
    }

    const emailSent = !data.session;
    if (emailSent) setStatus('email_pending');

    return { error: null, emailSent };
  }, []);

  const signOut = useCallback(async () => {
    if (TEST_MODE) {
      console.warn('[Auth] Sign-out disabled in test mode');
      return;
    }
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getOrigin()}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      status,
      isLoading,
      isAuthenticated,
      isPasswordRecovery,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      resendConfirmation,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useUser(): User | null {
  return useAuth().user;
}

export function useUserId(): string | null {
  return useAuth().user?.id ?? null;
}
