// ═══════════════════════════════════════════════════════════════════════════
// @lts/hang-so — Hằng số & dữ liệu mặc định
// ═══════════════════════════════════════════════════════════════════════════
import type { VatLieu, HangSo, DongLoiNhuan } from '@lts/kieu-du-lieu';
export type { DongLoiNhuan } from '@lts/kieu-du-lieu';

import duLieuVatLieu  from './du-lieu/vat-lieu.json';
import duLieuHangSo   from './du-lieu/hang-so.json';
import duLieuLoiNhuan from './du-lieu/bang-loi-nhuan.json';

export const VAT_LIEU_MAC_DINH: VatLieu[] = (
  duLieuVatLieu as any[]
).map((vl: any) => ({
  id: vl.id,
  ten: vl.name,
  nhom: vl.group,
  khoiLuongRieng: vl.density,
  doDay: vl.thickness,
  giaMoiKg: vl.pricePerKg,
  laPEThoaPA: vl.isPETorPA,
  doiDuocMic: vl.adjustableMic,
  chieuDaiCuon: vl.rollLength,
  giaMucMoiMau: vl.inkPricePerColor,
  giaMoiM2: vl.pricePerKg * vl.thickness * vl.density / 1000,
}));

export const BANG_LOI_NHUAN_MAC_DINH: DongLoiNhuan[] = (
  duLieuLoiNhuan.rows as any[]
).map((d: any) => ({ nguong: d.threshold, cot1: d.col1, cot2: d.col2 }));

export const LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP: { cot1: number; cot2: number } = {
  cot1: (duLieuLoiNhuan.profitDefault as any).col1,
  cot2: (duLieuLoiNhuan.profitDefault as any).col2,
};

const raw = duLieuHangSo as any;

export const HANG_SO_MAC_DINH: HangSo = {
  giaKhoa:               raw.zipperPrice,
  khoiLuongKhoa:         raw.zipperWeight,
  giaBangKeo:            raw.tapePrice,
  khoiLuongBangKeo:      raw.tapeWeight,
  giaQuaiXach:           raw.handlePrice,
  khoiLuongQuaiXach:     raw.handleWeight,
  loaiQuai: (raw.handleOptions ?? []).map((option: any) => ({
    key: option.key,
    label: option.label,
    price: option.price,
    weight: option.weight,
  })),
  giaThuungMacDinh:      raw.boxPriceDefault,
  soTuiPerThuungMacDinh: raw.bagsPerBoxDefault,
  loaiThuung: (raw.boxOptions ?? []).map((option: any) => ({
    key: option.key,
    label: option.label,
    price: option.price,
    weight: option.weight,
  })),
  laiSuatMacDinh:        raw.interestBase ?? raw.interestRate,  // backward-compat
  laiSuatCoBan:          raw.interestBase  ?? 0.10,
  laiSuatThem:           raw.interestSpread ?? 0.03,
  ngayThanhToanMacDinh:  raw.paymentDays,
  giaTrucDonVi:          raw.cylinderPricePerUnit,
  giaTrucA:              raw.cylPriceA ?? raw.cylinderPricePerUnit,
  giaTrucB:              raw.cylPriceB ?? 6500000,
  cpSXGhep:              raw.ghepCPSX,
  hatHaoGhepA:           raw.ghepWasteA,
  hatHaoGhepB:           raw.ghepWasteB,
  hatHaoGhepC:           raw.ghepWasteC,
  hatHaoCatA:            raw.cutWasteA,
  hatHaoCatB:            raw.cutWasteB,
  hatHaoCatC:            raw.cutWasteC,
  cuocVanChuyenMacDinh:  raw.shippingPerKmDefault,
  soKmMacDinh:           raw.shippingKmDefault,
  chiPhiNhanCong:        raw.laborCost,
  cpCatCoBan:            raw.cutBase,
  nguongCat1:            raw.cutThreshold1,
  nguongCat2:            raw.cutThreshold2,
  heSoCat1:              raw.cutMult1,
  heSoCat2:              raw.cutMult2,
  heSoCat3:              raw.cutMult3,
  quyTacCat: (raw.cutRules ?? []).map((rule: any) => ({
    nhan: rule.label,
    nguong: rule.threshold,
    heSo: rule.multiplier,
  })),
  giaNhu:                raw.nhuPrice,
  giaMo:                 raw.moPrice,
  chiPhiCaiDatMau: Object.fromEntries(
    Object.entries(raw.colorSetup as Record<string, number>).map(([k, v]) => [Number(k), v])
  ) as Record<number, number>,
  hatHaoInA: raw.printWasteA,
  hatHaoInB: raw.printWasteB,
  hatHaoInC: raw.printWasteC,
  hatHaoInD: raw.printWasteD,
  giaMucMangInBOPP: raw.printFilmInkPriceBopp ?? raw.printFilmInkPriceBopp18 ?? 150,
  giaMucMangInKhac: raw.printFilmInkPriceOther ?? 200,
  phutSetupMangInMoiMau: raw.printFilmSetupMinutesPerColor ?? 20,
  mauSoGioSetupMangIn: raw.printFilmSetupHourDivisor ?? 60,
  nguongMetMangIn: raw.printFilmLengthThreshold ?? 40000,
  tocDoMangInNgan: raw.printFilmShortRunSpeed ?? 7500,
  chiPhiGioMangIn: raw.printFilmLaborCostPerHour ?? 1200000,
  nguongVanChuyenMangInM2: raw.printFilmShippingThresholdM2 ?? 25000,
  chiPhiVanChuyenMangIn: raw.printFilmShippingBaseCost ?? 500000,
  mocVanChuyenMangInM2: raw.printFilmShippingLargeOrderM2 ?? 30000,
  laiSuatMangIn: raw.printFilmInterestRate ?? 0.01,
  tyLeLoiNhuanMangIn: (raw.printFilmProfitRates ?? []).map((row: any) => ({
    nhomKhach: row.customerGroup,
    soMauTu: row.colorFrom,
    soMauDen: row.colorTo,
    tyLe: row.rate,
  })),
};
