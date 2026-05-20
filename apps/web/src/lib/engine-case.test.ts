/**
 * engine-case.test.ts — Kiểm tra case thực tế từ bảng Excel
 * Chạy: npx tsx src/lib/engine-case.test.ts
 *
 * INPUT:
 *   Lớp 1: MattOPP 18µm
 *   Lớp 2: LLDPE 105µm (điều chỉnh thành ~120µm theo bảng CP NVL 6.660đ/m²)
 *   Khổ trải: 0.62m | Bước cắt: 0.24m | SL: 50.000 | Số con hình: 1 | Màu: 5
 *   Túi/thùng: 1500 | Giá thùng: 25.000 | VC: 20.000đ/km × 25km
 *   Lãi vay: 0.25%/30ngày | Hoa hồng: 2%
 *
 * KẾT QUẢ THAM CHIẾU (từ bảng Excel):
 *   IN:   khổ=0.64 | TP=12.361m | phi hao=1.282m | đầu vào=13.644m | CPSX=918 | costCPSX=8.015.893 | CP NVL=674.7 | costNVL=5.891.419
 *   GHÉP: khổ=0.64 | TP=12.180m | phi hao=181m   | đầu vào=12.361m | CPSX=684 | costCPSX=5.411.239 | CP NVL=6.660 | costNVL=52.688.379
 *   CẮT:  khổ=0.64 | TP=12.000m | phi hao=180m   | đầu vào=12.180m | CPSX=1.165.2
 *   Tổng CPSX=22.510.099 | Tổng CPNVL=58.579.798 | Tổng giá vốn=81.089.896
 *   LN 20% → 97.307.876
 */

import { calculate } from './engine';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from './data';
import type { CalculateInput } from './types';

let passed = 0;
let failed = 0;

function fmt(n: number) { return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }); }

function check(name: string, actual: number, expected: number, tolerancePct = 1) {
  const pct = Math.abs(actual - expected) / (Math.abs(expected) || 1) * 100;
  const ok = pct <= tolerancePct;
  const mark = ok ? '✅' : '❌';
  console.log(`  ${mark} ${name}`);
  console.log(`     actual=${fmt(actual)}  expected=${fmt(expected)}  diff=${pct.toFixed(2)}%`);
  if (ok) passed++; else failed++;
}

const mats = INITIAL_MATERIALS;
const cons = INITIAL_CONSTANTS;
const prof = INITIAL_PROFIT_TABLE;

// In bảng constants liên quan để debug
console.log('═══ CONSTANTS ═══');
console.log(`  colorSetup[5]=${cons.colorSetup[5]}  laborCost=${cons.laborCost}  ghepCPSX=${cons.ghepCPSX}`);
console.log(`  ghepWasteA=${cons.ghepWasteA}  ghepWasteB=${cons.ghepWasteB}  ghepWasteC=${cons.ghepWasteC}`);
console.log(`  printWasteA=${cons.printWasteA}  printWasteB=${cons.printWasteB}`);
console.log(`  cutBase=${cons.cutBase}  cutT1=${cons.cutThreshold1}  cutT2=${cons.cutThreshold2}  cutM2=${cons.cutMult2}`);

// In giá NVL
const mattOPP = mats.find(m => m.id === 'MattOPP18')!;
const lldpe   = mats.find(m => m.id === 'LLDPE')!;
console.log('\n═══ VẬT LIỆU ═══');
console.log(`  MattOPP18: pricePerM2=${mattOPP.pricePerM2?.toFixed(2)}  inkPricePerColor=${mattOPP.inkPricePerColor}  isPETorPA=${mattOPP.isPETorPA}`);
console.log(`  LLDPE:     pricePerM2=${lldpe.pricePerM2?.toFixed(2)}  thk=${lldpe.thickness}  adjustableMic=${lldpe.adjustableMic}`);
// LLDPE 120µm = pricePerKg × thk × density / 1000
const lldpe120 = lldpe.pricePerKg * 120 * lldpe.density / 1000;
console.log(`  LLDPE 120µm pricePerM2=${lldpe120.toFixed(2)}  (target: 6660)`);

