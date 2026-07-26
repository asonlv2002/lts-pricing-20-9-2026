// src/lib/lsxHtml.ts
// ─────────────────────────────────────────────────────────────────────────────
// HTML preview LSX — layout bám OOXML / lsxExport DOCX
// (header ISO 4-col, SP 2-col, body túi 5-col layout A/B, màng 2-col).
// Layout A: tui + chia (nhiều lớp) → IN|GHÉP / CHIA|TÚI (trái chỉ chia)
// Layout B: tui không chia (hoặc 1 lớp đã IN|CHIA) → IN|GHÉP / TÚI full 5c
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductionOrder, LSXManualFields } from './types';
import {
  orderHasDivide,
  resolveLsxBagTypeInfo,
  resolveLsxDocxTemplate,
  resolveLsxLaminateRows,
  formatLsxLamWasteText,
  formatLsxCylText,
  formatLsxNumCylinders,
  formatLsxPrintWasteLine,
  formatLsxPrintProductLine,
  formatLsxLamProductLine,
  formatLsxLamSupplyLine,
  type LsxDocxTemplateKey,
} from './lsxExport';


function v(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  return String(val) + suffix;
}
function vd(val: string | number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined || val === '' || val === 0) return '…';
  return String(val) + suffix;
}
function qty(n: number): string {
  return n > 0 ? n.toLocaleString('vi-VN') : '…';
}
function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function isSingleLayer(s: ProductionOrder['snapshot'], m: LSXManualFields): boolean {
  if (m.laminateLayers && m.laminateLayers.length > 0) return false;
  return !s.layer2Name && !s.layer3Name && !s.layer4Name && !s.layer5Name
    && !m.laminateFilm1 && !m.laminateFilm2;
}

/** Canonical 5-col bag body (DXA ~2943+2126+2410+567+2092 ≈ 10138) */
const COLS5 = `
  <colgroup>
    <col style="width:29%" /><col style="width:21%" />
    <col style="width:24%" /><col style="width:5.5%" /><col style="width:20.5%" />
  </colgroup>`;

const CSS = `
  .lsx-html-page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,.15);
    margin: 0 auto;
    padding: 20mm 15mm 15mm 20mm;
    box-sizing: border-box;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #000;
    line-height: 1.35;
  }
  .lsx-html-page table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 4px;
  }
  .lsx-html-page td {
    border: 1px solid #000;
    padding: 3px 5px;
    vertical-align: top;
    font-size: 11pt;
    word-wrap: break-word;
  }
  .lsx-html-page .sec-green {
    background: #c2d69b;
    text-align: center;
    font-weight: 700;
    font-size: 16pt;
    padding: 5px;
    vertical-align: middle;
  }
  .lsx-html-page .sec-orange {
    background: #fabf8f;
    text-align: center;
    font-weight: 700;
    font-size: 16pt;
    padding: 4px;
    vertical-align: middle;
  }
  .lsx-html-page .b { font-weight: 700; }
  .lsx-html-page .ac { text-align: center; }
  .lsx-html-page .vm { vertical-align: middle; }
  .lsx-html-page .red { color: #ff0000; }
  .lsx-html-page .red-note { color: #cc0000; font-size: 9pt; }
  .lsx-html-page .iso-logo {
    width: 20.5%;
    text-align: center;
    vertical-align: middle;
  }
  .lsx-html-page .iso-logo img {
    display: block;
    margin: 0 auto;
    max-width: 88px;
    max-height: 70px;
    object-fit: contain;
  }
  .lsx-html-page .iso-co { width: 40.2%; text-align: center; vertical-align: middle; font-size: 11pt; }
  .lsx-html-page .iso-lbl { width: 17.7%; font-style: italic; vertical-align: middle; font-size: 10pt; }
  .lsx-html-page .iso-val { width: 21.6%; text-align: center; vertical-align: middle; font-size: 10pt; }
  .lsx-html-page .footer-cell { text-align: center; padding: 12px 4px; vertical-align: top; }
  .lsx-html-page .page-num {
    text-align: center;
    font-size: 10pt;
    color: #444;
    margin-top: 8px;
    border-top: 1px solid #333;
    padding-top: 4px;
  }
`;

