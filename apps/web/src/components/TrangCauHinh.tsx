"use client";
import React from "react";
import { Eye, Copy, Trash2, Save } from "lucide-react";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import type { ConfigScope } from "../lib/types";
import {
  INITIAL_MATERIALS,
  INITIAL_CONSTANTS,
  INITIAL_PROFIT_TABLE,
  INITIAL_SMALL_WIDTH_PRICES,
} from "../lib/data";
import {
  commitProfitThresholdDraft,
  removeLastAddedProfitRow,
} from "../lib/profit-table-editor";

let boDemLuuBangLoiNhuan: ReturnType<typeof setTimeout>;
const luuBangLoiNhuanTre = () => {
  clearTimeout(boDemLuuBangLoiNhuan);
  boDemLuuBangLoiNhuan = setTimeout(() => {
    dungCuaHangTinhGia.getState().recalculate();
  }, 800);
};

const SCOPE_LABEL: Record<ConfigScope, string> = {
  materials: "vật liệu & giá",
  production: "chi phí sản xuất",
  profit: "bảng lợi nhuận",
  surcharges: "phụ phí & phụ kiện",
  interest: "lãi vay công nợ",
  waste: "tham số hao hụt",
  outsource: "gia công ngoài",
};

function KhoiPhienBan({ scope }: { scope: ConfigScope }) {
  const {
    configSnapshots: tatCaPhienBan,
    taoPhienBanDinhMuc,
    xoaPhienBanDinhMuc,
    xemPhienBanDinhMuc,
    saoChepPhienBanDinhMuc,
    thoatXemPhienBan,
    taiLichSuPhienBanTuServer,
    dangLuuPhienBan,
    dangTaiPhienBan,
    dangXemPhienBan,
    phienBanDangXemId,
    nguoiDungHienTai,
  } = dungCuaHangTinhGia();

  const coQuyenXoa = !!nguoiDungHienTai?.policies.includes('PRICE_CONFIG_MANAGER');

  const phienBan = tatCaPhienBan.filter(
    (s) => (s.scope ?? "materials") === scope,
  );

  const [mocHieuLuc, datMocHieuLuc] = React.useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [moDanhSachPhienBan, datMoDanhSachPhienBan] = React.useState(false);
  const [mo, datMo] = React.useState(false);
  const [xacNhanXoaId, datXacNhanXoaId] = React.useState<string | null>(null);
  const [loiXoa, datLoiXoa] = React.useState<{ names: string[] } | null>(null);

  // Tai lich su phien ban tu server khi component mount
  React.useEffect(() => {
    taiLichSuPhienBanTuServer(scope);
  }, [scope]);

  const xuLyLuu = async () => {
    if (!mocHieuLuc) return;
    await taoPhienBanDinhMuc({
      scope,
      effectiveMode: "month",
      effectiveFrom: mocHieuLuc,
    });
  };

  const xuLyXem = (id: string) => {
    xemPhienBanDinhMuc(id);
  };

  const xuLySaoChep = (id: string) => {
    saoChepPhienBanDinhMuc(id);
  };

  const xuLyXoa = async (id: string) => {
    const ketQua = await xoaPhienBanDinhMuc(id);
    if (!ketQua.success) {
      datLoiXoa({ names: ketQua.pricingSheetNames });
    }
  };

  const moXacNhanXoa = (id: string) => {
    datXacNhanXoaId(id);
  };

  return (
    <>
      <div
        className="card config-card config-version-card"
        id={`sect-config-versions-${scope}`}
        style={{ scrollMarginTop: "80px" }}
      >
      <div
        className="config-section-title config-version-title collapsible"
        onClick={() => datMo((v) => !v)}
        aria-expanded={mo}
      >
        <span>Phiên bản — {SCOPE_LABEL[scope]}</span>
        <span className={`card-collapse-arrow${mo ? " open" : ""}`}>▼</span>
      </div>
      <div className={`card-body-collapsible${mo ? " open" : ""}`}>
        <div
          className="config-cpsx-grid config-version-form"
          style={{ marginBottom: "16px" }}
        >
          <div className="config-cpsx-item config-version-effective">
            <label>Hiệu lực từ</label>
            <input
              className="form-input"
              type="month"
              value={mocHieuLuc}
              onChange={(e) => datMocHieuLuc(e.target.value)}
            />
          </div>
          <div
            className="config-cpsx-item config-version-save"
            style={{ justifyContent: "flex-end" }}
          >
            <button
              className="btn btn-primary"
              onClick={xuLyLuu}
              disabled={!mocHieuLuc || dangLuuPhienBan}
              aria-label="Lưu phiên bản"
            >
              <Save
                className="config-version-save-icon"
                size={15}
                aria-hidden="true"
              />
              <span className="config-version-save-text">
                {dangLuuPhienBan ? "Đang lưu..." : "Lưu"}
              </span>
            </button>
          </div>
        </div>
        <button
          className="config-version-summary"
          type="button"
          onClick={() => datMoDanhSachPhienBan(true)}
        >
          <span>
            Phiên bản đã lưu:{" "}
            {dangTaiPhienBan ? "Đang tải..." : phienBan.length}
          </span>
          <span>{phienBan.length > 0 ? "Xem ›" : "Chưa có phiên bản nào"}</span>
        </button>
        <div className="config-table-wrap config-version-table-wrap">
          <table className="config-table">
            <thead>
              <tr>
                <th>Hiệu lực</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dangTaiPhienBan ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: "center", color: "var(--dim)" }}
                  >
                    Đang tải phiên bản từ server...
                  </td>
                </tr>
              ) : phienBan.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: "center", color: "var(--dim)" }}
                  >
                    Chưa có phiên bản nào.
                  </td>
                </tr>
              ) : (
                phienBan.map((snapshot) => {
                  return (
                    <tr
                      key={snapshot.id}
                    >
                      <td>
                        {snapshot.effectiveMode === "month" ? "Tháng" : "Ngày"}{" "}
                        {snapshot.effectiveFrom}
                      </td>
                      <td>
                        {new Date(snapshot.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => xuLyXem(snapshot.id)}
                            title="Xem"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => xuLySaoChep(snapshot.id)}
                            title="Sao chép"
                          >
                            <Copy size={13} />
                          </button>
                          {coQuyenXoa && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => moXacNhanXoa(snapshot.id)}
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="config-note config-version-note">
          Phiên bản lưu {SCOPE_LABEL[scope]} tại thời điểm bấm lưu.
        </p>
        {moDanhSachPhienBan && (
          <div
            className="config-version-sheet-backdrop"
            role="presentation"
            onClick={() => datMoDanhSachPhienBan(false)}
          >
            <div
              className="config-version-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Danh sách phiên bản"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="config-version-sheet-header">
                <strong>Danh sách phiên bản</strong>
                <button
                  className="config-version-sheet-close"
                  type="button"
                  onClick={() => datMoDanhSachPhienBan(false)}
                  aria-label="Đóng danh sách phiên bản"
                >
                  ×
                </button>
              </div>
              <div className="config-version-sheet-list">
                {phienBan.length === 0 ? (
                  <div className="config-version-empty">
                    Chưa có phiên bản nào.
                  </div>
                ) : (
                  phienBan.map((snapshot) => {
                    return (
                      <div
                        className="config-version-sheet-row"
                        key={snapshot.id}
                      >
                        <div className="config-version-sheet-info">
                          <span>
                            {snapshot.effectiveFrom}
                          </span>
                        </div>
                        <div className="config-version-sheet-actions">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              xuLyXem(snapshot.id);
                              datMoDanhSachPhienBan(false);
                            }}
                            title="Xem"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              xuLySaoChep(snapshot.id);
                              datMoDanhSachPhienBan(false);
                            }}
                            title="Sao chép"
                          >
                            <Copy size={13} />
                          </button>
                          {coQuyenXoa && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                moXacNhanXoa(snapshot.id);
                              }}
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {dangXemPhienBan && phienBan.find(s => s.id === phienBanDangXemId) && (
      <div
        style={{
          background: 'var(--accent-subtle, rgba(59,130,246,0.08))',
          border: '1px solid var(--accent, rgba(59,130,246,0.3))',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--accent, #3b82f6)', fontWeight: 500 }}>
          ⚠ Đang xem dữ liệu của phiên bản — các trường chỉ đọc
        </span>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => thoatXemPhienBan()}
        >
          Thoát xem
        </button>
      </div>
    )}
    {xacNhanXoaId && (
      <div className="lts-confirm-backdrop" onClick={() => datXacNhanXoaId(null)}>
        <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
          <div className="lts-confirm-icon">🗑</div>
          <h3 className="lts-confirm-title">Xóa phiên bản này?</h3>
          <p className="lts-confirm-desc">
            Thao tác này không thể hoàn tác.<br />
            Phiên bản sẽ bị xóa vĩnh viễn.
          </p>
          <div className="lts-confirm-actions">
            <button className="btn btn-outline" onClick={() => datXacNhanXoaId(null)}>Hủy</button>
            <button className="btn btn-danger" onClick={() => { const id = xacNhanXoaId; datXacNhanXoaId(null); xuLyXoa(id); }}>Xóa</button>
          </div>
        </div>
      </div>
    )}
    {loiXoa && (
      <div className="lts-confirm-backdrop" onClick={() => datLoiXoa(null)}>
        <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
          <div className="lts-confirm-icon">⚠️</div>
          <h3 className="lts-confirm-title">Không thể xóa</h3>
          <p className="lts-confirm-desc">
            Hiện không thể xóa do cấu hình này đang liên kết với:
          </p>
          <ul style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 22, paddingLeft: 20 }}>
            {loiXoa.names.map((ten, i) => (
              <li key={i}>{ten}</li>
            ))}
          </ul>
          <div className="lts-confirm-actions">
            <button className="btn btn-outline" onClick={() => datLoiXoa(null)}>Đóng</button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

type NhomCauHinh =
  | "materials"
  | "waste"
  | "production"
  | "outsource"
  | "profit"
  | "surcharges"
  | "interest"
  | "formulas";
const layNhomCauHinh = (menuDangChon?: string): NhomCauHinh => {
  switch (menuDangChon) {
    case "config.materials":
      return "materials";
    case "config.waste_norms":
      return "waste";
    case "config.production_costs":
      return "production";
    case "config.outsource_costs":
      return "outsource";
    case "config.profit_margin":
      return "profit";
    case "config.surcharges":
      return "surcharges";
    case "config.interest":
      return "interest";
    case "config.formulas":
      return "formulas";
    default:
      return "materials";
  }
};

export default function TrangCauHinh({
  menuDangChon,
}: {
  menuDangChon?: string;
}) {
  const {
    materials: vatLieu,
    constants: hangSo,
    profitTable: bangLoiNhuan,
    smallWidthPrices: bangGiaKhoNho,
    setMaterialParam: capNhatVatLieu,
    setConstantParam: capNhatHangSo,
    setSmallWidthPriceParam: capNhatGiaKhoNho,
    removeMaterial: xoaVatLieu,
    dangXemPhienBan,
    phienBanDangXemId,
    configSnapshots: tatCaPhienBan,
  } = dungCuaHangTinhGia();

  const scopeDangXem = React.useMemo(() => {
    if (!dangXemPhienBan || !phienBanDangXemId) return null;
    const s = tatCaPhienBan.find(x => x.id === phienBanDangXemId);
    return s?.scope ?? null;
  }, [dangXemPhienBan, phienBanDangXemId, tatCaPhienBan]);
  const [nhomKhachHang, datNhomKhachHang] = React.useState("other");
  const [nhomKhachMangInDangXem, datNhomKhachMangInDangXem] = React.useState<
    "normal" | "large"
  >("normal");
  const [hienBangKhoNho, datHienBangKhoNho] = React.useState(false);
  const [bangGiaMauInDangXem, datBangGiaMauInDangXem] = React.useState<
    "normal" | "printFilm"
  >("normal");
  const [ngayCongNoMoi, datNgayCongNoMoi] = React.useState("");
  const [nguongLoiNhuanDangSua, datNguongLoiNhuanDangSua] = React.useState<
    Record<number, string>
  >({});
  const nhomCauHinh = layNhomCauHinh(menuDangChon);
  const hienVatTu = nhomCauHinh === "materials";
  const hienHaoHut = nhomCauHinh === "waste";
  const hienSanXuat = nhomCauHinh === "production";
  const hienGiaCongNgoai = nhomCauHinh === "outsource";
  const hienLoiNhuan = nhomCauHinh === "profit";
  const hienPhuPhi = nhomCauHinh === "surcharges";
  const hienLaiVay = nhomCauHinh === "interest";
  const hienCongThuc = nhomCauHinh === "formulas";
  // anCotCPSX: ẩn cột CPSX khi chỉ xem hao hụt riêng lẻ
  // anCotPhiHao: không dùng nữa (CPSX luôn hiện cả hai cột)
  const anCotCPSX = hienHaoHut && !hienSanXuat && !hienCongThuc;
  const anCotPhiHao = false;
  const tongLaiNam = hangSo.interestBase + hangSo.interestSpread;
  const mocNgayLaiVay = [
    14,
    30,
    45,
    75,
    90,
    ...(hangSo.customPaymentDays ?? []),
  ].sort((a, b) => a - b);
  const dinhDangTyLeLaiNgay = (days: number) =>
    ((tongLaiNam / 365) * days * 100).toFixed(3);
  const soNgayCongNoMoi = Number(ngayCongNoMoi);
  const hopLeNgayCongNoMoi =
    Number.isInteger(soNgayCongNoMoi) &&
    soNgayCongNoMoi >= 0 &&
    !mocNgayLaiVay.includes(soNgayCongNoMoi);
  const capNhatNgayCongNoMoi = (value: string) => {
    if (/^\d*$/.test(value)) datNgayCongNoMoi(value);
  };
  const themNgayCongNo = () => {
    if (!hopLeNgayCongNoMoi) return;
    capNhatHangSo("customPaymentDays", [
      ...(hangSo.customPaymentDays ?? []),
      soNgayCongNoMoi,
    ]);
    datNgayCongNoMoi("");
  };
  const cotLoiNhuanTheoNhom =
    nhomKhachHang === "svlg"
      ? { col1: "largeCol1" as const, col2: "largeCol2" as const }
      : { col1: "col1" as const, col2: "col2" as const };
  const bangGiaKhoNhoMotDong = vatLieu
    .map((m) => bangGiaKhoNho.find((p) => p.materialId === m.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  // Unique material names for ink price table
  const tenDaGap = new Set<string>();
  const vatLieuDuyNhat = vatLieu.filter((m) => {
    if (tenDaGap.has(m.name)) return false;
    tenDaGap.add(m.name);
    return true;
  });
  const xuLyDoiGiaMuc = (ten: string, giaTri: number) => {
    // Apply to ALL materials sharing the same name
    vatLieu.forEach((m) => {
      if (m.name === ten) {
        capNhatVatLieu(m.id, { inkPricePerColor: giaTri });
      }
    });
  };
  const xuLyDatLai = () => {
    if (!confirm("Reset tất cả giá về mặc định?")) return;
    INITIAL_MATERIALS.forEach((macDinh, i) => {
      const m = vatLieu[i];
      if (m) {
        capNhatVatLieu(m.id, {
          thickness: macDinh.thickness,
          pricePerKg: macDinh.pricePerKg,
          inkPricePerColor: macDinh.inkPricePerColor,
        });
      }
    });
    // Reset constants
    const cacKhoaDatLai: (keyof typeof INITIAL_CONSTANTS)[] = [
      "laborCost",
      "nhuPrice",
      "moPrice",
      "ghepCPSX",
      "ghepWasteA",
      "ghepWasteB",
      "ghepWasteC",
      "cutBase",
      "cutWasteA",
      "cutWasteB",
      "cutWasteC",
      "cutThreshold1",
      "cutThreshold2",
      "cutMult1",
      "cutMult2",
      "cutMult3",
      "cutRules",
      "zipperPrice",
      "zipperWeight",
      "tapePrice",
      "tapeWeight",
      "handlePrice",
      "handleWeight",
      "boxPriceDefault",
      "bagsPerBoxDefault",
      "boxOptions",
      "handleOptions",
      "printWasteA",
      "printWasteB",
      "printWasteC",
      "printWasteD",
      "cylPriceA",
      "cylPriceB",
      "interestBase",
      "interestSpread",
      "customPrintSurcharges",
    ];
    cacKhoaDatLai.forEach((key) => {
      capNhatHangSo(key, INITIAL_CONSTANTS[key] as number);
    });
    // Reset colorSetup
    Object.keys(INITIAL_CONSTANTS.colorSetup).forEach((k) => {
      const khoaSo = Number(k);
      if (hangSo.colorSetup[khoaSo] !== INITIAL_CONSTANTS.colorSetup[khoaSo]) {
        capNhatHangSo("colorSetup", { ...INITIAL_CONSTANTS.colorSetup } as any);
      }
    });
  };
  const xuLyDoiCaiDatMau = (soMau: number, giaTri: number) => {
    const caiDatMoi = { ...hangSo.colorSetup, [soMau]: giaTri };
    capNhatHangSo("colorSetup" as any, caiDatMoi as any);
  };
  const cacMocMauIn = Object.keys(hangSo.colorSetup ?? {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  const themMocMauIn = () => {
    const soMauMoi = Math.max(0, ...cacMocMauIn) + 1;
    xuLyDoiCaiDatMau(soMauMoi, soMauMoi * 200 + 200);
    const tyLeHienTai = hangSo.printFilmProfitRates ?? [];
    const themDongChoNhom = (customerGroup: "normal" | "large") => {
      const dongNhom = tyLeHienTai
        .filter((row) => row.customerGroup === customerGroup)
        .sort((a, b) => b.colorTo - a.colorTo);
      const dongCuoi = dongNhom[0];
      return {
        customerGroup,
        colorFrom: soMauMoi,
        colorTo: soMauMoi,
        rate: dongCuoi?.rate ?? (customerGroup === "normal" ? 0.11 : 0.05),
      };
    };
    capNhatHangSo(
      "printFilmProfitRates" as any,
      [
        ...tyLeHienTai,
        themDongChoNhom("normal"),
        themDongChoNhom("large"),
      ] as any,
    );
  };
  const xoaMocMauIn = (soMau: number) => {
    const caiDatMoi = { ...hangSo.colorSetup };
    delete caiDatMoi[soMau];
    capNhatHangSo("colorSetup" as any, caiDatMoi as any);
  };
  const capNhatHangSoSo = (
    key: keyof typeof hangSo,
    value: number,
    fallback: number,
  ) => {
    capNhatHangSo(
      key,
      (Number.isFinite(value) && value > 0 ? value : fallback) as any,
    );
  };
  const tyLeLoiNhuanMangIn = (hangSo.printFilmProfitRates ?? [])
    .filter((row) => row.customerGroup === nhomKhachMangInDangXem)
    .sort((a, b) => a.colorFrom - b.colorFrom);
  const capNhatTyLeLoiNhuanMangIn = (
    index: number,
    patch: Partial<(typeof tyLeLoiNhuanMangIn)[number]>,
  ) => {
    const dongDangSua = tyLeLoiNhuanMangIn[index];
    if (!dongDangSua) return;
    const danhSach = (hangSo.printFilmProfitRates ?? []).map((row) =>
      row.customerGroup === dongDangSua.customerGroup &&
      row.colorFrom === dongDangSua.colorFrom &&
      row.colorTo === dongDangSua.colorTo
        ? { ...row, ...patch }
        : row,
    );
    capNhatHangSo("printFilmProfitRates" as any, danhSach as any);
  };
  const quyTacCat = hangSo.cutRules?.length
    ? hangSo.cutRules
    : [
        {
          label: "Nhỏ",
          threshold: hangSo.cutThreshold1,
          multiplier: hangSo.cutMult1,
        },
        {
          label: "Trung bình",
          threshold: hangSo.cutThreshold2,
          multiplier: hangSo.cutMult2,
        },
        { label: "Lớn", threshold: null, multiplier: hangSo.cutMult3 },
      ];
  const capNhatQuyTacCat = (
    index: number,
    patch: Partial<(typeof quyTacCat)[number]>,
  ) => {
    const danhSach = quyTacCat.map((rule, i) =>
      i === index ? { ...rule, ...patch } : rule,
    );
    capNhatHangSo("cutRules" as any, danhSach as any);
  };
  const themQuyTacCat = () => {
    const dongCuoi = quyTacCat[quyTacCat.length - 1];
    const danhSach = [
      ...quyTacCat.slice(0, -1),
      {
        label: `Mức ${quyTacCat.length}`,
        threshold: dongCuoi?.threshold ?? hangSo.cutThreshold2,
        multiplier: dongCuoi?.multiplier ?? hangSo.cutMult3,
      },
      {
        label: dongCuoi?.label ?? "Lớn",
        threshold: null,
        multiplier: dongCuoi?.multiplier ?? hangSo.cutMult3,
      },
    ];
    capNhatHangSo("cutRules" as any, danhSach as any);
  };
  const xoaQuyTacCat = (index: number) => {
    if (quyTacCat.length <= 1) return;
    const danhSach = quyTacCat.filter((_, i) => i !== index);
    const dongCuoi = danhSach[danhSach.length - 1];
    capNhatHangSo(
      "cutRules" as any,
      danhSach.map((rule, i) =>
        i === danhSach.length - 1
          ? { ...rule, threshold: null, label: dongCuoi?.label || "Lớn" }
          : rule,
      ) as any,
    );
  };
  const xuLyDoiLoaiThung = (
    khoa: string,
    truong: "price" | "weight" | "label",
    giaTri: number | string,
  ) => {
    const cacLoaiThung = (hangSo.boxOptions ?? []).map((option) =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option,
    );
    capNhatHangSo("boxOptions" as any, cacLoaiThung as any);
  };
  const xuLyDoiLoaiQuai = (
    khoa: string,
    truong: "price" | "weight" | "label",
    giaTri: number | string,
  ) => {
    const cacLoaiQuai = (hangSo.handleOptions ?? []).map((option) =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option,
    );
    capNhatHangSo("handleOptions" as any, cacLoaiQuai as any);
    const macDinh =
      cacLoaiQuai.find((o) => o.key === "small") ?? cacLoaiQuai[0];
    if (macDinh) {
      capNhatHangSo("handlePrice", macDinh.price as any);
      capNhatHangSo("handleWeight", macDinh.weight as any);
    }
  };
  const themPhuKien = () => {
    const danhSach = hangSo.customAccessories ?? [];
    const key = `accessory-${Date.now()}`;
    capNhatHangSo(
      "customAccessories" as any,
      [
        ...danhSach,
        {
          key,
          label: `Phụ kiện ${danhSach.length + 1}`,
          price: 0,
          weight: 0,
          unit: "per_piece",
        },
      ] as any,
    );
  };
  const cacPhuPhiInMacDinh = [
    {
      key: "nhu",
      label: "Nhũ",
      price: hangSo.nhuPrice,
      priceKey: "nhuPrice" as const,
    },
    {
      key: "mo",
      label: "Phủ mờ",
      price: hangSo.moPrice,
      priceKey: "moPrice" as const,
    },
  ];
  const xuLyDoiPhuPhiIn = (
    khoa: string,
    truong: "price" | "label",
    giaTri: number | string,
  ) => {
    const danhSach = (hangSo.customPrintSurcharges ?? []).map((option) =>
      option.key === khoa ? { ...option, [truong]: giaTri } : option,
    );
    capNhatHangSo("customPrintSurcharges" as any, danhSach as any);
  };
  const themPhuPhiIn = () => {
    const danhSach = hangSo.customPrintSurcharges ?? [];
    const index = danhSach.length + 1;
    const key = `print_surcharge_${Date.now()}`;
    capNhatHangSo(
      "customPrintSurcharges" as any,
      [...danhSach, { key, label: `Phụ phí ${index}`, price: 0 }] as any,
    );
  };
  const xoaPhuPhiIn = (khoa: string) => {
    capNhatHangSo(
      "customPrintSurcharges" as any,
      (hangSo.customPrintSurcharges ?? []).filter(
        (option) => option.key !== khoa,
      ) as any,
    );
  };
  const dinhDangVnd = (n: number) => n.toLocaleString("vi-VN");
  const docSoVnd = (value: string) => Number(value.replace(/\D/g, "")) || 0;
  const layBienLoiNhuan = (i: number, nguong: number) => {
    const from = i === 0 ? 0 : (bangLoiNhuan[i - 1]?.threshold ?? 0);
    return { from, to: nguong };
  };
  const luuNguongLoiNhuanDangSua = (i: number) => {
    const draft = nguongLoiNhuanDangSua[i];
    if (draft == null) return;
    const cuaHang = dungCuaHangTinhGia.getState();
    const ketQua = commitProfitThresholdDraft(cuaHang.profitTable, i, draft);
    datNguongLoiNhuanDangSua(({ [i]: _boQua, ...conLai }) => conLai);
    if (!ketQua.changed) return;
    dungCuaHangTinhGia.setState({ profitTable: ketQua.rows });
    cuaHang.recalculate();
    luuBangLoiNhuanTre();
  };
  const themMocLoiNhuan = () => {
    const cuaHang = dungCuaHangTinhGia.getState();
    const dongCuoi = cuaHang.profitTable[cuaHang.profitTable.length - 1];
    const mocMoi = (dongCuoi?.threshold ?? 0) + 10000000;
    const bangMoi = [
      ...cuaHang.profitTable,
      {
        threshold: mocMoi,
        col1: dongCuoi?.col1 ?? 0,
        col2: dongCuoi?.col2 ?? 0,
        largeCol1: dongCuoi?.largeCol1 ?? 0,
        largeCol2: dongCuoi?.largeCol2 ?? 0,
      },
    ];
    dungCuaHangTinhGia.setState({ profitTable: bangMoi });
    cuaHang.recalculate();
    luuBangLoiNhuanTre();
  };
  const xoaMocLoiNhuanCuoi = () => {
    const cuaHang = dungCuaHangTinhGia.getState();
    const bangMoi = removeLastAddedProfitRow(
      cuaHang.profitTable,
      INITIAL_PROFIT_TABLE.length,
    );
    if (bangMoi === cuaHang.profitTable) return;
    dungCuaHangTinhGia.setState({ profitTable: bangMoi });
    datNguongLoiNhuanDangSua({});
    cuaHang.recalculate();
    luuBangLoiNhuanTre();
  };
  return (
    <div className={`config-page${dangXemPhienBan ? ' config-page--readonly' : ''}`} id="configPage" style={{ display: "block" }}>
      <div className="config-page-inner">
        <div className="config-content">
          {hienVatTu && (
            <>
              <KhoiPhienBan scope="materials" />
              {/* 1. B?ng gi? nvl */}
              <div
                className="card config-card"
                id="sect-config-nvl"
                style={{ scrollMarginTop: "80px" }}
              >
                <div className="config-section-title">
                  <span>📦 Giá Nguyên Vật Liệu Cập Nhật Hàng Ngày</span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={hienBangKhoNho ? "small" : "normal"}
                      onChange={(e) =>
                        datHienBangKhoNho(e.target.value === "small")
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        minWidth: "150px",
                      }}
                    >
                      <option value="normal">Khổ bình thường</option>
                      <option value="small">Khổ nhỏ</option>
                    </select>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={xuLyDatLai}
                    >
                      🔄 Reset mặc định
                    </button>
                  </div>
                </div>
                {!hienBangKhoNho ? (
                  // Bảng khổ bình thường
                  <>
                    <div className="config-table-wrap">
                      <table className="config-table" id="materialPriceTable">
                        <colgroup>
                          <col className="config-col-stt" />
                          <col className="config-col-material" />
                          <col className="config-col-density" />
                          <col className="config-col-thickness" />
                          <col className="config-col-price-kg" />
                          <col className="config-col-price-m2" />
                          <col className="config-col-action" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="config-col-stt">STT</th>
                            <th>Màng</th>
                            <th>Tỉ trọng (g/cm³)</th>
                            <th>Độ dày (mic)</th>
                            <th>Giá (VNĐ/kg)</th>
                            <th>Giá (VNĐ/m²)</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {vatLieu.map((m, idx) => {
                            const laCustom = m.id.startsWith("custom-");
                            return (
                              <tr key={m.id}>
                                <td
                                  className="config-col-stt"
                                  style={{
                                    textAlign: "center",
                                    color: "var(--dim)",
                                  }}
                                >
                                  {idx + 1}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {laCustom ? (
                                    <input
                                      type="text"
                                      className="config-inline-input"
                                      value={m.name}
                                      onChange={(e) =>
                                        capNhatVatLieu(m.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      style={{
                                        width: "120px",
                                        fontWeight: 600,
                                      }}
                                    />
                                  ) : (
                                    m.name
                                  )}
                                </td>
                                <td>
                                  {laCustom ? (
                                    <input
                                      type="number"
                                      className="config-inline-input"
                                      value={m.density}
                                      onChange={(e) =>
                                        capNhatVatLieu(m.id, {
                                          density:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      style={{
                                        width: "70px",
                                        textAlign: "right",
                                      }}
                                    />
                                  ) : (
                                    m.density
                                  )}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="config-inline-input"
                                    value={m.thickness}
                                    onChange={(e) =>
                                      capNhatVatLieu(m.id, {
                                        thickness:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    style={{
                                      width: "80px",
                                      textAlign: "right",
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="config-inline-input"
                                    value={m.pricePerKg}
                                    onChange={(e) =>
                                      capNhatVatLieu(m.id, {
                                        pricePerKg:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    style={{
                                      width: "100px",
                                      textAlign: "right",
                                      fontWeight: 700,
                                    }}
                                  />
                                </td>
                                <td
                                  style={{
                                    fontWeight: 700,
                                    color: "var(--accent)",
                                  }}
                                >
                                  {m.pricePerM2?.toLocaleString("vi-VN", {
                                    maximumFractionDigits: 0,
                                  })}{" "}
                                  đ
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {laCustom && (
                                    <button
                                      className="btn btn-sm"
                                      title="Xóa màng này"
                                      style={{
                                        color: "var(--danger,#e53e3e)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        padding: "2px 6px",
                                      }}
                                      onClick={() => {
                                        if (confirm(`Xóa màng "${m.name}"?`)) {
                                          xoaVatLieu(m.id);
                                        }
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="config-note">
                      Chỉnh <strong>độ dày</strong> và{" "}
                      <strong>giá VNĐ/kg</strong> - giá VNĐ/m² tự động tính lại.
                      Thay đổi sẽ áp dụng ngay cho lần tính giá tiếp theo.
                    </p>
                  </>
                ) : (
                  // Bảng khổ nhỏ
                  <>
                    <div className="config-table-wrap">
                      <table className="config-table" id="smallWidthPriceTable">
                        <colgroup>
                          <col className="config-col-stt" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="config-col-stt">STT</th>
                            <th>Màng</th>
                            <th>Tỉ trọng (g/cm³)</th>
                            <th>Độ dày (mic)</th>
                            <th>Khổ nhỏ (mm)</th>
                            <th>Giá (VNĐ/kg)</th>
                            <th>Giá (VNĐ/m²)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bangGiaKhoNhoMotDong.map((p, idx) => {
                            const material = vatLieu.find(
                              (m) => m.id === p.materialId,
                            );
                            if (!material) return null;
                            return (
                              <tr key={p.id}>
                                <td
                                  className="config-col-stt"
                                  style={{
                                    textAlign: "center",
                                    color: "var(--dim)",
                                  }}
                                >
                                  {idx + 1}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {material.name}
                                </td>
                                <td>{material.density}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="config-inline-input"
                                    value={p.thickness ?? material.thickness}
                                    onChange={(e) =>
                                      capNhatGiaKhoNho(p.id, {
                                        thickness:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    style={{
                                      width: "80px",
                                      textAlign: "right",
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="config-inline-input"
                                    value={p.widthThresholdMm}
                                    onChange={(e) =>
                                      capNhatGiaKhoNho(p.id, {
                                        widthThresholdMm:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    style={{
                                      width: "80px",
                                      textAlign: "right",
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="config-inline-input"
                                    value={p.pricePerKg}
                                    onChange={(e) =>
                                      capNhatGiaKhoNho(p.id, {
                                        pricePerKg:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    style={{
                                      width: "100px",
                                      textAlign: "right",
                                      fontWeight: 700,
                                    }}
                                  />
                                </td>
                                <td
                                  style={{
                                    fontWeight: 700,
                                    color: "var(--accent)",
                                  }}
                                >
                                  {p.pricePerM2?.toLocaleString("vi-VN", {
                                    maximumFractionDigits: 0,
                                  })}{" "}
                                  đ
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="config-note">
                      💡 Khi khổ nguyên vật liệu ≤ ngưỡng khổ nhỏ, hệ thống sẽ
                      dùng giá khổ nhỏ thay cho giá thường. Ví dụ: khổ 350mm sẽ
                      dùng giá mốc 400mm nếu có.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
          {/* NHOM 1: CHI PHI KHAU IN */}
          {hienSanXuat && <KhoiPhienBan scope="production" />}
          {hienHaoHut && <KhoiPhienBan scope="waste" />}
          {hienPhuPhi && <KhoiPhienBan scope="surcharges" />}
          {hienCongThuc && <KhoiPhienBan scope="production" />}
          {hienCongThuc && <KhoiPhienBan scope="waste" />}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
            <div
              className="config-group-header"
              id="sect-config-in"
              style={{ scrollMarginTop: "80px" }}
            >
              🖨️ CPSX Khâu in
            </div>
          )}
          {/* 1.2 Bảng giá màu in */}
          {hienSanXuat && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>🎨 Giá Màu In Theo Loại Màng</span>
              </div>
              <div
                className="config-cpsx-grid"
                style={{ marginBottom: "12px" }}
              >
                <div className="config-cpsx-item">
                  <label>Loại bảng giá</label>
                  <select
                    className="form-select"
                    value={bangGiaMauInDangXem}
                    onChange={(e) =>
                      datBangGiaMauInDangXem(
                        e.target.value as "normal" | "printFilm",
                      )
                    }
                  >
                    <option value="normal">Bình thường</option>
                    <option value="printFilm">Dành riêng màng in</option>
                  </select>
                </div>
              </div>
              <div className="config-table-wrap">
                <table className="config-table" id="inkPriceTable">
                  <colgroup>
                    <col className="config-col-stt" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="config-col-stt">STT</th>
                      <th>
                        {bangGiaMauInDangXem === "printFilm"
                          ? "Loại màng"
                          : "Màng"}
                      </th>
                      <th>Giá mực/màu (đ/m²/màu)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bangGiaMauInDangXem === "normal"
                      ? vatLieuDuyNhat.map((m, idx) => (
                          <tr key={m.id}>
                            <td className="config-col-stt">{idx + 1}</td>
                            <td className="mat-name">{m.name}</td>
                            <td>
                              <input
                                type="number"
                                className="config-inline-input"
                                value={m.inkPricePerColor}
                                onChange={(e) =>
                                  xuLyDoiGiaMuc(
                                    m.name,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                style={{
                                  width: "80px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              />
                            </td>
                          </tr>
                        ))
                      : [
                          {
                            label: "BOPP",
                            key: "printFilmInkPriceBopp" as const,
                            value: hangSo.printFilmInkPriceBopp ?? 150,
                            fallback: 150,
                          },
                          {
                            label: "KHÁC",
                            key: "printFilmInkPriceOther" as const,
                            value: hangSo.printFilmInkPriceOther ?? 200,
                            fallback: 200,
                          },
                        ].map((row, idx) => (
                          <tr key={row.key}>
                            <td className="config-col-stt">{idx + 1}</td>
                            <td className="mat-name">{row.label}</td>
                            <td>
                              <input
                                type="number"
                                className="config-inline-input"
                                value={row.value}
                                onChange={(e) =>
                                  capNhatHangSoSo(
                                    row.key,
                                    parseFloat(e.target.value),
                                    row.fallback,
                                  )
                                }
                                style={{
                                  width: "80px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
              <p className="config-note">
                {bangGiaMauInDangXem === "printFilm"
                  ? "Bảng dành riêng màng in chỉ áp dụng cho sản phẩm Màng in chỉ có công đoạn in. Chỉ vật liệu BOPP dùng giá BOPP; còn lại dùng KHÁC. Tỉ lệ mực in luôn tính 100%."
                  : "Giá mực in tính trên mỗi màu in. Danh sách loại màng lấy từ bảng Giá Nguyên Vật Liệu; muốn thêm/xóa loại màng, hãy thao tác tại bảng đó."}
              </p>
            </div>
          )}
          {/* 1.3 Công Thức Tính Phi Hao In */}
          {(hienHaoHut || hienSanXuat) && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>📉 Công Thức Tính Phi Hao In</span>
              </div>
              <div className="config-table-wrap">
                <table className="config-table" id="printWasteTable">
                  <thead>
                    <tr>
                      <th>Số màu in</th>
                      <th>Phi hao set up (m)</th>
                      <th style={{ paddingBottom: "8px" }}>
                        Phi hao
                        <br />
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "normal",
                            textTransform: "none",
                          }}
                        >
                          (CD /{" "}
                          <input
                            type="number"
                            className="config-inline-input"
                            style={{
                              width: "75px",
                              margin: "0 4px",
                              padding: "4px",
                              fontWeight: 700,
                            }}
                            value={hangSo.printWasteA}
                            onChange={(e) =>
                              capNhatHangSo(
                                "printWasteA",
                                parseFloat(e.target.value) || 6000,
                              )
                            }
                          />{" "}
                          × B)
                        </span>
                      </th>
                      <th style={{ paddingBottom: "8px" }}>
                        Vượt định mức{" "}
                        <input
                          type="number"
                          className="config-inline-input"
                          style={{
                            width: "75px",
                            margin: "0 4px",
                            padding: "4px",
                            fontWeight: 700,
                          }}
                          value={hangSo.printWasteC}
                          onChange={(e) =>
                            capNhatHangSo(
                              "printWasteC",
                              parseFloat(e.target.value) || 50000,
                            )
                          }
                        />{" "}
                        m<br />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "normal",
                            textTransform: "none",
                          }}
                        >
                          (cộng thêm CD / C × D)
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacMocMauIn.map((i) => (
                      <tr key={i}>
                        <td>{i} màu</td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            style={{ width: "70px" }}
                            value={hangSo.colorSetup[i] || 0}
                            onChange={(e) =>
                              xuLyDoiCaiDatMau(
                                i,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.9em",
                                color: "var(--text)",
                              }}
                            >
                              CD / {hangSo.printWasteA}
                            </span>
                            <span
                              style={{
                                fontSize: "0.9em",
                                color: "var(--muted)",
                              }}
                            >
                              ×
                            </span>
                            <input
                              type="number"
                              className="config-inline-input"
                              style={{ width: "75px" }}
                              value={hangSo.printWasteB}
                              onChange={(e) =>
                                capNhatHangSo(
                                  "printWasteB",
                                  parseFloat(e.target.value) || 40,
                                )
                              }
                            />
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.9em",
                                color: "var(--text)",
                              }}
                            >
                              + max(0, CD - {hangSo.printWasteC}) /{" "}
                              {hangSo.printWasteC}
                            </span>
                            <span
                              style={{
                                fontSize: "0.9em",
                                color: "var(--muted)",
                              }}
                            >
                              ×
                            </span>
                            <input
                              type="number"
                              className="config-inline-input"
                              style={{ width: "75px" }}
                              value={hangSo.printWasteD}
                              onChange={(e) =>
                                capNhatHangSo(
                                  "printWasteD",
                                  parseFloat(e.target.value) || 400,
                                )
                              }
                            />
                            {i > 8 && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  color: "var(--danger)",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                                onClick={() => xoaMocMauIn(i)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn btn-sm btn-outline"
                style={{ marginTop: "10px" }}
                onClick={themMocMauIn}
              >
                + Thêm
              </button>
              <p className="config-note">
                💡 A, B, C, D là các tham số dùng chung cho mọi số màu in.
              </p>
            </div>
          )}
          {/* 1.3 Phụ phí nhũ / phủ mờ */}
          {hienSanXuat && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>✨ Chi Phí Nhũ / Phủ Mờ</span>
              </div>
              <div className="config-table-wrap" style={{ marginTop: "12px" }}>
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Tên phụ phí</th>
                      <th>Giá (đ)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacPhuPhiInMacDinh.map((option) => (
                      <tr key={option.key}>
                        <td style={{ fontWeight: 700 }}>{option.label}</td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            value={option.price}
                            onChange={(e) =>
                              capNhatHangSo(
                                option.priceKey,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td
                          style={{ color: "var(--muted)", fontSize: "0.8rem" }}
                        >
                          Mặc định
                        </td>
                      </tr>
                    ))}
                    {(hangSo.customPrintSurcharges ?? []).map((option) => (
                      <tr key={option.key}>
                        <td>
                          <input
                            className="config-inline-input"
                            type="text"
                            value={option.label}
                            onChange={(e) =>
                              xuLyDoiPhuPhiIn(
                                option.key,
                                "label",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            value={option.price}
                            onChange={(e) =>
                              xuLyDoiPhuPhiIn(
                                option.key,
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{
                              color: "var(--danger)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                            }}
                            onClick={() => xoaPhuPhiIn(option.key)}
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
                className="btn btn-sm btn-outline"
                style={{ marginTop: "10px" }}
                onClick={themPhuPhiIn}
              >
                + Thêm
              </button>
              <p className="config-note">
                💡 Khi tích Nhũ, Phủ mờ hoặc phụ phí thêm ở form nhập liệu, giá
                trị tương ứng sẽ được cộng vào CPSX in.
              </p>
            </div>
          )}
          {/* 1.4 CPSX khâu in */}
          {hienSanXuat && (
            <div className="card config-card config-cpsx-print-card">
              <div className="config-section-title">
                <span>🖨️ CPSX Khâu in</span>
              </div>
              <div
                className="config-cpsx-split"
                style={{ display: "flex", alignItems: "stretch", gap: "0" }}
              >
                <div
                  className="config-cpsx-panel config-cpsx-main-panel"
                  style={{
                    padding: "12px 20px 12px 0",
                    minWidth: "220px",
                    borderRight: "2px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    CPSX in thường
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: "8px",
                    }}
                  >
                    CPSX khâu in (đ/m²)
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={hangSo.laborCost}
                    onChange={(e) =>
                      capNhatHangSo(
                        "laborCost",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    style={{ width: "120px", fontWeight: 700 }}
                  />
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      marginTop: "8px",
                    }}
                  >
                    Không áp dụng cho Màng in
                  </div>
                </div>
                <div
                  className="config-cpsx-panel config-cpsx-formula-panel"
                  style={{ padding: "12px 0 12px 20px", flex: 1 }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    CP Màng in
                  </div>
                  <div
                    className="config-cpsx-field-row config-cpsx-labor-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                        fontWeight: 600,
                      }}
                    >
                      Chi phí nhân công/giờ
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input"
                      value={dinhDangVnd(
                        hangSo.printFilmLaborCostPerHour ?? 1200000,
                      )}
                      onChange={(e) =>
                        capNhatHangSoSo(
                          "printFilmLaborCostPerHour",
                          docSoVnd(e.target.value),
                          1200000,
                        )
                      }
                      style={{
                        width: "120px",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    />
                    <span
                      style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                    >
                      đ/giờ
                    </span>
                  </div>
                  <div
                    className="config-cpsx-field-row config-cpsx-param-pair config-cpsx-setup-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <span>Setup = Số màu ×</span>
                    <input
                      type="number"
                      className="config-inline-input"
                      style={{
                        width: "58px",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                      value={hangSo.printFilmSetupMinutesPerColor ?? 20}
                      onChange={(e) =>
                        capNhatHangSoSo(
                          "printFilmSetupMinutesPerColor",
                          parseFloat(e.target.value),
                          20,
                        )
                      }
                    />
                    <span>/</span>
                    <input
                      type="number"
                      className="config-inline-input"
                      style={{
                        width: "58px",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                      value={hangSo.printFilmSetupHourDivisor ?? 60}
                      onChange={(e) =>
                        capNhatHangSoSo(
                          "printFilmSetupHourDivisor",
                          parseFloat(e.target.value),
                          60,
                        )
                      }
                    />
                  </div>
                  <div
                    className="config-cpsx-field-row config-cpsx-param-pair config-cpsx-short-run-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                    }}
                  >
                    <span>SX &lt;</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input"
                      style={{
                        width: "78px",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                      value={dinhDangVnd(
                        hangSo.printFilmLengthThreshold ?? 40000,
                      )}
                      onChange={(e) =>
                        capNhatHangSoSo(
                          "printFilmLengthThreshold",
                          docSoVnd(e.target.value),
                          40000,
                        )
                      }
                    />
                    <span>: mét /</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-inline-input"
                      style={{
                        width: "78px",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                      value={dinhDangVnd(hangSo.printFilmShortRunSpeed ?? 7500)}
                      onChange={(e) =>
                        capNhatHangSoSo(
                          "printFilmShortRunSpeed",
                          docSoVnd(e.target.value),
                          7500,
                        )
                      }
                    />
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--muted)" }}>
                    SX ≥ {dinhDangVnd(hangSo.printFilmLengthThreshold ?? 40000)}
                    : mét / {dinhDangVnd(hangSo.printFilmShortRunSpeed ?? 7500)}{" "}
                    + mét /{" "}
                    {dinhDangVnd(hangSo.printFilmLengthThreshold ?? 40000)}
                  </div>
                </div>
              </div>
              <p className="config-note">
                💡 Với Màng in: CPSX đ/m² chỉ là mực/dung môi + phụ phí in; chi
                phí chạy máy nằm ở CP Màng in.
              </p>
            </div>
          )}
          {hienLaiVay && <KhoiPhienBan scope="interest" />}
          {hienLaiVay && (
            <div className="card config-card config-interest-card">
              <div className="config-section-title">
                <span>Lãi Vay Công Nợ</span>
              </div>
              <div className="config-cpsx-grid config-interest-rate-grid">
                <div className="config-cpsx-item">
                  <label>Mức (lãi cơ sở % / năm)</label>
                  <div
                    className="config-interest-input-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: "100px" }}
                      value={parseFloat((hangSo.interestBase * 100).toFixed(4))}
                      step="0.1"
                      min="0"
                      onChange={(e) =>
                        capNhatHangSo(
                          "interestBase",
                          (parseFloat(e.target.value) || 0) / 100,
                        )
                      }
                    />
                    <span
                      style={{ color: "var(--muted)", fontSize: "0.85rem" }}
                    >
                      %/năm
                    </span>
                  </div>
                </div>
                <div className="config-cpsx-item">
                  <label>Thêm (lãi tình huống % / năm)</label>
                  <div
                    className="config-interest-input-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: "100px" }}
                      value={parseFloat(
                        (hangSo.interestSpread * 100).toFixed(4),
                      )}
                      step="0.1"
                      min="0"
                      onChange={(e) =>
                        capNhatHangSo(
                          "interestSpread",
                          (parseFloat(e.target.value) || 0) / 100,
                        )
                      }
                    />
                    <span
                      style={{ color: "var(--muted)", fontSize: "0.85rem" }}
                    >
                      %/năm
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="config-note config-interest-note"
                style={{ marginTop: "12px" }}
              >
                <div>
                  Tổng lãi = Mức + Thêm ={" "}
                  <strong>{(tongLaiNam * 100).toFixed(2)}%/năm</strong>.
                </div>
                <div
                  className="config-interest-days-table"
                  style={{
                    marginTop: "10px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    className="config-interest-days-row config-interest-days-head"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px 1fr 1fr",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 700,
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ padding: "8px 10px" }}></div>
                    <div style={{ padding: "8px 10px", textAlign: "center" }}>
                      Ngày công nợ
                    </div>
                    <div style={{ padding: "8px 10px", textAlign: "center" }}>
                      Tỷ lệ lãi
                    </div>
                  </div>
                  {mocNgayLaiVay.map((days) => (
                    <div
                      className="config-interest-days-row"
                      key={days}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px 1fr 1fr",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {(hangSo.customPaymentDays ?? []).includes(days) && (
                          <button
                            className="btn btn-sm"
                            style={{
                              color: "var(--danger)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              padding: "2px 6px",
                            }}
                            onClick={() => {
                              capNhatHangSo(
                                "customPaymentDays",
                                (hangSo.customPaymentDays ?? []).filter(
                                  (d) => d !== days,
                                ),
                              );
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {days} ngày
                      </div>
                      <div
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          fontSize: "1.05rem",
                          fontWeight: 800,
                          color: "var(--accent)",
                        }}
                      >
                        {dinhDangTyLeLaiNgay(days)}%
                      </div>
                    </div>
                  ))}
                  <div
                    className="config-interest-days-row config-interest-days-add"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px 1fr 1fr",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="config-interest-days-add-action"
                      style={{
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                      }}
                    >
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={!hopLeNgayCongNoMoi}
                        onClick={themNgayCongNo}
                      >
                        + Thêm
                      </button>
                    </div>
                    <div
                      className="config-interest-days-add-input"
                      style={{
                        padding: "8px 10px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-input"
                        placeholder="Số ngày"
                        value={ngayCongNoMoi}
                        onChange={(e) => capNhatNgayCongNoMoi(e.target.value)}
                        onKeyDown={(e) => {
                          if ([".", ",", "-", "+", "e", "E"].includes(e.key))
                            e.preventDefault();
                          if (e.key === "Enter") themNgayCongNo();
                        }}
                        style={{ width: "110px", textAlign: "center" }}
                      />
                    </div>
                    <div
                      className="config-interest-days-add-preview"
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        color: "var(--accent)",
                      }}
                    >
                      {hopLeNgayCongNoMoi
                        ? `${dinhDangTyLeLaiNgay(soNgayCongNoMoi)}%`
                        : "--"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {hienLaiVay && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>Lãy vay dành riêng cho màn in</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="number"
                  className="config-inline-input"
                  style={{ width: "70px", textAlign: "right", fontWeight: 700 }}
                  value={parseFloat(
                    ((hangSo.printFilmInterestRate ?? 0.01) * 100).toFixed(4),
                  )}
                  step="0.1"
                  min="0"
                  onChange={(e) =>
                    capNhatHangSo(
                      "printFilmInterestRate",
                      ((parseFloat(e.target.value) || 0) / 100) as any,
                    )
                  }
                />
                <span>%</span>
              </div>
              <p className="config-note">
                💡 Chỉ áp dụng cho Màng in chỉ có công đoạn in.
              </p>
            </div>
          )}
          {/* NHOM 2: CHI PHI KHAU GHEP */}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
            <div
              className="config-group-header"
              id="sect-config-ghep"
              style={{ scrollMarginTop: "80px" }}
            >
              🔗 CPSX Khâu Ghép
            </div>
          )}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
            <div className="card config-card config-cpsx-merge-card">
              <div
                className="config-cpsx-split"
                style={{ display: "flex", alignItems: "stretch", gap: "0" }}
              >
                {/* Cột trái: CPSX Ghép */}
                <div
                  className="config-cpsx-panel config-cpsx-main-panel"
                  style={{
                    padding: "12px 20px 12px 0",
                    minWidth: "180px",
                    borderRight: "2px solid var(--border)",
                    display: anCotCPSX ? "none" : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    CPSX ghép (đ/m²)
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={hangSo.ghepCPSX}
                    onChange={(e) =>
                      capNhatHangSo("ghepCPSX", parseFloat(e.target.value) || 0)
                    }
                    style={{ width: "130px" }}
                  />
                </div>
                {/* Cột phải: Phi hao */}
                <div
                  className="config-cpsx-panel config-cpsx-formula-panel"
                  style={{
                    padding: "12px 0 12px 20px",
                    flex: 1,
                    display: anCotPhiHao ? "none" : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    Phi hao ghép = (Chiều dài × A × B) + C
                  </div>
                  <div
                    className="config-cpsx-waste-grid"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="config-cpsx-lead" aria-hidden="true">
                      Chiều dài ×
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-a"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">A - </span>mẫu số
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "80px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.ghepWasteA ?? 3000}
                        onChange={(e) =>
                          capNhatHangSo(
                            "ghepWasteA",
                            parseFloat(e.target.value) || 3000,
                          )
                        }
                      />
                    </div>
                    <span
                      className="config-cpsx-operator"
                      style={{
                        color: "var(--muted)",
                        fontSize: "1.1rem",
                        marginTop: "16px",
                      }}
                    >
                      ×
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-b"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">B - </span>hao/A mét
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "70px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.ghepWasteB ?? 20}
                        onChange={(e) =>
                          capNhatHangSo(
                            "ghepWasteB",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <span
                      className="config-cpsx-operator"
                      style={{
                        color: "var(--muted)",
                        fontSize: "1.1rem",
                        marginTop: "16px",
                      }}
                    >
                      +
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-c"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">C - </span>cố định (m)
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "70px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.ghepWasteC ?? 100}
                        onChange={(e) =>
                          capNhatHangSo(
                            "ghepWasteC",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="config-note" style={{ marginTop: "8px" }}>
                💡 Chi phí sản xuất ghép tính trên mỗi m² màng. Phi hao = (Tp
                ghép × A × B) + C.
              </p>
            </div>
          )}
          {/* NHOM 3: CHI PHI KHAU CAT */}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
            <div
              className="config-group-header"
              id="sect-config-cat"
              style={{ scrollMarginTop: "80px" }}
            >
              ✂️ CPSX Khâu Cắt
            </div>
          )}
          {(hienSanXuat || hienHaoHut || hienCongThuc) && (
            <div className="card config-card config-cpsx-cut-card">
              <div
                className="config-cpsx-split"
                style={{ display: "flex", alignItems: "stretch", gap: "0" }}
              >
                {/* Cột trái: CPSX Cắt cơ bản */}
                <div
                  className="config-cpsx-panel config-cpsx-main-panel"
                  style={{
                    padding: "12px 20px 12px 0",
                    minWidth: "180px",
                    borderRight: "2px solid var(--border)",
                    display: anCotCPSX ? "none" : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    CPSX cắt cơ bản (đ)
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={hangSo.cutBase}
                    onChange={(e) =>
                      capNhatHangSo("cutBase", parseFloat(e.target.value) || 0)
                    }
                    style={{ width: "130px" }}
                  />
                </div>
                {/* Cột phải: Phi hao cắt */}
                <div
                  className="config-cpsx-panel config-cpsx-formula-panel"
                  style={{
                    padding: "12px 0 12px 20px",
                    flex: 1,
                    display: anCotPhiHao ? "none" : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "8px",
                    }}
                  >
                    Phi hao cắt = (Chiều dài × A × B) + C
                  </div>
                  <div
                    className="config-cpsx-waste-grid"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="config-cpsx-lead" aria-hidden="true">
                      Chiều dài ×
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-a"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">A - </span>mẫu số
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "80px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.cutWasteA ?? 3000}
                        onChange={(e) =>
                          capNhatHangSo(
                            "cutWasteA",
                            parseFloat(e.target.value) || 3000,
                          )
                        }
                      />
                    </div>
                    <span
                      className="config-cpsx-operator"
                      style={{
                        color: "var(--muted)",
                        fontSize: "1.1rem",
                        marginTop: "16px",
                      }}
                    >
                      ×
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-b"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">B - </span>hao/A mét
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "70px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.cutWasteB ?? 20}
                        onChange={(e) =>
                          capNhatHangSo(
                            "cutWasteB",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <span
                      className="config-cpsx-operator"
                      style={{
                        color: "var(--muted)",
                        fontSize: "1.1rem",
                        marginTop: "16px",
                      }}
                    >
                      +
                    </span>
                    <div
                      className="config-cpsx-param config-cpsx-param-c"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                      >
                        <span className="config-cpsx-abc">C - </span>cố định (m)
                      </span>
                      <input
                        type="number"
                        className="config-inline-input"
                        style={{
                          width: "70px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                        value={hangSo.cutWasteC ?? 100}
                        onChange={(e) =>
                          capNhatHangSo(
                            "cutWasteC",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="config-table-wrap config-cut-rules-wrap"
                style={{
                  marginTop: "12px",
                  display: anCotCPSX ? "none" : undefined,
                }}
              >
                <table className="config-table config-cut-rules-table">
                  <thead>
                    <tr>
                      <th>Diện tích túi</th>
                      <th>Ngưỡng (m²)</th>
                      <th>Hệ số</th>
                      <th>CPSX Cắt thực tế</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quyTacCat.map((rule, index) => {
                      const laDongCuoi = index === quyTacCat.length - 1;
                      return (
                        <tr key={index}>
                          <td data-label="Diện tích túi">
                            <input
                              type="text"
                              className="config-inline-input"
                              value={rule.label}
                              onChange={(e) =>
                                capNhatQuyTacCat(index, {
                                  label: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td data-label="Ngưỡng">
                            {laDongCuoi ? (
                              "-"
                            ) : (
                              <input
                                type="number"
                                className="config-inline-input"
                                value={rule.threshold ?? 0}
                                step="0.01"
                                onChange={(e) =>
                                  capNhatQuyTacCat(index, {
                                    threshold: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            )}
                          </td>
                          <td data-label="Hệ số">
                            <input
                              type="number"
                              className="config-inline-input"
                              value={rule.multiplier}
                              step="0.1"
                              onChange={(e) =>
                                capNhatQuyTacCat(index, {
                                  multiplier: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td data-label="CPSX thực tế" className="cut-preview">
                            {(hangSo.cutBase * rule.multiplier).toLocaleString(
                              "vi-VN",
                              { maximumFractionDigits: 0 },
                            )}
                          </td>
                          <td className="config-cut-rule-delete-cell">
                            <button
                              className="btn btn-sm config-cut-rule-delete-btn"
                              aria-label="Xóa quy tắc"
                              title="Xóa quy tắc"
                              style={{
                                color: "var(--danger)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                              }}
                              onClick={() => xoaQuyTacCat(index)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                className="btn btn-sm btn-outline"
                style={{
                  marginTop: "10px",
                  display: anCotCPSX ? "none" : undefined,
                }}
                onClick={themQuyTacCat}
              >
                + Thêm
              </button>
              <p className="config-note">
                💡 CPSX Cắt = Cắt cơ bản × Hệ số. Ngưỡng dựa trên diện tích túi
                (m²).
              </p>
            </div>
          )}
          {hienLoiNhuan && <KhoiPhienBan scope="profit" />}
          {/* NHOM 4: BANG LOI NHUAN */}
          {hienLoiNhuan && (
            <div
              className="config-group-header"
              id="sect-config-loinhuan"
              style={{ scrollMarginTop: "80px" }}
            >
              💰 Bảng Lợi Nhuận
            </div>
          )}
          {hienLoiNhuan && (
            <div className="card config-card">
              <div
                className="config-section-title"
                style={{ alignItems: "center" }}
              >
                <span>📈 Tổng giá thành sản xuất cơ bản</span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "normal",
                      color: "var(--muted)",
                    }}
                  >
                    Nhóm Khách hàng:
                  </span>
                  <select
                    className="form-select"
                    value={nhomKhachHang}
                    onChange={(e) => datNhomKhachHang(e.target.value)}
                    style={{
                      width: "auto",
                      padding: "4px 24px 4px 10px",
                      fontWeight: "normal",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="svlg">Khách lớn</option>
                    <option value="other">Khách thường</option>
                  </select>
                </div>
              </div>
              <div className="config-table-wrap">
                <table className="config-table" id="bangLoiNhuan">
                  <thead>
                    <tr>
                      <th>Từ</th>
                      <th>Đến</th>
                      <th>
                        Con lai (mang in, mang ghep 2 lop, tui 1-2 lop cut
                        seal...)
                      </th>
                      <th>
                        Tui/mang &gt;= 3 lop; tui day dung/zipper; co
                        MPET/AL/giay
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bangLoiNhuan.map((row, i) => (
                      <tr key={i}>
                        {(() => {
                          const bounds = layBienLoiNhuan(i, row.threshold);
                          return (
                            <>
                              <td>
                                <span style={{ fontWeight: 700 }}>
                                  {dinhDangVnd(bounds.from)}
                                </span>
                              </td>
                              <td>
                                <input
                                  className="config-inline-input"
                                  type="text"
                                  inputMode="numeric"
                                  value={
                                    nguongLoiNhuanDangSua[i] ??
                                    dinhDangVnd(row.threshold)
                                  }
                                  onChange={(e) =>
                                    datNguongLoiNhuanDangSua((prev) => ({
                                      ...prev,
                                      [i]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => luuNguongLoiNhuanDangSua(i)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      e.currentTarget.blur();
                                    if (e.key === "Escape")
                                      datNguongLoiNhuanDangSua(
                                        ({ [i]: _boQua, ...conLai }) => conLai,
                                      );
                                  }}
                                  style={{
                                    width: "130px",
                                    textAlign: "right",
                                    fontWeight: 700,
                                  }}
                                />
                                <div
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "var(--muted)",
                                    marginTop: "2px",
                                  }}
                                >
                                  &lt; {dinhDangVnd(row.threshold)}
                                </div>
                              </td>
                            </>
                          );
                        })()}
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            step="0.5"
                            value={
                              +(
                                (row[cotLoiNhuanTheoNhom.col1] ?? 0) * 100
                              ).toFixed(2)
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const cuaHang = dungCuaHangTinhGia.getState();
                              const bangMoi = [...cuaHang.profitTable];
                              bangMoi[i] = {
                                ...bangMoi[i],
                                [cotLoiNhuanTheoNhom.col1]: val / 100,
                              };
                              dungCuaHangTinhGia.setState({
                                profitTable: bangMoi,
                              });
                              cuaHang.recalculate();
                              luuBangLoiNhuanTre();
                            }}
                            style={{ width: "70px", textAlign: "right" }}
                          />{" "}
                          %
                        </td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            step="0.5"
                            value={
                              +(
                                (row[cotLoiNhuanTheoNhom.col2] ?? 0) * 100
                              ).toFixed(2)
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const cuaHang = dungCuaHangTinhGia.getState();
                              const bangMoi = [...cuaHang.profitTable];
                              bangMoi[i] = {
                                ...bangMoi[i],
                                [cotLoiNhuanTheoNhom.col2]: val / 100,
                              };
                              dungCuaHangTinhGia.setState({
                                profitTable: bangMoi,
                              });
                              cuaHang.recalculate();
                              luuBangLoiNhuanTre();
                            }}
                            style={{ width: "70px", textAlign: "right" }}
                          />{" "}
                          %
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {i === bangLoiNhuan.length - 1 &&
                            bangLoiNhuan.length >
                              INITIAL_PROFIT_TABLE.length && (
                              <button
                                className="btn btn-sm"
                                title="Xóa mốc lợi nhuận cuối cùng"
                                style={{
                                  color: "var(--danger,#e53e3e)",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "1rem",
                                  padding: "2px 6px",
                                }}
                                onClick={xoaMocLoiNhuanCuoi}
                              >
                                ✕
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={5}
                        style={{ paddingTop: "10px", textAlign: "left" }}
                      >
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={themMocLoiNhuan}
                        >
                          + Thêm mốc lợi nhuận
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="config-note">
                Tỉ lệ lợi nhuận tự động tính từ giá vốn. Các con số này có thể
                chỉnh sửa và tự động lưu.
              </p>
            </div>
          )}
          {hienLoiNhuan && (
            <div className="card config-card">
              <div
                className="config-section-title"
                style={{ alignItems: "center" }}
              >
                <span>
                  📊 Tỷ lệ lợi nhuận theo số màu in (Dành riêng cho màng in)
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "normal",
                      color: "var(--muted)",
                    }}
                  >
                    Nhóm khách:
                  </span>
                  <select
                    className="form-select"
                    value={nhomKhachMangInDangXem}
                    onChange={(e) =>
                      datNhomKhachMangInDangXem(
                        e.target.value as "normal" | "large",
                      )
                    }
                    style={{
                      width: "auto",
                      padding: "4px 24px 4px 10px",
                      fontWeight: "normal",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="normal">Khách thường</option>
                    <option value="large">Khách lớn</option>
                  </select>
                </div>
              </div>
              <div className="config-table-wrap">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Số màu từ</th>
                      <th>Số màu đến</th>
                      <th>Tỷ lệ lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tyLeLoiNhuanMangIn.map((row, idx) => (
                      <tr
                        key={`${row.customerGroup}-${row.colorFrom}-${row.colorTo}`}
                      >
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            value={row.colorFrom}
                            min="0"
                            onChange={(e) =>
                              capNhatTyLeLoiNhuanMangIn(idx, {
                                colorFrom: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            style={{
                              width: "70px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            value={row.colorTo}
                            min="0"
                            onChange={(e) =>
                              capNhatTyLeLoiNhuanMangIn(idx, {
                                colorTo: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            style={{
                              width: "70px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="config-inline-input"
                            type="number"
                            step="0.5"
                            value={+((row.rate ?? 0) * 100).toFixed(2)}
                            onChange={(e) =>
                              capNhatTyLeLoiNhuanMangIn(idx, {
                                rate: (parseFloat(e.target.value) || 0) / 100,
                              })
                            }
                            style={{
                              width: "70px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          />{" "}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="config-note">
                💡 Chỉ áp dụng cho Màng in chỉ có công đoạn in. Tỷ lệ lợi nhuận
                được chọn theo Nhóm khách + Số màu in.
              </p>
            </div>
          )}
          {/* NHOM 5: GIA PHU KIEN */}
          {hienPhuPhi && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>🖨️ Đơn Giá Trục In</span>
              </div>
              <div className="cylinder-price-panel">
                <div className="cylinder-price-head">
                  <div>Loại trục</div>
                  <div>Giá trục</div>
                </div>
                <div className="cylinder-price-row">
                  <div>
                    <span className="cylinder-type-badge">Trục A</span>
                  </div>
                  <div className="cylinder-price-input">
                    <input
                      type="number"
                      className="form-input"
                      value={hangSo.cylPriceA ?? 7300000}
                      step="100000"
                      min="0"
                      onChange={(e) =>
                        capNhatHangSo(
                          "cylPriceA",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                    <span>đ/m²</span>
                  </div>
                </div>
                <div className="cylinder-price-row">
                  <div>
                    <span className="cylinder-type-badge cylinder-type-badge--b">
                      Trục B
                    </span>
                  </div>
                  <div className="cylinder-price-input">
                    <input
                      type="number"
                      className="form-input"
                      value={hangSo.cylPriceB ?? 6500000}
                      step="100000"
                      min="0"
                      onChange={(e) =>
                        capNhatHangSo(
                          "cylPriceB",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                    <span>đ/m²</span>
                  </div>
                </div>
                <div className="cylinder-price-row cylinder-price-row--muted">
                  <div>
                    <span className="cylinder-type-badge cylinder-type-badge--custom">
                      Trục khác
                    </span>
                  </div>
                  <div className="cylinder-custom-note">
                    Nhập trong form tính giá khi chọn <strong>Trục khác</strong>
                    .
                  </div>
                </div>
                {(hangSo.customCylTypes ?? []).map((cyl, idx) => (
                  <div className="cylinder-price-row" key={cyl.key}>
                    <div>
                      <input
                        type="text"
                        className="config-inline-input"
                        value={cyl.label}
                        style={{ width: "100px", fontWeight: 600 }}
                        onChange={(e) => {
                          const arr = [...(hangSo.customCylTypes ?? [])];
                          arr[idx] = { ...cyl, label: e.target.value };
                          capNhatHangSo("customCylTypes", arr);
                        }}
                      />
                    </div>
                    <div className="cylinder-price-input">
                      <input
                        type="number"
                        className="form-input"
                        value={cyl.price}
                        step="100000"
                        min="0"
                        onChange={(e) => {
                          const arr = [...(hangSo.customCylTypes ?? [])];
                          arr[idx] = {
                            ...cyl,
                            price: parseFloat(e.target.value) || 0,
                          };
                          capNhatHangSo("customCylTypes", arr);
                        }}
                      />
                      <span>đ/m²</span>
                      <button
                        className="btn btn-sm"
                        style={{
                          color: "var(--danger)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "1rem",
                          padding: "2px 6px",
                        }}
                        onClick={() => {
                          const arr = (hangSo.customCylTypes ?? []).filter(
                            (_, i) => i !== idx,
                          );
                          capNhatHangSo("customCylTypes", arr);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      const arr = [...(hangSo.customCylTypes ?? [])];
                      const key = `cyl-${Date.now()}`;
                      arr.push({
                        key,
                        label: `Trục ${String.fromCharCode(67 + arr.length)}`,
                        price: 6000000,
                      });
                      capNhatHangSo("customCylTypes", arr);
                    }}
                  >
                    + Thêm loại trục
                  </button>
                </div>
              </div>
            </div>
          )}
          {hienPhuPhi && (
            <div
              className="config-group-header"
              id="sect-config-phukien"
              style={{ scrollMarginTop: "80px" }}
            >
              🎀 Giá Phụ Kiện
            </div>
          )}
          {hienPhuPhi && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>💰 Cài Đặt Đơn Giá Phụ Kiện</span>
              </div>
              <div className="config-table-wrap">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Phụ kiện</th>
                      <th>Đơn giá</th>
                      <th>Đơn vị</th>
                      <th>Trọng lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Zipper</td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          style={{
                            width: "80px",
                            textAlign: "right",
                            fontWeight: 700,
                            background: "transparent",
                          }}
                          value={hangSo.zipperPrice}
                          onChange={(e) =>
                            capNhatHangSo(
                              "zipperPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />{" "}
                        đ/m
                      </td>
                      <td>đ/m</td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          style={{
                            width: "80px",
                            textAlign: "right",
                            fontWeight: 700,
                            background: "transparent",
                          }}
                          value={hangSo.zipperWeight}
                          step="0.1"
                          min="0"
                          onChange={(e) =>
                            capNhatHangSo(
                              "zipperWeight",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />{" "}
                        Gr/m
                      </td>
                    </tr>
                    <tr>
                      <td>Băng keo</td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          style={{
                            width: "80px",
                            textAlign: "right",
                            fontWeight: 700,
                            background: "transparent",
                          }}
                          value={hangSo.tapePrice}
                          onChange={(e) =>
                            capNhatHangSo(
                              "tapePrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />{" "}
                        đ/m
                      </td>
                      <td>đ/m</td>
                      <td>
                        <input
                          type="number"
                          className="config-inline-input"
                          style={{
                            width: "80px",
                            textAlign: "right",
                            fontWeight: 700,
                            background: "transparent",
                          }}
                          value={hangSo.tapeWeight}
                          step="0.1"
                          min="0"
                          onChange={(e) =>
                            capNhatHangSo(
                              "tapeWeight",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />{" "}
                        Gr/m
                      </td>
                    </tr>
                    {(hangSo.handleOptions ?? []).map((option) => (
                      <tr key={option.key}>
                        <td>
                          {option.key.startsWith("custom-") ? (
                            <input
                              type="text"
                              className="config-inline-input"
                              value={option.label}
                              style={{ width: "100px", fontWeight: 600 }}
                              onChange={(e) =>
                                xuLyDoiLoaiQuai(
                                  option.key,
                                  "label",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            option.label
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            style={{
                              width: "80px",
                              textAlign: "right",
                              fontWeight: 700,
                              background: "transparent",
                            }}
                            value={option.price}
                            onChange={(e) =>
                              xuLyDoiLoaiQuai(
                                option.key,
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />{" "}
                          đ/cái
                        </td>
                        <td>đ/cái</td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            style={{
                              width: "80px",
                              textAlign: "right",
                              fontWeight: 700,
                              background: "transparent",
                            }}
                            value={option.weight}
                            step="0.1"
                            min="0"
                            onChange={(e) =>
                              xuLyDoiLoaiQuai(
                                option.key,
                                "weight",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />{" "}
                          Gr/cái
                          {option.key.startsWith("custom-") && (
                            <button
                              className="btn btn-sm"
                              style={{
                                color: "var(--danger)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                marginLeft: 4,
                              }}
                              onClick={() => {
                                const arr = (hangSo.handleOptions ?? []).filter(
                                  (o) => o.key !== option.key,
                                );
                                capNhatHangSo("handleOptions", arr);
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(hangSo.customAccessories ?? []).map((acc, idx) => (
                      <tr key={acc.key}>
                        <td>
                          <input
                            type="text"
                            className="config-inline-input"
                            value={acc.label}
                            style={{ width: "100px", fontWeight: 600 }}
                            onChange={(e) => {
                              const arr = [...(hangSo.customAccessories ?? [])];
                              arr[idx] = { ...acc, label: e.target.value };
                              capNhatHangSo("customAccessories", arr);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            style={{
                              width: "80px",
                              textAlign: "right",
                              fontWeight: 700,
                              background: "transparent",
                            }}
                            value={acc.price}
                            onChange={(e) => {
                              const arr = [...(hangSo.customAccessories ?? [])];
                              arr[idx] = {
                                ...acc,
                                price: parseFloat(e.target.value) || 0,
                              };
                              capNhatHangSo("customAccessories", arr);
                            }}
                          />{" "}
                          {acc.unit === "per_meter" ? "đ/m" : "đ/cái"}
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ width: "96px" }}
                            value={acc.unit}
                            onChange={(e) => {
                              const arr = [...(hangSo.customAccessories ?? [])];
                              arr[idx] = {
                                ...acc,
                                unit: e.target.value as
                                  | "per_piece"
                                  | "per_meter",
                              };
                              capNhatHangSo("customAccessories", arr);
                            }}
                          >
                            <option value="per_piece">đ/cái</option>
                            <option value="per_meter">đ/m</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            style={{
                              width: "80px",
                              textAlign: "right",
                              fontWeight: 700,
                              background: "transparent",
                            }}
                            value={acc.weight}
                            step="0.1"
                            min="0"
                            onChange={(e) => {
                              const arr = [...(hangSo.customAccessories ?? [])];
                              arr[idx] = {
                                ...acc,
                                weight: parseFloat(e.target.value) || 0,
                              };
                              capNhatHangSo("customAccessories", arr);
                            }}
                          />{" "}
                          {acc.unit === "per_meter" ? "Gr/m" : "Gr/cái"}
                          <button
                            className="btn btn-sm"
                            style={{
                              color: "var(--danger)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              marginLeft: 4,
                            }}
                            onClick={() => {
                              const arr = (
                                hangSo.customAccessories ?? []
                              ).filter((_, i) => i !== idx);
                              capNhatHangSo("customAccessories", arr);
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, textAlign: "left" }}>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={themPhuKien}
                >
                  + Thêm phụ kiện
                </button>
              </div>
              <p className="config-note">
                Đơn giá thay đổi tùy thời điểm, tự động áp dụng khi chốt giá cho
                đơn hàng.
              </p>
            </div>
          )}
          {/* NHOM 6: DONG GOI THUNG */}
          {hienPhuPhi && (
            <div
              className="config-group-header"
              id="sect-config-donggoi"
              style={{ scrollMarginTop: "80px" }}
            >
              📦 Đóng gói thùng
            </div>
          )}
          {hienPhuPhi && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>📦 Định mức loại thùng</span>
              </div>
              <div className="config-table-wrap">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Loại thùng</th>
                      <th>Khối lượng (gr/thùng)</th>
                      <th>Giá thùng (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hangSo.boxOptions ?? []).map((option) => (
                      <tr key={option.key}>
                        <td style={{ fontWeight: 700 }}>
                          {option.key.startsWith("custom-") ? (
                            <input
                              type="text"
                              className="config-inline-input"
                              value={option.label}
                              style={{ width: "120px", fontWeight: 700 }}
                              onChange={(e) =>
                                xuLyDoiLoaiThung(
                                  option.key,
                                  "label",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            option.label
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            value={option.weight || 0}
                            onChange={(e) =>
                              xuLyDoiLoaiThung(
                                option.key,
                                "weight",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            style={{
                              width: "120px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="config-inline-input"
                            value={option.price}
                            onChange={(e) =>
                              xuLyDoiLoaiThung(
                                option.key,
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            style={{
                              width: "120px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          />
                          {option.key.startsWith("custom-") && (
                            <button
                              className="btn btn-sm"
                              style={{
                                color: "var(--danger)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                marginLeft: 4,
                              }}
                              onClick={() => {
                                const arr = (hangSo.boxOptions ?? []).filter(
                                  (o) => o.key !== option.key,
                                );
                                capNhatHangSo("boxOptions", arr);
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        style={{ paddingTop: 10, textAlign: "left" }}
                      >
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            const arr = [...(hangSo.boxOptions ?? [])];
                            arr.push({
                              key: `custom-${Date.now()}`,
                              label: "Thùng mới",
                              price: 0,
                              weight: 0,
                            });
                            capNhatHangSo("boxOptions", arr);
                          }}
                        >
                          + Thêm loại thùng
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="config-note">
                Khi nhập đơn túi, chọn loại thùng để tự điền giá thùng. Số
                túi/thùng do người dùng nhập theo kích thước thực tế của đơn.
              </p>
            </div>
          )}
          {hienPhuPhi && (
            <div className="card config-card">
              <div className="config-section-title">
                <span>🚚 Vận chuyển (Dành cho Màng in)</span>
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: "0" }}>
                <div
                  style={{
                    padding: "12px 20px 12px 0",
                    minWidth: "220px",
                    borderRight: "2px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "12px",
                    }}
                  >
                    Vận chuyển Màng in
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Ngưỡng đơn hàng
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          className="config-inline-input"
                          style={{
                            width: "92px",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                          value={dinhDangVnd(
                            hangSo.printFilmShippingThresholdM2 ?? 25000,
                          )}
                          onChange={(e) =>
                            capNhatHangSoSo(
                              "printFilmShippingThresholdM2",
                              docSoVnd(e.target.value),
                              25000,
                            )
                          }
                        />
                        <span
                          style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                        >
                          m²
                        </span>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Chi phí vận chuyển
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          className="config-inline-input"
                          style={{
                            width: "105px",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                          value={dinhDangVnd(
                            hangSo.printFilmShippingBaseCost ?? 500000,
                          )}
                          onChange={(e) =>
                            capNhatHangSoSo(
                              "printFilmShippingBaseCost",
                              docSoVnd(e.target.value),
                              500000,
                            )
                          }
                        />
                        <span
                          style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                        >
                          đ
                        </span>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Mốc đơn lớn
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          className="config-inline-input"
                          style={{
                            width: "92px",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                          value={dinhDangVnd(
                            hangSo.printFilmShippingLargeOrderM2 ?? 30000,
                          )}
                          onChange={(e) =>
                            capNhatHangSoSo(
                              "printFilmShippingLargeOrderM2",
                              docSoVnd(e.target.value),
                              30000,
                            )
                          }
                        />
                        <span
                          style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                        >
                          m²
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "12px 0 12px 20px", flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "12px",
                    }}
                  >
                    Công thức
                  </div>
                  <div style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
                    <div>
                      &lt;{" "}
                      <strong>
                        {dinhDangVnd(
                          hangSo.printFilmShippingThresholdM2 ?? 25000,
                        )}
                      </strong>
                      :{" "}
                      <strong>
                        {dinhDangVnd(
                          hangSo.printFilmShippingBaseCost ?? 500000,
                        )}
                      </strong>{" "}
                      / m² đơn hàng
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      ≥{" "}
                      <strong>
                        {dinhDangVnd(
                          hangSo.printFilmShippingThresholdM2 ?? 25000,
                        )}
                      </strong>
                      :
                    </div>
                    <div style={{ paddingLeft: "12px" }}>
                      (m² đơn hàng /{" "}
                      <strong>
                        {dinhDangVnd(
                          hangSo.printFilmShippingLargeOrderM2 ?? 30000,
                        )}
                      </strong>{" "}
                      ×{" "}
                      <strong>
                        {dinhDangVnd(
                          hangSo.printFilmShippingBaseCost ?? 500000,
                        )}
                      </strong>
                      )
                    </div>
                    <div style={{ paddingLeft: "12px" }}>/ m² đơn hàng</div>
                  </div>
                </div>
              </div>
              <p className="config-note">
                💡 Chỉ áp dụng cho Màng in chỉ có công đoạn in. Công thức này
                thay công thức vận chuyển thường khi đúng điều kiện.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
