// src/lib/lsxExport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Xuất Lệnh Sản Xuất ra DOCX — khớp mẫu QT.ISO-22-BM02 trong
// .claude/references/ (10 file: 2 màng + 8 kiểu túi).
//
// DOCX ground truth: LSX-References.md §10–13 + file .docx/.doc
// Template key: resolveLsxDocxTemplate(order) → mang | 8 bag keys | fallback
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductionOrder, LSXManualFields } from './types';
import {
  classifyLsxBagType,
  classifyLsxBagTypeByKey,
  bagTypeLabelHienThi,
  zipperDistanceFromOrder,
  resolveLsxHasDivide,
  resolveLsxStageLayout,
  type LsxBagTypeInfo,
  type LsxBagTypeKey,
  type LsxStageLayout,
} from './lsx-bag-classification';
import { lsxExportBaseName } from './lsx-msp';
import { formatLsxOrderQuantity } from './lsx-quantity';
import { buildLsxQuyCachLines, formatLsxFoldBottom, lsxBagSizeMm } from './lsx-quy-cach';
import { buildLsxBagFieldRows, splitLsxBagBlockWidths } from './lsx-bag-fields';
import { buildLsxLamGridRows, gomLsxLamParts, splitLsxLamBlockWidths } from './lsx-lam-rows';
import { formatLsxHeaderDate } from './lsx-header-format';
import { formatLsxDivideSummary, layPhiHaoChia, resolveLsxDivideSpec } from './lsx-divide';
import {
  ghepNangCaoSpecTheoLop,
  layKhoMangTuNguon,
  layNangCaoSpec,
  layPhiHao,
  layThanhPham,
  stageLabel,
} from './lsx-nang-cao';

// ── Helpers ───────────────────────────────────────────────────────────────────
function v(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  return String(val) + suffix;
}
function vd(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '' || val === 0) return '...';
  return String(val) + suffix;
}
function qty(n: number): string { return n > 0 ? n.toLocaleString('vi-VN') : '...'; }

// ── Template resolution (shared by DOCX export + tests) ───────────────────────
export type LsxDocxTemplateKey = 'mang' | 'mang-in' | 'mang-ghep' | LsxBagTypeKey;

export function resolveLsxDocxTemplate(order: ProductionOrder): LsxDocxTemplateKey {
  if (order.snapshot.productType === 'mang') return 'mang';
  const override = order.manual.lsxBagTypeOverride;
  if (override) {
    const info = classifyLsxBagTypeByKey(override);
    return info.key;
  }
  return classifyLsxBagType(order.snapshot.bagType || '', !!order.snapshot.hasZipper).key;
}


export function resolveLsxBagTypeInfo(order: ProductionOrder): LsxBagTypeInfo {
  if (order.snapshot.productType === 'mang') {
    return classifyLsxBagTypeByKey('fallback');
  }
  const override = order.manual.lsxBagTypeOverride;
  if (override) return classifyLsxBagTypeByKey(override);
  return classifyLsxBagType(order.snapshot.bagType || '', !!order.snapshot.hasZipper);
}

/** Strict hasDivide: snapshot + manual.divideWidth */
export function orderHasDivide(order: ProductionOrder): boolean {
  return resolveLsxHasDivide(
    {
      hasDivide: order.snapshot.hasDivide,
      divideWidthMm: order.snapshot.divideWidthMm,
    },
    order.manual.divideWidth,
  );
}

export function orderStageLayout(order: ProductionOrder): LsxStageLayout {
  const hasLam = resolveLsxLaminateRows(order).length > 0;
  return resolveLsxStageLayout({
    productType: order.snapshot.productType,
    hasDivide: orderHasDivide(order),
    hasLaminate: hasLam,
  });
}

/** Dòng màng ghép export (ưu tiên laminateLayers; fallback legacy 1–2 field). */
export type LsxLamExportPart = { name: string; widthMm: number };

export type LsxLamExportRow = {
  label: string;
  name: string;
  widthMm: number;
  wasteMeters: number;
  /** Dual-structure: nhiều lớp con trong 1 ô Màng ghép N */
  parts: LsxLamExportPart[];
};

/** Format 1 pass ghép: 1 part → name; multi → "A 240mm / B 240mm". */
export function formatLsxLamPassName(parts: LsxLamExportPart[], fallbackName = ''): string {
  if (parts.length === 0) return fallbackName;
  if (parts.length === 1) return parts[0].name || fallbackName;
  return parts
    .map((p) => {
      const w = p.widthMm > 0 ? ` ${p.widthMm}mm` : '';
      return `${p.name || ''}${w}`.trim();
    })
    .filter(Boolean)
    .join(' / ');
}

export function resolveLsxLaminateRows(order: ProductionOrder): LsxLamExportRow[] {
  const { snapshot: s, manual: m } = order;
  const defaultKho = Math.round((s.spreadWidth || 0) * 1000);
  // Ưu tiên laminateLayers user sửa tay trong form (manual-first, regression
  // 2026-09-05: trước đây nangCaoSpec thắng nên edit form không ăn). Form được
  // prefill từ spec lúc tạo LSX nên ban đầu hai nguồn giống nhau; sau khi user
  // sửa thì form thắng. Fallback tiếp: nangCaoSpec → legacy 1-2 field → snapshot
  // layer2-5. Spec gom đủ vật liệu trong cùng section "GHÉP (Lớp N)" /
  // "Ghép N" (multi-layer composite) — không chỉ lấy dòng đầu.
  if (m.laminateLayers && m.laminateLayers.length > 0) {
    return m.laminateLayers.map((layer, i) => {
      const parts: LsxLamExportPart[] = gomLsxLamParts(
        (layer.parts || [])
          .filter((p) => p.name || p.widthMm)
          .map((p) => ({ name: p.name || '', widthMm: p.widthMm || defaultKho })),
      );
      const name = formatLsxLamPassName(parts);
      const widthMm = parts[0]?.widthMm || defaultKho;
      return {
        label: layer.label || `Màng ghép ${i + 1}`,
        name,
        widthMm,
        wasteMeters: layer.wasteMeters || 0,
        parts: parts.length ? parts : [{ name, widthMm }],
      };
    });
  }
  const ghepGroups = ghepNangCaoSpecTheoLop(layNangCaoSpec(order));
  if (ghepGroups.length > 0) {
    return ghepGroups.map((g, i) => {
      const parts: LsxLamExportPart[] = gomLsxLamParts(
        g.rows.map((r) => {
          const khoMm = typeof r.khoMang === 'number' && r.khoMang > 0
            ? Math.round(r.khoMang * 1000)
            : defaultKho;
          return { name: r.vatLieu || '', widthMm: khoMm };
        }),
      );
      // Phi hao cấp LỚP: các dòng chi tiết trong cùng section lặp cùng giá trị
      // (lapDongVatLieuNangCao) → chỉ lấy 1 lần, KHÔNG cộng dồn (feedback
      // 2026-09-05: L1 hiện 628m vì tổng 209×3 dòng chi tiết).
      const wasteRow = g.rows.find(
        (r) => typeof r.phiHao === 'number' && r.phiHao > 0,
      );
      const waste = wasteRow && typeof wasteRow.phiHao === 'number' ? wasteRow.phiHao : 0;
      const name = parts[0]?.name || '';
      return {
        label: g.label || `Màng ghép ${i + 1}`,
        name,
        widthMm: parts[0]?.widthMm || defaultKho,
        wasteMeters: Math.round(waste),
        parts: parts.length ? parts : [{ name, widthMm: defaultKho }],
      };
    });
  }
  const rows: LsxLamExportRow[] = [];
  if (m.laminateFilm1 || s.layer2Name) {
    const name = m.laminateFilm1 || s.layer2Name || '';
    const widthMm = m.laminateFilm1Width || defaultKho;
    rows.push({
      label: 'Màng ghép 1',
      name,
      widthMm,
      wasteMeters: m.lamWaste || 0,
      parts: [{ name, widthMm }],
    });
  }
  if (m.laminateFilm2 || s.layer3Name) {
    const name = m.laminateFilm2 || s.layer3Name || '';
    rows.push({
      label: 'Màng ghép 2',
      name,
      widthMm: defaultKho,
      wasteMeters: m.lamBTP || 0,
      parts: [{ name, widthMm: defaultKho }],
    });
  }
  if (s.layer4Name) {
    rows.push({
      label: `Màng ghép ${rows.length + 1}`,
      name: s.layer4Name,
      widthMm: defaultKho,
      wasteMeters: 0,
      parts: [{ name: s.layer4Name, widthMm: defaultKho }],
    });
  }
  if (s.layer5Name) {
    rows.push({
      label: `Màng ghép ${rows.length + 1}`,
      name: s.layer5Name,
      widthMm: defaultKho,
      wasteMeters: 0,
      parts: [{ name: s.layer5Name, widthMm: defaultKho }],
    });
  }
  return rows;
}

