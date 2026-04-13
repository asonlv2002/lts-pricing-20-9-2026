// src/lib/lsxExport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Xuất Lệnh Sản Xuất ra DOCX + PDF — copy 1:1 từ mẫu gốc QT.ISO-22-BM02.
//
// Layout mẫu gốc (từ phân tích XML chi tiết):
//   Word Header (header3.xml):
//     Table 1: 4 cột (2185+3726+1918+2078 DXA) — Logo + Tên công ty + ISO info
//     Table 2: 2 cột (4786+5326 DXA) — I. THÔNG TIN SẢN PHẨM
//   Body (document.xml):
//     Table: 2 cột (4928+5245 DXA) — MÁY IN → MÁY CHIA → Footer
//   Colors: #fabf8f (orange headers), #c2d69b (green SP title), yellow highlight
//   Font: Times New Roman, 11pt default, 16pt headers, 14pt company name
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductionOrder } from './types';

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

// ── Timeout + CDN ─────────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number, lbl: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${lbl}`)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}
const sc: Record<string, Promise<void> | undefined> = {};
function loadS(url: string, g: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any)[g]) return Promise.resolve();
  if (sc[url]) return sc[url];
  sc[url] = new Promise<void>((r, j) => { const s = document.createElement('script'); s.src = url; s.async = true; s.onload = () => r(); s.onerror = () => j(new Error(`CDN: ${g}`)); document.head.appendChild(s); });
  return sc[url];
}
async function getJsPDF(): Promise<any> {
  try { const m = await withTimeout(import('jspdf'), 8000, 'jspdf'); const C = m.jsPDF || (m as any).default?.jsPDF || (m as any).default; if (C) return C; } catch { /**/ }
  await withTimeout(loadS('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js', 'jspdf'), 10000, 'jspdf CDN');
  return (window as any).jspdf?.jsPDF ?? (() => { throw new Error('jsPDF!'); })();
}
async function getH2C(): Promise<any> {
  try { const m = await withTimeout(import('html2canvas'), 8000, 'h2c'); const fn = (m as any).default || m; if (typeof fn === 'function') return fn; } catch { /**/ }
  await withTimeout(loadS('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas'), 10000, 'h2c CDN');
  return (window as any).html2canvas ?? (() => { throw new Error('h2c!'); })();
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
// ████  EXPORT DOCX — pixel-perfect copy of QT.ISO-22-BM02  ████
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportLSXtoDOCX(order: ProductionOrder): Promise<void> {
  console.log('[LSX] DOCX start:', order.id);

  const [D, logoBytes] = await Promise.all([
    withTimeout(import('docx'), 10000, 'docx').catch(() => { throw new Error('Không load được thư viện docx'); }),
    loadLogoBytes(),
  ]);

  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, BorderStyle, AlignmentType, ShadingType, Header,
    ImageRun, HeightRule, VerticalAlign, TableLayoutType,
  } = D;

  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round(s.spreadWidth * 1000);
  const dlMM = Math.round(s.cutStep * 1000);

  const TNR = 'Times New Roman';

  // Border config — all 4 sides, single, black, size 4 (giống mẫu gốc)
  const bdr = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };
  const noBdr = {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };

  // ── Run + Cell helpers ──
  const run = (text: string, o: { b?: boolean; i?: boolean; sz?: number; clr?: string; hl?: string; br?: boolean } = {}) => {
    if (o.br) return new TextRun({ break: 1, font: TNR, size: o.sz ?? 22 });
    return new TextRun({
      text, bold: o.b, italics: o.i, font: TNR,
      size: o.sz ?? 22, // 11pt = sz 22 (half-points)
      color: o.clr,
      highlight: o.hl as any,
    });
  };
  const br = (sz?: number) => new TextRun({ break: 1, font: TNR, size: sz ?? 22 });

  const para = (runs: any[], o: { align?: any; spacing?: any } = {}) => new Paragraph({
    alignment: o.align ?? AlignmentType.LEFT,
    spacing: o.spacing,
    children: runs,
  });

  const cell = (children: any[], o: {
    bg?: string; cs?: number; rs?: number; w?: number;
    va?: string; borders?: any;
  } = {}) => new TableCell({
    columnSpan: o.cs, rowSpan: o.rs,
    shading: o.bg ? { type: ShadingType.CLEAR, color: 'auto', fill: o.bg } : undefined,
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    verticalAlign: o.va === 'center' ? VerticalAlign.CENTER : VerticalAlign.TOP,
    children: Array.isArray(children) ? children : [children],
    borders: o.borders ?? bdr,
  });

  const row = (...cells: any[]) => new TableRow({ children: cells });
  const rowH = (h: number, ...cells: any[]) => new TableRow({
    children: cells,
    height: { value: h, rule: HeightRule.ATLEAST },
  });

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  HEADER TABLE 1: Logo + Công ty + ISO info (4 cột)             ║
  // ║  Grid: 2185 + 3726 + 1918 + 2078 DXA                          ║
  // ╚══════════════════════════════════════════════════════════════════╝
  const logoChildren: any[] = [];
  if (logoBytes) {
    logoChildren.push(new Paragraph({
      children: [new ImageRun({ data: logoBytes, transformation: { width: 131, height: 105 }, type: 'png' })],
    }));
  } else {
    logoChildren.push(para([run('LTS', { b: true, sz: 28 })]));
  }

  const hdrT1 = new Table({
    width: { size: 9907, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2185, 3726, 1918, 2078],
    rows: [
      // Row 1
      rowH(567,
        cell(logoChildren, { rs: 5, w: 2185, va: 'center' }),
        cell([para([run('Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An', { sz: 28 })],
          { align: AlignmentType.CENTER, spacing: { after: 120 } })],
          { rs: 3, w: 3726, va: 'center' }),
        cell([para([run('Ký mã hiệu', { i: true, sz: 24 })], { align: AlignmentType.BOTH })], { va: 'center' }),
        cell([para([run('QT.ISO-22-BM02', { sz: 24 })], { align: AlignmentType.CENTER })], { va: 'center' }),
      ),
      // Row 2
      rowH(567,
        cell([para([run('Lần ban hành', { i: true, sz: 24 })], { align: AlignmentType.BOTH })], { va: 'center' }),
        cell([para([run('02', { sz: 24 })], { align: AlignmentType.CENTER })], { va: 'center' }),
      ),
      // Row 3
      rowH(567,
        cell([para([run('Ngày ban hành', { i: true, sz: 24 })], { align: AlignmentType.BOTH })], { va: 'center' }),
        cell([para([run('01/03/2025', { sz: 24 })], { align: AlignmentType.CENTER })], { va: 'center' }),
      ),
      // Row 4 — LỆNH SẢN XUẤT + Số lệnh SX
      rowH(338,
        cell([para([run('LỆNH SẢN XUẤT ', { b: true, sz: 32 })], { align: AlignmentType.CENTER })], { rs: 2, va: 'center' }),
        cell([para([run('Số lệnh SX:', { i: true, sz: 24 })], { align: AlignmentType.BOTH })], { va: 'center' }),
        cell([para([run(m.lsxNumber || order.id, { sz: 24 })], { align: AlignmentType.CENTER })], { va: 'center' }),
      ),
      // Row 5 — Ngày xuống LSX
      rowH(338,
        cell([para([run('Ngày xuống LSX:', { i: true, sz: 24 })], { align: AlignmentType.BOTH })], { va: 'center' }),
        cell([para([run(m.issuedDate || '…/…./20…', { sz: 24 })], { align: AlignmentType.CENTER })], { va: 'center' }),
      ),
    ],
  });

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  HEADER TABLE 2: I. THÔNG TIN SẢN PHẨM (2 cột: 4786+5326)    ║
  // ║  Nền xanh lá #c2d69b cho title row                            ║
  // ╚══════════════════════════════════════════════════════════════════╝
  const spRows: any[] = [
    // Row 1 — title
    rowH(279,
      cell([para([run('I . THÔNG TIN SẢN PHẨM', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
        { cs: 2, bg: 'c2d69b', va: 'center' }),
    ),
    // Row 2 — Khách hàng
    rowH(312,
      cell([para([run('Khách hàng: ', { b: true }), run(' '), run(` ${s.customer || 'CÔNG TY ………..'}`, { b: true })])],
        { cs: 2, va: 'center' }),
    ),
    // Row 3 — MSP | Tên SP
    rowH(480,
      cell([para([run('MSP:', { b: true }), run(' '), run(` ${m.msp || 'TP_0……..MA   '}`)])], { va: 'center' }),
      cell([para([run('Tên SP:', { b: true }), run(' '), run(m.tenSP || s.productName || 'MÀNG IN …….', { b: true })])], { va: 'center' }),
    ),
    // Row 4 — Cấu trúc + Khổ màng | Quy cách + Quy cách cuộn + Chiều ra cuộn
    rowH(872,
      cell([para([
        run('Cấu trúc:', { b: true }), run(` ${v(s.structure)}`),
        br(), run('Khổ màng:', { b: true }), run(` K${khoMM}mm`),
      ])], { va: 'center' }),
      cell([para([
        run('Quy cách:', { b: true }), run(` ${m.quyCachNote || '.'}`),
        br(), run('Quy cách cuộn:', { b: true }), run(` ${isTui ? '' : (m.quyCachCuon || '.')}`),
        br(), run('Chiều ra cuộn:', { b: true }), run(` ${isTui ? '' : (m.chieuRaCuonSP || '.')}`),
      ])], { va: 'center' }),
    ),
    // Row 5 — Số màu | Số lượng ĐH
    rowH(277,
      cell([para([run('Số màu:', { b: true }), run(` ${vd(s.numColors)} màu `)])], { va: 'center' }),
      cell([para([run('Số lượng ĐH:', { b: true }), run(` ${m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²')}`)])], { va: 'center' }),
    ),
  ];

  const hdrT2 = new Table({
    width: { size: 10112, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4786, 5326],
    rows: spRows,
  });

  // Page Header object
  const pageHeader = new Header({
    children: [hdrT1, para([]), hdrT2],
  });

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  BODY TABLE: MÁY IN + MÁY CHIA/GHÉP + Footer (2 cột)          ║
  // ║  Grid: 4928 + 5245 DXA                                        ║
  // ║  Headers: nền #fabf8f (orange)                                 ║
  // ╚══════════════════════════════════════════════════════════════════╝
  const bodyRows: any[] = [];

  // ═══ MÁY IN ═══
  // Header row — merged, nền #fabf8f
  bodyRows.push(row(
    cell([para([run('MÁY IN', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
      { cs: 2, bg: 'fabf8f', va: 'center' }),
  ));

  // Màng in | Khổ — height 199
  bodyRows.push(rowH(199,
    cell([para([run('Màng in: ', { b: true }), run(v(m.printFilmName) || v(s.layer1Name) || '', { clr: 'ff0000' })])]),
    cell([para([run('Khổ: ', { b: true }), run(v(khoMM, 'mm'))])]),
  ));

  // Quy cách trục + MST | Số trục + Chiều ra cuộn — height 376
  bodyRows.push(rowH(376,
    cell([para([
      run('Quy cách trục: ', { b: true }), run(v(m.cylDiameter) ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : ''),
      br(), run('MST: ', { b: true }), run(v(m.printMST)),
    ])], { va: 'center' }),
    cell([para([
      run('Số trục: ', { b: true }), run(vd(m.numCylinders), { clr: 'ff0000' }),
      br(), run('Chiều ra cuộn:', { b: true }), run(' ' + v(m.rollOutWidth, 'mm'), { clr: 'ff0000' }),
    ])]),
  ));

  // Ô lớn merged: Thành phẩm in yêu cầu + ĐM + SL cấp VT + Ghi chú + Trục in — height 1497
  bodyRows.push(rowH(1497,
    cell([
      para([
        run('Thành phẩm in yêu cầu', { b: true, hl: 'yellow' }),
        run(':', { b: true }),
      ], { spacing: { line: 360, lineRule: 'auto' as any } }),
      para([
        run('Định mức phi hao: '), run(v(m.printWastePercent, ' M')),
        br(), run('Số lượng cấp vật tư: '), run(v(m.materialQtySupplied)),
      ], { spacing: { line: 360, lineRule: 'auto' as any } }),
      para([
        run('Ghi chú: ', { b: true }), br(),
        run(m.printNotes || 'Sử dụng mang'), br(),
        run('Trục in : ', { b: true }), run(v(m.cylInfo)),
      ], { spacing: { line: 360, lineRule: 'auto' as any } }),
    ], { cs: 2 }),
  ));

  // ═══ MÁY CHIA (cho màng) hoặc MÁY GHÉP + MÁY LÀM TÚI (cho túi) ═══
  if (!isTui) {
    // ── MÁY CHIA header — height 310 ──
    bodyRows.push(rowH(310,
      cell([para([run('MÁY CHIA', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
        { cs: 2, bg: 'fabf8f', va: 'center' }),
    ));

    // Khổ màng | Khổ chia — height 351
    bodyRows.push(rowH(351,
      cell([para([run('Khổ màng: ', { b: true }), run(v(khoMM, 'mm'))])], { va: 'center' }),
      cell([para([run('Khổ chia:', { b: true }), run(' ' + vd(m.divideWidth, 'mm'))])], { va: 'center' }),
    ));

    // Chiều dài quấn cuộn + Lưu ý | Chiều ra cuộn — height 431
    bodyRows.push(rowH(431,
      cell([para([
        run('Chiều dài quấn cuộn: ', { b: true }), run(vd(m.rollLength, ' m')),
        br(), run('(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)', { clr: 'ff0000' }),
      ])], { va: 'center' }),
      cell([para([run('Chiều ra cuộn: ', { b: true }), run(vd(m.divideRollOutWidth, 'mm'))])], { va: 'center' }),
    ));

    // Ô lớn merged: ĐM phi hao + KH yêu cầu giao + Ghi chú + Lưu ý
    // Mẫu gốc dùng vMerge 6 rows (463+463+488+638+739+276 = 3067 DXA)
    // Nhưng docx lib chỉ cần 1 cell lớn
    bodyRows.push(rowH(3067,
      cell([
        para([run('Định mức phi hao: 0m')], { spacing: { line: 360, lineRule: 'auto' as any } }),
        para([run('Khách hàng yêu cầu giao: ', { b: true }), run(v(m.divideDeliveryReq))], { spacing: { line: 360, lineRule: 'auto' as any } }),
        para([run(m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn'),
          br(), run('Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều. '),
          br(), run('Đánh dấu từng cặp MT-MS để khách hàng phân biệt.'),
        ], { spacing: { line: 360, lineRule: 'auto' as any } }),
        para([run('** Lưu ý: ', { b: true, sz: 26 })], { spacing: { line: 360, lineRule: 'auto' as any } }),
      ], { cs: 2 }),
    ));
  } else {
    // ── MÁY GHÉP ──
    bodyRows.push(row(
      cell([para([run('MÁY GHÉP', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
        { cs: 2, bg: 'fabf8f', va: 'center' }),
    ));
    bodyRows.push(rowH(199,
      cell([para([run('Màng ghép 1: ', { b: true }), run(v(m.laminateFilm1) || v(s.layer2Name) || '')])]),
      cell([para([run('Khổ: K', { b: true }), run(vd(m.laminateFilm1Width, 'mm'))])]),
    ));
    bodyRows.push(rowH(199,
      cell([para([run('Màng ghép 2: ', { b: true }), run(v(m.laminateFilm2))])]),
      cell([para([run('Khổ: K', { b: true })])]),
    ));
    bodyRows.push(row(
      cell([para([
        run('Định mức phi hao', { b: true }),
      ]),
      para([
        run('Thành phẩm yêu cầu: ', { b: true }), run(`${vd(m.lamProductQty)} ${v(m.lamProductUnit)}`),
      ]),
      para([run('Ghi chú: ', { b: true }), run(m.laminateNotes || '')]),
      ], { cs: 2 }),
    ));

    // ── MÁY CHIA (cho túi) ──
    bodyRows.push(row(
      cell([para([run('MÁY CHIA', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
        { cs: 2, bg: 'fabf8f', va: 'center' }),
    ));

    // ── MÁY LÀM TÚI ──
    bodyRows.push(row(
      cell([para([run('MÁY LÀM TÚI', { b: true, sz: 32 })], { align: AlignmentType.CENTER })],
        { cs: 2, bg: 'fabf8f', va: 'center' }),
    ));
    bodyRows.push(row(
      cell([para([run('Kiểu túi: ', { b: true }), run(v(s.bagType) || 'TÚI 4 BIÊN')])]),
      cell([para([])]),
    ));
    bodyRows.push(row(
      cell([para([run('Chiều rộng: ', { b: true }), run(khoMM + 'mm')])]),
      cell([para([run('Chiều dài: ', { b: true }), run(dlMM + 'mm')])]),
    ));
    bodyRows.push(row(
      cell([para([run('Dán biên: ', { b: true }), run(v(m.sealEdge))])]),
      cell([para([run('Xếp đáy: ', { b: true }), run(v(m.foldBottom))])]),
    ));
    bodyRows.push(row(
      cell([para([run('Nhấn xé', { b: true }), run(' ' + v(m.tearNotch))])]),
      cell([para([])]),
    ));
    const bagNotes: any[] = [run(`- Định mức phi hao: ${vd(m.bagWasteMeters, ' M~')}`)];
    if (m.useSemicircularMold) { bagNotes.push(br(), run('- Sử dụng khuôn đáy đứng bán nguyệt')); }
    if (m.useDualCutter) { bagNotes.push(br(), run('- Sử dụng dao cắt 2 nhịp để cắt')); }
    bodyRows.push(row(cell([para(bagNotes)], { cs: 2 })));
    bodyRows.push(row(
      cell([para([run('Yêu cầu giao hàng:', { b: true }), br(), run(m.deliveryNotes || '')])]),
      cell([para([run('Ghi chú: ', { b: true }), run(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất', { clr: 'ff0000' })])]),
    ));
  }

  // ═══ FOOTER: Người lập / Người Duyệt — height 527 ═══
  bodyRows.push(rowH(527,
    cell([para([run('Người lập:', { b: true })])], { va: 'center' }),
    cell([para([run('Người Duyệt:', { b: true })])], { va: 'center' }),
  ));

  const bodyTable = new Table({
    width: { size: 10173, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4928, 5245],
    rows: bodyRows,
  });

  // ══════════════════════════════════════════
  // BUILD DOCUMENT — page settings giống mẫu gốc
  // ══════════════════════════════════════════
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11907, height: 16840, orientation: 'portrait' as any },
          margin: { top: 1134, bottom: 851, left: 1134, right: 851, header: 568, footer: 144 },
        },
      },
      headers: { default: pageHeader },
      children: [bodyTable],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LSX_${safeFn(m.lsxNumber || order.id)}_${safeFn(s.customer)}.docx`;
  document.body.appendChild(a); a.click();
  await new Promise(r => setTimeout(r, 500));
  document.body.removeChild(a); URL.revokeObjectURL(url);
  console.log('[LSX] DOCX done:', a.download);
}


// ═══════════════════════════════════════════════════════════════════════════════
// ████  EXPORT PDF — inline HTML, layout giống mẫu gốc  ████
// ═══════════════════════════════════════════════════════════════════════════════
const FNT = 'font-family:Times New Roman,serif;';
const TD = `border:1px solid #000;padding:3px 5px;vertical-align:top;font-size:11px;${FNT}`;
const LBL = `${TD}font-weight:bold;`;
const HDR_S = `${TD}background:#fabf8f;font-weight:bold;text-align:center;font-size:16px;padding:4px;`;
const SP_HDR = `${TD}background:#c2d69b;font-weight:bold;text-align:center;font-size:16px;padding:3px;`;

function buildHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round(s.spreadWidth * 1000);
  const dlMM = Math.round(s.cutStep * 1000);

  return `
<!-- HEADER TABLE 1: Logo + Công ty + ISO -->
<table style="border-collapse:collapse;width:100%;${FNT}">
  <tr>
    <td rowspan="5" style="${TD}width:22%;vertical-align:middle;text-align:center;">
      <img src="/logo_lts.png" style="width:65px;height:52px;" alt="LTS"/>
    </td>
    <td rowspan="3" style="${TD}width:38%;vertical-align:middle;text-align:center;font-size:14px;">
      Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An
    </td>
    <td style="${TD}width:19%;font-style:italic;font-size:12px;">Ký mã hiệu</td>
    <td style="${TD}width:21%;text-align:center;font-size:12px;">QT.ISO-22-BM02</td>
  </tr>
  <tr>
    <td style="${TD}font-style:italic;font-size:12px;">Lần ban hành</td>
    <td style="${TD}text-align:center;font-size:12px;">02</td>
  </tr>
  <tr>
    <td style="${TD}font-style:italic;font-size:12px;">Ngày ban hành</td>
    <td style="${TD}text-align:center;font-size:12px;">01/03/2025</td>
  </tr>
  <tr>
    <td rowspan="2" style="${TD}vertical-align:middle;text-align:center;font-weight:bold;font-size:16px;">LỆNH SẢN XUẤT</td>
    <td style="${TD}font-style:italic;font-size:12px;">Số lệnh SX:</td>
    <td style="${TD}text-align:center;font-size:12px;">${m.lsxNumber || order.id}</td>
  </tr>
  <tr>
    <td style="${TD}font-style:italic;font-size:12px;">Ngày xuống LSX:</td>
    <td style="${TD}text-align:center;font-size:12px;">${m.issuedDate || '…/…./20…'}</td>
  </tr>
</table>

<!-- HEADER TABLE 2: I. THÔNG TIN SẢN PHẨM -->
<table style="border-collapse:collapse;width:100%;${FNT}margin-top:-1px;">
  <tr><td colspan="2" style="${SP_HDR}">I . THÔNG TIN SẢN PHẨM</td></tr>
  <tr>
    <td colspan="2" style="${TD}"><b>Khách hàng:</b> &nbsp; ${s.customer || 'CÔNG TY ………..'}</td>
  </tr>
  <tr>
    <td style="${TD}width:47%;"><b>MSP:</b> &nbsp; ${m.msp || 'TP_0……..MA'}</td>
    <td style="${TD}"><b>Tên SP:</b> &nbsp; <b>${m.tenSP || s.productName || 'MÀNG IN …….'}</b></td>
  </tr>
  <tr>
    <td style="${TD}"><b>Cấu trúc:</b> ${v(s.structure)}<br><b>Khổ màng:</b> K${khoMM}mm</td>
    <td style="${TD}"><b>Quy cách:</b> ${m.quyCachNote || '.'}<br><b>Quy cách cuộn:</b> ${isTui ? '' : (m.quyCachCuon || '.')}<br><b>Chiều ra cuộn:</b> ${isTui ? '' : (m.chieuRaCuonSP || '.')}</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Số màu:</b> ${vd(s.numColors)} màu</td>
    <td style="${TD}"><b>Số lượng ĐH:</b> ${m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²')}</td>
  </tr>
</table>

<!-- BODY TABLE: MÁY IN + MÁY CHIA/GHÉP -->
<table style="border-collapse:collapse;width:100%;${FNT}margin-top:-1px;">
  <!-- MÁY IN -->
  <tr><td colspan="2" style="${HDR_S}">MÁY IN</td></tr>
  <tr>
    <td style="${LBL}width:48%;">Màng in: <span style="color:red;font-weight:normal;">${v(m.printFilmName) || v(s.layer1Name)}</span></td>
    <td style="${LBL}">Khổ: <span style="font-weight:normal;">${v(khoMM, 'mm')}</span></td>
  </tr>
  <tr>
    <td style="${TD}vertical-align:middle;"><b>Quy cách trục:</b> ${v(m.cylDiameter) ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : ''}<br><b>MST:</b> ${v(m.printMST)}</td>
    <td style="${TD}"><b>Số trục:</b> <span style="color:red;">${vd(m.numCylinders)}</span><br><b>Chiều ra cuộn:</b> <span style="color:red;">${v(m.rollOutWidth, 'mm')}</span></td>
  </tr>
  <tr>
    <td colspan="2" style="${TD}line-height:1.5;">
      <b><span style="background:yellow;">Thành phẩm in yêu cầu</span></b>:<br>
      Định mức phi hao: ${v(m.printWastePercent, ' M')}<br>
      Số lượng cấp vật tư: ${v(m.materialQtySupplied)}<br><br>
      <b>Ghi chú:</b><br>${m.printNotes || 'Sử dụng mang'}<br>
      <b>Trục in :</b> ${v(m.cylInfo)}
    </td>
  </tr>

${!isTui ? `
  <!-- MÁY CHIA -->
  <tr><td colspan="2" style="${HDR_S}">MÁY CHIA</td></tr>
  <tr>
    <td style="${LBL}">Khổ màng: <span style="font-weight:normal;">${v(khoMM, 'mm')}</span></td>
    <td style="${LBL}">Khổ chia:<span style="font-weight:normal;"> ${vd(m.divideWidth, 'mm')}</span></td>
  </tr>
  <tr>
    <td style="${TD}vertical-align:middle;"><b>Chiều dài quấn cuộn:</b> ${vd(m.rollLength, ' m')}<br><span style="color:red;">(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)</span></td>
    <td style="${TD}vertical-align:middle;"><b>Chiều ra cuộn:</b> ${vd(m.divideRollOutWidth, 'mm')}</td>
  </tr>
  <tr>
    <td colspan="2" style="${TD}line-height:1.5;">
      Định mức phi hao: 0m<br><br>
      <b>Khách hàng yêu cầu giao:</b> ${v(m.divideDeliveryReq)}<br><br>
      ${m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn<br>Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.<br>Đánh dấu từng cặp MT-MS để khách hàng phân biệt.'}<br><br>
      <b style="font-size:13px;">** Lưu ý:</b>
    </td>
  </tr>
` : `
  <!-- MÁY GHÉP -->
  <tr><td colspan="2" style="${HDR_S}">MÁY GHÉP</td></tr>
  <tr>
    <td style="${LBL}">Màng ghép 1: <span style="font-weight:normal;">${v(m.laminateFilm1) || v(s.layer2Name)}</span></td>
    <td style="${LBL}">Khổ: K<span style="font-weight:normal;">${vd(m.laminateFilm1Width, 'mm')}</span></td>
  </tr>
  <tr>
    <td style="${LBL}">Màng ghép 2: <span style="font-weight:normal;">${v(m.laminateFilm2)}</span></td>
    <td style="${LBL}">Khổ: K</td>
  </tr>
  <tr><td colspan="2" style="${TD}line-height:1.5;">
    Định mức phi hao<br>
    Thành phẩm yêu cầu: ${vd(m.lamProductQty)} ${v(m.lamProductUnit)}<br>
    <b>Ghi chú:</b> ${m.laminateNotes || ''}
  </td></tr>

  <!-- MÁY CHIA -->
  <tr><td colspan="2" style="${HDR_S}">MÁY CHIA</td></tr>

  <!-- MÁY LÀM TÚI -->
  <tr><td colspan="2" style="${HDR_S}">MÁY LÀM TÚI</td></tr>
  <tr>
    <td style="${LBL}">Kiểu túi: <span style="font-weight:normal;">${v(s.bagType) || 'TÚI 4 BIÊN'}</span></td>
    <td style="${TD}"></td>
  </tr>
  <tr>
    <td style="${TD}"><b>Chiều rộng:</b> ${khoMM}mm</td>
    <td style="${TD}"><b>Chiều dài:</b> ${dlMM}mm</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Dán biên:</b> ${v(m.sealEdge)}</td>
    <td style="${TD}"><b>Xếp đáy:</b> ${v(m.foldBottom)}</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Nhấn xé</b> ${v(m.tearNotch)}</td>
    <td style="${TD}"></td>
  </tr>
  <tr><td colspan="2" style="${TD}line-height:1.5;">
    - Định mức phi hao: ${vd(m.bagWasteMeters, ' M~')}
    ${m.useSemicircularMold ? '<br>- Sử dụng khuôn đáy đứng bán nguyệt' : ''}
    ${m.useDualCutter ? '<br>- Sử dụng dao cắt 2 nhịp để cắt' : ''}
  </td></tr>
  <tr>
    <td style="${TD}"><b>Yêu cầu giao hàng:</b><br>${m.deliveryNotes || ''}</td>
    <td style="${TD}"><b>Ghi chú:</b> <span style="color:red;">${m.bagMachineNotes || 'chạy theo mẫu đã sản xuất'}</span></td>
  </tr>
`}

  <!-- FOOTER -->
  <tr>
    <td style="${LBL}padding:10px;height:30px;">Người lập:</td>
    <td style="${LBL}padding:10px;height:30px;">Người Duyệt:</td>
  </tr>
</table>
`;
}

export async function exportLSXtoPDF(order: ProductionOrder): Promise<void> {
  console.log('[LSX] PDF start:', order.id);
  const [JsPDF, h2c] = await Promise.all([getJsPDF(), getH2C()]);

  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:794px;background:#fff;${FNT}font-size:11px;color:#000;padding:20px 18px;box-sizing:border-box;z-index:-1;`;
  container.innerHTML = buildHtml(order);
  document.body.appendChild(container);

  try {
    await new Promise(r => setTimeout(r, 800));
    const canvas: HTMLCanvasElement = await withTimeout(
      h2c(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#fff', windowWidth: 794 }),
      30000, 'h2c',
    );
    if (!canvas || canvas.width === 0) throw new Error('Canvas empty');

    const img = canvas.toDataURL('image/png');
    const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pW = pdf.internal.pageSize.getWidth();
    const pH = pdf.internal.pageSize.getHeight();
    const iH = (canvas.height * pW) / canvas.width;
    let y = 0;
    while (y < iH) { if (y > 0) pdf.addPage(); pdf.addImage(img, 'PNG', 0, -y, pW, iH); y += pH; }

    pdf.save(`LSX_${safeFn(order.manual.lsxNumber || order.id)}_${safeFn(order.snapshot.customer)}.pdf`);
    console.log('[LSX] PDF done');
  } finally { document.body.removeChild(container); }
}
