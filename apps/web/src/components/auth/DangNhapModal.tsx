'use client';

import React, { useState, useEffect } from 'react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function DangNhapModal() {
  const login = dungCuaHangTinhGia(s => s.login);
  const authLoading = dungCuaHangTinhGia(s => s.authLoading);
  const authError = dungCuaHangTinhGia(s => s.authError);
  const sessionChecked = dungCuaHangTinhGia(s => s.sessionChecked);
  const kiemTraVaKhoiPhucPhien = dungCuaHangTinhGia(s => s.kiemTraVaKhoiPhucPhien);

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  useEffect(() => {
    if (!sessionChecked) {
      kiemTraVaKhoiPhucPhien();
    }
  }, [sessionChecked, kiemTraVaKhoiPhucPhien]);

  const xuLyDangNhap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocError(null);
    setDangXuLy(true);
    try {
      await login(account.trim(), password);
    } catch {
      setLocError(authError || 'Đăng nhập thất bại');
    } finally {
      setDangXuLy(false);
    }
  };

  const error = locError || authError;
  const isLoading = !sessionChecked || authLoading;

  return (
    <div className="lts-login-root">
      <div className="lts-login-card">
        {isLoading ? (
          <div className="lts-login-loading">
            <Loader2 size={28} className="um-spin" />
            <span className="lts-login-loading__text">Đang kiểm tra phiên làm việc...</span>
          </div>
        ) : (
          <>
            <div className="lts-login-logo">
              LTS<span> Service</span>
            </div>
            <p className="lts-login-subtitle">Đăng nhập để truy cập hệ thống quản trị</p>

            <form className="lts-login-form" onSubmit={xuLyDangNhap}>
              <label className="lts-login-field">
                <span className="lts-login-label">Tài khoản</span>
                <input
                  className="lts-login-input"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder="Nhập tài khoản"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={dangXuLy}
                />
              </label>

              <label className="lts-login-field">
                <span className="lts-login-label">Mật khẩu</span>
                <div className="lts-login-pw-wrap">
                  <input
                    className="lts-login-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    required
                    disabled={dangXuLy}
                  />
                  <button
                    type="button"
                    className="lts-login-pw-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="lts-login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="lts-login-btn"
                disabled={dangXuLy || !account.trim() || !password}
              >
                {dangXuLy ? (
                  <><Loader2 size={16} className="um-spin" /> Đang đăng nhập...</>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
