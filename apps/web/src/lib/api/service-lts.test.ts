/**
 * service-lts.test.ts - Kiem tra request payload cho Service-LTS client.
 * Chay: pnpm --filter web exec tsx src/lib/api/service-lts.test.ts
 */

import { luuNguoiPhuTrachKhachHangService } from './service-lts';

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
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
