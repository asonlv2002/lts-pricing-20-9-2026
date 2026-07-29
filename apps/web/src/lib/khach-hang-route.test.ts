import {
  KHACH_HANG_QUERY,
  chuanHoaMaKhachHang,
  khopMaKhachHang,
  docKhachHangIdTuPathname,
  docKhachHangIdTuSearchParams,
  ghepUrlKhachHang,
  taoUrlChiaSeKhachHang,
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
  'docKhachHangIdTuPathname',
  docKhachHangIdTuPathname('/khach-hang/ACME_01') === 'ACME_01',
);
assert(
  'docKhachHangIdTuPathname empty',
  docKhachHangIdTuPathname('/danh-sach-khach-hang') === null,
);

assert(
  'docKhachHangIdTuSearchParams legacy',
  docKhachHangIdTuSearchParams('?khach-hang=ACME_01') === 'ACME_01',
);

assert(
  'ghepUrlKhachHang set',
  ghepUrlKhachHang('https://x.com/?tinh-gia=old', 'ACME_01') === '/khach-hang/ACME_01',
);
assert(
  'ghepUrlKhachHang clear → menu',
  ghepUrlKhachHang('https://x.com/?khach-hang=old&foo=1', null) === '/danh-sach-khach-hang',
);

assert(
  'taoUrlChiaSeKhachHang path',
  (() => {
    const u = taoUrlChiaSeKhachHang('ACME_01');
    return !!u && u.includes('/khach-hang/ACME_01') && !u.includes('m=');
  })(),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
