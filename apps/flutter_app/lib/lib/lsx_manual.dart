// ═══════════════════════════════════════════════════════════════════════════
// lsx_manual — port `apps/web/src/lib/lsx-build-order.ts` (+ lsx-bag-classification,
// lsx-msp, lsx-lam-rows, lsx-structure, lsx-quy-cach, lsx-quantity, lsx-divide).
// Dựng LSXManualFields (prefill từ báo giá / bảng đặc tả nâng cao) + snapshot.
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';
import 'format_structure.dart';
import 'lsx_nang_cao.dart';

// ── Types ─────────────────────────────────────────────────────────────────────

class LamLayerPart {
  final String name;
  final double widthMm;
  const LamLayerPart({required this.name, required this.widthMm});
  Map<String, dynamic> toJson() => {'name': name, 'widthMm': widthMm};
  factory LamLayerPart.fromJson(Map<String, dynamic> j) => LamLayerPart(
        name: j['name']?.toString() ?? '',
        widthMm: (j['widthMm'] as num?)?.toDouble() ?? 0,
      );
}

class LamLayerRow {
  final int layerIndex;
  final String label;
  final List<LamLayerPart> parts;
  final double wasteMeters;
  const LamLayerRow({
    required this.layerIndex,
    required this.label,
    required this.parts,
    required this.wasteMeters,
  });
  LamLayerRow copyWith({double? wasteMeters}) => LamLayerRow(
        layerIndex: layerIndex,
        label: label,
        parts: parts,
        wasteMeters: wasteMeters ?? this.wasteMeters,
      );
  Map<String, dynamic> toJson() => {
        'layerIndex': layerIndex,
        'label': label,
        'parts': parts.map((p) => p.toJson()).toList(),
        'wasteMeters': wasteMeters,
      };
  factory LamLayerRow.fromJson(Map<String, dynamic> j) => LamLayerRow(
        layerIndex: (j['layerIndex'] as num?)?.toInt() ?? 0,
        label: j['label']?.toString() ?? '',
        parts: ((j['parts'] as List?) ?? const [])
            .whereType<Map>()
            .map((e) => LamLayerPart.fromJson(e.cast<String, dynamic>()))
            .toList(),
        wasteMeters: (j['wasteMeters'] as num?)?.toDouble() ?? 0,
      );
}

/// Nguồn dữ liệu để dựng LSX (mirror web `LsxSourceData`).
class LsxSourceData {
  final String id;
  final String customer;
  final String productName;
  final String structure;
  final double finalPrice;
  final double? chotGia;
  final Map<String, dynamic> input;
  final bool? hasHalfMoonBottom;
  final double? bagWidthMm;
  final double? bagLengthMm;
  final String? bottomFollows;
  final bool? structureSwapped;
  final double? zipperDistanceMm;
  final bool? hasSongSieuAm;
  final double? songSieuAmMm;
  final double? sideSealMm;
  final double? headSealMm;
  final bool? hasTearNotch;
  final double? tearNotchFromTopMm;
  final bool? hasHangHole;
  final String? hangHoleDescription;
  final bool? hasHandleHole;
  final String? handleHoleDescription;
  final bool? hasBottomSeal;
  final double? bottomSealMm;
  final double? gussetMm;
  final double? lidMm;
  final double? backSealMm;
  final double? standupBottomSideMm;
  final List<dynamic>? nangCaoSpec;
  final List<String>? outsourceSteps;
  final double? rollLengthM;
  final String? chieuRaCuonMang;
  final List<dynamic>? stageNotes;
  final List<dynamic>? stageDescriptions;

  const LsxSourceData({
    required this.id,
    required this.customer,
    required this.productName,
    required this.structure,
    required this.finalPrice,
    this.chotGia,
    required this.input,
    this.hasHalfMoonBottom,
    this.bagWidthMm,
    this.bagLengthMm,
    this.bottomFollows,
    this.structureSwapped,
    this.zipperDistanceMm,
    this.hasSongSieuAm,
    this.songSieuAmMm,
    this.sideSealMm,
    this.headSealMm,
    this.hasTearNotch,
    this.tearNotchFromTopMm,
    this.hasHangHole,
    this.hangHoleDescription,
    this.hasHandleHole,
    this.handleHoleDescription,
    this.hasBottomSeal,
    this.bottomSealMm,
    this.gussetMm,
    this.lidMm,
    this.backSealMm,
    this.standupBottomSideMm,
    this.nangCaoSpec,
    this.outsourceSteps,
    this.rollLengthM,
    this.chieuRaCuonMang,
    this.stageNotes,
    this.stageDescriptions,
  });
}

// ── Hằng số ───────────────────────────────────────────────────────────────────

const double lsxToleranceWidthDefaultMm = 2;
const double lsxToleranceLengthDefaultMm = 3;
const int mspDefaultSeed = 77020;

// ── Phân loại kiểu túi (mirror lsx-bag-classification.ts) ─────────────────────

class LsxBagTypeInfo {
  final String key;
  final String label;
  final List<String> baseFields;
  final Map<String, dynamic> defaults;
  const LsxBagTypeInfo({
    required this.key,
    required this.label,
    required this.baseFields,
    required this.defaults,
  });
}

const List<String> zipperAccessoryFields = [
  'tamZipperCachMieng',
  'tearNotch',
  'loTreoInfo',
  'useDualCutter',
];

