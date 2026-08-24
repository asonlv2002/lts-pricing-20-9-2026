# Popup notice khi chọn KH ngoài quyền — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 1 modal portal toàn cục, tự bật khi `input.customer` chứa KH user không có quyền quản lý, dedup per-session theo `customerCode`, hỗ trợ `[Bỏ qua, tiếp tục xem]` và `[Chọn KH khác]` (focus input KH + scroll).

**Architecture:**
- `useEffect` ở component layout (`VoTrang`) theo dõi `input.customer` + `danhSachKhachHang` + role + policies + currentSellerId → gọi pure function `shouldShowKhachHangNotice(...)` → nếu trả về KH ngoài quyền thì set state mở modal portal.
- Modal render qua `createPortal(node, document.body)`, dismiss acknowledge `customerCode` vào `useRef<Set<string>>` (chỉ tồn tại trong session, F5 reset).
- Tự cover mọi nơi set `input.customer` (gõ tay, click gợi ý, wizard, load lịch sử) vì đều đi qua store action.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Zustand 5 + Lucide icons. Test: `tsx` + `assert()` (theo pattern hiện có ở `wizard/BuocChonKhachHang.test.ts`).

## Global Constraints

- **Stack:** chỉ `apps/web` (Next.js). Không đụng `apps/mobile`, `apps/flutter_app`, không sửa BE.
- **Ngôn ngữ UI:** tiếng Việt cứng (theo `CLAUDE.md`).
- **Định dạng số:** locale `vi-VN`.
- **Test runner:** `pnpm --filter web exec tsx <file>` (xem `wizard/BuocChonKhachHang.test.ts`).
- **Tiền tệ:** VND (₫) — không liên quan feature này.
- **CSS:** thêm vào `apps/web/src/app/globals.css` (đã là global stylesheet của Next 16 app router).
- **Không xoá tính năng hiện có:** inline warning ở `TheNhapLieu.tsx:650-658`, `alert()` ở `ManHinhQuanLy.tsx:1183-1185` phải còn nguyên (regression).
- **Không dùng emoji trong modal production** (giữ text + Lucide icon `AlertTriangle`).
- **Không commit secrets.**
- **Mỗi task kết thúc = commit.**

---
## File Structure (sẽ chạm)

| File | Loại | Trách nhiệm |
|---|---|---|
| `apps/web/src/lib/customer-api.ts` | Sửa | Export `chuanHoaTenKhach` (đang private) |
| `apps/web/src/components/TheNhapLieu.tsx` | Sửa | Thêm `data-customer-input` vào `<input>` khách hàng |
| `apps/web/src/components/layout/KhachHangQuyenGuard.tsx` | Mới | Pure function `shouldShowKhachHangNotice` + hook `useKhachHangQuyenGuard` + modal |
| `apps/web/src/components/layout/VoTrang.tsx` | Sửa | Đặt `<KhachHangQuyenGuard />` cùng cấp `DangNhapModal` |
| `apps/web/src/app/globals.css` | Sửa | Thêm `.lts-kh-popup*` styles |
| `apps/web/src/components/layout/KhachHangQuyenGuard.test.ts` | Mới | Unit test 11 case cho `shouldShowKhachHangNotice` |
| `apps/web/src/lib/customer-api-export.test.ts` | Mới | Smoke test export helper |
| `apps/web/src/components/TheNhapLieu.customer-attr.test.ts` | Mới | Structural test attribute |
| `apps/web/src/components/layout/KhachHangQuyenGuard.css.test.ts` | Mới | Structural test CSS classes |
| `apps/web/src/components/layout/VoTrang.guard-mount.test.ts` | Mới | Structural test import + render |

---

## Task 1: Export `chuanHoaTenKhach` từ `customer-api.ts`

**Files:**
- Modify: `apps/web/src/lib/customer-api.ts:177-185` (đổi `function` → `export function`)
- Test: `apps/web/src/lib/customer-api-export.test.ts` (mới, smoke test)

**Interfaces:**
- Consumes: không
- Produces: `export function chuanHoaTenKhach(value: string): string` — chuẩn hoá tên (bỏ dấu, thường, trim)

- [ ] **Step 1: Tạo test file**

Tạo `apps/web/src/lib/customer-api-export.test.ts`:

