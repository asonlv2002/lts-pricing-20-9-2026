# UI/UX — Mục 5: Quản Lý Khách Hàng

## Tổng quan

Module quản lý khách hàng gồm 2 mục: Danh sách khách hàng + Nhật ký thao tác. Không cho xóa KH, chỉ sale được phân công hoặc admin mới thao tác được.

---

## Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo LTS | Khách hàng | [User ▾]                          │
├─────────────────────────────────────────────────────────────────────┤
│  TABS: [● Danh sách khách hàng] [Nhật ký thao tác]                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ TOOLBAR ───────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  🔍 [Tìm KH, MST, SĐT..._____________]                     │   │
│  │                                                              │   │
│  │  Xem: [▦ Bảng] [▤ Thẻ]    Sắp xếp: [A-Z ▾]   [+ Thêm KH] │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ DANH SÁCH ─────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  (Nội dung bảng hoặc thẻ — xem chi tiết bên dưới)           │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: Danh sách Khách hàng

### Toolbar

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🔍 [Tìm theo tên, mã KH, MST, SĐT..._________________________]   │
│                                                                      │
│  Lọc: [Trạng thái ▾] [Sale phụ trách ▾] [Khu vực ▾] [Nhóm KH ▾]  │
│                                                                      │
│  Xem: [▦ Bảng] [▤ Thẻ]     Sắp xếp: [Tên A-Z ▾]                  │
│                                                                      │
│  [+ Thêm khách hàng]  (primary button, góc phải)                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Chế độ xem Bảng (Table View)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️│ Mã KH   │ Tên công ty          │ MST        │ SĐT        │ Tag      │ Sale    │
│───┼─────────┼──────────────────────┼────────────┼────────────┼──────────┼─────────│
│   │ KH-001  │ Gạo Thơm Miền Tây   │ 0312345678 │ 0901234567 │ 🟢 Active│ An      │
│ ! │ KH-002  │ Bao Bì Sài Gòn      │ 0398765432 │ 0987654321 │ 🟡 Nego  │ Bảo     │
│ ! │ KH-003  │ Thực phẩm Hà Nội    │ —          │ 0912345678 │ 🔵 Lead  │ Chưa PC │
│   │ KH-004  │ Nhựa Đại Phát       │ 0345678901 │ 0923456789 │ ⚪ Pause │ Hà      │
│───┼─────────┼──────────────────────┼────────────┼────────────┼──────────┼─────────│
│                                                                                    │
│  Hiển thị 1-20 / 156 khách hàng    [← Trước] Trang 1/8 [Tiếp →]                 │
└──────────────────────────────────────────────────────────────────────────────────────┘

