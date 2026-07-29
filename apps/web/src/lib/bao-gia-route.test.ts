import {
  BAO_GIA_QUERY,
  docBaoGiaIdTuPathname,
  docBaoGiaIdTuSearchParams,
  ghepUrlBaoGia,
  taoUrlChiaSeBaoGia,
} from './bao-gia-route';

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

console.log('bao-gia-route');

assert('query key', BAO_GIA_QUERY === 'bao-gia');

assert(
  'docBaoGiaIdTuPathname',
  docBaoGiaIdTuPathname('/bao-gia/q-99') === 'q-99',
);
assert(
  'docBaoGiaIdTuPathname empty',
  docBaoGiaIdTuPathname('/tao-bao-gia') === null,
);

assert(
  'docBaoGiaIdTuSearchParams legacy',
  docBaoGiaIdTuSearchParams('?bao-gia=q-99') === 'q-99',
);

assert(
  'ghepUrlBaoGia set id',
  ghepUrlBaoGia('https://x.com/?tinh-gia=old', 'Q1') === '/bao-gia/Q1',
);
assert(
  'ghepUrlBaoGia clear → menu',
  ghepUrlBaoGia('https://x.com/?bao-gia=old&foo=1', null) === '/tao-bao-gia',
);

assert(
  'taoUrlChiaSeBaoGia path',
  (() => {
    const u = taoUrlChiaSeBaoGia('Q9');
    return !!u && u.includes('/bao-gia/Q9') && !u.includes('m=');
  })(),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
