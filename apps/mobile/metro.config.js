// metro.config.js — React Native CLI + pnpm monorepo
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  projectRoot,
  // Cho Metro thấy cả node_modules được hoist ở monorepo root
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: false,
  },
  server: {
    // Giữ serverRoot = projectRoot để Gradle Android bundle đúng entry
    unstable_serverRoot: projectRoot,
  },
};

module.exports = mergeConfig(defaultConfig, config);
