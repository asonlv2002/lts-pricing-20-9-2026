// ═══════════════════════════════════════════════════════════════════════════
// Test Tính Giá (Giai đoạn test — AGENTS.md) — Bảng Đặc tả kỹ thuật nâng cao
// Bước 1: chạy 100% công thức trong code (engine thật + bảng nâng cao).
// Chạy: pnpm --filter web exec tsx src/lib/test-bang-nang-cao-2026-08-07.mts
// Đầu ra: docs/test-tinh-gia-2026-08-07-raw.json
// ═══════════════════════════════════════════════════════════════════════════
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { calculate } from './engine';
import { lapDongSanXuat } from './manager-calculation';
import {
  lapDongVatLieuNangCao,
  lapDongNhanCongDien,
  tinhTongNangCao,
  tinhCpMucDungMoiIn,
} from './dac-ta-nang-cao';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, DEFAULT_CPSX_UPGRADE_INK } from './data';
import type { CalculateInput } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mats = INITIAL_MATERIALS;
const cons = INITIAL_CONSTANTS;
const prof = INITIAL_PROFIT_TABLE;

const l1 = 'MattOPP20';
const l2 = 'MPET';
const l3 = 'LLDPE';
const l4 = 'PET';
const l5 = 'PA';

function baseInput(patch: Partial<CalculateInput>): CalculateInput {
  return {
    customer: 'Test-TT',
    productName: 'Tui test',
    productType: 'tui',
    bagType: 'flat',
    filmType: '',
    filmRollLength: 6000,
    quantity: 10000,
    numColors: 4,
    numImages: 1,
    layer1Id: l1,
    layer2Id: null,
    layer3Id: null,
    layer4Id: null,
    layer5Id: null,
    spreadWidth: 0.3,
    cutStep: 0.4,
    metallicSurcharge: 0,
    coverageRatio: 1,
    handleWeight: 0,
    zipperWeight: 0,
    tapeWeight: 0,
    hasZipper: false,
    hasTape: false,
    hasHandle: false,
    paymentDays: 30,
    profitColumn: 1,
    commissionRate: 0,
    commissionFixedVND: 0,
    commissionUnit: 'percent',
    commissionInputValue: 0,
    bagsPerBox: 1000,
    boxPrice: 50000,
    shippingPerKm: 0,
    shippingKm: 0,
    cylLength: 0,
    cylCircum: 0,
    cylUnitPrice: 0,
    cylType: 'A',
    cylIncluded: false,
    ...patch,
  };
}

function mangInInput(patch: Partial<CalculateInput>): CalculateInput {
  return {
    ...baseInput({}),
    productType: 'mang',
    bagType: '',
    filmType: 'mangIn',
    quantity: 5000,
    layer1Id: 'BOPP18',
    spreadWidth: 0.5,
    cutStep: 0.3,
    ...patch,
  };
}

