/**
 * customer-api-export.test.ts - Kiem tra chuanHoaTenKhach da export.
 * Chay: pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
 */

import { chuanHoaTenKhach } from './customer-api';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

console.log('\n== chuanHoaTenKhach (sau khi export) ==');
assert('bo dau + viet thuong + trim', chuanHoaTenKhach('  Công ty ABC  ') === 'cong ty abc');
assert('xu ly chu d/Đ', chuanHoaTenKhach('Đại Lý XYZ') === 'dai ly xyz');
assert('empty string', chuanHoaTenKhach('') === '');
assert('only whitespace', chuanHoaTenKhach('   ') === '');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
