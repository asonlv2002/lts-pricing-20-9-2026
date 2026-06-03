"use client";
import React from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { getPricingDisplayMeta } from '../lib/pricing-display';

export default function DauTrang() {
  const { activeView: manHinhDangMo, setActiveView: datGocNhin, layoutType: kieuBoCuc, result: ketQua, history: lichSu, currentChotGia: giaChotHienTai } = dungCuaHangTinhGia();

  const xuLyXuat = () => {
    if (manHinhDangMo === 'history') {
      if (!lichSu.length) return;
      let duLieuCsv = '\ufeffNgày,Khách hàng,Sản phẩm,Cấu trúc,Số lượng,Giá đề xuất,Giá chốt\n';
      lichSu.forEach((h) => {
        duLieuCsv += `"${h.date}","${h.customer}","${h.productName}","${h.structure}",${h.quantity},${Math.round(h.finalPrice)},${h.chotGia || ''}\n`;
      });
      const tepBlob = new Blob([duLieuCsv], { type: 'text/csv;charset=utf-8' });
      const duongDanTai = URL.createObjectURL(tepBlob);
      const theTai = document.createElement('a');
      theTai.href = duongDanTai;
      theTai.download = `LichSu_BaoGia_${new Date().toISOString().slice(0, 10)}.csv`;
      theTai.click();
      URL.revokeObjectURL(duongDanTai);
      return;
    }

    if (!ketQua) return;
    const kq = ketQua;
    const giaChot = giaChotHienTai > 0 ? giaChotHienTai : null;
    const dinhDangSo = (n: number, d = 1) => n.toLocaleString('vi-VN', { maximumFractionDigits: d });
    const dinhDangPhanTram = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const hienThiGia = getPricingDisplayMeta(kq.input);
    const noiDungXuat = [
      hienThiGia.exportTitle,
      '═'.repeat(50),
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${kq.input.customer || 'N/A'}`,
      `Sản phẩm: ${kq.input.productName || 'N/A'}`,
      `Cấu trúc: ${kq.structureText}`,
      `Số lượng: ${kq.input.quantity.toLocaleString('vi-VN')} ${hienThiGia.quantityUnit}`,
      `Kích thước: ${+(kq.input.spreadWidth * 1000).toFixed(0)} × ${+(kq.input.cutStep * 1000).toFixed(0)} mm²`,
      `Độ dày: ${kq.totalThickness} mic`,
      hienThiGia.isFilm ? '' : `Trọng lượng: ${dinhDangSo(kq.tareWeight, 2)} gr/cái`,
      '',
      hienThiGia.detailTitle,
      '─'.repeat(40),
      `Giá vốn + LN:  ${dinhDangSo(kq.costPerUnit)} đ`,
      `Zipper:         ${dinhDangSo(kq.zipperPerUnit)} đ`,
      `Thùng giấy:     ${dinhDangSo(kq.boxPerUnit)} đ`,
      `${hienThiGia.shippingLabel}:     ${hienThiGia.isPrintFilm ? `${dinhDangSo(kq.shippingTotal, 0)} đ · ${dinhDangSo(kq.shippingPerUnit)} đ/${hienThiGia.unit}` : `${dinhDangSo(kq.shippingPerUnit)} đ`}`,
      `${hienThiGia.interestLabel(kq.interestBase || 0, kq.paymentDays)}:        ${dinhDangSo(kq.interestPerUnit)} đ${hienThiGia.isPrintFilm ? `/${hienThiGia.unit}` : ''}`,
      `Hoa hồng:       ${dinhDangSo(kq.commissionPerUnit)} đ`,
      '─'.repeat(40),
      `GIÁ ĐỀ XUẤT:   ${Math.round(kq.finalPrice).toLocaleString('vi-VN')} đ/${hienThiGia.unit} (chưa VAT)`,
      giaChot ? `GIÁ CHỐT:       ${Math.round(giaChot).toLocaleString('vi-VN')} đ/${hienThiGia.unit}` : '',
      '',
      `Tỉ lệ LN: ${dinhDangPhanTram(kq.profitRate)}`,
      `Doanh thu: ${kq.revenue.toLocaleString('vi-VN')} đ`,
      `Giá trục in: ${kq.cylinderCost.toLocaleString('vi-VN')} đ (riêng)`,
    ].filter(Boolean).join('\n');
    const tepBlob = new Blob(['\ufeff' + noiDungXuat], { type: 'text/plain;charset=utf-8' });
    const duongDanTai = URL.createObjectURL(tepBlob);
    const theTai = document.createElement('a');
    theTai.href = duongDanTai;
    theTai.download = `BaoGia_${kq.input.customer || 'N_A'}_${kq.input.productName || 'N_A'}_${new Date().toISOString().slice(0, 10)}.txt`;
    theTai.click();
    URL.revokeObjectURL(duongDanTai);
  };

  return (
    <header className="header">
      <div className="logo">LTS <span>Pricing</span></div>
      
      <div className="tabs" id="viewTabs">
        <button 
          className={`tab ${manHinhDangMo === 'manager' || manHinhDangMo === 'bento' ? 'active' : ''}`} 
          onClick={() => datGocNhin(kieuBoCuc === 'bento' ? 'bento' : 'manager')}
        >
          📊 Quản Lý
        </button>
        <button 
          className={`tab ${manHinhDangMo === 'tech' ? 'active' : ''}`} 
          onClick={() => datGocNhin('tech')}
        >
          ⚙️ Kỹ Thuật
        </button>
        <button 
          className={`tab ${manHinhDangMo === 'history' ? 'active' : ''}`} 
          onClick={() => datGocNhin('history')}
        >
          📋 Lịch Sử
        </button>
      </div>
      
      <div className="tab-divider"></div>
      <button 
        className={`tab tab-config ${manHinhDangMo === 'config' ? 'active' : ''}`} 
        onClick={() => datGocNhin('config')}
      >
        🏭 Bảng Định Mức
      </button>

      <div className="header-right">
        <button className="btn btn-sm btn-outline" onClick={xuLyXuat}>📥 Xuất</button>
      </div>
    </header>
  );
}
