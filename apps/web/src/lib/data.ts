import { Material, ProfitRow, AppConstants, SmallWidthMaterialPrice, BoxOption, HandleOption, ConfigSnapshot, PrintSurchargeOption, PrintFilmProfitRate, PrintPressLabor, PrintPressElectric, PrintPressTime, LaminatePressLabor, LaminatePressElectric, LaminatePressTime, SlitPressLabor, SlitPressElectric, SlitPressTime, SlitPressTimeRule, BagPressLabor, BagPressElectric, BagPressTime, BagPressSetupRule, BagPressSpeedRule, CpsxTuiSpeedRule, CpsxUpgradeElectric, CpsxUpgradeLabor, CpsxUpgradeLabor1May, CpsxUpgradeLaborTui, CpsxUpgradeInk, CpsxUpgradeThoiGian, MucInTable, MucInRow, SolventAdhesiveTable, SolventAdhesiveRow, KeoRow, DinhMucInRow, DinhMucGhep } from './types';
import { chuanHoaCpsxUpgradeElectric } from './cpsx-upgrade-electric';
import { chuanHoaCpsxUpgradeLabor } from './cpsx-upgrade-labor';
import { chuanHoaCpsxUpgradeInk } from './cpsx-upgrade-ink';
import { chuanHoaCpsxUpgradeThoiGian } from './cpsx-upgrade-thoigian';
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
  { key: 'opp_mattopp', label: 'Màng OPP, MattOPP', setupMinutes: 30, speedMPerMin: 180 },
  { key: 'mpet_pet', label: 'Màng MPET, PET', setupMinutes: 20, speedMPerMin: 90 },
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

export const DEFAULT_CPSX_TUI_SPEED_RULES: CpsxTuiSpeedRule[] = [
  { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, speedMPerMin: 80 },
  { key: '200_300', label: '200 – ≤300 mm', maxStepMm: 300, speedMPerMin: 70 },
  { key: '300_400', label: '300 – ≤400 mm', maxStepMm: 400, speedMPerMin: 60 },
  { key: '400_550', label: '400 – ≤550 mm', maxStepMm: 550, speedMPerMin: 50 },
  { key: 'gt_550', label: '> 550 mm', maxStepMm: null, speedMPerMin: 20 },
];

export const DEFAULT_BAG_PRESS_TIME: BagPressTime = {
  setupRules: DEFAULT_BAG_PRESS_SETUP_RULES.map((r) => ({ ...r })),
  speedRules: DEFAULT_BAG_PRESS_SPEED_RULES.map((r) => ({ ...r })),
};

/** CPSX nâng cấp — mục Điện; độc lập pricePerKwh CPSX cũ; mặc định TB cộng */
export const DEFAULT_CPSX_UPGRADE_ELECTRIC: CpsxUpgradeElectric = {
  slots: [
    { id: 'slot_0_6', label: '0h-6h', start: '00:00', end: '06:00', hours: 6, pricePerKwh: 3000 },
    { id: 'slot_6_17', label: '6h-17h', start: '06:00', end: '17:00', hours: 11, pricePerKwh: 4000 },
    { id: 'slot_17_0', label: '17h-0h', start: '17:00', end: '00:00', hours: 7, pricePerKwh: 5000 },
  ],
  appliedSource: 'average',
  appliedPricePerKwh: 4000,
  machines: {
    print: { powerKw: 180, efficiency: 0.55 },
    laminate: { powerKw: 45, efficiency: 0.65 },
    slit: { powerKw: 15, efficiency: 0.6 },
    bag: { powerKw: 22, efficiency: 0.6 },
  },
};

