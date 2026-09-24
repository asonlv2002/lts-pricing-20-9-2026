// ═══════════════════════════════════════════════════════════════════════════
// nhat_ky_loc — Hằng số + helper lọc/nhóm cho màn Nhật ký thao tác.
//
// Mirror các hằng và hàm thuần của web:
//   - TIME_RANGE_LABELS / getTimeRangeBounds  (ModuleNhatKy.tsx:162)
//   - groupByDate                             (ModuleNhatKy.tsx:150)
//   - TARGET_TYPE_LABELS                      (ModuleNhatKy.tsx:102)
//   - ACTION_LABELS (bản timeline)            (ModuleNhatKy.tsx:45)
//   - DATA_CHANGE_ACTIONS / STATUS_CHANGE_ACTIONS (ModuleNhatKy.tsx:112)
//   - HIDDEN_DIFF_KEYS / MANAGER_DIFF_KEYS    (ModuleNhatKy.tsx:253)
//   - CUSTOMER_DATA_FIELDS                    (ModuleKhachHang.tsx:1021)
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import '../api/service_lts_client.dart';
import 'audit_models.dart';

// ── Khoảng thời gian ──────────────────────────────────────────────────────
enum KhoangThoiGian { today, days7, days30, month, custom }

const Map<KhoangThoiGian, String> NHAN_KHOANG_THOI_GIAN = {
  KhoangThoiGian.today: 'Hôm nay',
  KhoangThoiGian.days7: '7 ngày qua',
  KhoangThoiGian.days30: '30 ngày qua',
  KhoangThoiGian.month: 'Tháng này',
  KhoangThoiGian.custom: 'Tùy chỉnh',
};

/// Biên thời gian [start, end] theo khoảng đã chọn (mirror `getTimeRangeBounds`).
({DateTime start, DateTime end}) bienKhoangThoiGian(
  KhoangThoiGian range, {
  String? customFrom,
  String? customTo,
}) {
  final now = DateTime.now();
  final end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
  DateTime start;
  switch (range) {
    case KhoangThoiGian.today:
      start = DateTime(now.year, now.month, now.day);
    case KhoangThoiGian.days7:
      final d = now.subtract(const Duration(days: 6));
      start = DateTime(d.year, d.month, d.day);
    case KhoangThoiGian.days30:
      final d = now.subtract(const Duration(days: 29));
      start = DateTime(d.year, d.month, d.day);
    case KhoangThoiGian.month:
      start = DateTime(now.year, now.month, 1);
    case KhoangThoiGian.custom:
      final s = customFrom != null && customFrom.isNotEmpty
          ? (DateTime.tryParse(customFrom) ??
              DateTime.fromMillisecondsSinceEpoch(0))
          : DateTime.fromMillisecondsSinceEpoch(0);
      final e = customTo != null && customTo.isNotEmpty
          ? (DateTime.tryParse(customTo) ?? end)
          : end;
      return (
        start: DateTime(s.year, s.month, s.day),
        end: DateTime(e.year, e.month, e.day, 23, 59, 59, 999),
      );
  }
  return (start: start, end: end);
}

/// Nhóm entry theo ngày (mirror `groupByDate`) — key = yyyy-MM-dd (local).
List<({String dayKey, List<AuditEntry> items})> nhomTheoNgay(
  List<AuditEntry> entries,
) {
  final map = <String, List<AuditEntry>>{};
  final order = <String>[];
  for (final e in entries) {
    final dt = DateTime.tryParse(e.timestamp)?.toLocal();
    final key = dt == null
        ? e.timestamp
        : '${dt.year.toString().padLeft(4, '0')}-'
            '${dt.month.toString().padLeft(2, '0')}-'
            '${dt.day.toString().padLeft(2, '0')}';
    if (!map.containsKey(key)) {
      map[key] = [];
      order.add(key);
    }
    map[key]!.add(e);
  }
  return order.map((k) => (dayKey: k, items: map[k]!)).toList();
}

// ── Nhãn ──────────────────────────────────────────────────────────────────
const Map<TargetType, String> NHAN_TARGET_TYPE = {
  TargetType.history: 'Bảng tính giá',
  TargetType.quote: 'Báo giá thương mại',
  TargetType.customer: 'Hồ sơ Khách hàng',
  TargetType.order: 'Đơn hàng & Lệnh sản xuất (LSX)',
  TargetType.config: 'Cấu hình tính giá (Vật tư, Hao hụt...)',
  TargetType.permission: 'Phân quyền hệ thống',
};

