import type { HangSo } from '@lts/kieu-du-lieu';
import { tinhCpsxGcDienTich, tinhCpsxGcDonVi } from './gia-cong-ngoai';

export interface GiaCongCatParams {
  /** Chia — CPSX theo m² TP */
  chia?: { bat: boolean; giaGcMoiM2: number };
  /** Làm túi — CPSX theo số túi (ghi đè CPSX cat khi productType túi) */
  lamTui?: { bat: boolean; giaGcMoiTui: number; soLuong: number };
}

export function tinhCongDoanCat(params: {
  laMang: boolean;
  dienTichTui: number;
  metCat: number;
  hatHaoCat: number;
  khoCat: number;
  hangSo: HangSo;
  giaCongCat?: GiaCongCatParams;
}) {
  const { laMang, dienTichTui, metCat, hatHaoCat, khoCat, hangSo, giaCongCat } = params;
  let cpSXCat = 0, chiPhiSXCat = 0, tongChiPhiCat = 0;

  if (giaCongCat?.chia?.bat) {
    chiPhiSXCat = tinhCpsxGcDienTich(giaCongCat.chia.giaGcMoiM2, metCat, khoCat);
    cpSXCat = giaCongCat.chia.giaGcMoiM2;
    tongChiPhiCat = chiPhiSXCat;
    return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
  }

  if (giaCongCat?.lamTui?.bat && !laMang) {
    chiPhiSXCat = tinhCpsxGcDonVi(giaCongCat.lamTui.giaGcMoiTui, giaCongCat.lamTui.soLuong);
    cpSXCat = giaCongCat.lamTui.soLuong > 0 ? chiPhiSXCat / ((hatHaoCat + metCat) * khoCat || 1) : 0;
    tongChiPhiCat = chiPhiSXCat;
    return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
  }

  if (!laMang) {
    const cpCatCoBan = hangSo.cpCatCoBan || 971;
    const quyTac = hangSo.quyTacCat?.length
      ? hangSo.quyTacCat
      : [
        { nhan: 'Nhỏ', nguong: hangSo.nguongCat1 || 0.07, heSo: hangSo.heSoCat1 || 1.4 },
        { nhan: 'Trung bình', nguong: hangSo.nguongCat2 || 0.2, heSo: hangSo.heSoCat2 || 1.2 },
        { nhan: 'Lớn', nguong: null, heSo: hangSo.heSoCat3 || 0.8 },
      ];
    const quyTacApDung = quyTac.find(rule => rule.nguong == null || dienTichTui < rule.nguong) ?? quyTac[quyTac.length - 1];
    cpSXCat = cpCatCoBan * (quyTacApDung?.heSo ?? 0);
    chiPhiSXCat = cpSXCat * (hatHaoCat + metCat) * khoCat;
    tongChiPhiCat = chiPhiSXCat;
  }
  return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
}
