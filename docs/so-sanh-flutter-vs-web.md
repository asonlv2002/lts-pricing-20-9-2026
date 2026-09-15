# Bảng đối chiếu tính năng: Flutter App vs Web

> Lập ngày 15/09/2026. Nguồn so sánh: `apps/web` (page.tsx, VoTrang menu, `lib/types.ts`, `lib/engine.ts`, 40+ components, 12 store slices) vs `apps/flutter_app` (4 tabs, 17 file dart, `scripts/engine-entry.ts`, `lib/engine/models.dart`, `lib/store/app_state.dart`).

## 0. Bối cảnh kiến trúc

- Flutter **không viết lại** công thức tính giá: `pnpm build:engine` (esbuild, `minify:false`, `target:es2020`) bundle `@lts/bang-tinh-gia` → `assets/engine.bundle.js` (IIFE) → chạy trong QuickJS (`flutter_js`), gọi `globalThis.LTS.calculate(...)`. Số học JS thuần (IEEE-754 double) nên **engine core cho kết quả bit-identical** giữa V8 và QuickJS.
- Nhưng Flutter dùng **adapter riêng** (`engine-entry.ts`, "copy nguyên" từ `apps/web/src/lib/engine.ts` — đã phân kỳ) và **data tĩnh** (`assets/data/*.json`, copy từ `/data` root lúc build). Sai lệch đến từ adapter fork + data đóng băng + bundle stale, không phải từ cơ chế build.

## A. Màn hình / luồng nghiệp vụ

