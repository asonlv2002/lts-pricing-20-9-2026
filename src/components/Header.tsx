"use client";
import React from 'react';
import { useCalculatorStore } from '../store/calculatorStore';

export default function Header() {
  const { activeView, setActiveView, layoutType, setLayoutType, density, setDensity, theme, setTheme, result, history } = useCalculatorStore();

  const handleExport = () => {
    if (activeView === 'history') {
      if (!history.length) return;
      let csv = '\ufeffNgày,Khách hàng,Sản phẩm,Cấu trúc,Số lượng,Giá đề xuất\n';
      history.forEach((h) => {
        csv += `"${h.date}","${h.customer}","${h.productName}","${h.structure}",${h.quantity},${Math.round(h.finalPrice)}\n`;
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
    const text = [
      'BÁO GIÁ TÚI BAO BÌ',
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${result.input.customer || 'N/A'}`,
      `Sản phẩm: ${result.input.productName || 'N/A'}`,
      `Cấu trúc: ${result.structureText}`,
      `Số lượng: ${result.input.quantity.toLocaleString('vi-VN')} túi`,
      `Giá đề xuất: ${Math.round(result.finalPrice).toLocaleString('vi-VN')} đ/túi`,
      `Giá vốn+LN: ${result.costPerUnit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} đ/túi`,
    ].join('\n');
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoGia_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="header">
      <div className="logo">LTS <span>Pricing</span></div>
      
      <div className="tabs" id="viewTabs">
        <button 
          className={`tab ${activeView === 'manager' || activeView === 'bento' ? 'active' : ''}`} 
          onClick={() => setActiveView(layoutType === 'bento' ? 'bento' : 'manager')}
        >
          📊 Quản Lý
        </button>
        <button 
          className={`tab ${activeView === 'tech' ? 'active' : ''}`} 
          onClick={() => setActiveView('tech')}
        >
          ⚙️ Kỹ Thuật
        </button>
        <button 
          className={`tab ${activeView === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveView('history')}
        >
          📋 Lịch Sử
        </button>
      </div>
      
      <div className="tab-divider"></div>
      <button 
        className={`tab tab-config ${activeView === 'config' ? 'active' : ''}`} 
        onClick={() => setActiveView('config')}
      >
        🏭 Bảng Định Mức
      </button>

      <div className="header-right">
        <div className="toolbar-group" id="layoutToolbar" title="Bố cục">
          <button className={`toolbar-btn ${layoutType === 'default' ? 'active' : ''}`} onClick={() => setLayoutType('default')}>☰</button>
          <button className={`toolbar-btn ${layoutType === 'stacked' ? 'active' : ''}`} onClick={() => setLayoutType('stacked')}>▤</button>
          <button className={`toolbar-btn ${layoutType === 'wide' ? 'active' : ''}`} onClick={() => setLayoutType('wide')}>⬚</button>
          <button className={`toolbar-btn ${layoutType === 'bento' ? 'active' : ''}`} onClick={() => {setLayoutType('bento'); setActiveView('bento');}}>◫</button>
        </div>
        
        <div className="toolbar-group" id="densityToolbar" title="Mật độ hiển thị">
          <button className={`toolbar-btn ${density === 'compact' ? 'active' : ''}`} onClick={() => setDensity('compact')}>S</button>
          <button className={`toolbar-btn ${density === 'comfortable' ? 'active' : ''}`} onClick={() => setDensity('comfortable')}>M</button>
          <button className={`toolbar-btn ${density === 'spacious' ? 'active' : ''}`} onClick={() => setDensity('spacious')}>L</button>
        </div>
        
        <button 
          className="theme-toggle" 
          id="themeToggle" 
          title="Chuyển đổi Sáng/Tối"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        ></button>
        
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>🖨️</button>
        <button className="btn btn-sm btn-outline" onClick={handleExport}>📥 Xuất</button>
      </div>
    </header>
  );
}