const CASES: { id: string; nhom: string; moTa: string; input: CalculateInput }[] = [
  // ── In: OPP / PET / 50% ────────────────────────────────────────────────────
  { id: 'C01', nhom: 'In', moTa: 'CP mực DM in 1-8 màu — in mực OPP (MattOPP20), 4 màu, phủ 100%', input: baseInput({}) },
  { id: 'C02', nhom: 'In', moTa: 'CP mực DM 4 màu — in mực OPP, tỉ lệ phủ 50%', input: baseInput({ coverageRatio: 0.5 }) },
  { id: 'C03', nhom: 'In', moTa: 'CP mực DM 4 màu — in mực PET (PET12), phủ 100%', input: baseInput({ layer1Id: 'PET' }) },
  { id: 'C04', nhom: 'In', moTa: 'CP mực DM 4 màu — in mực PET, tỉ lệ phủ 50%', input: baseInput({ layer1Id: 'PET', coverageRatio: 0.5 }) },
  { id: 'C05', nhom: 'In', moTa: 'Lớp in = PA (nylon) — rơi vào nhóm mực nào?', input: baseInput({ layer1Id: 'PA', layer2Id: l3 }) },
  { id: 'C06', nhom: 'In', moTa: 'Lớp in = LLDPE (PE) — bảng mực pe + DM_OPP', input: baseInput({ layer1Id: 'LLDPE' }) },
  // ── In: số màu 1..8 ────────────────────────────────────────────────────────
  { id: 'C07', nhom: 'In', moTa: 'Số màu = 1 (OPP, 100%)', input: baseInput({ numColors: 1 }) },
  { id: 'C08', nhom: 'In', moTa: 'Số màu = 2 (OPP, 100%)', input: baseInput({ numColors: 2 }) },
  { id: 'C09', nhom: 'In', moTa: 'Số màu = 3 (OPP, 100%)', input: baseInput({ numColors: 3 }) },
  { id: 'C10', nhom: 'In', moTa: 'Số màu = 4 (OPP, 100%)', input: baseInput({ numColors: 4 }) },
  { id: 'C11', nhom: 'In', moTa: 'Số màu = 5 (OPP, 100%)', input: baseInput({ numColors: 5 }) },
  { id: 'C12', nhom: 'In', moTa: 'Số màu = 6 (OPP, 100%)', input: baseInput({ numColors: 6 }) },
  { id: 'C13', nhom: 'In', moTa: 'Số màu = 7 (OPP, 100%)', input: baseInput({ numColors: 7 }) },
  { id: 'C14', nhom: 'In', moTa: 'Số màu = 8 (OPP, 100%)', input: baseInput({ numColors: 8 }) },
  // ── In: OPP 1-8 màu × phủ 50% ─────────────────────────────────────────────
  { id: 'C28', nhom: 'In', moTa: 'OPP 1 màu × phủ 50%', input: baseInput({ numColors: 1, coverageRatio: 0.5 }) },
  { id: 'C29', nhom: 'In', moTa: 'OPP 2 màu × phủ 50%', input: baseInput({ numColors: 2, coverageRatio: 0.5 }) },
  { id: 'C30', nhom: 'In', moTa: 'OPP 3 màu × phủ 50%', input: baseInput({ numColors: 3, coverageRatio: 0.5 }) },
  { id: 'C31', nhom: 'In', moTa: 'OPP 4 màu × phủ 50%', input: baseInput({ numColors: 4, coverageRatio: 0.5 }) },
  { id: 'C32', nhom: 'In', moTa: 'OPP 5 màu × phủ 50%', input: baseInput({ numColors: 5, coverageRatio: 0.5 }) },
  { id: 'C33', nhom: 'In', moTa: 'OPP 6 màu × phủ 50%', input: baseInput({ numColors: 6, coverageRatio: 0.5 }) },
  { id: 'C34', nhom: 'In', moTa: 'OPP 7 màu × phủ 50%', input: baseInput({ numColors: 7, coverageRatio: 0.5 }) },
  { id: 'C35', nhom: 'In', moTa: 'OPP 8 màu × phủ 50%', input: baseInput({ numColors: 8, coverageRatio: 0.5 }) },
  // ── In: biên ───────────────────────────────────────────────────────────────
  { id: 'C15', nhom: 'In', moTa: 'Không in (số màu = 0)', input: baseInput({ numColors: 0 }) },
  { id: 'C16', nhom: 'In', moTa: 'Số màu = 12 (>8) — mực clamp 8, thời gian tính theo?', input: baseInput({ numColors: 12 }) },
  { id: 'C17', nhom: 'In', moTa: 'Có in nhũ (metallicSurcharge = 50.000)', input: baseInput({ metallicSurcharge: 50000 }) },
  { id: 'C18', nhom: 'In', moTa: 'Màng in (BOPP18, film-only) — phủ 100%', input: mangInInput({}) },
  { id: 'C19', nhom: 'In', moTa: 'Màng in + phủ 50% (đặt tay — UI không cho) — bảng có giảm?', input: mangInInput({ coverageRatio: 0.5 }) },
  // ── In: PET 1-8 màu × phủ 50% + PE/PA 50% ─────────────────────────────────
  { id: 'C36', nhom: 'In', moTa: 'PET 1 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 1, coverageRatio: 0.5 }) },
  { id: 'C37', nhom: 'In', moTa: 'PET 2 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 2, coverageRatio: 0.5 }) },
  { id: 'C38', nhom: 'In', moTa: 'PET 3 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 3, coverageRatio: 0.5 }) },
  { id: 'C39', nhom: 'In', moTa: 'PET 4 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 4, coverageRatio: 0.5 }) },
  { id: 'C40', nhom: 'In', moTa: 'PET 5 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 5, coverageRatio: 0.5 }) },
  { id: 'C41', nhom: 'In', moTa: 'PET 6 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 6, coverageRatio: 0.5 }) },
  { id: 'C42', nhom: 'In', moTa: 'PET 7 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 7, coverageRatio: 0.5 }) },
  { id: 'C43', nhom: 'In', moTa: 'PET 8 màu × phủ 50%', input: baseInput({ layer1Id: 'PET', numColors: 8, coverageRatio: 0.5 }) },
  { id: 'C44', nhom: 'In', moTa: 'LLDPE (bảng PE) 4 màu × phủ 50%', input: baseInput({ layer1Id: 'LLDPE', coverageRatio: 0.5 }) },
  { id: 'C45', nhom: 'In', moTa: 'PA 4 màu × phủ 50% (PA→PET + 50%)', input: baseInput({ layer1Id: 'PA', layer2Id: l3, coverageRatio: 0.5 }) },
  // ── Kết hợp & biên mở rộng ─────────────────────────────────────────────────
  { id: 'C46', nhom: 'In', moTa: 'Kết hợp: phủ 50% + nhũ/mờ (nhũ KHÔNG giảm theo 50%)', input: baseInput({ coverageRatio: 0.5, metallicSurcharge: 400 }) },
  { id: 'C47', nhom: 'In', moTa: 'Màng in BOPP + nhũ/mờ', input: mangInInput({ metallicSurcharge: 400 }) },
  { id: 'C51', nhom: 'In', moTa: 'PET_MATT12 làm lớp in → nhóm pet', input: baseInput({ layer1Id: 'PET_MATT12' }) },
  { id: 'C52', nhom: 'In', moTa: 'LLDPE (bảng PE) 8 màu × 100% — cực đại', input: baseInput({ layer1Id: 'LLDPE', numColors: 8 }) },
  // ── Màng ghép & dual-structure ────────────────────────────────────────────
  { id: 'C48', nhom: 'Ghép', moTa: 'Màng 2 lớp (màng ghép, không phải màng in)', input: { ...mangInInput({ layer2Id: l3 }), filmType: 'mangGhep' } },
  { id: 'C49', nhom: 'Ghép', moTa: 'Ghép 2 VL song song (dual: L2 LLDPE + L2 phụ MPET, 2 hình)', input: baseInput({ bagType: 'dayDung', numImages: 2, layer2Id: l3, layer2AltId: l2, layer2Lengths: { mat1: 0.1, mat2: 0.2 }, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom' }) },
  // ── Gia công ngoài ────────────────────────────────────────────────────────
  { id: 'C50', nhom: 'Chia/Làm túi', moTa: 'In gia công ngoài (vendor, giá đ/m²) — bảng nâng cao hiển thị gì?', input: baseInput({ pricingMode: 'outsource', outsource: { steps: ['print'], print: { filmSource: 'vendor', filmBuyPricePerM2: 15000, gcPricePerM2: 2000, wastePct: 2, wasteSetupM: 10 } } }) },
  { id: 'C54', nhom: 'Chia/Làm túi', moTa: 'Đủ 3 phụ kiện: Zipper + Băng keo + Quai', input: baseInput({ hasZipper: true, zipperWeight: 1, hasTape: true, tapeWeight: 1, hasHandle: true, handleWeight: 1, layer2Id: l3 }) },
  // ── Ghép ───────────────────────────────────────────────────────────────────
  { id: 'C20', nhom: 'Ghép', moTa: 'Ghép 2 lớp (MattOPP20 + LLDPE)', input: baseInput({ layer2Id: l3 }) },
  { id: 'C21', nhom: 'Ghép', moTa: 'Ghép 3 lớp (MattOPP20 + MPET + LLDPE)', input: baseInput({ layer2Id: l2, layer3Id: l3 }) },
  { id: 'C22', nhom: 'Ghép', moTa: 'Ghép 4 lớp (+ PET lớp 4)', input: baseInput({ layer2Id: l2, layer3Id: l3, layer4Id: l4 }) },
  { id: 'C23', nhom: 'Ghép', moTa: 'Ghép 5 lớp (+ PA lớp 5)', input: baseInput({ layer2Id: l2, layer3Id: l3, layer4Id: l4, layer5Id: l5 }) },
  // ── Chia / Làm túi ────────────────────────────────────────────────────────
  { id: 'C24', nhom: 'Chia/Làm túi', moTa: 'Túi có zipper + chia', input: baseInput({ hasZipper: true, zipperWeight: 1, layer2Id: l3 }) },
  { id: 'C25', nhom: 'Chia/Làm túi', moTa: 'Màng — không có dòng chia/làm túi', input: mangInInput({}) },
  // ── Thời gian SX / Tổng ────────────────────────────────────────────────────
  { id: 'C26', nhom: 'Thời gian SX', moTa: 'Mét in ≥ 40000 (quantity 150.000) — bonus thời gian', input: baseInput({ quantity: 150000 }) },
  { id: 'C27', nhom: 'Tổng', moTa: 'Đối chiếu: 100% vs 50% — tổng nâng cao & engine giảm bao nhiêu', input: baseInput({}) },
];

const so = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const rows: Record<string, unknown>[] = [];

for (const c of CASES) {
  const result = calculate(c.input, mats, cons, prof);
  if (!result) {
    rows.push({ id: c.id, nhom: c.nhom, moTa: c.moTa, loi: 'engine trả null' });
    continue;
  }
  const { uniRows } = lapDongSanXuat(result, cons);
  const dongVL = lapDongVatLieuNangCao(result, uniRows, cons, mats);
  const dongNCD = lapDongNhanCongDien(result, cons);
  const tong = tinhTongNangCao(dongVL, dongNCD);

  const dongIn = dongVL.find((r) => r.congDoan === 'CPSX IN');
  const cacGhep = dongVL.filter((r) => r.cpMucKeo != null && r.congDoan !== 'CPSX IN');
  const dongChia = dongVL.find((r) => r.congDoan === 'CẮT');
  const dongTui = dongVL.find((r) => r.congDoan === 'làm túi');

  const tgIn = dongNCD.find((r) => r.congDoan === 'in');
  const tgGhep = dongNCD.find((r) => r.congDoan === 'ghép');
  const tgChia = dongNCD.find((r) => r.congDoan === 'chia');
  const tgTui = dongNCD.find((r) => r.congDoan === 'làm túi');

  const tenLop1 = result.layers.print?.material?.name ?? dongIn?.vatLieu ?? '';
  const mucTrucTiep = tinhCpMucDungMoiIn(c.input.numColors, tenLop1, cons.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK);

  rows.push({
    id: c.id,
    nhom: c.nhom,
    moTa: c.moTa,
    soMau: c.input.numColors,
    coverage: c.input.coverageRatio,
    lop1: tenLop1,
    nhomMuc: mucTrucTiep.nhomMuc,
    // Table 1 — In
    cpMucInDongIn: dongIn?.cpMucKeo ?? null,
    thanhTienMucIn: dongIn?.thanhTienMucKeo ?? null,
    cpNhuMo: dongIn?.cpNhuMo ?? null,
    thanhTienNhuMo: dongIn?.thanhTienNhuMo ?? null,
    ghiChuIn: dongIn?.ghiChu ?? null,
    // Table 1 — Ghép
    soDongGhep: cacGhep.length,
    vatLieuGhep: cacGhep.map((r) => r.vatLieu).join(' | '),
    cpKeoDongGhep: cacGhep[0]?.cpMucKeo ?? null,
    tongTienKeo: cacGhep.reduce((s, r) => s + so(r.thanhTienMucKeo), 0),
    // Table 1 — Chia / Làm túi
    coDongChia: !!dongChia,
    coDongLamTui: !!dongTui,
    lamTuiTienNVL: dongTui?.thanhTienNVL ?? null,
    // Table 2
    tgInPhut: tgIn?.thoiGianPhut ?? null,
    tgInThanhTien: so(tgIn?.thanhTienNhanCong) + so(tgIn?.thanhTienDien),
    tgGhepPhut: tgGhep?.thoiGianPhut ?? null,
    tgChiaPhut: tgChia?.thoiGianPhut ?? null,
    tgTuiPhut: tgTui?.thoiGianPhut ?? null,
    // Tổng
    tongVL: Math.round(tong.tongVatLieu),
    tongNCD: Math.round(tong.tongNhanCongDien),
    tongGiaThanhNangCao: Math.round(tong.tongGiaThanh),
    // Engine (đối chiếu)
    engineTotalProdCost: Math.round(so(result.totalProductionCost)),
    engineFinalPrice: Math.round(so(result.finalPrice)),
    engineCostPerUnit: Math.round(so(result.costPerUnit)),
  });
}

const outPath = join(__dirname, '..', '..', '..', '..', 'docs', 'test-tinh-gia-2026-08-07-raw.json');
writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
console.log('WROTE', outPath, 'cases=', rows.length);
for (const r of rows) {
  if (r.loi) { console.log('LOI', r.id, r.loi); continue; }
  console.log(
    `${r.id} [${r.nhom}] soMau=${r.soMau} coverage=${r.coverage} lop1=${r.lop1} nhom=${r.nhomMuc}`,
    `| CP mực+DM=${r.cpMucInDongIn}đ/m² ghiChu=${String(r.ghiChuIn ?? '').slice(0, 70)}`,
    `| ghép=${r.soDongGhep} dòng (${r.vatLieuGhep}) keo=${r.cpKeoDongGhep}`,
    `| chia=${r.coDongChia} làmTúi=${r.coDongLamTui}`,
    `| tgIn=${r.tgInPhut}phút | tổngNC=${r.tongGiaThanhNangCao}đ vs engine=${r.engineTotalProdCost}đ`,
  );
}
