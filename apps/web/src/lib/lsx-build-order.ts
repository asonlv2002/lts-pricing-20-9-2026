/**
 * Build ProductionOrder from LsxSourceData (prefill + snapshot).
 * Dùng chung: ModalDonLSX + batch «Tạo tất cả».
 */

import type {
  AppConstants,
  CalculateInput,
  LSXManualFields,
  LsxSourceData,
  Material,
  ProductionOrder,
  ProfitRow,
  SmallWidthMaterialPrice,
} from './types';
import { calculate } from './engine';
import { normalizeMaterialBaseName } from './format-structure';
import { buildLsxLamBtpNote, toCylMm } from './lsxExport';
import { gomLsxLamParts } from './lsx-lam-rows';
import { LSX_TOLERANCE_WIDTH_DEFAULT_MM, LSX_TOLERANCE_LENGTH_DEFAULT_MM } from './lsx-quy-cach';
import { layKhoMangTuNguon } from './lsx-nang-cao';
import { genMsp } from './lsx-msp';
import {
  applyBagDefaults,
  classifyLsxBagType,
  type LsxBagTypeInfo,
} from './lsx-bag-classification';
import { formatLsxStructure } from './lsx-structure';
import {
  type LsxNangCaoRow,
  ghepNangCaoSpecTheoLop,
} from './lsx-nang-cao';

export type LamLayerPart = { name: string; widthMm: number };
export type LamLayerRow = {
  layerIndex: number;
  label: string;
  parts: LamLayerPart[];
  wasteMeters: number;
};

/**
 * Key dành riêng chứa snapshot LSX bên trong `inputValue` server.
 * Lý do: server chỉ lưu `inputValue` (Prisma.Json) — không có cột snapshot riêng.
 * Lưu snapshot kèm theo giúp preview ở Danh sách LSX hiển thị ĐÚNG bản lúc tạo,
 * không bị pricing sheet sửa sau làm lệch.
 */
export const LSX_SNAPSHOT_KEY = 'lsxSnapshot';

export type LsxSnapshotPayload = ProductionOrder['snapshot'];

