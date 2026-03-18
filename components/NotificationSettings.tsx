/**
 * NotificationSettings - Écran de préférences de notifications
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from 'react-native-remix-icon';
import { colors } from '@/constants/colors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from '@/services/notificationService';
import { useNotifications } from '@/context/NotificationContext';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingRowProps {
  icon: IconName;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: SettingRowProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingIcon}>
        <Icon name={icon} size={20} color={disabled ? colors.textMuted : colors.textSecondary} />
      </View>

      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
          {label}
        </Text>
        <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: 'rgba(255, 255, 255, 0.1)',
          true: colors.accent,
        }}
        thumbColor="#FAFAFF"
        ios_backgroundColor="rgba(255, 255, 255, 0.1)"
      />
    </View>
  );
}

export function NotificationSettings({ visible, onClose }: NotificationSettingsProps) {
  const insets = useSafeAreaInsets();
  const { pushEnabled } = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    analysis_complete_push: true,
    analysis_error_push: true,
    content_saved_push: false,
  });

  // Charger les préférences
  useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('[NotificationSettings] Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    // Optimistic update
    const previousValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));

    setIsSaving(true);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch (error) {
      console.error('[NotificationSettings] Error updating preference:', error);
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
    } finally {
      setIsSaving(false);
    }
  };

  const isPushDisabled = !preferences.push_enabled || !pushEnabled;

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
            <Text style={styles.headerTitle}>Paramètres de notifications</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close-line" size={22} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>

          {/* Drag indicator */}
          <View style={styles.dragIndicator} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Push notifications status */}
              {!pushEnabled && (
                <View style={styles.warningBox}>
                  <Icon name="error-warning-line" size={20} color="#F59E0B" />
                  <Text style={styles.warningText}>
                    Les notifications push ne sont pas disponibles sur cet appareil.
                    Vérifiez les permissions dans les réglages.
                  </Text>
                </View>
              )}

              {/* Main toggle */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Général</Text>
                <SettingRow
                  icon="notification-line"
                  label="Notifications push"
                  description="Activer les notifications push sur cet appareil"
                  value={preferences.push_enabled}
                  onValueChange={(v) => handlePreferenceChange('push_enabled', v)}
                  disabled={!pushEnabled}
                />
              </View>

              {/* Notification types */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Types de notifications</Text>

                <SettingRow
                  icon="check-double-line"
                  label="Analyse terminée"
                  description="Quand une vidéo a été analysée avec succès"
                  value={preferences.analysis_complete_push}
                  onValueChange={(v) => handlePreferenceChange('analysis_complete_push', v)}
                  disabled={isPushDisabled}
                />

                <SettingRow
                  icon="error-warning-line"
                  label="Erreur d'analyse"
                  description="Quand une analyse échoue"
                  value={preferences.analysis_error_push}
                  onValueChange={(v) => handlePreferenceChange('analysis_error_push', v)}
                  disabled={isPushDisabled}
                />

                <SettingRow
                  icon="bookmark-line"
                  label="Contenu sauvegardé"
                  description="Quand quelqu'un sauvegarde votre contenu"
                  value={preferences.content_saved_push}
                  onValueChange={(v) => handlePreferenceChange('content_saved_push', v)}
                  disabled={isPushDisabled}
                />
              </View>

              {/* Info */}
              <View style={styles.infoBox}>
                <Icon name="information-line" size={16} color={colors.textMuted} />
                <Text style={styles.infoText}>
                  Les notifications in-app sont toujours activées et apparaissent dans le centre de notifications.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Saving indicator */}
          {isSaving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.savingText}>Enregistrement...</Text>
            </View>
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Righteous',
    color: '#FAFAFF',
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
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'DMSans',
    color: '#F59E0B',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'DMSans-SemiBold',
    color: '#FAFAFF',
    marginBottom: 2,
  },
  settingLabelDisabled: {
    color: colors.textMuted,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'DMSans',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  settingDescriptionDisabled: {
    color: colors.textMuted,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'DMSans',
    color: colors.textMuted,
    lineHeight: 16,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  savingText: {
    fontSize: 13,
    fontFamily: 'DMSans',
    color: colors.textSecondary,
  },
});
