/**
 * TripBudgetCard - Display trip budget with total, breakdown, and savings tips
 * Modern glassmorphism design with accent colors
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from "react-native-remix-icon";

interface TripBudgetCardProps {
  totalEstimated?: string | null;
  currency?: string | null;
  perDayMin?: string | null;
  perDayMax?: string | null;
  accommodationCost?: string | null;
  foodCost?: string | null;
  transportCost?: string | null;
  activitiesCost?: string | null;
  moneySavingTips?: string[] | null;
}

export function TripBudgetCard({
  totalEstimated,
  currency = '€',
  perDayMin,
  perDayMax,
  accommodationCost,
  foodCost,
  transportCost,
  activitiesCost,
  moneySavingTips,
}: TripBudgetCardProps) {
  const { t } = useTranslation();
  const categories = [
    {
      label: t('tripBudget.accommodation'),
      value: accommodationCost,
      icon: 'building-line',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    {
      label: t('tripBudget.food'),
      value: foodCost,
      icon: 'restaurant-line',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
    },
    {
      label: t('tripBudget.transport'),
      value: transportCost,
      icon: 'car-line',
      color: '#a855f7',
      bgColor: 'rgba(168, 85, 247, 0.15)',
    },
    {
      label: t('tripBudget.activities'),
      value: activitiesCost,
      icon: 'coupon-2-line',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
    },
  ].filter((c) => c.value);

  const hasTotal = !!totalEstimated;
  const hasBreakdown = categories.length > 0;
  const hasSavingTips = moneySavingTips && moneySavingTips.length > 0;
  const hasContent = hasTotal || hasBreakdown || hasSavingTips;

  if (!hasContent) {
    return (
      <View style={styles.emptyContainer} >
        <View style={styles.emptyIconContainer}>
          <Icon name="wallet-line" size={28} color="rgba(255, 255, 255, 0.3)" />
        </View>
        <Text className={'font-dmsans'} style={styles.emptyText}>{t('tripBudget.noBudgetInfo')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Total Hero - Glassmorphism with blue accent */}
      {hasTotal && (
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconContainer}>
                <Icon name={"wallet-line"} size={20} color="#60a5fa" />
              </View>
              <Text className={'font-dmsans-bold'} style={styles.heroLabel}>{t('tripBudget.totalEstimatedBudget')}</Text>
            </View>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>{totalEstimated}</Text>
              {currency && <Text style={styles.heroCurrency}>{currency}</Text>}
            </View>
            {(perDayMin || perDayMax) && (
              <View style={styles.heroPerDay}>
                <Icon name={"funds-line"} size={14} color="#60a5fa" style={{ transform: [{ scaleY: -1 }] }} />
                <Text className={'font-dmsans'} style={styles.heroPerDayText}>
                  {perDayMin && perDayMax
                    ? `${perDayMin} – ${perDayMax} ${t('tripBudget.perDay')}`
                    : `${perDayMin || perDayMax} ${t('tripBudget.perDay')}`}
                </Text>
                {currency && <Text className={'font-dmsans'} style={styles.heroPerDayCurrency}>{currency}</Text>}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Breakdown - Cards with left accent border */}
      {hasBreakdown && (
        <View style={styles.sectionCard}>
          <Text className={'font-dmsans-bold'} style={styles.sectionTitle}>{t('tripBudget.breakdown')}</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((cat, idx) => {
              return (
                <View key={idx} style={[styles.categoryRow, idx < categories.length - 1 && styles.categoryRowBorder]}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: cat.bgColor }]}>
                      <Icon name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <Text className={'font-dmsans'} style={styles.categoryLabel}>{cat.label}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={[styles.categoryValue, { color: cat.color }]}>{cat.value}</Text>
                    <Text className={'font-dmsans'} style={styles.categoryCurrency}>{currency}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Money Saving Tips - Yellow accent */}
      {hasSavingTips && (
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipsIconContainer}>
              <Icon name={"lightbulb-line"} size={18} color="#eab308" />
            </View>
            <Text className={'font-dmsans-bold'} style={styles.tipsTitle}>{t('tripBudget.moneySavingTips')}</Text>
          </View>
          <View style={styles.tipsList}>
            {moneySavingTips!.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <Text className={'font-dmsans'} style={styles.tipEmoji}>💡</Text>
                <Text className={'font-dmsans'} style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
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
    fontFamily: 'DMSans',
  },
  heroCard: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    overflow: 'hidden',
  },
  heroContent: {
    padding: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroValue: {
    fontSize: 32,
    fontFamily: 'Righteous',
    fontWeight: 'bold',
    color: '#FAFAFF',
  },
  heroCurrency: {
    fontSize: 14,
    fontFamily: 'Righteous',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  heroPerDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  heroPerDayText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroPerDayCurrency: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  heroDecoration: {
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  sectionCard: {
    backgroundColor: 'rgba(30, 26, 100, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    gap: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  categoryValue: {
    fontSize: 14,
    fontFamily: 'Righteous',
    fontWeight: '600',
  },
  categoryCurrency: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tipsCard: {
    backgroundColor: 'rgba(30, 26, 100, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    padding: 14,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipsIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  tipsList: {
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tipEmoji: {
    fontSize: 12,
  },
  tipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
    lineHeight: 18,
  },
});
