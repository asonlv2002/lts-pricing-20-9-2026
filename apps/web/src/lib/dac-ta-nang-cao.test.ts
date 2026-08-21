// Test cho lib/dac-ta-nang-cao.ts — Đặc tả kỹ thuật & nguyên liệu (nâng cao)
// Chạy: pnpm --filter web exec tsx src/lib/dac-ta-nang-cao.test.ts
import {
  chonNhomMuc,
  chuanBiUniRowsNangCao,
  chuanHoaMetCatUniRows,
  tinhCpMucDungMoiIn,
  tinhCpKeoDungMoiGhep,
  lapDongVatLieuNangCao,
  lapDongNhanCongDien,
  tinhTongNangCao,
  ghepCauTrucTuDongVatLieu,
  layLanNguocMetTuResult,
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
      { key: 'le_200', label: '0 – 200 mm', minStepMm: 0, maxStepMm: 200, speedMPerMin: 80 },
      { key: '200_300', label: '200 – 300 mm', minStepMm: 200, maxStepMm: 300, speedMPerMin: 70 },
      { key: '300_400', label: '300 – 400 mm', minStepMm: 300, maxStepMm: 400, speedMPerMin: 60 },
      { key: '400_550', label: '400 – 550 mm', minStepMm: 400, maxStepMm: 550, speedMPerMin: 50 },
      { key: 'gt_550', label: '550 – 9999999 mm', minStepMm: 550, maxStepMm: 9_999_999, speedMPerMin: 20 },
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
  // Tỉ lệ phủ 50% = nửa giá 100% (mực + dung môi)
  // 4 màu PET 100% = 1640 → 50% = 820
  const r = tinhCpMucDungMoiIn(4, 'MPET 12', ink, 0.5);
  approx(r.donGia, 820, '4 màu MPET + phủ 50% → 820 ₫/m²');
  eq(r.tyLePhuMuc, 0.5, 'trả về tyLePhuMuc 0.5');
}

{
  // 2 màu OPP 100% = 720 → 50% = 360
  const r = tinhCpMucDungMoiIn(2, 'BOPP 18', ink, 0.5);
  approx(r.donGia, 360, '2 màu BOPP + phủ 50% → 360 ₫/m²');
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
  // clamp 0 → 0
  approx(rAm.donGia, 0, 'tyLe âm → clamp 0 → 0 ₫/m²');
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
  // TP neo = 10000×0.4÷1 = 4000; PH = 4000/3000×20+100; ĐV = TP+PH; zipper = ĐV×378
  const tpTui = 10000 * 0.4;
  const phTui = tpTui / 3000 * 20 + 100;
  const dvTui = tpTui + phTui;
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
  approx(dongTui.thanhPham!, tpTui, 'làm túi: TP = SL × bước cắt ÷ hình');
  approx(dongTui.phiHao!, phTui, 'làm túi: PH = định mức trên TP');
  approx(dongTui.dauVaoNVL!, dvTui, 'làm túi: ĐV = TP + PH');
  approx(dongTui.thanhTienNVL!, dvTui * 378, 'làm túi: Đầu vào × giá zipper 378');
  eq(dongTui.cpMucKeo, null, 'làm túi: mực/keo = null');
  eq(dongTui.giaNVL, null, 'làm túi: giá NVL kg = null');
  assert(!rows.some(r => r.congDoan === '' && r.vatLieu?.includes('Zipper')), 'không còn dòng Zipper tách');
}

{
  // coverageRatio 50% từ input → dòng in = nửa giá 100%
  const r50 = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000, coverageRatio: 0.5 } });
  const rows50 = lapDongVatLieuNangCao(r50, taoUniRows(), taoHangSo());
  approx(rows50[0].cpMucKeo!, 820, 'phủ 50% → dòng in 820 ₫/m² (1640 ÷ 2)');
  approx(rows50[0].thanhTienMucKeo!, 820 * 8420 * 0.65, 'phủ 50% → thành tiền theo 820 ₫/m²');
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
  // Phủ mờ + chỉ GC slit (không GC matte) → vẫn hiện Lật mặt Table 1
  // (Lật mặt chỉ ẩn khi user tick 'matte' trong steps, không phụ thuộc slit)
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
  assert(rowsGc.some(r => r.congDoan === 'Lật mặt' || r.rowKey === 'matte'), 'chỉ GC slit: vẫn hiện Lật mặt Table 1');
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
  const tpTui = 10000 * 0.4;
  const dvTui = tpTui + tpTui / 3000 * 20 + 100;
  const r = taoResult({ zipperTotal: 800000, tapeTotal: 50000, handleTotal: 30000 });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const dongTui = rows.find(x => x.congDoan === 'Làm túi')!;
  eq(dongTui.vatLieu, 'Zipper + Băng keo + Quai', 'phụ kiện: gộp đủ 3 tên trên 1 dòng');
  approx(dongTui.thanhTienNVL!, dvTui * 378 + 50000 + 30000, 'làm túi: zipper NC + tape + quai engine');
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
  const tpTui = 10000 * 0.4;
  const dvTui = tpTui + tpTui / 3000 * 20 + 100;
  const r0 = taoResult({ zipperTotal: 0, tapeTotal: 0, handleTotal: 0, input: { productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, hasZipper: false } });
  const rows = lapDongVatLieuNangCao(r0, taoUniRows(), taoHangSo());
  const dongTui = rows.find(r => r.congDoan === 'Làm túi')!;
  eq(dongTui.vatLieu, '-', 'không phụ kiện → vật liệu -');
  approx(dongTui.thanhTienNVL!, 0, 'không phụ kiện → thành tiền 0');
  approx(dongTui.dauVaoNVL!, dvTui, 'ĐV = TP neo + PH định mức');
}

