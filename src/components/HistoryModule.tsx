"use client";
import { useState, useMemo } from 'react';
import { Search, Database, RotateCcw, Trash2 } from 'lucide-react';
import { useCalculatorStore } from '../store/calculatorStore';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function HistoryModule({ onNavigate }: { onNavigate?: (module: 'calculator') => void }) {
  const { history, loadHistoryItem, removeHistoryItem } = useCalculatorStore();
  const [search, setSearch] = useState('');
  const [filterHasChotGia, setFilterHasChotGia] = useState<'all' | 'chot' | 'pending'>('all');

  const filtered = useMemo(() => {
    let list = [...history];

    if (filterHasChotGia === 'chot') {
      list = list.filter(h => h.chotGia && h.chotGia > 0);
    } else if (filterHasChotGia === 'pending') {
      list = list.filter(h => !h.chotGia || h.chotGia === 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(h =>
        h.customer.toLowerCase().includes(q) ||
        h.productName.toLowerCase().includes(q) ||
        h.structure.toLowerCase().includes(q)
      );
    }

    return list;
  }, [history, search, filterHasChotGia]);

  const totalItems = history.length;
  const chotCount  = history.filter(h => h.chotGia && h.chotGia > 0).length;
  const pendingCount = totalItems - chotCount;

  return (
    <div className="crm-root hist-root">
      {/* TOOLBAR */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm khách hàng, sản phẩm, cấu trúc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="crm-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="crm-toolbar-right">
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button
              className={`toolbar-btn ${filterHasChotGia === 'all' ? 'active' : ''}`}
              onClick={() => setFilterHasChotGia('all')}
            >
              Tất cả
            </button>
            <button
              className={`toolbar-btn ${filterHasChotGia === 'chot' ? 'active' : ''}`}
              onClick={() => setFilterHasChotGia('chot')}
            >
              Đã chốt giá
            </button>
            <button
              className={`toolbar-btn ${filterHasChotGia === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterHasChotGia('pending')}
            >
              Chưa chốt
            </button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="quote-stats-overview">
        <div className="quote-stat-card">
          <div className="quote-stat-val">{totalItems}</div>
          <div className="quote-stat-lbl">Tổng lịch sử</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: 'var(--green)' }}>{chotCount}</div>
          <div className="quote-stat-lbl">Đã chốt giá</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: 'var(--orange)' }}>{pendingCount}</div>
          <div className="quote-stat-lbl">Chưa chốt</div>
        </div>
        <div className="quote-stat-card quote-stat-card--total">
          <div className="quote-stat-val">{50 - totalItems}</div>
          <div className="quote-stat-lbl">Còn lại / 50</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="crm-list hist-list-container">
        {history.length === 0 ? (
          <div className="crm-empty">
            <Database size={40} />
            <p>Chưa có lịch sử tính giá nào.</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--dim)', marginTop: '6px' }}>
              Hãy tính giá sản phẩm và lưu vào lịch sử từ tab Quản Lý.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="crm-empty">
            <Search size={40} />
            <p>Không tìm thấy kết quả phù hợp.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table hist-data-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Cấu trúc</th>
                  <th className="num">Số lượng</th>
                  <th className="num">Giá đề xuất</th>
                  <th className="num">Giá chốt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => {
                  const hasChotGia = h.chotGia && h.chotGia > 0;
                  const diff = hasChotGia ? h.chotGia! - h.finalPrice : 0;
                  const diffPct = hasChotGia && h.finalPrice > 0 ? (diff / h.finalPrice) * 100 : 0;

                  return (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.customer}</td>
                      <td>{h.productName}</td>
                      <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: 'var(--accent2)' }}>{h.structure}</td>
                      <td className="num">{fmt(h.quantity)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(h.finalPrice)} đ</td>
                      <td className="num">
                        {hasChotGia ? (
                          <span>
                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(h.chotGia!)} đ</span>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              ({diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--dim)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          title="Tải lại tính toán này"
                          onClick={() => {
                            loadHistoryItem(h.id);
                            onNavigate?.('calculator');
                          }}
                        >
                          <RotateCcw size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          Tải
                        </button>
                        {' '}
                        <button
                          className="btn btn-sm btn-outline"
                          title="Xóa khỏi lịch sử"
                          onClick={() => removeHistoryItem(h.id)}
                          style={{ color: 'var(--red)' }}
                        >
                          <Trash2 size={13} style={{ display: 'inline' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
