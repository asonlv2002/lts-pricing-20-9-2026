# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Đã sửa / Known Fixes (cập nhật 2026-04-17)

> **QUAN TRỌNG:** Trước khi sửa bất kỳ công thức nào trong `src/lib/engine.ts`, PHẢI đọc `.claude/training/Train.md` — nguồn chân lý duy nhất cho mọi công thức.

### 7. Bug cutMeters không chia numImages — 2026-04-17
**Triệu chứng:** Đơn có `numImages > 1` bị đội giá ~numImages lần.

**Nguyên nhân:** `cutMeters` (chiều dài cuộn NVL) KHÔNG chia cho `numImages`, trong khi `cutWidth = spreadWidth × numImages + 0.02` đã nhân numImages → `cost = cpsx × meters × width` thừa một hệ số numImages. Bug lan sang cả ghép + in (vì chuỗi `needed_i = meters + waste` truyền xuôi).

**Fix** (`src/lib/engine.ts`):
- Túi:  `cutMeters = cutStep × quantity / numImages`
- Màng: `cutMeters = totalArea / (spreadWidth × numImages)`

**Kiểm chứng đại số:** `cutMeters × cutWidth = totalArea + lề` → khớp với nguyên lý **NVL = TP + Phi hao**.

### 6. Module Lệnh Sản Xuất (LSX) — 2026-04-13
Thêm module tạo & quản lý Lệnh Sản Xuất từ đơn hàng `approved`.

**Packages cài thêm:** `jspdf`, `html2canvas`, `docx`

**Files mới:**
- `src/lib/types.ts` — thêm `LSXStatus`, `LSX_STATUS_CONFIG`, `LSXManualFields`, `ProductionOrder`
- `src/lib/db.ts` — thêm `readProductionOrders()`, `writeProductionOrders()`, file `data/production-orders.json`
- `src/app/api/production-orders/route.ts` — GET (list), POST (create)
- `src/app/api/production-orders/[id]/route.ts` — GET, PATCH (status/manual), DELETE
- `src/store/calculatorStore.ts` — thêm `productionOrders[]`, `loadProductionOrdersFromServer`, `createProductionOrder`, `updateProductionOrder`, `deleteProductionOrder`
- `src/lib/lsxExport.ts` — `exportLSXtoPDF()` (jspdf+html2canvas) + `exportLSXtoDOCX()` (docx library)
- `src/components/LSXFormModal.tsx` — modal form điền tay, phân nhánh theo `productType` (mang / tui), 2 nút "Lưu & Xuất PDF" / "Lưu & Xuất DOCX"
- `src/components/ProductionOrderModule.tsx` — danh sách LSX, filter, đổi trạng thái, re-export

**Files sửa:**
- `src/components/HistoryModule.tsx` — thêm nút "LSX" cho các đơn có `chotGia` (giá chốt)
- `src/components/layout/AppShell.tsx` — đăng ký module `production_orders` (role: admin + purchase)

**Luồng sử dụng:**
1. Đơn hàng `approved` → Lịch sử tính giá → nút "LSX"
2. Admin điền form (máy IN / GHÉP / CHIA / LÀM TÚI tùy loại)
3. Click "Lưu & Xuất PDF" hoặc "Lưu & Xuất DOCX" → file download
4. Module "Lệnh Sản Xuất" trên sidebar → danh sách, đổi trạng thái, re-export

**Template LSX theo mẫu gốc** (QT.ISO-22-BM02 lần ban hành 02 ngày 01/03/2025):
- Header: logo công ty + ký mã hiệu/lần ban hành/ngày/số lần
- I. Thông tin sản phẩm (Khách hàng, MSP, Tên SP, Cấu trúc, Khổ, Quy cách, Số màu, SL)
- II. Màng: Máy IN → Máy CHIA
- II. Túi: Máy IN → Máy GHÉP → Máy CHIA → Máy LÀM TÚI
- Footer: Người lập / Người duyệt



### 1. Trục in — `calculatorStore.ts`
- **Công thức:** `cylLength = max(0.7, spreadWidth × numImages + 0.1)`
- Không dùng vòng lặp nhân bội số `nCalc` nữa
- Cảnh báo hiện có ở `InputCard.tsx`: < 0.7m → "dưới tối thiểu", > 1.25m → "vượt tối đa (không in được)"

### 2. Màng (productType='mang') — `engine.ts`
- `quantity` nhập vào là **m²** thẳng (không phải số cái)
- `totalArea = quantity` (không nhân thêm `bagArea`)
- Túi giữ nguyên: `totalArea = quantity × bagArea`
- Lỗi cũ nhân bagArea khiến bảng "SL theo cuộn màng" ra số sai (mấy chục ngàn m²)

### 3. Giá chốt vs giá đề xuất — `ManagerView.tsx`
- Price hero: khi đã chốt → label "Giá chốt / m²" (màu xanh lá) + dòng nhỏ "(giá đề xuất Xđ)"
- 3 ô màng → gộp còn 1 ô: Giá/cuộn + DT cuộn chung 1 ô (bỏ ô "Giá/m²" riêng)
- Stat card "Giá Bán" → đổi thành "Giá Chốt" khi đã chốt
- Section breakdown → đổi tiêu đề "đề xuất" ↔ "chốt" tùy trạng thái

