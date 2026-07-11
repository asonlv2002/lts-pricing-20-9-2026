"use client";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ProductionOrder, LSXManualFields } from "../lib/types";
import {
  orderHasDivide,
  resolveLsxBagTypeInfo,
  resolveLsxDocxTemplate,
  type LsxDocxTemplateKey,
} from "../lib/lsxExport";

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
const BORDER = "1px solid #000";
const GREEN = "#c2d69b";
const ORANGE = "#fabf8f";

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 40,
    paddingRight: 32,
    lineHeight: 1.2,
  },
  isoTable: { width: "100%", borderLeft: BORDER, borderTop: BORDER, marginBottom: 6 },
  isoRow: { flexDirection: "row" },
  isoCell: {
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 4,
    fontSize: 9,
  },
  isoLogo: { width: "22%", justifyContent: "center", alignItems: "center" },
  isoCo: { width: "36%", justifyContent: "center" },
  isoLbl: { width: "20%" },
  isoVal: { width: "22%", textAlign: "center" },
  isoTitle: { width: "36%", textAlign: "center", fontWeight: 700, fontSize: 12 },
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
    padding: 4,
    fontSize: 10,
  },
  bold: { fontWeight: 700 },
  center: { textAlign: "center" },
  small: { fontSize: 9 },
  redNote: { color: "#cc0000", fontSize: 9 },
  footer: { textAlign: "center", paddingVertical: 10 },
});

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

function isSingleLayer(s: ProductionOrder["snapshot"], m: LSXManualFields) {
  return !s.layer2Name && !s.layer3Name && !m.laminateFilm1 && !m.laminateFilm2;
}

function IsoHeader({ order }: { order: ProductionOrder }) {
  const m = order.manual;
  return (
    <View style={styles.isoTable}>
      <View style={styles.isoRow}>
        <View style={[styles.isoCell, styles.isoLogo]}>
          <Text style={{ fontWeight: 700, fontSize: 14 }}>LTS</Text>
        </View>
        <View style={[styles.isoCell, styles.isoCo]}>
          <Text style={{ fontSize: 10, textAlign: "center" }}>
            Công Ty CP TM và SX Bao Bì Lai Trường Sơn- Long An
          </Text>
        </View>
        <View style={[styles.isoCell, styles.isoLbl]}>
          <Text style={{ fontStyle: "italic" }}>Ký mã hiệu</Text>
        </View>
        <View style={[styles.isoCell, styles.isoVal]}>
          <Text>QT.ISO-22-BM02</Text>
        </View>
      </View>
      <View style={styles.isoRow}>
        <View style={[styles.isoCell, styles.isoLogo]} />
        <View style={[styles.isoCell, styles.isoCo]} />
        <View style={[styles.isoCell, styles.isoLbl]}>
          <Text style={{ fontStyle: "italic" }}>Lần ban hành</Text>
        </View>
        <View style={[styles.isoCell, styles.isoVal]}>
          <Text>02</Text>
        </View>
      </View>
      <View style={styles.isoRow}>
        <View style={[styles.isoCell, styles.isoLogo]} />
        <View style={[styles.isoCell, styles.isoCo]} />
        <View style={[styles.isoCell, styles.isoLbl]}>
          <Text style={{ fontStyle: "italic" }}>Ngày ban hành</Text>
        </View>
        <View style={[styles.isoCell, styles.isoVal]}>
          <Text>01/03/2025</Text>
        </View>
      </View>
      <View style={styles.isoRow}>
        <View style={[styles.isoCell, styles.isoLogo]} />
        <View style={[styles.isoCell, styles.isoTitle]}>
          <Text style={{ fontWeight: 700, fontSize: 12, textAlign: "center" }}>LỆNH SẢN XUẤT</Text>
        </View>
        <View style={[styles.isoCell, styles.isoLbl]}>
          <Text style={{ fontStyle: "italic" }}>Số LSX:</Text>
        </View>
        <View style={[styles.isoCell, styles.isoVal]}>
          <Text style={styles.red}>{m.lsxNumber || order.id}</Text>
        </View>
      </View>
      <View style={styles.isoRow}>
        <View style={[styles.isoCell, styles.isoLogo]} />
        <View style={[styles.isoCell, styles.isoCo]} />
        <View style={[styles.isoCell, styles.isoLbl]}>
          <Text style={{ fontStyle: "italic" }}>Ngày xuống LSX:</Text>
        </View>
        <View style={[styles.isoCell, styles.isoVal]}>
          <Text style={styles.red}>{m.issuedDate || "…/…./20…"}</Text>
        </View>
      </View>
    </View>
  );
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
  const dlMM = Math.round((s.cutStep || 0) * 1000);

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
          <Line
            label={isTui ? "Kiểu túi:" : "Quy cách:"}
            value={" " + (isTui ? bagLabel : m.quyCachNote || "")}
          />
          <Line
            label="Quy cách:"
            value={
              " " +
              (m.quyCachNote ||
                (isTui && khoMM && dlMM ? `R:${khoMM}mm x D:${dlMM}mm` : ""))
            }
          />
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
            value={" " + (m.soLuongDHNote || qty(s.quantity) + (isTui ? " túi" : " m²"))}
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
            value={v(m.cylDiameter) ? `D:${v(m.cylDiameter)} x CV:${v(m.cylWidth)}mm` : ""}
          />
          <Line label="MST: " value={v(m.printMST)} />
        </Cell>
        <Cell w="50%">
          <Line label="Số trục: " value={vd(m.numCylinders)} />
          <Line label="Chiều ra cuộn: " value={v(m.printDirection) || v(m.rollOutWidth, "mm")} />
        </Cell>
      </View>
      <View style={styles.row}>
        <Cell w="100%">
          <Line
            label="Thành phẩm in yêu cầu: "
            value={v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : "m")}
          />
          <Text>{`Định mức phi hao: ${v(m.printWastePercent, "m")}`}</Text>
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
            <Cell w="50%">
              <Line
                label="Khổ màng: "
                value={
                  khoMM
                    ? `K${khoMM}mm`
                    : s.originalWidthMm
                      ? `K${s.originalWidthMm}mm`
                      : ""
                }
              />
            </Cell>
            <Cell w="50%">
              <Line label="Khổ chia: " value={vd(m.divideWidth || s.divideWidthMm, "mm")} />
            </Cell>
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
          <Text style={styles.bold}>Người lập:</Text>
          <Text>{m.preparedBy || ""}</Text>
        </Cell>
        <Cell w="50%" style={styles.footer}>
          <Text style={styles.bold}>Người Duyệt:</Text>
          <Text>{m.approvedBy || ""}</Text>
        </Cell>
      </View>
    </View>
  );
}

