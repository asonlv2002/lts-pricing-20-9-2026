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
} from "../../lib/cpsx-upgrade-thoigian";
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianMayChia,
  CpsxThoiGianMayTui,
  CpsxUpgradeLabor1May,
} from "../../lib/types";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
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
      g.otHours,
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
        g.otHours,
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
        <ThoiGianMayGhep cfg={thoiGian.laminate} />
        <ThoiGianMayChia cfg={thoiGian.slit} />
        <ThoiGianMayTui cfg={thoiGian.bag} />
        <p className="config-note">
          Tham số giống Chi phí sản xuất thường. Cấu hình do quản trị viên cài đặt.
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
  return (
    <DongKetQua
      label="Máy in"
      value={`Lên trục ${cfg.mountMinutesPerColor}'/màu · Duyệt ${cfg.proofMinutes1to7}' (1–7 màu) / ${cfg.proofMinutes8}' (8 màu) · Tốc độ ${dinhDangSo(cfg.avgSpeedMPerMin)} m/phút · Phủ mờ ${cfg.matteExtraMinutes}'`}
    />
  );
}

function ThoiGianMayGhep({ cfg }: { cfg: CpsxThoiGianMayGhep }) {
  return (
    <DongKetQua
      label="Máy ghép"
      value={`Setup ${cfg.setupFirstMinutes}' đầu · ${cfg.setupNextMinutes}' lần tiếp · Tốc độ ${dinhDangSo(cfg.avgSpeedMPerMin)} m/phút`}
    />
  );
}

function ThoiGianMayChia({ cfg }: { cfg: CpsxThoiGianMayChia }) {
  const r = cfg.rules[0];
  return (
    <DongKetQua
      label="Máy chia"
      value={`${cfg.rules.length} loại SP theo bảng${r ? ` · VD ${r.label}: setup ${r.setupMinutes}' · ${dinhDangSo(r.speedMPerMin)} m/phút` : ""}`}
    />
  );
}

function ThoiGianMayTui({ cfg }: { cfg: CpsxThoiGianMayTui }) {
  return (
    <DongKetQua
      label="Máy làm túi"
      value={`${cfg.setupRules.length} loại túi (setup ${Math.min(...cfg.setupRules.map((x) => x.setupMinutes), 9999)}'–${Math.max(...cfg.setupRules.map((x) => x.setupMinutes), 0)}') · ${cfg.speedRules.length} bậc tốc độ bước cắt`}
    />
  );
}
