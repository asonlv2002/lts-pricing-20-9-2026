"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import {
  layProductionUpgradePriceConfigService,
  replaceUserPriceConfigPoliciesService,
  POLICY_CATALOG,
} from "../../lib/api/service-lts";
import type { PolicyCode } from "../../lib/api/service-lts";
import CpsxNangCapDien from "./CpsxNangCapDien";
import CpsxNangCapLuong from "./CpsxNangCapLuong";
import CpsxNangCapMuc from "./CpsxNangCapMuc";
import CpsxNangCapThoiGian from "./CpsxNangCapThoiGian";
import CpsxNangCapGiaCongKhai from "./CpsxNangCapGiaCongKhai";

/** Nút admin tự cập nhật: cấp đủ cả quyền SỬA (EDIT) + XEM (REVIEW) CPSX nâng cao. */
const CAC_QUYEN_CPSX_NANG_CAO: PolicyCode[] = POLICY_CATALOG
  .filter((p) => p.nhom === "CPSX nâng cao")
  .map((p) => p.code);

function TieuDe({ children }: { children: React.ReactNode }) {
  return <div className="config-group-header">{children}</div>;
}

function DangTaiCpsxNangCao() {
  return (
    <div
      className="config-cpsx-upgrade-shell config-cpsx-upgrade-shell--loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--dim)",
      }}
    >
      <p style={{ margin: 0 }}>Đang tải cấu hình CPSX nâng cao từ server...</p>
    </div>
  );
}

