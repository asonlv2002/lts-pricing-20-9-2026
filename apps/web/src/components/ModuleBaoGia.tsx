"use client";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  FileText,
  Search,
  Clock,
  Building2,
  Calendar,
  Send,
  ShieldCheck,
  PackageCheck,
  Eye,
  Users,
  ChevronDown,
  ChevronRight,
  XCircle,
  TimerOff,
  Copy,
  Lock,
  Unlock,
  Ban,
  FileDown,
  Layers,
  ClipboardEdit,
  UserPlus,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  X,
  Check,
} from "lucide-react";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import { dieuHuongMenuApp, menuKeyTinhGiaTheoItem } from "../lib/menu-route";
import { apCpsxNangCaoVaoHangSo } from "../lib/cpsx-nang-cao-pin";
import { tinhKetQuaNangCaoHieuLuc } from "../lib/dac-ta-nang-cao";
import ComboBoxDieuKhoan from "./ComboBoxDieuKhoan";
import { normalizeDisplayText } from "../lib/text-codec";
import {
  lapDongSanXuat,
  tinhBaoGia,
  xuLyDongGhiDe,
} from "../lib/manager-calculation";
import { getPricingDisplayMeta } from "../lib/pricing-display";
import type {
  AppConstants,
  HistoryItem,
  Material,
  ProfitRow,
  QuoteProductLine,
  QuoteStatus,
  OverrideTable,
  QuoteTerms,
  QuoteTier,
  SmallWidthMaterialPrice,
} from "../lib/types";
import { QUOTE_STATUS_CONFIG } from "../lib/types";
import {
  taoBaoGiaService,
  nopBaoGiaService,
  capNhatBaoGiaService,
  taoPricingSheetService,
  xoaBaoGiaService,
} from "../lib/api/service-lts";
import { mapHistoryToPricingSheet } from "../lib/api/pricing-sheet-mapper";
import {
  kiemTraMaKhachHang,
  laNguoiPhuTrach,
  locKhachTheoQuyen,
} from "../lib/customer-api";
import {
  countOverrideChanges,
  listOverrideChanges,
} from "../lib/override-display";
import {
  buildDefaultBagSpec,
  shouldShowBagSpecField,
  type QuoteProductBagSpec,
  generateStructureBackOptions,
} from "../lib/quote-product-spec";
import {
  boSoCauTruc,
  buildStructureFromLayers,
  cauTrucMatTrucTuLop,
} from "../lib/format-structure";
import BaoGiaPreviewModal from "./BaoGiaPreviewModal";
import NhapPinDuyetModal from "./auth/NhapPinDuyetModal";
import { useNhapPinPrompt, laHuyPin } from "../lib/useNhapPinPrompt";
import { WIZARD_STYLES } from "./wizard/wizard-styles";
import {
  coNhapBaoGia,
  docNhapBaoGia,
  luuNhapBaoGia,
  xoaNhapBaoGia,
} from "../lib/bao-gia-draft";

// ── Công đoạn sản xuất (dropdown ghi chú / mô tả khác) ──────────────────────
const STAGE_OPTIONS: { value: 'in' | 'ghep' | 'chia' | 'lam-tui'; label: string }[] = [
  { value: 'in', label: 'In' },
  { value: 'ghep', label: 'Ghép' },
  { value: 'chia', label: 'Chia' },
  { value: 'lam-tui', label: 'Làm túi' },
];

const STAGE_LABEL: Record<string, string> = {
  in: 'In',
  ghep: 'Ghép',
  chia: 'Chia',
  'lam-tui': 'Làm túi',
};

/** Editor dòng ghi chú / mô tả công đoạn — dropdown công đoạn + text + xóa.
 *  `single` = chỉ 1 dòng (Ghi chú công đoạn): không nút thêm, không xóa. */
function StageNoteEditor({
  value,
  onChange,
  placeholder,
  single = false,
}: {
  value: { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }[];
  onChange: (next: { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }[]) => void;
  placeholder: string;
  single?: boolean;
}) {
  const rows = single
    ? [value[0] ?? { stage: 'lam-tui' as const, text: '' }]
    : value.length
      ? value
      : [{ stage: 'lam-tui' as const, text: '' }];
  const set = (i: number, patch: Partial<{ stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(single ? next.slice(0, 1) : next);
  };
  const remove = (i: number) => {
    if (single) return;
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [{ stage: 'lam-tui' as const, text: '' }]);
  };
  const add = () => {
    if (single) return;
    onChange([...rows, { stage: 'lam-tui' as const, text: '' }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            className="wiz-spec-inline-select"
            value={row.stage}
            onChange={(e) => set(i, { stage: e.target.value as 'in' | 'ghep' | 'chia' | 'lam-tui' })}
            style={{ fontSize: '0.78rem', padding: '2px 6px', width: '92px', flexShrink: 0 }}
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            className="wiz-spec-inline-input"
            type="text"
            value={row.text}
            onChange={(e) => set(i, { text: e.target.value })}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 0 }}
          />
          {!single && (
            <button
              type="button"
              className="wiz-spec-toggle"
              style={{ padding: '2px 6px', fontSize: '0.72rem', flexShrink: 0 }}
              onClick={() => remove(i)}
              title="Xóa dòng"
            >
              🗑
            </button>
          )}
        </div>
      ))}
      {!single && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="wiz-spec-toggle"
            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
            onClick={add}
          >
            + Thêm
          </button>
        </div>
      )}
    </div>
  );
}

// ── Customer type (mirrors ModuleKhachHang) ──────────────────────────────────
interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  invoiceAddress?: string;
  sellerId?: string | null;
  secondarySellerId?: string | null;
  sellerName?: string;
  managers?: { userId: string; account?: string; fullName?: string | null }[];
  status: "active" | "inactive";
  crmStatus?: string;
  region?: string;
}

const LS_CUSTOMERS = "lts_customers";
const QUOTE_PREFILL_STORAGE_KEY = "lts_quote_prefill_from_history";

type QuotePrefillFromHistory = {
  customerName?: string;
  historyItemIds?: string[];
  quoteProducts?: QuoteProductLine[];
  terms?: QuoteTerms;
  createdAt?: string;
};

function docKhachHang(): Customer[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOMERS);
    if (raw) return JSON.parse(raw) as Customer[];
  } catch {
    /* ignore */
  }
  return [];
}

function tenKhachHang(c: Customer): string {
  return c.companyName || c.contactName || c.customerCode || c.id;
}

function tieuDeKhachHang(c: Customer): string {
  return (
    c.companyName ||
    c.contactName ||
    c.customerCode ||
    "Khách hàng chưa đặt tên"
  );
}

function metaKhachHang(c: Customer): string[] {
  const lines: string[] = [];
  if (c.customerCode) lines.push(`Mã: ${c.customerCode}`);
  lines.push(`MST: ${c.taxCode || "chưa có"}`);
  lines.push(
    c.sellerName ? `Sale: ${c.sellerName}` : `SĐT: ${c.phone || "chưa có"}`,
  );
  return lines;
}

function readQuotePrefillFromHistory(): QuotePrefillFromHistory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUOTE_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(QUOTE_PREFILL_STORAGE_KEY);
    const parsed = JSON.parse(raw) as QuotePrefillFromHistory;
    const hasHistoryItems =
      Array.isArray(parsed.historyItemIds) && parsed.historyItemIds.length > 0;
    const hasQuoteProducts =
      Array.isArray(parsed.quoteProducts) && parsed.quoteProducts.length > 0;
    return hasHistoryItems || hasQuoteProducts ? parsed : null;
  } catch {
    return null;
  }
}

function taoDieuKhoanThanhToan(soNgay: number): string {
  if (soNgay === 0) return "Thanh toán ngay khi nhận hàng";
  return `Thanh toán ${soNgay} ngày`;
}

/** Migrate `otherDescription` cũ (textarea báo giá cũ) → 1 dòng Mô tả khác (mặc định làm túi). */
function migrateOtherDescription(spec: QuoteProductBagSpec): void {
  const old = (spec.otherDescription || "").trim();
  if (!old) return;
  if (Array.isArray(spec.stageDescriptions) && spec.stageDescriptions.length > 0) return;
  spec.stageDescriptions = [{ stage: 'lam-tui', text: old }];
}

function buildWizardProductFromHistoryItem(
  item: HistoryItem,
  savedBagSpec?: Partial<QuoteProductBagSpec> | null,
): WizardProduct {
  const spec = buildDefaultBagSpec(item.input);
  // Merge bagSpec đã lưu (rộng/dài/hàn/đục lỗ/trục…) — không ghi đè bằng default
  if (savedBagSpec) {
    Object.assign(spec, savedBagSpec);
  }
  // Migrate otherDescription cũ → 1 dòng Mô tả khác (mặc định làm túi)
  migrateOtherDescription(spec);
  // Mặc định đơn giá trục = giá 1 trục từ engine (DT × đơn giá A/B), không dùng cylUnitPrice (đ/m²)
  // Chỉ fill khi chưa có giá từ bagSpec đã lưu
  if (!spec.cylinderUnitPrice && item.input.cylLength > 0) {
    const { materials, constants, profitTable, smallWidthPrices } =
      dungCuaHangTinhGia.getState();
    const res = tinhBaoGia(
      item.input,
      materials,
      constants,
      profitTable,
      smallWidthPrices,
    );
    if (res?.cylinderCostPerUnit)
      spec.cylinderUnitPrice = Math.round(res.cylinderCostPerUnit);
  }
  if (item.input.layer2AltId && !spec.structureBack) {
    const { materials } = dungCuaHangTinhGia.getState();
    const opts = generateStructureBackOptions(item.input, spec.bagType, materials);
    if (opts.length > 0) {
      spec.structureBack = opts[0].structureBack;
      spec.bottomFollows = opts[0].bottomFollows;
      spec.structureSwapped = opts[0].structureSwapped;
    }
  }
  // Đơn 2 mặt: chuỗi engine có notation web ghép "[A + B]" — báo giá hiển thị theo mặt,
  // mặt trước build từ layer IDs (layer2AltId là mặt sau, xem generateStructureBackOptions).
  let historyItemHienThi = item;
  if (item.input.layer2AltId) {
    const { materials } = dungCuaHangTinhGia.getState();
    const cauTrucMatTruoc = cauTrucMatTrucTuLop(materials, item.input);
    if (cauTrucMatTruoc) historyItemHienThi = { ...item, structure: cauTrucMatTruoc };
  }
  return {
    historyItem: historyItemHienThi,
    tiers: [
      {
        quantity: item.quantity,
        finalPrice: item.finalPrice,
        baoGia: item.chotGia ?? item.finalPrice,
      },
    ],
    bagSpec: spec,
  };
}

function buildWizardProductFromQuoteProductLine(
  qp: QuoteProductLine,
): WizardProduct {
  const historyItem: HistoryItem = {
    id: qp.sourceHistoryItemId,
    date: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    customer: "",
    productName: qp.productName,
    structure: qp.structure,
    quantity: qp.quantity,
    finalPrice: qp.finalPrice,
    chotGia: qp.chotGia,
    profitRate: qp.profitRate,
    input: qp.input,
  };
  const spec = buildDefaultBagSpec(qp.input);
  if (qp.bagSpec) {
    Object.assign(spec, qp.bagSpec);
  }
  // Migrate otherDescription cũ → 1 dòng Mô tả khác (mặc định làm túi)
  migrateOtherDescription(spec);
  // Chỉ fill từ engine khi chưa có giá trục (tạo mới / bagSpec cũ thiếu field)
  if (!spec.cylinderUnitPrice && qp.input.cylLength > 0) {
    const { materials, constants, profitTable, smallWidthPrices } =
      dungCuaHangTinhGia.getState();
    const res = tinhBaoGia(
      qp.input,
      materials,
      constants,
      profitTable,
      smallWidthPrices,
    );
    if (res?.cylinderCostPerUnit)
      spec.cylinderUnitPrice = Math.round(res.cylinderCostPerUnit);
  }
  if (qp.input.layer2AltId && !spec.structureBack) {
    const { materials } = dungCuaHangTinhGia.getState();
    const opts = generateStructureBackOptions(qp.input, spec.bagType, materials);
    if (opts.length > 0) {
      spec.structureBack = opts[0].structureBack;
      spec.bottomFollows = opts[0].bottomFollows;
      spec.structureSwapped = opts[0].structureSwapped;
    }
  }
  // Đơn 2 mặt: chuỗi engine có notation web ghép "[A + B]" — báo giá hiển thị theo mặt.
  if (qp.input.layer2AltId) {
    const { materials } = dungCuaHangTinhGia.getState();
    const cauTrucMatTruoc = cauTrucMatTrucTuLop(materials, qp.input);
    if (cauTrucMatTruoc) historyItem.structure = cauTrucMatTruoc;
  }
  return {
    historyItem,
    tiers: qp.tiers.map((t) => ({
      quantity: t.quantity,
      finalPrice: t.finalPrice,
      baoGia: t.chotGia ?? t.finalPrice,
    })),
    bagSpec: spec,
  };
}

// ── Wizard types ──────────────────────────────────────────────────────────────
interface TierRow {
  quantity: number;
  finalPrice: number; // giá chốt từ bảng tính (tham khảo)
  baoGia: number; // giá báo khách (editable)
}

interface WizardProduct {
  historyItem: HistoryItem;
  tiers: TierRow[];
  bagSpec: QuoteProductBagSpec;
  expanded?: boolean;
}

interface WizardState {
  customer: Customer | null;
  products: WizardProduct[];
  terms: {
    vatRate: number;
    vatCylinderRate: number;
    validityDays: number;
    paymentTerms: string;
    deliveryTime: string;
    deliveryAddress?: string;
    notes: string;
    quantityTolerance: number;
    techRequirement: string;
  };
}

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const CAC_BUOC_QUY_TRINH: QuoteStatus[] = [
  "drafted",
  "pending_approval",
  "approved",
  "sent",
  "completed",
];

// Bước Admin được phép xem & thao tác (không có drafted/sent vì đó là phía Sale)
const CAC_BUOC_ADMIN: QuoteStatus[] = [
  "pending_approval",
  "approved",
  "completed",
];

const ICON_BUOC: Record<QuoteStatus, React.ReactNode> = {
  drafted: <FileText size={13} />,
  sent: <Send size={13} />,
  pending_approval: <Clock size={13} />,
  approved: <ShieldCheck size={13} />,
  rejected: <Ban size={13} />,
  completed: <PackageCheck size={13} />,
  cancelled: <XCircle size={13} />,
  expired: <TimerOff size={13} />,
};

const VAT_OPTIONS = ["0%", "5%", "7%", "8%", "10%"];
const HIEU_LUC_OPTIONS = [
  "7 ngày",
  "14 ngày",
  "30 ngày",
  "60 ngày",
  "90 ngày",
  "180 ngày",
];
const THANH_TOAN_OPTIONS = [
  "Thanh toán ngay khi nhận hàng",
  "Thanh toán trong vòng 15 ngày kể từ ngày nhận hàng",
  "Thanh toán trong vòng 30 ngày kể từ ngày nhận hàng",
  "Thanh toán trong vòng 45 ngày kể từ ngày nhận hàng",
  "Thanh toán trong vòng 60 ngày kể từ ngày nhận hàng",
  "Thanh toán trong vòng 90 ngày kể từ ngày nhận hàng",
];
const GIAO_HANG_OPTIONS = [
  "3-5 ngày làm việc",
  "5-7 ngày làm việc",
  "7-10 ngày làm việc",
  "10-15 ngày làm việc",
  "15-20 ngày làm việc",
  "20-30 ngày làm việc",
];

const DUNG_SAI_OPTIONS = ["5%", "7%", "8%", "10%", "15%"];
const YEU_CAU_KY_THUAT_OPTIONS = ["Chạy theo market ký duyệt"];

function layTrangThai(muc: HistoryItem): QuoteStatus {
  // Luôn dùng quoteStatus tường minh; fallback 'drafted' nếu muc cũ chưa có truong này
  return muc.quoteStatus ?? "drafted";
}

// Một muc "đã gửi lên admin" khi status >= pending_approval
function daGuiAdmin(muc: HistoryItem): boolean {
  const s = layTrangThai(muc);
  return s === "pending_approval" || s === "approved" || s === "completed";
}

function laBanGhiBaoGia(muc: HistoryItem): boolean {
  return !!(
    muc.isQuote ||
    muc.quoteProducts?.length ||
    (muc.quoteCode && muc.tiers?.length)
  );
}

function dinhDangSo(n: number) {
  return n.toLocaleString("vi-VN");
}

