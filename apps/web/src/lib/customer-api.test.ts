/**
 * customer-api.test.ts - Kiem tra validation va mapping customers service-lts.
 * Chay: npx tsx src/lib/customer-api.test.ts
 */

import {
  chuyenCustomerManagersApiSangUi,
  chuyenCustomerApiSangUi,
  chuyenCustomerManagersSangPayload,
  gopCustomerTheoSuKienRealtime,
  chuyenCustomerUiSangThongTinApi,
  layLuaChonNguoiPhuTrach,
  locTaiKhoanActive,
  sapXepPhienBanKhachHang,
  tomTatNguoiPhuTrach,
  kiemTraMaKhachHang,
  kiemTraThongTinKhachHang,
  type CustomerApi,
  type CustomerManagerApi,
  type CustomerUi,
} from './customer-api';
import { POLICY_CATALOG } from './api/service-lts';

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

console.log('\n== Customer code validation ==');

assert('accepts uppercase customer code', kiemTraMaKhachHang('ACME_01').hopLe);
assert('trims customer code before validating', kiemTraMaKhachHang(' KH001 ').hopLe);
assert('rejects empty customer code', !kiemTraMaKhachHang('').hopLe);
assert('rejects lowercase customer code', !kiemTraMaKhachHang('acme_01').hopLe);
assert('rejects trailing underscore', !kiemTraMaKhachHang('ACME_').hopLe);
assert('rejects double underscore', !kiemTraMaKhachHang('ACME__01').hopLe);
assert(
  'uses business-facing invalid format message',
  kiemTraMaKhachHang('acme_01').loi === 'Mã khách hàng chỉ dùng chữ in hoa, số và dấu gạch dưới. Ví dụ hợp lệ: KH001, ACME_01',
  kiemTraMaKhachHang('acme_01').loi,
);

console.log('\n== Customer API mapping ==');

const customerWithVersion: CustomerApi = {
  codeName: 'ACME_01',
  createdBy: 'user-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  versions: [
    {
      version: 2,
      organizationName: 'Acme Manufacturing Co.',
      taxCode: '0312345678',
      contactName: 'Nguyen Van A',
      phoneNumber: '0901234567',
      email: 'contact@acme.example',
      address: '123 Nguyen Hue',
      status: 'active',
      changeNote: 'Cap nhat',
      createdBy: 'user-1',
      createdAt: '2026-06-02T00:00:00.000Z',
    },
  ],
};

const mapped = chuyenCustomerApiSangUi(customerWithVersion);
assert('maps codeName to customerCode', mapped.customerCode === 'ACME_01');
assert('maps organizationName to companyName', mapped.companyName === 'Acme Manufacturing Co.');
assert('maps phoneNumber to phone', mapped.phone === '0901234567');
assert('uses latest version createdAt as updatedAt', mapped.updatedAt === '2026-06-02T00:00:00.000Z');
assert('keeps customer versions for history tab', mapped.versions?.length === 1, String(mapped.versions?.length));
assert('keeps newest version first for history tab', mapped.versions?.[0]?.version === 2, String(mapped.versions?.[0]?.version));

const customerWithUnsortedVersions = chuyenCustomerApiSangUi({
  codeName: 'ACME_02',
  createdBy: 'user-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  versions: [
    { version: 1, organizationName: 'Old Co.', contactName: 'Old', phoneNumber: '1', email: 'old@example.com', address: 'Old address', status: 'active', createdAt: '2026-06-01T00:00:00.000Z' },
    { version: 3, organizationName: 'Newest Co.', contactName: 'Newest', phoneNumber: '3', email: 'new@example.com', address: 'New address', status: 'inactive', createdAt: '2026-06-03T00:00:00.000Z' },
    { version: 2, organizationName: 'Middle Co.', contactName: 'Middle', phoneNumber: '2', email: 'middle@example.com', address: 'Middle address', status: 'active', createdAt: '2026-06-02T00:00:00.000Z' },
  ],
});
assert('maps unsorted API versions using the highest version number', customerWithUnsortedVersions.companyName === 'Newest Co.', customerWithUnsortedVersions.companyName);
assert('stores customer versions newest first after mapping', customerWithUnsortedVersions.versions?.map(v => v.version).join(',') === '3,2,1', customerWithUnsortedVersions.versions?.map(v => v.version).join(','));

const customerWithoutVersion = chuyenCustomerApiSangUi({
  codeName: 'EMPTY_01',
  createdBy: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  versions: [],
});

