import type { VatLieu } from '@lts/kieu-du-lieu';

export function tinhDoDayVaGSM(params: { lop1: VatLieu; lop2: VatLieu | null; lop2Phu: VatLieu | null; lop3: VatLieu | null; lop4: VatLieu | null; lop5: VatLieu | null }) {
  const { lop1, lop2, lop2Phu, lop3, lop4, lop5 } = params;
  const doDayLop2 = Math.max(lop2?.doDay || 0, lop2Phu?.doDay || 0);
  const doDayTho = lop1.doDay + doDayLop2 + (lop3?.doDay || 0) + (lop4?.doDay || 0) + (lop5?.doDay || 0);
  const soLopHoatDong = 1 + (lop2 ? 1 : 0) + (lop3 ? 1 : 0) + (lop4 ? 1 : 0) + (lop5 ? 1 : 0);
  const tongDoDay = Math.round((doDayTho + (soLopHoatDong - 1) * 3) / 5) * 5;
  const tinhGSMLop = (doDay: number, kl: number) => (doDay / 1000000) * (kl * 1000000);
  const tongGSM = tinhGSMLop(lop1.doDay, lop1.khoiLuongRieng)
    + (lop2 ? tinhGSMLop(lop2.doDay, lop2.khoiLuongRieng) : 0)
    + (lop2Phu ? tinhGSMLop(lop2Phu.doDay, lop2Phu.khoiLuongRieng) : 0)
    + (lop3 ? tinhGSMLop(lop3.doDay, lop3.khoiLuongRieng) : 0)
    + (lop4 ? tinhGSMLop(lop4.doDay, lop4.khoiLuongRieng) : 0)
    + (lop5 ? tinhGSMLop(lop5.doDay, lop5.khoiLuongRieng) : 0);
  return { tongDoDay, tongGSM };
}

export function taoChuoiCauTruc(params: { lop1: VatLieu; lop2: VatLieu | null; lop2Phu: VatLieu | null; lop3: VatLieu | null; lop4: VatLieu | null; lop5: VatLieu | null }) {
  const { lop1, lop2, lop2Phu, lop3, lop4, lop5 } = params;
  let chuoiCauTruc = lop1.ten + ' ' + lop1.doDay;
  if (lop2) chuoiCauTruc += '//' + (lop2Phu ? `[${lop2.ten} ${lop2.doDay} + ${lop2Phu.ten} ${lop2Phu.doDay}]` : lop2.ten + ' ' + lop2.doDay);
  if (lop3) chuoiCauTruc += '//' + lop3.ten + ' ' + lop3.doDay;
  if (lop4) chuoiCauTruc += '//' + lop4.ten + ' ' + lop4.doDay;
  if (lop5) chuoiCauTruc += '//' + lop5.ten + ' ' + lop5.doDay;
  return chuoiCauTruc;
}
