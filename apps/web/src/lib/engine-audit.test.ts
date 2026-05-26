/**
 * engine-audit.test.ts — Test kiểm tra 3 vấn đề tính toán (đã sửa)
 * Chạy: npx tsx src/lib/engine-audit.test.ts
 *
 * 1. Chi phí Zipper = quantity × cutStep × zipperPrice
 * 2. Chi phí Vận chuyển = shippingPerKm × shippingKm / quantity
 * 3. Lãi vay = (interestBase + interestSpread) / 365 × paymentDays × costPerUnit
 * 4. Đặc tả kỹ thuật NVL (kiểm tra chuỗi công thức)
 */

import { calculate } from './engine';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from './data';
import type { CalculateInput } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const issues: string[] = [];

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    const msg = `${name}${detail ? ' — ' + detail : ''}`;
    console.error(`  ❌ ${msg}`);
    issues.push(msg);
    failed++;
  }
}

function assertApprox(name: string, actual: number, expected: number, tolerancePct = 1) {
  const diff = Math.abs(actual - expected);
  const pct = (diff / (Math.abs(expected) || 1)) * 100;
  const ok = pct <= tolerancePct;
  assert(name, ok, `actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)}, diff=${pct.toFixed(2)}%`);
}

function assertExact(name: string, actual: number, expected: number) {
  const ok = Math.abs(actual - expected) < 0.001;
  assert(name, ok, `actual=${actual.toFixed(6)}, expected=${expected.toFixed(6)}`);
}

