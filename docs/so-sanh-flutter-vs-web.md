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
| 3 | **Tính giá Thương mại** (mua đi bán lại: `tinhGiaThuongMai`, form mode + mô tả tự do, LN %/VND, phụ phí khác, đơn vị tùy biến) | ✅ | ~~❌~~ **ĐÃ LÀM 24/09 (P1)** — mode selector 3 chế độ, form TM (thu mua/bán ra) + mode mô tả tự do (`synthesizeResultFromCommercial` port vào engine-entry), result panel `_ThuongMaiResult` | |
| 4 | **Gia công ngoài** (`PanelGiaCongNgoai`, `cheDoTinhGia='gia_cong'`, `giaCongNgoai` → VC/đóng gói/phụ phí GC) | ✅ | ~~❌~~ **ĐÃ LÀM 24/09 (P1)** — `PanelGiaCongNgoai` 7 công đoạn (In/Lật mặt/Ghép/Chia/Làm túi/Gắn quai/Bao PP), `mapOutsourceEnToVn` port, result có 3 dòng GC | |
| 5 | **Override giá từng công đoạn** (Bảng 2 & 3, `overrides.ts`, `OverrideRowKey` print/lam-2..5/cut/chia/matte) | ✅ | ❌ Không có | Sale/Admin không ghi đè được đơn giá VL/CPSX thủ công trên Flutter |
| 6 | Chốt giá (`chotGia`) + phân bổ công ty (`phanBoCongTy`, `donViPhanBo`) | ✅ nhập từ form | ⚠️ chỉ **lưu/hiển thị** ở Lịch sử & LSX | Không có UI nhập chốt giá/phân bổ trong form tính giá |
| 7 | **Tạo báo giá** (`ModuleBaoGia` 230KB, điều khoản `FormDieuKhoanBaoGia`, mã báo giá `quote-code`, chữ ký, PDF `BaoGiaPdfDocument`, preview) | ✅ | ❌ Không có | Flutter không tồn tại khái niệm "báo giá" độc lập — chỉ có lịch sử tính giá |
| 8 | **Duyệt báo giá bằng PIN** (`ModuleDuyetBaoGia`, `NhapPinDuyetModal`, `NhapPinXacNhanModal`) | ✅ | ❌ Không có | Không có luồng phê duyệt |
| 9 | Vòng đời quote 8 trạng thái (drafted→pending→approved→sent→rejected→cancelled→completed→expired, mapping server) | ✅ đồng bộ BE | ⚠️ `_StatusSheet` đổi status **local only** | Trạng thái Flutter không bao giờ lên server |
| 10 | **Tạo LSX** (`TaoLsxWizard` 30KB multi-bước, `LsxFormFields` 55KB, chọn báo giá+tính giá, `ModalDonLSX`) | ✅ | ⚠️ sheet đơn giản: chọn 1 history + 3 TextField | LSX Flutter chỉ là snapshot thô, thiếu trường kỹ thuật |
| 11 | LSX: danh sách + sửa (`SlidePanelLsxEdit`) + PDF (`LsxPdfDocument` 40KB) | ✅ | ⚠️ card list + đổi status + PDF tự viết | PDF LSX Flutter không theo template chuẩn của web |
| 12 | Danh sách tính giá (`ModuleDanhSachTinhGia`) | ✅ | ✅ tab Lịch sử | Flutter tương đối đủ: search, filter status, stats, swipe delete, load lại vào form |
| 13 | Lịch sử đồng bộ DB (`ModuleLichSuDB` 70KB, `BoLocNangCao`, `NutSaoChepLienKet`) | ✅ BE | ❌ chỉ `shared_preferences` (seed demo history.json đã xóa 22/09) | **Không đồng bộ** giữa máy Sale và server |
| 14 | **Quản lý khách hàng** (`ModuleKhachHang` 171KB, import Excel, CustomerManagersPicker, guard quyền) | ✅ | ❌ Không có | Flutter chỉ có ô text "Khách hàng" tự do |
| 15 | Nhật ký thao tác / audit (`ModuleNhatKy`, `audit.ts`, 15 loại action) | ✅ | **ĐÃ LÀM 23/09** — 1 màn `NhatKyThaoTacScreen(scope:)` dùng chung 4 phạm vi (tính giá / cấu hình / khách hàng / hệ thống), lọc thời gian + nâng cao, timeline + diff cấu hình, summary KH, Xuất CSV, auto-refresh 30s (chi tiết mục H) | |
| 16 | Dashboard tổng quan (6 card: số BG đã tạo, chờ duyệt, KH mới, doanh thu ước tính…) | ✅ | ❌ Không có | — |
| 17 | **Đăng nhập / Auth** (JWT, modal đăng nhập, bắt buộc đặt PIN, đổi MK, đổi avatar, đổi chữ ký, flow đòi reset MK) | ✅ | ❌ Không có gì | Flutter **không có http/dio trong pubspec** → hoàn toàn offline |
| 18 | Phân quyền (admin/sale/purchase, `ModulePhanQuyen`, bảng phân quyền, quản lý tài khoản) | ✅ | ❌ Không có | Mọi người dùng Flutter như nhau |
| 19 | **Phiên bản cấu hình giá** (`configVersioning`, `PanelPhienBan`, `price-config-mapper`, scopes PRODUCTION / PRODUCTION_UPGRADE / MATERIALS / PROFIT, hiệu lực theo tháng, bootstrap F5 chờ auth) | ✅ BE SoT | ~~❌~~ **ĐÃ LÀM 24/09 (P2)** — `PhienBanCauHinhScreen` 7 scope (MATERIALS/PRODUCTION/PRODUCTION_UPGRADE/SURCHARGES/INTEREST/WASTE/PROFIT): bootstrap sau login (`taiCauHinhTuServer` GET latest-version → apply vào store, BE thắng LS cache), xem/apply 1 bản, lưu phiên bản (POST/PUT), xóa (409 hiện message BE), gate `PRICE_CONFIG_MANAGER`. Còn thiếu: form CPSX nâng cao (P4), tab nâng cao (P5) | |
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

