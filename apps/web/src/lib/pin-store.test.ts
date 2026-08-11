/**
 * pin-store.test.ts - Kiem tra luu + verify ma PIN duyet.
 * Chay: pnpm --filter web exec tsx src/lib/pin-store.test.ts
 */

import {
  hasPin,
  setPin,
  verifyPin,
  doiPin,
  pinHopLe,
  soLanThuConLai,
  SO_LAN_SAI_TOI_DA,
} from './pin-store';

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

function localStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

async function main() {
  const originalLS = (globalThis as any).window;
  (globalThis as any).window = { localStorage: localStorageMock() };

  try {
    // pinHopLe
    assert('pinHopLe accepts 6 digits', pinHopLe('123456'));
    assert('pinHopLe rejects 5 digits', !pinHopLe('12345'));
    assert('pinHopLe rejects letters', !pinHopLe('12345a'));
    assert('pinHopLe rejects empty', !pinHopLe(''));

    // chua dat PIN
    assert('hasPin false before set', !hasPin());

    // setPin luu hash, khong luu plaintext
    await setPin('246810');
    assert('hasPin true after set', hasPin());
    const stored = window.localStorage.getItem('lts_pin_duyet_v1') || '';
    assert('stores sha256 prefix', stored.startsWith('sha256:'), stored);
    assert('does not store plaintext', !stored.includes('246810'), stored);
    assert('stored hash length 64 hex', /^sha256:[0-9a-f]{64}$/.test(stored), stored);

    // verify dung / sai
    assert('verifyPin correct', await verifyPin('246810'));
    assert('verifyPin wrong', !(await verifyPin('000000')));

    // doiPin: sai PIN cu -> loi
    let loi = '';
    try { await doiPin('111111', '999999'); } catch (e) { loi = e instanceof Error ? e.message : String(e); }
    assert('doiPin wrong current throws', loi.includes('không đúng'), loi);
    assert('doiPin wrong current keeps old pin', await verifyPin('246810'));

    // doiPin dung -> doi sang PIN moi
    await doiPin('246810', '135790');
    assert('doiPin correct changes pin', await verifyPin('135790'));
    assert('doiPin old pin no longer works', !(await verifyPin('246810')));

    // khoa sau 5 lan sai
    for (let i = 0; i < SO_LAN_SAI_TOI_DA; i++) {
      await verifyPin('000000');
    }
    assert('locks after max wrong attempts', soLanThuConLai() === 0);
    assert('verifyPin returns false while locked', !(await verifyPin('135790')));
  } finally {
    (globalThis as any).window = originalLS;
  }
}

main().finally(() => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
});
