// ═════════════════════════════════════════════════════════════════════════════
// Mapper: HistoryItem (local) → payload POST /pricing-sheet
// ═════════════════════════════════════════════════════════════════════════════
//
// Quy ước lưu trữ:
// - inputValue   : nguyên CalculateInput (HistoryItem.input). Server lưu blob,
//                  frontend tự tính lại kết quả khi tải về.
// - saleResult   : bảng ghi đè của Sale  (HistoryItem.saleOverrides).
// - masterResult : bảng ghi đè của Admin (HistoryItem.adminOverrides).
//
// Override là quyết định thủ công của người dùng nên KHÔNG tính lại được →
// bắt buộc lưu. Bảng rỗng được map thành `undefined` để không gửi key thừa.

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

function bangGhiDeCoGiaTri(table: HistoryItem['saleOverrides']): unknown | undefined {
  if (!table) return undefined;
  return Object.keys(table).length > 0 ? table : undefined;
}

export function mapHistoryToPricingSheet(
  h: HistoryItem,
  customerCodeName: string,
  note?: string,
): TaoPricingSheetInput {
  return {
    pricingSheetName: h.productName,
    customerCodeName,
    inputValue: h.input,
    saleResult: bangGhiDeCoGiaTri(h.saleOverrides),
    masterResult: bangGhiDeCoGiaTri(h.adminOverrides),
    note: note?.trim() ? note.trim() : undefined,
  };
}

// Map HistoryItem → payload cho PATCH /pricing-sheet/{id}/result
export function mapHistoryToResultPatch(
  h: HistoryItem,
): CapNhatPricingSheetResultInput {
  return {
    inputValue: h.input,
    saleResult: bangGhiDeCoGiaTri(h.saleOverrides),
    useLatestPriceConfigs: true,
  };
}

// Map HistoryItem → payload cho PATCH /pricing-sheet/{id}/advisor-result
export function mapHistoryToAdvisorPatch(
  h: HistoryItem,
): CapNhatPricingSheetAdvisorInput {
  return {
    masterResult: bangGhiDeCoGiaTri(h.adminOverrides),
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

function docBangGhiDe(blob: unknown): OverrideTable | undefined {
  if (!blob || typeof blob !== 'object') return undefined;
  const table = blob as Record<string, unknown>;
  return Object.keys(table).length > 0 ? (blob as OverrideTable) : undefined;
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
    customer: syncedInput.customer || sheet.customerCodeName || '—',
    productName: sheet.pricingSheetName || syncedInput.productName || '—',
    structure: result.structureText,
    quantity: syncedInput.quantity,
    finalPrice: result.finalPrice,
    profitRate: result.profitRate,
    saleOverrides: docBangGhiDe(sheet.saleResult),
    adminOverrides: docBangGhiDe(sheet.masterResult),
    pricingSheetId: sheet.id,
    priceConfigIds: sheet.priceConfigIds,
    originalCustomer: sheet.customerCodeName || sheet.customer?.codeName || syncedInput.customer || undefined,
    sellerName: sheet.original?.actorName ?? undefined,
    input: syncedInput,
  };
}
