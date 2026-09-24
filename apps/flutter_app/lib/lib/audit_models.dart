// ═══════════════════════════════════════════════════════════════════════════
// audit_models — Model nhật ký thao tác (mirror apps/web/src/lib/types.ts).
//
//   AuditAction  ← AuditAction (types.ts:692)
//   TargetType   ← AuditEntry.targetType (types.ts:707)
//   AuditEntry   ← AuditEntry (types.ts:699)
//
// Web lưu `action`/`targetType` dạng union string; Dart dùng enum để switch
// exhaustive (tránh bug "action lạ rơi vào fallback" như bản cũ).
// ═══════════════════════════════════════════════════════════════════════════

/// Hành động (mirror `AuditAction`). Giữ đủ 16 giá trị của web.
enum AuditAction {
  create,
  update,
  delete,
  lock,
  unlock,
  statusChange,
  overrideChange,
  assign,
  versionRestore,
  duplicate,
  sendApproval,
  approve,
  reject,
  sendCustomer,
  createLsx,
  restore,
}

/// Loại đối tượng bị tác động (mirror `AuditEntry['targetType']`).
enum TargetType { history, quote, customer, order, config, permission }

/// 1 dòng nhật ký đã chuẩn hóa (mirror `AuditEntry`).
class AuditEntry {
  final String id;
  final String timestamp;
  final String userId;
  final String userName;

  /// Avatar URL tương đối người thao tác — từ
  /// `activity_log.metadata.original.actorAvatarUrl`.
  final String? userAvatarUrl;

  final AuditAction action;
  final TargetType targetType;
  final String targetId;
  final String? targetName;
  final Map<String, dynamic>? before;
  final Map<String, dynamic>? after;
  final String? note;
  final String? ipAddress;
  final String? device;

  const AuditEntry({
    required this.id,
    required this.timestamp,
    required this.userId,
    required this.userName,
    this.userAvatarUrl,
    required this.action,
    required this.targetType,
    required this.targetId,
    this.targetName,
    this.before,
    this.after,
    this.note,
    this.ipAddress,
    this.device,
  });
}

/// Resolve actorId → tên hiển thị (mirror `ActorResolver`).
typedef ActorResolver = ({String id, String fullName})? Function(
    String? actorId);

/// Resolve (resourceType, resourceId) → tên hiển thị (mirror `TargetResolver`).
typedef TargetResolver = String? Function(
    String resourceType, String? resourceId);
