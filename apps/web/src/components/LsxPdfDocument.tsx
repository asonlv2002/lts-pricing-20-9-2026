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
import type { ProductionOrder } from "../lib/types";
import {
  orderHasDivide,
  resolveLsxBagTypeInfo,
} from "../lib/lsxExport";

// Times New Roman — same as BaoGiaPdfDocument
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
  // ISO header
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
  // Section
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

function isSingleLayer(s: ProductionOrder["snapshot"], m: ProductionOrder["manual"]) {
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
              <Line label="Chia BTP: " value={m.divideNotes || ""} />
              <Line label="Khổ chia: " value={vd(m.divideWidth || s.divideWidthMm, "mm")} />
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
            </Cell>
            <Cell w="60%">
              <Text>{`Định mức phi hao: L1: ${v(m.lamWaste, "m")}${m.lamBTP || s.layer3Name ? `, L2: ${v(m.lamBTP, "m")}` : ""}`}</Text>
              <Text>{`Thành phẩm yêu cầu: ${v(m.lamProductQty, m.lamProductUnit ? ` ${m.lamProductUnit}` : "m")}`}</Text>
              <Line label="Ghi chú: " value={m.laminateNotes || ""} />
            </Cell>
          </View>
        </>
      )}

      {/* CHIA | TÚI or full TÚI */}
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
          {(m.hanBien || m.sealEdge) && (
            <Line label="Hàn biên: " value={v(m.hanBien, "mm") || v(m.sealEdge) || ""} />
          )}
          {!!m.hanDau && <Line label="Hàn đầu: " value={v(m.hanDau, "mm")} />}
          {!!m.xepHong && <Line label="Xếp hông: " value={v(m.xepHong, "mm")} />}
          {!!m.foldBottom && <Line label="Xếp đáy: " value={v(m.foldBottom)} />}
          {!!m.tearNotch && <Line label='Nhấn xé "v": ' value={m.tearNotch} />}
          {!!m.tamZipperCachMieng && (
            <Line label="Tâm zipper: " value={v(m.tamZipperCachMieng, "mm")} />
          )}
          {!!m.holePunchInfo && <Text>{m.holePunchInfo}</Text>}
          {!!m.ventHoleInfo && <Line label="Đục lỗ thông hơi: " value={m.ventHoleInfo} />}
          {!!m.danLung && <Line label="Dán lưng: " value={v(m.danLung, "mm")} />}
          {!!m.danLungLech && <Line label="Dán lưng lệch: " value={v(m.danLungLech, "mm")} />}
          {!!m.danDay && <Line label="Dán đáy: " value={v(m.danDay, "mm")} />}
          {!!m.nap && <Line label="Nắp: " value={v(m.nap, "mm")} />}
          {!!m.songSieuAm && <Line label="Sóng siêu âm: " value={v(m.songSieuAm, "mm")} />}
          {m.useDualCutter && <Text style={styles.bold}>Sử dụng dao cắt 2 nhịp để cắt</Text>}
          {m.useSemicircularMold && (
            <Text style={styles.bold}>Sử dụng khuôn đáy đứng bán nguyệt</Text>
          )}
          <Text style={styles.bold}>{`Định mức phi hao: ${vd(m.bagWasteMeters, "m")}`}</Text>
          <Text style={styles.redNote}>
            Ghi chú: {m.bagMachineNotes || "chạy theo mẫu đã sản xuất"}
          </Text>
          {!!m.packagingInfo && <Text>{`SL đóng gói: ${m.packagingInfo}`}</Text>}
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
