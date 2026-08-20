"use client";
// src/components/wizard/TaoLsxWizard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard tạo / cập nhật LSX: 3 sections + header.
// Mode tạo tay: POST create-orders + PATCH inputValue.
// Mode tạo từ sheet (lsxTaoTuSheet): prefill + khóa KH/BG/sheet, POST+PATCH.
// Mode sửa (lsxDangSua): khóa KH/BG/sheet, PATCH order hiện có.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { FileDown, FileText, Plus, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import {
  createQuotationPricingSheetOrdersService,
  listQuotationPricingSheetOrdersService,
  updateQuotationPricingSheetOrderService,
  type PricingSheetApi,
  type BaoGiaApi,
} from '../../lib/api/service-lts';
import { useCalculatorStore } from '../../store/CuaHangTinhGia';
import type { LsxSourceData, LSXManualFields } from '../../lib/types';
import { mapBaoGiaToLsxSources } from '../../lib/bao-gia-adapter';
import { classifyLsxBagType } from '../../lib/lsx-bag-classification';
import { themChuKyVaoManual } from '../../lib/chu-ky';
import { buildManualFromSource, buildProductionOrderFromSource } from '../../lib/lsx-build-order';
import { mapServerOrdersToLsxRows } from '../../lib/lsx-server-adapter';
import { LsxFormFields } from '../lsx/LsxFormFields';
import LsxPreviewModal from '../LsxPreviewModal';
import LsxPdfPreviewModal from '../LsxPdfPreviewModal';
import BaoGiaPreviewModal from '../BaoGiaPreviewModal';
import ConfirmDialog from '../ConfirmDialog';
import { buildHistoryItemFromServerData } from '../../lib/baoGiaExport';
import type { HistoryItem } from '../../lib/types';
import { WIZARD_STYLES } from './wizard-styles';
import { BuocChonKhachHang } from './BuocChonKhachHang';
import { BuocChonBaoGiaVaTinhGia } from './BuocChonBaoGiaVaTinhGia';

interface CustomerLite {
  id: string;
  customerCode?: string;
  companyName?: string;
}

type Toast =
  | { kind: 'ok'; msg: string }
  | { kind: 'err'; msg: string }
  | null;

export interface TaoLsxWizardProps {
  onSuccessNavigate?: (menuKey: string) => void;
}

function buildSourceFromEdit(
  quotationId: string,
  sheet: PricingSheetApi | undefined,
  pricingSheetId: string,
  quotation: { description?: string | null; inputValue?: unknown },
): LsxSourceData | null {
  if (!sheet && !pricingSheetId) return null;
  const asBg = {
    id: quotationId,
    description: quotation.description,
    inputValue: quotation.inputValue,
    pricingSheets: sheet ? [sheet] : [],
  } as BaoGiaApi;
  const sources = mapBaoGiaToLsxSources(asBg);
  const matched = sources.find((s) => s.id.endsWith(`:${pricingSheetId}`)) ?? sources[0];
  if (matched) return matched;
  if (!sheet) return null;
  const input = (typeof sheet.inputValue === 'object' && sheet.inputValue !== null
    ? sheet.inputValue
    : {}) as Record<string, unknown>;
  return {
    id: `${quotationId}:${pricingSheetId}`,
    customer: sheet.customer?.codeName || sheet.customerCodeName || '—',
    productName: sheet.pricingSheetName || (typeof input.productName === 'string' ? input.productName : '—'),
    structure: typeof input.structure === 'string' ? input.structure : '',
    finalPrice: 0,
    input: input as any,
  };
}

function customerFromSheet(sheet: PricingSheetApi | undefined, customerId: string): CustomerLite {
  const input = (typeof sheet?.inputValue === 'object' && sheet?.inputValue !== null
    ? sheet.inputValue
    : {}) as Record<string, unknown>;
  const companyName =
    (typeof input.customer === 'string' && input.customer)
    || sheet?.customer?.codeName
    || sheet?.customerCodeName
    || '—';
  return {
    id: customerId || companyName,
    customerCode: sheet?.customerCodeName || sheet?.customer?.codeName || undefined,
    companyName,
  };
}

