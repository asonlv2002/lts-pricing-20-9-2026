// Ambient khai báo cho các web lib được bundle vào engine (P3/P4).
// tsc gate chỉ type-check engine-entry.ts; web libs coi như `any` (esbuild bundle
// mới là nguồn thật) — tránh kéo cả cây apps/web (DOM/Next types) vào gate.
declare module '@web/engine' {
  export const layCotLoiNhuanTuDong: any;
  export const traLoiNhuanTheoBang: any;
  export const tinhGiaWeb: any;
  export const synthesizeResultFromCommercial: any;
  export const tinhGiaThuongMai: any;
}
declare module '@web/manager-calculation' {
  export const lapDongSanXuat: any;
  export const xuLyDongGhiDe: any;
  export const tinhGiaHieuLuc: any;
}
declare module '@web/dac-ta-nang-cao' {
  export const chuanBiUniRowsNangCao: any;
  export const lapDongVatLieuNangCao: any;
  export const lapDongNhanCongDien: any;
  export const tinhTongNangCao: any;
  export const tinhKetQuaNangCaoHieuLuc: any;
  export const canLanChiaNangCao: any;
}
declare module '@web/chot-gia-allocation' {
  export const tinhNhapPhanBoChotGia: any;
}
declare module '@web/pricing-display' {
  export const getPricingDisplayMeta: any;
}
declare module '@web/gia-de-xuat-hien-thi' {
  export const tinhGiaDeXuatHienThi: any;
}
declare module '@web/cpsx-nang-cao-pin' {
  export const apCpsxNangCaoVaoHangSo: any;
  export const trichCpsxNangCao: any;
}
