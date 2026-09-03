/**
 * BuocChonBaoGiaVaTinhGia.test.ts - Kiem tra fallback gia hien thi step 2b.
 * Muc dich: khi sheet inputValue.chotGia = 0 (sale chua chot gia),
 * UI phai fallback sang saleResult.finalPrice / masterResult.finalPrice
 * de tranh hien "0 dong" gay hieu nham.
 * Chay: pnpm --filter web exec tsx src/components/wizard/BuocChonBaoGiaVaTinhGia.test.ts
 */

import type { PricingSheetApi } from '../../lib/api/service-lts';
import { layFinalPriceCuaSheet, layGiaHienThiCuaSheet } from './BuocChonBaoGiaVaTinhGia';

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

function mockSheet(overrides: Partial<PricingSheetApi> = {}): PricingSheetApi {
  return {
    id: 'sheet-1',
    pricingSheetName: 'Test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as PricingSheetApi;
}

console.log('\n== layFinalPriceCuaSheet ==');

assert(
  'saleResult.finalPrice hop le -> lay tu saleResult',
  layFinalPriceCuaSheet(mockSheet({ saleResult: { finalPrice: 30000 } })) === 30000,
);
assert(
  'saleResult null, masterResult.finalPrice -> lay tu masterResult',
  layFinalPriceCuaSheet(
    mockSheet({ saleResult: null, masterResult: { finalPrice: 25000 } }),
  ) === 25000,
);
assert(
  'saleResult khong co finalPrice (object rong) -> fallback masterResult',
  layFinalPriceCuaSheet(
    mockSheet({ saleResult: {}, masterResult: { finalPrice: 18000 } }),
  ) === 18000,
);
assert(
  'ca 2 deu null -> 0',
  layFinalPriceCuaSheet(mockSheet({ saleResult: null, masterResult: null })) === 0,
);
assert(
  'ca 2 deu undefined -> 0',
  layFinalPriceCuaSheet(mockSheet({})) === 0,
);
assert(
  'saleResult.finalPrice = 0, masterResult.finalPrice = 25000 -> 0 (uu tien 0 sale)',
  layFinalPriceCuaSheet(
    mockSheet({ saleResult: { finalPrice: 0 }, masterResult: { finalPrice: 25000 } }),
  ) === 0,
);

console.log('\n== layGiaHienThiCuaSheet (fallback UI step 2b) ==');

// Case 1: chotGia > 0 -> uu tien chotGia
assert(
  '[Case 1] chotGia=50000, saleResult=30000 -> 50000, laGiaEngine=false',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: { finalPrice: 30000 } }),
      { chotGia: 50000, quantity: 100 },
    );
    return r.gia === 50000 && r.laGiaEngine === false;
  })(),
);

// Case 2: chotGia = 0, co saleResult.finalPrice -> fallback engine
assert(
  '[Case 2] chotGia=0, saleResult.finalPrice=30000 -> 30000, laGiaEngine=true',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: { finalPrice: 30000 } }),
      { chotGia: 0, quantity: 100 },
    );
    return r.gia === 30000 && r.laGiaEngine === true;
  })(),
);

// Case 3: chotGia = 0, saleResult null, masterResult co gia
assert(
  '[Case 3] chotGia=0, saleResult=null, masterResult.finalPrice=25000 -> 25000, laGiaEngine=true',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: null, masterResult: { finalPrice: 25000 } }),
      { chotGia: 0, quantity: 100 },
    );
    return r.gia === 25000 && r.laGiaEngine === true;
  })(),
);

// Case 4: chotGia = 0, khong co saleResult/masterResult -> 0, laGiaEngine=false
assert(
  '[Case 4] chotGia=0, khong co result -> 0, laGiaEngine=false',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: null, masterResult: null }),
      { chotGia: 0, quantity: 100 },
    );
    return r.gia === 0 && r.laGiaEngine === false;
  })(),
);

// Case 5: chotGia = 0, saleResult.finalPrice = 0 -> 0, KHONG hien "(gia engine)"
assert(
  '[Case 5] chotGia=0, saleResult.finalPrice=0 -> 0, laGiaEngine=false (tranh hien label nham)',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: { finalPrice: 0 } }),
      { chotGia: 0, quantity: 100 },
    );
    return r.gia === 0 && r.laGiaEngine === false;
  })(),
);

// Case 6: input khong co chotGia (undefined) -> fallback
assert(
  '[Case 6] input khong co chotGia (undefined), saleResult co gia -> fallback',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: { finalPrice: 42000 } }),
      { quantity: 100 },
    );
    return r.gia === 42000 && r.laGiaEngine === true;
  })(),
);

// Case 7: chotGia am (khong hop le) -> fallback
assert(
  '[Case 7] chotGia=-100 (sai), co saleResult -> fallback 30000',
  (() => {
    const r = layGiaHienThiCuaSheet(
      mockSheet({ saleResult: { finalPrice: 30000 } }),
      { chotGia: -100, quantity: 100 },
    );
    return r.gia === 30000 && r.laGiaEngine === true;
  })(),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