/** "L1: 120m, L2: 100m, L3: …" — luôn đủ số lớp; 0 vẫn ghi "0m". */
export function formatLsxLamWasteText(rows: LsxLamExportRow[]): string {
  if (rows.length === 0) return '';
  // Chỉ lấy các dòng có waste > 0, hoặc nếu tất cả = 0 thì vẫn liệt kê đủ L1..Ln
  const hasAny = rows.some(r => r.wasteMeters > 0);
  if (hasAny) {
    // Gộp theo pass thực: lấy waste > 0 theo thứ tự, nếu 0 thì skip (dual-structure phụ)
    const withWaste = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.wasteMeters > 0);
    if (withWaste.length > 0) {
      return withWaste
        .map(({ r }, idx) => `L${idx + 1}: ${r.wasteMeters}m`)
        .join(', ');
    }
  }
  return rows
    .map((r, i) => `L${i + 1}: ${r.wasteMeters}m`)
    .join(', ');
}

/** m vs mm: value < 20 → meters ×1000; else already mm. */
export function toCylMm(raw: number | null | undefined): number {
  if (raw == null || raw <= 0) return 0;
  return raw < 20 ? Math.round(raw * 1000) : Math.round(raw);
}

export function resolveLsxCylMm(
  m: Pick<LSXManualFields, 'cylDiameter' | 'cylWidth'>,
  s: Pick<ProductionOrder['snapshot'], 'cylLength' | 'cylCircum'>,
): { d: number; cv: number } {
  // d = chiều dài (mm) — legacy field name cylDiameter
  // cv = chu vi (mm) — legacy field name cylWidth
  const d = m.cylDiameter > 0 ? Math.round(m.cylDiameter) : toCylMm(s.cylLength);
  const cv = m.cylWidth > 0 ? Math.round(m.cylWidth) : toCylMm(s.cylCircum);
  return { d, cv };
}

/** "Dài 750 x Chu vi 500" | "Dài 750 x Chu vi …" | "…" nếu cả 2 = 0. withMm → thêm "mm". */
export function formatLsxCylText(
  m: Pick<LSXManualFields, 'cylDiameter' | 'cylWidth'>,
  s: Pick<ProductionOrder['snapshot'], 'cylLength' | 'cylCircum'>,
  opts: { withMm?: boolean } = {},
): string {
  const { d, cv } = resolveLsxCylMm(m, s);
  if (!d && !cv) return '…';
  const unit = opts.withMm ? 'mm' : '';
  const left = d ? `Dài ${d}${unit}` : 'Dài …';
  const right = cv ? `Chu vi ${cv}${unit}` : 'Chu vi …';
  return `${left} x ${right}`;
}

/** "08 trục" | "" (rỗng nếu không có). fallbackEqColors=true trả "= số màu" — legacy, không dùng nữa. */
export function formatLsxNumCylinders(m: Pick<LSXManualFields, 'numCylinders'>, fallbackEqColors = false): string {
  if (m.numCylinders > 0) return `${String(m.numCylinders).padStart(2, '0')} trục`;
  if (fallbackEqColors) return '= số màu';
  return '';
}

function fmtMeters(n: number): string {
  return n > 0 ? Math.round(n).toLocaleString('vi-VN') : '';
}

/** "2320m" hoặc "" / "…". */
export function formatLsxPrintWasteLine(m: Pick<LSXManualFields, 'printWastePercent'>, empty = ''): string {
  if (!m.printWastePercent) return empty;
  return `${fmtMeters(m.printWastePercent)}m`;
}

/** "3300 MD" hoặc empty. */
export function formatLsxPrintProductLine(
  m: Pick<LSXManualFields, 'printProductQty' | 'printProductUnit'>,
  empty = '',
): string {
  if (!m.printProductQty) return empty;
  const unit = m.printProductUnit ? ` ${m.printProductUnit}` : 'm';
  return `${fmtMeters(m.printProductQty)}${unit}`;
}

/** "3180 MD" hoặc empty. */
export function formatLsxLamProductLine(
  m: Pick<LSXManualFields, 'lamProductQty' | 'lamProductUnit'>,
  empty = '',
): string {
  if (!m.lamProductQty) return empty;
  const unit = m.lamProductUnit ? ` ${m.lamProductUnit}` : 'm';
  return `${fmtMeters(m.lamProductQty)}${unit}`;
}

/** Cấp VT ghép — raw text hoặc empty. */
export function formatLsxLamSupplyLine(m: Pick<LSXManualFields, 'lamMaterialSupplyQty'>, empty = ''): string {
  const t = (m.lamMaterialSupplyQty || '').trim();
  return t || empty;
}

// ── Manual-first (regression 2026-09-05) ─────────────────────────────────────
// Số liệu sửa tay trong form LSX phải thắng bảng đặc tả nâng cao (nangCaoSpec
// đông lạnh lúc Lưu tính giá) — trước đây spec thắng nên edit form không ăn.

