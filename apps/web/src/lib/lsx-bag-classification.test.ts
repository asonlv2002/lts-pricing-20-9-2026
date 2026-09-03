/**
 * lsx-bag-classification.test.ts - nhãn "Kiểu túi" ở khâu làm túi trong LSX.
 * Quy luật: override admin thắng (giữ nhãn gốc); tự suy + zipper:
 * dayDung → "Túi zipper đáy đứng", cutSeal → "Túi zipper cắt seal",
 * các kiểu còn lại → "Túi zipper 3 biên".
 * Chạy: npx tsx src/lib/lsx-bag-classification.test.ts
 */

import {
  bagTypeLabelHienThi,
  classifyLsxBagType,
  classifyLsxBagTypeByKey,
  zipperDistanceFromOrder,
} from './lsx-bag-classification';
import type { LSXManualFields } from './types';

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

/** Nhãn hiển thị như renderer: override → classifyLsxBagTypeByKey, else tự suy. */
function label(bagType: string, hasZipper: boolean, override?: string): string {
  const info = override
    ? classifyLsxBagTypeByKey(override)
    : classifyLsxBagType(bagType, hasZipper);
  return bagTypeLabelHienThi(info, bagType, hasZipper, !!override);
}

console.log('bagTypeLabelHienThi — không zipper (giữ nhãn gốc)');
assert('3bien không zipper → Túi 3 biên', label('3bien', false) === 'Túi 3 biên');
assert('4bien không zipper → Túi 4 biên', label('4bien', false) === 'Túi 4 biên');
assert('dayDung không zipper → Túi đáy đứng', label('dayDung', false) === 'Túi đáy đứng');
assert('cutSeal không zipper → Túi cắt seal', label('cutSeal', false) === 'Túi cắt seal');
assert('cutSealNapKeo không zipper → Túi cắt seal có nắp băng keo', label('cutSealNapKeo', false) === 'Túi cắt seal có nắp băng keo');
assert('xephong_giua không zipper → Túi dán lưng giữa', label('xephong_giua', false) === 'Túi dán lưng giữa');
assert('xephong_lech không zipper → Túi xếp hông dán lưng lệch', label('xephong_lech', false) === 'Túi xếp hông dán lưng lệch');

console.log('\nbagTypeLabelHienThi — tự suy + zipper');
assert('3bien + zipper → Túi zipper 3 biên', label('3bien', true) === 'Túi zipper 3 biên');
assert('4bien + zipper → Túi zipper 3 biên', label('4bien', true) === 'Túi zipper 3 biên');
assert('dayDung + zipper → Túi zipper đáy đứng', label('dayDung', true) === 'Túi zipper đáy đứng');
assert('cutSeal + zipper → Túi zipper cắt seal', label('cutSeal', true) === 'Túi zipper cắt seal');
assert('cutSealNapKeo + zipper → Túi zipper 3 biên', label('cutSealNapKeo', true) === 'Túi zipper 3 biên');
assert('xephong_giua + zipper → Túi zipper 3 biên', label('xephong_giua', true) === 'Túi zipper 3 biên');
assert('xephong_lech + zipper → Túi zipper 3 biên', label('xephong_lech', true) === 'Túi zipper 3 biên');

console.log('\nbagTypeLabelHienThi — override thắng, giữ nhãn gốc (kể cả khi zipper)');
assert('override tui-3-bien + zipper → Túi 3 biên', label('dayDung', true, 'tui-3-bien') === 'Túi 3 biên');
assert('override tui-day-dung + zipper → Túi đáy đứng', label('3bien', true, 'tui-day-dung') === 'Túi đáy đứng');
assert('override tui-cut-seal + zipper → Túi cắt seal', label('3bien', true, 'tui-cut-seal') === 'Túi cắt seal');
assert('override legacy tui-zipper-day-dung + zipper → Túi đáy đứng', label('3bien', true, 'tui-zipper-day-dung') === 'Túi đáy đứng');
assert('override tui-4-bien + zipper → Túi 4 biên', label('3bien', true, 'tui-4-bien') === 'Túi 4 biên');

console.log('\nbagTypeLabelHienThi — fallback');
assert('bagType lạ + zipper → giữ bagType', bagTypeLabelHienThi(classifyLsxBagType('BAG-LẠ', true), 'BAG-LẠ', true, false) === 'BAG-LẠ');
assert('bagType rỗng → Túi', bagTypeLabelHienThi(classifyLsxBagType('', true), '', true, false) === 'Túi');

const orderStub = (manual: Partial<LSXManualFields>, zip?: number) => ({
  manual: { tamZipperCachMieng: 0, ...manual } as LSXManualFields,
  snapshot: { zipperDistanceMm: zip } as { zipperDistanceMm?: number },
});

console.log('\nzipperDistanceFromOrder — fallback chain (chỉ khi hasZipper=true)');
assert(
  'manual > 0 thắng (admin sửa tay)',
  zipperDistanceFromOrder(orderStub({ tamZipperCachMieng: 25 }, 0), true, 'tui-3-bien') === 25,
);
assert(
  'manual = 0, snapshot có 22 → 22',
  zipperDistanceFromOrder(orderStub({}, 22), true, 'tui-3-bien') === 22,
);
assert(
  'hasZipper=true, manual = 0, snapshot = 0, tui-3-bien → 0 (không còn fallback 30)',
  zipperDistanceFromOrder(orderStub({}, 0), true, 'tui-3-bien') === 0,
);
assert(
  'hasZipper=true, manual = 0, snapshot = 0, tui-day-dung → 0',
  zipperDistanceFromOrder(orderStub({}, 0), true, 'tui-day-dung') === 0,
);
assert(
  'hasZipper=true, manual = 0, snapshot = 0, tui-cut-seal → 0 (không còn fallback 25)',
  zipperDistanceFromOrder(orderStub({}, 0), true, 'tui-cut-seal') === 0,
);
assert(
  'hasZipper=true, manual = 0, snapshot = 0, no templateKey → 0',
  zipperDistanceFromOrder(orderStub({}, 0), true) === 0,
);
assert(
  'hasZipper=true, manual > 0 thắng kể cả snapshot = 0 (admin đã xoá sẵn)',
  zipperDistanceFromOrder(orderStub({ tamZipperCachMieng: 12 }, 0), true, 'tui-3-bien') === 12,
);
assert(
  'hasZipper=false → 0 bất kể manual/snapshot (dòng zipper ẩn)',
  zipperDistanceFromOrder(orderStub({ tamZipperCachMieng: 25 }, 22), false, 'tui-3-bien') === 0,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);