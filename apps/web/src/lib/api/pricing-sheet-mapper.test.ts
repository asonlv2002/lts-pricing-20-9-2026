/**
 * pricing-sheet-mapper.test.ts - Kiem tra mapper HistoryItem -> payload POST /pricing-sheet.
 * Chay: pnpm --filter web exec tsx src/lib/api/pricing-sheet-mapper.test.ts
 */

import { mapHistoryToPricingSheet } from './pricing-sheet-mapper';
import type { HistoryItem } from '../types';

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

const baseInput = {
  customer: 'Cong ty Gao Viet Xanh',
  productName: 'Tui gao ST25',
  productType: 'tui',
  bagType: 'flat',
  filmType: '',
  quantity: 10000,
} as unknown as HistoryItem['input'];

function makeItem(over: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'h1',
    date: '2026-06-18',
    customer: 'Cong ty Gao Viet Xanh',
    productName: 'Túi gạo ST25',
    structure: 'PET 12//LLDPE 120',
    quantity: 10000,
    finalPrice: 1234,
    input: baseInput,
    ...over,
  };
}

console.log('\n== mapHistoryToPricingSheet ==');

{
  const item = makeItem({
    saleOverrides: { print: { matPrice: 52000 } },
    adminOverrides: { cut: { waste: 4.5 } },
  });
  const payload = mapHistoryToPricingSheet(item, 'ACME_01');

  assert('pricingSheetName lay tu productName', payload.pricingSheetName === 'Túi gạo ST25', payload.pricingSheetName);
  assert('customerCodeName giu nguyen tham so', payload.customerCodeName === 'ACME_01', payload.customerCodeName);
  assert('inputValue giu nguyen reference input', payload.inputValue === item.input);
  assert('saleResult = { overrides: saleOverrides }',
    (payload.saleResult as { overrides?: unknown })?.overrides === item.saleOverrides,
    JSON.stringify(payload.saleResult));
  assert('masterResult = { overrides: adminOverrides }',
    (payload.masterResult as { overrides?: unknown })?.overrides === item.adminOverrides,
    JSON.stringify(payload.masterResult));
  assert('khong gui note khi rong', payload.note === undefined);
}

{
  // Override rong ({}) phai map thanh undefined, khong gui key thua.
  const item = makeItem({ saleOverrides: {}, adminOverrides: {} });
  const payload = mapHistoryToPricingSheet(item, 'ACME_01');
  assert('saleResult rong -> undefined', payload.saleResult === undefined);
  assert('masterResult rong -> undefined', payload.masterResult === undefined);
}

{
  // Khong co override (undefined) cung -> undefined.
  const item = makeItem();
  const payload = mapHistoryToPricingSheet(item, 'ACME_01');
  assert('saleOverrides undefined -> undefined', payload.saleResult === undefined);
  assert('adminOverrides undefined -> undefined', payload.masterResult === undefined);
}

{
  // Note co gia tri -> trim va gui kem.
  const item = makeItem();
  const payload = mapHistoryToPricingSheet(item, 'ACME_01', '  Ghi chu test  ');
  assert('note duoc trim', payload.note === 'Ghi chu test', String(payload.note));
}

{
  // Chi mot ben co override.
  const item = makeItem({ saleOverrides: { print: { matPrice: 1 } } });
  const payload = mapHistoryToPricingSheet(item, 'ACME_01');
  assert('chi sale co override',
    (payload.saleResult as { overrides?: unknown })?.overrides === item.saleOverrides &&
      payload.masterResult === undefined,
    JSON.stringify(payload));
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
