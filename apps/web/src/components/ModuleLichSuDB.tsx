"use client";
import { useState, useMemo } from 'react';
import { Search, Database, RotateCcw, Trash2, ClipboardList } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { HistoryItem } from '../lib/types';
import LSXFormModal from './ModalDonLSX';

function dinhDangSo(n: number, decimals = 0): string {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function ModuleLichSuDB({ khiDieuHuong }: { khiDieuHuong?: (module: 'calculator') => void }) {
  const { history: lichSu, loadHistoryItem: taiLichSu, removeHistoryItem: xoaLichSu } = dungCuaHangTinhGia();
  const [tuKhoa, datTuKhoa] = useState('');
  const [locGiaChot, datLocGiaChot] = useState<'all' | 'chot' | 'pending'>('all');
  const [mucLsx, datMucLsx] = useState<HistoryItem | null>(null);

  const daLoc = useMemo(() => {
    let danhSach = [...lichSu];

    if (locGiaChot === 'chot') {
      danhSach = danhSach.filter(h => h.chotGia && h.chotGia > 0);
    } else if (locGiaChot === 'pending') {
      danhSach = danhSach.filter(h => !h.chotGia || h.chotGia === 0);
    }

    if (tuKhoa.trim()) {
      const q = tuKhoa.toLowerCase();
      danhSach = danhSach.filter(h =>
        h.customer.toLowerCase().includes(q) ||
        h.productName.toLowerCase().includes(q) ||
        h.structure.toLowerCase().includes(q)
      );
    }

    return danhSach;
  }, [lichSu, tuKhoa, locGiaChot]);

  const tongSo = lichSu.length;
  const soDaChot  = lichSu.filter(h => h.chotGia && h.chotGia > 0).length;
  const soChuaChot = tongSo - soDaChot;

  return (
    <div className="crm-root hist-root">
      {/* LSX Form Modal */}
      {mucLsx && (
        <LSXFormModal historyItem={mucLsx} onClose={() => datMucLsx(null)} />
      )}
      {/* TOOLBAR */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm khách hàng, sản phẩm, cấu trúc..."
            value={tuKhoa}
            onChange={e => datTuKhoa(e.target.value)}
          />
          {tuKhoa && (
            <button className="crm-search-clear" onClick={() => datTuKhoa('')}>✕</button>
          )}
        </div>

        <div className="crm-toolbar-right">
          <div className="toolbar-group" style={{ display: 'flex' }}>
            <button
              className={`toolbar-btn ${locGiaChot === 'all' ? 'active' : ''}`}
              onClick={() => datLocGiaChot('all')}
            >
              Tất cả
            </button>
            <button
              className={`toolbar-btn ${locGiaChot === 'chot' ? 'active' : ''}`}
              onClick={() => datLocGiaChot('chot')}
            >
              Đã chốt giá
            </button>
            <button
              className={`toolbar-btn ${locGiaChot === 'pending' ? 'active' : ''}`}
              onClick={() => datLocGiaChot('pending')}
            >
              Chưa chốt
            </button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="quote-stats-overview">
        <div className="quote-stat-card">
          <div className="quote-stat-val">{tongSo}</div>
          <div className="quote-stat-lbl">Tổng lịch sử</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: 'var(--green)' }}>{soDaChot}</div>
          <div className="quote-stat-lbl">Đã chốt giá</div>
        </div>
        <div className="quote-stat-card">
          <div className="quote-stat-val" style={{ color: 'var(--orange)' }}>{soChuaChot}</div>
          <div className="quote-stat-lbl">Chưa chốt</div>
        </div>
        <div className="quote-stat-card quote-stat-card--total">
          <div className="quote-stat-val">{50 - tongSo}</div>
          <div className="quote-stat-lbl">Còn lại / 50</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="crm-danhSach hist-danhSach-container">
        {lichSu.length === 0 ? (
          <div className="crm-empty">
            <Database size={40} />
            <p>Chưa có lịch sử tính giá nào.</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--dim)', marginTop: '6px' }}>
              Hãy tính giá sản phẩm và lưu vào lịch sử từ tab Quản Lý.
            </p>
          </div>
        ) : daLoc.length === 0 ? (
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
                {daLoc.map(h => {
                  const coGiaChot = h.chotGia && h.chotGia > 0;
                  const chenhLech = coGiaChot ? h.chotGia! - h.finalPrice : 0;
                  const phanTramChenh = coGiaChot && h.finalPrice > 0 ? (chenhLech / h.finalPrice) * 100 : 0;

                  return (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.customer}</td>
                      <td>{h.productName}</td>
                      <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: 'var(--accent2)' }}>{h.structure}</td>
                      <td className="num">{dinhDangSo(h.quantity)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{dinhDangSo(h.finalPrice)} đ</td>
                      <td className="num">
                        {coGiaChot ? (
                          <span>
                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{dinhDangSo(h.chotGia!)} đ</span>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: chenhLech >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              ({chenhLech >= 0 ? '+' : ''}{phanTramChenh.toFixed(1)}%)
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
                            taiLichSu(h.id);
                            khiDieuHuong?.('calculator');
                          }}
                        >
                          <RotateCcw size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          Tải
                        </button>
                        {' '}
                        {coGiaChot && (
                          <>
                            <button
                              className="btn btn-sm btn-outline"
                              title="Tạo Lệnh Sản Xuất"
                              onClick={() => datMucLsx(h)}
                              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                            >
                              <ClipboardList size={13} style={{ display: 'inline', marginRight: '3px' }} />
                              LSX
                            </button>
                            {' '}
                          </>
                        )}
                        <button
                          className="btn btn-sm btn-outline"
                          title="Xóa khỏi lịch sử"
                          onClick={() => xoaLichSu(h.id)}
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
