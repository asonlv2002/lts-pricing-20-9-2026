/**
 * lsx-structure.test.ts — cấu trúc LSX giữ tên vật liệu + mic thực tế.
 * Chạy: npx tsx src/lib/lsx-structure.test.ts
 */

import type { CalculateInput } from './types';
import {
  formatLsxMaterialWithMic,
  formatLsxStructure,
} from './lsx-structure';

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

const materials = [
  { id: 'MOPP20', name: 'Matt OPP', thickness: 20 },
  { id: 'CPP50', name: 'CPP50', thickness: 50 },
  { id: 'PET12', name: 'PET 12', thickness: 12 },
  { id: 'LLDPE125', name: 'LLDPE (gạo)', thickness: 125 },
];

const input = (partial: Partial<CalculateInput> = {}): CalculateInput => ({
  productType: 'tui',
  bagType: '3bien',
  filmType: '',
  quantity: 1000,
  spreadWidth: 0.56,
  cutStep: 0.18,
  numColors: 2,
  numImages: 1,
  layer1Id: 'MOPP20',
  layer2Id: 'CPP50',
  layer3Id: null,
  layer4Id: null,
  layer5Id: null,
  filmRollLength: 1000,
  customer: 'KH',
  productName: 'SP',
  hasZipper: false,
  paymentDays: 30,
  cylLength: 0.7,
  cylCircum: 0.5,
  ...partial,
} as CalculateInput);

console.log('formatLsxMaterialWithMic');

assert(
  'nối tên + mic không khoảng trắng',
  formatLsxMaterialWithMic(materials, 'MOPP20') === 'Matt OPP20',
  formatLsxMaterialWithMic(materials, 'MOPP20'),
);
assert(
  'tên đã có mic không bị lặp số',
  formatLsxMaterialWithMic(materials, 'CPP50') === 'CPP50',
  formatLsxMaterialWithMic(materials, 'CPP50'),
);
assert(
  'tên có khoảng trắng trước mic được chuẩn hóa',
  formatLsxMaterialWithMic(materials, 'PET12') === 'PET12',
  formatLsxMaterialWithMic(materials, 'PET12'),
);
assert(
  'LLDPE biến thể được chuẩn hóa và giữ mic',
  formatLsxMaterialWithMic(materials, 'LLDPE125') === 'LLDPE125',
  formatLsxMaterialWithMic(materials, 'LLDPE125'),
);
assert(
  'mic override thắng thickness mặc định',
  formatLsxMaterialWithMic(materials, 'MOPP20', 18) === 'Matt OPP18',
  formatLsxMaterialWithMic(materials, 'MOPP20', 18),
);

console.log('\nformatLsxStructure');

assert(
  'một cấu trúc giữ đủ mic',
  formatLsxStructure(materials, input()) === 'Matt OPP20//CPP50',
  formatLsxStructure(materials, input()),
);
assert(
  'một cấu trúc dùng mic override',
  formatLsxStructure(materials, input({ micOverrides: { layer1Id: 18 } })) === 'Matt OPP18//CPP50',
  formatLsxStructure(materials, input({ micOverrides: { layer1Id: 18 } })),
);

const dualInput = input({
  bagType: 'dayDung',
  layer1Id: 'PET12',
  layer2Id: 'CPP50',
  layer2AltId: 'LLDPE125',
});

assert(
  'hai cấu trúc: mặt trước + đáy giữ đủ mic',
  formatLsxStructure(materials, dualInput, {
    bottomFollows: 'front',
    structureSwapped: false,
  }) === 'Mặt trước + Đáy: PET12//CPP50, Mặt sau: PET12//LLDPE125',
  formatLsxStructure(materials, dualInput, {
    bottomFollows: 'front',
    structureSwapped: false,
  }),
);

assert(
  'hai cấu trúc: đảo mặt và đáy theo mặt sau',
  formatLsxStructure(materials, dualInput, {
    bottomFollows: 'back',
    structureSwapped: true,
  }) === 'Mặt trước: PET12//LLDPE125, Mặt sau + Đáy: PET12//CPP50',
  formatLsxStructure(materials, dualInput, {
    bottomFollows: 'back',
    structureSwapped: true,
  }),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
