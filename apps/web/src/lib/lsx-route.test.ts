import { docLsxIdTuPathname, ghepUrlLsx, taoUrlChiaSeLsx } from './lsx-route';

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  OK ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

console.log('lsx-route');
assert('docLsxIdTuPathname', docLsxIdTuPathname('/lsx/abc-1') === 'abc-1');
assert('docLsxIdTuPathname menu null', docLsxIdTuPathname('/danh-sach-lsx') === null);
assert('ghepUrlLsx', ghepUrlLsx('https://x.com/', 'O1') === '/lsx/O1');
assert('ghepUrlLsx empty menu', ghepUrlLsx('https://x.com/', '') === '/danh-sach-lsx');
assert(
  'taoUrlChiaSeLsx path',
  (() => {
    const u = taoUrlChiaSeLsx('O9');
    return !!u && u.includes('/lsx/O9');
  })(),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
