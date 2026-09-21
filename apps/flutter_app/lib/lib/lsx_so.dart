// ═══════════════════════════════════════════════════════════════════════════
// lsx_so — Sinh số LSX / mã báo giá từ dữ liệu server (versionByMonth).
//
// BE commit b6028b0: QuotationPricingSheetOrder.versionByMonth — STT cấp theo
// tháng UTC của created_at. FE tự map YYMM từ createdAt theo giờ VN (UTC+7).
//
// Mirror của packages/bang-tinh-gia/src/lsx-so.ts (web). Đổi rule phải sync
// cả 2 chỗ.
// ═══════════════════════════════════════════════════════════════════════════

/// Dữ liệu tối thiểu của 1 order (LSX) để derive số.
class OrderCoPhienBan {
  final String createdAt;
  final int versionByMonth;
  const OrderCoPhienBan({required this.createdAt, required this.versionByMonth});

  factory OrderCoPhienBan.fromMap(dynamic map) {
    final m = map is Map ? map : const <String, dynamic>{};
    return OrderCoPhienBan(
      createdAt: (m['createdAt'] as String?) ?? '',
      versionByMonth: (m['versionByMonth'] as num?)?.toInt() ?? 0,
    );
  }
}

/// YYMM theo giờ máy (VN UTC+7) từ chuỗi ISO. Vd 21/09/2026 → "2609". Lỗi → "".
String yymmLocal(String createdAt) {
  if (createdAt.isEmpty) return '';
  final d = DateTime.tryParse(createdAt);
  if (d == null) return '';
  final yy = (d.year % 100).toString().padLeft(2, '0');
  final mm = d.month.toString().padLeft(2, '0');
  return '$yy$mm';
}

/// STT pad tối thiểu 2 chữ số (2607.01); từ 100 trở lên in nguyên.
String _padStt(int versionByMonth) {
  final so = versionByMonth > 0 ? versionByMonth : 0;
  return so < 100 ? so.toString().padLeft(2, '0') : so.toString();
}

/// Số LSX dạng YYMM.STT derive từ order server (vd "2609.05").
/// Trả "" nếu createdAt không parse được hoặc versionByMonth <= 0 (UI fallback orderId).
String soLsxTuOrder(OrderCoPhienBan? order) {
  if (order == null) return '';
  if (order.versionByMonth <= 0) return '';
  final yymm = yymmLocal(order.createdAt);
  if (yymm.isEmpty) return '';
  return '$yymm.${_padStt(order.versionByMonth)}';
}

/// Số LSX derive từ bản ghi order thô (Map json server).
String soLsxTuOrderMap(dynamic orderMap) =>
    soLsxTuOrder(OrderCoPhienBan.fromMap(orderMap));

/// Mã báo giá YYMM.STT derive từ createdAt của BG + versionByMonth order
/// ĐẦU TIÊN (createdAt sớm nhất). BG chưa có order nào → "".
String quoteCodeTuBaoGia(String bgCreatedAt, List<OrderCoPhienBan>? orders) {
  if (bgCreatedAt.isEmpty || orders == null || orders.isEmpty) return '';
  final sorted = [...orders]..sort((a, b) {
      final ta = DateTime.tryParse(a.createdAt)?.millisecondsSinceEpoch ?? 0;
      final tb = DateTime.tryParse(b.createdAt)?.millisecondsSinceEpoch ?? 0;
      return ta.compareTo(tb);
    });
  final yymm = yymmLocal(bgCreatedAt);
  if (yymm.isEmpty) return '';
  return '$yymm.${_padStt(sorted.first.versionByMonth)}';
}
