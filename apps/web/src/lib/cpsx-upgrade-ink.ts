import type {
  CpsxUpgradeInk,
  DinhMucGhep,
  DinhMucInRow,
  InkPriceSource,
  KeoRow,
  KeoTable,
  MucInRow,
  MucInTable,
  SolventAdhesiveRow,
  SolventAdhesiveTable,
} from './types';

/** Nhóm vật liệu lớp in cho bảng giá in (OPP / PET / PE) */
export type NhomMucIn = 'opp' | 'pet' | 'pe';

/** TB cộng: bỏ dòng donGia<=0, lấy trung bình đơn giá */
export function tinhGiaMucTbCong(rows: MucInRow[]): number {
  const ds = rows.filter((r) => Number(r.donGia) > 0);
  if (!ds.length) return 0;
  const sum = ds.reduce((s, r) => s + (Number(r.donGia) || 0), 0);
  return sum / ds.length;
}

/** TB trọng số: Σ(đơn giá × SL dùng) / Σ(SL dùng) — bỏ dòng donGia<=0 hoặc slDung<=0 */
export function tinhGiaMucTbTrongSo(rows: MucInRow[]): number {
  let weightSum = 0;
  let weighted = 0;
  for (const r of rows) {
    const d = Number(r.donGia) || 0;
    const s = Number(r.slDung) || 0;
    if (d <= 0 || s <= 0) continue;
    weightSum += s;
    weighted += d * s;
  }
  if (weightSum <= 0) return 0;
  return weighted / weightSum;
}

export function giaMucTheoNguon(
  source: InkPriceSource,
  rows: MucInRow[],
  manualPrice: number | null,
): number | null {
  if (source === 'average') return tinhGiaMucTbCong(rows);
  if (source === 'weighted') return tinhGiaMucTbTrongSo(rows);
  if (source === 'manual') {
    if (manualPrice == null || !Number.isFinite(manualPrice)) return null;
    return manualPrice;
  }
  return null;
}

/** Sau khi sửa rows: nếu source là average/weighted → tự recompute appliedPrice. */
export function dongBoGiaMucDangApSauSuaRow(state: MucInTable): MucInTable {
  if (state.appliedSource === 'average' || state.appliedSource === 'weighted') {
    return { ...state, appliedPrice: giaMucTheoNguon(state.appliedSource, state.rows, null) };
  }
  return state;
}

function chuanHoaRow(raw: Partial<MucInRow>, i: number): MucInRow {
  return {
    ma: String(raw?.ma ?? `row_${i + 1}`),
    ten: String(raw?.ten ?? ''),
    dvt: String(raw?.dvt ?? 'kg'),
    donGia: Number(raw?.donGia) > 0 ? Number(raw.donGia) : 0,
    slDung: Number(raw?.slDung) >= 0 ? Number(raw.slDung) : 0,
  };
}

export function chuanHoaMucInTable(
  raw: Partial<MucInTable> | undefined,
  fallback: MucInTable,
): MucInTable {
  const rows =
    Array.isArray(raw?.rows) && raw!.rows!.length > 0
      ? raw!.rows!.map((r, i) => chuanHoaRow(r, i))
      : fallback.rows.map((r) => ({ ...r }));

  const src = raw?.appliedSource;
  const appliedSource: InkPriceSource =
    src === 'average' || src === 'weighted' || src === 'manual'
      ? src
      : (fallback.appliedSource ?? 'average');

  let appliedPrice: number | null =
    raw?.appliedPrice == null
      ? null
      : Number.isFinite(Number(raw.appliedPrice))
        ? Number(raw.appliedPrice)
        : null;

  if (appliedSource === 'average' || appliedSource === 'weighted') {
    appliedPrice = giaMucTheoNguon(appliedSource, rows, null);
  } else if (appliedSource === 'manual' && (appliedPrice == null || !Number.isFinite(appliedPrice))) {
    appliedPrice = tinhGiaMucTbCong(rows);
  }

  return { rows, appliedSource, appliedPrice };
}

