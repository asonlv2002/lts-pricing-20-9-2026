// ═══════════════════════════════════════════════════════════════════════════
// quote_product_spec — port `apps/web/src/lib/quote-product-spec.ts`.
// Đặc tả sản phẩm cho báo giá/LSX: loại túi, kích thước, quy cách, mô tả đơn
// hàng, mặt sau, công đoạn. Dùng cho màn báo giá + LSX.
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';
import 'format_structure.dart';

/// Công đoạn sản xuất áp dụng cho ghi chú / mô tả khác.
enum LsxStageKey { inCd, ghep, chia, lamTui }

/// Ghi chú công đoạn (dropdown + text).
class LsxStageNote {
  final LsxStageKey stage;
  final String text;
  const LsxStageNote({required this.stage, required this.text});
}

/// Format mô tả công đoạn cho báo giá (bỏ dòng trống).
List<String> formatStageDescriptionsForQuote(
  Iterable<LsxStageNote> descriptions,
) =>
    descriptions
        .map((d) => d.text.trim())
        .where((t) => t.isNotEmpty)
        .toList();

/// Như trên nhưng nhận mảng raw từ JSON (`[{stage, text}]`).
List<String> formatStageDescriptionsRaw(dynamic descriptions) {
  if (descriptions is! List) return const [];
  final out = <String>[];
  for (final e in descriptions) {
    if (e is Map) {
      final text = e['text']?.toString().trim() ?? '';
      if (text.isNotEmpty) out.add(text);
    }
  }
  return out;
}

/// Đặc tả túi cho báo giá (mirror `QuoteProductBagSpec`).
class QuoteProductBagSpec {
  String bagType;
  double widthMm;
  double lengthMm;
  double sideSealMm;
  bool hasHeadSeal;
  double headSealMm;
  double gussetMm;
  double backSealMm;
  bool hasZipper;
  double zipperDistanceMm;
  double standupBottomSideMm;
  bool hasTearNotch;
  double tearNotchFromTopMm;
  double tearNotchFromBottomMm;
  bool hasHalfMoonBottom;
  bool hasHangHole;
  String hangHoleDescription;
  bool hasHandleHole;
  String handleHoleDescription;
  bool hasBottomSeal;
  double bottomSealMm;
  double lidMm;
  bool hasCylinder;
  bool includeCylinderInQuote;
  bool includeBagInQuote;
  double cylinderQuantity;
  double cylinderUnitPrice;
  String? cylinderNote;
  String otherDescription;
  List<LsxStageNote> stageNotes;
  List<LsxStageNote> stageDescriptions;
  String structureBack;
  bool structureSwapped;
  bool hasStructureBack;
  String bottomFollows; // 'front' | 'back'
  bool hasHandle;
  String handleOptionKey;
  bool hasSongSieuAm;
  double songSieuAmMm;
  double rollLengthM;
  String chieuRaCuonMang;

  QuoteProductBagSpec({
    this.bagType = '',
    this.widthMm = 0,
    this.lengthMm = 0,
    this.sideSealMm = 0,
    this.hasHeadSeal = false,
    this.headSealMm = 0,
    this.gussetMm = 0,
    this.backSealMm = 0,
    this.hasZipper = false,
    this.zipperDistanceMm = 0,
    this.standupBottomSideMm = 0,
    this.hasTearNotch = false,
    this.tearNotchFromTopMm = 0,
    this.tearNotchFromBottomMm = 0,
    this.hasHalfMoonBottom = false,
    this.hasHangHole = false,
    this.hangHoleDescription = '',
    this.hasHandleHole = false,
    this.handleHoleDescription = '',
    this.hasBottomSeal = false,
    this.bottomSealMm = 0,
    this.lidMm = 0,
    this.hasCylinder = false,
    this.includeCylinderInQuote = true,
    this.includeBagInQuote = true,
    this.cylinderQuantity = 1,
    this.cylinderUnitPrice = 0,
    this.cylinderNote,
    this.otherDescription = '',
    this.stageNotes = const [],
    this.stageDescriptions = const [],
    this.structureBack = '',
    this.structureSwapped = false,
    this.hasStructureBack = false,
    this.bottomFollows = 'front',
    this.hasHandle = false,
    this.handleOptionKey = '',
    this.hasSongSieuAm = false,
    this.songSieuAmMm = 0,
    this.rollLengthM = 0,
    this.chieuRaCuonMang = '',
  });
}

