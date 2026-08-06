/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-electric.test.ts  (cwd: apps/web)
 */
import {
  chuanHoaCpsxUpgradeElectric,
  dinhDangGioMask,
  dongBoGiaDangApSauSuaSlot,
  tinhDienMoiPhut,
  tinhGiaDienTbCong,
  tinhGiaDienTbTrongSo,
  tinhSoGioTuKhungGio,
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

// ── tinhSoGioTuKhungGio ──────────────────────────────────────────────────────
assert('07:00 → 17:00 = 10 giờ', tinhSoGioTuKhungGio('07:00', '17:00') === 10);
assert('22:00 → 02:00 = 4 giờ (qua đêm)', tinhSoGioTuKhungGio('22:00', '02:00') === 4);
assert('17:00 → 00:00 = 7 giờ (qua đêm)', tinhSoGioTuKhungGio('17:00', '00:00') === 7);
assert('00:00 → 24:00 = 24 giờ', tinhSoGioTuKhungGio('00:00', '24:00') === 24);
assert('end == start → 24 giờ', tinhSoGioTuKhungGio('06:00', '06:00') === 24);
assert('07:30 → 17:45 = 10.25 giờ', tinhSoGioTuKhungGio('07:30', '17:45') === 10.25);
assert('giờ lẻ làm tròn: 08:10 → 17:20 = 9.17 giờ', tinhSoGioTuKhungGio('08:10', '17:20') === 9.17);
assert('thiếu start → null', tinhSoGioTuKhungGio(undefined, '17:00') === null);
assert('thiếu end → null', tinhSoGioTuKhungGio('07:00', undefined) === null);
assert('chuỗi rỗng → null', tinhSoGioTuKhungGio('', '') === null);
assert('sai định dạng "7:00 AM" → null', tinhSoGioTuKhungGio('7:00 AM', '5:00 PM') === null);
assert('sai định dạng "abc" → null', tinhSoGioTuKhungGio('abc', '17:00') === null);
assert('start 24:00 không hợp lệ → null', tinhSoGioTuKhungGio('24:00', '06:00') === null);
assert('phút 75 không hợp lệ → null', tinhSoGioTuKhungGio('07:75', '17:00') === null);

// ── chuanHoaCpsxUpgradeElectric: tự tính hours từ Từ/Đến ─────────────────────
{
  const out = chuanHoaCpsxUpgradeElectric(
    {
      slots: [
        { id: 'a', label: 'k1', start: '07:00', end: '17:00', hours: 99, pricePerKwh: 4000 },
        { id: 'b', label: 'k2', start: '22:00', end: '02:00', hours: 0, pricePerKwh: 6000 },
      ],
    },
    { slots, appliedSource: 'average', appliedPricePerKwh: 4000, machines },
  );
  assert('có Từ/Đến → hours tự tính 10', out.slots[0].hours === 10);
  assert('qua đêm → hours tự tính 4', out.slots[1].hours === 4);
}
{
  // data cũ (không start/end) → giữ hours, không hỏng
  const out = chuanHoaCpsxUpgradeElectric(
    {
      slots: [
        { id: 'old', label: 'cũ', hours: 6, pricePerKwh: 3000 },
        { id: 'half', label: 'nửa', start: '07:00', end: '17:00', hours: 6, pricePerKwh: 4000 },
      ],
    },
    { slots, appliedSource: 'average', appliedPricePerKwh: 4000, machines },
  );
  assert('slot cũ không start/end → giữ hours 6', out.slots[0].hours === 6);
  assert('slot mới → hours tự tính 10', out.slots[1].hours === 10);
}
{
  // start/end sai định dạng → không đè hours
  const out = chuanHoaCpsxUpgradeElectric(
    {
      slots: [{ id: 'bad', label: 'x', start: '7 AM', end: 'abc', hours: 6, pricePerKwh: 3000 }],
    },
    { slots, appliedSource: 'average', appliedPricePerKwh: 4000, machines },
  );
  assert('sai định dạng → giữ hours 6', out.slots[0].hours === 6);
}
{
  // weighted dùng hours đã tự tính từ Từ/Đến
  const out = chuanHoaCpsxUpgradeElectric(
    {
      slots: [
        { id: 'a', label: 'rẻ', start: '00:00', end: '06:00', hours: 0, pricePerKwh: 3000 },
        { id: 'b', label: 'đắt', start: '18:00', end: '20:00', hours: 0, pricePerKwh: 9000 },
      ],
      appliedSource: 'weighted',
      appliedPricePerKwh: 0,
    },
    { slots, appliedSource: 'average', appliedPricePerKwh: 4000, machines },
  );
  const w = tinhGiaDienTbTrongSo(out.slots);
  assert(
    'weighted theo giờ tự tính: (6×3000 + 2×9000)/8 = 4500',
    Math.abs(w - 4500) < 0.01,
  );
}

// ── dinhDangGioMask (nhập số tự nhảy) ────────────────────────────────────────
assert('1200 → 12:00', dinhDangGioMask('1200') === '12:00');
assert('0700 → 07:00', dinhDangGioMask('0700') === '07:00');
assert('1 → 1 (đang gõ)', dinhDangGioMask('1') === '1');
assert('12 → 12 (chưa đủ phút)', dinhDangGioMask('12') === '12');
assert('120 → 12:0', dinhDangGioMask('120') === '12:0');
assert('cắt quá 4 số: 12345 → 12:34', dinhDangGioMask('12345') === '12:34');
assert('paste 12:00 → 12:00', dinhDangGioMask('12:00') === '12:00');
assert('bỏ ký tự không phải số: 1a2b0c0 → 12:00', dinhDangGioMask('1a2b0c0') === '12:00');
assert('rỗng → rỗng', dinhDangGioMask('') === '');
assert('chỉ số 0 → 0', dinhDangGioMask('0') === '0');
assert('09 → 09', dinhDangGioMask('09') === '09');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
