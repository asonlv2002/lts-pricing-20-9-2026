/**
 * history-filters.test.ts - Kiem tra pheu loc lich su tinh gia/bao gia.
 * Chay: npx tsx src/lib/history-filters.test.ts
 */

import type { HistoryItem, ProductionOrder } from './types';
import {
  DEFAULT_HISTORY_FILTERS,
  filterProductionOrders,
  filterHistoryItems,
  getHistoryItemUnitPrices,
  getPricingWorkflowStatus,
} from './history-filters';

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
  bagType: '3bien',
  filmType: '',
  filmRollLength: 6000,
  quantity: 10000,
  numColors: 4,
  numImages: 1,
  layer1Id: 'PET',
  layer2Id: 'MPET',
  layer3Id: 'LLDPE',
  layer4Id: null,
  layer5Id: null,
  spreadWidth: 0.32,
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
  profitColumn: 1,
  commissionRate: 0,
  commissionFixedVND: 0,
  commissionUnit: 'percent' as const,
  commissionInputValue: 0,
  bagsPerBox: 0,
  boxPrice: 0,
  shippingPerKm: 0,
  shippingKm: 0,
  cylLength: 0.7,
  cylCircum: 0.48,
  cylUnitPrice: 7300000,
  cylType: 'A',
  cylIncluded: false,
  micOverrides: {},
};

function makeItem(patch: Partial<HistoryItem>): HistoryItem {
  return {
    id: 'h1',
    date: '07/06/2026',
    customer: 'Cong ty Gao Viet Xanh',
    productName: 'Tui gao ST25',
    structure: 'PET 12//MPET 12//LLDPE 120',
    quantity: 10000,
    finalPrice: 25000,
    sellerId: 'S1',
    sellerName: 'Nguyen Minh An',
    input: baseInput,
    ...patch,
  };
}

const customers = [
  { id: 'KH001', customerCode: 'KH001', companyName: 'Cong ty Gao Viet Xanh', taxCode: '0312345678' },
  { id: 'KH002', customerCode: 'KH002', companyName: 'Acecook Viet Nam', taxCode: '0300000001' },
];

function makeProductionOrder(patch: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 'LSX-20260607-001',
    quoteId: 'quote-completed',
    createdAt: '2026-06-07T08:00:00.000Z',
    status: 'created',
    manual: {
      lsxNumber: 'LSX-001',
      issuedDate: '07/06/2026',
      preparedBy: 'Nguyen Minh An',
      approvedBy: 'Tran Van B',
      deliveryDate: '20/06/2026',
      notes: 'Can giao som',
      msp: '', tenSP: '', maMucNhu: '', quyCachNote: '', quyCachCuon: '', chieuRaCuonSP: '', soLuongDHNote: '',
      printFilmName: '', printWastePercent: 0, printProductQty: 0, numCylinders: 0, cylDiameter: 0, cylWidth: 0, rollOutWidth: 0, materialQtySupplied: 0, printNotes: '', cylInfo: '', printDirection: '', printMST: '', printProductUnit: '',
      divideWidth: 0, rollLength: 0, divideRollOutWidth: 0, divideDeliveryReq: '', divideNotes: '',
      laminateFilm1: '', laminateFilm1Width: 0, lamWaste: 0, lamProductQty: 0, lamBTP: 0, laminateFilm2: '', laminateNotes: '', lamMaterialSupplyQty: '', lamProductUnit: '', lamBTPNote: '',
      packagingInfo: '', packagingNotes: '', deliveryNotes: '',
      sealEdge: '', foldBottom: '', tearNotch: '', hanTruoc: 0, hanSau: 0, hanBien: 0, hanDau: 0, xepHong: 0, holePunchInfo: '', ventHoleInfo: '', bagWasteMeters: 0, bagLuuY: '', useSemicircularMold: false, useDualCutter: false, bagMachineWaste: 0, bagDeliveryReq: '', bagMachineNotes: '',
    },
    snapshot: {
      customer: 'Cong ty Gao Viet Xanh',
      productName: 'Tui gao ST25',
      productType: 'tui',
      structure: 'PET 12//MPET 12//LLDPE 120',
      quantity: 10000,
      spreadWidth: 0.32,
      cutStep: 0.48,
      numColors: 4,
      bagType: '3bien',
      cylLength: 0.7,
      cylCircum: 0.48,
      filmRollLength: 6000,
      layer1Name: 'PET',
      layer2Name: 'MPET',
      layer3Name: 'LLDPE',
      layer4Name: '',
      layer5Name: '',
      chotGia: 25000,
      totalArea: 1536,
    },
    ...patch,
  };
}

console.log('\n== History filter defaults ==');
assert('defaults to pricing mode', DEFAULT_HISTORY_FILTERS.mode === 'pricing');
assert('defaults to all', DEFAULT_HISTORY_FILTERS.timeRange === 'all');