/** Bag-machine field rows — mirrors lsxExport switch(templateKey) */
function bagTemplateLines(
  templateKey: LsxDocxTemplateKey,
  m: LSXManualFields,
): React.ReactNode[] {
  const lines: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => lines.push(node);

  switch (templateKey) {
    case "tui-3-bien":
      push(
        <Text key="b1">
          <Text style={styles.bold}>Dán biên: </Text>
          {v(m.sealEdge) || v(m.hanBien, "mm") || "7mm"}
          {"   "}
          <Text style={styles.bold}>Hàn đầu: </Text>
          {v(m.hanDau, "mm") || "30mm"}
        </Text>,
      );
      push(
        <Line key="b2" label="Đục lỗ: " value={v(m.holePunchInfo) || "…"} />,
      );
      if (m.tearNotch) push(<Line key="b3" label='Nhấn xé "v": ' value={v(m.tearNotch)} />);
      if (m.useDualCutter) {
        push(
          <Text key="b4" style={styles.bold}>
            Sử dụng dao cắt 2 nhịp để cắt
          </Text>,
        );
      }
      if (m.useSemicircularMold) {
        push(
          <Text key="b5" style={styles.bold}>
            Sử dụng khuôn đáy đứng bán nguyệt
          </Text>,
        );
      }
      break;

    case "tui-4-bien":
      push(
        <Text key="f1">
          <Text style={styles.bold}>Hàn biên: </Text>
          {v(m.hanBien, "mm") || "10mm"}
          {"   "}
          <Text style={styles.bold}>Hàn đầu: </Text>
          {v(m.hanDau, "mm") || "50mm"}
        </Text>,
      );
      push(<Line key="f2" label="Xếp hông: " value={v(m.xepHong, "mm") || "…"} />);
      push(
        <Text key="f3">
          {v(m.holePunchInfo) || "Đục 3 lỗ tròn quai xách (Theo Market)"}
        </Text>,
      );
      push(
        <Line key="f4" label="Đục lỗ thông hơi: " value={v(m.ventHoleInfo) || "…"} />,
      );
      break;

    case "tui-dan-lung-giua":
      push(<Line key="d1" label="Hàn đầu: " value={v(m.hanDau, "mm") || "13mm"} />);
      push(
        <Line key="d2" label="Dán lưng: " value={v(m.danLung, "mm") || "13mm"} />,
      );
      if (m.ventHoleInfo) {
        push(
          <Text key="d3">{`Đục lỗ thông hơi: ${m.ventHoleInfo}`}</Text>,
        );
      }
      break;

    case "tui-xep-hong-lung-lech":
      push(<Line key="x1" label="Xếp hông: " value={v(m.xepHong, "mm") || "…"} />);
      push(
        <Text key="x2">
          <Text style={styles.bold}>Dán lưng lệch: </Text>
          {v(m.danLungLech, "mm") || "10mm"}
          {"   "}
          <Text style={styles.bold}>Dán đáy: </Text>
          {v(m.danDay, "mm") || "10mm"}
        </Text>,
      );
      break;

    case "tui-day-dung":
      if (m.tamZipperCachMieng || m.tearNotch) {
        push(
          <Text key="s1">
            <Text style={styles.bold}>Tâm zipper cách miệng: </Text>
            {v(m.tamZipperCachMieng, "mm") || "30mm"}
            {"   "}
            <Text style={styles.bold}>Nhấn xé &quot;v&quot;: </Text>
            {v(m.tearNotch) || "2 bên cách miệng 15mm"}
          </Text>,
        );
      }
      push(
        <Text key="s2">
          <Text style={styles.bold}>Dán biên: </Text>
          {v(m.sealEdge) || v(m.hanBien, "mm") || "10mm"}
          {"   "}
          <Text style={styles.bold}>Xếp đáy: </Text>
          {v(m.foldBottom) || "100mm"}
        </Text>,
      );
      break;

    case "tui-cut-seal":
      if (m.tamZipperCachMieng || m.loTreoInfo) {
        push(
          <Line
            key="c1"
            label="Tâm zipper cách đầu: "
            value={v(m.tamZipperCachMieng, "mm") || "25mm"}
          />,
        );
        push(
          <Line
            key="c2"
            label="Đục treo lỗ tròn: "
            value={
              v(m.loTreoInfo) ||
              "Ø8mm ở giữa khoảng cách miệng túi và tâm zipper"
            }
          />,
        );
      }
      break;

    case "tui-cut-seal-nap-keo":
      push(
        <Text key="n1">
          <Text style={styles.bold}>Nắp: </Text>
          {v(m.nap, "mm") || "35mm"}
          {"   "}
          <Text style={styles.bold}>Sóng siêu âm: </Text>
          {v(m.songSieuAm, "mm") || "32mm"}
        </Text>,
      );
      push(
        <Text key="n2">
          {m.docQuaiXach
            ? "Dọc quai xách: có (cây dọc riêng của khách)"
            : "Dọc quai xách: …"}
        </Text>,
      );
      if (m.danKeoNap) {
        push(<Text key="n3">Dán keo ở mé dưới trong nắp: có</Text>);
      }
      break;

    default:
      push(
        <Text key="def1">
          <Text style={styles.bold}>Hàn biên: </Text>
          {v(m.hanBien, "mm") || v(m.sealEdge) || "…"}
          {"   "}
          <Text style={styles.bold}>Hàn đầu: </Text>
          {v(m.hanDau, "mm") || "…"}
        </Text>,
      );
      if (m.xepHong) push(<Line key="def2" label="Xếp hông: " value={v(m.xepHong, "mm")} />);
      if (m.foldBottom) push(<Line key="def3" label="Xếp đáy: " value={v(m.foldBottom)} />);
      if (m.tamZipperCachMieng) {
        push(
          <Line key="def4" label="Tâm zipper: " value={v(m.tamZipperCachMieng, "mm")} />,
        );
      }
      if (m.tearNotch) push(<Line key="def5" label='Nhấn xé "v": ' value={m.tearNotch} />);
      if (m.holePunchInfo) push(<Text key="def6">{m.holePunchInfo}</Text>);
      if (m.useDualCutter) {
        push(
          <Text key="def7" style={styles.bold}>
            Sử dụng dao cắt 2 nhịp để cắt
          </Text>,
        );
      }
      if (m.useSemicircularMold) {
        push(
          <Text key="def8" style={styles.bold}>
            Sử dụng khuôn đáy đứng bán nguyệt
          </Text>,
        );
      }
      break;
  }

  return lines;
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
  const bagLines = bagTemplateLines(templateKey, m);

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
            <View style={[styles.cell, { width: "40%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY IN</Text>
            </View>
            <View style={[styles.cell, { width: "60%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY CHIA</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Cell w="20%">
              <Line label="Màng in: " value={m.printFilmName || s.layer1Name || ""} />
            </Cell>
            <Cell w="20%">
              <Line label="Khổ: " value={khoMM ? `${khoMM}mm` : ""} />
            </Cell>
            <Cell w="60%">
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
            <Cell w="20%">
              <Line
                label="Trục in: "
                value={v(m.cylDiameter) ? `D${v(m.cylDiameter)} x CV${v(m.cylWidth)}` : ""}
              />
              <Line label="Mã Số Trục: " value={v(m.printMST) || "…"} />
            </Cell>
            <Cell w="20%">
              <Line label="Số trục: " value={vd(m.numCylinders)} />
              <Line label="Chiều ra cuộn: " value={v(m.printDirection) || "…"} />
            </Cell>
            <Cell w="60%">
              <Line
                label="Thành phẩm chia: "
                value={vd(m.divideWidth || s.divideWidthMm, "mm")}
              />
              {!!m.rollLength && <Text>{` × ${v(m.rollLength)}m`}</Text>}
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="40%">
              <Text>{`Định mức phi hao: ${v(m.printWastePercent, "m")}`}</Text>
              <Text>{`Thành phẩm in: ${v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : "m")}`}</Text>
              <Line label="Ghi chú: " value={m.printNotes || ""} />
              <Text>{`- Màu sắc: duyệt màu theo ${v(m.maMucNhu) || "…"}`}</Text>
              <Text>{`- Chiều xả: ${v(m.printDirection) || "…"}`}</Text>
            </Cell>
            <Cell w="60%">
              <Line label="Ghi chú chia: " value="" />
              <Text>{m.divideDeliveryReq || m.divideNotes || ""}</Text>
            </Cell>
          </View>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "40%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY IN</Text>
            </View>
            <View style={[styles.cell, { width: "60%" }, styles.secOrange]}>
              <Text style={styles.bold}>MÁY GHÉP</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Cell w="20%">
              <Line label="Màng in: " value={m.printFilmName || s.layer1Name || ""} />
            </Cell>
            <Cell w="20%">
              <Line label="Khổ: " value={khoMM ? `${khoMM}mm` : ""} />
            </Cell>
            <Cell w="40%">
              <Line label="Màng ghép 1: " value={m.laminateFilm1 || s.layer2Name || ""} />
            </Cell>
            <Cell w="20%">
              <Line label="Khổ: " value={vd(m.laminateFilm1Width || khoMM, "mm")} />
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="20%">
              <Line
                label="Trục in: "
                value={v(m.cylDiameter) ? `D${v(m.cylDiameter)} x CV${v(m.cylWidth)}` : ""}
              />
              <Line label="MST: " value={v(m.printMST) || "…"} />
            </Cell>
            <Cell w="20%">
              <Line label="Số trục: " value={m.numCylinders ? vd(m.numCylinders) : "= số màu"} />
            </Cell>
            <Cell w="40%">
              <Line label="Màng ghép 2: " value={m.laminateFilm2 || s.layer3Name || ""} />
            </Cell>
            <Cell w="20%">
              <Line
                label="Khổ: "
                value={
                  m.laminateFilm2 || s.layer3Name
                    ? khoMM
                      ? `${khoMM}mm`
                      : "…"
                    : ""
                }
              />
            </Cell>
          </View>
          <View style={styles.row}>
            <Cell w="40%">
              <Text>{`Định mức phi hao: ${v(m.printWastePercent, "m")}`}</Text>
              <Text>{`Thành phẩm yêu cầu: ${v(m.printProductQty, m.printProductUnit ? ` ${m.printProductUnit}` : "m")}`}</Text>
              <Line label="Ghi chú: " value={m.printNotes || ""} />
              <Text>{`- Màu sắc: duyệt màu theo ${v(m.maMucNhu) || "…"}`}</Text>
              <Text>{`- Chiều xả: ${v(m.printDirection) || "…"}`}</Text>
              {!!m.cylInfo && <Line label="Trục in: " value={m.cylInfo} />}
            </Cell>
            <Cell w="60%">
              <Text>{`Định mức phi hao: L1: ${v(m.lamWaste, "m")}${m.lamBTP || s.layer3Name ? `, L2: ${v(m.lamBTP, "m")}` : ""}`}</Text>
              <Text>{`Thành phẩm yêu cầu: ${v(m.lamProductQty, m.lamProductUnit ? ` ${m.lamProductUnit}` : "m")}`}</Text>
              {!!m.lamBTPNote && <Text>{m.lamBTPNote}</Text>}
              <Line label="Ghi chú: " value={m.laminateNotes || ""} />
            </Cell>
          </View>
        </>
      )}

      {useLeftDivide ? (
        <View style={styles.row}>
          <View style={[styles.cell, { width: "40%" }, styles.secOrange]}>
            <Text style={styles.bold}>MÁY CHIA</Text>
          </View>
          <View style={[styles.cell, { width: "60%" }, styles.secOrange]}>
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
          <Cell w="40%">
            <Line
              label="Khổ màng: "
              value={
                khoMM
                  ? `${khoMM}mm`
                  : s.originalWidthMm
                    ? `${s.originalWidthMm}mm`
                    : "…"
              }
            />
            <Line label="Khổ chia: " value={vd(m.divideWidth || s.divideWidthMm, "mm")} />
            {!!m.rollLength && <Line label="Chiều dài: " value={vd(m.rollLength, "m")} />}
            <Text>Định mức phi hao chia: 0m</Text>
            <Text>{m.divideNotes || ""}</Text>
          </Cell>
        )}
        <Cell w={useLeftDivide ? "60%" : "100%"}>
          <Text style={styles.center}>
            <Text style={styles.bold}>Kiểu túi: </Text>
            {bagLabel}
          </Text>
          <Text>
            <Text style={styles.bold}>Chiều rộng: </Text>
            {khoMM ? `${khoMM}mm` : "…"}
            {"   "}
            <Text style={styles.bold}>Chiều dài: </Text>
            {dlMM ? `${dlMM}mm` : "…"}
          </Text>
          {bagLines}
          <Text style={styles.bold}>{`Định mức phi hao: ${vd(m.bagWasteMeters, "m")}`}</Text>
          <Text>
            <Text style={styles.bold}>Ghi chú: </Text>
            {m.bagLuuY || m.bagMachineNotes || "chạy theo mẫu đã sản xuất"}
          </Text>
          <Text style={styles.redNote}>
            Ghi chú: {m.bagMachineNotes || "chạy theo mẫu đã sản xuất"}
          </Text>
          {!!m.packagingInfo && <Text>{`SL đóng gói: ${m.packagingInfo}`}</Text>}
          {!!m.soLuongDHNote && (
            <Line label="Số lượng: " value={m.soLuongDHNote} />
          )}
          <Line label="Yêu cầu giao hàng: " value={m.deliveryNotes || m.bagDeliveryReq || ""} />
        </Cell>
      </View>

      <View style={styles.row}>
        <Cell w="40%" style={styles.footer}>
          <Text style={styles.bold}>Người lập:</Text>
          <Text>{m.preparedBy || ""}</Text>
        </Cell>
        <Cell w="60%" style={styles.footer}>
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
  const safe = (s: string) => (s || "unknown").replace(/[<>:"/\\|?*\s]+/g, "_").slice(0, 60);
  return `LSX_${safe(order.manual.lsxNumber || order.id)}_${safe(order.snapshot.customer)}.pdf`;
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
