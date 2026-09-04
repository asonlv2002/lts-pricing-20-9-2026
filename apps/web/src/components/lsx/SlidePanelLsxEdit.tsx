"use client";
// src/components/lsx/SlidePanelLsxEdit.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Slide-in panel (từ phải) để SỬA LSX từ danh sách. Form prefill từ inputValue
// server. 3 nút góc phải: Review PDF, Review DOCX, Cập nhật.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { X, FileDown, FileText, Save, Loader2, Lock } from 'lucide-react';
import {
  updateQuotationPricingSheetOrderService,
  type QuotationPricingSheetOrderApi,
  type PricingSheetApi,
} from '../../lib/api/service-lts';
import { useCalculatorStore } from '../../store/CuaHangTinhGia';
import type { LsxSourceData, LSXManualFields } from '../../lib/types';
import { mapBaoGiaToLsxSources, laBaoGiaDaDuyet } from '../../lib/bao-gia-adapter';
import { LsxFormFields } from './LsxFormFields';
import LsxPreviewModal from '../LsxPreviewModal';
import LsxPdfPreviewModal from '../LsxPdfPreviewModal';
import { buildProductionOrderFromSource, buildSnapshotFromSource, ganLsxSnapshotVaoInputValue, lsxSnapshotTuInputValue } from '../../lib/lsx-build-order';
import { themChuKyVaoManual, layChuKyReviewerDataUrl } from '../../lib/chu-ky';

export interface SlidePanelLsxEditProps {
  order: QuotationPricingSheetOrderApi;
  // Full quotation de lay customer info, pricing sheet, etc.
  // Phai co pricingSheets chua order.pricingSheetId.
  quotation: {
    id: string;
    description?: string | null;
    customerId?: string | null;
    pricingSheets?: PricingSheetApi[];
    updateStatus?: string | null;
    reviewerSignatureUrl?: string | null;
  } | null;
  onClose: () => void;
  onSaved?: () => void;
}

function defaultManual(): LSXManualFields {
  // Fallback khi inputValue rong (LSX moi tao chua co form)
  return {
    lsxNumber: '',
    issuedDate: '',
    preparedBy: '',
    approvedBy: '',
    deliveryDate: '',
    notes: '',
    msp: '',
    tenSP: '',
    maMucNhu: '',
    quyCachNote: '',
    quyCachCuon: '',
    chieuRaCuonSP: '',
    soLuongDHNote: '',
    printFilmName: '',
    printWastePercent: 0,
    printProductQty: 0,
    numCylinders: 0,
    cylDiameter: 0,
    cylWidth: 0,
    rollOutWidth: 0,
    materialQtySupplied: 0,
    printNotes: '',
    cylInfo: '',
    printDirection: '',
    printMST: '',
    printProductUnit: '',
    divideWidth: 0,
    rollLength: 0,
    divideRollOutWidth: 0,
    divideDeliveryReq: '',
    divideNotes: '',
    laminateFilm1: '',
    laminateFilm1Width: 0,
    lamWaste: 0,
    lamProductQty: 0,
    lamBTP: 0,
    laminateFilm2: '',
    laminateNotes: '',
    lamMaterialSupplyQty: '',
    lamProductUnit: '',
    lamBTPNote: '',
    packagingInfo: '',
    packagingNotes: '',
    deliveryNotes: '',
    sealEdge: '',
    foldBottom: '',
    tearNotch: '',
    hanTruoc: 0,
    hanSau: 0,
    hanBien: 0,
    hanDau: 0,
    hanDay: 0,
    xepHong: 0,
    holePunchInfo: '',
    ventHoleInfo: '',
    bagWasteMeters: 0,
    bagLuuY: '',
    useSemicircularMold: false,
    useDualCutter: false,
    bagMachineWaste: 0,
    bagDeliveryReq: '',
    bagMachineNotes: '',
    tamZipperCachMieng: 0,
    loTreoInfo: '',
    danLung: 0,
    danLungLech: 0,
    danDay: 0,
    nap: 0,
    songSieuAm: 0,
    docQuaiXach: false,
    danKeoNap: false,
    inDesc: '',
    lamDesc: '',
    divideDesc: '',
    bagDesc: '',
  };
}

