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

console.log('\n=== mapBaoGiaToLsxSources sideSealMm + headSealMm ===');

const bgSeal: BaoGiaApi = {
  id: 'q-seal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      {
        pricingSheetId: 'ps-seal',
        productName: 'Túi seal',
        bagSpec: { sideSealMm: 10, headSealMm: 50 },
      },
    ],
  },
  pricingSheets: [sheet('ps-seal', 'Túi seal')],
};
const sourcesSeal = mapBaoGiaToLsxSources(bgSeal);
assert('ps-seal sideSealMm = 10', sourcesSeal[0]?.sideSealMm === 10, String(sourcesSeal[0]?.sideSealMm));
assert('ps-seal headSealMm = 50', sourcesSeal[0]?.headSealMm === 50, String(sourcesSeal[0]?.headSealMm));

const bgSealNone: BaoGiaApi = {
  id: 'q-seal-none',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      { pricingSheetId: 'ps-seal-none', productName: 'Túi seal 2', bagSpec: { sideSealMm: 0, headSealMm: 0 } },
    ],
  },
  pricingSheets: [sheet('ps-seal-none', 'Túi seal 2')],
};
const sourcesSealNone = mapBaoGiaToLsxSources(bgSealNone);
assert('ps-seal-none sideSealMm undefined', sourcesSealNone[0]?.sideSealMm === undefined);
assert('ps-seal-none headSealMm undefined', sourcesSealNone[0]?.headSealMm === undefined);

console.log('\n=== mapBaoGiaToLsxSources field máy túi mở rộng ===');

const bgFull: BaoGiaApi = {
  id: 'q-full',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    productBagSpecs: [
      {
        pricingSheetId: 'ps-full',
        productName: 'Túi đầy đủ',
        bagSpec: {
          hasTearNotch: true,
          tearNotchFromTopMm: 15,
          hasHangHole: true,
          hangHoleDescription: 'Ø8mm giữa',
          hasHandleHole: true,
          handleHoleDescription: '3 lỗ quai xách',
          gussetMm: 80,
          lidMm: 40,
          backSealMm: 12,
          hasBottomSeal: true,
          bottomSealMm: 20,
          standupBottomSideMm: 50,
        },
      },
    ],
  },
  pricingSheets: [sheet('ps-full', 'Túi đầy đủ')],
};
const sFull = mapBaoGiaToLsxSources(bgFull)[0];
assert('ps-full hasTearNotch = true', sFull?.hasTearNotch === true);
assert('ps-full tearNotchFromTopMm = 15', sFull?.tearNotchFromTopMm === 15, String(sFull?.tearNotchFromTopMm));
assert('ps-full hasHangHole = true', sFull?.hasHangHole === true);
assert('ps-full hangHoleDescription', sFull?.hangHoleDescription === 'Ø8mm giữa', String(sFull?.hangHoleDescription));
assert('ps-full hasHandleHole = true', sFull?.hasHandleHole === true);
assert('ps-full handleHoleDescription', sFull?.handleHoleDescription === '3 lỗ quai xách', String(sFull?.handleHoleDescription));
assert('ps-full gussetMm = 80', sFull?.gussetMm === 80, String(sFull?.gussetMm));
assert('ps-full lidMm = 40', sFull?.lidMm === 40, String(sFull?.lidMm));
assert('ps-full backSealMm = 12', sFull?.backSealMm === 12, String(sFull?.backSealMm));
assert('ps-full hasBottomSeal = true', sFull?.hasBottomSeal === true);
assert('ps-full bottomSealMm = 20', sFull?.bottomSealMm === 20, String(sFull?.bottomSealMm));
assert('ps-full standupBottomSideMm = 50', sFull?.standupBottomSideMm === 50, String(sFull?.standupBottomSideMm));

console.log('\n=== nangCaoSpec từ inputValue (snap lúc Lưu tính giá) ===');

const mauSpec = [
  { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.56, thanhPham: 12000, phiHao: 840 },
  { congDoan: 'Ghép 1', vatLieu: 'MPET12', khoMang: 0.56, thanhPham: 11700, phiHao: 110 },
];
function sheetCoSpec(id: string, name: string, spec: unknown): PricingSheetApi {
  const base = sheet(id, name);
  return {
    ...base,
    inputValue: { ...(base.inputValue ?? {}), nangCaoSpec: spec },
  };
}

const bgCoSpec: BaoGiaApi = {
  id: 'q-spec',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {},
  pricingSheets: [sheetCoSpec('ps-spec', 'SP có spec', mauSpec)],
};
const sSpec = mapBaoGiaToLsxSources(bgCoSpec)[0];
assert('pricing sheet có nangCaoSpec → source.nangCaoSpec giữ nguyên', Array.isArray(sSpec?.nangCaoSpec) && (sSpec?.nangCaoSpec as unknown[])?.length === 2);

const bgKhongSpec: BaoGiaApi = {
  id: 'q-no-spec',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {},
  pricingSheets: [sheetCoSpec('ps-no-spec', 'SP không spec', undefined)],
};
const sNoSpec = mapBaoGiaToLsxSources(bgKhongSpec)[0];
assert('inputValue.nangCaoSpec = undefined → source.nangCaoSpec = undefined', sNoSpec?.nangCaoSpec === undefined);

const bgSpecRac: BaoGiaApi = {
  id: 'q-rac',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {},
  pricingSheets: [sheetCoSpec('ps-rac', 'SP rác', 'không phải array')],
};
const sRac = mapBaoGiaToLsxSources(bgSpecRac)[0];
assert('inputValue.nangCaoSpec không phải array → undefined', sRac?.nangCaoSpec === undefined);

const bgInputValueTrucTiep: BaoGiaApi = {
  id: 'q-truc-tiep',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputValue: {
    nangCaoSpec: [{ congDoan: 'In', vatLieu: 'PET', khoMang: 0.5 }],
    productType: 'mang',
    customer: 'KH',
    productName: 'Màng',
  },
  pricingSheets: [],
};
const sTrucTiep = mapBaoGiaToLsxSources(bgInputValueTrucTiep)[0];
assert(
  'BG không có pricingSheets → fallback inputValue trực tiếp, vẫn lấy nangCaoSpec',
  Array.isArray(sTrucTiep?.nangCaoSpec) && (sTrucTiep?.nangCaoSpec as unknown[])?.length === 1,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
