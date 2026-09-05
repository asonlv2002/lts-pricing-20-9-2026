/**
 * format-structure.test.ts — formatChatLieuNhuBaoGia (giống dòng Chất liệu BG)
 * Chạy: npx tsx src/lib/format-structure.test.ts
 */
import {
  boSoCauTruc,
  formatChatLieuNhuBaoGia,
  buildSideStructureText,
  normalizeMaterialBaseName,
  cauTrucMatTrucTuLop,
} from './format-structure';

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

const mats = [
  { id: 'PET12', name: 'PET', thickness: 12 },
  { id: 'MPET12', name: 'MPET', thickness: 12 },
  { id: 'LLDPE50', name: 'LLDPE', thickness: 50 },
  { id: 'LLDPE120', name: 'LLDPE', thickness: 120 },
];

console.log('\n=== normalizeMaterialBaseName ===');
assert('thường', normalizeMaterialBaseName('LLDPE thường') === 'LLDPE');
assert('(gạo)', normalizeMaterialBaseName('LLDPE (gạo)') === 'LLDPE');
assert('sữa', normalizeMaterialBaseName('LLDPE sữa') === 'LLDPE');
assert('id LLDPE_GAO', normalizeMaterialBaseName('LLDPE_GAO') === 'LLDPE');
assert('PET giữ', normalizeMaterialBaseName('PET') === 'PET');

console.log('\n=== boSoCauTruc ===');
assert('strip mic', boSoCauTruc('PET 12//MPET 12//LLDPE 120') === 'PET//MPET//LLDPE');
assert('LLDPE thường strip', boSoCauTruc('LLDPE thường 125//PET 12') === 'LLDPE//PET');

console.log('\n=== 1 cấu trúc ===');
const s1 = formatChatLieuNhuBaoGia(mats, {
  layer1Id: 'PET12',
  layer2Id: 'MPET12',
  layer3Id: 'LLDPE120',
});
assert('3 lớp', s1 === 'PET//MPET//LLDPE', s1);

const s2 = formatChatLieuNhuBaoGia(mats, {
  layer1Id: 'PET12',
  layer2Id: 'LLDPE50',
});
assert('2 lớp', s2 === 'PET//LLDPE', s2);

console.log('\n=== 2 cấu trúc ===');
const dual = formatChatLieuNhuBaoGia(
  mats,
  {
    layer1Id: 'PET12',
    layer2Id: 'LLDPE50',
    layer2AltId: 'MPET12',
    bagType: '3bien',
  },
  {
    structureBack: buildSideStructureText(mats, 'PET12', 'MPET12'),
    structureSwapped: false,
    bagType: '3bien',
  },
);
assert(
  'mặt trước/sau',
  dual === 'Mặt trước: PET//LLDPE, Mặt sau: PET//MPET',
  dual,
);

const dualSwap = formatChatLieuNhuBaoGia(
  mats,
  {
    layer1Id: 'PET12',
    layer2Id: 'LLDPE50',
    layer2AltId: 'MPET12',
  },
  {
    structureBack: buildSideStructureText(mats, 'PET12', 'MPET12'),
    structureSwapped: true,
    bagType: '3bien',
  },
);
assert(
  'swapped',
  dualSwap === 'Mặt trước: PET//MPET, Mặt sau: PET//LLDPE',
  dualSwap,
);

console.log('\n=== dayDung + Đáy ===');
const dayFront = formatChatLieuNhuBaoGia(
  mats,
  {
    layer1Id: 'PET12',
    layer2Id: 'LLDPE50',
    layer2AltId: 'MPET12',
    bagType: 'dayDung',
  },
  {
    structureBack: buildSideStructureText(mats, 'PET12', 'MPET12'),
    structureSwapped: false,
    bottomFollows: 'front',
    bagType: 'dayDung',
  },
);
assert(
  'đáy theo trước',
  dayFront === 'Mặt trước + Đáy: PET//LLDPE, Mặt sau: PET//MPET',
  dayFront,
);

const dayBack = formatChatLieuNhuBaoGia(
  mats,
  {
    layer1Id: 'PET12',
    layer2Id: 'LLDPE50',
    layer2AltId: 'MPET12',
    bagType: 'dayDung',
  },
  {
    structureBack: buildSideStructureText(mats, 'PET12', 'MPET12'),
    structureSwapped: false,
    bottomFollows: 'back',
    bagType: 'dayDung',
  },
);
assert(
  'đáy theo sau',
  dayBack === 'Mặt trước: PET//LLDPE, Mặt sau + Đáy: PET//MPET',
  dayBack,
);

console.log('\n=== dual không bagSpec (fallback layers) ===');
const dualFallback = formatChatLieuNhuBaoGia(mats, {
  layer1Id: 'PET12',
  layer2Id: 'LLDPE50',
  layer2AltId: 'MPET12',
  bagType: '3bien',
});
assert(
  'fallback dual',
  dualFallback === 'Mặt trước: PET//LLDPE, Mặt sau: PET//MPET',
  dualFallback,
);

console.log('\n=== cauTrucMatTrucTuLop (mặt trước bỏ notation [A + B]) ===');
const mt1 = cauTrucMatTrucTuLop(mats, {
  layer1Id: 'PET12',
  layer2Id: 'MPET12',
  layer2AltId: 'PET12',
  layer3Id: 'LLDPE120',
});
assert('dual → mặt trước từ layer IDs', mt1 === 'PET//MPET//LLDPE', mt1 ?? 'null');

const mt2 = cauTrucMatTrucTuLop(mats, {
  layer1Id: 'PET12',
  layer2Id: 'LLDPE50',
});
assert('thiếu layer2AltId → null', mt2 === null, String(mt2));

const mt3 = cauTrucMatTrucTuLop(mats, {
  layer1Id: 'PET12',
  layer2Id: 'KHONGTONTAI',
  layer2AltId: 'MPET12',
});
assert('id lạ → null (fallback chuỗi engine)', mt3 === null, String(mt3));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
