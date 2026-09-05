/**
 * lsx-build-order.test.ts — build LSX order + batch MSP
 * Chạy: npx tsx src/lib/lsx-build-order.test.ts
 */

import type {
  AppConstants,
  CalculateInput,
  LsxSourceData,
  Material,
  ProductionOrder,
  ProfitRow,
} from './types';
import {
  buildLaminateLayersFromInput,
  buildLaminateLayersFromSource,
  buildLaminateNotesChecklist,
  buildProductionOrderFromSource,
  buildSnapshotFromSource,
  genLSXNumber,
  getMaterialLabel,
  lsxSnapshotTuInputValue,
  ganLsxSnapshotVaoInputValue,
  resolveLsxDualStandupLayer2Lengths,
  type BuildLsxOrderCtx,
} from './lsx-build-order';
import { formatLsxOrderQuantity } from './lsx-quantity';
import { genMsp, MSP_DEFAULT_SEED } from './lsx-msp';
import type { LsxNangCaoRow } from './lsx-nang-cao';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

const mat: Material = {
  id: 'PET12',
  name: 'PET',
  thickness: 12,
  density: 1.4,
  pricePerKg: 50000,
  inkPricePerColor: 0,
  rollLength: 6000,
  group: 'PET',
  isPETorPA: true,
};

const baseInput = (partial: Partial<CalculateInput> = {}): CalculateInput => ({
  productType: 'tui',
  bagType: '3bien',
  filmType: '',
  quantity: 1000,
  spreadWidth: 0.3,
  cutStep: 0.4,
  numColors: 2,
  numImages: 1,
  hasZipper: false,
  hasDivide: false,
  layer1Id: 'PET12',
  layer2Id: null,
  layer3Id: null,
  layer4Id: null,
  layer5Id: null,
  cylLength: 0.7,
  cylCircum: 0.6,
  filmRollLength: 1000,
  paymentDays: 30,
  customer: 'KH Test',
  productName: 'SP Test',
  ...partial,
} as CalculateInput);

function makeSource(id: string, productName: string, layer2?: string): LsxSourceData {
  return {
    id,
    customer: 'KH Test',
    productName,
    structure: layer2 ? `PET12/${layer2}` : 'PET12',
    finalPrice: 10000,
    chotGia: 10000,
    input: baseInput({
      productName,
      layer2Id: layer2 || null,
    }),
  };
}

const emptyCtx = (orders: ProductionOrder[] = []): BuildLsxOrderCtx => ({
  materials: [mat],
  constants: {} as AppConstants,
  profitTable: [] as ProfitRow[],
  smallWidthPrices: [],
  productionOrders: orders,
  preparedBy: 'Tester',
});

console.log('\n=== genLSXNumber ===');
{
  const fixed = new Date(2026, 6, 15); // 2026-07-15 → 2607
  assert('empty -> YYMM.01', genLSXNumber([], fixed) === '2607.01', genLSXNumber([], fixed));
  const withSameMonth = [
    { id: 'a', manual: { lsxNumber: '2607.01' } },
    { id: 'b', manual: { lsxNumber: '2607.03' } },
  ] as ProductionOrder[];
  assert(
    'same month max+1',
    genLSXNumber(withSameMonth, fixed) === '2607.04',
    genLSXNumber(withSameMonth, fixed),
  );
  const otherMonth = [
    { id: 'c', manual: { lsxNumber: '2606.99' } },
    { id: 'd', manual: { lsxNumber: 'LSX-20260715-001' } },
  ] as ProductionOrder[];
  assert(
    'other month / legacy ignored -> .01',
    genLSXNumber(otherMonth, fixed) === '2607.01',
    genLSXNumber(otherMonth, fixed),
  );
  const fromStrings = genLSXNumber(['2607.01', '2607.02'] as any, fixed);
  assert('accepts string lsxNumbers', fromStrings === '2607.03', fromStrings);
  const fromRows = genLSXNumber(
    [{ lsxNumber: '2607.09' }, { lsxNumber: '2607.10' }] as any,
    fixed,
  );
  assert('accepts { lsxNumber } rows', fromRows === '2607.11', fromRows);
  assert(
    'seq >= 100 not padded to 2 only when needed',
    genLSXNumber([{ manual: { lsxNumber: '2607.99' } }] as ProductionOrder[], fixed) === '2607.100',
    genLSXNumber([{ manual: { lsxNumber: '2607.99' } }] as ProductionOrder[], fixed),
  );
}