/** CPSX nâng cấp — Lương 1-máy defaults (In/Ghép/Chia) */
const DEFAULT_CPSX_LUONG_IN: CpsxUpgradeLabor1May = {
  // 2 ca × 3 CN
  wages: [800000, 550000, 500000, 800000, 550000, 500000],
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
  shiftCount: 2,
  peoplePerShift: null,
  machinesPerDay: 1,
  hoursPerDay: 24,
  otHours: 4,
  tyLeTangCa: 0.5,
};
const DEFAULT_CPSX_LUONG_GHEP: CpsxUpgradeLabor1May = {
  wages: [800000, 550000, 800000, 550000],
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
  shiftCount: 2,
  peoplePerShift: null,
  machinesPerDay: 1,
  hoursPerDay: 24,
  otHours: 4,
  tyLeTangCa: 0.5,
};
const DEFAULT_CPSX_LUONG_CHIA: CpsxUpgradeLabor1May = {
  wages: [550000],
  mealMorning: 30000,
  mealEvening: 65000,
  otFactor: 1.5,
  shiftCount: 1,
  peoplePerShift: null,
  machinesPerDay: 1,
  hoursPerDay: 12,
  otHours: 4,
  tyLeTangCa: 0.5,
};
const DEFAULT_CPSX_LUONG_TUI: CpsxUpgradeLaborTui = {
  wages: [
    1000000, 1000000, 1000000,
    400000, 400000, 400000, 400000, 400000, 400000,
    500000,
    0, 0,
  ],
  mealMorning: 45000,
  mealEvening: 97500,
  otFactor: 1.5,
  peoplePerShift: 3,
  roundedPerMin: null,
  hoursPerDay: 24,
  machinesPerDay: 3,
  otHours: 4,
  tyLeTangCa: 0.5,
};
export const DEFAULT_CPSX_UPGRADE_LABOR: CpsxUpgradeLabor = {
  print: DEFAULT_CPSX_LUONG_IN,
  laminate: DEFAULT_CPSX_LUONG_GHEP,
  slit: DEFAULT_CPSX_LUONG_CHIA,
  bag: DEFAULT_CPSX_LUONG_TUI,
};

/** CPSX nâng cấp — mục 3: bảng mực in OPP mặc định (T1..T6 gộp vào SL dùng) */
const DEFAULT_MUC_OPP_ROWS: MucInRow[] = [
  { ma: 'MUCMD60', ten: 'MỰC OPP MEDIUM 60', dvt: 'kg', donGia: 43000, slDung: 3825 },
  { ma: 'MUCOPP/PPDEN1A', ten: 'Mực Đen Đậm Q-Chromax OPP BL501/1A', dvt: 'kg', donGia: 60000, slDung: 34 },
  { ma: 'MUCOPP122', ten: 'MỰC OPP Hồng Magenta 122', dvt: 'kg', donGia: 130000, slDung: 85 },
  { ma: 'MUCOPP162', ten: 'MỰC OPP ĐỎ SEN 162', dvt: 'kg', donGia: 61000, slDung: 1275 },
  { ma: 'MUCOPP203', ten: 'MỰC OPP ĐỎ CỜ 203', dvt: 'kg', donGia: 56000, slDung: 850 },
  { ma: 'MUCOPP232', ten: 'MỰC OPP VÀNG 232', dvt: 'kg', donGia: 59500, slDung: 3485 },
  { ma: 'MUCOPP393', ten: 'Mực OPP 393 xanh dương', dvt: 'kg', donGia: 61000, slDung: 1020 },
  { ma: 'MUCOPP53', ten: 'MỰC CAM OPP/53', dvt: 'kg', donGia: 64000, slDung: 612 },
  { ma: 'MUCOPP570', ten: 'MỰC OPP HỒNG 570', dvt: 'kg', donGia: 126000, slDung: 85 },
  { ma: 'MUCOPP79', ten: 'MỰC OPP 79 GREEN', dvt: 'kg', donGia: 66000, slDung: 425 },
  { ma: 'MUCOPP81', ten: 'MỰC OPP 81 TÍM', dvt: 'kg', donGia: 79000, slDung: 170 },
  { ma: 'MUCOPP93DEN', ten: 'MỰC OPP 93 ĐEN', dvt: 'kg', donGia: 58000, slDung: 765 },
  { ma: 'MUCOPPG8226', ten: 'MỰC OPP NHŨ VÀNG G8226-PP', dvt: 'kg', donGia: 159000, slDung: 51 },
  { ma: 'MUCOPPP6004', ten: 'MỰC OPP P6004 HỒNG', dvt: 'kg', donGia: 179000, slDung: 68 },
  { ma: 'MUCOPPW001', ten: 'MỰC OPP W001', dvt: 'kg', donGia: 57000, slDung: 1170 },
  { ma: 'MUCOPPY2002', ten: 'Mực vàng Q-Chromax OPP / Y2002 - PP', dvt: 'kg', donGia: 90000, slDung: 34 },
  { ma: 'MUCOPP_1000', ten: 'MỰC OPP ĐEN 1000', dvt: 'kg', donGia: 72500, slDung: 225 },
  { ma: 'MUCOPP_111', ten: 'MỰC OPP TRẮNG 111', dvt: 'kg', donGia: 82500, slDung: 595 },
  { ma: 'MUCOPP_61', ten: 'MỰC OPP TRẮNG 61', dvt: 'kg', donGia: 56000, slDung: 10700 },
  { ma: 'MUCOPP_62', ten: 'MỰC OPP TRẮNG 62', dvt: 'kg', donGia: 64000, slDung: 2000 },
];

