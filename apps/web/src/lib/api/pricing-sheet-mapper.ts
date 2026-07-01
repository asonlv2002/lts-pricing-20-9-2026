// ═════════════════════════════════════════════════════════════════════════════
// Mapper: HistoryItem (local) → payload POST /pricing-sheet
// ═════════════════════════════════════════════════════════════════════════════
//
// Quy ước lưu trữ:
// - inputValue   : nguyên CalculateInput (HistoryItem.input). Server lưu blob,
//                  frontend tự tính lại kết quả khi tải về.
// - saleResult   : { overrides?, profitRatePct? } — override Sale.
// - masterResult : { overrides?, profitRatePct? } — override Admin.
//
// Override là quyết định thủ công của người dùng nên KHÔNG tính lại được →
// bắt buộc lưu. payload rỗng được map thành `undefined` để không gửi key thừa.

import type {
  HistoryItem,
  CalculateInput,
  OverrideTable,
  Material,
  AppConstants,
  ProfitRow,
  SmallWidthMaterialPrice,
} from '../types';
import { dongBoCotLoiNhuan } from '../engine';
import { tinhBaoGia } from '../manager-calculation';
import type {
  TaoPricingSheetInput,
  CapNhatPricingSheetResultInput,
  CapNhatPricingSheetAdvisorInput,
  PricingSheetApi,
} from './service-lts';

// ── Result payload wrapper ─────────────────────────────────────────────────

interface ResultWrapper {
  overrides?: OverrideTable;
  profitRatePct?: number;
}

function wrapResult(overrides: OverrideTable | undefined, profitRatePct: number | undefined): unknown | undefined {
  const result: ResultWrapper = {};
  if (overrides && Object.keys(overrides).length > 0) result.overrides = overrides;
  if (profitRatePct != null && profitRatePct > 0) result.profitRatePct = profitRatePct;
  return Object.keys(result).length > 0 ? result : undefined;
}

function unwrapOverrides(blob: unknown): OverrideTable | undefined {
  if (!blob || typeof blob !== 'object') return undefined;
  const wrapper = blob as ResultWrapper;
  // New format: wrapper has 'overrides' key
  if ('overrides' in wrapper) {
    if (!wrapper.overrides || typeof wrapper.overrides !== 'object') return undefined;
    return Object.keys(wrapper.overrides).length > 0 ? wrapper.overrides : undefined;
  }
  // Old format (backward compat): blob IS the overrides table directly
  return Object.keys(wrapper).length > 0 ? (wrapper as unknown as OverrideTable) : undefined;
}

function unwrapProfitRatePct(blob: unknown): number {
  if (!blob || typeof blob !== 'object') return 0;
  const wrapper = blob as ResultWrapper;
  if ('profitRatePct' in wrapper && typeof wrapper.profitRatePct === 'number') {
    return wrapper.profitRatePct;
  }
  return 0;
}

// ── Local → Server ─────────────────────────────────────────────────────────

export function mapHistoryToPricingSheet(
  h: HistoryItem,
  customerCodeName: string,
  note?: string,
): TaoPricingSheetInput {
  return {
    pricingSheetName: h.productName,
    customerCodeName,
    inputValue: h.input,
    saleResult: wrapResult(h.saleOverrides, h.saleProfitRatePct),
    masterResult: wrapResult(h.adminOverrides, h.adminProfitRatePct),
    note: note?.trim() ? note.trim() : undefined,
  };
}

// Map HistoryItem → payload cho PATCH /pricing-sheet/{id}/result
export function mapHistoryToResultPatch(
  h: HistoryItem,
): CapNhatPricingSheetResultInput {
  return {
    inputValue: h.input,
    saleResult: wrapResult(h.saleOverrides, h.saleProfitRatePct),
    useLatestPriceConfigs: true,
  };
}

// Map HistoryItem → payload cho PATCH /pricing-sheet/{id}/advisor-result
export function mapHistoryToAdvisorPatch(
  h: HistoryItem,
): CapNhatPricingSheetAdvisorInput {
  return {
    masterResult: wrapResult(h.adminOverrides, h.adminProfitRatePct),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Mapper đảo ngược: PricingSheetApi (server) → HistoryItem (local)
// ═════════════════════════════════════════════════════════════════════════════
// Server chỉ lưu inputValue (blob). Frontend tự tính lại finalPrice/profitRate/
// structureText bằng engine hiện tại. Override (saleResult/masterResult) là quyết
// định thủ công nên lấy nguyên, không tính lại.

export interface MapPricingSheetCtx {
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
}

export function mapPricingSheetToHistory(
  sheet: PricingSheetApi,
  ctx: MapPricingSheetCtx,
): HistoryItem | null {
  const rawInput = sheet.inputValue as CalculateInput | null | undefined;
  if (!rawInput || typeof rawInput !== 'object' || !rawInput.productType) return null;

  const syncedInput = dongBoCotLoiNhuan({ ...rawInput }, ctx.materials);
  const result = tinhBaoGia(
    syncedInput,
    ctx.materials,
    ctx.constants,
    ctx.profitTable,
    ctx.smallWidthPrices,
  );
  if (!result) return null;

  return {
    id: sheet.id,
    date: new Date(sheet.createdAt).toLocaleDateString('vi-VN'),
    customer: sheet.original?.customerName || syncedInput.customer || sheet.customerCodeName || '—',
    productName: sheet.pricingSheetName || syncedInput.productName || '—',
    structure: result.structureText,
    quantity: syncedInput.quantity,
    finalPrice: result.finalPrice,
    profitRate: result.profitRate,
    chotGia: syncedInput.chotGia || undefined,
    saleOverrides: unwrapOverrides(sheet.saleResult),
    adminOverrides: unwrapOverrides(sheet.masterResult),
    saleProfitRatePct: unwrapProfitRatePct(sheet.saleResult),
    adminProfitRatePct: unwrapProfitRatePct(sheet.masterResult),
    pricingSheetId: sheet.id,
    priceConfigIds: sheet.priceConfigIds,
    originalCustomer: sheet.customerCodeName || sheet.customer?.codeName || syncedInput.customer || undefined,
    sellerId: sheet.createdBy ?? undefined,
    sellerName: sheet.original?.actorName ?? undefined,
    input: syncedInput,
  };
}
