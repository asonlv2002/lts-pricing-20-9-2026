import type { DauVaoTinhGia, HangSo } from '@lts/kieu-du-lieu';

export function tinhTrucIn(params: { dauVao: DauVaoTinhGia; hangSo: HangSo; soMau: number; laMang: boolean; dienTichTui: number }) {
  const { dauVao, hangSo, soMau, laMang, dienTichTui } = params;
  const chieuDaiTrucThucTe = dauVao.chieuDaiTruc ?? 0;
  const chuViTrucThucTe = dauVao.chuViTruc ?? 0;
  const loaiTruc = dauVao.loaiTruc ?? 'A';
  const giaTrucDonViThucTe = loaiTruc === 'A'
    ? (hangSo.giaTrucA ?? hangSo.giaTrucDonVi)
    : loaiTruc === 'B'
      ? (hangSo.giaTrucB ?? 6500000)
      : (dauVao.giaTrucDonVi || hangSo.giaTrucDonVi);
  const dienTichTruc = chieuDaiTrucThucTe * chuViTrucThucTe;
  const chiPhiTrucPerDonVi = dienTichTruc * giaTrucDonViThucTe;
  const chiPhiTruc = chiPhiTrucPerDonVi * (soMau || 0);
  const DINH_MUC_TRUC = 200000;
  const baoTruc = dauVao.baoTruc ?? false;
  const chiPhiTrucPhanBo = baoTruc && chiPhiTruc > 0
    ? (laMang ? chiPhiTruc / DINH_MUC_TRUC : chiPhiTruc / DINH_MUC_TRUC * dienTichTui)
    : 0;
  return { chieuDaiTrucThucTe, chuViTrucThucTe, dienTichTruc, chiPhiTrucPerDonVi, chiPhiTruc, chiPhiTrucPhanBo };
}
