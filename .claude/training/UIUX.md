# Tài liệu UI/UX — LTS Pricing
> Dành cho developer. Mô tả toàn bộ kiến trúc giao diện, component tree, CSS system, responsive behavior, và các pattern/bẫy UI quan trọng.  
> Cập nhật lần cuối: 2026-04-20

---

## Mục lục
1. [Kiến trúc tổng thể](#1-kiến-trúc-tổng-thể)
2. [CSS Design System](#2-css-design-system)
3. [Layout System](#3-layout-system)
4. [AppShell — Khung bao ngoài](#4-appshell--khung-bao-ngoài)
5. [Sidebar](#5-sidebar)
6. [TopHeader — Thanh tiêu đề](#6-topheader--thanh-tiêu-đề)
7. [InputCard — Form nhập liệu](#7-inputcard--form-nhập-liệu)
8. [ManagerView — Panel kết quả](#8-managerview--panel-kết-quả)
9. [TechView — Bảng kỹ thuật](#9-techview--bảng-kỹ-thuật)
10. [Bento Layout — Dashboard view](#10-bento-layout--dashboard-view)
11. [HistoryModule & HistoryDbModule](#11-historymodule--historydbmodule)
12. [QuotationModule](#12-quotationmodule)
13. [LSXFormModal & ProductionOrderModule](#13-lsxformmodal--productionordermodule)
14. [ConfigPage — Bảng định mức](#14-configpage--bảng-định-mức)
15. [CustomerModule & SellerModule](#15-customermodule--sellermodule)
16. [UserManagementModule](#16-usermanagementmodule)
17. [Component dùng chung](#17-component-dùng-chung)
18. [Responsive & Mobile](#18-responsive--mobile)
19. [Theme — Sáng / Tối](#19-theme--sáng--tối)
20. [Density — Mật độ hiển thị](#20-density--mật-độ-hiển-thị)
21. [Print mode](#21-print-mode)
22. [Các pattern & bẫy UI](#22-các-pattern--bẫy-ui)

---

## 1. Kiến trúc tổng thể

```
page.tsx  (Next.js App Router)
└── AppShell  (layout/AppShell.tsx)
    ├── Sidebar  (desktop ≥ 768px)
    │     ├── Logo + Toggle
    │     ├── Nav items (lọc theo role)
    │     └── Role switcher (select)
    ├── MobileFloatingMenu  (mobile < 768px)
    │     └── FAB button → popup
    └── lts-shell-main
          ├── TopHeader
          │     ├── Title + nút "Mới"
          │     ├── Layout picker (☰▤⬚◫)
          │     ├── Density picker (S/M/L)
          │     ├── Theme toggle
          │     └── Nút In + Xuất .txt
          └── lts-shell-content (scroll)
                ├── calculator → children (page.tsx)
                │     └── main-grid
                │           ├── InputCard  (id="inputCard")
                │           └── resultArea
                │                 ├── tabs (Quản lý / Kỹ thuật / Lịch sử)
                │                 ├── ManagerView
                │                 ├── TechView
                │                 └── HistoryView
                ├── quotations    → QuotationModule
                ├── history_db    → HistoryDbModule
                ├── customers     → CustomerModule
                ├── sellers       → SellerModule
                ├── master_data   → ConfigPage
                ├── users         → UserManagementModule
                └── production_orders → ProductionOrderModule
```

**Lưu ý kiến trúc:**
- `page.tsx` là entry point — render `<AppShell>` wrapping toàn bộ layout
- `calculator` module → render `children` (nội dung của `page.tsx`)
- Các module khác được inject trực tiếp bởi `AppShell` — không dùng Next.js routing
- Toàn bộ state ở Zustand store, không có React Context riêng

---

## 2. CSS Design System

### 2.1. CSS Variables (Design Tokens)

Tất cả màu, shadow, radius đều là CSS variables — **không hardcode hex** trong component.

#### Light theme (`:root`)
| Variable | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#f0f2f5` | Nền trang |
| `--surface` | `#ffffff` | Card, sidebar, modal |
| `--surface2` | `#f8f9fb` | Nền input, stripe bảng |
| `--border` | `rgba(0,0,0,0.08)` | Đường viền |
| `--accent` | `#4f46e5` | Màu chủ đạo (indigo) |
| `--accent2` | `#0891b2` | Màu phụ (cyan) |
| `--green` | `#059669` | Thành công, giá chốt |
| `--red` | `#dc2626` | Lỗi, cảnh báo |
| `--orange` | `#d97706` | Cảnh báo nhẹ, config |
| `--pink` | `#db2777` | Accent phụ |
| `--text` | `#1e293b` | Chữ chính |
| `--muted` | `#64748b` | Label, placeholder |
| `--dim` | `#94a3b8` | Chữ mờ, icon không active |
| `--grad` | `linear-gradient(135deg, #4f46e5, #0891b2)` | Logo, nút primary, price hero |
| `--radius` | `14px` | Border radius card |
| `--shadow-sm/md/lg` | — | Shadow theo cấp độ |
| `--input-bg` | `#f1f5f9` | Nền ô input |

#### Dark theme (`[data-theme="dark"]`)
- Sidebar vẫn dùng `#0f172a` / `#080e1a` (hardcode riêng, không qua variable)
- `--bg`: `#0f172a`, `--surface`: `rgba(30,41,59,0.95)`
- `--accent` đổi sang `#818cf8` (sáng hơn để đọc được trên nền tối)
- `--input-bg`: `rgba(0,0,0,0.25)`

**Áp dụng theme:** attribute `data-theme="dark"` trên `<html>` — set bởi `AppShell` khi `theme` state thay đổi.

### 2.2. Typography

- Font: `Inter` (Google Fonts) — weight 300/400/500/600/700/800
- Base font-size: `14px` (html)
- Mobile: `13px` (< 640px)
- Tất cả font-size trong component dùng `rem` — responsive tự động theo base

### 2.3. Animation & Transition

| Pattern | CSS |
|---|---|
| Fade-in khi panel/component mount | `@keyframes fadeIn` — opacity 0→1, translateY 8px→0, 0.35s ease |
| Collapsible section mở/đóng | `max-height: 0 ↔ 2000px` (advanced) hoặc `9999px` (result cards), + opacity, 0.35s cubic-bezier |
| Cost bar segments | `transition: width 0.8s cubic-bezier(0.4,0,0.2,1)` |
| Sidebar thu/mở | `transition: width 0.28s cubic-bezier(0.4,0,0.2,1)` |
| Bento tile hover | `translateY(-4px) scale(1.01)`, 0.3s cubic |
| Bento hero pulse | `@keyframes bentoPulse` — scale 1→1.3, 6-8s infinite alternate |
| Toast vào/ra | `toastIn` (translateX(40px)→0) + `toastOut` sau 3.7s/4.7s |
| Pulse dot (auto-calc badge) | scale 1→1.6, opacity 1→0.4, 2s infinite |

---

## 3. Layout System

### 3.1. Layout Modes — 4 chế độ

Chọn qua toolbar topbar (chỉ hiện ở desktop + module `calculator`).  
State: `layoutType` trong Zustand store, áp dụng qua `data-layout` attribute trên `<html>`.

| Mode | Icon | CSS | Mô tả |
|---|---|---|---|
| `default` | ☰ | `grid-template-columns: 345px 1fr` | Form trái, kết quả phải — side-by-side |
| `stacked` | ▤ | `grid-template-columns: 1fr`, max-width 800px | Form trên, kết quả dưới — stack dọc |
| `wide` | ⬚ | `grid-template-columns: 299px 1fr` | Giống default nhưng form hẹp hơn 46px |
| `bento` | ◫ | InputCard ẩn (`display: none`), hiện BentoView | Dashboard tiles, không có form |

**Scroll behavior (default/wide):**
- Desktop: `overflow: hidden` trên `body` → scroll riêng từng panel (input + result)
- Mỗi panel: `height: calc(100vh - 104px)`, `overflow-y: auto`
- Scrollbar input panel: ẩn mặc định, hiện mỏng khi hover (4px)
- Scrollbar result panel: luôn hiện, 6px

### 3.2. Grid classes

| Class | Columns | Dùng ở |
|---|---|---|
| `.main-grid` | `345px 1fr` (default) | Calculator page |
| `.form-row` | `1fr 1fr` | Các cặp input |
| `.form-row-3` | `1fr 1fr 1fr` | Bộ 3 input (kích thước, trục in) |
| `.stat-grid` | `repeat(auto-fit, minmax(130px, 1fr))` | Thẻ stat (tổng CPSX, LN, DT) |
| `.bento` | `repeat(6, 1fr)` | Bento dashboard |
| `.config-cpsx-grid` | `repeat(auto-fill, minmax(200px, 1fr))` | Ô nhập hằng số |

### 3.3. HTML class markers — ảnh hưởng CSS toàn trang

`AppShell` thêm/xóa class trên `<html>` tùy module đang active:

| Class trên `<html>` | Khi nào | Tác dụng |
|---|---|---|
| `in-config-page` | `activeModule === 'master_data'` | Tắt `overflow: hidden` → scroll tự do |
| `in-crm-page` | customers / sellers / quotations / users + mọi màn mobile | Tắt `overflow: hidden` → scroll tự do |

> ⚠️ Nếu thêm module mới cần scroll tự do (như CRM) → phải thêm vào điều kiện `in-crm-page` trong `AppShell`.

---

## 4. AppShell — Khung bao ngoài

**File:** `src/components/layout/AppShell.tsx`

### State local của AppShell
| State | Default | Mô tả |
|---|---|---|
| `role` | `'admin'` | Vai trò hiện tại — lọc menu + ảnh hưởng component con |
| `isSidebarOpen` | `true` | Sidebar mở/thu — desktop only |
| `isMobile` | `false` | `true` khi `window.innerWidth < 768` |

### Breakpoint mobile
```
window.innerWidth < 768px → isMobile = true
→ Sidebar biến mất, thay bằng MobileFloatingMenu (FAB)
→ Sidebar bắt đầu đóng (isSidebarOpen = false)
```
> Dùng `resize` event listener, cleanup khi unmount.

### Module routing
```tsx
{activeModule === 'calculator'        && children}
{activeModule === 'quotations'        && <QuotationModule role={role} />}
{activeModule === 'history_db'        && <HistoryDbModule onNavigate={setActiveModule} />}
{activeModule === 'customers'         && <CustomerModule role={role} currentSellerId={...} />}
{activeModule === 'sellers'           && <SellerModule />}
{activeModule === 'master_data'       && <ConfigPage />}
{activeModule === 'users'             && <UserManagementModule />}
{activeModule === 'production_orders' && <ProductionOrderModule />}
```
> Tất cả module mount/unmount trực tiếp — không lazy load. Module nào không active thì không tồn tại trong DOM.

### Export .txt
Nút "📥 Xuất" trong TopHeader gọi `handleExport()` — tạo `Blob` text UTF-8 BOM, download ngay.  
Nội dung: tóm tắt đơn hàng, chi tiết giá, % LN, DT, giá trục in.  
Tên file: `BaoGia_{customer}_{YYYY-MM-DD}.txt`

### Role sync
- Mỗi khi đổi role → `setCurrentSeller(id, name)` + `setStoreRole(r)` đồng thời
- Map `ROLE_SELLER_MAP`: `admin → 'admin'`, `sale → 'S1'`, `purchase → 'P1'`
- Đây là mock — sau này cần thay bằng JWT auth thực

---

## 5. Sidebar

**Trạng thái:**
- Desktop mở: `width: 240px` — hiện label + chevron
- Desktop thu: class `lts-sidebar--collapsed`, `width: 72px` — chỉ hiện icon, tooltip title
- Mobile mở: class `lts-sidebar--mobile` (không có `--collapsed`) — overlay toàn màn hình
- Mobile đóng: `lts-sidebar--hidden` — `display: none` (không phải thu nhỏ)

**CSS sidebar:**
- Background: `#0f172a` (hardcode, không dùng variable)
- Transition width: `0.28s cubic-bezier(0.4,0,0.2,1)` — animate mượt
- `overflow: hidden` → label bị clip khi thu → không bị text "nhảy ra ngoài"
- Nav item active: `background: #4f46e5`, `box-shadow: 0 4px 14px rgba(79,70,229,0.4)`

**Menu items và quyền:**
| Module | Roles |
|---|---|
| Tính giá Sản phẩm | admin, sale |
| Danh sách Báo giá | admin, sale |
| Lịch sử tính giá | admin, sale |
| Lệnh Sản Xuất | admin, purchase |
| Bảng định mức | admin, purchase |
| Khách hàng (CRM) | admin, sale |
| Quản lý Seller | admin |
| Tài khoản hệ thống | admin |
| Cài đặt hệ thống | admin |

**Role switcher** nằm trong `lts-sidebar-footer` — `<select>` với 3 option (admin/sale/purchase).  
Khi thu sidebar → chỉ hiện select (không label).

**Backdrop mobile:** `div.lts-sidebar-backdrop` — click outside đóng sidebar.

---

## 6. TopHeader — Thanh tiêu đề

**File:** `src/components/layout/AppShell.tsx` (component `TopHeader`)

**Layout:** flex row, `lts-topbar-left` (title + nút Mới) + `lts-topbar-actions` (tools phải).

### Nút "Mới"
- Chỉ hiện khi `activeModule === 'calculator'`
- Có dot đỏ nhỏ khi `isDirty = true` (form đã thay đổi chưa lưu)
- Click khi `isDirty` → hiện confirm dialog (backdrop + modal)
- Confirm dialog: 2 nút — "Quay lại" và "Tạo mới (không lưu)"

### Layout picker — chỉ hiện desktop + calculator
```
toolbar-group: ☰ (default) | ▤ (stacked) | ⬚ (wide) | ◫ (bento)
```
> Chọn `bento` → đồng thời set `activeView = 'bento'` trong store.

### Density picker — chỉ hiện desktop + calculator
```
toolbar-group: S (compact) | M (comfortable) | L (spacious)
```

### Theme toggle
- Toggle switch CSS thuần (không JS animation) — `::after` pseudo-element
- Light: ☀️ bên trái; Dark: 🌙 bên phải (`translateX(18px)`)

### Nút In — ẩn mobile
`window.print()` — CSS print media query ẩn form, hiện full result.

### Nút Xuất — ẩn mobile, chỉ hiện khi `result !== null`
Download `.txt` như mô tả mục 4.

---

## 7. InputCard — Form nhập liệu

**File:** `src/components/InputCard.tsx` (~550 dòng)  
**DOM id:** `#inputCard`  
**Sticky:** `position: sticky; top: 64px` (desktop default/wide layout)

### Cấu trúc form (theo thứ tự từ trên xuống)

```
[Auto-calc badge] (pulse dot xanh)
[Card title] 📝 Thông tin đơn hàng

[form-row]
  Khách hàng (text input)
  Tên hàng (text input)

[form-row]
  Loại sản phẩm (select: Túi / Màng)
  ↳ Túi: Loại túi (3 biên / 4 biên / xếp hông lệch / xếp hông giữa / đáy đứng / cut seal)
  ↳ Màng: Loại màng (màng in / màng ghép / màng đóng gói tự động)

Số lượng (label đổi: "Diện tích (m²)" khi chọn Màng)
↳ Màng thêm: Chiều dài mỗi cuộn màng TP (m)

[divider]

--- Phần này CHỈ HIỆN khi (túi + đã chọn bagType) HOẶC (màng + đã chọn filmType) ---

[card-title] 🏗️ Cấu trúc

[form-row-3]
  Khổ trải (m)
  Bước cắt (m)
  Số con hình

Số màu in (select: 0–8)

[StructurePreview] — mini visual preview các lớp

[renderLayerSelect] × 5
  Lớp 1 (luôn enabled)
  Lớp 2 (disabled khi chưa chọn lớp 1)
  Lớp 3 (disabled khi chưa chọn lớp 2)
  Lớp 4 (disabled khi chưa chọn lớp 3)
  Lớp 5 (disabled khi chưa chọn lớp 4)

[advanced-toggle] ⚙️ Tùy chỉnh nâng cao ▸
[advanced-section (collapsible)]
  Phủ mực (%)
  [form-row-3] ☐ Nhũ  ☐ Phủ mờ
  (Chỉ túi) 🎀 Phụ kiện: ☐ Zipper  ☐ Băng keo  ☐ Quai
  🖨️ Trục in: Dài (disabled, auto) | Chu vi (disabled, auto) | Đơn giá
    → cylinder-preview: DT · 1 trục · Cả bộ
  📦 Đóng gói & Vận chuyển
    ↳ Màng: 1 input đóng gói (đ/cuộn)
    ↳ Túi: Túi/thùng + Giá thùng
    Vận chuyển (đ/km) + Khoảng cách (km)
  ⏳ Thanh toán: radio 14 / 30 / 90 ngày + lãi suất mỗi loại
  💵 Hoa hồng: số + select (% / VND) + CommissionHint

[divider]
[btn btn-primary] ⚡ Tính Giá
[quick-actions]
  🔄 Reset    📋 Copy
```

### Input components con

#### `FormattedNumberInput`
- Type: `text`, inputMode: `numeric`
- Hiển thị: dấu chấm làm ngàn phân cách (VN style, ví dụ: `10.000`)
- Nhập: xóa dấu chấm, parse số nguyên
- Hỗ trợ số thập phân qua dấu phẩy (`,`) → convert sang `.`
- Khi focus: hiện raw, khi blur: format lại

#### `DecimalInput`
- Type: `text`, inputMode: `decimal`
- Không format ngàn — dùng cho khổ trải, bước cắt, tỉ lệ phủ mực
- Dấu phẩy → dấu chấm tự động

#### `renderLayerSelect` — 2 tầng select
```
Tầng 1: Chọn vật liệu hoặc nhóm (GROUP_xxx)
  → Nếu chọn nhóm → hiện tầng 2:
Tầng 2: Chọn độ dày trong nhóm
  → Có thêm ô nhập mic tùy chỉnh nếu material.adjustableMic = true
```
- Nhóm chỉ dành cho layer1: `BOPP`, `Matt OPP` không hiện ở layer 2-5
- Xóa layer trên → tự động xóa tất cả layer bên dưới (`handleLayerChange`)
- Xóa micOverride khi đổi layer

#### `StructurePreview`
- Hiện các block nhỏ ngang cho từng lớp đã chọn
- Hiện tên vật liệu (tên tắt) + độ dày (mic hoặc override)
- Nếu chưa có lớp nào: block xám mờ placeholder

#### `CommissionHint`
- Hiện dòng chuyển đổi realtime:
  - Nếu nhập `%` → hiện "= X đ/túi"
  - Nếu nhập `VND` → hiện "= X% (trên giá vốn+LN)"

### Validation khi bấm "Tính Giá"
```
productType không rỗng
&& (tui → bagType không rỗng)
&& (mang → filmType không rỗng)
&& quantity > 0
&& spreadWidth > 0
&& cutStep > 0
&& numColors !== null
```
> Nếu fail → `alert('Vui lòng nhập đầy đủ thông tin đơn hàng.')` — không highlight từng field.  
> Không có inline validation per-field.

### Cảnh báo trục in (inline, không block submit)
- `cylLength < 0.7m` → text đỏ "⚠️ Dưới tối thiểu (0.7m)"
- `cylLength > 1.25m` → text đỏ "⚠️ Vượt tối đa (1.25m)"
- `cylCircum < 0.4m` → text đỏ "⚠️ Dưới tối thiểu (0.4m)"
- `cylCircum > 0.9m` → text đỏ "⚠️ Vượt tối đa (0.9m)"

---

## 8. ManagerView — Panel kết quả

**File:** `src/components/ManagerView.tsx` (~47 KB — component lớn nhất)

### TOC (Table of Contents) nổi
- Cố định bên phải (`position: fixed`, `width: 200px`, `right: 12px`)
- Hiện danh sách section link, click → scroll smooth đến anchor
- Offset scroll: `scroll-margin-top: 100px` trên `.manager-section-anchor`
- Ẩn ở `max-width: 1200px` → stack lên trên content
- Padding bù: `manager-content { padding-right: 180px }` → thu lại khi TOC ẩn

### Giá Hero (Price Hero)
```
.price-hero
  label: "GIÁ ĐỀ XUẤT / túi" (hoặc /m²)
  value: gradient text (2.8rem, font-weight 800)
  unit: "chưa VAT"
  sub: chuỗi cấu trúc + thông số kỹ thuật
```
- Khi đã chốt giá → label đổi thành "GIÁ CHỐT / túi" (màu xanh lá)
- Thêm dòng nhỏ "(giá đề xuất X đ)"

### Stat cards
4 thẻ (`stat-grid`): Tổng CPSX | % LN | Doanh thu | Giá Bán (→ "Giá Chốt" khi đã chốt)

### Bảng breakdown — 3 bảng (Bảng 1 / 2 / 3)
- **Bảng 1:** Kết quả engine (read-only, được tính từ `result`)
- **Bảng 2 (Sale):** `OverridableCell` — sale có thể click để chỉnh số
- **Bảng 3 (Admin):** `OverridableCell` — admin có thể click để chỉnh số
- Rows: `print | lam-2 | lam-3 | lam-4 | lam-5 | cut`
- Columns: Khổ (m) | Thành phẩm (m) | Phế hao (m) | Đầu vào VL | CP VL (đ/m²) | CP CPSX | Tổng

#### `OverridableCell` — click-to-edit inline
```
canEdit = false → chỉ hiện giá trị, tooltip "Gốc: X" nếu đã override
canEdit = true  → click → <input type="number"> autoFocus
                  blur / Enter → commit
                  Escape / NaN / âm / quá gần gốc → revert (xóa override)
```
- Cell đã override: class `override-changed` → màu vàng cam
- Tooltip: "Gốc: {giá trị gốc}"

### Chốt giá
```
.chot-gia-row
  input số (giá chốt)
  btn "Chốt giá"

.chot-analysis (hiện khi đã nhập giá chốt)
  .positive (xanh) nếu chotGia >= finalPrice
  .negative (đỏ) nếu chotGia < finalPrice
  → Hiện: % LN thực, DT thực, chênh lệch vs đề xuất
```

### Cost bar
- Thanh ngang chia 3 màu: In (accent/indigo) | Ghép (accent2/cyan) | Cắt (orange)
- Chiều rộng % tỉ lệ theo giá trị thực
- Transition: `width 0.8s cubic-bezier(0.4,0,0.2,1)`
- Legend bên dưới với dot màu + label + giá trị

### CollapsibleCard
- Mọi section trong ManagerView đều bọc trong `CollapsibleCard`
- Mặc định **đóng** khi có `resetKey` mới (kết quả mới)
- Title click → toggle
- Arrow: ▼ xoay 180° khi đóng (tức là ▲)
- CSS: `max-height 0 ↔ 9999px`, transition 0.35s

### MOQ table
- Bảng SL theo cuộn màng (chỉ hiện khi `productType === 'mang'`)
- Highlight row hiện tại

---

## 9. TechView — Bảng kỹ thuật

**File:** `src/components/TechView.tsx`

- Hiện chi tiết từng công đoạn: chiều dài, khổ, phế hao, CPSX, tổng
- Format số: `font-variant-numeric: tabular-nums`
- Không có override (read-only)
- Dùng `.data-table` CSS class

---

## 10. Bento Layout — Dashboard view

**Kích hoạt:** chọn ◫ ở toolbar → `layoutType = 'bento'`, `activeView = 'bento'`

### Grid
```css
.bento { grid-template-columns: repeat(6, 1fr); gap: 14px; }
```

### Các tile

| Tile class | Span | Nội dung |
|---|---|---|
| `.bento-hero` | `1/-1`, row span 2 | Giá đề xuất lớn, gradient tím→đỏ, animation pulse |
| `.bento-metric` | span 2 | Metric card: CPSX / LN% / DT / Trọng lượng / ... |
| `.bento-structure` | span 3, row span 2 | Cấu trúc lớp (colored blocks) + thông số |
| `.bento-donut` | span 3, row span 2 | SVG donut chart phân tỉ lệ chi phí |
| `.bento-breakdown` | span 3 | Bar chart ngang từng công đoạn |
| `.bento-wide` | `1/-1` | Grid key-value thông số đầy đủ |
| `.bento-cta` | `1/-1` | Nút "Chỉnh sửa" → quay về layout default |

### Bento Responsive
- `≤ 1100px`: 4 columns
- `≤ 640px`: 2 columns, hero text nhỏ lại, structure/donut/breakdown `1/-1`

### Hero tile animation
2 pseudo-elements `::before` / `::after` là hình tròn gradient, animation `bentoPulse` (scale + opacity, 6-8s infinite alternate).

---

## 11. HistoryModule & HistoryDbModule

**Files:** `src/components/HistoryView.tsx` (trong resultArea), `src/components/HistoryDbModule.tsx` (module riêng)

### HistoryView (tab trong calculator)
- List `history-item` cards, click → `loadHistoryItem(id)` → load lại form + result
- Hiện: ngày, khách hàng, cấu trúc, giá đề xuất, giá chốt (badge xanh)
- Nút xóa (icon trash)

### HistoryDbModule (module sidebar "Lịch sử tính giá")
- Search box (lọc theo tên KH / tên SP / cấu trúc)
- Filter theo trạng thái QuoteStatus (5 bước)
- Nút "LSX" xuất hiện khi đơn có `chotGia` → mở `LSXFormModal`
- `onNavigate` prop: callback khi cần điều hướng từ module này sang module khác

### QuoteStatus — 5 bước workflow
```
drafted → sent → pending_approval → approved → completed
```
- Mỗi trạng thái có màu + label riêng (từ `QUOTE_STATUS_CONFIG`)
- Chỉ tiến tới, không có "từ chối" hay "quay lại"
- Nút "LSX" chỉ hiện ở trạng thái `approved`

---

## 12. QuotationModule

**File:** `src/components/QuotationModule.tsx` (~25 KB)

- Danh sách báo giá dạng bảng với filter, sort, search
- Export PDF/Print quote
- Quản lý trạng thái theo workflow 5 bước
- Hiện theo `role` prop — Sale không thấy tất cả action của Admin

---

## 13. LSXFormModal & ProductionOrderModule

**Files:** `src/components/LSXFormModal.tsx`, `src/components/ProductionOrderModule.tsx`

### LSXFormModal
- Modal full-screen với form điền tay (~50 trường)
- Phân nhánh layout theo `productType`:
  - **Màng:** Máy IN → Máy CHIA
  - **Túi:** Máy IN → Máy GHÉP → Máy CHIA → Máy LÀM TÚI
- 2 nút submit: "Lưu & Xuất PDF" / "Lưu & Xuất DOCX"
- Auto-fill một số trường từ snapshot báo giá (khổ, bước cắt, cấu trúc, ...)

### ProductionOrderModule
- Role: admin + purchase
- Danh sách LSX, filter theo trạng thái (`LSXStatus`)
- Đổi trạng thái: `created → in_production → completed / cancelled`
- Re-export PDF/DOCX

---

## 14. ConfigPage — Bảng định mức

**File:** `src/components/ConfigPage.tsx` (~26 KB)

### Layout
```
.config-page
└── .config-page-inner
      ├── .config-page-header (gradient banner)
      └── .config-content (max-width: 960px)
            ├── Bảng vật liệu (config-table)
            ├── Hằng số CPSX (config-cpsx-grid)
            ├── Bảng phế hao (in/ghép/cắt)
            ├── Bảng colorSetup (mỗi màu)
            └── Bảng lợi nhuận (profitTable)
```

### `config-table` input behavior
- Cell edit: `cfg-input` (width 110px, text-align right)
- Khi giá trị thay đổi so với gốc: class `changed` → viền cam, nền vàng nhạt
- Persist: debounce 800ms → PUT API

### config-cpsx-grid
- Auto-fill columns theo viewport
- Input lớn hơn (0.95rem, padding 8px 12px)

### HTML class khi ở ConfigPage
`in-config-page` được add → tắt `overflow: hidden` → scroll tự do toàn trang

---

## 15. CustomerModule & SellerModule

**Files:** `src/components/CustomerModule.tsx` (~30 KB), `src/components/SellerModule.tsx` (~13 KB)

### CustomerModule (CRM)
- Danh sách khách hàng, tìm kiếm, thêm/sửa/xóa
- Filter theo seller (sale chỉ thấy khách của mình)
- Role-aware: `role` + `currentSellerId` props

### SellerModule
- Báo cáo nhân sự / sale performance
- Chỉ admin thấy (filter menu)

---

## 16. UserManagementModule

**File:** `src/components/UserManagementModule.tsx` (~22 KB)

- CRUD tài khoản (username, displayName, role, active)
- Đổi mật khẩu
- Chỉ Admin thấy

---

## 17. Component dùng chung

### Buttons (`.btn`)

| Class | Kiểu | Dùng cho |
|---|---|---|
| `.btn-primary` | Gradient accent, full-width, shadow | "Tính Giá", "Lưu" chính |
| `.btn-outline` | Transparent + border | "Reset", "Copy", "In", "Xuất" |
| `.btn-danger` | Đỏ nhạt | "Xóa", "Tạo mới (không lưu)" |
| `.btn-green` | Xanh solid | "Chốt giá", confirm tích cực |
| `.btn-sm` | Nhỏ hơn (padding 5px 12px) | Toolbar, inline actions |

### Badges (`.badge`)
| Class | Màu | Dùng |
|---|---|---|
| `.badge-green` | Xanh | Đã chốt, completed |
| `.badge-orange` | Cam | Pending, warning |
| `.badge-red` | Đỏ | Cancelled, lỗi |

### Toast
- Container: `position: fixed; top: 70px; right: 20px; z-index: 9999`
- Auto-disappear: 4s (clickable: 5s)
- Types: `toast-success`, `toast-error`, `toast-info`, `toast-clickable`
- Animation: slide in từ phải, fade out

### Tabs (`.tabs`)
- Horizontal tab bar, segmented button style
- Active: background accent, white text, shadow

### Option Group (`.option-group`)
- Segmented buttons liền nhau (no gap)
- Dùng cho các lựa chọn loại trừ nhau (không dùng radio/select)
- Active: accent background
- Separator 1px giữa các item (ẩn khi active)

### Search box (`.search-box`)
- Icon 🔍 là `::before` pseudo-element (absolute, left: 12px)
- Padding-left: 38px để tránh chữ đè icon

### Empty state (`.empty-state`)
- Icon lớn (2.5rem emoji) + text mô tả
- Dùng khi list/table rỗng

### Info box (`.info-box`)
- Cyan nhạt, border trái cyan
- Dùng cho ghi chú/hướng dẫn

---

## 18. Responsive & Mobile

### Breakpoints

| Breakpoint | Hành vi |
|---|---|
| `> 768px` | Desktop: Sidebar cố định, toolbar hiện, 2-column grid |
| `≤ 1100px` | Grid 1 cột (stacked tự động), toolbar ẩn, tabs wrap |
| `≤ 768px` | Mobile: Sidebar → FAB, font nhỏ hơn |
| `≤ 640px` | Mobile nhỏ: font 13px, form-row → 1 cột, stat-grid 2 cột |

### MobileFloatingMenu (FAB)
- Button tròn cố định góc dưới phải (`.lts-fab-trigger`)
- Click → hiện popup (`.lts-fab-popup`) với danh sách module + role switcher
- Backdrop click → đóng
- Active module: hiện icon + label ngắn trên FAB

### Các thành phần ẩn ở mobile
- Toolbar layout picker, density picker
- Nút "In" và "Xuất" trong TopHeader
- TOC (Table of Contents) của ManagerView

### Form responsive
- `form-row` (2 cột) → 1 cột ở `≤ 640px`
- `form-row-3` (3 cột) → 1 cột ở `≤ 640px`
- `chot-gia-row` (flex row) → column ở `≤ 640px`

---

## 19. Theme — Sáng / Tối

### Cơ chế
1. State `theme` trong Zustand store (`'light' | 'dark'`)
2. `AppShell` set `document.documentElement.setAttribute('data-theme', theme)`
3. CSS selector `[data-theme="dark"]` override tất cả variables
4. Transition: `background 0.3s, color 0.3s` trên `body`

### Lưu ý dark mode
- Sidebar KHÔNG dùng CSS variables cho background → dùng hardcode `#0f172a` / `#080e1a` (dark luôn, cả 2 theme)
- Gradient (logo, price hero, btn-primary): light dùng `#4f46e5→#0891b2`, dark dùng `#818cf8→#22d3ee`
- Bento hero: dark có gradient riêng (purple đậm hơn)
- `mic-adjust` box: nền và border thay đổi

---

## 20. Density — Mật độ hiển thị

### Cơ chế
1. State `density` trong Zustand store (`'compact' | 'comfortable' | 'spacious'`)
2. `AppShell` set `document.documentElement.setAttribute('data-density', density)`
3. CSS selector `[data-density="compact"]` / `[data-density="spacious"]` override

### Compact (S)
- `form-group` margin: 8px (vs default 12px)
- Input padding: 7px 10px, font 0.82rem
- Card padding: 14px
- Price hero: 20px padding, 2.2rem font

### Spacious (L)
- `form-group` margin: 18px
- Input padding: 12px 16px, font 0.92rem
- Card padding: 28px
- Price hero: 36px padding, 3.2rem font

---

## 21. Print mode

```css
@media print {
  body: white background, black text
  ẩn: header, .btn, toast, #inputCard, auto-calc-badge, quick-actions
  .main-grid: display block (không 2 cột)
  .card: break-inside: avoid, no shadow
  .panel: display block (hiện tất cả panel)
  .price-hero: nền xám, text fill đen
  collapsible: max-height none, opacity 1 (hiện tất cả)
  collapse arrow: ẩn
}
```

---

## 22. Các pattern & bẫy UI

### 22.1. `data-*` attributes trên `<html>` — nguồn state CSS

```
html[data-theme]   = 'light' | 'dark'
html[data-layout]  = 'default' | 'stacked' | 'wide' | 'bento'
html[data-density] = 'compact' | 'comfortable' | 'spacious'
html.in-config-page  (class, không phải attribute)
html.in-crm-page     (class)
```
> Tất cả được set trong `AppShell` khi store state thay đổi.  
> Đây là "bridge" từ React state sang CSS — không dùng inline style hay styled-components.

### 22.2. Collapsible animation — dùng `max-height` không dùng `height`

Dùng `max-height: 0 ↔ large_value` vì `height: auto` không animate được.  
Nhược điểm: transition không đều (nhanh ban đầu, chậm dần) — chấp nhận được.  
`max-height: 2000px` (advanced section) / `9999px` (result cards) — đủ lớn cho mọi nội dung.

### 22.3. `FormattedNumberInput` — không dùng `type="number"`

Dùng `type="text"` để kiểm soát format dấu chấm ngàn VN.  
`type="number"` không cho phép tùy chỉnh separator.  
Khi focus → raw value, khi blur → formatted.

### 22.4. Layers cascade — xóa layer trên xóa tất cả bên dưới

```typescript
if (!val) {
  if (layerKey === 'layer1Id') { partial.layer2Id = null; layer3Id = null; ... }
  if (layerKey === 'layer2Id') { partial.layer3Id = null; layer4Id = null; ... }
  ...
}
```
> UX đảm bảo không có "lỗ hổng" trong chuỗi lớp (ví dụ: có lớp 1, lớp 3 nhưng không có lớp 2).

### 22.5. `CollapsibleCard` reset về đóng khi `resetKey` đổi

```typescript
React.useEffect(() => { setOpen(false); }, [resetKey]);
```
> Mỗi lần tính giá mới → tất cả card trong ManagerView đóng lại → người dùng phải mở từng section cần xem. Đây là behavior có chủ đích (tránh overwhelm).

### 22.6. `hasNhu` / `hasMo` — trường ẩn không khai báo trong interface

Được dùng với `(input as any).hasNhu` — nghĩa là tồn tại trong runtime object nhưng không có trong `CalculateInput` TypeScript interface.  
Nếu refactor → phải thêm 2 trường này vào interface.

### 22.7. Sidebar dùng hardcode color, không dùng CSS variable

Background sidebar (`#0f172a`, `#080e1a`) không chịu ảnh hưởng của `data-theme` → sidebar luôn tối bất kể theme.  
Đây là design decision có chủ đích (sidebar tối tương phản với content area sáng/tối).

### 22.8. Module routing dùng conditional render, không dùng Next.js routing

Tất cả module mount/unmount khi `activeModule` thay đổi.  
Ưu điểm: không cần URL routing, đơn giản.  
Nhược điểm: không có browser back/forward, không shareable URL per module.

### 22.9. `OverridableCell` — revert khi nhập quá gần gốc

```typescript
if (Math.abs(parsed - sourceVal) < 0.001) onSet(rowKey, field, undefined); // revert
```
> Nếu sale nhập đúng giá trị gốc → cell tự revert về "chưa override" (không tô màu cam).

### 22.10. Print — InputCard và toolbar ẩn hoàn toàn

`#inputCard` bị `display: none !important` khi in.  
Chỉ result panel được in.  
Tất cả collapsible được force-open (`max-height: none !important`).

### 22.11. Export .txt dùng BOM UTF-8

`'\ufeff' + text` — BOM đảm bảo Excel/Notepad đọc đúng tiếng Việt khi mở file.

### 22.12. Auto-calc badge — UX feedback realtime

Badge xanh "Tự động tính khi thay đổi" + pulse dot ở đầu InputCard.  
Không dùng loading spinner vì tính toán đồng bộ (synchronous) trong store.

---

*Tài liệu này cần cập nhật mỗi khi thêm component mới, thay đổi CSS system, hoặc thêm layout mode.*
