/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-labor.test.ts  (cwd: apps/web)
 */
import {
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhutAp,
  luongMoiPhutTinh,
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

// ── Helper chung (giữ nguyên) ──────────────────────────────────────
assert("phanBoTheoCa / 6 × 3 = 0.5", phanBoTheoCa(1, 6, 3) === 0.5);
assert("phanBoTheoCa / 0 → 0", phanBoTheoCa(100, 0, 3) === 0);
assert("soCongNhan đếm lương > 0", soCongNhan([1, 0, 2, 0, 3]) === 3);

// ── In 2 ca (6 CN, 24h/ngày) ───────────────────────────────────────
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
// / 24 / 60 = 4.694,44 → làm tròn 4.694 (BỎ bước ÷ tổngCN × CN1ca)
const perMinIn = luongMoiPhutTinh(in6, 24, 30000, 65000, 1.5);
assert("₫/phút In = (L+C+TC) ÷ 24 ÷ 60 = 4.694", perMinIn === 4694);

// ── Chia 1 ca (1 CN, 12h/ngày) ─────────────────────────────────────
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
// / 12 / 60 = 1.357,64 → làm tròn 1.358
const perMinChia = luongMoiPhutTinh(chia, 12, 30000, 0, 1.5);
assert("₫/phút Chia = (L+C+TC) ÷ 12 ÷ 60 = 1.358", perMinChia === 1358);

// ── Làm túi (10 CN có lương, 24h/ngày) ─────────────────────────────
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
// / 24 / 60 = 7.664,93 → làm tròn 7.665 (BỎ bước ÷ tổngCN × CN1ca)
const tinh = luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5, soCongNhan(tuiW));
assert("₫/phút túi = (L+C+TC) ÷ 24 ÷ 60 = 7.665", tinh === 7665);

assert(
  "roundedPerMin null → dùng giá tính",
  luongMoiPhutAp(tinh, null) === tinh,
);
assert(
  "roundedPerMin=3000 → dùng 3000",
  luongMoiPhutAp(tinh, 3000) === 3000,
);
assert(
  "roundedPerMin=0 → dùng giá tính",
  luongMoiPhutAp(tinh, 0) === tinh,
);

// ── hoursPerDay là tham số đổi được ────────────────────────────────
// In chạy 20h/ngày: 6.760.000 ÷ 20 ÷ 60 = 5.633,33 → 5.633
assert("In 20h/ngày → 5.633 ₫/phút", luongMoiPhutTinh(in6, 20, 30000, 65000, 1.5) === 5633);
// In chạy 12h/ngày: 6.760.000 ÷ 12 ÷ 60 = 9.388,89 → 9.389
assert("In 12h/ngày → 9.389 ₫/phút", luongMoiPhutTinh(in6, 12, 30000, 65000, 1.5) === 9389);
// hoursPerDay <= 0 → fallback 24
assert("hoursPerDay 0 → fallback 24h", luongMoiPhutTinh(in6, 0, 30000, 65000, 1.5) === 4694);

// ── soCN tùy chọn (túi truyền số CN có lương) ──────────────────────
// Không truyền soCN → đếm cả dòng lương 0: cơm = (45k+97,5k)×12/2 = 855.000
// tong = 5.900.000 + 855.000 + 4.425.000 = 11.180.000 → /24/60 = 7.763,89 → 7.764
assert(
  "soCN mặc định = wages.length → 7.764",
  luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5) === 7764,
);
// Truyền soCN = 10 (lương > 0) → 7.665 (như trên)
assert(
  "soCN = 10 → 7.665",
  luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5, 10) === 7665,
);

// ── Normalize ──────────────────────────────────────────────────────
const def: CpsxUpgradeLabor = {
  print: { wages: in6, mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, hoursPerDay: 24 },
  laminate: { wages: [800000, 550000, 800000, 550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, hoursPerDay: 24 },
  slit: { wages: [550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 1, hoursPerDay: 12 },
  bag: { wages: tuiW, mealMorning: 45000, mealEvening: 97500, otFactor: 1.5, peoplePerShift: 3, roundedPerMin: null, hoursPerDay: 24 },
};
const norm = chuanHoaCpsxUpgradeLabor(undefined, def);
assert("normalize thiếu input → dùng default", norm.print.wages.length === 6 && norm.slit.shiftCount === 1);
assert("hoursPerDay default: in 24, chia 12, túi 24", norm.print.hoursPerDay === 24 && norm.slit.hoursPerDay === 12 && norm.bag.hoursPerDay === 24);
assert("túi roundedPerMin null → null", norm.bag.roundedPerMin === null);

// Data cũ (thiếu hoursPerDay) → fallback theo máy
const normOld = chuanHoaCpsxUpgradeLabor(
  {
    print: { wages: [100000], mealMorning: 0, mealEvening: 0, otFactor: 1, shiftCount: 1 },
    slit: { wages: [200000], mealMorning: 0, mealEvening: 0, otFactor: 1, shiftCount: 1 },
    bag: { wages: [300000], mealMorning: 0, mealEvening: 0, otFactor: 1, peoplePerShift: 1, roundedPerMin: 4500 },
  } as never,
  def,
);
assert("data cũ in thiếu hoursPerDay → 24", normOld.print.hoursPerDay === 24);
assert("data cũ chia thiếu hoursPerDay → 12", normOld.slit.hoursPerDay === 12);
assert("data cũ túi thiếu hoursPerDay → 24", normOld.bag.hoursPerDay === 24);
assert("data cũ túi rounded 4500 → giữ 4500", normOld.bag.roundedPerMin === 4500);

// hoursPerDay sửa được → giữ giá trị user nhập
const normHours = chuanHoaCpsxUpgradeLabor(
  { print: { hoursPerDay: 20 } as never },
  def,
);
assert("hoursPerDay 20 → giữ 20", normHours.print.hoursPerDay === 20);

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
