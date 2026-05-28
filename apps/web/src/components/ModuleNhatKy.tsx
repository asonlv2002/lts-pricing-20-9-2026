"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, Download, Clock, User, FileText, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, Send, Check, X, Mail, Lock, RotateCcw, Factory, Filter, XCircle
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { AuditAction, AuditEntry } from '../lib/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  lock: 'Khóa',
  unlock: 'Mở khóa',
  status_change: 'Đổi trạng thái',
  override_change: 'Thay đổi override',
  assign: 'Phân công',
  version_restore: 'Khôi phục',
  duplicate: 'Sao chép',
  send_approval: 'Gửi duyệt',
  approve: 'Duyệt',
  reject: 'Từ chối / Trả về',
  send_customer: 'Gửi khách hàng',
  create_lsx: 'Tạo LSX',
  restore: 'Khôi phục',
};

const ACTION_CONFIG: Record<AuditAction, { icon: React.ReactNode; color: string; bg: string }> = {
  create:          { icon: <Plus size={13} />,        color: '#059669', bg: '#d1fae5' },
  update:          { icon: <Pencil size={13} />,      color: '#2563eb', bg: '#dbeafe' },
  delete:          { icon: <Trash2 size={13} />,      color: '#dc2626', bg: '#fee2e2' },
  lock:            { icon: <Lock size={13} />,        color: '#374151', bg: '#f3f4f6' },
  unlock:          { icon: <Lock size={13} />,        color: '#7c3aed', bg: '#ede9fe' },
  status_change:   { icon: <Check size={13} />,       color: '#4f46e5', bg: '#e0e7ff' },
  override_change: { icon: <Pencil size={13} />,      color: '#0891b2', bg: '#cffafe' },
  assign:          { icon: <User size={13} />,        color: '#7c3aed', bg: '#ede9fe' },
  version_restore: { icon: <RotateCcw size={13} />,   color: '#d97706', bg: '#fef3c7' },
  duplicate:       { icon: <FileText size={13} />,    color: '#0d9488', bg: '#ccfbf1' },
  send_approval:  { icon: <Send size={13} />,        color: '#4f46e5', bg: '#e0e7ff' },
  approve:        { icon: <Check size={13} />,       color: '#059669', bg: '#d1fae5' },
  reject:         { icon: <X size={13} />,           color: '#dc2626', bg: '#fee2e2' },
  send_customer:  { icon: <Mail size={13} />,        color: '#7c3aed', bg: '#ede9fe' },
  create_lsx:     { icon: <Factory size={13} />,     color: '#0d9488', bg: '#ccfbf1' },
  restore:        { icon: <RotateCcw size={13} />,   color: '#d97706', bg: '#fef3c7' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  history: 'Bảng tính giá',
  quote: 'Báo giá',
  customer: 'Khách hàng',
  order: 'Lệnh sản xuất',
  config: 'Cấu hình',
};

const BATCH_SIZE = 20;

type TimeRange = 'today' | '7days' | '30days' | 'month' | 'custom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(entries: AuditEntry[]): Array<{ date: string; items: AuditEntry[] }> {
  const map = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const d = formatDate(e.timestamp);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function getTimeRangeBounds(range: TimeRange, customFrom?: string, customTo?: string): [Date, Date] {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === '7days') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === '30days') {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'custom') {
    return [
      customFrom ? new Date(customFrom) : new Date(0),
      customTo ? new Date(customTo) : end,
    ];
  }
  return [start, end];
}

// ─── DiffView ────────────────────────────────────────────────────────────────

