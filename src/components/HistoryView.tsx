"use client";
import React from 'react';
import { useCalculatorStore } from '../store/calculatorStore';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function HistoryView() {
  const { activeView, history, loadHistoryItem, removeHistoryItem } = useCalculatorStore();

  if (activeView !== 'history') return null;

  if (!history.length) {
    return (
      <div className="panel active">
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Chưa có lịch sử báo giá</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel active">
      <div className="card">
        <div className="card-title"><span className="icon">📋</span> Lịch sử báo giá</div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Cấu trúc</th>
                <th className="num">Số lượng</th>
                <th className="num">Giá đề xuất</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td>{h.customer}</td>
                  <td>{h.productName}</td>
                  <td>{h.structure}</td>
                  <td className="num">{fmt(h.quantity)}</td>
                  <td className="num">{fmt(h.finalPrice)} đ</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => loadHistoryItem(h.id)}>Tải</button>
                    {' '}
                    <button className="btn btn-sm btn-outline" onClick={() => removeHistoryItem(h.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
