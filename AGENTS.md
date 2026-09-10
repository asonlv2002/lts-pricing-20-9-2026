# AGENTS.md

Primary project guidance lives in [CLAUDE.md](./CLAUDE.md). Always read and follow it.

## Mandatory Rule: Không có bước test (từ 06/09/2026)

- Toàn bộ file test (`*.test.ts`, `*.spec.ts`, test script trong `docs/`, `flutter_app/test`) đã bị XÓA khỏi repo.
- Từ giờ KHÔNG chạy test, KHÔNG tạo mới file test, KHÔNG thêm bước "chạy test / kiểm tra test" vào bất kỳ quy trình nào.
- Xác minh thay thế: `pnpm type-check`, `pnpm lint`, `pnpm build`; với công thức tính giá: đối chiếu trực tiếp `.claude/training/Train.md` và tự lý luận con số.
- Prompt chứa "Test Tính Giá" / "test tinh gia" / "test báo giá" **không còn** kích hoạt giai đoạn test hay tạo file xlsx như trước — xử lý như yêu cầu thường.
- Không đề xuất khôi phục hay tái tạo test cũ.

## Mandatory Rule: UI Skill Selection

When choosing a UI/design skill for this project:

- Use `ui-ux-pro-max` for anything related to the UI of web mobile, including "web mobile", "UI web mobile", "mobile tren web", mobile layout, mobile styling, mobile interaction states, or mobile responsiveness in `apps/web`.
- Use `frontend-design` for other frontend UI/design work that is not specifically web mobile.
- If a task affects both web mobile and non-mobile frontend UI, use `ui-ux-pro-max` first for the web mobile constraints, then use `frontend-design` only for the non-mobile UI parts if still needed.

## Mandatory Rule: UI Sketch Requests

When the user asks to "vẽ ra", "vẽ lại", "vẽ UI", or uses any instruction where "vẽ" means sketching or illustrating a UI/layout concept:

- Respond with ASCII art in the chat to sketch the UI/layout.
- Do not treat the request as asking for image generation, canvas drawing, or code implementation unless the user explicitly asks for those.
- If the user asks to continue after a UI spec and says "vẽ", draw the proposed UI state(s) with ASCII art first.
- Keep labels in Vietnamese when sketching this project's UI.
- If multiple states are relevant, draw each state separately with a short title.

## Mandatory Rule: Web Mobile UI

When the user mentions "web mobile", "UI web mobile", "mobile trên web", or asks to adjust the mobile UI of the web app:

- Treat the request as applying only to the Next.js web app in `apps/web`.
- Never edit the React Native app in `apps/mobile` unless the user explicitly says "React Native", "native app", or `apps/mobile`.
- Never change web desktop/base UI unless the user explicitly asks for desktop changes.
- Desktop/base CSS is the default. Do not change broad base selectors such as `.form-row`, `.form-row-3`, `.card`, `.btn`, `.main-grid`, or shared layout rules for a web-mobile-only request.
- All web mobile CSS changes must be inside `@media (max-width: 767px)` unless there is a specific existing narrower mobile breakpoint being extended.
- All app-level web mobile CSS must be scoped with `.lts-shell--mobile`.
- For the pricing/calculator screen, additionally scope mobile CSS with `.mobile-calc-container`.
- Preferred selector shape for pricing web mobile changes:
  `.lts-shell--mobile .mobile-calc-container .specific-class-name`
- Prefer adding a specific class to the exact JSX group being changed, then styling that class in the mobile scope. Examples: `.product-type-row`, `.structure-size-row`, `.structure-print-row`.
- Do not use global mobile selectors like `.form-row { ... }`, `.form-row-3 { ... }`, `.card { ... }`, or `.btn { ... }` unless they are scoped under the relevant module wrapper.
- Do not add new `!important` rules unless needed to beat legacy CSS. If unavoidable, the selector must still be scoped under `.lts-shell--mobile` and the relevant module wrapper.
- Before editing for a web-mobile-only UI task, verify the planned selectors cannot affect web desktop.

For web mobile pricing UI work, the safe scope is:

```css
@media (max-width: 767px) {
  .lts-shell--mobile .mobile-calc-container .specific-class-name {
    /* mobile-only styles */
  }
}
```

## Mandatory Rule: Xem BE (Backend)

