# UI/UX — Mục 1: Tạo Bảng Tính Giá

## Tổng quan

Đây là công cụ tính giá sản phẩm bao bì. User nhập thông số → hệ thống tính toán → hiển thị kết quả chi phí.

> Mục này đã có sẵn trong hệ thống (TheNhapLieu.tsx + ManHinhQuanLy.tsx). Tài liệu này mô tả cải tiến UI theo spec mới.

---

## Layout tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo LTS | Tính giá & Báo giá | [User ▾]                  │
├─────────────────────────────────────────────────────────────────────┤
│  TABS: [● Tạo bảng tính giá] [Tạo báo giá] [Lịch sử] [Nhật ký]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐ │
│  │     FORM NHẬP LIỆU          │  │     KẾT QUẢ TÍNH GIÁ        │ │
│  │                              │  │                              │ │
│  │  ┌─ Thông tin chung ──────┐ │  │  Tổng chi phí NVL:  xxx ₫   │ │
│  │  │ Tên SP: [___________]  │ │  │  Chi phí in:         xxx ₫   │ │
│  │  │ Khách hàng: [search▾]  │ │  │  Chi phí ghép:       xxx ₫   │ │
│  │  │ Loại SP: [Túi ▾]       │ │  │  Chi phí cắt:        xxx ₫   │ │
│  │  └────────────────────────┘ │  │  ──────────────────────────   │ │
│  │                              │  │  Giá thành/đơn vị:   xxx ₫   │ │
│  │  ┌─ Kích thước ──────────┐ │  │  Giá bán đề xuất:    xxx ₫   │ │
│  │  │ Rộng: [__] mm          │ │  │                              │ │
│  │  │ Dài:  [__] mm          │ │  │  ┌────────────────────────┐  │ │
│  │  │ Số lượng: [____]       │ │  │  │  BẢNG CHI TIẾT TỪNG    │  │ │
│  │  └────────────────────────┘ │  │  │  CÔNG ĐOẠN (collapse)   │  │ │
│  │                              │  │  └────────────────────────┘  │ │
│  │  ┌─ Cấu trúc vật liệu ──┐ │  │                              │ │
│  │  │ Lớp 1: [OPP ▾] [__μm] │ │  │  ┌────────────────────────┐  │ │
│  │  │ Lớp 2: [PET ▾] [__μm] │ │  │  │  [Lưu bảng tính giá]   │  │ │
│  │  │ [+ Thêm lớp]           │ │  │  │  [Xuất PDF]             │  │ │
│  │  └────────────────────────┘ │  │  └────────────────────────┘  │ │
│  │                              │  │                              │ │
│  │  ┌─ Thông số in ─────────┐ │  │                              │ │
│  │  │ Số màu: [__]           │ │  │                              │ │
│  │  │ Số hình: [__]          │ │  │                              │ │
│  │  └────────────────────────┘ │  │                              │ │
│  │                              │  │                              │ │
│  └─────────────────────────────┘  └──────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| Desktop ≥1280px | 2 cột: Form (55%) + Kết quả (45%), side-by-side |
| Tablet 768-1279px | 2 cột: Form (50%) + Kết quả (50%), compact spacing |
| Mobile <768px | 1 cột: Form trên, Kết quả dưới (sticky bottom summary bar) |

---

## Form nhập liệu — Cấu trúc nhóm

### Nhóm 1: Thông tin chung
| Field | Component | Ghi chú |
|---|---|---|
| Tên sản phẩm | Text input | Bắt buộc |
| Khách hàng | Autocomplete search | Gợi ý từ danh mục KH, cho phép tạo mới |
| Loại sản phẩm | Select dropdown | Túi / Màng |
| Kiểu dáng | Select dropdown | Phụ thuộc loại SP |

### Nhóm 2: Kích thước & Số lượng
| Field | Component | Ghi chú |
|---|---|---|
| Chiều rộng (mm) | Number input | Min 50, max 1200 |
| Chiều dài (mm) | Number input | Min 50, max 2000 |
| Số lượng | Number input | Đơn vị: cái (túi) hoặc m² (màng) |
| Số hình/trục | Number input | Ảnh hưởng hình dạng cuộn |

### Nhóm 3: Cấu trúc vật liệu
| Field | Component | Ghi chú |
|---|---|---|
| Lớp vật liệu | Dynamic list | Mỗi lớp: Loại VL (dropdown) + Độ dày (μm) |
| Nút thêm lớp | Button ghost | Tối đa 5 lớp |

