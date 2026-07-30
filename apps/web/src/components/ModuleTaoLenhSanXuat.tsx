"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, PackageCheck, Building2, Calendar, FileText, RefreshCw, Loader2, User,
  ChevronDown, ChevronUp, Eye, FileType, FileDown, Download,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { BaoGiaApi, TaiKhoanApi } from '../lib/api/service-lts';
import { layDanhSachBaoGiaService, layTaiKhoanService, NHAN_TRANG_THAI_BAO_GIA } from '../lib/api/service-lts';
import type { LsxSourceData, ProductionOrder, HistoryItem } from '../lib/types';
import { getPricingDisplayMeta } from '../lib/pricing-display';
import LSXFormModal from './ModalDonLSX';
import { mapBaoGiaToLsxSources, laBaoGiaDaDuyet, layNhanTrangThai, sortAndFilterQuotationsForLsx, laBgKhaDungChoLsx, type BoLocKhaDung, type SapXepLsx } from '../lib/bao-gia-adapter';
import BaoGiaPreviewModal from './BaoGiaPreviewModal';

import LsxPreviewModal from './LsxPreviewModal';
import LsxPdfPreviewModal from './LsxPdfPreviewModal';
import { QrevStyleInjector } from './qrev-styles';
import { exportLSXtoDOCX } from '../lib/lsxExport';
import { exportLSXtoPDF } from './LsxPdfDocument';
import { buildHistoryItemFromServerData } from '../lib/baoGiaExport';
import { buildProductionOrderFromSource } from '../lib/lsx-build-order';

interface DisplayRow {
  source: LsxSourceData;
  quotationName: string | null | undefined;
  createdAt: string;
  trangThai: ReturnType<typeof layNhanTrangThai>;
  nguoiTao: string;
  allSources: LsxSourceData[];
  sourceIndex: number;
  quotation: BaoGiaApi;
  khaDungCount: number;
  tongSheet: number;
  soChoKhachDuyet: number;
}

function layKhachHangLocal(): Array<{ companyName?: string; customerCode?: string; address?: string; invoiceAddress?: string; taxCode?: string; phone?: string }> {
  try { return JSON.parse(window.localStorage.getItem('lts_customers') || '[]'); } catch { return []; }
}

function layDuLieuBaoGia(baoGia: BaoGiaApi): {
  item: HistoryItem;
  customerInfo: { address?: string; taxCode?: string; phone?: string; fax?: string; description?: string };
} {
  const item = buildHistoryItemFromServerData(baoGia as any) as HistoryItem;
  const customerName = (item.customer || baoGia.pricingSheets?.[0]?.customer?.codeName || '') as string;
  const customers = layKhachHangLocal();
  const c = customers.find(kh => kh.companyName === customerName || kh.customerCode === customerName);
  return {
    item,
    customerInfo: {
      address: c?.address || c?.invoiceAddress || '',
      taxCode: c?.taxCode || '',
      phone: c?.phone || '',
      description: '',
    },
  };
}

