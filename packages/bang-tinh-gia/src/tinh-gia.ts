// ═══════════════════════════════════════════════════════════════════════════
// @lts/bang-tinh-gia — Engine tính giá bao bì
// Pure TypeScript — không phụ thuộc DOM, Node, hay bất kỳ framework nào.
// ═══════════════════════════════════════════════════════════════════════════
import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo, ChiTietLop, ChiTietLopCat } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP } from '@lts/hang-so';

export function layVatLieu(id: string, danhSachVatLieu: VatLieu[]): VatLieu | undefined {
  return danhSachVatLieu.find(vl => vl.id === id);
}

export function traLoiNhuan(tongChiPhi: number, cotLoiNhuan: number, bangLoiNhuan: DongLoiNhuan[]): number {
  const cot = cotLoiNhuan === 1 ? 'cot1' : 'cot2';
  let giaTriLN = LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP[cot as keyof typeof LOI_NHUAN_MAC_DINH_KHI_KHONG_KHOP];
  for (const dong of bangLoiNhuan) {
    if (tongChiPhi < dong.nguong) {
      giaTriLN = dong[cot as keyof typeof dong] as number;
      break;
    }
  }
  return giaTriLN;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tối ưu độ dày tự động — đáp ứng mục tiêu ±5 mic, ưu tiên mức thấp nhất
// Quy tắc:
//   - Thành phẩm: ±5 mic (thỏa thuận khách hàng)
//   - LLDPE: ±3 mic (thỏa thuận NCC), tăng/giảm theo bội số 5 (35,40,45...)
//   - Các lớp khác: độ dày cố định theo danh sách
//   - Keo: 3 mic/lớp ghép (tự động cộng thêm)
//   - Ưu tiên 1: tăng/giảm vật liệu có sẵn (chênh lệch 2-3 mic)
//   - Ưu tiên 2: tăng/giảm LLDPE (chênh lệch 5+ mic)
// ═══════════════════════════════════════════════════════════════════════════

export interface KetQuaToiUuDoDay {
  layerId: string;          // id lớp (idLop1, idLop2...)
  materialId?: string;      // mã vật liệu được chọn sau tối ưu
  originalMaterialId?: string; // mã vật liệu ban đầu
  adjustedThickness: number;  // độ dày sau điều chỉnh (mic)
  originalThickness: number;  // độ dày gốc (mic)
  isLLDPE: boolean;          // có phải LLDPE không
}

type VatLieuDangChonToiUu = {
  id: string;                 // key lớp: layer1Id, idLop1...
  materialId?: string;        // mã vật liệu thật trong danh mục
  doDay: number;
  laLLDPE?: boolean;
};

export function toiUuDoDay(
  mucTieu: number,                      // độ dày mục tiêu (mic)
  vatLieuDangChon: VatLieuDangChonToiUu[],
  danhSachVatLieu: VatLieu[],          // toàn bộ danh sách vật liệu
): {
  ketQua: KetQuaToiUuDoDay[];
  tongDoDayVatLieu: number;
  tongDoDayKeo: number;
  tongThucTe: number;                    // vat liệu + keo
  datYeuCau: boolean;                   // có nằm trong [mucTieu-5, mucTieu+5]?
  canhBao?: string;
} {
  const soLopGhep = vatLieuDangChon.length - 1; // lớp 1 là in, còn lại là ghép
  const keoPerLop = 3;
  const tongDoDayKeo = soLopGhep * keoPerLop;
  const minChapNhan = mucTieu - 5;
  const maxChapNhan = mucTieu + 5;

  const timVatLieu = (lop: VatLieuDangChonToiUu) =>
    danhSachVatLieu.find(v => v.id === lop.materialId) ??
    danhSachVatLieu.find(v => v.id === lop.id);

  const laLLDPE = (vl?: VatLieu, lop?: VatLieuDangChonToiUu): boolean =>
    !!lop?.laLLDPE ||
    !!vl?.ten.toLowerCase().includes('lldpe') ||
    !!vl?.nhom?.toLowerCase().includes('lldpe');

  const coTheNhapMicTuDo = (vl?: VatLieu, lop?: VatLieuDangChonToiUu): boolean =>
    !!vl?.doiDuocMic || laLLDPE(vl, lop);

  type LuaChonLop = {
    layerId: string;
    materialId?: string;
    originalMaterialId?: string;
    doDay: number;
    originalThickness: number;
    isLLDPE: boolean;
    costPerM2: number;
    popularityRank: number;
  };

  const giaMoiM2 = (vl: VatLieu | undefined, doDay: number): number => {
    if (!vl) return Number.MAX_SAFE_INTEGER;
    return vl.giaMoiKg * doDay * vl.khoiLuongRieng / 1000;
  };

  const coLopBOPPHoacMatt = vatLieuDangChon.some(lop => {
    const vl = timVatLieu(lop);
    const nhom = vl?.nhom?.toLowerCase() ?? '';
    const ten = vl?.ten?.toLowerCase() ?? '';
    return nhom === 'bopp' || nhom === 'matt opp' || ten.includes('bopp') || ten.includes('matt opp');
  });

  const diemPhoBien = (vl: VatLieu | undefined, doDay: number): number => {
    const nhom = vl?.nhom?.toLowerCase() ?? '';
    const ten = vl?.ten?.toLowerCase() ?? '';
    const laBOPPHoacMatt = nhom === 'bopp' || nhom === 'matt opp' || ten.includes('bopp') || ten.includes('matt opp');
    if (laBOPPHoacMatt) {
      if (doDay === 18) return 0;
      if (doDay === 20) return 1;
      return 10 + doDay;
    }
    if (coLopBOPPHoacMatt && (nhom === 'cpp' || ten === 'cpp')) {
      if (doDay === 50) return 0;
      if (doDay === 40) return 1;
      if (doDay === 30) return 2;
      return 10 + doDay;
    }
    return 5;
  };

  const taoLuaChonChoLop = (lop: VatLieuDangChonToiUu): LuaChonLop[] => {
    const vlHienTai = timVatLieu(lop);
    const originalMaterialId = vlHienTai?.id ?? lop.materialId;
    const laPe = laLLDPE(vlHienTai, lop);

    if (coTheNhapMicTuDo(vlHienTai, lop)) {
      const minPE = 30;
      const maxCanThiet = Math.max(
        minPE,
        lop.doDay,
        maxChapNhan - tongDoDayKeo,
      );
      const maxPE = Math.ceil((maxCanThiet + 20) / 5) * 5;
      const ds: LuaChonLop[] = [];
      for (let mic = minPE; mic <= maxPE; mic += 5) {
        ds.push({
          layerId: lop.id,
          materialId: vlHienTai?.id ?? lop.materialId,
          originalMaterialId,
          doDay: mic,
          originalThickness: lop.doDay,
          isLLDPE: laPe,
          costPerM2: giaMoiM2(vlHienTai, mic),
          popularityRank: diemPhoBien(vlHienTai, mic),
        });
      }
      return ds;
    }

    const vatLieuCungNhom = vlHienTai?.nhom
      ? danhSachVatLieu.filter(v => v.nhom === vlHienTai.nhom)
      : vlHienTai ? [vlHienTai] : [];

    if (vatLieuCungNhom.length === 0) {
      return [{
        layerId: lop.id,
        materialId: lop.materialId,
        originalMaterialId,
        doDay: lop.doDay,
        originalThickness: lop.doDay,
        isLLDPE: !!lop.laLLDPE,
        costPerM2: Number.MAX_SAFE_INTEGER,
        popularityRank: 99,
      }];
    }

    return vatLieuCungNhom
      .slice()
      .sort((a, b) => a.doDay - b.doDay || a.id.localeCompare(b.id))
      .map(vl => ({
        layerId: lop.id,
        materialId: vl.id,
        originalMaterialId,
        doDay: vl.doDay,
        originalThickness: lop.doDay,
        isLLDPE: laLLDPE(vl, lop),
        costPerM2: giaMoiM2(vl, vl.doDay),
        popularityRank: diemPhoBien(vl, vl.doDay),
      }));
  };

  const cacLuaChonTheoLop = vatLieuDangChon.map(taoLuaChonChoLop);

  let ketQuaTotNhat: LuaChonLop[] | null = null;
  let tongVatLieuTotNhat = 0;
  let tongThucTeTotNhat = vatLieuDangChon.reduce((sum, lop) => sum + lop.doDay, 0) + tongDoDayKeo;
  let chiPhiTotNhat = Infinity;
  let diemPhoBienTotNhat = Infinity;

  const soSanhTotHon = (chon: LuaChonLop[], tongVatLieu: number, tongThucTe: number) => {
    const diemPhoBien = chon.reduce((sum, c) => sum + c.popularityRank, 0);
    if (diemPhoBien < diemPhoBienTotNhat) return true;
    if (diemPhoBien > diemPhoBienTotNhat) return false;
    const chiPhi = chon.reduce((sum, c) => sum + c.costPerM2, 0);
    if (chiPhi < chiPhiTotNhat - 0.0001) return true;
    if (Math.abs(chiPhi - chiPhiTotNhat) > 0.0001) return false;
    const doLech = Math.abs(tongThucTe - mucTieu);
    const doLechTotNhat = Math.abs(tongThucTeTotNhat - mucTieu);
    if (doLech < doLechTotNhat) return true;
    if (doLech > doLechTotNhat) return false;
    return tongVatLieu < tongVatLieuTotNhat;
  };

  const dungSaiLLDPE = (chon: LuaChonLop[]) => chon.filter(c => c.isLLDPE).length * 3;

  const datDungSaiThanhPham = (tongThucTe: number, chon: LuaChonLop[]) => {
    const bienDoLLDPE = dungSaiLLDPE(chon);
    return tongThucTe - bienDoLLDPE >= minChapNhan && tongThucTe + bienDoLLDPE <= maxChapNhan;
  };

  const dfs = (idx: number, tongVatLieu: number, chon: LuaChonLop[]) => {
    if (idx >= cacLuaChonTheoLop.length) {
      const tongThucTe = tongVatLieu + tongDoDayKeo;
      if (!datDungSaiThanhPham(tongThucTe, chon)) return;
      if (soSanhTotHon(chon, tongVatLieu, tongThucTe)) {
        ketQuaTotNhat = chon.map(c => ({ ...c }));
        tongVatLieuTotNhat = tongVatLieu;
        tongThucTeTotNhat = tongThucTe;
        chiPhiTotNhat = chon.reduce((sum, c) => sum + c.costPerM2, 0);
        diemPhoBienTotNhat = chon.reduce((sum, c) => sum + c.popularityRank, 0);
      }
      return;
    }

    for (const luaChon of cacLuaChonTheoLop[idx]) {
      const tongMoi = tongVatLieu + luaChon.doDay;
      if (tongMoi + tongDoDayKeo > maxChapNhan) continue;
      dfs(idx + 1, tongMoi, [...chon, luaChon]);
    }
  };

  dfs(0, 0, []);

  const ketQua: KetQuaToiUuDoDay[] = (ketQuaTotNhat ?? vatLieuDangChon.map(lop => {
    const vl = timVatLieu(lop);
    return {
      layerId: lop.id,
      materialId: vl?.id ?? lop.materialId,
      originalMaterialId: vl?.id ?? lop.materialId,
      doDay: lop.doDay,
      originalThickness: lop.doDay,
      isLLDPE: laLLDPE(vl, lop),
      costPerM2: giaMoiM2(vl, lop.doDay),
      popularityRank: diemPhoBien(vl, lop.doDay),
    };
  })).map(k => ({
    layerId: k.layerId,
    materialId: k.materialId,
    originalMaterialId: k.originalMaterialId,
    adjustedThickness: k.doDay,
    originalThickness: k.originalThickness,
    isLLDPE: k.isLLDPE,
  }));

  const tongVatLieu = ketQua.reduce((sum, k) => sum + k.adjustedThickness, 0);
  const tongThucTe = tongVatLieu + tongDoDayKeo;
  const bienDoLLDPE = ketQua.filter(k => k.isLLDPE).length * 3;
  const datYeuCau = tongThucTe - bienDoLLDPE >= minChapNhan && tongThucTe + bienDoLLDPE <= maxChapNhan;
  const canhBao = !datYeuCau
    ? `Không tìm được tổ hợp độ dày thỏa mãn ${minChapNhan}-${maxChapNhan} mic (hiện tại: ${tongThucTe} mic). Vui lòng chọn vật liệu khác.`
    : undefined;

  return {
    ketQua,
    tongDoDayVatLieu: tongVatLieu,
    tongDoDayKeo,
    tongThucTe,
    datYeuCau,
    canhBao,
  };
}

export function tinhGia(
  dauVao: DauVaoTinhGia,
  danhSachVatLieu: VatLieu[],
  hangSo: HangSo,
  bangLoiNhuan: DongLoiNhuan[]
): KetQuaTinhGia | null {
  const {
    soLuong, khoTrai, buocCat, soMau,
    phiKimLoai = 0,
    khoiLuongQuaiXach = 0, khoiLuongKhoa = 0, khoiLuongBangKeo = 0,
    tyLePhuMucMuc = 1, cotLoiNhuan = 2,
    tyLeHoaHong = 0, coKhoa = false, coBangKeo = false, coQuaiXach = false,
    cuocVanChuyenPerKm, soKmVanChuyen, giaThuung, soTuiPerThuung,
    ghiDeDayLop = {}, cauTrucNhieuVatLieu = {},
  } = dauVao;

  const laLLDPEVatLieu = (vl: VatLieu) =>
    vl.ten.toLowerCase().includes('lldpe') ||
    (vl.nhom?.toLowerCase().includes('lldpe') ?? false);

  const nhanBanVatLieu = (vl?: VatLieu | null, khoaLop?: string): VatLieu | null => {
    if (!vl) return null;
    const ban = { ...vl };
    if (khoaLop && ghiDeDayLop[khoaLop] && (vl.doiDuocMic || laLLDPEVatLieu(vl))) {
      ban.doDay = ghiDeDayLop[khoaLop];
      ban.giaMoiM2 = ban.giaMoiKg * ban.doDay * ban.khoiLuongRieng / 1000;
    }
    return ban;
  };

  const lop1 = dauVao.idLop1 ? nhanBanVatLieu(layVatLieu(dauVao.idLop1, danhSachVatLieu), 'idLop1') : null;
  const lop2 = dauVao.idLop2 ? nhanBanVatLieu(layVatLieu(dauVao.idLop2, danhSachVatLieu), 'idLop2') : null;
  const lop2Phu = dauVao.idLop2Phu ? nhanBanVatLieu(layVatLieu(dauVao.idLop2Phu, danhSachVatLieu), 'idLop2Phu') : null;
  const lop3 = dauVao.idLop3 ? nhanBanVatLieu(layVatLieu(dauVao.idLop3, danhSachVatLieu), 'idLop3') : null;
  const lop4 = dauVao.idLop4 ? nhanBanVatLieu(layVatLieu(dauVao.idLop4, danhSachVatLieu), 'idLop4') : null;
  const lop5 = dauVao.idLop5 ? nhanBanVatLieu(layVatLieu(dauVao.idLop5, danhSachVatLieu), 'idLop5') : null;

  if (!lop1 || soLuong <= 0 || khoTrai <= 0 || buocCat <= 0 || !dauVao.loaiSanPham || dauVao.soMau === null) return null;
  if (dauVao.loaiSanPham === 'tui' && !dauVao.loaiTui) return null;
  if (dauVao.loaiSanPham === 'mang' && !dauVao.loaiMang) return null;

  const doDayMucTieu = dauVao.doDayMucTieu || 0;

  const soHinh = dauVao.soHinh || 1;
  const laMang = dauVao.loaiSanPham === 'mang';

  const dienTichTui = khoTrai * buocCat;
  const tongDienTich = laMang ? soLuong : soLuong * dienTichTui;
  const khoCatIn = khoTrai * soHinh + 0.02;
  const chieuDaiMang = khoTrai * soHinh > 0 ? tongDienTich / (khoTrai * soHinh) : 0;

  const khoCat = khoCatIn;
  const metCat = laMang
    ? (khoTrai * soHinh > 0 ? tongDienTich / (khoTrai * soHinh) : 0)
    : (buocCat * soLuong) / soHinh;

  const hHCatA = hangSo.hatHaoCatA || 3000;
  const hHCatB = hangSo.hatHaoCatB || 20;
  const hHCatC = hangSo.hatHaoCatC || 100;
  const hatHaoCat = metCat / hHCatA * hHCatB + hHCatC;

  const danhSachGhep: any[] = [];
  const chuoiGhep = [
    { lop: lop2, lopPhu: lop2Phu, soLop: 2 }, { lop: lop3, soLop: 3 },
    { lop: lop4, soLop: 4 }, { lop: lop5, soLop: 5 },
  ].filter(item => !!item.lop);

  let metCanThiet = metCat + hatHaoCat;

  chuoiGhep.forEach(({ lop, lopPhu, soLop }) => {
    if (!lop) return;
    const kho = khoCat;
    const met = metCanThiet;
    const hHGhepA = hangSo.hatHaoGhepA || 3000;
    const hHGhepB = hangSo.hatHaoGhepB || 20;
    const hHGhepC = hangSo.hatHaoGhepC || 100;
    const hatHao = met / hHGhepA * hHGhepB + hHGhepC;
    const cpsx = hangSo.cpSXGhep;
    const chiPhiSX = cpsx * (hatHao + met) * kho;
    let chiPhiVL = (lop.giaMoiM2 || 0) * (hatHao + met) * kho;
    let chiTietVatLieu: any[] | undefined;
    if (soLop === 2 && lopPhu) {
      if (dauVao.chieuDaiLop2 && dauVao.chieuDaiLop2.vl1 > 0 && dauVao.chieuDaiLop2.vl2 > 0) {
        const khoLopChinh = dauVao.chieuDaiLop2.vl1 / 1000;
        const khoLopPhu = dauVao.chieuDaiLop2.vl2 / 1000;
        const soHinhThucTe = Math.max(1, soHinh || 1);
        const bienMoiMep = 0.01;
        const themChiTiet = (vl: VatLieu, khoSegment: number) => ({
          vatLieuId: vl.id,
          ten: vl.ten,
          kho: khoSegment,
          donGia: vl.giaMoiM2 || 0,
          chiPhiVL: (vl.giaMoiM2 || 0) * (hatHao + met) * khoSegment,
        });
        chiTietVatLieu = soHinhThucTe > 1
          ? [
              themChiTiet(lop, khoLopChinh + bienMoiMep),
              themChiTiet(lopPhu, khoLopPhu * soHinhThucTe),
              themChiTiet(lop, khoLopChinh + bienMoiMep),
            ]
          : [
              themChiTiet(lop, khoLopChinh + bienMoiMep),
              themChiTiet(lopPhu, khoLopPhu + bienMoiMep),
            ];
      } else {
        const soHinhThucTe = Math.max(1, soHinh || 1);
        const bien = 0.01;
        const khoMotCauTruc = khoTrai + bien;
        const khoGiua = Math.max(0, khoTrai * soHinhThucTe + 0.02 - khoMotCauTruc * 2);
        const khoLopChinh = soHinhThucTe > 1 ? khoMotCauTruc * 2 : khoMotCauTruc;
        const khoLopPhu = soHinhThucTe > 1 ? khoGiua : Math.max(0, kho - khoLopChinh);
        chiTietVatLieu = [
          { vatLieuId: lop.id, ten: lop.ten, kho: khoLopChinh, donGia: lop.giaMoiM2 || 0, chiPhiVL: (lop.giaMoiM2 || 0) * (hatHao + met) * khoLopChinh },
          { vatLieuId: lopPhu.id, ten: lopPhu.ten, kho: khoLopPhu, donGia: lopPhu.giaMoiM2 || 0, chiPhiVL: (lopPhu.giaMoiM2 || 0) * (hatHao + met) * khoLopPhu },
        ];
      }
      chiPhiVL = chiTietVatLieu.reduce((sum, item) => sum + item.chiPhiVL, 0);
    }
    danhSachGhep.push({ soLop, kho, met, hatHao, cpsx, chiPhiSX, chiPhiVL, chiTietVatLieu, tongCong: chiPhiSX + chiPhiVL });
    metCanThiet = met + hatHao;
  });

  const tongHatHaoGhep = danhSachGhep.reduce((t, g) => t + g.hatHao, 0);
  const tongChiPhiGhep = danhSachGhep.reduce((t, g) => t + g.tongCong, 0);

  const khoNLIn = khoCat;
  const metIn = metCat + hatHaoCat + tongHatHaoGhep;

  const chiPhiCaiDatMau = soMau! > 0 ? (hangSo.chiPhiCaiDatMau[soMau!] || (soMau! * 200 + 200)) : 0;
  const hHInA = hangSo.hatHaoInA || 6000;
  const hHInB = hangSo.hatHaoInB || 40;
  const hHInC = hangSo.hatHaoInC || 50000;
  const hHInD = hangSo.hatHaoInD || 400;
  const hatHaoIn = soMau! > 0
    ? (chiPhiCaiDatMau + (metIn / hHInA * hHInB) + (metIn > hHInC ? metIn / hHInC * hHInD : 0))
    : 0;

  const giaMucPerMau = lop1.giaMucMoiMau || (lop1.laPEThoaPA ? 135 : 120);
  const cpSXIn = soMau! > 0 ? (soMau! * giaMucPerMau * tyLePhuMucMuc + hangSo.chiPhiNhanCong + phiKimLoai) : 0;
  const chiPhiSXIn = cpSXIn * (hatHaoIn + metIn) * khoNLIn;
  const chiPhiVatLieuIn = (lop1.giaMoiM2 || 0) * (hatHaoIn + metIn) * khoNLIn;
  const tongChiPhiIn = chiPhiSXIn + chiPhiVatLieuIn;

  let cpSXCat = 0, chiPhiSXCat = 0, tongChiPhiCat = 0;
  if (!laMang) {
    const cpCatCoBan = hangSo.cpCatCoBan || 971;
    const ng1 = hangSo.nguongCat1 || 0.07;
    const ng2 = hangSo.nguongCat2 || 0.2;
    if (dienTichTui < ng1)      cpSXCat = cpCatCoBan * (hangSo.heSoCat1 || 1.4);
    else if (dienTichTui < ng2) cpSXCat = cpCatCoBan * (hangSo.heSoCat2 || 1.2);
    else                        cpSXCat = cpCatCoBan * (hangSo.heSoCat3 || 0.8);
    chiPhiSXCat = cpSXCat * (hatHaoCat + metCat) * khoCat;
    tongChiPhiCat = chiPhiSXCat;
  }

  const tongChiPhiSX = tongChiPhiIn + tongChiPhiGhep + tongChiPhiCat;
  const tyLeLoiNhuan = traLoiNhuan(tongChiPhiSX, cotLoiNhuan, bangLoiNhuan);
  const soTienLoiNhuan = tyLeLoiNhuan * tongChiPhiSX;
  const doanhThu = tongChiPhiSX + soTienLoiNhuan;
  const chiPhiDonVi = soLuong > 0 ? doanhThu / soLuong : 0;

  const doDayLop2 = Math.max(lop2?.doDay || 0, lop2Phu?.doDay || 0);
  const doDayTho = lop1.doDay + doDayLop2 + (lop3?.doDay||0) + (lop4?.doDay||0) + (lop5?.doDay||0);
  const soLopHoatDong = 1 + (lop2?1:0) + (lop3?1:0) + (lop4?1:0) + (lop5?1:0);
  const tongDoDay = Math.round((doDayTho + (soLopHoatDong - 1) * 3) / 5) * 5;

  const tinhGSMLop = (doDay: number, kl: number) => (doDay / 1000000) * (kl * 1000000);
  const tongGSM = tinhGSMLop(lop1.doDay, lop1.khoiLuongRieng)
    + (lop2 ? tinhGSMLop(lop2.doDay, lop2.khoiLuongRieng) : 0)
    + (lop2Phu ? tinhGSMLop(lop2Phu.doDay, lop2Phu.khoiLuongRieng) : 0)
    + (lop3 ? tinhGSMLop(lop3.doDay, lop3.khoiLuongRieng) : 0)
    + (lop4 ? tinhGSMLop(lop4.doDay, lop4.khoiLuongRieng) : 0)
    + (lop5 ? tinhGSMLop(lop5.doDay, lop5.khoiLuongRieng) : 0);

  const tongTienKhoa = coKhoa ? soLuong * buocCat * hangSo.giaKhoa : 0;
  const khoaPerDonVi = soLuong > 0 ? tongTienKhoa / soLuong : 0;
  const tongKhoiLuongKhoa = coKhoa ? soLuong * buocCat * khoiLuongKhoa : 0;
  const tongTienBangKeo = coBangKeo ? soLuong * buocCat * hangSo.giaBangKeo : 0;
  const bangKeoPerDonVi = soLuong > 0 ? tongTienBangKeo / soLuong : 0;
  const tongKhoiLuongBangKeo = coBangKeo ? soLuong * buocCat * khoiLuongBangKeo : 0;
  const tongTienQuaiXach = coQuaiXach ? soLuong * hangSo.giaQuaiXach : 0;
  const quaiXachPerDonVi = coQuaiXach ? hangSo.giaQuaiXach : 0;
  const khoiLuongPhuKienThemPerDonVi = soLuong > 0 ? (tongKhoiLuongKhoa + tongKhoiLuongBangKeo) / soLuong : 0;

  const chieuDaiCuonMang = dauVao.chieuDaiCuonMang || 6000;
  const dienTichCuonMang = laMang ? (khoTrai * chieuDaiCuonMang / soHinh) : 0;

  const soTuiPerThuungThucTe = soTuiPerThuung || 0;
  const giaThuungThucTe = giaThuung || 0;
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

  const dienTichDonVi = laMang ? 1.0 : dienTichTui;
  const khoiLuongTare = tongGSM * dienTichDonVi + khoiLuongQuaiXach + khoiLuongPhuKienThemPerDonVi;

  const cuocVanChuyenThucTePerKm = cuocVanChuyenPerKm || 0;
  const soKmThucTe = soKmVanChuyen || 0;
  const tyLeCuocVanChuyen = cuocVanChuyenThucTePerKm * soKmThucTe;
  const tongCuocVanChuyen = tyLeCuocVanChuyen;
  const cuocVanChuyenPerDonVi = soLuong > 0 ? tongCuocVanChuyen / soLuong : 0;

  const ngayThanhToanThucTe = dauVao.ngayThanhToan || 30;
  const laiSuatCoBan  = hangSo.laiSuatCoBan  ?? 0.10;
  const laiSuatThem   = hangSo.laiSuatThem   ?? 0.03;
  // Công thức: (cơ sở + thêm) / 12 tháng × (số ngày / 30) × giá vốn
  const laiSuatPerDonVi = (laiSuatCoBan + laiSuatThem) / 12 * (ngayThanhToanThucTe / 30) * chiPhiDonVi;

  const hoaHongCoDinhVND = dauVao.hoaHongCoDinhVND || 0;
  const hoaHongPerDonVi = dauVao.donViHoaHong === 'vnd' ? hoaHongCoDinhVND : tyLeHoaHong * chiPhiDonVi;

  const chieuDaiTrucThucTe = dauVao.chieuDaiTruc ?? 0;
  const chuViTrucThucTe = dauVao.chuViTruc ?? 0;

  // Đơn giá trục theo loại: A → giaTrucA, B → giaTrucB, custom → giaTrucDonVi nhập tay
  const loaiTruc = dauVao.loaiTruc ?? 'A';
  const giaTrucDonViThucTe = loaiTruc === 'A'
    ? (hangSo.giaTrucA ?? hangSo.giaTrucDonVi)
    : loaiTruc === 'B'
      ? (hangSo.giaTrucB ?? 6500000)
      : (dauVao.giaTrucDonVi || hangSo.giaTrucDonVi);

  const dienTichTruc = chieuDaiTrucThucTe * chuViTrucThucTe;
  const chiPhiTrucPerDonVi = dienTichTruc * giaTrucDonViThucTe;
  const chiPhiTruc = chiPhiTrucPerDonVi * (soMau || 0);

  // Bao trục: phân bổ chi phí trục vào đơn giá theo định mức 200.000 m²
  const DINH_MUC_TRUC = 200000;
  const baoTruc = dauVao.baoTruc ?? false;
  const chiPhiTrucPhanBo = baoTruc && chiPhiTruc > 0
    ? (laMang ? chiPhiTruc / DINH_MUC_TRUC : chiPhiTruc / DINH_MUC_TRUC * dienTichTui)
    : 0;

  const giaCuoiCung = chiPhiDonVi + khoaPerDonVi + bangKeoPerDonVi + quaiXachPerDonVi
    + thuungPerDonVi + cuocVanChuyenPerDonVi + laiSuatPerDonVi + hoaHongPerDonVi + chiPhiTrucPhanBo;
  const ngaySanXuat = Math.ceil(soLuong / 30000) + 4;

  let chuoiCauTruc = lop1.ten + ' ' + lop1.doDay;
  if (lop2) chuoiCauTruc += '//' + (lop2Phu ? `[${lop2.ten} ${lop2.doDay} + ${lop2Phu.ten} ${lop2Phu.doDay}]` : lop2.ten + ' ' + lop2.doDay);
  if (lop3) chuoiCauTruc += '//' + lop3.ten + ' ' + lop3.doDay;
  if (lop4) chuoiCauTruc += '//' + lop4.ten + ' ' + lop4.doDay;
  if (lop5) chuoiCauTruc += '//' + lop5.ten + ' ' + lop5.doDay;

  return {
    dauVao, chuoiCauTruc, tongDoDay, tongGSM,
    dienTichTui, tongDienTich, khoCatIn, chieuDaiMang,
    khoCat, metCat, hatHaoCat, cpSXCat, chiPhiSXCat, tongChiPhiCat,
    khoNLIn, metIn, hatHaoIn, cpSXIn, chiPhiSXIn, chiPhiVatLieuIn, tongChiPhiIn,
    tongChiPhiSX, tongChiPhiGhep, tyLeLoiNhuan, soTienLoiNhuan, doanhThu, chiPhiDonVi,
    khoaPerDonVi, tongTienKhoa, bangKeoPerDonVi, tongTienBangKeo,
    quaiXachPerDonVi, tongTienQuaiXach,
    thuungPerDonVi, tongTienThuung, giaThuungThucTe, soTuiPerThuungThucTe, soThuung,
    dienTichCuonMang, phiDongGoiPerDonVi, khoiLuongTare,
    cuocVanChuyenPerDonVi, tongCuocVanChuyen, tyLeCuocVanChuyen, cuocVanChuyenThucTePerKm, soKmThucTe,
    laiSuatPerDonVi, laiSuatCoBan, laiSuatThem, ngayThanhToan: ngayThanhToanThucTe,
    hoaHongPerDonVi, giaCuoiCung,
    chiPhiTruc, chiPhiTrucPerDonVi, chiPhiTrucPhanBo,
    dienTichTruc: dienTichTruc,
    chieuDaiTruc: chieuDaiTrucThucTe, chuViTruc: chuViTrucThucTe, ngaySanXuat,
    cacLop: {
      in: { vatLieu: chiPhiVatLieuIn, kho: khoNLIn, met: metIn, hatHao: hatHaoIn, cpsx: cpSXIn, chiPhiSX: chiPhiSXIn, chiPhiVL: chiPhiVatLieuIn, tongCong: tongChiPhiIn } as ChiTietLop,
      ghep: danhSachGhep.map(g => ({ vatLieu: g.chiPhiVL, chiTietVatLieu: g.chiTietVatLieu, kho: g.kho, met: g.met, hatHao: g.hatHao, cpsx: g.cpsx, chiPhiSX: g.chiPhiSX, chiPhiVL: g.chiPhiVL, tongCong: g.tongCong } as ChiTietLop)),
      cat: { kho: khoCat, met: metCat, hatHao: hatHaoCat, cpsx: cpSXCat, chiPhiSX: chiPhiSXCat, tongCong: tongChiPhiCat } as ChiTietLopCat,
    },
  };
}