const Map<String, LsxBagTypeInfo> _bagTypes = {
  'tui-3-bien': LsxBagTypeInfo(
    key: 'tui-3-bien',
    label: 'Túi 3 biên',
    baseFields: ['holePunchInfo', 'sealEdge', 'hanBien', 'hanDau', 'hanDay'],
    defaults: {
      'hanDau': 30,
      'sealEdge': '7mm',
      'holePunchInfo': 'Lỗ tròn Ø8mm cách đầu túi 10mm',
    },
  ),
  'tui-4-bien': LsxBagTypeInfo(
    key: 'tui-4-bien',
    label: 'Túi 4 biên',
    baseFields: [
      'xepHong',
      'holePunchInfo',
      'ventHoleInfo',
      'hanBien',
      'hanDau',
      'hanDay',
    ],
    defaults: {
      'hanBien': 10,
      'hanDau': 50,
      'xepHong': 60,
      'holePunchInfo': '3 lỗ tròn quai xách (theo Market)',
    },
  ),
  'tui-dan-lung-giua': LsxBagTypeInfo(
    key: 'tui-dan-lung-giua',
    label: 'Túi dán lưng giữa',
    baseFields: ['danLung', 'ventHoleInfo', 'hanDau'],
    defaults: {'hanDau': 13, 'danLung': 13},
  ),
  'tui-xep-hong-lung-lech': LsxBagTypeInfo(
    key: 'tui-xep-hong-lung-lech',
    label: 'Túi xếp hông dán lưng lệch',
    baseFields: ['xepHong', 'danLungLech', 'danDay'],
    defaults: {'xepHong': 73, 'danLungLech': 10, 'danDay': 10},
  ),
  'tui-day-dung': LsxBagTypeInfo(
    key: 'tui-day-dung',
    label: 'Túi đáy đứng',
    baseFields: ['sealEdge', 'foldBottom', 'hanBien', 'hanDay'],
    defaults: {'sealEdge': '10mm', 'foldBottom': '100mm', 'hanBien': 10},
  ),
  'tui-cut-seal': LsxBagTypeInfo(
    key: 'tui-cut-seal',
    label: 'Túi cắt seal',
    baseFields: [],
    defaults: {},
  ),
  'tui-cut-seal-nap-keo': LsxBagTypeInfo(
    key: 'tui-cut-seal-nap-keo',
    label: 'Túi cắt seal có nắp băng keo',
    baseFields: ['nap', 'songSieuAm', 'docQuaiXach', 'danKeoNap'],
    defaults: {
      'nap': 35,
      'songSieuAm': 32,
      'docQuaiXach': true,
      'danKeoNap': true,
    },
  ),
  'fallback': LsxBagTypeInfo(
    key: 'fallback',
    label: 'Khác (hiện tất cả field)',
    baseFields: [],
    defaults: {},
  ),
};

const Map<String, String> _legacyKeyMap = {
  'tui-zipper-3-bien': 'tui-3-bien',
  'tui-zipper-day-dung': 'tui-day-dung',
  'tui-zipper-cat-seal': 'tui-cut-seal',
  'tui-cat-seal-nap-keo': 'tui-cut-seal-nap-keo',
};

String normalizeLegacyLsxKey(String key) {
  if (key == 'mang' || key == 'mang-in' || key == 'mang-ghep') return key;
  final mapped = _legacyKeyMap[key];
  if (mapped != null) return mapped;
  if (_bagTypes.containsKey(key)) return key;
  return 'fallback';
}

LsxBagTypeInfo classifyLsxBagType(String bagType, [bool? hasZipper]) {
  switch (bagType) {
    case '3bien':
      return _bagTypes['tui-3-bien']!;
    case '4bien':
      return _bagTypes['tui-4-bien']!;
    case 'xephong_giua':
      return _bagTypes['tui-dan-lung-giua']!;
    case 'xephong_lech':
      return _bagTypes['tui-xep-hong-lung-lech']!;
    case 'dayDung':
      return _bagTypes['tui-day-dung']!;
    case 'cutSeal':
      return _bagTypes['tui-cut-seal']!;
    case 'cutSealNapKeo':
      return _bagTypes['tui-cut-seal-nap-keo']!;
    default:
      return _bagTypes['fallback']!;
  }
}

/// Áp default kiểu túi — chỉ điền khi field đang trống (0/''/false/null).
LsxManual applyBagDefaults(
  LsxManual m,
  LsxBagTypeInfo bagInfo, [
  bool? hasZipper,
]) {
  final next = m.copy();
  for (final entry in bagInfo.defaults.entries) {
    final v = entry.value;
    if (v == null) continue;
    final cur = next.get(entry.key);
    if (cur != null && cur != '' && cur != 0 && cur != false) continue;
    next.set(entry.key, v);
  }
  return next;
}

