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
      baseCostTotal: 1_000_000,    // = purchaseTotal, KHÔNG + extraFee
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
      baseCostTotal: 1_000_000_000,
      profitVnd: 200_000_000,
      totalVnd: 1_200_000_000,
      unitPriceVnd: 1_200_000,
      profitPct: 0.2,
      unitLabel: '/Túi',
    },
  },
  {
    // VND = /sp (per piece). profitRaw 150.000 × SL 1000 = 150.000.000 (total profit).
    // baseCostTotal = purchaseTotal (KHÔNG + extraFee, vì extraFee=0).
    ten: 'VND/sp + SL=1000: mua 1.000.000 × 1000 + LN 150.000₫/sp = 1.150.000.000 (1.150.000 / cái)',
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
      baseCostTotal: 1_000_000_000,
      profitVnd: 150_000_000,      // 150.000 × 1000 (per piece × SL)
      profitPerUnit: 150_000,      // /sp
      totalVnd: 1_150_000_000,
      unitPriceVnd: 1_150_000,
      profitPct: 0.15,             // 150tr / 1 tỷ
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
      baseCostTotal: 0,
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
      baseCostTotal: 10_000_000,
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
      baseCostTotal: 6_000_000,
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
  {
    // Phụ phí TÁCH RIÊNG, KHÔNG vào baseCost, KHÔNG ảnh hưởng LN%.
    // baseCost = purchaseTotal = 100.000. LN 20% = 100.000 × 20% = 20.000.
    // totalVnd = 100.000 + 20.000 = 120.000. unitPriceVnd = 1.200 (chưa gồm extraFee).
    ten: 'Phụ phí tách riêng: mua 1.000 + phụ phí 50.000 + LN 20% — LN KHÔNG chịu ảnh hưởng phụ phí',
    dauVao: {
      commercialPurchasePrice: 1_000,
      quantity: 100,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 20,
      commercialExtraFee: 50_000,
      commercialUnitKind: 'tui',
    } as any,
    mong: {
      purchaseTotal: 100_000,
      extraFee: 50_000,
      extraFeePerUnit: 500,
      baseCostTotal: 100_000,      // KHÔNG + extraFee
      baseCostPerUnit: 1_000,
      profitVnd: 20_000,           // 100.000 × 20% (purchase only)
      profitPerUnit: 200,
      totalVnd: 120_000,           // 100.000 + 20.000 (KHÔNG + extraFee)
      unitPriceVnd: 1_200,         // 120.000 / 100
      profitPct: 0.2,
    },
  },
  {
    // extraFee=0 → behavior giống case không có phụ phí.
    ten: 'extraFee = 0: backward-compat — không ảnh hưởng tổng',
    dauVao: {
      commercialPurchasePrice: 2_000,
      quantity: 10,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 10,
      commercialExtraFee: 0,
    } as any,
    mong: {
      extraFee: 0,
      extraFeePerUnit: 0,
      baseCostTotal: 20_000,       // = purchaseTotal (extraFee=0)
      profitVnd: 2_000,            // 20.000 × 10%
      profitPerUnit: 200,
      totalVnd: 22_000,
      unitPriceVnd: 2_200,
      profitPct: 0.1,
    },
  },
  {
    ten: 'extraFee âm được clamp về 0',
    dauVao: {
      commercialPurchasePrice: 1_000,
      quantity: 10,
      commercialProfitValue: 10,
      commercialExtraFee: -5_000,
    } as any,
    mong: { extraFee: 0, extraFeePerUnit: 0, baseCostTotal: 10_000, profitVnd: 1_000, totalVnd: 11_000, unitPriceVnd: 1_100 },
  },
  {
    // Phụ phí 20.000 tách riêng, KHÔNG vào baseCost.
    // baseCost = 100.000.000. LN 20% = 20.000.000. totalVnd = 120.000.000.
    ten: 'Phụ phí lớn ở SL lớn: mua 1.000 × 100.000 + phụ phí 20.000 + LN 20% (KHÔNG bị 0, KHÔNG + extraFee)',
    dauVao: {
      commercialPurchasePrice: 1_000,
      quantity: 100_000,
      commercialProfitUnit: 'percent',
      commercialProfitValue: 20,
      commercialExtraFee: 20_000,
    } as any,
    mong: {
      purchaseTotal: 100_000_000,
      extraFee: 20_000,
      extraFeePerUnit: 0.2,
      baseCostTotal: 100_000_000,  // KHÔNG + extraFee
      profitVnd: 20_000_000,       // 100tr × 20%
      totalVnd: 120_000_000,
      unitPriceVnd: 1_200,
    },
  },
  {
    // VND = /sp. profitRaw 50.000 × SL 100 = 5.000.000. baseCost = 100.000 (no extraFee).
    ten: 'VND/sp + phụ phí: profit = 50.000₫/sp × 100 = 5.000.000 (KHÔNG phụ thuộc extraFee)',
    dauVao: {
      commercialPurchasePrice: 1_000,
      quantity: 100,
      commercialProfitUnit: 'vnd',
      commercialProfitValue: 50_000,
      commercialExtraFee: 20_000,
    } as any,
    mong: {
      purchaseTotal: 100_000,
      extraFee: 20_000,
      extraFeePerUnit: 200,
      baseCostTotal: 100_000,      // KHÔNG + extraFee
      profitVnd: 5_000_000,        // 50.000 × 100 (per piece × SL)
      profitPerUnit: 50_000,
      totalVnd: 5_100_000,         // 100.000 + 5.000.000
      unitPriceVnd: 51_000,
    },
  },
  {
    // Suy VND → %: profitRaw 20₫/sp, mua 200₫/sp, SL 10.000.
    // profitVnd = 20 × 10.000 = 200.000. profitPct = 200.000 / 2.000.000 = 0.1 (= 10%).
    // totalVnd = 2.000.000 + 200.000 = 2.200.000. unitPriceVnd = 220.
    // extraFee 1.000.000 tách riêng, KHÔNG ảnh hưởng LN%.
    ten: 'Suy VND → %: mua 200₫/sp + LN 20₫/sp + phụ phí 1.000.000₫ (SL 10.000) → profitPct = 10%',
    dauVao: {
      commercialPurchasePrice: 200,
      quantity: 10_000,
      commercialProfitUnit: 'vnd',
      commercialProfitValue: 20,
      commercialExtraFee: 1_000_000,
      commercialUnitKind: 'tui',
    } as any,
    mong: {
      purchaseTotal: 2_000_000,
      extraFee: 1_000_000,
      extraFeePerUnit: 100,
      baseCostTotal: 2_000_000,    // KHÔNG + extraFee
      profitVnd: 200_000,          // 20 × 10.000
      profitPerUnit: 20,
      totalVnd: 2_200_000,         // 2tr + 200k
      unitPriceVnd: 220,           // = mua + LN/sp
      profitPct: 0.1,              // 200k / 2tr = 10%
    },
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
