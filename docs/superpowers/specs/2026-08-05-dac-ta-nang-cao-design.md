# Đặc tả kỹ thuật & nguyên liệu (nâng cao)

**Ngày:** 2026-08-05
**Trạng thái:** Đã duyệt

## Mục tiêu

Thêm một cụm hiển thị mới trong `ManHinhQuanLy` gồm 2 bảng và 1 cụm 3 dòng tổng, cho phép
bóc tách chi phí sản xuất thành 2 nhóm rõ ràng:

- **CP Vật liệu** = nguyên vật liệu + dung môi + keo ghép + khác
- **CP Nhân công + điện** = thời gian SX (phút) × đơn giá (₫/phút)

Cụm mới có tổng **độc lập hoàn toàn** với `TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN` của bảng cũ.
Hai cách tính hiển thị song song để đối chiếu.

## Phạm vi

Chỉ `apps/web` — màn `ManHinhQuanLy`.

**Không đụng:** engine (`packages/*`), `lapDongSanXuat`, `xuLyDongGhiDe`, `tinhGiaHieuLuc`,
bảng override, lịch sử, Flutter, `apps/mobile`, PDF/export.

Bảng "Đặc tả kỹ thuật & nguyên liệu" cũ giữ nguyên 100% (11 cột, tổng cũ).

Mọi role đều thấy cụm mới (`admin`, `sale`, `purchase`).

## Nguồn dữ liệu

Toàn bộ dữ liệu đã tồn tại trong `Cấu hình → CPSX nâng cấp`, hiện là *display-only*
("engine chưa dùng"). Cụm mới là consumer đầu tiên.

| Cần | Nguồn |
|---|---|
| Giá mực OPP/PET/PE | `constants.cpsxUpgradeInk.{opp,pet,pe}.appliedPrice` (₫/kg) |
| Giá dung môi, keo | `constants.cpsxUpgradeInk.solventAdhesive.rows` (`DM_OPP`, `DM_PET`, `KEO_319`, `KEO_766`, `DM_EA`) |
| ĐM mực + DM in theo số màu | `constants.cpsxUpgradeInk.dinhMucIn[1..8]` (g/m²) |
| ĐM keo + DM ghép | `constants.cpsxUpgradeInk.dinhMucGhep` (`keoKhoG`, `dungMoiPhaKeoG`) |
| Thời gian SX | `tinhThoiGianMayIn` / `tinhThoiGianMayChay` + `constants.cpsxUpgradeThoiGian` |
| ₫/phút nhân công | `luongMoiPhut1MayTrenNgay` / `luongMoiPhut1May1Ca` / `luongMoiPhutTuiAp` + `constants.cpsxUpgradeLabor` |
| ₫/phút điện | `tinhDienMoiPhut` + `constants.cpsxUpgradeElectric` |
| Dòng SX (khổ/TP/phi hao/NVL) | `uniRows` từ `lapDongSanXuat` (đã có) |
| Phụ kiện túi | `result.zipperTotal`, `result.tapeTotal`, `result.handleTotal` |

## Công thức

```
CP mực + DM in   (₫/m²) = (dmMucG × giáMực + dmDungMôiG × giáDM) ÷ 1000
CP keo + DM ghép (₫/m²) = (keoKhôG × giáKeoTB + dungMôiPhaKeoG × giáDM_EA) ÷ 1000
Thành tiền       (VNĐ)  = ₫/m² × đầuVàoNVL(m) × khổNVL(m)
Thành tiền NC    (VNĐ)  = thờiGian(phút) × ₫/phút nhân công
Thành tiền điện  (VNĐ)  = thờiGian(phút) × ₫/phút điện
```

### Quy tắc quan trọng

- `dmMucG` lookup theo `numColors`, clamp 1–8. **KHÔNG nhân lại `soMau`** — vì `dinhMucIn`
  đã là định mức tổng cho n màu (1 màu=4g, 8 màu=32g, tuyến tính; fallback trong
  `cpsx-upgrade-ink.ts:156` viết thẳng `dmMucG: soMau * 4`).
- Phải `÷ 1000` để quy `g/m² × ₫/kg` → `₫/m²`.
- `numColors <= 0` → CP mực = 0.
- `giáKeoTB` = trung bình cộng các dòng có `ma` bắt đầu `KEO_` (khớp `CpsxNangCapDinhMuc.tsx:81`).
- `giáDM_EA` = dòng `ma === 'DM_EA'`.
- `appliedPrice == null` → coi là 0, không NaN.

### Chọn bảng giá mực (auto theo tên vật liệu lớp in)

| Tên vật liệu chứa | Bảng mực | Dung môi |
|---|---|---|
| `MPET` hoặc `PET` | `pet` | `DM_PET` |
| `OPP` hoặc `BOPP` | `opp` | `DM_OPP` |
| `LLDPE` hoặc `PE` | `pe` | `DM_OPP` (sheet không có `DM_PE`) |
| không khớp / rỗng | `opp` | `DM_OPP` |

