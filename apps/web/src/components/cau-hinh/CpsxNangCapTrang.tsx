"use client";

import React from "react";
import CpsxNangCapDien from "./CpsxNangCapDien";
import CpsxNangCapLuong from "./CpsxNangCapLuong";
import CpsxNangCapMuc from "./CpsxNangCapMuc";

function TieuDe({ children }: { children: React.ReactNode }) {
  return <div className="config-group-header">{children}</div>;
}

export default function CpsxNangCapTrang() {
  return (
    <div className="config-cpsx-upgrade-shell">
      <TieuDe>1. Điện</TieuDe>
      <CpsxNangCapDien />

      <TieuDe>2. Tiền lương</TieuDe>
      <CpsxNangCapLuong />

      <TieuDe>3. Mực · Dung môi · Keo ghép</TieuDe>
      <CpsxNangCapMuc />
    </div>
  );
}
