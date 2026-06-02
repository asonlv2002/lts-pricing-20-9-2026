import type { VatLieu, GiaVatLieuKhoNho } from '@lts/kieu-du-lieu';

export function layVatLieu(id: string, danhSachVatLieu: VatLieu[]): VatLieu | undefined {
  return danhSachVatLieu.find(vl => vl.id === id);
}

export function laLLDPEVatLieu(vl: VatLieu): boolean {
  return vl.ten.toLowerCase().includes('lldpe') || (vl.nhom?.toLowerCase().includes('lldpe') ?? false);
}

export function nhanBanVatLieu(
  vl?: VatLieu | null,
  ghiDeDayLop: Record<string, number> = {},
  khoaLop?: string,
): VatLieu | null {
  if (!vl) return null;
  const ban = { ...vl };
  if (khoaLop && ghiDeDayLop[khoaLop] && (vl.doiDuocMic || laLLDPEVatLieu(vl))) {
    ban.doDay = ghiDeDayLop[khoaLop];
    ban.giaMoiM2 = ban.giaMoiKg * ban.doDay * ban.khoiLuongRieng / 1000;
  }
  return ban;
}

export function layGiaVatLieuTheoKho(vl: VatLieu, khoM: number, bangGiaKhoNho: GiaVatLieuKhoNho[] = []): number {
  const khoMm = khoM * 1000;
  const mucGia = bangGiaKhoNho
    .filter(row => row.vatLieuId === vl.id && khoMm <= row.nguongKhoMm)
    .sort((a, b) => a.nguongKhoMm - b.nguongKhoMm)[0];
  return mucGia?.giaMoiM2 ?? vl.giaMoiM2 ?? 0;
}
