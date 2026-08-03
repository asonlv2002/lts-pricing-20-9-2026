/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-electric.test.ts  (cwd: apps/web)
 */
import {
  dongBoGiaDangApSauSuaSlot,
  tinhDienMoiPhut,
  tinhGiaDienTbCong,
  tinhGiaDienTbTrongSo,
} from './cpsx-upgrade-electric';
import type { CpsxUpgradeElectric } from './types';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

const slots = [
  { id: 'a', label: '0h-6h', hours: 6, pricePerKwh: 3000 },
  { id: 'b', label: '6h-17h', hours: 10, pricePerKwh: 4000 },
  { id: 'c', label: '17h-24h', hours: 8, pricePerKwh: 5000 },
];

const machines = {
  print: { powerKw: 180, efficiency: 0.55 },
  laminate: { powerKw: 45, efficiency: 0.65 },
  slit: { powerKw: 15, efficiency: 0.6 },
  bag: { powerKw: 22, efficiency: 0.6 },
};

assert('TB cộng = 4000', tinhGiaDienTbCong(slots) === 4000);

const weighted = tinhGiaDienTbTrongSo(slots);
assert('TB trọng số ≈ 4083.33', Math.abs(weighted - 4083.333333) < 0.01);

const perMin = tinhDienMoiPhut(180, 0.55, 4090);
assert(
  'điện/phút = CS × HS × giá / 60',
  perMin != null && Math.abs(perMin - (180 * 0.55 * 4090) / 60) < 0.001,
);

assert('chưa có giá → null', tinhDienMoiPhut(180, 0.55, null) === null);

const weightedState: CpsxUpgradeElectric = {
  slots,
  appliedSource: 'weighted',
  appliedPricePerKwh: 4083.333333,
  machines,
};
const nextSlots = slots.map((s) =>
  s.id === 'a' ? { ...s, pricePerKwh: 6000 } : s,
);
const afterSlot = dongBoGiaDangApSauSuaSlot({
  ...weightedState,
  slots: nextSlots,
});
assert(
  'sửa slot khi weighted → recompute',
  afterSlot.appliedPricePerKwh != null &&
    Math.abs(afterSlot.appliedPricePerKwh - tinhGiaDienTbTrongSo(nextSlots)) < 0.01,
);

const manualState: CpsxUpgradeElectric = {
  slots,
  appliedSource: 'manual',
  appliedPricePerKwh: 4090,
  machines,
};
const afterManual = dongBoGiaDangApSauSuaSlot({
  ...manualState,
  slots: slots.map((s) => ({ ...s, pricePerKwh: 9999 })),
});
assert('manual + sửa slot → giữ giá', afterManual.appliedPricePerKwh === 4090);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
