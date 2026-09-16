# Design: Cột "Độ dày (mic)" trong các bảng đặc tả

**Ngày:** 2026-09-16 · **Trạng thái:** Đã duyệt (user)

## Mục tiêu

Sale/Admin thấy được và điều chỉnh được độ dày vật liệu ngay trong các bảng đặc tả; độ dày
tự cập nhật khi đổi vật liệu; chỉ vật liệu cho phép (`adjustableMic`) mới sửa được.

## Bối cảnh (đã khảo sát code)

- 2 bảng ghi đè Sale/Admin: `BangDacTaNangCaoGhiDe` (nâng cao, ManHinhQuanLy.tsx:680) và
  `BangGhiDe` (thường, ManHinhQuanLy.tsx:409) — không có cột độ dày.
- Đổi vật liệu (`OChonVatLieuDong`/`OChonVatLieuChiTiet`, ManHinhQuanLy.tsx:270-373) chỉ set
  `materialId`/`mat`/`matPrice`/`rawMatPrice` — độ dày không hiển thị, không ghi đè được.
- `adjustableMic` đã có trên `Material` (types.ts:21) → engine `doiDuocMic` (engine.ts:109).
  Chỉ 5 vật liệu LLDPE có `adjustableMic: true`.
- Pattern tính lại giá đã có: `tinhMatPriceTuRaw` (ManHinhQuanLy.tsx:449) —
  `matPrice = rawMatPrice × thickness × density / 1000`.
- Form đã có pattern reset mic khi đổi VL: `xuLyDoiLop` (TheNhapLieu.tsx:343).

## Quyết định thiết kế (Phương án A)

`doDay` là **field ghi đè cấp UI**, matPrice tự tính lại. KHÔNG đụng engine
`@lts/bang-tinh-gia`; không đổi tổng độ dày cấu trúc hiển thị trên form.

### 1. Data model — `apps/web/src/lib/types.ts`

- `OverrideFields.doDay?: number` (mic)
- `detailOverrides[number].doDay?: number`
- Optional → tương thích ngược, tự persist qua pipeline ghi đè hiện có (history, sync server, audit).

### 2. Cell `ODoDay` (component mới trong ManHinhQuanLy.tsx)

- Hiển thị: `doDay ghi đè ?? thickness của vật liệu hiệu lực` → tự nhảy khi đổi VL.
- Cho edit (✎) khi: `duocSua` ∧ VL hiệu lực `adjustableMic: true` ∧ VL không có `pricePerM2`.
- Xác nhận edit:
  - set `doDay` (row hoặc detail tùy `chiTietIndex`)
  - tính lại `matPrice = rawMatPriceHiệnLuc × doDay × density / 1000`
  - xóa `doDay` (về mặc định) → matPrice trả về giá trị suy từ độ dày mặc định,
    trừ khi matPrice đang là ghi đè tay (không khớp giá trị suy từ doDay cũ) thì giữ nguyên.
- Khác gốc → class `override-changed` + title "Gốc: X mic".

### 3. Đổi vật liệu — xóa ghi đè độ dày

`OChonVatLieuDong` / `OChonVatLieuChiTiet`: cả nhánh reset lẫn nhánh chọn VL mới đều
xóa `doDay` (đúng pattern `xuLyDoiLop`).

### 4. Các bảng chạm

| Bảng | Vị trí cột | Ghi đè |
|---|---|---|
| `BangDacTaNangCaoGhiDe` — nâng cao Sale/Admin | sau "Vật liệu" | ✅ theo quyền |
| `BangGhiDe` — thường Sale/Admin | sau "Vật liệu" | ✅ theo quyền (colspan tổng +1) |
| `BangDacTaNangCao` — đặc tả hiển thị | sau "Vật liệu" | read-only |
| Xuất A4/DOCX nâng cao `buildDacTaNangCaoHtml` | sau "Vật liệu" | hiển thị giá trị hiệu lực |
| Xuất A4 thường `buildCPSXTable` + `buildOverrideTable` | sau "Vật liệu" | hiển thị giá trị hiệu lực |

### 5. Hành vi theo nhóm vật liệu (đã duyệt với user — bản sửa 2, 2026-09-16)

**Bản sửa 2:** ô Độ dày KHÔNG chỉ read-only cho VL không phải LLDPE — chia 3 dạng nhập:

| Dạng | Áp dụng | UI | Khi thay đổi |
|---|---|---|---|
| 1. Nhập liệu ✎ | LLDPE (`adjustableMic: true`) | Ô số tự do | Ghi đè `doDay` + matPrice tự tính lại |
| 2. Dropdown ▾ | VL có biến thể cùng nhóm khác độ dày (BOPP, BOPP HS, Matt OPP, CPP, MCPP, PET MATTE) | `<select>` các độ dày của nhóm | Chọn → đổi sang biến thể VL đó qua `apDungVatLieuGhiDe` (matPrice/giá/kg tự tính lại, xóa doDay) |
| 3. Read-only | VL đơn lẻ không biến thể (PET 12, PA×4, MPET, AL, RCPP 70) | Số chờ | Không đổi được |

- Helper dùng chung `apDungVatLieuGhiDe` (ManHinhQuanLy.tsx): gom logic đổi VL của
  `OChonVatLieuDong`/`OChonVatLieuChiTiet` — dropdown Độ dày gọi lại với biến thể được chọn.
- Sửa → chỉ giá đổi (CPVL → tổng → giá đề xuất → chênh lệch); các cột mét + tổng độ dày
  cấu trúc giữ nguyên.
- Đổi VL qua dropdown Vật liệu → cột Độ dày tự nhảy theo, ghi đè doDay bị xóa.

### 6. Audit — `override-display.ts`

`FIELD_LABELS` thêm `doDay: 'Độ dày (mic)'`; `countOverrideChanges` tự đếm field mới.
Mobile labels (`technical-table-mobile-labels.ts`) thêm `doDay: 'Dày'`.

## Xác minh

`pnpm type-check` + `pnpm lint` (không có bước test theo quy định dự án).