{
  // Có chia N=2: Làm túi neo (SL×bước)÷N; Chia TP = ĐV túi; ĐV Chia = TP/N
  const tpTui = (10000 * 0.4) / 2;
  const phTui = tpTui / 3000 * 20 + 100;
  const dvTui = tpTui + phTui;
  const rN2 = taoResult({
    zipperTotal: 1,
    tapeTotal: 0,
    handleTotal: 0,
    structureText: 'MPET 12//LLDPE 60',
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, hasZipper: true,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.65,
    },
  });
  const rowsN2 = lapDongVatLieuNangCao(rN2, taoUniRows(), taoHangSo());
  eq(
    rowsN2.map(r => r.congDoan),
    ['In', 'GHÉP (Lớp 2)', 'Chia', 'Làm túi'],
    'có chia Table 1: In → ghép → Chia → Làm túi',
  );

  const dongTuiN2 = rowsN2.find(r => r.congDoan === 'Làm túi')!;
  eq(dongTuiN2.vatLieu, 'Zipper', 'N=2: vật liệu Zipper');
  approx(dongTuiN2.thanhPham!, tpTui, 'Làm túi có chia: TP = SL×bước÷N');
  approx(dongTuiN2.phiHao!, phTui, 'Làm túi: PH = định mức trên TP');
  approx(dongTuiN2.dauVaoNVL!, dvTui, 'Làm túi: ĐV = TP + PH');
  approx(dongTuiN2.khoMang!, 0.3, 'Làm túi có chia: khổ = khổ chia');
  approx(dongTuiN2.thanhTienNVL!, dvTui * 378, 'N=2: zipper = ĐV × giá 378');

  const dongChia = rowsN2.find(r => r.congDoan === 'Chia')!;
  eq(dongChia.rowKey, 'chia', 'Chia: rowKey chia');
  eq(dongChia.vatLieu, 'MPET 12//LLDPE 60', 'Chia: vật liệu = structureText');
  approx(dongChia.thanhPham!, dvTui, 'Chia: TP = ĐV Làm túi');
  approx(dongChia.dauVaoNVL!, dvTui / 2, 'Chia: ĐV = TP Chia / N');
  approx(dongChia.phiHao!, 0, 'Chia: phi hao = 0');
  approx(dongChia.khoMang!, 0.3, 'Chia: khoMang = khổ chia m');
  assert(String(dongChia.khoMangLabel ?? '').includes('→'), 'Chia: khổ label có mũi tên');
  assert(
    String(dongChia.dauVaoNvlLabel ?? '').includes('(0,650)') || String(dongChia.dauVaoNvlLabel ?? '').includes('(0.650)'),
    'Chia: ĐV label kèm khổ trước',
  );
  assert(
    String(dongChia.thanhPhamLabel ?? '').includes('(0,300)') || String(dongChia.thanhPhamLabel ?? '').includes('(0.300)'),
    'Chia: TP label kèm khổ chia',
  );
  assert(String(dongChia.dauVaoNvlLabel ?? '').includes('\n('), 'Chia: ĐV label khổ xuống hàng sau mét');
  assert(String(dongChia.thanhPhamLabel ?? '').includes('\n('), 'Chia: TP label khổ xuống hàng sau mét');
  approx(dongChia.giaNVL!, 0, 'Chia: giá NVL = 0');
  approx(dongChia.cpVatLieu!, 0, 'Chia: CP VL = 0');
  approx(dongChia.thanhTienNVL!, 0, 'Chia: TT NVL = 0');
  approx(dongChia.cpMucKeo!, 0, 'Chia: CP mực = 0');
  approx(dongChia.thanhTienMucKeo!, 0, 'Chia: TT mực = 0');

  const tongN2 = tinhTongNangCao(rowsN2, []);
  const tongKhongChia = tinhTongNangCao(rowsN2.filter(r => r.congDoan !== 'Chia'), []);
  approx(tongN2.tongVatLieu, tongKhongChia.tongVatLieu, 'Chia chi phí 0 → tổng VL không đổi');
}

{
  // Có chia + numImages>1 → vẫn ÷N (không ÷ hình)
  const rChiaHinh = taoResult({
    zipperTotal: 0, tapeTotal: 0, handleTotal: 0,
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, numImages: 2,
      hasZipper: false, hasDivide: true, divideElements: 2, divideWidthMm: 300,
    },
  });
  const dongTuiHinh = lapDongVatLieuNangCao(rChiaHinh, taoUniRows(), taoHangSo())
    .find(r => r.congDoan === 'Làm túi')!;
  approx(dongTuiHinh.thanhPham!, (10000 * 0.4) / 2, 'có chia + 2 hình: TP = SL×bước÷N (không ÷ hình)');
}

