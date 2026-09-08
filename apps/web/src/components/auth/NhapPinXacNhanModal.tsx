'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import NhapMaPin from './NhapMaPin';

interface NhapPinXacNhanModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const SO_O = 6;
const RE_PIN_DAY_DU = new RegExp(`^\\d{${SO_O}}$`);

/**
 * Modal UI-only nhập mã PIN để xác nhận thao tác nhạy cảm.
 * Không gọi service PIN nào — chỉ là cửa sổ chờ user nhập đủ 6 số rồi bấm "Xác nhận".
 * Khi backend sẵn sàng, thay bằng NhapPinDuyetModal + truyền pinToken xuống service.
 */
export default function NhapPinXacNhanModal({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận lưu',
  onConfirm,
  onClose,
}: NhapPinXacNhanModalProps) {
  const [pin, setPin] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setDangXuLy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dangXuLy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, dangXuLy, onClose]);

  if (!open) return null;

  const hopLe = RE_PIN_DAY_DU.test(pin);
  const coTheXacNhan = hopLe && !dangXuLy;

  function dong() {
    if (dangXuLy) return;
    setPin('');
    setDangXuLy(false);
    onClose();
  }

  async function xacNhan() {
    if (!coTheXacNhan) return;
    setDangXuLy(true);
    try {
      await onConfirm();
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <div className="lts-modal-overlay" onClick={dong}>
      <div
        className="lts-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nhap-pin-xac-nhan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lts-modal-head">
          <div className="lts-modal-head-icon"><KeyRound size={18} /></div>
          <div>
            <h3 id="nhap-pin-xac-nhan-title">{title}</h3>
            <p className="lts-modal-sub">{message}</p>
          </div>
        </div>

        <div className="lts-modal-body">
          <p className="lts-pin-note">
            Nhập mã PIN 6 chữ số để xác nhận thay đổi. Máy chủ sẽ kiểm tra mã PIN ở bước sau.
          </p>
          <div className="lts-field">
            <span className="lts-field-label">Mã PIN</span>
            <NhapMaPin
              value={pin}
              onChange={setPin}
              disabled={dangXuLy}
              autoFocus
              onEnter={() => {
                if (coTheXacNhan) void xacNhan();
              }}
            />
          </div>
        </div>

        <div className="lts-modal-foot">
          <button
            type="button"
            className="lts-btn lts-btn--ghost"
            onClick={dong}
            disabled={dangXuLy}
          >
            Hủy
          </button>
          <button
            type="button"
            className="lts-btn lts-btn--primary"
            onClick={xacNhan}
            disabled={!coTheXacNhan}
          >
            {dangXuLy ? (
              <><Loader2 size={14} className="um-spin" /> Đang lưu...</>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
