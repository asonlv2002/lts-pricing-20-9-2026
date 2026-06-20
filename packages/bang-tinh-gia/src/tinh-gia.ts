// @lts/bang-tinh-gia — Engine tính giá bao bì
// Pure TypeScript — không phụ thuộc DOM, Node, hay bất kỳ framework nào.

import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo, ChiTietLop, ChiTietLopCat } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { layVatLieu, nhanBanVatLieu } from './vat-lieu';
import { tinhCongDoanGhep } from './cong-doan-ghep';
import { traLoiNhuan, chonCotLoiNhuanApDung } from './loi-nhuan';
import { tinhKichThuoc } from './kich-thuoc';
import { tinhHaoHutCat } from './hao-hut';
import { tinhCongDoanIn } from './cong-doan-in';
import { tinhCongDoanCat } from './cong-doan-cat';
import { tinhPhuKien } from './phu-kien';
import { tinhDongGoi } from './dong-goi';
import { tinhVanChuyen, tinhLaiVay, tinhHoaHong } from './tai-chinh';
import { tinhTrucIn } from './truc-in';
import { tinhDoDayVaGSM, taoChuoiCauTruc } from './cau-truc';
export { layVatLieu } from './vat-lieu';
export { traLoiNhuan } from './loi-nhuan';
export { toiUuDoDay, type KetQuaToiUuDoDay } from './toi-uu-do-day';

function tinhGSMLop(lop: VatLieu): number {
  return lop.doDay * lop.khoiLuongRieng;
}

