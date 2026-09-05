"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import { chuanHoaCpsxUpgradeInk } from "../../lib/cpsx-upgrade-ink";
import { BangGiaInTheoMau, GiaGhepKetQua } from "./CpsxGiaInGhepKetQua";

/** Khối giá công khai trên trang CPSX nâng cao — ai cũng xem được, không cần
 *  quyền CPSX_UPGRADE_*: bảng giá in theo số màu (VNĐ/m²) + giá ghép
 *  (keo + dung môi, VNĐ/m²). Chỉ hiện cho user KHÔNG có quyền nhóm Mực
 *  (ai có quyền nhóm Mực đã thấy 2 bảng này trong mục 3). */
export default function CpsxNangCapGiaCongKhai() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);

  const ink = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeInk(
        hangSo.cpsxUpgradeInk,
        DEFAULT_CPSX_UPGRADE_INK.opp,
        DEFAULT_CPSX_UPGRADE_INK.pet,
        DEFAULT_CPSX_UPGRADE_INK.pe,
        DEFAULT_CPSX_UPGRADE_INK.solventAdhesive,
        DEFAULT_CPSX_UPGRADE_INK.dinhMucIn,
        DEFAULT_CPSX_UPGRADE_INK.dinhMucGhep,
      ),
    [hangSo.cpsxUpgradeInk],
  );

  return (
    <div className="config-cpsx-upgrade-gia-cong-khai">
      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Giá in theo số màu</span>
          <span className="config-cpsx-upgrade__head-meta">VNĐ/m²</span>
        </div>
        <BangGiaInTheoMau ink={ink} />
      </div>

      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Giá ghép (keo + dung môi)</span>
          <span className="config-cpsx-upgrade__head-meta">VNĐ/m²</span>
        </div>
        <GiaGhepKetQua ink={ink} />
      </div>
    </div>
  );
}