assert('keeps customer without version visible by code', customerWithoutVersion.customerCode === 'EMPTY_01');
assert('uses business fallback for customer without details', customerWithoutVersion.companyName === 'Chưa có thông tin chi tiết');
assert('keeps customer without version active', customerWithoutVersion.status === 'active');

const currentCustomer = chuyenCustomerApiSangUi({
  codeName: 'MERGE_01',
  createdAt: '2026-06-01T00:00:00.000Z',
  versions: [
    { version: 3, organizationName: 'Current Newest', contactName: 'Current', phoneNumber: '3', email: 'current@example.com', address: 'Current address', status: 'active', createdAt: '2026-06-03T00:00:00.000Z' },
  ],
});
const staleMerge = gopCustomerTheoSuKienRealtime(currentCustomer, {
  codeName: 'MERGE_01',
  latestVersion: { version: 2, organizationName: 'Stale', contactName: 'Stale', phoneNumber: '2', email: 'stale@example.com', address: 'Stale address', status: 'inactive', createdAt: '2026-06-02T00:00:00.000Z' },
  managers: [{ userId: 'user-2', account: 'staff_02', fullName: 'Staff 02' }],
});
assert('does not let stale realtime customer versions overwrite current latest version', staleMerge.companyName === 'Current Newest', staleMerge.companyName);
assert('still merges realtime managers when version is stale', staleMerge.managers?.[0]?.userId === 'user-2', JSON.stringify(staleMerge.managers));

const freshMerge = gopCustomerTheoSuKienRealtime(currentCustomer, {
  codeName: 'MERGE_01',
  latestVersion: { version: 4, organizationName: 'Fresh Newest', contactName: 'Fresh', phoneNumber: '4', email: 'fresh@example.com', address: 'Fresh address', status: 'active', createdAt: '2026-06-04T00:00:00.000Z' },
  managers: [],
});
assert('merges newer realtime customer versions into UI customer', freshMerge.companyName === 'Fresh Newest', freshMerge.companyName);
assert('stores newer realtime version first', freshMerge.versions?.[0]?.version === 4, String(freshMerge.versions?.[0]?.version));

console.log('\n== Customer detail validation ==');

