import { POLICY_CATALOG, type PolicyCode } from './api/service-lts';

export type RoleFormPolicyChoice = {
  id: string;
  ten: string;
  codes: PolicyCode[];
};

const HIDDEN_ROLE_FORM_POLICY_CODES = new Set<PolicyCode>([
  'ACCOUNT_PROTECT',
  'PRODUCT_MANAGER',
  'PRICING_SHEET_ADVISOR',
]);

const COMBINED_ROLE_FORM_POLICY_CODES = new Set<PolicyCode>([
  'ACCOUNT_ACTIVATE',
  'ACCOUNT_DEACTIVATE',
  'USER_POLICY_GRANT',
  'USER_POLICY_REVOKE',
]);

export const ROLE_FORM_POLICY_CHOICES: RoleFormPolicyChoice[] = [
  { id: 'account_status', ten: 'Kích hoạt/ vô hiệu tài khoản', codes: ['ACCOUNT_ACTIVATE', 'ACCOUNT_DEACTIVATE'] },
  ...POLICY_CATALOG
    .filter(policy => !HIDDEN_ROLE_FORM_POLICY_CODES.has(policy.code))
    .filter(policy => !COMBINED_ROLE_FORM_POLICY_CODES.has(policy.code))
    .map(policy => ({ id: policy.code, ten: policy.ten, codes: [policy.code] })),
  { id: 'account_policy_assignment', ten: 'Cấp/ thu hồi quyền cho account khác', codes: ['USER_POLICY_GRANT', 'USER_POLICY_REVOKE'] },
];

export function expandRoleFormPolicyChoiceCodes(choiceIds: string[]): PolicyCode[] {
  const selected = new Set(choiceIds);
  return ROLE_FORM_POLICY_CHOICES
    .filter(choice => selected.has(choice.id))
    .flatMap(choice => choice.codes);
}

export function collapseRolePoliciesToFormChoiceIds(policyCodes: PolicyCode[]): string[] {
  const selectedCodes = new Set(policyCodes);
  return ROLE_FORM_POLICY_CHOICES
    .filter(choice => choice.codes.every(code => selectedCodes.has(code)))
    .map(choice => choice.id);
}
