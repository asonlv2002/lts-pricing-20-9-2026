# Mobile Build Notes — Expo Android

Tài liệu các lỗi đã gặp khi build app mobile (Expo SDK 53 + React Native 0.79 + pnpm monorepo) và cách fix.

> **Quy ước:** mỗi lỗi gồm: Triệu chứng → Nguyên nhân gốc → Cách verify → Fix → Bài học.

---

## 1. `This computer is not authorized for developing on Device <SERIAL>` — 2026-04-23

**Triệu chứng:** `npx expo run:android` dừng ngay lập tức (chưa qua Gradle), in dòng:
```
This computer is not authorized for developing on Device BAB00014419.
Learn more: https://expo.fyi/authorize-android-device
```

**Nguyên nhân:** USB debugging chưa được trust trên điện thoại — máy tính chưa được điện thoại accept RSA fingerprint.

**Cách verify:** Nếu `adb` có trong PATH, chạy `adb devices -l` → nếu device hiện `unauthorized` thì đúng lỗi này.

**Fix:**
1. Rút cáp USB → cắm lại → bấm **Allow** trên popup "Allow USB debugging?" (tick "Always allow from this computer")
2. Nếu không hiện popup:
   - **Settings → Developer options → Revoke USB debugging authorizations**
   - Tắt rồi bật lại **USB debugging**
   - Cắm lại cáp
3. Đảm bảo USB mode là **File Transfer (MTP)**, không phải "Charge only"
4. Thử cáp data khác (cáp sạc-only sẽ không hiện popup)

**Bài học:** Lỗi authorize chỉ xảy ra lần đầu mỗi (máy tính × thiết bị). Sau khi tick "Always allow" thì không bao giờ gặp lại trên cặp đó.

---

## 2. HTTP 404 trên `.expo/.virtual-metro-entry.bundle` — 2026-04-23

**Triệu chứng:** Build Gradle thành công, APK cài lên device, app mở lên → màn hình đỏ:
```
The development server returned response error code: 404

URL: http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true...

Body: {"type":"UnableToResolveError",
       "message":"Unable to resolve module ./apps/mobile/index from
                  C:\\UnityProject\\PhanMemBaoBi\\apps\\mobile/.: ...
                * apps\\mobile\\apps\\mobile\\index"}
```
(Path bị **nhân đôi** `apps\mobile\apps\mobile\index`.)

**Nguyên nhân:** Trong pnpm monorepo, `MainApplication.kt` mặc định dùng:
```kotlin
override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
```
Virtual entry này được Expo CLI sinh ra với path tương đối `./apps/mobile/index` (tính từ monorepo root). Nhưng `metro.config.js` đã set `unstable_serverRoot = projectRoot` (= `apps/mobile`) — bắt buộc trong pnpm monorepo để Metro resolve đúng. Hai thứ này conflict: Metro nối path thành `apps/mobile/apps/mobile/index` → file không tồn tại → 404.

**Cách verify:**
```bash
# Endpoint chuẩn /index.bundle phải trả 200:
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/index.bundle?platform=android&dev=true"
# → 200

# Endpoint virtual entry trả 404:
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true"
# → 404
```

**Fix:** Đổi entry trong `apps/mobile/android/app/src/main/java/com/lts/pricing/MainApplication.kt`:
```kotlin
// Trước:
override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

// Sau (dùng index.js truyền thống):
override fun getJSMainModuleName(): String = "index"
```
File `apps/mobile/index.js` đã có sẵn `import 'expo-router/entry'` nên expo-router vẫn hoạt động bình thường.

Sau khi sửa: rebuild APK
```bash
cd apps/mobile/android && ./gradlew installDebug
```

**Bài học:** Trong pnpm monorepo, virtual-metro-entry của Expo bị broken vì xung đột `serverRoot`. Luôn dùng `index.js` làm entry rõ ràng — đơn giản hơn và không phụ thuộc internal generation logic của Expo CLI.

---

## 3. `Cannot find native module 'ExpoLinking'` — 2026-04-23

**Triệu chứng:** App mở → màn hình đỏ runtime error:
```
Cannot find native module 'ExpoLinking'
```
(Có thể đi kèm stack trace từ `expo-router` / `expo-modules-core`.)

