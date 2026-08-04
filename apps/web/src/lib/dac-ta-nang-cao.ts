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
  Material,
  SolventAdhesiveTable,
} from './types';
import type { UniRow } from './manager-calculation';
import { tinhThoiGianMayIn, tinhThoiGianMayChay } from './cpsx-upgrade-thoigian';
import {
  luongMoiPhut1May1Ca,
  luongMoiPhut1MayTrenNgay,
  luongMoiPhutTuiAp,
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
  khoMang: number | null;
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

function donGiaTheoMa(bang: SolventAdhesiveTable | undefined, ma: string): number {
  const row = bang?.rows?.find(r => r.ma === ma);
  return row ? so(row.donGia) : 0;
}

function layInk(hangSo: AppConstants): CpsxUpgradeInk {
  return hangSo?.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK;
}

/**
 * Chọn bảng giá mực theo tên vật liệu lớp in.
 * Thứ tự kiểm tra: MPET/PET trước PE (vì 'PET' chứa substring 'PE').
 */
export function chonNhomMuc(tenVatLieu: string | null | undefined): NhomMuc {
  const u = String(tenVatLieu ?? '').toUpperCase();
  if (u.includes('PET')) return 'pet';           // gồm cả MPET
  if (u.includes('OPP')) return 'opp';           // gồm cả BOPP
  if (u.includes('PE')) return 'pe';             // LLDPE, PE
  return 'opp';
}

/** Mã dung môi in tương ứng nhóm mực (sheet không có DM_PE → PE dùng DM_OPP) */
function maDungMoiIn(nhom: NhomMuc): string {
  return nhom === 'pet' ? 'DM_PET' : 'DM_OPP';
}

/**
 * CP mực in + dung môi in (₫/m²) cho lớp in.
 *
 * `= (dmMucG × giáMực + dmDungMôiG × giáDM) ÷ 1000`
 *
 * QUAN TRỌNG: KHÔNG nhân lại `soMau`. `dinhMucIn` đã là định mức tổng cho n màu
 * (1 màu = 4g, 8 màu = 32g). Nhân lại sẽ ra bình phương số màu.
 */
export function tinhCpMucDungMoiIn(
  soMau: number | null | undefined,
  tenVatLieu: string | null | undefined,
  ink: CpsxUpgradeInk,
): {
  donGia: number;
  nhomMuc: NhomMuc;
  giaMuc: number;
  giaDungMoi: number;
  dmMucG: number;
  dmDungMoiG: number;
} {
  const nhomMuc = chonNhomMuc(tenVatLieu);
  const giaMuc = so(ink?.[nhomMuc]?.appliedPrice);
  const giaDungMoi = donGiaTheoMa(ink?.solventAdhesive, maDungMoiIn(nhomMuc));

  const mau = Math.floor(so(soMau));
  if (mau <= 0) {
    return { donGia: 0, nhomMuc, giaMuc, giaDungMoi, dmMucG: 0, dmDungMoiG: 0 };
  }
  const mauClamp = Math.min(8, mau);
  const dm = ink?.dinhMucIn?.find(r => r.soMau === mauClamp);
  const dmMucG = so(dm?.dmMucG);
  const dmDungMoiG = so(dm?.dmDungMoiG);

  // g/m² × ₫/kg ÷ 1000 → ₫/m²
  const donGia = (dmMucG * giaMuc + dmDungMoiG * giaDungMoi) / 1000;
  return { donGia, nhomMuc, giaMuc, giaDungMoi, dmMucG, dmDungMoiG };
}

/**
 * CP keo + dung môi ghép (₫/m²) cho MỘT lần ghép (một mặt tiếp giáp).
 *
 * `= (keoKhôG × giáKeoTB + dungMôiPhaKeoG × giáDM_EA) ÷ 1000`
 *
 * Giá keo = trung bình cộng các dòng có mã bắt đầu `KEO_`.
 * Mỗi dòng ghép trong Table 1 áp đơn giá này 1 lần → nhiều lớp ghép = nhiều lần keo.
 */
export function tinhCpKeoDungMoiGhep(ink: CpsxUpgradeInk): {
  donGia: number;
  giaKeo: number;
  giaDungMoi: number;
  keoKhoG: number;
  dungMoiPhaKeoG: number;
} {
  const rows = ink?.solventAdhesive?.rows ?? [];
  const keoRows = rows.filter(r => String(r.ma ?? '').startsWith('KEO_'));
  const giaKeo = keoRows.length > 0
    ? keoRows.reduce((s, r) => s + so(r.donGia), 0) / keoRows.length
    : 0;
  const giaDungMoi = donGiaTheoMa(ink?.solventAdhesive, 'DM_EA');

  const keoKhoG = so(ink?.dinhMucGhep?.keoKhoG);
  const dungMoiPhaKeoG = so(ink?.dinhMucGhep?.dungMoiPhaKeoG);

  const donGia = (keoKhoG * giaKeo + dungMoiPhaKeoG * giaDungMoi) / 1000;
  return { donGia, giaKeo, giaDungMoi, keoKhoG, dungMoiPhaKeoG };
}

// ── Table 1 ─────────────────────────────────────────────────────────────────

/** Nhãn công đoạn thân thiện cho Table 1 */
function nhanCongDoan(row: UniRow): string {
  if (row.rowKey === 'print') return 'in';
  if (row.rowKey === 'cut') return 'chia';
  const m = /^lam-(\d)$/.exec(row.rowKey);
  if (m) return `ghép (Lớp ${m[1]})`;
  return row.stage;
}

/**
 * Tra giá NVL (₫/kg) theo materialId hoặc tên — cùng logic fallback với bảng cũ
 * (ManHinhQuanLy.tsx). Trả null khi vendor báo giá theo ₫/m² hoặc không có vật liệu.
 */
function traGiaNVL(
  row: UniRow,
  materials: Material[],
): number | null {
  if (row.matPriceIsPerM2) return null;
  if (!row.mat || row.mat === '-' || row.mat === '') return null;
  const m = row.materialId
    ? materials.find(x => x.id === row.materialId)
    : materials.find(x => x.name === row.mat);
  if (m) return so(m.pricePerKg);
  const u = row.mat.toUpperCase();
  if (u.includes('MPET')) return 55000;
  if (u.includes('PET')) return 45000;
  if (u.includes('LLDPE') || u === 'PE') return 40000;
  return null;
}

/**
 * Lập các dòng Table 1 từ uniRows + phụ kiện túi.
 * Ghép tách theo lớp (như bảng cũ). Dòng `làm túi` gộp toàn bộ phụ kiện.
 */
export function lapDongVatLieuNangCao(
  result: CalculateResult,
  uniRows: UniRow[],
  hangSo: AppConstants,
  materials: Material[] = [],
): DongVatLieuNangCao[] {
  const ink = layInk(hangSo);
  const laMang = result?.input?.productType === 'mang';
  const soMau = result?.input?.numColors;
  const donGiaKeo = tinhCpKeoDungMoiGhep(ink).donGia;

  const rows: DongVatLieuNangCao[] = (uniRows ?? []).map(row => {
    const thanhPham = so(row.meters);
    const phiHao = so(row.waste);
    const dauVaoNVL = thanhPham + phiHao;
    // Ghép nhiều vật liệu song song → khổ hiệu dụng = Σ khổ chi tiết
    const khoHieuDung = row.materialDetails?.length
      ? row.materialDetails.reduce((s, d) => s + so(d.width), 0)
      : so(row.width);

    let cpMucKeo: number | null = null;
    let ghiChu: string | undefined;
    if (row.rowKey === 'print') {
      const r = tinhCpMucDungMoiIn(soMau, row.mat, ink);
      cpMucKeo = r.donGia;
      ghiChu = `(${r.dmMucG}g × ${r.giaMuc.toLocaleString('vi-VN')} + ${r.dmDungMoiG}g × ${r.giaDungMoi.toLocaleString('vi-VN')}) ÷ 1000 — bảng ${r.nhomMuc.toUpperCase()}`;
    } else if (row.rowKey.startsWith('lam-')) {
      cpMucKeo = donGiaKeo;
      const k = tinhCpKeoDungMoiGhep(ink);
      ghiChu = `(${k.keoKhoG}g × ${k.giaKeo.toLocaleString('vi-VN')} + ${k.dungMoiPhaKeoG}g × ${k.giaDungMoi.toLocaleString('vi-VN')}) ÷ 1000 — keo + DM EA`;
    }

    const vatLieu = row.materialDetails?.length
      ? row.materialDetails.map(d => d.name).filter(Boolean).join(' + ')
      : row.mat;

    const giaNVL = traGiaNVL(row, materials);

    return {
      congDoan: nhanCongDoan(row),
      vatLieu: vatLieu || '—',
      khoMang: khoHieuDung || null,
      thanhPham,
      phiHao,
      dauVaoNVL,
      giaNVL,
      donViGiaNVL: giaNVL != null ? 'kg' : null,
      cpVatLieu: row.matPrice,
      thanhTienNVL: row.costMat,
      cpMucKeo,
      thanhTienMucKeo: cpMucKeo != null ? cpMucKeo * dauVaoNVL * khoHieuDung : null,
      ghiChu,
    };
  });

  // Dòng `làm túi` — gộp toàn bộ phụ kiện, chỉ hiện thành tiền
  if (!laMang) {
    const khoa = so(result?.zipperTotal);
    const bangKeo = so(result?.tapeTotal);
    const quai = so(result?.handleTotal);
    const tongPhuKien = khoa + bangKeo + quai;
    if (tongPhuKien > 0) {
      const ten: string[] = [];
      if (khoa > 0) ten.push('Khóa');
      if (bangKeo > 0) ten.push('Băng keo');
      if (quai > 0) ten.push('Quai');
      rows.push({
        congDoan: 'làm túi',
        vatLieu: ten.join(' + '),
        khoMang: null,
        thanhPham: null,
        phiHao: null,
        dauVaoNVL: null,
        giaNVL: null,
        donViGiaNVL: null,
        cpVatLieu: null,
        thanhTienNVL: tongPhuKien,
        cpMucKeo: null,
        thanhTienMucKeo: null,
        ghiChu: 'Phụ kiện túi — khóa/băng keo tính ₫/m, quai tính ₫/túi',
      });
    }
  }

  return rows;
}

// ── Table 2 ─────────────────────────────────────────────────────────────────

/**
 * Lập 4 dòng cứng Table 2: in / ghép / chia / làm túi.
 * Thành tiền = thời gian (phút) × đơn giá (₫/phút) — nhân trực tiếp, không chia số máy.
 */
export function lapDongNhanCongDien(
  result: CalculateResult,
  hangSo: AppConstants,
): DongNhanCongDien[] {
  const tg = hangSo?.cpsxUpgradeThoiGian ?? DEFAULT_CPSX_UPGRADE_THOIGIAN;
  const lab = hangSo?.cpsxUpgradeLabor ?? DEFAULT_CPSX_UPGRADE_LABOR;
  const el = hangSo?.cpsxUpgradeElectric ?? DEFAULT_CPSX_UPGRADE_ELECTRIC;
  const giaKwh = el?.appliedPricePerKwh ?? null;
  const laMang = result?.input?.productType === 'mang';

  const metIn = so(result?.printMeters) + so(result?.printWaste);
  const soMau = so(result?.input?.numColors);
  const metGhep = (result?.layers?.laminations ?? []).reduce(
    (s: number, l: { meters?: number; waste?: number }) => s + so(l?.meters) + so(l?.waste),
    0,
  );
  const metChia = so(result?.cutMeters) + so(result?.cutWaste);
  const soTui = so(result?.input?.quantity);

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
      thoiGianPhut,
      cpNhanCongPerPhut,
      thanhTienNhanCong: phut * so(cpNhanCongPerPhut),
      cpDienPerPhut,
      thanhTienDien: phut * so(cpDienPerPhut),
    };
  };

  const rows: DongNhanCongDien[] = [];

  // in — máy in có setup theo số màu
  rows.push(dong(
    'in',
    metIn > 0 ? tinhThoiGianMayIn(metIn, soMau, tg.print).tongPhut : null,
    luongMoiPhut1MayTrenNgay(
      lab.print.wages, lab.print.shiftCount,
      lab.print.mealMorning, lab.print.mealEvening, lab.print.otFactor,
    ),
    el?.machines?.print,
  ));

  // ghép — gộp tất cả lớp ghép
  rows.push(dong(
    'ghép',
    metGhep > 0 ? tinhThoiGianMayChay(metGhep, tg.laminate).tongPhut : null,
    luongMoiPhut1MayTrenNgay(
      lab.laminate.wages, lab.laminate.shiftCount,
      lab.laminate.mealMorning, lab.laminate.mealEvening, lab.laminate.otFactor,
    ),
    el?.machines?.laminate,
  ));

  // chia — máy chia chạy 1 ca
  rows.push(dong(
    'chia',
    metChia > 0 ? tinhThoiGianMayChay(metChia, tg.slit).tongPhut : null,
    luongMoiPhut1May1Ca(
      lab.slit.wages, lab.slit.mealMorning, lab.slit.mealEvening, lab.slit.otFactor,
    ),
    el?.machines?.slit,
  ));

  // làm túi — đơn vị 'chiếc', dùng giá lương làm tròn
  if (!laMang) {
    rows.push(dong(
      'làm túi',
      soTui > 0 ? tinhThoiGianMayChay(soTui, tg.bag).tongPhut : null,
      luongMoiPhutTuiAp(
        lab.bag.wages, lab.bag.peoplePerShift,
        lab.bag.mealMorning, lab.bag.mealEvening,
        lab.bag.otFactor, lab.bag.roundedPerMin,
      ),
      el?.machines?.bag,
    ));
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
