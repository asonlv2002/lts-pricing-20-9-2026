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
  soNguoiMoiCa1May,
  tangCa1May,
  tienComSangTui,
  tienComTBTui,
  tienComToiTui,
  tongCom1May,
  tongComTui,
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

// ── In/Ghép 2 ca ──────────────────────────────────────────────────
const in6 = [800000, 550000, 500000, 800000, 550000, 500000];
assert("tongLuong 6 CN = 3.700.000", tongLuong(in6) === 3_700_000);
assert("SL/ca = 6÷2 = 3", soNguoiMoiCa1May(in6, 2) === 3);
assert("Tổng cơm 6 CN = (30k+65k)*6 = 570k", tongCom1May(30000, 65000, in6, 2) === 570000);
assert(
  "Tăng ca = 3.700.000/2 ×1.5 = 2.775.000",
  Math.abs(tangCa1May(in6, 2, 1.5) - 2_775_000) < 0.001,
);
const perMinIn = luongMoiPhut1MayTrenNgay(in6, 2, 30000, 65000, 1.5);
// 3.700.000 + 570.000 + 2.775.000 = 7.045.000 / 24 / 60 ≈ 4892.36
assert(
  "₫/phút In = (L+C+TC)/24/60 ≈ 4.892",
  Math.abs(perMinIn - 7_045_000 / 24 / 60) < 0.01,
);

// ── Chia 1 ca ─────────────────────────────────────────────────────
const chia = [550000];
assert("Chia 1 ca / 12 / 60", luongMoiPhut1May1Ca(chia, 30000, 65000) === (550000 + 30000 + 65000) / 12 / 60);

// ── Làm túi ────────────────────────────────────────────────────────
const tuiW = [1000000, 1000000, 1000000, 400000, 400000, 400000, 400000, 400000, 400000, 500000, 0, 0];
assert("tongLuong túi = 5.900.000", tongLuong(tuiW) === 5_900_000);
assert(
  "Lương TB / ca (3 người) = 1.966.666,66",
  Math.abs(luongTbTui(tuiW, 3) - 5_900_000 / 3) < 0.01,
);
assert("Tổng cơm 1 ca (3 người) = (45k+97,5k)*3 = 427.500", tongComTui(45000, 97500, 3) === 427500);
// 6 CN có lương (mặc định sheet: 3×1tr + 6×400k + 1×500k + 2×0)
const soCN = tuiW.filter((w) => w > 0).length;
assert("Số CN túi (sheet) = 10", soCN === 10);
assert("Tiền cơm ca sáng (45k×10/2) = 225.000", tienComSangTui(45000, soCN) === 225000);
assert("Tiền cơm ca tối (97,5k×10/2) = 487.500", tienComToiTui(97500, soCN) === 487500);
assert(
  "Tiền cơm TB = (225.000 + 487.500) / 10 = 71.250",
  Math.abs(tienComTBTui(225000, 487500, soCN) - 71250) < 0.01,
);
const tinh = luongMoiPhutTuiTinh(tuiW, 3, 45000, 97500, 1.5);
const expected = (5_900_000 / 3 + 427_500 + (5_900_000 / 3) * 1.5) / 720;
assert("₫/phút túi = 4.394,10 (gần)", Math.abs(tinh - expected) < 0.01);

assert(
  "roundedPerMin null → dùng giá tính",
  luongMoiPhutTuiAp(tuiW, 3, 45000, 97500, 1.5, null) === tinh,
);
assert(
  "roundedPerMin=4500 → dùng 4500",
  luongMoiPhutTuiAp(tuiW, 3, 45000, 97500, 1.5, 4500) === 4500,
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
