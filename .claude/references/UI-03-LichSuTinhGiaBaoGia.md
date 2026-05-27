# UI/UX — Mục 3: Lịch Sử Tính Giá & Báo Giá

## Tổng quan

Hiển thị toàn bộ lịch sử bảng tính giá và báo giá đã tạo. Cho phép lọc, xem chi tiết, chỉnh sửa. Có xác nhận lưu khi đóng nếu có thay đổi.

---

## Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo LTS | Tính giá & Báo giá | [User ▾]                  │
├─────────────────────────────────────────────────────────────────────┤
│  TABS: [Tạo bảng tính giá] [Tạo báo giá] [● Lịch sử] [Nhật ký]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ TOGGLE + FILTER BAR ───────────────────────────────────────┐   │
│  │                                                              │   │
│  │  [● Tính giá] [○ Báo giá]    [7 ngày ▾]   [+ Thêm bộ lọc] │   │
│  │                                                              │   │
│  │  Đang lọc: [KH: Gạo Thơm ×] [TT: Đã duyệt ×]              │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ DANH SÁCH ─────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ Header bảng ──────────────────────────────────────────┐ │   │
│  │  │ Mã    │ Sản phẩm    │ Khách hàng │ Ngày  │ TT   │ Sale│ │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ Row ──────────────────────────────────────────────────┐ │   │
│  │  │ TG-001│ Túi zip 500g│ Gạo Thơm MT│ 25/05 │ ○Nháp│ An │ │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │  ┌─ Row ──────────────────────────────────────────────────┐ │   │
│  │  │ TG-002│ Màng ghép   │ Bao Bì SG  │ 24/05 │ ✓Chốt│ Bảo│ │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │  ...                                                         │   │
│  │                                                              │   │
│  │  ── Pagination ──                                            │   │
│  │  [← Trước] Trang 1/12 [Tiếp →]   Hiển thị: [20 ▾] / trang │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Toggle: Tính giá / Báo giá

```
┌──────────────────────────────────────┐
│  [● Tính giá]  [○ Báo giá]          │
└──────────────────────────────────────┘
```

- Dạng **segmented control** (pill toggle)
- Mặc định: "Tính giá" được chọn
- Khi chuyển → danh sách reload, bộ lọc trạng thái thay đổi tương ứng
- Animation: crossfade 200ms

---

## Phễu lọc — Progressive Disclosure

### Hiển thị mặc định (luôn thấy):

```
┌──────────────────────────────────────────────────────────────────┐
│  [● Tính giá] [○ Báo giá]                                       │
│                                                                  │
│  Thời gian: [7 ngày gần nhất ▾]    🔍 [Tìm nhanh..._________]  │
│                                                                  │
│  [+ Thêm bộ lọc]                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Khi bấm "+ Thêm bộ lọc" → Dropdown chọn filter:

```
┌─────────────────────────┐
│  ☐ Khách hàng           │
│  ☐ Sản phẩm            │
│  ☐ Người tạo / Sale    │  ← chỉ hiện cho admin
│  ☐ Trạng thái          │
│  ☐ Vật liệu            │
│  ☐ Kiểu dáng túi       │
└─────────────────────────┘
```

### Sau khi chọn filter → hiển thị dạng chip row:

```
┌──────────────────────────────────────────────────────────────────┐
│  Thời gian: [7 ngày ▾]   KH: [Gạo Thơm... ▾]   TT: [Đã duyệt ▾] │
│                                                                  │
│  Đang lọc: [Gạo Thơm MT ×] [Đã duyệt ×] [OPP ×]   [Xóa tất cả]│
└──────────────────────────────────────────────────────────────────┘
```

---

## Chi tiết 8 bộ lọc

### 1. Toggle Tính giá / Báo giá
- **Component:** Segmented control
- **Vị trí:** Luôn hiển thị đầu tiên
- **Behavior:** Chuyển context toàn bộ danh sách

### 2. Khách hàng
- **Component:** Autocomplete search input
- **Data:** Mã KH, Tên công ty, MST
- **Behavior:** Debounce 300ms, highlight match, max 8 suggestions

```
┌─────────────────────────────────────┐
│  Khách hàng: [Gạo Th___________|▾] │
│  ┌─────────────────────────────────┐│
│  │ 🏢 Gạo Thơm Miền Tây (KH-001) ││
│  │ 🏢 Gạo Thơm Bắc (KH-042)      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 3. Khoảng thời gian
- **Component:** Date Range Picker
- **Mặc định:** 7 ngày gần nhất
- **Quick options:** 3 ngày | 7 ngày | 30 ngày | Tùy chỉnh