export function chuanHoaCpsxUpgradeInk(
  raw: Partial<{
    opp: MucInTable;
    pet: MucInTable;
    pe: MucInTable;
    solventAdhesive: SolventAdhesiveTable;
    dinhMucIn: DinhMucInRow[];
    dinhMucGhep: DinhMucGhep;
  }> | undefined,
  fallbackOpp: MucInTable,
  fallbackPet: MucInTable,
  fallbackPe: MucInTable,
  fallbackSolvent: SolventAdhesiveTable,
  fallbackDinhMucIn: DinhMucInRow[],
  fallbackDinhMucGhep: DinhMucGhep,
): {
  opp: MucInTable;
  pet: MucInTable;
  pe: MucInTable;
  solventAdhesive: SolventAdhesiveTable;
  dinhMucIn: DinhMucInRow[];
  dinhMucGhep: DinhMucGhep;
} {
  return {
    opp: chuanHoaMucInTable(raw?.opp, fallbackOpp),
    pet: chuanHoaMucInTable(raw?.pet, fallbackPet),
    pe: chuanHoaMucInTable(raw?.pe, fallbackPe),
    solventAdhesive: chuanHoaBangDungMoiKeo(raw?.solventAdhesive, fallbackSolvent),
    dinhMucIn: chuanHoaDinhMucIn(raw?.dinhMucIn, fallbackDinhMucIn),
    dinhMucGhep: chuanHoaDinhMucGhep(raw?.dinhMucGhep, fallbackDinhMucGhep),
  };
}

const SO_MAU_LIST: Array<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [1, 2, 3, 4, 5, 6, 7, 8];

/** Luôn đủ 8 dòng soMau 1–8; merge raw theo soMau, thiếu → fallback. */
export function chuanHoaDinhMucIn(
  raw: DinhMucInRow[] | undefined,
  fallback: DinhMucInRow[],
): DinhMucInRow[] {
  const byMau = new Map<number, DinhMucInRow>();
  if (Array.isArray(raw)) {
    for (const r of raw) {
      const m = Number(r?.soMau);
      if (m >= 1 && m <= 8) {
        byMau.set(m, {
          soMau: m as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
          dmMucG: Number(r.dmMucG) >= 0 ? Number(r.dmMucG) : 0,
          dmDungMoiG: Number(r.dmDungMoiG) >= 0 ? Number(r.dmDungMoiG) : 0,
        });
      }
    }
  }
  return SO_MAU_LIST.map((soMau) => {
    const hit = byMau.get(soMau);
    if (hit) return hit;
    const fb = fallback.find((x) => x.soMau === soMau);
    return fb
      ? { ...fb }
      : { soMau, dmMucG: soMau * 4, dmDungMoiG: 3 + soMau * 1.5 };
  });
}

export function chuanHoaDinhMucGhep(
  raw: Partial<DinhMucGhep> | undefined,
  fallback: DinhMucGhep,
): DinhMucGhep {
  return {
    keoKhoG:
      raw?.keoKhoG != null && Number.isFinite(Number(raw.keoKhoG)) && Number(raw.keoKhoG) >= 0
        ? Number(raw.keoKhoG)
        : fallback.keoKhoG,
    dungMoiPhaKeoG:
      raw?.dungMoiPhaKeoG != null &&
      Number.isFinite(Number(raw.dungMoiPhaKeoG)) &&
      Number(raw.dungMoiPhaKeoG) >= 0
        ? Number(raw.dungMoiPhaKeoG)
        : fallback.dungMoiPhaKeoG,
  };
}

function chuanHoaSolventRow(raw: Partial<SolventAdhesiveRow>, i: number): SolventAdhesiveRow {
  return {
    ma: raw?.ma ? String(raw.ma) : `row_${i + 1}`,
    ten: String(raw?.ten ?? ''),
    dvt: String(raw?.dvt ?? 'kg'),
    donGia: Number(raw?.donGia) > 0 ? Number(raw.donGia) : 0,
    ghiChu: String(raw?.ghiChu ?? ''),
  };
}

