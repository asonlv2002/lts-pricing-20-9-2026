"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';

export default function Header() {
  const { activeView, datGocNhin, layoutType, datKieuBoTriCuc, density, datMatDoHienThi, theme, datChuDe, result, history, currentChotGia } = dungCuaHangTinhGia();

  const handleExport = () => {
    if (activeView === 'history') {
      if (!history.length) return;
      let csv = '\ufeffNgày,Khách hàng,Sản phẩm,Cấu trúc,Số lượng,Giá đề xuất,Giá chốt\n';
      history.forEach((h) => {
        csv += `"${h.date}","${h.customer}","${h.productName}","${h.structure}",${h.quantity},${Math.round(h.finalPrice)},${h.chotGia || ''}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LichSu_BaoGia_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (!result) return;
    const r = result;
    const chotGia = currentChotGia > 0 ? currentChotGia : null;
    const fmtE = (n: number, d = 1) => n.toLocaleString('vi-VN', { maximumFractionDigits: d });
    const fmtPct = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const text = [
      'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
      '═'.repeat(50),
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${r.dauVao.customer || 'N/A'}`,
      `Sản phẩm: ${r.dauVao.productName || 'N/A'}`,
      `Cấu trúc: ${r.structureText}`,
      `Số lượng: ${r.dauVao.quantity.toLocaleString('vi-VN')} túi`,
      `Kích thước: ${+(r.dauVao.spreadWidth * 1000).toFixed(0)} × ${+(r.dauVao.cutStep * 1000).toFixed(0)} mm²`,
      `Độ dày: ${r.totalThickness} mic`,
      `Trọng lượng: ${fmtE(r.tareWeight, 2)} gr/cái`,
      '',
      'CHI TIẾT GIÁ BÁN / TÚI',
      '─'.repeat(40),
      `Giá vốn + LN:  ${fmtE(r.costPerUnit)} đ`,
      `Zipper:         ${fmtE(r.zipperPerUnit)} đ`,
      `Thùng giấy:     ${fmtE(r.boxPerUnit)} đ`,
      `Vận chuyển:     ${fmtE(r.shippingPerUnit)} đ`,
      `Lãi vay:        ${fmtE(r.interestPerUnit)} đ`,
      `Hoa hồng:       ${fmtE(r.commissionPerUnit)} đ`,
      '─'.repeat(40),
      `GIÁ ĐỀ XUẤT:   ${Math.round(r.finalPrice).toLocaleString('vi-VN')} đ/túi (chưa VAT)`,
      chotGia ? `GIÁ CHỐT:       ${Math.round(chotGia).toLocaleString('vi-VN')} đ/túi` : '',
      '',
      `Tỉ lệ LN: ${fmtPct(r.profitRate)}`,
      `Doanh thu túi: ${r.revenue.toLocaleString('vi-VN')} đ`,
      `Giá trục in: ${r.cylinderCost.toLocaleString('vi-VN')} đ (riêng)`,
    ].filter(Boolean).join('\n');
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoGia_${r.dauVao.customer || 'N_A'}_${r.dauVao.productName || 'N_A'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="header">
      <div className="logo">LTS <span>Pricing</span></div>
      
      <div className="tabs" id="viewTabs">
        <button 
          className={`tab ${activeView === 'manager' || activeView === 'bento' ? 'active' : ''}`} 
          onClick={() => datGocNhin(layoutType === 'bento' ? 'bento' : 'manager')}
        >
          📊 Quản Lý
        </button>
        <button 
          className={`tab ${activeView === 'tech' ? 'active' : ''}`} 
          onClick={() => datGocNhin('tech')}
        >
          ⚙️ Kỹ Thuật
        </button>
        <button 
          className={`tab ${activeView === 'history' ? 'active' : ''}`} 
          onClick={() => datGocNhin('history')}
        >
          📋 Lịch Sử
        </button>
      </div>
      
      <div className="tab-divider"></div>
      <button 
        className={`tab tab-config ${activeView === 'config' ? 'active' : ''}`} 
        onClick={() => datGocNhin('config')}
      >
        🏭 Bảng Định Mức
      </button>

      <div className="header-right">
        <div className="toolbar-group" id="layoutToolbar" title="Bố cục">
          <button className={`toolbar-btn ${layoutType === 'default' ? 'active' : ''}`} onClick={() => datKieuBoTriCuc('default')}>☰</button>
          <button className={`toolbar-btn ${layoutType === 'stacked' ? 'active' : ''}`} onClick={() => datKieuBoTriCuc('stacked')}>▤</button>
          <button className={`toolbar-btn ${layoutType === 'wide' ? 'active' : ''}`} onClick={() => datKieuBoTriCuc('wide')}>⬚</button>
          <button className={`toolbar-btn ${layoutType === 'bento' ? 'active' : ''}`} onClick={() => {datKieuBoTriCuc('bento'); datGocNhin('bento');}}>◫</button>
        </div>
        
        <div className="toolbar-group" id="densityToolbar" title="Mật độ hiển thị">
          <button className={`toolbar-btn ${density === 'compact' ? 'active' : ''}`} onClick={() => datMatDoHienThi('compact')}>S</button>
          <button className={`toolbar-btn ${density === 'comfortable' ? 'active' : ''}`} onClick={() => datMatDoHienThi('comfortable')}>M</button>
          <button className={`toolbar-btn ${density === 'spacious' ? 'active' : ''}`} onClick={() => datMatDoHienThi('spacious')}>L</button>
        </div>
        
        <button 
          className="theme-toggle" 
          id="themeToggle" 
          title="Chuyển đổi Sáng/Tối"
          onClick={() => datChuDe(theme === 'dark' ? 'light' : 'dark')}
        ></button>
        
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨️</button>
        <button className="btn btn-sm btn-outline" onClick={handleExport}>📥 Xuất</button>
      </div>
    </header>
  );
}
