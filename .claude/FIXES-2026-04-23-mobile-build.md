# Fix Log — Mobile Build Android — 2026-04-23

## Bối cảnh
Dự án monorepo pnpm (`apps/web` + `apps/mobile`). Mobile dùng Expo 53 + React Native 0.79.6.
Mục tiêu: build APK và chạy trực tiếp lên device Android qua `npx expo run:android`.

---

## Lỗi 1 — Metro ENOENT: path double drive letter `c:\C:\...`

### Triệu chứng
```
Error: ENOENT: no such file or directory, open
'c:\C:\UnityProject\PhanMemBaoBi\node_modules\metro-runtime\src\polyfills\require.js'
```
Build fail ngay lúc Metro bundling, khoảng 90–95% tiến trình.

### Cách chuẩn đoán
**Dấu hiệu đặc trưng:** path có dạng `c:\C:\...` — drive letter xuất hiện 2 lần.

Để xác nhận nguyên nhân, chạy lệnh sau:
```bash
grep -n "projectRoot" node_modules/@expo/cli/build/src/export/embed/index.js
```
Nếu output có dòng kiểu:
```
151:        const projectRoot = "c:\\UnityProject\\...";
```
→ Xác định chắc chắn là bị hardcode. Fix theo hướng dẫn bên dưới.

Nếu không thấy hardcode mà vẫn lỗi `c:\C:\...`, nguyên nhân khác có thể là:
- Biến môi trường `INIT_CWD` hoặc `npm_config_prefix` bị lowercase
- Chạy terminal với quyền khác nhau (Run as Administrator vs thường)
- Symlink trỏ đến path lowercase

Kiểm tra thêm:
```bash
# Xem process.cwd() thực tế khi bundle
node -e "console.log(process.cwd())"
# Nếu ra c:\ (lowercase) → vấn đề môi trường, không phải hardcode
```

### Nguyên nhân
File `node_modules/@expo/cli/build/src/export/embed/index.js` bị **ai đó sửa tay** (hardcode) thành:
```js
// ❌ SAI — hardcode cứng, drive letter lowercase
const projectRoot = "c:\\UnityProject\\PhanMemBaoBi\\apps\\mobile";
```
Trong khi đúng ra phải đọc từ argv hoặc `process.cwd()`.

Hệ quả dây chuyền:
- `projectRoot` có drive letter **lowercase** `c:\`
- Khi Metro bundle, `filePath` của các module là **uppercase** `C:\...` (Windows chuẩn)
- `RootPathUtils.absoluteToNormal()` so sánh hai path không match (case khác nhau)
- Fallback `normalToAbsolute()` ghép: `rootDir(c:\)` + `filePath(C:\...)` = `c:\C:\...` → không tồn tại → ENOENT

### Fix
**File:** `node_modules/@expo/cli/build/src/export/embed/index.js`
Dòng ~151, trong hàm `expoExportEmbed`, thay:
```js
// ❌ Trước
const projectRoot = "c:\\UnityProject\\PhanMemBaoBi\\apps\\mobile";
```
Thành:
```js
// ✅ Sau
const projectRoot = (args['_'][0] && !args['_'][0].startsWith('-')
  ? require('path').resolve(args['_'][0])
  : process.cwd());
```

### ⚠️ Lưu ý quan trọng
File này nằm trong `node_modules` → **bị mất khi `pnpm install`**.
Nếu cần bền vững, dùng `patch-package`:
```bash
pnpm add -D patch-package
# Sau khi sửa file:
npx patch-package @expo/cli
# Thêm vào package.json scripts:
"postinstall": "patch-package"
```

---

## Lỗi 2 — Metro: `Unable to resolve ./index.js from monorepo root`

### Triệu chứng
```
Error: Unable to resolve module ./index.js from C:\UnityProject\PhanMemBaoBi/.:
None of these files exist:
  * ..\..\index.js(...)
```
Xuất hiện sau khi fix Lỗi 1.

### Cách chuẩn đoán
**Dấu hiệu đặc trưng:** path trong lỗi kết thúc bằng `PhanMemBaoBi/.` (monorepo root) thay vì `apps/mobile`.

Bước 1 — Kiểm tra `metro.config.js` có `unstable_serverRoot` chưa:
```bash
grep "unstable_serverRoot" apps/mobile/metro.config.js
# Nếu không có output → đây là nguyên nhân, fix theo hướng dẫn
```

Bước 2 — Nếu đã có `unstable_serverRoot` mà vẫn lỗi, kiểm tra Expo CLI có tự override serverRoot không:
```bash
# Bật debug để xem serverRoot thực tế Expo đang dùng
DEBUG=expo:* npx expo run:android 2>&1 | grep -i "serverRoot\|workspaceRoot\|projectRoot"
```

Bước 3 — Xác nhận Expo CLI đang detect monorepo:
```bash
node -e "
const {getMetroServerRoot} = require('@expo/config/paths');
console.log(getMetroServerRoot('C:/UnityProject/PhanMemBaoBi/apps/mobile'));
"
# Nếu ra monorepo root → đây là nguyên nhân
```

### Nguyên nhân
Expo CLI tự detect `pnpm-workspace.yaml` ở monorepo root → đặt `serverRoot` = `C:\UnityProject\PhanMemBaoBi` (monorepo root) thay vì `C:\UnityProject\PhanMemBaoBi\apps\mobile`.

Khi Gradle gọi bundle, entryFile `index.js` được resolve tương đối với `serverRoot` → tìm `C:\UnityProject\PhanMemBaoBi\index.js` → không tồn tại.

### Fix
**File:** `apps/mobile/metro.config.js`
Thêm vào cuối, trước `module.exports`:
```js
// Fix monorepo serverRoot: ép về apps/mobile thay vì monorepo root
// Không có dòng này, Metro dùng pnpm-workspace root làm serverRoot →
// relative entry file "index.js" resolve sai thư mục khi Gradle build
config.server = config.server ?? {};
config.server.unstable_serverRoot = projectRoot;
```

File hoàn chỉnh sau fix:
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

// Fix: force serverRoot = projectRoot (not monorepo root)
config.server = config.server ?? {};
config.server.unstable_serverRoot = projectRoot;

module.exports = config;
```

