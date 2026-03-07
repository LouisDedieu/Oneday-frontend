import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text } from 'react-native';
import { TabBar } from './TabBar';

// ---------------------------------------------------------------------------
// Story wrapper
// ---------------------------------------------------------------------------

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: 353 }}>
      {children}
    </View>
  );
}

const meta: Meta<typeof TabBar> = {
  title: 'Navigation/TabBar',
  component: TabBar,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 20,
          paddingBottom: 40,
          backgroundColor: '#F4F6FF',
        }}
      >
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TabBar>;

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------

const primaryTabs = [
  { icon: 'inbox-line', label: 'Inbox' },
  { icon: 'bookmark-line', label: 'Saved' },
  { icon: 'user-line', label: 'Profile' },
];

const defaultActions = [
  { icon: 'sparkling-fill', label: 'Auto', color: 'default' as const },
  { icon: 'signpost-fill', label: 'Trip', color: 'green' as const },
  { icon: 'building-fill', label: 'City', color: 'blue' as const },
];

// ---------------------------------------------------------------------------
// Static stories
// ---------------------------------------------------------------------------

/** Default collapsed state */
export const Default: Story = {
  render: () => (
    <TabBar
      tabs={primaryTabs}
      activeIndex={0}
      actions={defaultActions}
    />
  ),
};

/** Expanded state (controlled) */
export const Expanded: Story = {
  render: () => (
    <TabBar
      tabs={primaryTabs}
      activeIndex={0}
      expanded
      actions={defaultActions}
      inputPlaceholder="Coller votre lien ici..."
    />
  ),
};

/** Second tab active */
export const SecondTabActive: Story = {
  render: () => (
    <TabBar
      tabs={primaryTabs}
      activeIndex={1}
      actions={defaultActions}
    />
  ),
};

/** Expanded with a pre-filled input */
export const ExpandedWithValue: Story = {
  render: () => (
    <TabBar
      tabs={primaryTabs}
      activeIndex={0}
      expanded
      actions={defaultActions}
      inputValue="https://example.com/video"
    />
  ),
};

// ---------------------------------------------------------------------------
// Interactive demo — toggle expand/collapse by pressing the button
// ---------------------------------------------------------------------------

const InteractiveDemo = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');

  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          fontFamily: 'Righteous',
          fontSize: 12,
          color: '#3529C1',
          opacity: 0.6,
          textAlign: 'center',
        }}
      >
        {expanded ? '✦ Expanded' : '· Collapsed'} — tab: {primaryTabs[activeIndex].label}
      </Text>
      <TabBar
        tabs={primaryTabs}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        expanded={expanded}
        onExpandedChange={setExpanded}
        actions={defaultActions}
        inputValue={inputValue}
        onInputChange={setInputValue}
        inputPlaceholder="Coller votre lien ici..."
      />
    </View>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

// ---------------------------------------------------------------------------
// On dark background
// ---------------------------------------------------------------------------

export const OnDarkBackground: Story = {
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 20,
          paddingBottom: 40,
          backgroundColor: '#1A1730',
        }}
      >
        <StoryWrapper>
          <Story />
        </StoryWrapper>
      </View>
    ),
  ],
  render: () => {
    const [expanded, setExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    return (
      <TabBar
        tabs={primaryTabs}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
        expanded={expanded}
        onExpandedChange={setExpanded}
        actions={defaultActions}
        inputPlaceholder="Coller votre lien ici..."
      />
    );
  },
};