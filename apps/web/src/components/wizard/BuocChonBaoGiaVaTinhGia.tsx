"use client";
// src/components/wizard/BuocChonBaoGiaVaTinhGia.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Chọn báo giá → chọn tính giá (2 cấp tuần tự, Q21).
// 2a: chọn BG (filter theo KH + approved + có sheet KH-approved).
// 2b: chọn sheet (chỉ sheets từ BG đã chọn, có hasCustomerApproved=true).
// Đồng bộ UI với wiz-customer-card classes từ WIZARD_STYLES (giống BG).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { Search, FileText, Lock, CheckCircle2, Calendar, Check } from 'lucide-react';
import {
  layDanhSachBaoGiaService,
  type BaoGiaApi,
  type PricingSheetApi,
} from '../../lib/api/service-lts';
import { useCalculatorStore } from '../../store/CuaHangTinhGia';
import { laBaoGiaDaDuyet } from '../../lib/bao-gia-adapter';
import { boDau } from './BuocChonKhachHang';

interface CustomerLite {
  id: string;
  customerCode?: string;
  companyName?: string;
}

export interface BuocChonBaoGiaVaTinhGiaProps {
  customer: CustomerLite | null;
  selectedBgId: string | null;
  onSelectBg: (bg: BaoGiaApi) => void;
  selectedSheet: PricingSheetApi | null;
  onSelectSheet: (sheet: PricingSheetApi) => void;
  onSheetPreview: (sheet: PricingSheetApi) => void;
  /** true = khóa chọn BG/sheet (đang sửa LSX / tạo từ sheet DS báo giá). */
  chiDoc?: boolean;
}

function layTenKhachHangCuaBg(bg: BaoGiaApi): string {
  const sheet = bg.pricingSheets?.[0];
  if (!sheet) return '';
  if (typeof sheet.inputValue === 'object' && sheet.inputValue !== null) {
    const input = sheet.inputValue as Record<string, unknown>;
    if (typeof input.customer === 'string' && input.customer) return input.customer;
  }
  return sheet.customer?.codeName || sheet.customerCodeName || '';
}

function locSheetKhaDung(bg: BaoGiaApi): PricingSheetApi[] {
  return (bg.pricingSheets ?? []).filter((s) => s.hasCustomerApproved === true);
}

/** Lấy giá engine từ sheet (saleResult → masterResult). Mirror bao-gia-adapter layFinalPrice. */
export function layFinalPriceCuaSheet(sheet: PricingSheetApi): number {
  const saleP = (sheet.saleResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof saleP === 'number') return saleP;
  const masterP = (sheet.masterResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof masterP === 'number') return masterP;
  return 0;
}

/**
 * Tính giá hiển thị step 2b: ưu tiên chotGia (sale đã thương lượng),
 * fallback sang giá engine khi chotGia <= 0.
 * `laGiaEngine = true` nghĩa đang fallback → UI nên đánh dấu "(giá engine)".
 */
export function layGiaHienThiCuaSheet(
  sheet: PricingSheetApi,
  input: Record<string, unknown>,
): { gia: number; laGiaEngine: boolean } {
  const chotGiaRaw = input.chotGia;
  const chotGia = typeof chotGiaRaw === 'number' && chotGiaRaw > 0 ? chotGiaRaw : 0;
  if (chotGia > 0) return { gia: chotGia, laGiaEngine: false };
  const finalPrice = layFinalPriceCuaSheet(sheet);
  return { gia: finalPrice, laGiaEngine: finalPrice > 0 };
}

function locBgChoKhachHang(
  quotations: BaoGiaApi[],
  customer: CustomerLite | null,
): BaoGiaApi[] {
  if (!customer) return [];
  const companyLower = (customer.companyName || '').toLowerCase();
  const codeLower = (customer.customerCode || '').toLowerCase();
  return quotations.filter((q) => {
    if (!laBaoGiaDaDuyet(q.updateStatus)) return false;
    if (locSheetKhaDung(q).length === 0) return false;
    const tenKh = layTenKhachHangCuaBg(q).toLowerCase();
    if (!tenKh) return false;
    if (companyLower && tenKh === companyLower) return true;
    if (codeLower && tenKh === codeLower) return true;
    return false;
  });
}

