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
import { buildLsxLamGridRows } from './lsx-lam-rows';
import { formatLsxOrderQuantity } from './lsx-quantity';
import { buildLsxQuyCachLines, lsxBagSizeMm } from './lsx-quy-cach';
import { bagTypeLabelHienThi } from './lsx-bag-classification';
import { buildLsxBagFieldRows } from './lsx-bag-fields';
import { formatLsxHeaderDate } from './lsx-header-format';
import { formatLsxDivideSummary, layPhiHaoChia, resolveLsxDivideSpec } from './lsx-divide';


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

/** <img> chữ ký người lập (data URL PNG) — trống nếu chưa có. */
function chuKyImgHtml(m: LSXManualFields): string {
  if (!m.preparedBySignature) return '';
  return `<img class="chu-ky-img" src="${m.preparedBySignature}" alt="Chữ ký người lập" />`;
}

function divideResultHtml(order: ProductionOrder): string {
  const spec = resolveLsxDivideSpec(order);
  const m = order.manual;
  // Chi hide khi user thuc su khong co du lieu nao (regression 2026-08-27:
  // truoc do `if (!spec.valid) return` lam mat du lieu user vua nhap).
  const hasUserData =
    (m.divideWidth ?? 0) > 0
    || (m.divideElements ?? 0) > 0
    || (Array.isArray(m.divideWidths) && m.divideWidths.length > 0);
  if (!hasUserData) return '';
  const filmWidth = spec.filmWidthMm ? `${spec.filmWidthMm}mm` : '…';
  const khoChia = formatLsxDivideSummary(spec);
  const rows: string[] = [];
  rows.push(
    `<div class="divide-split">` +
      `<div class="divide-cell"><span class="b">Khổ màng: </span>${esc(filmWidth)}</div>` +
      `<div class="divide-cell"><span class="b">Khổ chia: </span>${esc(khoChia)}</div>` +
      `</div>`,
  );
  rows.push(`<div><span class="b">Chiều dài: </span>${esc(vd(m.rollLength, 'm'))}</div>`);
  rows.push(`<div><span class="b">Chiều ra cuộn: </span>${esc(vd(m.divideRollOutWidth, 'mm'))}</div>`);
  if (m.divideDesc) {
    rows.push(`<div><span class="b">Mô tả: </span>${esc(m.divideDesc)}</div>`);
  }
  if (m.divideNotes) {
    rows.push(`<div><span class="b">Ghi chú: </span>${esc(m.divideNotes)}</div>`);
  }
  return rows.join('');
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
  .lsx-html-page .bag-split {
    display: flex;
    align-items: stretch;
  }
  .lsx-html-page .bag-note {
    width: 50%;
    padding-right: 8px;
    border-right: 1px solid #000;
  }
  .lsx-html-page .bag-grid {
    width: 50%;
  }
  .lsx-html-page .bag-note > div {
    margin-bottom: 2px;
  }
  .lsx-html-page .bag-grid table {
    margin-bottom: 0;
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
  }
  .lsx-html-page .bag-grid td {
    border: 0;
    border-top: 1px solid #000;
  }
  .lsx-html-page .bag-grid tr:first-child td {
    border-top: 0;
  }
  .lsx-html-page .bag-grid td + td {
    border-left: 1px solid #000;
  }
  .lsx-html-page .bag-split .red-note {
    color: #000;
  }
  .lsx-html-page .divide-split {
    display: flex;
    align-items: stretch;
  }
  .lsx-html-page .divide-cell {
    flex: 1 1 50%;
    min-width: 0;
  }
  .lsx-html-page .divide-cell + .divide-cell {
    border-left: 1px solid #000;
    padding-left: 8px;
  }
  /* IN | GHÉP: ô ngoài chỉ là khung, lưới con tự kẻ bên trong */
  .lsx-html-page td.lam-half {
    padding: 0;
  }
  .lsx-html-page td.lam-half > table {
    margin-bottom: 0;
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    height: 100%;
  }
  .lsx-html-page td.lam-half td {
    border: 0;
    border-top: 1px solid #000;
  }
  .lsx-html-page td.lam-half tr:first-child td {
    border-top: 0;
  }
  .lsx-html-page td.lam-half td + td {
    border-left: 1px solid #000;
  }
  /* Nửa MÁY IN: bỏ kẻ ngang trong để đường kẻ không gãy khúc giữa hai nửa */
  .lsx-html-page td.lam-half--print td {
    border-top: 0;
  }
  /* Dual: hàng thứ 2+ là ô đầu tiên của hàng nên phải tự kẻ tiếp vạch dọc label */
  .lsx-html-page td.lam-half td.lam-part-first {
    border-left: 1px solid #000;
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
     max-width: 120px;
     max-height: 150px;
     object-fit: contain;
   }
   .lsx-html-page .iso-co { width: 40.2%; text-align: center; vertical-align: middle; font-size: 11pt; }
   .lsx-html-page .iso-title { width: 40.2%; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: 700; }
   .lsx-html-page .iso-lbl { width: 17.7%; font-style: italic; vertical-align: middle; font-size: 10pt; }
   .lsx-html-page .iso-val { width: 21.6%; text-align: center; vertical-align: middle; font-size: 10pt; }
  .lsx-html-page .footer-cell { text-align: center; padding: 12px 4px; vertical-align: top; }
  .lsx-html-page .chu-ky-img { display: block; height: 110px; margin: 6px auto 0; object-fit: contain; }
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

/** Bag-machine field rows per template — maps từ nguồn CHUNG buildLsxBagFieldRows (PDF/DOCX/HTML). */
function bagFieldSpecs(templateKey: LsxDocxTemplateKey, m: LSXManualFields, hasZipper = false, snapshotZipperDistanceMm?: number): BagRow[] {
  const rows: BagRow[] = [];
  const shared = buildLsxBagFieldRows(templateKey, m, hasZipper, snapshotZipperDistanceMm);
  for (const row of shared) {
    if (row.kind === 'pair') {
      rows.push({
        kind: 'pair',
        left: `<span class="b">${esc(row.left.label)}</span>${esc(row.left.value)}`,
        right: `<span class="b">${esc(row.right.label)}</span>${esc(row.right.value)}`,
      });
    } else {
      rows.push({
        kind: 'full',
        text: row.field.label
          ? `<span class="b">${esc(row.field.label)}</span>${esc(row.field.value)}`
          : esc(row.field.value),
      });
    }
  }
  return rows;
}


/**
 * Render bag field row.
 * useLeftDivideCol=true (layout A): right block is 3 cols (1 + 2, or 3 full).
 * useLeftDivideCol=false (layout B): expand to full 5 cols (2 + 3, or 5 full).
 */


// ── ISO header (ref mang-in / cat-seal header3) ───────────────────────────────
function isoHeaderHtml(order: ProductionOrder): string {
  const m = order.manual;
  const lsxNumber = m.lsxNumber || order.id;
  const issuedDate = formatLsxHeaderDate(m.issuedDate);
  return `
  <table>
    <colgroup>
      <col style="width:20.5%" /><col style="width:40.2%" />
      <col style="width:17.7%" /><col style="width:21.6%" />
    </colgroup>
    <tr>
      <td class="iso-logo" rowspan="4"><img src="/logo-LTS-LA.jpg" alt="LTS Long An" /></td>
      <td class="iso-co" rowspan="2">Công Ty CP TM và SX Bao Bì<br/>Lai Trường Sơn- Long An</td>
      <td class="iso-lbl">Ký mã hiệu</td>
      <td class="iso-val">QT.ISO-22-BM02</td>
    </tr>
    <tr>
      <td class="iso-lbl">Lần ban hành</td>
      <td class="iso-val">02</td>
    </tr>
    <tr>
      <td class="iso-title" rowspan="2">LỆNH SẢN XUẤT</td>
      <td class="iso-lbl">Số:</td>
      <td class="iso-val">${esc(lsxNumber)}</td>
    </tr>
    <tr>
      <td class="iso-lbl">Ngày:</td>
      <td class="iso-val">${esc(issuedDate)}</td>
    </tr>
  </table>`;
}

/** 1 dòng khối Quy cách: in đậm nhãn trước ": ", giữ nguyên dòng không nhãn. */
function quyCachLineHtml(line: string): string {
  const idx = line.indexOf(': ');
  if (idx < 0) return `<div>${esc(line)}</div>`;
  const label = line.slice(0, idx + 2);
  const value = line.slice(idx + 2);
  return `<div><span class="b">${esc(label)}</span>${esc(value)}</div>`;
}

// ── I. THÔNG TIN SẢN PHẨM ────────────────────────────────────────────────────
function productInfoHtml(order: ProductionOrder): string {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== 'mang';
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel = isTui
    ? bagTypeLabelHienThi(bagInfo, s.bagType || '', !!s.hasZipper, !!m.lsxBagTypeOverride)
    : '';
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const quyCachLines = buildLsxQuyCachLines(m, s);
  const quyCachHtml = quyCachLines.map(quyCachLineHtml).join('');

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
        ${quyCachHtml}
        ${!isTui ? `
          <div><span class="b">Quy cách cuộn: </span>${esc(m.quyCachCuon || '')}</div>
          <div><span class="b">Chiều ra cuộn: </span>${esc(m.chieuRaCuonSP || '')}</div>
        ` : ''}
      </td>
    </tr>
    <tr>
      <td><span class="b">Số màu: </span>${esc(vd(s.numColors))} màu</td>
      <td><span class="b">Số lượng: </span>${esc(formatLsxOrderQuantity(m.soLuongDHNote || qty(s.quantity) + (isTui ? ' túi' : ' m²'), m.quantityTolerancePercent ?? 10))}</td>
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
      <td colspan="2">${divideResultHtml(order)}</td>
    </tr>
    <tr>
      <td colspan="2">
        <div class="red-note">(Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)</div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div>Định mức phi hao: ${layPhiHaoChia(order)}m</div>
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
      <td class="footer-cell"><div class="b">Người lập:</div><div>${esc(m.preparedBy || '')}</div>${chuKyImgHtml(m)}</td>
      <td class="footer-cell"><div class="b">Người Duyệt:</div><div>${esc(m.approvedBy || '')}</div></td>
    </tr>
  </table>`;
  return html;
}

/** Left column under bag section — CHỈ thông số máy chia (layout A). */
function divideLeftColHtml(order: ProductionOrder): string {
  return `
    ${divideResultHtml(order)}
  `;
}

/** Ghi chú vận hành cuối lưới túi — chỉ định mức phi hao + ghi chú máy. */
function bagFooterNotesHtml(order: ProductionOrder): string {
  const m = order.manual;
  return `<div class="b">Định mức phi hao: ${esc(vd(m.bagWasteMeters, 'm'))}</div><div><span class="b">Ghi chú: </span>${esc(m.bagMachineNotes || m.bagLuuY || 'chạy theo mẫu đã sản xuất')}</div>`;
}

/**
 * MÁY LÀM TÚI — trái: ghi chú tự do (bagLuuY); phải: lưới thông số 2 ô đều nhau.
 * Hai nửa 50/50 để đường kẻ dọc thẳng trục với MÁY IN | MÁY GHÉP.
 */
function bagSplitHtml(
  bagLabel: string,
  bagSize: { widthMm: number; lengthMm: number },
  fieldSpecs: BagRow[],
  order: ProductionOrder,
): string {
  const m = order.manual;
  const rows: string[] = [];
  rows.push(`<tr><td colspan="2" class="ac"><span class="b">Kiểu túi: </span>${esc(bagLabel)}</td></tr>`);
  rows.push(
    `<tr><td><span class="b">Chiều rộng: </span>${bagSize.widthMm ? `${bagSize.widthMm}mm` : '…'}</td>` +
      `<td><span class="b">Chiều dài: </span>${bagSize.lengthMm ? `${bagSize.lengthMm}mm` : '…'}</td></tr>`,
  );
  for (const spec of fieldSpecs) {
    if (spec.kind === 'pair') {
      rows.push(`<tr><td>${spec.left}</td><td>${spec.right}</td></tr>`);
    } else {
      rows.push(`<tr><td colspan="2">${spec.text}</td></tr>`);
    }
  }
  rows.push(`<tr><td colspan="2">${bagFooterNotesHtml(order)}</td></tr>`);

  return `
    <div class="bag-split">
      <div class="bag-note" data-lsx-bag-note>
        <div><span class="b">Ghi chú:</span></div>
        <div class="b">${esc(m.bagLuuY || '')}</div>
      </div>
      <div class="bag-grid" data-lsx-bag-grid>
        <table><colgroup><col style="width:50%" /><col style="width:50%" /></colgroup>${rows.join('')}</table>
      </div>
    </div>`;
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
  const bagLabel = bagInfo.key === 'fallback'
    ? s.bagType || 'Túi'
    : bagTypeLabelHienThi(bagInfo, s.bagType || '', !!s.hasZipper, !!m.lsxBagTypeOverride);
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const bagSize = lsxBagSizeMm(s);
  const templateKey = resolveLsxDocxTemplate(order);
  const fieldSpecs = bagFieldSpecs(templateKey, m, !!s.hasZipper, s.zipperDistanceMm);


  const bagContent = bagSplitHtml(bagLabel, bagSize, fieldSpecs, order);
  const leftRowspan = 1;

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
        ${divideResultHtml(order)}
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
        ${m.inDesc ? `<div>${esc(m.inDesc)}</div>` : ''}
        <div><span class="b">Ghi chú: </span>${esc(m.printNotes || '')}</div>
        <div>- Màu sắc: duyệt màu theo ${esc(v(m.maMucNhu) || '…')}</div>
      </td>
      <td colspan="3">
        <div><span class="b">Ghi chú chia: </span>${esc(m.divideDeliveryReq || '')}</div>
      </td>
    </tr>`;
  } else {
    // ── IN | GHÉP — hai nửa 50/50, mỗi nửa có lưới riêng nên không cần ô rỗng ──
    const lamRows = resolveLsxLaminateRows(order);
    const wasteText = formatLsxLamWasteText(lamRows);
    const gridRows = buildLsxLamGridRows(lamRows, khoMM);

    // Nửa MÁY IN: 2 cột liền khối, KHÔNG kẻ ngang bên trong để mọi đường
    // kẻ dọc chạy liền hết chiều cao (nửa GHÉP có số hàng khác nên nếu kẻ
    // ngang cả hai bên thì các vạch không gặp nhau → trông như đứt đoạn).
    const printGrid = `
        <table><colgroup><col style="width:58%" /><col style="width:42%" /></colgroup>
          <tr>
            <td>
              <div><span class="b">Màng in: </span>${esc(m.printFilmName || s.layer1Name || '')}</div>
              <div><span class="b">Trục in: </span>${esc(formatLsxCylText(m, s))}</div>
              <div><span class="b">MST: </span>${esc(v(m.printMST) || '…')}</div>
            </td>
            <td>
              <div><span class="b">Khổ: </span>${khoMM ? `${khoMM}mm` : '…'}</div>
              <div><span class="b">Số trục: </span>${esc(formatLsxNumCylinders(m))}</div>
              ${m.printDirection ? `<div><span class="b">Chiều ra cuộn: </span>${esc(m.printDirection)}</div>` : ''}
            </td>
          </tr>
        </table>`;

    // Nửa MÁY GHÉP: dòng đơn = 2 ô; dòng dual = label gộp dọc + mỗi vật liệu 1 hàng
    const lamGridRowsHtml = gridRows
      .map((row) => {
        if (row.kind === 'dual') {
          return row.parts
            .map((p, pi) =>
              pi === 0
                ? `<tr><td rowspan="${row.parts.length}" class="vm"><span class="b">${esc(row.label)}</span></td>` +
                  `<td>${esc(p.name)}</td><td>Khổ ${esc(p.khoText)}</td></tr>`
                : `<tr><td class="lam-part-first">${esc(p.name)}</td><td>Khổ ${esc(p.khoText)}</td></tr>`,
            )
            .join('');
        }
        return (
          `<tr><td colspan="2"><span class="b">${esc(row.label)}: </span>${esc(row.name)}</td>` +
          `<td>Khổ ${esc(row.khoText)}</td></tr>`
        );
      })
      .join('');

    const lamGrid = `
        <table><colgroup><col style="width:36%" /><col style="width:38%" /><col style="width:26%" /></colgroup>
          ${lamGridRowsHtml || '<tr><td colspan="3"></td></tr>'}
        </table>`;

    html += `
    <tr>
      <td colspan="2" class="sec-orange" style="width:50%">MÁY IN</td>
      <td colspan="3" class="sec-orange" style="width:50%">MÁY GHÉP</td>
    </tr>
    <tr>
      <td colspan="2" class="lam-half lam-half--print" data-lsx-print-grid>${printGrid}</td>
      <td colspan="3" class="lam-half" data-lsx-lam-grid>${lamGrid}</td>
    </tr>
    <tr>
      <td colspan="2">
        <div>Định mức phi hao: ${esc(formatLsxPrintWasteLine(m, '…'))}</div>
        <div>Thành phẩm yêu cầu: ${esc(formatLsxPrintProductLine(m, '…'))}</div>
        ${m.inDesc ? `<div>${esc(m.inDesc)}</div>` : ''}
        <div><span class="b">Ghi chú:</span></div>
        <div>${esc(m.printNotes || '')}</div>
        <div>- Màu sắc: duyệt màu theo ${esc(v(m.maMucNhu) || '…')}</div>
        ${m.cylInfo ? `<div><span class="b">Trục in: </span>${esc(m.cylInfo)}</div>` : ''}
      </td>
      <td colspan="3">
        <div>Định mức phi hao: ${esc(wasteText || '…')}</div>
        <div>Thành phẩm yêu cầu: ${esc(formatLsxLamProductLine(m, '…'))}</div>
        ${m.lamBTPNote ? `<div>${esc(m.lamBTPNote)}</div>` : ''}
        ${m.lamDesc ? `<div>${esc(m.lamDesc)}</div>` : ''}
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

  // ── Bag fields: split specification | operation in the bag area ──
  if (useLeftDivideCol) {
    const leftNotes = divideLeftColHtml(order);
    html += `
    <tr>
      <td colspan="2" rowspan="${leftRowspan}">${leftNotes}</td>
      <td colspan="3">${bagContent}</td>
    </tr>`;
  } else {
    html += `
    <tr>
      <td colspan="5">${bagContent}</td>
    </tr>`;
  }

  html += `
    <tr>
      <td colspan="2" class="footer-cell"><div class="b">Người lập:</div><div>${esc(m.preparedBy || '')}</div>${chuKyImgHtml(m)}</td>
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
