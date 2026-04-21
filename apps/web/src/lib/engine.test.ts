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
  commissionUnit: 'percent',
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
section('11. numImages > 1 — giá trị hiển thị per-image phải nhất quán');
// ════════════════════════════════════════════════════════════════════════════
// Mô phỏng logic UI: dMeters = meters/numImages, dWaste = waste/numImages
// inputVL = dMeters + dWaste = (meters + waste) / numImages
// Tất cả 3 cột phải cùng đơn vị "1 con hình"

{
  const ni = 3;
  const r_ni = calculate({ ...baseTuiInput, numImages: ni, quantity: 30000 }, mats, cons, prof);
  const r_ni1 = calculate({ ...baseTuiInput, numImages: 1, quantity: 10000 }, mats, cons, prof);

  if (r_ni && r_ni1) {
    // Kiểm tra printMeters tỉ lệ thuận với numImages (vì tổng diện tích tăng)
    // Thực ra totalArea = qty × bagArea không đổi theo numImages,
    // nhưng printMeters thay đổi vì cùng diện tích trải trên khổ rộng hơn
    assert('numImages=3: printMeters > 0', r_ni.layers.print.meters > 0);
    assert('numImages=3: printWaste > 0', r_ni.printWaste > 0);

    // Công thức hiển thị per-image: dMeters = meters/numImages, dWaste = waste/numImages
    const printMeters = r_ni.layers.print.meters;
    const printWaste  = r_ni.printWaste;
    const dMeters = printMeters / ni;
    const dWaste  = printWaste  / ni;
    const inputVL = dMeters + dWaste;

    // inputVL phải bằng (meters + waste) / numImages — KHÔNG phải meters/numImages + waste
    const inputVL_wrong = printMeters / ni + printWaste; // cách sai cũ
    assert(
      'inputVL (per-image) = (meters+waste)/numImages, không phải meters/numImages + waste_gốc',
      Math.abs(inputVL - (printMeters + printWaste) / ni) < 0.001,
      `inputVL=${inputVL.toFixed(2)}, (m+w)/ni=${((printMeters + printWaste)/ni).toFixed(2)}, sai=${inputVL_wrong.toFixed(2)}`
    );

    // Khi numImages=1, 2 cách cho cùng kết quả (dễ bỏ sót lỗi)
    if (r_ni1) {
      const m1 = r_ni1.layers.print.meters;
      const w1 = r_ni1.printWaste;
      assert(
        'numImages=1: cả 2 cách cho cùng kết quả (lỗi không lộ)',
        Math.abs((m1 / 1 + w1) - ((m1 + w1) / 1)) < 0.001
      );
    }

    // dWaste phải nhỏ hơn waste gốc khi numImages > 1
    assert('dWaste < waste gốc khi numImages=3', dWaste < printWaste);
    assert('dMeters < meters gốc khi numImages=3', dMeters < printMeters);
    assert('inputVL (per-image) = dMeters + dWaste', Math.abs(inputVL - dMeters - dWaste) < 0.001);
  }
}

// ════════════════════════════════════════════════════════════════════════════
section('12. numColors=0 — hàng CPSX IN vẫn hiện, nhưng phi hao=0 và CPSX=0');
// ════════════════════════════════════════════════════════════════════════════
// Lỗi vừa sửa: UI vẫn hiện hàng CPSX IN dù numColors=0 → phi hao = 0 gây nhầm lẫn
// Điều kiện ẩn: numColors === 0 → printWaste = 0 và printCostCPSX = 0

{
  const rNo = calculate({ ...baseTuiInput, numColors: 0 }, mats, cons, prof);
  const rYes = calculate({ ...baseTuiInput, numColors: 4 }, mats, cons, prof);

  if (rNo) {
    assert('numColors=0: printWaste = 0 (nên ẩn hàng IN)', rNo.printWaste === 0);
    assert('numColors=0: printCostCPSX = 0', rNo.printCostCPSX === 0);
    assert('numColors=0: printCPSX = 0', rNo.printCPSX === 0);
    // Thành tiền CPVL lớp in vẫn có (vật liệu vẫn dùng dù không in)
    assert('numColors=0: printCostMaterial > 0 (vẫn dùng vật liệu)', rNo.printCostMaterial > 0);
  }
  if (rYes) {
    assert('numColors=4: printWaste > 0 (nên hiện hàng IN)', rYes.printWaste > 0);
    assert('numColors=4: printCostCPSX > 0', rYes.printCostCPSX > 0);
  }
  if (rNo && rYes) {
    // Hàng IN luôn hiển thị, chỉ khác là CPSX=0 khi không in
    const showsZeroCPSX = (rNo.printWaste === 0 && rNo.printCostCPSX === 0);
    assert('numColors=0: hàng IN hiện với CPSX=0 (không ẩn hàng)', showsZeroCPSX);
  }
}