{
  // Có chia + GC slit → dòng Chia GC; Làm túi neo (SL×bước)÷N
  const tpTui = (10000 * 0.4) / 2;
  const phTui = tpTui / 3000 * 20 + 100;
  const rGc = taoResult({
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, hasZipper: false,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['slit'] },
    },
  });
  const rowsGc = lapDongVatLieuNangCao(rGc, taoUniRows(), taoHangSo());
  // Sau fix: dòng Chia LUÔN hiện khi coChia (dù GC hay không) + isGiaCongNgoai=true khi slit GC
  const dongChiaGc = rowsGc.find(r => r.congDoan === 'Chia' || r.rowKey === 'chia')!;
  assert(dongChiaGc != null, 'GC slit: dòng Chia HIỆN (chỉ có isGiaCongNgoai=true)');
  assert(dongChiaGc.isGiaCongNgoai === true, 'GC slit: dòng Chia có isGiaCongNgoai=true');
  const dongTui = rowsGc.find(r => r.congDoan === 'Làm túi')!;
  approx(dongTui.thanhPham!, tpTui, 'GC slit: TP = SL×bước÷N');
  approx(dongTui.dauVaoNVL!, tpTui + phTui, 'GC slit: ĐV = TP+PH');
  approx(dongTui.phiHao!, phTui, 'GC slit: PH định mức trên TP');
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
  const tpTui = 10000 * 0.4;
  const dvTui = tpTui + tpTui / 3000 * 20 + 100;
  const rPk = taoResult({ zipperTotal: 1000000, tapeTotal: 500000, handleTotal: 300000 });
  const rows = lapDongVatLieuNangCao(rPk, taoUniRows(), taoHangSo());
  const dongTui = rows.find(r => r.congDoan === 'Làm túi')!;
  approx(dongTui.thanhTienNVL!, dvTui * 378 + 500000 + 300000, 'gộp zipper NC + tape + quai');
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
  // túi: TC = 150.000 → (600k + 60k + 150k) ÷ 24 ÷ 60 = 562,5 → 563; rounded 1000 → 1000 (không ÷ máy)
  approx(rows[2].cpNhanCongPerPhut!, 1000, 'làm túi: rounded 1000 (không chia máy)');

  // ghép: 1 lần → setup 10'; chạy 8770/100 = 87,7' → tổng 97,7'
  approx(rows[1].thoiGianPhut!, 10 + 8770 / 100, 'ghép: thời gian SX');
  approx(rows[1].cpDienPerPhut!, 50 * 0.8 * 3000 / 60, 'ghép: 2000 ₫/phút điện');

  // làm túi: 3 biên (90') · bước 0,4m → 60 m/phút
  // mét = TP neo 4000 + PH (4000/3000×20+100)
  const metTuiNeo = 4000 + 4000 / 3000 * 20 + 100;
  approx(rows[2].thoiGianPhut!, 90 + metTuiNeo / 60, 'làm túi: met = TP neo + PH');
  assert(
    Math.abs(rows[2].thoiGianPhut! - (90 + 8770 / 60)) > 1,
    'làm túi: TG ≠ setup + mét ghép cuối',
  );
  assert(
    Math.abs(rows[2].thoiGianPhut! - (90 + 10000 / 60)) > 1,
    'làm túi: TG ≠ setup + số túi÷cái/phút',
  );
  approx(rows[2].cpNhanCongPerPhut!, 1000, 'làm túi: rounded 1000 (không chia máy)');
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
      divideElements: 2,
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

  // làm túi + có chia N=2: met = (SL×bước)÷N + PH
  const metTuiNeo = 2000 + 2000 / 3000 * 20 + 100;
  const dongTuiChia = rowsChia[3];
  approx(dongTuiChia.thoiGianPhut!, 90 + metTuiNeo / 60, 'làm túi + có chia: met = TP÷N + PH');
}

{
  // Mét túi = TP neo (SL×bước÷N khi chia) + PH; SL/N khác → met khác
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
  // bước 0,5m → 50 m/phút; có chia TP = qty×0.5÷N; không chia TP = qty×0.5
  const met10kChia2 = (10000 * 0.5) / 2 + ((10000 * 0.5) / 2) / 3000 * 20 + 100;
  const met50kChia4 = (50000 * 0.5) / 4 + ((50000 * 0.5) / 4) / 3000 * 20 + 100;
  const met10kNoChia = 10000 * 0.5 + (10000 * 0.5) / 3000 * 20 + 100;
  approx(t2.thoiGianPhut!, 90 + met10kChia2 / 50, 'làm túi N=2: met = (SL×bước)÷2 + PH');
  approx(t4.thoiGianPhut!, 90 + met50kChia4 / 50, 'làm túi SL 50k N=4: met = (SL×bước)÷4 + PH');
  approx(t0.thoiGianPhut!, 90 + met10kNoChia / 50, 'làm túi không chia: met = SL×bước + PH');
  assert(t2.thoiGianPhut! < t0.thoiGianPhut!, 'có chia N=2 → mét túi nhỏ hơn không chia (cùng SL)');
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
  // Làm túi: machinesPerDay không còn chia vào giá NC — rounded 1000 giữ 1000
  const rMay = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000 } });
  const rows = lapDongNhanCongDien(rMay, taoHangSo({
    cpsxUpgradeLabor: {
      ...labor,
      bag: { ...labor.bag, machinesPerDay: 2 },
    } as CpsxUpgradeLabor,
  }));
  const dongTui = rows.find((r) => r.congDoan === 'làm túi');
  approx(dongTui!.cpNhanCongPerPhut!, 1000, 'làm túi machinesPerDay=2: vẫn 1000 (không chia)');
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
  const dong = lapDongVatLieuNangCao(taoResult(), rows, taoHangSo(), [], ov);
  const dongInNC = dong.find(d => d.congDoan === 'In' || d.congDoan === 'CPSX IN')!;
  eq(dongInNC.thanhPham, 9920, 'in: bảng nâng cao hiện TP đã lan truyền');
  eq(dongInNC.dauVaoNVL, 10340, 'in: đầu vào NVL = 9920 + 420');
  // Làm túi: ghi đè waste=500; TP vẫn neo SL×bước (không lấy uni.meters cut cũ)
  const dongTui = dong.find(d => d.congDoan === 'Làm túi')!;
  approx(dongTui.thanhPham!, 4000, 'làm túi + ov waste: TP vẫn = SL×bước');
  approx(dongTui.phiHao!, 500, 'làm túi + ov waste: PH = 500');
  approx(dongTui.dauVaoNVL!, 4500, 'làm túi + ov waste: ĐV = 4000+500');
}

