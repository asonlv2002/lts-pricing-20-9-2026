/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-thoigian.test.ts  (cwd: apps/web)
 */
import {
  tinhThoiGianMayIn,
  tinhThoiGianMayGhep,
  tinhThoiGianMayChia,
  tinhThoiGianMayTui,
  metChiaHoacLamTui,
  metLamTuiTuDauVaoNVL,
  soPhanTuChiaLamTui,
  chonRuleMayChia,
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
  chuanHoaSetupRulesTui,
} from './cpsx-upgrade-thoigian';
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianMayChia,
  CpsxThoiGianMayTui,
  CpsxUpgradeThoiGian,
} from './types';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

function approx(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}

const cfgIn: CpsxThoiGianMayIn = {
  mountMinutesPerColor: 15,
  proofMinutes1to7: 20,
  proofMinutes8: 30,
  matteExtraMinutes: 80,
  avgSpeedMPerMin: 150,
};

// IN 4080m · 4 màu — setup = 4 × 15 + 20 = 80'; chay = 4080/150 = 27,2'
const r1 = tinhThoiGianMayIn(4080, 4, cfgIn);
assert('IN 4 màu 4080m — setupPhut = 80 (số màu × lên trục + duyệt mẫu)', approx(r1.chiTiet.setupPhut, 80));
assert('IN 4 màu 4080m — chayPhut ≈ 27.2', approx(r1.chiTiet.chayPhut, 27.2));
assert('IN 4 màu 4080m — tongPhut ≈ 107.2', approx(r1.tongPhut, 107.2));

// IN 8 màu → duyệt mẫu 8 màu (30'); setup = 8 × 15 + 30 = 150'
const r2 = tinhThoiGianMayIn(4080, 8, cfgIn);
assert('IN 8 màu — setupPhut = 150 (dùng proof8 1 lần)', approx(r2.chiTiet.setupPhut, 150));

// IN phủ mờ → + 80 phút
const r3 = tinhThoiGianMayIn(4080, 4, cfgIn, true);
assert('IN 4 màu + phủ mờ — tongPhut = 107.2 + 80 = 187.2', approx(r3.tongPhut, 187.2));

// IN không màu/không mét → 0
const r4 = tinhThoiGianMayIn(0, 0, cfgIn);
assert('IN 0 màu 0m — tongPhut = 0', r4.tongPhut === 0);

// IN tocDo = 0 → fallback chia 1 (tránh 0/0)
const r5 = tinhThoiGianMayIn(4080, 4, { ...cfgIn, avgSpeedMPerMin: 0 });
assert('IN tocDo = 0 → không NaN', Number.isFinite(r5.chiTiet.chayPhut));

const cfgGhep: CpsxThoiGianMayGhep = {
  setupFirstMinutes: 10,
  setupNextMinutes: 30,
  avgSpeedMPerMin: 100,
};
// GHEP 1 lần 8770m — setup 10'; chay = 8770/100 = 87,7'
const r6 = tinhThoiGianMayGhep(8770, 1, cfgGhep);
assert('GHEP 1 lần 8770m — setupPhut = 10', approx(r6.chiTiet.setupPhut, 10));
assert('GHEP 1 lần 8770m — chayPhut ≈ 87.7', approx(r6.chiTiet.chayPhut, 87.7));
assert('GHEP 1 lần 8770m — tongPhut ≈ 97.7', approx(r6.tongPhut, 97.7));

// GHEP 2 lần → setup = 10 + 30 = 40'
const r7 = tinhThoiGianMayGhep(8770, 2, cfgGhep);
assert('GHEP 2 lần — setupPhut = 40', approx(r7.chiTiet.setupPhut, 40));
assert('GHEP 3 lần — setupPhut = 70', approx(tinhThoiGianMayGhep(8770, 3, cfgGhep).chiTiet.setupPhut, 70));

