"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { Calendar, User, Package, Layers, Hash, RotateCcw, Trash2 } from 'lucide-react';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function HistoryView() {
  const { activeView, history, taiLichSu, xoaLichSu } = dungCuaHangTinhGia();

  if (activeView !== 'history') return null;

  if (!history.length) {
    return (
      <div className="panel active">
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Chưa có lịch sử báo giá</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel active">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-title" style={{ padding: '20px 20px 0 20px' }}>
          <span className="icon">📋</span> Lịch sử báo giá
        </div>
        
        <div className="crm-list hist-list-container" style={{ border: 'none', background: 'transparent' }}>
          <div className="hist-table-wrap">
            {/* Header */}
            <div className="hist-header">
              <div className="hist-cell hist-cell--date">Ngày</div>
              <div className="hist-cell hist-cell--main">Khách hàng / Sản phẩm</div>
              <div className="hist-cell hist-cell--structure">Cấu trúc</div>
              <div className="hist-cell hist-cell--qty">Số lượng</div>
              <div className="hist-cell hist-cell--prices">Giá (đ/túi)</div>
              <div className="hist-cell hist-cell--actions">Thao tác</div>
            </div>

            {/* Rows */}
            {history.map((item) => {
              const hasChotGia = item.chotGia && item.chotGia > 0;
              const diff = hasChotGia ? item.chotGia! - item.finalPrice : 0;
              const diffPct = hasChotGia && item.finalPrice > 0 ? (diff / item.finalPrice) * 100 : 0;

              return (
                <div key={item.id} className="hist-row">
                  {/* Date */}
                  <div className="hist-cell hist-cell--date">
                    <Calendar size={13} className="hist-cell-icon" />
                    <span>{item.date}</span>
                  </div>

                  {/* Customer & Product */}
                  <div className="hist-cell hist-cell--main">
                    <div className="hist-customer">
                      <User size={13} className="hist-cell-icon" />
                      <span className="hist-customer-name">{item.customer || '—'}</span>
                    </div>
                    <div className="hist-product">
                      <Package size={13} className="hist-cell-icon" style={{ opacity: 0.5 }} />
                      <span className="hist-product-name">{item.productName || '—'}</span>
                    </div>
                  </div>

                  {/* Structure */}
                  <div className="hist-cell hist-cell--structure">
                    <Layers size={13} className="hist-cell-icon" />
                    <span className="hist-structure-text">{item.structure}</span>
                  </div>

                  {/* Quantity */}
                  <div className="hist-cell hist-cell--qty">
                    <Hash size={13} className="hist-cell-icon" />
                    <span>{fmt(item.quantity)}</span>
                  </div>

                  {/* Prices */}
                  <div className="hist-cell hist-cell--prices">
                    <div className="hist-price-row">
                      <span className="hist-price-label">Đề xuất:</span>
                      <span className="hist-price-val hist-price-val--suggested">{fmt(item.finalPrice)} đ</span>
                    </div>
                    {hasChotGia ? (
                      <div className="hist-price-row">
                        <span className="hist-price-label">Chốt:</span>
                        <span className="hist-price-val hist-price-val--final">{fmt(item.chotGia!)} đ</span>
                        <span
                          className="hist-price-diff"
                          style={{ color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}
                        >
                          ({diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      <div className="hist-price-row">
                        <span className="hist-price-label">Chốt:</span>
                        <span style={{ color: 'var(--dim)', fontSize: '0.78rem' }}>Chưa chốt</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="hist-cell hist-cell--actions">
                    <button
                      className="crm-btn crm-btn-ghost hist-action-btn"
                      title="Tải lại và chỉnh sửa tính toán này"
                      onClick={() => taiLichSu(item.id)}
                    >
                      <RotateCcw size={14} />
                      <span>Tải</span>
                    </button>
                    <button
                      className="crm-btn crm-btn-ghost hist-action-btn hist-action-btn--danger"
                      title="Xóa khỏi lịch sử"
                      onClick={() => xoaLichSu(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