type BagRow =
  | { kind: 'pair'; left: string; right: string }
  | { kind: 'full'; text: string };

/** Bag-machine field rows per template — mirrors reference document.xml */
function bagFieldSpecs(templateKey: LsxDocxTemplateKey, m: LSXManualFields, hasZipper = false): BagRow[] {
  const rows: BagRow[] = [];
  switch (templateKey) {
    case 'tui-3-bien':
      rows.push({
        kind: 'pair',
        left: `<span class="b">Dán biên: </span>${esc(v(m.sealEdge) || v(m.hanBien, 'mm') || '7mm')}`,
        right: `<span class="b">Hàn đầu: </span>${esc(v(m.hanDau, 'mm') || '30mm')}`,
      });
      rows.push({ kind: 'full', text: `<span class="b">Đục lỗ: </span>${esc(v(m.holePunchInfo) || '…')}` });
      if (hasZipper || m.tearNotch) {
        rows.push({ kind: 'full', text: `<span class="b">Nhấn xé "v": </span>${esc(v(m.tearNotch))}` });
      }
      {
        const extras: string[] = [];
        if (m.useDualCutter) extras.push('Sử dụng dao cắt 2 nhịp để cắt');
        if (m.useSemicircularMold) extras.push('Sử dụng khuôn đáy đứng bán nguyệt');
        if (extras.length) rows.push({ kind: 'full', text: `<span class="b">${esc(extras.join(' '))}</span>` });
      }
      break;
    case 'tui-4-bien':
      rows.push({
        kind: 'pair',
        left: `<span class="b">Hàn biên: </span>${esc(v(m.hanBien, 'mm') || '10mm')}`,
        right: `<span class="b">Hàn đầu: </span>${esc(v(m.hanDau, 'mm') || '50mm')}`,
      });
      rows.push({ kind: 'full', text: `<span class="b">Xếp hông: </span>${esc(v(m.xepHong, 'mm') || '…')}` });
      rows.push({ kind: 'full', text: esc(v(m.holePunchInfo) || 'Đục 3 lỗ tròn quai xách (Theo Market)') });
      rows.push({ kind: 'full', text: `<span class="b">Đục lỗ thông hơi: </span>${esc(v(m.ventHoleInfo) || '…')}` });
      break;
    case 'tui-dan-lung-giua':
      rows.push({ kind: 'full', text: `<span class="b">Hàn đầu: </span>${esc(v(m.hanDau, 'mm') || '13mm')}` });
      rows.push({
        kind: 'full',
        text: `<span class="b">Dán lưng: </span>${esc(v(m.danLung, 'mm') || '13mm')}${m.ventHoleInfo ? `. ${esc(m.ventHoleInfo)}` : ''}`,
      });
      break;
    case 'tui-xep-hong-lung-lech':
      rows.push({ kind: 'full', text: `<span class="b">Xếp hông: </span>${esc(v(m.xepHong, 'mm') || '…')}` });
      rows.push({ kind: 'full', text: `<span class="b">Dán lưng lệch: </span>${esc(v(m.danLungLech, 'mm') || '10mm')}` });
      rows.push({ kind: 'full', text: `<span class="b">Dán đáy: </span>${esc(v(m.danDay, 'mm') || '10mm')}` });
      break;
    case 'tui-day-dung':
      if (hasZipper || m.tamZipperCachMieng) {
        rows.push({
          kind: 'pair',
          left: `<span class="b">Tâm zipper cách miệng: </span>${esc(v(m.tamZipperCachMieng, 'mm') || '30mm')}`,
          right: `<span class="b">Nhấn xé "v": </span>${esc(v(m.tearNotch) || '2 bên cách miệng 15mm')}`,
        });
      }
      rows.push({
        kind: 'pair',
        left: `<span class="b">Dán biên: </span>${esc(v(m.sealEdge) || v(m.hanBien, 'mm') || '10mm')}`,
        right: `<span class="b">Xếp đáy: </span>${esc(v(m.foldBottom) || '100mm')}`,
      });
      break;
    case 'tui-cut-seal':
      if (hasZipper || m.tamZipperCachMieng) {
        rows.push({
          kind: 'full',
          text: `<span class="b">Tâm zipper cách đầu: </span>${esc(v(m.tamZipperCachMieng, 'mm') || '25mm')}`,
        });
        rows.push({
          kind: 'full',
          text: `<span class="b">Đục treo lỗ tròn: </span>${esc(v(m.loTreoInfo) || 'Ø8mm ở giữa khoảng cách miệng túi và tâm zipper')}`,
        });
      }
      break;
    case 'tui-cut-seal-nap-keo':
      rows.push({ kind: 'full', text: `Nắp: ${esc(v(m.nap, 'mm') || '35mm')}` });
      rows.push({ kind: 'full', text: `Từ đầu đến sóng siêu âm : ${esc(v(m.songSieuAm, 'mm') || '32mm')}` });
      rows.push({
        kind: 'full',
        text: m.docQuaiXach ? 'Đục quai xách: cây đục riêng của khách' : 'Đục quai xách: …',
      });
      if (m.danKeoNap) rows.push({ kind: 'full', text: 'Dán keo ở mí dưới trong nắp' });
      break;
    default:
      rows.push({
        kind: 'pair',
        left: `<span class="b">Hàn biên: </span>${esc(v(m.hanBien, 'mm') || v(m.sealEdge) || '…')}`,
        right: `<span class="b">Hàn đầu: </span>${esc(v(m.hanDau, 'mm') || '…')}`,
      });
      if (m.xepHong) rows.push({ kind: 'full', text: `<span class="b">Xếp hông: </span>${esc(v(m.xepHong, 'mm'))}` });
      if (m.foldBottom) rows.push({ kind: 'full', text: `<span class="b">Xếp đáy: </span>${esc(v(m.foldBottom))}` });
      if (m.tamZipperCachMieng) {
        rows.push({ kind: 'full', text: `<span class="b">Tâm zipper: </span>${esc(v(m.tamZipperCachMieng, 'mm'))}` });
      }
      if (m.tearNotch) rows.push({ kind: 'full', text: `<span class="b">Nhấn xé "v": </span>${esc(m.tearNotch)}` });
      if (m.holePunchInfo) rows.push({ kind: 'full', text: esc(m.holePunchInfo) });
      {
        const extras: string[] = [];
        if (m.useDualCutter) extras.push('Sử dụng dao cắt 2 nhịp để cắt');
        if (m.useSemicircularMold) extras.push('Sử dụng khuôn đáy đứng bán nguyệt');
        if (extras.length) rows.push({ kind: 'full', text: `<span class="b">${esc(extras.join(' '))}</span>` });
      }
      break;
  }
  return rows;
}


