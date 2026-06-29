# Plan: Bỏ localStorage KH, dùng Zustand slice

Trạng thái: **PLAN (chưa triển khai)**

## Mục tiêu

- Bỏ hoàn toàn `localStorage` cho dữ liệu khách hàng
- Dùng 1 Zustand slice làm nguồn dữ liệu duy nhất cho toàn app
- Sau login → KH đã có sẵn, không cần chờ mở module KH mới fetch

## Hiện trạng (vấn đề)

- KH được lưu trong `localStorage` (`LS_CUSTOMERS`) → 12 references
- Chỉ fetch khi mở `ModuleKhachHang` (lazy-load)
- `TheNhapLieu` (bảng tính giá) cần KH nhưng chưa có → dropdown trống
- `ManHinhQuanLy`, `ModuleBaoGia` cũng đọc LS → có thể stale

## Luồng dữ liệu mới

```
LOGIN / F5 / SESSION RESTORE
         │
         ▼
   auth.ts: login() / kiemTraVaKhoiPhucPhien()
         │
         ├── taiLichSuTuServer()           ← đã có
         └── get().refreshCustomers()      ← THÊM MỚI  (non-blocking)
                  │
                  ▼
         customersSlice.refreshCustomers()
                  │
                  ├── layKhachHangService(accessToken)
                  ├── map → chuyenDanhSachCustomerApiSangUi()
                  └── set({ customers: CustomerUi[], loaded: true })
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         TheNhapLieu  ManHinhQL  ModuleBaoGia  ModuleKhachHang
              │            │            │            │
         dungCua...    dungCua...  dungCua...   dungCua...
         (s=>s.cus-    (s=>s.cus-  (s=>s.cus-   (s=>s.cus-
          tomers)       tomers)     tomers)      tomers)
```

## F5 / Refresh Token

| Sự kiện | Hành vi |
|---------|---------|
| **F5 (page refresh)** | State reset → `kiemTraVaKhoiPhucPhien()` gọi `refreshCustomers()` mới từ server |
| **Refresh token** | Không cần fetch lại. Token mới nhưng data trong memory vẫn valid. `goiService()` tự retry với token mới. |

## Task list

| # | File | Việc | Mô tả |
|---|------|------|-------|
| 1 | **NEW** `store/slices/customers.ts` | Tạo slice | State: `customers: CustomerUi[]`, `loaded: boolean`, `loading: boolean`, `error: string|null`. Actions: `refreshCustomers()`, `setCustomers(cs)`, `addCustomer(c)`, `updateCustomer(c)` |
| 2 | `store/CuaHangTinhGia.ts` | Thêm slice | Import `CustomerSlice`, merge vào store type + create. Thêm `customers: []`, `loaded: false`, `loading: false`, `error: null` |
| 3 | `store/slices/auth.ts` | Gọi refresh | Trong `login()` (line 145), `kiemTraVaKhoiPhucPhien()` (lines 259, 293): thêm `get().refreshCustomers?.().catch(() => {})` sau `taiLichSuTuServer()` |
| 4 | `store/helpers.ts` | Dọn dẹp | Xóa `export const LS_CUSTOMERS`, xóa `loadCustomers()`, xóa `chuanHoaTenKhach()` (nếu ko còn dùng) |
| 5 | `components/TheNhapLieu.tsx` | Dùng slice | - Bỏ `useState(() => loadCustomers())` (line 129), dùng `s.customers`<br>- Bỏ `useEffect` fetch KH riêng (lines 144-165)<br>- Bỏ `luuLocalStorage(LS_CUSTOMERS, ...)` (lines 160, 258), gọi `s.addCustomer()` thay thế<br>- Bỏ `lamMoiDanhSachKhachHang` dùng `loadCustomers` (lines 136-142) |
| 6 | `components/ManHinhQuanLy.tsx` | Dùng slice | Bỏ `import { LS_CUSTOMERS, loadCustomers }`, dùng `s.customers` thay vì `loadCustomers()` ở line 623 |
| 7 | `components/ModuleBaoGia.tsx` | Dùng slice | Bỏ `LS_CUSTOMERS` constant (line 37), bỏ `docKhachHang()` đọc LS (lines 46-52), dùng `s.customers` trong wizard chọn KH |
| 8 | `components/ModuleKhachHang.tsx` | Refactor | - Bỏ `LS_CUSTOMERS` constant (line 90)<br>- Bỏ `loadLocalCustomers()` + `saveLocalCustomers()` (lines 249-258)<br>- `refreshCustomersFromServer` → gọi `g.refreshCustomers()` (line 1627)<br>- `useEffect` load ban đầu (lines 1661-1692): bỏ đọc LS trước, chỉ gọi `refreshCustomers()`<br>- `upsertLocal`, `patch`, `assignSeller`: gọi `s.addCustomer()` / `s.updateCustomer()` thay vì `saveLocalCustomers()` + `setCustomers(localState)`<br>- Giữ interval 30s refresh (nhưng gọi slice action) |

## Lưu ý

### Type cho menu chọn KH
`TheNhapLieu` dùng `KhachHangGoiY` (subset của `CustomerUi`). Khi đọc từ slice, map về type đó:
```typescript
const danhSachKhachHang = useMemo(() => 
  customers.map(c => ({
    id: c.id, customerCode: c.customerCode, companyName: c.companyName,
    contactName: c.contactName, phone: c.phone, sellerId: c.sellerId,
    secondarySellerId: c.secondarySellerId, sellerName: c.sellerName,
    managers: c.managers, status: c.status, isLocked: c.isLocked,
  } as KhachHangGoiY)),
[customers]);
```

### ModuleKhachHang vẫn giữ local state
Module này cần local state riêng (`useState<Customer[]>`) vì:
- Có nháp (draft) local-only
- Cần merge draft vào danh sách
- CRUD cần state riêng để control form

Nhưng thay vì đọc/ghi localStorage, nó sẽ:
- Khởi tạo từ slice: `const [customers, setCustomers] = useState(() => sliceCustomers)`
- Sau CRUD server: gọi `slice.addCustomer()` / `slice.updateCustomer()` để sync

### Không làm gì với Config và LSX
Chỉ KH trong lần này. Config và LSX để phase sau.

## Số lượng thay đổi

| Nhóm | Số file |
|------|---------|
| File mới | 1 (customers.ts) |
| Store core | 2 (CuaHangTinhGia.ts, auth.ts) |
| Helpers | 1 (helpers.ts) |
| Components | 4 (TheNhapLieu, ManHinhQuanLy, ModuleBaoGia, ModuleKhachHang) |
| **Tổng** | **8 files** |
