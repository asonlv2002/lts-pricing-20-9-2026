# Spec: Flutter UI tái hiện 100% web mobile (phạm vi A — skin & cấu trúc)

Ngày: 2026-09-16 · Branch: `feat/flutter-ui-web-mobile` · Trạng thái: APPROVED (user duyệt 2 quyết định phạm vi + hướng 1)

## Quyết định đã chốt
1. **Phạm vi A** — chỉ tái hiện GIAO DIỆN web mobile vào `apps/flutter_app`; engine/store/data không đổi; KHÔNG port auth/BE/báo giá/khách hàng.
2. **Tab bar 5 mục y web**: Tổng quan (hub) · Tính giá · Khách hàng (khóa) · Cấu hình · Tài khoản (khóa). Lịch sử + Lệnh SX thành action card trong hub (web cũng đặt 2 mục này ở hub "Tính giá & Báo giá").
3. **Màn chọn chế độ**: đủ 3 card Nội bộ / Gia công 🔒 / Thương mại 🔒 (badge "Khóa", không mở được); section chỉ thuộc nâng cao trong form → ẩn, form thường giữ layout web.

## Nguồn thiết kế (soi khi dựng)
- Tokens: `apps/web/src/app/globals.css` `:root` (L5–51) — Inter 300–800, base 14px.
- Shell: `.lts-shell--mobile` (L5792+) bg `#f4f7fb`, content pad-bottom `88+safe`.
- Hub: `.lts-mobile-hub-*` (L5819–6030) header navy `#08192f→#07172b` + radial `rgba(91,77,255,.22)`, radius `0 0 22 22`, action card 108px/radius 20/icon box 56px (violet `#5b4dff/#f0eeff`, sky, emerald, orange, slate, rose), bản `--locked` opacity .88 + badge khóa.
- Tab bar: `.lts-mobile-tabbar` (L6032–6081) fixed, 5 cột, 72px+safe, radius `22 22 0 0`, active `#5b4dff` w700, icon 22, label 10px.
- Module header: `.lts-mobile-module-header` (L6089+) `back | title 16/800 | action`, pad-top `12+safe-top`, radius `0 0 20 20`.
- Pill nav calc: `.mobile-calc-nav` (L8384+/L10042+) width 260, height 40, bottom `84+safe`, radius 999, badge 6px pulse.
- Mini price strip: `.mini-price-strip` (L10674+) gradient accent .10→cyan .08, border accent .2, radius 12, mps-price 18/800 gradient text, mpsSlideIn 0.3s.
- Card/form: `.card` L934 (pad 20, radius 14, border, shadow-sm), `.card-title` L948 (12px/700 UP accent ls .05), `.form-label` L1026 (10.5px/600 UP muted ls .04), `.form-input` L1038 (bg `--input-bg` `#f1f5f9`, border, radius 10, 12.3px; focus accent + ring 3px .1), `.form-row` 2 cột gap 10, `.form-row-3` 3 cột gap 10, `.advanced-toggle` L964.
- Dark: `[data-theme=dark]` L30–51.

## Cấu trúc code mới
- `lib/theme/lts_tokens.dart` — palette light/dark + radius + shadows + gradient + `LtsTextStyles`.
- `lib/widgets/lts/lts_chrome.dart` — `LtsTabBar`, `LtsNavyHeader` (hub + module variant), `LtsActionCard`, `LtsIconBox`.
- `lib/widgets/lts/lts_surfaces.dart` — `LtsCard`, `LtsCardTitle`, `LtsAdvancedToggle`, `LtsChipFilter`.
- `lib/widgets/lts/lts_forms.dart` — `LtsField`, `LtsRow2`, `LtsRow3`, `LtsSelectSheet`.
- `lib/widgets/lts/lts_overlay.dart` — `showLtsSheet` (grabber + backdrop, mirror SheetBottom.tsx), `LtsPillNav`, `LtsMiniPriceStrip`.
- `lib/screens/home_shell.dart` — viết lại: IndexedStack 5 nhánh (Hub · TinhGia · KhachHangLock · CauHinh · TaiKhoanLock) + tab bar; hub route tới LichSu/LSX bằng Navigator.push giữ nguyên 2 màn đó; Khách hàng/Tài khoản → dialog "Cần đăng nhập — dùng bản web".
- `lib/screens/hub_screen.dart` — mới.

## Không đổi
`lib/engine/*`, `lib/store/*`, JSON assets, `apps/web`, `apps/mobile`.

## Nghiệm thu (không có test — luật repo)
`flutter analyze` 0 error/warning mỗi phase; đối chiếu thị giác `pnpm dev` viewport 375px ↔ Flutter 375pt từng màn; `flutter build apk --debug` cuối.

## Rủi ro
`tinh_gia_screen.dart` (65KB) lẫn logic+UI → refactor từng section, giữ nguyên chữ ký gọi AppState; sai spacing ±2px chấp nhận.
