/**
 * quote-to-lsx.test.ts - Kiem tra chuyen bao gia da chot sang dong tao LSX.
 * Chay: npx tsx src/lib/quote-to-lsx.test.ts
 */

import type { HistoryItem, ProductionOrder } from './types';
import { buildHistoryItemForLsx, getLsxQuoteLines, hasExistingProductionOrderForLine } from './quote-to-lsx';

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

const input = {
  customer: 'Cong ty Gao Viet Xanh',
  productName: 'Tui gao ST25',
  productType: 'tui',
  bagType: '3bien',
  filmType: '',
  filmRollLength: 6000,
  quantity: 60000,
  numColors: 6,
  numImages: 1,
  layer1Id: 'PET',
  layer2Id: 'MPET',
  layer3Id: 'LLDPE',
  layer4Id: null,
  layer5Id: null,
  spreadWidth: 0.34,
  cutStep: 0.48,
  metallicSurcharge: 0,
  coverageRatio: 1,
  handleWeight: 0,
  zipperWeight: 0,
  tapeWeight: 0,
  hasZipper: false,
  hasTape: false,
  hasHandle: false,
  paymentDays: 30,
  profitColumn: 2,
  commissionRate: 0,
  commissionFixedVND: 0,
  commissionUnit: 'percent' as const,
  commissionInputValue: 0,
  bagsPerBox: 100,
  boxPrice: 42000,
  shippingPerKm: 2500,
  shippingKm: 45,
  cylLength: 0.7,
  cylCircum: 0.48,
  cylUnitPrice: 7300000,
  cylType: 'A',
  cylIncluded: false,
  micOverrides: {},
};

function makeQuote(patch: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'q1',
    date: '07/06/2026',
    customer: 'Cong ty Gao Viet Xanh',
    productName: 'Bao gia 2 san pham',
    structure: 'PET//MPET//LLDPE',
    quantity: 60000,
    finalPrice: 24000,
    chotGia: 25000,
    isQuote: true,
    quoteCode: 'BG-001',
    quoteStatus: 'completed',
    sellerId: 'S1',
    sellerName: 'Nguyen Minh An',
    input,
    quoteProducts: [
      {
        sourceHistoryItemId: 'p1',
        productName: 'Tui gao ST25 5kg',
        structure: 'PET 12//MPET 12//LLDPE 120',
        quantity: 60000,
        finalPrice: 24000,
        chotGia: 25000,
        input: { ...input, productName: 'Tui gao ST25 5kg', quantity: 60000 },
        tiers: [
          { historyItemId: 'p1', quantity: 60000, finalPrice: 24000, chotGia: 25000 },
          { historyItemId: 'p1', quantity: 100000, finalPrice: 22000 },
        ],
      },
      {
        sourceHistoryItemId: 'p2',
        productName: 'Tui gao ST25 10kg',
        structure: 'PET 12//MPET 12//LLDPE 140',
        quantity: 30000,
        finalPrice: 38000,
        input: { ...input, productName: 'Tui gao ST25 10kg', quantity: 30000, cutStep: 0.62 },
        tiers: [],
      },
    ],
    ...patch,
  };
}

console.log('\n== Quote line extraction ==');
assert('non-completed quote cannot create LSX lines', getLsxQuoteLines(makeQuote({ quoteStatus: 'approved' })).length === 0);

const lines = getLsxQuoteLines(makeQuote());
assert('completed quote creates one line per tier plus product without tiers', lines.length === 3, String(lines.length));
assert('first tier uses closed price', lines[0]?.chotGia === 25000, String(lines[0]?.chotGia));
assert('second tier keeps final price when no closed price', lines[1]?.finalPrice === 22000 && lines[1]?.chotGia === undefined, JSON.stringify(lines[1]));
assert('product without tiers creates direct line', lines[2]?.productName === 'Tui gao ST25 10kg', lines[2]?.productName);

console.log('\n== Build temporary HistoryItem for LSX form ==');
const lsxItem = buildHistoryItemForLsx(makeQuote(), lines[1]!);
assert('temporary item id contains quote id and line key', lsxItem.id.startsWith('q1:'), lsxItem.id);
assert('temporary item keeps quote code for traceability', lsxItem.quoteCode === 'BG-001', lsxItem.quoteCode);
assert('temporary item uses selected tier quantity', lsxItem.quantity === 100000, String(lsxItem.quantity));
assert('temporary input uses selected line quantity', lsxItem.input.quantity === 100000, String(lsxItem.input.quantity));
assert('temporary item is not treated as quote by LSX form', lsxItem.isQuote === false);

console.log('\n== Existing order soft duplicate ==');
const orders: ProductionOrder[] = [
  {
    id: 'lsx1',
    quoteId: `${makeQuote().id}:${lines[0]!.key}`,
    createdAt: '2026-06-07T00:00:00.000Z',
    status: 'created',
    manual: {} as ProductionOrder['manual'],
    snapshot: {
      customer: 'Cong ty Gao Viet Xanh',
      productName: 'Tui gao ST25 5kg',
      productType: 'tui',
      structure: 'PET 12//MPET 12//LLDPE 120',
      quantity: 60000,
      spreadWidth: 0.34,
      cutStep: 0.48,
      numColors: 6,
      bagType: '3bien',
      hasZipper: false,
      hasDivide: false,
      cylLength: 0.7,
      cylCircum: 0.48,
      filmRollLength: 6000,
      layer1Name: 'PET',
      layer2Name: 'MPET',
      layer3Name: 'LLDPE',
      layer4Name: '',
      layer5Name: '',
      chotGia: 25000,
      totalArea: 0,
    },
  },
];

assert('detects existing LSX by quote line id', hasExistingProductionOrderForLine(orders, makeQuote(), lines[0]!) === true);
assert('does not mark another tier as duplicate', hasExistingProductionOrderForLine(orders, makeQuote(), lines[1]!) === false);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
