/**
 * ManHinhQuanLy.print-film-override-layout.test.ts - Kiem tra layout override mang in giong bang goc.
 * Chay: npx tsx src/components/ManHinhQuanLy.print-film-override-layout.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const source = readFileSync(join(process.cwd(), 'src/components/ManHinhQuanLy.tsx'), 'utf8');

console.log('\n== Print film override layout ==');

const bangGhiDeStart = source.indexOf('function BangGhiDe');
const bangGhiDeEnd = source.indexOf('// ── Helpers đẩy pricing sheet lên server');
const bangGhiDeSource = source.slice(bangGhiDeStart, bangGhiDeEnd);

assert('finds BangGhiDe source', bangGhiDeStart >= 0 && bangGhiDeEnd > bangGhiDeStart);
assert('override table uses CP theo thời gian in row', bangGhiDeSource.includes('CP theo thời gian in'));
assert('override table does not use CP Màng in column', !bangGhiDeSource.includes('CP Màng in'), bangGhiDeSource.match(/CP Màng in/g)?.join(',') ?? '');
assert('override total production cost uses print film cost', bangGhiDeSource.includes('tongCPSX + tongCPVL + cpMangIn'));
assert('override table shows price delta from original price', bangGhiDeSource.includes('CHÊNH LỆCH SO VỚI GIÁ GỐC'));
assert('override table supports bag and film delta units', source.includes('ĐỒNG / TÚI') && source.includes('ĐỒNG / MÉT VUÔNG'));

if (failed > 0) {
  console.error(`\nFAILED: ${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\nPASSED: ${passed} tests`);
