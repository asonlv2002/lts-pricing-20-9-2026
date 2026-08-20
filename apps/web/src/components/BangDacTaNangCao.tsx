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

/** Label Chia "30.400\n(0,300)" → 2 dòng UI */
function HienThiMetKho({ label }: { label: string }) {
  const i = label.indexOf('\n');
  if (i < 0) return <>{label}</>;
  return (
    <span className="dac-ta-met-kho">
      <span className="dac-ta-met-kho__met">{label.slice(0, i)}</span>
      <span className="dac-ta-met-kho__kho">{label.slice(i + 1)}</span>
    </span>
  );
}

/**
 * Render 1 ô số có chấm đỏ "Gia công" ở góc trên-phải khi `laGiaCong=true`
 * (giống pattern `oSoGc` của tính giá cũ ở ManHinhQuanLy.tsx:93-105).
 * CSS đã có sẵn ở `globals.css:14065-14078`.
 */
function oSoGcNangCao(
  noiDung: React.ReactNode,
  laGiaCong: boolean,
  dataLabel: string,
  extraClass = '',
  title?: string,
) {
  const cls = ['num', extraClass, laGiaCong ? 'gc-cell' : ''].filter(Boolean).join(' ');
  return (
    <td className={cls} data-label={dataLabel} title={title}>
      {laGiaCong ? (
        <span className="gc-cell__dot" title="Gia công" aria-label="Gia công" />
      ) : null}
      {noiDung}
    </td>
  );
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
              <th className="num" title="CP vật liệu (đ/m²); dòng phụ = giá NVL (đ/kg) nếu có">
                CP vật liệu (đ/m²)
              </th>
              <th className="num">Thành tiền CPNVL</th>
              <th className="num" title="Giá mực in, dung môi, keo ghép + nhũ/phủ mờ (đ/m²)">
                Giá mực, DM, keo (đ/m²)
              </th>
              <th
                className="num"
                title="Thành tiền mực in, dung môi, keo ghép (VNĐ)"
              >
                Thành tiền mực, DM, keo
              </th>
            </tr>
          </thead>
          <tbody>
            {dongVatLieu.map((row, idx) => {
              const laGc = !!row.isGiaCongNgoai;
              return (
                <tr key={`vl-${idx}`}>
                  <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">
                    {row.congDoan}
                  </td>
                  <td data-label="Vật liệu">{row.vatLieu}</td>
                  {oSoGcNangCao(
                    row.khoMangLabel ?? dinhDangSo(row.khoMang, 3),
                    laGc,
                    'Khổ màng (m)',
                  )}
                  {oSoGcNangCao(
                    row.thanhPhamLabel ? (
                      <HienThiMetKho label={row.thanhPhamLabel} />
                    ) : (
                      dinhDangSo(row.thanhPham, 0)
                    ),
                    laGc,
                    'Thành phẩm (m)',
                    row.thanhPhamLabel ? 'dac-ta-met-kho-cell' : '',
                  )}
                  {oSoGcNangCao(dinhDangSo(row.phiHao, 0), laGc, 'Phi hao (m)')}
                  {oSoGcNangCao(
                    row.dauVaoNvlLabel ? (
                      <HienThiMetKho label={row.dauVaoNvlLabel} />
                    ) : (
                      dinhDangSo(row.dauVaoNVL, 0)
                    ),
                    laGc,
                    'Đầu vào NVL (m)',
                    `highlight${row.dauVaoNvlLabel ? ' dac-ta-met-kho-cell' : ''}`,
                  )}
                  {oSoGcNangCao(
                    row.cpVatLieu == null ? (
                      '—'
                    ) : (
                      <span className="cp-vl-gop">
                        <span className="cp-vl-gop__m2">{dinhDangSo(row.cpVatLieu, 1)}</span>
                        {row.giaNVL != null && row.giaNVL > 0 && (
                          <span className="cp-vl-gop__kg">({dinhDangSo(row.giaNVL, 0)}/kg)</span>
                        )}
                      </span>
                    ),
                    laGc,
                    'CP vật liệu (đ/m²)',
                  )}
                  {oSoGcNangCao(dinhDangSo(row.thanhTienNVL, 0), laGc, 'Thành tiền CPNVL')}
                  {oSoGcNangCao(
                    dinhDangSo(row.cpMucKeo, 1),
                    laGc,
                    'Giá mực, DM, keo (đ/m²)',
                    'dac-ta-nang-cao__muc',
                    row.ghiChu,
                  )}
                  {oSoGcNangCao(
                    dinhDangSo(row.thanhTienMucKeo, 0),
                    laGc,
                    'Thành tiền mực, DM, keo',
                    'dac-ta-nang-cao__muc',
                  )}
                </tr>
              );
            })}
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
                  <th className="num">Giá nhân công (đ/phút)</th>
                  <th className="num" title="Thành tiền nhân công (VNĐ)">
                    Thành tiền nhân công (VNĐ)
                  </th>
                  <th className="num">Giá điện (đ/phút)</th>
                  <th className="num" title="Thành tiền điện (VNĐ)">
                    Thành tiền điện
                  </th>
                </tr>
              </thead>
              <tbody>
                {dongNhanCongDien.map((row, idx) => {
                  const laGc = !!row.isGiaCongNgoai;
                  return (
                    <tr key={`ncd-${idx}`}>
                      <td data-label="Công đoạn" className="dac-ta-nang-cao__stage">
                        {row.congDoan}
                      </td>
                      {oSoGcNangCao(dinhDangSo(row.thoiGianPhut, 0), laGc, 'Thời gian SX (phút)', 'highlight')}
                      {oSoGcNangCao(dinhDangSo(row.cpNhanCongPerPhut, 0), laGc, 'Giá nhân công (đ/phút)')}
                      {oSoGcNangCao(dinhDangSo(row.thanhTienNhanCong, 0), laGc, 'Thành tiền nhân công (VNĐ)')}
                      {oSoGcNangCao(dinhDangSo(row.cpDienPerPhut, 0), laGc, 'Giá điện (đ/phút)')}
                      {oSoGcNangCao(dinhDangSo(row.thanhTienDien, 0), laGc, 'Thành tiền điện')}
                    </tr>
                  );
                })}
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
