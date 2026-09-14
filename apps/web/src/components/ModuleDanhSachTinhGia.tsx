"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, Eye, X, Inbox, FileText,
  ChevronLeft, ChevronRight, CheckSquare, Square,
  Trash2, FileEdit,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { getPricingWorkflowStatus } from '../lib/history-filters';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import { idChiaSeBangTinh, taoUrlChiaSeTinhGia } from '../lib/tinh-gia-route';
import { dieuHuongMenuApp, menuKeyTinhGiaTheoItem } from '../lib/menu-route';
import { QrevStyleInjector } from './qrev-styles';
import { xoaPricingSheetService } from '../lib/api/service-lts';
import { exportPricingDetailToA4 } from '../lib/pricing-detail-export';
import { coQuyenCoVanBangTinh } from '../lib/permissions';
import NutSaoChepLienKet from './NutSaoChepLienKet';
import type { HistoryItem } from '../lib/types';
import { dinhDangNgayTaoLichSu, msSapXepLichSu } from '../lib/history-datetime';
import { AvatarBlobImg } from '../lib/avatar-blob-cache';
import AvatarNguoiLap from './AvatarNguoiLap';
import { layChuCaiDau, layMauAvatar, rutGonTenKhachHang } from '../lib/ten-hien-thi';

const boDau = (chuoi: string) =>
  chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function dinhDangSo(n: number): string {
  return Math.round(n || 0).toLocaleString('vi-VN');
}

// Helper tên/avatar hiển thị card — dùng chung qua lib/ten-hien-thi.

type BoLocTinhGia = 'all' | 'draft' | 'saved' | 'used';

const CHIP_LABELS: { key: BoLocTinhGia; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'draft', label: 'Nháp' },
  { key: 'saved', label: 'Đã lưu' },
  { key: 'used', label: 'Đã dùng' },
];

const QUOTE_PREFILL_STORAGE_KEY = 'lts_quote_prefill_from_history';

const PAGE_SIZE = 20;

