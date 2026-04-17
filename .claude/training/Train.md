# TRAIN.md — Sổ tay công thức tính giá bao bì LTS

**Mục đích:** Tài liệu này là **nguồn chân lý duy nhất** về công thức tính giá. Trước khi sửa bất kỳ thứ gì trong `src/lib/engine.ts`, Claude (và người dev) PHẢI đọc file này. Mọi công thức trong code phải khớp với file này — nếu khác thì code sai, không phải file này sai.

> **Quy tắc vàng:** Khi được yêu cầu sửa công thức, LUÔN đọc `.claude/training/Train.md` trước khi sửa `engine.ts`.

---

## 1. Nguyên lý cốt lõi

### 1.1. Phương trình NVL
```
NVL (nguyên vật liệu) = Thành phẩm + Phi hao
```
- **KHÔNG** nhân với số con hình (`numImages`)
- **KHÔNG** nhân với số lớp
- Phi hao là đại lượng CỘNG vào, không phải NHÂN vào

### 1.2. Vai trò của `numImages` (số con hình xếp ngang trên trục in)
`numImages` chỉ ảnh hưởng tới **hình dạng cuộn**, KHÔNG làm tăng vật liệu:

| Đại lượng | Công thức | Ghi chú |
|-----------|-----------|---------|
| Khổ cuộn (in/ghép/cắt) | `spreadWidth × numImages + 0.02` | Nhân lên ngang |
| Chiều dài cuộn | `totalArea / (spreadWidth × numImages)` | Chia xuống dọc |
| **Diện tích cuộn** | `khổ × dài = totalArea + lề` | **KHÔNG đổi** theo numImages |

→ Nhiều con hình = cuộn ngắn & rộng. Ít con hình = cuộn dài & hẹp. Tổng m² như nhau.

### 1.3. Quy đổi `quantity`
| productType | Đơn vị `quantity` | totalArea |
|-------------|-------------------|-----------|
| `'mang'` (màng) | **m²** (thẳng) | `totalArea = quantity` |
| `'tui'` (túi) | **số cái** | `totalArea = quantity × bagArea` |

`bagArea = spreadWidth × cutStep` (m² / 1 túi)

---

## 2. Công thức từng công đoạn

### 2.1. Công đoạn CẮT (cuối dây chuyền, khách hàng giao tp)

```
cutWidth = spreadWidth × numImages + 0.02   (= printWidth)

cutMeters (túi)  = cutStep × quantity / numImages
cutMeters (màng) = totalArea / (spreadWidth × numImages)

cutWaste = cutMeters / cutWasteA × cutWasteB + cutWasteC
         (mặc định: A=3000, B=20, C=100)

cutCPSX (túi):
  if bagArea < 0.07  → cutBase × 1.4
  elif bagArea < 0.2 → cutBase × 1.2
  else               → cutBase × 0.8

cutCPSX (màng) = 0  (màng không qua công đoạn cắt riêng)

cutCostCPSX = cutCPSX × (cutMeters + cutWaste) × cutWidth
cutTotalCost = cutCostCPSX   (chỉ CPSX, vật liệu cắt thuộc công đoạn ghép/in)
```

> ⚠️ **Bug cũ (đã sửa 2026-04-17):** `cutMeters` từng KHÔNG chia `numImages` → cost bị nhân dư `numImages` lần. Công thức đúng đã có `/ numImages`.

### 2.2. Công đoạn GHÉP (lamination — từ cắt lên trên)

Chuỗi ghép xử lý theo thứ tự: layer2 (gần cắt nhất) → layer3 → layer4 → layer5.

```
needed_0 = cutMeters + cutWaste

Với mỗi layer (2→5):
  width = cutWidth     (= spreadWidth × numImages + 0.02)
  meters = needed_{i-1}
  waste = meters / ghepWasteA × ghepWasteB + ghepWasteC
  costCPSX = ghepCPSX × (meters + waste) × width
  costMat  = layer.pricePerM2 × (meters + waste) × width
  lamTotal_i = costCPSX + costMat
  needed_i = meters + waste   (phế hao được truyền xuôi)
```

### 2.3. Công đoạn IN (trên cùng — layer1)

```
printNLWidth = cutWidth = spreadWidth × numImages + 0.02
printMeters  = cutMeters + cutWaste + Σ(lamWaste)

cSetup = colorSetup[numColors] (VND — phi hao khởi máy)

printWaste = cSetup
           + printMeters / printWasteA × printWasteB
           + (printMeters > printWasteC ? printMeters / printWasteC × printWasteD : 0)

inkPrice = layer1.inkPricePerColor ?? (isPETorPA ? 135 : 120)

printCPSX = numColors × inkPrice × coverageRatio + laborCost + metallicSurcharge

printCostCPSX     = printCPSX × (printMeters + printWaste) × printNLWidth
printCostMaterial = layer1.pricePerM2 × (printMeters + printWaste) × printNLWidth
printTotalCost    = printCostCPSX + printCostMaterial
```

### 2.4. Trục in (cylinder)

```
cylLength = max(0.7, spreadWidth × numImages + 0.1)
cylArea   = cylLength × cylCircum
cylinderCostPerUnit = cylArea × cylUnitPrice
cylinderCost        = cylinderCostPerUnit × numColors
```

Cảnh báo: `cylLength < 0.7` → dưới tối thiểu; `> 1.25` → vượt tối đa (không in được).

### 2.5. Tổng chi phí & lãi

```
totalProductionCost = printTotalCost + totalLamCost + cutTotalCost
profitRate   = lookupProfit(totalProductionCost, profitColumn, profitTable)
profitAmount = profitRate × totalProductionCost
revenue      = totalProductionCost + profitAmount
costPerUnit  = revenue / quantity
```

