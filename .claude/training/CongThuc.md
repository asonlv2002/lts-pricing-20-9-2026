# Bảng Công Thức Tính Giá Thành Bao Bì — LTS Pricing
> **Dành cho developer.** Đây là tài liệu kỹ thuật — mọi công thức trong `engine.ts` phải khớp 100% với file này.  
> Nguồn gốc: tổng hợp từ `Train.md` + `engine.ts` + `calculatorStore.ts` + `types.ts` + `db.ts`.  
> Cập nhật lần cuối: 2026-04-20

---

## Mục lục
1. [Biến đầu vào](#1-biến-đầu-vào)
2. [Hằng số hệ thống](#2-hằng-số-hệ-thống)
3. [Tính toán nền tảng](#3-tính-toán-nền-tảng)
4. [Công đoạn CẮT](#4-công-đoạn-cắt)
5. [Công đoạn GHÉP](#5-công-đoạn-ghép)
6. [Công đoạn IN](#6-công-đoạn-in)
7. [Trục in](#7-trục-in)
8. [Tổng chi phí & Lợi nhuận](#8-tổng-chi-phí--lợi-nhuận)
9. [Phụ kiện](#9-phụ-kiện)
10. [Đóng gói](#10-đóng-gói)
11. [Vận chuyển](#11-vận-chuyển)
12. [Lãi vay & Hoa hồng](#12-lãi-vay--hoa-hồng)
13. [Giá bán cuối](#13-giá-bán-cuối)
14. [Trọng lượng & Độ dày](#14-trọng-lượng--độ-dày)
15. [Ngày sản xuất ước tính](#15-ngày-sản-xuất-ước-tính)
16. [Danh sách CẤM](#16-danh-sách-cấm)
17. [Bẫy & Nhánh if/else toàn dự án](#17-bẫy--nhánh-ifelse-toàn-dự-án)

---

## 1. Biến đầu vào

| Tên biến (code) | Tên tiếng Việt | Đơn vị | Ghi chú |
|---|---|---|---|
| `productType` | Loại sản phẩm | `'tui'` / `'mang'` | Xác định toàn bộ nhánh tính toán |
| `quantity` | Số lượng | cái (túi) / m² (màng) | Màng nhập thẳng m², túi nhập số cái |
| `spreadWidth` | Khổ trải | m | Chiều ngang 1 túi khi mở phẳng |
| `cutStep` | Bước cắt | m | Chiều dài 1 túi theo chiều cuộn |
| `numImages` | Số con hình | số nguyên ≥ 1 | Số túi xếp song song ngang trên 1 trục in |
| `numColors` | Số màu in | số nguyên 0–10 | |
| `coverageRatio` | Tỉ lệ phủ mực | 0–1 | Mặc định 1.0 |
| `metallicSurcharge` | Phụ phí kim tuyến | ₫/m² | Mặc định 0 |
| `layer1Id … layer5Id` | ID lớp vật liệu 1→5 | string | Layer 1 = lớp ngoài (in), layer 2–5 = lớp ghép |
| `micOverrides` | Độ dày tùy chỉnh | `{ layerXId: mic }` | Chỉ áp dụng nếu vật liệu có `adjustableMic = true` |
| `profitColumn` | Cột lợi nhuận | 1 / 2 | Tra bảng LN |
| `filmRollLength` | Chiều dài cuộn màng | m | Chỉ dùng cho màng, mặc định 6000 m |
| `boxPrice` | Giá đóng gói | ₫/thùng (túi) / ₫/cuộn (màng) | |
| `bagsPerBox` | Số túi/thùng | cái | Chỉ dùng cho túi |
| `shippingPerKm` | Đơn giá vận chuyển | ₫/km | |
| `shippingKm` | Số km vận chuyển | km | |
| `paymentDays` | Số ngày thanh toán | ngày | Mặc định 30 |
| `paymentInterestRate` | Lãi suất tháng | tỉ lệ | Mặc định 0.0025 (= 0.25%/tháng) |
| `commissionRate` | Tỉ lệ hoa hồng | tỉ lệ | Dùng khi `commissionUnit = '%'` |
| `commissionFixedVND` | Hoa hồng cố định | ₫/đơn vị | Dùng khi `commissionUnit = 'vnd'` |
| `hasZipper` | Có zipper | bool | |
| `hasTape` | Có băng keo | bool | |
| `hasHandle` | Có quai xách | bool | |
| `cylLength` | Chiều dài trục in | m | Nhập tay hoặc tính tự động |
| `cylCircum` | Chu vi trục in | m | |
| `cylUnitPrice` | Đơn giá trục in | ₫/m² | Mặc định lấy từ `constants` |

---

## 2. Hằng số hệ thống

> Tất cả lấy từ `constants` (cấu hình bởi Admin), **không hardcode**.

| Tên hằng số | Ý nghĩa | Giá trị mặc định |
|---|---|---|
| `cutWasteA` | Hệ số A phế hao cắt | 3000 |
| `cutWasteB` | Hệ số B phế hao cắt | 20 |
| `cutWasteC` | Hệ số C phế hao cắt (hằng số cộng) | 100 |
| `cutBase` | Đơn giá CPSX cắt cơ sở | 971 ₫/m² |
| `cutThreshold1` | Ngưỡng diện tích túi nhỏ | 0.07 m² |
| `cutThreshold2` | Ngưỡng diện tích túi trung bình | 0.20 m² |
| `cutMult1` | Hệ số nhân CPSX túi nhỏ | 1.4 |
| `cutMult2` | Hệ số nhân CPSX túi trung | 1.2 |
| `cutMult3` | Hệ số nhân CPSX túi lớn | 0.8 |
| `ghepWasteA` | Hệ số A phế hao ghép | 3000 |
| `ghepWasteB` | Hệ số B phế hao ghép | 20 |
| `ghepWasteC` | Hệ số C phế hao ghép (hằng số cộng) | 100 |
| `ghepCPSX` | CPSX ghép | ₫/m² |
| `printWasteA` | Hệ số A phế hao in | 6000 |
| `printWasteB` | Hệ số B phế hao in | 40 |
| `printWasteC` | Ngưỡng cuộn dài phế hao in | 50000 m |
| `printWasteD` | Hệ số D phế hao in thêm (cuộn rất dài) | 400 |
| `colorSetup[n]` | Phế hao khởi máy theo số màu n | ₫ (cố định/lần chạy) |
| `laborCost` | Chi phí nhân công in | ₫/m² |
| `zipperPrice` | Đơn giá zipper | ₫/m |
| `tapePrice` | Đơn giá băng keo | ₫/m |
| `handlePrice` | Đơn giá quai xách | ₫/cái |
| `cylinderPricePerUnit` | Đơn giá khắc trục | ₫/m² |

---

## 3. Tính toán nền tảng

```
diện_tích_1_túi  = khổ_trải × bước_cắt                        [m²]

tổng_diện_tích   = số_lượng × diện_tích_1_túi   (túi)
tổng_diện_tích   = số_lượng                       (màng — đã là m²)

khổ_in  = khổ_trải × số_con_hình + 0.02           [m]
khổ_ghép = khổ_in                                  [m]  (cùng giá trị)
khổ_cắt  = khổ_in                                  [m]  (cùng giá trị)

chiều_dài_cuộn_tp = tổng_diện_tích / (khổ_trải × số_con_hình) [m]
```

> **Nguyên lý:** `chiều_dài × khổ = tổng_diện_tích + lề` — tổng m² không thay đổi khi đổi `số_con_hình`.

---

## 4. Công đoạn CẮT

### 4.1. Chiều dài cuộn tại cắt

```
chiều_dài_cắt (túi)  = bước_cắt × số_lượng / số_con_hình       [m]
chiều_dài_cắt (màng) = tổng_diện_tích / (khổ_trải × số_con_hình) [m]
```

> ⚠️ **Phải chia `số_con_hình`** — khổ cuộn đã nhân `số_con_hình`, nên chiều dài phải chia xuống để giữ nguyên tổng m².

### 4.2. Phế hao cắt

```
phế_hao_cắt = chiều_dài_cắt / cutWasteA × cutWasteB + cutWasteC  [m]
```

### 4.3. CPSX cắt

> **Chỉ tính cho Túi. Màng = 0.**

```
if diện_tích_1_túi < cutThreshold1:
    cpsx_cắt = cutBase × cutMult1       (túi nhỏ)
elif diện_tích_1_túi < cutThreshold2:
    cpsx_cắt = cutBase × cutMult2       (túi trung)
else:
    cpsx_cắt = cutBase × cutMult3       (túi lớn)

chi_phí_cắt = cpsx_cắt × (chiều_dài_cắt + phế_hao_cắt) × khổ_cắt   [₫]
```

---

## 5. Công đoạn GHÉP

> Xử lý theo chuỗi: **Layer 2 → Layer 3 → Layer 4 → Layer 5** (layer 2 gần thành phẩm nhất).

### 5.1. Khởi tạo chuỗi

```
mét_cần_hiện_tại = chiều_dài_cắt + phế_hao_cắt     [m]
```

### 5.2. Lặp qua từng lớp ghép (layer i = 2, 3, 4, 5)

```
mét_đầu_vào_i = mét_cần_hiện_tại

phế_hao_ghép_i = mét_đầu_vào_i / ghepWasteA × ghepWasteB + ghepWasteC  [m]

chi_phí_gc_ghép_i  = ghepCPSX × (mét_đầu_vào_i + phế_hao_ghép_i) × khổ_ghép  [₫]
chi_phí_nvl_ghép_i = giá_lớp_i (₫/m²) × (mét_đầu_vào_i + phế_hao_ghép_i) × khổ_ghép  [₫]

chi_phí_ghép_i = chi_phí_gc_ghép_i + chi_phí_nvl_ghép_i    [₫]

mét_cần_hiện_tại = mét_đầu_vào_i + phế_hao_ghép_i          (truyền xuôi)
```

### 5.3. Tổng kết ghép

```
tổng_phế_hao_ghép = Σ phế_hao_ghép_i
tổng_chi_phí_ghép = Σ chi_phí_ghép_i
```

---

## 6. Công đoạn IN

> Layer 1 — lớp ngoài cùng (mặt in).

### 6.1. Chiều dài cuộn tại in

```
chiều_dài_in = chiều_dài_cắt + phế_hao_cắt + tổng_phế_hao_ghép   [m]
```

### 6.2. Phế hao in

```
phế_hao_khởi_máy = colorSetup[số_màu]                                      [₫ → quy ra mét qua chiều dài]

phế_hao_chạy = chiều_dài_in / printWasteA × printWasteB

phế_hao_thêm = chiều_dài_in / printWasteC × printWasteD    (nếu chiều_dài_in > printWasteC)
             = 0                                             (nếu ≤ printWasteC)

tổng_phế_hao_in = phế_hao_khởi_máy + phế_hao_chạy + phế_hao_thêm
```

> Nếu `số_màu = 0` → `tổng_phế_hao_in = 0`.

### 6.3. CPSX in

```
giá_mực = layer1.inkPricePerColor                 (nếu vật liệu có giá mực riêng)
        = 135                                      (nếu vật liệu là PET hoặc PA)
        = 120                                      (các loại khác)

cpsx_in = số_màu × giá_mực × tỉ_lệ_phủ_mực + chi_phí_nhân_công + phụ_phí_kim_tuyến  [₫/m²]
```

> Nếu `số_màu = 0` → `cpsx_in = 0`.

### 6.4. Chi phí in

```
chi_phí_gc_in  = cpsx_in × (chiều_dài_in + tổng_phế_hao_in) × khổ_in       [₫]
chi_phí_nvl_in = giá_lớp_1 (₫/m²) × (chiều_dài_in + tổng_phế_hao_in) × khổ_in  [₫]

tổng_chi_phí_in = chi_phí_gc_in + chi_phí_nvl_in                            [₫]
```

---

## 7. Trục in

```
chiều_dài_trục = max(0.7,  khổ_trải × số_con_hình + 0.1)    [m]

diện_tích_trục = chiều_dài_trục × chu_vi_trục                [m²]

chi_phí_1_trục = diện_tích_trục × đơn_giá_trục               [₫]

tổng_chi_phí_trục = chi_phí_1_trục × số_màu                  [₫]
```

**Giới hạn máy in:**
- `chiều_dài_trục < 0.7 m` → ⚠ Dưới tối thiểu
- `chiều_dài_trục > 1.25 m` → ❌ Vượt tối đa — không in được

---

## 8. Tổng chi phí & Lợi nhuận

```
tổng_cpsx = tổng_chi_phí_in + tổng_chi_phí_ghép + chi_phí_cắt    [₫]

tỉ_lệ_lợi_nhuận = tra_bảng_LN(tổng_cpsx, cột_lợi_nhuận)          [%]

lợi_nhuận = tỉ_lệ_lợi_nhuận × tổng_cpsx                          [₫]

doanh_thu  = tổng_cpsx + lợi_nhuận                                [₫]

giá_sx_per_đvị = doanh_thu / số_lượng                             [₫/cái hoặc ₫/m²]
```

**Tra bảng lợi nhuận:**
- Bảng sắp xếp tăng dần theo ngưỡng `threshold`
- Duyệt từ trên xuống, lấy `%LN` của hàng đầu tiên có `tổng_cpsx < threshold`
- Nếu vượt mọi ngưỡng → dùng `PROFIT_DEFAULT` (% LN thấp nhất)

---

## 9. Phụ kiện

> **Chỉ áp dụng cho Túi.**

```
tổng_zipper  = số_lượng × bước_cắt × zipperPrice       (nếu hasZipper = true, else 0)
tổng_băng_keo = số_lượng × bước_cắt × tapePrice        (nếu hasTape   = true, else 0)
tổng_quai    = số_lượng × handlePrice                   (nếu hasHandle = true, else 0)

zipper_per_đvị   = tổng_zipper   / số_lượng
băng_keo_per_đvị = tổng_băng_keo / số_lượng
quai_per_đvị     = handlePrice                          (cố định/cái)
```

---

## 10. Đóng gói

### Túi

```
số_thùng       = số_lượng / số_túi_per_thùng
tổng_đóng_gói  = giá_thùng × số_thùng
đóng_gói_per_đvị = tổng_đóng_gói / số_lượng            [₫/cái]
```

### Màng

```
diện_tích_1_cuộn = khổ_trải × chiều_dài_cuộn_màng / số_con_hình   [m²]

số_cuộn           = số_lượng / diện_tích_1_cuộn
đóng_gói_per_m²   = giá_đóng_gói_1_cuộn / diện_tích_1_cuộn        [₫/m²]
tổng_đóng_gói     = đóng_gói_per_m² × số_lượng                    [₫]
```

---

## 11. Vận chuyển

```
tổng_vận_chuyển  = đơn_giá_per_km × số_km              [₫]
vc_per_đvị       = tổng_vận_chuyển / số_lượng          [₫/cái hoặc ₫/m²]
```

---

## 12. Lãi vay & Hoa hồng

```
lãi_vay_per_đvị = (lãi_suất_tháng / 30) × số_ngày_tt × giá_sx_per_đvị   [₫]

hoa_hồng_per_đvị = commissionFixedVND                  (nếu commissionUnit = 'vnd')
                 = tỉ_lệ_hh × giá_sx_per_đvị           (nếu commissionUnit = '%')
```

---

## 13. Giá bán cuối

```
giá_bán = giá_sx_per_đvị
        + zipper_per_đvị
        + băng_keo_per_đvị
        + quai_per_đvị
        + đóng_gói_per_đvị
        + vc_per_đvị
        + lãi_vay_per_đvị
        + hoa_hồng_per_đvị
```

---

## 14. Trọng lượng & Độ dày

```
gsm_lớp_i = (độ_dày_mic_i / 1_000_000) × (khối_lượng_riêng_i × 1_000_000)   [g/m²]

tổng_gsm    = Σ gsm_lớp_i

trọng_lượng_đvị (túi)  = tổng_gsm × diện_tích_1_túi + trọng_quai + phụ_kiện_thêm   [g]
trọng_lượng_đvị (màng) = tổng_gsm × 1.0              (1 đvị = 1 m²)               [g]

độ_dày_thô = Σ độ_dày_mic_i
độ_dày_cộng_keo = (số_lớp_active - 1) × 3            [mic — mỗi lớp ghép thêm ~3 mic keo]
độ_dày_tổng = làm_tròn_lên_5((độ_dày_thô + độ_dày_cộng_keo))   [mic]
```

---

## 15. Ngày sản xuất ước tính

```
ngày_sx = ceil(số_lượng / 30_000) + 4    [ngày lịch]
```

---

## 16. Danh sách CẤM

> Mỗi dòng là một bug đã xảy ra thực tế — **không bao giờ** lặp lại.

| # | KHÔNG được làm | Lý do |
|---|---|---|
| 1 | `totalArea = quantity × bagArea` khi `productType = 'mang'` | Màng đã nhập thẳng m², nhân thêm là sai |
| 2 | `cutMeters = cutStep × quantity` (không chia `numImages`) | Khổ cuộn đã nhân `numImages`, chiều dài phải chia lại |
| 3 | Nhân NVL với số lớp ghép | Phế hao cộng vào, không nhân lên |
| 4 | Dùng vòng lặp `nCalc` bội số cho trục in | Công thức phẳng: `max(0.7, spreadWidth × numImages + 0.1)` |
| 5 | Cộng lề `+0.02` vào `filmLength` (chiều dài cuộn) | Lề 0.02 m thuộc chiều ngang (khổ), không thuộc chiều dài |
| 6 | Tính `cutCPSX > 0` cho màng | Màng không có công đoạn cắt riêng → `cutCPSX = 0` |
| 7 | Hardcode hệ số A/B/C phế hao | Phải đọc từ `constants` |

---

## Sanity check nhanh

| Test | Input | Kết quả đúng | Nếu sai → nghi ngờ |
|---|---|---|---|
| Tăng `numImages` 1→2 | Giữ nguyên mọi thứ | Giá/đơn vị giảm hoặc bằng | Sai `cutMeters` |
| So màng vs túi cùng qty=1000 | `mang` qty=1000 vs `tui` qty=1000 bagArea=0.06 | `totalArea` khác nhau (1000 vs 60) | Sai nhánh `totalArea` |
| Thêm 1 lớp ghép | Layer 3 mới | Cost tăng ≈ `pricePerM2 × m² lớp đó` | Sai chuỗi truyền waste |
| Trục in biên | `spreadWidth=0.5`, `numImages=3` | `cylLength = 1.6` → cảnh báo vượt 1.25 m | Sai công thức trục |

---

*Tài liệu này được duy trì song song với `Train.md`. Nếu có mâu thuẫn → `Train.md` là nguồn chân lý.*

---

## 17. Bẫy & Nhánh if/else toàn dự án

> Tổng hợp **tất cả** các điểm phân nhánh ngầm, side-effect ẩn, và lưu ý "không nhìn vào không biết" trong `engine.ts`, `calculatorStore.ts`, `types.ts`, `db.ts`.

---

### 17.1. `engine.ts` — các nhánh & điều kiện

#### Guard đầu vào — hàm `calculate()` trả `null` khi:
```
layer1 == null
|| quantity <= 0
|| spreadWidth <= 0
|| cutStep <= 0
|| productType == ''
|| numColors == null
|| (productType == 'tui'  && bagType == '')
|| (productType == 'mang' && filmType == '')
```
> ⚠️ Mọi consumer của `calculate()` phải kiểm tra `result !== null` trước khi dùng.

#### `numImages` — fallback ngầm:
```typescript
const numImages = input.numImages || 1;
```
> `numImages = 0` hoặc `undefined` → tự động thành `1`. Không bao giờ để `numImages = 0` lọt vào.

#### `totalArea` — nhánh theo `productType`:
```
productType == 'mang' → totalArea = quantity          (m² thẳng)
productType == 'tui'  → totalArea = quantity × bagArea
```

#### `cutMeters` — nhánh theo `productType`:
```
productType == 'mang' → cutMeters = totalArea / (spreadWidth × numImages)
                                    guard: nếu (spreadWidth × numImages) == 0 → trả 0
productType == 'tui'  → cutMeters = cutStep × quantity / numImages
```

#### `cutCPSX` — nhánh theo `productType` + `bagArea`:
```
productType == 'mang' → cutCPSX = 0, cutCostCPSX = 0, cutTotalCost = 0
productType == 'tui':
  bagArea < cutThreshold1 (0.07) → cpsx = cutBase × cutMult1 (×1.4)
  bagArea < cutThreshold2 (0.20) → cpsx = cutBase × cutMult2 (×1.2)
  else                           → cpsx = cutBase × cutMult3 (×0.8)
```

#### `printWaste` — nhánh `numColors == 0`:
```
numColors == 0 → printWaste = 0, printCPSX = 0
numColors > 0  → tính bình thường (cSetup + phế hao chạy + phế hao thêm)
```

#### `printWaste` — nhánh cuộn rất dài (`printWasteC`):
```
printMeters > printWasteC (50000 m) → cộng thêm printMeters / printWasteC × printWasteD
printMeters ≤ printWasteC           → phần này = 0
```
> Cuộn thường không bao giờ tới 50.000 m — nhánh này chỉ là safety net.

#### `inkPrice` — ưu tiên lấy từ vật liệu:
```
layer1.inkPricePerColor có giá trị → dùng giá đó
layer1.inkPricePerColor == 0/null  → fallback:
    layer1.isPETorPA == true → 135 ₫/màu/m²
    else                     → 120 ₫/màu/m²
```

#### `micOverrides` — chỉ áp dụng khi vật liệu cho phép:
```
micOverrides[layerKey] có giá trị
&& material.adjustableMic == true
→ clone vật liệu, gán thickness mới, tính lại pricePerM2

pricePerM2 = pricePerKg × thickness_mới × density / 1000
```
> Nếu `adjustableMic = false`, override bị bỏ qua hoàn toàn — không báo lỗi.

#### `filmRollArea` — chỉ tính cho màng:
```
productType == 'mang' → filmRollArea = spreadWidth × filmRollLength / numImages
productType == 'tui'  → filmRollArea = 0
```

#### Đóng gói — nhánh màng có guard `filmRollArea <= 0`:
```
productType == 'mang':
  filmRollArea > 0 && boxPrice > 0:
    packagingPerUnit = boxPrice / filmRollArea
    numBoxes = quantity / filmRollArea
  else → packagingPerUnit = 0, boxPerUnit = 0, boxTotal = 0
         numBoxes = filmRollArea > 0 ? quantity / filmRollArea : 0

productType == 'tui':
  numBoxes = bagsPerBox > 0 ? quantity / bagsPerBox : 0
  boxTotal = boxPrice × numBoxes
```
> Nếu nhập `filmRollLength = 0` cho màng → `filmRollArea = 0` → đóng gói = 0, không crash.

#### `unitArea` — để tính trọng lượng:
```
productType == 'mang' → unitArea = 1.0      (1 đvị = 1 m²)
productType == 'tui'  → unitArea = bagArea  (1 đvị = 1 túi)
```

#### `commissionPerUnit` — ưu tiên mode `vnd`:
```
commissionUnit == 'vnd' → commissionPerUnit = commissionFixedVND
commissionUnit == '%'   → commissionPerUnit = commissionRate × costPerUnit
```
> `commissionUnit` là nguồn chân lý — không dùng `commissionInputValue` để tính (chỉ dùng cho UI display).

#### `cylLength` tại `engine.ts` — đọc từ `input`, không tự tính:
```
cylLengthLocal = input.cylLength ?? 0
→ nếu cylLength = 0 → cylArea = 0 → cylinderCost = 0
```
> Công thức tính `cylLength` chỉ nằm ở `calculatorStore.ts` (auto-fill khi user đổi `spreadWidth`/`numImages`). Engine chỉ đọc giá trị có sẵn.

#### `độ dày tổng` — làm tròn lên bội số 5:
```
addedMic    = (số_lớp_active - 1) × 3       (mỗi lớp ghép thêm 3 mic keo)
độ_dày_thô  = Σ thickness các lớp
tổng        = round((độ_dày_thô + addedMic) / 5) × 5    ← làm tròn đến 5 mic gần nhất
```

---

### 17.2. `calculatorStore.ts` — side-effect ẩn trong `setInput()`

> **`setInput()` không chỉ gán giá trị — nó tự động tính lại nhiều trường khác.** Mọi lần gọi `setInput(partial)` đều kéo theo chuỗi side-effect sau:

#### Auto-tính `cylLength` khi đổi `spreadWidth` hoặc `numImages`:
```
spreadWidth > 0:
  cylLength = max(0.7,  spreadWidth × numImages + 0.1)   (làm tròn 3 chữ số)
spreadWidth == 0:
  cylLength = 0
```
> Trigger khi: `'spreadWidth' in partial || 'numImages' in partial`

#### Auto-tính `cylCircum` khi đổi `cutStep`:
```
cutStep > 0:
  Tìm N nhỏ nhất sao cho cutStep × N ≥ 0.4
  cylCircum = cutStep × N   (làm tròn 3 chữ số)
cutStep == 0:
  cylCircum = 0
```
> Ý nghĩa: chu vi trục phải ≥ 0.4 m (tối thiểu của máy). N thường = 1 hoặc 2.

#### Auto-tính `profitColumn` theo cấu trúc sản phẩm:
```
Điều kiện → profitColumn = 2 (cột lãi thấp hơn) nếu bất kỳ:
  - số lớp active ≥ 3
  - bất kỳ layer nào có ID chứa 'MPET' hoặc 'AL' (viết hoa)
  - bagType == 'dayDung'
  - hasZipper == true

Ngược lại → profitColumn = 1 (cột lãi cao hơn)
```
> User không chọn profitColumn trực tiếp — phần mềm tự chọn theo quy tắc này.  
> Nếu muốn override, phải sửa logic này hoặc cho phép manual override riêng.

#### Auto-tính `metallicSurcharge` từ checkbox nhũ/mờ:
```
metallicSurcharge = (hasNhu ? constants.nhuPrice : 0)
                  + (hasMo  ? constants.moPrice  : 0)
```
> `hasNhu` và `hasMo` là trường dynamic trên `input` (dùng `(newInput as any).hasNhu`  
> vì không khai báo trong `CalculateInput` interface — **lưu ý kỹ thuật nợ**).

#### Auto-gán `handleWeight`, `zipperWeight`, `tapeWeight` từ `constants`:
```
handleWeight = hasHandle ? constants.handleWeight : 0
zipperWeight = hasZipper ? constants.zipperWeight : 0
tapeWeight   = hasTape   ? constants.tapeWeight   : 0
```
> Khi user tick/bỏ tick checkbox → trọng lượng phụ kiện tự cập nhật theo constants hiện tại.

#### Debounce persist materials/constants — 800 ms:
```
setMaterialParam() → debouncedPersistMaterials() (800ms)
setConstantParam() → debouncedPersistConstants() (800ms)
```
> Mỗi keystroke không gọi API. Sau 800ms không có thay đổi mới → gọi PUT.  
> Nếu server chậm hoặc mất kết nối → persist fail silently (chỉ `console.warn`).

#### `history` — giới hạn 200 bản ghi:
```
history = [item, ...state.history].slice(0, 200)
```

#### `addCurrentToHistory()` — luôn tạo trạng thái `'drafted'`:
```
quoteStatus = 'drafted'   (cố định, không thể override khi tạo mới)
```

#### `loadHistoryFromServer()` — backfill `quoteStatus`:
```
item.quoteStatus ?? 'drafted'
```
> Item cũ trong server JSON chưa có `quoteStatus` → tự gán `'drafted'`.  
> Điều này quan trọng khi migrate dữ liệu cũ.

---

### 17.3. `types.ts` — các enum & luồng trạng thái

#### Luồng trạng thái báo giá (`QuoteStatus`) — 5 bước tuần tự:
```
drafted → sent → pending_approval → approved → completed
  (1)      (2)         (3)             (4)          (5)
```
> Nút "LSX" chỉ hiện ở trạng thái `approved` (bước 4).  
> Không có cơ chế quay lui (không có `rejected`, `cancelled` trong QuoteStatus).

#### Luồng trạng thái Lệnh Sản Xuất (`LSXStatus`) — độc lập với QuoteStatus:
```
created → in_production → completed
                       ↘ cancelled
```

#### `OverrideRowKey` — các hàng có thể override:
```
'print' | 'lam-2' | 'lam-3' | 'lam-4' | 'lam-5' | 'cut'
```
> Override chỉ là dữ liệu display (bảng 2 & 3 trong ManagerView).  
> Engine **không đọc** `saleOverrides`/`adminOverrides` — chúng chỉ ảnh hưởng đến giao diện.

#### `hasNhu` / `hasMo` — trường ẩn KHÔNG có trong `CalculateInput` interface:
> Khai báo thiếu trong `types.ts` nhưng được dùng trong `setInput()` qua `as any`.  
> Nếu refactor interface → phải thêm 2 trường này.

---

### 17.4. `db.ts` — lưu ý khi đọc/ghi file

#### Atomic write — quy trình:
```
ghi vào filePath + '.tmp'
→ fs.rename(.tmp → filePath)
```
> Tránh file JSON hỏng nửa chừng nếu server crash giữa lúc ghi.  
> Nếu thấy file `.tmp` còn sót → server đã crash đúng lúc rename → xóa .tmp, dùng file gốc.

#### Write lock per-file (`writeLocks` Map):
```
chainLock(filePath) → nối vào Promise chain trước đó
```
> Mỗi file có 1 lock riêng (không lock chéo). Ghi đồng thời vào 2 file khác nhau → OK.  
> Ghi đồng thời vào cùng 1 file → xếp hàng tuần tự.

#### Auto-init khi file chưa tồn tại:
```
ENOENT error → writeJsonDirect(filePath, fallback) → trả fallback
```
> `writeJsonDirect` KHÔNG dùng lock (chỉ dùng nội bộ khi init).  
> `writeJson` (public) dùng lock — phân biệt rõ 2 hàm này khi đọc code.

#### `colorSetup` — key string trong JSON, key number trong code:
```
JSON:  { "1": 500, "2": 800, ... }     (key là string)
Code:  { 1: 500, 2: 800, ... }         (key là number)
```
> `getDefaultConstants()` trong `db.ts` tự convert:  
> `Object.entries(raw.colorSetup).map(([k, v]) => [Number(k), v])`  
> Nếu bỏ bước này → `colorSetup[numColors]` trả `undefined` → phế hao khởi máy = 0 → tính sai.

#### `profitTable` — shape wrapper `{ rows, profitDefault }`:
```
Trên disk:  { rows: [...], profitDefault: { col1: 0.08, col2: 0.06 } }
Trong code: profitTable (ProfitRow[])  +  PROFIT_DEFAULT (từ data.ts)
```
> API `/api/config` trả về `profitTable` là mảng thuần (chỉ `rows`).  
> `db.ts` giữ nguyên wrapper để không mất `profitDefault` khi ghi lại.

#### Default user seed — chỉ tạo khi `users.json` chưa tồn tại:
```
admin / admin123   (SHA-256 hash)
```
> **Môi trường production phải đổi mật khẩu ngay sau deploy đầu tiên.**

#### `initDataFiles()` — gọi một lần khi server boot:
```
Gọi song song readXxx() cho tất cả 6 file
→ mỗi file tự tạo với default nếu chưa tồn tại
```
> Idempotent — an toàn gọi nhiều lần. Thường gọi trong `instrumentation.ts` hoặc layout server component.

---

### 17.5. Bảo mật & Phân quyền — các điểm cần chú ý

| Điểm | Trạng thái | Rủi ro |
|---|---|---|
| Role-based menu filtering | Client-side trong `AppShell.tsx` | Dễ bypass bằng cách gọi API trực tiếp |
| API route auth (`getSession()`) | **Chưa đầy đủ** — hầu hết route không kiểm tra | Ai cũng có thể gọi `/api/history`, `/api/config` nếu biết endpoint |
| Password hash | SHA-256 (không salt) | Yếu hơn bcrypt — ổn cho nội bộ, không dùng cho public |
| JWT session | HttpOnly cookie, 8 giờ, dùng `jose` | Không có refresh token — sau 8h phải đăng nhập lại |
| `commissionUnit` | Client kiểm soát | Không validate server-side |

---

### 17.6. Sơ đồ luồng dữ liệu tổng quan

```
User nhập form
    ↓
setInput(partial)  [calculatorStore.ts]
    ├── Auto-fill: cylLength, cylCircum, profitColumn,
    │              metallicSurcharge, handleWeight, zipperWeight, tapeWeight
    └── calculate(newInput, materials, constants, profitTable)  [engine.ts]
            ├── Guard: trả null nếu thiếu input
            ├── nhánh mang/tui → totalArea
            ├── cutMeters → phế hao cắt → cpsx cắt
            ├── chuỗi ghép layer 2→3→4→5 (truyền waste xuôi)
            ├── in layer 1 (nhận waste tích lũy)
            ├── trục in (đọc cylLength từ input)
            ├── phụ kiện + đóng gói + VC + lãi + hoa hồng
            └── trả CalculateResult

User lưu → addCurrentToHistory()
    ├── ghi localStorage (ngay lập tức)
    └── POST /api/history (fire-and-forget)

Mount trang → loadHistoryFromServer() + loadConfigFromServer()
    └── override localStorage cache bằng dữ liệu server
```

---

### 17.7. Các giá trị mặc định quan trọng

| Trường | Giá trị mặc định | Nằm ở |
|---|---|---|
| `numImages` | `1` | `defaultInput` trong store |
| `filmRollLength` | `6000` m | `defaultInput` trong store |
| `paymentDays` | `30` ngày | `defaultInput` trong store |
| `paymentInterestRate` | `0.0025` (0.25%/tháng) | `defaultInput` trong store |
| `coverageRatio` | `1` (100%) | `defaultInput` trong store |
| `profitColumn` | `2` | `defaultInput` trong store (sẽ bị auto-override) |
| `cylUnitPrice` | `7_300_000` ₫/m² | `defaultInput` trong store |
| `inkPrice` fallback (PET/PA) | `135` ₫/màu/m² | hardcode trong `engine.ts` |
| `inkPrice` fallback (khác) | `120` ₫/màu/m² | hardcode trong `engine.ts` |
| `ngày_sx` buffer | `+4 ngày` | hardcode trong `engine.ts` |
| `năng suất` | `30_000` cái/ngày | hardcode trong `engine.ts` |
| Tài khoản seed | `admin` / `admin123` | `db.ts` → `getDefaultUsers()` |

---

*Tài liệu này được duy trì song song với `Train.md`. Nếu có mâu thuẫn → `Train.md` là nguồn chân lý.*