const DEFAULT_MUC_PET_ROWS: MucInRow[] = [
  { ma: 'MUCMDTVS', ten: 'MỰC PET MEDIUM 60', dvt: 'kg', donGia: 61000, slDung: 2720 },
  { ma: 'MUCPET23', ten: 'MỰC PET VÀNG 23', dvt: 'kg', donGia: 75000, slDung: 1615 },
  { ma: 'MUCPET53', ten: 'MỰC PET CAM 53', dvt: 'kg', donGia: 80000, slDung: 731 },
  { ma: 'MUCPETB321NR', ten: 'MỰC PET B321-NR XANH DƯƠNG', dvt: 'kg', donGia: 79000, slDung: 320 },
  { ma: 'MUCPETB393', ten: 'MỰC PET B393', dvt: 'kg', donGia: 82000, slDung: 510 },
  { ma: 'MUCPETBL521', ten: 'MỰC PET BL521_ NR', dvt: 'kg', donGia: 78000, slDung: 320 },
  { ma: 'MUCPETGDZ07', ten: 'MỰC Nhũ vàng Q-Chromax PET/GD - Z07', dvt: 'kg', donGia: 116000, slDung: 17 },
  { ma: 'MUCPETGR401NR', ten: 'MỰC PET XANH LÁ GR401-NR', dvt: 'kg', donGia: 89000, slDung: 480 },
  { ma: 'MUCPETMDNR', ten: 'MỰC PET MEDIUM NR', dvt: 'kg', donGia: 63000, slDung: 720 },
  { ma: 'MUCPETP6004_NR', ten: 'MỰC PET P6004_ NR', dvt: 'kg', donGia: 178000, slDung: 240 },
  { ma: 'MUCPETR106', ten: 'MỰC PET R106', dvt: 'kg', donGia: 79000, slDung: 880 },
  { ma: 'MUCPETR1124NR', ten: 'MỰC PET R124-NR', dvt: 'kg', donGia: 80000, slDung: 560 },
  { ma: 'MUCPETSZ04', ten: 'Mực nhũ bạc Q-Chromax PET S-Z04', dvt: 'kg', donGia: 148000, slDung: 68 },
  { ma: 'MUCPETV232', ten: 'MỰC PET VÀNG 232', dvt: 'kg', donGia: 81000, slDung: 595 },
  { ma: 'MUCPETV7003NR', ten: 'MỰC PET V7003 NR', dvt: 'kg', donGia: 173000, slDung: 288 },
  { ma: 'MUCPETW001C', ten: 'MỰC PET W001C_ NR', dvt: 'kg', donGia: 53000, slDung: 360 },
  { ma: 'MUCPETW002', ten: 'MỰC PET W002C_ NR', dvt: 'kg', donGia: 71000, slDung: 1900 },
  { ma: 'MUCPETW62', ten: 'MỰC PET TRẮNG 62', dvt: 'kg', donGia: 76000, slDung: 5000 },
  { ma: 'MUCPETXDUONG', ten: 'MỰC PET39NR', dvt: 'kg', donGia: 77000, slDung: 170 },
  { ma: 'MUCPETY2002', ten: 'Mực vàng Q-Chromax PET / Y2002', dvt: 'kg', donGia: 103000, slDung: 64 },
  { ma: 'MUCPETY203NR', ten: 'MỰC PET Y203_ NR', dvt: 'kg', donGia: 78000, slDung: 640 },
  { ma: 'MUCPETYZ02', ten: 'Mực vàng trong Q-Chromax PET Y-Z02', dvt: 'kg', donGia: 140000, slDung: 32 },
  { ma: 'MUCPETZ20', ten: 'Mực nhũ vàng Q-Chromax PET GD-Z20', dvt: 'kg', donGia: 185000, slDung: 1216 },
  { ma: 'MUCPETZ23', ten: 'Mực nhũ vàng Q-Chromax PET GD-Z23', dvt: 'kg', donGia: 182000, slDung: 34 },
  { ma: 'MUCPET_1000', ten: 'MỰC PET ĐEN 1000', dvt: 'kg', donGia: 90500, slDung: 300 },
  { ma: 'MUCPET_120', ten: 'MỰC PET TRẮNG 120', dvt: 'kg', donGia: 95500, slDung: 2000 },
  { ma: 'MUCPET_OPV', ten: 'MỰC PHỦ MỜ PET / OPV Matte S', dvt: 'kg', donGia: 90000, slDung: 2700 },
  { ma: 'MUCPEZ08', ten: 'MỰC Q-Chromax PET R-Z08', dvt: 'kg', donGia: 98000, slDung: 16 },
];

