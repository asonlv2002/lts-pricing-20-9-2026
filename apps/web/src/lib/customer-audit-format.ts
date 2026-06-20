import type { AuditEntry } from './types';
import { normalizeDisplayText } from './text-codec';

export type AuditChangedField = {
  key: string;
  label: string;
  before: string;
  after: string;
  important: boolean;
};

export type AuditSummary = {
  actionLabel: string;
  actorName: string;
  targetName: string;
  description: string;
  compactFields: string[];
  changeCount: number;
};

export type AuditActorContext = {
  currentUser?: {
    id: string;
    fullName?: string | null;
    account?: string | null;
  } | null;
  users?: Array<{ id: string; name?: string | null; fullName?: string | null; account?: string | null }>;
};

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Tên khách hàng',
  taxCode: 'Mã số thuế',
  invoiceAddress: 'Địa chỉ xuất hóa đơn',
  contactName: 'Người liên hệ',
  phone: 'Số điện thoại',
  email: 'Email',
  address: 'Địa chỉ giao hàng',
  customerCode: 'Mã khách hàng',
  managers: 'Người phụ trách',
  managerNames: 'Người phụ trách',
  sellerId: 'Người phụ trách cũ',
  secondarySellerId: 'Người phụ trách phụ cũ',
  crmStatus: 'Trạng thái CRM',
  status: 'Trạng thái sử dụng',
  isLocked: 'Trạng thái khóa',
  notes: 'Ghi chú',
  assignmentNote: 'Ghi chú phân công',
  contactNotes: 'Ghi chú liên hệ',
  finalPrice: 'Giá cuối cùng',
  input: 'Dữ liệu đầu vào',
  saleResult: 'Kết quả sale',
  masterResult: 'Kết quả quản trị',
  pricingSheetName: 'Tên bảng tính giá',
  quoteStatus: 'Trạng thái báo giá',
  quotationId: 'Mã báo giá',
  quoteCode: 'Mã báo giá',
  quoteProducts: 'Danh sách sản phẩm báo giá',
  chotGia: 'Giá chốt',
  terms: 'Điều khoản báo giá',
  tiers: 'Các mốc số lượng',
  products: 'Số sản phẩm',
  sellerName: 'Người phụ trách',
  productName: 'Tên sản phẩm',
  quantity: 'Số lượng',
  customer: 'Khách hàng',
  customerCodeName: 'Mã khách hàng',
  quoteId: 'Mã báo giá gốc',
  inputValue: 'Dữ liệu đầu vào',
  saleOverrides: 'Ghi đè sale',
  adminOverrides: 'Ghi đè quản trị',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  lock: 'Khóa',
  unlock: 'Mở khóa',
  assign: 'Phân công',
  status_change: 'Đổi trạng thái',
};

const CRM_STATUS_LABELS: Record<string, string> = {
  lead: 'Mới',
  negotiating: 'Đang tương tác',
  active: 'Đang hoạt động',
  paused: 'Tạm ngưng',
  inactive: 'Ngừng hợp tác',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang sử dụng',
  inactive: 'Ngừng sử dụng',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  drafted: 'Đang nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  sent: 'Đã gửi khách',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
  completed: 'Đã chốt đơn SX',
  expired: 'Hết hạn',
};

const UPDATE_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  drafted: 'Nháp',
  submitted: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
  'customer approved': 'Khách đã duyệt',
  'customer rejected': 'Khách từ chối',
  customer_approved: 'Khách đã duyệt',
  customer_rejected: 'Khách từ chối',
};

const LSX_STATUS_LABELS: Record<string, string> = {
  created: 'Mới tạo',
  in_production: 'Đang SX',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const IMPORTANT_CREATE_FIELDS = ['customerCode', 'companyName', 'contactName', 'phone', 'email'];

export function cleanAuditText(value: string): string {
  return normalizeDisplayText(value);
}

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? 'Thao tác';
}

export function getAuditFieldLabel(fieldKey: string): string | undefined {
  return FIELD_LABELS[fieldKey];
}

