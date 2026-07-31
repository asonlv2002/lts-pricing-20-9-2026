import {
  chuanHoaPathname,
  docDeepLinkTuPathname,
  docIdChiTietDanhSachBaoGia,
  docMenuKeyTuPathname,
  laMobileHubMenuKey,
  menuKeyTuModule,
  menuMacDinhKhiDeepLink,
  moduleTuMenuKey,
  parsePathname,
  taoPathChiTietDanhSachBaoGia,
  taoPathEntity,
  taoPathMenu,
  type MucMenuRoute,
} from './menu-route';

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

console.log('menu-route (path)');

assert('chuanHoaPathname root', chuanHoaPathname('/') === '/');
assert('chuanHoaPathname strip slash', chuanHoaPathname('/tao-tinh-gia/') === '/tao-tinh-gia');

assert(
  'laMobileHubMenuKey true',
  laMobileHubMenuKey('mobile.hub.pricing_quote'),
);
assert('laMobileHubMenuKey false', !laMobileHubMenuKey('danh-sach-tinh-gia'));

assert(
  'menuMacDinhKhiDeepLink tinh-gia',
  menuMacDinhKhiDeepLink('tinh-gia') === 'tao-tinh-gia',
);
assert(
  'menuKeyTuModule calculator',
  menuKeyTuModule('calculator') === 'tao-tinh-gia',
);

const mucs: MucMenuRoute[] = [
  { key: 'danh-sach-tinh-gia', id: 'history_db' },
  { key: 'danh-sach-khach-hang', id: 'customers' },
  { key: 'tao-tinh-gia', id: 'calculator' },
];

assert(
  'moduleTuMenuKey known',
  moduleTuMenuKey('danh-sach-tinh-gia', mucs) === 'history_db',
);
assert(
  'moduleTuMenuKey hub null',
  moduleTuMenuKey('mobile.hub.overview', mucs) === null,
);

assert('taoPathMenu menu', taoPathMenu('danh-sach-tinh-gia') === '/danh-sach-tinh-gia');
assert(
  'taoPathMenu hub',
  taoPathMenu('mobile.hub.pricing_quote') === '/hub/pricing_quote',
);
assert('taoPathMenu empty root', taoPathMenu('') === '/');

assert(
  'taoPathEntity tinh-gia',
  taoPathEntity('tinh-gia', 'sheet-1') === '/tinh-gia/sheet-1',
);
assert(
  'taoPathEntity empty falls back menu',
  taoPathEntity('bao-gia', '') === '/tao-bao-gia',
);
assert(
  'taoPathEntity encodes',
  taoPathEntity('khach-hang', 'ACME 01') === '/khach-hang/ACME%2001',
);

assert('parse root', parsePathname('/').loai === 'root');
assert(
  'parse menu',
  (() => {
    const p = parsePathname('/danh-sach-tinh-gia');
    return p.loai === 'menu' && p.menuKey === 'danh-sach-tinh-gia';
  })(),
);
assert(
  'parse hub',
  (() => {
    const p = parsePathname('/hub/overview');
    return p.loai === 'hub' && p.menuKey === 'mobile.hub.overview' && p.hubId === 'overview';
  })(),
);
assert(
  'parse entity',
  (() => {
    const p = parsePathname('/tinh-gia/abc-1');
    return p.loai === 'entity' && p.entity === 'tinh-gia' && p.id === 'abc-1' && p.menuKey === 'tao-tinh-gia';
  })(),
);
assert(
  'parse entity bao-gia',
  (() => {
    const p = parsePathname('/bao-gia/Q9');
    return p.loai === 'entity' && p.entity === 'bao-gia' && p.id === 'Q9';
  })(),
);
assert(
  'parse entity lsx',
  (() => {
    const p = parsePathname('/lsx/order-1');
    return p.loai === 'entity' && p.entity === 'lsx' && p.id === 'order-1' && p.menuKey === 'danh-sach-lsx';
  })(),
);
assert(
  'taoPathEntity lsx',
  taoPathEntity('lsx', 'ord-9') === '/lsx/ord-9',
);
assert(
  'docMenuKeyTuPathname menu',
  docMenuKeyTuPathname('/tao-tinh-gia') === 'tao-tinh-gia',
);
assert(
  'docDeepLinkTuPathname',
  (() => {
    const d = docDeepLinkTuPathname('/khach-hang/ACME');
    return d?.loai === 'khach-hang' && d.id === 'ACME';
  })(),
);
assert(
  'docDeepLinkTuPathname null on menu',
  docDeepLinkTuPathname('/danh-sach-tinh-gia') === null,
);
assert(
  'parse menu-detail danh-sach-bao-gia',
  (() => {
    const p = parsePathname('/danh-sach-bao-gia/Q-123');
    return (
      p.loai === 'menu-detail' &&
      p.menuKey === 'danh-sach-bao-gia' &&
      p.id === 'Q-123'
    );
  })(),
);
assert(
  'docMenuKeyTuPathname menu-detail',
  docMenuKeyTuPathname('/danh-sach-bao-gia/Q-123') === 'danh-sach-bao-gia',
);
assert(
  'docIdChiTietDanhSachBaoGia',
  docIdChiTietDanhSachBaoGia('/danh-sach-bao-gia/Q-123') === 'Q-123',
);
assert(
  'docIdChiTietDanhSachBaoGia null on list',
  docIdChiTietDanhSachBaoGia('/danh-sach-bao-gia') === null,
);
assert(
  'taoPathChiTietDanhSachBaoGia with id',
  taoPathChiTietDanhSachBaoGia('Q-123') === '/danh-sach-bao-gia/Q-123',
);
assert(
  'taoPathChiTietDanhSachBaoGia empty',
  taoPathChiTietDanhSachBaoGia('') === '/danh-sach-bao-gia',
);
assert(
  'docDeepLinkTuPathname null on menu-detail',
  docDeepLinkTuPathname('/danh-sach-bao-gia/Q-123') === null,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
