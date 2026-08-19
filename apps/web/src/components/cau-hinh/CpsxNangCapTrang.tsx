"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import CpsxNangCapDien from "./CpsxNangCapDien";
import CpsxNangCapKetQua from "./CpsxNangCapKetQua";
import CpsxNangCapLuong from "./CpsxNangCapLuong";
import CpsxNangCapMuc from "./CpsxNangCapMuc";
import CpsxNangCapThoiGian from "./CpsxNangCapThoiGian";

function TieuDe({ children }: { children: React.ReactNode }) {
  return <div className="config-group-header">{children}</div>;
}

function DangTaiCpsxNangCao() {
  return (
    <div
      className="config-cpsx-upgrade-shell config-cpsx-upgrade-shell--loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--dim)",
      }}
    >
      <p style={{ margin: 0 }}>Đang tải cấu hình CPSX nâng cao từ server...</p>
    </div>
  );
}

export default function CpsxNangCapTrang() {
  const nguoiDungHienTai = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const daDangNhap = dungCuaHangTinhGia((s) => s.isAuthenticated);
  const dangTai = dungCuaHangTinhGia((s) => s.dangTaiCauHinhMoiNhat);
  const coQuyenSua = !!nguoiDungHienTai?.policies.includes(
    "PRICE_CONFIG_MANAGER",
  );

  if (daDangNhap && dangTai) {
    return <DangTaiCpsxNangCao />;
  }

  if (!coQuyenSua) {
    return (
      <div className="config-cpsx-upgrade-shell">
        <CpsxNangCapKetQua />
      </div>
    );
  }

  return (
    <div className="config-cpsx-upgrade-shell">
      <TieuDe>1. Điện</TieuDe>
      <CpsxNangCapDien />

      <TieuDe>2. Tiền lương</TieuDe>
      <CpsxNangCapLuong />

      <TieuDe>3. Mực · Dung môi · Keo ghép</TieuDe>
      <CpsxNangCapMuc />

      <TieuDe>4. Thời gian sản xuất</TieuDe>
      <CpsxNangCapThoiGian />
    </div>
  );
}
