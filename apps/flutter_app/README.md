# LTS Pricing — Flutter Android App

App Android viết bằng Flutter, tái sử dụng **engine JS** (`packages/bang-tinh-gia`) của web qua
`flutter_js` (QuickJS). Đầy đủ 4 module: **Tính giá** · **Lịch sử** · **Cấu hình** · **Lệnh SX**.

## 📁 Cấu trúc

```
apps/flutter_app/
├── pubspec.yaml
├── package.json                ← chứa esbuild để bundle engine
├── scripts/
│   ├── engine-entry.ts         ← entry point (adapter EN↔VN)
│   └── build-engine.mjs        ← esbuild script
├── assets/
│   ├── engine.bundle.js        ← ⚠ output — bundle chạy bởi QuickJS
│   └── data/                   ← constants/materials/profitTable (copy từ web)
└── lib/
    ├── main.dart               ← entry Flutter
    ├── engine/                 ← JS runtime bridge + models
    ├── store/                  ← AppState (Provider) + SharedPreferences
    ├── theme/                  ← Material 3 + format tiếng Việt
    ├── screens/                ← 4 màn hình + HomeShell
    └── widgets/                ← form/price hero/breakdown
```

## 🚀 Setup lần đầu

```bash
# 1) Ở root monorepo — cài dev deps (esbuild) cho bundler
pnpm install

# 2) Bundle engine TypeScript → 1 file JS
pnpm build:engine
# ↑ ra file apps/flutter_app/assets/engine.bundle.js

# 3) Init native Android folder (nếu chưa có)
cd apps/flutter_app
flutter create . --org vn.laitruongson.lts --project-name lts_pricing --platforms=android --overwrite

# 4) Cài Flutter deps
flutter pub get

# 5) Chạy dev trên device đang kết nối
flutter run -d <device-id>

# 6) Build APK release
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
```

## 🔁 Workflow khi engine thay đổi

Mỗi khi sửa công thức trong `packages/bang-tinh-gia/src/` hoặc `apps/web/src/lib/engine.ts`:

```bash
pnpm build:engine       # rebuild assets/engine.bundle.js
flutter run             # (hot-restart, KHÔNG phải hot-reload — vì assets)
```

## 🧪 Verify

1. Mở tab **Cấu hình** → kiểm 3 tab (Vật liệu, Hằng số, Lợi nhuận) — phải hiển thị đầy đủ
   (≥ 20 vật liệu, các hằng số > 0, ≥ 12 dòng profit).
2. Tab **Tính giá** → chọn KH + sản phẩm, pick cấu trúc lớp (VD: PET12 + PE40), nhập khổ trải
   0.25 m, bước cắt 0.50 m, số lượng 5000, 30 ngày, cột lợi nhuận 2.
   → So sánh `finalPrice` với web tại cùng input → phải khớp tới đơn vị đồng.
3. Lưu → tab **Lịch sử** có entry → kill app → mở lại → entry vẫn còn (SharedPreferences).
4. Tab **LSX** → tạo LSX từ báo giá đã lưu → xuất PDF.

## ⚠ Lưu ý

- **minSdkVersion** nên ≥ 21 (flutter_js yêu cầu). Sau khi `flutter create`, sửa
  `android/app/build.gradle.kts`: `minSdk = 21`.
- Mobile (Expo) hiện có ở `apps/mobile/` — Flutter app này **song song, không thay thế**. Cả hai
  cùng dùng chung logic từ `packages/`.
- Bundle size APK ước ~18 MB (Flutter base ~15 MB + QuickJS ~3 MB).
- File `assets/engine.bundle.js` **được gitignore** — CI cần chạy `pnpm build:engine` trước khi
  `flutter build`.