/** Lấy snapshot đã lưu (nếu có) từ inputValue server (object hoặc null). */
export function lsxSnapshotTuInputValue(inputValue: unknown): LsxSnapshotPayload | null {
  if (!inputValue || typeof inputValue !== 'object' || Array.isArray(inputValue)) return null;
  const raw = (inputValue as Record<string, unknown>)[LSX_SNAPSHOT_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as LsxSnapshotPayload;
}

/** Nhúng snapshot vào manual trước khi đẩy lên server (không mutate input). */
export function ganLsxSnapshotVaoInputValue(
  inputValue: unknown,
  snapshot: LsxSnapshotPayload,
): unknown {
  const base =
    inputValue && typeof inputValue === 'object' && !Array.isArray(inputValue)
      ? { ...(inputValue as Record<string, unknown>) }
      : {};
  return { ...base, [LSX_SNAPSHOT_KEY]: snapshot };
}

/**
 * Phủ (overlay) khổ từ `lsxSnapshot` đã chốt lên `source` đang ăn báo giá live.
 * Khi sửa/preview LSX đã tạo trước đó, form/PDF/DOCX phải đọc khổ từ snapshot
 * (đã chốt lúc tạo) chứ không theo `inputValue` hiện tại của báo giá.
 *
 * - `source.nangCaoSpec := snapshot.nangCaoSpec` (4 khổ In/Ghép/Chia/Làm túi)
 * - `source.input.spreadWidth := snapshot.spreadWidth` (khổ trải chốt)
 * - `source.input.cylLength/cylCircum/filmRollLength := snapshot.*` nếu có
 *
 * Trả về source mới (không mutate input). Nếu snapshot thiếu → trả source gốc.
 */
export function sourceTuSnapshot(
  source: LsxSourceData,
  snapshot: LsxSnapshotPayload | null,
): LsxSourceData {
  if (!snapshot) return source;
  const nextInput: Record<string, unknown> = {
    ...(source.input as unknown as Record<string, unknown>),
  };
  if (typeof snapshot.spreadWidth === 'number' && snapshot.spreadWidth > 0) {
    nextInput.spreadWidth = snapshot.spreadWidth;
  }
  if (typeof snapshot.cutStep === 'number' && snapshot.cutStep > 0) {
    nextInput.cutStep = snapshot.cutStep;
  }
  if (typeof snapshot.cylLength === 'number' && snapshot.cylLength > 0) {
    nextInput.cylLength = snapshot.cylLength;
  }
  if (typeof snapshot.cylCircum === 'number' && snapshot.cylCircum > 0) {
    nextInput.cylCircum = snapshot.cylCircum;
  }
  if (typeof snapshot.filmRollLength === 'number' && snapshot.filmRollLength > 0) {
    nextInput.filmRollLength = snapshot.filmRollLength;
  }
  return {
    ...source,
    nangCaoSpec: Array.isArray(snapshot.nangCaoSpec)
      ? (snapshot.nangCaoSpec as unknown[])
      : source.nangCaoSpec,
    input: nextInput as unknown as LsxSourceData['input'],
  };
}

/**
 * Khổ lớp 2 dành RIÊNG cho LSX túi đáy đứng hai cấu trúc.
 * Mặt thường = rộng túi; mặt đi cùng đáy = phần khổ trải còn lại.
 * Không mutate source.input và không thay input truyền vào engine tính giá.
 */
export function resolveLsxDualStandupLayer2Lengths(
  source: Pick<
    LsxSourceData,
    'input' | 'bagWidthMm' | 'bottomFollows' | 'structureSwapped'
  >,
): { mat1: number; mat2: number } | undefined {
  const i = source.input;
  if (
    i.productType === 'mang' ||
    i.bagType !== 'dayDung' ||
    !i.layer2Id ||
    !i.layer2AltId ||
    !source.bagWidthMm ||
    source.bagWidthMm <= 0 ||
    (source.bottomFollows !== 'front' && source.bottomFollows !== 'back')
  ) {
    return undefined;
  }

  const toMetersAtMmPrecision = (meters: number) => Math.round(meters * 1000) / 1000;
  const normalWidth = toMetersAtMmPrecision(source.bagWidthMm / 1000);
  const bottomWidth = toMetersAtMmPrecision((i.spreadWidth || 0) - normalWidth);
  if (normalWidth <= 0 || bottomWidth <= 0) return undefined;

  const bottomIsMain = source.structureSwapped
    ? source.bottomFollows === 'back'
    : source.bottomFollows === 'front';

  return bottomIsMain
    ? { mat1: bottomWidth, mat2: normalWidth }
    : { mat1: normalWidth, mat2: bottomWidth };
}

export function todayStr(): string {
  return new Date().toLocaleDateString('vi-VN');
}

/** YYMM theo lịch máy (vd 7/2026 → "2607"). */
export function currentLsxYymm(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

/** Lấy chuỗi số LSX từ ProductionOrder / LsxRow / string. */
function extractLsxNumber(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const o = item as {
    lsxNumber?: unknown;
    manual?: { lsxNumber?: unknown } | null;
  };
  if (typeof o.lsxNumber === 'string') return o.lsxNumber.trim();
  if (typeof o.manual?.lsxNumber === 'string') return o.manual.lsxNumber.trim();
  return '';
}

/**
 * Sinh số LSX dạng YYMM.STT (vd 2607.01).
 * STT = max cùng YYMM + 1, pad tối thiểu 2 chữ số; reset mỗi tháng.
 * Bỏ qua format cũ (LSX-YYYYMMDD-XXX) và số tháng khác.
 */
export function genLSXNumber(
  existing: readonly unknown[] = [],
  date: Date = new Date(),
): string {
  const yymm = currentLsxYymm(date);
  const re = new RegExp(`^${yymm}\\.(\\d+)$`);
  let maxSeq = 0;
  for (const item of existing) {
    const num = extractLsxNumber(item);
    const m = num.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  const next = maxSeq + 1;
  const stt = next < 100 ? String(next).padStart(2, '0') : String(next);
  return `${yymm}.${stt}`;
}

export function genOrderId(): string {
  return `lsx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getMaterialName(
  materials: { id: string; name: string; thickness?: number }[],
  id?: string | null,
): string {
  if (!id) return '';
  return materials.find(m => m.id === id)?.name ?? id;
}

export function getMaterialLabel(
  materials: { id: string; name: string; thickness?: number }[],
  id?: string | null,
  micOverride?: number,
): string {
  if (!id) return '';
  const mat = materials.find(m => m.id === id);
  if (!mat) return normalizeMaterialBaseName(id) || id;
  const base = normalizeMaterialBaseName(mat.name) || mat.name;
  const mic = micOverride ?? mat.thickness;
  if (mic != null && mic > 0 && !/\d/.test(base.slice(-3))) {
    return `${base}${mic}`;
  }
  return base;
}

/** Checklist ghi chú máy ghép: "PET12 khổ 480:" mỗi lớp con (mỗi vật liệu 1 dòng). */
export function buildLaminateNotesChecklist(layers: LamLayerRow[]): string {
  return layers
    .flatMap((row) =>
      gomLsxLamParts(row.parts.filter((p) => p.name)).map((p) =>
        p.widthMm > 0 ? `${p.name} khổ ${p.widthMm}:` : `${p.name} khổ :`,
      ),
    )
    .join('\n');
}

/**
 * Dựng các dòng ghép từ input BG.
 * - Lớp in (layer1) KHÔNG phải màng ghép: nó chỉ thuộc MÁY IN.
 * - L2…Ln = các pass ghép, đánh số Màng ghép 1…n; dual-structure = nhiều parts
 *   trong cùng 1 row (ô gộp).
 */
export function buildLaminateLayersFromInput(
  i: LsxSourceData['input'],
  materials: { id: string; name: string; thickness?: number }[],
  wasteByLayerIndex?: Map<number, number>,
): LamLayerRow[] {
  const defaultW = Math.round((i.spreadWidth || 0) * 1000);
  const mic = i.micOverrides || {};
  const rows: LamLayerRow[] = [];
  let ghepNum = 0;

  const pushPass = (layerIndex: number, parts: LamLayerPart[]) => {
    if (parts.length === 0) return;
    ghepNum += 1;
    const wasteMeters =
      wasteByLayerIndex && wasteByLayerIndex.has(layerIndex)
        ? Math.round(wasteByLayerIndex.get(layerIndex) || 0)
        : 0;
    rows.push({
      layerIndex,
      label: `Màng ghép ${ghepNum}`,
      parts,
      wasteMeters,
    });
  };

  // Lớp in (layer1) không vào máy ghép — pass ghép đầu tiên là layer2.
  if (i.layer2Id && i.layer2AltId) {
    const w1 = i.layer2Lengths?.mat1
      ? Math.round(i.layer2Lengths.mat1 * 1000)
      : defaultW;
    const w2 = i.layer2Lengths?.mat2
      ? Math.round(i.layer2Lengths.mat2 * 1000)
      : defaultW;
    const parts: LamLayerPart[] = [
      { name: getMaterialLabel(materials, i.layer2Id, mic.layer2Id), widthMm: w1 },
      { name: getMaterialLabel(materials, i.layer2AltId, mic.layer2AltId), widthMm: w2 },
    ];
    pushPass(2, parts);
  } else if (i.layer2Id) {
    pushPass(2, [
      {
        name: getMaterialLabel(materials, i.layer2Id, mic.layer2Id),
        widthMm: defaultW,
      },
    ]);
  }

  for (const idx of [3, 4, 5] as const) {
    const id = i[`layer${idx}Id` as 'layer3Id' | 'layer4Id' | 'layer5Id'];
    if (!id) continue;
    pushPass(idx, [
      {
        name: getMaterialLabel(materials, id, mic[`layer${idx}Id`]),
        widthMm: defaultW,
      },
    ]);
  }

  return rows;
}

/**
 * Dựng laminateLayers ưu tiên `source.nangCaoSpec` (bảng đặc tả nâng cao đã snap
 * lúc Lưu/Cập nhật tính giá) — single source of truth cho MÁY GHÉP. Fallback về
 * `buildLaminateLayersFromInput` (legacy `layer*Id` + `spreadWidth`) khi LSX cũ
 * chưa có nangCaoSpec.
 *
 * Phân biệt với form chỉ hiển thị — đây là dữ liệu prefilled lúc tạo LSX, sau đó
 * user có thể sửa tay trong form; nhưng giá trị khởi tạo PHẢI khớp bảng nâng cao
 * (vd: Ghép Lớp 2 có 3 vật liệu MPET/PET/MPET thì form phải hiện đủ 3 parts,
 * không phải chỉ 2 như dual-structure legacy).
 */
export function buildLaminateLayersFromSource(
  source: LsxSourceData,
  materials: { id: string; name: string; thickness?: number }[],
  wasteByLayerIndex?: Map<number, number>,
): LamLayerRow[] {
  const rawSpec = (source as { nangCaoSpec?: unknown }).nangCaoSpec;
  if (Array.isArray(rawSpec) && rawSpec.length > 0) {
    const groups = ghepNangCaoSpecTheoLop(rawSpec as LsxNangCaoRow[]);
    if (groups.length > 0) {
      return groups.map((g) => {
        // Thiếu khoMang trong đặc tả → widthMm = 0 (renderer hiển thị "…").
        // KHÔNG nhét `spreadWidth` vào nữa — sẽ lệch khi sale ghi đè khổ.
        const parts: LamLayerPart[] = gomLsxLamParts(
          g.rows.map((r) => ({
            name: r.vatLieu || '',
            widthMm:
              typeof r.khoMang === 'number' && r.khoMang > 0
                ? Math.round(r.khoMang * 1000)
                : 0,
          })),
        );
        const waste = wasteByLayerIndex?.get(g.layerIndex) ?? 0;
        return {
          label: g.label,
          layerIndex: g.layerIndex,
          parts,
          wasteMeters: Math.round(waste),
        };
      });
    }
  }
  return buildLaminateLayersFromInput(source.input, materials, wasteByLayerIndex);
}

export function prefillFromEngine(
  m: LSXManualFields,
  layers: LamLayerRow[],
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  smallWidthPrices: SmallWidthMaterialPrice[],
): LamLayerRow[] {
  if (!m.cylDiameter && (input.cylLength ?? 0) > 0) {
    m.cylDiameter = toCylMm(input.cylLength);
  }
  if (!m.cylWidth && (input.cylCircum ?? 0) > 0) {
    m.cylWidth = toCylMm(input.cylCircum);
  }

  try {
    const r = calculate(input, materials, constants, profitTable, smallWidthPrices);
    if (!r) return layers;

    if (!m.printWastePercent && r.printWaste > 0) {
      m.printWastePercent = Math.round(r.printWaste);
    }
    if (!m.printProductQty && r.layers?.print?.meters > 0) {
      m.printProductQty = Math.round(r.layers.print.meters);
    }

    const lams = r.layers?.laminations || [];
    const wasteByLayer = new Map<number, number>();
    for (const lam of lams) {
      const layerNum = (lam as { layerNum?: number }).layerNum;
      const waste = (lam as { waste?: number }).waste || 0;
      if (layerNum != null && waste > 0) wasteByLayer.set(layerNum, waste);
    }

    const used = new Set<number>();
    const next = layers.map(row => {
      if (used.has(row.layerIndex)) return row;
      const w = wasteByLayer.get(row.layerIndex);
      if (w == null || w <= 0) return row;
      used.add(row.layerIndex);
      return { ...row, wasteMeters: Math.round(w) };
    });

    if (!m.lamProductQty && lams.length > 0) {
      const last = lams[lams.length - 1] as { meters?: number };
      if (last?.meters && last.meters > 0) {
        m.lamProductQty = Math.round(last.meters);
      }
    }

    if (!m.bagWasteMeters && r.cutWaste > 0 && input.productType !== 'mang') {
      m.bagWasteMeters = Math.round(r.cutWaste);
    }

    if (!m.lamBTPNote && m.printProductQty > 0) {
      m.lamBTPNote = buildLsxLamBtpNote(m.printProductQty);
    }

    // SL cấp vật tư GHÉP: KHÔNG tự điền — chỉ khâu In có dữ liệu điền tay
    // (feedback 2026-09-05 ý 8: "khâu in thì cho điền, còn lại để trống").

    return next;
  } catch {
    return layers;
  }
}

/**
 * Prefill số liệu LSX từ BẢNG ĐẶC TẢ NÂNG CAO (feedback 2026-09-05 ý 8:
 * DMPH/TPYC trên LSX = bảng đặc tả, làm tròn số nguyên). Chạy TRƯỚC
 * prefillFromEngine — nhờ guard `if (!m.x)` nên giá trị spec thắng giá trị
 * engine; manual (admin sửa tay) vẫn thắng tất cả khi hiển thị.
 * SL cấp vật tư: để trống hoàn toàn (chỉ khâu In điền tay).
 */
export function prefillTuDacTa(
  m: LSXManualFields,
  spec: readonly LsxNangCaoRow[],
  layers: LamLayerRow[],
): LamLayerRow[] {
  if (!spec || spec.length === 0) return layers;
  const dong = (ten: string) => spec.find(r => r.congDoan === ten);

  // In: DMPH + Thành phẩm in = dòng "In" của đặc tả
  const dongIn = dong('In');
  if (dongIn) {
    if (typeof dongIn.phiHao === 'number' && dongIn.phiHao > 0 && !m.printWastePercent) {
      m.printWastePercent = Math.round(dongIn.phiHao);
    }
    if (typeof dongIn.thanhPham === 'number' && dongIn.thanhPham > 0 && !m.printProductQty) {
      m.printProductQty = Math.round(dongIn.thanhPham);
    }
  }

  // Ghép: waste từng lớp = phi hao cấp lớp (không cộng dồn dòng chi tiết);
  // TPYC ghép = Thành phẩm dòng ghép CUỐI
  const groups = ghepNangCaoSpecTheoLop([...spec]);
  const next = layers.map(row => {
    const g = groups.find(x => x.layerIndex === row.layerIndex);
    if (!g) return row;
    const wr = g.rows.find(r => typeof r.phiHao === 'number' && r.phiHao > 0);
    if (!wr || typeof wr.phiHao !== 'number') return row;
    return { ...row, wasteMeters: Math.round(wr.phiHao) };
  });
  const last = groups[groups.length - 1];
  if (last) {
    const tpDong = last.rows.find(r => typeof r.thanhPham === 'number' && r.thanhPham > 0);
    if (tpDong && typeof tpDong.thanhPham === 'number' && !m.lamProductQty) {
      m.lamProductQty = Math.round(tpDong.thanhPham);
    }
  }

  // Làm túi: DMPH = phi hao dòng "Làm túi" của đặc tả
  const dongTui = dong('Làm túi');
  if (dongTui && typeof dongTui.phiHao === 'number' && dongTui.phiHao > 0 && !m.bagWasteMeters) {
    m.bagWasteMeters = Math.round(dongTui.phiHao);
  }

  // Ghi chú BTP "ghép hết BTP in Xm" — derive từ Thành phẩm In (spec)
  if (!m.lamBTPNote && m.printProductQty > 0) {
    m.lamBTPNote = buildLsxLamBtpNote(m.printProductQty);
  }
  return next;
}

export function syncLegacyLaminateFields(m: LSXManualFields, layers: LamLayerRow[]): void {
  if (layers[0]) {
    m.laminateFilm1 = layers[0].parts.map(p => p.name).join(' / ');
    m.laminateFilm1Width = layers[0].parts[0]?.widthMm || 0;
    m.lamWaste = layers[0].wasteMeters;
  }
  if (layers[1]) {
    m.laminateFilm2 = layers[1].parts.map(p => p.name).join(' / ');
    m.lamBTP = layers[1].wasteMeters;
  }
}

export function defaultManual(lsxNumber: string, preparedBy: string): LSXManualFields {
  return {
    lsxNumber,
    issuedDate: todayStr(),
    preparedBy,
    approvedBy: '',
    deliveryDate: '',
    notes: '',
    msp: '',
    tenSP: '',
    maMucNhu: '',
    quyCachNote: '',
    quyCachCuon: '',
    chieuRaCuonSP: '',
    soLuongDHNote: '',
    quantityTolerancePercent: 10,
    quyCachToleranceWidthMm: LSX_TOLERANCE_WIDTH_DEFAULT_MM,
    quyCachToleranceLengthMm: LSX_TOLERANCE_LENGTH_DEFAULT_MM,
    printFilmName: '',
    printWastePercent: 0,
    printProductQty: 0,
    numCylinders: 0,
    cylDiameter: 0,
    cylWidth: 0,
    rollOutWidth: 0,
    materialQtySupplied: 0,
    printNotes: '',
    cylInfo: '',
    printDirection: '',
    printMST: '',
    printProductUnit: 'MD',
    divideWidth: 0,
    rollLength: 0,
    divideRollOutWidth: 0,
    divideDeliveryReq: '',
    divideNotes: '',
    laminateFilm1: '',
    laminateFilm1Width: 0,
    lamWaste: 0,
    lamProductQty: 0,
    lamBTP: 0,
    laminateFilm2: '',
    laminateNotes: '',
    lamMaterialSupplyQty: '',
    lamProductUnit: 'MD',
    lamBTPNote: '',
    laminateLayers: [],
    divideElements: 0,
    divideWidths: undefined,
    packagingInfo: '',
    packagingNotes: '',
    deliveryNotes: '',
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanTruoc: 0,
    hanSau: 0,
    hanBien: 0,
    hanDau: 0,
    hanDay: 0,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    bagWasteMeters: 0,
    bagLuuY: '',
    useSemicircularMold: false,
    useDualCutter: false,
    bagMachineWaste: 0,
    bagDeliveryReq: '',
    bagMachineNotes: '',
    tamZipperCachMieng: 0,
    loTreoInfo: '',
    danLung: 0,
    danLungLech: 0,
    danDay: 0,
    nap: 0,
    songSieuAm: 0,
    docQuaiXach: false,
    danKeoNap: false,
    inDesc: '',
    lamDesc: '',
    divideDesc: '',
    bagDesc: '',
  };
}

export interface BuildLsxOrderCtx {
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  /** ProductionOrder[] | LsxRow[] | string[] lsxNumber — dùng gen số LSX / MSP. */
  productionOrders: readonly unknown[];
  preparedBy: string;
}

/** Prefill manual fields từ source (form + batch). */
/** Áp dụng ghi chú công đoạn + mô tả khách từ báo giá vào manual LSX.
 *  Feedback 2026-09-06: khâu in/ghép/chia — mô tả khách GỘP vào ô Ghi chú của khâu
 *  (mô tả khách trên, ghi chú có sẵn + stageNotes dưới cùng), không còn
 *  field "Mô tả khác" riêng. Riêng làm túi giữ tách: mô tả → bagDesc,
 *  ghi chú → bagLuuY. */
function apDungStageGhiChu(m: LSXManualFields, source: LsxSourceData): void {
  const ghiChu = source.stageNotes ?? [];
  const moTa = source.stageDescriptions ?? [];
  for (const n of ghiChu) {
    if (!n || !n.text) continue;
    if (n.stage === 'lam-tui') m.bagLuuY = ghepText(m.bagLuuY, n.text);
  }
  for (const d of moTa) {
    if (!d || !d.text) continue;
    if (d.stage === 'lam-tui') m.bagDesc = ghepText(m.bagDesc, d.text);
  }
  const moTaText = (stage: 'in' | 'ghep' | 'chia'): string =>
    moTa.filter(d => d && d.stage === stage && d.text).map(d => d.text).join('\n');
  m.printNotes = ghepText(moTaText('in'), m.printNotes);
  m.laminateNotes = ghepText(moTaText('ghep'), m.laminateNotes);
  m.divideNotes = ghepText(moTaText('chia'), m.divideNotes);
  for (const n of ghiChu) {
    if (!n || !n.text) continue;
    if (n.stage === 'in') m.printNotes = ghepText(m.printNotes, n.text);
    else if (n.stage === 'ghep') m.laminateNotes = ghepText(m.laminateNotes, n.text);
    else if (n.stage === 'chia') m.divideNotes = ghepText(m.divideNotes, n.text);
  }
}

/** Nối 2 chuỗi ghi chú — ngăn cách bằng xuống dòng nếu cả 2 đều có. */
function ghepText(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return `${a}\n${b}`;
}

/**
 * Feedback 2026-09-06 ý 1: "Quy cách cuộn" = khổ trải x chiều dài cuộn.
 * Chiều dài cuộn = "Chiều dài mỗi cuộn màng TP" (filmRollLength) của tính giá.
 * Chỉ điền khi đang trống → form vẫn sửa tay được. Dùng cho cả tạo mới và
 * mở sửa LSX cũ (backfill).
 */
export function backfillQuyCachCuon(m: LSXManualFields, source: LsxSourceData): void {
  if (m.quyCachCuon?.trim()) return;
  const i = source.input;
  if (i.productType !== 'mang') return;
  const khoMM = layKhoMangTuNguon(source, 'In') ?? Math.round((i.spreadWidth || 0) * 1000);
  if (khoMM <= 0) return;
  // Ưu tiên chiều dài cuộn chốt trên BÁO GIÁ (spec.rollLengthM — sale sửa được);
  // fallback chiều dài cuộn của bảng tính giá (input.filmRollLength).
  const rollLen = Math.round(source.rollLengthM || i.filmRollLength || 0);
  m.quyCachCuon = `K${khoMM}mm x ${rollLen > 0 ? rollLen : '…'}m`;
}

/**
 * "Chiều ra cuộn màng" từ báo giá → CHỈ ô thông tin sản phẩm (chieuRaCuonSP).
 * Máy in (printDirection/rollOutWidth) & máy chia (divideRollOutWidth) KHÔNG
 * được prefill — để bộ phận sản xuất tự điền. Chỉ điền khi đang trống.
 */
export function backfillChieuRaCuonMang(m: LSXManualFields, source: LsxSourceData): void {
  if (m.chieuRaCuonSP?.trim()) return;
  if (source.input.productType !== 'mang') return;
  const val = (source.chieuRaCuonMang || '').trim();
  if (!val) return;
  m.chieuRaCuonSP = val;
}

export function buildManualFromSource(
  source: LsxSourceData,
  ctx: BuildLsxOrderCtx,
  bagInfo?: LsxBagTypeInfo,
): LSXManualFields {
  const i = source.input;
  const m = defaultManual(genLSXNumber(ctx.productionOrders), ctx.preparedBy);
  const tui = i.productType !== 'mang';
  m.tenSP = source.productName || '';
  const productCode = (i as { productCode?: string }).productCode?.trim();
  m.msp = productCode || genMsp(ctx.productionOrders);
  m.printFilmName = getMaterialLabel(ctx.materials, i.layer1Id, i.micOverrides?.layer1Id);
  const lsxLayer2Lengths = resolveLsxDualStandupLayer2Lengths(source);
  const inputForLsxLayers = lsxLayer2Lengths
    ? { ...i, layer2Lengths: lsxLayer2Lengths }
    : i;
  // Ưu tiên nangCaoSpec (bảng đặc tả nâng cao); fallback legacy layer*Id
  // (lsxLayer2Lengths override cho dual standup chỉ áp dụng khi KHÔNG có spec).
  const hasSpec = Array.isArray((source as { nangCaoSpec?: unknown }).nangCaoSpec)
    && (source as { nangCaoSpec?: unknown[] }).nangCaoSpec!.length > 0;
  let layers = hasSpec
    ? buildLaminateLayersFromSource(source, ctx.materials)
    : buildLaminateLayersFromInput(inputForLsxLayers, ctx.materials);
  // Prefill trục in từ input (cả nhánh spec lẫn engine — trước đây nằm trong
  // prefillFromEngine; tách ra để nhánh spec không bỏ sót).
  if (!m.cylDiameter && (i.cylLength ?? 0) > 0) {
    m.cylDiameter = toCylMm(i.cylLength);
  }
  if (!m.cylWidth && (i.cylCircum ?? 0) > 0) {
    m.cylWidth = toCylMm(i.cylCircum);
  }
  // Ý 8 (2026-09-05): khi có đặc tả nâng cao → prefill DMPH/TPYC/waste từ
  // BẢNG ĐẶC TẢ (round nguyên) — KHÔNG chạy prefillFromEngine nữa để engine
  // (không lan ÷N khi chia) không ghi đè lệch số so với đặc tả.
  if (hasSpec) {
    layers = prefillTuDacTa(
      m,
      (source as { nangCaoSpec?: LsxNangCaoRow[] }).nangCaoSpec ?? [],
      layers,
    );
  } else {
    layers = prefillFromEngine(
      m,
      layers,
      i as CalculateInput,
      ctx.materials,
      ctx.constants,
      ctx.profitTable,
      ctx.smallWidthPrices,
    );
  }
  m.laminateLayers = layers;
  syncLegacyLaminateFields(m, layers);
  if (!m.laminateNotes) {
    m.laminateNotes = buildLaminateNotesChecklist(layers);
  }
  m.numCylinders = (i.numColors || 0) as number;
  const unit = tui ? 'túi' : 'm²';
  const tolerance = m.quantityTolerancePercent ?? 10;
  m.quantityTolerancePercent = tolerance;
  m.soLuongDHNote = `${i.quantity.toLocaleString('vi-VN')} ${unit}`;
  if (i.divideWidthMm && i.divideWidthMm > 0) {
    m.divideWidth = i.divideWidthMm;
  }
  if (i.divideElements && i.divideElements > 1) {
    m.divideElements = i.divideElements;
  }
  const bag = bagInfo ?? classifyLsxBagType(i.bagType, !!i.hasZipper);
  apDungStageGhiChu(m, source);
  if (!tui) {
    backfillQuyCachCuon(m, source);
    backfillChieuRaCuonMang(m, source);
    return m;
  }
  const next = applyBagDefaults(m, bag, !!i.hasZipper);
  if (source.hasHalfMoonBottom) {
    next.useSemicircularMold = true;
  }
  if (i.hasZipper && (source.zipperDistanceMm ?? 0) > 0) {
    next.tamZipperCachMieng = source.zipperDistanceMm as number;
  }
  if (source.hasSongSieuAm && (source.songSieuAmMm ?? 0) > 0) {
    next.songSieuAm = source.songSieuAmMm as number;
  }
  if ((source.sideSealMm ?? 0) > 0) {
    next.hanBien = source.sideSealMm as number;
    next.sealEdge = `${source.sideSealMm}mm`;
  }
  if ((source.headSealMm ?? 0) > 0) {
    next.hanDau = source.headSealMm as number;
  }
  if (source.hasTearNotch && (source.tearNotchFromTopMm ?? 0) > 0) {
    next.tearNotch = `cách đầu ${source.tearNotchFromTopMm}mm`;
  }
  if (source.hasHandleHole && source.handleHoleDescription) {
    next.holePunchInfo = source.handleHoleDescription;
  }
  if (source.hasHangHole && source.hangHoleDescription) {
    next.loTreoInfo = source.hangHoleDescription;
  }
  if ((source.gussetMm ?? 0) > 0) {
    next.xepHong = source.gussetMm as number;
  }
  if ((source.lidMm ?? 0) > 0) {
    next.nap = source.lidMm as number;
  }
  if ((source.backSealMm ?? 0) > 0) {
    if (bag.key === 'tui-xep-hong-lung-lech') next.danLungLech = source.backSealMm as number;
    else if (bag.key === 'tui-dan-lung-giua') next.danLung = source.backSealMm as number;
  }
  if (source.hasBottomSeal && (source.bottomSealMm ?? 0) > 0) {
    next.hanDay = source.bottomSealMm as number;
  }
  if ((source.standupBottomSideMm ?? 0) > 0 && bag.key === 'tui-day-dung') {
    next.foldBottom = `${source.standupBottomSideMm as number * 2}mm`;
  }
  return next;
}

export function buildSnapshotFromSource(
  source: LsxSourceData,
  manual: LSXManualFields,
  materials: Material[],
): ProductionOrder['snapshot'] {
  const inp = source.input;
  // Ưu tiên khổ dòng "In" từ bảng đặc tả kỹ thuật đã snap — đúng với tinh thần
  // "4 khổ đều lấy từ đặc tả". Khi LSX legacy không có đặc tả → fallback
  // `inp.originalWidthMm` (nếu có) rồi mới `spreadWidth` (công thức cũ).
  const khoTuSpecIn =
    layKhoMangTuNguon(source, 'In') ?? 0;
  const khoMM = khoTuSpecIn > 0
    ? khoTuSpecIn
    : Math.round((inp.spreadWidth || 0) * 1000);
  const area = (inp.quantity || 0) * (inp.spreadWidth || 0) * (inp.cutStep || 0);
  const lsxStructure = formatLsxStructure(materials, inp, {
    bottomFollows: source.bottomFollows,
    structureSwapped: source.structureSwapped,
  });
  // Lấy nangCaoSpec từ source (đã được bao-gia-adapter đọc từ inputValue
  // của pricing sheet — snap lúc Lưu tính giá / Cập nhật ở ManHinhQuanLy).
  // Cập nhật LSX giữ nguyên (không re-snap) để bản in ổn định.
  const specRaw = source.nangCaoSpec;
  const nangCaoSpec = Array.isArray(specRaw) && specRaw.length > 0
    ? (specRaw as LsxNangCaoRow[])
    : undefined;
  return {
    customer: source.customer,
    productName: source.productName,
    productType: inp.productType,
    structure: lsxStructure || source.structure,
    quantity: inp.quantity,
    spreadWidth: inp.spreadWidth,
    cutStep: inp.cutStep,
    bagWidthMm: source.bagWidthMm,
    bagLengthMm: source.bagLengthMm,
    bottomFollows: source.bottomFollows,
    structureSwapped: source.structureSwapped,
    numColors: inp.numColors,
    bagType: inp.bagType,
    hasZipper: inp.hasZipper || false,
    zipperDistanceMm: source.zipperDistanceMm,
    hasDivide: !!inp.hasDivide || (inp.divideWidthMm ?? 0) > 0 || (manual.divideWidth ?? 0) > 0,
    divideWidthMm: inp.divideWidthMm || manual.divideWidth || undefined,
    originalWidthMm: inp.originalWidthMm || khoMM || undefined,
    numImages: inp.numImages || undefined,
    cylLength: inp.cylLength,
    cylCircum: inp.cylCircum,
    filmRollLength: inp.filmRollLength,
    layer1Name: getMaterialName(materials, inp.layer1Id),
    layer2Name: getMaterialName(materials, inp.layer2Id),
    layer3Name: getMaterialName(materials, inp.layer3Id),
    layer4Name: getMaterialName(materials, inp.layer4Id),
    layer5Name: getMaterialName(materials, inp.layer5Id),
    chotGia: source.chotGia || source.finalPrice,
    totalArea: Math.round(area * 100) / 100,
    hasSongSieuAm: source.hasSongSieuAm,
    songSieuAmMm: source.songSieuAmMm,
    nangCaoSpec,
    outsourceSteps: Array.isArray(source.outsourceSteps) ? source.outsourceSteps : undefined,
  };
}

/** Tạo full ProductionOrder (auto prefill) — batch «Tạo tất cả». */
export function buildProductionOrderFromSource(
  source: LsxSourceData,
  ctx: BuildLsxOrderCtx,
): ProductionOrder {
  const manual = buildManualFromSource(source, ctx);
  const manualToSave: LSXManualFields = {
    ...manual,
    msp: manual.msp?.trim() || genMsp(ctx.productionOrders),
    tenSP: manual.tenSP?.trim() || source.productName || '',
  };
  return {
    id: genOrderId(),
    quoteId: source.id,
    createdAt: new Date().toISOString(),
    status: 'created',
    manual: manualToSave,
    snapshot: buildSnapshotFromSource(source, manualToSave, ctx.materials),
  };
}
