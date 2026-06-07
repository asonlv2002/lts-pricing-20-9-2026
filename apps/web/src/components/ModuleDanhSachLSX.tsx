"use client";
import React, { useMemo, useState } from 'react';
import { Calendar, Download, Eye, Filter, Search, X, XCircle } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { LSXStatus, ProductionOrder } from '../lib/types';
import { LSX_STATUS_CONFIG } from '../lib/types';
import { DEFAULT_LSX_LIST_FILTERS, filterLsxList, type LsxListFilters, type LsxListTimeRange } from '../lib/lsx-list-filters';

const TIME_RANGE_LABELS: Record<LsxListTimeRange, string> = {
  today: 'Hôm nay',
  '7days': '7 ngày qua',
  '30days': '30 ngày qua',
  all: 'Tất cả',
  custom: 'Tùy chỉnh',
};

const STATUS_OPTIONS: LSXStatus[] = ['created', 'in_production', 'completed', 'cancelled'];
const PRODUCT_TYPE_LABELS: Record<string, string> = { mang: 'Màng', tui: 'Túi' };

function dinhDangSo(n: number) {
  return n.toLocaleString('vi-VN');
}

function dinhDangNgay(iso?: string): string {
  if (!iso) return '—';
  const ms = iso.includes('/') ? 0 : new Date(iso).getTime();
  if (ms) return new Date(ms).toLocaleDateString('vi-VN');
  return iso;
}

