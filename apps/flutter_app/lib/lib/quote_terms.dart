// ═══════════════════════════════════════════════════════════════════════════
// quote_terms — port `QuoteTerms` (apps/web/src/lib/types.ts) + option lists
// dùng trong wizard báo giá (mirror ModuleBaoGia.tsx Bước xác nhận).
// ═══════════════════════════════════════════════════════════════════════════

/// Điều khoản báo giá (mirror QuoteTerms).
class QuoteTerms {
  final double vatRate; // % hàng hóa
  final double? vatCustom;
  final double vatCylinderRate; // % trục in
  final double validityDays;
  final String paymentTerms;
  final String deliveryTime;
  final String deliveryAddress;
  final String notes;
  final double quantityTolerance; // %
  final String techRequirement;

  const QuoteTerms({
    this.vatRate = 8,
    this.vatCustom,
    this.vatCylinderRate = 10,
    this.validityDays = 30,
    this.paymentTerms = 'Thanh toán 30 ngày',
    this.deliveryTime = '7-10 ngày làm việc',
    this.deliveryAddress = '',
    this.notes = '',
    this.quantityTolerance = 10,
    this.techRequirement = 'Chạy theo market ký duyệt',
  });

  QuoteTerms copyWith({
    double? vatRate,
    double? vatCustom,
    double? vatCylinderRate,
    double? validityDays,
    String? paymentTerms,
    String? deliveryTime,
    String? deliveryAddress,
    String? notes,
    double? quantityTolerance,
    String? techRequirement,
  }) =>
      QuoteTerms(
        vatRate: vatRate ?? this.vatRate,
        vatCustom: vatCustom ?? this.vatCustom,
        vatCylinderRate: vatCylinderRate ?? this.vatCylinderRate,
        validityDays: validityDays ?? this.validityDays,
        paymentTerms: paymentTerms ?? this.paymentTerms,
        deliveryTime: deliveryTime ?? this.deliveryTime,
        deliveryAddress: deliveryAddress ?? this.deliveryAddress,
        notes: notes ?? this.notes,
        quantityTolerance: quantityTolerance ?? this.quantityTolerance,
        techRequirement: techRequirement ?? this.techRequirement,
      );

  Map<String, dynamic> toJson() => {
        'vatRate': vatRate,
        if (vatCustom != null) 'vatCustom': vatCustom,
        'vatCylinderRate': vatCylinderRate,
        'validityDays': validityDays,
        'paymentTerms': paymentTerms,
        'deliveryTime': deliveryTime,
        'deliveryAddress': deliveryAddress,
        'notes': notes,
        'quantityTolerance': quantityTolerance,
        'techRequirement': techRequirement,
      };

  factory QuoteTerms.fromJson(Map<String, dynamic> j) => QuoteTerms(
        vatRate: (j['vatRate'] as num?)?.toDouble() ?? 8,
        vatCustom: (j['vatCustom'] as num?)?.toDouble(),
        vatCylinderRate: (j['vatCylinderRate'] as num?)?.toDouble() ?? 10,
        validityDays: (j['validityDays'] as num?)?.toDouble() ?? 30,
        paymentTerms: j['paymentTerms']?.toString() ?? 'Thanh toán 30 ngày',
        deliveryTime: j['deliveryTime']?.toString() ?? '7-10 ngày làm việc',
        deliveryAddress: j['deliveryAddress']?.toString() ?? '',
        notes: j['notes']?.toString() ?? '',
        quantityTolerance: (j['quantityTolerance'] as num?)?.toDouble() ?? 10,
        techRequirement:
            j['techRequirement']?.toString() ?? 'Chạy theo market ký duyệt',
      );
}

const List<String> vatOptions = ['0%', '5%', '7%', '8%', '10%'];

const List<String> hieuLucOptions = [
  '7 ngày',
  '14 ngày',
  '30 ngày',
  '60 ngày',
  '90 ngày',
  '180 ngày',
];

const List<String> thanhToanOptions = [
  'Thanh toán ngay khi nhận hàng',
  'Thanh toán trong vòng 15 ngày kể từ ngày nhận hàng',
  'Thanh toán trong vòng 30 ngày kể từ ngày nhận hàng',
  'Thanh toán trong vòng 45 ngày kể từ ngày nhận hàng',
  'Thanh toán trong vòng 60 ngày kể từ ngày nhận hàng',
  'Thanh toán trong vòng 90 ngày kể từ ngày nhận hàng',
];

const List<String> giaoHangOptions = [
  '3-5 ngày làm việc',
  '5-7 ngày làm việc',
  '7-10 ngày làm việc',
  '10-15 ngày làm việc',
  '15-20 ngày làm việc',
  '20-30 ngày làm việc',
];

const List<String> dungSaiOptions = ['5%', '7%', '8%', '10%', '15%'];

const List<String> yeuCauKyThuatOptions = ['Chạy theo market ký duyệt'];
