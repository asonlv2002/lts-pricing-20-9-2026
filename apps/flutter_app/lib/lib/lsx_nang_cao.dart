// ═══════════════════════════════════════════════════════════════════════════
// lsx_nang_cao — port `apps/web/src/lib/lsx-nang-cao.ts`.
// Đọc snapshot bảng đặc tả kỹ thuật nâng cao (`nangCaoSpec`) cho LSX:
// khổ màng / thành phẩm / phi hao theo công đoạn + nhãn "(GIA CÔNG)".
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';
import 'quote_product_spec.dart' show LsxStageKey;

export 'quote_product_spec.dart' show LsxStageKey;

/// 1 dòng đặc tả nâng cao đã chốt trong LSX.
class LsxNangCaoRow {
  final String congDoan;
  final String vatLieu;
  final double? khoMang;
  final String? khoMangLabel;
  final double? thanhPham;
  final double? phiHao;
  final double? dauVaoNVL;
  final double? cpVatLieu;
  final String? donViGiaNVL; // 'kg' | 'm' | null
  const LsxNangCaoRow({
    required this.congDoan,
    this.vatLieu = '',
    this.khoMang,
    this.khoMangLabel,
    this.thanhPham,
    this.phiHao,
    this.dauVaoNVL,
    this.cpVatLieu,
    this.donViGiaNVL,
  });

  static LsxNangCaoRow? tryParse(dynamic value) {
    if (value is! Map) return null;
    final cd = value['congDoan'];
    if (cd is! String) return null;
    double? n(dynamic v) => v is num ? v.toDouble() : null;
    return LsxNangCaoRow(
      congDoan: cd,
      vatLieu: value['vatLieu']?.toString() ?? '',
      khoMang: n(value['khoMang']),
      khoMangLabel: value['khoMangLabel']?.toString(),
      thanhPham: n(value['thanhPham']),
      phiHao: n(value['phiHao']),
      dauVaoNVL: n(value['dauVaoNVL']),
      cpVatLieu: n(value['cpVatLieu']),
      donViGiaNVL: value['donViGiaNVL']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'congDoan': congDoan,
        'vatLieu': vatLieu,
        'khoMang': khoMang,
        'khoMangLabel': khoMangLabel,
        'thanhPham': thanhPham,
        'phiHao': phiHao,
        'dauVaoNVL': dauVaoNVL,
        'cpVatLieu': cpVatLieu,
        'donViGiaNVL': donViGiaNVL,
      };
}

List<LsxNangCaoRow> _parseSpec(dynamic raw) {
  if (raw is! List) return const [];
  return raw.map(LsxNangCaoRow.tryParse).whereType<LsxNangCaoRow>().toList();
}

/// Lấy snapshot nangCaoSpec từ order; [] nếu LSX cũ.
List<LsxNangCaoRow> layNangCaoSpec(ProductionOrder order) =>
    _parseSpec(order.snapshot['nangCaoSpec']);

LsxNangCaoRow? layDongTheoCongDoan(ProductionOrder order, String congDoan) {
  for (final r in layNangCaoSpec(order)) {
    if (r.congDoan == congDoan) return r;
  }
  return null;
}

List<LsxNangCaoRow> layDongTheoCongDoanPrefix(
        ProductionOrder order, String prefix) =>
    layNangCaoSpec(order).where((r) => r.congDoan.startsWith(prefix)).toList();

/// mm hiển thị trên LSX; null nếu không có.
double? layKhoMangMm(ProductionOrder order, String congDoan) {
  final r = layDongTheoCongDoan(order, congDoan);
  if (r == null) return null;
  if (r.khoMang != null && r.khoMang! > 0) {
    return (r.khoMang! * 1000).roundToDouble();
  }
  return null;
}

/// Text hiển thị ưu tiên `khoMangLabel` → fallback mm.
String layKhoMangText(ProductionOrder order, String congDoan) {
  final r = layDongTheoCongDoan(order, congDoan);
  if (r == null) return '';
  if (r.khoMangLabel != null && r.khoMangLabel!.trim().isNotEmpty) {
    return r.khoMangLabel!;
  }
  final mm = layKhoMangMm(order, congDoan);
  return mm != null ? '${mm.round()}mm' : '';
}

double? layThanhPham(ProductionOrder order, String congDoan) {
  final r = layDongTheoCongDoan(order, congDoan);
  if (r == null || r.thanhPham == null || r.thanhPham! <= 0) return null;
  return r.thanhPham;
}

double? layPhiHao(ProductionOrder order, String congDoan) {
  final r = layDongTheoCongDoan(order, congDoan);
  if (r == null || r.phiHao == null || r.phiHao! <= 0) return null;
  return r.phiHao;
}

/// Nhóm Ghép trong nangCaoSpec — gom nhiều vật liệu (multi-layer composite).
class NhomGhepNangCao {
  final String label;
  final int layerIndex;
  final List<LsxNangCaoRow> rows;
  const NhomGhepNangCao({
    required this.label,
    required this.layerIndex,
    required this.rows,
  });
}

List<NhomGhepNangCao> ghepNangCaoSpecTheoLop(List<LsxNangCaoRow> spec) {
  final groups = <NhomGhepNangCao>[];
  NhomGhepNangCao? current;
  for (final r in spec) {
    final cd = r.congDoan.trim();
    if (cd.isNotEmpty && RegExp(r'^ghép', caseSensitive: false).hasMatch(cd)) {
      final m = RegExp(r'(\d+)').firstMatch(cd);
      final layerIndex = m != null ? int.parse(m.group(1)!) : 0;
      current = NhomGhepNangCao(
        label: cd,
        layerIndex: layerIndex,
        rows: [r],
      );
      groups.add(current);
    } else if (current != null && cd.isEmpty) {
      current.rows.add(r);
    }
  }
  return groups;
}

/// Nguồn dữ liệu khổ màng — form/PDF/DOCX/HTML.
class NguonKhoMang {
  final dynamic nangCaoSpec;
  final double? inputSpreadWidth;
  final dynamic snapshotNangCaoSpec;
  final double? snapshotSpreadWidth;
  const NguonKhoMang({
    this.nangCaoSpec,
    this.inputSpreadWidth,
    this.snapshotNangCaoSpec,
    this.snapshotSpreadWidth,
  });