```ts
/**
 * customer-api-export.test.ts - Kiem tra chuanHoaTenKhach da export.
 * Chay: pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
 */

import { chuanHoaTenKhach } from './customer-api';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

console.log('\n== chuanHoaTenKhach (sau khi export) ==');
assert('bo dau + viet thuong + trim', chuanHoaTenKhach('  Công ty ABC  ') === 'cong ty abc');
assert('xu ly chu d/Đ', chuanHoaTenKhach('Đại Lý XYZ') === 'dai ly xyz');
assert('empty string', chuanHoaTenKhach('') === '');
assert('only whitespace', chuanHoaTenKhach('   ') === '');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Chạy test (FAIL — function chưa export)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
```

Expected: FAIL với lỗi `SyntaxError: The requested module './customer-api' does not provide an export named 'chuanHoaTenKhach'`.

- [ ] **Step 3: Sửa `customer-api.ts`**

Mở `apps/web/src/lib/customer-api.ts`, dòng 177 đổi:

```ts
function chuanHoaTenKhach(value: string): string {
```

thành:

```ts
export function chuanHoaTenKhach(value: string): string {
```

- [ ] **Step 4: Chạy test (PASS)**

```bash
pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
```

Expected: `Passed: 4, Failed: 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/customer-api.ts apps/web/src/lib/customer-api-export.test.ts
git commit -m "feat(customer-api): export chuanHoaTenKhach for guard hook"
```

---
## Task 2: Thêm `data-customer-input` vào input khách hàng ở `TheNhapLieu.tsx`

**Files:**
- Modify: `apps/web/src/components/TheNhapLieu.tsx:641-649` (thêm `data-customer-input="true"`)
- Test: `apps/web/src/components/TheNhapLieu.customer-attr.test.ts` (mới, structural)

**Interfaces:**
- Consumes: không
- Produces: attribute `data-customer-input="true"` trên `<input>` ở dòng 641 — để hook ở `VoTrang` có thể `querySelector` focus tới khi user bấm `[Chọn KH khác]`.

- [ ] **Step 1: Tạo test file**

Tạo `apps/web/src/components/TheNhapLieu.customer-attr.test.ts`:

```ts
/**
 * TheNhapLieu.customer-attr.test.ts - Kiem tra input KH co data-customer-input.
 * Chay: pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const source = readFileSync(
  resolve(process.cwd(), 'src/components/TheNhapLieu.tsx'),
  'utf8',
);

console.log('\n== data-customer-input on customer input ==');

const inputBlock = source.match(/<input[\s\S]{0,400}placeholder="Tên khách hàng"[\s\S]{0,400}/);
assert('tim thay input khach hang', !!inputBlock, 'khong thay <input> voi placeholder Tên khách hàng');

if (inputBlock) {
  assert(
    'co data-customer-input="true"',
    /data-customer-input="true"/.test(inputBlock[0]),
    'attribute chua duoc them',
  );
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Chạy test (FAIL — chưa có attribute)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
```

Expected: FAIL `co data-customer-input="true"` (inputBlock[0] không có attribute).

- [ ] **Step 3: Sửa `TheNhapLieu.tsx`**

Mở `apps/web/src/components/TheNhapLieu.tsx` quanh dòng 641-649, sửa `<input>` thành:

```tsx
          <input
            className="form-input"
            placeholder="Tên khách hàng"
            data-customer-input="true"
            value={input.customer}
            onFocus={() => datDangFocusKhachHang(true)}
           onBlur={xuLyRoiONhapKhachHang}
            onChange={e => { capNhatDauVao({ customer: e.target.value }); datVuaTaoKhachMoi(false); }}
           autoComplete="off"
          />
```

- [ ] **Step 4: Chạy test (PASS)**

```bash
pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
```

Expected: `Passed: 2, Failed: 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/TheNhapLieu.tsx apps/web/src/components/TheNhapLieu.customer-attr.test.ts
git commit -m "feat(TheNhapLieu): mark customer input with data-customer-input attr"
```

---
## Task 3: Pure function `shouldShowKhachHangNotice` + unit test

**Files:**
- Create: `apps/web/src/components/layout/KhachHangQuyenGuard.tsx` (chỉ phần pure function + types, chưa có hook/modal)
- Create: `apps/web/src/components/layout/KhachHangQuyenGuard.test.ts` (test pure function)