| # | Tính năng | Web | Flutter | Mức độ thiếu & ảnh hưởng |
|---|-----------|-----|---------|--------------------------|
| 1 | Tính giá thường (engine `tinhGia`) | ✅ `tinhGiaWeb` | ✅ qua QuickJS bundle | Có chạy, nhưng adapter Flutter thiếu field (mục B) → một số case ra số khác web |
| 2 | **Tính giá NÂNG CAO** (tab `tao-tinh-gia-nang-cap`, bảng đặc tả kỹ thuật `BangDacTaNangCao`, giá lấy từ tổng đặc tả `tinhKetQuaNangCaoHieuLuc`, `isNangCap`) | ✅ | ❌ **Không có** | Đây là chế độ **mặc định** của web theo quy tắc 13/08/2026 → Flutter chỉ làm được bản cũ |
| 3 | **Tính giá Thương mại** (mua đi bán lại: `tinhGiaThuongMai`, form mode + mô tả tự do, LN %/VND, phụ phí khác, đơn vị tùy biến) | ✅ | ❌ Không có | Không tạo được bảng mua–bán lại trên Flutter |
| 4 | **Gia công ngoài** (`PanelGiaCongNgoai`, `cheDoTinhGia='gia_cong'`, `giaCongNgoai` → VC/đóng gói/phụ phí GC) | ✅ | ❌ Không có | Kết quả Flutter không có dòng GC nào (`gcShippingPerUnit`… không tồn tại trong `toResult`) |
| 5 | **Override giá từng công đoạn** (Bảng 2 & 3, `overrides.ts`, `OverrideRowKey` print/lam-2..5/cut/chia/matte) | ✅ | ❌ Không có | Sale/Admin không ghi đè được đơn giá VL/CPSX thủ công trên Flutter |
| 6 | Chốt giá (`chotGia`) + phân bổ công ty (`phanBoCongTy`, `donViPhanBo`) | ✅ nhập từ form | ⚠️ chỉ **lưu/hiển thị** ở Lịch sử & LSX | Không có UI nhập chốt giá/phân bổ trong form tính giá |
| 7 | **Tạo báo giá** (`ModuleBaoGia` 230KB, điều khoản `FormDieuKhoanBaoGia`, mã báo giá `quote-code`, chữ ký, PDF `BaoGiaPdfDocument`, preview) | ✅ | ❌ Không có | Flutter không tồn tại khái niệm "báo giá" độc lập — chỉ có lịch sử tính giá |
| 8 | **Duyệt báo giá bằng PIN** (`ModuleDuyetBaoGia`, `NhapPinDuyetModal`, `NhapPinXacNhanModal`) | ✅ | ❌ Không có | Không có luồng phê duyệt |
| 9 | Vòng đời quote 8 trạng thái (drafted→pending→approved→sent→rejected→cancelled→completed→expired, mapping server) | ✅ đồng bộ BE | ⚠️ `_StatusSheet` đổi status **local only** | Trạng thái Flutter không bao giờ lên server |
| 10 | **Tạo LSX** (`TaoLsxWizard` 30KB multi-bước, `LsxFormFields` 55KB, chọn báo giá+tính giá, `ModalDonLSX`) | ✅ | ⚠️ sheet đơn giản: chọn 1 history + 3 TextField | LSX Flutter chỉ là snapshot thô, thiếu trường kỹ thuật |
| 11 | LSX: danh sách + sửa (`SlidePanelLsxEdit`) + PDF (`LsxPdfDocument` 40KB) | ✅ | ⚠️ card list + đổi status + PDF tự viết | PDF LSX Flutter không theo template chuẩn của web |
| 12 | Danh sách tính giá (`ModuleDanhSachTinhGia`) | ✅ | ✅ tab Lịch sử | Flutter tương đối đủ: search, filter status, stats, swipe delete, load lại vào form |
| 13 | Lịch sử đồng bộ DB (`ModuleLichSuDB` 70KB, `BoLocNangCao`, `NutSaoChepLienKet`) | ✅ BE | ❌ chỉ `shared_preferences` + `assets/data/history.json` | **Không đồng bộ** giữa máy Sale và server |
| 14 | **Quản lý khách hàng** (`ModuleKhachHang` 171KB, import Excel, CustomerManagersPicker, guard quyền) | ✅ | ❌ Không có | Flutter chỉ có ô text "Khách hàng" tự do |
| 15 | Nhật ký thao tác / audit (`ModuleNhatKy`, `audit.ts`, 15 loại action) | ✅ | ❌ Không có | Không truy vết được ai sửa gì |
| 16 | Dashboard tổng quan (6 card: số BG đã tạo, chờ duyệt, KH mới, doanh thu ước tính…) | ✅ | ❌ Không có | — |
| 17 | **Đăng nhập / Auth** (JWT, modal đăng nhập, bắt buộc đặt PIN, đổi MK, đổi avatar, đổi chữ ký, flow đòi reset MK) | ✅ | ❌ Không có gì | Flutter **không có http/dio trong pubspec** → hoàn toàn offline |
| 18 | Phân quyền (admin/sale/purchase, `ModulePhanQuyen`, bảng phân quyền, quản lý tài khoản) | ✅ | ❌ Không có | Mọi người dùng Flutter như nhau |
| 19 | **Phiên bản cấu hình giá** (`configVersioning`, `PanelPhienBan`, `price-config-mapper`, scopes PRODUCTION / PRODUCTION_UPGRADE / MATERIALS / PROFIT, hiệu lực theo tháng, bootstrap F5 chờ auth) | ✅ BE SoT | ❌ Không có | Cấu hình Flutter là **JSON đóng băng trong APK** (mục C) |
| 20 | **CPSX nâng cao** (`CpsxNangCap*`: Điện 19KB, Lương 84KB, Thời gian 35KB, Mực 18KB, Định mức/Dung môi-keo 28KB, Gia công khai, `CpsxGiaInGhepKetQua`) | ✅ | ❌ Không có | Toàn bộ bảng chi phí sản xuất chi tiết không tồn tại trên Flutter |
| 21 | Khách hàng lớn / cột LN khách lớn (`largeCol1/largeCol2`, `nhomKhach`) | ✅ | ~~❌~~ **ĐÃ SỬA 15/09**: `ProfitRow` Dart giữ `largeCol1/largeCol2`, adapter map `cot1KhachLon/cot2KhachLon` (mục F) |

## B. Field trong form/input tính giá — web có, Flutter (form + `engine-entry.ts`) không có

