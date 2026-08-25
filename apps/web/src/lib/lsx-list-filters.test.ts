/**
 * lsx-list-filters.test.ts - Kiem tra pheu loc Danh sach LSX.
 * Chay: npx tsx src/lib/lsx-list-filters.test.ts
 */

import type { ProductionOrder } from './types';
import { DEFAULT_LSX_LIST_FILTERS, filterLsxList } from './lsx-list-filters';

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

function makeOrder(patch: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 'LSX-20260607-001',
    quoteId: 'BG-001',
    createdAt: '2026-06-07T08:00:00.000Z',
    status: 'created',
    manual: {
      lsxNumber: 'LSX-001', issuedDate: '07/06/2026', preparedBy: 'Nguyen Minh An', approvedBy: 'Tran Van B', deliveryDate: '20/06/2026', notes: 'Can giao som',
      msp: '', tenSP: '', maMucNhu: '', quyCachNote: '', quyCachCuon: '', chieuRaCuonSP: '', soLuongDHNote: '',
      printFilmName: '', printWastePercent: 0, printProductQty: 0, numCylinders: 0, cylDiameter: 0, cylWidth: 0, rollOutWidth: 0, materialQtySupplied: 0, printNotes: '', cylInfo: '', printDirection: '', printMST: '', printProductUnit: '',
      divideWidth: 0, rollLength: 0, divideRollOutWidth: 0, divideDeliveryReq: '', divideNotes: '',
      laminateFilm1: '', laminateFilm1Width: 0, lamWaste: 0, lamProductQty: 0, lamBTP: 0, laminateFilm2: '', laminateNotes: '', lamMaterialSupplyQty: '', lamProductUnit: '', lamBTPNote: '',
      packagingInfo: '', packagingNotes: '', deliveryNotes: '',
      sealEdge: '', foldBottom: '', tearNotch: '', hanTruoc: 0, hanSau: 0, hanBien: 0, hanDau: 0, xepHong: 0, holePunchInfo: '', ventHoleInfo: '', bagWasteMeters: 0, bagLuuY: '', useSemicircularMold: false, useDualCutter: false, bagMachineWaste: 0, bagDeliveryReq: '', bagMachineNotes: '',
      tamZipperCachMieng: 0, loTreoInfo: '', danLung: 0, danLungLech: 0, danDay: 0, nap: 0, songSieuAm: 0, docQuaiXach: false, danKeoNap: false,
      inDesc: '', lamDesc: '', divideDesc: '', bagDesc: '',
    },
    snapshot: {
      customer: 'Cong ty Gao Viet Xanh', productName: 'Tui gao ST25', productType: 'tui', structure: 'PET 12//MPET 12//LLDPE 120', quantity: 10000,
      spreadWidth: 0.32, cutStep: 0.48, numColors: 4, bagType: '3bien', hasZipper: false, hasDivide: false, cylLength: 0.7, cylCircum: 0.48, filmRollLength: 6000,
      layer1Name: 'PET', layer2Name: 'MPET', layer3Name: 'LLDPE', layer4Name: '', layer5Name: '', chotGia: 25000, totalArea: 1536,
    },
    ...patch,
  };
}

console.log('\n== LSX list filters ==');
assert('defaults to 30 days', DEFAULT_LSX_LIST_FILTERS.timeRange === '30days');

const orders = [
  makeOrder({ id: 'match', status: 'in_production' }),
  makeOrder({ id: 'wrong-status', status: 'completed' }),
  makeOrder({ id: 'wrong-date', createdAt: '2020-01-01T00:00:00.000Z', status: 'in_production' }),
  makeOrder({ id: 'wrong-delivery', status: 'in_production', manual: { ...makeOrder({}).manual, deliveryDate: '01/07/2026' } }),
  makeOrder({ id: 'wrong-price', status: 'in_production', snapshot: { ...makeOrder({}).snapshot, chotGia: 50000 } }),
  makeOrder({ id: 'wrong-qty', status: 'in_production', snapshot: { ...makeOrder({}).snapshot, quantity: 1000 } }),
  makeOrder({ id: 'wrong-type', status: 'in_production', snapshot: { ...makeOrder({}).snapshot, productType: 'mang' } }),
  makeOrder({ id: 'wrong-preparer', status: 'in_production', manual: { ...makeOrder({}).manual, preparedBy: 'Nguoi Khac' } }),
];

const filtered = filterLsxList(orders, {
  ...DEFAULT_LSX_LIST_FILTERS,
  now: new Date('2026-06-07T12:00:00.000Z'),
  keyword: 'BG-001 ST25',
  statuses: ['in_production'],
  productTypes: ['tui'],
  deliveryFromDate: '2026-06-19',
  deliveryToDate: '2026-06-21',
  quantityMin: '5000',
  quantityMax: '20000',
  priceMin: '20000',
  priceMax: '30000',
  preparedByQuery: 'Minh An',
  approvedByQuery: 'Tran Van B',
});

assert('applies keyword, status, type, dates, quantity, price and people filters together', filtered.map(o => o.id).join(',') === 'match', filtered.map(o => o.id).join(','));

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
