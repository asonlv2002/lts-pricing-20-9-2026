// ═══════════════════════════════════════════════════════════════════════════
// do_day_snapshot — port `apps/web/src/lib/do-day-snapshot.ts`.
// Tổng độ dày (mic) cho báo giá — ưu tiên snapshot `input.totalThicknessMic`
// (engine đã chốt lúc lưu), fallback tính lại qua engine, cuối cùng cộng tay
// theo từng lớp (chỉ đếm lớp không trống, có ghi đè micOverrides).
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';

const List<String> _cacKhoaLop = [
  'layer1Id',
  'layer2Id',
  'layer3Id',
  'layer4Id',
  'layer5Id',
];

/// [tinhLai] = hàm gọi engine (trả totalThickness) hoặc null nếu không có.
double tinhTongDoDayCuaInput(
  CalculateInput? input, {
  required List<MaterialDef> materials,
  double Function(CalculateInput input)? tinhLai,
}) {
  if (input == null) return 0;

  final snapshot = (input.raw['totalThicknessMic'] as num?)?.toDouble();
  if (snapshot != null && snapshot.isFinite && snapshot > 0) return snapshot;

  if (tinhLai != null) {
    try {
      final doDay = tinhLai(input);
      if (doDay.isFinite && doDay > 0) return doDay;
    } catch (_) {
      // rơi xuống cộng tay bên dưới
    }
  }

  final micOverrides =
      (input.raw['micOverrides'] as Map?)?.cast<String, dynamic>() ?? const {};
  var tong = 0.0;
  for (final khoaLop in _cacKhoaLop) {
    final matId = input.raw[khoaLop] as String?;
    if (matId == null || matId.isEmpty) continue;
    MaterialDef? mat;
    for (final m in materials) {
      if (m.id == matId) {
        mat = m;
        break;
      }
    }
    final ghiDe = (micOverrides[khoaLop] as num?)?.toDouble();
    tong += ghiDe ?? mat?.thickness ?? 0;
  }
  return tong > 0 ? tong : 0;
}