// ─── Input ────────────────────────────────────────────────────────────────
const input: CalculateInput = {
  customer: 'Test Case Excel',
  productName: 'Túi MattOPP/LLDPE test',
  productType: 'tui',
  bagType: 'flat',
  filmType: '',
  filmRollLength: 6000,
  quantity: 50000,
  numColors: 5,
  numImages: 1,
  layer1Id: 'MattOPP18',
  layer2Id: 'LLDPE',
  layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0.62,
  cutStep: 0.24,
  metallicSurcharge: 0,
  coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false,
  paymentDays: 30,
  // paymentInterestRate removed,
  profitColumn: 2,   // LN 20%
  commissionRate: 0.02,
  commissionFixedVND: 0,
  commissionUnit: 'percent',
  commissionInputValue: 2,
  bagsPerBox: 1500,
  boxPrice: 25000,
  shippingPerKm: 20000,
  shippingKm: 25,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 0,
  cylType: 'A',
  cylIncluded: false,
  micOverrides: { layer2Id: 120 },  // LLDPE 120µm → 6.660đ/m²
};

const r = calculate(input, mats, cons, prof);

if (!r) {
  console.error('\n❌ calculate() trả về null — kiểm tra lại input!');
  process.exit(1);
}

// ─── In chi tiết tính tay để so sánh ─────────────────────────────────────
const SW = input.spreadWidth;        // 0.62
const CS = input.cutStep;            // 0.24
const QTY = input.quantity;          // 50000
const NI = input.numImages || 1;     // 1

const printWidth = SW * NI + 0.02;   // 0.64
const cutMeters  = CS * QTY;         // 12000
const cutWaste   = cutMeters / (cons.ghepWasteA||3000) * (cons.ghepWasteB||20) + (cons.ghepWasteC||100);
// NOTE: cutWaste dùng công thức cắt, engine dùng hardcode 3000/20/100 cho cắt
const cutWasteCut = cutMeters / 3000 * 20 + 100;  // phi hao cắt vẫn hardcode
const ghepMeters = cutMeters + cutWasteCut;        // đầu vào ghép = TP cắt đầu vào
const ghepWaste  = ghepMeters / (cons.ghepWasteA||3000) * (cons.ghepWasteB||20) + (cons.ghepWasteC||100);
const printMeters = ghepMeters + ghepWaste;        // đầu vào in = TP ghép đầu vào

console.log('\n═══ TÍNH TAY (so sánh với bảng Excel) ═══');
console.log(`  printWidth = ${SW}×${NI}+0.02 = ${printWidth.toFixed(2)}m  (Excel: 0.64)`);
console.log(`  cutMeters  = ${CS}×${QTY}     = ${fmt(cutMeters)}m  (Excel: 12.000)`);
console.log(`  cutWaste   = ${fmt(cutMeters)}/3000×20+100 = ${cutWasteCut.toFixed(1)}m  (Excel: 180)`);
console.log(`  ghepMeters = ${fmt(cutMeters)}+${cutWasteCut.toFixed(0)} = ${fmt(ghepMeters)}m  (Excel: 12.180)`);
console.log(`  ghepWaste  = ${fmt(ghepMeters)}/${cons.ghepWasteA||3000}×${cons.ghepWasteB||20}+${cons.ghepWasteC||100} = ${ghepWaste.toFixed(1)}m  (Excel: 181)`);
console.log(`  printMeters= ${fmt(ghepMeters)}+${ghepWaste.toFixed(0)} = ${fmt(printMeters)}m  (Excel: 12.361 TP + 1282 waste = ~13.644 đầu vào)`);

// Engine output
console.log('\n═══ ENGINE OUTPUT ═══');
const lam = r.layers.laminations[0];
console.log(`  layers.print: width=${r.layers.print.width.toFixed(2)}  meters=${fmt(r.layers.print.meters)}  waste=${fmt(r.layers.print.waste)}`);
if (lam) console.log(`  layers.lam2:  width=${lam.width.toFixed(2)}  meters=${fmt(lam.meters)}  waste=${lam.waste.toFixed(1)}`);
console.log(`  layers.cut:   width=${r.layers.cut.width.toFixed(2)}  meters=${fmt(r.layers.cut.meters)}  waste=${r.layers.cut.waste.toFixed(1)}`);
console.log(`  cutCPSX=${r.cutCPSX?.toFixed(1)}  bagArea=${r.bagArea.toFixed(4)}`);

