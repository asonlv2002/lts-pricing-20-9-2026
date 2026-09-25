// ═══════════════════════════════════════════════════════════════════════════
// pricing_server_mapper — biến đổi từ API server ↔ local engine models.
//
// Trước khi có BE, LichSuScreen dùng HistoryItem đọc từ LocalStorage; LSXScreen
// dùng ProductionOrder đọc từ LocalStorage. Giờ thay bằng 2 nguồn mới:
//   - PricingSheetApi (BE /pricing-sheet) → HistoryItem (cho LichSuScreen UI)
//   - QuotationPricingSheetOrderApi (BE /quotations/orders) → ProductionOrder
//
// Hai mapper này giữ nguyên shape HistoryItem / ProductionOrder để UI LichSu +
// LSX KHÔNG cần đổi, chỉ đổi nguồn dữ liệu phía AppState.
//
// ⚠️ BE KHÔNG lưu finalPrice cho pricing sheet — server chỉ lưu inputValue +
// saleResult/masterResult (override wrapper { overrides, profitRatePct }) +
// priceConfigIds (pin). Mirror web mapPricingSheetToHistory (pricing-sheet-
// mapper.ts): khi tải về phải CHẠY LẠI ENGINE trên inputValue để có finalPrice,
// ctx = config pin theo priceConfigIds (load batch qua /price-config/by-ids),
// không có pin / pin hỏng → fallback config session hiện tại.
//
// Lưu ý: PricingSheet inputValue = nguyên CalculateInput; nếu sheet pin config
// cũ mà Flutter không load được pin → giá lệch nhẹ so với web (web cũng vậy khi
// fallback). Engine bundle Flutter chỉ có tính giá THƯỜNG (LTS.calculate) —
// sheet nâng cao (isNangCap) sẽ ra giá engine thường, không bằng web.
// ═══════════════════════════════════════════════════════════════════════════
import '../api/service_lts_client.dart';
import '../engine/js_runtime.dart';
import '../engine/models.dart';
import 'engine_advanced.dart';
import 'lsx_so.dart';

/// Engine ctx — mirror web StoreDataForScope (3 phần engine bundle Flutter dùng:
/// LTS.calculate nhận 4 tham số, không có smallWidthPrices).
class EngineCtxTinhGia {
  final List<MaterialDef> materials;
  final AppConstants constants;
  final List<ProfitRow> profitTable;
  const EngineCtxTinhGia({
    required this.materials,
    required this.constants,
    required this.profitTable,
  });
}

class PricingServerMapper {
  // ── PricingSheetApi → HistoryItem (cho LichSuScreen UI không đổi) ────────
  ///
  /// finalPrice TÍNH LẠI bằng engine (mirror web mapPricingSheetToHistory):
  ///   1. Build ctx từ pin priceConfigIds (nếu có) — fallback config hiện tại.
  ///   2. EngineService.calculate(inputValue, ctx) → finalPrice + structureText.
  /// Engine chưa ready / lỗi / input chưa đủ → finalPrice = 0 (nháp thật).
  static HistoryItem pricingSheetToHistoryItem(
    PricingSheetApi sheet,
    EngineCtxTinhGia fallback, [
    Map<String, PriceConfigApi> pinConfigs = const {},
  ]) {
    final iv = sheet.inputValue;
    final ctx = ctxChoSheet(sheet, fallback, pinConfigs);

    CalculateResult? res;
    try {
      final engine = EngineService.instance;
      if (engine.isReady) {
        res = engine.calculate(
          input: CalculateInput.fromJson(iv),
          materials: ctx.materials,
          constants: ctx.constants,
          profitTable: ctx.profitTable,
        );
      }
    } catch (_) {
      res = null;
    }

    final num finalPrice = res?.finalPrice ?? 0;
    String structure = res?.structureText ?? '';
    // Fallback structure từ layer IDs trong inputValue nếu vẫn rỗng.
    if (structure.isEmpty) {
      structure = _trichStructureTuLayers(iv);
    }
    // Ghi đè Sale/Admin + chốt giá từ saleResult/masterResult (mirror web
    // mapPricingSheetToHistory). Shape: { overrides, profitRatePct, chotGia }.
    final saleRes = sheet.saleResult;
    final masterRes = sheet.masterResult;
    final isNangCap =
        (iv['isNangCap'] as bool?) ?? (iv['cheDoNangCao'] as bool?) ?? false;
    // Pin CPSX nâng cao từ ctx đã pin (mirror web trichCpsxNangCao(ctx.constants)).
    Map<String, dynamic>? pinnedCpsx;
    if (isNangCap) {
      try {
        pinnedCpsx = EngineAdvanced.instance.trichCpsxNangCao(ctx.constants);
      } catch (_) {
        pinnedCpsx = null;
      }
    }
    return HistoryItem(
      id: sheet.id,
      date: sheet.updatedAt.isNotEmpty ? sheet.updatedAt : sheet.createdAt,
      customer: (iv['customer'] as String?) ??
          sheet.customerName ??
          sheet.customerCodeName ??
          '',
      productName: (iv['productName'] as String?) ??
          sheet.pricingSheetName ??
          '',
      structure: structure,
      quantity: (iv['quantity'] as num?) ?? 0,
      finalPrice: finalPrice,
      // Ưu tiên inputValue.chotGia (web lưu ở đây), fallback sale/master cũ.
      chotGia: _numOrNull(iv['chotGia']) ??
          _numOrNull(masterRes?['chotGia']) ??
          _numOrNull(saleRes?['chotGia']),
      quoteStatus: _trichQuoteStatus(sheet),
      input: iv,
      pricingSheetId: sheet.id,
      saleOverrides: _mapOrNull(saleRes?['overrides']),
      adminOverrides: _mapOrNull(masterRes?['overrides']),
      saleProfitRatePct: _numOrNull(saleRes?['profitRatePct'])?.toDouble(),
      adminProfitRatePct: _numOrNull(masterRes?['profitRatePct'])?.toDouble(),
      pinnedCpsxNangCao: pinnedCpsx,
      isNangCap: isNangCap ? true : null,
    );
  }

