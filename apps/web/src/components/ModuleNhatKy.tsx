"use client";
import React, { useState, useMemo } from 'react';
import { Search, Download, Clock, User, FileText } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { AuditAction } from '../lib/types';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  lock: 'Khóa',
  unlock: 'Mở khóa',
  status_change: 'Đổi trạng thái',
  override_change: 'Thay đổi override',
  assign: 'Phân công',
  version_restore: 'Khôi phục phiên bản',
  duplicate: 'Sao chép',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  create: '#059669',
  update: '#3b82f6',
  delete: '#dc2626',
  lock: '#d97706',
  unlock: '#8b5cf6',
  status_change: '#6366f1',
  override_change: '#0891b2',
  assign: '#7c3aed',
  version_restore: '#ea580c',
  duplicate: '#0d9488',
};

const PAGE_SIZE = 50;

export default function ModuleNhatKy() {
  const { auditLog, xuatNhatKyCsv } = dungCuaHangTinhGia();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = auditLog;
    if (filterAction) list = list.filter(e => e.action === filterAction);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.userName.toLowerCase().includes(q) ||
        (e.targetName || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [auditLog, search, filterAction]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="crm-root">
      <div className="crm-toolbar">
        <div className="crm-search-box" style={{ flex: 1 }}>
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm theo người thực hiện, mục tiêu..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>

        <select
          className="form-input"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value as AuditAction | ''); setPage(0); }}
          style={{ width: 160 }}
        >
          <option value="">Tất cả hành động</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <button className="btn btn-sm btn-outline" onClick={() => xuatNhatKyCsv()}>
          <Download size={14} /> Xuất CSV
        </button>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '8px 0' }}>
        {filtered.length} bản ghi {filterAction && `(${ACTION_LABELS[filterAction]})`}
      </div>

      {pageItems.length === 0 ? (
        <div className="crm-empty">
          <Clock size={40} />
          <p>Chưa có nhật ký thao tác nào</p>
        </div>
      ) : (
        <div className="audit-table">
          <div className="audit-header">
            <div className="audit-cell audit-cell--time">Thời gian</div>
            <div className="audit-cell audit-cell--user">Người thực hiện</div>
            <div className="audit-cell audit-cell--action">Hành động</div>
            <div className="audit-cell audit-cell--target">Mục tiêu</div>
            <div className="audit-cell audit-cell--detail">Chi tiết</div>
          </div>
          {pageItems.map(entry => (
            <div key={entry.id} className="audit-row">
              <div className="audit-cell audit-cell--time">
                {new Date(entry.timestamp).toLocaleString('vi-VN')}
              </div>
              <div className="audit-cell audit-cell--user">
                <User size={12} /> {entry.userName}
              </div>
              <div className="audit-cell audit-cell--action">
                <span style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600,
                  background: ACTION_COLORS[entry.action] + '18',
                  color: ACTION_COLORS[entry.action],
                }}>
                  {ACTION_LABELS[entry.action]}
                </span>
              </div>
              <div className="audit-cell audit-cell--target">
                <FileText size={12} />
                <span>{entry.targetName || entry.targetId}</span>
              </div>
              <div className="audit-cell audit-cell--detail">
                {entry.note || (entry.before && entry.after
                  ? `${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`
                  : '—'
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="audit-pagination">
          <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</button>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Trang {page + 1} / {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}