  factory NguonKhoMang.tuOrder(ProductionOrder order) => NguonKhoMang(
        snapshotNangCaoSpec: order.snapshot['nangCaoSpec'],
        snapshotSpreadWidth:
            (order.snapshot['spreadWidth'] as num?)?.toDouble(),
      );
}

/// mm hiển thị trên LSX từ nguồn bất kỳ.
double? layKhoMangTuNguon(NguonKhoMang nguon, String congDoan) {
  final rawSpec = nguon.nangCaoSpec ?? nguon.snapshotNangCaoSpec;
  final hasSpec = rawSpec is List && rawSpec.isNotEmpty;
  if (hasSpec) {
    final rows = _parseSpec(rawSpec);
    for (final r in rows) {
      if (r.congDoan == congDoan) {
        if (r.khoMang != null && r.khoMang! > 0) {
          return (r.khoMang! * 1000).roundToDouble();
        }
        return null;
      }
    }
    return null;
  }
  final sw = nguon.inputSpreadWidth ?? nguon.snapshotSpreadWidth;
  if (sw != null && sw > 0) return (sw * 1000).roundToDouble();
  return null;
}

/// Text hiển thị ưu tiên `khoMangLabel` → mm từ `layKhoMangTuNguon`.
String layKhoMangTextTuNguon(NguonKhoMang nguon, String congDoan) {
  final rawSpec = nguon.nangCaoSpec ?? nguon.snapshotNangCaoSpec;
  final hasSpec = rawSpec is List && rawSpec.isNotEmpty;
  if (hasSpec) {
    final rows = _parseSpec(rawSpec);
    for (final r in rows) {
      if (r.congDoan == congDoan) {
        if (r.khoMangLabel != null && r.khoMangLabel!.trim().isNotEmpty) {
          return r.khoMangLabel!;
        }
        final mm = layKhoMangTuNguon(nguon, congDoan);
        return mm != null ? '${mm.round()}mm' : '';
      }
    }
    return '';
  }
  final sw = nguon.inputSpreadWidth ?? nguon.snapshotSpreadWidth;
  if (sw != null && sw > 0) return '${(sw * 1000).round()}mm';
  return '';
}

// ── Khâu gia công ngoài trên LSX ──────────────────────────────────────────────

/// Map stage LSX → outsource step của báo giá.
String stageOutsourceKey(LsxStageKey stage) {
  switch (stage) {
    case LsxStageKey.inCd:
      return 'print';
    case LsxStageKey.ghep:
      return 'laminate';
    case LsxStageKey.chia:
      return 'slit';
    case LsxStageKey.lamTui:
      return 'bag';
  }
}

List<String> layOutsourceStepsTuOrder(ProductionOrder order) {
  final steps = order.snapshot['outsourceSteps'];
  if (steps is! List) return const [];
  return steps.map((e) => e.toString()).toList();
}

List<String> layOutsourceStepsTuSource(Map<String, dynamic> source) {
  final steps = source['outsourceSteps'];
  if (steps is! List) return const [];
  return steps.map((e) => e.toString()).toList();
}

bool laStageGiaCong(ProductionOrder order, LsxStageKey stage) =>
    layOutsourceStepsTuOrder(order).contains(stageOutsourceKey(stage));

bool laStageGiaCongTuSource(Map<String, dynamic> source, LsxStageKey stage) =>
    layOutsourceStepsTuSource(source).contains(stageOutsourceKey(stage));

/// Header khâu LSX — thêm "(GIA CÔNG)" khi khâu thuê ngoài.
String stageLabel(ProductionOrder order, String label, LsxStageKey stage) =>
    laStageGiaCong(order, stage) ? '$label (GIA CÔNG)' : label;

String stageLabelTuSource(
        Map<String, dynamic> source, String label, LsxStageKey stage) =>
    laStageGiaCongTuSource(source, stage) ? '$label (GIA CÔNG)' : label;
