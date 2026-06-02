# UI/UX — Mục 7: Wireframe Chi Tiết Mobile Web

> File bổ sung cho `UI-06-ThietKeMobileWeb.md`. Vẽ chi tiết từng màn ở khổ phone (360–430px).
> Quy ước: `▼` mở · `▶` gập · `[___]` input · `[ Nút ]` button · `( )/(●)` radio · `☐/☑` checkbox
> · `●` tab active · `══` thanh dính (sticky) · `··` đường kẻ phụ.

---

## 0. Bản đồ màn hình

```
Topbar (☰ + tiêu đề + action)
   │
   ├─ Drawer điều hướng (mở từ ☰)
   │
   ├─ [Calculator]  Nhập liệu ⇄ Kết quả   (+ sticky price bar + bottom sheet)
   ├─ [Lịch sử]     Card list + filter sheet + detail full-screen
   ├─ [Khách hàng]  Card list + detail
   ├─ [Báo giá]     Wizard 3 bước
   ├─ [Cấu hình]    Card mở rộng ⇄ chế độ bảng
   └─ [LSX / Nhật ký] Card list
```

---

## 1. Topbar + Drawer điều hướng

### 1.1 Topbar (cao 56px, dính trên)

```
┌───────────────────────────────────────┐
│ ☰   Tạo bảng tính giá            🔍 ⋮ │  ══ sticky top, z=50
└───────────────────────────────────────┘
  44px    flex (ellipsis)        44px 44px
  menu    tiêu đề màn            search action
```

- `☰` trái: mở drawer. `🔍` mở ô tìm (màn có search). `⋮` menu phụ (Xuất/Tạo mới…).
- Tiêu đề dài thì cắt `…` (1 dòng). Nền `--surface`, viền dưới `--border`.

### 1.2 Drawer (full-height dvh, mở từ trái)

```
┌──────────────────────────┐░░░░░░░░░  ░ = backdrop 50% (chạm để đóng)
│ LTS PRICING           ✕ │░░░░░░░░░
│ ─────────────────────── │░░░░░░░░░
│ ① Tổng quan          ▾ │░░░░░░░░░
│ ② Tính giá & Báo giá ▾ │░░░░░░░░░
│    • Tạo bảng tính giá ●│░░  ← item active tô nền + chữ accent
│    • Tạo bảng báo giá   │░░░░░░░░░
│    • Lịch sử            │░░░░░░░░░
│    • Nhật ký thao tác   │░░░░░░░░░
│ ③ Khách hàng         ▶ │░░░░░░░░░
│ ④ Sản phẩm & Đơn hàng▶ │░░░░░░░░░
│ ⑤ Cấu hình tính giá  ▶ │░░░░░░░░░
│ ⑥ Quản trị hệ thống  ▶ │░░░░░░░░░
│ ─────────────────────── │░░░░░░░░░
│ 👤 Nguyễn Văn An        │░  ══ footer dính đáy
│    @an.nv    [Đăng xuất]│░░░░░░░░░
└──────────────────────────┘░░░░░░░░░
  rộng 280px, vuốt trái để đóng
```

- Nhóm accordion (`▼/▶`); chỉ nhóm chứa màn hiện tại mở sẵn.
- Chạm item con → điều hướng + đóng drawer. Footer: user + đăng xuất (hoặc đổi vai trò offline).

---

## 2. Màn Form tính giá — Tab "Nhập liệu"

### 2.1 Toàn cảnh (accordion + sticky price bar + tab dưới)

```
┌───────────────────────────────────────┐
│ ☰   Tạo bảng tính giá             ⋮  │ ══ topbar
├───────────────────────────────────────┤
│ ● Tự động tính khi thay đổi           │  badge nhỏ, nền nhạt
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ ▼ ① Thông tin đơn hàng            │ │  ← header nhóm ≥48px
│ ├───────────────────────────────────┤ │
│ │ Khách hàng                        │ │
│ │ [ Gạo Thơm Miền Tây          ▾ ] │ │  ← autocomplete, có gợi ý
│ │ Tên hàng                          │ │
│ │ [ Túi zip đáy đứng 500g        ] │ │
│ │ Loại SP            Kiểu dáng      │ │
│ │ [ Túi      ▾ ]    [ 3 biên   ▾ ] │ │  ← cặp ngắn giữ 2 cột
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ ▶ ② Kích thước & số lượng         │ │  ← gập
│ ├───────────────────────────────────┤ │
│ │ ▶ ③ Cấu trúc vật liệu   3 lớp·109μ│ │  ← gập, badge tóm tắt
│ ├───────────────────────────────────┤ │
│ │ ▶ ④ Thông số in            6 màu  │ │
│ ├───────────────────────────────────┤ │
│ │ ▶ ⑤ Phụ phí & tài chính           │ │
│ └───────────────────────────────────┘ │
│                                       │
│   (chừa khoảng trống cuối ~140px)     │
├───────────────────────────────────────┤
│ Giá đề xuất       3.200 đ/túi         │ ══ sticky price bar
│ LN 30.6%             Xem chi tiết ▲   │    chạm → bottom sheet
├───────────────────────────────────────┤
│   📋 Nhập liệu ●        💰 Kết quả •  │ ══ tab dưới (• = badge mới)
└───────────────────────────────────────┘
```

