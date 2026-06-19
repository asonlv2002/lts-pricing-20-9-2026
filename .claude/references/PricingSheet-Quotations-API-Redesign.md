# Pricing Sheet & Quotations — API redesign

> Tổng hợp yêu cầu + plan + trạng thái thực hiện cho đợt thay đổi backend `service-lts` về pricing-sheet + quotations.

---

## 1. Thay đổi API (backend)

| # | Endpoint mới | Thay cho | Mục đích |
|---|---|---|---|
| 1.1 | `PATCH /pricing-sheet/{id}/result` | (mới) | Cập nhật `inputValue` + `saleResult` — không cần quyền đặc biệt |
| 1.2 | `PATCH /pricing-sheet/{id}/advisor-result` | (mới) | Cập nhật `masterResult` — cần quyền `PRICING_SHEET_ADVISOR` |
| 1.3 | `GET /quotations/non-draft` | `/quotations/quotation-in-review` | Đổi tên endpoint |
| 1.4 | `POST /quotations` | giữ | **Bỏ `inputValue` khỏi payload** — schema mới yêu cầu `pricingSheetIds` ≥ 1 |
| 1.5 | `PATCH /quotations/{id}/status_update` | `/quotations/status_update` | Chuyển `quotationId` từ body sang path param |
| 1.6 | `PATCH /quotations/{id}/review_update_status` | `/quotations/review_update_status` | Chuyển `quotationId` từ body sang path param, body chỉ chứa `updateStatus` |

### Body các endpoint mới

**1.1 PATCH /pricing-sheet/{id}/result**
```json
{ "inputValue": <CalculateInput>, "saleResult"?: <override> }
```

**1.2 PATCH /pricing-sheet/{id}/advisor-result**
```json
{ "masterResult": <override> }
```

**1.5 PATCH /quotations/{id}/status_update**
```json
{ }  // body rỗng — id đã có trong URL
```

**1.6 PATCH /quotations/{id}/review_update_status**
```json
{ "updateStatus": "approved" | "rejected" }
```

---

## 2. Trạng thái thực hiện (frontend)

### 2.1 Đã code (Build mode)

| File | Thay đổi |
|---|---|
| `apps/web/src/lib/api/service-lts.ts` | ✅ Policy `PRICING_SHEET_ADVISOR` + 2 hàm PATCH `/result` `/advisor-result` + đổi path `/non-draft` + bỏ `inputValue` khỏi `TaoBaoGiaInput` |
| `apps/web/src/lib/api/pricing-sheet-mapper.ts` | ✅ 2 mapper mới: `mapHistoryToResultPatch`, `mapHistoryToAdvisorPatch` |
| `apps/web/src/lib/api/pricing-sheet-mapper.test.ts` | ✅ 23/23 test pass |
| `apps/web/src/lib/pricing-sheet-sync.ts` | ✅ Helper thuần `quyetDinhPricingSheetSync` — phân biệt 3 nhánh `skip` / `postCreate` / `patch` |
| `apps/web/src/lib/pricing-sheet-sync.test.ts` | ✅ 12/12 test pass |
| `apps/web/src/lib/types.ts` | ✅ Thêm `pricingSheetId?: string` + `originalCustomer?: string` vào `HistoryItem` |
| `apps/web/src/store/slices/calculation.ts` | ✅ Thêm `originalCustomerLoaded: string \| null` + reset trong `resetInput` |
| `apps/web/src/store/slices/history.ts` | ✅ `loadHistoryItem` set `originalCustomerLoaded`<br>✅ `addCurrentToHistory` copy `originalCustomer`<br>✅ Action mới `themBanGhiDoiKhachLenLichSu(sheet, customerMoi)`<br>✅ Thêm field `originalCustomerLoaded?: string \| null` vào `HistorySlice` (để `loadHistoryItem` có thể ghi) |
| `apps/web/src/store/slices/history.test.ts` | ✅ 15/15 test pass |
| `apps/web/src/components/ManHinhQuanLy.tsx` | ✅ Destructure `originalCustomerLoaded` từ store<br>✅ Tính `dangLoadTuLichSu` + `customerDaDoi`<br>✅ Refactor `dayPricingSheetLenServer` dùng `quyetDinhPricingSheetSync`<br>✅ Nút 3 trạng thái: "💾 Lưu báo giá" / "🔄 Cập nhật" / "📄 Tạo bảng tính mới"<br>✅ Banner vàng cảnh báo đổi khách<br>✅ Toast gộp: "💾 Đã lưu báo giá!" |
| `apps/web/src/components/ModuleBaoGia.tsx` | ✅ Bỏ `inputValue` khỏi payload `taoBaoGiaService` |

