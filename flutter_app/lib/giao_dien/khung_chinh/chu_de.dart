// giao_dien/khung_chinh/chu_de.dart — Design tokens + ThemeData
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ChuDe {
  // ─── Màu sắc ─────────────────────────────────────────────────────────────
  static const mauNenSang    = Color(0xFFF0F2F5);
  static const mauNenToi     = Color(0xFF0F172A);
  static const mauMatSang    = Color(0xFFFFFFFF);
  static const mauMatToi     = Color(0xFF1E293B);
  static const mauMat2Sang   = Color(0xFFF8F9FB);
  static const mauMat2Toi    = Color(0xFF334155);
  static const mauTrucSang   = Color(0xFF4F46E5); // accent
  static const mauTrucToi    = Color(0xFF818CF8);
  static const mauTruc2Sang  = Color(0xFF0891B2); // accent2
  static const mauTruc2Toi   = Color(0xFF22D3EE);
  static const mauXanh       = Color(0xFF059669);
  static const mauXanhToi    = Color(0xFF34D399);
  static const mauDo         = Color(0xFFDC2626);
  static const mauDoToi      = Color(0xFFF87171);
  static const mauCam        = Color(0xFFD97706);
  static const mauCamToi     = Color(0xFFFBBF24);
  static const mauHong       = Color(0xFFDB2777);
  static const mauHongToi    = Color(0xFFF472B6);
  static const mauChuSang    = Color(0xFF1E293B);
  static const mauChuToi     = Color(0xFFE2E8F0);
  static const mauNhatSang   = Color(0xFF64748B);
  static const mauNhatToi    = Color(0xFF94A3B8);
  static const mauMoSang     = Color(0xFF94A3B8);
  static const mauMoToi      = Color(0xFF475569);
  static const mauVienSang   = Color(0x14000000);
  static const mauVienToi    = Color(0x26636780);
  static const mauInputSang  = Color(0xFFF1F5F9);
  static const mauInputToi   = Color(0x40000000);
  // Sidebar luôn tối
  static const mauSidebar    = Color(0xFF0F172A);
  static const mauSidebarToi = Color(0xFF080E1A);

  static const double bKinhRadius = 14;

  // ─── Gradient ─────────────────────────────────────────────────────────────
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

  // ─── Helper ───────────────────────────────────────────────────────────────
  static Color mauTruc(bool toi) => toi ? mauTrucToi : mauTrucSang;
  static Color mauTruc2(bool toi) => toi ? mauTruc2Toi : mauTruc2Sang;
  static Color mauXanhTheo(bool toi) => toi ? mauXanhToi : mauXanh;
  static Color mauCamTheo(bool toi) => toi ? mauCamToi : mauCam;
  static Color mauHongTheo(bool toi) => toi ? mauHongToi : mauHong;
  static Color mauChuTheo(bool toi) => toi ? mauChuToi : mauChuSang;
  static Color mauNhatTheo(bool toi) => toi ? mauNhatToi : mauNhatSang;
  static Color mauMatTheo(bool toi) => toi ? mauMatToi : mauMatSang;
  static Color mauMat2Theo(bool toi) => toi ? mauMat2Toi : mauMat2Sang;
  static Color mauVienTheo(bool toi) => toi ? mauVienToi : mauVienSang;
  static Color mauInputTheo(bool toi) => toi ? mauInputToi : mauInputSang;
  static LinearGradient gradient(bool toi) => toi ? gradientToi : gradientSang;
  static Color mauNenTheo(bool toi) => toi ? mauNenToi : mauNenSang;
}
