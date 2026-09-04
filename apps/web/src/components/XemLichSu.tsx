"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { Calendar, User, Package, Layers, Hash, RotateCcw, Trash2 } from 'lucide-react';

function dinhDangSo(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function XemLichSu() {
  const { activeView: manHinhDangMo, history: lichSu, removeHistoryItem: xoaLichSu } = dungCuaHangTinhGia();

  if (manHinhDangMo !== 'history') return null;

  if (!lichSu.length) {
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
              <div className="hist-cell hist-cell--prices">Giá</div>
              <div className="hist-cell hist-cell--actions">Thao tác</div>
            </div>

            {/* Rows */}
            {lichSu.map((muc) => {
              const coGiaChot = muc.chotGia && muc.chotGia > 0;
              const hienThiGia = getPricingDisplayMeta(muc.input);
              const chenhLech = coGiaChot ? muc.chotGia! - muc.finalPrice : 0;
              const phanTramChenh = coGiaChot && muc.finalPrice > 0 ? (chenhLech / muc.finalPrice) * 100 : 0;

              return (
                <div key={muc.id} className="hist-row">
                  {/* Date */}
                  <div className="hist-cell hist-cell--date">
                    <Calendar size={13} className="hist-cell-icon" />
                    <span>{muc.date}</span>
                  </div>

                  {/* Customer & Product */}
                  <div className="hist-cell hist-cell--main">
                    <div className="hist-customer">
                      <User size={13} className="hist-cell-icon" />
                      <span className="hist-customer-name">{muc.customer || '—'}</span>
                    </div>
                    <div className="hist-product">
                      <Package size={13} className="hist-cell-icon" style={{ opacity: 0.5 }} />
                      <span className="hist-product-name">{muc.productName || '—'}</span>
                    </div>
                  </div>

                  {/* Structure */}
                  <div className="hist-cell hist-cell--structure">
                    <Layers size={13} className="hist-cell-icon" />
                    <span className="hist-structure-text">{muc.structure}</span>
                  </div>

                  {/* Quantity */}
                  <div className="hist-cell hist-cell--qty">
                    <Hash size={13} className="hist-cell-icon" />
                    <span>{dinhDangSo(muc.quantity)} {hienThiGia.quantityUnitForHistory}</span>
                  </div>

                  {/* Prices */}
                  <div className="hist-cell hist-cell--prices">
                    <div className="hist-price-row">
                      <span className="hist-price-label">Đề xuất:</span>
                      <span className="hist-price-val hist-price-val--suggested">{dinhDangSo(muc.finalPrice)} đ/{hienThiGia.unit}</span>
                    </div>
                    {coGiaChot ? (
                      <div className="hist-price-row">
                        <span className="hist-price-label">Chốt:</span>
                        <span className="hist-price-val hist-price-val--final">{dinhDangSo(muc.chotGia!)} đ/{hienThiGia.unit}</span>
                        <span
                          className="hist-price-chenhLech"
                          style={{ color: chenhLech >= 0 ? 'var(--green)' : 'var(--red)' }}
                        >
                          ({chenhLech >= 0 ? '+' : ''}{phanTramChenh.toFixed(1)}%)
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
                      onClick={() => void dungCuaHangTinhGia.getState().moBangTinhVoiPin(muc.id)}
                    >
                      <RotateCcw size={14} />
                      <span>Tải</span>
                    </button>
                    <button
                      className="crm-btn crm-btn-ghost hist-action-btn hist-action-btn--danger"
                      title="Xóa khỏi lịch sử"
                      onClick={() => xoaLichSu(muc.id)}
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