console.log('\n== Pricing workflow status ==');
assert('locked pricing item maps to locked', getPricingWorkflowStatus(makeItem({ locked: true })) === 'locked');
assert('item used by quote maps to used', getPricingWorkflowStatus(makeItem({ quoteCode: 'BG-001' })) === 'used');
assert('saved pricing item maps to saved', getPricingWorkflowStatus(makeItem({})) === 'saved');
assert('missing final price maps to draft', getPricingWorkflowStatus(makeItem({ finalPrice: 0 })) === 'draft');

console.log('\n== Unit price extraction ==');
const quote = makeItem({
  isQuote: true,
  quoteCode: 'BG-001',
  quoteStatus: 'completed',
  quoteProducts: [
    {
      sourceHistoryItemId: 'p1',
      productName: 'Tui gao ST25 5kg',
      structure: 'PET//MPET//LLDPE',
      quantity: 60000,
      finalPrice: 24000,
      chotGia: 25000,
      input: { ...baseInput, productName: 'Tui gao ST25 5kg', quantity: 60000 },
      tiers: [
        { historyItemId: 'p1', quantity: 60000, finalPrice: 24000, chotGia: 25000 },
        { historyItemId: 'p1', quantity: 100000, finalPrice: 22000 },
      ],
    },
  ],
});
assert('uses quote tier closed price before final price', getHistoryItemUnitPrices(quote).includes(25000));
assert('keeps tier final price when no closed price', getHistoryItemUnitPrices(quote).includes(22000));

console.log('\n== Filtering ==');
const items = [
  makeItem({ id: 'pricing-1', profitRate: 0.12 }),
  makeItem({ id: 'old-no-profit', date: '01/01/2020' }),
  makeItem({ id: 'quote-completed', isQuote: true, quoteCode: 'BG-001', quoteStatus: 'completed', chotGia: 26000, profitRate: 0.18 }),
  makeItem({ id: 'quote-expired', isQuote: true, quoteCode: 'BG-002', quoteStatus: 'expired', profitRate: 0.2 }),
  makeItem({ id: 'other-customer', customer: 'Acecook Viet Nam', productName: 'Mang mi goi', finalPrice: 18000, input: { ...baseInput, customer: 'Acecook Viet Nam', productName: 'Mang mi goi', productType: 'mang', bagType: '', filmType: 'mangGhep', layer1Id: 'BOPP20', layer2Id: 'LLDPE' }, profitRate: 0.09 }),
];

const pricingFiltered = filterHistoryItems(items, {
  ...DEFAULT_HISTORY_FILTERS,
  mode: 'pricing',
  now: new Date('2026-06-07T12:00:00.000Z'),
  customerQuery: 'KH001',
  materialIds: ['PET'],
  unitPriceMin: '20000',
  unitPriceMax: '30000',
  profitRateMin: '10',
  profitRateMax: '15',
}, customers);
assert('filters pricing by customer code, material, unit price and profit', pricingFiltered.map(i => i.id).join(',') === 'pricing-1', pricingFiltered.map(i => i.id).join(','));

const quoteFiltered = filterHistoryItems(items, {
  ...DEFAULT_HISTORY_FILTERS,
  mode: 'quote',
  now: new Date('2026-06-07T12:00:00.000Z'),
  quoteStatuses: ['completed'],
});
assert('filters quote mode to completed quote only', quoteFiltered.map(i => i.id).join(',') === 'quote-completed', quoteFiltered.map(i => i.id).join(','));

const profitFiltered = filterHistoryItems(items, {
  ...DEFAULT_HISTORY_FILTERS,
  mode: 'pricing',
  now: new Date('2026-06-07T12:00:00.000Z'),
  profitRateMin: '10',
  profitRateMax: '20',
}, customers);
assert('profit filter drops records without profitRate', !profitFiltered.some(i => i.id === 'old-no-profit'));

console.log('\n== Production order filtering ==');
const orders = [
  makeProductionOrder({ id: 'lsx-match', status: 'in_production' }),
  makeProductionOrder({ id: 'lsx-wrong-status', status: 'completed' }),
  makeProductionOrder({ id: 'lsx-wrong-date', createdAt: '2020-01-01T08:00:00.000Z', status: 'in_production' }),
  makeProductionOrder({ id: 'lsx-wrong-product-type', status: 'in_production', snapshot: { ...makeProductionOrder({}).snapshot, productType: 'mang' } }),
];
const filteredOrders = filterProductionOrders(orders, {
  ...DEFAULT_HISTORY_FILTERS,
  mode: 'lsx',
  timeRange: '7days',
  now: new Date('2026-06-07T12:00:00.000Z'),
  customerQuery: 'KH001',
  lsxStatuses: ['in_production'],
  productShape: 'tui',
}, customers);
assert('filters LSX by customer code, date, status and product type together', filteredOrders.map(o => o.id).join(',') === 'lsx-match', filteredOrders.map(o => o.id).join(','));

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
