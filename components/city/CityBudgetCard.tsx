/**
 * CityBudgetCard - Display city budget averages by category
 * Modern glassmorphism design with accent colors
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';
import { CityBudget } from '@/types/api';

interface CityBudgetCardProps {
  budget: CityBudget;
}

export function CityBudgetCard({ budget }: CityBudgetCardProps) {
  const { t } = useTranslation();
  const currency = budget.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency;

  const categories = [
    {
      label: t('cityBudget.foodAverage'),
      value: budget.food_average,
      icon: 'restaurant-line',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
    },
    {
      label: t('cityBudget.transportPerDay'),
      value: budget.transport_average,
      icon: 'bus-line',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    {
      label: t('cityBudget.activities'),
      value: budget.activities_average,
      icon: 'ticket-line',
      color: '#a855f7',
      bgColor: 'rgba(168, 85, 247, 0.15)',
    },
  ].filter((c) => c.value);

  const hasCategories = categories.length > 0;

  return (
    <View className="gap-4">
      {/* Daily average hero - Glassmorphism */}
      {budget.daily_average && (
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconContainer}>
                <Icon name="money-dollar-circle-line" size={22} color="#4ade80" />
              </View>
              <Text style={styles.heroLabel}>{t('cityBudget.dailyBudget')}</Text>
            </View>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>~{Math.round(budget.daily_average)}</Text>
              <Text style={styles.heroCurrency}>{currencySymbol}{t('cityBudget.perDay')}</Text>
            </View>
          </View>
          <View style={styles.heroDecoration} />
        </View>
      )}

      {/* Category breakdown - Cards with left accent border */}
      {hasCategories && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('cityBudget.averagesByCategory')}</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((cat, idx) => {
              return (
                <View key={idx} style={[styles.categoryRow, idx < categories.length - 1 && styles.categoryRowBorder]}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: cat.bgColor }]}>
                      <Icon name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryValue}>~{Math.round(cat.value!)}</Text>
                    <Text style={styles.categoryCurrency}>{currencySymbol}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* accommodation range - Distinct card */}
      {budget.accommodation_range && (
        <View style={styles.accommodationCard}>
          <View style={styles.accommodationHeader}>
            <View style={[styles.accommodationIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Icon name="home-4-line" size={18} color="#ec4899" />
            </View>
            <Text style={styles.accommodationTitle}>{t('cityBudget.accommodation')}</Text>
          </View>
          <View style={styles.accommodationContent}>
            <Text style={styles.accommodationLabel}>{t('cityBudget.range')}</Text>
            <Text style={styles.accommodationValue}>{budget.accommodation_range}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
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
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
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
  heroDecoration: {
    height: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
  },
  sectionCard: {
    backgroundColor: '#1e1a64',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FAFAFF',
  },
  categoryCurrency: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  accommodationCard: {
    backgroundColor: '#1e1a64',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.25)',
    padding: 14,
  },
  accommodationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  accommodationIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accommodationTitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  accommodationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accommodationLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  accommodationValue: {
    fontSize: 15,
    fontFamily: 'Righteous',
    fontWeight: '600',
    color: '#ec4899',
  },
});
