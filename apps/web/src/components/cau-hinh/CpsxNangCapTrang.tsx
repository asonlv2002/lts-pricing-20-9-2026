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

export default function CpsxNangCapTrang() {
  const nguoiDungHienTai = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const coQuyenSua = !!nguoiDungHienTai?.policies.includes(
    "PRICE_CONFIG_MANAGER",
  );

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
