/**
 * nhap-pin-sai.test.ts — nhận diện lỗi sai PIN + message UX
 * Chạy: npx tsx src/components/auth/nhap-pin-sai.test.ts
 */
import { LoiServiceLts } from '../../lib/api/service-lts';
import { laLoiSaiPin, THONG_BAO_SAI_PIN } from './NhapPinDuyetModal';

let failed = 0;

function assert(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`OK ${name}`);
  else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ': ' + detail : ''}`);
  }
}

assert('message mapped FE', laLoiSaiPin('Mã PIN không đúng.'));
assert('invalid pin EN', laLoiSaiPin('Invalid PIN'));
assert('invalid pin token', laLoiSaiPin('Mã PIN xác nhận không hợp lệ, vui lòng nhập lại.'));
assert(
  'het phien 401 khong coi la sai pin',
  !laLoiSaiPin('Hết phiên đăng nhập.', new LoiServiceLts('Hết phiên đăng nhập.', 401)),
);
assert('network khong phai sai pin', !laLoiSaiPin('Không kết nối được tới máy chủ.'));
assert('UX copy', THONG_BAO_SAI_PIN === 'Mã pin sai, mời nhập lại');

if (failed > 0) process.exit(1);
console.log(`\n${failed === 0 ? 'All passed' : failed + ' failed'}`);
