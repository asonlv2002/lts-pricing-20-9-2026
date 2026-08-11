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
  formatLsxPrintWasteLine,
  formatLsxPrintProductLine,
  formatLsxLamProductLine,
  formatLsxLamSupplyLine,
  type LsxDocxTemplateKey,
} from "../lib/lsxExport";
import { formatLsxOrderQuantity } from "../lib/lsx-quantity";
import { buildLsxQuyCachLines } from "../lib/lsx-quy-cach";
import { buildLsxBagFieldRows, hasLsxZipperDetails } from "../lib/lsx-bag-fields";
import { buildLsxLamGridRows } from "../lib/lsx-lam-rows";
import { formatLsxHeaderDate } from "../lib/lsx-header-format";
import { lsxExportBaseName } from "../lib/lsx-msp";
import { formatLsxDivideSummary, resolveLsxDivideSpec } from "../lib/lsx-divide";

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

function DivideDetails({ order, includeFilmWidth = true }: { order: ProductionOrder; includeFilmWidth?: boolean }) {
  const spec = resolveLsxDivideSpec(order);
  if (!spec.valid) return null;
  return (
    <>
      {includeFilmWidth && (
        <Line label="Khổ màng: " value={spec.filmWidthMm ? `K${spec.filmWidthMm}mm` : "…"} />
      )}
      {spec.elementCount > 0 && (
        <Line label="Số phần tử chia: " value={`${spec.elementCount} phần tử`} />
      )}
      <Line
        label="Khổ chia: "
        value={spec.elementCount > 0 ? formatLsxDivideSummary(spec) : vd(spec.defaultWidthMm, "mm")}
      />
      {spec.elementCount > 0 && spec.widths.length === spec.elementCount && (
        <>
          <Line label="Tổng khổ chia: " value={`${spec.totalWidthMm} / ${spec.filmWidthMm}mm`} />
          {spec.widths.map((width, index) => (
            <Line key={index} label={`Phần tử ${index + 1}: `} value={vd(width, "mm")} />
          ))}
        </>
      )}
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
  const base = manual.soLuongDHNote || `${qty(snapshot.quantity)}${snapshot.productType === "mang" ? " m²" : " túi"}`;
  return formatLsxOrderQuantity(base, manual.quantityTolerancePercent ?? 10);
}

function ProductInfo({ order }: { order: ProductionOrder }) {
  const { snapshot: s, manual: m } = order;
  const isTui = s.productType !== "mang";
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel = isTui
    ? bagInfo.key === "fallback"
      ? s.bagType || "Túi"
      : bagInfo.label
    : "";
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);

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
          <Line label="TSP:" value={" " + (isTui ? "TÚI" : "MÀNG")} />
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
            label="Số lượng đơn hàng:"
            value={" " +               (formatLsxOrderQuantityForPdf(m, s))}
          />
        </Cell>
      </View>
    </View>
  );
}

