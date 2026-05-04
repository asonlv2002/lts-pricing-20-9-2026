// ═══════════════════════════════════════════════════════════════════════════
// @lts/bang-tinh-gia — Engine tính giá bao bì
// Pure TypeScript — không phụ thuộc DOM, Node, hay bất kỳ framework nào.
// ═══════════════════════════════════════════════════════════════════════════
import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo, ChiTietLop, ChiTietLopCat } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP } from '@lts/hang-so';

export function layVatLieu(id: string, danhSachVatLieu: VatLieu[]): VatLieu | undefined {
  return danhSachVatLieu.find(vl => vl.id === id);
}

export function traLoiNhuan(tongChiPhi: number, cotLoiNhuan: number, bangLoiNhuan: DongLoiNhuan[]): number {
  const cot = cotLoiNhuan === 1 ? 'cot1' : 'cot2';
  let giaTriLN = LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP[cot as keyof typeof LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP];
  for (const dong of bangLoiNhuan) {
    if (tongChiPhi < dong.nguong) {
      giaTriLN = dong[cot as keyof typeof dong] as number;
      break;
    }
  }
  return giaTriLN;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tối ưu độ dày tự động — đáp ứng mục tiêu ±5 mic, ưu tiên mức thấp nhất
// Quy tắc:
//   - Thành phẩm: ±5 mic (thỏa thuận khách hàng)
//   - LLDPE: ±3 mic (thỏa thuận NCC), tăng/giảm theo bội số 5 (35,40,45...)
//   - Các lớp khác: độ dày cố định theo danh sách
//   - Keo: 3 mic/lớp ghép (tự động cộng thêm)
//   - Ưu tiên 1: tăng/giảm vật liệu có sẵn (chênh lệch 2-3 mic)
//   - Ưu tiên 2: tăng/giảm LLDPE (chênh lệch 5+ mic)
// ═══════════════════════════════════════════════════════════════════════════

export interface KetQuaToiUuDoDay {
  layerId: string;          // id lớp (idLop1, idLop2...)
  adjustedThickness: number;  // độ dày sau điều chỉnh (mic)
  originalThickness: number;  // độ dày gốc (mic)
  isLLDPE: boolean;          // có phải LLDPE không
}

export function toiUuDoDay(
  mucTieu: number,                      // độ dày mục tiêu (mic)
  vatLieuDangChon: { id: string; doDay: number; laLLDPE: boolean }[],
  danhSachVatLieu: VatLieu[],          // toàn bộ danh sách vật liệu
): {
  ketQua: KetQuaToiUuDoDay[];
  tongDoDayVatLieu: number;
  tongDoDayKeo: number;
  tongThucTe: number;                    // vat liệu + keo
  datYeuCau: boolean;                   // có nằm trong [mucTieu-5, mucTieu+5]?
  canhBao?: string;
} {
  const soLopGhep = vatLieuDangChon.length - 1; // lớp 1 là in, còn lại là ghép
  const keoPerLop = 3;
  const tongDoDayKeo = soLopGhep * keoPerLop;

  // Tìm vật liệu trong danh sách để biết có phải LLDPE không
  const laLLDPE = (id: string): boolean => {
    const vl = danhSachVatLieu.find(v => v.id === id);
    return vl ? (vl.ten.toLowerCase().includes('lldpe') || (vl.nhom?.toLowerCase().includes('lldpe') ?? false)) : false;
  };

  // Lọc danh sách vật liệu theo nhóm (cho lớp in và các lớp ghép)
  const vatLieuTheoNhom = (nhom?: string) => {
    if (!nhom) return danhSachVatLieu;
    return danhSachVatLieu.filter(v => v.nhom === nhom);
  };

  // Khởi tạo kết quả với độ dày hiện tại
  const ketQua: KetQuaToiUuDoDay[] = vatLieuDangChon.map(v => ({
    layerId: v.id,
    adjustedThickness: v.doDay,
    originalThickness: v.doDay,
    isLLDPE: laLLDPE(v.id),
  }));

  // Tính tổng độ dày vật liệu hiện tại
  let tongVatLieu = ketQua.reduce((sum, k) => sum + k.adjustedThickness, 0);
  let tongThucTe = tongVatLieu + tongDoDayKeo;

  const minChapNhan = mucTieu - 5;
  const maxChapNhan = mucTieu + 5;

  // Nếu đã đạt yêu cầu và ở mức thấp nhất có thể → return luôn
  if (tongThucTe >= minChapNhan && tongThucTe <= maxChapNhan) {
    return { ketQua, tongDoDayVatLieu: tongVatLieu, tongDoDayKeo, tongThucTe, datYeuCau: true };
  }

  // TH1: Tổng quá thấp (< minChapNhan) → cần tăng
  if (tongThucTe < minChapNhan) {
    const canTang = minChapNhan - tongThucTe;

    // Ưu tiên 1: Thử tăng các lớp vật liệu có sẵn (trừ LLDPE)
    for (let i = 0; i < ketQua.length && tongThucTe < minChapNhan; i++) {
      if (ketQua[i].isLLDPE) continue; // bỏ qua LLDPE, để ưu tiên 2

      const vl = danhSachVatLieu.find(v => v.id === ketQua[i].layerId);
      if (!vl || !vl.doiDuocMic) continue;

      const nhom = vl.nhom;
      const cacDoDay = vatLieuTheoNhom(nhom)
        .filter(v => v.doiDuocMic)
        .map(v => v.doDay)
        .sort((a, b) => a - b);

      const hienTai = ketQua[i].adjustedThickness;
      const lonHon = cacDoDay.find(d => d > hienTai);
      if (lonHon !== undefined) {
        const tangThem = lonHon - hienTai;
        ketQua[i].adjustedThickness = lonHon;
        tongVatLieu += tangThem;
        tongThucTe += tangThem;
      }
    }

    // Ưu tiên 2: Nếu vẫn chưa đạt, tăng LLDPE theo bội số 5
    if (tongThucTe < minChapNhan) {
      for (let i = 0; i < ketQua.length && tongThucTe < minChapNhan; i++) {
        if (!ketQua[i].isLLDPE) continue;

        const hienTai = ketQua[i].adjustedThickness;
        // Tìm bội số 5 tiếp theo >= hienTai + (minChapNhan - tongThucTe)
        const canTangThem = minChapNhan - tongThucTe;
        const boiSoTiepTheo = Math.ceil((hienTai + canTangThem) / 5) * 5;

        if (boiSoTiepTheo > hienTai) {
          const tangThem = boiSoTiepTheo - hienTai;
          ketQua[i].adjustedThickness = boiSoTiepTheo;
          tongVatLieu += tangThem;
          tongThucTe += tangThem;
        }
      }
    }

    // Ưu tiên 3: Nếu vẫn chưa đạt và chưa thử tất cả tổ hợp → tìm tổ hợp tối ưu
    if (tongThucTe < minChapNhan) {
      // Tìm tất cả vật liệu có thể thay thế cho từng lớp
      const cacLopTimKiem = vatLieuDangChon.map((v, idx) => {
        const vl = danhSachVatLieu.find(x => x.id === v.id);
        const nhom = vl?.nhom;
        const cacLuaChon = nhom
          ? danhSachVatLieu.filter(x => x.nhom === nhom).sort((a, b) => a.doDay - b.doDay)
          : [vl!].filter(Boolean);
        return { idx, cacLuaChon, hienTai: v.doDay };
      });

      // Tìm tổ hợp độ dày thấp nhất thỏa mãn
      let totNhat: KetQuaToiUuDoDay[] | null = null;
      let tongThapNhat = Infinity;

      // Duyệt tất cả tổ hợp (giới hạn 100 tổ hợp để tránh quá tải)
      const dfs = (lop: number, tongHienTai: number, chon: KetQuaToiUuDoDay[]) => {
        if (lop >= cacLopTimKiem.length) {
          const thucTe = tongHienTai + tongDoDayKeo;
          if (thucTe >= minChapNhan && thucTe <= maxChapNhan && tongHienTai < tongThapNhat) {
            totNhat = chon.map(k => ({ ...k }));
            tongThapNhat = tongHienTai;
          }
          return;
        }

        const { cacLuaChon } = cacLopTimKiem[lop];
        for (const vl of cacLuaChon.slice(0, 10)) { // giới hạn 10 lựa chọn/lớp
          if (tongHienTai + vl.doDay >= tongThapNhat) break; // tỉa nhánh
          dfs(lop + 1, tongHienTai + vl.doDay, [
            ...chon,
            {
              layerId: vatLieuDangChon[lop].id,
              adjustedThickness: vl.doDay,
              originalThickness: vatLieuDangChon[lop].doDay,
              isLLDPE: laLLDPE(vl.id),
            }
          ]);
        }
      };

      dfs(0, 0, []);
      if (totNhat) {
        ketQua.splice(0, ketQua.length, ...(totNhat as KetQuaToiUuDoDay[]));
        tongVatLieu = ketQua.reduce((sum, k) => sum + k.adjustedThickness, 0);
        tongThucTe = tongVatLieu + tongDoDayKeo;
      }
    }
  }

  // TH2: Tổng quá cao (> maxChapNhan) → cần giảm
  if (tongThucTe > maxChapNhan) {
    const canGiam = tongThucTe - maxChapNhan;

    // Thử giảm các lớp vật liệu có sẵn (trừ LLDPE)
    for (let i = 0; i < ketQua.length && tongThucTe > maxChapNhan; i++) {
      if (ketQua[i].isLLDPE) continue;

      const vl = danhSachVatLieu.find(v => v.id === ketQua[i].layerId);
      if (!vl || !vl.doiDuocMic) continue;

      const nhom = vl.nhom;
      const cacDoDay = vatLieuTheoNhom(nhom)
        .filter(v => v.doiDuocMic)
        .map(v => v.doDay)
        .sort((a, b) => b - a); // sắp giảm dần để tìm thấp hơn

      const hienTai = ketQua[i].adjustedThickness;
      const thapHon = cacDoDay.reverse().find(d => d < hienTai);
      if (thapHon !== undefined) {
        const giamBot = hienTai - thapHon;
        ketQua[i].adjustedThickness = thapHon;
        tongVatLieu -= giamBot;
        tongThucTe -= giamBot;
      }
    }

    // Thử giảm LLDPE theo bội số 5
    if (tongThucTe > maxChapNhan) {
      for (let i = 0; i < ketQua.length && tongThucTe > maxChapNhan; i++) {
        if (!ketQua[i].isLLDPE) continue;

        const hienTai = ketQua[i].adjustedThickness;
        const boiSoTruocDo = Math.floor((hienTai - (tongThucTe - maxChapNhan)) / 5) * 5;

        if (boiSoTruocDo < hienTai && boiSoTruocDo >= 35) { // LLDPE tối thiểu 35 mic
          const giamBot = hienTai - boiSoTruocDo;
          ketQua[i].adjustedThickness = boiSoTruocDo;
          tongVatLieu -= giamBot;
          tongThucTe -= giamBot;
        }
      }
    }
  }

  const datYeuCau = tongThucTe >= minChapNhan && tongThucTe <= maxChapNhan;
  const canhBao = !datYeuCau
    ? `Không tìm được tổ hợp độ dày thỏa mãn ${minChapNhan}-${maxChapNhan} mic (hiện tại: ${tongThucTe} mic). Vui lòng chọn vật liệu khác.`
    : undefined;

  return {
    ketQua,
    tongDoDayVatLieu: tongVatLieu,
    tongDoDayKeo,
    tongThucTe,
    datYeuCau,
    canhBao,
  };
}

export function tinhGia(
  dauVao: DauVaoTinhGia,
  danhSachVatLieu: VatLieu[],
  hangSo: HangSo,
  bangLoiNhuan: DongLoiNhuan[]
): KetQuaTinhGia | null {
  const {
    soLuong, khoTrai, buocCat, soMau,
    phiKimLoai = 0,
    khoiLuongQuaiXach = 0, khoiLuongKhoa = 0, khoiLuongBangKeo = 0,
    tyLePhuMucMuc = 1, cotLoiNhuan = 2,
    tyLeHoaHong = 0, coKhoa = false, coBangKeo = false, coQuaiXach = false,
    cuocVanChuyenPerKm, soKmVanChuyen, giaThuung, soTuiPerThuung,
    ghiDeDayLop = {},
  } = dauVao;

  const nhanBanVatLieu = (vl?: VatLieu | null, khoaLop?: string): VatLieu | null => {
    if (!vl) return null;
    const ban = { ...vl };
    if (khoaLop && ghiDeDayLop[khoaLop] && vl.doiDuocMic) {
      ban.doDay = ghiDeDayLop[khoaLop];
      ban.giaMoiM2 = ban.giaMoiKg * ban.doDay * ban.khoiLuongRieng / 1000;
    }
    return ban;
  };

  const lop1 = dauVao.idLop1 ? nhanBanVatLieu(layVatLieu(dauVao.idLop1, danhSachVatLieu), 'idLop1') : null;
  const lop2 = dauVao.idLop2 ? nhanBanVatLieu(layVatLieu(dauVao.idLop2, danhSachVatLieu), 'idLop2') : null;
  const lop3 = dauVao.idLop3 ? nhanBanVatLieu(layVatLieu(dauVao.idLop3, danhSachVatLieu), 'idLop3') : null;
  const lop4 = dauVao.idLop4 ? nhanBanVatLieu(layVatLieu(dauVao.idLop4, danhSachVatLieu), 'idLop4') : null;
  const lop5 = dauVao.idLop5 ? nhanBanVatLieu(layVatLieu(dauVao.idLop5, danhSachVatLieu), 'idLop5') : null;

  if (!lop1 || soLuong <= 0 || khoTrai <= 0 || buocCat <= 0 || !dauVao.loaiSanPham || dauVao.soMau === null) return null;
  if (dauVao.loaiSanPham === 'tui' && !dauVao.loaiTui) return null;
  if (dauVao.loaiSanPham === 'mang' && !dauVao.loaiMang) return null;

  const doDayMucTieu = dauVao.doDayMucTieu || 0;
  if (doDayMucTieu > 0) {
    const doDayTho_ = lop1.doDay + (lop2?.doDay||0) + (lop3?.doDay||0) + (lop4?.doDay||0) + (lop5?.doDay||0);
    const soLop_ = 1 + (lop2?1:0) + (lop3?1:0) + (lop4?1:0) + (lop5?1:0);
    const doDayThucTe = doDayTho_ + (soLop_ - 1) * 3;
    if (doDayThucTe < doDayMucTieu - 5 || doDayThucTe > doDayMucTieu + 5) return null;
  }

  const soHinh = dauVao.soHinh || 1;
  const laMang = dauVao.loaiSanPham === 'mang';

  const dienTichTui = khoTrai * buocCat;
  const tongDienTich = laMang ? soLuong : soLuong * dienTichTui;
  const khoCatIn = khoTrai * soHinh + 0.02;
  const chieuDaiMang = khoTrai * soHinh > 0 ? tongDienTich / (khoTrai * soHinh) : 0;

  const khoCat = khoCatIn;
  const metCat = laMang
    ? (khoTrai * soHinh > 0 ? tongDienTich / (khoTrai * soHinh) : 0)
    : (buocCat * soLuong) / soHinh;

  const hHCatA = hangSo.hatHaoCatA || 3000;
  const hHCatB = hangSo.hatHaoCatB || 20;
  const hHCatC = hangSo.hatHaoCatC || 100;
  const hatHaoCat = metCat / hHCatA * hHCatB + hHCatC;

  const danhSachGhep: any[] = [];
  const chuoiGhep = [
    { lop: lop2, soLop: 2 }, { lop: lop3, soLop: 3 },
    { lop: lop4, soLop: 4 }, { lop: lop5, soLop: 5 },
  ].filter(item => !!item.lop);

  let metCanThiet = metCat + hatHaoCat;

  chuoiGhep.forEach(({ lop, soLop }) => {
    if (!lop) return;
    const kho = khoCat;
    const met = metCanThiet;
    const hHGhepA = hangSo.hatHaoGhepA || 3000;
    const hHGhepB = hangSo.hatHaoGhepB || 20;
    const hHGhepC = hangSo.hatHaoGhepC || 100;
    const hatHao = met / hHGhepA * hHGhepB + hHGhepC;
    const cpsx = hangSo.cpSXGhep;
    const chiPhiSX = cpsx * (hatHao + met) * kho;
    const chiPhiVL = (lop.giaMoiM2 || 0) * (hatHao + met) * kho;
    danhSachGhep.push({ soLop, kho, met, hatHao, cpsx, chiPhiSX, chiPhiVL, tongCong: chiPhiSX + chiPhiVL });
    metCanThiet = met + hatHao;
  });

  const tongHatHaoGhep = danhSachGhep.reduce((t, g) => t + g.hatHao, 0);
  const tongChiPhiGhep = danhSachGhep.reduce((t, g) => t + g.tongCong, 0);

  const khoNLIn = khoCat;
  const metIn = metCat + hatHaoCat + tongHatHaoGhep;

  const chiPhiCaiDatMau = soMau! > 0 ? (hangSo.chiPhiCaiDatMau[soMau!] || (soMau! * 200 + 200)) : 0;
  const hHInA = hangSo.hatHaoInA || 6000;
  const hHInB = hangSo.hatHaoInB || 40;
  const hHInC = hangSo.hatHaoInC || 50000;
  const hHInD = hangSo.hatHaoInD || 400;
  const hatHaoIn = soMau! > 0
    ? (chiPhiCaiDatMau + (metIn / hHInA * hHInB) + (metIn > hHInC ? metIn / hHInC * hHInD : 0))
    : 0;

  const giaMucPerMau = lop1.giaMucMoiMau || (lop1.laPEThoaPA ? 135 : 120);
  const cpSXIn = soMau! > 0 ? (soMau! * giaMucPerMau * tyLePhuMucMuc + hangSo.chiPhiNhanCong + phiKimLoai) : 0;
  const chiPhiSXIn = cpSXIn * (hatHaoIn + metIn) * khoNLIn;
  const chiPhiVatLieuIn = (lop1.giaMoiM2 || 0) * (hatHaoIn + metIn) * khoNLIn;
  const tongChiPhiIn = chiPhiSXIn + chiPhiVatLieuIn;

  let cpSXCat = 0, chiPhiSXCat = 0, tongChiPhiCat = 0;
  if (!laMang) {
    const cpCatCoBan = hangSo.cpCatCoBan || 971;
    const ng1 = hangSo.nguongCat1 || 0.07;
    const ng2 = hangSo.nguongCat2 || 0.2;
    if (dienTichTui < ng1)      cpSXCat = cpCatCoBan * (hangSo.heSoCat1 || 1.4);
    else if (dienTichTui < ng2) cpSXCat = cpCatCoBan * (hangSo.heSoCat2 || 1.2);
    else                        cpSXCat = cpCatCoBan * (hangSo.heSoCat3 || 0.8);
    chiPhiSXCat = cpSXCat * (hatHaoCat + metCat) * khoCat;
    tongChiPhiCat = chiPhiSXCat;
  }

  const tongChiPhiSX = tongChiPhiIn + tongChiPhiGhep + tongChiPhiCat;
  const tyLeLoiNhuan = traLoiNhuan(tongChiPhiSX, cotLoiNhuan, bangLoiNhuan);
  const soTienLoiNhuan = tyLeLoiNhuan * tongChiPhiSX;
  const doanhThu = tongChiPhiSX + soTienLoiNhuan;
  const chiPhiDonVi = soLuong > 0 ? doanhThu / soLuong : 0;

  const doDayTho = lop1.doDay + (lop2?.doDay||0) + (lop3?.doDay||0) + (lop4?.doDay||0) + (lop5?.doDay||0);
  const soLopHoatDong = 1 + (lop2?1:0) + (lop3?1:0) + (lop4?1:0) + (lop5?1:0);
  const tongDoDay = Math.round((doDayTho + (soLopHoatDong - 1) * 3) / 5) * 5;

  const tinhGSMLop = (doDay: number, kl: number) => (doDay / 1000000) * (kl * 1000000);
  const tongGSM = tinhGSMLop(lop1.doDay, lop1.khoiLuongRieng)
    + (lop2 ? tinhGSMLop(lop2.doDay, lop2.khoiLuongRieng) : 0)
    + (lop3 ? tinhGSMLop(lop3.doDay, lop3.khoiLuongRieng) : 0)
    + (lop4 ? tinhGSMLop(lop4.doDay, lop4.khoiLuongRieng) : 0)
    + (lop5 ? tinhGSMLop(lop5.doDay, lop5.khoiLuongRieng) : 0);

  const tongTienKhoa = coKhoa ? soLuong * buocCat * hangSo.giaKhoa : 0;
  const khoaPerDonVi = soLuong > 0 ? tongTienKhoa / soLuong : 0;
  const tongKhoiLuongKhoa = coKhoa ? soLuong * buocCat * khoiLuongKhoa : 0;
  const tongTienBangKeo = coBangKeo ? soLuong * buocCat * hangSo.giaBangKeo : 0;
  const bangKeoPerDonVi = soLuong > 0 ? tongTienBangKeo / soLuong : 0;
  const tongKhoiLuongBangKeo = coBangKeo ? soLuong * buocCat * khoiLuongBangKeo : 0;
  const tongTienQuaiXach = coQuaiXach ? soLuong * hangSo.giaQuaiXach : 0;
  const quaiXachPerDonVi = coQuaiXach ? hangSo.giaQuaiXach : 0;
  const khoiLuongPhuKienThemPerDonVi = soLuong > 0 ? (tongKhoiLuongKhoa + tongKhoiLuongBangKeo) / soLuong : 0;

  const chieuDaiCuonMang = dauVao.chieuDaiCuonMang || 6000;
  const dienTichCuonMang = laMang ? (khoTrai * chieuDaiCuonMang / soHinh) : 0;

  const soTuiPerThuungThucTe = soTuiPerThuung || 0;
  const giaThuungThucTe = giaThuung || 0;
  let soThuung: number, tongTienThuung: number, thuungPerDonVi: number, phiDongGoiPerDonVi: number;

  if (laMang) {
    if (giaThuungThucTe > 0 && dienTichCuonMang > 0) {
      phiDongGoiPerDonVi = giaThuungThucTe / dienTichCuonMang;
      thuungPerDonVi = phiDongGoiPerDonVi;
      tongTienThuung = thuungPerDonVi * soLuong;
      soThuung = soLuong / dienTichCuonMang;
    } else {
      phiDongGoiPerDonVi = thuungPerDonVi = tongTienThuung = 0;
      soThuung = dienTichCuonMang > 0 ? soLuong / dienTichCuonMang : 0;
    }
  } else {
    soThuung = soTuiPerThuungThucTe > 0 ? soLuong / soTuiPerThuungThucTe : 0;
    tongTienThuung = giaThuungThucTe * soThuung;
    thuungPerDonVi = soLuong > 0 ? tongTienThuung / soLuong : 0;
    phiDongGoiPerDonVi = thuungPerDonVi;
  }

  const dienTichDonVi = laMang ? 1.0 : dienTichTui;
  const khoiLuongTare = tongGSM * dienTichDonVi + khoiLuongQuaiXach + khoiLuongPhuKienThemPerDonVi;

  const cuocVanChuyenThucTePerKm = cuocVanChuyenPerKm || 0;
  const soKmThucTe = soKmVanChuyen || 0;
  const tyLeCuocVanChuyen = cuocVanChuyenThucTePerKm * soKmThucTe;
  const tongCuocVanChuyen = tyLeCuocVanChuyen;
  const cuocVanChuyenPerDonVi = soLuong > 0 ? tongCuocVanChuyen / soLuong : 0;

  const ngayThanhToanThucTe = dauVao.ngayThanhToan || 30;
  const laiSuatCoBan  = hangSo.laiSuatCoBan  ?? 0.10;
  const laiSuatThem   = hangSo.laiSuatThem   ?? 0.03;
  // Công thức: (cơ sở + thêm) / 12 tháng × (số ngày / 30) × giá vốn
  const laiSuatPerDonVi = (laiSuatCoBan + laiSuatThem) / 12 * (ngayThanhToanThucTe / 30) * chiPhiDonVi;

  const hoaHongCoDinhVND = dauVao.hoaHongCoDinhVND || 0;
  const hoaHongPerDonVi = dauVao.donViHoaHong === 'vnd' ? hoaHongCoDinhVND : tyLeHoaHong * chiPhiDonVi;

  const chieuDaiTrucThucTe = dauVao.chieuDaiTruc ?? 0;
  const chuViTrucThucTe = dauVao.chuViTruc ?? 0;

  // Đơn giá trục theo loại: A → giaTrucA, B → giaTrucB, custom → giaTrucDonVi nhập tay
  const loaiTruc = dauVao.loaiTruc ?? 'A';
  const giaTrucDonViThucTe = loaiTruc === 'A'
    ? (hangSo.giaTrucA ?? hangSo.giaTrucDonVi)
    : loaiTruc === 'B'
      ? (hangSo.giaTrucB ?? 6500000)
      : (dauVao.giaTrucDonVi || hangSo.giaTrucDonVi);

  const dienTichTruc = chieuDaiTrucThucTe * chuViTrucThucTe;
  const chiPhiTrucPerDonVi = dienTichTruc * giaTrucDonViThucTe;
  const chiPhiTruc = chiPhiTrucPerDonVi * (soMau || 0);

  // Bao trục: phân bổ chi phí trục vào đơn giá theo định mức 200.000 m²
  const DINH_MUC_TRUC = 200000;
  const baoTruc = dauVao.baoTruc ?? false;
  const chiPhiTrucPhanBo = baoTruc && chiPhiTruc > 0
    ? (laMang ? chiPhiTruc / DINH_MUC_TRUC : chiPhiTruc / DINH_MUC_TRUC * dienTichTui)
    : 0;

  const giaCuoiCung = chiPhiDonVi + khoaPerDonVi + bangKeoPerDonVi + quaiXachPerDonVi
    + thuungPerDonVi + cuocVanChuyenPerDonVi + laiSuatPerDonVi + hoaHongPerDonVi + chiPhiTrucPhanBo;
  const ngaySanXuat = Math.ceil(soLuong / 30000) + 4;

  let chuoiCauTruc = lop1.ten + ' ' + lop1.doDay;
  if (lop2) chuoiCauTruc += '//' + lop2.ten + ' ' + lop2.doDay;
  if (lop3) chuoiCauTruc += '//' + lop3.ten + ' ' + lop3.doDay;
  if (lop4) chuoiCauTruc += '//' + lop4.ten + ' ' + lop4.doDay;
  if (lop5) chuoiCauTruc += '//' + lop5.ten + ' ' + lop5.doDay;

  return {
    dauVao, chuoiCauTruc, tongDoDay, tongGSM,
    dienTichTui, tongDienTich, khoCatIn, chieuDaiMang,
    khoCat, metCat, hatHaoCat, cpSXCat, chiPhiSXCat, tongChiPhiCat,
    khoNLIn, metIn, hatHaoIn, cpSXIn, chiPhiSXIn, chiPhiVatLieuIn, tongChiPhiIn,
    tongChiPhiSX, tongChiPhiGhep, tyLeLoiNhuan, soTienLoiNhuan, doanhThu, chiPhiDonVi,
    khoaPerDonVi, tongTienKhoa, bangKeoPerDonVi, tongTienBangKeo,
    quaiXachPerDonVi, tongTienQuaiXach,
    thuungPerDonVi, tongTienThuung, giaThuungThucTe, soTuiPerThuungThucTe, soThuung,
    dienTichCuonMang, phiDongGoiPerDonVi, khoiLuongTare,
    cuocVanChuyenPerDonVi, tongCuocVanChuyen, tyLeCuocVanChuyen, cuocVanChuyenThucTePerKm, soKmThucTe,
    laiSuatPerDonVi, laiSuatCoBan, laiSuatThem, ngayThanhToan: ngayThanhToanThucTe,
    hoaHongPerDonVi, giaCuoiCung,
    chiPhiTruc, chiPhiTrucPerDonVi, chiPhiTrucPhanBo, dienTichTruc,
    chieuDaiTruc: chieuDaiTrucThucTe, chuViTruc: chuViTrucThucTe, ngaySanXuat,
    cacLop: {
      in: { vatLieu: chiPhiVatLieuIn, kho: khoNLIn, met: metIn, hatHao: hatHaoIn, cpsx: cpSXIn, chiPhiSX: chiPhiSXIn, chiPhiVL: chiPhiVatLieuIn, tongCong: tongChiPhiIn } as ChiTietLop,
      ghep: danhSachGhep.map(g => ({ vatLieu: g.chiPhiVL, kho: g.kho, met: g.met, hatHao: g.hatHao, cpsx: g.cpsx, chiPhiSX: g.chiPhiSX, chiPhiVL: g.chiPhiVL, tongCong: g.tongCong } as ChiTietLop)),
      cat: { kho: khoCat, met: metCat, hatHao: hatHaoCat, cpsx: cpSXCat, chiPhiSX: chiPhiSXCat, tongCong: tongChiPhiCat } as ChiTietLopCat,
    },
  };
}
