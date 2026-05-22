"use client";
import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { QuoteTerms } from '../lib/types';

const VAT_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 8, label: '8%' },
  { value: 10, label: '10%' },
  { value: -1, label: 'Khác' },
];

interface Props {
  historyItemId: string;
  currentTerms?: QuoteTerms;
  onClose: () => void;
}

export default function FormDieuKhoanBaoGia({ historyItemId, currentTerms, onClose }: Props) {
  const { capNhatDieuKhoan } = dungCuaHangTinhGia();

  const [vatRate, setVatRate] = useState(currentTerms?.vatRate ?? 10);
  const [vatCustom, setVatCustom] = useState(currentTerms?.vatCustom ?? 0);
  const [validityDays, setValidityDays] = useState(currentTerms?.validityDays ?? 30);
  const [paymentTerms, setPaymentTerms] = useState(currentTerms?.paymentTerms ?? '');
  const [deliveryTime, setDeliveryTime] = useState(currentTerms?.deliveryTime ?? '');
  const [notes, setNotes] = useState(currentTerms?.notes ?? '');

  const handleSave = () => {
    const terms: QuoteTerms = {
      vatRate,
      vatCustom: vatRate === -1 ? vatCustom : undefined,
      validityDays,
      paymentTerms,
      deliveryTime,
      notes,
    };
    capNhatDieuKhoan(historyItemId, terms);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FileText size={18} /> Điều khoản báo giá
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* VAT */}
          <div className="form-group">
            <label className="form-label">Thuế VAT</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {VAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`toolbar-btn ${vatRate === opt.value ? 'active' : ''}`}
                  onClick={() => setVatRate(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {vatRate === -1 && (
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={vatCustom}
                onChange={e => setVatCustom(Number(e.target.value))}
                placeholder="Nhập % VAT"
                style={{ marginTop: 8, width: 120 }}
              />
            )}
          </div>

          {/* Hiệu lực */}
          <div className="form-group">
            <label className="form-label">Thời hạn hiệu lực (ngày)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={validityDays}
              onChange={e => setValidityDays(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>

          {/* Điều kiện thanh toán */}
          <div className="form-group">
            <label className="form-label">Điều kiện thanh toán</label>
            <textarea
              className="form-input"
              rows={2}
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              placeholder="VD: Thanh toán 50% khi đặt hàng, 50% khi giao hàng"
            />
          </div>

          {/* Thời gian giao hàng */}
          <div className="form-group">
            <label className="form-label">Thời gian giao hàng</label>
            <input
              className="form-input"
              type="text"
              value={deliveryTime}
              onChange={e => setDeliveryTime(e.target.value)}
              placeholder="VD: 15-20 ngày làm việc sau khi xác nhận đơn hàng"
            />
          </div>

          {/* Ghi chú */}
          <div className="form-group">
            <label className="form-label">Ghi chú</label>
            <textarea
              className="form-input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi chú thêm cho báo giá..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave}>Lưu điều khoản</button>
        </div>
      </div>
    </div>
  );
}
