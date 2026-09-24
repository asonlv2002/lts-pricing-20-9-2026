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
      chotGia: null, // chotGia hiện chỉ là 1 phần của PricingSheet (saleResult.salePrice nếu có)
      quoteStatus: _trichQuoteStatus(sheet),
      input: iv,
    );
  }

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
};

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
