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
import { xuLyDongGhiDe } from './manager-calculation';
import type { OverrideTable } from './types';

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
      { key: 'opp_mattopp', label: 'Màng OPP, MattOPP', setupMinutes: 30, speedMPerMin: 180 },
      { key: 'mpet_pet', label: 'Màng MPET, PET', setupMinutes: 20, speedMPerMin: 90 },
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
      { key: 'le_200', label: '≤ 200 mm', maxStepMm: 200, speedMPerMin: 80 },
      { key: '200_300', label: '200 – ≤300 mm', maxStepMm: 300, speedMPerMin: 70 },
      { key: '300_400', label: '300 – ≤400 mm', maxStepMm: 400, speedMPerMin: 60 },
      { key: '400_550', label: '400 – ≤550 mm', maxStepMm: 550, speedMPerMin: 50 },
      { key: 'gt_550', label: '> 550 mm', maxStepMm: null, speedMPerMin: 20 },
    ],
  },
};

const labor: CpsxUpgradeLabor = {
  print: { wages: [500000, 400000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
  laminate: { wages: [450000, 350000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 2, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 24, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
  slit: { wages: [400000], mealMorning: 30000, mealEvening: 30000, otFactor: 1, shiftCount: 1, peoplePerShift: null, machinesPerDay: 1, hoursPerDay: 12, otHours: 4, tyLeTangCa: 0.5, roundedPerMin: null },
  bag: {
    wages: [300000, 300000],
    mealMorning: 30000,
    mealEvening: 30000,
    otFactor: 1,
    peoplePerShift: 2,
    roundedPerMin: 1000,
    hoursPerDay: 24,
    machinesPerDay: 3,
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
    zipperPrice: 378,
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
  // zipperTotal > 0 → coi có Zipper; gộp vào dòng Làm túi (không tách)
  // cut 9070+280=9350; không chia → N=1; zipperPrice 378 → 9350×1×378
  const rows = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo());
  eq(rows.map(r => r.congDoan), ['In', 'GHÉP (Lớp 2)', 'Làm túi'], 'túi: 3 dòng (Zipper gộp vào Làm túi)');

  const dongIn = rows[0];
  approx(dongIn.cpMucKeo!, 1640, 'dòng in: 1640 ₫/m²');
  // 1640 × (8000+420) × 0.65 = 1640 × 8420 × 0.65 = 8.975.720
  approx(dongIn.thanhTienMucKeo!, 1640 * 8420 * 0.65, 'dòng in: thành tiền = ₫/m² × NVL × khổ');
  approx(dongIn.dauVaoNVL!, 8420, 'dòng in: đầu vào NVL = TP + phi hao');

  const dongGhep = rows[1];
  approx(dongGhep.cpMucKeo!, 420, 'dòng ghép: 420 ₫/m²');
  approx(dongGhep.thanhTienMucKeo!, 420 * 8770 * 0.65, 'dòng ghép: thành tiền');

  const dongTui = rows[2];
  eq(dongTui.congDoan, 'Làm túi', 'dòng Làm túi giữ nhãn');
  eq(dongTui.vatLieu, 'Zipper', 'vật liệu gộp = Zipper');
  approx(dongTui.dauVaoNVL!, 9350, 'làm túi: giữ Đầu vào NVL cắt');
  approx(dongTui.thanhTienNVL!, 9350 * 1 * 378, 'làm túi: Đầu vào × N × giá zipper 378');
  eq(dongTui.cpMucKeo, null, 'làm túi: mực/keo = null');
  eq(dongTui.giaNVL, null, 'làm túi: giá NVL kg = null');
  assert(!rows.some(r => r.congDoan === '' && r.vatLieu?.includes('Zipper')), 'không còn dòng Zipper tách');
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
  // Nhũ + Phủ mờ gộp vào dòng mực + dung môi: metallicSurcharge cộng thẳng vào CP mực
  const rNhuMo = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, metallicSurcharge: 400 } });
  const rowsNhuMo = lapDongVatLieuNangCao(rNhuMo, taoUniRows(), taoHangSo());
  approx(rowsNhuMo[0].cpMucKeo!, 1640 + 400, 'in nhũ/mờ: mực + DM = 1640 + 400 = 2040 ₫/m²');
  approx(rowsNhuMo[0].thanhTienMucKeo!, 2040 * 8420 * 0.65, 'in nhũ/mờ: thành tiền gộp cả nhũ/mờ');
  approx(rowsNhuMo[1].cpMucKeo!, 420, 'dòng ghép: không bị cộng nhũ/mờ');
  const tongNhuMo = tinhTongNangCao(rowsNhuMo, []);
  approx(
    tongNhuMo.tongVatLieu,
    rowsNhuMo.reduce((s, x) => s + (x.thanhTienNVL ?? 0) + (x.thanhTienMucKeo ?? 0), 0),
    'tổng VL gồm cả nhũ/mờ (qua dòng mực)',
  );
}

{
  // Phủ mờ (hasMo + metallicSurcharge 200) → dòng in +200 ₫/m² mực + dung môi + dòng Lật mặt
  const rowsThuong = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo());
  approx(rowsThuong[0].cpMucKeo!, 1640, 'không phủ mờ → 1640 ₫/m²');
  assert(!rowsThuong.some(r => r.congDoan === 'Lật mặt'), 'không phủ mờ → không có dòng Lật mặt Table 1');
  const rMo = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, metallicSurcharge: 200, hasMo: true } });
  const rowsMo = lapDongVatLieuNangCao(rMo, taoUniRows(), taoHangSo());
  eq(rowsMo.map(r => r.congDoan), ['In', 'Lật mặt', 'GHÉP (Lớp 2)', 'Làm túi'], 'phủ mờ Table 1: In → Lật mặt → ghép → làm túi');
  approx(rowsMo[0].cpMucKeo!, 1840, 'phủ mờ → 1640 + 200 = 1840 ₫/m²');
  approx(rowsMo[0].thanhTienMucKeo!, 1840 * 8420 * 0.65, 'phủ mờ: thành tiền theo 1840 ₫/m²');
  assert(String(rowsMo[0].ghiChu ?? '').includes('200'), 'ghiChu nhắc phụ phí in');

  const dongLatMat = rowsMo[1];
  eq(dongLatMat.rowKey, 'matte', 'Lật mặt: rowKey matte');
  eq(dongLatMat.vatLieu, rowsMo[0].vatLieu, 'Lật mặt: vật liệu = In');
  eq(dongLatMat.khoMang, rowsMo[0].khoMang, 'Lật mặt: khổ = In');
  approx(dongLatMat.thanhPham!, Number(rowsMo[0].thanhPham), 'Lật mặt: TP = TP In');
  approx(dongLatMat.phiHao!, 0, 'Lật mặt: phi hao = 0');
  approx(dongLatMat.dauVaoNVL!, Number(rowsMo[0].thanhPham), 'Lật mặt: đầu vào = TP In');
  approx(dongLatMat.giaNVL!, 0, 'Lật mặt: giá NVL = 0');
  approx(dongLatMat.cpVatLieu!, 0, 'Lật mặt: CP VL = 0');
  approx(dongLatMat.thanhTienNVL!, 0, 'Lật mặt: thành tiền NVL = 0');
  approx(dongLatMat.cpMucKeo!, 0, 'Lật mặt: CP mực/keo = 0');
  approx(dongLatMat.thanhTienMucKeo!, 0, 'Lật mặt: thành tiền mực/keo = 0');
  eq(dongLatMat.donViGiaNVL, null, 'Lật mặt: không đơn vị kg');

  approx(rowsMo[2].cpMucKeo!, 420, 'dòng ghép: không đổi khi phủ mờ');
  const tongMo = tinhTongNangCao(rowsMo, []);
  const tongKhongLat = tinhTongNangCao(rowsMo.filter(r => r.congDoan !== 'Lật mặt'), []);
  approx(tongMo.tongVatLieu, tongKhongLat.tongVatLieu, 'Lật mặt chi phí 0 → tổng VL không đổi');
}

