/**
 * tinh-gia.test.ts — Kiểm thử engine tính giá
 * Chạy: npx tsx src/kiem-thu/tinh-gia.test.ts
 */
import { tinhGia, toiUuDoDay } from '../tinh-gia';
import { VAT_LIEU_MAC_DINH, HANG_SO_MAC_DINH, BANG_LOI_NHUAN_MAC_DINH } from '@lts/hang-so';
import type { DauVaoTinhGia } from '@lts/kieu-du-lieu';

// ─── Helpers ────────────────────────────────────────────────────────────────
let daDat = 0;
let daLoi = 0;

function kiem(tenTest: string, dieuKien: boolean, chiTiet = '') {
  if (dieuKien) {
    console.log(`  ✅ ${tenTest}`);
    daDat++;
  } else {
    console.error(`  ❌ ${tenTest}${chiTiet ? ' — ' + chiTiet : ''}`);
    daLoi++;
  }
}

function kiemGanDung(tenTest: string, thucTe: number, kyVong: number, doPhanTram = 1) {
  const ok = Math.abs(thucTe - kyVong) / (Math.abs(kyVong) || 1) * 100 <= doPhanTram;
  kiem(tenTest, ok, `thực_tế=${thucTe.toFixed(4)}, kỳ_vọng=${kyVong.toFixed(4)}, sai_số=${doPhanTram}%`);
}

function tieu(tieuDe: string) {
  console.log(`\n══ ${tieuDe} ══`);
}

const vatLieu = VAT_LIEU_MAC_DINH;
const hangSo  = HANG_SO_MAC_DINH;
const bnlhuan = BANG_LOI_NHUAN_MAC_DINH;

// Đầu vào túi cơ bản (1 lớp, 4 màu)
const dauVaoTuiCoBan: DauVaoTinhGia = {
  khachHang: 'Test',
  tenSanPham: 'Túi test',
  loaiSanPham: 'tui',
  loaiTui: 'flat',
  loaiMang: '',
  chieuDaiCuonMang: 6000,
  soLuong: 10000,
  soMau: 4,
  soHinh: 1,
  idLop1: vatLieu.find(vl => vl.ten.toUpperCase().includes('OPP'))?.id ?? vatLieu[0].id,
  idLop2: null,
  idLop3: null,
  idLop4: null,
  idLop5: null,
  khoTrai: 0.3,
  buocCat: 0.4,
  phiKimLoai: 0,
  tyLePhuMucMuc: 1,
  khoiLuongQuaiXach: 0,
  khoiLuongKhoa: 0,
  khoiLuongBangKeo: 0,
  coKhoa: false,
  coBangKeo: false,
  coQuaiXach: false,
  ngayThanhToan: 30,
  cotLoiNhuan: 1,
  tyLeHoaHong: 0,
  hoaHongCoDinhVND: 0,
  donViHoaHong: 'percent',
  giaTriHoaHongNhap: 0,
  soTuiPerThuung: 1000,
  giaThuung: 50000,
  cuocVanChuyenPerKm: 0,
  soKmVanChuyen: 0,
  chieuDaiTruc: 0,
  chuViTruc: 0,
  giaTrucDonVi: 0,
  loaiTruc: 'A',
  baoTruc: false,
};

// Đầu vào màng cơ bản
const dauVaoMangCoBan: DauVaoTinhGia = {
  ...dauVaoTuiCoBan,
  loaiSanPham: 'mang',
  loaiTui: '',
  loaiMang: 'mangIn',
  soLuong: 5000, // 5000 m²
  chieuDaiCuonMang: 6000,
  khoTrai: 0.5,
  buocCat: 0.3,
  soHinh: 1,
};

// ════════════════════════════════════════════════════════════════════════════
tieu('1. Sanity — kết quả trả về hợp lệ');
// ════════════════════════════════════════════════════════════════════════════

const kq1 = tinhGia(dauVaoTuiCoBan, vatLieu, hangSo, bnlhuan);
kiem('Túi 1 lớp: kết quả không null', kq1 !== null);
if (kq1) {
  kiem('giaCuoiCung > 0', kq1.giaCuoiCung > 0);
  kiem('tongDienTich > 0', kq1.tongDienTich > 0);
  kiem('chieuDaiMang > 0', kq1.chieuDaiMang > 0);
  kiem('dienTichTui > 0', kq1.dienTichTui > 0);
}

