"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import type {
  DungMoiCongDoan,
  KeoRow,
  KeoTable,
  Material,
  SolventAdhesiveRow,
} from "../../lib/types";
import {
  chuanHoaBangDungMoiKeo,
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

type LuaChonMang = { key: string; label: string };

function dsLuaChonMang(materials: Material[]): LuaChonMang[] {
  // Chỉ lấy từ bảng Giá NVL (không gộp token cứng) — đúng yêu cầu "chỉ lấy
  // danh sách trong bảng Giá Nguyên Vật Liệu". Dedup theo upper-case.
  const seenKey = new Set<string>();
  const seenLabel = new Set<string>();
  const out: LuaChonMang[] = [];
  const add = (key: string, label: string) => {
    const k = String(key || "").trim();
    if (!k) return;
    const ku = k.toUpperCase();
    const lu = String(label || k).trim().toUpperCase();
    if (seenKey.has(ku) && seenLabel.has(lu)) return;
    if (!seenKey.has(ku)) seenKey.add(ku);
    if (!seenLabel.has(lu)) seenLabel.add(lu);
    out.push({ key: k, label: label || k });
  };
  for (const m of materials) {
    const id = String(m.id || "").trim();
    const name = String(m.name || "").trim();
    if (name && name.toUpperCase() !== id.toUpperCase()) {
      add(name, name);
    } else if (id) {
      add(id, name || id);
    }
  }
  return out;
}

function nhanTomTatLoaiMang(keys: string[]): string {
  if (!keys?.length) return "Chọn màng";
  if (keys.includes("*")) return "Tất cả";
  if (keys.length <= 2) return keys.join(", ");
  return `${keys.length} đã chọn`;
}

function useChieuMoDropdown(
  open: boolean,
  rootRef: React.RefObject<HTMLDivElement | null>,
  popupRef: React.RefObject<HTMLDivElement | null>,
): "up" | "down" {
  const [dir, setDir] = React.useState<"up" | "down">("up");
  React.useEffect(() => {
    if (!open) return;
    const r = rootRef.current?.getBoundingClientRect();
    const p = popupRef.current?.getBoundingClientRect();
    const popupH = p?.height ?? 240;
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    if (spaceBelow < popupH + 8 && spaceAbove > popupH + 8) {
      setDir("up");
    } else {
      setDir("down");
    }
  }, [open, rootRef, popupRef]);
  return dir;
}

/** Ô tóm tắt read-only trong bảng — chỉ hiện n đã chọn, không popup. */
function TomTatLoaiMang({ keys }: { keys: string[] }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 999,
        background: "var(--surface-2, #eef2f7)",
        fontSize: 12,
        color: "var(--text, #0f172a)",
        fontWeight: 500,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={
        keys?.includes("*")
          ? "Mọi loại màng"
          : (keys ?? []).join(", ") || "Chưa chọn"
      }
    >
      {nhanTomTatLoaiMang(keys ?? [])}
    </span>
  );
}

