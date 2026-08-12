// Test cho lib/dac-ta-nang-cao.ts — Đặc tả kỹ thuật & nguyên liệu (nâng cao)
// Chạy: pnpm --filter web exec tsx src/lib/dac-ta-nang-cao.test.ts
import {
  chonNhomMuc,
  tinhCpMucDungMoiIn,
  tinhCpKeoDungMoiGhep,
  lapDongVatLieuNangCao,
  lapDongNhanCongDien,
  tinhTongNangCao,
} from './dac-ta-nang-cao';
import type {
  AppConstants,
  CalculateResult,
  CpsxUpgradeElectric,
  CpsxUpgradeInk,
  CpsxUpgradeLabor,
  CpsxUpgradeThoiGian,
  SolventAdhesiveTable,
} from './types';
import type { UniRow } from './manager-calculation';

let soTest = 0;

function assert(cond: unknown, msg: string) {
  soTest++;
  if (!cond) throw new Error('FAIL: ' + msg);
}

function eq(actual: unknown, expected: unknown, msg: string) {
  soTest++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`FAIL: ${msg} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

function approx(actual: number, expected: number, msg: string, eps = 0.01) {
  soTest++;
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > eps) {
    throw new Error(`FAIL: ${msg} — expected ${expected} got ${actual}`);
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const ink: CpsxUpgradeInk = {
  opp: { rows: [], appliedSource: 'manual', appliedPrice: 60000 },
  pet: { rows: [], appliedSource: 'manual', appliedPrice: 80000 },
  pe: { rows: [], appliedSource: 'manual', appliedPrice: 76000 },
  solventAdhesive: {
    dungMoi: {
      rows: [
        { ma: 'DM_OPP', ten: 'DUNG MÔI OPP', dvt: 'kg', donGia: 40000, ghiChu: '' },
        { ma: 'DM_PET', ten: 'DUNG MÔI PET', dvt: 'kg', donGia: 40000, ghiChu: '' },
        { ma: 'DM_EA', ten: 'DUNG MÔI EA', dvt: 'kg', donGia: 40000, ghiChu: '' },
      ],
    },
    keo: {
      rows: [
        { ma: 'KEO_319', ten: 'KEO GHÉP 319', dvt: 'kg', donGia: 40000, ghiChu: '', slDung: 1 },
        { ma: 'KEO_766', ten: 'KEO GHÉP 766', dvt: 'kg', donGia: 40000, ghiChu: '', slDung: 1 },
      ],
      appliedSource: 'average',
      appliedPrice: 40000,
    },
  },
  dinhMucIn: [
    { soMau: 1, dmMucG: 4, dmDungMoiG: 4.5 },
    { soMau: 2, dmMucG: 8, dmDungMoiG: 6 },
    { soMau: 3, dmMucG: 12, dmDungMoiG: 7.5 },
    { soMau: 4, dmMucG: 16, dmDungMoiG: 9 },
    { soMau: 5, dmMucG: 20, dmDungMoiG: 10.5 },
    { soMau: 6, dmMucG: 24, dmDungMoiG: 12 },
    { soMau: 7, dmMucG: 28, dmDungMoiG: 13.5 },
    { soMau: 8, dmMucG: 32, dmDungMoiG: 15 },
  ],
  dinhMucGhep: { keoKhoG: 3.5, dungMoiPhaKeoG: 7 },
};

const thoiGian: CpsxUpgradeThoiGian = {
  print: {
    mountMinutesPerColor: 15,
    proofMinutes1to7: 20,
    proofMinutes8: 30,
    matteExtraMinutes: 80,
    avgSpeedMPerMin: 150,
  },
  laminate: { setupFirstMinutes: 10, setupNextMinutes: 30, avgSpeedMPerMin: 100 },
  slit: {
    rules: [
      { key: 'opp_mattopp', label: 'Màng OPP / MattOPP', setupMinutes: 30, speedMPerMin: 180 },
      { key: 'mpet_pet', label: 'Màng MPET / PET', setupMinutes: 20, speedMPerMin: 90 },
      { key: 'laminate_2', label: 'Màng ghép 2 lớp', setupMinutes: 20, speedMPerMin: 145 },
      { key: 'laminate_3', label: 'Màng ghép 3 lớp', setupMinutes: 20, speedMPerMin: 90 },
      { key: 'matte_flip', label: 'In phủ mờ (lật mặt)', setupMinutes: 20, speedMPerMin: 150 },
    ],
  },
  bag: {
    setupRules: [
      { key: '3bien', label: 'Túi 3 biên', setupMinutes: 90 },
      { key: '4bien', label: 'Túi 4 biên', setupMinutes: 90 },
      { key: '3_4bien_gt30', label: '3/4 biên >30cm', setupMinutes: 90 },
      { key: '3_4bien_gt40', label: '3/4 biên >40cm', setupMinutes: 90 },
      { key: 'xephong', label: 'Xếp hông', setupMinutes: 120 },
      { key: 'xephong_gt40', label: 'Xếp hông >40cm', setupMinutes: 120 },
      { key: 'zipper_daydung', label: 'Zipper đáy đứng', setupMinutes: 120 },
      { key: 'zipper_3bien', label: 'Zipper 3 biên', setupMinutes: 120 },
      { key: 'nap_bangkeo', label: 'Nắp băng keo', setupMinutes: 120 },
      { key: 'cut_seal', label: 'Túi cắt Seal', setupMinutes: 90 },
    ],
    speedRules: [
      { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, bagsPerMinute: 80 },
      { key: '200_300', label: '200 – ≤300 mm', maxStepMm: 300, bagsPerMinute: 70 },
      { key: '300_400', label: '300 – ≤400 mm', maxStepMm: 400, bagsPerMinute: 60 },
      { key: '400_550', label: '400 – ≤550 mm', maxStepMm: 550, bagsPerMinute: 50 },
      { key: 'gt_550', label: '> 550 mm', maxStepMm: null, bagsPerMinute: 20 },
    ],
  },
};

const labor: CpsxUpgradeLabor = {
  print: { wages: [500000, 400000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5 },
  laminate: { wages: [450000, 350000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5 },
  slit: { wages: [400000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 1, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 12, otHours: 4, tyLeTangCa: 0.5 },
  bag: {
    wages: [300000, 300000],
    mealMorning: 30000,
    mealEvening: 30000,
    otFactor: 1,
    peoplePerShift: 2,
    roundedPerMin: 1000,
    hoursPerDay: 24,
    otHours: 4,
    tyLeTangCa: 0.5,
  },
};

const electric: CpsxUpgradeElectric = {
  slots: [{ id: 's1', label: 'Khung 1', hours: 24, pricePerKwh: 3000 }],
  appliedSource: 'manual',
  appliedPricePerKwh: 3000,
  machines: {
    print: { powerKw: 100, efficiency: 0.8 },
    laminate: { powerKw: 50, efficiency: 0.8 },
    slit: { powerKw: 25, efficiency: 0.8 },
    bag: { powerKw: 20, efficiency: 0.8 },
  },
};

function taoHangSo(patch?: Partial<AppConstants>): AppConstants {
  return {
    cpsxUpgradeInk: ink,
    cpsxUpgradeThoiGian: thoiGian,
    cpsxUpgradeLabor: labor,
    cpsxUpgradeElectric: electric,
    ...patch,
  } as AppConstants;
}

function taoUniRows(): UniRow[] {
  return [
    {
      rowKey: 'print',
      stage: 'CPSX IN',
      mat: 'MPET 12',
      width: 0.65,
      meters: 8000,
      waste: 420,
      cpsx: 0,
      costCPSX: 0,
      matPrice: 39.6,
      costMat: 216700,
    },
    {
      rowKey: 'lam-2',
      stage: 'GHÉP (Lớp 2)',
      mat: 'LLDPE 60',
      width: 0.65,
      meters: 8420,
      waste: 350,
      cpsx: 0,
      costCPSX: 0,
      matPrice: 144,
      costMat: 820700,
    },
    {
      rowKey: 'cut',
      stage: 'CẮT',
      mat: '-',
      width: 0.65,
      meters: 9070,
      waste: 280,
      cpsx: 0,
      costCPSX: 0,
      matPrice: null,
      costMat: null,
    },
  ];
}

function taoResult(patch?: Record<string, unknown>): CalculateResult {
  return {
    input: {
      productType: 'tui',
      numColors: 4,
      quantity: 10000,
      bagType: '3bien',
      cutStep: 0.4,
      hasZipper: false,
      metallicSurcharge: 0,
    },
    structureText: 'MPET 12//LLDPE 60',
    printMeters: 8000,
    printWaste: 420,
    cutMeters: 9070,
    cutWaste: 280,
    zipperTotal: 1600000,
    tapeTotal: 0,
    handleTotal: 0,
    layers: {
      print: {},
      laminations: [{ layerNum: 2, meters: 8420, waste: 350 }],
      cut: {},
    },
    ...patch,
  } as unknown as CalculateResult;
}

// ── 1. chonNhomMuc ──────────────────────────────────────────────────────────

eq(chonNhomMuc('MPET 12'), 'pet', 'MPET → pet');
eq(chonNhomMuc('PET 12'), 'pet', 'PET → pet');
eq(chonNhomMuc('BOPP 18'), 'opp', 'BOPP → opp');
eq(chonNhomMuc('OPP 20'), 'opp', 'OPP → opp');
eq(chonNhomMuc('LLDPE 60'), 'pe', 'LLDPE → pe');
eq(chonNhomMuc('PE'), 'pe', 'PE → pe');
eq(chonNhomMuc('PA'), 'pet', 'PA → pet (màng còn lại)');
eq(chonNhomMuc(''), 'pet', 'rỗng → pet mặc định');
eq(chonNhomMuc('GIẤY KRAFT'), 'pet', 'không khớp → pet mặc định');
eq(chonNhomMuc('mpet 12'), 'pet', 'lowercase vẫn nhận');

// ── 2. tinhCpMucDungMoiIn ───────────────────────────────────────────────────

{
  // 4 màu PET: (16 × 80000 + 9 × 40000) / 1000 = (1.280.000 + 360.000)/1000 = 1640
  const r = tinhCpMucDungMoiIn(4, 'MPET 12', ink);
  approx(r.donGia, 1640, '4 màu MPET → 1640 ₫/m²');
  eq(r.nhomMuc, 'pet', 'nhóm mực = pet');
  approx(r.giaMuc, 80000, 'giá mực PET');
  approx(r.giaDungMoi, 40000, 'giá DM_PET');
}

{
  // 2 màu OPP: (8 × 60000 + 6 × 40000) / 1000 = (480.000 + 240.000)/1000 = 720
  const r = tinhCpMucDungMoiIn(2, 'BOPP 18', ink);
  approx(r.donGia, 720, '2 màu BOPP → 720 ₫/m²');
  eq(r.nhomMuc, 'opp', 'nhóm mực = opp');
}

{
  // KHÔNG nhân lại soMau — 8 màu: (32 × 80000 + 15 × 40000)/1000 = 2560 + 600 = 3160
  const r = tinhCpMucDungMoiIn(8, 'PET 12', ink);
  approx(r.donGia, 3160, '8 màu → 3160, KHÔNG nhân lại soMau');
  assert(r.donGia < 5000, '8 màu không bị bình phương số màu');
}

{
  const r = tinhCpMucDungMoiIn(0, 'MPET 12', ink);
  approx(r.donGia, 0, 'soMau = 0 → CP mực 0');
}

{
  const r = tinhCpMucDungMoiIn(12, 'PET 12', ink);
  approx(r.donGia, 3160, 'soMau = 12 → clamp về 8');
}

{
  const inkNull: CpsxUpgradeInk = {
    ...ink,
    pet: { rows: [], appliedSource: 'manual', appliedPrice: null },
  };
  const r = tinhCpMucDungMoiIn(4, 'PET 12', inkNull);
  // chỉ còn phần dung môi: 9 × 40000 / 1000 = 360
  approx(r.donGia, 360, 'appliedPrice null → giá mực 0, không NaN');
  assert(Number.isFinite(r.donGia), 'không NaN khi appliedPrice null');
}

{
  // LLDPE dùng bảng pe + DM_OPP
  const r = tinhCpMucDungMoiIn(1, 'LLDPE 60', ink);
  // (4 × 76000 + 4.5 × 40000)/1000 = 304 + 180 = 484
  approx(r.donGia, 484, 'LLDPE 1 màu → bảng pe + DM_OPP');
  eq(r.nhomMuc, 'pe', 'nhóm mực = pe');
}

{
  // Tỉ lệ phủ 50% → chỉ nhân phần mực, dung môi giữ nguyên
  // 4 màu PET: (16 × 0.5 × 80000 + 9 × 40000)/1000 = (640.000 + 360.000)/1000 = 1000
  const r = tinhCpMucDungMoiIn(4, 'MPET 12', ink, 0.5);
  approx(r.donGia, 1000, '4 màu MPET + phủ 50% → 1000 ₫/m²');
  eq(r.tyLePhuMuc, 0.5, 'trả về tyLePhuMuc 0.5');
}

{
  // 2 màu OPP + phủ 50%: (8 × 0.5 × 60000 + 6 × 40000)/1000 = (240.000 + 240.000)/1000 = 480
  const r = tinhCpMucDungMoiIn(2, 'BOPP 18', ink, 0.5);
  approx(r.donGia, 480, '2 màu BOPP + phủ 50% → 480 ₫/m²');
}

{
  // Không in (soMau = 0) dù truyền tỉ lệ phủ → vẫn 0 (guard chạy trước phép nhân)
  const r = tinhCpMucDungMoiIn(0, 'MPET 12', ink, 0.5);
  approx(r.donGia, 0, 'soMau=0 + phủ 50% → vẫn 0');
}

{
  // tyLePhuMuc không hợp lệ → fallback 100%
  const rNaN = tinhCpMucDungMoiIn(4, 'MPET 12', ink, NaN as unknown as number);
  approx(rNaN.donGia, 1640, 'tyLe NaN → fallback 100%');
  const rAm = tinhCpMucDungMoiIn(4, 'MPET 12', ink, -1);
  // chỉ còn dung môi: 9 × 40000/1000 = 360
  approx(rAm.donGia, 360, 'tyLe âm → clamp 0, chỉ còn phần dung môi');
}

// ── 3. tinhCpKeoDungMoiGhep ─────────────────────────────────────────────────

{
  // keo TB (40000 + 40000)/2 = 40000; (3.5 × 40000 + 7 × 40000)/1000 = 140 + 280 = 420
  const r = tinhCpKeoDungMoiGhep(ink);
  approx(r.donGia, 420, 'keo + DM ghép → 420 ₫/m²');
  approx(r.giaKeo, 40000, 'giá keo TB');
  approx(r.giaDungMoi, 40000, 'giá DM_EA');
}

{
  // keo TB khác nhau: appliedPrice null → fallback TB (30000 + 50000)/2 = 40000 → vẫn 420
  const inkKeo: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      dungMoi: { rows: ink.solventAdhesive.dungMoi.rows },
      keo: {
        rows: [
          { ma: 'KEO_319', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '', slDung: 1 },
          { ma: 'KEO_766', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '', slDung: 1 },
        ],
        appliedSource: 'average',
        appliedPrice: null,
      },
    },
  };
  approx(tinhCpKeoDungMoiGhep(inkKeo).donGia, 420, 'keo TB 30k+50k = 40k');
}

{
  // manual: appliedPrice 35000 → (3.5×35000 + 7×40000)/1000 = 122.5 + 280 = 402.5
  const inkManual: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      dungMoi: { rows: ink.solventAdhesive.dungMoi.rows },
      keo: {
        rows: ink.solventAdhesive.keo.rows,
        appliedSource: 'manual',
        appliedPrice: 35000,
      },
    },
  };
  const r = tinhCpKeoDungMoiGhep(inkManual);
  approx(r.giaKeo, 35000, 'keo manual = 35000');
  approx(r.donGia, 402.5, 'keo manual → 402.5 ₫/m²');
}

{
  // weighted fallback khi appliedPrice null: (30k×2 + 50k×1)/3 = 36.667
  const inkWeighted: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      dungMoi: { rows: ink.solventAdhesive.dungMoi.rows },
      keo: {
        rows: [
          { ma: 'KEO_319', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '', slDung: 2 },
          { ma: 'KEO_766', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '', slDung: 1 },
        ],
        appliedSource: 'weighted',
        appliedPrice: null,
      },
    },
  };
  const r = tinhCpKeoDungMoiGhep(inkWeighted);
  approx(r.giaKeo, 30000 * 2 / 3 + 50000 / 3, 'keo weighted fallback → TB trọng số');
}

{
  // không có dòng KEO_ → giá keo 0, không chia cho 0
  const inkNoKeo: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      dungMoi: { rows: ink.solventAdhesive.dungMoi.rows },
      keo: { rows: [], appliedSource: 'average', appliedPrice: null },
    },
  };
  const r = tinhCpKeoDungMoiGhep(inkNoKeo);
  approx(r.donGia, 280, 'không có KEO_ → chỉ còn DM ghép 280');
  assert(Number.isFinite(r.donGia), 'không NaN khi thiếu dòng KEO_');
}

{
  // không có DM_EA → chỉ còn keo
  const inkNoEa: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      dungMoi: {
        rows: [{ ma: 'DM_OPP', ten: 'op', dvt: 'kg', donGia: 40000, ghiChu: '' }],
      },
      keo: ink.solventAdhesive.keo,
    },
  };
  approx(tinhCpKeoDungMoiGhep(inkNoEa).donGia, 140, 'không có DM_EA → chỉ keo 140');
}

{
  // shape cũ (rows phẳng) vẫn hoạt động — dữ liệu cấu hình cũ không hỏng
  const inkLegacy: CpsxUpgradeInk = {
    ...ink,
    solventAdhesive: {
      rows: [
        { ma: 'DM_OPP', ten: 'op', dvt: 'kg', donGia: 40000, ghiChu: '' },
        { ma: 'KEO_319', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '' },
        { ma: 'KEO_766', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '' },
        { ma: 'DM_EA', ten: 'ea', dvt: 'kg', donGia: 40000, ghiChu: '' },
      ],
    } as unknown as SolventAdhesiveTable,
  };
  const r = tinhCpKeoDungMoiGhep(inkLegacy);
  approx(r.giaKeo, 40000, 'shape cũ: TB dòng KEO_ = 40000');
  approx(r.giaDungMoi, 40000, 'shape cũ: DM_EA vẫn tra được');
  approx(r.donGia, 420, 'shape cũ → 420 ₫/m²');
}

// ── 4. lapDongVatLieuNangCao (Table 1) ──────────────────────────────────────

{
  const rows = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo());
  eq(rows.map(r => r.congDoan), ['CPSX IN', 'GHÉP (Lớp 2)', 'CẮT', 'làm túi'], 'túi: 4 dòng');

  const dongIn = rows[0];
  approx(dongIn.cpMucKeo!, 1640, 'dòng in: 1640 ₫/m²');
  // 1640 × (8000+420) × 0.65 = 1640 × 8420 × 0.65 = 8.975.720
  approx(dongIn.thanhTienMucKeo!, 1640 * 8420 * 0.65, 'dòng in: thành tiền = ₫/m² × NVL × khổ');
  approx(dongIn.dauVaoNVL!, 8420, 'dòng in: đầu vào NVL = TP + phi hao');

  const dongGhep = rows[1];
  approx(dongGhep.cpMucKeo!, 420, 'dòng ghép: 420 ₫/m²');
  approx(dongGhep.thanhTienMucKeo!, 420 * 8770 * 0.65, 'dòng ghép: thành tiền');

  const dongChia = rows[2];
  eq(dongChia.cpMucKeo, null, 'dòng chia: mực/keo = null');
  eq(dongChia.thanhTienMucKeo, null, 'dòng chia: thành tiền mực/keo = null');

  const dongTui = rows[3];
  eq(dongTui.congDoan, 'làm túi', 'dòng làm túi tồn tại');
  eq(dongTui.vatLieu, 'Zipper', 'làm túi: vật liệu = Zipper (không còn Khóa)');
  approx(dongTui.thanhTienNVL!, 1600000, 'làm túi: thành tiền = tổng phụ kiện');
  eq(dongTui.cpMucKeo, null, 'làm túi: mực/keo = null');
  eq(dongTui.dauVaoNVL, null, 'làm túi: đầu vào NVL = null (khác đơn vị)');
  eq(dongTui.giaNVL, null, 'làm túi: giá NVL = null');
}

{
  // coverageRatio 50% từ input → dòng in tính theo tỉ lệ phủ
  const r50 = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, coverageRatio: 0.5 } });
  const rows50 = lapDongVatLieuNangCao(r50, taoUniRows(), taoHangSo());
  approx(rows50[0].cpMucKeo!, 1000, 'phủ 50% → dòng in 1000 ₫/m² (1640 × giảm phần mực)');
  approx(rows50[0].thanhTienMucKeo!, 1000 * 8420 * 0.65, 'phủ 50% → thành tiền theo 1000 ₫/m²');
  assert(String(rows50[0].ghiChu ?? '').includes('50%'), 'ghiChu hiển thị tỉ lệ phủ 50%');
  approx(rows50[1].cpMucKeo!, 420, 'dòng ghép: keo không đổi theo tỉ lệ phủ');
}

{
  // Nhũ + Phủ mờ: metallicSurcharge > 0 → dòng in hiện CP + thành tiền, tổng cộng thêm
  const rNhuMo = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, metallicSurcharge: 400 } });
  const rowsNhuMo = lapDongVatLieuNangCao(rNhuMo, taoUniRows(), taoHangSo());
  approx(rowsNhuMo[0].cpNhuMo!, 400, 'in nhũ/mờ: 400 ₫/m²');
  approx(rowsNhuMo[0].thanhTienNhuMo!, 400 * 8420 * 0.65, 'in nhũ/mờ: thành tiền = ₫/m² × đầu vào × khổ');
  eq(rowsNhuMo[1].cpNhuMo, null, 'dòng ghép: không có CP nhũ/mờ');
  const tongNhuMo = tinhTongNangCao(rowsNhuMo, []);
  approx(
    tongNhuMo.tongVatLieu,
    rowsNhuMo.reduce((s, x) => s + (x.thanhTienNVL ?? 0) + (x.thanhTienMucKeo ?? 0) + (x.thanhTienNhuMo ?? 0), 0),
    'tổng VL gồm cả nhũ/mờ',
  );
}

{
  // Không nhũ/mờ → null
  const rowsKhongNhuMo = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo());
  eq(rowsKhongNhuMo[0].cpNhuMo, null, 'không nhũ/mờ → CP nhũ/mờ null');
  eq(rowsKhongNhuMo[0].thanhTienNhuMo, null, 'không nhũ/mờ → thành tiền nhũ/mờ null');
}

{
  // coverageRatio thiếu / không hợp lệ → fallback 100%
  const rowsThieu = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo());
  approx(rowsThieu[0].cpMucKeo!, 1640, 'thiếu coverageRatio → 100% (1640)');
  const rowsSai = lapDongVatLieuNangCao(
    taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, coverageRatio: 7 } }),
    taoUniRows(),
    taoHangSo(),
  );
  approx(rowsSai[0].cpMucKeo!, 1640, 'coverageRatio không hợp lệ → fallback 100%');
}

{
  // Không in (numColors = 0) + phủ 50% → CP mực vẫn 0
  const rKhongIn = taoResult({ input: { productType: 'tui', numColors: 0, quantity: 10000, coverageRatio: 0.5 } });
  const rowsKhongIn = lapDongVatLieuNangCao(rKhongIn, taoUniRows(), taoHangSo());
  approx(rowsKhongIn[0].cpMucKeo!, 0, 'không in → CP mực + DM = 0');
  approx(rowsKhongIn[0].thanhTienMucKeo!, 0, 'không in → thành tiền mực 0');
}

{
  // Đủ 3 phụ kiện → "Zipper + Băng keo + Quai"
  const r = taoResult({ zipperTotal: 800000, tapeTotal: 50000, handleTotal: 30000 });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const dongTui = rows.find(x => x.congDoan === 'làm túi')!;
  eq(dongTui.vatLieu, 'Zipper + Băng keo + Quai', 'làm túi: gộp đủ 3 phụ kiện');
  approx(dongTui.thanhTienNVL!, 880000, 'làm túi: thành tiền = Zipper + băng keo + quai');
}

{
  // Nhiều lớp ghép → mỗi lớp 1 dòng, mỗi dòng tính keo riêng
  const uni = taoUniRows();
  uni.splice(2, 0, {
    rowKey: 'lam-3',
    stage: 'GHÉP (Lớp 3)',
    mat: 'PET 12',
    width: 0.65,
    meters: 8770,
    waste: 300,
    cpsx: 0,
    costCPSX: 0,
    matPrice: 32.4,
    costMat: 191000,
  });
  const rows = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo());
  const cacDongGhep = rows.filter(r => r.congDoan.startsWith('GHÉP'));
  eq(cacDongGhep.length, 2, '2 lớp ghép → 2 dòng');
  cacDongGhep.forEach((d, i) => approx(d.cpMucKeo!, 420, `lớp ghép ${i + 2}: keo 420 mỗi dòng`));
}

{
  // Ghép 1 lớp 2 vật liệu song song → tách 2 dòng chi tiết (như bảng cũ)
  const uni = taoUniRows();
  uni[1] = {
    ...uni[1],
    mat: '',
    materialId: undefined,
    matPrice: null,
    materialDetails: [
      { materialId: 'm-pet', name: 'MPET 12', width: 0.65, matPrice: 39.6, costMat: 216700 },
      { materialId: 'm-ll', name: 'LLDPE 60', width: 0.5, matPrice: 144, costMat: 604000 },
    ],
  };
  const rows = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo(), []);
  const ghep = rows.filter(
    r => (r.vatLieu === 'MPET 12' && r.congDoan === 'GHÉP (Lớp 2)')
      || (r.vatLieu === 'LLDPE 60' && r.congDoan === ''),
  );
  eq(ghep.length, 2, 'ghép 2 vật liệu → 2 dòng');
  eq(ghep.map(r => r.vatLieu), ['MPET 12', 'LLDPE 60'], 'tên từng vật liệu chi tiết');
  approx(ghep[0].khoMang!, 0.65, 'khổ chi tiết 1');
  approx(ghep[1].khoMang!, 0.5, 'khổ chi tiết 2');
  eq(ghep[0].congDoan, 'GHÉP (Lớp 2)', 'dòng chi tiết 1 → giữ công đoạn');
  eq(ghep[1].congDoan, '', 'dòng chi tiết 2 → công đoạn trống (như ô gộp)');
  approx(ghep[0].dauVaoNVL!, 8770, 'đầu vào NVL cấp lớp lặp lại dòng 1');
  approx(ghep[1].dauVaoNVL!, 8770, 'đầu vào NVL cấp lớp lặp lại dòng 2');
  approx(ghep[0].cpVatLieu!, 39.6, 'CP vật liệu ₫/m² chi tiết 1');
  approx(ghep[1].cpVatLieu!, 144, 'CP vật liệu ₫/m² chi tiết 2');
  approx(ghep[0].thanhTienNVL!, 216700, 'thành tiền NVL chi tiết 1 (engine phân bổ)');
  approx(ghep[1].thanhTienNVL!, 604000, 'thành tiền NVL chi tiết 2');
  approx(ghep[0].thanhTienNVL! + ghep[1].thanhTienNVL!, 820700, 'tổng NVL = dòng gộp cũ');
  approx(ghep[0].giaNVL!, 55000, 'giá NVL MPET fallback 55.000 ₫/kg');
  approx(ghep[1].giaNVL!, 40000, 'giá NVL LLDPE fallback 40.000 ₫/kg');
  approx(ghep[0].cpMucKeo!, 420, 'keo ₫/m² giữ nguyên');
  approx(ghep[0].thanhTienMucKeo!, 420 * 8770 * 0.65, 'thành tiền keo chi tiết 1');
  approx(ghep[1].thanhTienMucKeo!, 420 * 8770 * 0.5, 'thành tiền keo chi tiết 2');
  approx(
    ghep[0].thanhTienMucKeo! + ghep[1].thanhTienMucKeo!,
    420 * 8770 * 1.15,
    'tổng keo 2 dòng = dòng gộp cũ (khổ Σ 1.15)',
  );
}

{
  // Vendor báo giá ₫/m² → chi tiết ghép cũng không hiện giá ₫/kg
  const uni = taoUniRows();
  uni[1] = {
    ...uni[1],
    mat: '',
    materialId: undefined,
    matPrice: null,
    matPriceIsPerM2: true,
    materialDetails: [
      { materialId: 'm-pet', name: 'MPET 12', width: 0.65, matPrice: 39.6, costMat: 216700 },
    ],
  };
  const rows = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo(), []);
  const ghep = rows.filter(r => r.congDoan === 'GHÉP (Lớp 2)');
  eq(ghep.length, 1, '1 chi tiết → 1 dòng');
  eq(ghep[0].giaNVL, null, 'matPriceIsPerM2 → giá ₫/kg null');
  eq(ghep[0].donViGiaNVL, null, 'matPriceIsPerM2 → không đơn vị kg');
}

{
  // Màng: ẩn dòng làm túi (uniRows không có 'cut' cho màng)
  const uniMang = taoUniRows().filter(r => r.rowKey !== 'cut');
  const rMang = taoResult({
    input: { productType: 'mang', numColors: 4, quantity: 10000 },
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
  });
  const rows = lapDongVatLieuNangCao(rMang, uniMang, taoHangSo());
  assert(!rows.some(r => r.congDoan === 'làm túi'), 'màng: ẩn dòng làm túi');
  assert(!rows.some(r => r.congDoan === 'chia'), 'màng: không có dòng chia');
}

{
  // Phụ kiện = 0 → ẩn dòng làm túi
  const r0 = taoResult({ zipperTotal: 0, tapeTotal: 0, handleTotal: 0 });
  const rows = lapDongVatLieuNangCao(r0, taoUniRows(), taoHangSo());
  assert(!rows.some(r => r.congDoan === 'làm túi'), 'phụ kiện 0 → ẩn dòng làm túi');
}

{
  // Nhiều phụ kiện → gộp 1 dòng, cột Vật liệu liệt kê
  const rPk = taoResult({ zipperTotal: 1000000, tapeTotal: 500000, handleTotal: 300000 });
  const rows = lapDongVatLieuNangCao(rPk, taoUniRows(), taoHangSo());
  const dongTui = rows.find(r => r.congDoan === 'làm túi')!;
  approx(dongTui.thanhTienNVL!, 1800000, 'gộp 3 phụ kiện = 1.800.000');
  assert(dongTui.vatLieu.includes('Zipper'), 'liệt kê Zipper');
  assert(dongTui.vatLieu.includes('Băng keo'), 'liệt kê Băng keo');
  assert(dongTui.vatLieu.includes('Quai'), 'liệt kê Quai');
}

{
  // Giá NVL (₫/kg): tra theo materialId trong danh sách materials
  const uni = taoUniRows();
  uni[0].materialId = 'm-mpet';
  const materials = [
    { id: 'm-mpet', name: 'MPET 12', pricePerKg: 57000 },
  ] as unknown as Parameters<typeof lapDongVatLieuNangCao>[3];
  const rows = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo(), materials);
  approx(rows[0].giaNVL!, 57000, 'giá NVL tra theo materialId');
  eq(rows[0].donViGiaNVL, 'kg', 'đơn vị giá NVL = kg');
}

{
  // Không tìm thấy trong materials → fallback theo tên
  const rows = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo(), []);
  approx(rows[0].giaNVL!, 55000, 'MPET fallback 55.000 ₫/kg');
  approx(rows[1].giaNVL!, 40000, 'LLDPE fallback 40.000 ₫/kg');
  eq(rows[2].giaNVL, null, 'dòng chia (mat = "-") → giá NVL null');
}

{
  // Vendor báo giá ₫/m² → không hiện giá ₫/kg
  const uni = taoUniRows();
  uni[0].matPriceIsPerM2 = true;
  const rows = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo(), []);
  eq(rows[0].giaNVL, null, 'matPriceIsPerM2 → giá ₫/kg null');
  eq(rows[0].donViGiaNVL, null, 'matPriceIsPerM2 → không có đơn vị kg');
}

// ── 5. lapDongNhanCongDien (Table 2) ────────────────────────────────────────

{
  const rows = lapDongNhanCongDien(taoResult(), taoHangSo());
  eq(rows.map(r => r.congDoan), ['in', 'ghép', 'chia', 'làm túi'], 'túi: 4 dòng cứng');

  // in: setup = 4 × (15 + 20) = 140 phút; chạy = 8420/150 = 56,13 phút
  // tổng = 196,13 phút (không phủ mờ vì metallicSurcharge = 0)
  const dongIn = rows[0];
  approx(dongIn.thoiGianPhut!, 4 * 35 + 8420 / 150, 'in: thời gian SX');

  // điện in = 100 × 0.8 × 3000 / 60 = 4000 ₫/phút
  approx(dongIn.cpDienPerPhut!, 4000, 'in: 4000 ₫/phút điện');
  approx(dongIn.thanhTienDien, dongIn.thoiGianPhut! * 4000, 'in: thành tiền điện = phút × ₫/phút');
  approx(dongIn.thanhTienNhanCong, dongIn.thoiGianPhut! * dongIn.cpNhanCongPerPhut!, 'in: thành tiền NC');

  // NC/phút mới (bỏ ÷ tổngCN × CN1ca, tăng ca × tỉ lệ 50%, làm tròn nguyên):
  // in: TC = 900k ÷ 2 × 1 × 0.5 = 225.000 → (900k + 60k + 225k) ÷ 24 ÷ 60 = 822,92 → 823
  approx(dongIn.cpNhanCongPerPhut!, 823, 'in: 823 ₫/phút');
  // ghép: TC = 200.000 → (800k + 60k + 200k) ÷ 24 ÷ 60 = 736,11 → 736
  approx(rows[1].cpNhanCongPerPhut!, 736, 'ghép: 736 ₫/phút');
  // chia: TC = 100.000 → (400k + 30k + 100k) ÷ 12 ÷ 60 = 736,11 → 736
  approx(rows[2].cpNhanCongPerPhut!, 736, 'chia: 736 ₫/phút');
  // túi: TC = 150.000 → (600k + 60k + 150k) ÷ 24 ÷ 60 = 562,5 → 563; rounded 1000 → 1000
  approx(rows[3].cpNhanCongPerPhut!, 1000, 'làm túi: dùng roundedPerMin');

  // ghép: 1 lần → setup 10'; chạy 8770/100 = 87,7' → tổng 97,7'
  approx(rows[1].thoiGianPhut!, 10 + 8770 / 100, 'ghép: thời gian SX');
  approx(rows[1].cpDienPerPhut!, 50 * 0.8 * 3000 / 60, 'ghép: 2000 ₫/phút điện');

  // chia: cấu trúc chứa PET → rule mpet_pet (setup 20'; 90 m/phút)
  approx(rows[2].thoiGianPhut!, 20 + 9350 / 90, 'chia: thời gian SX');

  // làm túi: 3 biên (90') · bước 0,4m = 400mm → ≤400mm (60 cái/phút)
  approx(rows[3].thoiGianPhut!, 90 + 10000 / 60, 'làm túi: thời gian theo số chiếc');
  approx(rows[3].cpNhanCongPerPhut!, 1000, 'làm túi: dùng roundedPerMin');
}

{
  // Màng: ẩn dòng làm túi
  const rMang = taoResult({ input: { productType: 'mang', numColors: 4, quantity: 10000 } });
  const rows = lapDongNhanCongDien(rMang, taoHangSo());
  eq(rows.map(r => r.congDoan), ['in', 'ghép', 'chia'], 'màng: ẩn dòng làm túi');
}

{
  // Không có lớp ghép → thời gian ghép chỉ còn setup
  const rNoLam = taoResult({ layers: { print: {}, laminations: [], cut: {} } });
  const rows = lapDongNhanCongDien(rNoLam, taoHangSo());
  const dongGhep = rows.find(r => r.congDoan === 'ghép')!;
  eq(dongGhep.thoiGianPhut, null, 'không lớp ghép → thời gian null');
  approx(dongGhep.thanhTienNhanCong, 0, 'không lớp ghép → thành tiền NC 0');
  approx(dongGhep.thanhTienDien, 0, 'không lớp ghép → thành tiền điện 0');
}

{
  // Chưa có giá điện → cpDienPerPhut null, thành tiền 0
  const hsNoDien = taoHangSo({
    cpsxUpgradeElectric: { ...electric, appliedPricePerKwh: null },
  });
  const rows = lapDongNhanCongDien(taoResult(), hsNoDien);
  eq(rows[0].cpDienPerPhut, null, 'chưa có giá điện → null');
  approx(rows[0].thanhTienDien, 0, 'chưa có giá điện → thành tiền 0');
}

// ── 6. tinhTongNangCao (3 dòng tổng) ────────────────────────────────────────

{
  const result = taoResult();
  const hangSo = taoHangSo();
  const dongVL = lapDongVatLieuNangCao(result, taoUniRows(), hangSo);
  const dongNCD = lapDongNhanCongDien(result, hangSo);
  const tong = tinhTongNangCao(dongVL, dongNCD);

  const tongNVL = dongVL.reduce((s, r) => s + (r.thanhTienNVL ?? 0), 0);
  const tongMucKeo = dongVL.reduce((s, r) => s + (r.thanhTienMucKeo ?? 0), 0);
  approx(tong.tongVatLieu, tongNVL + tongMucKeo, 'dòng 1 = Σ CPNVL + Σ mực/keo');

  const tongNC = dongNCD.reduce((s, r) => s + r.thanhTienNhanCong, 0);
  const tongDien = dongNCD.reduce((s, r) => s + r.thanhTienDien, 0);
  approx(tong.tongNhanCongDien, tongNC + tongDien, 'dòng 2 = Σ NC + Σ điện');

  approx(tong.tongGiaThanh, tong.tongVatLieu + tong.tongNhanCongDien, 'dòng 3 = dòng 1 + dòng 2');
  assert(tong.tongGiaThanh > 0, 'tổng giá thành > 0');
}

{
  // Tổng với mảng rỗng → 0, không NaN
  const tong = tinhTongNangCao([], []);
  approx(tong.tongVatLieu, 0, 'rỗng → tổng VL 0');
  approx(tong.tongNhanCongDien, 0, 'rỗng → tổng NC+điện 0');
  approx(tong.tongGiaThanh, 0, 'rỗng → tổng giá thành 0');
}

// ── 7. Thiếu cấu hình → không crash ─────────────────────────────────────────

{
  const hsTrong = {} as AppConstants;
  const dongVL = lapDongVatLieuNangCao(taoResult(), taoUniRows(), hsTrong);
  assert(Array.isArray(dongVL), 'thiếu cpsxUpgradeInk → vẫn trả mảng');
  dongVL.forEach(r => {
    assert(r.thanhTienMucKeo == null || Number.isFinite(r.thanhTienMucKeo), 'không NaN khi thiếu ink');
  });

  const dongNCD = lapDongNhanCongDien(taoResult(), hsTrong);
  assert(Array.isArray(dongNCD), 'thiếu cấu hình → vẫn trả mảng');
  dongNCD.forEach(r => {
    assert(Number.isFinite(r.thanhTienNhanCong), 'không NaN thành tiền NC');
    assert(Number.isFinite(r.thanhTienDien), 'không NaN thành tiền điện');
  });
}

console.log(`✓ dac-ta-nang-cao: ${soTest} assertions passed`);
