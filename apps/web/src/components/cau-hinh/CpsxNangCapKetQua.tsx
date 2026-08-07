"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import {
  DEFAULT_CPSX_UPGRADE_ELECTRIC,
  DEFAULT_CPSX_UPGRADE_INK,
  DEFAULT_CPSX_UPGRADE_LABOR,
  DEFAULT_CPSX_UPGRADE_THOIGIAN,
} from "../../lib/data";
import {
  chuanHoaCpsxUpgradeElectric,
  tinhDienMoiPhut,
} from "../../lib/cpsx-upgrade-electric";
import {
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  soCongNhanTui,
} from "../../lib/cpsx-upgrade-labor";
import {
  chuanHoaCpsxUpgradeInk,
} from "../../lib/cpsx-upgrade-ink";
import {
  chuanHoaCpsxUpgradeThoiGian,
  tinhThoiGianMayChay,
  tinhThoiGianMayIn,
} from "../../lib/cpsx-upgrade-thoigian";
import type {
  CpsxThoiGianMayChay,
  CpsxThoiGianMayIn,
  CpsxUpgradeLabor1May,
} from "../../lib/types";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function docSoThapPhan(value: string): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const MAY_DIEN_ROWS: { key: "print" | "laminate" | "slit" | "bag"; label: string }[] = [
  { key: "print", label: "Máy in" },
  { key: "laminate", label: "Máy ghép" },
  { key: "slit", label: "Máy chia" },
  { key: "bag", label: "Máy làm túi" },
];

export default function CpsxNangCapKetQua() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);

  const dien = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeElectric(
        hangSo.cpsxUpgradeElectric,
        DEFAULT_CPSX_UPGRADE_ELECTRIC,
      ),
    [hangSo.cpsxUpgradeElectric],
  );

  const luong = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeLabor(
        hangSo.cpsxUpgradeLabor,
        DEFAULT_CPSX_UPGRADE_LABOR,
      ),
    [hangSo.cpsxUpgradeLabor],
  );

  const muc = React.useMemo(
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

  const thoiGian = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeThoiGian(
        hangSo.cpsxUpgradeThoiGian,
        DEFAULT_CPSX_UPGRADE_THOIGIAN,
      ),
    [hangSo.cpsxUpgradeThoiGian],
  );

  const luong1May = (g: CpsxUpgradeLabor1May) =>
    luongMoiPhutTinh(
      g.wages,
      g.hoursPerDay,
      g.mealMorning,
      g.mealEvening,
      g.otFactor,
      undefined,
      g.tyLeTangCa,
    );

  const luongTui = () => {
    const g = luong.bag;
    return luongMoiPhutAp(
      luongMoiPhutTinh(
        g.wages,
        g.hoursPerDay,
        g.mealMorning,
        g.mealEvening,
        g.otFactor,
        soCongNhanTui(g.wages),
        g.tyLeTangCa,
      ),
      g.roundedPerMin,
    );
  };

  return (
    <div className="config-cpsx-upgrade-readonly">
      <div className="config-group-header">1. Điện</div>
      <div className="card config-card config-cpsx-upgrade-readonly__card">
        {MAY_DIEN_ROWS.map(({ key, label }) => {
          const m = dien.machines[key];
          const perMin = tinhDienMoiPhut(
            m.powerKw,
            m.efficiency,
            dien.appliedPricePerKwh,
          );
          return (
            <div key={key} className="config-cpsx-upgrade-readonly__row">
              <span className="config-cpsx-upgrade-readonly__label">
                Điện {label}
              </span>
              <strong className="config-cpsx-upgrade-readonly__value">
                {perMin != null ? `${dinhDangVnd(perMin)} ₫/phút` : "—"}
              </strong>
            </div>
          );
        })}
      </div>

      <div className="config-group-header">2. Tiền lương</div>
      <div className="card config-card config-cpsx-upgrade-readonly__card">
        <DongKetQua label="Lương CN máy in" value={`${dinhDangVnd(luong1May(luong.print))} ₫/phút`} />
        <DongKetQua label="Lương CN máy ghép" value={`${dinhDangVnd(luong1May(luong.laminate))} ₫/phút`} />
        <DongKetQua label="Lương CN máy chia" value={`${dinhDangVnd(luong1May(luong.slit))} ₫/phút`} />
        <DongKetQua label="Lương CN máy làm túi" value={`${dinhDangVnd(luongTui())} ₫/phút`} />
      </div>

      <div className="config-group-header">3. Mực · Dung môi · Keo ghép</div>
      <div className="card config-card config-cpsx-upgrade-readonly__card">
        <DongKetQua
          label="Giá mực OPP"
          value={
            muc.opp.appliedPrice != null
              ? `${dinhDangVnd(muc.opp.appliedPrice)} ₫/kg`
              : "—"
          }
        />
        <DongKetQua
          label="Giá mực PET"
          value={
            muc.pet.appliedPrice != null
              ? `${dinhDangVnd(muc.pet.appliedPrice)} ₫/kg`
              : "—"
          }
        />
        <DongKetQua
          label="Giá mực PE"
          value={
            muc.pe.appliedPrice != null
              ? `${dinhDangVnd(muc.pe.appliedPrice)} ₫/kg`
              : "—"
          }
        />
        <DongKetQua
          label="Giá keo ghép"
          value={
            muc.solventAdhesive.keo.appliedPrice != null
              ? `${dinhDangVnd(muc.solventAdhesive.keo.appliedPrice)} ₫/kg`
              : "—"
          }
        />
      </div>

      <div className="config-group-header">4. Thời gian sản xuất</div>
      <div className="card config-card config-cpsx-upgrade-readonly__card">
        <ThoiGianMayIn cfg={thoiGian.print} />
        <ThoiGianMayChay
          label="Máy ghép"
          donVi="mét"
          cfg={thoiGian.laminate}
        />
        <ThoiGianMayChay label="Máy chia" donVi="mét" cfg={thoiGian.slit} />
        <ThoiGianMayChay
          label="Máy làm túi"
          donVi="chiếc"
          cfg={thoiGian.bag}
        />
        <p className="config-note">
          Nhập số để xem thử thời gian dự kiến. Cấu hình do quản trị viên cài đặt.
        </p>
      </div>
    </div>
  );
}

