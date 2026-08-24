/**
 * KhachHangQuyenGuard.css.test.ts - Kiem tra CSS popup da them vao globals.css.
 * Chay: pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const css = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

console.log('\n== .lts-kh-popup CSS classes ==');

const required = [
  '.lts-kh-popup',
  '.lts-kh-popup-overlay',
  '.lts-kh-popup-card',
  '.lts-kh-popup-header',
  '.lts-kh-popup-title',
  '.lts-kh-popup-close',
  '.lts-kh-popup-body',
  '.lts-kh-popup-kh-card',
  '.lts-kh-popup-actions',
  '.lts-kh-popup-btn',
  '.lts-kh-popup-btn--primary',
  '.lts-kh-popup-btn--ghost',
];

for (const cls of required) {
  assert(`co class ${cls}`, new RegExp(`${cls.replace('--', '\\-\\-')}\\b`).test(css));
}

assert(
  'co @media mobile cho popup',
  /@media[^{]*max-width:\s*767px[\s\S]{0,500}\.lts-kh-popup-card/.test(css),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
