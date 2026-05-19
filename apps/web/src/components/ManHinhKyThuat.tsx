"use client";

import React from 'react';

import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';



function dinhDangSo(n: number | null | undefined, decimals = 0): string {

  if (n == null || isNaN(n)) return '—';

  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

}



export default function ManHinhKyThuat() {

  const { result: ketQua, activeView: manHinhDangMo } = dungCuaHangTinhGia();



  if (manHinhDangMo !== 'tech') return null;



  if (!ketQua) {

    return (

      <div className="empty-state" id="emptyState">

        <div className="icon">⚙️</div>

        <p>Vui lòng tính giá để xem thông số kỹ thuật sản xuất</p>

      </div>

    );

  }



  const { input: dauVao, layers: cacLop } = ketQua;

  const kq = ketQua;



  // ── Build unified dongs (Tech view columns: Công đoạn, Vật liệu, Khổ, Thành phẩm, Phi hao, Đầu vào VL) ──

  const cacDong: any[] = [];



  cacDong.push({

    congDoan: 'CPSX IN', vatLieu: cacLop.print.material?.name,

    kho: kq.printNLWidth, met: kq.printMeters, haoHut: kq.printWaste,

  });



  if (cacLop.laminations) {

    cacLop.laminations.forEach((dongGhep: any) => {

      cacDong.push({

        congDoan: `GHÉP (Lớp ${dongGhep.layerNum})`, vatLieu: dongGhep.material?.name,

        kho: dongGhep.width, met: dongGhep.meters, haoHut: dongGhep.waste,

      });

    });

  }



  if (dauVao.productType !== 'mang') {

    cacDong.push({

      congDoan: 'CẮT', vatLieu: '—',

      kho: cacLop.cut.width, met: cacLop.cut.meters, haoHut: cacLop.cut.waste,

    });

  }



  // Weight items

  const cacDongTrongLuong: [string, string][] = [

    ['Diện tích 1 túi', dinhDangSo(kq.bagArea, 4) + ' m²'],

    ['Tổng diện tích đơn hàng', dinhDangSo(kq.totalArea, 1) + ' m²'],

    ['Trọng lượng / túi (Tare)', dinhDangSo(kq.tareWeight, 2) + ' gr'],

    ['Tổng trọng lượng', dinhDangSo(kq.tareWeight * dauVao.quantity / 1000, 1) + ' kg'],

    ['Trọng lượng (tấn)', dinhDangSo(kq.tareWeight * dauVao.quantity / 1000000, 3) + ' tấn']

  ];



  return (

    <div className="panel active" id="panel-tech">

      <div className="info-box">

        <span className="icon">ℹ️</span>

        Chỉ Đạo Sản Xuất <strong id="t-structure">{kq.structureText}</strong>

      </div>



      {/* Stat cards vatLieuching original: Đầu Vào Khâu In, Đầu Vào Khâu Cắt, Khổ Thành Phẩm, Khổ Màng NL */}

      <div className="stat-grid" id="t-stats">

        <div className="stat-card accent">

          <div className="stat-label">Đầu Vào Khâu In</div>

          <div className="stat-value">{dinhDangSo(kq.printMeters + kq.printWaste, 0)} m</div>

        </div>

        {dauVao.productType !== 'mang' && (

          <div className="stat-card cyan">

            <div className="stat-label">Đầu Vào Khâu Cắt</div>

            <div className="stat-value">{dinhDangSo(kq.cutMeters + kq.cutWaste, 0)} m</div>

          </div>

        )}

        <div className="stat-card green">

          <div className="stat-label">Khổ Thành Phẩm</div>

          <div className="stat-value">{dinhDangSo(dauVao.spreadWidth, 3)} m</div>

        </div>

        <div className="stat-card orange">

          <div className="stat-label">Khổ Màng NL</div>

          <div className="stat-value">{dinhDangSo(dauVao.spreadWidth * dauVao.numImages + 0.02, 3)} m</div>

        </div>

      </div>



      <div className="card" style={{marginBottom: '14px'}}>

        <div className="card-title"><span className="icon">🏭</span> Chi tiết sản xuất & nguyên liệu</div>

        <div className="table-responsive">

          <table className="data-table" id="t-unified-table">

            <thead>

              <tr>

                <th>Công đoạn</th>

                <th>Vật liệu</th>

                <th className="num">Khổ (m)</th>

                <th className="num">Thành phẩm (m)</th>

                <th className="num">Phi hao</th>

                <th className="num">Đầu vào VL</th>

              </tr>

            </thead>

            <tbody>

              {cacDong.map((dong, chiSo) => {

                const khoHienThi = dong.congDoan !== 'CẮT' ? dauVao.spreadWidth * dauVao.numImages + 0.02 : dong.kho;

                const metHienThi = dong.met;

                const haoHutHienThi = dong.haoHut;

                const dauVaoVL = metHienThi + haoHutHienThi;

                return (

                  <tr key={chiSo}>

                    <td>{dong.congDoan}</td>

                    <td>{dong.vatLieu}</td>

                    <td className="num">{dinhDangSo(khoHienThi, 3)}</td>

                    <td className="num">{dinhDangSo(metHienThi, 0)}</td>

                    <td className="num">{dinhDangSo(haoHutHienThi, 0)}</td>

                    <td className="num highlight">{dinhDangSo(dauVaoVL, 0)}</td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      </div>



      <div className="card">

        <div className="card-title"><span className="icon">⚖️</span> Trọng lượng & Vận chuyển</div>

        <ul className="breakdown-list" id="t-weight">

          {cacDongTrongLuong.map(([l, v], i) => (

            <li key={i}>

              <span className="bl-label">{l}</span>

              <span className="bl-value">{v}</span>

            </li>

          ))}

        </ul>

      </div>



    </div>

  );

}