```
┌─────────────────────────────────────────────┐
│  Thời gian: [7 ngày gần nhất          ▾]   │
│  ┌─────────────────────────────────────────┐│
│  │  ○ 3 ngày gần nhất                     ││
│  │  ● 7 ngày gần nhất                     ││
│  │  ○ 30 ngày gần nhất                    ││
│  │  ○ Tùy chỉnh:                          ││
│  │    Từ: [__|__|____]  Đến: [__|__|____]  ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 4. Sản phẩm
- **Component:** Text search + suggestion
- **Data:** Tên SP hoặc mã SP đã từng nhập
- **Behavior:** Tìm kiếm tự do, gợi ý từ lịch sử

### 5. Người tạo / Sale phụ trách
- **Component:** Multi-select dropdown
- **Data:** Danh sách nhân viên phòng kinh doanh
- **Visibility:** Chỉ admin mới thấy filter này
- **Behavior:** Checkbox list, có search trong dropdown

```
┌─────────────────────────────────┐
│  Người tạo:  [2 đã chọn    ▾]  │
│  ┌─────────────────────────────┐│
│  │ 🔍 [Tìm nhân viên...]      ││
│  │ ☑ Nguyễn Văn An             ││
│  │ ☑ Trần Gia Bảo              ││
│  │ ☐ Lê Thu Hà                 ││
│  │ ☐ Phạm Minh Đức             ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 6. Trạng thái Bảng tính giá (khi toggle = Tính giá)
- **Component:** Checkbox group dropdown
- **Options:**
  - ☐ Đang nháp
  - ☐ Đã chốt chi phí
  - ☐ Đã dùng tạo báo giá
  - ☐ Đã khóa

### 7. Trạng thái Báo giá (khi toggle = Báo giá)
- **Component:** Checkbox group dropdown
- **Options:**
  - ☐ Đang nháp (Mới tạo)
  - ☐ Chờ duyệt
  - ☐ Đã duyệt
  - ☐ Đã gửi khách
  - ☐ Bị từ chối / Trả về
  - ☐ Đã hủy
  - ☐ Đã chốt đơn sản xuất

### 8. Vật liệu
- **Component:** Multi-select dropdown
- **Data:** OPP, PET, AL, PE, MPET, CPP...
- **Behavior:** Checkbox list

### 9. Kiểu dáng túi / Quy cách
- **Component:** Select dropdown (single)
- **Data:** Màng (in, ghép), Túi 3 biên, Túi hàn lưng, Túi zip đáy đứng...

---

## Bảng danh sách

### Columns khi toggle = "Tính giá"

| Column | Width | Sortable | Ghi chú |
|---|---|---|---|
| Mã | 120px | ✓ | TG-2026-xxxx |
| Sản phẩm | flex | ✓ | Tên SP + tooltip chi tiết |
| Khách hàng | 180px | ✓ | Tên công ty |
| Ngày tạo | 100px | ✓ | dd/mm/yyyy |
| Trạng thái | 140px | ✓ | Badge màu |
| Sale | 120px | ✓ | Tên người tạo |
| Actions | 80px | ✗ | [👁 Xem] |

### Columns khi toggle = "Báo giá"

| Column | Width | Sortable | Ghi chú |
|---|---|---|---|
| Mã | 140px | ✓ | BG-2026-xxxx |
| Khách hàng | 180px | ✓ | Tên công ty |
| Số SP | 60px | ✓ | Số sản phẩm trong BG |
| Ngày tạo | 100px | ✓ | dd/mm/yyyy |
| Trạng thái | 150px | ✓ | Badge màu |
| Sale | 120px | ✓ | Tên người tạo |
| Actions | 80px | ✗ | [👁 Xem] |

### Row interaction:
- Hover: background `slate-50`
- Click row hoặc nút "Xem" → mở detail panel

---

## Detail Panel (Slide-in)

Khi bấm vào 1 row → panel slide-in từ phải (overlay 60% width trên desktop):

