/**
 * Run: pnpm exec tsx src/lib/cpsx-upgrade-labor.test.ts  (cwd: apps/web)
 */
import {
  bieuThucTuDonVi,
  boDau,
  capNhatDonViSo,
  chenDonVi,
  chuanHoaCpsxUpgradeLabor,
  chuanHoaMayTinh,
  donViChuoi,
  donViSo,
  gopSoHang,
  taoMayTinhWorkspaceMacDinh,
  hopLeTenCongThuc,
  hopLeTenThamSo,
  keyThamSo,
  laSoHopLe,
  locNhapSoThuc,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongMoiPhutTuiAp,
  luongTbTui,
  parseGiaTriThamSo,
  phanBoTheoCa,
  soCongNhan,
  soNguoiMoiCa1May,
  tangCaTheoTongLuong,
  tienComMoiMay,
  tienComSangTui,
  tienComToiTui,
  tinhBieuThuc,
  tinhDonVi,
  tinhDsCongThuc,
  tokenHoaBieuThuc,
  tongLuong,
  donViSoHang,
  hangSoTuDonVi,
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

// ── Ô số thực (DonViCalc) ──────────────────────────────────────────
assert("laSoHopLe '0' → true", laSoHopLe("0") === true);
assert("laSoHopLe '1.5' → true", laSoHopLe("1.5") === true);
assert("laSoHopLe '' → false", laSoHopLe("") === false);
assert("laSoHopLe '12.' → false", laSoHopLe("12.") === false);
assert("laSoHopLe '.5' → false", laSoHopLe(".5") === false);
assert("laSoHopLe '-1' → false", laSoHopLe("-1") === false);
assert("laSoHopLe '1.2.3' → false", laSoHopLe("1.2.3") === false);
assert("locNhapSoThuc '12a.3b.4' → '12.34'", locNhapSoThuc("12a.3b.4") === "12.34");
assert("locNhapSoThuc '12.' → '12.'", locNhapSoThuc("12.") === "12.");

const donViSoTest = [
  donViChuoi("Tổng lương"),
  donViChuoi("÷"),
  donViSo("8"),
];
assert(
  "bieuThucTuDonVi Tổng lương÷8",
  bieuThucTuDonVi(donViSoTest) === "Tổng lương÷8",
);
assert(
  "bieuThucTuDonVi ô rỗng → null",
  bieuThucTuDonVi([donViChuoi("2"), donViChuoi("×"), donViSo("")]) === null,
);
assert(
  "bieuThucTuDonVi '12.' → null",
  bieuThucTuDonVi([donViSo("12.")]) === null,
);
assert(
  "tinhBieuThuc qua bieuThucTuDonVi 2×1.5 = 3",
  tinhBieuThuc(
    bieuThucTuDonVi([donViChuoi("2"), donViChuoi("×"), donViSo("1.5")])!,
  ) === 3,
);
assert(
  "chenDonVi donViSo tại cuối",
  chenDonVi([donViChuoi("2"), donViChuoi("×")], 2, donViSo("")).mang.length ===
    3,
);
assert(
  "capNhatDonViSo index 2 → '1.5'",
  (() => {
    const m = capNhatDonViSo(
      [donViChuoi("2"), donViChuoi("×"), donViSo("")],
      2,
      "1.5",
    );
    return m[2].loai === "so" && m[2].giaTri === "1.5";
  })(),
);
assert(
  "capNhatDonViSo lọc ký tự lạ",
  (() => {
    const m = capNhatDonViSo([donViSo("")], 0, "3a.1b");
    return m[0].loai === "so" && m[0].giaTri === "3.1";
  })(),
);
assert(
  "xoaDonViTai ô số giữa",
  bieuThucTuDonVi(
    xoaDonViTai(
      [donViChuoi("2"), donViSo("9"), donViChuoi("×"), donViSo("3")],
      1,
    ).mang,
  ) === "2×3",
);

// ── Tham số tùy chỉnh ──────────────────────────────────────────────
const builtInTs = { tongluong: 100, comcasang: 50 };
assert("keyThamSo 'Phụ cấp ăn' → 'phucapan'", keyThamSo("Phụ cấp ăn") === "phucapan");
assert(
  "hopLeTenThamSo 'Phụ cấp ăn' → ok",
  hopLeTenThamSo("Phụ cấp ăn", builtInTs, []).ok === true,
);
assert(
  "hopLeTenThamSo trim + chuẩn hóa khoảng trắng",
  (() => {
    const r = hopLeTenThamSo("  Hệ   số X  ", builtInTs, []);
    return r.ok && r.ten === "Hệ số X" && r.key === "hesox";
  })(),
);
assert(
  "hopLeTenThamSo trống → false",
  hopLeTenThamSo("   ", builtInTs, []).ok === false,
);
assert(
  "hopLeTenThamSo trùng built-in → false",
  hopLeTenThamSo("Tổng lương", builtInTs, []).ok === false,
);
assert(
  "hopLeTenThamSo trùng custom → false",
  hopLeTenThamSo("Phụ cấp ăn", builtInTs, [{ ten: "Phụ cấp ăn" }]).ok === false,
);
assert(
  "hopLeTenThamSo free text a+b → ok",
  (() => {
    const r = hopLeTenThamSo("a+b", builtInTs, []);
    return r.ok && r.ten === "a+b" && r.key === "a+b";
  })(),
);
assert(
  "hopLeTenThamSo 'cơm 2' → ok",
  (() => {
    const r = hopLeTenThamSo("cơm 2", builtInTs, []);
    return r.ok && r.ten === "cơm 2" && r.key === "com2";
  })(),
);
assert(
  "hopLeTenThamSo có / → ok",
  hopLeTenThamSo("SL ca / ngày", builtInTs, []).ok === true,
);
assert(
  "hopLeTenThamSo chỉ toán tử → false",
  hopLeTenThamSo("+", builtInTs, []).ok === false,
);
assert(
  "hopLeTenThamSo quá dài → false",
  hopLeTenThamSo("x".repeat(81), builtInTs, []).ok === false,
);
assert("parseGiaTriThamSo '1.5' → 1.5", parseGiaTriThamSo("1.5") === 1.5);
assert("parseGiaTriThamSo '12.' → null", parseGiaTriThamSo("12.") === null);
assert("parseGiaTriThamSo '' → null", parseGiaTriThamSo("") === null);
assert(
  "gopSoHang merge custom",
  gopSoHang(builtInTs, [
    { id: "1", ten: "Phụ cấp ăn", giaTri: 50000 },
    { id: "2", ten: "Hệ số X", giaTri: 1.2 },
  ]).phucapan === 50000 &&
    gopSoHang(builtInTs, [
      { id: "1", ten: "Phụ cấp ăn", giaTri: 50000 },
      { id: "2", ten: "Hệ số X", giaTri: 1.2 },
    ]).hesox === 1.2,
);
assert(
  "tinhBieuThuc với gopSoHang",
  tinhBieuThuc(
    "Tổng lương + Phụ cấp ăn",
    gopSoHang(builtInTs, [{ id: "1", ten: "Phụ cấp ăn", giaTri: 50 }]),
  ) === 150,
);

// ── tinhDonVi / free-text soHang token ─────────────────────────────
assert(
  "tinhDonVi tongluong + com2 × 2",
  tinhDonVi(
    [
      donViSoHang("tongluong"),
      donViChuoi("+"),
      donViSoHang("com2"),
      donViChuoi("×"),
      donViSo("2"),
    ],
    { tongluong: 100, com2: 10 },
  ) === 120,
);
assert(
  "tinhDonVi soHang a+b (ký tự lạ trong key)",
  tinhDonVi(
    [donViSoHang("a+b"), donViChuoi("×"), donViSo("3")],
    { "a+b": 4 },
  ) === 12,
);
assert(
  "tinhDonVi legacy chuoi tên chữ vẫn ok",
  tinhDonVi(
    [donViChuoi("Tổng lương"), donViChuoi("+"), donViSoHang("com2")],
    { tongluong: 100, com2: 5 },
  ) === 105,
);
assert(
  "tinhDonVi thiếu key → null",
  tinhDonVi([donViSoHang("khongco")], { tongluong: 1 }) === null,
);
assert(
  "hangSoTuDonVi thay số hạng đã biết",
  hangSoTuDonVi(
    [donViSoHang("com2"), donViChuoi("×"), donViSo("2")],
    { com2: 1500 },
    (n) => String(n),
  ) === "1500×2",
);
assert(
  "keyThamSo 'cơm 2' → 'com2'",
  keyThamSo("cơm 2") === "com2",
);

// ── Công thức đặt tên ──────────────────────────────────────────────
assert(
  "hopLeTenCongThuc ok",
  hopLeTenCongThuc("Lương CN mỗi phút", builtInTs, [], []).ok === true,
);
assert(
  "hopLeTenCongThuc trùng tham số → false",
  hopLeTenCongThuc(
    "Phụ cấp ăn",
    builtInTs,
    [{ ten: "Phụ cấp ăn" }],
    [],
  ).ok === false,
);
assert(
  "hopLeTenCongThuc trùng CT khác → false",
  hopLeTenCongThuc(
    "Hệ số X",
    builtInTs,
    [],
    [{ id: "a", ten: "Hệ số X" }],
  ).ok === false,
);
assert(
  "hopLeTenCongThuc excludeId cho phép giữ tên",
  hopLeTenCongThuc(
    "Hệ số X",
    builtInTs,
    [],
    [{ id: "a", ten: "Hệ số X" }],
    "a",
  ).ok === true,
);
assert(
  "hopLeTenThamSo chặn trùng tên CT",
  hopLeTenThamSo(
    "Hệ số X",
    builtInTs,
    [],
    [{ ten: "Hệ số X" }],
  ).ok === false,
);

const baseCt = gopSoHang(builtInTs, [
  { id: "p1", ten: "Phụ cấp ăn", giaTri: 50 },
]);
assert(
  "tinhDsCongThuc 1 CT",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "c1",
          ten: "Lương CN mỗi phút",
          donVi: [
            donViChuoi("Tổng lương"),
            donViChuoi("+"),
            donViChuoi("Phụ cấp ăn"),
          ],
        },
      ],
      baseCt,
    );
    return kq.c1 === 150;
  })(),
);
assert(
  "tinhDsCongThuc free-text soHang 'cơm 2'",
  (() => {
    const base = gopSoHang(builtInTs, [
      { id: "p1", ten: "cơm 2", giaTri: 25 },
    ]);
    const kq = tinhDsCongThuc(
      [
        {
          id: "c1",
          ten: "Tổng có cơm 2",
          donVi: [
            donViSoHang("tongluong"),
            donViChuoi("+"),
            donViSoHang("com2"),
          ],
        },
      ],
      base,
    );
    return kq.c1 === 125;
  })(),
);
assert(
  "tinhDsCongThuc lồng B = A × 2",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "a",
          ten: "Cơ sở",
          donVi: [donViChuoi("Tổng lương")],
        },
        {
          id: "b",
          ten: "Gấp đôi",
          donVi: [donViChuoi("Cơ sở"), donViChuoi("×"), donViSo("2")],
        },
      ],
      builtInTs,
    );
    return kq.a === 100 && kq.b === 200;
  })(),
);
assert(
  "tinhDsCongThuc lồng bất kể thứ tự list",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "b",
          ten: "Gấp đôi",
          donVi: [donViChuoi("Cơ sở"), donViChuoi("×"), donViSo("2")],
        },
        {
          id: "a",
          ten: "Cơ sở",
          donVi: [donViChuoi("Tổng lương")],
        },
      ],
      builtInTs,
    );
    return kq.a === 100 && kq.b === 200;
  })(),
);
assert(
  "tinhDsCongThuc chu trình → null",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "a",
          ten: "A",
          donVi: [donViChuoi("B"), donViChuoi("+"), donViSo("1")],
        },
        {
          id: "b",
          ten: "B",
          donVi: [donViChuoi("A"), donViChuoi("+"), donViSo("1")],
        },
      ],
      builtInTs,
    );
    return kq.a === null && kq.b === null;
  })(),
);
assert(
  "tinhDsCongThuc số invalid → null",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "c1",
          ten: "X",
          donVi: [donViSo("12.")],
        },
      ],
      builtInTs,
    );
    return kq.c1 === null;
  })(),
);
assert(
  "tinhDsCongThuc tên trống → null",
  (() => {
    const kq = tinhDsCongThuc(
      [
        {
          id: "c1",
          ten: "  ",
          donVi: [donViSo("10")],
        },
      ],
      builtInTs,
    );
    return kq.c1 === null;
  })(),
);