/**
 * Render bag field row.
 * useLeftDivideCol=true (layout A): right block is 3 cols (1 + 2, or 3 full).
 * useLeftDivideCol=false (layout B): expand to full 5 cols (2 + 3, or 5 full).
 */
function renderBagFieldRow(spec: BagRow, useLeftDivideCol: boolean): string {
  if (spec.kind === 'pair') {
    if (useLeftDivideCol) {
      return `
    <tr>
      <td style="width:24%">${spec.left}</td>
      <td colspan="2" style="width:26%">${spec.right}</td>
    </tr>`;
    }
    return `
    <tr>
      <td colspan="2" style="width:50%">${spec.left}</td>
      <td colspan="3" style="width:50%">${spec.right}</td>
    </tr>`;
  }
  if (useLeftDivideCol) {
    return `
    <tr>
      <td colspan="3">${spec.text}</td>
    </tr>`;
  }
  return `
    <tr>
      <td colspan="5">${spec.text}</td>
    </tr>`;
}

// ── ISO header (ref mang-in / cat-seal header3) ───────────────────────────────
function isoHeaderHtml(order: ProductionOrder): string {
  const m = order.manual;
  return `
  <table>
    <colgroup>
      <col style="width:20.5%" /><col style="width:40.2%" />
      <col style="width:17.7%" /><col style="width:21.6%" />
    </colgroup>
    <tr>
      <td class="iso-logo" rowspan="5"><img src="/logo_lts.png" alt="LTS" /></td>
      <td class="iso-co" rowspan="3">Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An</td>
      <td class="iso-lbl">Ký mã hiệu</td>
      <td class="iso-val">QT.ISO-22-BM02</td>
    </tr>
    <tr>
      <td class="iso-lbl">Lần ban hành</td>
      <td class="iso-val">02</td>
    </tr>
    <tr>
      <td class="iso-lbl">Ngày ban hành</td>
      <td class="iso-val">01/03/2025</td>
    </tr>
    <tr>
      <td class="iso-co b" style="font-size:16pt">LỆNH SẢN XUẤT</td>
      <td class="iso-lbl">Số LSX:</td>
      <td class="iso-val red">${esc(m.lsxNumber || order.id)}</td>
    </tr>
    <tr>
      <td class="iso-co"></td>
      <td class="iso-lbl">Ngày xuống LSX:</td>
      <td class="iso-val red">${esc(m.issuedDate || '…/…./20…')}</td>
    </tr>
  </table>`;
}

