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
  kyHieuStepOp,
  laStepOpHopLe,
  nhanBuocCatSetupRule,
  nhanKhoangTocDoBuocCat,
  tinhThoiGianMayIn,
  tinhThoiGianMayGhep,
  tinhThoiGianMayChia,
  tinhThoiGianMayTui,
} from "../../lib/cpsx-upgrade-thoigian";
import { tinhCpKeoDungMoiGhep } from "../../lib/dac-ta-nang-cao";
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianMayChia,
  CpsxThoiGianMayTui,
  CpsxThoiGianRule,
  CpsxTuiSetupRule,
  CpsxTuiSpeedRule,
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

function docSoThapPhan(value: string): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampSoMau(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(8, Math.floor(n)));
}

function clampSoLanGhep(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.floor(n)));
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
          Giá in = (ĐM mực × giá mực ₫/kg + ĐM dung môi × giá DM) ÷ 1000. Tỉ lệ
          phủ 50% = nửa giá phủ 100% (nhân cả mực + dung môi).
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

      <CardThoiGianMayIn cfg={thoiGian.print} />
      <CardThoiGianMayGhep cfg={thoiGian.laminate} />
      <CardThoiGianMayChia cfg={thoiGian.slit} />
      <CardThoiGianMayTui cfg={thoiGian.bag} />
      <p className="config-note" style={{ marginBottom: 0 }}>
        Tham số setup/tốc độ do quản trị viên cài. Ô nhập trên chỉ để thử tính tại
        chỗ — không lưu cấu hình.
      </p>
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

function TieuDeCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="config-cpsx-upgrade__col-title" style={{ marginTop: 0 }}>
      {children}
    </div>
  );
}

function nhanSetupTui(rule: CpsxTuiSetupRule): string {
  if (laStepOpHopLe(rule.stepOp)) {
    const cm = (rule.maxStepMm ?? 0) / 10;
    return `${rule.label || "—"} (${kyHieuStepOp(rule.stepOp)}${cm}cm)`;
  }
  return rule.label || "—";
}

function CardThoiGianMayIn({ cfg }: { cfg: CpsxThoiGianMayIn }) {
  const [soMau, setSoMau] = React.useState(1);
  const [metIn, setMetIn] = React.useState(0);
  const [phuMo, setPhuMo] = React.useState(false);

  const kq = React.useMemo(
    () => tinhThoiGianMayIn(metIn, soMau, cfg, phuMo),
    [metIn, soMau, cfg, phuMo],
  );
  const proof =
    soMau >= 8 ? cfg.proofMinutes8 : cfg.proofMinutes1to7;
  const setupPhut = soMau > 0 ? soMau * cfg.mountMinutesPerColor + proof : 0;
  const matte = phuMo ? cfg.matteExtraMinutes : 0;

  return (
    <div className="card config-card config-cpsx-upgrade-readonly__card config-cpsx-upgrade-readonly__card--tg">
      <TieuDeCard>Máy in</TieuDeCard>
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức áp dụng: TG = số màu × lên trục + duyệt mẫu + mét ÷ tốc độ
          [+ phủ mờ nếu có] → phút
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Lên trục{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.mountMinutesPerColor, 0)} phút/màu
            </strong>
            {" · "}Duyệt 1–7:{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.proofMinutes1to7, 0)}p
            </strong>
            {" · "}8 màu:{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.proofMinutes8, 0)}p
            </strong>
            {" · "}Tốc độ{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.avgSpeedMPerMin, 0)} m/phút
            </strong>
            {" · "}Phủ mờ +
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.matteExtraMinutes, 0)}p
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Số màu in</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={1}
            max={8}
            step={1}
            aria-label="Số màu in preview"
            value={soMau}
            onChange={(e) =>
              setSoMau(clampSoMau(docSoThapPhan(e.target.value)))
            }
          />
          <span className="config-cpsx-upgrade__formula-label">Mét in</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Mét in preview"
            value={metIn}
            onChange={(e) => setMetIn(docSoThapPhan(e.target.value))}
          />
          <span className="config-cpsx-upgrade__formula-label">m</span>
          <span className="config-cpsx-upgrade__formula-label">Phủ mờ</span>
          <select
            className="config-inline-input config-cpsx-upgrade__formula-input"
            aria-label="Có phủ mờ"
            value={phuMo ? "1" : "0"}
            onChange={(e) => setPhuMo(e.target.value === "1")}
          >
            <option value="0">Không</option>
            <option value="1">Có</option>
          </select>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangSo(soMau, 0)} × {dinhDangSo(cfg.mountMinutesPerColor, 0)}{" "}
            + {dinhDangSo(proof, 0)}) + ({dinhDangSo(metIn, 0)} ÷{" "}
            {dinhDangSo(cfg.avgSpeedMPerMin, 0)})
            {matte > 0 ? ` + ${dinhDangSo(matte, 0)}` : ""} ={" "}
            <span className="config-cpsx-upgrade__highlight">
              {dinhDangSo(kq.tongPhut, 0)} phút
            </span>
            <span className="config-cpsx-upgrade__formula-note">
              {" "}
              (setup {dinhDangSo(setupPhut, 0)}p · chạy{" "}
              {dinhDangSo(kq.chiTiet.chayPhut, 1)}p)
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
}

