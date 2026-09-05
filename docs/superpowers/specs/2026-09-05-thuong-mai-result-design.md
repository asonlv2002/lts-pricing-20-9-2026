# Tính giá Thương mại — Trang kết quả dùng chung

**Ngày:** 2026-09-05
**Trạng thái:** Approved (user xác nhận "Làm đi")
**Phạm vi:** apps/web (Tính giá thương mại — cả 2 sub-mode: form + description)
**Phụ thuộc:** spec `2026-09-04-tinh-gia-thuong-mai-design.md`

## 1. Tổng quan

Trang kết quả `ManHinhQuanLy` đang có **2 nhánh render riêng** cho thương mại:
- `commercialMode === 'form'` → chạy path form-mode (line 1900-2240): đầy đủ price-hero + chot-gia-row + stat-grid + breakdown + nút Lưu/Xem.
- `commercialMode === 'description'` → chạy path custom (line 1339-1431): chỉ price-hero rút gọn + 2 breakdown "Chi tiết giá đề xuất" + "Trọng lượng & Vận chuyển". **THIẾU** `chot-gia-row` (Giá bán chốt + Phân bổ chênh lệch), 4 stat-cards, nút Lưu/Xem. Cũng **không hiển thị** `commercialDescription` ở bất kỳ đâu.

User yêu cầu: khi chọn "Mô tả khác", trang kết quả phải hiển thị **y hệt** "Nhập theo form tính giá" — cùng khối UI, cùng nút Lưu, cùng cách mở lại từ lịch sử.

## 2. Phạm vi thay đổi

| Layer | File | Mục đích |
|---|---|---|
| Engine helper | `apps/web/src/lib/engine.ts` | Thêm `synthesizeResultFromCommercial()` — tạo `CalculateResult`-shaped từ commercial input |
| Page | `apps/web/src/app/page.tsx` | Luôn tính `ketQuaThuongMai` khi `laThuongMai` (bỏ gate `commercialMode === 'form'`) |
| Result | `apps/web/src/components/ManHinhQuanLy.tsx` | (a) Xóa early-return description-mode (line 1339-1431); (b) Fallback `ketQua` từ synthesize khi engine null & commercial; (c) Thay `rHieuLuc.structureText` → `commercialDescription` ở description mode; (d) Ẩn 2 `TheThuGon` (Chi tiết + Trọng lượng&VC) khi description thiếu data |
| Spec cũ | `docs/superpowers/specs/2026-09-04-tinh-gia-thuong-mai-design.md` | Cập nhật section 6.4 cho khớp code mới |
| Regression | `scripts/test-mo-thuong-mai-tu-lich-su.mjs` | Cập nhật assertion (line 117-126) — result giờ dùng path chung |

## 3. Data flow

### 3.1 Trước (hiện tại)

```
input → calculateForInput() → ketQua (null nếu description mode — không có data kỹ thuật)
                                       │
page.tsx: ketQuaThuongMai = laThuongMai && form  →  tinhGiaThuongMai(input)
                                       │
ManHinhQuanLy:
  ├─ commercial+description  →  return <custom view line 1339-1431>   (THIẾU stat/chốt/buttons)
  └─ form / non-commercial   →  return <full render path 1900-2240>
```

### 3.2 Sau

```
input → calculateForInput() → ketQua
       │ ketQua có thể null (description mode)
       │
       └─ NẾU null && isCommercial:
           ketQua = synthesizeResultFromCommercial(input, hangSo, materials)
           (cost basis từ tinhGiaThuongMai, các field engine khác = 0/'')
                                       │
page.tsx: ketQuaThuongMai = laThuongMai  →  tinhGiaThuongMai(input)    [luôn tính]
                                       │
ManHinhQuanLy: 1 render path duy nhất (1900-2240)
  • form mode: dùng engine kết quả
  • description mode: dùng synthesized result
  • Cùng có: price-hero, chot-gia-row, stat-grid, breakdown, nút Lưu mới
  • Riêng description mode:
      - rHieuLuc.structureText được thay bằng input.commercialDescription
      - ẨN 2 TheThuGon (Chi tiết + Trọng lượng&VC) khi
        !commercialPurchasePrice || !commercialProfitValue
```

## 4. Synthesized result helper

Thêm vào `apps/web/src/lib/engine.ts` (cùng file với `tinhGiaThuongMai`):