// ── I. THÔNG TIN SẢN PHẨM ────────────────────────────────────────────────────
function productInfoHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel = isTui
    ? bagInfo.key === 'fallback'
      ? s.bagType || 'Túi'
      : bagInfo.label
    : '';
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const quyCach =
    m.quyCachNote ||
    (isTui && khoMM && dlMM ? `R:${khoMM}mm x D:${dlMM}mm` : '');

  return `
  <table>
    <colgroup><col style="width:45%" /><col style="width:55%" /></colgroup>
    <tr><td colspan="2" class="sec-green">I . THÔNG TIN SẢN PHẨM</td></tr>
    <tr><td colspan="2"><span class="b">Khách hàng: </span>${esc(s.customer || 'CÔNG TY ………..')}</td></tr>
    <tr>
      <td>
        <div><span class="b">MSP: </span>${esc(m.msp || 'TP_0……..')}</div>
      </td>
      <td>
        <div><span class="b">Tên SP: </span>${esc(m.tenSP || s.productName || '')}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div><span class="b">Cấu trúc: </span>${esc(s.structure || '')}</div>
        <div><span class="b">Khổ màng: </span>${khoMM ? `K${khoMM}mm` : '…'}</div>
      </td>
      <td>
        ${isTui ? `<div><span class="b">Kiểu túi: </span>${esc(bagLabel)}</div>` : ''}
        <div><span class="b">Quy cách: </span>${esc(quyCach)}</div>
        ${!isTui ? `
          <div><span class="b">Quy cách cuộn: </span>${esc(m.quyCachCuon || '')}</div>
          <div><span class="b">Chiều ra cuộn: </span>${esc(m.chieuRaCuonSP || '')}</div>
        ` : ''}
      </td>
    </tr>
    <tr>
      <td><span class="b">Số màu: </span>${esc(vd(s.numColors))} màu</td>
      <td><span class="b">Số lượng đơn hàng: </span>${esc(m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²'))}</td>
    </tr>
  </table>`;
}