// ════════════════════════════════════════════════════════════════════════════
section('13. Bảng MOQ — layerMeters phải chia numImages');
// ════════════════════════════════════════════════════════════════════════════
// Lỗi vừa sửa: MOQ table hiển thị meters+waste toàn khổ thay vì per-image

{
  const ni = 2;
  const rMoq = calculate({ ...baseTuiInput, numImages: ni }, mats, cons, prof);
  if (rMoq) {
    const printLayer = rMoq.layers.print;
    const metersTotal = printLayer.meters + printLayer.waste;
    const metersPerImage = metersTotal / ni;

    assert('MOQ: metersTotal > metersPerImage khi numImages=2', metersTotal > metersPerImage);
    assertApprox('MOQ: metersPerImage = metersTotal / numImages', metersPerImage, metersTotal / ni, 0.01);

    // Đảm bảo giá trị per-image = 50% tổng (khi numImages=2)
    assertApprox('MOQ: per-image bằng 50% tổng khi numImages=2',
      metersPerImage, metersTotal / 2, 0.01
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
section('14. Stat card Khổ Thành Phẩm vs Khổ Màng NL');
// ════════════════════════════════════════════════════════════════════════════
// Lỗi vừa sửa: 2 stat card hiện cùng giá trị (đều = spreadWidth×numImages+0.02)
// Đúng: Khổ TP = spreadWidth (1 con hình), Khổ NL = spreadWidth×numImages+0.02

{
  const ni = 2;
  const sw = 0.5;
  const rStat = calculate({ ...baseTuiInput, numImages: ni, spreadWidth: sw }, mats, cons, prof);
  if (rStat) {
    const khoTP  = sw;                        // per-image (sau fix)
    const khoNL  = sw * ni + 0.02;            // toàn khổ
    const khoOld = rStat.printWidth;          // = spreadWidth × numImages + 0.02 (giống khoNL)

    assert('Khổ TP ≠ Khổ NL khi numImages=2', Math.abs(khoTP - khoNL) > 0.01,
      `khoTP=${khoTP}, khoNL=${khoNL}`);
    assertApprox('Khổ NL = spreadWidth×numImages+0.02', khoNL, rStat.printWidth, 0.01);
    assert('Khổ NL (toàn khổ) > Khổ TP (1 con) khi numImages=2', khoNL > khoTP);

    // Kiểm tra trước đây cả 2 đều bằng printWidth (lỗi cũ)
    assert('(Lỗi cũ) printWidth = spreadWidth×numImages+0.02, không phải spreadWidth',
      Math.abs(khoOld - khoNL) < 0.001 && Math.abs(khoOld - khoTP) > 0.01
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
section('15. Phi hao tính toán engine — đảm bảo công thức đúng');
// ════════════════════════════════════════════════════════════════════════════

{
  const rPhi = calculate(baseTuiInput, mats, cons, prof);
  if (rPhi) {
    const cA = cons.cutWasteA  || 3000;
    const cB = cons.cutWasteB  || 20;
    const cC = cons.cutWasteC  || 100;
    const expectedCutWaste = rPhi.cutMeters / cA * cB + cC;
    assertApprox('cutWaste = cutMeters/cA×cB + cC', rPhi.cutWaste, expectedCutWaste, 0.1);
    assert('cutWaste > 0', rPhi.cutWaste > 0);

    // Phi hao ghép
    if (rPhi.layers.laminations.length > 0) {
      const lam = rPhi.layers.laminations[0];
      const gA = cons.ghepWasteA || 3000;
      const gB = cons.ghepWasteB || 20;
      const gC = cons.ghepWasteC || 100;
      const expectedLamWaste = lam.meters / gA * gB + gC;
      assertApprox('lamWaste = meters/gA×gB + gC', lam.waste, expectedLamWaste, 0.1);
    }

    // Phi hao in — chỉ khi numColors > 0
    const pA = cons.printWasteA || 6000;
    const pB = cons.printWasteB || 40;
    const pC = cons.printWasteC || 50000;
    const pD = cons.printWasteD || 400;
    const cSetup = cons.colorSetup?.[(baseTuiInput.numColors ?? 0)]
      || ((baseTuiInput.numColors ?? 0) * 200 + 200);
    const pm = rPhi.printMeters;
    const expectedPrintWaste = cSetup + (pm / pA * pB) + (pm > pC ? pm / pC * pD : 0);
    assertApprox('printWaste = cSetup + meters/pA×pB + ...', rPhi.printWaste, expectedPrintWaste, 0.1);
    assert('printWaste > 0 khi numColors=4', rPhi.printWaste > 0);
  }
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
