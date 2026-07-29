/**
 * Regression checks for the inline print-press labor formulas.
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
const dataSource = readFileSync(resolve(process.cwd(), 'src/lib/data.ts'), 'utf8');
const typesSource = readFileSync(resolve(process.cwd(), 'src/lib/types.ts'), 'utf8');
const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
function sliceCard(startTitle: string, endTitle: string): string {
  const start = source.indexOf(`tieuDe="${startTitle}"`);
  const end = source.indexOf(`tieuDe="${endTitle}"`, start + 1);
  if (start < 0) throw new Error(`Card not found: ${startTitle}`);
  return source.slice(start, end < 0 ? source.length : end);
}

const printLaborSource = sliceCard(
  'Lương nhân công máy in',
  'Chi phí điện máy in',
);
const electricInSource = sliceCard('Chi phí điện máy in', 'Thời gian sản xuất in');
const timeInSource = sliceCard('Thời gian sản xuất in', 'Lương nhân công máy ghép');
const laborGhepSource = sliceCard(
  'Lương nhân công máy ghép',
  'Chi phí điện máy ghép',
);
const electricGhepSource = sliceCard(
  'Chi phí điện máy ghép',
  'Thời gian sản xuất ghép',
);
const timeGhepSource = sliceCard(
  'Thời gian sản xuất ghép',
  'Lương nhân công máy chia',
);
const laborChiaSource = sliceCard(
  'Lương nhân công máy chia',
  'Chi phí điện máy chia',
);
const electricChiaSource = sliceCard(
  'Chi phí điện máy chia',
  'Thời gian sản xuất chia',
);
const timeChiaSource = sliceCard(
  'Thời gian sản xuất chia',
  'Lương nhân công máy làm túi',
);
const laborTuiSource = sliceCard(
  'Lương nhân công máy làm túi',
  'Chi phí điện máy làm túi',
);
const electricTuiSource = sliceCard(
  'Chi phí điện máy làm túi',
  'Thời gian sản xuất cắt',
);
const timeTuiSource = source.slice(
  source.indexOf('tieuDe="Thời gian sản xuất cắt"'),
);

console.log('\n== Print press labor inline formula layout ==');

assert(
  'card uses inline formula rows instead of its old preview box',
  printLaborSource.includes('config-print-press-labor__formula-row')
    && printLaborSource.includes('config-print-press-labor__formula-input')
    && !printLaborSource.includes('config-print-press-labor__preview')
    && !printLaborSource.includes('Preview công thức'),
);

assert(
  'meal and overtime formulas share the editable shift divisor',
  typesSource.includes('shiftDivisor: number;')
    && dataSource.includes('shiftDivisor: 2,')
    && source.includes('DEFAULT_PRINT_PRESS_LABOR.shiftDivisor')
    && printLaborSource.includes('aria-label="Mẫu số chia công nhân theo ca"')
    && (printLaborSource.match(/soNguoiMoiCaMayIn/g) ?? []).length >= 3
    && source.includes('printPressLabor.mealMorning * soCongNhanMayIn / soNguoiMoiCaMayIn')
    && source.includes('printPressLabor.mealEvening * soCongNhanMayIn / soNguoiMoiCaMayIn')
    && source.includes('tongLuongMayIn / soNguoiMoiCaMayIn'),
);

assert(
  'mobile controls remain touch friendly and scoped to the config page',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-print-press-labor__delete,[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/.test(globalsCss),
);

console.log('\n== Inline sync across labor / electric / time cards ==');

assert(
  'no card keeps the old preview/result box',
  !source.includes('config-print-press-labor__preview')
    && !source.includes('config-print-press-labor__result')
    && !source.includes('Preview công thức')
    && !source.includes('Review công thức'),
);

assert(
  'no delete control still uses the trash emoji inside config cards',
  !laborTuiSource.includes('🗑')
    && !timeChiaSource.includes('🗑')
    && !timeTuiSource.includes('🗑'),
);

assert(
  'electric cards render an inline formula row (in/ghep/chia/tui)',
  electricInSource.includes('config-print-press-labor__formula-row')
    && electricGhepSource.includes('config-print-press-labor__formula-row')
    && electricChiaSource.includes('config-print-press-labor__formula-row')
    && electricTuiSource.includes('config-print-press-labor__formula-row'),
);

assert(
  'simple time cards (in/ghep) embed config values inside the T formula',
  timeInSource.includes('config-print-press-labor__formula-row--wrap')
    && timeInSource.includes('T = số màu × ( lên trục')
    && timeInSource.includes('printPressTime.avgSpeedMPerMin')
    && !timeInSource.includes('Thời gian lên trục =')
    && timeGhepSource.includes('config-print-press-labor__formula-row--wrap')
    && timeGhepSource.includes('T = Setup lần đầu')
    && timeGhepSource.includes('laminatePressTime.avgSpeedMPerMin')
    && !timeGhepSource.includes('Setup lần 1 ='),
);

assert(
  'rule-table time cards (chia/tui) drop the old preview and use an inline note',
  !timeChiaSource.includes('config-print-press-labor__preview')
    && !timeTuiSource.includes('config-print-press-labor__preview')
    && timeChiaSource.includes('config-note')
    && timeTuiSource.includes('config-note'),
);

assert(
  'ghep labor card uses inline formula rows',
  laborGhepSource.includes('config-print-press-labor__formula-row')
    && laborGhepSource.includes('config-print-press-labor__formula-input'),
);

assert(
  'chia labor card uses inline formula rows',
  laborChiaSource.includes('config-print-press-labor__formula-row')
    && laborChiaSource.includes('config-print-press-labor__formula-input'),
);

assert(
  'tui labor card uses inline formula rows with per-shift meal counts',
  laborTuiSource.includes('config-print-press-labor__formula-row')
    && laborTuiSource.includes('config-print-press-labor__formula-input')
    && source.includes('bagPressLabor.mealMorning * bagMorningWages.length')
    && source.includes('bagPressLabor.mealEvening * bagEveningWages.length'),
);

if (failed > 0) {
  console.error(`\n${failed} print labor checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} print labor checks passed.`);