### 2.6. Phụ kiện (chỉ áp dụng cho túi)

```
zipperTotal = hasZipper ? quantity × cutStep × zipperPrice : 0
tapeTotal   = hasTape   ? quantity × cutStep × tapePrice   : 0
handleTotal = hasHandle ? quantity × handlePrice           : 0
```

### 2.7. Đóng gói

**Túi:**
```
numBoxes  = quantity / bagsPerBox
boxTotal  = boxPrice × numBoxes
boxPerUnit = boxTotal / quantity
```

**Màng:**
```
filmRollArea = spreadWidth × filmRollLength / numImages
packagingPerUnit = boxPrice / filmRollArea   (VND/m²)
numBoxes = quantity / filmRollArea           (số cuộn)
```

### 2.8. Giá cuối

```
finalPrice = costPerUnit
           + zipperPerUnit + tapePerUnit + handlePerUnit
           + boxPerUnit
           + shippingPerUnit
           + interestPerUnit
           + commissionPerUnit
```

---

## 3. DANH MỤC CẤM (CHECKLIST trước khi commit)

Mỗi gạch đầu dòng dưới đây là một lỗi đã xảy ra trong quá khứ — **KHÔNG BAO GIỜ** lặp lại:

- [ ] ❌ **CẤM** nhân `totalArea` với `bagArea` cho `productType === 'mang'` (quantity màng đã là m²)
- [ ] ❌ **CẤM** nhân `cutMeters` với `numImages` — phải **CHIA** cho numImages (hoặc chia cho `spreadWidth × numImages`)
- [ ] ❌ **CẤM** nhân NVL với số lớp ghép (phi hao cộng, không nhân)
- [ ] ❌ **CẤM** dùng vòng lặp bội số `nCalc` cho trục in — công thức phẳng: `max(0.7, spreadWidth × numImages + 0.1)`
- [ ] ❌ **CẤM** cộng lề 0.02 vào `filmLength` (lề đã nằm trong khổ ngang)
- [ ] ❌ **CẤM** tính cutCPSX cho màng (màng không cắt riêng)
- [ ] ❌ **CẤM** hardcode phế hao A/B/C — phải đọc từ `constants`

---

## 4. Kiểm tra nhanh (sanity check)

Khi Claude vừa sửa engine, chạy mấy check này bằng đầu:

### Test 1 — Đổi numImages phải giảm hoặc giữ nguyên cost
- Input: quantity=10000 túi, spreadWidth=0.2, cutStep=0.3
- numImages=1 vs numImages=2 → **cost/túi phải GIẢM (hoặc bằng)**, không được tăng
- Nếu tăng → sai công thức `cutMeters`

### Test 2 — Màng quantity=1000 m² không được tính như 1000 túi
- productType='mang', quantity=1000 → `totalArea = 1000`
- productType='tui', quantity=1000, bagArea=0.06 → `totalArea = 60`
- Nếu bằng nhau → sai `totalArea`

### Test 3 — Thêm 1 lớp ghép chỉ tăng cost bằng giá lớp đó + phế hao của lớp đó
- Cộng thêm layer3 chỉ được tăng cost ≈ `pricePerM2 × (meters + waste) × width`
- Nếu tăng gấp 2-3 lần → chuỗi waste truyền sai

### Test 4 — Trục in
- spreadWidth=0.3, numImages=3 → `cylLength = 0.3×3 + 0.1 = 1.0` (OK)
- spreadWidth=0.5, numImages=3 → `cylLength = 1.6` → cảnh báo vượt 1.25m

---

## 5. Flow đề xuất khi sửa công thức

1. **Đọc file này** trước
2. Viết **1 test case** trong `src/lib/engine.test.ts` tái hiện bug (đỏ)
3. Sửa `engine.ts` để test xanh
4. Chạy lại toàn bộ 35 test — không được có test nào chuyển từ xanh → đỏ
5. Cập nhật file này nếu công thức thay đổi (không chỉ code)
6. Commit cả code + test + Train.md cùng lúc

---

## 6. Các bug đã phát hiện (log)

| Ngày | Bug | File | Trạng thái |
|------|-----|------|------------|
| 2026-04-13 | Màng nhân totalArea với bagArea → thổi m² lên chục ngàn | engine.ts dòng 66 | ✅ Đã sửa |
| 2026-04-13 | Trục in dùng vòng lặp nCalc sai | calculatorStore.ts | ✅ Đã sửa |
| 2026-04-17 | `cutMeters` KHÔNG chia `numImages` → NVL cost bị nhân dư numImages lần | engine.ts dòng 75-77 | ✅ Đã sửa (2026-04-17) |

---

## 7. Thuật ngữ

| Tiếng Việt | Code | Mô tả |
|------------|------|-------|
| Khổ trải | `spreadWidth` | Chiều ngang 1 túi (mở phẳng), m |
| Bước cắt | `cutStep` | Chiều dài 1 túi theo cuộn, m |
| Số con hình | `numImages` | Số túi xếp ngang 1 trục in |
| Diện tích 1 túi | `bagArea` | `spreadWidth × cutStep`, m² |
| Phế hao khởi máy | `cSetup` | VND cố định theo số màu |
| Phế hao chạy máy | `printWaste / ghepWaste / cutWaste` | m² phế hao tỉ lệ với mét cuộn |
| CPSX | `cpsx` | Chi phí sản xuất / m² của công đoạn |
| Bảng LN | `profitTable` | Tra % lợi nhuận theo tổng cost |

---

**Lần cập nhật cuối:** 2026-04-17
**Maintain:** Claude + Dev LTS
