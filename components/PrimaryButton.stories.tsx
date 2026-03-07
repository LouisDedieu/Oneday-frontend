import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text } from 'react-native';
import { PrimaryButton } from './PrimaryButton';

const meta: Meta<typeof PrimaryButton> = {
  title: 'Components/PrimaryButton',
  component: PrimaryButton,
  decorators: [
    (Story) => (
      <View className="flex-1 p-6 gap-6 bg-zinc-100">
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PrimaryButton>;

// ---------------------------------------------------------------------------
// Color Variations
// ---------------------------------------------------------------------------

export const ColorDefault: Story = {
  args: {
    title: 'Analyser la vidéo',
    showArrow: true,
    color: 'default',
    fullWidth: true,
  },
};

export const ColorPurple: Story = {
  args: {
    title: 'Analyser la vidéo',
    showArrow: true,
    color: 'purple',
    fullWidth: true,
  },
};

export const ColorBlue: Story = {
  args: {
    title: 'Voir en détails',
    showArrow: true,
    color: 'blue',
    fullWidth: true,
  },
};

export const ColorGreen: Story = {
  args: {
    title: 'Trip',
    leftIcon: 'login-box-line',
    color: 'green',
  },
};

// ---------------------------------------------------------------------------
// All Colors Side by Side
// ---------------------------------------------------------------------------

export const AllColors: Story = {
  render: () => (
    <View className="gap-4">
      <Text className="text-zinc-600 text-sm font-dm-sans-medium">Default (Indigo)</Text>
      <PrimaryButton title="Analyser la vidéo" showArrow color="default" fullWidth />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Purple</Text>
      <PrimaryButton title="Analyser la vidéo" showArrow color="purple" fullWidth />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Blue</Text>
      <PrimaryButton title="Voir en détails" showArrow color="blue" fullWidth />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Green</Text>
      <PrimaryButton title="Trip" leftIcon="login-box-line" color="green" />
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const SizeSmall: Story = {
  args: {
    title: 'Small Button',
    size: 'sm',
    showArrow: true,
  },
};

export const SizeDefault: Story = {
  args: {
    title: 'Default Button',
    size: 'default',
    showArrow: true,
  },
};

export const SizeLarge: Story = {
  args: {
    title: 'Large Button',
    size: 'lg',
    showArrow: true,
    fullWidth: true,
  },
};

export const SizePill: Story = {
  args: {
    title: 'Auto',
    leftIcon: 'sparkling-fill',
    size: 'pill',
  },
};

export const AllSizes: Story = {
  render: () => (
    <View className="gap-4">
      <Text className="text-zinc-600 text-sm font-dm-sans-medium">Small</Text>
      <PrimaryButton title="Small Button" size="sm" showArrow />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Default</Text>
      <PrimaryButton title="Default Button" size="default" showArrow />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Large</Text>
      <PrimaryButton title="Large Button" size="lg" showArrow fullWidth />

      <Text className="text-zinc-600 text-sm font-dm-sans-medium mt-4">Pill (for Navbar)</Text>
      <View className="flex-row gap-2">
        <PrimaryButton title="Auto" leftIcon="sparkling-fill" size="pill" color="default" />
        <PrimaryButton title="Trip" leftIcon="signpost-fill" size="pill" color="green" />
        <PrimaryButton title="City" leftIcon="building-fill" size="pill" color="blue" />
      </View>
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Icon Only (Circular)
// ---------------------------------------------------------------------------

export const IconOnly: Story = {
  args: {
    leftIcon: 'add-line',
    size: 'icon',
    color: 'default',
  },
};

export const IconOnlyAllColors: Story = {
  render: () => (
    <View className="flex-row gap-4">
      <PrimaryButton leftIcon="add-line" size="icon" color="default" />
      <PrimaryButton leftIcon="add-line" size="icon" color="purple" />
      <PrimaryButton leftIcon="heart-fill" size="icon" color="blue" />
      <PrimaryButton leftIcon="bookmark-fill" size="icon" color="green" />
    </View>
  ),
};

// ---------------------------------------------------------------------------
// With Icons
// ---------------------------------------------------------------------------

export const WithLeftIcon: Story = {
  args: {
    title: 'Save to Trip',
    leftIcon: 'bookmark-line',
    fullWidth: true,
  },
};

export const WithRightIcon: Story = {
  args: {
    title: 'Share',
    rightIcon: 'share-line',
    fullWidth: true,
  },
};

export const WithBothIcons: Story = {
  args: {
    title: 'Send Message',
    leftIcon: 'heart-line',
    rightIcon: 'send-plane-fill',
    fullWidth: true,
  },
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const Loading: Story = {
  args: {
    title: 'Loading...',
    loading: true,
    fullWidth: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled',
    disabled: true,
    fullWidth: true,
  },
};

// ---------------------------------------------------------------------------
// Design from Figma (exact reproduction)
// ---------------------------------------------------------------------------

export const FigmaDesign: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 p-6 gap-6 bg-white">
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View className="gap-6">
      <Text className="text-zinc-800 text-lg font-righteous">From Figma Design</Text>

      {/* Primary CTA */}
      <PrimaryButton
        title="Analyser la vidéo"
        showArrow
        color="default"
        fullWidth
      />

      {/* Icon button */}
      <View className="flex-row">
        <PrimaryButton leftIcon="add-line" size="icon" color="purple" />
      </View>

      {/* Small pill with icon */}
      <View className="flex-row">
        <PrimaryButton
          title="Trip"
          leftIcon="login-box-line"
          size="sm"
          color="green"
        />
      </View>

      {/* Blue variant */}
      <PrimaryButton
        title="Voir en détails"
        showArrow
        color="blue"
        fullWidth
      />
    </View>
  ),
};

// ---------------------------------------------------------------------------
// On Dark Background
// ---------------------------------------------------------------------------

export const OnDarkBackground: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 p-6 gap-6 bg-zinc-900">
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View className="gap-4">
      <PrimaryButton title="Analyser la vidéo" showArrow color="default" fullWidth />

      <View className="flex-row gap-4">
        <PrimaryButton leftIcon="add-line" size="icon" color="purple" />
        <PrimaryButton title="Trip" leftIcon="login-box-line" size="sm" color="green" />
      </View>

      <PrimaryButton title="Voir en détails" showArrow color="blue" fullWidth />
    </View>
  ),
};
