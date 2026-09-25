// ═══════════════════════════════════════════════════════════════════════════
// PricingDisplay — port `apps/web/src/lib/pricing-display.ts`.
// Nhãn hiển thị động theo loại sản phẩm / chế độ (túi | m² | m | custom | màng in).
// ═══════════════════════════════════════════════════════════════════════════

class PricingDisplayMeta {
  final bool isPrintFilm;
  final bool isFilm;
  final String unit;
  final String quantityUnit;
  final String quantityUnitForHistory;
  final String priceTitle;
  final String closedPriceTitle;
  final String salePriceTitle;
  final String initialPriceLabel;
  final String profitLabel;
  final String shippingLabel;
  final String paymentInputLabel;
  final String exportTitle;
  final String detailTitle;

  const PricingDisplayMeta({
    required this.isPrintFilm,
    required this.isFilm,
    required this.unit,
    required this.quantityUnit,
    required this.quantityUnitForHistory,
    required this.priceTitle,
    required this.closedPriceTitle,
    required this.salePriceTitle,
    required this.initialPriceLabel,
    required this.profitLabel,
    required this.shippingLabel,
    required this.paymentInputLabel,
    required this.exportTitle,
    required this.detailTitle,
  });

  /// Mirror `interestLabel(rate, days)` web — nhãn lãi vay động.
  String interestLabel(double rate, [int? days]) => isPrintFilm
      ? 'Lãi vay Màng in ${formatPercent(rate)}'
      : 'Lãi vay ${days ?? 30} ngày';

  /// Mirror `formatPrintFilmPayment(rate)` web.
  static String formatPercent(double rate) {
    final val = double.parse((rate * 100).toStringAsFixed(2));
    return '$val%';
  }
}

String formatPercent(double rate) => PricingDisplayMeta.formatPercent(rate);

/// Mirror `isPrintFilm(input)`.
bool isPrintFilm(Map<String, dynamic> input) =>
    input['productType'] == 'mang' && input['filmType'] == 'mangIn';

/// Mirror `layDonViTinh(input)`.
String layDonViTinh(Map<String, dynamic> input) {
  if (input['pricingMode'] == 'commercial') {
    final kind = (input['commercialUnitKind'] as String?) ?? 'tui';
    if (kind == 'm2') return 'm²';
    if (kind == 'm') return 'm';
    if (kind == 'custom') {
      final label = ((input['commercialUnitLabel'] as String?) ?? '').trim();
      if (label.isNotEmpty) return label;
    }
    return 'túi';
  }
  return input['productType'] == 'mang' ? 'm²' : 'túi';
}

/// Mirror `getPricingDisplayMeta(input)`.
PricingDisplayMeta getPricingDisplayMeta(Map<String, dynamic> input) {
  final printFilm = isPrintFilm(input);
  final film = input['productType'] == 'mang';
  final unit = layDonViTinh(input);

  return PricingDisplayMeta(
    isPrintFilm: printFilm,
    isFilm: film,
    unit: unit,
    quantityUnit: unit,
    quantityUnitForHistory: film ? 'm²' : 'cái',
    priceTitle: 'Giá đề xuất / $unit',
    closedPriceTitle: 'Giá chốt / $unit',
    salePriceTitle: 'Giá Bán/$unit',
    initialPriceLabel: printFilm ? 'Giá ban đầu Màng in' : 'Giá ban đầu',
    profitLabel: printFilm ? 'Lợi nhuận Màng in' : 'Lợi nhuận',
    shippingLabel: printFilm ? 'Vận chuyển Màng in' : 'Chi phí Vận chuyển',
    paymentInputLabel: 'Thanh toán',
    exportTitle: printFilm
        ? 'BÁO GIÁ MÀNG IN - CTY CP LAI TRƯỜNG SƠN'
        : film
            ? 'BÁO GIÁ MÀNG BAO BÌ - CTY CP LAI TRƯỜNG SƠN'
            : 'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
    detailTitle: 'CHI TIẾT GIÁ BÁN / ${unit.toUpperCase()}',
  );
}
