// src/lib/baoGiaExport.ts
// Export báo giá ra PDF (print) và DOCX

import type { HistoryItem, QuoteTerms, QuoteProductLine, QuoteTier } from './types';

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }
function safeFn(s: string): string { return (s || 'bao-gia').replace(/[<>:"/\\|?*\s]+/g, '_').slice(0, 60); }

function soSangChu(n: number): string {
  if (n <= 0) return 'Không đồng.';
  const donVi = ['', 'nghìn', 'triệu', 'tỷ'];
  const soLe = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function docNhom(so: number): string {
    const tram = Math.floor(so / 100);
    const chuc = Math.floor((so % 100) / 10);
    const donvi = so % 10;
    const parts: string[] = [];
    if (tram > 0) parts.push(soLe[tram] + ' trăm');
    if (chuc === 0) {
      if (tram > 0 && donvi > 0) parts.push('linh');
    } else if (chuc === 1) {
      parts.push('mười');
    } else {
      parts.push(soLe[chuc] + ' mươi');
    }
    if (donvi > 0) {
      if (chuc > 0 && donvi === 1) parts.push('mốt');
      else if (chuc > 0 && donvi === 5) parts.push('lăm');
      else parts.push(soLe[donvi]);
    }
    return parts.join(' ').trim();
  }

  const groups: string[] = [];
  let temp = n;
  let idx = 0;
  while (temp > 0) {
    const nhom = temp % 1000;
    if (nhom > 0) {
      const str = docNhom(nhom);
      groups.unshift(idx === 0 ? str : str + ' ' + donVi[idx]);
    }
    temp = Math.floor(temp / 1000);
    idx++;
  }

  const result = groups.join(' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng.';
}

function withTimeout<T>(p: Promise<T>, ms: number, lbl: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${lbl}`)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

function layVatThucTe(terms?: QuoteTerms): number {
  if (!terms) return 0;
  if (terms.vatRate === -1) return terms.vatCustom ?? 0;
  return terms.vatRate;
}

function layVatTruc(terms?: QuoteTerms): number {
  return terms?.vatCylinderRate ?? 10;
}

const BAG_TYPE_LABELS: Record<string, string> = {
  '3bien': 'TÚI 3 BIÊN',
  '4bien': 'TÚI 4 BIÊN',
  'xephong_lech': 'TÚI XẾP HÔNG DÁN LƯNG LỆCH',
  'xephong_giua': 'TÚI XẾP HÔNG DÁN LƯNG GIỮA',
  'dayDung': 'TÚI ĐÁY ĐỨNG',
  'cutSeal': 'TÚI CUT SEAL',
  'cutSealNapKeo': 'TÚI CUT SEAL MỞ MIỆNG CÓ NẮP KEO',
};

function buildBagSpecDescription(
  spec: Record<string, any> | undefined,
  input: Record<string, any>,
  structure: string,
): string {
  if (!spec) return structure || '';
  const lines: string[] = [];
  const bagLabel = BAG_TYPE_LABELS[spec.bagType] || (spec.bagType ? spec.bagType.toUpperCase() : '');
  if (bagLabel) lines.push(bagLabel + '.');
  if (structure) lines.push(`Chất liệu: ${structure}.`);
  const dimParts: string[] = [];
  const w = spec.widthMm || 0;
  const l = spec.lengthMm || 0;
  if (w && l) dimParts.push(`R:${w}mm x D:${l}mm`);
  if (spec.gussetMm > 0) dimParts.push(`Hông: ${spec.gussetMm}mm`);
  if (spec.standupBottomSideMm > 0) dimParts.push(`Đáy: ${(spec.standupBottomSideMm || 0) * 2}mm`);
  if (spec.backSealMm > 0) {
    const llabel = spec.bagType === 'xephong_lech' ? 'Lưng lệch' : 'Lưng giữa';
    dimParts.push(`${llabel}: ${spec.backSealMm}mm`);
  }
  if (dimParts.length) lines.push(`Quy cách: ${dimParts.join('. ')}.`);
  if (spec.sideSealMm > 0) lines.push(`Hàn biên: ${spec.sideSealMm}mm.`);
  if (spec.hasHeadSeal && spec.headSealMm > 0) lines.push(`Hàn đầu: ${spec.headSealMm}mm.`);
  if (spec.hasBottomSeal && spec.bottomSealMm > 0) lines.push(`Hàn đáy: ${spec.bottomSealMm}mm.`);
  if (spec.lidMm > 0) lines.push(`Nắp: ${spec.lidMm}mm.`);
  if (spec.hasZipper || input.hasZipper) {
    lines.push(spec.zipperDistanceMm > 0
      ? `Có zipper. Tâm zipper cách đầu: ${spec.zipperDistanceMm}mm.`
      : 'Có zipper.');
  }
  if (spec.hasHangHole && spec.hangHoleDescription) lines.push(`Đục lỗ treo: ${spec.hangHoleDescription}.`);
  if (spec.hasHandleHole && spec.handleHoleDescription) lines.push(`Đục lỗ quai xách: ${spec.handleHoleDescription}.`);
  if (spec.hasTearNotch) {
    const parts = ['Nhấn xé "V"'];
    if (spec.tearNotchFromTopMm > 0) parts.push(`cách đầu ${spec.tearNotchFromTopMm}mm`);
    if (spec.tearNotchFromBottomMm > 0) parts.push(`cách đáy ${spec.tearNotchFromBottomMm}mm`);
    lines.push(parts.join(' ') + '.');
  }
  if (spec.hasHalfMoonBottom) lines.push('Đáy bán nguyệt.');
  const colors = input.numColors ?? 0;
  if (colors > 0) lines.push(`In ${colors} màu.`);
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF (via print HTML) — mirror DOCX layout 100%
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  /* ── Print mode ── */
  @page { size: A4; margin: 20mm 15mm 15mm 15mm; }
  @media print {
    .pdf-toolbar { display: none !important; }
    body { background: #fff !important; }
    .pdf-pages { padding: 0 !important; }
    .page { width: auto !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin-bottom: 0 !important; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  }

  /* ── Screen / viewer mode ── */
  body { font-family: 'Times New Roman', serif; color: #000; margin: 0; padding: 0; background: #525659; }
  .pdf-toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    background: #323639; color: #e8eaed; padding: 8px 20px;
    font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,.4);
  }
  .pdf-toolbar-title { font-weight: 500; }
  .pdf-toolbar-actions { display: flex; gap: 8px; }
  .pdf-toolbar-actions button {
    background: #484c52; color: #e8eaed; border: none; border-radius: 4px;
    padding: 6px 14px; cursor: pointer; font-size: 12px; font-family: inherit;
  }
  .pdf-toolbar-actions button:hover { background: #5a5f66; }
  .pdf-toolbar-actions button.btn-print { background: #1a73e8; }
  .pdf-toolbar-actions button.btn-print:hover { background: #1765cc; }
  .pdf-pages {
    display: flex; flex-direction: column; align-items: center;
    padding: 24px 12px 40px;
  }
  .page {
    width: 210mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.35);
    border-radius: 1px; margin-bottom: 24px; padding: 20mm 15mm 15mm 15mm;
    box-sizing: border-box; overflow: hidden;
  }
  .co-name { text-align: center; font-size: 12pt; font-weight: bold; margin: 0 0 2px; }
  .co-addr { text-align: center; font-size: 10pt; margin: 0 0 2px; }
  .co-tax { text-align: center; font-size: 10pt; margin: 0 0 12px; }
  .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 6px 0 2px; }
  .title-date { text-align: center; font-size: 11pt; margin: 0 0 6px; }
  .cust-line { font-size: 11pt; margin: 2px 0; }
  .cust-intro { font-size: 11pt; margin: 6px 0; }
  .mg-bg { font-size: 11pt; color: #555; margin: 2px 0; }
  table.bbg { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 8px 0; }
  table.bbg th, table.bbg td { border: 1px solid #333; padding: 3px 4px; font-size: 10pt; }
  table.bbg th { background: #3d85c6; color: #fff; font-weight: bold; text-align: center; }
  td.ar { text-align: right; }
  td.ac { text-align: center; }
  td.pl { white-space: pre-line; }
  .xem-tiep { text-align: center; font-style: italic; color: #888; font-size: 10pt; }
  .luu-y { font-size: 11pt; font-weight: bold; margin: 14px 0 4px; }
  .luu-y-item { font-size: 10pt; margin: 1px 0; }
  .sig-row { text-align: center; font-size: 11pt; margin-top: 30px; }
  .sig-sub { text-align: center; font-size: 10pt; margin: 2px 0; }
`;

function buildBaoGiaHtmlV2(
  item: HistoryItem,
  customerInfo?: { address?: string; taxCode?: string; phone?: string; fax?: string; description?: string },
): string {
  const products: QuoteProductLine[] = item.quoteProducts?.length
    ? item.quoteProducts
    : [{
        sourceHistoryItemId: item.id, productName: item.productName, structure: item.structure,
        quantity: item.quantity, finalPrice: item.finalPrice, chotGia: item.chotGia,
        input: item.input, tiers: item.tiers || [],
      } as QuoteProductLine];

  const groups = buildGroups(products);
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  const vat = layVatThucTe(item.terms);
  const vatTruc = layVatTruc(item.terms);

  // ═══ Column widths (% of total) — mirrors DOCX DXA proportions ═══
  const W = { stt: '4.5%', name: '18%', desc: '38%', unit: '6%', qty: '9.5%', price: '12.5%', total: '11.5%' };

  let pagesHtml = '';

  for (let page = 0; page < totalPages; page++) {
    const start = page * GROUPS_PER_PAGE;
    const pageGroups = groups.slice(start, start + GROUPS_PER_PAGE);
    const isLast = page === totalPages - 1;
    let sttBase = start + 1;

    // ── Table rows ──
    let tbody = '';

    // Header
    tbody += `<tr><th style="width:${W.stt}">STT</th><th style="width:${W.name}">Tên hàng</th><th style="width:${W.desc}">Mô tả</th><th style="width:${W.unit}">ĐVT</th><th style="width:${W.qty}">Số lượng</th><th style="width:${W.price}">Đơn giá VNĐ</th><th style="width:${W.total}">Thành tiền VNĐ</th></tr>`;

    for (const g of pageGroups) {
      const stt = sttBase++;
      const tierCount = g.tiers.length;
      const cylRows = g.cylinder ? 1 : 0;
      const groupRows = tierCount + cylRows;

      for (let i = 0; i < groupRows; i++) {
        const isFirst = i === 0;
        const isTierRow = i < tierCount;
        const tier = isTierRow ? g.tiers[i] : undefined;
        const cyl = (!isTierRow && g.cylinder) ? g.cylinder : undefined;

        if (isFirst) {
          const desc = (g.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          tbody += `<tr>`
            + `<td class="ac">${stt}</td>`
            + `<td>${escHtml(g.productName)}</td>`
            + `<td class="pl">${desc}</td>`
            + `<td class="ac">${g.isBag ? 'Túi' : 'm²'}</td>`
            + `<td class="ar">${dinhDangSo(tier!.quantity)}</td>`
            + `<td class="ar">${dinhDangSo(tier!.unitPrice)}</td>`
            + `<td class="ar">${dinhDangSo(tier!.total)}</td>`
            + `</tr>`;
        } else if (isTierRow && i > 0) {
          tbody += `<tr>`
            + `<td></td><td></td><td></td><td></td>`
            + `<td class="ar">${dinhDangSo(tier!.quantity)}</td>`
            + `<td class="ar">${dinhDangSo(tier!.unitPrice)}</td>`
            + `<td class="ar">${dinhDangSo(tier!.total)}</td>`
            + `</tr>`;
        } else if (cyl) {
          tbody += `<tr>`
            + `<td></td>`
            + `<td>${escHtml(cyl.name)}</td>`
            + `<td>${escHtml(cyl.dims)}</td>`
            + `<td class="ac">trục</td>`
            + `<td class="ar">${dinhDangSo(cyl.qty)}</td>`
            + `<td class="ar">${dinhDangSo(cyl.unitPrice)}</td>`
            + `<td class="ar">${dinhDangSo(cyl.total)}</td>`
            + `</tr>`;
        }
      }
    }

    // Totals (last page only) or "Xem tiếp"
    if (isLast) {
      const allTierTotal = groups.reduce((s, g) => s + g.tiers.reduce((ss, t) => ss + t.total, 0), 0);
      const allCylTotal = groups.reduce((s, g) => s + (g.cylinder?.total || 0), 0);
      const grandTotal = allTierTotal + allCylTotal;
      const tienVat = allTierTotal * vat / 100;
      const tienVatTruc = allCylTotal * vatTruc / 100;
      const tongCong = grandTotal + tienVat + tienVatTruc;

      const makeTotal = (label: string, value: number, bold?: boolean) =>
        `<tr><td colspan="6" style="text-align:right;${bold ? 'font-weight:bold' : ''}">${label}</td><td class="ar" style="${bold ? 'font-weight:bold' : ''}">${dinhDangSo(Math.round(value))}</td></tr>`;

      tbody += makeTotal('CỘNG TIỀN HÀNG:', grandTotal);
      if (vat > 0 && allTierTotal > 0) tbody += makeTotal(`THUẾ GTGT HÀNG HÓA (${vat}%):`, tienVat);
      if (vatTruc > 0 && allCylTotal > 0) tbody += makeTotal(`THUẾ GTGT TRỤC IN (${vatTruc}%):`, tienVatTruc);
      tbody += makeTotal('TỔNG THANH TOÁN:', tongCong, true);
      tbody += `<tr><td colspan="6">Số tiền (viết bằng chữ): ${soSangChu(Math.round(tongCong))}</td><td></td></tr>`;
    } else {
      tbody += `<tr><td colspan="7" class="xem-tiep">── Xem tiếp trang sau ──</td></tr>`;
    }

    // ── Build page ──
    const titleText = page === 0 ? 'BẢNG BÁO GIÁ' : 'BẢNG BÁO GIÁ (tiếp theo)';
    let pageHtml = '';

    // Company header
    pageHtml += `<div class="co-name">CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN</div>`;
    pageHtml += `<div class="co-addr">SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM</div>`;
    pageHtml += `<div class="co-tax">MST: 1101904518&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;Mail: baobilaitruongson.la@gmail.com</div>`;

    // Title
    pageHtml += `<div class="title">${escHtml(titleText)}</div>`;
    pageHtml += `<div class="title-date">Ngày ${item.date}</div>`;

    // Customer info
    pageHtml += `<div class="cust-line" style="margin-top:6px">Kính gửi: ${escHtml(item.customer || '')}</div>`;
    pageHtml += `<div class="cust-line">Địa chỉ: ${escHtml(customerInfo?.address || '')}</div>`;
    pageHtml += `<div class="cust-line">MST: ${escHtml(customerInfo?.taxCode || '')}</div>`;
    pageHtml += `<div class="cust-line">Điện thoại: ${escHtml(customerInfo?.phone || '')}&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;Fax: ${escHtml(customerInfo?.fax || '')}</div>`;
    pageHtml += `<div class="cust-line">Diễn giải: ${escHtml(customerInfo?.description || item.terms?.notes || '')}</div>`;
    if (item.quoteCode) {
      pageHtml += `<div class="mg-bg">Mã BG: ${escHtml(item.quoteCode)}</div>`;
    }
    pageHtml += `<div class="cust-intro">Chúng tôi xin trân trọng gửi đến quý khách hàng xác nhận báo giá bao bì chi tiết như sau:</div>`;

    // Table
    pageHtml += `<table class="bbg"><tbody>${tbody}</tbody></table>`;

    // Terms & signatures (last page only)
    if (isLast) {
      if (item.terms) {
        pageHtml += `<div class="luu-y">Lưu ý:</div>`;
        pageHtml += `<div class="luu-y-item">- Số lượng thành phẩm có thể tăng hoặc giảm so với ĐĐH: &plusmn;10%</div>`;
        if (item.terms.paymentTerms) pageHtml += `<div class="luu-y-item">- Thanh toán: ${escHtml(item.terms.paymentTerms)}</div>`;
        if (item.terms.deliveryTime) pageHtml += `<div class="luu-y-item">- Thời gian giao hàng: ${escHtml(item.terms.deliveryTime)}</div>`;
        if (item.terms.notes) pageHtml += `<div class="luu-y-item">- Ghi chú: ${escHtml(item.terms.notes)}</div>`;
      }

      pageHtml += `<div class="sig-row">NGƯỜI LẬP&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;PHÊ DUYỆT&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;KHÁCH HÀNG</div>`;
      pageHtml += `<div class="sig-sub">(ký, họ tên)&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;(ký, họ tên)&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;(ký, họ tên)</div>`;
    }

    pagesHtml += `<div class="page">${pageHtml}</div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bảng báo giá ${item.quoteCode || ''}</title><style>${CSS}</style></head><body class="pdf-viewer">
<div class="pdf-toolbar">
  <span class="pdf-toolbar-title">Bảng báo giá ${escHtml(item.quoteCode || item.customer || '')}</span>
  <div class="pdf-toolbar-actions">
    <button class="btn-print" onclick="window.print()">In PDF</button>
    <button onclick="window.close()">Đóng</button>
  </div>
</div>
<div class="pdf-pages">${pagesHtml}</div>
</body></html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function exportBaoGiaToPDF(
  item: HistoryItem,
  customerInfo?: { address?: string; taxCode?: string; phone?: string; fax?: string; description?: string },
): Promise<void> {
  const html = buildBaoGiaHtmlV2(item, customerInfo);
  const win = window.open('', '_blank', 'width=1000,height=900');
  if (!win) { alert('Trình duyệt chặn popup. Vui lòng cho phép popup.'); return; }
  win.document.write(html);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCX export — đa sản phẩm, phân trang 4 group/trang
// ═══════════════════════════════════════════════════════════════════════════════

const GROUPS_PER_PAGE = 4;

interface ProductGroup {
  productName: string;
  tiers: { quantity: number; unitPrice: number; total: number }[];
  description: string;
  isBag: boolean;
  cylinder?: { name: string; dims: string; qty: number; unitPrice: number; total: number };
}

function buildGroups(products: QuoteProductLine[]): ProductGroup[] {
  return products.map(p => {
    const input = p.input || {} as any;
    const spec = p.bagSpec || {} as any;
    const tiers: { quantity: number; unitPrice: number; total: number }[] = [];
    if (p.tiers && p.tiers.length > 0) {
      for (const t of p.tiers) {
        const up = Math.round(t.chotGia || t.finalPrice);
        tiers.push({ quantity: t.quantity, unitPrice: up, total: up * t.quantity });
      }
    } else {
      const up = Math.round(p.chotGia || p.finalPrice);
      tiers.push({ quantity: p.quantity, unitPrice: up, total: up * p.quantity });
    }
    const isBag = input.productType !== 'mang';
    const description = buildBagSpecDescription(spec, input, p.structure);
    let cylinder: ProductGroup['cylinder'] | undefined;
    if (input.cylLength > 0) {
      cylinder = {
        name: `TRỤC IN ${p.productName}`,
        dims: `K.thước: chiều dài ${Math.round(input.cylLength * 1000)}mm × chu vi ${Math.round(input.cylCircum * 1000)}mm`,
        qty: spec.cylinderQuantity || 1,
        unitPrice: spec.cylinderUnitPrice || 0,
        total: (spec.cylinderQuantity || 1) * (spec.cylinderUnitPrice || 0),
      };
    }
    return { productName: p.productName, tiers, description, isBag, cylinder };
  });
}

export async function exportBaoGiaToDocx(
  item: HistoryItem,
  customerInfo?: { address?: string; taxCode?: string; phone?: string; fax?: string; description?: string },
): Promise<void> {
  const docx = await withTimeout(import('docx'), 10000, 'import docx');
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, AlignmentType, BorderStyle, PageBreak } = docx;

  const products: QuoteProductLine[] = item.quoteProducts?.length
    ? item.quoteProducts
    : [{
        sourceHistoryItemId: item.id, productName: item.productName, structure: item.structure,
        quantity: item.quantity, finalPrice: item.finalPrice, chotGia: item.chotGia,
        input: item.input, tiers: item.tiers || [],
      } as QuoteProductLine];

  const groups = buildGroups(products);
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  const vat = layVatThucTe(item.terms);
  const vatTruc = layVatTruc(item.terms);

  // ═══ Column widths (DXA) — tổng 9638 ≈ 170mm khổ A4 margin 20mm ═══
  const CW = { stt: 450, name: 1800, desc: 3800, unit: 600, qty: 950, price: 1250, total: 1150 };
  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const FONT = 'Times New Roman';
  const FONT_SIZE = 20; // 10pt

  const hdr = (text: string, w: number) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    shading: { fill: '3d85c6' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'ffffff', font: FONT, size: FONT_SIZE })], alignment: AlignmentType.CENTER })],
  });

  const tc = (text: string, w: number, opts?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; colSpan?: number }) => {
    const align = opts?.align || AlignmentType.LEFT;
    return new TableCell({
      width: opts?.colSpan ? undefined : { size: w, type: WidthType.DXA },
      borders, columnSpan: opts?.colSpan,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [new Paragraph({
        children: text.split('\n').flatMap((line, i, arr) => {
          const runs = [new TextRun({ text: line, bold: opts?.bold, font: FONT, size: FONT_SIZE })];
          return i < arr.length - 1 ? [...runs, new TextRun({ break: 1 })] : runs;
        }),
        alignment: align,
        spacing: { line: 300 },
      })],
    });
  };

  const emptyCell = (w: number, opts?: { colSpan?: number }) => tc('', w, { colSpan: opts?.colSpan });
  const sections: any[] = [];

  for (let page = 0; page < totalPages; page++) {
    const start = page * GROUPS_PER_PAGE;
    const pageGroups = groups.slice(start, start + GROUPS_PER_PAGE);
    const isLast = page === totalPages - 1;
    let sttBase = start + 1;

    // ── Table rows for this page ──
    const rows: any[] = [];

    // Header row
    rows.push(new TableRow({ children: [
      hdr('STT', CW.stt), hdr('Tên hàng', CW.name), hdr('Mô tả', CW.desc),
      hdr('ĐVT', CW.unit), hdr('Số lượng', CW.qty), hdr('Đơn giá VNĐ', CW.price), hdr('Thành tiền VNĐ', CW.total),
    ] }));

    for (const g of pageGroups) {
      const stt = sttBase++;
      const tierCount = g.tiers.length;
      const cylRows = g.cylinder ? 1 : 0;
      const groupRows = tierCount + cylRows;

      for (let i = 0; i < groupRows; i++) {
        const isFirst = i === 0;
        const isTierRow = i < tierCount;
        const tier = isTierRow ? g.tiers[i] : undefined;
        const cyl = (!isTierRow && g.cylinder) ? g.cylinder : undefined;

        if (isFirst && g.description) {
          // First row: STT + product name + full description + first tier
          rows.push(new TableRow({ children: [
            tc(String(stt), CW.stt, { align: AlignmentType.CENTER }),
            tc(g.productName, CW.name),
            tc(g.description, CW.desc),
            tc(g.isBag ? 'Túi' : 'm²', CW.unit, { align: AlignmentType.CENTER }),
            tc(dinhDangSo(tier!.quantity), CW.qty, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(tier!.unitPrice), CW.price, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(tier!.total), CW.total, { align: AlignmentType.RIGHT }),
          ] }));
        } else if (isTierRow && i > 0) {
          // Additional tier row: no STT/product/desc, just quantity columns
          rows.push(new TableRow({ children: [
            emptyCell(CW.stt), emptyCell(CW.name), emptyCell(CW.desc),
            emptyCell(CW.unit),
            tc(dinhDangSo(tier!.quantity), CW.qty, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(tier!.unitPrice), CW.price, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(tier!.total), CW.total, { align: AlignmentType.RIGHT }),
          ] }));
        } else if (cyl) {
          // Cylinder row: no STT
          rows.push(new TableRow({ children: [
            emptyCell(CW.stt),
            tc(cyl.name, CW.name),
            tc(cyl.dims, CW.desc),
            tc('trục', CW.unit, { align: AlignmentType.CENTER }),
            tc(dinhDangSo(cyl.qty), CW.qty, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(cyl.unitPrice), CW.price, { align: AlignmentType.RIGHT }),
            tc(dinhDangSo(cyl.total), CW.total, { align: AlignmentType.RIGHT }),
          ] }));
        }
      }
    }

    // Totals row (only on last page)
    if (isLast) {
      const allTierTotal = groups.reduce((s, g) =>
        s + g.tiers.reduce((ss, t) => ss + t.total, 0), 0);
      const allCylTotal = groups.reduce((s, g) =>
        s + (g.cylinder?.total || 0), 0);
      const grandTotal = allTierTotal + allCylTotal;
      const tienVat = allTierTotal * vat / 100;
      const tienVatTruc = allCylTotal * vatTruc / 100;
      const tongCong = grandTotal + tienVat + tienVatTruc;

      const totalCell = (label: string, value: number, opts?: { bold?: boolean }) =>
        new TableRow({ children: [
          new TableCell({ width: { size: CW.stt + CW.name + CW.desc + CW.unit + CW.qty + CW.price, type: WidthType.DXA }, borders, columnSpan: 6,
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: opts?.bold, font: FONT, size: FONT_SIZE })], alignment: AlignmentType.RIGHT })] }),
          tc(dinhDangSo(Math.round(value)), CW.total, { bold: opts?.bold, align: AlignmentType.RIGHT }),
        ] });

       rows.push(totalCell('CỘNG TIỀN HÀNG:', grandTotal));
      if (vat > 0 && allTierTotal > 0) rows.push(totalCell(`THUẾ GTGT HÀNG HÓA (${vat}%):`, tienVat));
      if (vatTruc > 0 && allCylTotal > 0) rows.push(totalCell(`THUẾ GTGT TRỤC IN (${vatTruc}%):`, tienVatTruc));
      rows.push(totalCell('TỔNG THANH TOÁN:', tongCong, { bold: true }));
      rows.push(new TableRow({ children: [
        new TableCell({ width: { size: CW.stt + CW.name + CW.desc + CW.unit + CW.qty + CW.price, type: WidthType.DXA }, borders, columnSpan: 6, margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: `Số tiền (viết bằng chữ): ${soSangChu(Math.round(tongCong))}`, font: FONT, size: FONT_SIZE })], alignment: AlignmentType.LEFT })] }),
        new TableCell({ width: { size: CW.total, type: WidthType.DXA }, borders, margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({ children: [] })] }),
      ] }));
    } else {
      // "Xem tiếp" row
      rows.push(new TableRow({ children: [
        new TableCell({ width: { size: CW.stt + CW.name + CW.desc + CW.unit + CW.qty + CW.price + CW.total, type: WidthType.DXA }, borders, columnSpan: 7,
          children: [new Paragraph({ children: [new TextRun({ text: '── Xem tiếp trang sau ──', italics: true, font: FONT, size: FONT_SIZE, color: '888888' })], alignment: AlignmentType.CENTER })] }),
      ] }));
    }

    const table = new Table({ rows }) as any;

    // ── Build page children ──
    const pageChildren: any[] = [];

    // Company header
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: 'CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN', bold: true, font: FONT, size: 24 })],
      alignment: AlignmentType.CENTER,
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: 'SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM', font: FONT, size: 20 })],
      alignment: AlignmentType.CENTER,
    }));
    pageChildren.push(new Paragraph({
      children: [
        new TextRun({ text: 'MST: 1101904518', font: FONT, size: 20 }),
        new TextRun({ text: '                              Mail: baobilaitruongson.la@gmail.com', font: FONT, size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    // Title
    const titleText = page === 0 ? 'BẢNG BÁO GIÁ' : 'BẢNG BÁO GIÁ (tiếp theo)';
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: titleText, bold: true, font: FONT, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `Ngày ${item.date}`, font: FONT, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));

    // Customer info
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `Kính gửi: ${item.customer || ''}`, font: FONT, size: 22 })],
      spacing: { before: 100 },
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `Địa chỉ: ${customerInfo?.address || ''}`, font: FONT, size: 22 })],
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `MST: ${customerInfo?.taxCode || ''}`, font: FONT, size: 22 })],
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `Điện thoại: ${customerInfo?.phone || ''}                    Fax: ${customerInfo?.fax || ''}`, font: FONT, size: 22 })],
    }));
    pageChildren.push(new Paragraph({
      children: [new TextRun({ text: `Diễn giải: ${customerInfo?.description || item.terms?.notes || ''}`, font: FONT, size: 22 })],
      spacing: { after: 100 },
    }));
    if (item.quoteCode) {
      pageChildren.push(new Paragraph({
        children: [new TextRun({ text: `Mã BG: ${item.quoteCode}`, font: FONT, size: 22, color: '555555' })],
      }));
    }
    pageChildren.push(new Paragraph({ children: [new TextRun({ text: 'Chúng tôi xin trân trọng gửi đến quý khách hàng xác nhận báo giá bao bì chi tiết như sau:', font: FONT, size: 22 })], spacing: { after: 100 } }));

    // Product table
    pageChildren.push(table);

    // Terms & signatures (only on last page)
    if (isLast) {
      if (item.terms) {
        pageChildren.push(new Paragraph({
          children: [new TextRun({ text: 'Lưu ý:', bold: true, font: FONT, size: 22 })],
          spacing: { before: 300 },
        }));
        const notes: string[] = [];
        notes.push('- Số lượng thành phẩm có thể tăng hoặc giảm so với ĐĐH: ±10%');
        if (item.terms.paymentTerms) notes.push(`- Thanh toán: ${item.terms.paymentTerms}`);
        if (item.terms.deliveryTime) notes.push(`- Thời gian giao hàng: ${item.terms.deliveryTime}`);
        if (item.terms.notes) notes.push(`- Ghi chú: ${item.terms.notes}`);
        for (const n of notes) {
          pageChildren.push(new Paragraph({ children: [new TextRun({ text: n, font: FONT, size: 20 })] }));
        }
      }

      // Signatures
      pageChildren.push(new Paragraph({ children: [], spacing: { before: 400 } }));
      pageChildren.push(new Paragraph({
        children: [
          new TextRun({ text: 'NGƯỜI LẬP                              PHÊ DUYỆT                              KHÁCH HÀNG', font: FONT, size: 22 }),
        ],
        alignment: AlignmentType.CENTER,
      }));
      pageChildren.push(new Paragraph({
        children: [
          new TextRun({ text: '(ký, họ tên)                               (ký, họ tên)                               (ký, họ tên)', font: FONT, size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
      }));
    }

    sections.push({
      properties: {
        page: {
          margin: { top: 1134, bottom: 851, left: 851, right: 851 }, // 20mm top, 15mm others (DXA)
        },
      },
      children: pageChildren,
    });
  }

  // Remove page breaks between sections (docx puts them automatically per section)
  // Actually, the docx library adds page breaks between sections by default
  const doc = new Document({ sections: sections as any[] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoGia_${safeFn(item.quoteCode || item.customer)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
