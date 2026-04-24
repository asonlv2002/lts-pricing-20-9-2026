// ═══════════════════════════════════════════════════════════════════════════
// Format helper — số tiếng Việt (1.234.567 ₫), phần trăm, m², …
// ═══════════════════════════════════════════════════════════════════════════
import 'package:intl/intl.dart';

class Fmt {
  static final _nf = NumberFormat.decimalPattern('vi_VN');
  static final _nf2 = NumberFormat('#,##0.##', 'vi_VN');
  static final _nf3 = NumberFormat('#,##0.###', 'vi_VN');
  static final _nf4 = NumberFormat('#,##0.####', 'vi_VN');
  static final _nfPct = NumberFormat('#,##0.##', 'vi_VN');

  /// 1234567 → "1.234.567"
  static String n(num? v) => v == null ? '0' : _nf.format(v);

  /// 1234567 → "1.234.567 ₫"
  static String vnd(num? v) => v == null ? '0 ₫' : '${_nf.format(v.round())} ₫';

  /// 0.1234 → "12.34"
  static String pct(num? v) => v == null ? '0' : _nfPct.format(v * 100);

  /// 1.234 → "1,23"
  static String d(num? v) => v == null ? '0' : _nf2.format(v);

  /// 1.234 → "1,234"
  static String d3(num? v) => v == null ? '0' : _nf3.format(v);

  /// 1.23456 → "1,2346"
  static String d4(num? v) => v == null ? '0' : _nf4.format(v);

  /// 12_500_000 → "12.5" (triệu)
  static String shortM(num? v) {
    if (v == null) return '0';
    final m = v / 1000000;
    if (m >= 1000) return '${(m / 1000).toStringAsFixed(1)}tỷ';
    if (m >= 1) return m.toStringAsFixed(1);
    final k = v / 1000;
    return '${k.toStringAsFixed(0)}k';
  }

  /// "2026-04-23T10:30:00" → "23/04/2026 10:30"
  static String dateTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('dd/MM/yyyy HH:mm', 'vi_VN').format(dt);
    } catch (_) {
      return iso;
    }
  }

  static String date(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return DateFormat('dd/MM/yyyy', 'vi_VN').format(dt);
    } catch (_) {
      return iso;
    }
  }
}