**Interfaces:**
- Consumes:
  - `chuanHoaTenKhach` từ `apps/web/src/lib/customer-api.ts`
  - `laNguoiPhuTrach` từ `apps/web/src/lib/customer-api.ts`
  - `tomTatNguoiPhuTrach` từ `apps/web/src/lib/customer-api.ts`
  - `coQuyenQuanLyKhachHang`, `coQuyenCoVanBangTinh` từ `apps/web/src/lib/permissions.ts`
  - `PolicyCode` từ `apps/web/src/lib/api/service-lts.ts`
- Produces:
  - `export interface KhachHangNoticeInfo { code: string; name: string; managerName: string }`
  - `export interface ShouldShowInput { inputCustomer: string; customers: KhachHangCoTen[]; role: string; currentSellerId?: string | null; policies: PolicyCode[]; acknowledged: Set<string> }`
  - `export function shouldShowKhachHangNotice(input: ShouldShowInput): KhachHangNoticeInfo | null`

- [ ] **Step 1: Tạo test file với 11 case**

Tạo `apps/web/src/components/layout/KhachHangQuyenGuard.test.ts`:

```ts
/**
 * KhachHangQuyenGuard.test.ts - Kiem tra shouldShowKhachHangNotice (pure).
 * Chay: pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
 */

import { shouldShowKhachHangNotice } from './KhachHangQuyenGuard';
import type { KhachHangCoTen } from '../../lib/customer-api';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const KH_DO_MINH = {
  id: 'C1',
  customerCode: 'KH001',
  companyName: 'Công ty ABC',
  managers: [{ userId: 'sale-A', fullName: 'Sale A' }],
} as unknown as KhachHangCoTen;

const KH_NGUOI_KHAC = {
  id: 'C2',
  customerCode: 'KH002',
  companyName: 'Công ty XYZ',
  managers: [{ userId: 'sale-B', fullName: 'Nguyễn Văn B' }],
} as unknown as KhachHangCoTen;

const ALL_KH = [KH_DO_MINH, KH_NGUOI_KHAC];
const ack = () => new Set<string>();

console.log('\n== shouldShowKhachHangNotice ==');

assert(
  '1. admin + KH ngoai quyen -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'admin',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

assert(
  '2. sale + KH minh quan ly -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty ABC',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const r3 = shouldShowKhachHangNotice({
  inputCustomer: 'Công ty XYZ',
  customers: ALL_KH,
  role: 'sale',
  currentSellerId: 'sale-A',
  policies: [],
  acknowledged: ack(),
});
assert('3. sale + KH nguoi khac -> notice', r3?.code === 'KH002' && r3?.name === 'Công ty XYZ');

assert(
  '4. sale + input rong -> null',
  shouldShowKhachHangNotice({
    inputCustomer: '   ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const acked = new Set(['KH002']);
assert(
  '5. da acknowledge KH002 -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: acked,
  }) === null,
);

assert(
  '6. CUSTOMER_MANAGER policy -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: ['CUSTOMER_MANAGER'],
    acknowledged: ack(),
  }) === null,
);

assert(
  '7. PRICING_SHEET_ADVISOR policy -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: ['PRICING_SHEET_ADVISOR'],
    acknowledged: ack(),
  }) === null,
);

assert(
  '8. policies empty (offline) -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty XYZ',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

assert(
  '9. ten khong match DB -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'Công ty Linh Tinh',
    customers: ALL_KH,
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const KH_MOI_TAO = {
  id: 'C3',
  customerCode: 'KH003',
  companyName: 'KH Sale A Moi',
  managers: [{ userId: 'sale-A', fullName: 'Sale A' }],
} as unknown as KhachHangCoTen;
assert(
  '10. KH vua tao trong session (managers chua currentSellerId) -> null',
  shouldShowKhachHangNotice({
    inputCustomer: 'KH Sale A Moi',
    customers: [KH_DO_MINH, KH_MOI_TAO],
    role: 'sale',
    currentSellerId: 'sale-A',
    policies: [],
    acknowledged: ack(),
  }) === null,
);

const rBonus = shouldShowKhachHangNotice({
  inputCustomer: '  CÔNG TY xyz  ',
  customers: ALL_KH,
  role: 'sale',
  currentSellerId: 'sale-A',
  policies: [],
  acknowledged: ack(),
});
assert('11. ten co dau/hoa/space -> van match (chuan hoa)', rBonus?.code === 'KH002');

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Chạy test (FAIL — module chưa tồn tại)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
```

