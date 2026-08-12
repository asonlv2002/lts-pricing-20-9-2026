'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useCalculatorStore } from '../../store/CuaHangTinhGia';
import { datPinService } from '../../lib/api/service-lts';
import NhapMaPin from './NhapMaPin';

export default function DoiPinModal({ dong }: { dong: () => void }) {
  const accessToken = useCalculatorStore((s) => s.accessToken);

  const [matKhau, setMatKhau] = useState('');
  const [pinMoi, setPinMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thanhCong, setThanhCong] = useState(false);

  function reset() {
    setMatKhau('');
    setPinMoi('');
    setXacNhan('');
    setLoi(null);
    setThanhCong(false);
    setDangXuLy(false);
  }

  async function xuLyLuu(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);

    if (!matKhau) {
      setLoi('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!/^\d{6}$/.test(pinMoi)) {
      setLoi('Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    if (pinMoi !== xacNhan) {
      setLoi('Mã PIN xác nhận không khớp.');
      return;
    }
    if (!accessToken) {
      setLoi('Cần đăng nhập để đổi mã PIN.');
      return;
    }

    setDangXuLy(true);
    try {
      await datPinService(matKhau, pinMoi, accessToken);
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
            <h3>Đổi mã PIN thành công</h3>
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
                <h3 id="doi-pin-modal-title">Đổi mã PIN duyệt</h3>
                <p className="lts-modal-sub">
                  Mã PIN 6 số dùng khi bạn duyệt báo giá / LSX
                </p>
              </div>
            </div>

            <div className="lts-modal-body">
              {loi && <div className="lts-modal-error">{loi}</div>}

              <label className="lts-field">
                <span className="lts-field-label">Mật khẩu hiện tại</span>
                <div className="lts-field-wrap">
                  <input
                    className="lts-field-input"
                    type="password"
                    value={matKhau}
                    onChange={e => setMatKhau(e.target.value)}
                    autoFocus
                    disabled={dangXuLy}
                  />
                </div>
              </label>

              <label className="lts-field">
                <span className="lts-field-label">Mã PIN mới</span>
                <NhapMaPin
                  value={pinMoi}
                  onChange={setPinMoi}
                  disabled={dangXuLy}
                  autoFocus
                />
                <span className="lts-field-hint">Gồm đúng 6 chữ số</span>
              </label>

              <label className="lts-field">
                <span className="lts-field-label">Nhập lại mã PIN mới</span>
                <NhapMaPin
                  value={xacNhan}
                  onChange={setXacNhan}
                  disabled={dangXuLy}
                />
              </label>

              <p className="lts-pin-note">
                <ShieldCheck size={13} />
                Mã PIN được lưu trên máy chủ. Không chia sẻ với người khác.
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
                disabled={dangXuLy || !/^\d{6}$/.test(pinMoi) || pinMoi !== xacNhan || !matKhau}
              >
                {dangXuLy ? (
                  <><Loader2 size={14} className="um-spin" /> Đang lưu...</>
                ) : (
                  'Lưu PIN mới'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
