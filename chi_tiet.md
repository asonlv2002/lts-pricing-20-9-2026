# Chi Tiết: PhanMemBaoBi (LTS Pricing)

## 1. Tổng Quan

**Tên project:** `lts-pricing` / PhanMemBaoBi
**Phiên bản:** 0.1.0
**Ngôn ngữ giao diện:** Tiếng Việt
**Trạng thái:** Đang phát triển tích cực — frontend gần hoàn chỉnh, chưa có backend

Đây là hệ thống quản lý báo giá & tính giá thành sản phẩm túi bao bì nhựa cho **Công ty CP Lai Trường Sơn (LTS)**. Hệ thống cho phép nhân viên nhập thông số kỹ thuật của túi (cấu trúc màng, kích thước, số màu in, phụ kiện...) và tự động tính ra chi phí sản xuất, lợi nhuận, và giá bán đề xuất.

---

## 2. Công Nghệ Sử Dụng

| Lớp | Công nghệ | Phiên bản |
|-----|-----------|-----------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Library | React | 19.2.4 |
| Ngôn ngữ | TypeScript | 5.x |
| Styling | Tailwind CSS + PostCSS | 4.x |
| State Management | Zustand | 5.0.12 |
| Icons | Lucide React | 1.0.1 |
| Utilities | clsx, tailwind-merge | Latest |

> **Lưu ý:** Next.js 16 có breaking changes so với các phiên bản phổ biến trước đó. Cần đọc docs tại `node_modules/next/dist/docs/` trước khi viết code.

---

## 3. Cấu Trúc Thư Mục

```
PhanMemBaoBi/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (fonts, metadata)
│   │   ├── page.tsx                # Trang chính (client component)
│   │   ├── globals.css             # Styles toàn cục + CSS variables + Tailwind
│   │   ├── customers/              # Route placeholder
│   │   ├── dashboard/
│   │   ├── production/
│   │   ├── quotes/
│   │   ├── settings/
│   │   └── users/
│   │
│   ├── components/                 # React Components
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Layout chính (sidebar, topbar, điều hướng)
│   │   ├── InputCard.tsx           # Form nhập thông số sản phẩm
│   │   ├── ManagerView.tsx         # Giao diện kết quả tính giá (Kinh doanh)
│   │   ├── TechView.tsx            # Giao diện kỹ thuật (định mức vật liệu)
│   │   ├── HistoryView.tsx         # Lịch sử tính giá
│   │   ├── ConfigPage.tsx          # Cấu hình vật liệu & hằng số sản xuất
│   │   ├── CustomerModule.tsx      # CRM - Quản lý khách hàng
│   │   ├── QuotationModule.tsx     # Danh sách & quản lý báo giá
│   │   ├── SellerModule.tsx        # Báo cáo seller/nhân viên
│   │   └── Header.tsx              # Header component
│   │
│   ├── lib/                        # Logic nghiệp vụ cốt lõi
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── engine.ts               # Thuật toán tính giá (244 dòng)
│   │   └── data.ts                 # Dữ liệu mặc định (vật liệu, hằng số, bảng lợi nhuận)
│   │
│   └── store/
│       └── calculatorStore.ts      # Zustand store (state toàn cục)
│
├── tom_tat_1.md
├── chi_tiet_1.md
├── frontend_tasks.md               # Roadmap phát triển frontend (tiếng Việt)
├── CLAUDE.md / AGENTS.md           # Hướng dẫn cho AI agents
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

---

## 4. Tính Năng Chính

### 4.1. Máy Tính Giá Thành (`InputCard.tsx` + `engine.ts`)

Người dùng nhập các thông số:
- **Thông tin sản phẩm**: Tên KH, tên SP, loại sản phẩm, loại túi, loại màng
- **Cấu trúc màng**: Tối đa 5 lớp (chọn vật liệu từ database)
- **Kích thước**: Độ trải rộng × bước cắt (đơn vị: mét)
- **In ấn**: Số màu, số hình, chiều trục in
- **Phụ kiện**: Zipper, băng keo, quai xách
- **Tài chính**: Số ngày thanh toán, lãi suất, hoa hồng
- **Vận chuyển**: Km, giá/km

Hệ thống tự động tính:
- Chi phí vật liệu từng lớp (theo GSM + giá/kg)
- Chi phí cắt (với hệ số waste %)
- Chi phí in (setup + mực + nhân công)
- Chi phí ghép màng (keo + nhân công)
- Chi phí phụ kiện & đóng gói
- Lợi nhuận theo bảng phân cấp 12 mức doanh thu
- Giá bán đề xuất cuối cùng

### 4.2. Ba Giao Diện Kết Quả

| Giao diện | Dành cho | Nội dung |
|-----------|----------|----------|
| **ManagerView** | Kinh doanh / Admin | Bảng giá đầy đủ, lợi nhuận, "chốt giá" |
| **TechView** | Sản xuất / Kỹ thuật | Định mức vật liệu, thông số in/cắt |
| **HistoryView** | Tất cả | 50 lượt tính gần nhất, có thể tải lại |

### 4.3. Các Module Nghiệp Vụ

- **Báo giá** (`QuotationModule`): Danh sách báo giá, lọc theo trạng thái (nháp, chờ, đã gửi, hoàn thành)
- **Khách hàng** (`CustomerModule`): CRM cơ bản — thêm/sửa/xóa, tìm kiếm
- **Seller** (`SellerModule`): Báo cáo hiệu suất nhân viên, hoa hồng
- **Cấu hình** (`ConfigPage`): Chỉnh giá vật liệu, hằng số sản xuất, bảng lợi nhuận

### 4.4. Phân Quyền (RBAC)

| Module | Admin | Kinh doanh | Sản xuất |
|--------|-------|------------|----------|
| Tính giá | ✅ | ✅ | ✅ |
| Báo giá | ✅ | ✅ | ❌ |
| Lịch sử | ✅ | ✅ | ❌ |
| Định mức | ✅ | ❌ | ✅ |
| Khách hàng | ✅ | ✅ | ❌ |
| Seller | ✅ | ❌ | ❌ |
| Cài đặt | ✅ | ❌ | ❌ |

---

## 5. State Management

**Zustand store** (`calculatorStore.ts`) quản lý toàn bộ state:

- **Input**: 20+ trường thông số sản phẩm
- **Materials**: 18+ vật liệu được cấu hình sẵn
- **Constants**: 20+ hằng số sản xuất
- **ProfitTable**: Bảng lợi nhuận 12 mức
- **Result**: 155+ trường kết quả tính toán
- **UI State**: view, layout, density, theme, history

**LocalStorage Persistence:**
- `lts_ui_prefs` — Tùy chỉnh giao diện
- `lts_history` — Lịch sử tính giá (JSON)
- `lts_material_config` — Cấu hình vật liệu/hằng số tùy chỉnh

---

## 6. Database Vật Liệu (18 Vật Liệu Được Cấu Hình Sẵn)

Các vật liệu bao gồm: PET, PA, LLDPE, LLDPE Sữa, BOPP (Bóng/Mờ), OPP, CPP, MCPP, MPET, v.v.

Mỗi vật liệu có: tên, nhóm, tỷ trọng (g/cm³), độ dày (micron), giá/kg (VNĐ).

---

## 7. Thuật Toán Tính Giá (`engine.ts`)

```
Thông số đầu vào
    ↓