### 2.2 Nhóm ② Kích thước (khi mở) — input số có stepper

```
│ ▼ ② Kích thước & số lượng           │
├─────────────────────────────────────┤
│ Khổ rộng (mm)      Bước cắt (mm)     │
│ [    200      ]    [    300      ]   │  ← inputMode=numeric, ≥16px
│ Số lượng (túi)                       │
│ [        10.000              ]       │  ← format vi-VN khi blur
│ Số hình / trục                       │
│ [ − ]   [    2    ]   [ + ]          │  ← stepper, khỏi gọi bàn phím
└─────────────────────────────────────┘
```

### 2.3 Nhóm ③ Cấu trúc vật liệu — picker bottom sheet

```
│ ▼ ③ Cấu trúc vật liệu      3 lớp    │
├─────────────────────────────────────┤
│ Lớp 1                                │
│ [ OPP 18                        ▾ ] │  ← chạm mở sheet chọn vật liệu
│ Lớp 2                                │
│ [ PET 12                        ▾ ] │
│ Lớp 3                                │
│ [ PE 80                         ▾ ] │
│ [ + Thêm lớp ]            (tối đa 5) │
│ ·································      │
│ Tổng: 110 μ · Mục tiêu 109 μ (±5) ✓ │  ← cảnh báo nếu ngoài khoảng
└─────────────────────────────────────┘

   chạm select →

┌───────────────────────────────────────┐░░  bottom sheet picker
│ ──                                    │░░  (── = thanh kéo)
│ Chọn vật liệu lớp 2               ✕  │░░
│ [ 🔍 Tìm vật liệu...               ] │░░
│ ─────────────────────────────────── │░░
│   PET 12                          ●  │░░  ← đang chọn
│   PET 15                             │░░
│   MPET 12                            │░░
│   AL 7                               │░░
│   ... (cuộn)                         │░░
└───────────────────────────────────────┘
  vuốt xuống / chạm nền để đóng
```

---

## 3. Màn Kết quả — Tab "Kết quả" + Bottom sheet nhanh

### 3.1 Bottom sheet kết quả nhanh (mở từ price bar, không rời form)

```
┌───────────────────────────────────────┐░░
│ ──                                    │░░  kéo lên = mở rộng
│ Kết quả nhanh                     ✕  │░░
│ ┌───────────────────────────────────┐ │░░
│ │   GIÁ ĐỀ XUẤT                     │ │░░
│ │   3.200 đ/túi      (chưa VAT)     │ │░░  ← hero, số lớn tabular
│ └───────────────────────────────────┘ │░░
│  Giá vốn   2.450    Lợi nhuận  30.6% │░░
│  Doanh thu 32 tr    Trục in   8,5 tr │░░
│ ─────────────────────────────────── │░░
│  [ Mở chi tiết đầy đủ → ]            │░░  → chuyển tab Kết quả
└───────────────────────────────────────┘░░
```

### 3.2 Tab Kết quả đầy đủ (thứ tự ưu tiên dọc)