## G. Đồng bộ "Danh sách báo giá" Flutter ↔ web mobile (22/09/2026)

File: `apps/flutter_app/lib/screens/danh_sach_bao_gia_screen.dart` (+ `lib/lib/bo_dau.dart`, `lib/engine/models.dart`, `lib/lib/pricing_server_mapper.dart`, `lib/store/app_state.dart`, `lib/screens/tao_lsx_wizard.dart`). Đối chiếu `ModuleDuyetBaoGia.tsx` + `qrev-styles.tsx`.

| # | Việc | Trước | Sau |
|---|------|-------|-----|
| 1 | Mã BG YYMM.STT | Không hiện | Hiện mã (derive từ orders `versionByMonth`; fallback `inputValue.quoteCode`). Thêm `ProductionOrder.versionByMonth` + `AppState.ordersTheoBaoGia` |
| 2 | Tìm kiếm | Chỉ `id` + tên BG | Bỏ dấu (`bo_dau.dart`), khớp mã BG + tên BG + KH + SP + tên sheet (mirror `tuKhoaBaoGia`) |
| 3 | Header | Không có | `Danh sách báo giá (N)` + nút "Làm mới" |
| 4 | Card | `KH · SP`, `createdAt` | Mã BG (mono) + badge → KH → SP·SL → `updatedAt` + người lập → actions |
| 5 | Nút copy link / Xem PDF | Không có | Hiện icon (chưa wire tính năng — sẽ làm sau) |
| 6 | PIN guard | 5 thao tác gọi thiếu `pinToken` → **fail** | Bọc `showNhapPinSheet` cho nộp/duyệt/từ chối/xoá; từ chối nhập lý do trước |
| 7 | Gate xoá | `drafted && isCreator` | `bg.deletable` (mirror `original.deletable`) |
| 8 | Tạo LSX | Gọi thẳng `create-orders`, gate theo BG approved | Mở `TaoLsxWizard(prefill...)`, gate theo **từng sheet** `hasCustomerApproved` + BG approved; thêm PIN cho `create-orders` trong wizard |
| 9 | Filter chip | 5 chip (Tất cả/Khởi tạo/Chờ duyệt/Đã duyệt/Bị từ chối) | Còn 2 chip: **Tất cả · Chờ duyệt** (mặc định Tất cả) |
| 10 | Phản hồi KH từng sheet | Có (`customer-decide`) | **Khôi phục 22/09**: mỗi sheet hiện `✅/❌` + nút "KH Duyệt"/"KH từ chối" (creator + BG approved) qua PIN + dòng tóm tắt x/y |
| 11 | Nút thao tác | `.qrev-btn-icon` có viền hộp | `_ActionBtn` có viền + bo góc 8; nút trong sheet dùng `_SheetBtn` viền |
| 12 | **Card LSX: Tên KH + Tên tính giá** | Mapper gán `snapshot = order.inputValue` → card/PDF hiện `—` | **Sửa 23/09**: `PricingServerMapper.orderToProductionOrder` build snapshot từ `pricingSheet` (mirror web `LsxRow`): KH = `customerCodeName` → `customerName` → `inputValue.customer`; SP = `pricingSheetName` → `inputValue.productName`; cấu trúc = `inputValue.structure`. Wizard ghi key `lsxSnapshot` (khớp web) thay vì `snapshot` lồng |

**Còn lại (chưa làm)**: chip "Chờ tôi duyệt" (`/quotations/non-draft`), PDF báo giá thật, edit-mode wizard, deep-link URL.

## H. Nhật ký thao tác Flutter ↔ web mobile (23/09/2026)