{
  // 8.3b ghi đè TP làm túi → TP tay thắng neo
  const ov: OverrideTable = { cut: { meters: 5000 } };
  const dong = lapDongVatLieuNangCao(taoResult(), taoUniRows(), taoHangSo(), [], ov);
  const dongTui = dong.find(d => d.congDoan === 'Làm túi')!;
  approx(dongTui.thanhPham!, 5000, 'ov meters: TP = 5000');
  const ph = 5000 / 3000 * 20 + 100;
  approx(dongTui.phiHao!, ph, 'ov meters: PH định mức trên TP tay');
  approx(dongTui.dauVaoNVL!, 5000 + ph, 'ov meters: ĐV = TP+PH');
}

{
  // 8.3c có chia N=2: ghi đè TP túi 40000 → lan ÷N (không 80k)
  const ph40 = 40000 / 3000 * 20 + 100;
  const rChia = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, hasZipper: false,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.65, hasMo: true,
    },
    zipperTotal: 0, tapeTotal: 0, handleTotal: 0,
  });
  // Chỉ ov meters — PH phải tính lại trên 40000 (chuanHoa nhận overrides)
  const ovChiTp: OverrideTable = { cut: { meters: 40000 } };
  const uniBase = chuanHoaMetCatUniRows(taoUniRows(), rChia, taoHangSo(), ovChiTp);
  const { rows: uniLan2 } = xuLyDongGhiDe(
    uniBase, {}, ovChiTp, undefined,
    { hasDivide: true, divideElements: 2 },
  );
  const cut2 = uniLan2.find(r => r.rowKey === 'cut')!;
  const ghep2 = uniLan2.find(r => r.rowKey === 'lam-2')!;
  const in2 = uniLan2.find(r => r.rowKey === 'print')!;
  approx(cut2.meters, 40000, 'chia lan: cut TP=40000');
  approx(cut2.waste, ph40, 'chia lan: PH tự tính trên TP 40k (chỉ ov meters)');
  approx(cut2.inputVL, 40000 + ph40, 'chia lan: cut ĐV=TP+PH');
  approx(ghep2.meters, (40000 + ph40) / 2, 'chia lan: TP ghép = ĐV túi ÷ 2');
  approx(in2.meters, ghep2.meters + ghep2.waste, 'chia lan: TP in = ĐV ghép');
  assert(ghep2.meters < 25000, 'chia lan: ghép không ~40k (không lan 1:1)');

  const dong = lapDongVatLieuNangCao(rChia, uniLan2, taoHangSo(), [], ovChiTp);
  const dongTui = dong.find(d => d.congDoan === 'Làm túi')!;
  const dongGhep = dong.find(d => d.congDoan === 'GHÉP (Lớp 2)' || d.rowKey === 'lam-2')!;
  const dongChia = dong.find(d => d.congDoan === 'Chia')!;
  const dongIn = dong.find(d => d.congDoan === 'In' || d.congDoan === 'CPSX IN')!;
  const dongLat = dong.find(d => d.congDoan === 'Lật mặt')!;
  approx(dongTui.thanhPham!, 40000, 'NC: túi TP=40000');
  approx(dongTui.dauVaoNVL!, 40000 + ph40, 'NC: túi ĐV');
  approx(dongGhep.thanhPham!, (40000 + ph40) / 2, 'NC: ghép TP = ĐV túi ÷ 2');
  approx(dongChia.thanhPham!, dongTui.dauVaoNVL!, 'NC: Chia TP = ĐV Làm túi');
  approx(dongChia.dauVaoNVL!, Number(dongTui.dauVaoNVL) / 2, 'NC: Chia ĐV = TP Chia / N');
  assert(dongChia.thanhPham! < 50000, 'NC: Chia TP không ~80k');
  // In.TP = Đầu vào ghép; Lật mặt = Đầu vào ghép
  approx(dongIn.thanhPham!, dongGhep.dauVaoNVL!, 'NC: In TP = Đầu vào ghép');
  approx(dongLat.thanhPham!, dongGhep.dauVaoNVL!, 'NC: Lật mặt TP = Đầu vào ghép');
  approx(dongLat.dauVaoNVL!, dongGhep.dauVaoNVL!, 'NC: Lật mặt ĐV = Đầu vào ghép');
  approx(dongLat.phiHao!, 0, 'NC: Lật mặt PH=0');
}

{
  // 8.3d có chia + chỉ đổi VL (không ✎ mét túi) → vẫn neo cut + lan ÷N
  const rChia = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, cutStep: 0.4, hasZipper: false,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.65,
    },
    zipperTotal: 0, tapeTotal: 0, handleTotal: 0,
  });
  const ovVl: OverrideTable = { print: { materialId: 'PA15', mat: 'PA 15 mic' } };
  const uniOv = chuanBiUniRowsNangCao({
    uniRows: taoUniRows(),
    result: rChia,
    hangSo: taoHangSo(),
    activeOv: ovVl,
  });
  const tpTui = (10000 * 0.4) / 2;
  const phTui = tpTui / 3000 * 20 + 100;
  const dvTui = tpTui + phTui;
  const ghep = uniOv.find(r => r.rowKey === 'lam-2')!;
  const inn = uniOv.find(r => r.rowKey === 'print')!;
  approx(ghep.meters, dvTui / 2, 'chỉ đổi VL + chia: TP ghép = ĐV túi ÷ N');
  approx(inn.meters, ghep.meters + ghep.waste, 'chỉ đổi VL + chia: TP in = ĐV ghép');

  const dong = lapDongVatLieuNangCao(rChia, uniOv, taoHangSo(), [], ovVl);
  const dongGhep = dong.find(d => d.rowKey === 'lam-2' && d.congDoan !== '')!;
  const dongChia = dong.find(d => d.congDoan === 'Chia')!;
  const dongTui = dong.find(d => d.congDoan === 'Làm túi')!;
  approx(dongTui.thanhPham!, tpTui, 'NC chỉ VL: túi neo SL×bước÷N');
  approx(dongTui.dauVaoNVL!, dvTui, 'NC chỉ VL: ĐV túi');
  approx(dongChia.thanhPham!, dvTui, 'NC chỉ VL: Chia TP = ĐV túi');
  approx(dongChia.dauVaoNVL!, dvTui / 2, 'NC chỉ VL: Chia ĐV = TP/N');
  approx(dongGhep.thanhPham!, dvTui / 2, 'NC chỉ VL: ghép TP = ĐV Chia');
  approx(dongGhep.thanhPham!, dongChia.dauVaoNVL!, 'NC chỉ VL: ghép TP === Chia ĐV');
}

