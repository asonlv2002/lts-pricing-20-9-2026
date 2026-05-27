# UI/UX — Mục 2: Tạo Bảng Báo Giá

## Tổng quan

Tạo bảng báo giá thương mại gửi khách hàng. Flow: Chọn KH → Chọn nhiều sản phẩm → Nhập nhiều mức số lượng → Hệ thống tự tính giá (cho phép override).

---

## Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo LTS | Tính giá & Báo giá | [User ▾]                  │
├─────────────────────────────────────────────────────────────────────┤
│  TABS: [Tạo bảng tính giá] [● Tạo báo giá] [Lịch sử] [Nhật ký]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ STEP INDICATOR ─────────────────────────────────────────────┐  │
│  │  ① Chọn khách hàng  ──▶  ② Chọn sản phẩm  ──▶  ③ Xác nhận │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    NỘI DUNG TỪNG BƯỚC                        │   │
│  │                    (xem chi tiết bên dưới)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ FOOTER ACTIONS ────────────────────────────────────────────┐   │
│  │  [← Quay lại]                    [Tiếp theo →] / [Lưu báo giá] │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Bước 1: Chọn Khách Hàng

```
┌──────────────────────────────────────────────────────────────┐
│  CHỌN KHÁCH HÀNG                                             │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  🔍 [Tìm theo tên, mã KH, MST...________________] [Tạo mới]│
│                                                              │
│  ┌─ Kết quả gợi ý ────────────────────────────────────────┐ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │ 🏢 Công ty TNHH Gạo Thơm Miền Tây                │  │ │
│  │  │    Mã: KH-001  |  MST: 0312345678                 │  │ │
│  │  │    Sale: Nguyễn Văn An  |  Tag: Đang hoạt động 🟢 │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │ 🏢 Công ty CP Bao Bì Sài Gòn                      │  │ │
│  │  │    Mã: KH-015  |  MST: 0398765432                 │  │ │
│  │  │    Sale: Trần Gia Bảo  |  Tag: Đang tương tác 🟡  │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ── Hoặc chọn từ khách hàng gần đây ──                      │
│                                                              │
│  [Gạo Thơm MT] [Bao Bì SG] [Thực phẩm Hà Nội] [+3 more]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Interaction:
- Autocomplete search: debounce 300ms, tìm theo tên/mã/MST
- Highlight text match trong kết quả
- Hiển thị tối đa 8 gợi ý
- Chip "Khách hàng gần đây" cho quick select
- Sau khi chọn → hiển thị card xác nhận + nút "Tiếp theo"

---

## Bước 2: Chọn Sản Phẩm & Nhập Số Lượng

```
┌──────────────────────────────────────────────────────────────────────┐
│  CHỌN SẢN PHẨM — Khách hàng: Công ty TNHH Gạo Thơm Miền Tây      │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌─ Thêm sản phẩm ──────────────────────────────────────────────┐  │
│  │  Nguồn: (●) Từ bảng tính giá đã lưu  ( ) Nhập mới           │  │
│  │                                                                │  │
│  │  🔍 [Tìm bảng tính giá..._______________] [Chọn]             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Danh sách sản phẩm trong báo giá ───────────────────────────┐  │
│  │                                                                │  │
│  │  ╔══════════════════════════════════════════════════════════╗  │  │
│  │  ║  SP 1: Túi zip đáy đứng 500g                            ║  │  │
│  │  ║  VL: OPP/PET/PE  |  Kích thước: 200×300mm               ║  │  │
│  │  ║                                                          ║  │  │
│  │  ║  ┌─ Mức số lượng ─────────────────────────────────────┐ ║  │  │
│  │  ║  │ Số lượng    │ Giá chốt (auto) │ Giá báo (editable)│ ║  │  │
│  │  ║  │─────────────┼─────────────────┼───────────────────│ ║  │  │
│  │  ║  │ 10,000 cái  │ 2,450 ₫         │ [2,800 ₫____]    │ ║  │  │
│  │  ║  │ 50,000 cái  │ 2,200 ₫         │ [2,500 ₫____]    │ ║  │  │
│  │  ║  │ 100,000 cái │ 1,980 ₫         │ [2,200 ₫____]    │ ║  │  │
│  │  ║  │ [+ Thêm mức số lượng]                              │ ║  │  │
│  │  ║  └────────────────────────────────────────────────────┘ ║  │  │
│  │  ║                                                          ║  │  │
│  │  ║  Giá chốt: giá từ bảng tính giá (nhạt màu, tham khảo)  ║  │  │
│  │  ║                                              [🗑 Xóa SP] ║  │  │
│  │  ╚══════════════════════════════════════════════════════════╝  │  │
│  │                                                                │  │
│  │  ╔══════════════════════════════════════════════════════════╗  │  │
│  │  ║  SP 2: Màng ghép in 3 lớp                               ║  │  │
│  │  ║  VL: PET/AL/PE  |  Kích thước: 350mm khổ                ║  │  │
│  │  ║  ...                                                     ║  │  │
│  │  ╚══════════════════════════════════════════════════════════╝  │  │
│  │                                                                │  │
│  │  [+ Thêm sản phẩm khác]                                       │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Chi tiết bảng giá mỗi sản phẩm

