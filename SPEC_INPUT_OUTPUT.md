# Đặc tả Input / Output — Phần mềm Tính Giá Bao Bì

> Tổng hợp từ: `InputCard.tsx`, `ManagerView.tsx`, `TechView.tsx`, `types.ts`, `engine.ts`, `calculatorStore.ts`, `data.ts`  
> Mục đích: làm tài liệu chuẩn để port sang Flutter hoặc bất kỳ platform nào khác

---

## 1. CẤU TRÚC DỮ LIỆU TỔNG QUAN

```
InputCard (form nhập)
    │
    ▼ CalculateInput
Engine (engine.ts)
    │
    ▼ CalculateResult
ManagerView + TechView (hiển thị kết quả)
```

---

## 2. INPUT — CalculateInput

### 2.1 Thông tin đơn hàng (bắt buộc)

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `customer` | `string` | Khách hàng | Tên khách, có thể để trống |
| `productName` | `string` | Tên hàng | Tên sản phẩm, có thể để trống |
| `productType` | `'tui' \| 'mang' \| ''` | Loại sản phẩm | **Bắt buộc** — điều khiển toàn bộ flow tính |
| `bagType` | `string` | Loại túi | Bắt buộc khi `productType='tui'` |
| `filmType` | `string` | Loại màng | Bắt buộc khi `productType='mang'` |
| `quantity` | `number` | Số lượng / Diện tích | Số túi (cái) nếu túi; m² nếu màng. **> 0** |

#### Giá trị hợp lệ cho `bagType`
| Giá trị | Nhãn |
|---|---|
| `3bien` | 3 biên |
| `4bien` | 4 biên |
| `xephong_lech` | Xếp hông dán lưng lệch |
| `xephong_giua` | Xếp hông dán lưng giữa |
| `dayDung` | Đáy đứng |
| `cutSeal` | Cut seal |

#### Giá trị hợp lệ cho `filmType`
| Giá trị | Nhãn |
|---|---|
| `mangIn` | Màng in |
| `mangGhep` | Màng ghép |
| `mangDongGoi` | Màng đóng gói tự động |

---

### 2.2 Cấu trúc vật liệu (bắt buộc)

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `layer1Id` | `string \| null` | Lớp 1 | **Bắt buộc** — lớp in (ngoài cùng) |
| `layer2Id` | `string \| null` | Lớp 2 | Tuỳ chọn — lớp ghép 1 |
| `layer3Id` | `string \| null` | Lớp 3 | Tuỳ chọn — lớp ghép 2 |
| `layer4Id` | `string \| null` | Lớp 4 | Tuỳ chọn — lớp ghép 3 |
| `layer5Id` | `string \| null` | Lớp 5 | Tuỳ chọn — lớp ghép 4 |
| `spreadWidth` | `number` (m) | Khổ trải | **> 0**. VD: `0.320` |
| `cutStep` | `number` (m) | Bước cắt | **> 0**. VD: `0.200` |
| `numImages` | `number` | Số con hình | Mặc định `1`, ≥ 1 |
| `numColors` | `number \| null` | Số màu in | `0`–`8`. `null` = chưa chọn (chặn tính) |
| `micOverrides` | `Record<string, number>` | Độ dày tuỳ chỉnh | Key = `'layer1Id'`…`'layer5Id'`, chỉ áp dụng khi `material.adjustableMic = true` |

#### Logic chọn vật liệu (2 cấp)
- **Cấp 1**: Chọn vật liệu không nhóm (PE, PET…) HOẶC chọn nhóm (BOPP, Matt OPP…)
- **Cấp 2**: Nếu chọn nhóm → hiện dropdown chọn độ dày trong nhóm đó
- Nhóm `BOPP` và `Matt OPP` chỉ hiện ở **Lớp 1**, không hiện ở lớp 2-5
- Xoá lớp N → tự động xoá các lớp N+1 đến 5

---

### 2.3 Thông tin nâng cao — In & Đặc tính

