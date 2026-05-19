"use client";
// src/components/ModuleLenhSanXuat.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Danh sách Lệnh Sản Xuất — sidebar module cho admin & purchase.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ClipboardList, Trash2, FileDown, FileText, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { ProductionOrder, LSXStatus } from '../lib/types';
import { LSX_STATUS_CONFIG } from '../lib/types';
import { exportLSXtoPDF, exportLSXtoDOCX } from '../lib/lsxExport';

// ── Helpers ───────────────────────────────────────────────────────────────────
function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }

function dinhDangNgay(iso: string): string {
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
}

const THU_TU_TRANG_THAI: LSXStatus[] = ['created', 'in_production', 'completed', 'cancelled'];

// ── Status Dropdown ───────────────────────────────────────────────────────────
function HopChonTrangThai({ lenh, khiCapNhat }: { lenh: ProductionOrder; khiCapNhat: (id: string, s: LSXStatus) => void }) {
  const [mo, datMo] = useState(false);
  const cauHinh = LSX_STATUS_CONFIG[lenh.status];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => datMo(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '12px', border: `1px solid ${cauHinh.color}55`,
          background: cauHinh.bg, color: cauHinh.color, cursor: 'pointer',
          fontSize: '11px', fontWeight: 600,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cauHinh.color, display: 'inline-block' }} />
        {cauHinh.label}
        <ChevronDown size={11} />
      </button>

      {mo && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => datMo(false)} />
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 51,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '150px', overflow: 'hidden',
          }}>
            {THU_TU_TRANG_THAI.map(s => {
              const c = LSX_STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { khiCapNhat(lenh.id, s); datMo(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', border: 'none', background: s === lenh.status ? c.bg : 'transparent',
                    color: 'var(--text)', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ color: s === lenh.status ? c.color : undefined, fontWeight: s === lenh.status ? 700 : 400 }}>
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
export default function ModuleLenhSanXuat() {
  const { productionOrders: lenhSanXuat, capNhatLSX, xoaLSX } = dungCuaHangTinhGia();
  const [tuKhoa, datTuKhoa] = useState('');
  const [locLoai, datLocLoai] = useState<'all' | 'mang' | 'tui'>('all');
  const [locTrangThai, datLocTrangThai] = useState<'all' | LSXStatus>('all');
  const [idDangXuat, datIdDangXuat] = useState<string | null>(null);
  const [idXacNhanXoa, datIdXacNhanXoa] = useState<string | null>(null);
  const [dangTai, datDangTai] = useState(false);

  // LSX đã được load từ localStorage trong page.tsx khi khởi động

  const daLoc = useMemo(() => {
    let danhSach = [...lenhSanXuat];
    if (locLoai !== 'all') danhSach = danhSach.filter(o => o.snapshot.productType === locLoai);
    if (locTrangThai !== 'all') danhSach = danhSach.filter(o => o.status === locTrangThai);
    if (tuKhoa.trim()) {
      const q = tuKhoa.toLowerCase();
      danhSach = danhSach.filter(o =>
        o.snapshot.customer.toLowerCase().includes(q) ||
        o.snapshot.productName.toLowerCase().includes(q) ||
        o.snapshot.structure.toLowerCase().includes(q) ||
        (o.manual.lsxNumber || o.id).toLowerCase().includes(q)
      );
    }
    return danhSach;
  }, [lenhSanXuat, locLoai, locTrangThai, tuKhoa]);

  // Stats
  const tongSo = lenhSanXuat.length;
  const dangSanXuat = lenhSanXuat.filter(o => o.status === 'in_production').length;
  const daHoanTat = lenhSanXuat.filter(o => o.status === 'completed').length;
  const moiTao = lenhSanXuat.filter(o => o.status === 'created').length;

  async function xuLyXuat(lenh: ProductionOrder, dinhDang: 'pdf' | 'docx') {
    datIdDangXuat(lenh.id + dinhDang);
    try {
      if (dinhDang === 'pdf') await exportLSXtoPDF(lenh);
      else await exportLSXtoDOCX(lenh);
    } catch (err) {
      console.error('[LSX] Re-export error:', err);
      alert('Có lỗi khi xuất file. Vui lòng thử lại.');
    } finally {
      datIdDangXuat(null);
    }
  }

  async function xuLyXoa(id: string) {
    await xoaLSX(id);
    datIdXacNhanXoa(null);
  }

  async function xuLyLamMoi() {
    datDangTai(true);
    datDangTai(false);
  }

  return (
    <div className="crm-root">
      {/* ── Confirm Delete Dialog ── */}
      {idXacNhanXoa && (
        <div className="lts-confirm-backdrop" onClick={() => datIdXacNhanXoa(null)}>
          <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="lts-confirm-icon">🗑️</div>
            <h3 className="lts-confirm-title">Xoá Lệnh Sản Xuất?</h3>
            <p className="lts-confirm-desc">
              Thao tác này không thể hoàn tác. Lệnh sản xuất sẽ bị xoá vĩnh viễn.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => datIdXacNhanXoa(null)}>Huỷ</button>
              <button className="btn btn-danger" onClick={() => xuLyXoa(idXacNhanXoa)}>Xoá</button>
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
            value={tuKhoa}
            onChange={e => datTuKhoa(e.target.value)}
          />
          {tuKhoa && <button className="crm-search-clear" onClick={() => datTuKhoa('')}>✕</button>}
        </div>

        <div className="crm-toolbar-right">
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button className={`toolbar-btn ${locLoai === 'all' ? 'active' : ''}`} onClick={() => datLocLoai('all')}>Tất cả</button>
            <button className={`toolbar-btn ${locLoai === 'mang' ? 'active' : ''}`} onClick={() => datLocLoai('mang')}>Màng</button>
            <button className={`toolbar-btn ${locLoai === 'tui' ? 'active' : ''}`} onClick={() => datLocLoai('tui')}>Túi</button>
          </div>
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button className={`toolbar-btn ${locTrangThai === 'all' ? 'active' : ''}`} onClick={() => datLocTrangThai('all')}>Tất cả</button>
            <button className={`toolbar-btn ${locTrangThai === 'created' ? 'active' : ''}`} onClick={() => datLocTrangThai('created')}>Mới tạo</button>
            <button className={`toolbar-btn ${locTrangThai === 'in_production' ? 'active' : ''}`} onClick={() => datLocTrangThai('in_production')}>Đang SX</button>
            <button className={`toolbar-btn ${locTrangThai === 'completed' ? 'active' : ''}`} onClick={() => datLocTrangThai('completed')}>Xong</button>
          </div>
          <button
            className="toolbar-btn"
            title="Tải lại dữ liệu"
            onClick={xuLyLamMoi}
            disabled={dangTai}
          >
            {dangTai ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="quote-stats-overview" style={{ margin: '12px 0' }}>
        <div className="quote-stat-card">
          <div className="quote-stat-val">{tongSo}</div>
          <div className="quote-stat-lbl">Tổng lệnh</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#6b7280' }}>{moiTao}</div>
          <div className="quote-stat-lbl">Mới tạo</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#d97706' }}>{dangSanXuat}</div>
          <div className="quote-stat-lbl">Đang SX</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#059669' }}>{daHoanTat}</div>
          <div className="quote-stat-lbl">Hoàn thành</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="crm-danhSach" style={{ overflowX: 'auto' }}>
        {daLoc.length === 0 ? (
          <div className="crm-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {lenhSanXuat.length === 0
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
              {daLoc.map(lenh => (
                <tr key={lenh.id}>
                  <td style={{ fontWeight: 600, fontSize: '12px' }}>
                    {lenh.manual.lsxNumber || lenh.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{lenh.snapshot.customer}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{lenh.snapshot.productName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lenh.snapshot.structure}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {dinhDangSo(lenh.snapshot.quantity)}&nbsp;
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lenh.snapshot.productType === 'mang' ? 'm²' : 'cái'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px',
                      background: lenh.snapshot.productType === 'mang' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                      color: lenh.snapshot.productType === 'mang' ? '#3b82f6' : '#8b5cf6',
                    }}>
                      {lenh.snapshot.productType === 'mang' ? 'Màng' : 'Túi'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dinhDangNgay(lenh.createdAt)}</td>
                  <td>
                    <HopChonTrangThai
                      lenh={lenh}
                      khiCapNhat={(id, s) => capNhatLSX(id, { status: s })}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Xuất PDF */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn"
                        title="Xuất PDF"
                        onClick={() => xuLyXuat(lenh, 'pdf')}
                        disabled={idDangXuat === lenh.id + 'pdf'}
                      >
                        {idDangXuat === lenh.id + 'pdf'
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <FileDown size={13} />}
                      </button>
                      {/* Xuất DOCX */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn"
                        title="Xuất DOCX"
                        onClick={() => xuLyXuat(lenh, 'docx')}
                        disabled={idDangXuat === lenh.id + 'docx'}
                      >
                        {idDangXuat === lenh.id + 'docx'
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <FileText size={13} />}
                      </button>
                      {/* Xoá */}
                      <button
                        className="crm-btn crm-btn-ghost hist-action-btn hist-action-btn--danger"
                        title="Xoá lệnh sản xuất"
                        onClick={() => datIdXacNhanXoa(lenh.id)}
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
