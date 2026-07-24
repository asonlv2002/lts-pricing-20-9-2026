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
import { buildLsxLamBtpNote, toCylMm } from './lsxExport';
import { genMsp } from './lsx-msp';
import {
  applyBagDefaults,
  classifyLsxBagType,
  type LsxBagTypeInfo,
} from './lsx-bag-classification';

export type LamLayerPart = { name: string; widthMm: number };
export type LamLayerRow = {
  layerIndex: number;
  label: string;
  parts: LamLayerPart[];
  wasteMeters: number;
};

export function todayStr(): string {
  return new Date().toLocaleDateString('vi-VN');
}

export function genLSXNumber(existing: ProductionOrder[]): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const seq = (existing.length + 1).toString().padStart(3, '0');
  return `LSX-${ymd}-${seq}`;
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
  if (!mat) return id;
  const mic = micOverride ?? mat.thickness;
  if (mic != null && mic > 0 && !/\d/.test(mat.name.slice(-3))) {
    return `${mat.name}${mic}`;
  }
  return mat.name;
}

/** Dựng các dòng ghép từ input BG: mỗi lớp ≥2 = 1 dòng; dual-structure = mỗi part 1 dòng. */
export function buildLaminateLayersFromInput(
  i: LsxSourceData['input'],
  materials: { id: string; name: string; thickness?: number }[],
  wasteByLayerIndex?: Map<number, number>,
): LamLayerRow[] {
  const defaultW = Math.round((i.spreadWidth || 0) * 1000);
  const mic = i.micOverrides || {};
  const rows: LamLayerRow[] = [];
  let ghepNum = 0;
  const usedLayerWaste = new Set<number>();

  const pushPart = (layerIndex: number, name: string, widthMm: number) => {
    ghepNum += 1;
    let wasteMeters = 0;
    if (wasteByLayerIndex && !usedLayerWaste.has(layerIndex)) {
      wasteMeters = Math.round(wasteByLayerIndex.get(layerIndex) || 0);
      usedLayerWaste.add(layerIndex);
    }
    rows.push({
      layerIndex,
      label: `Màng ghép ${ghepNum}`,
      parts: [{ name, widthMm }],
      wasteMeters,
    });
  };

  if (i.layer2Id && i.layer2AltId) {
    const w1 = i.layer2Lengths?.mat1
      ? Math.round(i.layer2Lengths.mat1 * 1000)
      : defaultW;
    const w2 = i.layer2Lengths?.mat2
      ? Math.round(i.layer2Lengths.mat2 * 1000)
      : defaultW;
    pushPart(2, getMaterialLabel(materials, i.layer2Id, mic.layer2Id), w1);
    pushPart(2, getMaterialLabel(materials, i.layer2AltId, mic.layer2AltId), w2);
    if (i.layer2PairingMode === 'bottom_to_bottom') {
      pushPart(2, getMaterialLabel(materials, i.layer2Id, mic.layer2Id), w1);
    }
  } else if (i.layer2Id) {
    pushPart(2, getMaterialLabel(materials, i.layer2Id, mic.layer2Id), defaultW);
  }

  for (const idx of [3, 4, 5] as const) {
    const id = i[`layer${idx}Id` as 'layer3Id' | 'layer4Id' | 'layer5Id'];
    if (!id) continue;
    pushPart(idx, getMaterialLabel(materials, id, mic[`layer${idx}Id`]), defaultW);
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
  productionOrders: ProductionOrder[];
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
  m.printFilmName = getMaterialName(ctx.materials, i.layer1Id);
  let layers = buildLaminateLayersFromInput(i, ctx.materials);
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
  m.numCylinders = (i.numColors || 0) as number;
  m.soLuongDHNote = `${i.quantity.toLocaleString('vi-VN')} ${tui ? 'túi' : 'm²'}`;
  if (i.divideWidthMm && i.divideWidthMm > 0) {
    m.divideWidth = i.divideWidthMm;
  }
  m.divideElements = i.divideElements || 0;
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
  return {
    customer: source.customer,
    productName: source.productName,
    productType: inp.productType,
    structure: source.structure,
    quantity: inp.quantity,
    spreadWidth: inp.spreadWidth,
    cutStep: inp.cutStep,
    numColors: inp.numColors,
    bagType: inp.bagType,
    hasZipper: inp.hasZipper || false,
    hasDivide: !!inp.hasDivide || (inp.divideWidthMm ?? 0) > 0 || (manual.divideWidth ?? 0) > 0,
    divideWidthMm: inp.divideWidthMm || manual.divideWidth || undefined,
    originalWidthMm: khoMM || undefined,
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
