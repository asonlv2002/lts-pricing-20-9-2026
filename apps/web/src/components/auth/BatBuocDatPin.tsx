'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import {
  layTrangThaiBaoMatService,
  datPinService,
} from '../../lib/api/service-lts';
import NhapMaPin from './NhapMaPin';

type Buoc = 'dangTai' | 'chuaDat' | 'daDat';

export default function BatBuocDatPin({ children }: { children: React.ReactNode }) {
  const accessToken = dungCuaHangTinhGia((s) => s.accessToken);
  const isAuthenticated = dungCuaHangTinhGia((s) => s.isAuthenticated);
  const logout = dungCuaHangTinhGia((s) => s.logout);

  const [buoc, setBuoc] = useState<Buoc>('dangTai');
  const [loi, setLoi] = useState<string | null>(null);
  const [matKhau, setMatKhau] = useState('');
  const [pinMoi, setPinMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  const kiemTra = () => {
    if (!isAuthenticated || !accessToken) {
      setBuoc('dangTai');
      return;
    }
    setBuoc('dangTai');
    setLoi(null);
    layTrangThaiBaoMatService(accessToken)
      .then((tt) => setBuoc(tt.hasPin ? 'daDat' : 'chuaDat'))
      .catch((err) => {
        // 401 đã được goiService xử lý refresh / hết phiên — không logout tay ở đây.
        const msg = err instanceof Error ? err.message : 'Không kiểm tra được mã PIN.';
        setLoi(msg);
        // Giữ dangTai + nút Thử lại; không ép logout khi lỗi mạng tạm thời.
        setBuoc('dangTai');
      });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setBuoc('dangTai');
      setLoi(null);
      return;
    }
    kiemTra();
  }, [accessToken, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) return <>{children}</>;

  if (buoc === 'dangTai') {
    return (
      <div className="lts-login-root">
        <div className="lts-login-card">
          <div className="lts-login-loading">
            <Loader2 size={28} className="um-spin" />
            <span className="lts-login-loading__text">Đang kiểm tra mã PIN...</span>
          </div>
          {loi && (
            <div className="lts-login-error" style={{ marginTop: 12 }}>
              {loi}
            </div>
          )}
          {loi && (
            <button type="button" className="lts-login-btn" style={{ marginTop: 12 }} onClick={kiemTra}>
              Thử lại
            </button>
          )}
          {loi && (
            <button
              type="button"
              className="lts-login-btn"
              style={{ background: 'transparent', color: '#8a8f98', border: '1px solid #d5d9e0', marginTop: 8 }}
              onClick={logout}
            >
              Đăng xuất
            </button>
          )}
        </div>
      </div>
    );
  }

  if (buoc === 'daDat') return <>{children}</>;

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
    if (!accessToken) return;
    setDangXuLy(true);
    try {
      await datPinService(matKhau, pinMoi, accessToken);
      setBuoc('daDat');
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Đặt mã PIN thất bại.');
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <div className="lts-login-root">
      <div className="lts-login-card">
        <div className="lts-login-logo">
          LTS<span> Service</span>
        </div>
        <p className="lts-login-subtitle">
          <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Bạn cần đặt mã PIN 6 số trước khi sử dụng hệ thống
        </p>

        <form className="lts-login-form" onSubmit={xuLyLuu}>
          <label className="lts-login-field">
            <span className="lts-login-label">Mật khẩu hiện tại</span>
            <input
              className="lts-login-input"
              type="password"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
              disabled={dangXuLy}
              autoFocus
            />
          </label>

          <label className="lts-login-field">
            <span className="lts-login-label">Mã PIN mới (6 số)</span>
            <NhapMaPin value={pinMoi} onChange={setPinMoi} disabled={dangXuLy} />
          </label>

          <label className="lts-login-field">
            <span className="lts-login-label">Nhập lại mã PIN</span>
            <NhapMaPin value={xacNhan} onChange={setXacNhan} disabled={dangXuLy} />
          </label>

          {loi && <div className="lts-login-error">{loi}</div>}

          <button
            type="submit"
            className="lts-login-btn"
            disabled={dangXuLy || !matKhau || !/^\d{6}$/.test(pinMoi) || pinMoi !== xacNhan}
          >
            {dangXuLy ? (
              <><Loader2 size={16} className="um-spin" /> Đang lưu...</>
            ) : (
              'Lưu mã PIN'
            )}
          </button>

          <button
            type="button"
            className="lts-login-btn"
            style={{ background: 'transparent', color: '#8a8f98', border: '1px solid #d5d9e0', marginTop: 8 }}
            onClick={logout}
            disabled={dangXuLy}
          >
            Đăng xuất
          </button>
        </form>
      </div>
    </div>
  );
}
