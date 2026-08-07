"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import CpsxNangCapDungMoiKeo from "./CpsxNangCapDungMoiKeo";
import CpsxNangCapDinhMuc from "./CpsxNangCapDinhMuc";
import CpsxNangCapBangGiaIn from "./CpsxNangCapBangGiaIn";
import type { CpsxUpgradeInk, InkPriceSource, MucInRow, MucInTable } from "../../lib/types";
import {
  chuanHoaCpsxUpgradeInk,
  chuanHoaMucInTable,
  dongBoGiaMucDangApSauSuaRow,
  giaMucTheoNguon,
  tinhGiaMucTbCong,
  tinhGiaMucTbTrongSo,
} from "../../lib/cpsx-upgrade-ink";

type LoaiBang = "opp" | "pet" | "pe";

const LABEL: Record<LoaiBang, string> = {
  opp: "Bảng giá mực in OPP",
  pet: "Bảng giá mực in PET",
  pe: "Bảng giá mực in PE (LLDPE)",
};

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN");
}

function docSo(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

/** Bỏ dấu tiếng Việt + hạ thường — dùng cho tìm kiếm không phân biệt hoa thường/dấu */
function loaiBoDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

interface BangMucProps {
  loai: LoaiBang;
  state: MucInTable;
  onChange: (next: MucInTable) => void;
}

function BangMuc({ loai, state, onChange }: BangMucProps) {
  const tbCong = tinhGiaMucTbCong(state.rows);
  const tbTrongSo = tinhGiaMucTbTrongSo(state.rows);
  const tongSlDung = state.rows.reduce(
    (s, r) => s + (Number(r.slDung) || 0),
    0,
  );
  const daAp =
    state.appliedPrice != null && Number.isFinite(state.appliedPrice);

  const [manualDraft, setManualDraft] = React.useState<string>(() =>
    tbCong > 0 ? dinhDangVnd(tbCong) : "",
  );

  // ── Tìm kiếm vật tư (theo mã / tên, không phân biệt dấu) ──
  const [query, setQuery] = React.useState("");
  const q = loaiBoDau(query.trim());
  const filteredRows = state.rows
    .map((r, i) => ({ r, i }))
    .filter(
      ({ r }) =>
        !q ||
        loaiBoDau(r.ma).includes(q) ||
        loaiBoDau(r.ten).includes(q),
    );

  React.useEffect(() => {
    if (state.appliedSource !== "manual") {
      setManualDraft(tbCong > 0 ? dinhDangVnd(tbCong) : "");
    }
  }, [tbCong, state.appliedSource]);

  const capNhatRows = (rows: MucInRow[]) => {
    const next = dongBoGiaMucDangApSauSuaRow({ ...state, rows });
    onChange(next);
  };

  const suaRow = (i: number, patch: Partial<MucInRow>) => {
    capNhatRows(
      state.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  };

  const xoaRow = (i: number) => {
    if (state.rows.length <= 1) return;
    capNhatRows(state.rows.filter((_, idx) => idx !== i));
  };

  const themRow = () => {
    const n = state.rows.length + 1;
    setQuery("");
    capNhatRows([
      ...state.rows,
      { ma: `NEW_${n}`, ten: "", dvt: "kg", donGia: 0, slDung: 0 },
    ]);
  };

  const apDung = (source: InkPriceSource, price: number) => {
    if (!Number.isFinite(price) || price < 0) return;
    onChange({ ...state, appliedSource: source, appliedPrice: price });
  };

  const suaGiaDangAp = (raw: string) => {
    const v = docSo(raw);
    onChange({
      ...state,
      appliedSource: "manual",
      appliedPrice: v > 0 ? v : 0,
    });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__search">
        <div className="config-cpsx-upgrade__search-input-wrap">
          <span className="config-cpsx-upgrade__search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="config-cpsx-upgrade__search-input"
            placeholder="Tìm mã hoặc tên vật tư…"
            aria-label="Tìm vật tư theo mã hoặc tên"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
          {query && (
            <button
              type="button"
              className="config-cpsx-upgrade__search-clear"
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
        <span className="config-cpsx-upgrade__search-count">
          <strong>{filteredRows.length}</strong>/{state.rows.length} dòng
        </span>
      </div>

      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num" style={{ width: 48 }}>STT</th>
              <th style={{ minWidth: 140 }}>Mã vật tư</th>
              <th>Tên vật tư</th>
              <th className="num" style={{ width: 70 }}>ĐVT</th>
              <th className="num" style={{ width: 110 }}>Đơn giá mới</th>
              <th className="num" style={{ width: 100 }}>SL dùng</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr className="config-cpsx-upgrade__search-empty">
                <td colSpan={7}>
                  Không tìm thấy vật tư nào khớp &quot;{query.trim()}&quot;
                </td>
              </tr>
            ) : (
              filteredRows.map(({ r, i }) => (
                <tr key={`${loai}-${i}-${r.ma}`}>
                  <td className="num config-cpsx-upgrade__lock">{i + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="config-inline-input"
                      aria-label="Mã vật tư"
                      value={r.ma}
                      onChange={(e) => suaRow(i, { ma: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="config-inline-input"
                      aria-label="Tên vật tư"
                      value={r.ten}
                      onChange={(e) => suaRow(i, { ten: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="config-inline-input"
                      aria-label="Đơn vị tính"
                      value={r.dvt}
                      onChange={(e) => suaRow(i, { dvt: e.target.value })}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input"
                      aria-label="Đơn giá"
                      value={dinhDangVnd(r.donGia)}
                      onChange={(e) =>
                        suaRow(i, { donGia: docSo(e.target.value) })
                      }
                    />
                  </td>
                  <td className="num">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input"
                      aria-label="Số lượng dùng"
                      value={dinhDangSo(r.slDung)}
                      onChange={(e) =>
                        suaRow(i, { slDung: docSo(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                      disabled={state.rows.length <= 1}
                      onClick={() => xoaRow(i)}
                      aria-label="Xóa dòng"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
            <tr className="config-cpsx-upgrade__add-row">
              <td colSpan={7}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline config-cpsx-upgrade__add"
                  onClick={themRow}
                >
                  + Thêm vật tư
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="config-cpsx-upgrade__total-label">
                TỔNG CỘNG
              </td>
              <td className="num config-cpsx-upgrade__total">
                {dinhDangSo(tongSlDung)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <fieldset className="config-cpsx-upgrade__sources">
        <legend className="config-cpsx-upgrade__sources-legend">
          Chọn giá áp dụng
        </legend>
        <label
          className={`config-cpsx-upgrade__source-opt${
            (state.appliedSource ?? "average") === "average" ? " is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name={`cpsx-muc-source-${loai}`}
            checked={(state.appliedSource ?? "average") === "average"}
            disabled={tbCong <= 0}
            onChange={() => apDung("average", tbCong)}
          />
          <span className="config-cpsx-upgrade__source-label">
            Giá mực trung bình cộng
          </span>
          <strong className="config-cpsx-upgrade__source-value">
            {tbCong > 0 ? `${dinhDangVnd(tbCong)} ₫/kg` : "—"}
          </strong>
        </label>
        <label
          className={`config-cpsx-upgrade__source-opt${
            state.appliedSource === "weighted" ? " is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name={`cpsx-muc-source-${loai}`}
            checked={state.appliedSource === "weighted"}
            disabled={tbTrongSo <= 0}
            onChange={() => apDung("weighted", tbTrongSo)}
          />
          <span className="config-cpsx-upgrade__source-label">
            Giá mực trung bình trọng số
          </span>
          <strong className="config-cpsx-upgrade__source-value">
            {tbTrongSo > 0 ? `${dinhDangVnd(tbTrongSo)} ₫/kg` : "—"}
          </strong>
        </label>
        <label
          className={`config-cpsx-upgrade__source-opt${
            state.appliedSource === "manual" ? " is-selected" : ""
          }`}
        >
          <input
            type="radio"
            name={`cpsx-muc-source-${loai}`}
            checked={state.appliedSource === "manual"}
            onChange={() => {
              const v = docSo(manualDraft) || tbCong;
              if (v <= 0) return;
              apDung("manual", v);
            }}
          />
          <span className="config-cpsx-upgrade__source-label">
            Giá mực nhập tay
          </span>
          {state.appliedSource === "manual" ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                className="config-inline-input config-cpsx-upgrade__manual"
                aria-label={`Giá mực ${loai.toUpperCase()} nhập tay`}
                placeholder="₫/kg"
                value={daAp ? dinhDangVnd(state.appliedPrice!) : manualDraft}
                onChange={(e) => {
                  const raw = e.target.value;
                  setManualDraft(raw);
                  suaGiaDangAp(raw);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="config-cpsx-upgrade__unit">₫/kg</span>
            </>
          ) : (
            <strong className="config-cpsx-upgrade__source-value">
              {manualDraft || (tbCong > 0 ? dinhDangVnd(tbCong) : "—")}
              {manualDraft || tbCong > 0 ? " ₫/kg" : ""}
            </strong>
          )}
        </label>
      </fieldset>
    </div>
  );
}

export default function CpsxNangCapMuc() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

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

  const luu = (next: CpsxUpgradeInk) => {
    capNhatHangSo("cpsxUpgradeInk", next as never);
  };

  const suaBang = (loai: LoaiBang, table: MucInTable) => {
    const clean = chuanHoaMucInTable(
      table as Partial<MucInTable>,
      state[loai],
    );
    luu({ ...state, [loai]: clean });
  };

  const [openMap, setOpenMap] = React.useState<Record<LoaiBang, boolean>>({
    opp: true,
    pet: true,
    pe: false,
  });
  const toggle = (loai: LoaiBang) =>
    setOpenMap((m) => ({ ...m, [loai]: !m[loai] }));

  return (
    <div className="config-cpsx-upgrade-ink">
      {(Object.keys(LABEL) as LoaiBang[]).map((loai) => {
        const t = state[loai];
        const open = openMap[loai];
        const summary = t.appliedPrice != null
          ? `${dinhDangVnd(t.appliedPrice)} ₫/kg`
          : "—";
        return (
          <div key={loai} className="card config-card config-cpsx-upgrade-card">
            <div className="config-section-title config-cpsx-upgrade__head">
              <span>{LABEL[loai]}</span>
              <span className="config-cpsx-upgrade__head-meta">
                {summary}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
                onClick={() => toggle(loai)}
                aria-expanded={open}
                aria-controls={`cpsx-muc-body-${loai}`}
                aria-label={open ? "Thu gọn bảng" : "Mở rộng bảng"}
              >
                {open ? "▾ Thu gọn" : "▸ Mở rộng"}
              </button>
            </div>
            {open && (
              <div id={`cpsx-muc-body-${loai}`}>
                <BangMuc
                  loai={loai}
                  state={t}
                  onChange={(next) => suaBang(loai, next)}
                />
              </div>
            )}
          </div>
        );
      })}
      <CpsxNangCapDungMoiKeo />
      <CpsxNangCapDinhMuc />
      <CpsxNangCapBangGiaIn />
    </div>
  );
}
