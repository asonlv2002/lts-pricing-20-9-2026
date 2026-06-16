/**
 * quotation-status.test.ts - Kiem tra anh xa trang thai bao gia va payload quotation.
 * Chay: pnpm --filter web exec tsx src/lib/api/quotation-status.test.ts
 */

import {
  chuyenTrangThaiBaoGia,
  NHAN_TRANG_THAI_BAO_GIA,
  nopBaoGiaService,
  duyetBaoGiaService,
  taoBanSuaBaoGiaService,
  kiemTraLechPolicy,
  POLICY_CATALOG,
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

console.log('\n== Anh xa trang thai bao gia ==');
assert('null/empty -> drafted', chuyenTrangThaiBaoGia(null) === 'drafted' && chuyenTrangThaiBaoGia('') === 'drafted');
assert('draft/drafted -> drafted', chuyenTrangThaiBaoGia('draft') === 'drafted' && chuyenTrangThaiBaoGia('Drafted') === 'drafted');
assert('submitted -> submitted', chuyenTrangThaiBaoGia('submitted') === 'submitted');
assert('approved -> approved', chuyenTrangThaiBaoGia('approved') === 'approved');
assert('rejected -> rejected', chuyenTrangThaiBaoGia('rejected') === 'rejected');
assert('customer approved -> customer_approved', chuyenTrangThaiBaoGia('customer approved') === 'customer_approved');
assert('customer rejected -> customer_rejected', chuyenTrangThaiBaoGia('customer rejected') === 'customer_rejected');
assert('khong map pending/in_review (backend khong dung)',
  chuyenTrangThaiBaoGia('pending') === 'unknown' && chuyenTrangThaiBaoGia('in_review') === 'unknown');
assert('gia tri la -> unknown', chuyenTrangThaiBaoGia('something_else') === 'unknown');
assert('co nhan tieng Viet cho moi trang thai',
  Boolean(NHAN_TRANG_THAI_BAO_GIA.drafted && NHAN_TRANG_THAI_BAO_GIA.submitted
    && NHAN_TRANG_THAI_BAO_GIA.approved && NHAN_TRANG_THAI_BAO_GIA.rejected
    && NHAN_TRANG_THAI_BAO_GIA.customer_approved && NHAN_TRANG_THAI_BAO_GIA.customer_rejected
    && NHAN_TRANG_THAI_BAO_GIA.unknown));

console.log('\n== Policy catalog dong bo ==');
const catalogCodes = POLICY_CATALOG.map(p => p.code);
assert('catalog co QUOTATION_REVIEWER', catalogCodes.includes('QUOTATION_REVIEWER'));
assert('catalog co PRODUCT_MANAGER', catalogCodes.includes('PRODUCT_MANAGER'));
{
  // Server co policy moi -> phai bao thieu trong catalog
  const lech = kiemTraLechPolicy([{ code: 'BRAND_NEW_POLICY', name: 'x', description: 'y' }]);
  assert('phat hien policy server thieu trong catalog', lech.thieuTrongCatalog.includes('BRAND_NEW_POLICY'));
  assert('bao catalog du khi server khong cung cap', lech.duTrongCatalog.includes('QUOTATION_REVIEWER'));
}

console.log('\n== Payload quotation endpoints ==');

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  capturedUrl = String(input);
  capturedInit = init;
  return new Response(JSON.stringify({ id: 'q1', createdAt: '', updatedAt: '' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function main() {
  try {
    await nopBaoGiaService('q1', 'token');
    assert('nop bao gia goi status_update', capturedUrl.endsWith('/quotations/status_update'), capturedUrl);
    assert('nop bao gia dung PATCH', capturedInit?.method === 'PATCH', String(capturedInit?.method));
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('nop bao gia gui quotationId', body?.quotationId === 'q1', JSON.stringify(body));
    }

    await duyetBaoGiaService('q2', 'rejected', 'token');
    assert('duyet bao gia goi review_update_status', capturedUrl.endsWith('/quotations/review_update_status'), capturedUrl);
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('duyet bao gia gui quotationId + updateStatus',
        body?.quotationId === 'q2' && body?.updateStatus === 'rejected', JSON.stringify(body));
    }

    await taoBanSuaBaoGiaService({ quotationId: 'q3', quotationName: 'ban sua', inputValue: { a: 1 } }, 'token');
    assert('tao ban sua dung PATCH /quotations', capturedUrl.endsWith('/quotations') && capturedInit?.method === 'PATCH', `${capturedUrl} ${capturedInit?.method}`);
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('tao ban sua gui quotationId', body?.quotationId === 'q3', JSON.stringify(body));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
