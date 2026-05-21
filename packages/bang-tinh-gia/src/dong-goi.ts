export function tinhDongGoi(params: { laMang: boolean; soLuong: number; khoTrai: number; chieuDaiCuonMang: number; giaThuungThucTe: number; soTuiPerThuungThucTe: number }) {
  const { laMang, soLuong, khoTrai, chieuDaiCuonMang, giaThuungThucTe, soTuiPerThuungThucTe } = params;
  const dienTichCuonMang = laMang ? khoTrai * chieuDaiCuonMang : 0;
  let soThuung: number, tongTienThuung: number, thuungPerDonVi: number, phiDongGoiPerDonVi: number;
  if (laMang) {
    if (giaThuungThucTe > 0 && dienTichCuonMang > 0) {
      phiDongGoiPerDonVi = giaThuungThucTe / dienTichCuonMang;
      thuungPerDonVi = phiDongGoiPerDonVi;
      tongTienThuung = thuungPerDonVi * soLuong;
      soThuung = soLuong / dienTichCuonMang;
    } else {
      phiDongGoiPerDonVi = thuungPerDonVi = tongTienThuung = 0;
      soThuung = dienTichCuonMang > 0 ? soLuong / dienTichCuonMang : 0;
    }
  } else {
    soThuung = soTuiPerThuungThucTe > 0 ? soLuong / soTuiPerThuungThucTe : 0;
    tongTienThuung = giaThuungThucTe * soThuung;
    thuungPerDonVi = soLuong > 0 ? tongTienThuung / soLuong : 0;
    phiDongGoiPerDonVi = thuungPerDonVi;
  }
  return { dienTichCuonMang, soThuung, tongTienThuung, thuungPerDonVi, phiDongGoiPerDonVi };
}
