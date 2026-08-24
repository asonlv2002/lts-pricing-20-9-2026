/**
 * VoTrang.guard-mount.test.ts - Kiem tra VoTrang co render KhachHangQuyenGuard.
 * Chay: pnpm --filter web exec tsx src/components/layout/VoTrang.guard-mount.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const source = readFileSync(
  resolve(process.cwd(), 'src/components/layout/VoTrang.tsx'),
  'utf8',
);

console.log('\n== VoTrang gắn KhachHangQuyenGuard ==');

assert(
  'import KhachHangQuyenGuard',
  /import\s+KhachHangQuyenGuard\s+from\s+['"]\.\/KhachHangQuyenGuard['"]/.test(source),
);

assert(
  'render <KhachHangQuyenGuard /> trong JSX',
  /<KhachHangQuyenGuard\s*\/?>/.test(source),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
