# Workflow tiếp tục - lớp 2 nhiều cấu trúc (2026-05-13)

## Bối cảnh
User đưa `sturdy/index.html` và `sturdy/reuquiment.md` để giải thích yêu cầu giao diện/tính giá cho bao bì có 2 cấu trúc ở lớp 2.
Ý chính:
- Ở phần chọn `Lớp 2` cần có button `[+ Thêm cấu trúc]`.
- Khi thêm cấu trúc, cho chọn thêm vật liệu phụ nhưng phải cùng độ dày với vật liệu lớp 2 chính.
- Độ dày thành phẩm không được cộng đôi 2 vật liệu cùng cấu trúc; dùng độ dày lớp 2 theo `max(lớp 2 chính, lớp 2 phụ)`.
- Khi tính chi phí nguyên vật liệu lớp 2, phải tách riêng từng vật liệu theo khổ riêng, dùng chung mét/phi hao.
- Với trường hợp nhiều con hình/2 con hình đối xứng như sturdy: lớp 2 có thể là PET ở hai mép + MPET ở giữa; tổng chi phí lớp 2 = tổng chi phí từng vật liệu.
- Bảng kết quả/đặc tả NVL phải ghi rõ các cấu trúc con của lớp 2.

## File đã sửa
- `apps/web/src/lib/types.ts`
  - Thêm `CalculateInput.layer2AltId?: string | null`.
  - Thêm `CalculateInput.multiStructureLayers?: Record<string, string[]>` (metadata dự phòng).

- `packages/kieu-du-lieu/src/index.ts`
  - Thêm `DauVaoTinhGia.idLop2Phu?: string | null`.
  - Thêm `DauVaoTinhGia.cauTrucNhieuVatLieu?: Record<string, string[]>`.

- `apps/web/src/lib/engine.ts`
  - Map `layer2AltId` -> `idLop2Phu` khi gọi core engine.
  - Map `multiStructureLayers` -> `cauTrucNhieuVatLieu`.
  - Khi trả kết quả, lamination lớp 2 có thêm `materials` và `chiTietVatLieu` để UI hiển thị breakdown.

- `packages/bang-tinh-gia/src/tinh-gia.ts`
  - Đọc thêm `idLop2Phu` thành `lop2Phu`.
  - Trong vòng tính ghép, nếu `soLop === 2 && lopPhu`:
    - Tính riêng `chiTietVatLieu` cho lớp chính/phụ.
    - Dùng cùng `met` và `hatHao`.
    - Tách khổ: `khoMotCauTruc = khoTrai + 0.01`; nếu `soHinh > 1` thì lớp chính lấy hai mép, lớp phụ lấy phần giữa.
    - `chiPhiVL` lớp 2 = tổng chi phí từng vật liệu.
  - `tongDoDay` dùng `doDayLop2 = max(lop2.doDay, lop2Phu.doDay)`.
  - `chuoiCauTruc` hiển thị lớp 2 dạng `[A mic + B mic]` khi có phụ.
  - `cacLop.ghep` trả thêm `chiTietVatLieu`.

- `apps/web/src/components/TheNhapLieu.tsx`
  - Khi clear `layer2Id`, clear luôn `layer2AltId`.
  - Preview độ dày lớp 2 nhiều cấu trúc dùng `max` giữa chính/phụ.
  - Đã thêm button ngay dưới `renderLayerSelect('Lớp 2', 'layer2Id', ...)`:
    - Nếu chưa có phụ: hiện `+ Thêm cấu trúc`.
    - Nếu đã có phụ: hiện khung `Lớp 2 - cấu trúc phụ`, nút `Bỏ`, và dropdown chỉ lọc vật liệu có cùng `thickness` với vật liệu lớp 2 chính.
  - Lưu ý: output terminal bị lỗi encoding hiển thị chữ `Bỏ` thành `B?`, nhưng file là UTF-8; kiểm tra trên editor nếu cần.

- `apps/web/src/components/ManHinhQuanLy.tsx`
  - Cột vật liệu lamination nếu có `materials.length > 1` sẽ hiển thị label ghép như `PET+MPET`.
  - Thêm `renderMaterialBreakdown(layerData)` để hiển thị từng vật liệu/kho trong bảng MOQ và roll MOQ.
  - `calcKg` fallback dùng `density` nếu không có `matDoHienThi`.

## Kiểm tra đã chạy
- `cmd /c pnpm --filter web exec tsc --noEmit` -> OK.
- `cmd /c pnpm --filter web lint` -> FAIL do lỗi config sẵn có:
  `Cannot find module ... eslint-config-next/core-web-vitals`, có thể cần import `eslint-config-next/core-web-vitals.js` trong `apps/web/eslint.config.mjs`.

## Việc cần làm tiếp
1. Mở web/dev server và kiểm tra UI:
   - Chọn loại sản phẩm + loại túi/màng để hiện phần cấu trúc.
   - Chọn `Lớp 1`, chọn `Lớp 2`.
   - Xác nhận nút `+ Thêm cấu trúc` hiện ngay dưới lớp 2.
   - Bấm nút, chọn vật liệu phụ cùng độ dày.
2. Test case gợi ý:
   - `spreadWidth = 0.18`, `cutStep = ...`, `numImages = 2`.
   - Lớp 2 chính PET, lớp 2 phụ MPET cùng mic.
   - Kiểm tra bảng kết quả có breakdown khổ riêng cho PET/MPET.
3. Nếu user muốn đúng hoàn toàn theo sturdy 180:40:180 + biên 10mm, cần bổ sung input/logic cho đáy/hông (`bottomWidth`) thay vì tạm dùng `khoTrai + 0.01`.
4. Nếu cần hỗ trợ nhiều hơn 2 vật liệu trong lớp 2, nên đổi `layer2AltId` thành array `layer2StructureIds` và cập nhật UI dynamic.

## Lệnh hữu ích
```bash
cmd /c pnpm --filter web exec tsc --noEmit
cmd /c pnpm --filter web dev
rg -n "layer2Alt|idLop2Phu|chiTietVatLieu|Thêm cấu" apps/web/src packages -S
```
