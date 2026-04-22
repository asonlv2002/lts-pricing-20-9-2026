const path = require('path');

// Chuyển CWD về thư mục hiện tại để tránh lỗi monorepo bundle pathing
process.chdir(__dirname);

// Intercept process.argv to fix the relative entryFile bug in React Native Gradle plugin for Monorepos
// NOTE: We intentionally keep the entry file as a RELATIVE path (e.g. "index.js")
// so that Metro resolves it relative to projectRoot (apps/mobile), not the monorepo root.
// Metro's legacySinglePageExportBundleAsync already adds "./" prefix if needed.
// DO NOT convert to absolute path — it causes Windows drive-letter case issues (C: vs c:)
// that make metro-file-map's RootPathUtils generate invalid paths like c:\C:\...

// Require the actual Expo CLI
require('@expo/cli/build/bin/cli');


