import { buildHistoryItemFromServerData } from './baoGiaExport';

let failed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`OK ${name}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// Minimal mock store used by buildHistoryItemFromServerData via dungCuaHangTinhGia
// (materials may be empty — structure will just be blank)

const itemFromSheetsOnly = buildHistoryItemFromServerData({
  id: 'bg-1',
  quotationName: 'BG-TEST',
  createdAt: '2026-08-19T00:00:00.000Z',
  inputValue: { customer: 'KH A', vatRate: 8 },
  pricingSheets: [
    {
      id: 'sheet-1',
      pricingSheetName: 'Túi test',
      customer: { codeName: 'KH A' },
      inputValue: {
        productName: 'Túi test',
        quantity: 10000,
        productType: 'tui',
      },
      saleResult: { finalPrice: 1234 },
    },
  ],
});

assert(
  'maps pricingSheets when productBagSpecs missing',
  {
    productName: itemFromSheetsOnly.productName,
    quantity: itemFromSheetsOnly.quantity,
    finalPrice: itemFromSheetsOnly.finalPrice,
    quoteLen: itemFromSheetsOnly.quoteProducts?.length,
    tierQty: itemFromSheetsOnly.quoteProducts?.[0]?.tiers?.[0]?.quantity,
    tierPrice: itemFromSheetsOnly.quoteProducts?.[0]?.tiers?.[0]?.finalPrice,
  },
  {
    productName: 'Túi test',
    quantity: 10000,
    finalPrice: 1234,
    quoteLen: 1,
    tierQty: 10000,
    tierPrice: 1234,
  },
);

const itemEmpty = buildHistoryItemFromServerData({
  id: 'bg-empty',
  inputValue: {},
  pricingSheets: [],
});

assert(
  'empty bao gia still returns safe numeric defaults',
  {
    quantity: itemEmpty.quantity ?? 0,
    finalPrice: itemEmpty.finalPrice ?? 0,
    quoteLen: itemEmpty.quoteProducts?.length ?? 0,
  },
  { quantity: 0, finalPrice: 0, quoteLen: 0 },
);

if (failed > 0) process.exit(1);
