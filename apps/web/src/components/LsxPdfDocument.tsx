"use client";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import type { ProductionOrder, LSXManualFields } from "../lib/types";
import {
  orderHasDivide,
  resolveLsxBagTypeInfo,
  resolveLsxDocxTemplate,
  resolveLsxLaminateRows,
  formatLsxLamWasteText,
  formatLsxCylText,
  formatLsxNumCylinders,
  formatLsxLamProductLine,
  formatLsxLamSupplyLine,
  formatLsxBagNote,
  hienThiPhiHaoIn,
  hienThiPhiHaoTui,
  hienThiThanhPhamIn,
  type LsxDocxTemplateKey,
} from "../lib/lsxExport";
import { formatLsxOrderQuantityParts } from "../lib/lsx-quantity";
import { buildLsxQuyCachLines, lsxBagSizeMm } from "../lib/lsx-quy-cach";
import { buildLsxBagFieldRows, hasLsxZipperDetails } from "../lib/lsx-bag-fields";
import { bagTypeLabelHienThi } from "../lib/lsx-bag-classification";
import { buildLsxLamGridRows } from "../lib/lsx-lam-rows";
import { formatLsxHeaderDate } from "../lib/lsx-header-format";
import { lsxExportBaseName } from "../lib/lsx-msp";
import { formatLsxDivideSummary, layPhiHaoChia, resolveLsxDivideSpec } from "../lib/lsx-divide";
import {
  layDongTheoCongDoan,
  layKhoMangTuNguon,
} from "../lib/lsx-nang-cao";