| Field | Kiểu | Nhãn UI | Mặc định | Ghi chú |
|---|---|---|---|---|
| `coverageRatio` | `number` (0–1) | Phủ mực (%) | `1` (100%) | `0` = không in, nhập 0-100 → chia 100 |
| `hasNhu` | `boolean` | Nhũ | `false` | Cộng phụ phí `500 đ/m²` vào `metallicSurcharge` |
| `hasMo` | `boolean` | Phủ mờ | `false` | Cộng phụ phí `300 đ/m²` vào `metallicSurcharge` |
| `metallicSurcharge` | `number` (đ/m²) | — | `0` | Tự tính từ `hasNhu + hasMo`, không nhập trực tiếp |

---

### 2.4 Phụ kiện (chỉ Túi)

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `hasZipper` | `boolean` | Zipper | Đơn giá `378 đ/m` × bước cắt |
| `hasTape` | `boolean` | Băng keo | Đơn giá `200 đ/m` × bước cắt |
| `hasHandle` | `boolean` | Quai | Đơn giá `1.500 đ/cái` |
| `zipperWeight` | `number` (gr/m) | — | Mặc định `2.0` gr, tính vào trọng lượng túi |
| `tapeWeight` | `number` (gr/m) | — | Mặc định `1.0` gr |
| `handleWeight` | `number` (gr/cái) | — | Mặc định `5.0` gr |

---

### 2.5 Trục in

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `cylLength` | `number` (m) | Dài trục | **Auto-tính**: `max(0.7, khoTrai × soConHinh + 0.1)`. Cảnh báo nếu < 0.7m hoặc > 1.25m |
| `cylCircum` | `number` (m) | Chu vi trục | **Auto-tính**: `buocCat × n` (n nhỏ nhất sao cho ≥ 0.4m). Cảnh báo nếu < 0.4m hoặc > 0.9m |
| `cylUnitPrice` | `number` (đ/m²) | Đơn giá trục | Mặc định `7.300.000 đ/m²` |

> **Preview trực tiếp** (không cần bấm Tính):  
> `DT = cylLength × cylCircum`  
> `Giá 1 trục = DT × cylUnitPrice`  
> `Cả bộ = Giá 1 trục × numColors`

---

### 2.6 Đóng gói & Vận chuyển

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `bagsPerBox` | `number` | Túi/thùng | Chỉ khi `productType='tui'` |
| `boxPrice` | `number` (đ) | Giá thùng / Đóng gói (đ/cuộn) | Túi: đ/thùng. Màng: đ/cuộn |
| `filmRollLength` | `number` (m) | Chiều dài cuộn màng TP | Mặc định `6000`m. Chỉ hiện khi `productType='mang'` |
| `shippingPerKm` | `number` (đ/km) | Vận chuyển | Đơn giá vận chuyển |
| `shippingKm` | `number` (km) | Khoảng cách | Số km |

---

### 2.7 Thanh toán

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `paymentDays` | `number` | Ngày giải ngân | Chọn: `14`, `30`, `90` ngày |
| `paymentInterestRate` | `number` (%/tháng) | Lãi suất | Mặc định theo kỳ: 14 ngày → 0.10%, 30 ngày → 0.25%, 90 ngày → 0.75% |

> **Công thức**: `lãi/đơn vị = (rate/30) × paymentDays × costPerUnit`

---

### 2.8 Hoa hồng

| Field | Kiểu | Nhãn UI | Ghi chú |
|---|---|---|---|
| `commissionUnit` | `'percent' \| 'vnd'` | Đơn vị hoa hồng | Chọn `%` hoặc `VND` |
| `commissionInputValue` | `number` | Giá trị nhập | Số nhập vào ô, trước khi convert |
| `commissionRate` | `number` (0–1) | — | Tự tính: `commissionInputValue/100` khi unit=percent |
| `commissionFixedVND` | `number` (đ) | — | Tự tính: `commissionInputValue` khi unit=vnd |

> **Hint động**:  
> - Nếu `%` → hiện `= X đ/túi` (= rate × costPerUnit)  
> - Nếu `VND` → hiện `= X% (trên giá vốn+LN)` (= fixedVND / costPerUnit)

---

### 2.9 Cột lợi nhuận (ẩn — tự động)

| Field | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `profitColumn` | `1 \| 2` | `2` | Auto: `1` nếu đơn giản (≤2 lớp, không AL/MPET, không zipper, không đáy đứng); `2` cho phức tạp |