```ts
/** Tạo CalculateResult-shaped từ commercial input (dùng khi description mode). */
export function synthesizeResultFromCommercial(
  input: CalculateInput,
  hangSo: AppConstants,
  materials: Material[]
): CalculateResult {
  const tm = tinhGiaThuongMai(input);
  const qty = Math.max(0, Number(input.quantity) || 0);
  const loaiThung = (hangSo.boxOptions ?? []).find(
    (o: any) => o.key === input.boxOptionKey
  );
  const giaThung = loaiThung
    ? loaiThung.price
    : Math.max(0, Number(input.boxPrice) || 0);
  const soTuiMotThung = Math.max(1, Number(input.bagsPerBox) || 1);
  const thungPerUnit = giaThung / soTuiMotThung;
  const phiVC = Math.max(0, Number((input as any).shippingFee) || 0);
  const vcPerUnit = qty > 0 ? phiVC / qty : 0;
  const finalPrice = tm.unitPriceVnd + vcPerUnit + thungPerUnit + tm.extraFeePerUnit;
  return {
    input,
    finalPrice,
    costPerUnit: tm.unitPriceVnd,
    profitRate: tm.profitPct,
    profitAmount: tm.profitVnd * qty,
    interestPerUnit: 0,
    shippingPerUnit: vcPerUnit,
    shippingTotal: phiVC,
    commissionPerUnit: 0,
    commissionTotal: 0,
    boxPerUnit: thungPerUnit,
    boxTotal: giaThung,
    tapePerUnit: 0,
    handlePerUnit: 0,
    zipperPerUnit: 0,
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
    cylAllocPerUnit: 0,
    cylinderCost: 0,
    cylinderCostPerUnit: 0,
    cylLength: 0,
    cylCircum: 0,
    totalThickness: 0,
    bagArea: 0,
    tareWeight: 0,
    filmRollArea: 0,
    structureText: input.commercialDescription || 'Mô tả khác',
    layers: { print: null, laminations: [] },
    totalProductionCost: tm.unitPriceVnd * qty,
    gcShippingPerUnit: 0,
    gcPackagingPerUnit: 0,
    gcOtherPerUnit: 0,
    gcShippingTotal: 0,
    gcPackagingTotal: 0,
    gcOtherTotal: 0,
  } as unknown as CalculateResult;
}
```

## 5. UI thay đổi — `ManHinhQuanLy.tsx`

### 5.1 Xóa early-return description-mode

Xóa toàn bộ block line 1338-1431:
```ts
if (isCommercial && commercialMode === 'description') {
  // ... 90+ dòng custom view ...
  return (...);
}
```

### 5.2 Fallback `ketQua` trước khi check `!ketQua`

Ngay sau dòng khai báo `const r = ketQua;` (line 1442), chèn:

```ts
// Tính giá Thương mại — description mode: engine trả null do thiếu data kỹ thuật.
// Fallback sang synthesized result để dùng chung render path với form mode.
let r = ketQua;
if (!r && isCommercial) {
  r = synthesizeResultFromCommercial(input, hangSo, materials);
}
```

### 5.3 Thay `structureText` bằng `commercialDescription` ở description mode

Line 1939 hiện tại:
```tsx
<div><strong>Chất liệu:</strong> {rHieuLuc.structureText}</div>
```

Đổi thành:
```tsx
{isCommercial && commercialMode === 'description' ? (
  <div style={{ maxWidth: 600, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
    <strong>📝 Mô tả:</strong> {input.commercialDescription || '(chưa nhập mô tả)'}
  </div>
) : (
  <div><strong>Chất liệu:</strong> {rHieuLuc.structureText}</div>
)}
```

### 5.4 Ẩn 2 breakdown khi description thiếu data

Điều kiện ẩn:
```ts
const anBreakdownThuongMaiMoTa =
  isCommercial && commercialMode === 'description'
  && (!Number(input.commercialPurchasePrice) || !Number(input.commercialProfitValue));
```

Áp dụng cho:
- Line 2214-2239: `<TheThuGon title={<>💰 Chi tiết giá...</>}>` — wrap với `{!anBreakdownThuongMaiMoTa && (...)}`
- Line 2671-2684: `<TheThuGon title={<>⚖️ Trọng lượng &amp; Vận chuyển</>}>` — wrap với `{!anBreakdownThuongMaiMoTa && (...)}`

Khi ẩn, thay bằng 1 card placeholder:
```tsx
{anBreakdownThuongMaiMoTa && (
  <div className="card" style={{ marginBottom: 14, padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
    <div style={{ fontSize: '0.86rem' }}>
      💡 Nhập <strong>Đơn giá mua</strong> + <strong>Lợi nhuận</strong> ở mục [Thu mua] để hiện Chi tiết giá &amp; Trọng lượng.
    </div>
  </div>
)}
```

