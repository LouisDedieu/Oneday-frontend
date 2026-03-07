import type { Meta, StoryObj } from '@storybook/react-native';
import { View, ScrollView, Alert } from 'react-native';
import { HighlightCard } from './HighlightCard';
import type { Highlight, HighlightCategory } from '@/types/api';

const createHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: '1',
  name: 'Le Marais',
  category: 'culture',
  description: 'Historic neighborhood with trendy boutiques and cafes',
  address: '4th arrondissement, Paris',
  price_range: '€€',
  ...overrides,
});

const meta: Meta<typeof HighlightCard> = {
  title: 'City/HighlightCard',
  component: HighlightCard,
  argTypes: {
    editable: {
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (Story) => (
      <ScrollView className="flex-1">
        <Story />
      </ScrollView>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof HighlightCard>;

export const Default: Story = {
  args: {
    highlight: createHighlight(),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const Food: Story = {
  args: {
    highlight: createHighlight({
      name: 'Chez Janou',
      category: 'food',
      subtype: 'Restaurant',
      description: 'Famous for their chocolate mousse served in a giant bowl',
      price_range: '€€',
      tips: 'Reserve in advance, ask for the terrace',
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const Nature: Story = {
  args: {
    highlight: createHighlight({
      name: 'Jardin des Tuileries',
      category: 'nature',
      subtype: 'Park',
      description: 'Beautiful garden between the Louvre and Place de la Concorde',
      price_range: 'gratuit',
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const Shopping: Story = {
  args: {
    highlight: createHighlight({
      name: 'Galeries Lafayette',
      category: 'shopping',
      subtype: 'Department Store',
      description: 'Iconic department store with stunning architecture',
      price_range: '€€€',
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const Nightlife: Story = {
  args: {
    highlight: createHighlight({
      name: 'Le Baron',
      category: 'nightlife',
      subtype: 'Club',
      description: 'Exclusive nightclub in the 8th arrondissement',
      price_range: '€€€€',
      tips: 'Dress code is strict, arrive before midnight',
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const MustSee: Story = {
  args: {
    highlight: createHighlight({
      name: 'Eiffel Tower',
      category: 'culture',
      subtype: 'Monument',
      is_must_see: true,
      description: 'Iconic iron lattice tower on the Champ de Mars',
      price_range: '€€',
      latitude: 48.8584,
      longitude: 2.2945,
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const WithLocation: Story = {
  args: {
    highlight: createHighlight({
      name: 'Sacré-Coeur',
      category: 'culture',
      subtype: 'Basilica',
      description: 'White-domed basilica at the summit of Montmartre',
      latitude: 48.8867,
      longitude: 2.3431,
      address: '35 Rue du Chevalier de la Barre, 75018 Paris',
    }),
    onPress: () => Alert.alert('Pressed'),
  },
};

export const Editable: Story = {
  args: {
    highlight: createHighlight({
      name: 'My Custom Spot',
      category: 'food',
      description: 'A personal recommendation',
    }),
    editable: true,
    onPress: () => Alert.alert('Pressed'),
    onEdit: () => Alert.alert('Edit'),
    onDelete: () => Alert.alert('Delete'),
  },
};

export const AllCategories: Story = {
  render: () => {
    const categories: HighlightCategory[] = ['food', 'culture', 'nature', 'shopping', 'nightlife', 'other'];
    return (
      <View className="gap-3">
        {categories.map((category) => (
          <HighlightCard
            key={category}
            highlight={createHighlight({
              id: category,
              name: `${category.charAt(0).toUpperCase() + category.slice(1)} Example`,
              category,
              subtype: `${category} subtype`,
              description: `This is an example ${category} highlight`,
            })}
            onPress={() => Alert.alert(`Pressed ${category}`)}
          />
        ))}
      </View>
    );
  },
};

export const PriceRanges: Story = {
  render: () => {
    const prices = ['gratuit', '€', '€€', '€€€', '€€€€'];
    return (
      <View className="gap-3">
        {prices.map((price) => (
          <HighlightCard
            key={price}
            highlight={createHighlight({
              id: price,
              name: `Price: ${price}`,
              price_range: price,
            })}
            onPress={() => Alert.alert(`Pressed ${price}`)}
          />
        ))}
      </View>
    );
  },
};
