// ═══════════════════════════════════════════════════════════════════════════
// audit_format — Format/đối chiếu nhật ký (mirror customer-audit-format.ts
// + phần FIELD_LABELS/DiffView của ModuleNhatKy.tsx + dedupeAuditEntries của
// ModuleKhachHang.tsx).
//
// Gồm: nhãn trường, nhãn action, format giá trị hiển thị, tóm tắt entry
// (dùng cho scope Khách hàng), và diff danh sách người phụ trách.
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import 'audit_models.dart';

// ── FIELD_LABELS (mirror customer-audit-format.ts:41) ──────────────────────
const Map<String, String> FIELD_LABELS = {
  'companyName': 'Tên khách hàng',
  'taxCode': 'Mã số thuế',
  'invoiceAddress': 'Địa chỉ xuất hóa đơn',
  'contactName': 'Người liên hệ',
  'phone': 'Số điện thoại',
  'email': 'Email',
  'address': 'Địa chỉ giao hàng',
  'customerCode': 'Mã khách hàng',
  'managers': 'Người phụ trách',
  'managerNames': 'Người phụ trách',
  'sellerId': 'Người phụ trách cũ',
  'secondarySellerId': 'Người phụ trách phụ cũ',
  'crmStatus': 'Trạng thái CRM',
  'status': 'Trạng thái sử dụng',
  'isLocked': 'Trạng thái khóa',
  'notes': 'Ghi chú',
  'assignmentNote': 'Ghi chú phân công',
  'contactNotes': 'Ghi chú liên hệ',
  'finalPrice': 'Giá cuối cùng',
  'input': 'Dữ liệu đầu vào',
  'saleResult': 'Kết quả sale',
  'masterResult': 'Kết quả quản trị',
  'pricingSheetName': 'Tên bảng tính giá',
  'quoteStatus': 'Trạng thái báo giá',
  'quotationId': 'Mã báo giá',
  'quoteCode': 'Mã báo giá',
  'quoteProducts': 'Danh sách sản phẩm báo giá',
  'chotGia': 'Giá chốt',
  'currentChotGia': 'Giá chốt',
  'phanBoCongTy': 'Phân bổ Công ty',
  'donViPhanBo': 'Đơn vị phân bổ',
  'terms': 'Điều khoản báo giá',
  'tiers': 'Các mốc số lượng',
  'products': 'Số sản phẩm',
  'sellerName': 'Người phụ trách',
  'productName': 'Tên sản phẩm',
  'quantity': 'Số lượng',
  'customer': 'Khách hàng',
  'customerCodeName': 'Mã khách hàng',
  'quoteId': 'Mã báo giá gốc',
  'inputValue': 'Dữ liệu đầu vào',
  'saleOverrides': 'Ghi đè sale',
  'adminOverrides': 'Ghi đè quản trị',
  // Field bổ sung dùng bởi ModuleNhatKy FIELD_LABELS
  'phoneNumber': 'Số điện thoại',
  'organizationName': 'Tên tổ chức',
  'codeName': 'Mã khách hàng',
  'description': 'Mô tả',
  'updateStatus': 'Trạng thái cập nhật',
  'note': 'Ghi chú',
  'managerIds': 'Nhân viên phụ trách',
  'region': 'Khu vực',
  'customerGroup': 'Nhóm KH',
  'roleCode': 'Mã vai trò',
  'roleName': 'Tên vai trò',
  'account': 'Tài khoản',
  'fullName': 'Họ tên',
  'isActive': 'Trạng thái tài khoản',
  'policies': 'Danh sách quyền',
  'policiesAdded': 'Quyền được cấp',
  'policiesRemoved': 'Quyền bị thu hồi',
  'lsxNumber': 'Số LSX',
  'issuedDate': 'Ngày xuống LSX',
  'deliveryDate': 'Ngày giao hàng',
  'preparedBy': 'Người lập',
  'approvedBy': 'Người duyệt',
  'scope': 'Phạm vi cấu hình',
  'name': 'Tên phiên bản',
  'effectiveMode': 'Kiểu hiệu lực',
  'effectiveFrom': 'Hiệu lực từ',
  'materialId': 'Mã vật tư',
  'materialName': 'Tên vật tư',
  'pricePerKg': 'Giá/kg',
  'thickness': 'Độ dày',
  'days': 'Số ngày',
  'threshold': 'Ngưỡng',
  'numColors': 'Số màu',
  'value': 'Giá trị',
  'key': 'Mã',
  'count': 'Số lượng',
};