---

### 2.10 Điều kiện validate để Tính Giá

Tất cả phải đúng:
- `productType` không rỗng
- `bagType` không rỗng (nếu là túi)
- `filmType` không rỗng (nếu là màng)
- `quantity > 0`
- `spreadWidth > 0`
- `cutStep > 0`
- `numColors !== null`
- `layer1Id !== null`

---

## 3. VẬT LIỆU — Material

| Field | Kiểu | Ghi chú |
|---|---|---|
| `id` | `string` | Mã định danh (VD: `'OPP20'`, `'PET12'`) |
| `name` | `string` | Tên hiển thị (VD: `'OPP 20mic'`) |
| `group` | `string?` | Nhóm (VD: `'BOPP'`, `'Matt OPP'`). `undefined` = không nhóm |
| `density` | `number` (g/cm³) | Khối lượng riêng (VD: OPP=0.91, PET=1.40, AL=2.70) |
| `thickness` | `number` (mic) | Độ dày mặc định |
| `pricePerKg` | `number` (đ/kg) | Giá nguyên liệu |
| `isPETorPA` | `boolean` | PET hoặc PA → giá mực in = 135 đ/màu/m², còn lại = 120 |
| `adjustableMic` | `boolean?` | Cho phép override độ dày → hiện ô nhập mic tùy chỉnh |
| `rollLength` | `number` (m) | Chiều dài mỗi cuộn NVL (dùng cho bảng MOQ cuộn) |
| `inkPricePerColor` | `number` (đ/màu/m²) | Giá mực in per màu per m². `0` → fallback theo `isPETorPA` |
| `pricePerM2` | `number` (tự tính) | `= pricePerKg × thickness × density / 1000` |

### Danh sách vật liệu mặc định
| Nhóm | Vật liệu | mic | density | đ/kg |
|---|---|---|---|---|
| — | OPP | 20, 30 | 0.91 | 45.000 |
| BOPP | BOPP | 20, 25, 30 | 0.91 | 46.000 |
| Matt OPP | Matt OPP | 20, 30 | 0.91 | 48.000 |
| — | PET | 12, 15, 19 | 1.40 | 62.000 |
| — | PA (NY) | 15, 25 | 1.15 | 78.000 |
| — | CPP | 30, 40, 50 | 0.91 | 42.000 |
| — | LLDPE | 60, 80, 100 | 0.92 | 38.000 |
| — | PE | 50, 80 | 0.92 | 36.000 |
| — | MPET | 12 | 1.40 | 85.000 |
| — | AL | 7, 9 | 2.70 | 120.000 |

---

## 4. HẰNG SỐ HỆ THỐNG — AppConstants

| Field | Mặc định | Ý nghĩa |
|---|---|---|
| `ghepCPSX` | 1.200 đ/m² | Chi phí SX công đoạn ghép |
| `ghepWasteA` | 3.000 | Mẫu số phi hao ghép: `waste = meters/A × B + C` |
| `ghepWasteB` | 20 | Hệ số phi hao biến đổi ghép |
| `ghepWasteC` | 100 | Phi hao cố định mỗi lần ghép (m) |
| `cutWasteA` | 3.000 | Mẫu số phi hao cắt |
| `cutWasteB` | 20 | Hệ số phi hao biến đổi cắt |
| `cutWasteC` | 100 | Phi hao cố định cắt (m) |
| `cutBase` | 971 đ/m² | CPSX cắt cơ sở |
| `cutThreshold1` | 0.07 m² | Ngưỡng diện tích túi nhỏ |
| `cutThreshold2` | 0.20 m² | Ngưỡng diện tích túi trung |
| `cutMult1` | 1.4 | Hệ số cắt túi nhỏ |
| `cutMult2` | 1.2 | Hệ số cắt túi trung |
| `cutMult3` | 0.8 | Hệ số cắt túi lớn |
| `printWasteA` | 6.000 | Mẫu số phi hao in biến đổi |
| `printWasteB` | 40 | Hệ số phi hao in biến đổi |
| `printWasteC` | 50.000 | Ngưỡng độ dài thêm phi hao in |
| `printWasteD` | 400 | Hệ số phi hao in thêm |
| `laborCost` | 1.200 đ/m² | Chi phí nhân công in |
| `zipperPrice` | 378 đ/m | Đơn giá zipper |
| `tapePrice` | 200 đ/m | Đơn giá băng keo |
| `handlePrice` | 1.500 đ/cái | Đơn giá quai |
| `nhuPrice` | 500 đ/m² | Phụ phí nhũ |
| `moPrice` | 300 đ/m² | Phụ phí phủ mờ |
| `cylinderPricePerUnit` | 7.300.000 đ/m² | Đơn giá trục in mặc định |
| `colorSetup` | {1:500, 2:800, …, 8:2600} | Phi hao khởi máy theo số màu (m) |

