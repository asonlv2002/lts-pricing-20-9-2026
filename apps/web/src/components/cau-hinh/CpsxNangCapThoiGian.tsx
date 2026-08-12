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
  chonRuleMayChia,
  chonSetupMayTui,
  chonTocDoMayTui,
  chuanHoaCpsxUpgradeThoiGian,
  tinhThoiGianMayChia,
  tinhThoiGianMayGhep,
  tinhThoiGianMayIn,
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

function tomTatThoiGian(kq: KetQuaThoiGian | null, coInput: boolean): string {
  if (!coInput || !kq) return "—";
  return `${dinhDangSo(kq.tongPhut, 0)} phút`;
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
    print: true,
    laminate: false,
    slit: false,
    bag: false,
  });
  const toggle = (key: MayKey) =>
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  const previewSoMau = result?.input?.numColors ?? 0;
  const previewMetIn = (result?.printMeters ?? 0) + (result?.printWaste ?? 0);
  const soLanGhep = result?.layers?.laminations?.length ?? 0;
  const previewMetGhep = (result?.layers?.laminations ?? []).reduce(
    (sum: number, l: any) => sum + (Number(l?.meters) || 0) + (Number(l?.waste) || 0),
    0,
  );
  const previewMetCat = (result?.cutMeters ?? 0) + (result?.cutWaste ?? 0);
  const previewSoLuongTui = result?.input?.quantity ?? 0;
  const phuMoAuto = (result?.input?.metallicSurcharge ?? 0) > 0;
  const cauTrucMang = String(result?.structureText ?? "");
  const cutStepM = result?.input?.cutStep ?? 0;
  const bagType = String(result?.input?.bagType ?? "");
  const hasZipper = !!result?.input?.hasZipper;

  const [phuMoTay, setPhuMoTay] = React.useState<boolean | null>(null);
  const phuMo = phuMoTay ?? phuMoAuto;

  const autoRuleChia = chonRuleMayChia(state.slit, cauTrucMang, soLanGhep, phuMo);
  const [ruleChiaTay, setRuleChiaTay] = React.useState<string | null>(null);
  const ruleChia =
    state.slit.rules.find((r) => r.key === ruleChiaTay) ?? autoRuleChia;

  const autoSetupTui = chonSetupMayTui(state.bag, bagType, hasZipper, cutStepM);
  const autoTocDoTui = chonTocDoMayTui(state.bag, cutStepM);
  const [setupTuiTay, setSetupTuiTay] = React.useState<string | null>(null);
  const [tocDoTuiTay, setTocDoTuiTay] = React.useState<string | null>(null);
  const setupTui =
    state.bag.setupRules.find((r) => r.key === setupTuiTay) ?? autoSetupTui;
  const tocDoTui =
    state.bag.speedRules.find((r) => r.key === tocDoTuiTay) ?? autoTocDoTui;

  const kqIn = previewMetIn > 0 && previewSoMau > 0
    ? tinhThoiGianMayIn(previewMetIn, previewSoMau, state.print, phuMo)
    : null;
  const kqLaminate = previewMetGhep > 0
    ? tinhThoiGianMayGhep(previewMetGhep, soLanGhep, state.laminate)
    : null;
  const kqSlit = previewMetCat > 0
    ? tinhThoiGianMayChia(previewMetCat, ruleChia)
    : null;
  const kqBag = previewSoLuongTui > 0
    ? tinhThoiGianMayTui(previewSoLuongTui, setupTui, tocDoTui)
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
      summary: tomTatThoiGian(kqIn, previewMetIn > 0 && previewSoMau > 0),
      body: (
        <MayInPanel
          giaTri={state.print}
          capNhat={(patch) => capNhatMay("print", patch)}
          kq={kqIn}
          soMau={previewSoMau}
          metIn={previewMetIn}
          phuMo={phuMo}
          phuMoAuto={phuMoAuto}
          setPhuMo={(v) => setPhuMoTay(v)}
          coInput={previewMetIn > 0 && previewSoMau > 0}
        />
      ),
    },
    {
      key: "laminate",
      title: `Thời gian SX ${MAY_LABELS.laminate}`,
      summary: tomTatThoiGian(kqLaminate, previewMetGhep > 0),
      body: (
        <MayGhepPanel
          giaTri={state.laminate}
          capNhat={(patch) => capNhatMay("laminate", patch)}
          kq={kqLaminate}
          metGhep={previewMetGhep}
          soLanGhep={soLanGhep}
          coInput={previewMetGhep > 0}
        />
      ),
    },
    {
      key: "slit",
      title: `Thời gian SX ${MAY_LABELS.slit}`,
      summary: tomTatThoiGian(kqSlit, previewMetCat > 0),
      body: (
        <MayChiaPanel
          giaTri={state.slit}
          capNhat={(rules) => luu({ ...state, slit: { rules } })}
          kq={kqSlit}
          metChia={previewMetCat}
          ruleChon={ruleChia}
          autoKey={autoRuleChia.key}
          setRuleKey={(k) => setRuleChiaTay(k)}
          coInput={previewMetCat > 0}
        />
      ),
    },
    {
      key: "bag",
      title: `Thời gian SX ${MAY_LABELS.bag}`,
      summary: tomTatThoiGian(kqBag, previewSoLuongTui > 0),
      body: (
        <MayTuiPanel
          giaTri={state.bag}
          capNhat={(patch) => luu({ ...state, bag: { ...state.bag, ...patch } })}
          kq={kqBag}
          soTui={previewSoLuongTui}
          setupChon={setupTui}
          tocDoChon={tocDoTui}
          autoSetupKey={autoSetupTui.key}
          autoTocDoKey={autoTocDoTui.key}
          setSetupKey={(k) => setSetupTuiTay(k)}
          setTocDoKey={(k) => setTocDoTuiTay(k)}
          coInput={previewSoLuongTui > 0}
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
  kq,
  soMau,
  metIn,
  phuMo,
  phuMoAuto,
  setPhuMo,
  coInput,
}: {
  giaTri: CpsxThoiGianMayIn;
  capNhat: (patch: Partial<CpsxThoiGianMayIn>) => void;
  kq: KetQuaThoiGian | null;
  soMau: number;
  metIn: number;
  phuMo: boolean;
  phuMoAuto: boolean;
  setPhuMo: (v: boolean) => void;
  coInput: boolean;
}) {
  const suaSo = (key: keyof CpsxThoiGianMayIn) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayIn>);
  };

  const proof = soMau >= 8 ? giaTri.proofMinutes8 : giaTri.proofMinutes1to7;

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Số màu × (Lên trục + Duyệt mẫu) + Mét ÷ Tốc độ + (Phủ mờ ? Phút phủ mờ : 0)
        </div>
      </div>

      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num">Lên trục (phút/màu)</th>
              <th className="num">Duyệt 1–7 màu (phút)</th>
              <th className="num">Duyệt 8 màu (phút)</th>
              <th className="num">Phủ mờ thêm (phút)</th>
              <th className="num">Tốc độ (m/phút)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Lên trục mỗi màu"
                  value={giaTri.mountMinutesPerColor}
                  onChange={(e) => suaSo("mountMinutesPerColor")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Duyệt mẫu 1 đến 7 màu"
                  value={giaTri.proofMinutes1to7}
                  onChange={(e) => suaSo("proofMinutes1to7")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Duyệt mẫu 8 màu"
                  value={giaTri.proofMinutes8}
                  onChange={(e) => suaSo("proofMinutes8")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="In phủ mờ thêm"
                  value={giaTri.matteExtraMinutes}
                  onChange={(e) => suaSo("matteExtraMinutes")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Tốc độ máy in"
                  value={giaTri.avgSpeedMPerMin}
                  onChange={(e) => suaSo("avgSpeedMPerMin")(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {coInput && kq ? (
        <div className="config-cpsx-upgrade__formulas">
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Input hiện tại: {dinhDangSo(metIn, 0)}m · {soMau} màu
            </span>
            <label className="config-cpsx-upgrade__checkbox">
              <input
                type="checkbox"
                checked={phuMo}
                onChange={(e) => setPhuMo(e.target.checked)}
              />
              Phủ mờ{phuMoAuto ? " (tự nhận: có nhũ/phủ mờ)" : ""}
            </label>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {soMau} màu × ({giaTri.mountMinutesPerColor} + {proof}) ={" "}
              <strong>{dinhDangSo(kq.chiTiet.setupPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Chạy = {dinhDangSo(metIn, 0)}m ÷ {giaTri.avgSpeedMPerMin} ={" "}
              <strong>{dinhDangSo(kq.chiTiet.chayPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Phủ mờ ={" "}
              {phuMo
                ? `+ ${giaTri.matteExtraMinutes} phút`
                : `0 phút (không phủ mờ)`}
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Tổng ={" "}
              <strong className="config-cpsx-upgrade__highlight">
                {dinhDangSo(kq.tongPhut, 0)} phút
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <p className="config-note">
          Chưa có kết quả tính giá — nhập form khách để xem preview thời gian SX.
        </p>
      )}
    </div>
  );
}

// ── Máy ghép ─────────────────────────────────────────────────────────────────

function MayGhepPanel({
  giaTri,
  capNhat,
  kq,
  metGhep,
  soLanGhep,
  coInput,
}: {
  giaTri: CpsxThoiGianMayGhep;
  capNhat: (patch: Partial<CpsxThoiGianMayGhep>) => void;
  kq: KetQuaThoiGian | null;
  metGhep: number;
  soLanGhep: number;
  coInput: boolean;
}) {
  const suaSo = (key: keyof CpsxThoiGianMayGhep) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayGhep>);
  };

  const setup = giaTri.setupFirstMinutes + Math.max(0, soLanGhep - 1) * giaTri.setupNextMinutes;

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Setup đầu + (Số lần ghép − 1) × Setup tiếp + Mét ÷ Tốc độ
        </div>
      </div>

      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num">Setup lần đầu (phút)</th>
              <th className="num">Setup lần tiếp (phút)</th>
              <th className="num">Tốc độ (m/phút)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Setup lần đầu máy ghép"
                  value={giaTri.setupFirstMinutes}
                  onChange={(e) => suaSo("setupFirstMinutes")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Setup lần tiếp theo máy ghép"
                  value={giaTri.setupNextMinutes}
                  onChange={(e) => suaSo("setupNextMinutes")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Tốc độ máy ghép"
                  value={giaTri.avgSpeedMPerMin}
                  onChange={(e) => suaSo("avgSpeedMPerMin")(e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {coInput && kq ? (
        <div className="config-cpsx-upgrade__formulas">
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Input hiện tại: {dinhDangSo(metGhep, 0)}m · {soLanGhep} lần ghép
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {giaTri.setupFirstMinutes} + ({soLanGhep} − 1) × {giaTri.setupNextMinutes} ={" "}
              <strong>{dinhDangSo(setup, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Chạy = {dinhDangSo(metGhep, 0)}m ÷ {giaTri.avgSpeedMPerMin} ={" "}
              <strong>{dinhDangSo(kq.chiTiet.chayPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Tổng ={" "}
              <strong className="config-cpsx-upgrade__highlight">
                {dinhDangSo(kq.tongPhut, 0)} phút
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <p className="config-note">
          Chưa có kết quả tính giá — nhập form khách để xem preview thời gian SX.
        </p>
      )}
    </div>
  );
}

// ── Máy chia ─────────────────────────────────────────────────────────────────

function MayChiaPanel({
  giaTri,
  capNhat,
  kq,
  metChia,
  ruleChon,
  autoKey,
  setRuleKey,
  coInput,
}: {
  giaTri: CpsxThoiGianMayChia;
  capNhat: (rules: CpsxThoiGianRule[]) => void;
  kq: KetQuaThoiGian | null;
  metChia: number;
  ruleChon: CpsxThoiGianRule;
  autoKey: string;
  setRuleKey: (key: string) => void;
  coInput: boolean;
}) {
  const suaRule = (idx: number, patch: Partial<CpsxThoiGianRule>) => {
    capNhat(giaTri.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Setup loại SP + Mét ÷ Tốc độ loại SP — theo bảng dưới
        </div>
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

      {coInput && kq ? (
        <div className="config-cpsx-upgrade__formulas">
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Input hiện tại: {dinhDangSo(metChia, 0)}m
            </span>
            <label className="config-cpsx-upgrade__select">
              Loại SP:
              <select
                value={ruleChon.key}
                onChange={(e) => setRuleKey(e.target.value)}
                aria-label="Chọn loại sản phẩm máy chia"
              >
                {giaTri.rules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              {ruleChon.key === autoKey ? (
                <span className="config-cpsx-upgrade__auto">(tự nhận)</span>
              ) : null}
            </label>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {ruleChon.setupMinutes} phút · Chạy = {dinhDangSo(metChia, 0)}m ÷ {ruleChon.speedMPerMin} ={" "}
              <strong>{dinhDangSo(kq.chiTiet.chayPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Tổng ={" "}
              <strong className="config-cpsx-upgrade__highlight">
                {dinhDangSo(kq.tongPhut, 0)} phút
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <p className="config-note">
          Chưa có kết quả tính giá — nhập form khách để xem preview thời gian SX.
        </p>
      )}
    </div>
  );
}

// ── Máy làm túi ──────────────────────────────────────────────────────────────

function MayTuiPanel({
  giaTri,
  capNhat,
  kq,
  soTui,
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
  soTui: number;
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
      setupRules: giaTri.setupRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };
  const suaTocDo = (idx: number, patch: Partial<CpsxTuiSpeedRule>) => {
    capNhat({
      speedRules: giaTri.speedRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG = Setup loại túi + Số túi ÷ Tốc độ bước cắt
        </div>
      </div>

      <div className="config-cpsx-upgrade__col-title">Setup theo loại túi</div>
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
            {giaTri.setupRules.map((rule, idx) => (
              <tr key={rule.key || idx}>
                <td>
                  <input
                    type="text"
                    className="config-inline-input"
                    value={rule.label}
                    onChange={(e) => suaSetup(idx, { label: e.target.value })}
                    aria-label="Tên loại túi"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="config-inline-input"
                    min={0}
                    step={1}
                    value={rule.setupMinutes}
                    onChange={(e) => suaSetup(idx, { setupMinutes: docSoThapPhan(e.target.value) })}
                    aria-label="Setup loại túi"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="config-print-press-labor__delete"
                    disabled={giaTri.setupRules.length <= 1}
                    onClick={() =>
                      capNhat({
                        setupRules: giaTri.setupRules.filter((_, i) => i !== idx),
                      })
                    }
                    aria-label={`Xóa loại túi ${rule.label || idx + 1}`}
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
                label: `Loại túi ${giaTri.setupRules.length + 1}`,
                setupMinutes: 90,
              },
            ],
          })
        }
      >
        + Thêm loại túi
      </button>

      <div className="config-cpsx-upgrade__col-title">
        Tốc độ theo bước cắt (mm → cái/phút)
      </div>
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th>Bậc bước cắt</th>
              <th className="num">Ngưỡng max (mm)</th>
              <th className="num">Tốc độ (cái/phút)</th>
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
                    value={rule.bagsPerMinute}
                    onChange={(e) => suaTocDo(idx, { bagsPerMinute: docSoThapPhan(e.target.value) })}
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
        style={{ marginTop: "8px" }}
        onClick={() =>
          capNhat({
            speedRules: [
              ...giaTri.speedRules,
              {
                key: `speed_${Date.now()}`,
                label: `Bậc ${giaTri.speedRules.length + 1}`,
                maxStepMm: null,
                bagsPerMinute: 50,
              },
            ],
          })
        }
      >
        + Thêm bậc
      </button>

      {coInput && kq ? (
        <div className="config-cpsx-upgrade__formulas">
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Input hiện tại: {dinhDangSo(soTui, 0)} chiếc
            </span>
            <label className="config-cpsx-upgrade__select">
              Loại túi:
              <select
                value={setupChon.key}
                onChange={(e) => setSetupKey(e.target.value)}
                aria-label="Chọn loại túi"
              >
                {giaTri.setupRules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              {setupChon.key === autoSetupKey ? (
                <span className="config-cpsx-upgrade__auto">(tự nhận)</span>
              ) : null}
            </label>
            <label className="config-cpsx-upgrade__select">
              Bước cắt:
              <select
                value={tocDoChon.key}
                onChange={(e) => setTocDoKey(e.target.value)}
                aria-label="Chọn bậc bước cắt"
              >
                {giaTri.speedRules.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} ({r.bagsPerMinute} cái/phút)
                  </option>
                ))}
              </select>
              {tocDoChon.key === autoTocDoKey ? (
                <span className="config-cpsx-upgrade__auto">(tự nhận)</span>
              ) : null}
            </label>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {setupChon.setupMinutes} phút · Chạy = {dinhDangSo(soTui, 0)} ÷ {tocDoChon.bagsPerMinute} ={" "}
              <strong>{dinhDangSo(kq.chiTiet.chayPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Tổng ={" "}
              <strong className="config-cpsx-upgrade__highlight">
                {dinhDangSo(kq.tongPhut, 0)} phút
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <p className="config-note">
          Chưa có kết quả tính giá — nhập form khách để xem preview thời gian SX.
        </p>
      )}
    </div>
  );
}
