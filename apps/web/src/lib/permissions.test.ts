/**
 * permissions.test.ts - Kiem tra filter policy/menu frontend.
 * Chay: pnpm --filter web exec tsx src/lib/permissions.test.ts
 */

import { coTheXemMucMenu, coTheXemNhomMenu } from './permissions';
import { vaiTroTuPolicies } from './permissions';
import { cotBang2TheoQuyen } from './permissions';
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
  coTheXemMucMenu(['ACCOUNT_MANAGER'], 'nhat-ky-he-thong') === true,
  'ACCOUNT_MANAGER should open nhat-ky-he-thong (server filters to own logs)',
);
assert(
  'nhat-ky-he-thong visible with ACTIVITY_MONITOR',
  coTheXemMucMenu(['ACTIVITY_MONITOR'], 'nhat-ky-he-thong') === true,
  'ACTIVITY_MONITOR must open nhat-ky-he-thong',
);
assert(
  'tai-khoan still respects system group access',
  coTheXemMucMenu(['ACCOUNT_MANAGER'], 'tai-khoan') === true,
  'ACCOUNT_MANAGER should keep tai-khoan visible',
);
assert(
  'nhat-ky-tinh-gia visible without ACTIVITY_MONITOR (own logs only)',
  coTheXemMucMenu(['ACCOUNT_MANAGER'], 'nhat-ky-tinh-gia') === true,
  'nhat-ky-tinh-gia should open (server filters to own logs)',
);
assert(
  'system group gating still requires account or role access',
  coTheXemNhomMenu(['ACCOUNT_MANAGER'], 'system') === true
    && coTheXemNhomMenu([], 'system') === false,
  'group-level rule must remain intact for account/role access',
);

console.log('\n== pricing_config PRICE_CONFIG_MANAGER gate ==');
assert(
  'pricing_config group visible without PRICE_CONFIG_MANAGER (item-level gate)',
  coTheXemNhomMenu([], 'pricing_config') === true
    && coTheXemNhomMenu(['ACCOUNT_MANAGER'] as PolicyCode[], 'pricing_config') === true,
  'pricing_config group is not gated; items decide visibility',
);
assert(
  'pricing_config visible with PRICE_CONFIG_MANAGER',
  coTheXemNhomMenu(['PRICE_CONFIG_MANAGER'] as PolicyCode[], 'pricing_config') === true,
);
assert(
  'cau-hinh-vat-tu item requires PRICE_CONFIG_MANAGER',
  coTheXemMucMenu(['ACCOUNT_MANAGER'] as PolicyCode[], 'cau-hinh-vat-tu') === false
    && coTheXemMucMenu(['PRICE_CONFIG_MANAGER'] as PolicyCode[], 'cau-hinh-vat-tu') === true,
);
assert(
  'cau-hinh-chi-phi-sx-nang-cap visible without PRICE_CONFIG_MANAGER (read-only)',
  coTheXemMucMenu([] as PolicyCode[], 'cau-hinh-chi-phi-sx-nang-cap') === true
    && coTheXemMucMenu(['PRICE_CONFIG_MANAGER'] as PolicyCode[], 'cau-hinh-chi-phi-sx-nang-cap') === true,
  'cpsx nang cap must be viewable by everyone; edit is gated in UI',
);