const Map<AuditAction, String> ACTION_LABELS = {
  AuditAction.create: 'Tạo mới',
  AuditAction.update: 'Cập nhật',
  AuditAction.delete: 'Xóa',
  AuditAction.lock: 'Khóa',
  AuditAction.unlock: 'Mở khóa',
  AuditAction.statusChange: 'Đổi trạng thái',
  AuditAction.overrideChange: 'Thay đổi override',
  AuditAction.assign: 'Phân công',
  AuditAction.versionRestore: 'Khôi phục phiên bản',
  AuditAction.duplicate: 'Sao chép',
  AuditAction.sendApproval: 'Gửi duyệt',
  AuditAction.approve: 'Duyệt',
  AuditAction.reject: 'Từ chối',
  AuditAction.sendCustomer: 'Gửi khách hàng',
  AuditAction.createLsx: 'Tạo LSX',
  AuditAction.restore: 'Khôi phục',
};

const Map<String, String> CRM_STATUS_LABELS = {
  'lead': 'Mới',
  'negotiating': 'Đang tương tác',
  'active': 'Đang hoạt động',
  'paused': 'Tạm ngưng',
  'inactive': 'Ngừng hợp tác',
};

const Map<String, String> STATUS_LABELS = {
  'active': 'Đang sử dụng',
  'inactive': 'Ngừng sử dụng',
};

const Map<String, String> QUOTE_STATUS_LABELS = {
  'drafted': 'Đang nháp',
  'pending_approval': 'Chờ duyệt',
  'approved': 'Đã duyệt',
  'sent': 'Đã gửi khách',
  'rejected': 'Bị từ chối',
  'cancelled': 'Đã hủy',
  'completed': 'Đã chốt đơn SX',
  'expired': 'Hết hạn',
};

const Map<String, String> UPDATE_STATUS_LABELS = {
  'draft': 'Nháp',
  'drafted': 'Khởi tạo',
  'submitted': 'Chờ duyệt',
  'approved': 'Đã duyệt',
  'rejected': 'Bị từ chối',
};

const Map<String, String> LSX_STATUS_LABELS = {
  'created': 'Mới tạo',
  'in_production': 'Đang SX',
  'completed': 'Hoàn thành',
  'cancelled': 'Đã hủy',
};

const Map<String, String> INPUT_VALUE_LABELS = {
  'manIn': 'Màng in',
  'vnd': 'VNĐ',
  'percent': '%',
};

const List<String> IMPORTANT_CREATE_FIELDS = [
  'customerCode',
  'companyName',
  'contactName',
  'phone',
  'email',
];

