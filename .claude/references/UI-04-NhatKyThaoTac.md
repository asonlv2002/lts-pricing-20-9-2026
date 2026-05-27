# UI/UX — Mục 4: Nhật Ký Thao Tác (Audit Log)

## Tổng quan

Ghi nhận toàn bộ thao tác có thay đổi trạng thái / dữ liệu trong hệ thống. Không ai có thể chỉnh sửa (kể cả admin). Cho phép bấm vào xem dữ liệu liên quan.

---

## Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo LTS | Tính giá & Báo giá | [User ▾]                  │
├─────────────────────────────────────────────────────────────────────┤
│  TABS: [Tạo bảng tính giá] [Tạo báo giá] [Lịch sử] [● Nhật ký]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ FILTER BAR ────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  Thời gian: [Hôm nay ▾]   🔍 [Tìm kiếm..._________]       │   │
│  │                                                              │   │
│  │  [+ Thêm bộ lọc]                                            │   │
│  │                                                              │   │
│  │  Đang lọc: [Tạo mới ×] [Báo giá ×]                         │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ TIMELINE ──────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ── 28/05/2026 ──────────────────────────────────────────── │   │
│  │                                                              │   │
│  │  ┃ 15:30  Nguyễn Văn An                                     │   │
│  │  ┃ Chỉnh sửa › Báo giá BG-2026-0523-001                    │   │
│  │  ┃ Thay đổi giá SP "Túi zip 500g": 2,500₫ → 2,800₫        │   │
│  │  ┃ [Xem báo giá →]                                          │   │
│  │  ┃                                                           │   │
│  │  ┃ 14:15  Trần Gia Bảo                                      │   │
│  │  ┃ Tạo mới › Bảng tính giá TG-2026-0528-003                 │   │
│  │  ┃ SP: Màng ghép OPP/AL/PE, KH: Bao Bì Sài Gòn            │   │
│  │  ┃ [Xem bảng tính giá →]                                    │   │
│  │  ┃                                                           │   │
│  │  ┃ 10:02  Lê Thu Hà                                         │   │
│  │  ┃ Thay đổi trạng thái › Báo giá BG-2026-0520-007          │   │
│  │  ┃ Trạng thái: Chờ duyệt → Đã duyệt                        │   │
│  │  ┃ [Xem báo giá →]                                          │   │
│  │  ┃                                                           │   │
│  │  ── 27/05/2026 ──────────────────────────────────────────── │   │
│  │                                                              │   │
│  │  ┃ 16:45  Admin                                              │   │
│  │  ┃ Thay đổi trạng thái › Khách hàng KH-001                  │   │
│  │  ┃ Tag: Mới (Lead) → Đang tương tác                         │   │
│  │  ┃ [Xem khách hàng →]                                       │   │
│  │  ┃                                                           │   │
│  │  ...                                                         │   │
│  │                                                              │   │
│  │  ── Load more ──                                             │   │
│  │  [Tải thêm 20 mục]  hoặc auto infinite scroll               │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cấu trúc mỗi entry trong Timeline

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┃  15:30  👤 Nguyễn Văn An                                 │
│  ┃                                                           │
│  ┃  ┌────────────────────────────────────────────────────┐   │
│  ┃  │  🏷️ Chỉnh sửa                                     │   │
│  ┃  │                                                    │   │
│  ┃  │  Module: Báo giá thương mại                        │   │
│  ┃  │  Đối tượng: BG-2026-0523-001                       │   │
│  ┃  │                                                    │   │
│  ┃  │  Chi tiết thay đổi:                                │   │
│  ┃  │  • Giá SP "Túi zip 500g" (10,000 cái):            │   │
│  ┃  │    2,500 ₫ → 2,800 ₫                              │   │
│  ┃  │  • Giá SP "Túi zip 500g" (50,000 cái):            │   │
│  ┃  │    2,200 ₫ → 2,500 ₫                              │   │
│  ┃  │                                                    │   │
│  ┃  │  [Xem báo giá →]                    (link button) │   │
│  ┃  └────────────────────────────────────────────────────┘   │
│  ┃                                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Các loại entry và icon tương ứng:

| Loại hành động | Icon | Màu accent |
|---|---|---|
| Tạo mới | `+` (Plus) | green-600 |
| Chỉnh sửa | `✏️` (Pencil) | blue-600 |
| Xóa (Ẩn) | `🗑` (Trash) | red-600 |
| Gửi duyệt | `↗` (Send) | indigo-600 |
| Duyệt | `✓` (Check) | green-600 |
| Từ chối / Trả về | `✕` (X) | red-500 |
| Gửi khách hàng | `📤` (Mail) | purple-600 |
| Khóa dữ liệu | `🔒` (Lock) | gray-700 |
| Khôi phục | `↺` (Undo) | amber-600 |
| Tạo LSX | `🏭` (Factory) | teal-600 |

---

## Phễu lọc chi tiết

### Hiển thị mặc định:

