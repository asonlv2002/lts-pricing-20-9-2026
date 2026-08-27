/**
 * SlidePanelLsxEdit.test.ts - Kiem tra pattern gan chu ky trong SlidePanelLsxEdit.
 * Chay: pnpm --filter web exec tsx src/components/lsx/SlidePanelLsxEdit.test.ts
 *
 * Regression: 2026-08-27 — handleXemDocx khong goi themChuKyVaoManual nen DOCX preview
 * khong co chu ky (user phan anh "chữ ký ko gắn vào file trong lsx").
 * Pattern: ca handleXemPdf va handleXemDocx deu can them chu ky vao manual truoc khi set
 * vao orderPreview.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(__dirname, 'SlidePanelLsxEdit.tsx'), 'utf8');

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

function layThanFunction(ten: string): string {
  const regex = new RegExp(`((?:async\\s+)?function\\s+${ten}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s{2}\\})`, 'm');
  const match = SOURCE.match(regex);
  return match ? match[1] : '';
}

console.log('\n== SlidePanelLsxEdit signature pattern ==');

const fnPdf = layThanFunction('handleXemPdf');
const fnDocx = layThanFunction('handleXemDocx');

assert('tim thay handleXemPdf trong source', fnPdf.length > 0);
assert('tim thay handleXemDocx trong source', fnDocx.length > 0);

if (fnPdf) {
  assert(
    'handleXemPdf goi themChuKyVaoManual',
    fnPdf.includes('themChuKyVaoManual'),
    'handleXemPdf phai goi themChuKyVaoManual truoc khi set vao orderPreview.manual',
  );
  assert(
    'handleXemPdf gan vao orderPreview.manual',
    /orderPreview\.manual\s*=\s*await\s+themChuKyVaoManual/.test(fnPdf),
    'handleXemPdf phai gan ket qua themChuKyVaoManual vao orderPreview.manual',
  );
}

if (fnDocx) {
  assert(
    'handleXemDocx goi themChuKyVaoManual',
    fnDocx.includes('themChuKyVaoManual'),
    'handleXemDocx phai goi themChuKyVaoManual truoc khi set vao orderPreview.manual (regression 2026-08-27)',
  );
  assert(
    'handleXemDocx gan vao orderPreview.manual',
    /orderPreview\.manual\s*=\s*await\s+themChuKyVaoManual/.test(fnDocx),
    'handleXemDocx phai gan ket qua themChuKyVaoManual vao orderPreview.manual',
  );
  assert(
    'handleXemDocx la async function',
    /async\s+function\s+handleXemDocx/.test(fnDocx),
    'handleXemDocx phai la async vi themChuKyVaoManual tra ve Promise',
  );
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
