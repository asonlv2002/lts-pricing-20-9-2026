"use client";
import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Search,
  Download,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Send,
  Check,
  X,
  Mail,
  Lock,
  RotateCcw,
  Factory,
  Filter,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import type { AuditAction, AuditEntry } from "../lib/types";
import { normalizeDisplayText } from "../lib/text-codec";
import {
  formatAuditDisplayValue,
  getAuditFieldLabel,
} from "../lib/customer-audit-format";
import { diffManagerLists } from "../lib/activity-log-mapper";
import { dieuHuongModuleApp, dieuHuongMenuApp, menuKeyTinhGiaTheoItem } from "../lib/menu-route";
import { layBaoGiaTheoIdService } from "../lib/api/service-lts";

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Tạo mới",
  update: "Chỉnh sửa",
  delete: "Xóa",
  lock: "Khóa dữ liệu",
  unlock: "Mở khóa dữ liệu",
  status_change: "Đổi trạng thái",
  override_change: "Thay đổi override",
  assign: "Phân công",
  version_restore: "Khôi phục",
  duplicate: "Sao chép",
  send_approval: "Gửi duyệt",
  approve: "Duyệt",
  reject: "Từ chối",
  send_customer: "Gửi khách hàng",
  create_lsx: "Tạo LSX",
  restore: "Khôi phục",
};

/** Log duyệt/từ chối BBG thương mại: chỉ cần dòng gọn "ai làm gì ở đâu", không diff kỹ thuật. */
function laLogReviewBaoGia(entry: AuditEntry): boolean {
  return (
    entry.targetType === "quote" &&
    (entry.action === "approve" || entry.action === "reject")
  );
}

const ACTION_CONFIG: Record<
  AuditAction,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  create: { icon: <Plus size={13} />, color: "#059669", bg: "#d1fae5" },
  update: { icon: <Pencil size={13} />, color: "#2563eb", bg: "#dbeafe" },
  delete: { icon: <Trash2 size={13} />, color: "#dc2626", bg: "#fee2e2" },
  lock: { icon: <Lock size={13} />, color: "#374151", bg: "#f3f4f6" },
  unlock: { icon: <Lock size={13} />, color: "#7c3aed", bg: "#ede9fe" },
  status_change: { icon: <Check size={13} />, color: "#4f46e5", bg: "#e0e7ff" },
  override_change: {
    icon: <Pencil size={13} />,
    color: "#0891b2",
    bg: "#cffafe",
  },
  assign: { icon: <User size={13} />, color: "#7c3aed", bg: "#ede9fe" },
  version_restore: {
    icon: <RotateCcw size={13} />,
    color: "#d97706",
    bg: "#fef3c7",
  },
  duplicate: { icon: <FileText size={13} />, color: "#0d9488", bg: "#ccfbf1" },
  send_approval: { icon: <Send size={13} />, color: "#4f46e5", bg: "#e0e7ff" },
  approve: { icon: <Check size={13} />, color: "#059669", bg: "#d1fae5" },
  reject: { icon: <X size={13} />, color: "#dc2626", bg: "#fee2e2" },
  send_customer: { icon: <Mail size={13} />, color: "#7c3aed", bg: "#ede9fe" },
  create_lsx: { icon: <Factory size={13} />, color: "#0d9488", bg: "#ccfbf1" },
  restore: { icon: <RotateCcw size={13} />, color: "#d97706", bg: "#fef3c7" },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  history: "Bảng tính giá",
  quote: "Báo giá thương mại",
  customer: "Hồ sơ Khách hàng",
  order: "Đơn hàng & Lệnh sản xuất (LSX)",
  config: "Cấu hình tính giá (Vật tư, Hao hụt...)",
  permission: "Phân quyền hệ thống",
};

// Grouped action types for filter UI
const DATA_CHANGE_ACTIONS: AuditAction[] = ["create", "update", "delete"];
const STATUS_CHANGE_ACTIONS: AuditAction[] = [
  "status_change",
  "send_approval",
  "approve",
  "reject",
  "send_customer",
  "lock",
  "unlock",
  "restore",
  "create_lsx",
];

