import type { CongDoanGiaCong, GiaCongNgoai } from '@lts/kieu-du-lieu';

export function coCongDoanGc(
  gc: GiaCongNgoai | undefined,
  cd: CongDoanGiaCong,
): boolean {
  return !!gc?.congDoan?.includes(cd);
}

/** Phi hao (m) = metTp × (tyLePct/100) + setupM */
export function tinhHatHaoGc(metTp: number, tyLePct: number, setupM: number): number {
  return metTp * (Math.max(0, tyLePct) / 100) + Math.max(0, setupM);
}

/** CPSX in/ghép/chia GC LTS: đơn giá × (mét + phi hao) × khổ — khớp bảng ghi đè Sale/Admin */
export function tinhCpsxGcDienTich(
  giaMoiM2: number,
  met: number,
  hatHao: number,
  kho: number,
): number {
  return Math.max(0, giaMoiM2) * Math.max(0, met + hatHao) * Math.max(0, kho);
}

export function tinhCpsxGcDonVi(giaMoiDv: number, soLuong: number): number {
  return Math.max(0, giaMoiDv) * Math.max(0, soLuong);
}