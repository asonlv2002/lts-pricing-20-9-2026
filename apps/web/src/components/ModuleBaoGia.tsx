"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Search, Clock, Building2, Calendar,
  Send, ShieldCheck, PackageCheck, Eye, Users, ChevronDown, ChevronRight,
  XCircle, TimerOff, Copy, Lock, Unlock, Ban, FileDown, Layers, ClipboardEdit, UserPlus,
  Plus, Trash2, AlertTriangle, CheckCircle2, X, Check,
} from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import { lapDongSanXuat, tinhBaoGia, xuLyDongGhiDe } from '../lib/manager-calculation';
import type { AppConstants, HistoryItem, Material, ProfitRow, QuoteProductLine, QuoteStatus, OverrideTable, QuoteTerms, QuoteTier, SmallWidthMaterialPrice } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';

// ── Customer type (mirrors ModuleKhachHang) ──────────────────────────────────
interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  sellerId?: string | null;
  sellerName?: string;
  status: 'active' | 'inactive';
  crmStatus?: string;
  region?: string;
}

const LS_CUSTOMERS = 'lts_customers';

function docKhachHang(): Customer[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOMERS);
    if (raw) return JSON.parse(raw) as Customer[];
  } catch { /* ignore */ }
  return [];
}

function tenKhachHang(c: Customer): string {
  return c.companyName || c.contactName || c.customerCode || c.id;
}

// ── Wizard types ──────────────────────────────────────────────────────────────
interface TierRow {
  quantity: number;
  finalPrice: number; // giá chốt từ bảng tính (tham khảo)
  baoGia: number;     // giá báo khách (editable)
}

interface WizardProduct {
  historyItem: HistoryItem;
  tiers: TierRow[];
}

interface WizardState {
  customer: Customer | null;
  products: WizardProduct[];
  terms: {
    vatRate: number;
    validityDays: number;
    paymentTerms: string;
    deliveryTime: string;
    notes: string;
  };
}

const WIZARD_STYLES = `
.wiz-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.wiz-modal { background: var(--background, #fff); border-radius: 14px; width: 100%; max-width: 860px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; min-height: 500px; }
.wiz-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-title { font-size: 1.05rem; font-weight: 700; color: var(--foreground, #111); }
.wiz-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: var(--muted, #6b7280); transition: background 0.15s; }
.wiz-close:hover { background: var(--surface, #f3f4f6); }
.wiz-steps { display: flex; align-items: center; padding: 16px 24px; gap: 0; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-step { display: flex; align-items: center; gap: 8px; flex: 1; }
.wiz-step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; transition: all 0.2s; }
.wiz-step-num--done { background: var(--accent, #0891b2); color: #fff; }
.wiz-step-num--active { background: var(--accent, #0891b2); color: #fff; box-shadow: 0 0 0 3px rgba(8,145,178,0.2); }
.wiz-step-num--pending { background: var(--border, #e5e7eb); color: var(--muted, #9ca3af); }
.wiz-step-label { font-size: 0.8rem; font-weight: 500; color: var(--muted, #6b7280); white-space: nowrap; }
.wiz-step-label--active { color: var(--accent, #0891b2); font-weight: 600; }
.wiz-step-sep { flex: 1; height: 1px; background: var(--border, #e5e7eb); margin: 0 8px; }
.wiz-body { flex: 1; padding: 24px; overflow-y: auto; }
.wiz-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid var(--border, #e5e7eb); gap: 12px; }
.wiz-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.wiz-btn--primary { background: var(--accent, #0891b2); color: #fff; }
.wiz-btn--primary:hover { opacity: 0.9; }
.wiz-btn--secondary { background: var(--surface, #f3f4f6); color: var(--foreground, #111); border: 1px solid var(--border, #e5e7eb); }
.wiz-btn--secondary:hover { background: var(--border, #e5e7eb); }
.wiz-btn--ghost { background: transparent; color: var(--muted, #6b7280); }
.wiz-btn--ghost:hover { color: var(--foreground, #111); }
.wiz-btn--danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.wiz-btn--danger:hover { background: #fee2e2; }
.wiz-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wiz-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #6b7280); margin-bottom: 10px; }
.wiz-search-box { position: relative; margin-bottom: 12px; }
.wiz-search-input { width: 100%; padding: 9px 12px 9px 36px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; font-size: 0.88rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; }
.wiz-search-input:focus { border-color: var(--accent, #0891b2); box-shadow: 0 0 0 2px rgba(8,145,178,0.12); }
.wiz-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted, #9ca3af); pointer-events: none; }
.wiz-customer-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.wiz-customer-card { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1.5px solid var(--border, #e5e7eb); border-radius: 10px; cursor: pointer; transition: all 0.15s; background: var(--background, #fff); }
.wiz-customer-card:hover { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.04); }
.wiz-customer-card--selected { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.07); }
.wiz-customer-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(8,145,178,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent, #0891b2); flex-shrink: 0; }
.wiz-customer-name { font-size: 0.9rem; font-weight: 600; color: var(--foreground, #111); }
.wiz-customer-meta { font-size: 0.76rem; color: var(--muted, #6b7280); margin-top: 1px; }
.wiz-customer-check { margin-left: auto; color: var(--accent, #0891b2); flex-shrink: 0; }
.wiz-recent-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.wiz-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 500; border: 1px solid var(--border, #e5e7eb); background: var(--surface, #f9fafb); color: var(--foreground, #111); cursor: pointer; transition: all 0.15s; }
.wiz-chip:hover { border-color: var(--accent, #0891b2); color: var(--accent, #0891b2); }
.wiz-selected-customer { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid var(--accent, #0891b2); border-radius: 10px; background: rgba(8,145,178,0.06); margin-bottom: 16px; }
.wiz-product-card { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.wiz-product-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface, #f9fafb); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-product-title { font-size: 0.88rem; font-weight: 600; color: var(--foreground, #111); flex: 1; }
.wiz-product-meta { font-size: 0.75rem; color: var(--muted, #6b7280); }
.wiz-tier-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wiz-tier-table th { padding: 7px 10px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b7280); background: var(--surface, #f9fafb); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-tier-table td { padding: 7px 10px; border-bottom: 1px solid var(--border, #e5e7eb); vertical-align: middle; }
.wiz-tier-table tr:last-child td { border-bottom: none; }
.wiz-tier-input { width: 100%; padding: 5px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 6px; font-size: 0.82rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; }
.wiz-tier-input:focus { border-color: var(--accent, #0891b2); }
.wiz-tier-input--warn { border-color: #f59e0b; background: #fffbeb; }
.wiz-tier-ref { font-size: 0.75rem; color: var(--muted, #9ca3af); margin-top: 2px; }
.wiz-tier-diff { font-size: 0.72rem; margin-top: 1px; }
.wiz-tier-diff--pos { color: #059669; }
.wiz-tier-diff--neg { color: #dc2626; }
.wiz-tier-warn { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #d97706; margin-top: 2px; }
.wiz-add-tier { display: flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 0.8rem; color: var(--accent, #0891b2); background: transparent; border: none; cursor: pointer; }
.wiz-add-tier:hover { text-decoration: underline; }
.wiz-add-product { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1.5px dashed var(--border, #e5e7eb); border-radius: 10px; font-size: 0.85rem; color: var(--accent, #0891b2); background: transparent; cursor: pointer; width: 100%; justify-content: center; transition: all 0.15s; margin-top: 4px; }
.wiz-add-product:hover { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.04); }
.wiz-product-search-dropdown { border: 1px solid var(--border, #e5e7eb); border-radius: 8px; max-height: 260px; overflow-y: auto; background: var(--background, #fff); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.wiz-product-option { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border, #e5e7eb); transition: background 0.1s; }
.wiz-product-option:last-child { border-bottom: none; }
.wiz-product-option:hover { background: var(--surface, #f9fafb); }
.wiz-product-option--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.wiz-confirm-section { background: var(--surface, #f9fafb); border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.wiz-confirm-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; }
.wiz-confirm-row:last-child { margin-bottom: 0; }
.wiz-confirm-label { color: var(--muted, #6b7280); min-width: 120px; flex-shrink: 0; }
.wiz-confirm-value { color: var(--foreground, #111); font-weight: 500; }
.wiz-confirm-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wiz-confirm-table th { padding: 7px 10px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b7280); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-confirm-table td { padding: 8px 10px; border-bottom: 1px solid var(--border, #e5e7eb); vertical-align: top; }
.wiz-confirm-table tr:last-child td { border-bottom: none; }
.wiz-terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.wiz-terms-field { display: flex; flex-direction: column; gap: 4px; }
.wiz-terms-label { font-size: 0.76rem; font-weight: 600; color: var(--muted, #6b7280); }
.wiz-terms-input { padding: 7px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; font-size: 0.85rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; }
.wiz-terms-input:focus { border-color: var(--accent, #0891b2); }
.wiz-terms-textarea { padding: 7px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; font-size: 0.85rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; resize: vertical; min-height: 60px; }
.wiz-terms-textarea:focus { border-color: var(--accent, #0891b2); }
.wiz-error { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 7px; font-size: 0.82rem; color: #dc2626; margin-bottom: 12px; }
.wiz-empty { text-align: center; padding: 32px 16px; color: var(--muted, #9ca3af); font-size: 0.88rem; }
.sp-sticky-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.sp-section { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; position: relative; transition: border-color 0.2s, opacity 0.2s; }
.sp-section-title { font-size: 0.92rem; font-weight: 700; margin: 0 0 16px; color: var(--foreground, #111); display: flex; align-items: center; gap: 8px; }
.sp-section-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent, #0891b2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
.sp-section--disabled { opacity: 0.4; pointer-events: none; user-select: none; }
.sp-disabled-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.88rem; color: var(--muted, #6b7280); font-weight: 500; z-index: 2; background: rgba(255,255,255,0.5); border-radius: 10px; }
.sp-section--error { border-color: #fca5a5; box-shadow: 0 0 0 2px rgba(252,165,165,0.3); }
`;

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const CAC_BUOC_QUY_TRINH: QuoteStatus[] = ['drafted', 'pending_approval', 'approved', 'sent', 'completed'];

