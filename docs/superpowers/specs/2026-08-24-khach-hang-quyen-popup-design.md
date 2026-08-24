# Popup notice khi chọn khách hàng ngoài quyền (màn Tính giá)

Ngày: 2026-08-24 · Trạng thái: Đã duyệt (brainstorm)

## Bối cảnh & vấn đề

User có role `sale` / `purchase` (không có policy `CUSTOMER_MANAGER` / `PRICING_SHEET_ADVISOR`) chỉ được phép lưu báo giá cho khách hàng (KH) mình phụ trách — theo `Customer.managers[]` hoặc fallback `sellerId` / `secondarySellerId`. Xem helper `laNguoiPhuTrach` ở `apps/web/src/lib/customer-api.ts:145`.

Hiện tại khi user vô tình chọn / gõ trúng KH ngoài quyền, hệ thống chỉ phản hồi ở 2 nơi muộn / dễ bỏ qua:

- Inline warning nhỏ dưới ô input ở `apps/web/src/components/TheNhapLieu.tsx:650-658`
- `alert()` chặn ở lúc bấm **Lưu** ở `apps/web/src/components/ManHinhQuanLy.tsx:1183-1185` (`kiemTraKhachHangQuyen`)

Hậu quả: user có thể mất công nhập liệu cả một bảng tính rồi mới bị chặn ở bước Lưu, hoặc thậm chí không nhận ra mình đang ở sai KH vì inline warning quá nhỏ.

## Mục tiêu

Hiển thị 1 popup notice rõ ràng, khó bỏ qua, **ngay tại thời điểm** KH ngoài quyền vừa được set vào `input.customer` — trước khi user mất công nhập tiếp.

## Phạm vi

- Áp dụng cho mọi nơi user có thể chọn/trúng KH ngoài quyền:
  - Form nhập liệu tính giá (`TheNhapLieu.tsx`)
  - Wizard tạo báo giá (`ModuleBaoGia.tsx` → inner `BuocChonKhachHang`)
  - Wizard tạo LSX (`TaoLsxWizard.tsx` → `wizard/BuocChonKhachHang.tsx`)
  - Khi load KH từ lịch sử / sheet cũ
- Chỉ `apps/web` (Next.js). Không đụng `apps/mobile`, `apps/flutter_app`, không sửa BE.

## Quyết định đã chốt (từ brainstorm)

| Câu hỏi | Quyết định |
|---|---|
| Scope? | Mọi nơi chọn KH |
| Hành vi popup? | Thông báo + gợi ý đổi KH (KH vẫn giữ trong form, save vẫn bị chặn bởi `kiemTraKhachHangQuyen` cũ) |
| Dedup? | Mỗi lần chọn + nhớ lần đã đóng (per-session, theo `customerCode`) |
| Cách implement? | Hook `useEffect` theo dõi `input.customer` ở layout shell |

## Kiến trúc

```
┌──────────────────────────────────────────────────────────────────────┐
│ apps/web/src/components/layout/VoTrang.tsx                            │
│   <KhachHangQuyenGuard />   ← hook + modal portal                   │
│                                                                       │
│   useEffect(() => {                                                    │
│     // user/admin/policy guard                                         │
│     // tìm KH khớp input.customer trong danhSachKhachHang              │
│     // nếu không thuộc quyền && chưa acknowledge trong session        │
│     // → bật modal                                                    │
│   }, [input.customer, danhSachKhachHang, currentSellerId, role, ...]) │
│                                                                       │
│   <Portal visible={notice != null} onDismiss=... />                    │
└──────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ đọc state từ store
                                │
┌──────────────────────────────────────────────────────────────────────┐
│ store: customerNotice: { code, name, managerName } | null            │
│        dismissCustomerNotice()                                        │
│        acknowledgedRef: useRef<Set<string>>(new Set())                │
└──────────────────────────────────────────────────────────────────────┘
```

**Tại sao đặt ở `VoTrang.tsx`:** layout shell render 1 lần/session, portal nằm trên cùng DOM, không bị overflow/transform của form cha cản. Tất cả module đều nằm trong VoTrang nên hook cover hết.

**Tại sao KHÔNG cần sửa từng nơi set `input.customer`:** mọi đường dẫn (gõ tay, click gợi ý, wizard callback, load từ lịch sử) đều ghi vào `input.customer` trong store → `useEffect` deps tự re-evaluate → modal tự bật.

## Logic phát hiện

### Điều kiện KHÔNG bật popup (bỏ qua hoàn toàn)

| Điều kiện | Lý do |
|---|---|
| `!isAuthenticated` | Offline / chưa login — không có khái niệm quyền |
| `role === "admin"` | Admin thấy tất cả |
| `coQuyenQuanLyKhachHang(policies)` — có `CUSTOMER_MANAGER` | Được quản lý mọi KH |
| `coQuyenCoVanBangTinh(policies)` — có `PRICING_SHEET_ADVISOR` | Advisor làm việc mọi KH |
| `input.customer.trim() === ""` | Chưa nhập gì |
| Tên KH không match KH nào trong `danhSachKhachHang` | User gõ linh tinh, không phải chọn "trúng" |

