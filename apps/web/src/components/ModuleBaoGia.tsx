"use client";
import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Clock, Building2, Calendar,
  Send, ShieldCheck, PackageCheck, Eye, Users, ChevronDown, ChevronRight,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { HistoryItem, QuoteStatus, OverrideTable } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const PIPELINE_STEPS: QuoteStatus[] = ['drafted', 'sent', 'pending_approval', 'approved', 'completed'];

// Bước Admin được phép xem & thao tác (không có drafted/sent vì đó là phía Sale)
const ADMIN_STEPS: QuoteStatus[] = ['pending_approval', 'approved', 'completed'];

const STEP_ICONS: Record<QuoteStatus, React.ReactNode> = {
  drafted:          <FileText size={13} />,
  sent:             <Send size={13} />,
  pending_approval: <Clock size={13} />,
  approved:         <ShieldCheck size={13} />,
  completed:        <PackageCheck size={13} />,
};

function getStatus(item: HistoryItem): QuoteStatus {
  // Luôn dùng quoteStatus tường minh; fallback 'drafted' nếu item cũ chưa có field này
  return item.quoteStatus ?? 'drafted';
}

// Một item "đã gửi lên admin" khi status >= pending_approval
function isSentToAdmin(item: HistoryItem): boolean {
  const s = getStatus(item);
  return s === 'pending_approval' || s === 'approved' || s === 'completed';
}

function fmt(n: number) { return n.toLocaleString('vi-VN'); }

// ── Override diff helpers ────────────────────────────────────────────────────
const ROW_KEY_LABELS: Record<string, string> = {
  print: 'In', 'lam-2': 'Ghép L2', 'lam-3': 'Ghép L3',
  'lam-4': 'Ghép L4', 'lam-5': 'Ghép L5', cut: 'Cắt',
};
const FIELD_LABELS: Record<string, string> = {
  width: 'Khổ', meters: 'Thành phẩm', waste: 'Phi hao',
  inputVL: 'Đầu vào VL', matPrice: 'CP vật liệu',
};

function countOverrides(ov?: OverrideTable): number {
  if (!ov) return 0;
  return Object.values(ov).reduce((s, r) => s + (r ? Object.keys(r).length : 0), 0);
}

