import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CityMap } from './CityMap';
import { Highlight, HighlightCategory } from '@/types/api';

const meta: Meta<typeof CityMap> = {
  title: 'Map/CityMap',
  component: CityMap,
  decorators: [
    (Story) => (
      <View style={{ height: 400, backgroundColor: '#1a1744' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CityMap>;

// Mock highlights for Paris
const mockHighlights: Highlight[] = [
  {
    id: '1',
    name: 'Tour Eiffel',
    category: 'culture',
    subtype: 'monument',
    address: 'Champ de Mars, Paris',
    description: 'Iconic iron tower',
    is_must_see: true,
    latitude: 48.8584,
    longitude: 2.2945,
  },
  {
    id: '2',
    name: 'Le Bouillon Chartier',
    category: 'food',
    subtype: 'restaurant',
    address: '7 Rue du Faubourg Montmartre, Paris',
    description: 'Historic Parisian restaurant',
    price_range: '15-25',
    latitude: 48.8744,
    longitude: 2.3426,
  },
  {
    id: '3',
    name: 'Jardin du Luxembourg',
    category: 'nature',
    subtype: 'park',
    address: 'Rue de Medicis, Paris',
    description: 'Beautiful French garden',
    is_must_see: true,
    latitude: 48.8462,
    longitude: 2.3371,
  },
  {
    id: '4',
    name: 'Le Marais Shopping',
    category: 'shopping',
    subtype: 'neighborhood',
    address: 'Le Marais, Paris',
    description: 'Trendy shopping district',
    latitude: 48.8566,
    longitude: 2.3615,
  },
  {
    id: '5',
    name: 'Rex Club',
    category: 'nightlife',
    subtype: 'club',
    address: '5 Boulevard Poissonniere, Paris',
    description: 'Famous techno club',
    latitude: 48.8713,
    longitude: 2.3485,
  },
  {
    id: '6',
    name: 'Louvre Museum',
    category: 'culture',
    subtype: 'museum',
    address: 'Rue de Rivoli, Paris',
    description: 'World-famous art museum',
    is_must_see: true,
    latitude: 48.8606,
    longitude: 2.3376,
  },
];

// Highlights without coordinates
const mockHighlightsNoCoords: Highlight[] = [
  {
    id: '1',
    name: 'Senso-ji Temple',
    category: 'culture',
    is_must_see: true,
  },
  {
    id: '2',
    name: 'Tsukiji Outer Market',
    category: 'food',
    subtype: 'market',
  },
  {
    id: '3',
    name: 'Shibuya Crossing',
    category: 'other',
    is_must_see: true,
  },
];

export const Default: Story = {
  args: {
    highlights: mockHighlights,
    cityName: 'Paris',
    country: 'France',
    cityLat: 48.8566,
    cityLon: 2.3522,
    selectedCategories: [],
    highlightedId: null,
  },
};

export const WithHighlight: Story = {
  args: {
    highlights: mockHighlights,
    cityName: 'Paris',
    country: 'France',
    cityLat: 48.8566,
    cityLon: 2.3522,
    selectedCategories: [],
    highlightedId: '1', // Tour Eiffel
  },
};

export const FilteredByCategory: Story = {
  args: {
    highlights: mockHighlights,
    cityName: 'Paris',
    country: 'France',
    cityLat: 48.8566,
    cityLon: 2.3522,
    selectedCategories: ['culture', 'nature'] as HighlightCategory[],
    highlightedId: null,
  },
};

export const FoodOnly: Story = {
  args: {
    highlights: mockHighlights,
    cityName: 'Paris',
    country: 'France',
    cityLat: 48.8566,
    cityLon: 2.3522,
    selectedCategories: ['food'] as HighlightCategory[],
    highlightedId: null,
  },
};

export const NeedsGeocoding: Story = {
  args: {
    highlights: mockHighlightsNoCoords,
    cityName: 'Tokyo',
    country: 'Japan',
    cityLat: 35.6762,
    cityLon: 139.6503,
    selectedCategories: [],
    highlightedId: null,
  },
};

export const Empty: Story = {
  args: {
    highlights: [],
    cityName: 'Paris',
    country: 'France',
    cityLat: 48.8566,
    cityLon: 2.3522,
    selectedCategories: [],
    highlightedId: null,
  },
};

// Interactive story with category filters
const InteractiveTemplate = () => {
  const [selectedCategories, setSelectedCategories] = useState<HighlightCategory[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const categories: HighlightCategory[] = ['food', 'culture', 'nature', 'shopping', 'nightlife'];

  const toggleCategory = (cat: HighlightCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', padding: 8, gap: 8, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => toggleCategory(cat)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: selectedCategories.includes(cat)
                ? '#5248D4'
                : 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12 }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <CityMap
          highlights={mockHighlights}
          cityName="Paris"
          country="France"
          cityLat={48.8566}
          cityLon={2.3522}
          selectedCategories={selectedCategories}
          highlightedId={highlightedId}
          onMarkerPress={(id) => setHighlightedId(id === highlightedId ? null : id)}
        />
      </View>
      {highlightedId && (
        <View style={{ padding: 8, backgroundColor: 'rgba(82, 72, 212, 0.2)' }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>
            Selected: {mockHighlights.find((h) => h.id === highlightedId)?.name}
          </Text>
        </View>
      )}
    </View>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTemplate />,
};