/// Catalog policy code → tên tiếng Việt (mirror `POLICY_CATALOG` của web
/// service-lts.ts). Dùng để hiển thị "Danh sách quyền" dạng tên thay vì mã.
const Map<String, String> POLICY_LABELS = {
  'ACCOUNT_MANAGER': 'Quản lý tài khoản',
  'ROLE_MANAGER': 'Quản lý vai trò',
  'CUSTOMER_MANAGER': 'Quản lý người phụ trách khách hàng',
  'USER_POLICY_GRANT': 'Cấp quyền cho user',
  'USER_POLICY_REVOKE': 'Thu hồi quyền user',
  'QUOTATION_REVIEWER': 'Duyệt báo giá',
  'ORDER_REVIEWER': 'Duyệt đơn sản xuất',
  'PRODUCT_MANAGER': 'Quản lý sản phẩm (legacy)',
  'PRICING_SHEET_ADVISOR': 'Cố vấn bảng tính giá',
  'PRICE_CONFIG_MANAGER': 'Quản lý cấu hình tính giá',
  'ACTIVITY_MONITOR': 'Xem nhật ký thao tác toàn hệ thống',
  'SYSTEM_MONITOR': 'Quản lý tài nguyên hệ thống',
  'CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME': 'Sửa CPSX - Giá điện theo khung giờ',
  'CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE': 'Sửa CPSX - Điện/phút mỗi máy',
  'CPSX_UPGRADE_EDIT_LABOR_PRINT': 'Sửa CPSX - Lương CN máy in',
  'CPSX_UPGRADE_EDIT_LABOR_LAMINATE': 'Sửa CPSX - Lương CN máy ghép',
  'CPSX_UPGRADE_EDIT_LABOR_SLIT': 'Sửa CPSX - Lương CN máy chia',
  'CPSX_UPGRADE_EDIT_LABOR_BAG': 'Sửa CPSX - Lương CN máy làm túi',
  'CPSX_UPGRADE_EDIT_INK_OPP': 'Sửa CPSX - Bảng giá mực in OPP',
  'CPSX_UPGRADE_EDIT_INK_PET': 'Sửa CPSX - Bảng giá mực in PET',
  'CPSX_UPGRADE_EDIT_INK_PE': 'Sửa CPSX - Bảng giá mực in PE',
  'CPSX_UPGRADE_EDIT_SOLVENT': 'Sửa CPSX - Bảng giá dung môi',
  'CPSX_UPGRADE_EDIT_ADHESIVE': 'Sửa CPSX - Bảng giá keo ghép',
  'CPSX_UPGRADE_EDIT_INK_RATE': 'Sửa CPSX - Định mức mực in + DM in',
  'CPSX_UPGRADE_EDIT_ADHESIVE_RATE': 'Sửa CPSX - Định mức keo + DM ghép',
  'CPSX_UPGRADE_EDIT_TIME_PRINT': 'Sửa CPSX - Thời gian SX máy in',
  'CPSX_UPGRADE_EDIT_TIME_LAMINATE': 'Sửa CPSX - Thời gian SX máy ghép',
  'CPSX_UPGRADE_EDIT_TIME_SLIT': 'Sửa CPSX - Thời gian SX máy chia',
  'CPSX_UPGRADE_EDIT_TIME_BAG': 'Sửa CPSX - Thời gian SX máy làm túi',
  'CPSX_UPGRADE_REVIEW_ELECTRIC_TIME_FRAME':
      'Xem CPSX - Giá điện theo khung giờ',
  'CPSX_UPGRADE_REVIEW_ELECTRIC_PER_MINUTE': 'Xem CPSX - Điện/phút mỗi máy',
  'CPSX_UPGRADE_REVIEW_LABOR_PRINT': 'Xem CPSX - Lương CN máy in',
  'CPSX_UPGRADE_REVIEW_LABOR_LAMINATE': 'Xem CPSX - Lương CN máy ghép',
  'CPSX_UPGRADE_REVIEW_LABOR_SLIT': 'Xem CPSX - Lương CN máy chia',
  'CPSX_UPGRADE_REVIEW_LABOR_BAG': 'Xem CPSX - Lương CN máy làm túi',
  'CPSX_UPGRADE_REVIEW_INK_OPP': 'Xem CPSX - Bảng giá mực in OPP',
  'CPSX_UPGRADE_REVIEW_INK_PET': 'Xem CPSX - Bảng giá mực in PET',
  'CPSX_UPGRADE_REVIEW_INK_PE': 'Xem CPSX - Bảng giá mực in PE',
  'CPSX_UPGRADE_REVIEW_SOLVENT': 'Xem CPSX - Bảng giá dung môi',
  'CPSX_UPGRADE_REVIEW_ADHESIVE': 'Xem CPSX - Bảng giá keo ghép',
  'CPSX_UPGRADE_REVIEW_INK_RATE': 'Xem CPSX - Định mức mực in + DM in',
  'CPSX_UPGRADE_REVIEW_ADHESIVE_RATE': 'Xem CPSX - Định mức keo + DM ghép',
  'CPSX_UPGRADE_REVIEW_TIME_PRINT': 'Xem CPSX - Thời gian SX máy in',
  'CPSX_UPGRADE_REVIEW_TIME_LAMINATE': 'Xem CPSX - Thời gian SX máy ghép',
  'CPSX_UPGRADE_REVIEW_TIME_SLIT': 'Xem CPSX - Thời gian SX máy chia',
  'CPSX_UPGRADE_REVIEW_TIME_BAG': 'Xem CPSX - Thời gian SX máy làm túi',
};