console.log('\n=== buildProductionOrderFromSource ===');
const s1 = makeSource('q1:s1', 'TUI GAO 5KG', 'LLDPE');
const o1 = buildProductionOrderFromSource(s1, emptyCtx());
assert('quoteId = source.id', o1.quoteId === 'q1:s1', o1.quoteId);
assert('productName snapshot', o1.snapshot.productName === 'TUI GAO 5KG', o1.snapshot.productName);
assert('tenSP filled', o1.manual.tenSP === 'TUI GAO 5KG', o1.manual.tenSP);
assert('msp auto TP_', /^TP_\d{6}$/.test(o1.manual.msp), o1.manual.msp);
assert('status created', o1.status === 'created');
assert('preparedBy', o1.manual.preparedBy === 'Tester');
assert(
  'manual quantity note applies edited tolerance',
  formatLsxOrderQuantity('25.000 túi', 5) === '25.000 túi  Dung sai (5%): 1.250 túi',
);
assert('default quantity tolerance is 10%', o1.manual.quantityTolerancePercent === 10);
assert('default width tolerance is 2mm', o1.manual.quyCachToleranceWidthMm === 2);
assert('default length tolerance is 3mm', o1.manual.quyCachToleranceLengthMm === 3);
assert('order quantity note stores base only', o1.manual.soLuongDHNote === '1.000 túi');
assert('order quantity approx from base × 10%', formatLsxOrderQuantity('1.000 túi', 10) === '1.000 túi  Dung sai (10%): 100 túi');
assert('hides dung sai when no number', formatLsxOrderQuantity('túi', 10) === 'túi');
assert('hides dung sai when tolerance 0', formatLsxOrderQuantity('1.000 túi', 0) === '1.000 túi');
assert('range note uses first number only', formatLsxOrderQuantity('5.400 túi - 6.000 túi', 10) === '5.400 túi - 6.000 túi  Dung sai (10%): 540 túi');

const sourceWithBagSize: LsxSourceData = {
  ...makeSource('q1:size', 'TUI QUY CACH', 'LLDPE'),
  bagWidthMm: 250,
  bagLengthMm: 180,
};
const orderWithBagSize = buildProductionOrderFromSource(sourceWithBagSize, emptyCtx());
assert('snapshot giữ rộng thành phẩm báo giá', orderWithBagSize.snapshot.bagWidthMm === 250, String(orderWithBagSize.snapshot.bagWidthMm));
assert('snapshot giữ dài thành phẩm báo giá', orderWithBagSize.snapshot.bagLengthMm === 180, String(orderWithBagSize.snapshot.bagLengthMm));

const sourceWithOriginalWidth: LsxSourceData = {
  ...makeSource('q1:divide-width', 'TUI CO CHIA', 'LLDPE'),
  input: baseInput({
    spreadWidth: 0.8,
    originalWidthMm: 820,
    hasDivide: true,
    divideWidthMm: 200,
    divideElements: 4,
  }),
};
const orderWithOriginalWidth = buildProductionOrderFromSource(sourceWithOriginalWidth, emptyCtx());
assert('snapshot giữ khổ màng 820 từ tính giá', orderWithOriginalWidth.snapshot.originalWidthMm === 820, String(orderWithOriginalWidth.snapshot.originalWidthMm));
assert('pricing sheet legacy prefill khổ chia', orderWithOriginalWidth.manual.divideWidth === 200, String(orderWithOriginalWidth.manual.divideWidth));
assert('pricing sheet legacy prefill số phần tử', orderWithOriginalWidth.manual.divideElements === 4, String(orderWithOriginalWidth.manual.divideElements));

const sourceWithDivideFlagOnly: LsxSourceData = {
  ...makeSource('q1:divide-flag', 'TUI CO CHIA MOI', 'LLDPE'),
  input: baseInput({
    spreadWidth: 0.8,
    originalWidthMm: 820,
    hasDivide: true,
  }),
};
const orderWithDivideFlagOnly = buildProductionOrderFromSource(sourceWithDivideFlagOnly, emptyCtx());
assert('pricing sheet mới giữ cờ có chia', orderWithDivideFlagOnly.snapshot.hasDivide === true);
assert('pricing sheet mới không prefill khổ chia', orderWithDivideFlagOnly.manual.divideWidth === 0, String(orderWithDivideFlagOnly.manual.divideWidth));
assert('pricing sheet mới không prefill số phần tử', orderWithDivideFlagOnly.manual.divideElements === 0, String(orderWithDivideFlagOnly.manual.divideElements));

console.log('\n=== khổ ghép túi đáy đứng hai cấu trúc (chỉ LSX) ===');

function dualStandupSource(
  bottomFollows: 'front' | 'back',
  structureSwapped: boolean,
): LsxSourceData {
  return {
    ...makeSource('q1:dual-standup', 'TUI DAY DUNG 2 CT', 'LLDPE'),
    input: baseInput({
      bagType: 'dayDung',
      spreadWidth: 0.56,
      layer2Id: 'LLDPE',
      layer2AltId: 'MPET12',
      layer2Lengths: { mat1: 0.28, mat2: 0.28 },
    } as Partial<CalculateInput>),
    bagWidthMm: 250,
    bagLengthMm: 180,
    bottomFollows,
    structureSwapped,
  };
}

const widthCases = [
  { bottomFollows: 'front', structureSwapped: false, expected: { mat1: 0.31, mat2: 0.25 } },
  { bottomFollows: 'back', structureSwapped: false, expected: { mat1: 0.25, mat2: 0.31 } },
  { bottomFollows: 'front', structureSwapped: true, expected: { mat1: 0.25, mat2: 0.31 } },
  { bottomFollows: 'back', structureSwapped: true, expected: { mat1: 0.31, mat2: 0.25 } },
] as const;