{
  // Phủ mờ + GC slit → không chèn Lật mặt Table 1 (cùng ĐK Table 2)
  const rGc = taoResult({
    input: {
      productType: 'tui',
      numColors: 4,
      quantity: 10000,
      hasMo: true,
      pricingMode: 'outsource',
      outsource: { steps: ['slit'] },
    },
  });
  const rowsGc = lapDongVatLieuNangCao(rGc, taoUniRows(), taoHangSo());
  assert(!rowsGc.some(r => r.congDoan === 'Lật mặt' || r.rowKey === 'matte'), 'GC slit → không Lật mặt Table 1');
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
  // Đủ 3 phụ kiện → gộp 1 dòng Làm túi: "Zipper + Băng keo + Quai"
  // Zipper NC = 9350×1×378 + tape 50k + handle 30k
  const r = taoResult({ zipperTotal: 800000, tapeTotal: 50000, handleTotal: 30000 });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const dongTui = rows.find(x => x.congDoan === 'Làm túi')!;
  eq(dongTui.vatLieu, 'Zipper + Băng keo + Quai', 'phụ kiện: gộp đủ 3 tên trên 1 dòng');
  approx(dongTui.thanhTienNVL!, 9350 * 378 + 50000 + 30000, 'làm túi: zipper NC + tape + quai engine');
  eq(rows.filter(x => x.rowKey === 'cut').length, 1, 'chỉ 1 dòng cut/Làm túi');
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
  assert(!rows.some(r => r.congDoan === 'Làm túi' || r.congDoan === 'làm túi'), 'màng: ẩn dòng Làm túi');
  assert(!rows.some(r => r.congDoan === 'chia'), 'màng: không có dòng chia');
}

