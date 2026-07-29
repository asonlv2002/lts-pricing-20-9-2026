import { Material, ProfitRow, AppConstants, SmallWidthMaterialPrice, BoxOption, HandleOption, ConfigSnapshot, PrintSurchargeOption, PrintFilmProfitRate, PrintPressLabor, PrintPressElectric, PrintPressTime, LaminatePressLabor, LaminatePressElectric, LaminatePressTime, SlitPressLabor, SlitPressElectric, SlitPressTime, SlitPressTimeRule, BagPressLabor, BagPressElectric, BagPressTime, BagPressSetupRule, BagPressSpeedRule } from './types';
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
  shiftDivisor: 2,
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
  wages: [800000, 550000, 800000, 550000],
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
  wage: 550000,
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

export const BAG_PRESS_MAX_PER_SHIFT = 3;

export const DEFAULT_BAG_PRESS_LABOR: BagPressLabor = {
  // 2 ca × 3 CN: [ca sáng…, ca tối…]
  wages: [800000, 550000, 500000, 800000, 550000, 500000],
  morningCount: 3,
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
};

/** Chuẩn hoá wages 2 ca; bản cũ length≤3 → ca tối = default */
export function normalizeBagPressLabor(
  raw?: Partial<BagPressLabor> & { wages?: number[] },
): BagPressLabor {
  const defMorning = DEFAULT_BAG_PRESS_LABOR.wages.slice(0, BAG_PRESS_MAX_PER_SHIFT);
  const defEvening = DEFAULT_BAG_PRESS_LABOR.wages.slice(BAG_PRESS_MAX_PER_SHIFT);
  const src = Array.isArray(raw?.wages) ? raw!.wages!.map((w) => Number(w) || 0) : [];

  let morning: number[];
  let evening: number[];

  if (src.length === 0) {
    morning = [...defMorning];
    evening = [...defEvening];
  } else if (src.length <= BAG_PRESS_MAX_PER_SHIFT) {
    morning = src.slice(0, BAG_PRESS_MAX_PER_SHIFT);
    evening = [...defEvening];
  } else {
    const mcRaw = Number(raw?.morningCount);
    const mc =
      Number.isFinite(mcRaw) && mcRaw >= 1 && mcRaw <= BAG_PRESS_MAX_PER_SHIFT
        ? Math.floor(mcRaw)
        : BAG_PRESS_MAX_PER_SHIFT;
    morning = src.slice(0, mc).slice(0, BAG_PRESS_MAX_PER_SHIFT);
    evening = src.slice(mc).slice(0, BAG_PRESS_MAX_PER_SHIFT);
    if (evening.length === 0) evening = [...defEvening];
  }

  if (morning.length === 0) morning = [defMorning[0] ?? 500000];
  if (evening.length === 0) evening = [defEvening[0] ?? 500000];

  return {
    wages: [...morning, ...evening],
    morningCount: morning.length,
    mealMorning: Number(raw?.mealMorning) || DEFAULT_BAG_PRESS_LABOR.mealMorning,
    mealEvening: Number(raw?.mealEvening) || DEFAULT_BAG_PRESS_LABOR.mealEvening,
    otFactor:
      Number(raw?.otFactor) > 0
        ? Number(raw?.otFactor)
        : DEFAULT_BAG_PRESS_LABOR.otFactor,
  };
}

export const DEFAULT_BAG_PRESS_ELECTRIC: BagPressElectric = {
  powerKw: 22,
  efficiency: 0.6,
  pricePerKwh: 2140,
};

export const DEFAULT_BAG_PRESS_SETUP_RULES: BagPressSetupRule[] = [
  { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 },
  { key: '4bien', label: 'Túi 4 biên', setupMinutes: 90 },
  { key: '3_4bien_gt30', label: 'Túi 3 biên, 4 biên (>30cm)', setupMinutes: 90 },
  { key: '3_4bien_gt40', label: 'Túi 3 biên, 4 biên (>40cm)', setupMinutes: 90 },
  { key: 'xephong', label: 'Xếp hông lưng lệch / lưng giữa', setupMinutes: 120 },
  { key: 'xephong_gt40', label: 'Xếp hông lưng lệch / lưng giữa (>40cm)', setupMinutes: 120 },
  { key: 'zipper_daydung', label: 'Zipper đáy đứng', setupMinutes: 120 },
  { key: 'zipper_3bien', label: 'Zipper 3 biên', setupMinutes: 120 },
  { key: 'nap_bangkeo', label: 'Nắp băng keo', setupMinutes: 120 },
  { key: 'cut_seal', label: 'Túi cắt Seal', setupMinutes: 90 },
];