enum BagSpecConditionalField {
  gusset,
  backSeal,
  standupBottom,
  sideSeal,
  lid,
  songSieuAm,
}

bool shouldShowBagSpecField(String bagType, BagSpecConditionalField field) {
  switch (field) {
    case BagSpecConditionalField.gusset:
      return const ['4bien', 'xephong_lech', 'xephong_giua'].contains(bagType);
    case BagSpecConditionalField.backSeal:
      return const ['xephong_lech', 'xephong_giua'].contains(bagType);
    case BagSpecConditionalField.sideSeal:
      return !const ['cutSeal', 'cutSealNapKeo', 'xephong_lech', 'xephong_giua']
          .contains(bagType);
    case BagSpecConditionalField.lid:
      return bagType == 'cutSealNapKeo';
    case BagSpecConditionalField.songSieuAm:
      return bagType == 'cutSealNapKeo';
    case BagSpecConditionalField.standupBottom:
      return bagType == 'dayDung';
  }
}

const Map<String, String> _bagTypeNames = {
  '3bien': '3 biên',
  '4bien': '4 biên',
  'xephong_lech': 'xếp hông dán lưng lệch',
  'xephong_giua': 'xếp hông dán lưng giữa',
  'dayDung': 'đáy đứng',
  'cutSeal': 'cut seal',
  'cutSealNapKeo': 'cut seal mở miệng có nắp keo',
};

const List<String> _zipperBagTypes = [
  '3bien',
  'dayDung',
  'cutSeal',
  'cutSealNapKeo',
];

String bagTypeLabelTuInput(String bagType, bool hasZipper,
    {bool upper = false}) {
  if (bagType.isEmpty) return '';
  final ten = _bagTypeNames[bagType];
  if (ten == null) return upper ? bagType.toUpperCase() : bagType;
  final label = _zipperBagTypes.contains(bagType) && hasZipper
      ? 'Túi zipper $ten'
      : 'Túi $ten';
  return upper ? label.toUpperCase() : label;
}

QuoteProductBagSpec buildDefaultBagSpec(CalculateInput input) {
  final raw = input.raw;
  final productType = raw['productType']?.toString() ?? '';
  final bagType = raw['bagType']?.toString() ?? '';
  final spreadWidth = (raw['spreadWidth'] as num?)?.toDouble() ?? 0;
  final cutStep = (raw['cutStep'] as num?)?.toDouble() ?? 0;
  return QuoteProductBagSpec(
    bagType: bagType,
    widthMm: spreadWidth > 0 ? (spreadWidth * 1000).roundToDouble() : 0,
    lengthMm: cutStep > 0 ? (cutStep * 1000).roundToDouble() : 0,
    hasZipper: raw['hasZipper'] == true,
    standupBottomSideMm: bagType == 'dayDung' ? 50 : 0,
    cylinderQuantity: (raw['numColors'] as num?)?.toDouble() ?? 1,
    hasStructureBack: (raw['layer2AltId'] as String?)?.isNotEmpty ?? false,
    hasHandle: raw['hasHandle'] == true,
    handleOptionKey: raw['handleOptionKey']?.toString() ?? '',
    rollLengthM:
        productType == 'mang' ? (raw['filmRollLength'] as num?)?.toDouble() ?? 6000 : 0,
  );
}

String buildSideStructure(
  List<MaterialDef> materials,
  String? layer1Id,
  String? layer2Id,
  String? layer3Id,
  String? layer4Id,
  String? layer5Id,
) {
  final parts = <String>[];
  MaterialDef? find(String? id) {
    if (id == null || id.isEmpty) return null;
    for (final m in materials) {
      if (m.id == id) return m;
    }
    return null;
  }

  final l1 = find(layer1Id);
  if (l1 != null) parts.add('${l1.name} ${l1.thickness}');
  final l2 = find(layer2Id);
  if (l2 != null) parts.add('${l2.name} ${l2.thickness}');
  for (final id in [layer3Id, layer4Id, layer5Id]) {
    final m = find(id);
    if (m != null) parts.add('${m.name} ${m.thickness}');
  }
  return parts.join('//');
}