{
  // Phụ kiện = 0 → Làm túi vẫn có, vật liệu "-", thành tiền 0
  const r0 = taoResult({ zipperTotal: 0, tapeTotal: 0, handleTotal: 0, input: { productType: 'tui', numColors: 4, quantity: 10000, hasZipper: false } });
  const rows = lapDongVatLieuNangCao(r0, taoUniRows(), taoHangSo());
  const dongTui = rows.find(r => r.congDoan === 'Làm túi')!;
  eq(dongTui.vatLieu, '-', 'không phụ kiện → vật liệu -');
  approx(dongTui.thanhTienNVL!, 0, 'không phụ kiện → thành tiền 0');
  approx(dongTui.dauVaoNVL!, 9350, 'vẫn giữ Đầu vào NVL');
}

{
  // Có chia N=2, khổ chia 0.3 → dòng Chia + Làm túi ĐV = TP Chia; zipper theo ĐV (đã ×N)
  const rN2 = taoResult({
    zipperTotal: 1,
    tapeTotal: 0,
    handleTotal: 0,
    structureText: 'MPET 12//LLDPE 60',
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasZipper: true,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.65,
    },
  });
  const rowsN2 = lapDongVatLieuNangCao(rN2, taoUniRows(), taoHangSo());
  eq(
    rowsN2.map(r => r.congDoan),
    ['In', 'GHÉP (Lớp 2)', 'Chia', 'Làm túi'],
    'có chia Table 1: In → ghép → Chia → Làm túi',
  );

  const dongChia = rowsN2.find(r => r.congDoan === 'Chia')!;
  eq(dongChia.rowKey, 'chia', 'Chia: rowKey chia');
  eq(dongChia.vatLieu, 'MPET 12//LLDPE 60', 'Chia: vật liệu = structureText');
  approx(dongChia.thanhPham!, 8420 * 2, 'Chia: TP = TP ghép × N');
  approx(dongChia.dauVaoNVL!, 8420 * 2, 'Chia: ĐV = TP');
  approx(dongChia.phiHao!, 0, 'Chia: phi hao = 0');
  approx(dongChia.khoMang!, 0.3, 'Chia: khoMang = khổ chia m');
  assert(String(dongChia.khoMangLabel ?? '').includes('→'), 'Chia: khổ label có mũi tên');
  approx(dongChia.giaNVL!, 0, 'Chia: giá NVL = 0');
  approx(dongChia.cpVatLieu!, 0, 'Chia: CP VL = 0');
  approx(dongChia.thanhTienNVL!, 0, 'Chia: TT NVL = 0');
  approx(dongChia.cpMucKeo!, 0, 'Chia: CP mực = 0');
  approx(dongChia.thanhTienMucKeo!, 0, 'Chia: TT mực = 0');

  const dongTuiN2 = rowsN2.find(r => r.congDoan === 'Làm túi')!;
  eq(dongTuiN2.vatLieu, 'Zipper', 'N=2: vật liệu Zipper');
  approx(dongTuiN2.dauVaoNVL!, 8420 * 2, 'Làm túi có chia: ĐV = TP Chia');
  approx(dongTuiN2.thanhPham!, 9070, 'Làm túi: TP = mét cắt engine');
  // phi hao = ĐV/3000×20 + 100 (cutWaste mặc định)
  approx(dongTuiN2.phiHao!, (8420 * 2) / 3000 * 20 + 100, 'Làm túi: phi hao = công thức cắt trên ĐV');
  approx(dongTuiN2.khoMang!, 0.3, 'Làm túi có chia: khổ = khổ chia');
  // ĐV đã = TP ghép × N → zipper = ĐV × giá (không nhân N lần nữa)
  approx(dongTuiN2.thanhTienNVL!, 8420 * 2 * 378, 'N=2: zipper = TP Chia × giá 378');

  const tongN2 = tinhTongNangCao(rowsN2, []);
  const tongKhongChia = tinhTongNangCao(rowsN2.filter(r => r.congDoan !== 'Chia'), []);
  approx(tongN2.tongVatLieu, tongKhongChia.tongVatLieu, 'Chia chi phí 0 → tổng VL không đổi');
}