function CardThoiGianMayGhep({ cfg }: { cfg: CpsxThoiGianMayGhep }) {
  const [soLan, setSoLan] = React.useState(1);
  const [metGhep, setMetGhep] = React.useState(0);

  const kq = React.useMemo(
    () => tinhThoiGianMayGhep(metGhep, soLan, cfg),
    [metGhep, soLan, cfg],
  );

  return (
    <div className="card config-card config-cpsx-upgrade-readonly__card config-cpsx-upgrade-readonly__card--tg">
      <TieuDeCard>Máy ghép</TieuDeCard>
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức áp dụng: TG = setup lần 1 + (n − 1) × setup lần tiếp + mét ÷
          tốc độ → phút
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Setup lần 1{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.setupFirstMinutes, 0)} phút
            </strong>
            {" · "}lần tiếp{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.setupNextMinutes, 0)} phút
            </strong>
            {" · "}Tốc độ{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(cfg.avgSpeedMPerMin, 0)} m/phút
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Số lần ghép</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={1}
            max={10}
            step={1}
            aria-label="Số lần ghép preview"
            value={soLan}
            onChange={(e) =>
              setSoLan(clampSoLanGhep(docSoThapPhan(e.target.value)))
            }
          />
          <span className="config-cpsx-upgrade__formula-label">Mét ghép</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Mét ghép preview"
            value={metGhep}
            onChange={(e) => setMetGhep(docSoThapPhan(e.target.value))}
          />
          <span className="config-cpsx-upgrade__formula-label">m</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangSo(cfg.setupFirstMinutes, 0)} + ({dinhDangSo(soLan, 0)} −
            1) × {dinhDangSo(cfg.setupNextMinutes, 0)} + (
            {dinhDangSo(metGhep, 0)} ÷ {dinhDangSo(cfg.avgSpeedMPerMin, 0)}) ={" "}
            <span className="config-cpsx-upgrade__highlight">
              {dinhDangSo(kq.tongPhut, 0)} phút
            </span>
            <span className="config-cpsx-upgrade__formula-note">
              {" "}
              (setup {dinhDangSo(kq.chiTiet.setupPhut, 0)}p · chạy{" "}
              {dinhDangSo(kq.chiTiet.chayPhut, 1)}p)
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
}

