/**
 * lsx-nang-cao.test.ts — kiểm tra helper đọc bảng đặc tả nâng cao cho LSX.
 * Chạy: npx tsx src/lib/lsx-nang-cao.test.ts
 */

import type { ProductionOrder, LSXManualFields } from './types';
import {
  layNangCaoSpec,
  layDongTheoCongDoan,
  layDongTheoCongDoanPrefix,
  layKhoMangMm,
  layKhoMangText,
  layKhoMangTuNguon,
  layKhoMangTextTuNguon,
  layThanhPham,
  layPhiHao,
  ghepNangCaoSpecTheoLop,
} from './lsx-nang-cao';

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
  if (cond) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
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
    hanDay: 0,
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

function orderCoNangCao(): ProductionOrder {
  return {
    id: 'lsx_nc_1',
    quoteId: 'q1',
    createdAt: new Date().toISOString(),
    status: 'created',
    manual: baseManual(),
    snapshot: {
      customer: 'KH',
      productName: 'SP',
      productType: 'tui',
      structure: 'PET/MPET/LLDPE',
      quantity: 5000,
      spreadWidth: 0.56,
      cutStep: 0.32,
      numColors: 3,
      bagType: 'dayDung',
      hasZipper: true,
      hasDivide: false,
      cylLength: 0.85,
      cylCircum: 0.44,
      filmRollLength: 0,
      layer1Name: 'PET12',
      layer2Name: 'MPET12',
      layer3Name: 'LLDPE90',
      layer4Name: '',
      layer5Name: '',
      chotGia: 1000,
      totalArea: 100,
      nangCaoSpec: [
        { congDoan: 'In', vatLieu: 'PET12', khoMang: 0.56, thanhPham: 12000, phiHao: 840, dauVaoNVL: 12840, cpVatLieu: 0, donViGiaNVL: 'kg' },
        { congDoan: 'Ghép 1', vatLieu: 'MPET12', khoMang: 0.56, thanhPham: 11700, phiHao: 110, dauVaoNVL: 11810, cpVatLieu: 0, donViGiaNVL: 'kg' },
        { congDoan: 'Ghép 2', vatLieu: 'LLDPE90', khoMang: 0.56, thanhPham: 11700, phiHao: 109, dauVaoNVL: 11809, cpVatLieu: 0, donViGiaNVL: 'kg' },
        { congDoan: 'Làm túi', vatLieu: 'PET12 + MPET12 + LLDPE90 + Zipper', khoMang: 0.22, thanhPham: 5500, phiHao: 140, dauVaoNVL: 5640, cpVatLieu: 0, donViGiaNVL: 'kg' },
      ],
    },
  };
}

function orderKhongCoNangCao(): ProductionOrder {
  return {
    id: 'lsx_legacy',
    quoteId: 'q1',
    createdAt: new Date().toISOString(),
    status: 'created',
    manual: baseManual(),
    snapshot: {
      customer: 'KH',
      productName: 'SP',
      productType: 'tui',
      structure: 'PET/MPET',
      quantity: 5000,
      spreadWidth: 0.5,
      cutStep: 0.3,
      numColors: 3,
      bagType: '3bien',
      hasZipper: false,
      hasDivide: false,
      cylLength: 0.75,
      cylCircum: 0.5,
      filmRollLength: 0,
      layer1Name: 'PET12',
      layer2Name: 'MPET12',
      layer3Name: '',
      layer4Name: '',
      layer5Name: '',
      chotGia: 0,
      totalArea: 0,
    },
  };
}

console.log('layNangCaoSpec');
{
  const o = orderCoNangCao();
  const spec = layNangCaoSpec(o);
  assert('có 4 dòng', spec.length === 4, `len=${spec.length}`);
  assert('dòng đầu là In', spec[0]?.congDoan === 'In');
}
{
  const o = orderKhongCoNangCao();
  assert('LSX cũ không có spec → []', layNangCaoSpec(o).length === 0);
}