for (const c of widthCases) {
  const source = dualStandupSource(c.bottomFollows, c.structureSwapped);
  const original = { ...source.input.layer2Lengths! };
  const actual = resolveLsxDualStandupLayer2Lengths(source);
  const label = `${c.bottomFollows}/${c.structureSwapped ? 'swapped' : 'normal'}`;
  assert(`${label}: đúng khổ main`, actual?.mat1 === c.expected.mat1, String(actual?.mat1));
  assert(`${label}: đúng khổ alt`, actual?.mat2 === c.expected.mat2, String(actual?.mat2));
  assert(`${label}: không mutate input`, source.input.layer2Lengths?.mat1 === original.mat1 && source.input.layer2Lengths?.mat2 === original.mat2);
}

const nonStandup = dualStandupSource('front', false);
nonStandup.input = { ...nonStandup.input, bagType: '3bien' };
assert('túi không phải đáy đứng không tự tính', resolveLsxDualStandupLayer2Lengths(nonStandup) === undefined);

const invalidWidth = dualStandupSource('front', false);
invalidWidth.bagWidthMm = 600;
assert('R túi không nhỏ hơn khổ trải thì fallback', resolveLsxDualStandupLayer2Lengths(invalidWidth) === undefined);

const builtDualSource = dualStandupSource('front', false);
const builtDual = buildProductionOrderFromSource(builtDualSource, emptyCtx());
assert('order dùng khổ LSX đã suy ra cho main', builtDual.manual.laminateLayers?.[0]?.parts[0]?.widthMm === 310, String(builtDual.manual.laminateLayers?.[0]?.parts[0]?.widthMm));
assert('order dùng khổ LSX đã suy ra cho alt', builtDual.manual.laminateLayers?.[0]?.parts[1]?.widthMm === 250, String(builtDual.manual.laminateLayers?.[0]?.parts[1]?.widthMm));
assert('build order không đổi layer2Lengths input gốc', builtDualSource.input.layer2Lengths?.mat1 === 0.28 && builtDualSource.input.layer2Lengths?.mat2 === 0.28);
assert('snapshot giữ mặt đi cùng đáy', builtDual.snapshot.bottomFollows === 'front', String(builtDual.snapshot.bottomFollows));
assert('snapshot giữ trạng thái đảo cấu trúc', builtDual.snapshot.structureSwapped === false, String(builtDual.snapshot.structureSwapped));

const structureMaterials: Material[] = [
  { ...mat, id: 'MOPP20', name: 'Matt OPP', thickness: 20 },
  { ...mat, id: 'CPP50', name: 'CPP50', thickness: 50 },
];
const structureSource: LsxSourceData = {
  ...makeSource('q1:structure-mic', 'TUI MATT OPP', 'CPP50'),
  structure: 'Matt OPP//CPP',
  input: baseInput({
    layer1Id: 'MOPP20',
    layer2Id: 'CPP50',
    micOverrides: { layer1Id: 18 },
  }),
};
const structureSnapshot = buildSnapshotFromSource(
  structureSource,
  orderWithBagSize.manual,
  structureMaterials,
);
assert(
  'snapshot LSX dùng cấu trúc có mic override',
  structureSnapshot.structure === 'Matt OPP18//CPP50',
  structureSnapshot.structure,
);

const fallbackStructureSource: LsxSourceData = {
  ...structureSource,
  structure: 'CẤU TRÚC LEGACY',
  input: baseInput({ layer1Id: null, layer2Id: null }),
};
const fallbackStructureSnapshot = buildSnapshotFromSource(
  fallbackStructureSource,
  orderWithBagSize.manual,
  structureMaterials,
);
assert(
  'không dựng được layer thì giữ source.structure',
  fallbackStructureSnapshot.structure === 'CẤU TRÚC LEGACY',
  fallbackStructureSnapshot.structure,
);

console.log('\n=== batch MSP sequence ===');
const s2 = makeSource('q1:s2', 'TUI GAO 10KG', 'LLDPE');
const o2 = buildProductionOrderFromSource(s2, emptyCtx([o1]));
const n1 = parseInt(o1.manual.msp.replace(/^TP_/i, ''), 10);
const n2 = parseInt(o2.manual.msp.replace(/^TP_/i, ''), 10);
assert('msp o2 > o1', n2 > n1, `${o1.manual.msp} vs ${o2.manual.msp}`);
assert('msp o2 = o1+1 when only o1 exists', n2 === n1 + 1, `${o1.manual.msp} → ${o2.manual.msp}`);

console.log('\n=== genMsp seed ===');
assert('empty seed+1', genMsp([]) === `TP_${String(MSP_DEFAULT_SEED + 1).padStart(6, '0')}`);

