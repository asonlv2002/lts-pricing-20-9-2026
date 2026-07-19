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

export function tinhCpsxGcM2(giaMoiM2: number, m2Tp: number): number {
  return Math.max(0, giaMoiM2) * Math.max(0, m2Tp);
}

export function tinhCpsxGcDonVi(giaMoiDv: number, soLuong: number): number {
  return Math.max(0, giaMoiDv) * Math.max(0, soLuong);
}
