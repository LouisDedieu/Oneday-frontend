/**
 * hooks/useNotificationList.ts
 *
 * Hook pour gérer la liste des notifications avec :
 * - Pagination
 * - Pull-to-refresh
 * - Marquage comme lu
 * - Infinite scroll
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from '@/services/notificationService';
import { useNotifications } from '@/context/NotificationContext';

const PAGE_SIZE = 20;

interface UseNotificationListReturn {
  /** Liste des notifications */
  notifications: Notification[];
  /** Indique si le chargement initial est en cours */
  isLoading: boolean;
  /** Indique si le refresh est en cours */
  isRefreshing: boolean;
  /** Indique si le chargement de la page suivante est en cours */
  isLoadingMore: boolean;
  /** Indique s'il y a plus de notifications à charger */
  hasMore: boolean;
  /** Nombre total de notifications */
  totalCount: number;
  /** Nombre de notifications non lues */
  unreadCount: number;
  /** Erreur éventuelle */
  error: string | null;
  /** Rafraîchit la liste depuis le début */
  refresh: () => Promise<void>;
  /** Charge la page suivante */
  loadMore: () => Promise<void>;
  /** Marque une notification comme lue */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Marque toutes les notifications comme lues */
  markAllAsRead: () => Promise<void>;
}

export function useNotificationList(): UseNotificationListReturn {
  const { decrementUnreadCount, clearUnreadCount, refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Chargement initial ──────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (offset: number = 0, replace: boolean = true) => {
    try {
      const response = await getNotifications(PAGE_SIZE, offset);

      if (replace) {
        setNotifications(response.notifications);
      } else {
        setNotifications((prev) => [...prev, ...response.notifications]);
      }

      setHasMore(response.has_more);
      setTotalCount(response.total_count);
      setUnreadCount(response.unread_count);
      setError(null);
    } catch (err) {
      console.error('[useNotificationList] Error fetching notifications:', err);
      setError('Erreur lors du chargement des notifications');
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchNotifications(0, true);
      setIsLoading(false);
    };
    load();
  }, [fetchNotifications]);

  // ── Refresh (pull-to-refresh) ───────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications(0, true);
    setIsRefreshing(false);
  }, [fetchNotifications]);

  // ── Load more (pagination) ──────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    await fetchNotifications(notifications.length, false);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, notifications.length, fetchNotifications]);

  // ── Mark as read ────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );

      // Décrémenter le compteur si la notification n'était pas déjà lue
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read_at) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        decrementUnreadCount();
      }

      // API call
      await markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('[useNotificationList] Error marking as read:', err);
      // Revert optimistic update on error
      await refresh();
    }
  }, [notifications, decrementUnreadCount, refresh]);

  // ── Mark all as read ────────────────────────────────────────────────────────

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      clearUnreadCount();

      // API call
      await markAllNotificationsAsRead();
    } catch (err) {
      console.error('[useNotificationList] Error marking all as read:', err);
      // Revert optimistic update on error
      await refresh();
      await refreshUnreadCount();
    }
  }, [clearUnreadCount, refresh, refreshUnreadCount]);

  return {
    notifications,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    totalCount,
    unreadCount,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
