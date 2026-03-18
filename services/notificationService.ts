/**
 * services/notificationService.ts
 *
 * Gestion des notifications push et in-app :
 * - Enregistrement du token push
 * - Récupération des notifications
 * - Gestion des préférences
 * - Marquage comme lu
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch, apiPost, apiPatch, apiDelete } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'analysis_complete' | 'analysis_error' | 'content_saved';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
}

export interface NotificationData {
  type: NotificationType;
  entity_type?: 'trip' | 'city';
  entity_id?: string;
  title?: string;
  source_url?: string;
  job_id?: string;
  error_code?: string;
  error_message?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
  has_more: boolean;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  analysis_complete_push: boolean;
  analysis_error_push: boolean;
  content_saved_push: boolean;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// ── Configuration Expo Notifications ──────────────────────────────────────────

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Push Token Registration ───────────────────────────────────────────────────

/**
 * Enregistre l'appareil pour recevoir des notifications push.
 * Demande les permissions si nécessaire et envoie le token au backend.
 *
 * @returns Le token Expo ou null si l'enregistrement a échoué
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications ne fonctionnent que sur appareils physiques
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  try {
    // Vérifier les permissions existantes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Demander les permissions si pas encore accordées
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return null;
    }

    // Récupérer le projectId depuis la configuration
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('[Notifications] Missing projectId in app.json > extra > eas > projectId');
      return null;
    }

    // Récupérer le token Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('[Notifications] Got push token:', token.substring(0, 30) + '...');

    // Configurer le canal de notification pour Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5248D4',
      });
    }

    // Enregistrer le token sur le backend
    await registerPushToken(token);

    return token;
  } catch (error) {
    console.error('[Notifications] Error registering:', error);
    return null;
  }
}

/**
 * Enregistre le token push sur le backend.
 */
async function registerPushToken(token: string): Promise<void> {
  try {
    await apiPost('/notifications/push-token', {
      expo_push_token: token,
      device_type: Platform.OS,
    });
    console.log('[Notifications] Token registered on backend');
  } catch (error) {
    console.error('[Notifications] Error registering token:', error);
    throw error;
  }
}

/**
 * Désactive le token push (appelé lors du logout).
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiDelete('/notifications/push-token');
    console.log('[Notifications] Token unregistered');
  } catch (error) {
    console.error('[Notifications] Error unregistering token:', error);
  }
}

// ── Notifications API ─────────────────────────────────────────────────────────

/**
 * Récupère la liste paginée des notifications.
 */
export async function getNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>(
    `/notifications?limit=${limit}&offset=${offset}`
  );
}

/**
 * Récupère le nombre de notifications non lues.
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
  return response.unread_count;
}

/**
 * Marque une notification comme lue.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await apiPost(`/notifications/${notificationId}/read`);
}

/**
 * Marque toutes les notifications comme lues.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiPost('/notifications/read-all');
}

/**
 * Marque comme lues les notifications liées à une entité (trip ou city).
 * Appelé quand l'utilisateur consulte ou supprime l'entité.
 */
export async function markNotificationsReadByEntity(
  entityType: 'trip' | 'city',
  entityId: string
): Promise<void> {
  try {
    await apiPost(`/notifications/by-entity/${entityType}/${entityId}/read`);
    console.log(`[Notifications] Marked notifications as read for ${entityType}/${entityId}`);
  } catch (error) {
    // Ne pas bloquer si le marquage échoue
    console.error('[Notifications] Error marking notifications as read:', error);
  }
}

// ── Préférences ───────────────────────────────────────────────────────────────

/**
 * Récupère les préférences de notification de l'utilisateur.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>('/notifications/preferences');
}

/**
 * Met à jour les préférences de notification.
 */
export async function updateNotificationPreferences(
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return apiPatch<NotificationPreferences>('/notifications/preferences', updates);
}

// ── Badge ─────────────────────────────────────────────────────────────────────

/**
 * Met à jour le badge de l'application avec le nombre de notifications non lues.
 */
export async function updateBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Error setting badge count:', error);
  }
}

/**
 * Réinitialise le badge de l'application.
 */
export async function clearBadge(): Promise<void> {
  await updateBadgeCount(0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formate la date relative d'une notification.
 */
export function formatNotificationTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Hier';

  return `Il y a ${days}j`;
}

/**
 * Retourne l'icône appropriée pour le type de notification.
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'analysis_complete':
      return 'check-line';
    case 'analysis_error':
      return 'error-warning-line';
    case 'content_saved':
      return 'bookmark-line';
    default:
      return 'notification-line';
  }
}

/**
 * Retourne la couleur appropriée pour le type de notification.
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'analysis_complete':
      return '#79B881'; // Vert
    case 'analysis_error':
      return '#F87171'; // Rouge
    case 'content_saved':
      return '#5248D4'; // Violet
    default:
      return '#8C92B5';
  }
}