Ghi chú:
- Cột "⚠️" hiển thị dấu ! đỏ nếu thiếu thông tin bắt buộc
- "Chưa PC" = chưa phân công → admin có thể bấm để phân công trực tiếp
- Sắp xếp mặc định: theo bảng chữ cái (Tên công ty)
```

---

### Chế độ xem Thẻ (Card View)

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  🏢 Gạo Thơm MT     │  │  ⚠️ Bao Bì SG       │  │  ⚠️ Thực phẩm HN   │
│                     │  │                     │  │                     │
│  KH-001             │  │  KH-002             │  │  KH-003             │
│  MST: 0312345678    │  │  MST: 0398765432    │  │  MST: —             │
│  📞 0901234567      │  │  📞 0987654321      │  │  📞 0912345678      │
│                     │  │                     │  │                     │
│  [🟢 Đang hoạt động]│  │  [🟡 Đang tương tác]│  │  [🔵 Mới (Lead)]   │
│                     │  │                     │  │                     │
│  Sale: Nguyễn Văn An│  │  Sale: Trần Gia Bảo │  │  Sale: Chưa PC [+] │
│                     │  │                     │  │                     │
│  ── Hoàn thiện ──── │  │  ── Hoàn thiện ──── │  │  ── Hoàn thiện ──── │
│  ████████████ 12/12 │  │  ████████░░░░ 9/12  │  │  █████░░░░░░░ 5/12  │
│                     │  │  Thiếu: Địa chỉ HĐ, │  │  Thiếu: MST, Địa   │
│                     │  │  Email, Ghi chú      │  │  chỉ, Email...      │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

### Dấu ! đỏ — Missing Info Indicator

**Các trường bắt buộc cần kiểm tra:**
1. Tên khách hàng / Tên công ty
2. Mã số thuế (MST)
3. Địa chỉ xuất hóa đơn
4. Người liên hệ trực tiếp
5. Số điện thoại liên hệ
6. Email chính
7. Tên + Chức vụ + SĐT + Email người liên hệ
8. Địa chỉ giao hàng
9. Mã khách hàng
10. Nhân viên Sale phụ trách
11. Tag trạng thái
12. Ghi chú (Note)

**Hiển thị:**
- Trong table: cột đầu tiên hiển thị `!` đỏ (tooltip: "Thiếu n trường thông tin")
- Trong card: progress bar + danh sách trường thiếu
- Trong detail: field thiếu có border đỏ nhạt + label "Bắt buộc *"

---

## Tag trạng thái khách hàng (Tự động)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🔵 Mới (Lead)                                                      │
│  ├── Vừa tạo hoặc cập nhật từ mục tính giá                        │
│  └── Chưa phát sinh báo giá chính thức                             │
│       │                                                             │
│       ▼ (Khi gửi báo giá)                                          │
│  🟡 Đang tương tác (Negotiating)                                    │
│  ├── Đã gửi báo giá                                                │
│  └── Đang chờ phản hồi hoặc đang duyệt giá                        │
│       │                                                             │
│       ▼ (Khi chốt đơn hàng)                                        │
│  🟢 Đang hoạt động (Active)                                         │
│  ├── Đã chốt ít nhất 1 đơn hàng                                   │
│  └── Đang chạy sản xuất                                            │
│       │                                                             │
│       ▼ (Không phát sinh BG/LSX 6 tháng - 1 năm)                   │
│  ⚪ Tạm ngưng                                                       │
│  └── Không phát sinh báo giá / LSX trong 6 tháng - 1 năm          │
│       │                                                             │
│       ▼ (Không đặt lại >= 1 năm)                                   │
│  ⚫ Ngừng hợp tác (Inactive)                                        │
│  └── Khách hàng lâu năm không đặt lại >= 1 năm                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Badge design:

| Tag | Màu nền | Màu text | Icon |
|---|---|---|---|
| Mới (Lead) | blue-50 | blue-700 | ● |
| Đang tương tác | amber-50 | amber-700 | ● |
| Đang hoạt động | green-50 | green-700 | ● |
| Tạm ngưng | gray-100 | gray-600 | ● |
| Ngừng hợp tác | gray-200 | gray-500 | ● |

---

## Detail View — Bấm vào khách hàng

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Quay lại danh sách              KHÁCH HÀNG: KH-001               │
│  ────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─ Header ──────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  🏢 Công ty TNHH Gạo Thơm Miền Tây                           │  │
│  │  [🟢 Đang hoạt động]    Hoàn thiện: 12/12 ████████████        │  │
│  │                                                                │  │
│  │  [✏️ Chỉnh sửa]  [📋 Hồ sơ giao dịch ▾]                     │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Thông tin cơ bản ────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Mã KH:          KH-001                                       │  │
│  │  Tên công ty:    Công ty TNHH Gạo Thơm Miền Tây              │  │
│  │  MST:            0312345678                                    │  │
│  │  Địa chỉ HĐ:    123 Nguyễn Trãi, Q.1, TP.HCM                │  │
│  │  Địa chỉ GH:    456 Lý Thường Kiệt, Q.10, TP.HCM            │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Liên hệ ─────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Người LH:      Nguyễn Thị Mai                                │  │
│  │  Chức vụ:       Trưởng phòng mua hàng                         │  │
│  │  SĐT:           0901234567                                    │  │
│  │  Email:         mai.nguyen@gaothom.vn                          │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Quản lý ─────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Sale phụ trách:  Nguyễn Văn An                                │  │
│  │  Trạng thái:      🟢 Đang hoạt động                           │  │
│  │  Ngày tạo:        15/03/2026                                   │  │
│  │  Cập nhật:        25/05/2026                                   │  │
│  │  Ghi chú:         Khách hàng VIP, ưu tiên giao hàng nhanh    │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Nút "Hồ sơ giao dịch"

Dropdown menu khi bấm:

```
┌────────────────────────────���────┐
│  📋 Hồ sơ giao dịch            │
│  ┌─────────────────────────────┐│
│  │  📄 Bảng báo giá            ││  → Chuyển đến Lịch sử Báo giá
│  │  🏭 Lệnh sản xuất           ││  → Chuyển đến module LSX
│  │  📦 Sản phẩm liên quan      ││  → Chuyển đến Lịch sử Tính giá
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Behavior khi chuyển hướng:**
- Chuyển đến module tương ứng
- Phễu lọc tự động điền sẵn tên khách hàng
- VD: Bấm "Bảng báo giá" → chuyển đến Tab "Lịch sử" → toggle "Báo giá" → filter KH = "Gạo Thơm Miền Tây"

---

## Phân quyền hiển thị

| Thao tác | Admin | Sale được phân công | Sale khác |
|---|---|---|---|
| Xem danh sách | ✓ | ✓ | ✓ |
| Xem chi tiết | ✓ | ✓ | ✓ (chỉ xem) |
| Chỉnh sửa thông tin | ✓ | ✓ | ✗ |
| Phân công sale | ✓ | ✗ | ✗ |
| Thêm KH mới | ✓ | ✓ | ✓ |
| Xóa KH | ✗ | ✗ | ✗ |
| Xem nhật ký | ✓ | ✓ (chỉ KH mình) | ✗ |

**UI khi không có quyền:**
- Nút "Chỉnh sửa" ẩn đi (không disable, ẩn hoàn toàn)
- Tooltip khi hover vào vùng restricted: "Bạn không có quyền thao tác với khách hàng này"

---

## Thêm khách hàng mới — Modal/Page