const validCustomer: CustomerUi = {
  id: 'ACME_01',
  customerCode: 'ACME_01',
  companyName: 'Cong ty ABC',
  contactName: 'Nguyen Van A',
  phone: '0901234567',
  email: 'a@abc.vn',
  address: 'TP. Ho Chi Minh',
  status: 'active',
  isLocked: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

assert('accepts full required customer details', kiemTraThongTinKhachHang(validCustomer).hopLe);
assert('rejects missing organizationName', !kiemTraThongTinKhachHang({ ...validCustomer, companyName: '' }).hopLe);
assert('rejects missing contactName', !kiemTraThongTinKhachHang({ ...validCustomer, contactName: '' }).hopLe);
assert('rejects missing phoneNumber', !kiemTraThongTinKhachHang({ ...validCustomer, phone: '' }).hopLe);
assert('rejects missing email', !kiemTraThongTinKhachHang({ ...validCustomer, email: '' }).hopLe);
assert('rejects missing address', !kiemTraThongTinKhachHang({ ...validCustomer, address: '', invoiceAddress: '' }).hopLe);
assert('rejects invalid email format', !kiemTraThongTinKhachHang({ ...validCustomer, email: 'abc' }).hopLe);
assert(
  'uses business-facing missing email message',
  kiemTraThongTinKhachHang({ ...validCustomer, email: '' }).errors.email === 'Vui lòng nhập email khách hàng.',
  kiemTraThongTinKhachHang({ ...validCustomer, email: '' }).errors.email,
);

const updatePayload = chuyenCustomerUiSangThongTinApi(validCustomer);
assert('maps update companyName to organizationName', updatePayload.organizationName === 'Cong ty ABC');
assert('maps update phone to phoneNumber', updatePayload.phoneNumber === '0901234567');
assert('does not include customerCode in update payload', !('customerCode' in updatePayload));

console.log('\n== Customer manager mapping ==');

const policyCodes = POLICY_CATALOG.map(policy => policy.code);
assert('removes broad customer update policy from frontend catalog', !policyCodes.includes('CUSTOMER_UPDATE_ALL' as never));
assert('removes broad customer read policy from frontend catalog', !policyCodes.includes('CUSTOMER_READ_ALL' as never));

const managersApi: CustomerManagerApi[] = [
  { id: 'user-2', fullName: 'Tran Huong Mai' },
  { userId: 'user-1', account: 'nguyen.an', fullName: 'Nguyen Van An' },
];
const managersUi = chuyenCustomerManagersApiSangUi(managersApi);
assert('maps manager id fallback to userId', managersUi[0]?.userId === 'user-2');
assert('keeps manager account when provided', managersUi[1]?.account === 'nguyen.an');
assert('does not expose manager canWrite in UI model', !('canWrite' in managersUi[1]!), JSON.stringify(managersUi[1]));

const managerPayload = chuyenCustomerManagersSangPayload([
  { userId: ' user-1 ', account: 'nguyen.an', fullName: 'Nguyen Van An' },
  { userId: 'user-2', account: 'mai.nv', fullName: 'Tran Huong Mai' },
  { userId: 'user-1', account: 'nguyen.an', fullName: 'Nguyen Van An' },
  { userId: '', fullName: null },
]);
assert('trims and deduplicates manager payload', managerPayload.length === 2, JSON.stringify(managerPayload));
assert('maps manager payload key to managerId', managerPayload[0]?.managerId === 'user-1');
assert('does not send manager canWrite in payload', !('canWrite' in managerPayload[0]!), JSON.stringify(managerPayload[0]));

const activeAccounts = locTaiKhoanActive([
  { id: '1', account: 'active', fullName: 'Active User', isActive: true, isProtected: false, policies: [], createdAt: '2026-06-01' },
  { id: '2', account: 'inactive', fullName: 'Inactive User', isActive: false, isProtected: false, policies: [], createdAt: '2026-06-01' },
]);
assert('filters active accounts for assignment search', activeAccounts.length === 1 && activeAccounts[0]?.account === 'active');

assert('summarizes empty manager list', tomTatNguoiPhuTrach([]).primary === 'Chưa phân công');
assert('summarizes one manager without write/read badge', tomTatNguoiPhuTrach([{ userId: '1', fullName: 'Nguyen Van An' }]).primary === 'Nguyen Van An');
assert('does not show write/read badge in manager summary', tomTatNguoiPhuTrach([{ userId: '1', fullName: 'Nguyen Van An' }]).secondary === 'Người phụ trách');
assert('summarizes multiple managers without writable lead', tomTatNguoiPhuTrach(managersUi).primary === '2 người phụ trách');
assert('uses first manager as multiple manager summary detail', tomTatNguoiPhuTrach(managersUi).secondary === 'Tran Huong Mai', tomTatNguoiPhuTrach(managersUi).secondary);

const managerOptions = layLuaChonNguoiPhuTrach([
  { ...validCustomer, managers: managersUi },
  { ...validCustomer, id: 'BETA_01', customerCode: 'BETA_01', managers: [{ userId: 'user-1', account: 'nguyen.an', fullName: 'Nguyen Van An' }] },
  { ...validCustomer, id: 'NO_MANAGER', customerCode: 'NO_MANAGER', managers: [] },
]);
assert('builds unique manager filter options', managerOptions.length === 2, JSON.stringify(managerOptions));
assert('sorts manager filter options by Vietnamese display name', managerOptions[0]?.name === 'Nguyen Van An', JSON.stringify(managerOptions));
assert('keeps manager option id as user id', managerOptions[0]?.id === 'user-1', JSON.stringify(managerOptions));

console.log('\n== Customer version history ==');

const sortedVersions = sapXepPhienBanKhachHang([
  { version: 1, organizationName: 'Old', contactName: 'A', phoneNumber: '1', email: 'old@example.com', address: 'Old address', status: 'active', createdAt: '2026-06-01T00:00:00.000Z' },
  { version: 3, organizationName: 'Newest', contactName: 'C', phoneNumber: '3', email: 'new@example.com', address: 'New address', status: 'active', changeNote: 'Newest note', createdAt: '2026-06-03T00:00:00.000Z' },
  { version: 2, organizationName: 'Middle', contactName: 'B', phoneNumber: '2', email: 'middle@example.com', address: 'Middle address', status: 'inactive', createdAt: '2026-06-02T00:00:00.000Z' },
]);
assert('sorts versions newest first', sortedVersions.map(v => v.version).join(',') === '3,2,1', sortedVersions.map(v => v.version).join(','));
assert('preserves version change note', sortedVersions[0]?.changeNote === 'Newest note', sortedVersions[0]?.changeNote ?? '');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
