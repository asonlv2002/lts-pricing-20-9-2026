// ── Adapter: BaoGiaApi (server) → LsxSourceData (LSX input) ──────────────────
// Dữ liệu báo giá từ server đã có sẵn finalPrice từ saleResult/masterResult,
// structure từ layer IDs trong inputValue → không cần chạy lại engine Tính giá.
import type { BaoGiaApi, PricingSheetApi, TrangThaiBaoGiaServer } from './api/service-lts';
import { chuyenTrangThaiBaoGia } from './api/service-lts';
import type { CalculateInput, LsxSourceData } from './types';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import {
  formatChatLieuNhuBaoGia,
  type ChatLieuBagSpecLite,
} from './format-structure';

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<CalculateInput> {
  return laObject(value) ? (value as Partial<CalculateInput>) : {};
}

function layFinalPrice(sheet: PricingSheetApi): number {
  const saleP = (sheet.saleResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof saleP === 'number') return saleP;
  const masterP = (sheet.masterResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof masterP === 'number') return masterP;
  return 0;
}

/** productBagSpecs trên quotation.inputValue — map theo pricingSheetId hoặc index. */
function layProductBagSpecs(inputValue: unknown): unknown[] {
  if (!laObject(inputValue)) return [];
  const specs = inputValue.productBagSpecs;
  return Array.isArray(specs) ? specs : [];
}

function layProductBagSpecEntry(
  productBagSpecs: unknown[],
  opts: { pricingSheetId?: string; index?: number },
): Record<string, unknown> | null {
  let entry: unknown;
  if (opts.pricingSheetId) {
    entry = productBagSpecs.find(
      (s) => laObject(s) && s.pricingSheetId === opts.pricingSheetId,
    );
  }
  if (entry == null && opts.index != null) {
    entry = productBagSpecs[opts.index];
  }
  return laObject(entry) ? entry : null;
}

function layBagSpecLite(entry: Record<string, unknown> | null): ChatLieuBagSpecLite | null {
  if (!entry || !laObject(entry.bagSpec)) return null;
  const b = entry.bagSpec;
  return {
    structureBack: typeof b.structureBack === 'string' ? b.structureBack : undefined,
    structureSwapped: b.structureSwapped === true,
    bottomFollows: b.bottomFollows === 'back' ? 'back' : b.bottomFollows === 'front' ? 'front' : undefined,
    bagType: typeof b.bagType === 'string' ? b.bagType : undefined,
    hasStructureBack: b.hasStructureBack === true || !!(typeof b.structureBack === 'string' && b.structureBack),
  };
}

function layHasHalfMoonBottom(entry: Record<string, unknown> | null): boolean {
  if (!entry || !laObject(entry.bagSpec)) return false;
  return entry.bagSpec.hasHalfMoonBottom === true;
}

function cauTrucNhuBaoGia(
  input: Partial<CalculateInput>,
  bagSpec: ChatLieuBagSpecLite | null,
): string {
  const { materials } = dungCuaHangTinhGia.getState();
  return formatChatLieuNhuBaoGia(materials, input, bagSpec);
}

function tuPricingSheet(
  quotationId: string,
  sheet: PricingSheetApi,
  productBagSpecs: unknown[],
  sheetIndex: number,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(sheet.inputValue);
  if (!rawInput.productType) return null;

  const customer = rawInput.customer
    || sheet.customer?.codeName
    || sheet.customerCodeName
    || '—';

  const entry = layProductBagSpecEntry(productBagSpecs, {
    pricingSheetId: sheet.id,
    index: sheetIndex,
  });
  const bagSpec = layBagSpecLite(entry);
  const hasHalfMoonBottom = layHasHalfMoonBottom(entry);

  return {
    id: `${quotationId}:${sheet.id}`,
    customer,
    productName: sheet.pricingSheetName || rawInput.productName || '—',
    structure: cauTrucNhuBaoGia(rawInput, bagSpec),
    finalPrice: layFinalPrice(sheet),
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
    hasHalfMoonBottom: hasHalfMoonBottom || undefined,
  };
}

function tuInputValueTrucTiep(
  quotationId: string,
  inputValue: unknown,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(inputValue);
  if (!rawInput.productType) return null;

  const productBagSpecs = layProductBagSpecs(inputValue);
  const entry = layProductBagSpecEntry(productBagSpecs, { index: 0 });
  const bagSpec = layBagSpecLite(entry);
  const hasHalfMoonBottom = layHasHalfMoonBottom(entry);

  return {
    id: quotationId,
    customer: rawInput.customer || '—',
    productName: rawInput.productName || '—',
    structure: cauTrucNhuBaoGia(rawInput, bagSpec),
    finalPrice: rawInput.chotGia ?? 0,
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
    hasHalfMoonBottom: hasHalfMoonBottom || undefined,
  };
}

export function mapBaoGiaToLsxSources(baoGia: BaoGiaApi): LsxSourceData[] {
  const results: LsxSourceData[] = [];
  const productBagSpecs = layProductBagSpecs(baoGia.inputValue);

  const pricingSheets = baoGia.pricingSheets ?? [];
  if (pricingSheets.length > 0) {
    pricingSheets.forEach((sheet, index) => {
      const mapped = tuPricingSheet(baoGia.id, sheet, productBagSpecs, index);
      if (mapped) results.push(mapped);
    });
    return results;
  }

  const mapped = tuInputValueTrucTiep(baoGia.id, baoGia.inputValue);
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