// ── Màng body — 2-col (ref mang-in / mang-bopp) ──────────────────────────────
function mangBodyHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);

  let html = `
  <table>
    <colgroup><col style="width:48.5%" /><col style="width:51.5%" /></colgroup>
    <tr><td colspan="2" class="sec-orange">MÁY IN</td></tr>
    <tr>
      <td><span class="b">Màng in: </span>${esc(m.printFilmName || s.layer1Name || '')}</td>
      <td><span class="b">Khổ: </span>${khoMM ? `${khoMM}mm` : ''}</td>
    </tr>
    <tr>
      <td>
        <div><span class="b">Quy cách trục: </span>${esc(formatLsxCylText(m, s, { withMm: true }))}</div>
        <div><span class="b">MST: </span>${esc(v(m.printMST))}</div>
      </td>
      <td>
        <div><span class="b">Số trục: </span>${esc(formatLsxNumCylinders(m, false))}</div>
        <div><span class="b">Chiều ra cuộn: </span>${esc(v(m.printDirection) || v(m.rollOutWidth, 'mm'))}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div><span class="b">Thành phẩm in yêu cầu: </span>${esc(formatLsxPrintProductLine(m))}</div>
        <div>Định mức phi hao: ${esc(formatLsxPrintWasteLine(m))}</div>
        <div>Số lượng cấp vật tư: ${esc(v(m.materialQtySupplied))}</div>
        <div><span class="b">Ghi chú: </span>${esc(m.printNotes || 'Sử dụng màng')}</div>
        <div><span class="b">Trục in: </span>${esc(v(m.cylInfo))}</div>
      </td>
    </tr>`;

  if (hasDivide) {
    html += `
    <tr><td colspan="2" class="sec-orange">MÁY CHIA</td></tr>
    <tr>
      <td><span class="b">Khổ màng: </span>${khoMM ? `K${khoMM}mm` : s.originalWidthMm ? `K${s.originalWidthMm}mm` : ''}</td>
      <td><span class="b">Khổ chia: </span>${esc(vd(m.divideWidth || s.divideWidthMm, 'mm'))}</td>
    </tr>
    <tr>
      <td>
        <div><span class="b">Chiều dài quấn cuộn: </span>${esc(vd(m.rollLength, ' m'))}</div>
        <div class="red-note">(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)</div>
      </td>
      <td><span class="b">Chiều ra cuộn: </span>${esc(v(m.chieuRaCuonSP) || vd(m.divideRollOutWidth, 'mm'))}</td>
    </tr>
    <tr>
      <td colspan="2">
        <div>Định mức phi hao: 0m</div>
        <div><span class="b">Khách hàng yêu cầu giao: </span>${esc(v(m.divideDeliveryReq))}</div>
        <div>${esc(m.divideNotes || 'Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn')}</div>
        <div>Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.</div>
        <div>Đánh dấu từng cặp MT-MS để khách hàng phân biệt.</div>
        <div class="b">** Lưu ý:</div>
      </td>
    </tr>`;
  }

  html += `
    <tr>
      <td class="footer-cell"><div class="b">Người lập:</div><div>${esc(m.preparedBy || '')}</div></td>
      <td class="footer-cell"><div class="b">Người Duyệt:</div><div>${esc(m.approvedBy || '')}</div></td>
    </tr>
  </table>`;
  return html;
}

/** Left column under bag section — CHỈ thông số máy chia (layout A). */
function divideLeftColHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  return `
      <div><span class="b">Khổ màng: </span>${khoMM ? `${khoMM}mm` : s.originalWidthMm ? `${s.originalWidthMm}mm` : '…'}</div>
      <div><span class="b">Khổ chia: </span>${esc(vd(m.divideWidth || s.divideWidthMm, 'mm'))}</div>
      ${m.rollLength ? `<div><span class="b">Chiều dài: </span>${esc(vd(m.rollLength, 'm'))}</div>` : ''}
      <div>Định mức phi hao chia: 0m</div>
      <div>${esc(m.divideNotes || '')}</div>
    `;
}

