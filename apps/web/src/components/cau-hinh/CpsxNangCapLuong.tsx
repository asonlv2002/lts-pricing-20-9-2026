"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Eye, Trash2 } from "lucide-react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_LABOR } from "../../lib/data";
import type {
  CpsxMayTinhApSource,
  CpsxMayTinhCongThucItem,
  CpsxMayTinhWorkspace,
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
} from "../../lib/types";
import {
  boDau,
  capNhatDonViSo,
  chenDonVi,
  chuanHoaCpsxUpgradeLabor,
  chuanHoaMayTinh,
  donViChuoi,
  donViSo,
  donViSoHang,
  gopSoHang,
  hangSoTuDonVi,
  hopLeTenCongThuc,
  hopLeTenThamSo,
  keyThamSo,
  locNhapSoThuc,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongMoiPhutTuiAp,
  luongTbTui,
  parseGiaTriThamSo,
  soCongNhanTui,
  soNguoiMoiCa1May,
  SO_GIO_MOT_CA,
  tangCaTheoTongLuong,
  tangCaTui,
  tienComSangTui,
  tienComToiTui,
  tinhDonVi,
  tinhDsCongThuc,
  tongLuong,
  xoaDonViTai,
  type CongThucTuyChinh,
  type DonViCalc,
  type ThamSoTuyChinh,
} from "../../lib/cpsx-upgrade-labor";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function docSoVnd(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function NumberVndInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState<string>(
    value === 0 ? "0" : dinhDangVnd(value),
  );

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(value === 0 ? "0" : dinhDangVnd(value));
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className={className}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(docSoVnd(e.target.value));
      }}
      onBlur={() => {
        setText(value === 0 ? "0" : dinhDangVnd(value));
      }}
    />
  );
}

type May1Key = "print" | "laminate" | "slit";
type MayKey = May1Key | "bag";