Expected: FAIL với lỗi `Cannot find module './KhachHangQuyenGuard'`.

- [ ] **Step 3: Tạo file với pure function + types**

Tạo `apps/web/src/components/layout/KhachHangQuyenGuard.tsx`:

```tsx
'use client';
// apps/web/src/components/layout/KhachHangQuyenGuard.tsx
// ────────────────────────────────────────────────────────────────────────────
// Hook + modal guard: khi input.customer chua KH user khong co quyen quan ly
// → hien popup notice de user biet ngay (truoc khi nhap lieu tiep / truoc khi
// bi alert chan luc Luu). Dedup per-session theo customerCode.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import {
  chuanHoaTenKhach,
  laNguoiPhuTrach,
  tomTatNguoiPhuTrach,
  type KhachHangCoTen,
} from '../../lib/customer-api';
import {
  coQuyenCoVanBangTinh,
  coQuyenQuanLyKhachHang,
} from '../../lib/permissions';
import type { PolicyCode } from '../../lib/api/service-lts';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';

// ── Types & pure function ─────────────────────────────────────────────────

export interface KhachHangNoticeInfo {
  code: string;
  name: string;
  managerName: string;
}

export interface ShouldShowInput {
  inputCustomer: string;
  customers: KhachHangCoTen[];
  role: string;
  currentSellerId?: string | null;
  policies: PolicyCode[];
  acknowledged: Set<string>;
}

/**
 * Quyết định có nên hiện popup "KH ngoài quyền" hay không. Pure function —
 * tách riêng để unit test deterministic.
 *
 * Trả về `null` nếu không nên bật, hoặc `{ code, name, managerName }` nếu có.
 */
export function shouldShowKhachHangNotice(input: ShouldShowInput): KhachHangNoticeInfo | null {
  const tenKhach = input.inputCustomer.trim();
  if (!tenKhach) return null;

  if (input.role === 'admin') return null;

  if (coQuyenQuanLyKhachHang(input.policies)) return null;
  if (coQuyenCoVanBangTinh(input.policies)) return null;

  const chuan = chuanHoaTenKhach(tenKhach);
  const match = input.customers.find(
    kh => chuanHoaTenKhach(kh.companyName) === chuan,
  );
  if (!match) return null;

  if (laNguoiPhuTrach(match, input.currentSellerId)) return null;

  if (input.acknowledged.has(match.customerCode)) return null;

  const tomTat = tomTatNguoiPhuTrach(match.managers ?? []);
  return {
    code: match.customerCode,
    name: match.companyName,
    managerName: `${tomTat.primary}${tomTat.secondary ? ' · ' + tomTat.secondary : ''}`,
  };
}
```

- [ ] **Step 4: Chạy test (PASS)**

```bash
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
```

Expected: `Passed: 11, Failed: 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/KhachHangQuyenGuard.tsx apps/web/src/components/layout/KhachHangQuyenGuard.test.ts
git commit -m "feat(guard): add pure shouldShowKhachHangNotice + 11 unit tests"
```

---
## Task 4: Thêm CSS cho popup `.lts-kh-popup*`

**Files:**
- Modify: `apps/web/src/app/globals.css` (cuối file, thêm block mới)
- Test: `apps/web/src/components/layout/KhachHangQuyenGuard.css.test.ts` (mới, structural)

**Interfaces:**
- Consumes: không
- Produces: CSS classes `.lts-kh-popup`, `.lts-kh-popup-overlay`, `.lts-kh-popup-card`, `.lts-kh-popup-header`, `.lts-kh-popup-title`, `.lts-kh-popup-close`, `.lts-kh-popup-body`, `.lts-kh-popup-kh-card`, `.lts-kh-popup-actions`, `.lts-kh-popup-btn`, `.lts-kh-popup-btn--primary`, `.lts-kh-popup-btn--ghost` + responsive mobile.

- [ ] **Step 1: Tạo test file**

Tạo `apps/web/src/components/layout/KhachHangQuyenGuard.css.test.ts`:

```ts
/**
 * KhachHangQuyenGuard.css.test.ts - Kiem tra CSS popup da them vao globals.css.
 * Chay: pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const css = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

console.log('\n== .lts-kh-popup CSS classes ==');

const required = [
  '.lts-kh-popup',
  '.lts-kh-popup-overlay',
  '.lts-kh-popup-card',
  '.lts-kh-popup-header',
  '.lts-kh-popup-title',
  '.lts-kh-popup-close',
  '.lts-kh-popup-body',
  '.lts-kh-popup-kh-card',
  '.lts-kh-popup-actions',
  '.lts-kh-popup-btn',
  '.lts-kh-popup-btn--primary',
  '.lts-kh-popup-btn--ghost',
];

for (const cls of required) {
  assert(`co class ${cls}`, new RegExp(`${cls.replace('--', '\\-\\-')}\\b`).test(css));
}

assert(
  'co @media mobile cho popup',
  /@media[^{]*max-width:\s*767px[\s\S]{0,500}\.lts-kh-popup-card/.test(css),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Chạy test (FAIL — chưa có class)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
```

Expected: FAIL với nhiều `co class .lts-kh-popup*` failed.

- [ ] **Step 3: Thêm CSS vào cuối `globals.css`**

Mở `apps/web/src/app/globals.css`, cuối file, append:

```css
/* ═══════════════════════════════════════════════════════════════════════
   Popup notice khi chọn KH ngoài quyền (KhachHangQuyenGuard)
   ═══════════════════════════════════════════════════════════════════════ */

.lts-kh-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: lts-kh-popup-fade 0.18s ease-out;
}

.lts-kh-popup {
  z-index: 61;
  width: 100%;
  max-width: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lts-kh-popup-card {
  width: 100%;
  background: var(--surface, #fff);
  color: var(--text, #0f172a);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: lts-kh-popup-slide 0.22s ease-out;
}

.lts-kh-popup-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lts-kh-popup-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 700;
  color: #b91c1c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lts-kh-popup-close {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--muted, #64748b);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  line-height: 0;
}

.lts-kh-popup-close:hover {
  background: var(--surface-hover, rgba(15, 23, 42, 0.06));
  color: var(--text, #0f172a);
}

.lts-kh-popup-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.lts-kh-popup-kh-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--surface-hover, rgba(15, 23, 42, 0.03));
}

.lts-kh-popup-kh-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.lts-kh-popup-kh-meta {
  font-size: 0.78rem;
  color: var(--muted, #64748b);
  margin-top: 4px;
}

.lts-kh-popup-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid var(--border, #e2e8f0);
  padding-top: 14px;
  margin-top: 4px;
}

.lts-kh-popup-btn {
  appearance: none;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--text, #0f172a);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.lts-kh-popup-btn:hover {
  background: var(--surface-hover, rgba(15, 23, 42, 0.05));
}

.lts-kh-popup-btn--primary {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #fff;
}

.lts-kh-popup-btn--primary:hover {
  background: #991b1b;
  border-color: #991b1b;
}

.lts-kh-popup-btn--ghost {
  background: transparent;
  border-color: var(--border, #e2e8f0);
  color: var(--text, #0f172a);
}

.lts-kh-popup-manager {
  font-size: 0.86rem;
  color: var(--text, #0f172a);
}

.lts-kh-popup-manager b {
  color: #b45309;
}

@keyframes lts-kh-popup-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes lts-kh-popup-slide {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}

@media (max-width: 767px) {
  .lts-kh-popup-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .lts-kh-popup-card {
    border-radius: 16px 16px 0 0;
    padding: 16px 14px 20px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .lts-kh-popup-actions {
    flex-direction: column-reverse;
  }

  .lts-kh-popup-btn {
    width: 100%;
  }
}
```

- [ ] **Step 4: Chạy test (PASS)**

```bash
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
```

Expected: `Passed: 13, Failed: 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/layout/KhachHangQuyenGuard.css.test.ts
git commit -m "feat(css): add .lts-kh-popup* styles for guard modal"
```

---
## Task 5: Hook `useKhachHangQuyenGuard` + modal `<KhachHangQuyenGuardModal />`

**Files:**
- Modify: `apps/web/src/components/layout/KhachHangQuyenGuard.tsx` (thêm hook + modal + export)

