// Dynamic Expo config to support Storybook mode
const baseConfig = require("./app.json");

module.exports = ({ config }) => {
  return {
    ...baseConfig.expo,
    ...config,
    extra: {
      ...baseConfig.expo.extra,
      storybookEnabled: process.env.STORYBOOK === "true",
    },
  };
};
