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
  type KhachHangCoTen,
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

export interface ShouldShowInput {
  inputCustomer: string;
  customers: KhachHangCoTen[];
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
