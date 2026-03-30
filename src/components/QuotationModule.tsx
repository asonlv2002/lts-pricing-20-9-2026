"use client";
import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Clock, Building2, Calendar,
  Send, ShieldCheck, PackageCheck, Eye, Users, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useCalculatorStore } from '../store/calculatorStore';
import type { HistoryItem, QuoteStatus } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const PIPELINE_STEPS: QuoteStatus[] = ['drafted', 'sent', 'pending_approval', 'approved', 'completed'];

const STEP_ICONS: Record<QuoteStatus, React.ReactNode> = {
  drafted:          <FileText size={13} />,
  sent:             <Send size={13} />,
  pending_approval: <Clock size={13} />,
  approved:         <ShieldCheck size={13} />,
  completed:        <PackageCheck size={13} />,
};

function getStatus(item: HistoryItem): QuoteStatus {
  if (item.quoteStatus) return item.quoteStatus;
  return item.chotGia && item.chotGia > 0 ? 'completed' : 'drafted';
}

function fmt(n: number) { return n.toLocaleString('vi-VN'); }

// ════════════════════════════════════════════════════════════
// STATUS DROPDOWN
// ════════════════════════════════════════════════════════════
function StatusDropdown({ item, onUpdate, readonly }: {
  item: HistoryItem;
  onUpdate: (id: string, status: QuoteStatus) => void;
  readonly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = getStatus(item);
  const cfg = QUOTE_STATUS_CONFIG[current];

  if (readonly) {
    return (
      <span
        className="qcard-status-trigger"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55', cursor: 'default' }}
      >
        <span className="qcard-status-dot" style={{ background: cfg.color }} />
        <span className="qcard-status-trigger-icon">{STEP_ICONS[current]}</span>
        <span>{cfg.label}</span>
      </span>
    );
  }

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
            {PIPELINE_STEPS.map((step) => {
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
// QUOTATION CARD
// ════════════════════════════════════════════════════════════
function QuotationCard({ item, onClick, onStatusUpdate, readonly }: {
  item: HistoryItem;
  onClick: () => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
  readonly?: boolean;
}) {
  const spreadMm  = item.input.spreadWidth ? Math.round(item.input.spreadWidth * 1000) : 0;
  const cutMm     = item.input.cutStep     ? Math.round(item.input.cutStep     * 1000) : 0;
  const sizeStr   = spreadMm && cutMm ? `${spreadMm} × ${cutMm} mm` : '—';
  const numColors = item.input.numColors ?? 0;
  const shownPrice = item.chotGia && item.chotGia > 0 ? item.chotGia : item.finalPrice;
  const diff      = item.chotGia && item.chotGia > 0 ? item.chotGia - item.finalPrice : 0;
  const diffPct   = diff !== 0 && item.finalPrice > 0 ? (diff / item.finalPrice) * 100 : 0;

  return (
    <div className="quote-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={14} className="quote-icon" />
          <span className="quote-id">{item.date}</span>
        </div>
        <StatusDropdown item={item} onUpdate={onStatusUpdate} readonly={readonly} />
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
function StatsBar({ items }: { items: HistoryItem[] }) {
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
      {PIPELINE_STEPS.map(step => {
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
// ADMIN VIEW — nhóm theo seller, có thể đổi trạng thái
// ════════════════════════════════════════════════════════════
function AdminView({ items, search, onOpen, onStatusUpdate }: {
  items: HistoryItem[];
  search: string;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Nhóm theo sellerId
  const groups = useMemo(() => {
    const filtered = search.trim()
      ? items.filter(i =>
          i.customer.toLowerCase().includes(search.toLowerCase()) ||
          i.productName.toLowerCase().includes(search.toLowerCase()) ||
          i.structure.toLowerCase().includes(search.toLowerCase())
        )
      : items;

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

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>{items.length === 0 ? 'Chưa có báo giá nào.' : 'Không có báo giá phù hợp.'}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map(group => {
        const isOpen = !collapsed[group.id];
        const groupRevenue = group.items
          .filter(h => getStatus(h) === 'completed')
          .reduce((s, h) => s + (h.chotGia || h.finalPrice) * h.quantity, 0);

        return (
          <div key={group.id} className="qgroup">
            {/* Group header */}
            <button className="qgroup-header" onClick={() => toggle(group.id)}>
              <span className="qgroup-icon"><Users size={16} /></span>
              <span className="qgroup-name">{group.name}</span>
              <span className="qgroup-count">{group.items.length} báo giá</span>
              {groupRevenue > 0 && (
                <span className="qgroup-revenue">
                  {(groupRevenue / 1_000_000).toFixed(1)} Tr VNĐ
                </span>
              )}
              <span className="qgroup-chevron">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {/* Group cards */}
            {isOpen && (
              <div className="quote-grid" style={{ padding: '12px 0 0' }}>
                {group.items.map(item => (
                  <QuotationCard
                    key={item.id}
                    item={item}
                    onClick={() => onOpen(item.id)}
                    onStatusUpdate={onStatusUpdate}
                    readonly={false}
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
// SALE VIEW — chỉ xem báo giá của mình, không đổi trạng thái
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
          : 'Không có báo giá phù hợp.'
        }</p>
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
          onStatusUpdate={onStatusUpdate}
          readonly={true}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({ role }: { role: string; currentSellerId?: string }) {
  const { history, loadHistoryItem, setActiveModule, updateQuoteStatus, currentSellerId } = useCalculatorStore();
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin';

  // Sale chỉ thấy báo giá của mình
  const myItems = useMemo(() =>
    isAdmin ? history : history.filter(h => h.sellerId === currentSellerId),
    [history, isAdmin, currentSellerId]
  );

  const handleOpen = (id: string) => {
    loadHistoryItem(id);
    setActiveModule('calculator');
  };

  return (
    <div className="crm-root quote-root">
      {/* TOOLBAR */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm khách hàng, sản phẩm, chất liệu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="crm-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        {isAdmin && (
          <div className="crm-toolbar-right">
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0 8px' }}>
              👑 Xem tất cả — nhóm theo Seller
            </span>
          </div>
        )}
      </div>

      {/* STATS */}
      <StatsBar items={myItems} />

      {/* LIST */}
      <div className="crm-list quote-list-container">
        {isAdmin ? (
          <AdminView
            items={history}
            search={search}
            onOpen={handleOpen}
            onStatusUpdate={updateQuoteStatus}
          />
        ) : (
          <SaleView
            items={myItems}
            search={search}
            onOpen={handleOpen}
            onStatusUpdate={updateQuoteStatus}
          />
        )}
      </div>
    </div>
  );
}
