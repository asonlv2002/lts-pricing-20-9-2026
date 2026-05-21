import type { HangSo } from '@lts/kieu-du-lieu';

export function tinhCongDoanCat(params: { laMang: boolean; dienTichTui: number; metCat: number; hatHaoCat: number; khoCat: number; hangSo: HangSo }) {
  const { laMang, dienTichTui, metCat, hatHaoCat, khoCat, hangSo } = params;
  let cpSXCat = 0, chiPhiSXCat = 0, tongChiPhiCat = 0;
  if (!laMang) {
    const cpCatCoBan = hangSo.cpCatCoBan || 971;
    const ng1 = hangSo.nguongCat1 || 0.07;
    const ng2 = hangSo.nguongCat2 || 0.2;
    if (dienTichTui < ng1) cpSXCat = cpCatCoBan * (hangSo.heSoCat1 || 1.4);
    else if (dienTichTui < ng2) cpSXCat = cpCatCoBan * (hangSo.heSoCat2 || 1.2);
    else cpSXCat = cpCatCoBan * (hangSo.heSoCat3 || 0.8);
    chiPhiSXCat = cpSXCat * (hatHaoCat + metCat) * khoCat;
    tongChiPhiCat = chiPhiSXCat;
  }
  return { cpSXCat, chiPhiSXCat, tongChiPhiCat };
}
