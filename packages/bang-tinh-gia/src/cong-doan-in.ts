import type { HangSo, VatLieu, GiaVatLieuKhoNho, NguonMangGiaCong } from '@lts/kieu-du-lieu';
import { layGiaVatLieuTheoKho } from './vat-lieu';
import { tinhHaoHutIn } from './hao-hut';
import { tinhHatHaoGc, tinhCpsxGcDienTich } from './gia-cong-ngoai';

/** Sản phẩm chạy lần đầu: cộng thêm vào phi hao in (m) */
export const HAO_HUT_IN_CHAY_LAN_DAU_M = 500;

function laBOPP(lop1: VatLieu): boolean {
  const chuoi = `${lop1.id} ${lop1.ten} ${lop1.nhom ?? ''}`.toUpperCase();
  return chuoi.includes('BOPP');
}

export interface GiaCongInParams {
  bat: boolean;
  nguonMang: NguonMangGiaCong;
  tyLePhiHao?: number;
  phiHaoSetupM?: number;
  giaGcMoiM2?: number;
  giaMuaMangMoiM2?: number;
}

export function tinhCongDoanIn(params: {
  lop1: VatLieu;
  soMau: number;
  metIn: number;
  khoNLIn: number;
  hangSo: HangSo;
  tyLePhuMucMuc: number;
  phiKimLoai: number;
  bangGiaKhoNho?: GiaVatLieuKhoNho[];
  laMangInChiCoCongDoanIn?: boolean;
  giaCongIn?: GiaCongInParams;
  /** Sản phẩm chạy lần đầu → phi hao in +HAO_HUT_IN_CHAY_LAN_DAU_M (chỉ in nội bộ) */
  chayLanDau?: boolean;
}) {
  const { lop1, soMau, metIn, khoNLIn, hangSo, tyLePhuMucMuc, phiKimLoai, bangGiaKhoNho, laMangInChiCoCongDoanIn, giaCongIn, chayLanDau } = params;

  if (giaCongIn?.bat) {
    if (giaCongIn.nguonMang === 'ben_ngoai') {
      const donGia = giaCongIn.giaMuaMangMoiM2 ?? 0;
      const dienTich = metIn * khoNLIn;
      return {
        hatHaoIn: 0,
        cpSXIn: 0,
        chiPhiSXIn: 0,
        donGiaVatLieuIn: donGia,
        chiPhiVatLieuIn: donGia * dienTich,
        tongChiPhiIn: donGia * dienTich,
        cpMangIn: 0,
        gioSetupMangIn: 0,
        gioSanXuatMangIn: 0,
        tongGioMangIn: 0,
        chiPhiGioMangIn: 0,
      };
    }
    const hatHaoIn = tinhHatHaoGc(metIn, giaCongIn.tyLePhiHao ?? 0, giaCongIn.phiHaoSetupM ?? 0);
    const chiPhiSXIn = tinhCpsxGcDienTich(giaCongIn.giaGcMoiM2 ?? 0, metIn, khoNLIn);
    const dienTichDauVaoIn = (hatHaoIn + metIn) * khoNLIn;
    const donGiaVatLieuIn = layGiaVatLieuTheoKho(lop1, khoNLIn, bangGiaKhoNho);
    const chiPhiVatLieuIn = donGiaVatLieuIn * dienTichDauVaoIn;
    const cpSXIn = giaCongIn.giaGcMoiM2 ?? 0;
    return {
      hatHaoIn,
      cpSXIn,
      chiPhiSXIn,
      donGiaVatLieuIn,
      chiPhiVatLieuIn,
      tongChiPhiIn: chiPhiSXIn + chiPhiVatLieuIn,
      cpMangIn: 0,
      gioSetupMangIn: 0,
      gioSanXuatMangIn: 0,
      tongGioMangIn: 0,
      chiPhiGioMangIn: 0,
    };
  }

  const { hatHaoIn: hatHaoInGoc } = tinhHaoHutIn(metIn, soMau, hangSo);
  // Sản phẩm chạy lần đầu: +500m phi hao in (chỉ in nội bộ; in GC giữ nguyên theo cấu hình GC)
  const hatHaoIn = hatHaoInGoc + (chayLanDau && soMau > 0 ? HAO_HUT_IN_CHAY_LAN_DAU_M : 0);
  const dienTichDauVaoIn = (hatHaoIn + metIn) * khoNLIn;
  const giaMucPerMau = laMangInChiCoCongDoanIn
    ? (laBOPP(lop1) ? (hangSo.giaMucMangInBOPP ?? 150) : (hangSo.giaMucMangInKhac ?? 200))
    : (lop1.giaMucMoiMau || (lop1.laPEThoaPA ? 135 : 120));
  const cpSXIn = soMau > 0
    ? (laMangInChiCoCongDoanIn
      ? (soMau * giaMucPerMau + phiKimLoai)
      : (soMau * giaMucPerMau * tyLePhuMucMuc + hangSo.chiPhiNhanCong + phiKimLoai))
    : 0;
  const chiPhiSXIn = cpSXIn * dienTichDauVaoIn;
  const donGiaVatLieuIn = layGiaVatLieuTheoKho(lop1, khoNLIn, bangGiaKhoNho);
  const chiPhiVatLieuIn = donGiaVatLieuIn * dienTichDauVaoIn;
  let cpMangIn = 0;
  let gioSetupMangIn = 0;
  let gioSanXuatMangIn = 0;
  let tongGioMangIn = 0;
  let chiPhiGioMangIn = 0;
  if (laMangInChiCoCongDoanIn && soMau > 0) {
    const phutSetup = hangSo.phutSetupMangInMoiMau ?? 20;
    const mauSoGio = hangSo.mauSoGioSetupMangIn ?? 60;
    const nguongMet = hangSo.nguongMetMangIn ?? 40000;
    const tocDoNgan = hangSo.tocDoMangInNgan ?? 7500;
    chiPhiGioMangIn = hangSo.chiPhiGioMangIn ?? 1200000;
    gioSetupMangIn = mauSoGio > 0 ? soMau * phutSetup / mauSoGio : 0;
    gioSanXuatMangIn = tocDoNgan > 0 ? metIn / tocDoNgan : 0;
    if (metIn >= nguongMet && nguongMet > 0) gioSanXuatMangIn += metIn / nguongMet;
    tongGioMangIn = gioSetupMangIn + gioSanXuatMangIn;
    cpMangIn = tongGioMangIn * chiPhiGioMangIn;
  }
  const tongChiPhiIn = chiPhiSXIn + chiPhiVatLieuIn + cpMangIn;
  return { hatHaoIn, cpSXIn, chiPhiSXIn, donGiaVatLieuIn, chiPhiVatLieuIn, tongChiPhiIn, cpMangIn, gioSetupMangIn, gioSanXuatMangIn, tongGioMangIn, chiPhiGioMangIn };
}
