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

const r1 = tinhThoiGianMayIn(4080, 4, cfgIn);
assert('IN 4 màu 4080m — tongGio ≈ 1.877', approx(r1.tongGio, 1.8773));
assert('IN 4 màu 4080m — tongPhut ≈ 112.6', approx(r1.tongPhut, 112.64));
assert('IN 4 màu 4080m — setup ≈ 1.333', approx(r1.chiTiet.setup, 1.3333));
assert('IN 4 màu 4080m — chay ≈ 0.544', approx(r1.chiTiet.chay, 0.544));
assert('IN 4 màu 4080m — bonus = 0 (dưới ngưỡng)', r1.chiTiet.bonus === 0);

const r2 = tinhThoiGianMayIn(50000, 4, cfgIn);
assert('IN 50000m — bonus = 50000/40000 = 1.25', approx(r2.chiTiet.bonus, 1.25));
assert('IN 50000m — tongGio ≈ 1.333 + 6.667 + 1.25', approx(r2.tongGio, 9.25));

const r3 = tinhThoiGianMayIn(0, 0, cfgIn);
assert('IN 0 màu 0m — tongGio = 0', r3.tongGio === 0);
assert('IN 0 màu 0m — tongPhut = 0', r3.tongPhut === 0);

const r4 = tinhThoiGianMayIn(4080, 4, { ...cfgIn, tocDoMetPerHour: 0, tocDoNganMetPerHour: 0 });
assert('IN tocDo = 0 → fallback chia 1 (tránh 0/0)', Number.isFinite(r4.chiTiet.chay));

const cfgChayMet: CpsxThoiGianMayChay = { tocDoPerHour: 6000, phutSetup: 15, donVi: 'met' };
const r5 = tinhThoiGianMayChay(4102, cfgChayMet);
assert('GHEP 4102m — setup = 0.25 giờ', approx(r5.chiTiet.setup, 0.25));
assert('GHEP 4102m — chay ≈ 0.6837', approx(r5.chiTiet.chay, 0.6837));
assert('GHEP 4102m — tongGio ≈ 0.9337', approx(r5.tongGio, 0.9337));
assert('GHEP 4102m — tongPhut ≈ 56.02', approx(r5.tongPhut, 56.02));

const cfgChayChiec: CpsxThoiGianMayChay = { tocDoPerHour: 5000, phutSetup: 30, donVi: 'chiec' };
const r6 = tinhThoiGianMayChay(4000, cfgChayChiec);
assert('TÚI 4000 chiếc — setup = 0.5', approx(r6.chiTiet.setup, 0.5));
assert('TÚI 4000 chiếc — chay = 0.8', approx(r6.chiTiet.chay, 0.8));
assert('TÚI 4000 chiếc — tongGio = 1.3', approx(r6.tongGio, 1.3));
assert('TÚI 4000 chiếc — tongPhut = 78', approx(r6.tongPhut, 78));

const r7 = tinhThoiGianMayChay(0, { ...cfgChayMet, tocDoPerHour: 0 });
assert('CHAY tocDo = 0 → chay = 0 (tránh 0/0)', r7.chiTiet.chay === 0);

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
