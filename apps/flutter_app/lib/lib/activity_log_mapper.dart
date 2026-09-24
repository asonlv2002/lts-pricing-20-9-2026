// ═══════════════════════════════════════════════════════════════════════════
// activity_log_mapper — HoatDongApi (BE /activity-logs) → AuditEntry.
// ignore_for_file: constant_identifier_names
//
// Mirror apps/web/src/lib/activity-log-mapper.ts. Các hằng map action/resource
// ở đây phải khớp backend ACTIVITY_LOG_ACTIONS
// (C:\UnityProject\service-lts\backend\src\activity-logs\activity-log-actions.ts).
//
// Khác web: web `ACTION_MAP` thiếu vài action BE thật sự phát
// (quotation.deleted, quotation.rejected_updated,
// quotation.customer_decisions_updated, quotation.pricing_sheet_orders_created,
// quotation.pricing_sheet_order_updated, role.created/updated/deleted) nên
// rơi vào fallback 'update'. Bản Dart map đủ để nhãn hiển thị đúng.
// ═══════════════════════════════════════════════════════════════════════════
import '../api/service_lts_client.dart';
import 'audit_format.dart';
import 'audit_models.dart';
import 'config_diff.dart';

// ── resourceType mapping ──────────────────────────────────────────────────
const Map<String, TargetType> RESOURCE_TYPE_MAP = {
  'customer': TargetType.customer,
  'pricing_sheet': TargetType.history,
  'quotation': TargetType.quote,
  'account': TargetType.permission,
  'role': TargetType.permission,
  'user_policy': TargetType.permission,
  'customer_manager': TargetType.customer,
  'price_config': TargetType.config,
};

TargetType chuyenResourceType(String? resourceType) =>
    RESOURCE_TYPE_MAP[resourceType] ?? TargetType.permission;

// ── action mapping ────────────────────────────────────────────────────────
const Map<String, AuditAction> ACTION_MAP = {
  'customer.created': AuditAction.create,
  'customer.version_created': AuditAction.update,
  'customer_manager.replaced': AuditAction.assign,
  'pricing_sheet.created': AuditAction.create,
  'pricing_sheet.deleted': AuditAction.delete,
  'pricing_sheet.advisor_result_updated': AuditAction.statusChange,
  'pricing_sheet.result_updated': AuditAction.update,
  'quotation.created': AuditAction.create,
  'quotation.submitted': AuditAction.sendApproval,
  'quotation.review_status_updated': AuditAction.approve,
  'quotation.deleted': AuditAction.delete,
  'quotation.rejected_updated': AuditAction.update,
  'quotation.customer_decisions_updated': AuditAction.statusChange,
  'quotation.pricing_sheet_orders_created': AuditAction.createLsx,
  'quotation.pricing_sheet_order_updated': AuditAction.update,
  'account.password_changed': AuditAction.update,
  'account.password_updated': AuditAction.update,
  'account.created': AuditAction.create,
  'account.activation_updated': AuditAction.statusChange,
  'role.created': AuditAction.create,
  'role.updated': AuditAction.update,
  'role.deleted': AuditAction.delete,
  'role.upserted': AuditAction.create,
  'user_policy.granted': AuditAction.assign,
  'user_policy.revoked': AuditAction.assign,
  'price_config.created': AuditAction.create,
  'price_config.updated': AuditAction.update,
  'price_config.deleted': AuditAction.delete,
  'price_config.policies_replaced': AuditAction.assign,
};

AuditAction chuyenAction(String serverAction) =>
    ACTION_MAP[serverAction] ?? AuditAction.update;

/// Phân biệt duyệt / từ chối BBG từ metadata của server log.
/// Server chỉ ghi 1 action `quotation.review_status_updated` — quyết định nằm
/// ở `currentVersion.updateStatus` (approved | rejected).
AuditAction phanTichActionReviewQuotation(HoatDongApi log) {
  if (log.action != 'quotation.review_status_updated') {
    return chuyenAction(log.action);
  }
  final currentVersion = log.metadata['currentVersion'];
  if (currentVersion is! Map) return AuditAction.approve;
  final updateStatus = currentVersion['updateStatus'];
  return updateStatus == 'rejected' ? AuditAction.reject : AuditAction.approve;
}