{
  // Có chia + GC slit → không dòng Chia; Làm túi giữ logic cũ
  const rGc = taoResult({
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasZipper: false,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['slit'] },
    },
  });
  const rowsGc = lapDongVatLieuNangCao(rGc, taoUniRows(), taoHangSo());
  assert(!rowsGc.some(r => r.congDoan === 'Chia' || r.rowKey === 'chia'), 'GC slit → không Chia Table 1');
  const dongTui = rowsGc.find(r => r.congDoan === 'Làm túi')!;
  approx(dongTui.dauVaoNVL!, 9350, 'GC slit: Làm túi ĐV = TP+phi hao cắt');
  approx(dongTui.phiHao!, 280, 'GC slit: phi hao cắt engine');
}

{
  // Màng + có chia → có dòng Chia, không Làm túi
  const uniMang = taoUniRows().filter(r => r.rowKey !== 'cut');
  const rMangChia = taoResult({
    input: {
      productType: 'mang', numColors: 4, quantity: 10000,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
    },
    structureText: 'MPET 12//LLDPE 60',
    zipperTotal: 0, tapeTotal: 0, handleTotal: 0,
  });
  const rowsMang = lapDongVatLieuNangCao(rMangChia, uniMang, taoHangSo());
  assert(rowsMang.some(r => r.congDoan === 'Chia'), 'màng + chia → có dòng Chia');
  assert(!rowsMang.some(r => r.congDoan === 'Làm túi'), 'màng + chia → không Làm túi');
  const dongChiaM = rowsMang.find(r => r.congDoan === 'Chia')!;
  approx(dongChiaM.thanhPham!, 8420 * 2, 'màng chia: TP = TP ghép × N');
}

