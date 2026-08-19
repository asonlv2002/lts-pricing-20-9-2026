'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock3, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import {
  datMatKhauMoiTuYeuCauService,
  taoYeuCauDatLaiMatKhauService,
  xacThucMaDatLaiMatKhauService,
} from '../../lib/api/service-lts';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';

type Buoc = 'account' | 'waiting' | 'code' | 'password' | 'done';

const BUOC_ORDER: Buoc[] = ['account', 'waiting', 'code', 'password'];

function demNguocDen(expiresAt: string | null, nowMs: number): string {
  if (!expiresAt) return '—';
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (!Number.isFinite(ms) || ms <= 0) return 'Đã hết hạn';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h} giờ ${rm} phút`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function daHetHan(expiresAt: string | null, nowMs: number): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t <= nowMs;
}

function tieuDeBuoc(buoc: Buoc): string {
  if (buoc === 'account') return 'Đặt lại mật khẩu';
  if (buoc === 'waiting') return 'Chờ duyệt';
  if (buoc === 'code') return 'Nhập mã 6 số';
  if (buoc === 'password') return 'Mật khẩu mới';
  return 'Hoàn tất';
}

function moTaBuoc(buoc: Buoc): string {
  if (buoc === 'account') return 'Gửi yêu cầu tới quản lý tài khoản để nhận mã đặt lại.';
  if (buoc === 'waiting') return 'Yêu cầu đã gửi. Liên hệ quản lý để được duyệt.';
  if (buoc === 'code') return 'Nhập mã 6 số quản lý đã chuyển cho bạn.';
  if (buoc === 'password') return 'Tạo mật khẩu mới cho tài khoản của bạn.';
  return 'Bạn đã có thể dùng mật khẩu mới.';
}

export default function YeuCauDatLaiMatKhauFlow({
  quayLaiDangNhap,
  accountBanDau = '',
}: {
  quayLaiDangNhap: () => void;
  accountBanDau?: string;
}) {
  const apDungPhienTuDangNhap = dungCuaHangTinhGia(s => s.apDungPhienTuDangNhap);

  const [buoc, setBuoc] = useState<Buoc>('account');
  const [account, setAccount] = useState(accountBanDau);
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [hienMoi, setHienMoi] = useState(false);
  const [hienXacNhan, setHienXacNhan] = useState(false);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const hetHan = useMemo(() => daHetHan(expiresAt, nowMs), [expiresAt, nowMs]);
  const demNguoc = useMemo(() => demNguocDen(expiresAt, nowMs), [expiresAt, nowMs]);
  const accHienThi = account.trim() || '—';
  const buocHienTai = Math.min(BUOC_ORDER.indexOf(buoc === 'done' ? 'password' : buoc), 3);

  const guiYeuCau = useCallback(async () => {
    const acc = account.trim();
    if (!acc) {
      setLoi('Vui lòng nhập tài khoản.');
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      await taoYeuCauDatLaiMatKhauService(acc);
      setBuoc('waiting');
      setCode('');
      setRequestId(null);
      setExpiresAt(null);
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Không gửi được yêu cầu.');
    } finally {
      setDangXuLy(false);
    }
  }, [account]);

  const xacThucMa = useCallback(async () => {
    const acc = account.trim();
    const ma = code.trim();
    if (!/^\d{6}$/.test(ma)) {
      setLoi('Mã phải gồm đúng 6 chữ số.');
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      const res = await xacThucMaDatLaiMatKhauService(acc, ma);
      if (res.status !== 'verified') {
        setLoi('Xác thực chưa thành công. Thử lại.');
        return;
      }
      setRequestId(res.id);
      setExpiresAt(res.expiresAt);
      setBuoc('password');
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Mã không đúng hoặc đã hết hạn.');
    } finally {
      setDangXuLy(false);
    }
  }, [account, code]);

  const luuMatKhau = useCallback(async () => {
    const acc = account.trim();
    if (!requestId) {
      setLoi('Thiếu mã yêu cầu. Vui lòng xác thực lại.');
      setBuoc('code');
      return;
    }
    if (!matKhauMoi || !xacNhan) {
      setLoi('Vui lòng điền đầy đủ mật khẩu.');
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
    setLoi(null);
    try {
      const data = await datMatKhauMoiTuYeuCauService(acc, requestId, matKhauMoi);
      await apDungPhienTuDangNhap(data);
      setBuoc('done');
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Không đặt được mật khẩu mới.');
    } finally {
      setDangXuLy(false);
    }
  }, [account, requestId, matKhauMoi, xacNhan, apDungPhienTuDangNhap]);

  return (
    <div className="lts-login-card lts-reset-card">
      <header className="lts-reset-head">
        <button
          type="button"
          className="lts-reset-back"
          onClick={quayLaiDangNhap}
          disabled={dangXuLy || buoc === 'done'}
          aria-label="Quay lại đăng nhập"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="lts-reset-brand">
          LTS<span> Service</span>
        </div>
        <span className="lts-reset-head-spacer" aria-hidden />
      </header>

      {buoc !== 'done' && (
        <div className="lts-reset-progress" aria-hidden>
          {BUOC_ORDER.map((s, i) => (
            <span
              key={s}
              className={
                i < buocHienTai
                  ? 'lts-reset-progress__seg lts-reset-progress__seg--done'
                  : i === buocHienTai
                    ? 'lts-reset-progress__seg lts-reset-progress__seg--on'
                    : 'lts-reset-progress__seg'
              }
            />
          ))}
        </div>
      )}

      <div className="lts-reset-title-block">
        <h2 className="lts-reset-title">{tieuDeBuoc(buoc)}</h2>
        <p className="lts-reset-desc">{moTaBuoc(buoc)}</p>
      </div>

      {loi && <div className="lts-login-error">{loi}</div>}

      {buoc === 'account' && (
        <form
          className="lts-login-form lts-reset-body"
          onSubmit={e => {
            e.preventDefault();
            void guiYeuCau();
          }}
        >
          <label className="lts-login-field">
            <span className="lts-login-label">Tài khoản</span>
            <input
              className="lts-login-input"
              value={account}
              onChange={e => setAccount(e.target.value)}
              placeholder="Nhập tài khoản đăng nhập"
              autoComplete="username"
              autoFocus
              required
              disabled={dangXuLy}
            />
          </label>
          <ul className="lts-reset-tips">
            <li>Quản lý duyệt yêu cầu và gửi mã 6 số cho bạn</li>
            <li>Mã có hạn — dùng ngay khi nhận được</li>
          </ul>
          <button
            type="submit"
            className="lts-login-btn"
            disabled={dangXuLy || !account.trim()}
          >
            {dangXuLy ? (
              <>
                <Loader2 size={16} className="um-spin" /> Đang gửi...
              </>
            ) : (
              'Gửi yêu cầu'
            )}
          </button>
        </form>
      )}

      {buoc === 'waiting' && (
        <div className="lts-login-form lts-reset-body">
          <div className="lts-reset-status-card">
            <div className="lts-reset-status-card__icon">
              <Clock3 size={22} />
            </div>
            <div className="lts-reset-status-card__main">
              <span className="lts-reset-pill lts-reset-pill--wait">Đang chờ duyệt</span>
              <div className="lts-reset-account-chip">@{accHienThi}</div>
              <p>
                Báo quản lý tài khoản duyệt yêu cầu, rồi nhận mã 6 số qua chat hoặc gọi điện.
              </p>
            </div>
          </div>

          <ol className="lts-reset-checklist">
            <li className="lts-reset-checklist__done">
              <Check size={14} /> Đã gửi yêu cầu
            </li>
            <li className="lts-reset-checklist__current">
              <span className="lts-reset-checklist__dot" /> Chờ quản lý duyệt
            </li>
            <li>
              <span className="lts-reset-checklist__num">3</span> Nhập mã & đặt mật khẩu
            </li>
          </ol>

          <button
            type="button"
            className="lts-login-btn"
            onClick={() => {
              setLoi(null);
              setBuoc('code');
            }}
          >
            <KeyRound size={16} /> Tôi đã có mã
          </button>
          <button
            type="button"
            className="lts-reset-secondary-btn"
            onClick={() => void guiYeuCau()}
            disabled={dangXuLy}
          >
            {dangXuLy ? (
              <>
                <Loader2 size={14} className="um-spin" /> Đang gửi lại...
              </>
            ) : (
              'Gửi lại yêu cầu'
            )}
          </button>
        </div>
      )}

      {buoc === 'code' && (
        <form
          className="lts-login-form lts-reset-body"
          onSubmit={e => {
            e.preventDefault();
            void xacThucMa();
          }}
        >
          <div className="lts-reset-account-chip lts-reset-account-chip--center">@{accHienThi}</div>
          <label className="lts-login-field">
            <span className="lts-login-label">Mã xác thực</span>
            <input
              className="lts-login-input lts-reset-otp"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              disabled={dangXuLy}
            />
          </label>
          <button
            type="submit"
            className="lts-login-btn"
            disabled={dangXuLy || code.length !== 6}
          >
            {dangXuLy ? (
              <>
                <Loader2 size={16} className="um-spin" /> Đang xác thực...
              </>
            ) : (
              'Xác thực mã'
            )}
          </button>
          <button
            type="button"
            className="lts-reset-secondary-btn"
            onClick={() => {
              setLoi(null);
              setBuoc('waiting');
            }}
            disabled={dangXuLy}
          >
            Chưa có mã — quay lại
          </button>
        </form>
      )}

      {buoc === 'password' && (
        <form
          className="lts-login-form lts-reset-body"
          onSubmit={e => {
            e.preventDefault();
            void luuMatKhau();
          }}
        >
          <div className="lts-reset-meta-row">
            <span className="lts-reset-account-chip">@{accHienThi}</span>
            {expiresAt && (
              <span className={`lts-reset-timer${hetHan ? ' lts-reset-timer--bad' : ''}`}>
                <Clock3 size={13} /> {hetHan ? 'Hết hạn' : demNguoc}
              </span>
            )}
          </div>
          <label className="lts-login-field">
            <span className="lts-login-label">Mật khẩu mới</span>
            <div className="lts-login-pw-wrap">
              <input
                className="lts-login-input"
                type={hienMoi ? 'text' : 'password'}
                value={matKhauMoi}
                onChange={e => setMatKhauMoi(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                autoFocus
                disabled={dangXuLy || hetHan}
              />
              <button
                type="button"
                className="lts-login-pw-toggle"
                onClick={() => setHienMoi(v => !v)}
                tabIndex={-1}
              >
                {hienMoi ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <label className="lts-login-field">
            <span className="lts-login-label">Xác nhận mật khẩu</span>
            <div className="lts-login-pw-wrap">
              <input
                className="lts-login-input"
                type={hienXacNhan ? 'text' : 'password'}
                value={xacNhan}
                onChange={e => setXacNhan(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={dangXuLy || hetHan}
              />
              <button
                type="button"
                className="lts-login-pw-toggle"
                onClick={() => setHienXacNhan(v => !v)}
                tabIndex={-1}
              >
                {hienXacNhan ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {hetHan ? (
            <button
              type="button"
              className="lts-login-btn"
              onClick={() => {
                setLoi(null);
                setBuoc('account');
              }}
            >
              Yêu cầu hết hạn — gửi lại
            </button>
          ) : (
            <button
              type="submit"
              className="lts-login-btn"
              disabled={dangXuLy || !matKhauMoi || !xacNhan}
            >
              {dangXuLy ? (
                <>
                  <Loader2 size={16} className="um-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu mật khẩu mới'
              )}
            </button>
          )}
        </form>
      )}

      {buoc === 'done' && (
        <div className="lts-reset-done">
          <div className="lts-reset-done-icon">
            <ShieldCheck size={28} />
          </div>
          <h3>Đặt mật khẩu thành công</h3>
          <p>Đã đăng nhập với phiên mới cho @{accHienThi}.</p>
        </div>
      )}
    </div>
  );
}
