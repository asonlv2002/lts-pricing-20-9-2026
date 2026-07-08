"use client";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  PDFDownloadLink,
} from "@react-pdf/renderer";

// ═══════════════════════════════════════════════════════════════════════════════
// BaoGiaPdfDocument — tạo PDF báo giá bằng @react-pdf/renderer, layout 100% DOCX
// ═══════════════════════════════════════════════════════════════════════════════

// ── Register Times New Roman (Unicode, từ Windows Fonts) — khớp font HTML preview ──
Font.register({
  family: "TimesNewRoman",
  fonts: [
    { src: "/fonts/times.ttf", fontWeight: 400 },
    { src: "/fonts/timesbd.ttf", fontWeight: 700 },
    { src: "/fonts/timesi.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});

const FONT = "TimesNewRoman";

// ═══ Column widths (%) — mirrors DOCX DXA proportions ═══
const CW = {
  stt: "4.5%",
  name: "18%",
  desc: "38%",
  unit: "6%",
  qty: "9.5%",
  price: "12.5%",
  total: "11.5%",
};
const BLUE = "#3d85c6";
const BORDER = "1px solid #333";

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    paddingTop: 56,
    paddingBottom: 42,
    paddingLeft: 42,
    paddingRight: 42,
    lineHeight: 1.15,
  },
  // ── Company header ──
  coName: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  coAddr: { textAlign: "center", fontSize: 10, marginBottom: 2 },
  coTax: { textAlign: "center", fontSize: 10, marginBottom: 12 },
  // ── Title ──
  title: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    marginTop: 6,
    marginBottom: 2,
  },
  titleDate: { textAlign: "center", fontSize: 11, marginBottom: 6 },
  // ── Customer info ──
  custLine: { fontSize: 11, marginVertical: 2 },
  custIntro: { fontSize: 11, marginVertical: 6 },
  mgBg: { fontSize: 11, color: "#555", marginVertical: 2 },
  // ── Table ──
  table: {
    width: "100%",
    marginVertical: 8,
    borderLeft: BORDER,
    borderTop: BORDER,
  },
  tableRow: { flexDirection: "row" },
  th: {
    backgroundColor: BLUE,
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  td: {
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  tdAC: { textAlign: "center" },
  tdAR: { textAlign: "right" },
  tdPL: { whiteSpace: "pre-line" as const },
  // ── Summary ──
  totalRow: { flexDirection: "row" },
  totalLabel: {
    width: "88.5%",
    textAlign: "right",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  totalLabelBold: {
    width: "88.5%",
    textAlign: "right",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontWeight: 700,
    fontSize: 10,
  },
  totalValue: {
    width: "11.5%",
    textAlign: "right",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  totalValueBold: {
    width: "11.5%",
    textAlign: "right",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontWeight: 700,
    fontSize: 10,
  },
  // ── Xem tiếp ──
  xemTiep: {
    textAlign: "center",
    fontStyle: "italic",
    color: "#888",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  // ── Notes ──
  luuY: { fontWeight: 700, fontSize: 11, marginTop: 14, marginBottom: 4 },
  luuYItem: { fontSize: 10, marginVertical: 1 },
  // ── Signatures ──
  sigRow: { textAlign: "center" as const, fontSize: 12, fontWeight: 700, marginTop: 30, color: "#1e293b" },
  // ── Number in words ──
  soChu: {
    fontSize: 10,
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN");
}
function escHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    } else if (chuc === 1) parts.push("mười");
    else parts.push(soLe[chuc] + " mươi");
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

function layVatThucTe(terms?: { vatRate: number; vatCustom?: number }): number {
  if (!terms) return 0;
  if (terms.vatRate === -1) return terms.vatCustom ?? 0;
  return terms.vatRate;
}

function layVatTruc(terms?: { vatCylinderRate?: number }): number {
  return terms?.vatCylinderRate ?? 10;
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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (mirror from lib/types.ts)
// ═══════════════════════════════════════════════════════════════════════════════

interface QuoteTier {
  quantity: number;
  finalPrice: number;
  chotGia?: number;
}

interface QuoteProductLine {
  sourceHistoryItemId: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  input: any;
  bagSpec?: any;
  tiers: QuoteTier[];
}

interface HistoryItem {
  id: string;
  date: string;
  customer: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  quoteCode?: string;
  terms?: {
    vatRate: number;
    vatCustom?: number;
    vatCylinderRate?: number;
    paymentTerms?: string;
    deliveryTime?: string;
    notes?: string;
  };
  quoteProducts?: QuoteProductLine[];
  input: any;
  tiers?: QuoteTier[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAG SPEC DESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

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
  spec: any,
  input: any,
  structure: string,
  totalThickness = 0,
): string {
  if (!spec) return structure || "";
  const lines: string[] = [];
  const bagLabel =
    BAG_TYPE_LABELS[spec.bagType] ||
    (spec.bagType ? spec.bagType.toUpperCase() : "");
  if (bagLabel) lines.push(bagLabel + ".");
  if (structure) lines.push("Chất liệu: " + structure + ".");
  if (totalThickness > 0)
    lines.push("Độ dày: " + totalThickness + " mic (± 5 mic).");
  const dimParts: string[] = [];
  const w = spec.widthMm || 0;
  const l = spec.lengthMm || 0;
  if (w && l) dimParts.push("R:" + w + "mm x D:" + l + "mm");
  if (spec.gussetMm > 0) dimParts.push("Hông: " + spec.gussetMm + "mm");
  if (spec.standupBottomSideMm > 0)
    dimParts.push("Đáy: " + (spec.standupBottomSideMm || 0) * 2 + "mm");
  if (spec.backSealMm > 0) {
    const llabel = spec.bagType === "xephong_lech" ? "Lưng lệch" : "Lưng giữa";
    dimParts.push(llabel + ": " + spec.backSealMm + "mm");
  }
  if (dimParts.length) lines.push("Quy cách: " + dimParts.join(". ") + ".");
  if (spec.sideSealMm > 0) lines.push("Hàn biên: " + spec.sideSealMm + "mm.");
  if (spec.hasHeadSeal && spec.headSealMm > 0)
    lines.push("Hàn đầu: " + spec.headSealMm + "mm.");
  if (spec.hasBottomSeal && spec.bottomSealMm > 0)
    lines.push("Hàn đáy: " + spec.bottomSealMm + "mm.");
  if (spec.lidMm > 0) lines.push("Nắp: " + spec.lidMm + "mm.");
  if (spec.hasZipper || input.hasZipper) {
    lines.push(
      spec.zipperDistanceMm > 0
        ? "Có zipper. Tâm zipper cách đầu: " + spec.zipperDistanceMm + "mm."
        : "Có zipper.",
    );
  }
  if (spec.hasHangHole && spec.hangHoleDescription)
    lines.push("Đục lỗ treo: " + spec.hangHoleDescription + ".");
  if (spec.hasHandleHole && spec.handleHoleDescription)
    lines.push("Đục lỗ quai xách: " + spec.handleHoleDescription + ".");
  if (spec.hasTearNotch) {
    const parts = ['Nhấn xé "V"'];
    if (spec.tearNotchFromTopMm > 0)
      parts.push("cách đầu " + spec.tearNotchFromTopMm + "mm");
    if (spec.tearNotchFromBottomMm > 0)
      parts.push("cách đáy " + spec.tearNotchFromBottomMm + "mm");
    lines.push(parts.join(" ") + ".");
  }
  if (spec.hasHalfMoonBottom) lines.push("Đáy bán nguyệt.");
  const colors = input.numColors ?? 0;
  if (colors > 0) lines.push("In " + colors + " màu.");
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

const GROUPS_PER_PAGE = 4;

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
  return products.map((p) => {
    const input = p.input || {};
    const spec = p.bagSpec || {};
    const tiers: { quantity: number; unitPrice: number; total: number }[] = [];
    if (p.tiers && p.tiers.length > 0) {
      for (const t of p.tiers) {
        const up = Math.round(t.chotGia || t.finalPrice);
        tiers.push({
          quantity: t.quantity,
          unitPrice: up,
          total: up * t.quantity,
        });
      }
    } else {
      const up = Math.round(p.chotGia || p.finalPrice);
      tiers.push({
        quantity: p.quantity,
        unitPrice: up,
        total: up * p.quantity,
      });
    }
    const isBag = input.productType !== "mang";
    let totalThickness = 0;
    // Simplified — just use the structure
    const description = buildBagSpecDescription(
      spec,
      input,
      p.structure,
      totalThickness,
    );

    let cylinder: ProductGroup["cylinder"] | undefined;
    if (input.cylLength > 0) {
      cylinder = {
        name: "TRỤC IN " + p.productName,
        dims:
          "K.thước: chiều dài " +
          Math.round(input.cylLength * 1000) +
          "mm × chu vi " +
          Math.round(input.cylCircum * 1000) +
          "mm",
        qty: spec.cylinderQuantity || 1,
        unitPrice: spec.cylinderUnitPrice || 0,
        total: (spec.cylinderQuantity || 1) * (spec.cylinderUnitPrice || 0),
        note: (spec as any).cylinderNote || undefined,
      };
    }
    return { productName: p.productName, tiers, description, isBag, cylinder };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE ROW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function HeaderRow() {
  return (
    <View style={styles.tableRow}>
      <View style={[styles.th, { width: CW.stt }]}>
        <Text>STT</Text>
      </View>
      <View style={[styles.th, { width: CW.name }]}>
        <Text>Tên hàng</Text>
      </View>
      <View style={[styles.th, { width: CW.desc }]}>
        <Text>Mô tả</Text>
      </View>
      <View style={[styles.th, { width: CW.unit }]}>
        <Text>ĐVT</Text>
      </View>
      <View style={[styles.th, { width: CW.qty }]}>
        <Text>Số lượng</Text>
      </View>
      <View style={[styles.th, { width: CW.price }]}>
        <Text>Đơn giá VNĐ</Text>
      </View>
      <View style={[styles.th, { width: CW.total }]}>
        <Text>Thành tiền VNĐ</Text>
      </View>
    </View>
  );
}

function ProductRow({
  stt,
  group,
  tier,
  idx,
  totalRows,
}: {
  stt: number;
  group: ProductGroup;
  tier?: { quantity: number; unitPrice: number; total: number };
  idx: number;
  totalRows: number;
}) {
  const isFirst = idx === 0;
  const isTier = idx < group.tiers.length;
  const isCyl = !isTier && !!group.cylinder;
  const cyl = isCyl ? group.cylinder : undefined;

  if (isFirst) {
    return (
      <View style={styles.tableRow} key={idx}>
        <View style={[styles.td, styles.tdAC, { width: CW.stt }]}>
          <Text>{stt}</Text>
        </View>
        <View style={[styles.td, { width: CW.name }]}>
          <Text>{group.productName}</Text>
        </View>
        <View style={[styles.td, styles.tdPL, { width: CW.desc }]}>
          <Text>{group.description}</Text>
        </View>
        <View style={[styles.td, styles.tdAC, { width: CW.unit }]}>
          <Text>{group.isBag ? "Túi" : "m²"}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.qty }]}>
          <Text>{dinhDangSo(tier!.quantity)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.price }]}>
          <Text>{dinhDangSo(tier!.unitPrice)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.total }]}>
          <Text>{dinhDangSo(tier!.total)}</Text>
        </View>
      </View>
    );
  }
  if (isTier) {
    return (
      <View style={styles.tableRow} key={idx}>
        <View style={[styles.td, { width: CW.stt }]} />
        <View style={[styles.td, { width: CW.name }]} />
        <View style={[styles.td, { width: CW.desc }]} />
        <View style={[styles.td, { width: CW.unit }]} />
        <View style={[styles.td, styles.tdAR, { width: CW.qty }]}>
          <Text>{dinhDangSo(tier!.quantity)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.price }]}>
          <Text>{dinhDangSo(tier!.unitPrice)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.total }]}>
          <Text>{dinhDangSo(tier!.total)}</Text>
        </View>
      </View>
    );
  }
  if (isCyl && cyl) {
    return (
      <View style={styles.tableRow} key={idx}>
        <View style={[styles.td, { width: CW.stt }]} />
        <View style={[styles.td, { width: CW.name }]}>
          <Text>{cyl.name}</Text>
        </View>
        <View style={[styles.td, { width: CW.desc }]}>
          <Text>{cyl.dims}</Text>
          {cyl.note ? (
            <Text style={{ fontStyle: "italic", color: "#64748b", fontSize: 9 }}>
              Ghi chú: {cyl.note}
            </Text>
          ) : null}
        </View>
        <View style={[styles.td, styles.tdAC, { width: CW.unit }]}>
          <Text>trục</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.qty }]}>
          <Text>{dinhDangSo(cyl.qty)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.price }]}>
          <Text>{dinhDangSo(cyl.unitPrice)}</Text>
        </View>
        <View style={[styles.td, styles.tdAR, { width: CW.total }]}>
          <Text>{dinhDangSo(cyl.total)}</Text>
        </View>
      </View>
    );
  }
  return null;
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <View style={bold ? styles.totalLabelBold : styles.totalLabel}>
        <Text>{label}</Text>
      </View>
      <View style={bold ? styles.totalValueBold : styles.totalValue}>
        <Text>{dinhDangSo(Math.round(value))}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function BaoGiaPage({
  item,
  page,
  totalPages,
  pageGroups,
  customerInfo,
}: {
  item: HistoryItem;
  page: number;
  totalPages: number;
  pageGroups: ProductGroup[];
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
}) {
  const isLast = page === totalPages - 1;
  const titleText = page === 0 ? "BẢNG BÁO GIÁ" : "BẢNG BÁO GIÁ (tiếp theo)";
  let sttBase = page * GROUPS_PER_PAGE + 1;
  const vat = layVatThucTe(item.terms);
  const vatTruc = layVatTruc(item.terms);

  // Gather all groups for totals
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
  const allGroups = buildGroups(products);

  const tableRows: React.ReactNode[] = [];

  for (const g of pageGroups) {
    const stt = sttBase++;
    const groupRows = g.tiers.length + (g.cylinder ? 1 : 0);
    for (let i = 0; i < groupRows; i++) {
      const tier = i < g.tiers.length ? g.tiers[i] : undefined;
      tableRows.push(
        <ProductRow
          key={`${stt}-${i}`}
          stt={stt}
          group={g}
          tier={tier}
          idx={i}
          totalRows={groupRows}
        />,
      );
    }
  }

  return (
    <Page size="A4" style={styles.page}>
      {/* Company header */}
      <Text style={styles.coName}>
        CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN
      </Text>
      <Text style={styles.coAddr}>
        SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM
      </Text>
      <Text style={styles.coTax}>
        MST: 1101904518 Mail: baobilaitruongson.la@gmail.com
      </Text>

      {/* Title */}
      <Text style={styles.title}>{titleText}</Text>
      <Text style={styles.titleDate}>Ngày {item.date}</Text>

      {/* Customer info */}
      <Text style={styles.custLine}>Kính gửi: {item.customer || ""}</Text>
      <Text style={styles.custLine}>
        Địa chỉ: {customerInfo?.address || ""}
      </Text>
      <Text style={styles.custLine}>MST: {customerInfo?.taxCode || ""}</Text>
      <Text style={styles.custLine}>
        Điện thoại: {customerInfo?.phone || ""} Fax: {customerInfo?.fax || ""}
      </Text>
      <Text style={styles.custIntro}>
        Chúng tôi xin trân trọng gửi đến quý khách hàng bảng báo giá bao bì chi
        tiết như sau:
      </Text>

      {/* Product table */}
      <View style={styles.table}>
        <HeaderRow />
        {tableRows}

        {isLast ? (
          <>
            {(() => {
              const allTierTotal = allGroups.reduce(
                (s, g) => s + g.tiers.reduce((ss, t) => ss + t.total, 0),
                0,
              );
              const allCylTotal = allGroups.reduce(
                (s, g) => s + (g.cylinder?.total || 0),
                0,
              );
              const grandTotal = allTierTotal + allCylTotal;
              const tienVat =
                (allTierTotal * vat) / 100 + (allCylTotal * vatTruc) / 100;
              const tongCong = grandTotal + tienVat;
              return (
                <>
                  <TotalRow label="CỘNG TIỀN HÀNG:" value={grandTotal} />
                  <TotalRow label="THUẾ GTGT:" value={tienVat} />
                  <TotalRow label="TỔNG THANH TOÁN:" value={tongCong} bold />
                  <View style={styles.totalRow}>
                    <View style={[styles.soChu, { width: "100%" }]}>
                      <Text>
                        Số tiền (viết bằng chữ):{" "}
                        {soSangChu(Math.round(tongCong))}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </>
        ) : (
          <View style={styles.tableRow}>
            <View style={[styles.xemTiep, { width: "100%" }]}>
              <Text>─ Xem tiếp trang sau ─</Text>
            </View>
          </View>
        )}
      </View>

      {/* Terms & signatures (last page only) */}
      {isLast && (
        <>
          {item.terms ? (
            <>
              <Text style={styles.luuY}>Lưu ý:</Text>
              <Text style={styles.luuYItem}>
                - Số lượng thành phẩm có thể tăng hoặc giảm so với đơn đặt hàng:
                ±10%
              </Text>
              {vat > 0 || vatTruc > 0 ? (
                <Text style={styles.luuYItem}>
                  - Thuế VAT: {vat}% đối với hàng hóa, {vatTruc}% đối với trục
                  in
                </Text>
              ) : (
                <Text style={styles.luuYItem}>- Chưa bao gồm thuế VAT</Text>
              )}
              {item.terms.paymentTerms ? (
                <Text style={styles.luuYItem}>
                  - {formatPaymentTerms(item.terms.paymentTerms)}
                </Text>
              ) : null}
              {item.terms.deliveryTime ? (
                <Text style={styles.luuYItem}>
                  - Thời gian giao hàng: {item.terms.deliveryTime}
                </Text>
              ) : null}
              {item.terms.notes ? (
                <Text style={styles.luuYItem}>
                  - Ghi chú: {item.terms.notes}
                </Text>
              ) : null}
            </>
          ) : null}
          <Text style={styles.sigRow}>KH XÁC NHẬN ĐẶT HÀNG                            P.KINH DOANH</Text>
        </>
      )}
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface BaoGiaPdfDocumentProps {
  item: HistoryItem;
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
}

export function BaoGiaPdfDocument({
  item,
  customerInfo,
}: BaoGiaPdfDocumentProps) {
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
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);

  const pages: React.ReactNode[] = [];
  for (let p = 0; p < totalPages; p++) {
    const start = p * GROUPS_PER_PAGE;
    const pageGroups = groups.slice(start, start + GROUPS_PER_PAGE);
    pages.push(
      <BaoGiaPage
        key={p}
        item={item}
        page={p}
        totalPages={totalPages}
        pageGroups={pageGroups}
        customerInfo={customerInfo}
      />,
    );
  }

  return (
    <Document title={`Bảng báo giá ${item.quoteCode || item.customer || ""}`}>
      {pages}
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface BaoGiaReactPdfDownloadProps {
  item: HistoryItem;
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
  className?: string;
}

export function BaoGiaReactPdfDownload({
  item,
  customerInfo,
  className,
}: BaoGiaReactPdfDownloadProps) {
  return (
    <PDFDownloadLink
      document={<BaoGiaPdfDocument item={item} customerInfo={customerInfo} />}
      fileName={`BaoGia_${(item.quoteCode || item.customer || "bao-gia").replace(/[<>:"/\\|?*\s]+/g, "_").slice(0, 60)}.pdf`}
      className={className}
    >
      {({ loading }) => (loading ? "Đang tạo PDF..." : "Tải PDF (React-PDF)")}
    </PDFDownloadLink>
  );
}
