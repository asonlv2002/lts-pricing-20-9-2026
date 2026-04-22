// metro.config.js — pnpm hoisted monorepo support
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Force Metro projectRoot to apps/mobile (not monorepo root)
config.projectRoot = projectRoot;

// Watch monorepo root for packages/*
config.watchFolders = [monorepoRoot];

// Resolve modules: hoisted packages are at monorepo root/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

module.exports = config;
