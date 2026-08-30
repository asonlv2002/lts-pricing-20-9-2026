/**
 * quotation-status.test.ts - Kiem tra anh xa trang thai bao gia va payload quotation.
 * Chay: pnpm --filter web exec tsx src/lib/api/quotation-status.test.ts
 */

import {
  chuyenTrangThaiBaoGia,
  NHAN_TRANG_THAI_BAO_GIA,
  nopBaoGiaService,
  duyetBaoGiaService,
  customerDecideBaoGiaService,
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
// Backend chỉ có 4 status (draft/submitted/approved/rejected); "customer approved/rejected"
// là field hasCustomerApproved trên pricing_sheet, KHÔNG phải status quotation.
// → Server không trả về những giá trị này; mapping phải fallback về 'unknown'.
assert('"customer approved" khong map (server khong tra) -> unknown', chuyenTrangThaiBaoGia('customer approved') === 'unknown');
assert('"customer rejected" khong map (server khong tra) -> unknown', chuyenTrangThaiBaoGia('customer rejected') === 'unknown');
assert('khong map pending/in_review (backend khong dung)',
  chuyenTrangThaiBaoGia('pending') === 'unknown' && chuyenTrangThaiBaoGia('in_review') === 'unknown');
assert('gia tri la -> unknown', chuyenTrangThaiBaoGia('something_else') === 'unknown');
assert('NHAN co 4 status + unknown (khong co customer_*)',
  Boolean(NHAN_TRANG_THAI_BAO_GIA.drafted && NHAN_TRANG_THAI_BAO_GIA.submitted
    && NHAN_TRANG_THAI_BAO_GIA.approved && NHAN_TRANG_THAI_BAO_GIA.rejected
    && NHAN_TRANG_THAI_BAO_GIA.unknown
    && (NHAN_TRANG_THAI_BAO_GIA as Record<string, unknown>).customer_approved === undefined
    && (NHAN_TRANG_THAI_BAO_GIA as Record<string, unknown>).customer_rejected === undefined));

console.log('\n== Policy catalog dong bo ==');
const catalogCodes = POLICY_CATALOG.map(p => p.code);
assert('catalog co QUOTATION_REVIEWER', catalogCodes.includes('QUOTATION_REVIEWER'));
assert('catalog co PRODUCT_MANAGER (legacy, server khong ho tro)', catalogCodes.includes('PRODUCT_MANAGER'));
assert('catalog co CUSTOMER_MANAGER', catalogCodes.includes('CUSTOMER_MANAGER'));
assert('catalog co ORDER_REVIEWER', catalogCodes.includes('ORDER_REVIEWER'));
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
     assert('nop bao gia goi /quotations/{id}/status_update', capturedUrl.endsWith('/quotations/q1/status_update'), capturedUrl);
     assert('nop bao gia dung PATCH', capturedInit?.method === 'PATCH', String(capturedInit?.method));
     {
       const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
       assert('nop bao gia body rong (khong co quotationId)', Object.keys(body ?? {}).length === 0, JSON.stringify(body));
     }

     await nopBaoGiaService('q1-pin', 'token', 'pin-token-abc');
     {
       const headers = capturedInit?.headers instanceof Headers ? capturedInit.headers : new Headers(capturedInit?.headers);
       assert('nop bao gia gui x-pin-token khi co pinToken',
         headers.get('x-pin-token') === 'pin-token-abc', String(headers.get('x-pin-token')));
     }

     await duyetBaoGiaService('q2', 'rejected', 'token', 'pin-token-xyz');
     assert('duyet bao gia goi /quotations/{id}/review_update_status', capturedUrl.endsWith('/quotations/q2/review_update_status'), capturedUrl);
     {
       const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
       assert('duyet bao gia chi gui updateStatus (khong co quotationId)',
         body?.quotationId === undefined && body?.updateStatus === 'rejected', JSON.stringify(body));
     }
     {
       const headers = capturedInit?.headers instanceof Headers ? capturedInit.headers : new Headers(capturedInit?.headers);
       assert('duyet bao gia gui x-pin-token khi co pinToken',
         headers.get('x-pin-token') === 'pin-token-xyz', String(headers.get('x-pin-token')));
     }

      await duyetBaoGiaService('q3', 'approved', 'token');
      {
        const headers = capturedInit?.headers instanceof Headers ? capturedInit.headers : new Headers(capturedInit?.headers);
        assert('duyet bao gia khong gui x-pin-token khi thieu pinToken',
          headers.get('x-pin-token') === null, String(headers.get('x-pin-token')));
      }

      // -- Gui statusReason khi tu choi --
      await duyetBaoGiaService('q-rej-reason', 'rejected', 'token', 'pin-token-xyz', 'Bang gia qua cao, can xem lai');
      {
        const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
        assert('tu choi co gui statusReason trong body',
          body?.statusReason === 'Bang gia qua cao, can xem lai', JSON.stringify(body));
        assert('tu choi van gui updateStatus=rejected',
          body?.updateStatus === 'rejected', JSON.stringify(body));
      }

      // -- Ly do trong (whitespace) -> KHONG gui statusReason (server parseOptionalStatusReason tu trim, FE cung nen) --
      await duyetBaoGiaService('q-rej-ws', 'rejected', 'token', 'pin-token-xyz', '   ');
      {
        const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
        assert('ly do chi khoang trang -> KHONG co statusReason trong body',
          !('statusReason' in (body ?? {})), JSON.stringify(body));
      }

      // -- null / undefined / '' -> KHONG gui statusReason (giong cach lsx-order gui reason) --
      await duyetBaoGiaService('q-rej-undef', 'rejected', 'token', 'pin-token-xyz', undefined);
      {
        const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
        assert('ly do undefined -> KHONG co statusReason trong body',
          !('statusReason' in (body ?? {})), JSON.stringify(body));
      }
      await duyetBaoGiaService('q-rej-null', 'rejected', 'token', 'pin-token-xyz', null);
      {
        const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
        assert('ly do null -> KHONG co statusReason trong body',
          !('statusReason' in (body ?? {})), JSON.stringify(body));
      }

      // -- Trim khoang trang o dau/cuoi --
      await duyetBaoGiaService('q-rej-trim', 'rejected', 'token', 'pin-token-xyz', '  Ly do co trim  ');
      {
        const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
        assert('ly do co trim dau/cuoi truoc khi gui',
          body?.statusReason === 'Ly do co trim', JSON.stringify(body));
      }

     await customerDecideBaoGiaService('q4',
       [
         { pricingSheetId: 's1', hasCustomerApproved: true },
         { pricingSheetId: 's2', hasCustomerApproved: false },
       ],
       'token',
       'pin-token-cd',
     );
     assert('customer decide goi /quotations/{id}/customer-decide', capturedUrl.endsWith('/quotations/q4/customer-decide'), capturedUrl);
     assert('customer decide dung PATCH', capturedInit?.method === 'PATCH', String(capturedInit?.method));
     {
       const headers = capturedInit?.headers instanceof Headers ? capturedInit.headers : new Headers(capturedInit?.headers);
       assert('customer decide gui x-pin-token khi co pinToken',
         headers.get('x-pin-token') === 'pin-token-cd', String(headers.get('x-pin-token')));
     }
     {
       // Server mong body LA array truc tiep (xem quotations.controller.ts @Body() customerDecisions: CustomerDecidePricingSheetDto[]).
       // KHONG duoc wrap thanh object { decisions: [...] }.
       const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as unknown[] : null;
       assert('customer decide body LA array truc tiep (khong wrap object)',
         Array.isArray(body), JSON.stringify(body));
       assert('customer decide body co 2 phan tu',
         Array.isArray(body) && body.length === 2, JSON.stringify(body));
       const first = Array.isArray(body) ? body[0] as { pricingSheetId: string; hasCustomerApproved: boolean } : undefined;
       assert('customer decide item[0] co pricingSheetId + hasCustomerApproved',
         first?.pricingSheetId === 's1' && first?.hasCustomerApproved === true, JSON.stringify(first));
       const second = Array.isArray(body) ? body[1] as { pricingSheetId: string; hasCustomerApproved: boolean } : undefined;
       assert('customer decide item[1] co pricingSheetId + hasCustomerApproved',
         second?.pricingSheetId === 's2' && second?.hasCustomerApproved === false, JSON.stringify(second));
     }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