/// Nhãn action bản timeline (mirror `ACTION_LABELS` của ModuleNhatKy.tsx).
const Map<AuditAction, String> NHAN_ACTION_TIMELINE = {
  AuditAction.create: 'Tạo mới',
  AuditAction.update: 'Chỉnh sửa',
  AuditAction.delete: 'Xóa',
  AuditAction.lock: 'Khóa dữ liệu',
  AuditAction.unlock: 'Mở khóa dữ liệu',
  AuditAction.statusChange: 'Đổi trạng thái',
  AuditAction.overrideChange: 'Thay đổi override',
  AuditAction.assign: 'Phân công',
  AuditAction.versionRestore: 'Khôi phục',
  AuditAction.duplicate: 'Sao chép',
  AuditAction.sendApproval: 'Gửi duyệt',
  AuditAction.approve: 'Duyệt',
  AuditAction.reject: 'Từ chối',
  AuditAction.sendCustomer: 'Gửi khách hàng',
  AuditAction.createLsx: 'Tạo LSX',
  AuditAction.restore: 'Khôi phục',
};

// ── Nhóm hành động (filter) ───────────────────────────────────────────────
const List<AuditAction> DATA_CHANGE_ACTIONS = [
  AuditAction.create,
  AuditAction.update,
  AuditAction.delete,
];

const List<AuditAction> STATUS_CHANGE_ACTIONS = [
  AuditAction.statusChange,
  AuditAction.sendApproval,
  AuditAction.approve,
  AuditAction.reject,
  AuditAction.sendCustomer,
  AuditAction.lock,
  AuditAction.unlock,
  AuditAction.restore,
  AuditAction.createLsx,
];

// ── Key ẩn khi vẽ diff ────────────────────────────────────────────────────
const Set<String> HIDDEN_DIFF_KEYS = {
  'isLocked',
  'customerId',
  'quotationId',
  'managerIds',
  'inputValue',
  'saleResult',
  'masterResult',
  'pricingSheetId',
  'pricingSheetIds',
};

const Set<String> MANAGER_DIFF_KEYS = {
  'managerIds',
  'managerNames',
  'managers',
};

// ── Trường thay đổi của khách hàng (filter) ───────────────────────────────
const List<({String value, String label})> CUSTOMER_DATA_FIELDS = [
  (value: 'companyName', label: 'Tên khách hàng / Tên công ty'),
  (value: 'taxCode', label: 'Mã số thuế (MST)'),
  (value: 'invoiceAddress', label: 'Địa chỉ xuất hóa đơn'),
  (value: 'contactName', label: 'Người liên hệ trực tiếp'),
  (value: 'phone', label: 'Số điện thoại liên hệ'),
  (value: 'email', label: 'Email chính'),
  (value: 'address', label: 'Địa chỉ giao hàng'),
  (value: 'customerCode', label: 'Mã khách hàng'),
  (value: 'sellerId', label: 'Nhân viên Sale phụ trách'),
  (value: 'crmStatus', label: 'Tag trạng thái'),
  (value: 'isLocked', label: 'Trạng thái khóa'),
  (value: 'notes', label: 'Ghi chú (Note)'),
];

// ── Nhãn bản ghi cho target (mirror web `layNhanBaoGiaChoLog`) ─────────────
String _sach(String? v) => (v ?? '').trim();

String _maBaoGiaTuInput(BaoGiaApi bg) {
  final iv = bg.inputValue;
  final v = iv?['quoteCode'];
  return v?.toString() ?? '';
}

String ghepNhanBaoGia(String? ten, String? ma) {
  final tenSach = _sach(ten);
  final maSach = _sach(ma);
  if (tenSach.isNotEmpty && maSach.isNotEmpty) return '$tenSach ($maSach)';
  if (tenSach.isNotEmpty) return tenSach;
  if (maSach.isNotEmpty) return maSach;
  return '';
}

/// Nhãn "Tên khách hàng (mã báo giá)" cho log quotation.
String nhanBaoGiaChoLog(BaoGiaApi bg) {
  final sheet = bg.pricingSheets.isNotEmpty ? bg.pricingSheets.first : null;
  final input = sheet?.inputValue ?? const <String, dynamic>{};
  final ten = _sach(input['customer']?.toString()).isNotEmpty
      ? _sach(input['customer']?.toString())
      : _sach(sheet?.customerCodeName).isNotEmpty
          ? _sach(sheet?.customerCodeName)
          : _sach(sheet?.customerName);
  final ma = _maBaoGiaTuInput(bg);
  return ghepNhanBaoGia(ten, ma);
}

/// Tên khách hàng hiển thị trên card báo giá (mirror `layTenKhachHangCuaBaoGia`).
String tenKhachHangCuaBaoGia(BaoGiaApi bg) {
  final sheet = bg.pricingSheets.isNotEmpty ? bg.pricingSheets.first : null;
  final input = sheet?.inputValue ?? const <String, dynamic>{};
  final tuInput = _sach(input['customer']?.toString());
  if (tuInput.isNotEmpty) return tuInput;
  final code = _sach(sheet?.customerCodeName);
  if (code.isNotEmpty) return code;
  return _sach(sheet?.customerName);
}