function renderOverrideDiffs(ov: OverrideTable | undefined, groupClass: string, groupLabel: string) {
  if (!ov) return null;
  const entries = Object.entries(ov) as [string, Record<string, number>][];
  if (entries.length === 0) return null;
  return (
    <>
      <div className={`override-diff-group-title ${groupClass}`}>{groupLabel}</div>
      {entries.map(([rk, fields]) =>
        Object.entries(fields).map(([field, val]) => (
          <div key={`${rk}-${field}`} className="override-diff-item">
            <span className="diff-label">{ROW_KEY_LABELS[rk] || rk} · {FIELD_LABELS[field] || field}</span>
            <span className="diff-arrow">→</span>
            <span className="diff-new">{typeof val === 'number' ? val.toLocaleString('vi-VN') : val}</span>
          </div>
        ))
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN STATUS DROPDOWN — chỉ cho phép chọn trong ADMIN_STEPS
// ════════════════════════════════════════════════════════════
function AdminStatusDropdown({ item, onUpdate }: {
  item: HistoryItem;
  onUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = getStatus(item);
  const cfg = QUOTE_STATUS_CONFIG[current];

  return (
    <div className="qcard-status-dropdown-wrap" onClick={e => e.stopPropagation()}>
      <button
        className="qcard-status-trigger"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55' }}
        onClick={() => setOpen(v => !v)}
        title="Đổi trạng thái"
      >
        <span className="qcard-status-dot" style={{ background: cfg.color }} />
        <span className="qcard-status-trigger-icon">{STEP_ICONS[current]}</span>
        <span>{cfg.label}</span>
        <span className="qcard-status-trigger-caret">▾</span>
      </button>

      {open && (
        <>
          <div className="qcard-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="qcard-dropdown">
            {ADMIN_STEPS.map((step) => {
              const scfg = QUOTE_STATUS_CONFIG[step];
              const isActive = step === current;
              return (
                <button
                  key={step}
                  className={`qcard-dropdown-item ${isActive ? 'active' : ''}`}
                  onClick={() => { onUpdate(item.id, step); setOpen(false); }}
                >
                  <span className="qcard-dropdown-dot" style={{ background: scfg.color }} />
                  <span className="qcard-dropdown-icon">{STEP_ICONS[step]}</span>
                  <span className="qcard-dropdown-label">{scfg.label}</span>
                  <span className="qcard-dropdown-desc">{scfg.description}</span>
                  {isActive && <span className="qcard-dropdown-check">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE STATUS BADGE + NÚT GỬI ADMIN
// Seller chỉ có 2 hành động:
//   drafted → nút "Gửi Admin" → pending_approval
//   pending_approval / approved / completed → badge đọc-only
// ════════════════════════════════════════════════════════════
function SaleStatusControl({ item, onUpdate }: {
  item: HistoryItem;
  onUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const current = getStatus(item);
  const cfg = QUOTE_STATUS_CONFIG[current];

  if (current === 'drafted') {
    return (
      <div className="qcard-sale-controls" onClick={e => e.stopPropagation()}>
        {/* Badge đang soạn */}
        <span className="qcard-status-trigger"
          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55', cursor: 'default' }}>
          <span className="qcard-status-dot" style={{ background: cfg.color }} />
          <span className="qcard-status-trigger-icon">{STEP_ICONS[current]}</span>
          <span>{cfg.label}</span>
        </span>

        {/* Nút Gửi */}
        {!confirm ? (
          <button
            className="qcard-send-btn"
            onClick={() => setConfirm(true)}
            title="Gửi báo giá cho Admin duyệt"
          >
            <Send size={12} />
            Gửi Admin
          </button>
        ) : (
          <div className="qcard-send-confirm">
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Xác nhận gửi?</span>
            <button className="qcard-send-btn qcard-send-btn--yes"
              onClick={() => { onUpdate(item.id, 'pending_approval'); setConfirm(false); }}>
              ✓
            </button>
            <button className="qcard-send-btn qcard-send-btn--no"
              onClick={() => setConfirm(false)}>
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // Đã gửi → read-only badge
  return (
    <span
      className="qcard-status-trigger"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55', cursor: 'default' }}
      title={cfg.description}
    >
      <span className="qcard-status-dot" style={{ background: cfg.color }} />
      <span className="qcard-status-trigger-icon">{STEP_ICONS[current]}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION CARD — dùng chung, nhận control node từ ngoài
// ════════════════════════════════════════════════════════════
function QuotationCard({ item, onClick, statusControl }: {
  item: HistoryItem;
  onClick: () => void;
  statusControl: React.ReactNode;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const spreadMm  = item.dauVao.spreadWidth ? Math.round(item.dauVao.spreadWidth * 1000) : 0;
  const cutMm     = item.dauVao.cutStep     ? Math.round(item.dauVao.cutStep     * 1000) : 0;
  const sizeStr   = spreadMm && cutMm ? `${spreadMm} × ${cutMm} mm` : '—';
  const numColors = item.dauVao.numColors ?? 0;
  const shownPrice = item.chotGia && item.chotGia > 0 ? item.chotGia : item.finalPrice;
  const diff      = item.chotGia && item.chotGia > 0 ? item.chotGia - item.finalPrice : 0;
  const diffPct   = diff !== 0 && item.finalPrice > 0 ? (diff / item.finalPrice) * 100 : 0;
  const saleCount = countOverrides(item.ghiDeSale);
  const adminCount = countOverrides(item.ghiDeAdmin);
  const hasAnyOverrides = saleCount > 0 || adminCount > 0;

  return (
    <div className="quote-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={14} className="quote-icon" />
          <span className="quote-id">{item.date}</span>
        </div>
        {statusControl}
      </div>

      <div className="quote-body">
        <h3 className="quote-title">{item.productName || '—'}</h3>

        <div className="quote-meta">
          <div className="quote-meta-item">
            <Building2 size={13} style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.customer || '—'}</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr',
            background: 'var(--surface2)', padding: '10px 12px',
            borderRadius: '8px', gap: '5px', fontSize: '0.8rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Chất liệu:</span>
              <strong style={{ color: 'var(--text)', fontSize: '0.76rem' }}>{item.structure || '—'}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Kích thước:</span>
              <strong style={{ color: 'var(--text)' }}>{sizeStr}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Số lượng:</span>
              <span><strong style={{ color: 'var(--accent)' }}>{fmt(item.quantity)}</strong> túi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Màu in:</span>
              <span>{numColors > 0 ? `${numColors} màu` : 'Không in'}</span>
            </div>
          </div>

          <div className="quote-meta-item" style={{ marginTop: '4px' }}>
            <Calendar size={12} />
            <span style={{ fontSize: '0.76rem' }}>Ngày lập: {item.date}</span>
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '10px', marginTop: '6px', marginBottom: '10px', fontSize: '0.82rem',
        }}>
          <div>
            <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá đề xuất / túi</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(item.finalPrice)} đ</div>
          </div>
          {item.chotGia && item.chotGia > 0 ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt / túi</div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>
                {fmt(item.chotGia)} đ
                <span style={{ fontSize: '0.72rem', marginLeft: 4, color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  ({diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt</div>
              <div style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>Chưa chốt</div>
            </div>
          )}
        </div>

        <div className="quote-price-box">
          <div className="quote-price-label">Tổng giá trị ước tính</div>
          <div className="quote-price-value">
            {fmt(Math.round(shownPrice * item.quantity))} <span className="quote-currency">VNĐ</span>
          </div>
        </div>
      </div>

      {/* Override diff button */}
      {hasAnyOverrides && (
        <>
          <button className="override-diff-toggle"
            onClick={(e) => { e.stopPropagation(); setShowDiff(!showDiff); }}>
            {showDiff ? '▾ Ẩn thay đổi' : '▸ Xem thay đổi'}
            <span className="override-diff-count">{saleCount} Sale / {adminCount} Admin</span>
          </button>
          {showDiff && (
            <div className="override-diff-summary" onClick={e => e.stopPropagation()}>
              {renderOverrideDiffs(item.ghiDeSale, 'sale', '💼 Sale')}
              {renderOverrideDiffs(item.ghiDeAdmin, 'admin', '👑 Admin')}
            </div>
          )}
        </>
      )}

      <div className="quote-footer" style={{ justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem', gap: 4 }}>
        <Eye size={12} />
        Nhấn để mở bảng tính giá
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STATS BAR
// ════════════════════════════════════════════════════════════
function StatsBar({ items, isAdmin }: { items: HistoryItem[]; isAdmin: boolean }) {
  const steps = isAdmin ? ADMIN_STEPS : PIPELINE_STEPS;
  const counts = useMemo(() => {
    const c: Record<QuoteStatus, number> = { drafted: 0, sent: 0, pending_approval: 0, approved: 0, completed: 0 };
    items.forEach(h => { c[getStatus(h)]++; });
    return c;
  }, [items]);

  const revenue = items
    .filter(h => getStatus(h) === 'completed')
    .reduce((sum, h) => sum + (h.chotGia || h.finalPrice) * h.quantity, 0);

  return (
    <div className="quote-stats-overview">
      {steps.map(step => {
        const cfg = QUOTE_STATUS_CONFIG[step];
        return (
          <div key={step} className="quote-stat-card">
            <div className="quote-stat-val" style={{ color: cfg.color, fontSize: '1.5rem' }}>{counts[step]}</div>
            <div className="quote-stat-lbl">{cfg.label}</div>
          </div>
        );
      })}
      <div className="quote-stat-card quote-stat-card--total">
        <div className="quote-stat-val">{(revenue / 1_000_000).toFixed(1)}<small> Tr</small></div>
        <div className="quote-stat-lbl">Doanh thu (Hoàn thành)</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN VIEW — nhóm theo seller, chỉ thấy item đã gửi
// ════════════════════════════════════════════════════════════
function AdminView({ items, search, onOpen, onStatusUpdate }: {
  items: HistoryItem[];
  search: string;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    // Admin chỉ thấy item đã gửi (status != drafted)
    const visible = items.filter(isSentToAdmin);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? visible.filter(i =>
          i.customer.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          i.structure.toLowerCase().includes(q) ||
          (i.sellerName || '').toLowerCase().includes(q)
        )
      : visible;

    const map = new Map<string, { id: string; name: string; items: HistoryItem[] }>();
    filtered.forEach(item => {
      const sid = item.sellerId || 'unknown';
      const sname = item.sellerName || 'Không rõ';
      if (!map.has(sid)) map.set(sid, { id: sid, name: sname, items: [] });
      map.get(sid)!.items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Badge "chờ duyệt" count toàn bộ
  const pendingCount = items.filter(i => getStatus(i) === 'pending_approval').length;

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>
          {items.filter(isSentToAdmin).length === 0
            ? 'Chưa có báo giá nào được gửi lên.'
            : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner chờ duyệt */}
      {pendingCount > 0 && (
        <div className="qadmin-pending-banner">
          <Clock size={15} />
          <span>Có <strong>{pendingCount}</strong> báo giá đang chờ bạn duyệt</span>
        </div>
      )}

      {groups.map(group => {
        const isOpen = !collapsed[group.id];
        const pendingInGroup = group.items.filter(h => getStatus(h) === 'pending_approval').length;
        const groupRevenue = group.items
          .filter(h => getStatus(h) === 'completed')
          .reduce((s, h) => s + (h.chotGia || h.finalPrice) * h.quantity, 0);

        return (
          <div key={group.id} className="qgroup">
            <button className="qgroup-header" onClick={() => toggle(group.id)}>
              <span className="qgroup-icon"><Users size={16} /></span>
              <span className="qgroup-name">{group.name}</span>
              <span className="qgroup-count">{group.items.length} báo giá</span>
              {pendingInGroup > 0 && (
                <span className="qgroup-pending">{pendingInGroup} chờ duyệt</span>
              )}
              {groupRevenue > 0 && (
                <span className="qgroup-revenue">
                  {(groupRevenue / 1_000_000).toFixed(1)} Tr VNĐ
                </span>
              )}
              <span className="qgroup-chevron">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {isOpen && (
              <div className="quote-grid" style={{ padding: '12px 16px 16px' }}>
                {group.items.map(item => (
                  <QuotationCard
                    key={item.id}
                    item={item}
                    onClick={() => onOpen(item.id)}
                    statusControl={
                      <AdminStatusDropdown item={item} onUpdate={onStatusUpdate} />
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE VIEW — tất cả báo giá của mình, nút gửi khi drafted
// ════════════════════════════════════════════════════════════
function SaleView({ items, search, onOpen, onStatusUpdate }: {
  items: HistoryItem[];
  search: string;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.customer.toLowerCase().includes(q) ||
      i.productName.toLowerCase().includes(q) ||
      i.structure.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>{items.length === 0
          ? 'Bạn chưa có báo giá nào. Hãy lưu bảng tính giá đầu tiên!'
          : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div className="quote-grid">
      {filtered.map(item => (
        <QuotationCard
          key={item.id}
          item={item}
          onClick={() => onOpen(item.id)}
          statusControl={
            <SaleStatusControl item={item} onUpdate={onStatusUpdate} />
          }
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({ role }: { role: string; currentSellerId?: string }) {
  const { history, taiLichSu, datPhan, capNhatTrangThaiDon, currentSellerId } = dungCuaHangTinhGia();
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin';

  const myItems = useMemo(() =>
    isAdmin ? history : history.filter(h => h.sellerId === currentSellerId),
    [history, isAdmin, currentSellerId]
  );

  // Stats cho admin: chỉ đếm item đã gửi
  const statsItems = isAdmin ? history.filter(isSentToAdmin) : myItems;

  const handleOpen = (id: string) => {
    taiLichSu(id);
    datPhan('calculator');
  };

  return (
    <div className="crm-root quote-root">
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder={isAdmin ? 'Tìm theo seller, khách hàng, sản phẩm...' : 'Tìm khách hàng, sản phẩm, chất liệu...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="crm-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        {isAdmin && (
          <div className="crm-toolbar-right">
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0 8px', whiteSpace: 'nowrap' }}>
              👑 Xem theo Seller
            </span>
          </div>
        )}
      </div>

      <StatsBar items={statsItems} isAdmin={isAdmin} />

      <div className="crm-list quote-list-container">
        {isAdmin ? (
          <AdminView
            items={history}
            search={search}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        ) : (
          <SaleView
            items={myItems}
            search={search}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        )}
      </div>
    </div>
  );
}