Khi user nói "Xem BE" (hoặc biến thể: "xem backend", "mở BE", "xem code BE"):

- Vào thư mục `C:\UnityProject\service-lts` — repo backend riêng (NestJS + Prisma + Postgres + Docker), nằm NGOÀI workspace `PhanMemBaoBi`.
- Đọc cấu trúc: `README.md`, `AGENTS.md`, `backend/src/`, `backend/prisma/schema.prisma`, `docker-compose*.yml`, `nginx/`.
- Tóm tắt cho user những gì quan sát được (kiến trúc, module, API, schema DB...).
- Mọi truy cập/sửa code BE dùng đường dẫn tuyệt đối `C:\UnityProject\service-lts\...` và tuân theo AGENTS.md của repo đó (Docker flow, Prisma, guards/policies).

## Mandatory Rule: Thuật ngữ "Tạo tính giá" (từ 13/08/2026)

- "Tạo tính giá" / "tính giá" / "bảng tính giá" mặc định = tính giá NÂNG CAO (tab `tao-tinh-gia-nang-cap`, giá từ tổng bảng đặc tả nâng cao).
- Chỉ khi user nhắc rõ "cũ" / "thường" mới làm việc trên tab `tao-tinh-gia` (engine `tinhGiaWeb`).

## Mandatory Rule: CPSX nâng cao / price-config bootstrap (F5 · auth · apply)

> Bug đã gặp (2026-08-19): nút **Xem** phiên bản đúng, **F5** hiện DEFAULT mẫu (vd điện 4.000 ₫ · 3 khung) dù BE đã có bản đúng. Root cause = FE không apply BE vào `constants` live, không phải BE sai hay local “thắng” BE.

### Bất biến (KHÔNG được phá)

1. **List snapshot ≠ working config.**  
   `configSnapshots` chỉ là danh sách. UI/engine đọc `constants` (và materials/profit…).  
   Load history / latest **mà không** `saoChepPhienBanDinhMuc` (hoặc tương đương `ganKeysScopeTuSnapshot` + `replaceFullConfig`) → UI kẹt `INITIAL_CONSTANTS` / `DEFAULT_CPSX_UPGRADE_*`.

2. **F5 / mount: chờ auth rồi mới bootstrap.**  
   `page.tsx` mount thường chạy **trước** JWT hydrate (`isAuthenticated` / `accessToken` chưa có).  
   Gọi `taiCauHinhMoiNhatTuServer()` rồi `if (!auth) return` ngay = **skip vĩnh viễn** trên vòng mount đó.  
   Bắt buộc: poll/chờ `isAuthenticated && accessToken` (hoặc login effect), có token LS → bật `dangTaiCauHinhMoiNhat` sớm để UI CPSX không flash DEFAULT.

3. **Nút Xem và F5 phải cùng nguồn apply.**  
   - Xem = `xemPhienBanDinhMuc(id)` trên bản user chọn.  
   - F5 / bootstrap = full history `PRODUCTION_UPGRADE` (cùng API màn phiên bản) + `chonPhienBanMoiNhat` + `saoChepPhienBanDinhMuc(latest)`.  
   Không được chỉ tin 1 bản `latest-version` rồi quên apply; không được chỉ nạp list cho UI phiên bản.

4. **`taiLichSuPhienBanTuServer(scope)` sau khi merge snapshots:**  
   Nếu không đang `dangXemPhienBan` → apply `chonPhienBanMoiNhat(sameScope)` vào store (đặc biệt `productionUpgrade`).  
   Chỉ `set({ configSnapshots })` mà không apply = tái hiện bug “list đúng, form sai”.

5. **Snapshot `productionUpgrade` không nhét DEFAULT vào key thiếu.**  
   `priceConfigToSnapshot('productionUpgrade')` xóa 4 key CPSX NC khỏi fallback trước khi merge.  
   `ganKeysScopeTuSnapshot` / `apDungDuLieuScope` **bỏ qua** `null`/`undefined` — không ghi đè working bằng “thiếu field”.

6. **Migrate-on-read `PRODUCTION` → `PRODUCTION_UPGRADE`:**  
   Chỉ key CPSX NC **có thật trong blob PRODUCTION**.  
   Cấm `gopCpsxUpgradeChoMigrate` gộp session/DEFAULT rồi upsert lên BE (đẩy mẫu hardcode thành “chân lý server”).

