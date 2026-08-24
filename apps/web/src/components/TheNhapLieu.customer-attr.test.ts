/**
 * TheNhapLieu.customer-attr.test.ts - Kiem tra input KH co data-customer-input.
 * Chay: pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const source = readFileSync(
  resolve(process.cwd(), 'src/components/TheNhapLieu.tsx'),
  'utf8',
);

console.log('\n== data-customer-input on customer input ==');

const inputBlock = source.match(/<input[\s\S]{0,400}placeholder="Tên khách hàng"[\s\S]{0,400}/);
assert('tim thay input khach hang', !!inputBlock, 'khong thay <input> voi placeholder Tên khách hàng');

if (inputBlock) {
  assert(
    'co data-customer-input="true"',
    /data-customer-input="true"/.test(inputBlock[0]),
    'attribute chua duoc them',
  );
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
