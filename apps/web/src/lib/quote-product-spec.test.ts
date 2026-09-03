/**
 * quote-product-spec.test.ts — Chất liệu 2 mặt dropdown chọn đúng option.
 *
 * Reproduce bug dropdown wizard BG đứng im trên option 1 dù user chọn option khác:
 *   - Trước fix: `findIndex` chỉ so `structureBack` → mọi option có cùng
 *     `backStructure` đều khớp index 0 → dropdown luôn hiển thị option 1.
 *   - Sau fix: so đủ `structureBack + structureSwapped + bottomFollows` → trả về
 *     index đúng của option đang chọn.
 *
 * Chạy: npx tsx src/lib/quote-product-spec.test.ts
 */
import type { CalculateInput, Material } from './types';
import { generateStructureBackOptions, type StructureBackOption } from './quote-product-spec';

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

/**
 * Hàm `selectedIdx` được dùng trong `<select>` dropdown của wizard BG
 * (apps/web/src/components/ModuleBaoGia.tsx, block "Chất liệu 2 mặt").
 * Khi trả về >= 0, dropdown hiển thị option đó; khi trả về -1, fallback index 0.
 *
 * Bài test này tách hàm này ra để có thể kiểm thử pure, không cần React.
 */
function findSelectedOptionIdx(
  opts: StructureBackOption[],
  spec: {
    structureBack: string;
    structureSwapped: boolean;
    bottomFollows: 'front' | 'back';
  },
): number {
  if (!spec.structureBack) return -1;
  return opts.findIndex(
    (o) =>
      o.structureBack === spec.structureBack &&
      o.structureSwapped === spec.structureSwapped &&
      o.bottomFollows === spec.bottomFollows,
  );
}

const materials: Material[] = [
  { id: 'PET12', name: 'PET', thickness: 12, density: 1.4, pricePerKg: 0, isPETorPA: true, rollLength: 0, inkPricePerColor: 0 },
  { id: 'MPET12', name: 'MPET', thickness: 12, density: 1.4, pricePerKg: 0, isPETorPA: true, rollLength: 0, inkPricePerColor: 0 },
  { id: 'LLDPE120', name: 'LLDPE', thickness: 120, density: 0.92, pricePerKg: 0, isPETorPA: false, rollLength: 0, inkPricePerColor: 0 },
];

const baseInput = (overrides: Partial<CalculateInput> = {}): CalculateInput => ({
  productType: 'tui',
  bagType: '3bien',
  filmType: '',
  quantity: 1000,
  spreadWidth: 0.4,
  cutStep: 0.3,
  numColors: 1,
  numImages: 1,
  layer1Id: 'PET12',
  layer2Id: 'MPET12',
  layer2AltId: 'PET12',
  layer3Id: 'LLDPE120',
  layer4Id: null,
  layer5Id: null,
  filmRollLength: 1000,
  customer: 'KH',
  productName: 'SP',
  hasZipper: false,
  paymentDays: 30,
  cylLength: 0.7,
  cylCircum: 0.5,
  ...overrides,
} as CalculateInput);

console.log('=== Chất liệu 2 mặt — dropdown chọn đúng option (regression) ===');

// Case 1: Túi 3 biên (không phải dayDung) — 2 options, chỉ khác structureSwapped
const optsFlat = generateStructureBackOptions(baseInput(), '3bien', materials);
assert('flat có 2 options', optsFlat.length === 2, `length=${optsFlat.length}`);
assert(
  'cả 2 options cùng structureBack (PET//PET//LLDPE)',
  optsFlat[0].structureBack === optsFlat[1].structureBack,
  `${optsFlat[0].structureBack} vs ${optsFlat[1].structureBack}`,
);

// Trước fix: chỉ so structureBack → luôn index 0
const buggyIdxForSwapped = optsFlat.findIndex(
  (o) => o.structureBack === optsFlat[1].structureBack,
);
assert(
  '[OLD BUG] chỉ so structureBack trả về 0 cho option đảo (regression)',
  buggyIdxForSwapped === 0,
  `buggyIdx=${buggyIdxForSwapped}`,
);

// Sau fix: so đủ 3 trường
assert(
  'option 0 (không đảo) match khi structureSwapped=false',
  findSelectedOptionIdx(optsFlat, {
    structureBack: optsFlat[0].structureBack,
    structureSwapped: false,
    bottomFollows: 'front',
  }) === 0,
);
assert(
  'option 1 (đảo) match khi structureSwapped=true',
  findSelectedOptionIdx(optsFlat, {
    structureBack: optsFlat[1].structureBack,
    structureSwapped: true,
    bottomFollows: 'front',
  }) === 1,
);
assert(
  'option 1 vẫn match khi structureSwapped=true (không bị đẩy về 0)',
  findSelectedOptionIdx(optsFlat, {
    structureBack: optsFlat[1].structureBack,
    structureSwapped: true,
    bottomFollows: 'front',
  }) !== 0,
);

// Case 2: Túi đáy đứng — 4 options, khác structureSwapped × bottomFollows
const optsDayDung = generateStructureBackOptions(
  baseInput({ bagType: 'dayDung' }),
  'dayDung',
  materials,
);
assert('dayDung có 4 options', optsDayDung.length === 4, `length=${optsDayDung.length}`);
assert(
  'cả 4 options cùng structureBack',
  new Set(optsDayDung.map((o) => o.structureBack)).size === 1,
);

const dayDungExpected: Array<{
  structureSwapped: boolean;
  bottomFollows: 'front' | 'back';
  label: string;
}> = [
  { structureSwapped: false, bottomFollows: 'front', label: 'A: trước+đáy, không đảo' },
  { structureSwapped: true, bottomFollows: 'front', label: 'B: trước+đáy, đảo' },
  { structureSwapped: false, bottomFollows: 'back', label: 'C: sau+đáy, không đảo' },
  { structureSwapped: true, bottomFollows: 'back', label: 'D: sau+đáy, đảo' },
];

dayDungExpected.forEach((c, i) => {
  const idx = findSelectedOptionIdx(optsDayDung, {
    structureBack: optsDayDung[0].structureBack,
    structureSwapped: c.structureSwapped,
    bottomFollows: c.bottomFollows,
  });
  assert(
    `dayDung ${c.label} → index ${i}`,
    idx === i,
    `expected=${i} got=${idx}`,
  );
});

// Bug cũ: chỉ so structureBack → 4/4 option đều trả về index 0
const buggyDayDungIdxs = optsDayDung.map((_, i) => {
  const same = optsDayDung.findIndex(
    (o) => o.structureBack === optsDayDung[i].structureBack,
  );
  return same;
});
assert(
  '[OLD BUG] dayDung: chỉ so structureBack trả 0 cho cả 4 options (regression)',
  buggyDayDungIdxs.every((i) => i === 0),
  JSON.stringify(buggyDayDungIdxs),
);

// Case 3: spec.structureBack rỗng → fallback -1
assert(
  'structureBack rỗng → -1 (UI fallback index 0)',
  findSelectedOptionIdx(optsFlat, {
    structureBack: '',
    structureSwapped: false,
    bottomFollows: 'front',
  }) === -1,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
