/**
 * bao-gia-adapter.test.ts — map productBagSpecs.hasHalfMoonBottom → LsxSourceData
 * Chạy: npx tsx src/lib/bao-gia-adapter.test.ts
 */
import type { BaoGiaApi, PricingSheetApi } from './api/service-lts';
import { mapBaoGiaToLsxSources } from './bao-gia-adapter';

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

// Mock store materials used by formatChatLieuNhuBaoGia
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
try {
  dungCuaHangTinhGia.setState({
    materials: [
      { id: 'PET12', name: 'PET', thickness: 12 },
      { id: 'MPET12', name: 'MPET', thickness: 12 },
      { id: 'LLDPE50', name: 'LLDPE', thickness: 50 },
      { id: 'LLDPE120', name: 'LLDPE', thickness: 120 },
    ],
  } as never);
} catch {
  /* store may already be ready */
}

function sheet(
  id: string,
  productName: string,
  layers?: { layer1Id?: string; layer2Id?: string; layer2AltId?: string; layer3Id?: string; bagType?: string },
): PricingSheetApi {
  return {
    id,
    pricingSheetName: productName,
    inputValue: {
      productType: 'tui',
      bagType: layers?.bagType || 'dayDung',
      productName,
      quantity: 1000,
      spreadWidth: 0.3,
      cutStep: 0.4,
      numColors: 2,
      layer1Id: layers?.layer1Id || 'PET12',
      layer2Id: layers?.layer2Id,
      layer2AltId: layers?.layer2AltId,
      layer3Id: layers?.layer3Id,
      customer: 'KH A',
    },
    saleResult: { finalPrice: 12000 },
  } as PricingSheetApi;
}

console.log('\n=== mapBaoGiaToLsxSources hasHalfMoonBottom ===');

const bg: BaoGiaApi = {
  id: 'q-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      {
        pricingSheetId: 'ps-1',
        productName: 'SP1',
        bagSpec: {
          hasHalfMoonBottom: true,
          widthMm: 250,
          lengthMm: 180,
          bottomFollows: 'front',
          structureSwapped: true,
        },
      },
      {
        pricingSheetId: 'ps-2',
        productName: 'SP2',
        bagSpec: { hasHalfMoonBottom: false },
      },
    ],
  },
  pricingSheets: [sheet('ps-1', 'SP1'), sheet('ps-2', 'SP2')],
};

const sources = mapBaoGiaToLsxSources(bg);
assert('2 sources', sources.length === 2, String(sources.length));
assert('ps-1 half moon true', sources[0]?.hasHalfMoonBottom === true);
assert('ps-2 half moon falsy', !sources[1]?.hasHalfMoonBottom);
assert('ps-1 giữ rộng thành phẩm từ báo giá', sources[0]?.bagWidthMm === 250, String(sources[0]?.bagWidthMm));
assert('ps-1 giữ dài thành phẩm từ báo giá', sources[0]?.bagLengthMm === 180, String(sources[0]?.bagLengthMm));
assert('ps-1 giữ mặt đi cùng đáy', sources[0]?.bottomFollows === 'front', String(sources[0]?.bottomFollows));
assert('ps-1 giữ trạng thái đảo cấu trúc', sources[0]?.structureSwapped === true, String(sources[0]?.structureSwapped));

const bgIndexOnly: BaoGiaApi = {
  id: 'q-2',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [{ bagSpec: { hasHalfMoonBottom: true } }],
  },
  pricingSheets: [sheet('ps-x', 'SPX')],
};
const sIndex = mapBaoGiaToLsxSources(bgIndexOnly);
assert('fallback index match', sIndex[0]?.hasHalfMoonBottom === true);

console.log('\n=== structure giống Chất liệu BG ===');

const bgStruct: BaoGiaApi = {
  id: 'q-struct',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      {
        pricingSheetId: 'ps-a',
        bagSpec: { bagType: '3bien' },
      },
      {
        pricingSheetId: 'ps-b',
        bagSpec: {
          bagType: '3bien',
          structureBack: 'PET 12//MPET 12',
          structureSwapped: false,
          hasStructureBack: true,
        },
      },
      {
        pricingSheetId: 'ps-c',
        bagSpec: {
          bagType: 'dayDung',
          structureBack: 'PET 12//MPET 12',
          structureSwapped: false,
          bottomFollows: 'front',
          hasStructureBack: true,
        },
      },
    ],
  },
  pricingSheets: [
    sheet('ps-a', 'SP A', { layer1Id: 'PET12', layer2Id: 'MPET12', layer3Id: 'LLDPE120', bagType: '3bien' }),
    sheet('ps-b', 'SP B', { layer1Id: 'PET12', layer2Id: 'LLDPE50', layer2AltId: 'MPET12', bagType: '3bien' }),
    sheet('ps-c', 'SP C', { layer1Id: 'PET12', layer2Id: 'LLDPE50', layer2AltId: 'MPET12', bagType: 'dayDung' }),
  ],
};

const ss = mapBaoGiaToLsxSources(bgStruct);
assert('1 cấu trúc', ss[0]?.structure === 'PET//MPET//LLDPE', ss[0]?.structure);
assert(
  '2 cấu trúc',
  ss[1]?.structure === 'Mặt trước: PET//LLDPE, Mặt sau: PET//MPET',
  ss[1]?.structure,
);
assert(
  'dayDung + Đáy',
  ss[2]?.structure === 'Mặt trước + Đáy: PET//LLDPE, Mặt sau: PET//MPET',
  ss[2]?.structure,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

console.log('\n=== mapBaoGiaToLsxSources hasSongSieuAm + songSieuAmMm ===');

const bgSA: BaoGiaApi = {
  id: 'q-sa',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      {
        pricingSheetId: 'ps-sa',
        productName: 'Túi SA',
        bagSpec: {
          hasSongSieuAm: true,
          songSieuAmMm: 28,
        },
      },
    ],
  },
  pricingSheets: [sheet('ps-sa', 'Túi SA')],
};
const sourcesSA = mapBaoGiaToLsxSources(bgSA);
assert('ps-sa hasSongSieuAm true', sourcesSA[0]?.hasSongSieuAm === true);
assert('ps-sa songSieuAmMm = 28', sourcesSA[0]?.songSieuAmMm === 28, String(sourcesSA[0]?.songSieuAmMm));

const bgSANone: BaoGiaApi = {
  id: 'q-sa-none',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      { pricingSheetId: 'ps-sa-none', productName: 'Túi SA 2', bagSpec: { hasSongSieuAm: false } },
    ],
  },
  pricingSheets: [sheet('ps-sa-none', 'Túi SA 2')],
};
const sourcesSANone = mapBaoGiaToLsxSources(bgSANone);
assert('ps-sa-none hasSongSieuAm falsy', !sourcesSANone[0]?.hasSongSieuAm);
assert('ps-sa-none songSieuAmMm undefined', sourcesSANone[0]?.songSieuAmMm === undefined);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
