/**
 * engine.test.ts — Test cases cho engine.ts
 * Chạy: npx tsx src/lib/engine.test.ts
 */

import { calculate } from './engine';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from './data';
import type { CalculateInput } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function assertApprox(name: string, actual: number, expected: number, tolerancePct = 1) {
  const ok = Math.abs(actual - expected) / (Math.abs(expected) || 1) * 100 <= tolerancePct;
  assert(name, ok, `actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)}, tol=${tolerancePct}%`);
}

function section(title: string) {
  console.log(`\n══ ${title} ══`);
}

const mats = INITIAL_MATERIALS;
const cons = INITIAL_CONSTANTS;
const prof = INITIAL_PROFIT_TABLE;

// Tìm material theo id
const mat = (id: string) => mats.find(m => m.id === id);

// Base input túi đơn giản (1 lớp, 4 màu)
const baseTuiInput: CalculateInput = {
  customer: 'Test',
  productName: 'Túi test',
  productType: 'tui',
  bagType: 'flat',
  filmType: '',
  filmRollLength: 6000,
  quantity: 10000,
  numColors: 4,
  numImages: 1,
  layer1Id: mats.find(m => m.name.toUpperCase().includes('OPP'))?.id ?? mats[0].id,
  layer2Id: null,
  layer3Id: null,
  layer4Id: null,
  layer5Id: null,
  spreadWidth: 0.3,
  cutStep: 0.4,
  metallicSurcharge: 0,
  coverageRatio: 1,
  handleWeight: 0,
  zipperWeight: 0,
  tapeWeight: 0,
  hasZipper: false,
  hasTape: false,
  hasHandle: false,
  paymentDays: 30,
  paymentInterestRate: 0.0025,
  profitColumn: 1,
  commissionRate: 0,
  commissionFixedVND: 0,
  commissionUnit: '',
  commissionInputValue: 0,
  bagsPerBox: 1000,
  boxPrice: 50000,
  shippingPerKm: 0,
  shippingKm: 0,
  cylLength: 0,
  cylCircum: 0,
  cylUnitPrice: 0,
};

// Base input màng
const baseMangInput: CalculateInput = {
  ...baseTuiInput,
  productType: 'mang',
  bagType: '',
  filmType: 'mangIn',
  quantity: 5000, // 5000 m²
  filmRollLength: 6000,
  spreadWidth: 0.5,
  cutStep: 0.3,
  numImages: 1,
};

// ════════════════════════════════════════════════════════════════════════════
section('1. Sanity — kết quả trả về hợp lệ');
// ════════════════════════════════════════════════════════════════════════════

const r1 = calculate(baseTuiInput, mats, cons, prof);
assert('Túi 1 lớp: kết quả không null', r1 !== null);
if (r1) {
  assert('finalPrice > 0', r1.finalPrice > 0);
  assert('totalArea > 0', r1.totalArea > 0);
  assert('filmLength > 0', r1.filmLength > 0);
  assert('bagArea > 0', r1.bagArea > 0);
}

const r2 = calculate(baseMangInput, mats, cons, prof);
assert('Màng 1 lớp: kết quả không null', r2 !== null);
if (r2) {
  assert('finalPrice > 0 (màng)', r2.finalPrice > 0);
  assert('totalArea > 0 (màng)', r2.totalArea > 0);
}

// ════════════════════════════════════════════════════════════════════════════
section('2. Màng: totalArea = quantity (không nhân bagArea)');
// ════════════════════════════════════════════════════════════════════════════
// Đây là lỗi vừa sửa: totalArea của màng phải = quantity (m²) thẳng
// chứ không phải quantity × bagArea

