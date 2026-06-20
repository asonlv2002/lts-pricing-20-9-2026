/**
 * VoTrang.overview-lock.test.ts - Regression checks for locked overview mobile hub.
 * Run: npx tsx src/components/VoTrang.overview-lock.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

const source = readFileSync(resolve(process.cwd(), 'src/components/layout/VoTrang.tsx'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

console.log('\n== Overview mobile hub lock ==');

assert(
  'detects overview hub as locked',
  /const laTongQuanBiKhoa = hub\.id === 'overview';/.test(source),
);

assert(
  'disables overview header buttons',
  /<button className="lts-mobile-header-menu"[\s\S]*disabled=\{laTongQuanBiKhoa\}/.test(source)
    && /<button className="lts-mobile-primary-action"[\s\S]*disabled=\{laTongQuanBiKhoa\}/.test(source),
);

assert(
  'disables overview desktop sidebar group and children',
  /const laNhomTongQuan = nhom\.id === 'overview';/.test(source)
    && /disabled=\{laNhomTongQuan\}/.test(source)
    && /const laMucTongQuan = item\.key\.startsWith\('overview\.'\);/.test(source)
    && /disabled=\{laMucTongQuan\}/.test(source),
);

assert(
  'disables overview cards and blocks actions',
  /disabled=\{laTongQuanBiKhoa\}/.test(source)
    && /onClick=\{\(\) => \{ if \(!laTongQuanBiKhoa\) onAction\(card\.action\); \}\}/.test(source)
    && /aria-disabled=\{laTongQuanBiKhoa\}/.test(source),
);

assert(
  'shows locked label for overview cards',
  /laTongQuanBiKhoa \? <span className="lts-mobile-card-lock">Chỉ xem<\/span> : <ChevronRight/.test(source),
);

assert(
  'has locked card CSS state',
  /\.lts-mobile-action-card--locked \{[\s\S]*cursor:\s*default[\s\S]*pointer-events:\s*none/.test(css),
);

assert(
  'has locked desktop sidebar CSS state',
  /\.lts-nav-group-title:disabled,[\s\S]*\.lts-nav-item:disabled \{[\s\S]*cursor:\s*default[\s\S]*pointer-events:\s*none/.test(css),
);

if (failed > 0) {
  console.error(`\nFAILED: ${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\nPASSED: ${passed} tests`);
