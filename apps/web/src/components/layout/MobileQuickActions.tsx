"use client";

// apps/web/src/components/layout/MobileQuickActions.tsx
import {
  Bell,
  CheckCheck,
  ImagePlus,
  KeyRound,
  LogOut,
  PenLine,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { normalizeDisplayText } from "../../lib/text-codec";
import { useDanhSachThongBao } from "../../lib/thong-bao-mau";
import SheetBottom from "./SheetBottom";

interface MobileQuickActionsProps {
  /** Hiện nút "+ Mới" (chỉ màn tính giá). */
  coNutTaoMoi: boolean;
  /** Chỉ được gọi khi form không dirty — phần xác nhận do component lo. */
  onTaoMoi: () => void;
  onDoiMatKhau: () => void;
  onDoiAnhDaiDien: () => void;
  onDoiPin: () => void;
  onDoiChuKy: () => void;
  onDangXuat: () => void;
}

export default function MobileQuickActions({
  coNutTaoMoi,
  onTaoMoi,
  onDoiMatKhau,
  onDoiAnhDaiDien,
  onDoiPin,
  onDoiChuKy,
  onDangXuat,
}: MobileQuickActionsProps) {
  const [moThongBao, datMoThongBao] = useState(false);
  const [moTaiKhoan, datMoTaiKhoan] = useState(false);
  const [xacNhanMoi, datXacNhanMoi] = useState(false);
  const { danhSach, soChuaDoc, danhDauDaDoc, danhDauTatCaDaDoc } =
    useDanhSachThongBao();
  const dirty = dungCuaHangTinhGia((s) => s.isDirty);
  const nguoiDung = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const tenHienThi = normalizeDisplayText(
    nguoiDung?.fullName || "Unknown",
  );
  const avatarChu = tenHienThi.slice(0, 2).toUpperCase();

  const xuLyTaoMoi = () => {
    if (dirty) datXacNhanMoi(true);
    else onTaoMoi();
  };

  const dongMoiSheet = () => {
    datMoThongBao(false);
    datMoTaiKhoan(false);
  };

  return (
    <>
      {coNutTaoMoi && (
        <button
          type="button"
          className="lts-mobile-icon-btn"
          aria-label="Tạo bảng tính giá mới"
          onClick={xuLyTaoMoi}
        >
          <Plus size={20} />
          {dirty && <span className="lts-dirty-dot" />}
        </button>
      )}
      <button
        type="button"
        className="lts-mobile-icon-btn"
        aria-label="Thông báo"
        aria-expanded={moThongBao}
        onClick={() => {
          datMoTaiKhoan(false);
          datMoThongBao((v) => !v);
        }}
      >
        <Bell size={20} />
        {soChuaDoc > 0 && (
          <span className="lts-mobile-icon-badge">
            {soChuaDoc > 9 ? "9+" : soChuaDoc}
          </span>
        )}
      </button>
      <button
        type="button"
        className="lts-mobile-avatar-btn"
        aria-label="Tài khoản"
        aria-expanded={moTaiKhoan}
        onClick={() => {
          datMoThongBao(false);
          datMoTaiKhoan((v) => !v);
        }}
      >
        {nguoiDung?.avatarBlobUrl ? (
          <img src={nguoiDung.avatarBlobUrl} alt="Ảnh đại diện" />
        ) : (
          avatarChu
        )}
      </button>

      <SheetBottom
        open={moThongBao}
        dong={() => datMoThongBao(false)}
        tieuDe="Thông báo"
        nutDauTieuDe={
          <button
            type="button"
            className="lts-sheet-link-btn"
            onClick={danhDauTatCaDaDoc}
            disabled={soChuaDoc === 0}
          >
            <CheckCheck size={14} /> Đánh dấu tất cả đã đọc
          </button>
        }
      >
        <div className="lts-sheet-notice-list">
          {danhSach.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`lts-sheet-notice ${n.daDoc ? "is-read" : "is-unread"}`}
              onClick={() => danhDauDaDoc(n.id)}
            >
              <span className="lts-notice-dot" aria-hidden />
              <span className="lts-sheet-notice-body">
                <span className="lts-sheet-notice-title">{n.tieuDe}</span>
                <span className="lts-sheet-notice-meta">
                  {n.thoiGian} · {n.loai}
                </span>
              </span>
            </button>
          ))}
        </div>
      </SheetBottom>

      <SheetBottom
        open={moTaiKhoan}
        dong={() => datMoTaiKhoan(false)}
        tieuDe="Tài khoản"
      >
        <div className="lts-sheet-account-user">
          <span className="lts-mobile-avatar-btn is-static">
            {nguoiDung?.avatarBlobUrl ? (
              <img src={nguoiDung.avatarBlobUrl} alt="Ảnh đại diện" />
            ) : (
              avatarChu
            )}
          </span>
          <span>
            <strong>{tenHienThi}</strong>
            <small>@{nguoiDung?.account || "—"}</small>
          </span>
        </div>
        <div className="lts-sheet-account-actions">
          <button
            type="button"
            onClick={() => {
              dongMoiSheet();
              onDoiMatKhau();
            }}
          >
            <KeyRound size={16} /> Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={() => {
              dongMoiSheet();
              onDoiAnhDaiDien();
            }}
          >
            <ImagePlus size={16} /> Đổi ảnh đại diện
          </button>
          <button
            type="button"
            onClick={() => {
              dongMoiSheet();
              onDoiPin();
            }}
          >
            <KeyRound size={16} /> Đổi mã Pin
          </button>
          <button
            type="button"
            onClick={() => {
              dongMoiSheet();
              onDoiChuKy();
            }}
          >
            <PenLine size={16} /> Đổi chữ ký
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              dongMoiSheet();
              onDangXuat();
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </SheetBottom>

      {xacNhanMoi &&
        createPortal(
          <div
            className="lts-confirm-backdrop"
            onClick={() => datXacNhanMoi(false)}
          >
            <div
              className="lts-confirm-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lts-confirm-icon">!</div>
              <h3 className="lts-confirm-title">Chưa lưu báo giá</h3>
              <p className="lts-confirm-desc">
                Bảng tính hiện tại có thay đổi chưa được lưu vào lịch sử.
                <br />
                Tạo mới sẽ xóa toàn bộ dữ liệu đang nhập.
              </p>
              <div className="lts-confirm-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => datXacNhanMoi(false)}
                >
                  Quay lại
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    datXacNhanMoi(false);
                    onTaoMoi();
                  }}
                >
                  Tạo mới (không lưu)
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
