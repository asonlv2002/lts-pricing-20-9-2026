/**
 * Test tách PRODUCTION_UPGRADE — không import pricing-sheet-mapper (tránh engine/data).
 */
import { strict as assert } from 'assert';
import {
  configNameToScope,
  scopeToConfigName,
  trichXuatDuLieuScope,
  apDungDuLieuScope,
  xayEngineCtxTuPriceConfigs,
  gopCpsxUpgradeChoMigrate,
  trichCpsxUpgradeTuInputValue,
  layConstantKeysTheoScope,
} from './price-config-mapper';
import type { AppConstants, Material, ProfitRow, SmallWidthMaterialPrice } from '../types';
import type { PriceConfigApi } from './service-lts';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

const fallbackConstants = {
  laborCost: 1,
  interestBase: 0.1,
  interestSpread: 0.03,
  paymentDays: 30,
} as unknown as AppConstants;

const fallback = {
  materials: [] as Material[],
  constants: fallbackConstants,
  profitTable: [] as ProfitRow[],
  smallWidthPrices: [] as SmallWidthMaterialPrice[],
};

console.log('price-config-upgrade-scope');

check('scope map UPGRADE', scopeToConfigName('productionUpgrade') === 'PRODUCTION_UPGRADE');
check('name map UPGRADE', configNameToScope('PRODUCTION_UPGRADE') === 'productionUpgrade');
check(
  'keys production không chứa cpsxUpgradeLabor',
  !layConstantKeysTheoScope('production').includes('cpsxUpgradeLabor'),
);
check(
  'keys productionUpgrade có 4 key NC',
  layConstantKeysTheoScope('productionUpgrade').length === 4
    && layConstantKeysTheoScope('productionUpgrade').includes('cpsxUpgradeLabor'),
);

const trichP = trichXuatDuLieuScope('production', {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 42,
    cpsxUpgradeLabor: { x: 1 },
  } as unknown as AppConstants,
});
check('trich production có laborCost', trichP.laborCost === 42);
check('trich production không NC', !('cpsxUpgradeLabor' in trichP));

const trichU = trichXuatDuLieuScope('productionUpgrade', {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 42,
    cpsxUpgradeLabor: { rounded: 9 },
  } as unknown as AppConstants,
});
check('trich UPGRADE có NC', (trichU as { cpsxUpgradeLabor?: unknown }).cpsxUpgradeLabor != null);
check('trich UPGRADE không laborCost', !('laborCost' in trichU));

const apU = apDungDuLieuScope('productionUpgrade', {
  cpsxUpgradeLabor: { print: { roundedPerMin: 100 } },
  laborCost: 999,
});
check('ap UPGRADE chỉ NC', apU.constants?.cpsxUpgradeLabor != null && !('laborCost' in (apU.constants ?? {})));

const legacy = trichCpsxUpgradeTuInputValue({
  laborCost: 1,
  cpsxUpgradeLabor: { a: 1 },
  cpsxUpgradeInk: { b: 2 },
});
check('trich legacy từ PRODUCTION blob', !!legacy && !!legacy.cpsxUpgradeLabor && !!legacy.cpsxUpgradeInk);

const mig = gopCpsxUpgradeChoMigrate(
  { cpsxUpgradeLabor: { from: 'prod' } },
  { ...fallbackConstants, cpsxUpgradeElectric: { from: 'session' } } as unknown as AppConstants,
);
check(
  'migrate gộp',
  !!(mig && (mig as { cpsxUpgradeLabor?: { from?: string } }).cpsxUpgradeLabor?.from === 'prod'
    && (mig as { cpsxUpgradeElectric?: { from?: string } }).cpsxUpgradeElectric?.from === 'session'),
);

const prodLegacy: PriceConfigApi = {
  id: 'p1',
  configName: 'PRODUCTION',
  version: 1,
  inputValue: {
    laborCost: 3731,
    cpsxUpgradeLabor: { print: { roundedPerMin: 3731 } },
  },
  createdBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const upgrade: PriceConfigApi = {
  id: 'u1',
  configName: 'PRODUCTION_UPGRADE',
  version: 1,
  inputValue: {
    cpsxUpgradeLabor: { print: { roundedPerMin: 4684 } },
  },
  createdBy: null,
  createdAt: '2026-02-01T00:00:00.000Z',
};
const session = {
  ...fallback,
  constants: {
    ...fallbackConstants,
    laborCost: 5000,
    cpsxUpgradeLabor: { print: { roundedPerMin: 9999 } },
  } as unknown as AppConstants,
};

const ctxLegacy = xayEngineCtxTuPriceConfigs([prodLegacy], session, ['p1']);
check(
  'legacy pin PRODUCTION → NC từ blob',
  (ctxLegacy.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 3731
    && (ctxLegacy.constants as { laborCost?: number }).laborCost === 3731,
);

const ctxBoth = xayEngineCtxTuPriceConfigs(
  [prodLegacy, upgrade],
  session,
  ['p1', 'u1'],
);
check(
  'UPGRADE thắng legacy PRODUCTION NC',
  (ctxBoth.constants as { cpsxUpgradeLabor?: { print?: { roundedPerMin?: number } } })
    .cpsxUpgradeLabor?.print?.roundedPerMin === 4684,
);
check(
  'PRODUCTION vẫn set laborCost',
  (ctxBoth.constants as { laborCost?: number }).laborCost === 3731,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
assert.equal(failed, 0);