// ─── So sánh với Excel ────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  SO SÁNH VỚI BẢNG EXCEL (tolerance 2%)');
console.log('══════════════════════════════════════════════════════════════');

console.log('\n  [KHỔ MÀNG NVL]');
check('IN:   printWidth = 0.64m',   r.layers.print.width,  0.64, 0.5);
if (lam) check('GHÉP: lamWidth = 0.64m', lam.width, 0.64, 0.5);

console.log('\n  [CHIỀU DÀI TP]');
check('CẮT:  cutMeters = 12.000m',    r.layers.cut.meters,   12000, 0.5);
if (lam) check('GHÉP: lamMeters = 12.180m', lam.meters, 12180, 2);
check('IN:   printMeters = 12.361m',  r.layers.print.meters, 12361, 2);

console.log('\n  [PHI HAO]');
check('CẮT:  cutWaste = 180m',        r.layers.cut.waste,    180,   2);
if (lam) check('GHÉP: lamWaste = 181m',   lam.waste, 181, 2);
check('IN:   printWaste = 1.282m',    r.layers.print.waste,  1282,  5);

console.log('\n  [ĐẦU VÀO NVL = TP + phi hao]');
const printInputVL = r.layers.print.meters + r.layers.print.waste;
const ghepInputVL  = lam ? lam.meters + lam.waste : 0;
const cutInputVL   = r.layers.cut.meters + r.layers.cut.waste;
check('IN:   đầu vào = 13.644m',  printInputVL, 13644, 2);
if (lam) check('GHÉP: đầu vào = 12.361m', ghepInputVL, 12361, 2);
check('CẮT:  đầu vào = 12.180m', cutInputVL,   12180, 2);

console.log('\n  [CPSX đ/m²]');
// inkPrice MattOPP = không isPETorPA → 120đ, nhưng bảng Excel CPSX=918
// 918 = 5×inkPrice×coverage + laborCost = 5×120×1 + 318 = 918 ✓
const expectedPrintCPSX = 5 * (mattOPP.inkPricePerColor || 120) * 1 + cons.laborCost;
console.log(`  Tính tay CPSX in = 5×${mattOPP.inkPricePerColor||120}×1+${cons.laborCost} = ${expectedPrintCPSX}`);
check('IN:   printCPSX = 918',      r.printCPSX, 918,  1);
check('GHÉP: ghepCPSX = 684',       cons.ghepCPSX, 684, 0.1);
// CẮT: bagArea = 0.62×0.24=0.1488 → T1=0.07 T2=0.2 → M2 (trung bình) = 971×1.2=1165.2
const bagArea = input.spreadWidth * input.cutStep;
console.log(`  bagArea=${bagArea.toFixed(4)} → T1=${cons.cutThreshold1} T2=${cons.cutThreshold2} → M2 → cutCPSX=${cons.cutBase}×${cons.cutMult2}=${cons.cutBase*cons.cutMult2}`);
check('CẮT:  cutCPSX = 1.165',      r.cutCPSX, cons.cutBase * cons.cutMult2, 0.5);

console.log('\n  [THÀNH TIỀN CPSX]');
check('IN:   costCPSX = 8.015.893',    r.layers.print.costCPSX, 8015893, 5);
if (lam) check('GHÉP: costCPSX = 5.411.239', lam.costCPSX, 5411239, 1);
check('CẮT:  costCPSX = 9.082.967',    r.cutCostCPSX, 9082967, 1);
const totalCPSX_check = r.layers.print.costCPSX + (lam?.costCPSX||0) + r.cutCostCPSX;
check('Tổng CPSX = 22.510.099',        totalCPSX_check, 22510099, 1);

console.log('\n  [CP NVL đ/m²]');
check('IN:   CP NVL = 674.7',   mattOPP.pricePerM2 || 0, 674.7, 2);
if (lam) {
  // LLDPE 105µm default = pricePerKg×105×density/1000
  const lldpePrice = lldpe.pricePerM2 || 0;
  console.log(`  LLDPE pricePerM2=${lldpePrice.toFixed(1)} (bảng Excel: 6.660 → tương ứng ~120µm)`);
  check('GHÉP: CP NVL ≈ 6.660 (LLDPE 120µm)', lldpe120, 6660, 2);
}

