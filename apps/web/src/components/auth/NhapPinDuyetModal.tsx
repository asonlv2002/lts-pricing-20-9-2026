'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import {
  hasPin,
  setPin,
  verifyPin,
  dangKhoa,
  soLanThuConLai,
  SO_LAN_SAI_TOI_DA,
  THOI_GIAN_KHOA_MS,
} from '../../lib/pin-store';

interface NhapPinDuyetModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function NhapPinDuyetModal({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận duyệt',
  onConfirm,
  onClose,
}: NhapPinDuyetModalProps) {
  const [buoc, setBuoc] = useState<'nhap' | 'dat'>(
    hasPin() ? 'nhap' : 'dat',
  );
  const [pin, setPinNhap] = useState('');
  const [pinMoi, setPinMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  if (!open) return null;

  function reset() {
    setPinNhap('');
    setPinMoi('');
    setXacNhan('');
    setLoi(null);
    setDangXuLy(false);
  }

  function locSo(value: string) {
    return value.replace(/\D/g, '').slice(0, 6);
  }

  function dong() {
    reset();
    onClose();
  }

  async function datPinMoi() {
    setLoi(null);
    if (!/^\d{6}$/.test(pinMoi)) {
      setLoi('Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    if (pinMoi !== xacNhan) {
      setLoi('Mã PIN xác nhận không khớp.');
      return;
    }
    setDangXuLy(true);
    try {
      await setPin(pinMoi);
      setPinNhap('');
      setPinMoi('');
      setXacNhan('');
      setBuoc('nhap');
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Đặt mã PIN thất bại.');
    } finally {
      setDangXuLy(false);
    }
  }

  async function xuLyDuyet() {
    setLoi(null);
    if (dangKhoa()) {
      setLoi(`Quá nhiều lần nhập sai. Thử lại sau ${Math.ceil(THOI_GIAN_KHOA_MS / 1000)} giây.`);
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setLoi('Vui lòng nhập đủ 6 chữ số.');
      return;
    }
    setDangXuLy(true);
    try {
      const dung = await verifyPin(pin);
      if (!dung) {
        const conLai = soLanThuConLai();
        setLoi(
          conLai > 0
            ? `Mã PIN không đúng (còn ${conLai} lần thử).`
            : `Mã PIN sai quá ${SO_LAN_SAI_TOI_DA} lần. Thử lại sau ${Math.ceil(THOI_GIAN_KHOA_MS / 1000)} giây.`,
        );
        setPinNhap('');
        setDangXuLy(false);
        return;
      }
      await onConfirm();
      reset();
      onClose();
    } catch (err) {
      setLoi(err instanceof Error ? err.message : 'Duyệt thất bại.');
      setDangXuLy(false);
    }
  }

  return (
    <div className="lts-modal-overlay" onClick={() => !dangXuLy && dong()}>
      <div className="lts-modal-card" role="dialog" aria-modal="true" aria-labelledby="nhap-pin-modal-title" onClick={e => e.stopPropagation()}>
        <div className="lts-modal-head">
          <div className="lts-modal-head-icon"><KeyRound size={18} /></div>
          <div>
            <h3 id="nhap-pin-modal-title">{title}</h3>
            <p className="lts-modal-sub">{message}</p>
          </div>
        </div>

        <div className="lts-modal-body">
          {loi && <div className="lts-modal-error" role="alert">{loi}</div>}

          {buoc === 'dat' ? (
            <>
              <p className="lts-pin-note">
                <ShieldCheck size={13} />
                Bạn chưa đặt mã PIN duyệt. Hãy đặt PIN 6 chữ số trước khi thực hiện duyệt.
              </p>
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
                    autoFocus
                    disabled={dangXuLy}
                  />
                </div>
              </label>
              <label className="lts-field">
                <span className="lts-field-label">Nhập lại mã PIN</span>
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
            </>
          ) : (
            <label className="lts-field">
              <span className="lts-field-label">Nhập mã PIN 6 số</span>
              <div className="lts-field-wrap">
                <input
                  className="lts-field-input lts-pin-input"
                  type="password"
                  value={pin}
                  onChange={e => setPinNhap(locSo(e.target.value))}
                  placeholder="••••••"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  disabled={dangXuLy}
                />
              </div>
            </label>
          )}
        </div>

        <div className="lts-modal-foot">
          <button type="button" className="lts-btn lts-btn--ghost" onClick={dong} disabled={dangXuLy}>
            Hủy
          </button>
          {buoc === 'dat' ? (
            <button
              type="button"
              className="lts-btn lts-btn--primary"
              onClick={datPinMoi}
              disabled={dangXuLy || !/^\d{6}$/.test(pinMoi) || pinMoi !== xacNhan}
            >
              {dangXuLy ? <><Loader2 size={14} className="um-spin" /> Đang lưu...</> : 'Lưu & tiếp tục'}
            </button>
          ) : (
            <button
              type="button"
              className="lts-btn lts-btn--primary"
              onClick={xuLyDuyet}
              disabled={dangXuLy || !/^\d{6}$/.test(pin)}
            >
              {dangXuLy ? <><Loader2 size={14} className="um-spin" /> Đang xử lý...</> : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