class StructureBackOption {
  final String label;
  final String structureBack;
  final String bottomFollows;
  final bool structureSwapped;
  const StructureBackOption({
    required this.label,
    required this.structureBack,
    required this.bottomFollows,
    required this.structureSwapped,
  });
}

List<StructureBackOption> generateStructureBackOptions(
  CalculateInput input,
  String bagType,
  List<MaterialDef> materials,
) {
  final raw = input.raw;
  final frontMatId = raw['layer2Id'] as String?;
  final backMatId = raw['layer2AltId'] as String?;
  final frontStructure = buildSideStructure(
    materials,
    raw['layer1Id'] as String?,
    frontMatId,
    raw['layer3Id'] as String?,
    raw['layer4Id'] as String?,
    raw['layer5Id'] as String?,
  );
  final backStructure = buildSideStructure(
    materials,
    raw['layer1Id'] as String?,
    backMatId,
    raw['layer3Id'] as String?,
    raw['layer4Id'] as String?,
    raw['layer5Id'] as String?,
  );
  String clean(String s) => boSoCauTruc(s);

  if (bagType == 'dayDung') {
    return [
      StructureBackOption(
        label:
            'Mặt trước + Đáy: ${clean(frontStructure)}, Mặt sau: ${clean(backStructure)}',
        structureBack: backStructure,
        bottomFollows: 'front',
        structureSwapped: false,
      ),
      StructureBackOption(
        label:
            'Mặt trước + Đáy: ${clean(backStructure)}, Mặt sau: ${clean(frontStructure)}',
        structureBack: backStructure,
        bottomFollows: 'front',
        structureSwapped: true,
      ),
      StructureBackOption(
        label:
            'Mặt sau + Đáy: ${clean(backStructure)}, Mặt trước: ${clean(frontStructure)}',
        structureBack: backStructure,
        bottomFollows: 'back',
        structureSwapped: false,
      ),
      StructureBackOption(
        label:
            'Mặt sau + Đáy: ${clean(frontStructure)}, Mặt trước: ${clean(backStructure)}',
        structureBack: backStructure,
        bottomFollows: 'back',
        structureSwapped: true,
      ),
    ];
  }

  return [
    StructureBackOption(
      label:
          'Mặt trước: ${clean(frontStructure)}, Mặt sau: ${clean(backStructure)}',
      structureBack: backStructure,
      bottomFollows: 'front',
      structureSwapped: false,
    ),
    StructureBackOption(
      label:
          'Mặt trước: ${clean(backStructure)}, Mặt sau: ${clean(frontStructure)}',
      structureBack: backStructure,
      bottomFollows: 'front',
      structureSwapped: true,
    ),
  ];
}

const Map<String, String> _bagTypeLabels = {
  '3bien': 'Túi 3 biên',
  '4bien': 'Túi 4 biên',
  'xephong_lech': 'Túi xếp hông lưng lệch',
  'xephong_giua': 'Túi xếp hông lưng giữa',
  'dayDung': 'Túi đáy đứng',
  'cutSeal': 'Túi cut seal',
  'cutSealNapKeo': 'Túi cut seal mở miệng có nắp keo',
};