function DongKetQua({ label, value }: { label: string; value: string }) {
  return (
    <div className="config-cpsx-upgrade-readonly__row">
      <span className="config-cpsx-upgrade-readonly__label">{label}</span>
      <strong className="config-cpsx-upgrade-readonly__value">{value}</strong>
    </div>
  );
}

function ThoiGianMayIn({ cfg }: { cfg: CpsxThoiGianMayIn }) {
  const [met, setMet] = React.useState("");
  const [mau, setMau] = React.useState("");
  const m = docSoThapPhan(met);
  const soMau = Math.floor(docSoThapPhan(mau));
  const kq = m > 0 && soMau > 0 ? tinhThoiGianMayIn(m, soMau, cfg) : null;
  return (
    <div className="config-cpsx-upgrade-readonly__row config-cpsx-upgrade-readonly__row--time">
      <span className="config-cpsx-upgrade-readonly__label">Máy in</span>
      <span className="config-cpsx-upgrade-readonly__input-group">
        <input
          type="text"
          inputMode="numeric"
          className="config-inline-input"
          placeholder="Mét chạy"
          aria-label="Mét chạy máy in"
          value={met}
          onChange={(e) => setMet(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className="config-inline-input"
          placeholder="Số màu"
          aria-label="Số màu"
          value={mau}
          onChange={(e) => setMau(e.target.value)}
        />
      </span>
      <strong className="config-cpsx-upgrade-readonly__value">
        {kq ? `${dinhDangSo(kq.tongPhut)} phút` : "—"}
      </strong>
    </div>
  );
}

function ThoiGianMayChay({
  label,
  donVi,
  cfg,
}: {
  label: string;
  donVi: string;
  cfg: CpsxThoiGianMayChay;
}) {
  const [so, setSo] = React.useState("");
  const n = docSoThapPhan(so);
  const kq = n > 0 ? tinhThoiGianMayChay(n, cfg) : null;
  return (
    <div className="config-cpsx-upgrade-readonly__row config-cpsx-upgrade-readonly__row--time">
      <span className="config-cpsx-upgrade-readonly__label">{label}</span>
      <span className="config-cpsx-upgrade-readonly__input-group">
        <input
          type="text"
          inputMode="numeric"
          className="config-inline-input"
          placeholder={donVi === "chiếc" ? "Số lượng (chiếc)" : `Số ${donVi}`}
          aria-label={`Số ${donVi} ${label}`}
          value={so}
          onChange={(e) => setSo(e.target.value)}
        />
      </span>
      <strong className="config-cpsx-upgrade-readonly__value">
        {kq ? `${dinhDangSo(kq.tongPhut)} phút` : "—"}
      </strong>
    </div>
  );
}
