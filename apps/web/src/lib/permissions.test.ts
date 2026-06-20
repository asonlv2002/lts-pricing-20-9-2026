/**
 * permissions.test.ts - Kiem tra filter policy/menu frontend.
 * Chay: pnpm --filter web exec tsx src/lib/permissions.test.ts
 */

import { coTheXemMucMenu, coTheXemNhomMenu } from './permissions';

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

console.log('\n== Permissions menu filtering ==');

assert(
  'system.audit_log requires ACTIVITY_MONITOR',
  coTheXemMucMenu(['ACCOUNT_READ'], 'system.audit_log') === false,
  'ACCOUNT_READ must not open system.audit_log',
);
assert(
  'system.audit_log visible with ACTIVITY_MONITOR',
  coTheXemMucMenu(['ACTIVITY_MONITOR'], 'system.audit_log') === true,
  'ACTIVITY_MONITOR must open system.audit_log',
);
assert(
  'system.users still respects system group access',
  coTheXemMucMenu(['ACCOUNT_READ'], 'system.users') === true,
  'ACCOUNT_READ should keep system.users visible',
);
assert(
  'pricing.audit_log requires ACTIVITY_MONITOR',
  coTheXemMucMenu(['ACCOUNT_READ'], 'pricing.audit_log') === false,
  'pricing.audit_log must stay gated',
);
assert(
  'system group gating still requires account or role access',
  coTheXemNhomMenu(['ACCOUNT_READ'], 'system') === true
    && coTheXemNhomMenu(['ACTIVITY_MONITOR'], 'system') === true
    && coTheXemNhomMenu([], 'system') === false,
  'group-level rule must remain intact for account/role/activity monitor',
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