{
  // Nhiều phụ kiện → gộp 1 dòng Làm túi, cột Vật liệu liệt kê
  const rPk = taoResult({ zipperTotal: 1000000, tapeTotal: 500000, handleTotal: 300000 });
  const rows = lapDongVatLieuNangCao(rPk, taoUniRows(), taoHangSo());
  const dongTui = rows.find(r => r.congDoan === 'Làm túi')!;
  approx(dongTui.thanhTienNVL!, 9350 * 378 + 500000 + 300000, 'gộp zipper NC + tape + quai');
  assert(dongTui.vatLieu.includes('Zipper'), 'liệt kê Zipper');
  assert(dongTui.vatLieu.includes('Băng keo'), 'liệt kê Băng keo');
  assert(dongTui.vatLieu.includes('Quai'), 'liệt kê Quai');
  eq(rows.filter(r => r.rowKey === 'cut').length, 1, '1 dòng Làm túi duy nhất');
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
  eq(rows.map(r => r.congDoan), ['in', 'ghép', 'làm túi'], 'không Có chia → 3 dòng (không có chia)');

  // in: setup = 4 × 15 + 20 = 80 phút; chạy = 8420/150 = 56,13 phút
  // tổng = 136,13 phút (duyệt mẫu chỉ 1 lần, không nhân số màu)
  const dongIn = rows[0];
  approx(dongIn.thoiGianPhut!, 4 * 15 + 20 + 8420 / 150, 'in: thời gian SX');

  // điện in = 100 × 0.8 × 3000 / 60 = 4000 ₫/phút
  approx(dongIn.cpDienPerPhut!, 4000, 'in: 4000 ₫/phút điện');
  approx(dongIn.thanhTienDien, dongIn.thoiGianPhut! * 4000, 'in: thành tiền điện = phút × ₫/phút');
  approx(dongIn.thanhTienNhanCong, dongIn.thoiGianPhut! * dongIn.cpNhanCongPerPhut!, 'in: thành tiền NC');

  // NC/phút mới (bỏ ÷ tổngCN × CN1ca, tăng ca × tỉ lệ 50%, làm tròn nguyên):
  // in: TC = 900k ÷ 2 × 1 × 0.5 = 225.000 → (900k + 60k + 225k) ÷ 24 ÷ 60 = 822,92 → 823
  approx(dongIn.cpNhanCongPerPhut!, 823, 'in: 823 ₫/phút');
  // ghép: TC = 200.000 → (800k + 60k + 200k) ÷ 24 ÷ 60 = 736,11 → 736
  approx(rows[1].cpNhanCongPerPhut!, 736, 'ghép: 736 ₫/phút');
  // túi: TC = 150.000 → (600k + 60k + 150k) ÷ 24 ÷ 60 = 562,5 → 563; rounded 1000 → 1000
  approx(rows[2].cpNhanCongPerPhut!, 333, 'làm túi 3 máy: 1000 ÷ 3 = 333');

  // ghép: 1 lần → setup 10'; chạy 8770/100 = 87,7' → tổng 97,7'
  approx(rows[1].thoiGianPhut!, 10 + 8770 / 100, 'ghép: thời gian SX');
  approx(rows[1].cpDienPerPhut!, 50 * 0.8 * 3000 / 60, 'ghép: 2000 ₫/phút điện');

  // làm túi: 3 biên (90') · bước 0,4m → 60 m/phút; không chia → ×1
  // mét = cutMeters+cutWaste = 9070+280 = 9350
  approx(rows[2].thoiGianPhut!, 90 + 9350 / 60, 'làm túi không chia: met = 9350 ÷ 60');
  assert(
    Math.abs(rows[2].thoiGianPhut! - (90 + 8770 / 60)) > 1,
    'làm túi: TG ≠ setup + mét ghép cuối',
  );
  assert(
    Math.abs(rows[2].thoiGianPhut! - (90 + 10000 / 60)) > 1,
    'làm túi: TG ≠ setup + số túi÷cái/phút',
  );
  approx(rows[2].cpNhanCongPerPhut!, 333, 'làm túi 3 máy: 1000 ÷ 3 = 333');
}

{
  // Có chia (hasDivide) → thêm dòng "chia" sau "ghép": mét = đầu ra cuối ghép (lam[0].meters + waste = 8420+350 = 8770)
  const rChia = taoResult({
    input: {
      productType: 'tui',
      numColors: 4,
      quantity: 10000,
      bagType: '3bien',
      cutStep: 0.4,
      hasZipper: false,
      hasDivide: true,
    },
  });
  const rowsChia = lapDongNhanCongDien(rChia, taoHangSo());
  eq(rowsChia.map(r => r.congDoan), ['in', 'ghép', 'chia', 'làm túi'], 'Có chia → in, ghép, chia, làm túi');

  // Có ghép (1 lần ghép) → ưu tiên laminate_2 (20' setup, 145 m/phút), kể cả khi chất liệu có PET
  // metInChia = lamination[0].meters + lamination[0].waste = 8420 + 350 = 8770
  const dongChia = rowsChia[2];
  approx(dongChia.thoiGianPhut!, 20 + 8770 / 145, 'chia: metIn = đầu ra cuối ghép (TP + phi hao) + rule laminate_2');
  approx(dongChia.cpNhanCongPerPhut!, 736, 'chia: lương máy chia 736 ₫/phút');
  approx(dongChia.cpDienPerPhut!, 25 * 0.8 * 3000 / 60, 'chia: điện máy chia 1000 ₫/phút');
  approx(dongChia.thanhTienNhanCong, dongChia.thoiGianPhut! * 736, 'chia: thành tiền NC');
  approx(dongChia.thanhTienDien, dongChia.thoiGianPhut! * 1000, 'chia: thành tiền điện');

  // làm túi + có chia nhưng không set divideElements → ×1; mét gốc cut 9350
  const dongTuiChia = rowsChia[3];
  approx(dongTuiChia.thoiGianPhut!, 90 + 9350 / 60, 'làm túi + có chia N mặc định 1: met = 9350');
}