| Field web (`CalculateInput`) | Ý nghĩa | Hệ quả khi thiếu trên Flutter |
|------------------------------|---------|------------------------------|
| `layer2AltId` + `layer2Lengths` + `layer2FrontPart` + `layer2PairingMode` | Lớp 2 kép (2 VL xen kẽ, kiểu ghép đáy-đáy/ngược) | Không tính được túi có lớp 2 phối 2 vật liệu |
| `multiStructureLayers` | Cấu trúc nhiều vật liệu mỗi lớp | Không hỗ trợ |
| `bangGiaKhoNho` (smallWidthPrices, `doiSangGiaKhoNho`) | Giá VL theo khổ hẹp (`nguongKhoMm`) | Túi khổ nhỏ vẫn tính giá thường → **cao hơn thực tế** |
| `printFilmCustomerGroup` + toàn bộ tham số màng in | Màng in (BOPP…) có công thức riêng (`cpMangIn`, giờ setup, tốc độ…) | ~~thiếu~~ **ĐÃ SỬA 15/09 (adapter 0.2.0)**: `toHangSo` giờ truyền đủ 12 tham số màng in + `tyLeLoiNhuanMangIn` + `nhomKhachMangIn` — see mục F |
| `hasDivide` / `originalWidthMm` / `divideWidthMm` / `divideElements` | Chia khổ cuộn | Không hỗ trợ |
| `filmQuantityUnit` ('m'/'m2') + `filmInputQuantity` | Nhập SL màng theo mét | Flutter chỉ nhập m² |
| `handleOptionKey` + `handleOptions` | Chọn loại quai (giá/khối lượng theo option) | Chỉ nhập weight thủ công |
| `boxOptionKey` + `boxWeight` + `layTrongLuongThung` | Chọn loại thùng có sẵn | Chỉ nhập giá thùng + số túi/thùng; tare weight không lấy từ option |
| `selectedPrintSurchargeKeys` | Phụ phí in (nhu/metallic dạng key) | Chỉ còn `metallicSurcharge` số thô |
| `pricingMode` / `outsource` / `commercial*` | Chế độ tính giá (mục A3/A4) | Không hỗ trợ |
| `productCode` | Mã sản phẩm | Không có |
| `totalThicknessMic` snapshot | Độ dày tổng lúc lưu (để PDF/LSX khớp về sau) | Lịch sử Flutter có thể lệch khi config đổi |
| `dongBoCotLoiNhuan` (tự chọn cột LN) | ~~lệch LN~~ **SẪY — ĐÃ XÁC MINH LẠI**: engine luôn tự chọn cột qua `chonCotLoiNhuanApDung` (tinh-gia.ts:242), `dauVao.cotLoiNhuan` bị ghi đè trong tính toán. Web chỉ sync để **hiển thị UI** → **KHÔNG gây lệch số** giữa 2 nền tảng. Không cần port. |

## C. Cấu hình (tab Cài đặt) — Flutter vs Web

| Hạng mục | Web `TrangCauHinh` (151KB) | Flutter `cau_hinh_screen` (20KB) |
|----------|---------------------------|----------------------------------|
| Vật liệu: xem/sửa giá/kg, mực, cuộn, tỉ trọng | ✅ + bảng giá khổ nhỏ + nút "Cập nhật <tên>" NVL mới + lưu phiên bản materials | ✅ cơ bản; ❌ không khổ nhỏ, ❌ không lưu phiên bản |
| Hằng số CPSX thường (lãi, phụ kiện, trục, phi hao, VC) | ✅ | ✅ (nhóm: Lãi suất, Phụ kiện, Trục in, In/Ghép/Cắt, Vận chuyển) |
| CPSX nâng cao (điện/lương/thời gian/mực/keo) | ✅ 7 tab | ❌ |
| Biên lợi nhuận: col1/col2 **+ largeCol1/largeCol2** | ✅ | ✅ từ 15/09 (pass-through largeCol; UI sửa vẫn chỉ col1/col2) |
| Phụ phí (in), lãi vay công nợ, loại quai, loại thùng | ✅ | ❌ |
| Reset mặc định | ✅ | ✅ |
| Đồng bộ BE / F5 bootstrap / xem–lịch sử phiên bản | ✅ | ❌ |

## D. Kết quả trả về — field web có, `toResult` Flutter thiếu

~~`printFilmCost`, `printFilmSetupHours` / `printFilmProductionHours` / `printFilmTotalHours` / `printFilmLaborCostPerHour`, `gcShippingPerUnit`/`gcShippingTotal`, `gcPackagingPerUnit`/`gcPackagingTotal`, `gcOtherPerUnit`/`gcOtherTotal`~~ → **ĐÃ PORT 15/09 (mục F)**. Còn thiếu: layers `material`/`materials`/`matPrice`/`chiTietVatLieu` (web resolve vật liệu từng lớp để hiển thị; Flutter chỉ có số).

## E. Rủi ro quy trình (cộng dồn làm sai lệch tăng theo thời gian)

