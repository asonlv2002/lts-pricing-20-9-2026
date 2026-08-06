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
  "Tăng ca (tỉ lệ 100%) = 3.700.000 × 1.5 ÷ 2 = 2.775.000",
  Math.abs(tangCaTheoTongLuong(in6, 1.5) - 2_775_000) < 0.001,
);
assert(
  "Tăng ca (tỉ lệ 50%) = 3.700.000 ÷ 2 × 1.5 × 0.5 = 1.387.500",
  Math.abs(tangCaTheoTongLuong(in6, 1.5, 0.5) - 1_387_500) < 0.001,
);
assert("Tăng ca (tỉ lệ 0%) = 0", tangCaTheoTongLuong(in6, 1.5, 0) === 0);
assert(
  "Tăng ca clamp: tỉ lệ 1.5 → 100%",
  Math.abs(tangCaTheoTongLuong(in6, 1.5, 1.5) - 2_775_000) < 0.001,
);
// Tổng (tỉ lệ 50%): 3.700.000 + 285.000 + 1.387.500 = 5.372.500
// / 24 / 60 = 3.730,90 → làm tròn 3.731 (BỎ bước ÷ tổngCN × CN1ca)
const perMinIn = luongMoiPhutTinh(in6, 24, 30000, 65000, 1.5, undefined, 0.5);
assert("₫/phút In (tỉ lệ 50%) = (L+C+TC) ÷ 24 ÷ 60 = 3.731", perMinIn === 3731);
assert(
  "₫/phút In (tỉ lệ 100%) = 4.694",
  luongMoiPhutTinh(in6, 24, 30000, 65000, 1.5) === 4694,
);

// ── Chia 1 ca (1 CN, 12h/ngày) ─────────────────────────────────────
const chia = [550000];
assert("tongLuong chia = 550.000", tongLuong(chia) === 550_000);
assert(
  "Tổng cơm chia = (30k+0)*1/2 = 15.000",
  tienComMoiMay(30000, 0, 1) === 15_000,
);
assert(
  "Tăng ca chia (tỉ lệ 50%) = 550.000 ÷ 2 × 1.5 × 0.5 = 206.250",
  Math.abs(tangCaTheoTongLuong(chia, 1.5, 0.5) - 206_250) < 0.001,
);
// Tổng (tỉ lệ 50%): 550.000 + 15.000 + 206.250 = 771.250
// / 12 / 60 = 1.071,18 → làm tròn 1.071
const perMinChia = luongMoiPhutTinh(chia, 12, 30000, 0, 1.5, undefined, 0.5);
assert("₫/phút Chia (tỉ lệ 50%) = (L+C+TC) ÷ 12 ÷ 60 = 1.071", perMinChia === 1071);

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
  "Tăng ca túi (tỉ lệ 50%) = 5.900.000 ÷ 2 × 1.5 × 0.5 = 2.212.500",
  Math.abs(tangCaTheoTongLuong(tuiW, 1.5, 0.5) - 2_212_500) < 0.001,
);
// Tổng (tỉ lệ 50%): 5.900.000 + 712.500 + 2.212.500 = 8.825.000
// / 24 / 60 = 6.128,47 → làm tròn 6.128 (BỎ bước ÷ tổngCN × CN1ca)
const tinh = luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5, soCongNhan(tuiW), 0.5);
assert("₫/phút túi (tỉ lệ 50%) = (L+C+TC) ÷ 24 ÷ 60 = 6.128", tinh === 6128);

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
// Tỉ lệ 50%: TC = 5.900.000 ÷ 2 × 1.5 × 0.5 = 2.212.500
// Không truyền soCN → đếm cả dòng lương 0: cơm = (45k+97,5k)×12/2 = 855.000
// tong = 5.900.000 + 855.000 + 2.212.500 = 8.967.500 → /24/60 = 6.227,43 → 6.227
assert(
  "soCN mặc định = wages.length → 6.227",
  luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5, undefined, 0.5) === 6227,
);
// Truyền soCN = 10 (lương > 0) → 6.128 (như trên)
assert(
  "soCN = 10 → 6.128",
  luongMoiPhutTinh(tuiW, 24, 45000, 97500, 1.5, 10, 0.5) === 6128,
);

// ── Normalize ──────────────────────────────────────────────────────
const def: CpsxUpgradeLabor = {
  print: { wages: in6, mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, hoursPerDay: 24, tyLeTangCa: 0.5 },
  laminate: { wages: [800000, 550000, 800000, 550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, hoursPerDay: 24, tyLeTangCa: 0.5 },
  slit: { wages: [550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 1, hoursPerDay: 12, tyLeTangCa: 0.5 },
  bag: { wages: tuiW, mealMorning: 45000, mealEvening: 97500, otFactor: 1.5, peoplePerShift: 3, roundedPerMin: null, hoursPerDay: 24, tyLeTangCa: 0.5 },
};
const norm = chuanHoaCpsxUpgradeLabor(undefined, def);
assert("normalize thiếu input → dùng default", norm.print.wages.length === 6 && norm.slit.shiftCount === 1);
assert("hoursPerDay default: in 24, chia 12, túi 24", norm.print.hoursPerDay === 24 && norm.slit.hoursPerDay === 12 && norm.bag.hoursPerDay === 24);
assert("tyLeTangCa default = 0.5 cả 4 máy", norm.print.tyLeTangCa === 0.5 && norm.laminate.tyLeTangCa === 0.5 && norm.slit.tyLeTangCa === 0.5 && norm.bag.tyLeTangCa === 0.5);
assert("túi roundedPerMin null → null", norm.bag.roundedPerMin === null);

// Data cũ (thiếu hoursPerDay + tyLeTangCa) → fallback theo máy
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
assert("data cũ thiếu tyLeTangCa → 0.5", normOld.print.tyLeTangCa === 0.5 && normOld.slit.tyLeTangCa === 0.5 && normOld.bag.tyLeTangCa === 0.5);
assert("data cũ túi rounded 4500 → giữ 4500", normOld.bag.roundedPerMin === 4500);

// hoursPerDay sửa được → giữ giá trị user nhập
const normHours = chuanHoaCpsxUpgradeLabor(
  { print: { hoursPerDay: 20 } as never },
  def,
);
assert("hoursPerDay 20 → giữ 20", normHours.print.hoursPerDay === 20);

// tyLeTangCa user nhập → giữ giá trị; ngoài 0-1 → fallback
const normTyLe = chuanHoaCpsxUpgradeLabor(
  { bag: { tyLeTangCa: 0.3 } as never },
  def,
);
assert("tyLeTangCa 0.3 → giữ 0.3", normTyLe.bag.tyLeTangCa === 0.3);
const normTyLeXau = chuanHoaCpsxUpgradeLabor(
  { print: { tyLeTangCa: 1.7 } as never },
  def,
);
assert("tyLeTangCa 1.7 → fallback 0.5", normTyLeXau.print.tyLeTangCa === 0.5);

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
