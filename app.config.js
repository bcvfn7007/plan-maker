// Web builds for GitHub Pages live under /<repo-name>; EXPO_BASE_URL sets that prefix.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || undefined },
});
