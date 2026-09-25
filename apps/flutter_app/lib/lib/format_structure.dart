// ═══════════════════════════════════════════════════════════════════════════
// format_structure — port `apps/web/src/lib/format-structure.ts`.
// Rút gọn chuỗi cấu trúc vật liệu cho hiển thị báo giá / PDF.
//   "LLDPE (gạo) 50 // PET 12" → "LLDPE//PET"
//   "PET / PA / LLDPE_GAO"     → "PET/PA/LLDPE"
// ═══════════════════════════════════════════════════════════════════════════

/// Chuẩn hóa tên gốc VL (giữ mic gắn riêng sau) — mirror `normalizeMaterialBaseName`.
/// "LLDPE thường" / "LLDPE (gạo)" / "LLDPE_GAO" → "LLDPE".
/// PA variants (PA 0-3/4-6/7-9 màu + id PA_0_3/PA_4_6/PA_7_9) → "PA".
String normalizeMaterialBaseName(String name) {
  var out = (name);
  out = out.replaceAll(RegExp(r'\([^)]*\)'), '');
  out = out.replaceAll(RegExp(r'\bLLDPE_[A-Za-z0-9_]+', caseSensitive: false), 'LLDPE');
  out = out.replaceAll(RegExp(r'\bLLDPE\s+\S+', caseSensitive: false), 'LLDPE');
  out = out.replaceAll(
      RegExp(r'\bPA\s+(?:0-3|4-6|7-9)\s+m[àa]u', caseSensitive: false), 'PA');
  out = out.replaceAll(RegExp(r'\bPA_[A-Za-z0-9_]+', caseSensitive: false), 'PA');
  out = out.replaceAll(RegExp(r'\s{2,}'), ' ');
  return out.trim();
}

/// Bỏ số mic + gọn ký hiệu ghép — mirror `boSoCauTruc`.
String boSoCauTruc(String s) {
  var out = normalizeMaterialBaseName(s);
  out = out.replaceAll(RegExp(r'\d+'), '');
  out = out.replaceAll(RegExp(r'\s*//\s*'), '//');
  out = out.replaceAll(RegExp(r'\s*/\s*'), '/');
  out = out.replaceAll(RegExp(r'\s*\+\s*'), '+');
  out = out.replaceAll(RegExp(r'\s*\[\s*'), '[');
  out = out.replaceAll(RegExp(r'\s*\]\s*'), ']');
  out = out.replaceAll(RegExp(r'\s{2,}'), ' ');
  return out.trim();
}

/// Resolve layer id → material.name (fallback id) — mirror `buildStructureFromLayers`.
String buildStructureFromLayers(
  List<Map<String, dynamic>> materials,
  List<String?> layerIds,
) {
  return layerIds
      .where((id) => id != null && id.isNotEmpty)
      .map((id) {
        for (final m in materials) {
          if (m['id'] == id) return (m['name'] ?? id).toString();
        }
        return id!;
      })
      .join(' / ');
}

/// Một mặt: name + thickness nối `//` — mirror `buildSideStructureText`.
String buildSideStructureText(
  List<Map<String, dynamic>> materials,
  List<String?> layerIds,
) {
  final parts = <String>[];
  for (final id in layerIds) {
    if (id == null || id.isEmpty) continue;
    Map<String, dynamic>? m;
    for (final e in materials) {
      if (e['id'] == id) {
        m = e;
        break;
      }
    }
    if (m == null) {
      parts.add(id);
      continue;
    }
    final thickness = (m['thickness'] as num?)?.toDouble() ?? 0;
    final name = (m['name'] ?? id).toString();
    if (thickness > 0) {
      parts.add('$name ${thickness == thickness.roundToDouble() ? thickness.toInt() : thickness}');
    } else {
      parts.add(name);
    }
  }
  return parts.join('//');
}

/// Cấu trúc MẶT TRƯỚC cho wizard báo giá — mirror `cauTrucMatTrucTuLop`.
/// Trả null nếu đơn không phải 2 mặt hoặc material id không resolve được.
String? cauTrucMatTrucTuLop(
  List<Map<String, dynamic>> materials,
  Map<String, dynamic> input,
) {
  final layer2Id = input['layer2Id'] as String?;
  final layer2AltId = input['layer2AltId'] as String?;
  if (layer2Id == null || layer2AltId == null) return null;
  final ids = [
    input['layer1Id'] as String?,
    layer2Id,
    input['layer3Id'] as String?,
    input['layer4Id'] as String?,
    input['layer5Id'] as String?,
  ];
  for (final id in ids) {
    if (id != null && !materials.any((m) => m['id'] == id)) return null;
  }
  final out = boSoCauTruc(buildSideStructureText(materials, ids));
  return out.isEmpty ? null : out;
}

/// Chuỗi "Chất liệu" giống wizard/PDF báo giá — mirror `formatChatLieuNhuBaoGia`.
/// - 1 cấu trúc: PET//MPET//LLDPE
/// - 2 cấu trúc: Mặt trước: …, Mặt sau: … (+ Đáy nếu dayDung)
String formatChatLieuNhuBaoGia(
  List<Map<String, dynamic>> materials,
  Map<String, dynamic> input, {
  Map<String, dynamic>? bagSpec,
}) {
  final layerIds = [
    input['layer1Id'] as String?,
    input['layer2Id'] as String?,
    input['layer3Id'] as String?,
    input['layer4Id'] as String?,
    input['layer5Id'] as String?,
  ];
  final frontRaw = buildSideStructureText(materials, layerIds);

  final structureBack = (bagSpec?['structureBack'] as String?)?.trim() ?? '';
  final hasStructureBack = bagSpec?['hasStructureBack'] == true;
  final hasDual = (input['layer2Id'] != null && input['layer2AltId'] != null) ||
      structureBack.isNotEmpty ||
      hasStructureBack;

  if (!hasDual) return boSoCauTruc(frontRaw);

  final backRaw = structureBack.isNotEmpty
      ? structureBack
      : buildSideStructureText(materials, [
          input['layer1Id'] as String?,
          input['layer2AltId'] as String?,
          input['layer3Id'] as String?,
          input['layer4Id'] as String?,
          input['layer5Id'] as String?,
        ]);

  final swapped = bagSpec?['structureSwapped'] == true;
  final front = boSoCauTruc(swapped ? backRaw : frontRaw);
  final back = boSoCauTruc(swapped ? frontRaw : backRaw);

  final bagType =
      (bagSpec?['bagType'] as String?) ?? (input['bagType'] as String?) ?? '';
  if (bagType == 'dayDung') {
    final bottomFollows =
        bagSpec?['bottomFollows'] == 'back' ? 'back' : 'front';
    if (bottomFollows == 'back') {
      return 'Mặt trước: $front, Mặt sau + Đáy: $back';
    }
    return 'Mặt trước + Đáy: $front, Mặt sau: $back';
  }

  return 'Mặt trước: $front, Mặt sau: $back';
}
