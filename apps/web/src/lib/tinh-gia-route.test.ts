import {
  TINH_GIA_QUERY,
  docIdTuSearchParams,
  docIdTuUrl,
  idChiaSeBangTinh,
  ghepUrlTinhGia,
} from './tinh-gia-route';

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

console.log('tinh-gia-route');

assert('query key', TINH_GIA_QUERY === 'tinh-gia');

assert(
  'docIdTuSearchParams from string with ?',
  docIdTuSearchParams('?tinh-gia=abc-123&x=1') === 'abc-123',
);
assert(
  'docIdTuSearchParams from string without ?',
  docIdTuSearchParams('tinh-gia=xyz') === 'xyz',
);
assert(
  'docIdTuSearchParams empty',
  docIdTuSearchParams('?foo=1') === null,
);
assert(
  'docIdTuSearchParams blank value',
  docIdTuSearchParams('?tinh-gia=%20') === null,
);
assert(
  'docIdTuSearchParams URLSearchParams',
  docIdTuSearchParams(new URLSearchParams('tinh-gia=p1')) === 'p1',
);

assert(
  'docIdTuUrl full href',
  docIdTuUrl('https://app.example.com/?tinh-gia=sheet-9#top') === 'sheet-9',
);
assert(
  'docIdTuUrl no param',
  docIdTuUrl('https://app.example.com/path') === null,
);

assert(
  'idChiaSeBangTinh prefers pricingSheetId',
  idChiaSeBangTinh({ id: 'H1', pricingSheetId: 'srv-1' }) === 'srv-1',
);
assert(
  'idChiaSeBangTinh falls back to local id',
  idChiaSeBangTinh({ id: 'H1' }) === 'H1',
);
assert(
  'idChiaSeBangTinh null item',
  idChiaSeBangTinh(null) === null,
);

assert(
  'ghepUrlTinhGia set id',
  ghepUrlTinhGia('https://x.com/app?foo=1', 'A1') === '/app?foo=1&tinh-gia=A1'
    || ghepUrlTinhGia('https://x.com/app?foo=1', 'A1') === '/app?tinh-gia=A1&foo=1',
);
assert(
  'ghepUrlTinhGia clear id keeps other params',
  ghepUrlTinhGia('https://x.com/?tinh-gia=old&foo=1', null) === '/?foo=1',
);
assert(
  'ghepUrlTinhGia replace id',
  ghepUrlTinhGia('https://x.com/?tinh-gia=old', 'new') === '/?tinh-gia=new',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