export function resolveAuditActorName(
  entry: Pick<AuditEntry, 'userId' | 'userName'>,
  context: AuditActorContext = {},
): string {
  const storedName = cleanAuditText(entry.userName || '').trim();
  const storedLooksLikeId = !storedName || storedName === entry.userId;
  if (!storedLooksLikeId) return storedName;

  const currentUser = context.currentUser;
  if (currentUser?.id === entry.userId) {
    return cleanAuditText(currentUser.fullName || currentUser.account || entry.userId);
  }

  const matchedUser = context.users?.find((user) => user.id === entry.userId);
  if (matchedUser) {
    return cleanAuditText(matchedUser.name || matchedUser.fullName || matchedUser.account || entry.userId);
  }

  return storedName || entry.userId;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function formatManagerCount(value: unknown): string {
  return Array.isArray(value) ? `${value.length} người` : '0 người';
}

export function formatManagersAuditValue(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'Chưa phân công';

  const names = value
    .map((manager) => {
      if (manager == null) return '';
      if (typeof manager === 'string') return cleanAuditText(manager).trim();
      if (typeof manager === 'object') {
        const data = manager as { fullName?: unknown; account?: unknown; userId?: unknown };
        const name = String(data.fullName || data.account || data.userId || '').trim();
        if (!name) return '';
        return cleanAuditText(name);
      }
      return cleanAuditText(String(manager)).trim();
    })
    .filter(Boolean);

  return names.length ? names.join(', ') : `${value.length} người phụ trách`;
}

function normalizeAuditValueKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatAuditArrayValue(value: unknown[]): string {
  if (value.length === 0) return '—';
  const names = value
    .map((item) => {
      if (item == null) return '';
      if (typeof item === 'string') return cleanAuditText(item).trim();
      if (typeof item === 'object') {
        const data = item as { fullName?: unknown; account?: unknown; userId?: unknown; name?: unknown; roleName?: unknown };
        const name = String(data.fullName || data.name || data.account || data.roleName || data.userId || '').trim();
        return name ? cleanAuditText(name) : '';
      }
      return cleanAuditText(String(item)).trim();
    })
    .filter(Boolean);
  return names.length ? names.join(', ') : `${value.length} mục`;
}

export function formatAuditDisplayValue(fieldKey: string, value: unknown): string {
  if (isEmpty(value)) return '—';
  if (fieldKey === 'managers' || fieldKey === 'managerNames') return formatManagersAuditValue(value);
  if (fieldKey === 'isLocked') return value ? 'Đã khóa' : 'Chưa khóa';
  if (fieldKey === 'crmStatus' && typeof value === 'string') return CRM_STATUS_LABELS[value] ?? cleanAuditText(value);
  if (fieldKey === 'quoteStatus' && typeof value === 'string') return QUOTE_STATUS_LABELS[normalizeAuditValueKey(value)] ?? cleanAuditText(value);
  if (fieldKey === 'updateStatus' && typeof value === 'string') return UPDATE_STATUS_LABELS[normalizeAuditValueKey(value)] ?? cleanAuditText(value);
  if (fieldKey === 'status' && typeof value === 'string') {
    const normalized = normalizeAuditValueKey(value);
    return LSX_STATUS_LABELS[normalized] ?? STATUS_LABELS[normalized] ?? cleanAuditText(value);
  }
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string') return cleanAuditText(value);
  if (Array.isArray(value)) return formatAuditArrayValue(value);
  if (typeof value === 'object') return '(thông tin chi tiết)';
  return cleanAuditText(String(value));
}

export function formatAuditValue(fieldKey: string, value: unknown): string {
  return formatAuditDisplayValue(fieldKey, value);
}

function changedKeys(entry: AuditEntry): string[] {
  return Array.from(new Set([...Object.keys(entry.before || {}), ...Object.keys(entry.after || {})]));
}

function shouldKeepStructuredDiff(before: unknown, after: unknown): boolean {
  if (!before || !after) return false;
  if (typeof before !== 'object' || typeof after !== 'object') return false;
  try {
    return JSON.stringify(before) !== JSON.stringify(after);
  } catch {
    return before !== after;
  }
}

export function getAuditChangedFields(entry: AuditEntry): AuditChangedField[] {
  return changedKeys(entry)
    .map((key) => {
      const beforeValue = entry.before?.[key];
      const afterValue = entry.after?.[key];
      const label = getAuditFieldLabel(key);
      if (!label) return null;
      const before = formatAuditValue(key, beforeValue);
      const after = formatAuditValue(key, afterValue);
      if (before === after && !shouldKeepStructuredDiff(beforeValue, afterValue)) return null;
      if (before === '—' && after === '—') return null;
      return {
        key,
        label,
        before,
        after,
        important: IMPORTANT_CREATE_FIELDS.includes(key) || key === 'managers' || key === 'managerNames',
      } satisfies AuditChangedField;
    })
    .filter((field): field is AuditChangedField => Boolean(field));
}

export function getAuditSummary(entry: AuditEntry, context: AuditActorContext = {}): AuditSummary {
  const fields = getAuditChangedFields(entry);
  const actionLabel = getAuditActionLabel(entry.action);
  const actorName = resolveAuditActorName(entry, context);
  const targetName = cleanAuditText(entry.targetName || entry.targetId);

  if (entry.action === 'assign') {
    const beforeManagers = entry.before?.managerNames ?? entry.before?.managers;
    const afterManagers = entry.after?.managerNames ?? entry.after?.managers;
    return {
      actionLabel,
      actorName,
      targetName,
      description: `Cập nhật người phụ trách: ${formatManagerCount(beforeManagers)} → ${formatManagerCount(afterManagers)}`,
      compactFields: [],
      changeCount: fields.length,
    };
  }

  if (entry.action === 'create') {
    const compactFields = IMPORTANT_CREATE_FIELDS
      .map((key) => fields.find((field) => field.key === key))
      .filter((field): field is AuditChangedField => Boolean(field))
      .map((field) => `${field.label}: ${field.after}`);

    return {
      actionLabel,
      actorName,
      targetName,
      description: `Tạo hồ sơ khách hàng ${targetName}`,
      compactFields,
      changeCount: fields.length,
    };
  }

  const fieldNames = fields.slice(0, 3).map((field) => field.label).join(', ');
  return {
    actionLabel,
    actorName,
    targetName,
    description: fields.length ? `Cập nhật ${fields.length} thông tin${fieldNames ? `: ${fieldNames}` : ''}` : 'Không có thay đổi hiển thị',
    compactFields: [],
    changeCount: fields.length,
  };
}