```
┌─────────────────────────────────────────────────────────────┐
│  Số lượng     │  Giá chốt (tham khảo)  │  Giá báo khách    │
│───────────────┼────────────────────────┼───────────────────│
│  [10,000___]  │  2,450 ₫  (text-muted) │  [2,800 ₫______] │
│  [50,000___]  │  2,200 ₫  (text-muted) │  [2,500 ₫______] │
│  [100,000__]  │  1,980 ₫  (text-muted) │  [2,200 ₫______] │
│───────────────┼────────────────────────┼───────────────────│
│  [+ Thêm mức]│                        │                   │
└─────────────────────────────────────────────────────────────┘

Ghi chú:
- "Giá chốt" = giá từ bảng tính giá, hiển thị nhạt màu (text-slate-400)
- "Giá báo" = giá gửi khách, mặc định = giá chốt, user có thể sửa
- Nếu giá báo < giá chốt → highlight vàng + warning icon ⚠️
- Nếu giá báo > giá chốt × 2 → highlight nhẹ (có thể là nhập sai)
```

### Interaction:
- Mỗi SP cho phép nhập **nhiều mức số lượng** (tối thiểu 1, không giới hạn trên)
- Khi nhập số lượng → hệ thống tự tính "Giá chốt" từ engine
- "Giá báo" mặc định = giá chốt, editable
- Nút "Xóa SP" có confirmation dialog
- Nút "Thêm sản phẩm" → quay lại search bảng tính giá

---

## Bước 3: Xác nhận & Lưu

```
┌──────────────────────────────────────────────────────────────────────┐
│  XÁC NHẬN BÁO GIÁ                                                   │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌─ Thông tin chung ─────────────────────────────────────────────┐  │
│  │  Mã báo giá:    BG-2026-0523-001 (auto)                       │  │
│  │  Khách hàng:    Công ty TNHH Gạo Thơm Miền Tây               │  │
│  │  Ngày tạo:      28/05/2026                                    │  │
│  │  Người tạo:     Nguyễn Văn An (Sale)                          │  │
│  │  Hiệu lực:      [30 ngày ▾]                                   │  │
│  │  Điều khoản TT: [30 ngày ▾]                                   │  │
│  │  Ghi chú:       [_________________________________]            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Tóm tắt sản phẩm ──────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  #  │ Sản phẩm              │ Số mức giá │ Giá thấp-cao      │   │
│  │  ───┼────────────────────────┼────────────┼──────────────────│   │
│  │  1  │ Túi zip đáy đứng 500g │ 3 mức      │ 2,200 - 2,800 ₫  │   │
│  │  2  │ Màng ghép in 3 lớp    │ 2 mức      │ 1,800 - 2,100 ₫  │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Actions ─────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  [Lưu nháp]          [Lưu & Gửi duyệt]          [Hủy]       │  │
│  │  (secondary)          (primary)                   (ghost)      │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Trạng thái Báo giá (State Machine)

```
                    ┌──────────┐
                    │ Đang     │
                    │ nháp     │
                    └────┬─────┘
                         │ [Gửi duyệt]
                         ▼
                    ┌──────────┐
              ┌─────│ Chờ      │─────┐
              │     │ duyệt    │     │
              │     └──────────┘     │
     [Từ chối]│                      │[Duyệt]
              ▼                      ▼
        ┌──────────┐          ┌──────────┐
        │ Bị từ    │          │ Đã       │
        │ chối     │          │ duyệt    │
        └──────────┘          └────┬─────┘
              │                    │ [Gửi khách]
              │ [Sửa & gửi lại]   ▼
              │               ┌──────────┐
              └──────────────▶│ Đã gửi   │
                              │ khách    │
                              └────┬─────┘
                                   │ [Chốt đơn]
                                   ▼
                              ┌──────────┐
                              │ Đã chốt  │
                              │ đơn SX   │
                              └──────────┘

        Bất kỳ lúc nào (trước "Đã chốt") → [Hủy] → "Đã hủy"
