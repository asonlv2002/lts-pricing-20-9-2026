// ═════════════════════════════════════════════════════════════════════════════
// Mapper: ConfigScope (frontend) <-> configName (backend price-config)
// ═════════════════════════════════════════════════════════════════════════════
//
// Frontend có 8 scope cấu hình. Backend lưu mỗi scope dưới 1 PriceConfig
// record với configName tuỳ ý (free-form, regex ^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$).
// Mapper này chuyển đổi giữa hai hệ và trích/xáp dữ liệu từng scope.

import type { ConfigScope } from '../types';
import type { AppConstants, Material, ProfitRow, SmallWidthMaterialPrice } from '../types';
import type { PriceConfigApi } from './service-lts';

/** 4 key CPSX nâng cao — scope productionUpgrade / PRODUCTION_UPGRADE */
export const CPSX_UPGRADE_CONSTANT_KEYS: (keyof AppConstants)[] = [
  'cpsxUpgradeElectric',
  'cpsxUpgradeLabor',
  'cpsxUpgradeInk',
  'cpsxUpgradeThoiGian',
];

// ── Scope <-> configName ──────────────────────────────────────────────────
const SCOPE_TO_CONFIG_NAME: Record<ConfigScope, string> = {
  materials: 'MATERIALS',
  production: 'PRODUCTION',
  productionUpgrade: 'PRODUCTION_UPGRADE',
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
    'laborCost', 'printPressLabor', 'printPressElectric', 'printPressTime',
    'laminatePressLabor', 'laminatePressElectric', 'laminatePressTime',
    'slitPressLabor', 'slitPressElectric', 'slitPressTime',
    'bagPressLabor', 'bagPressElectric', 'bagPressTime',
    'ghepCPSX', 'cutBase', 'cutThreshold1', 'cutThreshold2',
    'cutMult1', 'cutMult2', 'cutMult3', 'cutRules', 'cylinderPricePerUnit', 'cylPriceA', 'cylPriceB',
    'nhuPrice', 'moPrice', 'colorSetup',
  ],
  productionUpgrade: [...CPSX_UPGRADE_CONSTANT_KEYS],
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

export function layConstantKeysTheoScope(scope: ConfigScope): (keyof AppConstants)[] {
  return SCOPE_CONSTANT_KEYS[scope] ?? [];
}

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

/**
 * Lấy 4 key CPSX NC từ blob bất kỳ (PRODUCTION legacy hoặc PRODUCTION_UPGRADE).
 * Trả null nếu không có key nào.
 */