String generateOrderDescription(
  String productName,
  String structure,
  String bagType,
  double widthMm,
  double lengthMm,
  double numColors,
  bool hasZipper,
  bool hasHandle,
  QuoteProductBagSpec spec,
) {
  const toleranceW = 2;
  const toleranceL = 3;
  final parts = <String>[];

  if (productName.isNotEmpty) parts.add(productName);

  final btLabel =
      _bagTypeLabels[bagType] ?? (bagType.isNotEmpty ? 'Loại: $bagType' : '');
  if (btLabel.isNotEmpty) parts.add(btLabel);

  if (structure.isNotEmpty) parts.add(structure);

  if (widthMm > 0 && lengthMm > 0) {
    final dims = spec.gussetMm > 0
        ? '${_n(widthMm)}×${_n(lengthMm)}+${_n(spec.gussetMm)}mm'
        : '${_n(widthMm)}×${_n(lengthMm)}mm';
    parts.add('KT: $dims (±${toleranceW}mm / ±${toleranceL}mm)');
  }

  if (numColors > 0) parts.add('In ${_n(numColors)} màu');
  if (hasZipper) parts.add('Có zipper');
  if (hasHandle) parts.add('Có quai');

  final opts = <String>[];
  if (spec.hasHangHole) opts.add('đục lỗ treo');
  if (spec.hasTearNotch) opts.add('nhấn xé V');
  if (spec.hasHandleHole) opts.add('đục lỗ quai xách');
  if (spec.hasHalfMoonBottom) opts.add('đáy bán nguyệt');
  if (spec.hasBottomSeal) opts.add('hàn đáy');
  if (opts.isNotEmpty) parts.add(opts.join(', '));

  if (spec.otherDescription.isNotEmpty) parts.add(spec.otherDescription);

  return parts.join(' – ');
}

/// Format số nguyên không phần thập phân thừa (mirror JS `${number}`).
String _n(double v) =>
    v == v.roundToDouble() ? v.round().toString() : v.toString();

