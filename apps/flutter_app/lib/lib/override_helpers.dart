// ═══════════════════════════════════════════════════════════════════════════
// override_helpers — port helper ghi đè từ apps/web/src/lib/override-display.ts
// + ManHinhQuanLy.tsx (apDungVatLieuGhiDe / datGhiDeChiTiet / countOverrideChanges).
// Dùng chung cho OverrideTableSection (thường) + AdvancedSpecSection (nâng cao).
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';
import '../store/app_state.dart' show OverrideTableRef;

const Map<String, String> nhanDongGhiDe = {
  'print': 'In',
  'lam-2': 'Ghép L2',
  'lam-3': 'Ghép L3',
  'lam-4': 'Ghép L4',
  'lam-5': 'Ghép L5',
  'cut': 'Cắt',
  'chia': 'Chia',
  'matte': 'Lật mặt',
};

const Map<String, String> nhanTruongGhiDe = {
  'stage': 'Công đoạn',
  'mat': 'Vật liệu',
  'materialId': 'Mã vật liệu',
  'width': 'Khổ',
  'meters': 'Thành phẩm',
  'waste': 'Phi hao',
  'inputVL': 'Đầu vào VL',
  'cpsx': 'CPSX',
  'costCPSX': 'Thành tiền CPSX',
  'matPrice': 'CP vật liệu',
  'costMat': 'Thành tiền CPVL',
  'materialName': 'Vật liệu',
  'rawMatPrice': 'Giá NVL',
  'doDay': 'Độ dày (mic)',
  'cpMucKeoPerM2': 'Giá mực, DM, keo, khác',
  'thoiGianPhut': 'Thời gian SX',
  'cpNhanCongPerPhut': 'Giá nhân công',
  'cpDienPerPhut': 'Giá điện',
};

/// Đếm số thay đổi thực (bỏ qua materialId — mirror `countOverrideChanges`).
int countOverrideChanges(OverrideTableRef? overrides) {
  if (overrides == null) return 0;
  var sum = 0;
  for (final row in overrides.values) {
    for (final entry in row.entries) {
      final field = entry.key;
      final value = entry.value;
      if (field == 'materialId') continue;
      if (field != 'detailOverrides' || value is! Map) {
        sum += 1;
        continue;
      }
      for (final detail in value.values) {
        if (detail is! Map) continue;
        sum += detail.keys.where((k) => k != 'materialId').length;
      }
    }
  }
  return sum;
}

/// Ghi đè theo từng chi tiết ghép — mirror `datGhiDeChiTiet` (ManHinhQuanLy:210).
OverrideTableRef datGhiDeChiTiet(
  OverrideTableRef current,
  String rowKey,
  int chiTietIndex,
  String truong,
  Object? giaTri,
) {
  final next = saoChepOverride(current);
  final hienTai = Map<String, dynamic>.from(
      (next[rowKey]?['detailOverrides'] as Map?)?.cast<String, dynamic>() ?? {});
  final dongHienTai = Map<String, dynamic>.from(
      (hienTai['$chiTietIndex'] as Map?)?.cast<String, dynamic>() ?? {});
  if (giaTri == null) {
    dongHienTai.remove(truong);
  } else {
    dongHienTai[truong] = giaTri;
  }
  final tiepTheo = Map<String, dynamic>.from(hienTai);
  if (dongHienTai.isNotEmpty) {
    tiepTheo['$chiTietIndex'] = dongHienTai;
  } else {
    tiepTheo.remove('$chiTietIndex');
  }
  final row = Map<String, dynamic>.from(next[rowKey] ?? {});
  if (tiepTheo.isNotEmpty) {
    row['detailOverrides'] = tiepTheo;
  } else {
    row.remove('detailOverrides');
  }
  if (row.isEmpty) {
    next.remove(rowKey);
  } else {
    next[rowKey] = row;
  }
  return next;
}

/// Deep copy bảng ghi đè.
OverrideTableRef saoChepOverride(OverrideTableRef src) => {
      for (final e in src.entries) e.key: Map<String, dynamic>.of(e.value),
    };

