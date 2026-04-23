// ═══════════════════════════════════════════════════════════════════════════
// Bundle engine TypeScript → 1 file IIFE chạy trong QuickJS (flutter_js)
// Chạy: node apps/flutter_app/scripts/build-engine.mjs
// Output: apps/flutter_app/assets/engine.bundle.js
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, 'engine-entry.ts');
const out = resolve(__dirname, '..', 'assets', 'engine.bundle.js');

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'es2020',
  minify: false,
  sourcemap: false,
  outfile: out,
  logLevel: 'info',
  // Engine là pure logic — không cần external
  external: [],
  // QuickJS không có Node global; tránh inject
  define: { 'process.env.NODE_ENV': '"production"' },
});

console.log('\n✓ Đã build engine bundle:', out);