export function trichCpsxUpgradeTuInputValue(
  inputValue: unknown,
): Partial<AppConstants> | null {
  if (typeof inputValue !== 'object' || inputValue === null || Array.isArray(inputValue)) {
    return null;
  }
  const data = inputValue as Record<string, unknown>;
  const out: Partial<AppConstants> = {};
  for (const key of CPSX_UPGRADE_CONSTANT_KEYS) {
    if (key as string in data && data[key as string] != null) {
      (out as Record<string, unknown>)[key as string] = structuredClone(data[key as string]);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Gộp CPSX NC từ PRODUCTION blob + session (ưu tiên blob) — dùng migrate-on-read. */
export function gopCpsxUpgradeChoMigrate(
  productionInputValue: unknown,
  sessionConstants: AppConstants,
): Record<string, unknown> | null {
  const fromProd = trichCpsxUpgradeTuInputValue(productionInputValue) ?? {};
  const merged: Record<string, unknown> = {};
  for (const key of CPSX_UPGRADE_CONSTANT_KEYS) {
    const k = key as string;
    if (k in fromProd && (fromProd as Record<string, unknown>)[k] != null) {
      merged[k] = structuredClone((fromProd as Record<string, unknown>)[k]);
      continue;
    }
    const sessionVal = (sessionConstants as unknown as Record<string, unknown>)[k];
    if (sessionVal != null) merged[k] = structuredClone(sessionVal);
  }
  return Object.keys(merged).length > 0 ? merged : null;
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

/**
 * Xóa 4 key CPSX NC khỏi constants — tránh session latest lọt khi pin
 * thiếu / fail load PRODUCTION_UPGRADE.
 */
export function xoaCpsxUpgradeKhoiHangSo(hangSo: AppConstants): AppConstants {
  const next = { ...hangSo } as AppConstants & Record<string, unknown>;
  for (const key of CPSX_UPGRADE_CONSTANT_KEYS) {
    delete next[key as string];
  }
  return next;
}

/** pinIds có id không resolve được trong configs đã fetch. */
export function lietKePinIdThieu(
  pinIds: string[],
  configs: PriceConfigApi[],
): string[] {
  const have = new Set(configs.map((c) => c.id).filter(Boolean));
  return pinIds.map((id) => String(id).trim()).filter((id) => id && !have.has(id));
}

/** Trong configs đã load có bản PRODUCTION_UPGRADE không. */
export function coProductionUpgradeTrongConfigs(configs: PriceConfigApi[]): boolean {
  return configs.some((c) => c.configName === 'PRODUCTION_UPGRADE');
}

/**
 * Gộp nhiều PriceConfig (theo order id ưu tiên) thành 1 engine ctx.
 * Cùng scope: bản xuất hiện trước trong `uuTienIds` thắng; nếu không có list
 * thì giữ bản apply sau cùng trong mảng configs.
 *
 * Khi có pin (uuTienIds): **xóa** cpsxUpgrade* khỏi fallback trước khi merge
 * — chỉ lấy NC từ PRODUCTION_UPGRADE pin hoặc legacy blob PRODUCTION.
 * Tránh session latest “dính” khi UPGRADE fail/thiếu.
 *
 * Legacy: sheet chỉ pin PRODUCTION (blob còn cpsxUpgrade*) mà không có
 * PRODUCTION_UPGRADE → vẫn merge 4 key NC từ blob PRODUCTION.
 */
export function xayEngineCtxTuPriceConfigs(
  configs: PriceConfigApi[],
  fallback: StoreDataForScope,
  uuTienIds?: string[],
): StoreDataForScope {
  const byId = new Map(configs.map((pc) => [pc.id, pc]));
  const ordered: PriceConfigApi[] = [];
  if (uuTienIds?.length) {
    for (const id of uuTienIds) {
      const pc = byId.get(id);
      if (pc) ordered.push(pc);
    }
    for (const pc of configs) {
      if (!uuTienIds.includes(pc.id)) ordered.push(pc);
    }
  } else {
    ordered.push(...configs);
  }

  // Áp theo thứ tự ngược: bản ưu tiên (đầu list) apply sau cùng để thắng
  const applyOrder = [...ordered].reverse();

  let materials = structuredClone(fallback.materials);
  let smallWidthPrices = structuredClone(fallback.smallWidthPrices);
  // Có pin → không mang cpsxUpgrade* từ session latest
  let constants = uuTienIds?.length
    ? xoaCpsxUpgradeKhoiHangSo(structuredClone(fallback.constants))
    : structuredClone(fallback.constants);
  let profitTable = structuredClone(fallback.profitTable);

  let daApProductionUpgrade = false;

  for (const pc of applyOrder) {
    const scope = configNameToScope(pc.configName);
    if (!scope) continue;
    if (scope === 'productionUpgrade') daApProductionUpgrade = true;
    const applied = apDungDuLieuScope(scope, pc.inputValue);
    if (applied.materials) materials = applied.materials;
    if (applied.smallWidthPrices) smallWidthPrices = applied.smallWidthPrices;
    if (applied.profitTable) profitTable = applied.profitTable;
    if (applied.constants) constants = { ...constants, ...applied.constants };
  }

  // Sheet cũ: pin PRODUCTION có CPSX NC trong blob, chưa có PRODUCTION_UPGRADE
  if (!daApProductionUpgrade) {
    for (const pc of applyOrder) {
      if (pc.configName !== 'PRODUCTION') continue;
      const legacy = trichCpsxUpgradeTuInputValue(pc.inputValue);
      if (legacy) constants = { ...constants, ...legacy };
    }
  }

  return { materials, smallWidthPrices, constants, profitTable };
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
