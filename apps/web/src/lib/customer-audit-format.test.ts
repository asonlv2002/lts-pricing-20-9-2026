/**
 * customer-audit-format.test.ts - Kiem tra format nhat ky khach hang.
 * Chay: npx tsx src/lib/customer-audit-format.test.ts
 */

import type { AuditEntry } from './types';
import {
  cleanAuditText,
  formatAuditValue,
  getAuditFieldLabel,
  getAuditChangedFields,
  getAuditSummary,
  resolveAuditActorName,
} from './customer-audit-format';

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

function entry(input: Partial<AuditEntry>): AuditEntry {
  return {
    id: 'audit-1',
    timestamp: '2026-06-03T10:17:00.000Z',
    userId: 'user-1',
    userName: 'Lai TrÆ°á»ng SÆ¡n',
    action: 'assign',
    targetType: 'customer',
    targetId: 'KH001',
    targetName: 'Chưa có thông tin chi tiết',
    ...input,
  };
}

console.log('\n== Audit value formatting ==');

const managerValue = formatAuditValue('managers', [
  { userId: 'user-1', fullName: 'Lai Trường Sơn' },
  { userId: 'user-2', fullName: 'Huỳnh Sơn Võ' },
]);
assert('formats managers without object string', !managerValue.includes('[object Object]'), managerValue);
assert('formats manager names without permissions', managerValue === 'Lai Trường Sơn, Huỳnh Sơn Võ', managerValue);
assert('translates crmStatus lead', formatAuditValue('crmStatus', 'lead') === 'Mới');
assert('translates active status', formatAuditValue('status', 'active') === 'Đang sử dụng');
assert('translates isLocked false', formatAuditValue('isLocked', false) === 'Chưa khóa');
assert('translates quoteStatus pending approval', formatAuditValue('quoteStatus', 'pending_approval') === 'Chờ duyệt');
assert('translates quoteStatus completed', formatAuditValue('quoteStatus', 'completed') === 'Đã chốt đơn SX');
assert('translates updateStatus customer approved', formatAuditValue('updateStatus', 'customer approved') === 'Khách đã duyệt');
assert('translates lsx status in production', formatAuditValue('status', 'in_production') === 'Đang SX');
assert('translates lsx status created', formatAuditValue('status', 'created') === 'Mới tạo');
assert('translates finalPrice field label', getAuditFieldLabel('finalPrice') === 'Giá cuối cùng');
assert('translates input field label', getAuditFieldLabel('input') === 'Dữ liệu đầu vào');
assert('translates saleResult field label', getAuditFieldLabel('saleResult') === 'Kết quả sale');
assert('translates masterResult field label', getAuditFieldLabel('masterResult') === 'Kết quả quản trị');
assert('translates chotGia field label', getAuditFieldLabel('chotGia') === 'Giá chốt');
assert('translates terms field label', getAuditFieldLabel('terms') === 'Điều khoản báo giá');
assert('translates tiers field label', getAuditFieldLabel('tiers') === 'Các mốc số lượng');
assert('translates sellerName field label', getAuditFieldLabel('sellerName') === 'Người phụ trách');
assert('does not expose unknown object as object string', formatAuditValue('unknown', { a: 1 }) !== '[object Object]');
const overrideAuditText = formatAuditValue('saleOverrides', {
  print: { mat: 'BOPP', matPrice: 764.4 },
  'lam-2': { detailOverrides: { 0: { materialName: 'PET', width: 0.42 } } },
});
assert('formats sale override details clearly', overrideAuditText.includes('In · Vật liệu: BOPP') && overrideAuditText.includes('Ghép L2 · Dòng 1 · Khổ: 0,42'), overrideAuditText);
assert('does not collapse sale overrides to generic detail text', overrideAuditText !== '(thông tin chi tiết)', overrideAuditText);
const pricingInputText = formatAuditValue('input', {
  productName: 'Túi gạo ST25',
  quantity: 15000,
  spreadWidth: 0.32,
  cutStep: 0.48,
  numColors: 4,
  layer1Id: 'PET12',
  layer2Id: 'MPET12',
  filmType: 'manIn',
});
assert('formats pricing input object as business fields', pricingInputText.includes('Sản phẩm: Túi gạo ST25') && pricingInputText.includes('Số lượng: 15.000') && pricingInputText.includes('Khổ trải: 320 mm'), pricingInputText);
assert('formats manIn as Vietnamese film type', pricingInputText.includes('Loại màng: Màng in'), pricingInputText);
assert('does not collapse pricing input object', pricingInputText !== '(thông tin chi tiết)', pricingInputText);
const termsText = formatAuditValue('terms', { vatRate: 0.08, validityDays: 15, paymentTerms: '30 ngày', deliveryTime: '7 ngày', notes: 'Giao tại kho' });
assert('formats quote terms object clearly', termsText.includes('VAT: 8%') && termsText.includes('Hiệu lực: 15 ngày') && termsText.includes('Thanh toán: 30 ngày'), termsText);
const policiesText = formatAuditValue('policiesAdded', ['ACTIVITY_MONITOR', 'CUSTOMER_MANAGER']);
assert('formats policy arrays clearly', policiesText.includes('Xem nhật ký thao tác toàn hệ thống') && policiesText.includes('Quản lý người phụ trách khách hàng'), policiesText);
assert('cleans common mojibake text', cleanAuditText('Lai TrÆ°á»ng SÆ¡n') === 'Lai Trường Sơn');
assert('does not expose deprecated contact title field label', getAuditChangedFields(entry({ before: { contactTitle: '' }, after: { contactTitle: 'Manager' } })).length === 0);
assert(
  'resolves audit actor name from current user when stored userName is an id',
  resolveAuditActorName(
    { userId: 'user-id-1', userName: 'user-id-1' },
    { currentUser: { id: 'user-id-1', fullName: 'Nguyễn Văn A', account: 'nguyenvana' } },
  ) === 'Nguyễn Văn A',
);
assert(
  'keeps stored audit actor name when it is already a display name',
  resolveAuditActorName(
    { userId: 'user-id-1', userName: 'Trần Thị B' },
    { currentUser: { id: 'user-id-1', fullName: 'Nguyễn Văn A', account: 'nguyenvana' } },
  ) === 'Trần Thị B',
);