```
┌──────────────────────────────────────────────────────────────┐
│  ← Đóng                    BẢNG TÍNH GIÁ TG-2026-0523-001   │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Trạng thái: [○ Đang nháp]        Ngày: 25/05/2026          │
│  Khách hàng: Công ty TNHH Gạo Thơm Miền Tây                │
│  Sản phẩm:   Túi zip đáy đứng 500g                          │
│                                                              │
│  ┌─ Thông số ────────────────────────────────────────────┐   │
│  │  Kích thước: 200 × 300 mm                             │   │
│  │  Vật liệu: OPP 25μm / PET 12μm / PE 80μm            │   │
│  │  Số lượng: 10,000 cái                                 │   │
│  │  Số màu in: 6                                         │   │
│  │  ...                                                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Kết quả ─────────────────────────────────────────────┐   │
│  │  Giá thành: 2,450 ₫/cái                               │   │
│  │  Giá bán đề xuất: 3,200 ₫/cái                         │   │
│  │  Lợi nhuận: 30.6%                                     │   │
│  │                                                        │   │
│  │  ▸ Chi tiết chi phí (expandable)                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Actions ─────────────────────────────────────────────┐   │
│  │  [✏️ Chỉnh sửa]  [📄 Xuất PDF]  [→ Tạo báo giá]     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Chỉnh sửa trong Detail Panel

Khi bấm "Chỉnh sửa":
1. Các field chuyển sang editable mode (border xuất hiện)
2. Header hiển thị indicator: `● Có thay đổi chưa lưu`
3. Footer hiển thị: `[Hủy thay đổi] [Lưu]`

### Unsaved Changes Guard:

```
┌──────────────────────────────────────────┐
│  ⚠️ Thay đổi chưa lưu                   │
│                                          │
│  Bạn có thay đổi chưa được lưu.         │
│  Bạn muốn làm gì?                       │
│                                          │
│  [Lưu lại]  [Không lưu]  [Tiếp tục sửa]│
│  (primary)   (secondary)   (ghost)       │
└──────────────────────────────────────────┘
```

**Trigger:** Bấm "Đóng" hoặc bấm ngoài panel khi có thay đổi chưa lưu.

---

## Empty State

Khi không có kết quả (filter quá chặt hoặc chưa có dữ liệu):

```
┌──────────────────────────────────────────┐
│                                          │
│         📋                               │
│                                          │
│    Không tìm thấy kết quả               │
│                                          │
│    Thử thay đổi bộ lọc hoặc             │
│    tạo bảng tính giá mới.               │
│                                          │
│    [Xóa bộ lọc]  [Tạo mới]             │
│                                          │
└──────────────────────────────────────────┘
```

---

## Performance

- **Virtualized table:** Chỉ render rows trong viewport (dùng TanStack Virtual)
- **Server-side pagination:** 20 items/page mặc định, options: 20/50/100
- **Debounce search:** 300ms cho autocomplete filters
- **Skeleton loading:** 5 skeleton rows khi đang fetch
- **Cache:** Cache kết quả filter 30s, invalidate khi có thay đổi

---

## Responsive

| Breakpoint | Layout |
|---|---|
| Desktop ≥1280px | Full table, detail panel slide-in 60% |
| Tablet 768-1279px | Table thu gọn (ẩn cột Sale), detail panel 80% |
| Mobile <768px | Card list thay table, detail = full-screen page |

### Mobile Card Layout:

```
┌─────────────────────────────────────┐
│  TG-2026-0523-001                   │
│  Túi zip đáy đứng 500g             │
│  🏢 Gạo Thơm MT  •  25/05/2026    │
│  [○ Đang nháp]         Sale: An    │
└─────────────────────────────────────┘
```

---

## Accessibility

- Table dùng `<table>` semantic với `<thead>`, `<th scope="col">`, `aria-sort`
- Sort buttons có `aria-label="Sắp xếp theo [tên cột]"`
- Filter chips có `aria-label="Xóa bộ lọc [tên]"` trên nút X
- Detail panel dùng `role="dialog"` + `aria-modal="true"`
- Pagination: `aria-label="Trang [n] trên [total]"`
- Loading state: `aria-busy="true"` trên table body
- Empty state: `role="status"`
