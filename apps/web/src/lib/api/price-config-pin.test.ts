import { strict as assert } from 'assert';
import {
  xayEngineCtxTuPriceConfigs,
  configNameToScope,
  trichXuatDuLieuScope,
  gopCpsxUpgradeChoMigrate,
  scopeToConfigName,
  lietKePinIdThieu,
  coProductionUpgradeTrongConfigs,
  xoaCpsxUpgradeKhoiHangSo,
} from './price-config-mapper';
import type { PriceConfigApi } from './service-lts';
import type { AppConstants, Material, ProfitRow, SmallWidthMaterialPrice } from '../types';
import {
  clearPriceConfigCache,
  seedPriceConfigCache,
  getPriceConfigFromCache,
  layConfigsTheoIdsCoCache,
} from './price-config-cache';
import {
  mapHistoryToResultPatch,
  layCtxChoPricingSheet,
  mapPricingSheetsToHistory,
  mapPricingSheetToHistory,
  gomPriceConfigIdsTuSheets,
} from './pricing-sheet-mapper';
import { trichCpsxNangCao } from '../cpsx-nang-cao-pin';
import type { HistoryItem } from '../types';
import type { PricingSheetApi } from './service-lts';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

const fallbackMaterials: Material[] = [
  {
    id: 'm1',
    name: 'Fallback',
    density: 1,
    thickness: 10,
    pricePerKg: 100,
    isPETorPA: false,
    rollLength: 1000,
    inkPricePerColor: 0,
  },
];
const fallbackConstants = {
  laborCost: 1,
  interestBase: 0.1,
  interestSpread: 0.03,
  paymentDays: 30,
} as AppConstants;
const fallbackProfit: ProfitRow[] = [
  { threshold: 1e9, col1: 0.1, col2: 0.12, largeCol1: 0.1, largeCol2: 0.12 },
];
const fallbackSmall: SmallWidthMaterialPrice[] = [];

const fallback = {
  materials: fallbackMaterials,
  constants: fallbackConstants,
  profitTable: fallbackProfit,
  smallWidthPrices: fallbackSmall,
};

console.log('price-config-pin');

check('configNameToScope MATERIALS', configNameToScope('MATERIALS') === 'materials');
check('configNameToScope PRODUCTION_UPGRADE', configNameToScope('PRODUCTION_UPGRADE') === 'productionUpgrade');
check('scopeToConfigName productionUpgrade', scopeToConfigName('productionUpgrade') === 'PRODUCTION_UPGRADE');
check('configNameToScope unknown null', configNameToScope('FOO') === null);

const trichProd = trichXuatDuLieuScope('production', {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 100,
    cpsxUpgradeLabor: { print: { roundedPerMin: 1 } },
  } as unknown as AppConstants,
});
check('trich production không có cpsxUpgradeLabor', !('cpsxUpgradeLabor' in trichProd));
check('trich production có laborCost', trichProd.laborCost === 100);

const trichUp = trichXuatDuLieuScope('productionUpgrade', {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 100,
    cpsxUpgradeLabor: { print: { roundedPerMin: 2 } },
    cpsxUpgradeElectric: { appliedPricePerKwh: 3 },
  } as unknown as AppConstants,
});
check('trich productionUpgrade có cpsxUpgradeLabor', !!(trichUp as { cpsxUpgradeLabor?: unknown }).cpsxUpgradeLabor);
check('trich productionUpgrade không có laborCost', !('laborCost' in trichUp));

const mig = gopCpsxUpgradeChoMigrate(
  { cpsxUpgradeLabor: { print: { roundedPerMin: 11 } }, laborCost: 1 },
  { ...fallbackConstants, cpsxUpgradeElectric: { appliedPricePerKwh: 22 } } as unknown as AppConstants,
);
check(
  'migrate gộp labor từ PRODUCTION + electric từ session',
  !!(mig && (mig as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } }).cpsxUpgradeLabor?.print?.roundedPerMin === 11
    && (mig as { cpsxUpgradeElectric?: { appliedPricePerKwh?: number } }).cpsxUpgradeElectric?.appliedPricePerKwh === 22),
);