console.log('\n=== hasHalfMoonBottom → useSemicircularMold ===');
const sHalf = makeSource('q1:half', 'TUI DAY BN', 'LLDPE');
sHalf.hasHalfMoonBottom = true;
sHalf.input = baseInput({ productName: 'TUI DAY BN', bagType: 'dayDung', layer2Id: 'LLDPE' });
const oHalf = buildProductionOrderFromSource(sHalf, emptyCtx());
assert('prefill mold true', oHalf.manual.useSemicircularMold === true);

const sNoHalf = makeSource('q1:nohalf', 'TUI THUONG', 'LLDPE');
sNoHalf.input = baseInput({ productName: 'TUI THUONG', bagType: 'dayDung', layer2Id: 'LLDPE' });
const oNoHalf = buildProductionOrderFromSource(sNoHalf, emptyCtx());
assert('prefill mold false when no flag', oNoHalf.manual.useSemicircularMold === false);

console.log('\n=== hasSongSieuAm → manual.songSieuAm (cutSealNapKeo) ===');
const sSA = makeSource('q1:sa', 'TUI NAP KEO', 'LLDPE');
sSA.hasSongSieuAm = true;
sSA.songSieuAmMm = 28;
sSA.input = baseInput({ productName: 'TUI NAP KEO', bagType: 'cutSealNapKeo', layer2Id: 'LLDPE' });
const oSA = buildProductionOrderFromSource(sSA, emptyCtx());
assert('prefill songSieuAm = 28 từ báo giá', oSA.manual.songSieuAm === 28, String(oSA.manual.songSieuAm));
assert('snapshot hasSongSieuAm true', oSA.snapshot.hasSongSieuAm === true);
assert('snapshot songSieuAmMm = 28', oSA.snapshot.songSieuAmMm === 28, String(oSA.snapshot.songSieuAmMm));

const sSANoTick = makeSource('q1:sa-no', 'TUI NAP KEO 2', 'LLDPE');
sSANoTick.input = baseInput({ productName: 'TUI NAP KEO 2', bagType: 'cutSealNapKeo', layer2Id: 'LLDPE' });
const oSANoTick = buildProductionOrderFromSource(sSANoTick, emptyCtx());
assert('không tick → giữ default 32 từ applyBagDefaults', oSANoTick.manual.songSieuAm === 32, String(oSANoTick.manual.songSieuAm));
assert('snapshot hasSongSieuAm falsy khi không tick', !oSANoTick.snapshot.hasSongSieuAm);

console.log('\n=== sideSealMm/headSealMm → hàn biên/hàn đầu từ báo giá ===');
const sSeal = makeSource('q1:seal', 'TUI 4 BIEN', 'LLDPE');
sSeal.sideSealMm = 10;
sSeal.headSealMm = 50;
sSeal.input = baseInput({ productName: 'TUI 4 BIEN', bagType: '4bien', layer2Id: 'LLDPE' });
const oSeal = buildProductionOrderFromSource(sSeal, emptyCtx());
assert('prefill hanBien = 10 từ báo giá', oSeal.manual.hanBien === 10, String(oSeal.manual.hanBien));
assert('prefill sealEdge = "10mm" từ báo giá', oSeal.manual.sealEdge === '10mm', oSeal.manual.sealEdge);
assert('prefill hanDau = 50 từ báo giá', oSeal.manual.hanDau === 50, String(oSeal.manual.hanDau));

const sSealNone = makeSource('q1:seal-none', 'TUI 4 BIEN 2', 'LLDPE');
sSealNone.input = baseInput({ productName: 'TUI 4 BIEN 2', bagType: '4bien', layer2Id: 'LLDPE' });
const oSealNone = buildProductionOrderFromSource(sSealNone, emptyCtx());
assert('không sideSealMm → giữ default hanBien 10 từ applyBagDefaults', oSealNone.manual.hanBien === 10, String(oSealNone.manual.hanBien));
assert('không headSealMm → giữ default hanDau 50 từ applyBagDefaults', oSealNone.manual.hanDau === 50, String(oSealNone.manual.hanDau));

console.log('\n=== field máy túi mở rộng → prefill từ báo giá ===');

const sFull = makeSource('q1:full', 'TUI 4 BIEN FULL', 'LLDPE');
sFull.hasTearNotch = true;
sFull.tearNotchFromTopMm = 15;
sFull.hasHandleHole = true;
sFull.handleHoleDescription = '3 lỗ quai xách';
sFull.hasHangHole = true;
sFull.hangHoleDescription = 'Ø8mm giữa';
sFull.gussetMm = 80;
sFull.lidMm = 40;
sFull.hasBottomSeal = true;
sFull.bottomSealMm = 20;
sFull.input = baseInput({ productName: 'TUI 4 BIEN FULL', bagType: '4bien', layer2Id: 'LLDPE' });
const oFull = buildProductionOrderFromSource(sFull, emptyCtx());
assert('prefill tearNotch "cách đầu 15mm"', oFull.manual.tearNotch === 'cách đầu 15mm', oFull.manual.tearNotch);
assert('prefill holePunchInfo từ handleHoleDescription', oFull.manual.holePunchInfo === '3 lỗ quai xách', oFull.manual.holePunchInfo);
assert('prefill loTreoInfo từ hangHoleDescription', oFull.manual.loTreoInfo === 'Ø8mm giữa', oFull.manual.loTreoInfo);
assert('prefill xepHong = 80 (ghi đè default 60)', oFull.manual.xepHong === 80, String(oFull.manual.xepHong));
assert('prefill nap = 40', oFull.manual.nap === 40, String(oFull.manual.nap));
assert('prefill hanDay = 20', oFull.manual.hanDay === 20, String(oFull.manual.hanDay));

