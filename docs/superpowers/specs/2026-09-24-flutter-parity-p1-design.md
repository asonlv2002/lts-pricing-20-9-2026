# Spec: Flutter ↔ Web parity — P1 (nhập liệu 3 chế độ)

Ngày: 2026-09-24 · Branch: `default` · Trạng thái: ĐANG TRIỂN KHAI

## 1. Mục tiêu

Form nhập liệu Flutter nhập được **y như web** cho cả 3 chế độ tính giá (Nội bộ / Gia công ngoài / Thương mại), và engine trả số khớp web khi cùng input + cùng bộ config.

Đây là **P1** trong chuỗi 5 phase đồng bộ Flutter ↔ web:

| Phase | Nội dung |
|-------|----------|
| **P1** | Bug nền + form Nội bộ đủ field + Gia công ngoài + Thương mại |
| P2 | Config versioning (service POST price-config + màn phiên bản cấu hình) |
| P3 | Port lib CPSX nâng cao + dac-ta-nang-cao + manager-calculation vào engine-entry |
| P4 | Màn cấu hình CPSX nâng cao + phân quyền EDIT/REVIEW |
| P5 | Tab nâng cao result UI (bảng đặc tả + ghi đè Sale/Admin + MOQ) |

## 2. Cam kết parity (phạm vi)

**ĐẢM BẢO (P1):** với cùng `CalculateInput` + cùng `materials/constants/profitTable`, các case thuộc 3 chế độ ra số **khớp web bit-for-bit** — engine là JS thuần IEEE-754 double, QuickJS ≡ V8.

Case verify:
1. Túi nội bộ nhiều lớp
2. Màng in (mangIn)
3. Thương mại form + mô tả
4. Gia công ngoài (nhiều công đoạn)

**KHÔNG ĐẢM BẢO (để phase sau, đã thống nhất):**

| # | Gap | Phase xử lý |
|---|-----|-------------|
| 1 | Nguồn config: web lấy từ BE (F5 bootstrap); Flutter dùng JSON đóng băng trong APK + localStorage | P2 |
| 2 | Web mặc định là tab **NÂNG CAO** (rule 13/08/2026) — cùng input web ra giá từ bảng đặc tả, Flutter ra `tinhGiaWeb` | P3–P5 |
| 3 | `smallWidthPrices` (bảng giá khổ nhỏ): engine có dùng (`vat-lieu.ts:layGiaVatLieuTheoKho`), Flutter không truyền | ngoài scope |
| 4 | Adapter `engine-entry.ts` là bản fork copy tay từ `engine.ts` — web sửa mới thì Flutter không tự theo | rủi ro thường trực |
| 5 | Override bảng 2&3 / chốt giá / phân bổ công ty | P5 / ngoài scope |
| 6 | UI layout mobile-first, không giống pixel web | chấp nhận |
| 7 | Lịch sử / khách hàng: web đồng bộ BE, Flutter localStorage | ngoài scope |

## 3. Phạm vi thay đổi

### Giai đoạn 1 — Nền tảng input & store

**B1. `lib/engine/models.dart` — `CalculateInput.defaults()`**

Bổ sung đủ key theo `apps/web/src/store/helpers.ts:51` (`dauVaoMacDinh`):

```
pricingMode:'internal', commercialMode:'form', commercialPurchasePrice:0,
commercialProfitValue:0, commercialProfitUnit:'percent', commercialDescription:'',
commercialUnitKind:'tui', commercialUnitLabel:'', commercialExtraFee:0,
commercialUnitWeight:0, outsource:null,
printFilmCustomerGroup:'normal', firstRun:false,
filmQuantityUnit:'m2', filmInputQuantity:0,
hasDivide:false, originalWidthMm:0, divideWidthMm:0, divideElements:1,
selectedPrintSurchargeKeys:[], hasNhu:false, hasMo:false,
handleOptionKey:null, boxOptionKey:null, boxWeight:0,
layer2AltId:null, layer2Lengths:null, layer2FrontPart:'main',
layer2PairingMode:'bottom_to_bottom', micOverrides:{}, multiStructureLayers:null,
```

Sửa `bagType:'phang'` → `''` (web default rỗng; 'phang' không có trong option Flutter).