export default function CpsxNangCapLuong({
  coQuyenPrint = true,
  coQuyenLaminate = true,
  coQuyenSlit = true,
  coQuyenBag = true,
  chiXem = false,
}: {
  coQuyenPrint?: boolean;
  coQuyenLaminate?: boolean;
  coQuyenSlit?: boolean;
  coQuyenBag?: boolean;
  /** Chế độ chỉ xem (REVIEW) — hiện đủ 4 máy nhưng khóa toàn bộ input. */
  chiXem?: boolean;
}) {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const state = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeLabor(
        hangSo.cpsxUpgradeLabor,
        DEFAULT_CPSX_UPGRADE_LABOR,
      ),
    [hangSo.cpsxUpgradeLabor],
  );

  const luu = (next: CpsxUpgradeLabor) => {
    capNhatHangSo("cpsxUpgradeLabor", next as never);
  };

  const capNhat1May = (
    key: May1Key,
    patch: Partial<CpsxUpgradeLabor1May>,
  ) => {
    luu({ ...state, [key]: { ...state[key], ...patch } });
  };
  const capNhatTui = (patch: Partial<CpsxUpgradeLaborTui>) => {
    luu({ ...state, bag: { ...state.bag, ...patch } });
  };

  const [openMap, setOpenMap] = React.useState<Record<MayKey, boolean>>({
    print: false,
    laminate: false,
    slit: false,
    bag: false,
  });
  const toggle = (key: MayKey) =>
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  const tomTat1May = (key: May1Key) => {
    const g = state[key];
    const v = luongMoiPhutAp(
      luongMoiPhutTinh(
        g.wages,
        g.hoursPerDay,
        g.mealMorning,
        g.mealEvening,
        g.otFactor,
        undefined,
        g.tyLeTangCa,
      ),
      g.roundedPerMin,
    );
    return `${dinhDangVnd(v)} ₫/phút`;
  };

  const tomTatTui = () => {
    const g = state.bag;
    return `${dinhDangVnd(
      luongMoiPhutAp(
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
      ),
    )} ₫/phút`;
  };

  const cards: Array<{
    key: MayKey;
    title: string;
    summary: string;
    body: React.ReactNode;
  }> = [];
  if (coQuyenPrint || chiXem) {
    cards.push({
      key: "print",
      title: "Lương công nhân máy in",
      summary: tomTat1May("print"),
      body: (
        <May1May
          tenMay="Máy in"
          giaTri={state.print}
          capNhat={(patch) => capNhat1May("print", patch)}
          hienSoMay
          hienMayTinh
        />
      ),
    });
  }
  if (coQuyenLaminate || chiXem) {
    cards.push({
      key: "laminate",
      title: "Lương công nhân máy ghép",
      summary: tomTat1May("laminate"),
      body: (
        <May1May
          tenMay="Máy ghép"
          giaTri={state.laminate}
          capNhat={(patch) => capNhat1May("laminate", patch)}
          hienMayTinh
        />
      ),
    });
  }
  if (coQuyenSlit || chiXem) {
    cards.push({
      key: "slit",
      title: "Lương công nhân máy chia",
      summary: tomTat1May("slit"),
      body: (
        <May1May
          tenMay="Máy chia"
          giaTri={state.slit}
          capNhat={(patch) => capNhat1May("slit", patch)}
          hienMayTinh
        />
      ),
    });
  }
  if (coQuyenBag || chiXem) {
    cards.push({
      key: "bag",
      title: "Lương công nhân máy làm túi",
      summary: tomTatTui(),
      body: <MayTui giaTri={state.bag} capNhat={capNhatTui} />,
    });
  }

  return (
    <div className="config-cpsx-upgrade-labor">
      {cards.map(({ key, title, summary, body }) => {
        const open = openMap[key];
        return (
          <div key={key} className="card config-card config-cpsx-upgrade-card">
            <div className="config-section-title config-cpsx-upgrade__head">
              <span>{title}</span>
              <span className="config-cpsx-upgrade__head-meta">{summary}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
                onClick={() => toggle(key)}
                aria-expanded={open}
                aria-controls={`cpsx-luong-body-${key}`}
                aria-label={open ? "Thu gọn" : "Mở rộng"}
              >
                {open ? "▾ Thu gọn" : "▸ Mở rộng"}
              </button>
            </div>
            {open && (
              <fieldset
                id={`cpsx-luong-body-${key}`}
                disabled={chiXem}
                className="config-cpsx-upgrade__ro"
              >
                {body}
              </fieldset>
            )}
          </div>
        );
      })}

      <div className="card config-card config-cpsx-upgrade-readonly__card">
        <div className="config-cpsx-upgrade-readonly__row" style={{ fontWeight: 600, marginBottom: 8 }}>
          Kết quả hiện tại
        </div>
        {[
          { hien: coQuyenPrint || chiXem, label: "Lương CN máy in", value: tomTat1May("print") },
          { hien: coQuyenLaminate || chiXem, label: "Lương CN máy ghép", value: tomTat1May("laminate") },
          { hien: coQuyenSlit || chiXem, label: "Lương CN máy chia", value: tomTat1May("slit") },
          { hien: coQuyenBag || chiXem, label: "Lương CN máy làm túi", value: tomTatTui() },
        ].map((row) => (
          <div key={row.label} className="config-cpsx-upgrade-readonly__row">
            <span className="config-cpsx-upgrade-readonly__label">{row.label}</span>
            <strong className="config-cpsx-upgrade-readonly__value">{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function May1May({
  tenMay,
  giaTri,
  capNhat,
  hienSoMay = false,
  hienMayTinh = false,
}: {
  tenMay: string;
  giaTri: CpsxUpgradeLabor1May;
  capNhat: (patch: Partial<CpsxUpgradeLabor1May>) => void;
  hienSoMay?: boolean;
  hienMayTinh?: boolean;
}) {
  const [openCongThucMau, setOpenCongThucMau] = React.useState(true);
  const soCN = giaTri.wages.length;
  const soNguoiMoiCa = giaTri.peoplePerShift != null
    ? giaTri.peoplePerShift
    : soNguoiMoiCa1May(giaTri.wages, giaTri.shiftCount);
  const tongL = tongLuong(giaTri.wages);
  const tienComSang = (Number(giaTri.mealMorning) || 0) * soCN / 2;
  const tienComToi = (Number(giaTri.mealEvening) || 0) * soCN / 2;
  const tangCa = tangCaTheoTongLuong(giaTri.wages, giaTri.otFactor, giaTri.tyLeTangCa, giaTri.otHours);
  const ketQua = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
    undefined,
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );

  const suaLuong = (idx: number, val: string) => {
    const next = [...giaTri.wages];
    next[idx] = docSoVnd(val);
    capNhat({ wages: next });
  };
  const themCN = () => {
    capNhat({ wages: [...giaTri.wages, 500000] });
  };
  const xoaCN = (idx: number) => {
    if (giaTri.wages.length <= 1) return;
    capNhat({ wages: giaTri.wages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num" style={{ width: 48 }}>
                STT
              </th>
              <th>Vai trò / CN</th>
              <th className="num">Lương (₫/ca)</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {giaTri.wages.map((wage, idx) => (
              <tr key={idx}>
                <td className="num config-cpsx-upgrade__lock">{idx + 1}</td>
                <td className="config-cpsx-upgrade__lock">CN {idx + 1}</td>
                <td className="num">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="config-inline-input"
                    aria-label={`Lương CN ${idx + 1} mỗi ca`}
                    value={dinhDangVnd(wage)}
                    onChange={(e) => suaLuong(idx, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                    disabled={giaTri.wages.length <= 1}
                    onClick={() => xoaCN(idx)}
                    aria-label={`Xóa CN ${idx + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
        onClick={themCN}
      >
        + Thêm công nhân
      </button>

      <div className="config-cpsx-upgrade__meta-grid">
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Tổng lương</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tongL)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Số công nhân</span>
          <strong className="config-cpsx-upgrade__meta-value">{soCN}</strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Số ca</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`Số ca — ${tenMay}`}
            min={1}
            max={2}
            step={1}
            value={giaTri.shiftCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              capNhat({
                shiftCount: v === 1 || v === 2 ? v : giaTri.shiftCount,
              });
            }}
          />
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            SL người / ca
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`SL người mỗi ca — ${tenMay}`}
            min={1}
            step={1}
            value={soNguoiMoiCa}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                peoplePerShift:
                  Number.isFinite(v) && v > 0 ? Math.floor(v) : null,
              });
            }}
          />
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số giờ máy / ngày
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`Giờ máy hoạt động mỗi ngày — ${tenMay}`}
            min={1}
            max={24}
            step={1}
            value={giaTri.hoursPerDay}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                hoursPerDay:
                  Number.isFinite(v) && v > 0
                    ? Math.min(24, v)
                    : giaTri.hoursPerDay,
              });
            }}
          />
        </div>
        {hienSoMay && (
          <div className="config-cpsx-upgrade__meta-item">
            <span className="config-cpsx-upgrade__meta-label">
              Số máy hoạt động / ngày
            </span>
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__meta-input"
              aria-label={`Số máy hoạt động mỗi ngày — ${tenMay}`}
              min={1}
              step={1}
              value={giaTri.machinesPerDay}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  machinesPerDay:
                    Number.isFinite(v) && v > 0
                      ? Math.floor(v)
                      : giaTri.machinesPerDay,
                });
              }}
            />
          </div>
        )}
      </div>

      <div className="config-cpsx-upgrade__formula-panel">
        <div className="config-cpsx-upgrade__formula-panel-head">
          <span className="config-cpsx-upgrade__formula-panel-title">
            Công thức mẫu
          </span>
          <strong className="config-cpsx-upgrade__formula-panel-tomtat">
            {dinhDangVnd(ketQua)} ₫/phút
          </strong>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenCongThucMau((o) => !o)}
            aria-expanded={openCongThucMau}
            aria-label={
              openCongThucMau
                ? "Thu gọn công thức mẫu"
                : "Mở rộng công thức mẫu"
            }
          >
            {openCongThucMau ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openCongThucMau ? (
          <div className="config-cpsx-upgrade__formulas config-cpsx-upgrade__formulas--in-panel">
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tiền cơm ca sáng =
              </span>
              <NumberVndInput
                className="config-inline-input config-cpsx-upgrade__formula-input"
                ariaLabel="Cơm sáng mỗi người"
                value={giaTri.mealMorning}
                onChange={(v) => capNhat({ mealMorning: v })}
              />
              <span className="config-cpsx-upgrade__formula-op">
                × {soCN} / 2 =
              </span>
              <strong className="config-cpsx-upgrade__formula-result">
                {dinhDangVnd(tienComSang)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tiền cơm ca tối =
              </span>
              <NumberVndInput
                className="config-inline-input config-cpsx-upgrade__formula-input"
                ariaLabel="Cơm tối mỗi người"
                value={giaTri.mealEvening}
                onChange={(v) => capNhat({ mealEvening: v })}
              />
              <span className="config-cpsx-upgrade__formula-op">
                × {soCN} / 2 =
              </span>
              <strong className="config-cpsx-upgrade__formula-result">
                {dinhDangVnd(tienComToi)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tổng tiền tăng ca n giờ = (Tổng lương ÷ {SO_GIO_MOT_CA} × n) ×
                Hệ số tăng ca × Tỉ lệ tăng ca
              </span>
            </div>
            <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
              <strong className="config-cpsx-upgrade__formula-result">
                ({dinhDangVnd(tongL)} ÷ {SO_GIO_MOT_CA} ×{" "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Số giờ tăng ca"
                  min={0}
                  step={0.5}
                  value={giaTri.otHours}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      otHours:
                        Number.isFinite(v) && v >= 0 ? v : giaTri.otHours,
                    });
                  }}
                />
                {") × "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Hệ số tăng ca"
                  min={0}
                  step={0.1}
                  value={giaTri.otFactor}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      otFactor:
                        Number.isFinite(v) && v > 0 ? v : giaTri.otFactor,
                    });
                  }}
                />{" "}
                ×{" "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Tỉ lệ tăng ca (%)"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(giaTri.tyLeTangCa * 100)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      tyLeTangCa:
                        Number.isFinite(v) && v >= 0 && v <= 100
                          ? v / 100
                          : giaTri.tyLeTangCa,
                    });
                  }}
                />{" "}
                % = {dinhDangVnd(tangCa)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Lương CN mỗi phút = (Tổng lương + Tăng ca + Cơm sáng + Cơm
                tối) ÷ Số giờ/ngày ÷ 60
              </span>
            </div>
            <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
              <strong className="config-cpsx-upgrade__formula-result">
                ({dinhDangVnd(tongL)} + {dinhDangVnd(tangCa)} +{" "}
                {dinhDangVnd(tienComSang)} + {dinhDangVnd(tienComToi)}) ÷{" "}
                {giaTri.hoursPerDay} ÷ 60 = {dinhDangVnd(ketQua)} ₫/phút
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      {hienMayTinh && (
        <MayTinhThamKhao
          giaTri={giaTri}
          giaMau={ketQua}
          radioName={`cpsx-luong-ap-${tenMay}`}
          onApDung={(n) =>
            capNhat({ roundedPerMin: n != null && n > 0 ? Math.round(n) : null })
          }
          onMayTinhChange={(mayTinh) => capNhat({ mayTinh })}
        />
      )}
    </div>
  );
}

function MayTinhThamKhao({
  giaTri,
  giaMau,
  radioName,
  onApDung,
  onMayTinhChange,
}: {
  giaTri: CpsxUpgradeLabor1May;
  giaMau: number;
  radioName: string;
  onApDung: (n: number | null) => void;
  onMayTinhChange: (w: CpsxMayTinhWorkspace) => void;
}) {
  const tongL = tongLuong(giaTri.wages);
  const soCN = giaTri.wages.length;
  const soNguoiMoiCa = giaTri.peoplePerShift != null
    ? giaTri.peoplePerShift
    : soNguoiMoiCa1May(giaTri.wages, giaTri.shiftCount);
  const tienComSang = (Number(giaTri.mealMorning) || 0) * soCN / 2;
  const tienComToi = (Number(giaTri.mealEvening) || 0) * soCN / 2;
  const tangCa = tangCaTheoTongLuong(
    giaTri.wages,
    giaTri.otFactor,
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );

  const soHang: Record<string, number> = {
    tongluong: tongL,
    comcasang: tienComSang,
    comcatoi: tienComToi,
    tangca: tangCa,
    soca: giaTri.shiftCount,
    slnguoica: soNguoiMoiCa,
    sogiomayngay: giaTri.hoursPerDay,
    somayhoatdongngay: giaTri.machinesPerDay,
    sogiotangca: giaTri.otHours,
    hesotangca: giaTri.otFactor,
    tiletangca: giaTri.tyLeTangCa,
    socongnhan: soCN,
  };

  const workspace = React.useMemo(
    () => chuanHoaMayTinh(giaTri.mayTinh),
    [giaTri.mayTinh],
  );

  return (
    <MayTinhThamKhaoTokens
      soHang={soHang}
      giaMau={giaMau}
      radioName={radioName}
      onApDung={onApDung}
      workspace={workspace}
      onWorkspaceChange={onMayTinhChange}
    />
  );
}

function MayTinhThamKhaoTui({
  giaTri,
  giaMau,
  radioName,
  onApDung,
  onMayTinhChange,
}: {
  giaTri: CpsxUpgradeLaborTui;
  giaMau: number;
  radioName: string;
  onApDung: (n: number | null) => void;
  onMayTinhChange: (w: CpsxMayTinhWorkspace) => void;
}) {
  const tongL = tongLuong(giaTri.wages);
  const soCN = soCongNhanTui(giaTri.wages);
  const tienComSang = tienComSangTui(giaTri.mealMorning, soCN);
  const tienComToi = tienComToiTui(giaTri.mealEvening, soCN);
  const tangCa = tangCaTui(
    giaTri.wages,
    giaTri.otFactor,
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );

  const soHang: Record<string, number> = {
    tongluong: tongL,
    comcasang: tienComSang,
    comcatoi: tienComToi,
    tangca: tangCa,
    slnguoica: giaTri.peoplePerShift,
    sogiomayngay: giaTri.hoursPerDay,
    somayhoatdongngay: giaTri.machinesPerDay,
    sogiotangca: giaTri.otHours,
    hesotangca: giaTri.otFactor,
    tiletangca: giaTri.tyLeTangCa,
    socongnhan: soCN,
  };

  const workspace = React.useMemo(
    () => chuanHoaMayTinh(giaTri.mayTinh),
    [giaTri.mayTinh],
  );

  return (
    <MayTinhThamKhaoTokens
      soHang={soHang}
      giaMau={giaMau}
      radioName={radioName}
      onApDung={onApDung}
      workspace={workspace}
      onWorkspaceChange={onMayTinhChange}
    />
  );
}

/** Id ảo cho ô cố định «Lương CN mỗi phút =» (trong 1 item Công thức). */
const MAIN_CALC_ID = "__main__";

type CongThucItem = CpsxMayTinhCongThucItem;
type LuongApSource = CpsxMayTinhApSource;

function workspaceTuItems(
  items: CongThucItem[],
  apSource: LuongApSource,
  apCtId: string | null,
  manualDraft: string,
): CpsxMayTinhWorkspace {
  return chuanHoaMayTinh({ items, apSource, apCtId, manualDraft });
}

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Nhãn hiển thị 1 token (soHang tra map key→tên nếu có). */
function nhanDonVi(
  d: DonViCalc,
  tenTheoKey?: Record<string, string>,
): string {
  if (d.loai === "so") return d.giaTri === "" ? "?" : d.giaTri;
  if (d.loai === "soHang") return tenTheoKey?.[d.key] ?? d.key;
  return d.s;
}

/** Ghép token thành chuỗi hiển thị (kể cả ô số đang gõ dở). */
function chuoiHienThiDonVi(
  donVi: DonViCalc[],
  tenTheoKey?: Record<string, string>,
): string {
  if (donVi.length === 0) return "";
  let out = "";
  for (const d of donVi) out += nhanDonVi(d, tenTheoKey);
  return out;
}

function mapTenTheoKey(
  soHang: Record<string, number>,
  thamSo: readonly ThamSoTuyChinh[],
  congThuc: readonly CongThucTuyChinh[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(soHang)) out[k] = k;
  // Built-in labels thường dùng
  const builtIn: Record<string, string> = {
    tongluong: "Tổng lương",
    comcasang: "Cơm ca sáng",
    comcatoi: "Cơm ca tối",
    tangca: "Tăng ca",
    soca: "Số ca",
    slnguoica: "SL người / ca",
    sogiomayngay: "Số giờ máy / ngày",
    somayhoatdongngay: "Số máy hoạt động / ngày",
    sogiotangca: "Số giờ tăng ca",
    hesotangca: "Hệ số tăng ca",
    tiletangca: "Tỉ lệ tăng ca",
    socongnhan: "Số công nhân",
  };
  for (const [k, v] of Object.entries(builtIn)) {
    if (k in soHang || k in out) out[k] = v;
  }
  for (const t of thamSo) {
    const key = keyThamSo(t.ten);
    if (key) out[key] = t.ten;
  }
  for (const ct of congThuc) {
    const ten = (ct.ten ?? "").trim().replace(/\s+/g, " ");
    const key = ten ? keyThamSo(ten) : "";
    if (key) out[key] = ten;
  }
  return out;
}

function soHangPreviewItem(
  item: CongThucItem,
  soHang: Record<string, number>,
): {
  soHangHieuLuc: Record<string, number>;
  ketQuaCt: Record<string, number | null>;
  soHangPreview: Record<string, number>;
} {
  const soHangHieuLuc = gopSoHang(soHang, item.thamSo);
  const ketQuaCt = tinhDsCongThuc(item.congThuc, soHangHieuLuc);
  const soHangPreview: Record<string, number> = { ...soHangHieuLuc };
  for (const ct of item.congThuc) {
    const g = ketQuaCt[ct.id];
    if (g == null || !Number.isFinite(g)) continue;
    const ten = (ct.ten ?? "").trim().replace(/\s+/g, " ");
    const key = ten ? boDau(ten) : "";
    if (key) soHangPreview[key] = g;
  }
  return { soHangHieuLuc, ketQuaCt, soHangPreview };
}

function tinhGiaTriMainItem(
  item: CongThucItem,
  soHang: Record<string, number>,
): number | null {
  const { soHangPreview } = soHangPreviewItem(item, soHang);
  return tinhDonVi(item.donViMain, soHangPreview);
}

type XemNhanhDong = {
  ten: string;
  bieuThuc: string;
  giaTri: number | null;
};

function duLieuXemNhanh(
  item: CongThucItem,
  soHang: Record<string, number>,
): { phu: XemNhanhDong[]; main: XemNhanhDong } {
  const { ketQuaCt, soHangPreview } = soHangPreviewItem(item, soHang);
  const tenMap = mapTenTheoKey(soHang, item.thamSo, item.congThuc);
  const phu: XemNhanhDong[] = item.congThuc.map((ct) => {
    const raw = chuoiHienThiDonVi(ct.donVi, tenMap);
    return {
      ten: (ct.ten ?? "").trim() || "(chưa đặt tên)",
      bieuThuc: raw || "—",
      giaTri: ketQuaCt[ct.id] ?? null,
    };
  });
  const mainRaw = chuoiHienThiDonVi(item.donViMain, tenMap);
  const mainGtri = tinhDonVi(item.donViMain, soHangPreview);
  return {
    phu,
    main: {
      ten: "Lương CN mỗi phút",
      bieuThuc: mainRaw || "—",
      giaTri: mainGtri,
    },
  };
}

function taoCongThucItemMoi(
  id: string,
  ten: string,
  open = true,
): CongThucItem {
  return {
    id,
    ten,
    open,
    thamSo: [],
    congThuc: [],
    donViMain: [],
  };
}

function MayTinhThamKhaoTokens({
  soHang,
  giaMau,
  radioName,
  onApDung,
  workspace,
  onWorkspaceChange,
}: {
  soHang: Record<string, number>;
  /** Giá tính từ bảng lương sẵn (Công thức mẫu). */
  giaMau: number;
  radioName: string;
  onApDung: (n: number | null) => void;
  workspace: CpsxMayTinhWorkspace;
  onWorkspaceChange: (w: CpsxMayTinhWorkspace) => void;
}) {
  const ws = React.useMemo(() => chuanHoaMayTinh(workspace), [workspace]);
  const idSeq = React.useRef(1);
  React.useEffect(() => {
    let max = 1;
    for (const it of ws.items) {
      const m = /^mt_(\d+)$/.exec(it.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
    idSeq.current = Math.max(idSeq.current, max);
  }, [ws.items]);

  const items = ws.items;
  const apSource = ws.apSource;
  const apCtId = ws.apCtId;
  const manualDraft = ws.manualDraft;

  const onWsRef = React.useRef(onWorkspaceChange);
  onWsRef.current = onWorkspaceChange;

  const commitWs = React.useCallback((next: CpsxMayTinhWorkspace) => {
    onWsRef.current(chuanHoaMayTinh(next));
  }, []);

  const setItems = (
    updater: CongThucItem[] | ((prev: CongThucItem[]) => CongThucItem[]),
  ) => {
    const nextItems =
      typeof updater === "function" ? updater(items) : updater;
    commitWs(workspaceTuItems(nextItems, apSource, apCtId, manualDraft));
  };

  const setApSource = (src: LuongApSource, ctId: string | null = null) => {
    commitWs(
      workspaceTuItems(
        items,
        src,
        src === "ct" ? ctId : null,
        manualDraft,
      ),
    );
  };

  const setManualDraft = (draft: string) => {
    commitWs(workspaceTuItems(items, apSource, apCtId, draft));
  };

  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const lastApRef = React.useRef<number | null | undefined>(undefined);
  const onApDungRef = React.useRef(onApDung);
  onApDungRef.current = onApDung;

  const giaTriTheoId = React.useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const it of items) {
      m[it.id] = tinhGiaTriMainItem(it, soHang);
    }
    return m;
  }, [items, soHang]);

  const giaMauLamTron = Math.round(
    Number.isFinite(giaMau) && giaMau > 0 ? giaMau : 0,
  );

  /** Sync giá áp dụng theo radio (mẫu / CT / nhập tay). */
  React.useEffect(() => {
    let next: number | null = null;
    if (apSource === "formula") {
      next = null;
    } else if (apSource === "ct" && apCtId) {
      const g = giaTriTheoId[apCtId];
      if (g != null && Number.isFinite(g) && g > 0) next = Math.round(g);
      else next = null;
    } else if (apSource === "manual") {
      const v = docSoVnd(manualDraft);
      next = v > 0 ? v : null;
    }
    if (lastApRef.current === next) return;
    lastApRef.current = next;
    onApDungRef.current(next);
  }, [apSource, apCtId, giaTriTheoId, manualDraft]);

  /** CT bị xóa / mất kết quả → fallback mẫu. */
  React.useEffect(() => {
    if (apSource !== "ct" || !apCtId) return;
    const still = items.some((p) => p.id === apCtId);
    const g = apCtId ? giaTriTheoId[apCtId] : null;
    const ok = still && g != null && Number.isFinite(g) && g > 0;
    if (!ok) {
      commitWs(workspaceTuItems(items, "formula", null, manualDraft));
    }
  }, [apSource, apCtId, items, giaTriTheoId, manualDraft, commitWs]);

  const themItem = () => {
    idSeq.current += 1;
    const id = `mt_${idSeq.current}`;
    const n = items.length + 1;
    const moi = taoCongThucItemMoi(id, `Công thức ${n}`, true);
    setItems((prev) => {
      const closed = prev.map((p) => ({ ...p, open: false }));
      return [...closed, moi];
    });
  };

  const xoaItem = (id: string) => {
    const nextItems = items.filter((p) => p.id !== id);
    setPreviewId((cur) => (cur === id ? null : cur));
    const nextAp =
      apCtId === id
        ? { apSource: "formula" as const, apCtId: null as string | null }
        : { apSource, apCtId };
    commitWs(
      workspaceTuItems(
        nextItems,
        nextAp.apSource,
        nextAp.apCtId,
        manualDraft,
      ),
    );
  };

  const saoChepItem = (id: string) => {
    const src = items.find((p) => p.id === id);
    if (!src) return;
    idSeq.current += 1;
    const nid = `mt_${idSeq.current}`;
    const copy: CongThucItem = {
      ...cloneJson(src),
      id: nid,
      ten: `${src.ten.trim() || "Công thức"} (bản sao)`,
      open: true,
    };
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const closed = prev.map((p) => ({ ...p, open: false }));
      const next = [...closed];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const toggleOpen = (id: string) => {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, open: !p.open } : p)),
    );
  };

  const suaTenItem = (id: string, ten: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ten } : p)));
  };

  const capNhatItem = (id: string, patch: Partial<CongThucItem>) => {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const chonMau = () => {
    setApSource("formula");
  };

  const chonCt = (id: string) => {
    const g = giaTriTheoId[id];
    if (g == null || !Number.isFinite(g) || g <= 0) return;
    setApSource("ct", id);
  };

  const chonManual = () => {
    const draft = manualDraft.trim()
      ? manualDraft
      : giaMauLamTron > 0
        ? String(giaMauLamTron)
        : "";
    commitWs(workspaceTuItems(items, "manual", null, draft));
  };

  return (
    <div className="config-cpsx-upgrade__calc">
      <div className="config-cpsx-upgrade__calc-title">Công thức</div>
      <ul className="config-cpsx-upgrade__calc-mt-list">
        {items.map((it) => {
          const gtri = giaTriTheoId[it.id];
          const dangAp = apSource === "ct" && apCtId === it.id;
          return (
            <li
              key={it.id}
              className={
                dangAp
                  ? "config-cpsx-upgrade__calc-mt-item config-cpsx-upgrade__calc-mt-item--selected"
                  : "config-cpsx-upgrade__calc-mt-item"
              }
            >
              <div className="config-cpsx-upgrade__calc-mt-head">
                <input
                  type="text"
                  className="config-inline-input config-cpsx-upgrade__calc-mt-ten"
                  value={it.ten}
                  onChange={(e) => suaTenItem(it.id, e.target.value)}
                  aria-label="Tên công thức"
                  placeholder="Tên công thức"
                />
                <span className="config-cpsx-upgrade__calc-mt-tomtat">
                  {gtri == null ? "—" : `${dinhDangVnd(gtri)} ₫/phút`}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__calc-mt-btn"
                  data-calc-preview-btn={it.id}
                  onClick={() =>
                    setPreviewId((cur) => (cur === it.id ? null : it.id))
                  }
                  aria-expanded={previewId === it.id}
                  aria-label={`Xem nhanh ${it.ten || "công thức"}`}
                  title="Xem nhanh"
                >
                  <Eye size={14} />
                </button>
                {previewId === it.id ? (
                  <CongThucXemNhanhPopup
                    item={it}
                    soHang={soHang}
                    itemId={it.id}
                    onClose={() => setPreviewId(null)}
                  />
                ) : null}
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__calc-mt-btn"
                  onClick={() => toggleOpen(it.id)}
                  aria-expanded={it.open}
                  aria-label={it.open ? "Thu gọn" : "Mở rộng"}
                >
                  {it.open ? "▾" : "▸"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__calc-mt-btn"
                  onClick={() => saoChepItem(it.id)}
                  aria-label={`Sao chép ${it.ten || "công thức"}`}
                  title="Sao chép"
                >
                  📋
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__calc-params-xoa"
                  onClick={() => xoaItem(it.id)}
                  aria-label={`Xóa ${it.ten || "công thức"}`}
                >
                  ×
                </button>
              </div>
              {it.open ? (
                <div className="config-cpsx-upgrade__calc-mt-body">
                  <CongThucItemBody
                    soHang={soHang}
                    item={it}
                    onChange={(patch) => capNhatItem(it.id, patch)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="btn btn-sm btn-outline config-cpsx-upgrade__calc-ct-add"
        onClick={themItem}
      >
        + Thêm công thức
      </button>

      <fieldset className="config-cpsx-upgrade__sources config-cpsx-upgrade__calc-ap">
        <legend className="config-cpsx-upgrade__sources-legend">
          Chọn giá áp dụng
        </legend>
        <label
          className={`config-cpsx-upgrade__source-opt${
            apSource === "formula" ? " is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name={radioName}
            checked={apSource === "formula"}
            onChange={chonMau}
          />
          <span className="config-cpsx-upgrade__source-label">
            Công thức mẫu
          </span>
          <strong className="config-cpsx-upgrade__source-value">
            {giaMauLamTron > 0
              ? `${dinhDangVnd(giaMauLamTron)} ₫/phút`
              : "—"}
          </strong>
        </label>
        {items.map((it) => {
          const gtri = giaTriTheoId[it.id];
          const ok = gtri != null && Number.isFinite(gtri) && gtri > 0;
          const checked = apSource === "ct" && apCtId === it.id;
          return (
            <label
              key={it.id}
              className={`config-cpsx-upgrade__source-opt${
                checked ? " is-selected" : ""
              }`}
            >
              <input
                type="radio"
                name={radioName}
                checked={checked}
                disabled={!ok}
                onChange={() => chonCt(it.id)}
              />
              <span className="config-cpsx-upgrade__source-label">
                {it.ten.trim() || "Công thức"}
              </span>
              <strong className="config-cpsx-upgrade__source-value">
                {ok ? `${dinhDangVnd(gtri!)} ₫/phút` : "—"}
              </strong>
            </label>
          );
        })}
        <label
          className={`config-cpsx-upgrade__source-opt${
            apSource === "manual" ? " is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name={radioName}
            checked={apSource === "manual"}
            onChange={chonManual}
          />
          <span className="config-cpsx-upgrade__source-label">
            Giá nhân công nhập tay
          </span>
          {apSource === "manual" ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                className="config-inline-input config-cpsx-upgrade__manual"
                aria-label="Giá nhân công nhập tay"
                placeholder="₫/phút"
                value={manualDraft}
                onChange={(e) => setManualDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="config-cpsx-upgrade__unit">₫/phút</span>
            </>
          ) : (
            <strong className="config-cpsx-upgrade__source-value">
              {docSoVnd(manualDraft) > 0
                ? `${dinhDangVnd(docSoVnd(manualDraft))} ₫/phút`
                : "—"}
            </strong>
          )}
        </label>
      </fieldset>
    </div>
  );
}

function CongThucXemNhanhPopup({
  item,
  soHang,
  itemId,
  onClose,
}: {
  item: CongThucItem;
  soHang: Record<string, number>;
  itemId: string;
  onClose: () => void;
}) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  const data = React.useMemo(
    () => duLieuXemNhanh(item, soHang),
    [item, soHang],
  );
  const fmt = (n: number | null) =>
    n == null || !Number.isFinite(n) ? "—" : `${dinhDangVnd(n)} ₫/phút`;

  const capNhatViTri = React.useCallback(() => {
    const btn = document.querySelector(
      `[data-calc-preview-btn="${itemId}"]`,
    ) as HTMLElement | null;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const w = Math.min(320, window.innerWidth - 16);
    const maxH = Math.min(360, window.innerHeight * 0.55);
    let left = r.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + maxH > window.innerHeight - 8) {
      top = Math.max(8, r.top - maxH - 6);
    }
    setPos({ top, left });
  }, [itemId]);

  React.useLayoutEffect(() => {
    capNhatViTri();
  }, [capNhatViTri, item, data.phu.length]);

  React.useEffect(() => {
    const onScroll = () => capNhatViTri();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [capNhatViTri]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      const btn = document.querySelector(
        `[data-calc-preview-btn="${itemId}"]`,
      );
      if (btn?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [itemId, onClose]);

  if (typeof document === "undefined" || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="config-cpsx-upgrade__calc-mt-preview"
      data-calc-preview={itemId}
      role="dialog"
      aria-label="Xem nhanh công thức"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="config-cpsx-upgrade__calc-mt-preview-title">
        Xem nhanh
      </div>
      <div className="config-cpsx-upgrade__calc-mt-preview-sec">
        <div className="config-cpsx-upgrade__calc-mt-preview-sec-h">
          Tính toán phụ
        </div>
        {data.phu.length === 0 ? (
          <p className="config-cpsx-upgrade__calc-mt-preview-empty">
            Chưa có tính toán phụ
          </p>
        ) : (
          <ul className="config-cpsx-upgrade__calc-mt-preview-list">
            {data.phu.map((d, i) => (
              <li key={i} className="config-cpsx-upgrade__calc-mt-preview-dong">
                <div className="config-cpsx-upgrade__calc-mt-preview-ten">
                  {d.ten} =
                </div>
                <div className="config-cpsx-upgrade__calc-mt-preview-bt">
                  {d.bieuThuc || "—"}
                </div>
                <div className="config-cpsx-upgrade__calc-mt-preview-gt">
                  → {fmt(d.giaTri)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="config-cpsx-upgrade__calc-mt-preview-sec config-cpsx-upgrade__calc-mt-preview-sec--main">
        <div className="config-cpsx-upgrade__calc-mt-preview-sec-h">
          {data.main.ten} =
        </div>
        <div className="config-cpsx-upgrade__calc-mt-preview-bt">
          {data.main.bieuThuc || "—"}
        </div>
        <div className="config-cpsx-upgrade__calc-mt-preview-gt config-cpsx-upgrade__calc-mt-preview-gt--main">
          → {fmt(data.main.giaTri)}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CongThucItemBody({
  soHang,
  item,
  onChange,
}: {
  soHang: Record<string, number>;
  item: CongThucItem;
  onChange: (patch: Partial<CongThucItem>) => void;
}) {
  const { thamSo, congThuc, donViMain } = item;
  const [draftGt, setDraftGt] = React.useState<Record<string, string>>({});
  const [tenMoi, setTenMoi] = React.useState("");
  const [giaTriMoi, setGiaTriMoi] = React.useState("");
  const [loiThamSo, setLoiThamSo] = React.useState("");
  const [activeCtId, setActiveCtId] = React.useState<string | null>(
    MAIN_CALC_ID,
  );
  const [cursorMap, setCursorMap] = React.useState<Record<string, number>>({
    [MAIN_CALC_ID]: 0,
  });
  const [loiTenCt, setLoiTenCt] = React.useState<Record<string, string>>({});
  const soMoiRef = React.useRef<{ id: string; i: number } | null>(null);
  const idSeq = React.useRef(0);

  const soHangHieuLuc = React.useMemo(
    () => gopSoHang(soHang, thamSo),
    [soHang, thamSo],
  );

  const ketQuaCt = React.useMemo(
    () => tinhDsCongThuc(congThuc, soHangHieuLuc),
    [congThuc, soHangHieuLuc],
  );

  const soHangPreview = React.useMemo(() => {
    const out: Record<string, number> = { ...soHangHieuLuc };
    for (const ct of congThuc) {
      const g = ketQuaCt[ct.id];
      if (g == null || !Number.isFinite(g)) continue;
      const ten = (ct.ten ?? "").trim().replace(/\s+/g, " ");
      const key = ten ? boDau(ten) : "";
      if (key) out[key] = g;
    }
    return out;
  }, [soHangHieuLuc, congThuc, ketQuaCt]);

  const tenMap = React.useMemo(
    () => mapTenTheoKey(soHang, thamSo, congThuc),
    [soHang, thamSo, congThuc],
  );
  const giaTriMain = tinhDonVi(donViMain, soHangPreview);
  const hangSoMain = hangSoTuDonVi(donViMain, soHangPreview, dinhDangVnd) ?? "";

  type NutChen =
    | { loai: "soHang"; key: string; nhan: string }
    | { loai: "soLiteral"; s: string; nhan: string };
  const nutChon: NutChen[] = [
    { loai: "soHang", key: "tongluong", nhan: "Tổng lương" },
    { loai: "soHang", key: "comcasang", nhan: "Cơm ca sáng" },
    { loai: "soHang", key: "comcatoi", nhan: "Cơm ca tối" },
    { loai: "soHang", key: "tangca", nhan: "Tăng ca" },
    ...(soHang.soca != null
      ? [{ loai: "soHang" as const, key: "soca", nhan: "Số ca" }]
      : []),
    { loai: "soHang", key: "slnguoica", nhan: "SL người / ca" },
    { loai: "soHang", key: "sogiomayngay", nhan: "Số giờ máy / ngày" },
    {
      loai: "soHang",
      key: "somayhoatdongngay",
      nhan: "Số máy hoạt động / ngày",
    },
    { loai: "soHang", key: "sogiotangca", nhan: "Số giờ tăng ca" },
    { loai: "soHang", key: "hesotangca", nhan: "Hệ số tăng ca" },
    { loai: "soHang", key: "tiletangca", nhan: "Tỉ lệ tăng ca" },
    { loai: "soHang", key: "socongnhan", nhan: "Số công nhân" },
    { loai: "soLiteral", s: "60", nhan: "60 phút" },
    { loai: "soLiteral", s: "24", nhan: "24 giờ" },
  ];
  const dauToan: string[] = ["+", "−", "×", "÷", "(", ")", "%"];

  const targetId =
    activeCtId &&
    (activeCtId === MAIN_CALC_ID ||
      congThuc.some((c) => c.id === activeCtId))
      ? activeCtId
      : MAIN_CALC_ID;
  const targetDonVi =
    targetId === MAIN_CALC_ID
      ? donViMain
      : (congThuc.find((c) => c.id === targetId)?.donVi ?? []);
  const cursor = cursorMap[targetId] ?? targetDonVi.length;

  const setThamSo = (next: ThamSoTuyChinh[]) => onChange({ thamSo: next });
  const setCongThuc = (next: CongThucTuyChinh[]) => onChange({ congThuc: next });
  const setDonViMain = (next: DonViCalc[]) => onChange({ donViMain: next });

  const capNhatCt = (id: string, patch: Partial<CongThucTuyChinh>) => {
    setCongThuc(
      congThuc.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const themDonViVaoActive = (dv: DonViCalc, focusSo = false) => {
    const cur = cursorMap[targetId] ?? targetDonVi.length;
    const kq = chenDonVi(targetDonVi, cur, dv);
    if (focusSo) soMoiRef.current = { id: targetId, i: cur };
    if (targetId === MAIN_CALC_ID) {
      setDonViMain(kq.mang);
    } else {
      capNhatCt(targetId, { donVi: kq.mang });
    }
    setCursorMap((m) => ({ ...m, [targetId]: kq.cursorMoi }));
    setActiveCtId(targetId);
  };

  const themToanTu = (s: string) => themDonViVaoActive(donViChuoi(s));
  const themSoHangKey = (key: string) =>
    themDonViVaoActive(donViSoHang(key));
  const themSoLiteral = (s: string) => themDonViVaoActive(donViChuoi(s));
  const themSoThuc = () => themDonViVaoActive(donViSo(""), true);

  const xoaTai = (ctId: string, i: number) => {
    if (ctId === MAIN_CALC_ID) {
      const kq = xoaDonViTai(donViMain, i);
      setDonViMain(kq.mang);
      setCursorMap((m) => ({ ...m, [MAIN_CALC_ID]: kq.cursorMoi }));
      setActiveCtId(MAIN_CALC_ID);
      return;
    }
    const ct = congThuc.find((c) => c.id === ctId);
    if (!ct) return;
    const kq = xoaDonViTai(ct.donVi, i);
    capNhatCt(ctId, { donVi: kq.mang });
    setCursorMap((m) => ({ ...m, [ctId]: kq.cursorMoi }));
    setActiveCtId(ctId);
  };

  const xoaPhiaTruoc = () => {
    if (cursor === 0) return;
    xoaTai(targetId, cursor - 1);
  };

  const xoaHet = () => {
    if (targetId === MAIN_CALC_ID) {
      setDonViMain([]);
      setCursorMap((m) => ({ ...m, [MAIN_CALC_ID]: 0 }));
      setActiveCtId(MAIN_CALC_ID);
      return;
    }
    capNhatCt(targetId, { donVi: [] });
    setCursorMap((m) => ({ ...m, [targetId]: 0 }));
    setActiveCtId(targetId);
  };

  const suaSo = (ctId: string, i: number, raw: string) => {
    if (ctId === MAIN_CALC_ID) {
      setDonViMain(capNhatDonViSo(donViMain, i, raw));
      return;
    }
    setCongThuc(
      congThuc.map((c) =>
        c.id === ctId ? { ...c, donVi: capNhatDonViSo(c.donVi, i, raw) } : c,
      ),
    );
  };

  const themThamSo = () => {
    const check = hopLeTenThamSo(tenMoi, soHang, thamSo, congThuc);
    if (!check.ok) {
      setLoiThamSo(check.lyDo);
      return;
    }
    const gt = parseGiaTriThamSo(giaTriMoi);
    if (gt == null) {
      setLoiThamSo("Giá trị không hợp lệ");
      return;
    }
    idSeq.current += 1;
    setThamSo([
      ...thamSo,
      { id: `ts_${idSeq.current}`, ten: check.ten, giaTri: gt },
    ]);
    setTenMoi("");
    setGiaTriMoi("");
    setLoiThamSo("");
  };

  const suaGiaTriThamSo = (id: string, raw: string) => {
    const filtered = locNhapSoThuc(raw);
    setDraftGt((prev) => ({ ...prev, [id]: filtered }));
    const gt = parseGiaTriThamSo(filtered);
    if (gt == null) return;
    setThamSo(thamSo.map((t) => (t.id === id ? { ...t, giaTri: gt } : t)));
  };

  const blurGiaTriThamSo = (id: string) => {
    setDraftGt((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const xoaThamSo = (id: string) => {
    setThamSo(thamSo.filter((t) => t.id !== id));
    setDraftGt((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const themCongThuc = () => {
    idSeq.current += 1;
    const id = `ct_${idSeq.current}`;
    const n = congThuc.length + 1;
    const moi: CongThucTuyChinh = {
      id,
      ten: `Tính toán phụ ${n}`,
      donVi: [],
    };
    setCongThuc([...congThuc, moi]);
    setCursorMap((m) => ({ ...m, [id]: 0 }));
    setActiveCtId(id);
    setLoiTenCt((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  };

  const suaTenCt = (id: string, raw: string) => {
    capNhatCt(id, { ten: raw });
    const check = hopLeTenCongThuc(raw, soHang, thamSo, congThuc, id);
    setLoiTenCt((m) => {
      if (check.ok || !raw.trim()) {
        if (!(id in m)) return m;
        const next = { ...m };
        delete next[id];
        return next;
      }
      return { ...m, [id]: check.lyDo };
    });
  };

  const xoaCongThuc = (id: string) => {
    setCongThuc(congThuc.filter((c) => c.id !== id));
    setCursorMap((m) => {
      if (!(id in m)) return m;
      const next = { ...m };
      delete next[id];
      return next;
    });
    setLoiTenCt((m) => {
      if (!(id in m)) return m;
      const next = { ...m };
      delete next[id];
      return next;
    });
    setActiveCtId((cur) => (cur === id ? MAIN_CALC_ID : cur));
  };

  const previewHangSo = (ct: CongThucTuyChinh) =>
    hangSoTuDonVi(ct.donVi, soHangPreview, dinhDangVnd);

  return (
    <div className="config-cpsx-upgrade__calc-item-body">
      <div className="config-cpsx-upgrade__calc-params">
        <div className="config-cpsx-upgrade__calc-params-head">
          Tham số tùy chỉnh
        </div>
        <div className="config-cpsx-upgrade__calc-params-form">
          <input
            type="text"
            className="config-inline-input config-cpsx-upgrade__calc-params-ten"
            placeholder="Tên tham số"
            aria-label="Tên tham số"
            value={tenMoi}
            onChange={(e) => {
              setTenMoi(e.target.value);
              if (loiThamSo) setLoiThamSo("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                themThamSo();
              }
            }}
          />
          <span className="config-cpsx-upgrade__calc-params-eq" aria-hidden>
            =
          </span>
          <input
            type="text"
            inputMode="decimal"
            className="config-inline-input config-cpsx-upgrade__calc-params-gt"
            placeholder="Giá trị"
            aria-label="Giá trị tham số"
            value={giaTriMoi}
            onChange={(e) => {
              setGiaTriMoi(locNhapSoThuc(e.target.value));
              if (loiThamSo) setLoiThamSo("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                themThamSo();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-params-add"
            onClick={themThamSo}
            aria-label="Thêm tham số"
          >
            + Thêm
          </button>
        </div>
        {loiThamSo ? (
          <div className="config-cpsx-upgrade__calc-params-loi" role="alert">
            {loiThamSo}
          </div>
        ) : null}
        {thamSo.length > 0 ? (
          <ul className="config-cpsx-upgrade__calc-params-list">
            {thamSo.map((t) => (
              <li key={t.id} className="config-cpsx-upgrade__calc-params-row">
                <span className="config-cpsx-upgrade__calc-params-row-ten">
                  {t.ten}
                </span>
                <span className="config-cpsx-upgrade__calc-params-eq" aria-hidden>
                  =
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="config-inline-input config-cpsx-upgrade__calc-params-gt"
                  aria-label={`Giá trị ${t.ten}`}
                  value={t.id in draftGt ? draftGt[t.id] : String(t.giaTri)}
                  onChange={(e) => suaGiaTriThamSo(t.id, e.target.value)}
                  onBlur={() => blurGiaTriThamSo(t.id)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__calc-params-xoa"
                  onClick={() => xoaThamSo(t.id)}
                  aria-label={`Xóa tham số ${t.ten}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="config-cpsx-upgrade__calc-chips">
        {nutChon.map((nut) => (
          <button
            key={nut.nhan}
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
            onClick={() =>
              nut.loai === "soHang"
                ? themSoHangKey(nut.key)
                : themSoLiteral(nut.s)
            }
            aria-label={`Chèn ${nut.nhan}`}
          >
            {nut.nhan}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
          onClick={themSoThuc}
          aria-label="Chèn ô số thực"
        >
          Số thực
        </button>
        {thamSo.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip config-cpsx-upgrade__calc-chip--custom"
            onClick={() => themSoHangKey(keyThamSo(t.ten))}
            aria-label={`Chèn ${t.ten}`}
          >
            {t.ten}
          </button>
        ))}
        {congThuc.map((ct) => {
          const ten = ct.ten.trim();
          if (!ten || loiTenCt[ct.id]) return null;
          return (
            <button
              key={ct.id}
              type="button"
              className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip config-cpsx-upgrade__calc-chip--ct"
              disabled={targetId === ct.id}
              onClick={() => themSoHangKey(keyThamSo(ten))}
              aria-label={`Chèn tính toán phụ ${ten}`}
            >
              {ten}
            </button>
          );
        })}
      </div>
      <div className="config-cpsx-upgrade__calc-chips config-cpsx-upgrade__calc-chips--ops">
        {dauToan.map((d) => (
          <button
            key={d}
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
            onClick={() => themToanTu(d)}
            aria-label={`Chèn dấu ${d}`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
          onClick={xoaPhiaTruoc}
          aria-label="Xóa 1 thành phần phía trước con trỏ"
        >
          ⌫
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
          onClick={xoaHet}
          aria-label="Xóa hết biểu thức"
        >
          C
        </button>
      </div>

      <div className="config-cpsx-upgrade__calc-ct">
        <div className="config-cpsx-upgrade__calc-ct-head">Tính toán phụ</div>
        {congThuc.length > 0 ? (
          <ul className="config-cpsx-upgrade__calc-ct-list">
            {congThuc.map((ct) => {
              const active = targetId === ct.id;
              const cur = cursorMap[ct.id] ?? ct.donVi.length;
              const gtri = ketQuaCt[ct.id];
              const hang = previewHangSo(ct);
              return (
                <li
                  key={ct.id}
                  className={
                    active
                      ? "config-cpsx-upgrade__calc-ct-row config-cpsx-upgrade__calc-ct-row--active"
                      : "config-cpsx-upgrade__calc-ct-row"
                  }
                  onMouseDown={() => setActiveCtId(ct.id)}
                >
                  <div className="config-cpsx-upgrade__calc-ct-ten-row">
                    <input
                      type="text"
                      className="config-inline-input config-cpsx-upgrade__calc-ct-ten"
                      placeholder="Tên tính toán phụ"
                      aria-label="Tên tính toán phụ"
                      value={ct.ten}
                      size={Math.max(
                        12,
                        (ct.ten || "Tên tính toán phụ").length + 1,
                      )}
                      onFocus={() => setActiveCtId(ct.id)}
                      onChange={(e) => suaTenCt(ct.id, e.target.value)}
                    />
                    <span
                      className="config-cpsx-upgrade__calc-params-eq"
                      aria-hidden
                    >
                      =
                    </span>
                    <div className="config-cpsx-upgrade__calc-tokens config-cpsx-upgrade__calc-tokens--inline">
                      {ct.donVi.map((dv, i) => (
                        <React.Fragment key={i}>
                          <button
                            type="button"
                            className="config-cpsx-upgrade__calc-gap"
                            onClick={() => {
                              setActiveCtId(ct.id);
                              setCursorMap((m) => ({ ...m, [ct.id]: i }));
                            }}
                            aria-label="Đặt con trỏ tại khe này"
                          >
                            {active && cur === i && (
                              <span className="config-cpsx-upgrade__calc-caret" />
                            )}
                          </button>
                          <span
                            className={
                              dv.loai === "so"
                                ? "config-cpsx-upgrade__calc-token config-cpsx-upgrade__calc-token--so"
                                : "config-cpsx-upgrade__calc-token"
                            }
                            onClick={() => {
                              setActiveCtId(ct.id);
                              setCursorMap((m) => ({ ...m, [ct.id]: i + 1 }));
                            }}
                          >
                            {dv.loai === "so" ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                className="config-cpsx-upgrade__calc-token-input"
                                aria-label="Số thực"
                                placeholder="0"
                                value={dv.giaTri}
                                size={Math.max(2, dv.giaTri.length || 1)}
                                ref={(el) => {
                                  const ref = soMoiRef.current;
                                  if (
                                    el &&
                                    ref &&
                                    ref.id === ct.id &&
                                    ref.i === i
                                  ) {
                                    el.focus();
                                    soMoiRef.current = null;
                                  }
                                }}
                                onChange={(e) =>
                                  suaSo(ct.id, i, e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                onFocus={() => {
                                  setActiveCtId(ct.id);
                                  setCursorMap((m) => ({
                                    ...m,
                                    [ct.id]: i + 1,
                                  }));
                                }}
                              />
                            ) : (
                              <span className="config-cpsx-upgrade__calc-token-text">
                                {nhanDonVi(dv, tenMap)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="config-cpsx-upgrade__calc-token-del"
                              onClick={(e) => {
                                e.stopPropagation();
                                xoaTai(ct.id, i);
                              }}
                              aria-label={
                                dv.loai === "so"
                                  ? "Xóa ô số"
                                  : `Xóa ${nhanDonVi(dv, tenMap)}`
                              }
                            >
                              ×
                            </button>
                          </span>
                        </React.Fragment>
                      ))}
                      <button
                        type="button"
                        className="config-cpsx-upgrade__calc-gap"
                        onClick={() => {
                          setActiveCtId(ct.id);
                          setCursorMap((m) => ({
                            ...m,
                            [ct.id]: ct.donVi.length,
                          }));
                        }}
                        aria-label="Đặt con trỏ ở cuối"
                      >
                        {active && cur === ct.donVi.length && (
                          <span className="config-cpsx-upgrade__calc-caret" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline config-cpsx-upgrade__calc-params-xoa"
                      onClick={() => xoaCongThuc(ct.id)}
                      aria-label={`Xóa tính toán phụ ${ct.ten || ct.id}`}
                    >
                      ×
                    </button>
                  </div>
                  {loiTenCt[ct.id] ? (
                    <div
                      className="config-cpsx-upgrade__calc-ct-loi"
                      role="alert"
                    >
                      {loiTenCt[ct.id]}
                    </div>
                  ) : null}
                  <div className="config-cpsx-upgrade__calc-ct-kq">
                    <span className="config-cpsx-upgrade__calc-so">
                      {hang == null ? "—" : hang || "—"}
                    </span>
                    <strong className="config-cpsx-upgrade__calc-ket-qua">
                      {gtri == null
                        ? "—"
                        : `${dinhDangVnd(gtri)} ₫/phút`}
                    </strong>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="config-cpsx-upgrade__calc-ct-foot">
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-ct-add"
            onClick={themCongThuc}
          >
            + Thêm tính toán phụ
          </button>
        </div>
      </div>

      <div className="config-cpsx-upgrade__calc-rows">
        <div
          className={
            targetId === MAIN_CALC_ID
              ? "config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--tokens config-cpsx-upgrade__calc-row--main-active"
              : "config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--tokens"
          }
          onMouseDown={() => setActiveCtId(MAIN_CALC_ID)}
        >
          <span className="config-cpsx-upgrade__calc-label">
            Lương CN mỗi phút =
          </span>
          <div className="config-cpsx-upgrade__calc-tokens">
            {donViMain.map((dv, i) => (
              <React.Fragment key={i}>
                <button
                  type="button"
                  className="config-cpsx-upgrade__calc-gap"
                  onClick={() => {
                    setActiveCtId(MAIN_CALC_ID);
                    setCursorMap((m) => ({ ...m, [MAIN_CALC_ID]: i }));
                  }}
                  aria-label="Đặt con trỏ tại khe này"
                >
                  {targetId === MAIN_CALC_ID && cursor === i && (
                    <span className="config-cpsx-upgrade__calc-caret" />
                  )}
                </button>
                <span
                  className={
                    dv.loai === "so"
                      ? "config-cpsx-upgrade__calc-token config-cpsx-upgrade__calc-token--so"
                      : "config-cpsx-upgrade__calc-token"
                  }
                  onClick={() => {
                    setActiveCtId(MAIN_CALC_ID);
                    setCursorMap((m) => ({ ...m, [MAIN_CALC_ID]: i + 1 }));
                  }}
                >
                  {dv.loai === "so" ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="config-cpsx-upgrade__calc-token-input"
                      aria-label="Số thực"
                      placeholder="0"
                      value={dv.giaTri}
                      size={Math.max(2, dv.giaTri.length || 1)}
                      ref={(el) => {
                        const ref = soMoiRef.current;
                        if (
                          el &&
                          ref &&
                          ref.id === MAIN_CALC_ID &&
                          ref.i === i
                        ) {
                          el.focus();
                          soMoiRef.current = null;
                        }
                      }}
                      onChange={(e) =>
                        suaSo(MAIN_CALC_ID, i, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => {
                        setActiveCtId(MAIN_CALC_ID);
                        setCursorMap((m) => ({
                          ...m,
                          [MAIN_CALC_ID]: i + 1,
                        }));
                      }}
                    />
                  ) : (
                    <span className="config-cpsx-upgrade__calc-token-text">
                      {nhanDonVi(dv, tenMap)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="config-cpsx-upgrade__calc-token-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      xoaTai(MAIN_CALC_ID, i);
                    }}
                    aria-label={
                      dv.loai === "so"
                        ? "Xóa ô số"
                        : `Xóa ${nhanDonVi(dv, tenMap)}`
                    }
                  >
                    ×
                  </button>
                </span>
              </React.Fragment>
            ))}
            <button
              type="button"
              className="config-cpsx-upgrade__calc-gap"
              onClick={() => {
                setActiveCtId(MAIN_CALC_ID);
                setCursorMap((m) => ({
                  ...m,
                  [MAIN_CALC_ID]: donViMain.length,
                }));
              }}
              aria-label="Đặt con trỏ ở cuối"
            >
              {targetId === MAIN_CALC_ID &&
                cursor === donViMain.length && (
                  <span className="config-cpsx-upgrade__calc-caret" />
                )}
            </button>
          </div>
        </div>
        <div className="config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--eq">
          <span className="config-cpsx-upgrade__calc-label">=</span>
          <span className="config-cpsx-upgrade__calc-so">
            {donViMain.length === 0 ? "—" : hangSoMain || "—"}
          </span>
        </div>
        <div className="config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--eq">
          <span className="config-cpsx-upgrade__calc-label">=</span>
          <strong className="config-cpsx-upgrade__calc-ket-qua">
            {giaTriMain == null
              ? "—"
              : `${dinhDangVnd(giaTriMain)} ₫/phút`}
          </strong>
        </div>
      </div>
    </div>
  );
}

function MayTui({
  giaTri,
  capNhat,
}: {
  giaTri: CpsxUpgradeLaborTui;
  capNhat: (patch: Partial<CpsxUpgradeLaborTui>) => void;
}) {
  const [openCongThucMau, setOpenCongThucMau] = React.useState(true);
  const tongL = tongLuong(giaTri.wages);
  const soCN = soCongNhanTui(giaTri.wages);
  const tbCa = luongTbTui(giaTri.wages, giaTri.peoplePerShift);
  const tangCa = tangCaTui(giaTri.wages, giaTri.otFactor, giaTri.tyLeTangCa, giaTri.otHours);
  const tienComSang = tienComSangTui(giaTri.mealMorning, soCN);
  const tienComToi = tienComToiTui(giaTri.mealEvening, soCN);
  const tinh = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
    soCongNhanTui(giaTri.wages),
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );
  const tinhMoiMay = luongMoiPhutTuiAp(tinh, null);
  const apDungGia = luongMoiPhutTuiAp(tinh, giaTri.roundedPerMin);

  const suaLuong = (idx: number, val: string) => {
    const next = [...giaTri.wages];
    next[idx] = docSoVnd(val);
    capNhat({ wages: next });
  };
  const themDong = () => {
    capNhat({ wages: [...giaTri.wages, 0] });
  };
  const xoaDong = (idx: number) => {
    if (giaTri.wages.length <= 1) return;
    capNhat({ wages: giaTri.wages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num" style={{ width: 48 }}>
                STT
              </th>
              <th className="num">Lương (₫)</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {giaTri.wages.map((w, idx) => (
              <tr key={idx}>
                <td className="num config-cpsx-upgrade__lock">{idx + 1}</td>
                <td className="num">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="config-inline-input"
                    aria-label={`Lương dòng ${idx + 1}`}
                    value={w === 0 ? "" : dinhDangVnd(w)}
                    placeholder="0"
                    onChange={(e) => suaLuong(idx, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                    disabled={giaTri.wages.length <= 1}
                    onClick={() => xoaDong(idx)}
                    aria-label={`Xóa dòng ${idx + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
        onClick={themDong}
      >
        + Thêm dòng
      </button>

      <div className="config-cpsx-upgrade__meta-grid config-cpsx-upgrade__meta-grid--two">
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Tổng lương</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tongL)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số CN (lương &gt; 0)
          </span>
          <strong className="config-cpsx-upgrade__meta-value">{soCN}</strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Lương TB / ca</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tbCa)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số lượng người / máy
          </span>
          <strong className="config-cpsx-upgrade__meta-value">
            {giaTri.peoplePerShift}
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số máy hoạt động / ngày
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label="Số máy hoạt động mỗi ngày — máy làm túi"
            min={1}
            step={1}
            value={giaTri.machinesPerDay}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                machinesPerDay:
                  Number.isFinite(v) && v > 0
                    ? Math.floor(v)
                    : giaTri.machinesPerDay,
              });
            }}
          />
        </div>
      </div>

      <div className="config-cpsx-upgrade__formula-panel">
        <div className="config-cpsx-upgrade__formula-panel-head">
          <span className="config-cpsx-upgrade__formula-panel-title">
            Công thức mẫu
          </span>
          <strong className="config-cpsx-upgrade__formula-panel-tomtat">
            {dinhDangVnd(tinhMoiMay)} ₫/phút
          </strong>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenCongThucMau((o) => !o)}
            aria-expanded={openCongThucMau}
            aria-label={
              openCongThucMau
                ? "Thu gọn công thức mẫu"
                : "Mở rộng công thức mẫu"
            }
          >
            {openCongThucMau ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openCongThucMau ? (
          <div className="config-cpsx-upgrade__formulas config-cpsx-upgrade__formulas--in-panel">
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tiền cơm ca sáng =
              </span>
              <NumberVndInput
                className="config-inline-input config-cpsx-upgrade__formula-input"
                ariaLabel="Cơm sáng mỗi người"
                value={giaTri.mealMorning}
                onChange={(v) => capNhat({ mealMorning: v })}
              />
              <span className="config-cpsx-upgrade__formula-op">
                × {soCN} / 2 =
              </span>
              <strong className="config-cpsx-upgrade__formula-result">
                {dinhDangVnd(tienComSang)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tiền cơm ca tối =
              </span>
              <NumberVndInput
                className="config-inline-input config-cpsx-upgrade__formula-input"
                ariaLabel="Cơm tối mỗi người"
                value={giaTri.mealEvening}
                onChange={(v) => capNhat({ mealEvening: v })}
              />
              <span className="config-cpsx-upgrade__formula-op">
                × {soCN} / 2 =
              </span>
              <strong className="config-cpsx-upgrade__formula-result">
                {dinhDangVnd(tienComToi)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Tổng tiền tăng ca n giờ = (Tổng lương ÷ {SO_GIO_MOT_CA} × n) ×
                Hệ số tăng ca × Tỉ lệ tăng ca
              </span>
            </div>
            <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
              <strong className="config-cpsx-upgrade__formula-result">
                ({dinhDangVnd(tongL)} ÷ {SO_GIO_MOT_CA} ×{" "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Số giờ tăng ca"
                  min={0}
                  step={0.5}
                  value={giaTri.otHours}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      otHours:
                        Number.isFinite(v) && v >= 0 ? v : giaTri.otHours,
                    });
                  }}
                />
                {") × "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Hệ số tăng ca"
                  min={0}
                  step={0.1}
                  value={giaTri.otFactor}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      otFactor:
                        Number.isFinite(v) && v > 0 ? v : giaTri.otFactor,
                    });
                  }}
                />{" "}
                ×{" "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Tỉ lệ tăng ca (%)"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(giaTri.tyLeTangCa * 100)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      tyLeTangCa:
                        Number.isFinite(v) && v >= 0 && v <= 100
                          ? v / 100
                          : giaTri.tyLeTangCa,
                    });
                  }}
                />{" "}
                % = {dinhDangVnd(tangCa)} ₫
              </strong>
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Số lượng người / máy
              </span>
              <input
                type="number"
                className="config-inline-input config-cpsx-upgrade__formula-input"
                aria-label="Số lượng người mỗi máy"
                min={1}
                step={1}
                value={giaTri.peoplePerShift}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  capNhat({
                    peoplePerShift:
                      Number.isFinite(v) && v > 0
                        ? Math.floor(v)
                        : giaTri.peoplePerShift,
                  });
                }}
              />
            </div>
            <div className="config-cpsx-upgrade__formula-row">
              <span className="config-cpsx-upgrade__formula-label">
                Lương CN mỗi phút = (Tổng lương + Tăng ca + Cơm sáng + Cơm
                tối) ÷ Số giờ/ngày ÷ 60
              </span>
            </div>
            <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
              <strong className="config-cpsx-upgrade__formula-result">
                ({dinhDangVnd(tongL)} + {dinhDangVnd(tangCa)} +{" "}
                {dinhDangVnd(tienComSang)} + {dinhDangVnd(tienComToi)}) ÷{" "}
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  aria-label="Giờ máy hoạt động mỗi ngày — máy làm túi"
                  min={1}
                  max={24}
                  step={1}
                  value={giaTri.hoursPerDay}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    capNhat({
                      hoursPerDay:
                        Number.isFinite(v) && v > 0
                          ? Math.min(24, v)
                          : giaTri.hoursPerDay,
                    });
                  }}
                />{" "}
                ÷ 60 = {dinhDangVnd(tinhMoiMay)} ₫/phút
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="config-cpsx-upgrade__applied">
        <label>Lương túi đang áp dụng</label>
        <strong className="config-cpsx-upgrade__applied-value">
          {dinhDangVnd(apDungGia)}
        </strong>
        <span className="config-cpsx-upgrade__unit">₫/phút</span>
      </div>

      <MayTinhThamKhaoTui
        giaTri={giaTri}
        giaMau={tinhMoiMay}
        radioName="cpsx-luong-ap-tui"
        onApDung={(n) =>
          capNhat({ roundedPerMin: n != null && n > 0 ? Math.round(n) : null })
        }
        onMayTinhChange={(mayTinh) => capNhat({ mayTinh })}
      />
    </div>
  );
}
