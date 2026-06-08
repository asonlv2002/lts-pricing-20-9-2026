"use client";
import React, { useState } from 'react';
import { Clock, RotateCcw, Eye, X } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { VersionSnapshot } from '../lib/types';
import { normalizeDisplayText } from '../lib/text-codec';

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }

interface Props {
  historyItemId: string;
  onClose: () => void;
}

export default function PanelPhienBan({ historyItemId, onClose }: Props) {
  const { layPhienBanTheoMuc, khoiPhucPhienBan } = dungCuaHangTinhGia();
  const versions = layPhienBanTheoMuc(historyItemId);
  const [preview, setPreview] = useState<VersionSnapshot | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const handleRestore = (versionId: string) => {
    khoiPhucPhienBan(versionId);
    setConfirmRestore(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Clock size={18} /> Lịch sử phiên bản
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: 500, overflow: 'auto' }}>
          {versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Chưa có phiên bản nào được lưu
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {versions.map((v, idx) => (
                <div key={v.id} style={{
                  padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {v.label || `Phiên bản ${versions.length - idx}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(v.timestamp).toLocaleString('vi-VN')} · {normalizeDisplayText(v.userName)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setPreview(preview?.id === v.id ? null : v)}
                        title="Xem trước"
                      >
                        <Eye size={13} />
                      </button>
                      {confirmRestore === v.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleRestore(v.id)}>Xác nhận</button>
                          <button className="btn btn-sm btn-outline" onClick={() => setConfirmRestore(null)}>Hủy</button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setConfirmRestore(v.id)}
                          title="Khôi phục"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {preview?.id === v.id && (
                    <div style={{
                      marginTop: 10, padding: 10, borderRadius: 6,
                      background: 'var(--surface2)', fontSize: '0.78rem',
                    }}>
                      <div><strong>Khách hàng:</strong> {v.data.customer}</div>
                      <div><strong>Sản phẩm:</strong> {v.data.productName}</div>
                      <div><strong>Cấu trúc:</strong> {v.data.structure}</div>
                      <div><strong>Số lượng:</strong> {dinhDangSo(v.data.quantity)}</div>
                      <div><strong>Giá đề xuất:</strong> {dinhDangSo(Math.round(v.data.finalPrice))} đ</div>
                      {v.data.chotGia && <div><strong>Giá chốt:</strong> {dinhDangSo(Math.round(v.data.chotGia))} đ</div>}
                      <div><strong>Trạng thái:</strong> {v.data.quoteStatus || 'drafted'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
