# Trang kết quả Thương mại — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp 1 render path duy nhất cho trang kết quả của cả 2 sub-mode (form + description) trong Tính giá thương mại — description mode hiển thị y hệt form mode (cùng price-hero, chot-gia-row, stat-grid, breakdown, nút Lưu).

**Architecture:** Bỏ early-return description-mode trong `ManHinhQuanLy.tsx` (line 1338-1431). Khi engine trả `ketQua=null` & `isCommercial`, fallback sang `synthesizeResultFromCommercial()` (helper mới trong `engine.ts`) — cost basis lấy từ `tinhGiaThuongMai`, các field engine khác = 0/''. Render path form-mode chạy chung, description mode chỉ thay `rHieuLuc.structureText` → `commercialDescription` và ẩn 2 breakdown khi thiếu Giá mua + LN.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Zustand 5. Test pattern: `tsx` + `node:assert/strict` (xem `engine-thuong-mai.test.ts`).

## Global Constraints

- `apps/web/src/lib/types.ts:596-619` — định nghĩa `commercialMode`, `commercialPurchasePrice`, `commercialProfitValue`, `commercialProfitUnit`, `commercialDescription`, `commercialUnitKind`, `commercialUnitLabel`, `commercialExtraFee`, `commercialUnitWeight`, `boxOptionKey`, `boxPrice`, `bagsPerBox`, `shippingFee`.
- `packages/kieu-du-lieu/src/index.ts:185-238` — `DauVaoTinhGia` schema.
- `apps/web/src/lib/engine.ts:405-487` — `KetQuaThuongMai` interface (dùng bởi `synthesizeResultFromCommercial`).
- Tiền tệ VND, locale `vi-VN`, UI text tiếng Việt.
- Không sửa engine `@lts/bang-tinh-gia` — chỉ sửa web adapter.
- Không sửa `pricing-sheet-mapper.ts` / `history.ts` / `store/CuaHangTinhGia.ts` — schema đã sẵn sàng.
- Regression: `node scripts/test-mo-thuong-mai-tu-lich-su.mjs` phải pass.

---

### Task 1: TDD `synthesizeResultFromCommercial` helper

**Files:**
- Create: `apps/web/src/lib/engine-thuong-mai-synthesize.test.ts`
- Modify: `apps/web/src/lib/engine.ts:1-15` (imports), thêm helper ở cuối file

**Interfaces:**
- Consumes: `CalculateInput` (xem `types.ts`), `AppConstants`, `Material[]`
- Produces: `CalculateResult` (engine result shape) — synthesized từ `tinhGiaThuongMai` + box/shipping từ `hangSo.boxOptions` + `input.boxPrice` + `input.bagsPerBox` + `input.shippingFee`

- [ ] **Step 1: Tạo file test với 4 case**

Tạo `apps/web/src/lib/engine-thuong-mai-synthesize.test.ts`:

```ts
// engine-thuong-mai-synthesize.test.ts — Test synthesizeResultFromCommercial
// Chạy: npx tsx src/lib/engine-thuong-mai-synthesize.test.ts
import assert from 'node:assert/strict';
import { synthesizeResultFromCommercial } from './engine';
import type { CalculateInput, AppConstants } from './types';

const hangSoMacDinh: AppConstants = {
  boxOptions: [
    { key: 'thungNho', price: 5000, label: 'Thùng nhỏ' },
    { key: 'thungLon', price: 10000, label: 'Thùng lớn' },
  ],
} as any;

const cases = [
  {
    ten: 'Có mua + LN% + SL>0: cost basis từ tinhGiaThuongMai, shipping phân bổ theo SL',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 5,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      commercialDescription: 'Túi zipper 3 biên, có quai',
      commercialExtraFee: 0,
      quantity: 50000,
      boxOptionKey: 'thungNho',
      bagsPerBox: 100,
      shippingFee: 1000000,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 294 + 20 + 50 + 0,  // 294 (mua+LN) + 20 (VC=1tr/50k) + 50 (thùng=5k/100) + 0 (extraFee)
      costPerUnit: 294,
      profitRate: 0.05,
      profitAmount: 280 * 0.05 * 50000,  // 700.000
      shippingPerUnit: 20,
      boxPerUnit: 50,
      structureText: 'Túi zipper 3 biên, có quai',
    },
  },
  {
    ten: 'SL=0: profitAmount=0, Doanh thu=0, breakdown vẫn tính per-unit',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 5,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 0,
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 294,  // chỉ cost basis, không có vcPerUnit/thungPerUnit (qty=0)
      profitAmount: 0,
      shippingPerUnit: 0,
      boxPerUnit: 0,
    },
  },
  {
    ten: 'LN = 0: profitRate=0, breakdown chỉ có cost basis',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 280,
      commercialProfitValue: 0,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 10000,
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      finalPrice: 280,
      profitRate: 0,
      profitAmount: 0,
      costPerUnit: 280,
    },
  },
  {
    ten: 'commercialDescription rỗng → structureText = "Mô tả khác"',
    input: {
      pricingMode: 'commercial',
      commercialMode: 'description',
      commercialPurchasePrice: 1000,
      commercialProfitValue: 10,
      commercialProfitUnit: 'percent',
      commercialUnitKind: 'tui',
      quantity: 100,
      commercialDescription: '',
      boxPrice: 0,
      bagsPerBox: 1,
      shippingFee: 0,
    } as unknown as CalculateInput,
    mong: {
      structureText: 'Mô tả khác',
    },
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  try {
    const kq = synthesizeResultFromCommercial(c.input, hangSoMacDinh, []);
    for (const [k, v] of Object.entries(c.mong)) {
      const actual = (kq as any)[k];
      if (typeof v === 'number') {
        const eps = Math.max(1e-6, Math.abs(v) * 1e-4);
        assert.ok(Math.abs(actual - v) < eps, `[${c.ten}] ${k}: mong ${v}, that ${actual} (delta ${Math.abs(actual - v)})`);
      } else {
        assert.equal(actual, v, `[${c.ten}] ${k}: mong ${v}, that ${actual}`);
      }
    }
    pass++;
  } catch (e) {
    console.error(`FAIL: ${c.ten}`);
    console.error(e);
    fail++;
  }
}
console.log(`\nSynthesize result: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: Chạy test để xác nhận fail (helper chưa tồn tại)**

```bash
cd apps/web && npx tsx src/lib/engine-thuong-mai-synthesize.test.ts
```

Expected: FAIL với "Cannot find module './engine'" hoặc "synthesizeResultFromCommercial is not a function".

- [ ] **Step 3: Thêm helper vào `engine.ts`**

Cuối file `apps/web/src/lib/engine.ts` (sau dòng 526, sau `tinhDonGiaThuongMaiHieuLuc`), thêm:

```ts
/**
 * Tạo CalculateResult-shaped từ commercial input (dùng khi description mode).
 * Engine chính trả null vì description mode thiếu data kỹ thuật (khổ, bước cắt, ...).
 * Helper này để description mode dùng chung render path với form mode.
 *
 * Cost basis lấy từ `tinhGiaThuongMai` (mua + LN/sp + extraFee/sp).
 * Các field engine khác (tape, handle, zipper, commission, interest, cyl) = 0.
 * Box từ `hangSo.boxOptions[boxOptionKey].price` hoặc `input.boxPrice`.
 * Shipping phân bổ theo `quantity`.
 */
export function synthesizeResultFromCommercial(
  input: CalculateInput,
  hangSo: AppConstants,
  _materials: Material[]
): CalculateResult {
  const tm = tinhGiaThuongMai(input);
  const qty = Math.max(0, Number(input.quantity) || 0);
  const loaiThung = (hangSo.boxOptions ?? []).find(
    (o: any) => o.key === input.boxOptionKey
  );
  const giaThung = loaiThung
    ? Number(loaiThung.price) || 0
    : Math.max(0, Number(input.boxPrice) || 0);
  const soTuiMotThung = Math.max(1, Number(input.bagsPerBox) || 1);
  const thungPerUnit = giaThung / soTuiMotThung;
  const phiVC = Math.max(0, Number((input as any).shippingFee) || 0);
  const vcPerUnit = qty > 0 ? phiVC / qty : 0;
  const finalPrice = tm.unitPriceVnd + vcPerUnit + thungPerUnit + tm.extraFeePerUnit;
  return {
    input,
    finalPrice,
    costPerUnit: tm.unitPriceVnd,
    profitRate: tm.profitPct,
    profitAmount: tm.profitVnd * qty,
    interestPerUnit: 0,
    shippingPerUnit: vcPerUnit,
    shippingTotal: phiVC,
    commissionPerUnit: 0,
    commissionTotal: 0,
    boxPerUnit: thungPerUnit,
    boxTotal: giaThung,
    tapePerUnit: 0,
    handlePerUnit: 0,
    zipperPerUnit: 0,
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
    cylAllocPerUnit: 0,
    cylinderCost: 0,
    cylinderCostPerUnit: 0,
    cylLength: 0,
    cylCircum: 0,
    totalThickness: 0,
    bagArea: 0,
    tareWeight: 0,
    filmRollArea: 0,
    structureText: (input.commercialDescription || '').trim() || 'Mô tả khác',
    layers: { print: null, laminations: [] },
    totalProductionCost: tm.unitPriceVnd * qty,
    gcShippingPerUnit: 0,
    gcPackagingPerUnit: 0,
    gcOtherPerUnit: 0,
    gcShippingTotal: 0,
    gcPackagingTotal: 0,
    gcOtherTotal: 0,
  } as unknown as CalculateResult;
}
```

