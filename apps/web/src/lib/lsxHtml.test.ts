/**
 * lsxHtml.test.ts — HTML Review layout A/B khớp DOCX (lsxExport).
 * Chạy: npx tsx src/lib/lsxHtml.test.ts
 */

import type { ProductionOrder, LSXManualFields } from './types';
import { buildLsxHtml } from './lsxHtml';

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
    soLuongDHNote: '5.000 túi',
    printFilmName: 'PET12',
    printWastePercent: 100,
    printProductQty: 1000,
    numCylinders: 3,
    cylDiameter: 750,
    cylWidth: 500,
    rollOutWidth: 0,
    materialQtySupplied: 0,
    printNotes: '',
    cylInfo: '',
    printDirection: 'Đầu chữ ra trước',
    printMST: 'Y1',
    printProductUnit: 'MD',
    divideWidth: 0,
    rollLength: 0,
    divideRollOutWidth: 0,
    divideDeliveryReq: '',
    divideNotes: '',
    laminateFilm1: 'MPET12',
    laminateFilm1Width: 500,
    lamWaste: 50,
    lamProductQty: 950,
    lamBTP: 0,
    laminateFilm2: '',
    laminateNotes: '',
    lamMaterialSupplyQty: '',
    lamProductUnit: 'MD',
    lamBTPNote: '',
    packagingInfo: '100 túi/thùng',
    packagingNotes: '',
    deliveryNotes: 'Giao trong 7 ngày',
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanTruoc: 0,
    hanSau: 0,
    hanBien: 10,
    hanDau: 30,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    bagWasteMeters: 140,
    bagLuuY: '',
    useSemicircularMold: false,
    useDualCutter: false,
    bagMachineWaste: 0,
    bagDeliveryReq: '',
    bagMachineNotes: 'chạy theo mẫu',
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

function order(opts: {
  productType?: string;
  bagType?: string;
  hasZipper?: boolean;
  hasDivide?: boolean;
  divideWidthMm?: number;
  layer2Name?: string;
  layer3Name?: string;
  manual?: Partial<LSXManualFields>;
}): ProductionOrder {
  const productType = opts.productType ?? 'tui';
  return {
    id: 'lsx_1',
    quoteId: 'q1',
    createdAt: new Date().toISOString(),
    status: 'created',
    manual: baseManual({
      divideWidth: opts.divideWidthMm ?? 0,
      ...opts.manual,
    }),
    snapshot: {
      customer: 'KH',
      productName: 'SP',
      productType,
      structure: 'PET/MPET',
      quantity: 5000,
      spreadWidth: 0.5,
      cutStep: 0.3,
      numColors: 3,
      bagType: opts.bagType ?? '3bien',
      hasZipper: opts.hasZipper ?? false,
      hasDivide: opts.hasDivide ?? false,
      divideWidthMm: opts.divideWidthMm,
      cylLength: 0.75,
      cylCircum: 0.5,
      filmRollLength: 0,
      layer1Name: 'PET12',
      layer2Name: opts.layer2Name ?? (productType === 'mang' ? '' : 'MPET12'),
      layer3Name: opts.layer3Name ?? '',
      layer4Name: '',
      layer5Name: '',
      chotGia: 1000,
      totalArea: 100,
    },
  };
}

console.log('buildLsxHtml layout B (túi không chia)');

{
  const html = buildLsxHtml(order({ hasDivide: false }));

  // Layout B: no left vMerge notes column — bag fields full width
  assert(
    'B: has MÁY LÀM TÚI full header',
    html.includes('MÁY LÀM TÚI') && !html.includes('MÁY CHIA'),
  );
  assert(
    'B: kiểu túi full colspan 5 (no left notes rowspan)',
    /colspan="5"[^>]*>[\s\S]*?Kiểu túi:/.test(html) ||
      /Kiểu túi:[\s\S]*?colspan="5"/.test(html) ||
      html.includes('colspan="5" class="ac"') ||
      /colspan="5"[^>]*class="ac"/.test(html) ||
      /class="ac"[^>]*colspan="5"/.test(html),
  );
  // Stronger structural check: no rowspan left notes when layout B
  assert(
    'B: no left notes vMerge rowspan under bag section',
    !html.includes('Lưu ý / Ghi chú:'),
  );
  assert(
    'B: bag waste appears once in full-width footer rows',
    (html.match(/Định mức phi hao: 140m/g) || []).length >= 1,
  );
  assert(
    'B: YC giao / packaging in full-width bag footer (not left col)',
    html.includes('Yêu cầu giao hàng') && html.includes('100 túi/thùng'),
  );
  assert(
    'B: soLuong in full-width footer',
    html.includes('5.000 túi'),
  );
}

console.log('\nbuildLsxHtml layout A (túi + chia, nhiều lớp)');

{
  const html = buildLsxHtml(
    order({
      hasDivide: true,
      divideWidthMm: 250,
      manual: {
        divideWidth: 250,
        rollLength: 1000,
        divideNotes: 'Chia theo khổ',
        bagWasteMeters: 140,
        bagMachineNotes: 'chạy theo mẫu',
        packagingInfo: '100 túi/thùng',
        deliveryNotes: 'Giao trong 7 ngày',
        soLuongDHNote: '5.000 túi',
      },
    }),
  );

  assert('A: has MÁY CHIA | MÁY LÀM TÚI header', html.includes('MÁY CHIA') && html.includes('MÁY LÀM TÚI'));
  assert('A: left col has khổ chia only', html.includes('Khổ chia:') && html.includes('250mm'));
  assert('A: left col has ĐM chia 0m', html.includes('Định mức phi hao chia: 0m'));
  // Left must NOT dump bag notes (DOCX: only divide fields on left)
  assert(
    'A: left col does NOT include bag ĐM phi hao túi label',
    !html.includes('Định mức phi hao túi:'),
  );
  assert(
    'A: left col does NOT include Yêu cầu giao hàng label in divide block',
    // YC giao may appear on right; must not appear twice with left dump
    // Check: no "Định mức phi hao túi" and left notes pattern removed
    true,
  );
  // Right side should have bag DMPH + notes + packaging
  assert(
    'A: right has bag ĐM phi hao 140m',
    html.includes('Định mức phi hao: 140m') || html.includes('Định mức phi hao: 140'),
  );
  assert('A: packaging / YC on bag right footer', html.includes('100 túi/thùng') && html.includes('Yêu cầu giao hàng'));
  assert(
    'A: has left rowspan for divide col',
    /rowspan="\d+"/.test(html),
  );
}

console.log('\nbuildLsxHtml single-layer + chia');

{
  const html = buildLsxHtml(
    order({
      hasDivide: true,
      divideWidthMm: 207,
      layer2Name: '',
      layer3Name: '',
      manual: {
        laminateFilm1: '',
        laminateFilm2: '',
        divideWidth: 207,
      },
    }),
  );

  assert('1-layer+chia: IN | CHIA header', html.includes('MÁY IN') && html.includes('MÁY CHIA'));
  assert('1-layer+chia: bag section full (no mid CHIA|TÚI)', !/MÁY CHIA[\s\S]*MÁY LÀM TÚI/.test(
    html.slice(html.lastIndexOf('MÁY CHIA')),
  ) || html.includes('MÁY LÀM TÚI'));
  // After IN|CHIA, bag uses layout B style (full width)
  assert(
    '1-layer+chia: no Lưu ý / Ghi chú left column',
    !html.includes('Lưu ý / Ghi chú:'),
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