## 6. Page integration — `page.tsx`

Line 33 + line 147 (2 chỗ trùng nhau), đổi:
```ts
// Trước
const ketQuaThuongMai = laThuongMai && cheDoHienThiThuongMai === 'form' ? tinhGiaThuongMai(input) : null;

// Sau
const ketQuaThuongMai = laThuongMai ? tinhGiaThuongMai(input) : null;
```

## 7. Khả năng Lưu / Mở lại (regression check)

- Nút "📄 Lưu mới" / "💾 Lưu báo giá" trong render path form-mode (line 2045-2137) gọi `themVaoLichSu()` + `syncPricingSheetToServer()`. Vì path này dùng chung → description mode cũng lưu được. Store đã persist `pricingMode='commercial'` + `commercialMode` + `commercialDescription` (xem `history.ts:149`, `pricing-sheet-mapper.ts:223`).
- Mở lại từ lịch sử: `ModuleDanhSachTinhGia.tsx:217` route `tao-tinh-gia-thuong-mai` → `page.tsx:201-216` restore `pricingMode='commercial'` + `commercialMode` → render đúng mode cũ. Tab-switch effect (line 163-185) đã handle "mở từ lịch sử" không reset form.
- "👁 Xem" — chỉ hiện khi `nangCap=true` (đặc tả nâng cao). Không áp dụng cho commercial → không cần đổi.
- **Không cần đổi** `pricing-sheet-mapper.ts` / `history.ts` / `store/CuaHangTinhGia.ts` — schema & store đã sẵn sàng.

## 8. Edge cases

| Case | Hành vi |
|---|---|
| Description + `quantity = 0` | stat-card "Doanh thu" = 0, breakdown vẫn hiện (per-unit) |
| Description + `quantity > 0` + không mua/LN | stat-card "Giá Bán/túi" = 0, breakdown ẨN → hiện card hint |
| Description + có mua + LN | breakdown hiện đầy đủ (giống form) |
| Form → description | Giữ nguyên `commercialPurchasePrice` / `commercialProfitValue` / `commercialUnitWeight` |
| Description → form | Giữ nguyên + thêm "Số lượng" + "Loại sản phẩm" + "Cấu trúc" |
| Đổi `pricingMode` từ commercial → internal/outsource | `resetInput()` đã xóa field `commercial*` (xem `store/helpers.ts:66`) |
| Mở lại từ lịch sử | Tab-switch effect giữ form, render path dùng `loadedHistoryId` |
| `commercialProfitValue = 0` với `commercialProfitUnit = 'percent'` | Profit = 0, hiện breakdown = cost basis (không lỗ) |

## 9. Testing

### 9.1 Unit mới — `synthesizeResultFromCommercial`

File: `apps/web/src/lib/engine-thuong-mai-synthesize.test.ts`

4 case:
1. `quantity=50000`, purchase=280, profit=5% → `finalPrice=294+vcPerUnit+thùngPerUnit+extraPerUnit`
2. `quantity=0`, purchase=280, profit=5% → `profitAmount=0`, stat-card "Doanh thu"=0
3. `quantity=50000`, purchase=280, profit=0 → `profitRate=0`, breakdown chỉ có cost basis
4. `commercialDescription="Báo giá..."` → `structureText="Báo giá..."`

### 9.2 Unit cũ — `tinhGiaThuongMai` (`engine-thuong-mai.test.ts`)

Không đổi. Vẫn pass 4 case cũ (percent/vnd × có/không giá mua).

### 9.3 Manual

1. Mở form mode → nhập mua 280đ + LN 5% + KL 25gr → switch sang description → vẫn thấy breakdown đầy đủ
2. Mở description mode trắng → chỉ thấy price-hero (giá "—") + 4 stat-card 0 đ + card hint
3. Nhập mua + LN trong description mode → breakdown hiện
4. Lưu mới → mở lại từ lịch sử → render đúng như lúc lưu

### 9.4 Regression

- `pnpm type-check`
- `pnpm test`
- `node scripts/test-mo-thuong-mai-tu-lich-su.mjs` — cập nhật line 117-126:
  - Trước: assert description có `Chi tiết giá đề xuất` + `Trọng lượng & Vận chuyển`
  - Sau: assert description có thêm `Giá bán chốt` + `Phân bổ chênh lệch` + 4 stat cards (Lợi nhuận / Doanh thu / Giá Bán/túi / Hoa hồng)