```
┌───────────────────────────────────────┐
│ ☰   Kết quả tính giá              📥 │ ══ topbar (📥 xuất)
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │  ① HERO
│ │  GIÁ ĐỀ XUẤT                      │ │
│ │  3.200 đ/túi        LN 30.6% 🟢   │ │
│ │  [ Chốt giá: ____ ]   [ Áp dụng ] │ │  ← override giá chốt
│ └───────────────────────────────────┘ │
│ ┌────────────┐ ┌────────────┐         │  ② TÓM TẮT (bento 2 cột)
│ │ Giá vốn    │ │ Doanh thu  │         │
│ │ 2.450 đ    │ │ 32,0 tr    │         │
│ ├────────────┤ ├────────────┤         │
│ │ Trọng lượng│ │ Trục in    │         │
│ │ 12,4 g/cái │ │ 8,5 tr     │         │
│ └────────────┘ └────────────┘         │
│ ┌───────────────────────────────────┐ │  ③ BREAKDOWN (accordion gập)
│ │ ▶ Chi tiết chi phí / túi          │ │
│ │   ── khi mở: label-value list ──  │ │
│ │   Nguyên vật liệu        1.200 đ  │ │  ← KHÔNG bảng ngang
│ │   Công đoạn in             450 đ  │ │
│ │   Công đoạn ghép           380 đ  │ │
│ │   Công đoạn cắt            120 đ  │ │
│ │   Lãi vay                   85 đ  │ │
│ │   Hoa hồng                 115 đ  │ │
│ │   Lợi nhuận                850 đ  │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │  ④ BIỂU ĐỒ
│ │   ◓ Cơ cấu giá thành              │ │
│ │   [donut] ▪NVL ▪In ▪Ghép ▪Cắt    │ │  ← legend gần chart + tooltip
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │  ⑤ OVERRIDE (cuộn ngang)
│ │ Bảng giá theo mức SL    →→ cuộn   │ │
│ │ ┌─────┬──────┬──────┬──────┐      │ │
│ │ │Mục* │ 5.000│10.000│20.000│      │ │  ← cột "Mục" sticky trái
│ │ │Giá  │ 3.4k │ 3.2k │ 3.0k │      │ │
│ │ └─────┴──────┴──────┴──────┘      │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │  ⑥ THÔNG SỐ KỸ THUẬT
│ │ ▶ Thông số kỹ thuật               │ │
│ └───────────────────────────────────┘ │
│ [ 💾 Lưu ]  [ 📄 Xuất ]  [→ Báo giá ]│  quick actions full-width
├───────────────────────────────────────┤
│   📋 Nhập liệu        💰 Kết quả ●    │ ══ tab dưới
└───────────────────────────────────────┘
```

---

## 4. Màn Danh sách (Lịch sử / Khách hàng / Báo giá / LSX)

### 4.1 Card list + search + filter sticky

```
┌───────────────────────────────────────┐
│ ☰   Lịch sử tính giá              ⋮  │ ══ topbar
├───────────────────────────────────────┤
│ [ 🔍 Tìm nhanh...                   ] │ ══ search dính
│ [● Tính giá] [○ Báo giá]              │    segmented toggle
│ ‹ [7 ngày ×][Gạo Thơm ×][Đã chốt ×] › │    chip filter cuộn ngang →
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ TG-2026-0523-001          ○ Nháp │ │  ← mã + badge (icon+chữ)
│ │ Túi zip đáy đứng 500g            │ │  ← tiêu đề đậm
│ │ 🏢 Gạo Thơm MT · 25/05/26        │ │  ← meta --muted
│ │ Sale: An            3.200 đ/túi  │ │  ← giá tabular phải
│ └───────────────────────────────────┘ │  (cả card = target chạm)
│ ┌───────────────────────────────────┐ │
│ │ TG-2026-0522-014          ✓ Chốt │ │
│ │ Màng ghép OPP/PET                │ │
│ │ 🏢 Bao Bì SG · 24/05/26          │ │
│ │ Sale: Bảo            5.100 đ/m²  │ │
│ └───────────────────────────────────┘ │
│ ... (virtualize khi >50 item)         │
│                                       │
├───────────────────────────────────────┤
│            [ ⚙ Lọc · 3 ]              │ ══ nút lọc sticky (đếm filter)
└───────────────────────────────────────┘
```

### 4.2 Filter bottom sheet (mở từ nút "Lọc")

```
┌───────────────────────────────────────┐░░
│ ──                                    │░░
│ Bộ lọc                       Đặt lại  │░░
│ ─────────────────────────────────── │░░
│ Thời gian                            │░░
│ [○ 3 ngày] [● 7 ngày] [○ 30] [○ Tùy]│░░  ← chip chọn nhanh
│ Khách hàng                           │░░
│ [ 🔍 Tìm khách hàng...            ▾ ]│░░
│ Trạng thái                           │░░
│ ☑ Đang nháp   ☑ Đã chốt             │░░
│ ☐ Tạo báo giá ☐ Đã khóa             │░░
│ Vật liệu                             │░░
│ ☑ OPP  ☐ PET  ☐ AL  ☐ PE  ☐ MPET   │░░
│ ─────────────────────────────────── │░░
│ [        Áp dụng (3 bộ lọc)        ] │░░ ══ CTA dính đáy sheet
└───────────────────────────────────────┘░░
```

### 4.3 Detail full-screen (chạm card → push page)

