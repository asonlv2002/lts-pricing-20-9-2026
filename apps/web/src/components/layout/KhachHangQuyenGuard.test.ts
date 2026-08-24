/**
 * KhachHangQuyenGuard.test.ts - Kiem tra shouldShowKhachHangNotice (pure).
 * Chay: pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
 */

import { shouldShowKhachHangNotice } from './KhachHangQuyenGuard';
import type { KhachHangCoTen } from '../../lib/customer-api';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const KH_DO_MINH = {
  id: 'C1',
  customerCode: 'KH001',
  companyName: 'Công ty ABC',
  managers: [{ userId: 'sale-A', fullName: 'Sale A' }],
} as unknown as KhachHangCoTen;

const KH_NGUOI_KHAC = {
  id: 'C2',
  customerCode: 'KH002',
  companyName: 'Công ty XYZ',
  managers: [{ userId: 'sale-B', fullName: 'Nguyễn Văn B' }],
} as unknown as KhachHangCoTen;

const ALL_KH = [KH_DO_MINH, KH_NGUOI_KHAC];
const ack = () => new Set<string>();

console.log('\n== shouldShowKhachHangNotice ==');

assert(
  '1. admin + KH ngoai quyen -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'admin',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

assert(
  '2. sale + KH minh quan ly -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty ABC',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const r3 = shouldShowKhachHangNotice({
  inputCustomer: 'Công ty XYZ',
  customers: ALL_KH,
  role: 'sale',
  currentSellerId: 'sale-A',
  policies: [],
  acknowledged: ack(),
});
assert('3. sale + KH nguoi khac -> notice', r3?.code === 'KH002' && r3?.name === 'Công ty XYZ');

assert(
  '4. sale + input rong -> null',
  shouldShowKhachHangNotice({
    inputCustomer: '   ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const acked = new Set(['KH002']);
assert(
  '5. da acknowledge KH002 -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: acked,
  }) === null,
);

assert(
  '6. CUSTOMER_MANAGER policy -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: ['CUSTOMER_MANAGER'],
    acknowledged: ack(),
  }) === null,
);

assert(
  '7. PRICING_SHEET_ADVISOR policy -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: ['PRICING_SHEET_ADVISOR'],
    acknowledged: ack(),
  }) === null,
);

assert(
  '8. offline (currentSellerId null) -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: null,
    policies: [],
    acknowledged: ack(),
  }) === null,
);

assert(
  '9. ten khong match DB -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty Linh Tinh',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const KH_MOI_TAO = {
  id: 'C3',
  customerCode: 'KH003',
  companyName: 'KH Sale A Moi',
  managers: [{ userId: 'sale-A', fullName: 'Sale A' }],
} as unknown as KhachHangCoTen;
assert(
  '10. KH vua tao trong session (managers chua currentSellerId) -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'KH Sale A Moi',
    customers: [KH_DO_MINH, KH_MOI_TAO],
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const rBonus = shouldShowKhachHangNotice({
  inputCustomer: '  CÔNG TY xyz  ',
  customers: ALL_KH,
  role: 'sale',
  currentSellerId: 'sale-A',
  policies: [],
  acknowledged: ack(),
});
assert('11. ten co dau/hoa/space -> van match (chuan hoa)', rBonus?.code === 'KH002');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
