/**
 * context/NotificationContext.tsx
 *
 * Gestion globale des notifications :
 * - Enregistrement du token push après authentification
 * - Compteur de notifications non lues
 * - Écoute des notifications reçues (foreground)
 * - Navigation vers le contenu quand l'utilisateur tap une notification
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useAuth } from './AuthContext';
import {
  registerForPushNotifications,
  markNotificationsReadByEntity,
  NotificationData,
} from '@/services/notificationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationContextType {
  /** Nombre de notifications non lues */
  unreadCount: number;
  /** Rafraîchit le compteur de notifications non lues */
  refreshUnreadCount: () => Promise<void>;
  /** Décrémente le compteur (appelé quand on marque une notification comme lue) */
  decrementUnreadCount: () => void;
  /** Réinitialise le compteur à 0 (appelé quand on marque tout comme lu) */
  clearUnreadCount: () => void;
  /** Indique si les notifications push sont activées */
  pushEnabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Références pour les listeners
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ── Enregistrement du token push ────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const registerPush = async () => {
      try {
        const token = await registerForPushNotifications();
        setPushEnabled(!!token);

        if (token) {
          console.log('[NotificationContext] Push notifications enabled');
        }
      } catch (error) {
        console.error('[NotificationContext] Error registering push:', error);
        setPushEnabled(false);
      }
    };

    registerPush();
  }, [isAuthenticated, user?.id]);

  // ── Compteur de non-lues (désactivé pour l'instant) ────────────────────────

  const refreshUnreadCount = useCallback(async () => {
    // Désactivé pour l'instant
  }, []);

  const decrementUnreadCount = useCallback(() => {
    // Désactivé pour l'instant
  }, []);

  const clearUnreadCount = useCallback(() => {
    // Désactivé pour l'instant
  }, []);

  // ── Gestion du tap sur une notification ─────────────────────────────────────

  const handleNotificationTap = useCallback(async (data: NotificationData | null) => {
    if (!data || !data.type) return;

    console.log('[NotificationContext] Notification tapped:', data);

    // Marquer la notification comme lue quand on clique dessus
    if (data.entity_type && data.entity_id) {
      markNotificationsReadByEntity(data.entity_type, data.entity_id);
    }

    switch (data.type) {
      case 'analysis_complete':
        // Naviguer vers l'écran de review du trip ou de la city
        if (data.entity_type === 'city' && data.entity_id) {
          router.push(`/review/${data.entity_id}?type=city` as never);
        } else if (data.entity_type === 'trip' && data.entity_id) {
          router.push(`/review/${data.entity_id}` as never);
        } else {
          // Fallback: aller à l'inbox
          router.push('/' as never);
        }
        break;

      case 'analysis_error':
        // Aller à l'inbox pour voir l'erreur
        router.push('/' as never);
        break;

      case 'content_saved':
        // Aller aux contenus sauvegardés
        router.push('/trips' as never);
        break;

      default:
        // Par défaut, aller à l'inbox
        router.push('/' as never);
    }
  }, [router]);

  // ── Écoute des notifications ────────────────────────────────────────────────

  useEffect(() => {
    // Notification reçue pendant que l'app est ouverte
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[NotificationContext] Notification received:', notification.request.content.title);
      }
    );

    // L'utilisateur a tapé sur une notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const rawData = response.notification.request.content.data;
        const data = rawData as unknown as NotificationData;
        handleNotificationTap(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationTap]);

  // ── Vérifier si l'app a été ouverte via une notification ────────────────────

  useEffect(() => {
    const checkInitialNotification = async () => {
      // Récupérer la notification qui a ouvert l'app (si applicable)
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        const rawData = response.notification.request.content.data;
        const data = rawData as unknown as NotificationData;

        // Petit délai pour s'assurer que la navigation est prête
        setTimeout(() => {
          handleNotificationTap(data);
        }, 500);
      }
    };

    if (isAuthenticated) {
      checkInitialNotification();
    }
  }, [isAuthenticated, handleNotificationTap]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        clearUnreadCount,
        pushEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside <NotificationProvider>');
  }
  return ctx;
}
