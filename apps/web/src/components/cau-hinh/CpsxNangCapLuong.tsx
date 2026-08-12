"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { DEFAULT_CPSX_UPGRADE_LABOR } from "../../lib/data";
import type {
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
} from "../../lib/types";
import {
  boDau,
  chenDonVi,
  chuanHoaCpsxUpgradeLabor,
  luongMoiPhutAp,
  luongMoiPhutTinh,
  luongTbTui,
  soCongNhanTui,
  soNguoiMoiCa1May,
  SO_GIO_MOT_CA,
  tangCaTheoTongLuong,
  tangCaTui,
  TEN_SO_HANG_RE,
  tienComSangTui,
  tienComToiTui,
  tinhBieuThuc,
  tongLuong,
  xoaDonViTai,
} from "../../lib/cpsx-upgrade-labor";

function dinhDangVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function docSoVnd(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function NumberVndInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState<string>(
    value === 0 ? "0" : dinhDangVnd(value),
  );

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(value === 0 ? "0" : dinhDangVnd(value));
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className={className}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(docSoVnd(e.target.value));
      }}
      onBlur={() => {
        setText(value === 0 ? "0" : dinhDangVnd(value));
      }}
    />
  );
}

type May1Key = "print" | "laminate" | "slit";
type MayKey = May1Key | "bag";

