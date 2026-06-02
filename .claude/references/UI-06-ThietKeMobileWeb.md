# UI/UX — Mục 6: Thiết Kế Giao Diện Web Trên Mobile

> **Phạm vi:** Web app (Next.js hiện có) chạy trong **trình duyệt điện thoại** — KHÔNG phải app native.
> **Mục tiêu:** Xem và nhập **lượng dữ liệu lớn** thoải mái trên màn nhỏ.
> **Định hướng thiết bị:** Ưu tiên phone (360–430px), giữ nguyên trải nghiệm desktop hiện tại.

---

## 1. Nguyên tắc nền tảng

Đây là công cụ B2B "đậm dữ liệu" (data-dense), không phải landing page. Thiết kế hướng tới
**mật độ có kiểm soát + tiết lộ dần (progressive disclosure)**, không phải tối giản phá cách.

5 nguyên tắc xuyên suốt:

1. **Một màn = một nhiệm vụ.** Mobile không chia đôi màn. Mỗi thời điểm user hoặc đang *nhập*,
   hoặc đang *xem kết quả*, hoặc đang *duyệt danh sách* — chuyển qua lại bằng tab/sheet,
   không nhồi cùng lúc.
2. **Tiết lộ dần.** Form 100+ field gập theo nhóm đóng/mở (accordion), chỉ mở nhóm đang cần.
   Bảng nhiều cột chỉ hiện 2–3 cột cốt lõi, phần còn lại mở ra khi chạm.
3. **Số liệu luôn đọc được.** Dùng *tabular figures* cho mọi cột tiền/số
   (`font-variant-numeric: tabular-nums`) để không nhảy layout. Tiền tệ VND format `vi-VN`.
4. **Ngón tay, không con trỏ.** Mọi target chạm ≥ 44×44px, khoảng cách ≥ 8px,
   input cao ≥ 44px (đồng thời tránh iOS auto-zoom: font body input ≥ 16px).
5. **Giữ ngữ cảnh khi nhập.** Khi đang nhập mà giá thay đổi, phải thấy ngay kết quả tóm tắt
   mà không rời khỏi form (sticky price bar / bottom sheet).

---

## 2. Hệ thống thiết kế (kế thừa & bổ sung)

Dự án đã có design tokens tốt trong `globals.css` (`--accent #4f46e5`, `--green`, `--surface`,
dark mode đầy đủ). **Giữ nguyên bảng màu và font Inter.** Bổ sung token cho lớp mobile:

| Token mới | Giá trị đề xuất | Dùng cho |
|---|---|---|
| `--touch-min` | `44px` | Chiều cao tối thiểu input/nút trên mobile |
| `--mobile-gutter` | `12px` | Padding ngang nội dung phone |
| `--sheet-radius` | `20px 20px 0 0` | Bo góc bottom sheet |
| `--z-bottombar` | `60` | Thanh giá/nav dưới |
| `--z-sheet` | `80` | Bottom sheet |
| `--z-sheet-backdrop` | `79` | Nền mờ sheet |
| `--safe-bottom` | `env(safe-area-inset-bottom)` | Tránh thanh gesture |

**Breakpoint chuẩn hóa** (hiện đang lẫn lộn 640/760/767/801/1100/1280):
thống nhất về 3 mốc

- Phone: `≤ 600px`
- Phone lớn / landscape nhỏ: `601–767px`
- Tablet: `768–1023px`
- Desktop: `≥ 1024px` (giữ nguyên hành vi hiện tại)

> Đây là chuẩn hóa dần — không cần refactor toàn bộ media query ngay, nhưng mọi CSS mobile
> mới phải bám 3 mốc `600 / 768 / 1024`.

**Đơn vị chiều cao:** thay `100vh` bằng `100dvh` cho mọi vùng full-height mobile
(sheet, drawer, detail page) để tránh lỗi thanh địa chỉ trình duyệt che mất nội dung.

---

## 3. Khung tổng thể & điều hướng (mobile shell)