export function SlidePanelLsxEdit({ order, quotation, onClose, onSaved }: SlidePanelLsxEditProps) {
  const {
    accessToken,
    materials, constants, profitTable, smallWidthPrices, currentSellerName,
  } = useCalculatorStore();

  const [manual, setManual] = useState<LSXManualFields>(() => {
    if (order.inputValue && typeof order.inputValue === 'object') {
      const { lsxSnapshot: _bo, ...manualTuServer } = order.inputValue as Record<string, unknown> & { lsxSnapshot?: unknown };
      return { ...defaultManual(), ...(manualTuServer as Partial<LSXManualFields>) };
    }
    return defaultManual();
  });
  const [dangXuLy, setDangXuLy] = useState(false);
  const [dangXem, setDangXem] = useState(false);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewLsx, setPreviewLsx] = useState<{ order: any; reviewerSignatureDataUrl?: string | null } | null>(null);
  const [previewLsxPdf, setPreviewLsxPdf] = useState<{ order: any; reviewerSignatureDataUrl?: string | null } | null>(null);

  // Build LsxSourceData tu pricing sheet
  const source = useMemo<LsxSourceData | null>(() => {
    if (!quotation || !order.pricingSheet) return null;
    const sources = mapBaoGiaToLsxSources(quotation as any);
    const matched = sources.find((s) => s.id.endsWith(`:${order.pricingSheetId}`));
    if (matched) return matched;
    // Fallback: build mot source minimal
    const sheet = order.pricingSheet;
    const input = (typeof sheet.inputValue === 'object' && sheet.inputValue !== null
      ? sheet.inputValue
      : {}) as Record<string, unknown>;
    return {
      id: `${quotation.id}:${order.pricingSheetId}`,
      customer: sheet.customer?.codeName || sheet.customerCodeName || '—',
      productName: sheet.pricingSheetName || (typeof input.productName === 'string' ? input.productName : '—'),
      structure: typeof input.structure === 'string' ? input.structure : '',
      finalPrice: 0,
      input: input as any,
    };
  }, [quotation, order.pricingSheetId, order.pricingSheet]);

  async function handleXemPdf() {
    if (!source) return;
    setDangXem(true);
    setLoi('');
    try {
      const orderPreview = buildProductionOrderFromSource(source, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: [],
        preparedBy: currentSellerName,
      });
      orderPreview.id = order.id;
      const [manualCoChuKy, reviewerSignatureDataUrl] = await Promise.all([
        themChuKyVaoManual(manual),
        layChuKyReviewerDataUrl(order.original?.approverSignatureUrl),
      ]);
      orderPreview.manual = manualCoChuKy;
      setPreviewLsxPdf({ order: orderPreview, reviewerSignatureDataUrl });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lỗi tạo preview');
    } finally {
      setDangXem(false);
    }
  }

  async function handleXemDocx() {
    if (!source) return;
    setDangXem(true);
    setLoi('');
    try {
      const orderPreview = buildProductionOrderFromSource(source, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: [],
        preparedBy: currentSellerName,
      });
      orderPreview.id = order.id;
      const [manualCoChuKy, reviewerSignatureDataUrl] = await Promise.all([
        themChuKyVaoManual(manual),
        layChuKyReviewerDataUrl(order.original?.approverSignatureUrl),
      ]);
      orderPreview.manual = manualCoChuKy;
      setPreviewLsx({ order: orderPreview, reviewerSignatureDataUrl });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lỗi tạo preview');
    } finally {
      setDangXem(false);
    }
  }

  async function handleCapNhat() {
    if (!accessToken) return;
    setDangXuLy(true);
    setLoi('');
    try {
      const manualCoChuKy = await themChuKyVaoManual(manual);
      const snapshot = source
        ? buildSnapshotFromSource(source, manualCoChuKy, materials)
        : lsxSnapshotTuInputValue(order.inputValue);
      const inputValueCoSnapshot = snapshot
        ? ganLsxSnapshotVaoInputValue(manualCoChuKy, snapshot)
        : manualCoChuKy;
      await updateQuotationPricingSheetOrderService(order.id, { inputValue: inputValueCoSnapshot }, accessToken);
      setThongBao('Đã cập nhật LSX. Trạng thái reset về Chờ duyệt, cần duyệt lại.');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1200);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setDangXuLy(false);
      setConfirmOpen(false);
    }
  }

  const tenSP = manual.tenSP || (source?.productName ?? '—');
  const isApproved = order.hasAdvisorApproved;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }}
      />
      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sửa LSX ${manual.lsxNumber || order.id}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(75%, 900px)',
          background: 'var(--surface, #fff)',
          borderLeft: '1px solid var(--border)',
          zIndex: 100,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2, #f8f9fb)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 2 }}>SỬA LỆNH SẢN XUẤT</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {manual.lsxNumber || order.id}
              {isApproved && <span style={{ marginLeft: 8, color: '#047857', fontSize: '0.74rem' }}>● Đã duyệt</span>}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>
              {tenSP} · BG-{quotation?.id.slice(0, 8) ?? '?'} · Server ID: <code>{order.id.slice(0, 12)}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Alerts */}
        {thongBao && (
          <div className="qrev-alert qrev-alert--ok" style={{ margin: '8px 16px 0' }}>
            {thongBao}
          </div>
        )}
        {loi && (
          <div className="qrev-alert qrev-alert--err" style={{ margin: '8px 16px 0' }}>
            {loi}
          </div>
        )}

        {/* Body scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {/* Section 1+2 read-only */}
          <details open style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', background: 'var(--surface2, #f8f9fb)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
              <Lock size={11} style={{ display: 'inline', marginRight: 4 }} />
              Thông tin báo giá (read-only)
            </summary>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--muted)' }}>
              BG: {quotation?.description || quotation?.id || '—'}<br />
              Customer: {source?.customer || '—'}<br />
              Sản phẩm: {source?.productName || '—'}<br />
              Cấu trúc: {source?.structure || '—'}
            </div>
          </details>

          {/* Section 3: Form (editable) */}
          {source ? (
            <LsxFormFields source={source} value={manual} onChange={setManual} />
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              Không tìm thấy thông tin báo giá để hiển thị form.
            </div>
          )}
        </div>

        {/* Footer: 3 nút góc phải */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--surface2, #f8f9fb)', flexShrink: 0,
        }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={dangXuLy}
            style={{ fontSize: '0.84rem' }}
          >
            Hủy
          </button>
          <button
            className="btn btn-outline"
            onClick={handleXemPdf}
            disabled={!source || dangXuLy || dangXem}
            style={{ fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="Review PDF (không lưu server)"
          >
            {dangXem ? <Loader2 size={13} className="spin" /> : <FileDown size={13} />} Review PDF
          </button>
          <button
            className="btn btn-outline"
            onClick={handleXemDocx}
            disabled={!source || dangXuLy || dangXem}
            style={{ fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="Review DOCX (không lưu server)"
          >
            {dangXem ? <Loader2 size={13} className="spin" /> : <FileText size={13} />} Review DOCX
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!accessToken || dangXuLy}
            style={{ fontSize: '0.84rem', background: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {dangXuLy ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
            Cập nhật
          </button>
        </div>
      </div>

      {/* Confirm dialog (Q29=a) */}
      {confirmOpen && (
        <div className="lts-confirm-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="lts-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lts-confirm-icon">💾</div>
            <h3 className="lts-confirm-title">Cập nhật LSX?</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
              LSX sẽ được cập nhật lên máy chủ.<br />
              <b>Trạng thái sẽ reset về &ldquo;Chờ duyệt&rdquo;</b> và cần cố vấn duyệt lại.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setConfirmOpen(false)}>Hủy</button>
              <button
                className="btn btn-primary"
                style={{ background: '#059669', color: '#fff' }}
                onClick={() => void handleCapNhat()}
                disabled={dangXuLy}
              >
                {dangXuLy ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                Xác nhận cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modals */}
      {previewLsx && (
        <LsxPreviewModal
          open={!!previewLsx}
          onClose={() => setPreviewLsx(null)}
          order={previewLsx.order}
          reviewerSignatureDataUrl={previewLsx.reviewerSignatureDataUrl}
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
    </>
  );
}

export default SlidePanelLsxEdit;
