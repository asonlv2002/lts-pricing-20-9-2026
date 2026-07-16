import { Material, ProfitRow, AppConstants, SmallWidthMaterialPrice, BoxOption, HandleOption, ConfigSnapshot, PrintSurchargeOption, PrintFilmProfitRate, PrintPressLabor, PrintPressElectric, PrintPressTime, LaminatePressLabor, LaminatePressElectric, LaminatePressTime, SlitPressLabor, SlitPressElectric, SlitPressTime, SlitPressTimeRule } from './types';
// Single source of truth: /data ở root repo (dùng chung cho web + Flutter)
import materialsJson  from '@data/materials.json';
import constantsJson  from '@data/constants.json';
import profitJson     from '@data/profitTable.json';
import configVersionsJson from '@data/configVersions.json';

export const INITIAL_CONFIG_SNAPSHOTS: ConfigSnapshot[] = Array.isArray((configVersionsJson as { snapshots?: unknown }).snapshots)
  ? ((configVersionsJson as { snapshots: ConfigSnapshot[] }).snapshots)
  : [];

// ── Materials ────────────────────────────────────────────────────────────────
export const INITIAL_MATERIALS: Material[] = (materialsJson as Omit<Material, 'pricePerM2'>[]).map(m => ({
  ...m,
  pricePerM2: m.pricePerKg * m.thickness * m.density / 1000,
}));

// ── Small Width Material Prices ──────────────────────────────────────────────
export const INITIAL_SMALL_WIDTH_PRICES: SmallWidthMaterialPrice[] = INITIAL_MATERIALS.map(m => ({
  id: `${m.id}_400`,
  materialId: m.id,
  widthThresholdMm: 400,
  thickness: m.thickness,
  pricePerKg: m.pricePerKg,
  pricePerM2: m.pricePerKg * m.thickness * m.density / 1000,
}));

// ── Profit table ─────────────────────────────────────────────────────────────
export const INITIAL_PROFIT_TABLE: ProfitRow[] = profitJson.rows as ProfitRow[];

export const PROFIT_DEFAULT = profitJson.profitDefault;

// ── App constants ─────────────────────────────────────────────────────────────
const rawConstants = constantsJson as typeof constantsJson & { boxOptions?: BoxOption[]; handleOptions?: HandleOption[]; customPrintSurcharges?: PrintSurchargeOption[] };
const fallbackCutRules = [
  { label: 'Nhỏ', threshold: rawConstants.cutThreshold1 ?? 0.07, multiplier: rawConstants.cutMult1 ?? 1.4 },
  { label: 'Trung bình', threshold: rawConstants.cutThreshold2 ?? 0.2, multiplier: rawConstants.cutMult2 ?? 1.2 },
  { label: 'Lớn', threshold: null, multiplier: rawConstants.cutMult3 ?? 0.8 },
];
const fallbackBoxOptions: BoxOption[] = [
  { key: 'large', label: 'Thùng lớn', price: rawConstants.boxPriceDefault ?? 0, weight: 0 },
  { key: 'medium', label: 'Thùng trung bình', price: rawConstants.boxPriceDefault ?? 0, weight: 0 },
  { key: 'small', label: 'Thùng nhỏ', price: rawConstants.boxPriceDefault ?? 0, weight: 0 },
];

const fallbackHandleOptions: HandleOption[] = [
  { key: 'large', label: 'Quai lớn', price: rawConstants.handlePrice ?? 0, weight: rawConstants.handleWeight ?? 0 },
  { key: 'small', label: 'Quai nhỏ', price: rawConstants.handlePrice ?? 0, weight: rawConstants.handleWeight ?? 0 },
  { key: 'color', label: 'Quai màu', price: rawConstants.handlePrice ?? 0, weight: rawConstants.handleWeight ?? 0 },
];

const rawPrintFilmProfitRates = (rawConstants.printFilmProfitRates ?? []) as Array<{ customerGroup: string; colorFrom: number; colorTo: number; rate: number }>;
const printFilmProfitRates: PrintFilmProfitRate[] = rawPrintFilmProfitRates
  .flatMap(row => {
    if (row.customerGroup !== 'normal' && row.customerGroup !== 'large') return [];
    return [{ customerGroup: row.customerGroup, colorFrom: row.colorFrom, colorTo: row.colorTo, rate: row.rate }];
  });

