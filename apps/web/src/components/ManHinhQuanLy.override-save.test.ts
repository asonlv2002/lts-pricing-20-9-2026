/**
 * ManHinhQuanLy.override-save.test.ts - Kiem tra feedback khi luu override Sale/Admin.
 * Chay: npx tsx src/components/ManHinhQuanLy.override-save.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const source = readFileSync(resolve(process.cwd(), 'src/components/ManHinhQuanLy.tsx'), 'utf8');

console.log('\n== Override save feedback ==');

assert(
  'has reusable override save toast helper',
  /function hienToastLuuGhiDe\(\)/.test(source)
    && /Đã lưu thay đổi Sale\/Admin/.test(source),
);

assert(
  'existing-history override save shows toast after persist',
  /const handleSave = \(idLichSu: string\) => \{[\s\S]*luuGhiDe\(idLichSu\);[\s\S]*hienToastLuuGhiDe\(\);/.test(source),
);

assert(
  'new-history override save shows toast after persist',
  /const handleSaveNew = \(\) => \{[\s\S]*luuGhiDe\(newId\);[\s\S]*hienToastLuuGhiDe\(\);/.test(source),
);

if (failed > 0) {
  console.error(`\nFAILED: ${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\nPASSED: ${passed} tests`);
