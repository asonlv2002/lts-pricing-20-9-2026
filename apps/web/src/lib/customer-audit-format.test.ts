/**
 * customer-audit-format.test.ts - Kiem tra format nhat ky khach hang.
 * Chay: npx tsx src/lib/customer-audit-format.test.ts
 */

import type { AuditEntry } from './types';
import {
  cleanAuditText,
  formatAuditValue,
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
assert('does not expose unknown object as object string', formatAuditValue('unknown', { a: 1 }) !== '[object Object]');
assert('cleans common mojibake text', cleanAuditText('Lai TrÆ°á»ng SÆ¡n') === 'Lai Trường Sơn');
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

const assignFields = getAuditChangedFields(entry({
  before: { managers: [{ userId: 'user-1', fullName: 'Lai Trường Sơn' }] },
  after: { managers: [
    { userId: 'user-1', fullName: 'Lai Trường Sơn' },
    { userId: 'user-2', fullName: 'Huỳnh Sơn Võ' },
  ] },
}));
assert('uses business label for managers', assignFields[0]?.label === 'Người phụ trách', assignFields[0]?.label ?? '');
assert('formats managers in changed fields', assignFields[0]?.after.includes('Huỳnh Sơn Võ') === true, assignFields[0]?.after ?? '');

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
