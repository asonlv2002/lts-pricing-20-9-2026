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
  console.log('[LSX] PDF (pdfmake):', order.id);

  // Load pdfmake + Roboto font data + logo song song.
  // pdfmake v0.3 browser build cần TTF nhúng vào VirtualFileSystem.
  // Roboto.js export { vfs: { 'Roboto-Regular.ttf': {data,encoding}, ... }, fonts: {...} }
  // Import tường minh tới file .js để Turbopack không nhầm folder Roboto/
  const [pdfMod, robotoMod, logoDataUrl] = await Promise.all([
    withTimeout(import('pdfmake/build/pdfmake' as any), 15000, 'pdfmake'),
    withTimeout(import('pdfmake/build/fonts/Roboto.js' as any), 10000, 'pdfmake/Roboto'),
    loadLogoDataUrl(),
  ]);

  const pdfmake = (pdfMod as any).default ?? pdfMod;
  const RobotoFont: { vfs: Record<string, { data: string; encoding: string }>; fonts: Record<string, unknown> }
    = (robotoMod as any).default ?? robotoMod;

  // Nạp TTF vào VirtualFileSystem
  const vfs = pdfmake.virtualfs as {
    existsSync(p: string): boolean;
    writeFileSync(p: string, data: string, enc: string): void;
  };
  for (const [filename, entry] of Object.entries(RobotoFont.vfs)) {
    if (!vfs.existsSync(filename)) {
      vfs.writeFileSync(filename, entry.data, entry.encoding);
    }
  }
  pdfmake.addFonts(RobotoFont.fonts);

  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const khoMM = Math.round(s.spreadWidth * 1000);
  const dlMM  = Math.round(s.cutStep * 1000);

  // ── Đơn vị: pdfmake dùng PDF points (1pt = 0.353mm, 1mm = 2.835pt) ──────────
  // A4 = 595.28pt wide. Lề trái 20mm=56.7pt, phải 15mm=42.5pt → nội dung = 496pt
  // Tỷ lệ DXA → pt: tổng nội dung DOCX (hdrT1) = 9907 DXA → 496pt
  // scale = 496 / 9907 = 0.05006 pt/dxa
  const CONTENT_W = 496;   // pt — chiều rộng nội dung
  const mm = (x: number) => Math.round(x * 2.835 * 10) / 10;  // mm → pt

  const FS  = 10;   // body text (DOCX sz22 = 11pt)
  const FSS = 11;   // sz24 — label ISO
  const FSL = 13;   // sz28 — tên công ty
  const FSH = 16;   // sz32 — header section (MÁY IN, MÁY GHÉP...)

  // Column widths theo DXA gốc, scale → pt (tổng = CONTENT_W)
  // hdrT1: 2185+3726+1918+2078 = 9907 DXA → 496pt
  const s1 = CONTENT_W / 9907;
  const W1 = [2185, 3726, 1918, 2078].map(d => Math.round(d * s1 * 10) / 10);

  // hdrT2: 4786+5326 = 10112 DXA → 496pt (slightly wider, scale separately)
  const s2 = CONTENT_W / 10112;
  const W2 = [4786, 5326].map(d => Math.round(d * s2 * 10) / 10);

  // body:  4928+5245 = 10173 DXA → 496pt
  const s3 = CONTENT_W / 10173;
  const W3 = [4928, 5245].map(d => Math.round(d * s3 * 10) / 10);

  // Logo fit: W1[0] ≈ 109pt — logo chiếm ~85pt để có padding
  const logoFit: [number, number] = [85, 85];
  const logoCell: any = logoDataUrl
    ? mk({ image: 'logo', fit: logoFit, rowSpan: 5, alignment: 'center', margin: [4, 6, 4, 6] })
    : mk({ text: 'LTS', bold: true, fontSize: FSL, rowSpan: 5, alignment: 'center' });

  const t1Rows: any[][] = [
    [
      logoCell,
      mk({ text: 'Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An', fontSize: FSL, alignment: 'center', rowSpan: 3, margin: [3, 6, 3, 6] }),
      mk({ text: 'Ký mã hiệu', italics: true, fontSize: FSS }),
      mk({ text: 'QT.ISO-22-BM02', fontSize: FSS, alignment: 'center' }),
    ],
    [PH, PH, mk({ text: 'Lần ban hành', italics: true, fontSize: FSS }), mk({ text: '02', fontSize: FSS, alignment: 'center' })],
    [PH, PH, mk({ text: 'Ngày ban hành', italics: true, fontSize: FSS }), mk({ text: '01/03/2025', fontSize: FSS, alignment: 'center' })],
    [
      PH,
      mk({ text: 'LỆNH SẢN XUẤT', bold: true, fontSize: FSH, alignment: 'center', rowSpan: 2, margin: [3, 8, 3, 8] }),
      mk({ text: 'Số lệnh SX:', italics: true, fontSize: FSS }),
      mk({ text: m.lsxNumber || order.id, fontSize: FSS, alignment: 'center' }),
    ],
    [PH, PH, mk({ text: 'Ngày xuống LSX:', italics: true, fontSize: FSS }), mk({ text: m.issuedDate || '…/…./20…', fontSize: FSS, alignment: 'center' })],
  ];

  // ── TABLE 2: THÔNG TIN SẢN PHẨM ──────────────────────────────────────────

  const t2Rows: any[][] = [
    [mk({ text: 'I . THÔNG TIN SẢN PHẨM', bold: true, fontSize: FSH, alignment: 'center', fillColor: CLR_GREEN, colSpan: 2 }), PH],
    [mk({ text: [bold('Khách hàng:'), span('  '), bold(s.customer || 'CÔNG TY ………..') ], colSpan: 2 }), PH],
    [
      mk({ text: [bold('MSP:'), span('  '), span(m.msp || 'TP_0……..MA')] }),
      mk({ text: [bold('Tên SP:'), span('  '), bold(m.tenSP || s.productName || 'MÀNG IN …….')] }),
    ],
    [
      mk({ stack: [
        { text: [bold('Cấu trúc:'), span(' '), span(v(s.structure))] },
        { text: [bold('Khổ màng:'), span(` K${khoMM}mm`)] },
      ], lineHeight: 1.5 }),
      mk({ stack: [
        { text: [bold('Quy cách:'), span(' '), span(m.quyCachNote || '.')] },
        { text: [bold('Quy cách cuộn:'), span(' '), span(isTui ? '' : (m.quyCachCuon || '.'))] },
        { text: [bold('Chiều ra cuộn:'), span(' '), span(isTui ? '' : (m.chieuRaCuonSP || '.'))] },
      ], lineHeight: 1.5 }),
    ],
    [
      mk({ text: [bold('Số màu:'), span(' '), span(vd(s.numColors) + ' màu')] }),
      mk({ text: [bold('Số lượng ĐH:'), span(' '), span(m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²'))] }),
    ],
  ];

  // ── TABLE 3: BODY ─────────────────────────────────────────────────────────
  // MANG: MAY IN (full) → MAY CHIA (full)
  // TUI:  [MAY IN | MAY GHEP] side-by-side → MAY LAM TUI
  const bodyRows: any[][] = [];

  // Helper: stack ô "Thành phẩm in yêu cầu"
  const mayInStack = [
    { text: [hl('Thành phẩm in yêu cầu'), bold(':')], lineHeight: 1.5 },
    { text: [span('Định mức phi hao: '), span(v(m.printWastePercent, ' M'))], lineHeight: 1.4 },
    { text: [span('Số lượng cấp vật tư: '), span(v(m.materialQtySupplied))], lineHeight: 1.4 },
    { text: ' ' },
    { text: [bold('Ghi chú:\n'), span(m.printNotes || 'Sử dụng mang')], lineHeight: 1.4 },
    { text: [bold('Trục in: '), span(v(m.cylInfo))], lineHeight: 1.4 },
  ];

  if (!isTui) {
    // ── MÁY IN full-width ──
    bodyRows.push(hdrRow('MÁY IN', 2, CLR_ORANGE));
    bodyRows.push([
      mk({ text: [bold('Màng in: '), red(v(m.printFilmName) || v(s.layer1Name))] }),
      mk({ text: [bold('Khổ: '), span(v(khoMM, 'mm'))] }),
    ]);
    bodyRows.push([
      mk({ stack: [
        { text: [bold('Quy cách trục: '), span(m.cylDiameter ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : '')] },
        { text: [bold('MST: '), span(v(m.printMST))] },
      ], lineHeight: 1.4 }),
      mk({ stack: [
        { text: [bold('Số trục: '), red(vd(m.numCylinders))] },
        { text: [bold('Chiều ra cuộn: '), red(v(m.rollOutWidth, 'mm'))] },
      ], lineHeight: 1.4 }),
    ]);
    bodyRows.push([mk({ colSpan: 2, stack: mayInStack, margin: [3, 4, 3, 4] }), PH]);

    // ── MÁY CHIA full-width ──
    bodyRows.push(hdrRow('MÁY CHIA', 2, CLR_ORANGE));
    bodyRows.push([
      mk({ text: [bold('Khổ màng: '), span(v(khoMM, 'mm'))] }),
      mk({ text: [bold('Khổ chia: '), span(vd(m.divideWidth, 'mm'))] }),
    ]);
    bodyRows.push([
      mk({ stack: [
        { text: [bold('Chiều dài quấn cuộn: '), span(vd(m.rollLength, ' m'))] },
        { text: '(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)', color: CLR_RED, fontSize: FS - 1 },
      ], lineHeight: 1.4 }),
      mk({ text: [bold('Chiều ra cuộn: '), span(vd(m.divideRollOutWidth, 'mm'))] }),
    ]);
    bodyRows.push([
      mk({
        colSpan: 2,
        stack: [
          { text: 'Định mức phi hao: 0m', lineHeight: 1.4 },
          { text: ' ' },
          { text: [bold('Khách hàng yêu cầu giao: '), span(v(m.divideDeliveryReq))], lineHeight: 1.4 },
          { text: ' ' },
          { text: m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn', lineHeight: 1.4 },
          { text: 'Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.', lineHeight: 1.4 },
          { text: 'Đánh dấu từng cặp MT-MS để khách hàng phân biệt.', lineHeight: 1.4 },
          { text: ' ' },
          { text: [bold('** Lưu ý:')], lineHeight: 1.4 },
        ],
        margin: [3, 4, 3, 30],
      }), PH,
    ]);

  } else {
    // ── [MÁY IN | MÁY GHÉP] — side-by-side header row ──
    bodyRows.push([
      mk({ text: 'MÁY IN', bold: true, fontSize: FSH, alignment: 'center', fillColor: CLR_ORANGE }),
      mk({ text: 'MÁY GHÉP', bold: true, fontSize: FSH, alignment: 'center', fillColor: CLR_ORANGE }),
    ]);
    // Màng in | Màng ghép
    bodyRows.push([
      mk({ text: [bold('Màng in: '), red(v(m.printFilmName) || v(s.layer1Name))] }),
      mk({ text: [bold('Màng ghép 1: '), span(v(m.laminateFilm1) || v(s.layer2Name))] }),
    ]);
    // Khổ in | Khổ ghép
    bodyRows.push([
      mk({ text: [bold('Khổ: '), span(v(khoMM, 'mm'))] }),
      mk({ text: [bold('Khổ: K'), span(vd(m.laminateFilm1Width, 'mm'))] }),
    ]);
    // Trục | ĐM + TP ghép
    bodyRows.push([
      mk({ stack: [
        { text: [bold('Quy cách trục: '), span(m.cylDiameter ? `D:${v(m.cylDiameter)} x ${v(m.cylWidth)}mm` : '')] },
        { text: [bold('MST: '), span(v(m.printMST))] },
      ], lineHeight: 1.4 }),
      mk({ stack: [
        { text: bold('Định mức phi hao:'), lineHeight: 1.4 },
        { text: [bold('Thành phẩm ghép: '), span(`${vd(m.lamProductQty)} ${v(m.lamProductUnit)}`)], lineHeight: 1.4 },
      ], lineHeight: 1.4 }),
    ]);
    // Số trục + Chiều ra | Ghi chú ghép
    bodyRows.push([
      mk({ stack: [
        { text: [bold('Số trục: '), red(vd(m.numCylinders))] },
        { text: [bold('Chiều ra cuộn: '), red(v(m.rollOutWidth, 'mm'))] },
      ], lineHeight: 1.4 }),
      mk({ text: [bold('Ghi chú: '), span(m.laminateNotes || '')] }),
    ]);
    // Thành phẩm in yêu cầu (trái) | trống phải
    bodyRows.push([
      mk({ stack: mayInStack, margin: [3, 4, 3, 4] }),
      mk({ text: '' }),
    ]);

    // ── MÁY LÀM TÚI full-width ──
    bodyRows.push(hdrRow('MÁY LÀM TÚI', 2, CLR_ORANGE));
    bodyRows.push([
      mk({ text: [bold('Kiểu túi: '), span(v(s.bagType) || 'TÚI 4 BIÊN')] }),
      mk({ text: '' }),
    ]);
    bodyRows.push([
      mk({ text: [bold('Chiều rộng: '), span(`${khoMM}mm`)] }),
      mk({ text: [bold('Chiều dài: '), span(`${dlMM}mm`)] }),
    ]);
    bodyRows.push([
      mk({ text: [bold('Dán biên: '), span(v(m.sealEdge))] }),
      mk({ text: [bold('Xếp đáy: '), span(v(m.foldBottom))] }),
    ]);
    bodyRows.push([
      mk({ text: [bold('Nhấn xé '), span(v(m.tearNotch))] }),
      mk({ text: '' }),
    ]);
    const bagNoteStack: any[] = [
      { text: `- Định mức phi hao: ${vd(m.bagWasteMeters, ' M~')}`, lineHeight: 1.4 },
    ];
    if (m.useSemicircularMold) bagNoteStack.push({ text: '- Sử dụng khuôn đáy đứng bán nguyệt', lineHeight: 1.4 });
    if (m.useDualCutter) bagNoteStack.push({ text: '- Sử dụng dao cắt 2 nhịp để cắt', lineHeight: 1.4 });
    bodyRows.push([mk({ colSpan: 2, stack: bagNoteStack, margin: [3, 3, 3, 3] }), PH]);
    bodyRows.push([
      mk({ stack: [
        { text: bold('Yêu cầu giao hàng:'), lineHeight: 1.4 },
        { text: m.deliveryNotes || '', lineHeight: 1.4 },
      ], margin: [3, 3, 3, 3] }),
      mk({ text: [bold('Ghi chú: '), red(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')], lineHeight: 1.4 }),
    ]);
  }

  // FOOTER
  bodyRows.push([
    mk({ text: bold('Người lập:'), margin: [3, 8, 3, 8] }),
    mk({ text: bold('Người Duyệt:'), margin: [3, 8, 3, 8] }),
  ]);

  // ── Build document definition ─────────────────────────────────────────────
  const docDef: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [mm(20), mm(10), mm(15), mm(10)], // left top right bottom → pt
    defaultStyle: { font: 'Roboto', fontSize: FS, lineHeight: 1.2 },
    content: [
      {
        table: { widths: W1, body: t1Rows },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => CLR_BLACK, vLineColor: () => CLR_BLACK,
        },
      },
      { text: '', margin: [0, -0.5, 0, 0] },
      {
        table: { widths: W2, body: t2Rows },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => CLR_BLACK, vLineColor: () => CLR_BLACK,
        },
      },
      { text: '', margin: [0, -0.5, 0, 0] },
      {
        table: { widths: W3, body: bodyRows },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => CLR_BLACK, vLineColor: () => CLR_BLACK,
        },
      },
    ],
    images: logoDataUrl ? { logo: logoDataUrl } : {},
  };

  pdfmake.createPdf(docDef).download(
    `LSX_${safeFn(m.lsxNumber || order.id)}_${safeFn(s.customer)}.pdf`,
  );
  console.log('[LSX] PDF done');
}