{
  // Có chia × số phần tử; quantity không ảnh hưởng
  const rN2 = taoResult({
    cutMeters: 25000,
    cutWaste: 267,
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, bagType: '3bien',
      cutStep: 0.5, hasZipper: false, hasDivide: true, divideElements: 2,
    },
  });
  const rN4 = taoResult({
    cutMeters: 25000,
    cutWaste: 267,
    input: {
      productType: 'tui', numColors: 4, quantity: 50000, bagType: '3bien',
      cutStep: 0.5, hasZipper: false, hasDivide: true, divideElements: 4,
    },
  });
  const rNoChia = taoResult({
    cutMeters: 25000,
    cutWaste: 267,
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, bagType: '3bien',
      cutStep: 0.5, hasZipper: false, hasDivide: false, divideElements: 4,
    },
  });
  const t2 = lapDongNhanCongDien(rN2, taoHangSo()).find(r => r.congDoan === 'làm túi')!;
  const t4 = lapDongNhanCongDien(rN4, taoHangSo()).find(r => r.congDoan === 'làm túi')!;
  const t0 = lapDongNhanCongDien(rNoChia, taoHangSo()).find(r => r.congDoan === 'làm túi')!;
  // bước 0,5m → 50 m/phút
  approx(t2.thoiGianPhut!, 90 + (25267 * 2) / 50, 'làm túi N=2: 90 + 50534/50');
  approx(t4.thoiGianPhut!, 90 + (25267 * 4) / 50, 'làm túi N=4: 90 + 101068/50');
  approx(t0.thoiGianPhut!, 90 + 25267 / 50, 'làm túi không chia: không × divideElements');
}

{
  // Có chia + 1 lớp (không ghép) + PET → mpet_pet; metInChia fallback = metIn (in) = 8420
  const rMotLop = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasDivide: true },
    layers: { print: {}, laminations: [], cut: {} },
  });
  const rowsMotLop = lapDongNhanCongDien(rMotLop, taoHangSo());
  // 1 lớp PET → mpet_pet; không ghép → metIn = printMeters + printWaste = 8000+420 = 8420
  approx(rowsMotLop[2].thoiGianPhut!, 20 + 8420 / 90, 'chia: 1 lớp PET, không ghép → metIn in → mpet_pet');
}

{
  // Có chia + OPP 1 lớp → rule opp_mattopp; không ghép → metIn = 8420
  const rOpp = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasDivide: true },
    structureText: 'BOPP 18',
    layers: { print: {}, laminations: [], cut: {} },
  });
  const rowsOpp = lapDongNhanCongDien(rOpp, taoHangSo());
  approx(rowsOpp[2].thoiGianPhut!, 30 + 8420 / 180, 'chia: 1 lớp OPP, không ghép → opp_mattopp (setup 30)');
}

{
  // Có chia + ≥2 lần ghép → lamination cuối (lam[1]) = 8770+300 = 9070 → laminate_3
  const r3Lop = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasDivide: true },
    layers: {
      print: {},
      laminations: [{ layerNum: 2, meters: 8420, waste: 350 }, { layerNum: 3, meters: 8770, waste: 300 }],
      cut: {},
    },
  });
  const rows3Lop = lapDongNhanCongDien(r3Lop, taoHangSo());
  approx(rows3Lop[2].thoiGianPhut!, 20 + 9070 / 90, 'chia: 2 lần ghép → metIn = lamination cuối');
}

{
  // Phủ mờ (hasMo) → in + 80 phút + thêm dòng "lật mặt" giữa in và ghép
  const rMo = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, metallicSurcharge: 200, hasMo: true } });
  const rowsMo = lapDongNhanCongDien(rMo, taoHangSo());
  approx(rowsMo[0].thoiGianPhut!, 4 * 15 + 20 + 8420 / 150 + 80, 'phủ mờ: in + 80 phút');
  eq(rowsMo.map(r => r.congDoan), ['in', 'lật mặt', 'ghép', 'làm túi'], 'phủ mờ → in, lật mặt, ghép, làm túi');

  // lật mặt: setup matte_flip 20' + Thành phẩm in ÷ 150 = 20 + 8000/150 ≈ 73,33 phút; NC/điện theo máy chia
  const dongLatMat = rowsMo[1];
  approx(dongLatMat.thoiGianPhut!, 20 + 8000 / 150, 'lật mặt: setup matte_flip + TP in ÷ tốc độ');
  approx(dongLatMat.cpNhanCongPerPhut!, 736, 'lật mặt: lương máy chia 736 ₫/phút');
  approx(dongLatMat.cpDienPerPhut!, 25 * 0.8 * 3000 / 60, 'lật mặt: điện máy chia 1000 ₫/phút');
  approx(dongLatMat.thanhTienNhanCong, dongLatMat.thoiGianPhut! * 736, 'lật mặt: thành tiền NC');
  approx(dongLatMat.thanhTienDien, dongLatMat.thoiGianPhut! * 1000, 'lật mặt: thành tiền điện');
}