```
┌──────────────────────────────────────────────────────────────────┐
│  Thời gian: [Hôm nay ▾]    🔍 [Tìm mã BG, KH, SP..._________] │
│                                                                  │
│  [+ Thêm bộ lọc]                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Danh sách bộ lọc có thể thêm:

```
┌─────────────────────────────┐
│  ☐ Tài khoản thực hiện     │
│  ☐ Phân mục dữ liệu        │
│  ☐ Loại hành động           │
│  ☐ Địa chỉ IP / Thiết bị   │  ← chỉ admin
└─────────────────────────────┘
```

---

### Bộ lọc 1: Thời gian thao tác

- **Component:** Date Range Picker (hỗ trợ chọn giờ:phút)
- **Mặc định:** Hôm nay
- **Quick options:** Hôm nay | 7 ngày qua | 30 ngày qua | Tháng này | Tùy chỉnh

```
┌─────────────────────────────────────────────────┐
│  Thời gian: [Hôm nay                      ▾]   │
│  ┌─────────────────────────────────────────────┐│
│  │  ● Hôm nay                                 ││
│  │  ○ 7 ngày qua                              ││
│  │  ○ 30 ngày qua                             ││
│  │  ○ Tháng này                               ││
│  │  ○ Tùy chỉnh:                              ││
│  │    Từ: [28/05/2026] [14:00]                 ││
│  │    Đến: [28/05/2026] [18:00]                ││
│  │                                             ││
│  │    [Áp dụng]                                ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

> Dev note: Cho phép lọc chi tiết đến Giờ:Phút để tra soát ca làm việc.

---

### Bộ lọc 2: Tài khoản thực hiện

- **Component:** Autocomplete search
- **Data:** Tất cả tài khoản (Họ tên — Mã NV/Username)
- **Logic:** Truy vấn theo User_ID

```
┌─────────────────────────────────────┐
│  Người thực hiện: [Nguyễn_______|▾] │
│  ┌─────────────────────────────────┐│
│  │ 👤 Nguyễn Văn An (NV-001)      ││
│  │ 👤 Nguyễn Thị Mai (NV-008)     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

### Bộ lọc 3: Phân mục dữ liệu (Module)

- **Component:** Multi-select dropdown
- **Options:**
  - ☐ Cấu hình tính giá (Vật tư, Hao hụt...)
  - ☐ Hồ sơ Khách hàng
  - ☐ Bảng tính giá
  - ☐ Báo giá thương mại
  - ☐ Đơn hàng & Lệnh sản xuất (LSX)
  - ☐ Phân quyền hệ thống

---

### Bộ lọc 4: Loại hành động

- **Component:** Checkbox group dropdown
- **Options chia 2 nhóm:**

```
┌─────────────────────────────────────┐
│  Loại hành động: [3 đã chọn    ▾]  │
│  ┌─────────────────────────────────┐│
│  │  ── Thay đổi dữ liệu ──       ││
│  │  ☑ Tạo mới                     ││
│  │  ☑ Chỉnh sửa                   ││
│  │  ☐ Xóa (Ẩn)                    ││
│  │                                 ││
│  │  ── Thay đổi trạng thái ──     ││
│  │  ☑ Gửi duyệt                   ││
│  │  ☐ Duyệt                       ││
│  │  ☐ Từ chối / Trả về            ││
│  │  ☐ Gửi khách hàng              ││
│  │  ☐ Khóa dữ liệu               ││
│  │  ☐ Khôi phục                   ││
│  │  ☐ Tạo LSX                     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

### Bộ lọc 5: Đối tượng mục tiêu (Text Search)

- **Component:** Text input tìm kiếm tự do
- **Behavior:** LIKE %từ-khóa% trên các trường: Mã báo giá, Mã KH, Tên SP, Số LSX
- **Placeholder:** "Tìm mã BG, mã KH, tên SP, số LSX..."

---

### Bộ lọc 6: Địa chỉ IP / Thiết bị (Admin only)

- **Component:** Text search + dropdown
- **Data:** Danh sách IP hoặc OS (Windows, iPhone, Android)
- **Mục đích:** Tra soát bảo mật — kiểm tra đăng nhập từ IP lạ

```
┌─────────────────────────────────────────┐
│  IP/Thiết bị: [192.168________|▾]       │
│  ┌─────────────────────────────────────┐│
│  │  💻 192.168.1.100 (Windows)         ││
│  │  📱 192.168.1.55 (iPhone)           ││
│  │  💻 103.45.67.89 (Ngoài mạng) ⚠️   ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

> Note: IP ngoài mạng công ty hiển thị warning icon.

---

## Chi tiết thay đổi — Diff View

Khi entry có thay đổi dữ liệu cụ thể, hiển thị diff:

```
┌──────────────────────────────────────────────────────┐
│  Chi tiết thay đổi:                                  │
│                                                      │
│  ┌─ Trường: Giá báo (10,000 cái) ─────────────────┐ │
│  │  - 2,500 ₫                        (text-red)    │ │
│  │  + 2,800 ₫                        (text-green)  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Trường: Ghi chú ──────────────────────────────┐ │
│  │  - "Giá tạm, chờ xác nhận"        (text-red)   │ │
│  │  + "Giá chính thức sau duyệt"     (text-green)  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Thay đổi trạng thái:

```
┌──────────────────────────────────────────────────────┐
│  Thay đổi trạng thái:                               │
│                                                      │
│  [○ Chờ duyệt] ──────▶ [✓ Đã duyệt]                │
│   (amber badge)          (blue badge)                │
│                                                      │
│  Ghi chú duyệt: "OK, giá hợp lý"                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Link "Xem dữ liệu liên quan"

Mỗi entry có nút link dẫn đến dữ liệu gốc:

| Loại dữ liệu | Action khi bấm |
|---|---|
| Bảng tính giá | Mở detail panel bảng tính giá (như mục 3) |
| Báo giá | Mở detail panel báo giá (như mục 3) |
| Khách hàng | Chuyển sang module Khách hàng, mở detail KH |
| LSX | Chuyển sang module LSX |
| Cấu hình | Mở trang cấu hình tương ứng |

---

## Tính chất đặc biệt: READ-ONLY

```
┌──────────────────────────────────────────────────────┐
│  ⓘ  Nhật ký thao tác không thể chỉnh sửa hoặc xóa  │
│     bởi bất kỳ ai, kể cả quản trị viên.             │
└──────────────────────────────────────────────────────┘
```

- Không có nút Edit/Delete trên bất kỳ entry nào
- Không có context menu chỉnh sửa
- Data chỉ có thể được tạo bởi hệ thống (auto-log)
- UI thể hiện rõ tính immutable: không có hover edit state

---

## Loading & Pagination

- **Infinite scroll** với batch 20 entries
- Khi scroll gần bottom → auto-load thêm
- Loading indicator: skeleton 3 entries
- Nếu không có kết quả:

```
┌──────────────────────────────────────────┐
│                                          │
│         📝                               │
│                                          │
│    Không có thao tác nào                 │
│    trong khoảng thời gian này            │
│                                          │
│    Thử mở rộng khoảng thời gian         │
│    hoặc thay đổi bộ lọc.                │
│                                          │
│    [Xóa bộ lọc]                         │
│                                          │
└──────────────────────────────────────────┘
```

---

## Responsive

| Breakpoint | Layout |
|---|---|
| Desktop ≥1280px | Timeline full-width, filter bar ngang |
| Tablet 768-1279px | Timeline full-width, filter collapse |
| Mobile <768px | Timeline compact (ẩn chi tiết, bấm expand), filter = bottom sheet |

### Mobile compact entry:

```
┌─────────────────────────────────────┐
│  15:30 • An • Chỉnh sửa            │
│  Báo giá BG-2026-0523-001      [▸] │
└─────────────────────────────────────┘
     ↓ (bấm expand)
┌─────────────────────────────────────┐
│  15:30 • Nguyễn Văn An              │
│  Chỉnh sửa › Báo giá               │
│  BG-2026-0523-001                   │
│                                     │
│  • Giá "Túi zip": 2,500→2,800₫     │
│  • Giá "Túi zip": 2,200→2,500₫     │
│                                     │
│  [Xem báo giá →]                    │
└─────────────────────────────────────┘
```

---

## Accessibility

- Timeline dùng `<ol>` semantic, m���i entry là `<li>`
- Date separators dùng `role="heading" aria-level="3"`
- Link "Xem..." có `aria-label="Xem [loại] [mã]"`
- Diff view: giá trị cũ có `aria-label="Giá trị cũ: ..."`, mới có `aria-label="Giá trị mới: ..."`
- Infinite scroll: `aria-live="polite"` khi load thêm entries
- Filter chips: `aria-label="Xóa bộ lọc [tên]"`
- Toàn bộ content read-only: không có `tabindex` trên non-interactive elements

---

## Data Model (cho Dev)

Mỗi audit log entry cần lưu:

```typescript
interface AuditLogEntry {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601 với timezone
  userId: string;                // User_ID người thực hiện
  userName: string;              // Tên hiển thị
  actionType: ActionType;        // Enum: create | edit | delete | ...
  moduleName: ModuleName;        // Enum: pricing | quote | customer | ...
  targetId: string;              // ID đối tượng bị tác động
  targetCode: string;            // Mã hiển thị (BG-xxx, TG-xxx, KH-xxx)
  targetLabel: string;           // Tên/mô tả ngắn
  changes?: FieldChange[];       // Chi tiết thay đổi
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  };
}

interface FieldChange {
  fieldName: string;
  fieldLabel: string;            // Tên hiển thị tiếng Việt
  oldValue: string | number | null;
  newValue: string | number | null;
}

type ActionType = 
  | 'create' | 'edit' | 'delete'
  | 'submit' | 'approve' | 'reject'
  | 'send_customer' | 'lock' | 'restore' | 'create_lsx';

type ModuleName =
  | 'pricing_config' | 'customer'
  | 'pricing_sheet' | 'quotation'
  | 'order_lsx' | 'permission';
```