const configs: PriceConfigApi[] = [
  {
    id: 'id-old-mat',
    configName: 'MATERIALS',
    version: 1,
    inputValue: {
      materials: [
        {
          id: 'm1',
          name: 'OldMat',
          density: 1,
          thickness: 20,
          pricePerKg: 200,
          isPETorPA: false,
          rollLength: 1000,
          inkPricePerColor: 0,
        },
      ],
      smallWidthPrices: [],
    },
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'id-new-mat',
    configName: 'MATERIALS',
    version: 2,
    inputValue: {
      materials: [
        {
          id: 'm1',
          name: 'NewMat',
          density: 1,
          thickness: 30,
          pricePerKg: 300,
          isPETorPA: false,
          rollLength: 1000,
          inkPricePerColor: 0,
        },
      ],
      smallWidthPrices: [],
    },
    createdBy: null,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'id-profit',
    configName: 'PROFIT',
    version: 1,
    inputValue: {
      profitTable: [
        { threshold: 1e9, col1: 0.2, col2: 0.25, largeCol1: 0.2, largeCol2: 0.25 },
      ],
    },
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const ctxPreferOld = xayEngineCtxTuPriceConfigs(configs, fallback, [
  'id-old-mat',
  'id-profit',
]);
check(
  'prefer first id in priceConfigIds for same scope',
  ctxPreferOld.materials[0]?.name === 'OldMat',
  ctxPreferOld.materials[0]?.name,
);
check(
  'profit applied from pin set',
  ctxPreferOld.profitTable[0]?.col1 === 0.2,
);

const ctxPreferNew = xayEngineCtxTuPriceConfigs(configs, fallback, [
  'id-new-mat',
  'id-profit',
]);
check(
  'prefer new mat when first in ids',
  ctxPreferNew.materials[0]?.name === 'NewMat',
);

// Cache
clearPriceConfigCache();
seedPriceConfigCache([configs[0]!]);
check('seed cache', getPriceConfigFromCache('id-old-mat')?.configName === 'MATERIALS');

// mapHistoryToResultPatch pin
const itemPinned = {
  productName: 'P',
  input: { productType: 'tui' },
  priceConfigIds: ['a', 'b'],
} as unknown as HistoryItem;
const itemNew = {
  productName: 'P',
  input: { productType: 'tui' },
} as unknown as HistoryItem;

check(
  'patch keeps pin when priceConfigIds present',
  mapHistoryToResultPatch(itemPinned).useLatestPriceConfigs === false,
);
check(
  'patch uses latest when no priceConfigIds',
  mapHistoryToResultPatch(itemNew).useLatestPriceConfigs === true,
);

// layCtxChoPricingSheet: PRODUCTION pin labor ≠ session latest
const prodOld: PriceConfigApi = {
  id: 'id-prod-old',
  configName: 'PRODUCTION',
  version: 1,
  inputValue: {
    laborCost: 3731,
    // Legacy blob: CPSX NC còn nằm trong PRODUCTION (trước khi tách)
    cpsxUpgradeLabor: {
      print: { wages: 1, hoursPerDay: 8, mealMorning: 0, mealEvening: 0, otFactor: 1, roundedPerMin: 3731 },
    },
  },
  createdBy: null,
  createdAt: '2026-08-15T00:00:00.000Z',
};
const prodNew: PriceConfigApi = {
  id: 'id-prod-new',
  configName: 'PRODUCTION',
  version: 2,
  inputValue: {
    laborCost: 4684,
  },
  createdBy: null,
  createdAt: '2026-08-17T22:12:00.000Z',
};
const upgradeOld: PriceConfigApi = {
  id: 'id-upgrade-old',
  configName: 'PRODUCTION_UPGRADE',
  version: 1,
  inputValue: {
    cpsxUpgradeLabor: {
      print: { wages: 1, hoursPerDay: 8, mealMorning: 0, mealEvening: 0, otFactor: 1, roundedPerMin: 3731 },
    },
  },
  createdBy: null,
  createdAt: '2026-08-15T00:00:00.000Z',
};
const upgradeNew: PriceConfigApi = {
  id: 'id-upgrade-new',
  configName: 'PRODUCTION_UPGRADE',
  version: 2,
  inputValue: {
    cpsxUpgradeLabor: {
      print: { wages: 1, hoursPerDay: 8, mealMorning: 0, mealEvening: 0, otFactor: 1, roundedPerMin: 4684 },
    },
  },
  createdBy: null,
  createdAt: '2026-08-17T22:12:00.000Z',
};
const sessionLatest = {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 5000,
    cpsxUpgradeLabor: {
      print: { wages: 1, hoursPerDay: 8, mealMorning: 0, mealEvening: 0, otFactor: 1, roundedPerMin: 9999 },
    },
  } as unknown as AppConstants,
};
const ctxPinnedOld = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-old'] },
  sessionLatest,
  [prodOld, prodNew],
);
check(
  'pin PRODUCTION old → laborCost 3731 not session 5000',
  (ctxPinnedOld.constants as { laborCost?: number }).laborCost === 3731,
);
check(
  'legacy PRODUCTION blob → cpsxUpgradeLabor 3731 (fallback)',
  (ctxPinnedOld.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 3731,
);
const ctxPinnedNew = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-new'] },
  sessionLatest,
  [prodOld, prodNew],
);
check(
  'pin PRODUCTION new → laborCost 4684',
  (ctxPinnedNew.constants as { laborCost?: number }).laborCost === 4684,
);
const ctxUpgrade = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-new', 'id-upgrade-new'] },
  sessionLatest,
  [prodOld, prodNew, upgradeOld, upgradeNew],
);
check(
  'pin PRODUCTION_UPGRADE → cpsxUpgradeLabor 4684 not session 9999',
  (ctxUpgrade.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 4684,
);
check(
  'pin PRODUCTION + UPGRADE → laborCost from PRODUCTION',
  (ctxUpgrade.constants as { laborCost?: number }).laborCost === 4684,
);
// Pin chỉ PRODUCTION (không NC blob) + session latest 9999 → KHÔNG lấy 9999
const prodNewNoNc: PriceConfigApi = {
  id: 'id-prod-new-nonc',
  configName: 'PRODUCTION',
  version: 2,
  inputValue: { laborCost: 4684 },
  createdBy: null,
  createdAt: '2026-08-17T22:12:00.000Z',
};
const ctxPinProdOnlyNoNc = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-new-nonc'] },
  sessionLatest,
  [prodNewNoNc],
);
check(
  'pin PRODUCTION không NC → cpsxUpgradeLabor KHÔNG phải session 9999',
  (ctxPinProdOnlyNoNc.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin !== 9999,
);
// Pin UPGRADE v1 (3731) dù cache có v2 (4684) + session 9999
const ctxUpgradeOldOnly = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-new', 'id-upgrade-old'] },
  sessionLatest,
  [prodNew, upgradeOld, upgradeNew],
);
check(
  'pin UPGRADE v1 → 3731 không phải v2 4684 hay session 9999',
  (ctxUpgradeOldOnly.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 3731,
);
const ctxNoPin = layCtxChoPricingSheet({ priceConfigIds: [] }, sessionLatest, [prodOld, prodNew]);
check(
  'no pin → session laborCost 5000',
  (ctxNoPin.constants as { laborCost?: number }).laborCost === 5000,
);
check(
  'no pin → session cpsxUpgradeLabor 9999 (fallback giữ latest)',
  (ctxNoPin.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 9999,
);

const sheetA = {
  id: 's-old',
  pricingSheetName: 'Cu',
  createdAt: '2026-08-16T10:00:00.000Z',
  priceConfigIds: ['id-prod-old'],
  inputValue: {
    productType: 'tui',
    customer: 'KH',
    productName: 'Tui cu',
    quantity: 1000,
    bagType: '3bien',
    filmType: '',
    numColors: 0,
    numImages: 1,
    spreadWidth: 0.2,
    cutStep: 0.3,
    metallicSurcharge: 0,
    coverageRatio: 1,
    handleWeight: 0,
    zipperWeight: 0,
    tapeWeight: 0,
    hasZipper: false,
    hasTape: false,
    hasHandle: false,
    paymentDays: 30,
    profitColumn: 2,
    commissionRate: 0,
    commissionFixedVND: 0,
    layer1Id: 'm1',
    // isNangCap false — tránh engine NC đầy đủ; pin ctx đã assert laborCost ở trên
  },
} as unknown as PricingSheetApi;
const sheetB = {
  ...sheetA,
  id: 's-new',
  pricingSheetName: 'Moi',
  priceConfigIds: ['id-prod-new'],
} as unknown as PricingSheetApi;

check(
  'gom pin ids unique',
  gomPriceConfigIdsTuSheets([sheetA, sheetB]).sort().join(',') === 'id-prod-new,id-prod-old',
);

const mappedList = mapPricingSheetsToHistory(
  [sheetA, sheetB],
  sessionLatest,
  [prodOld, prodNew],
);
check('map list 2 sheets', mappedList.length === 2);
check('sheet old has pin ids', (mappedList[0]?.priceConfigIds ?? [])[0] === 'id-prod-old');
check('sheet with pin → thieuPin undefined', mappedList[0]?.thieuPin !== true);
const sheetNoPin = { ...sheetA, id: 's-nopin', priceConfigIds: [] } as unknown as PricingSheetApi;
const mappedNoPin = mapPricingSheetsToHistory([sheetNoPin], sessionLatest, [prodOld]);
check('sheet no pin → thieuPin true', mappedNoPin[0]?.thieuPin === true);

// Helpers pin thiếu / UPGRADE
check(
  'lietKePinIdThieu',
  lietKePinIdThieu(['id-a', 'id-b'], [{ id: 'id-a' } as PriceConfigApi]).join() === 'id-b',
);
check(
  'coProductionUpgradeTrongConfigs true',
  coProductionUpgradeTrongConfigs([upgradeOld]) === true,
);
check(
  'coProductionUpgradeTrongConfigs false',
  coProductionUpgradeTrongConfigs([prodNew]) === false,
);
const cleared = xoaCpsxUpgradeKhoiHangSo(sessionLatest.constants);
check(
  'xoaCpsxUpgradeKhoiHangSo',
  (cleared as { cpsxUpgradeLabor?: unknown }).cpsxUpgradeLabor === undefined,
);

// Pin UPGRADE v1 → ctx.constants có NC 3731 (snapshot dùng cho pinnedCpsxNangCao)
const ctxNc = layCtxChoPricingSheet(
  { priceConfigIds: ['id-prod-new', 'id-upgrade-old'] },
  sessionLatest,
  [prodNew, upgradeOld, upgradeNew],
);
const snapNc = trichCpsxNangCao(ctxNc.constants);
check(
  'pin UPGRADE → trichCpsxNangCao labor 3731 (source pinnedCpsxNangCao)',
  snapNc?.cpsxUpgradeLabor?.print?.roundedPerMin === 3731,
);
// map sheet thường (không isNangCap) vẫn không bắt buộc snapshot NC
const mappedThuong = mapPricingSheetToHistory(
  { ...sheetA, priceConfigIds: ['id-prod-new', 'id-upgrade-old'] } as PricingSheetApi,
  ctxNc,
);
check(
  'sheet không isNangCap → không gán pinnedCpsxNangCao',
  mappedThuong?.pinnedCpsxNangCao === undefined,
);

// layConfigsTheoIdsCoCache with only cache (no fetch needed if all present)
void (async () => {
  clearPriceConfigCache();
  seedPriceConfigCache(configs);
  const got = await layConfigsTheoIdsCoCache(['id-old-mat', 'id-profit']);
  check('cache hit returns ordered', got.length === 2 && got[0]!.id === 'id-old-mat');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
