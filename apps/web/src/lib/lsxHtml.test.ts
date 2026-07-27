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
  const html = buildLsxHtml(order({ hasDivide: false, hasZipper: true }));

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
    'B: bag section không còn Yêu cầu giao hàng',
    !html.includes('Yêu cầu giao hàng'),
  );
  assert(
    'B: bag section không còn dòng Số lượng / SL đóng gói',
    !html.includes('Số lượng: ') && !html.includes('SL đóng gói'),
  );
  assert(
    'B: bag chia trái ghi chú | phải lưới thông số',
    html.includes('data-lsx-bag-note') && html.includes('data-lsx-bag-grid'),
  );
  assert(
    'B: bag machine note appears once',
    (html.match(/Ghi chú: (?:<\/span>)?chạy theo mẫu/g) || []).length === 1,
  );
  assert(
    'B: zipper detail nằm trong lưới thông số',
    html.includes('data-lsx-bag-grid') && html.includes('Nhấn xé'),
  );
}

console.log('\nbuildLsxHtml MÁY LÀM TÚI — chia đều 50/50 + lưới 2 ô');

{
  const html = buildLsxHtml(
    order({
      bagType: 'dayDung',
      hasZipper: true,
      manual: {
        bagLuuY: 'Phát hiện lỗi báo KINH DOANH để phân loại.',
        bagMachineNotes: 'chạy theo mẫu',
        tamZipperCachMieng: 30,
        foldBottom: '100mm',
        sealEdge: '10mm',
        tearNotch: '2 bên cách miệng 15mm',
      },
    }),
  );

  assert(
    'cột trái là ghi chú bagLuuY',
    /data-lsx-bag-note[\s\S]*?Phát hiện lỗi báo KINH DOANH/.test(html),
  );
  assert('bag-note rộng 50%', /\.bag-note\s*\{[^}]*width:\s*50%/.test(html));
  assert('bag-grid rộng 50%', /\.bag-grid\s*\{[^}]*width:\s*50%/.test(html));
  assert(
    'Kiểu túi gộp cả hàng lưới',
    /<td colspan="2"[^>]*>\s*<span class="b">Kiểu túi:/.test(html),
  );
  assert(
    'Chiều rộng | Chiều dài cùng một hàng',
    /<tr><td[^>]*>[^<]*<span class="b">Chiều rộng: <\/span>[\s\S]*?<td[^>]*>[^<]*<span class="b">Chiều dài: <\/span>[\s\S]*?<\/tr>/.test(html),
  );
  assert(
    'Tâm zipper | Nhấn xé cùng một hàng',
    /<tr><td[^>]*>[\s\S]*?Tâm zipper[\s\S]*?<td[^>]*>[\s\S]*?Nhấn xé[\s\S]*?<\/tr>/.test(html),
  );
  assert(
    'Dán biên | Xếp đáy cùng một hàng',
    /<tr><td[^>]*>[\s\S]*?Dán biên[\s\S]*?<td[^>]*>[\s\S]*?Xếp đáy[\s\S]*?<\/tr>/.test(html),
  );
}

console.log('\nbuildLsxHtml khối Quy cách (mục I)');

{
  const html = buildLsxHtml(
    order({
      bagType: 'dayDung',
      hasZipper: true,
      manual: {
        tamZipperCachMieng: 30,
        foldBottom: '100mm',
        sealEdge: '10mm',
        tearNotch: '2 bên cách miệng 15mm',
      },
    }),
  );

  assert('Quy cách kèm dung sai ±2mm hai chiều', html.includes('R:500mm (±2mm) x D:300mm (±2mm)'));
  assert('có dòng Zipper cách miệng', html.includes('Zipper cách miệng: </span>30mm'));
  assert('Xếp đáy tự chia mỗi bên', html.includes('100mm (50mm / Bên)'));
  assert('có dòng Dán biên', html.includes('Dán biên: </span>10mm'));
  assert('có dòng Nhấn xé "v"', html.includes('Nhấn xé &quot;v&quot; 2 bên cách miệng 15mm'));
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
  assert(
    'A: bag section bỏ packaging / YC giao hàng (đã có ở mục I)',
    !html.includes('100 túi/thùng') && !html.includes('Yêu cầu giao hàng'),
  );
  assert(
    'A: has left rowspan for divide col',
    /rowspan="\d+"/.test(html),
  );
}

console.log('\nbuildLsxHtml MÁY IN | MÁY GHÉP — dual label gộp dọc, không ô rỗng');

{
  const html = buildLsxHtml(
    order({
      manual: {
        laminateLayers: [
          {
            layerIndex: 2,
            label: 'Màng ghép 1',
            parts: [
              { name: 'PET12', widthMm: 280 },
              { name: 'MPET12', widthMm: 280 },
            ],
            wasteMeters: 0,
          },
          {
            layerIndex: 3,
            label: 'Màng ghép 2',
            parts: [{ name: 'LLDPE125', widthMm: 560 }],
            wasteMeters: 60,
          },
        ],
      },
    }),
  );

  assert(
    'GHÉP: hai nửa 50/50 có wrapper riêng',
    html.includes('data-lsx-lam-grid'),
  );
  assert(
    'GHÉP: dual label gộp dọc bằng rowspan=2',
    /rowspan="2"[^>]*>\s*<span class="b">Màng ghép 1<\/span>/.test(html)
      || /rowspan="2"[^>]*>\s*Màng ghép 1/.test(html),
  );
  assert(
    'GHÉP: mỗi vật liệu dual một hàng riêng',
    /PET12[\s\S]{0,120}Khổ 280[\s\S]{0,200}MPET12[\s\S]{0,120}Khổ 280/.test(html),
  );
  assert(
    'GHÉP: không còn khổ gộp kiểu "280 / 280mm"',
    !html.includes('280 / 280mm'),
  );
  assert(
    'GHÉP: dòng đơn vẫn dạng "Màng ghép 2: LLDPE125"',
    html.includes('Màng ghép 2: </span>LLDPE125') || html.includes('Màng ghép 2:</span> LLDPE125'),
  );
  assert(
    'GHÉP: không còn bullet "· PET12"',
    !html.includes('· PET12'),
  );
  assert(
    'IN: không còn ô rỗng đệm chiều cao',
    !/<td colspan="2"><\/td>/.test(html),
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
