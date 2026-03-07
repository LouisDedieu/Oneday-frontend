// Main app entry point
// Switch between Storybook and the main app based on STORYBOOK env var

import Constants from "expo-constants";
import { registerRootComponent } from "expo";

const STORYBOOK_ENABLED = Constants.expoConfig?.extra?.storybookEnabled === true;

if (STORYBOOK_ENABLED) {
  // Register Storybook UI as the root component
  const StorybookUI = require("./.rnstorybook").default;
  registerRootComponent(StorybookUI);
} else {
  // Normal app entry point for expo-router
  require("expo-router/entry");
}