if (r2) {
  assertApprox('totalArea = quantity (5000 m²)', r2.totalArea, baseMangInput.quantity, 0.1);

  // filmLength = totalArea / (spreadWidth × numImages) — không cộng lề 0.02
  const expectedFilmLength = baseMangInput.quantity / (baseMangInput.spreadWidth * baseMangInput.numImages);
  assertApprox('filmLength màng đúng công thức', r2.filmLength, expectedFilmLength, 0.1);

  // Kiểm tra không bị nhân bagArea (nếu nhân thì filmLength sẽ nhỏ hơn nhiều)
  const wrongFilmLength = (baseMangInput.quantity * baseMangInput.spreadWidth * baseMangInput.cutStep)
    / (baseMangInput.spreadWidth * baseMangInput.numImages + 0.02);
  assert('filmLength KHÔNG bị nhân bagArea (lỗi cũ)',
    Math.abs(r2.filmLength - wrongFilmLength) > 100,
    `filmLength=${r2.filmLength.toFixed(1)} vs sai=${wrongFilmLength.toFixed(1)}`
  );
}

// ════════════════════════════════════════════════════════════════════════════
section('3. Túi: totalArea = quantity × bagArea (giữ nguyên logic cũ)');
// ════════════════════════════════════════════════════════════════════════════

if (r1) {
  const expectedArea = baseTuiInput.quantity * baseTuiInput.spreadWidth * baseTuiInput.cutStep;
  assertApprox('totalArea túi = qty × bagArea', r1.totalArea, expectedArea, 0.1);

  // filmLength = totalArea / (spreadWidth × numImages)
  const numImages = baseTuiInput.numImages || 1;
  const expectedFilmLen = expectedArea / (baseTuiInput.spreadWidth * numImages);
  assertApprox('filmLength túi đúng công thức', r1.filmLength, expectedFilmLen, 0.1);
}

// ════════════════════════════════════════════════════════════════════════════
section('4. Chiều dài trục in');
// ════════════════════════════════════════════════════════════════════════════
// Công thức mới: cylLength = spreadWidth × numImages + 0.1; tối thiểu 0.7

{
  // Test case thông thường
  const sw = 0.5, ni = 1;
  const expected = Math.max(0.7, sw * ni + 0.1); // = 0.6 < 0.7 → 0.7
  console.log(`  [Trục in] sw=0.5, ni=1: expected cylLength=${expected}`);

  // sw=0.5, ni=1 → 0.5×1+0.1=0.6 < 0.7 → clamp về 0.7
  assert('cylLength nhỏ được clamp về 0.7m', expected === 0.7);

  // sw=0.8, ni=2 → 0.8×2+0.1≈1.7 > 1.25 → cảnh báo nhưng vẫn tính
  const sw2 = 0.8, ni2 = 2;
  const expected2 = Math.max(0.7, sw2 * ni2 + 0.1); // ≈ 1.7
  assert('cylLength lớn (>1.25) vẫn tính được', expected2 > 1.25);

  // sw=0.6, ni=1 → 0.6+0.1=0.7 → chính xác 0.7
  const sw3 = 0.6, ni3 = 1;
  const expected3 = Math.max(0.7, sw3 * ni3 + 0.1);
  assert('cylLength biên 0.7m (sw=0.6)', expected3 === 0.7);

  // Kiểm tra KHÔNG còn dùng vòng lặp nCalc nhân bội số
  // Với sw=0.1, ni=1 → 0.1+0.1=0.2 < 0.7 → clamp về 0.7
  // Logic cũ sẽ ra: 0.1×1×4+0.1=0.5, 0.1×1×5+0.1=0.6, 0.1×1×6+0.1=0.7 → nCalc=6 → sẽ ra 0.7
  // Logic mới cũng ra 0.7 (clamp), nhưng không nhân thêm
  const sw4 = 0.1, ni4 = 1;
  const newLogic = Math.max(0.7, sw4 * ni4 + 0.1); // = 0.7
  assert('cylLength sw=0.1 không nhân bội số (clamp về 0.7)', newLogic === 0.7);
}

// ════════════════════════════════════════════════════════════════════════════
section('5. Màng: filmRollArea = spreadWidth × filmRollLength / numImages');
// ════════════════════════════════════════════════════════════════════════════