### 4. Sidebar animation — `AppShell.tsx` + `globals.css`
- Bỏ inline `style={{ width }}` trên sidebar (bypass transition)
- Dùng CSS class `.lts-sidebar--collapsed` (width: 72px) thay thế
- `.lts-sidebar` CSS định nghĩa `width: 240px` mặc định + `transition: width 0.28s`
- Kết quả: sidebar animate mượt → result panel co/giãn mượt theo

### 5. Layout — result panel rộng hơn — `globals.css`
- `main-grid` default: `370px 1fr` → **`300px 1fr`** (+70px cho result)
- `main-grid` wide: `320px 1fr` → **`260px 1fr`** (+60px cho result)
- `manager-content` padding-right: `220px` → **`180px`**
- `manager-toc` width: `250px` → **`200px`**, right: `20px` → `12px`

## Test
```bash
npx tsx src/lib/engine.test.ts   # 35 test cases cho engine.ts
```

## Project Overview

**LTS Pricing** — Phần Mềm Báo Giá & Tính Giá Thành Bao Bì (Packaging Quotation & Cost Calculation Software) for Công ty CP Lai Trường Sơn. The entire UI uses Vietnamese labels and Vietnamese code comments. Currency is Vietnamese Dong (₫).

## Commands

```bash
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm start        # Run production server
npm run lint     # ESLint check
```

There are no automated tests — none are configured.

> **Note:** If `jose` module resolution fails on build, run `npm install` first.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Zustand 5 · Tailwind CSS 4 · JWT (`jose`) · JSON file persistence

The app is split between a rich client-side calculator and a thin server layer:

### Core Data Flow

1. User fills the form → Zustand store (`src/store/calculatorStore.ts`) holds all 100+ `CalculateInput` fields
2. On any input change, `engine.ts` recomputes the full `CalculateResult` synchronously on the client
3. Results render immediately; user can save to history which writes to both localStorage and the server API async (fire-and-forget)
4. On mount, the store fetches materials/constants/history from the server and overrides the local cache

### Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/engine.ts` | Core pricing calculation logic — multi-layer film structures, labor, lamination, accessories, shipping, profit margin lookup |
| `src/lib/types.ts` | All shared TypeScript interfaces (`CalculateInput`, `CalculateResult`, `HistoryItem`, `Material`, `AppUser`, etc.) |
| `src/store/calculatorStore.ts` | Single Zustand store (570 lines) — form state, results, material catalog, history, UI preferences, server sync |
| `src/lib/db.ts` | JSON file persistence with per-file write locks and atomic writes (temp file → rename). Manages 5 runtime JSON files under `/data/` |
| `src/lib/session.ts` | JWT session helpers (`createSession`, `getSession`, `deleteSession`) using `jose`, 8-hour HttpOnly cookie |
| `src/lib/data.ts` | Initial/default constants used when no server data exists |
| `src/app/page.tsx` | Main calculator entry point |
| `src/components/AppShell.tsx` | Root layout — sidebar navigation, module routing, role-based menu filtering |

### API Routes (`src/app/api/`)

- `auth/login`, `auth/logout`, `auth/me` — session management
- `config` (GET), `config/materials` (PUT), `config/constants` (PUT), `config/profit-table` (PUT)
- `history` (GET/POST), `history/[id]` (GET/PATCH/DELETE)
- `production-orders` (GET/POST), `production-orders/[id]` (GET/PATCH/DELETE)
- `users` (GET/POST), `users/[id]` (PUT/DELETE)
- `migrate` (POST) — one-time localStorage → server migration

### Data Persistence

**Seed data** (committed): `src/data/constants.json`, `src/data/materials.json`, `src/data/profitTable.json`, `src/data/mockHistory.json`

**Runtime data** (gitignored, generated on first request): `/data/history.json`, `/data/users.json`, `/data/materials.json`, `/data/constants.json`, `/data/profit-table.json`, `/data/production-orders.json`

Default credentials on first run: `admin` / `admin123`

### Roles & Permissions

Three roles — `admin`, `sale`, `purchase`. Role-based menu filtering is done client-side in `AppShell.tsx`. Server-side route protection via `getSession()` is incomplete — most API routes do not yet verify the session.

### UI Modules (in `src/components/`)

Large components, each representing a full page/tab:
- `InputCard.tsx` (28 KB) — calculator input form with 100+ fields, material layer picker
- `ManagerView.tsx` (47 KB) — results display with override table management for sales/admin
- `TechView.tsx` — technical cost breakdown
- `HistoryModule.tsx` + `HistoryView.tsx` — quotation history list, 5-step status workflow; nút "LSX" cho đơn approved
- `QuotationModule.tsx` (25 KB) — quotation generation and status management
- `ConfigPage.tsx` (26 KB) — material catalog, constants, and profit table editors
- `CustomerModule.tsx` (30 KB) — CRM
- `UserManagementModule.tsx` (22 KB) — user CRUD
- `SellerModule.tsx` (13 KB) — sales staff reporting
- `LSXFormModal.tsx` — modal form tạo Lệnh Sản Xuất (điền tay + xuất PDF/DOCX)
- `ProductionOrderModule.tsx` — danh sách LSX, filter, đổi trạng thái, re-export (role: admin + purchase)

### State Management Notes

The Zustand store debounces material/constant persistence by 800 ms. Selectors are used to minimize re-renders. UI preferences (theme: `light/dark`, layout: `default/stacked/wide/bento`, density: `compact/comfortable/spacious`) are persisted to localStorage.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### `next.config.ts`

Sets `allowedDevOrigins: ['192.168.1.10', 'localhost']` for LAN development access.
