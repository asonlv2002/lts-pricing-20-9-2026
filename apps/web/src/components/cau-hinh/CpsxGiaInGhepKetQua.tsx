"use client";

import React from "react";
import type { CpsxUpgradeInk } from "../../lib/types";
import { lapBangGiaInTheoMau } from "../../lib/cpsx-upgrade-ink";
import { tinhCpKeoDungMoiGhep } from "../../lib/dac-ta-nang-cao";

function dinhDangVnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** Bảng giá in theo số màu (VNĐ/m²) — tự tính từ cấu hình mực + dung môi + định mức.
 *  Dùng chung: CpsxNangCapDinhMuc (mục 3) + CpsxNangCapGiaCongKhai (khối công khai). */
export function BangGiaInTheoMau({ ink }: { ink: CpsxUpgradeInk }) {
  const bangGiaIn = React.useMemo(() => lapBangGiaInTheoMau(ink), [ink]);
  return (
    <>
      <div className="config-cpsx-upgrade__col-title">
        Bảng giá in theo số màu (VNĐ/m²)
      </div>
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
            {bangGiaIn.map((r) => (
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
        Giá in = (ĐM mực × giá mực ₫/kg + ĐM dung môi × giá DM) ÷ 1000 —
        tự tính từ bảng giá mực + bảng dung môi + định mức g/m². Tỉ lệ
        phủ 50% = nửa giá phủ 100% (nhân cả mực + dung môi).
      </p>
    </>
  );
}

/** Công thức giá ghép keo + dung môi → ₫/m² — dùng chung DinhMuc + khối công khai. */
export function GiaGhepKetQua({ ink }: { ink: CpsxUpgradeInk }) {
  const chiTietKeo = tinhCpKeoDungMoiGhep(ink);
  return (
    <div className="config-cpsx-upgrade__formulas">
      <div className="config-cpsx-upgrade__formula-head">
        Công thức áp dụng: CP dung môi + keo ghép = (ĐM KEO × Giá KEO +
        ĐM DM ghép × Giá DM ghép) ÷ 1000 → ₫/m²
      </div>

      <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
        <span className="config-cpsx-upgrade__formula-label">
          KEO  ·  Giá KEO{" "}
          <strong className="config-cpsx-upgrade__highlight">
            {dinhDangVnd(chiTietKeo.giaKeo)} ₫/kg
          </strong>{" "}
          (TB 319+766)  ·  Giá DM ghép{" "}
          <strong className="config-cpsx-upgrade__highlight">
            {dinhDangVnd(chiTietKeo.giaDungMoi)} ₫/kg
          </strong>{" "}
          (DUNG MÔI EA)
        </span>
      </div>
      <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
        <strong className="config-cpsx-upgrade__formula-result">
          → ({dinhDangSo(chiTietKeo.keoKhoG)}g ×{" "}
          <span className="config-cpsx-upgrade__highlight">
            {dinhDangVnd(chiTietKeo.giaKeo)}
          </span>{" "}
          ₫/kg + {dinhDangSo(chiTietKeo.dungMoiPhaKeoG)}g ×{" "}
          <span className="config-cpsx-upgrade__highlight">
            {dinhDangVnd(chiTietKeo.giaDungMoi)}
          </span>{" "}
          ₫/kg) ÷ 1000 = {dinhDangVnd(chiTietKeo.donGia)} ₫/m²
        </strong>
      </div>
    </div>
  );
}
