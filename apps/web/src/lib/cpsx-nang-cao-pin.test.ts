import { strict as assert } from 'assert';
import {
  trichCpsxNangCao,
  apCpsxNangCaoVaoHangSo,
  laKeyCpsxNangCao,
} from './cpsx-nang-cao-pin';
import type { AppConstants } from './types';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

console.log('cpsx-nang-cao-pin');

const base = {
  laborCost: 100,
  cpsxUpgradeLabor: { print: { roundedPerMin: 111 } },
  cpsxUpgradeElectric: { appliedPricePerKwh: 2 },
} as unknown as AppConstants;

const pin = trichCpsxNangCao(base);
check('trich có labor', pin?.cpsxUpgradeLabor != null);
check('trich có electric', pin?.cpsxUpgradeElectric != null);
check('trich không laborCost field', pin != null && !('laborCost' in pin));

const session = {
  laborCost: 999,
  cpsxUpgradeLabor: { print: { roundedPerMin: 9999 } },
  cpsxUpgradeElectric: { appliedPricePerKwh: 88 },
} as unknown as AppConstants;

const hieuLuc = apCpsxNangCaoVaoHangSo(session, pin);
check(
  'ap giữ laborCost session',
  (hieuLuc as { laborCost?: number }).laborCost === 999,
);
check(
  'ap NC từ pin không session',
  (hieuLuc as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 111,
);
check(
  'ap electric từ pin',
  (hieuLuc as { cpsxUpgradeElectric?: { appliedPricePerKwh?: number } })
    .cpsxUpgradeElectric?.appliedPricePerKwh === 2,
);
check('ap null pin = base', apCpsxNangCaoVaoHangSo(session, undefined) === session);
check('laKey labor', laKeyCpsxNangCao('cpsxUpgradeLabor'));
check('laKey laborCost false', !laKeyCpsxNangCao('laborCost'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
assert.equal(failed, 0);
