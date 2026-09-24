// ═══════════════════════════════════════════════════════════════════════════
// thuong-mai.dart — Tính giá Thương mại (mua đi bán lại).
// Mirror apps/web/src/lib/engine.ts: tinhGiaThuongMai + tinhDonGiaThuongMaiHieuLuc.
// ═══════════════════════════════════════════════════════════════════════════

class KetQuaThuongMai {
  final double purchasePrice;
  final double quantity;
  final double purchaseTotal;
  final double extraFee;
  final double extraFeePerUnit;
  final double baseCostTotal;
  final double baseCostPerUnit;
  final double profitVnd;
  final double profitPerUnit;
  final double totalVnd;
  final double unitPriceVnd;
  final double profitPct;
  final String profitUnit; // percent | vnd
  final double profitRawValue;
  final String unitKind; // tui | m2 | m | custom
  final String unitLabel;
  final double unitWeightGr;

  const KetQuaThuongMai({
    required this.purchasePrice,
    required this.quantity,
    required this.purchaseTotal,
    required this.extraFee,
    required this.extraFeePerUnit,
    required this.baseCostTotal,
    required this.baseCostPerUnit,
    required this.profitVnd,
    required this.profitPerUnit,
    required this.totalVnd,
    required this.unitPriceVnd,
    required this.profitPct,
    required this.profitUnit,
    required this.profitRawValue,
    required this.unitKind,
    required this.unitLabel,
    required this.unitWeightGr,
  });

  /// Mirror `tinhGiaThuongMai` (engine.ts:464).
  factory KetQuaThuongMai.tinh(Map<String, dynamic> input) {
    final purchasePrice =
        (input['commercialPurchasePrice'] as num?)?.toDouble() ?? 0;
    final quantity = ((input['quantity'] as num?)?.toDouble() ?? 0);
    final qty = quantity < 0 ? 0.0 : quantity;
    final profitUnit = (input['commercialProfitUnit'] as String?) ?? 'percent';
    final profitRaw =
        (input['commercialProfitValue'] as num?)?.toDouble() ?? 0;
    final unitKind = (input['commercialUnitKind'] as String?) ?? 'tui';
    final customLabel = ((input['commercialUnitLabel'] as String?) ?? '').trim();
    final extraFeeRaw = (input['commercialExtraFee'] as num?)?.toDouble() ?? 0;
    final extraFee = extraFeeRaw < 0 ? 0.0 : extraFeeRaw;
    final unitWeightRaw =
        (input['commercialUnitWeight'] as num?)?.toDouble() ?? 0;
    final unitWeightGr = unitWeightRaw < 0 ? 0.0 : unitWeightRaw;

    final purchaseTotal = purchasePrice * qty;
    final baseCostTotal = purchaseTotal;
    final baseCostPerUnit = qty > 0 ? baseCostTotal / qty : purchasePrice;

    final profitVnd = profitUnit == 'percent'
        ? baseCostTotal * (profitRaw / 100)
        : profitRaw * qty;
    final profitPerUnit = qty > 0 ? profitVnd / qty : 0.0;
    final extraFeePerUnit = qty > 0 ? extraFee / qty : 0.0;

    final totalVnd = baseCostTotal + profitVnd;
    final unitPriceVnd = qty > 0 ? totalVnd / qty : purchasePrice;
    final pct = baseCostTotal > 0 ? profitVnd / baseCostTotal : 0.0;

    final unitLabel = unitKind == 'tui'
        ? '/Túi'
        : unitKind == 'm2'
            ? '/m²'
            : unitKind == 'm'
                ? '/m'
                : customLabel.isNotEmpty
                    ? '/$customLabel'
                    : '/đơn vị';

    return KetQuaThuongMai(
      purchasePrice: purchasePrice,
      quantity: qty,
      purchaseTotal: purchaseTotal,
      extraFee: extraFee,
      extraFeePerUnit: extraFeePerUnit,
      baseCostTotal: baseCostTotal,
      baseCostPerUnit: baseCostPerUnit,
      profitVnd: profitVnd,
      profitPerUnit: profitPerUnit,
      totalVnd: totalVnd,
      unitPriceVnd: unitPriceVnd,
      profitPct: pct,
      profitUnit: profitUnit,
      profitRawValue: profitRaw,
      unitKind: unitKind,
      unitLabel: unitLabel,
      unitWeightGr: unitWeightGr,
    );
  }
}

/// Đơn giá cuối của sheet thương mại (mua + LN + Thùng/VC/Lãi vay/HH/Trục/Phụ phí).
/// Mirror `tinhDonGiaThuongMaiHieuLuc` (engine.ts:527).
double? tinhDonGiaThuongMaiHieuLuc(
  Map<String, dynamic> input,
  Map<String, dynamic>? result,
) {
  if (input['pricingMode'] != 'commercial') return null;
  if ((input['commercialMode'] ?? 'form') != 'form') return null;
  if (result == null) return null;

  final tm = KetQuaThuongMai.tinh(input);
  double d(String k) => (result[k] as num?)?.toDouble() ?? 0;

  return tm.unitPriceVnd +
      ((input['hasTape'] == true) ? d('tapePerUnit') : 0) +
      ((input['hasHandle'] == true) ? d('handlePerUnit') : 0) +
      d('boxPerUnit') +
      d('shippingPerUnit') +
      d('interestPerUnit') +
      d('commissionPerUnit') +
      d('gcShippingPerUnit') +
      d('gcPackagingPerUnit') +
      d('gcOtherPerUnit') +
      ((input['cylIncluded'] == true) ? d('cylAllocPerUnit') : 0) +
      tm.extraFeePerUnit;
}