  static Map<String, dynamic>? _mapOrNull(dynamic v) =>
      v is Map ? v.cast<String, dynamic>() : null;

  static num? _numOrNull(dynamic v) => v is num ? v : null;

  // ── QuotationPricingSheetOrderApi → ProductionOrder (cho LSXScreen) ─────
  /// [quotation] — nhóm gom theo báo giá (fallback actorName/actorAvatarUrl khi
  /// order không có, mirror web lsx-server-adapter.ts).
  static ProductionOrder orderToProductionOrder(
    QuotationPricingSheetOrderApi order, [
    QuotationPricingSheetOrdersByQuotationApi? quotation,
  ]) {
    final iv = order.inputValue ?? const <String, dynamic>{};
    // Ép derive số LSX từ versionByMonth (BE b6028b0); giữ số cũ trong
    // inputValue nếu order chưa có STT (dữ liệu lỗi).
    final manual = Map<String, dynamic>.from(iv);
    final soDerive = soLsxTuOrder(OrderCoPhienBan(
      createdAt: order.createdAt,
      versionByMonth: order.versionByMonth,
    ));
    if (soDerive.isNotEmpty) manual['lsxNumber'] = soDerive;

    // Người lập: inputValue.preparedBy → order.actorName → quotation.actorName
    // (mirror web docNguoiLapTuInputValue; bỏ key lsxSnapshot nếu có).
    final preparedBy = iv['preparedBy'];
    final nguoiLap = (preparedBy is String && preparedBy.trim().isNotEmpty)
        ? preparedBy.trim()
        : ((order.actorName?.trim().isNotEmpty ?? false)
            ? order.actorName!.trim()
            : (quotation?.actorName?.trim() ?? ''));

    return ProductionOrder(
      id: order.id,
      quoteId: order.quotationId,
      createdAt: order.createdAt,
      status: order.hasAdvisorApproved
          ? 'approved'
          : (order.hasPrintedOrder ? 'printed' : 'created'),
      versionByMonth: order.versionByMonth,
      hasAdvisorApproved: order.hasAdvisorApproved,
      reason: order.reason ?? '',
      nguoiLap: nguoiLap,
      nguoiLapAvatar: order.actorAvatarUrl ?? quotation?.actorAvatarUrl,
      manual: manual,
      snapshot: iv,
    );
  }

  // Gom tất cả orders từ grouped-by-quotation list → flat list ProductionOrder.
  static List<ProductionOrder> ordersByQuotationToProductionOrders(
    List<QuotationPricingSheetOrdersByQuotationApi> groups,
  ) {
    final out = <ProductionOrder>[];
    for (final g in groups) {
      for (final o in g.orders) {
        out.add(orderToProductionOrder(o, g));
      }
    }
    return out;
  }