/** "5.000m" | spec | '' — ĐM phi hao IN: manual `printWastePercent` thắng spec. */
export function hienThiPhiHaoIn(order: ProductionOrder): string {
  const m = order.manual;
  if (m.printWastePercent > 0) return formatLsxPrintWasteLine(m);
  // Spec có số lẻ (vd 1.810,828) → làm tròn số nguyên (feedback 2026-09-05 ý 8)
  const ph = layPhiHao(order, 'In');
  return ph != null ? `${Math.round(ph).toLocaleString('vi-VN')}m` : '';
}

/** "10.000 MD" | spec | '' — Thành phẩm in: manual `printProductQty` thắng spec. */
export function hienThiThanhPhamIn(order: ProductionOrder): string {
  const m = order.manual;
  if (m.printProductQty > 0) return formatLsxPrintProductLine(m);
  const tp = layThanhPham(order, 'In');
  return tp != null ? `${Math.round(tp).toLocaleString('vi-VN')}m` : '';
}

/** ĐM phi hao MÁY LÀM TÚI (mét): manual `bagWasteMeters` thắng spec. */
export function hienThiPhiHaoTui(order: ProductionOrder): number {
  if (order.manual.bagWasteMeters > 0) return order.manual.bagWasteMeters;
  // Spec giữ số lẻ (313,333...) → làm tròn số nguyên cho đồng bộ kiểu hiển thị
  // các dòng phi hao khác (feedback 2026-09-05 ý 8).
  return Math.round(layPhiHao(order, 'Làm túi') ?? 0);
}

/** Ghi chú MÁY LÀM TÚI — gộp ghi chú tay + lưu ý + đơn hàng/đóng gói + YC giao hàng
 *  (feedback 2026-09-06: 2 textarea "Đơn hàng / đóng gói" và "Yêu cầu giao hàng"
 *  trước đây không được render khi xuất PDF/DOCX). Mỗi phần có dữ liệu 1 dòng. */
export function formatLsxBagNote(
  m: Pick<LSXManualFields, 'bagMachineNotes' | 'bagLuuY' | 'packagingNotes' | 'deliveryNotes'>,
): string {
  const lines: string[] = [];
  const tay = (m.bagMachineNotes || '').trim();
  const luuY = (m.bagLuuY || '').trim();
  if (tay) lines.push(tay);
  if (luuY) lines.push(luuY);
  const donHang = (m.packagingNotes || '').trim();
  if (donHang) lines.push(`Đơn hàng/đóng gói: ${donHang}`);
  const giaoHang = (m.deliveryNotes || '').trim();
  if (giaoHang) lines.push(`Yêu cầu giao hàng: ${giaoHang}`);
  return lines.join('\n');
}

/** Auto note: "ghép hết BTP in 3.300m". */
export function buildLsxLamBtpNote(printProductQty: number): string {
  if (!printProductQty) return '';
  return `ghép hết BTP in ${Math.round(printProductQty).toLocaleString('vi-VN')}m`;
}


/** 1 lớp (chỉ in) — layout IN | CHIA thay vì IN | GHÉP */
function isSingleLayerBag(s: ProductionOrder['snapshot'], m: LSXManualFields): boolean {
  if (m.laminateLayers && m.laminateLayers.length > 0) return false;
  return !s.layer2Name && !s.layer3Name && !s.layer4Name && !s.layer5Name
    && !m.laminateFilm1 && !m.laminateFilm2;
}


// ── Timeout ───────────────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number, lbl: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${lbl}`)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

// ── Load logo ─────────────────────────────────────────────────────────────────
async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const resp = await fetch('/logo-LTS-LA.jpg');
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch { return null; }
}

