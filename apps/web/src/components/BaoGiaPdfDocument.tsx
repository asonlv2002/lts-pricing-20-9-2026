"use client";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { useCalculatorStore } from "../store/CuaHangTinhGia";
import { boSoCauTruc } from "../lib/format-structure";
import { formatStageDescriptionsForQuote } from "../lib/quote-product-spec";
import { tinhTongDoDayCuaInput } from "../lib/do-day-snapshot";
import {
  estimateQuoteGroupHeight,
  paginateQuoteGroups,
} from "../lib/bao-gia-pagination";
import {
  tinhBaoGia,
  lapDongSanXuat,
  xuLyDongGhiDe,
  tinhGiaHieuLuc,
} from "../lib/manager-calculation";

const LOGO_SRC = "/logo-LTS-LA.jpg";

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
  stt: "6%",
  name: "18%",
  desc: "36.5%",
  unit: "6%",
  qty: "9.5%",
  price: "12.5%",
  total: "11.5%",
};
const BLUE = "#1DA65E";
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
  // ── Company header (layout B: logo trái + chữ cạnh) ──
  coHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  coLogo: {
    width: 64,
    height: 52,
    objectFit: "contain",
    marginRight: 10,
  },
  coText: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  coName: {
    textAlign: "left",
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 2,
  },
  coAddr: { textAlign: "left", fontSize: 9, marginBottom: 2 },
  coTax: { textAlign: "left", fontSize: 9 },
  // ── Title ──
  title: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    marginTop: 6,
    marginBottom: 10,
  },
  titleDate: { textAlign: "center", fontSize: 11, marginTop: 2, marginBottom: 6 },
  // ── Customer info ──
  custLine: { fontSize: 11, marginVertical: 2 },
  kinhGuiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginVertical: 2,
  },
  kinhGuiText: { fontSize: 11, flex: 1, paddingRight: 8 },
  kinhGuiSo: { fontSize: 11, textAlign: "right" },
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
  sigColWrap: { flexDirection: "row" as const, marginTop: 18, paddingHorizontal: 8 },
  sigCol: { flex: 1, alignItems: "center" as const, paddingHorizontal: 4 },
  sigColTitle: { fontSize: 12, fontWeight: 700, color: "#1e293b", textAlign: "center" as const },
  sigColImage: { width: 130, height: 50, objectFit: "contain" as const, marginTop: 6, alignSelf: "center" as const },
  sigColHint: { fontSize: 9, fontStyle: "italic" as const, color: "#888", textAlign: "center" as const, marginTop: 6 },
  // ── Number in words ──
  soChu: {
    fontSize: 10,
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  // ── Override tables ──
  overrideSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "2px solid #333",
  },
  overrideTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: "center",
  },
  overrideTable: {
    width: "100%",
    borderLeft: BORDER,
    borderTop: BORDER,
  },
  overrideHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    color: "#fff",
  },
  overrideHeaderCell: {
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
  },
  overrideRow: {
    flexDirection: "row",
  },
  overrideCell: {
    padding: "2 3",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 9,
  },
  overrideTotalRow: {
    flexDirection: "row",
    padding: "3 4",
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 10,
  },
  overrideChanged: {
    backgroundColor: "#fef2f2",
  },
  overrideDeltaRow: {
    padding: "4 6",
    fontSize: 10,
    fontWeight: 700,
  },
  overrideDeltaUp: {
    backgroundColor: "#fef2f2",
  },
  overrideDeltaDown: {
    backgroundColor: "#ecfdf5",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function dinhDangSo(n: number | null | undefined) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("vi-VN");
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
    quantityTolerance?: number;
    techRequirement?: string;
  };
  quoteProducts?: QuoteProductLine[];
  input: any;
  tiers?: QuoteTier[];
  saleOverrides?: any;
  adminOverrides?: any;
  saleProfitRatePct?: number;
  adminProfitRatePct?: number;
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
          "Chất liệu: Mặt trước" +
            frontSuffix +
            ": " +
            front +
            ", Mặt sau" +
            backSuffix +
            ": " +
            back +
            ".",
        );
      } else {
        lines.push("Chất liệu: Mặt trước: " + front + ", Mặt sau: " + back + ".");
      }
    } else if (chatLieu) {
      lines.push("Chất liệu: " + chatLieu + ".");
    }
  } else if (chatLieu) {
    lines.push("Chất liệu: " + chatLieu + ".");
  }
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
  if (input.productType === "mang") {
    const rollLen = spec.rollLengthM || input.filmRollLength || 0;
    if (rollLen > 0) {
      const khoTrongMM =
        spec.widthMm && spec.widthMm > 0
          ? spec.widthMm
          : Math.round((input.spreadWidth || 0) * 1000);
      lines.push(
        "Quy cách cuộn: K" +
          (khoTrongMM || "…") +
          "mm x " +
          rollLen.toLocaleString("vi-VN") +
          "m/cuộn.",
      );
    }
    const chieuRaCuonMang =
      typeof spec.chieuRaCuonMang === "string" && spec.chieuRaCuonMang.trim()
        ? spec.chieuRaCuonMang.trim()
        : "";
    if (chieuRaCuonMang) lines.push("Chiều ra cuộn màng: " + chieuRaCuonMang + ".");
  }
  if (spec.sideSealMm > 0) lines.push("Hàn biên: " + spec.sideSealMm + "mm.");
  if (spec.hasHeadSeal && spec.headSealMm > 0)
    lines.push("Hàn đầu: " + spec.headSealMm + "mm.");
  if (spec.hasBottomSeal && spec.bottomSealMm > 0)
    lines.push("Hàn đáy: " + spec.bottomSealMm + "mm.");
  if (spec.lidMm > 0) lines.push("Nắp: " + spec.lidMm + "mm.");
  if (spec.hasSongSieuAm && spec.songSieuAmMm > 0)
    lines.push("Từ đầu đến sóng siêu âm: " + spec.songSieuAmMm + "mm.");
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

