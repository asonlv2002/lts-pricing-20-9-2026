'use client';
// apps/web/src/components/layout/KhachHangQuyenGuard.tsx
// ────────────────────────────────────────────────────────────────────────────
// Hook + modal guard: khi input.customer chua KH user khong co quyen quan ly
// → hien popup notice de user biet ngay (truoc khi nhap lieu tiep / truoc khi
// bi alert chan luc Luu). Dedup per-session theo customerCode.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import {
  chuanHoaTenKhach,
  laNguoiPhuTrach,
  tomTatNguoiPhuTrach,
  type CustomerManagerUi,
} from '../../lib/customer-api';
import {
  coQuyenCoVanBangTinh,
  coQuyenQuanLyKhachHang,
} from '../../lib/permissions';
import type { PolicyCode } from '../../lib/api/service-lts';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';

// ── Types & pure function ─────────────────────────────────────────────────

export interface KhachHangNoticeInfo {
  code: string;
  name: string;
  managerName: string;
}

// Shape thật của customer trong localStorage (CustomerUi) — cần customerCode
// (dedup key) + managers với fullName để hiển thị.
export interface KhachHangForGuard {
  companyName: string;
  customerCode: string;
  managers?: CustomerManagerUi[];
  sellerId?: string | null;
  secondarySellerId?: string | null;
}

export interface ShouldShowInput {
  inputCustomer: string;
  customers: KhachHangForGuard[];
  role: string;
  currentSellerId?: string | null;
  policies: PolicyCode[];
  acknowledged: Set<string>;
}

/**
 * Quyết định có nên hiện popup "KH ngoài quyền" hay không. Pure function —
 * tách riêng để unit test deterministic.
 *
 * Trả về `null` nếu không nên bật, hoặc `{ code, name, managerName }` nếu có.
 */
export function shouldShowKhachHangNotice(input: ShouldShowInput): KhachHangNoticeInfo | null {
  const tenKhach = input.inputCustomer.trim();
  if (!tenKhach) return null;

  if (input.role === 'admin') return null;

  if (coQuyenQuanLyKhachHang(input.policies)) return null;
  if (coQuyenCoVanBangTinh(input.policies)) return null;

  // Khong co currentSellerId (= chua dang nhap / guest) → khong canh bao
  if (!input.currentSellerId) return null;

  const chuan = chuanHoaTenKhach(tenKhach);
  const match = input.customers.find(
    kh => chuanHoaTenKhach(kh.companyName) === chuan,
  );
  if (!match) return null;

  if (laNguoiPhuTrach(match, input.currentSellerId)) return null;

  if (input.acknowledged.has(match.customerCode)) return null;

  const tomTat = tomTatNguoiPhuTrach(match.managers ?? []);
  return {
    code: match.customerCode,
    name: match.companyName,
    managerName: `${tomTat.primary}${tomTat.secondary ? ' · ' + tomTat.secondary : ''}`,
  };
}

// ── Local storage → danh sách KH (cho guard) ───────────────────────────────
const LS_CUSTOMERS = 'lts_customers';

function docKhachHangTuLocalStorage(): KhachHangForGuard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_CUSTOMERS);
    if (!raw) return [];
    return JSON.parse(raw) as KhachHangForGuard[];
  } catch {
    return [];
  }
}

// ── Hook: theo dõi input.customer + dedup + set notice ───────────────────

export function useKhachHangQuyenGuard() {
  const input = dungCuaHangTinhGia(s => s.input);
  const role = dungCuaHangTinhGia(s => s.role);
  const currentSellerId = dungCuaHangTinhGia(s => s.currentSellerId);
  const policies = dungCuaHangTinhGia(s => s.nguoiDungHienTai?.policies ?? []);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);

  const [danhSach, setDanhSach] = useState<KhachHangForGuard[]>([]);
  const acknowledgedRef = useRef<Set<string>>(new Set());
  const [notice, setNotice] = useState<KhachHangNoticeInfo | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setDanhSach([]);
      return;
    }
    setDanhSach(docKhachHangTuLocalStorage());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotice(null);
      return;
    }
    const next = shouldShowKhachHangNotice({
      inputCustomer: input.customer,
      customers: danhSach,
      role,
      currentSellerId,
      policies,
      acknowledged: acknowledgedRef.current,
    });
    setNotice(next);
  }, [
    input.customer,
    danhSach,
    role,
    currentSellerId,
    policies,
    isAuthenticated,
  ]);

  const dismiss = () => {
    if (notice) acknowledgedRef.current.add(notice.code);
    setNotice(null);
  };

  const chooseAnother = () => {
    if (notice) acknowledgedRef.current.add(notice.code);
    setNotice(null);
    if (typeof document !== 'undefined') {
      const el = document.querySelector<HTMLElement>('[data-customer-input="true"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        window.setTimeout(() => el.focus(), 60);
      }
    }
  };

  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  return { notice, dismiss, chooseAnother };
}

// ── Modal: render qua portal ──────────────────────────────────────────────

function KhachHangQuyenGuardModal({
  info,
  onDismiss,
  onChooseAnother,
}: {
  info: KhachHangNoticeInfo;
  onDismiss: () => void;
  onChooseAnother: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="lts-kh-popup-overlay"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className="lts-kh-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lts-kh-popup-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="lts-kh-popup-card">
          <div className="lts-kh-popup-header">
            <h2 id="lts-kh-popup-title" className="lts-kh-popup-title">
              <AlertTriangle size={18} aria-hidden />
              <span>Khách hàng ngoài quyền quản lý</span>
            </h2>
            <button
              type="button"
              className="lts-kh-popup-close"
              onClick={onDismiss}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="lts-kh-popup-body">
            <div className="lts-kh-popup-kh-card">
              <div className="lts-kh-popup-kh-name">{info.name}</div>
              <div className="lts-kh-popup-kh-meta">Mã: {info.code}</div>
            </div>

            <div className="lts-kh-popup-manager">
              Đang do <b>{info.managerName}</b> phụ trách.
            </div>

            <p>
              Bạn không có quyền lưu báo giá cho khách hàng này.
              Bạn có thể tiếp tục xem và tính toán, nhưng cần đổi sang
              khách hàng bạn quản lý trước khi bấm Lưu.
            </p>
          </div>

          <div className="lts-kh-popup-actions">
            <button
              type="button"
              className="lts-kh-popup-btn lts-kh-popup-btn--ghost"
              onClick={onDismiss}
            >
              Bỏ qua, tiếp tục xem
            </button>
            <button
              type="button"
              className="lts-kh-popup-btn lts-kh-popup-btn--primary"
              onClick={onChooseAnother}
            >
              Chọn KH khác
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Default export: gắn vào VoTrang ──────────────────────────────────────

export default function KhachHangQuyenGuard() {
  const { notice, dismiss, chooseAnother } = useKhachHangQuyenGuard();
  if (!notice) return null;
  return (
    <KhachHangQuyenGuardModal
      info={notice}
      onDismiss={dismiss}
      onChooseAnother={chooseAnother}
    />
  );
}