/// Mô tả đặc tả túi cho cột "Mô tả" của báo giá — mirror
/// `buildBagSpecDescription` (baoGiaExport.ts). Trả về cấu trúc gọn nếu
/// không có bagSpec.
String buildBagSpecDescription(
  Map<String, dynamic>? spec,
  Map<String, dynamic> input,
  String structure,
  double totalThickness,
) {
  if (spec == null) return boSoCauTruc(structure);

  double n(dynamic v) => v is num ? v.toDouble() : 0;
  bool b(dynamic v) => v == true;
  String s(dynamic v) => v?.toString() ?? '';

  final lines = <String>[];
  final bagLabel = bagTypeLabelTuInput(
    s(spec['bagType']),
    b(spec['hasZipper'] ?? input['hasZipper']),
    upper: true,
  );
  if (bagLabel.isNotEmpty) lines.add('$bagLabel.');

  final chatLieu = boSoCauTruc(structure);
  final structureBack = s(spec['structureBack']).trim();
  if (structureBack.isNotEmpty) {
    final swapped = b(spec['structureSwapped']);
    final front = boSoCauTruc(swapped ? structureBack : structure);
    final back = boSoCauTruc(swapped ? structure : structureBack);
    if (front.isNotEmpty && back.isNotEmpty) {
      if (s(spec['bagType']) == 'dayDung') {
        final frontSuffix = spec['bottomFollows'] == 'front' ? ' + Đáy' : '';
        final backSuffix = spec['bottomFollows'] == 'back' ? ' + Đáy' : '';
        lines.add(
            'Chất liệu: Mặt trước$frontSuffix: $front, Mặt sau$backSuffix: $back.');
      } else {
        lines.add('Chất liệu: Mặt trước: $front, Mặt sau: $back.');
      }
    } else if (chatLieu.isNotEmpty) {
      lines.add('Chất liệu: $chatLieu.');
    }
  } else if (chatLieu.isNotEmpty) {
    lines.add('Chất liệu: $chatLieu.');
  }

  if (totalThickness > 0) {
    final laMangIn =
        input['productType'] == 'mang' && input['filmType'] == 'mangIn';
    lines.add(
        'Độ dày: ${_n(totalThickness)} mic${laMangIn ? '.' : ' (± 5 mic).'}');
  }

  final dimParts = <String>[];
  final w = n(spec['widthMm']);
  final l = n(spec['lengthMm']);
  if (w > 0 && l > 0) dimParts.add('R:${_n(w)}mm x D:${_n(l)}mm');
  if (n(spec['gussetMm']) > 0) dimParts.add('Hông: ${_n(n(spec['gussetMm']))}mm');
  if (n(spec['standupBottomSideMm']) > 0) {
    dimParts.add('Đáy: ${_n(n(spec['standupBottomSideMm']) * 2)}mm');
  }
  if (n(spec['backSealMm']) > 0) {
    final llabel =
        spec['bagType'] == 'xephong_lech' ? 'Lưng lệch' : 'Lưng giữa';
    dimParts.add('$llabel: ${_n(n(spec['backSealMm']))}mm');
  }
  if (dimParts.isNotEmpty) lines.add('Quy cách: ${dimParts.join('. ')}.');

  if (input['productType'] == 'mang') {
    final rollLen = n(spec['rollLengthM']) > 0
        ? n(spec['rollLengthM'])
        : n(input['filmRollLength']);
    if (rollLen > 0) {
      final khoTrongMM = n(spec['widthMm']) > 0
          ? n(spec['widthMm'])
          : (n(input['spreadWidth']) * 1000).roundToDouble();
      final rollStr = rollLen == rollLen.roundToDouble()
          ? _group(rollLen.round())
          : _group(rollLen);
      lines.add('Quy cách cuộn: K${_n(khoTrongMM)}mm x $rollStr m/cuộn.');
    }
    final chieuRaCuonMang = s(spec['chieuRaCuonMang']).trim();
    if (chieuRaCuonMang.isNotEmpty) {
      lines.add('Chiều ra cuộn màng: $chieuRaCuonMang.');
    }
  }

  if (n(spec['sideSealMm']) > 0) {
    lines.add('Hàn biên: ${_n(n(spec['sideSealMm']))}mm.');
  }
  if (b(spec['hasHeadSeal']) && n(spec['headSealMm']) > 0) {
    lines.add('Hàn đầu: ${_n(n(spec['headSealMm']))}mm.');
  }
  if (b(spec['hasBottomSeal']) && n(spec['bottomSealMm']) > 0) {
    lines.add('Hàn đáy: ${_n(n(spec['bottomSealMm']))}mm.');
  }
  if (n(spec['lidMm']) > 0) lines.add('Nắp: ${_n(n(spec['lidMm']))}mm.');
  if (b(spec['hasSongSieuAm']) && n(spec['songSieuAmMm']) > 0) {
    lines.add('Túi đầu dán sóng siêu âm: ${_n(n(spec['songSieuAmMm']))}mm.');
  }
  if (b(spec['hasZipper']) || b(input['hasZipper'])) {
    lines.add(n(spec['zipperDistanceMm']) > 0
        ? 'Có zipper. Tâm zipper cách đầu: ${_n(n(spec['zipperDistanceMm']))}mm.'
        : 'Có zipper.');
  }
  if (b(spec['hasHangHole']) && s(spec['hangHoleDescription']).isNotEmpty) {
    lines.add('Đục lỗ treo: ${s(spec['hangHoleDescription'])}.');
  }
  if (b(spec['hasHandleHole']) &&
      s(spec['handleHoleDescription']).isNotEmpty) {
    lines.add('Đục lỗ quai xách: ${s(spec['handleHoleDescription'])}.');
  }
  if (b(spec['hasTearNotch'])) {
    final parts = ['Nhấn xé "V"'];
    if (n(spec['tearNotchFromTopMm']) > 0) {
      parts.add('cách đầu ${_n(n(spec['tearNotchFromTopMm']))}mm');
    }
    if (n(spec['tearNotchFromBottomMm']) > 0) {
      parts.add('cách đáy ${_n(n(spec['tearNotchFromBottomMm']))}mm');
    }
    lines.add('${parts.join(' ')}.');
  }
  if (b(spec['hasHalfMoonBottom'])) lines.add('Đáy bán nguyệt.');

  final colors = n(input['numColors']);
  if (colors > 0) lines.add('In ${_n(colors)} màu.');

  return lines.join('\n');
}

/// Nhóm nghìn kiểu vi-VN (mirror `toLocaleString('vi-VN')`).
String _group(num v) {
  final s = v.round().abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return v < 0 ? '-$buf' : buf.toString();
}