const sLech = makeSource('q1:lech', 'TUI LUNG LECH', 'LLDPE');
sLech.backSealMm = 12;
sLech.input = baseInput({ productName: 'TUI LUNG LECH', bagType: 'xephong_lech', layer2Id: 'LLDPE' });
const oLech = buildProductionOrderFromSource(sLech, emptyCtx());
assert('prefill danLungLech = 12 (xephong_lech)', oLech.manual.danLungLech === 12, String(oLech.manual.danLungLech));

const sDung = makeSource('q1:dung', 'TUI DAY DUNG', 'LLDPE');
sDung.standupBottomSideMm = 50;
sDung.input = baseInput({ productName: 'TUI DAY DUNG', bagType: 'dayDung', layer2Id: 'LLDPE' });
const oDung = buildProductionOrderFromSource(sDung, emptyCtx());
assert('prefill foldBottom = "100mm" (đáy ×2)', oDung.manual.foldBottom === '100mm', oDung.manual.foldBottom);

const sNone = makeSource('q1:full-none', 'TUI 4 BIEN EMPTY', 'LLDPE');
sNone.input = baseInput({ productName: 'TUI 4 BIEN EMPTY', bagType: '4bien', layer2Id: 'LLDPE' });
const oNone = buildProductionOrderFromSource(sNone, emptyCtx());
assert('không data tearNotch → rỗng', !oNone.manual.tearNotch, String(oNone.manual.tearNotch));
assert('không data hanDay → 0 (undefined)', !oNone.manual.hanDay, String(oNone.manual.hanDay));
assert('không data xepHong → giữ default 60', oNone.manual.xepHong === 60, String(oNone.manual.xepHong));

console.log('\n=== phụ kiện zipper KHÔNG tự điền khi báo giá không có ===');
const sZipperNone = makeSource('q1:zip-none', 'TUI ZIPPER TRONG', 'LLDPE');
sZipperNone.input = baseInput({ productName: 'TUI ZIPPER TRONG', bagType: '3bien', hasZipper: true, layer2Id: 'LLDPE' });
const oZipperNone = buildProductionOrderFromSource(sZipperNone, emptyCtx());
assert('hasZipper + không zipperDistanceMm → tamZipperCachMieng rỗng', !oZipperNone.manual.tamZipperCachMieng, String(oZipperNone.manual.tamZipperCachMieng));
assert('hasZipper + không hasTearNotch → tearNotch rỗng', !oZipperNone.manual.tearNotch, String(oZipperNone.manual.tearNotch));

console.log('\n=== dual laminate: 1 pass nhiều parts ===');
const mats = [
  { id: 'PET12', name: 'PET', thickness: 12 },
  { id: 'MPET12', name: 'MPET', thickness: 12 },
  { id: 'LLDPE125', name: 'LLDPE', thickness: 125 },
];
const dualInput = baseInput({
  layer1Id: 'PET12',
  layer2Id: 'PET12',
  layer2AltId: 'MPET12',
  layer3Id: 'LLDPE125',
  spreadWidth: 0.48,
  layer2Lengths: { mat1: 0.24, mat2: 0.24 },
} as Partial<CalculateInput>);
const dualLayers = buildLaminateLayersFromInput(dualInput, mats);
// Lớp in (L1) KHÔNG vào máy ghép: dual L2 + L3 = 2 passes
assert('2 passes (L2 dual + L3), lớp in không tính', dualLayers.length === 2, String(dualLayers.length));
assert('pass1 = L2 dual 2 parts', dualLayers[0].parts.length === 2, String(dualLayers[0].parts.length));
assert('pass1 label Màng ghép 1', dualLayers[0].label === 'Màng ghép 1', dualLayers[0].label);
assert('pass1 layerIndex = 2', dualLayers[0].layerIndex === 2, String(dualLayers[0].layerIndex));
assert('pass2 1 part L3', dualLayers[1].parts.length === 1);
assert('pass2 label Màng ghép 2', dualLayers[1].label === 'Màng ghép 2', dualLayers[1].label);
assert('pass2 layerIndex = 3', dualLayers[1].layerIndex === 3, String(dualLayers[1].layerIndex));
assert(
  'không còn dòng ghép nào chỉ chứa màng in PET đơn lẻ',
  !dualLayers.some((r) => r.parts.length === 1 && r.parts[0].name === 'PET12'),
  JSON.stringify(dualLayers.map((r) => r.parts.map((p) => p.name))),
);
const notes = buildLaminateNotesChecklist(dualLayers);
assert('notes has 3 lines', notes.split('\n').length === 3, notes);
assert('notes PET khổ', notes.includes('khổ'), notes);

