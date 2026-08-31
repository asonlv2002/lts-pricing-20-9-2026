/**
 * lsx-bag-fields.test.ts — nguồn chung các dòng thông số MÁY LÀM TÚI (lưới 2 ô).
 * Chạy: npx tsx src/lib/lsx-bag-fields.test.ts
 */

import type { LSXManualFields } from './types';
import { buildLsxBagFieldRows, splitLsxBagBlockWidths } from './lsx-bag-fields';

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

function manual(partial: Partial<LSXManualFields> = {}): LSXManualFields {
  return {
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanBien: 0,
    hanDau: 0,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    danLung: 0,
    danLungLech: 0,
    danDay: 0,
    nap: 0,
    songSieuAm: 0,
    docQuaiXach: false,
    danKeoNap: false,
    tamZipperCachMieng: 0,
    loTreoInfo: '',
    useDualCutter: false,
    useSemicircularMold: false,
    ...partial,
  } as LSXManualFields;
}

console.log('buildLsxBagFieldRows — túi đáy đứng + zipper');

{
  const rows = buildLsxBagFieldRows(
    'tui-day-dung',
    manual({
      tamZipperCachMieng: 30,
      tearNotch: '2 bên cách miệng 15mm',
      sealEdge: '10mm',
      foldBottom: '100mm',
    }),
    true,
  );

  assert('2 hàng, cả hai là cặp 2 ô', rows.length === 2 && rows.every(r => r.kind === 'pair'), String(rows.length));
  const r0 = rows[0];
  const r1 = rows[1];
  assert(
    'hàng 1: Tâm zipper | Nhấn xé',
    r0.kind === 'pair' &&
      r0.left.label.includes('Tâm zipper') && r0.left.value === '30mm' &&
      r0.right.label.includes('Nhấn xé') && r0.right.value === '2 bên cách miệng 15mm',
    JSON.stringify(r0),
  );
  assert(
    'hàng 2: Hàn biên | Xếp đáy',
    r1.kind === 'pair' &&
      r1.left.label.includes('Hàn biên') && r1.left.value === '10mm' &&
      r1.right.label.includes('Xếp đáy') && r1.right.value === '100mm',
    JSON.stringify(r1),
  );
}

console.log('\nbuildLsxBagFieldRows — không zipper thì ẩn dòng zipper');

{
  const rows = buildLsxBagFieldRows('tui-day-dung', manual({ sealEdge: '10mm', foldBottom: '100mm' }), false);
  const flat = JSON.stringify(rows);
  assert('không có dòng Tâm zipper', !flat.includes('Tâm zipper'), flat);
  assert('vẫn có Hàn biên | Xếp đáy', rows.length === 1 && rows[0].kind === 'pair', String(rows.length));
}

console.log('\nbuildLsxBagFieldRows — túi 3 biên');

{
  const rows = buildLsxBagFieldRows('tui-3-bien', manual({ sealEdge: '7mm', hanDau: 30, holePunchInfo: 'Lỗ tròn Ø8mm' }), false);
  assert(
    'hàng đầu: Hàn biên | Hàn đầu',
    rows[0].kind === 'pair' &&
      rows[0].left.label.includes('Hàn biên') &&
      rows[0].right.label.includes('Hàn đầu'),
    JSON.stringify(rows[0]),
  );
  assert(
    'có hàng Đục lỗ gộp cả dòng',
    rows.some(r => r.kind === 'full' && r.field.label.includes('Đục lỗ')),
    JSON.stringify(rows),
  );
}

console.log('\nbuildLsxBagFieldRows — dao 2 nhịp / khuôn bán nguyệt gộp cả dòng');

{
  const rows = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30, useDualCutter: true, useSemicircularMold: true }),
    false,
  );
  const fulls = rows.filter(r => r.kind === 'full');
  assert(
    'có dòng dao 2 nhịp',
    fulls.some(r => r.kind === 'full' && r.field.value.includes('dao cắt 2 nhịp')),
    JSON.stringify(fulls),
  );
  assert(
    'có dòng khuôn bán nguyệt',
    fulls.some(r => r.kind === 'full' && r.field.value.includes('khuôn đáy đứng bán nguyệt')),
    JSON.stringify(fulls),
  );
}