export default function ModuleTaoLenhSanXuat() {
  const {
    accessToken, isAuthenticated, productionOrders, themLSX,
    materials, constants, profitTable, smallWidthPrices, currentSellerName,
  } = dungCuaHangTinhGia();

  const [quotations, setQuotations] = useState<BaoGiaApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  // Filter chip "kha dung cho LSX" (mac dinh: tat ca).
  const [boLoc, setBoLoc] = useState<BoLocKhaDung>('all');
  // Sap xep theo createdAt (mac dinh: moi nhat truoc).
  const [sapXep, setSapXep] = useState<SapXepLsx>('moi-nhat');
  const [modalData, setModalData] = useState<{ sources: LsxSourceData[]; activeIndex: number } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [previewBg, setPreviewBg] = useState<{ item: HistoryItem; customerInfo?: any } | null>(null);
  const [previewLsx, setPreviewLsx] = useState<ProductionOrder | null>(null);
  const [previewLsxPdf, setPreviewLsxPdf] = useState<ProductionOrder | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ quoteId: string; current: number; total: number } | null>(null);

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

  // Dem so BG theo tung chip loc (de hien thi count badge).
  // Tinh tren toan bo `quotations` (truoc khi search), vi search la bo loc tiep theo.
  const demTheoChip = useMemo(() => {
    const dem: Record<BoLocKhaDung, number> = {
      'all': quotations.length,
      'co-the-tao': 0,
      'dang-cho': 0,
    };
    for (const q of quotations) {
      if (laBgKhaDungChoLsx(q, { laDaDuyet: laBaoGiaDaDuyet, mapBaoGiaToLsxSources })) {
        dem['co-the-tao'] += 1;
      } else {
        dem['dang-cho'] += 1;
      }
    }
    return dem;
  }, [quotations]);

  const displayRows = useMemo(() => {
    const lower = tuKhoa.trim().toLowerCase();
    const rows: DisplayRow[] = [];

    // Sort + filter theo chip (boLoc, sapXep) TRUOC khi build row.
    // Helper da test o bao-gia-adapter-sort-filter.test.ts (10/10 pass).
    const sortedFiltered = sortAndFilterQuotationsForLsx(
      quotations,
      { boLoc, sapXep },
      { laDaDuyet: laBaoGiaDaDuyet, mapBaoGiaToLsxSources },
    );

    for (const q of sortedFiltered) {
      const daDuyet = laBaoGiaDaDuyet(q.updateStatus);
      const nguoiTao = tenNguoiTao(q);
      const trangThai = layNhanTrangThai(q.updateStatus);

      const allSources = mapBaoGiaToLsxSources(q);
      // Phan biet sheet "kha dung" (khach da duyet) vs "chua kha dung" de hien thi dung giao dien.
      // source.id co dinh dang `${quotationId}:${sheet.id}` (xem bao-gia-adapter.ts).
      const sheetsTheoSourceId = new Map<string, NonNullable<BaoGiaApi["pricingSheets"]>[number]>();
      for (const sheet of q.pricingSheets ?? []) {
        sheetsTheoSourceId.set(sheet.id, sheet);
      }
      const sourceVoiSheet = allSources.map((source) => {
        const sheetId = source.id.includes(':') ? source.id.split(':').slice(1).join(':') : source.id;
        return { source, sheet: sheetsTheoSourceId.get(sheetId) };
      });
      const khaDungSources = sourceVoiSheet
        .filter(({ sheet }) => sheet?.hasCustomerApproved === true)
        .map(({ source }) => source);
      const tongSheet = q.pricingSheets?.length ?? 0;
      const soChoKhachDuyet = tongSheet - khaDungSources.length;

      // Loc theo tu khoa tren tat ca source (ke ca chua kha dung) de admin tim BG nhanh.
      if (lower) {
        const haystack = [
          q.quotationName,
          nguoiTao,
          ...allSources.flatMap(s => [s.customer, s.productName, s.structure]),
        ].filter(Boolean).map(v => String(v).toLowerCase());
        if (!haystack.some(v => v.includes(lower))) continue;
      }

      // BG chua admin duyet: van hien thi, nhung chi de xem (khong co nut tao LSX).
      // sources cho UI hien thi = khaDungSources neu approved, [] neu khong approved.
      const sourcesForUi = daDuyet ? khaDungSources : [];

      // Lay source dau tien de hien thi thong tin co ban tren row (KH, san pham, gia...).
      // Uu tien source kha dung; neu khong co thi dung source dau tien (truong hop BG approved nhung chua co sheet nao kha dung).
      const sourceHienThi = khaDungSources[0] ?? allSources[0];

      // Bo qua BG khong co source nao de hien thi (vd: BG nhap lieu thu, hoac BG approved
      // nhung tat ca pricing sheet loi mapping). Tranh row.source = undefined gay crash o sort.
      if (!sourceHienThi) continue;

      rows.push({
        source: sourceHienThi,
        quotationName: q.quotationName,
        createdAt: q.createdAt,
        trangThai,
        nguoiTao,
        allSources: sourcesForUi,
        sourceIndex: 0,
        quotation: q,
        khaDungCount: khaDungSources.length,
        tongSheet,
        soChoKhachDuyet,
      });
    }

    return rows;
  }, [quotations, tuKhoa, tenNguoiTao, boLoc, sapXep]);

  function findOrdersForSource(sourceId: string): ProductionOrder[] {
    return productionOrders.filter(o => o.quoteId === sourceId);
  }

  function hasAnyLsx(sources: LsxSourceData[]): boolean {
    return sources.some(s => productionOrders.some(o => o.quoteId === s.id));
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openTaoLsx(sources: LsxSourceData[], index: number) {
    setModalData({ sources, activeIndex: index });
  }

  function openXemBg(baoGia: BaoGiaApi) {
    const data = layDuLieuBaoGia(baoGia);
    setPreviewBg({ item: data.item, customerInfo: data.customerInfo });
  }

  async function handleExportLsxDocx(order: ProductionOrder) {
    setExportingId(order.id + '-docx');
    try {
      await exportLSXtoDOCX(order);
    } catch (e) {
      console.error(e);
      alert('Lỗi xuất DOCX LSX.');
    } finally {
      setExportingId(null);
    }
  }

  async function handleExportLsxPdf(order: ProductionOrder) {
    setExportingId(order.id + '-pdf');
    try {
      await exportLSXtoPDF(order);
    } catch (e) {
      console.error(e);
      alert('Lỗi xuất PDF LSX.');
    } finally {
      setExportingId(null);
    }
  }

  /** Tạo N LSX + N PDF cho mọi SP của báo giá (không chặn SP đã có LSX). */
  async function handleTaoTatCa(quoteId: string, sources: LsxSourceData[]) {
    if (sources.length === 0) return;
    if (batchProgress) return;

    const n = sources.length;
    setBatchProgress({ quoteId, current: 0, total: n });
    let ok = 0;
    let fail = 0;
    let ordersSoFar = [...productionOrders];

    try {
      for (let i = 0; i < n; i++) {
        setBatchProgress({ quoteId, current: i + 1, total: n });
        const source = sources[i];
        try {
          if (!source.customer?.trim()) {
            throw new Error('Thiếu khách hàng');
          }
          const order = buildProductionOrderFromSource(source, {
            materials,
            constants,
            profitTable,
            smallWidthPrices,
            productionOrders: ordersSoFar,
            preparedBy: currentSellerName || '',
          });
          themLSX(order);
          ordersSoFar = [order, ...ordersSoFar];
          await exportLSXtoPDF(order);
          ok += 1;
          // Tránh browser chặn multi-download
          if (i < n - 1) await new Promise(r => setTimeout(r, 400));
        } catch (e) {
          console.error('[LSX batch]', source.id, e);
          fail += 1;
        }
      }
      if (fail === 0) {
        alert(`Đã tạo ${ok}/${n} LSX và tải PDF.`);
      } else {
        alert(`Đã tạo ${ok}/${n} LSX + PDF. Lỗi: ${fail}.`);
      }
    } finally {
      setBatchProgress(null);
    }
  }

  const btnSm: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '0.74rem', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap',
  };

  return (
    <div className="qrev-root">
      <QrevStyleInjector />

      {modalData && (
        <LSXFormModal
          sources={modalData.sources}
          activeIndex={modalData.activeIndex}
          onClose={() => setModalData(null)}
        />
      )}
      {previewBg && (
        <BaoGiaPreviewModal
          open={!!previewBg}
          onClose={() => setPreviewBg(null)}
          item={previewBg.item}
          customerInfo={previewBg.customerInfo}
        />
      )}
      {previewLsx && (
        <LsxPreviewModal
          open={!!previewLsx}
          onClose={() => setPreviewLsx(null)}
          order={previewLsx}
        />
      )}
      {previewLsxPdf && (
        <LsxPdfPreviewModal
          open={!!previewLsxPdf}
          onClose={() => setPreviewLsxPdf(null)}
          order={previewLsxPdf}
        />
      )}

      <header className="qrev-header">
        <div className="qrev-header-left">
          <h1 className="qrev-title">
            Tạo lệnh sản xuất
            <span className="qrev-title-count"> ({displayRows.length})</span>
          </h1>
        </div>
        <div className="qrev-header-right">
          <button
            className="qrev-btn qrev-btn--ghost"
            onClick={() => { setTuKhoa(''); setBoLoc('all'); setSapXep('moi-nhat'); fetchQuotations(); }}
            disabled={loading}
          >
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </header>

      <div className="qrev-search-bar">
        <Search size={16} className="qrev-search-icon" />
        <input
          className="qrev-search-input"
          aria-label="Tìm kiếm báo giá"
          placeholder="Tìm theo khách hàng, tên báo giá, sản phẩm..."
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
        {tuKhoa && (
          <button
            className="qrev-btn-icon qrev-search-clear"
            aria-label="Xóa từ khóa"
            onClick={() => setTuKhoa('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Bo loc theo kha dung: 3 chip, moi chip co count badge (giong ModuleDuyetBaoGia) */}
      <div className="qrev-chips">
        {([
          { key: 'all' as const, label: 'Tất cả' },
          { key: 'co-the-tao' as const, label: 'Sẵn sàng tạo LSX' },
          { key: 'dang-cho' as const, label: 'Đang chờ' },
        ]).map((chip) => (
          <button
            key={chip.key}
            className={boLoc === chip.key ? 'qrev-chip qrev-chip--active' : 'qrev-chip'}
            onClick={() => setBoLoc(chip.key)}
          >
            {chip.label} <span className="qrev-chip-count">{demTheoChip[chip.key]}</span>
          </button>
        ))}
      </div>

      {/* Sap xep: 2 chip, rieng 1 hang (van dung qrev-chips de wrap mobile) */}
      <div className="qrev-chips">
        {([
          { key: 'moi-nhat' as const, label: 'Mới nhất' },
          { key: 'cu-nhat' as const, label: 'Cũ nhất' },
        ]).map((chip) => (
          <button
            key={chip.key}
            className={sapXep === chip.key ? 'qrev-chip qrev-chip--active' : 'qrev-chip'}
            onClick={() => setSapXep(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="qrev-alert qrev-alert--err">{error}</div>
      )}

      {loading ? (
        <div className="qrev-empty" style={{ padding: '40px' }}>
          <Loader2 size={32} className="um-spin" />
          <p style={{ marginTop: 12 }}>Đang tải báo giá...</p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="qrev-empty" style={{ padding: '56px 20px' }}>
          <PackageCheck size={40} />
          <p>{tuKhoa ? 'Không tìm thấy báo giá phù hợp.' : 'Chưa có báo giá nào.'}</p>
          <span>
            {tuKhoa ? 'Thử từ khóa khác.' : 'Tạo báo giá mới từ menu "Báo giá" trước.'}
          </span>
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
                  const { source, quotationName, createdAt, trangThai, nguoiTao, allSources, khaDungCount, tongSheet, soChoKhachDuyet } = row;
                  const sourcesCount = allSources.length;
                  const daDuyet = laBaoGiaDaDuyet(row.quotation.updateStatus);
                  const existed = sourcesCount > 0 && hasAnyLsx(allSources);
                  const isExpanded = expandedIds.has(row.quotation.id);
                  const meta = getPricingDisplayMeta(source.input);
                  const shownPrice = source.chotGia ?? source.finalPrice;
                  const mauTrangThai: Record<string, { fg: string; bg: string }> = {
                    approved: { fg: '#047857', bg: '#ecfdf5' },
                  };
                  const mau = mauTrangThai[trangThai] || { fg: '#6b7280', bg: '#f3f4f6' };

                  return (
                    <React.Fragment key={row.quotation.id}>
                      <tr style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                        background: isExpanded ? '#dbeafe' : undefined,
                      }}>

                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <FileText size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{quotationName || 'Chưa đặt tên'}</span>
                            {existed && (
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                background: '#ecfdf5', color: '#047857',
                              }}>Đã có LSX</span>
                            )}
                            {/* Badge so sheet kha dung (chi hien thi khi admin da duyet) */}
                            {daDuyet && tongSheet > 0 && (
                              <span
                                title={`${khaDungCount}/${tongSheet} sheet khách đã duyệt`}
                                style={{
                                  fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                  background: khaDungCount > 0 ? '#ecfdf5' : '#f3f4f6',
                                  color: khaDungCount > 0 ? '#047857' : '#6b7280',
                                }}
                              >
                                {khaDungCount > 0
                                  ? `${khaDungCount}/${tongSheet} sheet khả dụng`
                                  : `${khaDungCount}/${tongSheet} sheet khả dụng`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={12} style={{ color: 'var(--muted)' }} />
                            <span>{source.customer || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600 }}>
                            {sourcesCount > 1
                              ? <span>{sourcesCount} sản phẩm</span>
                              : (source.productName || '—')
                            }
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          {sourcesCount > 1 ? `${sourcesCount} cấu trúc` : (source.structure || '—')}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                          {sourcesCount > 1
                            ? allSources.reduce((sum, s) => sum + (s.input.quantity || 0), 0).toLocaleString('vi-VN')
                            : source.input.quantity.toLocaleString('vi-VN')
                          } <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '0.76rem' }}>{meta.quantityUnit}</span>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              style={btnSm}
                              onClick={() => toggleExpand(row.quotation.id)}
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                            </button>
                            {daDuyet && khaDungCount > 0 && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  ...btnSm,
                                  background: '#2563eb',
                                  color: '#fff',
                                  padding: '4px 8px',
                                  opacity: batchProgress && batchProgress.quoteId !== row.quotation.id ? 0.5 : 1,
                                }}
                                disabled={!!batchProgress}
                                title={
                                  batchProgress?.quoteId === row.quotation.id
                                    ? `Đang tạo ${batchProgress.current}/${batchProgress.total}`
                                    : `Tạo ${khaDungCount} LSX và tải ${khaDungCount} PDF`
                                }
                                aria-label={`Tạo tất cả ${khaDungCount} LSX`}
                                onClick={() => handleTaoTatCa(row.quotation.id, allSources)}
                              >
                                {batchProgress?.quoteId === row.quotation.id
                                  ? <Loader2 size={14} className="um-spin" />
                                  : <Download size={14} />
                                }
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)', background: '#dbeafe' }}>
                          <td colSpan={10} style={{ padding: '8px 16px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* 3 trang thai: chua admin duyet / da duyet nhung chua co sheet kha dung / co sheet kha dung */}
                              {!daDuyet && (
                                <div style={{
                                  border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 8,
                                  padding: '10px 12px', fontSize: '0.82rem', color: '#92400e',
                                }}>
                                  🔒 Báo giá đang chờ duyệt nội bộ.
                                </div>
                              )}
                              {daDuyet && khaDungCount === 0 && tongSheet > 0 && (
                                <div style={{
                                  border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: 8,
                                  padding: '10px 12px', fontSize: '0.82rem', color: '#9a3412',
                                }}>
                                  ⚠ Chưa có bảng tính nào được khách duyệt
                                  {soChoKhachDuyet > 0 && ` (${soChoKhachDuyet} sheet chờ khách)`}.
                                </div>
                              )}
                              {allSources.map((sp, spIdx) => {
                                const spMeta = getPricingDisplayMeta(sp.input);
                                const orders = findOrdersForSource(sp.id);
                                const spPrice = sp.chotGia ?? sp.finalPrice;
                                return (
                                  <div
                                    key={sp.id}
                                    style={{
                                      border: '1px solid var(--border)',
                                      borderRadius: 8,
                                      padding: '10px 12px',
                                      background: 'var(--surface, #fff)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                                          ✅ {sp.productName || '—'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                                          {sp.structure || '—'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                          SL: <b>{(sp.input.quantity || 0).toLocaleString('vi-VN')} {spMeta.quantityUnit}</b>
                                          {' · '}
                                          Giá: <b>{spPrice.toLocaleString('vi-VN')} đ/{spMeta.unit}</b>
                                          {sp.input.productType === 'tui' && sp.input.bagType
                                            ? ` · ${sp.input.bagType}`
                                            : ''}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                          className="btn btn-sm btn-outline"
                                          style={btnSm}
                                          onClick={() => openXemBg(row.quotation)}
                                          title="Xem PDF báo giá"
                                        >
                                          <Eye size={13} /> Xem BG
                                        </button>
                                        <button
                                          className="btn btn-sm"
                                          style={{ ...btnSm, background: '#059669', color: '#fff' }}
                                          onClick={() => openTaoLsx([sp], 0)}
                                        >
                                          <PackageCheck size={13} /> Tạo LSX
                                        </button>
                                      </div>
                                    </div>

                                    {orders.length > 0 && (
                                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                                          LSX đã tạo ({orders.length})
                                        </div>
                                        {orders.map(ord => (
                                          <div
                                            key={ord.id}
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: 8,
                                              flexWrap: 'wrap', marginBottom: 4,
                                              fontSize: '0.78rem',
                                            }}
                                          >
                                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                              {ord.manual.lsxNumber || ord.id}
                                            </span>
                                            <span style={{ color: 'var(--muted)' }}>
                                              {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                            <button
                                              className="btn btn-sm btn-outline"
                                              style={btnSm}
                                              onClick={() => setPreviewLsx(ord)}
                                            >
                                              <Eye size={12} /> Review LSX
                                            </button>
                                            <button
                                              className="btn btn-sm btn-outline"
                                              style={btnSm}
                                              onClick={() => setPreviewLsxPdf(ord)}
                                              title="Xem PDF LSX"
                                            >
                                              <Eye size={12} /> Review PDF
                                            </button>
                                            <button
                                              className="btn btn-sm btn-outline"
                                              style={btnSm}
                                              disabled={exportingId === ord.id + '-docx'}
                                              onClick={() => handleExportLsxDocx(ord)}
                                            >
                                              {exportingId === ord.id + '-docx'
                                                ? <Loader2 size={12} className="um-spin" />
                                                : <FileType size={12} />}
                                              Xuất DOCX
                                            </button>
                                            <button
                                              className="btn btn-sm btn-outline"
                                              style={btnSm}
                                              disabled={exportingId === ord.id + '-pdf'}
                                              onClick={() => handleExportLsxPdf(ord)}
                                            >
                                              {exportingId === ord.id + '-pdf'
                                                ? <Loader2 size={12} className="um-spin" />
                                                : <FileDown size={12} />}
                                              Xuất PDF
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
