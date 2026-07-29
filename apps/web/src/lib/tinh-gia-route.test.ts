import {
  TINH_GIA_QUERY,
  docIdTuPathname,
  docIdTuSearchParams,
  docIdTuUrl,
  idChiaSeBangTinh,
  ghepUrlTinhGia,
  taoUrlChiaSeTinhGia,
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

assert('query key constant kept for labels', TINH_GIA_QUERY === 'tinh-gia');

assert(
  'docIdTuPathname',
  docIdTuPathname('/tinh-gia/abc-123') === 'abc-123',
);
assert(
  'docIdTuPathname menu null',
  docIdTuPathname('/danh-sach-tinh-gia') === null,
);

assert(
  'docIdTuUrl path',
  docIdTuUrl('https://app.example.com/tinh-gia/sheet-9#top') === 'sheet-9',
);
assert(
  'docIdTuUrl no param',
  docIdTuUrl('https://app.example.com/path') === null,
);

// Legacy query still readable if present
assert(
  'docIdTuSearchParams legacy',
  docIdTuSearchParams('?tinh-gia=abc-123&x=1') === 'abc-123',
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
  ghepUrlTinhGia('https://x.com/app?foo=1', 'A1') === '/tinh-gia/A1',
);
assert(
  'ghepUrlTinhGia clear → menu path',
  ghepUrlTinhGia('https://x.com/?tinh-gia=old&foo=1', null) === '/tao-tinh-gia',
);
assert(
  'ghepUrlTinhGia replace id',
  ghepUrlTinhGia('https://x.com/tinh-gia/old', 'new') === '/tinh-gia/new',
);

assert(
  'taoUrlChiaSeTinhGia null when empty',
  taoUrlChiaSeTinhGia('') === null && taoUrlChiaSeTinhGia(null) === null,
);

assert(
  'taoUrlChiaSeTinhGia path',
  (() => {
    const u = taoUrlChiaSeTinhGia('sheet-1');
    return !!u && u.includes('/tinh-gia/sheet-1') && !u.includes('m=');
  })(),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
