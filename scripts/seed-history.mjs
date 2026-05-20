/**
 * Seed script: tạo dữ liệu mẫu history.json thực tế
 * Chạy: node scripts/seed-history.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load raw data từ /data root (single source of truth)
const materialsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/materials.json'), 'utf-8'));
const constantsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/constants.json'), 'utf-8'));
const profitRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/profitTable.json'), 'utf-8'));

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

const profitTable = profitRaw.rows;
const PROFIT_DEFAULT = profitRaw.profitDefault;

// ── Simplified engine (đủ để tính finalPrice & structureText) ────────────
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
  const { quantity, spreadWidth, cutStep, numColors, metallicSurcharge = 0,
    coverageRatio = 1, profitColumn = 2, hasZipper, hasTape, hasHandle,
    layer1Id, layer2Id, layer3Id, layer4Id, layer5Id,
    shippingPerKm = 0, shippingKm = 0, boxPrice = 0, bagsPerBox = 0,
    commissionRate = 0, commissionFixedVND = 0, micOverrides = {} } = input;

  const layer1 = layer1Id ? { ...getMat(layer1Id) } : null;
  const layer2 = layer2Id ? { ...getMat(layer2Id) } : null;
  const layer3 = layer3Id ? { ...getMat(layer3Id) } : null;
  const layer4 = layer4Id ? { ...getMat(layer4Id) } : null;
  const layer5 = layer5Id ? { ...getMat(layer5Id) } : null;
  if (!layer1 || quantity <= 0 || spreadWidth <= 0 || cutStep <= 0) return null;

  // Override mic
  for (const [key, mat] of [['layer1Id', layer1], ['layer2Id', layer2], ['layer3Id', layer3], ['layer4Id', layer4], ['layer5Id', layer5]]) {
    if (mat && micOverrides[key] && mat.adjustableMic) {
      mat.thickness = micOverrides[key];
      mat.pricePerM2 = mat.pricePerKg * mat.thickness * mat.density / 1000;
    }
  }

  const numImages = input.numImages || 1;
  const middleLayers = [layer2, layer3, layer4].filter(Boolean);
  const numLaminations = (layer5 ? 1 : 0) + middleLayers.length;

  const bagArea = spreadWidth * cutStep;
  const totalArea = quantity * bagArea;
  const printWidth = spreadWidth * numImages + 0.02;
  const filmLength = printWidth > 0 ? totalArea / printWidth : 0;
  const cutWidth = printWidth;
  const cutMeters = filmLength;
  const cutWaste = cutMeters / 3000 * 20 + 100;

  // Lam
  let currentNeeded = cutMeters + cutWaste;
  let totalLamCost = 0;
  const lamChain = [
    { l: layer5 }, { l: layer4 }, { l: layer3 }, { l: layer2 }
  ].filter(x => !!x.l);
  for (const { l } of lamChain) {
    const w = cutWidth + 0.02;
    const m = currentNeeded;
    const waste = m / 3000 * 20 + 100;
    const costCPSX = constants.ghepCPSX * (waste + m) * w;
    const costMat = (l.pricePerM2 || 0) * (waste + m) * w;
    totalLamCost += costCPSX + costMat;
    currentNeeded = m + waste;
  }

  const totalLamWaste = lamChain.length > 0 ? lamChain.reduce((s, _, i) => {
    // approximate
    return s + (cutMeters + cutWaste) / 3000 * 20 + 100;
  }, 0) : 0;

  // Print
  const printNLWidth = cutWidth + 0.02;
  const printMeters = cutMeters + cutWaste + totalLamWaste;
  const nc = numColors || 0;
  const cSetup = nc > 0 ? (constants.colorSetup[nc] || (nc * 200 + 200)) : 0;
  const printWaste = nc > 0 ? (cSetup + (printMeters / 6000 * 40)) : 0;
  const inkPrice = layer1.inkPricePerColor || (layer1.isPETorPA ? 135 : 120);
  const printCPSX = nc > 0 ? (nc * inkPrice * coverageRatio + constants.laborCost + metallicSurcharge) : 0;
  const printCostCPSX = printCPSX * (printWaste + printMeters) * printNLWidth;
  const printCostMat = (layer1.pricePerM2 || 0) * (printWaste + printMeters) * printNLWidth;
  const printTotalCost = printCostCPSX + printCostMat;

  // Cut
  const cutBase = constants.cutBase || 971;
  let cutCPSX;
  if (bagArea < 0.07) cutCPSX = cutBase * 1.4;
  else if (bagArea < 0.2) cutCPSX = cutBase * 1.2;
  else cutCPSX = cutBase * 0.8;
  const cutTotalCost = cutCPSX * (cutWaste + cutMeters) * cutWidth;

  const totalProd = printTotalCost + totalLamCost + cutTotalCost;
  const profitRate = lookupProfit(totalProd, profitColumn);
  const revenue = totalProd * (1 + profitRate);
  const costPerUnit = quantity > 0 ? revenue / quantity : 0;

  // Accessories
  const zipperPerUnit = hasZipper ? constants.zipperPrice * (cutMeters + cutWaste) / quantity : 0;
  const tapePerUnit = hasTape ? constants.tapePrice * (cutMeters + cutWaste) / quantity : 0;
  const handlePerUnit = hasHandle ? constants.handlePrice : 0;

  const numBoxes = bagsPerBox > 0 ? quantity / bagsPerBox : 0;
  const boxPerUnit = quantity > 0 ? (boxPrice * numBoxes) / quantity : 0;

  // Shipping
  const totalGSM = layer1.thickness * layer1.density / 1000
    + (layer2 ? layer2.thickness * layer2.density / 1000 : 0)
    + (layer3 ? layer3.thickness * layer3.density / 1000 : 0)
    + (layer4 ? layer4.thickness * layer4.density / 1000 : 0)
    + (layer5 ? layer5.thickness * layer5.density / 1000 : 0);
  const tareWeight = totalGSM * bagArea;
  const totalWeightTons = tareWeight * quantity / 1000000;
  const shippingTotal = totalWeightTons * shippingPerKm * shippingKm;
  const shippingPerUnit = quantity > 0 ? shippingTotal / quantity : 0;

  const laiNam = (constants.interestBase ?? 0.10) + (constants.interestSpread ?? 0.03);
  const interestPerUnit = laiNam / 365 * (input.paymentDays || constants.paymentDays || 30) * costPerUnit;
  let commissionPerUnit = commissionFixedVND > 0 ? commissionFixedVND : commissionRate * costPerUnit;

  const finalPrice = costPerUnit + zipperPerUnit + tapePerUnit + handlePerUnit
    + boxPerUnit + shippingPerUnit + interestPerUnit + commissionPerUnit;

  let structureText = layer1.name + ' ' + layer1.thickness;
  if (layer2) structureText += '//' + layer2.name + ' ' + layer2.thickness;
  if (layer3) structureText += '//' + layer3.name + ' ' + layer3.thickness;
  if (layer4) structureText += '//' + layer4.name + ' ' + layer4.thickness;
  if (layer5) structureText += '//' + layer5.name + ' ' + layer5.thickness;

  return { finalPrice, structureText };
}

// ── Dữ liệu mẫu ────────────────────────────────────────────────────────────
const SELLERS = [
  { id: 'S1', name: 'Nguyễn Văn An' },
  { id: 'S2', name: 'Trần Thị Bích' },
  { id: 'S3', name: 'Lê Hoàng Minh' },
];

const sampleInputs = [
  {
    customer: 'Công ty TNHH Thực Phẩm Minh Tâm',
    productName: 'Túi đựng cà phê 250g',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 50000, numColors: 4, numImages: 2,
    layer1Id: 'PET', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.18, cutStep: 0.26,
    micOverrides: { layer2Id: 80 },
  },
  {
    customer: 'Công ty CP Bánh Kẹo Hải Hà',
    productName: 'Bao bì bánh quy hộp 500g',
    productType: 'tui', bagType: 'dayDung', filmType: '',
    quantity: 100000, numColors: 6, numImages: 1,
    layer1Id: 'BOPP20', layer2Id: 'MPET', layer3Id: 'LLDPE', layer4Id: null, layer5Id: null,
    spreadWidth: 0.32, cutStep: 0.22,
    micOverrides: { layer3Id: 60 },
  },
  {
    customer: 'Sài Gòn Food',
    productName: 'Túi hút chân không xúc xích 200g',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 80000, numColors: 3, numImages: 2,
    layer1Id: 'PA', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.15, cutStep: 0.2,
    micOverrides: { layer2Id: 70 },
  },
  {
    customer: 'Vinamilk - CN miền Nam',
    productName: 'Màng co sữa lốc 4 hộp',
    productType: 'mang', bagType: '', filmType: 'mangCo',
    quantity: 200000, numColors: 8, numImages: 1,
    layer1Id: 'LLDPE', layer2Id: null, layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.4, cutStep: 0.15,
    micOverrides: { layer1Id: 50 },
  },
  {
    customer: 'Công ty TNHH Gia Vị Cholimex',
    productName: 'Túi đựng nước tương 500ml',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 120000, numColors: 5, numImages: 2,
    layer1Id: 'PET', layer2Id: 'PA', layer3Id: 'LLDPE', layer4Id: null, layer5Id: null,
    spreadWidth: 0.14, cutStep: 0.28,
    micOverrides: { layer3Id: 100 },
  },
  {
    customer: 'Acecook Việt Nam',
    productName: 'Bao bì mì gói Hảo Hảo',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 500000, numColors: 7, numImages: 3,
    layer1Id: 'BOPP20', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.19, cutStep: 0.17,
    micOverrides: { layer2Id: 40 },
  },
  {
    customer: 'Nestlé Việt Nam',
    productName: 'Túi zip đựng bột Milo 1kg',
    productType: 'tui', bagType: 'dayDung', filmType: '',
    quantity: 30000, numColors: 4, numImages: 1,
    layer1Id: 'PET', layer2Id: 'MPET', layer3Id: 'LLDPE', layer4Id: null, layer5Id: null,
    spreadWidth: 0.22, cutStep: 0.35,
    hasZipper: true,
    micOverrides: { layer3Id: 90 },
  },
  {
    customer: 'TH True Milk',
    productName: 'Màng bọc sữa tươi 1L x 12',
    productType: 'mang', bagType: '', filmType: 'mangCo',
    quantity: 150000, numColors: 6, numImages: 1,
    layer1Id: 'LLDPE', layer2Id: null, layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.52, cutStep: 0.18,
    micOverrides: { layer1Id: 60 },
  },
  {
    customer: 'Công ty TNHH Hạt Điều Bình Phước',
    productName: 'Túi hạt điều rang muối 500g',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 40000, numColors: 3, numImages: 2,
    layer1Id: 'MattOPP18', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.2, cutStep: 0.3,
    micOverrides: { layer2Id: 80 },
  },
  {
    customer: 'Công ty CP Trà Phúc Long',
    productName: 'Túi trà Earl Grey cao cấp 100g',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 25000, numColors: 2, numImages: 1,
    layer1Id: 'PET', layer2Id: 'MCPP25', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.12, cutStep: 0.2,
  },
  {
    customer: 'Orion Vina',
    productName: 'Bao bì Choco Pie hộp 12 cái',
    productType: 'tui', bagType: 'dayDung', filmType: '',
    quantity: 60000, numColors: 5, numImages: 1,
    layer1Id: 'BOPP20', layer2Id: 'LLDPE', layer3Id: null, layer4Id: null, layer5Id: null,
    spreadWidth: 0.28, cutStep: 0.2,
    micOverrides: { layer2Id: 50 },
  },
  {
    customer: 'Masan Consumer',
    productName: 'Túi nước mắm Chin-Su 500ml',
    productType: 'tui', bagType: '3bien', filmType: '',
    quantity: 300000, numColors: 6, numImages: 2,
    layer1Id: 'PET', layer2Id: 'PA', layer3Id: 'LLDPE', layer4Id: null, layer5Id: null,
    spreadWidth: 0.13, cutStep: 0.25,
    micOverrides: { layer3Id: 90 },
  },
];

// ── Phân bố status & seller ────────────────────────────────────────────────
// Muốn đa dạng: drafted, pending_approval, approved, completed
const assignments = [
  { seller: 0, status: 'drafted',          chotGia: null },     // Sale An – đang soạn
  { seller: 0, status: 'pending_approval', chotGia: null },     // Sale An – đã gửi admin
  { seller: 0, status: 'approved',         chotGia: null },     // Sale An – admin duyệt
  { seller: 0, status: 'completed',        chotGia: 1.05 },     // Sale An – hoàn thành (chotGia = +5%)
  { seller: 1, status: 'drafted',          chotGia: null },     // Sale Bích – đang soạn
  { seller: 1, status: 'pending_approval', chotGia: null },     // Sale Bích – gửi admin
  { seller: 1, status: 'completed',        chotGia: 0.98 },     // Sale Bích – hoàn thành (giảm 2%)
  { seller: 2, status: 'drafted',          chotGia: null },     // Sale Minh – soạn
  { seller: 2, status: 'pending_approval', chotGia: null },     // Sale Minh – gửi admin
  { seller: 2, status: 'approved',         chotGia: null },     // Sale Minh – admin duyệt
  { seller: 1, status: 'approved',         chotGia: null },     // Sale Bích – admin duyệt thêm
  { seller: 2, status: 'completed',        chotGia: 1.02 },     // Sale Minh – hoàn thành
];

// ── Build items ──────────────────────────────────────────────────────────────
const baseTime = new Date('2026-03-25T08:00:00').getTime();
const history = [];

for (let i = 0; i < assignments.length; i++) {
  const { seller: sellerIdx, status, chotGia: chotGiaRatio } = assignments[i];
  const s = SELLERS[sellerIdx];
  const tmpl = sampleInputs[i % sampleInputs.length];

  const fullInput = {
    customer: tmpl.customer || '',
    productName: tmpl.productName || '',
    productType: tmpl.productType || 'tui',
    bagType: tmpl.bagType || '',
    filmType: tmpl.filmType || '',
    quantity: tmpl.quantity || 10000,
    numColors: tmpl.numColors ?? 0,
    numImages: tmpl.numImages || 1,
    layer1Id: tmpl.layer1Id || null,
    layer2Id: tmpl.layer2Id || null,
    layer3Id: tmpl.layer3Id || null,
    layer4Id: tmpl.layer4Id || null,
    layer5Id: tmpl.layer5Id || null,
    spreadWidth: tmpl.spreadWidth || 0.2,
    cutStep: tmpl.cutStep || 0.2,
    metallicSurcharge: 0,
    coverageRatio: 1,
    handleWeight: 0,
    zipperWeight: tmpl.hasZipper ? constants.zipperWeight : 0,
    tapeWeight: 0,
    hasZipper: tmpl.hasZipper || false,
    hasTape: false,
    hasHandle: false,
    paymentDays: 30,
    profitColumn: 2,
    commissionRate: 0,
    commissionFixedVND: 0,
    commissionUnit: 'percent',
    commissionInputValue: 0,
    bagsPerBox: 0,
    boxPrice: 0,
    shippingPerKm: 0,
    shippingKm: 0,
    cylLength: 0,
    cylCircum: 0,
    cylUnitPrice: 7300000,
    micOverrides: tmpl.micOverrides || {},
  };

  // Auto-calc cylinder
  const sw = fullInput.spreadWidth;
  const ni = fullInput.numImages;
  if (sw > 0) {
    const base = sw * ni;
    let nCalc = 1;
    while (base * nCalc + 0.1 < 0.7) nCalc++;
    fullInput.cylLength = Number((base * nCalc + 0.1).toFixed(3));
  }
  const cs = fullInput.cutStep;
  if (cs > 0) {
    let N = 1;
    while (cs * N < 0.4) N++;
    fullInput.cylCircum = Number((cs * N).toFixed(3));
  }

  // Auto profitColumn
  const activeLayers = [fullInput.layer1Id, fullInput.layer2Id, fullInput.layer3Id, fullInput.layer4Id, fullInput.layer5Id].filter(Boolean);
  const numLayers = activeLayers.length;
  const hasMPETorAL = activeLayers.some(id => id && (id.toUpperCase().includes('MPET') || id.toUpperCase().includes('AL')));
  fullInput.profitColumn = (numLayers >= 3 || hasMPETorAL || fullInput.bagType === 'dayDung' || fullInput.hasZipper) ? 2 : 1;

  const result = calc(fullInput);
  if (!result) {
    console.warn(`⚠ Skipping item ${i} — calc returned null`);
    continue;
  }

  const itemTime = baseTime + i * 3600 * 1000 * 6; // cách 6 tiếng
  const dateStr = new Date(itemTime).toLocaleDateString('vi-VN');

  const item = {
    id: String(itemTime),
    date: dateStr,
    customer: fullInput.customer,
    productName: fullInput.productName,
    structure: result.structureText,
    quantity: fullInput.quantity,
    finalPrice: result.finalPrice,
    chotGia: chotGiaRatio ? Math.round(result.finalPrice * chotGiaRatio) : undefined,
    quoteStatus: status,
    sellerId: s.id,
    sellerName: s.name,
    input: fullInput,
  };

  history.push(item);
}

// ── Write ────────────────────────────────────────────────────────────────────
const outPath = path.join(ROOT, 'data', 'history.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(history, null, 2), 'utf-8');

console.log(`✅ Đã tạo ${history.length} báo giá mẫu → ${outPath}`);
console.log('\nPhân bố:');
const statusCount = {};
const sellerCount = {};
for (const h of history) {
  statusCount[h.quoteStatus] = (statusCount[h.quoteStatus] || 0) + 1;
  sellerCount[h.sellerName] = (sellerCount[h.sellerName] || 0) + 1;
}
console.log('  Status:', statusCount);
console.log('  Seller:', sellerCount);
