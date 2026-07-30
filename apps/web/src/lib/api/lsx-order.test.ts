/**
 * lsx-order.test.ts - Kiem tra 4 service wrappers cho quotation pricing sheet orders.
 * Chay: pnpm --filter web exec tsx src/lib/api/lsx-order.test.ts
 */

import {
  listQuotationPricingSheetOrdersService,
  createQuotationPricingSheetOrdersService,
  updateQuotationPricingSheetOrderService,
  updateOrderApprovalService,
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

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  capturedUrl = String(input);
  capturedInit = init;
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function main() {
  try {
    // Test 1: listQuotationPricingSheetOrdersService
    console.log('\n== listQuotationPricingSheetOrdersService ==');
    await listQuotationPricingSheetOrdersService('token');
    assert('list goi /quotations/orders', capturedUrl.endsWith('/quotations/orders'), capturedUrl);
    assert('list dung GET', capturedInit?.method === 'GET' || capturedInit?.method === undefined,
      String(capturedInit?.method));

    // Test 2: createQuotationPricingSheetOrdersService
    console.log('\n== createQuotationPricingSheetOrdersService ==');
    await createQuotationPricingSheetOrdersService('q1', 'token');
    assert('create goi /quotations/{id}/create-orders', capturedUrl.endsWith('/quotations/q1/create-orders'), capturedUrl);
    assert('create dung POST', capturedInit?.method === 'POST', String(capturedInit?.method));
    {
      const auth = (capturedInit?.headers as Headers | undefined)?.get('Authorization');
      assert('create co Authorization header',
        Boolean(auth?.includes('Bearer token')), String(auth));
    }

    // Test 3: updateQuotationPricingSheetOrderService
    console.log('\n== updateQuotationPricingSheetOrderService ==');
    const sampleForm = { lsxNumber: '2607.01', preparedBy: 'NV.A' };
    await updateQuotationPricingSheetOrderService('ord_1', { inputValue: sampleForm }, 'token');
    assert('update goi /quotations/orders/{id}', capturedUrl.endsWith('/quotations/orders/ord_1'), capturedUrl);
    assert('update dung PATCH', capturedInit?.method === 'PATCH', String(capturedInit?.method));
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> | null : null;
      assert('update body co field inputValue', Boolean(body && 'inputValue' in body), JSON.stringify(body));
      const inputVal = body?.inputValue as { lsxNumber: string } | null;
      assert('update inputValue dung gia tri form', inputVal?.lsxNumber === '2607.01',
        JSON.stringify(body?.inputValue));
    }

    // Test 4: updateQuotationPricingSheetOrderService cho phep null (clear)
    console.log('\n== updateQuotationPricingSheetOrderService (clear inputValue) ==');
    await updateQuotationPricingSheetOrderService('ord_1', { inputValue: null }, 'token');
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> | null : null;
      assert('update inputValue=null duoc phep', Boolean(body && 'inputValue' in body && body.inputValue === null),
        JSON.stringify(body));
    }

    // Test 5: updateOrderApprovalService (duyet)
    console.log('\n== updateOrderApprovalService (duyet) ==');
    await updateOrderApprovalService('ord_2', true, 'token');
    assert('approve goi /quotations/orders/{id}/approval', capturedUrl.endsWith('/quotations/orders/ord_2/approval'), capturedUrl);
    assert('approve dung PATCH', capturedInit?.method === 'PATCH', String(capturedInit?.method));
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('approve body co hasAdvisorApproved=true', body?.hasAdvisorApproved === true, JSON.stringify(body));
    }

    // Test 6: updateOrderApprovalService (tu choi)
    console.log('\n== updateOrderApprovalService (tu choi) ==');
    await updateOrderApprovalService('ord_3', false, 'token');
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('reject body co hasAdvisorApproved=false', body?.hasAdvisorApproved === false, JSON.stringify(body));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
