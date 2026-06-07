"use client";

import React, { useMemo, useState } from 'react';
import { Search, PackageCheck, Building2, Calendar, User, FileText, RefreshCw } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { HistoryItem } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import LSXFormModal from './ModalDonLSX';
import { buildHistoryItemForLsx, getLsxQuoteLines, hasExistingProductionOrderForLine } from '../lib/quote-to-lsx';

function dinhDangSo(n: number) {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

function laBaoGiaDaChot(item: HistoryItem): boolean {
  return !!(item.isQuote || item.quoteProducts?.length || item.quoteCode) && item.quoteStatus === 'completed';
}

export default function ModuleTaoLenhSanXuat() {
  const { history, productionOrders, role, currentSellerId } = dungCuaHangTinhGia();
  const [tuKhoa, datTuKhoa] = useState('');
  const [mucLsx, datMucLsx] = useState<HistoryItem | null>(null);
  const [khoangNgay, datKhoangNgay] = useState<'7days' | '30days' | 'all'>('30days');
  const [thoiDiemLoc] = useState(() => new Date());

  const baoGiaDaChot = useMemo(() => {
    const lower = tuKhoa.trim().toLowerCase();
    const days = khoangNgay === '7days' ? 7 : khoangNgay === '30days' ? 30 : null;
    const cutoff = days ? thoiDiemLoc.getTime() - days * 86400000 : 0;

    return history
      .filter(laBaoGiaDaChot)
      .filter(item => role === 'admin' || item.sellerId === currentSellerId)
      .filter(item => {
        if (!days) return true;
        const [day, month, year] = item.date.split('/').map(Number);
        if (!day || !month || !year) return true;
        return new Date(year, month - 1, day).getTime() >= cutoff;
      })
      .filter(item => {
        if (!lower) return true;
        const lines = getLsxQuoteLines(item);
        return [
          item.customer,
          item.productName,
          item.quoteCode,
          item.sellerName,
          ...lines.flatMap(line => [line.productName, line.structure]),
        ].filter(Boolean).some(value => String(value).toLowerCase().includes(lower));
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [history, role, currentSellerId, tuKhoa, khoangNgay, thoiDiemLoc]);

  return (
    <div className="crm-root quote-root">
      {mucLsx && <LSXFormModal historyItem={mucLsx} onClose={() => datMucLsx(null)} />}

      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm khách hàng, mã báo giá, sản phẩm..."
            value={tuKhoa}
            onChange={e => datTuKhoa(e.target.value)}
          />
          {tuKhoa && <button className="crm-search-clear" onClick={() => datTuKhoa('')}>✕</button>}
        </div>
        <div className="crm-toolbar-right" style={{ gap: 8 }}>
          <select className="form-input" value={khoangNgay} onChange={e => datKhoangNgay(e.target.value as '7days' | '30days' | 'all')} style={{ width: 150 }}>
            <option value="7days">7 ngày gần nhất</option>
            <option value="30days">30 ngày gần nhất</option>
            <option value="all">Tất cả</option>
          </select>
          <button className="btn btn-sm btn-outline" onClick={() => { datTuKhoa(''); datKhoangNgay('30days'); }}>
            <RefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <PackageCheck size={20} style={{ color: '#059669' }} />
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text)' }}>Tạo LSX từ báo giá đã chốt</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Chỉ hiển thị báo giá có trạng thái “Đã chốt đơn sản xuất”. Chọn từng dòng sản phẩm hoặc mức số lượng để mở form LSX mẫu.</div>
          </div>
        </div>
      </div>

      {baoGiaDaChot.length === 0 ? (
        <div className="crm-empty" style={{ padding: '56px 20px' }}>
          <PackageCheck size={40} />
          <p>Chưa có báo giá đã chốt đơn sản xuất phù hợp.</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>Hãy chuyển trạng thái báo giá sang “Đã chốt đơn sản xuất” sau khi khách xác nhận chạy sản phẩm.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {baoGiaDaChot.map(quote => {
            const statusCfg = QUOTE_STATUS_CONFIG.completed;
            const lines = getLsxQuoteLines(quote);
            return (
              <section key={quote.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                      <FileText size={15} style={{ color: '#2563eb' }} />
                      {quote.quoteCode || quote.id}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <span><Building2 size={12} /> {quote.customer}</span>
                      <span><User size={12} /> {quote.sellerName || '—'}</span>
                      <span><Calendar size={12} /> {quote.date}</span>
                    </div>
                  </div>
                  <span style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 700, color: statusCfg.color, background: statusCfg.bg }}>
                    ● {statusCfg.label}
                  </span>
                </div>

                <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                  {lines.map(line => {
                    const existed = hasExistingProductionOrderForLine(productionOrders, quote, line);
                    const meta = getPricingDisplayMeta(line.input);
                    return (
                      <div key={line.key} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: existed ? 'rgba(5,150,105,0.05)' : 'var(--surface2, #f8fafc)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 240, flex: 1 }}>
                            <div style={{ fontWeight: 800, color: 'var(--text)' }}>{line.productName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>{line.structure}</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: '0.82rem' }}>
                              <span>Số lượng: <b>{dinhDangSo(line.quantity)} {meta.quantityUnit}</b></span>
                              <span>Đơn giá: <b>{dinhDangSo(line.chotGia ?? line.finalPrice)} đ/{meta.unit}</b></span>
                              {existed && <span style={{ color: '#059669', fontWeight: 800 }}>Đã có LSX</span>}
                            </div>
                          </div>
                          <button className="btn btn-sm btn-primary" style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => datMucLsx(buildHistoryItemForLsx(quote, line))}>
                            <PackageCheck size={14} /> Tạo LSX
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