export const DEFAULT_PRINT_PRESS_LABOR: PrintPressLabor = {
  wages: [800000, 550000, 500000, 800000, 550000, 500000],
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
};

export const DEFAULT_PRINT_PRESS_ELECTRIC: PrintPressElectric = {
  powerKw: 180,
  efficiency: 0.55,
  pricePerKwh: 2140,
};

export const DEFAULT_PRINT_PRESS_TIME: PrintPressTime = {
  mountMinutesPerColor: 15,
  proofMinutes1to7: 20,
  proofMinutes8: 30,
  matteExtraMinutes: 80,
  avgSpeedMPerMin: 150,
};

export const DEFAULT_LAMINATE_PRESS_LABOR: LaminatePressLabor = {
  wages: [0, 0, 0, 0],
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
};

export const DEFAULT_LAMINATE_PRESS_ELECTRIC: LaminatePressElectric = {
  powerKw: 45,
  efficiency: 0.65,
  pricePerKwh: 2140,
};

export const DEFAULT_LAMINATE_PRESS_TIME: LaminatePressTime = {
  setupFirstMinutes: 10,
  setupNextMinutes: 30,
  avgSpeedMPerMin: 100,
};

export const DEFAULT_SLIT_PRESS_LABOR: SlitPressLabor = {
  wage: 0,
  mealMorning: 30000,
};

export const DEFAULT_SLIT_PRESS_ELECTRIC: SlitPressElectric = {
  powerKw: 15,
  efficiency: 0.6,
  pricePerKwh: 2140,
};

