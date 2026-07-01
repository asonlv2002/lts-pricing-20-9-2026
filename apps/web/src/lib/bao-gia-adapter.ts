// ── Adapter: BaoGiaApi (server) → LsxSourceData (LSX input) ──────────────────
import type { BaoGiaApi, PricingSheetApi, TrangThaiBaoGiaServer } from './api/service-lts';
import { chuyenTrangThaiBaoGia } from './api/service-lts';
import type { CalculateInput, LsxSourceData, Material, AppConstants, ProfitRow, SmallWidthMaterialPrice } from './types';
import { dongBoCotLoiNhuan } from './engine';
import { tinhBaoGia } from './manager-calculation';

export interface AdapterContext {
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
}

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<CalculateInput> {
  return laObject(value) ? (value as Partial<CalculateInput>) : {};
}

function cauTrucTuInput(input: Partial<CalculateInput>): string {
  return [input.layer1Id, input.layer2Id, input.layer3Id, input.layer4Id, input.layer5Id]
    .filter(Boolean)
    .join(' / ');
}

function tuPricingSheet(
  quotationId: string,
  sheet: PricingSheetApi,
  ctx: AdapterContext,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(sheet.inputValue);
  if (!rawInput.productType) return null;

  const syncedInput = dongBoCotLoiNhuan(rawInput as CalculateInput, ctx.materials);
  const result = tinhBaoGia(syncedInput, ctx.materials, ctx.constants, ctx.profitTable, ctx.smallWidthPrices);
  if (!result) return null;

  const customer = syncedInput.customer
    || sheet.customer?.codeName
    || sheet.customerCodeName
    || '—';

  return {
    id: `${quotationId}:${sheet.id}`,
    customer,
    productName: sheet.pricingSheetName || syncedInput.productName || '—',
    structure: result.structureText || cauTrucTuInput(syncedInput),
    finalPrice: result.finalPrice,
    chotGia: syncedInput.chotGia || undefined,
    input: syncedInput,
  };
}

function tuInputValueTrucTiep(
  quotationId: string,
  inputValue: unknown,
  ctx: AdapterContext,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(inputValue);
  if (!rawInput.productType) return null;

  const syncedInput = dongBoCotLoiNhuan(rawInput as CalculateInput, ctx.materials);
  const result = tinhBaoGia(syncedInput, ctx.materials, ctx.constants, ctx.profitTable, ctx.smallWidthPrices);
  if (!result) return null;

  return {
    id: quotationId,
    customer: syncedInput.customer || '—',
    productName: syncedInput.productName || '—',
    structure: result.structureText || cauTrucTuInput(syncedInput),
    finalPrice: result.finalPrice,
    chotGia: syncedInput.chotGia || undefined,
    input: syncedInput,
  };
}

export function mapBaoGiaToLsxSources(
  baoGia: BaoGiaApi,
  ctx: AdapterContext,
): LsxSourceData[] {
  const results: LsxSourceData[] = [];

  const pricingSheets = baoGia.pricingSheets ?? [];
  if (pricingSheets.length > 0) {
    for (const sheet of pricingSheets) {
      const mapped = tuPricingSheet(baoGia.id, sheet, ctx);
      if (mapped) results.push(mapped);
    }
    return results;
  }

  const mapped = tuInputValueTrucTiep(baoGia.id, baoGia.inputValue, ctx);
  if (mapped) results.push(mapped);
  return results;
}

export function laBaoGiaDaDuyet(updateStatus?: string | null): boolean {
  const tt = chuyenTrangThaiBaoGia(updateStatus);
  return tt === 'approved' || tt === 'customer_approved';
}

export function layNhanTrangThai(updateStatus?: string | null): TrangThaiBaoGiaServer {
  return chuyenTrangThaiBaoGia(updateStatus);
}