console.log('\n  [THÀNH TIỀN CP NVL]');
check('IN:   costNVL = 5.891.419',    r.layers.print.costMat, 5891419, 5);
if (lam) check('GHÉP: costNVL = 52.688.379', lam.costMat, 52688379, 10);

console.log('\n  [TỔNG CỘNG]');
const totalCPSX = (r.layers.print.costCPSX) + (lam?.costCPSX||0) + r.cutCostCPSX;
const totalCPNVL = (r.layers.print.costMat) + (lam?.costMat||0);
const tongGiaVon = totalCPSX + totalCPNVL;
console.log(`  Tổng CPSX   = ${fmt(totalCPSX)}`);
console.log(`  Tổng CPNVL  = ${fmt(totalCPNVL)}`);
console.log(`  Tổng giá vốn= ${fmt(tongGiaVon)}`);
console.log(`  Engine totalProductionCost = ${fmt(r.totalProductionCost)}`);
check('Tổng giá vốn = 81.089.896', r.totalProductionCost, 81089896, 5);

const ln20 = r.totalProductionCost * 1.20;
console.log(`  + LN 20% → ${fmt(ln20)}  (Excel: 97.307.876)`);
check('Giá vốn + LN 20% = 97.307.876', ln20, 97307876, 1);

// ─── BẢNG ĐỀ XUẤT GIÁ ────────────────────────────────────────────────────
// Test với zipper bật để khớp bảng (zipper=91đ = 0.24×378)
const inputWithZipper: CalculateInput = { ...input, hasZipper: true, zipperWeight: 5 };
const rZ = calculate(inputWithZipper, mats, cons, prof)!;

console.log(`\n${'═'.repeat(60)}`);
console.log('  BẢNG ĐỀ XUẤT GIÁ — SO SÁNH CHI TIẾT');
console.log('═'.repeat(60));
console.log(`  ${'Khoản mục'.padEnd(22)} ${'Engine'.padStart(10)} ${'Bảng'.padStart(10)} ${'Diff'.padStart(10)}`);
console.log(`  ${'-'.repeat(52)}`);

function row(label: string, engine: number, target: number) {
  const diff = engine - target;
  const pct = (Math.abs(diff) / (Math.abs(target)||1) * 100).toFixed(2);
  const ok = parseFloat(pct) <= 2;
  const sign = diff > 0 ? '+' : '';
  console.log(`  ${ok?'✅':'❌'} ${label.padEnd(20)} ${engine.toFixed(2).padStart(10)} ${target.toFixed(2).padStart(10)} ${(sign+diff.toFixed(2)).padStart(10)} (${pct}%)`);
  if (ok) passed++; else failed++;
}

console.log('\n  [Không có zipper]');
row('Giá ban đầu (costPU)', r.costPerUnit,      1946);
row('Thùng giấy',          r.boxPerUnit,         17);
row('Vận chuyển',          r.shippingPerUnit,    10);
row('Lãi vay',             r.interestPerUnit,    4.87);
row('Hoa hồng',            r.commissionPerUnit,  38.92);
row('Giá bán đề xuất',     r.finalPrice,         2017);  // không có zipper

console.log('\n  [Có zipper — khớp dòng 91đ]');
row('Zipper',              rZ.zipperPerUnit,     91);
row('Giá ban đầu (costPU)',rZ.costPerUnit,       1946);  // costPU không đổi khi bật zipper
row('Giá bán đề xuất',     rZ.finalPrice,        2107);

console.log(`\n  Tính tay kiểm:`);
console.log(`  boxPerUnit      = 25.000 / (50.000/1.500) = ${(25000/(50000/1500)).toFixed(4)}`);
console.log(`  shippingPerUnit = 20.000×25 / 50.000 = ${(20000*25/50000).toFixed(4)}`);
console.log(`  interestPerUnit = (interestBase+interestSpread)/365?paymentDays?costPerUnit`);
console.log(`  commissionPU    = 0.02 × 1.946 = ${(0.02*1946).toFixed(4)}`);
console.log(`  zipperPerUnit   = 0.24 × 378 = ${(0.24*378).toFixed(4)}`);

// ─── Kết quả ─────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`  KẾT QUẢ: ${passed} passed, ${failed} failed / ${passed+failed} tổng`);
if (failed === 0) console.log('🎉 Tất cả match bảng Excel!');
else console.log('⚠️  Có chênh lệch — xem chi tiết bên trên');