// Times New Roman — same as BaoGiaPdfDocument / DOCX ground truth
Font.register({
  family: "TimesNewRoman",
  fonts: [
    { src: "/fonts/times.ttf", fontWeight: 400 },
    { src: "/fonts/timesbd.ttf", fontWeight: 700 },
    { src: "/fonts/timesi.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});

const FONT = "TimesNewRoman";
// 0.5pt — khớp DOCX (BorderStyle.SINGLE size 4 = 4/8pt)
const BORDER = "0.5pt solid #000";
const GREEN = "#c2d69b";
const ORANGE = "#fabf8f";

/** Hàng con phải giãn hết chiều cao ô cha để border dọc không dừng giữa chừng. */
export const LSX_PDF_STRETCH_ROW_STYLE = {
  flexDirection: "row" as const,
  flexGrow: 1,
  alignItems: "stretch" as const,
};

/** Bảng con phải sát viền ô cha để border không bị hở do padding mặc định. */
export const LSX_PDF_FLUSH_CELL_STYLE = {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

/** Một hệ cột duy nhất cho mọi dòng MÁY GHÉP: label 36% | tên 38% | khổ 26%. */
export const LSX_PDF_LAM_COLUMNS = {
  label: 36,
  name: 38,
  kho: 26,
  parts: 64,
  partNameWithinParts: 59.375, // 38 / 64
  partKhoWithinParts: 40.625,  // 26 / 64
  singleName: 74,              // label + name
  singleKho: 26,
};

/** Nửa phải tự đóng viền ngoài vì không đi qua component Cell. */
export const LSX_PDF_LAM_HALF_RIGHT_STYLE = {
  width: "50%" as const,
  borderLeft: BORDER,
  borderRight: BORDER,
  borderBottom: BORDER,
};

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 28,
    paddingLeft: 40,
    paddingRight: 32,
    lineHeight: 1.25,
  },
  isoTable: { width: "100%", flexDirection: "row", border: BORDER, marginBottom: 6 },
  isoLeft: { width: "22%", borderRight: BORDER, justifyContent: "center", alignItems: "center", padding: 5 },
  isoMiddle: { width: "36%", borderRight: BORDER },
  isoRight: { width: "42%" },
  isoCompany: { height: 72, justifyContent: "center", borderBottom: BORDER, padding: 5 },
  isoTitle: { flex: 1, justifyContent: "center", alignItems: "center", padding: 5 },
  isoRightRow: { flexDirection: "row", flex: 1, borderBottom: BORDER },
  isoRightRowLast: { flexDirection: "row", flex: 1 },
  isoLbl: { width: "47%", borderRight: BORDER, justifyContent: "center", padding: 5 },
  isoVal: { width: "53%", justifyContent: "center", alignItems: "center", padding: 5, textAlign: "center" },
  isoLogoImage: { width: 86, height: 86, objectFit: "contain" },
  red: { color: "#ff0000" },
  secGreen: {
    backgroundColor: GREEN,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 12,
    padding: 5,
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  secOrange: {
    backgroundColor: ORANGE,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 12,
    padding: 4,
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  table: { width: "100%", borderLeft: BORDER, borderTop: BORDER, marginBottom: 4 },
  row: { flexDirection: "row" },
  cell: {
    borderRight: BORDER,
    borderBottom: BORDER,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 10,
  },
  bold: { fontWeight: 700 },
  center: { textAlign: "center" },
  small: { fontSize: 9 },
  redNote: { color: "#cc0000", fontSize: 9 },
  // MÁY LÀM TÚI: trái ghi chú | phải lưới thông số — 50/50 để kẻ dọc thẳng trục
  bagNote: {
    width: "50%",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 5,
    paddingRight: 6,
  },
  // Kẻ giữa vẽ ở nửa phải (cao hơn) để line phủ hết chiều cao, không bị hở
  bagGrid: { width: "50%", borderLeft: BORDER },
  bagGridRow: { flexDirection: "row" as const, borderTop: BORDER },
  bagGridCell: { width: "50%", paddingHorizontal: 4, paddingVertical: 3 },
  bagGridCellFull: { width: "100%", paddingHorizontal: 4, paddingVertical: 3 },
  bagGridDivider: { borderLeft: BORDER },
  divideGridRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    borderBottom: BORDER,
    marginLeft: -5,
    marginRight: -5,
  },
  divideGridCell: { width: "50%", paddingHorizontal: 5, paddingVertical: 3 },
  divideGridDivider: { borderLeft: BORDER },
  // MÁY IN | MÁY GHÉP: hai nửa 50/50, mỗi nửa tự xếp hàng (không cần ô rỗng đệm)
  lamHalfLeft: { width: "50%", borderBottom: BORDER },
  lamHalfRight: LSX_PDF_LAM_HALF_RIGHT_STYLE,
  lamRow: { flexDirection: "row" as const, alignItems: "stretch" as const },
  lamPrintRow: LSX_PDF_STRETCH_ROW_STYLE,
  lamRowNext: { borderTop: BORDER },
  lamPrintName: { width: "58%", paddingHorizontal: 5, paddingVertical: 4 },
  lamPrintKho: { width: "42%", borderLeft: BORDER, paddingHorizontal: 5, paddingVertical: 4 },
  lamLabel: { width: `${LSX_PDF_LAM_COLUMNS.label}%`, paddingHorizontal: 5, paddingVertical: 4, justifyContent: "center" as const },
  lamPartsCol: { width: `${LSX_PDF_LAM_COLUMNS.parts}%`, flexDirection: "column" as const },
  lamPartRow: { flexDirection: "row" as const, flexGrow: 1 },
  lamPartName: { width: `${LSX_PDF_LAM_COLUMNS.partNameWithinParts}%`, borderLeft: BORDER, paddingHorizontal: 5, paddingVertical: 4 },
  lamPartKho: { width: `${LSX_PDF_LAM_COLUMNS.partKhoWithinParts}%`, borderLeft: BORDER, paddingHorizontal: 5, paddingVertical: 4 },
  lamSingleName: { width: `${LSX_PDF_LAM_COLUMNS.singleName}%`, paddingHorizontal: 5, paddingVertical: 4 },
  lamSingleKho: { width: `${LSX_PDF_LAM_COLUMNS.singleKho}%`, borderLeft: BORDER, paddingHorizontal: 5, paddingVertical: 4 },
  footer: { textAlign: "center", alignItems: "center", paddingVertical: 10 },
  signatureImage: {
    width: 110,
    height: 42,
    objectFit: "contain",
    alignSelf: "center",
    marginTop: 4,
  },
});

/** Ô "Người lập" kèm ảnh chữ ký (base64 data URL snapshot lúc tạo LSX). */
function ChuKyNguoiLap({ m }: { m: LSXManualFields }) {
  return (
    <>
      <Text style={styles.bold}>Người lập:</Text>
      <Text>{m.preparedBy || ""}</Text>
      {m.preparedBySignature ? (
        <Image src={m.preparedBySignature} style={styles.signatureImage} />
      ) : null}
    </>
  );
}

/** Ô "Người duyệt" — ảnh chữ ký từ reviewerSignatureDataUrl (live JOIN từ BE),
 *  fallback text "(Chưa duyệt)" nếu chưa có dataUrl. */
function ChuKyNguoiDuyet({
  reviewerSignatureDataUrl,
  approvedBy,
}: {
  reviewerSignatureDataUrl?: string | null;
  approvedBy?: string;
}) {
  return (
    <>
      <Text style={styles.bold}>Người duyệt:</Text>
      {reviewerSignatureDataUrl ? (
        <Image src={reviewerSignatureDataUrl} style={styles.signatureImage} />
      ) : (
        <Text style={styles.small}>(Chưa duyệt)</Text>
      )}
      {approvedBy ? <Text>{approvedBy}</Text> : null}
    </>
  );
}

function v(val: string | number | null | undefined, suffix = ""): string {
  if (val === null || val === undefined || val === "" || val === 0) return "";
  return String(val) + suffix;
}
function vd(val: string | number | null | undefined, suffix = ""): string {
  if (val === null || val === undefined || val === "" || val === 0) return "…";
  return String(val) + suffix;
}
function qty(n: number): string {
  return n > 0 ? n.toLocaleString("vi-VN") : "…";
}

function Cell({
  children,
  w,
  style,
}: {
  children?: React.ReactNode;
  w?: string | number;
  style?: any;
}) {
  return (
    <View style={[styles.cell, w ? { width: w } : { flex: 1 }, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function Line({ label, value, boldLabel = true }: { label: string; value?: string; boldLabel?: boolean }) {
  return (
    <Text>
      {boldLabel ? <Text style={styles.bold}>{label}</Text> : label}
      {value ?? ""}
    </Text>
  );
}

function DivideDetails({ order }: { order: ProductionOrder }) {
  const spec = resolveLsxDivideSpec(order);
  const m = order.manual;
  // Chi an khi user that su khong co du lieu (regression 2026-08-27:
  // truoc do `if (!spec.valid) return null` lam mat du lieu vua nhap).
  const hasUserData =
    (m.divideWidth ?? 0) > 0
    || (m.divideElements ?? 0) > 0
    || (Array.isArray(m.divideWidths) && m.divideWidths.length > 0);
  if (!hasUserData) return null;
  const filmWidth = spec.filmWidthMm ? `${spec.filmWidthMm}mm` : "…";
  const khoChia = spec.elementCount > 0 ? formatLsxDivideSummary(spec) : vd(spec.defaultWidthMm, "mm");
  return (
    <>
      <View style={styles.divideGridRow}>
        <View style={styles.divideGridCell}>
          <Line label="Khổ màng: " value={filmWidth} />
        </View>
        <View style={[styles.divideGridCell, styles.divideGridDivider]}>
          <Line label="Khổ chia: " value={khoChia} />
        </View>
      </View>
      {/* "Chiều dài" chỉ áp dụng cho SP màng; "Chiều ra cuộn" ẩn khi không điền
          (feedback 2026-09-05 ý 6). */}
      {order.snapshot.productType === "mang" && (
        <Line label="Chiều dài: " value={vd(m.rollLength, "m")} />
      )}
      {(m.divideRollOutWidth ?? 0) > 0 && (
        <Line label="Chiều ra cuộn: " value={`${m.divideRollOutWidth}mm`} />
      )}
      {!!m.divideDesc && <Line label="Mô tả: " value={m.divideDesc} />}
      {!!m.divideNotes && <Line label="Ghi chú: " value={m.divideNotes} />}
    </>
  );
}

/** Giữ API cũ; logic thật nằm ở lsx-bag-fields để PDF/DOCX/HTML không lệch nhau. */
export function shouldRenderZipperDetails(
  snapshot: Pick<ProductionOrder["snapshot"], "hasZipper">,
  manual: Pick<
    LSXManualFields,
    "tamZipperCachMieng" | "tearNotch" | "loTreoInfo" | "useDualCutter"
  >,
): boolean {
  return hasLsxZipperDetails(manual, !!snapshot.hasZipper);
}

function isSingleLayer(s: ProductionOrder["snapshot"], m: LSXManualFields) {
  if (m.laminateLayers && m.laminateLayers.length > 0) return false;
  return !s.layer2Name && !s.layer3Name && !s.layer4Name && !s.layer5Name
    && !m.laminateFilm1 && !m.laminateFilm2;
}

function IsoHeader({ order }: { order: ProductionOrder }) {
  const m = order.manual;
  const lsxNumber = m.lsxNumber || order.id;
  const issuedDate = formatLsxHeaderDate(m.issuedDate);
  const rightRow = (
    label: string,
    value: string,
    last = false,
  ) => (
    <View style={last ? styles.isoRightRowLast : styles.isoRightRow}>
      <View style={styles.isoLbl}>
        <Text style={{ fontStyle: "italic", fontSize: 9 }}>{label}</Text>
      </View>
      <View style={styles.isoVal}>
        <Text style={{ fontSize: 9 }}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.isoTable}>
      <View style={styles.isoLeft}>
        <Image src="/logo-LTS-LA.jpg" style={styles.isoLogoImage} />
      </View>
      <View style={styles.isoMiddle}>
        <View style={styles.isoCompany}>
          <Text style={{ fontSize: 10, textAlign: "center" }}>
            Công Ty CP TM và SX Bao Bì{"\n"}Lai Trường Sơn- Long An
          </Text>
        </View>
        <View style={styles.isoTitle}>
          <Text style={{ fontWeight: 700, fontSize: 12 }}>LỆNH SẢN XUẤT</Text>
        </View>
      </View>
      <View style={styles.isoRight}>
        {rightRow("Ký mã hiệu", "QT.ISO-22-BM02")}
        {rightRow("Lần ban hành", "02")}
        {rightRow("Số:", lsxNumber)}
        {rightRow("Ngày:", issuedDate, true)}
      </View>
    </View>
  );
}

function formatLsxOrderQuantityForPdf(
  manual: Pick<LSXManualFields, "soLuongDHNote" | "quantityTolerancePercent">,
  snapshot: Pick<ProductionOrder["snapshot"], "quantity" | "productType">,
): string {
  const unit = snapshot.productType === "mang" ? "m²" : "túi";
  const base = manual.soLuongDHNote || `${qty(snapshot.quantity)} ${unit}`;
  const parts = formatLsxOrderQuantityParts(base, manual.quantityTolerancePercent ?? 10, unit);
  return parts.dungSai ? `${parts.base} · ${parts.dungSai}` : parts.base;
}

function ProductInfo({ order }: { order: ProductionOrder }) {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== "mang";
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel = isTui
    ? bagTypeLabelHienThi(bagInfo, s.bagType || "", !!s.hasZipper, !!m.lsxBagTypeOverride)
    : "";
  // Khổ màng = khổ dòng In của bảng đặc tả nâng cao; fallback spreadWidth
  // (feedback 2026-09-05 ý 1: Section I phải ra K820mm, không phải khổ chia 400).
  const khoMM = layKhoMangTuNguon({ snapshot: s }, "In") ?? Math.round((s.spreadWidth || 0) * 1000);

  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <View style={[styles.cell, { width: "100%" }, styles.secGreen]}>
          <Text style={styles.bold}>I. THÔNG TIN SẢN PHẨM</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Cell w="100%">
          <Line label="Khách hàng: " value={s.customer || "CÔNG TY ……….."} />
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="45%">
          <Line label="MSP:" value={" " + (m.msp || "TP_0……..")} />
        </Cell>
        <Cell w="55%">
          <Line label="Tên SP:" value={" " + (m.tenSP || s.productName || "")} />
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="45%">
          <Line label="Cấu trúc:" value={" " + (s.structure || "")} />
          <Line label="Khổ màng:" value={khoMM ? ` K${khoMM}mm` : " ..."} />
        </Cell>
        <Cell w="55%">
          {isTui && <Line label="Kiểu túi:" value={" " + bagLabel} />}
          {buildLsxQuyCachLines(m, s).map((line, i) => {
            const idx = line.indexOf(": ");
            if (idx < 0) return <Text key={`qc-${i}`}>{line}</Text>;
            return (
              <Line
                key={`qc-${i}`}
                label={line.slice(0, idx + 2)}
                value={line.slice(idx + 2)}
              />
            );
          })}
          {!isTui && (
            <>
              <Line label="Quy cách cuộn:" value={" " + (m.quyCachCuon || "")} />
              <Line label="Chiều ra cuộn:" value={" " + (m.chieuRaCuonSP || "")} />
            </>
          )}
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="45%">
          <Line label="Số màu:" value={` ${vd(s.numColors)} màu`} />
        </Cell>
        <Cell w="55%">
          <Line
            label="Số lượng:"
            value={" " +               (formatLsxOrderQuantityForPdf(m, s))}
          />
        </Cell>
      </View>
    </View>
  );
}

function MangBody({
  order,
  reviewerSignatureDataUrl,
}: {
  order: ProductionOrder;
  reviewerSignatureDataUrl?: string | null;
}) {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const khoMM = layKhoMangTuNguon({ snapshot: s }, "In") ?? 0;
  const chiaRow = layDongTheoCongDoan(order, "Chia");
  const phiHaoChiaRaw = chiaRow && typeof chiaRow.phiHao === "number" ? chiaRow.phiHao : layPhiHaoChia(order);
  // Phi hao chia: làm tròn số nguyên (ý 8)
  const phiHaoChia = Math.round(phiHaoChiaRaw);

  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <View style={[styles.cell, { width: "100%" }, styles.secOrange]}>
          <Text style={styles.bold}>MÁY IN</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Cell w="50%">
          <Line label="Màng in: " value={m.printFilmName || s.layer1Name || ""} />
        </Cell>
        <Cell w="50%">
          <Line label="Khổ: " value={khoMM ? `${khoMM}mm` : ""} />
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="50%">
          <Line
            label="Quy cách trục: "
            value={formatLsxCylText(m, s, { withMm: true })}
          />
          <Line label="MST: " value={v(m.printMST)} />
        </Cell>
        <Cell w="50%">
          <Line label="Số trục: " value={formatLsxNumCylinders(m, false)} />
          <Line label="Chiều ra cuộn: " value={v(m.printDirection) || v(m.rollOutWidth, "mm")} />
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="100%">
          <Line
            label="Thành phẩm in yêu cầu: "
            value={hienThiThanhPhamIn(order)}
          />
          <Text>{`Định mức phi hao: ${hienThiPhiHaoIn(order)}`}</Text>
          <Text>{`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`}</Text>
          {!!m.printNotes && <Line label="Ghi chú: " value={m.printNotes} />}
          <Line label="Trục in: " value={v(m.cylInfo)} />
        </Cell>
      </View>

      {hasDivide && (
        <>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "100%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY CHIA</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Cell w="100%"><DivideDetails order={order} /></Cell>
          </View>
          <View style={styles.row}>
            <Cell w="100%">
              <Text style={styles.redNote}>
                (Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)
              </Text>
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="100%">
              <Text>{`Định mức phi hao: ${phiHaoChia}m`}</Text>
              {!!m.divideDeliveryReq && (
                <Line label="Khách hàng yêu cầu giao: " value={m.divideDeliveryReq} />
              )}
              {/* Mô tả / Ghi chú chia đã có nhãn trong DivideDetails phía trên
                  — không lặp lại ở đây (fix lặp 2026-09-05). */}
            </Cell>
          </View>
        </>
      )}

      <View style={styles.row}>
        <Cell w="50%" style={styles.footer}>
          <ChuKyNguoiLap m={m} />
        </Cell>
        <Cell w="50%" style={styles.footer}>
          <ChuKyNguoiDuyet
            reviewerSignatureDataUrl={reviewerSignatureDataUrl}
            approvedBy={m.approvedBy}
          />
        </Cell>
      </View>
    </View>
  );
}

/** Lưới thông số máy túi — dùng chung nguồn dữ liệu với DOCX / preview HTML. */
function bagGridRows(
  templateKey: LsxDocxTemplateKey,
  m: LSXManualFields,
  hasZipper: boolean,
  snapshotZipperDistanceMm?: number,
): React.ReactNode[] {
  return buildLsxBagFieldRows(templateKey, m, hasZipper, snapshotZipperDistanceMm).map((row, i) => (
    <View key={`bag-row-${i}`} style={styles.bagGridRow}>
      {row.kind === "pair"
        ? [
            <View key="l" style={styles.bagGridCell}>
              <Line label={row.left.label} value={row.left.value} />
            </View>,
            <View key="r" style={[styles.bagGridCell, styles.bagGridDivider]}>
              <Line label={row.right.label} value={row.right.value} />
            </View>,
          ]
        : (
            <View style={styles.bagGridCellFull}>
              <Line label={row.field.label} value={row.field.value} />
            </View>
          )}
    </View>
  ));
}

function TuiBody({
  order,
  reviewerSignatureDataUrl,
}: {
  order: ProductionOrder;
  reviewerSignatureDataUrl?: string | null;
}) {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const singleLayer = isSingleLayer(s, m);
  const showDivide = hasDivide;
  const useLeftDivide = showDivide && !singleLayer;
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel =
    bagInfo.key === "fallback"
      ? s.bagType || "Túi"
      : bagTypeLabelHienThi(bagInfo, s.bagType || "", !!s.hasZipper, !!m.lsxBagTypeOverride);
  const khoMM = layKhoMangTuNguon({ snapshot: s }, "In") ?? 0;
  const phiHaoTui = hienThiPhiHaoTui(order);
  const bagSize = lsxBagSizeMm(s);
  const templateKey = resolveLsxDocxTemplate(order);
  const bagRows = bagGridRows(templateKey, m, !!s.hasZipper, s.zipperDistanceMm);

  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <View style={[styles.cell, { width: "100%" }, styles.secGreen]}>
          <Text style={styles.bold}>II. CÔNG VIỆC CẦN THỰC HIỆN</Text>
        </View>
      </View>

      {singleLayer && showDivide ? (
        <>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY IN</Text>
            </View>
            <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY CHIA</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Cell w="25%">
              <Line label="Màng in: " value={m.printFilmName || s.layer1Name || ""} />
            </Cell>
            <Cell w="25%">
              <Line label="Khổ: " value={khoMM ? `${khoMM}mm` : ""} />
            </Cell>
            <Cell w="50%">
              <Line label="Chia BTP thành phẩm in: " value="" />
              <Text>
                {m.divideNotes ||
                  (khoMM
                    ? `${m.printFilmName || s.layer1Name || "PE"} × ${khoMM} × ${vd(m.printProductQty)}m`
                    : "")}
              </Text>
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="25%">
              <Line
                label="Trục in: "
                value={formatLsxCylText(m, s)}
              />
              <Line label="Mã Số Trục: " value={v(m.printMST) || "…"} />
            </Cell>
            <Cell w="25%">
              <Line label="Số trục: " value={formatLsxNumCylinders(m, false)} />
              <Line label="Chiều ra cuộn: " value={v(m.printDirection) || "…"} />
            </Cell>
            <Cell w="50%">
              <DivideDetails order={order} />
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="50%">
              <Text>{`Định mức phi hao: ${hienThiPhiHaoIn(order) || "…"}`}</Text>
              <Text>{`Thành phẩm in: ${hienThiThanhPhamIn(order) || "…"}`}</Text>
              {m.materialQtySupplied > 0 && (
                <Text>{`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`}</Text>
              )}
              {!!m.inDesc && <Text>{m.inDesc}</Text>}
              {!!m.printNotes && <Line label="Ghi chú: " value={m.printNotes} />}
            </Cell>
            <Cell w="50%">
              {/* divideNotes đã hiển thị trong DivideDetails phía trên — ô này
                  chỉ còn YC giao hàng để không lặp (fix lặp 2026-09-05). */}
              {!!m.divideDeliveryReq && (
                <Line label="Ghi chú chia: " value={m.divideDeliveryReq} />
              )}
            </Cell>
          </View>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY IN</Text>
            </View>
            <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY GHÉP</Text>
            </View>
          </View>
          {(() => {
            const lamRows = resolveLsxLaminateRows(order);
            const wasteText = formatLsxLamWasteText(lamRows);
            const gridRows = buildLsxLamGridRows(lamRows, khoMM);
            return (
              <>
                {/* Hai nửa 50/50: mỗi nửa tự xếp hàng nên nửa IN không cần ô rỗng đệm */}
                <View style={styles.row}>
                  {/* Nửa IN: 2 cột liền khối, KHÔNG kẻ ngang bên trong — nửa GHÉP
                      có số hàng khác nên kẻ ngang cả hai bên sẽ không gặp nhau
                      ở vạch chia giữa, nhìn như đường kẻ bị đứt đoạn. */}
                  <View style={styles.lamHalfLeft}>
                    <View style={styles.lamPrintRow}>
                      <View style={styles.lamPrintName}>
                        <Line label="Màng in: " value={m.printFilmName || s.layer1Name || ""} />
                        <Line label="Trục in: " value={formatLsxCylText(m, s)} />
                        <Line label="MST: " value={v(m.printMST) || "…"} />
                      </View>
                      <View style={styles.lamPrintKho}>
                        <Line label="Khổ: " value={khoMM ? `${khoMM}mm` : "…"} />
                        <Line label="Số trục: " value={formatLsxNumCylinders(m)} />
                        <Line label="Chiều ra cuộn: " value={v(m.printDirection) || "…"} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.lamHalfRight}>
                    {gridRows.map((row, ri) => {
                      const rowStyle = ri === 0 ? styles.lamRow : [styles.lamRow, styles.lamRowNext];
                      if (row.kind === "dual") {
                        return (
                          <View style={rowStyle} key={`lam-${ri}`}>
                            {/* Ô label gộp dọc: flex tự kéo cao bằng cột phải */}
                            <View style={styles.lamLabel}>
                              <Text style={styles.bold}>{row.label}</Text>
                            </View>
                            <View style={styles.lamPartsCol}>
                              {row.parts.map((p, pi) => (
                                <View
                                  style={pi === 0 ? styles.lamPartRow : [styles.lamPartRow, styles.lamRowNext]}
                                  key={`lam-${ri}-${pi}`}
                                >
                                  <View style={styles.lamPartName}>
                                    <Text>{p.name}</Text>
                                  </View>
                                  <View style={styles.lamPartKho}>
                                    <Line label="Khổ " value={p.khoText} />
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      }
                      return (
                        <View style={rowStyle} key={`lam-${ri}`}>
                          <View style={styles.lamSingleName}>
                            <Line label={`${row.label}: `} value={row.name} />
                          </View>
                          <View style={styles.lamSingleKho}>
                            <Line label="Khổ " value={row.khoText} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
                {/* Ghi chú công đoạn (inDesc/lamDesc) nằm trong block DMPH bên
                    dưới — không render row riêng để tránh khung dư rỗng nửa
                    GHÉP khi chỉ IN có mô tả (feedback 2026-09-05 ý 3+4). */}
                <View style={styles.row}>
                  <Cell w="50%">
                    <Text>{`Định mức phi hao: ${hienThiPhiHaoIn(order) || "…"}`}</Text>
                    <Text>{`Thành phẩm yêu cầu: ${hienThiThanhPhamIn(order) || "…"}`}</Text>
                    {m.materialQtySupplied > 0 && (
                      <Text>{`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`}</Text>
                    )}
                    {!!m.inDesc && <Text>{m.inDesc}</Text>}
                    {!!m.printNotes && <Line label="Ghi chú: " value={m.printNotes} />}
                    {!!m.cylInfo && <Line label="Trục in: " value={m.cylInfo} />}
                  </Cell>
                  <Cell w="50%">
                    <Text>{`Định mức phi hao: ${wasteText || "…"}`}</Text>
                    <Text>{`Thành phẩm yêu cầu: ${formatLsxLamProductLine(m, "…")}`}</Text>
                    {!!m.lamBTPNote && <Text>{m.lamBTPNote}</Text>}
                    {!!m.lamDesc && <Text>{m.lamDesc}</Text>}
                    {/* SL cấp vật tư ghép: chỉ hiện khi có dữ liệu (điền tay) */}
                    {!!formatLsxLamSupplyLine(m, "") && (
                      <Line label="Số lượng cấp vật tư: " value={formatLsxLamSupplyLine(m, "")} />
                    )}
                    {!!m.laminateNotes && <Line label="Ghi chú: " value={m.laminateNotes} />}
                  </Cell>
                </View>
              </>
            );
          })()}
        </>
      )}


      {useLeftDivide ? (
        <View style={styles.row}>
          <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
            <Text style={styles.bold}>MÁY CHIA</Text>
          </View>
          <View style={[styles.cell, { width: "50%" }, styles.secOrange]}>
            <Text style={styles.bold}>MÁY LÀM TÚI</Text>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={[styles.cell, { width: "100%" }, styles.secOrange]}>
            <Text style={styles.bold}>MÁY LÀM TÚI</Text>
          </View>
        </View>
      )}

      <View style={styles.row}>
        {useLeftDivide && (
          <Cell w="50%">
            <DivideDetails order={order} />
            <Text>{`Định mức phi hao chia: ${layPhiHaoChia(order)}m`}</Text>
            {/* Mô tả / Ghi chú chia đã nằm trong DivideDetails — không lặp. */}
          </Cell>
        )}
        <Cell
          w={useLeftDivide ? "50%" : "100%"}
          style={LSX_PDF_FLUSH_CELL_STYLE}
        >
          <View style={LSX_PDF_STRETCH_ROW_STYLE}>
            <View style={styles.bagNote}>
              <Text style={styles.bold}>Ghi chú:</Text>
              <Text style={styles.bold}>{formatLsxBagNote(m)}</Text>
            </View>
            <View style={styles.bagGrid}>
              <View style={styles.bagGridCellFull}>
                <Text style={styles.center}>
                  <Text style={styles.bold}>Kiểu túi: </Text>
                  {bagLabel}
                </Text>
              </View>
              <View style={styles.bagGridRow}>
                <View style={styles.bagGridCell}>
                  <Line label="Chiều rộng: " value={bagSize.widthMm ? `${bagSize.widthMm}mm` : "…"} />
                </View>
                <View style={[styles.bagGridCell, styles.bagGridDivider]}>
                  <Line label="Chiều dài: " value={bagSize.lengthMm ? `${bagSize.lengthMm}mm` : "…"} />
                </View>
              </View>
              {bagRows}
              <View style={styles.bagGridRow}>
                <View style={styles.bagGridCellFull}>
                  <Text style={styles.bold}>{`Định mức phi hao: ${phiHaoTui > 0 ? `${phiHaoTui.toLocaleString("vi-VN")}m` : "…"}`}</Text>
                </View>
              </View>
            </View>
          </View>
        </Cell>
      </View>

      <View style={styles.row}>
        <Cell w="50%" style={styles.footer}>
          <ChuKyNguoiLap m={m} />
        </Cell>
        <Cell w="50%" style={styles.footer}>
          <ChuKyNguoiDuyet
            reviewerSignatureDataUrl={reviewerSignatureDataUrl}
            approvedBy={m.approvedBy}
          />
        </Cell>
      </View>
    </View>
  );
}

export function LsxPdfDocument({
  order,
  reviewerSignatureDataUrl,
}: {
  order: ProductionOrder;
  reviewerSignatureDataUrl?: string | null;
}) {
  const isTui = order.snapshot.productType !== "mang";
  const title = `LSX ${order.manual.lsxNumber || order.id}`;

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <IsoHeader order={order} />
        <ProductInfo order={order} />
        {isTui ? (
          <TuiBody order={order} reviewerSignatureDataUrl={reviewerSignatureDataUrl} />
        ) : (
          <MangBody order={order} reviewerSignatureDataUrl={reviewerSignatureDataUrl} />
        )}
      </Page>
    </Document>
  );
}

export function lsxPdfFileName(order: ProductionOrder): string {
  return `${lsxExportBaseName(order)}.pdf`;
}

/** Download LSX PDF via @react-pdf/renderer (same engine as preview). */
export async function exportLSXtoPDF(
  order: ProductionOrder,
  reviewerSignatureDataUrl?: string | null,
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <LsxPdfDocument order={order} reviewerSignatureDataUrl={reviewerSignatureDataUrl} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = lsxPdfFileName(order);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
