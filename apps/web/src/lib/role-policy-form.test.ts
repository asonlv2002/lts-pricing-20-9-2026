import { ROLE_FORM_POLICY_CHOICES, expandRoleFormPolicyChoiceCodes } from './role-policy-form';

const labels = ROLE_FORM_POLICY_CHOICES.map(choice => choice.ten);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(labels.includes('Kích hoạt / vô hiệu tài khoản'), 'missing activate label');
assert(!labels.includes('Vô hiệu tài khoản'), 'deactivate label should not render separately');
assert(!labels.includes('Bảo vệ tài khoản'), 'protected account policy should be hidden from role form');

assert(labels.includes('Cấp/ thu hồi quyền cho account khác'), 'missing combined grant/revoke label');
assert(!labels.includes('Cấp quyền cho user'), 'old grant label should not render separately');
assert(!labels.includes('Thu hồi quyền user'), 'old revoke label should not render separately');

assert(labels.includes('Xem vai trò'), 'role read label should use vai trò');
assert(labels.includes('Tạo vai trò'), 'role create label should use vai trò');
assert(labels.includes('Sửa vai trò'), 'role update label should use vai trò');
assert(labels.includes('Xóa vai trò'), 'role delete label should use vai trò');
const forbiddenRoleLabel = 'nhóm ' + 'quyền';
assert(labels.every(label => !label.toLowerCase().includes(forbiddenRoleLabel)), 'role form labels should not contain forbidden old role wording');

assert(!labels.includes('Quản lý sản phẩm'), 'product manager policy should be hidden from role form');
assert(!labels.includes('Cố vấn bảng tính giá'), 'pricing advisor policy should be hidden from role form');

const expanded = expandRoleFormPolicyChoiceCodes(['ACCOUNT_ACTIVATE', 'account_policy_assignment']);
assert(expanded.includes('ACCOUNT_ACTIVATE'), 'ACCOUNT_ACTIVATE should expand from its own code');
assert(expanded.includes('USER_POLICY_GRANT'), 'combined assignment should include USER_POLICY_GRANT');
assert(expanded.includes('USER_POLICY_REVOKE'), 'combined assignment should include USER_POLICY_REVOKE');

console.log('Role policy form OK');