{
  // 8.3e có chia, không override → vẫn lan ÷N (mặc định bảng NC)
  const rChia = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 100000, cutStep: 0.25, hasZipper: false,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.62,
    },
    zipperTotal: 0, tapeTotal: 0, handleTotal: 0,
  });
  const uni = chuanBiUniRowsNangCao({
    uniRows: taoUniRows(),
    result: rChia,
    hangSo: taoHangSo(),
  });
  const tpTui = (100000 * 0.25) / 2;
  const phTui = tpTui / 3000 * 20 + 100;
  const dvTui = tpTui + phTui;
  const dong = lapDongVatLieuNangCao(rChia, uni, taoHangSo());
  const dongTui = dong.find(d => d.congDoan === 'Làm túi')!;
  const dongChia = dong.find(d => d.congDoan === 'Chia')!;
  const dongGhep = dong.find(d => d.rowKey === 'lam-2' && d.congDoan !== '')!;
  approx(dongTui.thanhPham!, tpTui, 'mặc định chia: TP túi = SL×bước÷N');
  approx(dongTui.dauVaoNVL!, dvTui, 'mặc định chia: ĐV túi');
  approx(dongChia.thanhPham!, dvTui, 'mặc định chia: Chia TP = ĐV túi');
  approx(dongChia.dauVaoNVL!, dvTui / 2, 'mặc định chia: Chia ĐV = TP/N');
  approx(dongGhep.thanhPham!, dvTui / 2, 'mặc định chia: Ghép TP = ĐV Chia');
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

// ── 9. Đổi vật liệu lớp In — Lật mặt / Chia / mực theo VL hiệu lực ───────────

{
  // 9.1 PA → PET: Lật mặt + Chia nhãn theo override; mực PET
  const r = taoResult({
    structureText: 'PA 15//LLDPE thường',
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      hasMo: true, metallicSurcharge: 0,
      hasDivide: true, divideElements: 2, divideWidthMm: 300, spreadWidth: 0.65,
      coverageRatio: 1,
    },
  });
  const uni = taoUniRows();
  uni[0] = { ...uni[0], rowKey: 'print', mat: 'PA 15', materialId: 'PA15' };
  uni[1] = { ...uni[1], mat: 'LLDPE thường', materialId: 'LLDPE' };
  const ov: OverrideTable = {
    print: { materialId: 'PET12', mat: 'PET 12', matPrice: 50, rawMatPrice: 45000 },
  };
  const { rows: dongOv } = xuLyDongGhiDe(uni, {}, ov);
  const rows = lapDongVatLieuNangCao(r, dongOv, taoHangSo(), [], ov);

  const dongIn = rows.find(x => x.rowKey === 'print' && x.congDoan === 'In')!;
  eq(dongIn.vatLieu, 'PET 12', 'In override: vatLieu PET 12');

  const lat = rows.find(x => x.rowKey === 'matte')!;
  eq(lat.vatLieu, 'PET 12', 'Lật mặt copy VL In sau override');
  eq(lat.materialId, 'PET12', 'Lật mặt materialId = In');

  const chia = rows.find(x => x.rowKey === 'chia')!;
  assert(String(chia.vatLieu).includes('PET 12'), 'Chia chứa PET 12');
  assert(!String(chia.vatLieu).includes('PA'), 'Chia không còn PA');
  eq(chia.vatLieu, 'PET 12//LLDPE thường', 'Chia = cấu trúc hiệu lực');

  const mucPet = tinhCpMucDungMoiIn(4, 'PET 12', ink, 1).donGia;
  approx(dongIn.cpMucKeo!, mucPet, 'In: mực theo PET sau đổi VL');
}

{
  // 9.2 In → BOPP 18: nhóm mực OPP auto (không cần cpMucKeoPerM2)
  const r = taoResult({
    structureText: 'PET 12//LLDPE 60',
    input: { productType: 'tui', numColors: 4, quantity: 10000, coverageRatio: 1 },
  });
  const uni = taoUniRows();
  uni[0] = { ...uni[0], rowKey: 'print', mat: 'PET 12', materialId: 'PET12' };
  const ov: OverrideTable = {
    print: { materialId: 'BOPP18', mat: 'BOPP 18' },
  };
  const { rows: dongOv } = xuLyDongGhiDe(uni, {}, ov);
  const rows = lapDongVatLieuNangCao(r, dongOv, taoHangSo(), [], ov);
  const dongIn = rows.find(x => x.rowKey === 'print')!;
  const mucOpp = tinhCpMucDungMoiIn(4, 'BOPP 18', ink, 1);
  eq(mucOpp.nhomMuc, 'opp', 'BOPP → nhom opp');
  approx(dongIn.cpMucKeo!, mucOpp.donGia, 'In: đơn giá mực OPP auto');
  const dv = Number(dongIn.dauVaoNVL);
  const kho = Number(dongIn.khoMang);
  approx(dongIn.thanhTienMucKeo!, mucOpp.donGia * dv * kho, 'thành tiền mực khớp đơn giá OPP');
}