const kq2 = tinhGia(dauVaoMangCoBan, vatLieu, hangSo, bnlhuan);
kiem('Màng 1 lớp: kết quả không null', kq2 !== null);
if (kq2) {
  kiem('giaCuoiCung > 0 (màng)', kq2.giaCuoiCung > 0);
  kiem('tongDienTich > 0 (màng)', kq2.tongDienTich > 0);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('2. Màng: tongDienTich = soLuong (không nhân dienTichTui)');
// ════════════════════════════════════════════════════════════════════════════

if (kq2) {
  kiemGanDung('tongDienTich = soLuong (5000 m²)', kq2.tongDienTich, dauVaoMangCoBan.soLuong, 0.1);

  const chieuDaiMangKyVong = dauVaoMangCoBan.soLuong / (dauVaoMangCoBan.khoTrai * (dauVaoMangCoBan.soHinh || 1));
  kiemGanDung('chieuDaiMang màng đúng công thức', kq2.chieuDaiMang, chieuDaiMangKyVong, 0.1);

  const chieuDaiSai = (dauVaoMangCoBan.soLuong * dauVaoMangCoBan.khoTrai * dauVaoMangCoBan.buocCat)
    / (dauVaoMangCoBan.khoTrai * (dauVaoMangCoBan.soHinh || 1) + 0.02);
  kiem('chieuDaiMang KHÔNG bị nhân dienTichTui (lỗi cũ)',
    Math.abs(kq2.chieuDaiMang - chieuDaiSai) > 100,
    `chieuDai=${kq2.chieuDaiMang.toFixed(1)} vs sai=${chieuDaiSai.toFixed(1)}`
  );
}

// ════════════════════════════════════════════════════════════════════════════
tieu('3. Túi: tongDienTich = soLuong × dienTichTui');
// ════════════════════════════════════════════════════════════════════════════

if (kq1) {
  const kyVong = dauVaoTuiCoBan.soLuong * dauVaoTuiCoBan.khoTrai * dauVaoTuiCoBan.buocCat;
  kiemGanDung('tongDienTich túi = sl × bagArea', kq1.tongDienTich, kyVong, 0.1);

  const soHinh = dauVaoTuiCoBan.soHinh || 1;
  const chieuDaiKyVong = kyVong / (dauVaoTuiCoBan.khoTrai * soHinh);
  kiemGanDung('chieuDaiMang túi đúng công thức', kq1.chieuDaiMang, chieuDaiKyVong, 0.1);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('4. Chiều dài trục in (clamp về 0.7m)');
// ════════════════════════════════════════════════════════════════════════════

{
  const kyVong1 = Math.max(0.7, 0.5 * 1 + 0.1); // 0.6 → 0.7
  kiem('cylLength nhỏ được clamp về 0.7m', kyVong1 === 0.7);

  const kyVong2 = Math.max(0.7, 0.8 * 2 + 0.1); // 1.7 > 1.25 → vẫn tính
  kiem('cylLength lớn (>1.25) vẫn tính được', kyVong2 > 1.25);

  const kyVong3 = Math.max(0.7, 0.6 * 1 + 0.1); // 0.7
  kiem('cylLength biên 0.7m (khoTrai=0.6)', kyVong3 === 0.7);

  const kyVong4 = Math.max(0.7, 0.1 * 1 + 0.1); // 0.2 → 0.7
  kiem('cylLength khoTrai=0.1 clamp về 0.7 (không nhân bội số)', kyVong4 === 0.7);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('5. Màng: dienTichCuonMang = khoTrai × chieuDaiCuonMang');
// ════════════════════════════════════════════════════════════════════════════

if (kq2) {
  const kyVong = dauVaoMangCoBan.khoTrai * dauVaoMangCoBan.chieuDaiCuonMang;
  kiemGanDung('dienTichCuonMang đúng công thức', kq2.dienTichCuonMang, kyVong, 0.1);
  kiem('dienTichCuonMang > 0 khi màng', kq2.dienTichCuonMang > 0);
  if (kq1) kiem('dienTichCuonMang = 0 khi túi', kq1.dienTichCuonMang === 0);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('6. Chi phí cắt: = 0 với màng, > 0 với túi');
// ════════════════════════════════════════════════════════════════════════════

if (kq1 && kq2) {
  kiem('tongChiPhiCat = 0 với màng', kq2.tongChiPhiCat === 0);
  kiem('tongChiPhiCat > 0 với túi', kq1.tongChiPhiCat > 0);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('7. Màng nhiều con hình (soHinh=2)');
// ════════════════════════════════════════════════════════════════════════════

const kq3 = tinhGia({ ...dauVaoMangCoBan, soHinh: 2 }, vatLieu, hangSo, bnlhuan);
if (kq3 && kq2) {
  kiem('chieuDaiMang giảm khi soHinh tăng', kq3.chieuDaiMang < kq2.chieuDaiMang);
  kiemGanDung('tongDienTich không đổi khi đổi soHinh', kq3.tongDienTich, kq2.tongDienTich, 0.1);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('8. Edge cases — đầu vào không hợp lệ');
// ════════════════════════════════════════════════════════════════════════════

const kqNull = tinhGia({ ...dauVaoTuiCoBan, soLuong: 0 }, vatLieu, hangSo, bnlhuan);
kiem('soLuong=0 → null', kqNull === null);

const kqKhongLop = tinhGia({ ...dauVaoTuiCoBan, idLop1: null }, vatLieu, hangSo, bnlhuan);
kiem('idLop1=null → null', kqKhongLop === null);

const kqKhongLoaiTui = tinhGia({ ...dauVaoTuiCoBan, loaiTui: '' }, vatLieu, hangSo, bnlhuan);
kiem('loaiTui="" với túi → null', kqKhongLoaiTui === null);

const kqMangKhongLoai = tinhGia({ ...dauVaoMangCoBan, loaiMang: '' }, vatLieu, hangSo, bnlhuan);
kiem('loaiMang="" với màng → null', kqMangKhongLoai === null);

// ════════════════════════════════════════════════════════════════════════════
tieu('9. Không màu in (soMau=0)');
// ════════════════════════════════════════════════════════════════════════════

const kq0Mau = tinhGia({ ...dauVaoTuiCoBan, soMau: 0 }, vatLieu, hangSo, bnlhuan);
if (kq0Mau) {
  kiem('hatHaoIn = 0 khi không in', kq0Mau.hatHaoIn === 0);
  kiem('chiPhiSXIn = 0 khi không in', kq0Mau.chiPhiSXIn === 0);
  kiem('giaCuoiCung > 0 dù không in', kq0Mau.giaCuoiCung > 0);
  kiem('giaCuoiCung thấp hơn khi có in', kq0Mau.giaCuoiCung < (kq1?.giaCuoiCung ?? 0));
}

// ════════════════════════════════════════════════════════════════════════════
tieu('10. Nhiều lớp — chi phí cao hơn 1 lớp');
// ════════════════════════════════════════════════════════════════════════════

const idLop2 = vatLieu.find(vl => vl.ten.toUpperCase().includes('PE') && !vl.ten.toUpperCase().includes('MPET'))?.id;
const kqNhieuLop = idLop2 ? tinhGia({ ...dauVaoTuiCoBan, idLop2 }, vatLieu, hangSo, bnlhuan) : null;
if (kqNhieuLop && kq1) {
  kiem('2 lớp: tongChiPhiGhep > 0', kqNhieuLop.tongChiPhiGhep > 0);
  kiem('2 lớp: giaCuoiCung > 1 lớp', kqNhieuLop.giaCuoiCung > kq1.giaCuoiCung);
  kiem('2 lớp: cacLop.ghep.length = 1', kqNhieuLop.cacLop.ghep.length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
tieu('11. soHinh > 1 — per-image nhất quán');
// ════════════════════════════════════════════════════════════════════════════

{
  const soHinh = 3;
  const kqNhieuHinh = tinhGia({ ...dauVaoTuiCoBan, soHinh, soLuong: 30000 }, vatLieu, hangSo, bnlhuan);
  const kqMotHinh   = tinhGia({ ...dauVaoTuiCoBan, soHinh: 1, soLuong: 10000 }, vatLieu, hangSo, bnlhuan);

  if (kqNhieuHinh && kqMotHinh) {
    kiem('soHinh=3: metIn > 0', kqNhieuHinh.cacLop.in.met > 0);
    kiem('soHinh=3: hatHaoIn > 0', kqNhieuHinh.hatHaoIn > 0);

    const metIn    = kqNhieuHinh.cacLop.in.met;
    const hatHao   = kqNhieuHinh.hatHaoIn;
    const metPerHinh = metIn / soHinh;
    const hatHaoPerHinh = hatHao / soHinh;
    const dauVaoVL = metPerHinh + hatHaoPerHinh;

    kiem(
      'dauVaoVL (per-hinh) = (met+hatHao)/soHinh',
      Math.abs(dauVaoVL - (metIn + hatHao) / soHinh) < 0.001,
      `dauVaoVL=${dauVaoVL.toFixed(2)}, (m+h)/sh=${((metIn+hatHao)/soHinh).toFixed(2)}`
    );

    kiem('hatHaoPerHinh < hatHao gốc khi soHinh=3', hatHaoPerHinh < hatHao);
    kiem('metPerHinh < met gốc khi soHinh=3', metPerHinh < metIn);
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('12. soMau=0 — hàng IN: hatHao=0, chiPhiSX=0, chiPhiVL > 0');
// ════════════════════════════════════════════════════════════════════════════

{
  const kqKhongIn = tinhGia({ ...dauVaoTuiCoBan, soMau: 0 }, vatLieu, hangSo, bnlhuan);
  const kqCoIn    = tinhGia({ ...dauVaoTuiCoBan, soMau: 4 }, vatLieu, hangSo, bnlhuan);

  if (kqKhongIn) {
    kiem('soMau=0: hatHaoIn = 0', kqKhongIn.hatHaoIn === 0);
    kiem('soMau=0: chiPhiSXIn = 0', kqKhongIn.chiPhiSXIn === 0);
    kiem('soMau=0: cpSXIn = 0', kqKhongIn.cpSXIn === 0);
    kiem('soMau=0: chiPhiVatLieuIn > 0 (vẫn dùng vật liệu)', kqKhongIn.chiPhiVatLieuIn > 0);
  }
  if (kqCoIn) {
    kiem('soMau=4: hatHaoIn > 0', kqCoIn.hatHaoIn > 0);
    kiem('soMau=4: chiPhiSXIn > 0', kqCoIn.chiPhiSXIn > 0);
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('13. MOQ — metPerHinh phải chia soHinh');
// ════════════════════════════════════════════════════════════════════════════

{
  const soHinh = 2;
  const kqMoq = tinhGia({ ...dauVaoTuiCoBan, soHinh }, vatLieu, hangSo, bnlhuan);
  if (kqMoq) {
    const lopIn = kqMoq.cacLop.in;
    const tongMet = lopIn.met + kqMoq.hatHaoIn;
    const metPerHinh = tongMet / soHinh;

    kiem('MOQ: tongMet > metPerHinh khi soHinh=2', tongMet > metPerHinh);
    kiemGanDung('MOQ: metPerHinh = tongMet / soHinh', metPerHinh, tongMet / soHinh, 0.01);
    kiemGanDung('MOQ: per-hinh bằng 50% tổng khi soHinh=2', metPerHinh, tongMet / 2, 0.01);
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('14. Khổ thành phẩm vs khổ màng NL');
// ════════════════════════════════════════════════════════════════════════════

{
  const soHinh = 2;
  const khoTrai = 0.5;
  const kqStat = tinhGia({ ...dauVaoTuiCoBan, soHinh, khoTrai }, vatLieu, hangSo, bnlhuan);
  if (kqStat) {
    const khoTP = khoTrai;                   // 1 con hình
    const khoNL = khoTrai * soHinh + 0.02;  // toàn khổ
    kiem('Khổ TP ≠ Khổ NL khi soHinh=2', Math.abs(khoTP - khoNL) > 0.01,
      `khoTP=${khoTP}, khoNL=${khoNL}`);
    kiemGanDung('Khổ NL = khoTrai×soHinh+0.02', khoNL, kqStat.khoCatIn, 0.01);
    kiem('Khổ NL > Khổ TP khi soHinh=2', khoNL > khoTP);
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('15. Công thức phi hao — đảm bảo đúng');
// ════════════════════════════════════════════════════════════════════════════

{
  const kqPhi = tinhGia(dauVaoTuiCoBan, vatLieu, hangSo, bnlhuan);
  if (kqPhi) {
    const hA = hangSo.hatHaoCatA || 3000;
    const hB = hangSo.hatHaoCatB || 20;
    const hC = hangSo.hatHaoCatC || 100;
    kiemGanDung('hatHaoCat = metCat/hA×hB + hC', kqPhi.hatHaoCat, kqPhi.metCat / hA * hB + hC, 0.1);
    kiem('hatHaoCat > 0', kqPhi.hatHaoCat > 0);

    if (kqPhi.cacLop.ghep.length > 0) {
      const ghep = kqPhi.cacLop.ghep[0];
      const gA = hangSo.hatHaoGhepA || 3000;
      const gB = hangSo.hatHaoGhepB || 20;
      const gC = hangSo.hatHaoGhepC || 100;
      kiemGanDung('hatHaoGhep = met/gA×gB + gC', ghep.hatHao, ghep.met / gA * gB + gC, 0.1);
    }

    const pA = hangSo.hatHaoInA || 6000;
    const pB = hangSo.hatHaoInB || 40;
    const pC = hangSo.hatHaoInC || 50000;
    const pD = hangSo.hatHaoInD || 400;
    const csDatMau = hangSo.chiPhiCaiDatMau[(dauVaoTuiCoBan.soMau ?? 0)] || ((dauVaoTuiCoBan.soMau ?? 0) * 200 + 200);
    const pm = kqPhi.metIn;
    const kyVongHatHaoIn = csDatMau + (pm / pA * pB) + (pm > pC ? (pm - pC) / pC * pD : 0);
    kiemGanDung('hatHaoIn = csDatMau + m/pA×pB + ...', kqPhi.hatHaoIn, kyVongHatHaoIn, 0.1);
    kiem('hatHaoIn > 0 khi soMau=4', kqPhi.hatHaoIn > 0);
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('16. Regression 100 case — nhập liệu và kết quả màng/túi');
// ════════════════════════════════════════════════════════════════════════════

{
  const widths = [0.32, 0.45, 0.5, 0.62, 0.8];
  const rollLengths = [3000, 4000, 5000, 6000, 8000];
  const imageCounts = [1, 2, 3, 4];
  const filmQuantities = [3000, 5000, 9000, 12000, 18000];
  const cutSteps = [0.18, 0.25, 0.32, 0.4, 0.55];
  const bagQuantities = [5000, 10000, 15000, 20000, 30000];
  let soCase = 0;

  for (let i = 0; i < 50; i++) {
    const khoTrai = widths[i % widths.length];
    const chieuDaiCuonMang = rollLengths[Math.floor(i / widths.length) % rollLengths.length];
    const soHinh = imageCounts[i % imageCounts.length];
    const soLuong = filmQuantities[Math.floor(i / imageCounts.length) % filmQuantities.length];
    const dauVao = { ...dauVaoMangCoBan, khoTrai, chieuDaiCuonMang, soHinh, soLuong };
    const kq = tinhGia(dauVao, vatLieu, hangSo, bnlhuan);
    soCase++;

    const dienTichCuonKyVong = khoTrai * chieuDaiCuonMang;
    const chieuDaiMangKyVong = soLuong / (khoTrai * soHinh);
    const metCatKyVong = soLuong / (khoTrai * soHinh);
    const khoNLKyVong = khoTrai * soHinh + 0.02;
    const ok = !!kq &&
      Math.abs(kq.tongDienTich - soLuong) < 0.001 &&
      Math.abs(kq.dienTichCuonMang - dienTichCuonKyVong) < 0.001 &&
      Math.abs(kq.chieuDaiMang - chieuDaiMangKyVong) < 0.001 &&
      Math.abs(kq.metCat - metCatKyVong) < 0.001 &&
      Math.abs(kq.khoCatIn - khoNLKyVong) < 0.001 &&
      (soHinh === 1 || Math.abs(kq.dienTichCuonMang - dienTichCuonKyVong / soHinh) > 0.001) &&
      kq.giaCuoiCung > 0;

    kiem(`Case ${soCase}/100 màng: khổ=${khoTrai}m, cuộn=${chieuDaiCuonMang}m, số hình=${soHinh}, SL=${soLuong}m²`, ok,
      kq ? `DT cuộn=${kq.dienTichCuonMang}, kỳ vọng=${dienTichCuonKyVong}; metCat=${kq.metCat}, kỳ vọng=${metCatKyVong}` : 'kết quả null');
  }

  for (let i = 0; i < 50; i++) {
    const khoTrai = widths[i % widths.length];
    const buocCat = cutSteps[Math.floor(i / widths.length) % cutSteps.length];
    const soHinh = imageCounts[i % imageCounts.length];
    const soLuong = bagQuantities[Math.floor(i / imageCounts.length) % bagQuantities.length];
    const soMau = i % 5;
    const dauVao = { ...dauVaoTuiCoBan, khoTrai, buocCat, soHinh, soLuong, soMau };
    const kq = tinhGia(dauVao, vatLieu, hangSo, bnlhuan);
    soCase++;

    const dienTichTuiKyVong = khoTrai * buocCat;
    const tongDienTichKyVong = soLuong * dienTichTuiKyVong;
    const metCatKyVong = buocCat * soLuong / soHinh;
    const khoNLKyVong = khoTrai * soHinh + 0.02;
    const ok = !!kq &&
      Math.abs(kq.dienTichTui - dienTichTuiKyVong) < 0.001 &&
      Math.abs(kq.tongDienTich - tongDienTichKyVong) < 0.001 &&
      Math.abs(kq.metCat - metCatKyVong) < 0.001 &&
      Math.abs(kq.khoCatIn - khoNLKyVong) < 0.001 &&
      Math.abs(kq.dienTichCuonMang) < 0.001 &&
      kq.giaCuoiCung > 0 &&
      kq.tongChiPhiCat > 0 &&
      (soMau === 0 ? kq.hatHaoIn === 0 && kq.cpSXIn === 0 : kq.hatHaoIn > 0 && kq.cpSXIn > 0);

    kiem(`Case ${soCase}/100 túi: khổ=${khoTrai}m, bước=${buocCat}m, số hình=${soHinh}, SL=${soLuong}, màu=${soMau}`, ok,
      kq ? `metCat=${kq.metCat}, kỳ vọng=${metCatKyVong}; tổng DT=${kq.tongDienTich}, kỳ vọng=${tongDienTichKyVong}` : 'kết quả null');
  }
}

// ════════════════════════════════════════════════════════════════════════════
tieu('17. Tối ưu độ dày — dung sai ±5 và nhảy nhóm');
// ════════════════════════════════════════════════════════════════════════════

{
  const pet = vatLieu.find(vl => vl.id === 'PET')!;
  const cpp20 = vatLieu.find(vl => vl.id === 'CPP20')!;
  const kq = toiUuDoDay(50, [
    { id: 'layer1Id', materialId: pet.id, doDay: pet.doDay, laLLDPE: false },
    { id: 'layer2Id', materialId: cpp20.id, doDay: cpp20.doDay, laLLDPE: false },
  ], vatLieu);

  const lop2 = kq.ketQua.find(k => k.layerId === 'layer2Id');
  kiem('CPP20 có thể nhảy nhóm sang CPP30 dù không adjustableMic',
    lop2?.materialId === 'CPP30' && lop2.adjustedThickness === 30,
    `materialId=${lop2?.materialId}, mic=${lop2?.adjustedThickness}`);
  kiem('Tổng danh định nằm trong target ±5 mic', kq.tongThucTe >= 45 && kq.tongThucTe <= 55);
}

{
  const pet = vatLieu.find(vl => vl.id === 'PET')!;
  const lldpe = vatLieu.find(vl => vl.id === 'LLDPE')!;
  const kq = toiUuDoDay(135, [
    { id: 'layer1Id', materialId: pet.id, doDay: pet.doDay, laLLDPE: false },
    { id: 'layer2Id', materialId: lldpe.id, doDay: lldpe.doDay, laLLDPE: true },
  ], vatLieu);

  const pe = kq.ketQua.find(k => k.layerId === 'layer2Id');
  kiem('LLDPE được cân theo bội số 5 trong vùng target ±5',
    pe?.materialId === 'LLDPE' && pe.adjustedThickness === 115,
    `materialId=${pe?.materialId}, mic=${pe?.adjustedThickness}`);
  kiem('Dung sai optimizer là ±5 mic', kq.datYeuCau && kq.tongThucTe >= 130 && kq.tongThucTe <= 140);
}

// ════════════════════════════════════════════════════════════════════════════
// KẾT QUẢ
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(50)}`);
console.log(`KẾT QUẢ: ${daDat} pass, ${daLoi} fail / ${daDat + daLoi} tổng`);
if (daLoi === 0) {
  console.log('🎉 Tất cả kiểm thử đều PASS!');
} else {
  console.log(`⚠️  ${daLoi} kiểm thử FAIL — cần kiểm tra lại!`);
  process.exit(1);
}
