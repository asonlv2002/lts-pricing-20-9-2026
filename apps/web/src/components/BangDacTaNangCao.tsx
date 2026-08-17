"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Đặc tả kỹ thuật & nguyên liệu (nâng cao)
// Table 1: vật liệu + CP mực in/dung môi/keo ghép
// Table 2: thời gian SX × (CP nhân công + CP điện)  |  cụm 3 dòng tổng bên phải
// Tổng của cụm này ĐỘC LẬP với TỔNG GIÁ THÀNH của bảng đặc tả cũ.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import {
  lapDongNhanCongDien,
  lapDongVatLieuNangCao,
  tinhTongNangCao,
} from '../lib/dac-ta-nang-cao';
import type { AppConstants, CalculateResult, Material } from '../lib/types';
import type { UniRow } from '../lib/manager-calculation';

function dinhDangSo(n: number | null | undefined, soLe = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: soLe,
    maximumFractionDigits: soLe,
  });
}

export default function BangDacTaNangCao({
  result,
  uniRows,
  constants,
  materials = [],
}: {
  result: CalculateResult;
  uniRows: UniRow[];
  constants: AppConstants;
  materials?: Material[];
}) {
  const dongVatLieu = React.useMemo(
    () => lapDongVatLieuNangCao(result, uniRows, constants, materials),
    [result, uniRows, constants, materials],
  );
  const dongNhanCongDien = React.useMemo(
    () => lapDongNhanCongDien(result, constants),
    [result, constants],
  );
  const tong = React.useMemo(
    () => tinhTongNangCao(dongVatLieu, dongNhanCongDien),
    [dongVatLieu, dongNhanCongDien],
  );

  const tongNhanCong = dongNhanCongDien.reduce((s, r) => s + r.thanhTienNhanCong, 0);
  const tongDien = dongNhanCongDien.reduce((s, r) => s + r.thanhTienDien, 0);

  return (
    <div className="dac-ta-nang-cao">
      {/* ═══ Table 1: Vật liệu + mực/dung môi/keo ═══ */}
      <div className="table-responsive">
        <table className="data-table" id="m-t-advanced-material">
          <thead>
            <tr>
              <th>Công đoạn</th>
              <th>Vật liệu</th>
              <th className="num">Khổ màng (m)</th>
              <th className="num">Thành phẩm (m)</th>
              <th className="num">Phi hao (m)</th>
              <th className="num">Đầu vào NVL (m)</th>
              <th className="num">CP vật liệu (đ/m²)</th>
              <th className="num">Thành tiền CPNVL</th>
              <th className="num">Giá NVL (đ/kg)</th>
              <th className="num" title="CP mực in, dung môi, keo ghép + nhũ/phủ mờ (đ/m²)">
                CP mực + DM + keo (đ/m²)
              </th>
              <th
                className="num"
                title="Thành tiền CP mực in, dung môi, keo ghép (VNĐ)"
              >
                Thành tiền mực + DM + keo
              </th>
            </tr>
          </thead>
          <tbody>
            {dongVatLieu.map((row, idx) => (
              <tr key={`vl-${idx}`}>
                <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">
                  {row.congDoan}
                </td>
                <td data-label="Vật liệu">{row.vatLieu}</td>
                <td className="num" data-label="Khổ màng (m)">
                  {row.khoMangLabel ?? dinhDangSo(row.khoMang, 3)}
                </td>
                <td className="num" data-label="Thành phẩm (m)">
                  {dinhDangSo(row.thanhPham, 0)}
                </td>
                <td className="num" data-label="Phi hao (m)">
                  {dinhDangSo(row.phiHao, 0)}
                </td>
                <td className="num highlight" data-label="Đầu vào NVL (m)">
                  {dinhDangSo(row.dauVaoNVL, 0)}
                </td>
                <td className="num" data-label="CP vật liệu (đ/m²)">
                  {dinhDangSo(row.cpVatLieu, 1)}
                </td>
                <td className="num" data-label="Thành tiền CPNVL">
                  {dinhDangSo(row.thanhTienNVL, 0)}
                </td>
                <td className="num" data-label="Giá NVL (đ/kg)">
                  {row.giaNVL != null ? `${dinhDangSo(row.giaNVL, 0)} đ/kg` : '—'}
                </td>
                <td
                  className="num dac-ta-nang-cao__muc"
                  data-label="CP mực in, dung môi, keo ghép (đ/m²)"
                  title={row.ghiChu}
                >
                  {dinhDangSo(row.cpMucKeo, 1)}
                </td>
                <td
                  className="num dac-ta-nang-cao__muc"
                  data-label="Thành tiền CP mực in, dung môi, keo ghép (VNĐ)"
                >
                  {dinhDangSo(row.thanhTienMucKeo, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ Table 2 + cụm 3 dòng tổng (2 cột) ═══ */}
      <div className="dac-ta-nang-cao__split">
        <div className="dac-ta-nang-cao__split-table">
          <div className="table-responsive">
            <table className="data-table" id="m-t-advanced-labor">
              <thead>
                <tr>
                  <th>Công đoạn</th>
                  <th className="num">Thời gian SX (phút)</th>
                  <th className="num">CP nhân công (đ/phút)</th>
                  <th className="num" title="Thành tiền CP nhân công (VNĐ)">
                    Thành tiền NC
                  </th>
                  <th className="num">CP điện (đ/phút)</th>
                  <th className="num" title="Thành tiền CP điện (VNĐ)">
                    Thành tiền điện
                  </th>
                </tr>
              </thead>
              <tbody>
                {dongNhanCongDien.map((row, idx) => (
                  <tr key={`ncd-${idx}`}>
                    <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">
                      {row.congDoan}
                    </td>
                    <td className="num highlight" data-label="Thời gian SX (phút)">
                      {dinhDangSo(row.thoiGianPhut, 0)}
                    </td>
                    <td className="num" data-label="CP nhân công (đ/phút)">
                      {dinhDangSo(row.cpNhanCongPerPhut, 0)}
                    </td>
                    <td className="num" data-label="Thành tiền CP nhân công (VNĐ)">
                      {dinhDangSo(row.thanhTienNhanCong, 0)}
                    </td>
                    <td className="num" data-label="CP điện (đ/phút)">
                      {dinhDangSo(row.cpDienPerPhut, 0)}
                    </td>
                    <td className="num" data-label="Thành tiền CP điện (VNĐ)">
                      {dinhDangSo(row.thanhTienDien, 0)}
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>
                    <strong>Tổng nhân công / điện</strong>
                  </td>
                  <td className="num" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    {dinhDangSo(tongNhanCong, 0)}
                  </td>
                  <td />
                  <td className="num" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    {dinhDangSo(tongDien, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="dac-ta-nang-cao__totals">
          <div className="dac-ta-nang-cao__total-row">
            <span className="dac-ta-nang-cao__total-label">
              Tổng thành tiền CP Vật liệu
              <small>(nguyên vật liệu + dung môi + keo ghép + khác)</small>
            </span>
            <strong className="dac-ta-nang-cao__total-value">
              {dinhDangSo(tong.tongVatLieu, 0)} đ
            </strong>
          </div>
          <div className="dac-ta-nang-cao__total-row">
            <span className="dac-ta-nang-cao__total-label">
              Tổng thành tiền chi phí Nhân công + điện
            </span>
            <strong className="dac-ta-nang-cao__total-value">
              {dinhDangSo(tong.tongNhanCongDien, 0)} đ
            </strong>
          </div>
          <div className="dac-ta-nang-cao__total-row dac-ta-nang-cao__total-row--grand">
            <span className="dac-ta-nang-cao__total-label">
              Tổng giá thành sản xuất cơ bản
            </span>
            <strong className="dac-ta-nang-cao__total-value">
              {dinhDangSo(tong.tongGiaThanh, 0)} đ
            </strong>
          </div>
        </div>
      </div>

      <p className="dac-ta-nang-cao__note">
        Cụm bảng này tính theo cấu hình <strong>CPSX nâng cấp</strong> (giá mực, dung môi,
        keo, lương, điện, thời gian SX). Tổng ở đây <strong>độc lập</strong> với
        &ldquo;Tổng giá thành sản xuất cơ bản&rdquo; của bảng đặc tả phía trên — dùng để
        đối chiếu 2 cách tính.
      </p>
    </div>
  );
}