---

## 5. BẢNG LỢI NHUẬN — ProfitRow

| Ngưỡng CPSX | Cột 1 (đơn giản) | Cột 2 (phức tạp) |
|---|---|---|
| < 5.000.000 đ | 35% | 30% |
| < 20.000.000 đ | 25% | 20% |
| < 100.000.000 đ | 18% | 15% |
| ≥ 100.000.000 đ | 12% | 10% |

> Cột LN được tự động chọn:  
> - **Cột 2** nếu: ≥ 3 lớp vật liệu, hoặc có AL/MPET, hoặc `bagType='dayDung'`, hoặc `hasZipper=true`  
> - **Cột 1** cho các trường hợp còn lại

---

## 6. OUTPUT — CalculateResult

### 6.1 Thông tin cấu trúc & diện tích

| Field | Đơn vị | Công thức / Ý nghĩa |
|---|---|---|
| `structureText` | string | VD: `"OPP 20//PET 12//PE 50"` (tên vật liệu + mic, ghép bằng `//`) |
| `totalThickness` | mic | Tổng mic làm tròn 5: `round((Σmics + (n_lớp-1)×3) / 5) × 5` |
| `totalGSM` | g/m² | `Σ (thickness_i × density_i)` |
| `bagArea` | m² | `spreadWidth × cutStep` |
| `totalArea` | m² | Màng: `= quantity`. Túi: `quantity × bagArea` |
| `filmLength` | m | Chiều dài cuộn TP (màng): `totalArea / (spreadWidth × numImages)` |
| `filmRollArea` | m² | DT mỗi cuộn TP (màng): `spreadWidth × filmRollLength / numImages` |

---

### 6.2 Công đoạn CẮT

| Field | Đơn vị | Công thức |
|---|---|---|
| `cutWidth` | m | `= printWidth = spreadWidth × numImages + 0.02` |
| `cutMeters` | m | Túi: `cutStep × quantity / numImages`. Màng: `totalArea / (spreadWidth × numImages)` |
| `cutWaste` | m | `cutMeters / wasteA × wasteB + wasteC` |
| `cutCPSX` | đ/m² | `cutBase × hệ_số` (theo ngưỡng diện tích). Màng = 0 |
| `cutCostCPSX` | đ | `cutCPSX × (cutMeters + cutWaste) × cutWidth` |

---

### 6.3 Công đoạn GHÉP (Lớp 2–5)

Mỗi lớp ghép trả về:

| Field | Ý nghĩa |
|---|---|
| `layerNum` | Số thứ tự lớp (2–5) |
| `material` | Object vật liệu |
| `width` | Khổ (= `printWidth`) |
| `meters` | Mét đầu vào từ công đoạn sau |
| `waste` | Phi hao: `meters / ghepWasteA × ghepWasteB + ghepWasteC` |
| `cpsx` | CPSX ghép = `ghepCPSX` |
| `costCPSX` | `cpsx × (meters + waste) × width` |
| `costMat` | `material.pricePerM2 × (meters + waste) × width` |

---

### 6.4 Công đoạn IN (Lớp 1)

| Field | Đơn vị | Công thức |
|---|---|---|
| `printNLWidth` | m | `= spreadWidth × numImages + 0.02` |
| `printMeters` | m | `cutMeters + cutWaste + Σ(phiHao_ghép_i)` |
| `printWaste` | m | `colorSetup[numColors] + printMeters/A×B + (nếu>C: printMeters/C×D)`. `0` nếu không in |
| `printCPSX` | đ/m² | `numColors × inkPricePerColor × coverageRatio + laborCost + metallicSurcharge` |
| `printCostCPSX` | đ | `printCPSX × (printMeters + printWaste) × printNLWidth` |
| `printCostMaterial` | đ | `layer1.pricePerM2 × (printMeters + printWaste) × printNLWidth` |