// ── metadata → before/after ───────────────────────────────────────────────
({Map<String, dynamic>? before, Map<String, dynamic>? after}) trichBeforeAfter(
  Map<String, dynamic>? metadata,
) {
  if (metadata == null) return (before: null, after: null);
  final previousVersion = metadata['previousVersion'];
  final currentVersion = metadata['currentVersion'];
  return (
    before:
        previousVersion is Map ? previousVersion.cast<String, dynamic>() : null,
    after:
        currentVersion is Map ? currentVersion.cast<String, dynamic>() : null,
  );
}

// ── targetName từ metadata ─────────────────────────────────────────────────
const Map<String, List<String>> TARGET_NAME_KEYS = {
  'customer': ['organizationName', 'codeName'],
  'pricing_sheet': ['pricingSheetName'],
  'quotation': ['description'],
  'account': ['account'],
  'role': ['roleName'],
};

String? trichTargetName(HoatDongApi log) {
  final raw = log.metadata['currentVersion'];
  if (raw is! Map) return null;
  final cur = raw.cast<String, dynamic>();
  final keys = TARGET_NAME_KEYS[log.resourceType];
  if (keys != null) {
    for (final key in keys) {
      final v = cur[key];
      if (v != null) return v.toString();
    }
  }
  return null;
}

// ── original (snapshot hiển thị từ backend) ────────────────────────────────
({String? actorName, String? actorAvatarUrl, String? customerName})
    trichOriginal(Map<String, dynamic>? metadata) {
  if (metadata == null)
    return (actorName: null, actorAvatarUrl: null, customerName: null);
  final original = metadata['original'];
  if (original is! Map) {
    return (actorName: null, actorAvatarUrl: null, customerName: null);
  }
  final src = original.cast<String, dynamic>();
  final actorName = src['actorName'];
  final actorAvatarUrl = src['actorAvatarUrl'];
  final customerName = src['customerName'];
  return (
    actorName: actorName is String && actorName.trim().isNotEmpty
        ? cleanAuditText(actorName).trim()
        : null,
    actorAvatarUrl: actorAvatarUrl is String && actorAvatarUrl.trim().isNotEmpty
        ? actorAvatarUrl.trim()
        : null,
    customerName: customerName is String && customerName.trim().isNotEmpty
        ? cleanAuditText(customerName).trim()
        : null,
  );
}

