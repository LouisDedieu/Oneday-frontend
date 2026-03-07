import React from 'react';
import type { Preview } from '@storybook/react-native';
import { View } from 'react-native';
import '../styles/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <View className="flex-1 bg-black p-4">
        <Story />
      </View>
    ),
  ],
};

export default preview;
