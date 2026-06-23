import type { AuditAction, AuditEntry } from './types';
import type { ActivityLogServerApi } from './api/service-lts';
import { normalizeDisplayText } from './text-codec';

// ── resourceType mapping ──────────────────────────────────────────────────
const RESOURCE_TYPE_MAP: Record<string, AuditEntry['targetType']> = {
  customer: 'customer',
  pricing_sheet: 'history',
  quotation: 'quote',
  account: 'permission',
  role: 'permission',
  user_policy: 'permission',
  customer_manager: 'customer',
};

export function chuyenResourceType(resourceType: string): AuditEntry['targetType'] {
  return RESOURCE_TYPE_MAP[resourceType] ?? 'permission';
}

// ── action mapping ────────────────────────────────────────────────────────
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

// ── targetName từ metadata ─────────────────────────────────────────────────
const TARGET_NAME_KEYS: Record<string, string[]> = {
  customer: ['organizationName', 'codeName'],
  pricing_sheet: ['pricingSheetName'],
  quotation: ['description'],
  account: ['account'],
  role: ['roleName'],
};

function trichTargetName(log: ActivityLogServerApi): string | undefined {
  const raw = log.metadata?.currentVersion;
  if (!raw || typeof raw !== 'object') return undefined;
  const cur = raw as Record<string, unknown>;
  const keys = TARGET_NAME_KEYS[log.resourceType as keyof typeof TARGET_NAME_KEYS];
  if (keys) {
    for (const key of keys) {
      if (cur[key] != null) return String(cur[key]);
    }
  }
  return undefined;
}

// ── original (snapshot hiển thị từ backend) ────────────────────────────────
export function trichOriginal(metadata: Record<string, unknown> | null | undefined): {
  actorName?: string;
  customerName?: string;
} {
  if (!metadata || typeof metadata !== 'object') return {};
  const original = metadata.original;
  if (!original || typeof original !== 'object') return {};
  const src = original as Record<string, unknown>;
  const result: { actorName?: string; customerName?: string } = {};
  if (typeof src.actorName === 'string' && src.actorName.trim()) {
    result.actorName = normalizeDisplayText(src.actorName).trim();
  }
  if (typeof src.customerName === 'string' && src.customerName.trim()) {
    result.customerName = normalizeDisplayText(src.customerName).trim();
  }
  return result;
}

// ── actor resolver ────────────────────────────────────────────────────────
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

// ── target resolver ───────────────────────────────────────────────────────
export type TargetResolver = (resourceType: string, resourceId: string | null) => string | undefined;

// ── main mapper ───────────────────────────────────────────────────────────
export function mapActivityLogServer(
  log: ActivityLogServerApi,
  resolveActor: ActorResolver,
  resolveTarget?: TargetResolver,
): AuditEntry {
  const actor = resolveActor(log.actorId);
  const { before, after } = trichBeforeAfter(log.metadata);
  const original = trichOriginal(log.metadata);
  const metadataName = trichTargetName(log);
  const resolvedName = resolveTarget?.(log.resourceType, log.resourceId);
  const isCustomerResource = log.resourceType === 'customer' || log.resourceType === 'customer_manager';
  const targetName = isCustomerResource
    ? (original.customerName || metadataName || resolvedName)
    : (metadataName || resolvedName);
  return {
    id: log.id,
    timestamp: log.createdAt,
    userId: log.actorId ?? '',
    userName: actor?.fullName || original.actorName || '',
    action: chuyenAction(log.action),
    targetType: chuyenResourceType(log.resourceType),
    targetId: log.resourceId ?? '',
    targetName,
    before,
    after,
  };
}

export function mapActivityLogsServer(
  logs: ActivityLogServerApi[],
  resolveActor: ActorResolver,
  resolveTarget?: TargetResolver,
): AuditEntry[] {
  return logs.map((log) => mapActivityLogServer(log, resolveActor, resolveTarget));
}

// ── manager list diff ─────────────────────────────────────────────────────

export interface ManagerDiff {
  added: string[];
  removed: string[];
}

function extractManagerNames(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const names = data.managerNames;
  if (Array.isArray(names)) {
    return names.map((n) => (typeof n === 'string' ? normalizeDisplayText(n).trim() : String(n))).filter(Boolean);
  }
  const mgrs = data.managers;
  if (Array.isArray(mgrs)) {
    return mgrs
      .map((m) => {
        if (m == null) return '';
        if (typeof m === 'string') return normalizeDisplayText(m).trim();
        if (typeof m === 'object') {
          const obj = m as Record<string, unknown>;
          return normalizeDisplayText(
            String(obj.fullName || obj.account || obj.userId || ''),
          ).trim();
        }
        return '';
      })
      .filter(Boolean);
  }
  const ids = data.managerIds;
  if (Array.isArray(ids)) return ids.map((id) => String(id)).filter(Boolean);
  return [];
}

export function diffManagerLists(
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): ManagerDiff {
  const beforeNames = extractManagerNames(before);
  const afterNames = extractManagerNames(after);

  return {
    added: afterNames.filter((n) => !beforeNames.includes(n)),
    removed: beforeNames.filter((n) => !afterNames.includes(n)),
  };
}
