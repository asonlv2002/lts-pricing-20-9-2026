"use client";
import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Filter, ChevronDown, CheckCircle2,
  Clock, XCircle, Send, MoreHorizontal, Download, Eye,
  Building2, Calendar, DollarSign, Package
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
export type QuoteStatus = 'pending' | 'sent' | 'won' | 'lost';

export interface Quotation {
  id: string;
  customerName: string;
  company: string;
  productName: string;
  structure: string;
  size: string;      // Kích thước (ex: 15cm x 20cm)
  thickness: number; // Độ dày (mic)
  quantity: number;
  totalPrice: number; // Tổng giá trị đơn
  unitPrice: number;  // Giá mỗi túi
  cylinderCount: number; // Số trục in
  cylinderCost: number;  // Phí trục in
  date: string;
  status: QuoteStatus;
  sellerId: string;
}

// ════════════════════════════════════════════════════════════
// MOCK DATA
// ════════════════════════════════════════════════════════════
export const MOCK_QUOTATIONS: Quotation[] = [
  { id: 'BG-2025001', customerName: 'Phan Văn Đức', company: 'Công ty TNHH Đức Phát',   productName: 'Túi Cafe 500g', structure: 'PET 12//AL 7//PE 100', size: '150 x 250 + Đáy 40', thickness: 120, quantity: 50000, unitPrice: 1250, cylinderCount: 4, cylinderCost: 9600000, totalPrice: 62500000, date: '2025-03-24', status: 'sent', sellerId: 'S1' },
  { id: 'BG-2025002', customerName: 'Lê Thị Giang', company: 'Cty CP Giang Sơn Foods',  productName: 'Túi Trà xanh',   structure: 'OPP 20//MCPP 25',  size: '100 x 180 + Đáy 30', thickness: 80,  quantity: 100000, unitPrice: 520, cylinderCount: 3, cylinderCost: 7200000, totalPrice: 52000000, date: '2025-03-25', status: 'pending', sellerId: 'S1' },
  { id: 'BG-2025003', customerName: 'Trần Minh Hiếu',company: 'Hiếu Long Packaging',    productName: 'Túi Zipper Đáy Đứng', structure: 'PET 12//PE 90', size: '180 x 260 + Đáy 45', thickness: 100, quantity: 20000, unitPrice: 2100, cylinderCount: 5, cylinderCost: 12500000, totalPrice: 42000000, date: '2025-03-20', status: 'won', sellerId: 'S2' },
  { id: 'BG-2025004', customerName: 'Nguyễn Thị Kim',company: 'Kim Ngân Trading',       productName: 'Cuộn Màng Ép', structure: 'PA 15//PE 80', size: 'W: 300mm x L: 2500m', thickness: 95, quantity: 1500, unitPrice: 85000, cylinderCount: 2, cylinderCost: 4800000, totalPrice: 127500000, date: '2025-03-15', status: 'lost', sellerId: 'S2' },
  { id: 'BG-2025005', customerName: 'Phạm Thanh Mai',company: 'Cty TNHH SX Thanh Mai',  productName: 'Túi Hút Chân Không', structure: 'PA 15//LLDPE 115', size: '200 x 300', thickness: 130, quantity: 80000, unitPrice: 780, cylinderCount: 0, cylinderCost: 0, totalPrice: 62400000, date: '2025-03-25', status: 'pending', sellerId: 'S3' },
];

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: <Clock size={12} /> },
  sent:    { label: 'Đã gửi KH', color: '#0284c7', bg: 'rgba(2,132,199,0.1)', icon: <Send size={12} /> },
  won:     { label: 'Chốt đơn',  color: '#059669', bg: 'rgba(5,150,105,0.1)', icon: <CheckCircle2 size={12} /> },
  lost:    { label: 'Đã hủy',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: <XCircle size={12} /> },
};

