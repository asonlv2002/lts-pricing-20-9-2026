/**
 * seed-du-lieu-mau.mjs — Tạo data/history.json từ DuLieuMau.ts
 * ──────────────────────────────────────────────────────────────
 * ⚠️  SCRIPT TẠM THỜI — có thể xoá sau khi đã seed xong.
 *     Dữ liệu gốc được lưu tại: apps/web/src/lib/DuLieuMau.ts
 *     Chạy lại bất kỳ lúc nào để reset dữ liệu mẫu.
 *
 * Chạy: node scripts/seed-du-lieu-mau.mjs
 *   hoặc: node scripts/seed-du-lieu-mau.mjs --out data/history.json
 *
 * Options:
 *   --out <path>   Đường dẫn file output (mặc định: data/history.json)
 *   --dry-run      Chỉ in kết quả ra console, không ghi file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'apps', 'web');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1
  ? path.resolve(args[outIdx + 1])
  : path.join(ROOT, 'data', 'history.json');

// ── Load raw data (từ apps/web/src/data/) ────────────────────────────────────
const materialsRaw = JSON.parse(fs.readFileSync(path.join(WEB, 'src/data/materials.json'), 'utf-8'));
const constantsRaw = JSON.parse(fs.readFileSync(path.join(WEB, 'src/data/constants.json'), 'utf-8'));
const profitRaw    = JSON.parse(fs.readFileSync(path.join(WEB, 'src/data/profitTable.json'), 'utf-8'));

const materials = materialsRaw.map(m => ({
  ...m,
  pricePerM2: m.pricePerKg * m.thickness * m.density / 1000,
}));
const constants = {
  ...constantsRaw,
  colorSetup: Object.fromEntries(
    Object.entries(constantsRaw.colorSetup).map(([k, v]) => [Number(k), v])
  ),
};
const profitTable    = profitRaw.rows;
const PROFIT_DEFAULT = profitRaw.profitDefault;

// ── Load DuLieuMau (dùng tsx để parse TS) ────────────────────────────────────
// Vì Node ESM không đọc được .ts trực tiếp, ta chuyển đổi import thành JSON tương đương
// bằng cách inlining data qua dynamic require với tsx (nếu có), hoặc dùng eval đơn giản.
//
// Giải pháp không phụ thuộc tsx: đọc file .ts và strip types bằng regex đơn giản.
const duLieuMauPath = path.join(WEB, 'src/lib/DuLieuMau.ts');
const duLieuMauSrc  = fs.readFileSync(duLieuMauPath, 'utf-8');

// Chuyển TypeScript → JavaScript thô (đủ để eval):
// 1. Bỏ các dòng `import type ...`
// 2. Bỏ các dòng `import ... from ...`
// 3. Bỏ type annotation `: CalculateInput` / `: PhanBoSeed[]` ...
// 4. Bỏ `export` keyword
let jsSrc = duLieuMauSrc
  .replace(/^import type.*$/gm, '')
  .replace(/^import .*$/gm, '')
  .replace(/: CalculateInput(\[\])?/g, '')
  .replace(/: PhanBoSeed(\[\])?/g, '')
  .replace(/: QuoteStatus/g, '')
  .replace(/^export type PhanBoSeed.*\{[\s\S]*?\};/m, '')
  .replace(/^export\s+/gm, '')
  .replace(/as const/g, '');

// Thêm module.exports ở cuối
jsSrc += `
// auto-exports for seed script
globalThis.__DLM = {
  TAT_CA_DU_LIEU_MAU,
  PHAN_BO_HISTORY,
  SELLERS_MAU,
};
`;

// Eval trong global context
const fn = new Function(jsSrc);
fn();
const { TAT_CA_DU_LIEU_MAU, PHAN_BO_HISTORY, SELLERS_MAU } = globalThis.__DLM;

// ── Engine (simplified — đủ để tính finalPrice & structureText) ──────────────
function getMat(id) { return materials.find(m => m.id === id) || null; }

function lookupProfit(totalCost, column) {
  const col = column === 1 ? 'col1' : 'col2';
  let val = PROFIT_DEFAULT[col];
  for (const row of profitTable) {
    if (totalCost < row.threshold) { val = row[col]; break; }
  }
  return val;
}

function calc(input) {
  const {
    quantity, spreadWidth, cutStep, numColors, metallicSurcharge = 0,
    coverageRatio = 1, profitColumn = 2, hasZipper, hasTape, hasHandle,
    layer1Id, layer2Id, layer3Id, layer4Id, layer5Id,
    shippingPerKm = 0, shippingKm = 0, boxPrice = 0, bagsPerBox = 0,
    commissionRate = 0, commissionFixedVND = 0, micOverrides = {},
    productType,
  } = input;

  const layer1 = layer1Id ? { ...getMat(layer1Id) } : null;
  const layer2 = layer2Id ? { ...getMat(layer2Id) } : null;
  const layer3 = layer3Id ? { ...getMat(layer3Id) } : null;
  const layer4 = layer4Id ? { ...getMat(layer4Id) } : null;
  const layer5 = layer5Id ? { ...getMat(layer5Id) } : null;
  if (!layer1) return null;

  // Override mic
  for (const [key, mat] of [['layer1Id', layer1], ['layer2Id', layer2], ['layer3Id', layer3], ['layer4Id', layer4], ['layer5Id', layer5]]) {
    if (mat && micOverrides[key] != null && mat.adjustableMic) {
      mat.thickness = micOverrides[key];
      mat.pricePerM2 = mat.pricePerKg * mat.thickness * mat.density / 1000;
    }
  }

  const isMang = productType === 'mang';
  const numImages = input.numImages || 1;
  const bagArea = spreadWidth * cutStep;
  const totalArea = isMang ? quantity : quantity * bagArea;
  if (totalArea <= 0 || spreadWidth <= 0) return null;

  const printWidth = spreadWidth * numImages + 0.02;
  const cutWidth = printWidth;
  const cutMeters = isMang
    ? totalArea / (spreadWidth * numImages)
    : totalArea / printWidth;
  const cutWaste = cutMeters / 3000 * 20 + 100;

  // Lam chain (lớp 5→2, từ ngoài vào trong)
  const lamChain = [layer5, layer4, layer3, layer2].filter(Boolean);
  let currentNeeded = cutMeters + cutWaste;
  let totalLamCost = 0;
  for (const l of lamChain) {
    const w = cutWidth + 0.02;
    const m = currentNeeded;
    const waste = m / 3000 * 20 + 100;
    const costCPSX = constants.ghepCPSX * (waste + m) * w;
    const costMat  = (l.pricePerM2 || 0) * (waste + m) * w;
    totalLamCost += costCPSX + costMat;
    currentNeeded  = m + waste;
  }
  const lamTotalWaste = lamChain.length * (cutMeters / 3000 * 20 + 100);

  // Print
  const printNLWidth = cutWidth + 0.02;
  const printMeters  = cutMeters + cutWaste + lamTotalWaste;
  const nc = numColors || 0;
  const cSetup    = nc > 0 ? (constants.colorSetup[nc] || (nc * 200 + 200)) : 0;
  const printWaste = nc > 0 ? (cSetup + printMeters / 6000 * 40) : 0;
  const inkPrice   = layer1.inkPricePerColor || (layer1.isPETorPA ? 135 : 120);
  const printCPSX  = nc > 0
    ? (nc * inkPrice * coverageRatio + constants.laborCost + metallicSurcharge) : 0;
  const printCostCPSX = printCPSX * (printWaste + printMeters) * printNLWidth;
  const printCostMat  = (layer1.pricePerM2 || 0) * (printWaste + printMeters) * printNLWidth;
  const printTotalCost = printCostCPSX + printCostMat;

  // Cut (chỉ túi)
  const cutCPSX = isMang ? 0 : (() => {
    const cutBase = constants.cutBase || 971;
    if      (bagArea < 0.07) return cutBase * 1.4;
    else if (bagArea < 0.2)  return cutBase * 1.2;
    else                      return cutBase * 0.8;
  })();
  const cutTotalCost = isMang ? 0 : cutCPSX * (cutWaste + cutMeters) * cutWidth;

  const totalProd  = printTotalCost + totalLamCost + cutTotalCost;
  const profitRate = lookupProfit(totalProd, profitColumn);
  const revenue    = totalProd * (1 + profitRate);
  const unit       = isMang ? totalArea : quantity;
  const costPerUnit = unit > 0 ? revenue / unit : 0;

  // Accessories
  const zipperPerUnit = hasZipper ? constants.zipperPrice * (cutMeters + cutWaste) / unit : 0;
  const tapePerUnit   = hasTape   ? constants.tapePrice   * (cutMeters + cutWaste) / unit : 0;
  const handlePerUnit = hasHandle ? constants.handlePrice : 0;
  const numBoxes      = bagsPerBox > 0 ? unit / bagsPerBox : 0;
  const boxPerUnit    = unit > 0 ? (boxPrice * numBoxes) / unit : 0;

  // Shipping
  const totalGSM = [layer1, layer2, layer3, layer4, layer5]
    .filter(Boolean)
    .reduce((s, l) => s + (l.thickness * l.density / 1000), 0);
  const totalWeightTons = totalGSM * totalArea / 1000000;
  const shippingPerUnit = unit > 0 ? (totalWeightTons * shippingPerKm * shippingKm) / unit : 0;

  const interestPerUnit    = (input.paymentInterestRate || 0.0025) * costPerUnit;
  const commissionPerUnit  = commissionFixedVND > 0
    ? commissionFixedVND
    : commissionRate * costPerUnit;
  const finalPrice = costPerUnit + zipperPerUnit + tapePerUnit + handlePerUnit
    + boxPerUnit + shippingPerUnit + interestPerUnit + commissionPerUnit;

  const layersList = [layer1, layer2, layer3, layer4, layer5].filter(Boolean);
  const structureText = layersList
    .map(l => `${l.name} ${l.thickness}`)
    .join('//');

  return { finalPrice, structureText, profitRate };
}

// ── Build HistoryItem array ───────────────────────────────────────────────────
const BASE_TIME = new Date('2026-03-20T08:00:00').getTime();
const history = [];

for (const phanBo of PHAN_BO_HISTORY) {
  const { inputIndex, sellerIndex, status, chotGiaRatio, ngayOffsetGio = 0 } = phanBo;
  const seller = SELLERS_MAU[sellerIndex];
  const rawInput = TAT_CA_DU_LIEU_MAU[inputIndex];
  if (!rawInput) {
    console.warn(`⚠ inputIndex ${inputIndex} vượt quá danh sách, bỏ qua.`);
    continue;
  }

  const fullInput = { ...rawInput };

  // Auto-calc cylLength / cylCircum nếu chưa đặt
  if (!fullInput.cylLength && fullInput.spreadWidth > 0) {
    const sw = fullInput.spreadWidth;
    const ni = fullInput.numImages || 1;
    fullInput.cylLength = Number(Math.max(0.7, sw * ni + 0.1).toFixed(3));
  }
  if (!fullInput.cylCircum && fullInput.cutStep > 0) {
    let N = 1;
    while (fullInput.cutStep * N < 0.4) N++;
    fullInput.cylCircum = Number((fullInput.cutStep * N).toFixed(3));
  }

  // Auto profitColumn
  const activeLayers = [
    fullInput.layer1Id, fullInput.layer2Id, fullInput.layer3Id,
    fullInput.layer4Id, fullInput.layer5Id,
  ].filter(Boolean);
  const hasMPETorAL = activeLayers.some(id => id &&
    (id.toUpperCase().includes('MPET') || id.toUpperCase().includes('AL')));
  fullInput.profitColumn = (
    activeLayers.length >= 3 || hasMPETorAL ||
    fullInput.bagType === 'dayDung' || fullInput.hasZipper
  ) ? 2 : 1;

  const result = calc(fullInput);
  if (!result) {
    console.warn(`⚠ Không tính được giá cho: ${rawInput.productName}, bỏ qua.`);
    continue;
  }

  const itemTime = BASE_TIME + ngayOffsetGio * 3600 * 1000;
  const dateStr  = new Date(itemTime).toLocaleDateString('vi-VN');
  const chotGia  = chotGiaRatio != null
    ? Math.round(result.finalPrice * chotGiaRatio)
    : undefined;

  history.push({
    id: String(itemTime),
    date: dateStr,
    customer: fullInput.customer,
    productName: fullInput.productName,
    structure: result.structureText,
    quantity: fullInput.quantity,
    finalPrice: Math.round(result.finalPrice * 10) / 10,
    ...(chotGia != null && { chotGia }),
    quoteStatus: status,
    sellerId: seller.id,
    sellerName: seller.name,
    input: fullInput,
  });
}

// ── Output ────────────────────────────────────────────────────────────────────
if (dryRun) {
  console.log('=== DRY RUN — không ghi file ===\n');
  console.log(JSON.stringify(history, null, 2));
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(history, null, 2), 'utf-8');
  console.log(`✅ Đã tạo ${history.length} báo giá mẫu → ${outPath}`);
}

// Thống kê
const statusCount  = {};
const sellerCount  = {};
const typeCount    = {};
for (const h of history) {
  statusCount[h.quoteStatus] = (statusCount[h.quoteStatus] || 0) + 1;
  sellerCount[h.sellerName]  = (sellerCount[h.sellerName]  || 0) + 1;
  typeCount[h.input.productType] = (typeCount[h.input.productType] || 0) + 1;
}
console.log('\nPhân bố:');
console.log('  Status:', statusCount);
console.log('  Seller:', sellerCount);
console.log('  Type  :', typeCount);
