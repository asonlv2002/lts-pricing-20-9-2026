export function tinhVanChuyen(params: { soLuong: number; cuocVanChuyenPerKm?: number; soKmVanChuyen?: number; vanChuyenMangIn?: { nguongM2: number; chiPhiMoc: number; mocM2: number } }) {
  if (params.vanChuyenMangIn && params.soLuong > 0) {
    const { nguongM2, chiPhiMoc, mocM2 } = params.vanChuyenMangIn;
    const tongCuocVanChuyen = params.soLuong < nguongM2
      ? chiPhiMoc
      : (mocM2 > 0 ? params.soLuong / mocM2 * chiPhiMoc : 0);
    const cuocVanChuyenPerDonVi = tongCuocVanChuyen / params.soLuong;
    return { cuocVanChuyenThucTePerKm: chiPhiMoc, soKmThucTe: 0, tyLeCuocVanChuyen: tongCuocVanChuyen, tongCuocVanChuyen, cuocVanChuyenPerDonVi };
  }
  const cuocVanChuyenThucTePerKm = params.cuocVanChuyenPerKm || 0;
  const soKmThucTe = params.soKmVanChuyen || 0;
  const tyLeCuocVanChuyen = cuocVanChuyenThucTePerKm * soKmThucTe;
  const tongCuocVanChuyen = tyLeCuocVanChuyen;
  const cuocVanChuyenPerDonVi = params.soLuong > 0 ? tongCuocVanChuyen / params.soLuong : 0;
  return { cuocVanChuyenThucTePerKm, soKmThucTe, tyLeCuocVanChuyen, tongCuocVanChuyen, cuocVanChuyenPerDonVi };
}

export function tinhLaiVay(params: { chiPhiDonVi: number; ngayThanhToan?: number; laiSuatCoBan?: number; laiSuatThem?: number; laiSuatMangIn?: number }) {
  if (params.laiSuatMangIn != null) {
    const laiSuatPerDonVi = params.chiPhiDonVi * params.laiSuatMangIn;
    return { ngayThanhToanThucTe: 0, laiSuatCoBan: params.laiSuatMangIn, laiSuatThem: 0, laiSuatPerDonVi };
  }
  const ngayThanhToanThucTe = params.ngayThanhToan || 30;
  const laiSuatCoBan = params.laiSuatCoBan ?? 0.10;
  const laiSuatThem = params.laiSuatThem ?? 0.03;
  const laiSuatPerDonVi = (laiSuatCoBan + laiSuatThem) / 12 * (ngayThanhToanThucTe / 30) * params.chiPhiDonVi;
  return { ngayThanhToanThucTe, laiSuatCoBan, laiSuatThem, laiSuatPerDonVi };
}

export function tinhHoaHong(params: { chiPhiDonVi: number; tyLeHoaHong: number; donViHoaHong?: string; hoaHongCoDinhVND?: number }) {
  const hoaHongCoDinhVND = params.hoaHongCoDinhVND || 0;
  const hoaHongPerDonVi = params.donViHoaHong === 'vnd' ? hoaHongCoDinhVND : params.tyLeHoaHong * params.chiPhiDonVi;
  return { hoaHongCoDinhVND, hoaHongPerDonVi };
}
