import type { AuditAction, AuditEntry } from './types';
import type { ActivityLogServerApi } from './api/service-lts';
import { NHAN_CONFIG_NAME, diffConfigBlobs } from './config-diff';
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
  price_config: 'config',
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
  'pricing_sheet.deleted': 'delete',
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

  'price_config.created': 'create',
  'price_config.updated': 'update',
  'price_config.deleted': 'delete',
  'price_config.policies_replaced': 'assign',
};

export function chuyenAction(serverAction: string): AuditAction {
  return ACTION_MAP[serverAction] ?? 'update';
}

/**
 * Phân biệt duyệt / từ chối BBG từ metadata của server log.
 * Server chỉ ghi 1 action `quotation.review_status_updated` — quyết định nằm
 * ở `currentVersion.updateStatus` (approved | rejected).
 */
export function phanTichActionReviewQuotation(
  log: Pick<ActivityLogServerApi, 'action' | 'metadata'>,
): AuditAction {
  if (log.action !== 'quotation.review_status_updated') {
    return chuyenAction(log.action);
  }
  const metadata = log.metadata;
  if (!metadata || typeof metadata !== 'object') return 'approve';
  const currentVersion = (metadata as Record<string, unknown>).currentVersion;
  if (!currentVersion || typeof currentVersion !== 'object') return 'approve';
  const updateStatus = (currentVersion as Record<string, unknown>)
    .updateStatus;
  return updateStatus === 'rejected' ? 'reject' : 'approve';
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
  actorAvatarUrl?: string;
  customerName?: string;
} {
  if (!metadata || typeof metadata !== 'object') return {};
  const original = metadata.original;
  if (!original || typeof original !== 'object') return {};
  const src = original as Record<string, unknown>;
  const result: { actorName?: string; actorAvatarUrl?: string; customerName?: string } = {};
  if (typeof src.actorName === 'string' && src.actorName.trim()) {
    result.actorName = normalizeDisplayText(src.actorName).trim();
  }
  if (typeof src.actorAvatarUrl === 'string' && src.actorAvatarUrl.trim()) {
    result.actorAvatarUrl = src.actorAvatarUrl.trim();
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

function laDoiTuongNhan(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Log price_config (Cấu hình tính giá): BE lưu metadata.previousVersion /
 * currentVersion chứa blob inputValue — flatten thành nhãn VN → giá trị
 * (chỉ các leaf khác nhau) và gán vào before/after của AuditEntry.
 * policies_replaced có shape riêng (configPolicies) — xử lý dòng "Phân quyền X".
 * Trả `note` khi diff rỗng để vẫn hiện được cho người dùng biết log có hợp lệ
 * nhưng không trích xuất được thay đổi.
 */
function xuLyPriceConfig(
  log: Pick<ActivityLogServerApi, 'action' | 'metadata'>,
): {
  targetName: string | undefined;
  before: Record<string, unknown> | undefined;
  after: Record<string, unknown> | undefined;
  note: string | undefined;
} {
  const meta = laDoiTuongNhan(log.metadata)
    ? (log.metadata as Record<string, unknown>)
    : {};
  const original = laDoiTuongNhan(meta.original)
    ? (meta.original as Record<string, unknown>)
    : {};
  const configName =
    typeof original.configName === 'string' ? original.configName : '';
  const targetName = NHAN_CONFIG_NAME[configName] ?? (configName || undefined);

  if (log.action === 'price_config.policies_replaced') {
    const docDanhSach = (v: unknown): Record<string, string> => {
      const ketQua: Record<string, string> = {};
      if (!Array.isArray(v)) return ketQua;
      for (const dong of v) {
        if (!laDoiTuongNhan(dong)) continue;
        const rec = dong as Record<string, unknown>;
        const cn = typeof rec.configName === 'string' ? rec.configName : '';
        const policies = Array.isArray(rec.policies)
          ? rec.policies.filter((p): p is string => typeof p === 'string')
          : [];
        ketQua[`Phân quyền ${NHAN_CONFIG_NAME[cn] ?? cn}`] = policies.length
          ? policies.join(', ')
          : '(trống)';
      }
      return ketQua;
    };
    const prev = laDoiTuongNhan(meta.previousVersion)
      ? (meta.previousVersion as Record<string, unknown>)
      : {};
    const cur = laDoiTuongNhan(meta.currentVersion)
      ? (meta.currentVersion as Record<string, unknown>)
      : {};
    const prevPolicies = docDanhSach(prev.configPolicies);
    const curPolicies = docDanhSach(cur.configPolicies);
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const k of new Set([
      ...Object.keys(prevPolicies),
      ...Object.keys(curPolicies),
    ])) {
      if (prevPolicies[k] !== curPolicies[k]) {
        if (prevPolicies[k] !== undefined) before[k] = prevPolicies[k];
        if (curPolicies[k] !== undefined) after[k] = curPolicies[k];
      }
    }
    const note = !Object.keys(before).length && !Object.keys(after).length
      ? 'Không có thay đổi phân quyền giữa hai phiên bản.'
      : undefined;
    return { targetName, before, after, note };
  }

  const prevInput = laDoiTuongNhan(meta.previousVersion)
    ? (meta.previousVersion as Record<string, unknown>).inputValue
    : undefined;
  const curInput = laDoiTuongNhan(meta.currentVersion)
    ? (meta.currentVersion as Record<string, unknown>).inputValue
    : undefined;
  const ketQua = diffConfigBlobs(prevInput, curInput);
  const coChiTiet = !!Object.keys(ketQua.before).length || !!Object.keys(ketQua.after).length;
  // Log cũ (BE chưa từng ghi metadata phiên bản) vs lưu trùng nội dung hoàn toàn
  const note = !coChiTiet
    ? (laDoiTuongNhan(meta.previousVersion) || laDoiTuongNhan(meta.currentVersion)
        ? 'Không có thay đổi nội dung so với phiên bản trước.'
        : 'Log cũ — không lưu chi tiết thay đổi.')
    : undefined;
  return { targetName, before: ketQua.before, after: ketQua.after, note };
}

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
    : log.resourceType === 'quotation'
      ? (resolvedName || metadataName)
      : (metadataName || resolvedName);

  let beforeEntry = before;
  let afterEntry = after;
  let targetNameEntry = targetName;
  let noteEntry: string | undefined = undefined;
  if (log.resourceType === 'price_config') {
    const priceConfigLog = xuLyPriceConfig(log);
    targetNameEntry = priceConfigLog.targetName ?? targetName;
    beforeEntry = priceConfigLog.before;
    afterEntry = priceConfigLog.after;
    noteEntry = priceConfigLog.note;
    // Không có thay đổi nào đọc được → để undefined để dòng log không expand trống
    if (
      beforeEntry &&
      afterEntry &&
      !Object.keys(beforeEntry).length &&
      !Object.keys(afterEntry).length
    ) {
      beforeEntry = undefined;
      afterEntry = undefined;
    }
  }

  return {
    id: log.id,
    timestamp: log.createdAt,
    userId: log.actorId ?? '',
    userName: actor?.fullName || original.actorName || '',
    userAvatarUrl: original.actorAvatarUrl,
    action: phanTichActionReviewQuotation(log),
    targetType: chuyenResourceType(log.resourceType),
    targetId: log.resourceId ?? '',
    targetName: targetNameEntry,
    before: beforeEntry,
    after: afterEntry,
    note: noteEntry,
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