const DEFAULT_MUC_OPP_TABLE: MucInTable = {
  rows: DEFAULT_MUC_OPP_ROWS,
  appliedSource: 'weighted',
  appliedPrice: 0, // sẽ được chuẩn hoá recompute
};
const DEFAULT_MUC_PET_TABLE: MucInTable = {
  rows: DEFAULT_MUC_PET_ROWS,
  appliedSource: 'weighted',
  appliedPrice: 0,
};

/** CPSX nâng cấp — bảng mực PE (dùng khi in trên LLDPE) */
const DEFAULT_MUC_PE_ROWS: MucInRow[] = [
  { ma: 'MUCPE2585',  ten: 'MỰC TÍM (P267C) Q-Surf V-Z05', dvt: 'kg', donGia: 115000, slDung: 17 },
  { ma: 'MUCPE2587',  ten: 'MỰC CAM (P165C).Q-Surf O-Z09', dvt: 'kg', donGia:  79000, slDung: 17 },
  { ma: 'MUCPE501',   ten: 'Mực đen Q-Surf BL501/FE',      dvt: 'kg', donGia:  80000, slDung: 17 },
  { ma: 'MUCPEGXZ17', ten: 'Mực Xám Q-Surf GX-Z17',        dvt: 'kg', donGia:  96000, slDung: 17 },
  { ma: 'MUCPEW001',  ten: 'Mực trắng Q-Surf W001/FE',     dvt: 'kg', donGia:  76000, slDung: 40 },
  { ma: 'MUCPEYZ18',  ten: 'Mực Vàng Q-Surf Y-Z18',        dvt: 'kg', donGia:  96000, slDung: 17 },
];
const DEFAULT_MUC_PE_TABLE: MucInTable = {
  rows: DEFAULT_MUC_PE_ROWS,
  appliedSource: 'weighted',
  appliedPrice: 0,
};

/** CPSX nâng cấp — mục 3: bảng dung môi + keo ghép mặc định (tách 2 bảng) */
const DEFAULT_DUNG_MOI_ROWS: SolventAdhesiveRow[] = [
  { ma: 'DM_OPP', ten: 'DUNG MÔI OPP', dvt: 'kg', donGia: 40000, ghiChu: 'In màng OPP, màng MattOPP' },
  { ma: 'DM_PET', ten: 'DUNG MÔI PET', dvt: 'kg', donGia: 40000, ghiChu: 'In toàn bộ màng còn lại' },
  { ma: 'DM_EA', ten: 'DUNG MÔI EA', dvt: 'kg', donGia: 40000, ghiChu: 'Ghép toàn bộ màng' },
];
const DEFAULT_KEO_ROWS: KeoRow[] = [
  { ma: 'KEO_319', ten: 'KEO GHÉP 319', dvt: 'kg', donGia: 40000, ghiChu: 'Dùng cho mọi loại màng tại khâu GHÉP', slDung: 1 },
  { ma: 'KEO_766', ten: 'KEO GHÉP 766', dvt: 'kg', donGia: 40000, ghiChu: 'Dùng cho mọi loại màng tại khâu GHÉP', slDung: 1 },
];
const DEFAULT_SOLVENT_TABLE: SolventAdhesiveTable = {
  dungMoi: { rows: DEFAULT_DUNG_MOI_ROWS },
  keo: { rows: DEFAULT_KEO_ROWS, appliedSource: 'average', appliedPrice: 40000 },
};

/** CPSX nâng cấp — định mức mực in + dung môi in theo số màu (sheet) */
export const DEFAULT_DINH_MUC_IN: DinhMucInRow[] = [
  { soMau: 1, dmMucG: 4, dmDungMoiG: 4.5 },
  { soMau: 2, dmMucG: 8, dmDungMoiG: 6 },
  { soMau: 3, dmMucG: 12, dmDungMoiG: 7.5 },
  { soMau: 4, dmMucG: 16, dmDungMoiG: 9 },
  { soMau: 5, dmMucG: 20, dmDungMoiG: 10.5 },
  { soMau: 6, dmMucG: 24, dmDungMoiG: 12 },
  { soMau: 7, dmMucG: 28, dmDungMoiG: 13.5 },
  { soMau: 8, dmMucG: 32, dmDungMoiG: 15 },
];

