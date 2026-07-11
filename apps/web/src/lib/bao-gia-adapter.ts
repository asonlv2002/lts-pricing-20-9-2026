// ── Adapter: BaoGiaApi (server) → LsxSourceData (LSX input) ──────────────────
// Dữ liệu báo giá từ server đã có sẵn finalPrice từ saleResult/masterResult,
// structure từ layer IDs trong inputValue → không cần chạy lại engine Tính giá.
import type { BaoGiaApi, PricingSheetApi, TrangThaiBaoGiaServer } from './api/service-lts';
import { chuyenTrangThaiBaoGia } from './api/service-lts';
import type { CalculateInput, LsxSourceData } from './types';

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

function layFinalPrice(sheet: PricingSheetApi): number {
  const saleP = (sheet.saleResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof saleP === 'number') return saleP;
  const masterP = (sheet.masterResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof masterP === 'number') return masterP;
  return 0;
}

function tuPricingSheet(
  quotationId: string,
  sheet: PricingSheetApi,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(sheet.inputValue);
  if (!rawInput.productType) return null;

  const customer = rawInput.customer
    || sheet.customer?.codeName
    || sheet.customerCodeName
    || '—';

  return {
    id: `${quotationId}:${sheet.id}`,
    customer,
    productName: sheet.pricingSheetName || rawInput.productName || '—',
    structure: cauTrucTuInput(rawInput),
    finalPrice: layFinalPrice(sheet),
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
  };
}

function tuInputValueTrucTiep(
  quotationId: string,
  inputValue: unknown,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(inputValue);
  if (!rawInput.productType) return null;

  return {
    id: quotationId,
    customer: rawInput.customer || '—',
    productName: rawInput.productName || '—',
    structure: cauTrucTuInput(rawInput),
    finalPrice: rawInput.chotGia ?? 0,
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
  };
}

export function mapBaoGiaToLsxSources(baoGia: BaoGiaApi): LsxSourceData[] {
  const results: LsxSourceData[] = [];

  const pricingSheets = baoGia.pricingSheets ?? [];
  if (pricingSheets.length > 0) {
    for (const sheet of pricingSheets) {
      const mapped = tuPricingSheet(baoGia.id, sheet);
      if (mapped) results.push(mapped);
    }
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
