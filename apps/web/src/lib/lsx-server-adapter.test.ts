/**
 * lsx-server-adapter.test.ts - Kiem tra 4 helper mapping server -> FE.
 * Chay: pnpm --filter web exec tsx src/lib/lsx-server-adapter.test.ts
 */

import {
  deriveLsxStatus,
  mapServerOrdersToLsxRows,
  filterLsxByStatus,
  searchLsxRows,
  type LsxRow,
} from './lsx-server-adapter';
import type {
  QuotationPricingSheetOrderApi,
  QuotationPricingSheetOrdersByQuotationApi,
  PricingSheetApi,
} from './api/service-lts';
import type { LsxLocalStatus } from './types';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────
function makeSheet(overrides: Partial<PricingSheetApi> = {}): PricingSheetApi {
  return {
    id: 'sheet-1',
    customerId: 'cust-1',
    customerCodeName: 'KH001',
    pricingSheetName: 'TÚI GẠO 5KG',
    customer: { id: 'cust-1', codeName: 'KH001', name: 'Cty ABC' },
    inputValue: { productName: 'TÚI GẠO 5KG', quantity: 1000 },
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
    hasCustomerApproved: true,
    original: null,
    ...overrides,
  } as PricingSheetApi;
}

function makeOrder(overrides: Partial<QuotationPricingSheetOrderApi> = {}): QuotationPricingSheetOrderApi {
  return {
    id: 'ord-1',
    quotationId: 'q-1',
    pricingSheetId: 'sheet-1',
    hasPrintedOrder: false,
    hasAdvisorApproved: false,
    inputValue: null,
    createdBy: 'user-1',
    approvedBy: null,
    createdAt: '2026-07-30T00:00:00.000Z',
    pricingSheet: makeSheet(),
    ...overrides,
  };
}

function makeQuotation(
  overrides: Partial<QuotationPricingSheetOrdersByQuotationApi> = {},
): QuotationPricingSheetOrdersByQuotationApi {
  return {
    id: 'q-1',
    customerId: 'cust-1',
    description: 'Báo giá TÚI GẠO 5KG',
    inputValue: null,
    updateStatus: 'approved',
    createdBy: 'user-1',
    reviewerId: 'user-2',
    creator: { id: 'user-1', account: 'nv.a', fullName: 'Nguyễn V.A' },
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
    orders: [makeOrder()],
    original: { actorName: 'Nguyễn V.A', deletable: false, canUpdate: true },
    ...overrides,
  };
}

// ── deriveLsxStatus ──────────────────────────────────────────────────
console.log('\n== deriveLsxStatus ==');
{
  const order = makeOrder({ hasAdvisorApproved: false });
  const status: LsxLocalStatus = deriveLsxStatus(order);
  assert('hasAdvisorApproved=false -> pending', status === 'pending', status);
}
{
  const order = makeOrder({ hasAdvisorApproved: true });
  const status = deriveLsxStatus(order);
  assert('hasAdvisorApproved=true -> approved', status === 'approved', status);
}

// ── mapServerOrdersToLsxRows ─────────────────────────────────────────
console.log('\n== mapServerOrdersToLsxRows ==');
{
  const quotations = [
    makeQuotation({
      id: 'q-1',
      orders: [
        makeOrder({ id: 'ord-1', createdAt: '2026-07-30T00:00:00.000Z' }),
        makeOrder({ id: 'ord-2', createdAt: '2026-07-25T00:00:00.000Z' }),
      ],
    }),
    makeQuotation({
      id: 'q-2',
      orders: [makeOrder({ id: 'ord-3' })],
    }),
  ];
  const rows = mapServerOrdersToLsxRows(quotations);
  assert('flatten 2 quotation -> 3 row', rows.length === 3, String(rows.length));
  assert('row co quotationId', rows.every((r) => typeof r.quotationId === 'string'));
  assert('row co orderId', rows.every((r) => typeof r.orderId === 'string'));
  assert('row co status', rows.every((r) => r.status === 'pending' || r.status === 'approved'));
  assert('row co inputValue (co the null)', rows.every((r) => 'inputValue' in r));
  assert('row co pricingSheet (snapshot)', rows.every((r) => r.pricingSheet !== undefined));
}
{
  // Empty input
  const rows = mapServerOrdersToLsxRows([]);
  assert('input rong -> 0 row', rows.length === 0);
}
{
  // Quotation có 0 orders → 0 row
  const rows = mapServerOrdersToLsxRows([makeQuotation({ orders: [] })]);
  assert('quotation khong co order -> 0 row', rows.length === 0);
}

// ── filterLsxByStatus ────────────────────────────────────────────────
console.log('\n== filterLsxByStatus ==');
{
  const rows: LsxRow[] = [
    { orderId: 'a', status: 'pending' } as LsxRow,
    { orderId: 'b', status: 'approved' } as LsxRow,
    { orderId: 'c', status: 'pending' } as LsxRow,
  ];
  assert('filter pending -> 2', filterLsxByStatus(rows, 'pending').length === 2);
  assert('filter approved -> 1', filterLsxByStatus(rows, 'approved').length === 1);
  assert('filter all -> 3', filterLsxByStatus(rows, 'all').length === 3);
}

// ── searchLsxRows ────────────────────────────────────────────────────
console.log('\n== searchLsxRows ==');
{
  const rows: LsxRow[] = [
    { orderId: 'a', lsxNumber: '2607.01', customerName: 'Cty ABC', productName: 'TÚI 5KG', quotationId: 'q-1' } as unknown as LsxRow,
    { orderId: 'b', lsxNumber: '2607.02', customerName: 'Cty XYZ', productName: 'MÀNG PE', quotationId: 'q-2' } as unknown as LsxRow,
  ];
  assert('empty keyword -> tat ca', searchLsxRows(rows, '').length === 2);
  assert('keyword "abc" -> 1 (case-insensitive)', searchLsxRows(rows, 'ABC').length === 1);
  assert('keyword "mang" -> 1', searchLsxRows(rows, 'mang').length === 1);
  assert('keyword khong khop -> 0', searchLsxRows(rows, 'xyz123').length === 0);
  assert('keyword "q-1" (bgId) -> 1', searchLsxRows(rows, 'q-1').length === 1);
  assert('keyword "2607.02" (lsxNumber) -> 1', searchLsxRows(rows, '2607.02').length === 1);
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