// ── price_config (Cấu hình tính giá) ───────────────────────────────────────
/// Log price_config: BE lưu `metadata.previousVersion` / `currentVersion` chứa
/// blob `inputValue` — flatten thành nhãn VN → giá trị (chỉ leaf khác nhau) và
/// gán vào before/after. `policies_replaced` có shape riêng (configPolicies).
/// Trả `note` khi diff rỗng để vẫn hiện được cho người dùng biết log hợp lệ
/// nhưng không trích xuất được thay đổi.
({
  String? targetName,
  Map<String, dynamic>? before,
  Map<String, dynamic>? after,
  String? note,
}) xuLyPriceConfig(HoatDongApi log) {
  final meta = log.metadata;
  final original =
      meta['original'] is Map ? (meta['original'] as Map) : const {};
  final configNameRaw = original['configName'];
  final configName = configNameRaw is String ? configNameRaw : '';
  final targetName =
      NHAN_CONFIG_NAME[configName] ?? (configName.isEmpty ? null : configName);

  if (log.action == 'price_config.policies_replaced') {
    Map<String, String> docDanhSach(dynamic v) {
      final ketQua = <String, String>{};
      if (v is! List) return ketQua;
      for (final dong in v) {
        if (dong is! Map) continue;
        final cn =
            dong['configName'] is String ? dong['configName'] as String : '';
        final policies = dong['policies'] is List
            ? (dong['policies'] as List).whereType<String>().toList()
            : const <String>[];
        ketQua['Phân quyền ${NHAN_CONFIG_NAME[cn] ?? cn}'] =
            policies.isNotEmpty ? policies.join(', ') : '(trống)';
      }
      return ketQua;
    }

    final prev = meta['previousVersion'] is Map
        ? (meta['previousVersion'] as Map).cast<String, dynamic>()
        : const <String, dynamic>{};
    final cur = meta['currentVersion'] is Map
        ? (meta['currentVersion'] as Map).cast<String, dynamic>()
        : const <String, dynamic>{};
    final prevPolicies = docDanhSach(prev['configPolicies']);
    final curPolicies = docDanhSach(cur['configPolicies']);
    final before = <String, dynamic>{};
    final after = <String, dynamic>{};
    final keys = <String>{...prevPolicies.keys, ...curPolicies.keys};
    for (final k in keys) {
      if (prevPolicies[k] != curPolicies[k]) {
        if (prevPolicies[k] != null) before[k] = prevPolicies[k];
        if (curPolicies[k] != null) after[k] = curPolicies[k];
      }
    }
    final note = before.isEmpty && after.isEmpty
        ? 'Không có thay đổi phân quyền giữa hai phiên bản.'
        : null;
    return (targetName: targetName, before: before, after: after, note: note);
  }

  final prevInput = meta['previousVersion'] is Map
      ? (meta['previousVersion'] as Map)['inputValue']
      : null;
  final curInput = meta['currentVersion'] is Map
      ? (meta['currentVersion'] as Map)['inputValue']
      : null;
  final ketQua = diffConfigBlobs(prevInput, curInput);
  final coChiTiet = ketQua.before.isNotEmpty || ketQua.after.isNotEmpty;
  // Log cũ (BE chưa từng ghi metadata phiên bản) vs lưu trùng nội dung hoàn toàn
  final note = !coChiTiet
      ? (meta['previousVersion'] is Map || meta['currentVersion'] is Map
          ? 'Không có thay đổi nội dung so với phiên bản trước.'
          : 'Log cũ — không lưu chi tiết thay đổi.')
      : null;
  return (
    targetName: targetName,
    before: ketQua.before,
    after: ketQua.after,
    note: note,
  );
}

// ── main mapper ───────────────────────────────────────────────────────────
AuditEntry mapActivityLog(
  HoatDongApi log,
  ActorResolver resolveActor, [
  TargetResolver? resolveTarget,
]) {
  final actor = resolveActor(log.actorId);
  final ba = trichBeforeAfter(log.metadata);
  final original = trichOriginal(log.metadata);
  final metadataName = trichTargetName(log);
  final resolvedName =
      resolveTarget?.call(log.resourceType ?? '', log.resourceId);
  final isCustomerResource =
      log.resourceType == 'customer' || log.resourceType == 'customer_manager';
  final targetName = isCustomerResource
      ? (original.customerName ?? metadataName ?? resolvedName)
      : log.resourceType == 'quotation'
          ? (resolvedName ?? metadataName)
          : (metadataName ?? resolvedName);

  var beforeEntry = ba.before;
  var afterEntry = ba.after;
  var targetNameEntry = targetName;
  String? noteEntry;
  if (log.resourceType == 'price_config') {
    final priceConfigLog = xuLyPriceConfig(log);
    targetNameEntry = priceConfigLog.targetName ?? targetName;
    beforeEntry = priceConfigLog.before;
    afterEntry = priceConfigLog.after;
    noteEntry = priceConfigLog.note;
    // Không có thay đổi nào đọc được → để null để dòng log không expand trống
    if (beforeEntry != null &&
        afterEntry != null &&
        beforeEntry.isEmpty &&
        afterEntry.isEmpty) {
      beforeEntry = null;
      afterEntry = null;
    }
  }

  return AuditEntry(
    id: log.id,
    timestamp: log.createdAt,
    userId: log.actorId,
    userName: actor?.fullName ?? original.actorName ?? '',
    userAvatarUrl: original.actorAvatarUrl,
    action: phanTichActionReviewQuotation(log),
    targetType: chuyenResourceType(log.resourceType),
    targetId: log.resourceId ?? '',
    targetName: targetNameEntry,
    before: beforeEntry,
    after: afterEntry,
    note: noteEntry,
  );
}

List<AuditEntry> mapActivityLogs(
  List<HoatDongApi> logs,
  ActorResolver resolveActor, [
  TargetResolver? resolveTarget,
]) =>
    logs
        .map((log) => mapActivityLog(log, resolveActor, resolveTarget))
        .toList();