const BATCH_SIZE = 20;

type TimeRange = "today" | "7days" | "30days" | "month" | "custom";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayAuditText(value?: string | null) {
  return normalizeDisplayText(value || "");
}

function groupByDate(
  entries: AuditEntry[],
): Array<{ date: string; items: AuditEntry[] }> {
  const map = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const d = formatDate(e.timestamp);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function getTimeRangeBounds(
  range: TimeRange,
  customFrom?: string,
  customTo?: string,
): [Date, Date] {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "7days") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === "30days") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "custom") {
    return [
      customFrom ? new Date(customFrom) : new Date(0),
      customTo ? new Date(customTo) : end,
    ];
  }
  return [start, end];
}

// ─── DiffView ────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  isLocked: "Khóa",
  companyName: "Tên công ty",
  contactName: "Người liên hệ",
  phone: "Điện thoại",
  email: "Email",
  address: "Địa chỉ",
  region: "Khu vực",
  customerGroup: "Nhóm KH",
  sellerId: "Nhân viên",
  secondarySellerId: "Nhân viên phụ",
  status: "Trạng thái",
  crmStatus: "Trạng thái CRM",
  notes: "Ghi chú",
  taxCode: "Mã số thuế",
  invoiceAddress: "Địa chỉ hóa đơn",
  customerCode: "Mã KH",
  assignmentNote: "Ghi chú phân công",
  contactNotes: "Ghi chú liên hệ",
  lsxNumber: "Số LSX",
  issuedDate: "Ngày xuống LSX",
  deliveryDate: "Ngày giao hàng",
  preparedBy: "Người lập",
  approvedBy: "Người duyệt",
  quoteId: "Mã báo giá gốc",
  scope: "Phạm vi cấu hình",
  name: "Tên phiên bản",
  effectiveMode: "Kiểu hiệu lực",
  effectiveFrom: "Hiệu lực từ",
  materialId: "Mã vật tư",
  materialName: "Tên vật tư",
  pricePerKg: "Giá/kg",
  thickness: "Độ dày",
  roleCode: "Mã vai trò",
  roleName: "Tên vai trò",
  account: "Tài khoản",
  fullName: "Họ tên",
  isActive: "Trạng thái tài khoản",
  policies: "Danh sách quyền",
  policiesAdded: "Quyền được cấp",
  policiesRemoved: "Quyền bị thu hồi",
  days: "Số ngày",
  threshold: "Ngưỡng",
  numColors: "Số màu",
  value: "Giá trị",
  key: "Mã",
  count: "Số lượng",
  pricingSheetName: "Tên bảng tính giá",
  codeName: "Mã khách hàng",
  organizationName: "Tên tổ chức",
  phoneNumber: "Số điện thoại",
  customerId: "Khách hàng",
  quotationId: "Báo giá liên quan",
  description: "Mô tả",
  updateStatus: "Trạng thái cập nhật",
  note: "Ghi chú",
  managerIds: "Nhân viên phụ trách",
  managerNames: "Nhân viên phụ trách",
};

const HIDDEN_DIFF_KEYS = new Set([
  "isLocked",
  "customerId",
  "quotationId",
  "managerIds",
  "inputValue",
  "saleResult",
  "masterResult",
  "pricingSheetId",
  "pricingSheetIds",
]);

const MANAGER_DIFF_KEYS = new Set(["managerIds", "managerNames", "managers"]);

function formatDiffValue(fieldKey: string, val: unknown): string {
  const formatted = formatAuditDisplayValue(fieldKey, val);
  return formatted === "—" ? "(trống)" : formatted;
}

