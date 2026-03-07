const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withShareExtension } = require("expo-share-extension/metro");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const config = getDefaultConfig(__dirname);

const nativeWindConfig = withNativeWind(config, {
  input: "./styles/global.css",
});

const shareExtensionConfig = withShareExtension(nativeWindConfig);

// Enable Storybook only when STORYBOOK env var is set
module.exports = withStorybook(shareExtensionConfig, {
  enabled: process.env.STORYBOOK === "true",
  configPath: "./.rnstorybook",
});