/// Áp dụng đổi vật liệu lên ghi đè (dòng thường hoặc chi tiết) — mirror
/// `apDungVatLieuGhiDe` (ManHinhQuanLy:273-322).
///
/// Trả về bảng ghi đè mới. [mat] = null/trùng VL gốc → reset toàn bộ ghi đè VL.
OverrideTableRef apDungVatLieuGhiDe({
  required OverrideTableRef current,
  required String rowKey,
  int? chiTietIndex,
  String? giaTriGocId,
  MaterialDef? mat,
  Map<String, dynamic>? engineParams,
}) {
  final laChiTiet = chiTietIndex != null;
  var next = saoChepOverride(current);

  void ghi(String truong, Object? giaTri) {
    if (laChiTiet) {
      if (truong == 'mat') return;
      next = datGhiDeChiTiet(next, rowKey, chiTietIndex, truong, giaTri);
      return;
    }
    if (truong == 'materialName') return;
    final row = Map<String, dynamic>.from(next[rowKey] ?? {});
    if (giaTri == null) {
      row.remove(truong);
    } else {
      row[truong] = giaTri;
    }
    if (row.isEmpty) {
      next.remove(rowKey);
    } else {
      next[rowKey] = row;
    }
  }

  if (mat == null || (giaTriGocId != null && mat.id == giaTriGocId)) {
    ghi('materialId', null);
    ghi(laChiTiet ? 'materialName' : 'mat', null);
    ghi('matPrice', null);
    ghi('rawMatPrice', null);
    ghi('doDay', null);
    if (rowKey == 'print') ghi('cpsx', null);
    return next;
  }

  final giaM2 = mat.pricePerM2 ??
      (mat.pricePerKg * mat.thickness * mat.density / 1000);
  ghi('materialId', mat.id);
  ghi(laChiTiet ? 'materialName' : 'mat', mat.name);
  ghi('matPrice', giaM2);
  ghi('rawMatPrice', mat.pricePerKg);
  ghi('doDay', null);
  if (rowKey == 'print' && engineParams != null) {
    final ep = engineParams;
    final numColors = ((ep['numColors'] as num?) ?? 0).toInt();
    if (numColors > 0) {
      final isPrintFilm = ep['isPrintFilm'] == true;
      final metallicSurcharge =
          ((ep['metallicSurcharge'] as num?) ?? 0).toDouble();
      final coverageRatio = ((ep['coverageRatio'] as num?) ?? 1).toDouble();
      final laborCost = ((ep['laborCost'] as num?) ?? 0).toDouble();
      double giaMuc;
      if (isPrintFilm) {
        final u = '${mat.id} ${mat.name}'.toUpperCase();
        final isBOPP = u.contains('BOPP');
        giaMuc = ((isBOPP
                    ? ep['printFilmInkBOPP']
                    : ep['printFilmInkOther']) as num?)
                ?.toDouble() ??
            0;
        ghi('cpsx', numColors * giaMuc + metallicSurcharge);
      } else {
        giaMuc = mat.inkPricePerColor != 0
            ? mat.inkPricePerColor
            : (mat.isPETorPA ? 135 : 120);
        ghi('cpsx',
            numColors * giaMuc * coverageRatio + laborCost + metallicSurcharge);
      }
    }
  }
  return next;
}

/// Ghi 1 field cấp dòng (không đụng detailOverrides).
OverrideTableRef ghiDeDong(
  OverrideTableRef current,
  String rowKey,
  String truong,
  Object? giaTri,
) {
  final next = saoChepOverride(current);
  final row = Map<String, dynamic>.from(next[rowKey] ?? {});
  if (giaTri == null) {
    row.remove(truong);
  } else {
    row[truong] = giaTri;
  }
  if (row.isEmpty) {
    next.remove(rowKey);
  } else {
    next[rowKey] = row;
  }
  return next;
}

/// Các biến thể cùng nhóm khác độ dày (mirror web ODoDay dropdown).
List<MaterialDef> bienTheCungNhom(List<MaterialDef> materials, MaterialDef mat) {
  if (mat.group == null || mat.group!.isEmpty) return const [];
  final ds = materials.where((m) => m.group == mat.group).toList();
  final doDay = ds.map((m) => m.thickness).toSet().toList()..sort();
  if (doDay.length <= 1) return const [];
  return ds;
}

/// Độ dày hiển thị của biến thể (làm tròn nếu nguyên).
String nhanDoDay(double thickness) => thickness == thickness.roundToDouble()
    ? '${thickness.toInt()}μ'
    : '$thicknessμ';