File mới: `lib/lib/audit_models.dart`, `lib/lib/activity_log_mapper.dart`, `lib/lib/audit_format.dart`, `lib/lib/config_diff.dart`, `lib/lib/nhat_ky_loc.dart`, `lib/screens/nhat_ky_thao_tac_screen.dart`, `lib/screens/nhat_ky/{nhat_ky_scope,bo_loc_nhat_ky,timeline_nhat_ky,khach_hang_nhat_ky}.dart`. Sửa: `lib/api/service_lts_client.dart` (`layNhatKyDayDuService`), `lib/screens/{cau_hinh,them,hub,tinh_gia_hub,khach_hang_hub}_screen.dart`. Xoá: `lib/screens/khach_hang_audit_log_screen.dart`.

Đối chiếu `ModuleNhatKy.tsx` + `CustomerAuditTab` (`ModuleKhachHang.tsx`) + `activity-log-mapper.ts` + `config-diff.ts` + `customer-audit-format.ts` + `audit.ts` + `MOBILE_HUBS` (`VoTrang.tsx`).

| # | Việc | Trước | Sau |
|---|------|-------|-----|
| 1 | Kiến trúc màn | 2 màn rời (`NhatKyThaoTacScreen` không lọc + `KhachHangAuditLogScreen`), hub Tổng quan có card "Nhật ký" **locked** | 1 màn `NhatKyThaoTacScreen(scope:)` với 4 phạm vi; hub Tổng quan bỏ section Nhật ký (web overview không có) |
| 2 | Điểm vào | TinhGiaHub hiện **tất cả** resourceType; thiếu card Cấu hình & Thêm | TinhGia→`tinhGia`, Cấu hình→`cauHinh` (card mới), Thêm→`heThong` (card mới), Khách hàng→`khachHang` (mirror `MOBILE_HUBS`) |
| 3 | Mapping action | `nhanViet` thiếu 9 action BE phát (`quotation.deleted`, `role.*`, `price_config.*`…) → hiện chuỗi raw; bug `nhom` xếp `version_created` vào 'created' | `ACTION_MAP` đủ theo BE `ACTIVITY_LOG_ACTIONS`; `AuditAction` enum exhaustive; bỏ 3 getter sai (`nhanViet/nhom/nhanResource`) |
| 4 | Diff `price_config` | Không có → "Đã cập nhật" | Port `config-diff.ts`: `diffConfigBlobs` flatten blob `inputValue`, bảng nhãn VN ~180 key, ghép mảng theo id/name, cap 500 path, "(đã xóa)" |
| 5 | Diff các resource khác | Chỉ field KH + `finalPrice/structureText/updateStatus` | `audit_format.dart`: `FIELD_LABELS`, `formatAuditDisplayValue` (policy→tên, input/terms/override/manager), `getAuditChangedFields` |
| 6 | Bộ lọc | Chỉ search + chip resource/nhóm | Thêm: khoảng thời gian (Hôm nay/7/30/Tháng/Tùy chỉnh), autocomplete tài khoản (gate `ACTIVITY_MONITOR`), multi-select phân mục, 2 nhóm hành động, trường thay đổi (scope KH), đối tượng mục tiêu, chip "Đang lọc" + Xóa tất cả |
| 7 | Trình bày | 1 kiểu card "Trước → Sau" | 2 kiểu mirror web: **timeline** (`chiHienGiaTriMoi` cho tính giá/cấu hình; before/after đỏ-xanh cho hệ thống) và **summary card** cho khách hàng (`getAuditSummary`, bảng Trường\|Trước\|Sau, avatar actor) |
| 8 | Khác | Không nhóm ngày, không CSV, không note, không "Mở dữ liệu liên quan", không dedupe | Nhóm ngày (Hôm nay/Hôm qua/dd/MM/yyyy), Xuất CSV (qua `Printing.sharePdf`), hiện `note`, "Mở dữ liệu liên quan" push đúng module, `dedupeAuditEntries` (scope KH), infinite scroll 20, rate-limit 5s, auto-refresh 30s pause khi background |

**Không port**: `openRelated` deep-link bằng URL (Flutter push route trực tiếp), phân trang server-side (log hiện nhỏ), avatar bearer dùng `Image.network` headers.

## Kết luận phân tầng

Flutter hiện = "máy tính giá thường offline cho cá nhân". Thiếu 3 nhóm lớn:

1. **Các chế độ tính giá**: nâng cao, thương mại, gia công ngoài, màng in, khổ nhỏ, lớp 2 kép, override, khách lớn.
2. **Hệ sinh thái nghiệp vụ**: auth, phân quyền, báo giá, duyệt PIN, khách hàng, LSX đủ biểu mẫu, audit.
3. **Hạ tầng dữ liệu**: đồng bộ BE, phiên bản cấu hình, lịch sử server.
