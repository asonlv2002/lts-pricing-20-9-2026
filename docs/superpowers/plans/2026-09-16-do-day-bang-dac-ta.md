# Cột "Độ dày (mic)" trong bảng đặc tả — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm cột "Độ dày (mic)" vào mọi bảng đặc tả (ghi đè Sale/Admin thường + nâng cao, bảng hiển thị, xuất A4/DOCX) — tự cập nhật khi đổi vật liệu, chỉ LLDPE (`adjustableMic`) sửa được, sửa xong tự tính lại CP vật liệu (đ/m²).

**Architecture:** `doDay` là field ghi đè cấp UI trong `OverrideFields`; cell `ODoDay` hiển thị độ dày của vật liệu hiệu lực và ghi đè được; sửa độ dày → tính lại `matPrice` theo pattern `tinhMatPriceTuRaw` → pipeline ghi đè hiện có lo phần còn lại. Engine `@lts/bang-tinh-gia` giữ nguyên.

**Tech Stack:** Next.js 16 + React 19 + TypeScript (apps/web). Không thêm thư viện.

**Quy ước:** KHÔNG có bước test (rule dự án). Xác minh = `pnpm type-check` + `pnpm lint`.

---

### Task 1: Types + audit labels

**Files:**
- Modify: `apps/web/src/lib/types.ts:662-683`
- Modify: `apps/web/src/lib/override-display.ts:14-32`
- Modify: `apps/web/src/lib/technical-table-mobile-labels.ts`

- [ ] **Step 1: Thêm `doDay` vào `OverrideFields`** (sau `rawMatPrice?: number;` dòng 674):

```typescript
  /** Ghi đè độ dày (mic) — chỉ vật liệu adjustableMic được sửa; sửa xong matPrice tự tính lại */
  doDay?: number;
```

- [ ] **Step 2: Thêm `doDay` vào `detailOverrides`** (dòng 683):

```typescript
  detailOverrides?: Record<number, { width?: number; matPrice?: number; rawMatPrice?: number; materialId?: string; materialName?: string; doDay?: number }>;
```

- [ ] **Step 3: Nhãn audit** — `override-display.ts` `FIELD_LABELS` thêm:

```typescript
  doDay: 'Độ dày (mic)',
```

- [ ] **Step 4: Nhãn mobile** — `technical-table-mobile-labels.ts` thêm `doDay: 'Dày',` trước `printFilm`.

- [ ] **Step 5: Commit** `feat(web): thêm field ghi đè doDay + nhãn audit`

### Task 2: Cell `ODoDay` + reset doDay khi đổi vật liệu (ManHinhQuanLy.tsx)

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx` (component mới sau `OChiTietCoTheGhiDe`, sửa `datGhiDeChiTiet`, `OChonVatLieuDong`, `OChonVatLieuChiTiet`)

- [ ] **Step 1: Mở rộng `datGhiDeChiTiet`** — kiểu `truong` thêm `'doDay'` (dòng 215).

- [ ] **Step 2: Component `ODoDay`** — chèn sau `OChiTietCoTheGhiDe` (sau dòng 268). Xử lý cả row-level (`chiTietIndex === undefined`, ghi qua `khiDat(rk,'doDay',v)`) lẫn detail (ghi qua `datGhiDeChiTiet`). Công thức matPrice: `rawMatPriceHiệnLuc × doDay × density / 1000`. Khi xóa doDay: matPrice trả về giá trị suy từ độ dày mặc định, TRỪ khi matPrice đang là ghi đè tay không khớp giá trị suy từ doDay cũ → giữ nguyên. Edit chỉ mở khi `duocSua && mat?.adjustableMic && mat.pricePerM2 == null`; không có vật liệu → hiện `—`.

- [ ] **Step 3: Reset doDay khi đổi VL** — `OChonVatLieuDong` (2 nhánh: reset + chọn) thêm `khiDat(khoaDong, 'doDay', undefined);` ; `OChonVatLieuChiTiet` thêm `datGhiDeChiTiet(khiDat, ghiDeHienTai, khoaDong, chiTietIndex, 'doDay', undefined);`.

- [ ] **Step 4: Commit** `feat(web): cell ODoDay + reset doDay khi đổi vật liệu`

### Task 3: Cột Độ dày trong `BangDacTaNangCaoGhiDe` (nâng cao Sale/Admin)

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx` (thead ~803-814, tbody ~857-901)

- [ ] **Step 1:** thead thêm `<th className="num">Độ dày (mic)</th>` sau `<th>Vật liệu</th>`.