Hiện trạng: mobile dùng FAB nổi (`MenuNoiMobile`) + drawer + bottom nav riêng cho calculator.
Vấn đề: 3 cơ chế điều hướng khác nhau dễ gây rối (anti-pattern `avoid-mixed-patterns`).

Đề xuất thống nhất:

```
┌─────────────────────────────┐
│ ☰  Tạo bảng tính giá    🔍 │ ← Topbar 56px: nút menu trái, tên màn, action phải
├─────────────────────────────┤
│                             │
│      NỘI DUNG (1 cột)       │ ← scroll dọc, dvh, padding-bottom chừa bottom bar
│                             │
│                             │
├─────────────────────────────┤
│  Giá đề xuất 3.200đ/túi  ▲ │ ← Sticky context bar (tùy màn)
└─────────────────────────────┘
```

- **Drawer điều hướng chính** mở từ nút ☰ topbar (full-height `dvh`, backdrop 50% như
  `.lts-sidebar-backdrop` hiện có). Bỏ FAB nổi để tránh đè nội dung và trùng cơ chế.
  Drawer hiển thị cây menu 6 nhóm như desktop, item active tô đậm (`nav-state-active`).
- **Bottom bar theo ngữ cảnh** — KHÔNG phải global tab bar (app có 10 module, quá 5 mục
  cho bottom nav). Mỗi màn tự quyết bottom bar của mình:
  - Calculator: 2 tab `Nhập liệu | Kết quả` (giữ pattern hiện tại, nâng cấp ở §4).
  - Danh sách: ẩn bottom bar, dùng nút "Lọc" sticky.
- **Back nhất quán:** trong luồng nhiều bước (tạo báo giá 3 bước), nút back ở topbar;
  chặn back mất dữ liệu bằng dialog "Thay đổi chưa lưu".

---

## 4. Màn Form tính giá (TheNhapLieu) — màn khó nhất

Form 100+ field. Trên mobile tuyệt đối không đặt cạnh panel kết quả.

### 4.1 Bố cục: Accordion theo nhóm nghiệp vụ

Gom field thành các nhóm gập được, mặc định chỉ mở nhóm 1:

```
┌─────────────────────────────┐
│ ▼ ① Thông tin đơn hàng      │ ← mở
│   Khách hàng  [_________]   │
│   Tên hàng    [_________]   │
│   Loại SP  [Túi ▾] [3 biên▾]│
├─────────────────────────────┤
│ ▶ ② Kích thước & số lượng   │ ← gập
├─────────────────────────────┤
│ ▶ ③ Cấu trúc vật liệu (3)   │ ← gập, badge số lớp đã chọn
├─────────────────────────────┤
│ ▶ ④ Thông số in             │
├─────────────────────────────┤
│ ▶ ⑤ Phụ phí & tài chính     │
└─────────────────────────────┘
```

- Mỗi header nhóm = target chạm lớn (≥48px), có chevron xoay, hiện **badge tóm tắt**
  (vd nhóm vật liệu hiện "3 lớp · 109mic") để biết nội dung mà không cần mở.
- 1 field = 1 hàng đầy chiều rộng trên phone (bỏ `form-row` 2 cột < 600px), trừ cặp field
  ngắn liên quan (Rộng × Dài) thì giữ 2 cột.
- Label luôn hiện phía trên input (không dùng placeholder thay label).

### 4.2 Input tối ưu chạm & bàn phím

- Input số dùng `inputMode="numeric"`/`"decimal"` (component `ONhapSoDinhDang` đã đúng) — giữ.
  Đảm bảo `font-size ≥ 16px` trên mobile.
- Select vật liệu nhiều mục: trên mobile nâng thành **bottom sheet picker** có ô tìm kiếm
  (thay `<select>` native khi danh sách > 15 mục) vì danh sách vật liệu/nhóm rất dài.
- Stepper +/− cho field hay chỉnh nhỏ (số màu, số hình) để khỏi gọi bàn phím.

### 4.3 Sticky price bar (giữ ngữ cảnh)

