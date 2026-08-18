"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_THOIGIAN } from "../../lib/data";
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianMayChia,
  CpsxThoiGianMayTui,
  CpsxThoiGianRule,
  CpsxTuiSetupRule,
  CpsxTuiSpeedRule,
  CpsxUpgradeThoiGian,
} from "../../lib/types";
import {
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
  laSetupBienCoSize,
  metLamTuiTuDauVaoNVL,
  tinhThoiGianMayTui,
  KetQuaThoiGian,
} from "../../lib/cpsx-upgrade-thoigian";

type MayKey = "print" | "laminate" | "slit" | "bag";

const MAY_LABELS: Record<MayKey, string> = {
  print: "Máy in",
  laminate: "Máy ghép",
  slit: "Máy chia",
  bag: "Máy làm túi",
};

function dinhDangSo(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function docSoThapPhan(value: string): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function CpsxNangCapThoiGian() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);
  const result = dungCuaHangTinhGia((s) => s.result);

  const state = React.useMemo(
    () => chuanHoaCpsxUpgradeThoiGian(hangSo.cpsxUpgradeThoiGian, DEFAULT_CPSX_UPGRADE_THOIGIAN),
    [hangSo.cpsxUpgradeThoiGian],
  );

  const luu = (next: CpsxUpgradeThoiGian) => {
    capNhatHangSo("cpsxUpgradeThoiGian", next as never);
  };

  const capNhatMay = (key: MayKey, patch: Partial<CpsxThoiGianMayIn & CpsxThoiGianMayGhep>) => {
    luu({ ...state, [key]: { ...state[key], ...patch } as never });
  };

  const [openMap, setOpenMap] = React.useState<Record<MayKey, boolean>>({
    print: false,
    laminate: false,
    slit: false,
    bag: false,
  });
  const toggle = (key: MayKey) =>
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  const cutStepM = result?.input?.cutStep ?? 0;
  const bagType = String(result?.input?.bagType ?? "");
  const hasZipper = !!result?.input?.hasZipper;

  const metInLamTui = metLamTuiTuDauVaoNVL(result);

  const autoSetupTui = chonSetupMayTui(state.bag, bagType, hasZipper, cutStepM);
  const autoTocDoTui = chonTocDoMayTui(state.bag, cutStepM);
  const [setupTuiTay, setSetupTuiTay] = React.useState<string | null>(null);
  const [tocDoTuiTay, setTocDoTuiTay] = React.useState<string | null>(null);
  /** null = dùng mét từ kết quả tính giá; số = override preview (không lưu engine). */
  const [metChayTay, setMetChayTay] = React.useState<number | null>(null);
  const setupTui =
    state.bag.setupRules.find((r) => r.key === setupTuiTay) ?? autoSetupTui;
  const tocDoTui =
    state.bag.speedRules.find((r) => r.key === tocDoTuiTay) ?? autoTocDoTui;
  const metChayPreview = metChayTay != null ? metChayTay : metInLamTui;

  const kqBag = metChayPreview > 0
    ? tinhThoiGianMayTui(metChayPreview, setupTui, tocDoTui)
    : null;

  const cards: Array<{
    key: MayKey;
    title: string;
    summary: string;
    body: React.ReactNode;
  }> = [
    {
      key: "print",
      title: `Thời gian SX ${MAY_LABELS.print}`,
      summary: "",
      body: (
        <MayInPanel
          giaTri={state.print}
          capNhat={(patch) => capNhatMay("print", patch)}
        />
      ),
    },
    {
      key: "laminate",
      title: `Thời gian SX ${MAY_LABELS.laminate}`,
      summary: "",
      body: (
        <MayGhepPanel
          giaTri={state.laminate}
          capNhat={(patch) => capNhatMay("laminate", patch)}
        />
      ),
    },
    {
      key: "slit",
      title: `Thời gian SX ${MAY_LABELS.slit}`,
      summary: "",
      body: (
        <MayChiaPanel
          giaTri={state.slit}
          capNhat={(rules) => luu({ ...state, slit: { rules } })}
        />
      ),
    },
    {
      key: "bag",
      title: `Thời gian SX ${MAY_LABELS.bag}`,
      summary: "",
      body: (
        <MayTuiPanel
          giaTri={state.bag}
          capNhat={(patch) => luu({ ...state, bag: { ...state.bag, ...patch } })}
          kq={kqBag}
          metChay={metChayPreview}
          metAuto={metInLamTui}
          metTay={metChayTay != null}
          setMetChay={(m) => setMetChayTay(m)}
          setupChon={setupTui}
          tocDoChon={tocDoTui}
          autoSetupKey={autoSetupTui.key}
          autoTocDoKey={autoTocDoTui.key}
          setSetupKey={(k) => setSetupTuiTay(k)}
          setTocDoKey={(k) => setTocDoTuiTay(k)}
          coInput={metChayPreview > 0}
        />
      ),
    },
  ];

  return (
    <div className="config-cpsx-upgrade-thoigian">
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
                aria-controls={`cpsx-thoigian-body-${key}`}
                aria-label={open ? "Thu gọn" : "Mở rộng"}
              >
                {open ? "▾ Thu gọn" : "▸ Mở rộng"}
              </button>
            </div>
            {open && <div id={`cpsx-thoigian-body-${key}`}>{body}</div>}
          </div>
        );
      })}
      <p className="config-note">
        Tham số giống Chi phí sản xuất thường. Preview lấy từ kết quả tính giá
        hiện tại (nếu có). Công thức áp dụng khi engine đọc từ mục này ở giai đoạn sau.
      </p>
    </div>
  );
}

