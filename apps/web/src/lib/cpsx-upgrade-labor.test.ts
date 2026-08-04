/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-labor.test.ts  (cwd: apps/web)
 */
import {
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhut1May1Ca,
  luongMoiPhut1MayTrenNgay,
  luongMoiPhutTuiAp,
  luongMoiPhutTuiTinh,
  luongTbTui,
  phanBoTheoCa,
  soCongNhan,
  soNguoiMoiCa1May,
  tangCaTheoTongLuong,
  tienComMoiMay,
  tienComSangTui,
  tienComToiTui,
  tongLuong,
} from "./cpsx-upgrade-labor";
import type { CpsxUpgradeLabor } from "./types";

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

// ── Helper chung ───────────────────────────────────────────────────
assert("phanBoTheoCa / 6 × 3 = 0.5", phanBoTheoCa(1, 6, 3) === 0.5);
assert("phanBoTheoCa / 0 → 0", phanBoTheoCa(100, 0, 3) === 0);
assert("soCongNhan đếm lương > 0", soCongNhan([1, 0, 2, 0, 3]) === 3);

// ── In/Ghép 2 ca (6 CN) ────────────────────────────────────────────
const in6 = [800000, 550000, 500000, 800000, 550000, 500000];
assert("tongLuong 6 CN = 3.700.000", tongLuong(in6) === 3_700_000);
assert("SL/ca = 6÷2 = 3", soNguoiMoiCa1May(in6, 2) === 3);
assert(
  "Tổng cơm 6 CN = (30k+65k)*6/2 = 285.000",
  tienComMoiMay(30000, 65000, 6) === 285_000,
);
assert(
  "Tăng ca = 3.700.000 × 1.5 ÷ 2 = 2.775.000",
  Math.abs(tangCaTheoTongLuong(in6, 1.5) - 2_775_000) < 0.001,
);
// Tổng: 3.700.000 + 285.000 + 2.775.000 = 6.760.000
// / 24 / 60 = 4.694,44
// / 6 × 3 = 2.347,22
const perMinIn = luongMoiPhut1MayTrenNgay(in6, 2, 30000, 65000, 1.5);
const expectedIn = 6_760_000 / 24 / 60 / 6 * 3;
assert(
  "₫/phút In = (L+C+TC)/24/60 / tongCN × cn1ca ≈ 2.347",
  Math.abs(perMinIn - expectedIn) < 0.01,
);

// ── Chia 1 ca (1 CN) ──────────────────────────────────────────────
const chia = [550000];
assert("tongLuong chia = 550.000", tongLuong(chia) === 550_000);
assert(
  "Tổng cơm chia = (30k+0)*1/2 = 15.000",
  tienComMoiMay(30000, 0, 1) === 15_000,
);
assert(
  "Tăng ca chia = 550.000 × 1.5 ÷ 2 = 412.500",
  Math.abs(tangCaTheoTongLuong(chia, 1.5) - 412_500) < 0.001,
);
// Tổng: 550.000 + 15.000 + 412.500 = 977.500
// / 12 / 60 = 1.357,64
// / 1 × 1 = 1.357,64 (chia đơn giản không phân bổ)
const perMinChia = luongMoiPhut1May1Ca(chia, 30000, 0, 1.5);
const expectedChia = 977_500 / 12 / 60;
assert(
  "₫/phút Chia = (L+C+TC)/12/60 / 1 × 1 ≈ 1.357,64",
  Math.abs(perMinChia - expectedChia) < 0.01,
);

// ── Làm túi (10 CN có lương, 3 CN 1 ca) ───────────────────────────
const tuiW = [1000000, 1000000, 1000000, 400000, 400000, 400000, 400000, 400000, 400000, 500000, 0, 0];
assert("tongLuong túi = 5.900.000", tongLuong(tuiW) === 5_900_000);
assert("Số CN túi (lương > 0) = 10", soCongNhan(tuiW) === 10);
assert(
  "Lương TB / ca (3 người) = 1.966.666,66",
  Math.abs(luongTbTui(tuiW, 3) - 5_900_000 / 3) < 0.01,
);
assert("Tiền cơm ca sáng (45k×10/2) = 225.000", tienComSangTui(45000, 10) === 225000);
assert("Tiền cơm ca tối (97,5k×10/2) = 487.500", tienComToiTui(97500, 10) === 487500);
assert(
  "Tổng cơm = 225.000 + 487.500 = 712.500",
  tienComMoiMay(45000, 97500, 10) === 712_500,
);
assert(
  "Tăng ca túi = 5.900.000 × 1.5 ÷ 2 = 4.425.000",
  Math.abs(tangCaTheoTongLuong(tuiW, 1.5) - 4_425_000) < 0.001,
);
// Tổng: 5.900.000 + 712.500 + 4.425.000 = 11.037.500
// / 24 / 60 = 7.665,97
// / 10 × 3 = 2.299,79
const tinh = luongMoiPhutTuiTinh(tuiW, 3, 45000, 97500, 1.5);
const expectedTui = 11_037_500 / 24 / 60 / 10 * 3;
assert(
  "₫/phút túi = (L+C+TC)/24/60 / tongCN × cn1ca ≈ 2.299,79",
  Math.abs(tinh - expectedTui) < 0.01,
);

assert(
  "roundedPerMin null → dùng giá tính",
  luongMoiPhutTuiAp(tuiW, 3, 45000, 97500, 1.5, null) === tinh,
);
assert(
  "roundedPerMin=3000 → dùng 3000",
  luongMoiPhutTuiAp(tuiW, 3, 45000, 97500, 1.5, 3000) === 3000,
);

// ── Normalize ──────────────────────────────────────────────────────
const def: CpsxUpgradeLabor = {
  print: { wages: in6, mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2 },
  laminate: { wages: [800000, 550000, 800000, 550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2 },
  slit: { wages: [550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 1 },
  bag: { wages: tuiW, mealMorning: 45000, mealEvening: 97500, otFactor: 1.5, peoplePerShift: 3, roundedPerMin: 4500 },
};
const norm = chuanHoaCpsxUpgradeLabor(undefined, def);
assert("normalize thiếu input → dùng default", norm.print.wages.length === 6 && norm.slit.shiftCount === 1);

const normEmpty = chuanHoaCpsxUpgradeLabor(
  { print: { wages: [] as number[] } as never },
  def,
);
assert("normalize wages rỗng → fallback wages", normEmpty.print.wages.length === 6);

const normZero = chuanHoaCpsxUpgradeLabor(
  { slit: { mealMorning: 0, mealEvening: 0 } as never },
  def,
);
assert("normalize meal=0 KHÔNG bị fallback về 65000", normZero.slit.mealMorning === 0 && normZero.slit.mealEvening === 0);
assert("normalize meal=0 không phá máy khác", normZero.print.mealEvening === 65000 && normZero.bag.mealEvening === 97500);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