{
  // 9.3 ghepCauTrucTuDongVatLieu — bỏ cut/matte/chia
  const parts = ghepCauTrucTuDongVatLieu([
    { congDoan: 'In', vatLieu: 'PET 12', rowKey: 'print', khoMang: 0.6, thanhPham: 1, phiHao: 0, dauVaoNVL: 1, giaNVL: null, donViGiaNVL: null, cpVatLieu: null, thanhTienNVL: null, cpMucKeo: null, thanhTienMucKeo: null },
    { congDoan: 'Lật mặt', vatLieu: 'PET 12', rowKey: 'matte', khoMang: 0.6, thanhPham: 1, phiHao: 0, dauVaoNVL: 1, giaNVL: 0, donViGiaNVL: null, cpVatLieu: 0, thanhTienNVL: 0, cpMucKeo: 0, thanhTienMucKeo: 0 },
    { congDoan: 'GHÉP (Lớp 2)', vatLieu: 'LLDPE 60', rowKey: 'lam-2', khoMang: 0.6, thanhPham: 1, phiHao: 0, dauVaoNVL: 1, giaNVL: null, donViGiaNVL: null, cpVatLieu: null, thanhTienNVL: null, cpMucKeo: null, thanhTienMucKeo: null },
    { congDoan: 'Chia', vatLieu: 'x', rowKey: 'chia', khoMang: 0.3, thanhPham: 1, phiHao: 0, dauVaoNVL: 1, giaNVL: 0, donViGiaNVL: null, cpVatLieu: 0, thanhTienNVL: 0, cpMucKeo: 0, thanhTienMucKeo: 0 },
    { congDoan: 'Làm túi', vatLieu: 'Zipper', rowKey: 'cut', khoMang: null, thanhPham: 1, phiHao: 0, dauVaoNVL: 1, giaNVL: null, donViGiaNVL: null, cpVatLieu: null, thanhTienNVL: 0, cpMucKeo: null, thanhTienMucKeo: null },
  ]);
  eq(parts, 'PET 12//LLDPE 60', 'ghepCauTruc chỉ In + ghép');
}

// ── 10. BUG FIX: in/ghép GC → KHÔNG cộng mực/keo (đã nằm trong giá GC) ────

{
  // B1: In GC → thanhTienMucKeo = null, cpMucKeo = null
  const uni = taoUniRows();
  uni[0] = { ...uni[0], isOutsourced: true, cpsx: 1500, costCPSX: 1500 * 8000 * 0.65 };
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource',
      outsource: { steps: ['print'] },
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  const dongIn = rows.find(x => x.rowKey === 'print')!;
  eq(dongIn.cpMucKeo, null, 'B1: in GC → cpMucKeo = null');
  eq(dongIn.thanhTienMucKeo, null, 'B1: in GC → thanhTienMucKeo = null (không cộng mực)');
}

{
  // B2: Ghép GC → thanhTienMucKeo = null, cpMucKeo = null
  const uni = taoUniRows();
  uni[1] = { ...uni[1], isOutsourced: true, cpsx: 800, costCPSX: 800 * 8420 * 0.65 };
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource',
      outsource: { steps: ['laminate'] },
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  const dongGhep = rows.find(x => x.rowKey === 'lam-2')!;
  eq(dongGhep.cpMucKeo, null, 'B2: ghép GC → cpMucKeo = null');
  eq(dongGhep.thanhTienMucKeo, null, 'B2: ghép GC → thanhTienMucKeo = null (không cộng keo)');
}

// ── 11. Phase 2: Gia công lật mặt (matte) ───────────────────────────────

{
  // Lật mặt GC: không hiện dòng Lật mặt, CP gộp vào thanhTienNVL dòng In
  const uni = taoUniRows();
  uni[0] = { ...uni[0], isOutsourced: true, cpsx: 1500, costCPSX: 1500 * 8000 * 0.65 };
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: {
        steps: ['print', 'matte'],
        matte: { filmSource: 'lts', gcPricePerM2: 500 },
      },
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  // Phase 2: dòng Lật mặt LUÔN hiện khi phuMo=true (dù GC hay không) — chấm đỏ qua flag
  const latMat = rows.find(x => x.congDoan === 'Lật mặt' || x.rowKey === 'matte')!;
  assert(latMat != null, 'matte GC: vẫn hiện dòng Lật mặt Table 1');
  assert(latMat.isGiaCongNgoai === true, 'matte GC: dòng Lật mặt có isGiaCongNgoai=true');
  const dongIn = rows.find(x => x.rowKey === 'print')!;
  assert(dongIn.isGiaCongNgoai === true, 'matte GC: dòng In có isGiaCongNgoai=true (printGc)');
  // cpLatMatGc = 500 × 8000 × 0.65 = 2,600,000
  const cpLatMatMong = 500 * 8000 * 0.65;
  // costMat gốc (216700) + costCPSX (1500 × 8000 × 0.65 = 7,800,000) + cpLatMatMong (2,600,000)
  const thanhTienMong = 216700 + 1500 * 8000 * 0.65 + cpLatMatMong;
  approx(dongIn.thanhTienNVL!, thanhTienMong, 'matte GC: thanhTienNVL = costMat + costCPSX + cpLatMatGc');
}

{
  // Lật mặt KHÔNG GC (chỉ in GC): vẫn hiện dòng Lật mặt Table 1
  const uni = taoUniRows();
  uni[0] = { ...uni[0], isOutsourced: true, cpsx: 1500, costCPSX: 1500 * 8000 * 0.65 };
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: { steps: ['print'] }, // KHÔNG có 'matte'
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  assert(rows.some(x => x.congDoan === 'Lật mặt'), 'print GC + không matte GC: vẫn có dòng Lật mặt Table 1');
}