### Điều kiện BẬT popup

```ts
const match = danhSachKhachHang.find(kh =>
  chuanHoaTenKhach(kh.companyName) === chuanHoaTenKhach(input.customer)
);
if (match && !laNguoiPhuTrach(match, currentSellerId) && !acknowledged.has(match.customerCode)) {
  showNotice({ code: match.customerCode, name: match.companyName, managerName: tomTatNguoiPhuTrach(match.managers) });
}
```

### Dedup (per-session)

- `acknowledgedRef = useRef<Set<string>>(new Set())` — lưu `customerCode` đã đóng
- Khi user dismiss → push vào ref
- Khi user đổi qua KH khác rồi quay lại KH cũ → KHÔNG hiện lại
- Ref chỉ tồn tại trong session, F5 sẽ reset (đúng nghĩa "session")

**Lý do dùng `customerCode` làm dedup key (không phải tên):** tên có thể trùng giữa các KH (vd 2 KH cùng tên "Công ty ABC" nhưng khác mã) — sẽ dedup nhầm. `customerCode` ổn định, server đảm bảo unique.

### Edge case: KH vừa tạo nhanh trong session

Khi user bấm "Tạo mới" trong `TheNhapLieu.tsx:222-283`, KH mới được gán `managers: [{ userId: currentSellerId, ... }]` ngay từ đầu. Hook check `laNguoiPhuTrach(match, currentSellerId)` sẽ trả về `true` → KHÔNG bật popup. Không cần flag `vuaTaoKhachMoi` riêng.

## UI Modal

### Visual (ASCII)

```
┌─────────────────────────────────────────────┐
│  ⚠️  Khách hàng ngoài quyền quản lý    [×] │
│                                             │
│  Khách hàng:                                │
│  ┌─────────────────────────────────────┐    │
│  │  Công ty ABC                       │    │
│  │  Mã: KH001                         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Đang do Nguyễn Văn A phụ trách.           │
│                                             │
│  Bạn không có quyền lưu báo giá cho         │
│  khách hàng này.                             │
│                                             │
│  Bạn có thể tiếp tục xem/tính toán,         │
│  nhưng cần đổi sang khách hàng bạn          │
│  quản lý trước khi bấm Lưu.                │
│                                             │
│  ─────────────────────────────────────────  │
│  [Bỏ qua, tiếp tục xem]   [Chọn KH khác]  │
└─────────────────────────────────────────────┘
```

### Hành vi các nút

| Nút / Hành động | Hành vi |
|---|---|
| `×` (góc phải) | Dismiss + acknowledge `code` |
| Click overlay ngoài modal | Dismiss + acknowledge |
| Phím `Esc` | Dismiss + acknowledge |
| `[Bỏ qua, tiếp tục xem]` | Dismiss + acknowledge; KH vẫn giữ trong input (cho user xem) |
| `[Chọn KH khác]` | Dismiss + acknowledge + `document.querySelector("[data-customer-input]")?.focus()` + `scrollIntoView({ block: "center" })` |

### Lý do KHÔNG auto-clear input khi "Bỏ qua"

- User có thể muốn xem lịch sử báo giá cũ, hoặc in bảng tính tạm
- `kiemTraKhachHangQuyen` ở `ManHinhQuanLy.tsx:1177` đã chặn save → không sợ "lưu nhầm"
- Tránh cảm giác "mất quyền kiểm soát" khi user bị xoá data không cho phép

### Render & styling

- `createPortal(node, document.body)` để không bị overflow/transform của form cha cản
- Class mới `.lts-kh-popup` + `.lts-kh-popup-overlay` trong `apps/web/src/app/globals.css`
- Design theo hệ giống `ConfirmDialog.tsx` + accent đỏ/cam cho warning
- Icon: Lucide `AlertTriangle` (đã có sẵn trong deps)
- Responsive:
  - Mobile (< 768px): full-width dưới header, padding 12-16px
  - Desktop: centered, max-width 440px
- Tiếng Việt cứng (theo `CLAUDE.md`)
- KHÔNG dùng emoji trong modal production (giữ text + icon)

### Selector input để focus

Thêm `data-customer-input` attribute vào `<input>` customer ở `TheNhapLieu.tsx:642`. Wizard (BuocChonKhachHang ở `ModuleBaoGia` + `wizard/`) cũng thêm attribute tương tự để nhất quán.

## Helper cần dùng (đã có / sửa nhẹ)

| Helper | File | Sửa? |
|---|---|---|
| `laNguoiPhuTrach(customer, userId)` | `apps/web/src/lib/customer-api.ts:145` | Không — đã export |
| `chuanHoaTenKhach(value)` | `apps/web/src/lib/customer-api.ts:177` | **Export** (đang private) — hook cần dùng |
| `tomTatNguoiPhuTrach(managers)` | `apps/web/src/lib/customer-api.ts:119` | Không — đã export |
| `coQuyenQuanLyKhachHang(policies)` | `apps/web/src/lib/permissions.ts:102` | Không — đã export |
| `coQuyenCoVanBangTinh(policies)` | `apps/web/src/lib/permissions.ts:97` | Không — đã export |

