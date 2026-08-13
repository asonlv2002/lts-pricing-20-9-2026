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
  SolventAdhesiveRow,
  SolventAdhesiveTable,
} from './types';
import type { UniRow } from './manager-calculation';
import {
  chonRuleMayChia,
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
  tinhThoiGianMayChia,
  tinhThoiGianMayGhep,
  tinhThoiGianMayIn,
  tinhThoiGianMayTui,
} from './cpsx-upgrade-thoigian';
import {
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

/** Nhãn công đoạn thân thiện cho Table 1 — dùng đúng chuẩn engine (không transform) */
function nhanCongDoan(row: UniRow): string {
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
 * Lập các dòng Table 1 từ uniRows + phụ kiện túi.
 * Ghép tách theo lớp (như bảng cũ). Dòng ghép có nhiều vật liệu song song
 * (`materialDetails`) → tách 1 dòng/chi tiết; meters/phi hao lặp lại cấp lớp.
 * Dòng `làm túi` gộp toàn bộ phụ kiện.
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

    // Ghép nhiều vật liệu song song → tách 1 dòng/chi tiết (như bảng cũ);
    // công đoạn chỉ hiện ở dòng đầu, dòng sau để trống (như ô gộp)
    if (row.materialDetails?.length) {
      return row.materialDetails.map((detail, idx) => {
        const giaNVL = traGiaNVLTheoIdTen(
          detail.materialId,
          detail.name,
          row.matPriceIsPerM2,
          materials,
        );
        const kho = so(detail.width);
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
          thanhTienNVL: so(detail.costMat),
          cpMucKeo,
          thanhTienMucKeo: cpMucKeo != null ? cpMucKeo * dauVaoNVL * kho : null,
          ghiChu,
        };
      });
    }

    const khoHieuDung = so(row.width);
    const giaNVL = traGiaNVL(row, materials);

    return [{
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
      thanhTienNVL: row.costMat,
      cpMucKeo,
      thanhTienMucKeo: cpMucKeo != null ? cpMucKeo * dauVaoNVL * khoHieuDung : null,
      ghiChu,
    }];
  });

  // Dòng `làm túi` — gộp toàn bộ phụ kiện, chỉ hiện thành tiền
  if (!laMang) {
    const khoa = so(result?.zipperTotal);
    const bangKeo = so(result?.tapeTotal);
    const quai = so(result?.handleTotal);
    const tongPhuKien = khoa + bangKeo + quai;
    if (tongPhuKien > 0) {
      const ten: string[] = [];
      if (khoa > 0) ten.push('Zipper');
      if (bangKeo > 0) ten.push('Băng keo');
      if (quai > 0) ten.push('Quai');
      rows.push({
        congDoan: 'làm túi',
        vatLieu: ten.join(' + '),
        rowKey: 'cut',
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
        ghiChu: 'Phụ kiện túi — Zipper/băng keo tính ₫/m, quai tính ₫/túi',
      });
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
  const soTui = so(result?.input?.quantity);
  const phuMo = result?.input?.hasMo === true;
  const coChia = result?.input?.hasDivide === true;
  const cauTrucMang = String(result?.structureText ?? '');
  const cutStepM = so(result?.input?.cutStep);
  const bagType = String(result?.input?.bagType ?? '');
  const hasZipper = !!result?.input?.hasZipper;

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
      rowKey: congDoan === 'in' ? 'print' : congDoan === 'chia' ? 'chia' : congDoan === 'làm túi' ? 'cut' : 'lam-2',
      thoiGianPhut,
      cpNhanCongPerPhut,
      thanhTienNhanCong: phut * so(cpNhanCongPerPhut),
      cpDienPerPhut,
      thanhTienDien: phut * so(cpDienPerPhut),
    };
  };

  const rows: DongNhanCongDien[] = [];

  // in — setup theo số màu (lên trục + duyệt mẫu) + phủ mờ
  rows.push(apDungGhiDeThoiGian(dong(
    'in',
    metIn > 0 ? tinhThoiGianMayIn(metIn, soMau, tg.print, phuMo).tongPhut : null,
    luongMoiPhutTinh(
      lab.print.wages, lab.print.hoursPerDay,
      lab.print.mealMorning, lab.print.mealEvening, lab.print.otFactor,
      undefined, lab.print.tyLeTangCa, lab.print.otHours,
    ),
    el?.machines?.print,
  ), ['print'], overrides));

  // chia — chỉ hiện khi tick "Có chia"; mét = mét dòng in; rule theo cấu trúc màng
  if (coChia && metIn > 0) {
    const ruleChia = chonRuleMayChia(tg.slit, cauTrucMang, soLanGhep);
    rows.push(apDungGhiDeThoiGian(dong(
      'chia',
      tinhThoiGianMayChia(metIn, ruleChia).tongPhut,
      luongMoiPhutTinh(
        lab.slit.wages, lab.slit.hoursPerDay,
        lab.slit.mealMorning, lab.slit.mealEvening, lab.slit.otFactor,
        undefined, lab.slit.tyLeTangCa, lab.slit.otHours,
      ),
      el?.machines?.slit,
    ), ['chia'], overrides));
  }

  // ghép — setup lần đầu + mỗi lớp ghép tiếp theo setup lại; ghi đè ưu tiên lam-2 → lam-5
  rows.push(apDungGhiDeThoiGian(dong(
    'ghép',
    metGhep > 0 ? tinhThoiGianMayGhep(metGhep, soLanGhep, tg.laminate).tongPhut : null,
    luongMoiPhutTinh(
      lab.laminate.wages, lab.laminate.hoursPerDay,
      lab.laminate.mealMorning, lab.laminate.mealEvening, lab.laminate.otFactor,
      undefined, lab.laminate.tyLeTangCa, lab.laminate.otHours,
    ),
    el?.machines?.laminate,
  ), ['lam-2', 'lam-3', 'lam-4', 'lam-5'], overrides));

  // làm túi — setup theo loại túi + tốc độ theo bước cắt
  if (!laMang) {
    const setupTui = chonSetupMayTui(tg.bag, bagType, hasZipper, cutStepM);
    const tocDoTui = chonTocDoMayTui(tg.bag, cutStepM);
    rows.push(apDungGhiDeThoiGian(dong(
      'làm túi',
      soTui > 0 ? tinhThoiGianMayTui(soTui, setupTui, tocDoTui).tongPhut : null,
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