{
  // Nhũ (hasNhu) KHÔNG cộng 80 phút
  const rNhu = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, metallicSurcharge: 200, hasNhu: true } });
  const rowsNhu = lapDongNhanCongDien(rNhu, taoHangSo());
  approx(rowsNhu[0].thoiGianPhut!, 4 * 15 + 20 + 8420 / 150, 'nhũ: không +80 phút');
  eq(rowsNhu.map(r => r.congDoan), ['in', 'ghép', 'làm túi'], 'nhũ không Có chia → không có dòng chia');
}

{
  // Làm túi nhiều máy: rounded 1000, machinesPerDay 2 → 500 ₫/phút
  const rMay = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000 } });
  const rows = lapDongNhanCongDien(rMay, taoHangSo({
    cpsxUpgradeLabor: {
      ...labor,
      bag: { ...labor.bag, machinesPerDay: 2 },
    } as CpsxUpgradeLabor,
  }));
  const dongTui = rows.find((r) => r.congDoan === 'làm túi');
  approx(dongTui!.cpNhanCongPerPhut!, 500, 'làm túi 2 máy: 1000 ÷ 2 = 500');
}

{
  // Màng: ẩn dòng làm túi; không Có chia → không có dòng chia
  const rMang = taoResult({ input: { productType: 'mang', numColors: 4, quantity: 10000 } });
  const rows = lapDongNhanCongDien(rMang, taoHangSo());
  eq(rows.map(r => r.congDoan), ['in', 'ghép'], 'màng: in + ghép, không làm túi, không chia');
}

{
  // Màng + Có chia → có dòng chia sau ghép (mặc định 1 lần ghép, lamination[0].meters+waste=8770)
  const rMangChia = taoResult({ input: { productType: 'mang', numColors: 4, quantity: 10000, hasDivide: true } });
  const rows = lapDongNhanCongDien(rMangChia, taoHangSo());
  eq(rows.map(r => r.congDoan), ['in', 'ghép', 'chia'], 'màng + Có chia → in, ghép, chia');
  approx(rows[2].thoiGianPhut!, 20 + 8770 / 145, 'màng chia: metIn = lamination cuối (8770) → laminate_2');

  // Màng 1 lớp (không ghép) + Có chia → metIn = đầu vào in, rule theo chất liệu
  const rMang1lop = taoResult({
    input: { productType: 'mang', numColors: 4, quantity: 10000, hasDivide: true },
    layers: { print: {}, laminations: [], cut: {} },
  });
  const rows1lop = lapDongNhanCongDien(rMang1lop, taoHangSo());
  approx(rows1lop[2].thoiGianPhut!, 20 + 8420 / 90, 'màng 1 lớp (không ghép) → metIn in → mpet_pet');
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

// ── 8. Ghi đè Sale/Admin — Bảng đặc tả nâng cao ─────────────────────────────

{
  // 8.1 cpMucKeoPerM2 ghi đè tay (dòng in)
  const ov: OverrideTable = { print: { cpMucKeoPerM2: 999 } };
  const dong = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo(), [], ov);
  const dongIn = dong.find(d => d.congDoan === 'In' || d.congDoan === 'CPSX IN')!;
  approx(dongIn.cpMucKeo!, 999, 'in: ghi đè cpMucKeoPerM2');
  const dongGhep = dong.find(d => d.congDoan === 'GHÉP (Lớp 2)')!;
  approx(dongGhep.cpMucKeo!, 420, 'ghép: keo giữ nguyên mặc định 420');
}