## File chạm

| Việc | File | Trạng thái |
|---|---|---|
| Hook + modal | `apps/web/src/components/layout/KhachHangQuyenGuard.tsx` | **Mới** |
| Lắp vào layout | `apps/web/src/components/layout/VoTrang.tsx` | Sửa — thêm `<KhachHangQuyenGuard />` |
| `data-customer-input` attr | `apps/web/src/components/TheNhapLieu.tsx:642` | Sửa — thêm attribute |
| Export helper | `apps/web/src/lib/customer-api.ts` | Sửa — export `chuanHoaTenKhach` |
| CSS popup | `apps/web/src/app/globals.css` | Sửa — thêm `.lts-kh-popup*` |
| Unit test | `apps/web/src/components/layout/KhachHangQuyenGuard.test.ts` | **Mới** |

**KHÔNG cần sửa** (đã cover tự động qua hook ở VoTrang):
- `ModuleBaoGia.tsx` — `BuocChonKhachHang` (inner)
- `wizard/BuocChonKhachHang.tsx`
- `wizard/TaoLsxWizard.tsx`
- Lúc load KH từ lịch sử / sheet cũ

## Test plan

### Unit test (`KhachHangQuyenGuard.test.ts`)

Mô phỏng `useEffect` deps thay đổi, assert `visible` state:

| # | Setup | Expected `visible` |
|---|---|---|
| 1 | role=admin, customer="ABC" (KH ngoài quyền) | `false` |
| 2 | role=sale, customer="ABC" (KH do mình quản lý) | `false` |
| 3 | role=sale, customer="XYZ" (KH người khác) | `true` |
| 4 | role=sale, customer="" | `false` |
| 5 | role=sale, customer="XYZ" lần 2 (đã acknowledge) | `false` |
| 6 | CUSTOMER_MANAGER policy + sale role + customer="XYZ" | `false` |
| 7 | PRICING_SHEET_ADVISOR policy + sale role + customer="XYZ" | `false` |
| 8 | isAuthenticated=false + customer="XYZ" | `false` |
| 9 | role=sale + customer="ABC Linh Tinh" (không match DB) | `false` |
| 10 | KH match nhưng vừa tạo trong session (managers chứa currentSellerId) | `false` |

### Manual test (chạy qua dev server + 2 account sale/admin)

1. Login sale A → vào "Tính giá" → gõ tên KH của sale B → popup hiện
2. Click "Bỏ qua" → popup đóng, input vẫn có tên, form vẫn tính được giá
3. Bấm Lưu → `alert()` cũ vẫn chặn (regression check)
4. Xoá input, gõ lại tên KH của sale B → KHÔNG hiện popup (dedup)
5. F5 → load lại → gõ lại tên → popup hiện lại (session reset)
6. Login admin → thao tác tương tự → KHÔNG popup
7. Từ lịch sử load 1 quote cũ có KH ngoài quyền → popup hiện
8. Click "Chọn KH khác" → modal đóng + focus vào input KH + scroll to view
9. Phím `Esc` → đóng modal
10. Click overlay ngoài modal → đóng modal
11. Sale A tạo KH mới trong form → KHÔNG popup cho KH đó
12. Mobile (DevTools responsive) → modal full-width, padding đúng

### Regression check (đảm bảo không phá chỗ cũ)

- Inline warning ở `TheNhapLieu.tsx:650-658` vẫn hoạt động
- `kiemTraKhachHangQuyen` ở `ManHinhQuanLy.tsx:1177-1187` vẫn chặn save đúng
- `locKhachTheoQuyen` ở dropdown gợi ý vẫn filter đúng
- `ConfirmDialog` và các modal khác không bị ảnh hưởng
- F5 vẫn restore đúng state từ store / localStorage
- Wizard tạo báo giá & LSX vẫn hoạt động bình thường

## Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Hook fire quá nhiều lần (mỗi keystroke) | Dedup set + `useEffect` chỉ chạy khi deps đổi |
| Portal đè lên modal khác (vd DangNhapModal) | z-index cao hơn (vd 60), test khi cả 2 cùng mount |
| Stale `danhSachKhachHang` chưa load từ server → match sai | Effect deps chứa `danhSachKhachHang` → khi load xong sẽ re-evaluate |
| Focus input KH không tồn tại (vd ở màn không có input đó) | Optional chaining `?.focus()` — an toàn nếu không tìm thấy |
| Mobile: modal che mất nút "Chọn KH khác" | Modal responsive, scroll nội bộ nếu quá dài |

## Khi nào KHÔNG áp dụng

- Guest / offline: hook bỏ qua do `!isAuthenticated`
- Admin / có `CUSTOMER_MANAGER` / `PRICING_SHEET_ADVISOR` policy: hook bỏ qua
- Form không phải "tính giá" (vd Cấu hình, Khách hàng module): `input.customer` không set, hook không fire