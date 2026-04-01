'use client';
// src/app/login/page.tsx
import React, { useState, useEffect, FormEvent } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  // Apply theme from localStorage so login page respects saved preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lts-calculator-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        const theme = parsed?.state?.theme ?? 'light';
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/';
      } else {
        setError(data.message ?? 'Đăng nhập thất bại.');
      }
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lts-login-root">
      <div className="lts-login-card">
        {/* Logo */}
        <div className="lts-login-logo">
          LTS<span>PRICING</span>
        </div>
        <p className="lts-login-subtitle">Công cụ báo giá bao bì — Lai Trường Sơn</p>

        <form className="lts-login-form" onSubmit={handleSubmit} noValidate>
          <div className="lts-login-field">
            <label className="lts-login-label" htmlFor="username">
              Tên đăng nhập
            </label>
            <input
              id="username"
              className="lts-login-input"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              disabled={loading}
              required
            />
          </div>

          <div className="lts-login-field">
            <label className="lts-login-label" htmlFor="password">
              Mật khẩu
            </label>
            <div className="lts-login-pw-wrap">
              <input
                id="password"
                className="lts-login-input"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="lts-login-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="lts-login-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            className="lts-login-btn"
            type="submit"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <span className="lts-login-spinner" />
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <p className="lts-login-hint">
          Liên hệ quản trị viên nếu quên mật khẩu.
        </p>
      </div>
    </div>
  );
}
