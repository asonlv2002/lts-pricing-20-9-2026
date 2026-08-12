'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useCalculatorStore } from '../../store/CuaHangTinhGia';
import {
  layTrangThaiBaoMatService,
  datPinService,
  xacThucPinService,
} from '../../lib/api/service-lts';
import NhapMaPin from './NhapMaPin';

const SO_LAN_SAI_TOI_DA = 5;
const THOI_GIAN_KHOA_MS = 30_000;

let soLanSai = 0;
let khoaDen: number | null = null;

interface NhapPinDuyetModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: (pinToken: string) => Promise<void> | void;
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
  const accessToken = useCalculatorStore((s) => s.accessToken);
  const [buoc, setBuoc] = useState<'dangTai' | 'nhap' | 'dat'>('dangTai');
  const [pin, setPinNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [pinMoi, setPinMoi] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset();
    if (!accessToken) {
      setLoi('Cần đăng nhập để xác nhận mã PIN.');
      setBuoc('nhap');
      return;
    }
    setBuoc('dangTai');
    layTrangThaiBaoMatService(accessToken)
      .then((tt) => setBuoc(tt.hasPin ? 'nhap' : 'dat'))
      .catch((err) => {
        setLoi(err instanceof Error ? err.message : 'Không kiểm tra được mã PIN.');
        setBuoc('nhap');
      });
  }, [open, accessToken]);

  if (!open) return null;

  function reset() {
    setPinNhap('');
    setMatKhau('');
    setPinMoi('');
    setXacNhan('');
    setLoi(null);
    setDangXuLy(false);
  }

  function dong() {
    reset();
    onClose();
  }

  function dangKhoa(): boolean {
    if (khoaDen && Date.now() > khoaDen) {
      khoaDen = null;
      soLanSai = 0;
    }
    return khoaDen !== null;
  }

  async function datPinMoi() {
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
      setMatKhau('');
      setPinMoi('');
      setXacNhan('');
      setLoi(null);
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
    if (!accessToken) return;
    setDangXuLy(true);
    try {
      const ketQua = await xacThucPinService(pin, accessToken);
      soLanSai = 0;
      khoaDen = null;
      await onConfirm(ketQua.pinToken);
      reset();
      onClose();
    } catch (err) {
      soLanSai += 1;
      if (soLanSai >= SO_LAN_SAI_TOI_DA) {
        khoaDen = Date.now() + THOI_GIAN_KHOA_MS;
        soLanSai = 0;
      }
      setLoi(err instanceof Error ? err.message : 'Duyệt thất bại.');
      setPinNhap('');
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

          {buoc === 'dangTai' ? (
            <div className="lts-pin-note">
              <Loader2 size={13} className="um-spin" />
              Đang kiểm tra mã PIN...
            </div>
          ) : buoc === 'dat' ? (
            <>
              <p className="lts-pin-note">
                <ShieldCheck size={13} />
                Bạn chưa đặt mã PIN duyệt. Hãy đặt PIN 6 chữ số trước khi thực hiện duyệt.
              </p>
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
                />
              </label>
              <label className="lts-field">
                <span className="lts-field-label">Nhập lại mã PIN</span>
                <NhapMaPin
                  value={xacNhan}
                  onChange={setXacNhan}
                  disabled={dangXuLy}
                />
              </label>
            </>
          ) : (
            <label className="lts-field">
              <span className="lts-field-label">Nhập mã PIN 6 số</span>
              <NhapMaPin
                value={pin}
                onChange={setPinNhap}
                disabled={dangXuLy}
                autoFocus
              />
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
              disabled={dangXuLy || !/^\d{6}$/.test(pinMoi) || pinMoi !== xacNhan || !matKhau}
            >
              {dangXuLy ? <><Loader2 size={14} className="um-spin" /> Đang lưu...</> : 'Lưu & tiếp tục'}
            </button>
          ) : (
            <button
              type="button"
              className="lts-btn lts-btn--primary"
              onClick={xuLyDuyet}
              disabled={dangXuLy || buoc === 'dangTai' || !/^\d{6}$/.test(pin)}
            >
              {dangXuLy ? <><Loader2 size={14} className="um-spin" /> Đang xử lý...</> : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
