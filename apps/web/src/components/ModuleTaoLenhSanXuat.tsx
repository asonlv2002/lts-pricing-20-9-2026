"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, PackageCheck, Building2, Calendar, FileText, RefreshCw, Loader2, User } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { BaoGiaApi, TaiKhoanApi } from '../lib/api/service-lts';
import { layDanhSachBaoGiaService, layTaiKhoanService, NHAN_TRANG_THAI_BAO_GIA } from '../lib/api/service-lts';
import type { LsxSourceData } from '../lib/types';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import LSXFormModal from './ModalDonLSX';
import { mapBaoGiaToLsxSources, laBaoGiaDaDuyet, layNhanTrangThai, type AdapterContext } from '../lib/bao-gia-adapter';

interface DisplayRow {
  source: LsxSourceData;
  quotationName: string | null | undefined;
  createdAt: string;
  trangThai: ReturnType<typeof layNhanTrangThai>;
  nguoiTao: string;
  allSources: LsxSourceData[];
  sourceIndex: number;
}

export default function ModuleTaoLenhSanXuat() {
  const { materials, constants, profitTable, smallWidthPrices, accessToken, isAuthenticated, productionOrders } = dungCuaHangTinhGia();

  const [quotations, setQuotations] = useState<BaoGiaApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  const [modalData, setModalData] = useState<{ sources: LsxSourceData[]; activeIndex: number } | null>(null);

  const [danhSachTaiKhoan, setDanhSachTaiKhoan] = useState<TaiKhoanApi[]>([]);
  const daTaiTaiKhoan = useRef(false);

  useEffect(() => {
    if (!accessToken || daTaiTaiKhoan.current) return;
    daTaiTaiKhoan.current = true;
    layTaiKhoanService(accessToken).then(setDanhSachTaiKhoan).catch(() => {});
  }, [accessToken]);

  const banDoTaiKhoan = useMemo(() => {
    const map = new Map<string, string>();
    for (const tk of danhSachTaiKhoan) {
      if (tk.fullName) map.set(tk.id, tk.fullName);
    }
    return map;
  }, [danhSachTaiKhoan]);

  const ctx: AdapterContext = useMemo(() => ({
    materials, constants, profitTable, smallWidthPrices,
  }), [materials, constants, profitTable, smallWidthPrices]);

  const fetchQuotations = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setError('Cần đăng nhập để tải báo giá từ máy chủ.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await layDanhSachBaoGiaService(accessToken);
      setQuotations(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách báo giá.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  const tenNguoiTao = useCallback((bg: BaoGiaApi): string => {
    return bg.original?.actorName ?? banDoTaiKhoan.get(bg.createdBy ?? '') ?? '—';
  }, [banDoTaiKhoan]);

  const displayRows = useMemo(() => {
    const lower = tuKhoa.trim().toLowerCase();
    const rows: DisplayRow[] = [];

    for (const q of quotations) {
      if (!laBaoGiaDaDuyet(q.updateStatus)) continue;
      const nguoiTao = tenNguoiTao(q);
      const trangThai = layNhanTrangThai(q.updateStatus);

      const sources = mapBaoGiaToLsxSources(q, ctx);
      sources.forEach((source, sourceIndex) => {
        if (lower) {
          const haystack = [
            q.quotationName,
            nguoiTao,
            source.customer,
            source.productName,
            source.structure,
          ].filter(Boolean).map(v => String(v).toLowerCase());
          if (!haystack.some(v => v.includes(lower))) return;
        }

        rows.push({
          source,
          quotationName: q.quotationName,
          createdAt: q.createdAt,
          trangThai,
          nguoiTao,
          allSources: sources,
          sourceIndex,
        });
      });
    }

    rows.sort((a, b) => b.source.id.localeCompare(a.source.id));
    return rows;
  }, [quotations, ctx, tuKhoa, tenNguoiTao]);

  function hasExistingLSX(sourceId: string): boolean {
    return productionOrders.some(o => o.quoteId === sourceId);
  }

  return (
    <div className="crm-root quote-root">
      {modalData && <LSXFormModal sources={modalData.sources} activeIndex={modalData.activeIndex} onClose={() => setModalData(null)} />}

      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm khách hàng, tên báo giá, sản phẩm..."
            value={tuKhoa}
            onChange={e => setTuKhoa(e.target.value)}
          />
          {tuKhoa && <button className="crm-search-clear" onClick={() => setTuKhoa('')}>✕</button>}
        </div>
        <div className="crm-toolbar-right" style={{ gap: 8 }}>
          <button className="btn btn-sm btn-outline" onClick={() => { setTuKhoa(''); fetchQuotations(); }} disabled={loading}>
            <RefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="crm-empty" style={{ padding: '40px' }}>
          <Loader2 size={32} className="um-spin" />
          <p style={{ marginTop: 12 }}>Đang tải báo giá...</p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="crm-empty" style={{ padding: '56px 20px' }}>
          <PackageCheck size={40} />
          <p>{tuKhoa || quotations.length === 0 ? 'Chưa có báo giá đã duyệt.' : 'Không tìm thấy báo giá phù hợp.'}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>
            {tuKhoa ? 'Thử từ khóa khác.' : 'Báo giá cần được admin duyệt trước khi có thể tạo LSX.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface2, #f8f9fb)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Báo giá</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Khách hàng</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Sản phẩm</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Cấu trúc</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Số lượng</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Đơn giá</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Người tạo</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Ngày</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(row => {
                  const { source, quotationName, createdAt, trangThai, nguoiTao } = row;
                  const existed = hasExistingLSX(source.id);
                  const meta = getPricingDisplayMeta(source.input);
                  const shownPrice = source.chotGia ?? source.finalPrice;
                  const mauTrangThai: Record<string, { fg: string; bg: string }> = {
                    approved: { fg: '#047857', bg: '#ecfdf5' },
                    customer_approved: { fg: '#15803d', bg: '#f0fdf4' },
                  };
                  const mau = mauTrangThai[trangThai] || { fg: '#6b7280', bg: '#f3f4f6' };

                  return (
                    <tr
                      key={source.id}
                      style={{ borderBottom: '1px solid var(--border)', opacity: existed ? 0.6 : 1 }}
                    >
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{quotationName || 'Chưa đặt tên'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} style={{ color: 'var(--muted)' }} />
                          <span>{source.customer || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600 }}>{source.productName || '—'}</div>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        {source.structure || '—'}
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                        {source.input.quantity.toLocaleString('vi-VN')} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.76rem' }}>{meta.quantityUnit}</span>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                        {shownPrice.toLocaleString('vi-VN')} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.76rem' }}>đ/{meta.unit}</span>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} style={{ color: 'var(--muted)' }} />
                          <span style={{ fontSize: '0.8rem' }}>{nguoiTao}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--muted)' }}>
                          <Calendar size={12} />
                          <span>{new Date(createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: mau.fg, background: mau.bg, whiteSpace: 'nowrap' }}>
                          ● {NHAN_TRANG_THAI_BAO_GIA[trangThai]}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: existed ? 'var(--border)' : '#059669',
                            color: existed ? 'var(--muted)' : '#fff',
                            cursor: existed ? 'default' : 'pointer',
                            fontSize: '0.78rem', padding: '5px 12px', borderRadius: 6,
                          }}
                          onClick={() => { if (!existed) setModalData({ sources: row.allSources, activeIndex: row.sourceIndex }); }}
                          disabled={existed}
                        >
                          <PackageCheck size={13} /> {existed ? 'Đã có LSX' : 'Tạo LSX'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
