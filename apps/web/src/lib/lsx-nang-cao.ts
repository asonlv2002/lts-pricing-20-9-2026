/**
 * lsx-nang-cao.ts — Đọc snapshot bảng đặc tả kỹ thuật nâng cao cho LSX.
 *
 * Nguồn: `order.snapshot.nangCaoSpec` (DongVatLieuNangCao[] từ
 * tab "Tạo tính giá" nâng cao, đã được chốt lúc tạo LSX).
 *
 * Tại sao snapshot: khi admin sửa CPSX nâng cao sau khi tạo LSX, các giá trị
 * Khổ / TP / Phi hao hiển thị trên LSX KHÔNG bị "nhảy" — đúng với bản in đã phát
 * cho xưởng. LSX cũ (không có nangCaoSpec) fallback về snapshot/LSXManualFields cũ.
 *
 * 2 nhóm helper:
 *  - Cũ (`layKhoMangMm`, `layKhoMangText`, ...) — nhận `ProductionOrder`,
 *    KHÔNG fallback spreadWidth (trả null nếu không có spec) — giữ cho test cũ.
 *  - Mới (`layKhoMangTuNguon`, `layKhoMangTextTuNguon`) — nhận `NguonKhoMang`
 *    (form/PDF/DOCX/HTML): đã có đặc tả → chỉ đọc từ đặc tả (4 khâu: In/Ghép/
 *    Chia/Làm túi); chỉ fallback spreadWidth khi LSX cũ chưa có đặc tả.
 *  - Ghép (`ghepNangCaoSpecTheoLop`) — nhóm các dòng Ghép (Lớp N) thành
 *    multi-layer composite (nhiều vật liệu / 1 pass) cho MÁY GHÉP form/PDF/DOCX/HTML.
 */
import type {
  AppConstants,
  CalculateResult,
  LsxSourceData,
  Material,
  OutsourceStep,
  OverrideTable,
  ProductionOrder,
} from './types';
import type { UniRow } from './manager-calculation';
import { lapDongVatLieuNangCao } from './dac-ta-nang-cao';

export interface LsxNangCaoRow {
  congDoan: string;
  vatLieu: string;
  khoMang: number | null;
  khoMangLabel?: string;
  thanhPham: number | null;
  phiHao: number | null;
  dauVaoNVL: number | null;
  cpVatLieu: number | null;
  donViGiaNVL?: 'kg' | 'm' | null;
}

/** Tính LsxNangCaoRow[] từ kết quả engine (gọi bởi sync lúc Lưu/Cập nhật tính giá). */
export function buildNangCaoSpecFromPricing(
  result: CalculateResult,
  uniRows: UniRow[],
  constants: AppConstants,
  materials: Material[],
  overrides?: OverrideTable,
): LsxNangCaoRow[] {
  const rows = lapDongVatLieuNangCao(result, uniRows, constants, materials, overrides);
  return rows.map((r) => ({
    congDoan: r.congDoan,
    vatLieu: r.vatLieu,
    khoMang: r.khoMang,
    khoMangLabel: r.khoMangLabel,
    thanhPham: r.thanhPham,
    phiHao: r.phiHao,
    dauVaoNVL: r.dauVaoNVL,
    cpVatLieu: r.cpVatLieu,
    donViGiaNVL: r.donViGiaNVL,
  }));
}

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function laRow(value: unknown): value is LsxNangCaoRow {
  return laObject(value) && typeof value.congDoan === 'string';
}

/** Lấy snapshot nangCaoSpec; [] nếu không có (LSX cũ). */
export function layNangCaoSpec(order: ProductionOrder): LsxNangCaoRow[] {
  const raw = (order.snapshot as { nangCaoSpec?: unknown }).nangCaoSpec;
  if (!Array.isArray(raw)) return [];
  return raw.filter(laRow);
}

/** Lấy 1 dòng theo tên công đoạn chính xác (vd: "In", "Chia", "Làm túi"). */
export function layDongTheoCongDoan(
  order: ProductionOrder,
  congDoan: string,
): LsxNangCaoRow | undefined {
  return layNangCaoSpec(order).find((r) => r.congDoan === congDoan);
}

/** Lấy tất cả dòng có công đoạn BẮT ĐẦU bằng prefix (vd: "Ghép" → "Ghép 1", "Ghép 2"...). */
export function layDongTheoCongDoanPrefix(
  order: ProductionOrder,
  prefix: string,
): LsxNangCaoRow[] {
  return layNangCaoSpec(order).filter((r) => r.congDoan.startsWith(prefix));
}

/** mm hiển thị trên LSX; null nếu không có. */
export function layKhoMangMm(
  order: ProductionOrder,
  congDoan: string,
): number | null {
  const r = layDongTheoCongDoan(order, congDoan);
  if (!r) return null;
  if (typeof r.khoMang === 'number' && r.khoMang > 0) {
    return Math.round(r.khoMang * 1000);
  }
  return null;
}

