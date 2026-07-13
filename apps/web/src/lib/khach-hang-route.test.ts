import {
  KHACH_HANG_QUERY,
  chuanHoaMaKhachHang,
  khopMaKhachHang,
  docKhachHangIdTuSearchParams,
  ghepUrlKhachHang,
} from './khach-hang-route';

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

console.log('khach-hang-route');

assert('query key', KHACH_HANG_QUERY === 'khach-hang');

assert(
  'chuanHoaMaKhachHang upper+trim',
  chuanHoaMaKhachHang('  acme_01 ') === 'ACME_01',
);
assert(
  'khopMaKhachHang ignores case',
  khopMaKhachHang('acme_01', 'ACME_01') === true,
);
assert(
  'khopMaKhachHang empty false',
  khopMaKhachHang('', 'ACME_01') === false,
);

assert(
  'docKhachHangIdTuSearchParams',
  docKhachHangIdTuSearchParams('?khach-hang=ACME_01') === 'ACME_01',
);
assert(
  'docKhachHangIdTuSearchParams empty',
  docKhachHangIdTuSearchParams('?tinh-gia=1') === null,
);
assert(
  'docKhachHangIdTuSearchParams blank',
  docKhachHangIdTuSearchParams('?khach-hang=%20') === null,
);

assert(
  'ghepUrlKhachHang set clears other deep links',
  ghepUrlKhachHang('https://x.com/?tinh-gia=old', 'ACME_01') === '/?khach-hang=ACME_01',
);
assert(
  'ghepUrlKhachHang clear keeps other params',
  ghepUrlKhachHang('https://x.com/?khach-hang=old&foo=1', null) === '/?foo=1',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