// Bước Admin được phép xem & thao tác (không có drafted/sent vì đó là phía Sale)
const CAC_BUOC_ADMIN: QuoteStatus[] = ['pending_approval', 'approved', 'completed'];

const ICON_BUOC: Record<QuoteStatus, React.ReactNode> = {
  drafted:          <FileText size={13} />,
  sent:             <Send size={13} />,
  pending_approval: <Clock size={13} />,
  approved:         <ShieldCheck size={13} />,
  rejected:         <Ban size={13} />,
  completed:        <PackageCheck size={13} />,
  cancelled:        <XCircle size={13} />,
  expired:          <TimerOff size={13} />,
};

function layTrangThai(muc: HistoryItem): QuoteStatus {
  // Luôn dùng quoteStatus tường minh; fallback 'drafted' nếu muc cũ chưa có truong này
  return muc.quoteStatus ?? 'drafted';
}

// Một muc "đã gửi lên admin" khi status >= pending_approval
function daGuiAdmin(muc: HistoryItem): boolean {
  const s = layTrangThai(muc);
  return s === 'pending_approval' || s === 'approved' || s === 'completed';
}

function laBanGhiBaoGia(muc: HistoryItem): boolean {
  return !!(muc.isQuote || muc.quoteProducts?.length || (muc.quoteCode && muc.tiers?.length));
}

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }

function doiNgayVnSangMs(date?: string): number {
  if (!date) return 0;
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function namTrongKhoangNgay(item: HistoryItem, tuNgay: string, denNgay: string): boolean {
  const ms = doiNgayVnSangMs(item.date);
  if (!ms) return true;
  if (tuNgay && ms < new Date(tuNgay).setHours(0, 0, 0, 0)) return false;
  if (denNgay && ms > new Date(denNgay).setHours(23, 59, 59, 999)) return false;
  return true;
}

// ── Override diff helpers ────────────────────────────────────────────────────
const NHAN_DONG: Record<string, string> = {
  print: 'In', 'lam-2': 'Ghép L2', 'lam-3': 'Ghép L3',
  'lam-4': 'Ghép L4', 'lam-5': 'Ghép L5', cut: 'Cắt',
};
const NHAN_TRUONG: Record<string, string> = {
  width: 'Khổ', meters: 'Thành phẩm', waste: 'Phi hao',
  inputVL: 'Đầu vào VL', matPrice: 'CP vật liệu',
};

function demGhiDe(ov?: OverrideTable): number {
  if (!ov) return 0;
  return Object.values(ov).reduce((s, r) => s + (r ? Object.keys(r).length : 0), 0);
}

function hienThiKhacBietGhiDe(ov: OverrideTable | undefined, lopNhom: string, nhanNhom: string) {
  if (!ov) return null;
  const cacMuc = Object.entries(ov) as [string, Record<string, number>][];
  if (cacMuc.length === 0) return null;
  return (
    <>
      <div className={`override-diff-group-title ${lopNhom}`}>{nhanNhom}</div>
      {cacMuc.map(([rk, cacTruong]) =>
        Object.entries(cacTruong).map(([truong, giaTri]) => (
          <div key={`${rk}-${truong}`} className="override-diff-item">
            <span className="diff-label">{NHAN_DONG[rk] || rk} · {NHAN_TRUONG[truong] || truong}</span>
            <span className="diff-arrow">→</span>
            <span className="diff-new">{typeof giaTri === 'number' ? giaTri.toLocaleString('vi-VN') : giaTri}</span>
          </div>
        ))
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN STATUS DROPDOWN — chỉ cho phép chọn trong CAC_BUOC_ADMIN
// ════════════════════════════════════════════════════════════
function HopChonTrangThaiAdmin({ muc, khiCapNhat }: {
  muc: HistoryItem;
  khiCapNhat: (id: string, status: QuoteStatus) => void;
}) {
  const [mo, datMo] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  return (
    <div className="qcard-status-dropdown-wrap" onClick={e => e.stopPropagation()}>
      <button
        className="qcard-status-trigger"
        style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55' }}
        onClick={() => datMo(v => !v)}
        title="Đổi trạng thái"
      >
        <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
        <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
        <span>{cauHinh.label}</span>
        <span className="qcard-status-trigger-caret">▾</span>
      </button>

      {mo && (
        <>
          <div className="qcard-dropdown-backdrop" onClick={() => datMo(false)} />
          <div className="qcard-dropdown">
            {CAC_BUOC_ADMIN.map((buoc) => {
              const cauHinhBuoc = QUOTE_STATUS_CONFIG[buoc];
              const dangChon = buoc === hienTai;
              return (
                <button
                  key={buoc}
                  className={`qcard-dropdown-item ${dangChon ? 'active' : ''}`}
                  onClick={() => { khiCapNhat(muc.id, buoc); datMo(false); }}
                >
                  <span className="qcard-dropdown-dot" style={{ background: cauHinhBuoc.color }} />
                  <span className="qcard-dropdown-icon">{ICON_BUOC[buoc]}</span>
                  <span className="qcard-dropdown-label">{cauHinhBuoc.label}</span>
                  <span className="qcard-dropdown-desc">{cauHinhBuoc.description}</span>
                  {dangChon && <span className="qcard-dropdown-check">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE STATUS BADGE + NÚT GỬI ADMIN
// Seller chỉ có 2 hành động:
//   drafted → nút "Gửi Admin" → pending_approval
//   pending_approval / approved / completed → badge đọc-only
// ════════════════════════════════════════════════════════════
function DieuKhienTrangThaiSale({ muc, khiCapNhat }: {
  muc: HistoryItem;
  khiCapNhat: (id: string, status: QuoteStatus) => void;
}) {
  const [xacNhan, datXacNhan] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  if (hienTai === 'drafted') {
    return (
      <div className="qcard-sale-controls" onClick={e => e.stopPropagation()}>
        {/* Badge đang soạn */}
        <span className="qcard-status-trigger"
          style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55', cursor: 'default' }}>
          <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
          <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
          <span>{cauHinh.label}</span>
        </span>

        {/* Nút Gửi */}
        {!xacNhan ? (
          <button
            className="qcard-send-btn"
            onClick={() => datXacNhan(true)}
            title="Gửi báo giá cho Admin duyệt"
          >
            <Send size={12} />
            Gửi Admin
          </button>
        ) : (
          <div className="qcard-send-xacNhan">
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Xác nhận gửi?</span>
            <button className="qcard-send-btn qcard-send-btn--yes"
              onClick={() => { khiCapNhat(muc.id, 'pending_approval'); datXacNhan(false); }}>
              ✓
            </button>
            <button className="qcard-send-btn qcard-send-btn--no"
              onClick={() => datXacNhan(false)}>
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // Đã gửi → read-only badge
  return (
    <span
      className="qcard-status-trigger"
      style={{ color: cauHinh.color, background: cauHinh.bg, borderColor: cauHinh.color + '55', cursor: 'default' }}
      title={cauHinh.description}
    >
      <span className="qcard-status-dot" style={{ background: cauHinh.color }} />
      <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
      <span>{cauHinh.label}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION CARD — dùng chung, nhận control node từ ngoài
// ════════════════════════════════════════════════════════════
function QuotationCard({ muc, onClick, statusControl }: {
  muc: HistoryItem;
  onClick: () => void;
  statusControl: React.ReactNode;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const spreadMm  = muc.input.spreadWidth ? Math.round(muc.input.spreadWidth * 1000) : 0;
  const cutMm     = muc.input.cutStep     ? Math.round(muc.input.cutStep     * 1000) : 0;
  const sizeStr   = spreadMm && cutMm ? `${spreadMm} × ${cutMm} mm` : '—';
  const numColors = muc.input.numColors ?? 0;
  const shownPrice = muc.chotGia && muc.chotGia > 0 ? muc.chotGia : muc.finalPrice;
  const diff      = muc.chotGia && muc.chotGia > 0 ? muc.chotGia - muc.finalPrice : 0;
  const diffPct   = diff !== 0 && muc.finalPrice > 0 ? (diff / muc.finalPrice) * 100 : 0;
  const saleCount = demGhiDe(muc.saleOverrides);
  const adminCount = demGhiDe(muc.adminOverrides);
  const hasAnyOverrides = saleCount > 0 || adminCount > 0;
  const { materials, constants, profitTable, smallWidthPrices } = dungCuaHangTinhGia();

  const specRows = useMemo(() => {
    const res = tinhBaoGia(muc.input, materials, constants, profitTable, smallWidthPrices);
    if (!res) return [];
    const base = lapDongSanXuat(res, constants).uniRows;
    const source = adminCount > 0 ? (muc.saleOverrides ?? {}) : {};
    const current = adminCount > 0 ? (muc.adminOverrides ?? {}) : (muc.saleOverrides ?? {});
    return xuLyDongGhiDe(base, source, current).rows;
  }, [muc.input, muc.saleOverrides, muc.adminOverrides, materials, constants, profitTable, smallWidthPrices, adminCount]);

  return (
    <div className="quote-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={14} className="quote-icon" />
          <span className="quote-id">{muc.date}</span>
        </div>
        {statusControl}
      </div>

      <div className="quote-body">
        <h3 className="quote-title">{muc.productName || '—'}</h3>

        <div className="quote-meta">
          <div className="quote-meta-muc">
            <Building2 size={13} style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{muc.customer || '—'}</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr',
            background: 'var(--surface2)', padding: '10px 12px',
            borderRadius: '8px', gap: '5px', fontSize: '0.8rem',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Chất liệu:</span>
              <strong style={{ color: 'var(--text)', fontSize: '0.76rem' }}>{muc.structure || '—'}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Kích thước:</span>
              <strong style={{ color: 'var(--text)' }}>{sizeStr}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Số lượng:</span>
              <span><strong style={{ color: 'var(--accent)' }}>{dinhDangSo(muc.quantity)}</strong> túi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>Màu in:</span>
              <span>{numColors > 0 ? `${numColors} màu` : 'Không in'}</span>
            </div>
          </div>

          <div className="quote-meta-muc" style={{ marginTop: '4px' }}>
            <Calendar size={12} />
            <span style={{ fontSize: '0.76rem' }}>Ngày lập: {muc.date}</span>
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '10px', marginTop: '6px', marginBottom: '10px', fontSize: '0.82rem',
        }}>
          <div>
            <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá đề xuất / túi</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{dinhDangSo(muc.finalPrice)} đ</div>
          </div>
          {muc.chotGia && muc.chotGia > 0 ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt / túi</div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>
                {dinhDangSo(muc.chotGia)} đ
                <span style={{ fontSize: '0.72rem', marginLeft: 4, color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  ({diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Giá chốt</div>
              <div style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>Chưa chốt</div>
            </div>
          )}
        </div>

        <div className="quote-price-box">
          <div className="quote-price-label">Tổng giá trị ước tính</div>
          <div className="quote-price-giaTriue">
            {dinhDangSo(Math.round(shownPrice * muc.quantity))} <span className="quote-currency">VNĐ</span>
          </div>
        </div>
      </div>

      {/* Override diff button */}
      {hasAnyOverrides && (
        <>
          <button className="override-diff-toggle"
            onClick={(e) => { e.stopPropagation(); setShowDiff(!showDiff); }}>
            {showDiff ? '▾ Ẩn thay đổi' : '▸ Xem thay đổi'}
            <span className="override-diff-count">{saleCount} Sale / {adminCount} Admin</span>
          </button>
          {showDiff && (
            <div className="override-diff-summary" onClick={e => e.stopPropagation()}>
              {hienThiKhacBietGhiDe(muc.saleOverrides, 'sale', '💼 Sale')}
              {hienThiKhacBietGhiDe(muc.adminOverrides, 'admin', '👑 Admin')}
              <div className="override-diff-group-title" style={{ marginTop: 8 }}>📋 Đặc tả kỹ thuật sau thay đổi</div>
              {specRows.flatMap(row => row.materialDetails?.length
                ? row.materialDetails.map((d, idx) => (
                  <div key={`${row.rowKey}-${idx}`} className="override-diff-item">
                    <span className="diff-label">{row.stage} · {d.name}</span>
                    <span className="diff-arrow">→</span>
                    <span className="diff-new">Khổ {d.width.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}m · VL {(row.inputVL).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · {d.matPrice.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}đ/m²</span>
                  </div>
                ))
                : [(
                  <div key={row.rowKey} className="override-diff-item">
                    <span className="diff-label">{row.stage} · {row.mat || '—'}</span>
                    <span className="diff-arrow">→</span>
                    <span className="diff-new">Khổ {row.width.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}m · TP {row.meters.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · Hao {row.waste.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m · VL {row.inputVL.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}m</span>
                  </div>
                )]
              )}
            </div>
          )}
        </>
      )}

      <div className="quote-footer" style={{ justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem', gap: 4 }}>
        <Eye size={12} />
        Nhấn để mở bảng tính giá
        {muc.locked && <span style={{ marginLeft: 8, color: 'var(--orange)' }}><Lock size={11} /> Đã khóa</span>}
        {muc.quoteCode && <span style={{ marginLeft: 8 }}>{muc.quoteCode}</span>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STATS BAR
// ════════════════════════════════════════════════════════════
function StatsBar({ mucs, isAdmin }: { mucs: HistoryItem[]; isAdmin: boolean }) {
  const buocs = isAdmin ? CAC_BUOC_ADMIN : CAC_BUOC_QUY_TRINH;
  const counts = useMemo(() => {
    const c: Record<QuoteStatus, number> = { drafted: 0, sent: 0, pending_approval: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, expired: 0 };
    mucs.forEach(h => { c[layTrangThai(h)]++; });
    return c;
  }, [mucs]);

  const revenue = mucs
    .filter(h => layTrangThai(h) === 'completed')
    .reduce((sum, h) => sum + (h.chotGia || h.finalPrice) * h.quantity, 0);

  return (
    <div className="quote-stats-overview">
      {buocs.map(buoc => {
        const cauHinh = QUOTE_STATUS_CONFIG[buoc];
        return (
          <div key={buoc} className="quote-stat-card">
            <div className="quote-stat-giaTri" style={{ color: cauHinh.color, fontSize: '1.5rem' }}>{counts[buoc]}</div>
            <div className="quote-stat-lbl">{cauHinh.label}</div>
          </div>
        );
      })}
      <div className="quote-stat-card quote-stat-card--total">
        <div className="quote-stat-giaTri">{(revenue / 1_000_000).toFixed(1)}<small> Tr</small></div>
        <div className="quote-stat-lbl">Doanh thu (Hoàn thành)</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN VIEW — nhóm theo seller, chỉ thấy muc đã gửi
// ════════════════════════════════════════════════════════════
function AdminView({ mucs, search, chiTimKhachHang = false, onOpen, onStatusUpdate }: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    // Admin chỉ thấy muc đã gửi (status != drafted)
    const visible = mucs.filter(daGuiAdmin);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? visible.filter(i => chiTimKhachHang
        ? i.customer.toLowerCase().includes(q)
        : i.customer.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          i.structure.toLowerCase().includes(q) ||
          (i.sellerName || '').toLowerCase().includes(q)
      )
      : visible;

    const map = new Map<string, { id: string; name: string; mucs: HistoryItem[] }>();
    filtered.forEach(muc => {
      const sid = muc.sellerId || 'unknown';
      const sname = muc.sellerName || 'Không rõ';
      if (!map.has(sid)) map.set(sid, { id: sid, name: sname, mucs: [] });
      map.get(sid)!.mucs.push(muc);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [mucs, search, chiTimKhachHang]);

  const toggle = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Badge "chờ duyệt" count toàn bộ
  const pendingCount = mucs.filter(i => layTrangThai(i) === 'pending_approval').length;

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>
          {mucs.filter(daGuiAdmin).length === 0
            ? 'Chưa có báo giá nào được gửi lên.'
            : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner chờ duyệt */}
      {pendingCount > 0 && (
        <div className="qadmin-pending-banner">
          <Clock size={15} />
          <span>Có <strong>{pendingCount}</strong> báo giá đang chờ bạn duyệt</span>
        </div>
      )}

      {groups.map(group => {
        const isOpen = !collapsed[group.id];
        const pendingInGroup = group.mucs.filter(h => layTrangThai(h) === 'pending_approval').length;
        const groupRevenue = group.mucs
          .filter(h => layTrangThai(h) === 'completed')
          .reduce((s, h) => s + (h.chotGia || h.finalPrice) * h.quantity, 0);

        return (
          <div key={group.id} className="qgroup">
            <button className="qgroup-header" onClick={() => toggle(group.id)}>
              <span className="qgroup-icon"><Users size={16} /></span>
              <span className="qgroup-name">{group.name}</span>
              <span className="qgroup-count">{group.mucs.length} báo giá</span>
              {pendingInGroup > 0 && (
                <span className="qgroup-pending">{pendingInGroup} chờ duyệt</span>
              )}
              {groupRevenue > 0 && (
                <span className="qgroup-revenue">
                  {(groupRevenue / 1_000_000).toFixed(1)} Tr VNĐ
                </span>
              )}
              <span className="qgroup-chevron">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {isOpen && (
              <div className="quote-grid" style={{ padding: '12px 16px 16px' }}>
                {group.mucs.map(muc => (
                  <QuotationCard
                    key={muc.id}
                    muc={muc}
                    onClick={() => onOpen(muc.id)}
                    statusControl={
                      <HopChonTrangThaiAdmin muc={muc} khiCapNhat={onStatusUpdate} />
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SALE VIEW — tất cả báo giá của mình, nút gửi khi drafted
// ════════════════════════════════════════════════════════════
function SaleView({ mucs, search, chiTimKhachHang = false, onOpen, onStatusUpdate }: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (id: string, status: QuoteStatus) => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return mucs;
    const q = search.toLowerCase();
    return mucs.filter(i => chiTimKhachHang
      ? i.customer.toLowerCase().includes(q)
      : i.customer.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        i.structure.toLowerCase().includes(q)
    );
  }, [mucs, search, chiTimKhachHang]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>{mucs.length === 0
          ? 'Bạn chưa có báo giá nào. Hãy lưu bảng tính giá đầu tiên!'
          : 'Không có báo giá phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div className="quote-grid">
      {filtered.map(muc => (
        <QuotationCard
          key={muc.id}
          muc={muc}
          onClick={() => onOpen(muc.id)}
          statusControl={
            <DieuKhienTrangThaiSale muc={muc} khiCapNhat={onStatusUpdate} />
          }
        />
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// WIZARD — STEP 1: CHỌN KHÁCH HÀNG
// ════════════════════════════════════════════════════════════
function BuocChonKhachHang({
  selected, onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    setCustomers(docKhachHang());
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 8);
    const q = search.toLowerCase();
    return customers.filter(c =>
      tenKhachHang(c).toLowerCase().includes(q) ||
      (c.customerCode || '').toLowerCase().includes(q) ||
      (c.taxCode || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, search]);

  const recent = useMemo(() =>
    customers.filter(c => c.status === 'active').slice(0, 5),
    [customers]
  );

  return (
    <div>
      <p className="wiz-section-title">Tìm khách hàng</p>
      <div className="wiz-search-box">
        <Search size={14} className="wiz-search-icon" />
        <input
          className="wiz-search-input"
          placeholder="Tìm theo tên, mã KH, MST..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          aria-label="Tìm khách hàng"
        />
      </div>

      {!search && recent.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p className="wiz-section-title" style={{ marginBottom: 6 }}>Gần đây</p>
          <div className="wiz-recent-chips">
            {recent.map(c => (
              <button key={c.id} className="wiz-chip" onClick={() => onSelect(c)}>
                <Building2 size={11} />
                {tenKhachHang(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wiz-customer-list">
        {filtered.length === 0 ? (
          <div className="wiz-empty">Không tìm thấy khách hàng phù hợp.</div>
        ) : filtered.map(c => {
          const isSelected = selected?.id === c.id;
          return (
            <button
              key={c.id}
              className={`wiz-customer-card ${isSelected ? 'wiz-customer-card--selected' : ''}`}
              onClick={() => onSelect(c)}
              aria-pressed={isSelected}
            >
              <div className="wiz-customer-icon">
                <Building2 size={16} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="wiz-customer-name">{tenKhachHang(c)}</div>
                <div className="wiz-customer-meta">
                  {c.customerCode && <span>Mã: {c.customerCode}</span>}
                  {c.taxCode && <span style={{ marginLeft: 8 }}>MST: {c.taxCode}</span>}
                  {c.sellerName && <span style={{ marginLeft: 8 }}>Sale: {c.sellerName}</span>}
                </div>
              </div>
              {isSelected && <Check size={16} className="wiz-customer-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD — STEP 2: CHỌN SẢN PHẨM & NHẬP SỐ LƯỢNG
// ════════════════════════════════════════════════════════════
function BuocChonSanPham({
  customer, history, products, onProductsChange, materials, constants, profitTable, smallWidthPrices,
}: {
  customer: Customer;
  history: HistoryItem[];
  products: WizardProduct[];
  onProductsChange: (p: WizardProduct[]) => void;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
}) {
  const [searchSP, setSearchSP] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const addedIds = useMemo(() => new Set(products.map(p => p.historyItem.id)), [products]);

  const candidateSPs = useMemo(() => {
    const khName = tenKhachHang(customer).toLowerCase();
    const khCode = (customer.customerCode || '').toLowerCase();
    const q = searchSP.toLowerCase();
    return history.filter(h => !h.isQuote).filter(h =>
      h.customer.toLowerCase().includes(khName) ||
      (!!khCode && h.customer.toLowerCase().includes(khCode))
    ).filter(h =>
      !q || h.productName.toLowerCase().includes(q) || h.structure.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [history, customer, searchSP]);

  const addProduct = (item: HistoryItem) => {
    if (addedIds.has(item.id)) return;
    const newProduct: WizardProduct = {
      historyItem: item,
      tiers: [{ quantity: item.quantity, finalPrice: item.finalPrice, baoGia: item.chotGia || item.finalPrice }],
    };
    onProductsChange([...products, newProduct]);
    setShowSearch(false);
    setSearchSP('');
  };

  const removeProduct = (idx: number) => {
    onProductsChange(products.filter((_, i) => i !== idx));
  };

  const addTier = (pIdx: number) => {
    const updated = products.map((p, i) => {
      if (i !== pIdx) return p;
      const last = p.tiers[p.tiers.length - 1];
      return { ...p, tiers: [...p.tiers, { quantity: 0, finalPrice: last.finalPrice, baoGia: last.baoGia }] };
    });
    onProductsChange(updated);
  };

  const tinhGiaTheoSoLuong = (item: HistoryItem, quantity: number): number => {
    if (quantity <= 0) return 0;
    try {
      const result = tinhBaoGia({ ...item.input, quantity }, materials, constants, profitTable, smallWidthPrices);
      return result?.finalPrice ?? item.finalPrice;
    } catch {
      return item.finalPrice;
    }
  };

  const removeTier = (pIdx: number, tIdx: number) => {
    onProductsChange(products.map((p, i) =>
      i !== pIdx ? p : { ...p, tiers: p.tiers.filter((_, j) => j !== tIdx) }
    ));
  };

  const updateTier = (pIdx: number, tIdx: number, field: 'quantity' | 'baoGia', val: number) => {
    onProductsChange(products.map((p, i) =>
      i !== pIdx ? p : { ...p, tiers: p.tiers.map((t, j) => {
        if (j !== tIdx) return t;
        if (field === 'quantity') {
          const finalPrice = tinhGiaTheoSoLuong(p.historyItem, val);
          const userEdited = t.baoGia > 0 && t.baoGia !== t.finalPrice;
          return { ...t, quantity: val, finalPrice, baoGia: userEdited ? t.baoGia : finalPrice };
        }
        return { ...t, baoGia: val };
      }) }
    ));
  };

  return (
    <div>
      <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(8,145,178,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building2 size={14} style={{ color: 'var(--accent, #0891b2)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tenKhachHang(customer)}</span>
        {customer.customerCode && <span style={{ fontSize: '0.76rem', color: 'var(--muted, #6b7280)' }}>({customer.customerCode})</span>}
      </div>

      {products.map((prod, pIdx) => {
        const spreadMm = prod.historyItem.input.spreadWidth ? Math.round(prod.historyItem.input.spreadWidth * 1000) : 0;
        const cutMm = prod.historyItem.input.cutStep ? Math.round(prod.historyItem.input.cutStep * 1000) : 0;
        return (
          <div key={prod.historyItem.id} className="wiz-product-card">
            <div className="wiz-product-header">
              <FileText size={14} style={{ color: 'var(--accent, #0891b2)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="wiz-product-title">{prod.historyItem.productName || '—'}</div>
                <div className="wiz-product-meta">
                  {prod.historyItem.structure}
                  {spreadMm > 0 && cutMm > 0 && <span style={{ marginLeft: 8 }}>{spreadMm}×{cutMm}mm</span>}
                </div>
              </div>
              <button
                className="wiz-btn wiz-btn--danger"
                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                onClick={() => removeProduct(pIdx)}
                aria-label={`Xóa sản phẩm ${prod.historyItem.productName}`}
              >
                <Trash2 size={12} /> Xóa
              </button>
            </div>

            <table className="wiz-tier-table">
              <thead>
                <tr>
                  <th scope="col">Số lượng</th>
                  <th scope="col">Giá chốt (tham khảo)</th>
                  <th scope="col">Giá báo khách</th>
                  <th scope="col" style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {prod.tiers.map((tier, tIdx) => {
                  const diff = tier.baoGia - tier.finalPrice;
                  const diffPct = tier.finalPrice > 0 ? (diff / tier.finalPrice) * 100 : 0;
                  const isLow = tier.baoGia > 0 && tier.baoGia < tier.finalPrice;
                  return (
                    <tr key={tIdx}>
                      <td>
                        <input
                          className="wiz-tier-input"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={tier.quantity || ''}
                          onChange={e => updateTier(pIdx, tIdx, 'quantity', Number(e.target.value))}
                          placeholder="Số lượng"
                          aria-label="Số lượng"
                        />
                      </td>
                      <td>
                        <div style={{ color: 'var(--muted, #9ca3af)', fontSize: '0.82rem' }}>
                          {dinhDangSo(tier.finalPrice)} ₫
                        </div>
                      </td>
                      <td>
                        <input
                          className={`wiz-tier-input ${isLow ? 'wiz-tier-input--warn' : ''}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={tier.baoGia || ''}
                          onChange={e => updateTier(pIdx, tIdx, 'baoGia', Number(e.target.value))}
                          placeholder="Giá báo"
                          aria-label="Giá báo khách"
                        />
                        {tier.baoGia > 0 && tier.finalPrice > 0 && (
                          <div className={`wiz-tier-diff ${diff >= 0 ? 'wiz-tier-diff--pos' : 'wiz-tier-diff--neg'}`}>
                            {diff >= 0 ? '+' : ''}{dinhDangSo(diff)} ₫ ({diffPct.toFixed(1)}%)
                          </div>
                        )}
                        {isLow && (
                          <div className="wiz-tier-warn" role="alert">
                            <AlertTriangle size={11} /> Giá báo thấp hơn giá chốt
                          </div>
                        )}
                      </td>
                      <td>
                        {prod.tiers.length > 1 && (
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #9ca3af)', padding: 4 }}
                            onClick={() => removeTier(pIdx, tIdx)}
                            aria-label="Xóa mức số lượng"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="wiz-add-tier" onClick={() => addTier(pIdx)}>
              <Plus size={13} /> Thêm mức số lượng
            </button>
          </div>
        );
      })}

      <div style={{ position: 'relative' }}>
        {showSearch ? (
          <div>
            <div className="wiz-search-box" style={{ marginBottom: 6 }}>
              <Search size={14} className="wiz-search-icon" />
              <input
                className="wiz-search-input"
                placeholder="Tìm bảng tính giá..."
                value={searchSP}
                onChange={e => setSearchSP(e.target.value)}
                autoFocus
              />
            </div>
            <div className="wiz-product-search-dropdown">
              {candidateSPs.length === 0 ? (
                <div className="wiz-empty" style={{ padding: '16px' }}>
                  Không tìm thấy bảng tính giá nào cho khách hàng này.
                </div>
              ) : candidateSPs.map(item => {
                const alreadyAdded = addedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`wiz-product-option ${alreadyAdded ? 'wiz-product-option--disabled' : ''}`}
                    onClick={() => !alreadyAdded && addProduct(item)}
                    role="button"
                    tabIndex={alreadyAdded ? -1 : 0}
                    onKeyDown={e => e.key === 'Enter' && !alreadyAdded && addProduct(item)}
                  >
                    <FileText size={14} style={{ color: 'var(--accent, #0891b2)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>
                        {item.structure} · {dinhDangSo(item.quantity)} cái · {dinhDangSo(item.finalPrice)} ₫
                        {alreadyAdded && <span style={{ marginLeft: 6, color: 'var(--accent, #0891b2)' }}>✓ Đã thêm</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="wiz-btn wiz-btn--ghost" style={{ marginTop: 6 }} onClick={() => { setShowSearch(false); setSearchSP(''); }}>
              Hủy
            </button>
          </div>
        ) : (
          <button className="wiz-add-product" onClick={() => setShowSearch(true)}>
            <Plus size={15} /> Thêm sản phẩm khác
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD — STEP 3: XÁC NHẬN & LƯU
// ════════════════════════════════════════════════════════════
function BuocXacNhan({
  customer, products, terms, onTermsChange, currentSellerName,
}: {
  customer: Customer;
  products: WizardProduct[];
  terms: WizardState['terms'];
  onTermsChange: (t: WizardState['terms']) => void;
  currentSellerName: string;
}) {
  const today = new Date().toLocaleDateString('vi-VN');
  return (
    <div>
      <p className="wiz-section-title">Thông tin chung</p>
      <div className="wiz-confirm-section" style={{ marginBottom: 16 }}>
        <div className="wiz-confirm-row">
          <span className="wiz-confirm-label">Khách hàng:</span>
          <span className="wiz-confirm-value">{tenKhachHang(customer)}</span>
        </div>
        <div className="wiz-confirm-row">
          <span className="wiz-confirm-label">Ngày tạo:</span>
          <span className="wiz-confirm-value">{today}</span>
        </div>
        <div className="wiz-confirm-row">
          <span className="wiz-confirm-label">Người tạo:</span>
          <span className="wiz-confirm-value">{currentSellerName || '—'}</span>
        </div>
      </div>

      <p className="wiz-section-title">Điều khoản báo giá</p>
      <div className="wiz-terms-grid">
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Hiệu lực (ngày)</label>
          <input className="wiz-terms-input" type="number" min={1}
            value={terms.validityDays}
            onChange={e => onTermsChange({ ...terms, validityDays: Number(e.target.value) })} />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Điều khoản thanh toán</label>
          <input className="wiz-terms-input" value={terms.paymentTerms}
            onChange={e => onTermsChange({ ...terms, paymentTerms: e.target.value })}
            placeholder="VD: Thanh toán 30 ngày" />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Thời gian giao hàng</label>
          <input className="wiz-terms-input" value={terms.deliveryTime}
            onChange={e => onTermsChange({ ...terms, deliveryTime: e.target.value })}
            placeholder="VD: 7-10 ngày làm việc" />
        </div>
      </div>
      <div className="wiz-terms-field" style={{ marginBottom: 16 }}>
        <label className="wiz-terms-label">Ghi chú</label>
        <textarea className="wiz-terms-textarea" value={terms.notes}
          onChange={e => onTermsChange({ ...terms, notes: e.target.value })}
          placeholder="Ghi chú thêm cho báo giá..." />
      </div>

      <p className="wiz-section-title">Tóm tắt sản phẩm</p>
      <div className="wiz-confirm-section">
        <table className="wiz-confirm-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Sản phẩm</th>
              <th scope="col">Số mức giá</th>
              <th scope="col">Giá báo (thấp – cao)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((prod, idx) => {
              const prices = prod.tiers.map(t => t.baoGia).filter(p => p > 0);
              const minP = prices.length ? Math.min(...prices) : 0;
              const maxP = prices.length ? Math.max(...prices) : 0;
              return (
                <tr key={prod.historyItem.id}>
                  <td style={{ color: 'var(--muted, #6b7280)' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{prod.historyItem.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>{prod.historyItem.structure}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{prod.tiers.length} mức</td>
                  <td>
                    {prices.length > 0 ? (
                      <span style={{ fontWeight: 600 }}>
                        {minP === maxP ? dinhDangSo(minP) : `${dinhDangSo(minP)} – ${dinhDangSo(maxP)}`} ₫
                      </span>
                    ) : <span style={{ color: 'var(--muted, #9ca3af)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD CONTAINER
// ════════════════════════════════════════════════════════════
function TaoBaoGiaWizard({ onClose }: { onClose: () => void }) {
  const store = dungCuaHangTinhGia() as any;
  const { history, currentSellerName, materials, constants, profitTable, smallWidthPrices, taoBaoGiaMoi } = store;

  const [state, setState] = useState<WizardState>({
    customer: null,
    products: [],
    terms: { vatRate: 10, validityDays: 30, paymentTerms: 'Thanh toán 30 ngày', deliveryTime: '7-10 ngày làm việc', notes: '' },
  });
  const [error, setError] = useState('');
  const [errorSection, setErrorSection] = useState<1 | 2 | 3 | null>(null);
  const [saving, setSaving] = useState(false);

  const section2Ref = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);

  const handleCustomerSelect = (c: Customer) => {
    setState(prev => ({ ...prev, customer: c }));
    // Auto-scroll to section 2 after selecting customer
    setTimeout(() => {
      section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleSave = useCallback((sendForApproval: boolean) => {
    setError('');
    setErrorSection(null);
    if (!state.customer) {
      setError('Vui lòng chọn khách hàng');
      setErrorSection(1);
      section1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (state.products.length === 0) {
      setError('Vui lòng thêm ít nhất 1 sản phẩm');
      setErrorSection(2);
      section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const missing = state.products.find(p => p.tiers.length === 0 || p.tiers.every(t => t.quantity <= 0));
    if (missing) {
      setError(`Sản phẩm "${missing.historyItem.productName}" chưa có mức số lượng hợp lệ`);
      setErrorSection(2);
      section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSaving(true);
    try {
      const products: QuoteProductLine[] = state.products.map(prod => {
        const tiers: QuoteTier[] = prod.tiers
          .filter(t => t.quantity > 0)
          .map(t => ({
            historyItemId: prod.historyItem.id,
            quantity: t.quantity,
            finalPrice: t.finalPrice,
            chotGia: t.baoGia,
          }));
        return {
          sourceHistoryItemId: prod.historyItem.id,
          productName: prod.historyItem.productName,
          structure: prod.historyItem.structure,
          quantity: tiers[0]?.quantity ?? prod.historyItem.quantity,
          finalPrice: tiers[0]?.finalPrice ?? prod.historyItem.finalPrice,
          chotGia: tiers[0]?.chotGia,
          input: { ...prod.historyItem.input },
          tiers,
        };
      });
      taoBaoGiaMoi({
        customer: state.customer ? tenKhachHang(state.customer) : '',
        products,
        terms: state.terms,
        sendForApproval,
      });
      onClose();
    } catch {
      setError('Có lỗi khi lưu báo giá. Vui lòng thử lại.');
      setSaving(false);
    }
  }, [state.products, state.customer, state.terms, taoBaoGiaMoi, onClose]);

  const canSaveDraft = !!state.customer;
  const canSubmit = !!state.customer && state.products.length > 0;

  return (
    <div className="crm-root" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{WIZARD_STYLES}</style>

      {/* Sticky Header */}
      <div className="sp-sticky-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text, #1e293b)', margin: 0 }}>Tạo báo giá mới</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="wiz-btn wiz-btn--secondary" onClick={() => handleSave(false)} disabled={saving || !canSaveDraft}>
            Lưu nháp
          </button>
          <button className="wiz-btn wiz-btn--primary" onClick={() => handleSave(true)} disabled={saving || !canSubmit}>
            <CheckCircle2 size={14} /> Lưu & Gửi duyệt
          </button>
          <button className="wiz-btn wiz-btn--ghost" onClick={onClose} style={{ padding: '6px 8px' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {error && (
          <div className="wiz-error" role="alert">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Section 1: Khách hàng */}
        <div ref={section1Ref} className={`sp-section${errorSection === 1 ? ' sp-section--error' : ''}`}>
          <h3 className="sp-section-title">
            <span className="sp-section-num">1</span>
            Khách hàng
          </h3>
          <BuocChonKhachHang
            selected={state.customer}
            onSelect={handleCustomerSelect}
          />
        </div>

        {/* Section 2: Sản phẩm & Giá */}
        <div ref={section2Ref} className={`sp-section${!state.customer ? ' sp-section--disabled' : ''}${errorSection === 2 ? ' sp-section--error' : ''}`}>
          {!state.customer && (
            <div className="sp-disabled-overlay">Chọn khách hàng để tiếp tục</div>
          )}
          <h3 className="sp-section-title">
            <span className="sp-section-num">2</span>
            Sản phẩm & Giá
          </h3>
          {state.customer && (
            <BuocChonSanPham
              customer={state.customer}
              history={history}
              products={state.products}
              onProductsChange={p => setState(prev => ({ ...prev, products: p }))}
              materials={materials}
              constants={constants}
              profitTable={profitTable}
              smallWidthPrices={smallWidthPrices}
            />
          )}
        </div>

        {/* Section 3: Điều khoản & Xác nhận */}
        <div className={`sp-section${!state.customer ? ' sp-section--disabled' : ''}${errorSection === 3 ? ' sp-section--error' : ''}`}>
          {!state.customer && (
            <div className="sp-disabled-overlay">Chọn khách hàng để tiếp tục</div>
          )}
          <h3 className="sp-section-title">
            <span className="sp-section-num">3</span>
            Điều khoản & Xác nhận
          </h3>
          {state.customer && (
            <BuocXacNhan
              customer={state.customer}
              products={state.products}
              terms={state.terms}
              onTermsChange={t => setState(prev => ({ ...prev, terms: t }))}
              currentSellerName={currentSellerName || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTE DETAIL PANEL — slide-in xem/sửa báo giá
// ════════════════════════════════════════════════════════════
type QuoteEditDraft = {
  customer: string;
  productName: string;
  chotGia: string;
  quoteStatus: string;
};

function QuoteDetailPanel({
  item, isAdmin, onClose, onLoadCalc, onPatch,
}: {
  item: HistoryItem;
  isAdmin: boolean;
  onClose: () => void;
  onLoadCalc: (id: string) => void;
  onPatch: (id: string, patch: Partial<Pick<HistoryItem, 'customer' | 'productName' | 'chotGia' | 'quoteStatus'>>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<QuoteEditDraft>({
    customer: item.customer,
    productName: item.productName,
    chotGia: item.chotGia ? String(item.chotGia) : '',
    quoteStatus: item.quoteStatus ?? 'drafted',
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const isDirty = editing && (
    draft.customer !== item.customer ||
    draft.productName !== item.productName ||
    draft.chotGia !== (item.chotGia ? String(item.chotGia) : '') ||
    draft.quoteStatus !== (item.quoteStatus ?? 'drafted')
  );

  function buildPatch() {
    const patch: Partial<Pick<HistoryItem, 'customer' | 'productName' | 'chotGia' | 'quoteStatus'>> = {};
    if (draft.customer !== item.customer) patch.customer = draft.customer;
    if (draft.productName !== item.productName) patch.productName = draft.productName;
    const parsedGia = draft.chotGia ? Number(draft.chotGia.replace(/\D/g, '')) : 0;
    if (parsedGia !== (item.chotGia ?? 0)) patch.chotGia = parsedGia || undefined;
    if (draft.quoteStatus !== (item.quoteStatus ?? 'drafted')) patch.quoteStatus = draft.quoteStatus as QuoteStatus;
    return patch;
  }

  function savePatch(shouldClose = false) {
    const patch = buildPatch();
    if (Object.keys(patch).length > 0) onPatch(item.id, patch);
    setEditing(false);
    setConfirmSave(false);
    setConfirmClose(false);
    if (shouldClose) onClose();
  }

  function handleClose() {
    if (isDirty) { setConfirmClose(true); return; }
    onClose();
  }

  function handleSave() {
    if (!isDirty) { setEditing(false); return; }
    setConfirmSave(true);
  }

  const status = layTrangThai(item);
  const cauHinh = QUOTE_STATUS_CONFIG[status];
  const shownPrice = item.chotGia && item.chotGia > 0 ? item.chotGia : item.finalPrice;

  return (
    <>
      <style>{WIZARD_STYLES}</style>
      {/* Backdrop */}
      <div onClick={handleClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />

      {/* Confirm close dialog */}
      {confirmClose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Chưa lưu thay đổi</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 20 }}>
              Bạn có thay đổi chưa được lưu. Đóng sẽ mất các thay đổi này.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="wiz-btn wiz-btn--secondary" onClick={() => setConfirmClose(false)}>Tiếp tục chỉnh sửa</button>
              <button className="wiz-btn wiz-btn--primary" onClick={() => savePatch(true)}>Lưu & đóng</button>
              <button className="wiz-btn wiz-btn--danger" onClick={onClose}>Đóng không lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm save dialog */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 26px', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Xác nhận lưu thay đổi?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 18 }}>Thao tác này sẽ cập nhật báo giá và ghi nhật ký thao tác.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="wiz-btn wiz-btn--secondary" onClick={() => setConfirmSave(false)}>Hủy</button>
              <button className="wiz-btn wiz-btn--primary" onClick={() => savePatch(false)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label={`Báo giá ${item.quoteCode || item.id}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(60%, 640px)', background: 'var(--surface, #ffffff)',
          borderLeft: '1px solid var(--border)', zIndex: 50,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2, #f8f9fb)',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>
              BÁO GIÁ
              {isDirty && <span style={{ color: '#d97706', marginLeft: 6 }}>● Chưa lưu</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text, #1e293b)' }}>
              {item.quoteCode || item.id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!editing && (
              <button className="wiz-btn wiz-btn--secondary"
                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                onClick={() => setEditing(true)}>
                ✏️ Chỉnh sửa
              </button>
            )}
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Status badge */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 600, color: cauHinh.color, background: cauHinh.bg }}>
              ● {cauHinh.label}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.date}</span>
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Khách hàng</label>
                <input className="wiz-search-input" value={draft.customer}
                  onChange={e => setDraft(d => ({ ...d, customer: e.target.value }))}
                  style={{ paddingLeft: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Tên sản phẩm</label>
                <input className="wiz-search-input" value={draft.productName}
                  onChange={e => setDraft(d => ({ ...d, productName: e.target.value }))}
                  style={{ paddingLeft: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Giá chốt (₫)</label>
                <input className="wiz-search-input" type="text" inputMode="numeric"
                  value={draft.chotGia}
                  onChange={e => setDraft(d => ({ ...d, chotGia: e.target.value.replace(/[^\d]/g, '') }))}
                  placeholder="Để trống nếu chưa chốt"
                  style={{ paddingLeft: 12 }} />
                {draft.chotGia && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>
                    = {dinhDangSo(Number(draft.chotGia))} ₫
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Trạng thái</label>
                <select className="wiz-search-input" value={draft.quoteStatus}
                  onChange={e => setDraft(d => ({ ...d, quoteStatus: e.target.value }))}
                  style={{ paddingLeft: 12 }}>
                  {CAC_BUOC_QUY_TRINH.map(s => (
                    <option key={s} value={s}>{QUOTE_STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              {/* Read-only info */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ padding: '8px 12px', background: 'var(--surface2, #f8f9fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  Thông tin không thể chỉnh sửa
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Cấu trúc:</span><span style={{ fontFamily: "'Courier New', monospace" }}>{item.structure || '—'}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Số lượng:</span><span>{dinhDangSo(item.quantity)} cái</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Giá đề xuất:</span><span style={{ fontWeight: 600 }}>{dinhDangSo(item.finalPrice)} ₫</span></div>
                  {item.sellerName && <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Sale:</span><span>{item.sellerName}</span></div>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* General info */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--surface2, #f8f9fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Thông tin chung</div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Khách hàng:</span><span style={{ fontWeight: 500 }}>{item.customer || '—'}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Sản phẩm:</span><span>{item.productName || '—'}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Cấu trúc:</span><span style={{ fontFamily: "'Courier New', monospace" }}>{item.structure || '—'}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Số lượng:</span><span>{dinhDangSo(item.quantity)} cái</span></div>
                  {item.sellerName && <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Sale:</span><span>{item.sellerName}</span></div>}
                </div>
              </div>

              {/* Pricing info */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--surface2, #f8f9fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Kết quả tính giá</div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Giá đề xuất:</span><span style={{ fontWeight: 600 }}>{dinhDangSo(item.finalPrice)} ₫</span></div>
                  {item.chotGia && item.chotGia > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Giá chốt:</span><span style={{ fontWeight: 600, color: 'var(--green, #059669)' }}>{dinhDangSo(item.chotGia)} ₫</span></div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--muted)', minWidth: 100 }}>Tổng giá trị:</span><span style={{ fontWeight: 600 }}>{dinhDangSo(Math.round(shownPrice * item.quantity))} VNĐ</span></div>
                </div>
              </div>

              {/* Multi-product tiers */}
              {item.quoteProducts && item.quoteProducts.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--surface2, #f8f9fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Sản phẩm trong báo giá</div>
                  <div style={{ padding: '10px 12px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--muted)' }}>Sản phẩm</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--muted)' }}>Mức SL / giá báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.quoteProducts.map(p => (
                          <tr key={p.sourceHistoryItemId}>
                            <td style={{ padding: '6px', borderTop: '1px solid var(--border)', verticalAlign: 'top' }}>
                              <b>{p.productName}</b>
                              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{p.structure}</div>
                            </td>
                            <td style={{ padding: '6px', borderTop: '1px solid var(--border)', verticalAlign: 'top' }}>
                              {p.tiers.map((tier, i) => (
                                <div key={i} style={{ marginBottom: 2 }}>
                                  {dinhDangSo(tier.quantity)}: <b>{dinhDangSo(tier.chotGia ?? tier.finalPrice ?? 0)} ₫</b>
                                  <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: '0.75rem' }}>({dinhDangSo(tier.finalPrice)} ₫ giá chốt)</span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Single-product tiers */}
              {!item.quoteProducts?.length && item.tiers && item.tiers.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--surface2, #f8f9fb)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Bảng giá báo</div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem' }}>
                    {item.tiers.map((tier, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--muted)', minWidth: 100 }}>{dinhDangSo(tier.quantity)} cái:</span>
                        <span style={{ fontWeight: 600 }}>{dinhDangSo(tier.chotGia ?? tier.finalPrice ?? 0)} ₫</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          background: 'var(--surface2, #f8f9fb)',
        }}>
          {editing ? (
            <>
              <button className="wiz-btn wiz-btn--primary" onClick={handleSave}>💾 Lưu</button>
              <button className="wiz-btn wiz-btn--secondary" onClick={() => {
                setDraft({ customer: item.customer, productName: item.productName, chotGia: item.chotGia ? String(item.chotGia) : '', quoteStatus: item.quoteStatus ?? 'drafted' });
                setEditing(false);
              }}>Huỷ</button>
            </>
          ) : (
            <button className="wiz-btn wiz-btn--secondary" onClick={() => { onLoadCalc(item.id); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Eye size={13} /> Mở bảng tính giá
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({ role, menuDangChon }: { role: string; hienTaiSellerId?: string; menuDangChon?: string }) {
  const {
    history, loadHistoryItem: taiLichSu, setActiveModule: datPhan,
    updateQuoteStatus: capNhatTrangThaiDon, currentSellerId: hienTaiSellerId,
    saoChepBangTinh, khoaBaoGia, moKhoaBaoGia, huyBaoGia, kiemTraHetHan,
    patchHistoryItem,
  } = dungCuaHangTinhGia();
  const [search, setSearch] = useState('');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [confirmHuy, setConfirmHuy] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  React.useEffect(() => { kiemTraHetHan(); }, [kiemTraHetHan]);
  React.useEffect(() => {
    if (menuDangChon === 'pricing.create_quote') setShowWizard(true);
  }, [menuDangChon]);

  const isAdmin = role === 'admin';
  const laLichSuBaoGiaTheoKhach = menuDangChon === 'customers.quote_history';

  const myItems = useMemo(() => {
    let items = isAdmin ? history : history.filter(h => h.sellerId === hienTaiSellerId);
    items = items.filter(laBanGhiBaoGia);
    if (menuDangChon === 'overview.quotes_pending') items = items.filter(h => layTrangThai(h) === 'pending_approval');
    if (menuDangChon === 'orders.confirmed') items = items.filter(h => layTrangThai(h) === 'completed' || !!h.chotGia);
    if (menuDangChon === 'pricing.create_quote') items = items.filter(h => layTrangThai(h) === 'drafted');
    if (laLichSuBaoGiaTheoKhach) {
      items = items.filter(h => daGuiAdmin(h) && namTrongKhoangNgay(h, tuNgay, denNgay));
    }
    return items;
  }, [history, isAdmin, hienTaiSellerId, menuDangChon, laLichSuBaoGiaTheoKhach, tuNgay, denNgay]);

  // Stats cho admin: chỉ đếm muc đã gửi
  const statsItems = isAdmin ? myItems.filter(daGuiAdmin) : myItems;

  const handleOpen = (id: string) => {
    const item = history.find(h => h.id === id);
    if (!item) return;
    if (item.locked && !isAdmin) {
      alert('Báo giá đã bị khóa. Liên hệ Admin để mở khóa.');
      return;
    }
    setSelectedItem(item);
  };

  if (showWizard) {
    return <TaoBaoGiaWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="crm-root quote-root">
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder={laLichSuBaoGiaTheoKhach ? 'Nhập tên công ty/khách hàng, ví dụ: AAA...' : isAdmin ? 'Tìm theo nhân viên, khách hàng, sản phẩm...' : 'Tìm khách hàng, sản phẩm, chất liệu...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="crm-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        {!laLichSuBaoGiaTheoKhach && (
          <button
            className="wiz-btn wiz-btn--primary"
            style={{ flexShrink: 0 }}
            onClick={() => setShowWizard(true)}
          >
            <Plus size={14} /> Tạo báo giá mới
          </button>
        )}
        {laLichSuBaoGiaTheoKhach ? (
          <div className="crm-toolbar-right" style={{ gap: 8 }}>
            <input className="form-input" type="date" value={tuNgay} onChange={e => setTuNgay(e.target.value)} style={{ width: 150 }} title="Từ ngày" />
            <input className="form-input" type="date" value={denNgay} onChange={e => setDenNgay(e.target.value)} style={{ width: 150 }} title="Đến ngày" />
          </div>
        ) : isAdmin && (
          <div className="crm-toolbar-right">
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0 8px', whiteSpace: 'nowrap' }}>
              👑 Xem theo Seller
            </span>
          </div>
        )}
      </div>

      <StatsBar mucs={statsItems} isAdmin={isAdmin} />

      <div className="crm-list quote-list-container">
        {isAdmin ? (
          <AdminView
            mucs={myItems}
            search={search}
            chiTimKhachHang={laLichSuBaoGiaTheoKhach}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        ) : (
          <SaleView
            mucs={myItems}
            search={search}
            chiTimKhachHang={laLichSuBaoGiaTheoKhach}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
          />
        )}
      </div>

      {selectedItem && (
        <QuoteDetailPanel
          item={selectedItem}
          isAdmin={isAdmin}
          onClose={() => setSelectedItem(null)}
          onLoadCalc={(id) => { taiLichSu(id); datPhan('calculator'); }}
          onPatch={(id, patch) => {
            patchHistoryItem(id, patch);
            setSelectedItem(prev => prev ? { ...prev, ...patch } : prev);
          }}
        />
      )}
    </div>
  );
}
