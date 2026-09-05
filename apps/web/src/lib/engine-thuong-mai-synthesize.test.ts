// engine-thuong-mai-synthesize.test.ts — Test synthesizeResultFromCommercial
// Chạy: npx tsx src/lib/engine-thuong-mai-synthesize.test.ts
import assert from 'node:assert/strict';
import { synthesizeResultFromCommercial } from './engine';
import type { CalculateInput, AppConstants } from './types';

const hangSoMacDinh: AppConstants = {
  boxOptions: [
    { key: 'thungNho', price: 5000, label: 'Thùng nhỏ' },
    { key: 'thungLon', price: 10000, label: 'Thùng lớn' },
  ],
} as any;

const cases = [
  {
    ten: 'Có mua + LN% + SL>0: cost basis từ tinhGiaThuongMai, shipping phân bổ theo SL',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 5,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      commercialDescription: 'Túi zipper 3 biên, có quai',
      commercialExtraFee: 0,
      quantity: 50000,
      boxOptionKey: 'thungNho',
      bagsPerBox: 100,
      shippingFee: 1000000,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 294 + 20 + 50 + 0,
      costPerUnit: 294,
      profitRate: 0.05,
      profitAmount: 280 * 0.05 * 50000,
      shippingPerUnit: 20,
      boxPerUnit: 50,
      structureText: 'Túi zipper 3 biên, có quai',
    },
  },
  {
    ten: 'SL=0: profitAmount=0, breakdown vẫn tính per-unit, không có vc/thùng',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 5,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 0,
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 280,
      costPerUnit: 280,
      profitAmount: 0,
      shippingPerUnit: 0,
      boxPerUnit: 0,
    },
  },
  {
    ten: 'LN = 0: profitRate=0, breakdown chỉ có cost basis',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 0,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 10000,
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 280,
      profitRate: 0,
      profitAmount: 0,
      costPerUnit: 280,
    },
  },
  {
    ten: 'commercialDescription rỗng → structureText = "Mô tả khác"',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 1000,
      commercialProfitValue: 10,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 100,
      commercialDescription: '',
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      structureText: 'Mô tả khác',
    },
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  try {
    const kq = synthesizeResultFromCommercial(c.input, hangSoMacDinh, []);
    for (const [k, v] of Object.entries(c.mong)) {
      const actual = (kq as any)[k];
      if (typeof v === 'number') {
        const eps = Math.max(1e-6, Math.abs(v) * 1e-4);
        assert.ok(Math.abs(actual - v) < eps, `[${c.ten}] ${k}: mong ${v}, that ${actual} (delta ${Math.abs(actual - v)})`);
      } else {
        assert.equal(actual, v, `[${c.ten}] ${k}: mong ${v}, that ${actual}`);
      }
    }
    pass++;
  } catch (e) {
    console.error(`FAIL: ${c.ten}`);
    console.error(e);
    fail++;
  }
}
console.log(`\nSynthesize result: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