```
┌───────────────────────────────────────┐
│ ‹ Quay lại    TG-2026-0523-001    ✏️ │ ══ topbar: back + sửa
├───────────────────────────────────────┤
│ ○ Đang nháp              25/05/2026   │  trạng thái + ngày
│ 🏢 Công ty TNHH Gạo Thơm Miền Tây    │
│ Túi zip đáy đứng 500g                 │
│ ┌───────────────────────────────────┐ │
│ │ Thông số                          │ │
│ │ Kích thước   200 × 300 mm         │ │
│ │ Vật liệu     OPP18/PET12/PE80     │ │
│ │ Số lượng     10.000 cái           │ │
│ │ Số màu in    6                    │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ Kết quả                           │ │
│ │ Giá thành    2.450 đ/cái          │ │
│ │ Giá bán      3.200 đ/cái          │ │
│ │ Lợi nhuận    30.6%                │ │
│ │ ▶ Chi tiết chi phí                │ │
│ └───────────────────────────────────┘ │
│ [ ✏️ Sửa ] [ 📄 Xuất ] [→ Báo giá ]  │
└───────────────────────────────────────┘
   (back giữ nguyên scroll + filter của list)
```

### 4.4 Empty state

```
┌───────────────────────────────────────┐
│                                       │
│              📋                       │
│      Không tìm thấy kết quả          │
│   Thử đổi bộ lọc hoặc tạo bản mới.   │
│                                       │
│   [ Xóa bộ lọc ]    [ Tạo mới ]      │
│                                       │
└───────────────────────────────────────┘
```

---

## 5. Wizard Tạo báo giá (3 bước)

### 5.1 Thanh tiến độ gọn

```
┌───────────────────────────────────────┐
│ ‹ Hủy        Tạo báo giá              │ ══ topbar
├───────────────────────────────────────┤
│ ●──────○──────○   Bước 1/3            │  dot tiến độ + nhãn
│ Chọn khách hàng                       │
├───────────────────────────────────────┤
```

### 5.2 Bước 1 — Chọn khách hàng

```
│ [ 🔍 Tìm theo tên, mã, MST...      ] │
│ [ + Tạo khách hàng mới ]             │
│ ─────────────────────────────────── │
│ ┌───────────────────────────────────┐ │
│ │ 🏢 Gạo Thơm Miền Tây              │ │
│ │ KH-001 · MST 0312345678          │ │
│ │ Sale: An · 🟢 Đang hoạt động     │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ 🏢 Bao Bì Sài Gòn                 │ │
│ │ KH-015 · MST 0398765432          │ │
│ └───────────────────────────────────┘ │
│ Gần đây: [Gạo Thơm][Bao Bì SG][+3]   │
├───────────────────────────────────────┤
│ [          Tiếp theo →           ]   │ ══ footer dính, ≥44px
└───────────────────────────────────────┘
```

### 5.3 Bước 2 — Sản phẩm × mức số lượng (card, tránh ma trận ngang)

```
│ Nguồn: (●) Từ bảng đã lưu ( ) Nhập   │
│ [ 🔍 Tìm bảng tính giá...       ] [+]│
│ ─────────────────────────────────── │
│ ┌───────────────────────────────────┐ │
│ │ Túi zip 500g            [ Xóa ✕ ] │ │  ← 1 SP = 1 card
│ │ OPP/PET/PE · 200×300              │ │
│ │ ── Mức số lượng ──                │ │
│ │  5.000 cái   →  3.400 đ  [sửa]    │ │  ← list mức bên trong
│ │ 10.000 cái   →  3.200 đ  [sửa]    │ │
│ │ [ + Thêm mức số lượng ]           │ │
│ └───────────────────────────────────┘ │
│ [ + Thêm sản phẩm ]                  │
├───────────────────────────────────────┤
│ [ ‹ Quay lại ]      [ Tiếp theo → ]  │ ══ footer
└───────────────────────────────────────┘
```

### 5.4 Bước 3 — Xác nhận

```
│ ┌───────────────────────────────────┐ │
│ │ Khách: Gạo Thơm Miền Tây          │ │
│ │ Số SP: 2  ·  Số mức giá: 4        │ │
│ │ Hiệu lực: 30 ngày                 │ │
│ └───────────────────────────────────┘ │
│ ▶ Điều khoản báo giá                 │
│ ▶ Xem trước nội dung                 │
├───────────────────────────────────────┤
│ [ ‹ Quay lại ]   [ 💾 Lưu báo giá ]  │
└───────────────────────────────────────┘
```

> Auto-save nháp ở mỗi bước. Nút "Hủy"/back → dialog "Thay đổi chưa lưu" (§7).

---

## 6. Trang Cấu hình (spreadsheet nặng)