Khi đang ở tab Nhập liệu mà có kết quả, hiện thanh giá dính đáy (nâng cấp `ThanhGiaMini` +
`.mini-price-strip` hiện có):

```
┌─────────────────────────────┐
│ Giá đề xuất  3.200 đ/túi    │
│ LN 30.6%        Xem chi tiết▲│ ← chạm mở bottom sheet kết quả nhanh
└─────────────────────────────┘
```

- Chạm → mở **bottom sheet** kết quả tóm tắt (kéo lên xem chi tiết, kéo xuống đóng)
  thay vì nhảy hẳn sang tab khác — user vẫn giữ chỗ đang nhập.
- Animation cập nhật nhẹ (flash màu) khi giá đổi, tôn trọng `prefers-reduced-motion`.

### 4.4 Tab dưới

`📋 Nhập liệu | 💰 Kết quả` (giữ), thêm badge chấm khi có kết quả mới (đã có `.m-tab-badge`).

---

## 5. Màn Kết quả tính giá (ManHinhQuanLy)

Nhiều khối: hero giá, breakdown chi phí từng công đoạn, bảng override, thông số kỹ thuật.

- **Thứ tự ưu tiên dọc trên mobile:** (1) Hero giá đề xuất + LN → (2) Tóm tắt nhanh
  (giá vốn, doanh thu, trục in) → (3) Breakdown chi phí (accordion, mặc định gập) →
  (4) Bảng override (cuộn ngang riêng) → (5) Thông số kỹ thuật.
- **Bento grid** (`.bento`) hiện chuyển 2 cột ở mobile — giữ, nhưng hero và breakdown
  chiếm full `1 / -1`.
- **Bảng breakdown nhiều cột:** dùng pattern "label-value list" (mỗi dòng: tên công đoạn — giá),
  KHÔNG ép thành bảng ngang. Nếu cần so sánh nhiều cột (vd override theo mức số lượng) thì bọc
  `.table-responsive` cuộn ngang + cột đầu (tên) dính trái (`position: sticky; left: 0`).
- Donut/chart chi phí: có legend gần chart + label trực tiếp; chạm segment hiện tooltip;
  có data table thay thế cho a11y.
- TOC bên phải đã ẩn trên mobile — giữ.

---

## 6. Danh sách & bảng lớn (Lịch sử, Khách hàng, Báo giá, LSX)

Reference đã định nghĩa: **mobile thay table bằng card list** (UI-03 dòng 330).
Chuẩn hóa pattern card chung cho mọi module:

```
┌─────────────────────────────┐
│ TG-2026-0523-001    ○ Nháp │ ← mã + badge trạng thái (góc phải)
│ Túi zip đáy đứng 500g      │ ← dòng tiêu đề đậm
│ 🏢 Gạo Thơm MT · 25/05     │ ← meta phụ, màu --muted
│ Sale: An      3.200 đ/túi  │ ← giá tabular-nums, phải
└─────────────────────────────┘  ← cả card là 1 target chạm → mở detail
```

- **Bộ lọc:** trên mobile gom toàn bộ filter bar vào **bottom sheet "Lọc"** mở từ nút sticky
  (đếm số filter đang áp: "Lọc · 2"). Chip filter đang áp hiện thành hàng cuộn ngang trên list.
- **Tìm kiếm:** ô search dính dưới topbar, full width, debounce 300ms.
- **Detail panel:** desktop slide-in 60% → mobile **full-screen page** (push route hoặc overlay
  `dvh`), back về list giữ nguyên scroll + filter (`state-preservation`).
- **Hiệu năng:** list dài (>50 item) virtualize; skeleton 5 card khi load;
  empty state có nút "Xóa bộ lọc".
- **Toolbar layout/density/print:** đã ẩn trên mobile — giữ.

---

## 7. Trang cấu hình (TrangCauHinh) — spreadsheet nặng

Bảng nhập định mức rất nhiều ô (vật liệu, hằng số, bảng lợi nhuận). Chỗ "nhập dữ liệu lớn"
khó nhất.

