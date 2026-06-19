/**
 * activity-log-mapper.test.ts - Kiem tra mapper tu server activity log
 * sang AuditEntry FE.
 *
 * Chay: npx tsx src/lib/activity-log-mapper.test.ts
 */

import type { ActivityLogServerApi } from './api/service-lts';
import {
  chuyenResourceType,
  chuyenAction,
  trichBeforeAfter,
  taoActorResolver,
  mapActivityLogServer,
  mapActivityLogsServer,
} from './activity-log-mapper';

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

function log(input: Partial<ActivityLogServerApi>): ActivityLogServerApi {
  return {
    id: 'log-1',
    actorId: 'user-1',
    action: 'customer.created',
    resourceType: 'customer',
    resourceId: 'cust-1',
    metadata: { previousVersion: {}, currentVersion: { codeName: 'ACME' } },
    createdAt: '2026-06-20T08:00:00Z',
    ...input,
  };
}

const USERS = [
  { id: 'user-1', account: 'thu.lts', fullName: 'Lê Thị Thu' },
  { id: 'user-2', account: 'an.nv', fullName: 'Nguyễn Văn An' },
];

// ── resourceType mapping ──────────────────────────────────────────────────
console.log('\n== Resource type mapping ==');
assert('customer -> customer', chuyenResourceType('customer') === 'customer');
assert('pricing_sheet -> history', chuyenResourceType('pricing_sheet') === 'history');
assert('quotation -> quote', chuyenResourceType('quotation') === 'quote');
assert('account -> permission', chuyenResourceType('account') === 'permission');
assert('role -> permission', chuyenResourceType('role') === 'permission');
assert('user_policy -> permission', chuyenResourceType('user_policy') === 'permission');
assert('customer_manager -> customer', chuyenResourceType('customer_manager') === 'customer');
assert('unknown -> permission (default)', chuyenResourceType('something_weird') === 'permission');

// ── action mapping ─────────────────────────────────────────────────────────
console.log('\n== Action mapping ==');
assert('customer.created -> create', chuyenAction('customer.created') === 'create');
assert('customer.version_created -> update', chuyenAction('customer.version_created') === 'update');
assert('customer_manager.replaced -> assign', chuyenAction('customer_manager.replaced') === 'assign');
assert('pricing_sheet.created -> create', chuyenAction('pricing_sheet.created') === 'create');
assert('pricing_sheet.advisor_result_updated -> status_change', chuyenAction('pricing_sheet.advisor_result_updated') === 'status_change');
assert('pricing_sheet.result_updated -> update', chuyenAction('pricing_sheet.result_updated') === 'update');
assert('quotation.created -> create', chuyenAction('quotation.created') === 'create');
assert('quotation.submitted -> send_approval', chuyenAction('quotation.submitted') === 'send_approval');
assert('quotation.review_status_updated -> approve', chuyenAction('quotation.review_status_updated') === 'approve');
assert('account.password_changed -> update', chuyenAction('account.password_changed') === 'update');
assert('account.activation_updated -> status_change', chuyenAction('account.activation_updated') === 'status_change');
assert('role.upserted -> create', chuyenAction('role.upserted') === 'create');
assert('role.deleted -> delete', chuyenAction('role.deleted') === 'delete');
assert('user_policy.granted -> assign', chuyenAction('user_policy.granted') === 'assign');
assert('user_policy.revoked -> assign', chuyenAction('user_policy.revoked') === 'assign');
assert('unknown action -> update (default)', chuyenAction('some.future_action') === 'update');

// ── metadata -> before/after ───────────────────────────────────────────────
console.log('\n== Metadata trich xuat before/after ==');
{
  const result = trichBeforeAfter({ previousVersion: { a: 1 }, currentVersion: { a: 2 } });
  assert('trich ra ca before va after', JSON.stringify(result) === JSON.stringify({ before: { a: 1 }, after: { a: 2 } }));
}
{
  const result = trichBeforeAfter({ previousVersion: { a: 1 } });
  assert('chi co before', JSON.stringify(result) === JSON.stringify({ before: { a: 1 } }));
}
{
  const result = trichBeforeAfter({ currentVersion: { a: 2 } });
  assert('chi co after', JSON.stringify(result) === JSON.stringify({ after: { a: 2 } }));
}
{
  const result = trichBeforeAfter(null);
  assert('null -> empty', JSON.stringify(result) === '{}');
}
{
  const result = trichBeforeAfter({});
  assert('empty object -> empty', JSON.stringify(result) === '{}');
}
{
  const result = trichBeforeAfter({ previousVersion: 'invalid' as unknown as Record<string, unknown> });
  assert('previousVersion khong phai object -> bo qua', JSON.stringify(result) === '{}');
}

