"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_THOIGIAN } from "../../lib/data";
import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayChay,
  CpsxUpgradeThoiGian,
} from "../../lib/types";
import {
  chuanHoaCpsxUpgradeThoiGian,
  tinhThoiGianMayIn,
  tinhThoiGianMayChay,
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

  const capNhatMay = (key: MayKey, patch: Partial<CpsxThoiGianMayIn & CpsxThoiGianMayChay>) => {
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
  const previewMetGhep = (result?.layers?.laminations ?? []).reduce(
    (sum: number, l: any) => sum + (Number(l?.meters) || 0) + (Number(l?.waste) || 0),
    0,
  );
  const previewMetCat = (result?.cutMeters ?? 0) + (result?.cutWaste ?? 0);
  const previewSoLuongTui = result?.input?.quantity ?? 0;

  const kqIn = previewMetIn > 0 && previewSoMau > 0
    ? tinhThoiGianMayIn(previewMetIn, previewSoMau, state.print)
    : null;
  const kqLaminate = previewMetGhep > 0
    ? tinhThoiGianMayChay(previewMetGhep, state.laminate)
    : null;
  const kqSlit = previewMetCat > 0
    ? tinhThoiGianMayChay(previewMetCat, state.slit)
    : null;
  const kqBag = previewSoLuongTui > 0
    ? tinhThoiGianMayChay(previewSoLuongTui, state.bag)
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
          coInput={previewMetIn > 0 && previewSoMau > 0}
        />
      ),
    },
    {
      key: "laminate",
      title: `Thời gian SX ${MAY_LABELS.laminate}`,
      summary: tomTatThoiGian(kqLaminate, previewMetGhep > 0),
      body: (
        <MayChayPanel
          tenMay={MAY_LABELS.laminate}
          giaTri={state.laminate}
          capNhat={(patch) => capNhatMay("laminate", patch)}
          kq={kqLaminate}
          met={previewMetGhep}
          donVi="mét"
          coInput={previewMetGhep > 0}
        />
      ),
    },
    {
      key: "slit",
      title: `Thời gian SX ${MAY_LABELS.slit}`,
      summary: tomTatThoiGian(kqSlit, previewMetCat > 0),
      body: (
        <MayChayPanel
          tenMay={MAY_LABELS.slit}
          giaTri={state.slit}
          capNhat={(patch) => capNhatMay("slit", patch)}
          kq={kqSlit}
          met={previewMetCat}
          donVi="mét"
          coInput={previewMetCat > 0}
        />
      ),
    },
    {
      key: "bag",
      title: `Thời gian SX ${MAY_LABELS.bag}`,
      summary: tomTatThoiGian(kqBag, previewSoLuongTui > 0),
      body: (
        <MayChayPanel
          tenMay={MAY_LABELS.bag}
          giaTri={state.bag}
          capNhat={(patch) => capNhatMay("bag", patch)}
          kq={kqBag}
          met={previewSoLuongTui}
          donVi="chiếc"
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
        Preview lấy từ kết quả tính giá hiện tại (nếu có). Nhập form khách để xem
        số liệu dự kiến. Công thức áp dụng khi engine đọc từ mục này ở giai đoạn sau.
      </p>
    </div>
  );
}

