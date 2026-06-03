'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';

export default function DoiMatKhauModal({ dong }: { dong: () => void }) {
  const doiMatKhau = dungCuaHangTinhGia(s => s.doiMatKhau);

  const [matKhauHienTai, setMatKhauHienTai] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thanhCong, setThanhCong] = useState(false);

  // Per-field visibility
  const [hienHienTai, setHienHienTai] = useState(false);
  const [hienMoi, setHienMoi] = useState(false);
  const [hienXacNhan, setHienXacNhan] = useState(false);

  function reset() {
    setMatKhauHienTai('');
    setMatKhauMoi('');
    setXacNhan('');
    setLoi(null);
    setThanhCong(false);
    setDangXuLy(false);
  }

  async function xuLyDoiMatKhau(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);

    if (!matKhauHienTai || !matKhauMoi || !xacNhan) {
      setLoi('Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (matKhauMoi.length < 6) {
      setLoi('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (matKhauMoi !== xacNhan) {
      setLoi('Mật khẩu xác nhận không khớp.');
      return;
    }

    setDangXuLy(true);
    try {
      await doiMatKhau(matKhauHienTai, matKhauMoi);
      setThanhCong(true);
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.');
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
      <div className="lts-modal-card" onClick={e => e.stopPropagation()}>
        {thanhCong ? (
          <div className="lts-modal-success">
            <div className="lts-modal-success-icon">&#10003;</div>
            <h3>Đổi mật khẩu thành công</h3>
            <p>Phiên làm việc đã được cập nhật với token mới.</p>
            <button className="lts-btn lts-btn--primary" onClick={xuLyDong}>
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={xuLyDoiMatKhau}>
            <div className="lts-modal-head">
              <div className="lts-modal-head-icon">
                <Lock size={18} />
              </div>
              <div>
                <h3>Đổi mật khẩu</h3>
                <p className="lts-modal-sub">
                  Đổi mật khẩu cho tài khoản{' '}
                  <strong>@{dungCuaHangTinhGia.getState().nguoiDungHienTai?.account || '—'}</strong>
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
                    type={hienHienTai ? 'text' : 'password'}
                    value={matKhauHienTai}
                    onChange={e => setMatKhauHienTai(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                    autoFocus
                    disabled={dangXuLy}
                  />
                  <button
                    type="button"
                    className="lts-field-eye"
                    onClick={() => setHienHienTai(v => !v)}
                    tabIndex={-1}
                  >
                    {hienHienTai ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="lts-field">
                <span className="lts-field-label">Mật khẩu mới</span>
                <div className="lts-field-wrap">
                  <input
                    className="lts-field-input"
                    type={hienMoi ? 'text' : 'password'}
                    value={matKhauMoi}
                    onChange={e => setMatKhauMoi(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                    disabled={dangXuLy}
                  />
                  <button
                    type="button"
                    className="lts-field-eye"
                    onClick={() => setHienMoi(v => !v)}
                    tabIndex={-1}
                  >
                    {hienMoi ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="lts-field-hint">Ít nhất 6 ký tự</span>
              </label>

              <label className="lts-field">
                <span className="lts-field-label">Xác nhận mật khẩu mới</span>
                <div className="lts-field-wrap">
                  <input
                    className="lts-field-input"
                    type={hienXacNhan ? 'text' : 'password'}
                    value={xacNhan}
                    onChange={e => setXacNhan(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                    disabled={dangXuLy}
                  />
                  <button
                    type="button"
                    className="lts-field-eye"
                    onClick={() => setHienXacNhan(v => !v)}
                    tabIndex={-1}
                  >
                    {hienXacNhan ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
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
                disabled={dangXuLy || !matKhauHienTai || !matKhauMoi || !xacNhan}
              >
                {dangXuLy ? (
                  <><Loader2 size={14} className="um-spin" /> Đang xử lý...</>
                ) : (
                  'Đổi mật khẩu'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
