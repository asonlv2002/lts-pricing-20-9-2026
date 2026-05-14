import { calculate, lookupProfit, optimizeThickness } from './engine';
import type { AppConstants, CalculateInput, CalculateResult, Material, OverrideRowKey, OverrideTable, ProfitRow } from './types';

export { optimizeThickness };

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
}

export function calculateQuote(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
): CalculateResult | null {
  return calculate(input, materials, constants, profitTable);
}

export function buildProductionRows(result: CalculateResult, constants: AppConstants): {
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
    matPrice: r.layers.print?.material?.pricePerM2 ?? 0,
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
      matPrice: materialDetails?.length ? null : (lam.material?.pricePerM2 ?? 0),
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

export function resolveOverrideRows(
  uniRows: UniRow[],
  sourceOverrides: OverrideTable,
  currentOverrides: OverrideTable,
): { rows: ResolvedOverrideRow[]; totalCPSX: number; totalCPVL: number; grandTotal: number } {
  const rows = uniRows.map(row => {
    const rk = row.rowKey;
    const src = sourceOverrides[rk] ?? {};
    const cur = currentOverrides[rk] ?? {};
    const width = cur.width ?? src.width ?? row.width;
    const meters = cur.meters ?? src.meters ?? row.meters;
    const waste = cur.waste ?? src.waste ?? row.waste;
    const inputVL = cur.inputVL ?? src.inputVL ?? (row.meters + row.waste);
    const matPrice = cur.matPrice ?? src.matPrice ?? row.matPrice;
    const srcWidth = src.width ?? row.width;
    const srcMeters = src.meters ?? row.meters;
    const srcWaste = src.waste ?? row.waste;
    const srcInputVL = src.inputVL ?? (row.meters + row.waste);
    const srcMatPrice = src.matPrice ?? row.matPrice;
    const costCPSX = row.cpsx * inputVL * width;
    const costMat = row.materialDetails
      ? row.materialDetails.reduce((sum, detail) => sum + detail.matPrice * inputVL * detail.width, 0)
      : matPrice != null ? matPrice * inputVL * width : null;
    return { ...row, width, meters, waste, inputVL, matPrice, costCPSX, costMat, srcWidth, srcMeters, srcWaste, srcInputVL, srcMatPrice };
  });
  const totalCPSX = rows.reduce((sum, row) => sum + row.costCPSX, 0);
  const totalCPVL = rows.reduce((sum, row) => sum + (row.costMat ?? 0), 0);
  return { rows, totalCPSX, totalCPVL, grandTotal: totalCPSX + totalCPVL };
}

export function calculateEffectivePricing(params: {
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
  const totals = hasAnyOverride ? resolveOverrideRows(uniRows, sourceForActive, activeOverrideOv) : null;
  const effTotalProdCost = totals?.grandTotal ?? result.totalProductionCost;
  const effProfitRate = lookupProfit(effTotalProdCost, result.input.profitColumn, profitTable);
  const effProfitAmount = effProfitRate * effTotalProdCost;
  const effRevenue = effTotalProdCost + effProfitAmount;
  const effCostPerUnit = result.input.quantity > 0 ? effRevenue / result.input.quantity : 0;
  return { effTotalProdCost, effProfitRate, effProfitAmount, effRevenue, effCostPerUnit };
}

export function calculateMoqResult(
  input: CalculateInput,
  quantity: number,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
) {
  return calculateQuote({ ...input, quantity }, materials, constants, profitTable);
}
