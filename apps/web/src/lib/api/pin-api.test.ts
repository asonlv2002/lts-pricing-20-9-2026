/**
 * pin-api.test.ts - Kiem tra 3 service wrapper cho auth PIN (server-backed).
 * Chay: pnpm --filter web exec tsx src/lib/api/pin-api.test.ts
 */

import {
  layTrangThaiBaoMatService,
  datPinService,
  xacThucPinService,
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

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  capturedUrl = String(input);
  capturedInit = init;
  if (capturedUrl.endsWith('/auth/me/security')) {
    return new Response(JSON.stringify({ hasPin: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (capturedUrl.endsWith('/auth/me/pin')) {
    return new Response(JSON.stringify({ pinSet: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ pinToken: 'pin-token-1', expiresIn: 60 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function main() {
  try {
    console.log('\n== layTrangThaiBaoMatService ==');
    const tt = await layTrangThaiBaoMatService('token-a');
    assert('goi /auth/me/security', capturedUrl.endsWith('/auth/me/security'), capturedUrl);
    assert('dung GET', capturedInit?.method === 'GET' || capturedInit?.method === undefined, String(capturedInit?.method));
    assert('tra ve hasPin tu server', tt.hasPin === true, JSON.stringify(tt));
    {
      const headers = new Headers(capturedInit?.headers);
      assert('gu kem bearer token', headers.get('Authorization') === 'Bearer token-a', headers.get('Authorization') ?? '');
    }

    console.log('\n== datPinService ==');
    const dat = await datPinService('P@ssw0rd!', '123456', 'token-b');
    assert('goi /auth/me/pin', capturedUrl.endsWith('/auth/me/pin'), capturedUrl);
    assert('dung PUT', capturedInit?.method === 'PUT', String(capturedInit?.method));
    assert('tra ve pinSet=true', dat.pinSet === true, JSON.stringify(dat));
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('gui currentPassword + pin (khong gui mat khau moi)', body?.currentPassword === 'P@ssw0rd!' && body?.pin === '123456' && body?.newPassword === undefined, JSON.stringify(body));
    }

    console.log('\n== xacThucPinService ==');
    const xac = await xacThucPinService('123456', 'token-c');
    assert('goi /auth/pin/verify', capturedUrl.endsWith('/auth/pin/verify'), capturedUrl);
    assert('dung POST', capturedInit?.method === 'POST', String(capturedInit?.method));
    {
      const body = typeof capturedInit?.body === 'string' ? JSON.parse(capturedInit.body) as Record<string, unknown> : null;
      assert('gui pin duoi dang { pin }', body?.pin === '123456', JSON.stringify(body));
    }
    assert('tra ve pinToken', xac.pinToken === 'pin-token-1', JSON.stringify(xac));
    assert('tra ve expiresIn', xac.expiresIn === 60, JSON.stringify(xac));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