---

### 6.5 Tổng chi phí & Lợi nhuận

| Field | Đơn vị | Công thức |
|---|---|---|
| `totalProductionCost` | đ | `printTotal + Σlaminations + cutCostCPSX` |
| `profitRate` | % | Tra bảng LN theo `totalProductionCost` và `profitColumn` |
| `profitAmount` | đ | `profitRate × totalProductionCost` |
| `revenue` | đ | `totalProductionCost + profitAmount` |
| `costPerUnit` | đ/đv | `revenue / quantity` |

---

### 6.6 Phụ kiện (đ/đơn vị & tổng)

| Field | Công thức |
|---|---|
| `zipperPerUnit` | `cutStep × zipperPrice` (nếu `hasZipper`) |
| `zipperTotal` | `zipperPerUnit × quantity` |
| `tapePerUnit` | `cutStep × tapePrice` (nếu `hasTape`) |
| `tapeTotal` | `tapePerUnit × quantity` |
| `handlePerUnit` | `handlePrice` (nếu `hasHandle`) |
| `handleTotal` | `handlePerUnit × quantity` |

---

### 6.7 Đóng gói

| Trường hợp | Công thức |
|---|---|
| **Túi**: `boxPerUnit` | `boxPrice × (quantity/bagsPerBox) / quantity` |
| **Màng**: `boxPerUnit` | `boxPrice / filmRollArea` (đ/m²) |
| `numBoxes` | Túi: `quantity/bagsPerBox`. Màng: `quantity/filmRollArea` |

---

### 6.8 Vận chuyển, Lãi vay, Hoa hồng

| Field | Công thức |
|---|---|
| `shippingTotal` | `shippingPerKm × shippingKm` |
| `shippingPerUnit` | `shippingTotal / quantity` |
| `interestPerUnit` | `(paymentInterestRate / 30) × paymentDays × costPerUnit` |
| `commissionPerUnit` | VND mode: `commissionFixedVND`. % mode: `commissionRate × costPerUnit` |

---

### 6.9 Giá bán cuối

```
finalPrice = costPerUnit
           + zipperPerUnit
           + tapePerUnit
           + handlePerUnit
           + boxPerUnit
           + shippingPerUnit
           + interestPerUnit
           + commissionPerUnit
```

---

### 6.10 Trục in (tính riêng, không cộng vào finalPrice)

| Field | Công thức |
|---|---|
| `cylArea` | `cylLength × cylCircum` |
| `cylinderCostPerUnit` | `cylArea × cylUnitPrice` (giá 1 trục) |
| `cylinderCost` | `cylinderCostPerUnit × numColors` (cả bộ trục) |
| `productionDays` | `ceil(quantity / 30.000) + 4` |

---

### 6.11 Trọng lượng

| Field | Công thức |
|---|---|
| `tareWeight` | `totalGSM × unitArea + handleWeight + extraAccessoryWeight` (gr) |
| `unitArea` | Túi: `bagArea`. Màng: `1.0` m² |

---

## 7. GIAO DIỆN KẾT QUẢ — ManagerView

### 7.1 Price Hero (luôn hiển thị trên cùng)

| Thành phần | Nội dung |
|---|---|
| **Label** | `"Giá chốt / túi"` hoặc `"Giá đề xuất / m²"` |
| **Số lớn (gradient)** | `finalPrice` hoặc `chotGia` (đ, làm tròn số nguyên) |
| **Sub** | `(giá đề xuất X đ/túi)` — chỉ hiện khi đã chốt giá |
| **Đơn vị** | `(chưa VAT)` |
| **Giá/cuộn** (màng) | `shownPrice × filmRollArea` — hiện khi `filmRollArea > 0` |
| **Info grid** | Chất liệu, SL, Số màu, KT (mm×mm), Độ dày (mic), DT 1 túi/băng, TL (gr), Loại túi/màng, Thông tin trục |

