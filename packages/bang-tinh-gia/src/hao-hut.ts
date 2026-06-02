import type { HangSo } from '@lts/kieu-du-lieu';

export function tinhHaoHutCat(metCat: number, hangSo: HangSo): number {
  const hHCatA = hangSo.hatHaoCatA || 3000;
  const hHCatB = hangSo.hatHaoCatB || 20;
  const hHCatC = hangSo.hatHaoCatC || 100;
  return metCat / hHCatA * hHCatB + hHCatC;
}

export function tinhHaoHutGhep(met: number, hangSo: HangSo): number {
  const hHGhepA = hangSo.hatHaoGhepA || 3000;
  const hHGhepB = hangSo.hatHaoGhepB || 20;
  const hHGhepC = hangSo.hatHaoGhepC || 100;
  return met / hHGhepA * hHGhepB + hHGhepC;
}

export function tinhHaoHutIn(metIn: number, soMau: number, hangSo: HangSo): { chiPhiCaiDatMau: number; hatHaoIn: number } {
  const chiPhiCaiDatMau = soMau > 0 ? (hangSo.chiPhiCaiDatMau[soMau] || (soMau * 200 + 200)) : 0;
  const hHInA = hangSo.hatHaoInA || 6000;
  const hHInB = hangSo.hatHaoInB || 40;
  const hHInC = hangSo.hatHaoInC || 50000;
  const hHInD = hangSo.hatHaoInD || 400;
  const hatHaoIn = soMau > 0
    ? (chiPhiCaiDatMau + (metIn / hHInA * hHInB) + (metIn > hHInC ? (metIn - hHInC) / hHInC * hHInD : 0))
    : 0;
  return { chiPhiCaiDatMau, hatHaoIn };
}
