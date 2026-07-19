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


function n(v: number | undefined): number {
  return v != null && Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** Cộng phụ phí GC theo loại (VNĐ tổng) từ mọi CD đã cấu hình */
export function tongPhuPhiGcTheoLoai(gc: GiaCongNgoai | undefined): {
  vanChuyen: number;
  dongGoi: number;
  khac: number;
} {
  let vanChuyen = 0;
  let dongGoi = 0;
  let khac = 0;
  if (!gc) return { vanChuyen, dongGoi, khac };
  const add = (x?: { vanChuyenVnd?: number; dongGoiVnd?: number; phuPhiKhacVnd?: number }) => {
    if (!x) return;
    vanChuyen += n(x.vanChuyenVnd);
    dongGoi += n(x.dongGoiVnd);
    khac += n(x.phuPhiKhacVnd);
  };
  add(gc.in);
  add(gc.ghep);
  add(gc.chia);
  add(gc.lamTui);
  add(gc.ganQuai);
  add(gc.baoPp);
  return { vanChuyen, dongGoi, khac };
}

/** S' = S × (1 + LN + r); /đv = S'/SL — r = laiSuatPerDonVi/chiPhiDonVi */
export function tinhPhuPhiGcVaoDonGia(params: {
  tongVanChuyen: number;
  tongDongGoi: number;
  tongKhac: number;
  tyLeLoiNhuan: number;
  laiSuatPerDonVi: number;
  chiPhiDonVi: number;
  soLuong: number;
}): {
  vanChuyenGcPerDonVi: number;
  dongGoiGcPerDonVi: number;
  phuPhiKhacGcPerDonVi: number;
  tongVanChuyenGc: number;
  tongDongGoiGc: number;
  tongPhuPhiKhacGc: number;
} {
  const r =
    params.chiPhiDonVi > 0 ? params.laiSuatPerDonVi / params.chiPhiDonVi : 0;
  const heSo = 1 + Math.max(0, params.tyLeLoiNhuan) + Math.max(0, r);
  const scale = (s: number) => Math.max(0, s) * heSo;
  const tongVanChuyenGc = scale(params.tongVanChuyen);
  const tongDongGoiGc = scale(params.tongDongGoi);
  const tongPhuPhiKhacGc = scale(params.tongKhac);
  const sl = params.soLuong > 0 ? params.soLuong : 0;
  return {
    tongVanChuyenGc,
    tongDongGoiGc,
    tongPhuPhiKhacGc,
    vanChuyenGcPerDonVi: sl > 0 ? tongVanChuyenGc / sl : 0,
    dongGoiGcPerDonVi: sl > 0 ? tongDongGoiGc / sl : 0,
    phuPhiKhacGcPerDonVi: sl > 0 ? tongPhuPhiKhacGc / sl : 0,
  };
}