export const DEFAULT_BAG_PRESS_SPEED_RULES: BagPressSpeedRule[] = [
  { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, bagsPerMinute: 80 },
  { key: '200_300', label: '200 – ≤300 mm', maxStepMm: 300, bagsPerMinute: 70 },
  { key: '300_400', label: '300 – ≤400 mm', maxStepMm: 400, bagsPerMinute: 60 },
  { key: '400_550', label: '400 – ≤550 mm', maxStepMm: 550, bagsPerMinute: 50 },
  { key: 'gt_550', label: '> 550 mm', maxStepMm: null, bagsPerMinute: 20 },
];

export const DEFAULT_BAG_PRESS_TIME: BagPressTime = {
  setupRules: DEFAULT_BAG_PRESS_SETUP_RULES.map((r) => ({ ...r })),
  speedRules: DEFAULT_BAG_PRESS_SPEED_RULES.map((r) => ({ ...r })),
};

const rawPrintPressLabor = (rawConstants as unknown as {
  printPressLabor?: Partial<PrintPressLabor>;
}).printPressLabor;
const printPressLabor: PrintPressLabor = {
  wages: Array.isArray(rawPrintPressLabor?.wages) && (rawPrintPressLabor?.wages.length ?? 0) > 0
    ? (rawPrintPressLabor?.wages ?? []).map((w) => Number(w) || 0)
    : [...DEFAULT_PRINT_PRESS_LABOR.wages],
  mealMorning: Number(rawPrintPressLabor?.mealMorning) || DEFAULT_PRINT_PRESS_LABOR.mealMorning,
  mealEvening: Number(rawPrintPressLabor?.mealEvening) || DEFAULT_PRINT_PRESS_LABOR.mealEvening,
  otFactor: Number(rawPrintPressLabor?.otFactor) > 0
    ? Number(rawPrintPressLabor?.otFactor)
    : DEFAULT_PRINT_PRESS_LABOR.otFactor,
  shiftDivisor: Number(rawPrintPressLabor?.shiftDivisor) > 0
    ? Number(rawPrintPressLabor?.shiftDivisor)
    : DEFAULT_PRINT_PRESS_LABOR.shiftDivisor,
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

const rawBagPressLabor = (rawConstants as unknown as {
  bagPressLabor?: Partial<BagPressLabor> & { wages?: number[] };
}).bagPressLabor;
const bagPressLabor: BagPressLabor = normalizeBagPressLabor(rawBagPressLabor);

const rawBagPressElectric = (rawConstants as { bagPressElectric?: BagPressElectric }).bagPressElectric;
const bagPressElectric: BagPressElectric = {
  powerKw: Number(rawBagPressElectric?.powerKw) > 0
    ? Number(rawBagPressElectric?.powerKw)
    : DEFAULT_BAG_PRESS_ELECTRIC.powerKw,
  efficiency: Number(rawBagPressElectric?.efficiency) > 0
    ? Number(rawBagPressElectric?.efficiency)
    : DEFAULT_BAG_PRESS_ELECTRIC.efficiency,
  pricePerKwh: Number(rawBagPressElectric?.pricePerKwh) > 0
    ? Number(rawBagPressElectric?.pricePerKwh)
    : DEFAULT_BAG_PRESS_ELECTRIC.pricePerKwh,
};

const rawBagPressTime = (rawConstants as unknown as {
  bagPressTime?: {
    setupRules?: Array<{ key?: string; label?: string; setupMinutes?: number }>;
    speedRules?: Array<{ key?: string; label?: string; maxStepMm?: number | null; bagsPerMinute?: number }>;
  };
}).bagPressTime;
const bagPressTime: BagPressTime = {
  setupRules: Array.isArray(rawBagPressTime?.setupRules) && (rawBagPressTime?.setupRules?.length ?? 0) > 0
    ? (rawBagPressTime?.setupRules ?? []).map((r, i) => ({
        key: r.key || `setup_${i + 1}`,
        label: r.label || `Loại túi ${i + 1}`,
        setupMinutes: Number(r.setupMinutes) > 0 ? Number(r.setupMinutes) : 90,
      }))
    : DEFAULT_BAG_PRESS_TIME.setupRules.map((r) => ({ ...r })),
  speedRules: Array.isArray(rawBagPressTime?.speedRules) && (rawBagPressTime?.speedRules?.length ?? 0) > 0
    ? (rawBagPressTime?.speedRules ?? []).map((r, i) => ({
        key: r.key || `speed_${i + 1}`,
        label: r.label || `Bậc ${i + 1}`,
        maxStepMm: r.maxStepMm == null ? null : (Number(r.maxStepMm) || null),
        bagsPerMinute: Number(r.bagsPerMinute) > 0 ? Number(r.bagsPerMinute) : 50,
      }))
    : DEFAULT_BAG_PRESS_TIME.speedRules.map((r) => ({ ...r })),
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
  bagPressLabor,
  bagPressElectric,
  bagPressTime,
  // JSON stores colorSetup keys as strings → convert back to number keys
  colorSetup: Object.fromEntries(
    Object.entries(rawConstants.colorSetup).map(([k, v]) => [Number(k), v])
  ) as Record<number, number>,
};