// ── Normalize ──────────────────────────────────────────────────────
const def: CpsxUpgradeLabor = {
  print: { wages: in6, mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
  laminate: { wages: [800000, 550000, 800000, 550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
  slit: { wages: [550000], mealMorning: 30000, mealEvening: 65000, otFactor: 1.5, shiftCount: 1, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 12, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
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

// ── mayTinh workspace persist ──────────────────────────────────────
assert(
  "chuanHoaMayTinh thiếu → default 1 CT",
  (() => {
    const w = chuanHoaMayTinh(undefined);
    return (
      w.items.length === 1 &&
      w.items[0].id === "mt_1" &&
      w.apSource === "formula" &&
      w.apCtId === null
    );
  })(),
);
assert(
  "chuanHoaMayTinh round-trip soHang + tham số cơm 2",
  (() => {
    const raw = {
      items: [
        {
          id: "mt_x",
          ten: "CT A",
          open: false,
          thamSo: [{ id: "ts1", ten: "cơm 2", giaTri: 100 }],
          congThuc: [],
          donViMain: [
            { loai: "soHang", key: "tongluong" },
            { loai: "chuoi", s: "+" },
            { loai: "soHang", key: "com2" },
          ],
        },
      ],
      apSource: "ct",
      apCtId: "mt_x",
      manualDraft: "3500",
    };
    const w = chuanHoaMayTinh(raw);
    return (
      w.items.length === 1 &&
      w.items[0].ten === "CT A" &&
      w.items[0].open === false &&
      w.items[0].thamSo[0]?.ten === "cơm 2" &&
      w.items[0].donViMain[0]?.loai === "soHang" &&
      (w.items[0].donViMain[0] as { key: string }).key === "tongluong" &&
      w.apSource === "ct" &&
      w.apCtId === "mt_x" &&
      w.manualDraft === "3500"
    );
  })(),
);
assert(
  "chuanHoaMayTinh apCtId mất → fallback formula",
  (() => {
    const w = chuanHoaMayTinh({
      items: [{ id: "a", ten: "A", open: true, thamSo: [], congThuc: [], donViMain: [] }],
      apSource: "ct",
      apCtId: "khong-co",
      manualDraft: "",
    });
    return w.apSource === "formula" && w.apCtId === null;
  })(),
);
assert(
  "chuanHoa1May thiếu mayTinh → default workspace",
  (() => {
    const n = chuanHoaCpsxUpgradeLabor(
      { print: { wages: [1] } as never },
      def,
    );
    return (
      n.print.mayTinh != null &&
      n.print.mayTinh.items.length === 1 &&
      n.bag.mayTinh != null
    );
  })(),
);
assert(
  "chuanHoa1May giữ mayTinh đã lưu",
  (() => {
    const n = chuanHoaCpsxUpgradeLabor(
      {
        print: {
          mayTinh: {
            items: [
              {
                id: "z",
                ten: "Z",
                open: true,
                thamSo: [],
                congThuc: [],
                donViMain: [{ loai: "so", giaTri: "1" }],
              },
            ],
            apSource: "manual",
            apCtId: null,
            manualDraft: "999",
          },
        } as never,
      },
      def,
    );
    return (
      n.print.mayTinh?.items[0]?.ten === "Z" &&
      n.print.mayTinh?.apSource === "manual" &&
      n.print.mayTinh?.manualDraft === "999"
    );
  })(),
);
assert(
  "taoMayTinhWorkspaceMacDinh có mt_1",
  taoMayTinhWorkspaceMacDinh().items[0].id === "mt_1",
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