function tinhKhoiLuongVatLieuPerDonVi(params: {
  lop1: VatLieu;
  lop2: VatLieu | null;
  lop2Phu: VatLieu | null;
  lop3: VatLieu | null;
  lop4: VatLieu | null;
  lop5: VatLieu | null;
  dienTichDonVi: number;
  buocCat: number;
  soHinh: number;
  laMang: boolean;
  chieuDaiLop2?: { vl1: number; vl2: number };
  kieuGhepLop2?: 'bottom_to_bottom' | 'front_to_front';
}) {
  const { lop1, lop2, lop2Phu, lop3, lop4, lop5, dienTichDonVi, buocCat, soHinh, laMang, chieuDaiLop2, kieuGhepLop2 } = params;
  const cacLopThuong = [lop1, lop3, lop4, lop5].filter((lop): lop is VatLieu => !!lop);
  let tong = cacLopThuong.reduce((sum, lop) => sum + tinhGSMLop(lop) * dienTichDonVi, 0);

  if (!lop2) return tong;

  if (!laMang && lop2Phu && chieuDaiLop2 && chieuDaiLop2.vl1 > 0 && chieuDaiLop2.vl2 > 0) {
    const soHinhThucTe = Math.max(1, soHinh || 1);
    const khoLopChinh = chieuDaiLop2.vl1 / 1000;
    const khoLopPhu = chieuDaiLop2.vl2 / 1000;
    const bienMoiMep = soHinhThucTe > 1 ? 0.01 : 0;
    const laGhepMatTruocVoiMatTruoc = kieuGhepLop2 === 'front_to_front';
    const soLan = soHinhThucTe > 1 ? 2 : 1;
    const khoLopChinhThucDung = soLan * (khoLopChinh + (laGhepMatTruocVoiMatTruoc ? 0 : bienMoiMep));
    const khoLopPhuThucDung = soLan * (khoLopPhu + (laGhepMatTruocVoiMatTruoc ? bienMoiMep : 0));
    tong += tinhGSMLop(lop2) * khoLopChinhThucDung * buocCat / soHinhThucTe;
    tong += tinhGSMLop(lop2Phu) * khoLopPhuThucDung * buocCat / soHinhThucTe;
    return tong;
  }

  tong += tinhGSMLop(lop2) * dienTichDonVi;
  if (lop2Phu) tong += tinhGSMLop(lop2Phu) * dienTichDonVi;
  return tong;
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


    tyLePhuMucMuc = 1,


    tyLeHoaHong = 0, coKhoa = false, coBangKeo = false, coQuaiXach = false,


    cuocVanChuyenPerKm, soKmVanChuyen, giaThuung, soTuiPerThuung, khoiLuongThuung = 0,


    ghiDeDayLop = {},


  } = dauVao;





  const lop1 = dauVao.idLop1 ? nhanBanVatLieu(layVatLieu(dauVao.idLop1, danhSachVatLieu), ghiDeDayLop, 'idLop1') : null;


  const lop2 = dauVao.idLop2 ? nhanBanVatLieu(layVatLieu(dauVao.idLop2, danhSachVatLieu), ghiDeDayLop, 'idLop2') : null;


  const lop2Phu = dauVao.idLop2Phu ? nhanBanVatLieu(layVatLieu(dauVao.idLop2Phu, danhSachVatLieu), ghiDeDayLop, 'idLop2Phu') : null;


  const lop3 = dauVao.idLop3 ? nhanBanVatLieu(layVatLieu(dauVao.idLop3, danhSachVatLieu), ghiDeDayLop, 'idLop3') : null;


  const lop4 = dauVao.idLop4 ? nhanBanVatLieu(layVatLieu(dauVao.idLop4, danhSachVatLieu), ghiDeDayLop, 'idLop4') : null;


  const lop5 = dauVao.idLop5 ? nhanBanVatLieu(layVatLieu(dauVao.idLop5, danhSachVatLieu), ghiDeDayLop, 'idLop5') : null;





  if (!lop1 || soLuong <= 0 || khoTrai <= 0 || buocCat <= 0 || !dauVao.loaiSanPham || dauVao.soMau === null) return null;


  if (dauVao.loaiSanPham === 'tui' && !dauVao.loaiTui) return null;


  if (dauVao.loaiSanPham === 'mang' && !dauVao.loaiMang) return null;





  const doDayMucTieu = dauVao.doDayMucTieu || 0;





  const soHinh = dauVao.soHinh || 1;


  const laMang = dauVao.loaiSanPham === 'mang';
  const laMangInChiCoCongDoanIn = laMang
    && dauVao.loaiMang === 'mangIn'
    && !lop2 && !lop2Phu && !lop3 && !lop4 && !lop5;





  const { dienTichTui, tongDienTich, khoCatIn, chieuDaiMang, khoCat, metCat } = tinhKichThuoc({ soLuong, khoTrai, buocCat, soHinh, laMang });

  const hatHaoCat = laMangInChiCoCongDoanIn ? 0 : tinhHaoHutCat(metCat, hangSo);

  const { danhSachGhep, tongHatHaoGhep, tongChiPhiGhep } = laMangInChiCoCongDoanIn
    ? { danhSachGhep: [], tongHatHaoGhep: 0, tongChiPhiGhep: 0 }
    : tinhCongDoanGhep({
    lop2, lop2Phu, lop3, lop4, lop5,
    khoCat, metCat, hatHaoCat, khoTrai, soHinh, hangSo,
    chieuDaiLop2: dauVao.chieuDaiLop2,
    matTruocLop2: dauVao.matTruocLop2,
    kieuGhepLop2: dauVao.kieuGhepLop2,
    bangGiaKhoNho: dauVao.bangGiaKhoNho,
  });




  const khoNLIn = khoCat;


  const metIn = metCat + hatHaoCat + tongHatHaoGhep;





  const { hatHaoIn, cpSXIn, chiPhiSXIn, donGiaVatLieuIn, chiPhiVatLieuIn, tongChiPhiIn, cpMangIn, gioSetupMangIn, gioSanXuatMangIn, tongGioMangIn, chiPhiGioMangIn } = tinhCongDoanIn({ lop1, soMau: soMau!, metIn, khoNLIn, hangSo, tyLePhuMucMuc, phiKimLoai, bangGiaKhoNho: dauVao.bangGiaKhoNho, laMangInChiCoCongDoanIn });

  const { cpSXCat, chiPhiSXCat, tongChiPhiCat } = tinhCongDoanCat({ laMang, dienTichTui, metCat, hatHaoCat, khoCat, hangSo });

  const tongChiPhiSX = tongChiPhiIn + tongChiPhiGhep + tongChiPhiCat;

  const cotLoiNhuanApDung = chonCotLoiNhuanApDung({ dauVao, lop1, lop2, lop2Phu, lop3, lop4, lop5, coKhoa });
  const dongLoiNhuanMangIn = laMangInChiCoCongDoanIn
    ? (hangSo.tyLeLoiNhuanMangIn ?? []).find(row =>
      row.nhomKhach === (dauVao.nhomKhachMangIn ?? 'normal')
      && (soMau ?? 0) >= row.soMauTu
      && (soMau ?? 0) <= row.soMauDen
    )
    : undefined;
  const tyLeLoiNhuanMacDinh = traLoiNhuan(tongChiPhiSX, cotLoiNhuanApDung, bangLoiNhuan, dauVao.nhomKhachMangIn ?? 'normal');
  const tyLeLoiNhuan = dongLoiNhuanMangIn?.tyLe ?? tyLeLoiNhuanMacDinh;


  const soTienLoiNhuan = tyLeLoiNhuan * tongChiPhiSX;


  const doanhThu = tongChiPhiSX + soTienLoiNhuan;


  const chiPhiDonVi = soLuong > 0 ? doanhThu / soLuong : 0;





  const { tongDoDay, tongGSM } = tinhDoDayVaGSM({ lop1, lop2, lop2Phu, lop3, lop4, lop5 });

  const { tongTienKhoa, khoaPerDonVi, tongTienBangKeo, bangKeoPerDonVi, tongTienQuaiXach, quaiXachPerDonVi, khoiLuongPhuKienThemPerDonVi } = tinhPhuKien({ soLuong, buocCat, hangSo, coKhoa, coBangKeo, coQuaiXach, khoiLuongKhoa, khoiLuongBangKeo });

  const chieuDaiCuonMang = dauVao.chieuDaiCuonMang || 6000;
  const soTuiPerThuungThucTe = soTuiPerThuung || 0;
  const giaThuungThucTe = giaThuung || 0;
  const { dienTichCuonMang, soThuung, tongTienThuung, thuungPerDonVi, phiDongGoiPerDonVi } = tinhDongGoi({ laMang, soLuong, khoTrai, chieuDaiCuonMang, giaThuungThucTe, soTuiPerThuungThucTe });

  const dienTichDonVi = laMang ? 1.0 : dienTichTui;


  const khoiLuongThuungPerDonVi = !laMang && soTuiPerThuungThucTe > 0 ? khoiLuongThuung / soTuiPerThuungThucTe : 0;
  const khoiLuongVatLieuPerDonVi = tinhKhoiLuongVatLieuPerDonVi({
    lop1, lop2, lop2Phu, lop3, lop4, lop5,
    dienTichDonVi, buocCat, soHinh, laMang,
    chieuDaiLop2: dauVao.chieuDaiLop2,
    kieuGhepLop2: dauVao.kieuGhepLop2,
  });
  const khoiLuongTare = khoiLuongVatLieuPerDonVi + (coQuaiXach ? khoiLuongQuaiXach : 0) + khoiLuongPhuKienThemPerDonVi + khoiLuongThuungPerDonVi;





  const { cuocVanChuyenThucTePerKm, soKmThucTe, tyLeCuocVanChuyen, tongCuocVanChuyen, cuocVanChuyenPerDonVi } = tinhVanChuyen({
    soLuong,
    cuocVanChuyenPerKm,
    soKmVanChuyen,
    vanChuyenMangIn: laMangInChiCoCongDoanIn ? {
      nguongM2: hangSo.nguongVanChuyenMangInM2 ?? 25000,
      chiPhiMoc: hangSo.chiPhiVanChuyenMangIn ?? 500000,
      mocM2: hangSo.mocVanChuyenMangInM2 ?? 30000,
    } : undefined,
  });

  const { ngayThanhToanThucTe, laiSuatCoBan, laiSuatThem, laiSuatPerDonVi } = tinhLaiVay({
    chiPhiDonVi,
    ngayThanhToan: dauVao.ngayThanhToan,
    laiSuatCoBan: hangSo.laiSuatCoBan,
    laiSuatThem: hangSo.laiSuatThem,
    laiSuatMangIn: laMangInChiCoCongDoanIn ? (hangSo.laiSuatMangIn ?? 0.01) : undefined,
  });

  const { hoaHongPerDonVi } = tinhHoaHong({ chiPhiDonVi, tyLeHoaHong, donViHoaHong: dauVao.donViHoaHong, hoaHongCoDinhVND: dauVao.hoaHongCoDinhVND });

  const { chieuDaiTrucThucTe, chuViTrucThucTe, dienTichTruc, chiPhiTrucPerDonVi, chiPhiTruc, chiPhiTrucPhanBo } = tinhTrucIn({ dauVao, hangSo, soMau: soMau || 0, laMang, dienTichTui });

  const giaCuoiCung = chiPhiDonVi + khoaPerDonVi + bangKeoPerDonVi + quaiXachPerDonVi


    + thuungPerDonVi + cuocVanChuyenPerDonVi + laiSuatPerDonVi + hoaHongPerDonVi + chiPhiTrucPhanBo;


  const ngaySanXuat = Math.ceil(soLuong / 30000) + 4;





  const chuoiCauTruc = taoChuoiCauTruc({ lop1, lop2, lop2Phu, lop3, lop4, lop5 });

  return {


    dauVao, chuoiCauTruc, tongDoDay, tongGSM,


    dienTichTui, tongDienTich, khoCatIn, chieuDaiMang,


    khoCat, metCat, hatHaoCat, cpSXCat, chiPhiSXCat, tongChiPhiCat,


    khoNLIn, metIn, hatHaoIn, cpSXIn, chiPhiSXIn, chiPhiVatLieuIn, tongChiPhiIn,
    cpMangIn, gioSetupMangIn, gioSanXuatMangIn, tongGioMangIn, chiPhiGioMangIn,


    tongChiPhiSX, tongChiPhiGhep, tyLeLoiNhuan, soTienLoiNhuan, doanhThu, chiPhiDonVi,


    khoaPerDonVi, tongTienKhoa, bangKeoPerDonVi, tongTienBangKeo,


    quaiXachPerDonVi, tongTienQuaiXach,


    thuungPerDonVi, tongTienThuung, giaThuungThucTe, soTuiPerThuungThucTe, soThuung,


    dienTichCuonMang, phiDongGoiPerDonVi, khoiLuongTare,


    cuocVanChuyenPerDonVi, tongCuocVanChuyen, tyLeCuocVanChuyen, cuocVanChuyenThucTePerKm, soKmThucTe,


    laiSuatPerDonVi, laiSuatCoBan, laiSuatThem, ngayThanhToan: ngayThanhToanThucTe,


    hoaHongPerDonVi, giaCuoiCung,


    chiPhiTruc, chiPhiTrucPerDonVi, chiPhiTrucPhanBo,


    dienTichTruc: dienTichTruc,


    chieuDaiTruc: chieuDaiTrucThucTe, chuViTruc: chuViTrucThucTe, ngaySanXuat,


    cacLop: {


      in: { vatLieu: chiPhiVatLieuIn, donGia: donGiaVatLieuIn, kho: khoNLIn, met: metIn, hatHao: hatHaoIn, cpsx: cpSXIn, chiPhiSX: chiPhiSXIn, chiPhiVL: chiPhiVatLieuIn, tongCong: tongChiPhiIn } as ChiTietLop,


      ghep: danhSachGhep.map(g => ({ vatLieu: g.chiPhiVL, donGia: g.donGia, chiTietVatLieu: g.chiTietVatLieu, kho: g.kho, met: g.met, hatHao: g.hatHao, cpsx: g.cpsx, chiPhiSX: g.chiPhiSX, chiPhiVL: g.chiPhiVL, tongCong: g.tongCong } as ChiTietLop)),


      cat: { kho: khoCat, met: metCat, hatHao: hatHaoCat, cpsx: cpSXCat, chiPhiSX: chiPhiSXCat, tongCong: tongChiPhiCat } as ChiTietLopCat,


    },


  };


}