### Nhóm 4: Thông số in
| Field | Component | Ghi chú |
|---|---|---|
| Số màu in | Number input | 0-10 |
| Diện tích in (%) | Number input | 0-100 |

### Nhóm 5: Tài chính
| Field | Component | Ghi chú |
|---|---|---|
| Ngày thanh toán | Select | 14 / 30 / 45 / 90 ngày |
| Hoa hồng (%) | Number input | Mặc định từ cấu hình |

---

## Kết quả tính giá — Panel phải

```
┌──────────────────────────────────────────┐
│  KẾT QUẢ TÍNH GIÁ                       │
│  ─────────────────────────────────────── │
│                                          │
│  ┌─ Tóm tắt ──────────────────────────┐ │
│  │                                      │ │
│  │  Giá thành / đơn vị    2,450 ₫      │ │
│  │  Giá bán đề xuất       3,200 ₫      │ │
│  │  Lợi nhuận             30.6%        │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌─ Chi tiết chi phí (expandable) ────┐  │
│  │  ▸ Nguyên vật liệu      1,200 ₫   │  │
│  │  ▸ Công đoạn in           450 ₫    │  ���
│  │  ▸ Công đoạn ghép         380 ₫    │  │
│  │  ▸ Công đoạn cắt          120 ₫    │  │
│  │  ▸ Lãi vay                 85 ₫    │  │
│  │  ▸ Hoa hồng               115 ₫    │  │
│  │  ▸ Lợi nhuận              850 ₫    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Actions ─────────────────────────┐   │
│  │  [💾 Lưu bảng tính giá]  (primary)│   │
│  │  [📄 Xuất PDF]           (ghost)  │   │
│  │  [→ Tạo báo giá từ đây]  (link)  │   │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

---

## Interaction Patterns

### Real-time calculation
- Mỗi thay đổi input → debounce 300ms → tính lại kết quả
- Panel kết quả hiển thị skeleton shimmer trong lúc tính
- Nếu input không hợp lệ → hiển thị inline error dưới field, panel kết quả hiện "--"

### Lưu bảng tính giá
1. User bấm "Lưu" → validate toàn bộ form
2. Nếu thiếu field bắt buộc → focus vào field đầu tiên lỗi + error summary
3. Nếu OK → toast "Đã lưu bảng tính giá TG-2026-xxxx" (auto-dismiss 4s)
4. Trạng thái mặc định: "Đang nháp"

### Tạo khách hàng mới từ form
- Khi search KH không có kết quả → hiện option "Tạo khách hàng mới"
- Bấm → mở modal nhập nhanh (Tên, MST, SĐT, Email)
- Sau tạo → tự động chọn KH vừa tạo, KH xuất hiện trong module Khách hàng

---

## Trạng thái bảng tính giá

```
  ┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────┐
  │ Đang     │────▶│ Đã chốt      │────▶│ Đã dùng tạo     │────▶│ Đã khóa  │
  │ nháp     │     │ chi phí      │     │ báo giá         │     │          │
  └──────────┘     └──────────────┘     └─────────────────┘     └──────────┘
       ○                  ✓                     ↗                    🔒
    gray-500           blue-600              green-600             red-600
```

---

## Mobile: Sticky Summary Bar

Trên mobile, khi scroll form, hiển thị sticky bar ở bottom:

```
┌─────────────────────────────────────────┐
│  Giá thành: 2,450₫  |  Giá bán: 3,200₫ │
│  [Xem chi tiết ↑]                       │
└─────────────────────────────────────────┘
```

Bấm "Xem chi tiết" → scroll lên panel kết quả (hoặc mở bottom sheet).

---

## Accessibility

- Tất cả input có visible label (không chỉ placeholder)
- Number input dùng `inputMode="decimal"` trên mobile
- Nhóm field dùng `fieldset` + `legend`
- Error messages dùng `aria-live="polite"`
- Tab order: form trái → kết quả phải → actions
- Contrast: text trên nền trắng ≥ 4.5:1

---

## Color Tokens sử dụng

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--surface-primary` | white | Nền form, nền panel |
| `--surface-secondary` | slate-50 | Nền page |
| `--text-primary` | slate-900 | Body text |
| `--text-secondary` | slate-500 | Labels, helper text |
| `--accent-primary` | blue-600 | Primary buttons, links |
| `--accent-success` | green-600 | Giá trị tích cực |
| `--accent-warning` | amber-500 | Cảnh báo |
| `--accent-error` | red-500 | Lỗi, validation |
| `--border-default` | slate-200 | Viền input, dividers |