function DiffView({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  if (!before && !after) return null;
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  if (keys.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {keys.map(k => {
        const oldVal = before?.[k];
        const newVal = after?.[k];
        if (oldVal === newVal) return null;
        return (
          <div key={k} style={{ marginBottom: 6, fontSize: '0.78rem' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 2, fontWeight: 500 }}>{k}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {oldVal !== undefined && (
                <div style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}
                  aria-label={`Giá trị cũ: ${String(oldVal)}`}>
                  − {String(oldVal)}
                </div>
              )}
              {newVal !== undefined && (
                <div style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: 4 }}
                  aria-label={`Giá trị mới: ${String(newVal)}`}>
                  + {String(newVal)}
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

function TimelineEntry({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[entry.action];
  const hasDiff = !!(entry.before || entry.after || entry.note);

  return (
    <li style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
      {/* Timeline line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: cfg.bg, color: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${cfg.color}40`, flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        <div style={{ width: 1.5, flex: 1, background: 'var(--border)', marginTop: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(entry.timestamp)}
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)' }}>
            {entry.userName}
          </span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '1px 7px', borderRadius: 10,
            background: cfg.bg, color: cfg.color,
          }}>
            {ACTION_LABELS[entry.action]}
          </span>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--foreground)' }}>
            <span style={{ color: 'var(--muted)' }}>
              {TARGET_TYPE_LABELS[entry.targetType] || entry.targetType}:
            </span>{' '}
            <span style={{ fontWeight: 500 }}>{entry.targetName || entry.targetId}</span>
          </div>

          {entry.note && (
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
              {entry.note}
            </div>
          )}

          {hasDiff && (entry.before || entry.after) && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết thay đổi'}
            </button>
          )}

          {expanded && <DiffView before={entry.before} after={entry.after} />}
        </div>
      </div>
    </li>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--primary-light, #dbeafe)', color: 'var(--primary, #2563eb)',
      borderRadius: 12, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 500,
    }}>
      {label}
      <button
        onClick={onRemove}
        aria-label={`Xóa bộ lọc ${label}`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModuleNhatKy() {
  const { auditLog, xuatNhatKyCsv } = dungCuaHangTinhGia();

  // Filters
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterActions, setFilterActions] = useState<Set<AuditAction>>(new Set());
  const [filterUser, setFilterUser] = useState('');
  const [filterModule, setFilterModule] = useState<Set<string>>(new Set());
  const [filterIp, setFilterIp] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Unique users for filter
  const allUsers = useMemo(() => {
    const seen = new Set<string>();
    return auditLog.filter(e => {
      if (seen.has(e.userId)) return false;
      seen.add(e.userId);
      return true;
    }).map(e => ({ id: e.userId, name: e.userName }));
  }, [auditLog]);

  // Unique modules
  const allModules = useMemo(() => {
    const seen = new Set<string>();
    auditLog.forEach(e => seen.add(e.targetType));
    return Array.from(seen);
  }, [auditLog]);

  const filtered = useMemo(() => {
    const [start, end] = getTimeRangeBounds(timeRange, customFrom, customTo);
    let list = auditLog.filter(e => {
      const t = new Date(e.timestamp);
      return t >= start && t <= end;
    });
    if (filterActions.size > 0) list = list.filter(e => filterActions.has(e.action));
    if (filterUser) list = list.filter(e => e.userId === filterUser);
    if (filterModule.size > 0) list = list.filter(e => filterModule.has(e.targetType));
    if (filterIp.trim()) {
      const q = filterIp.toLowerCase();
      list = list.filter(e => (e.ipAddress || '').toLowerCase().includes(q) || (e.device || '').toLowerCase().includes(q));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.userName.toLowerCase().includes(q) ||
        (e.targetName || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
      );
    }
    // Sort newest first
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLog, search, timeRange, customFrom, customTo, filterActions, filterUser, filterModule, filterIp]);

  const visible = filtered.slice(0, visibleCount);
  const grouped = groupByDate(visible);
  const hasMore = visibleCount < filtered.length;

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setVisibleCount(v => v + BATCH_SIZE);
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  const toggleAction = useCallback((a: AuditAction) => {
    setFilterActions(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
    setVisibleCount(BATCH_SIZE);
  }, []);

  const toggleModule = useCallback((m: string) => {
    setFilterModule(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
    setVisibleCount(BATCH_SIZE);
  }, []);

  const clearAll = () => {
    setSearch('');
    setTimeRange('7days');
    setCustomFrom('');
    setCustomTo('');
    setFilterActions(new Set());
    setFilterUser('');
    setFilterModule(new Set());
    setFilterIp('');
    setVisibleCount(BATCH_SIZE);
  };

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (timeRange !== '7days') activeChips.push({ label: TIME_RANGE_LABELS[timeRange], clear: () => setTimeRange('7days') });
  if (filterUser) {
    const u = allUsers.find(u => u.id === filterUser);
    activeChips.push({ label: u?.name || filterUser, clear: () => setFilterUser('') });
  }
  filterActions.forEach(a => activeChips.push({ label: ACTION_LABELS[a], clear: () => toggleAction(a) }));
  filterModule.forEach(m => activeChips.push({ label: TARGET_TYPE_LABELS[m] || m, clear: () => toggleModule(m) }));
  if (filterIp) activeChips.push({ label: `IP: ${filterIp}`, clear: () => setFilterIp('') });

  return (
    <div className="crm-root">
      {/* ── Filter Bar ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Time range */}
          <select
            className="form-input"
            value={timeRange}
            onChange={e => { setTimeRange(e.target.value as TimeRange); setVisibleCount(BATCH_SIZE); }}
            style={{ width: 140 }}
          >
            {Object.entries(TIME_RANGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Search */}
          <div className="crm-search-box" style={{ flex: 1, minWidth: 180 }}>
            <Search size={14} className="crm-search-icon" />
            <input
              className="crm-search-input"
              placeholder="Tìm mã BG, KH, tên SP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(BATCH_SIZE); }}
            />
          </div>

          {/* Advanced toggle */}
          <button
            className={`btn btn-sm ${showAdvanced ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowAdvanced(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Filter size={13} />
            Thêm bộ lọc
            {activeChips.length > 0 && (
              <span style={{
                background: 'var(--primary, #2563eb)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeChips.length}
              </span>
            )}
          </button>

          <button className="btn btn-sm btn-outline" onClick={() => xuatNhatKyCsv()} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} /> Xuất CSV
          </button>
        </div>

        {/* Custom date range */}
        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Từ:</span>
            <input type="datetime-local" className="form-input" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)} style={{ width: 180 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Đến:</span>
            <input type="datetime-local" className="form-input" value={customTo}
              onChange={e => setCustomTo(e.target.value)} style={{ width: 180 }} />
          </div>
        )}

        {/* Advanced filters */}
        {showAdvanced && (
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* User filter */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>Người thực hiện</div>
              <select className="form-input" value={filterUser}
                onChange={e => { setFilterUser(e.target.value); setVisibleCount(BATCH_SIZE); }}
                style={{ width: 180 }}>
                <option value="">Tất cả</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Module filter */}
            {allModules.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>Phân mục dữ liệu</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allModules.map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={filterModule.has(m)}
                        onChange={() => toggleModule(m)} />
                      {TARGET_TYPE_LABELS[m] || m}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action type filter */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>Loại hành động</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {(Object.keys(ACTION_LABELS) as AuditAction[]).map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filterActions.has(a)} onChange={() => toggleAction(a)} />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>

            {/* IP / Device filter */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>IP / Thiết bị</div>
              <input
                className="form-input"
                placeholder="VD: 192.168.1, Windows, iPhone..."
                value={filterIp}
                onChange={e => { setFilterIp(e.target.value); setVisibleCount(BATCH_SIZE); }}
                style={{ width: 220 }}
              />
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Đang lọc:</span>
            {activeChips.map((c, i) => <FilterChip key={i} label={c.label} onRemove={c.clear} />)}
            <button onClick={clearAll} style={{
              fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <XCircle size={12} /> Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* ── Count ── */}
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
        {filtered.length} bản ghi
      </div>

      {/* ── Read-only notice ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
        padding: '8px 12px', marginBottom: 16, fontSize: '0.78rem', color: '#0369a1',
      }}>
        <Lock size={13} />
        Nhật ký thao tác không thể chỉnh sửa hoặc xóa bởi bất kỳ ai, kể cả quản trị viên.
      </div>

      {/* ── Timeline ── */}
      {filtered.length === 0 ? (
        <div className="crm-empty">
          <Clock size={40} />
          <p>Không có thao tác nào trong khoảng thời gian này</p>
          <button className="btn btn-sm btn-outline" onClick={clearAll}>Xóa bộ lọc</button>
        </div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-live="polite">
          {grouped.map(({ date, items }) => (
            <li key={date}>
              {/* Date separator */}
              <div
                role="heading"
                aria-level={3}
                style={{
                  fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)',
                  padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                {date}
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map(entry => <TimelineEntry key={entry.id} entry={entry} />)}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {/* ── Infinite scroll loader ── */}
      {hasMore && (
        <div ref={loaderRef} style={{ padding: '16px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 60, borderRadius: 8, background: 'var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
                width: '100%', maxWidth: 400,
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Hôm nay',
  '7days': '7 ngày qua',
  '30days': '30 ngày qua',
  month: 'Tháng này',
  custom: 'Tùy chỉnh',
};




