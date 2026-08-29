'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';

interface NhapLyDoTruocPinModalProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Bắt buộc nhập lý do (disable nút Tiếp tục tới khi có nội dung). */
  batBuoc?: boolean;
  onConfirm: (lyDo: string) => void;
  onClose: () => void;
}

/**
 * Popup nhập lý do trước khi nhập mã PIN khi TỪ CHỐI.
 * Hiện tại chỉ là UI — lý do (nếu có) sẽ được đổ về từ server sau này.
 */
export default function NhapLyDoTruocPinModal({
  open,
  title,
  message,
  confirmLabel = 'Tiếp tục',
  batBuoc = false,
  onConfirm,
  onClose,
}: NhapLyDoTruocPinModalProps) {
  const [lyDo, setLyDo] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setLyDo('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function dong() {
    setLyDo('');
    onClose();
  }

  const giaTriLyDo = lyDo.trim();
  const coTheTiepTuc = !batBuoc || giaTriLyDo.length > 0;

  return (
    <div className="lts-modal-overlay" onClick={dong}>
      <div
        className="lts-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nhap-ly-do-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lts-modal-head">
          <div className="lts-modal-head-icon"><MessageSquareText size={18} /></div>
          <div>
            <h3 id="nhap-ly-do-modal-title">{title}</h3>
            <p className="lts-modal-sub">{message}</p>
          </div>
        </div>

        <div className="lts-modal-body">
          <div className="lts-field">
            <span className="lts-field-label">
              Lý do {batBuoc ? '(bắt buộc)' : '(không bắt buộc)'}
            </span>
            <textarea
              ref={inputRef}
              className="lts-field-input lts-field-input--textarea"
              rows={4}
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="lts-modal-foot">
          <button type="button" className="lts-btn lts-btn--ghost" onClick={dong}>
            Hủy
          </button>
          <button
            type="button"
            className="lts-btn lts-btn--primary"
            disabled={!coTheTiepTuc}
            onClick={() => {
              setLyDo('');
              onConfirm(giaTriLyDo);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}