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
import { tinhBaoGia, lapDongSanXuat } from '../manager-calculation';
import { tinhKetQuaNangCaoHieuLuc } from '../dac-ta-nang-cao';
import type {
  TaoPricingSheetInput,
  CapNhatPricingSheetResultInput,
  CapNhatPricingSheetAdvisorInput,
  PricingSheetApi,
  PriceConfigApi,
} from './service-lts';
import { xayEngineCtxTuPriceConfigs } from './price-config-mapper';
import { trichCpsxNangCao } from '../cpsx-nang-cao-pin';

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
// Sheet đã có priceConfigIds → giữ pin (false). Sheet mới / chưa link → true.
export function mapHistoryToResultPatch(
  h: HistoryItem,
): CapNhatPricingSheetResultInput {
  const daPin = !!(h.priceConfigIds && h.priceConfigIds.length > 0);
  return {
    pricingSheetName: h.productName,
    inputValue: h.input,
    saleResult: wrapResult(h.saleOverrides, h.saleProfitRatePct),
    useLatestPriceConfigs: !daPin,
  };
}

// Map HistoryItem → payload cho PATCH /pricing-sheet/{id}/advisor-result.
// Rỗng → {} để BE ghi đè masterResult (xóa ghi đè Admin cũ, vd. gỡ 900 phút).
export function mapHistoryToAdvisorPatch(
  h: HistoryItem,
): CapNhatPricingSheetAdvisorInput {
  return {
    result: wrapResult(h.adminOverrides, h.adminProfitRatePct) ?? {},
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Mapper đảo ngược: PricingSheetApi (server) → HistoryItem (local)
// ═════════════════════════════════════════════════════════════════════════════
// Server lưu inputValue + priceConfigIds (pin). Frontend tính lại finalPrice bằng
// engine + constants ĐÃ GHIM (không dùng CPSX/session latest toàn app).
// Override (saleResult/masterResult) lấy nguyên, không tính lại.

export interface MapPricingSheetCtx {
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
}

/** Ctx engine cho 1 sheet: ưu tiên pin priceConfigIds, không có pin → fallback session. */
export function layCtxChoPricingSheet(
  sheet: Pick<PricingSheetApi, 'priceConfigIds'>,
  fallback: MapPricingSheetCtx,
  configsById: Map<string, PriceConfigApi> | PriceConfigApi[],
): MapPricingSheetCtx {
  const pinIds = (sheet.priceConfigIds ?? []).map((id) => String(id).trim()).filter(Boolean);
  if (!pinIds.length) return fallback;

  const byId =
    configsById instanceof Map
      ? configsById
      : new Map(configsById.filter((c) => c?.id).map((c) => [c.id, c]));

  const pinned = pinIds.map((id) => byId.get(id)).filter((c): c is PriceConfigApi => !!c);
  if (!pinned.length) return fallback;

  return xayEngineCtxTuPriceConfigs(pinned, fallback, pinIds);
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

  // TM (mua đi bán lại) không chạy bảng đặc tả nâng cao — item cũ nhiễm cờ
  // isNangCap (bug lưu lệch cờ) được chữa tại đây, tránh A4/list đi nhánh NC
  // và cộng LN bảng giá lên giá TM đã gồm LN.
  const laNangCap = !!rawInput.isNangCap && rawInput.pricingMode !== 'commercial';
  const saleOverrides = unwrapOverrides(sheet.saleResult);
  const adminOverrides = unwrapOverrides(sheet.masterResult);
  const saleProfitRatePct = unwrapProfitRatePct(sheet.saleResult);
  const adminProfitRatePct = unwrapProfitRatePct(sheet.masterResult);

  // Bảng tính nâng cấp: giá hiển thị lấy từ bảng đặc tả nâng cao (có ghi đè dòng)
  // constants/materials = ctx đã pin (CPSX nâng cao lúc lưu), không phải latest session.
  // LN% ghi đè Sale/Admin KHÔNG áp vào giá hiển thị (chỉ preview trong tab) —
  // đồng bộ với lưu sheet (history.ts) và A4 chi tiết (pricing-detail-export.ts).
  const ketQuaHienThi = laNangCap
    ? tinhKetQuaNangCaoHieuLuc({
        result,
        uniRows: lapDongSanXuat(result, ctx.constants).uniRows,
        constants: ctx.constants,
        materials: ctx.materials,
        saleOverrides: saleOverrides ?? {},
        adminOverrides: adminOverrides ?? {},
        saleProfitRatePct: 0,
        adminProfitRatePct: 0,
        profitTable: ctx.profitTable,
      }).result
    : result;

  const pinIds = (sheet.priceConfigIds ?? []).filter(Boolean);
  const thieuPin = pinIds.length === 0;
  // Đóng băng CPSX NC từ ctx pin — ManHinhQuanLy/page không bám session latest
  const pinnedCpsxNangCao = laNangCap ? trichCpsxNangCao(ctx.constants) : undefined;

  const createdAt = sheet.createdAt || undefined;
  const updatedAt = sheet.updatedAt || sheet.createdAt || undefined;
  const ngayHienThi = createdAt
    ? new Date(createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : new Date().toLocaleDateString('vi-VN');

  return {
    id: sheet.id,
    date: ngayHienThi,
    createdAt,
    updatedAt,
    customer: sheet.original?.customerName || syncedInput.customer || sheet.customerCodeName || '—',
    productName: sheet.pricingSheetName || syncedInput.productName || '—',
    structure: result.structureText,
    quantity: syncedInput.quantity,
    finalPrice: ketQuaHienThi.finalPrice,
    profitRate: ketQuaHienThi.profitRate,
    chotGia: syncedInput.chotGia || undefined,
    saleOverrides,
    adminOverrides,
    saleProfitRatePct,
    adminProfitRatePct,
    isNangCap: laNangCap || undefined,
    isThuongMai: rawInput.pricingMode === 'commercial' || undefined,
    pricingSheetId: sheet.id,
    priceConfigIds: sheet.priceConfigIds,
    thieuPin: thieuPin || undefined,
    pinnedCpsxNangCao,
    originalCustomer: sheet.customerCodeName || sheet.customer?.codeName || syncedInput.customer || undefined,
    sellerId: sheet.createdBy ?? undefined,
    sellerName: sheet.original?.actorName ?? undefined,
    sellerAvatarUrl: sheet.original?.actorAvatarUrl ?? undefined,
    deletable: sheet.original?.deletable,
    canUpdate: sheet.original?.canUpdate,
    canAdminUpdate: sheet.original?.canAdminUpdate,
    input: {
      ...syncedInput,
      // Backfill snapshot độ dày cho sheet cũ (lưu trước khi có totalThicknessMic):
      // chốt bằng chính engine đã chạy với ctx pin của sheet → khớp màn tính giá.
      totalThicknessMic:
        (syncedInput.totalThicknessMic ?? 0) > 0
          ? syncedInput.totalThicknessMic
          : (ketQuaHienThi.totalThickness || 0),
    },
  };
}

/**
 * Map nhiều sheet: mỗi sheet dùng constants/materials theo pin riêng.
 * `configs` = toàn bộ PriceConfig đã fetch theo union priceConfigIds.
 */
export function mapPricingSheetsToHistory(
  sheets: PricingSheetApi[],
  fallback: MapPricingSheetCtx,
  configs: PriceConfigApi[] = [],
): HistoryItem[] {
  const byId = new Map(configs.filter((c) => c?.id).map((c) => [c.id, c]));
  const out: HistoryItem[] = [];
  for (const sheet of sheets) {
    const ctx = layCtxChoPricingSheet(sheet, fallback, byId);
    const item = mapPricingSheetToHistory(sheet, ctx);
    if (item) out.push(item);
  }
  return out;
}

/** Gom unique priceConfigIds từ list sheet (để batch fetch). */
export function gomPriceConfigIdsTuSheets(sheets: PricingSheetApi[]): string[] {
  const ids = new Set<string>();
  for (const s of sheets) {
    for (const id of s.priceConfigIds ?? []) {
      const t = String(id ?? '').trim();
      if (t) ids.add(t);
    }
  }
  return [...ids];
}