- [ ] **Step 2:** tbody — sau cell vật liệu (3 nhánh: synthetic → `oSoGc('—', ...)`, detail → `<ODoDay chiTietIndex={row.chiTietIndex} .../>`, thường → `<ODoDay .../>`) với:
  - `idGoc` = `goc?.materialId`; `idHienLuc` = `(row.chiTietIndex !== undefined ? ovChiTiet?.materialId : ovDong?.materialId) ?? idGoc`
  - `matHienLuc` = `materials.find(m => m.id === idHienLuc)`
  - `giaTriGoc` = `matHienLuc?.thickness ?? 0`; `giaTriGhiDe` = doDay theo chiTiet/row
  - `rawMatPriceHienLuc` = ghi đè rawMatPrice ?? `matHienLuc?.pricePerKg ?? 0`
  - Synthetic/GC ngoài (`laGc` hoặc `laDongSynthetic`) → `oSoGc('—', laGc, { dataLabel: 'Độ dày (mic)' })`.

- [ ] **Step 3: Commit** `feat(web): cột Độ dày bảng ghi đè nâng cao Sale/Admin`

### Task 4: Cột Độ dày trong `BangGhiDe` (thường Sale/Admin)

**Files:**
- Modify: `apps/web/src/components/ManHinhQuanLy.tsx` (thead 486-494, tbody 497-573, tổng 600-656)

- [ ] **Step 1:** thead thêm `<th className="num" data-mobile-label={MOBILE_LABELS.doDay}>độ dày (mic)</th>` sau cột Vật liệu.

- [ ] **Step 2:** detail rows — `<ODoDay khoaDong={row.rowKey} chiTietIndex={detailIdx} matIdHienLuc={ghiDeHienTaiChiTiet?.materialId ?? ghiDeNguonChiTiet?.materialId ?? chiTietGoc?.materialId} .../>` sau `OChonVatLieuChiTiet`.

- [ ] **Step 3:** normal rows — `<ODoDay khoaDong={row.rowKey} matIdHienLuc={ghiDeHienTai[row.rowKey]?.materialId ?? ghiDeNguon[row.rowKey]?.materialId ?? dongGoc?.materialId} .../>` sau `OChonVatLieuDong`.

- [ ] **Step 4:** colspan tổng: `colSpan={10}` → `{11}` (CP theo thời gian in), `colSpan={8}` → `{9}` (TỔNG GIÁ THÀNH), `colSpan={11}` → `{12}` (CHÊNH LỆCH).

- [ ] **Step 5: Commit** `feat(web): cột Độ dày bảng ghi đè thường Sale/Admin`

### Task 5: Cột read-only trong `BangDacTaNangCao` (hiển thị)

**Files:**
- Modify: `apps/web/src/components/BangDacTaNangCao.tsx` (thead 103-123, tbody 126-193)

- [ ] **Step 1:** thead thêm `<th className="num">Độ dày (mic)</th>` sau `<th>Vật liệu</th>`.

- [ ] **Step 2:** tbody thêm `<td className="num" data-label="Độ dày (mic)">{row.materialId ? dinhDangSo(materials.find(m => m.id === row.materialId)?.thickness ?? 0, 0) : '—'}</td>` — chỉ khi `row.materialId` tồn tại, ngược lại `—`.

- [ ] **Step 3: Commit** `feat(web): cột Độ dày bảng đặc tả hiển thị nâng cao`

### Task 6: Xuất A4/DOCX — pricing-detail-export.ts

**Files:**
- Modify: `apps/web/src/lib/pricing-detail-export.ts` (`buildCPSXTable` 436-472, `buildOverrideTable` 474-594, `buildDacTaNangCaoHtml` 644-732, `xuatBangDacTaNangCao` 606-636, call sites 981/985-995)

- [ ] **Step 1:** `buildCPSXTable(r, constants)` → thêm tham số `materials: Material[]`; thead thêm `<th>Dày (mic)</th>`; row thêm `<td>${thickness}</td>` (lookup theo `row.materialId`, không có → `—`); colspan total 8→9. Call site 981 truyền `ctx.materials`.

- [ ] **Step 2:** `buildOverrideTable` → thêm tham số `materials: Material[]`; thead thêm `<th>Dày (mic)</th>`; detail + normal rows thêm cell độ dày hiệu lực (`currentOv[...].materialId`/`detailOverrides[di].materialId` ?? row/materialDetail.materialId); 3 chỗ `colspan="8"` → `"9"` (profit row, tổng row, chênh lệch row). Call sites 985/994 truyền `ctx.materials`.

- [ ] **Step 3:** `buildDacTaNangCaoHtml` → thêm tham số `materials: Material[]`; thead thêm `<th>Dày (mic)</th>`; t1 thêm cell `materials.find(row.materialId)?.thickness`; colgroup thêm 1 col, hiệu chỉnh width. `xuatBangDacTaNangCao` truyền `materials` xuống.

- [ ] **Step 4: Commit** `feat(web): cột Độ dày trong xuất A4/DOCX`

### Task 7: Xác minh

- [ ] **Step 1:** `pnpm type-check` — PASS
- [ ] **Step 2:** `pnpm lint` — PASS