/** Footer notes under bag fields — khớp DOCX (right cs3 layout A / full cs5 layout B). */
function bagFooterNotesHtml(order: ProductionOrder): string {
  const m = order.manual;
  return `
        <div class="b">Định mức phi hao: ${esc(vd(m.bagWasteMeters, 'm'))}</div>
        <div><span class="b">Ghi chú: </span>${esc(m.bagLuuY || m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')}</div>
        <div class="red-note">Ghi chú: ${esc(m.bagMachineNotes || 'chạy theo mẫu đã sản xuất')}</div>
        ${m.packagingInfo ? `<div>SL đóng gói: ${esc(m.packagingInfo)}</div>` : ''}
        ${m.soLuongDHNote ? `<div><span class="b">Số lượng: </span>${esc(m.soLuongDHNote)}</div>` : ''}
        <div><span class="b">Yêu cầu giao hàng: </span></div>
        <div>${esc(m.deliveryNotes || m.bagDeliveryReq || '')}</div>
    `;
}

// ── Túi body — 5-col layout A (chia|túi) / B (túi full) ──────────────────────
function tuiBodyHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const singleLayer = isSingleLayer(s, m);
  const showDivide = hasDivide;
  /** Mid-page CHIA | TÚI header (multi-layer + divide) — layout A */
  const useLeftDivideCol = showDivide && !singleLayer;
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel = bagInfo.key === 'fallback' ? s.bagType || 'Túi' : bagInfo.label;
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const templateKey = resolveLsxDocxTemplate(order);
  const fieldSpecs = bagFieldSpecs(templateKey, m, !!s.hasZipper);


  // Left vMerge spans: kiểu túi + R/D + field rows + footer notes (layout A only)
  const leftRowspan = 1 + 1 + fieldSpecs.length + 1;

  let html = `<table>${COLS5}
    <tr><td colspan="5" class="sec-green">II. CÔNG VIỆC CẦN THỰC HIỆN</td></tr>`;

  // ── IN | CHIA (1 lớp + chia) — ref zipper-cat-seal style ──
  if (singleLayer && showDivide) {
    html += `
    <tr>
      <td colspan="2" class="sec-orange" style="width:50%">MÁY IN</td>
      <td colspan="3" class="sec-orange" style="width:50%">MÁY CHIA</td>
    </tr>
    <tr>
      <td style="width:29%"><span class="b">Màng in: </span>${esc(m.printFilmName || s.layer1Name || '')}</td>
      <td style="width:21%"><span class="b">Khổ: </span>${khoMM ? `${khoMM}mm` : ''}</td>
      <td colspan="3" rowspan="2">
        <div><span class="b">Chia BTP thành phẩm in: </span></div>
        <div>${esc(m.divideNotes || (khoMM ? `${m.printFilmName || s.layer1Name || 'PE'} × ${khoMM} × ${vd(m.printProductQty)}m` : ''))}</div>
        <div><span class="b">Thành phẩm chia: </span>${esc(vd(m.divideWidth || s.divideWidthMm, 'mm'))}${m.rollLength ? esc(` × ${v(m.rollLength)}m`) : ''}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div><span class="b">Trục in: </span>${esc(formatLsxCylText(m, s))}</div>
        <div><span class="b">MST: </span>${esc(v(m.printMST) || '…')}</div>
      </td>
      <td>
        <div><span class="b">Số trục: </span>${esc(formatLsxNumCylinders(m, false))}</div>
        <div><span class="b">Chiều ra cuộn: </span>${esc(v(m.printDirection) || '…')}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div>Định mức phi hao: ${esc(formatLsxPrintWasteLine(m, '…'))}</div>
        <div>Thành phẩm in: ${esc(formatLsxPrintProductLine(m, '…'))}</div>
        <div><span class="b">Ghi chú: </span>${esc(m.printNotes || '')}</div>
        <div>- Màu sắc: duyệt màu theo ${esc(v(m.maMucNhu) || '…')}</div>
        <div>- Chiều xả: ${esc(v(m.printDirection) || '…')}</div>
      </td>
      <td colspan="3">
        <div><span class="b">Ghi chú chia: </span>${esc(m.divideDeliveryReq || '')}</div>
      </td>
    </tr>`;
  } else {
    // ── IN | GHÉP ──
    const lamRows = resolveLsxLaminateRows(order);
    const lam0 = lamRows[0];
    const lam1 = lamRows[1];
    const wasteText = formatLsxLamWasteText(lamRows);
    const lamPassHtml = (lr: typeof lam0, fallbackLabel: string) => {
      if (!lr) return `<span class="b">${esc(fallbackLabel)}: </span>`;
      const parts = lr.parts?.length ? lr.parts : [{ name: lr.name, widthMm: lr.widthMm }];
      if (parts.length <= 1) {
        return `<span class="b">${esc(lr.label)}: </span>${esc(parts[0]?.name || lr.name || '')}`;
      }
      const lines = parts
        .map(
          (p) =>
            `<div>· ${esc(p.name || '')}${p.widthMm ? `  Khổ ${p.widthMm}mm` : ''}</div>`,
        )
        .join('');
      return `<div><span class="b">${esc(lr.label)}:</span></div>${lines}`;
    };
    const lamPassKho = (lr: typeof lam0) => {
      if (!lr) return '';
      if (lr.parts && lr.parts.length > 1) {
        return lr.parts.map((p) => (p.widthMm ? String(p.widthMm) : '…')).join(' / ') + 'mm';
      }
      return vd(lr.widthMm || khoMM, 'mm');
    };
    let extraLam = '';
    for (let i = 2; i < lamRows.length; i++) {
      const lr = lamRows[i];
      extraLam += `
    <tr>
      <td colspan="2"></td>
      <td colspan="2">${lamPassHtml(lr, lr.label)}</td>
      <td><span class="b">Khổ: </span>${esc(lamPassKho(lr))}</td>
    </tr>`;
    }
    html += `
    <tr>
      <td colspan="2" class="sec-orange" style="width:50%">MÁY IN</td>
      <td colspan="3" class="sec-orange" style="width:50%">MÁY GHÉP</td>
    </tr>
    <tr>
      <td style="width:29%"><span class="b">Màng in: </span>${esc(m.printFilmName || s.layer1Name || '')}</td>
      <td style="width:21%"><span class="b">Khổ: </span>${khoMM ? `${khoMM}mm` : ''}</td>
      <td colspan="2" style="width:29.5%">${lamPassHtml(lam0, 'Màng ghép 1')}</td>
      <td style="width:20.5%"><span class="b">Khổ: </span>${esc(lam0 ? lamPassKho(lam0) : '')}</td>
    </tr>
    <tr>
      <td>
        <div><span class="b">Trục in: </span>${esc(formatLsxCylText(m, s))}</div>
        <div><span class="b">MST: </span>${esc(v(m.printMST) || '…')}</div>
      </td>
      <td>
        <div><span class="b">Số trục: </span>${esc(formatLsxNumCylinders(m))}</div>
        ${m.printDirection ? `<div><span class="b">Chiều: </span>${esc(m.printDirection)}</div>` : ''}
      </td>
      <td colspan="2">${lamPassHtml(lam1, 'Màng ghép 2')}</td>
      <td><span class="b">Khổ: </span>${esc(lam1 ? lamPassKho(lam1) : '')}</td>
    </tr>${extraLam}
    <tr>
      <td colspan="2">
        <div>Định mức phi hao: ${esc(formatLsxPrintWasteLine(m, '…'))}</div>
        <div>Thành phẩm yêu cầu: ${esc(formatLsxPrintProductLine(m, '…'))}</div>
        <div><span class="b">Ghi chú:</span></div>
        <div>${esc(m.printNotes || '')}</div>
        <div>- Màu sắc: duyệt màu theo ${esc(v(m.maMucNhu) || '…')}</div>
        <div>- Chiều xả: ${esc(v(m.printDirection) || '…')}</div>
        ${m.cylInfo ? `<div><span class="b">Trục in: </span>${esc(m.cylInfo)}</div>` : ''}
      </td>
      <td colspan="3">
        <div>Định mức phi hao: ${esc(wasteText || '…')}</div>
        <div>Thành phẩm yêu cầu: ${esc(formatLsxLamProductLine(m, '…'))}</div>
        ${m.lamBTPNote ? `<div>${esc(m.lamBTPNote)}</div>` : ''}
        <div><span class="b">Số lượng cấp vật tư: </span>${esc(formatLsxLamSupplyLine(m, '…'))}</div>
        <div><span class="b">Ghi chú: </span>${esc(m.laminateNotes || '')}</div>
      </td>
    </tr>`;
  }


  // ── Bag section header ──
  if (useLeftDivideCol) {
    html += `
    <tr>
      <td colspan="2" class="sec-orange">MÁY CHIA</td>
      <td colspan="3" class="sec-orange">MÁY LÀM TÚI</td>
    </tr>`;
  } else {
    html += `
    <tr><td colspan="5" class="sec-orange">MÁY LÀM TÚI</td></tr>`;
  }

  // ── Bag fields: layout A (left divide vMerge) vs B (full 5 cols) ──
  if (useLeftDivideCol) {
    const leftNotes = divideLeftColHtml(order);
    html += `
    <tr>
      <td colspan="2" rowspan="${leftRowspan}">${leftNotes}</td>
      <td colspan="3" class="ac"><span class="b">Kiểu túi: </span>${esc(bagLabel)}</td>
    </tr>
    <tr>
      <td style="width:24%"><span class="b">Chiều rộng: </span>${khoMM ? `${khoMM}mm` : '…'}</td>
      <td colspan="2" style="width:26%"><span class="b">Chiều dài: </span>${dlMM ? `${dlMM}mm` : '…'}</td>
    </tr>`;
    for (const spec of fieldSpecs) {
      html += renderBagFieldRow(spec, true);
    }
    html += `
    <tr>
      <td colspan="3">${bagFooterNotesHtml(order)}</td>
    </tr>`;
  } else {
    // Layout B: full width — khớp DOCX rcs expand
    html += `
    <tr>
      <td colspan="5" class="ac"><span class="b">Kiểu túi: </span>${esc(bagLabel)}</td>
    </tr>
    <tr>
      <td colspan="2"><span class="b">Chiều rộng: </span>${khoMM ? `${khoMM}mm` : '…'}</td>
      <td colspan="3"><span class="b">Chiều dài: </span>${dlMM ? `${dlMM}mm` : '…'}</td>
    </tr>`;
    for (const spec of fieldSpecs) {
      html += renderBagFieldRow(spec, false);
    }
    html += `
    <tr>
      <td colspan="5">${bagFooterNotesHtml(order)}</td>
    </tr>`;
  }

  html += `
    <tr>
      <td colspan="2" class="footer-cell"><div class="b">Người lập:</div><div>${esc(m.preparedBy || '')}</div></td>
      <td colspan="3" class="footer-cell"><div class="b">Người duyệt:</div><div>${esc(m.approvedBy || '')}</div></td>
    </tr>
  </table>`;
  return html;
}

/** Fragment HTML (kèm style) — inject vào modal preview. */
export function buildLsxHtml(order: ProductionOrder): string {
  const isTui = order.snapshot.productType !== 'mang';
  const body = isTui ? tuiBodyHtml(order) : mangBodyHtml(order);
  return `
<style>${CSS}</style>
<div class="lsx-html-page">
  ${isoHeaderHtml(order)}
  ${productInfoHtml(order)}
  ${body}
  <div class="page-num">Trang 1/1</div>
</div>`;
}
