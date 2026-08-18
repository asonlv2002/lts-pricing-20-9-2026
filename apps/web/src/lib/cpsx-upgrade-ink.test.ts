import {
  tinhGiaMucTbCong,
  tinhGiaMucTbTrongSo,
  giaMucTheoNguon,
  dongBoGiaMucDangApSauSuaRow,
  chuanHoaMucInTable,
  chuanHoaCpsxUpgradeInk,
  chuanHoaBangDungMoiKeo,
  chuanHoaKeoTable,
  dongBoGiaKeoSauSuaRow,
  tinhGiaKeoTbCong,
  tinhGiaKeoTbTrongSo,
  chuanHoaDinhMucIn,
  chuanHoaDinhMucGhep,
  tinhCpMucInMoiM2,
  tinhCpMucInChiTiet,
  lapBangGiaInTheoMau,
} from './cpsx-upgrade-ink';
import type {
  CpsxUpgradeInk,
  DinhMucGhep,
  DinhMucInRow,
  KeoTable,
  MucInRow,
  MucInTable,
  SolventAdhesiveTable,
} from './types';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function eq(actual: unknown, expected: unknown, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`FAIL: ${msg} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

function approx(actual: number, expected: number, msg: string, eps = 0.01) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`FAIL: ${msg} — expected ${expected} got ${actual}`);
  }
}

const oppRows: MucInRow[] = [
  { ma: 'A', ten: 'a', dvt: 'kg', donGia: 100, slDung: 10 },
  { ma: 'B', ten: 'b', dvt: 'kg', donGia: 200, slDung: 0 },
  { ma: 'C', ten: 'c', dvt: 'kg', donGia: 0, slDung: 5 },
  { ma: 'D', ten: 'd', dvt: 'kg', donGia: 400, slDung: 40 },
];

const fbTable: MucInTable = {
  rows: oppRows,
  appliedSource: 'weighted',
  appliedPrice: 123,
};

const fbSolvent: SolventAdhesiveTable = {
  dungMoi: {
    rows: [
      { ma: 'DM_OPP', ten: 'DUNG MÔI OPP', dvt: 'kg', donGia: 40000, ghiChu: 'In màng OPP, màng MattOPP' },
      { ma: 'DM_PET', ten: 'DUNG MÔI PET', dvt: 'kg', donGia: 40000, ghiChu: 'In toàn bộ màng còn lại' },
      { ma: 'DM_EA', ten: 'DUNG MÔI EA', dvt: 'kg', donGia: 40000, ghiChu: 'Ghép toàn bộ màng' },
    ],
  },
  keo: {
    rows: [
      { ma: 'KEO_319', ten: 'KEO GHÉP 319', dvt: 'kg', donGia: 40000, ghiChu: 'Dùng cho mọi loại màng tại khâu GHÉP', slDung: 1 },
      { ma: 'KEO_766', ten: 'KEO GHÉP 766', dvt: 'kg', donGia: 40000, ghiChu: 'Dùng cho mọi loại màng tại khâu GHÉP', slDung: 1 },
    ],
    appliedSource: 'average',
    appliedPrice: 40000,
  },
};

const fbDinhMucIn: DinhMucInRow[] = [
  { soMau: 1, dmMucG: 4, dmDungMoiG: 4.5 },
  { soMau: 2, dmMucG: 8, dmDungMoiG: 6 },
  { soMau: 3, dmMucG: 12, dmDungMoiG: 7.5 },
  { soMau: 4, dmMucG: 16, dmDungMoiG: 9 },
  { soMau: 5, dmMucG: 20, dmDungMoiG: 10.5 },
  { soMau: 6, dmMucG: 24, dmDungMoiG: 12 },
  { soMau: 7, dmMucG: 28, dmDungMoiG: 13.5 },
  { soMau: 8, dmMucG: 32, dmDungMoiG: 15 },
];

const fbDinhMucGhep: DinhMucGhep = { keoKhoG: 3.5, dungMoiPhaKeoG: 7 };

// 1. TB cộng: bỏ dòng donGia<=0
{
  const tb = tinhGiaMucTbCong(oppRows);
  approx(tb, (100 + 200 + 400) / 3, 'TB cộng bỏ dòng 0');
}

// 2. TB trọng số: chỉ tính dòng donGia>0 VÀ slDung>0
{
  const tb = tinhGiaMucTbTrongSo(oppRows);
  approx(tb, (100 * 10 + 400 * 40) / (10 + 40), 'TB trọng số bỏ dòng donGia=0 hoặc slDung=0');
}

// 3. TB cộng rỗng
{
  assert(tinhGiaMucTbCong([]) === 0, 'TB cộng rỗng = 0');
  assert(tinhGiaMucTbTrongSo([]) === 0, 'TB trọng số rỗng = 0');
}

// 4. TB cộng tất cả donGia=0
{
  const rows: MucInRow[] = [
    { ma: 'X', ten: 'x', dvt: 'kg', donGia: 0, slDung: 5 },
  ];
  assert(tinhGiaMucTbCong(rows) === 0, 'TB cộng all 0');
  assert(tinhGiaMucTbTrongSo(rows) === 0, 'TB trọng số all 0');
}

// 5. giaMucTheoNguon
{
  assert(giaMucTheoNguon('average', oppRows, null) === tinhGiaMucTbCong(oppRows), 'average → tb cong');
  assert(giaMucTheoNguon('weighted', oppRows, null) === tinhGiaMucTbTrongSo(oppRows), 'weighted → tb trong so');
  assert(giaMucTheoNguon('manual', oppRows, 123456) === 123456, 'manual → manual');
  assert(giaMucTheoNguon('manual', oppRows, null) === null, 'manual null → null');
}

// 6. dongBoGiaMucDangApSauSuaRow: average/weighted tự recompute
{
  const t: MucInTable = { rows: oppRows, appliedSource: 'average', appliedPrice: 0 };
  const next = dongBoGiaMucDangApSauSuaRow(t);
  approx(next.appliedPrice as number, tinhGiaMucTbCong(oppRows), 'sync average');
}
{
  const t: MucInTable = { rows: oppRows, appliedSource: 'weighted', appliedPrice: 0 };
  const next = dongBoGiaMucDangApSauSuaRow(t);
  approx(next.appliedPrice as number, tinhGiaMucTbTrongSo(oppRows), 'sync weighted');
}
{
  const t: MucInTable = { rows: oppRows, appliedSource: 'manual', appliedPrice: 55555 };
  const next = dongBoGiaMucDangApSauSuaRow(t);
  assert(next.appliedPrice === 55555, 'manual giữ nguyên');
}

// 7. chuanHoaMucInTable: bỏ row rác, fallback khi thiếu
{
  const out = chuanHoaMucInTable(undefined, fbTable);
  eq(out.rows.length, fbTable.rows.length, 'undefined → fallback rows');
  eq(out.appliedSource, 'weighted', 'fallback source');
}
{
  const raw = {
    rows: [
      { ma: 'Z', ten: 'z', dvt: 'kg', donGia: -5, slDung: -3 },
      { ma: 'OK', ten: 'ok', dvt: 'kg', donGia: 100, slDung: 5 },
    ],
    appliedSource: 'weighted' as const,
    appliedPrice: 999,
  };
  const out = chuanHoaMucInTable(raw, fbTable);
  eq(out.rows.length, 2, 'giữ cả 2 dòng (chuẩn hóa giá trị)');
  assert(out.rows[0].donGia === 0, 'donGia âm → 0');
  assert(out.rows[0].slDung === 0, 'slDung âm → 0');
  eq(out.appliedSource, 'weighted', 'giữ weighted');
  approx(out.appliedPrice as number, 100, 'weighted → tự recompute vì source = weighted');
}
{
  const raw = {
    rows: [{ ma: 'X', ten: 'x', dvt: 'kg', donGia: 100, slDung: 5 }],
    appliedSource: 'garbage' as unknown as MucInTable['appliedSource'],
    appliedPrice: null as number | null,
  };
  const out = chuanHoaMucInTable(raw, fbTable);
  eq(out.appliedSource, 'weighted', 'source rác → fallback weighted (theo fb)');
  approx(out.appliedPrice as number, tinhGiaMucTbCong(out.rows), 'source rác → recompute');
}
{
  const raw = {
    rows: [{ ma: 'X', ten: 'x', dvt: 'kg', donGia: 0, slDung: 5 }],
    appliedSource: 'manual' as const,
    appliedPrice: null as number | null,
  };
  const out = chuanHoaMucInTable(raw, fbTable);
  approx(out.appliedPrice as number, tinhGiaMucTbCong(out.rows), 'manual + null → tb cong fallback');
}

// 8. chuanHoaCpsxUpgradeInk
{
  const out = chuanHoaCpsxUpgradeInk(
    undefined,
    fbTable,
    fbTable,
    fbTable,
    fbSolvent,
    fbDinhMucIn,
    fbDinhMucGhep,
  );
  eq(out.opp.rows.length, fbTable.rows.length, 'opp fallback rows');
  eq(out.pet.rows.length, fbTable.rows.length, 'pet fallback rows');
  eq(out.pe.rows.length, fbTable.rows.length, 'pe fallback rows');
  eq(out.solventAdhesive.dungMoi.rows.length, fbSolvent.dungMoi.rows.length, 'dung môi fallback rows');
  eq(out.solventAdhesive.keo.rows.length, fbSolvent.keo.rows.length, 'keo fallback rows');
  eq(out.dinhMucIn.length, 8, 'dinhMucIn 8 dòng');
  eq(out.dinhMucGhep.keoKhoG, 3.5, 'dinhMucGhep keo');
}
{
  const out = chuanHoaCpsxUpgradeInk(
    { opp: { rows: oppRows, appliedSource: 'manual', appliedPrice: 999 } },
    fbTable,
    fbTable,
    fbTable,
    fbSolvent,
    fbDinhMucIn,
    fbDinhMucGhep,
  );
  assert(out.opp.appliedPrice === 999, 'opp giữ manual 999');
  approx(
    out.pet.appliedPrice as number,
    tinhGiaMucTbTrongSo(out.pet.rows),
    'pet weighted → recompute',
  );
  approx(
    out.pe.appliedPrice as number,
    tinhGiaMucTbTrongSo(out.pe.rows),
    'pe weighted → recompute',
  );
  eq(
    out.solventAdhesive.dungMoi.rows.length,
    fbSolvent.dungMoi.rows.length,
    'dung môi fallback vì raw trống',
  );
  eq(
    out.solventAdhesive.keo.rows.length,
    fbSolvent.keo.rows.length,
    'keo fallback vì raw trống',
  );
}

// 8b. PE — 6 dòng mặc định từ bảng mực LLDPE
const peRows: MucInRow[] = [
  { ma: 'MUCPE2585',  ten: 'MỰC TÍM (P267C) Q-Surf V-Z05', dvt: 'kg', donGia: 115000, slDung: 17 },
  { ma: 'MUCPE2587',  ten: 'MỰC CAM (P165C).Q-Surf O-Z09', dvt: 'kg', donGia:  79000, slDung: 17 },
  { ma: 'MUCPE501',   ten: 'Mực đen Q-Surf BL501/FE',      dvt: 'kg', donGia:  80000, slDung: 17 },
  { ma: 'MUCPEGXZ17', ten: 'Mực Xám Q-Surf GX-Z17',        dvt: 'kg', donGia:  96000, slDung: 17 },
  { ma: 'MUCPEW001',  ten: 'Mực trắng Q-Surf W001/FE',     dvt: 'kg', donGia:  76000, slDung: 40 },
  { ma: 'MUCPEYZ18',  ten: 'Mực Vàng Q-Surf Y-Z18',        dvt: 'kg', donGia:  96000, slDung: 17 },
];
{
  const tbTrongSoPe = tinhGiaMucTbTrongSo(peRows);
  const tongPe = peRows.reduce((s, r) => s + r.slDung, 0);
  eq(tongPe, 125, 'PE tổng SL dùng = 125');
  approx(tbTrongSoPe, 87_696, 'PE TB trọng số = 87.696');
  const fbPe: MucInTable = { rows: peRows, appliedSource: 'weighted', appliedPrice: 0 };
  const out = chuanHoaCpsxUpgradeInk(
    undefined,
    fbTable,
    fbTable,
    fbPe,
    fbSolvent,
    fbDinhMucIn,
    fbDinhMucGhep,
  );
  eq(out.pe.rows.length, 6, 'pe fallback 6 dòng');
  approx(out.pe.appliedPrice as number, 87_696, 'pe appliedPrice = 87.696');
}

// 9. chuanHoaBangDungMoiKeo — tách 2 bảng + migrate shape cũ
{
  const out = chuanHoaBangDungMoiKeo(undefined, fbSolvent);
  eq(out.dungMoi.rows.length, 3, 'undefined → dung môi fallback 3 dòng');
  eq(out.keo.rows.length, 2, 'undefined → keo fallback 2 dòng');
  eq(out.dungMoi.rows[0].ma, 'DM_OPP', 'fallback ma');
  eq(out.keo.appliedSource, 'average', 'keo default average');
  approx(out.keo.appliedPrice as number, 40000, 'keo average → TB 40.000');
}
{
  // shape mới: giữ nguyên, chuẩn hóa từng dòng; keo average → recompute
  const raw = {
    dungMoi: {
      rows: [
        { ma: '', ten: 'X', dvt: 'kg', donGia: -10, ghiChu: '' },
        { ma: 'OK', ten: 'OK', dvt: 'L', donGia: 50000, ghiChu: 'note' },
      ],
    },
    keo: {
      rows: [
        { ma: 'KEO_1', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '' },
        { ma: 'KEO_2', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '' },
      ],
      appliedSource: 'average' as const,
      appliedPrice: 999,
    },
  };
  const out = chuanHoaBangDungMoiKeo(raw, fbSolvent);
  eq(out.dungMoi.rows.length, 2, 'giữ 2 dòng dung môi');
  eq(out.dungMoi.rows[0].ma, 'row_1', 'ma trống → row_1');
  assert(out.dungMoi.rows[0].donGia === 0, 'donGia âm → 0');
  eq(out.dungMoi.rows[1].ghiChu, 'note', 'giữ ghiChu');
  approx(out.keo.appliedPrice as number, 40000, 'keo average → recompute TB');
}
{
  // shape cũ (rows phẳng) → migrate tách DM_* / KEO_*
  const raw = {
    rows: [
      { ma: 'DM_OPP', ten: 'op', dvt: 'kg', donGia: 45000, ghiChu: '' },
      { ma: 'KEO_319', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '' },
      { ma: 'DM_EA', ten: 'ea', dvt: 'kg', donGia: 42000, ghiChu: '' },
      { ma: 'KEO_766', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '' },
    ],
  };
  const out = chuanHoaBangDungMoiKeo(raw, fbSolvent);
  eq(out.dungMoi.rows.map((r) => r.ma), ['DM_OPP', 'DM_EA'], 'migrate: DM_* → dungMoi');
  eq(out.keo.rows.map((r) => r.ma), ['KEO_319', 'KEO_766'], 'migrate: KEO_* → keo');
  approx(out.dungMoi.rows[0].donGia, 45000, 'giữ giá DM_OPP');
  eq(out.keo.appliedSource, 'average', 'keo migrate → average');
  approx(out.keo.appliedPrice as number, 40000, 'keo migrate → TB 30k+50k');
  assert(out.keo.rows[0].slDung === 1, 'keo cũ không có slDung → default 1');
}
{
  // shape cũ rỗng → fallback
  const out = chuanHoaBangDungMoiKeo({ rows: [] }, fbSolvent);
  eq(out.dungMoi.rows.length, 3, 'cũ rỗng → dung môi fallback');
  eq(out.keo.rows.length, 2, 'cũ rỗng → keo fallback');
}

// 9b. chuanHoaKeoTable + tinhGiaKeoTbCong + dongBoGiaKeoSauSuaRow
{
  approx(
    tinhGiaKeoTbCong([
      { ma: 'A', ten: 'a', dvt: 'kg', donGia: 30000, ghiChu: '' },
      { ma: 'B', ten: 'b', dvt: 'kg', donGia: 50000, ghiChu: '' },
      { ma: 'C', ten: 'c', dvt: 'kg', donGia: 0, ghiChu: '' },
    ]),
    40000,
    'TB cộng bỏ dòng giá 0',
  );
  assert(tinhGiaKeoTbCong([]) === 0, 'TB cộng rỗng = 0');
}
{
  // TB trọng số keo: (30k×2 + 70k×1) / 3 = 43.333; bỏ slDung 0 hoặc donGia 0
  approx(
    tinhGiaKeoTbTrongSo([
      { ma: 'A', ten: 'a', dvt: 'kg', donGia: 30000, ghiChu: '', slDung: 2 },
      { ma: 'B', ten: 'b', dvt: 'kg', donGia: 70000, ghiChu: '', slDung: 1 },
      { ma: 'C', ten: 'c', dvt: 'kg', donGia: 90000, ghiChu: '', slDung: 0 },
      { ma: 'D', ten: 'd', dvt: 'kg', donGia: 0, ghiChu: '', slDung: 5 },
    ]),
    30000 * 2 / 3 + 70000 / 3,
    'TB trọng số bỏ dòng slDung 0 / giá 0',
  );
  assert(tinhGiaKeoTbTrongSo([]) === 0, 'TB trọng số rỗng = 0');
}
{
  const out = chuanHoaKeoTable(undefined, fbSolvent.keo);
  eq(out.rows.length, 2, 'undefined → fallback rows');
  eq(out.appliedSource, 'average', 'fallback source');
  assert(out.rows[0].slDung === 1, 'fallback rows có slDung 1');
}
{
  const raw = {
    rows: [
      { ma: 'K1', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '' },
      { ma: 'K2', ten: 'k2', dvt: 'kg', donGia: 70000, ghiChu: '' },
    ],
    appliedSource: 'manual' as const,
    appliedPrice: 55000,
  };
  const out = chuanHoaKeoTable(raw, fbSolvent.keo);
  eq(out.appliedSource, 'manual', 'giữ manual');
  approx(out.appliedPrice as number, 55000, 'manual giữ giá');
  assert(out.rows[0].slDung === 1, 'thiếu slDung → default 1');
}
{
  // weighted: (30k×2 + 70k×1)/3 = 43.333
  const raw = {
    rows: [
      { ma: 'K1', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '', slDung: 2 },
      { ma: 'K2', ten: 'k2', dvt: 'kg', donGia: 70000, ghiChu: '', slDung: 1 },
    ],
    appliedSource: 'weighted' as const,
    appliedPrice: 999,
  };
  const out = chuanHoaKeoTable(raw, fbSolvent.keo);
  eq(out.appliedSource, 'weighted', 'giữ weighted');
  approx(out.appliedPrice as number, 30000 * 2 / 3 + 70000 / 3, 'weighted → TB trọng số');
}
{
  const raw = {
    rows: [
      { ma: 'K1', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '' },
      { ma: 'K2', ten: 'k2', dvt: 'kg', donGia: 50000, ghiChu: '' },
    ],
    appliedSource: 'garbage' as unknown as KeoTable['appliedSource'],
    appliedPrice: null as number | null,
  };
  const out = chuanHoaKeoTable(raw, fbSolvent.keo);
  eq(out.appliedSource, 'average', 'source rác → fallback average');
  approx(out.appliedPrice as number, 40000, 'source rác → TB recompute');
}
{
  const t: KeoTable = {
    rows: [
      { ma: 'K1', ten: 'k1', dvt: 'kg', donGia: 30000, ghiChu: '', slDung: 2 },
      { ma: 'K2', ten: 'k2', dvt: 'kg', donGia: 70000, ghiChu: '', slDung: 1 },
    ],
    appliedSource: 'average',
    appliedPrice: 0,
  };
  approx(dongBoGiaKeoSauSuaRow(t).appliedPrice as number, 50000, 'average → tự recompute');
  const tw: KeoTable = { ...t, appliedSource: 'weighted', appliedPrice: 0 };
  approx(dongBoGiaKeoSauSuaRow(tw).appliedPrice as number, 30000 * 2 / 3 + 70000 / 3, 'weighted → tự recompute');
  const t2: KeoTable = { ...t, appliedSource: 'manual', appliedPrice: 55000 };
  assert(dongBoGiaKeoSauSuaRow(t2).appliedPrice === 55000, 'manual giữ nguyên');
}

// 10. chuanHoaDinhMucIn — luôn 8 dòng
{
  const out = chuanHoaDinhMucIn(undefined, fbDinhMucIn);
  eq(out.length, 8, 'undefined → 8 dòng');
  eq(out[0].dmMucG, 4, 'màu 1 mực');
  eq(out[7].dmDungMoiG, 15, 'màu 8 DM');
}
{
  const out = chuanHoaDinhMucIn(
    [{ soMau: 3, dmMucG: 99, dmDungMoiG: 1.1 } as DinhMucInRow],
    fbDinhMucIn,
  );
  eq(out.length, 8, 'partial → pad 8');
  eq(out[2].dmMucG, 99, 'màu 3 ghi đè');
  eq(out[0].dmMucG, 4, 'màu 1 fallback');
}
{
  const out = chuanHoaDinhMucIn(
    [{ soMau: 1, dmMucG: -5, dmDungMoiG: -1 } as DinhMucInRow],
    fbDinhMucIn,
  );
  assert(out[0].dmMucG === 0, 'dmMucG âm → 0');
  assert(out[0].dmDungMoiG === 0, 'dmDungMoiG âm → 0');
}

// 11. chuanHoaDinhMucGhep
{
  const out = chuanHoaDinhMucGhep(undefined, fbDinhMucGhep);
  eq(out.keoKhoG, 3.5, 'fallback keo');
  eq(out.dungMoiPhaKeoG, 7, 'fallback DM');
}
{
  const out = chuanHoaDinhMucGhep({ keoKhoG: 4, dungMoiPhaKeoG: 8 }, fbDinhMucGhep);
  eq(out.keoKhoG, 4, 'giữ keo');
  eq(out.dungMoiPhaKeoG, 8, 'giữ DM');
}

// 12. tinhCpMucInMoiM2 — giá in (₫/m²) theo số màu + vật liệu + tỉ lệ phủ
const inkFixture: CpsxUpgradeInk = {
  opp: { rows: oppRows, appliedSource: 'manual', appliedPrice: 120000 },
  pet: { rows: oppRows, appliedSource: 'manual', appliedPrice: 135000 },
  pe: { rows: peRows, appliedSource: 'weighted', appliedPrice: 87696 },
  solventAdhesive: fbSolvent,
  dinhMucIn: fbDinhMucIn,
  dinhMucGhep: fbDinhMucGhep,
};
{
  // PET 1 màu: (4×135000 + 4.5×40000) ÷ 1000 = 720
  approx(tinhCpMucInMoiM2(1, 'pet', inkFixture), 720, 'PET 1 màu 100%');
  // PET 1 màu 50%: 0.5 × 720 = 360
  approx(tinhCpMucInMoiM2(1, 'pet', inkFixture, 0.5), 360, 'PET 1 màu 50%');
  // OPP 1 màu: (4×120000 + 4.5×40000) ÷ 1000 = 660
  approx(tinhCpMucInMoiM2(1, 'opp', inkFixture), 660, 'OPP 1 màu 100%');
  // OPP 8 màu: (32×120000 + 15×40000) ÷ 1000 = 4440
  approx(tinhCpMucInMoiM2(8, 'opp', inkFixture), 4440, 'OPP 8 màu 100%');
  // PE dùng DM_OPP: (4×87696 + 4.5×40000) ÷ 1000 = 530.784
  approx(tinhCpMucInMoiM2(1, 'pe', inkFixture), 530.784, 'PE 1 màu 100% — DM_OPP');
  // PE 8 màu 50%: 0.5 × (32×87696 + 15×40000) ÷ 1000 = 1703.136
  approx(tinhCpMucInMoiM2(8, 'pe', inkFixture, 0.5), 1703.136, 'PE 8 màu 50%');
  assert(tinhCpMucInMoiM2(0, 'opp', inkFixture) === 0, 'soMau 0 → 0');
  assert(tinhCpMucInMoiM2(-2, 'opp', inkFixture) === 0, 'soMau âm → 0');
  // soMau > 8 clamp về định mức 8 màu
  approx(
    tinhCpMucInMoiM2(12, 'opp', inkFixture),
    tinhCpMucInMoiM2(8, 'opp', inkFixture),
    'soMau > 8 → clamp 8',
  );
  // 50% = nửa tổng 100% (mực + dung môi)
  approx(
    tinhCpMucInMoiM2(1, 'pet', inkFixture, 0.5),
    tinhCpMucInMoiM2(1, 'pet', inkFixture) / 2,
    'phủ 50% = phủ 100% ÷ 2',
  );
}

// 13b. tinhCpMucInChiTiet — breakdown từng số hạng, tổng khớp tinhCpMucInMoiM2
{
  const ct = tinhCpMucInChiTiet(1, 'pet', inkFixture);
  eq(ct.giaMuc, 135000, 'PET giá mực ₫/kg');
  eq(ct.giaDm, 40000, 'PET giá DM DM_PET');
  eq(ct.dmMucG, 4, 'PET ĐM mực g/m²');
  eq(ct.dmDungMoiG, 4.5, 'PET ĐM DM g/m²');
  approx(ct.cpMuc, (4 * 135000) / 1000, 'PET phần mực = 540 ₫/m²');
  approx(ct.cpDm, (4.5 * 40000) / 1000, 'PET phần DM = 180 ₫/m²');
  approx(ct.tong, 720, 'PET tổng = 720 ₫/m²');
  approx(ct.tong, tinhCpMucInMoiM2(1, 'pet', inkFixture), 'tổng khớp tinhCpMucInMoiM2');

  const ct8 = tinhCpMucInChiTiet(8, 'pet', inkFixture);
  approx(ct8.dmMucG, 32, 'PET 8 màu ĐM mực = 32g (tổng, không nhân lại)');
  approx(ct8.tong, (32 * 135000 + 15 * 40000) / 1000, 'PET 8 màu tổng');

  const ctO = tinhCpMucInChiTiet(1, 'opp', inkFixture);
  eq(ctO.giaMuc, 120000, 'OPP giá mực');
  eq(ctO.giaDm, 40000, 'OPP dùng DM_OPP');
  approx(ctO.tong, 660, 'OPP tổng = 660 ₫/m²');

  const ctPe = tinhCpMucInChiTiet(1, 'pe', inkFixture);
  approx(ctPe.giaMuc, 87696, 'PE giá mực');
  eq(ctPe.giaDm, 40000, 'PE dùng DM_OPP (sheet không có DM_PE)');
  approx(ctPe.tong, 530.784, 'PE tổng');

  const ct0 = tinhCpMucInChiTiet(0, 'pet', inkFixture);
  assert(ct0.tong === 0 && ct0.cpMuc === 0 && ct0.cpDm === 0, 'soMau 0 → 0');
}

// 14. lapBangGiaInTheoMau — đủ 8 dòng, khớp giá trị tay
{
  const bang = lapBangGiaInTheoMau(inkFixture);
  eq(bang.length, 8, 'đủ 8 dòng');
  eq(bang.map((r) => r.soMau), [1, 2, 3, 4, 5, 6, 7, 8], 'soMau 1–8');
  const d1 = bang[0];
  eq(d1.opp100, 660, 'dòng 1 OPP 100%');
  eq(d1.pet100, 720, 'dòng 1 PET 100%');
  eq(d1.pe100, 531, 'dòng 1 PE 100% (round 530.784)');
  eq(d1.opp50, 330, 'dòng 1 OPP 50% = 660/2');
  eq(d1.pet50, 360, 'dòng 1 PET 50% = 720/2');
  eq(d1.pe50, 265, 'dòng 1 PE 50% (round 265.392)');
  const d8 = bang[7];
  eq(d8.opp100, 4440, 'dòng 8 OPP 100%');
  eq(d8.opp50, 2220, 'dòng 8 OPP 50% = 4440/2');
  for (const r of bang) {
    assert(r.opp50 <= r.opp100, `OPP 50% ≤ 100% (màu ${r.soMau})`);
    assert(r.pet50 <= r.pet100, `PET 50% ≤ 100% (màu ${r.soMau})`);
    assert(r.pe50 <= r.pe100, `PE 50% ≤ 100% (màu ${r.soMau})`);
    // 50% = round(nửa giá trị thô); so với round(100%)/2 có thể lệch 1đ do làm tròn 2 lần
    eq(r.opp50, Math.round(tinhCpMucInMoiM2(r.soMau, 'opp', inkFixture, 0.5)), `OPP 50% thô màu ${r.soMau}`);
    eq(r.pet50, Math.round(tinhCpMucInMoiM2(r.soMau, 'pet', inkFixture, 0.5)), `PET 50% thô màu ${r.soMau}`);
    eq(r.pe50, Math.round(tinhCpMucInMoiM2(r.soMau, 'pe', inkFixture, 0.5)), `PE 50% thô màu ${r.soMau}`);
    approx(r.opp50, r.opp100 / 2, `OPP 50% ≈ 100%/2 màu ${r.soMau}`, 1);
    approx(r.pet50, r.pet100 / 2, `PET 50% ≈ 100%/2 màu ${r.soMau}`, 1);
    approx(r.pe50, r.pe100 / 2, `PE 50% ≈ 100%/2 màu ${r.soMau}`, 1);
  }
}

console.log('cpsx-upgrade-ink.test.ts: OK');