**Interfaces:**
- Consumes:
  - `dungCuaHangTinhGia` (Zustand store) từ `apps/web/src/store/CuaHangTinhGia.ts`
  - LS key `lts_customers` (literal string)
  - Pure function `shouldShowKhachHangNotice` đã viết ở Task 3
- Produces:
  - `export function useKhachHangQuyenGuard(): { notice: KhachHangNoticeInfo | null; dismiss: () => void; chooseAnother: () => void }`
  - `export default function KhachHangQuyenGuard(): JSX.Element | null` — component gắn vào `VoTrang`, render modal qua portal khi `notice != null`.

- [ ] **Step 1: Thêm hook + modal + component default export vào cuối `KhachHangQuyenGuard.tsx`**

Mở `apps/web/src/components/layout/KhachHangQuyenGuard.tsx`, cuối file (sau pure function), append:

```tsx
// ── Local storage → danh sách KH (cho guard) ───────────────────────────────
const LS_CUSTOMERS = 'lts_customers';

function docKhachHangTuLocalStorage(): KhachHangCoTen[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_CUSTOMERS);
    if (!raw) return [];
    return JSON.parse(raw) as KhachHangCoTen[];
  } catch {
    return [];
  }
}

// ── Hook: theo dõi input.customer + dedup + set notice ───────────────────

export function useKhachHangQuyenGuard() {
  const input = dungCuaHangTinhGia(s => s.input);
  const role = dungCuaHangTinhGia(s => s.role);
  const currentSellerId = dungCuaHangTinhGia(s => s.currentSellerId);
  const policies = dungCuaHangTinhGia(s => s.nguoiDungHienTai?.policies ?? []);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);

  const [danhSach, setDanhSach] = useState<KhachHangCoTen[]>([]);
  const acknowledgedRef = useRef<Set<string>>(new Set());
  const [notice, setNotice] = useState<KhachHangNoticeInfo | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setDanhSach([]);
      return;
    }
    setDanhSach(docKhachHangTuLocalStorage());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotice(null);
      return;
    }
    const next = shouldShowKhachHangNotice({
      inputCustomer: input.customer,
      customers: danhSach,
      role,
      currentSellerId,
      policies,
      acknowledged: acknowledgedRef.current,
    });
    setNotice(next);
  }, [
    input.customer,
    danhSach,
    role,
    currentSellerId,
    policies,
    isAuthenticated,
  ]);

  const dismiss = () => {
    if (notice) acknowledgedRef.current.add(notice.code);
    setNotice(null);
  };

  const chooseAnother = () => {
    if (notice) acknowledgedRef.current.add(notice.code);
    setNotice(null);
    if (typeof document !== 'undefined') {
      const el = document.querySelector<HTMLElement>('[data-customer-input="true"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        window.setTimeout(() => el.focus(), 60);
      }
    }
  };

  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  return { notice, dismiss, chooseAnother };
}

// ── Modal: render qua portal ──────────────────────────────────────────────

function KhachHangQuyenGuardModal({
  info,
  onDismiss,
  onChooseAnother,
}: {
  info: KhachHangNoticeInfo;
  onDismiss: () => void;
  onChooseAnother: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="lts-kh-popup-overlay"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className="lts-kh-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lts-kh-popup-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="lts-kh-popup-card">
          <div className="lts-kh-popup-header">
            <h2 id="lts-kh-popup-title" className="lts-kh-popup-title">
              <AlertTriangle size={18} aria-hidden />
              <span>Khách hàng ngoài quyền quản lý</span>
            </h2>
            <button
              type="button"
              className="lts-kh-popup-close"
              onClick={onDismiss}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="lts-kh-popup-body">
            <div className="lts-kh-popup-kh-card">
              <div className="lts-kh-popup-kh-name">{info.name}</div>
              <div className="lts-kh-popup-kh-meta">Mã: {info.code}</div>
            </div>

            <div className="lts-kh-popup-manager">
              Đang do <b>{info.managerName}</b> phụ trách.
            </div>

            <p>
              Bạn không có quyền lưu báo giá cho khách hàng này.
              Bạn có thể tiếp tục xem và tính toán, nhưng cần đổi sang
              khách hàng bạn quản lý trước khi bấm Lưu.
            </p>
          </div>

          <div className="lts-kh-popup-actions">
            <button
              type="button"
              className="lts-kh-popup-btn lts-kh-popup-btn--ghost"
              onClick={onDismiss}
            >
              Bỏ qua, tiếp tục xem
            </button>
            <button
              type="button"
              className="lts-kh-popup-btn lts-kh-popup-btn--primary"
              onClick={onChooseAnother}
            >
              Chọn KH khác
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Default export: gắn vào VoTrang ──────────────────────────────────────

export default function KhachHangQuyenGuard() {
  const { notice, dismiss, chooseAnother } = useKhachHangQuyenGuard();
  if (!notice) return null;
  return (
    <KhachHangQuyenGuardModal
      info={notice}
      onDismiss={dismiss}
      onChooseAnother={chooseAnother}
    />
  );
}
```

