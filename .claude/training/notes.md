# Ghi chú kỹ thuật (trích từ tài liệu cũ)

## Thuật toán tính độ dày màng (Generate & Filter)

Nguồn: logic_tinh_do_day.md (2026-04)

### Phân loại NVL theo độ dày

| Nhóm | Đặc điểm | Ví dụ |
|------|-----------|-------|
| 1 — Cố định | 1 mức duy nhất, `doiDuocMic = false` | PET (12), PA (15), MPET (12) |
| 2 — Nhảy bậc | Nhiều tùy chọn, gom theo `group` | BOPP (18/20/30/40), CPP (20/25/30/40/50) |
| 3 — PE tự do | Bội số 5, từ 30 trở lên, `doiDuocMic = true` | LLDPE |

### 4 trường hợp

1. **Có PE + Có nhảy bậc:** PE là biến cân bằng. Sinh 3 kịch bản (round up/down PE, round down + tăng bậc Nhóm 2). Lọc dung sai ±2 mic. Chốt "rẻ hơn lấy".
2. **Toàn cố định + Có PE:** Chỉ 1 nghiệm duy nhất (PE bội 5, biên ±2 mic).
3. **Không PE + Chỉ nhảy bậc:** Cartesian product tất cả tùy chọn → lọc dung sai → chốt rẻ nhất.
4. **Phi thực tế:** Danh sách rỗng → cảnh báo UI "Vật liệu không có độ dày phù hợp!"

### Pipeline code

```
Generator (sinh tổ hợp) → Tolerance Filter (±2 mic) → Error Handler (length=0) → Cost Optimizer (sort by cost, lấy [0])
```

### Lưu ý thực tế

- Dung sai cộng dồn: màng ±3-5%, keo ±0.5-1 mic → nên thu hẹp biên nếu khách khắt khe
- PE nhập ngoài chỉ có mốc chẵn (100/120/150) → cần tính năng "chọn từ kho"
- Tỷ lệ lớp ngoài/trong lệch quá → cong vênh → cần cảnh báo mềm

---

## Mobile Build Tips (Expo + React Native + pnpm monorepo)

Nguồn: MOBILE_BUILD_NOTES.md, FIXES-2026-04-23-mobile-build.md (2026-04-23)

### Checklist thêm native module Expo

1. `pnpm --filter mobile add <package>@<version>` — KHÔNG cài ở root
2. Version phải match Expo SDK (SDK 53 → expo-linking ~7.1.x)
3. `./gradlew :expo:generatePackagesList --rerun-tasks` — force regen
4. `./gradlew installDebug` — JS reload không đủ, native phải rebuild

### Lỗi thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Path double drive `c:\C:\...` | Hardcode projectRoot trong node_modules/@expo/cli | Sửa lại đọc từ argv/cwd, dùng patch-package |
| 404 `.virtual-metro-entry` | serverRoot = monorepo root thay vì app root | `metro.config.js`: `config.server.unstable_serverRoot = projectRoot` |
| `Cannot find native module 'ExpoLinking'` | expo-linking thiếu trong package.json | `pnpm --filter mobile add expo-linking@~7.1.7` |
| `Failed to locate android application identifier` | AndroidManifest.xml thiếu `package` attr | Thêm `package="com.lts.pricing"` vào `<manifest>` |

### Files quan trọng

- `apps/mobile/metro.config.js` — watchFolders, nodeModulesPaths, unstable_serverRoot
- `apps/mobile/android/.../MainApplication.kt` — `getJSMainModuleName() = "index"`
- `apps/mobile/package.json` — native deps PHẢI khai ở đây

### Lệnh hay dùng

```bash
pnpm android                              # = npx expo run:android
cd apps/mobile && npx expo start --clear  # Metro clean cache
adb devices                               # Kiểm tra device
```
