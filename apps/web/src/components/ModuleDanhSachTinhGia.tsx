"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, Eye, X, FileText, Inbox,
  ChevronLeft, ChevronRight, CheckSquare, Square,
  Trash2, FileEdit,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { getPricingWorkflowStatus } from '../lib/history-filters';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { idChiaSeBangTinh, taoUrlChiaSeTinhGia } from '../lib/tinh-gia-route';
import { dieuHuongMenuApp } from '../lib/menu-route';
import { QrevStyleInjector } from './qrev-styles';
import { xoaPricingSheetService } from '../lib/api/service-lts';
import { exportPricingDetailToA4 } from '../lib/pricing-detail-export';
import NutSaoChepLienKet from './NutSaoChepLienKet';
import type { HistoryItem } from '../lib/types';
import { dinhDangNgayTaoLichSu, msSapXepLichSu } from '../lib/history-datetime';

const boDau = (chuoi: string) =>
  chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function dinhDangSo(n: number): string {
  return Math.round(n || 0).toLocaleString('vi-VN');
}

type BoLocTinhGia = 'all' | 'draft' | 'saved' | 'used';

const CHIP_LABELS: { key: BoLocTinhGia; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'draft', label: 'Nháp' },
  { key: 'saved', label: 'Đã lưu' },
  { key: 'used', label: 'Đã dùng' },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#f3f4f6', fg: '#6b7280' },
  saved: { bg: '#eef2ff', fg: '#4338ca' },
  used: { bg: '#ecfdf5', fg: '#047857' },
  locked: { bg: '#fef2f2', fg: '#b91c1c' },
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  saved: 'Đã lưu',
  used: 'Đã dùng',
  locked: 'Đã khóa',
};

