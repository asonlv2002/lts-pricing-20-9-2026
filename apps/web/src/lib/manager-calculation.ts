import { tinhGiaWeb, traLoiNhuanTheoBang, layCotLoiNhuanTuDong, toiUuDoDayTheoVatLieu } from './engine';
import type { AppConstants, CalculateInput, CalculateResult, Material, OverrideRowKey, OverrideTable, ProfitRow, SmallWidthMaterialPrice } from './types';

export { toiUuDoDayTheoVatLieu, toiUuDoDayTheoVatLieu as optimizeThickness };

export interface UniRow {
  rowKey: OverrideRowKey;
  stage: string;
  mat: string;
  materialId?: string;
  width: number;
  meters: number;
  waste: number;
  cpsx: number;
  costCPSX: number;
  matPrice: number | null;
  costMat: number | null;
  outputWidth?: number;
  printFilmCost?: number;
  printFilmSetupHours?: number;
  printFilmProductionHours?: number;
  printFilmTotalHours?: number;
  printFilmLaborCostPerHour?: number;
  materialDetails?: Array<{ materialId?: string; name: string; width: number; matPrice: number; costMat: number }>;
  /** Công đoạn đang dùng rule gia công ngoài */
  isOutsourced?: boolean;
  /** Giá NVL theo đ/m² (vendor) thay vì đ/kg */
  matPriceIsPerM2?: boolean;
}

export interface ResolvedOverrideRow extends UniRow {
  inputVL: number;
  srcWidth: number;
  srcMeters: number;
  srcWaste: number;
  srcInputVL: number;
  srcMatPrice: number | null;
  srcCpsx: number;
  srcCostCPSX: number;
  srcCostMat: number | null;
}

export function tinhBaoGia(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  smallWidthPrices: SmallWidthMaterialPrice[] = [],
): CalculateResult | null {
  return tinhGiaWeb(input, materials, constants, profitTable, smallWidthPrices);
}

export function lapDongSanXuat(result: CalculateResult, constants: AppConstants): {
  uniRows: UniRow[];
  totalCPSX: number;
  totalCPVL: number;
  grandTotal: number;
} {
  const r = result;
  const isMang = r.input.productType === 'mang';
  const isMangIn = r.input.productType === 'mang' && r.input.filmType === 'mangIn';
  const steps = r.input.pricingMode === 'outsource' ? (r.input.outsource?.steps ?? []) : [];
  const printGc = steps.includes('print');
  const printVendor = printGc && r.input.outsource?.print?.filmSource === 'vendor';
  const uniRows: UniRow[] = [];
  let totalCPSX = 0;
  let totalCPVL = 0;

  totalCPSX += r.printCostCPSX;
  totalCPVL += r.printCostMaterial;
  uniRows.push({
    rowKey: 'print',
    stage: 'CPSX IN',
    mat: r.layers.print?.material?.name ?? '',
    materialId: r.layers.print?.material?.id,
    width: r.printNLWidth,
    meters: r.printMeters,
    waste: r.printWaste,
    cpsx: r.printCPSX,
    costCPSX: r.printCostCPSX,
    matPrice: r.layers.print?.matPrice ?? r.layers.print?.material?.pricePerM2 ?? 0,
    costMat: r.printCostMaterial,
    outputWidth: r.printNLWidth,
    printFilmCost: isMangIn ? (r.printFilmCost ?? 0) : 0,
    printFilmSetupHours: isMangIn ? (r.printFilmSetupHours ?? 0) : 0,
    printFilmProductionHours: isMangIn ? (r.printFilmProductionHours ?? 0) : 0,
    printFilmTotalHours: isMangIn ? (r.printFilmTotalHours ?? 0) : 0,
    printFilmLaborCostPerHour: isMangIn ? (r.printFilmLaborCostPerHour ?? 0) : 0,
    isOutsourced: printGc,
    matPriceIsPerM2: printVendor,
  });

  r.layers.laminations?.slice().sort((a: any, b: any) => a.layerNum - b.layerNum).forEach((lam: any) => {
    totalCPSX += lam.costCPSX;
    totalCPVL += lam.costMat;
    const layerKey = `layer${lam.layerNum}` as 'layer2' | 'layer3' | 'layer4' | 'layer5';
    const layerCfg = r.input.outsource?.laminate?.layers?.[layerKey];
    const lamGc = steps.includes('laminate');
    const lamVendor = lamGc && layerCfg?.filmSource === 'vendor';
    const materialDetails = lam.chiTietVatLieu?.map((item: any) => ({
      materialId: item.vatLieuId,
      name: item.ten,
      width: item.kho,
      matPrice: item.donGia ?? 0,
      costMat: item.chiPhiVL ?? 0,
      role: item.vaiTro,
      position: item.viTriBatDau ?? item.viTri,
      endPosition: item.viTriKetThuc ?? item.viTri,
    }));
    uniRows.push({
      rowKey: `lam-${lam.layerNum}` as OverrideRowKey,
      stage: `GHÉP (Lớp ${lam.layerNum})`,
      mat: materialDetails?.length ? '' : (lam.material?.name ?? ''),
      materialId: materialDetails?.length ? undefined : (lam.material?.id),
      width: lam.width,
      meters: lam.meters,
      waste: lam.waste,
      cpsx: lamGc ? (lam.cpsx ?? layerCfg?.gcPricePerM2 ?? 0) : constants.ghepCPSX,
      costCPSX: lam.costCPSX,
      matPrice: materialDetails?.length ? null : (lam.matPrice ?? lam.material?.pricePerM2 ?? 0),
      costMat: lam.costMat,
      materialDetails,
      outputWidth: lam.width,
      isOutsourced: lamGc,
      matPriceIsPerM2: lamVendor,
    });
  });

  if (!isMang) {
    totalCPSX += r.cutCostCPSX;
    const cutGc = steps.includes('slit') || steps.includes('bag');
    uniRows.push({
      rowKey: 'cut',
      stage: 'CẮT',
      mat: '-',
      width: r.cutWidth,
      meters: r.cutMeters,
      waste: r.cutWaste,
      cpsx: r.cutCPSX,
      costCPSX: r.cutCostCPSX,
      matPrice: null,
      costMat: null,
      outputWidth: r.input.spreadWidth * (r.input.numImages || 1),
      isOutsourced: cutGc,
    });
  }

  const printFilmCost = uniRows.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;
  return { uniRows, totalCPSX, totalCPVL, grandTotal: totalCPSX + totalCPVL + printFilmCost };
}

