import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { TripMap } from './TripMap';
import { Destination } from '@/types/api';

const meta: Meta<typeof TripMap> = {
  title: 'Map/TripMap',
  component: TripMap,
  decorators: [
    (Story) => (
      <View style={{ height: 400, backgroundColor: '#1a1744' }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    highlightedCity: {
      control: 'select',
      options: [null, 'Paris', 'Lyon', 'Marseille', 'Bordeaux'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof TripMap>;

// Mock destinations with coordinates
const mockDestinations: Destination[] = [
  {
    id: '1',
    city: 'Paris',
    country: 'France',
    days_spent: 3,
    visit_order: 1,
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: '2',
    city: 'Lyon',
    country: 'France',
    days_spent: 2,
    visit_order: 2,
    latitude: 45.7640,
    longitude: 4.8357,
  },
  {
    id: '3',
    city: 'Marseille',
    country: 'France',
    days_spent: 2,
    visit_order: 3,
    latitude: 43.2965,
    longitude: 5.3698,
  },
];

// Mock destinations without coordinates (will geocode)
const mockDestinationsNoCoords: Destination[] = [
  {
    id: '1',
    city: 'Tokyo',
    country: 'Japan',
    days_spent: 4,
    visit_order: 1,
    latitude: null,
    longitude: null,
  },
  {
    id: '2',
    city: 'Kyoto',
    country: 'Japan',
    days_spent: 2,
    visit_order: 2,
    latitude: null,
    longitude: null,
  },
  {
    id: '3',
    city: 'Osaka',
    country: 'Japan',
    days_spent: 2,
    visit_order: 3,
    latitude: null,
    longitude: null,
  },
];

export const Default: Story = {
  args: {
    destinations: mockDestinations,
    highlightedCity: null,
  },
};

export const WithHighlight: Story = {
  args: {
    destinations: mockDestinations,
    highlightedCity: 'Lyon',
  },
};

export const SingleDestination: Story = {
  args: {
    destinations: [mockDestinations[0]],
    highlightedCity: null,
  },
};

export const NeedsGeocoding: Story = {
  args: {
    destinations: mockDestinationsNoCoords,
    highlightedCity: null,
  },
};

export const Empty: Story = {
  args: {
    destinations: [],
    highlightedCity: null,
  },
};

export const LongTrip: Story = {
  args: {
    destinations: [
      ...mockDestinations,
      {
        id: '4',
        city: 'Bordeaux',
        country: 'France',
        days_spent: 2,
        visit_order: 4,
        latitude: 44.8378,
        longitude: -0.5792,
      },
      {
        id: '5',
        city: 'Nice',
        country: 'France',
        days_spent: 3,
        visit_order: 5,
        latitude: 43.7102,
        longitude: 7.2620,
      },
    ],
    highlightedCity: null,
  },
};
