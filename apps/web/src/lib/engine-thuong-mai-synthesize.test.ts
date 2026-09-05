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
  interestBase: 0.12,
  interestSpread: 0,
} as any;

const cases = [
  {
    ten: 'Có mua + LN% + SL>0: mua+LN+VC(đ/km×km)+thùng+lãi vay(1%/tháng×mua)',
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
      shippingPerKm: 2000,
      shippingKm: 500,
      paymentDays: 30,
    } as unknown as CalculateInput,
    mong: {
      // 294 (mua+LN) + 20 (VC 1tr/50k) + 50 (thùng) + 2.8 (lãi 0.12/12×280) + 0 (HH)
      finalPrice: 294 + 20 + 50 + 2.8,
      costPerUnit: 294,
      profitRate: 0.05,
      profitAmount: 280 * 0.05 * 50000,
      shippingTotal: 1000000,
      shippingPerUnit: 20,
      boxPerUnit: 50,
      interestPerUnit: 2.8,
      commissionPerUnit: 0,
      structureText: 'Túi zipper 3 biên, có quai',
    },
  },
  {
    ten: 'Hoa hồng VND cố định + 90 ngày: lãi ×3, HH cộng thẳng',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 5,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 50000,
      boxPrice: 0,
      bagsPerBox: 1,
      shippingPerKm: 0,
      shippingKm: 0,
      paymentDays: 90,
      commissionUnit: 'vnd',
      commissionFixedVND: 10,
    } as unknown as CalculateInput,
    mong: {
      // 294 + 0 (VC) + 0 (thùng) + 8.4 (lãi 0.12/12×3×280) + 10 (HH/sp)
      finalPrice: 294 + 8.4 + 10,
      interestPerUnit: 8.4,
      commissionPerUnit: 10,
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
      shippingPerKm: 0,
      shippingKm: 0,
      paymentDays: 30,
    } as unknown as CalculateInput,
    mong: {
      // 280 + 0 + 0 + 2.8 (lãi theo đơn giá mua) + 0
      finalPrice: 282.8,
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
      shippingPerKm: 0,
      shippingKm: 0,
      paymentDays: 30,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 282.8,
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
      shippingPerKm: 0,
      shippingKm: 0,
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
