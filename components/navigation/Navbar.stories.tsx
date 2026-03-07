import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Navbar } from './Navbar';

// Wrapper component that ensures consistent width
function StoryWrapper({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const navbarWidth = Math.min(width - 32, 380);

  return (
    <View style={{ width: navbarWidth }}>
      {children}
    </View>
  );
}

const meta: Meta<typeof Navbar> = {
  title: 'Navigation/Navbar',
  component: Navbar,
  decorators: [
    (Story) => (
      <View className="flex-1 items-center justify-center p-4 bg-zinc-100">
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Navbar>;

// Default tabs for primary variant
const primaryTabs = [
  { icon: 'inbox-line', label: 'Inbox' },
  { icon: 'bookmark-line', label: 'Saved' },
  { icon: 'user-line', label: 'Profile' },
];

// Tabs for secondary variant (with badges)
const secondaryTabsLarge = [
  { icon: 'map-pin-line', label: 'Trips', badge: 4 },
  { icon: 'building-line', label: 'Citys', badge: 3 },
];

// Tabs for secondary variant small (4 tabs)
const secondaryTabsSmall = [
  { icon: 'calendar-2-line', label: 'Itinéraire' },
  { icon: 'money-dollar-circle-line', label: 'Budget' },
  { icon: 'global-line', label: 'Pratique' },
  { icon: 'car-line', label: 'Transport' },
];

// Default actions for expanded mode
const defaultActions = [
  { icon: 'sparkling-fill', label: 'Auto', color: 'default' as const },
  { icon: 'signpost-fill', label: 'Trip', color: 'green' as const },
  { icon: 'building-fill', label: 'City', color: 'blue' as const },
];

// ---------------------------------------------------------------------------
// PRIMARY VARIANT
// ---------------------------------------------------------------------------

export const Default: Story = {
  render: () => <Navbar tabs={primaryTabs} activeIndex={0} />,
};

export const SecondTabActive: Story = {
  render: () => <Navbar tabs={primaryTabs} activeIndex={1} />,
};

export const ThirdTabActive: Story = {
  render: () => <Navbar tabs={primaryTabs} activeIndex={2} />,
};

export const Expanded: Story = {
  render: () => (
    <Navbar
      tabs={primaryTabs}
      activeIndex={0}
      expanded
      actions={defaultActions}
      inputPlaceholder="Coller votre lien ici..."
    />
  ),
};

export const ExpandedWithValue: Story = {
  render: () => (
    <Navbar
      tabs={primaryTabs}
      activeIndex={0}
      expanded
      actions={defaultActions}
      inputValue="https://example.com/video"
    />
  ),
};

// ---------------------------------------------------------------------------
// SECONDARY VARIANT - Large (Default)
// ---------------------------------------------------------------------------

export const SecondaryDefault: Story = {
  render: () => (
    <Navbar
      tabs={secondaryTabsLarge}
      activeIndex={0}
      variant="secondary"
    />
  ),
};

export const SecondarySecondTab: Story = {
  render: () => (
    <Navbar
      tabs={secondaryTabsLarge}
      activeIndex={1}
      variant="secondary"
    />
  ),
};

// ---------------------------------------------------------------------------
// SECONDARY VARIANT - Small
// ---------------------------------------------------------------------------

export const SecondarySmall: Story = {
  render: () => (
    <Navbar
      tabs={secondaryTabsSmall}
      activeIndex={0}
      variant="secondary"
      size="sm"
    />
  ),
};

export const SecondarySmallSecondTab: Story = {
  render: () => (
    <Navbar
      tabs={secondaryTabsSmall}
      activeIndex={1}
      variant="secondary"
      size="sm"
    />
  ),
};

export const SecondarySmallThirdTab: Story = {
  render: () => (
    <Navbar
      tabs={secondaryTabsSmall}
      activeIndex={2}
      variant="secondary"
      size="sm"
    />
  ),
};

// ---------------------------------------------------------------------------
// Interactive Demos
// ---------------------------------------------------------------------------

const InteractiveDemo = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View className="gap-4">
      <Text className="text-zinc-600 font-dm-sans text-sm text-center">
        Active: {primaryTabs[activeIndex].label}
      </Text>
      <Navbar
        tabs={primaryTabs}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
      />
    </View>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

const InteractiveSecondaryDemo = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View className="gap-4">
      <Text className="text-zinc-100 font-dm-sans text-sm text-center">
        Active: {secondaryTabsLarge[activeIndex].label}
      </Text>
      <Navbar
        tabs={secondaryTabsLarge}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        variant="secondary"
      />
    </View>
  );
};

export const InteractiveSecondary: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 items-center justify-center p-4 bg-zinc-900">
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
  render: () => <InteractiveSecondaryDemo />,
};

const InteractiveSecondarySmallDemo = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View className="gap-4">
      <Text className="text-zinc-100 font-dm-sans text-sm text-center">
        Active: {secondaryTabsSmall[activeIndex].label}
      </Text>
      <Navbar
        tabs={secondaryTabsSmall}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        variant="secondary"
        size="sm"
      />
    </View>
  );
};

