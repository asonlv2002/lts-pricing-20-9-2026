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
  'nhat-ky-he-thong visible without ACTIVITY_MONITOR (own logs only)',
  coTheXemMucMenu(['ACCOUNT_READ'], 'nhat-ky-he-thong') === true,
  'ACCOUNT_READ should open nhat-ky-he-thong (server filters to own logs)',
);
assert(
  'nhat-ky-he-thong visible with ACTIVITY_MONITOR',
  coTheXemMucMenu(['ACTIVITY_MONITOR'], 'nhat-ky-he-thong') === true,
  'ACTIVITY_MONITOR must open nhat-ky-he-thong',
);
assert(
  'tai-khoan still respects system group access',
  coTheXemMucMenu(['ACCOUNT_READ'], 'tai-khoan') === true,
  'ACCOUNT_READ should keep tai-khoan visible',
);
assert(
  'nhat-ky-tinh-gia visible without ACTIVITY_MONITOR (own logs only)',
  coTheXemMucMenu(['ACCOUNT_READ'], 'nhat-ky-tinh-gia') === true,
  'nhat-ky-tinh-gia should open (server filters to own logs)',
);
assert(
  'system group gating still requires account or role access',
  coTheXemNhomMenu(['ACCOUNT_READ'], 'system') === true
    && coTheXemNhomMenu([], 'system') === false,
  'group-level rule must remain intact for account/role access',
);

console.log('\n== pricing_config PRICE_CONFIG_MANAGER gate ==');
assert(
  'pricing_config hidden without PRICE_CONFIG_MANAGER',
  coTheXemNhomMenu([], 'pricing_config') === false
    && coTheXemNhomMenu(['ACCOUNT_READ'] as PolicyCode[], 'pricing_config') === false,
  'ACCOUNT_READ alone must NOT open pricing_config',
);
assert(
  'pricing_config visible with PRICE_CONFIG_MANAGER',
  coTheXemNhomMenu(['PRICE_CONFIG_MANAGER'] as PolicyCode[], 'pricing_config') === true,
);
assert(
  'cau-hinh-vat-tu item requires PRICE_CONFIG_MANAGER',
  coTheXemMucMenu(['ACCOUNT_READ'] as PolicyCode[], 'cau-hinh-vat-tu') === false
    && coTheXemMucMenu(['PRICE_CONFIG_MANAGER'] as PolicyCode[], 'cau-hinh-vat-tu') === true,
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
  'no policies -> sale',
  vaiTroTuPolicies([] as PolicyCode[]) === 'sale',
);
assert(
  'mixed admin+sale -> admin',
  vaiTroTuPolicies(['CUSTOMER_CREATE', 'ACCOUNT_READ'] as PolicyCode[]) === 'admin',
);
assert(
  'ACTIVITY_MONITOR alone -> admin',
  vaiTroTuPolicies(['ACTIVITY_MONITOR'] as PolicyCode[]) === 'admin',
);
assert(
  'tai-nguyen-he-thong hidden without SYSTEM_MONITOR',
  coTheXemMucMenu(['ACCOUNT_READ'] as PolicyCode[], 'tai-nguyen-he-thong') === false,
);
assert(
  'tai-nguyen-he-thong visible with SYSTEM_MONITOR',
  coTheXemMucMenu(['SYSTEM_MONITOR'] as PolicyCode[], 'tai-nguyen-he-thong') === true,
);
assert(
  'system group visible with SYSTEM_MONITOR alone',
  coTheXemNhomMenu(['SYSTEM_MONITOR'] as PolicyCode[], 'system') === true,
);
assert(
  'SYSTEM_MONITOR alone -> admin',
  vaiTroTuPolicies(['SYSTEM_MONITOR'] as PolicyCode[]) === 'admin',
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
