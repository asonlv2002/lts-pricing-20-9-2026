/**
 * lsx-quy-cach.test.ts — khối Quy cách LSX (dung sai R/D, xếp đáy, dòng in ra).
 * Chạy: npx tsx src/lib/lsx-quy-cach.test.ts
 */

import {
  buildLsxQuyCachLines,
  formatLsxFoldBottom,
  formatLsxQuyCach,
} from './lsx-quy-cach';

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

console.log('formatLsxQuyCach');

{
  const text = formatLsxQuyCach({ widthMm: 220, lengthMm: 320, tolWidthMm: 2, tolLengthMm: 2 });
  assert('gắn dung sai cho cả rộng và dài', text === 'R:220mm (±2mm) x D:320mm (±2mm)', text);
}
{
  const text = formatLsxQuyCach({ widthMm: 220, lengthMm: 320, tolWidthMm: 3, tolLengthMm: 5 });
  assert('dung sai rộng và dài nhập riêng', text === 'R:220mm (±3mm) x D:320mm (±5mm)', text);
}
{
  const text = formatLsxQuyCach({ widthMm: 220, lengthMm: 320, tolWidthMm: 0, tolLengthMm: 0 });
  assert('không dung sai thì bỏ ngoặc', text === 'R:220mm x D:320mm', text);
}

console.log('\nformatLsxFoldBottom');

assert('tự chia đôi xếp đáy', formatLsxFoldBottom('100mm') === '100mm (50mm / Bên)', formatLsxFoldBottom('100mm'));
assert('nhập số thuần vẫn ra mm', formatLsxFoldBottom('100') === '100mm (50mm / Bên)', formatLsxFoldBottom('100'));
assert('giữ nguyên khi không parse được số', formatLsxFoldBottom('theo mẫu') === 'theo mẫu');
assert('rỗng trả rỗng', formatLsxFoldBottom('') === '');

console.log('\nbuildLsxQuyCachLines');

{
  const lines = buildLsxQuyCachLines(
    {
      quyCachNote: '',
      quyCachToleranceWidthMm: 2,
      quyCachToleranceLengthMm: 2,
      tamZipperCachMieng: 0,
      foldBottom: '',
      sealEdge: '',
      tearNotch: '',
    },
    {
      productType: 'tui',
      spreadWidth: 0.56,
      cutStep: 0.18,
      bagWidthMm: 250,
      bagLengthMm: 180,
      hasZipper: false,
    },
  );
  assert(
    'ưu tiên R/D thành phẩm từ báo giá, không dùng khổ trải',
    lines[0] === 'Quy cách: R:250mm (±2mm) x D:180mm (±2mm)',
    lines[0],
  );
}

{
  const lines = buildLsxQuyCachLines(
    {
      quyCachNote: '',
      quyCachToleranceWidthMm: 2,
      quyCachToleranceLengthMm: 2,
      tamZipperCachMieng: 30,
      foldBottom: '100mm',
      sealEdge: '10mm',
      tearNotch: '2 bên cách miệng 15mm',
    },
    { productType: 'tui', spreadWidth: 0.22, cutStep: 0.32, hasZipper: true },
  );
  assert('dòng 1 là quy cách R/D kèm dung sai', lines[0] === 'Quy cách: R:220mm (±2mm) x D:320mm (±2mm)', lines[0]);
  assert('có dòng zipper cách đầu', lines.includes('Tâm zipper cách đầu: 30mm'), lines.join(' | '));
  assert('xếp đáy kèm nửa mỗi bên', lines.includes('Xếp đáy: 100mm (50mm / Bên)'), lines.join(' | '));
  assert('có dòng hàn biên', lines.includes('Hàn biên: 10mm'), lines.join(' | '));
  assert('có dòng nhấn xé', lines.includes('Nhấn xé "v" 2 bên cách miệng 15mm'), lines.join(' | '));
  assert('đúng 5 dòng', lines.length === 5, String(lines.length));
}

{
  const lines = buildLsxQuyCachLines(
    {
      quyCachNote: '',
      quyCachToleranceWidthMm: 2,
      quyCachToleranceLengthMm: 2,
      tamZipperCachMieng: 0,
      foldBottom: '',
      sealEdge: '',
      tearNotch: '',
    },
    { productType: 'tui', spreadWidth: 0.22, cutStep: 0.32, hasZipper: false },
  );
  assert('bỏ field trống, chỉ còn quy cách', lines.length === 1, lines.join(' | '));
  assert(
    'LSX cũ không có R/D báo giá vẫn fallback khổ trải/bước cắt',
    lines[0] === 'Quy cách: R:220mm (±2mm) x D:320mm (±2mm)',
    lines[0],
  );
}

{
  const lines = buildLsxQuyCachLines(
    {
      quyCachNote: 'R:250mm x D:500mm',
      quyCachToleranceWidthMm: 2,
      quyCachToleranceLengthMm: 2,
      tamZipperCachMieng: 0,
      foldBottom: '',
      sealEdge: '',
      tearNotch: '',
    },
    { productType: 'tui', spreadWidth: 0.22, cutStep: 0.32, hasZipper: false },
  );
  assert('ưu tiên quyCachNote khi admin sửa tay', lines[0] === 'Quy cách: R:250mm x D:500mm', lines[0]);
}

{
  const lines = buildLsxQuyCachLines(
    {
      quyCachNote: '',
      tamZipperCachMieng: 0,
      foldBottom: '',
      sealEdge: '',
      tearNotch: '',
    },
    { productType: 'tui', spreadWidth: 0.22, cutStep: 0.32, hasZipper: false },
  );
  assert(
    'default tolerance R ±2mm D ±3mm',
    lines[0] === 'Quy cách: R:220mm (±2mm) x D:320mm (±3mm)',
    lines[0],
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
