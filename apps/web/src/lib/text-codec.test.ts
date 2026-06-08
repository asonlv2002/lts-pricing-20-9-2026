/**
 * text-codec.test.ts - Kiem tra decode UTF-8 va sua mojibake.
 * Chay: npx tsx src/lib/text-codec.test.ts
 */

import { decodeBase64UrlUtf8, normalizeDisplayText } from './text-codec';

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

console.log('\n== UTF-8 base64url decode ==');

const utf8Payload = Buffer.from(JSON.stringify({ fullName: 'Lai Trường Sơn' }), 'utf8').toString('base64url');
assert(
  'decodes base64url payload containing Vietnamese text',
  decodeBase64UrlUtf8(utf8Payload).includes('Lai Trường Sơn'),
  decodeBase64UrlUtf8(utf8Payload),
);

console.log('\n== Display text normalization ==');

assert(
  'repairs common mojibake in Vietnamese display names',
  normalizeDisplayText('Lai TrÆ°á»ng SÆ¡n') === 'Lai Trường Sơn',
  normalizeDisplayText('Lai TrÆ°á»ng SÆ¡n'),
);

assert(
  'keeps clean Unicode text unchanged',
  normalizeDisplayText('Nguyễn Văn A') === 'Nguyễn Văn A',
  normalizeDisplayText('Nguyễn Văn A'),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
