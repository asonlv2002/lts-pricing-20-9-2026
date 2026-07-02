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

async function loadLogoDataUrl(): Promise<string> {
  try {
    const resp = await fetch('/logo_lts.png');
    if (!resp.ok) return '';
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:image/png;base64,${b64}`;
  } catch { return ''; }
}

function layVatThucTe(terms?: QuoteTerms): number {
  if (!terms) return 0;
  if (terms.vatRate === -1) return terms.vatCustom ?? 0;
  return terms.vatRate;
}

function layVatTruc(terms?: QuoteTerms): number {
  return terms?.vatCylinderRate ?? 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers — xây mô tả từ bagSpec
// ═══════════════════════════════════════════════════════════════════════════════

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
// PDF (via print HTML)
// ═══════════════════════════════════════════════════════════════════════════════

function buildBaoGiaHtml(item: HistoryItem, logo: string): string {
  const vat = layVatThucTe(item.terms);
  const donGia = item.chotGia || item.finalPrice;
  const thanhTien = donGia * item.quantity;
  const tienVat = thanhTien * vat / 100;
  const tongCong = thanhTien + tienVat;
  const tiers = item.tiers && item.tiers.length > 0 ? item.tiers : null;

  const tierRows = tiers
    ? tiers.map((t, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${item.productName}</td>
        <td>${item.structure}</td>
        <td style="text-align:right">${dinhDangSo(t.quantity)}</td>
        <td style="text-align:right">${dinhDangSo(Math.round(t.chotGia || t.finalPrice))}</td>
        <td style="text-align:right">${dinhDangSo(Math.round((t.chotGia || t.finalPrice) * t.quantity))}</td>
      </tr>`).join('')
    : `<tr>
        <td style="text-align:center">1</td>
        <td>${item.productName}</td>
        <td>${item.structure}</td>
        <td style="text-align:right">${dinhDangSo(item.quantity)}</td>
        <td style="text-align:right">${dinhDangSo(Math.round(donGia))}</td>
        <td style="text-align:right">${dinhDangSo(Math.round(thanhTien))}</td>
      </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Báo giá ${item.quoteCode || ''}</title>
<style>
  @page { size: A4; margin: 15mm 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .header img { width: 80px; height: auto; }
  .company { font-size: 10pt; }
  .company h2 { margin: 0; font-size: 13pt; color: #1a56db; }
  h1 { text-align: center; font-size: 18pt; margin: 20px 0 6px; color: #1a56db; }
  .quote-code { text-align: center; font-size: 11pt; margin-bottom: 16px; color: #555; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 16px; font-size: 11pt; }
  .info-grid .label { color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #333; padding: 6px 8px; font-size: 11pt; }
  th { background: #3d85c6; color: #fff; font-weight: bold; }
  .total-row td { font-weight: bold; background: #f0f7ff; }
  .terms { margin-top: 16px; font-size: 11pt; }
  .terms h3 { font-size: 12pt; margin: 12px 0 4px; }
  .terms p { margin: 2px 0; }
  .signature { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
  .signature div { width: 200px; }
  .signature .title { font-weight: bold; margin-bottom: 60px; }
</style></head><body>
<div class="header">
  ${logo ? `<img src="${logo}" />` : ''}
  <div class="company">
    <h2>CÔNG TY CP LAI TRƯỜNG SƠN</h2>
    <div>Sản xuất bao bì nhựa mềm</div>
  </div>
</div>

<h1>BÁO GIÁ</h1>
<div class="quote-code">${item.quoteCode || ''} — Ngày: ${item.date}</div>

<div class="info-grid">
  <div><span class="label">Khách hàng:</span> <strong>${item.customer}</strong></div>
  <div><span class="label">Người lập:</span> ${item.sellerName || '—'}</div>
  <div><span class="label">Sản phẩm:</span> ${item.productName}</div>
  <div><span class="label">Hiệu lực:</span> ${item.terms?.validityDays ? item.terms.validityDays + ' ngày' : '30 ngày'}</div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px">STT</th>
      <th>Sản phẩm</th>
      <th>Quy cách</th>
      <th style="width:90px">Số lượng</th>
      <th style="width:100px">Đơn giá (đ)</th>
      <th style="width:120px">Thành tiền (đ)</th>
    </tr>
  </thead>
  <tbody>
    ${tierRows}
    <tr class="total-row">
      <td colspan="5" style="text-align:right">Cộng:</td>
      <td style="text-align:right">${dinhDangSo(Math.round(tiers ? tiers.reduce((s, t) => s + (t.chotGia || t.finalPrice) * t.quantity, 0) : thanhTien))}</td>
    </tr>
    ${vat > 0 ? `<tr><td colspan="5" style="text-align:right">VAT (${vat}%):</td><td style="text-align:right">${dinhDangSo(Math.round(tienVat))}</td></tr>` : ''}
    <tr class="total-row">
      <td colspan="5" style="text-align:right"><strong>TỔNG CỘNG:</strong></td>
      <td style="text-align:right"><strong>${dinhDangSo(Math.round(tongCong))}</strong></td>
    </tr>
  </tbody>
</table>

${item.terms ? `<div class="terms">
  <h3>Điều khoản báo giá</h3>
  ${item.terms.paymentTerms ? `<p><strong>Thanh toán:</strong> ${item.terms.paymentTerms}</p>` : ''}
  ${item.terms.deliveryTime ? `<p><strong>Giao hàng:</strong> ${item.terms.deliveryTime}</p>` : ''}
  ${item.terms.notes ? `<p><strong>Ghi chú:</strong> ${item.terms.notes}</p>` : ''}
</div>` : ''}

<div class="signature">
  <div><div class="title">Người lập</div><div>${item.sellerName || ''}</div></div>
  <div><div class="title">Phê duyệt</div><div></div></div>
  <div><div class="title">Khách hàng</div><div></div></div>
</div>
</body></html>`;
}

export async function exportBaoGiaToPDF(item: HistoryItem): Promise<void> {
  const logo = await loadLogoDataUrl();
  const html = buildBaoGiaHtml(item, logo);
  const win = window.open('', '_blank', 'width=800,height=1100');
  if (!win) { alert('Trình duyệt chặn popup. Vui lòng cho phép popup.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
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