// ── actor resolver ─────────────────────────────────────────────────────────
console.log('\n== Actor resolver ==');
{
  const resolver = taoActorResolver(USERS);
  const actor = resolver('user-1');
  assert('resolve user-1 thanh cong', actor?.id === 'user-1' && actor?.fullName === 'Lê Thị Thu');
}
{
  const resolver = taoActorResolver(USERS);
  const actor = resolver('user-khong-ton-tai');
  assert('user khong co trong cache -> null', actor === null);
}
{
  const resolver = taoActorResolver(USERS);
  const actor = resolver(null);
  assert('actorId null -> null', actor === null);
}
{
  const resolver = taoActorResolver([{ id: 'user-x', account: 'x' }]);
  const actor = resolver('user-x');
  assert('fallback ve account khi fullName null', actor?.fullName === 'x');
}

// ── main mapper ────────────────────────────────────────────────────────────
console.log('\n== Main mapper (mapActivityLogServer) ==');
{
  const resolver = taoActorResolver(USERS);
  const entry = mapActivityLogServer(
    log({ id: 'log-1', actorId: 'user-1', action: 'customer.created', resourceType: 'customer' }),
    resolver,
  );
  assert('id giu nguyen', entry.id === 'log-1');
  assert('timestamp giu nguyen', entry.timestamp === '2026-06-20T08:00:00Z');
  assert('userId lay tu actorId', entry.userId === 'user-1');
  assert('userName resolve tu cache', entry.userName === 'Lê Thị Thu');
  assert('action mapped create', entry.action === 'create');
  assert('targetType mapped customer', entry.targetType === 'customer');
  assert('targetId lay tu resourceId', entry.targetId === 'cust-1');
  assert('before lay tu metadata.previousVersion', JSON.stringify(entry.before) === '{}');
  assert('after lay tu metadata.currentVersion', JSON.stringify(entry.after) === '{"codeName":"ACME"}');
}
{
  const resolver = taoActorResolver(USERS);
  const entry = mapActivityLogServer(
    log({
      id: 'log-2', actorId: 'user-2', action: 'quotation.review_status_updated',
      resourceType: 'quotation', resourceId: 'quo-1',
      metadata: { previousVersion: { updateStatus: 'submitted' }, currentVersion: { updateStatus: 'approved' } },
    }),
    resolver,
  );
  assert('quotation.review_status_updated -> action approve', entry.action === 'approve');
  assert('targetType quote', entry.targetType === 'quote');
  assert('userName An', entry.userName === 'Nguyễn Văn An');
  assert('before.before.status', (entry.before as { updateStatus: string }).updateStatus === 'submitted');
  assert('after.after.status', (entry.after as { updateStatus: string }).updateStatus === 'approved');
}
{
  // actorId null (server có thể trả null)
  const resolver = taoActorResolver(USERS);
  const entry = mapActivityLogServer(
    log({ id: 'log-3', actorId: null, action: 'account.created', resourceType: 'account', resourceId: 'u-1' }),
    resolver,
  );
  assert('actorId null -> userId empty', entry.userId === '');
  assert('userName empty khi actorId null', entry.userName === '');
  assert('targetType permission cho account', entry.targetType === 'permission');
  assert('action create', entry.action === 'create');
}

// ── batch mapper ───────────────────────────────────────────────────────────
console.log('\n== Batch mapper (mapActivityLogsServer) ==');
{
  const resolver = taoActorResolver(USERS);
  const result = mapActivityLogsServer(
    [
      log({ id: 'a', action: 'customer.created' }),
      log({ id: 'b', action: 'pricing_sheet.result_updated', resourceType: 'pricing_sheet' }),
      log({ id: 'c', action: 'role.deleted', resourceType: 'role' }),
    ],
    resolver,
  );
  assert('tra ve 3 entry', result.length === 3);
  assert('gia tri mapping thu nhat dung', result[0].action === 'create' && result[0].targetType === 'customer');
  assert('gia tri mapping thu hai dung', result[1].action === 'update' && result[1].targetType === 'history');
  assert('gia tri mapping thu ba dung', result[2].action === 'delete' && result[2].targetType === 'permission');
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
