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
//
// PDF workflow: exportLSXtoPDF → buildLSXHtml (mirror 1:1 DOCX) → window.open → window.print
//   @page A4, Times New Roman, logo base64 inline, -webkit-print-color-adjust: exact
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

// ── Timeout ───────────────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number, lbl: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${lbl}`)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

// ── Load logo → base64 data URL (dùng cho cả DOCX và print HTML) ─────────────
async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const resp = await fetch('/logo_lts.png');
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch { return null; }
}
async function loadLogoDataUrl(): Promise<string> {
  try {
    const resp = await fetch('/logo_lts.png');
    if (!resp.ok) return '';
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:image/png;base64,${b64}`;
  } catch { return ''; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ████  BUILD DOCX BLOB — pixel-perfect copy của LSX TÚI.docx (QT.ISO-22-BM02)
//
// Cấu trúc thực tế (từ XML):
//   Header (header1.xml):
//     Table 1: 4 cột [2242, 3567, 2039, 2059] DXA — Logo(rs=4) | Tên cty(rs=3) | ISO labels | ISO values
//              Row 4: LỆNH SẢN XUẤT(rs=2) | Số LSX: | value(đỏ)
//              Row 5:                       | Ngày xuống LSX: | value(đỏ)
//     Table 2: 2 cột [4361, 5751] DXA — I. THÔNG TIN SẢN PHẨM
//              R1 colspan=2 fill #c2d69b
//              R2 colspan=2 Khách hàng
//              R3 MSP | Tên SP
//              R4 Cấu trúc+Khổ | Quy cách+KiểuTúi+Số lượng
//              R5 Số màu | Số lượng đơn hàng
//   Body (document.xml):
//     Table: 5 cột [2943, 2126, 2410, 567, 2092] DXA — II. CÔNG VIỆC CẦN THỰC HIỆN
//     TÚI layout:
//       R1: colspan=5 "II. CÔNG VIỆC CẦN THỰC HIỆN" fill #c2d69b
//       R2: [c1+c2 span] MÁY IN / [c3+c4+c5 span] MÁY GHÉP  fill #fabf8f
//       R3: Màng in | Khổ | Màng ghép 1 + Khổ | Khổ
//       R4: Trục in (D×CV) | Số trục | Màng ghép 2 | Khổ
//       R5: [c1+c2 tall] nội dung MÁY IN / [c3+c4+c5] nội dung MÁY GHÉP
//       R6: [c1+c2] MÁY CHIA / [c3+c4+c5] MÁY LÀM TÚI  fill #fabf8f
//       R7: [c1+c2 vMerge nhiều dòng = phần MÁY CHIA] / Kiểu túi
//       R8: [vMerge] / Chiều rộng | Chiều dài
//       R9: [vMerge] / Hàn biên | Xếp đáy
//       R10:[vMerge] / Nhấn xé
//       R11:[vMerge restart = nội dung MÁY CHIA] / Hàn đầu
//       R12:[vMerge] / Dao cắt 2 nhịp + khuôn bán nguyệt
//       R13:[vMerge] / DMPH + Ghi chú
//       R14:[vMerge] / Ghi chú: chạy theo mẫu
//       R15: Người lập | Người duyệt (colspan c1+c2 | colspan c3+c4+c5)
//
// MÀNG layout: đơn giản hơn, 2 section dọc: MÁY IN → MÁY CHIA (full 5 cột mỗi)
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
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round(s.spreadWidth * 1000);
  const dlMM  = Math.round(s.cutStep * 1000);
  const TNR = 'Times New Roman';

  // ── Border helpers ─────────────────────────────────────────────────
  const bdr = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  // ── Run / Para / Cell helpers ───────────────────────────────────────
  const run = (text: string, o: { b?: boolean; i?: boolean; sz?: number; clr?: string } = {}) =>
    new TextRun({ text, bold: o.b, italics: o.i, font: TNR, size: o.sz ?? 22, color: o.clr });
  const br = () => new TextRun({ break: 1, font: TNR, size: 22 });

  const para = (children: any[], align: any = AlignmentType.LEFT, spacing?: any) =>
    new Paragraph({ alignment: align, spacing, children });

  // verticalMerge helpers
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
    children,
    borders: bdr,
  });

  const rowH = (h: number, ...cells: any[]) => new TableRow({
    children: cells,
    height: { value: h, rule: HeightRule.ATLEAST },
  });

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  HEADER TABLE 1: 4 cột [2242, 3567, 2039, 2059] DXA            ║
  // ╚══════════════════════════════════════════════════════════════════╝
  const logoCell = logoBytes
    ? [para([new ImageRun({ data: logoBytes, transformation: { width: 100, height: 80 }, type: 'png' })], AlignmentType.CENTER)]
    : [para([run('LTS', { b: true, sz: 28 })], AlignmentType.CENTER)];

  const hdrT1 = new Table({
    width: { size: 9907, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2242, 3567, 2039, 2059],
    rows: [
      // R1: logo(rs=4) | tên cty(rs=3) | Ký mã hiệu | QT.ISO-22-BM02
      rowH(567,
        cell(logoCell, { vm: VM_START, w: 2242, va: 'center' }),
        cell([para([run('Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An', { sz: 28 })],
          AlignmentType.CENTER)], { vm: VM_START, w: 3567, va: 'center' }),
        cell([para([run('Ký mã hiệu', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('QT.ISO-22-BM02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      // R2: logo(cont) | tên cty(cont) | Lần ban hành | 02
      rowH(567,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Lần ban hành', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('02', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      // R3: logo(cont) | tên cty(cont) | Ngày ban hành | 01/03/2025
      rowH(567,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Ngày ban hành', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run('01/03/2025', { sz: 24 })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      // R4: logo(cont) | LỆNH SẢN XUẤT(rs=2) | Số LSX: | value(đỏ)
      rowH(338,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('LỆNH SẢN XUẤT', { b: true, sz: 32 })], AlignmentType.CENTER)],
          { vm: VM_START, va: 'center' }),
        cell([para([run('Số LSX:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(m.lsxNumber || order.id, { sz: 24, clr: 'ff0000' })], AlignmentType.CENTER)], { va: 'center' }),
      ),
      // R5: logo(cont) | LSX(cont) | Ngày xuống LSX: | value(đỏ)
      rowH(338,
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([])], { vm: VM_CONTINUE }),
        cell([para([run('Ngày xuống LSX:', { i: true, sz: 24 })])], { va: 'center' }),
        cell([para([run(m.issuedDate || '…/…./20…', { sz: 24, clr: 'ff0000' })], AlignmentType.CENTER)], { va: 'center' }),
      ),
    ],
  });

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  HEADER TABLE 2: 2 cột [4361, 5751] DXA — I. THÔNG TIN SP     ║
  // ╚══════════════════════════════════════════════════════════════════╝
  const hdrT2 = new Table({
    width: { size: 10112, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4361, 5751],
    rows: [
      // R1: title xanh lá colspan=2
      rowH(439,
        cell([para([run('I. THÔNG TIN SẢN PHẨM', { b: true, sz: 32 })], AlignmentType.CENTER)],
          { cs: 2, bg: 'c2d69b', va: 'center' }),
      ),
      // R2: Khách hàng colspan=2
      rowH(398,
        cell([para([run('Khách hàng: ', { b: true }), run(s.customer || 'CÔNG TY ………..', { b: true })])],
          { cs: 2, va: 'center' }),
      ),
      // R3: MSP | Tên SP
      rowH(702,
        cell([
          para([run('MSP:', { b: true }), run(' ' + (m.msp || 'TP_0……..'))]),
          para([run('TSP:', { b: true }), run(' ' + (isTui ? 'TÚI' : 'MÀNG'))]),
        ], { va: 'center' }),
        cell([
          para([run('Tên SP:', { b: true }), run(' ' + (m.tenSP || s.productName || ''))], AlignmentType.LEFT),
        ], { va: 'center' }),
      ),
      // R4: Cấu trúc+Khổ | Kiểu túi+Quy cách
      rowH(967,
        cell([
          para([run('Cấu trúc:', { b: true }), run(' ' + (s.structure || ''))]),
          para([run('Khổ màng:', { b: true }), run(` K${khoMM}mm`)]),
        ], { va: 'center' }),
        cell([
          para([run(isTui ? 'Kiểu túi:' : 'Quy cách:', { b: true }), run(' ' + (isTui ? (s.bagType || '') : (m.quyCachNote || '')))]),
          para([run('Quy cách:', { b: true }), run(' ' + (m.quyCachNote || ''))]),
          ...(!isTui ? [
            para([run('Quy cách cuộn:', { b: true }), run(' ' + (m.quyCachCuon || ''))]),
            para([run('Chiều ra cuộn:', { b: true }), run(' ' + (m.chieuRaCuonSP || ''))]),
          ] : []),
        ], { va: 'center' }),
      ),
      // R5: Số màu | Số lượng đơn hàng
      rowH(556,
        cell([para([run('Số màu:', { b: true }), run(` ${vd(s.numColors)} màu`)])], { va: 'center' }),
        cell([para([run('Số lượng đơn hàng:', { b: true }), run(' ' + (m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²')))])], { va: 'center' }),
      ),
    ],
  });

  // Không dùng Word Header vì header overflow → đè lên body.
  // Đặt hdrT1 + hdrT2 + bodyTable đều vào section children,
  // Word tự stack từ trên xuống, không đè nhau.
  // (Header API của docx tạo floating header region, không thích hợp với 2 bảng cao ~100mm)

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║  BODY TABLE — compact 1 trang A4, y mẫu gốc                ║
  // ║  TÚI: 5 cột [2943,2126,2410,567,2092] (LSX TÚI.docx)      ║
  // ║  MÀNG: 2 cột [4928,5245] (LSX MÀNG IN.docx)                ║
  // ╚═══════════════════════════════════════════════════════════════╝

  let bodyTable: any;

  if (!isTui) {
    // ════ MÀNG: 2-cột layout y mẫu LSX MÀNG IN.docx ════
    const mR: any[] = [];
    mR.push(rowH(300, cell([para([run('MÁY IN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
    mR.push(rowH(280,
      cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
      cell([para([run('Khổ: ', { b: true }), run(`${khoMM}mm`)])]),
    ));
    mR.push(rowH(360,
      cell([
        para([run('Quy cách trục: ', { b: true }), run(v(m.cylDiameter) ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : '')]),
        para([run('MST: ', { b: true }), run(v(m.printMST))]),
      ]),
      cell([
        para([run('Số trục: ', { b: true }), run(vd(m.numCylinders))]),
        para([run('Chiều ra cuộn: ', { b: true }), run(v(m.rollOutWidth, 'mm'))]),
      ]),
    ));
    mR.push(rowH(1100, cell([
      para([run('Thành phẩm in yêu cầu:', { b: true })]),
      para([run(`Định mức phi hao: ${v(m.printWastePercent, 'm')}`)]),
      para([run(`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`)]),
      para([]),
      para([run('Ghi chú:', { b: true })]),
      para([run(m.printNotes || '')]),
      para([run('Trục in: ', { b: true }), run(v(m.cylInfo))]),
    ], { cs: 2 })));
    mR.push(rowH(300, cell([para([run('MÁY CHIA', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' })));
    mR.push(rowH(280,
      cell([para([run('Khổ màng: ', { b: true }), run(`${khoMM}mm`)])]),
      cell([para([run('Khổ chia: ', { b: true }), run(vd(m.divideWidth, 'mm'))])]),
    ));
    mR.push(rowH(360,
      cell([
        para([run('Chiều dài quấn cuộn: ', { b: true }), run(vd(m.rollLength, ' m'))]),
        para([run('(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)', { clr: 'ff0000', sz: 18 })]),
      ]),
      cell([para([run('Chiều ra cuộn: ', { b: true }), run(vd(m.divideRollOutWidth, 'mm'))])]),
    ));
    mR.push(rowH(2200, cell([
      para([run('Định mức phí hao: 0m')]),
      para([]),
      para([run('Khách hàng yêu cầu giao: ', { b: true }), run(v(m.divideDeliveryReq))]),
      para([]),
      para([run(m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn')]),
      para([run('Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.')]),
      para([run('Đánh dấu từng cặp MT-MS để khách hàng phân biệt.')]),
      para([]),
      para([run('** Lưu ý:', { b: true, sz: 26 })]),
    ], { cs: 2 })));
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
    // ════ TÚI: 5-cột layout y mẫu LSX TÚI.docx ════
    const tR: any[] = [];
    // R0: tiêu đề xanh
    tR.push(rowH(320, cell([para([run('II. CÔNG VIỆC CẦN THỰC HIỆN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 5, bg: 'c2d69b', va: 'center' })));
    // R1: MÁY IN | MÁY GHÉP
    tR.push(rowH(280,
      cell([para([run('MÁY IN', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
      cell([para([run('MÁY GHÉP', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
    ));
    // R2: Màng in | Khổ | Màng ghép 1 | Khổ
    tR.push(rowH(280,
      cell([para([run('Màng in: ', { b: true }), run(m.printFilmName || s.layer1Name || '')])]),
      cell([para([run('Khổ: ', { b: true }), run(`${khoMM}mm`)])]),
      cell([para([run('Màng ghép 1: ', { b: true }), run(m.laminateFilm1 || s.layer2Name || '')])], { cs: 2 }),
      cell([para([run('Khổ: ', { b: true }), run(vd(m.laminateFilm1Width, 'mm'))])]),
    ));
    // R3: Trục in | Số trục | Màng ghép 2 | Khổ
    tR.push(rowH(360,
      cell([
        para([run('Trục in: ', { b: true }), run(v(m.cylDiameter) ? `D${v(m.cylDiameter)} x CV${v(m.cylWidth)}` : '')]),
        para([run('Mã Số Trục: ', { b: true }), run(v(m.printMST))]),
      ]),
      cell([para([run('Số trục: ', { b: true }), run(`= số màu`)])]),
      cell([para([run('Màng ghép 2: ', { b: true }), run(m.laminateFilm2 || s.layer3Name || '')])], { cs: 2 }),
      cell([para([run('Khổ: ', { b: true }), run(`${khoMM}mm`)])]),
    ));
    // R4: nội dung MÁY IN | nội dung MÁY GHÉP
    tR.push(rowH(1000,
      cell([
        para([run(`Định mức phí hao: ${v(m.printWastePercent, 'm')}`)]),
        para([run(`Thành phẩm yêu cầu: ${v(m.printProductQty, 'm')}`)]),
        para([run('Ghi chú: ', { b: true }), run(m.printNotes || 'tự điền')]),
        para([run('- Màu sắc: duyệt màu theo '), run(v(m.maMucNhu) || 'tự điền')]),
        para([run('- Chiều xả: '), run(v(m.printDirection) || 'tự điền')]),
      ], { cs: 2 }),
      cell([
        para([run(`Định mức phí hao: L1: ${v(m.lamWaste, 'm')}, L2: ${v(m.lamBTP, 'm')}`)]),
        para([run(`Thành phẩm yêu cầu: ${v(m.lamProductQty, 'm')}`)]),
        para([run('Ghi chú: ', { b: true }), run(m.laminateNotes || 'tự điền')]),
      ], { cs: 3 }),
    ));
    // R5: MÁY CHIA | MÁY LÀM TÚI
    tR.push(rowH(260,
      cell([para([run('MÁY CHIA', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 2, bg: 'fabf8f', va: 'center' }),
      cell([para([run('MÁY LÀM TÚI', { b: true, sz: 32 })], AlignmentType.CENTER)], { cs: 3, bg: 'fabf8f', va: 'center' }),
    ));
    // R6: MÁY CHIA vMerge start | Kiểu túi
    tR.push(rowH(340,
      cell([
        para([run('Khổ màng: ', { b: true }), run(`${khoMM}mm`)]),
        para([run('Khổ chia: ', { b: true }), run(vd(m.divideWidth, 'mm'))]),
      ], { cs: 2, vm: VM_START, va: 'top' }),
      cell([para([run('Kiểu túi: ', { b: true }), run(s.bagType || 'zipper 3 biên')], AlignmentType.CENTER)], { cs: 3 }),
    ));
    // R7: vMerge | Chiều rộng | Chiều dài
    tR.push(rowH(260,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([para([run('Chiều rộng: ', { b: true }), run(`${khoMM}mm`)])]),
      cell([para([run('Chiều dài: ', { b: true }), run(`${dlMM}mm`)])], { cs: 2 }),
    ));
    // R8: vMerge | Hàn biên | Xếp đáy
    tR.push(rowH(260,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([para([run('Hàn biên: ', { b: true }), run(v(m.hanBien, 'mm') || 'mặc định 10mm')])]),
      cell([para([run('Xếp đáy: ', { b: true }), run(v(m.foldBottom))])], { cs: 2 }),
    ));
    // R9: vMerge | Nhấn xé
    tR.push(rowH(260,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([para([run('Nhấn xé "v": ', { b: true }), run(v(m.tearNotch))])], { cs: 3 }),
    ));
    // R10: MÁY CHIA part2 vMerge restart | Hàn đầu
    tR.push(rowH(420,
      cell([
        para([run('Chiều dài quấn cuộn: ', { b: true }), run(vd(m.rollLength, ' m'))]),
        para([run('Chiều ra cuộn: ', { b: true }), run(vd(m.divideRollOutWidth, 'mm'))]),
        para([run('Ghi chú: ', { b: true }), run(m.divideNotes || 'tự điền')]),
        para([run('Yêu cầu giao hàng: ', { b: true }), run(v(m.divideDeliveryReq) || '')]),
      ], { cs: 2, vm: VM_START, va: 'top' }),
      cell([para([run('Hàn đầu: ', { b: true }), run(v(m.hanDau, 'mm') || 'tự điền')])], { cs: 3 }),
    ));
    // R11: vMerge | Dao cắt + khuôn
    tR.push(rowH(340,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([
        ...(m.useDualCutter ? [para([run('Sử dụng dao cắt 2 nhịp để cắt', { b: true })])] : []),
        ...(m.useSemicircularMold ? [para([run('Sử dụng khuôn đáy đứng bán nguyệt', { b: true })])] : []),
        ...((!m.useDualCutter && !m.useSemicircularMold) ? [para([run('')])] : []),
      ], { cs: 3 }),
    ));
    // R12: vMerge | DMPH + Ghi chú
    tR.push(rowH(360,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([
        para([run(`DMPH: ${vd(m.bagWasteMeters, 'm')}`, { b: true })]),
        para([run('Ghi chú: ', { b: true }), run(m.bagLuuY || 'tự điền')]),
      ], { cs: 3 }),
    ));
    // R13: vMerge | Ghi chú chạy theo mẫu
    tR.push(rowH(600,
      cell([para([])], { cs: 2, vm: VM_CONTINUE }),
      cell([
        para([run('Ghi chú: ', { b: true }), run(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')]),
        para([run(`SL đóng gói: ${v(m.packagingInfo)}`)]),
        para([run(m.packagingNotes || '')]),
        para([run('Yêu cầu giao hàng: ', { b: true })]),
        para([run(m.deliveryNotes || '')]),
      ], { cs: 3 }),
    ));
    // R14: Người lập | Người duyệt
    tR.push(rowH(600,
      cell([para([run('Người lập:', { b: true })]), para([run(m.preparedBy || '')])], { cs: 2, va: 'center' }),
      cell([para([run('Người duyệt:', { b: true })]), para([run(m.approvedBy || '')])], { cs: 3, va: 'center' }),
    ));

    bodyTable = new Table({
      width: { size: 10138, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [2943, 2126, 2410, 567, 2092],
      rows: tR,
    });
  }

  // ══════════════════════════════════════════════════════
  // BUILD DOCUMENT — A4 portrait, gọn 1 trang
  // Bỏ spacing giữa các bảng để nội dung vừa 1 trang A4
  // ══════════════════════════════════════════════════════
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

// ── Export DOCX — wrapper gọi buildLSXDocxBlob rồi trigger download ───────────
export async function exportLSXtoDOCX(order: ProductionOrder): Promise<void> {
  console.log('[LSX] DOCX start:', order.id);
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

// ── helper chỉ dùng bởi buildLSXHtml (browser print fallback, giữ lại) ────────
function buildLSXHtml(order: ProductionOrder, logoDataUrl: string): string {
  const F = 'font-family:"Times New Roman",Times,serif';
  const B = `border:1px solid #000;${F};vertical-align:top;padding:3px 6px;`;
  const SZ: Record<number, string> = { 22: '14.7px', 24: '16px', 26: '17.3px', 28: '18.7px', 32: '21.3px' };
  const td = (extra = '') => `style="${B}font-size:${SZ[22]};${extra}"`;
  const th = (bg: string, sz = 32) => `style="${B}background:${bg};font-weight:bold;text-align:center;font-size:${SZ[sz]};padding:4px 6px;"`;

  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round(s.spreadWidth * 1000);
  const dlMM  = Math.round(s.cutStep * 1000);

  // ── Helpers dùng inline ──
  const bold = (t: string) => `<b>${t}</b>`;
  const red  = (t: string) => `<span style="color:#cc0000">${t}</span>`;
  const hl   = (t: string) => `<span style="background:#ffff00">${t}</span>`;
  const br   = '<br>';

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE 1 — Logo + Tên công ty + ISO (4 cột: 22.1 / 37.6 / 19.4 / 21.0%)
  // ─────────────────────────────────────────────────────────────────────────
  const t1 = `
<table style="border-collapse:collapse;width:100%;table-layout:fixed;${F}">
  <colgroup>
    <col style="width:22.1%"><col style="width:37.6%">
    <col style="width:19.4%"><col style="width:21.0%">
  </colgroup>
  <tr>
    <td rowspan="5" ${td('text-align:center;vertical-align:middle;')}>
      <img src="${logoDataUrl || '/logo_lts.png'}" style="width:80px;height:64px;display:block;margin:auto;" onerror="this.style.display='none'"/>
    </td>
    <td rowspan="3" ${td(`text-align:center;vertical-align:middle;font-size:${SZ[28]};`)}>
      Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An
    </td>
    <td ${td(`font-style:italic;font-size:${SZ[24]};`)} >Ký mã hiệu</td>
    <td ${td(`text-align:center;font-size:${SZ[24]};`)} >QT.ISO-22-BM02</td>
  </tr>
  <tr>
    <td ${td(`font-style:italic;font-size:${SZ[24]};`)} >Lần ban hành</td>
    <td ${td(`text-align:center;font-size:${SZ[24]};`)} >02</td>
  </tr>
  <tr>
    <td ${td(`font-style:italic;font-size:${SZ[24]};`)} >Ngày ban hành</td>
    <td ${td(`text-align:center;font-size:${SZ[24]};`)} >01/03/2025</td>
  </tr>
  <tr>
    <td rowspan="2" ${td(`text-align:center;vertical-align:middle;font-weight:bold;font-size:${SZ[32]};`)} >LỆNH SẢN XUẤT</td>
    <td ${td(`font-style:italic;font-size:${SZ[24]};`)} >Số lệnh SX:</td>
    <td ${td(`text-align:center;font-size:${SZ[24]};`)} >${m.lsxNumber || order.id}</td>
  </tr>
  <tr>
    <td ${td(`font-style:italic;font-size:${SZ[24]};`)} >Ngày xuống LSX:</td>
    <td ${td(`text-align:center;font-size:${SZ[24]};`)} >${m.issuedDate || '…/…./20…'}</td>
  </tr>
</table>`;

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE 2 — I. THÔNG TIN SẢN PHẨM (2 cột: 47.3 / 52.7%)
  // ─────────────────────────────────────────────────────────────────────────
  const t2 = `
<table style="border-collapse:collapse;width:100%;table-layout:fixed;${F};margin-top:-1px;">
  <colgroup><col style="width:47.3%"><col style="width:52.7%"></colgroup>
  <tr>
    <td colspan="2" ${th('#c2d69b', 32)} >I . THÔNG TIN SẢN PHẨM</td>
  </tr>
  <tr>
    <td colspan="2" ${td()} >${bold('Khách hàng:')} &nbsp; ${bold(s.customer || 'CÔNG TY ………..') }</td>
  </tr>
  <tr>
    <td ${td()} >${bold('MSP:')} &nbsp; ${m.msp || 'TP_0……..MA'}</td>
    <td ${td()} >${bold('Tên SP:')} &nbsp; ${bold(m.tenSP || s.productName || 'MÀNG IN …….')}</td>
  </tr>
  <tr>
    <td ${td('vertical-align:middle;')} >
      ${bold('Cấu trúc:')} ${v(s.structure)}${br}
      ${bold('Khổ màng:')} K${khoMM}mm
    </td>
    <td ${td('vertical-align:middle;')} >
      ${bold('Quy cách:')} ${m.quyCachNote || '.'}${br}
      ${bold('Quy cách cuộn:')} ${isTui ? '' : (m.quyCachCuon || '.')}${br}
      ${bold('Chiều ra cuộn:')} ${isTui ? '' : (m.chieuRaCuonSP || '.')}
    </td>
  </tr>
  <tr>
    <td ${td()} >${bold('Số màu:')} ${vd(s.numColors)} màu</td>
    <td ${td()} >${bold('Số lượng ĐH:')} ${m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²')}</td>
  </tr>
</table>`;

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE 3 — BODY: MÁY IN + MÁY CHIA/GHÉP (2 cột: 48.4 / 51.6%)
  // ─────────────────────────────────────────────────────────────────────────

  // ── MÁY IN ──
  const mayIn = `
  <tr><td colspan="2" ${th('#fabf8f')} >MÁY IN</td></tr>
  <tr>
    <td ${td()} >${bold('Màng in:')} ${red(v(m.printFilmName) || v(s.layer1Name))}</td>
    <td ${td()} >${bold('Khổ:')} ${v(khoMM, 'mm')}</td>
  </tr>
  <tr>
    <td ${td('vertical-align:middle;')} >
      ${bold('Quy cách trục:')} ${m.cylDiameter ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : ''}${br}
      ${bold('MST:')} ${v(m.printMST)}
    </td>
    <td ${td()} >
      ${bold('Số trục:')} ${red(vd(m.numCylinders))}${br}
      ${bold('Chiều ra cuộn:')} ${red(v(m.rollOutWidth, 'mm'))}
    </td>
  </tr>
  <tr>
    <td colspan="2" ${td('line-height:1.7;')} >
      ${bold(hl('Thành phẩm in yêu cầu'))}:${br}
      Định mức phi hao: ${v(m.printWastePercent, ' M')}${br}
      Số lượng cấp vật tư: ${v(m.materialQtySupplied)}${br}${br}
      ${bold('Ghi chú:')}${br}${m.printNotes || 'Sử dụng mang'}${br}
      ${bold('Trục in:')} ${v(m.cylInfo)}
    </td>
  </tr>`;

  // ── MÁY CHIA (màng) ──
  const mayChiaMang = `
  <tr><td colspan="2" ${th('#fabf8f')} >MÁY CHIA</td></tr>
  <tr>
    <td ${td()} >${bold('Khổ màng:')} ${v(khoMM, 'mm')}</td>
    <td ${td()} >${bold('Khổ chia:')} ${vd(m.divideWidth, 'mm')}</td>
  </tr>
  <tr>
    <td ${td('vertical-align:middle;')} >
      ${bold('Chiều dài quấn cuộn:')} ${vd(m.rollLength, ' m')}${br}
      ${red('(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)')}
    </td>
    <td ${td('vertical-align:middle;')} >${bold('Chiều ra cuộn:')} ${vd(m.divideRollOutWidth, 'mm')}</td>
  </tr>
  <tr>
    <td colspan="2" ${td('line-height:1.7;min-height:120px;')} >
      Định mức phi hao: 0m${br}${br}
      ${bold('Khách hàng yêu cầu giao:')} ${v(m.divideDeliveryReq)}${br}${br}
      ${m.divideNotes || `Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn${br}
      Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.${br}
      Đánh dấu từng cặp MT-MS để khách hàng phân biệt.`}${br}${br}
      ${bold('** Lưu ý:')}
    </td>
  </tr>`;

  // ── MÁY GHÉP + CHIA + LÀM TÚI ──
  const bagNoteLines = [
    `- Định mức phi hao: ${vd(m.bagWasteMeters, ' M~')}`,
    m.useSemicircularMold ? '- Sử dụng khuôn đáy đứng bán nguyệt' : '',
    m.useDualCutter ? '- Sử dụng dao cắt 2 nhịp để cắt' : '',
  ].filter(Boolean).join(br);

  const mayTui = `
  <tr><td colspan="2" ${th('#fabf8f')} >MÁY GHÉP</td></tr>
  <tr>
    <td ${td()} >${bold('Màng ghép 1:')} ${v(m.laminateFilm1) || v(s.layer2Name)}</td>
    <td ${td()} >${bold('Khổ: K')}${vd(m.laminateFilm1Width, 'mm')}</td>
  </tr>
  <tr>
    <td ${td()} >${bold('Màng ghép 2:')} ${v(m.laminateFilm2)}</td>
    <td ${td()} >${bold('Khổ: K')}</td>
  </tr>
  <tr>
    <td colspan="2" ${td('line-height:1.7;')} >
      ${bold('Định mức phi hao')}${br}
      ${bold('Thành phẩm yêu cầu:')} ${vd(m.lamProductQty)} ${v(m.lamProductUnit)}${br}
      ${bold('Ghi chú:')} ${m.laminateNotes || ''}
    </td>
  </tr>
  <tr><td colspan="2" ${th('#fabf8f')} >MÁY CHIA</td></tr>
  <tr><td colspan="2" ${th('#fabf8f')} >MÁY LÀM TÚI</td></tr>
  <tr>
    <td ${td()} >${bold('Kiểu túi:')} ${v(s.bagType) || 'TÚI 4 BIÊN'}</td>
    <td ${td()} ></td>
  </tr>
  <tr>
    <td ${td()} >${bold('Chiều rộng:')} ${khoMM}mm</td>
    <td ${td()} >${bold('Chiều dài:')} ${dlMM}mm</td>
  </tr>
  <tr>
    <td ${td()} >${bold('Dán biên:')} ${v(m.sealEdge)}</td>
    <td ${td()} >${bold('Xếp đáy:')} ${v(m.foldBottom)}</td>
  </tr>
  <tr>
    <td ${td()} >${bold('Nhấn xé')} ${v(m.tearNotch)}</td>
    <td ${td()} ></td>
  </tr>
  <tr><td colspan="2" ${td('line-height:1.7;')} >${bagNoteLines}</td></tr>
  <tr>
    <td ${td('line-height:1.7;')} >${bold('Yêu cầu giao hàng:')}${br}${m.deliveryNotes || ''}</td>
    <td ${td('line-height:1.7;')} >${bold('Ghi chú:')} ${red(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')}</td>
  </tr>`;

  const t3 = `
<table style="border-collapse:collapse;width:100%;table-layout:fixed;${F};margin-top:-1px;">
  <colgroup><col style="width:48.4%"><col style="width:51.6%"></colgroup>
  ${mayIn}
  ${isTui ? mayTui : mayChiaMang}
  <tr>
    <td ${td('font-weight:bold;padding:10px 6px;height:40px;')} >Người lập:</td>
    <td ${td('font-weight:bold;padding:10px 6px;height:40px;')} >Người Duyệt:</td>
  </tr>
</table>`;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 10mm 9mm 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    body { margin: 0; }
  }
</style>
</head><body>
<div style="${F};font-size:${SZ[22]};">
  ${t1}
  <div style="margin-top:-1px;">${t2}</div>
  <div style="margin-top:-1px;">${t3}</div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ████  EXPORT PDF — pdfmake, layout 1:1 với DOCX  ████
//
// Dùng pdfmake để vẽ PDF vector trực tiếp từ data, không qua browser render.
// Font: Times (PDF built-in 14 standard fonts) — tương đương Times New Roman.
// Margin DOCX (twips→mm): top=1134→20mm, left=1134→20mm, right=851→15mm, bottom=851→15mm
// Column widths từ DXA (total page width 10173 DXA ≈ 175mm nội dung):
//   hdrT1: [38.5, 65.6, 33.8, 36.6] mm  (2185+3726+1918+2078 DXA)
//   hdrT2: [83.2, 92.6] mm              (4786+5326 DXA, total 10112)
//   body:  [85.2, 90.8] mm              (4928+5245 DXA, total 10173)
// ═══════════════════════════════════════════════════════════════════════════════

// Màu sắc
const CLR_ORANGE = '#fabf8f';
const CLR_GREEN  = '#c2d69b';
const CLR_YELLOW = '#ffff00';
const CLR_RED    = '#cc0000';
const CLR_BLACK  = '#000000';

// Tạo cell pdfmake
type CellDef = {
  text?: any; stack?: any[]; image?: string; fit?: [number, number];
  colSpan?: number; rowSpan?: number;
  fillColor?: string; color?: string; background?: string;
  bold?: boolean; italics?: boolean; fontSize?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  margin?: [number, number, number, number];
  border?: [boolean, boolean, boolean, boolean];
  borderColor?: [string, string, string, string];
  lineHeight?: number; noWrap?: boolean;
};
function mk(def: CellDef): any {
  return {
    ...def,
    border: [true, true, true, true] as [boolean, boolean, boolean, boolean],
    borderColor: [CLR_BLACK, CLR_BLACK, CLR_BLACK, CLR_BLACK] as [string, string, string, string],
    margin: def.margin ?? [3, 2, 3, 2],
  };
}
// Placeholder cho merged cells
const PH: any = { text: '', border: [false, false, false, false], margin: [0, 0, 0, 0] };

// Tạo inline text array (pdfmake "rich text")
type Span = { text: string; bold?: boolean; italics?: boolean; color?: string; background?: string; fontSize?: number };
function span(text: string, o: Omit<Span, 'text'> = {}): Span { return { text, ...o }; }
function bold(text: string, o: Omit<Span, 'text' | 'bold'> = {}): Span { return { text, bold: true, ...o }; }
function red(text: string): Span { return { text, color: CLR_RED }; }
function hl(text: string): Span { return { text, bold: true, background: CLR_YELLOW }; }

// Header row (màu cam hoặc xanh)
function hdrRow(text: string, colSpan: number, fillColor: string): any[] {
  const row: any[] = [mk({ text, bold: true, fontSize: 14, alignment: 'center', fillColor, colSpan })];
  for (let i = 1; i < colSpan; i++) row.push(PH);
  return row;
}


export async function exportLSXtoPDF(order: ProductionOrder): Promise<void> {
  console.log('[LSX] PDF pdfmake-vector:', order.id);
  const [pdfMod, robotoMod] = await Promise.all([
    withTimeout(import('pdfmake/build/pdfmake' as any), 10000, 'pdfmake'),
    withTimeout(import('pdfmake/build/fonts/Roboto.js' as any), 10000, 'pdfmake/Roboto'),
  ]);
  const pdfmake = (pdfMod as any).default ?? pdfMod;
  const RobotoFont: { vfs: Record<string, { data: string; encoding: string }>; fonts: Record<string, unknown> }
    = (robotoMod as any).default ?? robotoMod;
  const vfs = pdfmake.virtualfs as { existsSync(p:string):boolean; writeFileSync(p:string,d:string,e:string):void };
  for (const [filename, entry] of Object.entries(RobotoFont.vfs)) {
    if (!vfs.existsSync(filename)) vfs.writeFileSync(filename, entry.data, entry.encoding);
  }
  pdfmake.addFonts(RobotoFont.fonts);

  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const clean = (x:any) => (x === null || x === undefined || x === 0 ? '' : String(x));
  const withS = (x:any, suf='') => clean(x) ? clean(x) + suf : '';
  const dots = (x:any, suf='') => clean(x) ? clean(x) + suf : '...';
  const B = (t:string) => ({ text: t, bold: true });
  const T = (t:string) => ({ text: t });
  const c = (x:any, opt:any={}) => ({ ...opt, margin: opt.margin ?? [3, 2, 3, 2], fontSize: opt.fontSize ?? 10, border: [true,true,true,true] });
  const header = (text:string, span:number) => [c({ text, bold:true, alignment:'center', fontSize:14, colSpan:span }), ...Array(span-1).fill({})];

  const mangRows: any[][] = [
    header('MÁY IN', 2),
    [c({ text:[B('Màng in: '), T(m.printFilmName || s.layer1Name || '')] }), c({ text:[B('Khổ: '), T(khoMM ? `${khoMM}mm` : '')] })],
    [c({ text:[B('Quy cách trục: '), T(m.cylDiameter ? `D${m.cylDiameter} x CV${m.cylWidth} ` : ''), B('MST: '), T(m.printMST || '')] }), c({ text:[B('Số trục: '), T(clean(m.numCylinders)), B(' Chiều ra cuộn: '), T(withS(m.rollOutWidth,'mm'))] })],
    [c({ colSpan:2, stack:[
      { text:[B('Thành phầm in yêu cầu:'), T(' ' + withS(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : ''))] },
      { text:`Định mức phi hao: ${withS(m.printWastePercent,'m')}  Số lượng cấp vật tư: ${clean(m.materialQtySupplied)}` },
      { text:' ' },
      { text:[B('Ghi chú: '), T(m.printNotes || 'Sử dụng mang'), B(' Trục in : '), T(m.cylInfo || '')] },
    ], margin:[3,4,3,4] }), {}],
    header('MÁY CHIA', 2),
    [c({ text:[B('Khổ màng: '), T(khoMM ? `${khoMM}mm` : '')] }), c({ text:[B('Khổ chia:'), T(' ' + dots(m.divideWidth,'mm'))] })],
    [c({ text:[B('Chiều dài quấn cuộn: '), T(dots(m.rollLength,'m')), T(' (Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)')] }), c({ text:[B('Chiều ra cuộn: '), T(dots(m.divideRollOutWidth,'mm'))] })],
    [c({ colSpan:2, stack:[
      { text:'Định mức phi hao: 0m' }, { text:' ' },
      { text:[B('Khách hàng yêu cầu giao: '), T(m.divideDeliveryReq || '')] }, { text:' ' },
      { text:`Ghi chú: ${m.divideNotes || 'Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn'}` },
      { text:'Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều. Đánh dấu từng cặp MT-MS để khách hàng phân biệt.' },
      { text:' ' }, { text:'** Lưu ý:', bold:true, fontSize:11 },
    ], margin:[3,4,3,28] }), {}],
    [c({ text:[B('Người lập:'), T(' '+(m.preparedBy||''))], margin:[3,8,3,8] }), c({ text:[B('Người Duyệt:'), T(' '+(m.approvedBy||''))], margin:[3,8,3,8] })],
  ];

  const tuiRows: any[][] = [
    header('II. CÔNG VIỆC CẦN THỰC HIỆN',5),
    [c({text:'MÁY IN',bold:true,alignment:'center',fontSize:14,colSpan:2}),{},c({text:'MÁY GHÉP',bold:true,alignment:'center',fontSize:14,colSpan:3}),{},{}],
    [c({text:[B('Màng in: '),T(m.printFilmName||s.layer1Name||'')]}),c({text:[B('Khổ: '),T(khoMM?`${khoMM}mm`:'')]}),c({text:[B('Màng ghép 1: '),T(m.laminateFilm1||s.layer2Name||'')],colSpan:2}),{},c({text:[B('Khổ: '),T(dots(m.laminateFilm1Width||khoMM,'mm'))]})],
    [c({text:[B('Trục in: '),T(m.cylDiameter?`D${m.cylDiameter} x CV${m.cylWidth}`:''),'\n',B('Mã Số Trục: '),T(m.printMST||'tự điền')]}),c({text:'Số trục: = số màu'}),c({text:[B('Màng ghép 2: '),T(m.laminateFilm2||s.layer3Name||'')],colSpan:2}),{},c({text:[B('Khổ: '),T(khoMM?`${khoMM}mm`:'')]})],
    [c({colSpan:2,stack:[{text:`Định mức phi hao: ${withS(m.printWastePercent,'m')}`},{text:`Thành phẩm yêu cầu: ${withS(m.printProductQty,'m')} Ghi chú: ${m.printNotes||'tự điền'}`},{text:`- Màu sắc: duyệt màu theo ${m.maMucNhu||'tự điền'}`},{text:`- Chiều xả: ${m.printDirection||'tự điền'}`}]}),{},c({colSpan:3,stack:[{text:`Định mức phi hao: L1: ${withS(m.lamWaste,'m')}, L2: ${withS(m.lamBTP,'m')}`},{text:`Thành phẩm yêu cầu: ${withS(m.lamProductQty,'m')}`},{text:`Ghi chú: ${m.laminateNotes||'tự điền'}`}]}),{},{}],
    [c({text:'MÁY CHIA',bold:true,alignment:'center',fontSize:14,colSpan:2}),{},c({text:'MÁY LÀM TÚI',bold:true,alignment:'center',fontSize:14,colSpan:3}),{},{}],
    [c({text:'',colSpan:2,rowSpan:4}),{},c({text:[B('Kiểu túi: '),T(s.bagType||'zipper 3 biên')],colSpan:3,alignment:'center'}),{},{}],
    [{},{},c({text:[B('Chiều rộng: '),T(khoMM?`${khoMM}mm`:'')]}),c({text:[B('Chiều dài: '),T(dlMM?`${dlMM}mm`:'')],colSpan:2}),{}],
    [{},{},c({text:[B('Hàn biên: '),T(withS(m.hanBien,'mm')||'mặc định 10mm(có thể sửa)')]}),c({text:[B('Xếp đáy: '),T(m.foldBottom||'')],colSpan:2}),{}],
    [{},{},c({text:[B('Nhấn xé “v”: '),T(m.tearNotch||'')],colSpan:3}),{},{}],
    [c({colSpan:2,rowSpan:4,stack:[{text:'(Khúc này là của máy túi)'},{text:[B('Ghi chú: '),T(m.divideNotes||'tự điền')]},{text:[B('Yêu cầu giao hàng: '),T(m.divideDeliveryReq||'')]},{text:'Người lập + người duyệt'}]}),{},c({text:[B('Hàn đầu:'),T(withS(m.hanDau,'mm')||'tự điền')],colSpan:3}),{},{}],
    [{},{},c({text:'Sử dụng dao cắt 2 nhịp để cắt\nSử dụng khuôn đáy đứng bán nguyệt',colSpan:3}),{},{}],
    [{},{},c({text:[B('DMPH: '),T(dots(m.bagWasteMeters,'m')),T(' \n'),B('Ghi chú: '),T(m.bagLuuY||'tự điền')],colSpan:3}),{},{}],
    [{},{},c({text:[B('Ghi chú: '),T(m.bagMachineNotes||'chạy theo mẫu đã sản xuất')],colSpan:3}),{},{}],
    [c({text:[B('Người lập: '),T(m.preparedBy||'Ghi sẵn tên')],colSpan:2,margin:[3,8,3,8]}),{},c({text:[B('Người duyệt: '),T(m.approvedBy||'Ghi sẵn tên')],colSpan:3,margin:[3,8,3,8]}),{},{}],
  ];

  const docDef: any = {
    pageSize:'A4', pageOrientation:'portrait', pageMargins:[56.7,56.7,42.5,42.5],
    defaultStyle:{ font:'Roboto', fontSize:10, lineHeight:1.15 },
    content:[{ table: isTui ? { widths:[144,104,118,28,102], body:tuiRows, heights:[20,20,22,22,74,18,28,22,22,26,28,28,32,42,42] } : { widths:[240,256], body:mangRows, heights:[20,17,28,75,22,22,32,150,28] },
      layout:{ hLineWidth:()=>0.6, vLineWidth:()=>0.6, hLineColor:()=> '#000', vLineColor:()=> '#000', paddingLeft:()=>3, paddingRight:()=>3, paddingTop:()=>2, paddingBottom:()=>2 }
    }]
  };
  pdfmake.createPdf(docDef).download(`LSX_${safeFn(m.lsxNumber || order.id)}_${safeFn(s.customer)}.pdf`);
}

function esc(x: unknown): string {
  return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
function nz(x: unknown, suffix = ''): string { return x === null || x === undefined || x === '' || x === 0 ? '' : esc(x) + suffix; }
function dots(x: unknown, suffix = ''): string { return x === null || x === undefined || x === '' || x === 0 ? '...' : esc(x) + suffix; }
function nfmt(x: number): string { return x > 0 ? x.toLocaleString('vi-VN') : '...'; }

function buildPrintExactHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const title = `LSX_${safeFn(m.lsxNumber || order.id)}_${safeFn(s.customer)}.pdf`;

  const mangBody = `
<table class="lsx mang">
  <colgroup><col style="width:48.44%"><col style="width:51.56%"></colgroup>
  <tr><td class="sec" colspan="2">MÁY IN</td></tr>
  <tr class="h199"><td><b>Màng in:</b> ${nz(m.printFilmName || s.layer1Name)}</td><td><b>Khổ:</b> ${khoMM ? khoMM + 'mm' : ''}</td></tr>
  <tr class="h376"><td><b>Quy cách trục:</b> ${m.cylDiameter ? `D${esc(m.cylDiameter)} x CV${esc(m.cylWidth)}` : ''} <b>MST:</b> ${nz(m.printMST)}</td><td><b>Số trục:</b> ${nz(m.numCylinders)} <b>Chiều ra cuộn:</b> ${nz(m.rollOutWidth, 'mm')}</td></tr>
  <tr class="h1497"><td colspan="2"><p><b>Thành phầm in yêu cầu:</b> ${nz(m.printProductQty, m.printProductUnit ? ' '+m.printProductUnit : '')}</p><p>Định mức phi hao: ${nz(m.printWastePercent, 'm')} Số lượng cấp vật tư: ${nz(m.materialQtySupplied)}</p><p><b>Ghi chú:</b> ${esc(m.printNotes || 'Sử dụng mang')}<b>Trục in :</b> ${nz(m.cylInfo)}</p></td></tr>
  <tr class="h310"><td class="sec" colspan="2">MÁY CHIA</td></tr>
  <tr class="h351"><td><b>Khổ màng:</b> ${khoMM ? khoMM + 'mm' : ''}</td><td><b>Khổ chia:</b> ${dots(m.divideWidth, 'mm')}</td></tr>
  <tr class="h431"><td><b>Chiều dài quấn cuộn:</b> ${dots(m.rollLength, 'm')} <span>(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)</span></td><td><b>Chiều ra cuộn:</b> ${dots(m.divideRollOutWidth, 'mm')}</td></tr>
  <tr class="h3067"><td colspan="2"><p>Định mức phi hao: 0m</p><p><b>Khách hàng yêu cầu giao:</b> ${nz(m.divideDeliveryReq)}</p><p>Ghi chú: ${esc(m.divideNotes || 'Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộnCân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều. Đánh dấu từng cặp MT-MS để khách hàng phân biệt.')}</p><p><b>** Lưu ý:</b></p></td></tr>
  <tr class="h527"><td><b>Người lập:</b> ${nz(m.preparedBy)}</td><td><b>Người Duyệt:</b> ${nz(m.approvedBy)}</td></tr>
</table>`;

  const tuiBody = `
<table class="lsx tui">
  <colgroup><col style="width:29.03%"><col style="width:20.97%"><col style="width:23.77%"><col style="width:5.59%"><col style="width:20.64%"></colgroup>
  <tr class="h402"><td class="sec" colspan="5">II. CÔNG VIỆC CẦN THỰC HIỆN</td></tr>
  <tr><td class="sec" colspan="2">MÁY IN</td><td class="sec" colspan="3">MÁY GHÉP</td></tr>
  <tr class="h419"><td><b>Màng in:</b> ${nz(m.printFilmName || s.layer1Name)}</td><td><b>Khổ:</b> ${khoMM ? khoMM + 'mm' : ''}</td><td colspan="2"><b>Màng ghép 1:</b> ${nz(m.laminateFilm1 || s.layer2Name)}</td><td><b>Khổ:</b> ${dots(m.laminateFilm1Width || khoMM, 'mm')}</td></tr>
  <tr class="h376"><td><b>Trục in:</b> ${m.cylDiameter ? `D${esc(m.cylDiameter)} x CV${esc(m.cylWidth)}` : ''}<br><b>Mã Số Trục:</b> ${nz(m.printMST) || 'tự điền'}</td><td><b>Số trục:</b> = số màu</td><td colspan="2"><b>Màng ghép 2:</b> ${nz(m.laminateFilm2 || s.layer3Name)}</td><td><b>Khổ:</b> ${khoMM ? khoMM + 'mm' : ''}</td></tr>
  <tr class="h1451"><td colspan="2">Định mức phi hao: ${nz(m.printWastePercent, 'm')}<br>Thành phẩm yêu cầu: ${nz(m.printProductQty, 'm')}<b>Ghi chú:</b> ${esc(m.printNotes || 'tự điền')}<br>- <br>- Màu sắc: duyệt màu theo ${nz(m.maMucNhu) || 'tự điền'}<br>- Chiều xả: ${nz(m.printDirection) || 'tự điền'}</td><td colspan="3">Định mức phi hao: L1: ${nz(m.lamWaste, 'm')}, L2: ${nz(m.lamBTP, 'm')}<br>Thành phẩm yêu cầu: ${nz(m.lamProductQty, 'm')}<br> Ghi chú: ${esc(m.laminateNotes || 'tự điền')}</td></tr>
  <tr class="h301"><td class="sec" colspan="2">MÁY CHIA</td><td class="sec" colspan="3">MÁY LÀM TÚI</td></tr>
  <tr class="h585"><td colspan="2" rowspan="4"></td><td colspan="3"><b>Kiểu túi:</b> ${esc(s.bagType || 'zipper 3 biên')}</td></tr>
  <tr class="h435"><td><b>Chiều rộng:</b> ${khoMM ? khoMM + 'mm' : ''}</td><td colspan="2"><b>Chiều dài:</b> ${dlMM ? dlMM + 'mm' : ''}</td></tr>
  <tr class="h467"><td><b>Hàn biên:</b> ${nz(m.hanBien, 'mm') || 'mặc định 10mm(có thể sửa)'}</td><td colspan="2"><b>Xếp đáy:</b> ${nz(m.foldBottom)}</td></tr>
  <tr class="h603"><td colspan="3"><b>Nhấn xé “v”:</b> ${nz(m.tearNotch)}</td></tr>
  <tr class="h557"><td colspan="2" rowspan="4">(Khúc này là của máy túi)<br><b>Ghi chú:</b> ${esc(m.divideNotes || 'tự điền')}<br><b>Yêu cầu giao hàng:</b> ${esc(m.divideDeliveryReq || '')}<br>Người lập + người duyệt</td><td colspan="3"><b>Hàn đầu:</b>${nz(m.hanDau, 'mm') || 'tự điền'}</td></tr>
  <tr class="h557"><td colspan="3">${m.useDualCutter ? 'Sử dụng dao cắt 2 nhịp để cắt ' : 'Sử dụng dao cắt 2 nhịp để cắt '}<br>${m.useSemicircularMold ? 'Sử dụng khuôn đáy đứng bán nguyệt' : 'Sử dụng khuôn đáy đứng bán nguyệt'}</td></tr>
  <tr class="h659"><td colspan="3"><b>DMPH:</b> ${dots(m.bagWasteMeters, 'm')} <br><b>Ghi chú:</b> ${esc(m.bagLuuY || 'tự điền')}</td></tr>
  <tr class="h886"><td colspan="3"><b>Ghi chú:</b> ${esc(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')}</td></tr>
  <tr class="h918"><td colspan="2"><b>Người lập:</b> ${esc(m.preparedBy || 'Ghi sẵn tên')}</td><td colspan="3"><b>Người duyệt:</b> ${esc(m.approvedBy || 'Ghi sẵn tên')}</td></tr>
</table>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page{size:A4 portrait;margin:20mm 15mm 15mm 20mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:"Times New Roman",Times,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{width:100%}.lsx{width:100%;border-collapse:collapse;table-layout:fixed;font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.08}.lsx td{border:1px solid #000;padding:2px 5px;vertical-align:top}.sec{text-align:center;font-weight:bold;font-size:16pt}.mang .h199{height:3.5mm}.mang .h376{height:6.6mm}.mang .h1497{height:26.4mm}.mang .h310{height:5.5mm}.mang .h351{height:6.2mm}.mang .h431{height:7.6mm}.mang .h3067{height:54.1mm}.mang .h527{height:9.3mm}.tui{font-size:11pt;line-height:1.05}.tui .sec{font-size:16pt}.tui .h402{height:7.1mm}.tui .h419{height:7.4mm}.tui .h376{height:6.6mm}.tui .h1451{height:25.6mm}.tui .h301{height:5.3mm}.tui .h585{height:10.3mm}.tui .h435{height:7.7mm}.tui .h467{height:8.2mm}.tui .h603{height:10.6mm}.tui .h557{height:9.8mm}.tui .h659{height:11.6mm}.tui .h886{height:15.6mm}.tui .h918{height:16.2mm}p{margin:0 0 6px 0}@media print{body{margin:0}.no-print{display:none}}
</style></head><body><div class="wrap">${isTui ? tuiBody : mangBody}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
}