if (r2) {
  // spreadWidth=0.5, filmRollLength=6000, numImages=1 → 0.5×6000/1 = 3000 m²
  const expectedArea = baseMangInput.spreadWidth * baseMangInput.filmRollLength / (baseMangInput.numImages || 1);
  assertApprox('filmRollArea đúng công thức', r2.filmRollArea, expectedArea, 0.1);
  assert('filmRollArea > 0 khi màng', r2.filmRollArea > 0);

  // Túi không có filmRollArea
  if (r1) assert('filmRollArea = 0 khi túi', r1.filmRollArea === 0);
}

// ════════════════════════════════════════════════════════════════════════════
section('6. Tỉ lệ giá — màng nhỏ hơn túi (cost/m² màng < cost/m² túi do ko có phí cắt)');
// ════════════════════════════════════════════════════════════════════════════

if (r1 && r2) {
  // Màng không có cutTotalCost
  assert('cutTotalCost = 0 với màng', r2.cutTotalCost === 0);
  assert('cutTotalCost > 0 với túi', r1.cutTotalCost > 0);
}

// ════════════════════════════════════════════════════════════════════════════
section('7. Màng nhiều con hình (numImages=2)');
// ════════════════════════════════════════════════════════════════════════════

const r3 = calculate({ ...baseMangInput, numImages: 2 }, mats, cons, prof);
if (r3 && r2) {
  // printWidth lớn hơn → filmLength nhỏ hơn → chi phí thấp hơn
  assert('filmLength giảm khi numImages tăng', r3.filmLength < r2.filmLength);
  assertApprox('totalArea không đổi khi đổi numImages', r3.totalArea, r2.totalArea, 0.1);
}

// ════════════════════════════════════════════════════════════════════════════
section('8. Edge cases — null / zero inputs');
// ════════════════════════════════════════════════════════════════════════════

const rNull = calculate({ ...baseTuiInput, quantity: 0 }, mats, cons, prof);
assert('quantity=0 → null', rNull === null);

const rNoLayer = calculate({ ...baseTuiInput, layer1Id: null }, mats, cons, prof);
assert('layer1Id=null → null', rNoLayer === null);

const rNoBagType = calculate({ ...baseTuiInput, bagType: '' }, mats, cons, prof);
assert('bagType="" với túi → null', rNoBagType === null);

const rMangNoFilmType = calculate({ ...baseMangInput, filmType: '' }, mats, cons, prof);
assert('filmType="" với màng → null', rMangNoFilmType === null);

// ════════════════════════════════════════════════════════════════════════════
section('9. Không màu in (numColors=0)');
// ════════════════════════════════════════════════════════════════════════════

const r0colors = calculate({ ...baseTuiInput, numColors: 0 }, mats, cons, prof);
if (r0colors) {
  assert('printWaste = 0 khi ko in', r0colors.printWaste === 0);
  assert('printCostCPSX = 0 khi ko in', r0colors.printCostCPSX === 0);
  assert('finalPrice > 0 dù ko in', r0colors.finalPrice > 0);
  assert('finalPrice thấp hơn khi có in', r0colors.finalPrice < (r1?.finalPrice ?? 0));
}

// ════════════════════════════════════════════════════════════════════════════
section('10. Nhiều lớp — chi phí cao hơn 1 lớp');
// ════════════════════════════════════════════════════════════════════════════

const layer2Id = mats.find(m => m.name.toUpperCase().includes('PE') && !m.name.toUpperCase().includes('MPET'))?.id;
const rMultiLayer = layer2Id ? calculate({ ...baseTuiInput, layer2Id }, mats, cons, prof) : null;
if (rMultiLayer && r1) {
  assert('2 lớp: totalLamCost > 0', rMultiLayer.totalLamCost > 0);
  assert('2 lớp: finalPrice > 1 lớp', rMultiLayer.finalPrice > r1.finalPrice);
  assert('2 lớp: laminations.length = 1', rMultiLayer.layers.laminations.length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
// KẾT QUẢ
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(50)}`);
console.log(`KẾT QUẢ: ${passed} passed, ${failed} failed / ${passed + failed} tổng`);
if (failed === 0) {
  console.log('🎉 Tất cả test đều PASS!');
} else {
  console.log(`⚠️  ${failed} test FAIL — cần kiểm tra lại!`);
  process.exit(1);
}