function DiffView({
  before,
  after,
  hiddenKeys,
}: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  hiddenKeys?: Set<string>;
}) {
  if (!before && !after) return null;
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  ).filter(
    (k) => !HIDDEN_DIFF_KEYS.has(k) && (!hiddenKeys || !hiddenKeys.has(k)),
  );
  if (keys.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {keys.map((k) => {
        const oldVal = before?.[k];
        const newVal = after?.[k];
        if (oldVal === newVal) return null;
        return (
          <div key={k} style={{ marginBottom: 6, fontSize: "0.78rem" }}>
            <div
              style={{
                color: "var(--muted)",
                marginBottom: 2,
                fontWeight: 500,
              }}
            >
              {getAuditFieldLabel(k) || FIELD_LABELS[k] || k}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {oldVal !== undefined && (
                <div
                  style={{
                    color: "#dc2626",
                    background: "#fee2e2",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                  aria-label={`Giá trị cũ: ${formatDiffValue(k, oldVal)}`}
                >
                  − {formatDiffValue(k, oldVal)}
                </div>
              )}
              {newVal !== undefined && (
                <div
                  style={{
                    color: "#059669",
                    background: "#d1fae5",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                  aria-label={`Giá trị mới: ${formatDiffValue(k, newVal)}`}
                >
                  + {formatDiffValue(k, newVal)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TimelineEntry ────────────────────────────────────────────────────────────

function TimelineEntry({
  entry,
  onOpen,
}: {
  entry: AuditEntry;
  onOpen: (entry: AuditEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[entry.action];
  const laReviewBaoGia = laLogReviewBaoGia(entry);
  const hasDiff =
    !!(entry.before || entry.after || entry.note) && !laReviewBaoGia;

  const managerDiff = useMemo(() => {
    if (entry.action === "assign" && entry.targetType === "customer") {
      return diffManagerLists(entry.before, entry.after);
    }
    return null;
  }, [entry]);
  const hasManagerChanges =
    managerDiff &&
    (managerDiff.added.length > 0 || managerDiff.removed.length > 0);

  return (
    <li style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
      {/* Timeline line + dot */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: cfg.bg,
            color: cfg.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${cfg.color}40`,
            flexShrink: 0,
          }}
        >
          {cfg.icon}
        </div>
        <div
          style={{
            width: 1.5,
            flex: 1,
            background: "var(--border)",
            marginTop: 4,
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(entry.timestamp)}
          </span>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text, #1e293b)",
            }}
          >
            {entry.userName
              ? displayAuditText(entry.userName)
              : "Người dùng không xác định"}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 10,
              background: cfg.bg,
              color: cfg.color,
            }}
          >
            {ACTION_LABELS[entry.action]}
          </span>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--text, #1e293b)" }}>
            {entry.targetName ? (
              <>
                <span style={{ color: "var(--muted)" }}>
                  {TARGET_TYPE_LABELS[entry.targetType] || entry.targetType}:
                </span>{" "}
                <span style={{ fontWeight: 500 }}>
                  {displayAuditText(entry.targetName)}
                </span>
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>
                {TARGET_TYPE_LABELS[entry.targetType] || entry.targetType}
              </span>
            )}
          </div>

          {entry.note && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              {displayAuditText(entry.note)}
            </div>
          )}

          {hasDiff && (entry.before || entry.after) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop: 6,
                fontSize: "0.75rem",
                color: "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
              }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Ẩn chi tiết" : "Xem chi tiết thay đổi"}
            </button>
          )}

          <button
            onClick={() => onOpen(entry)}
            style={{
              marginTop: 8,
              fontSize: "0.75rem",
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            <Eye size={12} /> Mở dữ liệu liên quan
          </button>

          {expanded && (
            <>
              {hasManagerChanges && (
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {managerDiff!.added.map((name) => (
                    <div
                      key={`add-${name}`}
                      style={{
                        fontSize: "0.8rem",
                        color: "#059669",
                        background: "#d1fae5",
                        padding: "4px 8px",
                        borderRadius: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {displayAuditText(entry.userName)} đã thêm{" "}
                      {displayAuditText(name)} vào danh sách quản lí của{" "}
                      {displayAuditText(entry.targetName || "")}
                    </div>
                  ))}
                  {managerDiff!.removed.map((name) => (
                    <div
                      key={`rm-${name}`}
                      style={{
                        fontSize: "0.8rem",
                        color: "#dc2626",
                        background: "#fee2e2",
                        padding: "4px 8px",
                        borderRadius: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {displayAuditText(entry.userName)} đã gỡ{" "}
                      {displayAuditText(name)} khỏi danh sách quản lí của{" "}
                      {displayAuditText(entry.targetName || "")}
                    </div>
                  ))}
                </div>
              )}
              <DiffView
                before={entry.before}
                after={entry.after}
                hiddenKeys={hasManagerChanges ? MANAGER_DIFF_KEYS : undefined}
              />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--primary-light, #dbeafe)",
        color: "var(--primary, #2563eb)",
        borderRadius: 12,
        padding: "2px 8px",
        fontSize: "0.75rem",
        fontWeight: 500,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Xóa bộ lọc ${label}`}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          color: "inherit",
        }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModuleNhatKy({
  menuDangChon,
}: {
  menuDangChon?: string;
}) {
  const {
    nhatKyHeThong,
    dangTaiNhatKy,
    loiNhatKy,
    xuatNhatKyCsv,
    taiNhatKyHeThong,
    history,
    nguoiDungHienTai,
    accessToken,
    taiBangTinhTuServer,
  } = dungCuaHangTinhGia();
  const coQuyenXemNhatKyHeThong =
    !!nguoiDungHienTai?.policies.includes("ACTIVITY_MONITOR");

  useEffect(() => {
    taiNhatKyHeThong();
    const onFocus = () => taiNhatKyHeThong();
    const onVisibility = () => {
      if (document.visibilityState === "visible") taiNhatKyHeThong();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [taiNhatKyHeThong]);

  const auditLog = useMemo(() => {
    if (menuDangChon === "nhat-ky-tinh-gia") {
      return nhatKyHeThong.filter(
        (e) =>
          e.targetType === "history" ||
          e.targetType === "quote" ||
          e.targetType === "order",
      );
    }
    if (menuDangChon === "nhat-ky-khach-hang") {
      return nhatKyHeThong.filter((e) => e.targetType === "customer");
    }
    if (menuDangChon === "nhat-ky-he-thong") {
      return nhatKyHeThong.filter(
        (e) =>
          e.targetType === "config" ||
          e.targetType === "permission",
      );
    }
    return nhatKyHeThong;
  }, [nhatKyHeThong, menuDangChon]);

  // Filters
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterActions, setFilterActions] = useState<Set<AuditAction>>(
    new Set(),
  );
  const [filterUser, setFilterUser] = useState("");
  const [userSearchText, setUserSearchText] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [filterModule, setFilterModule] = useState<Set<string>>(new Set());
  const [targetSearch, setTargetSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);

  // Unique users for filter (autocomplete)
  const allUsers = useMemo(() => {
    const seen = new Set<string>();
    return auditLog
      .filter((e) => {
        if (seen.has(e.userId)) return false;
        seen.add(e.userId);
        return true;
      })
      .map((e) => ({ id: e.userId, name: displayAuditText(e.userName) }));
  }, [auditLog]);

  // Filtered user suggestions for autocomplete
  const userSuggestions = useMemo(() => {
    if (!userSearchText.trim()) return allUsers;
    const q = userSearchText.toLowerCase();
    return allUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
    );
  }, [allUsers, userSearchText]);

  const filtered = useMemo(() => {
    const [start, end] = getTimeRangeBounds(timeRange, customFrom, customTo);
    let list = auditLog.filter((e) => {
      const t = new Date(e.timestamp);
      return t >= start && t <= end;
    });
    if (filterActions.size > 0)
      list = list.filter((e) => filterActions.has(e.action));
    if (filterUser) list = list.filter((e) => e.userId === filterUser);
    if (filterModule.size > 0)
      list = list.filter((e) => filterModule.has(e.targetType));
    if (targetSearch.trim()) {
      const q = targetSearch.toLowerCase();
      list = list.filter(
        (e) =>
          (e.targetId || "").toLowerCase().includes(q) ||
          displayAuditText(e.targetName || "")
            .toLowerCase()
            .includes(q) ||
          displayAuditText(e.note || "")
            .toLowerCase()
            .includes(q) ||
          JSON.stringify(e.before ?? {})
            .toLowerCase()
            .includes(q) ||
          JSON.stringify(e.after ?? {})
            .toLowerCase()
            .includes(q),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          displayAuditText(e.userName).toLowerCase().includes(q) ||
          displayAuditText(e.targetName || "")
            .toLowerCase()
            .includes(q) ||
          (e.targetId || "").toLowerCase().includes(q) ||
          displayAuditText(e.note || "")
            .toLowerCase()
            .includes(q) ||
          JSON.stringify(e.before ?? {})
            .toLowerCase()
            .includes(q) ||
          JSON.stringify(e.after ?? {})
            .toLowerCase()
            .includes(q),
      );
    }
    // Sort newest first
    return [...list].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [
    auditLog,
    search,
    timeRange,
    customFrom,
    customTo,
    filterActions,
    filterUser,
    filterModule,
    targetSearch,
  ]);

  const visible = filtered.slice(0, visibleCount);
  const grouped = groupByDate(visible);
  const hasMore = visibleCount < filtered.length;

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((v) => v + BATCH_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  const toggleAction = useCallback((a: AuditAction) => {
    setFilterActions((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
    setVisibleCount(BATCH_SIZE);
  }, []);

  const toggleModule = useCallback((m: string) => {
    setFilterModule((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
    setVisibleCount(BATCH_SIZE);
  }, []);

  const clearAll = () => {
    setSearch("");
    setTimeRange("today");
    setCustomFrom("");
    setCustomTo("");
    setFilterActions(new Set());
    setFilterUser("");
    setUserSearchText("");
    setFilterModule(new Set());
    setTargetSearch("");
    setVisibleCount(BATCH_SIZE);
  };

  const openRelated = async (entry: AuditEntry) => {
    if (entry.targetType === "quote") {
      // BBG thương mại (server quotation): mở thẳng chi tiết BBG như deep-link /bao-gia/<id>.
      if (accessToken) {
        try {
          const bg = await layBaoGiaTheoIdService(entry.targetId, accessToken);
          const st = dungCuaHangTinhGia.getState();
          st.datBaoGiaDangSua(bg);
          st.datNguonWizard("list");
          dieuHuongMenuApp("tao-bao-gia");
          return;
        } catch (error) {
          console.warn("Không mở được báo giá thương mại từ nhật ký:", error);
        }
      }
      // Fallback: có trong lịch sử local (theo quotationId) → mở màn danh sách báo giá.
      const item = history.find(
        (h) =>
          h.id === entry.targetId ||
          h.pricingSheetId === entry.targetId ||
          h.quotationId === entry.targetId,
      );
      try {
        localStorage.setItem(
          "lts_navigate_filter",
          JSON.stringify({
            module: item?.isQuote ? "quote" : "pricing",
            targetId: item?.id ?? entry.targetId,
            ts: Date.now(),
          }),
        );
      } catch {}
      dieuHuongModuleApp("history_db");
      return;
    }
    if (entry.targetType === "history") {
      const item = history.find(
        (h) => h.id === entry.targetId || h.pricingSheetId === entry.targetId,
      );
      if (item && !item.isQuote) {
        const ok = await dungCuaHangTinhGia.getState().moBangTinhVoiPin(item.id);
        if (!ok) return;
        dieuHuongMenuApp(menuKeyTinhGiaTheoItem(item));
        return;
      }
      // Bảng tính giá từ server không có trong local → fetch rồi mở thẳng calculator
      if (!item && accessToken) {
        const ok = await taiBangTinhTuServer(entry.targetId);
        if (ok) {
          const loaded = dungCuaHangTinhGia.getState().history.find(
            (h) => h.id === entry.targetId || h.pricingSheetId === entry.targetId,
          );
          dieuHuongMenuApp(
            menuKeyTinhGiaTheoItem(loaded ?? { input: null }),
          );
          return;
        }
      }
      try {
        localStorage.setItem(
          "lts_navigate_filter",
          JSON.stringify({
            module: "pricing",
            targetId: item?.id ?? entry.targetId,
            ts: Date.now(),
          }),
        );
      } catch {}
      dieuHuongModuleApp("history_db");
      return;
    }
    if (entry.targetType === "customer") {
      try {
        localStorage.setItem(
          "lts_customer_focus",
          JSON.stringify({
            targetId: entry.targetId,
            targetName: entry.targetName,
            ts: Date.now(),
          }),
        );
      } catch {}
      dieuHuongModuleApp("customers");
      return;
    }
    if (entry.targetType === "order") {
      try {
        localStorage.setItem(
          "lts_navigate_filter",
          JSON.stringify({
            module: "lsx",
            targetId: entry.targetId,
            targetName: entry.targetName,
            ts: Date.now(),
          }),
        );
      } catch {}
      dieuHuongModuleApp("history_db");
      return;
    }
    if (entry.targetType === "config") dieuHuongModuleApp("master_data");
    if (entry.targetType === "permission") dieuHuongModuleApp("users");
  };

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (timeRange !== "today")
    activeChips.push({
      label: TIME_RANGE_LABELS[timeRange],
      clear: () => setTimeRange("today"),
    });
  if (filterUser) {
    const u = allUsers.find((u) => u.id === filterUser);
    activeChips.push({
      label: u?.name || filterUser,
      clear: () => {
        setFilterUser("");
        setUserSearchText("");
      },
    });
  }
  filterActions.forEach((a) =>
    activeChips.push({ label: ACTION_LABELS[a], clear: () => toggleAction(a) }),
  );
  filterModule.forEach((m) =>
    activeChips.push({
      label: TARGET_TYPE_LABELS[m] || m,
      clear: () => toggleModule(m),
    }),
  );
  if (targetSearch)
    activeChips.push({
      label: `Mục tiêu: ${targetSearch}`,
      clear: () => setTargetSearch(""),
    });

  return (
    <div className="crm-root audit-log-root">
      {/* ── Filter Bar ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Time range */}
          <select
            className="form-input"
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value as TimeRange);
              setVisibleCount(BATCH_SIZE);
            }}
            style={{ width: 140 }}
          >
            {Object.entries(TIME_RANGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="crm-search-box" style={{ flex: 1, minWidth: 180 }}>
            <Search size={14} className="crm-search-icon" />
            <input
              className="crm-search-input"
              placeholder="Tìm theo tên người dùng, tên khách hàng, mô tả..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(BATCH_SIZE);
              }}
            />
          </div>

          {/* Advanced toggle */}
          <button
            className={`btn btn-sm ${showAdvanced ? "btn-primary" : "btn-outline"}`}
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <Filter size={13} />
            Thêm bộ lọc
            {activeChips.length > 0 && (
              <span
                style={{
                  background: "var(--primary, #2563eb)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: "0.65rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeChips.length}
              </span>
            )}
          </button>

          <button
            className="btn btn-sm btn-outline"
            onClick={() => xuatNhatKyCsv()}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <Download size={13} /> Xuất CSV
          </button>
        </div>

        {/* Custom date range */}
        {timeRange === "custom" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Từ thời điểm:
            </span>
            <input
              type="datetime-local"
              className="form-input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ width: 180 }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Đến thời điểm:
            </span>
            <input
              type="datetime-local"
              className="form-input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
        )}

        {/* Advanced filters */}
        {showAdvanced && (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {/* Tài khoản thực hiện - Autocomplete */}
            {coQuyenXemNhatKyHeThong && (
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Tài khoản thực hiện
                </div>
                <input
                  ref={userInputRef}
                  className="form-input"
                  placeholder="Gõ tên hoặc mã nhân viên..."
                  value={userSearchText}
                  onChange={(e) => {
                    setUserSearchText(e.target.value);
                    setShowUserSuggestions(true);
                  }}
                  onFocus={() => setShowUserSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowUserSuggestions(false), 200)
                  }
                  style={{ width: "100%" }}
                />
                {filterUser && (
                  <button
                    onClick={() => {
                      setFilterUser("");
                      setUserSearchText("");
                      setVisibleCount(BATCH_SIZE);
                    }}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 24,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
                {showUserSuggestions && userSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "var(--surface, #fff)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      maxHeight: 160,
                      overflowY: "auto",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {userSuggestions.map((u) => (
                      <div
                        key={u.id}
                        onMouseDown={() => {
                          setFilterUser(u.id);
                          setUserSearchText(u.name);
                          setShowUserSuggestions(false);
                          setVisibleCount(BATCH_SIZE);
                        }}
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          background:
                            filterUser === u.id
                              ? "var(--primary-light, #dbeafe)"
                              : undefined,
                        }}
                      >
                        {u.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phân mục dữ liệu - Multi-select */}
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Phân mục dữ liệu
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {Object.entries(TARGET_TYPE_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filterModule.has(key)}
                      onChange={() => toggleModule(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Loại hành động - Grouped checkboxes */}
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Loại hành động
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                  fontStyle: "italic",
                }}
              >
                1. Thay đổi dữ liệu:
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}
              >
                {DATA_CHANGE_ACTIONS.map((a) => (
                  <label
                    key={a}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filterActions.has(a)}
                      onChange={() => toggleAction(a)}
                    />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                  fontStyle: "italic",
                }}
              >
                2. Thay đổi trạng thái:
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  paddingLeft: 4,
                }}
              >
                {STATUS_CHANGE_ACTIONS.map((a) => (
                  <label
                    key={a}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filterActions.has(a)}
                      onChange={() => toggleAction(a)}
                    />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>

            {/* Đối tượng mục tiêu - Text search */}
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Đối tượng mục tiêu
              </div>
              <input
                className="form-input"
                placeholder="Tên khách hàng, mô tả báo giá..."
                value={targetSearch}
                onChange={(e) => {
                  setTargetSearch(e.target.value);
                  setVisibleCount(BATCH_SIZE);
                }}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--muted)",
                  marginTop: 3,
                }}
              >
                Tìm theo tên hoặc mô tả dữ liệu
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Đang lọc:
            </span>
            {activeChips.map((c, i) => (
              <FilterChip key={i} label={c.label} onRemove={c.clear} />
            ))}
            <button
              onClick={clearAll}
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <XCircle size={12} /> Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* ── Count + refresh ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {filtered.length} bản ghi
        </span>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => taiNhatKyHeThong(true)}
          disabled={dangTaiNhatKy}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
          title="Tải lại nhật ký từ máy chủ"
        >
          <RefreshCw size={12} className={dangTaiNhatKy ? "lts-spin" : ""} />
          {dangTaiNhatKy ? "Đang tải..." : "Làm mới"}
        </button>
        {loiNhatKy && (
          <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>
            {loiNhatKy}
          </span>
        )}
      </div>

      {/* ── Read-only notice ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 16,
          fontSize: "0.78rem",
          color: "#0369a1",
        }}
      >
        <Lock size={13} />
        Nhật ký thao tác không thể chỉnh sửa hoặc xóa bởi bất kỳ ai, kể cả quản
        trị viên.
      </div>

      {/* ── Timeline ── */}
      {filtered.length === 0 ? (
        <div className="crm-empty">
          <Clock size={40} />
          <p>Không có thao tác nào trong khoảng thời gian này</p>
          <button className="btn btn-sm btn-outline" onClick={clearAll}>
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <ol
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          aria-live="polite"
        >
          {grouped.map(({ date, items }) => (
            <li key={date}>
              {/* Date separator */}
              <div
                role="heading"
                aria-level={3}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  padding: "4px 0 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{ flex: 1, height: 1, background: "var(--border)" }}
                />
                {date}
                <div
                  style={{ flex: 1, height: 1, background: "var(--border)" }}
                />
              </div>

              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    onOpen={openRelated}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {/* ── Infinite scroll loader ── */}
      {hasMore && (
        <div ref={loaderRef} style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 60,
                  borderRadius: 8,
                  background: "var(--border)",
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                  width: "100%",
                  maxWidth: 400,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: "Hôm nay",
  "7days": "7 ngày qua",
  "30days": "30 ngày qua",
  month: "Tháng này",
  custom: "Tùy chỉnh",
};
