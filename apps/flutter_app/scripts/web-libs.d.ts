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
declare module '@web/cpsx-upgrade-electric' {
  export const chuanHoaCpsxUpgradeElectric: any;
  export const dinhDangGioMask: any;
  export const dongBoGiaDangApSauSuaSlot: any;
  export const tinhDienMoiPhut: any;
  export const tinhGiaDienTbCong: any;
  export const tinhGiaDienTbTrongSo: any;
  export const tinhSoGioTuKhungGio: any;
}
declare module '@web/cpsx-upgrade-labor' {
  export const chuanHoaCpsxUpgradeLabor: any;
  export const taoMayTinhWorkspaceMacDinh: any;
  export const tinhBieuThuc: any;
  export const tokenHoaBieuThuc: any;
}
declare module '@web/cpsx-upgrade-ink' {
  export const chuanHoaCpsxUpgradeInk: any;
  export const tinhCpMucInMoiM2: any;
  export const tinhGiaKeoTbTrongSo: any;
  export const tinhGiaKeoTbCong: any;
  export const tinhGiaMucTbTrongSo: any;
  export const tinhGiaMucTbCong: any;
  export const lapBangGiaInTheoMau: any;
}
declare module '@web/cpsx-upgrade-thoigian' {
  export const chuanHoaCpsxUpgradeThoiGian: any;
  export const CATALOG_LOAI_TUI_SETUP: any;
  export const tinhThoiGianMayIn: any;
  export const tinhThoiGianMayGhep: any;
  export const tinhThoiGianMayChia: any;
  export const tinhThoiGianMayTui: any;
}
declare module '@web/data' {
  export const DEFAULT_CPSX_UPGRADE_ELECTRIC: any;
  export const DEFAULT_CPSX_UPGRADE_LABOR: any;
  export const DEFAULT_CPSX_UPGRADE_INK: any;
  export const DEFAULT_CPSX_UPGRADE_THOIGIAN: any;
}