/** Panel chọn loại màng nằm ngoài bảng; áp cho 1 dòng được chọn. */
function PanelChonLoaiMang({
  row,
  index,
  label,
  options,
  onChange,
  isSelected,
  onSelect,
}: {
  row: SolventAdhesiveRow;
  index: number;
  label: string;
  options: LuaChonMang[];
  onChange: (loaiMangKeys: string[]) => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const keys = Array.isArray(row.loaiMangKeys) ? row.loaiMangKeys : [];
  const all = keys.includes("*");

  const toggleAll = () => {
    onChange(all ? [] : ["*"]);
  };

  const toggleKey = (key: string) => {
    if (all) {
      onChange([key]);
      return;
    }
    const has = keys.some((k) => k.toUpperCase() === key.toUpperCase());
    if (has) {
      onChange(keys.filter((k) => k.toUpperCase() !== key.toUpperCase()));
    } else {
      onChange([...keys.filter((k) => k !== "*"), key]);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Chọn loại màng cho dòng ${label}`}
      onClick={onSelect}
      onFocus={onSelect}
      style={{
        padding: 10,
        borderRadius: 8,
        border: isSelected
          ? "1.5px solid var(--accent, #2563eb)"
          : "1px solid var(--border, #e5e7eb)",
        background: isSelected ? "var(--surface-accent, #eff6ff)" : "var(--surface, #fff)",
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          Dòng {index + 1}: {label || "—"}
        </span>
        <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
          ({nhanTomTatLoaiMang(keys)})
        </span>
      </div>
      {isSelected && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 4,
            marginTop: 4,
          }}
        >
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              padding: "3px 4px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <input type="checkbox" checked={all} onChange={toggleAll} />
            Tất cả
          </label>
          {options.map((opt) => {
            const checked =
              all ||
              keys.some((k) => k.toUpperCase() === opt.key.toUpperCase());
            return (
              <label
                key={opt.key}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  padding: "3px 4px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
                title={opt.label}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleKey(opt.key)}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BangKeoRowProps {
  row: SolventAdhesiveRow;
  index: number;
  canXoa: boolean;
  suaRow: (i: number, patch: Partial<SolventAdhesiveRow>) => void;
  xoaRow: (i: number) => void;
  slDung?: number;
  suaSlDung?: (i: number, v: number) => void;
}

function DongKeo({
  row,
  index,
  canXoa,
  suaRow,
  xoaRow,
  slDung,
  suaSlDung,
}: BangKeoRowProps) {
  return (
    <tr>
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
        <input
          type="text"
          className="config-inline-input"
          aria-label="Tên vật tư"
          value={row.ten}
          onChange={(e) => suaRow(index, { ten: e.target.value })}
        />
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
  const materials = dungCuaHangTinhGia((s) => s.materials);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const state = React.useMemo(
    () =>
      chuanHoaBangDungMoiKeo(
        hangSo.cpsxUpgradeInk?.solventAdhesive,
        DEFAULT_CPSX_UPGRADE_INK.solventAdhesive,
      ),
    [hangSo.cpsxUpgradeInk],
  );

  const mangOptions = React.useMemo(
    () => dsLuaChonMang(materials ?? []),
    [materials],
  );

  const [openDm, setOpenDm] = React.useState(false);
  const [openKeo, setOpenKeo] = React.useState(false);
  const [openLmPanel, setOpenLmPanel] = React.useState(true);
  const [dmRowChon, setDmRowChon] = React.useState<number | null>(null);

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
          {
            ma: `NEW_${n}`,
            ten: "",
            dvt: "kg",
            donGia: 0,
            ghiChu: "",
            congDoan: "in" as DungMoiCongDoan,
            loaiMangKeys: [],
          },
        ],
      },
    });
  };

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
        {
          ma: `NEW_${n}`,
          ten: "",
          dvt: "kg",
          donGia: 0,
          ghiChu: "",
          slDung: 1,
          congDoan: "ghep",
          loaiMangKeys: ["*"],
        },
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
                    <th style={{ minWidth: 100 }}>Mã vật tư</th>
                    <th>Tên vật tư</th>
                    <th className="num" style={{ width: 64 }}>
                      ĐVT
                    </th>
                    <th className="num" style={{ width: 110 }}>
                      Đơn giá
                    </th>
                    <th style={{ width: 100 }}>Công đoạn</th>
                    <th style={{ minWidth: 160 }}>Loại màng</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.dungMoi.rows.map((r, i) => (
                    <tr key={`dm-${i}-${r.ma}`}>
                      <td>
                        <input
                          type="text"
                          className="config-inline-input"
                          aria-label="Mã vật tư"
                          value={r.ma}
                          onChange={(e) => suaDmRow(i, { ma: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="config-inline-input"
                          aria-label="Tên vật tư"
                          value={r.ten}
                          onChange={(e) => suaDmRow(i, { ten: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="config-inline-input"
                          aria-label="Đơn vị tính"
                          value={r.dvt}
                          onChange={(e) => suaDmRow(i, { dvt: e.target.value })}
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
                            suaDmRow(i, { donGia: docSo(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="config-inline-input"
                          aria-label="Công đoạn"
                          value={r.congDoan === "ghep" ? "ghep" : "in"}
                          onChange={(e) =>
                            suaDmRow(i, {
                              congDoan:
                                e.target.value === "ghep" ? "ghep" : "in",
                            })
                          }
                        >
                          <option value="in">In</option>
                          <option value="ghep">Ghép</option>
                        </select>
                      </td>
                      <td
                        onClick={() => setDmRowChon(i)}
                        style={{ cursor: "pointer" }}
                        aria-label={`Chọn loại màng cho dòng ${i + 1}`}
                      >
                        <TomTatLoaiMang keys={r.loaiMangKeys ?? []} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                          disabled={state.dungMoi.rows.length <= 1}
                          onClick={() => xoaDmRow(i)}
                          aria-label="Xóa dòng"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="config-cpsx-upgrade__add-row">
                    <td colSpan={7}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline config-cpsx-upgrade__add"
                        onClick={themDmRow}
                      >
                        + Thêm
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              className="config-cpsx-upgrade__loai-mang-panel"
              style={{
                marginTop: 12,
                padding: openLmPanel ? 10 : 0,
                borderRadius: 8,
                border: openLmPanel
                  ? "1px solid var(--border, #e5e7eb)"
                  : "1px solid transparent",
                background: openLmPanel ? "var(--surface-1, #f8fafc)" : "transparent",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: openLmPanel ? 6 : 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Chọn loại màng áp dụng
                  {openLmPanel && (
                    <span style={{ fontSize: 12, color: "var(--muted, #64748b)", fontWeight: 400 }}>
                      (click 1 dòng trong bảng để chỉnh)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setOpenLmPanel((o) => !o)}
                  aria-expanded={openLmPanel}
                  aria-label={openLmPanel ? "Ẩn bảng chọn loại màng" : "Hiện bảng chọn loại màng"}
                >
                  {openLmPanel ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {openLmPanel && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 6,
                }}
              >
                {state.dungMoi.rows.map((r, i) => (
                  <PanelChonLoaiMang
                    key={`lm-${i}-${r.ma}`}
                    row={r}
                    index={i}
                    label={`${r.ma} · ${r.ten}`.trim()}
                    options={mangOptions}
                    onChange={(loaiMangKeys) =>
                      suaDmRow(i, { loaiMangKeys })
                    }
                    isSelected={dmRowChon === i}
                    onSelect={() => setDmRowChon(i)}
                  />
                ))}
              </div>
              )}
            </div>
            <p className="config-note">
              Engine chọn dòng theo <strong>công đoạn</strong> +{" "}
              <strong>loại màng</strong> (first match). «Tất cả» = mọi màng.
              Thứ tự dòng trên bảng quyết định ưu tiên khi nhiều dòng khớp.
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
                    <th className="num" style={{ width: 48 }}>
                      STT
                    </th>
                    <th style={{ minWidth: 110 }}>Mã vật tư</th>
                    <th>Tên vật tư</th>
                    <th className="num" style={{ width: 70 }}>
                      ĐVT
                    </th>
                    <th className="num" style={{ width: 120 }}>
                      Đơn giá (₫/kg)
                    </th>
                    <th className="num" style={{ width: 100 }}>
                      SL dùng
                    </th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {state.keo.rows.map((r, i) => (
                    <DongKeo
                      key={`keo-${i}-${r.ma}`}
                      row={r}
                      index={i}
                      canXoa={state.keo.rows.length > 1}
                      suaRow={suaKeoRow}
                      xoaRow={xoaKeoRow}
                      slDung={r.slDung}
                      suaSlDung={(idx, v) => suaKeoRow(idx, { slDung: v })}
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
                    {manualDraft ||
                      (tbCongKeo > 0 ? dinhDangVnd(tbCongKeo) : "—")}
                    {manualDraft || tbCongKeo > 0 ? " ₫/kg" : ""}
                  </strong>
                )}
              </label>
            </fieldset>

            <p className="config-note">
              2 loại keo dùng được cho mọi loại màng tại khâu GHÉP. SL dùng =
              số kg keo tiêu thụ trong kỳ (mặc định 1), dùng cho cách tính TB
              trọng số. Giá sau (engine): keo = giá đã chọn · DM pha keo = dòng
              dung môi công đoạn Ghép · quy g → ₫/m² ÷ 1000.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