- [ ] **Step 4: Chạy test xác nhận pass**

```bash
cd apps/web && npx tsx src/lib/engine-thuong-mai-synthesize.test.ts
```

Expected: `Synthesize result: 4 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/lib/engine.ts apps/web/src/lib/engine-thuong-mai-synthesize.test.ts
git commit -m "feat(engine): add synthesizeResultFromCommercial helper

Tạo CalculateResult-shaped từ commercial input cho description mode
(không có data kỹ thuật). Cost basis từ tinhGiaThuongMai, các field
engine khác = 0. 4 unit test pass."
```

---

### Task 2: `page.tsx` luôn tính `ketQuaThuongMai` khi commercial

**Files:**
- Modify: `apps/web/src/app/page.tsx:33` và `apps/web/src/app/page.tsx:147` (2 chỗ trùng nhau)

- [ ] **Step 1: Sửa line 33**

Tìm:
```ts
const ketQuaThuongMai = laThuongMai && cheDoHienThiThuongMai === 'form' ? tinhGiaThuongMai(input) : null;
```

Sửa thành:
```ts
const ketQuaThuongMai = laThuongMai ? tinhGiaThuongMai(input) : null;
```

- [ ] **Step 2: Sửa line 147** (cùng nội dung, làm y hệt)

- [ ] **Step 3: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/app/page.tsx
git commit -m "fix(page): luôn tính ketQuaThuongMai khi laThuongMai (cả description mode)"
```

---

### Task 3: Xóa description-mode early-return trong `ManHinhQuanLy.tsx`

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx:1338-1431` (xóa block 93 dòng)

- [ ] **Step 1: Xóa block**

Xóa toàn bộ từ dòng 1338 (comment `// Tính giá Thương mại — chế độ "Mô tả khác"`) đến hết dòng 1431 (`}` đóng block `if (isCommercial && commercialMode === 'description')`). Dòng 1432 (trống) và 1433 (`if (!ketQua) {`) giữ nguyên.

Đoạn cần xóa:
```ts
  // Tính giá Thương mại — chế độ "Mô tả khác": chỉ hiện card mô tả, không tính giá
  if (isCommercial && commercialMode === 'description') {
    const kqTM = tinhGiaThuongMai(input);
    const donViTM = kqTM.unitLabel; // "/Túi" | "/m²" | "/m" | "/<custom>"
    const soLuongTM = Math.max(0, Number(input.quantity) || 0);
    // ... (90+ dòng) ...
      </div>
    );
  }
```

- [ ] **Step 2: Xóa import `tinhGiaThuongMai` nếu không dùng nữa**

Tìm trong `ManHinhQuanLy.tsx`:
```ts
import { tinhGiaThuongMai, type KetQuaThuongMai } from '../lib/engine';
```

Đổi thành:
```ts
import { tinhGiaThuongMai, synthesizeResultFromCommercial, type KetQuaThuongMai } from '../lib/engine';
```

(`tinhGiaThuongMai` còn được dùng ở line 1555 nên giữ lại; thêm `synthesizeResultFromCommercial`.)

- [ ] **Step 3: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/components/ManHinhQuanLy.tsx
git commit -m "refactor(ManHinhQuanLy): xóa early-return description-mode (93 dòng)

