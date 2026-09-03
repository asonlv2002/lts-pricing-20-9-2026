"use client";
// src/components/ModuleDanhSachLSX.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Module Danh sách LSX - rewrite theo pattern ModuleDuyetBaoGia (qrev-*).
// 2 status: Chờ duyệt | Đã duyệt. Bỏ "Từ chối" theo Q15=b.
// Click row -> LsxPdfPreviewModal. Click 📝 -> navigate tab Tạo LSX (khóa KH/BG/sheet).
// Có cột Duyệt (giống BG): advisor duyệt/từ chối.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, CheckCircle2, XCircle, Eye, X,
  FileEdit, FileText, FileDown, Inbox, Loader2,
} from 'lucide-react';
import { useCalculatorStore } from '../store/CuaHangTinhGia';
import { coQuyenDuyetLsx } from '../lib/permissions';
import {
  listQuotationPricingSheetOrdersService,
  updateOrderApprovalService,
  type QuotationPricingSheetOrderApi,
  type QuotationPricingSheetOrdersByQuotationApi,
  type PricingSheetApi,
} from '../lib/api/service-lts';
import {
  mapServerOrdersToLsxRows,
  filterLsxByStatus,
  searchLsxRows,
  type LsxRow,
} from '../lib/lsx-server-adapter';
import type { LSXManualFields, LsxLocalStatus } from '../lib/types';
import { LSX_LOCAL_STATUS_CONFIG, NHAN_LSX_LOCAL_STATUS } from '../lib/types';
import { QrevStyleInjector } from './qrev-styles';
import LsxPreviewModal from './LsxPreviewModal';
import LsxPdfPreviewModal from './LsxPdfPreviewModal';
import NhapPinDuyetModal from './auth/NhapPinDuyetModal';
import NhapLyDoTruocPinModal from './auth/NhapLyDoTruocPinModal';
import NutSaoChepLienKet from './NutSaoChepLienKet';
import { taoUrlChiaSeLsx } from '../lib/lsx-route';
import { buildProductionOrderFromSource, lsxSnapshotTuInputValue } from '../lib/lsx-build-order';
import { mapBaoGiaToLsxSources } from '../lib/bao-gia-adapter';
import { themChuKyVaoManual, layChuKyReviewerDataUrl } from '../lib/chu-ky';

type BoLoc = LsxLocalStatus | 'all';
type Nguon = 'all' | 'review';

function HuyHieuTrangThai({ trangThai }: { trangThai: LsxLocalStatus }) {
  const mau = LSX_LOCAL_STATUS_CONFIG[trangThai];
  return (
    <span className="qrev-badge" style={{ background: mau.bg, color: mau.color }}>
      <span className="qrev-badge-dot" style={{ background: mau.color }} />
      {NHAN_LSX_LOCAL_STATUS[trangThai]}
    </span>
  );
}

const CHIP_LABELS: { key: BoLoc; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
];

