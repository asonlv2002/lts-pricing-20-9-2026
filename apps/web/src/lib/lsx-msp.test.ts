/**
 * lsx-msp.test.ts — gen MSP + tên file export LSX
 * Chạy: npx tsx src/lib/lsx-msp.test.ts
 */

import type { ProductionOrder, LSXManualFields } from './types';
import { genMsp, lsxExportBaseName, safeLsxFileName, MSP_DEFAULT_SEED } from './lsx-msp';

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

function baseManual(partial: Partial<LSXManualFields> = {}): LSXManualFields {
  return {
    lsxNumber: 'LSX-TEST',
    issuedDate: '01/01/2026',
    preparedBy: 'A',
    approvedBy: 'B',
    deliveryDate: '',
    notes: '',
    msp: '',
    tenSP: '',
    maMucNhu: '',
    quyCachNote: '',
    quyCachCuon: '',
    chieuRaCuonSP: '',
    soLuongDHNote: '',
    printFilmName: '',
    printWastePercent: 0,
    printProductQty: 0,
    numCylinders: 0,
    cylDiameter: 0,
    cylWidth: 0,
    rollOutWidth: 0,
    materialQtySupplied: 0,
    printNotes: '',
    cylInfo: '',
    printDirection: '',
    printMST: '',
    printProductUnit: '',
    divideWidth: 0,
    rollLength: 0,
    divideRollOutWidth: 0,
    divideDeliveryReq: '',
    divideNotes: '',
    laminateFilm1: '',
    laminateFilm1Width: 0,
    lamWaste: 0,
    lamProductQty: 0,
    lamBTP: 0,
    laminateFilm2: '',
    laminateNotes: '',
    lamMaterialSupplyQty: '',
    lamProductUnit: '',
    lamBTPNote: '',
    packagingInfo: '',
    packagingNotes: '',
    deliveryNotes: '',
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanTruoc: 0,
    hanSau: 0,
    hanBien: 0,
    hanDau: 0,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    bagWasteMeters: 0,
    bagLuuY: '',
    useSemicircularMold: false,
    useDualCutter: false,
    bagMachineWaste: 0,
    bagDeliveryReq: '',
    bagMachineNotes: '',
    tamZipperCachMieng: 0,
    loTreoInfo: '',
    danLung: 0,
    danLungLech: 0,
    danDay: 0,
    nap: 0,
    songSieuAm: 0,
    docQuaiXach: false,
    danKeoNap: false,
    inDesc: '',
    lamDesc: '',
    divideDesc: '',
    bagDesc: '',
    ...partial,
  };
}

function makeOrder(msp: string, productName = ''): ProductionOrder {
  return {
    id: 'lsx_1',
    quoteId: 'q1',
    createdAt: '2026-01-01',
    status: 'created',
    manual: baseManual({ msp, tenSP: productName }),
    snapshot: {
      customer: 'KH',
      productName,
      productType: 'tui',
      structure: 'PET/PE',
      quantity: 1000,
      spreadWidth: 0.3,
      cutStep: 0.4,
      numColors: 2,
      bagType: '3bien',
      hasZipper: false,
      hasDivide: false,
      cylLength: 0.7,
      cylCircum: 0.6,
      filmRollLength: 1000,
      layer1Name: 'PET12',
      layer2Name: '',
      layer3Name: '',
      layer4Name: '',
      layer5Name: '',
      chotGia: 1000,
      totalArea: 100,
    },
  };
}

console.log('\n=== genMsp ===');
assert('empty list → seed+1', genMsp([]) === `TP_${String(MSP_DEFAULT_SEED + 1).padStart(6, '0')}`, genMsp([]));
assert('max from existing', genMsp([makeOrder('TP_077100')]) === 'TP_077101', genMsp([makeOrder('TP_077100')]));
assert('ignores non-TP codes', genMsp([makeOrder('ABC-99'), makeOrder('TP_000050')]) === 'TP_077021', genMsp([makeOrder('ABC-99'), makeOrder('TP_000050')]));
assert('case insensitive', genMsp([makeOrder('tp_077099')]) === 'TP_077100', genMsp([makeOrder('tp_077099')]));
assert('picks max among many', genMsp([makeOrder('TP_077010'), makeOrder('TP_077200'), makeOrder('TP_077050')]) === 'TP_077201');

console.log('\n=== lsxExportBaseName ===');
const o1 = makeOrder('TP_1', 'TÚI GẠO THƠM 5KG');
assert('uses productName', lsxExportBaseName(o1) === 'TÚI_GẠO_THƠM_5KG', lsxExportBaseName(o1));
const o2 = makeOrder('TP_1', '');
o2.manual.tenSP = 'Ten SP fallback';
assert('fallback tenSP', lsxExportBaseName(o2) === 'Ten_SP_fallback', lsxExportBaseName(o2));
assert('safe strips illegal chars', safeLsxFileName('a/b:c*d') === 'a_b_c_d', safeLsxFileName('a/b:c*d'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