const b2b = buildLaminateLayersFromInput(
  baseInput({
    layer1Id: 'PET12',
    layer2Id: 'PET12',
    layer2AltId: 'MPET12',
    layer2PairingMode: 'bottom_to_bottom',
  } as Partial<CalculateInput>),
  mats,
);
// Lớp in không tính → chỉ còn L2 b2b = 1 pass
assert('b2b 1 pass', b2b.length === 1, String(b2b.length));
assert('b2b pass1 caps at 2 parts', b2b[0].parts.length === 2);
assert('b2b pass1 label Màng ghép 1', b2b[0].label === 'Màng ghép 1', b2b[0].label);

console.log('\n=== getMaterialLabel chuẩn hóa LLDPE ===');
const lldpeMats = [
  { id: 'LLDPE_THUONG', name: 'LLDPE thường', thickness: 125 },
  { id: 'LLDPE_GAO', name: 'LLDPE (gạo)', thickness: 50 },
  { id: 'LLDPE_SUA', name: 'LLDPE sữa', thickness: 80 },
  { id: 'PET12', name: 'PET', thickness: 12 },
];
assert('LLDPE thường → LLDPE125', getMaterialLabel(lldpeMats, 'LLDPE_THUONG') === 'LLDPE125');
assert('LLDPE (gạo) → LLDPE50', getMaterialLabel(lldpeMats, 'LLDPE_GAO') === 'LLDPE50');
assert('LLDPE sữa → LLDPE80', getMaterialLabel(lldpeMats, 'LLDPE_SUA') === 'LLDPE80');
assert('PET → PET12', getMaterialLabel(lldpeMats, 'PET12') === 'PET12');
assert(
  'mic override',
  getMaterialLabel(lldpeMats, 'LLDPE_THUONG', 100) === 'LLDPE100',
);

console.log('\n=== snapshot đóng băng trong inputValue (lsxSnapshot) ===');

const snap = orderWithBagSize.snapshot;
const manualCoSnap = ganLsxSnapshotVaoInputValue(orderWithBagSize.manual, snap) as Record<string, unknown>;
assert('embed giữ nguyên manual fields', manualCoSnap.tenSP === orderWithBagSize.manual.tenSP, String(manualCoSnap.tenSP));
assert('embed thêm key lsxSnapshot', manualCoSnap.lsxSnapshot !== undefined);
const snapRut = lsxSnapshotTuInputValue(manualCoSnap);
assert('extract trả snapshot đã lưu', snapRut !== null && snapRut.bagWidthMm === snap.bagWidthMm, JSON.stringify(snapRut));
assert('inputValue null → snapshot null', lsxSnapshotTuInputValue(null) === null);
assert('inputValue rỗng → snapshot null', lsxSnapshotTuInputValue({}) === null);
assert('inputValue thiếu lsxSnapshot → null', lsxSnapshotTuInputValue({ lsxNumber: '2607.01' }) === null);

console.log('\n=== stage ghi chú + mô tả khác từ báo giá → manual LSX ===');

const sourceStage = (overrides?: Partial<LsxSourceData>): LsxSourceData => ({
  ...sourceWithBagSize,
  stageNotes: [{ stage: 'lam-tui', text: 'aaaa' }],
  stageDescriptions: [
    { stage: 'in', text: 'màu theo mẫu đã duyệt' },
    { stage: 'lam-tui', text: 'Từ sóng siêu âm...' },
  ],
  ...overrides,
});
const orderStage = buildProductionOrderFromSource(sourceStage(), emptyCtx());
const m = orderStage.manual;
assert('ghi chú [lam-tui] → bagLuuY', m.bagLuuY === 'aaaa', m.bagLuuY);
assert('ghi chú [in] không set → printNotes rỗng', m.printNotes === '', m.printNotes);
assert('ghi chú [chia] không set → divideNotes rỗng', m.divideNotes === '', m.divideNotes);
assert('mô tả [in] → inDesc', m.inDesc === 'màu theo mẫu đã duyệt', m.inDesc);
assert('mô tả [lam-tui] → bagDesc', m.bagDesc === 'Từ sóng siêu âm...', m.bagDesc);
assert('mô tả các stage khác để trống', m.lamDesc === '' && m.divideDesc === '', `lam=${m.lamDesc} chia=${m.divideDesc}`);

console.log('\n=== nangCaoSpec (bảng đặc tả nâng cao) trong snapshot ===');

const mauSpec: LsxNangCaoRow[] = [
  { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.56, thanhPham: 12000, phiHao: 840, dauVaoNVL: 12840, cpVatLieu: 0, donViGiaNVL: 'kg' },
  { congDoan: 'Ghép 1', vatLieu: 'MPET12', khoMang: 0.56, thanhPham: 11700, phiHao: 110, dauVaoNVL: 11810, cpVatLieu: 0, donViGiaNVL: 'kg' },
  { congDoan: 'Làm túi', vatLieu: 'PET12 + Zipper', khoMang: 0.22, thanhPham: 5500, phiHao: 140, dauVaoNVL: 5640, cpVatLieu: 0, donViGiaNVL: 'kg' },
];