export default function CpsxNangCapLuong() {
  const hangSo = dungCuaHangTinhGia((s) => s.constants);
  const capNhatHangSo = dungCuaHangTinhGia((s) => s.setConstantParam);

  const state = React.useMemo(
    () =>
      chuanHoaCpsxUpgradeLabor(
        hangSo.cpsxUpgradeLabor,
        DEFAULT_CPSX_UPGRADE_LABOR,
      ),
    [hangSo.cpsxUpgradeLabor],
  );

  const luu = (next: CpsxUpgradeLabor) => {
    capNhatHangSo("cpsxUpgradeLabor", next as never);
  };

  const capNhat1May = (
    key: May1Key,
    patch: Partial<CpsxUpgradeLabor1May>,
  ) => {
    luu({ ...state, [key]: { ...state[key], ...patch } });
  };
  const capNhatTui = (patch: Partial<CpsxUpgradeLaborTui>) => {
    luu({ ...state, bag: { ...state.bag, ...patch } });
  };

  const [openMap, setOpenMap] = React.useState<Record<MayKey, boolean>>({
    print: true,
    laminate: false,
    slit: false,
    bag: false,
  });
  const toggle = (key: MayKey) =>
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  const tomTat1May = (key: May1Key) => {
    const g = state[key];
    const v = luongMoiPhutTinh(
      g.wages,
      g.hoursPerDay,
      g.mealMorning,
      g.mealEvening,
      g.otFactor,
      undefined,
      g.tyLeTangCa,
    );
    return `${dinhDangVnd(v)} ₫/phút`;
  };

  const tomTatTui = () => {
    const g = state.bag;
    return `${dinhDangVnd(
      luongMoiPhutAp(
        luongMoiPhutTinh(
          g.wages,
          g.hoursPerDay,
          g.mealMorning,
          g.mealEvening,
          g.otFactor,
          soCongNhanTui(g.wages),
          g.tyLeTangCa,
        ),
        g.roundedPerMin,
      ),
    )} ₫/phút`;
  };

  const cards: Array<{
    key: MayKey;
    title: string;
    summary: string;
    body: React.ReactNode;
  }> = [
    {
      key: "print",
      title: "Lương công nhân máy in",
      summary: tomTat1May("print"),
      body: (
        <May1May
          tenMay="Máy in"
          giaTri={state.print}
          capNhat={(patch) => capNhat1May("print", patch)}
          hienSoMay
          hienMayTinh
        />
      ),
    },
    {
      key: "laminate",
      title: "Lương công nhân máy ghép",
      summary: tomTat1May("laminate"),
      body: (
        <May1May
          tenMay="Máy ghép"
          giaTri={state.laminate}
          capNhat={(patch) => capNhat1May("laminate", patch)}
        />
      ),
    },
    {
      key: "slit",
      title: "Lương công nhân máy chia",
      summary: tomTat1May("slit"),
      body: (
        <May1May
          tenMay="Máy chia"
          giaTri={state.slit}
          capNhat={(patch) => capNhat1May("slit", patch)}
        />
      ),
    },
    {
      key: "bag",
      title: "Lương công nhân máy làm túi",
      summary: tomTatTui(),
      body: <MayTui giaTri={state.bag} capNhat={capNhatTui} />,
    },
  ];

  return (
    <div className="config-cpsx-upgrade-labor">
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
                aria-controls={`cpsx-luong-body-${key}`}
                aria-label={open ? "Thu gọn" : "Mở rộng"}
              >
                {open ? "▾ Thu gọn" : "▸ Mở rộng"}
              </button>
            </div>
            {open && (
              <div id={`cpsx-luong-body-${key}`}>{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function May1May({
  tenMay,
  giaTri,
  capNhat,
  hienSoMay = false,
  hienMayTinh = false,
}: {
  tenMay: string;
  giaTri: CpsxUpgradeLabor1May;
  capNhat: (patch: Partial<CpsxUpgradeLabor1May>) => void;
  hienSoMay?: boolean;
  hienMayTinh?: boolean;
}) {
  const soCN = giaTri.wages.length;
  const soNguoiMoiCa = giaTri.peoplePerShift != null
    ? giaTri.peoplePerShift
    : soNguoiMoiCa1May(giaTri.wages, giaTri.shiftCount);
  const tongL = tongLuong(giaTri.wages);
  const tienComSang = (Number(giaTri.mealMorning) || 0) * soCN / 2;
  const tienComToi = (Number(giaTri.mealEvening) || 0) * soCN / 2;
  const tangCa = tangCaTheoTongLuong(giaTri.wages, giaTri.otFactor, giaTri.tyLeTangCa, giaTri.otHours);
  const ketQua = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
    undefined,
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );

  const suaLuong = (idx: number, val: string) => {
    const next = [...giaTri.wages];
    next[idx] = docSoVnd(val);
    capNhat({ wages: next });
  };
  const themCN = () => {
    capNhat({ wages: [...giaTri.wages, 500000] });
  };
  const xoaCN = (idx: number) => {
    if (giaTri.wages.length <= 1) return;
    capNhat({ wages: giaTri.wages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num" style={{ width: 48 }}>
                STT
              </th>
              <th>Vai trò / CN</th>
              <th className="num">Lương (₫/ca)</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {giaTri.wages.map((wage, idx) => (
              <tr key={idx}>
                <td className="num config-cpsx-upgrade__lock">{idx + 1}</td>
                <td className="config-cpsx-upgrade__lock">CN {idx + 1}</td>
                <td className="num">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="config-inline-input"
                    aria-label={`Lương CN ${idx + 1} mỗi ca`}
                    value={dinhDangVnd(wage)}
                    onChange={(e) => suaLuong(idx, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                    disabled={giaTri.wages.length <= 1}
                    onClick={() => xoaCN(idx)}
                    aria-label={`Xóa CN ${idx + 1}`}
                  >
                    <Trash2 size={14} />
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
        onClick={themCN}
      >
        + Thêm công nhân
      </button>

      <div className="config-cpsx-upgrade__meta-grid">
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Tổng lương</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tongL)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Số công nhân</span>
          <strong className="config-cpsx-upgrade__meta-value">{soCN}</strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Số ca</span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`Số ca — ${tenMay}`}
            min={1}
            max={2}
            step={1}
            value={giaTri.shiftCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              capNhat({
                shiftCount: v === 1 || v === 2 ? v : giaTri.shiftCount,
              });
            }}
          />
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            SL người / ca
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`SL người mỗi ca — ${tenMay}`}
            min={1}
            step={1}
            value={soNguoiMoiCa}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                peoplePerShift:
                  Number.isFinite(v) && v > 0 ? Math.floor(v) : null,
              });
            }}
          />
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số giờ máy / ngày
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__meta-input"
            aria-label={`Giờ máy hoạt động mỗi ngày — ${tenMay}`}
            min={1}
            max={24}
            step={1}
            value={giaTri.hoursPerDay}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                hoursPerDay:
                  Number.isFinite(v) && v > 0
                    ? Math.min(24, v)
                    : giaTri.hoursPerDay,
              });
            }}
          />
        </div>
        {hienSoMay && (
          <div className="config-cpsx-upgrade__meta-item">
            <span className="config-cpsx-upgrade__meta-label">
              Số máy hoạt động / ngày
            </span>
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__meta-input"
              aria-label={`Số máy hoạt động mỗi ngày — ${tenMay}`}
              min={1}
              step={1}
              value={giaTri.machinesPerDay}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  machinesPerDay:
                    Number.isFinite(v) && v > 0
                      ? Math.floor(v)
                      : giaTri.machinesPerDay,
                });
              }}
            />
          </div>
        )}
      </div>

      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tiền cơm ca sáng =
          </span>
          <NumberVndInput
            className="config-inline-input config-cpsx-upgrade__formula-input"
            ariaLabel="Cơm sáng mỗi người"
            value={giaTri.mealMorning}
            onChange={(v) => capNhat({ mealMorning: v })}
          />
          <span className="config-cpsx-upgrade__formula-op">
            × {soCN} / 2 =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tienComSang)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tiền cơm ca tối =
          </span>
          <NumberVndInput
            className="config-inline-input config-cpsx-upgrade__formula-input"
            ariaLabel="Cơm tối mỗi người"
            value={giaTri.mealEvening}
            onChange={(v) => capNhat({ mealEvening: v })}
          />
          <span className="config-cpsx-upgrade__formula-op">
            × {soCN} / 2 =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tienComToi)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tổng tiền tăng ca n giờ = (Tổng lương ÷ {SO_GIO_MOT_CA} × n) ×
            Hệ số tăng ca × Tỉ lệ tăng ca
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} ÷ {SO_GIO_MOT_CA} ×{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Số giờ tăng ca"
              min={0}
              step={0.5}
              value={giaTri.otHours}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  otHours:
                    Number.isFinite(v) && v >= 0 ? v : giaTri.otHours,
                });
              }}
            />
            {") × "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Hệ số tăng ca"
              min={0}
              step={0.1}
              value={giaTri.otFactor}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  otFactor:
                    Number.isFinite(v) && v > 0 ? v : giaTri.otFactor,
                });
              }}
            />{" "}
            ×{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Tỉ lệ tăng ca (%)"
              min={0}
              max={100}
              step={1}
              value={Math.round(giaTri.tyLeTangCa * 100)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  tyLeTangCa:
                    Number.isFinite(v) && v >= 0 && v <= 100
                      ? v / 100
                      : giaTri.tyLeTangCa,
                });
              }}
            />{" "}
            % = {dinhDangVnd(tangCa)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Lương CN mỗi phút = (Tổng lương + Tăng ca + Cơm sáng + Cơm tối)
            ÷ Số giờ/ngày ÷ 60
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} + {dinhDangVnd(tangCa)} +{" "}
            {dinhDangVnd(tienComSang)} + {dinhDangVnd(tienComToi)}) ÷{" "}
            {giaTri.hoursPerDay} ÷ 60 = {dinhDangVnd(ketQua)} ₫/phút
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__applied">
        <label>{tenMay} / phút</label>
        <strong className="config-cpsx-upgrade__applied-value">
          {dinhDangVnd(ketQua)}
        </strong>
        <span className="config-cpsx-upgrade__unit">₫/phút</span>
      </div>

      {hienMayTinh && (
        <MayTinhThamKhao giaTri={giaTri} />
      )}
    </div>
  );
}