const PAGE_GROUP_HEIGHT = 500;

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
    const input = p.input || {};
    const spec = p.bagSpec || {};
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
      (spec as any)?.stageDescriptions ?? [],
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

  if (isFirst && group.tiers.length > 0) {
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
        <View style={[styles.td, styles.tdAC, { width: CW.stt }]}>
          <Text>{stt}</Text>
        </View>
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
        <View style={[styles.td, styles.tdAC, { width: CW.stt }]}>
          <Text>{stt}</Text>
        </View>
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
  firstRowNumber,
  customerInfo,
  reviewerSignatureDataUrl,
}: {
  item: HistoryItem;
  page: number;
  totalPages: number;
  pageGroups: ProductGroup[];
  firstRowNumber: number;
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
  reviewerSignatureDataUrl?: string | null;
}) {
  const isLast = page === totalPages - 1;
  let rowNum = firstRowNumber - 1;
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
    const groupRows = g.tiers.length + (g.cylinder ? 1 : 0);
    const groupStart = rowNum + 1;
    rowNum += groupRows;
    tableRows.push(
      <View key={`group-${groupStart}`} wrap={false}>
        {Array.from({ length: groupRows }, (_, i) => {
          const tier = i < g.tiers.length ? g.tiers[i] : undefined;
          return (
            <ProductRow
              key={`${groupStart}-${i}`}
              stt={groupStart + i}
              group={g}
              tier={tier}
              idx={i}
              totalRows={groupRows}
            />
          );
        })}
      </View>,
    );
  }

  return (
    <Page size="A4" style={styles.page}>
      {/* Company header — layout B: logo trái + chữ cạnh */}
      <View style={styles.coHeader}>
        <Image src={LOGO_SRC} style={styles.coLogo} />
        <View style={styles.coText}>
          <Text style={styles.coName}>
            CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN
          </Text>
          <Text style={styles.coAddr}>
            SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM
          </Text>
          <Text style={styles.coTax}>
            MST: 1101904518{"            "}Mail: baobilaitruongson.la@gmail.com
          </Text>
        </View>
      </View>

      {page === 0 && (
        <>
          <Text style={styles.title}>BẢNG BÁO GIÁ</Text>
          <Text style={styles.titleDate}>Ngày {item.date}</Text>

          <View style={styles.kinhGuiRow}>
            <Text style={styles.kinhGuiText}>
              Kính gửi: {item.customer || ""}
            </Text>
            {item.quoteCode ? (
              <Text style={styles.kinhGuiSo}>Số: {item.quoteCode}</Text>
            ) : null}
          </View>
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
        </>
      )}

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
                ±{item.terms.quantityTolerance ?? 10}%
              </Text>
              {item.terms.techRequirement ? (
                <Text style={styles.luuYItem}>
                  - Yêu cầu kỹ thuật: {item.terms.techRequirement}
                </Text>
              ) : null}
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
          <View style={styles.sigColWrap}>
            <View style={styles.sigCol}>
              <Text style={styles.sigColTitle}>KH XÁC NHẬN ĐẶT HÀNG</Text>
              <Text style={styles.sigColHint}>(Ký, ghi rõ họ tên)</Text>
            </View>
            <View style={styles.sigCol}>
              <Text style={styles.sigColTitle}>P. KINH DOANH</Text>
              {reviewerSignatureDataUrl ? (
                <Image src={reviewerSignatureDataUrl} style={styles.sigColImage} />
              ) : (
                <Text style={styles.sigColHint}>(Ký, ghi rõ họ tên)</Text>
              )}
            </View>
          </View>
        </>
      )}
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERRIDE TABLE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function OverrideTablePage({
  title,
  icon,
  rows,
  grandTotal,
  totalChanged,
  profitRatePct,
  defaultProfitRatePct,
  chenhLech,
  donViText,
  lopChenhLech,
  quantity,
}: {
  title: string;
  icon: string;
  rows: { stage: string; name: string; width: string; meters: string; waste: string; inputVL: string; cpsx: string; cpvl: string }[];
  grandTotal: number;
  totalChanged: boolean;
  profitRatePct: number;
  defaultProfitRatePct: number;
  chenhLech: number;
  donViText: string;
  lopChenhLech: string;
  quantity: number;
}) {
  const effectivePct = profitRatePct || defaultProfitRatePct;
  const ln = (grandTotal / Math.max(quantity, 1)) * (effectivePct / 100) * Math.max(quantity, 1);
  const chenhLechText = `${chenhLech >= 0 ? "+" : ""}${dinhDangSo(chenhLech)}`;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coHeader}>
        <Image src={LOGO_SRC} style={styles.coLogo} />
        <View style={styles.coText}>
          <Text style={styles.coName}>
            CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT BAO BÌ LAI TRƯỜNG SƠN- LONG AN
          </Text>
          <Text style={styles.coAddr}>
            SỐ 36, ĐƯỜNG ẤP 7B, XÃ MỸ YÊN, TỈNH TÂY NINH, VIỆT NAM
          </Text>
        </View>
      </View>

      <View style={styles.overrideSection}>
        <Text style={styles.overrideTitle}>
          {icon} {title} ({rows.length} thay đổi)
        </Text>
        <View style={styles.overrideTable}>
          <View style={styles.overrideHeader}>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "10%" }]}><Text>C.đoạn</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "15%" }]}><Text>Vật liệu</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "10%" }]}><Text>Khổ (m)</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "10%" }]}><Text>TP (m)</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "10%" }]}><Text>Hao (m)</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "10%" }]}><Text>Đ.vào NVL (m)</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "12%" }]}><Text>CPSX (đ/m²)</Text></View>
            <View style={[styles.overrideCell, styles.overrideHeaderCell, { width: "13%" }]}><Text>CPVL (đ)</Text></View>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.overrideRow}>
              <View style={[styles.overrideCell, { width: "10%" }]}><Text>{row.stage}</Text></View>
              <View style={[styles.overrideCell, { width: "15%" }]}><Text>{row.name}</Text></View>
              <View style={[styles.overrideCell, { width: "10%" }]}><Text>{row.width}</Text></View>
              <View style={[styles.overrideCell, { width: "10%" }]}><Text>{row.meters}</Text></View>
              <View style={[styles.overrideCell, { width: "10%" }]}><Text>{row.waste}</Text></View>
              <View style={[styles.overrideCell, { width: "10%" }]}><Text>{row.inputVL}</Text></View>
              <View style={[styles.overrideCell, { width: "12%" }]}><Text>{row.cpsx}</Text></View>
              <View style={[styles.overrideCell, { width: "13%" }]}><Text>{row.cpvl}</Text></View>
            </View>
          ))}
          <View style={totalChanged ? [styles.overrideTotalRow, styles.overrideChanged] : styles.overrideTotalRow}>
            <Text>TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN — {dinhDangSo(grandTotal)} đ</Text>
          </View>
          <View style={styles.overrideTotalRow}>
            <Text>Tỷ lệ LN: {effectivePct}% — LN: {dinhDangSo(Math.round(ln))} đ</Text>
          </View>
          <View style={[styles.overrideTotalRow, styles.overrideDeltaRow, lopChenhLech === "override-price-delta-row--up" ? styles.overrideDeltaUp : styles.overrideDeltaDown]}>
            <Text>
              CHÊNH LỆCH SO VỚI GIÁ GỐC: <Text style={{ fontWeight: 700 }}>{chenhLechText} ĐỒNG / {donViText}</Text>
            </Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

