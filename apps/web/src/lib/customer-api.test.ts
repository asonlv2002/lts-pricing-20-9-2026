/**
 * customer-api.test.ts - Kiem tra validation va mapping customers service-lts.
 * Chay: npx tsx src/lib/customer-api.test.ts
 */

import {
  chuyenCustomerManagersApiSangUi,
  chuyenCustomerApiSangUi,
  chuyenCustomerManagersSangPayload,
  chuyenCustomerUiSangThongTinApi,
  locTaiKhoanActive,
  tomTatNguoiPhuTrach,
  kiemTraMaKhachHang,
  kiemTraThongTinKhachHang,
  type CustomerApi,
  type CustomerManagerApi,
  type CustomerUi,
} from './customer-api';

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

const customerWithoutVersion = chuyenCustomerApiSangUi({
  codeName: 'EMPTY_01',
  createdBy: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  versions: [],
});

assert('keeps customer without version visible by code', customerWithoutVersion.customerCode === 'EMPTY_01');
assert('uses business fallback for customer without details', customerWithoutVersion.companyName === 'Chưa có thông tin chi tiết');
assert('keeps customer without version active', customerWithoutVersion.status === 'active');

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

const managersApi: CustomerManagerApi[] = [
  { id: 'user-2', fullName: 'Tran Huong Mai', canWrite: false },
  { userId: 'user-1', account: 'nguyen.an', fullName: 'Nguyen Van An', canWrite: true },
];
const managersUi = chuyenCustomerManagersApiSangUi(managersApi);
assert('maps manager id fallback to userId', managersUi[0]?.userId === 'user-2');
assert('keeps manager account when provided', managersUi[1]?.account === 'nguyen.an');
assert('keeps manager canWrite flag', managersUi[1]?.canWrite === true);

const managerPayload = chuyenCustomerManagersSangPayload([
  { userId: ' user-1 ', account: 'nguyen.an', fullName: 'Nguyen Van An', canWrite: true },
  { userId: 'user-2', account: 'mai.nv', fullName: 'Tran Huong Mai', canWrite: false },
  { userId: 'user-1', account: 'nguyen.an', fullName: 'Nguyen Van An', canWrite: false },
  { userId: '', fullName: null, canWrite: true },
]);
assert('trims and deduplicates manager payload', managerPayload.length === 2, JSON.stringify(managerPayload));
assert('uses first manager canWrite when duplicate appears', managerPayload[0]?.canWrite === true);
assert('maps manager payload key to managerId', managerPayload[0]?.managerId === 'user-1');

const activeAccounts = locTaiKhoanActive([
  { id: '1', account: 'active', fullName: 'Active User', isActive: true, isProtected: false, policies: [], createdAt: '2026-06-01' },
  { id: '2', account: 'inactive', fullName: 'Inactive User', isActive: false, isProtected: false, policies: [], createdAt: '2026-06-01' },
]);
assert('filters active accounts for assignment search', activeAccounts.length === 1 && activeAccounts[0]?.account === 'active');

assert('summarizes empty manager list', tomTatNguoiPhuTrach([]).primary === 'Chưa phân công');
assert('summarizes one writable manager', tomTatNguoiPhuTrach([{ userId: '1', fullName: 'Nguyen Van An', canWrite: true }]).primary === 'Nguyen Van An');
assert('marks writable manager in summary', tomTatNguoiPhuTrach([{ userId: '1', fullName: 'Nguyen Van An', canWrite: true }]).secondary === 'Được sửa');
assert('summarizes multiple managers with writable lead', tomTatNguoiPhuTrach(managersUi).primary === '2 người phụ trách');
assert('uses writable lead in multiple manager summary', tomTatNguoiPhuTrach(managersUi).secondary === 'Nguyen Van An · Được sửa');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