console.log('\nlayDongTheoCongDoan');
{
  const o = orderCoNangCao();
  const inRow = layDongTheoCongDoan(o, 'In');
  assert('tìm thấy In', !!inRow);
  assert('In.khoMang = 0.56', inRow?.khoMang === 0.56);
  assert('In.phiHao = 840', inRow?.phiHao === 840);
  assert('In.thanhPham = 12000', inRow?.thanhPham === 12000);

  const lamTui = layDongTheoCongDoan(o, 'Làm túi');
  assert('Làm túi.phiHao = 140', lamTui?.phiHao === 140);

  const chia = layDongTheoCongDoan(o, 'Chia');
  assert('Không có Chia → undefined', chia === undefined);
}

console.log('\nlayDongTheoCongDoanPrefix — Ghép');
{
  const o = orderCoNangCao();
  const ghep = layDongTheoCongDoanPrefix(o, 'Ghép');
  assert('Ghép trả 2 dòng', ghep.length === 2, `len=${ghep.length}`);
  assert('Ghép 1 có khoMang 560mm', layKhoMangMm(o, 'Ghép 1') === 560);
  assert('Ghép 2 có khoMang 560mm', layKhoMangMm(o, 'Ghép 2') === 560);
}

console.log('\nlayKhoMangMm / layKhoMangText');
{
  const o = orderCoNangCao();
  assert('layKhoMangMm(In) = 560', layKhoMangMm(o, 'In') === 560);
  assert('layKhoMangMm(Làm túi) = 220', layKhoMangMm(o, 'Làm túi') === 220);
  assert('layKhoMangMm(Ghép 1) = 560', layKhoMangMm(o, 'Ghép 1') === 560);
  assert('layKhoMangMm(row not found) = null', layKhoMangMm(o, 'Không có') === null);

  assert('layKhoMangText(In) = "560mm"', layKhoMangText(o, 'In') === '560mm');
}
{
  const o = orderKhongCoNangCao();
  assert('LSX cũ không có khoMangMm', layKhoMangMm(o, 'In') === null);
  assert('LSX cũ không có khoMangText', layKhoMangText(o, 'In') === '');
}

console.log('\nlayThanhPham / layPhiHao');
{
  const o = orderCoNangCao();
  assert('In.thanhPham = 12000', layThanhPham(o, 'In') === 12000);
  assert('In.phiHao = 840', layPhiHao(o, 'In') === 840);
  assert('Ghép 1.phiHao = 110', layPhiHao(o, 'Ghép 1') === 110);
  assert('Ghép 2.phiHao = 109', layPhiHao(o, 'Ghép 2') === 109);
  assert('Làm túi.phiHao = 140', layPhiHao(o, 'Làm túi') === 140);
}
{
  const o = orderKhongCoNangCao();
  assert('LSX cũ phiHao = null', layPhiHao(o, 'In') === null);
}

console.log('\nSnapshot field unknown — defensive');
{
  const o = orderCoNangCao();
  // Đẩy spec rác
  (o.snapshot as { nangCaoSpec?: unknown }).nangCaoSpec = 'not-an-array';
  assert('spec không phải array → []', layNangCaoSpec(o).length === 0);

  (o.snapshot as { nangCaoSpec?: unknown }).nangCaoSpec = [null, 'string', { congDoan: 'In' }];
  const spec = layNangCaoSpec(o);
  assert('lọc bỏ row không hợp lệ', spec.length === 1 && spec[0].congDoan === 'In');
}

console.log('\nlayKhoMangTuNguon — ProductionOrder (snapshot)');
{
  const o = orderCoNangCao();
  // Spec có dòng In khoMang 0.56 → 560mm
  assert(
    'snapshot.nangCaoSpec có In.khoMang=0.56 → 560mm',
    layKhoMangTuNguon({ snapshot: o.snapshot }, 'In') === 560,
  );
  assert(
    'snapshot.nangCaoSpec có Làm túi.khoMang=0.22 → 220mm',
    layKhoMangTuNguon({ snapshot: o.snapshot }, 'Làm túi') === 220,
  );
  assert(
    'snapshot.nangCaoSpec không có "Ghép 1" prefix → vẫn tìm theo tên chính xác',
    layKhoMangTuNguon({ snapshot: o.snapshot }, 'Ghép 1') === 560,
  );
}
{
  const o = orderKhongCoNangCao();
  // LSX cũ: snapshot.spreadWidth = 0.5 → fallback 500mm
  assert(
    'LSX cũ fallback snapshot.spreadWidth (0.5) → 500mm',
    layKhoMangTuNguon({ snapshot: o.snapshot }, 'In') === 500,
  );
}

