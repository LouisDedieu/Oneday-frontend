/**
 * CityBudgetCard - Display city budget averages by category
 */
import React from 'react';
import { View, Text } from 'react-native';
import {
  Wallet,
  Utensils,
  Bus,
  Ticket,
  Home,
} from 'lucide-react-native';
import { CityBudget } from '@/types/api';

interface CityBudgetCardProps {
  budget: CityBudget;
}

export function CityBudgetCard({ budget }: CityBudgetCardProps) {
  const currency = budget.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency;

  const categories = [
    {
      label: 'Repas moyen',
      value: budget.food_average,
      icon: Utensils,
      color: '#f97316',
    },
    {
      label: 'Transport/jour',
      value: budget.transport_average,
      icon: Bus,
      color: '#3b82f6',
    },
    {
      label: 'Activites',
      value: budget.activities_average,
      icon: Ticket,
      color: '#a855f7',
    },
  ].filter((c) => c.value);

  return (
    <View className="bg-zinc-900 rounded-xl p-4" style={{ borderWidth: 1, borderColor: '#27272a' }}>
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center">
          <Wallet size={20} color="#4ade80" />
        </View>
        <View>
          <Text className="text-white font-semibold">Budget estimatif</Text>
          <Text className="text-zinc-500 text-xs">Moyennes par categorie</Text>
        </View>
      </View>

      {/* Daily average hero */}
      {budget.daily_average && (
        <View className="bg-zinc-800 rounded-lg p-4 mb-4">
          <Text className="text-zinc-400 text-sm">Budget journalier moyen</Text>
          <Text className="text-3xl font-bold text-white mt-1">
            ~{Math.round(budget.daily_average)}{currencySymbol}
            <Text className="text-lg text-zinc-500">/jour</Text>
          </Text>
        </View>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <View className="gap-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <View key={idx} className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${cat.color}22` }}
                  >
                    <Icon size={16} color={cat.color} />
                  </View>
                  <Text className="text-zinc-300">{cat.label}</Text>
                </View>
                <Text className="text-white font-medium">
                  ~{Math.round(cat.value!)}{currencySymbol}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Accommodation range */}
      {budget.accommodation_range && (
        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-zinc-800">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 bg-pink-500/20 rounded-full items-center justify-center">
              <Home size={16} color="#ec4899" />
            </View>
            <Text className="text-zinc-300">Hebergement</Text>
          </View>
          <Text className="text-white font-medium">{budget.accommodation_range}</Text>
        </View>
      )}
    </View>
  );
}
