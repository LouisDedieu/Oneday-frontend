/**
 * TransportCard - Display transport/logistics timeline
 * Glassmorphism design matching the new budget and practical cards
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';

interface TransportLeg {
  id: string;
  from_location: string | null;
  to_location: string | null;
  transport_mode: string | null;
  duration: string | null;
  cost: string | null;
  tips: string | null;
}

interface TransportCardProps {
  legs: TransportLeg[];
}

const TRANSPORT_KEYS = ['plane', 'avion', 'train', 'bus', 'car', 'ferry', 'walk', 'taxi', 'metro', 'bike', 'boat'] as const;
type TransportKey = typeof TRANSPORT_KEYS[number];

const TRANSPORT_COLORS: Record<TransportKey, string> = {
  plane: '#60a5fa',
  avion: '#60a5fa',
  train: '#34d399',
  bus: '#fb923c',
  car: '#a855f7',
  ferry: '#06b6d4',
  walk: '#22c55e',
  taxi: '#facc15',
  metro: '#ec4899',
  bike: '#84cc16',
  boat: '#06b6d4',
};

const TRANSPORT_ICONS: Record<TransportKey, string> = {
  plane: 'plane-line',
  avion: 'plane-line',
  train: 'train-line',
  bus: 'bus-line',
  car: 'car-line',
  ferry: 'boat-line',
  walk: 'walk-line',
  taxi: 'taxi-line',
  metro: 'subway-line',
  bike: 'bike-line',
  boat: 'ship-line',
};

export function TransportCard({ legs }: TransportCardProps) {
  const { t } = useTranslation();

  const getTransportLabel = (mode: string | null): string => {
    const key = mode?.toLowerCase() as TransportKey;
    if (TRANSPORT_KEYS.includes(key)) {
      return t(`transport.${key}`);
    }
    return mode || t('transport.transport');
  };

  const getTransportConfig = (mode: string | null) => {
    const key = mode?.toLowerCase() as TransportKey;
    return {
      icon: TRANSPORT_ICONS[key] || 'bus-line',
      label: getTransportLabel(mode),
      color: TRANSPORT_COLORS[key] || '#60a5fa',
    };
  };

  if (legs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="caravan-line" size={28} color="rgba(255, 255, 255, 0.3)" />
        </View>
        <Text style={styles.emptyText}>{t('transport.noTransportInfo')}</Text>
      </View>
    );
  }

  const tripCount = legs.length;
  const plural = tripCount > 1 ? 's' : '';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {t('transport.tripPlanned', { count: tripCount, plural })}
      </Text>

      <View>
        {legs.map((leg, i) => {
          const from = leg.from_location || t('transport.departure');
          const to = leg.to_location || t('transport.arrival');
          const cfg = getTransportConfig(leg.transport_mode);
          
          return (
            <View key={leg.id} style={styles.legContainer}>
              {/* Timeline indicator */}
              <View style={styles.timelineColumn}>
                <View style={[styles.timelineDot, { backgroundColor: cfg.color }]}>
                  <Icon name={cfg.icon as any} size={14} color="#FFFFFF" />
                </View>
                {i < legs.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Card */}
              <View style={styles.card}>
                {/* Route */}
                <View style={styles.routeRow}>
                  <Text style={styles.routeText}>
                    {from} <Text style={styles.routeArrow}>→</Text> {to}
                  </Text>
                </View>

                {/* Transport mode badge */}
                <View style={[styles.badge, { backgroundColor: `${cfg.color}22`, borderColor: `${cfg.color}40` }]}>
                  <Icon name={cfg.icon as any} size={10} color={cfg.color} />
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>

                {/* Info row */}
                <View style={styles.infoRow}>
                  {leg.duration && (
                    <View style={styles.infoItem}>
                      <Icon name="time-line" size={12} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.infoText}>{leg.duration}</Text>
                    </View>
                  )}
                  {leg.cost && (
                    <View style={styles.infoItem}>
                      <Icon name="money-dollar-circle-line" size={12} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.infoText}>{leg.cost}</Text>
                    </View>
                  )}
                </View>

                {/* Tips */}
                {leg.tips && (
                  <View style={styles.tipsContainer}>
                    <Icon name="lightbulb-line" size={10} color="#60a5fa" />
                    <Text style={styles.tipsText}>{leg.tips}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  header: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingBottom: 8,
  },
  legContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 36,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
    minHeight: 20,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 100, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 12,
  },
  routeRow: {
    marginBottom: 8,
  },
  routeText: {
    fontSize: 14,
    fontFamily: 'Righteous',
    fontWeight: '600',
    color: '#FAFAFF',
  },
  routeArrow: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tipsText: {
    fontSize: 11,
    color: '#60a5fa',
    fontStyle: 'italic',
    flex: 1,
  },
});