console.log('\nlayKhoMangTuNguon — LsxSourceData (nangCaoSpec trực tiếp)');
{
  const sourceCoSpec = {
    input: { spreadWidth: 0.5 },
    nangCaoSpec: [
      { congDoan: 'In', vatLieu: 'PET', khoMang: 0.82 },
      { congDoan: 'Chia', vatLieu: 'PET//MPET', khoMang: 0.4, khoMangLabel: '0,820 → 0,400' },
      { congDoan: 'Làm túi', vatLieu: '-', khoMang: 0.4 },
    ],
  };
  assert(
    'source có nangCaoSpec.In.khoMang=0.82 → 820mm',
    layKhoMangTuNguon(sourceCoSpec, 'In') === 820,
  );
  assert(
    'source có nangCaoSpec.Chia.khoMang=0.4 → 400mm',
    layKhoMangTuNguon(sourceCoSpec, 'Chia') === 400,
  );
  assert(
    'source có nangCaoSpec.Làm túi.khoMang=0.4 → 400mm',
    layKhoMangTuNguon(sourceCoSpec, 'Làm túi') === 400,
  );
  assert(
    'source không có dòng "Không có" → fallback input.spreadWidth 0.5 → 500mm',
    layKhoMangTuNguon(sourceCoSpec, 'Không có') === 500,
  );
  assert(
    'source.nangCaoSpec có khoMangLabel "0,820 → 0,400" cho Chia',
    layKhoMangTextTuNguon(sourceCoSpec, 'Chia') === '0,820 → 0,400',
  );
  assert(
    'source.nangCaoSpec không có label cho In → fallback mm "820mm"',
    layKhoMangTextTuNguon(sourceCoSpec, 'In') === '820mm',
  );
}
{
  const sourceKhongSpec = { input: { spreadWidth: 0.56 } };
  assert(
    'source không có nangCaoSpec → fallback input.spreadWidth 0.56 → 560mm',
    layKhoMangTuNguon(sourceKhongSpec, 'In') === 560,
  );
  assert(
    'source không có spec, không có row → trả text "560mm"',
    layKhoMangTextTuNguon(sourceKhongSpec, 'In') === '560mm',
  );
}
{
  const sourceRong = { input: { spreadWidth: 0 } };
  assert(
    'source.input.spreadWidth = 0 → null',
    layKhoMangTuNguon(sourceRong, 'In') === null,
  );
  assert(
    'source rỗng + spreadWidth=0 → text rỗng',
    layKhoMangTextTuNguon(sourceRong, 'In') === '',
  );
}
{
  const sourceRac = { nangCaoSpec: 'not-an-array', input: { spreadWidth: 0.7 } };
  assert(
    'source.nangCaoSpec rác (string) → fallback spreadWidth 0.7 → 700mm',
    layKhoMangTuNguon(sourceRac, 'In') === 700,
  );
}
{
  const sourceInRow0 = {
    input: { spreadWidth: 0.5 },
    nangCaoSpec: [
      { congDoan: 'In', vatLieu: 'PET', khoMang: 0 },
    ],
  };
  assert(
    'In.khoMang = 0 (không hợp lệ) → fallback input.spreadWidth 0.5 → 500mm',
    layKhoMangTuNguon(sourceInRow0, 'In') === 500,
  );
}

console.log('\n=== ghepNangCaoSpecTheoLop — nhóm Ghép (Lớp N) thành multi-layer ===');

