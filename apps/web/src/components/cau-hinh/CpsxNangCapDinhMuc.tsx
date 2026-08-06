"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import type { DinhMucGhep, DinhMucInRow } from "../../lib/types";
import {
  chuanHoaCpsxUpgradeInk,
  chuanHoaDinhMucGhep,
  chuanHoaDinhMucIn,
  tinhCpMucInChiTiet,
} from "../../lib/cpsx-upgrade-ink";
import { tinhCpKeoDungMoiGhep } from "../../lib/dac-ta-nang-cao";

function docSoThapPhan(value: string): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function dinhDangVnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}

function dinhDangSo(n: number): string {
  return n.toLocaleString("vi-VN");
}

function clampSoMau(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(8, Math.floor(n)));
}

export default function CpsxNangCapDinhMuc() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const ink = React.useMemo(
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

  const dinhMucIn = React.useMemo(
    () =>
      chuanHoaDinhMucIn(
        hangSo.cpsxUpgradeInk?.dinhMucIn,
        DEFAULT_CPSX_UPGRADE_INK.dinhMucIn,
      ),
    [hangSo.cpsxUpgradeInk],
  );

  const dinhMucGhep = React.useMemo(
    () =>
      chuanHoaDinhMucGhep(
        hangSo.cpsxUpgradeInk?.dinhMucGhep,
        DEFAULT_CPSX_UPGRADE_INK.dinhMucGhep,
      ),
    [hangSo.cpsxUpgradeInk],
  );

  const [openIn, setOpenIn] = React.useState(true);
  const [openGhep, setOpenGhep] = React.useState(true);

  const [soMauPET, setSoMauPET] = React.useState(1);
  const [soMauOPP, setSoMauOPP] = React.useState(1);

  // CP mực in + DM in (₫/m²) — dùng chung helper đã test với engine đặc tả
  const chiTietPET = tinhCpMucInChiTiet(soMauPET, "pet", ink);
  const chiTietOPP = tinhCpMucInChiTiet(soMauOPP, "opp", ink);
  // CP keo + dung môi ghép (₫/m²) — helper engine đặc tả
  const chiTietKeo = tinhCpKeoDungMoiGhep(ink);

  const luuPatch = (patch: {
    dinhMucIn?: DinhMucInRow[];
    dinhMucGhep?: DinhMucGhep;
  }) => {
    const cur = hangSo.cpsxUpgradeInk ?? DEFAULT_CPSX_UPGRADE_INK;
    capNhatHangSo("cpsxUpgradeInk", {
      ...cur,
      ...patch,
    } as never);
  };

  const suaIn = (soMau: DinhMucInRow["soMau"], patch: Partial<DinhMucInRow>) => {
    luuPatch({
      dinhMucIn: dinhMucIn.map((r) =>
        r.soMau === soMau ? { ...r, ...patch, soMau } : r,
      ),
    });
  };

  const suaGhep = (patch: Partial<DinhMucGhep>) => {
    luuPatch({
      dinhMucGhep: chuanHoaDinhMucGhep(
        { ...dinhMucGhep, ...patch },
        DEFAULT_CPSX_UPGRADE_INK.dinhMucGhep,
      ),
    });
  };

  return (
    <div className="config-cpsx-upgrade-dinhmuc">
      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Định mức mực in + dung môi in</span>
          <span className="config-cpsx-upgrade__head-meta">1–8 màu</span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenIn((o) => !o)}
            aria-expanded={openIn}
            aria-controls="cpsx-dinhmuc-in-body"
            aria-label={openIn ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openIn ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openIn && (
          <div id="cpsx-dinhmuc-in-body" className="config-cpsx-upgrade__panel">
            <div className="config-cpsx-upgrade__formulas">
              <div className="config-cpsx-upgrade__formula-head">
                Công thức áp dụng: CP mực in + DM in = (ĐM mực × Giá mực + ĐM
                DM × Giá DM) ÷ 1000 → ₫/m²
              </div>
              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-note">
                  ĐM mực đã là tổng cho n màu (1 màu = 4g, 8 màu = 32g) — không
                  nhân lại số màu
                </span>
              </div>

              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-label">
                  PET  ·  Giá mực{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietPET.giaMuc)} ₫/kg
                  </strong>{" "}
                  ·  Giá DM{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietPET.giaDm)} ₫/kg
                  </strong>
                </span>
              </div>
              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-label">
                  Số màu in
                </span>
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  min={1}
                  max={8}
                  step={1}
                  aria-label="Số màu in PET"
                  value={soMauPET}
                  onChange={(e) =>
                    setSoMauPET(clampSoMau(docSoThapPhan(e.target.value)))
                  }
                />
                <span className="config-cpsx-upgrade__formula-op">→</span>
                <strong className="config-cpsx-upgrade__formula-result">
                  ({dinhDangSo(chiTietPET.dmMucG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietPET.giaMuc)}
                  </span>{" "}
                  ₫/kg + {dinhDangSo(chiTietPET.dmDungMoiG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietPET.giaDm)}
                  </span>{" "}
                  ₫/kg) ÷ 1000 = {dinhDangVnd(chiTietPET.tong)} ₫/m²
                </strong>
              </div>

              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-label">
                  OPP  ·  Giá mực{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietOPP.giaMuc)} ₫/kg
                  </strong>{" "}
                  ·  Giá DM{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietOPP.giaDm)} ₫/kg
                  </strong>
                </span>
              </div>
              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-label">
                  Số màu in
                </span>
                <input
                  type="number"
                  className="config-inline-input config-cpsx-upgrade__formula-input"
                  min={1}
                  max={8}
                  step={1}
                  aria-label="Số màu in OPP"
                  value={soMauOPP}
                  onChange={(e) =>
                    setSoMauOPP(clampSoMau(docSoThapPhan(e.target.value)))
                  }
                />
                <span className="config-cpsx-upgrade__formula-op">→</span>
                <strong className="config-cpsx-upgrade__formula-result">
                  ({dinhDangSo(chiTietOPP.dmMucG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietOPP.giaMuc)}
                  </span>{" "}
                  ₫/kg + {dinhDangSo(chiTietOPP.dmDungMoiG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietOPP.giaDm)}
                  </span>{" "}
                  ₫/kg) ÷ 1000 = {dinhDangVnd(chiTietOPP.tong)} ₫/m²
                </strong>
              </div>
            </div>

            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th>Số màu in</th>
                    <th className="num">Định mức mực in (g/m²)</th>
                    <th className="num">Định mức dung môi (g/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {dinhMucIn.map((r) => (
                    <tr key={`dm-in-${r.soMau}`}>
                      <td className="config-cpsx-upgrade__lock">
                        In {r.soMau} màu
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          className="config-inline-input"
                          min={0}
                          step={0.1}
                          aria-label={`ĐM mực ${r.soMau} màu`}
                          value={r.dmMucG}
                          onChange={(e) =>
                            suaIn(r.soMau, {
                              dmMucG: docSoThapPhan(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          className="config-inline-input"
                          min={0}
                          step={0.1}
                          aria-label={`ĐM dung môi ${r.soMau} màu`}
                          value={r.dmDungMoiG}
                          onChange={(e) =>
                            suaIn(r.soMau, {
                              dmDungMoiG: docSoThapPhan(e.target.value),
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="config-note">
              Số màu lấy từ form khách lúc tính giá (ẩn ở đây). Lookup ĐM theo
              số màu — không nhân lại số màu.
            </p>
          </div>
        )}
      </div>

      <div className="card config-card config-cpsx-upgrade-card">
        <div className="config-section-title config-cpsx-upgrade__head">
          <span>Định mức keo + dung môi ghép</span>
          <span className="config-cpsx-upgrade__head-meta">
            {dinhMucGhep.keoKhoG} · {dinhMucGhep.dungMoiPhaKeoG} g/m²
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__toggle"
            onClick={() => setOpenGhep((o) => !o)}
            aria-expanded={openGhep}
            aria-controls="cpsx-dinhmuc-ghep-body"
            aria-label={openGhep ? "Thu gọn bảng" : "Mở rộng bảng"}
          >
            {openGhep ? "▾ Thu gọn" : "▸ Mở rộng"}
          </button>
        </div>
        {openGhep && (
          <div
            id="cpsx-dinhmuc-ghep-body"
            className="config-cpsx-upgrade__panel"
          >
            <div className="config-cpsx-upgrade__formulas">
              <div className="config-cpsx-upgrade__formula-head">
                Công thức áp dụng: CP dung môi + keo ghép = (ĐM KEO × Giá KEO +
                ĐM DM ghép × Giá DM ghép) ÷ 1000 → ₫/m²
              </div>

              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <span className="config-cpsx-upgrade__formula-label">
                  KEO  ·  Giá KEO{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietKeo.giaKeo)} ₫/kg
                  </strong>{" "}
                  (TB 319+766)  ·  Giá DM ghép{" "}
                  <strong className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietKeo.giaDungMoi)} ₫/kg
                  </strong>{" "}
                  (DUNG MÔI EA)
                </span>
              </div>
              <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
                <strong className="config-cpsx-upgrade__formula-result">
                  → ({dinhDangSo(chiTietKeo.keoKhoG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietKeo.giaKeo)}
                  </span>{" "}
                  ₫/kg + {dinhDangSo(chiTietKeo.dungMoiPhaKeoG)}g ×{" "}
                  <span className="config-cpsx-upgrade__highlight">
                    {dinhDangVnd(chiTietKeo.giaDungMoi)}
                  </span>{" "}
                  ₫/kg) ÷ 1000 = {dinhDangVnd(chiTietKeo.donGia)} ₫/m²
                </strong>
              </div>
            </div>

            <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
              <table className="config-table config-cpsx-upgrade__table">
                <thead>
                  <tr>
                    <th>Hạng mục</th>
                    <th className="num">Định mức trung bình (g/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Keo khô (dry coat weight)</td>
                    <td className="num">
                      <input
                        type="number"
                        className="config-inline-input"
                        min={0}
                        step={0.1}
                        aria-label="ĐM keo khô"
                        value={dinhMucGhep.keoKhoG}
                        onChange={(e) =>
                          suaGhep({ keoKhoG: docSoThapPhan(e.target.value) })
                        }
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Dung môi pha keo</td>
                    <td className="num">
                      <input
                        type="number"
                        className="config-inline-input"
                        min={0}
                        step={0.1}
                        aria-label="ĐM dung môi pha keo"
                        value={dinhMucGhep.dungMoiPhaKeoG}
                        onChange={(e) =>
                          suaGhep({
                            dungMoiPhaKeoG: docSoThapPhan(e.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="config-note">
              Giá sau (engine): keo = TB 319+766 · DM pha keo = DUNG MÔI EA ·
              quy g → ₫/m² ÷ 1000.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
