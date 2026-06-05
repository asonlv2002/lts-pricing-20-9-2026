/**
 * auth-session.test.ts - Kiem tra tinh lich refresh access token.
 * Chay: npx tsx src/lib/auth-session.test.ts
 */

import { tinhThoiGianChoLamMoiPhien } from './auth-session';

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

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