const AVATAR_COLORS = ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#2563eb', '#9333ea', '#dc2626'];
function mauAvatar(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const QUOTE_PREFILL_STORAGE_KEY = 'lts_quote_prefill_from_history';

const PAGE_SIZE = 20;

export default function ModuleDanhSachTinhGia({
  khiDieuHuong,
}: {
  khiDieuHuong?: (module: 'calculator' | 'quotations') => void;
}) {
  const { history: lichSu, loadHistoryItem: taiLichSu, taiLichSuTuServer, removeHistoryItem: xoaLichSu, accessToken, materials, constants, profitTable } = dungCuaHangTinhGia();

  const [tuKhoa, datTuKhoa] = useState('');
  const [boLoc, datBoLoc] = useState<BoLocTinhGia>('all');
  const [page, setPage] = useState(0);
  const [selectedQuoteHistoryIds, setSelectedQuoteHistoryIds] = useState<Set<string>>(new Set());
  const [quoteDraftCustomer, setQuoteDraftCustomer] = useState<string | null>(null);
  const [xacNhanXoaId, datXacNhanXoaId] = useState<string | null>(null);
  const [hienLoiXoa, datHienLoiXoa] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const khoiDongAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      taiLichSuTuServer();
    }, 30_000);
  }, [taiLichSuTuServer]);

  useEffect(() => {
    khoiDongAutoRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [khoiDongAutoRefresh]);

  const lamMoiVaResetTrang = useCallback(async () => {
    await taiLichSuTuServer();
    khoiDongAutoRefresh();
    setPage(0);
  }, [taiLichSuTuServer, khoiDongAutoRefresh]);

  const dsTinhGia = useMemo(
    () => lichSu.filter(h => !h.isQuote && !h.quoteProducts?.length),
    [lichSu],
  );

  const dsDaHienThi = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    let filtered = dsTinhGia.filter(h => {
      const status = getPricingWorkflowStatus(h);
      if (boLoc === 'draft' && status !== 'draft') return false;
      if (boLoc === 'saved' && status !== 'saved') return false;
      if (boLoc === 'used' && status !== 'used') return false;

      if (q) {
        const text = boDau(`${h.productName} ${h.customer} ${h.structure} ${h.quoteCode ?? ''}`);
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => msSapXepLichSu(b) - msSapXepLichSu(a));
    if (quoteDraftCustomer) {
      filtered = filtered.filter(h =>
        h.customer === quoteDraftCustomer || selectedQuoteHistoryIds.has(h.id)
      );
    }
    return filtered;
  }, [dsTinhGia, tuKhoa, boLoc, quoteDraftCustomer, selectedQuoteHistoryIds]);

  const demTheoChip = useMemo(() => {
    const dem: Record<BoLocTinhGia, number> = { all: dsTinhGia.length, draft: 0, saved: 0, used: 0 };
    for (const h of dsTinhGia) {
      const s = getPricingWorkflowStatus(h);
      if (s === 'draft') dem.draft++;
      if (s === 'saved') dem.saved++;
      if (s === 'used') dem.used++;
    }
    return dem;
  }, [dsTinhGia]);

  const totalPages = Math.ceil(dsDaHienThi.length / PAGE_SIZE);
  const pageItems = dsDaHienThi.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const moLaiTinhGia = (id: string) => {
    const item = lichSu.find(h => h.id === id);
    // Bảng tính nâng cấp → mở đúng tab "nâng cấp" (route riêng)
    if (item?.isNangCap) {
      dieuHuongMenuApp('tao-tinh-gia-nang-cap');
      taiLichSu(id);
      return;
    }
    taiLichSu(id);
    khiDieuHuong?.('calculator');
  };

  const moXemA4 = (h: HistoryItem) => {
    exportPricingDetailToA4(h, materials, constants, profitTable);
  };

  const xuLyXoa = async (id: string) => {
    const item = lichSu.find(h => h.id === id);
    if (!item) return;
    if (item.pricingSheetId && accessToken) {
      const ketQua = await xoaPricingSheetService(item.pricingSheetId, accessToken);
      if (!ketQua.success) { datHienLoiXoa(true); return; }
    }
    xoaLichSu(id);
  };

  const selectedQuoteItems = useMemo(
    () => lichSu.filter(item => selectedQuoteHistoryIds.has(item.id)),
    [lichSu, selectedQuoteHistoryIds],
  );

  const toggleQuoteSelection = (item: HistoryItem) => {
    setSelectedQuoteHistoryIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        if (next.size === 0) setQuoteDraftCustomer(null);
        return next;
      }
      if (!quoteDraftCustomer) setQuoteDraftCustomer(item.customer);
      if (quoteDraftCustomer && item.customer !== quoteDraftCustomer) return prev;
      next.add(item.id);
      return next;
    });
    setPage(0);
  };

  const createQuoteDraftFromSelection = () => {
    if (selectedQuoteItems.length === 0) return;
    localStorage.setItem(QUOTE_PREFILL_STORAGE_KEY, JSON.stringify({
      customerName: quoteDraftCustomer ?? selectedQuoteItems[0].customer,
      historyItemIds: selectedQuoteItems.map(item => item.id),
      createdAt: new Date().toISOString(),
    }));
    setSelectedQuoteHistoryIds(new Set());
    setQuoteDraftCustomer(null);
    khiDieuHuong?.('quotations');
  };

  const renderRow = (h: HistoryItem) => {
    const status = getPricingWorkflowStatus(h);
    const meta = getPricingDisplayMeta(h.input);
    const mau = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
    const giaHienThi = h.chotGia && h.chotGia > 0 ? h.chotGia : h.finalPrice;
    const duocChon = selectedQuoteHistoryIds.has(h.id);

    return (
      <tr key={h.id} className="qrev-row" onClick={() => moXemA4(h)}>
        <td style={{ width: 40 }} onClick={e => e.stopPropagation()}>
          <button
            className="qrev-btn-icon"
            title={duocChon ? 'Bỏ chọn' : 'Chọn để tạo báo giá'}
            onClick={() => toggleQuoteSelection(h)}
          >
            {duocChon ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
          </button>
        </td>
        <td>
          <div className="qrev-cell-quote">
            <div className="qrev-avatar" style={{ background: mauAvatar(h.id) }}>
              <FileText size={15} />
            </div>
            <div className="qrev-cell-quote-text">
              <span className="qrev-cell-name">
                {h.productName}
                {h.isNangCap && (
                  <span className="qrev-badge" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', marginLeft: 8, fontWeight: 600 }}>
                    🚀 Nâng cấp
                  </span>
                )}
                {h.thieuPin && (
                  <span
                    className="qrev-badge"
                    title="Chưa ghim cấu hình lúc lưu — giá đang tính theo CPSX/cấu hình hiện tại trên máy"
                    style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309', marginLeft: 8, fontWeight: 600 }}
                  >
                    Chưa ghim CH
                  </span>
                )}
              </span>
              <span className="qrev-cell-sub">{h.structure}</span>
            </div>
          </div>
        </td>
        <td className="qrev-cell-sale">{h.customer}</td>
        <td className="qrev-cell-date" title={h.updatedAt && h.createdAt && h.updatedAt !== h.createdAt ? `Cập nhật: ${dinhDangNgayTaoLichSu({ ...h, createdAt: h.updatedAt })}` : undefined}>
          {dinhDangNgayTaoLichSu(h)}
        </td>
        <td className="qrev-cell-sale" style={{ textAlign: 'right' }}>
          {dinhDangSo(giaHienThi)} ₫/{meta.unit}
        </td>
        <td>
          <span className="qrev-badge" style={{ background: mau.bg, color: mau.fg }}>
            <span className="qrev-badge-dot" style={{ background: mau.fg }} />
            {STATUS_LABELS[status]}
          </span>
        </td>
        <td>
          <div className="qrev-row-actions" onClick={e => e.stopPropagation()}>
            <button className="qrev-btn-icon" title="Xem chi tiết" onClick={() => moXemA4(h)}>
              <Eye size={15} />
            </button>
            <NutSaoChepLienKet
              url={taoUrlChiaSeTinhGia(idChiaSeBangTinh(h), { nangCao: !!h.isNangCap })}
              variant="qrev"
              size={15}
            />
            <button className="qrev-btn-icon qrev-btn-icon--primary" title="Mở lại tính giá" onClick={() => moLaiTinhGia(h.id)}>
              <FileEdit size={15} />
            </button>
            {h.deletable && (
            <button className="qrev-btn-icon" title="Xóa bảng tính giá" onClick={() => datXacNhanXoaId(h.id)}>
              <Trash2 size={15} />
            </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="qrev-root">
      <QrevStyleInjector />

      <header className="qrev-header">
        <div className="qrev-header-left">
          <h1 className="qrev-title">
            Danh sách tính giá
            <span className="qrev-title-count"> ({dsDaHienThi.length})</span>
          </h1>
        </div>
        <div className="qrev-header-right">
          <button className="qrev-btn qrev-btn--ghost" onClick={lamMoiVaResetTrang}>
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </header>

      <div className="qrev-search-bar">
        <Search size={16} className="qrev-search-icon" />
        <input
          className="qrev-search-input"
          aria-label="Tìm kiếm bảng tính giá"
          placeholder="Tìm theo tên sản phẩm, khách hàng, cấu trúc..."
          value={tuKhoa}
          onChange={e => { datTuKhoa(e.target.value); setPage(0); }}
        />
        {tuKhoa && (
          <button className="qrev-btn-icon qrev-search-clear" aria-label="Xóa" onClick={() => datTuKhoa('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="qrev-chips" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHIP_LABELS.map(chip => (
            <button
              key={chip.key}
              className={boLoc === chip.key ? 'qrev-chip qrev-chip--active' : 'qrev-chip'}
              onClick={() => { datBoLoc(chip.key); setPage(0); }}
            >
              {chip.label} <span className="qrev-chip-count">{demTheoChip[chip.key]}</span>
            </button>
          ))}
        </div>
        {selectedQuoteItems.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              <strong>{quoteDraftCustomer}</strong> · {selectedQuoteItems.length} SP
            </span>
            <button className="btn btn-sm btn-outline" onClick={() => { setSelectedQuoteHistoryIds(new Set()); setQuoteDraftCustomer(null); }}>
              <X size={14} />
            </button>
            <button className="btn btn-sm btn-primary" onClick={createQuoteDraftFromSelection}>
              <FileText size={14} /> Tạo báo giá
            </button>
          </div>
        )}
      </div>

      <div className="qrev-table-shell">
        {dsDaHienThi.length === 0 ? (
          <div className="qrev-empty">
            <Inbox size={40} />
            <p>{tuKhoa ? 'Không tìm thấy bảng tính giá nào khớp với từ khóa.' : 'Chưa có bảng tính giá nào.'}</p>
            <span>{tuKhoa ? 'Thử từ khóa khác hoặc xóa bộ lọc.' : 'Tạo bảng tính giá ở mục "Tạo bảng tính giá".'}</span>
          </div>
        ) : (
          <div className="qrev-table-wrap">
            <table className="qrev-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Sản phẩm</th>
                  <th>Khách hàng</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Giá</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(renderRow)}
              </tbody>
            </table>
            <div className="qrev-table-bottom-spacer" aria-hidden="true" />
          </div>
        )}

        {totalPages > 1 && (
          <div className="qrev-pagination">
            <button
              className="qrev-pagination-btn"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="qrev-pagination-info">{page + 1} / {totalPages}</span>
            <button
              className="qrev-pagination-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {xacNhanXoaId && (
        <div className="lts-confirm-backdrop" onClick={() => datXacNhanXoaId(null)}>
          <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="lts-confirm-icon">🗑</div>
            <h3 className="lts-confirm-title">Xóa bảng tính giá này?</h3>
            <p className="lts-confirm-desc">
              Thao tác này không thể hoàn tác.<br />
              Bảng tính giá sẽ bị xóa vĩnh viễn.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => datXacNhanXoaId(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => { const id = xacNhanXoaId; datXacNhanXoaId(null); xuLyXoa(id); }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
      {hienLoiXoa && (
        <div className="lts-confirm-backdrop" onClick={() => datHienLoiXoa(false)}>
          <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="lts-confirm-icon">⚠️</div>
            <h3 className="lts-confirm-title">Không thể xóa</h3>
            <p className="lts-confirm-desc">
              Bảng này đang có liên kết với báo giá.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => datHienLoiXoa(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
