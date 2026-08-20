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
import { formatLsxOrderQuantity } from './lsx-quantity';
import { LSX_TOLERANCE_DEFAULT_MM } from './lsx-quy-cach';
import { genMsp } from './lsx-msp';
import {
  applyBagDefaults,
  classifyLsxBagType,
  type LsxBagTypeInfo,
} from './lsx-bag-classification';
import { formatLsxStructure } from './lsx-structure';

export type LamLayerPart = { name: string; widthMm: number };
export type LamLayerRow = {
  layerIndex: number;
  label: string;
  parts: LamLayerPart[];
  wasteMeters: number;
};

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

/** Checklist ghi chú máy ghép: "PET12 khổ 480:" mỗi lớp con. */
export function buildLaminateNotesChecklist(layers: LamLayerRow[]): string {
  return layers
    .flatMap((row) =>
      row.parts
        .filter((p) => p.name)
        .map((p) =>
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

    if (!m.lamMaterialSupplyQty && m.printProductQty > 0) {
      m.lamMaterialSupplyQty = String(m.printProductQty);
    }

    return next;
  } catch {
    return layers;
  }
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
    quyCachToleranceWidthMm: LSX_TOLERANCE_DEFAULT_MM,
    quyCachToleranceLengthMm: LSX_TOLERANCE_DEFAULT_MM,
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
  let layers = buildLaminateLayersFromInput(inputForLsxLayers, ctx.materials);
  layers = prefillFromEngine(
    m,
    layers,
    i as CalculateInput,
    ctx.materials,
    ctx.constants,
    ctx.profitTable,
    ctx.smallWidthPrices,
  );
  m.laminateLayers = layers;
  syncLegacyLaminateFields(m, layers);
  if (!m.laminateNotes) {
    m.laminateNotes = buildLaminateNotesChecklist(layers);
  }
  m.numCylinders = (i.numColors || 0) as number;
  const unit = tui ? 'túi' : 'm²';
  const tolerance = m.quantityTolerancePercent ?? 10;
  m.quantityTolerancePercent = tolerance;
  m.soLuongDHNote = formatLsxOrderQuantity(
    `${i.quantity.toLocaleString('vi-VN')} ${unit}`,
    tolerance,
  );
  if (i.divideWidthMm && i.divideWidthMm > 0) {
    m.divideWidth = i.divideWidthMm;
  }
  if (i.divideElements && i.divideElements > 0) {
    m.divideElements = i.divideElements;
  }
  const bag = bagInfo ?? classifyLsxBagType(i.bagType, !!i.hasZipper);
  if (tui) {
    const next = applyBagDefaults(m, bag, !!i.hasZipper);
    if (source.hasHalfMoonBottom) {
      next.useSemicircularMold = true;
    }
    return next;
  }
  return m;
}

export function buildSnapshotFromSource(
  source: LsxSourceData,
  manual: LSXManualFields,
  materials: Material[],
): ProductionOrder['snapshot'] {
  const inp = source.input;
  const khoMM = Math.round((inp.spreadWidth || 0) * 1000);
  const area = (inp.quantity || 0) * (inp.spreadWidth || 0) * (inp.cutStep || 0);
  const lsxStructure = formatLsxStructure(materials, inp, {
    bottomFollows: source.bottomFollows,
    structureSwapped: source.structureSwapped,
  });
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
