import type { HangSo } from '@lts/kieu-du-lieu';

export function tinhPhuKien(params: {
  soLuong: number; buocCat: number; hangSo: HangSo;
  coKhoa: boolean; coBangKeo: boolean; coQuaiXach: boolean;
  khoiLuongKhoa: number; khoiLuongBangKeo: number;
}) {
  const { soLuong, buocCat, hangSo, coKhoa, coBangKeo, coQuaiXach, khoiLuongKhoa, khoiLuongBangKeo } = params;
  const tongTienKhoa = coKhoa ? soLuong * buocCat * hangSo.giaKhoa : 0;
  const khoaPerDonVi = soLuong > 0 ? tongTienKhoa / soLuong : 0;
  const tongKhoiLuongKhoa = coKhoa ? soLuong * buocCat * khoiLuongKhoa : 0;
  const tongTienBangKeo = coBangKeo ? soLuong * buocCat * hangSo.giaBangKeo : 0;
  const bangKeoPerDonVi = soLuong > 0 ? tongTienBangKeo / soLuong : 0;
  const tongKhoiLuongBangKeo = coBangKeo ? soLuong * buocCat * khoiLuongBangKeo : 0;
  const tongTienQuaiXach = coQuaiXach ? soLuong * hangSo.giaQuaiXach : 0;
  const quaiXachPerDonVi = coQuaiXach ? hangSo.giaQuaiXach : 0;
  const khoiLuongPhuKienThemPerDonVi = soLuong > 0 ? (tongKhoiLuongKhoa + tongKhoiLuongBangKeo) / soLuong : 0;
  return { tongTienKhoa, khoaPerDonVi, tongKhoiLuongKhoa, tongTienBangKeo, bangKeoPerDonVi, tongKhoiLuongBangKeo, tongTienQuaiXach, quaiXachPerDonVi, khoiLuongPhuKienThemPerDonVi };
}