function buildOverrideRows(
  rows: Array<{
    stage: string;
    mat: string | null;
    width: number;
    meters: number;
    waste: number;
    inputVL: number;
    cpsx: number;
    costMat: number | null;
    materialDetails?: Array<{ name: string; width: number }>;
  }>,
) {
  const out: {
    stage: string;
    name: string;
    width: string;
    meters: string;
    waste: string;
    inputVL: string;
    cpsx: string;
    cpvl: string;
  }[] = [];

  for (const row of rows) {
    if (row.materialDetails?.length) {
      for (const detail of row.materialDetails) {
        out.push({
          stage: row.stage,
          name: detail.name || '—',
          width: detail.width.toFixed(3),
          meters: row.meters.toFixed(0),
          waste: row.waste.toFixed(0),
          inputVL: row.inputVL.toFixed(0),
          cpsx: row.cpsx.toFixed(0),
          cpvl: row.costMat != null ? row.costMat.toLocaleString('vi-VN') : '—',
        });
      }
    } else {
      out.push({
        stage: row.stage,
        name: row.mat && row.mat !== '-' ? row.mat : '—',
        width: row.width.toFixed(3),
        meters: row.meters.toFixed(0),
        waste: row.waste.toFixed(0),
        inputVL: row.inputVL.toFixed(0),
        cpsx: row.cpsx.toFixed(0),
        cpvl: row.costMat != null ? row.costMat.toLocaleString('vi-VN') : '—',
      });
    }
  }
  return out;
}

