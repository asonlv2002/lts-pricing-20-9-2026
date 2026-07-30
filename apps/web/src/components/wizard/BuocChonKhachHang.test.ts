/**
 * BuocChonKhachHang.test.tsx - Kiem tra search + filter.
 * Chay: pnpm --filter web exec tsx src/components/wizard/BuocChonKhachHang.test.ts
 */

import { boDau } from './BuocChonKhachHang';

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

console.log('\n== boDau ==');
assert('bo dau tieng Viet', boDau('Công ty ABC') === 'cong ty abc');
assert('xu ly chu d', boDau('Cty D') === 'cty d');
assert('xu ly chu D viet hoa', boDau('Đại Lý') === 'dai ly');
assert('xu ly undefined', boDau(undefined) === '');
assert('xu ly null', boDau(null) === '');
assert('xu ly empty', boDau('') === '');

console.log('\n== Search logic (test trên data) ==');
const customers = [
  { id: '1', companyName: 'Công ty TNHH ABC', customerCode: 'KH001', phone: '0901' },
  { id: '2', companyName: 'Cty XYZ', customerCode: 'KH002', taxCode: '123456' },
  { id: '3', companyName: 'Đại lý DEF', customerCode: 'KH003' },
];

function search(q: string) {
  const qd = boDau(q.trim());
  if (!qd) return customers;
  return customers.filter((c) => {
    const haystack = [c.companyName, c.customerCode, c.taxCode, c.phone].map((v) => boDau(v ?? '')).join(' ');
    return haystack.includes(qd);
  });
}

assert('empty keyword -> tat ca', search('').length === 3);
assert('"abc" -> 1', search('abc').length === 1);
assert('"xyz" -> 1', search('xyz').length === 1);
assert('"kh001" -> 1', search('kh001').length === 1);
assert('"123456" (MST) -> 1', search('123456').length === 1);
assert('"0901" (phone) -> 1', search('0901').length === 1);
assert('"cong ty" (bo dau) -> 1', search('cong ty').length === 1);
assert('"tnhh" (bo dau) -> 1', search('tnhh').length === 1);
assert('"dai ly" (bo dau) -> 1', search('dai ly').length === 1);
assert('khong khop -> 0', search('xyz123').length === 0);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