console.log('\nbuildLsxBagFieldRows — túi 3 biên + zipper có Tâm zipper');

{
  const rows = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30, holePunchInfo: 'Lỗ tròn Ø8mm' }),
    true,
    30,
  );
  const pairZipper = rows.find(
    r => r.kind === 'pair' && r.left.label.includes('Tâm zipper'),
  ) as { kind: 'pair'; left: { label: string; value: string }; right: { label: string; value: string } } | undefined;
  assert(
    'tui-3-bien + zipper có cặp Tâm zipper | Nhấn xé',
    !!pairZipper && pairZipper.left.value === '30mm' && pairZipper.right.label.includes('Nhấn xé'),
    JSON.stringify(rows),
  );
}

console.log('\nbuildLsxBagFieldRows — túi 3 biên + zipper + snapshot.zipperDistanceMm');

{
  const rows = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30 }),
    true,
    18,
  );
  const pairZipper = rows.find(
    r => r.kind === 'pair' && r.left.label.includes('Tâm zipper'),
  ) as { kind: 'pair'; left: { label: string; value: string } } | undefined;
  assert(
    'snapshot 18 thắng manual = 0',
    !!pairZipper && pairZipper.left.value === '18mm',
    JSON.stringify(rows),
  );
}

console.log('\nbuildLsxBagFieldRows — túi 3 biên + zipper manual 25 thắng snapshot 18');

{
  const rows = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30, tamZipperCachMieng: 25 }),
    true,
    18,
  );
  const pairZipper = rows.find(
    r => r.kind === 'pair' && r.left.label.includes('Tâm zipper'),
  ) as { kind: 'pair'; left: { label: string; value: string } } | undefined;
  assert(
    'manual 25 thắng snapshot 18',
    !!pairZipper && pairZipper.left.value === '25mm',
    JSON.stringify(rows),
  );
}

console.log('\nbuildLsxBagFieldRows — Hàn đáy hiện khi hanDay > 0, ẩn khi 0');

{
  const rows = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30, hanDay: 20 }),
    false,
  );
  const hanDay = rows.find(
    (r) => r.kind === 'full' && 'field' in r && r.field.label.includes('Hàn đáy'),
  ) as { kind: 'full'; field: { label: string; value: string } } | undefined;
  assert('có dòng Hàn đáy: 20mm', !!hanDay && hanDay.field.value === '20mm', JSON.stringify(rows));

  const rowsNone = buildLsxBagFieldRows(
    'tui-3-bien',
    manual({ sealEdge: '7mm', hanDau: 30 }),
    false,
  );
  assert(
    'không hanDay → ẩn dòng Hàn đáy',
    !rowsNone.some((r) => r.kind === 'full' && 'field' in r && r.field.label.includes('Hàn đáy')),
  );
}

console.log('\nsplitLsxBagBlockWidths — kẻ dọc canh giữa (DOCX dùng DXA)');

{
  const w = splitLsxBagBlockWidths(10138);
  assert('ghi chú chiếm đúng nửa', w.note === 5069, String(w.note));
  assert('lưới chiếm đúng nửa còn lại', w.cellLeft + w.cellRight === 5069, `${w.cellLeft}+${w.cellRight}`);
  assert('2 ô lưới lệch nhau tối đa 1 dxa', Math.abs(w.cellLeft - w.cellRight) <= 1, `${w.cellLeft}/${w.cellRight}`);
  assert('tổng bằng khổ bảng', w.note + w.cellLeft + w.cellRight === 10138);
}

{
  const w = splitLsxBagBlockWidths(5069);
  assert('nửa phải (layout có MÁY CHIA) vẫn chia đều', w.note * 2 === 5069 + 1 || w.note === Math.round(5069 / 2), String(w.note));
  assert('tổng khớp khổ truyền vào', w.note + w.cellLeft + w.cellRight === 5069);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