export default function ModuleDanhSachTinhGia({
  khiDieuHuong,
}: {
  khiDieuHuong?: (module: 'calculator' | 'quotations') => void;
}) {
  const { history: lichSu, taiLichSuTuServer, removeHistoryItem: xoaLichSu, accessToken, materials, constants, profitTable, smallWidthPrices, cpsxNangCapPolicies, nguoiDungHienTai } = dungCuaHangTinhGia();

  const [tuKhoa, datTuKhoa] = useState('');
  const [boLoc, datBoLoc] = useState<BoLocTinhGia>('all');
  const [page, setPage] = useState(0);
  const [selectedQuoteHistoryIds, setSelectedQuoteHistoryIds] = useState<Set<string>>(new Set());
  const [quoteDraftCustomer, setQuoteDraftCustomer] = useState<string | null>(null);
  const [xacNhanXoaId, datXacNhanXoaId] = useState<string | null>(null);
  const [hienLoiXoa, datHienLoiXoa] = useState(false);
  /** card mobile: 1 tooltip avatar người lập mở tại 1 thời điểm. */
  const [idTipAvatar, datIdTipAvatar] = useState<string | null>(null);

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

  const moLaiTinhGia = async (id: string) => {
    const item = lichSu.find(h => h.id === id);
    const ok = await dungCuaHangTinhGia.getState().moBangTinhVoiPin(id);
    if (!ok) return;
    // Đánh dấu mở từ trang Danh sách tính giá → page.tsx hiện banner "← Danh sách tính giá"
    dungCuaHangTinhGia.getState().datTuDanhSachTinhGia(true);
    // Helper phân biệt 3 tab: nâng cao / thương mại / thường → URL có id
    dieuHuongMenuApp(menuKeyTinhGiaTheoItem(item));
  };

  const moXemA4 = (h: HistoryItem) => {
    void exportPricingDetailToA4(h, materials, constants, profitTable, cpsxNangCapPolicies, coQuyenCoVanBangTinh(nguoiDungHienTai?.policies ?? []), accessToken, smallWidthPrices);
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
    const meta = getPricingDisplayMeta(h.input);
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
          <div className="qrev-cell-name">
            {h.productName}
            {h.isNangCap && (
              <span className="qrev-badge" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', marginLeft: 8, fontWeight: 600 }}>
                🚀 Nâng cấp
              </span>
            )}
            {h.isThuongMai && (
              <span
                className="qrev-badge"
                title="Tính giá thương mại — mua đi bán lại"
                style={{ background: 'rgba(20,184,166,0.12)', color: '#0d9488', marginLeft: 8, fontWeight: 600 }}
              >
                🏷️ Thương mại
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
          </div>
        </td>
        <td className="qrev-cell-sale" title={h.customer}>{rutGonTenKhachHang(h.customer)}</td>
        <td className="qrev-cell-sale">
          {h.sellerName ? (
            h.sellerAvatarUrl ? (
              <AvatarBlobImg
                actorAvatarUrl={h.sellerAvatarUrl}
                accessToken={accessToken}
                alt={h.sellerName}
                className="qrev-user-avatar"
                style={{ objectFit: 'cover', background: 'transparent' }}
              />
            ) : (
              <span className="qrev-user-avatar" style={{ background: layMauAvatar(h.sellerName) }} title={h.sellerName}>
                {layChuCaiDau(h.sellerName)}
              </span>
            )
          ) : '—'}
        </td>
        <td className="qrev-cell-date" title={h.updatedAt && h.createdAt && h.updatedAt !== h.createdAt ? `Cập nhật: ${dinhDangNgayTaoLichSu({ ...h, createdAt: h.updatedAt })}` : undefined}>
          {dinhDangNgayTaoLichSu(h)}
        </td>
        <td className="qrev-cell-sale" style={{ textAlign: 'right' }}>
          {dinhDangSo(giaHienThi)} ₫/{meta.unit}
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
            <button className="qrev-btn-icon qrev-btn-icon--primary" title="Mở lại tính giá" onClick={() => void moLaiTinhGia(h.id)}>
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

  /** card mobile (ẩn table, hiện thẻ) — cùng hành vi với dòng desktop. */
  const renderCard = (h: HistoryItem) => {
    const meta = getPricingDisplayMeta(h.input);
    const giaHienThi = h.chotGia && h.chotGia > 0 ? h.chotGia : h.finalPrice;
    const duocChon = selectedQuoteHistoryIds.has(h.id);
    return (
      <article key={h.id} className="qrev-mcard" onClick={() => moXemA4(h)}>
        <div className="qrev-mcard-r1">
          <span className="qrev-mcard-name">
            {h.productName}
            {h.isNangCap && (
              <span className="qrev-badge" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', marginLeft: 6 }}>
                🚀
              </span>
            )}
            {h.isThuongMai && (
              <span className="qrev-badge" title="Tính giá thương mại — mua đi bán lại" style={{ background: 'rgba(20,184,166,0.12)', color: '#0d9488', marginLeft: 6 }}>
                🏷️
              </span>
            )}
            {h.thieuPin && (
              <span className="qrev-badge" title="Chưa ghim cấu hình lúc lưu — giá đang tính theo CPSX/cấu hình hiện tại trên máy" style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309', marginLeft: 6 }}>
                Chưa ghim CH
              </span>
            )}
          </span>
          <span className="qrev-mcard-price">
            {dinhDangSo(giaHienThi)} ₫/{meta.unit}
          </span>
        </div>
        <div className="qrev-mcard-customer" title={h.customer}>
          {rutGonTenKhachHang(h.customer)}
        </div>
        <div className="qrev-mcard-sub">
          {dinhDangNgayTaoLichSu(h)}
        </div>
        <div className="qrev-mcard-foot">
          <span className="qrev-mcard-left">
            <button
              type="button"
              className="qrev-btn-icon"
              title={duocChon ? 'Bỏ chọn' : 'Chọn để tạo báo giá'}
              onClick={(e) => {
                e.stopPropagation();
                toggleQuoteSelection(h);
              }}
            >
              {duocChon ? <CheckSquare size={17} color="var(--accent)" /> : <Square size={17} />}
            </button>
            <AvatarNguoiLap
              ten={h.sellerName}
              avatarUrl={h.sellerAvatarUrl}
              accessToken={accessToken}
              id={h.id}
              idDangMo={idTipAvatar}
              onCham={datIdTipAvatar}
            />
          </span>
          <span className="qrev-mcard-actions" onClick={(e) => e.stopPropagation()}>
            <button className="qrev-btn-icon" title="Xem chi tiết" onClick={() => moXemA4(h)}>
              <Eye size={15} />
            </button>
            <NutSaoChepLienKet
              url={taoUrlChiaSeTinhGia(idChiaSeBangTinh(h), { nangCao: !!h.isNangCap })}
              variant="qrev"
              size={15}
            />
            <button className="qrev-btn-icon qrev-btn-icon--primary" title="Mở lại tính giá" onClick={() => void moLaiTinhGia(h.id)}>
              <FileEdit size={15} />
            </button>
            {h.deletable && (
              <button className="qrev-btn-icon" title="Xóa bảng tính giá" onClick={() => datXacNhanXoaId(h.id)}>
                <Trash2 size={15} />
              </button>
            )}
          </span>
        </div>
      </article>
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
          <>
          <div className="qrev-table-wrap">
            <table className="qrev-table qrev-table--tinhgia">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Sản phẩm</th>
                  <th>Khách hàng</th>
                  <th>Người lập</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: 'right' }}>Giá</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(renderRow)}
              </tbody>
            </table>
            <div className="qrev-table-bottom-spacer" aria-hidden="true" />
          </div>
          <div className="qrev-mcard-list" aria-label="Danh sách tính giá dạng thẻ">
            {pageItems.map(renderCard)}
          </div>
          </>
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