/** TB cộng giá keo — bỏ dòng donGia<=0 */
export function tinhGiaKeoTbCong(rows: SolventAdhesiveRow[]): number {
  const ds = rows.filter((r) => Number(r.donGia) > 0);
  if (!ds.length) return 0;
  return ds.reduce((s, r) => s + (Number(r.donGia) || 0), 0) / ds.length;
}

/** TB trọng số giá keo — bỏ dòng donGia<=0 hoặc slDung<=0 */
export function tinhGiaKeoTbTrongSo(rows: KeoRow[]): number {
  let weightSum = 0;
  let weighted = 0;
  for (const r of rows) {
    const d = Number(r.donGia) || 0;
    const s = Number(r.slDung) || 0;
    if (d <= 0 || s <= 0) continue;
    weightSum += s;
    weighted += d * s;
  }
  if (weightSum <= 0) return 0;
  return weighted / weightSum;
}

function giaKeoTheoNguon(
  source: KeoTable['appliedSource'],
  rows: KeoRow[],
  manualPrice: number | null,
): number | null {
  if (source === 'average') return tinhGiaKeoTbCong(rows);
  if (source === 'weighted') return tinhGiaKeoTbTrongSo(rows);
  if (source === 'manual') {
    if (manualPrice == null || !Number.isFinite(manualPrice)) return null;
    return manualPrice;
  }
  return null;
}

/** Sau khi sửa rows: source average/weighted → tự recompute appliedPrice. */
export function dongBoGiaKeoSauSuaRow(state: KeoTable): KeoTable {
  if (state.appliedSource === 'average' || state.appliedSource === 'weighted') {
    return { ...state, appliedPrice: giaKeoTheoNguon(state.appliedSource, state.rows, null) };
  }
  return state;
}

function chuanHoaKeoRow(raw: Partial<KeoRow>, i: number): KeoRow {
  return {
    ma: raw?.ma ? String(raw.ma) : `row_${i + 1}`,
    ten: String(raw?.ten ?? ''),
    dvt: String(raw?.dvt ?? 'kg'),
    donGia: Number(raw?.donGia) > 0 ? Number(raw.donGia) : 0,
    ghiChu: String(raw?.ghiChu ?? ''),
    slDung: Number(raw?.slDung) >= 0 ? Number(raw.slDung) : 1,
  };
}

/** Input thô của bảng keo — rows có thể thiếu slDung (data cũ) */
type RawKeoTable = {
  rows?: Partial<KeoRow>[];
  appliedSource?: KeoTable['appliedSource'];
  appliedPrice?: number | null;
};

export function chuanHoaKeoTable(
  raw: RawKeoTable | undefined,
  fallback: KeoTable,
): KeoTable {
  const rows =
    Array.isArray(raw?.rows) && raw!.rows!.length > 0
      ? raw!.rows!.map((r, i) => chuanHoaKeoRow(r, i))
      : fallback.rows.map((r) => ({ ...r }));

  const src = raw?.appliedSource;
  const appliedSource: KeoTable['appliedSource'] =
    src === 'average' || src === 'weighted' || src === 'manual'
      ? src
      : (fallback.appliedSource ?? 'average');

  let appliedPrice: number | null =
    raw?.appliedPrice == null
      ? null
      : Number.isFinite(Number(raw.appliedPrice))
        ? Number(raw.appliedPrice)
        : null;

  if (appliedSource === 'average' || appliedSource === 'weighted') {
    appliedPrice = giaKeoTheoNguon(appliedSource, rows, null);
  } else if (
    appliedSource === 'manual' &&
    (appliedPrice == null || !Number.isFinite(appliedPrice))
  ) {
    appliedPrice = tinhGiaKeoTbCong(rows);
  }

  return { rows, appliedSource, appliedPrice };
}

/** Shape lưu trữ cũ của solventAdhesive — 1 mảng rows phẳng (DM_* + KEO_* lẫn lộn) */
type RawSolventAdhesiveTable =
  | { dungMoi?: { rows?: Partial<SolventAdhesiveRow>[] }; keo?: RawKeoTable }
  | { rows?: Partial<SolventAdhesiveRow>[] };