export const DEFAULT_SLIT_PRESS_TIME_RULES: SlitPressTimeRule[] = [
  { key: 'opp_mattopp', label: 'Màng OPP / MattOPP', setupMinutes: 30, speedMPerMin: 180 },
  { key: 'mpet_pet', label: 'Màng MPET / PET', setupMinutes: 20, speedMPerMin: 90 },
  { key: 'laminate_2', label: 'Màng ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 },
  { key: 'laminate_3', label: 'Màng ghép 3 lớp', setupMinutes: 20, speedMPerMin: 90 },
  { key: 'matte_flip', label: 'In phủ mờ (lật mặt)', setupMinutes: 20, speedMPerMin: 150 },
];

export const DEFAULT_SLIT_PRESS_TIME: SlitPressTime = {
  rules: DEFAULT_SLIT_PRESS_TIME_RULES.map((r) => ({ ...r })),
};

const rawPrintPressLabor = (rawConstants as { printPressLabor?: PrintPressLabor }).printPressLabor;
const printPressLabor: PrintPressLabor = {
  wages: Array.isArray(rawPrintPressLabor?.wages) && (rawPrintPressLabor?.wages.length ?? 0) > 0
    ? (rawPrintPressLabor?.wages ?? []).map((w) => Number(w) || 0)
    : [...DEFAULT_PRINT_PRESS_LABOR.wages],
  mealMorning: Number(rawPrintPressLabor?.mealMorning) || DEFAULT_PRINT_PRESS_LABOR.mealMorning,
  mealEvening: Number(rawPrintPressLabor?.mealEvening) || DEFAULT_PRINT_PRESS_LABOR.mealEvening,
  otFactor: Number(rawPrintPressLabor?.otFactor) > 0
    ? Number(rawPrintPressLabor?.otFactor)
    : DEFAULT_PRINT_PRESS_LABOR.otFactor,
};

const rawPrintPressElectric = (rawConstants as { printPressElectric?: PrintPressElectric }).printPressElectric;
const printPressElectric: PrintPressElectric = {
  powerKw: Number(rawPrintPressElectric?.powerKw) > 0
    ? Number(rawPrintPressElectric?.powerKw)
    : DEFAULT_PRINT_PRESS_ELECTRIC.powerKw,
  efficiency: Number(rawPrintPressElectric?.efficiency) > 0
    ? Number(rawPrintPressElectric?.efficiency)
    : DEFAULT_PRINT_PRESS_ELECTRIC.efficiency,
  pricePerKwh: Number(rawPrintPressElectric?.pricePerKwh) > 0
    ? Number(rawPrintPressElectric?.pricePerKwh)
    : DEFAULT_PRINT_PRESS_ELECTRIC.pricePerKwh,
};

const rawPrintPressTime = (rawConstants as { printPressTime?: PrintPressTime }).printPressTime;
const printPressTime: PrintPressTime = {
  mountMinutesPerColor: Number(rawPrintPressTime?.mountMinutesPerColor) > 0
    ? Number(rawPrintPressTime?.mountMinutesPerColor)
    : DEFAULT_PRINT_PRESS_TIME.mountMinutesPerColor,
  proofMinutes1to7: Number(rawPrintPressTime?.proofMinutes1to7) > 0
    ? Number(rawPrintPressTime?.proofMinutes1to7)
    : DEFAULT_PRINT_PRESS_TIME.proofMinutes1to7,
  proofMinutes8: Number(rawPrintPressTime?.proofMinutes8) > 0
    ? Number(rawPrintPressTime?.proofMinutes8)
    : DEFAULT_PRINT_PRESS_TIME.proofMinutes8,
  matteExtraMinutes: Number(rawPrintPressTime?.matteExtraMinutes) >= 0
    ? Number(rawPrintPressTime?.matteExtraMinutes)
    : DEFAULT_PRINT_PRESS_TIME.matteExtraMinutes,
  avgSpeedMPerMin: Number(rawPrintPressTime?.avgSpeedMPerMin) > 0
    ? Number(rawPrintPressTime?.avgSpeedMPerMin)
    : DEFAULT_PRINT_PRESS_TIME.avgSpeedMPerMin,
};

const rawLaminatePressLabor = (rawConstants as unknown as {
  laminatePressLabor?: { wages?: number[]; mealMorning?: number; mealEvening?: number; otFactor?: number };
}).laminatePressLabor;
const padLaminateWages = (wages?: number[]): [number, number, number, number] => {
  const src = Array.isArray(wages) ? wages : [];
  return [
    Number(src[0]) || 0,
    Number(src[1]) || 0,
    Number(src[2]) || 0,
    Number(src[3]) || 0,
  ];
};
const laminatePressLabor: LaminatePressLabor = {
  wages: padLaminateWages(rawLaminatePressLabor?.wages),
  mealMorning: Number(rawLaminatePressLabor?.mealMorning) || DEFAULT_LAMINATE_PRESS_LABOR.mealMorning,
  mealEvening: Number(rawLaminatePressLabor?.mealEvening) || DEFAULT_LAMINATE_PRESS_LABOR.mealEvening,
  otFactor: Number(rawLaminatePressLabor?.otFactor) > 0
    ? Number(rawLaminatePressLabor?.otFactor)
    : DEFAULT_LAMINATE_PRESS_LABOR.otFactor,
};

const rawLaminatePressElectric = (rawConstants as { laminatePressElectric?: LaminatePressElectric }).laminatePressElectric;
const laminatePressElectric: LaminatePressElectric = {
  powerKw: Number(rawLaminatePressElectric?.powerKw) > 0
    ? Number(rawLaminatePressElectric?.powerKw)
    : DEFAULT_LAMINATE_PRESS_ELECTRIC.powerKw,
  efficiency: Number(rawLaminatePressElectric?.efficiency) > 0
    ? Number(rawLaminatePressElectric?.efficiency)
    : DEFAULT_LAMINATE_PRESS_ELECTRIC.efficiency,
  pricePerKwh: Number(rawLaminatePressElectric?.pricePerKwh) > 0
    ? Number(rawLaminatePressElectric?.pricePerKwh)
    : DEFAULT_LAMINATE_PRESS_ELECTRIC.pricePerKwh,
};

const rawLaminatePressTime = (rawConstants as { laminatePressTime?: LaminatePressTime }).laminatePressTime;
const laminatePressTime: LaminatePressTime = {
  setupFirstMinutes: Number(rawLaminatePressTime?.setupFirstMinutes) > 0
    ? Number(rawLaminatePressTime?.setupFirstMinutes)
    : DEFAULT_LAMINATE_PRESS_TIME.setupFirstMinutes,
  setupNextMinutes: Number(rawLaminatePressTime?.setupNextMinutes) > 0
    ? Number(rawLaminatePressTime?.setupNextMinutes)
    : DEFAULT_LAMINATE_PRESS_TIME.setupNextMinutes,
  avgSpeedMPerMin: Number(rawLaminatePressTime?.avgSpeedMPerMin) > 0
    ? Number(rawLaminatePressTime?.avgSpeedMPerMin)
    : DEFAULT_LAMINATE_PRESS_TIME.avgSpeedMPerMin,
};

const rawSlitPressLabor = (rawConstants as unknown as {
  slitPressLabor?: { wage?: number; mealMorning?: number };
}).slitPressLabor;
const slitPressLabor: SlitPressLabor = {
  wage: Number(rawSlitPressLabor?.wage) || 0,
  mealMorning: Number(rawSlitPressLabor?.mealMorning) || DEFAULT_SLIT_PRESS_LABOR.mealMorning,
};

const rawSlitPressElectric = (rawConstants as { slitPressElectric?: SlitPressElectric }).slitPressElectric;
const slitPressElectric: SlitPressElectric = {
  powerKw: Number(rawSlitPressElectric?.powerKw) > 0
    ? Number(rawSlitPressElectric?.powerKw)
    : DEFAULT_SLIT_PRESS_ELECTRIC.powerKw,
  efficiency: Number(rawSlitPressElectric?.efficiency) > 0
    ? Number(rawSlitPressElectric?.efficiency)
    : DEFAULT_SLIT_PRESS_ELECTRIC.efficiency,
  pricePerKwh: Number(rawSlitPressElectric?.pricePerKwh) > 0
    ? Number(rawSlitPressElectric?.pricePerKwh)
    : DEFAULT_SLIT_PRESS_ELECTRIC.pricePerKwh,
};

const rawSlitPressTime = (rawConstants as unknown as {
  slitPressTime?: { rules?: Array<{ key?: string; label?: string; setupMinutes?: number; speedMPerMin?: number }> };
}).slitPressTime;
const slitPressTime: SlitPressTime = {
  rules: Array.isArray(rawSlitPressTime?.rules) && (rawSlitPressTime?.rules?.length ?? 0) > 0
    ? (rawSlitPressTime?.rules ?? []).map((r, i) => ({
        key: r.key || `rule_${i + 1}`,
        label: r.label || `Loại ${i + 1}`,
        setupMinutes: Number(r.setupMinutes) > 0 ? Number(r.setupMinutes) : 20,
        speedMPerMin: Number(r.speedMPerMin) > 0 ? Number(r.speedMPerMin) : 100,
      }))
    : DEFAULT_SLIT_PRESS_TIME.rules.map((r) => ({ ...r })),
};

export const INITIAL_CONSTANTS: AppConstants = {
  ...rawConstants,
  boxOptions: rawConstants.boxOptions?.length ? rawConstants.boxOptions : fallbackBoxOptions,
  handleOptions: rawConstants.handleOptions?.length ? rawConstants.handleOptions : fallbackHandleOptions,
  cutRules: rawConstants.cutRules?.length ? rawConstants.cutRules : fallbackCutRules,
  customPrintSurcharges: rawConstants.customPrintSurcharges ?? [],
  printFilmProfitRates,
  printPressLabor,
  printPressElectric,
  printPressTime,
  laminatePressLabor,
  laminatePressElectric,
  laminatePressTime,
  slitPressLabor,
  slitPressElectric,
  slitPressTime,
  // JSON stores colorSetup keys as strings → convert back to number keys
  colorSetup: Object.fromEntries(
    Object.entries(rawConstants.colorSetup).map(([k, v]) => [Number(k), v])
  ) as Record<number, number>,
};