function MayInPanel({
  giaTri,
  capNhat,
  kq,
  soMau,
  metIn,
  coInput,
}: {
  giaTri: CpsxThoiGianMayIn;
  capNhat: (patch: Partial<CpsxThoiGianMayIn>) => void;
  kq: KetQuaThoiGian | null;
  soMau: number;
  metIn: number;
  coInput: boolean;
}) {
  const suaSo = (key: keyof CpsxThoiGianMayIn) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayIn>);
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG (phút) = (số màu × phút setup × 60) ÷ số màu-trong-giờ
          + (mét ÷ tốc độ) × 60 + (nếu ≥ ngưỡng: mét ÷ ngưỡng × 60)
        </div>
      </div>

      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num">Tốc độ (m/giờ)</th>
              <th className="num">Phút setup / 1 màu</th>
              <th className="num">Màu / 1 giờ setup</th>
              <th className="num">Ngưỡng (mét)</th>
              <th className="num">Tốc độ ngắn (m/giờ)</th>
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
                  aria-label="Tốc độ máy in"
                  value={giaTri.tocDoMetPerHour}
                  onChange={(e) => suaSo("tocDoMetPerHour")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Phút setup mỗi màu"
                  value={giaTri.phutSetupMoiMau}
                  onChange={(e) => suaSo("phutSetupMoiMau")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Số màu trong 1 giờ setup"
                  value={giaTri.mauSoGioSetup}
                  onChange={(e) => suaSo("mauSoGioSetup")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Ngưỡng mét"
                  value={giaTri.nguongMet}
                  onChange={(e) => suaSo("nguongMet")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label="Tốc độ ngắn"
                  value={giaTri.tocDoNganMetPerHour}
                  onChange={(e) => suaSo("tocDoNganMetPerHour")(e.target.value)}
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
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {soMau} màu × {giaTri.phutSetupMoiMau} phút × 60 ÷{" "}
              {giaTri.mauSoGioSetup} ={" "}
              <strong>{dinhDangSo(kq.chiTiet.setupPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Chạy = {dinhDangSo(metIn, 0)}m ÷ {giaTri.tocDoMetPerHour} × 60 ={" "}
              <strong>{dinhDangSo(kq.chiTiet.chayPhut, 3)} phút</strong>
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Bonus ={" "}
              {metIn >= giaTri.nguongMet && giaTri.nguongMet > 0
                ? `${dinhDangSo(metIn, 0)}m ÷ ${dinhDangSo(giaTri.nguongMet, 0)} × 60 = ${dinhDangSo(kq.chiTiet.bonusPhut, 3)} phút`
                : `dưới ngưỡng → 0 phút`}
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

function MayChayPanel({
  tenMay,
  giaTri,
  capNhat,
  kq,
  met,
  donVi,
  coInput,
}: {
  tenMay: string;
  giaTri: CpsxThoiGianMayChay;
  capNhat: (patch: Partial<CpsxThoiGianMayChay>) => void;
  kq: KetQuaThoiGian | null;
  met: number;
  donVi: "mét" | "chiếc";
  coInput: boolean;
}) {
  const donViTocDo = donVi === "chiếc" ? "chiếc/giờ" : "m/giờ";
  const suaSo = (key: keyof CpsxThoiGianMayChay) => (raw: string) => {
    const v = docSoThapPhan(raw);
    capNhat({ [key]: v } as Partial<CpsxThoiGianMayChay>);
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-head">
          Công thức: TG (phút) = setup (phút) + ({donVi} ÷ tốc độ) × 60
        </div>
      </div>

      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num">Tốc độ ({donViTocDo})</th>
              <th className="num">Setup (phút)</th>
              <th>Đơn vị</th>
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
                  aria-label={`Tốc độ ${tenMay}`}
                  value={giaTri.tocDoPerHour}
                  onChange={(e) => suaSo("tocDoPerHour")(e.target.value)}
                />
              </td>
              <td className="num">
                <input
                  type="number"
                  className="config-inline-input"
                  min={0}
                  step={1}
                  aria-label={`Setup ${tenMay}`}
                  value={giaTri.phutSetup}
                  onChange={(e) => suaSo("phutSetup")(e.target.value)}
                />
              </td>
              <td className="config-cpsx-upgrade__lock">{donViTocDo}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {coInput && kq ? (
        <div className="config-cpsx-upgrade__formulas">
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Input hiện tại: {dinhDangSo(met, 0)} {donVi}
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Setup = {giaTri.phutSetup} phút
            </span>
          </div>
          <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
            <span className="config-cpsx-upgrade__formula-label">
              Chạy = {dinhDangSo(met, 0)} {donVi} ÷ {giaTri.tocDoPerHour} × 60 ={" "}
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