### 7.2 Chốt giá

| Thành phần | Hành động |
|---|---|
| Input `chotGia` | Nhập giá bán thực tế (số nguyên) |
| Nút **✓ Lưu giá chốt** | Lưu `chotGia` vào history item hiện tại |
| Nút **💾 Lưu báo giá** | Thêm bản ghi vào `history[]` |

### 7.3 Chốt analysis (hiện khi có `chotGia > 0`)

| Dòng | Công thức |
|---|---|
| Chênh lệch / đv | `chotGia - finalPrice` |
| Doanh thu tổng | `chotGia × quantity` |
| LN công ty | `doanhThuChot - tongChiPhi - tongHoaHong` |
| % Hoa hồng | `newCommissionPerUnit / costPerUnit` |

### 7.4 Stat Grid 4 cards

| Card | Giá trị | Màu |
|---|---|---|
| Lợi Nhuận | `profitAmount` (đ) + `(profitRate%)` | Xanh lá |
| Doanh thu | `revenue` (đ) | Cyan |
| Giá Bán/đv | `finalPrice` (đ) | Cam |
| Hoa Hồng | `commissionTotal` (đ) + sub `X đ/đv (Y%)` | Hồng |

### 7.5 Chi tiết giá (Collapsible — đóng khi có kết quả mới)

Danh sách breakdown:

| Dòng | Công thức |
|---|---|
| Giá ban đầu (Vốn + X% LN) | `costPerUnit` |
| Chi phí Zipper | `zipperPerUnit` (ẩn nếu = 0) |
| Chi phí Băng keo | `tapePerUnit` (ẩn nếu = 0) |
| Chi phí Quai | `handlePerUnit` (ẩn nếu = 0) |
| Chi phí Thùng / Đóng gói | `boxPerUnit` |
| Chi phí Vận chuyển | `shippingPerUnit` |
| Lãi vay vốn (X%) | `interestPerUnit` |
| Hoa hồng kinh doanh | `commissionPerUnit` |
| **GIÁ BÁN ĐỀ XUẤT** | `finalPrice` (cam đậm) |
| **GIÁ BÁN CHỐT** | `chotGia` ± diff (xanh, chỉ hiện khi có chốt) |

### 7.6 Bảng Đặc tả kỹ thuật & nguyên liệu (Collapsible, 10 cột)

Cột: `Công đoạn | Vật liệu | Khổ (m) | Thành phẩm (m) | Phi hao | Đầu vào VL | CPSX đ/m² | T.tiền CPSX | CP VL đ/m² | T.tiền CPVL`

Các hàng:
- `CPSX IN` — lớp 1
- `GHÉP (Lớp N)` — lớp 2–5 (nếu có)
- `CẮT` — chỉ túi

Hàng cuối: **TỔNG GIÁ VỐN SẢN XUẤT** = `totalProductionCost`

> Khổ hiển thị = `spreadWidth × numImages + 0.02` (trừ hàng CẮT dùng `cutWidth`)  
> Thành phẩm = `meters / numImages`  
> Phi hao = `waste / numImages`  
> Đầu vào VL = TP + Phi hao

### 7.7 Bảng MOQ (Collapsible)

Mức SL: `5k, 10k, 15k, 20k, 30k, 40k, 50k, 70k, 100k, 150k, 200k` + mức hiện tại (nếu chưa có trong danh sách)

Cột: `Số lượng | LN% | Giá vốn+LN/đv | Giá đề xuất | Tổng DT | [tên vật liệu lớp 1] | [tên VL lớp 2]…`

Cột vật liệu hiện: `X m / (Y kg)`

> Dòng tô sáng = số lượng hiện tại

### 7.8 Bảng MOQ Cuộn Màng (Collapsible)

- Dropdown chọn lớp vật liệu (IN hoặc GHÉP)
- LLDPE/PE → tính theo **KG** (200kg, 300kg, …, 700kg)
- Còn lại → tính theo **cuộn** (1, 2, …, 6 cuộn)
- Tìm `estQty` bằng binary search: số lượng túi/m² vừa đủ dùng `availableMeters`

Cột: `Chỉ số cuộn/KG | SL túi | [lớp khác] | Giá đề xuất | Tổng DT`

