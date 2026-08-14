"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import {
  chuanHoaCpsxUpgradeInk,
  lapBangGiaInTheoMau,
} from "../../lib/cpsx-upgrade-ink";

function dinhDangVnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}

export default function CpsxNangCapBangGiaIn() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);

  const state = React.useMemo(
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

  const bang = React.useMemo(() => lapBangGiaInTheoMau(state), [state]);

  const [open, setOpen] = React.useState(false);

  return (
    <div className="card config-card config-cpsx-upgrade-card">
      <div className="config-section-title config-cpsx-upgrade__head">
        <span>Bảng giá in theo số màu (VNĐ/m²)</span>
        <span className="config-cpsx-upgrade__head-meta">Tham chiếu</span>
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="cpsx-bang-gia-in-body"
          aria-label={open ? "Thu gọn bảng" : "Mở rộng bảng"}
        >
          {open ? "▾ Thu gọn" : "▸ Mở rộng"}
        </button>
      </div>
      {open && (
        <div
          id="cpsx-bang-gia-in-body"
          className="config-cpsx-upgrade__panel"
        >
          <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
            <table className="config-table config-cpsx-upgrade__table config-cpsx-upgrade__gia-in">
              <thead>
                <tr>
                  <th rowSpan={2}>Số màu</th>
                  <th colSpan={3}>Tỉ lệ phủ 100%</th>
                  <th colSpan={3}>Tỉ lệ phủ 50%</th>
                </tr>
                <tr>
                  <th className="num">OPP</th>
                  <th className="num">PET</th>
                  <th className="num">PE</th>
                  <th className="num">OPP</th>
                  <th className="num">PET</th>
                  <th className="num">PE</th>
                </tr>
              </thead>
              <tbody>
                {bang.map((r) => (
                  <tr key={`gia-in-${r.soMau}`}>
                    <td className="config-cpsx-upgrade__lock">
                      In {r.soMau} màu
                    </td>
                    <td className="num">{dinhDangVnd(r.opp100)}</td>
                    <td className="num">{dinhDangVnd(r.pet100)}</td>
                    <td className="num">{dinhDangVnd(r.pe100)}</td>
                    <td className="num">{dinhDangVnd(r.opp50)}</td>
                    <td className="num">{dinhDangVnd(r.pet50)}</td>
                    <td className="num">{dinhDangVnd(r.pe50)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="config-note">
            Giá in = (ĐM mực × giá mực ₫/kg + ĐM dung môi × giá DM) ÷ 1000 — tự
            tính từ bảng giá mực + bảng dung môi + định mức g/m² phía trên. Cột
            tỉ lệ phủ 50% chỉ giảm 50% phần mực, dung môi giữ nguyên.
          </p>
        </div>
      )}
    </div>
  );
}
