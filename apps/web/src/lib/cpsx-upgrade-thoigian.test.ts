/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-thoigian.test.ts  (cwd: apps/web)
 */
import {
  tinhThoiGianMayIn,
  tinhThoiGianMayChay,
  chuanHoaCpsxUpgradeThoiGian,
} from './cpsx-upgrade-thoigian';
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayChay,
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
  tocDoMetPerHour: 7500,
  phutSetupMoiMau: 20,
  mauSoGioSetup: 60,
  nguongMet: 40000,
  tocDoNganMetPerHour: 7500,
};

// IN 4080m · 4 màu — quy toàn bộ ra phút
// setup = 4 × 20 × 60 ÷ 60 = 80 phút; chay = 4080/7500 × 60 = 32,64 phút
const r1 = tinhThoiGianMayIn(4080, 4, cfgIn);
assert('IN 4 màu 4080m — tongPhut ≈ 112.64', approx(r1.tongPhut, 112.64));
assert('IN 4 màu 4080m — setupPhut = 80', approx(r1.chiTiet.setupPhut, 80));
assert('IN 4 màu 4080m — chayPhut ≈ 32.64', approx(r1.chiTiet.chayPhut, 32.64));
assert('IN 4 màu 4080m — bonusPhut = 0 (dưới ngưỡng)', r1.chiTiet.bonusPhut === 0);

// IN 50000m · 4 màu — có bonus: 50000/40000 × 60 = 75 phút; chay = 50000/7500 × 60 = 400
const r2 = tinhThoiGianMayIn(50000, 4, cfgIn);
assert('IN 50000m — bonusPhut = 75', approx(r2.chiTiet.bonusPhut, 75));
assert('IN 50000m — chayPhut = 400', approx(r2.chiTiet.chayPhut, 400));
assert('IN 50000m — tongPhut = 80 + 400 + 75 = 555', approx(r2.tongPhut, 555));

const r3 = tinhThoiGianMayIn(0, 0, cfgIn);
assert('IN 0 màu 0m — tongPhut = 0', r3.tongPhut === 0);

const r4 = tinhThoiGianMayIn(4080, 4, { ...cfgIn, tocDoMetPerHour: 0, tocDoNganMetPerHour: 0 });
assert('IN tocDo = 0 → fallback chia 1 (tránh 0/0)', Number.isFinite(r4.chiTiet.chayPhut));

const cfgChayMet: CpsxThoiGianMayChay = { tocDoPerHour: 6000, phutSetup: 15, donVi: 'met' };
// GHEP 4102m — setup = 15 phút; chay = 4102/6000 × 60 = 41,02 phút
const r5 = tinhThoiGianMayChay(4102, cfgChayMet);
assert('GHEP 4102m — setupPhut = 15', approx(r5.chiTiet.setupPhut, 15));
assert('GHEP 4102m — chayPhut ≈ 41.02', approx(r5.chiTiet.chayPhut, 41.02));
assert('GHEP 4102m — tongPhut ≈ 56.02', approx(r5.tongPhut, 56.02));

const cfgChayChiec: CpsxThoiGianMayChay = { tocDoPerHour: 5000, phutSetup: 30, donVi: 'chiec' };
// TÚI 4000 chiếc — setup = 30 phút; chay = 4000/5000 × 60 = 48 phút
const r6 = tinhThoiGianMayChay(4000, cfgChayChiec);
assert('TÚI 4000 chiếc — setupPhut = 30', approx(r6.chiTiet.setupPhut, 30));
assert('TÚI 4000 chiếc — chayPhut = 48', approx(r6.chiTiet.chayPhut, 48));
assert('TÚI 4000 chiếc — tongPhut = 78', approx(r6.tongPhut, 78));

const r7 = tinhThoiGianMayChay(0, { ...cfgChayMet, tocDoPerHour: 0 });
assert('CHAY tocDo = 0 → chayPhut = 0 (tránh 0/0)', r7.chiTiet.chayPhut === 0);
assert('CHAY tocDo = 0 → setupPhut vẫn 15', r7.chiTiet.setupPhut === 15);

const defaults: CpsxUpgradeThoiGian = {
  print: cfgIn,
  laminate: cfgChayMet,
  slit: { tocDoPerHour: 8000, phutSetup: 10, donVi: 'met' },
  bag: cfgChayChiec,
};

const r8 = chuanHoaCpsxUpgradeThoiGian(undefined, defaults);
assert('chuanHoa undefined → dùng defaults', r8.print.tocDoMetPerHour === 7500);
assert('chuanHoa undefined → bag.donVi = chiec', r8.bag.donVi === 'chiec');

const r9 = chuanHoaCpsxUpgradeThoiGian(
  { print: { tocDoMetPerHour: 9000 } as never },
  defaults,
);
assert('chuanHoa partial print → override tocDo', r9.print.tocDoMetPerHour === 9000);
assert('chuanHoa partial print → giữ nguyên phutSetupMoiMau', r9.print.phutSetupMoiMau === 20);
assert('chuanHoa partial print → giữ nguyên máy khác', r9.laminate.tocDoPerHour === 6000);

const r10 = chuanHoaCpsxUpgradeThoiGian({}, defaults);
assert('chuanHoa {} → bằng defaults', r10.print.tocDoMetPerHour === 7500 && r10.bag.donVi === 'chiec');

console.log(`\n  CPSX Thời gian: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