// ════════════════════════════════════════════════════════════
// QUOTATION CARD
// ════════════════════════════════════════════════════════════
function QuotationCard({ quote, onChangeStatus }: { quote: Quotation; onChangeStatus: (id: string, st: QuoteStatus) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[quote.status];

  return (
    <div className="quote-card">
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={16} className="quote-icon" />
          <span className="quote-id">{quote.id}</span>
        </div>
        <div className="quote-status-badge" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      <div className="quote-body">
        <h3 className="quote-title">{quote.productName}</h3>
        
        <div className="quote-meta">
          <div className="quote-meta-item">
            <Building2 size={13} style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
               {quote.company} <span style={{ opacity: 0.6 }}>({quote.customerName})</span>
            </span>
          </div>
          
          <div className="quote-details-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr', gap: '8px',
            background: 'var(--surface2)', padding: '10px 12px',
            borderRadius: '8px', marginTop: '4px', fontSize: '0.82rem'
          }}>
            <div className="q-det-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}><span style={{color: 'var(--muted)', fontSize: '0.78rem'}}>Chất liệu:</span> <strong style={{color: 'var(--text)'}}>{quote.structure}</strong></div>
            <div className="q-det-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}><span style={{color: 'var(--muted)', fontSize: '0.78rem'}}>Kích thước:</span> <strong style={{color: 'var(--text)'}}>{quote.size}</strong></div>
            <div className="q-det-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}><span style={{color: 'var(--muted)', fontSize: '0.78rem'}}>Số lượng:</span> <span><strong style={{color: 'var(--accent)'}}>{quote.quantity.toLocaleString('vi-VN')}</strong> túi</span></div>
          </div>
          
          <div className="quote-meta-item" style={{ marginTop: '8px' }}>
            <Calendar size={13} /> <span>Ngày báo giá: {new Date(quote.date).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        <div className="quote-financials" style={{ 
          display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', 
          paddingTop: '12px', marginBottom: '12px', fontSize: '0.85rem' 
        }}>
          <div>
            <div style={{ color: 'var(--dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Đơn giá (VNĐ/Túi)</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{quote.unitPrice.toLocaleString('vi-VN')} đ</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Số trục in</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{quote.cylinderCount} màu</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--dim)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Phí trục (Thu 1 lần)</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{quote.cylinderCost.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div className="quote-price-box">
          <div className="quote-price-label">Tổng giá trị</div>
          <div className="quote-price-value">
            {quote.totalPrice.toLocaleString('vi-VN')} <span className="quote-currency">VNĐ</span>
          </div>
        </div>
      </div>

      <div className="quote-footer">
        <button className="crm-btn crm-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} title="Xem chi tiết">
          <Eye size={14} /> Chi tiết
        </button>
        <button className="crm-btn crm-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} title="Tải xuống PDF">
          <Download size={14} /> Tải PDF
        </button>
        
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button 
            className="crm-btn crm-btn-ghost" 
            style={{ padding: '6px' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal size={16} />
          </button>
          
          {menuOpen && (
            <div className="crm-dropdown" style={{ right: 0, left: 'auto', bottom: '100%', marginBottom: 4 }}>
              <div className="crm-dropdown-title">Chuyển trạng thái</div>
              {(Object.entries(STATUS_CONFIG) as [QuoteStatus, typeof cfg][]).map(([stKey, stCfg]) => (
                <button
                  key={stKey}
                  className={`crm-dropdown-item ${quote.status === stKey ? 'crm-dropdown-item--active' : ''}`}
                  onClick={() => { onChangeStatus(quote.id, stKey); setMenuOpen(false); }}
                >
                  <span style={{ color: stCfg.color }}>{stCfg.icon}</span>
                  {stCfg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({ role, currentSellerId = 'S1' }: { role: string; currentSellerId?: string }) {
  const isAdmin = role === 'admin';
  const [quotes, setQuotes] = useState<Quotation[]>(MOCK_QUOTATIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');

  const filtered = useMemo(() => {
    let list = isAdmin ? quotes : quotes.filter(q => q.sellerId === currentSellerId);
    
    if (filterStatus !== 'all') {
      list = list.filter(q => q.status === filterStatus);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item => 
        item.id.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q)
      );
    }
    
    // Sort newly created first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes, search, filterStatus, isAdmin, currentSellerId]);

  const changeStatus = (id: string, status: QuoteStatus) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  return (
    <div className="crm-root quote-root">
      {/* TOOLBAR */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm mã BG, khách hàng, sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="crm-toolbar-right">
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button 
              className={`toolbar-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Tất cả
            </button>
            {(Object.entries(STATUS_CONFIG) as [QuoteStatus, typeof STATUS_CONFIG['pending']][]).map(([key, cfg]) => (
              <button 
                key={key}
                className={`toolbar-btn ${filterStatus === key ? 'active' : ''}`}
                onClick={() => setFilterStatus(key)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="quote-stats-overview">
        <div className="quote-stat-card">
          <div className="quote-stat-val">{quotes.filter(q => q.status === 'pending').length}</div>
          <div className="quote-stat-lbl">Chờ duyệt</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#0284c7' }}>{quotes.filter(q => q.status === 'sent').length}</div>
          <div className="quote-stat-lbl">Đã gửi KH</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: '#059669' }}>{quotes.filter(q => q.status === 'won').length}</div>
          <div className="quote-stat-lbl">Chốt đơn</div>
        </div>
        <div className="quote-stat-card quote-stat-card--total">
          <div className="quote-stat-val">
            {(quotes.filter(q => q.status === 'won').reduce((sum, q) => sum + q.totalPrice, 0) / 1000000).toFixed(1)} <small>Tr</small>
          </div>
          <div className="quote-stat-lbl">Doanh thu tạm tính</div>
        </div>
      </div>

      {/* LIST/GRID */}
      <div className="crm-list quote-list-container">
        {filtered.length === 0 ? (
          <div className="crm-empty">
            <FileText size={40} />
            <p>Không có báo giá nào phù hợp.</p>
          </div>
        ) : (
          <div className="quote-grid">
            {filtered.map(q => (
              <QuotationCard key={q.id} quote={q} onChangeStatus={changeStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
