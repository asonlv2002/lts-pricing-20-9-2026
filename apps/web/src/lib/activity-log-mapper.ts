import type { AuditAction, AuditEntry } from './types';
import type { ActivityLogServerApi } from './api/service-lts';
import { normalizeDisplayText } from './text-codec';

// ── resourceType mapping ──────────────────────────────────────────────────
// server → FE AuditEntry.targetType
const RESOURCE_TYPE_MAP: Record<string, AuditEntry['targetType']> = {
  customer: 'customer',
  pricing_sheet: 'history',
  quotation: 'quote',
  // Các resource khác (account/role/user_policy/customer_manager) ánh xạ vào
  // targetType 'permission' để khớp với TARGET_TYPE_LABELS trong ModuleNhatKy.
  account: 'permission',
  role: 'permission',
  user_policy: 'permission',
  customer_manager: 'customer',
};

export function chuyenResourceType(resourceType: string): AuditEntry['targetType'] {
  return RESOURCE_TYPE_MAP[resourceType] ?? 'permission';
}

// ── action mapping ────────────────────────────────────────────────────────
// Ánh xạ 25 action server → 16 AuditAction FE.
// Bao gồm: customer/pricing_sheet/quotation + các action account/role/user_policy
// (để tab "Tất cả" hiển thị đúng nhãn).
const ACTION_MAP: Record<string, AuditAction> = {
  'customer.created': 'create',
  'customer.version_created': 'update',
  'customer_manager.replaced': 'assign',

  'pricing_sheet.created': 'create',
  'pricing_sheet.advisor_result_updated': 'status_change',
  'pricing_sheet.result_updated': 'update',

  'quotation.created': 'create',
  'quotation.submitted': 'send_approval',
  'quotation.review_status_updated': 'approve',

  'account.password_changed': 'update',
  'account.password_updated': 'update',
  'account.created': 'create',
  'account.activation_updated': 'status_change',

  'role.upserted': 'create',
  'role.deleted': 'delete',

  'user_policy.granted': 'assign',
  'user_policy.revoked': 'assign',
};

export function chuyenAction(serverAction: string): AuditAction {
  return ACTION_MAP[serverAction] ?? 'update';
}

// ── metadata → before/after ───────────────────────────────────────────────
// Tất cả 3 module backend (customer/pricing_sheet/quotation) đều dùng shape
// { previousVersion, currentVersion }. FE giữ nguyên shape để DiffView hiện có
// (trong ModuleNhatKy.tsx) dùng được luôn.
export function trichBeforeAfter(metadata: Record<string, unknown> | null | undefined): {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} {
  if (!metadata || typeof metadata !== 'object') return {};
  const previousVersion = metadata.previousVersion;
  const currentVersion = metadata.currentVersion;
  return {
    ...(previousVersion && typeof previousVersion === 'object'
      ? { before: previousVersion as Record<string, unknown> }
      : {}),
    ...(currentVersion && typeof currentVersion === 'object'
      ? { after: currentVersion as Record<string, unknown> }
      : {}),
  };
}

// ── actor resolver ────────────────────────────────────────────────────────
// BE không embed tên user; FE tự resolve qua cache users.
export type ActorResolver = (actorId: string | null) => { id: string; fullName: string } | null;

export function taoActorResolver(
  users: Array<{ id: string; account?: string; fullName?: string | null }>,
): ActorResolver {
  const map = new Map(users.map((u) => [u.id, u]));
  return (actorId) => {
    if (!actorId) return null;
    const found = map.get(actorId);
    if (!found) return null;
    return {
      id: found.id,
      fullName: normalizeDisplayText(found.fullName || found.account || found.id),
    };
  };
}

// ── main mapper ───────────────────────────────────────────────────────────
export function mapActivityLogServer(
  log: ActivityLogServerApi,
  resolveActor: ActorResolver,
): AuditEntry {
  const actor = resolveActor(log.actorId);
  const { before, after } = trichBeforeAfter(log.metadata);
  return {
    id: log.id,
    timestamp: log.createdAt,
    userId: log.actorId ?? '',
    userName: actor?.fullName ?? log.actorId ?? '',
    action: chuyenAction(log.action),
    targetType: chuyenResourceType(log.resourceType),
    targetId: log.resourceId ?? '',
    before,
    after,
  };
}

export function mapActivityLogsServer(
  logs: ActivityLogServerApi[],
  resolveActor: ActorResolver,
): AuditEntry[] {
  return logs.map((log) => mapActivityLogServer(log, resolveActor));
}
