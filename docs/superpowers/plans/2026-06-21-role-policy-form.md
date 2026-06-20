# Role Policy Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update role creation policy choices so UI names match business wording, two paired permissions appear as one choice each, and removed permissions no longer appear in role creation.

**Architecture:** Keep backend policy codes unchanged. Add a focused UI projection for role-form policy choices in `ModulePhanQuyen.tsx`, mapping one displayed checkbox to one or more backend `PolicyCode` values. Update policy catalog Vietnamese labels where backend semantics stay same.

**Tech Stack:** Next.js 16, React 19, TypeScript, plain `tsx` regression tests.

---

## File Structure

- Modify `apps/web/src/lib/api/service-lts.ts`: policy catalog labels/descriptions only.
- Modify `apps/web/src/components/ModulePhanQuyen.tsx`: role form display choices and selection toggle logic.
- Create `apps/web/src/lib/role-policy-form.test.ts`: regression test for displayed role-form labels and backend codes.

### Task 1: Add Regression Test

**Files:**
- Create: `apps/web/src/lib/role-policy-form.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { ROLE_FORM_POLICY_CHOICES, expandRoleFormPolicyChoiceCodes } from '../components/ModulePhanQuyen';

const labels = ROLE_FORM_POLICY_CHOICES.map(choice => choice.ten);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(labels.includes('Kích hoạt/ vô hiệu tài khoản'), 'missing combined activate/deactivate label');
assert(!labels.includes('Kích hoạt tài khoản'), 'old activate label should not render separately');
assert(!labels.includes('Vô hiệu tài khoản'), 'old deactivate label should not render separately');

assert(labels.includes('Cấp/ thu hồi quyền cho account khác'), 'missing combined grant/revoke label');
assert(!labels.includes('Cấp quyền cho user'), 'old grant label should not render separately');
assert(!labels.includes('Thu hồi quyền user'), 'old revoke label should not render separately');

assert(labels.includes('Xem vai trò'), 'role read label should use vai trò');
assert(labels.includes('Tạo vai trò'), 'role create label should use vai trò');
assert(labels.includes('Sửa vai trò'), 'role update label should use vai trò');
assert(labels.includes('Xóa vai trò'), 'role delete label should use vai trò');
assert(labels.every(label => !/nhóm quyền/iu.test(label)), 'role form labels should not contain nhóm quyền');

assert(!labels.includes('Bảo vệ tài khoản'), 'protected account policy should be hidden from role form');
assert(!labels.includes('Quản lý sản phẩm'), 'product manager policy should be hidden from role form');
assert(!labels.includes('Cố vấn bảng tính giá'), 'pricing advisor policy should be hidden from role form');

const expanded = expandRoleFormPolicyChoiceCodes(['account_status', 'account_policy_assignment']);
assert(expanded.includes('ACCOUNT_ACTIVATE'), 'combined account status should include ACCOUNT_ACTIVATE');
assert(expanded.includes('ACCOUNT_DEACTIVATE'), 'combined account status should include ACCOUNT_DEACTIVATE');
assert(expanded.includes('USER_POLICY_GRANT'), 'combined assignment should include USER_POLICY_GRANT');
assert(expanded.includes('USER_POLICY_REVOKE'), 'combined assignment should include USER_POLICY_REVOKE');

console.log('Role policy form OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec tsx src/lib/role-policy-form.test.ts`

Expected: FAIL because `ROLE_FORM_POLICY_CHOICES` is not exported yet.

### Task 2: Implement Role Form Policy Projection

**Files:**
- Modify: `apps/web/src/lib/api/service-lts.ts`
- Modify: `apps/web/src/components/ModulePhanQuyen.tsx`

- [ ] **Step 1: Update catalog labels**

In `POLICY_CATALOG`, rename four labels/descriptions:

```ts
{ code: 'ROLE_READ', ten: 'Xem vai trò', moTa: 'Cho phép xem danh sách vai trò.', nhom: 'Vai trò', rui_ro: 'thap' },
{ code: 'ROLE_CREATE', ten: 'Tạo vai trò', moTa: 'Cho phép tạo vai trò.', nhom: 'Vai trò', rui_ro: 'cao' },
{ code: 'ROLE_UPDATE', ten: 'Sửa vai trò', moTa: 'Cho phép chỉnh sửa vai trò.', nhom: 'Vai trò', rui_ro: 'cao' },
{ code: 'ROLE_DELETE', ten: 'Xóa vai trò', moTa: 'Cho phép xóa vai trò.', nhom: 'Vai trò', rui_ro: 'cao' },
```

- [ ] **Step 2: Add role-form choice helpers**

In `ModulePhanQuyen.tsx`, export:

```ts
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

export const ROLE_FORM_POLICY_CHOICES: RoleFormPolicyChoice[] = [
  { id: 'account_status', ten: 'Kích hoạt/ vô hiệu tài khoản', codes: ['ACCOUNT_ACTIVATE', 'ACCOUNT_DEACTIVATE'] },
  ...POLICY_CATALOG
    .filter(policy => !HIDDEN_ROLE_FORM_POLICY_CODES.has(policy.code))
    .filter(policy => !['ACCOUNT_ACTIVATE', 'ACCOUNT_DEACTIVATE', 'USER_POLICY_GRANT', 'USER_POLICY_REVOKE'].includes(policy.code))
    .map(policy => ({ id: policy.code, ten: policy.ten, codes: [policy.code] })),
  { id: 'account_policy_assignment', ten: 'Cấp/ thu hồi quyền cho account khác', codes: ['USER_POLICY_GRANT', 'USER_POLICY_REVOKE'] },
];

export function expandRoleFormPolicyChoiceCodes(choiceIds: string[]): PolicyCode[] {
  const selected = new Set(choiceIds);
  return ROLE_FORM_POLICY_CHOICES
    .filter(choice => selected.has(choice.id))
    .flatMap(choice => choice.codes);
}
```

- [ ] **Step 3: Use choices in form**

Change role form state to store selected choice ids:

```ts
const [chon, setChon] = useState<string[]>([]);
```

Submit expanded codes:

```ts
const policyCodes = expandRoleFormPolicyChoiceCodes(chon);
if (!ten.trim() || !policyCodes.length) return;
onCreateRole({ code, name: ten.trim(), description: moTa.trim() || 'Vai trò tùy chỉnh', policies: policyCodes, updatedAt: new Date().toISOString() });
```

Toggle by choice id and render `ROLE_FORM_POLICY_CHOICES`.

### Task 3: Verify

**Files:**
- Test: `apps/web/src/lib/role-policy-form.test.ts`
- Test: `apps/web/src/lib/vai-tro-terminology.test.ts`

- [ ] **Step 1: Run targeted tests**

Run: `pnpm --filter web exec tsx src/lib/role-policy-form.test.ts`

Expected: PASS with `Role policy form OK`.

Run: `pnpm --filter web exec tsx src/lib/vai-tro-terminology.test.ts`

Expected: PASS with `Vai trò terminology OK`.

- [ ] **Step 2: Run type check**

Run: `pnpm --filter web type-check`

Expected: PASS.

## Self-Review

- Spec coverage: labels, hidden permissions, paired permissions, backend old codes covered.
- Placeholder scan: no placeholders.
- Type consistency: `PolicyCode`, `RoleFormPolicyChoice`, choice ids, and expanded codes consistent.