Thứ tự kiểm tra: `MPET`/`PET` trước `PE` (vì `PET` chứa substring `PE`).

## Table 1 — Đặc tả kỹ thuật & nguyên liệu (nâng cao)

11 cột:

```
công đoạn · Vật liệu · Khổ màng · Thành phẩm (m) · Phi hao · Đầu vào NVL (m)
· Giá NVL đ/kg · CP vật liệu (đ/m2) · Thành tiền CPNVL
· CP mực in dung môi keo ghép (đ/m2) · Thành tiền CP mực in, dung môi, keo ghép (VNĐ)
```

So với bảng cũ: **bỏ** `CPSX (đ/m²)` và `Thành tiền CPSX` (đã có ở bảng cũ ngay phía trên),
**thêm** 2 cột mực/dung môi/keo.

### Dòng

| Dòng | Nguồn | Cột mực/keo (₫/m²) |
|---|---|---|
| `in` | `uniRows['print']` | `tinhCpMucDungMoiIn(numColors, tênVL, ink)` |
| `ghép (Lớp n)` | `uniRows['lam-n']` — tách theo lớp như bảng cũ | `tinhCpKeoDungMoiGhep(ink)` mỗi dòng 1 lần |
| `chia` | `uniRows['cut']` | `—` |
| `làm túi` | `zipperTotal + tapeTotal + handleTotal` | `—` |

### Quy tắc ẩn/hiện

- `chia`: ẩn khi `productType === 'mang'` (vì `lapDongSanXuat` không tạo `cut` row cho màng).
- `làm túi`: ẩn khi `productType === 'mang'`, hoặc khi tổng phụ kiện = 0.
- Dòng `làm túi` **gộp 1 dòng**, chỉ hiện `Thành tiền CPNVL`; các cột `Khổ màng`,
  `Thành phẩm`, `Phi hao`, `Đầu vào NVL`, `Giá NVL`, `CP vật liệu`, và 2 cột mực/keo đều `—`
  (vì khóa/băng keo tính ₫/m, quai tính ₫/túi — khác đơn vị, không gộp được).
- Cột `Vật liệu` dòng `làm túi` ghi các phụ kiện thực có, ví dụ `Khóa + Băng keo`.
- Dòng có `materialDetails` (ghép nhiều VL song song): giữ `rowSpan` như bảng cũ; cột mực/keo
  hiện ở dòng đầu với `rowSpan`, thành tiền nhân theo `Σ detail.width`.

## Table 2 — Nhân công + điện

5 cột, 4 dòng cứng:

```
(công đoạn) · Thời gian SX (phút) · CP nhân công (đ/phút)
· Thành tiền CP nhân công (VNĐ) · CP điện (đ/phút) · Thành tiền CP điện (VNĐ)
```

| Dòng | Thời gian (phút) | ₫/phút NC | ₫/phút điện |
|---|---|---|---|
| `in` | `tinhThoiGianMayIn(printMeters + printWaste, numColors, tg.print).tongPhut` | `luongMoiPhut1MayTrenNgay(lab.print)` | `tinhDienMoiPhut(el.machines.print)` |
| `ghép` | `tinhThoiGianMayChay(Σ(lam.meters + lam.waste), tg.laminate).tongPhut` | `luongMoiPhut1MayTrenNgay(lab.laminate)` | `tinhDienMoiPhut(el.machines.laminate)` |
| `chia` | `tinhThoiGianMayChay(cutMeters + cutWaste, tg.slit).tongPhut` | `luongMoiPhut1May1Ca(lab.slit)` | `tinhDienMoiPhut(el.machines.slit)` |
| `làm túi` | `tinhThoiGianMayChay(quantity, tg.bag).tongPhut` | `luongMoiPhutTuiAp(lab.bag)` | `tinhDienMoiPhut(el.machines.bag)` |

- Giá điện `₫/phút` dùng **chung** `el.appliedPricePerKwh` cho cả 4 máy
  (đúng ghi chú `CpsxNangCapDien.tsx:361`).
- `làm túi`: ẩn khi `productType === 'mang'`.
- Dòng có input = 0 → thời gian `—`, thành tiền 0 (nhưng dòng vẫn hiện).
- `tinhDienMoiPhut` trả `null` khi chưa có giá điện → hiện `—`, thành tiền 0.

## Cụm 3 dòng tổng — bên phải Table 2

