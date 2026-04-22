// metro.config.js — Expo monorepo pattern
// See: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Metro's projectRoot = apps/mobile (entry-point context)
// watchFolders = monorepoRoot so Metro can see all hoisted node_modules
config.watchFolders = [monorepoRoot];

// Resolve modules from both local and hoisted node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

// Fix: force serverRoot = projectRoot (not monorepo root) so that
// relative entry file paths resolve correctly in Gradle Android builds.
// Without this, Metro uses monorepo root as serverRoot which causes
// "Unable to resolve ./index.js from <monorepo-root>/." errors.
config.server = config.server ?? {};
config.server.unstable_serverRoot = projectRoot;

module.exports = config;

