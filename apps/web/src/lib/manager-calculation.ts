import { tinhGiaWeb, traLoiNhuanTheoBang, toiUuDoDayTheoVatLieu } from './engine';
import type { AppConstants, CalculateInput, CalculateResult, Material, OverrideRowKey, OverrideTable, ProfitRow, SmallWidthMaterialPrice } from './types';

export { toiUuDoDayTheoVatLieu, toiUuDoDayTheoVatLieu as optimizeThickness };

export interface UniRow {
  rowKey: OverrideRowKey;
  stage: string;
  mat: string;
  width: number;
  meters: number;
  waste: number;
  cpsx: number;
  costCPSX: number;
  matPrice: number | null;
  costMat: number | null;
  materialDetails?: Array<{ name: string; width: number; matPrice: number; costMat: number }>;
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
  const uniRows: UniRow[] = [];
  let totalCPSX = 0;
  let totalCPVL = 0;

  totalCPSX += r.printCostCPSX;
  totalCPVL += r.printCostMaterial;
  uniRows.push({
    rowKey: 'print',
    stage: 'CPSX IN',
    mat: r.layers.print?.material?.name ?? '',
    width: r.printNLWidth,
    meters: r.printMeters,
    waste: r.printWaste,
    cpsx: r.printCPSX,
    costCPSX: r.printCostCPSX,
    matPrice: r.layers.print?.matPrice ?? r.layers.print?.material?.pricePerM2 ?? 0,
    costMat: r.printCostMaterial,
  });

  r.layers.laminations?.forEach((lam: any) => {
    totalCPSX += lam.costCPSX;
    totalCPVL += lam.costMat;
    const materialDetails = lam.chiTietVatLieu?.map((item: any) => ({
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
      stage: `GHEP (Lop ${lam.layerNum})`,
      mat: materialDetails?.length ? '' : (lam.material?.name ?? ''),
      width: lam.width,
      meters: lam.meters,
      waste: lam.waste,
      cpsx: constants.ghepCPSX,
      costCPSX: lam.costCPSX,
      matPrice: materialDetails?.length ? null : (lam.matPrice ?? lam.material?.pricePerM2 ?? 0),
      costMat: lam.costMat,
      materialDetails,
    });
  });

  if (!isMang) {
    totalCPSX += r.cutCostCPSX;
    uniRows.push({
      rowKey: 'cut',
      stage: 'CAT',
      mat: '-',
      width: r.cutWidth,
      meters: r.cutMeters,
      waste: r.cutWaste,
      cpsx: r.cutCPSX,
      costCPSX: r.cutCostCPSX,
      matPrice: null,
      costMat: null,
    });
  }

  return { uniRows, totalCPSX, totalCPVL, grandTotal: totalCPSX + totalCPVL };
}

export function xuLyDongGhiDe(
  uniRows: UniRow[],
  sourceOverrides: OverrideTable,
  currentOverrides: OverrideTable,
): { rows: ResolvedOverrideRow[]; totalCPSX: number; totalCPVL: number; grandTotal: number } {
  const rows = uniRows.map(row => {
    const rk = row.rowKey;
    const src = sourceOverrides[rk] ?? {};
    const cur = currentOverrides[rk] ?? {};
    const stage = cur.stage ?? src.stage ?? row.stage;
    const mat = cur.mat ?? src.mat ?? row.mat;
    const width = cur.width ?? src.width ?? row.width;
    const meters = cur.meters ?? src.meters ?? row.meters;
    const waste = cur.waste ?? src.waste ?? row.waste;
    const inputVL = cur.inputVL ?? src.inputVL ?? (row.meters + row.waste);
    const cpsx = cur.cpsx ?? src.cpsx ?? row.cpsx;
    const matPrice = cur.matPrice ?? src.matPrice ?? row.matPrice;
    const srcWidth = src.width ?? row.width;
    const srcMeters = src.meters ?? row.meters;
    const srcWaste = src.waste ?? row.waste;
    const srcInputVL = src.inputVL ?? (row.meters + row.waste);
    const srcMatPrice = src.matPrice ?? row.matPrice;
    const srcCpsx = src.cpsx ?? row.cpsx;
    const rawCostCPSX = cpsx * inputVL * width;
    const rawCostMat = row.materialDetails
      ? row.materialDetails.reduce((sum, detail) => sum + detail.matPrice * inputVL * detail.width, 0)
      : matPrice != null ? matPrice * inputVL * width : null;
    const costCPSX = cur.costCPSX ?? src.costCPSX ?? rawCostCPSX;
    const costMat = cur.costMat ?? src.costMat ?? rawCostMat;
    const srcCostCPSX = src.costCPSX ?? row.costCPSX;
    const srcCostMat = src.costMat ?? row.costMat;
    return { ...row, stage, mat, width, meters, waste, inputVL, cpsx, matPrice, costCPSX, costMat, srcWidth, srcMeters, srcWaste, srcInputVL, srcMatPrice, srcCpsx, srcCostCPSX, srcCostMat };
  });
  const totalCPSX = rows.reduce((sum, row) => sum + row.costCPSX, 0);
  const totalCPVL = rows.reduce((sum, row) => sum + (row.costMat ?? 0), 0);
  return { rows, totalCPSX, totalCPVL, grandTotal: totalCPSX + totalCPVL };
}

export function tinhGiaHieuLuc(params: {
  result: CalculateResult;
  uniRows: UniRow[];
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  profitTable: ProfitRow[];
}) {
  const { result, uniRows, saleOverrides, adminOverrides, profitTable } = params;
  const activeOverrideOv = Object.keys(adminOverrides).length > 0 ? adminOverrides : Object.keys(saleOverrides).length > 0 ? saleOverrides : {};
  const sourceForActive = Object.keys(adminOverrides).length > 0 ? saleOverrides : {};
  const hasAnyOverride = Object.keys(activeOverrideOv).length > 0;
  const totals = hasAnyOverride ? xuLyDongGhiDe(uniRows, sourceForActive, activeOverrideOv) : null;
  const effTotalProdCost = totals?.grandTotal ?? result.totalProductionCost;
  const effProfitRate = traLoiNhuanTheoBang(effTotalProdCost, result.input.profitColumn, profitTable);
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
