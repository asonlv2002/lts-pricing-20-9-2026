import type { HangSo } from '@lts/kieu-du-lieu';

export function tinhCongDoanCat(params: { laMang: boolean; dienTichTui: number; metCat: number; hatHaoCat: number; khoCat: number; hangSo: HangSo }) {
  const { laMang, dienTichTui, metCat, hatHaoCat, khoCat, hangSo } = params;
  let cpSXCat = 0, chiPhiSXCat = 0, tongChiPhiCat = 0;
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
