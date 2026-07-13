import { strict as assert } from 'assert';
import {
  xayEngineCtxTuPriceConfigs,
  configNameToScope,
} from './price-config-mapper';
import type { PriceConfigApi } from './service-lts';
import type { AppConstants, Material, ProfitRow, SmallWidthMaterialPrice } from '../types';
import {
  clearPriceConfigCache,
  seedPriceConfigCache,
  getPriceConfigFromCache,
  layConfigsTheoIdsCoCache,
} from './price-config-cache';
import { mapHistoryToResultPatch } from './pricing-sheet-mapper';
import type { HistoryItem } from '../types';

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
check('configNameToScope unknown null', configNameToScope('FOO') === null);

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

// layConfigsTheoIdsCoCache with only cache (no fetch needed if all present)
void (async () => {
  clearPriceConfigCache();
  seedPriceConfigCache(configs);
  const got = await layConfigsTheoIdsCoCache(['id-old-mat', 'id-profit']);
  check('cache hit returns ordered', got.length === 2 && got[0]!.id === 'id-old-mat');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
