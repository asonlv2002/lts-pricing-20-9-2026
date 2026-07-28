/**
 * service-lts.test.ts - Kiem tra request payload cho Service-LTS client.
 * Chay: pnpm --filter web exec tsx src/lib/api/service-lts.test.ts
 */

import {
  layAnhDaiDienService,
  layMetricHeThongService,
  luuNguoiPhuTrachKhachHangService,
  taiAnhDaiDienService,
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

console.log('\n== Customer managers service payload ==');

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  capturedUrl = String(input);
  capturedInit = init;
  return new Response(JSON.stringify({ codeName: 'ACME_01', managers: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function main() {
  try {
    await luuNguoiPhuTrachKhachHangService('ACME_01', [
      { managerId: 'user-1' },
      { managerId: 'user-2' },
    ], 'token-123');

    const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;

    assert('calls customer managers endpoint', capturedUrl.endsWith('/customers/ACME_01/managers'), capturedUrl);
    assert('uses PUT for replacing customer managers', capturedInit?.method === 'PUT', String(capturedInit?.method));
    assert('sends managerIds array expected by backend docs', Array.isArray(body?.managerIds), JSON.stringify(body));
    assert('maps managerId values into managerIds', JSON.stringify(body?.managerIds) === JSON.stringify(['user-1', 'user-2']), JSON.stringify(body));
    assert('does not send legacy managers payload key', !Object.prototype.hasOwnProperty.call(body ?? {}, 'managers'), JSON.stringify(body));

    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await taiAnhDaiDienService(avatar, 'token-456');

    const avatarHeaders = new Headers(capturedInit?.headers);
    assert('calls avatar upload endpoint', capturedUrl.endsWith('/auth/me/avatar'), capturedUrl);
    assert('uses POST for avatar upload', capturedInit?.method === 'POST', String(capturedInit?.method));
    assert('sends avatar as multipart form data', capturedInit?.body instanceof FormData, String(capturedInit?.body));
    assert('sends avatar under avatar field', (capturedInit?.body as FormData).get('avatar') === avatar);
    assert('sends bearer token for avatar upload', avatarHeaders.get('Authorization') === 'Bearer token-456', avatarHeaders.get('Authorization') ?? '');
    assert('does not force JSON content type for avatar upload', !avatarHeaders.has('Content-Type'), avatarHeaders.get('Content-Type') ?? '');

    await layAnhDaiDienService('token-789');
    const avatarGetHeaders = new Headers(capturedInit?.headers);
    assert('calls current avatar endpoint', capturedUrl.endsWith('/auth/me/avatar'), capturedUrl);
    assert('uses GET for current avatar', !capturedInit?.method || capturedInit.method === 'GET', String(capturedInit?.method));
    assert('sends bearer token for current avatar', avatarGetHeaders.get('Authorization') === 'Bearer token-789', avatarGetHeaders.get('Authorization') ?? '');

    await layMetricHeThongService('token-sys');
    const metricHeaders = new Headers(capturedInit?.headers);
    assert('calls system metric collect endpoint', capturedUrl.endsWith('/system/metric/collect'), capturedUrl);
    assert('uses GET for system metrics', !capturedInit?.method || capturedInit.method === 'GET', String(capturedInit?.method));
    assert('sends bearer token for system metrics', metricHeaders.get('Authorization') === 'Bearer token-sys', metricHeaders.get('Authorization') ?? '');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