1. ~~**Không type-check khi bundle**~~ → **ĐÃ XỬ LÝ 15/09**: `pnpm build:engine` giờ chạy `tsc -p scripts` trước khi esbuild (gate mới trong `apps/flutter_app/scripts/tsconfig.json`); bug `c.boxOptions` chưa khai báo đã được sửa.
2. ~~Bundle stale~~ → đã rebuild 15/09 (LTS.version = 0.2.0). Lưu ý: `assets/engine.bundle.js` được gitignore — **bắt buộc chạy `pnpm build:engine` trước mọi lần `flutter build`/`flutter run`**.
3. **Data đóng băng trong APK**: mọi lần đổi giá NVL/CPSX trên web+BE phải `pnpm build:engine` (tự sync `/data/*.json` → `assets/data/`) + rebuild + phát hành app mới thì Flutter mới thấy.

## F. Đã sửa trên nhánh `fix/flutter-engine-adapter-sync` (15/09/2026)

Phạm vi: **chống lệch adapter** — không thêm UI/tính năng mới, chỉ để Flutter tính ĐÚNG bằng web trong phạm vi nó nhận input. File: `apps/flutter_app/scripts/engine-entry.ts`, `apps/flutter_app/lib/engine/models.dart`, `apps/flutter_app/scripts/tsconfig.json` (mới), `apps/flutter_app/package.json`.

| # | Sửa gì | Mirror từ |
|---|--------|-----------|
| 1 | `toHangSo`: thêm 12 tham số màng in (`giaMucMangInBOPP`…`laiSuatMangIn`) + `tyLeLoiNhuanMangIn` + `loaiQuai` + lookup `handleOptionKey` | `doiSangHangSo` web engine.ts:116-173 |
| 2 | `toDongLoiNhuan`: map `cot1KhachLon/cot2KhachLon` (fallback = cot1/cot2); `ProfitRow` Dart giữ `largeCol1/largeCol2` qua fromJson/toJson/localStorage | `doiSangDongLoiNhuan` engine.ts:176-184 |
| 3 | `toDauVao`: thêm `nhomKhachMangIn`, `idLop2Phu`, `chieuDaiLop2` (×1000), `matTruocLop2`, `kieuGhepLop2`, `khoiLuongThuung`, `cauTrucNhieuVatLieu`; `ngayThanhToan` dùng `?? 30` thay `\|\| 30` | `doiSangDauVao` engine.ts:232-281 |
| 4 | `calculate()`: `layTrongLuongThung` (boxWeight resolve từ `boxOptionKey`) chạy trước khi tính | engine.ts:407-410 |
| 5 | `toResult`: thêm `printFilm*` (5 field) + `gc*` (6 field) | engine.ts:312-316, 339-344 |
| 6 | `lookupProfit`: tham số `nhomKhach` + cột large; `PROFIT_DEFAULT` import trực tiếp `data/profitTable.json` (hết hardcoded lệch 0.11 vs 0.1) | `traLoiNhuanTheoBang` engine.ts:12-24 |
| 7 | Khai báo đủ `boxOptions/handleOptions/printFilm*` trong interface `AppConstants` (sửa bug latent `c.boxOptions` chưa type) | — |
| 8 | Gate `tsc --noEmit` trong `build:engine`; `LTS.version` → `0.2.0` | — |

**Không port** (cần UI/Dart data, nằm ngoài phạm vi chống lệch): `bangGiaKhoNho` (root `/data` không có JSON source), `pricingMode/outsource/commercial*`, override bảng 2&3, `multiStructureLayers` UI, phụ phí in keys. `dongBoCotLoiNhuan` xác minh là **không cần port** (engine tự chọn cột LN — xem mục B).

**Verify**: `tsc -p scripts` ✅ · smoke Node trên bundle mới: màng in ra `printFilmCost`/`gioSetup`/LN 15% theo `tyLeLoiNhuanMangIn` ✅ · `flutter analyze` 0 error/warning ✅ · type-check/lint còn fail ở `apps/mobile` (thiếu eslint.config + 1 lỗi `DongLoiNhuan` ở `cua-hang-cau-hinh.ts:65`) và 16 lint error `apps/web` — **đã xác nhận có sẵn từ trước trên tree sạch**, không liên quan thay đổi nhánh này.

## Kết luận phân tầng

Flutter hiện = "máy tính giá thường offline cho cá nhân". Thiếu 3 nhóm lớn:

1. **Các chế độ tính giá**: nâng cao, thương mại, gia công ngoài, màng in, khổ nhỏ, lớp 2 kép, override, khách lớn.
2. **Hệ sinh thái nghiệp vụ**: auth, phân quyền, báo giá, duyệt PIN, khách hàng, LSX đủ biểu mẫu, audit.
3. **Hạ tầng dữ liệu**: đồng bộ BE, phiên bản cấu hình, lịch sử server.