- [ ] **Step 2: Type-check (PASS)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsc --noEmit
```

Expected: không lỗi type ở `KhachHangQuyenGuard.tsx`.

- [ ] **Step 3: Chạy lại 3 test cũ (PASS — refactor không phá)**

```bash
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
```

Expected: tất cả PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/KhachHangQuyenGuard.tsx
git commit -m "feat(guard): add useKhachHangQuyenGuard hook + modal portal"
```

---
## Task 6: Gắn `<KhachHangQuyenGuard />` vào `VoTrang.tsx`

**Files:**
- Modify: `apps/web/src/components/layout/VoTrang.tsx` (import + render)
- Test: `apps/web/src/components/layout/VoTrang.guard-mount.test.ts` (mới, structural)

**Interfaces:**
- Consumes: default export `KhachHangQuyenGuard` từ `apps/web/src/components/layout/KhachHangQuyenGuard.tsx`
- Produces: `<KhachHangQuyenGuard />` được render ở VoTrang (cùng cấp với `DangNhapModal`).

- [ ] **Step 1: Tạo test file**

Tạo `apps/web/src/components/layout/VoTrang.guard-mount.test.ts`:

```ts
/**
 * VoTrang.guard-mount.test.ts - Kiem tra VoTrang co render KhachHangQuyenGuard.
 * Chay: pnpm --filter web exec tsx src/components/layout/VoTrang.guard-mount.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const source = readFileSync(
  resolve(process.cwd(), 'src/components/layout/VoTrang.tsx'),
  'utf8',
);

console.log('\n== VoTrang gắn KhachHangQuyenGuard ==');

assert(
  'import KhachHangQuyenGuard',
  /import\s+KhachHangQuyenGuard\s+from\s+['"]\.\/KhachHangQuyenGuard['"]/.test(source),
);

assert(
  'render <KhachHangQuyenGuard /> trong JSX',
  /<KhachHangQuyenGuard\s*\/?>/.test(source),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Chạy test (FAIL — chưa import/render)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm --filter web exec tsx src/components/layout/VoTrang.guard-mount.test.ts
```

Expected: FAIL cả 2 assert.

- [ ] **Step 3: Sửa `VoTrang.tsx`**

Mở `apps/web/src/components/layout/VoTrang.tsx`, thêm import (đặt cùng nhóm các import modal khác, vd sau `DoiChuKyModal`):

```tsx
import KhachHangQuyenGuard from './KhachHangQuyenGuard';
```

Tìm vị trí `return` cuối cùng của component chính (nơi render `<DangNhapModal />` / `<DoiMatKhauModal />` ...), thêm 1 dòng:

```tsx
      <KhachHangQuyenGuard />
```

Đặt nó **ngoài cùng** (cùng cấp với `DangNhapModal`), ví dụ:

```tsx
      <DangNhapModal />
      <DoiMatKhauModal />
      <DoiAnhDaiDienModal />
      <DoiChuKyModal />
      <DoiPinModal />
      <KhachHangQuyenGuard />
    </>
  );
}
```

- [ ] **Step 4: Chạy test (PASS)**

```bash
pnpm --filter web exec tsx src/components/layout/VoTrang.guard-mount.test.ts
```

Expected: `Passed: 2, Failed: 0`.

- [ ] **Step 5: Type-check toàn repo (PASS — không vỡ import)**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: không lỗi type.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/VoTrang.tsx apps/web/src/components/layout/VoTrang.guard-mount.test.ts
git commit -m "feat(VoTrang): mount KhachHangQuyenGuard modal"
```

---

## Task 7: Build + manual smoke + regression checklist

**Files:**
- Không sửa file code (verification-only task).
- Có thể tạo `docs/superpowers/plans/checklists/2026-08-24-khach-hang-quyen-popup-smoke.md` để ghi nhận kết quả manual test.

- [ ] **Step 1: Build Next.js (PASS — không vỡ)**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm build
```