```
Dòng 1: Tổng thành tiền CP Vật liệu (nguyên vật liệu + dung môi + keo ghép + khác)
        = Σ Thành tiền CPNVL (cả các dòng, gồm phụ kiện) + Σ Thành tiền mực/DM/keo
Dòng 2: Tổng thành tiền chi phí Nhân công + điện
        = Σ Thành tiền NC + Σ Thành tiền điện
Dòng 3: Tổng giá thành sản xuất cơ bản
        = Dòng 1 + Dòng 2
```

Layout: flex 2 cột — Table 2 bên trái, box tổng bên phải.
Mobile (`max-width: 767px`): xuống dưới, full width, scope `.lts-shell--mobile`.

Phần "khác" = 0 ở phase này (chừa chỗ sẵn cho sau).

## Kiến trúc

Chọn phương án **module web thuần + component riêng**.

| File | Loại | Nội dung |
|---|---|---|
| `apps/web/src/lib/dac-ta-nang-cao.ts` | mới | Pure functions: `chonNhomMuc`, `tinhCpMucDungMoiIn`, `tinhCpKeoDungMoiGhep`, `lapDongVatLieuNangCao`, `lapDongNhanCongDien`, `tinhTongNangCao` |
| `apps/web/src/lib/dac-ta-nang-cao.test.ts` | mới | Test theo style `assert()` như `cpsx-upgrade-ink.test.ts` |
| `apps/web/src/components/BangDacTaNangCao.tsx` | mới | Render 2 table + box tổng |
| `apps/web/src/components/ManHinhQuanLy.tsx` | sửa | +1 block sau `</TheThuGon>` bảng cũ (~L1543) |
| `apps/web/src/app/globals.css` | sửa | Layout flex cụm table 2 + box tổng, mobile scope |

**Lý do không đưa vào `packages/bang-tinh-gia`:** các cấu hình `cpsxUpgrade*` hiện chỉ tồn tại
ở web `AppConstants` (EN-schema). Đưa vào package sẽ phải map sang VN-schema `HangSo`,
sửa adapter `engine.ts` + `hang-so` + rebuild bundle Flutter — gấp 3–4 lần công việc mà
không phục vụ mục tiêu hiện tại (chỉ hiển thị đối chiếu trên web).

### Ranh giới module

`dac-ta-nang-cao.ts` nhận `CalculateResult`, `UniRow[]`, `AppConstants` → trả struct thuần
(không JSX, không side-effect). Component chỉ render. Nhờ vậy công thức test được độc lập.

## Test

- `chonNhomMuc`: `MPET 12`→`pet`, `BOPP 18`→`opp`, `LLDPE 60`→`pe`, `''`→`opp`, `PET 12`→`pet`
- `tinhCpMucDungMoiIn(4 màu, giá mực 80.000, DM 40.000, dm=(16, 9))` → `1.640 ₫/m²`
- `tinhCpKeoDungMoiGhep(keo TB 40.000, DM_EA 40.000, dm=(3.5, 7))` → `420 ₫/m²`
- `numColors = 0` → CP mực = 0
- `numColors = 12` → clamp về 8
- `appliedPrice = null` → 0, không NaN
- Không có dòng `KEO_` → giáKeoTB = 0, không chia cho 0
- Màng: không có dòng `chia`, không có dòng `làm túi` ở cả 2 table
- Phụ kiện tổng = 0 → ẩn dòng `làm túi`
- Tổng: dòng 3 = dòng 1 + dòng 2
- Thành tiền = `₫/m² × đầuVào × khổ` (khớp cách `costMat` của bảng cũ)

Chạy: `pnpm --filter web exec tsx src/lib/dac-ta-nang-cao.test.ts`

Verify: `pnpm type-check`

## Follow-up (KHÔNG làm trong phase này)

**🐛 Bug preview trong `CpsxNangCapDinhMuc.tsx`** — panel cấu hình mâu thuẫn nội bộ 3 chỗ:

| Chỗ | Nội dung | Nhân `soMau`? |
|---|---|---|
| Header công thức (`L151`) | `(Số màu × ĐM mực × Giá mực) + (Số màu × ĐM DM × Giá DM)` | Có |
| Code (`L95-96`) | `cpMucPET = soMauPET * dmPET.dmMucG * giaMucPET` | Có |
| Ghi chú cuối bảng (`L281`) | *"Lookup ĐM theo số màu — không nhân lại số màu"* | Không |

Hai lỗi:
1. Nhân thừa `soMau` → sai gấp n lần (4 màu sai 4×, 8 màu sai 8×), thực chất là bình phương số màu.
2. Thiếu `÷ 1000` → sai 1000 lần. Ghi chú `L391-392` nói rõ *"quy g → ₫/m² ÷ 1000"* nhưng code không làm.

Chỉ ảnh hưởng preview hiển thị trong panel cấu hình; `dinhMucIn` chưa được dùng để tính tiền
ở bất kỳ đâu ngoài config + test, nên không ảnh hưởng giá bán hiện tại.