7. **localStorage không phải source of truth khi đã login.**  
   - `lts_material_config` / `lts_config_snapshots` chỉ cache.  
   - F5 + có `lts_service_access_token`: **không** hydrate 4 key `cpsxUpgrade*` từ LS; **không** giữ snapshot local scope `productionUpgrade` — chờ BE.  
   - LS đúng mà UI sai → bug store/apply, đừng “fix” bằng tin LS.  
   - DEFAULT trong `apps/web/src/lib/data.ts` chỉ fallback guest / BE trống / field thiếu sau chuẩn hóa UI.

8. **Loading CPSX NC.**  
   Đã login + `dangTaiCauHinhMoiNhat` → `CpsxNangCapTrang` chỉ overlay loading, không render form/kết quả từ DEFAULT.  
   Tách flag khỏi `dangTaiPhienBan` (lịch sử phiên bản).

9. **Thứ tự apply multi-scope bootstrap:**  
   `CAC_SCOPE_CAU_HINH` giữ `production` trước `productionUpgrade` (4 key NC không bị production ghi đè nhầm).

### File chạm (đọc trước khi sửa)

| Việc | File |
|------|------|
| Bootstrap F5 / chờ auth | `apps/web/src/app/page.tsx` |
| latest + history UPGRADE, apply | `apps/web/src/store/slices/configVersioning.ts` |
| Map snapshot / migrate / gan keys | `apps/web/src/lib/api/price-config-mapper.ts` |
| UI loading CPSX NC | `apps/web/src/components/cau-hinh/CpsxNangCapTrang.tsx` |
| DEFAULT mẫu | `apps/web/src/lib/data.ts` (`DEFAULT_CPSX_UPGRADE_*`) |

### Khi debug “F5 sai / Xem đúng”

1. So `constants.cpsxUpgradeElectric` (store) vs snapshot `productionUpgrade` max version vs UI head-meta.  
2. Network: có `price-config/latest-version` + `price-config/PRODUCTION_UPGRADE` không; bootstrap có bị skip vì auth không.  
3. Không kết luận "local thắng" chỉ vì `lts_material_config` khác UI — kiểm tra store live (vd `window.__LTS_STORE__` dev).  
4. Sau khi sửa: chạy `pnpm type-check` + `pnpm lint` (xem mục "Không có bước test").

### Cấm khi sửa khu vực này

- Early-return bootstrap khi chưa auth **mà không** có path chờ auth / login effect apply lại.  
- Load history chỉ cập nhật `configSnapshots` không apply latest (trừ đang xem bản cũ `dangXemPhienBan`).  
- Upsert migrate kèm DEFAULT/session.  
- Coi localStorage là chân lý CPSX NC khi user đã đăng nhập.

## Mandatory Rule: Thêm NVL mới (nút "Cập nhật <tên>") (từ 10/09/2026)

> Khi cần thêm NVL mới (vd: PA 0-3/4-6/7-9 màu, biến thể LLDPE, màng mới…), **TUÂN THỦ pattern nút "Cập nhật <tên>" trong tab Vật liệu**. Tính chất đặc biệt của NVL (normalize tên, group, formula riêng, ink map…) sẽ code ở commit/bước sau — **không nhét vào lúc thêm**.

### Pattern thêm NVL (bắt buộc)

1. **Thêm entry vào 3 file JSON** (đồng bộ SoT):
   - `data/materials.json` (SoT cho web)
   - `apps/flutter_app/assets/data/materials.json` (Flutter assets)
   - `packages/hang-so/src/du-lieu/vat-lieu.json` (RN `VAT_LIEU_MAC_DINH`)

   Trường tối thiểu: `id`, `name`, `density`, `thickness`, `pricePerKg`, `isPETorPA`, `rollLength`, `inkPricePerColor`. Thêm `group` / `adjustableMic` nếu cần.

2. **Thêm nút "Cập nhật <tên>" trong `apps/web/src/components/TrangCauHinh.tsx`**:
   - Đặt trong thanh tiêu đề card "📦 Giá Nguyên Vật Liệu Cập Nhật Hàng Ngày", ngay sau nút "🔄 Reset mặc định".
   - **Điều kiện hiển thị**: `!chiDoc` (user có `PRICE_CONFIG_MANAGER`) VÀ còn thiếu ≥ 1 NVL.
   - **Disable khi**: `dangLuuPhienBan` đang true → text "Đang lưu...".

