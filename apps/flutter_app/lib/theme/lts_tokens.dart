// ═══════════════════════════════════════════════════════════════════════════
// LTS Tokens — chép nguyên văn CSS variables từ apps/web/src/app/globals.css
// :root (light) + [data-theme="dark"] + các giá trị hard-code trong
// .lts-shell--mobile / .lts-mobile-*. Mọi màu/khoảng cách/bóng của kit phải
// lấy từ file này, không hard-code con số ở widget.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

class LtsPalette {
  final Color bg; // :root --bg
  final Color shellBg; // .lts-shell--mobile background (#f4f7fb)
  final Color surface;
  final Color surface2;
  final Color border;
  final Color accent; // --accent
  final Color accent2;
  final Color green;
  final Color red;
  final Color orange;
  final Color pink;
  final Color text;
  final Color muted;
  final Color dim;
  final Color inputBg;
  final Color tableStripe;
  final Color navyTop; // header gradient #08192f
  final Color navyBottom; // #07172b
  final Color navyGlow; // radial rgba(91,77,255,.22)
  final Color hubAccent; // #5b4dff (tab active, hub gradient)
  final Color hubAccent2; // #7c3aed
  final Color white; // chữ trên nền navy

  const LtsPalette({
    required this.bg,
    required this.shellBg,
    required this.surface,
    required this.surface2,
    required this.border,
    required this.accent,
    required this.accent2,
    required this.green,
    required this.red,
    required this.orange,
    required this.pink,
    required this.text,
    required this.muted,
    required this.dim,
    required this.inputBg,
    required this.tableStripe,
    required this.navyTop,
    required this.navyBottom,
    required this.navyGlow,
    required this.hubAccent,
    required this.hubAccent2,
    required this.white,
  });

  static const light = LtsPalette(
    bg: Color(0xFFF0F2F5),
    shellBg: Color(0xFFF4F7FB),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF8F9FB),
    border: Color(0x14000000), // rgba(0,0,0,.08)
    accent: Color(0xFF4F46E5),
    accent2: Color(0xFF0891B2),
    green: Color(0xFF059669),
    red: Color(0xFFDC2626),
    orange: Color(0xFFD97706),
    pink: Color(0xFFDB2777),
    text: Color(0xFF1E293B),
    muted: Color(0xFF64748B),
    dim: Color(0xFF94A3B8),
    inputBg: Color(0xFFF1F5F9),
    tableStripe: Color(0x05000000), // rgba(0,0,0,.02)
    navyTop: Color(0xFF08192F),
    navyBottom: Color(0xFF07172B),
    navyGlow: Color(0x385B4DFF), // rgba(91,77,255,.22)
    hubAccent: Color(0xFF5B4DFF),
    hubAccent2: Color(0xFF7C3AED),
    white: Color(0xFFFFFFFF),
  );

  static const dark = LtsPalette(
    bg: Color(0xFF0F172A),
    shellBg: Color(0xFF0F172A),
    surface: Color(0xF21E293B), // rgba(30,41,59,.95)
    surface2: Color(0x80334155), // rgba(51,65,85,.5)
    border: Color(0x266366F1), // rgba(99,102,241,.15)
    accent: Color(0xFF818CF8),
    accent2: Color(0xFF22D3EE),
    green: Color(0xFF34D399),
    red: Color(0xFFF87171),
    orange: Color(0xFFFBBF24),
    pink: Color(0xFFF472B6),
    text: Color(0xFFE2E8F0),
    muted: Color(0xFF94A3B8),
    dim: Color(0xFF475569),
    inputBg: Color(0x40000000), // rgba(0,0,0,.25)
    tableStripe: Color(0x05FFFFFF),
    navyTop: Color(0xFF08192F),
    navyBottom: Color(0xFF07172B),
    navyGlow: Color(0x385B4DFF),
    hubAccent: Color(0xFF818CF8),
    hubAccent2: Color(0xFFA78BFA),
    white: Color(0xFFFFFFFF),
  );
}

class LtsT {
  LtsT._();
  static LtsPalette of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark
          ? LtsPalette.dark
          : LtsPalette.light;

  // ── Border radius (CSS px) ──
  static const double rInput = 10; // .form-input
  static const double rCard = 14; // --radius
  static const double rCardMobile = 20; // .lts-mobile-action-card / module header bottom
  static const double rHeader = 22; // hub header / tab bar top radius
  static const double rSheet = 24; // bottom sheet top

  // ── Shadows ──
  static List<BoxShadow> get shadowSm => const [
        BoxShadow(color: Color(0x0F000000), blurRadius: 3, offset: Offset(0, 1)),
      ];
  static List<BoxShadow> get shadowMd => const [
        BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
      ];
  static List<BoxShadow> get hubCard => const [
        BoxShadow(color: Color(0x0F0F172A), blurRadius: 14, offset: Offset(0, 6)),
      ];
  static List<BoxShadow> get tabShadow => const [
        BoxShadow(color: Color(0x1E0F172A), blurRadius: 34, offset: Offset(0, -12)),
      ];
  static List<BoxShadow> get pillShadow => const [
        BoxShadow(color: Color(0x240F172A), blurRadius: 24, offset: Offset(0, 8)),
      ];
  static List<BoxShadow> get navyHeaderShadow => const [
        BoxShadow(color: Color(0x2E0F172A), blurRadius: 34, offset: Offset(0, 16)),
      ];
  static List<BoxShadow> get primaryPillShadow => const [
        BoxShadow(color: Color(0x575B4DFF), blurRadius: 22, offset: Offset(0, 10)),
      ];

  // ── Gradients ──
  static const LinearGradient navyBg = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF08192F), Color(0xFF07172B)],
  );

  static const LinearGradient primaryPill = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF5B4DFF), Color(0xFF7C3AED)],
  );

  static LinearGradient miniStrip(LtsPalette p) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          p.accent.withValues(alpha: 0.10),
          p.accent2.withValues(alpha: 0.08),
        ],
      );

  /// Radial glow rgba(91,77,255,.22) tại 82% 12% — đặt làm lớp phủ trong Stack.
  static BoxDecoration get navyGlowOverlay => BoxDecoration(
        gradient: RadialGradient(
          center: const Alignment(0.64, -0.76), // ≈ 82% x, 12% y
          radius: 0.5,
          colors: [const Color(0x385B4DFF), Colors.transparent],
        ),
      );

  static Color iconBoxFg(LtsIconVariant v) => switch (v) {
        LtsIconVariant.violet => const Color(0xFF5B4DFF),
        LtsIconVariant.sky => const Color(0xFF0EA5E9),
        LtsIconVariant.emerald => const Color(0xFF10B981),
        LtsIconVariant.orange => const Color(0xFFF97316),
        LtsIconVariant.slate => const Color(0xFF475569),
        LtsIconVariant.rose => const Color(0xFFE11D48),
      };

  static Color iconBoxBg(LtsIconVariant v) => switch (v) {
        LtsIconVariant.violet => const Color(0xFFF0EEFF),
        LtsIconVariant.sky => const Color(0xFFEAF6FF),
        LtsIconVariant.emerald => const Color(0xFFEAFBF4),
        LtsIconVariant.orange => const Color(0xFFFFF3E8),
        LtsIconVariant.slate => const Color(0xFFF1F5F9),
        LtsIconVariant.rose => const Color(0xFFFFF1F2),
      };
}

enum LtsIconVariant { violet, sky, emerald, orange, slate, rose }