Expected: build xanh, không có error / warning mới so với main.

- [ ] **Step 2: Lint**

```bash
pnpm --filter web lint
```

Expected: không có lint error mới. Nếu có, sửa inline.

- [ ] **Step 3: Chạy lại toàn bộ test đã thêm**

```bash
pnpm --filter web exec tsx src/lib/customer-api-export.test.ts
pnpm --filter web exec tsx src/components/TheNhapLieu.customer-attr.test.ts
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.test.ts
pnpm --filter web exec tsx src/components/layout/KhachHangQuyenGuard.css.test.ts
pnpm --filter web exec tsx src/components/layout/VoTrang.guard-mount.test.ts
```

Expected: tất cả PASS.

- [ ] **Step 4: Manual smoke qua dev server (12 case trong spec)**

Chạy `pnpm dev:web`. Với 2 account (sale + admin), verify:

1. Login sale A → "Tính giá" → gõ tên KH của sale B → popup hiện
2. Click "Bỏ qua" → popup đóng, input vẫn có tên, form vẫn tính giá
3. Bấm Lưu → `alert()` cũ ở `ManHinhQuanLy.tsx:1183-1185` vẫn chặn (regression)
4. Xoá input, gõ lại tên KH sale B → KHÔNG hiện popup (dedup)
5. F5 → gõ lại tên → popup hiện lại (session reset)
6. Login admin → thao tác tương tự → KHÔNG popup
7. Từ lịch sử load quote cũ có KH ngoài quyền → popup hiện
8. Click "Chọn KH khác" → modal đóng + focus input KH + scroll
9. Phím `Esc` → đóng modal
10. Click overlay → đóng modal
11. Sale A tạo KH mới trong form → KHÔNG popup cho KH đó
12. DevTools mobile (< 768px) → modal full-width dưới header

Đánh dấu từng case OK/FAIL.

- [ ] **Step 5: Regression check (5 chỗ)**

- [ ] Inline warning ở `TheNhapLieu.tsx:650-658` vẫn hiện đúng khi `khachHopLe === false`
- [ ] `alert()` ở `ManHinhQuanLy.tsx:1183-1185` vẫn chặn save đúng
- [ ] Dropdown gợi ý KH vẫn filter đúng theo `locKhachTheoQuyen`
- [ ] `ConfirmDialog` + các modal khác (DangNhapModal, DoiMatKhauModal...) vẫn mount/unmount đúng
- [ ] F5 vẫn restore state từ store / localStorage đúng

- [ ] **Step 6: Commit checklist (nếu có file)**

```bash
git add docs/superpowers/plans/checklists/2026-08-24-khach-hang-quyen-popup-smoke.md
git commit -m "docs(plan): manual smoke + regression checklist for guard popup"
```

---

## Self-Review Checklist (chạy sau khi viết xong plan)

- [x] **Spec coverage:** Mỗi yêu cầu trong spec có task tương ứng:
  - Scope (mọi nơi) → Task 5 (hook ở VoTrang) cover hết
  - Hành vi (thông báo + gợi ý) → Task 5 (modal có 2 nút)
  - Dedup per-session theo `customerCode` → Task 3 (`acknowledged: Set<string>`) + Task 5 (ref)
  - Helper `chuanHoaTenKhach` export → Task 1
  - `data-customer-input` attr → Task 2
  - CSS responsive mobile → Task 4
  - Unit test 10+ case → Task 3 (11 case)
  - Manual test + regression → Task 7
  - Không sửa BE / mobile → không có task nào đụng (chỉ `apps/web`)
- [x] **Placeholder scan:** Không có TBD/TODO/"add appropriate" — tất cả step có code đầy đủ.
- [x] **Type consistency:** `KhachHangNoticeInfo` / `ShouldShowInput` / `shouldShowKhachHangNotice` / `useKhachHangQuyenGuard` / `KhachHangQuyenGuard` (default) — tên nhất quán giữa Task 3 và Task 5.
- [x] **Test command:** Tất cả test dùng `pnpm --filter web exec tsx <file>` (đồng nhất với repo pattern).
