/**
 * CategoryFilterChips - Horizontal scrollable filter chips for highlight categories
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import {
  Utensils,
  Landmark,
  Trees,
  ShoppingBag,
  Moon,
  MapPin,
} from 'lucide-react-native';
import { HighlightCategory, HIGHLIGHT_CATEGORIES } from '@/types/api';

const CATEGORY_ICONS: Record<HighlightCategory, React.ComponentType<any>> = {
  food: Utensils,
  culture: Landmark,
  nature: Trees,
  shopping: ShoppingBag,
  nightlife: Moon,
  other: MapPin,
};

const CATEGORY_COLORS: Record<HighlightCategory, string> = {
  food: '#f97316', // orange-500
  culture: '#3b82f6', // blue-500
  nature: '#22c55e', // green-500
  shopping: '#ec4899', // pink-500
  nightlife: '#a855f7', // purple-500
  other: '#71717a', // zinc-500
};

interface CategoryFilterChipsProps {
  selectedCategories: HighlightCategory[];
  categoryCounts: Record<HighlightCategory, number>;
  onToggle: (category: HighlightCategory) => void;
}

export function CategoryFilterChips({
  selectedCategories,
  categoryCounts,
  onToggle,
}: CategoryFilterChipsProps) {
  const categories = Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[];

  // If no categories selected, all are shown (treat as all selected)
  const isAllSelected = selectedCategories.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      style={{ paddingVertical: 8 }}
    >
      {categories.map((key) => {
        const Icon = CATEGORY_ICONS[key];
        const color = CATEGORY_COLORS[key];
        const count = categoryCounts[key] || 0;
        const isSelected = isAllSelected || selectedCategories.includes(key);

        if (count === 0) return null;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => onToggle(key)}
            className="flex-row items-center px-2 py-1 rounded-full"
            style={{
              backgroundColor: isSelected ? `${color}33` : '#27272a',
              borderWidth: 1,
              borderColor: isSelected ? color : '#3f3f46',
            }}
          >
            <Icon size={12} color={isSelected ? color : '#71717a'} />
            <Text
              style={{ marginLeft: 4, fontSize: 11, color: isSelected ? color : '#71717a' }}
            >
              {count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export { CATEGORY_ICONS, CATEGORY_COLORS };
