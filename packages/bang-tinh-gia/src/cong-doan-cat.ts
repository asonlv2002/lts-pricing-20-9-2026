import type { HangSo } from '@lts/kieu-du-lieu';
import { tinhCpsxGcDienTich, tinhCpsxGcDonVi } from './gia-cong-ngoai';

export interface GiaCongCatParams {
  /** Chia — CPSX theo m² TP */
  chia?: { bat: boolean; giaGcMoiM2: number };
  /** Làm túi — CPSX theo số túi (ghi đè CPSX cat khi productType túi) */
  lamTui?: { bat: boolean; giaGcMoiTui: number; giaGcMoiM2?: number; soLuong: number };
}

function so(v: number | undefined): number {
  return v != null && Number.isFinite(v) ? v : 0;
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
    const giaTui = Math.max(0, so(giaCongCat.lamTui.giaGcMoiTui));
    const giaM2 = Math.max(0, so(giaCongCat.lamTui.giaGcMoiM2));
    if (giaTui > 0) {
      // Ưu tiên đơn giá theo túi: tổng = giá/túi × số túi
      chiPhiSXCat = tinhCpsxGcDonVi(giaTui, giaCongCat.lamTui.soLuong);
      cpSXCat = giaCongCat.lamTui.soLuong > 0 ? chiPhiSXCat / ((hatHaoCat + metCat) * khoCat || 1) : 0;
      tongChiPhiCat = chiPhiSXCat;
      return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
    }
    if (giaM2 > 0) {
      // Đơn giá theo m²: tổng = giá/m² × (TP + phi hao) × khổ
      chiPhiSXCat = tinhCpsxGcDienTich(giaM2, hatHaoCat + metCat, khoCat);
      cpSXCat = giaM2;
      tongChiPhiCat = chiPhiSXCat;
      return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
    }
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
