/**
 * permissions.test.ts - Kiem tra filter policy/menu frontend.
 * Chay: pnpm --filter web exec tsx src/lib/permissions.test.ts
 */

import { coTheXemMucMenu, coTheXemNhomMenu } from './permissions';
import { vaiTroTuPolicies } from './permissions';
import type { PolicyCode } from './api/service-lts';

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
  'system.audit_log visible without ACTIVITY_MONITOR (own logs only)',
  coTheXemMucMenu(['ACCOUNT_READ'], 'system.audit_log') === true,
  'ACCOUNT_READ should open system.audit_log (server filters to own logs)',
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
  'pricing.audit_log visible without ACTIVITY_MONITOR (own logs only)',
  coTheXemMucMenu(['ACCOUNT_READ'], 'pricing.audit_log') === true,
  'pricing.audit_log should open (server filters to own logs)',
);
assert(
  'system group gating still requires account or role access',
  coTheXemNhomMenu(['ACCOUNT_READ'], 'system') === true
    && coTheXemNhomMenu([], 'system') === false,
  'group-level rule must remain intact for account/role access',
);

console.log('\n== vaiTroTuPolicies ==');
assert(
  'admin policies -> admin',
  vaiTroTuPolicies(['ACCOUNT_READ', 'ROLE_READ'] as PolicyCode[]) === 'admin',
);
assert(
  'sale-only policies -> sale',
  vaiTroTuPolicies(['CUSTOMER_CREATE', 'CUSTOMER_READ'] as PolicyCode[]) === 'sale',
);
assert(
  'no policies -> purchase',
  vaiTroTuPolicies([] as PolicyCode[]) === 'purchase',
);
assert(
  'mixed admin+sale -> admin',
  vaiTroTuPolicies(['CUSTOMER_CREATE', 'ACCOUNT_READ'] as PolicyCode[]) === 'admin',
);
assert(
  'ACTIVITY_MONITOR alone -> admin',
  vaiTroTuPolicies(['ACTIVITY_MONITOR'] as PolicyCode[]) === 'admin',
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