export function xuLyDongGhiDe(
  uniRows: UniRow[],
  sourceOverrides: OverrideTable,
  currentOverrides: OverrideTable,
  printFilmParams?: { numColors: number; setupMin: number; setupDiv: number; threshold: number; speed: number; laborPerHr: number },
): { rows: ResolvedOverrideRow[]; totalCPSX: number; totalCPVL: number; grandTotal: number; printFilmCost: number } {
  const resolved: ResolvedOverrideRow[] = [];
  let propagatedInputVL = 0;

  for (let i = uniRows.length - 1; i >= 0; i--) {
    const row = uniRows[i];
    const rk = row.rowKey;
    const src = sourceOverrides[rk] ?? {};
    const cur = currentOverrides[rk] ?? {};
    const stage = cur.stage ?? src.stage ?? row.stage;
    const mat = cur.mat ?? src.mat ?? row.mat;
    const width = cur.width ?? src.width ?? row.width;
    const waste = cur.waste ?? src.waste ?? row.waste;
    const meters = cur.meters ?? (propagatedInputVL || (src.meters ?? row.meters));
    const inputVL = cur.inputVL ?? (meters + waste);
    propagatedInputVL = inputVL;
    const cpsx = cur.cpsx ?? src.cpsx ?? row.cpsx;
    const matPrice = cur.matPrice ?? src.matPrice ?? row.matPrice;
    const srcWidth = src.width ?? row.width;
    const srcMeters = src.meters ?? row.meters;
    const srcWaste = src.waste ?? row.waste;
    const srcInputVL = srcMeters + srcWaste;
    const srcMatPrice = src.matPrice ?? row.matPrice;
    const srcCpsx = src.cpsx ?? row.cpsx;
    const detailOverrides = { ...(src.detailOverrides ?? {}), ...(cur.detailOverrides ?? {}) };
    const materialDetails = row.materialDetails?.map((detail, index) => ({
      ...detail,
      materialId: detailOverrides[index]?.materialId ?? detail.materialId,
      name: detailOverrides[index]?.materialName ?? detail.name,
      width: detailOverrides[index]?.width ?? detail.width,
      matPrice: detailOverrides[index]?.matPrice ?? detail.matPrice,
    }));
    const effectiveWidth = materialDetails?.length
      ? materialDetails.reduce((sum, detail) => sum + detail.width, 0)
      : width;
    // GC: CPSX × m² TP (không nhân phi hao). Nội bộ: × (TP + PH) × khổ.
    const rawCostCPSX = row.isOutsourced
      ? cpsx * meters * effectiveWidth
      : cpsx * inputVL * effectiveWidth;
    const rawCostMat = materialDetails
      ? materialDetails.reduce((sum, detail) => sum + detail.matPrice * inputVL * detail.width, 0)
      : matPrice != null ? matPrice * inputVL * width : null;
    const costCPSX = rawCostCPSX;
    const costMat = rawCostMat;
    const srcCostCPSX = src.costCPSX ?? row.costCPSX;
    const srcCostMat = src.costMat ?? row.costMat;
    const materialId = cur.materialId ?? src.materialId ?? row.materialId;
    resolved.unshift({ ...row, stage, mat, materialId, width, meters, waste, inputVL, cpsx, matPrice, costCPSX, costMat, materialDetails, srcWidth, srcMeters, srcWaste, srcInputVL, srcMatPrice, srcCpsx, srcCostCPSX, srcCostMat });
  }
  const rows = resolved;
  const totalCPSX = rows.reduce((sum, row) => sum + row.costCPSX, 0);
  const totalCPVL = rows.reduce((sum, row) => sum + (row.costMat ?? 0), 0);
  let printFilmCost = uniRows.find(row => (row.printFilmCost ?? 0) > 0)?.printFilmCost ?? 0;

  if (printFilmParams) {
    const printRow = rows.find(r => r.rowKey === 'print');
    if (printRow && printFilmParams.numColors > 0) {
      const { numColors, setupMin, setupDiv, threshold, speed, laborPerHr } = printFilmParams;
      const setupHours = setupDiv > 0 ? numColors * setupMin / setupDiv : 0;
      let prodHours = speed > 0 ? printRow.meters / speed : 0;
      if (printRow.meters >= threshold && threshold > 0) prodHours += printRow.meters / threshold;
      printFilmCost = (setupHours + prodHours) * laborPerHr;
    }
  }

  return { rows, totalCPSX, totalCPVL, grandTotal: totalCPSX + totalCPVL + printFilmCost, printFilmCost };
}

