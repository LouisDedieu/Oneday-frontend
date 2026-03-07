import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text } from 'react-native';
import { CategoryFilterChips } from './CategoryFilterChips';
import type { HighlightCategory } from '@/types/api';

const meta: Meta<typeof CategoryFilterChips> = {
  title: 'City/CategoryFilterChips',
  component: CategoryFilterChips,
  decorators: [
    (Story) => (
      <View className="flex-1">
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CategoryFilterChips>;

const sampleCounts: Record<HighlightCategory, number> = {
  food: 12,
  culture: 8,
  nature: 5,
  shopping: 3,
  nightlife: 7,
  other: 2,
};

export const Default: Story = {
  args: {
    selectedCategories: [],
    categoryCounts: sampleCounts,
    onToggle: (category) => console.log('Toggle:', category),
  },
};

export const WithSelection: Story = {
  args: {
    selectedCategories: ['food', 'culture'],
    categoryCounts: sampleCounts,
    onToggle: (category) => console.log('Toggle:', category),
  },
};

export const SingleCategory: Story = {
  args: {
    selectedCategories: ['food'],
    categoryCounts: sampleCounts,
    onToggle: (category) => console.log('Toggle:', category),
  },
};

export const LimitedCategories: Story = {
  args: {
    selectedCategories: [],
    categoryCounts: {
      food: 5,
      culture: 3,
      nature: 0,
      shopping: 0,
      nightlife: 2,
      other: 0,
    },
    onToggle: (category) => console.log('Toggle:', category),
  },
};

const InteractiveDemo = () => {
  const [selected, setSelected] = useState<HighlightCategory[]>([]);

  const handleToggle = (category: HighlightCategory) => {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <View className="gap-4">
      <CategoryFilterChips
        selectedCategories={selected}
        categoryCounts={sampleCounts}
        onToggle={handleToggle}
      />
      <View className="px-4">
        <Text className="text-zinc-400 text-sm">
          Selected: {selected.length === 0 ? 'All (none selected)' : selected.join(', ')}
        </Text>
      </View>
    </View>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

export const HighCounts: Story = {
  args: {
    selectedCategories: [],
    categoryCounts: {
      food: 156,
      culture: 89,
      nature: 234,
      shopping: 67,
      nightlife: 45,
      other: 12,
    },
    onToggle: (category) => console.log('Toggle:', category),
  },
};