// CHIA rule ghép 2 lớp: setup 20'; chay = 9350/145 ≈ 64,48'
const ruleLam2 = { key: 'laminate_2', label: 'Màng ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 };
const r8 = tinhThoiGianMayChia(9350, ruleLam2);
assert('CHIA ghép 2 lớp 9350m — setupPhut = 20', approx(r8.chiTiet.setupPhut, 20));
assert('CHIA ghép 2 lớp 9350m — chayPhut ≈ 64.48', approx(r8.chiTiet.chayPhut, 9350 / 145));

// TÚI 4000m · túi 3 biên (90') · bước ≤200mm (80 m/phút) → 90 + 50 = 140'
// Công thức: setup + mét/tốc độ m/phút — KHÔNG dùng số túi ÷ cái/phút
const setup3bien = { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 };
const speed200 = { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, speedMPerMin: 80 };
const r9 = tinhThoiGianMayTui(4000, setup3bien, speed200);
assert('TÚI 4000m — setupPhut = 90', approx(r9.chiTiet.setupPhut, 90));
assert('TÚI 4000m — chayPhut = 50', approx(r9.chiTiet.chayPhut, 50));
assert('TÚI 4000m — tongPhut = 140', approx(r9.tongPhut, 140));
// Guard: nếu lỡ dùng số túi 10000 ÷ 80 cái/phút = 125' chạy — phải khác 50
assert('TÚI chayPhut ≠ số túi÷cái/phút', !approx(r9.chiTiet.chayPhut, 10000 / 80));

// metChiaHoacLamTui: ghép cuối / fallback in (máy chia)
assert(
  'metChia: có ghép → TP+phi hao lớp cuối',
  metChiaHoacLamTui({
    printMeters: 8000,
    printWaste: 420,
    layers: { laminations: [{ meters: 8420, waste: 350 }, { meters: 8770, waste: 300 }] },
  }) === 9070,
);
assert(
  'metChia: không ghép → TP+phi hao in',
  metChiaHoacLamTui({ printMeters: 8000, printWaste: 420, layers: { laminations: [] } }) === 8420,
);
assert('metChia: null → 0', metChiaHoacLamTui(null) === 0);

// metLamTuiTuDauVaoNVL: TP+PH (TP = SL×bước÷hình hoặc cutMeters); không × divideElements
assert('soPhanTu: không chia → 1', soPhanTuChiaLamTui({ hasDivide: false, divideElements: 4 }) === 1);
assert('soPhanTu: có chia N=2 → 2', soPhanTuChiaLamTui({ hasDivide: true, divideElements: 2 }) === 2);
assert('soPhanTu: có chia N=0 → 1', soPhanTuChiaLamTui({ hasDivide: true, divideElements: 0 }) === 1);
assert(
  'metTui: cutMeters+cutWaste khi khớp TP',
  metLamTuiTuDauVaoNVL({ cutMeters: 25000, cutWaste: 267 }) === 25267,
);
assert(
  'metTui: có chia không ×N (ĐV = TP+PH)',
  metLamTuiTuDauVaoNVL({
    cutMeters: 25000,
    cutWaste: 267,
    input: { hasDivide: true, divideElements: 2 },
  }) === 25267,
);
assert(
  'metTui: neo SL×bước÷hình + PH định mức',
  metLamTuiTuDauVaoNVL({
    input: { productType: 'tui', quantity: 10000, cutStep: 0.4, numImages: 1 },
  }) === 4000 + (4000 / 3000 * 20 + 100),
);
assert(
  'metTui: có chia không ÷ numImages (SL×bước thuần)',
  metLamTuiTuDauVaoNVL({
    input: {
      productType: 'tui', quantity: 10000, cutStep: 0.4, numImages: 2,
      hasDivide: true, divideElements: 2,
    },
  }) === 4000 + (4000 / 3000 * 20 + 100),
);
assert(
  'metTui: không chia vẫn ÷ numImages',
  metLamTuiTuDauVaoNVL({
    input: { productType: 'tui', quantity: 10000, cutStep: 0.4, numImages: 2 },
  }) === 2000 + (2000 / 3000 * 20 + 100),
);
assert(
  'metTui: fallback layers.cut khi thiếu cutMeters',
  metLamTuiTuDauVaoNVL({ layers: { cut: { meters: 9000, waste: 100 } } }) === 9100,
);
assert('metTui: null → 0', metLamTuiTuDauVaoNVL(null) === 0);
const rTuiCut = tinhThoiGianMayTui(
  metLamTuiTuDauVaoNVL({
    cutMeters: 25000,
    cutWaste: 267,
    input: { hasDivide: true, divideElements: 2 },
  }),
  setup3bien,
  { key: '400_550', label: '400–550', maxStepMm: 550, speedMPerMin: 50 },
);
assert('TÚI 25267/50 +90', approx(rTuiCut.tongPhut, 90 + 25267 / 50));

// Migrate bagsPerMinute → speedMPerMin (data copy từ bagPressTime cũ)
const rBagBags = chuanHoaCpsxUpgradeThoiGian(
  {
    bag: {
      setupRules: [{ key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 }],
      speedRules: [
        { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, bagsPerMinute: 80 } as never,
        { key: 'gt_550', label: '> 550 mm', maxStepMm: null, bagsPerMinute: 20 } as never,
      ],
    },
  } as never,
  {
    print: cfgIn,
    laminate: cfgGhep,
    slit: { rules: [ruleLam2] },
    bag: {
      setupRules: [setup3bien],
      speedRules: [
        { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, speedMPerMin: 80 },
        { key: 'gt_550', label: '> 550 mm', maxStepMm: null, speedMPerMin: 20 },
      ],
    },
  },
);
assert('migrate bagsPerMinute → speedMPerMin 80', rBagBags.bag.speedRules[0].speedMPerMin === 80);
assert('migrate bagsPerMinute → speedMPerMin 20', rBagBags.bag.speedRules[1].speedMPerMin === 20);
// speedMPerMin thiếu + bagsPerMinute thiếu → không còn fallback 1 trong tinhThoiGian
const rTuiNoSpeed = tinhThoiGianMayTui(25535, setup3bien, { key: 'x', label: 'x', maxStepMm: 400, speedMPerMin: 0 });
assert('TÚI speed=0 → fallback 50 m/phút (không ÷1)', approx(rTuiNoSpeed.chiTiet.chayPhut, 25535 / 50));
assert('TÚI speed=0 — tong ≠ 25625 (bug cũ setup+mét/1)', !approx(rTuiNoSpeed.tongPhut, 90 + 25535));

// ── Auto-map ─────────────────────────────────────────────────────────────────

const cfgChia: CpsxThoiGianMayChia = {
  rules: [
    { key: 'opp_mattopp', label: 'Màng OPP, MattOPP', setupMinutes: 30, speedMPerMin: 180 },
    { key: 'mpet_pet', label: 'Màng MPET, PET', setupMinutes: 20, speedMPerMin: 90 },
    { key: 'laminate_2', label: 'Ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 },
    { key: 'laminate_3', label: 'Ghép 3 lớp', setupMinutes: 20, speedMPerMin: 90 },
    { key: 'matte_flip', label: 'Phủ mờ (lật mặt)', setupMinutes: 20, speedMPerMin: 150 },
  ],
};
assert('chia ghép 1 lớp (PET) → laminate_2', chonRuleMayChia(cfgChia, 'PET 12//LLDPE 60', 1).key === 'laminate_2');
assert('chia ghép 1 lớp (BOPP) → laminate_2', chonRuleMayChia(cfgChia, 'BOPP 18//LLDPE 60', 1).key === 'laminate_2');
assert('chia ghép 2 lớp → laminate_3', chonRuleMayChia(cfgChia, 'OPP 20//LLDPE 60//LLDPE 60', 2).key === 'laminate_3');
assert('chia 1 lớp MPET, PET → mpet_pet', chonRuleMayChia(cfgChia, 'PET 12', 0).key === 'mpet_pet');
assert('chia 1 lớp OPP, MattOPP → opp_mattopp', chonRuleMayChia(cfgChia, 'LLDPE 60', 0).key === 'opp_mattopp');
assert('chia 1 lớp OPP, MattOPP (BOPP) → opp_mattopp', chonRuleMayChia(cfgChia, 'BOPP 18', 0).key === 'opp_mattopp');
assert('chia không còn phủ mờ → ưu tiên cấu trúc', chonRuleMayChia(cfgChia, 'PET 12//LLDPE 60', 1).key === 'laminate_2');

const cfgTui: CpsxThoiGianMayTui = {
  setupRules: [
    { key: '3bien_le30', label: 'Túi 3 biên', setupMinutes: 90, maxStepMm: 300, stepOp: 'lte' },
    { key: '3bien_gt30', label: 'Túi 3 biên', setupMinutes: 91, maxStepMm: 300, stepOp: 'gt' },
    { key: '4bien_le30', label: 'Túi 4 biên', setupMinutes: 92, maxStepMm: 300, stepOp: 'lte' },
    { key: '4bien_gt30', label: 'Túi 4 biên', setupMinutes: 93, maxStepMm: 300, stepOp: 'gt' },
    { key: 'xephong', label: 'Xếp hông', setupMinutes: 120, maxStepMm: null, stepOp: null },
    { key: 'xephong_gt40', label: 'Xếp hông >40cm', setupMinutes: 120, maxStepMm: null, stepOp: null },
    { key: 'zipper_3bien', label: 'Zipper 3 biên', setupMinutes: 120, maxStepMm: null, stepOp: null },
    { key: 'zipper_daydung', label: 'Zipper đáy đứng', setupMinutes: 120, maxStepMm: null, stepOp: null },
    { key: 'cut_seal', label: 'Túi cắt Seal', setupMinutes: 90, maxStepMm: null, stepOp: null },
  ],
  speedRules: [
    { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, speedMPerMin: 80 },
    { key: '200_300', label: '200–300 mm', maxStepMm: 300, speedMPerMin: 70 },
    { key: '300_400', label: '300–400 mm', maxStepMm: 400, speedMPerMin: 60 },
    { key: '400_550', label: '400–550 mm', maxStepMm: 550, speedMPerMin: 50 },
    { key: 'gt_550', label: '> 550 mm', maxStepMm: null, speedMPerMin: 20 },
  ],
};
assert('túi 3 biên + 24cm → 3bien_le30', chonSetupMayTui(cfgTui, '3bien', false, 0.24).key === '3bien_le30');
assert('túi 3 biên + 35cm → 3bien_gt30', chonSetupMayTui(cfgTui, '3bien', false, 0.35).key === '3bien_gt30');
assert('túi 3 biên + 48cm → 3bien_gt30 (gộp >30)', chonSetupMayTui(cfgTui, '3bien', false, 0.48).key === '3bien_gt30');
assert('túi 4 biên + 24cm → 4bien_le30', chonSetupMayTui(cfgTui, '4bien', false, 0.24).key === '4bien_le30');
assert('túi 4 biên + 35cm → 4bien_gt30', chonSetupMayTui(cfgTui, '4bien', false, 0.35).key === '4bien_gt30');
assert('túi xếp hông → xephong', chonSetupMayTui(cfgTui, 'xephong_lech', false, 0.24).key === 'xephong');
assert('túi xếp hông + bước 45cm → xephong_gt40', chonSetupMayTui(cfgTui, 'xephong_giua', false, 0.45).key === 'xephong_gt40');
assert('túi zipper → zipper_3bien', chonSetupMayTui(cfgTui, '3bien', true, 0.24).key === 'zipper_3bien');
assert('túi zipper đáy đứng → zipper_daydung', chonSetupMayTui(cfgTui, 'dayDung', true, 0.24).key === 'zipper_daydung');
assert('túi cut seal → cut_seal', chonSetupMayTui(cfgTui, 'cutSeal', false, 0.24).key === 'cut_seal');

// Migrate data cũ → 4 dòng biên + loại khác
const oldSetup = [
  { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 },
  { key: '4bien', label: 'Túi 4 biên', setupMinutes: 88 },
  { key: '3_4bien_gt30', label: '3/4 biên >30cm', setupMinutes: 95 },
  { key: '3_4bien_gt40', label: '3/4 biên >40cm', setupMinutes: 99 },
  { key: 'xephong', label: 'Xếp hông', setupMinutes: 120 },
  { key: 'cut_seal', label: 'Túi cắt Seal', setupMinutes: 90 },
];
const migrated = chuanHoaSetupRulesTui(oldSetup as never, cfgTui.setupRules);
assert('migrate có 3bien_le30', migrated.some(r => r.key === '3bien_le30' && r.stepOp === 'lte'));
assert('migrate có 4bien_gt30 phút từ gt30', migrated.find(r => r.key === '4bien_gt30')?.setupMinutes === 95);
assert('migrate giữ xephong không size', migrated.find(r => r.key === 'xephong')?.stepOp == null);
assert(
  'legacy flat 3bien + 24cm → key 3bien',
  chonSetupMayTui(
    { setupRules: oldSetup as never, speedRules: cfgTui.speedRules },
    '3bien',
    false,
    0.24,
  ).key === '3bien',
);
assert(
  'sau migrate 3bien + 24cm → 3bien_le30',
  chonSetupMayTui(
    { setupRules: migrated, speedRules: cfgTui.speedRules },
    '3bien',
    false,
    0.24,
  ).key === '3bien_le30',
);
assert('bước 15cm → 80 m/phút', chonTocDoMayTui(cfgTui, 0.15).speedMPerMin === 80);
assert('bước 20cm → 80 m/phút (đúng ngưỡng)', chonTocDoMayTui(cfgTui, 0.2).speedMPerMin === 80);
assert('bước 24cm → 70 m/phút (200–300mm)', chonTocDoMayTui(cfgTui, 0.24).speedMPerMin === 70);
assert('bước 35cm → 60 m/phút (300–400mm)', chonTocDoMayTui(cfgTui, 0.35).speedMPerMin === 60);
assert('bước 48cm → 50 m/phút (400–550mm)', chonTocDoMayTui(cfgTui, 0.48).speedMPerMin === 50);
assert('bước 55cm → 50 m/phút (đúng ngưỡng)', chonTocDoMayTui(cfgTui, 0.55).speedMPerMin === 50);
assert('bước 60cm → 20 m/phút (không trần)', chonTocDoMayTui(cfgTui, 0.6).speedMPerMin === 20);
assert('bước 70cm → 20 m/phút (không trần)', chonTocDoMayTui(cfgTui, 0.7).speedMPerMin === 20);

// ── Chuẩn hoá / migrate ─────────────────────────────────────────────────────

const defaults: CpsxUpgradeThoiGian = {
  print: { ...cfgIn },
  laminate: { ...cfgGhep },
  slit: { rules: cfgChia.rules.map(r => ({ ...r })) },
  bag: {
    setupRules: cfgTui.setupRules.map(r => ({ ...r })),
    speedRules: cfgTui.speedRules.map(r => ({ ...r })),
  },
};

const r10 = chuanHoaCpsxUpgradeThoiGian(undefined, defaults);
assert('chuanHoa undefined → dùng defaults', r10.print.avgSpeedMPerMin === 150);
assert('chuanHoa undefined → matteExtraMinutes = default (80)', r10.print.matteExtraMinutes === 80);
assert('chuanHoa undefined → slit có rule', r10.slit.rules.length === cfgChia.rules.length);
assert('chuanHoa undefined → bag có setupRules', r10.bag.setupRules.length === cfgTui.setupRules.length);

const r11 = chuanHoaCpsxUpgradeThoiGian(
  { print: { avgSpeedMPerMin: 9000 } as never },
  defaults,
);
assert('chuanHoa partial print → override avgSpeed', r11.print.avgSpeedMPerMin === 9000);
assert('chuanHoa partial print → giữ nguyên mount', r11.print.mountMinutesPerColor === 15);
assert('chuanHoa partial print → giữ nguyên máy khác', r11.laminate.setupFirstMinutes === 10);

// Migrate model cũ: tocDoMetPerHour 7500 → avgSpeedMPerMin 125; phutSetup → setupFirst
const r12 = chuanHoaCpsxUpgradeThoiGian(
  {
    print: { tocDoMetPerHour: 7500, phutSetupMoiMau: 20, mauSoGioSetup: 60, nguongMet: 40000, tocDoNganMetPerHour: 7500 },
    laminate: { tocDoPerHour: 6000, phutSetup: 15, donVi: 'met' },
    slit: { tocDoPerHour: 8000, phutSetup: 10, donVi: 'met' },
    bag: { tocDoPerHour: 5000, phutSetup: 30, donVi: 'chiec' },
  } as never,
  defaults,
);
assert('migrate cũ: in avgSpeedMPerMin = 7500/60 = 125', approx(r12.print.avgSpeedMPerMin, 125));
assert('migrate cũ: ghép avgSpeedMPerMin = 6000/60 = 100', approx(r12.laminate.avgSpeedMPerMin, 100));
assert('migrate cũ: ghép setupFirst = 15', r12.laminate.setupFirstMinutes === 15);
assert('migrate cũ: chia → rules mặc định (không map được)', r12.slit.rules.length === cfgChia.rules.length);
assert('migrate cũ: túi → bảng mặc định', r12.bag.setupRules.length === cfgTui.setupRules.length);

const r13 = chuanHoaCpsxUpgradeThoiGian({}, defaults);
assert('chuanHoa {} → bằng defaults', r13.print.avgSpeedMPerMin === 150 && r13.slit.rules[0].key === 'opp_mattopp');
assert('chuanHoa {} → matteExtraMinutes = default (80', r13.print.matteExtraMinutes === 80);

// Label 1 lớp: ép bỏ dấu / → "Màng OPP, MattOPP" / "Màng MPET, PET"
const rNhanChia = chuanHoaCpsxUpgradeThoiGian(
  {
    slit: {
      rules: [
        { key: 'opp_mattopp', label: 'Màng OPP / MattOPP', setupMinutes: 30, speedMPerMin: 180 },
        { key: 'mpet_pet', label: 'MPET / PET', setupMinutes: 20, speedMPerMin: 90 },
        { key: 'laminate_2', label: 'Màng ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 },
      ],
    },
  } as never,
  defaults,
);
assert(
  'chuanHoa slit: opp_mattopp → Màng OPP, MattOPP',
  rNhanChia.slit.rules.find((r) => r.key === 'opp_mattopp')?.label === 'Màng OPP, MattOPP',
);
assert(
  'chuanHoa slit: mpet_pet → Màng MPET, PET',
  rNhanChia.slit.rules.find((r) => r.key === 'mpet_pet')?.label === 'Màng MPET, PET',
);
assert(
  'chuanHoa slit: laminate_2 giữ label tùy chỉnh',
  rNhanChia.slit.rules.find((r) => r.key === 'laminate_2')?.label === 'Màng ghép 2 lớp',
);

// matteExtraMinutes = 0 cố ý → vẫn giữ 0 (không fallback default)
const r14 = chuanHoaCpsxUpgradeThoiGian(
  { print: { matteExtraMinutes: 0 } as never },
  defaults,
);
assert('chuanHoa { print: { matteExtraMinutes: 0 } } → giữ 0', r14.print.matteExtraMinutes === 0);

console.log(`\n  CPSX Thời gian: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
