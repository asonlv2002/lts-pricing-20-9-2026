"use client";

import React from "react";
import { dungCuaHangTinhGia } from "../../store/CuaHangTinhGia";
import { layPriceConfigMoiNhatService } from "../../lib/api/service-lts";
import type { PolicyCode } from "../../lib/api/service-lts";
import CpsxNangCapDien from "./CpsxNangCapDien";
import CpsxNangCapKetQua from "./CpsxNangCapKetQua";
import CpsxNangCapLuong from "./CpsxNangCapLuong";
import CpsxNangCapMuc from "./CpsxNangCapMuc";
import CpsxNangCapThoiGian from "./CpsxNangCapThoiGian";

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

  const [cpsxPolicies, setCpsxPolicies] = React.useState<PolicyCode[]>([]);
  const [dangTaiCpsxPolicy, setDangTaiCpsxPolicy] = React.useState(true);

  React.useEffect(() => {
    if (!daDangNhap || !accessToken) {
      setCpsxPolicies([]);
      setDangTaiCpsxPolicy(false);
      return;
    }
    setDangTaiCpsxPolicy(true);
    layPriceConfigMoiNhatService(accessToken)
      .then((list) => {
        const upgrade = list.find(
          (c) => c.configName === "PRODUCTION_UPGRADE",
        );
        const policies = (upgrade?.policies ?? []) as string[];
        setCpsxPolicies(
          policies.filter((p): p is PolicyCode => p.startsWith("CPSX_UPGRADE_EDIT_")),
        );
      })
      .catch(() => {
        setCpsxPolicies([]);
      })
      .finally(() => {
        setDangTaiCpsxPolicy(false);
      });
  }, [daDangNhap, accessToken]);

  const coQuyen = (code: PolicyCode) => cpsxPolicies.includes(code);

  if (daDangNhap && (dangTai || dangTaiCpsxPolicy)) {
    return <DangTaiCpsxNangCao />;
  }

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

  return (
    <div className="config-cpsx-upgrade-shell">
      {coQuyenDien && (
        <>
          <TieuDe>1. Điện</TieuDe>
          <CpsxNangCapDien
            coQuyenKhungGio={coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME")}
            coQuyenDienMay={coQuyen("CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE")}
          />
        </>
      )}

      {coQuyenLuong && (
        <>
          <TieuDe>2. Tiền lương</TieuDe>
          <CpsxNangCapLuong
            coQuyenPrint={coQuyen("CPSX_UPGRADE_EDIT_LABOR_PRINT")}
            coQuyenLaminate={coQuyen("CPSX_UPGRADE_EDIT_LABOR_LAMINATE")}
            coQuyenSlit={coQuyen("CPSX_UPGRADE_EDIT_LABOR_SLIT")}
            coQuyenBag={coQuyen("CPSX_UPGRADE_EDIT_LABOR_BAG")}
          />
        </>
      )}

      {coQuyenMuc && (
        <>
          <TieuDe>3. Mực · Dung môi · Keo ghép</TieuDe>
          <CpsxNangCapMuc
            coQuyenOpp={coQuyen("CPSX_UPGRADE_EDIT_INK_OPP")}
            coQuyenPet={coQuyen("CPSX_UPGRADE_EDIT_INK_PET")}
            coQuyenPe={coQuyen("CPSX_UPGRADE_EDIT_INK_PE")}
            coQuyenDungMoi={coQuyen("CPSX_UPGRADE_EDIT_SOLVENT")}
            coQuyenKeo={coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE")}
            coQuyenInRate={coQuyen("CPSX_UPGRADE_EDIT_INK_RATE")}
            coQuyenAdhesiveRate={coQuyen("CPSX_UPGRADE_EDIT_ADHESIVE_RATE")}
          />
        </>
      )}

      {coQuyenThoiGian && (
        <>
          <TieuDe>4. Thời gian sản xuất</TieuDe>
          <CpsxNangCapThoiGian
            coQuyenPrint={coQuyen("CPSX_UPGRADE_EDIT_TIME_PRINT")}
            coQuyenLaminate={coQuyen("CPSX_UPGRADE_EDIT_TIME_LAMINATE")}
            coQuyenSlit={coQuyen("CPSX_UPGRADE_EDIT_TIME_SLIT")}
            coQuyenBag={coQuyen("CPSX_UPGRADE_EDIT_TIME_BAG")}
          />
        </>
      )}

      <CpsxNangCapKetQua />
    </div>
  );
}
