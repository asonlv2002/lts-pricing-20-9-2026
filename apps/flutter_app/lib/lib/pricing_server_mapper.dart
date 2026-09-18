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
// Lưu ý: PricingSheet inputValue = nguyên CalculateInput; saleResult /
// masterResult = kết quả tính từ server (sale là của user sửa sau, master là
// của advisor chốt). Nếu cả 2 null → sheet chưa tính → finalPrice = 0.
// ═══════════════════════════════════════════════════════════════════════════
import '../api/service_lts_client.dart';
import '../engine/models.dart';

class PricingServerMapper {
  // ── PricingSheetApi → HistoryItem (cho LichSuScreen UI không đổi) ────────
  static HistoryItem pricingSheetToHistoryItem(PricingSheetApi sheet) {
    final iv = sheet.inputValue;
    final sale = sheet.saleResult;
    final master = sheet.masterResult;
    // Tìm finalPrice / structure từ sale → master (sale ưu tiên vì là user sửa sau).
    num finalPrice = 0;
    String structure = '';
    if (sale != null) {
      finalPrice = (sale['finalPrice'] as num?) ?? 0;
      structure = (sale['structureText'] as String?) ?? '';
    }
    if (master != null && (finalPrice == 0 || structure.isEmpty)) {
      finalPrice = (master['finalPrice'] as num?) ?? finalPrice;
      structure = (master['structureText'] as String?) ?? structure;
    }
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
  static ProductionOrder orderToProductionOrder(
    QuotationPricingSheetOrderApi order,
  ) {
    final iv = order.inputValue ?? const <String, dynamic>{};
    return ProductionOrder(
      id: order.id,
      quoteId: order.quotationId,
      createdAt: order.createdAt,
      status: order.hasAdvisorApproved
          ? 'approved'
          : (order.hasPrintedOrder ? 'printed' : 'created'),
      manual: iv,
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
        out.add(orderToProductionOrder(o));
      }
    }
    return out;
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