// ── Kiểu dữ liệu cho summary (mirror AuditChangedField / AuditSummary) ─────
class AuditChangedField {
  final String key;
  final String label;
  final String before;
  final String after;
  final bool important;
  const AuditChangedField({
    required this.key,
    required this.label,
    required this.before,
    required this.after,
    required this.important,
  });
}

class AuditSummary {
  final String actionLabel;
  final String actorName;
  final String? actorAvatarUrl;
  final String targetName;
  final String description;
  final List<String> compactFields;
  final int changeCount;
  const AuditSummary({
    required this.actionLabel,
    required this.actorName,
    this.actorAvatarUrl,
    required this.targetName,
    required this.description,
    required this.compactFields,
    required this.changeCount,
  });
}

/// Context để resolve tên actor (mirror `AuditActorContext`).
class AuditActorContext {
  final ({String id, String? fullName, String? account})? currentUser;
  final List<({String id, String? name, String? fullName, String? account})>?
      users;
  const AuditActorContext({this.currentUser, this.users});
}

// ── Helpers ───────────────────────────────────────────────────────────────
String cleanAuditText(String value) => value;

String getAuditActionLabel(AuditAction action) =>
    ACTION_LABELS[action] ?? 'Thao tác';

String? getAuditFieldLabel(String fieldKey) => FIELD_LABELS[fieldKey];

String resolveAuditActorName(
  AuditEntry entry, [
  AuditActorContext context = const AuditActorContext(),
]) {
  final storedName = cleanAuditText(entry.userName).trim();
  final storedLooksLikeId = storedName.isEmpty || storedName == entry.userId;
  if (!storedLooksLikeId) return storedName;

  final currentUser = context.currentUser;
  if (currentUser != null && currentUser.id == entry.userId) {
    return cleanAuditText(
      currentUser.fullName ?? currentUser.account ?? entry.userId,
    );
  }

  final users = context.users;
  if (users != null) {
    for (final u in users) {
      if (u.id == entry.userId) {
        return cleanAuditText(
          u.name ?? u.fullName ?? u.account ?? entry.userId,
        );
      }
    }
  }

  return storedName.isNotEmpty ? storedName : entry.userId;
}

bool _isEmpty(dynamic value) =>
    value == null || (value is String && value.isEmpty);

String formatManagersAuditValue(dynamic value) {
  if (value is! List || value.isEmpty) return 'Chưa phân công';
  final names = value
      .map((manager) {
        if (manager == null) return '';
        if (manager is String) return cleanAuditText(manager).trim();
        if (manager is Map) {
          final name =
              '${manager['fullName'] ?? manager['account'] ?? manager['userId'] ?? ''}'
                  .trim();
          return name.isEmpty ? '' : cleanAuditText(name);
        }
        return cleanAuditText('$manager').trim();
      })
      .where((e) => e.isNotEmpty)
      .toList();
  return names.isNotEmpty
      ? names.join(', ')
      : '${value.length} người phụ trách';
}

String normalizeAuditValueKey(String value) => value.trim().toLowerCase();

String _formatAuditArrayValue(List value) {
  if (value.isEmpty) return '—';
  final names = value
      .map((item) {
        if (item == null) return '';
        if (item is String) return cleanAuditText(item).trim();
        if (item is Map) {
          final name =
              '${item['fullName'] ?? item['name'] ?? item['account'] ?? item['roleName'] ?? item['userId'] ?? ''}'
                  .trim();
          return name.isEmpty ? '' : cleanAuditText(name);
        }
        return cleanAuditText('$item').trim();
      })
      .where((e) => e.isNotEmpty)
      .toList();
  return names.isNotEmpty ? names.join(', ') : '${value.length} mục';
}

