  "use client";
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, Database, RotateCcw, Trash2, ClipboardList, Download, Copy,
  Lock, Unlock, Eye, Filter, X, XCircle, ChevronUp, ChevronDown,
  FileText, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { HistoryItem, QuoteStatus } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';
import LSXFormModal from './ModalDonLSX';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dinhDangSo(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function doiNgayVnSangMs(date?: string): number {
  if (!date) return 0;
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function namTrongKhoangNgay(item: HistoryItem, tuNgay: string, denNgay: string): boolean {
  const ms = doiNgayVnSangMs(item.date);
  if (!ms) return true;
  if (tuNgay && ms < new Date(tuNgay).setHours(0, 0, 0, 0)) return false;
  if (denNgay && ms > new Date(denNgay).setHours(23, 59, 59, 999)) return false;
  return true;
}

type SortKey = 'date' | 'customer' | 'productName' | 'finalPrice' | 'quoteStatus';
type SortDir = 'asc' | 'desc';
type ToggleMode = 'pricing' | 'quote';
type TimeRange = '3days' | '7days' | '30days' | 'custom';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '3days': '3 ngày gần nhất',
  '7days': '7 ngày gần nhất',
  '30days': '30 ngày gần nhất',
  custom: 'Tùy chỉnh',
};

const PRICING_STATUS_OPTIONS = [
  { value: 'draft', label: 'Đang nháp' },
  { value: 'chot', label: 'Đã chốt chi phí' },
  { value: 'used', label: 'Đã dùng tạo báo giá' },
  { value: 'locked', label: 'Đã khóa' },
];

const QUOTE_STATUS_OPTIONS: QuoteStatus[] = ['drafted', 'sent', 'pending_approval', 'approved', 'completed', 'cancelled', 'expired'];

function getPricingStatus(h: HistoryItem): string {
  if (h.locked) return 'locked';
  if (h.quoteCode) return 'used';
  if (h.chotGia && h.chotGia > 0) return 'chot';
  return 'draft';
}

const PRICING_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:   { label: 'Đang nháp',           color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  chot:    { label: 'Đã chốt chi phí',     color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  used:    { label: 'Đã dùng tạo báo giá', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  locked:  { label: 'Đã khóa',             color: '#374151', bg: 'rgba(55,65,81,0.1)' },
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, mode }: { status: string; mode: ToggleMode }) {
  const cfg = mode === 'pricing'
    ? PRICING_STATUS_CONFIG[status] ?? PRICING_STATUS_CONFIG.draft
    : QUOTE_STATUS_CONFIG[status as QuoteStatus] ?? QUOTE_STATUS_CONFIG.drafted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      ● {cfg.label}
    </span>
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
      <button onClick={onRemove} aria-label={`Xóa bộ lọc ${label}`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}>
        <X size={11} />
      </button>
    </span>
  );
}

// ─── SortHeader ───────────────────────────────────────────────────────────────

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      aria-label={`Sắp xếp theo ${label}`}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active
          ? (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
          : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  );
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

function DetailPanel({
  item, mode, onClose, onLoad, onLSX, onNavigate
}: {
  item: HistoryItem; mode: ToggleMode;
  onClose: () => void;
  onLoad: (id: string) => void;
  onLSX: (item: HistoryItem) => void;
  onNavigate?: (module: 'calculator') => void;
}) {
  const status = mode === 'pricing' ? getPricingStatus(item) : (item.quoteStatus ?? 'drafted');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40,
        }}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'pricing' ? `Bảng tính giá ${item.id}` : `Báo giá ${item.quoteCode || item.id}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(60%, 640px)', background: 'var(--background)',
          borderLeft: '1px solid var(--border)', zIndex: 50,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>
              {mode === 'pricing' ? 'BẢNG TÍNH GIÁ' : 'BÁO GIÁ'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {mode === 'pricing' ? item.id : (item.quoteCode || item.id)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Status + date */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <StatusBadge status={status} mode={mode} />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.date}</span>
          </div>

          {/* Info sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoSection title="Thông tin chung">
              <InfoRow label="Khách hàng" value={item.customer || '—'} />
              <InfoRow label="Sản phẩm" value={item.productName || '—'} />
              <InfoRow label="Cấu trúc" value={item.structure || '—'} mono />
              <InfoRow label="Số lượng" value={`${dinhDangSo(item.quantity)} cái`} />
              {item.sellerName && <InfoRow label="Sale" value={item.sellerName} />}
            </InfoSection>

            <InfoSection title="Kết quả tính giá">
              <InfoRow label="Giá thành" value={`${dinhDangSo(item.finalPrice)} ₫`} bold />
              {item.chotGia && item.chotGia > 0 && (
                <InfoRow label="Giá chốt" value={`${dinhDangSo(item.chotGia)} ₫`} bold color="var(--green, #059669)" />
              )}
            </InfoSection>

            {mode === 'quote' && item.tiers && item.tiers.length > 0 && (
              <InfoSection title="Bảng giá báo">
                {item.tiers.map((tier, i) => (
                  <InfoRow key={i}
                    label={`${dinhDangSo(tier.quantity)} cái`}
                    value={`${dinhDangSo(tier.chotGia ?? tier.finalPrice ?? 0)} ₫`}
                  />
                ))}
              </InfoSection>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          background: 'var(--surface)',
        }}>
          <button className="btn btn-sm btn-outline" onClick={() => { onLoad(item.id); onNavigate?.('calculator'); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RotateCcw size={13} /> Tải lại
          </button>
          {item.chotGia && item.chotGia > 0 && (
            <button className="btn btn-sm btn-outline" onClick={() => { onLSX(item); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <ClipboardList size={13} /> Tạo LSX
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: 'var(--surface)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, bold, color }: { label: string; value: string; mono?: boolean; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.82rem' }}>
      <span style={{ color: 'var(--muted)', minWidth: 110, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontFamily: mono ? "'Courier New', monospace" : undefined, fontWeight: bold ? 600 : undefined, color: color || 'var(--foreground)' }}>
        {value}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function ModuleLichSuDB({ khiDieuHuong, menuDangChon }: { khiDieuHuong?: (module: 'calculator') => void; menuDangChon?: string }) {
  const { history: lichSu, loadHistoryItem: taiLichSu, removeHistoryItem: xoaLichSu } = dungCuaHangTinhGia();

  // Toggle
  const [mode, setMode] = useState<ToggleMode>('pricing');

  // Filters
  const [tuKhoa, datTuKhoa] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [tuNgay, datTuNgay] = useState('');
  const [denNgay, datDenNgay] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterBagType, setFilterBagType] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check for navigation filter from customer module
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lts_navigate_filter');
      if (raw) {
        const nav = JSON.parse(raw);
        localStorage.removeItem('lts_navigate_filter');
        if (nav.customerName) setFilterCustomer(nav.customerName);
        if (nav.module === 'quote') setMode('quote');
      }
    } catch {}
  }, []);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Detail panel
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // LSX modal
  const [mucLsx, datMucLsx] = useState<HistoryItem | null>(null);

  // Lock state
  const [sanPhamKhoa, datSanPhamKhoa] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(window.localStorage.getItem('lts_locked_products') || '{}'); } catch { return {}; }
  });

  const laLichSuSanPhamTheoKhach = menuDangChon === 'customers.product_history';

  const khoaSanPham = (key: string) => datSanPhamKhoa(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { window.localStorage.setItem('lts_locked_products', JSON.stringify(next)); } catch {}
    return next;
  });

  // Time range bounds
  const [startDate, endDate] = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    if (timeRange === '3days') { start.setDate(start.getDate() - 2); start.setHours(0, 0, 0, 0); }
    else if (timeRange === '7days') { start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); }
    else if (timeRange === '30days') { start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0); }
    else if (timeRange === 'custom') {
      return [tuNgay ? new Date(tuNgay) : new Date(0), denNgay ? new Date(denNgay) : end];
    }
    return [start, end];
  }, [timeRange, tuNgay, denNgay]);

  const filtered = useMemo(() => {
    let list = lichSu.filter(h => {
      // Mode filter: pricing = no quoteCode or has chotGia; quote = has quoteCode or quoteStatus
      if (mode === 'quote') return !!(h.quoteCode || h.quoteStatus);
      return true; // pricing shows all
    });

    // Time range
    list = list.filter(h => {
      const ms = doiNgayVnSangMs(h.date);
      if (!ms) return true;
      return ms >= startDate.getTime() && ms <= endDate.getTime();
    });

    // Status filter
    if (filterStatuses.size > 0) {
      list = list.filter(h => {
        const s = mode === 'pricing' ? getPricingStatus(h) : (h.quoteStatus ?? 'drafted');
        return filterStatuses.has(s);
      });
    }

    // Text search
    if (tuKhoa.trim()) {
      const q = tuKhoa.toLowerCase();
      list = list.filter(h =>
        h.customer.toLowerCase().includes(q) ||
        h.productName.toLowerCase().includes(q) ||
        h.structure.toLowerCase().includes(q) ||
        (h.quoteCode || '').toLowerCase().includes(q)
      );
    }
    if (filterCustomer) activeChips.push({ label: 'KH: ' + filterCustomer, clear: () => setFilterCustomer('') });
    if (filterProduct.trim()) list = list.filter(h => h.productName.toLowerCase().includes(filterProduct.toLowerCase()));
    if (filterSeller) activeChips.push({ label: 'Sale: ' + filterSeller, clear: () => setFilterSeller('') });
    if (filterMaterial) activeChips.push({ label: 'VL: ' + filterMaterial, clear: () => setFilterMaterial('') });
    if (filterBagType) activeChips.push({ label: 'QC: ' + filterBagType, clear: () => setFilterBagType('') });

    // Sort
    list = [...list].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sortKey === 'date') { va = doiNgayVnSangMs(a.date); vb = doiNgayVnSangMs(b.date); }
      else if (sortKey === 'customer') { va = a.customer; vb = b.customer; }
      else if (sortKey === 'productName') { va = a.productName; vb = b.productName; }
      else if (sortKey === 'finalPrice') { va = a.finalPrice; vb = b.finalPrice; }
      else if (sortKey === 'quoteStatus') { va = a.quoteStatus ?? ''; vb = b.quoteStatus ?? ''; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return list;
  }, [lichSu, mode, tuKhoa, filterStatuses, filterCustomer, filterProduct, filterSeller, filterMaterial, filterBagType, startDate, endDate, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = useCallback((k: SortKey) => {
    setSortKey(prev => {
      if (prev === k) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return k; }
      setSortDir('asc'); return k;
    });
    setPage(0);
  }, []);

  const toggleStatus = useCallback((s: string) => {
    setFilterStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
    setPage(0);
  }, []);

  const clearAll = () => {
    datTuKhoa(''); setTimeRange('7days'); datTuNgay(''); datDenNgay('');
    setFilterStatuses(new Set()); setFilterCustomer(''); setFilterProduct(''); setFilterSeller(''); setFilterMaterial(''); setFilterBagType(''); setPage(0);
  };

  // Active chips
  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (timeRange !== '7days') activeChips.push({ label: TIME_RANGE_LABELS[timeRange], clear: () => setTimeRange('7days') });
  filterStatuses.forEach(s => {
    const cfg = mode === 'pricing' ? PRICING_STATUS_CONFIG[s] : QUOTE_STATUS_CONFIG[s as QuoteStatus];
    activeChips.push({ label: cfg?.label ?? s, clear: () => toggleStatus(s) });
  });
  if (filterCustomer) activeChips.push({ label: 'KH: ' + filterCustomer, clear: () => setFilterCustomer('') });
  if (filterProduct) activeChips.push({ label: 'SP: ' + filterProduct, clear: () => setFilterProduct('') });
  if (filterSeller) activeChips.push({ label: 'Sale: ' + filterSeller, clear: () => setFilterSeller('') });
  if (filterMaterial) activeChips.push({ label: 'VL: ' + filterMaterial, clear: () => setFilterMaterial('') });
  if (filterBagType) activeChips.push({ label: 'QC: ' + filterBagType, clear: () => setFilterBagType('') });

  const statusOptions = mode === 'pricing' ? PRICING_STATUS_OPTIONS : QUOTE_STATUS_OPTIONS.map(s => ({ value: s, label: QUOTE_STATUS_CONFIG[s].label }));
  const customerOptions = Array.from(new Set(lichSu.map(h => h.customer).filter(Boolean))).sort();
  const sellerOptions = Array.from(new Set(lichSu.map(h => h.sellerName || h.sellerId || '').filter(Boolean))).sort();
  const materialOptions = Array.from(new Set(lichSu.flatMap(h => (h.structure.match(/[A-Z]{2,5}/g) || [])).filter(Boolean))).sort();
  const bagTypeOptions = Array.from(new Set(lichSu.map(h => h.input?.bagType || h.input?.productType || '').filter(Boolean))).sort();

  const xuatCsv = () => {
    const headers = ['Ngay', 'Khach hang', 'San pham', 'Cau truc', 'So luong', 'Gia de xuat', 'Trang thai'];
    const csv = [headers, ...filtered.map(h => [
      h.date, h.customer, h.productName, h.structure, h.quantity,
      Math.round(h.finalPrice),
      mode === 'pricing' ? PRICING_STATUS_CONFIG[getPricingStatus(h)]?.label : QUOTE_STATUS_CONFIG[h.quoteStatus ?? 'drafted']?.label,
    ])].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `lich-su-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="crm-root hist-root">
      {mucLsx && <LSXFormModal historyItem={mucLsx} onClose={() => datMucLsx(null)} />}

      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          mode={mode}
          onClose={() => setSelectedItem(null)}
          onLoad={taiLichSu}
          onLSX={datMucLsx}
          onNavigate={khiDieuHuong}
        />
      )}

      {/* ── Toggle + Filter Bar ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        {/* Row 1: Toggle + time + search + buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Segmented toggle */}
          <div style={{ display: 'flex', background: 'var(--border)', borderRadius: 8, padding: 2, gap: 2 }}>
            {(['pricing', 'quote'] as ToggleMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setPage(0); setFilterStatuses(new Set()); }}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
                  background: mode === m ? 'var(--background)' : 'transparent',
                  color: mode === m ? 'var(--foreground)' : 'var(--muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {m === 'pricing' ? '● Tính giá' : '○ Báo giá'}
              </button>
            ))}
          </div>

          {/* Time range */}
          <select className="form-input" value={timeRange}
            onChange={e => { setTimeRange(e.target.value as TimeRange); setPage(0); }}
            style={{ width: 160 }}>
            {Object.entries(TIME_RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Search */}
          <div className="crm-search-box" style={{ flex: 1, minWidth: 180 }}>
            <Search size={14} className="crm-search-icon" />
            <input
              className="crm-search-input"
              placeholder="Tìm nhanh KH, SP, mã BG..."
              value={tuKhoa}
              onChange={e => { datTuKhoa(e.target.value); setPage(0); }}
            />
            {tuKhoa && <button className="crm-search-clear" onClick={() => datTuKhoa('')}>✕</button>}
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
              }}>{activeChips.length}</span>
            )}
          </button>

          <button className="btn btn-sm btn-outline" onClick={xuatCsv} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} /> Xuất CSV
          </button>
        </div>

        {/* Custom date range */}
        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Từ:</span>
            <input type="date" className="form-input" value={tuNgay} onChange={e => datTuNgay(e.target.value)} style={{ width: 150 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Đến:</span>
            <input type="date" className="form-input" value={denNgay} onChange={e => datDenNgay(e.target.value)} style={{ width: 150 }} />
          </div>
        )}

        {/* Advanced: status filter */}
        {showAdvanced && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Trạng thái</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
              {statusOptions.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={filterStatuses.has(opt.value)} onChange={() => toggleStatus(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Đang lọc:</span>
            {activeChips.map((c, i) => <FilterChip key={i} label={c.label} onRemove={c.clear} />)}
            <button onClick={clearAll} style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <XCircle size={12} /> Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* ── Count ── */}
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
        {filtered.length} bản ghi
      </div>

      {/* ── Table ── */}
      <div className="crm-danhSach hist-danhSach-container">
        {lichSu.length === 0 ? (
          <div className="crm-empty">
            <Database size={40} />
            <p>Chưa có lịch sử tính giá nào.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="crm-empty" role="status">
            <FileText size={40} />
            <p>Không tìm thấy kết quả</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>Thử thay đổi bộ lọc hoặc tạo bảng tính giá mới.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm btn-outline" onClick={clearAll}>Xóa bộ lọc</button>
              {khiDieuHuong && <button className="btn btn-sm btn-primary" onClick={() => khiDieuHuong('calculator')}>Tạo mới</button>}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table hist-data-table" aria-busy="false">
              <thead>
                <tr>
                  <SortHeader label="Mã" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
                  {mode === 'pricing' && <SortHeader label="Sản phẩm" sortKey="productName" current={sortKey} dir={sortDir} onSort={handleSort} />}
                  <SortHeader label="Khách hàng" sortKey="customer" current={sortKey} dir={sortDir} onSort={handleSort} />
                  {mode === 'quote' && <th>Số SP</th>}
                  <SortHeader label="Ngày tạo" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Trạng thái" sortKey="quoteStatus" current={sortKey} dir={sortDir} onSort={handleSort} />
                  {mode === 'pricing' && <SortHeader label="Giá đề xuất" sortKey="finalPrice" current={sortKey} dir={sortDir} onSort={handleSort} />}
                  <th>Sale</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(h => {
                  const status = mode === 'pricing' ? getPricingStatus(h) : (h.quoteStatus ?? 'drafted');
                  const lockKey = h.productName + '-' + h.structure;
                  const locked = !!sanPhamKhoa[lockKey];
                  return (
                    <tr key={h.id} onClick={() => setSelectedItem(h)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem' }}>
                        {mode === 'quote' ? (h.quoteCode || h.id) : h.id}
                      </td>
                      {mode === 'pricing' && <td>{h.productName}</td>}
                      <td>{h.customer}</td>
                      {mode === 'quote' && <td style={{ textAlign: 'center' }}>{h.tiers?.length ?? 1}</td>}
                      <td>{h.date}</td>
                      <td><StatusBadge status={status} mode={mode} /></td>
                      {mode === 'pricing' && <td className="num" style={{ fontWeight: 600 }}>{dinhDangSo(h.finalPrice)} ₫</td>}
                      <td>{h.sellerName || '—'}</td>
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline" title="Xem chi tiết" onClick={() => setSelectedItem(h)}>
                          <Eye size={13} />
                        </button>
                        {' '}
                        <button className="btn btn-sm btn-outline" title="Tải lại" onClick={() => { taiLichSu(h.id); khiDieuHuong?.('calculator'); }}>
                          <RotateCcw size={13} />
                        </button>
                        {' '}
                        {h.chotGia && h.chotGia > 0 && (
                          <>
                            <button className="btn btn-sm btn-outline" title="Tạo LSX" onClick={() => datMucLsx(h)}
                              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                              <ClipboardList size={13} />
                            </button>
                            {' '}
                          </>
                        )}
                        <button className="btn btn-sm btn-outline" title="Xóa" onClick={() => xoaLichSu(h.id)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</button>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}
            aria-label={`Trang ${page + 1} trên ${totalPages}`}>
            Trang {page + 1} / {totalPages}
          </span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Tiếp →</button>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 8 }}>Hiển thị:</span>
          <select className="form-input" value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            style={{ width: 80 }}>
            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>/ trang</span>
        </div>
      )}
    </div>
  );
}






