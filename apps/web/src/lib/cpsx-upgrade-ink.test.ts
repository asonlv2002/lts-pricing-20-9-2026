import {
  tinhGiaMucTbCong,
  tinhGiaMucTbTrongSo,
  giaMucTheoNguon,
  dongBoGiaMucDangApSauSuaRow,
  chuanHoaMucInTable,
  chuanHoaCpsxUpgradeInk,
  chuanHoaBangDungMoiKeo,
  chuanHoaDinhMucIn,
  chuanHoaDinhMucGhep,
} from './cpsx-upgrade-ink';
import type {
  DinhMucGhep,
  DinhMucInRow,
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
  rows: [
    { ma: 'DM_OPP', ten: 'DUNG MÔI OPP', dvt: 'kg', donGia: 40000, ghiChu: 'xài cho khâu in' },
    { ma: 'DM_PET', ten: 'DUNG MÔI PET', dvt: 'kg', donGia: 40000, ghiChu: '' },
    { ma: 'KEO_319', ten: 'KEO GHÉP 319', dvt: 'kg', donGia: 40000, ghiChu: 'xài cho khâu ghép' },
    { ma: 'KEO_766', ten: 'KEO GHÉP 766', dvt: 'kg', donGia: 40000, ghiChu: '' },
    { ma: 'DM_EA', ten: 'DUNG MÔI EA', dvt: 'kg', donGia: 40000, ghiChu: '' },
  ],
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
  eq(out.solventAdhesive.rows.length, fbSolvent.rows.length, 'solvent fallback rows');
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
    out.solventAdhesive.rows.length,
    fbSolvent.rows.length,
    'solvent fallback vì raw trống',
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

// 9. chuanHoaBangDungMoiKeo
{
  const out = chuanHoaBangDungMoiKeo(undefined, fbSolvent);
  eq(out.rows.length, fbSolvent.rows.length, 'undefined → fallback');
  eq(out.rows[0].ma, 'DM_OPP', 'fallback ma');
}
{
  const raw: SolventAdhesiveTable = {
    rows: [
      { ma: '', ten: 'X', dvt: 'kg', donGia: -10, ghiChu: '' },
      { ma: 'OK', ten: 'OK', dvt: 'L', donGia: 50000, ghiChu: 'note' },
    ],
  };
  const out = chuanHoaBangDungMoiKeo(raw, fbSolvent);
  eq(out.rows.length, 2, 'giữ 2 dòng');
  eq(out.rows[0].ma, 'row_1', 'ma trống → row_1');
  assert(out.rows[0].donGia === 0, 'donGia âm → 0');
  eq(out.rows[1].ghiChu, 'note', 'giữ ghiChu');
}
{
  const raw: SolventAdhesiveTable = { rows: [] };
  const out = chuanHoaBangDungMoiKeo(raw, fbSolvent);
  eq(out.rows.length, fbSolvent.rows.length, 'rỗng → fallback');
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

console.log('cpsx-upgrade-ink.test.ts: OK');
