import {
  BAO_GIA_QUERY,
  docBaoGiaIdTuSearchParams,
  ghepUrlBaoGia,
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
  'docBaoGiaIdTuSearchParams',
  docBaoGiaIdTuSearchParams('?bao-gia=q-99') === 'q-99',
);
assert(
  'docBaoGiaIdTuSearchParams empty',
  docBaoGiaIdTuSearchParams('?tinh-gia=1') === null,
);
assert(
  'docBaoGiaIdTuSearchParams blank',
  docBaoGiaIdTuSearchParams('?bao-gia=%20') === null,
);

assert(
  'ghepUrlBaoGia set id clears tinh-gia',
  ghepUrlBaoGia('https://x.com/?tinh-gia=old', 'Q1') === '/?bao-gia=Q1',
);
assert(
  'ghepUrlBaoGia clear keeps other params',
  ghepUrlBaoGia('https://x.com/?bao-gia=old&foo=1', null) === '/?foo=1',
);
assert(
  'ghepUrlBaoGia set with other params',
  ghepUrlBaoGia('https://x.com/?foo=1', 'Q2') === '/?foo=1&bao-gia=Q2'
    || ghepUrlBaoGia('https://x.com/?foo=1', 'Q2') === '/?bao-gia=Q2&foo=1',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