/** Text hiển thị ưu tiên `khoMangLabel` (vd: "0,560 → 0,300" cho dòng Chia) → fallback mm. */
export function layKhoMangText(
  order: ProductionOrder,
  congDoan: string,
): string {
  const r = layDongTheoCongDoan(order, congDoan);
  if (!r) return '';
  if (r.khoMangLabel && r.khoMangLabel.trim()) return r.khoMangLabel;
  const mm = layKhoMangMm(order, congDoan);
  return mm ? `${mm}mm` : '';
}

export function layThanhPham(
  order: ProductionOrder,
  congDoan: string,
): number | null {
  const r = layDongTheoCongDoan(order, congDoan);
  if (!r || typeof r.thanhPham !== 'number' || r.thanhPham <= 0) return null;
  return r.thanhPham;
}

export function layPhiHao(
  order: ProductionOrder,
  congDoan: string,
): number | null {
  const r = layDongTheoCongDoan(order, congDoan);
  if (!r || typeof r.phiHao !== 'number' || r.phiHao <= 0) return null;
  return r.phiHao;
}

/**
 * Nhóm Ghép trong nangCaoSpec — 1 section header "Ghép N" / "GHÉP (Lớp N)"
 * gom nhiều vật liệu (multi-layer composite). Dòng sau header có `congDoan` rỗng
 * là phần tiếp theo của cùng nhóm; dòng có `congDoan` khác rỗng mở nhóm mới.
 *
 * Ví dụ:
 *   In | PET | 0.820
 *   GHÉP (Lớp 2) | MPET | 0.210     ← nhóm 1
 *                  | PET  | 0.400   ← nhóm 1
 *                  | MPET | 0.210   ← nhóm 1
 *   GHÉP (Lớp 3) | LLDPE| 0.820     ← nhóm 2
 *   Chia  | ...
 *
 * → `[{ layerIndex: 2, label: 'GHÉP (Lớp 2)', rows: [3 dòng] },
 *    { layerIndex: 3, label: 'GHÉP (Lớp 3)', rows: [1 dòng] }]`
 */
export interface NhomGhepNangCao {
  /** "GHÉP (Lớp 2)" / "Ghép 1" — section header gốc */
  label: string;
  /** Số thứ tự lớp từ chuỗi — 2, 3, ...; 0 nếu không parse được */
  layerIndex: number;
  /** Header + các dòng continuation trong cùng section */
  rows: LsxNangCaoRow[];
}

export function ghepNangCaoSpecTheoLop(
  spec: LsxNangCaoRow[],
): NhomGhepNangCao[] {
  const groups: NhomGhepNangCao[] = [];
  let current: NhomGhepNangCao | null = null;
  for (const r of spec) {
    const cd = (r.congDoan || '').trim();
    if (cd && /^ghép/i.test(cd)) {
      const m = cd.match(/(\d+)/);
      const layerIndex = m ? parseInt(m[1], 10) : 0;
      current = { label: cd, layerIndex, rows: [r] };
      groups.push(current);
    } else if (current && !cd) {
      // Continuation row (congDoan rỗng) → thuộc nhóm Ghép hiện tại.
      // Dòng có congDoan khác rỗng (In / Chia / Làm túi) bị bỏ qua vì
      // thuộc công đoạn khác — không gộp vào MÁY GHÉP.
      current.rows.push(r);
    }
  }
  return groups;
}

/**
 * Nguồn dữ liệu khổ màng — 1 helper duy nhất cho form + PDF + DOCX + HTML.
 * Hỗ trợ cả 3 dạng đầu vào đang có trong codebase:
 *  - `LsxSourceData` (form): có `nangCaoSpec` (snap từ báo giá) + `input.spreadWidth`
 *  - `ProductionOrder` (PDF/DOCX/HTML): có `snapshot.nangCaoSpec` + `snapshot.spreadWidth`
 *  - Bất kỳ object nào có 1 trong 2 field trên
 */
export interface NguonKhoMang {
  nangCaoSpec?: unknown;
  input?: { spreadWidth?: number };
  snapshot?: { nangCaoSpec?: unknown; spreadWidth?: number };
}