  // ── Engine ctx từ pin (mirror web layCtxChoPricingSheet) ─────────────────

  /// Pin theo priceConfigIds — không pin / pin hỏng → fallback (như web).
  static EngineCtxTinhGia ctxChoSheet(
    PricingSheetApi sheet,
    EngineCtxTinhGia fallback,
    Map<String, PriceConfigApi> pinConfigs,
  ) {
    final pinIds = sheet.priceConfigIds
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (pinIds.isEmpty || pinConfigs.isEmpty) return fallback;
    final pinned = <PriceConfigApi>[];
    for (final id in pinIds) {
      final c = pinConfigs[id];
      if (c != null) pinned.add(c);
    }
    if (pinned.isEmpty) return fallback;
    return xayEngineCtxTuPriceConfigs(pinned, fallback, pinIds);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /// quoteStatus: nếu đã gắn vào báo giá (quotationId != null) → 'approved';
  /// chưa gắn → 'drafted'.
  static String? _trichQuoteStatus(PricingSheetApi sheet) {
    if (sheet.quotationId == null) return 'drafted';
    return 'approved';
  }

  /// Tái dựng structure text từ layer1..5 + materialName khi chưa có
  /// saleResult.structureText / masterResult.structureText.
  static String _trichStructureTuLayers(Map<String, dynamic> input) {
    final parts = <String>[];
    for (int i = 1; i <= 5; i++) {
      final key = 'layer${i}Id';
      final id = input[key];
      if (id is String && id.isNotEmpty) {
        // Tên NVL thường được lưu ở input.layer${i}Name — nếu không có, dùng id.
        final name = (input['layer${i}Name'] as String?) ?? id;
        parts.add(name);
      }
    }
    if (parts.isEmpty) return '';
    // Chèn " + " giữa các lớp.
    return parts.join(' + ');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Merge price configs → engine ctx (mirror web xayEngineCtxTuPriceConfigs)
// ═══════════════════════════════════════════════════════════════════════════

/// Key AppConstants thuộc từng scope — mirror web SCOPE_CONSTANT_KEYS
/// (pricing-sheet-mapper.ts / price-config-mapper.ts).
const Map<String, List<String>> _scopeConstantKeys = {
  'MATERIALS': ['zipperPrice', 'zipperWeight'],
  'PRODUCTION': [
    'laborCost',
    'ghepCPSX', 'cutBase', 'cutThreshold1', 'cutThreshold2',
    'cutMult1', 'cutMult2', 'cutMult3', 'cutRules',
    'cylinderPricePerUnit', 'cylPriceA', 'cylPriceB',
    'nhuPrice', 'moPrice', 'colorSetup',
  ],
  'PRODUCTION_UPGRADE': [
    'cpsxUpgradeElectric', 'cpsxUpgradeLabor', 'cpsxUpgradeInk',
    'cpsxUpgradeThoiGian',
  ],
  'SURCHARGES': [
    'tapePrice', 'tapeWeight',
    'handlePrice', 'handleWeight', 'handleOptions',
    'boxPriceDefault', 'bagsPerBoxDefault', 'boxOptions',
    'shippingPerKmDefault', 'shippingKmDefault',
  ],
  'INTEREST': ['interestBase', 'interestSpread', 'paymentDays', 'customPaymentDays'],
  'WASTE': [
    'printWasteA', 'printWasteB', 'printWasteC', 'printWasteD', 'colorSetup',
    'ghepWasteA', 'ghepWasteB', 'ghepWasteC',
    'cutWasteA', 'cutWasteB', 'cutWasteC',
  ],
  'PROFIT': [],
  'OUTSOURCE': [],
};

/// Thứ tự apply scope khi bootstrap (production trước PRODUCTION_UPGRADE —
/// 4 key CPSX NC không bị production ghi đè nhầm, mirror web CAC_SCOPE_CAU_HINH).
const List<String> thuTuApplyScope = [
  'MATERIALS',
  'PRODUCTION',
  'PRODUCTION_UPGRADE',
  'SURCHARGES',
  'INTEREST',
  'WASTE',
  'PROFIT',
];

// ═══════════════════════════════════════════════════════════════════════════
// Phiên bản cấu hình (P2 — mirror web configVersioning + price-config-mapper)
// ═══════════════════════════════════════════════════════════════════════════

/// Thông tin meta 1 phiên bản đọc từ blob inputValue (name/effectiveMode/
/// effectiveFrom do frontend nhét cùng cấp scope data khi lưu).
class ThongTinPhienBan {
  final String name;
  final String effectiveMode;
  final String effectiveFrom;
  const ThongTinPhienBan({
    this.name = '',
    this.effectiveMode = 'month',
    this.effectiveFrom = '',
  });
}

/// Đọc meta từ blob — thiếu effectiveFrom → fallback `createdAt` slice tháng.
ThongTinPhienBan thongTinPhienBanTu(PriceConfigApi pc) {
  final blob = pc.inputValue ?? const <String, dynamic>{};
  final name = blob['name']?.toString() ?? '';
  final mode = blob['effectiveMode']?.toString() ?? 'month';
  var from = blob['effectiveFrom']?.toString() ?? '';
  if (from.isEmpty && pc.createdAt.length >= 7) {
    from = pc.createdAt.substring(0, 7);
  }
  return ThongTinPhienBan(name: name, effectiveMode: mode, effectiveFrom: from);
}

/// So sánh 2 bản «bản nào mới hơn» — mirror web chonPhienBanMoiNhat:
/// version server desc → updatedAt/createdAt desc → effectiveFrom desc.
int soSanhPhienBan(PriceConfigApi a, PriceConfigApi b) {
  if (a.version != b.version) return b.version - a.version;
  final ta = _thoiGianHopLe(a);
  final tb = _thoiGianHopLe(b);
  if (tb != ta) return tb.compareTo(ta);
  final fa = thongTinPhienBanTu(a).effectiveFrom;
  final fb = thongTinPhienBanTu(b).effectiveFrom;
  return fb.compareTo(fa);
}

String _thoiGianHopLe(PriceConfigApi pc) {
  final t = pc.createdAt.isNotEmpty ? pc.createdAt : '';
  return t;
}

/// Sắp xếp danh sách phiên bản: bản mới nhất đứng đầu.
List<PriceConfigApi> sapXepMoiNhatTruoc(List<PriceConfigApi> list) {
  final sorted = List<PriceConfigApi>.of(list);
  sorted.sort(soSanhPhienBan);
  return sorted;
}

/// Trích dữ liệu 1 scope từ store hiện tại → blob để lưu (mirror web
/// trichXuatDuLieuScope, price-config-mapper.ts:105 — không có smallWidthPrices).
Map<String, dynamic> trichXuatDuLieuScope(
  String configName,
  List<MaterialDef> materials,
  AppConstants constants,
  List<ProfitRow> profitTable,
) {
  final result = <String, dynamic>{};
  if (configName == 'MATERIALS') {
    result['materials'] = materials.map((e) => e.toJson()).toList();
    final keys = _scopeConstantKeys['MATERIALS']!;
    for (final k in keys) {
      result[k] = constants.raw[k];
    }
  } else if (configName == 'PROFIT') {
    result['profitTable'] = profitTable.map((e) => e.toJson()).toList();
  } else if (configName == 'OUTSOURCE') {
    // Flutter chưa quản lý config gia công ngoài — bỏ trống.
  } else {
    final keys = _scopeConstantKeys[configName];
    if (keys != null) {
      for (final k in keys) {
        result[k] = constants.raw[k];
      }
    }
  }
  return result;
}

/// Danh sách NVL từ blob (null nếu blob không có mảng materials).
List<MaterialDef>? materialsTuBlob(Map<String, dynamic> blob) {
  final list = blob['materials'];
  if (list is! List) return null;
  final parsed = <MaterialDef>[];
  for (final e in list) {
    if (e is! Map) continue;
    try {
      parsed.add(MaterialDef.fromJson(e.cast<String, dynamic>()));
    } catch (_) {}
  }
  return parsed.isEmpty ? null : parsed;
}

/// Bảng lợi nhuận từ blob (null nếu không có mảng profitTable).
List<ProfitRow>? profitTuBlob(Map<String, dynamic> blob) {
  final rows = blob['profitTable'];
  if (rows is! List) return null;
  final parsed = <ProfitRow>[];
  for (final e in rows) {
    if (e is! Map) continue;
    try {
      parsed.add(ProfitRow.fromJson(e.cast<String, dynamic>()));
    } catch (_) {}
  }
  return parsed.isEmpty ? null : parsed;
}

/// Các key constants thuộc [configName] có trong blob — CHỈ key non-null
/// (key thiếu trên BE không được coi là "đã có", mirror web apDungDuLieuScope).
Map<String, dynamic> constantsTuBlob(
  String configName,
  Map<String, dynamic> blob,
) {
  final out = <String, dynamic>{};
  final keys = _scopeConstantKeys[configName] ?? const <String>[];
  for (final k in keys) {
    final v = blob[k];
    if (v != null) out[k] = v;
  }
  return out;
}

/// Bổ sung NVL mặc định còn thiếu (mirror web boSungVatLieuMacDinhThieu):
/// BE snapshot cũ chưa có NVL mới (vd PA nhiều màu) → chèn vào cuối list.
/// Trả về list mới nếu có bổ sung, ngược lại trả về list gốc.
List<MaterialDef> boSungVatLieuMacDinhThieu(
  List<MaterialDef> hienTai,
  List<MaterialDef> macDinh,
) {
  final ids = hienTai.map((e) => e.id).toSet();
  final thieu =
      macDinh.where((m) => !ids.contains(m.id)).toList();
  if (thieu.isEmpty) return hienTai;
  return [...hienTai, ...thieu];
}

/// Gán key từ blob lên constants — bỏ qua null/undefined (key thiếu trên BE
/// không được coi là "đã có", tránh xóa data fallback).
AppConstants _ganKeys(
  Map<String, dynamic> blob,
  AppConstants base,
  List<String> keys,
) {
  final raw = Map<String, dynamic>.of(base.raw);
  for (final k in keys) {
    final v = blob[k];
    if (v != null) raw[k] = v;
  }
  return AppConstants(raw);
}

/// Merge nhiều PriceConfig thành 1 engine ctx (mirror web xayEngineCtxTuPriceConfigs):
/// cùng scope — bản đứng trước trong `uuTienIds` thắng (apply sau cùng).
EngineCtxTinhGia xayEngineCtxTuPriceConfigs(
  List<PriceConfigApi> configs,
  EngineCtxTinhGia fallback,
  List<String> uuTienIds,
) {
  final byId = <String, PriceConfigApi>{
    for (final c in configs)
      if (c.id.isNotEmpty) c.id: c,
  };
  final ordered = <PriceConfigApi>[];
  for (final id in uuTienIds) {
    final c = byId[id];
    if (c != null) ordered.add(c);
  }
  for (final c in configs) {
    if (!uuTienIds.contains(c.id)) ordered.add(c);
  }
  // Áp theo thứ tự ngược: bản ưu tiên (đầu list) apply sau cùng để thắng.
  final applyOrder = ordered.reversed.toList();

  List<MaterialDef> materials = List.of(fallback.materials);
  AppConstants constants = fallback.constants;
  List<ProfitRow> profitTable = List.of(fallback.profitTable);

  for (final pc in applyOrder) {
    final blob = pc.inputValue;
    if (blob == null) continue;
    final name = pc.configName.toUpperCase();
    if (name == 'MATERIALS') {
      final list = blob['materials'];
      if (list is List) {
        final parsed = <MaterialDef>[];
        for (final e in list) {
          if (e is! Map) continue;
          try {
            parsed.add(MaterialDef.fromJson(e.cast<String, dynamic>()));
          } catch (_) {
            // Material thiếu field bắt buộc → bỏ qua item đó.
          }
        }
        if (parsed.isNotEmpty) materials = parsed;
      }
      final keys = _scopeConstantKeys['MATERIALS'];
      if (keys != null) constants = _ganKeys(blob, constants, keys);
    } else if (name == 'PROFIT') {
      final rows = blob['profitTable'];
      if (rows is List) {
        final parsed = <ProfitRow>[];
        for (final e in rows) {
          if (e is! Map) continue;
          try {
            parsed.add(ProfitRow.fromJson(e.cast<String, dynamic>()));
          } catch (_) {
            // Row thiếu field bắt buộc → bỏ qua.
          }
        }
        if (parsed.isNotEmpty) profitTable = parsed;
      }
    } else {
      final keys = _scopeConstantKeys[name];
      if (keys != null) constants = _ganKeys(blob, constants, keys);
    }
  }

  return EngineCtxTinhGia(
    materials: materials,
    constants: constants,
    profitTable: profitTable,
  );
}