Description mode sẽ dùng chung render path với form mode (1900-2240).
Fallback ketQua từ synthesizeResultFromCommercial khi engine null."
```

---

### Task 4: Thêm fallback `ketQua` từ synthesize

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx:1442`

- [ ] **Step 1: Sửa line 1442**

Tìm:
```ts
  const r = ketQua;
```

Sửa thành:
```ts
  // Tính giá Thương mại — description mode: engine trả null do thiếu data kỹ thuật.
  // Fallback sang synthesized result để dùng chung render path với form mode.
  let r = ketQua;
  if (!r && isCommercial) {
    r = synthesizeResultFromCommercial(input, hangSo, materials);
  }
```

(`let` thay vì `const` vì có thể gán lại.)

- [ ] **Step 2: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/components/ManHinhQuanLy.tsx
git commit -m "feat(ManHinhQuanLy): fallback ketQua từ synthesizeResultFromCommercial"
```

---

### Task 5: Thay `structureText` bằng `commercialDescription` ở description mode

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx:1939`

- [ ] **Step 1: Sửa line 1939**

Tìm:
```tsx
                  <div><strong>Chất liệu:</strong> {rHieuLuc.structureText}</div>
```

Sửa thành:
```tsx
                  {isCommercial && commercialMode === 'description' ? (
                    <div style={{ maxWidth: 600, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                      <strong>📝 Mô tả:</strong> {input.commercialDescription?.trim() || '(chưa nhập mô tả)'}
                    </div>
                  ) : (
                    <div><strong>Chất liệu:</strong> {rHieuLuc.structureText}</div>
                  )}
```

- [ ] **Step 2: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/components/ManHinhQuanLy.tsx
git commit -m "feat(ManHinhQuanLy): description mode hiện commercialDescription thay structureText"
```

---

### Task 6: Ẩn 2 breakdown khi description mode thiếu data

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx:1637` (thêm biến), `2214-2239` (wrap Chi tiết), `2670-2678` (wrap Trọng lượng)

- [ ] **Step 1: Thêm biến điều kiện trước block return**

Tìm quanh line 1637 (sau các const `commissionPctShown` etc.), thêm:

```ts
  // Description mode: ẩn breakdown khi chưa nhập Giá mua + LN
  const anBreakdownThuongMaiMoTa =
    isCommercial && commercialMode === 'description'
    && (!Number(input.commercialPurchasePrice) || !Number(input.commercialProfitValue));
```

(Đặt SAU `pctLoiNhuanCongTyChot` line ~1657, TRƯỚC `tinhGiaSauGhiDeDonVi` line ~1659.)

- [ ] **Step 2: Wrap TheThuGon Chi tiết (line 2214)**

Tìm:
```tsx
            {/* Chi tiết giá bán đề xuất */}
            <TheThuGon
              resetKey={khoaKetQua}
              style={{marginBottom: '14px'}}
              title={<><span className="icon">💰</span> Chi tiết giá {hasChotGia ? 'chốt' : 'đề xuất'} / {nhanDonVi}</>}
            >
              <ul className="breakdown-list" id="s-breakdown">
                {breakdownItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
                <li className="bl-total">
                  <span className="bl-label" style={{color:'var(--orange)'}}>GIÁ BÁN ĐỀ XUẤT / {nhanDonVi.toUpperCase()}</span>
                  <span className="bl-value" style={{color:'var(--orange)'}}>{dinhDangSo(effFinalPriceWithComm, 0)} đ</span>
                </li>
                {hasChotGia && (
                  <li className="bl-total" style={{borderTop: '1px dashed var(--border)', marginTop: '6px', paddingTop: '8px'}}>
                    <span className="bl-label" style={{color:'var(--green)'}}>GIÁ BÁN CHỐT / {nhanDonVi.toUpperCase()}</span>
                    <span className="bl-value" style={{color:'var(--green)'}}>
                      {dinhDangSo(chotGiaNum, 0)} đ
                      <span style={{fontSize:'0.75em', fontWeight:400, marginLeft:'8px', color: diff >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        ({diff >= 0 ? '+' : ''}{dinhDangSo(diff, 0)} đ)
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </TheThuGon>
```

Wrap trong `{!anBreakdownThuongMaiMoTa && (...)}`:

```tsx
            {!anBreakdownThuongMaiMoTa && (<>
            {/* Chi tiết giá bán đề xuất */}
            <TheThuGon
              resetKey={khoaKetQua}
              style={{marginBottom: '14px'}}
              title={<><span className="icon">💰</span> Chi tiết giá {hasChotGia ? 'chốt' : 'đề xuất'} / {nhanDonVi}</>}
            >
              <ul className="breakdown-list" id="s-breakdown">
                {breakdownItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
                <li className="bl-total">
                  <span className="bl-label" style={{color:'var(--orange)'}}>GIÁ BÁN ĐỀ XUẤT / {nhanDonVi.toUpperCase()}</span>
                  <span className="bl-value" style={{color:'var(--orange)'}}>{dinhDangSo(effFinalPriceWithComm, 0)} đ</span>
                </li>
                {hasChotGia && (
                  <li className="bl-total" style={{borderTop: '1px dashed var(--border)', marginTop: '6px', paddingTop: '8px'}}>
                    <span className="bl-label" style={{color:'var(--green)'}}>GIÁ BÁN CHỐT / {nhanDonVi.toUpperCase()}</span>
                    <span className="bl-value" style={{color:'var(--green)'}}>
                      {dinhDangSo(chotGiaNum, 0)} đ
                      <span style={{fontSize:'0.75em', fontWeight:400, marginLeft:'8px', color: diff >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        ({diff >= 0 ? '+' : ''}{dinhDangSo(diff, 0)} đ)
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </TheThuGon>
            </>)}
```

- [ ] **Step 3: Wrap TheThuGon Trọng lượng (line 2670)**

Tìm:
```tsx
            <TheThuGon
              resetKey={`${trongLuongMoiDonVi}|${soLuongTM}|${phiVC}`}
              style={{marginTop: '14px'}}
              title={<><span className="icon">⚖️</span> Trọng lượng &amp; Vận chuyển</>}
            >
              <ul className="breakdown-list" id="m-t-weight">
                {weightItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
              </ul>
            </TheThuGon>
```

Wrap trong `{!anBreakdownThuongMaiMoTa && (...)}`:

```tsx
            {!anBreakdownThuongMaiMoTa && (
            <TheThuGon
              resetKey={`${trongLuongMoiDonVi}|${soLuongTM}|${phiVC}`}
              style={{marginTop: '14px'}}
              title={<><span className="icon">⚖️</span> Trọng lượng &amp; Vận chuyển</>}
            >
              <ul className="breakdown-list" id="m-t-weight">
                {weightItems.map(([l, v], i) => (
                  <li key={i}><span className="bl-label">{l}</span><span className="bl-value">{v}</span></li>
                ))}
              </ul>
            </TheThuGon>
            )}
```

- [ ] **Step 4: Thêm card hint khi ẩn breakdown**

Tìm ngay sau TheThuGon Chi tiết (sau dòng `</>}` vừa thêm ở Step 2), thêm:

```tsx
            {anBreakdownThuongMaiMoTa && (
              <div className="card" style={{ marginBottom: 14, padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '0.86rem' }}>
                  💡 Nhập <strong>Đơn giá mua</strong> + <strong>Lợi nhuận</strong> ở mục [Thu mua] để hiện Chi tiết giá &amp; Trọng lượng.
                </div>
              </div>
            )}
```

- [ ] **Step 5: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add apps/web/src/components/ManHinhQuanLy.tsx
git commit -m "feat(ManHinhQuanLy): ẩn 2 breakdown khi description mode thiếu Giá mua + LN

Khi commercialMode='description' && (!commercialPurchasePrice || !commercialProfitValue):
- Ẩn TheThuGon 'Chi tiết giá đề xuất'
- Ẩn TheThuGon 'Trọng lượng & Vận chuyển'
- Hiện card hint hướng dẫn nhập ở [Thu mua]"
```

---

### Task 7: Cập nhật spec section 6.4

**Files:**
- Modify: `docs/superpowers/specs/2026-09-04-tinh-gia-thuong-mai-design.md:165-177` (section 6.4)

- [ ] **Step 1: Thay section 6.4**

Tìm section `### 6.4 View "Mô tả khác"` (line 165-177), thay toàn bộ bằng:

```markdown
### 6.4 View "Mô tả khác"

Dùng **chung render path** với form mode. Các điểm khác biệt:

- `rHieuLuc.structureText` được thay bằng `input.commercialDescription` (render trong `.sub` dưới price-hero, có icon 📝).
- Ẩn 2 `TheThuGon` (Chi tiết giá đề xuất + Trọng lượng & Vận chuyển) khi `!commercialPurchasePrice || !commercialProfitValue`. Hiện card hint hướng dẫn nhập ở [Thu mua] thay thế.
- Khi engine trả `ketQua=null` (do description mode thiếu data kỹ thuật), `ManHinhQuanLy` fallback sang `synthesizeResultFromCommercial(input, hangSo, materials)` (helper trong `engine.ts`).
```

- [ ] **Step 2: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add docs/superpowers/specs/2026-09-04-tinh-gia-thuong-mai-design.md
git commit -m "docs: cập nhật spec section 6.4 cho khớp code mới"
```

---

### Task 8: Cập nhật regression script assertions

**Files:**
- Modify: `scripts/test-mo-thuong-mai-tu-lich-su.mjs:117-126`

- [ ] **Step 1: Đọc file để biết assertion hiện tại**

Đọc `scripts/test-mo-thuong-mai-tu-lich-su.mjs:115-130` để xác định assertion cũ.

- [ ] **Step 2: Thêm assertion cho 4 stat-cards mới**

Tìm các dòng assertion cho "Chi tiết giá đề xuất" + "Trọng lượng & Vận chuyển", thêm các dòng mới ngay sau:

```js
  'ManHinhQuanLy: result panel cho thương mại mô tả có Giá bán chốt',
  'ManHinhQuanLy: result panel cho thương mại mô tả có Phân bổ chênh lệch',
  'ManHinhQuanLy: result panel cho thương mại mô tả có stat Lợi nhuận',
  'ManHinhQuanLy: result panel cho thương mại mô tả có stat Doanh thu',
  'ManHinhQuanLy: result panel cho thương mại mô tả có stat Giá Bán/túi',
  'ManHinhQuanLy: result panel cho thương mại mô tả có stat Hoa hồng',
  'ManHinhQuanLy: result panel cho thương mại mô tả có nút Lưu mới',
  'ManHinhQuanLy: result panel cho thương mại mô tả có 📝 Mô tả trong price-hero',
```

(Đặt tên assertion theo pattern `ManHinhQuanLy: ...` đã có trong file. Không xóa assertion cũ — chúng vẫn đúng sau khi gộp render path.)

- [ ] **Step 3: Chạy regression**

```bash
cd C:\UnityProject\PhanMemBaoBi
node scripts/test-mo-thuong-mai-tu-lich-su.mjs
```

Expected: pass (xem `console.log` ở cuối file).

- [ ] **Step 4: Commit**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add scripts/test-mo-thuong-mai-tu-lich-su.mjs
git commit -m "test: cập nhật assertion cho description mode dùng chung render path"
```

---

### Task 9: Verify toàn bộ — `pnpm type-check` + `pnpm test`

- [ ] **Step 1: Chạy type-check**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm type-check
```

Expected: không lỗi type. Nếu fail → fix trước khi tiếp.

- [ ] **Step 2: Chạy unit test**

```bash
cd C:\UnityProject\PhanMemBaoBi
pnpm test
```

Expected: tất cả test pass, bao gồm `engine-thuong-mai.test.ts` + `engine-thuong-mai-synthesize.test.ts` mới.

- [ ] **Step 3: Manual smoke test**

Mở `pnpm dev:web`, vào `Tính giá thương mại`:

1. Chọn "Nhập theo form tính giá" → nhập mua 280đ + LN 5% + KL 25gr → kiểm tra result có đủ price-hero + chốt + 4 stat cards + 2 breakdown.
2. Switch sang "Mô tả khác" → KHÔNG nhập mua/LN → kiểm tra:
   - price-hero hiện "—"
   - 4 stat cards = 0 đ
   - 2 breakdown ẨN, thay bằng card hint
   - dòng "Chất liệu" thành "📝 Mô tả: (chưa nhập mô tả)"
3. Nhập mua + LN trong description mode → breakdown hiện lại, "📝 Mô tả" vẫn hiển thị textarea.
4. Bấm "📄 Lưu mới" → mở lại từ lịch sử → render đúng như lúc lưu.

- [ ] **Step 4: Nếu có fix từ manual, commit riêng**

```bash
cd C:\UnityProject\PhanMemBaoBi
git add -A
git commit -m "fix: điều chỉnh từ manual smoke test"
```
