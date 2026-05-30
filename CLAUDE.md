# CLAUDE.md

## Project Overview

**LTS Pricing** — Phần Mềm Báo Giá & Tính Giá Thành Bao Bì (Packaging Quotation & Cost Calculation Software) cho Công ty CP Lai Trường Sơn. UI hoàn toàn tiếng Việt. Tiền tệ: VND (₫).

## Monorepo Structure

```
phan-mem-bao-bi/                    pnpm 10.33 · Turborepo · Node ≥20.9
├── apps/
│   ├── web/                        Next.js 16, React 19, Zustand 5, Tailwind 4
│   ├── mobile/                     React Native 0.79 + Expo SDK 53
│   └── flutter_app/                Flutter + flutter_js (QuickJS bridge)
├── packages/
│   ├── kieu-du-lieu/               @lts/kieu-du-lieu — shared types
│   ├── hang-so/                    @lts/hang-so — constants & default data
│   └── bang-tinh-gia/              @lts/bang-tinh-gia — pricing engine
├── turbo.json
└── pnpm-workspace.yaml
```

**Dependency graph:** `kieu-du-lieu` ← `hang-so` ← `bang-tinh-gia` ← all apps

## Commands

```bash
pnpm dev              # All apps (turbo)
pnpm dev:web          # Web only — http://localhost:3000 (hoặc 3001 nếu 3000 bị chiếm)
pnpm build            # Production build
pnpm build:engine     # Bundle TS engine → Flutter assets/engine.bundle.js
pnpm test             # Tests
pnpm type-check       # TypeScript check
pnpm lint             # ESLint
```

## Architecture

### Data Flow (Web)

1. User nhập form → Zustand store (`apps/web/src/store/CuaHangTinhGia.ts`, 5 slices) giữ input
2. Mỗi thay đổi → `apps/web/src/lib/engine.ts` (adapter) gọi `@lts/bang-tinh-gia` → `KetQuaTinhGia`
3. Kết quả render ngay; lưu lịch sử vào localStorage

### Key Files

| File | Purpose |
|------|---------|
| `packages/bang-tinh-gia/src/tinh-gia.ts` | Orchestrator — gọi tất cả công đoạn |
| `packages/bang-tinh-gia/src/cong-doan-in.ts` | Chi phí in |
| `packages/bang-tinh-gia/src/cong-doan-ghep.ts` | Chi phí ghép |
| `packages/bang-tinh-gia/src/cong-doan-cat.ts` | Chi phí cắt |
| `packages/bang-tinh-gia/src/tai-chinh.ts` | Lãi vay, hoa hồng |
| `packages/bang-tinh-gia/src/loi-nhuan.ts` | Tra bảng lợi nhuận |
| `packages/bang-tinh-gia/src/toi-uu-do-day.ts` | Thuật toán tối ưu độ dày (Generate & Filter) |
| `packages/kieu-du-lieu/src/index.ts` | Types: `DauVaoTinhGia`, `KetQuaTinhGia`, `VatLieu`, `HangSo` |
| `packages/hang-so/src/du-lieu/` | JSON data mặc định (vật liệu, hằng số, bảng lợi nhuận) |
| `apps/web/src/lib/engine.ts` | Adapter: chuyển EN-schema ↔ VN-schema, gọi package |
| `apps/web/src/store/CuaHangTinhGia.ts` | Zustand store (slices: ui, calculation, history, overrides, production-orders) |
| `apps/web/src/components/TheNhapLieu.tsx` | Form nhập liệu (100+ fields) |
| `apps/web/src/components/ManHinhQuanLy.tsx` | Hiển thị kết quả, override giá |
| `apps/web/src/components/TrangCauHinh.tsx` | Cấu hình vật liệu, hằng số, bảng lợi nhuận |

### Flutter Bridge

`pnpm build:engine` → esbuild bundle `@lts/bang-tinh-gia` thành 1 file IIFE → `apps/flutter_app/assets/engine.bundle.js`. QuickJS nhận 4 JSON string (input, materials, constants, profitTable), trả result JSON.

### Roles

3 roles: `admin`, `sale`, `purchase`. Menu filtering trong `apps/web/src/components/layout/`.

## Business Rules

> **LUÔN đọc `.claude/training/Train.md` trước khi sửa bất kỳ công thức nào.** Đó là nguồn chân lý duy nhất — nếu code khác Train.md thì code sai.

### Bất biến quan trọng

- `NVL = Thành phẩm + Phi hao` — waste là CỘNG THÊM, không nhân
- `numImages` ảnh hưởng HÌNH DẠNG cuộn (rộng hơn + ngắn hơn), KHÔNG ảnh hưởng tổng diện tích
- `cutMeters` phải chia `numImages`: Túi = `cutStep × quantity / numImages`; Màng = `totalArea / (spreadWidth × numImages)`
- `quantity` cho `productType='mang'` là m² trực tiếp; cho `'tui'` là số cái (× bagArea)

### Công thức lãi vay

```
interestPerUnit = (interestBase + interestSpread) / 12 × (paymentDays / 30) × costPerUnit
```
- `interestBase` + `interestSpread`: trong constants (% / năm, dạng thập phân)
- `paymentDays`: 14 / 30 / 45 / 75 / 90

### Trục in

```
cylLength = max(0.7, spreadWidth × numImages + 0.1)    // min 0.7m, max 1.25m
```

## Conventions

- Tên file/biến tiếng Việt trong shared packages (`tinh-gia`, `DauVaoTinhGia`, `cong-doan-in`)
- Tên tiếng Anh trong `apps/web/src/lib/types.ts` (legacy — adapter bridge hai hệ)
- Path alias: `@/*` → `./src/*` (web app)
- UI text: luôn tiếng Việt
- Format số: locale `vi-VN`

## References

| Tài liệu | Nội dung |
|-----------|----------|
| `.claude/training/Train.md` | Công thức đầy đủ (SOURCE OF TRUTH) |
| `.claude/training/CongThuc.md` | Quick reference công thức |
| `.claude/training/UIUX.md` | Hướng dẫn UI/UX, design system |
| `.claude/training/notes.md` | Ghi chú: thuật toán độ dày, mobile build tips |