interface BaoGiaPdfDocumentProps {
  item: HistoryItem;
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
  reviewerSignatureDataUrl?: string | null;
}

export function BaoGiaPdfDocument({
  item,
  customerInfo,
  reviewerSignatureDataUrl,
}: BaoGiaPdfDocumentProps) {
  const materials = useCalculatorStore((s) => s.materials);
  const constants = useCalculatorStore((s) => s.constants);
  const profitTable = useCalculatorStore((s) => s.profitTable);
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
  const pagedGroups = paginateQuoteGroups(
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
    PAGE_GROUP_HEIGHT,
  );
  const pages: React.ReactNode[] = [];
  let firstRowNumber = 1;

  for (let p = 0; p < pagedGroups.length; p++) {
    const pageGroups = pagedGroups[p];
    pages.push(
      <BaoGiaPage
        key={p}
        item={item}
        page={p}
        totalPages={pagedGroups.length}
        pageGroups={pageGroups}
        firstRowNumber={firstRowNumber}
        customerInfo={customerInfo}
        reviewerSignatureDataUrl={reviewerSignatureDataUrl}
      />,
    );
    firstRowNumber += pageGroups.reduce(
      (total, group) => total + group.tiers.length + (group.cylinder ? 1 : 0),
      0,
    );
  }

  // ── Bảng thay đổi từ Sale / Admin (nếu có) ────────────────────────────────────
  const coSaleOv = !!item.saleOverrides && Object.keys(item.saleOverrides).length > 0;
  const coAdminOv = !!item.adminOverrides && Object.keys(item.adminOverrides).length > 0;

  if (coSaleOv || coAdminOv) {
    const r = tinhBaoGia(item.input, materials, constants, profitTable);
    if (r) {
      const { uniRows } = lapDongSanXuat(r, constants);
      const donViText = r.input.productType === 'mang' ? 'MÉT VUÔNG' : 'TÚI';
      const defaultPct = +(r.profitRate * 100).toFixed(1);
      const saleOv = item.saleOverrides || {};
      const adminOv = item.adminOverrides || {};

      if (coSaleOv) {
        const { rows, grandTotal } = xuLyDongGhiDe(uniRows, {}, saleOv);
        const effPricing = tinhGiaHieuLuc({
          result: r, uniRows,
          saleOverrides: {},
          adminOverrides: saleOv,
          saleProfitRatePct: 0,
          adminProfitRatePct: item.saleProfitRatePct ?? 0,
          profitTable, constants, materials,
        });
        const chenhLech = effPricing.effCostPerUnit - r.costPerUnit;
        const totalChanged = Math.abs(grandTotal - r.totalProductionCost) > 1;
        const lopChenhLech = chenhLech >= 0 ? 'override-price-delta-row--up' : 'override-price-delta-row--down';
        pages.push(
          <OverrideTablePage
            key="sale-override"
            title="THAY ĐỔI TỪ SALE"
            icon="💼"
            rows={buildOverrideRows(rows)}
            grandTotal={grandTotal}
            totalChanged={totalChanged}
            profitRatePct={item.saleProfitRatePct ?? 0}
            defaultProfitRatePct={defaultPct}
            chenhLech={Math.round(chenhLech)}
            donViText={donViText}
            lopChenhLech={lopChenhLech}
            quantity={item.quantity}
          />,
        );
      }

      if (coAdminOv) {
        const { rows, grandTotal } = xuLyDongGhiDe(uniRows, saleOv, adminOv);
        const effPricing = tinhGiaHieuLuc({
          result: r, uniRows,
          saleOverrides: saleOv,
          adminOverrides: adminOv,
          saleProfitRatePct: 0,
          adminProfitRatePct: item.adminProfitRatePct ?? 0,
          profitTable, constants, materials,
        });
        const chenhLech = effPricing.effCostPerUnit - r.costPerUnit;
        const totalChanged = Math.abs(grandTotal - r.totalProductionCost) > 1;
        const lopChenhLech = chenhLech >= 0 ? 'override-price-delta-row--up' : 'override-price-delta-row--down';
        pages.push(
          <OverrideTablePage
            key="admin-override"
            title="THAY ĐỔI TỪ ADMIN"
            icon="👑"
            rows={buildOverrideRows(rows)}
            grandTotal={grandTotal}
            totalChanged={totalChanged}
            profitRatePct={item.adminProfitRatePct ?? 0}
            defaultProfitRatePct={defaultPct}
            chenhLech={Math.round(chenhLech)}
            donViText={donViText}
            lopChenhLech={lopChenhLech}
            quantity={item.quantity}
          />,
        );
      }
    }
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
  reviewerSignatureDataUrl?: string | null;
  className?: string;
}

export function BaoGiaReactPdfDownload({
  item,
  customerInfo,
  reviewerSignatureDataUrl,
  className,
}: BaoGiaReactPdfDownloadProps) {
  return (
    <PDFDownloadLink
      document={<BaoGiaPdfDocument item={item} customerInfo={customerInfo} reviewerSignatureDataUrl={reviewerSignatureDataUrl} />}
      fileName={`BaoGia_${(item.quoteCode || item.customer || "bao-gia").replace(/[<>:"/\\|?*\s]+/g, "_").slice(0, 60)}.pdf`}
      className={className}
    >
      {({ loading }) => (loading ? "Đang tạo PDF..." : "Tải PDF (React-PDF)")}
    </PDFDownloadLink>
  );
}
