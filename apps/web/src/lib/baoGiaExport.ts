// src/lib/baoGiaExport.ts
// Export báo giá ra PDF (print) và DOCX

import type {
  HistoryItem,
  QuoteTerms,
  QuoteProductLine,
  QuoteTier,
} from "./types";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import { boSoCauTruc, buildStructureFromLayers } from "./format-structure";
import { formatStageDescriptionsForQuote } from "./quote-product-spec";
import { tinhTongDoDayCuaInput } from "./do-day-snapshot";
import {
  estimateQuoteGroupHeight,
  paginateQuoteGroupsByPageHeight,
} from "./bao-gia-pagination";

function dinhDangSo(n: number | null | undefined) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("vi-VN");
}
function safeFn(s: string): string {
  return (s || "bao-gia").replace(/[<>:"/\\|?*\s]+/g, "_").slice(0, 60);
}

function soSangChu(n: number): string {
  if (n <= 0) return "Không đồng.";
  const donVi = ["", "nghìn", "triệu", "tỷ"];
  const soLe = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];

  function docNhom(so: number): string {
    const tram = Math.floor(so / 100);
    const chuc = Math.floor((so % 100) / 10);
    const donvi = so % 10;
    const parts: string[] = [];
    if (tram > 0) parts.push(soLe[tram] + " trăm");
    if (chuc === 0) {
      if (tram > 0 && donvi > 0) parts.push("linh");
    } else if (chuc === 1) {
      parts.push("mười");
    } else {
      parts.push(soLe[chuc] + " mươi");
    }
    if (donvi > 0) {
      if (chuc > 0 && donvi === 1) parts.push("mốt");
      else if (chuc > 0 && donvi === 5) parts.push("lăm");
      else parts.push(soLe[donvi]);
    }
    return parts.join(" ").trim();
  }

  const groups: string[] = [];
  let temp = n;
  let idx = 0;
  while (temp > 0) {
    const nhom = temp % 1000;
    if (nhom > 0) {
      const str = docNhom(nhom);
      groups.unshift(idx === 0 ? str : str + " " + donVi[idx]);
    }
    temp = Math.floor(temp / 1000);
    idx++;
  }

  const result = groups.join(" ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng.";
}

function withTimeout<T>(p: Promise<T>, ms: number, lbl: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${lbl}`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        res(v);
      },
      (e) => {
        clearTimeout(t);
        rej(e);
      },
    );
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
  "3bien": "TÚI 3 BIÊN",
  "4bien": "TÚI 4 BIÊN",
  xephong_lech: "TÚI XẾP HÔNG DÁN LƯNG LỆCH",
  xephong_giua: "TÚI XẾP HÔNG DÁN LƯNG GIỮA",
  dayDung: "TÚI ĐÁY ĐỨNG",
  cutSeal: "TÚI CUT SEAL",
  cutSealNapKeo: "TÚI CUT SEAL MỞ MIỆNG CÓ NẮP KEO",
};

function buildBagSpecDescription(
  spec: Record<string, any> | undefined,
  input: Record<string, any>,
  structure: string,
  totalThickness = 0,
): string {
  if (!spec) return boSoCauTruc(structure) || "";
  const lines: string[] = [];
  const bagLabel =
    BAG_TYPE_LABELS[spec.bagType] ||
    (spec.bagType ? spec.bagType.toUpperCase() : "");
  if (bagLabel) lines.push(bagLabel + ".");
  const chatLieu = boSoCauTruc(structure);
  if (spec.structureBack) {
    const front = boSoCauTruc(
      spec.structureSwapped ? spec.structureBack : structure,
    );
    const back = boSoCauTruc(
      spec.structureSwapped ? structure : spec.structureBack,
    );
    if (front && back) {
      if (spec.bagType === "dayDung") {
        const frontSuffix = spec.bottomFollows === "front" ? " + Đáy" : "";
        const backSuffix = spec.bottomFollows === "back" ? " + Đáy" : "";
        lines.push(
          `Chất liệu: Mặt trước${frontSuffix}: ${front}, Mặt sau${backSuffix}: ${back}.`,
        );
      } else {
        lines.push(`Chất liệu: Mặt trước: ${front}, Mặt sau: ${back}.`);
      }
    } else if (chatLieu) {
      lines.push(`Chất liệu: ${chatLieu}.`);
    }
  } else if (chatLieu) {
    lines.push(`Chất liệu: ${chatLieu}.`);
  }
  if (totalThickness > 0)
    lines.push(`Độ dày: ${totalThickness} mic (± 5 mic).`);
  const dimParts: string[] = [];
  const w = spec.widthMm || 0;
  const l = spec.lengthMm || 0;
  if (w && l) dimParts.push(`R:${w}mm x D:${l}mm`);
  if (spec.gussetMm > 0) dimParts.push(`Hông: ${spec.gussetMm}mm`);
  if (spec.standupBottomSideMm > 0)
    dimParts.push(`Đáy: ${(spec.standupBottomSideMm || 0) * 2}mm`);
  if (spec.backSealMm > 0) {
    const llabel = spec.bagType === "xephong_lech" ? "Lưng lệch" : "Lưng giữa";
    dimParts.push(`${llabel}: ${spec.backSealMm}mm`);
  }
  if (dimParts.length) lines.push(`Quy cách: ${dimParts.join(". ")}.`);
  if (input.productType === "mang") {
    const rollLen = spec.rollLengthM || input.filmRollLength || 0;
    if (rollLen > 0)
      lines.push(
        `Chiều dài cuộn: ${rollLen.toLocaleString("vi-VN")} m/cuộn.`,
      );
  }
  if (spec.sideSealMm > 0) lines.push(`Hàn biên: ${spec.sideSealMm}mm.`);
  if (spec.hasHeadSeal && spec.headSealMm > 0)
    lines.push(`Hàn đầu: ${spec.headSealMm}mm.`);
  if (spec.hasBottomSeal && spec.bottomSealMm > 0)
    lines.push(`Hàn đáy: ${spec.bottomSealMm}mm.`);
  if (spec.lidMm > 0) lines.push(`Nắp: ${spec.lidMm}mm.`);
  if (spec.hasSongSieuAm && spec.songSieuAmMm > 0)
    lines.push(`Từ đầu đến sóng siêu âm: ${spec.songSieuAmMm}mm.`);
  if (spec.hasZipper || input.hasZipper) {
    lines.push(
      spec.zipperDistanceMm > 0
        ? `Có zipper. Tâm zipper cách đầu: ${spec.zipperDistanceMm}mm.`
        : "Có zipper.",
    );
  }
  if (spec.hasHangHole && spec.hangHoleDescription)
    lines.push(`Đục lỗ treo: ${spec.hangHoleDescription}.`);
  if (spec.hasHandleHole && spec.handleHoleDescription)
    lines.push(`Đục lỗ quai xách: ${spec.handleHoleDescription}.`);
  if (spec.hasTearNotch) {
    const parts = ['Nhấn xé "V"'];
    if (spec.tearNotchFromTopMm > 0)
      parts.push(`cách đầu ${spec.tearNotchFromTopMm}mm`);
    if (spec.tearNotchFromBottomMm > 0)
      parts.push(`cách đáy ${spec.tearNotchFromBottomMm}mm`);
    lines.push(parts.join(" ") + ".");
  }
  if (spec.hasHalfMoonBottom) lines.push("Đáy bán nguyệt.");
  const colors = input.numColors ?? 0;
  if (colors > 0) lines.push(`In ${colors} màu.`);
  return lines.join("\n");
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
    .page { width: auto !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin-bottom: 0 !important; }
    .page:not(:last-child) { page-break-after: always; }
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
    width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.35);
    border-radius: 1px; margin-bottom: 24px; padding: 20mm 15mm 15mm 15mm;
    box-sizing: border-box; overflow: hidden;
  }
  .co-header { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
  .co-logo { width: 64px; height: 52px; object-fit: contain; flex-shrink: 0; }
  .co-text { flex: 1; min-width: 0; }
  .co-name { text-align: left; font-size: 9pt; font-weight: bold; margin: 0 0 2px; white-space: nowrap; }
  .co-addr { text-align: left; font-size: 9pt; margin: 0 0 2px; }
  .co-tax { text-align: left; font-size: 9pt; margin: 0; }
  .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 6px 0 10px; }
  .title-date { text-align: center; font-size: 11pt; margin: 2px 0 6px; }
  .cust-line { font-size: 11pt; margin: 2px 0; }
  .cust-intro { font-size: 11pt; margin: 6px 0; }
  .mg-bg { font-size: 11pt; color: #555; margin: 2px 0; }
  table.bbg { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 8px 0; }
  table.bbg th, table.bbg td { border: 1px solid #333; padding: 3px 4px; font-size: 10pt; }
  table.bbg th { background: #1DA65E; color: #fff; font-weight: bold; text-align: center; }
  td.ar { text-align: right; }
  td.ac { text-align: center; }
  td.pl { white-space: pre-line; }
  .xem-tiep { text-align: center; font-style: italic; color: #888; font-size: 10pt; }
  .luu-y { font-size: 11pt; font-weight: bold; margin: 14px 0 4px; }
  .luu-y-item { font-size: 10pt; margin: 1px 0; }
  .sig-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-top: 30px; }
  .sig-col { flex: 1; text-align: center; }
  .sig-col-title { font-size: 12pt; font-weight: 700; color: #1e293b; }
  .sig-col-hint { font-size: 9pt; font-style: italic; color: #888; margin-top: 4px; }
  .sig-col-img { display: block; width: 130px; height: 50px; object-fit: contain; margin: 6px auto 0; }
`;

function buildBaoGiaHtmlV2(
  item: HistoryItem,
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  },
  reviewerSignatureDataUrl?: string | null,
): string {
  const products: QuoteProductLine[] = item.quoteProducts?.length
    ? item.quoteProducts
    : [
        {
          sourceHistoryItemId: item.id,
          productName: item.productName,
          structure: item.structure,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
          chotGia: item.chotGia,
          input: item.input,
          tiers: item.tiers || [],
        } as QuoteProductLine,
      ];
  const groups = buildGroups(products);
  const pagedGroups = paginateQuoteGroupsByPageHeight(
    groups.map((group, index) => ({
      ...group,
      id: String(index),
      height: estimateQuoteGroupHeight({
        productName: group.productName,
        description: group.description,
        tierCount: group.tiers.length,
        hasCylinder: Boolean(group.cylinder),
        cylinderDescription: group.cylinder
          ? `${group.cylinder.name}\n${group.cylinder.dims}`
          : "",
      }),
    })),
    (pageIndex) =>
      pageIndex === 0
        ? FIRST_PAGE_GROUP_HEIGHT
        : CONTINUATION_PAGE_GROUP_HEIGHT,
  );
  const vat = layVatThucTe(item.terms);
  const vatTruc = layVatTruc(item.terms);
  const W = {
    stt: "6%",
    name: "18%",
    desc: "36.5%",
    unit: "6%",
    qty: "9.5%",
    price: "12.5%",
    total: "11.5%",
  };

  let pagesHtml = "";
  let firstRowNumber = 1;

  for (let page = 0; page < pagedGroups.length; page++) {
    const pageGroups = pagedGroups[page];
    const isLast = page === pagedGroups.length - 1;
    let rowNum = firstRowNumber - 1;

    // ── Table rows ──
    let tbody = "";

    // Header
    tbody += `<tr><th style="width:${W.stt}">STT</th><th style="width:${W.name}">Tên hàng</th><th style="width:${W.desc}">Mô tả</th><th style="width:${W.unit}">ĐVT</th><th style="width:${W.qty}">Số lượng</th><th style="width:${W.price}">Đơn giá VNĐ</th><th style="width:${W.total}">Thành tiền VNĐ</th></tr>`;

    for (const g of pageGroups) {
      const tierCount = g.tiers.length;
      const cylRows = g.cylinder ? 1 : 0;
      const groupRows = tierCount + cylRows;

      for (let i = 0; i < groupRows; i++) {
        rowNum++;
        const isFirst = i === 0;
        const isTierRow = i < tierCount;
        const tier = isTierRow ? g.tiers[i] : undefined;
        const cyl = !isTierRow && g.cylinder ? g.cylinder : undefined;

        if (isFirst && tierCount > 0) {
          const desc = (g.description || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
          tbody +=
            `<tr>` +
            `<td class="ac">${rowNum}</td>` +
            `<td>${escHtml(g.productName)}</td>` +
            `<td class="pl">${desc}</td>` +
            `<td class="ac">${g.isBag ? "Túi" : "m²"}</td>` +
            `<td class="ar">${dinhDangSo(tier!.quantity)}</td>` +
            `<td class="ar">${dinhDangSo(tier!.unitPrice)}</td>` +
            `<td class="ar">${dinhDangSo(tier!.total)}</td>` +
            `</tr>`;
        } else if (isTierRow && i > 0) {
          tbody +=
            `<tr>` +
            `<td class="ac">${rowNum}</td><td></td><td></td><td></td>` +
            `<td class="ar">${dinhDangSo(tier!.quantity)}</td>` +
            `<td class="ar">${dinhDangSo(tier!.unitPrice)}</td>` +
            `<td class="ar">${dinhDangSo(tier!.total)}</td>` +
            `</tr>`;
        } else if (cyl) {
          tbody +=
            `<tr>` +
            `<td class="ac">${rowNum}</td>` +
            `<td>${escHtml(cyl.name)}</td>` +
            `<td>${escHtml(cyl.dims)}${cyl.note ? `<br><i style="color:#64748b;font-size:9pt">Ghi chú: ${escHtml(cyl.note)}</i>` : ""}</td>` +
            `<td class="ac">trục</td>` +
            `<td class="ar">${dinhDangSo(cyl.qty)}</td>` +
            `<td class="ar">${dinhDangSo(cyl.unitPrice)}</td>` +
            `<td class="ar">${dinhDangSo(cyl.total)}</td>` +
            `</tr>`;
        }
      }
    }

    // Totals (last page only) or "Xem tiếp"
    if (isLast) {
      const allTierTotal = groups.reduce(
        (s, g) => s + g.tiers.reduce((ss, t) => ss + t.total, 0),
        0,
      );
      const allCylTotal = groups.reduce(
        (s, g) => s + (g.cylinder?.total || 0),
        0,
      );
      const grandTotal = allTierTotal + allCylTotal;
      const tienVat =
        (allTierTotal * vat) / 100 + (allCylTotal * vatTruc) / 100;
      const tongCong = grandTotal + tienVat;

      const makeTotal = (label: string, value: number, bold?: boolean) =>
        `<tr><td colspan="6" style="text-align:right;${bold ? "font-weight:bold" : ""}">${label}</td><td class="ar" style="${bold ? "font-weight:bold" : ""}">${dinhDangSo(Math.round(value))}</td></tr>`;

      tbody += makeTotal("CỘNG TIỀN HÀNG:", grandTotal);
      tbody += makeTotal("THUẾ GTGT:", tienVat);
      tbody += makeTotal("TỔNG THANH TOÁN:", tongCong, true);
      tbody += `<tr><td colspan="6">Số tiền (viết bằng chữ): ${soSangChu(Math.round(tongCong))}</td><td></td></tr>`;
    } else {
      tbody += `<tr><td colspan="7" class="xem-tiep">── Xem tiếp trang sau ──</td></tr>`;
    }

    let pageHtml = "";

    pageHtml += `<div class="co-header">`;
    pageHtml += `<img class="co-logo" src="/logo-LTS-LA.jpg" alt="LTS" />`;
    pageHtml += `<div class="co-text">`;
    pageHtml += `<div class="co-name">CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN</div>`;
    pageHtml += `<div class="co-addr">SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM</div>`;
    pageHtml += `<div class="co-tax">MST: 1101904518&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;Mail: baobilaitruongson.la@gmail.com</div>`;
    pageHtml += `</div></div>`;

    if (page === 0) {
      pageHtml += `<div class="title">BẢNG BÁO GIÁ</div>`;
      pageHtml += `<div class="title-date">Ngày ${item.date}</div>`;
      pageHtml += `<div class="cust-line" style="margin-top:6px">Kính gửi: ${escHtml(item.customer || "")}</div>`;
      pageHtml += `<div class="cust-line">Địa chỉ: ${escHtml(customerInfo?.address || "")}</div>`;
      pageHtml += `<div class="cust-line">MST: ${escHtml(customerInfo?.taxCode || "")}</div>`;
      pageHtml += `<div class="cust-line">Điện thoại: ${escHtml(customerInfo?.phone || "")}&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;Fax: ${escHtml(customerInfo?.fax || "")}</div>`;
      pageHtml += `<div class="cust-intro">Chúng tôi xin trân trọng gửi đến quý khách hàng bảng báo giá bao bì chi tiết như sau:</div>`;
    }

    // Table
    pageHtml += `<table class="bbg"><tbody>${tbody}</tbody></table>`;

    // Terms & signatures (last page only)
    if (isLast) {
      if (item.terms) {
        pageHtml += `<div class="luu-y">Lưu ý:</div>`;
        pageHtml += `<div class="luu-y-item">- Số lượng thành phẩm có thể tăng hoặc giảm so với đơn đặt hàng: &plusmn;${item.terms.quantityTolerance ?? 10}%</div>`;
        if (item.terms.techRequirement)
          pageHtml += `<div class="luu-y-item">- Yêu cầu kỹ thuật: ${escHtml(item.terms.techRequirement)}</div>`;
        if (vat > 0 || vatTruc > 0) {
          pageHtml += `<div class="luu-y-item">- Thuế VAT: ${vat}% đối với hàng hóa, ${vatTruc}% đối với trục in</div>`;
        } else {
          pageHtml += `<div class="luu-y-item">- Chưa bao gồm thuế VAT</div>`;
        }
        if (item.terms.paymentTerms)
          pageHtml += `<div class="luu-y-item">- ${escHtml(formatPaymentTerms(item.terms.paymentTerms))}</div>`;
        if (item.terms.deliveryTime)
          pageHtml += `<div class="luu-y-item">- Thời gian giao hàng: ${escHtml(item.terms.deliveryTime)}</div>`;
        if (item.terms.notes)
          pageHtml += `<div class="luu-y-item">- Ghi chú: ${escHtml(item.terms.notes)}</div>`;
      }
      const pkdCol = reviewerSignatureDataUrl
        ? `<div class="sig-col-title">P. KINH DOANH</div><img class="sig-col-img" src="${reviewerSignatureDataUrl}" alt="Chữ ký P. Kinh Doanh" />`
        : `<div class="sig-col-title">P. KINH DOANH</div><div class="sig-col-hint">(Ký, ghi rõ họ tên)</div>`;
      pageHtml += `<div class="sig-row">`
        + `<div class="sig-col"><div class="sig-col-title">KH XÁC NHẬN ĐẶT HÀNG</div><div class="sig-col-hint">(Ký, ghi rõ họ tên)</div></div>`
        + `<div class="sig-col">${pkdCol}</div>`
        + `</div>`;
    }

    pagesHtml += `<div class="page">${pageHtml}</div>`;
    firstRowNumber += pageGroups.reduce(
      (total, group) => total + group.tiers.length + (group.cylinder ? 1 : 0),
      0,
    );
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bảng báo giá ${item.quoteCode || ""}</title><style>${CSS}</style></head><body class="pdf-viewer">
<div class="pdf-toolbar">
  <span class="pdf-toolbar-title">Bảng báo giá ${escHtml(item.quoteCode || item.customer || "")}</span>
  <div class="pdf-toolbar-actions">
    <button class="btn-print" onclick="window.print()">In PDF</button>
    <button onclick="window.close()">Đóng</button>
  </div>
</div>
<div class="pdf-pages">${pagesHtml}</div>
</body></html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPaymentTerms(t: string): string {
  const m = t.trim().match(/^(?:Thanh toán\s+)?(\d+)\s*ng[àa]y$/i);
  if (m) {
    const days = parseInt(m[1]);
    if (days === 0) return "Thanh toán ngay khi nhận hàng";
    return `Thanh toán trong ${days} ngày kể từ ngày nhận hàng`;
  }
  return `Thanh toán: ${t}`;
}

export async function exportBaoGiaToPDF(
  item: HistoryItem,
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  },
  reviewerSignatureDataUrl?: string | null,
): Promise<void> {
  const html = buildBaoGiaHtmlV2(item, customerInfo, reviewerSignatureDataUrl);
  const win = window.open("", "_blank", "width=1000,height=900");
  if (!win) {
    alert("Trình duyệt chặn popup. Vui lòng cho phép popup.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCX export — đa sản phẩm, phân trang 4 group/trang
// ═══════════════════════════════════════════════════════════════════════════════

const FIRST_PAGE_GROUP_HEIGHT = 430;
const CONTINUATION_PAGE_GROUP_HEIGHT = 570;

interface ProductGroup {
  productName: string;
  tiers: { quantity: number; unitPrice: number; total: number }[];
  description: string;
  isBag: boolean;
  cylinder?: {
    name: string;
    dims: string;
    note?: string;
    qty: number;
    unitPrice: number;
    total: number;
  };
}

function buildGroups(products: QuoteProductLine[]): ProductGroup[] {
  return products
    .map((p) => {
    const input = p.input || ({} as any);
    const spec = p.bagSpec || ({} as any);
    const tiers: { quantity: number; unitPrice: number; total: number }[] = [];
    if (p.tiers && p.tiers.length > 0) {
      for (const t of p.tiers) {
        const qty = Number(t.quantity) || 0;
        const up = Math.round(Number(t.chotGia || t.finalPrice) || 0);
        tiers.push({
          quantity: qty,
          unitPrice: up,
          total: up * qty,
        });
      }
    } else {
      const qty = Number(p.quantity) || 0;
      const up = Math.round(Number(p.chotGia || p.finalPrice) || 0);
      tiers.push({
        quantity: qty,
        unitPrice: up,
        total: up * qty,
      });
    }
    const isBag = input.productType !== "mang";

    const totalThickness = tinhTongDoDayCuaInput(input);

    const excludeBag = (p.bagSpec as any)?.includeBagInQuote === false;
    // "Mô tả khác" theo công đoạn của TỪNG sản phẩm → nối vào cột Mô tả
    const stageLines = formatStageDescriptionsForQuote(
      (p.bagSpec as any)?.stageDescriptions ?? [],
    );
    const description = excludeBag
      ? ""
      : [
          buildBagSpecDescription(spec, input, p.structure, totalThickness),
          ...stageLines,
        ]
          .filter(Boolean)
          .join("\n");
    const finalTiers = excludeBag ? [] : tiers;

    let cylinder: ProductGroup["cylinder"] | undefined;
    if (input.cylLength > 0 && spec.includeCylinderInQuote !== false) {
      cylinder = {
        name: `TRỤC IN ${p.productName}`,
        dims: `K.thước: chiều dài ${Math.round(input.cylLength * 1000)}mm × chu vi ${Math.round(input.cylCircum * 1000)}mm`,
        qty: spec.cylinderQuantity || 1,
        unitPrice: spec.cylinderUnitPrice || 0,
        total: (spec.cylinderQuantity || 1) * (spec.cylinderUnitPrice || 0),
        note: (spec as any).cylinderNote || undefined,
      };
    }
    return {
      productName: p.productName || "",
      tiers: finalTiers,
      description: description || "",
      isBag,
      cylinder,
    };
    })
    .filter((g) => g.tiers.length > 0 || g.cylinder);
}

async function loadBaoGiaLogoBytes(): Promise<Uint8Array | null> {
  try {
    const resp = await fetch("/logo-LTS-LA.jpg");
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

export async function exportBaoGiaToDocx(
  item: HistoryItem,
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  },
  reviewerSignatureDataUrl?: string | null,
): Promise<void> {
  const [docx, logoBytes] = await Promise.all([
    withTimeout(import("docx"), 10000, "import docx"),
    loadBaoGiaLogoBytes(),
  ]);
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    BorderStyle,
    ImageRun,
    VerticalAlign,
  } = docx;

  const products: QuoteProductLine[] = item.quoteProducts?.length
    ? item.quoteProducts
    : [
        {
          sourceHistoryItemId: item.id,
          productName: item.productName,
          structure: item.structure,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
          chotGia: item.chotGia,
          input: item.input,
          tiers: item.tiers || [],
        } as QuoteProductLine,
      ];

  const groups = buildGroups(products);
  const pagedGroups = paginateQuoteGroupsByPageHeight(
    groups.map((group, index) => ({
      ...group,
      id: String(index),
      height: estimateQuoteGroupHeight({
        productName: group.productName,
        description: group.description,
        tierCount: group.tiers.length,
        hasCylinder: Boolean(group.cylinder),
        cylinderDescription: group.cylinder
          ? `${group.cylinder.name}\n${group.cylinder.dims}`
          : "",
      }),
    })),
    (pageIndex) =>
      pageIndex === 0
        ? FIRST_PAGE_GROUP_HEIGHT
        : CONTINUATION_PAGE_GROUP_HEIGHT,
  );
  const vat = layVatThucTe(item.terms);
  const vatTruc = layVatTruc(item.terms);

  // ═══ Column widths (DXA) — tổng 9638 ≈ 170mm khổ A4 margin 20mm ═══
  const CW = {
    stt: 580,
    name: 1800,
    desc: 3670,
    unit: 600,
    qty: 950,
    price: 1250,
    total: 1150,
  };
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const FONT = "Times New Roman";
  const FONT_SIZE = 20; // 10pt

  const hdr = (text: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      shading: { fill: "1DA65E" },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              color: "ffffff",
              font: FONT,
              size: FONT_SIZE,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  const tc = (
    text: string,
    w: number,
    opts?: {
      bold?: boolean;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      colSpan?: number;
    },
  ) => {
    const align = opts?.align || AlignmentType.LEFT;
    return new TableCell({
      width: opts?.colSpan ? undefined : { size: w, type: WidthType.DXA },
      borders,
      columnSpan: opts?.colSpan,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [
        new Paragraph({
          children: text.split("\n").flatMap((line, i, arr) => {
            const runs = [
              new TextRun({
                text: line,
                bold: opts?.bold,
                font: FONT,
                size: FONT_SIZE,
              }),
            ];
            return i < arr.length - 1
              ? [...runs, new TextRun({ break: 1 })]
              : runs;
          }),
          alignment: align,
          spacing: { line: 300 },
        }),
      ],
    });
  };

  const emptyCell = (w: number, opts?: { colSpan?: number }) =>
    tc("", w, { colSpan: opts?.colSpan });
  const sections: any[] = [];
  let firstRowNumber = 1;

  for (let page = 0; page < pagedGroups.length; page++) {
    const pageGroups = pagedGroups[page];
    const isLast = page === pagedGroups.length - 1;
    let rowNum = firstRowNumber - 1;

    // ── Table rows for this page ──
    const rows: any[] = [];

    // Header row
    rows.push(
      new TableRow({
        children: [
          hdr("STT", CW.stt),
          hdr("Tên hàng", CW.name),
          hdr("Mô tả", CW.desc),
          hdr("ĐVT", CW.unit),
          hdr("Số lượng", CW.qty),
          hdr("Đơn giá VNĐ", CW.price),
          hdr("Thành tiền VNĐ", CW.total),
        ],
      }),
    );

    for (const g of pageGroups) {
      const tierCount = g.tiers.length;
      const cylRows = g.cylinder ? 1 : 0;
      const groupRows = tierCount + cylRows;

      for (let i = 0; i < groupRows; i++) {
        rowNum++;
        const isFirst = i === 0;
        const isTierRow = i < tierCount;
        const tier = isTierRow ? g.tiers[i] : undefined;
        const cyl = !isTierRow && g.cylinder ? g.cylinder : undefined;

        if (isFirst && g.description) {
          // First row: STT + product name + full description + first tier
          rows.push(
            new TableRow({
              children: [
                tc(String(rowNum), CW.stt, { align: AlignmentType.CENTER }),
                tc(g.productName, CW.name),
                tc(g.description, CW.desc),
                tc(g.isBag ? "Túi" : "m²", CW.unit, {
                  align: AlignmentType.CENTER,
                }),
                tc(dinhDangSo(tier!.quantity), CW.qty, {
                  align: AlignmentType.RIGHT,
                }),
                tc(dinhDangSo(tier!.unitPrice), CW.price, {
                  align: AlignmentType.RIGHT,
                }),
                tc(dinhDangSo(tier!.total), CW.total, {
                  align: AlignmentType.RIGHT,
                }),
              ],
            }),
          );
        } else if (isTierRow && i > 0) {
          // Additional tier row
          rows.push(
            new TableRow({
              children: [
                tc(String(rowNum), CW.stt, { align: AlignmentType.CENTER }),
                emptyCell(CW.name),
                emptyCell(CW.desc),
                emptyCell(CW.unit),
                tc(dinhDangSo(tier!.quantity), CW.qty, {
                  align: AlignmentType.RIGHT,
                }),
                tc(dinhDangSo(tier!.unitPrice), CW.price, {
                  align: AlignmentType.RIGHT,
                }),
                tc(dinhDangSo(tier!.total), CW.total, {
                  align: AlignmentType.RIGHT,
                }),
              ],
            }),
          );
        } else if (cyl) {
          // Cylinder row
          rows.push(
            new TableRow({
              children: [
                tc(String(rowNum), CW.stt, { align: AlignmentType.CENTER }),
                tc(cyl.name, CW.name),
                tc(cyl.dims + (cyl.note ? `\nGhi chú: ${cyl.note}` : ""), CW.desc),
                tc("trục", CW.unit, { align: AlignmentType.CENTER }),
                tc(dinhDangSo(cyl.qty), CW.qty, { align: AlignmentType.RIGHT }),
                tc(dinhDangSo(cyl.unitPrice), CW.price, {
                  align: AlignmentType.RIGHT,
                }),
                tc(dinhDangSo(cyl.total), CW.total, {
                  align: AlignmentType.RIGHT,
                }),
              ],
            }),
          );
        }
      }
    }

    // Totals row (only on last page)
    if (isLast) {
      const allTierTotal = groups.reduce(
        (s, g) => s + g.tiers.reduce((ss, t) => ss + t.total, 0),
        0,
      );
      const allCylTotal = groups.reduce(
        (s, g) => s + (g.cylinder?.total || 0),
        0,
      );
      const grandTotal = allTierTotal + allCylTotal;
      const tienVat =
        (allTierTotal * vat) / 100 + (allCylTotal * vatTruc) / 100;
      const tongCong = grandTotal + tienVat;

      const totalCell = (
        label: string,
        value: number,
        opts?: { bold?: boolean },
      ) =>
        new TableRow({
          children: [
            new TableCell({
              width: {
                size: CW.stt + CW.name + CW.desc + CW.unit + CW.qty + CW.price,
                type: WidthType.DXA,
              },
              borders,
              columnSpan: 6,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      bold: opts?.bold,
                      font: FONT,
                      size: FONT_SIZE,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
            tc(dinhDangSo(Math.round(value)), CW.total, {
              bold: opts?.bold,
              align: AlignmentType.RIGHT,
            }),
          ],
        });

      rows.push(totalCell("CỘNG TIỀN HÀNG:", grandTotal));
      rows.push(totalCell("THUẾ GTGT:", tienVat));
      rows.push(totalCell("TỔNG THANH TOÁN:", tongCong, { bold: true }));
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              width: {
                size: CW.stt + CW.name + CW.desc + CW.unit + CW.qty + CW.price,
                type: WidthType.DXA,
              },
              borders,
              columnSpan: 6,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Số tiền (viết bằng chữ): ${soSangChu(Math.round(tongCong))}`,
                      font: FONT,
                      size: FONT_SIZE,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
            }),
            new TableCell({
              width: { size: CW.total, type: WidthType.DXA },
              borders,
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
      );
    } else {
      // "Xem tiếp" row
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              width: {
                size:
                  CW.stt +
                  CW.name +
                  CW.desc +
                  CW.unit +
                  CW.qty +
                  CW.price +
                  CW.total,
                type: WidthType.DXA,
              },
              borders,
              columnSpan: 7,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "── Xem tiếp trang sau ──",
                      italics: true,
                      font: FONT,
                      size: FONT_SIZE,
                      color: "888888",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
      );
    }

    const table = new Table({ rows }) as any;

    // ── Build page children ──
    const pageChildren: any[] = [];

    // Company header — layout B: logo trái + chữ cạnh (table 2 cột, không border)
    const noBorder = {
      style: BorderStyle.NONE,
      size: 0,
      color: "FFFFFF",
    };
    const noBorders = {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
    };
    const logoW = 1200; // ~21mm
    const textW = 8438;
    const logoChildren = logoBytes
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBytes,
                transformation: { width: 72, height: 58 },
                type: "jpg",
              } as any),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ]
      : [
          new Paragraph({
            children: [
              new TextRun({ text: "LTS", bold: true, font: FONT, size: 28 }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ];
    pageChildren.push(
      new Table({
        width: { size: logoW + textW, type: WidthType.DXA },
        columnWidths: [logoW, textW],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: logoW, type: WidthType.DXA },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: logoChildren,
              }),
              new TableCell({
                width: { size: textW, type: WidthType.DXA },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN",
                        bold: true,
                        font: FONT,
                        size: 18,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM",
                        font: FONT,
                        size: 18,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "MST: 1101904518                Mail: baobilaitruongson.la@gmail.com",
                        font: FONT,
                        size: 18,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 120 },
                  }),
                ],
              }),
            ],
          }),
        ],
      }) as any,
    );

    if (page === 0) {
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "BẢNG BÁO GIÁ", bold: true, font: FONT, size: 32 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 140 },
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Ngày ${item.date}`, font: FONT, size: 22 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 100 },
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Kính gửi: ${item.customer || ""}`, font: FONT, size: 22 }),
          ],
          spacing: { before: 100 },
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Địa chỉ: ${customerInfo?.address || ""}`, font: FONT, size: 22 }),
          ],
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `MST: ${customerInfo?.taxCode || ""}`, font: FONT, size: 22 }),
          ],
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Điện thoại: ${customerInfo?.phone || ""}                    Fax: ${customerInfo?.fax || ""}`, font: FONT, size: 22 }),
          ],
        }),
      );
      pageChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Chúng tôi xin trân trọng gửi đến quý khách hàng bảng báo giá bao bì chi tiết như sau:",
              font: FONT,
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),
      );
    }

    // Product table
    pageChildren.push(table);

    // Terms & signatures (only on last page)
    if (isLast) {
      if (item.terms) {
        pageChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Lưu ý:", bold: true, font: FONT, size: 22 }),
            ],
            spacing: { before: 300 },
          }),
        );
        const notes: string[] = [];
        notes.push(
          `- Số lượng thành phẩm có thể tăng hoặc giảm so với đơn đặt hàng: ±${item.terms.quantityTolerance ?? 10}%`,
        );
        if (item.terms.techRequirement)
          notes.push(`- Yêu cầu kỹ thuật: ${item.terms.techRequirement}`);
        if (vat > 0 || vatTruc > 0) {
          notes.push(
            `- Thuế VAT: ${vat}% đối với hàng hóa, ${vatTruc}% đối với trục in`,
          );
        } else {
          notes.push("- Chưa bao gồm thuế VAT");
        }
        if (item.terms.paymentTerms)
          notes.push(`- ${formatPaymentTerms(item.terms.paymentTerms)}`);
        if (item.terms.deliveryTime)
          notes.push(`- Thời gian giao hàng: ${item.terms.deliveryTime}`);
        if (item.terms.notes) notes.push(`- Ghi chú: ${item.terms.notes}`);
        for (const n of notes) {
          pageChildren.push(
            new Paragraph({
              children: [new TextRun({ text: n, font: FONT, size: 20 })],
            }),
          );
        }
      }
      // Signatures — bảng 2 cột: KH / P.KD (ảnh chữ ký reviewer đặt trong P.KD)
      pageChildren.push(
        new Paragraph({ children: [], spacing: { before: 400 } }),
      );
      const sigColWidth = Math.floor(9638 / 2);
      const sigCellOpts = (w: number) => ({
        width: { size: w, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "ffffff" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "ffffff" },
          left: { style: BorderStyle.NONE, size: 0, color: "ffffff" },
          right: { style: BorderStyle.NONE, size: 0, color: "ffffff" },
        },
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
      });
      const sigTitlePara = (text: string) =>
        new Paragraph({
          children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: "1e293b" })],
          alignment: AlignmentType.CENTER,
        });
      const sigHintPara = (text: string) =>
        new Paragraph({
          children: [new TextRun({ text, font: FONT, size: 18, italics: true, color: "888888" })],
          alignment: AlignmentType.CENTER,
        });
      const pkdParas = (() => {
        const title = sigTitlePara("P. KINH DOANH");
        if (!reviewerSignatureDataUrl) {
          return [title, sigHintPara("(Ký, ghi rõ họ tên)")];
        }
        const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(reviewerSignatureDataUrl);
        if (!match) {
          return [title, sigHintPara("(Lỗi ảnh chữ ký)")];
        }
        const binary = atob(match[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return [
          title,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              new ImageRun({ data: bytes, transformation: { width: 130, height: 50 }, type: "png" }),
            ],
          }),
        ];
      })();
      const sigTable = new Table({
        width: { size: 9638, type: WidthType.DXA },
        columnWidths: [sigColWidth, sigColWidth],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                ...sigCellOpts(sigColWidth),
                children: [sigTitlePara("KH XÁC NHẬN ĐẶT HÀNG"), sigHintPara("(Ký, ghi rõ họ tên)")],
              }),
              new TableCell({
                ...sigCellOpts(sigColWidth),
                children: pkdParas,
              }),
            ],
          }),
        ],
      });
      pageChildren.push(sigTable);
    }

    sections.push({
      properties: {
        page: {
          margin: { top: 1134, bottom: 851, left: 851, right: 851 }, // 20mm top, 15mm others (DXA)
        },
      },
      children: pageChildren,
    });
    firstRowNumber += pageGroups.reduce(
      (total, group) => total + group.tiers.length + (group.cylinder ? 1 : 0),
      0,
    );
  }

  // Remove page breaks between sections (docx puts them automatically per section)
  // Actually, the docx library adds page breaks between sections by default
  const doc = new Document({ sections: sections as any[] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BaoGia_${safeFn(item.quoteCode || item.customer)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW — mở cửa sổ HTML, toolbar có nút In PDF
// ═══════════════════════════════════════════════════════════════════════════════
export async function previewBaoGia(
  item: HistoryItem,
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  },
  reviewerSignatureDataUrl?: string | null,
): Promise<void> {
  const html = buildBaoGiaHtmlV2(item, customerInfo, reviewerSignatureDataUrl);
  const win = window.open("", "_blank", "width=1000,height=900");
  if (!win) {
    alert("Trình duyệt chặn popup. Vui lòng cho phép popup.");
    return;
  }
  win.document.title = `Bảng báo giá ${item.quoteCode || item.customer || ""}`;
  win.document.write(html);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — dựng HistoryItem từ dữ liệu server (BaoGiaApi)
// ═══════════════════════════════════════════════════════════════════════════════

interface BaoGiaApiLoose {
  id?: string;
  quotationName?: string | null;
  inputValue?: unknown;
  pricingSheets?: Array<{
    id?: string;
    pricingSheetName?: string;
    customer?: { codeName?: string } | null;
    inputValue?: Record<string, unknown>;
    saleResult?: { finalPrice?: number } | null;
    masterResult?: { finalPrice?: number } | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export function buildHistoryItemFromServerData(
  bg: BaoGiaApiLoose,
): Partial<HistoryItem> & {
  date?: string;
  quoteCode?: string;
  terms?: QuoteTerms;
} {
  const { materials } = dungCuaHangTinhGia.getState();
  const inputValue = (bg.inputValue ?? {}) as Record<string, unknown>;
  const sheets = bg.pricingSheets ?? [];
  const firstSheet = sheets[0];
  const firstInput = (firstSheet?.inputValue ?? {}) as Record<string, unknown>;
  const bagSpecs =
    (inputValue.productBagSpecs as Array<{
      productName?: string;
      pricingSheetId?: string;
      sourceHistoryItemId?: string;
      bagSpec?: Record<string, unknown>;
      finalPrice?: number;
      chotGia?: number;
    }>) ?? [];

  const customer =
    (inputValue.customer as string) ||
    (firstInput?.customer as string) ||
    firstSheet?.customer?.codeName ||
    "";

  const mapSheetToProduct = (
    sheet: NonNullable<BaoGiaApiLoose["pricingSheets"]>[number],
    spec?: (typeof bagSpecs)[number],
  ): QuoteProductLine => {
    const sheetInput = (sheet?.inputValue ?? {}) as Record<string, unknown>;
    const productName =
      spec?.productName || sheet?.pricingSheetName || (sheetInput.productName as string) || "";
    const structure = buildStructureFromLayers(materials, [
      sheetInput?.layer1Id as string,
      sheetInput?.layer2Id as string,
      sheetInput?.layer3Id as string,
      sheetInput?.layer4Id as string,
      sheetInput?.layer5Id as string,
    ]);
    const quantity = Number(sheetInput?.quantity) || 0;
    const finalPrice =
      Number(
        spec?.finalPrice ??
          (sheet?.saleResult as any)?.finalPrice ??
          (sheet?.masterResult as any)?.finalPrice ??
          0,
      ) || 0;
    const chotGia = Number(spec?.chotGia) || 0;
    return {
      sourceHistoryItemId:
        spec?.sourceHistoryItemId || spec?.pricingSheetId || sheet?.id || "",
      productName,
      structure,
      quantity,
      finalPrice,
      chotGia,
      input: sheetInput as any,
      tiers: [{ quantity, chotGia, finalPrice } as QuoteTier],
      bagSpec: (spec?.bagSpec as any) || undefined,
    } as QuoteProductLine;
  };

  const quoteProducts: QuoteProductLine[] =
    bagSpecs.length > 0
      ? bagSpecs.map((spec) => {
          const sheet =
            sheets.find((s) => s.id === spec.pricingSheetId) || sheets[0] || {};
          return mapSheetToProduct(sheet, spec);
        })
      : sheets.map((sheet) => mapSheetToProduct(sheet));

  const mainProduct = quoteProducts[0];
  const dateStr = bg.createdAt
    ? new Date(bg.createdAt).toLocaleDateString("vi-VN")
    : "";
  const quoteCode = bg.quotationName || bg.id?.slice(0, 8) || "";

  return {
    customer,
    productName:
      mainProduct?.productName || (firstInput?.productName as string) || "",
    structure:
      mainProduct?.structure ||
      buildStructureFromLayers(materials, [
        firstInput?.layer1Id as string,
        firstInput?.layer2Id as string,
      ]),
    quantity: mainProduct?.quantity ?? (firstInput?.quantity as number) ?? 0,
    finalPrice: mainProduct?.finalPrice ?? 0,
    chotGia: mainProduct?.chotGia ?? 0,
    input: firstInput as any,
    quoteProducts,
    tiers: [],
    date: dateStr,
    quoteCode,
    terms: {
      vatRate: (inputValue.vatRate as number) ?? 8,
      paymentTerms:
        (inputValue.paymentTerms as string) ||
        (firstInput?.paymentDays === 0 ? "Thanh toán ngay khi nhận hàng" : ""),
      notes: (inputValue.notes as string) || "",
      deliveryTime: (inputValue.deliveryTime as string) || "",
    },
  } as any;
}