**Nguyên nhân:** `expo-router` phụ thuộc runtime vào `expo-linking` để xử lý deep link, NHƯNG `expo-linking` không được khai báo trong `apps/mobile/package.json`. Hậu quả:
- Expo autolinking quét `package.json` → không thấy `expo-linking` → không generate `ExpoLinkingPackage` vào `ExpoModulesPackageList.java`
- Native module `ExpoLinking` không được register
- JS gọi `NativeModules.ExpoLinking` → trả `null` → throw

**Cách verify nguyên nhân:**
```bash
grep -i "linking" \
  node_modules/expo/android/build/generated/expo/src/main/java/expo/modules/ExpoModulesPackageList.java
# Nếu KHÔNG có dòng nào → expo-linking chưa autolink → đúng lỗi này
```

**Fix:**
```bash
# QUAN TRỌNG: dùng --filter mobile để cài đúng workspace, KHÔNG cài ở root
pnpm --filter mobile add expo-linking@~7.1.7
```

**LƯU Ý version:**
- Expo SDK 53 yêu cầu `expo-linking@~7.1.x`
- Đừng để pnpm tự chọn `latest` — nó sẽ cài v55+ (cho SDK 55), gây mismatch ABI

Bảng tương thích SDK ↔ expo-linking (ghi nhanh để khỏi tra mạng):
| Expo SDK | expo-linking |
|---|---|
| 53 | `~7.1.x` |
| 54 | `~7.2.x` (dự kiến) |
| 55 | `~8.0.x` |

Sau khi cài:
```bash
cd apps/mobile/android
./gradlew :expo:generatePackagesList --rerun-tasks   # force regen, vì Gradle cache theo mtime
./gradlew installDebug
```

Verify lại:
```bash
grep -i "linking" \
  node_modules/expo/android/build/generated/expo/src/main/java/expo/modules/ExpoModulesPackageList.java
# → phải có:
#   new expo.modules.linking.ExpoLinkingPackage()
#   expo.modules.linking.ExpoLinkingModule.class,
```

---

## 📋 Checklist chung khi thêm native module Expo trong pnpm monorepo

Mỗi lần thêm bất kỳ `expo-*` package nào, làm đủ 4 bước sau (theo thứ tự):

1. **Cài đúng workspace:** `pnpm --filter mobile add <package>@<version>` — KHÔNG `pnpm add` ở root
2. **Đúng version range:** match với Expo SDK đang dùng (xem `apps/mobile/package.json` field `expo`)
3. **Force regen Gradle:** `./gradlew :expo:generatePackagesList --rerun-tasks` (Gradle cache theo mtime, không detect node_modules mới)
4. **Rebuild APK:** `./gradlew installDebug` — JS reload không đủ, native code phải build lại

---

## 🛠 Lệnh hay dùng (cheatsheet)

```bash
# Build + install full
cd apps/mobile && npx expo run:android

# Hoặc build riêng (nhanh hơn nếu Metro đang chạy)
cd apps/mobile/android && ./gradlew installDebug

# Start Metro với clean cache (khi gặp lỗi resolve khó hiểu)
cd apps/mobile && npx expo start --dev-client --clear

# Kiểm tra Metro endpoint
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/index.bundle?platform=android&dev=true"

# Kill Metro nếu port 8081 bị giữ
netstat -ano | grep ":8081.*LISTEN"   # lấy PID
taskkill //PID <PID> //F              # Windows
```

---

## 🔧 Files quan trọng cho mobile build

| File | Vai trò |
|---|---|
| `apps/mobile/index.js` | Entry point — `import 'expo-router/entry'` |
| `apps/mobile/metro.config.js` | Cấu hình Metro cho monorepo (`watchFolders`, `nodeModulesPaths`, `unstable_serverRoot`) |
| `apps/mobile/app.json` | Expo config — `scheme`, plugins, package name |
| `apps/mobile/package.json` | **Native deps phải khai ở đây** (không phải ở root) |
| `apps/mobile/android/app/src/main/java/com/lts/pricing/MainApplication.kt` | RN host config — `getJSMainModuleName()` = `"index"` |
| `apps/mobile/android/app/src/main/java/com/lts/pricing/MainActivity.kt` | RN activity — `getMainComponentName()` = `"main"` |
| `node_modules/expo/android/build/generated/expo/src/main/java/expo/modules/ExpoModulesPackageList.java` | File generated — list các native module được autolink. Dùng để verify autolinking |
| `apps/mobile/android/build/generated/autolinking/autolinking.json` | File generated — autolinking config raw |