// ── Máy in ───────────────────────────────────────────────────────────────────

function MayInPanel({
  giaTri,
  capNhat,
}: {
  giaTri: CpsxThoiGianMayIn;
  capNhat: (patch: Partial<CpsxThoiGianMayIn>) => void;
}) {
  const suaSo = (key: keyof CpsxThoiGianMayIn) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayIn>);
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Số màu in × Thời gian lên trục + Thời gian duyệt mẫu + (Số mét phi hao + Số mét thành phẩm in) ÷ Tốc độ trung bình
        </div>
      </div>

      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Thời gian lên trục:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Lên trục mỗi màu"
            value={giaTri.mountMinutesPerColor}
            onChange={(e) => suaSo("mountMinutesPerColor")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút/màu</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Thời gian duyệt mẫu:</span>
          <span className="config-cpsx-upgrade__formula-label">từ 1–7 màu:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Duyệt mẫu 1 đến 7 màu"
            value={giaTri.proofMinutes1to7}
            onChange={(e) => suaSo("proofMinutes1to7")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút,</span>
          <span className="config-cpsx-upgrade__formula-label">8 màu:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Duyệt mẫu 8 màu"
            value={giaTri.proofMinutes8}
            onChange={(e) => suaSo("proofMinutes8")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Nếu có in phủ mờ:</span>
          <span className="config-cpsx-upgrade__formula-op">+</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="In phủ mờ thêm"
            value={giaTri.matteExtraMinutes}
            onChange={(e) => suaSo("matteExtraMinutes")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Tốc độ trung bình:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Tốc độ máy in"
            value={giaTri.avgSpeedMPerMin}
            onChange={(e) => suaSo("avgSpeedMPerMin")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">m/phút</span>
        </div>
      </div>
    </div>
  );
}

// ── Máy ghép ─────────────────────────────────────────────────────────────────

function MayGhepPanel({
  giaTri,
  capNhat,
}: {
  giaTri: CpsxThoiGianMayGhep;
  capNhat: (patch: Partial<CpsxThoiGianMayGhep>) => void;
}) {
  const suaSo = (key: keyof CpsxThoiGianMayGhep) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayGhep>);
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Thời gian setup + (Số mét phi hao + Số mét thành phẩm) ÷ Tốc độ trung bình
        </div>
      </div>

      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Thời gian set up lần 1:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Setup lần đầu máy ghép"
            value={giaTri.setupFirstMinutes}
            onChange={(e) => suaSo("setupFirstMinutes")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút,</span>
          <span className="config-cpsx-upgrade__formula-label">các lần tiếp theo:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Setup lần tiếp theo máy ghép"
            value={giaTri.setupNextMinutes}
            onChange={(e) => suaSo("setupNextMinutes")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">phút</span>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">Tốc độ trung bình:</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Tốc độ máy ghép"
            value={giaTri.avgSpeedMPerMin}
            onChange={(e) => suaSo("avgSpeedMPerMin")(e.target.value)}
          />
          <span className="config-cpsx-upgrade__formula-label">m/phút</span>
        </div>
      </div>
    </div>
  );
}

// ── Máy chia ─────────────────────────────────────────────────────────────────

function MayChiaPanel({
  giaTri,
  capNhat,
}: {
  giaTri: CpsxThoiGianMayChia;
  capNhat: (rules: CpsxThoiGianRule[]) => void;
}) {
  const suaRule = (idx: number, patch: Partial<CpsxThoiGianRule>) => {
    capNhat(giaTri.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Thời gian setup + (Số mét phi hao + Số mét thành phẩm) ÷ Tốc độ trung bình
        </div>
      </div>

      <div className="config-cpsx-upgrade__col-title">
        Thời gian set up và tốc độ trung bình phụ thuộc vào từng loại sản phẩm:
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại sản phẩm</th>
              <th className="num">Setup (phút)</th>
              <th className="num">Tốc độ (m/phút)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {giaTri.rules.map((rule, idx) => (
              <tr key={rule.key || idx}>
                <td>
                  <input
                    type="text"
                    className="config-inline-input"
                    value={rule.label}
                    onChange={(e) => suaRule(idx, { label: e.target.value })}
                    aria-label="Tên loại sản phẩm"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.setupMinutes}
                    onChange={(e) => suaRule(idx, { setupMinutes: docSoThapPhan(e.target.value) })}
                    aria-label="Setup loại sản phẩm"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.speedMPerMin}
                    onChange={(e) => suaRule(idx, { speedMPerMin: docSoThapPhan(e.target.value) })}
                    aria-label="Tốc độ loại sản phẩm"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="config-print-press-labor__delete"
                    disabled={giaTri.rules.length <= 1}
                    onClick={() =>
                      capNhat(giaTri.rules.filter((_, i) => i !== idx))
                    }
                    aria-label={`Xóa loại ${rule.label || idx + 1}`}
                    title="Xóa loại"
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
        className="btn btn-sm btn-outline"
        style={{ marginTop: "8px" }}
        onClick={() =>
          capNhat([
            ...giaTri.rules,
            {
              key: `rule_${Date.now()}`,
              label: `Loại ${giaTri.rules.length + 1}`,
              setupMinutes: 20,
              speedMPerMin: 100,
            },
          ])
        }
      >
        + Thêm loại
      </button>
    </div>
  );
}

// ── Máy làm túi ──────────────────────────────────────────────────────────────

function MayTuiPanel({
  giaTri,
  capNhat,
  kq,
  metChay,
  metAuto,
  metTay,
  setMetChay,
  setupChon,
  tocDoChon,
  autoSetupKey,
  autoTocDoKey,
  setSetupKey,
  setTocDoKey,
  coInput,
}: {
  giaTri: CpsxThoiGianMayTui;
  capNhat: (patch: Partial<CpsxThoiGianMayTui>) => void;
  kq: KetQuaThoiGian | null;
  metChay: number;
  metAuto: number;
  metTay: boolean;
  setMetChay: (m: number) => void;
  setupChon: CpsxTuiSetupRule;
  tocDoChon: CpsxTuiSpeedRule;
  autoSetupKey: string;
  autoTocDoKey: string;
  setSetupKey: (key: string) => void;
  setTocDoKey: (key: string) => void;
  coInput: boolean;
}) {
  const suaSetup = (idx: number, patch: Partial<CpsxTuiSetupRule>) => {
    capNhat({
      setupRules: giaTri.setupRules.map((r, i) =>
        i === idx ? { ...r, ...patch } : r,
      ),
    });
  };
  const suaTocDo = (idx: number, patch: Partial<CpsxTuiSpeedRule>) => {
    capNhat({
      speedRules: giaTri.speedRules.map((r, i) =>
        i === idx ? { ...r, ...patch } : r,
      ),
    });
  };

  const dsBien = giaTri.setupRules
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => laSetupBienCoSize(r));
  const dsKhac = giaTri.setupRules
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => !laSetupBienCoSize(r));

  const xoaSetupTai = (idx: number) => {
    if (giaTri.setupRules.length <= 1) return;
    capNhat({
      setupRules: giaTri.setupRules.filter((_, i) => i !== idx),
    });
  };

  const suaBuocCatBien = (
    idx: number,
    op: "lte" | "gt",
  ) => {
    const cur = giaTri.setupRules[idx];
    const max = cur?.maxStepMm != null && cur.maxStepMm > 0 ? cur.maxStepMm : 300;
    suaSetup(idx, { stepOp: op, maxStepMm: max });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Setup loại túi + (Số mét phi hao + Số mét thành phẩm) ÷ Tốc độ trung bình
        </div>
      </div>

      <div className="config-cpsx-upgrade__col-title">
        Trong đó thời gian set up — túi 3 biên / 4 biên (theo bước cắt):
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại túi</th>
              <th>Bước cắt</th>
              <th className="num">Setup (phút)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dsBien.map(({ r: rule, idx }) => (
              <tr key={rule.key || idx}>
                <td>
                  <input
                    type="text"
                    className="config-inline-input"
                    value={rule.label}
                    onChange={(e) => suaSetup(idx, { label: e.target.value })}
                    aria-label="Tên loại túi 3/4 biên"
                  />
                </td>
                <td>
                  <select
                    className="config-inline-input"
                    value={
                      rule.stepOp === "gt"
                        ? "gt"
                        : rule.stepOp === "lte"
                          ? "lte"
                          : "lte"
                    }
                    onChange={(e) =>
                      suaBuocCatBien(
                        idx,
                        e.target.value === "gt" ? "gt" : "lte",
                      )
                    }
                    aria-label="Bậc bước cắt"
                  >
                    <option value="lte">
                      ≤ {(rule.maxStepMm ?? 300) / 10} cm
                    </option>
                    <option value="gt">
                      &gt; {(rule.maxStepMm ?? 300) / 10} cm
                    </option>
                  </select>
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.setupMinutes}
                    onChange={(e) =>
                      suaSetup(idx, {
                        setupMinutes: docSoThapPhan(e.target.value),
                      })
                    }
                    aria-label="Setup phút 3/4 biên"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="config-print-press-labor__delete"
                    disabled={dsBien.length <= 1}
                    onClick={() => xoaSetupTai(idx)}
                    aria-label={`Xóa ${rule.label || "dòng"}`}
                    title="Xóa dòng"
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
        className="btn btn-sm btn-outline"
        style={{ marginTop: "8px", marginBottom: "14px" }}
        onClick={() =>
          capNhat({
            setupRules: [
              ...giaTri.setupRules,
              {
                key: `3bien_le30_${Date.now()}`,
                label: "Túi 3 biên",
                setupMinutes: 90,
                maxStepMm: 300,
                stepOp: "lte",
              },
            ],
          })
        }
      >
        + Thêm dòng 3/4 biên
      </button>

      <div className="config-cpsx-upgrade__col-title">
        Trong đó thời gian set up — loại khác:
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Loại túi</th>
              <th className="num">Setup (phút)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dsKhac.map(({ r: rule, idx }) => (
              <tr key={rule.key || idx}>
                <td>
                  <input
                    type="text"
                    className="config-inline-input"
                    value={rule.label}
                    onChange={(e) => suaSetup(idx, { label: e.target.value })}
                    aria-label="Tên loại túi khác"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.setupMinutes}
                    onChange={(e) =>
                      suaSetup(idx, {
                        setupMinutes: docSoThapPhan(e.target.value),
                      })
                    }
                    aria-label="Setup phút loại khác"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="config-print-press-labor__delete"
                    disabled={dsKhac.length <= 1 && dsBien.length === 0}
                    onClick={() => xoaSetupTai(idx)}
                    aria-label={`Xóa ${rule.label || "loại túi"}`}
                    title="Xóa loại túi"
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
        className="btn btn-sm btn-outline"
        style={{ marginTop: "8px", marginBottom: "14px" }}
        onClick={() =>
          capNhat({
            setupRules: [
              ...giaTri.setupRules,
              {
                key: `setup_${Date.now()}`,
                label: `Loại túi ${dsKhac.length + 1}`,
                setupMinutes: 90,
                maxStepMm: null,
                stepOp: null,
              },
            ],
          })
        }
      >
        + Thêm loại khác
      </button>

      <div className="config-cpsx-upgrade__col-title">
        Trong đó tốc độ trung bình phụ thuộc bảng sau:
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Bậc bước cắt</th>
              <th className="num">Ngưỡng max (mm)</th>
              <th className="num">Tốc độ (m/phút)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {giaTri.speedRules.map((rule, idx) => (
              <tr key={rule.key || idx}>
                <td>
                  <input
                    type="text"
                    className="config-inline-input"
                    value={rule.label}
                    onChange={(e) => suaTocDo(idx, { label: e.target.value })}
                    aria-label="Tên bậc bước cắt"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.maxStepMm ?? ""}
                    onChange={(e) =>
                      suaTocDo(idx, {
                        maxStepMm:
                          e.target.value === ""
                            ? null
                            : Math.max(0, docSoThapPhan(e.target.value)),
                      })
                    }
                    aria-label="Ngưỡng max bước cắt"
                    placeholder="không trần"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.speedMPerMin}
                    onChange={(e) => suaTocDo(idx, { speedMPerMin: docSoThapPhan(e.target.value) })}
                    aria-label="Tốc độ bậc bước cắt"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="config-print-press-labor__delete"
                    disabled={giaTri.speedRules.length <= 1}
                    onClick={() =>
                      capNhat({
                        speedRules: giaTri.speedRules.filter((_, i) => i !== idx),
                      })
                    }
                    aria-label={`Xóa bậc ${rule.label || idx + 1}`}
                    title="Xóa bậc"
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
        className="btn btn-sm btn-outline"
        style={{ marginTop: "8px", marginBottom: "14px" }}
        onClick={() =>
          capNhat({
            speedRules: [
              ...giaTri.speedRules,
              {
                key: `speed_${Date.now()}`,
                label: `Bậc ${giaTri.speedRules.length + 1}`,
                maxStepMm: null,
                speedMPerMin: 50,
              },
            ],
          })
        }
      >
        + Thêm bậc
      </button>

      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức áp dụng: TG = Setup + Mét chạy ÷ Tốc độ TB → phút
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Mét chạy</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            min={0}
            step={1}
            aria-label="Mét chạy"
            value={Number.isFinite(metChay) ? metChay : 0}
            onChange={(e) => setMetChay(docSoThapPhan(e.target.value))}
          />
          <span className="config-cpsx-upgrade__formula-label">m</span>
          {!metTay && metAuto > 0 ? (
            <span className="config-cpsx-upgrade__auto">(từ tính giá)</span>
          ) : metTay ? (
            <span className="config-cpsx-upgrade__formula-note">preview tay</span>
          ) : null}
          <span className="config-cpsx-upgrade__formula-note">
            (TP cắt + phi hao) × phần tử chia
          </span>
        </div>

        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Loại túi · Setup{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {setupChon.setupMinutes} phút
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <label className="config-cpsx-upgrade__select">
            <select
              value={setupChon.key}
              onChange={(e) => setSetupKey(e.target.value)}
              aria-label="Chọn loại túi"
            >
              {giaTri.setupRules.map((r) => (
                <option key={r.key} value={r.key}>
                  {laSetupBienCoSize(r) && r.stepOp
                    ? `${r.label} (${r.stepOp === "lte" ? "≤" : ">"}${((r.maxStepMm ?? 300) / 10)}cm)`
                    : r.label}
                </option>
              ))}
            </select>
            {setupChon.key === autoSetupKey ? (
              <span className="config-cpsx-upgrade__auto">(tự nhận)</span>
            ) : null}
          </label>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            Setup = {setupChon.setupMinutes} phút
          </strong>
        </div>

        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">
            Bước cắt ·{" "}
            <strong className="config-cpsx-upgrade__highlight">
              {tocDoChon.speedMPerMin} m/phút
            </strong>
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <label className="config-cpsx-upgrade__select">
            <select
              value={tocDoChon.key}
              onChange={(e) => setTocDoKey(e.target.value)}
              aria-label="Chọn bậc bước cắt"
            >
              {giaTri.speedRules.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} ({r.speedMPerMin} m/phút)
                </option>
              ))}
            </select>
            {tocDoChon.key === autoTocDoKey ? (
              <span className="config-cpsx-upgrade__auto">(tự nhận)</span>
            ) : null}
          </label>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            {coInput && kq
              ? `(${dinhDangSo(metChay, 0)} m ÷ ${tocDoChon.speedMPerMin}) = ${dinhDangSo(kq.chiTiet.chayPhut, 3)} phút`
              : `(mét ÷ ${tocDoChon.speedMPerMin}) = — phút`}
          </strong>
        </div>

        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <span className="config-cpsx-upgrade__formula-label">Tổng</span>
          <span className="config-cpsx-upgrade__formula-op">→</span>
          <strong className="config-cpsx-upgrade__formula-result">
            <span className="config-cpsx-upgrade__highlight">
              {coInput && kq ? `${dinhDangSo(kq.tongPhut, 0)} phút` : "— phút"}
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
}