String _formatPolicyAuditValue(dynamic value) {
  if (value is! List || value.isEmpty) return '—';
  final labels = value
      .map((item) {
        if (item is! String) return cleanAuditText('$item');
        return POLICY_LABELS[item] ?? cleanAuditText(item);
      })
      .where((e) => e.isNotEmpty)
      .toList();
  return labels.isNotEmpty ? labels.join(', ') : '${value.length} quyền';
}

String _formatPricingInputAuditValue(dynamic value) {
  if (value is! Map) return '—';
  final input = value;
  final lines = <String>[];
  void push(String label, dynamic v) {
    if (v == null || (v is String && v.isEmpty)) return;
    if (v is num) {
      if (label.contains('Khổ') ||
          label.contains('Bước') ||
          label.contains('Chiều')) {
        lines.add(
          '$label: ${(v * 1000).round()} mm',
        );
      } else if (label == 'Số lượng') {
        lines.add('$label: ${v.round()}');
      } else if (label == 'Số màu') {
        lines.add('$label: ${v.round()}');
      } else {
        lines.add('$label: $v');
      }
      return;
    }
    if (v is String) {
      lines.add('$label: ${INPUT_VALUE_LABELS[v] ?? cleanAuditText(v)}');
    }
  }

  void pushMoney(String label, dynamic v) {
    if (v is! num) return;
    lines.add('$label: $v đ');
  }

  push('Sản phẩm', input['productName']);
  push('Số lượng', input['quantity']);
  pushMoney('Giá chốt', input['chotGia']);
  pushMoney('Phân bổ Công ty', input['phanBoCongTy']);
  push('Đơn vị phân bổ', input['donViPhanBo']);
  push('Khổ trải', input['spreadWidth']);
  push('Bước cắt', input['cutStep']);
  push('Số màu', input['numColors']);
  push('Lớp 1', input['layer1Id']);
  push('Lớp 2', input['layer2Id'] ?? input['layer2AltId']);
  push('Lớp 3', input['layer3Id']);
  push('Lớp 4', input['layer4Id']);
  push('Lớp 5', input['layer5Id']);
  push('Loại túi', input['bagType']);
  push('Loại màng', input['filmType']);

  return lines.isNotEmpty ? lines.join('\n') : '(thông tin chi tiết)';
}

String _formatQuoteTermsAuditValue(dynamic value) {
  if (value is! Map) return '—';
  final terms = value;
  final lines = <String>[];
  final vatRate = terms['vatRate'] is num
      ? terms['vatRate'] as num
      : terms['vatCustom'] is num
          ? terms['vatCustom'] as num
          : null;
  if (vatRate != null) lines.add('VAT: ${(vatRate * 100).round()}%');
  if (terms['validityDays'] is num) {
    lines.add('Hiệu lực: ${(terms['validityDays'] as num).round()} ngày');
  }
  final paymentTerms = terms['paymentTerms'];
  if (paymentTerms is String && paymentTerms.trim().isNotEmpty) {
    lines.add('Thanh toán: ${cleanAuditText(paymentTerms)}');
  }
  final deliveryTime = terms['deliveryTime'];
  if (deliveryTime is String && deliveryTime.trim().isNotEmpty) {
    lines.add('Giao hàng: ${cleanAuditText(deliveryTime)}');
  }
  final notes = terms['notes'];
  if (notes is String && notes.trim().isNotEmpty) {
    lines.add('Ghi chú: ${cleanAuditText(notes)}');
  }
  return lines.isNotEmpty ? lines.join('\n') : '(thông tin chi tiết)';
}

String _formatOverrideAuditValue(dynamic value) {
  if (value is! Map) return '—';
  final changes = <String>[];
  for (final e in value.entries) {
    final v = e.value;
    if (v == null || (v is String && v.isEmpty)) continue;
    changes.add('${FIELD_LABELS[e.key] ?? e.key}: $v');
  }
  if (changes.isEmpty) return '—';
  return changes.join('\n');
}

