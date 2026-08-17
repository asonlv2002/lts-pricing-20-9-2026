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
  luongMoiPhutTuiAp,
  soCongNhanTui,
} from "../../lib/cpsx-upgrade-labor";
import {
  chuanHoaCpsxUpgradeInk,
  lapBangGiaInTheoMau,
} from "../../lib/cpsx-upgrade-ink";
import {
  chuanHoaCpsxUpgradeThoiGian,
  laSetupBienCoSize,
} from "../../lib/cpsx-upgrade-thoigian";
import { tinhCpKeoDungMoiGhep } from "../../lib/dac-ta-nang-cao";
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

function dinhDangSo(n: number, decimals = 2) {
  return n.toLocaleString("vi-VN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
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

  const bangGiaIn = React.useMemo(() => lapBangGiaInTheoMau(muc), [muc]);
  const giaGhep = React.useMemo(() => tinhCpKeoDungMoiGhep(muc), [muc]);

  const luong1May = (g: CpsxUpgradeLabor1May) =>
    luongMoiPhutAp(
      luongMoiPhutTinh(
        g.wages,
        g.hoursPerDay,
        g.mealMorning,
        g.mealEvening,
        g.otFactor,
        undefined,
        g.tyLeTangCa,
        g.otHours,
      ),
      g.roundedPerMin,
    );

  const luongTui = () => {
    const g = luong.bag;
    return luongMoiPhutTuiAp(
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
      g.machinesPerDay,
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
        <div className="config-cpsx-upgrade__col-title" style={{ marginTop: 0 }}>
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
                <tr key={`ro-gia-in-${r.soMau}`}>
                  <td className="config-cpsx-upgrade__lock">In {r.soMau} màu</td>
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
          Giá in = (ĐM mực × giá mực ₫/kg + ĐM dung môi × giá DM) ÷ 1000. Cột phủ
          50% chỉ giảm 50% phần mực; dung môi giữ nguyên.
        </p>
        <DongKetQua
          label="Giá ghép (keo + DM)"
          value={`${dinhDangVnd(giaGhep.donGia)} ₫/m² / lần ghép`}
        />
        <p className="config-note" style={{ marginBottom: 0 }}>
          Mỗi lớp ghép áp 1 lần đơn giá này. Công thức: ({dinhDangSo(giaGhep.keoKhoG, 1)}g keo
          × {dinhDangVnd(giaGhep.giaKeo)} + {dinhDangSo(giaGhep.dungMoiPhaKeoG, 1)}g DM
          × {dinhDangVnd(giaGhep.giaDungMoi)}) ÷ 1000.
        </p>
      </div>

      <div className="config-group-header">4. Thời gian sản xuất</div>
      <div className="card config-card config-cpsx-upgrade-readonly__card">
        <ThoiGianMayInDayDu cfg={thoiGian.print} />
        <ThoiGianMayGhepDayDu cfg={thoiGian.laminate} />
        <ThoiGianMayChiaDayDu cfg={thoiGian.slit} />
        <ThoiGianMayTuiDayDu cfg={thoiGian.bag} />
        <p className="config-note" style={{ marginBottom: 0 }}>
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

function TieuDeKhoi({ children }: { children: React.ReactNode }) {
  return (
    <div className="config-cpsx-upgrade__col-title" style={{ marginTop: 12 }}>
      {children}
    </div>
  );
}

function ThoiGianMayInDayDu({ cfg }: { cfg: CpsxThoiGianMayIn }) {
  return (
    <div>
      <TieuDeKhoi>Máy in</TieuDeKhoi>
      <DongKetQua label="Lên trục" value={`${dinhDangSo(cfg.mountMinutesPerColor, 0)} phút/màu`} />
      <DongKetQua
        label="Duyệt mẫu"
        value={`1–7 màu: ${dinhDangSo(cfg.proofMinutes1to7, 0)} phút · 8 màu: ${dinhDangSo(cfg.proofMinutes8, 0)} phút`}
      />
      <DongKetQua label="Tốc độ trung bình" value={`${dinhDangSo(cfg.avgSpeedMPerMin, 0)} m/phút`} />
      <DongKetQua label="In phủ mờ thêm" value={`${dinhDangSo(cfg.matteExtraMinutes, 0)} phút`} />
    </div>
  );
}

function ThoiGianMayGhepDayDu({ cfg }: { cfg: CpsxThoiGianMayGhep }) {
  return (
    <div>
      <TieuDeKhoi>Máy ghép</TieuDeKhoi>
      <DongKetQua label="Setup lần 1" value={`${dinhDangSo(cfg.setupFirstMinutes, 0)} phút`} />
      <DongKetQua label="Setup lần tiếp" value={`${dinhDangSo(cfg.setupNextMinutes, 0)} phút`} />
      <DongKetQua label="Tốc độ trung bình" value={`${dinhDangSo(cfg.avgSpeedMPerMin, 0)} m/phút`} />
    </div>
  );
}

function ThoiGianMayChiaDayDu({ cfg }: { cfg: CpsxThoiGianMayChia }) {
  return (
    <div>
      <TieuDeKhoi>Máy chia — theo loại sản phẩm</TieuDeKhoi>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại sản phẩm</th>
              <th className="num">Setup (phút)</th>
              <th className="num">Tốc độ (m/phút)</th>
            </tr>
          </thead>
          <tbody>
            {cfg.rules.map((rule, idx) => (
              <tr key={rule.key || `chia-${idx}`}>
                <td>{rule.label || "—"}</td>
                <td className="num">{dinhDangSo(rule.setupMinutes, 0)}</td>
                <td className="num">{dinhDangSo(rule.speedMPerMin, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function nhanBuocCatSetup(rule: {
  key?: string;
  stepOp?: string | null;
  maxStepMm?: number | null;
}): string {
  if (!laSetupBienCoSize(rule as never)) return "—";
  const cm = (rule.maxStepMm ?? 300) / 10;
  if (rule.stepOp === "gt") return `> ${cm} cm`;
  return `≤ ${cm} cm`;
}

function nhanBuocCatTocDo(rule: { label?: string; maxStepMm?: number | null }): string {
  if (rule.label?.trim()) return rule.label.trim();
  if (rule.maxStepMm != null && rule.maxStepMm > 0) {
    return `≤ ${rule.maxStepMm / 10} cm`;
  }
  return "Không trần";
}

function ThoiGianMayTuiDayDu({ cfg }: { cfg: CpsxThoiGianMayTui }) {
  const dsBien = cfg.setupRules.filter((r) => laSetupBienCoSize(r));
  const dsKhac = cfg.setupRules.filter((r) => !laSetupBienCoSize(r));

  return (
    <div>
      <TieuDeKhoi>Máy làm túi — setup 3/4 biên (theo bước cắt)</TieuDeKhoi>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại túi</th>
              <th>Bước cắt</th>
              <th className="num">Setup (phút)</th>
            </tr>
          </thead>
          <tbody>
            {dsBien.length === 0 ? (
              <tr><td colSpan={3}>—</td></tr>
            ) : (
              dsBien.map((rule, idx) => (
                <tr key={rule.key || `setup-bien-${idx}`}>
                  <td>{rule.label || "—"}</td>
                  <td>{nhanBuocCatSetup(rule)}</td>
                  <td className="num">{dinhDangSo(rule.setupMinutes, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TieuDeKhoi>Máy làm túi — setup loại khác</TieuDeKhoi>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại túi</th>
              <th className="num">Setup (phút)</th>
            </tr>
          </thead>
          <tbody>
            {dsKhac.length === 0 ? (
              <tr><td colSpan={2}>—</td></tr>
            ) : (
              dsKhac.map((rule, idx) => (
                <tr key={rule.key || `setup-khac-${idx}`}>
                  <td>{rule.label || "—"}</td>
                  <td className="num">{dinhDangSo(rule.setupMinutes, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TieuDeKhoi>Máy làm túi — tốc độ theo bước cắt</TieuDeKhoi>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Bậc bước cắt</th>
              <th className="num">Tốc độ (m/phút)</th>
            </tr>
          </thead>
          <tbody>
            {(cfg.speedRules ?? []).length === 0 ? (
              <tr><td colSpan={2}>—</td></tr>
            ) : (
              cfg.speedRules.map((rule, idx) => (
                <tr key={rule.key || `speed-${idx}`}>
                  <td>{nhanBuocCatTocDo(rule)}</td>
                  <td className="num">{dinhDangSo(rule.speedMPerMin, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
