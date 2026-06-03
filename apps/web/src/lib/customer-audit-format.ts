import type { AuditEntry } from './types';

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

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Tên khách hàng',
  taxCode: 'Mã số thuế',
  invoiceAddress: 'Địa chỉ xuất hóa đơn',
  contactName: 'Người liên hệ',
  phone: 'Số điện thoại',
  email: 'Email',
  contactTitle: 'Chức vụ',
  address: 'Địa chỉ giao hàng',
  customerCode: 'Mã khách hàng',
  managers: 'Người phụ trách',
  sellerId: 'Người phụ trách cũ',
  secondarySellerId: 'Người phụ trách phụ cũ',
  crmStatus: 'Trạng thái CRM',
  status: 'Trạng thái sử dụng',
  isLocked: 'Trạng thái khóa',
  notes: 'Ghi chú',
  assignmentNote: 'Ghi chú phân công',
  contactNotes: 'Ghi chú liên hệ',
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

const IMPORTANT_CREATE_FIELDS = ['customerCode', 'companyName', 'contactName', 'phone', 'email'];

export function cleanAuditText(value: string): string {
  return value
    .replace(/TrÆ°á»ng/g, 'Trường')
    .replace(/SÆ¡n/g, 'Sơn')
    .replace(/VÃµ/g, 'Võ')
    .replace(/Huá»³nh/g, 'Huỳnh')
    .replace(/Æ°/g, 'ư')
    .replace(/Æ¡/g, 'ơ');
}

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? 'Thao tác';
}

export function getAuditFieldLabel(fieldKey: string): string | undefined {
  return FIELD_LABELS[fieldKey];
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
      if (!manager || typeof manager !== 'object') return '';
      const data = manager as { fullName?: unknown; account?: unknown; userId?: unknown; canWrite?: unknown };
      const name = String(data.fullName || data.account || data.userId || '').trim();
      if (!name) return '';
      return `${cleanAuditText(name)} (${data.canWrite === true ? 'Được sửa' : 'Chỉ xem'})`;
    })
    .filter(Boolean);

  return names.length ? names.join(', ') : `${value.length} người phụ trách`;
}

export function formatAuditValue(fieldKey: string, value: unknown): string {
  if (isEmpty(value)) return '—';
  if (fieldKey === 'managers') return formatManagersAuditValue(value);
  if (fieldKey === 'isLocked') return value ? 'Đã khóa' : 'Chưa khóa';
  if (fieldKey === 'crmStatus' && typeof value === 'string') return CRM_STATUS_LABELS[value] ?? cleanAuditText(value);
  if (fieldKey === 'status' && typeof value === 'string') return STATUS_LABELS[value] ?? cleanAuditText(value);
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string') return cleanAuditText(value);
  if (Array.isArray(value)) return value.length ? `${value.length} mục` : '—';
  if (typeof value === 'object') return 'Thông tin khác';
  return cleanAuditText(String(value));
}

function changedKeys(entry: AuditEntry): string[] {
  return Array.from(new Set([...Object.keys(entry.before || {}), ...Object.keys(entry.after || {})]));
}

export function getAuditChangedFields(entry: AuditEntry): AuditChangedField[] {
  return changedKeys(entry)
    .map((key) => {
      const label = getAuditFieldLabel(key);
      if (!label) return null;
      const before = formatAuditValue(key, entry.before?.[key]);
      const after = formatAuditValue(key, entry.after?.[key]);
      if (before === after) return null;
      if (before === '—' && after === '—') return null;
      return {
        key,
        label,
        before,
        after,
        important: IMPORTANT_CREATE_FIELDS.includes(key) || key === 'managers',
      } satisfies AuditChangedField;
    })
    .filter((field): field is AuditChangedField => Boolean(field));
}

export function getAuditSummary(entry: AuditEntry): AuditSummary {
  const fields = getAuditChangedFields(entry);
  const actionLabel = getAuditActionLabel(entry.action);
  const actorName = cleanAuditText(entry.userName || entry.userId);
  const targetName = cleanAuditText(entry.targetName || entry.targetId);

  if (entry.action === 'assign') {
    return {
      actionLabel,
      actorName,
      targetName,
      description: `Cập nhật người phụ trách: ${formatManagerCount(entry.before?.managers)} → ${formatManagerCount(entry.after?.managers)}`,
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
