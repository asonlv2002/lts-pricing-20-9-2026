"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_INK } from "../../lib/data";
import type { DinhMucGhep, DinhMucInRow } from "../../lib/types";
import {
  chuanHoaDinhMucGhep,
  chuanHoaDinhMucIn,
} from "../../lib/cpsx-upgrade-ink";

function docSoThapPhan(value: string): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function CpsxNangCapDinhMuc() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

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
