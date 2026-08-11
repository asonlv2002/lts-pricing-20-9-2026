'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { hasPin, setPin, doiPin } from '../../lib/pin-store';

export default function DoiPinModal({ dong }: { dong: () => void }) {
  const daCoPin = hasPin();

  const [pinCu, setPinCu] = useState('');
  const [pinMoi, setPinMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thanhCong, setThanhCong] = useState(false);

  function reset() {
    setPinCu('');
    setPinMoi('');
    setXacNhan('');
    setLoi(null);
    setThanhCong(false);
    setDangXuLy(false);
  }

  function locSo(value: string) {
    return value.replace(/\D/g, '').slice(0, 6);
  }

  async function xuLyLuu(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);

    if (!/^\d{6}$/.test(pinMoi)) {
      setLoi('Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    if (pinMoi !== xacNhan) {
      setLoi('Mã PIN xác nhận không khớp.');
      return;
    }
    if (daCoPin && !/^\d{6}$/.test(pinCu)) {
      setLoi('Vui lòng nhập mã PIN hiện tại.');
      return;
    }

    setDangXuLy(true);
    try {
      if (daCoPin) {
        await doiPin(pinCu, pinMoi);
      } else {
        await setPin(pinMoi);
      }
      setThanhCong(true);
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Đổi mã PIN thất bại.');
    } finally {
      setDangXuLy(false);
    }
  }

  function xuLyDong() {
    reset();
    dong();
  }

  return (
    <div className="lts-modal-overlay" onClick={xuLyDong}>
      <div className="lts-modal-card" role="dialog" aria-modal="true" aria-labelledby="doi-pin-modal-title" onClick={e => e.stopPropagation()}>
        {thanhCong ? (
          <div className="lts-modal-success">
            <div className="lts-modal-success-icon">&#10003;</div>
            <h3>{daCoPin ? 'Đổi mã PIN thành công' : 'Đặt mã PIN thành công'}</h3>
            <p>Từ giờ, mỗi lần duyệt báo giá / LSX bạn cần nhập mã PIN.</p>
            <button className="lts-btn lts-btn--primary" onClick={xuLyDong}>
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={xuLyLuu}>
            <div className="lts-modal-head">
              <div className="lts-modal-head-icon">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 id="doi-pin-modal-title">
                  {daCoPin ? 'Đổi mã PIN duyệt' : 'Đặt mã PIN duyệt'}
                </h3>
                <p className="lts-modal-sub">
                  Mã PIN 6 số dùng khi bạn duyệt báo giá / LSX
                </p>
              </div>
            </div>

            <div className="lts-modal-body">
              {loi && <div className="lts-modal-error">{loi}</div>}

              {daCoPin && (
                <label className="lts-field">
                  <span className="lts-field-label">Mã PIN hiện tại</span>
                  <div className="lts-field-wrap">
                    <input
                      className="lts-field-input lts-pin-input"
                      type="password"
                      value={pinCu}
                      onChange={e => setPinCu(locSo(e.target.value))}
                      placeholder="••••••"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      disabled={dangXuLy}
                    />
                  </div>
                </label>
              )}

              <label className="lts-field">
                <span className="lts-field-label">Mã PIN mới</span>
                <div className="lts-field-wrap">
                  <input
                    className="lts-field-input lts-pin-input"
                    type="password"
                    value={pinMoi}
                    onChange={e => setPinMoi(locSo(e.target.value))}
                    placeholder="••••••"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={dangXuLy}
                  />
                </div>
                <span className="lts-field-hint">Gồm đúng 6 chữ số</span>
              </label>

              <label className="lts-field">
                <span className="lts-field-label">Nhập lại mã PIN mới</span>
                <div className="lts-field-wrap">
                  <input
                    className="lts-field-input lts-pin-input"
                    type="password"
                    value={xacNhan}
                    onChange={e => setXacNhan(locSo(e.target.value))}
                    placeholder="••••••"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={dangXuLy}
                  />
                </div>
              </label>

              <p className="lts-pin-note">
                <ShieldCheck size={13} />
                PIN được mã hóa, chỉ lưu trên máy của bạn. Không chia sẻ với người khác.
              </p>
            </div>

            <div className="lts-modal-foot">
              <button
                type="button"
                className="lts-btn lts-btn--ghost"
                onClick={xuLyDong}
                disabled={dangXuLy}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="lts-btn lts-btn--primary"
                disabled={dangXuLy || !/^\d{6}$/.test(pinMoi) || pinMoi !== xacNhan || (daCoPin && !/^\d{6}$/.test(pinCu))}
              >
                {dangXuLy ? (
                  <><Loader2 size={14} className="um-spin" /> Đang lưu...</>
                ) : (
                  daCoPin ? 'Lưu PIN mới' : 'Đặt PIN'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