### 2.2 Chưa code

| # | Công việc | Mức ưu tiên |
|---|---|---|
| A | Đổi `nopBaoGiaService` sang path param `/quotations/{id}/status_update` | Thấp (chưa dùng) |
| B | Đổi `duyetBaoGiaService` sang path param `/quotations/{id}/review_update_status` | Thấp (chưa dùng) |
| C | Debug vấn đề "nhấn Cập nhật bị tạo mới" — dù console không có log, cần check thêm | Cao |
| D | Code 2 nút "Thay đổi từ Sale" / "Thay đổi từ Master" trong `ManHinhQuanLy` | Trung (nếu user cần) |

---

## 3. Logic flow đổi khách (đã chốt)

| Điều kiện | Hành động |
|---|---|
| `input.customer` (form) **giống** `originalCustomerLoaded` | PATCH `/pricing-sheet/{h.pricingSheetId}/result`<br>+ PATCH `/advisor-result` nếu có policy `PRICING_SHEET_ADVISOR` |
| `input.customer` (form) **khác** `originalCustomerLoaded` | POST `/pricing-sheet` → tạo HistoryItem mới (b1: id mới) → alert "Đã tạo bảng tính mới" |
| Chưa load từ lịch sử + chưa có `pricingSheetId` | POST `/pricing-sheet` → lưu `sheet.id` vào `h.pricingSheetId` trong localStorage |

Hàm `quyetDinhPricingSheetSync` (apps/web/src/lib/pricing-sheet-sync.ts) — pure function quyết định nhánh:
- `skip` (lý do: chưa đăng nhập / offline / customer rỗng / mã KH không hợp lệ)
- `postCreate` (lý do: `doi-khach` hoặc `chua-co-id`)
- `patch` (có `pricingSheetId` + `includeAdvisor: boolean`)

---

## 4. UX (đã code)

| Trạng thái | Nút | Banner | Toast |
|---|---|---|---|
| Mới (chưa load từ lịch sử) | "💾 Lưu báo giá" | Ẩn | "💾 Đã lưu báo giá!" |
| Load từ lịch sử + cùng khách | "🔄 Cập nhật" | Ẩn | "💾 Đã lưu báo giá!" |
| Load từ lịch sử + đổi khách | "📄 Tạo bảng tính mới" | **Vàng** (amber-500) | "💾 Đã lưu báo giá!" |

Banner cảnh báo (vàng):
```css
background: rgba(245, 158, 11, 0.08);
border: 1px solid rgba(245, 158, 11, 0.3);
color: #b45309;
```

---

## 5. Trạng thái tổng kết

- ✅ **Backend API redesign**: 5/6 endpoints frontend đã cập nhật (chỉ còn 1.5 và 1.6 ở mức thấp)
- ✅ **Helper thuần + test**: 12/12
- ✅ **Mapper + test**: 23/23
- ✅ **History slice + test**: 15/15
- ✅ **UX 3 trạng thái nút**: đã code
- ✅ **Type-check web**: PASS

---

## 6. Câu hỏi đang chờ user trả lời

1. **Debug PATCH bị fail**: User xác nhận item có `pricingSheetId` + console không có log. Cần check thêm (Network tab xem request PATCH có gửi đi không, response là gì).
2. **2 nút "Thay đổi từ Sale/Master"**: Có nên code mới không, hay bỏ qua?
3. **Ưu tiên tiếp theo**: (a) Debug PATCH, (b) Code 2 nút override, (c) Cả 2.

---

## 7. Lệnh kiểm tra

```bash
pnpm type-check --filter web
pnpm --filter web exec tsx src/lib/pricing-sheet-sync.test.ts
pnpm --filter web exec tsx src/store/slices/history.test.ts
pnpm --filter web exec tsx src/lib/api/pricing-sheet-mapper.test.ts
```