/** Decode data URL (PNG chữ ký) → Uint8Array cho ImageRun (null nếu lỗi). */
export function dataUrlSangBuffer(dataUrl: string): Uint8Array | null {
  try {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return null;
    const binary = atob(match[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Paragraph ảnh chữ ký người lập (nếu có) cho DOCX — tái dùng cả 2 template. */
export function chuKyParagraph(m: LSXManualFields, P: any, D?: any): any[] {
  const sig = m.preparedBySignature;
  if (!sig) return [];
  const buffer = dataUrlSangBuffer(sig);
  if (!buffer) return [];
  const alignment = D?.AlignmentType?.CENTER;
  return [new P({
    children: [new P.ImageRun({
      data: buffer,
      type: 'png',
      transformation: { width: 110, height: 110 },
    })],
    alignment,
  })];
}

/** Paragraph ảnh chữ ký người duyệt (reviewer) cho DOCX — base64 PNG đã convert.
 *  Nếu chưa có dataUrl → trả paragraph "(Chưa duyệt)". */
export function chuKyReviewerParagraph(
  dataUrl: string | null | undefined,
  P: any,
  D?: any,
): any[] {
  const alignment = D?.AlignmentType?.CENTER;
  if (!dataUrl) {
    return [new P({
      children: [new P.TextRun({ text: '(Chưa duyệt)', italics: true, font: 'Times New Roman', size: 22 })],
      alignment,
    })];
  }
  const buffer = dataUrlSangBuffer(dataUrl);
  if (!buffer) {
    return [new P({
      children: [new P.TextRun({ text: '(Lỗi ảnh chữ ký)', italics: true, font: 'Times New Roman', size: 22 })],
      alignment,
    })];
  }
  return [new P({
    children: [new P.ImageRun({
      data: buffer,
      type: 'png',
      transformation: { width: 110, height: 110 },
    })],
    alignment,
  })];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DOCX BLOB — 10 templates từ .claude/references
// ═══════════════════════════════════════════════════════════════════════════════
export async function buildLSXDocxBlob(
  order: ProductionOrder,
  reviewerSignatureDataUrl?: string | null,
): Promise<Blob> {

  const [D, logoBytes] = await Promise.all([
    withTimeout(import('docx'), 10000, 'docx').catch(() => { throw new Error('Không load được thư viện docx'); }),
    loadLogoBytes(),
  ]);

  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, BorderStyle, AlignmentType, ShadingType,
    ImageRun, HeightRule, VerticalAlign, TableLayoutType, VerticalMergeType,
  } = D;

  const { snapshot: s, manual: m } = order;
  const templateKey = resolveLsxDocxTemplate(order);
  const bagInfo = resolveLsxBagTypeInfo(order);
  const hasDivide = orderHasDivide(order);
  void orderStageLayout(order);
  const isTui = s.productType !== 'mang';
  // Ưu tiên bảng đặc tả nâng cao cho Khổ IN; fallback snapshot.spreadWidth
  const khoMM = layKhoMangTuNguon({ snapshot: s }, 'In') ?? 0;
  const phiHaoTui = hienThiPhiHaoTui(order);
  const bagSize = lsxBagSizeMm(s);
  const bagLabel = isTui
    ? bagTypeLabelHienThi(bagInfo, s.bagType || '', !!s.hasZipper, !!m.lsxBagTypeOverride)
    : '';
  const TNR = 'Times New Roman';

  // Spacing vừa phải: giữa DOCX cũ (chật) và Review HTML (thoáng hơn)
  // A4: 11907×16840 DXA; 1mm ≈ 56.7 DXA
  // Cũ: top/bottom 567 (~10mm). Review: 20/15mm. Chọn giữa ~14/12mm.
  const PAGE_MARGIN = { top: 794, bottom: 680, left: 1134, right: 851 }; // ~14/12/20/15 mm
  const CELL_MARGINS = { top: 30, bottom: 30, left: 50, right: 50 }; // nhẹ hơn CSS 3px 5px
  const PARA_LINE = { line: 276, type: 'auto' as const }; // ~1.15 × 240
  const PARA_AFTER = 20;

  const bdr = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'ffffff' };
  const mergeStartBorders = { ...bdr, bottom: noBorder };
  const mergeMiddleBorders = { top: noBorder, bottom: noBorder, left: bdr.left, right: bdr.right };
  const mergeEndBorders = { ...bdr, top: noBorder };

  const run = (text: string, o: { b?: boolean; i?: boolean; sz?: number; clr?: string } = {}) =>
    new TextRun({ text, bold: o.b, italics: o.i, font: TNR, size: o.sz ?? 22, color: o.clr });

  const para = (children: any[], align: any = AlignmentType.LEFT, spacing?: any) =>
    new Paragraph({
      alignment: align,
      spacing: spacing ?? { after: PARA_AFTER, line: PARA_LINE.line, lineRule: PARA_LINE.type },
      children,
    });
  const divideSpec = resolveLsxDivideSpec(order);
  const divideParas = () => {
    const m = order.manual;
    // Chi an khi user that su khong co du lieu (regression 2026-08-27:
    // truoc do `if (!divideSpec.valid) return []` lam mat du lieu vua nhap).
    const hasUserData =
      (m.divideWidth ?? 0) > 0
      || (m.divideElements ?? 0) > 0
      || (Array.isArray(m.divideWidths) && m.divideWidths.length > 0);
    if (!hasUserData) return [];
    const filmWidth = divideSpec.filmWidthMm ? `${divideSpec.filmWidthMm}mm` : '…';
    const khoChia = divideSpec.elementCount > 0
      ? formatLsxDivideSummary(divideSpec)
      : vd(divideSpec.defaultWidthMm, 'mm');
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        columnWidths: [5000, 5000],
        rows: [
          new TableRow({
            children: [
              cell([para([run('Khổ màng: ', { b: true }), run(filmWidth)])]),
              cell([para([run('Khổ chia: ', { b: true }), run(khoChia)])]),
            ],
          }),
        ],
      }),
      // "Chiều dài" chỉ áp dụng cho SP màng; "Chiều ra cuộn" ẩn khi không điền
      // (feedback 2026-09-05 ý 6).
      ...(order.snapshot.productType === 'mang'
        ? [para([run('Chiều dài: ', { b: true }), run(vd(m.rollLength, 'm'))])]
        : []),
      ...((m.divideRollOutWidth ?? 0) > 0
        ? [para([run('Chiều ra cuộn: ', { b: true }), run(`${m.divideRollOutWidth}mm`)])]
        : []),
      ...(m.divideDesc
        ? [para([run('Mô tả: ', { b: true }), run(m.divideDesc)])]
        : []),
      ...(m.divideNotes
        ? [para([run('Ghi chú: ', { b: true }), run(m.divideNotes)])]
        : []),
    ];
  };

  const VM_START    = VerticalMergeType.RESTART;
  const VM_CONTINUE = VerticalMergeType.CONTINUE;

  const cell = (children: any[], o: {
    bg?: string; cs?: number; w?: number;
    va?: 'top' | 'center'; vm?: string; borders?: any;
  } = {}) => new TableCell({
    columnSpan: o.cs,
    verticalMerge: o.vm as any,
    shading: o.bg ? { type: ShadingType.CLEAR, color: 'auto', fill: o.bg } : undefined,
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    verticalAlign: o.va === 'center' ? VerticalAlign.CENTER : VerticalAlign.TOP,
    margins: CELL_MARGINS,
    children: children.length ? children : [para([])],
    borders: o.borders ?? bdr,
  });

  const rowH = (h: number, ...cells: any[]) => new TableRow({
    children: cells,
    height: { value: Math.round(h * 1.05), rule: HeightRule.EXACT },
  });

  /** Hàng cao tối thiểu — dùng cho ô chứa bảng con để không bị kẹp/hở mép. */
  const rowMin = (h: number, ...cells: any[]) => new TableRow({
    children: cells,
    height: { value: Math.round(h * 1.05), rule: HeightRule.ATLEAST },
  });

  // ── Header ISO ──────────────────────────────────────────────────────
  const headerNumber = m.lsxNumber || order.id;
  const headerDate = formatLsxHeaderDate(m.issuedDate);
  const logoCell = logoBytes
    ? [para([new ImageRun({ data: logoBytes, transformation: { width: 78, height: 78 }, type: 'jpg' })], AlignmentType.CENTER)]
    : [para([run('LTS\nLONG AN', { b: true, sz: 28 })], AlignmentType.CENTER)];

  const hdrT1 = new Table({
    width: { size: 9907, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2010, 3870, 1700, 2327],
    rows: [
      rowH(580,
        cell(logoCell, { vm: VM_START, w: 2010, va: 'center', borders: mergeStartBorders }),
        cell([para([run('Công Ty CP TM và SX Bao Bì\nLai Trường Sơn- Long An', { sz: 26 })],
          AlignmentType.CENTER)], { vm: VM_START, w: 3870, va: 'center', borders: mergeStartBorders }),
        cell([para([run('Ký mã hiệu', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('QT.ISO-22-BM02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(500,
        cell([para([])], { vm: VM_CONTINUE, borders: mergeMiddleBorders }),
        cell([para([])], { vm: VM_CONTINUE, borders: mergeEndBorders }),
        cell([para([run('Lần ban hành', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(500,
        cell([para([])], { vm: VM_CONTINUE, borders: mergeMiddleBorders }),
        cell([para([run('LỆNH SẢN XUẤT', { b: true, sz: 32 })], AlignmentType.CENTER)],
          { vm: VM_START, va: 'center', borders: mergeStartBorders }),
        cell([para([run('Số:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(headerNumber, { sz: 22 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(500,
        cell([para([])], { vm: VM_CONTINUE, borders: mergeEndBorders }),
        cell([para([])], { vm: VM_CONTINUE, borders: mergeEndBorders }),
        cell([para([run('Ngày:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(headerDate, { sz: 22 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
    ],
  });

  // ── I. THÔNG TIN SẢN PHẨM ───────────────────────────────────────────
  const hdrT2 = new Table({
    width: { size: 10112, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4361, 5751],
    rows: [
      rowH(439,
        cell([para([run('I. THÔNG TIN SẢN PHẨM', { b: true, sz: 32 })], AlignmentType.CENTER)],
          { cs: 2, bg: 'c2d69b', va: 'center' }),
      ),
      rowH(398,
        cell([para([run('Khách hàng: ', { b: true }), run(s.customer || 'CÔNG TY ………..', { b: true })])],
          { cs: 2, va: 'center' }),
      ),
      rowH(702,
        cell([
          para([run('MSP:', { b: true }), run(' ' + (m.msp || 'TP_0……..'))]),
        ]),
        cell([
          para([run('Tên SP:', { b: true }), run(' ' + (m.tenSP || s.productName || ''))]),
        ]),
      ),
      rowH(967,
        cell([
          para([run('Cấu trúc:', { b: true }), run(' ' + (s.structure || ''))]),
          para([run('Khổ màng:', { b: true }), run(khoMM ? ` K${khoMM}mm` : ' ...')]),
        ]),
        cell([
          ...(isTui ? [para([run('Kiểu túi:', { b: true }), run(' ' + bagLabel)])] : []),
          ...buildLsxQuyCachLines(m, s).map((line) => {
            const idx = line.indexOf(': ');
            if (idx < 0) return para([run(line)]);
            return para([run(line.slice(0, idx + 1), { b: true }), run(' ' + line.slice(idx + 2))]);
          }),
          ...(!isTui ? [
            para([run('Quy cách cuộn:', { b: true }), run(' ' + (m.quyCachCuon || ''))]),
            para([run('Chiều ra cuộn:', { b: true }), run(' ' + (m.chieuRaCuonSP || ''))]),
          ] : []),
        ]),
      ),
      rowH(556,
        cell([para([run('Số màu:', { b: true }), run(` ${vd(s.numColors)} màu`)])], { va: 'center' }),
        cell([para([run('Số lượng:', { b: true }),
          run(' ' + formatLsxOrderQuantity(m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²'), m.quantityTolerancePercent ?? 10))])], { va: 'center' }),
      ),
    ],
  });

  // ── Body ────────────────────────────────────────────────────────────
  let bodyTable: any;

  if (!isTui) {
    // ════ MÀNG: 2 cột — LSX MÀNG IN / LSX IN MÀNG BOPP ════
    const mR: any[] = [];
    mR.push(rowH(300, cell([para([run(stageLabel(order, 'MÁY IN', 'in'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
    mR.push(rowH(280,
      cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
      cell([para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '')])]),
    ));
    const mangCylText = formatLsxCylText(m, s, { withMm: true });
    mR.push(rowH(360,
      cell([
        para([run('Quy cách trục: ', { b: true }), run(mangCylText)]),
        para([run('MST: ', { b: true }), run(v(m.printMST))]),
      ]),
      cell([
        para([run('Số trục: ', { b: true }), run(formatLsxNumCylinders(m, false))]),
        para([run('Chiều ra cuộn: ', { b: true }), run(v(m.printDirection) || v(m.rollOutWidth, 'mm'))]),
      ]),
    ));
    mR.push(rowH(1100, cell([
      para([run('Thành phẩm in yêu cầu: ', { b: true }), run(hienThiThanhPhamIn(order))]),
      para([run(`Định mức phi hao: ${hienThiPhiHaoIn(order)}`)]),
      ...(m.materialQtySupplied > 0 ? [para([run(`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`)])] : []),
      ...(m.printNotes ? [para([run('Ghi chú:', { b: true })]), para([run(m.printNotes)])] : []),
      para([run('Trục in: ', { b: true }), run(v(m.cylInfo))]),
    ], { cs: 2 })));

    if (hasDivide) {
      mR.push(rowH(300, cell([para([run(stageLabel(order, 'MÁY CHIA', 'chia'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
      mR.push(rowMin(900, cell(divideParas(), { cs: 2 })));
      mR.push(rowH(360,
        cell([
          para([run('(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)', { clr: 'ff0000', sz: 18 })]),
        ], { cs: 2 }),
      ));
      mR.push(rowH(2200, cell([
        para([run(`Định mức phi hao: ${layPhiHaoChia(order)}m`)]),
        ...(m.divideDeliveryReq ? [para([run('Khách hàng yêu cầu giao: ', { b: true }), run(v(m.divideDeliveryReq))])] : []),
        // Mô tả / Ghi chú chia đã có nhãn trong divideParas() phía trên — không lặp.
      ], { cs: 2 })));
    }
    mR.push(rowH(600,
      cell([para([run('Người lập:', { b: true })]), para([run(m.preparedBy || '')]), ...chuKyParagraph(m, D, D)], { va: 'center' }),
      cell([para([run('Người Duyệt:', { b: true })]), para([run(m.approvedBy || '')]), ...chuKyReviewerParagraph(reviewerSignatureDataUrl, D, D)], { va: 'center' }),
    ));

    bodyTable = new Table({
      width: { size: 10173, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [4928, 5245],
      rows: mR,
    });

  } else {
    // ════ TÚI: A = có chia · B = không chia ════
    const singleLayer = isSingleLayerBag(s, m);
    const showDivide = hasDivide;
    const tR: any[] = [];

    tR.push(rowH(320, cell([para([run('II. CÔNG VIỆC CẦN THỰC HIỆN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 5, bg: 'c2d69b', va: 'center' })));

    if (singleLayer && showDivide) {
      // #8 ZIPPER CẮT SEAL: MÁY IN | MÁY CHIA (không ghép)
      tR.push(rowH(280,
        cell([para([run(stageLabel(order, 'MÁY IN', 'in'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run(stageLabel(order, 'MÁY CHIA', 'chia'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));
      tR.push(rowH(280,
        cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
        cell([para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '')])]),
        cell([
          para([run('Chia BTP thành phẩm in: ', { b: true })]),
          para([run(m.divideNotes || (khoMM ? `${m.printFilmName || s.layer1Name || 'PE'} × ${khoMM} × ${vd(m.printProductQty)}m` : ''))]),
        ], { cs: 3 }),
      ));
      tR.push(rowMin(900,
        cell([
          para([run('Trục in: ', { b: true }), run(formatLsxCylText(m, s) || '')]),
          para([run('Mã Số Trục: ', { b: true }), run(v(m.printMST) || '…')]),
        ]),
        cell([
          para([run('Số trục: ', { b: true }), run(formatLsxNumCylinders(m, false))]),
          para([run('Chiều ra cuộn: ', { b: true }), run(v(m.printDirection) || '…')]),
        ]),
        cell([
          ...divideParas(),
        ], { cs: 3 }),
      ));
      tR.push(rowH(1000,
        cell([
          para([run(`Định mức phi hao: ${hienThiPhiHaoIn(order) || '…'}`)]),
          para([run(`Thành phẩm in: ${hienThiThanhPhamIn(order) || '…'}`)]),
          ...(m.materialQtySupplied > 0 ? [para([run('Số lượng cấp vật tư: ', { b: true }), run(v(m.materialQtySupplied))])] : []),
          ...(m.inDesc ? [para([run(m.inDesc)])] : []),
          ...(m.printNotes ? [para([run('Ghi chú: ', { b: true }), run(m.printNotes)])] : []),
        ], { cs: 2 }),
        cell([
          // Mô tả/Ghi chú chia đã nằm trong divideParas() bên trên — ô này chỉ
          // còn YC giao hàng để không lặp.
          ...(m.divideDeliveryReq
            ? [para([run('Ghi chú chia: ', { b: true }), run(m.divideDeliveryReq)]), para([run('')])]
            : []),
        ], { cs: 3 }),
      ));

    } else {
      const lamRows = resolveLsxLaminateRows(order);
      tR.push(rowH(280,
        cell([para([run(stageLabel(order, 'MÁY IN', 'in'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run(stageLabel(order, 'MÁY GHÉP', 'ghep'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));

      // ── Hai nửa 50/50, mỗi nửa là bảng con nên không cần ô rỗng đệm chiều cao ──
      const PRINT_HALF_WIDTH = 5069;  // cột 1+2 (2943 + 2126)
      const LAM_HALF_WIDTH = 5069;    // cột 3+4+5 (2410 + 567 + 2092)
      const printW = { name: 2943, kho: 2126 };
      const lamW = splitLsxLamBlockWidths(LAM_HALF_WIDTH);

      // Nửa MÁY IN: 2 cột liền khối, KHÔNG kẻ ngang bên trong. Nửa GHÉP có số
      // hàng khác nên nếu cả hai bên đều kẻ ngang thì các vạch không gặp nhau
      // ở vạch chia giữa → nhìn như đường kẻ bị đứt đoạn.
      const printHalfTable = new Table({
        width: { size: PRINT_HALF_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [printW.name, printW.kho],
        rows: [
          rowMin(640,
            cell([
              para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')]),
              para([run('Trục in: ', { b: true }), run(formatLsxCylText(m, s) || '')]),
              para([run('Mã Số Trục: ', { b: true }), run(v(m.printMST) || '…')]),
            ], { w: printW.name }),
            cell([
              para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '…')]),
              para([run('Số trục: ', { b: true }), run(formatLsxNumCylinders(m))]),
              para([run('Chiều ra cuộn: ', { b: true }), run(v(m.printDirection) || '…')]),
            ], { w: printW.kho }),
          ),
        ],
      });

      // Dòng đơn = 2 ô (label+tên gộp | khổ); dual = label gộp dọc + mỗi vật liệu 1 hàng
      const lamHalfRows: any[] = [];
      for (const row of buildLsxLamGridRows(lamRows, khoMM)) {
        if (row.kind === 'dual') {
          row.parts.forEach((p, pi) => {
            const isFirst = pi === 0;
            const isLast = pi === row.parts.length - 1;
            lamHalfRows.push(rowMin(280,
              cell(
                isFirst ? [para([run(row.label, { b: true })])] : [],
                {
                  w: lamW.label,
                  vm: isFirst ? VM_START : VM_CONTINUE,
                  va: 'center',
                  borders: isFirst
                    ? mergeStartBorders
                    : isLast ? mergeEndBorders : mergeMiddleBorders,
                },
              ),
              cell([para([run(p.name)])], { w: lamW.name }),
              cell([para([run('Khổ ', { b: true }), run(p.khoText)])], { w: lamW.kho }),
            ));
          });
        } else {
          // colspan 2 gộp cột label+tên; khổ giữ đúng cột 3 để thẳng hàng với dòng dual
          lamHalfRows.push(rowMin(280,
            cell([para([run(`${row.label}: `, { b: true }), run(row.name)])], { cs: 2 }),
            cell([para([run('Khổ ', { b: true }), run(row.khoText)])], { w: lamW.kho }),
          ));
        }
      }
      if (lamHalfRows.length === 0) {
        lamHalfRows.push(rowMin(280, cell([para([])], { cs: 3 })));
      }

      const lamHalfTable = new Table({
        width: { size: LAM_HALF_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [lamW.label, lamW.name, lamW.kho],
        rows: lamHalfRows,
      });

      tR.push(new TableRow({
        children: [
          cell([printHalfTable], { cs: 2, va: 'top' }),
          cell([lamHalfTable], { cs: 3, va: 'top' }),
        ],
        height: { value: Math.round(640 * 1.05), rule: HeightRule.ATLEAST },
      }));

      const wasteText = formatLsxLamWasteText(lamRows);
      tR.push(rowH(1100,
        cell([
          para([run(`Định mức phi hao: ${hienThiPhiHaoIn(order) || '…'}`)]),
          para([run(`Thành phẩm yêu cầu: ${hienThiThanhPhamIn(order) || '…'}`)]),
          ...(m.materialQtySupplied > 0 ? [para([run('Số lượng cấp vật tư: ', { b: true }), run(v(m.materialQtySupplied))])] : []),
          ...(m.inDesc ? [para([run(m.inDesc)])] : []),
          ...(m.printNotes ? [para([run('Ghi chú: ', { b: true }), run(m.printNotes)])] : []),
          ...(m.cylInfo ? [para([run('Trục in: ', { b: true }), run(m.cylInfo)])] : []),
        ], { cs: 2 }),
        cell([
          para([run(`Định mức phi hao: ${wasteText || '…'}`)]),
          para([run(`Thành phẩm yêu cầu: ${formatLsxLamProductLine(m, '…')}`)]),
          ...(m.lamBTPNote ? [para([run(m.lamBTPNote)])] : []),
          ...(m.lamDesc ? [para([run(m.lamDesc)])] : []),
          // SL cấp vật tư ghép: chỉ hiện khi có dữ liệu (điền tay — ý 8)
          ...(formatLsxLamSupplyLine(m, '')
            ? [para([run('Số lượng cấp vật tư: ', { b: true }), run(formatLsxLamSupplyLine(m, ''))])]
            : []),
          ...(m.laminateNotes ? [para([run('Ghi chú: ', { b: true }), run(m.laminateNotes)])] : []),
        ], { cs: 3 }),
      ));

    }


    // Header hàng: CHIA|TÚI (A) hoặc chỉ TÚI full (B / 1-lớp đã có CHIA ở trên)
    if (showDivide && !singleLayer) {
      tR.push(rowH(260,
        cell([para([run(stageLabel(order, 'MÁY CHIA', 'chia'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run(stageLabel(order, 'MÁY LÀM TÚI', 'lam-tui'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));
    } else {
      tR.push(rowH(260,
        cell([para([run(stageLabel(order, 'MÁY LÀM TÚI', 'lam-tui'), { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 5, bg: 'fabf8f', va: 'center' }),
      ));
    }

    const useLeftDivideCol = showDivide && !singleLayer;
    const rcs = (n: number) => (useLeftDivideCol ? n : n === 3 ? 5 : n === 2 ? 3 : n === 1 ? 2 : n);
    const leftDivideParas = useLeftDivideCol
      ? [
          ...divideParas(),
          para([run(`Định mức phi hao chia: ${layPhiHaoChia(order)}m`)]),
          // Mô tả / Ghi chú chia đã có nhãn trong divideParas() phía trên — không lặp.
        ]
      : [];

    // min = true → hàng cao tối thiểu (ô chứa bảng con phải tự giãn)
    const bagFieldRows: Array<{ h: number; cells: any[]; min?: boolean }> = [];

    // ── MÁY LÀM TÚI: bảng con 3 cột — ghi chú | 2 ô lưới đều nhau ──
    // Bề rộng chia từ splitLsxBagBlockWidths để kẻ dọc trùng trục giữa trang.
    const bagBlockWidth = useLeftDivideCol ? 5069 : 10138;
    const bagW = splitLsxBagBlockWidths(bagBlockWidth);
    const noteCell = (vm: string) =>
      cell(
        vm === VM_START
          ? [
              para([run('Ghi chú:', { b: true })]),
              ...formatLsxBagNote(m)
                .split('\n')
                .map((line) => para([run(line, { b: true })])),
            ]
          : [],
        { w: bagW.note, vm, va: 'top' },
      );

    const bagGridRows: any[] = [];
    bagGridRows.push(rowMin(340,
      noteCell(VM_START),
      cell([para([run('Kiểu túi: ', { b: true }), run(bagLabel)], AlignmentType.CENTER)], { cs: 2 }),
    ));
    bagGridRows.push(rowMin(300,
      noteCell(VM_CONTINUE),
      cell([para([run('Chiều rộng: ', { b: true }), run(bagSize.widthMm ? `${bagSize.widthMm}mm` : '…')])], { w: bagW.cellLeft }),
      cell([para([run('Chiều dài: ', { b: true }), run(bagSize.lengthMm ? `${bagSize.lengthMm}mm` : '…')])], { w: bagW.cellRight }),
    ));
    for (const row of buildLsxBagFieldRows(templateKey, m, !!s.hasZipper, s.zipperDistanceMm)) {
      if (row.kind === 'pair') {
        bagGridRows.push(rowMin(300,
          noteCell(VM_CONTINUE),
          cell([para([run(row.left.label, { b: true }), run(row.left.value)])], { w: bagW.cellLeft }),
          cell([para([run(row.right.label, { b: true }), run(row.right.value)])], { w: bagW.cellRight }),
        ));
      } else {
        bagGridRows.push(rowMin(300,
          noteCell(VM_CONTINUE),
          cell([para([run(row.field.label, { b: true }), run(row.field.value)])], { cs: 2 }),
        ));
      }
    }
    bagGridRows.push(rowMin(560,
      noteCell(VM_CONTINUE),
      cell([
        para([run(`Định mức phi hao: ${phiHaoTui > 0 ? `${phiHaoTui.toLocaleString('vi-VN')}m` : '…'}`, { b: true })]),
      ], { cs: 2 }),
    ));

    const bagBlockTable = new Table({
      width: { size: bagBlockWidth, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [bagW.note, bagW.cellLeft, bagW.cellRight],
      rows: bagGridRows,
    });

    bagFieldRows.push({
      h: 1500,
      min: true,
      cells: useLeftDivideCol
        ? [cell(leftDivideParas, { cs: 2, va: 'top' }), cell([bagBlockTable], { cs: 3, va: 'top' })]
        : [cell([bagBlockTable], { cs: 5, va: 'top' })],
    });

    if (false) {
      bagFieldRows.push({
        h: 340,
        cells: [
          cell(leftDivideParas, { cs: 2, vm: VM_START, va: 'top' }),
          cell([para([run('Kiểu túi: ', { b: true }), run(bagLabel)], AlignmentType.CENTER)], { cs: 3 }),
        ],
      });
      bagFieldRows.push({
        h: 260,
        cells: [
          cell([para([])], { cs: 2, vm: VM_CONTINUE }),
          cell([para([run('Chiều rộng: ', { b: true }), run(bagSize.widthMm ? `${bagSize.widthMm}mm` : '…')])]),
          cell([para([run('Chiều dài: ', { b: true }), run(bagSize.lengthMm ? `${bagSize.lengthMm}mm` : '…')])], { cs: 2 }),
        ],
      });
    } else {
      bagFieldRows.push({
        h: 340,
        cells: [
          cell([para([run('Kiểu túi: ', { b: true }), run(bagLabel)], AlignmentType.CENTER)], { cs: 5 }),
        ],
      });
      bagFieldRows.push({
        h: 260,
        cells: [
          cell([para([run('Chiều rộng: ', { b: true }), run(bagSize.widthMm ? `${bagSize.widthMm}mm` : '…')])], { cs: 2 }),
          cell([para([run('Chiều dài: ', { b: true }), run(bagSize.lengthMm ? `${bagSize.lengthMm}mm` : '…')])], { cs: 3 }),
        ],
      });
    }

    const pushContinue = (rightCells: any[], h = 260) => {
      if (useLeftDivideCol) {
        bagFieldRows.push({
          h,
          cells: [cell([para([])], { cs: 2, vm: VM_CONTINUE }), ...rightCells],
        });
      } else {
        bagFieldRows.push({ h, cells: rightCells });
      }
    };

    const tamZipper = zipperDistanceFromOrder(
      { manual: m, snapshot: s },
      !!s.hasZipper,
      templateKey,
    );

    const tamZipperStr = tamZipper > 0 ? `${tamZipper}mm` : '—';
    const tearNotchText = v(m.tearNotch);
    const hasTearNotch = !!tearNotchText;
    const showZipperCell = tamZipper > 0 || !!s.hasZipper;
    const showTearNotchCell = hasTearNotch;

    switch (templateKey) {
      case 'tui-3-bien':
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.sealEdge) || v(m.hanBien, 'mm') || '7mm')])], { cs: rcs(1) }),
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '30mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([para([run('Đục lỗ: ', { b: true }), run(v(m.holePunchInfo) || '…')])], { cs: rcs(3) }),
        ]);
        if (showZipperCell && showTearNotchCell) {
          pushContinue([
            cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(1) }),
            cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(2) }),
          ]);
        } else if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        } else if (showTearNotchCell) {
          pushContinue([cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(3) })]);
        }
        if (m.useDualCutter || m.useSemicircularMold) {
          pushContinue([
            cell([
              ...(m.useDualCutter ? [para([run('Sử dụng dao cắt 2 nhịp để cắt', { b: true })])] : []),
              ...(m.useSemicircularMold ? [para([run('Sử dụng khuôn đáy đứng bán nguyệt', { b: true })])] : []),
            ], { cs: rcs(3) }),
          ], 340);
        }
        break;

      case 'tui-4-bien':
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.hanBien, 'mm') || '10mm')])], { cs: rcs(1) }),
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '50mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([para([run('Xếp hông: ', { b: true }), run(v(m.xepHong, 'mm') || '…')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([para([run(v(m.holePunchInfo) || 'Đục 3 lỗ tròn quai xách (Theo Market)')])], { cs: rcs(3) }),
        ]);
        if (m.ventHoleInfo) {
          pushContinue([
            cell([para([run('Đục lỗ thông hơi: ', { b: true }), run(m.ventHoleInfo)])], { cs: rcs(3) }),
          ]);
        }
        if (showZipperCell && showTearNotchCell) {
          pushContinue([
            cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(1) }),
            cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(2) }),
          ]);
        } else if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        } else if (showTearNotchCell) {
          pushContinue([cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(3) })]);
        }
        break;

      case 'tui-dan-lung-giua':
        pushContinue([
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '13mm')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([
            para([run('Dán lưng: ', { b: true }), run(v(m.danLung, 'mm') || '13mm')]),
            para([run(v(m.ventHoleInfo) ? `Đục lỗ thông hơi: ${m.ventHoleInfo}` : '')]),
          ], { cs: rcs(3) }),
        ], 340);
        if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        }
        break;

      case 'tui-xep-hong-lung-lech':
        pushContinue([
          cell([para([run('Xếp hông: ', { b: true }), run(v(m.xepHong, 'mm') || '…')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([para([run('Dán lưng lệch: ', { b: true }), run(v(m.danLungLech, 'mm') || '10mm')])], { cs: rcs(1) }),
          cell([para([run('Dán đáy: ', { b: true }), run(v(m.danDay, 'mm') || '10mm')])], { cs: rcs(2) }),
        ]);
        if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        }
        break;

      case 'tui-day-dung':
        if (showZipperCell && showTearNotchCell) {
          pushContinue([
            cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(1) }),
            cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(2) }),
          ]);
        } else if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        } else if (showTearNotchCell) {
          pushContinue([cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(3) })]);
        }
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.sealEdge) || v(m.hanBien, 'mm') || '10mm')])], { cs: rcs(1) }),
          cell([para([run('Xếp đáy: ', { b: true }), run(formatLsxFoldBottom(m.foldBottom) || '100mm')])], { cs: rcs(2) }),
        ]);
        break;

      case 'tui-cut-seal':
        if (showZipperCell) {
          pushContinue([
            cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) }),
          ]);
        }
        if (m.loTreoInfo) {
          pushContinue([
            cell([para([run('Đục treo lỗ tròn: ', { b: true }), run(m.loTreoInfo)])], { cs: rcs(3) }),
          ]);
        }
        break;

      case 'tui-cut-seal-nap-keo':
        pushContinue([
          cell([para([run('Nắp: ', { b: true }), run(v(m.nap, 'mm') || '35mm')])], { cs: rcs(1) }),
          cell([para([run('Từ đầu đến sóng siêu âm: ', { b: true }), run(v(m.songSieuAm, 'mm') || '32mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([
            para([run(m.docQuaiXach ? 'Dọc quai xách: có (cây dọc riêng của khách)' : 'Dọc quai xách: …')]),
            para([run(m.danKeoNap ? 'Dán keo ở mé dưới trong nắp: có' : '')]),
          ], { cs: rcs(3) }),
        ], 340);
        if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        }
        break;

      default:
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.hanBien, 'mm') || v(m.sealEdge) || '…')])], { cs: rcs(1) }),
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '…')])], { cs: rcs(2) }),
        ]);
        if (m.xepHong) pushContinue([cell([para([run('Xếp hông: ', { b: true }), run(v(m.xepHong, 'mm'))])], { cs: rcs(3) })]);
        if (m.foldBottom) pushContinue([cell([para([run('Xếp đáy: ', { b: true }), run(formatLsxFoldBottom(m.foldBottom))])], { cs: rcs(3) })]);
        if (showZipperCell) {
          pushContinue([cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(tamZipperStr)])], { cs: rcs(3) })]);
        }
        if (showTearNotchCell) pushContinue([cell([para([run('Nhấn xé "v": ', { b: true }), run(tearNotchText)])], { cs: rcs(3) })]);
        if (m.holePunchInfo) pushContinue([cell([para([run(m.holePunchInfo)])], { cs: rcs(3) })]);
        if (m.useDualCutter || m.useSemicircularMold) {
          pushContinue([
            cell([
              ...(m.useDualCutter ? [para([run('Sử dụng dao cắt 2 nhịp để cắt', { b: true })])] : []),
              ...(m.useSemicircularMold ? [para([run('Sử dụng khuôn đáy đứng bán nguyệt', { b: true })])] : []),
            ], { cs: rcs(3) }),
          ], 340);
        }
        break;
    }

    if (false) {
      bagFieldRows.push({
        h: 360,
        cells: [
          cell([
            para([run(`Định mức phi hao: ${vd(m.bagWasteMeters, 'm')}`, { b: true })]),
            para([run('Ghi chú: ', { b: true }), run(m.bagLuuY || m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')]),
          ], { cs: 5 }),
        ],
      });
    }

    bagFieldRows.push({
      h: 600,
      cells: [
        cell([para([run('Người lập:', { b: true })]), para([run(m.preparedBy || '')]), ...chuKyParagraph(m, D, D)], { cs: 2, va: 'center' }),
        cell([para([run('Người duyệt:', { b: true })]), para([run(m.approvedBy || '')]), ...chuKyReviewerParagraph(reviewerSignatureDataUrl, D, D)], { cs: 3, va: 'center' }),
      ],
    });

    for (const r of bagFieldRows) {
      tR.push(r.min ? rowMin(r.h, ...r.cells) : rowH(r.h, ...r.cells));
    }

    bodyTable = new Table({
      width: { size: 10138, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2943, 2126, 2410, 567, 2092],
      rows: tR,
    });
  }

  const zeroSp = { before: 0, after: 40, line: PARA_LINE.line, lineRule: PARA_LINE.type };
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11907, height: 16840, orientation: 'portrait' as any },
          margin: PAGE_MARGIN,
        },
      },
      children: [
        hdrT1,
        para([], AlignmentType.LEFT, zeroSp),
        hdrT2,
        para([], AlignmentType.LEFT, zeroSp),
        bodyTable,
      ],
    }],
  });

  return Packer.toBlob(doc);
}

// ── Export DOCX ───────────────────────────────────────────────────────────────
export async function exportLSXtoDOCX(
  order: ProductionOrder,
  reviewerSignatureDataUrl?: string | null,
): Promise<void> {
  console.log('[LSX] DOCX start:', order.id, 'template=', resolveLsxDocxTemplate(order));
  const blob = await buildLSXDocxBlob(order, reviewerSignatureDataUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lsxExportBaseName(order)}.docx`;
  document.body.appendChild(a); a.click();
  await new Promise(r => setTimeout(r, 500));
  document.body.removeChild(a); URL.revokeObjectURL(url);
  console.log('[LSX] DOCX done:', a.download);
}