---

## Lỗi 3 — `expo run:android` báo: `Failed to locate the android application identifier`

### Triệu chứng
```
CommandError: Failed to locate the android application identifier in the "android/" folder.
This is required to open the app.
```
Xảy ra trước cả bước build Gradle, ngay khi Expo CLI đọc cấu hình.

### Cách chuẩn đoán
Lỗi này có thể do **2 nguyên nhân khác nhau**, cần phân biệt:

**Bước 1** — Bật DEBUG để xem stack trace đầy đủ:
```bash
DEBUG=expo:* npx expo run:android 2>&1 | grep -A5 "AndroidAppIdResolver\|resolveAppIdFromNative\|getApplicationId"
```

**Bước 2** — Test thủ công từng bước Expo CLI đọc app ID:

```bash
# Test 1: Đọc từ build.gradle (Gradle query)
node -e "
const {AndroidConfig} = require('@expo/config-plugins');
AndroidConfig.Package.getApplicationIdAsync('C:/UnityProject/PhanMemBaoBi/apps/mobile')
  .then(id => console.log('Gradle appId:', id))
  .catch(e => console.error('Gradle error:', e.message));
"
# → Nếu ra null: Gradle chưa build hoặc build.gradle không dùng applicationId

# Test 2: Đọc từ AndroidManifest.xml
node -e "
const {AndroidConfig} = require('@expo/config-plugins');
AndroidConfig.Manifest.readAndroidManifestAsync(
  'C:/UnityProject/PhanMemBaoBi/apps/mobile/android/app/src/main/AndroidManifest.xml'
).then(m => console.log('package attr:', m.manifest?.$.package))
  .catch(e => console.error(e.message));
"
# → Nếu ra undefined: manifest thiếu package attribute → đây là nguyên nhân của lỗi này
```

**Phân biệt 2 trường hợp:**
- Nếu Test 1 ra `null` VÀ Test 2 ra `undefined` → thiếu `package` attribute trong manifest → fix theo hướng dẫn bên dưới
- Nếu Test 2 ra đúng `com.lts.pricing` nhưng vẫn lỗi → vấn đề khác (quyền file, encoding XML)

### Nguyên nhân
Expo CLI phiên bản `0.24.x` đọc `applicationId` theo thứ tự:
1. Chạy Gradle task lấy `applicationId` → trả về `null` (chưa build)
2. Đọc `AndroidManifest.xml` → tìm attribute `package` trong thẻ `<manifest>`
3. Nếu không tìm được → throw error

`AndroidManifest.xml` của project **không có** `package` attribute vì đây là quy chuẩn Android mới (API 31+) — `namespace` được khai báo trong `build.gradle` thay vì manifest. Tuy nhiên Expo CLI cũ chưa hỗ trợ cách đọc này.

### Fix
**File:** `apps/mobile/android/app/src/main/AndroidManifest.xml`
Thêm `package` attribute vào thẻ `<manifest>`:
```xml
<!-- ❌ Trước -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

<!-- ✅ Sau -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.lts.pricing">
```

> Gradle hiện đại bỏ qua attribute `package` trong manifest (dùng `namespace` trong `build.gradle`), nên thêm vào không ảnh hưởng build. Chỉ là để Expo CLI đọc được.

---

## Cách chạy sau khi fix

### Chạy lên device (debug, có Metro log real-time):
```bash
cd C:\UnityProject\PhanMemBaoBi\apps\mobile
npx expo run:android
```
Yêu cầu: device đã bật USB Debugging, cắm USB, `adb devices` thấy device.

### Build APK release (không cần device):
```bash
cd C:\UnityProject\PhanMemBaoBi\apps\mobile\android
.\gradlew.bat assembleRelease
# APK output: app/build/outputs/apk/release/app-release.apk
```

### Bundle JS only (test nhanh):
```bash
cd C:\UnityProject\PhanMemBaoBi\apps\mobile
npx expo export:embed \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --platform android \
  --reset-cache
```

---

## Kiểm tra nhanh khi sang máy mới

```bash
# 1. Kiểm tra device
adb devices

# 2. Kiểm tra file bị hardcode chưa bị reset
grep -n "projectRoot" node_modules/@expo/cli/build/src/export/embed/index.js
# Nếu thấy dòng có hardcode "c:\\UnityProject..." → phải fix lại Lỗi 1

# 3. Kiểm tra metro.config.js có unstable_serverRoot chưa
grep "unstable_serverRoot" apps/mobile/metro.config.js

# 4. Kiểm tra AndroidManifest có package attribute chưa
grep "package=" apps/mobile/android/app/src/main/AndroidManifest.xml
```

---

## Môi trường

| | Phiên bản |
|---|---|
| Node.js | v24.14.1 |
| pnpm | 10.33.0 |
| Expo SDK | 53.0.0 |
| React Native | 0.79.6 |
| @expo/cli | 0.24.24 |
| Metro | 0.82.5 |
| Android compileSdk | 35 |
| Android minSdk | 24 |
| Gradle | 8.13 |
| Kotlin | 2.0.21 |
| NDK | 27.1.12297006 |
