"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import type { SolventAdhesiveRow, SolventAdhesiveTable } from "../../lib/types";
import { chuanHoaBangDungMoiKeo } from "../../lib/cpsx-upgrade-ink";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function docSo(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
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

  const [open, setOpen] = React.useState(true);

  const luu = (next: SolventAdhesiveTable) => {
    const cur = hangSo.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK;
    capNhatHangSo("cpsxUpgradeInk", {
      ...cur,
      solventAdhesive: next,
    } as never);
  };

  const suaRow = (i: number, patch: Partial<SolventAdhesiveRow>) => {
    luu({
      rows: state.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    });
  };

  const xoaRow = (i: number) => {
    if (state.rows.length <= 1) return;
    luu({ rows: state.rows.filter((_, idx) => idx !== i) });
  };

  const themRow = () => {
    const n = state.rows.length + 1;
    luu({
      rows: [
        ...state.rows,
        { ma: `NEW_${n}`, ten: "", dvt: "kg", donGia: 0, ghiChu: "" },
      ],
    });
  };

  return (
    <div className="config-cpsx-upgrade-solvent">
      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Bảng giá dung môi + keo ghép</span>
          <span className="config-cpsx-upgrade__head-meta">
            {state.rows.length} dòng
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="cpsx-solvent-body"
            aria-label={open ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {open ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {open && (
          <div id="cpsx-solvent-body" className="config-cpsx-upgrade__panel">
            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th className="num" style={{ width: 48 }}>STT</th>
                    <th style={{ minWidth: 110 }}>Mã vật tư</th>
                    <th>Tên vật tư</th>
                    <th className="num" style={{ width: 70 }}>ĐVT</th>
                    <th className="num" style={{ width: 120 }}>
                      Đơn giá (₫/{state.rows[0]?.dvt || "kg"})
                    </th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r, i) => (
                    <tr key={`solvent-${i}-${r.ma}`}>
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
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline config-cpsx-upgrade__add"
              onClick={themRow}
            >
              + Thêm dòng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