function doiNgayVnSangMs(date?: string): number {
  if (!date) return 0;
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function namTrongKhoangNgay(
  item: HistoryItem,
  tuNgay: string,
  denNgay: string,
): boolean {
  const ms = doiNgayVnSangMs(item.date);
  if (!ms) return true;
  if (tuNgay && ms < new Date(tuNgay).setHours(0, 0, 0, 0)) return false;
  if (denNgay && ms > new Date(denNgay).setHours(23, 59, 59, 999)) return false;
  return true;
}

function demGhiDe(ov?: OverrideTable): number {
  return countOverrideChanges(ov);
}

function hienThiKhacBietGhiDe(
  ov: OverrideTable | undefined,
  lopNhom: string,
  nhanNhom: string,
) {
  const cacMuc = listOverrideChanges(ov);
  if (!cacMuc.length) return null;
  return (
    <>
      <div className={`override-diff-group-title ${lopNhom}`}>{nhanNhom}</div>
      {cacMuc.map((change) => (
        <div key={change.key} className="override-diff-item">
          <span className="diff-label">{change.label}</span>
          <span className="diff-arrow">→</span>
          <span className="diff-new">{change.value}</span>
        </div>
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN STATUS DROPDOWN — chỉ cho phép chọn trong CAC_BUOC_ADMIN
// ════════════════════════════════════════════════════════════
function HopChonTrangThaiAdmin({
  muc,
  khiCapNhat,
}: {
  muc: HistoryItem;
  khiCapNhat: (muc: HistoryItem, status: QuoteStatus) => Promise<void> | void;
}) {
  const [mo, datMo] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  return (
    <div
      className="qcard-status-dropdown-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="qcard-status-trigger"
        style={{
          color: cauHinh.color,
          background: cauHinh.bg,
          borderColor: cauHinh.color + "55",
        }}
        onClick={() => datMo((v) => !v)}
        title="Đổi trạng thái"
      >
        <span
          className="qcard-status-dot"
          style={{ background: cauHinh.color }}
        />
        <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
        <span>{cauHinh.label}</span>
        <span className="qcard-status-trigger-caret">▾</span>
      </button>

      {mo && (
        <>
          <div
            className="qcard-dropdown-backdrop"
            onClick={() => datMo(false)}
          />
          <div className="qcard-dropdown">
            {CAC_BUOC_ADMIN.map((buoc) => {
              const cauHinhBuoc = QUOTE_STATUS_CONFIG[buoc];
              const dangChon = buoc === hienTai;
              return (
                <button
                  key={buoc}
                  className={`qcard-dropdown-item ${dangChon ? "active" : ""}`}
                  onClick={() => {
                    void khiCapNhat(muc, buoc);
                    datMo(false);
                  }}
                >
                  <span
                    className="qcard-dropdown-dot"
                    style={{ background: cauHinhBuoc.color }}
                  />
                  <span className="qcard-dropdown-icon">{ICON_BUOC[buoc]}</span>
                  <span className="qcard-dropdown-label">
                    {cauHinhBuoc.label}
                  </span>
                  <span className="qcard-dropdown-desc">
                    {cauHinhBuoc.description}
                  </span>
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
function DieuKhienTrangThaiSale({
  muc,
  khiCapNhat,
}: {
  muc: HistoryItem;
  khiCapNhat: (muc: HistoryItem, status: QuoteStatus) => Promise<void> | void;
}) {
  const [xacNhan, datXacNhan] = useState(false);
  const [dangGui, datDangGui] = useState(false);
  const hienTai = layTrangThai(muc);
  const cauHinh = QUOTE_STATUS_CONFIG[hienTai];

  const guiDuyet = async () => {
    datDangGui(true);
    try {
      await khiCapNhat(muc, "pending_approval");
      datXacNhan(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Không gửi được báo giá lên máy chủ.",
      );
    } finally {
      datDangGui(false);
    }
  };

  if (hienTai === "drafted") {
    return (
      <div className="qcard-sale-controls" onClick={(e) => e.stopPropagation()}>
        {/* Badge đang soạn */}
        <span
          className="qcard-status-trigger"
          style={{
            color: cauHinh.color,
            background: cauHinh.bg,
            borderColor: cauHinh.color + "55",
            cursor: "default",
          }}
        >
          <span
            className="qcard-status-dot"
            style={{ background: cauHinh.color }}
          />
          <span className="qcard-status-trigger-icon">
            {ICON_BUOC[hienTai]}
          </span>
          <span>{cauHinh.label}</span>
        </span>

        {/* Nút Gửi */}
        {!xacNhan ? (
          <button
            className="qcard-send-btn"
            onClick={() => datXacNhan(true)}
            disabled={dangGui}
            title="Gửi báo giá cho Admin duyệt"
          >
            <Send size={12} />
            Gửi Admin
          </button>
        ) : (
          <div className="qcard-send-xacNhan">
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Xác nhận gửi?
            </span>
            <button
              className="qcard-send-btn qcard-send-btn--yes"
              disabled={dangGui}
              onClick={() => {
                void guiDuyet();
              }}
            >
              {dangGui ? "..." : "✓"}
            </button>
            <button
              className="qcard-send-btn qcard-send-btn--no"
              disabled={dangGui}
              onClick={() => datXacNhan(false)}
            >
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
      style={{
        color: cauHinh.color,
        background: cauHinh.bg,
        borderColor: cauHinh.color + "55",
        cursor: "default",
      }}
      title={cauHinh.description}
    >
      <span
        className="qcard-status-dot"
        style={{ background: cauHinh.color }}
      />
      <span className="qcard-status-trigger-icon">{ICON_BUOC[hienTai]}</span>
      <span>{cauHinh.label}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION CARD — dùng chung, nhận control node từ ngoài
// ════════════════════════════════════════════════════════════
function QuotationCard({
  muc,
  onClick,
  statusControl,
  onCopy,
  onDelete,
}: {
  muc: HistoryItem;
  onClick: () => void;
  statusControl: React.ReactNode;
  onCopy?: () => void;
  onDelete?: () => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [previewState, setPreviewState] = useState<{
    item: HistoryItem;
    customerInfo: {
      address?: string;
      taxCode?: string;
      phone?: string;
      fax?: string;
      description?: string;
    };
  } | null>(null);
  const spreadMm = muc.input.spreadWidth
    ? Math.round(muc.input.spreadWidth * 1000)
    : 0;
  const cutMm = muc.input.cutStep ? Math.round(muc.input.cutStep * 1000) : 0;
  const sizeStr = spreadMm && cutMm ? `${spreadMm} × ${cutMm} mm` : "—";
  const numColors = muc.input.numColors ?? 0;
  const shownPrice =
    muc.chotGia && muc.chotGia > 0 ? muc.chotGia : muc.finalPrice;
  const hienThiGia = getPricingDisplayMeta(muc.input);
  const diff =
    muc.chotGia && muc.chotGia > 0 ? muc.chotGia - muc.finalPrice : 0;
  const diffPct =
    diff !== 0 && muc.finalPrice > 0 ? (diff / muc.finalPrice) * 100 : 0;
  const saleCount = demGhiDe(muc.saleOverrides);
  const adminCount = demGhiDe(muc.adminOverrides);
  const hasAnyOverrides = saleCount > 0 || adminCount > 0;
  const { materials, constants, profitTable, smallWidthPrices } =
    dungCuaHangTinhGia();

  const specRows = useMemo(() => {
    const res = tinhBaoGia(
      muc.input,
      materials,
      constants,
      profitTable,
      smallWidthPrices,
    );
    if (!res) return [];
    const base = lapDongSanXuat(res, constants).uniRows;
    const source = adminCount > 0 ? (muc.saleOverrides ?? {}) : {};
    const current =
      adminCount > 0 ? (muc.adminOverrides ?? {}) : (muc.saleOverrides ?? {});
    return xuLyDongGhiDe(base, source, current).rows;
  }, [
    muc.input,
    muc.saleOverrides,
    muc.adminOverrides,
    materials,
    constants,
    profitTable,
    smallWidthPrices,
    adminCount,
  ]);

  return (
    <div className="quote-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="quote-header">
        <div className="quote-id-wrap">
          <FileText size={14} className="quote-icon" />
          <span className="quote-id">{muc.date}</span>
        </div>
        {statusControl}
      </div>

      <div className="quote-body">
        <h3 className="quote-title">{muc.productName || "—"}</h3>

        <div className="quote-meta">
          <div className="quote-meta-muc">
            <Building2 size={13} style={{ color: "#4f46e5" }} />
            <span style={{ fontWeight: 600, color: "var(--text)" }}>
              {muc.customer || "—"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              background: "var(--surface2)",
              padding: "10px 12px",
              borderRadius: "8px",
              gap: "5px",
              fontSize: "0.8rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                Chất liệu:
              </span>
              <strong style={{ color: "var(--text)", fontSize: "0.76rem" }}>
                {muc.structure || "—"}
              </strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                Kích thước:
              </span>
              <strong style={{ color: "var(--text)" }}>{sizeStr}</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                Số lượng:
              </span>
              <span>
                <strong style={{ color: "var(--accent)" }}>
                  {dinhDangSo(muc.quantity)}
                </strong>{" "}
                {hienThiGia.quantityUnit}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                Màu in:
              </span>
              <span>{numColors > 0 ? `${numColors} màu` : "Không in"}</span>
            </div>
          </div>

          <div className="quote-meta-muc" style={{ marginTop: "4px" }}>
            <Calendar size={12} />
            <span style={{ fontSize: "0.76rem" }}>Ngày lập: {muc.date}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--border)",
            paddingTop: "10px",
            marginTop: "6px",
            marginBottom: "10px",
            fontSize: "0.82rem",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--dim)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
              }}
            >
              {hienThiGia.priceTitle}
            </div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>
              {dinhDangSo(muc.finalPrice)} đ
            </div>
          </div>
          {muc.chotGia && muc.chotGia > 0 ? (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: "var(--dim)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                }}
              >
                {hienThiGia.closedPriceTitle}
              </div>
              <div style={{ fontWeight: 700, color: "var(--green)" }}>
                {dinhDangSo(muc.chotGia)} đ
                <span
                  style={{
                    fontSize: "0.72rem",
                    marginLeft: 4,
                    color: diff >= 0 ? "var(--green)" : "var(--red)",
                  }}
                >
                  ({diff >= 0 ? "+" : ""}
                  {diffPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: "var(--dim)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                }}
              >
                Giá chốt
              </div>
              <div style={{ color: "var(--dim)", fontSize: "0.82rem" }}>
                Chưa chốt
              </div>
            </div>
          )}
        </div>

        <div className="quote-price-box">
          <div className="quote-price-label">Tổng giá trị ước tính</div>
          <div className="quote-price-giaTriue">
            {dinhDangSo(Math.round(shownPrice * muc.quantity))}{" "}
            <span className="quote-currency">VNĐ</span>
          </div>
        </div>
      </div>

      {/* Override diff button */}
      {hasAnyOverrides && (
        <>
          <button
            className="override-diff-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setShowDiff(!showDiff);
            }}
          >
            {showDiff ? "▾ Ẩn thay đổi" : "▸ Xem thay đổi"}
            <span className="override-diff-count">
              {saleCount} Sale / {adminCount} Admin
            </span>
          </button>
          {showDiff && (
            <div
              className="override-diff-summary"
              onClick={(e) => e.stopPropagation()}
            >
              {hienThiKhacBietGhiDe(muc.saleOverrides, "sale", "💼 Sale")}
              {hienThiKhacBietGhiDe(muc.adminOverrides, "admin", "👑 Admin")}
              <div
                className="override-diff-group-title"
                style={{ marginTop: 8 }}
              >
                📋 Đặc tả kỹ thuật sau thay đổi
              </div>
              {specRows.flatMap((row) =>
                row.materialDetails?.length
                  ? row.materialDetails.map((d, idx) => (
                      <div
                        key={`${row.rowKey}-${idx}`}
                        className="override-diff-item"
                      >
                        <span className="diff-label">
                          {row.stage} · {d.name}
                        </span>
                        <span className="diff-arrow">→</span>
                        <span className="diff-new">
                          Khổ{" "}
                          {d.width.toLocaleString("vi-VN", {
                            maximumFractionDigits: 3,
                          })}
                          m · VL{" "}
                          {row.inputVL.toLocaleString("vi-VN", {
                            maximumFractionDigits: 0,
                          })}
                          m ·{" "}
                          {d.matPrice.toLocaleString("vi-VN", {
                            maximumFractionDigits: 1,
                          })}
                          đ/m²
                        </span>
                      </div>
                    ))
                  : [
                      <div key={row.rowKey} className="override-diff-item">
                        <span className="diff-label">
                          {row.stage} · {row.mat || "—"}
                        </span>
                        <span className="diff-arrow">→</span>
                        <span className="diff-new">
                          Khổ{" "}
                          {row.width.toLocaleString("vi-VN", {
                            maximumFractionDigits: 3,
                          })}
                          m · TP{" "}
                          {row.meters.toLocaleString("vi-VN", {
                            maximumFractionDigits: 0,
                          })}
                          m · Hao{" "}
                          {row.waste.toLocaleString("vi-VN", {
                            maximumFractionDigits: 0,
                          })}
                          m · VL{" "}
                          {row.inputVL.toLocaleString("vi-VN", {
                            maximumFractionDigits: 0,
                          })}
                          m
                        </span>
                      </div>,
                    ],
              )}
            </div>
          )}
        </>
      )}

      <div
        className="quote-footer"
        style={{
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: "0.75rem",
          gap: 4,
        }}
      >
        <Eye size={12} />
        Nhấn để mở bảng tính giá
        {muc.locked && (
          <span style={{ marginLeft: 8, color: "var(--orange)" }}>
            <Lock size={11} /> Đã khóa
          </span>
        )}
        {muc.quoteCode && (
          <span style={{ marginLeft: 8 }}>{muc.quoteCode}</span>
        )}
        {onCopy && (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--accent, #0891b2)",
              background: "rgba(8,145,178,0.08)",
              color: "var(--accent, #0891b2)",
              marginLeft: 8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
          >
            <Copy size={11} /> Sao chép
          </button>
        )}
        {muc.deletable && onDelete && (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #fca5a5",
              background: "rgba(220,38,38,0.08)",
              color: "#dc2626",
              marginLeft: 8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={11} /> Xóa
          </button>
        )}
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 6,
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface, #f3f4f6)",
            color: "var(--foreground, #111)",
            marginLeft: 8,
          }}
          onClick={(e) => {
            e.stopPropagation();
            const c = docKhachHang().find(
              (kh) =>
                kh.companyName === muc.customer ||
                kh.customerCode === muc.customer,
            );
            setPreviewState({
              item: muc,
              customerInfo: {
                address: c?.address || c?.invoiceAddress || "",
                taxCode: c?.taxCode || "",
                phone: c?.phone || "",
              },
            });
          }}
        >
          <FileText size={11} /> Xem PDF báo giá
        </button>
      </div>
      {previewState && (
        <BaoGiaPreviewModal
          open={!!previewState}
          onClose={() => setPreviewState(null)}
          item={previewState.item}
          customerInfo={previewState.customerInfo}
        />
      )}
    </div>
  );
}
// ════════════════════════════════════════════════════════════
function StatsBar({
  mucs,
  isAdmin,
}: {
  mucs: HistoryItem[];
  isAdmin: boolean;
}) {
  const buocs = isAdmin ? CAC_BUOC_ADMIN : CAC_BUOC_QUY_TRINH;
  const counts = useMemo(() => {
    const c: Record<QuoteStatus, number> = {
      drafted: 0,
      sent: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
    };
    mucs.forEach((h) => {
      c[layTrangThai(h)]++;
    });
    return c;
  }, [mucs]);

  const revenue = mucs
    .filter((h) => layTrangThai(h) === "completed")
    .reduce((sum, h) => sum + (h.chotGia || h.finalPrice) * h.quantity, 0);

  return (
    <div className="quote-stats-overview">
      {buocs.map((buoc) => {
        const cauHinh = QUOTE_STATUS_CONFIG[buoc];
        return (
          <div key={buoc} className="quote-stat-card">
            <div
              className="quote-stat-giaTri"
              style={{ color: cauHinh.color, fontSize: "1.5rem" }}
            >
              {counts[buoc]}
            </div>
            <div className="quote-stat-lbl">{cauHinh.label}</div>
          </div>
        );
      })}
      <div className="quote-stat-card quote-stat-card--total">
        <div className="quote-stat-giaTri">
          {(revenue / 1_000_000).toFixed(1)}
          <small> Tr</small>
        </div>
        <div className="quote-stat-lbl">Doanh thu (Hoàn thành)</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN VIEW — nhóm theo seller, chỉ thấy muc đã gửi
// ════════════════════════════════════════════════════════════
function AdminView({
  mucs,
  search,
  chiTimKhachHang = false,
  onOpen,
  onStatusUpdate,
  onCopy,
  onDelete,
}: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (
    muc: HistoryItem,
    status: QuoteStatus,
  ) => Promise<void> | void;
  onCopy?: (muc: HistoryItem) => void;
  onDelete?: (muc: HistoryItem) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    // Admin chỉ thấy muc đã gửi (status != drafted)
    const visible = mucs.filter(daGuiAdmin);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? visible.filter((i) =>
          chiTimKhachHang
            ? i.customer.toLowerCase().includes(q)
            : i.customer.toLowerCase().includes(q) ||
              i.productName.toLowerCase().includes(q) ||
              i.structure.toLowerCase().includes(q) ||
              (i.sellerName || "").toLowerCase().includes(q),
        )
      : visible;

    const map = new Map<
      string,
      { id: string; name: string; mucs: HistoryItem[] }
    >();
    filtered.forEach((muc) => {
      const sid = muc.sellerId || "unknown";
      const sname = muc.sellerName || "Không rõ";
      if (!map.has(sid)) map.set(sid, { id: sid, name: sname, mucs: [] });
      map.get(sid)!.mucs.push(muc);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [mucs, search, chiTimKhachHang]);

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Badge "chờ duyệt" count toàn bộ
  const pendingCount = mucs.filter(
    (i) => layTrangThai(i) === "pending_approval",
  ).length;

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>
          {mucs.filter(daGuiAdmin).length === 0
            ? "Chưa có báo giá nào được gửi lên."
            : "Không có báo giá phù hợp."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Banner chờ duyệt */}
      {pendingCount > 0 && (
        <div className="qadmin-pending-banner">
          <Clock size={15} />
          <span>
            Có <strong>{pendingCount}</strong> báo giá đang chờ bạn duyệt
          </span>
        </div>
      )}

      {groups.map((group) => {
        const isOpen = !collapsed[group.id];
        const pendingInGroup = group.mucs.filter(
          (h) => layTrangThai(h) === "pending_approval",
        ).length;
        const groupRevenue = group.mucs
          .filter((h) => layTrangThai(h) === "completed")
          .reduce((s, h) => s + (h.chotGia || h.finalPrice) * h.quantity, 0);

        return (
          <div key={group.id} className="qgroup">
            <button className="qgroup-header" onClick={() => toggle(group.id)}>
              <span className="qgroup-icon">
                <Users size={16} />
              </span>
              <span className="qgroup-name">{group.name}</span>
              <span className="qgroup-count">{group.mucs.length} báo giá</span>
              {pendingInGroup > 0 && (
                <span className="qgroup-pending">
                  {pendingInGroup} chờ duyệt
                </span>
              )}
              {groupRevenue > 0 && (
                <span className="qgroup-revenue">
                  {(groupRevenue / 1_000_000).toFixed(1)} Tr VNĐ
                </span>
              )}
              <span className="qgroup-chevron">
                {isOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            </button>

            {isOpen && (
              <div className="quote-grid" style={{ padding: "12px 16px 16px" }}>
                {group.mucs.map((muc) => (
                  <QuotationCard
                    key={muc.id}
                    muc={muc}
                    onClick={() => onOpen(muc.id)}
                    statusControl={
                      <HopChonTrangThaiAdmin
                        muc={muc}
                        khiCapNhat={onStatusUpdate}
                      />
                    }
                    onCopy={onCopy ? () => onCopy(muc) : undefined}
                    onDelete={onDelete ? () => onDelete(muc) : undefined}
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
function SaleView({
  mucs,
  search,
  chiTimKhachHang = false,
  onOpen,
  onStatusUpdate,
  onCopy,
  onDelete,
}: {
  mucs: HistoryItem[];
  search: string;
  chiTimKhachHang?: boolean;
  onOpen: (id: string) => void;
  onStatusUpdate: (
    muc: HistoryItem,
    status: QuoteStatus,
  ) => Promise<void> | void;
  onCopy?: (muc: HistoryItem) => void;
  onDelete?: (muc: HistoryItem) => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return mucs;
    const q = search.toLowerCase();
    return mucs.filter((i) =>
      chiTimKhachHang
        ? i.customer.toLowerCase().includes(q)
        : i.customer.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          i.structure.toLowerCase().includes(q),
    );
  }, [mucs, search, chiTimKhachHang]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty">
        <FileText size={40} />
        <p>
          {mucs.length === 0
            ? "Bạn chưa có báo giá nào. Hãy lưu bảng tính giá đầu tiên!"
            : "Không có báo giá phù hợp."}
        </p>
      </div>
    );
  }

  return (
    <div className="quote-grid">
      {filtered.map((muc) => (
        <QuotationCard
          key={muc.id}
          muc={muc}
          onClick={() => onOpen(muc.id)}
          statusControl={
            <DieuKhienTrangThaiSale muc={muc} khiCapNhat={onStatusUpdate} />
          }
          onCopy={onCopy ? () => onCopy(muc) : undefined}
          onDelete={onDelete ? () => onDelete(muc) : undefined}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD — STEP 1: CHỌN KHÁCH HÀNG
// ════════════════════════════════════════════════════════════
function BuocChonKhachHang({
  selected,
  onSelect,
  chiDoc,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  chiDoc?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobilePicker, setIsMobilePicker] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const role = dungCuaHangTinhGia((s) => s.role);
  const currentSellerId = dungCuaHangTinhGia((s) => s.currentSellerId);

  useEffect(() => {
    setCustomers(locKhachTheoQuyen(docKhachHang(), role, currentSellerId));
  }, [role, currentSellerId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobilePicker(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 8);
    const q = search.toLowerCase();
    return customers
      .filter(
        (c) =>
          tenKhachHang(c).toLowerCase().includes(q) ||
          (c.customerCode || "").toLowerCase().includes(q) ||
          (c.taxCode || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [customers, search]);

  const recent = useMemo(
    () => customers.filter((c) => c.status === "active").slice(0, 5),
    [customers],
  );

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSheetOpen(false);
  };

  const renderCustomerList = (handlePick: (customer: Customer) => void) => (
    <div className="wiz-customer-list">
      {filtered.length === 0 ? (
        <div className="wiz-empty">Không tìm thấy khách hàng phù hợp.</div>
      ) : (
        filtered.map((c) => {
          const isSelected = selected?.id === c.id;
          return (
            <button
              key={c.id}
              className={`wiz-customer-card ${isSelected ? "wiz-customer-card--selected" : ""}`}
              onClick={() => handlePick(c)}
              aria-pressed={isSelected}
            >
              <div className="wiz-customer-icon">
                <Building2 size={16} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="wiz-customer-name">{tieuDeKhachHang(c)}</div>
                <div className="wiz-customer-meta">
                  {metaKhachHang(c).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
              {isSelected && <Check size={16} className="wiz-customer-check" />}
            </button>
          );
        })
      )}
    </div>
  );

  if (chiDoc && selected) {
    return (
      <div>
        <p className="wiz-section-title">Khách hàng</p>
        <div className="wiz-customer-summary wiz-customer-summary--selected">
          <div className="wiz-customer-summary-main">
            <div className="wiz-customer-icon">
              <Lock size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wiz-customer-name">
                {tieuDeKhachHang(selected)}
              </div>
              <div className="wiz-customer-meta">
                {metaKhachHang(selected).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Lock size={12} /> Không thể thay đổi khách hàng khi cập nhật báo
            giá.
          </p>
        </div>
      </div>
    );
  }

  if (!isMobilePicker) {
    return (
      <div>
        <p className="wiz-section-title">Tìm khách hàng</p>
        <div className="wiz-search-box">
          <Search size={14} className="wiz-search-icon" />
          <input
            className="wiz-search-input"
            placeholder="Tìm theo tên, mã KH, MST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Tìm khách hàng"
          />
        </div>

        {!search && recent.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p className="wiz-section-title" style={{ marginBottom: 6 }}>
              Gần đây
            </p>
            <div className="wiz-recent-chips">
              {recent.map((c) => (
                <button
                  key={c.id}
                  className="wiz-chip"
                  onClick={() => onSelect(c)}
                >
                  <Building2 size={11} />
                  {tieuDeKhachHang(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        {renderCustomerList(onSelect)}
      </div>
    );
  }

  return (
    <div>
      <p className="wiz-section-title">Khách hàng</p>
      <div
        className={`wiz-customer-summary${selected ? " wiz-customer-summary--selected" : ""}`}
      >
        <div className="wiz-customer-summary-main">
          <div className="wiz-customer-icon">
            {selected ? <Check size={16} /> : <Building2 size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wiz-customer-name">
              {selected ? tieuDeKhachHang(selected) : "Chưa chọn khách hàng"}
            </div>
            <div className="wiz-customer-meta">
              {selected ? (
                metaKhachHang(selected).map((line) => (
                  <span key={line}>{line}</span>
                ))
              ) : (
                <span>Chọn khách hàng để tạo báo giá.</span>
              )}
            </div>
          </div>
        </div>
        <button
          className="wiz-btn wiz-btn--primary wiz-customer-picker-trigger"
          type="button"
          onClick={() => setSheetOpen(true)}
        >
          {selected ? "Đổi khách hàng" : "Chọn khách hàng"}
        </button>
      </div>

      {recent.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p className="wiz-section-title" style={{ marginBottom: 6 }}>
            Gần đây
          </p>
          <div className="wiz-recent-chips">
            {recent.map((c) => (
              <button
                key={c.id}
                className="wiz-chip"
                onClick={() => handleSelect(c)}
              >
                <Building2 size={11} />
                {tieuDeKhachHang(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      {sheetOpen && (
        <div
          className="wiz-customer-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn khách hàng"
        >
          <div className="wiz-customer-sheet">
            <div className="wiz-customer-sheet-handle" />
            <div className="wiz-customer-sheet-header">
              <div className="wiz-customer-sheet-title">Chọn khách hàng</div>
              <button
                className="wiz-btn wiz-btn--ghost quote-wizard-close"
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Đóng chọn khách hàng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="wiz-customer-sheet-body">
              <div className="wiz-search-box">
                <Search size={14} className="wiz-search-icon" />
                <input
                  className="wiz-search-input"
                  placeholder="Tên, mã KH, MST, SĐT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  aria-label="Tìm khách hàng"
                />
              </div>

              {!search && recent.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p className="wiz-section-title" style={{ marginBottom: 6 }}>
                    Gần đây
                  </p>
                  <div className="wiz-recent-chips">
                    {recent.map((c) => (
                      <button
                        key={c.id}
                        className="wiz-chip"
                        onClick={() => handleSelect(c)}
                      >
                        <Building2 size={11} />
                        {tieuDeKhachHang(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="wiz-section-title">Kết quả</p>
              {renderCustomerList(handleSelect)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD — STEP 2: CHỌN SẢN PHẨM & NHẬP SỐ LƯỢNG
// ════════════════════════════════════════════════════════════
function BuocChonSanPham({
  customer,
  history,
  products,
  onProductsChange,
  materials,
  constants,
  profitTable,
  smallWidthPrices,
  onViewPricing,
}: {
  customer: Customer;
  history: HistoryItem[];
  products: WizardProduct[];
  onProductsChange: (p: WizardProduct[]) => void;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  onViewPricing?: (pIdx: number) => void;
}) {
  const [searchSP, setSearchSP] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const addedIds = useMemo(
    () => new Set(products.map((p) => p.historyItem.id)),
    [products],
  );

  const candidateSPs = useMemo(() => {
    const khCode = (customer.customerCode || "").toLowerCase();
    const khName = tenKhachHang(customer).toLowerCase();
    const q = searchSP.toLowerCase();
    return history
      .filter((h) => !h.isQuote)
      .filter((h) => {
        const code = (h.originalCustomer || "").trim().toLowerCase();
        if (code) return code === khCode;
        return (
          h.customer.toLowerCase().includes(khName) ||
          (!!khCode && h.customer.toLowerCase().includes(khCode))
        );
      })
      .filter(
        (h) =>
          !q ||
          h.productName.toLowerCase().includes(q) ||
          h.structure.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [history, customer, searchSP]);

  const addProduct = (item: HistoryItem) => {
    if (addedIds.has(item.id)) return;
    const base = buildWizardProductFromHistoryItem(item);
    // Giá sheet là nguồn chuẩn (đã tính theo đường đúng lúc lưu/mở danh sách).
    // Chỉ recalc khi chưa có giá nào (sheet legacy rỗng).
    const giaGoc = base.tiers[0]?.finalPrice || item.finalPrice || 0;
    const calcPrice = giaGoc > 0 ? giaGoc : tinhGiaTheoSoLuong(item, item.quantity);
    if (calcPrice > 0) {
      base.tiers = base.tiers.map((t) => ({
        ...t,
        finalPrice: calcPrice,
        baoGia: t.baoGia > 0 ? t.baoGia : calcPrice,
      }));
    }
    const newProduct: WizardProduct = { ...base, expanded: true };
    onProductsChange([...products, newProduct]);
    setShowSearch(false);
    setSearchSP("");
  };

  const removeProduct = (idx: number) => {
    onProductsChange(products.filter((_, i) => i !== idx));
  };

  const addTier = (pIdx: number) => {
    const updated = products.map((p, i) => {
      if (i !== pIdx) return p;
      const last = p.tiers[p.tiers.length - 1];
      return {
        ...p,
        tiers: [
          ...p.tiers,
          { quantity: 0, finalPrice: last.finalPrice, baoGia: last.baoGia },
        ],
      };
    });
    onProductsChange(updated);
  };

  const tinhGiaTheoSoLuong = (item: HistoryItem, quantity: number): number => {
    if (quantity <= 0) return 0;
    try {
      const laNangCap = !!(item.isNangCap || item.input?.isNangCap);
      // Sheet nâng cao: pin CPSX NC + tính qua bảng đặc tả NC (đồng bộ danh sách/A4),
      // ghi đè dòng của sheet vẫn áp; LN% ghi đè = 0 (chỉ preview trong tab).
      const hangSo =
        laNangCap && item.pinnedCpsxNangCao
          ? apCpsxNangCaoVaoHangSo(constants, item.pinnedCpsxNangCao)
          : constants;
      const result = tinhBaoGia(
        { ...item.input, quantity },
        materials,
        hangSo,
        profitTable,
        smallWidthPrices,
      );
      if (!result) return item.finalPrice;
      if (!laNangCap) return result.finalPrice;
      const { uniRows } = lapDongSanXuat(result, hangSo);
      return tinhKetQuaNangCaoHieuLuc({
        result,
        uniRows,
        constants: hangSo,
        materials,
        saleOverrides: item.saleOverrides ?? {},
        adminOverrides: item.adminOverrides ?? {},
        saleProfitRatePct: 0,
        adminProfitRatePct: 0,
        profitTable,
      }).result.finalPrice;
    } catch {
      return item.finalPrice;
    }
  };

  const removeTier = (pIdx: number, tIdx: number) => {
    onProductsChange(
      products.map((p, i) =>
        i !== pIdx ? p : { ...p, tiers: p.tiers.filter((_, j) => j !== tIdx) },
      ),
    );
  };

  const updateTier = (
    pIdx: number,
    tIdx: number,
    field: "quantity" | "baoGia",
    val: number,
  ) => {
    onProductsChange(
      products.map((p, i) =>
        i !== pIdx
          ? p
          : {
              ...p,
              tiers: p.tiers.map((t, j) => {
                if (j !== tIdx) return t;
                if (field === "quantity") {
                  const finalPrice = tinhGiaTheoSoLuong(p.historyItem, val);
                  const userEdited = t.baoGia > 0 && t.baoGia !== t.finalPrice;
                  return {
                    ...t,
                    quantity: val,
                    finalPrice,
                    baoGia: userEdited ? t.baoGia : finalPrice,
                  };
                }
                return { ...t, baoGia: val };
              }),
            },
      ),
    );
  };

  const toggleProductExpanded = (pIdx: number) => {
    onProductsChange(
      products.map((p, i) =>
        i === pIdx ? { ...p, expanded: !p.expanded } : p,
      ),
    );
  };

  const updateBagSpec = <K extends keyof QuoteProductBagSpec>(
    pIdx: number,
    field: K,
    val: QuoteProductBagSpec[K],
  ) => {
    onProductsChange(
      products.map((p, i) =>
        i === pIdx ? { ...p, bagSpec: { ...p.bagSpec, [field]: val } } : p,
      ),
    );
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          padding: "10px 14px",
          background: "rgba(8,145,178,0.06)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Building2 size={14} style={{ color: "var(--accent, #0891b2)" }} />
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          {tenKhachHang(customer)}
        </span>
        {customer.customerCode && (
          <span style={{ fontSize: "0.76rem", color: "var(--muted, #6b7280)" }}>
            ({customer.customerCode})
          </span>
        )}
      </div>

      {products.map((prod, pIdx) => {
        const isTui = prod.historyItem.input.productType === "tui";
        const spreadMm = prod.historyItem.input.spreadWidth
          ? Math.round(prod.historyItem.input.spreadWidth * 1000)
          : 0;
        const cutMm = prod.historyItem.input.cutStep
          ? Math.round(prod.historyItem.input.cutStep * 1000)
          : 0;
        return (
          <div key={prod.historyItem.id} className="wiz-product-card">
            <div className="wiz-product-header">
              <FileText
                size={14}
                style={{ color: "var(--accent, #0891b2)", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div className="wiz-product-title">
                  {prod.historyItem.productName || "—"}
                </div>
                <div className="wiz-product-meta">
                  {prod.historyItem.structure}
                  {spreadMm > 0 && cutMm > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      {spreadMm}×{cutMm}mm
                    </span>
                  )}
                </div>
              </div>
              {onViewPricing && (
                <button
                  className="wiz-btn wiz-btn--secondary"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.76rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onClick={() => onViewPricing(pIdx)}
                  title="Xem lại bảng tính giá của sản phẩm này"
                >
                  <Eye size={12} /> Xem tính giá
                </button>
              )}
              <button
                className="wiz-btn wiz-btn--danger"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                onClick={() => removeProduct(pIdx)}
                aria-label={`Xóa sản phẩm ${prod.historyItem.productName}`}
              >
                <Trash2 size={12} /> Xóa
              </button>
              {isTui && (
                <button
                  className="wiz-spec-toggle"
                  onClick={() => toggleProductExpanded(pIdx)}
                  aria-expanded={!!prod.expanded}
                >
                  {prod.expanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                  {prod.expanded ? "Thu gọn" : "Mở rộng"}
                </button>
              )}
            </div>

            {prod.expanded &&
              isTui &&
              (() => {
                const spec = prod.bagSpec;
                const inp = prod.historyItem.input;
                const showSideSeal = shouldShowBagSpecField(
                  spec.bagType,
                  "sideSeal",
                );
                const showGusset = shouldShowBagSpecField(
                  spec.bagType,
                  "gusset",
                );
                const showBackSeal = shouldShowBagSpecField(
                  spec.bagType,
                  "backSeal",
                );
                const showStandup = shouldShowBagSpecField(
                  spec.bagType,
                  "standupBottom",
                );
                const showLid = shouldShowBagSpecField(spec.bagType, "lid");
                const backSealLabel =
                  spec.bagType === "xephong_lech"
                    ? "Lưng lệch (mm)"
                    : "Lưng giữa (mm)";
                const hasZipper = Boolean(inp.hasZipper);
                const hasHandlePricing = Boolean(inp.hasHandle);
                const handleOptions =
                  dungCuaHangTinhGia.getState().constants.handleOptions ?? [];
                const handleLabel = hasHandlePricing
                  ? handleOptions.find((o) => o.key === inp.handleOptionKey)
                      ?.label || "Quai"
                  : "";
                const bagTypeLabel =
                  (["dayDung", "3bien", "cutSeal", "cutSealNapKeo"].includes(
                    spec.bagType,
                  )
                    ? hasZipper
                      ? "Túi zipper "
                      : "Túi "
                    : "Túi ") +
                    {
                      "3bien": "3 biên",
                      "4bien": "4 biên",
                      xephong_lech: "xếp hông dán lưng lệch",
                      xephong_giua: "xếp hông dán lưng giữa",
                      dayDung: "đáy đứng",
                      cutSeal: "cut seal",
                      cutSealNapKeo: "cut seal mở miệng có nắp keo",
                    }[spec.bagType] || spec.bagType;
                return (
                  <div className="wiz-bag-spec">
                    <div className="wiz-bag-spec-title">
                      <span>Quy cách túi</span>
                    </div>
                    <div className="wiz-bag-spec-grid">
                      <label className="wiz-bag-field">
                        <span className="wiz-bag-label">Loại túi</span>
                        <span className="wiz-bag-total">
                          {{
                            "3bien": "Túi 3 biên",
                            "4bien": "Túi 4 biên",
                            xephong_lech: "Túi xếp hông dán lưng lệch",
                            xephong_giua: "Túi xếp hông dán lưng giữa",
                            dayDung: "Túi đáy đứng",
                            cutSeal: "Túi cut seal",
                            cutSealNapKeo: "Túi cut seal mở miệng có nắp keo",
                          }[spec.bagType] ||
                            spec.bagType ||
                            "—"}
                        </span>
                      </label>
                      <label className="wiz-bag-field">
                        <span className="wiz-bag-label">Chiều rộng (mm)</span>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            alignItems: "center",
                          }}
                        >
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.widthMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "widthMm",
                                Number(e.target.value),
                              )
                            }
                            style={{ flex: 1 }}
                          />
                          <span className="wiz-bag-hint">±2</span>
                        </div>
                      </label>
                      <label className="wiz-bag-field">
                        <span className="wiz-bag-label">Chiều dài (mm)</span>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            alignItems: "center",
                          }}
                        >
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.lengthMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "lengthMm",
                                Number(e.target.value),
                              )
                            }
                            style={{ flex: 1 }}
                          />
                          <span className="wiz-bag-hint">±3</span>
                        </div>
                      </label>
                      {showSideSeal && (
                        <label className="wiz-bag-field">
                          <span className="wiz-bag-label">Hàn biên (mm)</span>
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.sideSealMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "sideSealMm",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                      {showGusset && (
                        <label className="wiz-bag-field">
                          <span className="wiz-bag-label">Hông (mm)</span>
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.gussetMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "gussetMm",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                      {showBackSeal && (
                        <label className="wiz-bag-field">
                          <span className="wiz-bag-label">{backSealLabel}</span>
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.backSealMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "backSealMm",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                      {showStandup && (
                        <>
                          <label className="wiz-bag-field">
                            <span className="wiz-bag-label">
                              Đáy mỗi bên (mm)
                            </span>
                            <input
                              className="wiz-bag-input"
                              type="number"
                              min={0}
                              value={spec.standupBottomSideMm || ""}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "standupBottomSideMm",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </label>
                          <div className="wiz-bag-field">
                            <span className="wiz-bag-label">Đáy mở tổng</span>
                            <div className="wiz-bag-total">
                              {(spec.standupBottomSideMm || 0) * 2} mm
                            </div>
                          </div>
                        </>
                      )}
                      {showLid && (
                        <label className="wiz-bag-field">
                          <span className="wiz-bag-label">Nắp (mm)</span>
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.lidMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "lidMm",
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                      {shouldShowBagSpecField(spec.bagType, 'songSieuAm') && (
                        <label className="wiz-bag-field">
                          <span className="wiz-bag-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={spec.hasSongSieuAm ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  'hasSongSieuAm',
                                  e.target.checked,
                                )
                              }
                            />
                            Từ đầu đến sóng siêu âm (mm)
                          </span>
                          <input
                            className="wiz-bag-input"
                            type="number"
                            min={0}
                            value={spec.songSieuAmMm || ''}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                'songSieuAmMm',
                                Number(e.target.value),
                              )
                            }
                          />
                        </label>
                      )}
                    </div>
                    <div className="wiz-spec-section">
                      {hasZipper && (
                        <div className="wiz-spec-row">
                          <span className="wiz-spec-badge">
                            ✓ Có zipper (từ dữ liệu tính giá)
                          </span>
                          <span
                            className="wiz-spec-badge"
                            style={{
                              color: "var(--muted, #6b7280)",
                              fontWeight: 400,
                            }}
                          >
                            Tâm zipper cách đầu
                          </span>
                          <input
                            className="wiz-spec-inline-input"
                            type="number"
                            min={0}
                            value={spec.zipperDistanceMm || ""}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "zipperDistanceMm",
                                Number(e.target.value),
                              )
                            }
                          />
                          <span className="wiz-spec-unit">mm</span>
                        </div>
                      )}
                      {hasHandlePricing ? (
                        <div className="wiz-spec-row">
                          <span className="wiz-spec-badge">
                            ✓ {handleLabel} (từ dữ liệu tính giá)
                          </span>
                        </div>
                      ) : (
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasHandle ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasHandle",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Quai
                          </label>
                          {spec.hasHandle && (
                            <select
                              className="wiz-spec-inline-select"
                              value={spec.handleOptionKey || ""}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "handleOptionKey",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Chọn loại quai</option>
                              {handleOptions.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                      <div className="wiz-spec-toggle-grid">
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasHeadSeal ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasHeadSeal",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Hàn đầu
                          </label>
                          {spec.hasHeadSeal && (
                            <>
                              <input
                                className="wiz-spec-inline-input"
                                type="number"
                                min={0}
                                value={spec.headSealMm || ""}
                                onChange={(e) =>
                                  updateBagSpec(
                                    pIdx,
                                    "headSealMm",
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <span className="wiz-spec-unit">mm</span>
                            </>
                          )}
                        </div>
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasBottomSeal ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasBottomSeal",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Hàn đáy
                          </label>
                          {spec.hasBottomSeal && (
                            <>
                              <input
                                className="wiz-spec-inline-input"
                                type="number"
                                min={0}
                                value={spec.bottomSealMm || ""}
                                onChange={(e) =>
                                  updateBagSpec(
                                    pIdx,
                                    "bottomSealMm",
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <span className="wiz-spec-unit">mm</span>
                            </>
                          )}
                        </div>
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasTearNotch ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasTearNotch",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Nhấn xé "V"
                          </label>
                          {spec.hasTearNotch && (
                            <>
                              <span
                                className="wiz-spec-badge"
                                style={{
                                  color: "var(--muted, #6b7280)",
                                  fontWeight: 400,
                                }}
                              >
                                V cách đầu
                              </span>
                              <input
                                className="wiz-spec-inline-input"
                                type="number"
                                min={0}
                                value={spec.tearNotchFromTopMm || ""}
                                onChange={(e) =>
                                  updateBagSpec(
                                    pIdx,
                                    "tearNotchFromTopMm",
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <span className="wiz-spec-unit">mm</span>
                            </>
                          )}
                        </div>
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasHangHole ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasHangHole",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Đục lỗ treo
                          </label>
                          {spec.hasHangHole && (
                            <input
                              className="wiz-spec-inline-text"
                              type="text"
                              value={spec.hangHoleDescription}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hangHoleDescription",
                                  e.target.value,
                                )
                              }
                              placeholder="VD: Ø8mm cách đầu 10mm"
                            />
                          )}
                        </div>
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasHandleHole ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasHandleHole",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Đục lỗ quai xách
                          </label>
                          {spec.hasHandleHole && (
                            <input
                              className="wiz-spec-inline-text"
                              type="text"
                              value={spec.handleHoleDescription}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "handleHoleDescription",
                                  e.target.value,
                                )
                              }
                              placeholder="VD: 3 lỗ tròn Ø8mm"
                            />
                          )}
                        </div>
                        <div className="wiz-spec-row">
                          <label className="wiz-spec-check-label">
                            <input
                              type="checkbox"
                              checked={spec.hasHalfMoonBottom ?? false}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "hasHalfMoonBottom",
                                  e.target.checked,
                                )
                              }
                            />{" "}
                            Đáy bán nguyệt
                          </label>
                          {spec.hasHalfMoonBottom && (
                            <span
                              className="wiz-spec-badge"
                              style={{ color: "var(--green, #059669)" }}
                            >
                              Có
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="wiz-spec-row">
                        <label className="wiz-spec-check-label">
                          <input
                            type="checkbox"
                            checked={spec.hasCylinder ?? false}
                            onChange={(e) =>
                              updateBagSpec(
                                pIdx,
                                "hasCylinder",
                                e.target.checked,
                              )
                            }
                          />{" "}
                          Trục in
                        </label>
                        {spec.hasCylinder && (
                          <>
                            <span
                              className="wiz-spec-badge"
                              style={{
                                color: "var(--muted, #6b7280)",
                                fontWeight: 400,
                              }}
                            >
                              {prod.historyItem.productName}
                            </span>
                            <span
                              className="wiz-spec-badge"
                              style={{
                                color: "var(--muted, #6b7280)",
                                fontWeight: 400,
                              }}
                            >
                              Kích thước: chiều dài{" "}
                              {Math.round(inp.cylLength * 1000)}mm × chu vi{" "}
                              {Math.round(inp.cylCircum * 1000)}mm
                            </span>
                            <span
                              className="wiz-spec-badge"
                              style={{
                                color: "var(--muted, #6b7280)",
                                fontWeight: 400,
                              }}
                            >
                              Số lượng
                            </span>
                            <input
                              className="wiz-spec-inline-input"
                              type="number"
                              min={1}
                              value={spec.cylinderQuantity || ""}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "cylinderQuantity",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <span
                              className="wiz-spec-badge"
                              style={{
                                color: "var(--muted, #6b7280)",
                                fontWeight: 400,
                              }}
                            >
                              Đơn giá
                            </span>
                            <input
                              className="wiz-spec-inline-input"
                              type="number"
                              min={0}
                              value={spec.cylinderUnitPrice || ""}
                              onChange={(e) =>
                                updateBagSpec(
                                  pIdx,
                                  "cylinderUnitPrice",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <span className="wiz-spec-unit">đ</span>
                          </>
                        )}
                      </div>
                      <div className="wiz-spec-row">
                        <label className="wiz-spec-check-label">
                          <input
                            type="checkbox"
                            checked={spec.hasStructureBack ?? false}
                            onChange={(e) => {
                              const v = e.target.checked;
                              updateBagSpec(pIdx, "hasStructureBack", v);
                              if (!v) {
                                updateBagSpec(pIdx, "structureBack", "");
                                updateBagSpec(pIdx, "structureSwapped", false);
                              } else {
                                const frontHasMPET = /MPET/i.test(
                                  prod.historyItem.structure,
                                );
                                const backHasMPET = /MPET/i.test(
                                  spec.structureBack || "",
                                );
                                if (!frontHasMPET && backHasMPET) {
                                  updateBagSpec(pIdx, "structureSwapped", true);
                                } else if (frontHasMPET) {
                                  updateBagSpec(
                                    pIdx,
                                    "structureSwapped",
                                    false,
                                  );
                                }
                              }
                            }}
                          />{" "}
                          Chất liệu 2 mặt
                        </label>
                        {spec.hasStructureBack &&
                          (() => {
                            const hasAlt = Boolean(prod.historyItem.input.layer2AltId);
                            if (hasAlt) {
                              const opts = generateStructureBackOptions(
                                prod.historyItem.input,
                                spec.bagType,
                                dungCuaHangTinhGia.getState().materials,
                              );
                              const selectedIdx = spec.structureBack
                                ? opts.findIndex(
                                    (o) =>
                                      o.structureBack === spec.structureBack &&
                                      o.structureSwapped === spec.structureSwapped &&
                                      o.bottomFollows === spec.bottomFollows,
                                  )
                                : -1;
                              return (
                                <select
                                  className="wiz-spec-inline-select"
                                  style={{ flex: 1, minWidth: 0, fontSize: '0.78rem' }}
                                  value={selectedIdx >= 0 ? selectedIdx : 0}
                                  onChange={(e) => {
                                    const idx = Number(e.target.value);
                                    const opt = opts[idx];
                                    updateBagSpec(pIdx, "structureBack", opt.structureBack);
                                    updateBagSpec(pIdx, "bottomFollows", opt.bottomFollows);
                                    updateBagSpec(pIdx, "structureSwapped", opt.structureSwapped);
                                  }}
                                >
                                  {opts.map((opt, i) => (
                                    <option key={i} value={i}>{opt.label}</option>
                                  ))}
                                </select>
                              );
                            }
                            return spec.structureBack ? (
                              spec.bagType === "dayDung" ? (
                                <>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                    marginTop: 4,
                                    width: "100%",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        color: "var(--foreground, #111)",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Đáy giống:
                                    </span>
                                    <label
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        color: "var(--foreground, #111)",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        checked={spec.bottomFollows === "front"}
                                        onChange={() =>
                                          updateBagSpec(
                                            pIdx,
                                            "bottomFollows",
                                            "front",
                                          )
                                        }
                                      />
                                      Mặt trước
                                    </label>
                                    <label
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        color: "var(--foreground, #111)",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        checked={spec.bottomFollows === "back"}
                                        onChange={() =>
                                          updateBagSpec(
                                            pIdx,
                                            "bottomFollows",
                                            "back",
                                          )
                                        }
                                      />
                                      Mặt sau
                                    </label>
                                    <button
                                      type="button"
                                      className="wiz-spec-toggle"
                                      style={{
                                        padding: "1px 6px",
                                        fontSize: "0.7rem",
                                        marginLeft: "auto",
                                      }}
                                      onClick={() => {
                                        updateBagSpec(
                                          pIdx,
                                          "structureSwapped",
                                          !spec.structureSwapped,
                                        );
                                      }}
                                      title="Đảo mặt trước / mặt sau"
                                    >
                                      ⇄ Đảo
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      padding: "8px 10px",
                                      background: "rgba(8,145,178,0.05)",
                                      borderRadius: 6,
                                      border:
                                        "1px solid var(--border, #e5e7eb)",
                                    }}
                                  >
                                    {(() => {
                                      const front = boSoCauTruc(
                                        spec.structureSwapped
                                          ? spec.structureBack
                                          : prod.historyItem.structure,
                                      );
                                      const back = boSoCauTruc(
                                        spec.structureSwapped
                                          ? prod.historyItem.structure
                                          : spec.structureBack,
                                      );
                                      const showBottomWith =
                                        spec.bottomFollows === "front"
                                          ? "trước"
                                          : "sau";
                                      return (
                                        <div
                                          style={{
                                            fontSize: "0.78rem",
                                            lineHeight: 1.6,
                                            color: "var(--foreground, #111)",
                                          }}
                                        >
                                          <div>
                                            <strong>
                                              Mặt trước
                                              {spec.bottomFollows === "front"
                                                ? " + Đáy"
                                                : ""}
                                              :
                                            </strong>{" "}
                                            {front}
                                          </div>
                                          <div>
                                            <strong>
                                              Mặt sau
                                              {spec.bottomFollows === "back"
                                                ? " + Đáy"
                                                : ""}
                                              :
                                            </strong>{" "}
                                            {back}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: "0.72rem",
                                              color: "var(--muted, #6b7280)",
                                              marginTop: 2,
                                            }}
                                          >
                                            Đáy theo mặt {showBottomWith}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    className="wiz-spec-toggle"
                                    style={{
                                      padding: "1px 4px",
                                      fontSize: "0.7rem",
                                      alignSelf: "flex-start",
                                    }}
                                    onClick={() =>
                                      updateBagSpec(pIdx, "structureBack", "")
                                    }
                                    title="Xóa chất liệu mặt sau"
                                  >
                                    ✕ Xóa mặt sau
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "var(--muted, #6b7280)",
                                  }}
                                >
                                  Mặt trước:{" "}
                                  {boSoCauTruc(prod.historyItem.structure)}
                                </span>
                                <button
                                  type="button"
                                  className="wiz-spec-toggle"
                                  style={{
                                    padding: "1px 5px",
                                    fontSize: "0.7rem",
                                  }}
                                  onClick={() =>
                                    updateBagSpec(
                                      pIdx,
                                      "structureSwapped",
                                      !spec.structureSwapped,
                                    )
                                  }
                                  title="Đảo mặt trước / mặt sau"
                                >
                                  ⇄
                                </button>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "var(--muted, #6b7280)",
                                  }}
                                >
                                  Mặt sau: {boSoCauTruc(spec.structureBack)}
                                </span>
                                <button
                                  type="button"
                                  className="wiz-spec-toggle"
                                  style={{
                                    padding: "1px 4px",
                                    fontSize: "0.7rem",
                                  }}
                                  onClick={() =>
                                    updateBagSpec(pIdx, "structureBack", "")
                                  }
                                  title="Xóa chất liệu mặt sau"
                                >
                                  ✕
                                </button>
                              </>
                            )
                          ) : (
                            <input
                              className="wiz-spec-inline-text"
                              type="text"
                              value={spec.structureBack}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBagSpec(pIdx, "structureBack", val);
                                if (spec.bagType === "dayDung") {
                                  const frontHasMPET = /MPET/i.test(
                                    prod.historyItem.structure,
                                  );
                                  const backHasMPET = /MPET/i.test(val);
                                  if (!frontHasMPET && backHasMPET) {
                                    updateBagSpec(
                                      pIdx,
                                      "structureSwapped",
                                      true,
                                    );
                                  } else if (frontHasMPET && !backHasMPET) {
                                    updateBagSpec(
                                      pIdx,
                                      "structureSwapped",
                                      false,
                                    );
                                  }
                                }
                              }}
                              placeholder="Nhập chất liệu mặt sau"
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <div className="wiz-desc-block">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div className="wiz-desc-title" style={{ margin: 0, padding: 0, border: 'none' }}>Mô tả đơn hàng</div>
                        <select
                          className="wiz-spec-inline-select"
                          value={spec.includeBagInQuote ? 'co' : 'khong'}
                          onChange={(e) => updateBagSpec(pIdx, 'includeBagInQuote', e.target.value === 'co')}
                          style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                        >
                          <option value="co">Có báo giá túi</option>
                          <option value="khong">Không báo giá túi</option>
                        </select>
                      </div>
                      <div style={spec.includeBagInQuote ? undefined : { opacity: 0.45 }}>
                      <div className="wiz-desc-row">
                        <span className="wiz-desc-label">Tên sản phẩm:</span>
                        <span className="wiz-desc-value">
                          {prod.historyItem.productName || "—"}
                        </span>
                      </div>
                      <div className="wiz-desc-row">
                        <span className="wiz-desc-label">Loại sản phẩm:</span>
                        <span className="wiz-desc-value">{bagTypeLabel}</span>
                      </div>
                      <div className="wiz-desc-row">
                        <span className="wiz-desc-label">Chất liệu:</span>
                        <span className="wiz-desc-value">
                          {spec.structureBack
                            ? (() => {
                                const isDayDung = spec.bagType === "dayDung";
                                const front = boSoCauTruc(
                                  spec.structureSwapped
                                    ? spec.structureBack
                                    : prod.historyItem.structure,
                                );
                                const back = boSoCauTruc(
                                  spec.structureSwapped
                                    ? prod.historyItem.structure
                                    : spec.structureBack,
                                );
                                if (isDayDung) {
                                  const frontSuffix =
                                    spec.bottomFollows === "front"
                                      ? " + Đáy"
                                      : "";
                                  const backSuffix =
                                    spec.bottomFollows === "back"
                                      ? " + Đáy"
                                      : "";
                                  return (
                                    <span>
                                      Mặt trước{frontSuffix}: {front}, Mặt sau
                                      {backSuffix}: {back}
                                    </span>
                                  );
                                }
                                return (
                                  <span>
                                    Mặt trước: {front}, Mặt sau: {back}
                                  </span>
                                );
                              })()
                            : boSoCauTruc(prod.historyItem.structure)}
                        </span>
                      </div>
                      {(() => {
                        const res = tinhBaoGia(
                          inp,
                          materials,
                          constants,
                          profitTable,
                          smallWidthPrices,
                        );
                        const doDay = res?.totalThickness ?? 0;
                        if (doDay > 0) {
                          return (
                            <div className="wiz-desc-row">
                              <span className="wiz-desc-label">Độ dày:</span>
                              <span className="wiz-desc-value">
                                {doDay} mic (± 5 mic)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {spec.widthMm > 0 && spec.lengthMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Kích thước:</span>
                          <span className="wiz-desc-value">
                            Dài {spec.lengthMm}mm (±3), Rộng {spec.widthMm}mm
                            (±2)
                            {spec.gussetMm > 0 ? (
                              <span>, Hông {spec.gussetMm}mm</span>
                            ) : null}
                            {showStandup && spec.standupBottomSideMm > 0 ? (
                              <span>
                                , Đáy {(spec.standupBottomSideMm || 0) * 2}mm
                              </span>
                            ) : null}
                          </span>
                        </div>
                      )}
                      {spreadMm > 0 && cutMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Khổ:</span>
                          <span className="wiz-desc-value">
                            Khổ trải {spreadMm} mm × Bước cắt {cutMm} mm
                          </span>
                        </div>
                      )}
                      {inp.numColors && inp.numColors > 0 ? (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Số màu in:</span>
                          <span className="wiz-desc-value">
                            {inp.numColors} màu
                          </span>
                        </div>
                      ) : null}
                      {showSideSeal && spec.sideSealMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Hàn biên:</span>
                          <span className="wiz-desc-value">
                            {spec.sideSealMm}mm
                          </span>
                        </div>
                      )}
                      {spec.hasHeadSeal && spec.headSealMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Hàn đầu:</span>
                          <span className="wiz-desc-value">
                            {spec.headSealMm}mm
                          </span>
                        </div>
                      )}
                      {spec.hasBottomSeal && spec.bottomSealMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Hàn đáy:</span>
                          <span className="wiz-desc-value">
                            {spec.bottomSealMm}mm
                          </span>
                        </div>
                      )}
                      {(hasHandlePricing || spec.hasHandle) &&
                        (() => {
                          const label = hasHandlePricing
                            ? handleLabel
                            : handleOptions.find(
                                (o) => o.key === spec.handleOptionKey,
                              )?.label || "Quai";
                          return (
                            <div className="wiz-desc-row">
                              <span className="wiz-desc-label">Quai:</span>
                              <span className="wiz-desc-value">{label}</span>
                            </div>
                          );
                        })()}
                      {spec.lidMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Nắp:</span>
                          <span className="wiz-desc-value">{spec.lidMm}mm</span>
                        </div>
                      )}
                      {spec.hasSongSieuAm && spec.songSieuAmMm > 0 && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Từ đầu đến sóng siêu âm:</span>
                          <span className="wiz-desc-value">{spec.songSieuAmMm}mm</span>
                        </div>
                      )}
                      {hasZipper && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">
                            Tâm zipper cách đầu:
                          </span>
                          <span className="wiz-desc-value">
                            {spec.zipperDistanceMm || "—"}mm
                          </span>
                        </div>
                      )}
                      {spec.hasHangHole && spec.hangHoleDescription && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Đục lỗ treo:</span>
                          <span className="wiz-desc-value">
                            {spec.hangHoleDescription}
                          </span>
                        </div>
                      )}
                      {spec.hasTearNotch && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">Nhấn xé "V":</span>
                          <span className="wiz-desc-value">
                            Cách đầu {spec.tearNotchFromTopMm || "—"}mm
                          </span>
                        </div>
                      )}
                      {spec.hasHalfMoonBottom && (
                        <div className="wiz-desc-row">
                          <span className="wiz-desc-label">
                            Đáy bán nguyệt:
                          </span>
                          <span className="wiz-desc-value">Có</span>
                        </div>
                      )}
                      <div className="wiz-desc-row" style={{ marginTop: 6 }}>
                        <span className="wiz-desc-label">Mô tả khác:</span>
                        <StageNoteEditor
                          value={spec.stageDescriptions ?? []}
                          onChange={(v) => updateBagSpec(pIdx, 'stageDescriptions', v)}
                          placeholder="Nhập mô tả khác..."
                        />
                      </div>
                      <div className="wiz-desc-row" style={{ marginTop: 6 }}>
                        <span className="wiz-desc-label">Ghi chú công đoạn:</span>
                        <StageNoteEditor
                          value={spec.stageNotes ?? []}
                          onChange={(v) => updateBagSpec(pIdx, 'stageNotes', v)}
                          placeholder="Nhập ghi chú..."
                          single
                        />
                      </div>
                      </div>
                    </div>
                    <div className="wiz-desc-block">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div className="wiz-desc-title" style={{ margin: 0, padding: 0, border: 'none' }}>Mô tả trục in</div>
                        <select
                          className="wiz-spec-inline-select"
                          value={spec.includeCylinderInQuote ? 'co' : 'khong'}
                          onChange={(e) => updateBagSpec(pIdx, 'includeCylinderInQuote', e.target.value === 'co')}
                          style={{ fontSize: '0.78rem', padding: '2px 6px' }}
                        >
                          <option value="co">Có báo giá trục</option>
                          <option value="khong">Không báo giá trục</option>
                        </select>
                      </div>
                      <div style={spec.includeCylinderInQuote ? undefined : { opacity: 0.45 }}>
                      <div className="wiz-desc-row">
                        <span className="wiz-desc-value">
                          {inp.cylLength > 0 ? (
                            <>
                              Trục in {prod.historyItem.productName} — Kích
                              thước: chiều dài{" "}
                              {Math.round(inp.cylLength * 1000)}mm × chu vi{" "}
                              {Math.round(inp.cylCircum * 1000)}mm
                              {spec.cylinderQuantity > 0
                                ? `, Số lượng: ${spec.cylinderQuantity}`
                                : ""}
                              {spec.cylinderUnitPrice > 0
                                ? `, Đơn giá: ${dinhDangSo(spec.cylinderUnitPrice)}đ`
                                : ""}
                            </>
                          ) : (
                            "Chưa có thông tin trục in"
                          )}
                        </span>
                      </div>
                      <div className="wiz-desc-row" style={{ marginTop: 8 }}>
                        <span className="wiz-desc-label">Ghi chú:</span>
                        <input
                          className="wiz-spec-inline-input"
                          type="text"
                          value={spec.cylinderNote || ""}
                          onChange={(e) =>
                            updateBagSpec(pIdx, "cylinderNote", e.target.value)
                          }
                          placeholder="Nhập ghi chú trục in..."
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  const diffPct =
                    tier.finalPrice > 0 ? (diff / tier.finalPrice) * 100 : 0;
                  const isLow =
                    tier.baoGia > 0 && tier.baoGia < tier.finalPrice;
                  return (
                    <tr key={tIdx}>
                      <td>
                        <input
                          className="wiz-tier-input"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={tier.quantity ?? ""}
                          onChange={(e) =>
                            updateTier(
                              pIdx,
                              tIdx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Số lượng"
                          aria-label="Số lượng"
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            color: "var(--muted, #9ca3af)",
                            fontSize: "0.82rem",
                          }}
                        >
                          {dinhDangSo(tier.finalPrice)} ₫
                        </div>
                      </td>
                      <td>
                        <input
                          className={`wiz-tier-input ${isLow ? "wiz-tier-input--warn" : ""}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={tier.baoGia ?? ""}
                          onChange={(e) =>
                            updateTier(
                              pIdx,
                              tIdx,
                              "baoGia",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Giá báo"
                          aria-label="Giá báo khách"
                        />
                        {tier.baoGia > 0 && tier.finalPrice > 0 && (
                          <div
                            className={`wiz-tier-diff ${diff >= 0 ? "wiz-tier-diff--pos" : "wiz-tier-diff--neg"}`}
                          >
                            {diff >= 0 ? "+" : ""}
                            {dinhDangSo(diff)} ₫ ({diffPct.toFixed(1)}%)
                          </div>
                        )}
                        {isLow && (
                          <div className="wiz-tier-warn" role="alert">
                            <AlertTriangle size={11} /> Giá báo thấp hơn giá
                            chốt
                          </div>
                        )}
                      </td>
                      <td>
                        {prod.tiers.length > 1 && (
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--muted, #9ca3af)",
                              padding: 4,
                            }}
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

      <div style={{ position: "relative" }}>
        {showSearch ? (
          <div>
            <div className="wiz-search-box" style={{ marginBottom: 6 }}>
              <Search size={14} className="wiz-search-icon" />
              <input
                className="wiz-search-input"
                placeholder="Tìm bảng tính giá..."
                value={searchSP}
                onChange={(e) => setSearchSP(e.target.value)}
                autoFocus
              />
            </div>
            <div className="wiz-product-search-dropdown">
              {candidateSPs.length === 0 ? (
                <div className="wiz-empty" style={{ padding: "16px" }}>
                  Không tìm thấy bảng tính giá nào cho khách hàng này.
                </div>
              ) : (
                candidateSPs.map((item) => {
                  const alreadyAdded = addedIds.has(item.id);
                  const hienThiGia = getPricingDisplayMeta(item.input);
                  return (
                    <div
                      key={item.id}
                      className={`wiz-product-option ${alreadyAdded ? "wiz-product-option--disabled" : ""}`}
                      onClick={() => !alreadyAdded && addProduct(item)}
                      role="button"
                      tabIndex={alreadyAdded ? -1 : 0}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !alreadyAdded && addProduct(item)
                      }
                    >
                      <FileText
                        size={14}
                        style={{
                          color: "var(--accent, #0891b2)",
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {item.productName}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted, #6b7280)",
                          }}
                        >
                          {item.structure} · {dinhDangSo(item.quantity)}{" "}
                          {hienThiGia.quantityUnitForHistory} ·{" "}
                          {dinhDangSo(item.finalPrice)} ₫/{hienThiGia.unit}
                          {alreadyAdded && (
                            <span
                              style={{
                                marginLeft: 6,
                                color: "var(--accent, #0891b2)",
                              }}
                            >
                              ✓ Đã thêm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button
              className="wiz-btn wiz-btn--ghost"
              style={{ marginTop: 6 }}
              onClick={() => {
                setShowSearch(false);
                setSearchSP("");
              }}
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            className="wiz-add-product"
            onClick={() => setShowSearch(true)}
          >
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
  customer,
  products,
  terms,
  onTermsChange,
  currentSellerName,
}: {
  customer: Customer;
  products: WizardProduct[];
  terms: WizardState["terms"];
  onTermsChange: (t: WizardState["terms"]) => void;
  currentSellerName: string;
}) {
  const today = new Date().toLocaleDateString("vi-VN");
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
          <span className="wiz-confirm-value">
            {normalizeDisplayText(currentSellerName || "—")}
          </span>
        </div>
      </div>

      <p className="wiz-section-title">Điều khoản sản xuất</p>
      <div className="wiz-terms-grid">
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">
            Số lượng thành phẩm có thể tăng hoặc giảm so với ĐĐH:
          </label>
          <ComboBoxDieuKhoan
            value={
              terms.quantityTolerance > 0 ? `±${terms.quantityTolerance}%` : ""
            }
            onChange={(val) => {
              const num = parseInt(val.replace(/[±%]/g, "")) || 10;
              onTermsChange({ ...terms, quantityTolerance: num });
            }}
            options={DUNG_SAI_OPTIONS.map((o) => `±${o}`)}
          />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Yêu cầu kỹ thuật</label>
          <ComboBoxDieuKhoan
            value={terms.techRequirement || ""}
            onChange={(val) =>
              onTermsChange({ ...terms, techRequirement: val })
            }
            options={YEU_CAU_KY_THUAT_OPTIONS}
          />
        </div>
      </div>

      <p className="wiz-section-title">Điều khoản báo giá</p>
      <div className="wiz-terms-grid">
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">VAT hàng hóa (%)</label>
          <ComboBoxDieuKhoan
            value={
              terms.vatRate > 0 || terms.vatRate === 0
                ? `${terms.vatRate}%`
                : ""
            }
            onChange={(val) =>
              onTermsChange({ ...terms, vatRate: parseInt(val) || 0 })
            }
            options={VAT_OPTIONS}
          />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">VAT trục in (%)</label>
          <ComboBoxDieuKhoan
            value={
              terms.vatCylinderRate > 0 || terms.vatCylinderRate === 0
                ? `${terms.vatCylinderRate}%`
                : ""
            }
            onChange={(val) =>
              onTermsChange({
                ...terms,
                vatCylinderRate: parseInt(val) || 0,
              })
            }
            options={VAT_OPTIONS}
          />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Hiệu lực (ngày)</label>
          <ComboBoxDieuKhoan
            value={terms.validityDays > 0 ? `${terms.validityDays} ngày` : ""}
            onChange={(val) =>
              onTermsChange({ ...terms, validityDays: parseInt(val) || 1 })
            }
            options={HIEU_LUC_OPTIONS}
          />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Điều khoản thanh toán</label>
          <ComboBoxDieuKhoan
            value={terms.paymentTerms}
            onChange={(val) => onTermsChange({ ...terms, paymentTerms: val })}
            options={THANH_TOAN_OPTIONS}
          />
        </div>
        <div className="wiz-terms-field">
          <label className="wiz-terms-label">Thời gian giao hàng</label>
          <ComboBoxDieuKhoan
            value={terms.deliveryTime}
            onChange={(val) => onTermsChange({ ...terms, deliveryTime: val })}
            options={GIAO_HANG_OPTIONS}
          />
        </div>
      </div>
      <div className="wiz-terms-field" style={{ marginBottom: 12 }}>
        <label className="wiz-terms-label">Địa điểm giao hàng</label>
        <textarea
          className="wiz-terms-textarea"
          value={terms.deliveryAddress || ""}
          onChange={(e) =>
            onTermsChange({ ...terms, deliveryAddress: e.target.value })
          }
          placeholder="Nhập địa điểm giao hàng..."
        />
      </div>
      <div className="wiz-terms-field" style={{ marginBottom: 16 }}>
        <label className="wiz-terms-label">Ghi chú</label>
        <textarea
          className="wiz-terms-textarea"
          value={terms.notes}
          onChange={(e) => onTermsChange({ ...terms, notes: e.target.value })}
          placeholder="Ghi chú thêm cho báo giá..."
        />
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
              const prices = prod.tiers
                .map((t) => t.baoGia)
                .filter((p) => p > 0);
              const minP = prices.length ? Math.min(...prices) : 0;
              const maxP = prices.length ? Math.max(...prices) : 0;
              return (
                <tr key={prod.historyItem.id}>
                  <td style={{ color: "var(--muted, #6b7280)" }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {prod.historyItem.productName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted, #6b7280)",
                      }}
                    >
                      {prod.historyItem.structure}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {prod.tiers.length} mức
                  </td>
                  <td>
                    {prices.length > 0 ? (
                      <span style={{ fontWeight: 600 }}>
                        {minP === maxP
                          ? dinhDangSo(minP)
                          : `${dinhDangSo(minP)} – ${dinhDangSo(maxP)}`}{" "}
                        ₫
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted, #9ca3af)" }}>—</span>
                    )}
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
function TaoBaoGiaWizard({
  onClose,
  onSavedNavigate,
}: {
  onClose: () => void;
  onSavedNavigate?: () => void;
}) {
  const store = dungCuaHangTinhGia() as any;
  const {
    history,
    currentSellerName,
    currentSellerId,
    role,
    materials,
    constants,
    profitTable,
    smallWidthPrices,
    taoBaoGiaMoi,
    accessToken,
    isAuthenticated,
    baoGiaDangSua,
    datBaoGiaDangSua,
  } = store;

  const dangSua = !!baoGiaDangSua;

  const [state, setState] = useState<WizardState>({
    customer: null,
    products: [],
    terms: {
      vatRate: 8,
      vatCylinderRate: 10,
      validityDays: 30,
      paymentTerms: "Thanh toán 30 ngày",
      deliveryTime: "7-10 ngày làm việc",
      deliveryAddress: "",
      notes: "",
      quantityTolerance: 10,
      techRequirement: "Chạy theo market ký duyệt",
    },
  });
  const [previewState, setPreviewState] = useState<{
    item: HistoryItem;
    customerInfo: {
      address?: string;
      taxCode?: string;
      phone?: string;
      fax?: string;
      description?: string;
    };
  } | null>(null);
  const [error, setError] = useState("");
  const [errorSection, setErrorSection] = useState<1 | 2 | 3 | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmCreateNew, setConfirmCreateNew] = useState(false);
  const [confirmSaoChep, setConfirmSaoChep] = useState(false);
  const pin = useNhapPinPrompt();
  const promptPin = pin.promptPin;
  const pendingModuleRef = useRef<string | null>(null);
  const hasDataRef = useRef(false);
  const exitingRef = useRef(false);
  // ── Autosave nháp bảng báo giá ──────────────────────────────────────────────
  // prefillApplied: user chủ động tạo từ lịch sử/bảng tính → không ghi đè bằng nháp cũ.
  const prefillApplied = useRef(false);
  const [daKhoiPhucNhap, setDaKhoiPhucNhap] = useState(false);
  const [savedAtNhap, setSavedAtNhap] = useState(0);

  const hasData = !!(state.customer || state.products.length > 0);
  useEffect(() => {
    hasDataRef.current = hasData;
  }, [hasData]);

  const section2Ref = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefill = readQuotePrefillFromHistory();
    if (!prefill) return;
    prefillApplied.current = true;
    let prefillProducts: WizardProduct[];
    if (prefill.quoteProducts && prefill.quoteProducts.length > 0) {
      prefillProducts = prefill.quoteProducts.map((qp) =>
        buildWizardProductFromQuoteProductLine(qp),
      );
    } else {
      prefillProducts = (history as HistoryItem[])
        .filter((item: HistoryItem) =>
          prefill.historyItemIds?.includes(item.id),
        )
        .map((item: HistoryItem) => buildWizardProductFromHistoryItem(item));
    }
    // Chỉ prefill khách hàng do người dùng hiện tại phụ trách (admin thấy tất cả).
    const tatCaKhach = docKhachHang();
    const khachDuocChon = locKhachTheoQuyen(tatCaKhach, role, currentSellerId);
    const prefillCustomer =
      khachDuocChon.find((customer) => {
        const name = tenKhachHang(customer).toLowerCase();
        const query = (prefill.customerName ?? "").toLowerCase();
        return (
          !!query &&
          (name === query ||
            customer.customerCode.toLowerCase() === query ||
            name.includes(query) ||
            query.includes(name))
        );
      }) ?? null;
    setState((prev) => ({
      ...prev,
      customer: prefillCustomer,
      products: prefillProducts,
      terms: prefill.terms
        ? {
            vatRate: prefill.terms.vatRate ?? prev.terms.vatRate,
            vatCylinderRate:
              prefill.terms.vatCylinderRate ?? prev.terms.vatCylinderRate,
            validityDays: prefill.terms.validityDays ?? prev.terms.validityDays,
            paymentTerms:
              prefill.terms.paymentTerms ||
              (prefillProducts.length > 0
                ? taoDieuKhoanThanhToan(
                    prefillProducts[0].historyItem.input?.paymentDays ?? 30,
                  )
                : prev.terms.paymentTerms),
            deliveryTime: prefill.terms.deliveryTime || prev.terms.deliveryTime,
            deliveryAddress:
              prefill.terms.deliveryAddress ?? prev.terms.deliveryAddress,
            notes: prefill.terms.notes ?? prev.terms.notes,
            quantityTolerance:
              prefill.terms.quantityTolerance ?? prev.terms.quantityTolerance,
            techRequirement:
              prefill.terms.techRequirement ?? prev.terms.techRequirement,
          }
        : prev.terms,
    }));
    if (!prefillCustomer) {
      const query = (prefill.customerName ?? "").trim();
      const tonTaiNgoaiQuyen =
        !!query &&
        tatCaKhach.some((customer) => {
          const name = tenKhachHang(customer).toLowerCase();
          const q = query.toLowerCase();
          return (
            name === q ||
            customer.customerCode.toLowerCase() === q ||
            name.includes(q) ||
            q.includes(name)
          );
        });
      setError(
        tonTaiNgoaiQuyen
          ? `Khách hàng "${query}" không do bạn quản lý. Vui lòng chọn khách hàng khác.`
          : "Không tìm thấy khách hàng từ lịch sử. Vui lòng chọn khách hàng trước khi lưu báo giá.",
      );
    }
  }, [history]);

  const daDocBaoGiaSua = useRef(false);
  useEffect(() => {
    if (!baoGiaDangSua || daDocBaoGiaSua.current) return;
    daDocBaoGiaSua.current = true;
    const bg = baoGiaDangSua;
    const tatCaKhach = docKhachHang();
    const maKH = bg.pricingSheets?.[0]?.customer?.codeName?.trim() || "";
    const khachHang = tatCaKhach.find((c) => c.customerCode === maKH) || null;
    const sheets = bg.pricingSheets ?? [];
    const bagSpecs = (bg.inputValue?.productBagSpecs as any[]) ?? [];
    type SavedSpec = { chotGia?: number; finalPrice?: number; bagSpec?: any; productName?: string };
    const specMap = new Map<string, SavedSpec>();
    for (let i = 0; i < bagSpecs.length; i++) {
      const bs = bagSpecs[i];
      const entry: SavedSpec = {
        chotGia: typeof bs?.chotGia === "number" ? bs.chotGia : undefined,
        finalPrice: typeof bs?.finalPrice === "number" ? bs.finalPrice : undefined,
        bagSpec: bs?.bagSpec || undefined,
        productName: (bs?.productName as string) || undefined,
      };
      const pid = (bs?.pricingSheetId as string) || "";
      if (pid) specMap.set(pid, entry);
      // Index fallback key
      specMap.set(`__idx_${i}`, entry);
      if (entry.productName) specMap.set(`__name_${entry.productName}`, entry);
    }
    const laySpecDaLuu = (sheetId: string, productName: string, idx: number): SavedSpec | undefined => {
      return (
        specMap.get(sheetId) ||
        specMap.get(`__name_${productName}`) ||
        specMap.get(`__idx_${idx}`)
      );
    };
    const sanPham: WizardProduct[] = [];
    for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
      const sheet = sheets[sheetIdx];
      const dv = (sheet.inputValue ?? {}) as Record<string, unknown>;
      const kq = (sheet.saleResult ?? sheet.masterResult ?? {}) as Record<
        string,
        unknown
      >;
      const cauTruc = buildStructureFromLayers(materials, [
        dv.layer1Id as string | undefined,
        dv.layer2Id as string | undefined,
        dv.layer3Id as string | undefined,
        dv.layer4Id as string | undefined,
        dv.layer5Id as string | undefined,
      ]);
      const productName =
        (dv.productName as string) || sheet.pricingSheetName || "";
      const specFromServer = laySpecDaLuu(sheet.id, productName, sheetIdx);
      const giaAo = {
        id: sheet.id,
        customer: maKH,
        productName,
        productType: (dv.productType as string) || "tui",
        structure: cauTruc || productName || "",
        quantity: (dv.quantity as number) || 0,
        finalPrice: specFromServer?.finalPrice ?? ((kq.finalPrice as number) || 0),
        chotGia: specFromServer?.chotGia ?? undefined,
        profitRate: (kq.profitRate as number) || 0,
        input: dv as any,
        pricingSheetId: sheet.id,
        bagType: (dv.bagType as string) || "",
        numColors: typeof dv.numColors === "number" ? dv.numColors : 0,
        spreadWidth: (dv.spreadWidth as number) || 0,
        cutStep: (dv.cutStep as number) || 0,
        cylLength: (dv.cylLength as number) || 0,
        cylCircum: (dv.cylCircum as number) || 0,
        totalArea: (dv.totalArea as number) || 0,
      } as any as HistoryItem;
      sanPham.push(
        buildWizardProductFromHistoryItem(giaAo, specFromServer?.bagSpec),
      );
    }
    const iv = (bg.inputValue ?? {}) as Record<string, unknown>;
    const dieuKhoan = {
      vatRate: (iv.vatRate as number) ?? 8,
      vatCylinderRate: (iv.vatCylinderRate as number) ?? 10,
      validityDays: (iv.validityDays as number) ?? 30,
      paymentTerms:
        (iv.paymentTerms as string) ||
        (sanPham.length > 0
          ? taoDieuKhoanThanhToan(
              ((
                sanPham[0].historyItem.input as unknown as Record<
                  string,
                  unknown
                >
              )?.paymentDays as number) ?? 30,
            )
          : "Thanh toán 30 ngày"),
      deliveryTime: (iv.deliveryTime as string) || "7-10 ngày làm việc",
      ...(() => {
        const tach = tachDiaDiemTuGhiChu(
          (iv.notes as string) || "",
          (iv.deliveryAddress as string) || "",
        );
        return {
          deliveryAddress: tach.deliveryAddress || khachHang?.address || "",
          notes: tach.notes,
        };
      })(),
      quantityTolerance: (iv.quantityTolerance as number) ?? 10,
      techRequirement:
        (iv.techRequirement as string) || "Chạy theo market ký duyệt",
    };
    setState({ customer: khachHang, products: sanPham, terms: dieuKhoan });
  }, [baoGiaDangSua]);

  const daKhoiPhucSnapshot = useRef(false);
  useEffect(() => {
    if (daKhoiPhucSnapshot.current || dangSua) return;
    const snapshot = (dungCuaHangTinhGia as any).getState().quoteWizardSnapshot;
    if (snapshot && snapshot.customer && snapshot.products?.length > 0) {
      daKhoiPhucSnapshot.current = true;
      setState({
        customer: snapshot.customer,
        products: snapshot.products,
        terms: snapshot.terms || state.terms,
      });
      (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangSua]);

  // ── Autosave nháp bảng báo giá (kháng reload/đóng tab đột ngột) ──────────────
  // Debounce lưu state xuống localStorage; không áp dụng khi đang sửa bản cũ.
  const boDemNhapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const daLuuThanhCongRef = useRef(false);
  useEffect(() => {
    if (dangSua) return;
    if (boDemNhapRef.current) clearTimeout(boDemNhapRef.current);
    const coDuLieu = !!(state.customer || state.products.length > 0);
    if (!coDuLieu) return;
    boDemNhapRef.current = setTimeout(() => {
      daLuuThanhCongRef.current = false;
      luuNhapBaoGia(window.localStorage, state);
    }, 500);
    return () => {
      if (boDemNhapRef.current) clearTimeout(boDemNhapRef.current);
    };
  }, [state, dangSua]);

  // Khôi phục nháp khi mở wizard TẠO MỚI (chưa có prefill từ lịch sử, chưa có snapshot).
  const daXetNhapKhiMoRef = useRef(false);
  useEffect(() => {
    if (dangSua || daXetNhapKhiMoRef.current) return;
    if (prefillApplied.current || daKhoiPhucSnapshot.current) return;
    daXetNhapKhiMoRef.current = true;
    const draft = docNhapBaoGia<WizardState>(window.localStorage);
    if (!draft) return;
    const h = draft.state;
    if (!(h.customer || h.products?.length > 0)) return;
    setState((prev) => ({
      customer: h.customer ?? prev.customer,
      products: h.products ?? prev.products,
      terms: h.terms ?? prev.terms,
    }));
    setSavedAtNhap(draft.savedAt);
    setDaKhoiPhucNhap(true);
  }, [dangSua]);

  // Cảnh báo trước khi reload/đóng tab còn bảng báo giá đang soạn (nháp chưa đồng bộ lên máy chủ).
  useEffect(() => {
    const canhBao = (e: BeforeUnloadEvent) => {
      if (dangSua || daLuuThanhCongRef.current || !hasDataRef.current) return;
      luuNhapBaoGia(window.localStorage, state);
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", canhBao);
    return () => window.removeEventListener("beforeunload", canhBao);
  }, [state, dangSua]);

  // Chặn chuyển tab khi wizard đang có data chưa lưu
  useEffect(() => {
    const unsub = (dungCuaHangTinhGia as any).subscribe(
      (state: any, prev: any) => {
        if (
          state.activeModule &&
          state.activeModule !== "quotations" &&
          prev.activeModule === "quotations" &&
          hasDataRef.current &&
          !exitingRef.current
        ) {
          pendingModuleRef.current = state.activeModule;
          (dungCuaHangTinhGia as any).setState({ activeModule: "quotations" });
          setConfirmExit(true);
        }
      },
    );
    return unsub;
  }, []);

  const handleCancelWizard = () => {
    if (hasData) {
      pendingModuleRef.current = null;
      setConfirmExit(true);
    } else {
      datBaoGiaDangSua(null);
      (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot(null);
      onClose();
    }
  };

  const handleCreateNew = () => {
    setConfirmCreateNew(false);
    (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot(null);
    daLuuThanhCongRef.current = false;
    xoaNhapBaoGia(window.localStorage);
    setDaKhoiPhucNhap(false);
    setState({
      customer: null,
      products: [],
      terms: {
        vatRate: 8,
        vatCylinderRate: 10,
        validityDays: 30,
        paymentTerms: "Thanh toán 30 ngày",
        deliveryTime: "7-10 ngày làm việc",
        deliveryAddress: "",
        notes: "",
        quantityTolerance: 10,
        techRequirement: "Chạy theo market ký duyệt",
      },
    });
    setError("");
    setErrorSection(null);
    datBaoGiaDangSua(null);
  };

  const handleForceExit = () => {
    exitingRef.current = true;
    const target = pendingModuleRef.current;
    datBaoGiaDangSua(null);
    (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot(null);
    onClose();
    if (target) {
      (dungCuaHangTinhGia as any).setState({ activeModule: target });
    }
  };

  const handleSaoChepWizard = () => {
    setConfirmSaoChep(false);
    datBaoGiaDangSua(null);

    const copiedProducts = state.products.map((p) => ({
      ...p,
      historyItem: {
        ...p.historyItem,
        id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
        date: new Date().toLocaleDateString("vi-VN"),
        pricingSheetId: undefined,
      },
      tiers: p.tiers.map((t) => ({ ...t })),
    }));

    setState({
      customer: state.customer,
      products: copiedProducts,
      terms: { ...state.terms },
    });
    setError("");
    setErrorSection(null);
  };

  const handleViewPricing = async (pIdx: number) => {
    const product = state.products[pIdx];
    if (!product) return;
    exitingRef.current = true;
    (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot({
      customer: state.customer,
      products: state.products,
      terms: state.terms,
    });
    const ok = await dungCuaHangTinhGia.getState().moBangTinhVoiPin(product.historyItem.id);
    if (!ok) return;
    dieuHuongMenuApp(menuKeyTinhGiaTheoItem(product.historyItem));
  };

  const handleCustomerSelect = (c: Customer) => {
    if (dangSua) return;
    setState((prev) => ({ ...prev, customer: c }));
    // Auto-scroll to section 2 after selecting customer
    setTimeout(() => {
      section2Ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  // Đẩy báo giá lên server theo schema mới:
  //   1) Dùng pricingSheetId đã có (đã sync từ màn tính giá), chỉ tạo mới khi chưa có.
  //   2) Tạo quotation tham chiếu toàn bộ pricingSheetIds.
  //   3) Nộp duyệt (PATCH status_update) khi sendForApproval.
  // Tạo báo giá trên server trước. Chỉ lưu local sau khi server thành công.
  /** Gộp địa điểm + ghi chú — chỉ dùng khi hiển thị PDF / mô tả, KHÔNG ghi đè field form. */
  function mergeGhiChu(terms: WizardState["terms"]): string {
    const diaDiem = terms.deliveryAddress?.trim();
    const ghiChu = terms.notes?.trim();
    if (diaDiem && ghiChu) return `Địa điểm giao hàng: ${diaDiem}\n\n${ghiChu}`;
    if (diaDiem) return `Địa điểm giao hàng: ${diaDiem}`;
    return ghiChu || "";
  }

  /** Tách format cũ "Địa điểm giao hàng: ...\n\n..." khỏi notes khi load. */
  function tachDiaDiemTuGhiChu(
    notesRaw: string,
    deliveryAddressRaw: string,
  ): { deliveryAddress: string; notes: string } {
    const notes = (notesRaw || "").trim();
    let deliveryAddress = (deliveryAddressRaw || "").trim();
    const m = notes.match(
      /^Địa điểm giao hàng:\s*([\s\S]+?)(?:\n\n([\s\S]*))?$/i,
    );
    if (m) {
      if (!deliveryAddress) deliveryAddress = (m[1] || "").trim();
      return { deliveryAddress, notes: (m[2] || "").trim() };
    }
    return { deliveryAddress, notes };
  }
  const dayBaoGiaLenServer = useCallback(
    async (
      products: WizardProduct[],
      customer: Customer | null,
      terms: WizardState["terms"],
      sendForApproval: boolean,
    ): Promise<string> => {
      if (!products.length || !customer)
        throw new Error("Thiếu dữ liệu báo giá để gửi lên máy chủ.");
      if (!isAuthenticated || !accessToken)
        throw new Error(
          "Chưa đăng nhập, không thể lưu/gửi báo giá lên máy chủ.",
        );

      const maKH = (customer.customerCode || "").trim();
      if (!maKH) throw new Error("Khách hàng chưa có mã khách hàng.");
      const checkKH = kiemTraMaKhachHang(maKH);
      if (!checkKH.hopLe)
        throw new Error(checkKH.loi ?? "Mã khách hàng không hợp lệ.");

      try {
        const bgDangSua = dungCuaHangTinhGia.getState().baoGiaDangSua;
        const laDangSua = !!bgDangSua;

        if (laDangSua && bgDangSua) {
          const pricingSheetIds: string[] = [];
          for (const prod of products) {
            if (prod.historyItem.pricingSheetId) {
              pricingSheetIds.push(prod.historyItem.pricingSheetId);
              continue;
            }
            const sheet = await taoPricingSheetService(
              mapHistoryToPricingSheet(prod.historyItem, checkKH.maKhachHang),
              accessToken,
            );
            if (sheet?.id) {
              pricingSheetIds.push(sheet.id);
              prod.historyItem.pricingSheetId = sheet.id;
            }
          }
          if (pricingSheetIds.length === 0)
            throw new Error("Không có pricing sheet nào để cập nhật.");

          await capNhatBaoGiaService(
            bgDangSua.id,
            {
              moTa: mergeGhiChu(terms) || undefined,
              duLieuDauVao: {
                vatRate: terms.vatRate,
                vatCylinderRate: terms.vatCylinderRate,
                validityDays: terms.validityDays,
                paymentTerms: terms.paymentTerms,
                deliveryTime: terms.deliveryTime,
                deliveryAddress: terms.deliveryAddress?.trim() || "",
                notes: terms.notes?.trim() || "",
                quantityTolerance: terms.quantityTolerance,
                techRequirement: terms.techRequirement,
                productBagSpecs: products.map((prod) => ({
                  sourceHistoryItemId: prod.historyItem.id,
                  pricingSheetId: prod.historyItem.pricingSheetId,
                  productName: prod.historyItem.productName,
                  bagSpec: prod.bagSpec,
                  finalPrice:
                    prod.tiers[0]?.finalPrice ?? prod.historyItem.finalPrice,
                  chotGia: prod.tiers[0]?.baoGia,
                })),
              },
              dsPricingSheetId: pricingSheetIds,
            },
            accessToken,
          );

          if (sendForApproval) {
            const pinToken = await promptPin(
              "Gửi duyệt báo giá",
              "Nhập mã PIN để gửi báo giá chờ duyệt.",
            );
            await nopBaoGiaService(bgDangSua.id, accessToken, pinToken);
          }
          return bgDangSua.id;
        }

        // Bước 1: gom pricingSheetIds — dùng id đã có, chỉ tạo mới khi chưa có.
        const pricingSheetIds: string[] = [];
        for (const prod of products) {
          if (prod.historyItem.pricingSheetId) {
            pricingSheetIds.push(prod.historyItem.pricingSheetId);
            continue;
          }
          const sheet = await taoPricingSheetService(
            mapHistoryToPricingSheet(prod.historyItem, checkKH.maKhachHang),
            accessToken,
          );
          if (sheet?.id) {
            pricingSheetIds.push(sheet.id);
            prod.historyItem.pricingSheetId = sheet.id;
          }
        }
        if (pricingSheetIds.length === 0)
          throw new Error("Không tạo được pricing sheet trên máy chủ.");

        // Bước 2: tạo quotation tham chiếu các pricing sheet.
        const created = await taoBaoGiaService(
          {
            customerCodeName: checkKH.maKhachHang,
            description: mergeGhiChu(terms) || undefined,
            inputValue: {
              vatRate: terms.vatRate,
              vatCylinderRate: terms.vatCylinderRate,
              validityDays: terms.validityDays,
              paymentTerms: terms.paymentTerms,
              deliveryTime: terms.deliveryTime,
              deliveryAddress: terms.deliveryAddress?.trim() || "",
              notes: terms.notes?.trim() || "",
              quantityTolerance: terms.quantityTolerance,
              techRequirement: terms.techRequirement,
              productBagSpecs: products.map((prod) => ({
                sourceHistoryItemId: prod.historyItem.id,
                pricingSheetId: prod.historyItem.pricingSheetId,
                productName: prod.historyItem.productName,
                bagSpec: prod.bagSpec,
                finalPrice:
                  prod.tiers[0]?.finalPrice ?? prod.historyItem.finalPrice,
                chotGia: prod.tiers[0]?.baoGia,
              })),
            },
            pricingSheetIds,
          },
          accessToken,
        );

        if (sendForApproval) {
          if (!created?.id)
            throw new Error(
              "Báo giá đã tạo trên máy chủ nhưng không lấy được ID để nộp duyệt.",
            );
          const pinToken = await promptPin(
            "Gửi duyệt báo giá",
            "Nhập mã PIN để gửi báo giá chờ duyệt.",
          );
          await nopBaoGiaService(created.id, accessToken, pinToken);
        }
        if (!created?.id)
          throw new Error(
            "Báo giá đã tạo trên máy chủ nhưng không lấy được ID.",
          );
        return created.id;
      } catch (e) {
        console.warn("Đồng bộ báo giá lên máy chủ thất bại:", e);
        throw e instanceof Error
          ? e
          : new Error("Đồng bộ báo giá lên máy chủ thất bại.");
      }
    },
    [accessToken, isAuthenticated, promptPin],
  );

  const handleSave = useCallback(
    async (sendForApproval: boolean) => {
      setError("");
      setErrorSection(null);
      if (!state.customer) {
        setError("Vui lòng chọn khách hàng");
        setErrorSection(1);
        section1Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      if (
        role !== "admin" &&
        !laNguoiPhuTrach(state.customer, currentSellerId)
      ) {
        setError("Bạn chỉ được tạo báo giá cho khách hàng mình quản lý.");
        setErrorSection(1);
        section1Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      if (state.products.length === 0) {
        setError("Vui lòng thêm ít nhất 1 sản phẩm");
        setErrorSection(2);
        section2Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      const missing = state.products.find(
        (p) => p.tiers.length === 0 || p.tiers.every((t) => t.quantity <= 0),
      );
      if (missing) {
        setError(
          `Sản phẩm "${missing.historyItem.productName}" chưa có mức số lượng hợp lệ`,
        );
        setErrorSection(2);
        section2Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      setSaving(true);
      try {
        const products: QuoteProductLine[] = state.products.map((prod) => {
          const tiers: QuoteTier[] = prod.tiers
            .filter((t) => t.quantity > 0)
            .map((t) => ({
              historyItemId: prod.historyItem.id,
              quantity: t.quantity,
              finalPrice: t.finalPrice,
              chotGia: t.baoGia,
              profitRate: prod.historyItem.profitRate,
            }));
          return {
            sourceHistoryItemId: prod.historyItem.id,
            productName: prod.historyItem.productName,
            structure: prod.historyItem.structure,
            quantity: tiers[0]?.quantity ?? prod.historyItem.quantity,
            finalPrice: tiers[0]?.finalPrice ?? prod.historyItem.finalPrice,
            chotGia: tiers[0]?.chotGia,
            profitRate: prod.historyItem.profitRate,
            input: { ...prod.historyItem.input },
            bagSpec: prod.bagSpec,
            tiers,
          };
        });
        const quotationId = await dayBaoGiaLenServer(
          state.products,
          state.customer,
          state.terms,
          sendForApproval,
        );

        taoBaoGiaMoi({
          customer: state.customer ? tenKhachHang(state.customer) : "",
          products,
          terms: {
            ...state.terms,
            deliveryAddress: state.terms.deliveryAddress?.trim() || "",
            notes: state.terms.notes?.trim() || "",
          },
          sendForApproval,
          quotationId,
        });

        datBaoGiaDangSua(null);
        (dungCuaHangTinhGia as any).getState().datQuoteWizardSnapshot(null);
        // Lưu thành công — xóa nháp, không cần cảnh báo trước khi đóng nữa.
        daLuuThanhCongRef.current = true;
        xoaNhapBaoGia(window.localStorage);
        setDaKhoiPhucNhap(false);
        onClose();
        onSavedNavigate?.();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Có lỗi khi lưu báo giá lên máy chủ. Vui lòng thử lại.",
        );
        setSaving(false);
      }
    },
    [
      state.products,
      state.customer,
      state.terms,
      taoBaoGiaMoi,
      onClose,
      onSavedNavigate,
      dayBaoGiaLenServer,
      role,
      currentSellerId,
    ],
  );

  const canSaveDraft = !!state.customer;
  const canSubmit = !!state.customer && state.products.length > 0;

  const handleExportDocx = useCallback(() => {
    if (!canSubmit) return;
    const item = {
      customer: state.customer?.companyName || "",
      date: new Date().toLocaleDateString("vi-VN"),
      sellerName: currentSellerName || "",
      quoteCode: "",
      isQuote: true,
      productName: state.products[0]?.historyItem.productName || "",
      structure: state.products[0]?.historyItem.structure || "",
      quantity: state.products[0]?.tiers[0]?.quantity || 0,
      finalPrice: state.products[0]?.tiers[0]?.finalPrice || 0,
      chotGia: state.products[0]?.tiers[0]?.baoGia,
      input: state.products[0]?.historyItem.input,
      tiers: state.products[0]?.tiers.map((t) => ({
        quantity: t.quantity,
        finalPrice: t.finalPrice,
        chotGia: t.baoGia,
      })),
      quoteProducts: state.products.map((p) => ({
        sourceHistoryItemId: p.historyItem.id,
        productName: p.historyItem.productName,
        structure: p.historyItem.structure,
        quantity: p.tiers[0]?.quantity || p.historyItem.quantity,
        finalPrice: p.tiers[0]?.finalPrice || p.historyItem.finalPrice,
        chotGia: p.tiers[0]?.baoGia,
        input: p.historyItem.input,
        bagSpec: p.bagSpec,
        tiers: p.tiers.map((t) => ({
          historyItemId: p.historyItem.id,
          quantity: t.quantity,
          finalPrice: t.finalPrice,
          chotGia: t.baoGia,
        })),
      })),
      terms: { ...state.terms, notes: mergeGhiChu(state.terms) },
    } as any as HistoryItem;
    setPreviewState({
      item,
      customerInfo: {
        address: state.customer?.address || "",
        taxCode: state.customer?.taxCode || "",
        phone: state.customer?.phone || "",
        description: mergeGhiChu(state.terms) || "",
      },
    });
  }, [state, currentSellerName, canSubmit]);

  const handleExportPdf = useCallback(() => {
    if (!canSubmit) return;
    const item = {
      customer: state.customer?.companyName || "",
      date: new Date().toLocaleDateString("vi-VN"),
      sellerName: currentSellerName || "",
      quoteCode: "",
      isQuote: true,
      productName: state.products[0]?.historyItem.productName || "",
      structure: state.products[0]?.historyItem.structure || "",
      quantity: state.products[0]?.tiers[0]?.quantity || 0,
      finalPrice: state.products[0]?.tiers[0]?.finalPrice || 0,
      chotGia: state.products[0]?.tiers[0]?.baoGia,
      input: state.products[0]?.historyItem.input,
      tiers: state.products[0]?.tiers.map((t) => ({
        quantity: t.quantity,
        finalPrice: t.finalPrice,
        chotGia: t.baoGia,
      })),
      quoteProducts: state.products.map((p) => ({
        sourceHistoryItemId: p.historyItem.id,
        productName: p.historyItem.productName,
        structure: p.historyItem.structure,
        quantity: p.tiers[0]?.quantity || p.historyItem.quantity,
        finalPrice: p.tiers[0]?.finalPrice || p.historyItem.finalPrice,
        chotGia: p.tiers[0]?.baoGia,
        input: p.historyItem.input,
        bagSpec: p.bagSpec,
        tiers: p.tiers.map((t) => ({
          historyItemId: p.historyItem.id,
          quantity: t.quantity,
          finalPrice: t.finalPrice,
          chotGia: t.baoGia,
        })),
      })),
      terms: { ...state.terms, notes: mergeGhiChu(state.terms) },
    } as any as HistoryItem;
    setPreviewState({
      item,
      customerInfo: {
        address: state.customer?.address || "",
        taxCode: state.customer?.taxCode || "",
        phone: state.customer?.phone || "",
        description: mergeGhiChu(state.terms) || "",
      },
    });
  }, [state, currentSellerName, canSubmit]);

  return (
    <div
      className="crm-root quote-wizard-root"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <style>{WIZARD_STYLES}</style>

      {/* Sticky Header */}
      <div className="sp-sticky-header quote-wizard-header">
        <div className="quote-wizard-header-title">
          <div className="quote-wizard-title-stack">
            <h2 className="quote-wizard-title">
              {dangSua ? "Cập nhật báo giá" : "Tạo báo giá mới"}
            </h2>
            <div className="quote-wizard-subtitle">
              {dangSua
                ? `Bước 1/3: Khách hàng (không thể thay đổi)`
                : "Bước 1/3: Chọn khách hàng"}
            </div>
          </div>
        </div>
        <div
          className="quote-wizard-header-actions"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={() => handleExportPdf()}
            disabled={!canSubmit}
          >
            <FileDown size={14} /> Xuất PDF
          </button>
          {(!dangSua || baoGiaDangSua?.original?.canUpdate) && (
            <button
              className="wiz-btn wiz-btn--secondary"
              onClick={() => handleSave(false)}
              disabled={saving || !canSaveDraft}
            >
              {dangSua ? "Cập nhật" : "Lưu"}
            </button>
          )}
          {dangSua && (
            <button
              className="wiz-btn wiz-btn--secondary"
              onClick={() => setConfirmSaoChep(true)}
            >
              <Copy size={14} /> Sao chép
            </button>
          )}
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={() => setConfirmCreateNew(true)}
            style={{ color: "#dc2626" }}
          >
            <Plus size={14} /> Tạo mới
          </button>
        </div>
      </div>

      {dangSua && (
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface2, #f8f9fb)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <FileText size={16} style={{ color: 'var(--accent, #0891b2)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--foreground, #111)' }}>
            Đang chỉnh sửa báo giá
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>
            Nhấn quay lại để về Danh sách báo giá.
          </div>
        </div>
        <button className="wiz-btn wiz-btn--ghost" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          <ArrowLeft size={14} /> Danh sách báo giá
        </button>
      </div>
      )}

      {daKhoiPhucNhap && !dangSua && (
      <div role="status" style={{ padding: '10px 24px', borderBottom: '1px solid rgba(245, 158, 11, 0.4)', background: 'var(--surface, #fff8e1)', display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.82rem', color: '#78350f' }}>
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          Đã phục hồi bản nháp bảng báo giá{' '}
          {savedAtNhap ? `(${new Date(savedAtNhap).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})` : ''}.
          Bạn có thể tiếp tục chỉnh sửa hoặc bấm <strong>Tạo mới</strong> để bỏ nháp.
        </div>
        <button type="button" className="wiz-btn wiz-btn--ghost" onClick={() => setDaKhoiPhucNhap(false)}>
          Ẩn
        </button>
      </div>
      )}

      {/* Scrollable content */}
      <div
        className="quote-wizard-content"
        style={{ flex: 1, overflow: "auto", padding: "24px" }}
      >
        {error && (
          <div className="wiz-error" role="alert">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Section 1: Khách hàng */}
        <div
          ref={section1Ref}
          className={`sp-section${errorSection === 1 ? " sp-section--error" : ""}`}
        >
          <h3 className="sp-section-title">
            <span className="sp-section-num">1</span>
            Khách hàng
          </h3>
          <BuocChonKhachHang
            selected={state.customer}
            onSelect={handleCustomerSelect}
            chiDoc={dangSua}
          />
        </div>

        {/* Section 2: Sản phẩm & Giá */}
        <div
          ref={section2Ref}
          className={`sp-section${!state.customer ? " sp-section--disabled" : ""}${errorSection === 2 ? " sp-section--error" : ""}`}
        >
          {!state.customer && (
            <div className="sp-disabled-overlay">
              Chọn khách hàng để tiếp tục
            </div>
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
              onProductsChange={(p) =>
                setState((prev) => ({ ...prev, products: p }))
              }
              materials={materials}
              constants={constants}
              profitTable={profitTable}
              smallWidthPrices={smallWidthPrices}
              onViewPricing={(pIdx) => void handleViewPricing(pIdx)}
            />
          )}
        </div>

        {/* Section 3: Điều khoản & Xác nhận */}
        <div
          className={`sp-section${!state.customer ? " sp-section--disabled" : ""}${errorSection === 3 ? " sp-section--error" : ""}`}
        >
          {!state.customer && (
            <div className="sp-disabled-overlay">
              Chọn khách hàng để tiếp tục
            </div>
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
              onTermsChange={(t) => setState((prev) => ({ ...prev, terms: t }))}
              currentSellerName={currentSellerName || ""}
            />
          )}
        </div>
      </div>

      <div className="quote-wizard-mobile-action">
        <button
          className="wiz-btn wiz-btn--secondary"
          onClick={() => handleExportPdf()}
          disabled={!canSubmit}
        >
          <FileText size={14} /> Xem PDF báo giá
        </button>
        {(!dangSua || baoGiaDangSua?.original?.canUpdate) && (
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={() => handleSave(false)}
            disabled={saving || !canSaveDraft}
          >
            {dangSua ? "Cập nhật" : "Lưu nháp"}
          </button>
        )}
        {dangSua && (
          <button
            className="wiz-btn wiz-btn--secondary"
            onClick={() => setConfirmSaoChep(true)}
          >
            <Copy size={14} /> Sao chép
          </button>
        )}
        <button
          className="wiz-btn wiz-btn--secondary"
          onClick={() => setConfirmCreateNew(true)}
          style={{ color: "#dc2626" }}
        >
          <Plus size={14} /> Tạo mới
        </button>
      </div>

      {/* Confirm create new dialog */}
      {confirmCreateNew && (
        <div
          className="lts-confirm-backdrop"
          onClick={() => setConfirmCreateNew(false)}
        >
          <div
            className="lts-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lts-confirm-icon">🔄</div>
            <h3 className="lts-confirm-title">Tạo báo giá mới?</h3>
            <p className="lts-confirm-desc">
              Dữ liệu đang nhập sẽ bị xóa.
              <br />
              Bạn có chắc muốn tiếp tục?
            </p>
            <div className="lts-confirm-actions">
              <button
                className="btn btn-outline"
                onClick={() => setConfirmCreateNew(false)}
              >
                Hủy
              </button>
              <button className="btn btn-danger" onClick={handleCreateNew}>
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm sao chép dialog */}
      {confirmSaoChep && (
        <div
          className="lts-confirm-backdrop"
          onClick={() => setConfirmSaoChep(false)}
        >
          <div
            className="lts-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lts-confirm-icon">📋</div>
            <h3 className="lts-confirm-title">Sao chép báo giá?</h3>
            <p className="lts-confirm-desc">
              Dữ liệu hiện tại sẽ được sao chép thành báo giá mới.
              <br />
              Bản cập nhật hiện tại sẽ không được lưu.
            </p>
            <div className="lts-confirm-actions">
              <button
                className="btn btn-outline"
                onClick={() => setConfirmSaoChep(false)}
              >
                Hủy
              </button>
              <button className="btn btn-danger" onClick={handleSaoChepWizard}>
                Sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm exit dialog */}
      {confirmExit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              maxWidth: 380,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>
              Thoát mà không lưu?
            </div>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: 20 }}>
              Báo giá chưa được lưu. Nếu thoát, mọi thay đổi sẽ bị mất.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                className="wiz-btn wiz-btn--secondary"
                onClick={() => setConfirmExit(false)}
              >
                Ở lại
              </button>
              <button
                className="wiz-btn wiz-btn--danger"
                onClick={handleForceExit}
              >
                Thoát không lưu
              </button>
            </div>
          </div>
        </div>
      )}
      {previewState && (
        <BaoGiaPreviewModal
          open={!!previewState}
          onClose={() => setPreviewState(null)}
          item={previewState.item}
          customerInfo={previewState.customerInfo}
        />
      )}
      <NhapPinDuyetModal
        open={pin.open}
        title={pin.title}
        message={pin.message}
        onConfirm={pin.confirm}
        onClose={pin.cancel}
      />
    </div>
  );
}

// QUOTE DETAIL PANEL — slide-in xem/sửa báo giá
// ════════════════════════════════════════════════════════════
type QuoteEditDraft = {
  customer: string;
  productName: string;
  chotGia: string;
  quoteStatus: string;
};

function QuoteDetailPanel({
  item,
  isAdmin,
  onClose,
  onLoadCalc,
  onPatch,
  onStatusUpdate,
}: {
  item: HistoryItem;
  isAdmin: boolean;
  onClose: () => void;
  onLoadCalc: (id: string) => void;
  onPatch: (
    id: string,
    patch: Partial<
      Pick<HistoryItem, "customer" | "productName" | "chotGia" | "quoteStatus">
    >,
  ) => void;
  onStatusUpdate: (
    muc: HistoryItem,
    status: QuoteStatus,
  ) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<QuoteEditDraft>({
    customer: item.customer,
    productName: item.productName,
    chotGia: item.chotGia ? String(item.chotGia) : "",
    quoteStatus: item.quoteStatus ?? "drafted",
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [previewState, setPreviewState] = useState<{
    item: HistoryItem;
    customerInfo: {
      address?: string;
      taxCode?: string;
      phone?: string;
      fax?: string;
      description?: string;
    };
  } | null>(null);

  const isDirty =
    editing &&
    (draft.customer !== item.customer ||
      draft.productName !== item.productName ||
      draft.chotGia !== (item.chotGia ? String(item.chotGia) : "") ||
      draft.quoteStatus !== (item.quoteStatus ?? "drafted"));

  function buildPatch() {
    const patch: Partial<
      Pick<HistoryItem, "customer" | "productName" | "chotGia" | "quoteStatus">
    > = {};
    if (draft.customer !== item.customer) patch.customer = draft.customer;
    if (draft.productName !== item.productName)
      patch.productName = draft.productName;
    const parsedGia = draft.chotGia
      ? Number(draft.chotGia.replace(/\D/g, ""))
      : 0;
    if (parsedGia !== (item.chotGia ?? 0))
      patch.chotGia = parsedGia || undefined;
    if (draft.quoteStatus !== (item.quoteStatus ?? "drafted"))
      patch.quoteStatus = draft.quoteStatus as QuoteStatus;
    return patch;
  }

  async function savePatch(shouldClose = false) {
    const patch = buildPatch();
    try {
      if (patch.quoteStatus === "pending_approval") {
        await onStatusUpdate(item, "pending_approval");
        delete patch.quoteStatus;
      }
      if (Object.keys(patch).length > 0) onPatch(item.id, patch);
      setEditing(false);
      setConfirmSave(false);
      setConfirmClose(false);
      if (shouldClose) onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Không cập nhật được trạng thái báo giá.",
      );
      setConfirmSave(false);
      setConfirmClose(false);
    }
  }

  function handleClose() {
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function handleSave() {
    if (!isDirty) {
      setEditing(false);
      return;
    }
    setConfirmSave(true);
  }

  const status = layTrangThai(item);
  const cauHinh = QUOTE_STATUS_CONFIG[status];
  const shownPrice =
    item.chotGia && item.chotGia > 0 ? item.chotGia : item.finalPrice;
  const hienThiGia = getPricingDisplayMeta(item.input);

  return (
    <>
      <style>{WIZARD_STYLES}</style>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
      />

      {/* Confirm close dialog */}
      {confirmClose && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
              maxWidth: 360,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>
              Chưa lưu thay đổi
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                marginBottom: 20,
              }}
            >
              Bạn có thay đổi chưa được lưu. Đóng sẽ mất các thay đổi này.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="wiz-btn wiz-btn--secondary"
                onClick={() => setConfirmClose(false)}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                className="wiz-btn wiz-btn--primary"
                onClick={() => {
                  void savePatch(true);
                }}
              >
                Lưu & đóng
              </button>
              <button className="wiz-btn wiz-btn--danger" onClick={onClose}>
                Đóng không lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm save dialog */}
      {confirmSave && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "22px 26px",
              maxWidth: 360,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>
              Xác nhận lưu thay đổi?
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                marginBottom: 18,
              }}
            >
              Thao tác này sẽ cập nhật báo giá và ghi nhật ký thao tác.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                className="wiz-btn wiz-btn--secondary"
                onClick={() => setConfirmSave(false)}
              >
                Hủy
              </button>
              <button
                className="wiz-btn wiz-btn--primary"
                onClick={() => {
                  void savePatch(false);
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Báo giá ${item.quoteCode || item.id}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(60%, 640px)",
          background: "var(--surface, #ffffff)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2, #f8f9fb)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={16} style={{ color: 'var(--accent, #0891b2)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--foreground, #111)' }}>
              {editing ? 'Đang chỉnh sửa báo giá' : 'Đang xem báo giá'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #6b7280)' }}>
              Nhấn quay lại để về Danh sách báo giá.
            </div>
          </div>
          <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Danh sách báo giá
          </button>
        </div>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2, #f8f9fb)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                marginBottom: 2,
              }}
            >
              BÁO GIÁ
              {isDirty && (
                <span style={{ color: "#d97706", marginLeft: 6 }}>
                  ● Chưa lưu
                </span>
              )}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--text, #1e293b)",
              }}
            >
              {item.quoteCode || item.id}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {item.canUpdate && !editing && (
              <button
                className="wiz-btn wiz-btn--secondary"
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                onClick={() => setEditing(true)}
              >
                ✏️ Chỉnh sửa
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          {/* Status badge */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: cauHinh.color,
                background: cauHinh.bg,
              }}
            >
              ● {cauHinh.label}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {item.date}
            </span>
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Khách hàng
                </label>
                <input
                  className="wiz-search-input"
                  value={draft.customer}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customer: e.target.value }))
                  }
                  style={{ paddingLeft: 12 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Tên sản phẩm
                </label>
                <input
                  className="wiz-search-input"
                  value={draft.productName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, productName: e.target.value }))
                  }
                  style={{ paddingLeft: 12 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Giá chốt (₫)
                </label>
                <input
                  className="wiz-search-input"
                  type="text"
                  inputMode="numeric"
                  value={draft.chotGia}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      chotGia: e.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  placeholder="Để trống nếu chưa chốt"
                  style={{ paddingLeft: 12 }}
                />
                {draft.chotGia && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      marginTop: 3,
                    }}
                  >
                    = {dinhDangSo(Number(draft.chotGia))} ₫
                  </div>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Trạng thái
                </label>
                <select
                  className="wiz-search-input"
                  value={draft.quoteStatus}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quoteStatus: e.target.value }))
                  }
                  style={{ paddingLeft: 12 }}
                >
                  {CAC_BUOC_QUY_TRINH.map((s) => (
                    <option key={s} value={s}>
                      {QUOTE_STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Read-only info */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface2, #f8f9fb)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Thông tin không thể chỉnh sửa
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Cấu trúc:
                    </span>
                    <span style={{ fontFamily: "'Courier New', monospace" }}>
                      {item.structure || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Số lượng:
                    </span>
                    <span>
                      {dinhDangSo(item.quantity)}{" "}
                      {hienThiGia.quantityUnitForHistory}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      {hienThiGia.priceTitle}:
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {dinhDangSo(item.finalPrice)} ₫
                    </span>
                  </div>
                  {item.sellerName && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--muted)", minWidth: 100 }}>
                        Sale:
                      </span>
                      <span>{item.sellerName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* General info */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface2, #f8f9fb)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Thông tin chung
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Khách hàng:
                    </span>
                    <span style={{ fontWeight: 500 }}>
                      {item.customer || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Sản phẩm:
                    </span>
                    <span>{item.productName || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Cấu trúc:
                    </span>
                    <span style={{ fontFamily: "'Courier New', monospace" }}>
                      {item.structure || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Số lượng:
                    </span>
                    <span>
                      {dinhDangSo(item.quantity)}{" "}
                      {hienThiGia.quantityUnitForHistory}
                    </span>
                  </div>
                  {item.sellerName && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--muted)", minWidth: 100 }}>
                        Sale:
                      </span>
                      <span>{item.sellerName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing info */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface2, #f8f9fb)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Kết quả tính giá
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      {hienThiGia.priceTitle}:
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {dinhDangSo(item.finalPrice)} ₫
                    </span>
                  </div>
                  {item.chotGia && item.chotGia > 0 && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "var(--muted)", minWidth: 100 }}>
                        {hienThiGia.closedPriceTitle}:
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--green, #059669)",
                        }}
                      >
                        {dinhDangSo(item.chotGia)} ₫
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 100 }}>
                      Tổng giá trị:
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {dinhDangSo(Math.round(shownPrice * item.quantity))} VNĐ
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-product tiers */}
              {item.quoteProducts && item.quoteProducts.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "var(--surface2, #f8f9fb)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Sản phẩm trong báo giá
                  </div>
                  <div style={{ padding: "10px 12px", overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.8rem",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "4px 6px",
                              color: "var(--muted)",
                            }}
                          >
                            Sản phẩm
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "4px 6px",
                              color: "var(--muted)",
                            }}
                          >
                            Mức SL / giá báo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.quoteProducts.map((p) => (
                          <tr key={p.sourceHistoryItemId}>
                            <td
                              style={{
                                padding: "6px",
                                borderTop: "1px solid var(--border)",
                                verticalAlign: "top",
                              }}
                            >
                              <b>{p.productName}</b>
                              <div
                                style={{
                                  color: "var(--muted)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {p.structure}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "6px",
                                borderTop: "1px solid var(--border)",
                                verticalAlign: "top",
                              }}
                            >
                              {p.tiers.map((tier, i) => (
                                <div key={i} style={{ marginBottom: 2 }}>
                                  {dinhDangSo(tier.quantity)}{" "}
                                  {hienThiGia.quantityUnit}:{" "}
                                  <b>
                                    {dinhDangSo(
                                      tier.chotGia ?? tier.finalPrice ?? 0,
                                    )}{" "}
                                    ₫/{hienThiGia.unit}
                                  </b>
                                  <span
                                    style={{
                                      color: "var(--muted)",
                                      marginLeft: 6,
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    ({dinhDangSo(tier.finalPrice)} ₫/
                                    {hienThiGia.unit} đề xuất)
                                  </span>
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
              {!item.quoteProducts?.length &&
                item.tiers &&
                item.tiers.length > 0 && (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "var(--surface2, #f8f9fb)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Bảng giá báo
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontSize: "0.82rem",
                      }}
                    >
                      {item.tiers.map((tier, i) => (
                        <div key={i} style={{ display: "flex", gap: 8 }}>
                          <span
                            style={{ color: "var(--muted)", minWidth: 100 }}
                          >
                            {dinhDangSo(tier.quantity)}{" "}
                            {hienThiGia.quantityUnit}:
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {dinhDangSo(tier.chotGia ?? tier.finalPrice ?? 0)}{" "}
                            ₫/{hienThiGia.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            background: "var(--surface2, #f8f9fb)",
          }}
        >
          {editing ? (
            <>
              <button className="wiz-btn wiz-btn--primary" onClick={handleSave}>
                💾 Lưu
              </button>
              <button
                className="wiz-btn wiz-btn--secondary"
                onClick={() => {
                  setDraft({
                    customer: item.customer,
                    productName: item.productName,
                    chotGia: item.chotGia ? String(item.chotGia) : "",
                    quoteStatus: item.quoteStatus ?? "drafted",
                  });
                  setEditing(false);
                }}
              >
                Huỷ
              </button>
            </>
          ) : (
            <>
              <button
                className="wiz-btn wiz-btn--secondary"
                onClick={() => {
                  onLoadCalc(item.id);
                  onClose();
                }}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <Eye size={13} /> Mở bảng tính giá
              </button>
              <button
                className="wiz-btn wiz-btn--secondary"
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                onClick={() => {
                  const c = docKhachHang().find(
                    (kh) =>
                      kh.companyName === item.customer ||
                      kh.customerCode === item.customer,
                  );
                  setPreviewState({
                    item,
                    customerInfo: {
                      address: c?.address || c?.invoiceAddress || "",
                      taxCode: c?.taxCode || "",
                      phone: c?.phone || "",
                    },
                  });
                }}
              >
                <FileText size={13} /> Xem PDF báo giá
              </button>
            </>
          )}
        </div>
      </div>
      {previewState && (
        <BaoGiaPreviewModal
          open={!!previewState}
          onClose={() => setPreviewState(null)}
          item={previewState.item}
          customerInfo={previewState.customerInfo}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function QuotationModule({
  role,
  menuDangChon,
  khiDieuHuong,
}: {
  role: string;
  hienTaiSellerId?: string;
  menuDangChon?: string;
  khiDieuHuong?: (menuKey: string) => void;
}) {
  const {
    history,
    updateQuoteStatus: capNhatTrangThaiLocal,
    currentSellerId: hienTaiSellerId,
    saoChepBangTinh,
    khoaBaoGia,
    moKhoaBaoGia,
    huyBaoGia,
    kiemTraHetHan,
    patchHistoryItem,
    accessToken,
    isAuthenticated,
    removeHistoryItem: xoaLichSu,
    wizardNguon,
    datNguonWizard,
  } = dungCuaHangTinhGia();
  const [search, setSearch] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [confirmHuy, setConfirmHuy] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [xacNhanXoaBaoGia, datXacNhanXoaBaoGia] = useState<HistoryItem | null>(
    null,
  );
  const pin = useNhapPinPrompt();
  const promptPin = pin.promptPin;

  React.useEffect(() => {
    kiemTraHetHan();
  }, [kiemTraHetHan]);
  React.useEffect(() => {
    if (menuDangChon === "tao-bao-gia") setShowWizard(true);
  }, [menuDangChon]);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(QUOTE_PREFILL_STORAGE_KEY))
        setShowWizard(true);
    } catch {
      /* local only */
    }
  }, []);

  const isAdmin = role === "admin";
  const laLichSuBaoGiaTheoKhach = menuDangChon === "lich-su-bao-gia-theo-khach";

  const myItems = useMemo(() => {
    let items = isAdmin
      ? history
      : history.filter((h) => h.sellerId === hienTaiSellerId);
    items = items.filter(laBanGhiBaoGia);
    if (menuDangChon === "tong-quan-bao-gia-cho-duyet")
      items = items.filter((h) => layTrangThai(h) === "pending_approval");
    if (menuDangChon === "tao-bao-gia")
      items = items.filter((h) => layTrangThai(h) === "drafted");
    if (laLichSuBaoGiaTheoKhach) {
      items = items.filter(
        (h) => daGuiAdmin(h) && namTrongKhoangNgay(h, tuNgay, denNgay),
      );
    }
    return items;
  }, [
    history,
    isAdmin,
    hienTaiSellerId,
    menuDangChon,
    laLichSuBaoGiaTheoKhach,
    tuNgay,
    denNgay,
  ]);

  // Stats cho admin: chỉ đếm muc đã gửi
  const statsItems = isAdmin ? myItems.filter(daGuiAdmin) : myItems;

  const handleOpen = (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    if (item.locked && !isAdmin) {
      alert("Báo giá đã bị khóa. Liên hệ Admin để mở khóa.");
      return;
    }
    setSelectedItem(item);
  };

  const handleCopyQuote = useCallback((muc: HistoryItem) => {
    const prefill: QuotePrefillFromHistory = {
      customerName: muc.customer,
      createdAt: new Date().toISOString(),
    };
    if (muc.quoteProducts && muc.quoteProducts.length > 0) {
      prefill.quoteProducts = muc.quoteProducts;
    }
    if (muc.terms) {
      prefill.terms = muc.terms;
    }
    window.localStorage.setItem(
      QUOTE_PREFILL_STORAGE_KEY,
      JSON.stringify(prefill),
    );
    setShowWizard(true);
  }, []);

  const handleDeleteQuote = useCallback(
    async (muc: HistoryItem) => {
      datXacNhanXoaBaoGia(null);
      if (muc.quotationId && accessToken) {
        try {
          const pinToken = await promptPin(
            "Xóa báo giá",
            "Nhập mã PIN để xóa báo giá này.",
          );
          const ketQua = await xoaBaoGiaService(
            muc.quotationId,
            accessToken,
            pinToken,
          );
          if (!ketQua.success) {
            alert("Không thể xóa báo giá trên máy chủ.");
            return;
          }
        } catch (e) {
          if (laHuyPin(e)) return;
          alert(e instanceof Error ? e.message : "Lỗi khi xóa báo giá.");
          return;
        }
      }
      xoaLichSu(muc.id);
    },
    [accessToken, xoaLichSu, promptPin],
  );

  const capNhatTrangThaiDon = useCallback(
    async (muc: HistoryItem, status: QuoteStatus) => {
      if (status !== "pending_approval") {
        capNhatTrangThaiLocal(muc.id, status);
        return;
      }
      if (!isAuthenticated || !accessToken) {
        throw new Error("Chưa đăng nhập, không thể gửi báo giá lên máy chủ.");
      }
      if (!muc.quotationId) {
        throw new Error(
          "Báo giá này chưa có mã server. Vui lòng tạo/lưu lại báo giá trên máy chủ trước khi gửi duyệt.",
        );
      }
      try {
        const pinToken = await promptPin(
          "Gửi duyệt báo giá",
          "Nhập mã PIN để gửi báo giá chờ duyệt.",
        );
        await nopBaoGiaService(muc.quotationId, accessToken, pinToken);
      } catch (e) {
        if (laHuyPin(e)) return;
        throw e instanceof Error
          ? e
          : new Error("Không gửi được báo giá lên máy chủ.");
      }
      capNhatTrangThaiLocal(muc.id, "pending_approval");
    },
    [accessToken, capNhatTrangThaiLocal, isAuthenticated, promptPin],
  );

  if (showWizard) {
    const handleBackFromWizard = () => {
      if (wizardNguon === 'duyet') {
        khiDieuHuong?.("danh-sach-bao-gia");
      } else {
        setShowWizard(false);
      }
      datNguonWizard(null);
    };
    return (
      <TaoBaoGiaWizard
        onClose={handleBackFromWizard}
        onSavedNavigate={() => { datNguonWizard(null); khiDieuHuong?.("danh-sach-bao-gia"); }}
      />
    );
  }

  return (
    <div className="crm-root quote-root">
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder={
              laLichSuBaoGiaTheoKhach
                ? "Nhập tên công ty/khách hàng, ví dụ: AAA..."
                : isAdmin
                  ? "Tìm theo nhân viên, khách hàng, sản phẩm..."
                  : "Tìm khách hàng, sản phẩm, chất liệu..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="crm-search-clear" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
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
            <input
              className="form-input"
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              style={{ width: 150 }}
              title="Từ ngày"
            />
            <input
              className="form-input"
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              style={{ width: 150 }}
              title="Đến ngày"
            />
          </div>
        ) : (
          isAdmin && (
            <div className="crm-toolbar-right">
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  padding: "0 8px",
                  whiteSpace: "nowrap",
                }}
              >
                👑 Xem theo Seller
              </span>
            </div>
          )
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
            onCopy={handleCopyQuote}
            onDelete={datXacNhanXoaBaoGia}
          />
        ) : (
          <SaleView
            mucs={myItems}
            search={search}
            chiTimKhachHang={laLichSuBaoGiaTheoKhach}
            onOpen={handleOpen}
            onStatusUpdate={capNhatTrangThaiDon}
            onCopy={handleCopyQuote}
            onDelete={datXacNhanXoaBaoGia}
          />
        )}
      </div>

      {selectedItem && (
        <QuoteDetailPanel
          item={selectedItem}
          isAdmin={isAdmin}
          onClose={() => setSelectedItem(null)}
          onLoadCalc={async (id) => {
            const target = selectedItem;
            if (!target) return;
            const ok = await dungCuaHangTinhGia.getState().moBangTinhVoiPin(id);
            if (!ok) return;
            dieuHuongMenuApp(menuKeyTinhGiaTheoItem(target));
          }}
          onPatch={(id, patch) => {
            patchHistoryItem(id, patch);
            setSelectedItem((prev) => (prev ? { ...prev, ...patch } : prev));
          }}
          onStatusUpdate={capNhatTrangThaiDon}
        />
      )}

      {xacNhanXoaBaoGia && (
        <div
          className="lts-confirm-backdrop"
          onClick={() => datXacNhanXoaBaoGia(null)}
        >
          <div
            className="lts-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lts-confirm-icon">🗑</div>
            <h3 className="lts-confirm-title">Xóa báo giá này?</h3>
            <p className="lts-confirm-desc">
              Thao tác này không thể hoàn tác.
              <br />
              Báo giá sẽ bị xóa vĩnh viễn.
            </p>
            <div className="lts-confirm-actions">
              <button
                className="btn btn-outline"
                onClick={() => datXacNhanXoaBaoGia(null)}
              >
                Hủy
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteQuote(xacNhanXoaBaoGia)}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <NhapPinDuyetModal
        open={pin.open}
        title={pin.title}
        message={pin.message}
        onConfirm={pin.confirm}
        onClose={pin.cancel}
      />
    </div>
  );
}