```

### Badge hiển thị

| Trạng thái | Badge | Màu nền | Màu text |
|---|---|---|---|
| Đang nháp | `○ Nháp` | gray-100 | gray-600 |
| Chờ duyệt | `⏳ Chờ duyệt` | amber-50 | amber-700 |
| Đã duyệt | `✓ Đã duyệt` | blue-50 | blue-700 |
| Đã gửi khách | `↗ Đã gửi` | indigo-50 | indigo-700 |
| Bị từ chối | `✕ Từ chối` | red-50 | red-700 |
| Đã hủy | `— Đã hủy` | gray-50 | gray-400 |
| Đã chốt đơn SX | `★ Đã chốt SX` | green-50 | green-700 |

---

## Giá chốt vs Giá báo — Visual Design

```
┌─────────────────────────────────────────────────┐
│  Số lượng: 10,000 cái                           │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Giá báo khách:  [2,800 ₫_________]    │    │
│  │                                         │    │
│  │  ── tham khảo ──────────────────────    │    │
│  │  Giá chốt (bảng tính giá): 2,450 ₫     │    │  ← text-slate-400
│  │  Chênh lệch: +350 ₫ (+14.3%)           │    │  ← text-green-500
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Giá chốt luôn hiển thị bên dưới, nhạt màu (`text-slate-400`, font-size nhỏ hơn)
- Chênh lệch dương → xanh lá (lãi), âm → đỏ (lỗ) + warning
- User có thể sửa giá báo tự do, hệ thống chỉ cảnh báo không chặn

---

## Validation Rules

| Rule | Trigger | Message |
|---|---|---|
| Chưa chọn KH | Bấm "Tiếp theo" ở bước 1 | "Vui lòng chọn khách hàng" |
| Chưa có SP nào | Bấm "Tiếp theo" ở bước 2 | "Vui lòng thêm ít nhất 1 sản phẩm" |
| SP chưa có mức SL | Bấm "Tiếp theo" | "Sản phẩm [tên] chưa có mức số lượng" |
| Giá báo = 0 | Blur khỏi field | "Giá báo không được bằng 0" |
| Giá báo < giá chốt | Blur khỏi field | Warning (không chặn): "Giá báo thấp hơn giá chốt" |

---

## Responsive

| Breakpoint | Thay đổi |
|---|---|
| Desktop ≥1280px | Full layout như trên |
| Tablet 768-1279px | Bảng giá mỗi SP stack dọc, step indicator thu gọn |
| Mobile <768px | Wizard full-screen mỗi bước, bottom sheet cho search KH |

---

## Accessibility

- Step indicator dùng `aria-current="step"` cho bước hiện tại
- Bảng giá dùng `<table>` semantic với `<th scope="col">`
- Nút "Xóa SP" có `aria-label="Xóa sản phẩm [tên]"`
- Warning giá dùng `role="alert"` + icon (không chỉ màu)
- Focus trap trong modal tạo KH mới
- Number input: `inputMode="numeric"`, format locale vi-VN on blur