export function tinhGiaHieuLuc(params: {
  result: CalculateResult;
  uniRows: UniRow[];
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  saleProfitRatePct: number;
  adminProfitRatePct: number;
  profitTable: ProfitRow[];
  constants: AppConstants;
  materials?: Material[];
}) {
  const { result, uniRows, saleOverrides, adminOverrides, saleProfitRatePct, adminProfitRatePct, profitTable, constants, materials = [] } = params;
  const activeOverrideOv = Object.keys(adminOverrides).length > 0 ? adminOverrides : Object.keys(saleOverrides).length > 0 ? saleOverrides : {};
  const sourceForActive = Object.keys(adminOverrides).length > 0 ? saleOverrides : {};
  const hasAnyOverride = Object.keys(activeOverrideOv).length > 0;
  const totals = hasAnyOverride ? xuLyDongGhiDe(uniRows, sourceForActive, activeOverrideOv) : null;
  const effTotalProdCost = totals?.grandTotal ?? result.totalProductionCost;
  const isPrintFilmOnly = result.input.productType === 'mang'
    && result.input.filmType === 'mangIn'
    && !result.input.layer2Id
    && !result.input.layer2AltId
    && !result.input.layer3Id
    && !result.input.layer4Id
    && !result.input.layer5Id;
  const hasAdminProfitOverride = adminProfitRatePct > 0;
  const hasSaleProfitOverride = saleProfitRatePct > 0;
  const cotLoiNhuan = layCotLoiNhuanTuDong(result.input, materials);
  const effProfitRate = hasAdminProfitOverride
    ? adminProfitRatePct / 100
    : hasSaleProfitOverride
      ? saleProfitRatePct / 100
      : isPrintFilmOnly
        ? (constants.printFilmProfitRates ?? []).find(row =>
          row.customerGroup === (result.input.printFilmCustomerGroup ?? 'normal')
          && (result.input.numColors ?? 0) >= row.colorFrom
          && (result.input.numColors ?? 0) <= row.colorTo
        )?.rate ?? result.profitRate
        : traLoiNhuanTheoBang(
            effTotalProdCost,
            cotLoiNhuan,
            profitTable,
            result.input.printFilmCustomerGroup ?? 'normal',
          );
  const effProfitAmount = effProfitRate * effTotalProdCost;
  const effRevenue = effTotalProdCost + effProfitAmount;
  const effCostPerUnit = result.input.quantity > 0 ? effRevenue / result.input.quantity : 0;
  return { effTotalProdCost, effProfitRate, effProfitAmount, effRevenue, effCostPerUnit };
}

export function tinhKetQuaMoq(
  input: CalculateInput,
  quantity: number,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  smallWidthPrices: SmallWidthMaterialPrice[] = [],
) {
  return tinhBaoGia({ ...input, quantity }, materials, constants, profitTable, smallWidthPrices);
}

// Alias tương thích cho các module đang import tên cũ.
export const calculateQuote = tinhBaoGia;
export const buildProductionRows = lapDongSanXuat;
export const resolveOverrideRows = xuLyDongGhiDe;
export const calculateEffectivePricing = tinhGiaHieuLuc;
export const calculateMoqResult = tinhKetQuaMoq;
