// ═════════════════════════════════════════════════════════════════════════════
// Test cho pricing-sheet-sync.ts (quyetDinhPricingSheetSync)
// ═════════════════════════════════════════════════════════════════════════════

import { quyetDinhPricingSheetSync } from './pricing-sheet-sync';
import type { HistoryItem } from './types';

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

function makeItem(over: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'h1',
    date: '2026-06-18',
    customer: 'Cong ty ABC',
    productName: 'Tui ABC',
    structure: 'PET 12//LLDPE 120',
    quantity: 10000,
    finalPrice: 1234,
    input: {
      customer: 'Cong ty ABC',
      productName: 'Tui ABC',
      productType: 'tui',
      bagType: 'flat',
      filmType: '',
      quantity: 10000,
      numColors: 0,
      numImages: 1,
      spreadWidth: 0,
      cutStep: 0,
      metallicSurcharge: 0,
      coverageRatio: 0,
      handleWeight: 0,
      zipperWeight: 0,
      tapeWeight: 0,
      hasZipper: false,
      hasTape: false,
      hasHandle: false,
      paymentDays: 30,
      profitColumn: 1,
      commissionRate: 0,
      commissionFixedVND: 0,
      commissionUnit: 'percent',
      commissionInputValue: 0,
      bagsPerBox: 0,
      boxPrice: 0,
      shippingPerKm: 0,
      shippingKm: 0,
      cylLength: 0,
      cylCircum: 0,
      cylUnitPrice: 0,
      cylType: '',
      cylIncluded: false,
      filmRollLength: 0,
    },
    ...over,
  };
}

// Mock localStorage với 1 customer mẫu
const mockStorage: Record<string, string> = {
  lts_customers: JSON.stringify([
    { companyName: 'Cong ty ABC', contactName: 'ABC', customerCode: 'ACME_01', id: 'ACME_01' },
  ]),
};

// Gán vào global nếu chưa có
if (typeof globalThis.localStorage === 'undefined') {
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
    length: 0,
    key: () => null,
  };
}

// --- Test cases ---

console.log('\n== quyetDinhPricingSheetSync ==');

// 1. undefined history -> skip
{
  const decision = quyetDinhPricingSheetSync(undefined, true, 'token');
  assert('undefined h -> skip', decision.action === 'skip' && !decision.includeAdvisor);
}

// 2. chưa đăng nhập -> skip
{
  const decision = quyetDinhPricingSheetSync(makeItem(), false, 'token');
  assert('not authenticated -> skip', decision.action === 'skip');
}

// 3. accessToken null -> skip
{
  const decision = quyetDinhPricingSheetSync(makeItem(), true, null);
  assert('accessToken null -> skip', decision.action === 'skip');
}

// 4. Không tìm thấy mã KH (customer rỗng) -> skip
{
  const item = makeItem({ customer: '' });
  const decision = quyetDinhPricingSheetSync(item, true, 'token');
  assert('khong tim thay ma KH -> skip', decision.action === 'skip');
}

// 5. Không có pricingSheetId -> postCreate, includeAdvisor = false
{
  const item = makeItem();
  const decision = quyetDinhPricingSheetSync(item, true, 'token', undefined);
  assert('khong co pricingSheetId -> postCreate', decision.action === 'postCreate' && !decision.includeAdvisor);
}

// 6. Có pricingSheetId, không có adminOverrides -> patch, includeAdvisor = false
{
  const item = makeItem();
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123');
  assert('co pricingSheetId, khong co adminOverrides -> patch, no advisor', decision.action === 'patch' && !decision.includeAdvisor);
}

// 7. Có pricingSheetId, có adminOverrides với data -> patch, includeAdvisor = true
{
  const item = makeItem({
    adminOverrides: { print: { matPrice: 52000 } },
  });
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123');
  assert('co pricingSheetId, co adminOverrides -> patch, advisor', decision.action === 'patch' && decision.includeAdvisor);
}

// 8. Có pricingSheetId, adminOverrides rỗng {} -> patch, includeAdvisor = false
{
  const item = makeItem({ adminOverrides: {} });
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123');
  assert('adminOverrides rong -> patch, no advisor', decision.action === 'patch' && !decision.includeAdvisor);
}

// 9. pricingSheetId là null -> postCreate
{
  const item = makeItem();
  const decision = quyetDinhPricingSheetSync(item, true, 'token', null);
  assert('pricingSheetId null -> postCreate', decision.action === 'postCreate');
}

// 10. Chỉ adminProfitRatePct (không opts) -> includeAdvisor = true (legacy)
{
  const item = makeItem({ adminOverrides: {}, adminProfitRatePct: 10 });
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123');
  assert('chi LN admin (legacy) -> includeAdvisor', decision.action === 'patch' && decision.includeAdvisor);
}

// 11. Advisor syncAdvisor=true dù overrides rỗng + không LN -> includeAdvisor (clear master)
{
  const item = makeItem({ adminOverrides: {}, adminProfitRatePct: 0 });
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123', { syncAdvisor: true });
  assert('syncAdvisor clear master -> includeAdvisor', decision.action === 'patch' && decision.includeAdvisor);
}

// 12. Sale syncAdvisor=false dù history còn adminOverrides -> không advisor (tránh 403)
{
  const item = makeItem({
    adminOverrides: { cut: { thoiGianPhut: 900 } },
    adminProfitRatePct: 10,
  });
  const decision = quyetDinhPricingSheetSync(item, true, 'token', 'sheet-123', { syncAdvisor: false });
  assert('sale syncAdvisor false -> no includeAdvisor', decision.action === 'patch' && !decision.includeAdvisor);
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