export default function CpsxNangCapTrang() {
  const nguoiDungHienTai = dungCuaHangTinhGia((s) => s.nguoiDungHienTai);
  const daDangNhap = dungCuaHangTinhGia((s) => s.isAuthenticated);
  const dangTai = dungCuaHangTinhGia((s) => s.dangTaiCauHinhMoiNhat);
  const accessToken = dungCuaHangTinhGia((s) => s.accessToken);
  const cpsxPolicies = dungCuaHangTinhGia((s) => s.cpsxNangCapPolicies);
  const dangTaiCpsxPolicies = dungCuaHangTinhGia((s) => s.dangTaiCpsxNangCapPolicies);
  const datCpsxPolicies = dungCuaHangTinhGia((s) => s.datCpsxNangCapPolicies);

  const [dangCapNhatQuyen, setDangCapNhatQuyen] = React.useState(false);

  React.useEffect(() => {
    if (!daDangNhap || !accessToken) {
      datCpsxPolicies([]);
      return;
    }
    // Bật loading trước khi fetch
    dungCuaHangTinhGia.setState({ dangTaiCpsxNangCapPolicies: true });
    layProductionUpgradePriceConfigService(accessToken, 'latest')
      .then((upgrade) => {
        const policies = (upgrade?.policies ?? []) as PolicyCode[];
        datCpsxPolicies(
          policies.filter((p): p is PolicyCode => p.startsWith("CPSX_UPGRADE_")),
        );
      })
      .catch(() => {
        datCpsxPolicies([]);
      });
  }, [daDangNhap, accessToken, datCpsxPolicies]);

  const coQuyen = (code: PolicyCode) => cpsxPolicies.includes(code);

  const laAdmin = nguoiDungHienTai?.account === "admin";
  const nutAdminBiVoHieu =
    dangCapNhatQuyen || !daDangNhap || !accessToken || !laAdmin;

  const xuLyTuCapNhatQuyen = async () => {
    if (nutAdminBiVoHieu) return;
    if (!nguoiDungHienTai || !accessToken) return;
    setDangCapNhatQuyen(true);
    try {
      await replaceUserPriceConfigPoliciesService(
        accessToken,
        nguoiDungHienTai.id,
        [
          {
            configName: "PRODUCTION_UPGRADE",
            policies: CAC_QUYEN_CPSX_NANG_CAO,
          },
        ],
      );
    } catch {
      // im lặng theo yêu cầu
    } finally {
      setDangCapNhatQuyen(false);
    }
  };

  if (daDangNhap && (dangTai || dangTaiCpsxPolicies)) {
    return <DangTaiCpsxNangCao />;
  }

  // ── Quyền SỬA (EDIT) — bật input của từng mục ──
  const coQuyenDien =
    coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME") ||
    coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE");
  const coQuyenLuong =
    coQuyen("CPSX_UPGRADE_EDIT_LABOR_PRINT") ||
    coQuyen("CPSX_UPGRADE_EDIT_LABOR_LAMINATE") ||
    coQuyen("CPSX_UPGRADE_EDIT_LABOR_SLIT") ||
    coQuyen("CPSX_UPGRADE_EDIT_LABOR_BAG");
  const coQuyenMuc =
    coQuyen("CPSX_UPGRADE_EDIT_INK_OPP") ||
    coQuyen("CPSX_UPGRADE_EDIT_INK_PET") ||
    coQuyen("CPSX_UPGRADE_EDIT_INK_PE") ||
    coQuyen("CPSX_UPGRADE_EDIT_SOLVENT") ||
    coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE") ||
    coQuyen("CPSX_UPGRADE_EDIT_INK_RATE") ||
    coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE_RATE");
  const coQuyenThoiGian =
    coQuyen("CPSX_UPGRADE_EDIT_TIME_PRINT") ||
    coQuyen("CPSX_UPGRADE_EDIT_TIME_LAMINATE") ||
    coQuyen("CPSX_UPGRADE_EDIT_TIME_SLIT") ||
    coQuyen("CPSX_UPGRADE_EDIT_TIME_BAG");

  // ── Quyền XEM (REVIEW) — hiện mục ở chế độ chỉ xem ──
  const coXemDien =
    coQuyen("CPSX_UPGRADE_REVIEW_ELECTRIC_TIME_FRAME") ||
    coQuyen("CPSX_UPGRADE_REVIEW_ELECTRIC_PER_MINUTE");
  const coXemLuong =
    coQuyen("CPSX_UPGRADE_REVIEW_LABOR_PRINT") ||
    coQuyen("CPSX_UPGRADE_REVIEW_LABOR_LAMINATE") ||
    coQuyen("CPSX_UPGRADE_REVIEW_LABOR_SLIT") ||
    coQuyen("CPSX_UPGRADE_REVIEW_LABOR_BAG");
  const coXemMuc =
    coQuyen("CPSX_UPGRADE_REVIEW_INK_OPP") ||
    coQuyen("CPSX_UPGRADE_REVIEW_INK_PET") ||
    coQuyen("CPSX_UPGRADE_REVIEW_INK_PE") ||
    coQuyen("CPSX_UPGRADE_REVIEW_SOLVENT") ||
    coQuyen("CPSX_UPGRADE_REVIEW_ADHESIVE") ||
    coQuyen("CPSX_UPGRADE_REVIEW_INK_RATE") ||
    coQuyen("CPSX_UPGRADE_REVIEW_ADHESIVE_RATE");
  const coXemThoiGian =
    coQuyen("CPSX_UPGRADE_REVIEW_TIME_PRINT") ||
    coQuyen("CPSX_UPGRADE_REVIEW_TIME_LAMINATE") ||
    coQuyen("CPSX_UPGRADE_REVIEW_TIME_SLIT") ||
    coQuyen("CPSX_UPGRADE_REVIEW_TIME_BAG");

  // Section hiển thị khi có quyền SỬA hoặc XEM thuộc nhóm đó;
  // chiXem = chỉ có XEM (không có SỬA) → toàn bộ input khóa.
  const hienDien = coQuyenDien || coXemDien;
  const hienLuong = coQuyenLuong || coXemLuong;
  const hienMuc = coQuyenMuc || coXemMuc;
  const hienThoiGian = coQuyenThoiGian || coXemThoiGian;

  // Khối giá công khai (bảng giá in theo số màu + giá ghép ₫/m²): hiện cho
  // ai KHÔNG có quyền nhóm Mực — ai có quyền đã thấy 2 bảng này trong mục 3.
  const hienGiaCongKhai = !hienMuc;

  return (
    <div className="config-cpsx-upgrade-shell">
      {(hienDien || hienLuong || hienMuc) && (
        <>
          {hienDien && (
            <>
              <TieuDe>1. Điện</TieuDe>
              <CpsxNangCapDien
                chiXem={!coQuyenDien}
                coQuyenKhungGio={coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME")}
                coQuyenDienMay={coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE")}
              />
            </>
          )}

          {hienLuong && (
            <>
              <TieuDe>2. Tiền lương</TieuDe>
              <CpsxNangCapLuong
                chiXem={!coQuyenLuong}
                coQuyenPrint={coQuyen("CPSX_UPGRADE_EDIT_LABOR_PRINT")}
                coQuyenLaminate={coQuyen("CPSX_UPGRADE_EDIT_LABOR_LAMINATE")}
                coQuyenSlit={coQuyen("CPSX_UPGRADE_EDIT_LABOR_SLIT")}
                coQuyenBag={coQuyen("CPSX_UPGRADE_EDIT_LABOR_BAG")}
              />
            </>
          )}

          {hienMuc && (
            <>
              <TieuDe>3. Mực · Dung môi · Keo ghép</TieuDe>
              <CpsxNangCapMuc
                chiXem={!coQuyenMuc}
                coQuyenOpp={coQuyen("CPSX_UPGRADE_EDIT_INK_OPP")}
                coQuyenPet={coQuyen("CPSX_UPGRADE_EDIT_INK_PET")}
                coQuyenPe={coQuyen("CPSX_UPGRADE_EDIT_INK_PE")}
                coQuyenDungMoi={coQuyen("CPSX_UPGRADE_EDIT_SOLVENT")}
                coQuyenKeo={coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE")}
                coQuyenInRate={coQuyen("CPSX_UPGRADE_EDIT_INK_RATE")}
                coQuyenAdhesiveRate={coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE_RATE")}
                coXemInRate={coQuyen("CPSX_UPGRADE_REVIEW_INK_RATE")}
                coXemAdhesiveRate={coQuyen("CPSX_UPGRADE_REVIEW_ADHESIVE_RATE")}
              />
            </>
          )}
        </>
      )}

      {hienGiaCongKhai && <CpsxNangCapGiaCongKhai />}

      {hienThoiGian && (
        <>
          <TieuDe>4. Thời gian sản xuất</TieuDe>
          <CpsxNangCapThoiGian
            chiXem={!coQuyenThoiGian}
            coQuyenPrint={coQuyen("CPSX_UPGRADE_EDIT_TIME_PRINT")}
            coQuyenLaminate={coQuyen("CPSX_UPGRADE_EDIT_TIME_LAMINATE")}
            coQuyenSlit={coQuyen("CPSX_UPGRADE_EDIT_TIME_SLIT")}
            coQuyenBag={coQuyen("CPSX_UPGRADE_EDIT_TIME_BAG")}
          />
        </>
      )}

      {daDangNhap && laAdmin && (
        <div className="config-cpsx-upgrade-admin-bar">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={xuLyTuCapNhatQuyen}
            disabled={nutAdminBiVoHieu}
          >
            <ShieldCheck size={14} />
            Tự cập nhật quyền CPSX nâng cao (admin)
          </button>
        </div>
      )}
    </div>
  );
}