3. **Click → mở `ConfirmDialog`** (`apps/web/src/components/ConfirmDialog.tsx`):
   - Title: "Cập nhật <tên> mới"
   - Message liệt kê NVL sẽ thêm (tên, độ dày, tỉ trọng, giá/kg) + tháng hiệu lực
   - Confirm: "Cập nhật" / Cancel: "Hủy"

4. **Confirm → thực hiện 2 bước** (cẩn thận: **KHÔNG** gọi raw `setState` trên kết quả `getState()` — Zustand không expose `setState` trên state object):
   ```ts
   for (const nv of dsThieu) themVatLieu(nv);             // addMaterial — tự tạo smallWidthPrices row
   await taoPhienBanDinhMuc({
     scope: "materials",
     name: "Thêm <tên>...",
     effectiveMode: "month",
     effectiveFrom: thangHienTai,
   });
   hienToast(`Đã thêm ${soLuong} <tên> mới và lưu phiên bản tháng ${thangHienTai}.`, { loai: "success" });
   ```

5. **State + derived** (theo mẫu):
   ```ts
   const [moXacNhan, datMoXacNhan] = React.useState(false);
   const dsMacDinh = React.useMemo(
     () => (INITIAL_MATERIALS as Material[]).filter(m =>
       m.id === "<id_1>" || m.id === "<id_2>" || ...),
     [],
   );
   const idHienCo = React.useMemo(() => new Set(vatLieu.map(m => m.id)), [vatLieu]);
   const dsThieu = dsMacDinh.filter(m => !idHienCo.has(m.id));
   const soLuongThem = dsThieu.length;
   ```

### Tính chất NVL sẽ code SAU (tách riêng, không nhét vào bước thêm)

- **Normalize tên hiển thị** (vd: Báo giá/LSX/PDF gọn "PA" thay vì "PA 0-3 màu") → `normalizeMaterialBaseName` trong `apps/web/src/lib/format-structure.ts`
- **Group / phân nhóm** (vd: `chonNhomMuc` để chọn bảng giá mực theo số màu)
- **Formula riêng** trong `packages/bang-tinh-gia/...` nếu NVL có logic đặc biệt
- **Ink map / custom price** nếu cần

Các tính chất này làm ở commit/bước riêng, **sau khi NVL đã được thêm và lưu phiên bản materials thành công lên BE**.

### File chạm chính

| Việc | File |
|------|------|
| SoT dữ liệu | `data/materials.json` |
| Sync Flutter | `apps/flutter_app/assets/data/materials.json` |
| Sync RN | `packages/hang-so/src/du-lieu/vat-lieu.json` |
| UI nút Cập nhật + ConfirmDialog | `apps/web/src/components/TrangCauHinh.tsx` |
| Confirm dialog | `apps/web/src/components/ConfirmDialog.tsx` |
| Toast thông báo | `apps/web/src/lib/toast.ts` (`hienToast`) |
| Action thêm NVL | `apps/web/src/store/slices/calculation.ts` (`addMaterial`) |
| Action lưu phiên bản | `apps/web/src/store/slices/configVersioning.ts` (`taoPhienBanDinhMuc`) |
| Normalize tên hiển thị (sau) | `apps/web/src/lib/format-structure.ts` (`normalizeMaterialBaseName`) |

### Khi debug "F5 không thấy NVL mới / nút Cập nhật không hiện"

1. `pnpm dev` đã restart sau khi sửa JSON chưa? (Node cache import top-level `INITIAL_MATERIALS`).
2. Clear Next.js cache: `Remove-Item -Recurse -Force apps\web\.next` rồi restart.
3. User có policy `PRICE_CONFIG_MANAGER`? (gate `!chiDoc` — không có quyền thì nút ẩn).
4. `vatLieu` đã có đủ NVL chưa? (đủ rồi → nút ẨN theo design).
5. Logged-in user F5 vẫn thiếu → bấm nút Cập nhật để tạo phiên bản materials mới lên BE (rule này mới giải quyết dứt điểm case "BE cũ").