function capNhatFilter<K extends keyof LsxListFilters>(filters: LsxListFilters, key: K, value: LsxListFilters[K]): LsxListFilters {
  return { ...filters, [key]: value };
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary-light, #dbeafe)', color: 'var(--primary, #2563eb)', borderRadius: 12, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
      {label}
      <button onClick={onRemove} aria-label={`Xóa bộ lọc ${label}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}><X size={11} /></button>
    </span>
  );
}

function LsxReadOnlyPanel({ order, onClose }: { order: ProductionOrder; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div role="dialog" aria-modal="true" aria-label={`LSX ${order.manual.lsxNumber || order.id}`} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(60%, 640px)', background: 'var(--surface, #fff)', borderLeft: '1px solid var(--border)', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>LSX</div>
            <div style={{ fontWeight: 800 }}>{order.manual.lsxNumber || order.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InfoSection title="Thông tin LSX">
            <InfoRow label="Trạng thái" value={LSX_STATUS_CONFIG[order.status].label} color={LSX_STATUS_CONFIG[order.status].color} bold />
            <InfoRow label="Ngày tạo" value={dinhDangNgay(order.createdAt)} />
            <InfoRow label="Ngày xuống" value={order.manual.issuedDate || '—'} />
            <InfoRow label="Ngày giao" value={order.manual.deliveryDate || '—'} />
            <InfoRow label="Người lập" value={order.manual.preparedBy || '—'} />
            <InfoRow label="Người duyệt" value={order.manual.approvedBy || '—'} />
            <InfoRow label="Báo giá gốc" value={order.quoteId || '—'} mono />
          </InfoSection>
          <InfoSection title="Sản phẩm">
            <InfoRow label="Khách hàng" value={order.snapshot.customer || '—'} />
            <InfoRow label="Sản phẩm" value={order.snapshot.productName || '—'} />
            <InfoRow label="Cấu trúc" value={order.snapshot.structure || '—'} mono />
            <InfoRow label="Số lượng" value={`${dinhDangSo(order.snapshot.quantity)} ${order.snapshot.productType === 'mang' ? 'm²' : 'cái'}`} />
            <InfoRow label="Giá chốt" value={`${dinhDangSo(order.snapshot.chotGia)} ₫`} bold />
          </InfoSection>
          <InfoSection title="Ghi chú">
            <InfoRow label="Nội dung" value={order.manual.notes || '—'} />
          </InfoSection>
        </div>
      </div>
    </>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}><div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>{title}</div><div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div></div>;
}

function InfoRow({ label, value, mono, bold, color }: { label: string; value: string; mono?: boolean; bold?: boolean; color?: string }) {
  return <div style={{ display: 'flex', gap: 8, fontSize: '0.82rem' }}><span style={{ minWidth: 110, color: 'var(--muted)' }}>{label}:</span><span style={{ fontFamily: mono ? 'monospace' : undefined, fontWeight: bold ? 700 : undefined, color }}>{value}</span></div>;
}

export default function ModuleDanhSachLSX() {
  const { productionOrders } = dungCuaHangTinhGia();
  const [filters, setFilters] = useState<LsxListFilters>(DEFAULT_LSX_LIST_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const filtered = useMemo(() => filterLsxList(productionOrders, filters), [productionOrders, filters]);
  const counts = useMemo(() => ({
    total: filtered.length,
    created: filtered.filter(o => o.status === 'created').length,
    inProduction: filtered.filter(o => o.status === 'in_production').length,
    completed: filtered.filter(o => o.status === 'completed').length,
    cancelled: filtered.filter(o => o.status === 'cancelled').length,
  }), [filtered]);

  const customerOptions = Array.from(new Set(productionOrders.map(o => o.snapshot.customer).filter(Boolean))).sort();
  const productOptions = Array.from(new Set(productionOrders.map(o => o.snapshot.productName).filter(Boolean))).sort();
  const peopleOptions = Array.from(new Set(productionOrders.flatMap(o => [o.manual.preparedBy, o.manual.approvedBy]).filter(Boolean))).sort();

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (filters.timeRange !== '30days') activeChips.push({ label: TIME_RANGE_LABELS[filters.timeRange], clear: () => setFilters(f => capNhatFilter(f, 'timeRange', '30days')) });
  if (filters.keyword) activeChips.push({ label: `Từ khóa: ${filters.keyword}`, clear: () => setFilters(f => capNhatFilter(f, 'keyword', '')) });
  filters.statuses.forEach(s => activeChips.push({ label: LSX_STATUS_CONFIG[s].label, clear: () => setFilters(f => capNhatFilter(f, 'statuses', f.statuses.filter(x => x !== s))) }));
  filters.productTypes.forEach(t => activeChips.push({ label: PRODUCT_TYPE_LABELS[t], clear: () => setFilters(f => capNhatFilter(f, 'productTypes', f.productTypes.filter(x => x !== t))) }));
  if (filters.customerQuery) activeChips.push({ label: `KH: ${filters.customerQuery}`, clear: () => setFilters(f => capNhatFilter(f, 'customerQuery', '')) });
  if (filters.productQuery) activeChips.push({ label: `SP: ${filters.productQuery}`, clear: () => setFilters(f => capNhatFilter(f, 'productQuery', '')) });
  if (filters.quoteIdQuery) activeChips.push({ label: `BG: ${filters.quoteIdQuery}`, clear: () => setFilters(f => capNhatFilter(f, 'quoteIdQuery', '')) });
  if (filters.preparedByQuery) activeChips.push({ label: `Người lập: ${filters.preparedByQuery}`, clear: () => setFilters(f => capNhatFilter(f, 'preparedByQuery', '')) });
  if (filters.approvedByQuery) activeChips.push({ label: `Người duyệt: ${filters.approvedByQuery}`, clear: () => setFilters(f => capNhatFilter(f, 'approvedByQuery', '')) });
  if (filters.deliveryFromDate || filters.deliveryToDate) activeChips.push({ label: `Giao: ${filters.deliveryFromDate || '...'}-${filters.deliveryToDate || '...'}`, clear: () => setFilters(f => ({ ...f, deliveryFromDate: '', deliveryToDate: '' })) });
  if (filters.quantityMin || filters.quantityMax) activeChips.push({ label: `SL: ${filters.quantityMin || '0'}-${filters.quantityMax || '∞'}`, clear: () => setFilters(f => ({ ...f, quantityMin: '', quantityMax: '' })) });
  if (filters.priceMin || filters.priceMax) activeChips.push({ label: `Giá: ${filters.priceMin || '0'}-${filters.priceMax || '∞'}`, clear: () => setFilters(f => ({ ...f, priceMin: '', priceMax: '' })) });

  function toggleStatus(status: LSXStatus) {
    setFilters(f => capNhatFilter(f, 'statuses', f.statuses.includes(status) ? f.statuses.filter(s => s !== status) : [...f.statuses, status]));
  }

  function toggleProductType(type: 'mang' | 'tui') {
    setFilters(f => capNhatFilter(f, 'productTypes', f.productTypes.includes(type) ? f.productTypes.filter(t => t !== type) : [...f.productTypes, type]));
  }

  function clearAll() {
    setFilters(DEFAULT_LSX_LIST_FILTERS);
  }

  function xuatCsv() {
    const headers = ['So LSX', 'Khach hang', 'San pham', 'Cau truc', 'So luong', 'Loai', 'Bao gia goc', 'Ngay tao', 'Ngay giao', 'Nguoi lap', 'Nguoi duyet', 'Trang thai', 'Gia chot'];
    const rows = filtered.map(o => [o.manual.lsxNumber || o.id, o.snapshot.customer, o.snapshot.productName, o.snapshot.structure, o.snapshot.quantity, PRODUCT_TYPE_LABELS[o.snapshot.productType] || o.snapshot.productType, o.quoteId, dinhDangNgay(o.createdAt), o.manual.deliveryDate, o.manual.preparedBy, o.manual.approvedBy, LSX_STATUS_CONFIG[o.status].label, Math.round(o.snapshot.chotGia)]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-lsx-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="crm-root">
      {selectedOrder && <LsxReadOnlyPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-input" value={filters.timeRange} onChange={e => setFilters(f => capNhatFilter(f, 'timeRange', e.target.value as LsxListTimeRange))} style={{ width: 150 }}>
            {Object.entries(TIME_RANGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <div className="crm-search-box" style={{ flex: 1, minWidth: 220 }}>
            <Search size={14} className="crm-search-icon" />
            <input className="crm-search-input" placeholder="Tìm số LSX, KH, sản phẩm, mã báo giá..." value={filters.keyword} onChange={e => setFilters(f => capNhatFilter(f, 'keyword', e.target.value))} />
            {filters.keyword && <button className="crm-search-clear" onClick={() => setFilters(f => capNhatFilter(f, 'keyword', ''))}>✕</button>}
          </div>
          <button className={`btn btn-sm ${showAdvanced ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowAdvanced(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Filter size={13} /> Bộ lọc {activeChips.length > 0 && `(${activeChips.length})`}</button>
          <button className="btn btn-sm btn-outline" onClick={xuatCsv} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Download size={13} /> Xuất CSV</button>
          <button className="btn btn-sm btn-outline" onClick={clearAll}>Xóa bộ lọc</button>
        </div>

        {filters.timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Từ ngày tạo:</span>
            <input type="date" className="form-input" value={filters.fromDate} onChange={e => setFilters(f => capNhatFilter(f, 'fromDate', e.target.value))} style={{ width: 150 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Đến ngày tạo:</span>
            <input type="date" className="form-input" value={filters.toDate} onChange={e => setFilters(f => capNhatFilter(f, 'toDate', e.target.value))} style={{ width: 150 }} />
          </div>
        )}

        {showAdvanced && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>ĐỐI TƯỢNG</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <input className="form-input" list="lsx-customers" placeholder="Khách hàng" value={filters.customerQuery} onChange={e => setFilters(f => capNhatFilter(f, 'customerQuery', e.target.value))} />
                <datalist id="lsx-customers">{customerOptions.map(v => <option key={v} value={v} />)}</datalist>
                <input className="form-input" list="lsx-products" placeholder="Sản phẩm" value={filters.productQuery} onChange={e => setFilters(f => capNhatFilter(f, 'productQuery', e.target.value))} />
                <datalist id="lsx-products">{productOptions.map(v => <option key={v} value={v} />)}</datalist>
                <input className="form-input" placeholder="Mã báo giá gốc" value={filters.quoteIdQuery} onChange={e => setFilters(f => capNhatFilter(f, 'quoteIdQuery', e.target.value))} />
                <input className="form-input" list="lsx-people" placeholder="Người lập" value={filters.preparedByQuery} onChange={e => setFilters(f => capNhatFilter(f, 'preparedByQuery', e.target.value))} />
                <input className="form-input" list="lsx-people" placeholder="Người duyệt" value={filters.approvedByQuery} onChange={e => setFilters(f => capNhatFilter(f, 'approvedByQuery', e.target.value))} />
                <datalist id="lsx-people">{peopleOptions.map(v => <option key={v} value={v} />)}</datalist>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>THỜI GIAN & TRẠNG THÁI</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="date" className="form-input" title="Từ ngày giao" value={filters.deliveryFromDate} onChange={e => setFilters(f => capNhatFilter(f, 'deliveryFromDate', e.target.value))} />
                  <input type="date" className="form-input" title="Đến ngày giao" value={filters.deliveryToDate} onChange={e => setFilters(f => capNhatFilter(f, 'deliveryToDate', e.target.value))} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>{STATUS_OPTIONS.map(status => <label key={status} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.78rem' }}><input type="checkbox" checked={filters.statuses.includes(status)} onChange={() => toggleStatus(status)} />{LSX_STATUS_CONFIG[status].label}</label>)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>{(['mang', 'tui'] as const).map(type => <label key={type} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.78rem' }}><input type="checkbox" checked={filters.productTypes.includes(type)} onChange={() => toggleProductType(type)} />{PRODUCT_TYPE_LABELS[type]}</label>)}</div>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>TÀI CHÍNH</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><input className="form-input" inputMode="numeric" placeholder="SL từ" value={filters.quantityMin} onChange={e => setFilters(f => capNhatFilter(f, 'quantityMin', e.target.value))} /><input className="form-input" inputMode="numeric" placeholder="SL đến" value={filters.quantityMax} onChange={e => setFilters(f => capNhatFilter(f, 'quantityMax', e.target.value))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><input className="form-input" inputMode="numeric" placeholder="Giá từ" value={filters.priceMin} onChange={e => setFilters(f => capNhatFilter(f, 'priceMin', e.target.value))} /><input className="form-input" inputMode="numeric" placeholder="Giá đến" value={filters.priceMax} onChange={e => setFilters(f => capNhatFilter(f, 'priceMax', e.target.value))} /></div>
              </div>
            </div>
          </div>
        )}

        {activeChips.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Đang lọc:</span>{activeChips.map((chip, index) => <FilterChip key={index} label={chip.label} onRemove={chip.clear} />)}<button onClick={clearAll} style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={12} /> Xóa tất cả</button></div>}
      </div>

      <div className="quote-stats-overview" style={{ margin: '12px 0' }}>
        <div className="quote-stat-card"><div className="quote-stat-val">{counts.total}</div><div className="quote-stat-lbl">Tổng LSX</div></div>
        <div className="quote-stat-card"><div className="quote-stat-val" style={{ color: '#6b7280' }}>{counts.created}</div><div className="quote-stat-lbl">Mới tạo</div></div>
        <div className="quote-stat-card"><div className="quote-stat-val" style={{ color: '#d97706' }}>{counts.inProduction}</div><div className="quote-stat-lbl">Đang SX</div></div>
        <div className="quote-stat-card"><div className="quote-stat-val" style={{ color: '#059669' }}>{counts.completed}</div><div className="quote-stat-lbl">Hoàn thành</div></div>
        <div className="quote-stat-card"><div className="quote-stat-val" style={{ color: '#dc2626' }}>{counts.cancelled}</div><div className="quote-stat-lbl">Đã huỷ</div></div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>{filtered.length} LSX</div>
      <div className="crm-danhSach" style={{ overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="crm-empty" style={{ padding: '60px 20px', textAlign: 'center' }}><Calendar size={40} /><p>{productionOrders.length === 0 ? 'Chưa có LSX nào.' : 'Không tìm thấy LSX phù hợp.'}</p></div>
        ) : (
          <table className="data-table" style={{ minWidth: 1080 }}>
            <thead><tr><th>Số LSX</th><th>Khách hàng</th><th>Sản phẩm</th><th style={{ textAlign: 'right' }}>Số lượng</th><th>Loại</th><th>Báo giá gốc</th><th>Ngày tạo</th><th>Ngày giao</th><th>Người lập</th><th>Trạng thái</th><th>Xem</th></tr></thead>
            <tbody>{filtered.map(order => <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 700, fontSize: '12px' }}>{order.manual.lsxNumber || order.id}</td>
              <td style={{ fontWeight: 600 }}>{order.snapshot.customer}</td>
              <td><div style={{ fontSize: '12px' }}>{order.snapshot.productName}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>{order.snapshot.structure}</div></td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{dinhDangSo(order.snapshot.quantity)}</td>
              <td>{PRODUCT_TYPE_LABELS[order.snapshot.productType] || order.snapshot.productType}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{order.quoteId}</td>
              <td>{dinhDangNgay(order.createdAt)}</td>
              <td>{order.manual.deliveryDate || '—'}</td>
              <td>{order.manual.preparedBy || '—'}</td>
              <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, color: LSX_STATUS_CONFIG[order.status].color, background: LSX_STATUS_CONFIG[order.status].bg }}>● {LSX_STATUS_CONFIG[order.status].label}</span></td>
              <td onClick={e => e.stopPropagation()}><button className="btn btn-sm btn-outline" title="Xem chi tiết" onClick={() => setSelectedOrder(order)}><Eye size={13} /></button></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
