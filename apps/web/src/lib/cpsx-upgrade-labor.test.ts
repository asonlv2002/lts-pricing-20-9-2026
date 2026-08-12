/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-labor.test.ts  (cwd: apps/web)
 */
import {
  boDau,
  chenDonVi,
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongMoiPhutTuiAp,
  luongTbTui,
  phanBoTheoCa,
  soCongNhan,
  soNguoiMoiCa1May,
  tangCaTheoTongLuong,
  tienComMoiMay,
  tienComSangTui,
  tienComToiTui,
  tinhBieuThuc,
  tokenHoaBieuThuc,
  tongLuong,
  xoaDonViTai,
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
// Công thức mới: (L ÷ 8 × n) × hệ số × tỉ lệ — n=4 cho kết quả cũ
assert(
  "Tăng ca n=4 = cũ: 3.700.000 ÷ 8 × 4 × 1.5 × 0.5 = 1.387.500",
  Math.abs(tangCaTheoTongLuong(in6, 1.5, 0.5, 4) - 1_387_500) < 0.001,
);
assert(
  "Tăng ca n=6 = 3.700.000 ÷ 8 × 6 × 1.5 × 0.5 = 2.081.250",
  Math.abs(tangCaTheoTongLuong(in6, 1.5, 0.5, 6) - 2_081_250) < 0.001,
);
assert("Tăng ca n=0 → 0", tangCaTheoTongLuong(in6, 1.5, 0.5, 0) === 0);
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

// ── Lương túi / máy (chia số máy hoạt động / ngày) ────────────────
assert(
  "tuiAp máy=1 → giá 1 máy (không đổi)",
  luongMoiPhutTuiAp(tinh, null, 1) === tinh,
);
assert(
  "tuiAp máy=2 → tinh ÷ 2 (làm tròn)",
  luongMoiPhutTuiAp(6128, null, 2) === 3064,
);
assert(
  "tuiAp máy=3 → tinh ÷ 3 (làm tròn)",
  luongMoiPhutTuiAp(10000, null, 3) === 3333,
);
assert(
  "tuiAp rounded 1000, máy 2 → 500",
  luongMoiPhutTuiAp(tinh, 1000, 2) === 500,
);
assert(
  "tuiAp máy 0 → coi như 1",
  luongMoiPhutTuiAp(tinh, 1000, 0) === 1000,
);
assert(
  "tuiAp máy âm → coi như 1",
  luongMoiPhutTuiAp(tinh, null, -2) === tinh,
);

// ── hoursPerDay là tham số đổi được ────────────────────────────────
// In chạy 20h/ngày: 6.760.000 ÷ 20 ÷ 60 = 5.633,33 → 5.633
assert("In 20h/ngày → 5.633 ₫/phút", luongMoiPhutTinh(in6, 20, 30000, 65000, 1.5) === 5633);
// In chạy 12h/ngày: 6.760.000 ÷ 12 ÷ 60 = 9.388,89 → 9.389
assert("In 12h/ngày → 9.389 ₫/phút", luongMoiPhutTinh(in6, 12, 30000, 65000, 1.5) === 9389);
// hoursPerDay <= 0 → fallback 24
assert("hoursPerDay 0 → fallback 24h", luongMoiPhutTinh(in6, 0, 30000, 65000, 1.5) === 4694);

// ── otHours là tham số đổi được ────────────────────────────────────
// n=6: TC = 2.081.250; tổng = 3.700.000 + 285.000 + 2.081.250 = 6.066.250
// / 24 / 60 = 4.212,67 → 4.213
assert(
  "₫/phút In n=6 = 4.213",
  luongMoiPhutTinh(in6, 24, 30000, 65000, 1.5, undefined, 0.5, 6) === 4213,
);
// n=8 (tỉ lệ 100%): TC = 3.700.000 ÷ 8 × 8 × 1.5 = 5.550.000
// tổng = 3.700.000 + 285.000 + 5.550.000 = 9.535.000 → /24/60 = 6.621,5 → 6.622
assert(
  "₫/phút In n=8 (tỉ lệ 100%) = 6.622",
  luongMoiPhutTinh(in6, 24, 30000, 65000, 1.5, undefined, 1, 8) === 6622,
);

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

// ── Máy tính tham khảo (tinhBieuThuc) ──────────────────────────────
assert("tokenHoaBieuThuc '2+3×4' hợp lệ", tokenHoaBieuThuc("2+3×4") !== null);
assert("tokenHoaBieuThuc ký tự lạ → null", tokenHoaBieuThuc("2+a") === null);
assert("2+3×4 = 14", tinhBieuThuc("2+3×4") === 14);
assert("(10+2)÷3 = 4", tinhBieuThuc("(10+2)÷3") === 4);
assert("50% = 0.5", tinhBieuThuc("50%") === 0.5);
assert("200×50% = 100", tinhBieuThuc("200×50%") === 100);
assert("10−4+1 = 7", tinhBieuThuc("10−4+1") === 7);
assert("3×4÷2 = 6", tinhBieuThuc("3×4÷2") === 6);
assert("chia 0 → null", tinhBieuThuc("1÷0") === null);
assert("sai cú pháp → null", tinhBieuThuc("(2+3") === null);
assert("chuỗi rỗng → 0", tinhBieuThuc("") === 0);
const soHangTest = {
  tongluong: 3_700_000,
  comcasang: 90_000,
  comcatoi: 195_000,
  tangca: 1_387_500,
};
assert(
  "tongluong ÷ 8 × 4 = 1.850.000",
  tinhBieuThuc("tongluong ÷ 8 × 4", soHangTest) === 1_850_000,
);
assert(
  "tongluong × 0.5 + comcasang = 1.940.000",
  tinhBieuThuc("tongluong × 0.5 + comcasang", soHangTest) === 1_940_000,
);
assert(
  "tangca + comcasang + comcatoi = 1.672.500",
  tinhBieuThuc("tangca + comcasang + comcatoi", soHangTest) === 1_672_500,
);
assert("tên số hạng lạ → null", tinhBieuThuc("abc123", soHangTest) === null);
assert("khoảng trắng không ảnh hưởng", tinhBieuThuc(" 2 + 3 × 4 ") === 14);

// ── Tên số hạng tiếng Việt có dấu / hoa / cách ─────────────────────
assert(
  "boDau 'Cơm Ca Sáng' → 'comcasang'",
  boDau("Cơm Ca Sáng") === "comcasang",
);
assert("boDau 'Tăng Ca Đêm' → 'tangcadem'", boDau("Tăng Ca Đêm") === "tangcadem");
assert(
  "tổng lương + cơm ca sáng = 3.790.000",
  tinhBieuThuc("tổng lương + cơm ca sáng", soHangTest) === 3_790_000,
);
assert(
  "Tăng Ca × 2 (hoa + dấu) = 2.775.000",
  tinhBieuThuc("Tăng Ca × 2", soHangTest) === 2_775_000,
);
assert(
  "2 × tổng lương = 7.400.000",
  tinhBieuThuc("2 × tổng lương", soHangTest) === 7_400_000,
);
assert(
  "(tổng lương + cơm ca sáng + cơm ca tối + tăng ca) = 5.372.500",
  tinhBieuThuc("tổng lương + cơm ca sáng + cơm ca tối + tăng ca", soHangTest)
    === 5_372_500,
);

// ── Tên số hạng có dấu "/" (SL người / ca, Số giờ máy / ngày, …) ──
const soHangSlash = {
  tongluong: 3_700_000,
  soca: 2,
  slnguoica: 3,
  sogiomayngay: 16,
  somayhoatdongngay: 2,
  sogiotangca: 4,
  hesotangca: 1.5,
  tiletangca: 0.5,
  socongnhan: 6,
};
assert(
  "boDau 'SL người / ca' → 'slnguoica'",
  boDau("SL người / ca") === "slnguoica",
);
assert(
  "boDau 'Số giờ máy / ngày' → 'sogiomayngay'",
  boDau("Số giờ máy / ngày") === "sogiomayngay",
);
assert(
  "Số ca × SL người / ca = 6",
  tinhBieuThuc("Số ca × SL người / ca", soHangSlash) === 6,
);
assert(
  "Số giờ máy / ngày ÷ 24 giờ = 0,666…",
  tinhBieuThuc("Số giờ máy / ngày ÷ 24", soHangSlash) === 2 / 3,
);
assert(
  "Số máy hoạt động / ngày × Số ca = 4",
  tinhBieuThuc("Số máy hoạt động / ngày × Số ca", soHangSlash) === 4,
);
assert(
  "Số giờ tăng ca × Hệ số tăng ca × Tỉ lệ tăng ca = 3",
  tinhBieuThuc(
    "Số giờ tăng ca × Hệ số tăng ca × Tỉ lệ tăng ca",
    soHangSlash,
  ) === 3,
);
assert(
  "Số công nhân ÷ Số ca = 3",
  tinhBieuThuc("Số công nhân ÷ Số ca", soHangSlash) === 3,
);

// ── Thao tác token box (1 bấm = 1 cái, con trỏ theo khe) ──────────
const donViTest = ["Số ca", "×", "SL người / ca"];
assert(
  "chenDonVi cuối (cursor 3) → thêm đuôi",
  chenDonVi(donViTest, 3, "60").mang.join("") === "Số ca×SL người / ca60",
);
assert(
  "chenDonVi cuối → cursorMoi = 4",
  chenDonVi(donViTest, 3, "60").cursorMoi === 4,
);
assert(
  "chenDonVi đầu (cursor 0) → thêm đầu",
  chenDonVi(donViTest, 0, "24").mang[0] === "24",
);
assert(
  "chenDonVi giữa (cursor 1) → chèn sau 'Số ca'",
  chenDonVi(donViTest, 1, "+").mang.join("") === "Số ca+×SL người / ca",
);
assert(
  "chenDonVi giữa → cursorMoi = 2",
  chenDonVi(donViTest, 1, "+").cursorMoi === 2,
);
assert(
  "chenDonVi cursor quá lớn → clamp về cuối",
  chenDonVi(donViTest, 99, "24").cursorMoi === 4,
);
assert(
  "xoaDonViTai giữa (1) → bỏ '×'",
  xoaDonViTai(donViTest, 1).mang.join("") === "Số caSL người / ca",
);
assert(
  "xoaDonViTai giữa → cursorMoi = 1",
  xoaDonViTai(donViTest, 1).cursorMoi === 1,
);
assert(
  "xoaDonViTai đầu (0) → cursorMoi = 0",
  xoaDonViTai(donViTest, 0).cursorMoi === 0,
);
assert(
  "xoaDonViTai cuối (2) → cursorMoi = 2",
  xoaDonViTai(donViTest, 2).cursorMoi === 2,
);
assert(
  "xoaDonViTai chỉ số quá lớn → xóa cuối, cursor clamp",
  xoaDonViTai(donViTest, 99).cursorMoi === 2,
);
assert(
  "xóa rồi chèn liên tiếp đúng thứ tự",
  chenDonVi(xoaDonViTai(donViTest, 1).mang, 1, "÷").mang.join("") ===
    "Số ca÷SL người / ca",
);

// ── Normalize ──────────────────────────────────────────────────────
const def: CpsxUpgradeLabor = {
  print: { wages: in6, mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5 },
  laminate: { wages: [800000, 550000, 800000, 550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5 },
  slit: { wages: [550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 1, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 12, otHours: 4, tyLeTangCa: 0.5 },
  bag: { wages: tuiW, mealMorning: 45000, mealEvening: 97500, otFactor: 1.5, peoplePerShift: 3, roundedPerMin: null, hoursPerDay: 24, machinesPerDay: 3, otHours: 4, tyLeTangCa: 0.5 },
};
const norm = chuanHoaCpsxUpgradeLabor(undefined, def);
assert("normalize thiếu input → dùng default", norm.print.wages.length === 6 && norm.slit.shiftCount === 1);
assert("hoursPerDay default: in 24, chia 12, túi 24", norm.print.hoursPerDay === 24 && norm.slit.hoursPerDay === 12 && norm.bag.hoursPerDay === 24);
assert("tyLeTangCa default = 0.5 cả 4 máy", norm.print.tyLeTangCa === 0.5 && norm.laminate.tyLeTangCa === 0.5 && norm.slit.tyLeTangCa === 0.5 && norm.bag.tyLeTangCa === 0.5);
assert("otHours default = 4 cả 4 máy", norm.print.otHours === 4 && norm.laminate.otHours === 4 && norm.slit.otHours === 4 && norm.bag.otHours === 4);
assert("peoplePerShift default = null (tự tính)", norm.print.peoplePerShift === null && norm.slit.peoplePerShift === null);
assert("túi roundedPerMin null → null", norm.bag.roundedPerMin === null);
assert("túi machinesPerDay default = 3", norm.bag.machinesPerDay === 3);

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
assert("data cũ thiếu otHours → 4", normOld.print.otHours === 4 && normOld.bag.otHours === 4);
assert("data cũ thiếu peoplePerShift → null (tự tính)", normOld.print.peoplePerShift === null);
assert("data cũ túi rounded 4500 → giữ 4500", normOld.bag.roundedPerMin === 4500);
assert("data cũ túi thiếu machinesPerDay → 3", normOld.bag.machinesPerDay === 3);
assert("data cũ túi machinesPerDay=1 → migrate 3", chuanHoaCpsxUpgradeLabor(
  { bag: { machinesPerDay: 1 } as never }, def,
).bag.machinesPerDay === 3);
assert("túi machinesPerDay 2 → giữ 2", chuanHoaCpsxUpgradeLabor(
  { bag: { machinesPerDay: 2 } as never }, def,
).bag.machinesPerDay === 2);

// hoursPerDay sửa được → giữ giá trị user nhập
const normHours = chuanHoaCpsxUpgradeLabor(
  { print: { hoursPerDay: 20 } as never },
  def,
);
assert("hoursPerDay 20 → giữ 20", normHours.print.hoursPerDay === 20);

// otHours sửa được → giữ giá trị; <= 0 → fallback
const normOt = chuanHoaCpsxUpgradeLabor(
  { print: { otHours: 6 } as never },
  def,
);
assert("otHours 6 → giữ 6", normOt.print.otHours === 6);
const normOtXau = chuanHoaCpsxUpgradeLabor(
  { print: { otHours: -1 } as never },
  def,
);
assert("otHours -1 → fallback 4", normOtXau.print.otHours === 4);

// peoplePerShift nhập → giữ; null → tự tính
const normNguoi = chuanHoaCpsxUpgradeLabor(
  { print: { peoplePerShift: 2 } as never },
  def,
);
assert("peoplePerShift 2 → giữ 2", normNguoi.print.peoplePerShift === 2);
const normNguoiNull = chuanHoaCpsxUpgradeLabor(
  { print: { peoplePerShift: null } as never },
  def,
);
assert("peoplePerShift null → null (tự tính)", normNguoiNull.print.peoplePerShift === null);

// machinesPerDay: data cũ thiếu → 1; user nhập → giữ
assert(
  "machinesPerDay default = 1",
  norm.print.machinesPerDay === 1 && norm.slit.machinesPerDay === 1,
);
const normMay = chuanHoaCpsxUpgradeLabor(
  { print: { machinesPerDay: 3 } as never },
  def,
);
assert("machinesPerDay 3 → giữ 3", normMay.print.machinesPerDay === 3);

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