Tính diện tích (túi + tổng lô)
    ↓
Chi phí ghép màng (từng lớp 2–5)
    ↓
Chi phí cắt (base + waste%)
    ↓
Chi phí in (setup màu + mực + nhân công)
    ↓
Chi phí vật liệu (từng lớp theo GSM)
    ↓
Chi phí phụ kiện (zipper, băng keo, quai, hộp)
    ↓
Tra bảng lợi nhuận (12 mức theo doanh thu)
    ↓
Chi phí bổ sung (vận chuyển, lãi vay, hoa hồng)
    ↓
Kết quả: 155 trường đầu ra
```

---

## 8. UI/UX

- **Theme**: Sáng (indigo) và Tối (navy/cyan), chuyển đổi mượt
- **Layout**: Default / Stacked / Wide / Bento (tùy chọn)
- **Density**: Compact / Comfortable / Spacious
- **Responsive**:
  - Desktop: Sidebar cố định + nội dung chính
  - Mobile: FAB menu + tabs chuyển đổi (Input ↔ Kết quả)
  - Breakpoint: 768px

---

## 9. Tình Trạng Phát Triển

### ✅ Hoàn chỉnh
- Máy tính giá thành (nhập liệu + thuật toán + hiển thị)
- Giao diện ManagerView, TechView, HistoryView
- Cấu hình vật liệu & hằng số sản xuất
- Dark mode, responsive layout, LocalStorage persistence
- Phân quyền theo vai trò (menu động)
- Lịch sử tính giá (lưu 50 lượt)

### 🟡 Đang/Cần hoàn thiện
- PDF export (hiện chỉ xuất text)
- QuotationModule, CustomerModule, SellerModule (UI sẵn, cần backend)

### ❌ Chưa có
- Backend API (Next.js API routes hoặc Node.js/Express)
- Database (PostgreSQL, MongoDB, v.v.)
- Hệ thống xác thực (login, JWT, session)
- Triển khai production (Vercel hoặc self-hosted)

---

## 10. Khởi Chạy Project

```bash
npm install          # Cài dependencies
npm run dev          # Dev server tại http://localhost:3000
npm run build        # Build production
npm start            # Chạy production build
npm run lint         # Kiểm tra linting
```
