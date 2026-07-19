import type { HangSo } from '@lts/kieu-du-lieu';

export function tinhPhuKien(params: {
  soLuong: number; buocCat: number; hangSo: HangSo;
  coKhoa: boolean; coBangKeo: boolean; coQuaiXach: boolean;
  khoiLuongKhoa: number; khoiLuongBangKeo: number;
  tuyChonGc?: {
    boZipper?: boolean;
    quaiGc?: { giaGcMoiTui: number; giaQuaiMoiTui: number };
  };
}) {
  const { soLuong, buocCat, hangSo, coBangKeo, khoiLuongKhoa, khoiLuongBangKeo, tuyChonGc } = params;
  const coKhoa = tuyChonGc?.boZipper ? false : params.coKhoa;
  const coQuaiXach = params.coQuaiXach;

  const tongTienKhoa = coKhoa ? soLuong * buocCat * hangSo.giaKhoa : 0;
  const khoaPerDonVi = soLuong > 0 ? tongTienKhoa / soLuong : 0;
  const tongKhoiLuongKhoa = coKhoa ? soLuong * buocCat * khoiLuongKhoa : 0;
  const tongTienBangKeo = coBangKeo ? soLuong * buocCat * hangSo.giaBangKeo : 0;
  const bangKeoPerDonVi = soLuong > 0 ? tongTienBangKeo / soLuong : 0;
  const tongKhoiLuongBangKeo = coBangKeo ? soLuong * buocCat * khoiLuongBangKeo : 0;

  let tongTienQuaiXach = 0;
  let quaiXachPerDonVi = 0;
  if (tuyChonGc?.quaiGc) {
    const donGia = tuyChonGc.quaiGc.giaGcMoiTui + tuyChonGc.quaiGc.giaQuaiMoiTui;
    tongTienQuaiXach = soLuong * donGia;
    quaiXachPerDonVi = donGia;
  } else if (coQuaiXach) {
    tongTienQuaiXach = soLuong * hangSo.giaQuaiXach;
    quaiXachPerDonVi = hangSo.giaQuaiXach;
  }

  const khoiLuongPhuKienThemPerDonVi = soLuong > 0 ? (tongKhoiLuongKhoa + tongKhoiLuongBangKeo) / soLuong : 0;
  return { tongTienKhoa, khoaPerDonVi, tongKhoiLuongKhoa, tongTienBangKeo, bangKeoPerDonVi, tongKhoiLuongBangKeo, tongTienQuaiXach, quaiXachPerDonVi, khoiLuongPhuKienThemPerDonVi };
}
