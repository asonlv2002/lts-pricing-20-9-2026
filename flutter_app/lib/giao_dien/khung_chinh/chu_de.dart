// giao_dien/khung_chinh/chu_de.dart — Design tokens + ThemeData
// Đồng bộ với src/app/globals.css (CSS variables --bg, --surface, --accent, ...).
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ChuDe {
  // ─── Màu nền & bề mặt (khớp --bg / --surface / --surface2) ─────────────────
  static const mauNenSang    = Color(0xFFF0F2F5); // --bg light
  static const mauNenToi     = Color(0xFF0F172A); // --bg dark
  static const mauMatSang    = Color(0xFFFFFFFF); // --surface light
  // --surface dark = rgba(30,41,59,0.95) → ARGB = 0xF21E293B (alpha ~0.95)
  static const mauMatToi     = Color(0xF21E293B);
  static const mauMat2Sang   = Color(0xFFF8F9FB); // --surface2 light
  // --surface2 dark = rgba(51,65,85,0.5) → ARGB = 0x80334155
  static const mauMat2Toi    = Color(0x80334155);

  // ─── Màu chủ đạo (--accent / --accent2) ───────────────────────────────────
  static const mauTrucSang   = Color(0xFF4F46E5); // --accent light
  static const mauTrucToi    = Color(0xFF818CF8); // --accent dark
  static const mauTruc2Sang  = Color(0xFF0891B2); // --accent2 light
  static const mauTruc2Toi   = Color(0xFF22D3EE); // --accent2 dark

  // ─── Màu trạng thái ───────────────────────────────────────────────────────
  static const mauXanh       = Color(0xFF059669);
  static const mauXanhToi    = Color(0xFF34D399);
  static const mauDo         = Color(0xFFDC2626);
  static const mauDoToi      = Color(0xFFF87171);
  static const mauCam        = Color(0xFFD97706);
  static const mauCamToi     = Color(0xFFFBBF24);
  static const mauHong       = Color(0xFFDB2777);
  static const mauHongToi    = Color(0xFFF472B6);

  // ─── Chữ (--text / --muted / --dim) ───────────────────────────────────────
  static const mauChuSang    = Color(0xFF1E293B); // --text light
  static const mauChuToi     = Color(0xFFE2E8F0); // --text dark
  static const mauNhatSang   = Color(0xFF64748B); // --muted light
  static const mauNhatToi    = Color(0xFF94A3B8); // --muted dark
  static const mauMoSang     = Color(0xFF94A3B8); // --dim light
  static const mauMoToi      = Color(0xFF475569); // --dim dark

  // ─── Viền (--border) ──────────────────────────────────────────────────────
  // light: rgba(0,0,0,0.08) → 0x14000000
  static const mauVienSang   = Color(0x14000000);
  // dark : rgba(99,102,241,0.15) → 0x266366F1 (gốc CSS đúng là indigo-500 alpha 0.15)
  static const mauVienToi    = Color(0x266366F1);

  // ─── Input background (--input-bg) ────────────────────────────────────────
  static const mauInputSang  = Color(0xFFF1F5F9);
  // dark: rgba(0,0,0,0.25) → 0x40000000
  static const mauInputToi   = Color(0x40000000);

  // ─── Sidebar (luôn tối, dùng riêng theo .lts-sidebar) ─────────────────────
  static const mauSidebar    = Color(0xFF0F172A); // .lts-sidebar light
  static const mauSidebarToi = Color(0xFF080E1A); // .lts-sidebar dark

  // Màu phụ trong sidebar (đồng bộ với CSS)
  static const mauChuSidebar       = Color(0xFFFFFFFF);
  static const mauNhanSidebar      = Color(0xFF94A3B8); // text mặc định nav
  static const mauNhatSidebar      = Color(0xFF64748B); // text non-active / icon button
  static const mauNhanNhomSidebar  = Color(0xFF475569); // tiêu đề nhóm uppercase
  static const mauVienSidebar      = Color(0x0FFFFFFF); // rgba(255,255,255,0.06)

  // ─── Kích thước & bo góc ──────────────────────────────────────────────────
  static const double bKinhRadius        = 14;   // --radius
  static const double bKinhRadiusNho     = 10;
  static const double bKinhRadiusXNho    = 8;

  static const double chieuRongSidebar         = 240; // .lts-sidebar
  static const double chieuRongSidebarThuGon   = 72;  // .lts-sidebar--collapsed
  static const double chieuCaoTopbar           = 60;  // .lts-topbar
  static const Duration thoiGianAnim           = Duration(milliseconds: 280);

  // ─── Bóng đổ (--shadow-sm / --shadow-md / --shadow-lg) ────────────────────
  static List<BoxShadow> bongNho(bool toi) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: toi ? 0.20 : 0.06),
      blurRadius: 3, offset: const Offset(0, 1),
    ),
  ];
  static List<BoxShadow> bongVua(bool toi) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: toi ? 0.25 : 0.08),
      blurRadius: 12, offset: const Offset(0, 4),
    ),
  ];
  static List<BoxShadow> bongLon(bool toi) => [
    BoxShadow(
      color: Colors.black.withValues(alpha: toi ? 0.35 : 0.10),
      blurRadius: 24, offset: const Offset(0, 8),
    ),
  ];

  // ─── Gradient (--grad) ────────────────────────────────────────────────────
  static const gradientSang = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFF4F46E5), Color(0xFF0891B2)],
  );
  static const gradientToi = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFF818CF8), Color(0xFF22D3EE)],
  );

  // ─── ThemeData ─────────────────────────────────────────────────────────────
  static ThemeData themeSang() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: mauNenSang,
      colorScheme: const ColorScheme.light(
        primary: mauTrucSang,
        secondary: mauTruc2Sang,
        surface: mauMatSang,
        error: mauDo,
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: mauChuSang,
        displayColor: mauChuSang,
      ),
      cardColor: mauMatSang,
      dividerColor: mauVienSang,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: mauInputSang,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauVienSang),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauVienSang),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauTrucSang, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        isDense: true,
      ),
    );
  }

  static ThemeData themeToi() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: mauNenToi,
      colorScheme: const ColorScheme.dark(
        primary: mauTrucToi,
        secondary: mauTruc2Toi,
        surface: mauMatToi,
        error: mauDoToi,
      ),
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: mauChuToi,
        displayColor: mauChuToi,
      ),
      cardColor: mauMatToi,
      dividerColor: mauVienToi,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: mauInputToi,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauVienToi),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauVienToi),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: mauTrucToi, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        isDense: true,
      ),
    );
  }

  // ─── Helper (giữ nguyên API cũ — KHÔNG đổi tên) ───────────────────────────
  static Color mauTruc(bool toi) => toi ? mauTrucToi : mauTrucSang;
  static Color mauTruc2(bool toi) => toi ? mauTruc2Toi : mauTruc2Sang;
  static Color mauXanhTheo(bool toi) => toi ? mauXanhToi : mauXanh;
  static Color mauCamTheo(bool toi) => toi ? mauCamToi : mauCam;
  static Color mauHongTheo(bool toi) => toi ? mauHongToi : mauHong;
  static Color mauDoTheo(bool toi) => toi ? mauDoToi : mauDo;
  static Color mauChuTheo(bool toi) => toi ? mauChuToi : mauChuSang;
  static Color mauNhatTheo(bool toi) => toi ? mauNhatToi : mauNhatSang;
  static Color mauMoTheo(bool toi) => toi ? mauMoToi : mauMoSang;
  static Color mauMatTheo(bool toi) => toi ? mauMatToi : mauMatSang;
  static Color mauMat2Theo(bool toi) => toi ? mauMat2Toi : mauMat2Sang;
  static Color mauVienTheo(bool toi) => toi ? mauVienToi : mauVienSang;
  static Color mauInputTheo(bool toi) => toi ? mauInputToi : mauInputSang;
  static Color mauNenTheo(bool toi) => toi ? mauNenToi : mauNenSang;
  static Color mauSidebarTheo(bool toi) => toi ? mauSidebarToi : mauSidebar;
  static LinearGradient gradient(bool toi) => toi ? gradientToi : gradientSang;
}
