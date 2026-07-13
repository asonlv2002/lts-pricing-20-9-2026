import {
  DEEP_LINK_QUERY_KEYS,
  docQueryParam,
  docDeepLinkTuSearchParams,
  ghepUrlQueryExclusive,
  tieuDeKhongTimThay,
} from './support-route';
import { TINH_GIA_QUERY } from './tinh-gia-route';
import { BAO_GIA_QUERY } from './bao-gia-route';

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

console.log('support-route');

assert(
  'DEEP_LINK_QUERY_KEYS has both domains',
  DEEP_LINK_QUERY_KEYS.includes('tinh-gia') && DEEP_LINK_QUERY_KEYS.includes('bao-gia'),
);

assert(
  'docQueryParam reads key',
  docQueryParam('?tinh-gia=abc&x=1', 'tinh-gia') === 'abc',
);
assert(
  'docQueryParam blank null',
  docQueryParam('?tinh-gia=%20', 'tinh-gia') === null,
);
assert(
  'docQueryParam missing null',
  docQueryParam('?foo=1', 'tinh-gia') === null,
);

const candidates = [
  { loai: 'tinh-gia' as const, key: TINH_GIA_QUERY },
  { loai: 'bao-gia' as const, key: BAO_GIA_QUERY },
];

assert(
  'docDeepLink prefers first candidate',
  (() => {
    const d = docDeepLinkTuSearchParams('?tinh-gia=A&bao-gia=B', candidates);
    return d?.loai === 'tinh-gia' && d.id === 'A';
  })(),
);
assert(
  'docDeepLink second candidate',
  (() => {
    const d = docDeepLinkTuSearchParams('?bao-gia=Q1', candidates);
    return d?.loai === 'bao-gia' && d.id === 'Q1';
  })(),
);
assert(
  'docDeepLink none',
  docDeepLinkTuSearchParams('?x=1', candidates) === null,
);

assert(
  'ghepUrlQueryExclusive set clears other deep links',
  ghepUrlQueryExclusive('https://x.com/?tinh-gia=old&foo=1', {
    key: BAO_GIA_QUERY,
    id: 'Q1',
  }) === '/?foo=1&bao-gia=Q1'
    || ghepUrlQueryExclusive('https://x.com/?tinh-gia=old&foo=1', {
      key: BAO_GIA_QUERY,
      id: 'Q1',
    }) === '/?bao-gia=Q1&foo=1',
);
assert(
  'ghepUrlQueryExclusive clear only',
  ghepUrlQueryExclusive('https://x.com/?tinh-gia=old&bao-gia=Q&foo=1', null) === '/?foo=1',
);

assert(
  'tieuDeKhongTimThay tinh-gia',
  tieuDeKhongTimThay('tinh-gia') === 'Không tìm thấy dữ liệu của Tính giá',
);
assert(
  'tieuDeKhongTimThay bao-gia',
  tieuDeKhongTimThay('bao-gia') === 'Không tìm thấy dữ liệu của Báo giá',
);
assert(
  'tieuDeKhongTimThay khach-hang',
  tieuDeKhongTimThay('khach-hang') === 'Không tìm thấy dữ liệu của Khách hàng',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