### 6.1 Chế độ mặc định — card mở rộng

```
┌───────────────────────────────────────┐
│ ☰   Cấu hình tính giá                │ ══ topbar
├───────────────────────────────────────┤
│ ‹[Vật tư][Chi phí SX][Gia công][LN]› │  segmented cuộn ngang →
│ [ 🔍 Tìm vật liệu... ]   [ ▦ Bảng ]  │  search + đổi chế độ bảng
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ OPP 18                         ▶  │ │  ← thu gọn: tên + 2 số chính
│ │ 18 μ · 42.000 đ/kg               │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ PET 12                         ▼  │ │  ← mở: full field dọc
│ │ Độ dày (μ)    [    12         ]   │ │
│ │ Giá (đ/kg)    [   38.000      ]   │ │
│ │ Tỉ trọng      [    1,40       ]   │ │
│ │ Giá mực/màu   [    1.200      ]   │ │
│ │ [ Lưu ]   đã lưu ✓   [ Hoàn tác ] │ │  ← lưu inline + undo
│ └───────────────────────────────────┘ │
│ [ + Thêm vật liệu ]                  │
└───────────────────────────────────────┘
```

### 6.2 Chế độ bảng (nút "▦ Bảng") — cuộn ngang, cột tên + header dính

```
┌───────────────────────────────────────┐
│ ‹ Xoay ngang để xem rõ hơn            │  gợi ý nhẹ
│ ┌──────┬───────┬───────┬───────┐ →→  │
│ │Tên*  │ Dày μ │ đ/kg  │ Tỉ trg│      │  ← header sticky top
│ ├──────┼───────┼───────┼───────┤      │
│ │OPP18*│  18   │42.000 │ 0,91  │      │  ← cột Tên sticky left
│ │PET12*│  12   │38.000 │ 1,40  │      │
│ │PE 80*│  80   │31.000 │ 0,92  │      │
│ └──────┴───────┴───────┴───────┘      │
│  (* = cột dính trái)                  │
└───────────────────────────────────────┘
```

- Mỗi ô số: input ≥44px, `inputMode` đúng, lưu khi blur + toast "Đã lưu".

---

## 7. Thành phần dùng chung

### 7.1 Badge trạng thái (màu + icon + chữ, không chỉ màu)

```
○ Đang nháp   ✓ Đã chốt   ↗ Đã báo giá   🔒 Đã khóa
 gray          green        blue           red
```

### 7.2 Dialog xác nhận (thay đổi chưa lưu)

```
┌───────────────────────────────────────┐░░  role=dialog, aria-modal
│            ⚠                          │░░
│      Thay đổi chưa lưu                │░░
│  Bản tính hiện tại có thay đổi chưa   │░░
│  lưu. Bạn muốn làm gì?                │░░
│                                       │░░
│  [   Lưu lại   ]  (primary)          │░░
│  [ Không lưu ]    (danger ghost)     │░░
│  [ Tiếp tục sửa ] (ghost)            │░░
└───────────────────────────────────────┘░░
```

### 7.3 Toast (auto-dismiss 3–5s, aria-live)

```
┌───────────────────────────────┐
│ ✓ Đã lưu bảng TG-2026-0524-02 │  góc dưới, không cướp focus
└───────────────────────────────┘
```

### 7.4 Skeleton loading (list & kết quả)

```
┌───────────────────────────────────────┐
│ ▭▭▭▭▭▭▭▭        ▭▭▭▭                  │  shimmer
│ ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭                      │  5 card cho list
│ ▭▭▭▭▭▭   ▭▭▭▭▭                        │  / khối hero+breakdown cho KQ
└───────────────────────────────────────┘
```

---

## 8. Kích thước & spacing tham chiếu (phone)

| Thành phần | Giá trị |
|---|---|
| Topbar | cao 56px, padding ngang 12px |
| Bottom bar / tab | cao 64px + safe-area-bottom |
| Input / select / nút | cao ≥ 44px, font ≥ 16px |
| Header nhóm accordion | cao ≥ 48px |
| Padding ngang nội dung | 12px (`--mobile-gutter`) |
| Khoảng cách giữa card | 10–12px |
| Bo góc card | 14px · sheet 20px (trên) |
| Khoảng cách 2 target chạm | ≥ 8px |
| Chừa cuối trang (có bottom bar) | ~140px |

> Các con số phối hợp với token ở `UI-06-ThietKeMobileWeb.md §2`. Đây là wireframe định hình
> bố cục — màu sắc, đổ bóng, chi tiết thị giác lấy từ design tokens hiện có trong `globals.css`.