function laShapeCu(
  raw: RawSolventAdhesiveTable | undefined,
): raw is { rows?: Partial<SolventAdhesiveRow>[] } {
  return !!raw && !('dungMoi' in raw) && Array.isArray((raw as { rows?: unknown }).rows);
}

/**
 * Chuẩn hoá bảng dung môi + keo ghép (shape mới: tách 2 bảng).
 * Dữ liệu cũ (rows phẳng) được migrate tự động: dòng DM_* → dungMoi, KEO_* → keo.
 */
export function chuanHoaBangDungMoiKeo(
  raw: RawSolventAdhesiveTable | undefined,
  fallback: SolventAdhesiveTable,
): SolventAdhesiveTable {
  // Shape cũ: mảng rows phẳng → tách theo tiền tố mã
  if (laShapeCu(raw)) {
    if (raw.rows!.length === 0) {
      return {
        dungMoi: { rows: fallback.dungMoi.rows.map((r) => ({ ...r })) },
        keo: chuanHoaKeoTable(undefined, fallback.keo),
      };
    }
    const rows = raw.rows!.map((r, i) => chuanHoaSolventRow(r, i));
    const dungMoi = rows.filter((r) => !String(r.ma).startsWith('KEO_'));
    const keoRows = rows.filter((r) => String(r.ma).startsWith('KEO_'));
    return {
      dungMoi: {
        rows: dungMoi.length > 0 ? dungMoi : fallback.dungMoi.rows.map((r) => ({ ...r })),
      },
      keo: chuanHoaKeoTable(
        { rows: keoRows, appliedSource: 'average', appliedPrice: null },
        fallback.keo,
      ),
    };
  }

  // Shape mới: dungMoi + keo riêng
  const dmRaw = (raw as { dungMoi?: { rows?: Partial<SolventAdhesiveRow>[] } } | undefined)?.dungMoi;
  const dungMoiRows =
    Array.isArray(dmRaw?.rows) && dmRaw!.rows!.length > 0
      ? dmRaw!.rows!.map((r, i) => chuanHoaSolventRow(r, i))
      : fallback.dungMoi.rows.map((r) => ({ ...r }));
  const keo = chuanHoaKeoTable(
    (raw as { keo?: RawKeoTable } | undefined)?.keo,
    fallback.keo,
  );
  return { dungMoi: { rows: dungMoiRows }, keo };
}

function donGiaDmTheoMa(
  bang: SolventAdhesiveTable | undefined,
  ma: string,
): number {
  const row = bang?.dungMoi?.rows?.find((r) => r.ma === ma);
  return row ? Number(row.donGia) || 0 : 0;
}

/**
 * CP mực in + dung môi in (₫/m²) cho 1 nhóm vật liệu.
 *
 * `= tỉ lệ phủ × (ĐM mực × giáMực + ĐM dung môi × giáDM) ÷ 1000`
 *
 * ĐM mực đã là tổng định mức cho n màu (1 màu = 4g, 8 màu = 32g) — KHÔNG nhân
 * lại số màu (nhất quán với `tinhCpMucDungMoiIn` trong dac-ta-nang-cao.ts).
 * Tỉ lệ phủ nhân cả mực + dung môi → phủ 50% = nửa giá phủ 100%.
 * Giá DM: PET → DM_PET; OPP/PE → DM_OPP (sheet không có DM_PE).
 */
export function tinhCpMucInMoiM2(
  soMau: number,
  nhom: NhomMucIn,
  ink: CpsxUpgradeInk,
  tyLePhuMuc = 1,
): number {
  const giaMuc = Number(ink?.[nhom]?.appliedPrice) || 0;
  const giaDm = donGiaDmTheoMa(
    ink?.solventAdhesive,
    nhom === 'pet' ? 'DM_PET' : 'DM_OPP',
  );

  const mau = Math.floor(Number(soMau));
  if (mau <= 0) return 0;
  const dm = ink?.dinhMucIn?.find((r) => r.soMau === Math.min(8, mau));
  if (!dm) return 0;

  const tyLe = Number.isFinite(tyLePhuMuc) ? Math.max(0, tyLePhuMuc) : 1;
  return (tyLe * (dm.dmMucG * giaMuc + dm.dmDungMoiG * giaDm)) / 1000;
}

