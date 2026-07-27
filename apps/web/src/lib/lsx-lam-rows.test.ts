/**
 * lsx-lam-rows.test.ts — nguồn chung các dòng MÁY GHÉP cho PDF / DOCX / preview HTML.
 * Chạy: npx tsx src/lib/lsx-lam-rows.test.ts
 */

import type { LsxLamExportRow } from './lsxExport';
import { buildLsxLamGridRows, splitLsxLamBlockWidths } from './lsx-lam-rows';

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

function lamRow(partial: Partial<LsxLamExportRow> = {}): LsxLamExportRow {
  return {
    label: 'Màng ghép 1',
    name: '',
    widthMm: 0,
    wasteMeters: 0,
    parts: [],
    ...partial,
  };
}

console.log('buildLsxLamGridRows — pass đơn (1 vật liệu)');

{
  const rows = buildLsxLamGridRows(
    [
      lamRow({
        label: 'Màng ghép 1',
        name: 'LLDPE125',
        widthMm: 480,
        parts: [{ name: 'LLDPE125', widthMm: 480 }],
      }),
    ],
    480,
  );
  assert('1 dòng', rows.length === 1, String(rows.length));
  assert('kind = single', rows[0].kind === 'single', rows[0].kind);
  if (rows[0].kind === 'single') {
    assert('label giữ nguyên', rows[0].label === 'Màng ghép 1', rows[0].label);
    assert('name = vật liệu', rows[0].name === 'LLDPE125', rows[0].name);
    assert('khoText chỉ số, không mm', rows[0].khoText === '480', rows[0].khoText);
  }
}

console.log('\nbuildLsxLamGridRows — pass dual (2 vật liệu) → 5 ô');

{
  const rows = buildLsxLamGridRows(
    [
      lamRow({
        label: 'Màng ghép 1',
        name: 'OPP20 240mm / MPET12 240mm',
        widthMm: 240,
        parts: [
          { name: 'OPP20', widthMm: 240 },
          { name: 'MPET12', widthMm: 240 },
        ],
      }),
    ],
    480,
  );
  assert('kind = dual', rows[0].kind === 'dual', rows[0].kind);
  if (rows[0].kind === 'dual') {
    assert('label lớn giữ nguyên', rows[0].label === 'Màng ghép 1', rows[0].label);
    assert('2 parts → 4 ô nhỏ', rows[0].parts.length === 2, String(rows[0].parts.length));
    assert('part1 name', rows[0].parts[0].name === 'OPP20', rows[0].parts[0].name);
    assert('part1 kho riêng', rows[0].parts[0].khoText === '240', rows[0].parts[0].khoText);
    assert('part2 name', rows[0].parts[1].name === 'MPET12', rows[0].parts[1].name);
    assert('part2 kho riêng', rows[0].parts[1].khoText === '240', rows[0].parts[1].khoText);
  }
}

console.log('\nbuildLsxLamGridRows — fallback khổ mặc định + giá trị thiếu');

{
  const rows = buildLsxLamGridRows(
    [lamRow({ label: 'Màng ghép 1', name: 'LLDPE', widthMm: 0, parts: [] })],
    500,
  );
  assert('single khi không có parts', rows[0].kind === 'single', rows[0].kind);
  if (rows[0].kind === 'single') {
    assert('dùng khổ mặc định', rows[0].khoText === '500', rows[0].khoText);
    assert('name fallback lr.name', rows[0].name === 'LLDPE', rows[0].name);
  }
}

{
  const rows = buildLsxLamGridRows(
    [lamRow({ label: 'Màng ghép 1', name: '', widthMm: 0, parts: [] })],
    0,
  );
  if (rows[0].kind === 'single') {
    assert('khổ rỗng → dấu …', rows[0].khoText === '…', rows[0].khoText);
  }
}

console.log('\nbuildLsxLamGridRows — nhiều pass giữ thứ tự');

{
  const rows = buildLsxLamGridRows(
    [
      lamRow({
        label: 'Màng ghép 1',
        parts: [
          { name: 'OPP20', widthMm: 240 },
          { name: 'MPET12', widthMm: 240 },
        ],
      }),
      lamRow({ label: 'Màng ghép 2', name: 'LLDPE125', widthMm: 480, parts: [{ name: 'LLDPE125', widthMm: 480 }] }),
    ],
    480,
  );
  assert('2 dòng', rows.length === 2, String(rows.length));
  assert('dòng 1 dual', rows[0].kind === 'dual', rows[0].kind);
  assert('dòng 2 single', rows[1].kind === 'single', rows[1].kind);
  assert('nhãn dòng 2', rows[1].label === 'Màng ghép 2', rows[1].label);
}

console.log('\nbuildLsxLamGridRows — danh sách rỗng');

{
  const rows = buildLsxLamGridRows([], 480);
  assert('không có dòng nào', rows.length === 0, String(rows.length));
}

console.log('\nsplitLsxLamBlockWidths — 3 cột: label gộp dọc | tên | khổ');

{
  const w = splitLsxLamBlockWidths(5000);
  assert('3 cột khớp tổng', w.label + w.name + w.kho === 5000,
    `${w.label}+${w.name}+${w.kho}`);
  assert('ô label rộng nhất', w.label >= w.name, `${w.label} vs ${w.name}`);
  assert('ô tên rộng hơn ô khổ', w.name >= w.kho, `${w.name} vs ${w.kho}`);
}

{
  const w = splitLsxLamBlockWidths(5069);
  assert('lẻ vẫn khớp tổng', w.label + w.name + w.kho === 5069,
    `${w.label}+${w.name}+${w.kho}`);
}

{
  const single = splitLsxLamBlockWidths(5000).single;
  assert('single: 2 ô khớp tổng', single.name + single.kho === 5000,
    `${single.name}+${single.kho}`);
  assert('single: ô tên rộng hơn ô khổ', single.name > single.kho,
    `${single.name} vs ${single.kho}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
