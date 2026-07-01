// ═════════════════════════════════════════════════════════════════════════════
// Mapper: ConfigScope (frontend) <-> configName (backend price-config)
// ═════════════════════════════════════════════════════════════════════════════
//
// Frontend có 7 scope cấu hình. Backend lưu mỗi scope dưới 1 PriceConfig
// record với configName tuỳ ý (free-form, regex ^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$).
// Mapper này chuyển đổi giữa hai hệ và trích/xáp dữ liệu từng scope.

import type { ConfigScope } from '../types';
import type { AppConstants, Material, ProfitRow, SmallWidthMaterialPrice } from '../types';
import type { PriceConfigApi } from './service-lts';

// ── Scope <-> configName ──────────────────────────────────────────────────
const SCOPE_TO_CONFIG_NAME: Record<ConfigScope, string> = {
  materials: 'MATERIALS',
  production: 'PRODUCTION',
  profit: 'PROFIT',
  surcharges: 'SURCHARGES',
  interest: 'INTEREST',
  waste: 'WASTE',
  outsource: 'OUTSOURCE',
};

export function scopeToConfigName(scope: ConfigScope): string {
  return SCOPE_TO_CONFIG_NAME[scope];
}

export function configNameToScope(configName: string): ConfigScope | null {
  const found = (Object.entries(SCOPE_TO_CONFIG_NAME) as Array<[ConfigScope, string]>)
    .find(([, name]) => name === configName);
  return found ? found[0] : null;
}

// ── Các key AppConstants thuộc từng scope (mirror configVersioning) ────────
const SCOPE_CONSTANT_KEYS: Record<ConfigScope, (keyof AppConstants)[]> = {
  materials: [],
  production: [
    'laborCost', 'ghepCPSX', 'cutBase', 'cutThreshold1', 'cutThreshold2',
    'cutMult1', 'cutMult2', 'cutMult3', 'cutRules', 'cylinderPricePerUnit', 'cylPriceA', 'cylPriceB',
    'nhuPrice', 'moPrice', 'colorSetup',
  ],
  profit: [],
  surcharges: [
    'zipperPrice', 'zipperWeight', 'tapePrice', 'tapeWeight',
    'handlePrice', 'handleWeight', 'handleOptions',
    'boxPriceDefault', 'bagsPerBoxDefault', 'boxOptions',
    'shippingPerKmDefault', 'shippingKmDefault',
  ],
  interest: ['interestBase', 'interestSpread', 'paymentDays', 'customPaymentDays'],
  waste: ['printWasteA', 'printWasteB', 'printWasteC', 'printWasteD', 'colorSetup',
          'ghepWasteA', 'ghepWasteB', 'ghepWasteC', 'cutWasteA', 'cutWasteB', 'cutWasteC'],
  outsource: [],
};

// ── Trích xuất dữ liệu 1 scope từ store -> inputValue cho API ──────────────
export interface StoreDataForScope {
  materials: Material[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  constants: AppConstants;
  profitTable: ProfitRow[];
}

export function trichXuatDuLieuScope(
  scope: ConfigScope,
  data: StoreDataForScope,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (scope === 'materials') {
    result.materials = structuredClone(data.materials);
    result.smallWidthPrices = structuredClone(data.smallWidthPrices);
  } else if (scope === 'profit') {
    result.profitTable = structuredClone(data.profitTable);
  } else {
    const keys = SCOPE_CONSTANT_KEYS[scope];
    for (const key of keys) {
      result[key] = structuredClone((data.constants as unknown as Record<string, unknown>)[key as string]);
    }
  }

  return result;
}

// ── Áp dụng inputValue từ server vào store fields ──────────────────────────
export interface ApDungKetQua {
  materials?: Material[];
  smallWidthPrices?: SmallWidthMaterialPrice[];
  constants?: Partial<AppConstants>;
  profitTable?: ProfitRow[];
}

export function apDungDuLieuScope(
  scope: ConfigScope,
  inputValue: unknown,
): ApDungKetQua {
  if (typeof inputValue !== 'object' || inputValue === null || Array.isArray(inputValue)) {
    return {};
  }

  const data = inputValue as Record<string, unknown>;
  const result: ApDungKetQua = {};

  if (scope === 'materials') {
    if (Array.isArray(data.materials)) result.materials = data.materials as Material[];
    if (Array.isArray(data.smallWidthPrices)) result.smallWidthPrices = data.smallWidthPrices as SmallWidthMaterialPrice[];
  } else if (scope === 'profit') {
    if (Array.isArray(data.profitTable)) result.profitTable = data.profitTable as ProfitRow[];
  } else {
    const keys = SCOPE_CONSTANT_KEYS[scope];
    const constants: Partial<AppConstants> = {};
    for (const key of keys) {
      if (key as string in data) {
        (constants as Record<string, unknown>)[key as string] = data[key as string];
      }
    }
    if (Object.keys(constants).length > 0) result.constants = constants;
  }

  return result;
}

// ── Chuyển PriceConfigApi từ server -> ConfigSnapshot cho UI ────────────────
export interface ConfigSnapshotLike {
  id: string;
  scope: ConfigScope;
  name?: string;
  effectiveMode: 'date' | 'month';
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  constants: AppConstants;
  profitTable: ProfitRow[];
}

export function priceConfigToSnapshot(
  pc: PriceConfigApi,
  scope: ConfigScope,
  fallbackData: StoreDataForScope,
): ConfigSnapshotLike {
  // inputValue có thể chứa { name, effectiveFrom, effectiveMode, ...scopeData }
  // hoặc chỉ chứa scopeData (tùy frontend gửi lên)
  const raw = (typeof pc.inputValue === 'object' && pc.inputValue !== null && !Array.isArray(pc.inputValue))
    ? pc.inputValue as Record<string, unknown>
    : {};

  const name = typeof raw.name === 'string' ? raw.name : undefined;
  const effectiveFrom = typeof raw.effectiveFrom === 'string' ? raw.effectiveFrom : pc.createdAt.slice(0, 7);
  const effectiveMode = raw.effectiveMode === 'date' ? 'date' : 'month';

  // Áp dụng scope data lên fallback để có full snapshot
  const applied = apDungDuLieuScope(scope, pc.inputValue);

  return {
    id: pc.id,
    scope,
    name,
    effectiveMode,
    effectiveFrom,
    createdAt: pc.createdAt,
    updatedAt: pc.createdAt,
    materials: applied.materials ?? structuredClone(fallbackData.materials),
    smallWidthPrices: applied.smallWidthPrices ?? structuredClone(fallbackData.smallWidthPrices),
    constants: { ...fallbackData.constants, ...(applied.constants ?? {}) },
    profitTable: applied.profitTable ?? structuredClone(fallbackData.profitTable),
  };
}
