// ═══════════════════════════════════════════════════════════════════════════
// Đặc tả kỹ thuật & nguyên liệu (nâng cao)
// Bóc tách chi phí SX thành 2 nhóm: CP Vật liệu vs CP Nhân công + điện.
// Nguồn dữ liệu: constants.cpsxUpgrade{Ink,ThoiGian,Labor,Electric} (CPSX nâng cấp).
// Tổng của cụm này ĐỘC LẬP với TỔNG GIÁ THÀNH của bảng đặc tả cũ.
// ═══════════════════════════════════════════════════════════════════════════
import type {
  AppConstants,
  CalculateResult,
  CpsxUpgradeInk,
  KeoRow,
  Material,
  OverrideRowKey,
  OverrideTable,
  ProfitRow,
  SolventAdhesiveRow,
  SolventAdhesiveTable,
} from './types';
import type { UniRow } from './manager-calculation';
import { xuLyDongGhiDe } from './manager-calculation';
import { traLoiNhuanTheoBang } from './engine';
import {
  chonRuleMayChia,
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
  metChiaHoacLamTui,
  metLamTuiTuDauVaoNVL,
  soPhanTuChiaLamTui,
  tinhThoiGianMayChia,
  tinhThoiGianMayGhep,
  tinhThoiGianMayIn,
  tinhThoiGianMayTui,
} from './cpsx-upgrade-thoigian';
import {
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongMoiPhutTuiAp,
  soCongNhanTui,
} from './cpsx-upgrade-labor';
import { tinhDienMoiPhut } from './cpsx-upgrade-electric';
import {
  DEFAULT_CPSX_UPGRADE_ELECTRIC,
  DEFAULT_CPSX_UPGRADE_INK,
  DEFAULT_CPSX_UPGRADE_LABOR,
  DEFAULT_CPSX_UPGRADE_THOIGIAN,
} from './data';

/** Nhóm bảng giá mực — quyết định theo vật liệu lớp in */
export type NhomMuc = 'opp' | 'pet' | 'pe';

/** 1 dòng của Table 1 — Đặc tả vật liệu (nâng cao) */
export interface DongVatLieuNangCao {
  congDoan: string;
  vatLieu: string;
  /** rowKey uniRows tương ứng — để UI ghi đè */
  rowKey: OverrideRowKey;
  /** materialId hiệu lực (đã qua ghi đè) — để UI đổi vật liệu */
  materialId?: string;
  /** chỉ số detail trong materialDetails (nếu là dòng tách chi tiết) */
  chiTietIndex?: number;
  khoMang: number | null;
  /** Hiển thị khổ dạng "0,620 → 0,300" (dòng Chia); UI ưu tiên field này */
  khoMangLabel?: string;
  thanhPham: number | null;
  phiHao: number | null;
  dauVaoNVL: number | null;
  giaNVL: number | null;
  /** Đơn vị hiển thị của giaNVL — 'kg' cho vật liệu màng, null khi không áp dụng */
  donViGiaNVL: 'kg' | null;
  cpVatLieu: number | null;
  thanhTienNVL: number | null;
  /** CP mực in / dung môi / keo ghép (₫/m²) — null khi công đoạn không tiêu thụ */
  cpMucKeo: number | null;
  thanhTienMucKeo: number | null;
  /** Chi tiết công thức để hiện tooltip */
  ghiChu?: string;
}

/** 1 dòng của Table 2 — Nhân công + điện */
export interface DongNhanCongDien {
  congDoan: string;
  /** rowKey ghi đè hiệu lực của dòng này */
  rowKey: OverrideRowKey;
  thoiGianPhut: number | null;
  cpNhanCongPerPhut: number | null;
  thanhTienNhanCong: number;
  cpDienPerPhut: number | null;
  thanhTienDien: number;
}

