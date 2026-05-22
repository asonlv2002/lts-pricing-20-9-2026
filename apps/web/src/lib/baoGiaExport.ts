// src/lib/baoGiaExport.ts
// Export báo giá ra PDF (print) và DOCX

import type { HistoryItem, QuoteTerms } from './types';

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }
function safeFn(s: string): string { return (s || 'bao-gia').replace(/[<>:"/\\|?*\s]+/g, '_').slice(0, 60); }

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
// DOCX
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportBaoGiaToDocx(item: HistoryItem): Promise<void> {
  const docx = await withTimeout(import('docx'), 10000, 'import docx');
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = docx;

  const vat = layVatThucTe(item.terms);
  const donGia = item.chotGia || item.finalPrice;
  const thanhTien = donGia * item.quantity;
  const tienVat = thanhTien * vat / 100;
  const tongCong = thanhTien + tienVat;

  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  const headerCell = (text: string, width: number) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: { fill: '3d85c6' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'ffffff', font: 'Times New Roman', size: 22 })], alignment: AlignmentType.CENTER })],
  });

  const cell = (text: string, width: number, opts?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, font: 'Times New Roman', size: 22 })],
      alignment: opts?.align || AlignmentType.LEFT,
    })],
  });

  const dataRows = (item.tiers && item.tiers.length > 0)
    ? item.tiers.map((t, i) => new TableRow({ children: [
        cell(String(i + 1), 600, { align: AlignmentType.CENTER }),
        cell(item.productName, 2800),
        cell(item.structure, 2000),
        cell(dinhDangSo(t.quantity), 1200, { align: AlignmentType.RIGHT }),
        cell(dinhDangSo(Math.round(t.chotGia || t.finalPrice)), 1400, { align: AlignmentType.RIGHT }),
        cell(dinhDangSo(Math.round((t.chotGia || t.finalPrice) * t.quantity)), 1600, { align: AlignmentType.RIGHT }),
      ] }))
    : [new TableRow({ children: [
        cell('1', 600, { align: AlignmentType.CENTER }),
        cell(item.productName, 2800),
        cell(item.structure, 2000),
        cell(dinhDangSo(item.quantity), 1200, { align: AlignmentType.RIGHT }),
        cell(dinhDangSo(Math.round(donGia)), 1400, { align: AlignmentType.RIGHT }),
        cell(dinhDangSo(Math.round(thanhTien)), 1600, { align: AlignmentType.RIGHT }),
      ] })];

  const totalRow = new TableRow({ children: [
    new TableCell({ width: { size: 8000, type: WidthType.DXA }, borders, columnSpan: 5,
      children: [new Paragraph({ children: [new TextRun({ text: 'TỔNG CỘNG:', bold: true, font: 'Times New Roman', size: 22 })], alignment: AlignmentType.RIGHT })] }),
    cell(dinhDangSo(Math.round(tongCong)), 1600, { bold: true, align: AlignmentType.RIGHT }),
  ] });

  const table = new Table({
    rows: [
      new TableRow({ children: [
        headerCell('STT', 600), headerCell('Sản phẩm', 2800), headerCell('Quy cách', 2000),
        headerCell('Số lượng', 1200), headerCell('Đơn giá (đ)', 1400), headerCell('Thành tiền (đ)', 1600),
      ] }),
      ...dataRows,
      totalRow,
    ],
  });

  const children: (typeof Paragraph.prototype | typeof Table.prototype)[] = [
    new Paragraph({ children: [new TextRun({ text: 'CÔNG TY CP LAI TRƯỜNG SƠN', bold: true, font: 'Times New Roman', size: 28, color: '1a56db' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: 'BÁO GIÁ', bold: true, font: 'Times New Roman', size: 36, color: '1a56db' })], alignment: AlignmentType.CENTER, spacing: { before: 300 } }),
    new Paragraph({ children: [new TextRun({ text: `${item.quoteCode || ''} — Ngày: ${item.date}`, font: 'Times New Roman', size: 22, color: '555555' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Khách hàng: ${item.customer}`, font: 'Times New Roman', size: 22 })], spacing: { before: 100 } }),
    new Paragraph({ children: [new TextRun({ text: `Sản phẩm: ${item.productName}`, font: 'Times New Roman', size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `Người lập: ${item.sellerName || '—'}`, font: 'Times New Roman', size: 22 })], spacing: { after: 200 } }),
    table as any,
  ];

  if (item.terms) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Điều khoản báo giá', bold: true, font: 'Times New Roman', size: 24 })], spacing: { before: 300 } }));
    if (item.terms.paymentTerms) children.push(new Paragraph({ children: [new TextRun({ text: `Thanh toán: ${item.terms.paymentTerms}`, font: 'Times New Roman', size: 22 })] }));
    if (item.terms.deliveryTime) children.push(new Paragraph({ children: [new TextRun({ text: `Giao hàng: ${item.terms.deliveryTime}`, font: 'Times New Roman', size: 22 })] }));
    if (item.terms.notes) children.push(new Paragraph({ children: [new TextRun({ text: `Ghi chú: ${item.terms.notes}`, font: 'Times New Roman', size: 22 })] }));
  }

  const doc = new Document({ sections: [{ children: children as any[] }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoGia_${safeFn(item.quoteCode || item.productName)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