{
  // Lật mặt nội bộ (không GC) + phủ mờ: hiện dòng Lật mặt Table 1
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasMo: true },
  });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  assert(rows.some(x => x.congDoan === 'Lật mặt'), 'không GC + phủ mờ: có dòng Lật mặt Table 1');
}

{
  // B1' in GC + phủ mờ: vẫn hiện dòng Lật mặt (vì không tick 'matte')
  const uni = taoUniRows();
  uni[0] = { ...uni[0], isOutsourced: true, cpsx: 1500, costCPSX: 1500 * 8000 * 0.65 };
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: { steps: ['print', 'slit'] }, // có slit GC nhưng KHÔNG có matte
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  assert(rows.some(x => x.congDoan === 'Lật mặt'), 'in GC + slit GC + không matte GC: vẫn có dòng Lật mặt (chỉ chia thôi)');
}

{
  // Table 2: phuMo + matte GC → dòng "lật mặt" HIỆN với isGiaCongNgoai=true, thanhTien=0
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: { steps: ['matte'] },
    },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const latMat = ncDien.find(x => x.congDoan === 'lật mặt' || x.rowKey === 'matte')!;
  assert(latMat != null, 'matte GC: dòng lật mặt Table 2 HIỆN (không bị ẩn)');
  assert(latMat.isGiaCongNgoai === true, 'matte GC: lật mặt có isGiaCongNgoai=true');
  approx(latMat.thoiGianPhut!, 0, 'matte GC: TG = 0');
  approx(latMat.thanhTienNhanCong, 0, 'matte GC: CP NC = 0');
  approx(latMat.thanhTienDien, 0, 'matte GC: CP điện = 0');
}

{
  // Chỉ Lật mặt GC (In nội bộ): vẫn cộng cpLatMatGc vào dòng In
  const uni = taoUniRows();
  // print KHÔNG isOutsourced
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: {
        steps: ['matte'],
        matte: { filmSource: 'lts', gcPricePerM2: 400 },
      },
    },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  const dongIn = rows.find(x => x.rowKey === 'print')!;
  const latMat = rows.find(x => x.congDoan === 'Lật mặt' || x.rowKey === 'matte')!;
  assert(!dongIn.isGiaCongNgoai, 'matte-only: In không GC');
  assert(latMat?.isGiaCongNgoai === true, 'matte-only: Lật mặt có flag GC');
  // In nội bộ vẫn có mực
  assert(dongIn.thanhTienMucKeo != null && dongIn.thanhTienMucKeo! > 0, 'matte-only: In vẫn có mực');
  // cpLatMatGc = 400 × meters × width = 400 × 8000 × 0.65 = 2_080_000
  const cpLat = 400 * 8000 * 0.65;
  const nvlKhongLat = 216700; // costMat fixture print
  approx(dongIn.thanhTienNVL!, nvlKhongLat + cpLat, 'matte-only: In.thanhTienNVL = costMat + cpLatMatGc');
}

{
  // Table 2: phuMo + KHÔNG matte GC → có dòng "lật mặt" NC+điện
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasMo: true },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  assert(ncDien.some(x => x.congDoan === 'lật mặt' || x.rowKey === 'matte'), 'không matte GC: có dòng lật mặt Table 2');
}

{
  // layLanNguocMetTuResult: laGcMatte đọc đúng từ steps
  const rMatteGc = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000, hasMo: true,
      pricingMode: 'outsource',
      outsource: { steps: ['print', 'matte'] },
    },
  });
  const optsMatte = layLanNguocMetTuResult(rMatteGc);
  assert(optsMatte.laGcMatte === true, 'layLanNguoc: matte trong steps → laGcMatte=true');
  assert(optsMatte.laGcSlit === false, 'layLanNguoc: slit không trong steps → laGcSlit=false');

  const rKhongMatte = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasMo: true },
  });
  const optsKhong = layLanNguocMetTuResult(rKhongMatte);
  assert(optsKhong.laGcMatte === false, 'layLanNguoc: không outsource → laGcMatte=false');
}

// ── 12. isGiaCongNgoai flag (chấm đỏ UI) ─────────────────────────────────

{
  // Bảng 1: in GC → isGiaCongNgoai=true
  const uni = taoUniRows();
  uni[0] = { ...uni[0], isOutsourced: true, cpsx: 1500, costCPSX: 7_800_000 };
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource', outsource: { steps: ['print'] } },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  const inRow = rows.find(x => x.rowKey === 'print')!;
  assert(inRow.isGiaCongNgoai === true, 'B1: in GC → isGiaCongNgoai=true');
}

{
  // Bảng 1: ghép GC → isGiaCongNgoai=true
  const uni = taoUniRows();
  uni[1] = { ...uni[1], isOutsourced: true, cpsx: 800, costCPSX: 4_376_000 };
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource', outsource: { steps: ['laminate'] } },
  });
  const rows = lapDongVatLieuNangCao(r, uni, taoHangSo());
  const ghepRow = rows.find(x => x.rowKey === 'lam-2')!;
  assert(ghepRow.isGiaCongNgoai === true, 'B2: ghép GC → isGiaCongNgoai=true');
}

{
  // Bảng 1: cắt GC (slit) → dòng minh họa Chia có isGiaCongNgoai=true
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['slit'] },
    },
  });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const chiaRow = rows.find(x => x.rowKey === 'chia')!;
  assert(chiaRow != null, 'B3: Có chia + slit GC: dòng Chia minh họa HIỆN');
  assert(chiaRow.isGiaCongNgoai === true, 'B3: Có chia + slit GC: dòng Chia có isGiaCongNgoai=true');
}