**B2. `lib/store/app_state.dart` — port logic `setInput`**

Thêm `_dongBoInput(Map next)` gọi trong `updateInput`/`setInput`, mirror `apps/web/src/store/slices/calculation.ts:148-270`:

- `numImages` → round ≥1
- `spreadWidth|numImages` → `cylLength = max(0.7, sw*n+0.1)` (round 3)
- `cutStep` → `cylCircum = cutStep*N` (N nhỏ nhất sao cho ≥0.4)
- `hasDivide` / `divideElements` / `spreadWidth` / `numImages` → `divideWidthMm = round(sw*1000*n/pt)`
- màng + `filmInputQuantity|filmQuantityUnit|spreadWidth|productType` → `quantity` = m² hoặc `sl*sw`
- `layer2Id=null` → reset `layer2AltId/layer2Lengths/layer2FrontPart/layer2PairingMode`
- `mangIn` → `coverageRatio=1`, clear layer2..5 + alt
- `cylType` → `cylUnitPrice` theo A/B/custom (đọc `constants`)
- weight zipper/tape/handle (theo `handleOptionKey`) + `boxWeight` (theo `boxOptionKey`)
- `metallicSurcharge = tinhPhuPhiIn(input, constants)` (nhu + mo + `customPrintSurcharges` chọn)
- Giữ `dongBoCotLoiNhuan` **KHÔNG port** — `docs/so-sanh-flutter-vs-web.md` mục B xác minh engine tự chọn cột LN, không gây lệch số.

**B3. `lib/store/app_state.dart` — reset giữ loại hình**

Thêm `resetInputGiuLoaiHinh()` mirror `loaiHinhGiuLai` (`calculation.ts:119`): giữ `pricingMode` + (`commercialMode` nếu commercial, `outsource` rỗng nếu outsource), còn lại về default.

### Giai đoạn 2 — Engine adapter (`scripts/engine-entry.ts`)

**B4.** Port `mapPricingModeEnToVn` + `mapOutsourceEnToVn` từ `apps/web/src/lib/outsource-map.ts`; thêm `cheDoTinhGia` / `giaCongNgoai` vào `toDauVao` (mirror `doiSangDauVao` `engine.ts:279-280`). Cập nhật `interface CalculateInput` trong entry.

**B5.** Port `tinhGiaThuongMai` (`engine.ts:464`) + `synthesizeResultFromCommercial` (`engine.ts:566`) + `tinhDonGiaThuongMaiHieuLuc` (`engine.ts:527`).
- Expose `LTS.tinhGiaThuongMai(inputJson, constantsJson)`.
- `calculate()`: `commercial` + `description` → trả `synthesizeResultFromCommercial` (mirror `tinhBaoGia` `manager-calculation.ts:53`); `commercial` form → zero bảng LN (mirror `engine.ts:419`).

**B6.** Xác nhận `toResult` đã có `gc*` (port 15/09) và nhánh GC chạy.

### Giai đoạn 3 — Tách file form

**B7.** Tạo `lib/screens/tinh_gia/`:
- `tinh_gia_screen.dart` — khung: mode selector + pill nav + result panel
- `form_noi_bo.dart` — SectionCard hiện tại + field mới
- `form_thuong_mai.dart` — mới
- `lib/widgets/panel_gia_cong_ngoai.dart` — mới

Giữ nguyên `_ResultPanel`, `_AdvancedSection`, `_CommissionRow`, `_StructurePreview`, `_LayerPickerRow` — chuyển sang file phù hợp.

### Giai đoạn 4 — Form Nội bộ field thiếu (`form_noi_bo.dart`)

- **B8.** Nhóm khách (thường/lớn) + checkbox "Sản phẩm chạy lần đầu"
- **B9.** "Có chia" + số phần tử + khổ chia (tự tính, sửa được)
- **B10.** Lớp 2 kép: nút "Thêm cấu trúc", chọn VL ngoài/giữa + chiều dài, preview bố trí, nút đảo (`layer2PairingMode`), cảnh báo tổng chiều dài ≠ khổ trải, nút "Bỏ cấu trúc phụ"
- **B11.** `material_picker.dart`: thêm chế độ chọn theo nhóm `GROUP_<nhóm>` + subselect độ dày
- **B12.** Số lượng màng: dropdown m²/mét + dòng quy đổi m²/cuộn
- **B13.** Loại túi thêm `cutSealNapKeo`
- **B14.** Đóng gói: dropdown `boxOptions` (label/giá) + SL túi/thùng + giá tự nhập + hiện tare weight
- **B15.** Phụ kiện: `handleOptions` khi bật quai
- **B16.** Trục in: `customCylTypes` từ constants
- **B17.** Công nợ: `customPaymentDays` (mirror radio web)
- **B18.** Phụ phí in: `hasNhu`/`hasMo` + `customPrintSurcharges` + `selectedPrintSurchargeKeys`