function MayTinhThamKhao({
  giaTri,
}: {
  giaTri: CpsxUpgradeLabor1May;
}) {
  const [donVi, setDonVi] = React.useState<string[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const bieuThuc = donVi.join("");

  const tongL = tongLuong(giaTri.wages);
  const soCN = giaTri.wages.length;
  const soNguoiMoiCa = giaTri.peoplePerShift != null
    ? giaTri.peoplePerShift
    : soNguoiMoiCa1May(giaTri.wages, giaTri.shiftCount);
  const tienComSang = (Number(giaTri.mealMorning) || 0) * soCN / 2;
  const tienComToi = (Number(giaTri.mealEvening) || 0) * soCN / 2;
  const tangCa = tangCaTheoTongLuong(
    giaTri.wages,
    giaTri.otFactor,
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );

  const soHang: Record<string, number> = {
    tongluong: tongL,
    comcasang: tienComSang,
    comcatoi: tienComToi,
    tangca: tangCa,
    soca: giaTri.shiftCount,
    slnguoica: soNguoiMoiCa,
    sogiomayngay: giaTri.hoursPerDay,
    somayhoatdongngay: giaTri.machinesPerDay,
    sogiotangca: giaTri.otHours,
    hesotangca: giaTri.otFactor,
    tiletangca: giaTri.tyLeTangCa,
    socongnhan: soCN,
  };

  const nutChon: { bieuThuc: string; nhan: string }[] = [
    { bieuThuc: "Tổng lương", nhan: "Tổng lương" },
    { bieuThuc: "Cơm ca sáng", nhan: "Cơm ca sáng" },
    { bieuThuc: "Cơm ca tối", nhan: "Cơm ca tối" },
    { bieuThuc: "Tăng ca", nhan: "Tăng ca" },
    { bieuThuc: "Số ca", nhan: "Số ca" },
    { bieuThuc: "SL người / ca", nhan: "SL người / ca" },
    { bieuThuc: "Số giờ máy / ngày", nhan: "Số giờ máy / ngày" },
    { bieuThuc: "Số máy hoạt động / ngày", nhan: "Số máy hoạt động / ngày" },
    { bieuThuc: "Số giờ tăng ca", nhan: "Số giờ tăng ca" },
    { bieuThuc: "Hệ số tăng ca", nhan: "Hệ số tăng ca" },
    { bieuThuc: "Tỉ lệ tăng ca", nhan: "Tỉ lệ tăng ca" },
    { bieuThuc: "Số công nhân", nhan: "Số công nhân" },
    { bieuThuc: "60", nhan: "60 phút" },
    { bieuThuc: "24", nhan: "24 giờ" },
  ];
  const dauToan: string[] = ["+", "−", "×", "÷", "(", ")", "%"];

  /** Chèn 1 đơn vị tại khe đang có con trỏ; con trỏ nhảy sang khe sau */
  const them = (s: string) => {
    const kq = chenDonVi(donVi, cursor, s);
    setDonVi(kq.mang);
    setCursor(kq.cursorMoi);
  };

  /** Xóa nguyên 1 đơn vị (bấm × trên box) */
  const xoaTai = (i: number) => {
    const kq = xoaDonViTai(donVi, i);
    setDonVi(kq.mang);
    setCursor(kq.cursorMoi);
  };

  /** ⌫: xóa 1 đơn vị ngay trước con trỏ */
  const xoaPhiaTruoc = () => {
    if (cursor === 0) return;
    xoaTai(cursor - 1);
  };

  /** C: xóa hết */
  const xoaHet = () => {
    setDonVi([]);
    setCursor(0);
  };

  const giaTriTinh = tinhBieuThuc(bieuThuc, soHang);
  const hangSo = bieuThuc.replace(TEN_SO_HANG_RE, (ten) => {
    const key = boDau(ten);
    return key && key in soHang ? dinhDangVnd(soHang[key]) : ten;
  });

  return (
    <div className="config-cpsx-upgrade__calc">
      <div className="config-cpsx-upgrade__calc-title">Máy tính tham khảo</div>
      <div className="config-cpsx-upgrade__calc-chips">
        {nutChon.map(({ bieuThuc: bt, nhan }) => (
          <button
            key={nhan}
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
            onClick={() => them(bt)}
            aria-label={`Chèn ${nhan}`}
          >
            {nhan}
          </button>
        ))}
      </div>
      <div className="config-cpsx-upgrade__calc-chips config-cpsx-upgrade__calc-chips--ops">
        {dauToan.map((d) => (
          <button
            key={d}
            type="button"
            className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
            onClick={() => them(d)}
            aria-label={`Chèn dấu ${d}`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
          onClick={xoaPhiaTruoc}
          aria-label="Xóa 1 thành phần phía trước con trỏ"
        >
          ⌫
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline config-cpsx-upgrade__calc-chip"
          onClick={xoaHet}
          aria-label="Xóa hết biểu thức"
        >
          C
        </button>
      </div>
      <div className="config-cpsx-upgrade__calc-rows">
        <div className="config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--tokens">
          <span className="config-cpsx-upgrade__calc-label">
            Lương CN mỗi phút =
          </span>
          <div className="config-cpsx-upgrade__calc-tokens">
            {donVi.map((dv, i) => (
              <React.Fragment key={i}>
                <button
                  type="button"
                  className="config-cpsx-upgrade__calc-gap"
                  onClick={() => setCursor(i)}
                  aria-label="Đặt con trỏ tại khe này"
                >
                  {cursor === i && (
                    <span className="config-cpsx-upgrade__calc-caret" />
                  )}
                </button>
                <span
                  className="config-cpsx-upgrade__calc-token"
                  onClick={() => setCursor(i + 1)}
                >
                  <span className="config-cpsx-upgrade__calc-token-text">
                    {dv}
                  </span>
                  <button
                    type="button"
                    className="config-cpsx-upgrade__calc-token-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      xoaTai(i);
                    }}
                    aria-label={`Xóa ${dv}`}
                  >
                    ×
                  </button>
                </span>
              </React.Fragment>
            ))}
            <button
              type="button"
              className="config-cpsx-upgrade__calc-gap"
              onClick={() => setCursor(donVi.length)}
              aria-label="Đặt con trỏ ở cuối"
            >
              {cursor === donVi.length && (
                <span className="config-cpsx-upgrade__calc-caret" />
              )}
            </button>
          </div>
        </div>
        <div className="config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--eq">
          <span className="config-cpsx-upgrade__calc-label">=</span>
          <span className="config-cpsx-upgrade__calc-so">{hangSo || "—"}</span>
        </div>
        <div className="config-cpsx-upgrade__calc-row config-cpsx-upgrade__calc-row--eq">
          <span className="config-cpsx-upgrade__calc-label">=</span>
          <strong className="config-cpsx-upgrade__calc-ket-qua">
            {giaTriTinh == null
              ? "—"
              : `${dinhDangVnd(giaTriTinh)} ₫/phút`}
          </strong>
        </div>
      </div>
    </div>
  );
}

function MayTui({
  giaTri,
  capNhat,
}: {
  giaTri: CpsxUpgradeLaborTui;
  capNhat: (patch: Partial<CpsxUpgradeLaborTui>) => void;
}) {
  const tongL = tongLuong(giaTri.wages);
  const soCN = soCongNhanTui(giaTri.wages);
  const tbCa = luongTbTui(giaTri.wages, giaTri.peoplePerShift);
  const tangCa = tangCaTui(giaTri.wages, giaTri.otFactor, giaTri.tyLeTangCa, giaTri.otHours);
  const tienComSang = tienComSangTui(giaTri.mealMorning, soCN);
  const tienComToi = tienComToiTui(giaTri.mealEvening, soCN);
  const tinh = luongMoiPhutTinh(
    giaTri.wages,
    giaTri.hoursPerDay,
    giaTri.mealMorning,
    giaTri.mealEvening,
    giaTri.otFactor,
    soCongNhanTui(giaTri.wages),
    giaTri.tyLeTangCa,
    giaTri.otHours,
  );
  const apDungGia = luongMoiPhutAp(tinh, giaTri.roundedPerMin);

  const suaLuong = (idx: number, val: string) => {
    const next = [...giaTri.wages];
    next[idx] = docSoVnd(val);
    capNhat({ wages: next });
  };
  const themDong = () => {
    capNhat({ wages: [...giaTri.wages, 0] });
  };
  const xoaDong = (idx: number) => {
    if (giaTri.wages.length <= 1) return;
    capNhat({ wages: giaTri.wages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="config-cpsx-upgrade__panel">
      <div className="config-table-wrap config-cpsx-upgrade__table-wrap">
        <table className="config-table config-cpsx-upgrade__table">
          <thead>
            <tr>
              <th className="num" style={{ width: 48 }}>
                STT
              </th>
              <th className="num">Lương (₫)</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {giaTri.wages.map((w, idx) => (
              <tr key={idx}>
                <td className="num config-cpsx-upgrade__lock">{idx + 1}</td>
                <td className="num">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="config-inline-input"
                    aria-label={`Lương dòng ${idx + 1}`}
                    value={w === 0 ? "" : dinhDangVnd(w)}
                    placeholder="0"
                    onChange={(e) => suaLuong(idx, e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline config-cpsx-upgrade__del"
                    disabled={giaTri.wages.length <= 1}
                    onClick={() => xoaDong(idx)}
                    aria-label={`Xóa dòng ${idx + 1}`}
                  >
                    <Trash2 size={14} />
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
        onClick={themDong}
      >
        + Thêm dòng
      </button>

      <div className="config-cpsx-upgrade__meta-grid config-cpsx-upgrade__meta-grid--two">
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Tổng lương</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tongL)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số CN (lương &gt; 0)
          </span>
          <strong className="config-cpsx-upgrade__meta-value">{soCN}</strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">Lương TB / ca</span>
          <strong className="config-cpsx-upgrade__meta-value">
            {dinhDangVnd(tbCa)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__meta-item">
          <span className="config-cpsx-upgrade__meta-label">
            Số lượng người / máy
          </span>
          <strong className="config-cpsx-upgrade__meta-value">
            {giaTri.peoplePerShift}
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__formulas">
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tiền cơm ca sáng =
          </span>
          <NumberVndInput
            className="config-inline-input config-cpsx-upgrade__formula-input"
            ariaLabel="Cơm sáng mỗi người"
            value={giaTri.mealMorning}
            onChange={(v) => capNhat({ mealMorning: v })}
          />
          <span className="config-cpsx-upgrade__formula-op">
            × {soCN} / 2 =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tienComSang)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tiền cơm ca tối =
          </span>
          <NumberVndInput
            className="config-inline-input config-cpsx-upgrade__formula-input"
            ariaLabel="Cơm tối mỗi người"
            value={giaTri.mealEvening}
            onChange={(v) => capNhat({ mealEvening: v })}
          />
          <span className="config-cpsx-upgrade__formula-op">
            × {soCN} / 2 =
          </span>
          <strong className="config-cpsx-upgrade__formula-result">
            {dinhDangVnd(tienComToi)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Tổng tiền tăng ca n giờ = (Tổng lương ÷ {SO_GIO_MOT_CA} × n) ×
            Hệ số tăng ca × Tỉ lệ tăng ca
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} ÷ {SO_GIO_MOT_CA} ×{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Số giờ tăng ca"
              min={0}
              step={0.5}
              value={giaTri.otHours}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  otHours:
                    Number.isFinite(v) && v >= 0 ? v : giaTri.otHours,
                });
              }}
            />
            {") × "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Hệ số tăng ca"
              min={0}
              step={0.1}
              value={giaTri.otFactor}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  otFactor: Number.isFinite(v) && v > 0 ? v : giaTri.otFactor,
                });
              }}
            />{" "}
            ×{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Tỉ lệ tăng ca (%)"
              min={0}
              max={100}
              step={1}
              value={Math.round(giaTri.tyLeTangCa * 100)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  tyLeTangCa:
                    Number.isFinite(v) && v >= 0 && v <= 100
                      ? v / 100
                      : giaTri.tyLeTangCa,
                });
              }}
            />{" "}
            % = {dinhDangVnd(tangCa)} ₫
          </strong>
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Số lượng người / máy
          </span>
          <input
            type="number"
            className="config-inline-input config-cpsx-upgrade__formula-input"
            aria-label="Số lượng người mỗi máy"
            min={1}
            step={1}
            value={giaTri.peoplePerShift}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              capNhat({
                peoplePerShift:
                  Number.isFinite(v) && v > 0
                    ? Math.floor(v)
                    : giaTri.peoplePerShift,
              });
            }}
          />
        </div>
        <div className="config-cpsx-upgrade__formula-row">
          <span className="config-cpsx-upgrade__formula-label">
            Lương CN mỗi phút = (Tổng lương + Tăng ca + Cơm sáng + Cơm tối)
            ÷ Số giờ/ngày ÷ 60
          </span>
        </div>
        <div className="config-cpsx-upgrade__formula-row config-cpsx-upgrade__formula-indent">
          <strong className="config-cpsx-upgrade__formula-result">
            ({dinhDangVnd(tongL)} + {dinhDangVnd(tangCa)} +{" "}
            {dinhDangVnd(tienComSang)} + {dinhDangVnd(tienComToi)}) ÷{" "}
            <input
              type="number"
              className="config-inline-input config-cpsx-upgrade__formula-input"
              aria-label="Giờ máy hoạt động mỗi ngày — máy làm túi"
              min={1}
              max={24}
              step={1}
              value={giaTri.hoursPerDay}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                capNhat({
                  hoursPerDay:
                    Number.isFinite(v) && v > 0
                      ? Math.min(24, v)
                      : giaTri.hoursPerDay,
                });
              }}
            />{" "}
            ÷ 60 = {dinhDangVnd(tinh)} ₫/phút
          </strong>
        </div>
      </div>

      <div className="config-cpsx-upgrade__sources">
        <div className="config-cpsx-upgrade__source-row">
          <span className="config-cpsx-upgrade__source-label">Giá tính ra</span>
          <strong className="config-cpsx-upgrade__source-value">
            {dinhDangVnd(tinh)} ₫/phút
          </strong>
        </div>
        <div className="config-cpsx-upgrade__source-row">
          <span className="config-cpsx-upgrade__source-label">
            Giá làm tròn áp dụng
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="config-inline-input config-cpsx-upgrade__manual"
            aria-label="Giá làm tròn áp dụng"
            value={
              giaTri.roundedPerMin == null
                ? ""
                : dinhDangVnd(giaTri.roundedPerMin)
            }
            placeholder={dinhDangVnd(tinh)}
            onChange={(e) => {
              const v = docSoVnd(e.target.value);
              capNhat({ roundedPerMin: v > 0 ? v : null });
            }}
          />
        </div>
      </div>

      <div className="config-cpsx-upgrade__applied">
        <label>Lương túi đang áp dụng</label>
        <strong className="config-cpsx-upgrade__applied-value">
          {dinhDangVnd(apDungGia)}
        </strong>
        <span className="config-cpsx-upgrade__unit">₫/phút</span>
      </div>
    </div>
  );
}
