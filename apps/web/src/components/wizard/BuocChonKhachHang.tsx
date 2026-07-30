"use client";
// src/components/wizard/BuocChonKhachHang.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Chọn khách hàng cho wizard tạo LSX.
// Doc KH tu localStorage['lts_customers'] (cung pattern voi ModuleBaoGia).
// Render danh sach co search + radio selected.
// Đồng bộ UI với wiz-customer-* classes từ WIZARD_STYLES (giống BG).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { Search, User, Building2, Check } from 'lucide-react';

const LS_CUSTOMERS = 'lts_customers';

interface Customer {
  id: string;
  customerCode?: string;
  companyName?: string;
  contactName?: string;
  taxCode?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export interface BuocChonKhachHangProps {
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
  /** true = khóa chọn KH (đang sửa LSX / tạo từ sheet). */
  chiDoc?: boolean;
}

function docKhachHang(): Customer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_CUSTOMERS);
    if (raw) return JSON.parse(raw) as Customer[];
  } catch {
    /* ignore */
  }
  return [];
}

function tenKhachHang(c: Customer): string {
  return c.companyName || c.contactName || c.customerCode || c.id || '—';
}

export function boDau(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function BuocChonKhachHang({ selected, onSelect, chiDoc }: BuocChonKhachHangProps) {
  const [tuKhoa, setTuKhoa] = useState('');
  const [danhSach] = useState<Customer[]>(() => docKhachHang());

  const ketQua = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    if (!q) return danhSach;
    return danhSach.filter((c) => {
      const haystack = [
        c.companyName,
        c.customerCode,
        c.contactName,
        c.taxCode,
        c.phone,
      ].map((v) => boDau(v ?? '')).join(' ');
      return haystack.includes(q);
    });
  }, [danhSach, tuKhoa]);

  if (chiDoc && selected) {
    return (
      <div className="wiz-customer-card wiz-customer-card--selected" style={{ cursor: 'default' }}>
        <div className="wiz-customer-icon">
          {selected.companyName ? <Building2 size={18} /> : <User size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wiz-customer-name">{tenKhachHang(selected)}</div>
          {(selected.customerCode || selected.taxCode || selected.phone) && (
            <div className="wiz-customer-meta">
              {selected.customerCode && <span>Mã: {selected.customerCode}</span>}
              {selected.taxCode && <span>MST: {selected.taxCode}</span>}
              {selected.phone && <span>SĐT: {selected.phone}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (danhSach.length === 0) {
    return (
      <div className="wiz-empty">
        <Building2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p>Chưa có khách hàng nào trong hệ thống.</p>
        <span style={{ fontSize: '0.78rem' }}>Vui lòng tạo khách hàng ở menu &ldquo;Khách hàng&rdquo; trước.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="wiz-search-box">
        <Search size={16} className="wiz-search-icon" />
        <input
          className="wiz-search-input"
          aria-label="Tìm khách hàng"
          placeholder="Tìm theo tên, mã KH, MST, SĐT..."
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
      </div>

      {ketQua.length === 0 ? (
        <div className="wiz-empty">
          <p>Không tìm thấy khách hàng phù hợp.</p>
          <span style={{ fontSize: '0.78rem' }}>Thử từ khóa khác.</span>
        </div>
      ) : (
        <div className="wiz-customer-list">
          {ketQua.map((c) => {
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`wiz-customer-card${isSelected ? ' wiz-customer-card--selected' : ''}`}
                onClick={() => onSelect(c)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c); } }}
              >
                <div className="wiz-customer-icon">
                  {c.companyName ? <Building2 size={18} /> : <User size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wiz-customer-name">{tenKhachHang(c)}</div>
                  {(c.customerCode || c.taxCode || c.phone) && (
                    <div className="wiz-customer-meta">
                      {c.customerCode && <span>Mã: {c.customerCode}</span>}
                      {c.taxCode && <span>MST: {c.taxCode}</span>}
                      {c.phone && <span>SĐT: {c.phone}</span>}
                    </div>
                  )}
                </div>
                {isSelected && <Check size={18} className="wiz-customer-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BuocChonKhachHang;
