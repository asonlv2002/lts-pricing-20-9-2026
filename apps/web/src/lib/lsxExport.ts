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
  resolveLsxHasDivide,
  resolveLsxStageLayout,
  type LsxBagTypeInfo,
  type LsxBagTypeKey,
  type LsxStageLayout,
} from './lsx-bag-classification';

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
function safeFn(s: string): string { return (s || 'unknown').replace(/[<>:"/\\|?*\s]+/g, '_').slice(0, 60); }

// ── Template resolution (shared by DOCX export + tests) ───────────────────────
export type LsxDocxTemplateKey = 'mang' | LsxBagTypeKey;

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
  const hasLam = !!(order.snapshot.layer2Name || order.manual.laminateFilm1);
  return resolveLsxStageLayout({
    productType: order.snapshot.productType,
    hasDivide: orderHasDivide(order),
    hasLaminate: hasLam,
  });
}

/** 1 lớp (chỉ in) — layout IN | CHIA thay vì IN | GHÉP */
function isSingleLayerBag(s: ProductionOrder['snapshot'], m: LSXManualFields): boolean {
  return !s.layer2Name && !s.layer3Name && !m.laminateFilm1 && !m.laminateFilm2;
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
    const resp = await fetch('/logo_lts.png');
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DOCX BLOB — 10 templates từ .claude/references
// ═══════════════════════════════════════════════════════════════════════════════
export async function buildLSXDocxBlob(order: ProductionOrder): Promise<Blob> {

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
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const bagLabel = isTui
    ? (bagInfo.key === 'fallback' ? (s.bagType || 'Túi') : bagInfo.label)
    : '';
  const TNR = 'Times New Roman';

  const bdr = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const run = (text: string, o: { b?: boolean; i?: boolean; sz?: number; clr?: string } = {}) =>
    new TextRun({ text, bold: o.b, italics: o.i, font: TNR, size: o.sz ?? 22, color: o.clr });

  const para = (children: any[], align: any = AlignmentType.LEFT, spacing?: any) =>
    new Paragraph({ alignment: align, spacing, children });

  const VM_START    = VerticalMergeType.RESTART;
  const VM_CONTINUE = VerticalMergeType.CONTINUE;

  const cell = (children: any[], o: {
    bg?: string; cs?: number; w?: number;
    va?: 'top' | 'center'; vm?: string;
  } = {}) => new TableCell({
    columnSpan: o.cs,
    verticalMerge: o.vm as any,
    shading: o.bg ? { type: ShadingType.CLEAR, color: 'auto', fill: o.bg } : undefined,
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    verticalAlign: o.va === 'center' ? VerticalAlign.CENTER : VerticalAlign.TOP,
    children: children.length ? children : [para([])],
    borders: bdr,
  });

  const rowH = (h: number, ...cells: any[]) => new TableRow({
    children: cells,
    height: { value: h, rule: HeightRule.ATLEAST },
  });

  // ── Header ISO ──────────────────────────────────────────────────────
  const logoCell = logoBytes
    ? [para([new ImageRun({ data: logoBytes, transformation: { width: 100, height: 80 }, type: 'png' })], AlignmentType.CENTER)]
    : [para([run('LTS', { b: true, sz: 28 })], AlignmentType.CENTER)];

  const hdrT1 = new Table({
    width: { size: 9907, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2242, 3567, 2039, 2059],
    rows: [
      rowH(567,
        cell(logoCell, { vm: VM_START, w: 2242, va: 'center' }),
        cell([para([run('Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An', { sz: 28 })],
          AlignmentType.CENTER)], { vm: VM_START, w: 3567, va: 'center' }),
        cell([para([run('Ký mã hiệu', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('QT.ISO-22-BM02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(567,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Lần ban hành', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(567,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Ngày ban hành', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('01/03/2025', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(338,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('LỆNH SẢN XUẤT', { b: true, sz: 32 })], AlignmentType.CENTER)],
          { vm: VM_START, va: 'center' }),
        cell([para([run('Số LSX:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(m.lsxNumber || order.id, { sz: 24, clr: 'ff0000' })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      rowH(338,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Ngày xuống LSX:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(m.issuedDate || '…/…./20…', { sz: 24, clr: 'ff0000' })], AlignmentType.CENTER)], { va: 'center' }),
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
          para([run('TSP:', { b: true }), run(' ' + (isTui ? 'TÚI' : 'MÀNG'))]),
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
          para([run(isTui ? 'Kiểu túi:' : 'Quy cách:', { b: true }),
            run(' ' + (isTui ? bagLabel : (m.quyCachNote || '')))]),
          para([run('Quy cách:', { b: true }),
            run(' ' + (m.quyCachNote || (isTui && khoMM && dlMM ? `R:${khoMM}mm x D:${dlMM}mm` : '')))]),
          ...(!isTui ? [
            para([run('Quy cách cuộn:', { b: true }), run(' ' + (m.quyCachCuon || ''))]),
            para([run('Chiều ra cuộn:', { b: true }), run(' ' + (m.chieuRaCuonSP || ''))]),
          ] : []),
        ]),
      ),
      rowH(556,
        cell([para([run('Số màu:', { b: true }), run(` ${vd(s.numColors)} màu`)])], { va: 'center' }),
        cell([para([run('Số lượng đơn hàng:', { b: true }),
          run(' ' + (m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²')))])], { va: 'center' }),
      ),
    ],
  });

  // ── Body ────────────────────────────────────────────────────────────
  let bodyTable: any;

  if (!isTui) {
    // ════ MÀNG: 2 cột — LSX MÀNG IN / LSX IN MÀNG BOPP ════
    const mR: any[] = [];
    mR.push(rowH(300, cell([para([run('MÁY IN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
    mR.push(rowH(280,
      cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
      cell([para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '')])]),
    ));
    mR.push(rowH(360,
      cell([
        para([run('Quy cách trục: ', { b: true }), run(v(m.cylDiameter) ? `D:${v(m.cylDiameter)} x CV:${v(m.cylWidth)}mm` : '')]),
        para([run('MST: ', { b: true }), run(v(m.printMST))]),
      ]),
      cell([
        para([run('Số trục: ', { b: true }), run(vd(m.numCylinders))]),
        para([run('Chiều ra cuộn: ', { b: true }), run(v(m.printDirection) || v(m.rollOutWidth, 'mm'))]),
      ]),
    ));
    mR.push(rowH(1100, cell([
      para([run('Thành phẩm in yêu cầu: ', { b: true }), run(v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : 'm'))]),
      para([run(`Định mức phi hao: ${v(m.printWastePercent, 'm')}`)]),
      para([run(`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`)]),
      para([]),
      para([run('Ghi chú:', { b: true })]),
      para([run(m.printNotes || 'Sử dụng màng')]),
      para([run('Trục in: ', { b: true }), run(v(m.cylInfo))]),
    ], { cs: 2 })));
    if (hasDivide) {
      mR.push(rowH(300, cell([para([run('MÁY CHIA', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
      mR.push(rowH(280,
        cell([para([run('Khổ màng: ', { b: true }), run(khoMM ? `K${khoMM}mm` : (s.originalWidthMm ? `K${s.originalWidthMm}mm` : ''))])]),
        cell([para([run('Khổ chia: ', { b: true }), run(vd(m.divideWidth || s.divideWidthMm, 'mm'))])]),
      ));
      mR.push(rowH(360,
        cell([
          para([run('Chiều dài quấn cuộn: ', { b: true }), run(vd(m.rollLength, ' m'))]),
          para([run('(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)', { clr: 'ff0000', sz: 18 })]),
        ]),
        cell([para([run('Chiều ra cuộn: ', { b: true }), run(v(m.chieuRaCuonSP) || vd(m.divideRollOutWidth, 'mm'))])]),
      ));
      mR.push(rowH(2200, cell([
        para([run('Định mức phi hao: 0m')]),
        para([]),
        para([run('Khách hàng yêu cầu giao: ', { b: true }), run(v(m.divideDeliveryReq))]),
        para([]),
        para([run(m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn')]),
        para([run('Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.')]),
        para([run('Đánh dấu từng cặp MT-MS để khách hàng phân biệt.')]),
        para([]),
        para([run('** Lưu ý:', { b: true, sz: 26 })]),
      ], { cs: 2 })));
    }
    mR.push(rowH(600,
      cell([para([run('Người lập:', { b: true })]), para([run(m.preparedBy || '')])], { va: 'center' }),
      cell([para([run('Người Duyệt:', { b: true })]), para([run(m.approvedBy || '')])], { va: 'center' }),
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
        cell([para([run('MÁY IN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run('MÁY CHIA', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));
      tR.push(rowH(280,
        cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
        cell([para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '')])]),
        cell([
          para([run('Chia BTP thành phẩm in: ', { b: true })]),
          para([run(m.divideNotes || (khoMM ? `${m.printFilmName || s.layer1Name || 'PE'} × ${khoMM} × ${vd(m.printProductQty)}m` : ''))]),
        ], { cs: 3 }),
      ));
      tR.push(rowH(360,
        cell([
          para([run('Trục in: ', { b: true }), run(v(m.cylDiameter) ? `D${v(m.cylDiameter)} x CV${v(m.cylWidth)}` : '')]),
          para([run('Mã Số Trục: ', { b: true }), run(v(m.printMST) || '…')]),
        ]),
        cell([
          para([run('Số trục: ', { b: true }), run(vd(m.numCylinders))]),
          para([run('Chiều ra cuộn: ', { b: true }), run(v(m.printDirection) || '…')]),
        ]),
        cell([
          para([run('Thành phẩm chia: ', { b: true }), run(vd(m.divideWidth || s.divideWidthMm, 'mm'))]),
          para([run(v(m.rollLength) ? ` × ${v(m.rollLength)}m` : '')]),
        ], { cs: 3 }),
      ));
      tR.push(rowH(1000,
        cell([
          para([run(`Định mức phi hao: ${v(m.printWastePercent, 'm')}`)]),
          para([run(`Thành phẩm in: ${v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : 'm')}`)]),
          para([run('Ghi chú: ', { b: true }), run(m.printNotes || '')]),
          para([run('- Màu sắc: duyệt màu theo '), run(v(m.maMucNhu) || '…')]),
          para([run('- Chiều xả: '), run(v(m.printDirection) || '…')]),
        ], { cs: 2 }),
        cell([
          para([run('Ghi chú chia: ', { b: true })]),
          para([run(m.divideDeliveryReq || m.divideNotes || '')]),
        ], { cs: 3 }),
      ));
    } else {
      tR.push(rowH(280,
        cell([para([run('MÁY IN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run('MÁY GHÉP', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));
      tR.push(rowH(280,
        cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
        cell([para([run('Khổ: ', { b: true }), run(khoMM ? `${khoMM}mm` : '')])]),
        cell([para([run('Màng ghép 1: ', { b: true }), run(m.laminateFilm1 || s.layer2Name || '')])], { cs: 2 }),
        cell([para([run('Khổ: ', { b: true }), run(vd(m.laminateFilm1Width || khoMM, 'mm'))])]),
      ));
      tR.push(rowH(360,
        cell([
          para([run('Trục in: ', { b: true }), run(v(m.cylDiameter) ? `D${v(m.cylDiameter)} x CV${v(m.cylWidth)}` : '')]),
          para([run('Mã Số Trục: ', { b: true }), run(v(m.printMST) || '…')]),
        ]),
        cell([para([run('Số trục: ', { b: true }), run(m.numCylinders ? vd(m.numCylinders) : '= số màu')])]),
        cell([para([run('Màng ghép 2: ', { b: true }), run(m.laminateFilm2 || s.layer3Name || '')])], { cs: 2 }),
        cell([para([run('Khổ: ', { b: true }), run((m.laminateFilm2 || s.layer3Name) ? (khoMM ? `${khoMM}mm` : '…') : '')])]),
      ));
      tR.push(rowH(1000,
        cell([
          para([run(`Định mức phi hao: ${v(m.printWastePercent, 'm')}`)]),
          para([run(`Thành phẩm yêu cầu: ${v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : 'm')}`)]),
          para([run('Ghi chú: ', { b: true }), run(m.printNotes || '')]),
          para([run('- Màu sắc: duyệt màu theo '), run(v(m.maMucNhu) || '…')]),
          para([run('- Chiều xả: '), run(v(m.printDirection) || '…')]),
          ...(m.cylInfo ? [para([run('Trục in: ', { b: true }), run(m.cylInfo)])] : []),
        ], { cs: 2 }),
        cell([
          para([run(`Định mức phi hao: L1: ${v(m.lamWaste, 'm')}${m.lamBTP || s.layer3Name ? `, L2: ${v(m.lamBTP, 'm')}` : ''}`)]),
          para([run(`Thành phẩm yêu cầu: ${v(m.lamProductQty, m.lamProductUnit ? ` ${m.lamProductUnit}` : 'm')}`)]),
          ...(m.lamBTPNote ? [para([run(m.lamBTPNote)])] : []),
          para([run('Ghi chú: ', { b: true }), run(m.laminateNotes || '')]),
        ], { cs: 3 }),
      ));
    }

    // Header hàng: CHIA|TÚI (A) hoặc chỉ TÚI full (B / 1-lớp đã có CHIA ở trên)
    if (showDivide && !singleLayer) {
      tR.push(rowH(260,
        cell([para([run('MÁY CHIA', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
        cell([para([run('MÁY LÀM TÚI', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
      ));
    } else {
      tR.push(rowH(260,
        cell([para([run('MÁY LÀM TÚI', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 5, bg: 'fabf8f', va: 'center' }),
      ));
    }

    const useLeftDivideCol = showDivide && !singleLayer;
    // Colspan for bag-machine cells: layout A keeps 3-col right; B uses full 5 cols
    const rcs = (n: number) => (useLeftDivideCol ? n : n === 3 ? 5 : n === 2 ? 3 : n === 1 ? 2 : n);
    const leftDivideParas = useLeftDivideCol
      ? [
          para([run('Khổ màng: ', { b: true }), run(khoMM ? `${khoMM}mm` : (s.originalWidthMm ? `${s.originalWidthMm}mm` : '…'))]),
          para([run('Khổ chia: ', { b: true }), run(vd(m.divideWidth || s.divideWidthMm, 'mm'))]),
          ...(m.rollLength ? [para([run('Chiều dài: ', { b: true }), run(vd(m.rollLength, 'm'))])] : []),
          para([run('Định mức phi hao chia: 0m')]),
          para([run(m.divideNotes || '')]),
        ]
      : [];

    const bagFieldRows: Array<{ h: number; cells: any[] }> = [];

    if (useLeftDivideCol) {
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
          cell([para([run('Chiều rộng: ', { b: true }), run(khoMM ? `${khoMM}mm` : '…')])]),
          cell([para([run('Chiều dài: ', { b: true }), run(dlMM ? `${dlMM}mm` : '…')])], { cs: 2 }),
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
          cell([para([run('Chiều rộng: ', { b: true }), run(khoMM ? `${khoMM}mm` : '…')])], { cs: 2 }),
          cell([para([run('Chiều dài: ', { b: true }), run(dlMM ? `${dlMM}mm` : '…')])], { cs: 3 }),
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

    switch (templateKey) {
      case 'tui-3-bien':
        pushContinue([
          cell([para([run('Dán biên: ', { b: true }), run(v(m.sealEdge) || v(m.hanBien, 'mm') || '7mm')])], { cs: rcs(1) }),
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '30mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([para([run('Đục lỗ: ', { b: true }), run(v(m.holePunchInfo) || '…')])], { cs: rcs(3) }),
        ]);
        break;

      case 'tui-zipper-3-bien':
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.hanBien, 'mm') || 'mặc định 10mm')])], { cs: rcs(1) }),
          cell([para([run('Xếp đáy: ', { b: true }), run(v(m.foldBottom))])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([para([run('Nhấn xé "v": ', { b: true }), run(v(m.tearNotch))])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '…')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([
            ...(m.useDualCutter ? [para([run('Sử dụng dao cắt 2 nhịp để cắt', { b: true })])] : []),
            ...(m.useSemicircularMold ? [para([run('Sử dụng khuôn đáy đứng bán nguyệt', { b: true })])] : []),
            ...((!m.useDualCutter && !m.useSemicircularMold) ? [para([run('')])] : []),
          ], { cs: rcs(3) }),
        ], 340);
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
        pushContinue([
          cell([para([run('Đục lỗ thông hơi: ', { b: true }), run(v(m.ventHoleInfo) || '…')])], { cs: rcs(3) }),
        ]);
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
        break;

      case 'tui-xep-hong-lung-lech':
        pushContinue([
          cell([para([run('Xếp hông: ', { b: true }), run(v(m.xepHong, 'mm') || '…')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([para([run('Dán lưng lệch: ', { b: true }), run(v(m.danLungLech, 'mm') || '10mm')])], { cs: rcs(1) }),
          cell([para([run('Dán đáy: ', { b: true }), run(v(m.danDay, 'mm') || '10mm')])], { cs: rcs(2) }),
        ]);
        break;

      case 'tui-zipper-day-dung':
        pushContinue([
          cell([para([run('Tâm zipper cách miệng: ', { b: true }), run(v(m.tamZipperCachMieng, 'mm') || '30mm')])], { cs: rcs(1) }),
          cell([para([run('Nhấn xé "v": ', { b: true }), run(v(m.tearNotch) || '2 bên cách miệng 15mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([para([run('Dán biên: ', { b: true }), run(v(m.sealEdge) || '10mm')])], { cs: rcs(1) }),
          cell([para([run('Xếp đáy: ', { b: true }), run(v(m.foldBottom) || '100mm')])], { cs: rcs(2) }),
        ]);
        break;

      case 'tui-zipper-cat-seal':
        pushContinue([
          cell([para([run('Tâm zipper cách đầu: ', { b: true }), run(v(m.tamZipperCachMieng, 'mm') || '25mm')])], { cs: rcs(3) }),
        ]);
        pushContinue([
          cell([para([run('Đục treo lỗ tròn: ', { b: true }), run(v(m.loTreoInfo) || 'Ø8mm ở giữa khoảng cách miệng túi và tâm zipper')])], { cs: rcs(3) }),
        ]);
        break;

      case 'tui-cat-seal-nap-keo':
        pushContinue([
          cell([para([run('Nắp: ', { b: true }), run(v(m.nap, 'mm') || '35mm')])], { cs: rcs(1) }),
          cell([para([run('Sóng siêu âm: ', { b: true }), run(v(m.songSieuAm, 'mm') || '32mm')])], { cs: rcs(2) }),
        ]);
        pushContinue([
          cell([
            para([run(m.docQuaiXach ? 'Dọc quai xách: có (cây dọc riêng của khách)' : 'Dọc quai xách: …')]),
            para([run(m.danKeoNap ? 'Dán keo ở mé dưới trong nắp: có' : '')]),
          ], { cs: rcs(3) }),
        ], 340);
        break;

      default:
        pushContinue([
          cell([para([run('Hàn biên: ', { b: true }), run(v(m.hanBien, 'mm') || v(m.sealEdge) || '…')])], { cs: rcs(1) }),
          cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || '…')])], { cs: rcs(2) }),
        ]);
        if (m.xepHong) pushContinue([cell([para([run('Xếp hông: ', { b: true }), run(v(m.xepHong, 'mm'))])], { cs: rcs(3) })]);
        if (m.foldBottom) pushContinue([cell([para([run('Xếp đáy: ', { b: true }), run(v(m.foldBottom))])], { cs: rcs(3) })]);
        if (m.tamZipperCachMieng) pushContinue([cell([para([run('Tâm zipper: ', { b: true }), run(v(m.tamZipperCachMieng, 'mm'))])], { cs: rcs(3) })]);
        if (m.tearNotch) pushContinue([cell([para([run('Nhấn xé "v": ', { b: true }), run(m.tearNotch)])], { cs: rcs(3) })]);
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

    // Footer bag rows — left col only when layout A (chia | túi)
    if (useLeftDivideCol) {
      bagFieldRows.push({
        h: 360,
        cells: [
          cell([para([])], { cs: 2, vm: VM_CONTINUE }),
          cell([
            para([run(`Định mức phi hao: ${vd(m.bagWasteMeters, 'm')}`, { b: true })]),
            para([run('Ghi chú: ', { b: true }), run(m.bagLuuY || m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')]),
          ], { cs: 3 }),
        ],
      });
      bagFieldRows.push({
        h: 600,
        cells: [
          cell([para([])], { cs: 2, vm: VM_CONTINUE }),
          cell([
            para([run('Ghi chú: ', { b: true }), run(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất', { clr: 'cc0000' })]),
            ...(m.packagingInfo ? [para([run(`SL đóng gói: ${m.packagingInfo}`)])] : []),
            ...(m.soLuongDHNote ? [para([run('Số lượng: ', { b: true }), run(m.soLuongDHNote)])] : []),
            para([run('Yêu cầu giao hàng: ', { b: true })]),
            para([run(m.deliveryNotes || m.bagDeliveryReq || '')]),
          ], { cs: 3 }),
        ],
      });
    } else {
      bagFieldRows.push({
        h: 360,
        cells: [
          cell([
            para([run(`Định mức phi hao: ${vd(m.bagWasteMeters, 'm')}`, { b: true })]),
            para([run('Ghi chú: ', { b: true }), run(m.bagLuuY || m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')]),
          ], { cs: 5 }),
        ],
      });
      bagFieldRows.push({
        h: 600,
        cells: [
          cell([
            para([run('Ghi chú: ', { b: true }), run(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất', { clr: 'cc0000' })]),
            ...(m.packagingInfo ? [para([run(`SL đóng gói: ${m.packagingInfo}`)])] : []),
            ...(m.soLuongDHNote ? [para([run('Số lượng: ', { b: true }), run(m.soLuongDHNote)])] : []),
            para([run('Yêu cầu giao hàng: ', { b: true })]),
            para([run(m.deliveryNotes || m.bagDeliveryReq || '')]),
          ], { cs: 5 }),
        ],
      });
    }

    bagFieldRows.push({
      h: 600,
      cells: [
        cell([para([run('Người lập:', { b: true })]), para([run(m.preparedBy || '')])], { cs: 2, va: 'center' }),
        cell([para([run('Người duyệt:', { b: true })]), para([run(m.approvedBy || '')])], { cs: 3, va: 'center' }),
      ],
    });

    for (const r of bagFieldRows) {
      tR.push(rowH(r.h, ...r.cells));
    }

    bodyTable = new Table({
      width: { size: 10138, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2943, 2126, 2410, 567, 2092],
      rows: tR,
    });
  }

  const zeroSp = { before: 0, after: 0 };
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11907, height: 16840, orientation: 'portrait' as any },
          margin: { top: 567, bottom: 567, left: 1134, right: 851 },
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
export async function exportLSXtoDOCX(order: ProductionOrder): Promise<void> {
  console.log('[LSX] DOCX start:', order.id, 'template=', resolveLsxDocxTemplate(order));
  const blob = await buildLSXDocxBlob(order);
  const { snapshot: s, manual: m } = order;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LSX_${safeFn(m.lsxNumber || order.id)}_${safeFn(s.customer)}.docx`;
  document.body.appendChild(a); a.click();
  await new Promise(r => setTimeout(r, 500));
  document.body.removeChild(a); URL.revokeObjectURL(url);
  console.log('[LSX] DOCX done:', a.download);
}