console.log('\n== vaiTroTuPolicies ==');
assert(
  'admin policies -> admin',
  vaiTroTuPolicies(['ACCOUNT_MANAGER', 'ROLE_MANAGER'] as PolicyCode[]) === 'admin',
);
assert(
  'sale-only policies -> sale',
  vaiTroTuPolicies(['CUSTOMER_MANAGER'] as PolicyCode[]) === 'sale',
);
assert(
  'no policies -> sale',
  vaiTroTuPolicies([] as PolicyCode[]) === 'sale',
);
assert(
  'mixed admin+sale -> admin',
  vaiTroTuPolicies(['CUSTOMER_MANAGER', 'ACCOUNT_MANAGER'] as PolicyCode[]) === 'admin',
);
assert(
  'ACTIVITY_MONITOR alone -> admin',
  vaiTroTuPolicies(['ACTIVITY_MONITOR'] as PolicyCode[]) === 'admin',
);
assert(
  'tai-nguyen-he-thong hidden without SYSTEM_MONITOR',
  coTheXemMucMenu(['ACCOUNT_MANAGER'] as PolicyCode[], 'tai-nguyen-he-thong') === false,
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
assert(
  'ACCOUNT_MANAGER alone -> admin',
  vaiTroTuPolicies(['ACCOUNT_MANAGER'] as PolicyCode[]) === 'admin',
);
assert(
  'yeu-cau-mat-khau requires ACCOUNT_MANAGER',
  coTheXemMucMenu(['ROLE_MANAGER'] as PolicyCode[], 'yeu-cau-mat-khau') === false
    && coTheXemMucMenu(['ACCOUNT_MANAGER'] as PolicyCode[], 'yeu-cau-mat-khau') === true,
);
assert(
  'vai-tro requires ROLE_MANAGER',
  coTheXemMucMenu(['ACCOUNT_MANAGER'] as PolicyCode[], 'vai-tro') === false
    && coTheXemMucMenu(['ROLE_MANAGER'] as PolicyCode[], 'vai-tro') === true,
);

console.log('\n== cotBang2TheoQuyen (Bảng 2 — chỉ REVIEW mở, EDIT không mở) ==');
assert(
  'điện: chỉ cần REVIEW_ELECTRIC_PER_MINUTE (không cần khung giờ)',
  cotBang2TheoQuyen(['CPSX_UPGRADE_REVIEW_ELECTRIC_PER_MINUTE']).coDien === true,
);
assert(
  'điện: chỉ REVIEW khung giờ (TIME_FRAME) → KHÔNG thấy cột điện',
  cotBang2TheoQuyen(['CPSX_UPGRADE_REVIEW_ELECTRIC_TIME_FRAME']).coDien === false,
);
assert(
  'điện: EDIT_ELECTRIC_PER_MINUTE mà không có REVIEW → KHÔNG thấy cột điện',
  cotBang2TheoQuyen(['CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE']).coDien === false,
);
assert(
  'lương: đủ 4 code REVIEW máy → coLuong true',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_REVIEW_LABOR_PRINT',
    'CPSX_UPGRADE_REVIEW_LABOR_LAMINATE',
    'CPSX_UPGRADE_REVIEW_LABOR_SLIT',
    'CPSX_UPGRADE_REVIEW_LABOR_BAG',
  ]).coLuong === true,
);
assert(
  'lương: đủ 4 code EDIT mà không có REVIEW → coLuong false',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_EDIT_LABOR_PRINT',
    'CPSX_UPGRADE_EDIT_LABOR_LAMINATE',
    'CPSX_UPGRADE_EDIT_LABOR_SLIT',
    'CPSX_UPGRADE_EDIT_LABOR_BAG',
  ]).coLuong === false,
);
assert(
  'lương: thiếu 1 code REVIEW → coLuong false (AND)',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_REVIEW_LABOR_PRINT',
    'CPSX_UPGRADE_REVIEW_LABOR_LAMINATE',
    'CPSX_UPGRADE_REVIEW_LABOR_SLIT',
  ]).coLuong === false,
);
assert(
  'thời gian: đủ 4 code REVIEW → coThoiGian true',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_REVIEW_TIME_PRINT',
    'CPSX_UPGRADE_REVIEW_TIME_LAMINATE',
    'CPSX_UPGRADE_REVIEW_TIME_SLIT',
    'CPSX_UPGRADE_REVIEW_TIME_BAG',
  ]).coThoiGian === true,
);
assert(
  'thời gian: đủ 4 code EDIT mà không có REVIEW → coThoiGian false',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_EDIT_TIME_PRINT',
    'CPSX_UPGRADE_EDIT_TIME_LAMINATE',
    'CPSX_UPGRADE_EDIT_TIME_SLIT',
    'CPSX_UPGRADE_EDIT_TIME_BAG',
  ]).coThoiGian === false,
);
assert(
  'thời gian: thiếu 1 code REVIEW → coThoiGian false (AND)',
  cotBang2TheoQuyen([
    'CPSX_UPGRADE_REVIEW_TIME_PRINT',
    'CPSX_UPGRADE_REVIEW_TIME_LAMINATE',
    'CPSX_UPGRADE_REVIEW_TIME_SLIT',
  ]).coThoiGian === false,
);
assert(
  'trống policy → cả 3 cột đều ẩn',
  cotBang2TheoQuyen([]).coDien === false
    && cotBang2TheoQuyen([]).coLuong === false
    && cotBang2TheoQuyen([]).coThoiGian === false,
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