### 7.9 Trọng lượng & Vận chuyển (Collapsible)

| Dòng | Túi | Màng |
|---|---|---|
| Diện tích 1 đv | `bagArea` m² | `bagArea` m²/m dài |
| Tổng diện tích | `totalArea` m² | `totalArea` m² |
| Trọng lượng/đv | `tareWeight` gr | — |
| Tổng KG | `tareWeight × qty / 1000` | — |
| Tấn | ÷ 1000 | — |
| Chiều dài cuộn TP | — | `filmRollLength` m/cuộn |

---

## 8. GIAO DIỆN KẾT QUẢ — TechView

### 8.1 Info box
`"Chỉ Đạo Sản Xuất: [structureText]"`

### 8.2 Stat Grid 4 cards

| Card | Công thức | Màu |
|---|---|---|
| Đầu Vào Khâu In | `(printMeters + printWaste) / numImages` m | Tím (accent) |
| Đầu Vào Khâu Cắt | `(cutMeters + cutWaste) / numImages` m | Cyan (ẩn nếu màng) |
| Khổ Thành Phẩm | `spreadWidth` m | Xanh lá |
| Khổ Màng NL | `spreadWidth × numImages + 0.02` m | Cam |

### 8.3 Bảng Chi tiết SX & Nguyên liệu (6 cột)

`Công đoạn | Vật liệu | Khổ (m) | Thành phẩm (m) | Phi hao | Đầu vào VL`

> Đầu vào VL được **bold + màu accent** — đây là con số quan trọng nhất cho kỹ thuật

### 8.4 Bảng Trọng lượng & Vận chuyển

(Giống Manager View phần 7.9)

---

## 9. TOC SIDEBAR (Desktop ≥ 1100px)

Danh sách neo tới 5 section:
1. Bảng Báo Giá Gợi Ý
2. Bảng Đặc Tả Kỹ Thuật
3. Bảng Giá Theo MOQ
4. Bảng MOQ Cuộn Màng
5. Trọng Lượng & Vận Chuyển

---

## 10. LUỒNG DỮ LIỆU & TRẠNG THÁI ĐẶC BIỆT

### 10.1 Auto-tính (real-time, không cần bấm nút)
- Bất kỳ thay đổi input → engine chạy lại ngay
- Kết quả cập nhật tức thì trên tất cả panel

### 10.2 Collapsible cards reset
- Mỗi khi có kết quả mới (chuỗi cấu trúc thay đổi) → tất cả CollapsibleCard về **đóng**

### 10.3 Nút "Tính Giá"
- Chỉ validate + thêm vào `history[]` + hiện alert giá
- Không trigger tính (đã tính tự động)

### 10.4 Bảng Override (Sale/Admin — Next.js only)
- Sale có thể chỉnh `width`, `inputVL`, `matPrice` cho từng công đoạn
- Admin có thể chỉnh lại (overrides Sale)
- Thay đổi override → tính lại `effTotalProdCost` → `effFinalPrice`
- Key: `'print'`, `'lam-2'`…`'lam-5'`, `'cut'`

### 10.5 Vai trò người dùng
| Role | Quyền |
|---|---|
| `admin` | Toàn quyền — sửa override, xem tất cả module |
| `sale` | Xem máy tính, lịch sử, khách hàng. Sửa override Sale khi báo giá ở trạng thái `drafted` |
| `purchase` | Xem LSX, bảng định mức |

### 10.6 Trạng thái báo giá (QuoteStatus)
`drafted` → `sent` → `pending_approval` → `approved` → `completed`

---

## 11. COPY TEXT FORMAT

Khi bấm **📋 Copy**, clipboard nhận chuỗi:
```
{customer} — {productName}
Cấu trúc: {structureText} | Độ dày: {totalThickness}mic
SL: {quantity} túi | KT: {spreadMm}×{cutMm} mm²          (hoặc Diện tích / KT / Cuộn cho màng)
GIÁ ĐỀ XUẤT: {finalPrice} đ/túi (chưa VAT)
Giá vốn: {costPerUnit} | LN: {profitRate}% | DT: {revenue}tr
Trục in: {cylinderCost}tr (riêng)
```
