/**
 * Regression checks cho CPSX cũ (Labor/Electric/Time) đã xóa khỏi UI — toàn bộ chuyển sang CPSX nâng cao.
 * Run: pnpm exec tsx src/components/TrangCauHinh.print-labor-inline.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}`);
    failed++;
  }
}

const source = readFileSync(
  resolve(process.cwd(), 'src/components/TrangCauHinh.tsx'),
  'utf8',
);
const typesSource = readFileSync(resolve(process.cwd(), 'src/lib/types.ts'), 'utf8');
const dataSource = readFileSync(resolve(process.cwd(), 'src/lib/data.ts'), 'utf8');
const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

console.log('\n== 12 thẻ Labor/Electric/Time cũ đã xóa (CPSX nâng cao thay thế) ==');

assert(
  '4 thẻ Lương nhân công máy X đã xóa',
  !source.includes('tieuDe="Lương nhân công máy in"')
    && !source.includes('tieuDe="Lương nhân công máy ghép"')
    && !source.includes('tieuDe="Lương nhân công máy chia"')
    && !source.includes('tieuDe="Lương nhân công máy làm túi"'),
);

assert(
  '4 thẻ Chi phí điện máy X đã xóa',
  !source.includes('tieuDe="Chi phí điện máy in"')
    && !source.includes('tieuDe="Chi phí điện máy ghép"')
    && !source.includes('tieuDe="Chi phí điện máy chia"')
    && !source.includes('tieuDe="Chi phí điện máy làm túi"'),
);

assert(
  '4 thẻ Thời gian sản xuất X đã xóa (lần trước)',
  !source.includes('tieuDe="Thời gian sản xuất in"')
    && !source.includes('tieuDe="Thời gian sản xuất ghép"')
    && !source.includes('tieuDe="Thời gian sản xuất chia"')
    && !source.includes('tieuDe="Thời gian sản xuất cắt"'),
);

assert(
  '8 interface Labor/Electric đã xóa khỏi types.ts',
  !typesSource.includes('export interface PrintPressLabor ')
    && !typesSource.includes('export interface PrintPressElectric ')
    && !typesSource.includes('export interface LaminatePressLabor ')
    && !typesSource.includes('export interface LaminatePressElectric ')
    && !typesSource.includes('export interface SlitPressLabor ')
    && !typesSource.includes('export interface SlitPressElectric ')
    && !typesSource.includes('export interface BagPressLabor ')
    && !typesSource.includes('export interface BagPressElectric '),
);

assert(
  '8 field AppConstants *PressLabor/*PressElectric đã xóa',
  !typesSource.includes('printPressLabor?:')
    && !typesSource.includes('printPressElectric?:')
    && !typesSource.includes('laminatePressLabor?:')
    && !typesSource.includes('laminatePressElectric?:')
    && !typesSource.includes('slitPressLabor?:')
    && !typesSource.includes('slitPressElectric?:')
    && !typesSource.includes('bagPressLabor?:')
    && !typesSource.includes('bagPressElectric?:'),
);

assert(
  '8 default constant đã xóa khỏi data.ts',
  !dataSource.includes('DEFAULT_PRINT_PRESS_LABOR')
    && !dataSource.includes('DEFAULT_PRINT_PRESS_ELECTRIC')
    && !dataSource.includes('DEFAULT_LAMINATE_PRESS_LABOR')
    && !dataSource.includes('DEFAULT_LAMINATE_PRESS_ELECTRIC')
    && !dataSource.includes('DEFAULT_SLIT_PRESS_LABOR')
    && !dataSource.includes('DEFAULT_SLIT_PRESS_ELECTRIC')
    && !dataSource.includes('DEFAULT_BAG_PRESS_LABOR')
    && !dataSource.includes('DEFAULT_BAG_PRESS_ELECTRIC'),
);

console.log('\n== Mobile CSS cho CPSX cũ vẫn còn (legacy) ==');

assert(
  'mobile controls remain touch friendly and scoped to the config page',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-print-press-labor__delete,[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/.test(globalsCss),
);

if (failed > 0) {
  console.error(`\n${failed} CPSX cũ checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} CPSX cũ checks passed.`);