export function BuocChonBaoGiaVaTinhGia({
  customer,
  selectedBgId,
  onSelectBg,
  selectedSheet,
  onSelectSheet,
  onSheetPreview,
  chiDoc = false,
}: BuocChonBaoGiaVaTinhGiaProps) {
  const accessToken = useCalculatorStore((s) => s.accessToken);
  const isAuthenticated = useCalculatorStore((s) => s.isAuthenticated);

  const [danhSach, setDanhSach] = useState<BaoGiaApi[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    let huy = false;
    setDangTai(true);
    setLoi('');
    layDanhSachBaoGiaService(accessToken)
      .then((data) => { if (!huy) setDanhSach(data); })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Lỗi tải báo giá'); })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, [accessToken, isAuthenticated]);

  const dsBgChoKH = useMemo(() => locBgChoKhachHang(danhSach, customer), [danhSach, customer]);
  const bangDo = useMemo(() => {
    const m = new Map<string, BaoGiaApi>();
    for (const bg of danhSach) m.set(bg.id, bg);
    return m;
  }, [danhSach]);
  const dsBgLoc = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    if (!q) return dsBgChoKH;
    return dsBgChoKH.filter((bg) => {
      const tenKh = layTenKhachHangCuaBg(bg);
      return boDau(bg.quotationName || '').includes(q)
        || boDau(tenKh).includes(q)
        || boDau(bg.id).includes(q);
    });
  }, [dsBgChoKH, tuKhoa]);

  const bgDangChon = useMemo(
    () => (selectedBgId ? bangDo.get(selectedBgId) || null : null),
    [bangDo, selectedBgId],
  );
  const dsSheetKhaDung = useMemo(
    () => (bgDangChon ? locSheetKhaDung(bgDangChon) : []),
    [bgDangChon],
  );

  if (!customer) {
    return (
      <div className="wiz-empty">
        <Lock size={20} style={{ marginBottom: 6, opacity: 0.6 }} />
        <div style={{ fontSize: '0.86rem' }}>Chọn khách hàng ở bước ① trước</div>
      </div>
    );
  }

  // Mode chiDoc: chỉ hiện BG + sheet đã chọn (không list chọn lại / không phụ thuộc API list)
  if (chiDoc) {
    const sheet = selectedSheet;
    const bgFromList = selectedBgId ? bangDo.get(selectedBgId) : null;
    const input = (typeof sheet?.inputValue === 'object' && sheet?.inputValue !== null
      ? sheet.inputValue
      : {}) as Record<string, unknown>;
    const productName = sheet?.pricingSheetName
      || (typeof input.productName === 'string' ? input.productName : '—');
    const tenBg = bgFromList?.quotationName
      || (selectedBgId ? `BG-${selectedBgId.slice(0, 8)}` : '—');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted, #6b7280)' }}>
          Khách hàng: <b>{customer.companyName || customer.customerCode || customer.id}</b>
        </div>
        <div className="wiz-customer-card wiz-customer-card--selected" style={{ cursor: 'default' }}>
          <div className="wiz-customer-icon"><FileText size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wiz-customer-name">{tenBg}</div>
            <div className="wiz-customer-meta">Báo giá đã khóa</div>
          </div>
          <Check size={18} className="wiz-customer-check" />
        </div>
        {sheet && (
          <div className="wiz-customer-card wiz-customer-card--selected" style={{ cursor: 'default' }}>
            <div className="wiz-customer-icon"><CheckCircle2 size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wiz-customer-name">{productName}</div>
              <div className="wiz-customer-meta" style={{ color: '#047857' }}>Sheet đã khóa · Khách đã duyệt</div>
            </div>
            <Check size={18} className="wiz-customer-check" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--muted, #6b7280)' }}>
        Khách hàng đã chọn: <b>{customer.companyName || customer.customerCode || customer.id}</b>
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', fontWeight: 700, color: 'var(--muted, #6b7280)' }}>
          2a. Chọn báo giá
        </h4>
        <div className="wiz-search-box">
          <Search size={16} className="wiz-search-icon" />
          <input
            className="wiz-search-input"
            aria-label="Tìm báo giá"
            placeholder="Tìm theo tên BG, KH, mã BG..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
          />
        </div>

        {loi && (
          <div className="wiz-error" role="alert">{loi}</div>
        )}

        {dangTai ? (
          <div className="wiz-empty">Đang tải báo giá...</div>
        ) : dsBgLoc.length === 0 ? (
          <div className="wiz-empty">
            <p>Khách hàng này chưa có báo giá nào đã được duyệt + có sheet khách duyệt.</p>
            <span style={{ fontSize: '0.74rem' }}>Báo giá cần ở trạng thái &ldquo;Đã duyệt&rdquo; và có sheet &ldquo;Khách đã duyệt&rdquo;.</span>
          </div>
        ) : (
          <div className="wiz-customer-list">
            {dsBgLoc.map((bg) => {
              const isSelected = selectedBgId === bg.id;
              const sheetKhaDung = locSheetKhaDung(bg).length;
              return (
                <div
                  key={bg.id}
                  role="button"
                  tabIndex={0}
                  className={`wiz-customer-card${isSelected ? ' wiz-customer-card--selected' : ''}`}
                  onClick={() => onSelectBg(bg)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectBg(bg); }
                  }}
                >
                  <div className="wiz-customer-icon"><FileText size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wiz-customer-name">{bg.quotationName || `BG-${bg.id.slice(0, 8)}`}</div>
                    <div className="wiz-customer-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Calendar size={11} />
                        {new Date(bg.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span>{(bg.pricingSheets ?? []).length} SP</span>
                      <span style={{ color: sheetKhaDung > 0 ? '#047857' : '#6b7280' }}>
                        {sheetKhaDung}/{(bg.pricingSheets ?? []).length} sheet KH duyệt
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={18} className="wiz-customer-check" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', fontWeight: 700, color: 'var(--muted, #6b7280)' }}>
          2b. Chọn tính giá phù hợp
        </h4>
        {!bgDangChon ? (
          <div className="wiz-empty">
            <Lock size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
            <div style={{ fontSize: '0.84rem' }}>Chọn báo giá ở bước 2a trước</div>
          </div>
        ) : dsSheetKhaDung.length === 0 ? (
          <div className="wiz-empty">
            <p>Báo giá này không có sheet nào khách đã duyệt.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted, #6b7280)', marginBottom: 4 }}>
              💡 Mỗi LSX tạo từ 1 tính giá. Click 1 dòng để chọn.
            </div>
            {dsSheetKhaDung.map((sheet) => {
              const isSelected = selectedSheet?.id === sheet.id;
              const input = (typeof sheet.inputValue === 'object' && sheet.inputValue !== null
                ? sheet.inputValue
                : {}) as Record<string, unknown>;
              const productName = sheet.pricingSheetName || (typeof input.productName === 'string' ? input.productName : '—');
              const structure = typeof input.structure === 'string' ? input.structure : '';
              const quantity = typeof input.quantity === 'number' ? input.quantity : 0;
              const { gia: giaHienThi, laGiaEngine } = layGiaHienThiCuaSheet(sheet, input);
              return (
                <div
                  key={sheet.id}
                  role="button"
                  tabIndex={0}
                  className={`wiz-customer-card${isSelected ? ' wiz-customer-card--selected' : ''}`}
                  onClick={() => onSelectSheet(sheet)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSheet(sheet); }
                  }}
                >
                  <div className="wiz-customer-icon"><CheckCircle2 size={18} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wiz-customer-name">{productName}</div>
                    {structure && <div className="wiz-customer-meta">{structure}</div>}
                    <div className="wiz-customer-meta" style={{ marginTop: 2 }}>
                      <span>SL: <b>{quantity.toLocaleString('vi-VN')}</b></span>
                      <span>
                        Giá: <b>{giaHienThi.toLocaleString('vi-VN')} ₫</b>
                        {laGiaEngine && (
                          <span
                            title="Chưa có giá chốt — đang hiển thị giá engine"
                            style={{ fontSize: '0.66rem', color: '#6b7280', marginLeft: 4 }}
                          >
                            (giá engine)
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#047857' }}>Khách đã duyệt</span>
                    </div>
                  </div>
                  {isSelected && <Check size={18} className="wiz-customer-check" />}
                  <button
                    type="button"
                    className="wiz-btn wiz-btn--ghost"
                    style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    onClick={(e) => { e.stopPropagation(); onSheetPreview(sheet); }}
                    aria-label="Xem chi tiết báo giá"
                  >
                    <FileText size={12} /> Xem BG
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BuocChonBaoGiaVaTinhGia;
