"use client";
// src/components/ProductionOrderModule.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Danh sách Lệnh Sản Xuất — sidebar module cho admin & purchase.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ClipboardList, Trash2, FileDown, FileText, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { useCalculatorStore } from '../store/calculatorStore';
import type { ProductionOrder, LSXStatus } from '../lib/types';
import { LSX_STATUS_CONFIG } from '../lib/types';
import { exportLSXtoPDF, exportLSXtoDOCX } from '../lib/lsxExport';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('vi-VN'); }

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
}

const STATUS_ORDER: LSXStatus[] = ['created', 'in_production', 'completed', 'cancelled'];

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ order, onUpdate }: { order: ProductionOrder; onUpdate: (id: string, s: LSXStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = LSX_STATUS_CONFIG[order.status];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '12px', border: `1px solid ${cfg.color}55`,
          background: cfg.bg, color: cfg.color, cursor: 'pointer',
          fontSize: '11px', fontWeight: 600,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
        {cfg.label}
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 51,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '150px', overflow: 'hidden',
          }}>
            {STATUS_ORDER.map(s => {
              const c = LSX_STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onUpdate(order.id, s); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', border: 'none', background: s === order.status ? c.bg : 'transparent',
                    color: 'var(--text)', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ color: s === order.status ? c.color : undefined, fontWeight: s === order.status ? 700 : 400 }}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────────────
export default function ProductionOrderModule() {
  const { productionOrders, updateProductionOrder, deleteProductionOrder, loadProductionOrdersFromServer } = useCalculatorStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mang' | 'tui'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | LSXStatus>('all');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load từ server khi mount
  useEffect(() => {
    loadProductionOrdersFromServer();
  }, [loadProductionOrdersFromServer]);

  const filtered = useMemo(() => {
    let list = [...productionOrders];
    if (filterType !== 'all') list = list.filter(o => o.snapshot.productType === filterType);
    if (filterStatus !== 'all') list = list.filter(o => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.snapshot.customer.toLowerCase().includes(q) ||
        o.snapshot.productName.toLowerCase().includes(q) ||
        o.snapshot.structure.toLowerCase().includes(q) ||
        (o.manual.lsxNumber || o.id).toLowerCase().includes(q)
      );
    }
    return list;
  }, [productionOrders, filterType, filterStatus, search]);

  // Stats
  const total = productionOrders.length;
  const inProd = productionOrders.filter(o => o.status === 'in_production').length;
  const completed = productionOrders.filter(o => o.status === 'completed').length;
  const created = productionOrders.filter(o => o.status === 'created').length;

  async function handleExport(order: ProductionOrder, format: 'pdf' | 'docx') {
    setExportingId(order.id + format);
    try {
      if (format === 'pdf') await exportLSXtoPDF(order);
      else await exportLSXtoDOCX(order);
    } catch (err) {
      console.error('[LSX] Re-export error:', err);
      alert('Có lỗi khi xuất file. Vui lòng thử lại.');
    } finally {
      setExportingId(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteProductionOrder(id);
    setConfirmDeleteId(null);
  }

  async function handleRefresh() {
    setLoading(true);
    await loadProductionOrdersFromServer();
    setLoading(false);
  }

  return (
    <div className="crm-root">
      {/* ── Confirm Delete Dialog ── */}
      {confirmDeleteId && (
        <div className="lts-confirm-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="lts-confirm-icon">🗑️</div>
            <h3 className="lts-confirm-title">Xoá Lệnh Sản Xuất?</h3>
            <p className="lts-confirm-desc">
              Thao tác này không thể hoàn tác. Lệnh sản xuất sẽ bị xoá vĩnh viễn.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>Huỷ</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>Xoá</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm số LSX, khách hàng, sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="crm-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="crm-toolbar-right">
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button className={`toolbar-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>Tất cả</button>
            <button className={`toolbar-btn ${filterType === 'mang' ? 'active' : ''}`} onClick={() => setFilterType('mang')}>Màng</button>
            <button className={`toolbar-btn ${filterType === 'tui' ? 'active' : ''}`} onClick={() => setFilterType('tui')}>Túi</button>
          </div>
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button className={`toolbar-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>Tất cả</button>
            <button className={`toolbar-btn ${filterStatus === 'created' ? 'active' : ''}`} onClick={() => setFilterStatus('created')}>Mới tạo</button>
            <button className={`toolbar-btn ${filterStatus === 'in_production' ? 'active' : ''}`} onClick={() => setFilterStatus('in_production')}>Đang SX</button>
            <button className={`toolbar-btn ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>Xong</button>
          </div>
          <button
            className="toolbar-btn"
            title="Tải lại dữ liệu"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="quote-stats-overview" style={{ margin: '12px 0' }}>
        <div className="quote-stat-card">
          <div className="quote-stat-val">{total}</div>
          <div className="quote-stat-lbl">Tổng lệnh</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#6b7280' }}>{created}</div>
          <div className="quote-stat-lbl">Mới tạo</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#d97706' }}>{inProd}</div>
          <div className="quote-stat-lbl">Đang SX</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#059669' }}>{completed}</div>
          <div className="quote-stat-lbl">Hoàn thành</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="crm-list" style={{ overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="crm-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {productionOrders.length === 0
                ? 'Chưa có lệnh sản xuất nào. Tạo từ mục "Lịch sử tính giá" với đơn đã duyệt.'
                : 'Không tìm thấy kết quả phù hợp.'}
            </p>
          </div>
        ) : (
          <table className="data-table" style={{ minWidth: '860px' }}>
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Số LSX</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th style={{ textAlign: 'right' }}>Số lượng</th>
                <th style={{ width: '90px' }}>Loại</th>
                <th style={{ width: '90px' }}>Ngày tạo</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, fontSize: '12px' }}>
                    {order.manual.lsxNumber || order.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{order.snapshot.customer}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{order.snapshot.productName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{order.snapshot.structure}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(order.snapshot.quantity)}&nbsp;
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {order.snapshot.productType === 'mang' ? 'm²' : 'cái'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px',
                      background: order.snapshot.productType === 'mang' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                      color: order.snapshot.productType === 'mang' ? '#3b82f6' : '#8b5cf6',
                    }}>
                      {order.snapshot.productType === 'mang' ? 'Màng' : 'Túi'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmtDate(order.createdAt)}</td>
                  <td>
                    <StatusDropdown
                      order={order}
                      onUpdate={(id, s) => updateProductionOrder(id, { status: s })}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Xuất PDF */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn"
                        title="Xuất PDF"
                        onClick={() => handleExport(order, 'pdf')}
                        disabled={exportingId === order.id + 'pdf'}
                      >
                        {exportingId === order.id + 'pdf'
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <FileDown size={13} />}
                      </button>
                      {/* Xuất DOCX */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn"
                        title="Xuất DOCX"
                        onClick={() => handleExport(order, 'docx')}
                        disabled={exportingId === order.id + 'docx'}
                      >
                        {exportingId === order.id + 'docx'
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <FileText size={13} />}
                      </button>
                      {/* Xoá */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn hist-action-btn--danger"
                        title="Xoá lệnh sản xuất"
                        onClick={() => setConfirmDeleteId(order.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
