// ═══════════════════════════════════════════════════════════════════════════
// Bundle engine TypeScript → 1 file IIFE chạy trong QuickJS (flutter_js)
// + Sync /data/*.json (root repo) → assets/data/ (single source of truth)
// Chạy: node apps/flutter_app/scripts/build-engine.mjs
// Output: apps/flutter_app/assets/engine.bundle.js
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, 'engine-entry.ts');
const out = resolve(__dirname, '..', 'assets', 'engine.bundle.js');
const repoRoot = resolve(__dirname, '..', '..', '..');

// ── Sync data từ /data root repo → assets/data/ ─────────────────────────────
// Single source of truth: /data/*.json. Web import trực tiếp, Flutter copy
// vào assets vì asset bundle bị "đóng băng" lúc build APK.
const dataRoot = resolve(__dirname, '..', '..', '..', 'data');
const assetsDataDir = resolve(__dirname, '..', 'assets', 'data');
const dataFiles = ['materials.json', 'constants.json', 'profitTable.json'];

if (!existsSync(assetsDataDir)) mkdirSync(assetsDataDir, { recursive: true });

for (const f of dataFiles) {
  const src = resolve(dataRoot, f);
  const dst = resolve(assetsDataDir, f);
  if (!existsSync(src)) {
    console.warn(`⚠  Khong tim thay /data/${f} — bo qua`);
    continue;
  }
  copyFileSync(src, dst);
  console.log(`✓ Sync data: /data/${f} → assets/data/${f}`);
}

// ── Build engine bundle ──────────────────────────────────────────────────────
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
  // Web libs (P3/P4): map alias '@web/*' → apps/web/src/lib, '@data/*' → /data.
  alias: {
    '@web': resolve(repoRoot, 'apps', 'web', 'src', 'lib'),
    '@data': resolve(repoRoot, 'data'),
  },
  // QuickJS không có Node global; tránh inject
  define: { 'process.env.NODE_ENV': '"production"' },
  // Polyfill structuredClone TRƯỚC mọi module (data.ts gọi normalizer lúc load).
  banner: {
    js: 'if(typeof globalThis.structuredClone!=="function"){globalThis.structuredClone=function(v){return JSON.parse(JSON.stringify(v));};}',
  },
});

console.log('\n✓ Đã build engine bundle:', out);
