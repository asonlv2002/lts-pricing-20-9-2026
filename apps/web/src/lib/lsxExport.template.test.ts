/**
 * lsxExport.template.test.ts - resolveLsxDocxTemplate + hasDivide helpers.
 * Chạy: npx tsx src/lib/lsxExport.template.test.ts
 */

import type { ProductionOrder, LSXManualFields } from './types';
import {
  resolveLsxDocxTemplate,
  resolveLsxBagTypeInfo,
  orderHasDivide,
  orderStageLayout,
} from './lsxExport';
import { resolveLsxHasDivide, resolveLsxStageLayout } from './lsx-bag-classification';

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
    printProductUnit: 'MD',
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
    lamProductUnit: 'MD',
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
    ...partial,
  };
}

function order(
  productType: string,
  bagType: string,
  hasZipper: boolean,
  override?: string,
  divide?: { hasDivide?: boolean; divideWidthMm?: number; divideWidth?: number },
): ProductionOrder {
  return {
    id: 'lsx_1',
    quoteId: 'q1',
    createdAt: new Date().toISOString(),
    status: 'created',
    manual: baseManual({
      lsxBagTypeOverride: override,
      divideWidth: divide?.divideWidth ?? 0,
    }),
    snapshot: {
      customer: 'KH',
      productName: 'SP',
      productType,
      structure: 'A/B',
      quantity: 1000,
      spreadWidth: 0.5,
      cutStep: 0.3,
      numColors: 4,
      bagType,
      hasZipper,
      hasDivide: divide?.hasDivide ?? false,
      divideWidthMm: divide?.divideWidthMm,
      cylLength: 0.7,
      cylCircum: 0.4,
      filmRollLength: 0,
      layer1Name: 'PET12',
      layer2Name: productType === 'mang' ? '' : 'MPET12',
      layer3Name: '',
      layer4Name: '',
      layer5Name: '',
      chotGia: 1000,
      totalArea: 100,
    },
  };
}

console.log('resolveLsxDocxTemplate');

assert('mang', resolveLsxDocxTemplate(order('mang', '', false)) === 'mang');
assert('tui-3-bien', resolveLsxDocxTemplate(order('tui', '3bien', false)) === 'tui-3-bien');
assert('tui-zipper-3-bien', resolveLsxDocxTemplate(order('tui', '3bien', true)) === 'tui-zipper-3-bien');
assert('tui-4-bien', resolveLsxDocxTemplate(order('tui', '4bien', false)) === 'tui-4-bien');
assert('tui-dan-lung-giua', resolveLsxDocxTemplate(order('tui', 'xephong_giua', false)) === 'tui-dan-lung-giua');
assert('tui-xep-hong-lung-lech', resolveLsxDocxTemplate(order('tui', 'xephong_lech', false)) === 'tui-xep-hong-lung-lech');
assert('tui-zipper-day-dung', resolveLsxDocxTemplate(order('tui', 'dayDung', true)) === 'tui-zipper-day-dung');
assert('tui-zipper-cat-seal', resolveLsxDocxTemplate(order('tui', 'cutSeal', true)) === 'tui-zipper-cat-seal');
assert('tui-cat-seal-nap-keo', resolveLsxDocxTemplate(order('tui', 'cutSeal', false)) === 'tui-cat-seal-nap-keo');
assert('override wins', resolveLsxDocxTemplate(order('tui', '3bien', false, 'tui-4-bien')) === 'tui-4-bien');
assert(
  'label Túi 4 biên',
  resolveLsxBagTypeInfo(order('tui', '4bien', false)).label === 'Túi 4 biên',
);
assert(
  'label zipper cắt seal',
  resolveLsxBagTypeInfo(order('tui', 'cutSeal', true)).label === 'Túi zipper cắt seal',
);

console.log('\nresolveLsxHasDivide / orderHasDivide');

assert('hasDivide true', resolveLsxHasDivide({ hasDivide: true }) === true);
assert('hasDivide false', resolveLsxHasDivide({ hasDivide: false }) === false);
assert('divideWidthMm > 0', resolveLsxHasDivide({ divideWidthMm: 250 }) === true);
assert('manual divideWidth > 0', resolveLsxHasDivide({}, 300) === true);
assert('all empty', resolveLsxHasDivide({}) === false);
assert('order no divide', orderHasDivide(order('tui', '3bien', false)) === false);
assert(
  'order snapshot hasDivide',
  orderHasDivide(order('tui', '3bien', false, undefined, { hasDivide: true })) === true,
);
assert(
  'order divideWidthMm',
  orderHasDivide(order('mang', '', false, undefined, { divideWidthMm: 500 })) === true,
);
assert(
  'order manual divideWidth',
  orderHasDivide(order('mang', '', false, undefined, { divideWidth: 400 })) === true,
);
// Strict: zipper-cat-seal alone does NOT force divide
assert(
  'zipper-cat-seal no auto-divide',
  orderHasDivide(order('tui', 'cutSeal', true)) === false,
);

console.log('\nresolveLsxStageLayout / orderStageLayout');

assert('A tui+chia', resolveLsxStageLayout({ productType: 'tui', hasDivide: true, hasLaminate: true }) === 'A');
assert('B tui no chia', resolveLsxStageLayout({ productType: 'tui', hasDivide: false, hasLaminate: true }) === 'B');
assert('F mang+chia', resolveLsxStageLayout({ productType: 'mang', hasDivide: true, hasLaminate: false }) === 'F');
assert('F_no_divide', resolveLsxStageLayout({ productType: 'mang', hasDivide: false, hasLaminate: false }) === 'F_no_divide');
assert(
  'order layout B',
  orderStageLayout(order('tui', '3bien', false)) === 'B',
);
assert(
  'order layout A',
  orderStageLayout(order('tui', '3bien', false, undefined, { hasDivide: true })) === 'A',
);
assert(
  'order layout F',
  orderStageLayout(order('mang', '', false, undefined, { hasDivide: true })) === 'F',
);
assert(
  'order layout F_no_divide',
  orderStageLayout(order('mang', '', false)) === 'F_no_divide',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
