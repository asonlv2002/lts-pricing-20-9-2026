"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import {
  DEFAULT_CPSX_UPGRADE_ELECTRIC,
} from "../../lib/data";
import type {
  CpsxElectricMachine,
  CpsxUpgradeElectric,
  ElectricPriceSource,
  ElectricTimeSlot,
} from "../../lib/types";
import {
  chuanHoaCpsxUpgradeElectric,
  dinhDangGioMask,
  dongBoGiaDangApSauSuaSlot,
  tinhDienMoiPhut,
  tinhGiaDienTbCong,
  tinhGiaDienTbTrongSo,
  tinhSoGioTuKhungGio,
} from "../../lib/cpsx-upgrade-electric";

type MayKey = keyof CpsxUpgradeElectric["machines"];

const MAY_ROWS: { key: MayKey; label: string }[] = [
  { key: "print", label: "Máy in" },
  { key: "laminate", label: "Máy ghép" },
  { key: "slit", label: "Máy chia" },
  { key: "bag", label: "Máy làm túi" },
];

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangGio(n: number) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function docSoVnd(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

/** Khung có Từ/Đến hợp lệ → thời lượng tự tính */
function gioTuKhung(slot: ElectricTimeSlot): number | null {
  return tinhSoGioTuKhungGio(slot.start, slot.end);
}

export default function CpsxNangCapDien({
  coQuyenKhungGio = true,
  coQuyenDienMay = true,
}: {
  coQuyenKhungGio?: boolean;
  coQuyenDienMay?: boolean;
}) {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const state = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeElectric(
        hangSo.cpsxUpgradeElectric,
        DEFAULT_CPSX_UPGRADE_ELECTRIC,
      ),
    [hangSo.cpsxUpgradeElectric],
  );

  const luu = (next: CpsxUpgradeElectric) => {
    capNhatHangSo("cpsxUpgradeElectric", next as never);
  };

  const tbCong = tinhGiaDienTbCong(state.slots);
  const tbTrongSo = tinhGiaDienTbTrongSo(state.slots);
  const daAp =
    state.appliedPricePerKwh != null && Number.isFinite(state.appliedPricePerKwh);

  const capNhatSlots = (slots: ElectricTimeSlot[]) => {
    const next = dongBoGiaDangApSauSuaSlot({ ...state, slots });
    luu(next);
  };

  const suaSlot = (id: string, patch: Partial<ElectricTimeSlot>) => {
    capNhatSlots(
      state.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const xoaSlot = (id: string) => {
    if (state.slots.length <= 1) return;
    capNhatSlots(state.slots.filter((s) => s.id !== id));
  };

  const themSlot = () => {
    const n = state.slots.length + 1;
    // id = max slot hiện có + 1 — thuần, không dùng Date.now()
    const maxId = state.slots.reduce((mx, s) => {
      const m = /^slot_(\d+)$/.exec(s.id);
      return m ? Math.max(mx, Number(m[1])) : mx;
    }, 0);
    capNhatSlots([
      ...state.slots,
      {
        id: `slot_${maxId + 1}`,
        label: `Khung ${n}`,
        start: "07:00",
        end: "17:00",
        hours: 10,
        pricePerKwh: 4000,
      },
    ]);
  };

  const apDung = (source: Exclude<ElectricPriceSource, null>, price: number) => {
    if (!Number.isFinite(price) || price < 0) return;
    luu({
      ...state,
      appliedSource: source,
      appliedPricePerKwh: price,
    });
  };

  const suaGiaDangAp = (raw: string) => {
    const v = docSoVnd(raw);
    luu({
      ...state,
      appliedSource: "manual",
      appliedPricePerKwh: v > 0 ? v : 0,
    });
  };

  const suaMay = (key: MayKey, patch: Partial<CpsxElectricMachine>) => {
    const cur = state.machines[key];
    luu({
      ...state,
      machines: {
        ...state.machines,
        [key]: {
          powerKw:
            patch.powerKw != null && Number.isFinite(patch.powerKw) && patch.powerKw > 0
              ? patch.powerKw
              : cur.powerKw,
          efficiency:
            patch.efficiency != null &&
            Number.isFinite(patch.efficiency) &&
            patch.efficiency > 0
              ? patch.efficiency
              : cur.efficiency,
        },
      },
    });
  };

  const [manualDraft, setManualDraft] = React.useState(() =>
    dinhDangVnd(tbCong),
  );
  const [openKhungGio, setOpenKhungGio] = React.useState(false);
  const [openMay, setOpenMay] = React.useState(false);

  React.useEffect(() => {
    if (state.appliedSource !== "manual") {
      setManualDraft(dinhDangVnd(tbCong));
    }
  }, [tbCong, state.appliedSource]);

  const giaDangApLabel = daAp
    ? `${dinhDangVnd(state.appliedPricePerKwh!)} ₫/kWh`
    : "—";

  return (
    <div className="config-cpsx-upgrade">
      {coQuyenKhungGio && (
        <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Giá điện theo khung giờ</span>
          <span className="config-cpsx-upgrade__head-meta">
            {state.slots.length} khung · {giaDangApLabel}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenKhungGio((o) => !o)}
            aria-expanded={openKhungGio}
            aria-controls="cpsx-dien-khung-gio"
            aria-label={openKhungGio ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openKhungGio ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>

        {openKhungGio && (
          <div id="cpsx-dien-khung-gio" className="config-cpsx-upgrade__panel">
            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    <th className="num">Thời lượng (giờ)</th>
                    <th className="num">Giá (₫/kWh)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.slots.map((slot) => {
                    const gio = gioTuKhung(slot);
                    return (
                      <tr key={slot.id}>
                        <td>
                          <span className="config-cpsx-upgrade__khung-gio">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              className="config-inline-input config-cpsx-upgrade__khung-input"
                              placeholder="HH:MM"
                              aria-label="Giờ bắt đầu"
                              value={dinhDangGioMask(slot.start ?? "")}
                              onChange={(e) =>
                                suaSlot(slot.id, {
                                  start: dinhDangGioMask(e.target.value),
                                })
                              }
                            />
                            <span className="config-cpsx-upgrade__khung-nghi">–</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              className="config-inline-input config-cpsx-upgrade__khung-input"
                              placeholder="HH:MM"
                              aria-label="Giờ kết thúc"
                              value={dinhDangGioMask(slot.end ?? "")}
                              onChange={(e) =>
                                suaSlot(slot.id, {
                                  end: dinhDangGioMask(e.target.value),
                                })
                              }
                            />
                          </span>
                        </td>
                        <td className="num">
                          {gio != null ? (
                            <span className="config-cpsx-upgrade__khung-gio-tinh">
                              {dinhDangGio(gio)} giờ
                            </span>
                          ) : (
                            <input
                              type="number"
                              className="config-inline-input"
                              aria-label="Thời lượng giờ"
                              min={0}
                              step={1}
                              value={slot.hours}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                suaSlot(slot.id, {
                                  hours: Number.isFinite(v) && v >= 0 ? v : 0,
                                });
                              }}
                            />
                          )}
                        </td>
                        <td className="num">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="config-inline-input"
                            aria-label="Giá điện kWh"
                            value={dinhDangVnd(slot.pricePerKwh)}
                            onChange={(e) =>
                              suaSlot(slot.id, {
                                pricePerKwh: docSoVnd(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                            disabled={state.slots.length <= 1}
                            onClick={() => xoaSlot(slot.id)}
                            aria-label="Xóa khung giờ"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="config-cpsx-upgrade__add-row">
                    <td colSpan={4}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
                        onClick={themSlot}
                      >
                        + Thêm khung giờ
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <fieldset className="config-cpsx-upgrade__sources">
              <legend className="config-cpsx-upgrade__sources-legend">
                Chọn giá áp dụng
              </legend>
              <label
                className={`config-cpsx-upgrade__source-opt${
                  (state.appliedSource ?? "average") === "average"
                    ? " is-selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-dien-source"
                  checked={(state.appliedSource ?? "average") === "average"}
                  onChange={() => apDung("average", tbCong)}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá điện trung bình cộng
                </span>
                <strong className="config-cpsx-upgrade__source-value">
                  {dinhDangVnd(tbCong)} ₫/kWh
                </strong>
              </label>
              <label
                className={`config-cpsx-upgrade__source-opt${
                  state.appliedSource === "weighted" ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-dien-source"
                  checked={state.appliedSource === "weighted"}
                  onChange={() => apDung("weighted", tbTrongSo)}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá điện trung bình trọng số
                </span>
                <strong className="config-cpsx-upgrade__source-value">
                  {dinhDangVnd(tbTrongSo)} ₫/kWh
                </strong>
              </label>
              <label
                className={`config-cpsx-upgrade__source-opt${
                  state.appliedSource === "manual" ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-dien-source"
                  checked={state.appliedSource === "manual"}
                  onChange={() => {
                    const v = docSoVnd(manualDraft) || tbCong;
                    if (v <= 0) return;
                    apDung("manual", v);
                  }}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá điện nhập tay
                </span>
                {state.appliedSource === "manual" ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input config-cpsx-upgrade__manual"
                      aria-label="Giá điện nhập tay"
                      placeholder="₫/kWh"
                      value={
                        daAp
                          ? dinhDangVnd(state.appliedPricePerKwh!)
                          : manualDraft
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        setManualDraft(raw);
                        suaGiaDangAp(raw);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="config-cpsx-upgrade__unit">₫/kWh</span>
                  </>
                ) : (
                  <strong className="config-cpsx-upgrade__source-value">
                    {manualDraft || dinhDangVnd(tbCong)} ₫/kWh
                  </strong>
                )}
              </label>
            </fieldset>
          </div>
        )}
        </div>
      )}

      {coQuyenDienMay && (
        <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Điện / phút theo máy</span>
          <span className="config-cpsx-upgrade__head-meta">
            {MAY_ROWS.length} máy
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenMay((o) => !o)}
            aria-expanded={openMay}
            aria-controls="cpsx-dien-may"
            aria-label={openMay ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openMay ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>

        {openMay && (
          <div id="cpsx-dien-may" className="config-cpsx-upgrade__panel">
            <p className="config-note">
              (Công suất × Hiệu suất × Giá điện) ÷ 60. Giá điện = ô đang áp dụng
              (chung 4 máy).
            </p>

            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th>Máy</th>
                    <th className="num">Công suất (kW)</th>
                    <th className="num">Hiệu suất (%)</th>
                    <th className="num">Giá điện</th>
                    <th className="num">₫/phút</th>
                  </tr>
                </thead>
                <tbody>
                  {MAY_ROWS.map(({ key, label }) => {
                    const m = state.machines[key];
                    const perMin = tinhDienMoiPhut(
                      m.powerKw,
                      m.efficiency,
                      state.appliedPricePerKwh,
                    );
                    return (
                      <tr key={key}>
                        <td>{label}</td>
                        <td className="num">
                          <input
                            type="number"
                            className="config-inline-input"
                            aria-label={`Công suất ${label}`}
                            min={0}
                            step={1}
                            value={m.powerKw}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              suaMay(key, {
                                powerKw: Number.isFinite(v) ? v : m.powerKw,
                              });
                            }}
                          />
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            className="config-inline-input"
                            aria-label={`Hiệu suất ${label}`}
                            min={0}
                            max={100}
                            step={0.1}
                            value={parseFloat((m.efficiency * 100).toFixed(2))}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              suaMay(key, {
                                efficiency:
                                  Number.isFinite(v) && v > 0
                                    ? v / 100
                                    : m.efficiency,
                              });
                            }}
                          />
                        </td>
                        <td className="num config-cpsx-upgrade__lock">
                          {daAp
                            ? `${dinhDangVnd(state.appliedPricePerKwh!)} ₫`
                            : "—"}
                        </td>
                        <td className="num highlight">
                          {perMin != null
                            ? `${dinhDangVnd(perMin)} ₫/phút`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