/** Kết quả chi tiết CP mực in + DM in — để hiển thị công thức từng số hạng (₫/m²) */
export interface ChiTietCpMucIn {
  giaMuc: number;   // ₫/kg
  giaDm: number;    // ₫/kg
  dmMucG: number;   // g/m²
  dmDungMoiG: number; // g/m²
  cpMuc: number;    // ₫/m² — phần mực
  cpDm: number;     // ₫/m² — phần dung môi
  tong: number;     // ₫/m²
}

/**
 * Chi tiết CP mực in + dung môi in (₫/m²) theo số màu + nhóm vật liệu.
 * Tổng = `tinhCpMucInMoiM2` — cùng công thức, tránh lệch khi hiển thị.
 */
export function tinhCpMucInChiTiet(
  soMau: number,
  nhom: NhomMucIn,
  ink: CpsxUpgradeInk,
): ChiTietCpMucIn {
  const giaMuc = Number(ink?.[nhom]?.appliedPrice) || 0;
  const giaDm = donGiaDmTheoMa(
    ink?.solventAdhesive,
    nhom === 'pet' ? 'DM_PET' : 'DM_OPP',
  );

  const mau = Math.floor(Number(soMau));
  if (mau <= 0) {
    return { giaMuc, giaDm, dmMucG: 0, dmDungMoiG: 0, cpMuc: 0, cpDm: 0, tong: 0 };
  }
  const dm = ink?.dinhMucIn?.find((r) => r.soMau === Math.min(8, mau));
  if (!dm) {
    return { giaMuc, giaDm, dmMucG: 0, dmDungMoiG: 0, cpMuc: 0, cpDm: 0, tong: 0 };
  }

  const cpMuc = (dm.dmMucG * giaMuc) / 1000;
  const cpDm = (dm.dmDungMoiG * giaDm) / 1000;
  return { giaMuc, giaDm, dmMucG: dm.dmMucG, dmDungMoiG: dm.dmDungMoiG, cpMuc, cpDm, tong: cpMuc + cpDm };
}

/** 1 dòng của bảng giá in theo số màu (₫/m²) — 6 cột: 3 vật liệu × 2 tỉ lệ phủ */
export interface DongGiaInTheoMau {
  soMau: DinhMucInRow['soMau'];
  opp100: number;
  pet100: number;
  pe100: number;
  opp50: number;
  pet50: number;
  pe50: number;
}

/**
 * Lập bảng giá in theo số màu 1–8 (₫/m², làm tròn nguyên) — tham chiếu tự tính
 * từ bảng giá mực ₫/kg + bảng dung môi + định mức g/m². Chỉ hiển thị, không
 * thay đổi engine đặc tả nâng cao.
 */
export function lapBangGiaInTheoMau(ink: CpsxUpgradeInk): DongGiaInTheoMau[] {
  const bang: DongGiaInTheoMau[] = [];
  for (let soMau = 1; soMau <= 8; soMau++) {
    const m = soMau as DongGiaInTheoMau['soMau'];
    bang.push({
      soMau: m,
      opp100: Math.round(tinhCpMucInMoiM2(m, 'opp', ink, 1)),
      pet100: Math.round(tinhCpMucInMoiM2(m, 'pet', ink, 1)),
      pe100: Math.round(tinhCpMucInMoiM2(m, 'pe', ink, 1)),
      opp50: Math.round(tinhCpMucInMoiM2(m, 'opp', ink, 0.5)),
      pet50: Math.round(tinhCpMucInMoiM2(m, 'pet', ink, 0.5)),
      pe50: Math.round(tinhCpMucInMoiM2(m, 'pe', ink, 0.5)),
    });
  }
  return bang;
}
