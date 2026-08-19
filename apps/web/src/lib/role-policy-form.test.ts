import { ROLE_FORM_POLICY_CHOICES, expandRoleFormPolicyChoiceCodes } from './role-policy-form';

const labels = ROLE_FORM_POLICY_CHOICES.map(choice => choice.ten);
const ids = ROLE_FORM_POLICY_CHOICES.map(choice => choice.id);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(labels.includes('Quản lý tài khoản'), 'missing ACCOUNT_MANAGER label');
assert(labels.includes('Quản lý vai trò'), 'missing ROLE_MANAGER label');
assert(ids.includes('ACCOUNT_MANAGER'), 'ACCOUNT_MANAGER choice missing');
assert(ids.includes('ROLE_MANAGER'), 'ROLE_MANAGER choice missing');

assert(!labels.includes('Xem tài khoản'), 'legacy ACCOUNT_READ should not render');
assert(!labels.includes('Tạo tài khoản'), 'legacy ACCOUNT_CREATE should not render');
assert(!labels.includes('Kích hoạt / vô hiệu tài khoản'), 'legacy ACCOUNT_ACTIVATE should not render');
assert(!labels.includes('Đặt lại mật khẩu tài khoản'), 'legacy ACCOUNT_PASSWORD_UPDATE_ALL should not render');
assert(!labels.includes('Xem vai trò'), 'legacy ROLE_READ should not render');
assert(!labels.includes('Tạo vai trò'), 'legacy ROLE_CREATE should not render');
assert(!labels.includes('Sửa vai trò'), 'legacy ROLE_UPDATE should not render');
assert(!labels.includes('Xóa vai trò'), 'legacy ROLE_DELETE should not render');

assert(labels.includes('Cấp/ thu hồi quyền cho account khác'), 'missing combined grant/revoke label');
assert(!labels.includes('Cấp quyền cho user'), 'old grant label should not render separately');
assert(!labels.includes('Thu hồi quyền user'), 'old revoke label should not render separately');

assert(!labels.includes('Quản lý sản phẩm'), 'product manager policy should be hidden from role form');
assert(!labels.includes('Quản lý sản phẩm (legacy)'), 'product manager legacy label should be hidden');
assert(!labels.includes('Cố vấn bảng tính giá'), 'pricing advisor policy should be hidden from role form');

const expanded = expandRoleFormPolicyChoiceCodes([
  'ACCOUNT_MANAGER',
  'ROLE_MANAGER',
  'account_policy_assignment',
]);
assert(expanded.includes('ACCOUNT_MANAGER'), 'ACCOUNT_MANAGER should expand from its own code');
assert(expanded.includes('ROLE_MANAGER'), 'ROLE_MANAGER should expand from its own code');
assert(expanded.includes('USER_POLICY_GRANT'), 'combined assignment should include USER_POLICY_GRANT');
assert(expanded.includes('USER_POLICY_REVOKE'), 'combined assignment should include USER_POLICY_REVOKE');

console.log('Role policy form OK');
