// engine-thuong-mai.test.ts — Tinh gia thuong mai (mua di ban lai)
// Chay: npx tsx src/lib/engine-thuong-mai.test.ts
import assert from 'node:assert/strict';
import { tinhGiaThuongMai, type KetQuaThuongMai } from './engine';

type Case = {
  ten: string;
  dauVao: Parameters<typeof tinhGiaThuongMai>[0];
  mong: Partial<KetQuaThuongMai>;
};

const cases: Case[] = [
  {
    ten: 'Percent + SL=1: 1.000.000 × 1 + 20% = 1.200.000 (1.200.000 / cái)',
    dauVao: {
      commercialPurchasePrice: 1_000_000,
      quantity: 1,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 20,
      commercialUnitKind: 'tui',
    } as any,
    mong: {
      purchasePrice: 1_000_000,
      quantity: 1,
      purchaseTotal: 1_000_000,
      profitVnd: 200_000,
      totalVnd: 1_200_000,
      unitPriceVnd: 1_200_000,
      profitPct: 0.2,
      unitLabel: '/Túi',
      unitKind: 'tui',
    },
  },
  {
    ten: 'Percent + SL=1000: 1.000.000 × 1000 + 20% = 1.200.000.000 (1.200.000 / cái)',
    dauVao: {
      commercialPurchasePrice: 1_000_000,
      quantity: 1000,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 20,
      commercialUnitKind: 'tui',
    } as any,
    mong: {
      purchasePrice: 1_000_000,
      quantity: 1000,
      purchaseTotal: 1_000_000_000,
      profitVnd: 200_000_000,
      totalVnd: 1_200_000_000,
      unitPriceVnd: 1_200_000,
      profitPct: 0.2,
      unitLabel: '/Túi',
    },
  },
  {
    ten: 'VND: 1.000.000 × 1000 + 150.000 (cố định) = 1.000.150.000 (1.000.150 / cái)',
    dauVao: {
      commercialPurchasePrice: 1_000_000,
      quantity: 1000,
      commercialProfitUnit: 'vnd',
      commercialProfitValue: 150_000,
      commercialUnitKind: 'tui',
    } as any,
    mong: {
      purchasePrice: 1_000_000,
      quantity: 1000,
      purchaseTotal: 1_000_000_000,
      profitVnd: 150_000,
      totalVnd: 1_000_150_000,
      unitPriceVnd: 1_000_150,
      profitPct: 0.00015,
      unitLabel: '/Túi',
    },
  },
  {
    ten: 'SL=0: Tổng = LN; đơn giá = purchasePrice (fallback)',
    dauVao: {
      commercialPurchasePrice: 500_000,
      quantity: 0,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 10,
      commercialUnitKind: 'm2',
    } as any,
    mong: {
      purchasePrice: 500_000,
      quantity: 0,
      purchaseTotal: 0,
      profitVnd: 0,
      totalVnd: 0,
      unitPriceVnd: 500_000,
      profitPct: 0,
      unitLabel: '/m²',
    },
  },
  {
    ten: 'Custom unit: /thùng',
    dauVao: {
      commercialPurchasePrice: 200_000,
      quantity: 50,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 25,
      commercialUnitKind: 'custom',
      commercialUnitLabel: 'thùng',
    } as any,
    mong: {
      purchasePrice: 200_000,
      quantity: 50,
      purchaseTotal: 10_000_000,
      profitVnd: 2_500_000,
      totalVnd: 12_500_000,
      unitPriceVnd: 250_000,
      unitLabel: '/thùng',
      unitKind: 'custom',
    },
  },
  {
    ten: 'm đơn vị: /m',
    dauVao: {
      commercialPurchasePrice: 12_000,
      quantity: 500,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 30,
      commercialUnitKind: 'm',
    } as any,
    mong: {
      purchasePrice: 12_000,
      quantity: 500,
      purchaseTotal: 6_000_000,
      profitVnd: 1_800_000,
      totalVnd: 7_800_000,
      unitPriceVnd: 15_600,
      unitLabel: '/m',
    },
  },
  {
    ten: 'Default unit = tui khi không truyền commercialUnitKind',
    dauVao: {
      commercialPurchasePrice: 1000,
      quantity: 10,
      commercialProfitValue: 10,
    } as any,
    mong: { unitKind: 'tui', unitLabel: '/Túi' },
  },
  {
    ten: 'Custom label rỗng → /đơn vị fallback',
    dauVao: {
      commercialPurchasePrice: 1000,
      quantity: 10,
      commercialUnitKind: 'custom',
      commercialUnitLabel: '',
    } as any,
    mong: { unitLabel: '/đơn vị' },
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  try {
    const kq = tinhGiaThuongMai(c.dauVao);
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
console.log(`\nTinh gia thuong mai: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
