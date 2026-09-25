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

class SmallWidthMaterialPrice {
  final String id;
  final String materialId;
  final double widthThresholdMm;
  final double? thickness;
  final double pricePerKg;
  final double? pricePerM2;

  const SmallWidthMaterialPrice({
    required this.id,
    required this.materialId,
    required this.widthThresholdMm,
    this.thickness,
    required this.pricePerKg,
    this.pricePerM2,
  });

  factory SmallWidthMaterialPrice.fromJson(Map<String, dynamic> j) =>
      SmallWidthMaterialPrice(
        id: j['id'] as String,
        materialId: j['materialId'] as String,
        widthThresholdMm: (j['widthThresholdMm'] as num).toDouble(),
        thickness: (j['thickness'] as num?)?.toDouble(),
        pricePerKg: (j['pricePerKg'] as num).toDouble(),
        pricePerM2: (j['pricePerM2'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'materialId': materialId,
        'widthThresholdMm': widthThresholdMm,
        if (thickness != null) 'thickness': thickness,
        'pricePerKg': pricePerKg,
        if (pricePerM2 != null) 'pricePerM2': pricePerM2,
      };

  SmallWidthMaterialPrice copyWith({
    double? widthThresholdMm,
    double? thickness,
    double? pricePerKg,
    double? pricePerM2,
  }) =>
      SmallWidthMaterialPrice(
        id: id,
        materialId: materialId,
        widthThresholdMm: widthThresholdMm ?? this.widthThresholdMm,
        thickness: thickness ?? this.thickness,
        pricePerKg: pricePerKg ?? this.pricePerKg,
        pricePerM2: pricePerM2 ?? this.pricePerM2,
      );
}

class ProfitRow {
  final double threshold;
  final double col1;
  final double col2;
  final double? largeCol1;
  final double? largeCol2;
  const ProfitRow({
    required this.threshold,
    required this.col1,
    required this.col2,
    this.largeCol1,
    this.largeCol2,
  });

  factory ProfitRow.fromJson(Map<String, dynamic> j) => ProfitRow(
        threshold: (j['threshold'] as num).toDouble(),
        col1: (j['col1'] as num).toDouble(),
        col2: (j['col2'] as num).toDouble(),
        largeCol1: (j['largeCol1'] as num?)?.toDouble(),
        largeCol2: (j['largeCol2'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'threshold': threshold,
        'col1': col1,
        'col2': col2,
        if (largeCol1 != null) 'largeCol1': largeCol1,
        if (largeCol2 != null) 'largeCol2': largeCol2,
      };
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

  /// Mirror `dauVaoMacDinh` của web (apps/web/src/store/helpers.ts:51).
  factory CalculateInput.defaults() => const CalculateInput({
        'customer': '',
        'productName': '',
        'productCode': '',
        'productType': '',
        'bagType': '',
        'filmType': '',
        'printFilmCustomerGroup': 'normal',
        'firstRun': false,
        'filmQuantityUnit': 'm2',
        'filmInputQuantity': 0,
        'filmRollLength': 6000,
        'quantity': 0,
        'numColors': null,
        'numImages': 1,
        'layer1Id': null,
        'layer2Id': null,
        'layer2AltId': null,
        'layer2Lengths': null,
        'layer2FrontPart': 'main',
        'layer2PairingMode': 'bottom_to_bottom',
        'layer3Id': null,
        'layer4Id': null,
        'layer5Id': null,
        'spreadWidth': 0.0,
        'cutStep': 0.0,
        'metallicSurcharge': 0,
        'coverageRatio': 1,
        'hasDivide': false,
        'originalWidthMm': 0,
        'divideWidthMm': 0,
        'divideElements': 1,
        'selectedPrintSurchargeKeys': <String>[],
        'hasNhu': false,
        'hasMo': false,
        'handleWeight': 0,
        'zipperWeight': 0,
        'tapeWeight': 0,
        'hasZipper': false,
        'hasTape': false,
        'hasHandle': false,
        'handleOptionKey': null,
        'paymentDays': 30,
        'profitColumn': 1,
        'commissionRate': 0,
        'commissionFixedVND': 0,
        'commissionUnit': 'percent',
        'commissionInputValue': 0,
        'bagsPerBox': 0,
        'boxPrice': 0,
        'boxWeight': 0,
        'boxOptionKey': null,
        'shippingPerKm': 0,
        'shippingKm': 0,
        'cylLength': 0,
        'cylCircum': 0,
        'cylUnitPrice': 7300000,
        'cylType': 'A',
        'cylIncluded': false,
        'targetThickness': 0,
        'autoOptimizeThickness': false, // tự động tối ưu độ dày
        'micOverrides': <String, dynamic>{},
        'multiStructureLayers': null,
        'pricingMode': 'internal',
        'outsource': null,
        // Tính giá Thương mại — chỉ dùng khi pricingMode='commercial'
        'commercialMode': 'form',
        'commercialPurchasePrice': 0,
        'commercialProfitValue': 0,
        'commercialProfitUnit': 'percent',
        'commercialDescription': '',
        'commercialUnitKind': 'tui',
        'commercialUnitLabel': '',
        'commercialExtraFee': 0,
        'commercialUnitWeight': 0,
      });

  factory CalculateInput.fromJson(Map<String, dynamic> j) => CalculateInput(Map.of(j));
  Map<String, dynamic> toJson() => raw;

  bool get autoOptimizeThickness => raw['autoOptimizeThickness'] as bool? ?? false;
  CalculateInput withAutoOptimizeThickness(bool v) => withField('autoOptimizeThickness', v);

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

  static const Map<String, String> _aliases = {
    'giaCuoiCung': 'finalPrice',
    'chiPhiDonVi': 'costPerUnit',
    'doanhThu': 'revenue',
    'tongDienTich': 'totalArea',
    'tongChiPhiSX': 'totalProductionCost',
    'tongChiPhiGhep': 'totalLamCost',
    'soTienLoiNhuan': 'profitAmount',
    'tyLeLoiNhuan': 'profitRate',
    'chiPhiTruc': 'cylinderCost',
    'chieuDaiTruc': 'cylLength',
    'chuViTruc': 'cylCircum',
    'chuoiCauTruc': 'structureText',
    'tongDoDay': 'totalThickness',
    'tongGSM': 'totalGSM',
    'dienTichTui': 'bagArea',
    'dienTichCuonMang': 'filmRollArea',
    'khoiLuongTare': 'tareWeight',
    'chieuDaiMang': 'filmLength',
    'laiSuatCoBan': 'interestBase',
    'laiSuatThem': 'interestSpread',
    'ngayThanhToan': 'paymentDays',
    'laiSuatPerDonVi': 'interestPerUnit',
    'hoaHongPerDonVi': 'commissionPerUnit',
    'chiPhiTrucPhanBo': 'cylAllocPerUnit',
    'chiPhiTrucPerDonVi': 'cylinderCostPerUnit',
    'dienTichTruc': 'cylArea',
    'soThuung': 'numBoxes',
    'phiDongGoiPerDonVi': 'packagingPerUnit',
    'cuocVanChuyenPerDonVi': 'shippingPerUnit',
    'tongCuocVanChuyen': 'shippingTotal',
    'thuungPerDonVi': 'boxPerUnit',
    'khoaPerDonVi': 'zipperPerUnit',
    'tongTienKhoa': 'zipperTotal',
    'bangKeoPerDonVi': 'tapePerUnit',
    'tongTienBangKeo': 'tapeTotal',
    'quaiXachPerDonVi': 'handlePerUnit',
    'tongTienQuaiXach': 'handleTotal',
    'tongChiPhiIn': 'printTotalCost',
    'tongChiPhiCat': 'cutTotalCost',
    'khoCatIn': 'printWidth',
    'khoCat': 'cutWidth',
    'metCat': 'cutMeters',
    'hatHaoCat': 'cutWaste',
    'cpSXCat': 'cutCPSX',
    'chiPhiSXCat': 'cutCostCPSX',
    'khoNLIn': 'printNLWidth',
    'metIn': 'printMeters',
    'hatHaoIn': 'printWaste',
    'cpSXIn': 'printCPSX',
    'chiPhiSXIn': 'printCostCPSX',
    'chiPhiVatLieuIn': 'printCostMaterial',
    'ngaySanXuat': 'productionDays',
    'productionDays': 'productionDays',
  };

  double d(String key) {
    final value = raw[key] ?? raw[_aliases[key]];
    return (value as num?)?.toDouble() ?? 0;
  }

  String s(String key) {
    final value = raw[key] ?? raw[_aliases[key]];
    return value as String? ?? '';
  }

  double get finalPrice => d('finalPrice');
  double get costPerUnit => d('costPerUnit');
  double get revenue => d('revenue');
  double get totalArea => d('totalArea');
  double get totalProductionCost => d('totalProductionCost');
  double get profitAmount => d('profitAmount');
  double get profitRate => d('profitRate');
  double get cylinderCost => d('cylinderCost');
  double get cylLength => d('cylLength');
  double get cylCircum => d('cylCircum');
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

  /// ID pricing sheet trên server (mirror web pricingSheetId).
  /// null = chưa sync (POST lần đầu); có giá trị = PATCH.
  final String? pricingSheetId;

  /// Config pin của sheet trên server (mirror web priceConfigIds) — quyết định
  /// useLatestPriceConfigs khi PATCH.
  final List<String> priceConfigIds;

  /// Bảng ghi đè Sale/Admin đã lưu (mirror web saleOverrides/adminOverrides).
  final Map<String, dynamic>? saleOverrides;
  final Map<String, dynamic>? adminOverrides;
  final double? saleProfitRatePct;
  final double? adminProfitRatePct;

  /// Pin CPSX nâng cao (4 key) lúc lưu — mirror web pinnedCpsxNangCao.
  final Map<String, dynamic>? pinnedCpsxNangCao;

  /// Cờ tab nâng cao (mirror web isNangCap).
  final bool? isNangCap;

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
    this.pricingSheetId,
    this.priceConfigIds = const [],
    this.saleOverrides,
    this.adminOverrides,
    this.saleProfitRatePct,
    this.adminProfitRatePct,
    this.pinnedCpsxNangCao,
    this.isNangCap,
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
        pricingSheetId: j['pricingSheetId'] as String?,
        priceConfigIds: ((j['priceConfigIds'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
        saleOverrides: (j['saleOverrides'] as Map?)?.cast<String, dynamic>(),
        adminOverrides: (j['adminOverrides'] as Map?)?.cast<String, dynamic>(),
        saleProfitRatePct: (j['saleProfitRatePct'] as num?)?.toDouble(),
        adminProfitRatePct: (j['adminProfitRatePct'] as num?)?.toDouble(),
        pinnedCpsxNangCao:
            (j['pinnedCpsxNangCao'] as Map?)?.cast<String, dynamic>(),
        isNangCap: j['isNangCap'] as bool?,
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
        if (pricingSheetId != null) 'pricingSheetId': pricingSheetId,
        if (priceConfigIds.isNotEmpty) 'priceConfigIds': priceConfigIds,
        if (saleOverrides != null) 'saleOverrides': saleOverrides,
        if (adminOverrides != null) 'adminOverrides': adminOverrides,
        if (saleProfitRatePct != null) 'saleProfitRatePct': saleProfitRatePct,
        if (adminProfitRatePct != null) 'adminProfitRatePct': adminProfitRatePct,
        if (pinnedCpsxNangCao != null) 'pinnedCpsxNangCao': pinnedCpsxNangCao,
        if (isNangCap != null) 'isNangCap': isNangCap,
      };

  HistoryItem copyWith({
    num? chotGia,
    String? pricingSheetId,
    List<String>? priceConfigIds,
    Map<String, dynamic>? saleOverrides,
    Map<String, dynamic>? adminOverrides,
    double? saleProfitRatePct,
    double? adminProfitRatePct,
    Map<String, dynamic>? pinnedCpsxNangCao,
    bool? isNangCap,
    Map<String, dynamic>? input,
    String? quoteStatus,
  }) =>
      HistoryItem(
        id: id,
        date: date,
        customer: customer,
        productName: productName,
        structure: structure,
        quantity: quantity,
        finalPrice: finalPrice,
        chotGia: chotGia ?? this.chotGia,
        quoteStatus: quoteStatus ?? this.quoteStatus,
        input: input ?? this.input,
        pricingSheetId: pricingSheetId ?? this.pricingSheetId,
        priceConfigIds: priceConfigIds ?? this.priceConfigIds,
        saleOverrides: saleOverrides ?? this.saleOverrides,
        adminOverrides: adminOverrides ?? this.adminOverrides,
        saleProfitRatePct: saleProfitRatePct ?? this.saleProfitRatePct,
        adminProfitRatePct: adminProfitRatePct ?? this.adminProfitRatePct,
        pinnedCpsxNangCao: pinnedCpsxNangCao ?? this.pinnedCpsxNangCao,
        isNangCap: isNangCap ?? this.isNangCap,
      );
}

/// Production order (LSX) — giống ProductionOrder trong types.ts.
/// Bổ sung trạng thái duyệt server (mirror web lsx-server-adapter.ts):
/// hasAdvisorApproved + reason + người lập (avatar là URL tương đối server).
class ProductionOrder {
  final String id;
  final String quoteId;
  final String createdAt;
  final String status;
  final Map<String, dynamic> manual;
  final Map<String, dynamic> snapshot;

  /// STT server cấp theo tháng (BE b6028b0) — dùng derive số LSX / mã báo giá.
  final int versionByMonth;

  /// Trạng thái duyệt advisor từ BE (null = cache cũ chưa có).
  final bool? hasAdvisorApproved;

  /// Lý do từ chối (hoặc ghi chú duyệt) từ BE.
  final String reason;

  /// Tên người lập LSX — inputValue.preparedBy → actorName.
  final String nguoiLap;

  /// Avatar URL tương đối người lập (resolve qua resolveServiceLtsUrl).
  final String? nguoiLapAvatar;

  const ProductionOrder({
    required this.id,
    required this.quoteId,
    required this.createdAt,
    required this.status,
    required this.manual,
    required this.snapshot,
    this.versionByMonth = 0,
    this.hasAdvisorApproved,
    this.reason = '',
    this.nguoiLap = '',
    this.nguoiLapAvatar,
  });

  factory ProductionOrder.fromJson(Map<String, dynamic> j) => ProductionOrder(
        id: j['id'] as String,
        quoteId: j['quoteId'] as String? ?? '',
        createdAt: j['createdAt'] as String? ?? '',
        status: j['status'] as String? ?? 'created',
        manual: (j['manual'] as Map?)?.cast<String, dynamic>() ?? {},
        snapshot: (j['snapshot'] as Map?)?.cast<String, dynamic>() ?? {},
        versionByMonth: (j['versionByMonth'] as num?)?.toInt() ?? 0,
        hasAdvisorApproved: j['hasAdvisorApproved'] as bool?,
        reason: j['reason'] as String? ?? '',
        nguoiLap: j['nguoiLap'] as String? ?? '',
        nguoiLapAvatar: j['nguoiLapAvatar'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'quoteId': quoteId,
        'createdAt': createdAt,
        'status': status,
        'manual': manual,
        'snapshot': snapshot,
        if (versionByMonth > 0) 'versionByMonth': versionByMonth,
        if (hasAdvisorApproved != null)
          'hasAdvisorApproved': hasAdvisorApproved,
        if (reason.isNotEmpty) 'reason': reason,
        if (nguoiLap.isNotEmpty) 'nguoiLap': nguoiLap,
        if (nguoiLapAvatar != null) 'nguoiLapAvatar': nguoiLapAvatar,
      };

  ProductionOrder copyWith(
          {String? status,
          Map<String, dynamic>? manual,
          bool? hasAdvisorApproved,
          String? reason,
          String? nguoiLap,
          String? nguoiLapAvatar}) =>
      ProductionOrder(
        id: id,
        quoteId: quoteId,
        createdAt: createdAt,
        status: status ?? this.status,
        manual: manual ?? this.manual,
        snapshot: snapshot,
        versionByMonth: versionByMonth,
        hasAdvisorApproved: hasAdvisorApproved ?? this.hasAdvisorApproved,
        reason: reason ?? this.reason,
        nguoiLap: nguoiLap ?? this.nguoiLap,
        nguoiLapAvatar: nguoiLapAvatar ?? this.nguoiLapAvatar,
      );

  /// Trạng thái hiển thị mirror web (deriveLsxStatus): 2 giá trị.
  /// hasAdvisorApproved=true → 'approved'; ngược lại → 'pending'.
  bool get laDaDuyet => hasAdvisorApproved == true;
}