bool resolveLsxHasDivide(
  Map<String, dynamic> input,
  double manualDivideWidth,
) {
  if (input['hasDivide'] == true) return true;
  if (((input['divideWidthMm'] as num?)?.toDouble() ?? 0) > 0) return true;
  if (manualDivideWidth > 0) return true;
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

String _ghepText(String a, String b) {
  if (a.isEmpty) return b;
  if (b.isEmpty) return a;
  return '$a\n$b';
}

/// mm (m → mm) cho trục in — <20 coi là mét.
double toCylMm(double? raw) {
  if (raw == null || raw <= 0) return 0;
  return raw < 20 ? (raw * 1000).roundToDouble() : raw.roundToDouble();
}

String buildLsxLamBtpNote(double printProductQty) {
  if (printProductQty == 0) return '';
  return 'ghép hết BTP in ${_group(printProductQty.round())}m';
}

String getMaterialName(List<MaterialDef> materials, String? id) {
  if (id == null || id.isEmpty) return '';
  for (final m in materials) {
    if (m.id == id) return m.name;
  }
  return id;
}

/// "Matt OPP" + 20 → "Matt OPP20" (mirror getMaterialLabel).
String getMaterialLabel(
  List<MaterialDef> materials,
  String? id,
  double? micOverride,
) {
  if (id == null || id.isEmpty) return '';
  MaterialDef? mat;
  for (final m in materials) {
    if (m.id == id) {
      mat = m;
      break;
    }
  }
  if (mat == null) return id;
  final base = normalizeMaterialBaseName(mat.name);
  final mic = micOverride ?? mat.thickness;
  final tail = base.length >= 3 ? base.substring(base.length - 3) : base;
  if (mic > 0 && !RegExp(r'\d').hasMatch(tail)) {
    return '$base${mic == mic.roundToDouble() ? mic.round() : mic}';
  }
  return base;
}

/// Gom parts trùng tên (giữ khổ của dòng ĐẦU TIÊN).
List<LamLayerPart> gomLsxLamParts(List<LamLayerPart> parts) {
  final seen = <String>{};
  final out = <LamLayerPart>[];
  for (final p in parts) {
    final key = p.name.trim();
    if (key.isNotEmpty && seen.contains(key)) continue;
    if (key.isNotEmpty) seen.add(key);
    out.add(p);
  }
  return out;
}

String buildLaminateNotesChecklist(List<LamLayerRow> layers) {
  final lines = <String>[];
  for (final row in layers) {
    for (final p in gomLsxLamParts(
        row.parts.where((p) => p.name.isNotEmpty).toList())) {
      lines.add(p.widthMm > 0 ? '${p.name} khổ ${p.widthMm}:' : '${p.name} khổ :');
    }
  }
  return lines.join('\n');
}

// ── Cấu trúc (mirror lsx-structure.ts) ────────────────────────────────────────

String formatLsxMaterialWithMic(
  List<MaterialDef> materials,
  String? id,
  double? micOverride,
) {
  if (id == null || id.isEmpty) return '';
  MaterialDef? material;
  for (final m in materials) {
    if (m.id == id) {
      material = m;
      break;
    }
  }
  if (material == null) return id;
  final normalized = normalizeMaterialBaseName(material.name);
  final base = normalized.replaceFirst(RegExp(r'\s*\d+(?:[.,]\d+)?\s*$'), '').trim();
  final mic = micOverride ?? material.thickness;
  return mic > 0 ? '$base${mic == mic.roundToDouble() ? mic.round() : mic}' : normalized;
}

String _buildLsxSideStructure(
  List<MaterialDef> materials,
  Map<String, dynamic> input,
  String? layer2Id,
) {
  final mic = (input['micOverrides'] as Map?)?.cast<String, dynamic>() ?? const {};
  final entries = <List<String?>>[
    ['layer1Id', input['layer1Id'] as String?],
    ['layer2Id', layer2Id],
    ['layer3Id', input['layer3Id'] as String?],
    ['layer4Id', input['layer4Id'] as String?],
    ['layer5Id', input['layer5Id'] as String?],
  ].where((e) => e[1] != null && e[1]!.isNotEmpty).toList();
  final parts = <String>[];
  for (final e in entries) {
    final key = e[0]!;
    final id = e[1]!;
    final overrideKey =
        key == 'layer2Id' && id == input['layer2AltId'] ? 'layer2AltId' : key;
    final s = formatLsxMaterialWithMic(materials, id, (mic[overrideKey] as num?)?.toDouble());
    if (s.isNotEmpty) parts.add(s);
  }
  return parts.join('//');
}

String formatLsxStructure(
  List<MaterialDef> materials,
  Map<String, dynamic> input, {
  String? bottomFollows,
  bool structureSwapped = false,
}) {
  final main = _buildLsxSideStructure(materials, input, input['layer2Id'] as String?);
  if ((input['layer2AltId'] as String?)?.isNotEmpty != true) return main;
  final alt = _buildLsxSideStructure(materials, input, input['layer2AltId'] as String?);
  final front = structureSwapped ? alt : main;
  final back = structureSwapped ? main : alt;
  if (input['bagType'] == 'dayDung') {
    return bottomFollows == 'back'
        ? 'Mặt trước: $front, Mặt sau + Đáy: $back'
        : 'Mặt trước + Đáy: $front, Mặt sau: $back';
  }
  return 'Mặt trước: $front, Mặt sau: $back';
}

// ── Lớp ghép ──────────────────────────────────────────────────────────────────

List<LamLayerRow> buildLaminateLayersFromInput(
  Map<String, dynamic> i,
  List<MaterialDef> materials, [
  Map<int, double>? wasteByLayerIndex,
]) {
  final defaultW = ((i['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000;
  final mic = (i['micOverrides'] as Map?)?.cast<String, dynamic>() ?? const {};
  final rows = <LamLayerRow>[];
  var ghepNum = 0;

  void pushPass(int layerIndex, List<LamLayerPart> parts) {
    if (parts.isEmpty) return;
    ghepNum += 1;
    final wasteMeters = (wasteByLayerIndex != null &&
            wasteByLayerIndex.containsKey(layerIndex))
        ? (wasteByLayerIndex[layerIndex] ?? 0).roundToDouble()
        : 0.0;
    rows.add(LamLayerRow(
      layerIndex: layerIndex,
      label: 'Màng ghép $ghepNum',
      parts: parts,
      wasteMeters: wasteMeters,
    ));
  }

  final layer2Id = i['layer2Id'] as String?;
  final layer2AltId = i['layer2AltId'] as String?;
  final layer2Lengths = (i['layer2Lengths'] as Map?)?.cast<String, dynamic>();
  if (layer2Id != null &&
      layer2Id.isNotEmpty &&
      layer2AltId != null &&
      layer2AltId.isNotEmpty) {
    final w1 = (layer2Lengths?['mat1'] as num?)?.toDouble() != null
        ? (layer2Lengths!['mat1'] as num).toDouble() * 1000
        : defaultW;
    final w2 = (layer2Lengths?['mat2'] as num?)?.toDouble() != null
        ? (layer2Lengths!['mat2'] as num).toDouble() * 1000
        : defaultW;
    pushPass(2, [
      LamLayerPart(
          name: getMaterialLabel(materials, layer2Id, (mic['layer2Id'] as num?)?.toDouble()),
          widthMm: w1.roundToDouble()),
      LamLayerPart(
          name: getMaterialLabel(
              materials, layer2AltId, (mic['layer2AltId'] as num?)?.toDouble()),
          widthMm: w2.roundToDouble()),
    ]);
  } else if (layer2Id != null && layer2Id.isNotEmpty) {
    pushPass(2, [
      LamLayerPart(
          name: getMaterialLabel(materials, layer2Id, (mic['layer2Id'] as num?)?.toDouble()),
          widthMm: defaultW.roundToDouble()),
    ]);
  }

  for (final idx in [3, 4, 5]) {
    final id = i['layer${idx}Id'] as String?;
    if (id == null || id.isEmpty) continue;
    pushPass(idx, [
      LamLayerPart(
          name: getMaterialLabel(materials, id, (mic['layer${idx}Id'] as num?)?.toDouble()),
          widthMm: defaultW.roundToDouble()),
    ]);
  }
  return rows;
}

List<LamLayerRow> buildLaminateLayersFromSource(
  LsxSourceData source,
  List<MaterialDef> materials, [
  Map<int, double>? wasteByLayerIndex,
]) {
  final rawSpec = source.nangCaoSpec;
  if (rawSpec != null && rawSpec.isNotEmpty) {
    final spec = rawSpec
        .map(LsxNangCaoRow.tryParse)
        .whereType<LsxNangCaoRow>()
        .toList();
    final groups = ghepNangCaoSpecTheoLop(spec);
    if (groups.isNotEmpty) {
      return groups.map((g) {
        final parts = gomLsxLamParts(g.rows
            .map((r) => LamLayerPart(
                  name: r.vatLieu,
                  widthMm: (r.khoMang != null && r.khoMang! > 0)
                      ? (r.khoMang! * 1000).roundToDouble()
                      : 0,
                ))
            .toList());
        final waste = wasteByLayerIndex?[g.layerIndex] ?? 0;
        return LamLayerRow(
          layerIndex: g.layerIndex,
          label: g.label,
          parts: parts,
          wasteMeters: waste.roundToDouble(),
        );
      }).toList();
    }
  }
  return buildLaminateLayersFromInput(
      source.input, materials, wasteByLayerIndex);
}

/// Prefill từ engine (mirror prefillFromEngine).
List<LamLayerRow> prefillFromEngine(
  LsxManual m,
  List<LamLayerRow> layers,
  Map<String, dynamic> input,
  CalculateResult? result,
) {
  if (m.get('cylDiameter') == null || m.getNum('cylDiameter') == 0) {
    final cylLength = (input['cylLength'] as num?)?.toDouble() ?? 0;
    if (cylLength > 0) m.set('cylDiameter', toCylMm(cylLength));
  }
  if (m.get('cylWidth') == null || m.getNum('cylWidth') == 0) {
    final cylCircum = (input['cylCircum'] as num?)?.toDouble() ?? 0;
    if (cylCircum > 0) m.set('cylWidth', toCylMm(cylCircum));
  }
  if (result == null) return layers;

  final printWaste = result.d('printWaste');
  if (m.getNum('printWastePercent') == 0 && printWaste > 0) {
    m.set('printWastePercent', printWaste.roundToDouble());
  }
  final printLayers = (result.raw['layers'] as Map?)?.cast<String, dynamic>();
  final printMeters =
      ((printLayers?['print'] as Map?)?['meters'] as num?)?.toDouble() ?? 0;
  if (m.getNum('printProductQty') == 0 && printMeters > 0) {
    m.set('printProductQty', printMeters.roundToDouble());
  }

  final lams = ((printLayers?['laminations'] as List?) ?? const [])
      .whereType<Map>()
      .map((e) => e.cast<String, dynamic>())
      .toList();
  final wasteByLayer = <int, double>{};
  for (final lam in lams) {
    final layerNum = (lam['layerNum'] as num?)?.toInt();
    final waste = (lam['waste'] as num?)?.toDouble() ?? 0;
    if (layerNum != null && waste > 0) wasteByLayer[layerNum] = waste;
  }
  final used = <int>{};
  final next = layers.map((row) {
    if (used.contains(row.layerIndex)) return row;
    final w = wasteByLayer[row.layerIndex];
    if (w == null || w <= 0) return row;
    used.add(row.layerIndex);
    return row.copyWith(wasteMeters: w.roundToDouble());
  }).toList();

  if (m.getNum('lamProductQty') == 0 && lams.isNotEmpty) {
    final last = lams.last;
    final meters = (last['meters'] as num?)?.toDouble() ?? 0;
    if (meters > 0) m.set('lamProductQty', meters.roundToDouble());
  }

  final cutWaste = result.d('cutWaste');
  if (m.getNum('bagWasteMeters') == 0 &&
      cutWaste > 0 &&
      input['productType'] != 'mang') {
    m.set('bagWasteMeters', cutWaste.roundToDouble());
  }

  if ((m.getStr('lamBTPNote')).isEmpty && m.getNum('printProductQty') > 0) {
    m.set('lamBTPNote', buildLsxLamBtpNote(m.getNum('printProductQty')));
  }
  return next;
}

/// Prefill từ bảng đặc tả nâng cao (mirror prefillTuDacTa).
List<LamLayerRow> prefillTuDacTa(
  LsxManual m,
  List<LsxNangCaoRow> spec,
  List<LamLayerRow> layers,
) {
  if (spec.isEmpty) return layers;
  LsxNangCaoRow? dong(String ten) {
    for (final r in spec) {
      if (r.congDoan == ten) return r;
    }
    return null;
  }

  final dongIn = dong('In');
  if (dongIn != null) {
    if (dongIn.phiHao != null &&
        dongIn.phiHao! > 0 &&
        m.getNum('printWastePercent') == 0) {
      m.set('printWastePercent', dongIn.phiHao!.roundToDouble());
    }
    if (dongIn.thanhPham != null &&
        dongIn.thanhPham! > 0 &&
        m.getNum('printProductQty') == 0) {
      m.set('printProductQty', dongIn.thanhPham!.roundToDouble());
    }
  }

  final groups = ghepNangCaoSpecTheoLop(spec);
  final next = layers.map((row) {
    final g = groups.where((x) => x.layerIndex == row.layerIndex).firstOrNull;
    if (g == null) return row;
    LsxNangCaoRow? wr;
    for (final r in g.rows) {
      if (r.phiHao != null && r.phiHao! > 0) {
        wr = r;
        break;
      }
    }
    if (wr == null) return row;
    return row.copyWith(wasteMeters: wr.phiHao!.roundToDouble());
  }).toList();

  if (groups.isNotEmpty) {
    final last = groups.last;
    LsxNangCaoRow? tpDong;
    for (final r in last.rows) {
      if (r.thanhPham != null && r.thanhPham! > 0) {
        tpDong = r;
        break;
      }
    }
    if (tpDong != null && m.getNum('lamProductQty') == 0) {
      m.set('lamProductQty', tpDong.thanhPham!.roundToDouble());
    }
  }

  final dongTui = dong('Làm túi');
  if (dongTui != null &&
      dongTui.phiHao != null &&
      dongTui.phiHao! > 0 &&
      m.getNum('bagWasteMeters') == 0) {
    m.set('bagWasteMeters', dongTui.phiHao!.roundToDouble());
  }

  if (m.getStr('lamBTPNote').isEmpty && m.getNum('printProductQty') > 0) {
    m.set('lamBTPNote', buildLsxLamBtpNote(m.getNum('printProductQty')));
  }
  return next;
}

void syncLegacyLaminateFields(LsxManual m, List<LamLayerRow> layers) {
  if (layers.isNotEmpty) {
    m.set('laminateFilm1', layers[0].parts.map((p) => p.name).join(' / '));
    m.set('laminateFilm1Width',
        layers[0].parts.isNotEmpty ? layers[0].parts[0].widthMm : 0);
    m.set('lamWaste', layers[0].wasteMeters);
  }
  if (layers.length > 1) {
    m.set('laminateFilm2', layers[1].parts.map((p) => p.name).join(' / '));
    m.set('lamBTP', layers[1].wasteMeters);
  }
}

// ── Manual fields ─────────────────────────────────────────────────────────────

/// LSXManualFields — dynamic map + typed getters (mirror web interface).
class LsxManual {
  final Map<String, dynamic> _m;
  LsxManual([Map<String, dynamic>? init]) : _m = {...?init};

  Map<String, dynamic> toJson() => Map<String, dynamic>.from(_m);

  dynamic get(String key) => _m[key];
  void set(String key, dynamic value) => _m[key] = value;

  double getNum(String key) => (_m[key] as num?)?.toDouble() ?? 0;
  String getStr(String key) => _m[key]?.toString() ?? '';
  bool getBool(String key) => _m[key] == true;

  LsxManual copy() => LsxManual(_m);

  List<LamLayerRow> get laminateLayers =>
      ((_m['laminateLayers'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => LamLayerRow.fromJson(e.cast<String, dynamic>()))
          .toList();
}

LsxManual defaultManual(String lsxNumber, String preparedBy) => LsxManual({
      'lsxNumber': lsxNumber,
      'issuedDate': todayStr(),
      'preparedBy': preparedBy,
      'approvedBy': '',
      'deliveryDate': '',
      'notes': '',
      'msp': '',
      'tenSP': '',
      'maMucNhu': '',
      'quyCachNote': '',
      'quyCachCuon': '',
      'chieuRaCuonSP': '',
      'soLuongDHNote': '',
      'quantityTolerancePercent': 10,
      'quyCachToleranceWidthMm': lsxToleranceWidthDefaultMm,
      'quyCachToleranceLengthMm': lsxToleranceLengthDefaultMm,
      'printFilmName': '',
      'printWastePercent': 0,
      'printProductQty': 0,
      'numCylinders': 0,
      'cylDiameter': 0,
      'cylWidth': 0,
      'rollOutWidth': 0,
      'materialQtySupplied': 0,
      'printNotes': '',
      'cylInfo': '',
      'printDirection': '',
      'printMST': '',
      'printProductUnit': 'MD',
      'divideWidth': 0,
      'rollLength': 0,
      'divideRollOutWidth': 0,
      'divideDeliveryReq': '',
      'divideNotes': '',
      'laminateFilm1': '',
      'laminateFilm1Width': 0,
      'lamWaste': 0,
      'lamProductQty': 0,
      'lamBTP': 0,
      'laminateFilm2': '',
      'laminateNotes': '',
      'lamMaterialSupplyQty': '',
      'lamProductUnit': 'MD',
      'lamBTPNote': '',
      'laminateLayers': <Map<String, dynamic>>[],
      'divideElements': 0,
      'packagingInfo': '',
      'packagingNotes': '',
      'deliveryNotes': '',
      'sealEdge': '',
      'foldBottom': '',
      'tearNotch': '',
      'hanTruoc': 0,
      'hanSau': 0,
      'hanBien': 0,
      'hanDau': 0,
      'hanDay': 0,
      'xepHong': 0,
      'holePunchInfo': '',
      'ventHoleInfo': '',
      'bagWasteMeters': 0,
      'bagLuuY': '',
      'useSemicircularMold': false,
      'useDualCutter': false,
      'bagMachineWaste': 0,
      'bagDeliveryReq': '',
      'bagMachineNotes': '',
      'tamZipperCachMieng': 0,
      'loTreoInfo': '',
      'danLung': 0,
      'danLungLech': 0,
      'danDay': 0,
      'nap': 0,
      'songSieuAm': 0,
      'docQuaiXach': false,
      'danKeoNap': false,
      'inDesc': '',
      'lamDesc': '',
      'divideDesc': '',
      'bagDesc': '',
    });

void apDungStageGhiChu(LsxManual m, LsxSourceData source) {
  final ghiChu = source.stageNotes ?? const [];
  final moTa = source.stageDescriptions ?? const [];

  String textOf(dynamic e) =>
      (e is Map ? e['text']?.toString() : null) ?? '';
  String stageOf(dynamic e) =>
      (e is Map ? e['stage']?.toString() : null) ?? '';

  for (final n in ghiChu) {
    final t = textOf(n);
    if (t.isEmpty) continue;
    if (stageOf(n) == 'lam-tui') {
      m.set('bagLuuY', _ghepText(m.getStr('bagLuuY'), t));
    }
  }
  for (final d in moTa) {
    final t = textOf(d);
    if (t.isEmpty) continue;
    if (stageOf(d) == 'lam-tui') {
      m.set('bagDesc', _ghepText(m.getStr('bagDesc'), t));
    }
  }
  String moTaText(String stage) => moTa
      .where((d) => stageOf(d) == stage && textOf(d).isNotEmpty)
      .map(textOf)
      .join('\n');
  m.set('printNotes', _ghepText(moTaText('in'), m.getStr('printNotes')));
  m.set('laminateNotes', _ghepText(moTaText('ghep'), m.getStr('laminateNotes')));
  m.set('divideNotes', _ghepText(moTaText('chia'), m.getStr('divideNotes')));
  for (final n in ghiChu) {
    final t = textOf(n);
    if (t.isEmpty) continue;
    final st = stageOf(n);
    if (st == 'in') {
      m.set('printNotes', _ghepText(m.getStr('printNotes'), t));
    } else if (st == 'ghep') {
      m.set('laminateNotes', _ghepText(m.getStr('laminateNotes'), t));
    } else if (st == 'chia') {
      m.set('divideNotes', _ghepText(m.getStr('divideNotes'), t));
    }
  }
}

void backfillQuyCachCuon(LsxManual m, LsxSourceData source) {
  if (m.getStr('quyCachCuon').trim().isNotEmpty) return;
  final i = source.input;
  if (i['productType'] != 'mang') return;
  final nguon = NguonKhoMang(
    nangCaoSpec: source.nangCaoSpec,
    inputSpreadWidth: (i['spreadWidth'] as num?)?.toDouble(),
  );
  final khoMM =
      layKhoMangTuNguon(nguon, 'In') ?? ((i['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000;
  if (khoMM <= 0) return;
  final rollLen = (source.rollLengthM ??
          (i['filmRollLength'] as num?)?.toDouble() ??
          0)
      .round();
  m.set('quyCachCuon',
      'K${khoMM.round()}mm x ${rollLen > 0 ? rollLen : '…'}m');
}

void backfillChieuRaCuonMang(LsxManual m, LsxSourceData source) {
  if (m.getStr('chieuRaCuonSP').trim().isNotEmpty) return;
  if (source.input['productType'] != 'mang') return;
  final val = (source.chieuRaCuonMang ?? '').trim();
  if (val.isEmpty) return;
  m.set('chieuRaCuonSP', val);
}

/// Dựng manual từ source (mirror buildManualFromSource).
/// [tinhLai] = hàm gọi engine (null → bỏ qua prefillFromEngine).
LsxManual buildManualFromSource(
  LsxSourceData source, {
  required List<MaterialDef> materials,
  required List<dynamic> productionOrders,
  required String preparedBy,
  CalculateResult? Function(Map<String, dynamic> input)? tinhLai,
  LsxBagTypeInfo? bagInfo,
}) {
  final i = source.input;
  final m = defaultManual('', preparedBy);
  final tui = i['productType'] != 'mang';
  m.set('tenSP', source.productName);
  final productCode = (i['productCode'] as String?)?.trim();
  m.set('msp', (productCode != null && productCode.isNotEmpty)
      ? productCode
      : genMsp(productionOrders));
  m.set(
      'printFilmName',
      getMaterialLabel(
        materials,
        i['layer1Id'] as String?,
        ((i['micOverrides'] as Map?)?['layer1Id'] as num?)?.toDouble(),
      ));

  final hasSpec = source.nangCaoSpec != null && source.nangCaoSpec!.isNotEmpty;
  var layers = hasSpec
      ? buildLaminateLayersFromSource(source, materials)
      : buildLaminateLayersFromInput(i, materials);

  if (m.getNum('cylDiameter') == 0 &&
      ((i['cylLength'] as num?)?.toDouble() ?? 0) > 0) {
    m.set('cylDiameter', toCylMm((i['cylLength'] as num).toDouble()));
  }
  if (m.getNum('cylWidth') == 0 &&
      ((i['cylCircum'] as num?)?.toDouble() ?? 0) > 0) {
    m.set('cylWidth', toCylMm((i['cylCircum'] as num).toDouble()));
  }

  if (hasSpec) {
    final spec = source.nangCaoSpec!
        .map(LsxNangCaoRow.tryParse)
        .whereType<LsxNangCaoRow>()
        .toList();
    layers = prefillTuDacTa(m, spec, layers);
  } else {
    layers = prefillFromEngine(
        m, layers, i, tinhLai == null ? null : tinhLai(i));
  }
  m.set('laminateLayers', layers.map((l) => l.toJson()).toList());
  syncLegacyLaminateFields(m, layers);
  if (m.getStr('laminateNotes').isEmpty) {
    m.set('laminateNotes', buildLaminateNotesChecklist(layers));
  }
  m.set('numCylinders', ((i['numColors'] as num?)?.toDouble() ?? 0));
  final unit = tui ? 'túi' : 'm²';
  final tolerance = m.getNum('quantityTolerancePercent') == 0
      ? 10.0
      : m.getNum('quantityTolerancePercent');
  m.set('quantityTolerancePercent', tolerance);
  m.set('soLuongDHNote',
      '${_group(((i['quantity'] as num?)?.toDouble() ?? 0).round())} $unit');
  if (((i['divideWidthMm'] as num?)?.toDouble() ?? 0) > 0) {
    m.set('divideWidth', (i['divideWidthMm'] as num).toDouble());
  }
  if (((i['divideElements'] as num?)?.toDouble() ?? 0) > 1) {
    m.set('divideElements', (i['divideElements'] as num).toDouble());
  }
  final bag = bagInfo ?? classifyLsxBagType(i['bagType']?.toString() ?? '');
  apDungStageGhiChu(m, source);
  if (!tui) {
    backfillQuyCachCuon(m, source);
    backfillChieuRaCuonMang(m, source);
    return m;
  }
  var next = applyBagDefaults(m, bag);
  if (source.hasHalfMoonBottom == true) next.set('useSemicircularMold', true);
  if (i['hasZipper'] == true && (source.zipperDistanceMm ?? 0) > 0) {
    next.set('tamZipperCachMieng', source.zipperDistanceMm);
  }
  if (source.hasSongSieuAm == true && (source.songSieuAmMm ?? 0) > 0) {
    next.set('songSieuAm', source.songSieuAmMm);
  }
  if ((source.sideSealMm ?? 0) > 0) {
    next.set('hanBien', source.sideSealMm);
    next.set('sealEdge', '${source.sideSealMm}mm');
  }
  if ((source.headSealMm ?? 0) > 0) {
    next.set('hanDau', source.headSealMm);
  }
  if (source.hasTearNotch == true && (source.tearNotchFromTopMm ?? 0) > 0) {
    next.set('tearNotch', 'cách đầu ${source.tearNotchFromTopMm}mm');
  }
  if (source.hasHandleHole == true &&
      (source.handleHoleDescription ?? '').isNotEmpty) {
    next.set('holePunchInfo', source.handleHoleDescription);
  }
  if (source.hasHangHole == true &&
      (source.hangHoleDescription ?? '').isNotEmpty) {
    next.set('loTreoInfo', source.hangHoleDescription);
  }
  if ((source.gussetMm ?? 0) > 0) next.set('xepHong', source.gussetMm);
  if ((source.lidMm ?? 0) > 0) next.set('nap', source.lidMm);
  if ((source.backSealMm ?? 0) > 0) {
    if (bag.key == 'tui-xep-hong-lung-lech') {
      next.set('danLungLech', source.backSealMm);
    } else if (bag.key == 'tui-dan-lung-giua') {
      next.set('danLung', source.backSealMm);
    }
  }
  if (source.hasBottomSeal == true && (source.bottomSealMm ?? 0) > 0) {
    next.set('hanDay', source.bottomSealMm);
  }
  if ((source.standupBottomSideMm ?? 0) > 0 && bag.key == 'tui-day-dung') {
    next.set('foldBottom', '${source.standupBottomSideMm! * 2}mm');
  }
  return next;
}

/// Dựng snapshot từ source (mirror buildSnapshotFromSource).
Map<String, dynamic> buildSnapshotFromSource(
  LsxSourceData source,
  LsxManual manual,
  List<MaterialDef> materials,
) {
  final inp = source.input;
  final nguon = NguonKhoMang(
    nangCaoSpec: source.nangCaoSpec,
    inputSpreadWidth: (inp['spreadWidth'] as num?)?.toDouble(),
  );
  final khoTuSpecIn = layKhoMangTuNguon(nguon, 'In') ?? 0;
  final khoMM = khoTuSpecIn > 0
      ? khoTuSpecIn
      : ((inp['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000;
  final area = ((inp['quantity'] as num?)?.toDouble() ?? 0) *
      ((inp['spreadWidth'] as num?)?.toDouble() ?? 0) *
      ((inp['cutStep'] as num?)?.toDouble() ?? 0);
  final lsxStructure = formatLsxStructure(
    materials,
    inp,
    bottomFollows: source.bottomFollows,
    structureSwapped: source.structureSwapped == true,
  );
  final specRaw = source.nangCaoSpec;
  final nangCaoSpec =
      (specRaw != null && specRaw.isNotEmpty) ? specRaw : null;
  return {
    'customer': source.customer,
    'productName': source.productName,
    'productType': inp['productType'],
    'structure': lsxStructure.isNotEmpty ? lsxStructure : source.structure,
    'quantity': inp['quantity'],
    'spreadWidth': inp['spreadWidth'],
    'cutStep': inp['cutStep'],
    'bagWidthMm': source.bagWidthMm,
    'bagLengthMm': source.bagLengthMm,
    'bottomFollows': source.bottomFollows,
    'structureSwapped': source.structureSwapped,
    'numColors': inp['numColors'],
    'bagType': inp['bagType'],
    'hasZipper': inp['hasZipper'] == true,
    'zipperDistanceMm': source.zipperDistanceMm,
    'hasDivide': inp['hasDivide'] == true ||
        ((inp['divideWidthMm'] as num?)?.toDouble() ?? 0) > 0 ||
        manual.getNum('divideWidth') > 0,
    'divideWidthMm': ((inp['divideWidthMm'] as num?)?.toDouble() ?? 0) > 0
        ? inp['divideWidthMm']
        : (manual.getNum('divideWidth') > 0 ? manual.getNum('divideWidth') : null),
    'originalWidthMm': ((inp['originalWidthMm'] as num?)?.toDouble() ?? 0) > 0
        ? inp['originalWidthMm']
        : (khoMM > 0 ? khoMM : null),
    'numImages': inp['numImages'],
    'cylLength': inp['cylLength'],
    'cylCircum': inp['cylCircum'],
    'filmRollLength': inp['filmRollLength'],
    'layer1Name': getMaterialName(materials, inp['layer1Id'] as String?),
    'layer2Name': getMaterialName(materials, inp['layer2Id'] as String?),
    'layer3Name': getMaterialName(materials, inp['layer3Id'] as String?),
    'layer4Name': getMaterialName(materials, inp['layer4Id'] as String?),
    'layer5Name': getMaterialName(materials, inp['layer5Id'] as String?),
    'chotGia': source.chotGia ?? source.finalPrice,
    'totalArea': (area * 100).round() / 100,
    'hasSongSieuAm': source.hasSongSieuAm,
    'songSieuAmMm': source.songSieuAmMm,
    'nangCaoSpec': nangCaoSpec,
    'outsourceSteps':
        (source.outsourceSteps != null && source.outsourceSteps!.isNotEmpty)
            ? source.outsourceSteps
            : null,
  };
}

// ── MSP / file name (mirror lsx-msp.ts) ───────────────────────────────────────

String _extractMsp(dynamic item) {
  if (item is String) return item;
  if (item is ProductionOrder) {
    return (item.manual['msp']?.toString() ?? '').trim();
  }
  if (item is! Map) return '';
  final manual = item['manual'];
  if (manual is Map && manual['msp'] != null) {
    return manual['msp'].toString().trim();
  }
  return (item['msp']?.toString() ?? '').trim();
}

String genMsp(List<dynamic> existing) {
  var max = mspDefaultSeed;
  for (final item in existing) {
    final m = RegExp(r'^TP_(\d+)', caseSensitive: false)
        .firstMatch(_extractMsp(item));
    if (m != null) {
      final n = int.tryParse(m.group(1)!);
      if (n != null && n > max) max = n;
    }
  }
  return 'TP_${(max + 1).toString().padLeft(6, '0')}';
}

String safeLsxFileName(String s) {
  final name = s.isEmpty ? 'unknown' : s;
  return name
      .replaceAll(RegExp(r'[<>:"/\\|?*\s]+'), '_')
      .substring(0, name.length > 60 ? 60 : name.length);
}

String lsxExportBaseName(ProductionOrder order) {
  final snapshotName = (order.snapshot['productName']?.toString() ?? '').trim();
  final manualTen = (order.manual['tenSP']?.toString() ?? '').trim();
  final manualSo = (order.manual['lsxNumber']?.toString() ?? '').trim();
  final name = snapshotName.isNotEmpty
      ? snapshotName
      : (manualTen.isNotEmpty
          ? manualTen
          : (manualSo.isNotEmpty ? manualSo : (order.id.isNotEmpty ? order.id : 'LSX')));
  return safeLsxFileName(name);
}

// ── Ngày / số lượng ───────────────────────────────────────────────────────────

String todayStr() {
  final d = DateTime.now();
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

/// "Số lượng: 100.000 túi  Dung sai (10%): 10.000 túi".
String formatLsxOrderQuantity(
  String note,
  double quantityTolerancePercent, [
  String? unit,
]) {
  final parts = formatLsxOrderQuantityParts(note, quantityTolerancePercent, unit);
  return parts.dungSai.isNotEmpty
      ? '${parts.base}  ${parts.dungSai}'
      : parts.base;
}

class LsxOrderQuantityParts {
  final String base;
  final String approx;
  final String dungSai;
  const LsxOrderQuantityParts({
    required this.base,
    required this.approx,
    required this.dungSai,
  });
}

final RegExp _oldToleranceSuffix = RegExp(r'\s*\(±\d+(?:[.,]\d+)?%\)');

double? _parseQuantityNumber(String note) {
  final m = RegExp(r'\d[\d.,]*').firstMatch(note);
  if (m == null) return null;
  final token = m.group(0)!;
  String cleaned;
  if (RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(token)) {
    cleaned = token.replaceAll('.', '');
  } else if (RegExp(r'^\d{1,3}(,\d{3})+$').hasMatch(token)) {
    cleaned = token.replaceAll(',', '');
  } else if (token.contains(',') && !token.contains('.')) {
    cleaned = token.replaceAll(',', '.');
  } else {
    cleaned = token;
  }
  final n = double.tryParse(cleaned);
  return (n != null && n.isFinite && n > 0) ? n : null;
}

String _detectUnit(String note, [String fallback = 'túi']) =>
    RegExp(r'm²|m2|mét vuông', caseSensitive: false).hasMatch(note)
        ? 'm²'
        : fallback;

LsxOrderQuantityParts formatLsxOrderQuantityParts(
  String note,
  double quantityTolerancePercent, [
  String? unit,
]) {
  final base = note.isEmpty
      ? ''
      : note.replaceFirst(_oldToleranceSuffix, '').trim();
  final tol = quantityTolerancePercent;
  final n = _parseQuantityNumber(base);
  final u = unit ?? _detectUnit(base);
  final hide = n == null || tol <= 0;
  final approx =
      hide ? '' : '${_group(((n * tol) / 100).round())} $u';
  final dungSai = hide ? '' : 'Dung sai (${_fmtNum(tol)}%): $approx';
  return LsxOrderQuantityParts(base: base, approx: approx, dungSai: dungSai);
}

// ── Chia (mirror lsx-divide.ts) ───────────────────────────────────────────────

class LsxDivideSpec {
  final double filmWidthMm;
  final int elementCount;
  final double defaultWidthMm;
  final List<double> widths;
  final double totalWidthMm;
  final bool custom;
  final bool valid;
  final String error;
  const LsxDivideSpec({
    required this.filmWidthMm,
    required this.elementCount,
    required this.defaultWidthMm,
    required this.widths,
    required this.totalWidthMm,
    required this.custom,
    required this.valid,
    required this.error,
  });
}

double _layKhoTruocTuDongChia(ProductionOrder order) {
  final chia = layDongTheoCongDoan(order, 'Chia');
  final label = chia?.khoMangLabel;
  if (label == null) return 0;
  final truoc = label.split('→').first.trim().replaceAll(',', '.');
  final n = double.tryParse(truoc);
  return (n != null && n.isFinite && n > 0) ? (n * 1000).roundToDouble() : 0;
}

double _layKhoTuDongIn(ProductionOrder order) {
  final dongIn = layDongTheoCongDoan(order, 'In');
  final kho = dongIn?.khoMang;
  return (kho != null && kho > 0) ? (kho * 1000).roundToDouble() : 0;
}

LsxDivideSpec resolveLsxDivideSpec(ProductionOrder order) {
  final manual = LsxManual(order.manual);
  final snapshot = order.snapshot;
  final filmWidthMm = _layKhoTruocTuDongChia(order) != 0
      ? _layKhoTruocTuDongChia(order)
      : (_layKhoTuDongIn(order) != 0
          ? _layKhoTuDongIn(order)
          : (((snapshot['originalWidthMm'] as num?)?.toDouble() ??
                      ((snapshot['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000))
                  .roundToDouble());
  final elementCount = manual.getNum('divideElements').round();
  final chiaSpec = layDongTheoCongDoan(order, 'Chia');
  final chiaSpecMm = (chiaSpec?.khoMang != null && chiaSpec!.khoMang! > 0)
      ? (chiaSpec.khoMang! * 1000).roundToDouble()
      : 0.0;
  final defaultWidthMm = manual.getNum('divideWidth') != 0
      ? manual.getNum('divideWidth')
      : (chiaSpecMm != 0
          ? chiaSpecMm
          : ((snapshot['divideWidthMm'] as num?)?.toDouble() ?? 0));
  final customWidths = (manual.get('divideWidths') as List?) ?? const [];
  final custom = customWidths.isNotEmpty;
  final widths = List<double>.generate(elementCount, (index) {
    if (custom) {
      final v = index < customWidths.length ? customWidths[index] : null;
      return ((v as num?)?.toDouble() ?? defaultWidthMm);
    }
    return defaultWidthMm;
  });
  final totalWidthMm = widths.fold<double>(0, (s, w) => s + w);

  var error = '';
  if (elementCount <= 0) {
    error = 'Vui lòng nhập số phần tử chia.';
  } else if (!custom && defaultWidthMm <= 0) {
    error = 'Vui lòng nhập khổ chia.';
  } else if (custom && customWidths.length != elementCount) {
    error = 'Vui lòng nhập đủ $elementCount phần tử.';
  } else if (widths.any((w) => w <= 0)) {
    error = 'Khổ mỗi phần tử phải lớn hơn 0mm.';
  } else if (filmWidthMm > 0 && totalWidthMm > filmWidthMm) {
    error = 'Tổng khổ chia không được vượt quá ${filmWidthMm.round()}mm.';
  }
  return LsxDivideSpec(
    filmWidthMm: filmWidthMm,
    elementCount: elementCount,
    defaultWidthMm: defaultWidthMm,
    widths: widths,
    totalWidthMm: totalWidthMm,
    custom: custom,
    valid: error.isEmpty,
    error: error,
  );
}

String formatLsxDivideSummary(LsxDivideSpec spec) {
  if (spec.custom) return spec.widths.map((w) => '${w.round()}mm').join(', ');
  return '${spec.defaultWidthMm.round()}mm';
}

// ── Helpers số ────────────────────────────────────────────────────────────────

String _group(int v) {
  final s = v.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return v < 0 ? '-$buf' : buf.toString();
}

String _fmtNum(double v) =>
    v == v.roundToDouble() ? v.round().toString() : v.toString();
