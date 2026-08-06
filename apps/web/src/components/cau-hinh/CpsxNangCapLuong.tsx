"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_LABOR } from "../../lib/data";
import type {
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
} from "../../lib/types";
import {
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongTbTui,
  soCongNhanTui,
  soNguoiMoiCa1May,
  tangCaTheoTongLuong,
  tangCaTui,
  tienComMoiMay,
  tienComSangTui,
  tienComToiTui,
  tongLuong,
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

export default function CpsxNangCapLuong() {
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
    print: true,
    laminate: false,
    slit: false,
    bag: false,
  });
  const toggle = (key: MayKey) =>
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  const tomTat1May = (key: May1Key) => {
    const g = state[key];
    const v = luongMoiPhutTinh(
      g.wages,
      g.hoursPerDay,
      g.mealMorning,
      g.mealEvening,
      g.otFactor,
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
  }> = [
    {
      key: "print",
      title: "Lương công nhân máy in",
      summary: tomTat1May("print"),
      body: (
        <May1May
          tenMay="Máy in"
          giaTri={state.print}
          capNhat={(patch) => capNhat1May("print", patch)}
        />
      ),
    },
    {
      key: "laminate",
      title: "Lương công nhân máy ghép",
      summary: tomTat1May("laminate"),
      body: (
        <May1May
          tenMay="Máy ghép"
          giaTri={state.laminate}
          capNhat={(patch) => capNhat1May("laminate", patch)}
        />
      ),
    },
    {
      key: "slit",
      title: "Lương công nhân máy chia",
      summary: tomTat1May("slit"),
      body: (
        <May1May
          tenMay="Máy chia"
          giaTri={state.slit}
          capNhat={(patch) => capNhat1May("slit", patch)}
        />
      ),
    },
    {
      key: "bag",
      title: "Lương công nhân máy làm túi",
      summary: tomTatTui(),
      body: <MayTui giaTri={state.bag} capNhat={capNhatTui} />,
    },
  ];

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
              <div id={`cpsx-luong-body-${key}`}>{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function May1May({
  tenMay,
  giaTri,
  capNhat,
}: {
  tenMay: string;
  giaTri: CpsxUpgradeLabor1May;
  capNhat: (patch: Partial<CpsxUpgradeLabor1May>) => void;
}) {
  const soCN = giaTri.wages.length;
  const soNguoiMoiCa = soNguoiMoiCa1May(giaTri.wages, giaTri.shiftCount);
  const tongL = tongLuong(giaTri.wages);
  const tienComSang = (Number(giaTri.mealMorning) || 0) * soCN / 2;
  const tienComToi = (Number(giaTri.mealEvening) || 0) * soCN / 2;
  const tongCom = tienComMoiMay(giaTri.mealMorning, giaTri.mealEvening, soCN);
  const tangCa = tangCaTheoTongLuong(giaTri.wages, giaTri.otFactor);
  const ketQua = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
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
          <strong className="config-cpsx-upgrade__meta-value">
            {giaTri.shiftCount}
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">SL người / ca</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {soNguoiMoiCa}{" "}
            <small className="config-cpsx-upgrade__meta-hint">(tự tính)</small>
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__formulas">
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
            Tăng ca = Tổng lương ×
          </span>
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
          />
          <span className="config-cpsx-upgrade__formula-op">÷ 2 =</span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tangCa)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Lương nhân công mỗi phút =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} + {dinhDangVnd(tongCom)} +{" "}
            {dinhDangVnd(tangCa)}) ÷{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
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
            />{" "}
            ÷ 60 = {dinhDangVnd(ketQua)} ₫/phút
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__applied">
        <label>{tenMay} / phút</label>
        <strong className="config-cpsx-upgrade__applied-value">
          {dinhDangVnd(ketQua)}
        </strong>
        <span className="config-cpsx-upgrade__unit">₫/phút</span>
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
  const tongL = tongLuong(giaTri.wages);
  const soCN = soCongNhanTui(giaTri.wages);
  const tbCa = luongTbTui(giaTri.wages, giaTri.peoplePerShift);
  const tangCa = tangCaTui(giaTri.wages, giaTri.otFactor);
  const tienComSang = tienComSangTui(giaTri.mealMorning, soCN);
  const tienComToi = tienComToiTui(giaTri.mealEvening, soCN);
  const tongCom = tienComMoiMay(giaTri.mealMorning, giaTri.mealEvening, soCN);
  const tinh = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
    soCongNhanTui(giaTri.wages),
  );
  const apDungGia = luongMoiPhutAp(tinh, giaTri.roundedPerMin);

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
      </div>

      <div className="config-cpsx-upgrade__formulas">
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
            Tăng ca = Tổng lương ×
          </span>
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
                otFactor: Number.isFinite(v) && v > 0 ? v : giaTri.otFactor,
              });
            }}
          />
          <span className="config-cpsx-upgrade__formula-op">÷ 2 =</span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tangCa)} ₫
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
            Lương nhân công mỗi phút =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} + {dinhDangVnd(tongCom)} +{" "}
            {dinhDangVnd(tangCa)}) ÷{" "}
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
            ÷ 60 = {dinhDangVnd(tinh)} ₫/phút
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__sources">
        <div className="config-cpsx-upgrade__source-row">
          <span className="config-cpsx-upgrade__source-label">Giá tính ra</span>
          <strong className="config-cpsx-upgrade__source-value">
            {dinhDangVnd(tinh)} ₫/phút
          </strong>
        </div>
        <div className="config-cpsx-upgrade__source-row">
          <span className="config-cpsx-upgrade__source-label">
            Giá làm tròn áp dụng
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="config-inline-input config-cpsx-upgrade__manual"
            aria-label="Giá làm tròn áp dụng"
            value={
              giaTri.roundedPerMin == null
                ? ""
                : dinhDangVnd(giaTri.roundedPerMin)
            }
            placeholder={dinhDangVnd(tinh)}
            onChange={(e) => {
              const v = docSoVnd(e.target.value);
              capNhat({ roundedPerMin: v > 0 ? v : null });
            }}
          />
        </div>
      </div>

      <div className="config-cpsx-upgrade__applied">
        <label>Lương túi đang áp dụng</label>
        <strong className="config-cpsx-upgrade__applied-value">
          {dinhDangVnd(apDungGia)}
        </strong>
        <span className="config-cpsx-upgrade__unit">₫/phút</span>
      </div>
    </div>
  );
}