{
  // User case: GHÉP (Lớp 2) có 3 vật liệu, GHÉP (Lớp 3) có 1 vật liệu
  const spec: Array<{ congDoan: string; vatLieu: string; khoMang: number }> = [
    { congDoan: 'In', vatLieu: 'PET', khoMang: 0.82 },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'MPET', khoMang: 0.21 },
    { congDoan: '', vatLieu: 'PET', khoMang: 0.4 },
    { congDoan: '', vatLieu: 'MPET', khoMang: 0.21 },
    { congDoan: 'GHÉP (Lớp 3)', vatLieu: 'LLDPE', khoMang: 0.82 },
    { congDoan: 'Chia', vatLieu: 'PET//MPET', khoMang: 0.4 },
    { congDoan: 'Làm túi', vatLieu: '-', khoMang: 0.4 },
  ];
  const groups = ghepNangCaoSpecTheoLop(spec as never);
  assert('2 nhóm Ghép', groups.length === 2, String(groups.length));
  assert('nhóm 1: label "GHÉP (Lớp 2)"', groups[0].label === 'GHÉP (Lớp 2)', groups[0].label);
  assert('nhóm 1: layerIndex = 2', groups[0].layerIndex === 2, String(groups[0].layerIndex));
  assert('nhóm 1: 3 rows (header + 2 continuation)', groups[0].rows.length === 3, String(groups[0].rows.length));
  assert('nhóm 1: row[0].vatLieu = MPET', groups[0].rows[0].vatLieu === 'MPET', groups[0].rows[0].vatLieu);
  assert('nhóm 1: row[1].vatLieu = PET (continuation)', groups[0].rows[1].vatLieu === 'PET', groups[0].rows[1].vatLieu);
  assert('nhóm 1: row[2].vatLieu = MPET (continuation)', groups[0].rows[2].vatLieu === 'MPET', groups[0].rows[2].vatLieu);
  assert('nhóm 2: label "GHÉP (Lớp 3)"', groups[1].label === 'GHÉP (Lớp 3)', groups[1].label);
  assert('nhóm 2: layerIndex = 3', groups[1].layerIndex === 3, String(groups[1].layerIndex));
  assert('nhóm 2: 1 row', groups[1].rows.length === 1, String(groups[1].rows.length));
  // In, Chia, Làm túi KHÔNG thuộc nhóm Ghép
  assert('In/Chia/Làm túi KHÔNG có trong groups', !groups.some(g => g.rows.some(r => r.congDoan === 'In' || r.congDoan === 'Chia' || r.congDoan === 'Làm túi')));
}

{
  // Format cũ: "Ghép 1", "Ghép 2" (không có "Lớp")
  const spec: Array<{ congDoan: string; vatLieu: string; khoMang: number }> = [
    { congDoan: 'Ghép 1', vatLieu: 'PET', khoMang: 0.56 },
    { congDoan: 'Ghép 2', vatLieu: 'MPET', khoMang: 0.56 },
  ];
  const groups = ghepNangCaoSpecTheoLop(spec as never);
  assert('format cũ: 2 nhóm', groups.length === 2);
  assert('format cũ: layerIndex từ "Ghép 1" = 1', groups[0].layerIndex === 1, String(groups[0].layerIndex));
  assert('format cũ: layerIndex từ "Ghép 2" = 2', groups[1].layerIndex === 2, String(groups[1].layerIndex));
}

{
  // Edge case: spec rỗng
  assert('spec rỗng → []', ghepNangCaoSpecTheoLop([]).length === 0);
}
{
  // Edge case: chỉ có In, không có Ghép
  const spec: Array<{ congDoan: string; vatLieu: string; khoMang: number }> = [
    { congDoan: 'In', vatLieu: 'PET', khoMang: 0.5 },
  ];
  assert('chỉ có In → không có nhóm Ghép', ghepNangCaoSpecTheoLop(spec as never).length === 0);
}
{
  // Edge case: dòng continuation trước dòng header Ghép → bị bỏ
  const spec: Array<{ congDoan: string; vatLieu: string; khoMang: number }> = [
    { congDoan: '', vatLieu: 'ORPHAN', khoMang: 0.1 },
    { congDoan: 'Ghép 1', vatLieu: 'PET', khoMang: 0.5 },
  ];
  const groups = ghepNangCaoSpecTheoLop(spec as never);
  assert('orphan continuation bị bỏ', groups.length === 1 && groups[0].rows.length === 1);
}
{
  // Edge case: case-insensitive "ghép" thường
  const spec: Array<{ congDoan: string; vatLieu: string; khoMang: number }> = [
    { congDoan: 'ghép (lớp 2)', vatLieu: 'PET', khoMang: 0.5 },
  ];
  const groups = ghepNangCaoSpecTheoLop(spec as never);
  assert('lowercase "ghép" vẫn match', groups.length === 1);
  assert('lowercase layerIndex = 2', groups[0].layerIndex === 2, String(groups[0].layerIndex));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
