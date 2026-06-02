export interface KichThuocCoBan {
  dienTichTui: number;
  tongDienTich: number;
  khoCatIn: number;
  chieuDaiMang: number;
  khoCat: number;
  metCat: number;
}

export function tinhKichThuoc(params: { soLuong: number; khoTrai: number; buocCat: number; soHinh: number; laMang: boolean }): KichThuocCoBan {
  const { soLuong, khoTrai, buocCat, soHinh, laMang } = params;
  const dienTichTui = khoTrai * buocCat;
  const tongDienTich = laMang ? soLuong : soLuong * dienTichTui;
  const khoCatIn = khoTrai * soHinh + 0.02;
  const chieuDaiMang = khoTrai * soHinh > 0 ? tongDienTich / (khoTrai * soHinh) : 0;
  const khoCat = khoCatIn;
  const metCat = laMang ? chieuDaiMang : (buocCat * soLuong) / soHinh;
  return { dienTichTui, tongDienTich, khoCatIn, chieuDaiMang, khoCat, metCat };
}