String formatAuditDisplayValue(String fieldKey, dynamic value) {
  if (_isEmpty(value)) return '—';
  if (fieldKey == 'donViPhanBo' && value is String) {
    return value == 'vnd'
        ? 'VNĐ'
        : value == 'percent'
            ? '%'
            : cleanAuditText(value);
  }
  if ((fieldKey == 'chotGia' ||
          fieldKey == 'currentChotGia' ||
          fieldKey == 'phanBoCongTy') &&
      value is num) {
    return '${value.round()} đ';
  }
  if (fieldKey == 'saleOverrides' || fieldKey == 'adminOverrides') {
    return _formatOverrideAuditValue(value);
  }
  if (fieldKey == 'input') return _formatPricingInputAuditValue(value);
  if (fieldKey == 'terms') return _formatQuoteTermsAuditValue(value);
  if (fieldKey == 'policies' ||
      fieldKey == 'policiesAdded' ||
      fieldKey == 'policiesRemoved') {
    return _formatPolicyAuditValue(value);
  }
  if (fieldKey == 'managers' || fieldKey == 'managerNames') {
    return formatManagersAuditValue(value);
  }
  if (fieldKey == 'isLocked') return value == true ? 'Đã khóa' : 'Chưa khóa';
  if (fieldKey == 'crmStatus' && value is String) {
    return CRM_STATUS_LABELS[value] ?? cleanAuditText(value);
  }
  if (fieldKey == 'quoteStatus' && value is String) {
    return QUOTE_STATUS_LABELS[normalizeAuditValueKey(value)] ??
        cleanAuditText(value);
  }
  if (fieldKey == 'updateStatus' && value is String) {
    return UPDATE_STATUS_LABELS[normalizeAuditValueKey(value)] ??
        cleanAuditText(value);
  }
  if (fieldKey == 'status' && value is String) {
    final normalized = normalizeAuditValueKey(value);
    return LSX_STATUS_LABELS[normalized] ??
        STATUS_LABELS[normalized] ??
        cleanAuditText(value);
  }
  if (value is bool) return value ? 'Có' : 'Không';
  if (value is String) return cleanAuditText(value);
  if (value is List) return _formatAuditArrayValue(value);
  if (value is Map) return '(thông tin chi tiết)';
  return cleanAuditText('$value');
}

// ── Changed fields / summary ──────────────────────────────────────────────
List<String> _changedKeys(AuditEntry entry) {
  final set = <String>{
    ...?entry.before?.keys,
    ...?entry.after?.keys,
  };
  return set.toList();
}

List<AuditChangedField> getAuditChangedFields(AuditEntry entry) {
  final out = <AuditChangedField>[];
  for (final key in _changedKeys(entry)) {
    final beforeValue = entry.before?[key];
    final afterValue = entry.after?[key];
    final label = getAuditFieldLabel(key);
    if (label == null) continue;
    final before = formatAuditDisplayValue(key, beforeValue);
    final after = formatAuditDisplayValue(key, afterValue);
    if (before == after) continue;
    if (before == '—' && after == '—') continue;
    out.add(AuditChangedField(
      key: key,
      label: label,
      before: before,
      after: after,
      important: IMPORTANT_CREATE_FIELDS.contains(key) ||
          key == 'managers' ||
          key == 'managerNames',
    ));
  }
  return out;
}