const sourceCoSpec = { ...sourceWithBagSize, nangCaoSpec: mauSpec };
const snapCoSpec = buildSnapshotFromSource(sourceCoSpec, orderWithBagSize.manual, []);
assert(
  'buildSnapshotFromSource lưu nangCaoSpec từ source',
  Array.isArray(snapCoSpec.nangCaoSpec) && (snapCoSpec.nangCaoSpec as LsxNangCaoRow[]).length === 3,
);

const snapKhongSpec = buildSnapshotFromSource(sourceWithBagSize, orderWithBagSize.manual, []);
assert('source không có nangCaoSpec → undefined', snapKhongSpec.nangCaoSpec === undefined);

const sourceSpecRong = { ...sourceWithBagSize, nangCaoSpec: [] };
const snapSpecRong = buildSnapshotFromSource(sourceSpecRong, orderWithBagSize.manual, []);
assert(
  'source.nangCaoSpec rỗng [] → undefined (không lưu field thừa)',
  snapSpecRong.nangCaoSpec === undefined,
);

console.log('\n=== buildProductionOrderFromSource lấy nangCaoSpec từ source ===');
const orderCoSpec = buildProductionOrderFromSource(sourceCoSpec, emptyCtx());
assert('order có nangCaoSpec khi source có', (orderCoSpec.snapshot.nangCaoSpec as LsxNangCaoRow[] | undefined)?.length === 3);

const orderKhongSpec = buildProductionOrderFromSource(sourceWithBagSize, emptyCtx());
assert('order không có nangCaoSpec khi source không có', orderKhongSpec.snapshot.nangCaoSpec === undefined);

console.log('\n=== ý 8: prefill DMPH/TPYC từ BẢNG ĐẶC TẢ (round nguyên), SL cấp VTT ghép trống ===');
{
  // Số liệu dạng LSX 2609.04: In lẻ (16.624,143 / 1.810,828), ghép 2 lớp,
  // Làm túi 313,333 — manual phải bằng giá trị ĐẶC TẢ round nguyên, KHÔNG engine.
  const spec8: LsxNangCaoRow[] = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.82, thanhPham: 16624.143, phiHao: 1810.828, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 16414.2, phiHao: 209.4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'PET12', khoMang: 0.4, thanhPham: 16414.2, phiHao: 209.4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 16414.2, phiHao: 209.4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 3)', vatLieu: 'LLDPE125', khoMang: 0.82, thanhPham: 16205.6, phiHao: 208.4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'Chia', vatLieu: '—', khoMang: 0.4, thanhPham: 32411.2, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: null },
    { congDoan: 'Làm túi', vatLieu: '-', khoMang: 0.4, thanhPham: 32000, phiHao: 313.333, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: null },
  ];
  const source8: LsxSourceData = { ...sourceWithBagSize, nangCaoSpec: spec8 };
  const o8 = buildProductionOrderFromSource(source8, emptyCtx());
  const m8 = o8.manual;
  assert('DMPH in = round(1810.828) = 1811', m8.printWastePercent === 1811, String(m8.printWastePercent));
  assert('TPYC in = round(16624.143) = 16624', m8.printProductQty === 16624, String(m8.printProductQty));
  assert('TPYC ghép = TP dòng ghép cuối round(16205.6) = 16206', m8.lamProductQty === 16206, String(m8.lamProductQty));
  assert('waste ghép lớp 2 = 209 (phi hao cấp lớp, không cộng 3 dòng)', m8.laminateLayers?.[0]?.wasteMeters === 209, String(m8.laminateLayers?.[0]?.wasteMeters));
  assert('waste ghép lớp 3 = 208', m8.laminateLayers?.[1]?.wasteMeters === 208, String(m8.laminateLayers?.[1]?.wasteMeters));
  assert('DMPH túi = round(313.333) = 313', m8.bagWasteMeters === 313, String(m8.bagWasteMeters));
  assert('SL cấp vật tư ghép để TRỐNG (chỉ In điền)', m8.lamMaterialSupplyQty === '', JSON.stringify(m8.lamMaterialSupplyQty));
  assert('ghi chú BTP derive từ TP in spec', m8.lamBTPNote.includes('16.624'), String(m8.lamBTPNote));
  // LSX cũ không spec → giữ prefill engine như trước
  const oKhongSpec = buildProductionOrderFromSource(sourceWithBagSize, emptyCtx());
  assert('không spec: lamMaterialSupplyQty cũng để trống', oKhongSpec.manual.lamMaterialSupplyQty === '', JSON.stringify(oKhongSpec.manual.lamMaterialSupplyQty));
}

console.log('\n=== buildLaminateLayersFromSource — ưu tiên nangCaoSpec ===');

