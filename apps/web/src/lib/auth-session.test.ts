/**
 * auth-session.test.ts - Kiem tra tinh lich refresh access token.
 * Chay: npx tsx src/lib/auth-session.test.ts
 */

import { docThoiDiemHetHanJwt, laLoiRefreshHetPhien, quyetDinhDongBoTokenThongQuaStorage, tinhThoiGianChoLamMoiPhien } from './auth-session';

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

function taoJwtHetHan(expSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `header.${payload}.signature`;
}

function taoJwt(payload: Record<string, unknown>) {
  return `header.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.signature`;
}

console.log('\n== Auth session refresh schedule ==');

const nowMs = 1_000_000;

assert(
  'schedules refresh one minute before token expiration',
  tinhThoiGianChoLamMoiPhien(taoJwtHetHan(Math.floor(nowMs / 1000) + 15 * 60), nowMs) === 14 * 60 * 1000,
  String(tinhThoiGianChoLamMoiPhien(taoJwtHetHan(Math.floor(nowMs / 1000) + 15 * 60), nowMs)),
);

assert(
  'refreshes immediately when token expires within one minute',
  tinhThoiGianChoLamMoiPhien(taoJwtHetHan(Math.floor(nowMs / 1000) + 30), nowMs) === 0,
  String(tinhThoiGianChoLamMoiPhien(taoJwtHetHan(Math.floor(nowMs / 1000) + 30), nowMs)),
);

assert(
  'uses fallback interval when token expiration cannot be decoded',
  tinhThoiGianChoLamMoiPhien('not-a-jwt', nowMs) === 14 * 60 * 1000,
  String(tinhThoiGianChoLamMoiPhien('not-a-jwt', nowMs)),
);

assert(
  'decodes UTF-8 JWT payload fields without mojibake',
  (() => {
    const token = taoJwt({ exp: 1_700_000_000, fullName: 'Lai Trường Sơn' });
    const originalWindow = globalThis.window;
    const fakeWindow = {
      atob(value: string) {
        return Buffer.from(value, 'base64').toString('latin1');
      },
    } as Window & typeof globalThis;

    try {
      Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true, writable: true });
      return docThoiDiemHetHanJwt(token) === 1_700_000_000 * 1000;
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: Window }).window;
      } else {
        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true, writable: true });
      }
    }
  })(),
);

console.log('\n== Auth refresh failure classification ==');

assert(
  'treats 401 refresh failure as expired session',
  laLoiRefreshHetPhien({ status: 401 }) === true,
);

assert(
  'does not treat temporary server failure as expired session',
  laLoiRefreshHetPhien({ status: 500 }) === false,
);

assert(
  'does not treat network failure as expired session',
  laLoiRefreshHetPhien(new Error('Không kết nối được tới máy chủ.')) === false,
);

console.log('\n== Đồng bộ token giữa các tab qua storage event ==');

assert(
  'tab khác rotate token → nhận cặp token mới từ localStorage',
  (() => {
    const q = quyetDinhDongBoTokenThongQuaStorage({
      refreshTokenLs: 'R2',
      accessTokenLs: 'A2',
      refreshTokenHienTai: 'R1',
    });
    return q.hanhDong === 'apDung' && q.accessToken === 'A2' && q.refreshToken === 'R2';
  })(),
);

assert(
  'tab khác đăng xuất (LS rỗng) → đăng xuất theo',
  quyetDinhDongBoTokenThongQuaStorage({
    refreshTokenLs: null,
    accessTokenLs: null,
    refreshTokenHienTai: 'R1',
  }).hanhDong === 'dangXuat',
);

assert(
  'token LS trùng memory → bỏ qua',
  quyetDinhDongBoTokenThongQuaStorage({
    refreshTokenLs: 'R1',
    accessTokenLs: 'A1',
    refreshTokenHienTai: 'R1',
  }).hanhDong === 'boQua',
);

assert(
  'tab này chưa đăng nhập → không tự nhận session hộ',
  quyetDinhDongBoTokenThongQuaStorage({
    refreshTokenLs: 'R2',
    accessTokenLs: 'A2',
    refreshTokenHienTai: null,
  }).hanhDong === 'boQua',
);

assert(
  'LS thiếu access token (ghi dở) → bỏ qua, chờ event kế',
  quyetDinhDongBoTokenThongQuaStorage({
    refreshTokenLs: 'R2',
    accessTokenLs: null,
    refreshTokenHienTai: 'R1',
  }).hanhDong === 'boQua',
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
