// ═══════════════════════════════════════════════════════════════════════════
// Theme — mirror design system web mobile (globals.css). Tokens ở lts_tokens.
// AppColors/AppGradients giữ làm alias tương thích ngược cho các màn chưa port.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import 'lts_tokens.dart';

class AppColors {
  static const seed = Color(0xFF4F46E5); // --accent
  static const accent = Color(0xFF0891B2); // --accent2
  static const success = Color(0xFF059669); // --green
  static const warning = Color(0xFFD97706); // --orange
  static const danger = Color(0xFFDC2626); // --red
  static const info = Color(0xFF4F46E5); // --accent
  static const muted = Color(0xFF64748B); // --muted

  static const bgSuccess = Color(0xFFECFDF5);
  static const bgWarning = Color(0xFFFEF3C7);
  static const bgDanger = Color(0xFFFEE2E2);
  static const bgInfo = Color(0xFFEEF2FF);
  static const bgAccent = Color(0xFFECFEFF);
}

class AppGradients {
  static LinearGradient hero(ColorScheme scheme) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [LtsPalette.light.accent, LtsPalette.light.accent2],
      );

  static LinearGradient subtle(ColorScheme scheme) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          scheme.primary.withValues(alpha: 0.35),
          scheme.surface,
        ],
      );

  static const LinearGradient brandMark = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF5B4DFF), Color(0xFF0891B2)],
  );
}

class AppTheme {
  static const String fontFamily = 'Inter';

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  static ThemeData _base(Brightness brightness) {
    final p = brightness == Brightness.dark ? LtsPalette.dark : LtsPalette.light;
    final scheme = ColorScheme(
      brightness: brightness,
      primary: p.accent,
      onPrimary: Colors.white,
      secondary: p.accent2,
      onSecondary: Colors.white,
      error: p.red,
      onError: Colors.white,
      surface: p.surface,
      onSurface: p.text,
      surfaceContainerHighest: p.inputBg,
      outline: p.muted,
      outlineVariant: p.border,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: brightness,
      fontFamily: fontFamily,
      scaffoldBackgroundColor: p.shellBg,
      visualDensity: VisualDensity.standard,
    );
    return base.copyWith(
      textTheme: _textTheme(p),
      scaffoldBackgroundColor: p.shellBg,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: p.surface,
        foregroundColor: p.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(LtsT.rCard),
          side: BorderSide(color: p.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.inputBg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        isDense: true,
        hintStyle: TextStyle(color: p.dim, fontSize: 12),
        labelStyle: TextStyle(color: p.muted, fontSize: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(LtsT.rInput),
          borderSide: BorderSide(color: p.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(LtsT.rInput),
          borderSide: BorderSide(color: p.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(LtsT.rInput),
          borderSide: BorderSide(color: p.accent, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          side: BorderSide(color: p.border),
        ),
      ),
      dividerTheme: DividerThemeData(color: p.border, space: 1, thickness: 1),
      chipTheme: base.chipTheme.copyWith(
        side: BorderSide(color: p.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
        backgroundColor: p.surface2,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: p.surface,
        contentTextStyle: TextStyle(color: p.text, fontSize: 13),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: p.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
            borderRadius:
                BorderRadius.vertical(top: Radius.circular(LtsT.rSheet))),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LtsT.rCardMobile)),
        backgroundColor: p.surface,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
      }),
    );
  }

  static TextTheme _textTheme(LtsPalette p) {
    TextStyle st(double size, FontWeight w, Color c,
            {double? ls, double? h}) =>
        TextStyle(
            fontSize: size,
            fontWeight: w,
            color: c,
            letterSpacing: ls ?? 0,
            height: h ?? 1.4);
    return TextTheme(
      displaySmall: st(28, FontWeight.w800, p.text, ls: -0.8, h: 1.15),
      headlineMedium: st(20, FontWeight.w800, p.text, ls: -0.5, h: 1.2),
      headlineSmall: st(18, FontWeight.w800, p.text, ls: -0.3, h: 1.2),
      titleLarge: st(16, FontWeight.w800, p.text, ls: -0.16),
      titleMedium: st(14, FontWeight.w700, p.text),
      titleSmall: st(13, FontWeight.w600, p.text),
      bodyLarge: st(14, FontWeight.w400, p.text),
      bodyMedium: st(13, FontWeight.w400, p.text),
      bodySmall: st(12, FontWeight.w500, p.muted),
      labelLarge: st(13, FontWeight.w600, p.text),
      labelMedium: st(12, FontWeight.w600, p.muted, ls: 0.3),
      labelSmall: st(10.5, FontWeight.w600, p.muted, ls: 0.42),
    );
  }
}
