// ═══════════════════════════════════════════════════════════════════════════
// Models — mirror đúng shape của apps/web/src/lib/types.ts
// Dùng Map<String, dynamic> ở phía nội bộ (vì engine JS nhận/trả JSON tự do).
// Class chỉ wrap để IDE-friendly + default values + copyWith.
// ═══════════════════════════════════════════════════════════════════════════

class MaterialDef {
  final String id;
  final String name;
  final String? group;
  final double density;
  final double thickness;
  final double pricePerKg;
  final bool isPETorPA;
  final bool? adjustableMic;
  final double rollLength;
  final double inkPricePerColor;
  final double? pricePerM2;

  const MaterialDef({
    required this.id,
    required this.name,
    this.group,
    required this.density,
    required this.thickness,
    required this.pricePerKg,
    required this.isPETorPA,
    this.adjustableMic,
    required this.rollLength,
    required this.inkPricePerColor,
    this.pricePerM2,
  });

  factory MaterialDef.fromJson(Map<String, dynamic> j) => MaterialDef(
        id: j['id'] as String,
        name: j['name'] as String,
        group: j['group'] as String?,
        density: (j['density'] as num).toDouble(),
        thickness: (j['thickness'] as num).toDouble(),
        pricePerKg: (j['pricePerKg'] as num).toDouble(),
        isPETorPA: j['isPETorPA'] as bool? ?? false,
        adjustableMic: j['adjustableMic'] as bool?,
        rollLength: (j['rollLength'] as num?)?.toDouble() ?? 0,
        inkPricePerColor: (j['inkPricePerColor'] as num?)?.toDouble() ?? 0,
        pricePerM2: (j['pricePerM2'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (group != null) 'group': group,
        'density': density,
        'thickness': thickness,
        'pricePerKg': pricePerKg,
        'isPETorPA': isPETorPA,
        if (adjustableMic != null) 'adjustableMic': adjustableMic,
        'rollLength': rollLength,
        'inkPricePerColor': inkPricePerColor,
        if (pricePerM2 != null) 'pricePerM2': pricePerM2,
      };

  MaterialDef copyWith({
    String? name, String? group, double? density, double? thickness,
    double? pricePerKg, bool? isPETorPA, bool? adjustableMic,
    double? rollLength, double? inkPricePerColor, double? pricePerM2,
  }) =>
      MaterialDef(
        id: id,
        name: name ?? this.name,
        group: group ?? this.group,
        density: density ?? this.density,
        thickness: thickness ?? this.thickness,
        pricePerKg: pricePerKg ?? this.pricePerKg,
        isPETorPA: isPETorPA ?? this.isPETorPA,
        adjustableMic: adjustableMic ?? this.adjustableMic,
        rollLength: rollLength ?? this.rollLength,
        inkPricePerColor: inkPricePerColor ?? this.inkPricePerColor,
        pricePerM2: pricePerM2 ?? this.pricePerM2,
      );
}

class ProfitRow {
  final double threshold;
  final double col1;
  final double col2;
  const ProfitRow({required this.threshold, required this.col1, required this.col2});

  factory ProfitRow.fromJson(Map<String, dynamic> j) => ProfitRow(
        threshold: (j['threshold'] as num).toDouble(),
        col1: (j['col1'] as num).toDouble(),
        col2: (j['col2'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {'threshold': threshold, 'col1': col1, 'col2': col2};
}

/// Wrapper cho Map<String, dynamic> — giữ nguyên shape JSON như engine yêu cầu.
class AppConstants {
  final Map<String, dynamic> raw;
  const AppConstants(this.raw);

  factory AppConstants.fromJson(Map<String, dynamic> j) => AppConstants(Map.of(j));
  Map<String, dynamic> toJson() => raw;

  double get interestBase => (raw['interestBase'] as num?)?.toDouble() ?? 0.10;
  double get interestSpread => (raw['interestSpread'] as num?)?.toDouble() ?? 0.03;
  int get paymentDays => (raw['paymentDays'] as num?)?.toInt() ?? 30;

  AppConstants withField(String key, dynamic value) {
    final next = Map<String, dynamic>.of(raw);
    next[key] = value;
    return AppConstants(next);
  }
}

/// Input cho calculate — wrapper Map.
/// Default giống `defaultInput` ở apps/web/src/store/calculatorStore.ts.
class CalculateInput {
  final Map<String, dynamic> raw;
  const CalculateInput(this.raw);

  factory CalculateInput.defaults() => const CalculateInput({
        'customer': '',
        'productName': '',
        'productType': 'tui',
        'bagType': 'phang',
        'filmType': '',
        'filmRollLength': 6000,
        'quantity': 0,
        'numColors': null,
        'numImages': 1,
        'layer1Id': null,
        'layer2Id': null,
        'layer3Id': null,
        'layer4Id': null,
        'layer5Id': null,
        'spreadWidth': 0.0,
        'cutStep': 0.0,
        'metallicSurcharge': 0,
        'coverageRatio': 1,
        'handleWeight': 0,
        'zipperWeight': 0,
        'tapeWeight': 0,
        'hasZipper': false,
        'hasTape': false,
        'hasHandle': false,
        'paymentDays': 30,
        'profitColumn': 2,
        'commissionRate': 0,
        'commissionFixedVND': 0,
        'commissionUnit': 'percent',
        'commissionInputValue': 0,
        'bagsPerBox': 0,
        'boxPrice': 0,
        'shippingPerKm': 0,
        'shippingKm': 0,
        'cylLength': 0,
        'cylCircum': 0,
        'cylUnitPrice': 0,
        'cylType': 'A',
        'cylIncluded': false,
      });

  factory CalculateInput.fromJson(Map<String, dynamic> j) => CalculateInput(Map.of(j));
  Map<String, dynamic> toJson() => raw;

  CalculateInput withField(String key, dynamic value) {
    final next = Map<String, dynamic>.of(raw);
    next[key] = value;
    return CalculateInput(next);
  }

  T? get<T>(String key) => raw[key] as T?;
  String get customer => raw['customer'] as String? ?? '';
  String get productName => raw['productName'] as String? ?? '';
  String get productType => raw['productType'] as String? ?? 'tui';
  num get quantity => (raw['quantity'] as num?) ?? 0;
}

/// Result wrapper — read-only access vào các field thường dùng.
class CalculateResult {
  final Map<String, dynamic> raw;
  const CalculateResult(this.raw);

  factory CalculateResult.fromJson(Map<String, dynamic> j) => CalculateResult(j);

  double d(String key) => (raw[key] as num?)?.toDouble() ?? 0;
  String s(String key) => raw[key] as String? ?? '';

  double get finalPrice => d('finalPrice');
  double get costPerUnit => d('costPerUnit');
  double get revenue => d('revenue');
  double get totalArea => d('totalArea');
  double get totalProductionCost => d('totalProductionCost');
  double get profitAmount => d('profitAmount');
  double get profitRate => d('profitRate');
  double get cylinderCost => d('cylinderCost');
  String get structureText => s('structureText');
}

/// History item — giống HistoryItem trong types.ts (rút gọn cho mobile).
class HistoryItem {
  final String id;
  final String date; // ISO
  final String customer;
  final String productName;
  final String structure;
  final num quantity;
  final num finalPrice;
  final num? chotGia;
  final String? quoteStatus;
  final Map<String, dynamic> input;

  const HistoryItem({
    required this.id,
    required this.date,
    required this.customer,
    required this.productName,
    required this.structure,
    required this.quantity,
    required this.finalPrice,
    this.chotGia,
    this.quoteStatus,
    required this.input,
  });

  factory HistoryItem.fromJson(Map<String, dynamic> j) => HistoryItem(
        id: j['id'] as String,
        date: j['date'] as String,
        customer: j['customer'] as String? ?? '',
        productName: j['productName'] as String? ?? '',
        structure: j['structure'] as String? ?? '',
        quantity: (j['quantity'] as num?) ?? 0,
        finalPrice: (j['finalPrice'] as num?) ?? 0,
        chotGia: j['chotGia'] as num?,
        quoteStatus: j['quoteStatus'] as String?,
        input: (j['input'] as Map?)?.cast<String, dynamic>() ?? {},
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date,
        'customer': customer,
        'productName': productName,
        'structure': structure,
        'quantity': quantity,
        'finalPrice': finalPrice,
        if (chotGia != null) 'chotGia': chotGia,
        if (quoteStatus != null) 'quoteStatus': quoteStatus,
        'input': input,
      };
}

/// Production order (LSX) — giống ProductionOrder trong types.ts.
class ProductionOrder {
  final String id;
  final String quoteId;
  final String createdAt;
  final String status;
  final Map<String, dynamic> manual;
  final Map<String, dynamic> snapshot;

  const ProductionOrder({
    required this.id,
    required this.quoteId,
    required this.createdAt,
    required this.status,
    required this.manual,
    required this.snapshot,
  });

  factory ProductionOrder.fromJson(Map<String, dynamic> j) => ProductionOrder(
        id: j['id'] as String,
        quoteId: j['quoteId'] as String? ?? '',
        createdAt: j['createdAt'] as String? ?? '',
        status: j['status'] as String? ?? 'created',
        manual: (j['manual'] as Map?)?.cast<String, dynamic>() ?? {},
        snapshot: (j['snapshot'] as Map?)?.cast<String, dynamic>() ?? {},
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'quoteId': quoteId,
        'createdAt': createdAt,
        'status': status,
        'manual': manual,
        'snapshot': snapshot,
      };

  ProductionOrder copyWith({String? status, Map<String, dynamic>? manual}) =>
      ProductionOrder(
        id: id,
        quoteId: quoteId,
        createdAt: createdAt,
        status: status ?? this.status,
        manual: manual ?? this.manual,
        snapshot: snapshot,
      );
}