function section(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

const mats = INITIAL_MATERIALS;
const cons = INITIAL_CONSTANTS;
const prof = INITIAL_PROFIT_TABLE;

// ─── Base inputs ────────────────────────────────────────────────────────────

const baseTui: CalculateInput = {
  customer: 'Test', productName: 'Túi test',
  productType: 'tui', bagType: 'flat', filmType: '',
  filmRollLength: 6000,
  quantity: 10000, numColors: 4, numImages: 1,
  layer1Id: mats.find(m => m.name.toUpperCase().includes('OPP'))?.id ?? mats[0].id,
  layer2Id: null, layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0.3, cutStep: 0.4,
  metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 5, tapeWeight: 3,
  hasZipper: false, hasTape: false, hasHandle: false,
  paymentDays: 30, // paymentInterestRate removed,
  profitColumn: 1, commissionRate: 0, commissionFixedVND: 0,
  commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 1000, boxPrice: 50000,
  shippingPerKm: 5000, shippingKm: 200,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 0,
  cylType: 'A',
  cylIncluded: false,
};

const baseMang: CalculateInput = {
  ...baseTui,
  productType: 'mang', bagType: '', filmType: 'mangIn',
  quantity: 5000, spreadWidth: 0.5, cutStep: 0.3, numImages: 1,
};


// ════════════════════════════════════════════════════════════════════════════
section('1. CHI PHÍ ZIPPER (Khóa kéo) — ĐÃ SỬA');
// ════════════════════════════════════════════════════════════════════════════

/*
  Công thức MỚI:
    zipperTotal = quantity × cutStep × zipperPrice
    (mỗi túi cần 1 đoạn zipper dài = bước cắt)
*/

{
  const input = { ...baseTui, hasZipper: true, zipperWeight: 5 };
  const r = calculate(input, mats, cons, prof)!;

  assert('1.1 Có kết quả khi bật zipper', r !== null);

  // Mỗi túi = cutStep mét zipper × zipperPrice
  const expectedPerUnit = input.cutStep * cons.zipperPrice; // 0.4 × 378 = 151.2 đ/túi
  const expectedTotal = input.quantity * input.cutStep * cons.zipperPrice; // 1,512,000 đ

  console.log(`  zipperPrice = ${cons.zipperPrice} đ/m`);
  console.log(`  cutStep = ${input.cutStep} m`);
  console.log(`  expectedPerUnit = ${input.cutStep} × ${cons.zipperPrice} = ${expectedPerUnit} đ/túi`);
  console.log(`  expectedTotal = ${input.quantity} × ${expectedPerUnit} = ${expectedTotal.toLocaleString()} đ`);

  assertApprox('1.2 zipperTotal = qty × cutStep × price', r.zipperTotal, expectedTotal, 0.1);
  assertApprox('1.3 zipperPerUnit = cutStep × price', r.zipperPerUnit, expectedPerUnit, 0.1);

  // Verify zipperPerUnit bao gồm đúng giá trị
  assert('1.4 zipperPerUnit > 0 khi có zipper', r.zipperPerUnit > 0);
}

// Zipper tắt
{
  const r = calculate({ ...baseTui, hasZipper: false }, mats, cons, prof)!;
  assert('1.5 hasZipper=false → zipperTotal = 0', r.zipperTotal === 0);
  assert('1.6 hasZipper=false → zipperPerUnit = 0', r.zipperPerUnit === 0);
}

// Tape cũng theo cutStep
{
  const input = { ...baseTui, hasTape: true, tapeWeight: 3 };
  const r = calculate(input, mats, cons, prof)!;
  const expectedTapePerUnit = input.cutStep * cons.tapePrice;
  assertApprox('1.7 tapePerUnit = cutStep × tapePrice', r.tapePerUnit, expectedTapePerUnit, 0.1);
  console.log(`  tapePerUnit = ${input.cutStep} × ${cons.tapePrice} = ${expectedTapePerUnit} đ/túi`);
}


// ════════════════════════════════════════════════════════════════════════════
section('2. CHI PHÍ VẬN CHUYỂN (Shipping) — ĐÃ SỬA');
// ════════════════════════════════════════════════════════════════════════════

/*
  Công thức MỚI:
    shippingTotal = shippingPerKm × shippingKm
    shippingPerUnit = shippingTotal / quantity
*/

{
  const input = { ...baseTui, shippingPerKm: 5000, shippingKm: 200 };
  const r = calculate(input, mats, cons, prof)!;

  const expectedTotal = input.shippingPerKm * input.shippingKm; // 1,000,000 đ
  const expectedPerUnit = expectedTotal / input.quantity; // 100 đ/túi

  console.log(`  shippingPerKm = ${input.shippingPerKm} đ/km`);
  console.log(`  shippingKm = ${input.shippingKm} km`);
  console.log(`  shippingTotal = ${expectedTotal.toLocaleString()} đ`);
  console.log(`  shippingPerUnit = ${expectedTotal.toLocaleString()} / ${input.quantity} = ${expectedPerUnit} đ/túi`);

  assertExact('2.1 shippingTotal = shippingPerKm × shippingKm', r.shippingTotal, expectedTotal);
  assertApprox('2.2 shippingPerUnit = total / quantity', r.shippingPerUnit, expectedPerUnit, 0.1);
}

// Màng cũng tương tự
{
  const input = { ...baseMang, shippingPerKm: 5000, shippingKm: 200 };
  const r = calculate(input, mats, cons, prof)!;

  const expectedTotal = 5000 * 200; // 1,000,000
  const expectedPerUnit = expectedTotal / input.quantity; // 200 đ/m²

  assertExact('2.3 Màng: shippingTotal = shippingPerKm × shippingKm', r.shippingTotal, expectedTotal);
  assertApprox('2.4 Màng: shippingPerUnit = total / quantity', r.shippingPerUnit, expectedPerUnit, 0.1);
  console.log(`  Màng: shippingPerUnit = ${expectedTotal.toLocaleString()} / ${input.quantity} = ${expectedPerUnit} đ/m²`);
}

// Không có shipping
{
  const r = calculate({ ...baseTui, shippingPerKm: 0, shippingKm: 0 }, mats, cons, prof)!;
  assert('2.5 shippingPerKm=0 → shippingTotal = 0', r.shippingTotal === 0);
  assert('2.6 shippingPerKm=0 → shippingPerUnit = 0', r.shippingPerUnit === 0);
}

// Quantity khác nhau → perUnit khác nhau
{
  const r1 = calculate({ ...baseTui, quantity: 10000, shippingPerKm: 5000, shippingKm: 200 }, mats, cons, prof)!;
  const r2 = calculate({ ...baseTui, quantity: 50000, shippingPerKm: 5000, shippingKm: 200 }, mats, cons, prof)!;

  assert('2.7 Cùng shipping, qty lớn hơn → perUnit nhỏ hơn',
    r2.shippingPerUnit < r1.shippingPerUnit,
    `10k=${r1.shippingPerUnit.toFixed(2)}, 50k=${r2.shippingPerUnit.toFixed(2)}`);
  assertExact('2.8 shippingTotal giống nhau dù qty khác', r1.shippingTotal, r2.shippingTotal);
}


// ════════════════════════════════════════════════════════════════════════════
section('3. LÃI VAY (Interest) — ĐÃ SỬA');
// ════════════════════════════════════════════════════════════════════════════

/*
  Công thức MỚI:
    interestPerUnit = (interestBase + interestSpread) / 365 * paymentDays * costPerUnit
*/

{
  const laiNam = (cons.interestBase ?? 0.10) + (cons.interestSpread ?? 0.03);
  const input30 = { ...baseTui, paymentDays: 30, shippingPerKm: 0, shippingKm: 0 };
  const r30 = calculate(input30, mats, cons, prof)!;

  const expected30 = laiNam / 365 * 30 * r30.costPerUnit;
  assertApprox('3.1 30 ngày: interestPerUnit = lãi năm/365 * 30 * cost', r30.interestPerUnit, expected30, 0.1);

  const input45 = { ...input30, paymentDays: 45 };
  const r45 = calculate(input45, mats, cons, prof)!;
  const expected45 = laiNam / 365 * 45 * r45.costPerUnit;
  assertApprox('3.2 45 ngày: interestPerUnit = lãi năm/365 * 45 * cost', r45.interestPerUnit, expected45, 0.1);
  assertApprox('3.3 45 ngày / 30 ngày = 1.5×', r45.interestPerUnit / r30.interestPerUnit, 1.5, 0.1);

  const input90 = { ...input30, paymentDays: 90 };
  const r90 = calculate(input90, mats, cons, prof)!;
  assertApprox('3.4 90 ngày / 30 ngày = 3×', r90.interestPerUnit / r30.interestPerUnit, 3.0, 0.1);

  const input14 = { ...input30, paymentDays: 14 };
  const r14 = calculate(input14, mats, cons, prof)!;
  assertApprox('3.5 14 ngày / 30 ngày = 14/30', r14.interestPerUnit / r30.interestPerUnit, 14 / 30, 0.1);
}


// ════════════════════════════════════════════════════════════════════════════
section('4. ĐẶC TẢ KỸ THUẬT NVL');
// ════════════════════════════════════════════════════════════════════════════

// 4A. Túi — chuỗi công thức cơ bản
{
  console.log('\n  ── 4A. Túi 1 lớp ──');
  const input = baseTui;
  const r = calculate(input, mats, cons, prof)!;

  const bagArea = input.spreadWidth * input.cutStep;
  assertExact('4A.1 bagArea = spreadWidth × cutStep', r.bagArea, bagArea);

  const totalArea = input.quantity * bagArea;
  assertExact('4A.2 totalArea = quantity × bagArea (túi)', r.totalArea, totalArea);

  const printWidth = input.spreadWidth * input.numImages + 0.02;
  assertExact('4A.3 printWidth = spreadWidth × numImages + 0.02', r.printWidth, printWidth);

  const filmLength = totalArea / (input.spreadWidth * input.numImages);
  assertApprox('4A.4 filmLength = totalArea / (spreadWidth × numImages)', r.filmLength, filmLength, 0.01);
  console.log(`  filmLength = ${totalArea} / (${input.spreadWidth}×${input.numImages}) = ${filmLength.toFixed(2)} m`);

  // cutMeters tính từ dưới lên: bước cắt × SL
  const cutMeters = input.cutStep * input.quantity;
  assertExact('4A.5 cutMeters = cutStep × quantity (tính từ dưới lên)', r.cutMeters, cutMeters);
  console.log(`  cutMeters = ${input.cutStep} × ${input.quantity} = ${cutMeters} m`);

  const cutWaste = cutMeters / 3000 * 20 + 100;
  assertApprox('4A.6 cutWaste = cutMeters/A × B + C', r.cutWaste, cutWaste, 0.1);

  const printMeters = cutMeters + cutWaste;
  assertApprox('4A.8 printMeters = cutMeters + cutWaste (1 lớp, no lamWaste)', r.printMeters, printMeters, 0.1);

  const cSetup = cons.colorSetup[input.numColors!] || 0;
  const printWaste = cSetup + (printMeters / cons.printWasteA * cons.printWasteB)
    + (printMeters > cons.printWasteC ? (printMeters - cons.printWasteC) / cons.printWasteC * cons.printWasteD : 0);
  assertApprox('4A.9 printWaste đúng công thức', r.printWaste, printWaste, 0.5);
}

// 4B. Túi 2 lớp
{
  console.log('\n  ── 4B. Túi 2 lớp ──');
  const peId = mats.find(m => m.name.toUpperCase().includes('PE') && !m.name.toUpperCase().includes('MPET'))?.id;
  if (peId) {
    const input = { ...baseTui, layer2Id: peId };
    const r = calculate(input, mats, cons, prof)!;

    assert('4B.1 (cutWastePercent removed — no longer tracked)', true);
    assert('4B.2 laminations.length = 1', r.layers.laminations.length === 1);

    const lam = r.layers.laminations[0];
    const neededMeters = r.cutMeters + r.cutWaste;
    const lamWaste = neededMeters / 3000 * 20 + 100;
    assertApprox('4B.3 lamWaste = neededMeters/3000 × 20 + 100', lam.waste, lamWaste, 0.1);

    const printMeters = r.cutMeters + r.cutWaste + lamWaste;
    assertApprox('4B.4 printMeters = cutMeters + cutWaste + lamWaste', r.printMeters, printMeters, 0.1);
  }
}

// 4C. Màng
{
  console.log('\n  ── 4C. Màng ──');
  const r = calculate(baseMang, mats, cons, prof)!;

  assertExact('4C.1 totalArea = quantity (màng)', r.totalArea, baseMang.quantity);

  // Màng: cutMeters = totalArea / spreadWidth
  const mangCutMeters = baseMang.quantity / baseMang.spreadWidth;
  assertApprox('4C.2 cutMeters màng = totalArea / spreadWidth', r.cutMeters, mangCutMeters, 0.01);

  // Phi hao màng áp dụng giống túi
  const mangCutWaste = mangCutMeters / (cons.cutWasteA||3000) * (cons.cutWasteB||20) + (cons.cutWasteC||100);
  assertApprox('4C.3 cutWaste màng = cutMeters/A × B + C', r.cutWaste, mangCutWaste, 0.1);

  const printWidth = baseMang.spreadWidth * baseMang.numImages + 0.02;
  const filmLength = baseMang.quantity / (baseMang.spreadWidth * baseMang.numImages);
  assertApprox('4C.4 filmLength = quantity / (spreadWidth × numImages)', r.filmLength, filmLength, 0.01);

  const filmRollArea = baseMang.spreadWidth * baseMang.filmRollLength;
  assertApprox('4C.5 filmRollArea đúng', r.filmRollArea, filmRollArea, 0.01);
}

// 4D. Thickness & GSM
{
  console.log('\n  ── 4D. Độ dày & GSM ──');
  const layer1 = mats.find(m => m.id === baseTui.layer1Id)!;
  const r = calculate(baseTui, mats, cons, prof)!;

  const totalThickness = Math.round(layer1.thickness / 5) * 5;
  assertExact('4D.1 totalThickness (1 lớp)', r.totalThickness, totalThickness);

  const gsm = layer1.thickness * layer1.density; // (thk/1e6)*(dens*1e6) = thk*dens
  assertApprox('4D.2 totalGSM (1 lớp)', r.totalGSM, gsm, 0.1);

  const peId = mats.find(m => m.name.toUpperCase().includes('PE') && !m.name.toUpperCase().includes('MPET'))?.id;
  if (peId) {
    const layer2 = mats.find(m => m.id === peId)!;
    const r2 = calculate({ ...baseTui, layer2Id: peId }, mats, cons, prof)!;

    const raw2 = layer1.thickness + layer2.thickness;
    const added2 = 3; // +3µm ghép
    const total2 = Math.round((raw2 + added2) / 5) * 5;
    assertExact('4D.3 totalThickness (2 lớp, +3µm)', r2.totalThickness, total2);

    const gsm2 = gsm + layer2.thickness * layer2.density;
    assertApprox('4D.4 totalGSM (2 lớp)', r2.totalGSM, gsm2, 0.1);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// KẾT QUẢ
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`  KẾT QUẢ: ${passed} passed, ${failed} failed / ${passed + failed} tổng`);
console.log('═'.repeat(60));

if (issues.length > 0) {
  console.log('\n📋 CÁC TEST FAIL:');
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
}

if (failed > 0) process.exit(1);
else console.log('🎉 Tất cả test đều PASS!');