### Giai đoạn 5 — Gia công ngoài (`widgets/panel_gia_cong_ngoai.dart`)

- **B19.** Mirror `PanelGiaCongNgoai.tsx`: 7 chip công đoạn (In / Lật mặt / Ghép / Chia / Làm túi / Gắn quai / Bao PP); mỗi công đoạn form riêng (nguồn màng LTS/bên ngoài, % pha hao, PH setup, giá GC, giá mua màng, zipper/tape mode, biến thể PP); phụ phí VC/đóng gói/khác
- **B20.** Nhúng vào khung khi `pricingMode='outsource'`

### Giai đoạn 6 — Thương mại (`form_thuong_mai.dart`)

- **B21.** Dropdown loại báo giá (form/mô tả khác); nhóm Thu mua (giá mua + đơn vị + đơn vị tự nhập); Lợi nhuận (%/VND); phụ phí khác; textarea mô tả; trọng lượng/đơn vị
- **B22.** Result panel: nhánh description (card mô tả) + nhánh form (breakdown TM mirror `ManHinhQuanLy.tsx:2044-2122`)

### Giai đoạn 7 — Mode selector & result

- **B23.** `_mode` → ghi `pricingMode` / `outsource` / `commercialMode` (mirror `page.tsx:207`)
- **B24.** Bỏ nút **"Tạo BG"** (`tinh_gia_screen.dart:454-485`)
- **B25.** Result panel: nhánh GC thêm dòng VC/ĐG/phụ phí GC vào breakdown (mirror `ManHinhQuanLy.tsx:2079-2111`)

## 4. Nghiệm thu (không có bước test — luật repo)

- `pnpm build:engine` (có gate `tsc -p scripts`) — pass
- `flutter analyze` — 0 error/warning
- Đối chiếu số 4 case với web (`pnpm dev`): túi nội bộ, màng in, thương mại form, gia công ngoài
- `pnpm type-check` — không phá web

## 5. Rủi ro

1. `updateInput` Flutter gọi mỗi keychange → `_dongBoInput` phải **idempotent**, tránh vòng lặp `notifyListeners`.
2. `layer2Lengths` đơn vị: web lưu **mét**, adapter ×1000 → mm. Giữ đúng.
3. Engine `calculate` zero LN cho commercial — phải giữ để không double LN.
4. `assets/engine.bundle.js` gitignored → luôn chạy `build:engine` trước `flutter run`.

## 6. File chạm

| Việc | File |
|------|------|
| Defaults input | `apps/flutter_app/lib/engine/models.dart` |
| Store sync + reset | `apps/flutter_app/lib/store/app_state.dart` |
| Engine adapter | `apps/flutter_app/scripts/engine-entry.ts` |
| Khung form | `apps/flutter_app/lib/screens/tinh_gia/tinh_gia_screen.dart` |
| Form nội bộ | `apps/flutter_app/lib/screens/tinh_gia/form_noi_bo.dart` |
| Form thương mại | `apps/flutter_app/lib/screens/tinh_gia/form_thuong_mai.dart` |
| Panel gia công | `apps/flutter_app/lib/widgets/panel_gia_cong_ngoai.dart` |
| Chọn NVL theo nhóm | `apps/flutter_app/lib/widgets/material_picker.dart` |
| Nguồn tham chiếu | `apps/web/src/store/helpers.ts`, `apps/web/src/store/slices/calculation.ts`, `apps/web/src/lib/{engine,outsource-map}.ts`, `apps/web/src/components/{TheNhapLieu,PanelGiaCongNgoai,ManHinhQuanLy}.tsx` |