/** Cụm 3 dòng tổng */
export interface TongNangCao {
  tongVatLieu: number;
  tongNhanCongDien: number;
  tongGiaThanh: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function so(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Tra đơn giá dung môi theo mã (DM_OPP / DM_PET / DM_EA).
 * Shape mới: bảng dung môi riêng (`dungMoi.rows`). Shape cũ (rows phẳng) vẫn
 * được hỗ trợ để không hỏng dữ liệu cấu hình cũ đã lưu.
 */
function donGiaTheoMa(bang: SolventAdhesiveTable | undefined, ma: string): number {
  const dm = (bang as { dungMoi?: { rows?: SolventAdhesiveRow[] } } | undefined)?.dungMoi;
  const row = dm?.rows?.find(r => r.ma === ma);
  if (row) return so(row.donGia);
  const legacy = (bang as { rows?: SolventAdhesiveRow[] } | undefined)?.rows;
  const lrow = legacy?.find(r => r.ma === ma);
  return lrow ? so(lrow.donGia) : 0;
}

/**
 * Giá keo áp dụng (₫/kg).
 * Shape mới: `keo.appliedPrice` (đã chọn TB cộng / TB trọng số / nhập tay —
 * như bảng mực), fallback tính theo `appliedSource`. Shape cũ: TB cộng các
 * dòng mã `KEO_`.
 */
function layGiaKeo(ink: CpsxUpgradeInk): number {
  const sa = ink?.solventAdhesive as
    | SolventAdhesiveTable
    | { rows?: SolventAdhesiveRow[] }
    | undefined;

  // Shape mới: giá đã chọn, fallback TB theo source
  const keo = (sa as SolventAdhesiveTable | undefined)?.keo;
  if (keo) {
    if (keo.appliedPrice != null && Number.isFinite(Number(keo.appliedPrice))) {
      return Math.max(0, so(keo.appliedPrice));
    }
    const rows = keo.rows ?? [];
    if (keo.appliedSource === 'weighted') {
      let weightSum = 0;
      let weighted = 0;
      for (const r of rows) {
        const d = so(r.donGia);
        const s = so((r as KeoRow).slDung);
        if (d <= 0 || s <= 0) continue;
        weightSum += s;
        weighted += d * s;
      }
      if (weightSum > 0) return weighted / weightSum;
    } else {
      const ds = rows.filter((r) => so(r.donGia) > 0);
      if (ds.length > 0) return ds.reduce((s, r) => s + so(r.donGia), 0) / ds.length;
    }
  }

  // Shape cũ: TB cộng các dòng mã KEO_
  const legacyRows = (sa as { rows?: SolventAdhesiveRow[] } | undefined)?.rows ?? [];
  const keoRows = legacyRows.filter((r) => String(r.ma ?? '').startsWith('KEO_'));
  if (keoRows.length > 0) return keoRows.reduce((s, r) => s + so(r.donGia), 0) / keoRows.length;

  return 0;
}

function layInk(hangSo: AppConstants): CpsxUpgradeInk {
  return hangSo?.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK;
}

/**
 * Chọn bảng giá mực theo tên vật liệu lớp in.
 * Thứ tự kiểm tra: PET trước PE (vì 'PET' chứa substring 'PE').
 * Không khớp / rỗng / PA → PET (mọi màng in còn lại — chỉ OPP/MattOPP dùng bảng OPP).
 */
export function chonNhomMuc(tenVatLieu: string | null | undefined): NhomMuc {
  const u = String(tenVatLieu ?? '').toUpperCase();
  if (u.includes('OPP')) return 'opp';           // OPP, BOPP, MattOPP
  if (u.includes('PET')) return 'pet';           // gồm cả MPET — trước PE vì PET chứa PE
  if (u.includes('PE')) return 'pe';             // LLDPE, PE
  return 'pet';                                  // PA, giấy, không khớp, rỗng → PET
}

/** Mã dung môi in tương ứng nhóm mực (sheet không có DM_PE → PE dùng DM_OPP) */
function maDungMoiIn(nhom: NhomMuc): string {
  return nhom === 'pet' ? 'DM_PET' : 'DM_OPP';
}

/**
 * CP mực in + dung môi in (₫/m²) cho lớp in.
 *
 * `= (dmMucG × tỉ lệ phủ × giáMực + dmDungMôiG × giáDM) ÷ 1000`
 *
 * QUAN TRỌNG: KHÔNG nhân lại `soMau`. `dinhMucIn` đã là định mức tổng cho n màu
 * (1 màu = 4g, 8 màu = 32g). Nhân lại sẽ ra bình phương số màu.
 * Tỉ lệ phủ (coverageRatio) chỉ nhân vào phần mực; dung môi hòa tan giữ nguyên.
 * Clamp tỉ lệ phủ vào [0, 1]; giá trị không hợp lệ (NaN) → 100%.
 */
export function tinhCpMucDungMoiIn(
  soMau: number | null | undefined,
  tenVatLieu: string | null | undefined,
  ink: CpsxUpgradeInk,
  tyLePhuMuc = 1,
): {
  donGia: number;
  nhomMuc: NhomMuc;
  giaMuc: number;
  giaDungMoi: number;
  dmMucG: number;
  dmDungMoiG: number;
  tyLePhuMuc: number;
} {
  const nhomMuc = chonNhomMuc(tenVatLieu);
  const giaMuc = so(ink?.[nhomMuc]?.appliedPrice);
  const giaDungMoi = donGiaTheoMa(ink?.solventAdhesive, maDungMoiIn(nhomMuc));
  const tyLe = Number.isFinite(tyLePhuMuc) ? Math.min(1, Math.max(0, tyLePhuMuc)) : 1;

  const mau = Math.floor(so(soMau));
  if (mau <= 0) {
    return { donGia: 0, nhomMuc, giaMuc, giaDungMoi, dmMucG: 0, dmDungMoiG: 0, tyLePhuMuc: tyLe };
  }
  const mauClamp = Math.min(8, mau);
  const dm = ink?.dinhMucIn?.find(r => r.soMau === mauClamp);
  const dmMucG = so(dm?.dmMucG);
  const dmDungMoiG = so(dm?.dmDungMoiG);

  // g/m² × ₫/kg ÷ 1000 → ₫/m²
  const donGia = (dmMucG * tyLe * giaMuc + dmDungMoiG * giaDungMoi) / 1000;
  return { donGia, nhomMuc, giaMuc, giaDungMoi, dmMucG, dmDungMoiG, tyLePhuMuc: tyLe };
}

/**
 * CP keo + dung môi ghép (₫/m²) cho MỘT lần ghép (một mặt tiếp giáp).
 *
 * `= (keoKhôG × giáKeo + dungMôiPhaKeoG × giáDM_EA) ÷ 1000`
 *
 * Giá keo = giá đã chọn trong bảng keo (TB cộng / nhập tay — như bảng mực),
 * fallback TB cộng. Mỗi dòng ghép trong Table 1 áp đơn giá này 1 lần → nhiều
 * lớp ghép = nhiều lần keo.
 */
export function tinhCpKeoDungMoiGhep(ink: CpsxUpgradeInk): {
  donGia: number;
  giaKeo: number;
  giaDungMoi: number;
  keoKhoG: number;
  dungMoiPhaKeoG: number;
} {
  const giaKeo = layGiaKeo(ink);
  const giaDungMoi = donGiaTheoMa(ink?.solventAdhesive, 'DM_EA');

  const keoKhoG = so(ink?.dinhMucGhep?.keoKhoG);
  const dungMoiPhaKeoG = so(ink?.dinhMucGhep?.dungMoiPhaKeoG);

  const donGia = (keoKhoG * giaKeo + dungMoiPhaKeoG * giaDungMoi) / 1000;
  return { donGia, giaKeo, giaDungMoi, keoKhoG, dungMoiPhaKeoG };
}

// ── Table 1 ─────────────────────────────────────────────────────────────────

/** Nhãn công đoạn Table 1: CPSX IN → In; cắt → Làm túi; còn lại giữ stage engine. */
function nhanCongDoan(row: UniRow): string {
  if (row.rowKey === 'cut') return 'Làm túi';
  if (row.rowKey === 'print' || row.stage === 'CPSX IN') return 'In';
  return row.stage || '';
}

/**
 * Tra giá NVL (₫/kg) theo materialId + tên — cùng logic fallback với bảng cũ
 * (ManHinhQuanLy.tsx). Trả null khi vendor báo giá theo ₫/m² hoặc không có vật liệu.
 */
function traGiaNVLTheoIdTen(
  materialId: string | undefined,
  ten: string | null | undefined,
  matPriceIsPerM2: boolean | undefined,
  materials: Material[],
): number | null {
  if (matPriceIsPerM2) return null;
  if (!ten || ten === '-' || ten === '') return null;
  const m = materialId
    ? materials.find(x => x.id === materialId)
    : materials.find(x => x.name === ten);
  if (m) return so(m.pricePerKg);
  const u = ten.toUpperCase();
  if (u.includes('MPET')) return 55000;
  if (u.includes('PET')) return 45000;
  if (u.includes('LLDPE') || u === 'PE') return 40000;
  return null;
}

function traGiaNVL(
  row: UniRow,
  materials: Material[],
): number | null {
  return traGiaNVLTheoIdTen(row.materialId, row.mat, row.matPriceIsPerM2, materials);
}

/**
 * Thành tiền Zipper (nâng cao) = Đầu vào NVL làm túi × số phần tử × giá zipper (đ/m).
 * Đầu vào NVL = TP cắt + phi hao (cột Table 1), không dùng qty × bước cắt engine.
 */
export function tinhTienZipperNangCao(
  dauVaoNvlLamTui: number,
  input: { hasDivide?: boolean; divideElements?: number; hasZipper?: boolean } | null | undefined,
  hangSo: AppConstants,
  coZipper: boolean,
): number {
  if (!coZipper) return 0;
  const met = Math.max(0, so(dauVaoNvlLamTui));
  const n = soPhanTuChiaLamTui(input);
  // Mặc định vật tư Zipper = 378 đ/m khi cấu hình thiếu / 0
  const gia = Math.max(0, so(hangSo?.zipperPrice)) || 378;
  return met * n * gia;
}

/**
 * Lật mặt (Table 1) — cùng ĐK Table 2: phủ mờ, có mét in, không GC chia.
 * TP = Đầu vào = TP khâu In; phi hao = 0; mọi cột tiền = 0.
 */
function taoDongLatMatTuIn(dongIn: DongVatLieuNangCao): DongVatLieuNangCao {
  const tpIn = so(dongIn.thanhPham);
  return {
    congDoan: 'Lật mặt',
    vatLieu: dongIn.vatLieu,
    rowKey: 'matte',
    materialId: dongIn.materialId,
    khoMang: dongIn.khoMang,
    thanhPham: tpIn,
    phiHao: 0,
    dauVaoNVL: tpIn,
    giaNVL: 0,
    donViGiaNVL: null,
    cpVatLieu: 0,
    thanhTienNVL: 0,
    cpMucKeo: 0,
    thanhTienMucKeo: 0,
  };
}

function dinhDangKhoM(n: number): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/** Phi hao cắt/làm túi — cùng công thức engine tinhHaoHutCat (cutWasteA/B/C). */
function tinhPhiHaoCatTuHangSo(met: number, hangSo: AppConstants): number {
  const a = so(hangSo?.cutWasteA) || 3000;
  const b = so(hangSo?.cutWasteB) || 20;
  const c = so(hangSo?.cutWasteC) || 100;
  return Math.max(0, so(met)) / a * b + c;
}

/**
 * Chia (Table 1) — khi Có chia, không GC slit.
 * TP = Đầu vào = TP ghép cuối (hoặc TP In) × N; phi hao = 0; chi phí = 0.
 * Khổ hiển thị: khổ trước → khổ chia.
 */
function taoDongChiaNangCao(params: {
  vatLieu: string;
  khoTruoc: number;
  khoChia: number;
  thanhPhamChia: number;
}): DongVatLieuNangCao {
  const tp = Math.max(0, so(params.thanhPhamChia));
  const khoChia = Math.max(0, so(params.khoChia));
  const khoTruoc = Math.max(0, so(params.khoTruoc));
  return {
    congDoan: 'Chia',
    vatLieu: params.vatLieu || '—',
    rowKey: 'chia',
    khoMang: khoChia || null,
    khoMangLabel: `${dinhDangKhoM(khoTruoc)} → ${dinhDangKhoM(khoChia)}`,
    thanhPham: tp,
    phiHao: 0,
    dauVaoNVL: tp,
    giaNVL: 0,
    donViGiaNVL: null,
    cpVatLieu: 0,
    thanhTienNVL: 0,
    cpMucKeo: 0,
    thanhTienMucKeo: 0,
  };
}

/** TP mét dòng nguồn chia: ghép cuối (rowKey lam-*) hoặc In. */
function layTpVaKhoNguonChia(
  rows: DongVatLieuNangCao[],
  uniRows: UniRow[],
  result: CalculateResult,
): { tpNguon: number; khoTruoc: number } {
  const dongGhep = [...rows].reverse().find(r => r.rowKey.startsWith('lam-') && r.congDoan !== '');
  if (dongGhep) {
    return { tpNguon: so(dongGhep.thanhPham), khoTruoc: so(dongGhep.khoMang) };
  }
  const uniGhep = [...(uniRows ?? [])].reverse().find(r => r.rowKey.startsWith('lam-'));
  if (uniGhep) {
    return { tpNguon: so(uniGhep.meters), khoTruoc: so(uniGhep.width) };
  }
  const dongIn = rows.find(r => r.rowKey === 'print' && r.congDoan !== '');
  if (dongIn) {
    return { tpNguon: so(dongIn.thanhPham), khoTruoc: so(dongIn.khoMang) };
  }
  const uniIn = (uniRows ?? []).find(r => r.rowKey === 'print');
  if (uniIn) {
    return { tpNguon: so(uniIn.meters), khoTruoc: so(uniIn.width) };
  }
  return {
    tpNguon: so(result?.printMeters),
    khoTruoc: so(result?.input?.spreadWidth),
  };
}

/**
 * Lập các dòng Table 1 từ uniRows + phụ kiện túi.
 * Ghép tách theo lớp (như bảng cũ). Dòng ghép có nhiều vật liệu song song
 * (`materialDetails`) → tách 1 dòng/chi tiết; meters/phi hao lặp lại cấp lớp.
 * Dòng Làm túi: gộp Zipper/Băng keo/Quai vào cùng hàng (không tách dòng).
 * Zipper: Đầu vào NVL × số phần tử × giá zipper; băng keo/quai: tổng engine.
 * Phủ mờ: chèn dòng Lật mặt ngay sau In (VL/khổ copy In; chi phí = 0).
 * Có chia: chèn dòng Chia trước Làm túi; Làm túi ĐV = TP Chia, phi hao = công thức cắt(ĐV).
 */
export function lapDongVatLieuNangCao(
  result: CalculateResult,
  uniRows: UniRow[],
  hangSo: AppConstants,
  materials: Material[] = [],
  overrides?: OverrideTable,
): DongVatLieuNangCao[] {
  const ink = layInk(hangSo);
  const laMang = result?.input?.productType === 'mang';
  const soMau = result?.input?.numColors;
  const tyLePhuMuc = result?.input?.coverageRatio;
  const donGiaKeo = tinhCpKeoDungMoiGhep(ink).donGia;
  const phuMo = result?.input?.hasMo === true;
  const coChia = result?.input?.hasDivide === true;
  const soPtChia = soPhanTuChiaLamTui(result?.input);
  const khoChiaM = Math.max(0, so(result?.input?.divideWidthMm) / 1000);
  const cacBuocGc = result?.input?.pricingMode === 'outsource'
    ? (result?.input?.outsource?.steps ?? [])
    : [];
  const laGcSlit = (cacBuocGc as string[]).includes('slit');

  const coZipper = !!result?.input?.hasZipper || so(result?.zipperTotal) > 0;
  const coBangKeo = !!result?.input?.hasTape || so(result?.tapeTotal) > 0;
  const coQuai = !!result?.input?.hasHandle || so(result?.handleTotal) > 0;
  const tenPhuKien: string[] = [];
  if (coZipper) tenPhuKien.push('Zipper');
  if (coBangKeo) tenPhuKien.push('Băng keo');
  if (coQuai) tenPhuKien.push('Quai');
  const nhanVatLieuTui = tenPhuKien.length > 0 ? tenPhuKien.join(' + ') : null;
  const tienBangKeo = coBangKeo ? so(result?.tapeTotal) : 0;
  const tienQuai = coQuai ? so(result?.handleTotal) : 0;

  // TP Chia (dùng sớm cho nhánh Làm túi) — TP nguồn × N
  const { tpNguon: tpNguonChiaSom, khoTruoc: khoTruocSom } = layTpVaKhoNguonChia([], uniRows ?? [], result);
  const tpChiaSom = tpNguonChiaSom * soPtChia;

  const rows: DongVatLieuNangCao[] = (uniRows ?? []).flatMap(row => {
    const thanhPham = so(row.meters);
    const phiHao = so(row.waste);
    const dauVaoNVL = thanhPham + phiHao;

    let cpMucKeo: number | null = null;
    let ghiChu: string | undefined;
    if (row.rowKey === 'print') {
      const r = tinhCpMucDungMoiIn(soMau, row.mat, ink, tyLePhuMuc);
      // Nhũ + phủ mờ + phí in khác (metallicSurcharge) gộp vào dòng mực + dung môi
      const phiInBoSung = so(result?.input?.metallicSurcharge);
      const phiBoSungM2 = so(soMau) > 0 ? phiInBoSung : 0;
      cpMucKeo = r.donGia + phiBoSungM2;
      ghiChu = r.tyLePhuMuc !== 1
        ? `(${r.dmMucG}g × ${Math.round(r.tyLePhuMuc * 100)}% × ${r.giaMuc.toLocaleString('vi-VN')} + ${r.dmDungMoiG}g × ${r.giaDungMoi.toLocaleString('vi-VN')}) ÷ 1000 — bảng ${r.nhomMuc.toUpperCase()}`
        : `(${r.dmMucG}g × ${r.giaMuc.toLocaleString('vi-VN')} + ${r.dmDungMoiG}g × ${r.giaDungMoi.toLocaleString('vi-VN')}) ÷ 1000 — bảng ${r.nhomMuc.toUpperCase()}`;
      if (phiBoSungM2 > 0) {
        ghiChu += ` + ${phiBoSungM2.toLocaleString('vi-VN')} đ/m² (nhũ/phủ mờ/phí in khác)`;
      }
    } else if (row.rowKey.startsWith('lam-')) {
      cpMucKeo = donGiaKeo;
      const k = tinhCpKeoDungMoiGhep(ink);
      ghiChu = `(${k.keoKhoG}g × ${k.giaKeo.toLocaleString('vi-VN')} + ${k.dungMoiPhaKeoG}g × ${k.giaDungMoi.toLocaleString('vi-VN')}) ÷ 1000 — keo + DM EA`;
    }

    // Ghi đè tay CP mực + DM + keo (đ/m²)
    const ov = overrides?.[row.rowKey];
    if (ov?.cpMucKeoPerM2 !== undefined && cpMucKeo != null) {
      cpMucKeo = Math.max(0, so(ov.cpMucKeoPerM2));
      ghiChu = `Ghi đè tay: ${cpMucKeo.toLocaleString('vi-VN')} đ/m²`;
    }

    const chenLatMat = (dongInList: DongVatLieuNangCao[]): DongVatLieuNangCao[] => {
      if (row.rowKey !== 'print' || !phuMo || laGcSlit || thanhPham <= 0) return dongInList;
      const mauIn = dongInList[0];
      if (!mauIn) return dongInList;
      return [...dongInList, taoDongLatMatTuIn(mauIn)];
    };

    // Ghép nhiều vật liệu song song → tách 1 dòng/chi tiết (như bảng cũ);
    // công đoạn chỉ hiện ở dòng đầu, dòng sau để trống (như ô gộp)
    if (row.materialDetails?.length) {
      const dongChiTiet = row.materialDetails.map((detail, idx) => {
        let giaNVL = traGiaNVLTheoIdTen(
          detail.materialId,
          detail.name,
          row.matPriceIsPerM2,
          materials,
        );
        const ovDetail = ov?.detailOverrides?.[idx];
        if (ovDetail?.rawMatPrice !== undefined && giaNVL != null) {
          giaNVL = Math.max(0, so(ovDetail.rawMatPrice));
        } else if (ov?.rawMatPrice !== undefined && idx === 0 && giaNVL != null) {
          giaNVL = Math.max(0, so(ov.rawMatPrice));
        }
        const kho = so(detail.width);
        // Công đoạn gia công ngoài: CP gia công (costCPSX) gộp vào dòng vật liệu đầu tiên
        const cpGiaCongNgoai = row.isOutsourced && idx === 0 ? so(row.costCPSX) : 0;
        return {
          congDoan: idx === 0 ? nhanCongDoan(row) : '',
          vatLieu: detail.name || '—',
          rowKey: row.rowKey,
          materialId: detail.materialId,
          chiTietIndex: idx,
          khoMang: kho || null,
          thanhPham,
          phiHao,
          dauVaoNVL,
          giaNVL,
          donViGiaNVL: giaNVL != null ? 'kg' : null,
          cpVatLieu: so(detail.matPrice),
          thanhTienNVL: so(detail.costMat) + cpGiaCongNgoai,
          cpMucKeo,
          thanhTienMucKeo: cpMucKeo != null ? cpMucKeo * dauVaoNVL * kho : null,
          ghiChu,
        };
      });
      return chenLatMat(dongChiTiet);
    }

    const khoHieuDung = so(row.width);
    let giaNVL = traGiaNVL(row, materials);
    if (ov?.rawMatPrice !== undefined && giaNVL != null) {
      giaNVL = Math.max(0, so(ov.rawMatPrice));
    }
    // Công đoạn gia công ngoài: CP gia công (costCPSX) cộng vào thành tiền CPNVL
    const cpGiaCongNgoai = row.isOutsourced ? so(row.costCPSX) : 0;

    // Làm túi: gộp phụ kiện vào cùng dòng (Vật liệu = Zipper + Băng keo + …)
    if (row.rowKey === 'cut' && !laMang) {
      // Có chia: ĐV = TP Chia; phi hao tính lại theo công thức cắt trên ĐV; khổ = khổ chia.
      // ĐV đã gồm ×N → zipper chỉ × ĐV (không nhân N lần nữa).
      const dauVaoTui = coChia && !laGcSlit ? tpChiaSom : dauVaoNVL;
      const phiHaoTui = coChia && !laGcSlit
        ? tinhPhiHaoCatTuHangSo(dauVaoTui, hangSo)
        : phiHao;
      const khoTui = coChia && !laGcSlit && khoChiaM > 0 ? khoChiaM : (khoHieuDung || null);
      const inputZipper = coChia && !laGcSlit
        ? { ...result?.input, hasDivide: false as const }
        : result?.input;
      const tienZipper = tinhTienZipperNangCao(
        dauVaoTui,
        inputZipper,
        hangSo,
        coZipper,
      );
      const thanhTienPhuKien = tienZipper + tienBangKeo + tienQuai;
      const soPtGhiChu = coChia && !laGcSlit ? 1 : soPhanTuChiaLamTui(result?.input);
      const giaZ = Math.max(0, so(hangSo?.zipperPrice)) || 378;
      let ghiChuTui: string | undefined;
      if (coZipper) {
        ghiChuTui = soPtGhiChu > 1
          ? `Zipper = Đầu vào NVL ${dauVaoTui.toLocaleString('vi-VN')} × ${soPtGhiChu} phần tử × ${giaZ.toLocaleString('vi-VN')} đ/m`
          : `Zipper = Đầu vào NVL ${dauVaoTui.toLocaleString('vi-VN')} × ${giaZ.toLocaleString('vi-VN')} đ/m`;
        if (tienBangKeo > 0 || tienQuai > 0) {
          ghiChuTui += ' · Băng keo/quai theo tổng engine';
        }
      } else if (thanhTienPhuKien > 0) {
        ghiChuTui = 'Băng keo/quai theo tổng engine';
      }
      return [{
        congDoan: nhanCongDoan(row),
        vatLieu: nhanVatLieuTui ?? (row.mat && row.mat !== '-' ? row.mat : '-'),
        rowKey: row.rowKey,
        materialId: row.materialId,
        khoMang: khoTui,
        thanhPham,
        phiHao: phiHaoTui,
        dauVaoNVL: dauVaoTui,
        giaNVL: null,
        donViGiaNVL: null,
        cpVatLieu: null,
        thanhTienNVL: thanhTienPhuKien,
        cpMucKeo: null,
        thanhTienMucKeo: null,
        ghiChu: ghiChuTui,
      }];
    }

    return chenLatMat([{
      congDoan: nhanCongDoan(row),
      vatLieu: row.mat || '—',
      rowKey: row.rowKey,
      materialId: row.materialId,
      khoMang: khoHieuDung || null,
      thanhPham,
      phiHao,
      dauVaoNVL,
      giaNVL,
      donViGiaNVL: giaNVL != null ? 'kg' : null,
      cpVatLieu: row.matPrice,
      thanhTienNVL: so(row.costMat) + cpGiaCongNgoai,
      cpMucKeo,
      thanhTienMucKeo: cpMucKeo != null ? cpMucKeo * dauVaoNVL * khoHieuDung : null,
      ghiChu,
    }]);
  });

  // Chèn dòng Chia sau ghép / trước Làm túi (cùng ĐK Table 2)
  if (coChia && !laGcSlit) {
    const { tpNguon, khoTruoc } = layTpVaKhoNguonChia(rows, uniRows ?? [], result);
    const tpChia = tpNguon * soPtChia;
    if (tpChia > 0 || tpNguon > 0) {
      const dongChia = taoDongChiaNangCao({
        vatLieu: String(result?.structureText ?? '').trim() || '—',
        khoTruoc: khoTruoc || khoTruocSom,
        khoChia: khoChiaM,
        thanhPhamChia: tpChia,
      });
      const idxCut = rows.findIndex(r => r.rowKey === 'cut');
      if (idxCut >= 0) {
        rows.splice(idxCut, 0, dongChia);
      } else {
        rows.push(dongChia);
      }
    }
  }

  return rows;
}

// ── Table 2 ─────────────────────────────────────────────────────────────────

/**
 * Áp ghi đè TG SX / CP NC / CP điện cho 1 dòng.
 * rowKeys: thứ tự ưu tiên tra override (dòng ghép gộp: lam-2 → lam-5,
 * lấy override của lớp đầu tiên có giá trị). Trả dòng mới + rowKey hiệu lực.
 */
function apDungGhiDeThoiGian(
  dongNC: DongNhanCongDien,
  rowKeys: OverrideRowKey[],
  overrides?: OverrideTable,
): DongNhanCongDien {
  if (!overrides) return dongNC;
  const ghiDe = rowKeys
    .map(rk => ({ rk, o: overrides[rk] }))
    .find(({ o }) => o && (o.thoiGianPhut !== undefined || o.cpNhanCongPerPhut !== undefined || o.cpDienPerPhut !== undefined));
  if (!ghiDe) return dongNC;
  const phut = ghiDe.o!.thoiGianPhut !== undefined ? Math.max(0, so(ghiDe.o!.thoiGianPhut)) : dongNC.thoiGianPhut;
  const nc = ghiDe.o!.cpNhanCongPerPhut !== undefined ? Math.max(0, so(ghiDe.o!.cpNhanCongPerPhut)) : dongNC.cpNhanCongPerPhut;
  const dien = ghiDe.o!.cpDienPerPhut !== undefined ? Math.max(0, so(ghiDe.o!.cpDienPerPhut)) : dongNC.cpDienPerPhut;
  return {
    ...dongNC,
    rowKey: ghiDe.rk,
    thoiGianPhut: phut,
    cpNhanCongPerPhut: nc,
    cpDienPerPhut: dien,
    thanhTienNhanCong: (phut ?? 0) * so(nc),
    thanhTienDien: (phut ?? 0) * so(dien),
  };
}

/**
 * Lập các dòng Table 2: in / chia (khi Có chia) / ghép / làm túi.
 * Thành tiền = thời gian (phút) × đơn giá (₫/phút) — nhân trực tiếp, không chia số máy.
 */
export function lapDongNhanCongDien(
  result: CalculateResult,
  hangSo: AppConstants,
  overrides?: OverrideTable,
): DongNhanCongDien[] {
  const tg = chuanHoaCpsxUpgradeThoiGian(
    hangSo?.cpsxUpgradeThoiGian,
    DEFAULT_CPSX_UPGRADE_THOIGIAN,
  );
  const lab = hangSo?.cpsxUpgradeLabor ?? DEFAULT_CPSX_UPGRADE_LABOR;
  const el = hangSo?.cpsxUpgradeElectric ?? DEFAULT_CPSX_UPGRADE_ELECTRIC;
  const giaKwh = el?.appliedPricePerKwh ?? null;
  const laMang = result?.input?.productType === 'mang';

  const metIn = so(result?.printMeters) + so(result?.printWaste);
  const soMau = so(result?.input?.numColors);
  const cacLopGhep = result?.layers?.laminations ?? [];
  const metGhep = cacLopGhep.reduce(
    (s: number, l: { meters?: number; waste?: number }) => s + so(l?.meters) + so(l?.waste),
    0,
  );
  const soLanGhep = cacLopGhep.length;
  const phuMo = result?.input?.hasMo === true;
  const coChia = result?.input?.hasDivide === true;
  const cauTrucMang = String(result?.structureText ?? '');
  const cutStepM = so(result?.input?.cutStep);
  const bagType = String(result?.input?.bagType ?? '');
  const hasZipper = !!result?.input?.hasZipper;

  // Công đoạn nào đang thuê ngoài → bỏ dòng NC + điện (CP nằm trong đơn giá gia công)
  const cacBuocGc = result?.input?.pricingMode === 'outsource'
    ? (result?.input?.outsource?.steps ?? [])
    : [];
  const laGc = (buoc: string) => (cacBuocGc as string[]).includes(buoc);

  const dong = (
    congDoan: string,
    thoiGianPhut: number | null,
    cpNhanCongPerPhut: number | null,
    mayDien: { powerKw: number; efficiency: number } | undefined,
  ): DongNhanCongDien => {
    const cpDienPerPhut = mayDien
      ? tinhDienMoiPhut(mayDien.powerKw, mayDien.efficiency, giaKwh)
      : null;
    const phut = thoiGianPhut ?? 0;
    return {
      congDoan,
      rowKey: congDoan === 'in' ? 'print' : congDoan === 'chia' ? 'chia' : congDoan === 'làm túi' ? 'cut' : congDoan === 'lật mặt' ? 'matte' : 'lam-2',
      thoiGianPhut,
      cpNhanCongPerPhut,
      thanhTienNhanCong: phut * so(cpNhanCongPerPhut),
      cpDienPerPhut,
      thanhTienDien: phut * so(cpDienPerPhut),
    };
  };

  const rows: DongNhanCongDien[] = [];

  // in — setup theo số màu (lên trục + duyệt mẫu) + phủ mờ
  if (!laGc('print')) {
    rows.push(apDungGhiDeThoiGian(dong(
      'in',
      metIn > 0 ? tinhThoiGianMayIn(metIn, soMau, tg.print, phuMo).tongPhut : null,
      luongMoiPhutAp(
        luongMoiPhutTinh(
          lab.print.wages, lab.print.hoursPerDay,
          lab.print.mealMorning, lab.print.mealEvening, lab.print.otFactor,
          undefined, lab.print.tyLeTangCa, lab.print.otHours,
        ),
        lab.print.roundedPerMin,
      ),
      el?.machines?.print,
    ), ['print'], overrides));
  }

  // lật mặt — chỉ khi có phủ mờ; thời gian theo rule matte_flip (bảng máy chia); ẩn khi thuê ngoài chia
  if (phuMo && metIn > 0 && !laGc('slit')) {
    const ruleMatte = tg.slit.rules.find(r => r.key === 'matte_flip') ?? tg.slit.rules[0];
    if (ruleMatte) {
      rows.push(apDungGhiDeThoiGian(dong(
        'lật mặt',
        ruleMatte.setupMinutes + metIn / (ruleMatte.speedMPerMin || 1),
        luongMoiPhutAp(
          luongMoiPhutTinh(
            lab.slit.wages, lab.slit.hoursPerDay,
            lab.slit.mealMorning, lab.slit.mealEvening, lab.slit.otFactor,
            undefined, lab.slit.tyLeTangCa, lab.slit.otHours,
          ),
          lab.slit.roundedPerMin,
        ),
        el?.machines?.slit,
      ), ['matte'], overrides));
    }
  }

  // ghép — setup lần đầu + mỗi lớp ghép tiếp theo setup lại; ghi đè ưu tiên lam-2 → lam-5
  if (!laGc('laminate')) {
    rows.push(apDungGhiDeThoiGian(dong(
      'ghép',
      metGhep > 0 ? tinhThoiGianMayGhep(metGhep, soLanGhep, tg.laminate).tongPhut : null,
      luongMoiPhutAp(
        luongMoiPhutTinh(
          lab.laminate.wages, lab.laminate.hoursPerDay,
          lab.laminate.mealMorning, lab.laminate.mealEvening, lab.laminate.otFactor,
          undefined, lab.laminate.tyLeTangCa, lab.laminate.otHours,
        ),
        lab.laminate.roundedPerMin,
      ),
      el?.machines?.laminate,
    ), ['lam-2', 'lam-3', 'lam-4', 'lam-5'], overrides));
  }

  // chia — chỉ hiện khi tick "Có chia"; mét = metChiaHoacLamTui (ghép cuối hoặc in)
  if (coChia && metIn > 0 && !laGc('slit')) {
    const ruleChia = chonRuleMayChia(tg.slit, cauTrucMang, soLanGhep);
    const metInChia = metChiaHoacLamTui(result);
    rows.push(apDungGhiDeThoiGian(dong(
      'chia',
      tinhThoiGianMayChia(metInChia, ruleChia).tongPhut,
      luongMoiPhutAp(
        luongMoiPhutTinh(
          lab.slit.wages, lab.slit.hoursPerDay,
          lab.slit.mealMorning, lab.slit.mealEvening, lab.slit.otFactor,
          undefined, lab.slit.tyLeTangCa, lab.slit.otHours,
        ),
        lab.slit.roundedPerMin,
      ),
      el?.machines?.slit,
    ), ['chia'], overrides));
  }

  // làm túi — TG = setup + (Đầu vào NVL × số phần tử) / tốc độ
  // mét = (cutMeters+cutWaste) × soPhanTu (Có chia). KHÔNG dùng mét ghép cuối / số túi.
  if (!laMang && !laGc('bag')) {
    const setupTui = chonSetupMayTui(tg.bag, bagType, hasZipper, cutStepM);
    const tocDoTui = chonTocDoMayTui(tg.bag, cutStepM);
    const metInLamTui = metLamTuiTuDauVaoNVL(result);
    rows.push(apDungGhiDeThoiGian(dong(
      'làm túi',
      metInLamTui > 0 ? tinhThoiGianMayTui(metInLamTui, setupTui, tocDoTui).tongPhut : null,
      luongMoiPhutTuiAp(
        luongMoiPhutTinh(
          lab.bag.wages, lab.bag.hoursPerDay,
          lab.bag.mealMorning, lab.bag.mealEvening, lab.bag.otFactor,
          soCongNhanTui(lab.bag.wages), lab.bag.tyLeTangCa, lab.bag.otHours,
        ),
        lab.bag.roundedPerMin,
        lab.bag.machinesPerDay,
      ),
      el?.machines?.bag,
    ), ['cut'], overrides));
  }

  return rows;
}

// ── Cụm 3 dòng tổng ─────────────────────────────────────────────────────────

/**
 * Dòng 1 = Σ thành tiền CPNVL (gồm phụ kiện) + Σ thành tiền mực/DM/keo
 * Dòng 2 = Σ thành tiền nhân công + Σ thành tiền điện
 * Dòng 3 = Dòng 1 + Dòng 2
 */
export function tinhTongNangCao(
  dongVatLieu: DongVatLieuNangCao[],
  dongNhanCongDien: DongNhanCongDien[],
): TongNangCao {
  const tongVatLieu = (dongVatLieu ?? []).reduce(
    (s, r) => s + so(r.thanhTienNVL) + so(r.thanhTienMucKeo),
    0,
  );
  const tongNhanCongDien = (dongNhanCongDien ?? []).reduce(
    (s, r) => s + so(r.thanhTienNhanCong) + so(r.thanhTienDien),
    0,
  );
  return {
    tongVatLieu,
    tongNhanCongDien,
    tongGiaThanh: tongVatLieu + tongNhanCongDien,
  };
}

// ── Kết quả hiệu lực cho tab tính giá nâng cấp ────────────────────────────────
// Giá mỗi sản phẩm của tab nâng cấp lấy từ TỔNG bảng đặc tả nâng cao (thay thế
// giá vốn SX của engine):
//   tongSX = tongGiaThanh − phụ kiện (zipper/băng keo/quai) + CP thời gian in màng
//   doanhThu = tongSX × (1 + LN%)
//   giá vốn/đơn vị = doanhThu ÷ số lượng
//   giá cuối = giá vốn/đơn vị + phụ kiện + thùng + vận chuyển + lãi vay + hoa hồng
//              + trục phân bổ + phụ phí gia công
// Override hiệu lực: Admin thắng nếu có, ngược lại Sale (giống bảng ghi đè cũ).
export interface KetQuaNangCaoHieuLuc {
  /** Clone của result với các field giá thay bằng giá tính từ bảng nâng cao */
  result: CalculateResult;
  /** Tổng bảng nâng cao (gồm phụ kiện + CP gia công ngoài) */
  tongGiaThanh: number;
  /** Cơ sở giá thành SX (không gồm phụ kiện, đã cộng CP thời gian in màng) */
  tongSX: number;
  tyLeLoiNhuan: number;
  tienLoiNhuan: number;
  doanhThu: number;
  giaVonDonVi: number;
  laiSuatPerDonVi: number;
  hoaHongPerDonVi: number;
  giaCuoiCung: number;
}

export function tinhKetQuaNangCaoHieuLuc(params: {
  result: CalculateResult;
  uniRows: UniRow[];
  constants: AppConstants;
  materials?: Material[];
  saleOverrides?: OverrideTable;
  adminOverrides?: OverrideTable;
  saleProfitRatePct?: number;
  adminProfitRatePct?: number;
  profitTable: ProfitRow[];
}): KetQuaNangCaoHieuLuc {
  const {
    result,
    uniRows,
    constants,
    materials = [],
    saleOverrides = {},
    adminOverrides = {},
    saleProfitRatePct = 0,
    adminProfitRatePct = 0,
    profitTable,
  } = params;

  const adminDangHoatDong = Object.keys(adminOverrides).length > 0;
  const activeOv = adminDangHoatDong
    ? adminOverrides
    : Object.keys(saleOverrides).length > 0
      ? saleOverrides
      : {};
  const sourceOv = adminDangHoatDong ? saleOverrides : {};
  const hasAnyOverride = Object.keys(activeOv).length > 0;

  const dongDaXuLy: UniRow[] = hasAnyOverride
    ? xuLyDongGhiDe(uniRows, sourceOv, activeOv).rows
    : uniRows;

  const dongVatLieu = lapDongVatLieuNangCao(
    result,
    dongDaXuLy,
    constants,
    materials,
    hasAnyOverride ? activeOv : undefined,
  );
  const dongNCD = lapDongNhanCongDien(
    result,
    constants,
    hasAnyOverride ? activeOv : undefined,
  );
  const tong = tinhTongNangCao(dongVatLieu, dongNCD);

  const soLuong = so(result?.input?.quantity);
  // Phụ kiện đã gộp vào dòng Làm túi (thanhTienNVL) — trừ đúng số trên bảng NC
  const phuKien = dongVatLieu
    .filter((r) => r.rowKey === 'cut')
    .reduce((s, r) => s + so(r.thanhTienNVL), 0);
  const printFilmCost =
    (uniRows ?? []).find((row) => so(row.printFilmCost) > 0)?.printFilmCost ?? 0;
  // Chi phí engine có nhưng không nằm trong uniRows (VD: bao PP gia công) —
  // tránh bảng nâng cấp thiếu sót so với giá thành engine.
  const tongDongUniRows = (uniRows ?? []).reduce(
    (s, row) => s + so(row.costCPSX) + so(row.costMat),
    0,
  );
  const phanChuaTrongBang = Math.max(
    0,
    so(result?.totalProductionCost) - tongDongUniRows - printFilmCost,
  );
  const tongSX = tong.tongGiaThanh - phuKien + printFilmCost + phanChuaTrongBang;

  // LN% — ghi đè LN (Admin/Sale) thắng, còn lại tra bảng theo tongSX (giống engine)
  const isPrintFilmOnly =
    result?.input?.productType === 'mang' &&
    result?.input?.filmType === 'mangIn' &&
    !result.input.layer2Id &&
    !result.input.layer2AltId &&
    !result.input.layer3Id &&
    !result.input.layer4Id &&
    !result.input.layer5Id;
  const tyLeLoiNhuan =
    adminProfitRatePct > 0
      ? adminProfitRatePct / 100
      : saleProfitRatePct > 0
        ? saleProfitRatePct / 100
        : isPrintFilmOnly
          ? (constants?.printFilmProfitRates ?? []).find(
              (row) =>
                row.customerGroup ===
                  (result?.input?.printFilmCustomerGroup ?? 'normal') &&
                (result?.input?.numColors ?? 0) >= row.colorFrom &&
                (result?.input?.numColors ?? 0) <= row.colorTo,
            )?.rate ?? result?.profitRate ?? 0
          : traLoiNhuanTheoBang(
              tongSX,
              result?.input?.profitColumn ?? 2,
              profitTable,
              result?.input?.printFilmCustomerGroup ?? 'normal',
            );

  const tienLoiNhuan = tyLeLoiNhuan * tongSX;
  const doanhThu = tongSX + tienLoiNhuan;
  const giaVonDonVi = soLuong > 0 ? doanhThu / soLuong : 0;

  // Lãi vay — cùng công thức engine nhưng trên giá vốn+LN mới
  const laiSuatPerDonVi = isPrintFilmOnly
    ? giaVonDonVi * (result?.interestBase ?? 0.01)
    : ((so(result?.interestBase) + so(result?.interestSpread)) / 12) *
      ((result?.input?.paymentDays ?? 30) / 30) *
      giaVonDonVi;

  // Hoa hồng — cùng công thức engine nhưng trên tongSX mới
  const hoaHongPerDonVi =
    soLuong > 0
      ? (result?.input?.commissionFixedVND ?? 0) > 0
        ? result?.input?.commissionFixedVND ?? 0
        : (result?.input?.commissionRate ?? 0) * (tongSX / soLuong)
      : 0;

  const giaCuoiCung =
    giaVonDonVi +
    so(result?.zipperPerUnit) +
    so(result?.tapePerUnit) +
    so(result?.handlePerUnit) +
    so(result?.boxPerUnit) +
    so(result?.shippingPerUnit) +
    laiSuatPerDonVi +
    hoaHongPerDonVi +
    so(result?.cylAllocPerUnit) +
    so(result?.gcShippingPerUnit) +
    so(result?.gcPackagingPerUnit) +
    so(result?.gcOtherPerUnit);

  const ketQua: CalculateResult = {
    ...result,
    totalProductionCost: tongSX,
    profitRate: tyLeLoiNhuan,
    profitAmount: tienLoiNhuan,
    revenue: doanhThu,
    costPerUnit: giaVonDonVi,
    interestPerUnit: laiSuatPerDonVi,
    commissionPerUnit: hoaHongPerDonVi,
    finalPrice: giaCuoiCung,
  };

  return {
    result: ketQua,
    tongGiaThanh: tong.tongGiaThanh,
    tongSX,
    tyLeLoiNhuan,
    tienLoiNhuan,
    doanhThu,
    giaVonDonVi,
    laiSuatPerDonVi,
    hoaHongPerDonVi,
    giaCuoiCung,
  };
}