function MangBody({ order }: { order: ProductionOrder }) {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);

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
            value={formatLsxPrintProductLine(m)}
          />
          <Text>{`Định mức phi hao: ${formatLsxPrintWasteLine(m)}`}</Text>
          <Text>{`Số lượng cấp vật tư: ${v(m.materialQtySupplied)}`}</Text>
          <Line label="Ghi chú: " value={m.printNotes || "Sử dụng màng"} />
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
            <Cell w="50%">
              <Line label="Chiều dài quấn cuộn: " value={vd(m.rollLength, " m")} />
              <Text style={styles.redNote}>
                (Lưu ý: Dựa vào số mét thực tế mà linh động chia cuộn hợp lý)
              </Text>
            </Cell>
            <Cell w="50%">
              <Line
                label="Chiều ra cuộn: "
                value={v(m.chieuRaCuonSP) || vd(m.divideRollOutWidth, "mm")}
              />
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="100%">
              <Text>Định mức phi hao: 0m</Text>
              <Line label="Khách hàng yêu cầu giao: " value={v(m.divideDeliveryReq)} />
              <Text>
                {m.divideNotes ||
                  "Ghi chú: Quấn cuộn đúng quy cách, cuộn lẻ không quá ……m/cuộn"}
              </Text>
              <Text>Cân ký cẩn thận, đảm bảo chính xác tránh sai lệnh quá nhiều.</Text>
              <Text>Đánh dấu từng cặp MT-MS để khách hàng phân biệt.</Text>
              <Text style={styles.bold}>** Lưu ý:</Text>
            </Cell>
          </View>
        </>
      )}

      <View style={styles.row}>
        <Cell w="50%" style={styles.footer}>
          <ChuKyNguoiLap m={m} />
        </Cell>
        <Cell w="50%" style={styles.footer}>
          <Text style={styles.bold}>Người Duyệt:</Text>
          <Text>{m.approvedBy || ""}</Text>
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
): React.ReactNode[] {
  return buildLsxBagFieldRows(templateKey, m, hasZipper).map((row, i) => (
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

function TuiBody({ order }: { order: ProductionOrder }) {
  const { snapshot: s, manual: m } = order;
  const hasDivide = orderHasDivide(order);
  const singleLayer = isSingleLayer(s, m);
  const showDivide = hasDivide;
  const useLeftDivide = showDivide && !singleLayer;
  const bagInfo = resolveLsxBagTypeInfo(order);
  const bagLabel =
    bagInfo.key === "fallback" ? s.bagType || "Túi" : bagInfo.label;
  const khoMM = Math.round((s.spreadWidth || 0) * 1000);
  const dlMM = Math.round((s.cutStep || 0) * 1000);
  const templateKey = resolveLsxDocxTemplate(order);
  const bagRows = bagGridRows(templateKey, m, !!s.hasZipper);

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
              {!!m.rollLength && <Text>{` × ${v(m.rollLength)}m`}</Text>}
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="50%">
              <Text>{`Định mức phi hao: ${formatLsxPrintWasteLine(m, "…")}`}</Text>
              <Text>{`Thành phẩm in: ${formatLsxPrintProductLine(m, "…")}`}</Text>
              <Line label="Ghi chú: " value={m.printNotes || ""} />
              <Text>{`- Màu sắc: duyệt màu theo ${v(m.maMucNhu) || "…"}`}</Text>
            </Cell>
            <Cell w="50%">
              <Line label="Ghi chú chia: " value="" />
              <Text>{m.divideDeliveryReq || m.divideNotes || ""}</Text>
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
                <View style={styles.row}>
                  <Cell w="50%">
                    <Text>{`Định mức phi hao: ${formatLsxPrintWasteLine(m, "…")}`}</Text>
                    <Text>{`Thành phẩm yêu cầu: ${formatLsxPrintProductLine(m, "…")}`}</Text>
                    <Line label="Ghi chú: " value={m.printNotes || ""} />
                    <Text>{`- Màu sắc: duyệt màu theo ${v(m.maMucNhu) || "…"}`}</Text>
                    {!!m.cylInfo && <Line label="Trục in: " value={m.cylInfo} />}
                  </Cell>
                  <Cell w="50%">
                    <Text>{`Định mức phi hao: ${wasteText || "…"}`}</Text>
                    <Text>{`Thành phẩm yêu cầu: ${formatLsxLamProductLine(m, "…")}`}</Text>
                    {!!m.lamBTPNote && <Text>{m.lamBTPNote}</Text>}
                    <Line label="Số lượng cấp vật tư: " value={formatLsxLamSupplyLine(m, "…")} />
                    <Line label="Ghi chú: " value={m.laminateNotes || ""} />
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
            {!!m.rollLength && <Line label="Chiều dài: " value={vd(m.rollLength, "m")} />}
            <Text>Định mức phi hao chia: 0m</Text>
            <Text>{m.divideNotes || ""}</Text>
          </Cell>
        )}
        <Cell
          w={useLeftDivide ? "50%" : "100%"}
          style={LSX_PDF_FLUSH_CELL_STYLE}
        >
          <View style={LSX_PDF_STRETCH_ROW_STYLE}>
            <View style={styles.bagNote}>
              <Text style={styles.bold}>Ghi chú:</Text>
              <Text style={styles.bold}>{m.bagLuuY || ""}</Text>
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
                  <Line label="Chiều rộng: " value={khoMM ? `${khoMM}mm` : "…"} />
                </View>
                <View style={[styles.bagGridCell, styles.bagGridDivider]}>
                  <Line label="Chiều dài: " value={dlMM ? `${dlMM}mm` : "…"} />
                </View>
              </View>
              {bagRows}
              <View style={styles.bagGridRow}>
                <View style={styles.bagGridCellFull}>
                  <Text style={styles.bold}>{`Định mức phi hao: ${vd(m.bagWasteMeters, "m")}`}</Text>
                  <Text>
                    <Text style={styles.bold}>Ghi chú: </Text>
                    {m.bagMachineNotes || m.bagLuuY || "chạy theo mẫu đã sản xuất"}
                  </Text>
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
          <Text style={styles.bold}>Người duyệt:</Text>
          <Text>{m.approvedBy || ""}</Text>
        </Cell>
      </View>
    </View>
  );
}

export function LsxPdfDocument({ order }: { order: ProductionOrder }) {
  const isTui = order.snapshot.productType !== "mang";
  const title = `LSX ${order.manual.lsxNumber || order.id}`;

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <IsoHeader order={order} />
        <ProductInfo order={order} />
        {isTui ? <TuiBody order={order} /> : <MangBody order={order} />}
      </Page>
    </Document>
  );
}

export function lsxPdfFileName(order: ProductionOrder): string {
  return `${lsxExportBaseName(order)}.pdf`;
}

/** Download LSX PDF via @react-pdf/renderer (same engine as preview). */
export async function exportLSXtoPDF(order: ProductionOrder): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<LsxPdfDocument order={order} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = lsxPdfFileName(order);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
