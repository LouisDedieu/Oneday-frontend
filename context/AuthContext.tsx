import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from '../lib/supabase';
import type { AuthError, Session } from "@supabase/supabase-js";
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { syncJwtToSharedStorage } from '../lib/syncJwtToSharedStorage';

const OAUTH_REDIRECT_URI = 'oneday://auth/callback';

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "email_pending"
  | "password_recovery"
  | "network_error";

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null; emailSent: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  clearPasswordRecovery: () => void;
}

const TEST_MODE = process.env.EXPO_PUBLIC_TEST_MODE === "true";
const TEST_USER_EMAIL = process.env.EXPO_PUBLIC_TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.EXPO_PUBLIC_TEST_USER_PASSWORD;

function sessionToUser(session: Session): User {
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    emailConfirmed: !!session.user.email_confirmed_at,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const getOrigin = () => {
    if (Platform.OS === "web") {
      return "https://bombo.app";
    }
    return "bombo://app";
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (TEST_MODE && TEST_USER_EMAIL && TEST_USER_PASSWORD) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(sessionToUser(session));
            setStatus("authenticated");
            return;
          }
          const { data, error } = await supabase.auth.signInWithPassword({
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
          });
          if (mounted) {
            if (data.session) {
              setUser(sessionToUser(data.session));
              setStatus("authenticated");
            } else {
              console.error("[Auth] Test login failed:", error?.message);
              setStatus("unauthenticated");
            }
          }
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          if (session?.user) {
            setUser(sessionToUser(session));
            setStatus("authenticated");
          } else {
            setStatus("unauthenticated");
          }
        }
      } catch (err) {
        console.error("[Auth] Init error:", err);
        if (mounted) setStatus("network_error");
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_IN":
          if (session) {
            setUser(sessionToUser(session));
            setStatus("authenticated");
          }
          break;
        case "SIGNED_OUT":
          setUser(null);
          setStatus("unauthenticated");
          setIsPasswordRecovery(false);
          break;
        case "TOKEN_REFRESHED":
          if (session) {
            setUser(sessionToUser(session));
          }
          break;
        case "USER_UPDATED":
          if (session) {
            setUser(sessionToUser(session));
          }
          break;
        case "PASSWORD_RECOVERY":
          if (session) {
            setUser(sessionToUser(session));
            setStatus("authenticated");
            setIsPasswordRecovery(true);
          }
          break;
        default:
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url.includes("type=recovery")) {
        setIsPasswordRecovery(true);
        setStatus("password_recovery");
      }
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url && url.includes("type=recovery")) {
        setIsPasswordRecovery(true);
        setStatus("password_recovery");
      }
    });

    return () => subscription.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
          message: "Un compte existe déjà avec cet email.",
        } as AuthError,
        emailSent: false,
      };
    }

    const emailSent = !data.session;
    if (emailSent) setStatus("email_pending");

    return { error: null, emailSent };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: OAUTH_REDIRECT_URI,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };
      if (!data.url) return { error: new Error("No OAuth URL returned") };

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        OAUTH_REDIRECT_URI,
      );
      console.log("[Auth] WebBrowser result:", JSON.stringify(result, null, 2));

      if (result.type === "success" && result.url) {
        console.log("[Auth] Callback URL:", result.url);

        // Parse the URL - tokens can be in fragment (#) or query params (?)
        const url = new URL(result.url);
        console.log("[Auth] URL hash:", url.hash.substring(0, 50) + "...");
        const hashParams = new URLSearchParams(url.hash.substring(1));

        // Check for tokens in fragment (implicit flow)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        console.log("[Auth] Tokens found:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });

        if (accessToken && refreshToken) {
          console.log("[Auth] Setting session with tokens...");
          // Implicit flow - set session directly with tokens
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          console.log("[Auth] setSession result:", {
            hasSession: !!sessionData?.session,
            error: sessionError?.message,
          });
          if (sessionError) return { error: sessionError };

          // Manually update auth state since onAuthStateChange may not fire
          if (sessionData.session) {
            console.log("[Auth] Updating state to authenticated");
            setUser(sessionToUser(sessionData.session));
            setStatus("authenticated");
            // Sync JWT to shared storage for iOS Share Extension
            if (Platform.OS === "ios") {
              syncJwtToSharedStorage();
            }
          }
          return { error: null };
        }

        // Check for authorization code (PKCE flow)
        const code = url.searchParams.get("code");
        if (code) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) return { error: sessionError };

          // Manually update auth state since onAuthStateChange may not fire
          if (sessionData.session) {
            setUser(sessionToUser(sessionData.session));
            setStatus("authenticated");
            // Sync JWT to shared storage for iOS Share Extension
            if (Platform.OS === "ios") {
              syncJwtToSharedStorage();
            }
          }
          return { error: null };
        }

        // Check for errors
        const errorDesc =
          hashParams.get("error_description") ||
          url.searchParams.get("error_description");
        const errorCode =
          hashParams.get("error") || url.searchParams.get("error");
        return {
          error: new Error(
            errorDesc || errorCode || "No tokens or code received",
          ),
        };
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return { error: new Error("Authentication cancelled") };
      }

      return { error: new Error("Authentication failed") };
    } catch (err) {
      console.error("[Auth] Google sign-in error:", err);
      return { error: err instanceof Error ? err : new Error("Unknown error") };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      // Check if Apple Sign-In is available on this device
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { error: new Error('Apple Sign-In is not available on this device') };
      }

      // Request credentials from Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error('No identity token received from Apple') };
      }

      // Sign in with Supabase using the Apple identity token
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (sessionError) return { error: sessionError };

      // Update auth state
      if (sessionData.session) {
        setUser(sessionToUser(sessionData.session));
        setStatus('authenticated');
        // Sync JWT to shared storage for iOS Share Extension
        if (Platform.OS === 'ios') {
          syncJwtToSharedStorage();
        }
      }

      return { error: null };
    } catch (err) {
      // Handle user cancellation
      if (err instanceof Error && err.message.includes('ERR_REQUEST_CANCELED')) {
        return { error: new Error('Authentication cancelled') };
      }
      console.error('[Auth] Apple sign-in error:', err);
      return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (TEST_MODE) {
      console.warn("[Auth] Sign-out disabled in test mode");
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
      type: "signup",
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
      signInWithGoogle,
      signInWithApple,
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
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useUser(): User | null {
  return useAuth().user;
}

export function useUserId(): string | null {
  return useAuth().user?.id ?? null;
}
