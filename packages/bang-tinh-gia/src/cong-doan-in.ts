import type { HangSo, VatLieu, GiaVatLieuKhoNho } from '@lts/kieu-du-lieu';
import { layGiaVatLieuTheoKho } from './vat-lieu';
import { tinhHaoHutIn } from './hao-hut';

export function tinhCongDoanIn(params: { lop1: VatLieu; soMau: number; metIn: number; khoNLIn: number; hangSo: HangSo; tyLePhuMucMuc: number; phiKimLoai: number; bangGiaKhoNho?: GiaVatLieuKhoNho[] }) {
  const { lop1, soMau, metIn, khoNLIn, hangSo, tyLePhuMucMuc, phiKimLoai, bangGiaKhoNho } = params;
  const { hatHaoIn } = tinhHaoHutIn(metIn, soMau, hangSo);
  const giaMucPerMau = lop1.giaMucMoiMau || (lop1.laPEThoaPA ? 135 : 120);
  const cpSXIn = soMau > 0 ? (soMau * giaMucPerMau * tyLePhuMucMuc + hangSo.chiPhiNhanCong + phiKimLoai) : 0;
  const chiPhiSXIn = cpSXIn * (hatHaoIn + metIn) * khoNLIn;
  const donGiaVatLieuIn = layGiaVatLieuTheoKho(lop1, khoNLIn, bangGiaKhoNho);
  const chiPhiVatLieuIn = donGiaVatLieuIn * (hatHaoIn + metIn) * khoNLIn;
  const tongChiPhiIn = chiPhiSXIn + chiPhiVatLieuIn;
  return { hatHaoIn, cpSXIn, chiPhiSXIn, donGiaVatLieuIn, chiPhiVatLieuIn, tongChiPhiIn };
}