/** CPSX nâng cấp — định mức keo + dung môi ghép (sheet) */
export const DEFAULT_DINH_MUC_GHEP: DinhMucGhep = {
  keoKhoG: 3.5,
  dungMoiPhaKeoG: 7,
};

export const DEFAULT_CPSX_UPGRADE_INK: CpsxUpgradeInk = {
  opp: DEFAULT_MUC_OPP_TABLE,
  pet: DEFAULT_MUC_PET_TABLE,
  pe: DEFAULT_MUC_PE_TABLE,
  solventAdhesive: DEFAULT_SOLVENT_TABLE,
  dinhMucIn: DEFAULT_DINH_MUC_IN,
  dinhMucGhep: DEFAULT_DINH_MUC_GHEP,
};

/** CPSX nâng cấp — mục 4: thời gian SX 4 máy — defaults bản sao CPSX thường */
export const DEFAULT_CPSX_UPGRADE_THOIGIAN: CpsxUpgradeThoiGian = {
  print: {
    mountMinutesPerColor: 15,
    proofMinutes1to7: 20,
    proofMinutes8: 30,
    matteExtraMinutes: 80,
    avgSpeedMPerMin: 150,
  },
  laminate: {
    setupFirstMinutes: 10,
    setupNextMinutes: 30,
    avgSpeedMPerMin: 100,
  },
  slit: {
    rules: DEFAULT_SLIT_PRESS_TIME_RULES.map((r) => ({ ...r })),
  },
  bag: {
    setupRules: DEFAULT_BAG_PRESS_SETUP_RULES.map((r) => ({ ...r })),
    speedRules: DEFAULT_CPSX_TUI_SPEED_RULES.map((r) => ({ ...r })),
  },
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

const rawCpsxUpgradeElectric = (rawConstants as unknown as {
  cpsxUpgradeElectric?: Partial<CpsxUpgradeElectric>;
}).cpsxUpgradeElectric;
const cpsxUpgradeElectric: CpsxUpgradeElectric = chuanHoaCpsxUpgradeElectric(
  rawCpsxUpgradeElectric,
  DEFAULT_CPSX_UPGRADE_ELECTRIC,
);

const rawCpsxUpgradeLabor = (rawConstants as unknown as {
  cpsxUpgradeLabor?: Partial<CpsxUpgradeLabor>;
}).cpsxUpgradeLabor;
const cpsxUpgradeLabor: CpsxUpgradeLabor = chuanHoaCpsxUpgradeLabor(
  rawCpsxUpgradeLabor,
  DEFAULT_CPSX_UPGRADE_LABOR,
);

const rawCpsxUpgradeInk = (rawConstants as unknown as {
  cpsxUpgradeInk?: Partial<CpsxUpgradeInk>;
}).cpsxUpgradeInk;
const cpsxUpgradeInk: CpsxUpgradeInk = chuanHoaCpsxUpgradeInk(
  rawCpsxUpgradeInk,
  DEFAULT_CPSX_UPGRADE_INK.opp,
  DEFAULT_CPSX_UPGRADE_INK.pet,
  DEFAULT_CPSX_UPGRADE_INK.pe,
  DEFAULT_CPSX_UPGRADE_INK.solventAdhesive,
  DEFAULT_CPSX_UPGRADE_INK.dinhMucIn,
  DEFAULT_CPSX_UPGRADE_INK.dinhMucGhep,
);

const rawCpsxUpgradeThoiGian = (rawConstants as unknown as {
  cpsxUpgradeThoiGian?: Partial<CpsxUpgradeThoiGian>;
}).cpsxUpgradeThoiGian;
const cpsxUpgradeThoiGian: CpsxUpgradeThoiGian = chuanHoaCpsxUpgradeThoiGian(
  rawCpsxUpgradeThoiGian,
  DEFAULT_CPSX_UPGRADE_THOIGIAN,
);

export const INITIAL_CONSTANTS: AppConstants = {
  ...rawConstants,
  // Mặc định Zipper 378 đ/m (vật tư / phụ kiện)
  zipperPrice: Number(rawConstants.zipperPrice) > 0 ? Number(rawConstants.zipperPrice) : 378,
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
  cpsxUpgradeElectric,
  cpsxUpgradeLabor,
  cpsxUpgradeInk,
  cpsxUpgradeThoiGian,
  // JSON stores colorSetup keys as strings → convert back to number keys
  colorSetup: Object.fromEntries(
    Object.entries(rawConstants.colorSetup).map(([k, v]) => [Number(k), v])
  ) as Record<number, number>,
};