AuditSummary getAuditSummary(
  AuditEntry entry, [
  AuditActorContext context = const AuditActorContext(),
]) {
  final fields = getAuditChangedFields(entry);
  final actionLabel = getAuditActionLabel(entry.action);
  final actorName = resolveAuditActorName(entry, context);
  final targetName = cleanAuditText(entry.targetName ?? entry.targetId);

  if (entry.action == AuditAction.assign) {
    final diff = diffManagerLists(entry.before, entry.after);
    final parts = <String>[];
    if (diff.added.isNotEmpty) {
      parts.add(
        'Thêm: ${diff.added.map((n) => cleanAuditText(n)).join(', ')}',
      );
    }
    if (diff.removed.isNotEmpty) {
      parts.add(
        'Gỡ: ${diff.removed.map((n) => cleanAuditText(n)).join(', ')}',
      );
    }
    return AuditSummary(
      actionLabel: actionLabel,
      actorName: actorName,
      actorAvatarUrl: entry.userAvatarUrl,
      targetName: targetName,
      description: parts.isNotEmpty
          ? parts.join(' · ')
          : 'Không có thay đổi người phụ trách',
      compactFields: const [],
      changeCount: fields.length,
    );
  }

  if (entry.action == AuditAction.create) {
    final compactFields = IMPORTANT_CREATE_FIELDS
        .map((key) {
          for (final f in fields) {
            if (f.key == key) return '${f.label}: ${f.after}';
          }
          return null;
        })
        .whereType<String>()
        .toList();
    return AuditSummary(
      actionLabel: actionLabel,
      actorName: actorName,
      actorAvatarUrl: entry.userAvatarUrl,
      targetName: targetName,
      description: 'Tạo hồ sơ khách hàng $targetName',
      compactFields: compactFields,
      changeCount: fields.length,
    );
  }

  final fieldNames = fields.take(3).map((f) => f.label).join(', ');
  return AuditSummary(
    actionLabel: actionLabel,
    actorName: actorName,
    actorAvatarUrl: entry.userAvatarUrl,
    targetName: targetName,
    description: fields.isNotEmpty
        ? 'Cập nhật ${fields.length} thông tin${fieldNames.isNotEmpty ? ': $fieldNames' : ''}'
        : 'Không có thay đổi hiển thị',
    compactFields: const [],
    changeCount: fields.length,
  );
}

// ── Dedupe (mirror ModuleKhachHang.tsx:1043) ──────────────────────────────
String auditDuplicateKey(AuditEntry entry) => [
      entry.timestamp.length >= 16
          ? entry.timestamp.substring(0, 16)
          : entry.timestamp,
      entry.userId,
      entry.action.name,
      entry.targetType.name,
      entry.targetId,
      entry.targetName ?? '',
      entry.note ?? '',
      _jsonKey(entry.before),
      _jsonKey(entry.after),
    ].join('|');

String _jsonKey(Map<String, dynamic>? m) {
  if (m == null || m.isEmpty) return '{}';
  final keys = m.keys.toList()..sort();
  return keys.map((k) => '$k=${m[k]}').join('&');
}

List<AuditEntry> dedupeAuditEntries(List<AuditEntry> entries) {
  final seen = <String>{};
  final out = <AuditEntry>[];
  for (final entry in entries) {
    final key = auditDuplicateKey(entry);
    if (seen.contains(key)) continue;
    seen.add(key);
    out.add(entry);
  }
  return out;
}

// ── Manager list diff (mirror activity-log-mapper.ts:349) ─────────────────
class ManagerDiff {
  final List<String> added;
  final List<String> removed;
  const ManagerDiff({required this.added, required this.removed});
}

List<String> _extractManagerNames(Map<String, dynamic>? data) {
  if (data == null) return [];
  final names = data['managerNames'];
  if (names is List) {
    return names
        .map((n) => n is String ? cleanAuditText(n).trim() : '$n')
        .where((e) => e.isNotEmpty)
        .toList();
  }
  final mgrs = data['managers'];
  if (mgrs is List) {
    return mgrs
        .map((m) {
          if (m == null) return '';
          if (m is String) return cleanAuditText(m).trim();
          if (m is Map) {
            return cleanAuditText(
              '${m['fullName'] ?? m['account'] ?? m['userId'] ?? ''}',
            ).trim();
          }
          return '';
        })
        .where((e) => e.isNotEmpty)
        .toList();
  }
  final ids = data['managerIds'];
  if (ids is List) {
    return ids.map((id) => '$id').where((e) => e.isNotEmpty).toList();
  }
  return [];
}

ManagerDiff diffManagerLists(
  Map<String, dynamic>? before,
  Map<String, dynamic>? after,
) {
  final beforeNames = _extractManagerNames(before);
  final afterNames = _extractManagerNames(after);
  return ManagerDiff(
    added: afterNames.where((n) => !beforeNames.contains(n)).toList(),
    removed: beforeNames.where((n) => !afterNames.contains(n)).toList(),
  );
}