{
  // Multi-layer composite: GHÉP (Lớp 2) có 3 vật liệu (MPET 0.21, PET 0.4, MPET 0.21)
  const spec3Lop: LsxNangCaoRow[] = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.82, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 1, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'PET12', khoMang: 0.4, thanhPham: 12000, phiHao: 2, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 3, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 3)', vatLieu: 'LLDPE125', khoMang: 0.82, thanhPham: 12000, phiHao: 4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const source3Lop: LsxSourceData = {
    ...sourceWithBagSize,
    input: baseInput({ layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE125', spreadWidth: 0.5 }),
    nangCaoSpec: spec3Lop,
  };
  const layers = buildLaminateLayersFromSource(source3Lop, mats);
  assert('nangCaoSpec 3 lớp → 2 layers', layers.length === 2, String(layers.length));
  assert('layer[0] label "GHÉP (Lớp 2)"', layers[0].label === 'GHÉP (Lớp 2)', layers[0].label);
  assert('layer[0] 2 parts (gộp trùng tên vật liệu)', layers[0].parts.length === 2, String(layers[0].parts.length));
  assert('layer[0].parts[0].widthMm = 210 (MPET, khổ dòng đầu)', layers[0].parts[0].widthMm === 210, String(layers[0].parts[0].widthMm));
  assert('layer[0].parts[0].name = MPET12', layers[0].parts[0].name === 'MPET12', layers[0].parts[0].name);
  assert('layer[0].parts[1].widthMm = 400 (PET)', layers[0].parts[1].widthMm === 400, String(layers[0].parts[1].widthMm));
  assert('layer[1] label "GHÉP (Lớp 3)"', layers[1].label === 'GHÉP (Lớp 3)', layers[1].label);
  assert('layer[1] 1 part', layers[1].parts.length === 1, String(layers[1].parts.length));
  assert('layer[1].parts[0].widthMm = 820 (LLDPE)', layers[1].parts[0].widthMm === 820, String(layers[1].parts[0].widthMm));
}
{
  // Source không có nangCaoSpec → fallback legacy
  const sourceNoSpec: LsxSourceData = {
    ...sourceWithBagSize,
    input: baseInput({ layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE125', spreadWidth: 0.5 }),
  };
  const layersLegacy = buildLaminateLayersFromInput(sourceNoSpec.input, mats);
  const layersFromSource = buildLaminateLayersFromSource(sourceNoSpec, mats);
  assert('fallback legacy khi không có spec', JSON.stringify(layersFromSource) === JSON.stringify(layersLegacy));
}
{
  // Source có nangCaoSpec rỗng [] → fallback legacy
  const sourceRong: LsxSourceData = {
    ...sourceWithBagSize,
    input: baseInput({ layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE125', spreadWidth: 0.5 }),
    nangCaoSpec: [],
  };
  const layersLegacy = buildLaminateLayersFromInput(sourceRong.input, mats);
  const layersFromSource = buildLaminateLayersFromSource(sourceRong, mats);
  assert('nangCaoSpec rỗng [] → fallback legacy', JSON.stringify(layersFromSource) === JSON.stringify(layersLegacy));
}
{
  // nangCaoSpec chỉ có In (không có Ghép) → fallback legacy
  const specOnlyIn: LsxNangCaoRow[] = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.5, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const sourceOnlyIn: LsxSourceData = {
    ...sourceWithBagSize,
    input: baseInput({ layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE125', spreadWidth: 0.5 }),
    nangCaoSpec: specOnlyIn,
  };
  const layersLegacy = buildLaminateLayersFromInput(sourceOnlyIn.input, mats);
  const layersFromSource = buildLaminateLayersFromSource(sourceOnlyIn, mats);
  assert('spec chỉ có In (không Ghép) → fallback legacy', JSON.stringify(layersFromSource) === JSON.stringify(layersLegacy));
}

console.log('\n=== buildProductionOrderFromSource dùng nangCaoSpec cho laminateLayers ===');

{
  const spec3Lop: LsxNangCaoRow[] = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.82, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 1, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'PET12', khoMang: 0.4, thanhPham: 12000, phiHao: 2, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 3, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 3)', vatLieu: 'LLDPE125', khoMang: 0.82, thanhPham: 12000, phiHao: 4, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const source3Lop: LsxSourceData = {
    ...sourceWithBagSize,
    input: baseInput({ layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE125', spreadWidth: 0.5 }),
    nangCaoSpec: spec3Lop,
  };
  const order = buildProductionOrderFromSource(source3Lop, emptyCtx());
  const lams = order.manual.laminateLayers;
  assert('order.manual.laminateLayers.length = 2 (2 Ghép sections)', lams?.length === 2, String(lams?.length));
  assert('order.manual.laminateLayers[0].parts.length = 2 (gộp trùng tên)', lams?.[0].parts.length === 2, String(lams?.[0].parts.length));
  assert('order.manual.laminateLayers[0].parts[1].widthMm = 400 (PET)', lams?.[0].parts[1].widthMm === 400, String(lams?.[0].parts[1].widthMm));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
