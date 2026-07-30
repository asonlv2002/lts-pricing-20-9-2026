/**
 * lsx-server-adapter.ts - Mapping tu server response (QuotationPricingSheetOrder*)
 * sang FE shape (LsxRow) de render table.
 *
 * Server response gom theo quotation. Table UI can list flat (1 row / order).
 *
 * Status mapping (Q15 = b): chi 2 trang thai, rut tu server.hasAdvisorApproved.
 * - true  -> 'approved'
 * - false -> 'pending'
 *
 * inputValue: server luu duoi dang Prisma.Json (unknown). Co the la:
 * - null (LSX moi tao, chua co form)
 * - LSXManualFields (form da nhap)
 * Adapter khoong parse inputValue; chi expose raw de component tu xu ly.
 */

import type {
  QuotationPricingSheetOrderApi,
  QuotationPricingSheetOrdersByQuotationApi,
  PricingSheetApi,
} from './api/service-lts';
import type { LsxLocalStatus } from './types';

/** Row don gian cho table list view. */
export interface LsxRow {
  orderId: string;
  quotationId: string;
  pricingSheetId: string;
  lsxNumber: string;          // Lay tu inputValue.lsxNumber neu co, fallback ''
  customerName: string;       // Lay tu pricingSheet.customer?.name hoac quotation.customerId
  productName: string;        // Lay tu pricingSheet.pricingSheetName hoac inputValue.productName
  structure: string;          // Lay tu pricingSheet inputValue
  quantity: number;           // Lay tu pricingSheet inputValue
  status: LsxLocalStatus;     // 'pending' | 'approved'
  hasPrintedOrder: boolean;
  createdAt: string;
  createdBy: string;
  inputValue: unknown | null;
  pricingSheet: PricingSheetApi;
  bgName: string;             // Lay tu quotation.description
}

/**
 * Tra ve status tu order server. Q15: 2 trang thai.
 *   hasAdvisorApproved=true  -> 'approved'  (● Đã duyệt)
 *   hasAdvisorApproved=false -> 'pending'   (● Chờ duyệt)
 */
export function deriveLsxStatus(
  order: Pick<QuotationPricingSheetOrderApi, 'hasAdvisorApproved'>,
): LsxLocalStatus {
  return order.hasAdvisorApproved === true ? 'approved' : 'pending';
}

/** Doc 1 field tu inputValue (JSON unknown) ma khong crash. */
function docString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'ten' in value) {
    const t = (value as Record<string, unknown>).ten;
    if (typeof t === 'string') return t;
  }
  return fallback;
}

function docNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

/** Flatten danh sach quotation (gom orders) -> LsxRow[] theo createdAt desc. */
export function mapServerOrdersToLsxRows(
  quotations: QuotationPricingSheetOrdersByQuotationApi[],
): LsxRow[] {
  const rows: LsxRow[] = [];
  for (const q of quotations) {
    if (!q.orders || q.orders.length === 0) continue;
    for (const order of q.orders) {
      const sheet = order.pricingSheet;
      const input = (sheet && typeof sheet.inputValue === 'object' && sheet.inputValue !== null
        ? sheet.inputValue
        : null) as Record<string, unknown> | null;
      const lsxInput = order.inputValue && typeof order.inputValue === 'object'
        ? (order.inputValue as Record<string, unknown>)
        : null;

      rows.push({
        orderId: order.id,
        quotationId: order.quotationId,
        pricingSheetId: order.pricingSheetId,
        lsxNumber: docString(lsxInput?.lsxNumber),
        customerName: sheet?.customer?.codeName || sheet?.customerCodeName || q.customerId || '—',
        productName: sheet?.pricingSheetName || docString(input?.productName, '—'),
        structure: docString(input?.structure, ''),
        quantity: docNumber(input?.quantity, 0),
        status: deriveLsxStatus(order),
        hasPrintedOrder: order.hasPrintedOrder,
        createdAt: order.createdAt,
        createdBy: order.createdBy,
        inputValue: order.inputValue,
        pricingSheet: sheet as PricingSheetApi,
        bgName: q.description || '',
      });
    }
  }
  // Sort: createdAt desc
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows;
}

/** Loc theo status (Q15: 'pending' | 'approved' | 'all'). */
export function filterLsxByStatus(
  rows: LsxRow[],
  status: LsxLocalStatus | 'all',
): LsxRow[] {
  if (status === 'all') return rows;
  return rows.filter((r) => r.status === status);
}

/** Bo dau tieng Viet + lowercase cho search. Tra ve '' neu input undefined. */
function boDau(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Search theo nhieu truong (lsxNumber, KH, SP, ma BG). Bo dau tieng Viet. */
export function searchLsxRows(rows: LsxRow[], keyword: string): LsxRow[] {
  const q = boDau(keyword.trim());
  if (!q) return rows;
  return rows.filter((r) => {
    const haystack = [
      r.lsxNumber,
      r.customerName,
      r.productName,
      r.structure,
      r.quotationId,
      r.orderId,
    ].map(boDau).join(' ');
    return haystack.includes(q);
  });
}
