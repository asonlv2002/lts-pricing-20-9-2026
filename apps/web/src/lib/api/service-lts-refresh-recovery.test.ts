/**
 * service-lts-refresh-recovery.test.ts - Kiem tra co che phuc hoi refresh token
 * khi tab khac da rotate (bug "het phien dang nhap" khi mo nhieu tab).
 * Chay: npx tsx src/lib/api/service-lts-refresh-recovery.test.ts
 */

import {
  caiDatQuanLyPhien,
  lamMoiTokenQuaQuanLyPhien,
  LoiServiceLts,
} from './service-lts';

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

// ── Fake window.localStorage ──────────────────────────────────────────────
const lsStore = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => (lsStore.has(key) ? (lsStore.get(key) as string) : null),
  setItem: (key: string, value: string) => void lsStore.set(key, String(value)),
  removeItem: (key: string) => void lsStore.delete(key),
  clear: () => void lsStore.clear(),
};

type FakeWindow = Window & typeof globalThis & { localStorage: typeof fakeLocalStorage };
(globalThis as { window?: unknown }).window = {
  localStorage: fakeLocalStorage,
} as unknown as FakeWindow;

// ── Fake fetch ────────────────────────────────────────────────────────────
type GoiDaGoi = { url: string; refreshToken?: string };
let goiDaGoi: GoiDaGoi[] = [];
let traLoiTheoToken: (refreshToken: string | undefined, lan: number) => { status: number; body: unknown };
let soLanGoi = 0;

function resJson(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

(globalThis as { fetch?: unknown }).fetch = (async (url: string | URL, init?: RequestInit) => {
  const urlText = String(url);
  soLanGoi++;
  let refreshToken: string | undefined;
  try {
    const parsed = JSON.parse(String(init?.body ?? '{}')) as { refreshToken?: string };
    refreshToken = parsed.refreshToken;
  } catch {
    refreshToken = undefined;
  }
  goiDaGoi.push({ url: urlText, refreshToken });
  if (!urlText.includes('/auth/refresh')) {
    return resJson(404, { message: `Unexpected endpoint: ${urlText}` });
  }
  const ketQua = traLoiTheoToken(refreshToken, soLanGoi);
  return resJson(ketQua.status, ketQua.body);
}) as unknown as typeof fetch;

// ── Session manager giả lập state 1 tab (đọc từ "memory", không phải LS) ──
let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;
let daLuuTokenMoi: { accessToken: string; refreshToken: string } | null = null;
let daGoiPhienKhongHopLe = 0;

caiDatQuanLyPhien({
  layTokenHienTai: () => {
    if (!memoryAccess || !memoryRefresh) return null;
    return { accessToken: memoryAccess, refreshToken: memoryRefresh };
  },
  luuTokenMoi: (tokens) => {
    daLuuTokenMoi = tokens;
    memoryAccess = tokens.accessToken;
    memoryRefresh = tokens.refreshToken;
  },
  xuLyPhienKhongHopLe: () => {
    daGoiPhienKhongHopLe++;
    memoryAccess = null;
    memoryRefresh = null;
  },
});

function datLai() {
  lsStore.clear();
  goiDaGoi = [];
  soLanGoi = 0;
  daLuuTokenMoi = null;
  daGoiPhienKhongHopLe = 0;
  memoryAccess = null;
  memoryRefresh = null;
}

async function choLoi401(promise: Promise<unknown>): Promise<LoiServiceLts | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof LoiServiceLts ? error : null;
  }
}

async function main() {
console.log('\n== Refresh recovery khi tab khác đã rotate token ==');

{
  datLai();
  // Tab này đang cầm R1 trong memory; tab khác đã rotate: LS có R2.
  memoryAccess = 'access-1';
  memoryRefresh = 'refresh-1';
  lsStore.set('lts_service_access_token', 'access-2');
  lsStore.set('lts_service_refresh_token', 'refresh-2');
  traLoiTheoToken = (refreshToken) => {
    if (refreshToken === 'refresh-1') {
      return { status: 401, body: { message: 'Invalid refresh token' } };
    }
    if (refreshToken === 'refresh-2') {
      return {
        status: 200,
        body: {
          accessToken: 'access-3',
          refreshToken: 'refresh-3',
          tokenType: 'Bearer',
          expiresIn: 900,
          is_active: true,
        },
      };
    }
    return { status: 401, body: { message: 'Invalid refresh token' } };
  };

  const ketQua = await lamMoiTokenQuaQuanLyPhien().catch(() => null);
  assert(
    'retry bằng token mới nhất trong LS khi token memory bị 401',
    ketQua?.accessToken === 'access-3' && ketQua?.refreshToken === 'refresh-3',
    JSON.stringify(ketQua),
  );
  assert(
    'gọi /auth/refresh đúng 2 lần (token cũ rồi token LS)',
    soLanGoi === 2,
    `soLanGoi=${soLanGoi}`,
  );
  assert(
    'luuTokenMoi nhận cặp token mới',
    daLuuTokenMoi?.accessToken === 'access-3' && daLuuTokenMoi?.refreshToken === 'refresh-3',
    JSON.stringify(daLuuTokenMoi),
  );
  assert(
    'không coi là hết phiên (không gọi xuLyPhienKhongHopLe)',
    daGoiPhienKhongHopLe === 0,
    `daGoiPhienKhongHopLe=${daGoiPhienKhongHopLe}`,
  );
}

console.log('\n== Token bị thu hồi thật (LS trùng memory) thì vẫn hết phiên ==');

{
  datLai();
  memoryAccess = 'access-1';
  memoryRefresh = 'refresh-1';
  lsStore.set('lts_service_access_token', 'access-1');
  lsStore.set('lts_service_refresh_token', 'refresh-1');
  traLoiTheoToken = () => ({ status: 401, body: { message: 'Invalid refresh token' } });

  const loi = await choLoi401(lamMoiTokenQuaQuanLyPhien());
  assert(
    'ném LoiServiceLts 401 khi không còn token nào hợp lệ',
    loi?.status === 401,
    JSON.stringify(loi),
  );
  assert(
    'chỉ gọi /auth/refresh 1 lần (không retry vô ích)',
    soLanGoi === 1,
    `soLanGoi=${soLanGoi}`,
  );
}

console.log('\n== Lỗi 500 / mạng thì không retry bằng token LS ==');

{
  datLai();
  memoryAccess = 'access-1';
  memoryRefresh = 'refresh-1';
  lsStore.set('lts_service_access_token', 'access-2');
  lsStore.set('lts_service_refresh_token', 'refresh-2');
  traLoiTheoToken = () => ({ status: 500, body: { message: 'Internal Server Error' } });

  const loi = await choLoi401(lamMoiTokenQuaQuanLyPhien());
  assert(
    'lỗi 500 không được coi là hết phiên (status 500, không 401)',
    loi !== null && loi.status === 500,
    JSON.stringify(loi),
  );
  assert(
    'chỉ gọi /auth/refresh 1 lần',
    soLanGoi === 1,
    `soLanGoi=${soLanGoi}`,
  );
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
