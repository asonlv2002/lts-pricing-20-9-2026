/**
 * quote-status-mapping.test.ts - Kiem tra mapping giua local QuoteStatus (8 gia tri)
 * va server TrangThaiBaoGiaServer (4 gia tri), va helper locSheetKhaDungChoLSX.
 * Chay: pnpm --filter web exec tsx src/lib/api/quote-status-mapping.test.ts
 */

import {
  quoteStatusToServer,
  serverToQuoteStatus,
  coTheDongBoStatus,
  chuyenTrangThaiBaoGia,
  locSheetKhaDungChoLSX,
  type BaoGiaApi,
  type PricingSheetApi,
} from './service-lts';

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

// Helper tao BaoGiaApi gia de test
function taoBaoGia(
  id: string,
  updateStatus: string,
  pricingSheets: Array<Partial<PricingSheetApi> & { id: string; hasCustomerApproved?: boolean | null }>,
): BaoGiaApi {
  return {
    id,
    updateStatus,
    pricingSheets: pricingSheets.map(s => ({
      id: s.id,
      pricingSheetName: s.pricingSheetName ?? `Sheet ${s.id}`,
      customer: { codeName: 'TEST' },
      inputValue: { productType: 'tui' },
      saleResult: null,
      masterResult: null,
      quotationId: id,
      hasCustomerApproved: s.hasCustomerApproved ?? null,
      note: null,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      priceConfigIds: [],
    })),
  } as unknown as BaoGiaApi;
}

console.log('\n== Local -> Server (quoteStatusToServer) ==');
assert('drafted -> drafted', quoteStatusToServer('drafted') === 'drafted');
assert('pending_approval -> submitted', quoteStatusToServer('pending_approval') === 'submitted');
assert('approved -> approved', quoteStatusToServer('approved') === 'approved');
assert('rejected -> rejected', quoteStatusToServer('rejected') === 'rejected');
assert('sent (local-only "da gui khach") -> approved', quoteStatusToServer('sent') === 'approved');
assert('cancelled (local-only) -> null (khong the dong bo)', quoteStatusToServer('cancelled') === null);
assert('completed (local-only) -> null', quoteStatusToServer('completed') === null);
assert('expired (local-only) -> null', quoteStatusToServer('expired') === null);

console.log('\n== Server -> Local (serverToQuoteStatus) ==');
assert('drafted -> drafted', serverToQuoteStatus('drafted') === 'drafted');
assert('submitted -> pending_approval', serverToQuoteStatus('submitted') === 'pending_approval');
assert('approved -> approved', serverToQuoteStatus('approved') === 'approved');
assert('rejected -> rejected', serverToQuoteStatus('rejected') === 'rejected');
assert('"draft" (raw server) -> drafted', serverToQuoteStatus('draft') === 'drafted');
assert('unknown -> drafted (fallback)', serverToQuoteStatus('xyz') === 'drafted');
assert('null -> drafted', serverToQuoteStatus(null) === 'drafted');

console.log('\n== coTheDongBoStatus ==');
assert('drafted co the dong bo', coTheDongBoStatus('drafted') === true);
assert('pending_approval co the dong bo', coTheDongBoStatus('pending_approval') === true);
assert('approved co the dong bo', coTheDongBoStatus('approved') === true);
assert('rejected co the dong bo', coTheDongBoStatus('rejected') === true);
assert('sent co the dong bo (map thanh approved)', coTheDongBoStatus('sent') === true);
assert('cancelled KHONG the dong bo', coTheDongBoStatus('cancelled') === false);
assert('completed KHONG the dong bo', coTheDongBoStatus('completed') === false);
assert('expired KHONG the dong bo', coTheDongBoStatus('expired') === false);

console.log('\n== Round-trip server -> local -> server (mot so gia tri) ==');
// 'drafted' dong bo tron tron.
assert('drafted -> local -> server giu nguyen', (() => {
  const local = serverToQuoteStatus('drafted');
  return quoteStatusToServer(local) === 'drafted';
})());
// 'submitted' dong bo tron tron (qua pending_approval).
assert('submitted -> local -> server giu nguyen', (() => {
  const local = serverToQuoteStatus('submitted');
  return quoteStatusToServer(local) === 'submitted';
})());

console.log('\n== chuyenTrangThaiBaoGia (4 gia tri, da co tu Phase 1) ==');
assert('draft -> drafted', chuyenTrangThaiBaoGia('draft') === 'drafted');
assert('submitted -> submitted', chuyenTrangThaiBaoGia('submitted') === 'submitted');
assert('approved -> approved', chuyenTrangThaiBaoGia('approved') === 'approved');
assert('rejected -> rejected', chuyenTrangThaiBaoGia('rejected') === 'rejected');
assert('null -> drafted', chuyenTrangThaiBaoGia(null) === 'drafted');

console.log('\n== locSheetKhaDungChoLSX (filter sheet da khach duyet) ==');
{
  // Rong -> rong
  const r0 = locSheetKhaDungChoLSX([]);
  assert('danh sach rong -> rong', r0.length === 0);

  // BG chua approved -> rong
  const bg1 = taoBaoGia('q1', 'draft', [
    { id: 's1', hasCustomerApproved: true },
    { id: 's2', hasCustomerApproved: false },
  ]);
  const r1 = locSheetKhaDungChoLSX([bg1]);
  assert('BG draft -> 0 sheet', r1.length === 0);

  // BG submitted (chua approved) -> rong
  const bg2 = taoBaoGia('q2', 'submitted', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const r2 = locSheetKhaDungChoLSX([bg2]);
  assert('BG submitted -> 0 sheet', r2.length === 0);

  // BG approved, tat ca sheet chua duyet -> 0
  const bg3 = taoBaoGia('q3', 'approved', [
    { id: 's1', hasCustomerApproved: null },
    { id: 's2', hasCustomerApproved: false },
  ]);
  const r3 = locSheetKhaDungChoLSX([bg3]);
  assert('BG approved, 0 sheet duyet -> 0', r3.length === 0);

  // BG approved, co sheet duyet -> chi lay sheet do
  const bg4 = taoBaoGia('q4', 'approved', [
    { id: 's1', hasCustomerApproved: true },
    { id: 's2', hasCustomerApproved: false },
    { id: 's3', hasCustomerApproved: null },
  ]);
  const r4 = locSheetKhaDungChoLSX([bg4]);
  assert('BG approved, 1/3 sheet duyet -> 1', r4.length === 1);
  assert('sheet dung la s1', r4[0]?.sheet.id === 's1');
  assert('quotation lien ket dung', r4[0]?.quotation.id === 'q4');

  // BG approved, nhieu BG -> gom lai theo thu tu input
  const bg5 = taoBaoGia('q5', 'approved', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const bg6 = taoBaoGia('q6', 'approved', [
    { id: 's2', hasCustomerApproved: true },
  ]);
  const r5 = locSheetKhaDungChoLSX([bg5, bg6]);
  assert('2 BG approved -> 2 sheet tong', r5.length === 2);
  assert('q5 truoc q6', r5[0]?.quotation.id === 'q5' && r5[1]?.quotation.id === 'q6');
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
