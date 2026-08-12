/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-thoigian.test.ts  (cwd: apps/web)
 */
import {
  tinhThoiGianMayIn,
  tinhThoiGianMayGhep,
  tinhThoiGianMayChia,
  tinhThoiGianMayTui,
  chonRuleMayChia,
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
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

// IN 4080m · 4 màu — setup = 4 × (15+20) = 140'; chay = 4080/150 = 27,2'
const r1 = tinhThoiGianMayIn(4080, 4, cfgIn);
assert('IN 4 màu 4080m — setupPhut = 140', approx(r1.chiTiet.setupPhut, 140));
assert('IN 4 màu 4080m — chayPhut ≈ 27.2', approx(r1.chiTiet.chayPhut, 27.2));
assert('IN 4 màu 4080m — tongPhut ≈ 167.2', approx(r1.tongPhut, 167.2));

// IN 8 màu → duyệt mẫu 8 màu (30'); setup = 8 × (15+30) = 360'
const r2 = tinhThoiGianMayIn(4080, 8, cfgIn);
assert('IN 8 màu — setupPhut = 360 (dùng proof8)', approx(r2.chiTiet.setupPhut, 360));

// IN phủ mờ → + 80 phút
const r3 = tinhThoiGianMayIn(4080, 4, cfgIn, true);
assert('IN 4 màu + phủ mờ — tongPhut = 167.2 + 80 = 247.2', approx(r3.tongPhut, 247.2));

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

// TÚI 4000 chiếc · túi 3 biên (90') · bước ≤200mm (80 cái/phút) → 90 + 50 = 140'
const setup3bien = { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 };
const speed200 = { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, bagsPerMinute: 80 };
const r9 = tinhThoiGianMayTui(4000, setup3bien, speed200);
assert('TÚI 4000 chiếc — setupPhut = 90', approx(r9.chiTiet.setupPhut, 90));
assert('TÚI 4000 chiếc — chayPhut = 50', approx(r9.chiTiet.chayPhut, 50));
assert('TÚI 4000 chiếc — tongPhut = 140', approx(r9.tongPhut, 140));

// ── Auto-map ─────────────────────────────────────────────────────────────────

const cfgChia: CpsxThoiGianMayChia = {
  rules: [
    { key: 'opp_mattopp', label: 'OPP / MattOPP', setupMinutes: 30, speedMPerMin: 180 },
    { key: 'mpet_pet', label: 'MPET / PET', setupMinutes: 20, speedMPerMin: 90 },
    { key: 'laminate_2', label: 'Ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 },
    { key: 'laminate_3', label: 'Ghép 3 lớp', setupMinutes: 20, speedMPerMin: 90 },
    { key: 'matte_flip', label: 'Phủ mờ (lật mặt)', setupMinutes: 20, speedMPerMin: 150 },
  ],
};
assert('chia ghép 1 lớp (PET) → laminate_2', chonRuleMayChia(cfgChia, 'PET 12//LLDPE 60', 1).key === 'laminate_2');
assert('chia ghép 1 lớp (BOPP) → laminate_2', chonRuleMayChia(cfgChia, 'BOPP 18//LLDPE 60', 1).key === 'laminate_2');
assert('chia ghép 2 lớp → laminate_3', chonRuleMayChia(cfgChia, 'OPP 20//LLDPE 60//LLDPE 60', 2).key === 'laminate_3');
assert('chia 1 lớp MPET/PET → mpet_pet', chonRuleMayChia(cfgChia, 'PET 12', 0).key === 'mpet_pet');
assert('chia 1 lớp OPP/MattOPP → opp_mattopp', chonRuleMayChia(cfgChia, 'LLDPE 60', 0).key === 'opp_mattopp');
assert('chia 1 lớp OPP/MattOPP (BOPP) → opp_mattopp', chonRuleMayChia(cfgChia, 'BOPP 18', 0).key === 'opp_mattopp');
assert('chia không còn phủ mờ → ưu tiên cấu trúc', chonRuleMayChia(cfgChia, 'PET 12//LLDPE 60', 1).key === 'laminate_2');

const cfgTui: CpsxThoiGianMayTui = {
  setupRules: [
    { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 },
    { key: '3_4bien_gt30', label: '3/4 biên >30cm', setupMinutes: 90 },
    { key: '3_4bien_gt40', label: '3/4 biên >40cm', setupMinutes: 90 },
    { key: 'xephong', label: 'Xếp hông', setupMinutes: 120 },
    { key: 'xephong_gt40', label: 'Xếp hông >40cm', setupMinutes: 120 },
    { key: 'zipper_3bien', label: 'Zipper 3 biên', setupMinutes: 120 },
    { key: 'zipper_daydung', label: 'Zipper đáy đứng', setupMinutes: 120 },
    { key: 'cut_seal', label: 'Túi cắt Seal', setupMinutes: 90 },
  ],
  speedRules: [
    { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, bagsPerMinute: 80 },
    { key: '200_300', label: '200–300 mm', maxStepMm: 300, bagsPerMinute: 70 },
    { key: '300_400', label: '300–400 mm', maxStepMm: 400, bagsPerMinute: 60 },
    { key: '400_550', label: '400–550 mm', maxStepMm: 550, bagsPerMinute: 50 },
    { key: 'gt_550', label: '> 550 mm', maxStepMm: null, bagsPerMinute: 20 },
  ],
};
assert('túi 3bien + bước 24cm → 3bien', chonSetupMayTui(cfgTui, '3bien', false, 0.24).key === '3bien');
assert('túi 3bien + bước 35cm → 3_4bien_gt30', chonSetupMayTui(cfgTui, '3bien', false, 0.35).key === '3_4bien_gt30');
assert('túi 3bien + bước 48cm → 3_4bien_gt40', chonSetupMayTui(cfgTui, '3bien', false, 0.48).key === '3_4bien_gt40');
assert('túi xếp hông → xephong', chonSetupMayTui(cfgTui, 'xephong_lech', false, 0.24).key === 'xephong');
assert('túi xếp hông + bước 45cm → xephong_gt40', chonSetupMayTui(cfgTui, 'xephong_giua', false, 0.45).key === 'xephong_gt40');
assert('túi zipper → zipper_3bien', chonSetupMayTui(cfgTui, '3bien', true, 0.24).key === 'zipper_3bien');
assert('túi zipper đáy đứng → zipper_daydung', chonSetupMayTui(cfgTui, 'dayDung', true, 0.24).key === 'zipper_daydung');
assert('túi cut seal → cut_seal', chonSetupMayTui(cfgTui, 'cutSeal', false, 0.24).key === 'cut_seal');
assert('bước 15cm → 80 cái/phút', chonTocDoMayTui(cfgTui, 0.15).bagsPerMinute === 80);
assert('bước 20cm → 80 cái/phút (đúng ngưỡng)', chonTocDoMayTui(cfgTui, 0.2).bagsPerMinute === 80);
assert('bước 24cm → 70 cái/phút (200–300mm)', chonTocDoMayTui(cfgTui, 0.24).bagsPerMinute === 70);
assert('bước 35cm → 60 cái/phút (300–400mm)', chonTocDoMayTui(cfgTui, 0.35).bagsPerMinute === 60);
assert('bước 48cm → 50 cái/phút (400–550mm)', chonTocDoMayTui(cfgTui, 0.48).bagsPerMinute === 50);
assert('bước 55cm → 50 cái/phút (đúng ngưỡng)', chonTocDoMayTui(cfgTui, 0.55).bagsPerMinute === 50);
assert('bước 60cm → 20 cái/phút (không trần)', chonTocDoMayTui(cfgTui, 0.6).bagsPerMinute === 20);
assert('bước 70cm → 20 cái/phút (không trần)', chonTocDoMayTui(cfgTui, 0.7).bagsPerMinute === 20);

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

// matteExtraMinutes = 0 cố ý → vẫn giữ 0 (không fallback default)
const r14 = chuanHoaCpsxUpgradeThoiGian(
  { print: { matteExtraMinutes: 0 } as never },
  defaults,
);
assert('chuanHoa { print: { matteExtraMinutes: 0 } } → giữ 0', r14.print.matteExtraMinutes === 0);

console.log(`\n  CPSX Thời gian: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