export default function ModuleDanhSachLSX({
  khiDieuHuong,
}: {
  khiDieuHuong?: (menuKey: string) => void;
}) {
  const accessToken = useCalculatorStore((s) => s.accessToken);
  const isAuthenticated = useCalculatorStore((s) => s.isAuthenticated);
  const nguoiDung = useCalculatorStore((s) => s.nguoiDungHienTai);
  const policies = nguoiDung?.policies ?? [];
  const laNguoiDuyet = coQuyenDuyetLsx(policies);
  const datLsxDangSua = useCalculatorStore((s) => s.datLsxDangSua);
  const materials = useCalculatorStore((s) => s.materials);
  const constants = useCalculatorStore((s) => s.constants);
  const profitTable = useCalculatorStore((s) => s.profitTable);
  const smallWidthPrices = useCalculatorStore((s) => s.smallWidthPrices);
  const currentSellerName = useCalculatorStore((s) => s.currentSellerName);

  const [danhSachQuotations, setDanhSachQuotations] = useState<QuotationPricingSheetOrdersByQuotationApi[]>([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [boLoc, setBoLoc] = useState<BoLoc>('all');
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [dangXuLyId, setDangXuLyId] = useState<string | null>(null);
  const [dangTaiXemId, setDangTaiXemId] = useState<string | null>(null);
  const [previewLsx, setPreviewLsx] = useState<{ order: any; reviewerSignatureDataUrl?: string | null } | null>(null);
  const [previewLsxPdf, setPreviewLsxPdf] = useState<{ order: any; reviewerSignatureDataUrl?: string | null } | null>(null);
  const [nhapPin, setNhapPin] = useState<{
    title: string; message: string; onConfirm: (pinToken: string) => Promise<void> | void;
  } | null>(null);
  // Bước nhập lý do trước popup PIN khi "Từ chối" (UI-only, chờ nối server sau).
  const [nhapLyDo, setNhapLyDo] = useState<{
    row: LsxRow;
  } | null>(null);
  const daTaiLanDau = useRef(false);

  const lamMoi = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setDanhSachQuotations([]);
      setLoi('Cần đăng nhập để xem danh sách LSX từ máy chủ.');
      return;
    }
    setDangTai(true);
    setLoi('');
    try {
      const data = await listQuotationPricingSheetOrdersService(accessToken);
      setDanhSachQuotations(data);
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không tải được danh sách LSX.');
      setDanhSachQuotations([]);
    } finally {
      setDangTai(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    if (daTaiLanDau.current) return;
    daTaiLanDau.current = true;
    void lamMoi();
  }, [lamMoi]);

  const allRows = useMemo(() => mapServerOrdersToLsxRows(danhSachQuotations), [danhSachQuotations]);
  const rowsLoc = useMemo(() => {
    const theoTrangThai = filterLsxByStatus(allRows, boLoc);
    return searchLsxRows(theoTrangThai, tuKhoa);
  }, [allRows, boLoc, tuKhoa]);

  // Count per chip (tren all data, truoc search)
  const demTheoChip = useMemo(() => {
    const dem: Record<BoLoc, number> = { all: allRows.length, pending: 0, approved: 0 };
    for (const r of allRows) {
      if (r.status === 'pending') dem.pending++;
      else if (r.status === 'approved') dem.approved++;
    }
    return dem;
  }, [allRows]);

  const hienThongBao = useCallback((msg: string) => {
    setThongBao(msg);
    setTimeout(() => setThongBao(''), 4000);
  }, []);

  const duyetLsx = useCallback(
    async (row: LsxRow, quyetDinh: 'approved' | 'rejected') => {
      if (!accessToken) return;
      // Từ chối: nhập lý do TRƯỚC (UI-only), rồi mới mở popup PIN.
      if (quyetDinh === 'rejected') {
        setNhapLyDo({ row });
        return;
      }
      // Duyệt VÀ Từ chối đều cần nhập mã PIN (server gắn PinGuard trên cả 2 chiều).
      setNhapPin({
        title: 'Duyệt LSX',
        message: `Bạn có chắc muốn duyệt LSX "${row.lsxNumber || row.orderId}"?`,
        onConfirm: async (pinToken: string) => {
          setDangXuLyId(row.orderId);
          setLoi('');
          try {
            await updateOrderApprovalService(
              row.orderId,
              true,
              accessToken,
              pinToken,
            );
            setNhapPin(null);
            hienThongBao('Đã duyệt LSX. Có thể in/xuất PDF/DOCX.');
            await lamMoi();
          } catch (error) {
            // Ném lại để modal PIN giữ mở + hiện lỗi (không đóng sớm).
            throw error instanceof Error
              ? error
              : new Error('Không cập nhật được trạng thái LSX.');
          } finally {
            setDangXuLyId(null);
          }
        },
      });
    },
    [accessToken, lamMoi, hienThongBao],
  );

  // Sau khi nhập lý do → mở popup PIN kèm lý do.
  const tiepTucTuChoiSauLyDo = useCallback(
    (lyDo: string) => {
      if (!nhapLyDo || !accessToken) return;
      const row = nhapLyDo.row;
      setNhapLyDo(null);
      setNhapPin({
        title: 'Từ chối LSX',
        message: `Bạn có chắc muốn từ chối LSX "${row.lsxNumber || row.orderId}"?${
          lyDo ? `\nLý do: ${lyDo}` : ''
        }`,
        onConfirm: async (pinToken: string) => {
          setDangXuLyId(row.orderId);
          setLoi('');
          try {
            await updateOrderApprovalService(
              row.orderId,
              false,
              accessToken,
              pinToken,
              lyDo,
            );
            setNhapPin(null);
            hienThongBao(
              'Đã từ chối LSX. Vẫn ở trạng thái Chờ duyệt, có thể sửa & gửi lại.',
            );
            await lamMoi();
          } catch (error) {
            throw error instanceof Error
              ? error
              : new Error('Không cập nhật được trạng thái LSX.');
          } finally {
            setDangXuLyId(null);
          }
        },
      });
    },
    [nhapLyDo, accessToken, lamMoi, hienThongBao],
  );

  // Ref để truy cập dangTaiXemId hiện tại trong callback async (không cần thêm vào deps).
  const dangTaiXemIdRef = useRef<string | null>(null);
  useEffect(() => { dangTaiXemIdRef.current = dangTaiXemId; }, [dangTaiXemId]);

  // === Preview (click row) — parity wizard: gắn chữ ký nếu BE chưa snapshot ===
  // Chờ CẢ chữ ký người lập + người duyệt load xong mới mở modal (tránh flash "chưa duyệt").
  const handleXemRow = useCallback(async (row: LsxRow) => {
    const fakeSource = mapBaoGiaToLsxSources({
      id: row.quotationId,
      pricingSheets: [row.pricingSheet as PricingSheetApi],
    } as any)[0];
    if (!fakeSource) return;
    setDangTaiXemId(row.orderId);
    setLoi('');
    try {
      const orderPreview = buildProductionOrderFromSource(fakeSource, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: [],
        preparedBy: currentSellerName,
      });
      orderPreview.id = row.orderId;
      const manualTuServer =
        row.inputValue && typeof row.inputValue === 'object'
          ? (() => {
              const { lsxSnapshot: _bo, ...phanManual } = row.inputValue as Record<string, unknown> & { lsxSnapshot?: unknown };
              return phanManual as unknown as LSXManualFields;
            })()
          : orderPreview.manual;
      const [manualCoChuKy, reviewerSignatureDataUrl] = await Promise.all([
        themChuKyVaoManual(manualTuServer),
        layChuKyReviewerDataUrl(row.approverSignatureUrl),
      ]);
      orderPreview.manual = manualCoChuKy;
      const snapshotLuu = lsxSnapshotTuInputValue(row.inputValue);
      if (snapshotLuu) orderPreview.snapshot = snapshotLuu;
      // Chỉ mở modal khi row hiện tại vẫn là row user click (tránh ghi đè LSX khác).
      setPreviewLsxPdf((prev) => {
        if (dangTaiXemIdRef.current !== row.orderId) return prev;
        return { order: orderPreview, reviewerSignatureDataUrl };
      });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lỗi preview');
    } finally {
      setDangTaiXemId((cur) => (cur === row.orderId ? null : cur));
    }
  }, [materials, constants, profitTable, smallWidthPrices, currentSellerName]);

  // === Edit (click 📝) → tab Tạo LSX, khóa KH/BG/sheet ===
  const handleEditRow = useCallback((row: LsxRow) => {
    const found = danhSachQuotations
      .flatMap((q) => q.orders.map((o) => ({ order: o, q })))
      .find((x) => x.order.id === row.orderId);
    if (!found) return;
    datLsxDangSua({ order: found.order, quotation: found.q });
    khiDieuHuong?.('tao-lsx');
  }, [danhSachQuotations, datLsxDangSua, khiDieuHuong]);

  return (
    <div className="qrev-root">
      <QrevStyleInjector />

      <header className="qrev-header">
        <div className="qrev-header-left">
          <h1 className="qrev-title">
            Danh sách LSX
            <span className="qrev-title-count"> ({rowsLoc.length})</span>
          </h1>
        </div>
        <div className="qrev-header-right">
          <button
            className="qrev-btn qrev-btn--ghost"
            onClick={() => void lamMoi()}
            disabled={dangTai}
          >
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </header>

      <div className="qrev-search-bar">
        <Search size={16} className="qrev-search-icon" />
        <input
          className="qrev-search-input"
          aria-label="Tìm kiếm LSX"
          placeholder="Tìm số LSX, khách hàng, sản phẩm, mã BG..."
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
        {tuKhoa && (
          <button
            className="qrev-btn-icon qrev-search-clear"
            aria-label="Xóa"
            onClick={() => setTuKhoa('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="qrev-chips">
        {CHIP_LABELS.map((chip) => (
          <button
            key={chip.key}
            className={
              boLoc === chip.key
                ? 'qrev-chip qrev-chip--active'
                : 'qrev-chip'
            }
            onClick={() => setBoLoc(chip.key)}
          >
            {chip.label}{' '}
            <span className="qrev-chip-count">{demTheoChip[chip.key]}</span>
          </button>
        ))}
        {laNguoiDuyet && (
          <button
            className={
              boLoc === 'pending'
                ? 'qrev-chip qrev-chip--active qrev-chip--review'
                : 'qrev-chip qrev-chip--review'
            }
            onClick={() => setBoLoc('pending')}
            title="Chỉ hiện các LSX đang chờ tôi duyệt"
          >
            <Inbox size={12} /> Chờ tôi duyệt
          </button>
        )}
      </div>

      {thongBao && <div className="qrev-alert qrev-alert--ok">{thongBao}</div>}
      {loi && <div className="qrev-alert qrev-alert--err">{loi}</div>}

      <div className="qrev-table-shell">
        {dangTai ? (
          <div className="qrev-empty">
            <Loader2 size={32} className="um-spin" />
            <p>Đang tải LSX...</p>
          </div>
        ) : rowsLoc.length === 0 ? (
          <div className="qrev-empty">
            <Inbox size={40} />
            <p>Chưa có LSX nào.</p>
            <span>Tạo LSX ở mục &ldquo;Tạo lệnh sản xuất&rdquo; trước.</span>
          </div>
        ) : (
          <div className="qrev-table-wrap">
            <table className="qrev-table">
              <thead>
                <tr>
                  <th>Số LSX</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                  <th>Duyệt</th>
                </tr>
              </thead>
              <tbody>
                {rowsLoc.map((row) => {
                  const isProcessing = dangXuLyId === row.orderId;
                  const isLoadingView = dangTaiXemId === row.orderId;
                  return (
                    <tr
                      key={row.orderId}
                      className="qrev-row"
                      onClick={() => !isLoadingView && handleXemRow(row)}
                      style={{ cursor: isLoadingView ? 'wait' : 'pointer', opacity: isLoadingView ? 0.6 : 1 }}
                    >
                      <td>
                        <div className="qrev-cell-quote-text">
                          <span className="qrev-cell-name" style={{ fontFamily: 'monospace' }}>
                            {row.lsxNumber || row.orderId}
                          </span>
                          <span className="qrev-cell-sub" style={{ fontSize: '0.7rem' }}>
                            {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </td>
                      <td className="qrev-cell-sale">{row.customerName}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.productName}</div>
                        {row.structure && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{row.structure}</div>
                        )}
                      </td>
                      <td className="qrev-cell-date">
                        {new Date(row.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <HuyHieuTrangThai trangThai={row.status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="qrev-row-actions">
                          <button
                            className="qrev-btn-icon"
                            title="Xem LSX"
                            disabled={isLoadingView}
                            onClick={() => handleXemRow(row)}
                          >
                            {isLoadingView ? <Loader2 size={15} className="um-spin" /> : <Eye size={15} />}
                          </button>
                          <NutSaoChepLienKet
                            url={taoUrlChiaSeLsx(row.orderId)}
                            variant="qrev"
                            size={15}
                          />
                          <button
                            className="qrev-btn-icon"
                            title="Sửa LSX"
                            onClick={() => handleEditRow(row)}
                          >
                            <FileEdit size={15} />
                          </button>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {row.status === 'pending' && laNguoiDuyet && !row.reason && (
                          <div className="qrev-row-actions">
                            <button
                              className="qrev-btn-icon qrev-btn-icon--ok"
                              title="Duyệt"
                              disabled={isProcessing}
                              onClick={() => void duyetLsx(row, 'approved')}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              className="qrev-btn-icon qrev-btn-icon--danger"
                              title="Từ chối"
                              disabled={isProcessing}
                              onClick={() => void duyetLsx(row, 'rejected')}
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        )}
                        {row.status === 'pending' && laNguoiDuyet && row.reason && (
                          <div className="qrev-row-actions">
                            <span
                              className="qrev-rejected-badge"
                              title={`Đã từ chối · Lý do: ${row.reason}`}
                            >
                              <XCircle size={15} style={{ color: '#dc2626' }} />
                            </span>
                            <button
                              className="qrev-btn-icon qrev-btn-icon--ok"
                              title="Duyệt lại"
                              disabled={isProcessing}
                              onClick={() => void duyetLsx(row, 'approved')}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          </div>
                        )}
                        {!laNguoiDuyet && row.reason && (
                          <span
                            className="qrev-rejected-badge"
                            title={`Đã từ chối · Lý do: ${row.reason}`}
                          >
                            <XCircle size={15} style={{ color: '#dc2626' }} />
                          </span>
                        )}
                        {row.status === 'approved' && (
                          <span title="Đã duyệt">
                            <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="qrev-table-bottom-spacer" aria-hidden="true" />
          </div>
        )}
      </div>

      {previewLsx && (
        <LsxPreviewModal
          open={!!previewLsx}
          onClose={() => setPreviewLsx(null)}
          order={previewLsx.order}
        />
      )}
      {previewLsxPdf && (
        <LsxPdfPreviewModal
          open={!!previewLsxPdf}
          onClose={() => setPreviewLsxPdf(null)}
          order={previewLsxPdf.order}
          reviewerSignatureDataUrl={previewLsxPdf.reviewerSignatureDataUrl}
        />
      )}

      <NhapLyDoTruocPinModal
        open={!!nhapLyDo}
        title="Từ chối LSX"
        message={nhapLyDo ? `Bạn có chắc muốn từ chối LSX "${nhapLyDo.row.lsxNumber || nhapLyDo.row.orderId}"?` : ""}
        confirmLabel="Tiếp tục"
        batBuoc
        onConfirm={tiepTucTuChoiSauLyDo}
        onClose={() => setNhapLyDo(null)}
      />

      <NhapPinDuyetModal
        open={!!nhapPin}
        title={nhapPin?.title || ''}
        message={nhapPin?.message || ''}
        onConfirm={async (pinToken: string) => {
          if (!nhapPin) return;
          await nhapPin.onConfirm(pinToken);
        }}
        onClose={() => setNhapPin(null)}
      />
    </div>
  );
}
