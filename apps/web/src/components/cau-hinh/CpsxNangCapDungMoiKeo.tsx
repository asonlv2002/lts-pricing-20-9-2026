"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import type { KeoRow, KeoTable, SolventAdhesiveRow } from "../../lib/types";
import {
  chuanHoaBangDungMoiKeo,
  chuanHoaKeoTable,
  dongBoGiaKeoSauSuaRow,
  tinhGiaKeoTbCong,
  tinhGiaKeoTbTrongSo,
} from "../../lib/cpsx-upgrade-ink";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN");
}

function docSo(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

/** ⓘ tooltip ghi chú ứng dụng (DM_OPP/DM_PET/DM_EA/KEO) */
function TooltipGhiChu({ ghiChu }: { ghiChu: string }) {
  if (!ghiChu) return null;
  return (
    <span
      className="config-cpsx-upgrade__tooltip"
      title={ghiChu}
      aria-label={ghiChu}
    >
      ⓘ
    </span>
  );
}

interface BangRowProps {
  row: SolventAdhesiveRow;
  index: number;
  canXoa: boolean;
  suaRow: (i: number, patch: Partial<SolventAdhesiveRow>) => void;
  xoaRow: (i: number) => void;
  /** Bảng keo: hiện cột SL dùng */
  slDung?: number;
  suaSlDung?: (i: number, v: number) => void;
}

function DongVatTu({ row, index, canXoa, suaRow, xoaRow, slDung, suaSlDung }: BangRowProps) {
  return (
    <tr key={`${index}-${row.ma}`}>
      <td className="num config-cpsx-upgrade__lock">{index + 1}</td>
      <td>
        <input
          type="text"
          className="config-inline-input"
          aria-label="Mã vật tư"
          value={row.ma}
          onChange={(e) => suaRow(index, { ma: e.target.value })}
        />
      </td>
      <td>
        <span className="config-cpsx-upgrade__ten-vat-tu">
          <input
            type="text"
            className="config-inline-input"
            aria-label="Tên vật tư"
            value={row.ten}
            onChange={(e) => suaRow(index, { ten: e.target.value })}
          />
          <TooltipGhiChu ghiChu={row.ghiChu} />
        </span>
      </td>
      <td>
        <input
          type="text"
          className="config-inline-input"
          aria-label="Đơn vị tính"
          value={row.dvt}
          onChange={(e) => suaRow(index, { dvt: e.target.value })}
        />
      </td>
      <td className="num">
        <input
          type="text"
          inputMode="numeric"
          className="config-inline-input"
          aria-label="Đơn giá"
          value={dinhDangVnd(row.donGia)}
          onChange={(e) => suaRow(index, { donGia: docSo(e.target.value) })}
        />
      </td>
      {slDung != null && suaSlDung && (
        <td className="num">
          <input
            type="text"
            inputMode="numeric"
            className="config-inline-input"
            aria-label="SL dùng"
            value={dinhDangSo(slDung)}
            onChange={(e) => suaSlDung(index, docSo(e.target.value))}
          />
        </td>
      )}
      <td>
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__del"
          disabled={!canXoa}
          onClick={() => xoaRow(index)}
          aria-label="Xóa dòng"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

export default function CpsxNangCapDungMoiKeo() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const state = React.useMemo(
    () =>
      chuanHoaBangDungMoiKeo(
        hangSo.cpsxUpgradeInk?.solventAdhesive,
        DEFAULT_CPSX_UPGRADE_INK.solventAdhesive,
      ),
    [hangSo.cpsxUpgradeInk],
  );

  const [openDm, setOpenDm] = React.useState(true);
  const [openKeo, setOpenKeo] = React.useState(true);

  const [manualDraft, setManualDraft] = React.useState(() =>
    dinhDangVnd(tinhGiaKeoTbCong(state.keo.rows)),
  );

  React.useEffect(() => {
    if (state.keo.appliedSource !== "manual") {
      setManualDraft(dinhDangVnd(tinhGiaKeoTbCong(state.keo.rows)));
    }
  }, [state.keo.rows, state.keo.appliedSource]);

  const luu = (next: typeof state) => {
    const cur = hangSo.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK;
    capNhatHangSo("cpsxUpgradeInk", {
      ...cur,
      solventAdhesive: next,
    } as never);
  };

  // ── Bảng dung môi ────────────────────────────────────────────────────────
  const suaDmRow = (i: number, patch: Partial<SolventAdhesiveRow>) => {
    luu({
      ...state,
      dungMoi: {
        rows: state.dungMoi.rows.map((r, idx) =>
          idx === i ? { ...r, ...patch } : r,
        ),
      },
    });
  };
  const xoaDmRow = (i: number) => {
    if (state.dungMoi.rows.length <= 1) return;
    luu({
      ...state,
      dungMoi: { rows: state.dungMoi.rows.filter((_, idx) => idx !== i) },
    });
  };
  const themDmRow = () => {
    const n = state.dungMoi.rows.length + 1;
    luu({
      ...state,
      dungMoi: {
        rows: [
          ...state.dungMoi.rows,
          { ma: `NEW_${n}`, ten: "", dvt: "kg", donGia: 0, ghiChu: "" },
        ],
      },
    });
  };

  // ── Bảng keo ghép ────────────────────────────────────────────────────────
  const suaKeoRow = (i: number, patch: Partial<KeoRow>) => {
    const next = dongBoGiaKeoSauSuaRow({
      ...state.keo,
      rows: state.keo.rows.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    });
    luu({ ...state, keo: next });
  };
  const xoaKeoRow = (i: number) => {
    if (state.keo.rows.length <= 1) return;
    const next = dongBoGiaKeoSauSuaRow({
      ...state.keo,
      rows: state.keo.rows.filter((_, idx) => idx !== i),
    });
    luu({ ...state, keo: next });
  };
  const themKeoRow = () => {
    const n = state.keo.rows.length + 1;
    const next = dongBoGiaKeoSauSuaRow({
      ...state.keo,
      rows: [
        ...state.keo.rows,
        { ma: `NEW_${n}`, ten: "", dvt: "kg", donGia: 0, ghiChu: "", slDung: 1 },
      ],
    });
    luu({ ...state, keo: next });
  };

  const apDungKeo = (source: KeoTable["appliedSource"], price: number) => {
    if (!Number.isFinite(price) || price < 0) return;
    luu({
      ...state,
      keo: { ...state.keo, appliedSource: source, appliedPrice: price },
    });
  };

  const tbCongKeo = tinhGiaKeoTbCong(state.keo.rows);
  const tbTrongSoKeo = tinhGiaKeoTbTrongSo(state.keo.rows);

  return (
    <div className="config-cpsx-upgrade-solvent">
      {/* ═══════ Bảng giá dung môi ═══════ */}
      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Bảng giá dung môi</span>
          <span className="config-cpsx-upgrade__head-meta">
            {state.dungMoi.rows.length} dòng
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenDm((o) => !o)}
            aria-expanded={openDm}
            aria-controls="cpsx-dungmoi-body"
            aria-label={openDm ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openDm ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openDm && (
          <div id="cpsx-dungmoi-body" className="config-cpsx-upgrade__panel">
            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th className="num" style={{ width: 48 }}>STT</th>
                    <th style={{ minWidth: 110 }}>Mã vật tư</th>
                    <th>Tên vật tư</th>
                    <th className="num" style={{ width: 70 }}>ĐVT</th>
                    <th className="num" style={{ width: 120 }}>
                      Đơn giá (₫/kg)
                    </th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.dungMoi.rows.map((r, i) => (
                    <DongVatTu
                      key={`dm-${i}-${r.ma}`}
                      row={r}
                      index={i}
                      canXoa={state.dungMoi.rows.length > 1}
                      suaRow={suaDmRow}
                      xoaRow={xoaDmRow}
                    />
                  ))}
                  <tr className="config-cpsx-upgrade__add-row">
                    <td colSpan={6}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
                        onClick={themDmRow}
                      >
                        + Thêm vật tư
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">
              ⓘ Di chuột vào ⓘ cạnh tên vật tư để xem ứng dụng: DM_OPP — in
              màng OPP, màng MattOPP · DM_PET — in toàn bộ màng còn lại ·
              DM_EA — ghép toàn bộ màng.
            </p>
          </div>
        )}
      </div>

      {/* ═══════ Bảng giá keo ghép ═══════ */}
      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Bảng giá keo ghép</span>
          <span className="config-cpsx-upgrade__head-meta">
            {state.keo.appliedPrice != null
              ? `${dinhDangVnd(state.keo.appliedPrice)} ₫/kg`
              : "—"}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenKeo((o) => !o)}
            aria-expanded={openKeo}
            aria-controls="cpsx-keo-body"
            aria-label={openKeo ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openKeo ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openKeo && (
          <div id="cpsx-keo-body" className="config-cpsx-upgrade__panel">
            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th className="num" style={{ width: 48 }}>STT</th>
                    <th style={{ minWidth: 110 }}>Mã vật tư</th>
                    <th>Tên vật tư</th>
                    <th className="num" style={{ width: 70 }}>ĐVT</th>
                    <th className="num" style={{ width: 120 }}>
                      Đơn giá (₫/kg)
                    </th>
                    <th className="num" style={{ width: 100 }}>SL dùng</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.keo.rows.map((r, i) => (
                    <DongVatTu
                      key={`keo-${i}-${r.ma}`}
                      row={r}
                      index={i}
                      canXoa={state.keo.rows.length > 1}
                      suaRow={suaKeoRow}
                      xoaRow={xoaKeoRow}
                      slDung={r.slDung}
                      suaSlDung={(idx, v) =>
                        suaKeoRow(idx, { slDung: v })
                      }
                    />
                  ))}
                  <tr className="config-cpsx-upgrade__add-row">
                    <td colSpan={7}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
                        onClick={themKeoRow}
                      >
                        + Thêm vật tư
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
                  state.keo.appliedSource === "average" ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-keo-source"
                  checked={state.keo.appliedSource === "average"}
                  disabled={tbCongKeo <= 0}
                  onChange={() => apDungKeo("average", tbCongKeo)}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá keo TB cộng
                </span>
                <strong className="config-cpsx-upgrade__source-value">
                  {tbCongKeo > 0 ? `${dinhDangVnd(tbCongKeo)} ₫/kg` : "—"}
                </strong>
              </label>
              <label
                className={`config-cpsx-upgrade__source-opt${
                  state.keo.appliedSource === "weighted" ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-keo-source"
                  checked={state.keo.appliedSource === "weighted"}
                  disabled={tbTrongSoKeo <= 0}
                  onChange={() => apDungKeo("weighted", tbTrongSoKeo)}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá keo TB trọng số
                </span>
                <strong className="config-cpsx-upgrade__source-value">
                  {tbTrongSoKeo > 0 ? `${dinhDangVnd(tbTrongSoKeo)} ₫/kg` : "—"}
                </strong>
              </label>
              <label
                className={`config-cpsx-upgrade__source-opt${
                  state.keo.appliedSource === "manual" ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="cpsx-keo-source"
                  checked={state.keo.appliedSource === "manual"}
                  onChange={() => {
                    const v = docSo(manualDraft) || tbCongKeo;
                    if (v <= 0) return;
                    apDungKeo("manual", v);
                  }}
                />
                <span className="config-cpsx-upgrade__source-label">
                  Giá keo nhập tay
                </span>
                {state.keo.appliedSource === "manual" ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input config-cpsx-upgrade__manual"
                      aria-label="Giá keo nhập tay"
                      placeholder="₫/kg"
                      value={
                        state.keo.appliedPrice != null
                          ? dinhDangVnd(state.keo.appliedPrice)
                          : manualDraft
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        setManualDraft(raw);
                        const v = docSo(raw);
                        if (v > 0) apDungKeo("manual", v);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="config-cpsx-upgrade__unit">₫/kg</span>
                  </>
                ) : (
                  <strong className="config-cpsx-upgrade__source-value">
                    {manualDraft || (tbCongKeo > 0 ? dinhDangVnd(tbCongKeo) : "—")}
                    {manualDraft || tbCongKeo > 0 ? " ₫/kg" : ""}
                  </strong>
                )}
              </label>
            </fieldset>

            <p className="config-note">
              2 loại keo dùng được cho mọi loại màng tại khâu GHÉP. SL dùng =
              số kg keo tiêu thụ trong kỳ (mặc định 1), dùng cho cách tính TB
              trọng số. Giá sau (engine): keo = giá đã chọn · DM pha keo = DUNG
              MÔI EA · quy g → ₫/m² ÷ 1000.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