```
┌──────────────────────────────────────────────────────────────┐
│  THÊM KHÁCH HÀNG MỚI                                [✕ Đóng]│
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Loại KH: (●) Doanh nghiệp  ( ) Cá nhân/Hộ KD              │
│                                                              │
│  ┌─ Thông tin cơ bản ────────────────────────────────────┐   │
│  │  Tên công ty *:     [_____________________________]   │   │
│  │  Mã số thuế *:      [_____________________________]   │   │
│  │  Mã KH:             [KH-xxx] (auto-generate)         │   │
│  │  Địa chỉ HĐ *:     [_____________________________]   │   │
│  │  Địa chỉ giao hàng: [_____________________________]   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Liên hệ ─────────────────────────────────────────────┐   │
│  │  Người liên hệ *:   [_____________________________]   │   │
│  │  Chức vụ:           [_____________________________]   │   │
│  │  SĐT *:             [_____________________________]   │   │
│  │  Email *:            [_____________________________]   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Phân công ───────────────────────────────────────────┐   │
│  │  Sale phụ trách:    [Tự động = người tạo     ▾]       │   │
│  │  Nhóm KH:           [Chọn nhóm...           ▾]       │   │
│  │  Khu vực:           [Chọn khu vực...        ▾]       │   │
│  │  Ghi chú:           [_____________________________]   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Actions ─────────────────────────────────────────────┐   │
│  │                                                        │   │
│  │  [Hủy]                              [Lưu khách hàng]  │   │
│  │  (ghost)                             (primary)         │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  * Trường bắt buộc. Có thể bổ sung sau nhưng sẽ hiện ⚠️    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Tab 2: Nhật ký thao tác (Khách hàng)

Tương tự mục 4 (Nhật ký thao tác chung) nhưng chỉ hiển thị thao tác liên quan đến **thông tin khách hàng** (thêm/sửa). Không bao gồm sản phẩm, báo giá, LSX.

### Layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│  TABS: [Danh sách khách hàng] [● Nhật ký thao tác]                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ FILTER BAR ─────────────────────────────────────────────────┐   │
│  │  Thời gian: [Tuần này ▾]  Hành động: [Tất cả ▾]             │   │
│  │  Người thực hiện: [Tất cả ▾]  Trường thay đổi: [Tất cả ▾]  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ TIMELINE ───────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  ── 28/05/2026 ───────────────────────────────────────────── │   │
│  │                                                               │   │
│  │  ┃ 15:30  Nguyễn Văn An                                      │   │
│  │  ┃ Chỉnh sửa › KH-002 Bao Bì Sài Gòn                       │   │
│  │  ┃ Trường: Số điện thoại                                     │   │
│  │  ┃   "0901xxx" → "0902xxx"                                   │   │
│  │  ┃                                                            │   │
│  │  ┃ 10:15  Admin                                               │   │
│  │  ┃ Thêm mới › KH-156 Nhựa Tân Phú                           │   │
│  │  ┃ Phân công: Lê Thu Hà                                      │   │
│  │  ┃                                                            │   │
│  │  ── 27/05/2026 ───────────────────────────────────────────── │   │
│  │  ...                                                          │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Bộ lọc nhật ký KH:

| Bộ lọc | Component | Options |
|---|---|---|
| Hành động | Multi-select dropdown | Tất cả / Thêm mới / Chỉnh sửa / Thay đổi trạng thái |
| Người thực hiện | Dropdown + search | Tất cả / Danh sách NV / "Chỉ xem tôi" |
| Trường thay đổi | Multi-select dropdown | Tên KH, MST, Địa chỉ HĐ, SĐT, Email, Sale, Tag... |
| Thời gian | Date picker | Hôm nay / Tuần này / Tháng này / Tùy chỉnh |

---

## Tạo KH tự động từ mục Tính giá

Khi Sale tạo KH mới từ form tính giá:
1. KH tự động xuất hiện trong danh sách
2. Sale phụ trách = Sale tạo (auto-assign)
3. Nếu thiếu thông tin → hiện dấu `!` đỏ
4. Nhật ký ghi: "Tạo mới từ bảng tính giá TG-xxxx"

---

## Responsive

| Breakpoint | Layout |
|---|---|
| Desktop ≥1280px | Table view mặc định, detail = slide-in panel |
| Tablet 768-1279px | Table thu gọn hoặc card view, detail = overlay 80% |
| Mobile <768px | Card view only, detail = full-screen page |

---

## Accessibility

- Table: `<th scope="col">`, `aria-sort` cho sortable columns
- Card view: mỗi card là `<article>` với `aria-label="Khách hàng [tên]"`
- Missing info indicator: `aria-label="Thiếu [n] trường thông tin bắt buộc"`
- Progress bar: `role="progressbar" aria-valuenow="9" aria-valuemax="12"`
- Form thêm KH: required fields có `aria-required="true"`
- Phân quyền: elements ẩn hoàn toàn (không render) thay vì `display:none`
- Tag trạng thái: icon + text (không chỉ màu) — rule `color-not-only`