export const InteractiveSecondarySmall: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 items-center justify-center p-4 bg-zinc-900">
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
  render: () => <InteractiveSecondarySmallDemo />,
};

const InteractiveExpandedDemo = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');

  return (
    <View className="gap-4">
      <Text className="text-zinc-600 font-dm-sans text-sm text-center">
        Input: {inputValue || '(empty)'}
      </Text>
      <Navbar
        tabs={primaryTabs}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        expanded
        actions={defaultActions}
        inputValue={inputValue}
        onInputChange={setInputValue}
      />
    </View>
  );
};

export const InteractiveExpanded: Story = {
  render: () => <InteractiveExpandedDemo />,
};

// ---------------------------------------------------------------------------
// Toggle Expanded Demo (Animation Test)
// ---------------------------------------------------------------------------

const ToggleExpandedDemo = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View className="gap-4">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="bg-indigo-600 px-4 py-2 rounded-lg self-center"
      >
        <Text className="text-white font-dm-sans-medium">
          {expanded ? 'Collapse' : 'Expand'}
        </Text>
      </Pressable>
      <Navbar
        tabs={primaryTabs}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        expanded={expanded}
        actions={defaultActions}
      />
    </View>
  );
};

export const ToggleExpanded: Story = {
  render: () => <ToggleExpandedDemo />,
};

// ---------------------------------------------------------------------------
// All Variants Comparison
// ---------------------------------------------------------------------------

export const AllVariants: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 p-4 bg-zinc-800">
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
  render: () => (
    <View className="gap-6">
      <Text className="text-zinc-100 font-dm-sans-medium text-sm">Primary (Light)</Text>
      <Navbar tabs={primaryTabs} activeIndex={0} />

      <Text className="text-zinc-100 font-dm-sans-medium text-sm mt-2">Primary Expanded</Text>
      <Navbar
        tabs={primaryTabs}
        activeIndex={0}
        expanded
        actions={defaultActions}
      />

      <Text className="text-zinc-100 font-dm-sans-medium text-sm mt-2">Secondary Default (Large)</Text>
      <Navbar
        tabs={secondaryTabsLarge}
        activeIndex={0}
        variant="secondary"
      />

      <Text className="text-zinc-100 font-dm-sans-medium text-sm mt-2">Secondary Small</Text>
      <Navbar
        tabs={secondaryTabsSmall}
        activeIndex={0}
        variant="secondary"
        size="sm"
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
      <View className="flex-1 items-center justify-center p-4 bg-zinc-900">
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
  render: () => (
    <View className="gap-6">
      <Text className="text-zinc-400 font-dm-sans-medium text-xs">Primary</Text>
      <Navbar tabs={primaryTabs} activeIndex={0} />

      <Text className="text-zinc-400 font-dm-sans-medium text-xs mt-2">Secondary (Large with badges)</Text>
      <Navbar
        tabs={secondaryTabsLarge}
        activeIndex={0}
        variant="secondary"
      />

      <Text className="text-zinc-400 font-dm-sans-medium text-xs mt-2">Secondary Small (4 tabs)</Text>
      <Navbar
        tabs={secondaryTabsSmall}
        activeIndex={0}
        variant="secondary"
        size="sm"
      />
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Full Width
// ---------------------------------------------------------------------------

export const FullWidth: Story = {
  decorators: [
    (Story) => (
      <View className="flex-1 justify-end p-4 bg-zinc-100">
        <Story />
      </View>
    ),
  ],
  render: () => <Navbar tabs={primaryTabs} activeIndex={0} />,
};
