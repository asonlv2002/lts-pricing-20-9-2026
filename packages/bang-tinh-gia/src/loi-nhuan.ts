import type { DauVaoTinhGia, VatLieu } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP } from '@lts/hang-so';

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

const boDauTiengViet = (chuoi: string) => chuoi.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd')
  .replace(/\u0110/g, 'D');

export function chonCotLoiNhuanApDung(params: {
  dauVao: DauVaoTinhGia;
  lop1: VatLieu;
  lop2: VatLieu | null;
  lop2Phu: VatLieu | null;
  lop3: VatLieu | null;
  lop4: VatLieu | null;
  lop5: VatLieu | null;
  coKhoa: boolean;
}): number {
  const { dauVao, lop1, lop2, lop2Phu, lop3, lop4, lop5, coKhoa } = params;
  const laMangIn = dauVao.loaiSanPham === 'mang' && dauVao.loaiMang === 'mangIn';
  const cacLopVatLy = (laMangIn ? [lop1] : [lop1, lop2, lop3, lop4, lop5]).filter((vl): vl is VatLieu => !!vl);
  const cacVatLieuDangDung = (laMangIn ? cacLopVatLy : [...cacLopVatLy, lop2Phu]).filter((vl): vl is VatLieu => !!vl);
  const coVatLieuDacBiet = cacVatLieuDangDung.some((vl) => {
    const chuoiKiemTra = boDauTiengViet(`${vl.id ?? ''} ${vl.ten ?? ''} ${vl.nhom ?? ''}`).toUpperCase();
    return chuoiKiemTra.includes('MPET')
      || /(^|[^A-Z])AL([^A-Z]|$)/.test(chuoiKiemTra)
      || chuoiKiemTra.includes('GIAY')
      || chuoiKiemTra.includes('PAPER');
  });
  const laTuiDacBiet = dauVao.loaiSanPham === 'tui' && (dauVao.loaiTui === 'dayDung' || coKhoa);
  const laNhieuLopCanCotPhai = (dauVao.loaiSanPham === 'tui' || dauVao.loaiSanPham === 'mang') && cacLopVatLy.length >= 3;
  return (laNhieuLopCanCotPhai || laTuiDacBiet || coVatLieuDacBiet) ? 2 : 1;
}