console.log('\n== Audit changed fields ==');

const createFields = getAuditChangedFields(entry({
  action: 'create',
  before: {},
  after: {
    customerCode: 'SON_TEST_4H',
    companyName: 'SON_TEST_4H',
    contactName: 'Huỳnh Sơn Võ',
    phone: '0385284191',
    email: 'ason.vohuynhson@gmail.com',
    assignmentNote: '',
    contactNotes: '',
    secondarySellerId: '',
  },
}));
assert('hides empty technical fields from create detail', !createFields.some(field => ['assignmentNote', 'contactNotes', 'secondarySellerId'].includes(field.key)), createFields.map(f => f.key).join(','));
assert('keeps important create fields', createFields.some(field => field.key === 'customerCode') && createFields.some(field => field.key === 'phone'));

const pricingFields = getAuditChangedFields(entry({
  action: 'update',
  targetType: 'history',
  before: { finalPrice: 4032.1, input: { quantity: 1000 } },
  after: { finalPrice: 4431.482003606667, input: { quantity: 1200 } },
}));
assert('labels finalPrice in pricing diffs', pricingFields.some(field => field.key === 'finalPrice' && field.label === 'Giá cuối cùng'), pricingFields.map(f => `${f.key}:${f.label}`).join(','));
assert('labels input in pricing diffs', pricingFields.some(field => field.key === 'input' && field.label === 'Dữ liệu đầu vào'), pricingFields.map(f => `${f.key}:${f.label}`).join(','));

const quoteFields = getAuditChangedFields(entry({
  action: 'status_change',
  targetType: 'quote',
  before: { quoteStatus: 'drafted', terms: { paymentTerms: 'COD' } },
  after: { quoteStatus: 'pending_approval', terms: { paymentTerms: '30 ngày' } },
}));
assert('labels quoteStatus in quote diffs', quoteFields.some(field => field.key === 'quoteStatus' && field.label === 'Trạng thái báo giá'), quoteFields.map(f => `${f.key}:${f.label}`).join(','));
assert('keeps terms object diff in quote diffs', quoteFields.some(field => field.key === 'terms' && field.label === 'Điều khoản báo giá'), quoteFields.map(f => `${f.key}:${f.label}`).join(','));

const assignFields = getAuditChangedFields(entry({
  before: { managers: [{ userId: 'user-1', fullName: 'Lai Trường Sơn' }] },
  after: { managers: [
    { userId: 'user-1', fullName: 'Lai Trường Sơn' },
    { userId: 'user-2', fullName: 'Huỳnh Sơn Võ' },
  ] },
}));
assert('uses business label for managers', assignFields[0]?.label === 'Người phụ trách', assignFields[0]?.label ?? '');
assert('formats managers in changed fields', assignFields[0]?.after.includes('Huỳnh Sơn Võ') === true, assignFields[0]?.after ?? '');

const hiddenOnlyOverrideFields = getAuditChangedFields(entry({
  before: { saleOverrides: { print: { materialId: 'MCPP25', mat: 'MCPP', matPrice: 1263.899 } } },
  after: { saleOverrides: { print: { materialId: 'MCPP30', mat: 'MCPP', matPrice: 1263.899 } } },
}));
assert('hides override diffs when only hidden fields changed', hiddenOnlyOverrideFields.length === 0, hiddenOnlyOverrideFields.map(field => `${field.label}:${field.before}->${field.after}`).join(','));

console.log('\n== Audit summaries ==');

const assignSummary = getAuditSummary(entry({
  before: { managers: [{ userId: 'user-1', fullName: 'Lai Trường Sơn' }] },
  after: { managers: [
    { userId: 'user-1', fullName: 'Lai Trường Sơn' },
    { userId: 'user-2', fullName: 'Huỳnh Sơn Võ' },
  ] },
}));
assert('summarizes assignment count change', assignSummary.description === 'Cập nhật người phụ trách: 1 người → 2 người', assignSummary.description);
assert('cleans actor display name in summary', assignSummary.actorName === 'Lai Trường Sơn', assignSummary.actorName);

const createSummary = getAuditSummary(entry({
  action: 'create',
  targetName: 'SON_TEST_4H',
  before: {},
  after: {
    customerCode: 'SON_TEST_4H',
    companyName: 'SON_TEST_4H',
    contactName: 'Huỳnh Sơn Võ',
    phone: '0385284191',
    email: 'ason.vohuynhson@gmail.com',
    assignmentNote: '',
    contactNotes: '',
  },
}));
assert('summarizes create in Vietnamese business text', createSummary.description === 'Tạo hồ sơ khách hàng SON_TEST_4H', createSummary.description);
assert('does not expose technical fields in create summary', !createSummary.compactFields.join(' ').includes('assignmentNote'), createSummary.compactFields.join(' '));

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
