import {
  LSX_PDF_FLUSH_CELL_STYLE,
  LSX_PDF_LAM_COLUMNS,
  LSX_PDF_LAM_HALF_RIGHT_STYLE,
  LSX_PDF_STRETCH_ROW_STYLE,
  shouldRenderZipperDetails,
} from './LsxPdfDocument';

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

console.log('PDF LSX zipper visibility');

assert(
  'shows zipper details when quotation snapshot has zipper without manual fields',
  shouldRenderZipperDetails({ hasZipper: true }, { tamZipperCachMieng: 0, tearNotch: '', loTreoInfo: '', useDualCutter: false }),
);
assert(
  'does not show zipper details when neither quotation nor manual fields indicate zipper',
  !shouldRenderZipperDetails({ hasZipper: false }, { tamZipperCachMieng: 0, tearNotch: '', loTreoInfo: '', useDualCutter: false }),
);

console.log('\nPDF LSX border continuity');

assert(
  'MÁY IN row stretches to the full height of its half',
  LSX_PDF_STRETCH_ROW_STYLE?.flexGrow === 1
    && LSX_PDF_STRETCH_ROW_STYLE?.alignItems === 'stretch',
);

assert(
  'MÁY LÀM TÚI outer cell has no inset padding',
  LSX_PDF_FLUSH_CELL_STYLE?.paddingTop === 0
    && LSX_PDF_FLUSH_CELL_STYLE?.paddingBottom === 0
    && LSX_PDF_FLUSH_CELL_STYLE?.paddingLeft === 0
    && LSX_PDF_FLUSH_CELL_STYLE?.paddingRight === 0,
);

assert(
  'MÁY GHÉP closes its outer right border',
  LSX_PDF_LAM_HALF_RIGHT_STYLE?.borderRight === '0.5pt solid #000',
);

const dualKhoStart = (LSX_PDF_LAM_COLUMNS?.label ?? 0)
  + (LSX_PDF_LAM_COLUMNS?.parts ?? 0)
    * (LSX_PDF_LAM_COLUMNS?.partNameWithinParts ?? 0) / 100;

assert(
  'dual and single laminate rows start the Khổ column at the same position',
  Math.abs(dualKhoStart - (LSX_PDF_LAM_COLUMNS?.singleName ?? 0)) < 1e-9,
);

assert(
  'laminate columns fill exactly 100%',
  (LSX_PDF_LAM_COLUMNS?.label ?? 0)
    + (LSX_PDF_LAM_COLUMNS?.name ?? 0)
    + (LSX_PDF_LAM_COLUMNS?.kho ?? 0) === 100,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
