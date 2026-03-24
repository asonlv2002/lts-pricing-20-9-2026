"use client";
import React from 'react';
import { useCalculatorStore } from '../store/calculatorStore';

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function TechView() {
  const { result, activeView, constants } = useCalculatorStore();

  if (activeView !== 'tech') return null;

  if (!result) {
    return (
      <div className="empty-state" id="emptyState">
        <div className="icon">⚙️</div>
        <p>Vui lòng tính giá để xem thông số kỹ thuật sản xuất</p>
      </div>
    );
  }

  const { input, layers } = result;
  const r = result;

  // ── Build unified rows (Tech view columns: Công đoạn, Vật liệu, Khổ, Thành phẩm, Phi hao, Đầu vào VL) ──
  const uniRows: any[] = [];
  
  uniRows.push({
    stage: 'CPSX IN', mat: layers.print.material?.name,
    width: r.printNLWidth, meters: r.printMeters, waste: r.printWaste,
  });

  if (layers.laminations) {
    layers.laminations.forEach((lam: any) => {
      uniRows.push({
        stage: `GHÉP (Lớp ${lam.layerNum})`, mat: lam.material?.name,
        width: lam.width, meters: lam.meters, waste: lam.waste,
      });
    });
  }

  uniRows.push({
    stage: 'CẮT', mat: '—',
    width: layers.cut.width, meters: layers.cut.meters, waste: layers.cut.waste,
  });

  // Weight items
  const tWeightItems: [string, string][] = [
    ['Diện tích 1 túi', fmt(r.bagArea, 4) + ' m²'],
    ['Tổng diện tích đơn hàng', fmt(r.totalArea, 1) + ' m²'],
    ['Trọng lượng / túi (Tare)', fmt(r.tareWeight, 2) + ' gr'],
    ['Tổng trọng lượng', fmt(r.tareWeight * input.quantity / 1000, 1) + ' kg'],
    ['Trọng lượng (tấn)', fmt(r.tareWeight * input.quantity / 1000000, 3) + ' tấn']
  ];

  return (
    <div className="panel active" id="panel-tech">
      <div className="info-box">
        <span className="icon">ℹ️</span>
        Chỉ Đạo Sản Xuất <strong id="t-structure">{r.structureText}</strong>
      </div>
      
      {/* Stat cards matching original: Đầu Vào Khâu In, Đầu Vào Khâu Cắt, Khổ Thành Phẩm, Khổ Màng NL */}
      <div className="stat-grid" id="t-stats">
        <div className="stat-card accent">
          <div className="stat-label">Đầu Vào Khâu In</div>
          <div className="stat-value">{fmt(r.printMeters + r.printWaste, 0)} m</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">Đầu Vào Khâu Cắt</div>
          <div className="stat-value">{fmt(r.cutMeters + r.cutWaste, 0)} m</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Khổ Thành Phẩm</div>
          <div className="stat-value">{fmt(r.printWidth, 3)} m</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Khổ Màng NL</div>
          <div className="stat-value">{fmt(input.spreadWidth * input.numImages + 0.02, 3)} m</div>
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
              {uniRows.map((row, idx) => {
                let dWidth = row.stage !== 'CẮT' ? input.spreadWidth * input.numImages + 0.02 : row.width;
                let dMeters = row.meters / input.numImages;
                let inputVL = row.meters + row.waste;
                return (
                  <tr key={idx}>
                    <td>{row.stage}</td>
                    <td>{row.mat}</td>
                    <td className="num">{fmt(dWidth, 3)}</td>
                    <td className="num">{fmt(dMeters, 0)}</td>
                    <td className="num">{fmt(row.waste, 0)}</td>
                    <td className="num highlight">{fmt(inputVL, 0)}</td>
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
          {tWeightItems.map(([l, v], i) => (
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
