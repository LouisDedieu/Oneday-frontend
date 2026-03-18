/**
 * NotificationCenter - Centre de notifications en bottom sheet
 * Affiche la liste des notifications avec actions
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useNotificationList } from '@/hooks/useNotificationList';
import {
  Notification,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationColor,
  NotificationData,
} from '@/services/notificationService';
import { SecondaryButton } from '@/components/SecondaryButton';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    notifications,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    unreadCount,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotificationList();

  // Navigation vers le contenu de la notification
  const handleNotificationPress = (notification: Notification) => {
    // Marquer comme lu
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Naviguer vers le contenu
    const data = notification.data as NotificationData;

    onClose();

    setTimeout(() => {
      switch (data.type) {
        case 'analysis_complete':
          if (data.entity_type === 'city' && data.entity_id) {
            router.push(`/review/${data.entity_id}?type=city` as const);
          } else if (data.entity_type === 'trip' && data.entity_id) {
            router.push(`/review/${data.entity_id}` as const);
          }
          break;

        case 'analysis_error':
          router.push('/' as const);
          break;

        case 'content_saved':
          router.push('/trips' as const);
          break;
      }
    }, 300);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at;
    const iconName = getNotificationIcon(item.type) as IconName;
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatNotificationTime(item.created_at)}
          </Text>
        </View>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="notification-off-line" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>Aucune notification</Text>
        <Text style={styles.emptySubtext}>
          Vous recevrez des notifications quand vos analyses seront terminées
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllAsRead}
                  style={styles.markAllButton}
                >
                  <Text style={styles.markAllText}>Tout lire</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close-line" size={22} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Drag indicator */}
          <View style={styles.dragIndicator} />

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={renderFooter}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refresh}
                  tintColor={colors.textPrimary}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              contentContainerStyle={notifications.length === 0 && styles.emptyList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    backgroundColor: 'rgba(30, 26, 100, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Righteous',
    color: '#FAFAFF',
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#FAFAFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 13,
    color: colors.accent,
    fontFamily: 'DMSans-Medium',
  },
  closeButton: {
    padding: 4,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'DMSans-SemiBold',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(82, 72, 212, 0.1)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-SemiBold',
    color: '#FAFAFF',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 13,
    fontFamily: 'DMSans',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    fontFamily: 'DMSans',
    color: colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
