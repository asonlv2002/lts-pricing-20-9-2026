import { chuanHoaSoThapPhan, parseSoThapPhan } from './so-thap-phan';

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

console.log('so-thap-phan');

assert('0.35 giữ dấu chấm', chuanHoaSoThapPhan('0.35') === '0.35');
assert('0,35 → 0.35', chuanHoaSoThapPhan('0,35') === '0.35');
assert('trim + space', chuanHoaSoThapPhan(' 0 , 35 ') === '0.35');
assert('bỏ ký tự lạ', chuanHoaSoThapPhan('0.3a5') === '0.35');
assert('chỉ 1 dấu chấm', chuanHoaSoThapPhan('0.3.5') === '0.35');
assert('rỗng', chuanHoaSoThapPhan('') === '');
assert('chỉ dấu phẩy', chuanHoaSoThapPhan(',') === '.');

assert('parse 0,35', parseSoThapPhan('0,35') === 0.35);
assert('parse 0.35', parseSoThapPhan('0.35') === 0.35);
assert('parse rỗng = 0', parseSoThapPhan('') === 0);
assert('parse . = 0', parseSoThapPhan('.') === 0);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