/**
 * mm hiển thị trên LSX từ NGUỒN BẤT KỲ (form/PDF/DOCX/HTML).
 * Ưu tiên `nangCaoSpec[congDoan].khoMang` (đã snap từ bảng đặc tả nâng cao).
 *
 * Quy ước 2026-09-08: 4 khổ (In / Ghép / Chia / Làm túi) đều lấy từ đặc tả kỹ thuật
 * đã chốt. Khi đã có `nangCaoSpec` mà dòng / giá trị `khoMang` thiếu → trả `null`
 * (renderer hiển thị "…"), KHÔNG rơi về `spreadWidth` — nếu không sẽ lệch khi
 * sale ghi đè khổ trong bảng đặc tả. Chỉ fallback `spreadWidth` khi LSX legacy
 * hoàn toàn không có `nangCaoSpec` (createdBefore(snap)).
 */
export function layKhoMangTuNguon(
  nguon: NguonKhoMang,
  congDoan: string,
): number | null {
  const rawSpec = nguon.nangCaoSpec ?? nguon.snapshot?.nangCaoSpec;
  const hasSpec = Array.isArray(rawSpec) && rawSpec.length > 0;
  if (hasSpec) {
    const row = (rawSpec as LsxNangCaoRow[]).find((r) => r.congDoan === congDoan);
    if (row && typeof row.khoMang === 'number' && row.khoMang > 0) {
      return Math.round(row.khoMang * 1000);
    }
    return null;
  }
  // Legacy: không có đặc tả → spreadWidth là giá trị chuẩn.
  const sw = nguon.input?.spreadWidth ?? nguon.snapshot?.spreadWidth;
  if (typeof sw === 'number' && sw > 0) {
    return Math.round(sw * 1000);
  }
  return null;
}

/**
 * Text hiển thị ưu tiên `khoMangLabel` (vd "0,640 → 0,400" cho dòng Chia)
 * → mm từ `layKhoMangTuNguon`. Có đặc tả mà thiếu → trả "" (renderer hiển thị "…").
 */
export function layKhoMangTextTuNguon(
  nguon: NguonKhoMang,
  congDoan: string,
): string {
  const rawSpec = nguon.nangCaoSpec ?? nguon.snapshot?.nangCaoSpec;
  const hasSpec = Array.isArray(rawSpec) && rawSpec.length > 0;
  if (hasSpec) {
    const row = (rawSpec as LsxNangCaoRow[]).find((r) => r.congDoan === congDoan);
    if (row?.khoMangLabel && row.khoMangLabel.trim()) return row.khoMangLabel;
    const mm = layKhoMangTuNguon(nguon, congDoan);
    return mm ? `${mm}mm` : '';
  }
  const sw = nguon.input?.spreadWidth ?? nguon.snapshot?.spreadWidth;
  if (typeof sw === 'number' && sw > 0) {
    return `${Math.round(sw * 1000)}mm`;
  }
  return '';
}

// ── Khâu gia công ngoài trên LSX ──────────────────────────────────────────────
// Lấy từ `input.outsource.steps` của báo giá (snap vào `snapshot.outsourceSteps`).
// Khâu nào nằm trong steps → header LSX hiển thị "(GIA CÔNG)".

export type LsxStageKey = 'in' | 'ghep' | 'chia' | 'lam-tui';

/** Map stage LSX → outsource step của báo giá. */
export function stageOutsourceKey(stage: LsxStageKey): OutsourceStep {
  switch (stage) {
    case 'in': return 'print';
    case 'ghep': return 'laminate';
    case 'chia': return 'slit';
    case 'lam-tui': return 'bag';
  }
}

/** Đọc danh sách khâu gia công từ snapshot order (undefined nếu LSX cũ). */
export function layOutsourceStepsTuOrder(order: ProductionOrder): OutsourceStep[] {
  const steps = order.snapshot.outsourceSteps;
  return Array.isArray(steps) ? steps : [];
}

/** Đọc danh sách khâu gia công từ LsxSourceData (form nhập). */
export function layOutsourceStepsTuSource(source: LsxSourceData): OutsourceStep[] {
  const steps = source.outsourceSteps;
  return Array.isArray(steps) ? steps : [];
}

/** Khâu có thuộc gia công ngoài hay không (từ snapshot order hoặc source form). */
export function laStageGiaCong(order: ProductionOrder, stage: LsxStageKey): boolean {
  return layOutsourceStepsTuOrder(order).includes(stageOutsourceKey(stage));
}

export function laStageGiaCongTuSource(source: LsxSourceData, stage: LsxStageKey): boolean {
  return layOutsourceStepsTuSource(source).includes(stageOutsourceKey(stage));
}

/** Header khâu LSX — thêm "(GIA CÔNG)" khi khâu thuê ngoài. */
export function stageLabel(order: ProductionOrder, label: string, stage: LsxStageKey): string {
  return laStageGiaCong(order, stage) ? `${label} (GIA CÔNG)` : label;
}

export function stageLabelTuSource(source: LsxSourceData, label: string, stage: LsxStageKey): string {
  return laStageGiaCongTuSource(source, stage) ? `${label} (GIA CÔNG)` : label;
}
