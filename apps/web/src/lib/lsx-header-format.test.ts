import { formatLsxHeaderDate } from './lsx-header-format';

let failed = 0;

function assert(name: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`OK ${name}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${name}: expected ${expected}, got ${actual}`);
}

assert('pads Vietnamese date', formatLsxHeaderDate('24/7/2026'), '24/07/2026');
assert('formats ISO date', formatLsxHeaderDate('2026-07-24'), '24/07/2026');
assert('keeps unknown date', formatLsxHeaderDate('Ngày hẹn sau'), 'Ngày hẹn sau');
assert('uses placeholder for empty date', formatLsxHeaderDate(''), '…/…/20…');

if (failed > 0) process.exit(1);