{
  // Bảng 1: Có chia + slit LTS → dòng Chia HIỆN nhưng isGiaCongNgoai=undefined
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['print'] },
    },
  });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const chiaRow = rows.find(x => x.rowKey === 'chia')!;
  assert(chiaRow != null, 'B3: Có chia + slit LTS: dòng Chia minh họa HIỆN');
  assert(!chiaRow.isGiaCongNgoai, 'B3: Có chia + slit LTS: dòng Chia KHÔNG có isGiaCongNgoai');
}

{
  // Bảng 1: Lật mặt nội bộ (không GC) → isGiaCongNgoai=undefined
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000, hasMo: true },
  });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const latMat = rows.find(x => x.congDoan === 'Lật mặt')!;
  assert(latMat != null, 'B4: Lật mặt nội bộ: dòng Lật mặt HIỆN');
  assert(!latMat.isGiaCongNgoai, 'B4: Lật mặt nội bộ: KHÔNG có isGiaCongNgoai');
}

{
  // Bảng 1: in KHÔNG GC → isGiaCongNgoai=undefined
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000 },
  });
  const rows = lapDongVatLieuNangCao(r, taoUniRows(), taoHangSo());
  const inRow = rows.find(x => x.rowKey === 'print')!;
  assert(!inRow.isGiaCongNgoai, 'B5: in nội bộ: KHÔNG có isGiaCongNgoai');
}

{
  // Bảng 2: in GC → dòng "in" HIỆN với isGiaCongNgoai=true, thanhTien=0
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource', outsource: { steps: ['print'] } },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const inRow = ncDien.find(x => x.congDoan === 'in')!;
  assert(inRow != null, 'T1: in GC: dòng in HIỆN');
  assert(inRow.isGiaCongNgoai === true, 'T1: in GC: isGiaCongNgoai=true');
  approx(inRow.thoiGianPhut!, 0, 'T1: in GC: TG = 0');
  approx(inRow.thanhTienNhanCong, 0, 'T1: in GC: CP NC = 0');
  approx(inRow.thanhTienDien, 0, 'T1: in GC: CP điện = 0');
}

{
  // Bảng 2: ghép GC → dòng "ghép" HIỆN với isGiaCongNgoai=true
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000,
      pricingMode: 'outsource', outsource: { steps: ['laminate'] } },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const ghepRow = ncDien.find(x => x.congDoan === 'ghép')!;
  assert(ghepRow != null, 'T2: ghép GC: dòng ghép HIỆN');
  assert(ghepRow.isGiaCongNgoai === true, 'T2: ghép GC: isGiaCongNgoai=true');
  approx(ghepRow.thanhTienNhanCong, 0, 'T2: ghép GC: CP NC = 0');
  approx(ghepRow.thanhTienDien, 0, 'T2: ghép GC: CP điện = 0');
}

{
  // Bảng 2: Có chia + slit GC → dòng "chia" HIỆN với isGiaCongNgoai=true
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['slit'] },
    },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const chiaRow = ncDien.find(x => x.congDoan === 'chia')!;
  assert(chiaRow != null, 'T3: slit GC: dòng chia HIỆN');
  assert(chiaRow.isGiaCongNgoai === true, 'T3: slit GC: chia isGiaCongNgoai=true');
  approx(chiaRow.thanhTienNhanCong, 0, 'T3: slit GC: CP NC = 0');
}

{
  // Bảng 2: Có chia + slit LTS → dòng "chia" HIỆN nhưng isGiaCongNgoai=undefined
  const r = taoResult({
    input: {
      productType: 'tui', numColors: 4, quantity: 10000,
      hasDivide: true, divideElements: 2, divideWidthMm: 300,
      pricingMode: 'outsource', outsource: { steps: ['print'] },
    },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const chiaRow = ncDien.find(x => x.congDoan === 'chia')!;
  assert(chiaRow != null, 'T3: slit LTS: dòng chia HIỆN');
  assert(!chiaRow.isGiaCongNgoai, 'T3: slit LTS: chia KHÔNG có isGiaCongNgoai');
}

{
  // Bảng 2: dòng "làm túi" LUÔN HIỆN (không bao giờ GC) + isGiaCongNgoai=undefined
  const r = taoResult({ input: { productType: 'tui', numColors: 4, quantity: 10000 } });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const tuiRow = ncDien.find(x => x.congDoan === 'làm túi')!;
  assert(tuiRow != null, 'T4: dòng "làm túi" LUÔN hiện');
  assert(!tuiRow.isGiaCongNgoai, 'T4: dòng "làm túi" KHÔNG có isGiaCongNgoai (luôn LTS)');
}

{
  // Tổng NC+điện: in GC (0) + lật mặt GC (0) + ghép nội bộ + chia nội bộ + làm túi
  // → tổng = sum các dòng không GC
  const r = taoResult({
    input: { productType: 'tui', numColors: 4, quantity: 10000,
      hasMo: true,
      pricingMode: 'outsource', outsource: { steps: ['print', 'matte'] } },
  });
  const ncDien = lapDongNhanCongDien(r, taoHangSo());
  const tong = ncDien.reduce((s, x) => s + x.thanhTienNhanCong + x.thanhTienDien, 0);
  // In GC + Matte GC = 0; Ghép + Chia + Làm túi vẫn tính
  const chiKhongGc = ncDien.filter(x => !x.isGiaCongNgoai);
  approx(tong, chiKhongGc.reduce((s, x) => s + x.thanhTienNhanCong + x.thanhTienDien, 0),
    'T5: tổng NC+điện = sum các dòng không GC (GC = 0)');
}

console.log(`✓ dac-ta-nang-cao: ${soTest} assertions passed`);