- **Không cố nhồi spreadsheet ngang vào phone.** Chia 2 chế độ:
  - **Mặc định (phone):** mỗi dòng vật liệu = 1 **card mở rộng được**. Thu gọn hiện tên +
    2 thông số chính (độ dày, giá/kg); mở ra hiện toàn bộ field dạng list dọc. Lưu inline,
    có nút undo.
  - **Chế độ bảng:** nút "Xem dạng bảng" → bảng `.table-responsive` cuộn ngang, **cột tên dính
    trái**, header dính trên (`position: sticky; top: 0`). Gợi ý "xoay ngang để xem rõ hơn".
- Nhóm cấu hình (vật tư / chi phí SX / gia công ngoài / biên LN / phụ phí / lãi vay) dùng
  segmented control cuộn ngang ở đầu trang.
- Mỗi ô số: input ≥44px, `inputMode` phù hợp, lưu khi blur + toast xác nhận.

---

## 8. Form nhiều bước (Tạo báo giá)

- Step indicator (`① Chọn KH → ② Sản phẩm → ③ Xác nhận`) trên mobile rút thành
  **thanh tiến độ gọn** "Bước 2/3 · Chọn sản phẩm" + dot nhỏ, cuộn ngang nếu chật
  (đã có CSS `.crm-wiz-steps` overflow-x).
- Footer action (`Quay lại | Tiếp theo`) dính đáy, nút ≥44px, chừa safe-area.
- Bảng "nhiều sản phẩm × nhiều mức số lượng": mỗi sản phẩm = 1 card, các mức số lượng là
  list bên trong; tránh ma trận ngang trên phone.
- Auto-save nháp để tránh mất dữ liệu khi lỡ thoát.

---

## 9. Accessibility & chất lượng (checklist bắt buộc)

Áp theo Quick Reference §1–§3 của bộ quy tắc UI/UX:

- Contrast text ≥ 4.5:1 cả light/dark; badge trạng thái không chỉ dựa vào màu —
  kèm icon/label.
- Mọi nút icon-only có `aria-label` (nút menu, đóng sheet, xóa filter).
- Bảng dùng semantic `<table>` / `<th scope>` / `aria-sort`; danh sách card có
  cấu trúc đọc được bằng screen reader.
- Bottom sheet & dialog: `role="dialog"`, `aria-modal="true"`, có nút đóng rõ ràng,
  vuốt xuống để đóng, focus quản lý đúng.
- Tôn trọng `prefers-reduced-motion` cho mọi animation (price flash, sheet, transition).
- Form: lỗi hiện ngay dưới field + `aria-live="polite"`; validate khi blur, không
  validate từng phím.
- Không tắt zoom (`viewport` giữ `user-scalable`); không dùng `100vh` cứng.
- Touch target ≥ 44×44px, khoảng cách ≥ 8px; input ≥ 16px tránh auto-zoom iOS.

---

## 10. Tóm tắt ưu tiên triển khai (gợi ý thứ tự)

| # | Hạng mục | Lý do ưu tiên |
|---|---|---|
| 1 | Chuẩn hóa breakpoint + token mobile + `dvh` | Nền tảng cho mọi thứ sau |
| 2 | Thống nhất điều hướng (drawer thay FAB) | Bỏ 3 cơ chế lẫn lộn |
| 3 | Accordion + sticky price bar cho Form tính giá | Màn nhập liệu khó nhất |
| 4 | Card list + filter sheet cho Danh sách | Màn xem dữ liệu lớn |
| 5 | Card mở rộng + chế độ bảng cho Cấu hình | Spreadsheet nặng |
| 6 | Bottom sheet kết quả + breakdown accordion | Hoàn thiện luồng tính giá |
| 7 | Rà soát a11y theo §9 | Chất lượng trước khi giao |

> **Lưu ý:** Tài liệu này là *design spec* — mô tả pattern và quyết định thiết kế.
> Lộ trình code chi tiết theo từng file sẽ làm ở bước triển khai riêng.