/** Danh sách số LSX server (để gen YYMM.STT). Lỗi / chưa login → []. */
async function taiDanhSachSoLsx(accessToken: string | null | undefined): Promise<string[]> {
  if (!accessToken) return [];
  try {
    const data = await listQuotationPricingSheetOrdersService(accessToken);
    return mapServerOrdersToLsxRows(data)
      .map((r) => r.lsxNumber)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function TaoLsxWizard({ onSuccessNavigate }: TaoLsxWizardProps) {
  const {
    accessToken,
    materials, constants, profitTable, smallWidthPrices, currentSellerName,
    lsxDangSua, datLsxDangSua,
    lsxTaoTuSheet, datLsxTaoTuSheet,
  } = useCalculatorStore();

  const dangSua = !!lsxDangSua;
  const dangPrefillTuSheet = !!lsxTaoTuSheet;
  const khoaKhBgSheet = dangSua || dangPrefillTuSheet;
  const editOrderId = lsxDangSua?.order.id ?? null;
  const daHydrateSua = useRef<string | null>(null);
  const daHydrateTao = useRef<string | null>(null);

  const [khachHang, setKhachHang] = useState<CustomerLite | null>(null);
  const [bgDangChon, setBgDangChon] = useState<BaoGiaApi | null>(null);
  const [sheetDangChon, setSheetDangChon] = useState<PricingSheetApi | null>(null);
  const [manual, setManual] = useState<LSXManualFields | null>(null);
  const [source, setSource] = useState<LsxSourceData | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [modalSuccess, setModalSuccess] = useState<{ lsxNumber: string; quotationId: string } | null>(null);
  const [confirmCapNhat, setConfirmCapNhat] = useState(false);

  const [previewLsx, setPreviewLsx] = useState<{ order: any } | null>(null);
  const [previewLsxPdf, setPreviewLsxPdf] = useState<{ order: any } | null>(null);
  const [previewBg, setPreviewBg] = useState<{ item: any; customerInfo?: any } | null>(null);

  // Hydrate mode sửa từ store (1 lần / orderId)
  useEffect(() => {
    if (!lsxDangSua) {
      daHydrateSua.current = null;
      return;
    }
    if (daHydrateSua.current === lsxDangSua.order.id) return;
    daHydrateSua.current = lsxDangSua.order.id;
    daHydrateTao.current = null;

    const { order, quotation } = lsxDangSua;
    const sheet = order.pricingSheet ?? undefined;
    const kh = customerFromSheet(sheet, quotation.customerId);
    setKhachHang(kh);

    const bgSynthetic = {
      id: quotation.id,
      description: quotation.description,
      inputValue: quotation.inputValue,
      updateStatus: quotation.updateStatus,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      pricingSheets: sheet ? [sheet] : [],
      quotationName: quotation.description || `BG-${quotation.id.slice(0, 8)}`,
    } as BaoGiaApi;
    setBgDangChon(bgSynthetic);
    if (sheet) setSheetDangChon(sheet as PricingSheetApi);

    const sheetVal: PricingSheetApi | null = sheet || null;
    const src = buildSourceFromEdit(quotation.id, sheetVal ?? undefined, order.pricingSheetId, quotation);
    setSource(src);

    if (order.inputValue && typeof order.inputValue === 'object') {
      setManual({ ...(order.inputValue as LSXManualFields) });
    } else if (src) {
      const bagType = classifyLsxBagType(src.input.bagType, src.input.hasZipper);
      let cancelled = false;
      void (async () => {
        const soLsx = await taiDanhSachSoLsx(accessToken);
        if (cancelled) return;
        setManual(buildManualFromSource(src, {
          materials, constants, profitTable, smallWidthPrices,
          productionOrders: soLsx as any,
          preparedBy: currentSellerName,
        }, bagType));
      })();
      return () => { cancelled = true; };
    }
  }, [lsxDangSua, materials, constants, profitTable, smallWidthPrices, currentSellerName, accessToken]);

  // Hydrate tạo LSX từ DS báo giá (1 lần / bgId:sheetId)
  useEffect(() => {
    if (!lsxTaoTuSheet) {
      daHydrateTao.current = null;
      return;
    }
    if (lsxDangSua) return;
    const key = `${lsxTaoTuSheet.baoGia.id}:${lsxTaoTuSheet.sheet.id}`;
    if (daHydrateTao.current === key) return;
    daHydrateTao.current = key;
    daHydrateSua.current = null;

    const { baoGia, sheet } = lsxTaoTuSheet;
    const input = (typeof sheet.inputValue === 'object' && sheet.inputValue !== null
      ? sheet.inputValue
      : {}) as Record<string, unknown>;
    const companyName =
      (typeof input.customer === 'string' && input.customer)
      || sheet.customer?.codeName
      || sheet.customerCodeName
      || '—';
    setKhachHang({
      id: companyName,
      customerCode: sheet.customerCodeName || sheet.customer?.codeName || undefined,
      companyName,
    });
    setBgDangChon(baoGia);
    setSheetDangChon(sheet);

    const sources = mapBaoGiaToLsxSources(baoGia);
    const matched = sources.find((s) => s.id.endsWith(`:${sheet.id}`)) ?? sources[0];
    if (!matched) return;
    setSource(matched);
    const bagType = classifyLsxBagType(matched.input.bagType, matched.input.hasZipper);
    let cancelled = false;
    void (async () => {
      const soLsx = await taiDanhSachSoLsx(accessToken);
      if (cancelled) return;
      setManual(buildManualFromSource(matched, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: soLsx as any,
        preparedBy: currentSellerName,
      }, bagType));
    })();
    return () => { cancelled = true; };
  }, [lsxTaoTuSheet, lsxDangSua, materials, constants, profitTable, smallWidthPrices, currentSellerName, accessToken]);

  // Mode tạo tay: khi sheet đổi → build source + manual (không ghi đè khi sửa / prefill)
  useEffect(() => {
    if (dangSua || dangPrefillTuSheet) return;
    if (!bgDangChon || !sheetDangChon) {
      setSource(null);
      setManual(null);
      return;
    }
    const sources = mapBaoGiaToLsxSources(bgDangChon);
    const matched = sources.find((s) => s.id.endsWith(`:${sheetDangChon.id}`)) ?? sources[0];
    if (!matched) return;
    setSource(matched);

    const bagType = classifyLsxBagType(matched.input.bagType, matched.input.hasZipper);
    let cancelled = false;
    void (async () => {
      const soLsx = await taiDanhSachSoLsx(accessToken);
      if (cancelled) return;
      setManual(buildManualFromSource(matched, {
        materials,
        constants,
        profitTable,
        smallWidthPrices,
        productionOrders: soLsx as any,
        preparedBy: currentSellerName,
      }, bagType));
    })();
    return () => { cancelled = true; };
  }, [dangSua, dangPrefillTuSheet, bgDangChon, sheetDangChon, materials, constants, profitTable, smallWidthPrices, currentSellerName, accessToken]);

  const coTheTao = !!(khachHang && bgDangChon && sheetDangChon && manual && source);
  const coTheXem = !!(source && manual);

  async function handleTaoLsx() {
    if (!coTheTao || !accessToken || !source || !manual || !bgDangChon || !sheetDangChon) return;
    if (!source.customer?.trim()) {
      setToast({ kind: 'err', msg: 'Vui lòng có Khách hàng trước khi tạo LSX.' });
      return;
    }
    if (!manual.tenSP?.trim() && !source.productName?.trim()) {
      setToast({ kind: 'err', msg: 'Vui lòng nhập Tên sản phẩm.' });
      return;
    }
    setDangXuLy(true);
    setToast(null);
    try {
      const createRes = await createQuotationPricingSheetOrdersService(bgDangChon.id, accessToken);
      const newOrder = createRes.orders
        .filter((o) => o.pricingSheetId === sheetDangChon.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (!newOrder) throw new Error('Server không trả về order mới');
      const finalManual: LSXManualFields = {
        ...manual,
        msp: manual.msp?.trim() || (newOrder.id),
        tenSP: manual.tenSP?.trim() || source.productName || '',
      };
      const finalManualCoChuKy = await themChuKyVaoManual(finalManual);
      await updateQuotationPricingSheetOrderService(newOrder.id, { inputValue: finalManualCoChuKy }, accessToken);
      datLsxTaoTuSheet(null);
      daHydrateTao.current = null;
      setToast({ kind: 'ok', msg: `Đã tạo LSX ${finalManual.lsxNumber || newOrder.id} thành công` });
      setModalSuccess({ lsxNumber: finalManual.lsxNumber || newOrder.id, quotationId: bgDangChon.id });
    } catch (e) {
      setToast({ kind: 'err', msg: e instanceof Error ? e.message : 'Lỗi tạo LSX' });
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleCapNhat() {
    if (!editOrderId || !accessToken || !manual || !source) return;
    setDangXuLy(true);
    setToast(null);
    setConfirmCapNhat(false);
    try {
      const finalManual: LSXManualFields = {
        ...manual,
        tenSP: manual.tenSP?.trim() || source.productName || '',
      };
      const finalManualCoChuKy = await themChuKyVaoManual(finalManual);
      await updateQuotationPricingSheetOrderService(editOrderId, { inputValue: finalManualCoChuKy }, accessToken);
      setToast({ kind: 'ok', msg: 'Đã cập nhật LSX. Trạng thái reset về Chờ duyệt.' });
      datLsxDangSua(null);
      setTimeout(() => onSuccessNavigate?.('danh-sach-lsx'), 600);
    } catch (e) {
      setToast({ kind: 'err', msg: e instanceof Error ? e.message : 'Lỗi cập nhật' });
    } finally {
      setDangXuLy(false);
    }
  }

  function handleReset() {
    datLsxDangSua(null);
    datLsxTaoTuSheet(null);
    daHydrateSua.current = null;
    daHydrateTao.current = null;
    setKhachHang(null);
    setBgDangChon(null);
    setSheetDangChon(null);
    setManual(null);
    setSource(null);
    setToast(null);
    setModalSuccess(null);
  }

  function handleQuayLaiDanhSach() {
    datLsxDangSua(null);
    datLsxTaoTuSheet(null);
    daHydrateSua.current = null;
    daHydrateTao.current = null;
    onSuccessNavigate?.('danh-sach-lsx');
  }

  async function handleXemPdf() {
    if (!source || !manual) return;
    try {
      const order = buildProductionOrderFromSource(source, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: [],
        preparedBy: currentSellerName,
      });
      order.manual = await themChuKyVaoManual(manual);
      if (editOrderId) order.id = editOrderId;
      setPreviewLsxPdf({ order });
    } catch (e) {
      setToast({ kind: 'err', msg: e instanceof Error ? e.message : 'Lỗi tạo preview' });
    }
  }

  async function handleXemDocx() {
    if (!source || !manual) return;
    try {
      const order = buildProductionOrderFromSource(source, {
        materials, constants, profitTable, smallWidthPrices,
        productionOrders: [],
        preparedBy: currentSellerName,
      });
      order.manual = await themChuKyVaoManual(manual);
      if (editOrderId) order.id = editOrderId;
      setPreviewLsx({ order });
    } catch (e) {
      setToast({ kind: 'err', msg: e instanceof Error ? e.message : 'Lỗi tạo preview' });
    }
  }

  function handleXemBg() {
    if (!bgDangChon) return;
    const item = buildHistoryItemFromServerData(bgDangChon as any) as HistoryItem;
    let customerInfo: {
      address?: string;
      taxCode?: string;
      phone?: string;
      fax?: string;
      description?: string;
    } = {};
    try {
      const customers = JSON.parse(
        window.localStorage.getItem('lts_customers') || '[]',
      ) as Array<{
        companyName?: string;
        customerCode?: string;
        address?: string;
        invoiceAddress?: string;
        taxCode?: string;
        phone?: string;
      }>;
      const customerName = item.customer || '';
      const c = customers.find(
        (kh) => kh.companyName === customerName || kh.customerCode === customerName,
      );
      if (c) {
        customerInfo = {
          address: c.address || c.invoiceAddress || '',
          taxCode: c.taxCode || '',
          phone: c.phone || '',
        };
      }
    } catch {
      /* ignore */
    }
    setPreviewBg({ item, customerInfo });
  }

  const subtitle = dangSua
    ? 'Đang chỉnh sửa — KH / BG / sheet đã khóa'
    : dangPrefillTuSheet
    ? 'Tạo từ báo giá — KH / BG / sheet đã khóa'
    : !khachHang ? 'Bước 1/3: Chọn khách hàng'
    : !sheetDangChon ? 'Bước 2/3: Chọn báo giá & tính giá'
    : 'Bước 3/3: Nhập form lệnh sản xuất';

  const primaryDisabled = dangSua
    ? (!coTheXem || dangXuLy)
    : (!coTheTao || dangXuLy);

  return (
    <div
      className="crm-root quote-wizard-root"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <style>{WIZARD_STYLES}</style>

      <div className="sp-sticky-header quote-wizard-header">
        <div className="quote-wizard-header-title">
          <div className="quote-wizard-title-stack">
            <h2 className="quote-wizard-title">
              {dangSua ? 'Cập nhật lệnh sản xuất' : 'Tạo lệnh sản xuất'}
            </h2>
            <div className="quote-wizard-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="quote-wizard-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={handleXemPdf}
            disabled={!coTheXem || dangXuLy}
            title="Xem PDF"
          >
            <FileDown size={14} /> Xem PDF
          </button>
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={handleXemDocx}
            disabled={!coTheXem || dangXuLy}
            title="Xem DOCX"
          >
            <FileText size={14} /> Xem DOCX
          </button>
          {dangSua ? (
            <button
              className="wiz-btn wiz-btn--ghost"
              onClick={handleQuayLaiDanhSach}
              title="Quay lại danh sách"
            >
              <ArrowLeft size={14} /> Danh sách
            </button>
          ) : (
            <button
              className="wiz-btn wiz-btn--secondary"
              onClick={handleReset}
              style={{ color: '#dc2626' }}
              title="Bắt đầu lại từ đầu"
            >
              <Plus size={14} /> Tạo mới
            </button>
          )}
          <button
            className="wiz-btn wiz-btn--primary"
            onClick={() => (dangSua ? setConfirmCapNhat(true) : void handleTaoLsx())}
            disabled={primaryDisabled}
            style={{
              background: !primaryDisabled ? '#059669' : 'var(--accent, #0891b2)',
              color: '#fff',
              opacity: dangXuLy ? 0.6 : 1,
            }}
          >
            {dangXuLy ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
            {dangSua ? 'Cập nhật' : 'Tạo LSX'}
          </button>
        </div>
      </div>

      {dangSua && (
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2, #f8f9fb)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <FileText size={16} style={{ color: 'var(--accent, #0891b2)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Đang chỉnh sửa LSX</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>
              Không thể đổi khách hàng / báo giá / sheet. Cập nhật sẽ reset trạng thái về Chờ duyệt.
            </div>
          </div>
          <button className="wiz-btn wiz-btn--ghost" onClick={handleQuayLaiDanhSach}>
            <ArrowLeft size={14} /> Danh sách LSX
          </button>
        </div>
      )}

      {dangPrefillTuSheet && !dangSua && (
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2, #f8f9fb)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <FileText size={16} style={{ color: 'var(--accent, #0891b2)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tạo LSX từ báo giá</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>
              KH / BG / sheet đã khóa. Điền form rồi bấm Tạo LSX.
              {lsxTaoTuSheet?.sheet.pricingSheetName
                ? ` · Sheet: ${lsxTaoTuSheet.sheet.pricingSheetName}`
                : ''}
            </div>
          </div>
          <button
            className="wiz-btn wiz-btn--ghost"
            onClick={() => {
              datLsxTaoTuSheet(null);
              daHydrateTao.current = null;
              onSuccessNavigate?.('danh-sach-bao-gia');
            }}
          >
            <ArrowLeft size={14} /> Danh sách BG
          </button>
        </div>
      )}

      <div className="quote-wizard-content" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {toast && toast.kind === 'err' && (
          <div className="wiz-error" role="alert">{toast.msg}</div>
        )}
        {toast && toast.kind === 'ok' && (
          <div className="qrev-alert qrev-alert--ok" style={{ marginBottom: 12 }}>{toast.msg}</div>
        )}

        <div className="sp-section">
          <h3 className="sp-section-title">
            <span className="sp-section-num">1</span>
            Khách hàng
          </h3>
          <BuocChonKhachHang selected={khachHang} onSelect={setKhachHang} chiDoc={khoaKhBgSheet} />
        </div>

        <div className={`sp-section${!khachHang ? ' sp-section--disabled' : ''}`}>
          {!khachHang && (
            <div className="sp-disabled-overlay">Chọn khách hàng để tiếp tục</div>
          )}
          <h3 className="sp-section-title">
            <span className="sp-section-num">2</span>
            Báo giá & Tính giá phù hợp
          </h3>
          {khachHang && (
            <BuocChonBaoGiaVaTinhGia
              customer={khachHang}
              selectedBgId={bgDangChon?.id ?? null}
              onSelectBg={(bg) => {
                if (khoaKhBgSheet) return;
                setBgDangChon(bg);
                setSheetDangChon(null);
              }}
              selectedSheet={sheetDangChon}
              onSelectSheet={(s) => { if (!khoaKhBgSheet) setSheetDangChon(s); }}
              onSheetPreview={() => handleXemBg()}
              chiDoc={khoaKhBgSheet}
            />
          )}
        </div>

        <div className={`sp-section${!sheetDangChon && !source ? ' sp-section--disabled' : ''}`}>
          {!sheetDangChon && !source && (
            <div className="sp-disabled-overlay">Chọn tính giá ở bước 2 trước</div>
          )}
          <h3 className="sp-section-title">
            <span className="sp-section-num">3</span>
            {dangSua ? 'Sửa form lệnh sản xuất' : 'Nhập form lệnh sản xuất'}
          </h3>
          {source && manual ? (
            <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted, #6b7280)', marginBottom: 8 }}>
                <b>{dangSua ? 'Đang sửa:' : 'Đang tạo cho:'}</b> {source.productName}
                {bgDangChon ? ` · BG-${bgDangChon.id.slice(0, 8)}` : ''}
              </div>
              <LsxFormFields source={source} value={manual} onChange={setManual} />
            </div>
          ) : (
            <div className="wiz-empty">Chọn tính giá ở bước 2 trước</div>
          )}
        </div>
      </div>

      <div className="quote-wizard-mobile-action">
        <button className="wiz-btn wiz-btn--secondary" onClick={handleXemPdf} disabled={!coTheXem || dangXuLy}>
          <FileDown size={14} /> Xem PDF
        </button>
        <button
          className="wiz-btn wiz-btn--primary"
          onClick={() => (dangSua ? setConfirmCapNhat(true) : void handleTaoLsx())}
          disabled={primaryDisabled}
        >
          {dangXuLy ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
          {dangSua ? 'Cập nhật' : 'Tạo LSX'}
        </button>
      </div>

      {previewLsx && (
        <LsxPreviewModal open={!!previewLsx} onClose={() => setPreviewLsx(null)} order={previewLsx.order} />
      )}
      {previewLsxPdf && (
        <LsxPdfPreviewModal open={!!previewLsxPdf} onClose={() => setPreviewLsxPdf(null)} order={previewLsxPdf.order} />
      )}
      {previewBg && (
        <BaoGiaPreviewModal
          open={!!previewBg}
          onClose={() => setPreviewBg(null)}
          item={previewBg.item}
          customerInfo={previewBg.customerInfo}
        />
      )}

      {confirmCapNhat && (
        <ConfirmDialog
          open
          title="Cập nhật LSX?"
          message="Trạng thái sẽ reset về Chờ duyệt — cần cố vấn duyệt lại. Tiếp tục?"
          confirmLabel="Cập nhật"
          onConfirm={() => void handleCapNhat()}
          onCancel={() => setConfirmCapNhat(false)}
        />
      )}

      {modalSuccess && (
        <div className="lts-confirm-backdrop" onClick={() => setModalSuccess(null)}>
          <div className="lts-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lts-confirm-icon">✅</div>
            <h3 className="lts-confirm-title">Đã tạo LSX thành công</h3>
            <p className="lts-confirm-desc">
              LSX <b>{modalSuccess.lsxNumber}</b> đã được tạo trên máy chủ.<br />
              Trạng thái: <b>Chờ duyệt</b>.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => { setModalSuccess(null); handleReset(); }}>
                Tạo LSX khác
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#059669', color: '#fff' }}
                onClick={() => onSuccessNavigate?.('danh-sach-lsx')}
              >
                → Xem danh sách LSX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaoLsxWizard;
