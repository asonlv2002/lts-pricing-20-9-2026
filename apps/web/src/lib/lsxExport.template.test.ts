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
  resolveLsxLaminateRows,
  formatLsxLamWasteText,
  toCylMm,
  resolveLsxCylMm,
  formatLsxCylText,
  formatLsxNumCylinders,
  formatLsxPrintWasteLine,
  formatLsxPrintProductLine,
  formatLsxLamProductLine,
  formatLsxLamSupplyLine,
  buildLsxLamBtpNote,
  dataUrlSangBuffer,
  chuKyParagraph,
  hienThiPhiHaoIn,
  hienThiPhiHaoTui,
  hienThiThanhPhamIn,
} from './lsxExport';

import {
  classifyLsxBagType,
  resolveLsxBagVisibleFields,
  resolveLsxHasDivide,
  resolveLsxStageLayout,
  ZIPPER_ACCESSORY_FIELDS,
} from './lsx-bag-classification';

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
    laminateLayers: [],
    divideElements: 0,
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
assert('tui-3-bien + zipper still 3-bien', resolveLsxDocxTemplate(order('tui', '3bien', true)) === 'tui-3-bien');
assert('tui-4-bien', resolveLsxDocxTemplate(order('tui', '4bien', false)) === 'tui-4-bien');
assert('tui-dan-lung-giua', resolveLsxDocxTemplate(order('tui', 'xephong_giua', false)) === 'tui-dan-lung-giua');
assert('tui-xep-hong-lung-lech', resolveLsxDocxTemplate(order('tui', 'xephong_lech', false)) === 'tui-xep-hong-lung-lech');
assert('tui-day-dung no zipper', resolveLsxDocxTemplate(order('tui', 'dayDung', false)) === 'tui-day-dung');
assert('tui-day-dung + zipper still day-dung', resolveLsxDocxTemplate(order('tui', 'dayDung', true)) === 'tui-day-dung');
assert('tui-cut-seal + zipper', resolveLsxDocxTemplate(order('tui', 'cutSeal', true)) === 'tui-cut-seal');
assert('tui-cut-seal no zipper', resolveLsxDocxTemplate(order('tui', 'cutSeal', false)) === 'tui-cut-seal');
assert('tui-cut-seal-nap-keo', resolveLsxDocxTemplate(order('tui', 'cutSealNapKeo', false)) === 'tui-cut-seal-nap-keo');
assert('legacy override zipper-3-bien → 3-bien', resolveLsxDocxTemplate(order('tui', '3bien', false, 'tui-zipper-3-bien')) === 'tui-3-bien');
assert('override wins', resolveLsxDocxTemplate(order('tui', '3bien', false, 'tui-4-bien')) === 'tui-4-bien');
assert(
  'label Túi 4 biên',
  resolveLsxBagTypeInfo(order('tui', '4bien', false)).label === 'Túi 4 biên',
);
assert(
  'label cắt seal',
  resolveLsxBagTypeInfo(order('tui', 'cutSeal', true)).label === 'Túi cắt seal',
);
assert(
  'label đáy đứng',
  resolveLsxBagTypeInfo(order('tui', 'dayDung', false)).label === 'Túi đáy đứng',
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

console.log('\nresolveLsxLaminateRows / formatLsxLamWasteText');

{
  const o = order('tui', '3bien', false);
  // Dual L2 gộp 1 pass (2 parts) + L3
  o.manual.laminateLayers = [
    {
      layerIndex: 2,
      label: 'Màng ghép 1',
      parts: [
        { name: 'PET12', widthMm: 240 },
        { name: 'MPET12', widthMm: 240 },
      ],
      wasteMeters: 100,
    },
    { layerIndex: 3, label: 'Màng ghép 2', parts: [{ name: 'LLDPE', widthMm: 480 }], wasteMeters: 60 },
  ];
  const rows = resolveLsxLaminateRows(o);
  assert('2 màng ghép passes', rows.length === 2);
  assert('dual parts in pass 1', rows[0].parts.length === 2);
  assert(
    'dual name joined',
    rows[0].name.includes('PET12') && rows[0].name.includes('MPET12'),
    rows[0].name,
  );
  assert('row2 name', rows[1].name === 'LLDPE');
  assert(
    'waste L1 L2 by pass',
    formatLsxLamWasteText(rows) === 'L1: 100m, L2: 60m',
  );
  assert('has laminate stage', orderStageLayout(o) === 'B');
}

{
  const o = order('tui', '3bien', false);
  o.manual.laminateFilm1 = 'A';
  o.manual.laminateFilm2 = 'B';
  o.manual.lamWaste = 50;
  o.manual.lamBTP = 40;
  const rows = resolveLsxLaminateRows(o);
  assert('legacy 2 rows', rows.length === 2);
  assert('legacy waste', formatLsxLamWasteText(rows) === 'L1: 50m, L2: 40m');
}

{
  // resolveLsxLaminateRows ưu tiên nangCaoSpec — multi-layer composite
  const o = order('tui', '3bien', false);
  o.snapshot.nangCaoSpec = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.82, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 100, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'PET12', khoMang: 0.4, thanhPham: 12000, phiHao: 110, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: '', vatLieu: 'MPET12', khoMang: 0.21, thanhPham: 12000, phiHao: 120, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'GHÉP (Lớp 3)', vatLieu: 'LLDPE', khoMang: 0.82, thanhPham: 12000, phiHao: 80, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const rows = resolveLsxLaminateRows(o);
  assert('nangCaoSpec: 2 Ghép groups', rows.length === 2, String(rows.length));
  assert('row[0] label "GHÉP (Lớp 2)"', rows[0].label === 'GHÉP (Lớp 2)', rows[0].label);
  assert('row[0] 3 parts (multi-layer)', rows[0].parts.length === 3, String(rows[0].parts.length));
  assert('row[0].parts[0].name = MPET12', rows[0].parts[0].name === 'MPET12', rows[0].parts[0].name);
  assert('row[0].parts[0].widthMm = 210', rows[0].parts[0].widthMm === 210, String(rows[0].parts[0].widthMm));
  assert('row[0].parts[1].name = PET12', rows[0].parts[1].name === 'PET12', rows[0].parts[1].name);
  assert('row[0].parts[1].widthMm = 400', rows[0].parts[1].widthMm === 400, String(rows[0].parts[1].widthMm));
  assert('row[0].parts[2].widthMm = 210', rows[0].parts[2].widthMm === 210, String(rows[0].parts[2].widthMm));
  // waste = sum of all phiHao in group
  assert('row[0] waste = 100+110+120 = 330', rows[0].wasteMeters === 330, String(rows[0].wasteMeters));
  assert('row[1] label "GHÉP (Lớp 3)"', rows[1].label === 'GHÉP (Lớp 3)', rows[1].label);
  assert('row[1] 1 part', rows[1].parts.length === 1);
  assert('row[1] waste = 80', rows[1].wasteMeters === 80, String(rows[1].wasteMeters));
}
{
  // nangCaoSpec với format cũ "Ghép 1" (không có "Lớp")
  const o = order('tui', '3bien', false);
  o.snapshot.nangCaoSpec = [
    { congDoan: 'Ghép 1', vatLieu: 'PET12', khoMang: 0.56, thanhPham: 12000, phiHao: 100, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'Ghép 2', vatLieu: 'MPET12', khoMang: 0.56, thanhPham: 12000, phiHao: 80, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const rows = resolveLsxLaminateRows(o);
  assert('format cũ "Ghép 1"/"Ghép 2": 2 rows', rows.length === 2);
  assert('row[0] label "Ghép 1"', rows[0].label === 'Ghép 1');
  assert('row[1] label "Ghép 2"', rows[1].label === 'Ghép 2');
}
{
  // laminateLayers user sửa tay thắng nangCaoSpec (manual-first, regression 2026-09-05)
  const o = order('tui', '3bien', false);
  o.snapshot.nangCaoSpec = [
    { congDoan: 'Ghép 1', vatLieu: 'PET_NANG_CAO', khoMang: 0.5, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  o.manual.laminateLayers = [
    { layerIndex: 2, label: 'Màng ghép 1', parts: [{ name: 'USER_SUA_TAY', widthMm: 300 }], wasteMeters: 99 },
  ];
  const rows = resolveLsxLaminateRows(o);
  assert('laminateLayers user sửa thắng nangCaoSpec', rows[0].parts[0].name === 'USER_SUA_TAY', rows[0].parts[0].name);
  assert('laminateLayers user sửa thắng waste', rows[0].wasteMeters === 99, String(rows[0].wasteMeters));
}
{
  // nangCaoSpec vẫn dùng khi form không có laminateLayers (manual rỗng)
  const o = order('tui', '3bien', false);
  o.snapshot.nangCaoSpec = [
    { congDoan: 'Ghép 1', vatLieu: 'PET_NANG_CAO', khoMang: 0.5, thanhPham: 12000, phiHao: 0, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  const rows = resolveLsxLaminateRows(o);
  assert('manual rỗng → fallback nangCaoSpec', rows[0]?.parts[0]?.name === 'PET_NANG_CAO', rows[0]?.parts[0]?.name);
}

console.log('\nIN/GHÉP format helpers');

assert('toCylMm meters', toCylMm(0.75) === 750);
assert('toCylMm already mm', toCylMm(750) === 750);
assert('toCylMm zero', toCylMm(0) === 0);

{
  const o = order('tui', '3bien', false);
  // snapshot cylLength=0.7, cylCircum=0.4
  const cyl = resolveLsxCylMm(o.manual, o.snapshot);
  assert('resolve cyl from snapshot m', cyl.d === 700 && cyl.cv === 400);
  assert('format cyl text', formatLsxCylText(o.manual, o.snapshot) === 'Dài 700 x Chu vi 400');
  o.manual.cylDiameter = 850;
  o.manual.cylWidth = 442;
  assert('manual cyl wins', formatLsxCylText(o.manual, o.snapshot) === 'Dài 850 x Chu vi 442');
  assert(
    'format cyl with mm',
    formatLsxCylText(o.manual, o.snapshot, { withMm: true }) === 'Dài 850mm x Chu vi 442mm',
  );
}

assert('num cylinders pad', formatLsxNumCylinders({ numCylinders: 8 }) === '08 trục');
assert('num cylinders legacy = số màu (chỉ khi fallbackEqColors=true)', formatLsxNumCylinders({ numCylinders: 0 }, true) === '= số màu');
assert('num cylinders rỗng mặc định', formatLsxNumCylinders({ numCylinders: 0 }) === '');

assert(
  'print waste line',
  formatLsxPrintWasteLine({ printWastePercent: 2320 }) === '2.320m'
    || formatLsxPrintWasteLine({ printWastePercent: 2320 }) === '2320m',
);
assert('print waste empty', formatLsxPrintWasteLine({ printWastePercent: 0 }, '…') === '…');
assert(
  'print product',
  formatLsxPrintProductLine({ printProductQty: 3300, printProductUnit: 'MD' }).includes('MD'),
);
assert(
  'lam product',
  formatLsxLamProductLine({ lamProductQty: 3180, lamProductUnit: 'MD' }).includes('MD'),
);
assert('lam supply', formatLsxLamSupplyLine({ lamMaterialSupplyQty: 'tồn kho' }) === 'tồn kho');
assert('lam supply empty', formatLsxLamSupplyLine({ lamMaterialSupplyQty: '' }, '…') === '…');
assert(
  'btp note',
  buildLsxLamBtpNote(3300).includes('ghép hết BTP in') && buildLsxLamBtpNote(3300).includes('3'),
);

console.log('\nchu ky DOCX (ImageRun)');

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='; // bytes: 8D 04 0B 3F ... ('iVBORw0KGgo=' decodes to 8 bytes)
{
  const buf = dataUrlSangBuffer(PNG_DATA_URL);
  assert('dataUrlSangBuffer decodes png data url', buf !== null && buf.length === 8, String(buf?.length));
  assert('dataUrlSangBuffer rejects non-png', dataUrlSangBuffer('data:image/webp;base64,AAAA') === null);
  assert('dataUrlSangBuffer rejects garbage', dataUrlSangBuffer('abc') === null);

  class FakeParagraph {
    static ImageRun = class {
      kind = 'ImageRun';
      constructor(public opts: any) { Object.assign(this, opts); }
    };
    constructor(public opts: any) { Object.assign(this, opts); }
  }
  const withSig = chuKyParagraph({ ...baseManual(), preparedBySignature: PNG_DATA_URL }, FakeParagraph, { AlignmentType: { CENTER: 'center' } });
  assert('chuKyParagraph returns 1 paragraph when signature present', withSig.length === 1);
  const p = withSig[0] as any;
  assert('chuKyParagraph has ImageRun child', p.children?.length === 1 && p.children[0].kind === 'ImageRun');
  assert('chuKyParagraph image is png 110x110', p.children[0].type === 'png' && p.children[0].transformation.width === 110);
  assert('chuKyParagraph paragraph centered', p.alignment === 'center');
  const noSig = chuKyParagraph(baseManual(), FakeParagraph, { AlignmentType: { CENTER: 'center' } });
  assert('chuKyParagraph empty when no signature', noSig.length === 0);
  const badSig = chuKyParagraph({ ...baseManual(), preparedBySignature: 'data:image/webp;base64,AAAA' }, FakeParagraph, { AlignmentType: { CENTER: 'center' } });
  assert('chuKyParagraph empty on unsupported format', badSig.length === 0);
}

console.log('\nmanual-first helpers (regression 2026-09-05)');

{
  // Case ảnh user báo: spec nâng cao 1.810,828 / 16.624,143 — user sửa form 5000 / 10000 MD / 30000
  const o = order('tui', '3bien', false);
  o.snapshot.nangCaoSpec = [
    { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.82, thanhPham: 16624.143, phiHao: 1810.828, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
    { congDoan: 'Làm túi', vatLieu: '', khoMang: null, thanhPham: 16000, phiHao: 210, dauVaoNVL: 0, cpVatLieu: 0, donViGiaNVL: 'kg' },
  ];
  assert('manual rỗng → spec phi hao IN', hienThiPhiHaoIn(o).includes('1.810') || hienThiPhiHaoIn(o).includes('1810'), hienThiPhiHaoIn(o));
  assert('manual rỗng → spec thành phẩm IN', hienThiThanhPhamIn(o).includes('16.624') || hienThiThanhPhamIn(o).includes('16624'), hienThiThanhPhamIn(o));
  assert('manual rỗng → spec phi hao túi', hienThiPhiHaoTui(o) === 210, String(hienThiPhiHaoTui(o)));

  o.manual.printWastePercent = 5000;
  o.manual.printProductQty = 10000;
  o.manual.printProductUnit = 'MD';
  o.manual.materialQtySupplied = 30000;
  o.manual.bagWasteMeters = 150;
  const phIn = hienThiPhiHaoIn(o);
  const tpInTxt = hienThiThanhPhamIn(o);
  assert('manual thắng spec: phi hao IN = 5.000m', phIn === '5.000m' || phIn === '5000m', phIn);
  assert('manual thắng spec: thành phẩm IN = 10.000 MD', tpInTxt === '10.000 MD' || tpInTxt === '10000 MD', tpInTxt);
  assert('manual thắng spec: phi hao túi = 150', hienThiPhiHaoTui(o) === 150, String(hienThiPhiHaoTui(o)));

  o.manual.printWastePercent = 0;
  o.manual.printProductQty = 0;
  o.manual.bagWasteMeters = 0;
  assert('manual = 0 → trả về spec (phi hao IN)', hienThiPhiHaoIn(o).includes('810'), hienThiPhiHaoIn(o));
  assert('manual = 0 → trả về spec (thành phẩm IN)', hienThiThanhPhamIn(o).includes('624'), hienThiThanhPhamIn(o));
  assert('manual = 0 → trả về spec (phi hao túi)', hienThiPhiHaoTui(o) === 210, String(hienThiPhiHaoTui(o)));
}
{
  // Không có spec nâng cao (LSX cũ) → chỉ manual
  const o = order('mang', '', false);
  assert('không spec + manual rỗng → phi hao IN rỗng', hienThiPhiHaoIn(o) === '', JSON.stringify(hienThiPhiHaoIn(o)));
  assert('không spec + manual rỗng → thành phẩm IN rỗng', hienThiThanhPhamIn(o) === '', JSON.stringify(hienThiThanhPhamIn(o)));
  assert('không spec + manual rỗng → phi hao túi 0', hienThiPhiHaoTui(o) === 0);
  o.manual.printWastePercent = 2320;
  o.manual.printProductQty = 3300;
  o.manual.bagWasteMeters = 140;
  assert('không spec → manual phi hao IN', hienThiPhiHaoIn(o) === '2.320m' || hienThiPhiHaoIn(o) === '2320m', hienThiPhiHaoIn(o));
  assert('không spec → manual thành phẩm IN', hienThiThanhPhamIn(o) === '3.300 MD' || hienThiThanhPhamIn(o) === '3300 MD', hienThiThanhPhamIn(o));
  assert('không spec → manual phi hao túi', hienThiPhiHaoTui(o) === 140);
}

console.log('\nuseSemicircularMold visibility (not zipper-only)');const dayDung = classifyLsxBagType('dayDung');
const visNoZip = resolveLsxBagVisibleFields(dayDung, false);
const visZip = resolveLsxBagVisibleFields(dayDung, true);
assert('mold visible without zipper', visNoZip.includes('useSemicircularMold'));
assert('mold visible with zipper', visZip.includes('useSemicircularMold'));
assert(
  'mold not in ZIPPER_ACCESSORY_FIELDS',
  !ZIPPER_ACCESSORY_FIELDS.includes('useSemicircularMold'),
);
assert('dual cutter still zipper-only', !visNoZip.includes('useDualCutter') && visZip.includes('useDualCutter'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