{
  // 8.2 cpMucKeoPerM2 trên dòng ghép tách nhiều vật liệu (materialDetails)
  const uni = taoUniRows();
  uni[1] = { ...uni[1], materialDetails: [
    { name: 'LLDPE 60', width: 0.4, matPrice: 144, costMat: 500000 },
    { name: 'LLDPE 30', width: 0.25, matPrice: 72, costMat: 200000 },
  ] };
  const ov: OverrideTable = { 'lam-2': { cpMucKeoPerM2: 555 } };
  const dong = lapDongVatLieuNangCao(taoResult(), uni, taoHangSo(), [], ov);
  const dongGhep = dong.filter(d => d.congDoan === 'GHÉP (Lớp 2)' || (d.congDoan === '' && d.vatLieu === 'LLDPE 30'));
  eq(dongGhep.length, 2, 'ghép: tách 2 dòng chi tiết');
  dongGhep.forEach(d => approx(d.cpMucKeo!, 555, 'ghép chi tiết: ghi đè cpMucKeoPerM2 áp cả 2 dòng'));
}

{
  // 8.3 lan truyền waste qua xuLyDongGhiDe → dòng in tự cập nhật (concept cũ)
  const ov: OverrideTable = { cut: { waste: 500 } };
  const { rows } = xuLyDongGhiDe(taoUniRows(), {}, ov);
  const dongInXl = rows.find(r => r.rowKey === 'print')!;
  eq(dongInXl.meters, 9920, 'in: TP lan truyền = cut.inputVL (9070+500) → lam-2.inputVL (9570+350)');
  const dong = lapDongVatLieuNangCao(taoResult(), rows, taoHangSo());
  const dongInNC = dong.find(d => d.congDoan === 'In' || d.congDoan === 'CPSX IN')!;
  eq(dongInNC.thanhPham, 9920, 'in: bảng nâng cao hiện TP đã lan truyền');
  eq(dongInNC.dauVaoNVL, 10340, 'in: đầu vào NVL = 9920 + 420');
}

{
  // 8.4 thoiGianPhut / cpNhanCongPerPhut / cpDienPerPhut ghi đè tay (Bảng 2)
  const ov: OverrideTable = { print: { thoiGianPhut: 50, cpNhanCongPerPhut: 31000, cpDienPerPhut: 5000 } };
  const dong = lapDongNhanCongDien(taoResult(), taoHangSo(), ov);
  const dongIn = dong.find(d => d.congDoan === 'in')!;
  eq(dongIn.thoiGianPhut, 50, 'in: TG SX ghi đè');
  eq(dongIn.cpNhanCongPerPhut, 31000, 'in: CP NC ghi đè');
  eq(dongIn.cpDienPerPhut, 5000, 'in: CP điện ghi đè');
  eq(dongIn.thanhTienNhanCong, 1550000, 'in: thành tiền NC = 50×31000');
  eq(dongIn.thanhTienDien, 250000, 'in: thành tiền điện = 50×5000');
}

{
  // 8.5 thoiGianPhut cho làm túi (rowKey cut) + chia (rowKey chia)
  const ov: OverrideTable = { cut: { thoiGianPhut: 200 } };
  const dong = lapDongNhanCongDien(taoResult(), taoHangSo(), ov);
  const dongTui = dong.find(d => d.congDoan === 'làm túi')!;
  eq(dongTui.thoiGianPhut, 200, 'làm túi: TG SX ghi đè');

  const ovChia: OverrideTable = { chia: { thoiGianPhut: 15 } };
  const rCoChia = taoResult({ input: { ...taoResult().input, hasDivide: true } });
  const dongChia = lapDongNhanCongDien(rCoChia, taoHangSo(), ovChia);
  const dongChiaRow = dongChia.find(d => d.congDoan === 'chia')!;
  eq(dongChiaRow.thoiGianPhut, 15, 'chia: TG SX ghi đè');
}

{
  // 8.6 ghép gộp nhiều lớp — override lam-3 thắng khi lam-2 không có
  const r3lop = taoResult({ layers: { print: {}, laminations: [
    { layerNum: 2, meters: 8420, waste: 350 },
    { layerNum: 3, meters: 8770, waste: 300 },
  ], cut: {} } });
  const ov: OverrideTable = { 'lam-3': { thoiGianPhut: 45 } };
  const dong = lapDongNhanCongDien(r3lop, taoHangSo(), ov);
  const dongGhep = dong.find(d => d.congDoan === 'ghép')!;
  eq(dongGhep.thoiGianPhut, 45, 'ghép: ghi đè từ lam-3');
  eq(dongGhep.rowKey, 'lam-3', 'ghép: rowKey hiệu lực = lam-3');
}

console.log(`✓ dac-ta-nang-cao: ${soTest} assertions passed`);
