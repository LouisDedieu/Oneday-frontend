import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
    loading: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (Story) => (
      <View className="gap-4">
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    title: 'Button',
    variant: 'default',
    size: 'default',
  },
};

export const Destructive: Story = {
  args: {
    title: 'Delete',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    title: 'Outline',
    variant: 'outline',
  },
};

export const Secondary: Story = {
  args: {
    title: 'Secondary',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    title: 'Ghost',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    title: 'Link Button',
    variant: 'link',
  },
};

export const Small: Story = {
  args: {
    title: 'Small',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    title: 'Large',
    size: 'lg',
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled',
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <View className="gap-3">
      <Button title="Default" variant="default" />
      <Button title="Destructive" variant="destructive" />
      <Button title="Outline" variant="outline" />
      <Button title="Secondary" variant="secondary" />
      <Button title="Ghost" variant="ghost" />
      <Button title="Link" variant="link" />
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View className="gap-3">
      <Button title="Small" size="sm" />
      <Button title="Default" size="default" />
      <Button title="Large" size="lg" />
    </View>
  ),
};