function CardThoiGianMayChia({ cfg }: { cfg: CpsxThoiGianMayChia }) {
  const rules = cfg.rules ?? [];
  const [ruleKey, setRuleKey] = React.useState(() => rules[0]?.key ?? "");
  const [metChia, setMetChia] = React.useState(0);

  React.useEffect(() => {
    if (!rules.some((r) => r.key === ruleKey) && rules[0]) {
      setRuleKey(rules[0].key);
    }
  }, [rules, ruleKey]);

  const rule: CpsxThoiGianRule =
    rules.find((r) => r.key === ruleKey) ??
    rules[0] ?? {
      key: "",
      label: "—",
      setupMinutes: 0,
      speedMPerMin: 1,
    };

  const kq = React.useMemo(
    () => tinhThoiGianMayChia(metChia, rule),
    [metChia, rule],
  );

  return (
    <div className="card config-card config-cpsx-upgrade-readonly__card config-cpsx-upgrade-readonly__card--tg">
      <TieuDeCard>Máy chia</TieuDeCard>
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức áp dụng: TG = setup(loại SP) + mét ÷ tốc độ(loại SP) → phút
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Loại SP</span>
          <label className="config-cpsx-upgrade__select">
            <select
              value={rule.key}
              onChange={(e) => setRuleKey(e.target.value)}
              aria-label="Loại sản phẩm máy chia"
            >
              {rules.length === 0 ? (
                <option value="">—</option>
              ) : (
                rules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label || r.key} ({dinhDangSo(r.setupMinutes, 0)}p ·{" "}
                    {dinhDangSo(r.speedMPerMin, 0)} m/phút)
                  </option>
                ))
              )}
            </select>
          </label>
          <span className="config-cpsx-upgrade__formula-label">Mét chia</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Mét chia preview"
            value={metChia}
            onChange={(e) => setMetChia(docSoThapPhan(e.target.value))}
          />
          <span className="config-cpsx-upgrade__formula-label">m</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            setup {dinhDangSo(rule.setupMinutes, 0)}p + (
            {dinhDangSo(metChia, 0)} ÷ {dinhDangSo(rule.speedMPerMin, 0)}) ={" "}
            <span className="config-cpsx-upgrade__highlight">
              {dinhDangSo(kq.tongPhut, 0)} phút
            </span>
            <span className="config-cpsx-upgrade__formula-note">
              {" "}
              (setup {dinhDangSo(kq.chiTiet.setupPhut, 0)}p · chạy{" "}
              {dinhDangSo(kq.chiTiet.chayPhut, 1)}p)
            </span>
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__col-title">Bảng rule (chỉ xem)</div>
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
            {rules.length === 0 ? (
              <tr>
                <td colSpan={3}>—</td>
              </tr>
            ) : (
              rules.map((r, idx) => (
                <tr key={r.key || `chia-${idx}`}>
                  <td>{r.label || "—"}</td>
                  <td className="num">{dinhDangSo(r.setupMinutes, 0)}</td>
                  <td className="num">{dinhDangSo(r.speedMPerMin, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardThoiGianMayTui({ cfg }: { cfg: CpsxThoiGianMayTui }) {
  const setupRules = cfg.setupRules ?? [];
  const speedRules = cfg.speedRules ?? [];
  const [setupKey, setSetupKey] = React.useState(
    () => setupRules[0]?.key ?? "",
  );
  const [tocDoKey, setTocDoKey] = React.useState(
    () => speedRules[0]?.key ?? "",
  );
  const [metChay, setMetChay] = React.useState(0);

  React.useEffect(() => {
    if (!setupRules.some((r) => r.key === setupKey) && setupRules[0]) {
      setSetupKey(setupRules[0].key);
    }
  }, [setupRules, setupKey]);

  React.useEffect(() => {
    if (!speedRules.some((r) => r.key === tocDoKey) && speedRules[0]) {
      setTocDoKey(speedRules[0].key);
    }
  }, [speedRules, tocDoKey]);

  const setupChon: CpsxTuiSetupRule =
    setupRules.find((r) => r.key === setupKey) ??
    setupRules[0] ?? {
      key: "",
      label: "—",
      setupMinutes: 0,
      maxStepMm: null,
      stepOp: null,
    };
  const tocDoChon: CpsxTuiSpeedRule =
    speedRules.find((r) => r.key === tocDoKey) ??
    speedRules[0] ?? {
      key: "",
      label: "—",
      minStepMm: 0,
      maxStepMm: 9_999_999,
      speedMPerMin: 50,
    };

  const kq = React.useMemo(
    () => tinhThoiGianMayTui(metChay, setupChon, tocDoChon),
    [metChay, setupChon, tocDoChon],
  );

  return (
    <div className="card config-card config-cpsx-upgrade-readonly__card config-cpsx-upgrade-readonly__card--tg">
      <TieuDeCard>Máy làm túi</TieuDeCard>
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức áp dụng: TG = setup(loại túi) + mét ÷ tốc độ(bậc) → phút
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Mét chạy</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Mét chạy máy túi preview"
            value={metChay}
            onChange={(e) => setMetChay(docSoThapPhan(e.target.value))}
          />
          <span className="config-cpsx-upgrade__formula-label">m</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Loại túi · Setup{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(setupChon.setupMinutes, 0)} phút
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <label className="config-cpsx-upgrade__select">
            <select
              value={setupChon.key}
              onChange={(e) => setSetupKey(e.target.value)}
              aria-label="Chọn loại túi preview"
            >
              {setupRules.length === 0 ? (
                <option value="">—</option>
              ) : (
                setupRules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {nhanSetupTui(r)}
                  </option>
                ))
              )}
            </select>
          </label>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            Setup = {dinhDangSo(setupChon.setupMinutes, 0)} phút
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Bậc bước cắt ·{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {dinhDangSo(tocDoChon.speedMPerMin, 0)} m/phút
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <label className="config-cpsx-upgrade__select">
            <select
              value={tocDoChon.key}
              onChange={(e) => setTocDoKey(e.target.value)}
              aria-label="Chọn bậc bước cắt preview"
            >
              {speedRules.length === 0 ? (
                <option value="">—</option>
              ) : (
                speedRules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {nhanKhoangTocDoBuocCat(r)} ({dinhDangSo(r.speedMPerMin, 0)}{" "}
                    m/phút)
                  </option>
                ))
              )}
            </select>
          </label>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangSo(metChay, 0)} m ÷{" "}
            {dinhDangSo(tocDoChon.speedMPerMin, 0)}) ={" "}
            {dinhDangSo(kq.chiTiet.chayPhut, 1)} phút
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Tổng</span>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            <span className="config-cpsx-upgrade__highlight">
              {dinhDangSo(kq.tongPhut, 0)} phút
            </span>
            <span className="config-cpsx-upgrade__formula-note">
              {" "}
              (setup {dinhDangSo(kq.chiTiet.setupPhut, 0)}p · chạy{" "}
              {dinhDangSo(kq.chiTiet.chayPhut, 1)}p)
            </span>
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__col-title">
        Setup theo bước cắt — chỉ xem
      </div>
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
            {setupRules.length === 0 ? (
              <tr>
                <td colSpan={3}>—</td>
              </tr>
            ) : (
              setupRules.map((rule, idx) => (
                <tr key={rule.key || `setup-${idx}`}>
                  <td>{rule.label || "—"}</td>
                  <td>{nhanBuocCatSetupRule(rule)}</td>
                  <td className="num">{dinhDangSo(rule.setupMinutes, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="config-cpsx-upgrade__col-title">
        Tốc độ theo bước cắt — chỉ xem
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Bước cắt (mm)</th>
              <th className="num">Tốc độ (m/phút)</th>
            </tr>
          </thead>
          <tbody>
            {speedRules.length === 0 ? (
              <tr>
                <td colSpan={2}>—</td>
              </tr>
            ) : (
              speedRules.map((rule, idx) => (
                <tr key={`${rule.key || "speed"}-${idx}`}>
                  <td>{nhanKhoangTocDoBuocCat(rule)}</td>
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
