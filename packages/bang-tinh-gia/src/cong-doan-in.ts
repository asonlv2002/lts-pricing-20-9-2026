import type { HangSo, VatLieu, GiaVatLieuKhoNho } from '@lts/kieu-du-lieu';
import { layGiaVatLieuTheoKho } from './vat-lieu';
import { tinhHaoHutIn } from './hao-hut';

function laBOPP(lop1: VatLieu): boolean {
  const chuoi = `${lop1.id} ${lop1.ten} ${lop1.nhom ?? ''}`.toUpperCase();
  return chuoi.includes('BOPP');
}

export function tinhCongDoanIn(params: { lop1: VatLieu; soMau: number; metIn: number; khoNLIn: number; hangSo: HangSo; tyLePhuMucMuc: number; phiKimLoai: number; bangGiaKhoNho?: GiaVatLieuKhoNho[]; laMangInChiCoCongDoanIn?: boolean }) {
  const { lop1, soMau, metIn, khoNLIn, hangSo, tyLePhuMucMuc, phiKimLoai, bangGiaKhoNho, laMangInChiCoCongDoanIn } = params;
  const { hatHaoIn } = tinhHaoHutIn(metIn, soMau, hangSo);
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
