# CUSTOMER_MANAGER Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users with `CUSTOMER_MANAGER` manage customer assignees in the web CRM without granting broad customer edit rights.

**Architecture:** Add the backend policy code to the web policy catalog, then gate only manager-assignment UI with that policy. Existing customer work/edit behavior remains based on being one of the customer's managers.

**Tech Stack:** Next.js/React TypeScript web app, existing executable TypeScript tests run via pnpm.

---

### Task 1: Add Policy Catalog Coverage

**Files:**
- Modify: `apps/web/src/lib/customer-api.test.ts`
- Modify: `apps/web/src/lib/api/service-lts.ts`

- [ ] **Step 1: Write the failing test**

Add assertions near the existing policy catalog assertions in `apps/web/src/lib/customer-api.test.ts`:

```ts
assert('includes customer manager policy in frontend catalog', policyCodes.includes('CUSTOMER_MANAGER' as never));
const customerManagerPolicy = POLICY_CATALOG.find(policy => policy.code === ('CUSTOMER_MANAGER' as never));
assert('labels customer manager policy for assignment management', customerManagerPolicy?.ten === 'Quản lý người phụ trách khách hàng', customerManagerPolicy?.ten ?? 'missing');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @lts/web test -- customer-api.test.ts`

Expected: FAIL because `CUSTOMER_MANAGER` is not in `POLICY_CATALOG`.

- [ ] **Step 3: Implement minimal policy catalog change**

In `apps/web/src/lib/api/service-lts.ts`, add `CUSTOMER_MANAGER` to `PolicyCode` and `POLICY_CATALOG`:

```ts
| 'ROLE_READ' | 'CUSTOMER_CREATE' | 'CUSTOMER_MANAGER'
```

```ts
{ code: 'CUSTOMER_MANAGER', ten: 'Quản lý người phụ trách khách hàng', moTa: 'Cho phép thêm hoặc xóa người phụ trách trên hồ sơ khách hàng.', nhom: 'Cấp phát', rui_ro: 'trung' },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @lts/web test -- customer-api.test.ts`

Expected: PASS.

### Task 2: Gate Manager Assignment UI By CUSTOMER_MANAGER

**Files:**
- Modify: `apps/web/src/components/ModuleKhachHang.tsx`

- [ ] **Step 1: Implement minimal UI gating**

Add a local boolean inside `ModuleKhachHang`:

```ts
const coQuyenQuanLyNguoiPhuTrach = !!nguoiDungHienTai?.policies.includes('CUSTOMER_MANAGER');
```

Use it for assignment-only controls:

```tsx
canManageManagers={editing ? coQuyenQuanLyNguoiPhuTrach : true}
```

```tsx
{coQuyenQuanLyNguoiPhuTrach && <button className="crm2-btn-icon" title="Phân công" onClick={() => openAssign(c)}><Briefcase size={14}/></button>}
```

Keep the `Sửa` button on `canUpdateThisCustomer`, so `CUSTOMER_MANAGER` does not grant broad customer edit rights.

- [ ] **Step 2: Type-check web**

Run: `pnpm --filter @lts/web type-check`

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run focused tests**

Run: `pnpm --filter @lts/web test -- customer-api.test.ts`

Expected: PASS.

### Self-Review

- Spec coverage: policy exists in catalog and assignment UI uses it; broad edit remains manager-only.
- Placeholder scan: no placeholders.
- Type consistency: `CUSTOMER_MANAGER` is used consistently as a `PolicyCode`.
