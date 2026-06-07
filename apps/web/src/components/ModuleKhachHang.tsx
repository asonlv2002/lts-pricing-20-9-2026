"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, Briefcase, Building2, ChevronDown, ChevronRight,
  Copy, Download, Eye, FileText, Hash, Lock,
  Mail, MapPin, Package, Pencil, Phone, Plus, Save, Search,
  Shield, Unlock, User, Users, X, ClipboardList, RotateCcw, Check, Settings
} from 'lucide-react';
import seedCustomers from '../data/customers.json';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { AuditEntry } from '../lib/types';
import { getAuditChangedFields, getAuditSummary } from '../lib/customer-audit-format';
import { resolveAuditActorName } from '../lib/customer-audit-format';
import {
  chuyenCustomerApiSangUi,
  chuyenCustomerManagersApiSangUi,
  chuyenCustomerManagersSangPayload,
  chuyenCustomerUiSangThongTinApi,
  gopCustomerTheoSuKienRealtime,
  kiemTraMaKhachHang,
  kiemTraThongTinKhachHang,
  layLuaChonNguoiPhuTrach,
  sapXepPhienBanKhachHang,
  tomTatNguoiPhuTrach,
  type CustomerVersionApi,
  type CustomerManagerUi,
} from '../lib/customer-api';
import {
  layKhachHangService,
  layNguoiPhuTrachKhachHangService,
  ketNoiSuKienKhachHangService,
  luuNguoiPhuTrachKhachHangService,
  luuThongTinKhachHangService,
  taoMaKhachHangService,
} from '../lib/api/service-lts';
import { CustomerManagersPicker } from './customer/CustomerManagersPicker';

// ── Types ────────────────────────────────────────────────────────────────────
type CustomerStatus = 'active' | 'inactive';
// 5-state CRM status per spec
type CrmStatus = 'lead' | 'negotiating' | 'active' | 'paused' | 'inactive';
type CustomerType = 'company' | 'individual';
type Role = 'admin' | 'sale' | 'purchase' | string;

interface Customer {
  id: string;
  customerType?: CustomerType;
  customerCode: string;
  companyName: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  invoiceAddress?: string;  // Địa chỉ xuất hóa đơn
  address?: string;         // Địa chỉ giao hàng
  region?: string;
  customerGroup?: string;
  sellerId?: string | null;
  sellerName?: string;
  secondarySellerId?: string | null;
  secondarySellerName?: string;
  managers?: CustomerManagerUi[];
  versions?: CustomerVersionApi[];
  contactTitle?: string;
  contactNotes?: string;
  assignmentHistory?: string[];
  assignmentNote?: string;
  status: CustomerStatus;
  crmStatus?: CrmStatus;    // 5-state CRM status
  isLocked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFilters {
  keyword: string;
  sellerId: string;
  customerGroup: string;
  status: 'all' | CustomerStatus | 'locked' | 'unassigned';
  createdFrom: string;
  createdTo: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const LS_CUSTOMERS = 'lts_customers';
const LS_CUSTOMER_DRAFT = 'lts_customer_draft';
const LS_CRM_THRESHOLDS = 'lts_crm_thresholds';

interface CrmThresholds {
  pausedMonths: number;   // Tạm ngưng: không hoạt động >= N tháng (mặc định 6)
  inactiveMonths: number; // Ngừng hợp tác: không hoạt động >= N tháng (mặc định 12)
}

const DEFAULT_CRM_THRESHOLDS: CrmThresholds = { pausedMonths: 6, inactiveMonths: 12 };

function loadCrmThresholds(): CrmThresholds {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_CRM_THRESHOLDS) : null;
    if (raw) return { ...DEFAULT_CRM_THRESHOLDS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CRM_THRESHOLDS;
}
function saveCrmThresholds(t: CrmThresholds) {
  try { window.localStorage.setItem(LS_CRM_THRESHOLDS, JSON.stringify(t)); } catch { /* ignore */ }
}
const SELLERS = [
  { id: 'S1', name: 'Nguyễn Văn An' },
  { id: 'S2', name: 'Trần Gia Bảo' },
  { id: 'S3', name: 'Lê Thu Hà' },
];
const emptyFilters: CustomerFilters = { keyword: '', sellerId: '', customerGroup: '', status: 'all', createdFrom: '', createdTo: '' };
const blankCustomer: Customer = { id: '', customerType: 'company', customerCode: '', companyName: '', taxCode: '', contactName: '', phone: '', email: '', invoiceAddress: '', address: '', region: '', customerGroup: '', sellerId: null, sellerName: '', secondarySellerId: null, secondarySellerName: '', managers: [], status: 'active', crmStatus: 'lead', isLocked: false, notes: '', contactTitle: '', contactNotes: '', assignmentHistory: [], assignmentNote: '', createdAt: '', updatedAt: '' };

// 5-state CRM status config per spec
const CRM_STATUS_CONFIG: Record<CrmStatus, { label: string; dot: string; bg: string; text: string }> = {
  lead:        { label: 'Mới (Lead)',          dot: '●', bg: '#eff6ff', text: '#1d4ed8' },
  negotiating: { label: 'Đang tương tác',      dot: '●', bg: '#fffbeb', text: '#b45309' },
  active:      { label: 'Đang hoạt động',      dot: '●', bg: '#f0fdf4', text: '#166534' },
  paused:      { label: 'Tạm ngưng',           dot: '●', bg: '#f3f4f6', text: '#4b5563' },
  inactive:    { label: 'Ngừng hợp tác',       dot: '●', bg: '#e5e7eb', text: '#6b7280' },
};

// 12 required fields for completeness tracking
const REQUIRED_FIELDS: { key: keyof Customer; label: string }[] = [
  { key: 'companyName',    label: 'Tên công ty / khách hàng' },
  { key: 'taxCode',        label: 'Mã số thuế' },
  { key: 'invoiceAddress', label: 'Địa chỉ xuất hóa đơn' },
  { key: 'contactName',    label: 'Người liên hệ' },
  { key: 'phone',          label: 'Số điện thoại' },
  { key: 'email',          label: 'Email' },
  { key: 'contactTitle',   label: 'Chức vụ người liên hệ' },
  { key: 'address',        label: 'Địa chỉ giao hàng' },
  { key: 'customerCode',   label: 'Mã khách hàng' },
  { key: 'sellerId',       label: 'Sale phụ trách' },
  { key: 'crmStatus',      label: 'Trạng thái CRM' },
  { key: 'notes',          label: 'Ghi chú' },
];

const FIELD_LABELS: Record<string, string> = {
  customerType: 'Loại khách hàng', customerCode: 'Mã khách hàng', companyName: 'Tên công ty', taxCode: 'Mã số thuế',
  contactName: 'Người liên hệ', phone: 'Số điện thoại', email: 'Email', address: 'Địa chỉ giao hàng',
  invoiceAddress: 'Địa chỉ xuất hóa đơn',
  customerGroup: 'Nhóm khách hàng', sellerId: 'Sale phụ trách', secondarySellerId: 'Sale phụ', notes: 'Ghi chú', contactTitle: 'Chức vụ', contactNotes: 'Ghi chú liên hệ', assignmentNote: 'Ghi chú phân công',
  crmStatus: 'Trạng thái CRM',
};

const CUSTOMER_AUDIT_KEYS: (keyof Customer)[] = [
  'companyName', 'taxCode', 'invoiceAddress', 'contactName', 'phone', 'email',
  'contactTitle', 'address', 'customerCode', 'sellerId', 'secondarySellerId',
  'crmStatus', 'status', 'isLocked', 'notes', 'assignmentNote', 'contactNotes',
];

function diffCustomer(oldC: Customer | undefined, newC: Customer) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of CUSTOMER_AUDIT_KEYS) {
    const oldVal = oldC?.[key];
    const newVal = newC[key];
    if (!oldC || oldVal !== newVal) {
      before[String(key)] = oldVal ?? '';
      after[String(key)] = newVal ?? '';
    }
  }
  return { before, after };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const getCustomerType = (c: Customer): CustomerType => c.customerType ?? 'company';
const isIndividual = (c: Customer) => getCustomerType(c) === 'individual';
const displayName = (c: Customer) => isIndividual(c) ? (c.contactName || c.companyName || 'Khách cá nhân') : (c.companyName || c.contactName || 'Khách doanh nghiệp');
const typeLabel = (c: Customer) => isIndividual(c) ? 'Cá nhân' : 'Doanh nghiệp';
const todayIso = () => new Date().toISOString();
const fmtDate = (v?: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '-';
const statusLabel = (c: Customer) => c.isLocked ? 'Đã khóa' : c.status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng';
const normalize = (v?: string | null) => (v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isAssignedSeller = (c: Customer, sellerId?: string) => !!sellerId && (c.sellerId === sellerId || c.secondarySellerId === sellerId);
const canEdit = (role: Role, c: Customer, sellerId?: string) => role === 'admin' || (role === 'sale' && isAssignedSeller(c, sellerId) && !c.isLocked);
const canViewContact = (role: Role, c: Customer, sellerId?: string) => role === 'admin' || role === 'purchase' || isAssignedSeller(c, sellerId);
const canLock = (role: Role) => role === 'admin';
const isCustomerManager = (c: Customer, userId?: string) => !!userId && (c.managers ?? []).some(manager => manager.userId === userId);
const canUpdateCustomerRecord = (c: Customer, userId?: string) => isCustomerManager(c, userId);
const managerSummary = (c: Customer) => {
  if (c.managers && c.managers.length > 0) return tomTatNguoiPhuTrach(c.managers);
  if (c.sellerName || c.sellerId) return { primary: c.sellerName || c.sellerId || 'Chưa phân công', secondary: '' };
  return tomTatNguoiPhuTrach([]);
};
const managerNamesForTable = (c: Customer) => {
  const managerNames = (c.managers ?? [])
    .map(manager => manager.fullName || manager.account || manager.userId)
    .filter(Boolean);
  if (managerNames.length > 0) return managerNames;
  if (c.sellerName || c.sellerId) return [c.sellerName || c.sellerId || ''];
  return ['Chưa phân công'];
};

// Completeness: count filled required fields
function getCompleteness(c: Customer): { filled: number; total: number; missing: string[] } {
  const missing: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    const v = c[f.key];
    const empty = v === null || v === undefined || String(v).trim() === '';
    if (empty) missing.push(f.label);
  }
  return { filled: REQUIRED_FIELDS.length - missing.length, total: REQUIRED_FIELDS.length, missing };
}

// Derive CRM status from history data (auto-progression logic)
function getCrmStatus(
  c: Customer,
  relatedQuotes: { quoteStatus?: string; chotGia?: number; date?: string }[] = [],
  thresholds?: CrmThresholds,
): CrmStatus {
  const t = thresholds ?? loadCrmThresholds();
  // Active: đã chốt ít nhất 1 đơn
  if (relatedQuotes.some(h => h.quoteStatus === 'completed' || !!h.chotGia)) {
    // Kiểm tra thời gian không hoạt động (tính từ ngày giao dịch gần nhất)
    const lastDate = relatedQuotes
      .map(h => h.date ? new Date(h.date.split('/').reverse().join('-')).getTime() : 0)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    if (lastDate) {
      const monthsInactive = (Date.now() - lastDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsInactive >= t.inactiveMonths) return 'inactive';
      if (monthsInactive >= t.pausedMonths) return 'paused';
    }
    return 'active';
  }
  // Negotiating: đã gửi báo giá
  if (relatedQuotes.some(h => h.quoteStatus === 'sent' || h.quoteStatus === 'approved' || h.quoteStatus === 'pending_approval')) return 'negotiating';
  // Paused / Inactive dựa trên ngày tạo KH nếu chưa có giao dịch
  const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : 0;
  if (createdMs) {
    const monthsSinceCreated = (Date.now() - createdMs) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceCreated >= t.inactiveMonths) return 'inactive';
    if (monthsSinceCreated >= t.pausedMonths) return 'paused';
  }
  return c.crmStatus ?? 'lead';
}

// Avatar color palette
const AVATAR_COLORS = ['#0891b2','#7c3aed','#db2777','#ea580c','#059669','#4f46e5','#0d9488','#b91c1c','#7c2d12','#1d4ed8'];
const getAvatarColor = (id: string) => AVATAR_COLORS[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
const getInitials = (c: Customer) => {
  const name = displayName(c);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

function loadLocalCustomers(): Customer[] {
  if (typeof window === 'undefined') return seedCustomers as Customer[];
  try {
    const raw = window.localStorage.getItem(LS_CUSTOMERS);
    return raw ? JSON.parse(raw) : seedCustomers as Customer[];
  } catch { return seedCustomers as Customer[]; }
}
function saveLocalCustomers(customers: Customer[]) {
  try { window.localStorage.setItem(LS_CUSTOMERS, JSON.stringify(customers)); } catch { /* local only */ }
}
function exportCsv(rows: Customer[]) {
  const headers = ['Loai KH','Ma KH','Ten khach hang','MST','Nguoi lien he','SDT','Email','Dia chi','Nhom','Nhan vien','Trang thai','Khoa','Ngay tao','Ghi chu'];
  const body = rows.map(c => [typeLabel(c),c.customerCode,displayName(c),c.taxCode,c.contactName,c.phone,c.email,c.address,c.customerGroup,c.sellerName,statusLabel(c),c.isLocked ? 'Co' : 'Khong',fmtDate(c.createdAt),c.notes]);
  const csv = [headers, ...body].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `danh-sach-khach-hang-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Wizard Steps ─────────────────────────────────────────────────────────────
const WIZ_STEPS = [
  { label: 'Thông tin', icon: <Building2 size={14}/> },
  { label: 'Liên hệ', icon: <User size={14}/> },
  { label: 'Phân công', icon: <Briefcase size={14}/> },
];

function makeInitialCustomer(customer: Customer | undefined, role: Role, currentSellerId?: string): Customer {
  if (customer) return { customerType: 'company', ...customer };
  const now = Date.now();
  return {
    ...blankCustomer,
    customerType: 'company',
    id: `C${now}`,
    customerCode: `KH${String(now).slice(-5)}`,
    sellerId: role === 'sale' ? currentSellerId : null,
    status: 'active',
    isLocked: false,
    createdAt: todayIso(),
    updatedAt: todayIso(),
  };
}

interface CustomerFieldProps {
  k: keyof Customer;
  icon: React.ReactNode;
  form: Customer;
  errors: Record<string, string>;
  role: Role;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  helper?: string;
  onSet: (key: keyof Customer, value: string | boolean | null) => void;
}

function CustomerField({ k, icon, form, errors, role, disabled, required, type = 'text', helper, onSet }: CustomerFieldProps) {
  const err = errors[String(k)];
  const isSelect = k === 'sellerId' || k === 'secondarySellerId' || k === 'status' || k === 'crmStatus';

  return (
    <div className="crm2-field">
      <label htmlFor={`wiz-${String(k)}`} className="crm2-field-label">
        {icon}<span>{FIELD_LABELS[String(k)] ?? String(k)}</span> {required && <span className="crm2-req">*</span>}
      </label>
      {isSelect ? (
        <select id={`wiz-${String(k)}`} className={`crm2-input${err ? ' crm2-input--error' : ''}`} value={String(form[k] ?? '')} onChange={e => onSet(k, e.target.value || null)} disabled={(k === 'status' && role !== 'admin') || disabled}>
          {(k === 'sellerId' || k === 'secondarySellerId') && <option value="">{k === 'sellerId' ? 'Chưa phân công' : 'Không có sale phụ'}</option>}
          {(k === 'sellerId' || k === 'secondarySellerId') && SELLERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          {k === 'status' && <><option value="active">Đang sử dụng</option><option value="inactive">Ngừng sử dụng</option></>}
          {k === 'crmStatus' && (Object.entries(CRM_STATUS_CONFIG) as [CrmStatus, typeof CRM_STATUS_CONFIG[CrmStatus]][]).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
        </select>
      ) : (k === 'notes' || k === 'assignmentNote') ? (
        <textarea id={`wiz-${String(k)}`} className={`crm2-input crm2-textarea${err ? ' crm2-input--error' : ''}`} rows={3} value={String(form[k] ?? '')} onChange={e => onSet(k, e.target.value)} placeholder={k === 'assignmentNote' ? 'VD: Lý do phân công, chuyển phụ trách hoặc thu hồi...' : 'VD: Điều khoản, thói quen đặt hàng, công nợ...'} disabled={disabled} />
      ) : (
        <input id={`wiz-${String(k)}`} type={type} className={`crm2-input${err ? ' crm2-input--error' : ''}`} value={String(form[k] ?? '')} onChange={e => onSet(k, e.target.value)} disabled={disabled} aria-invalid={!!err} />
      )}
      {err ? (
        <span className="crm2-field-error" role="alert"><AlertCircle size={11}/>{err}</span>
      ) : helper ? (
        <span className="crm2-field-hint">{helper}</span>
      ) : null}
    </div>
  );
}

// ── CustomerForm (Wizard) ────────────────────────────────────────────────────
function CustomerForm({ customer, role, currentSellerId, customers = [], token, canManageManagers = false, saving = false, onSave, onCancel }: { customer?: Customer; role: Role; currentSellerId?: string; customers?: Customer[]; token?: string; canManageManagers?: boolean; saving?: boolean; onSave: (c: Customer) => void; onCancel: () => void }) {
  const isNew = !customer;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Customer>(makeInitialCustomer(customer, role, currentSellerId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const seller = SELLERS.find(s => s.id === form.sellerId);
  const isLockedEdit = !isNew && !!customer?.isLocked;
  const [dirty, setDirty] = useState(false);

  const set = (key: keyof Customer, value: string | boolean | null) => {
    setForm(f => {
      setDirty(true);
      if (key === 'customerType') {
        const nextType = value as CustomerType;
        return { ...f, customerType: nextType, companyName: nextType === 'individual' ? (f.companyName || f.contactName || '') : f.companyName, contactName: nextType === 'company' ? f.contactName : (f.contactName || f.companyName || '') };
      }
      return { ...f, [key]: value };
    });
    setErrors(e => ({ ...e, [String(key)]: '' }));
  };

  const stepFields: Record<number, (keyof Customer)[]> = {
    0: ['customerCode', 'companyName', 'taxCode', 'customerGroup', 'address', 'invoiceAddress'],
    1: ['contactName', 'contactTitle', 'phone', 'email', 'contactNotes'],
    2: ['crmStatus', 'assignmentNote', 'notes'],
  };

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    for (const f of (stepFields[s] ?? [])) {
      const v = form[f] as string | null | undefined;
      if (f === 'customerCode') {
        const check = kiemTraMaKhachHang(String(v ?? ''));
        if (!check.hopLe) e.customerCode = check.loi ?? 'Nhập mã khách hàng.';
      }
      if (s === 0 && isIndividual(form) && !form.contactName?.trim()) e.contactName = 'Nhập họ tên khách hàng.';
      if (f === 'companyName' && !isIndividual(form) && !String(v ?? '').trim()) e.companyName = 'Nhập tên công ty.';
      if (f === 'contactName' && !isIndividual(form) && !String(v ?? '').trim()) e.contactName = 'Nhập người liên hệ.';
      if (f === 'phone' && !String(v ?? '').trim()) e.phone = 'Nhập số điện thoại.';
      if (f === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e.email = 'Email chưa đúng định dạng.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateAll = () => {
    const e: Record<string, string> = {};
    const checkCode = kiemTraMaKhachHang(form.customerCode);
    if (!checkCode.hopLe) e.customerCode = checkCode.loi ?? 'Nhập mã khách hàng.';
    Object.assign(e, kiemTraThongTinKhachHang(form).errors);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDuplicates = () => {
    const norm = (v?: string | null) => normalize(v).trim();
    const warnings: string[] = [];
    customers.filter(c => c.id !== form.id).forEach(c => {
      if (norm(form.companyName) && norm(c.companyName) === norm(form.companyName)) warnings.push(`Trùng tên: ${displayName(c)} (${c.customerCode})`);
      if (norm(form.taxCode) && norm(c.taxCode) === norm(form.taxCode)) warnings.push(`Trùng MST: ${c.taxCode} (${displayName(c)})`);
      if (norm(form.phone) && norm(c.phone) === norm(form.phone)) warnings.push(`Trùng SĐT: ${c.phone} (${displayName(c)})`);
      if (norm(form.email) && norm(c.email) === norm(form.email)) warnings.push(`Trùng email: ${c.email} (${displayName(c)})`);
    });
    setDuplicateWarnings(Array.from(new Set(warnings)).slice(0, 4));
  };

  useEffect(() => { checkDuplicates(); }, [form.companyName, form.taxCode, form.phone, form.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = () => {
    try { window.localStorage.setItem(LS_CUSTOMER_DRAFT, JSON.stringify(form)); alert('Đã lưu nháp khách hàng.'); } catch { alert('Không lưu được nháp.'); }
  };
  const loadDraft = () => {
    try {
      const raw = window.localStorage.getItem(LS_CUSTOMER_DRAFT);
      if (raw) setForm({ ...blankCustomer, ...JSON.parse(raw), updatedAt: todayIso() });
    } catch { /* ignore */ }
  };

  const next = () => { if (validateStep(step)) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);
  const submit = () => {
    if (!validateAll()) { setStep(0); return; }
    onSave({ ...form, customerCode: kiemTraMaKhachHang(form.customerCode).maKhachHang, sellerName: seller?.name ?? form.sellerName ?? '', updatedAt: todayIso() });
  };

  const close = () => {
    if (dirty && !confirm('Bạn có thay đổi chưa lưu. Đóng mà không lưu?')) return;
    onCancel();
  };

  const progress = ((step + 1) / WIZ_STEPS.length) * 100;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty]);

  const renderField = (props: { k: keyof Customer; icon: React.ReactNode; required?: boolean; type?: string; helper?: string }) => (
    <CustomerField {...props} form={form} errors={errors} role={role} disabled={(!isNew && props.k === 'customerCode') || (isLockedEdit && props.k !== 'notes' && props.k !== 'assignmentNote')} onSet={set} />
  );

  return (
    <div className="crm2-wizard-wrap">
      <div className="crm2-wizard-header">
        <div>
          <div className="crm2-wizard-kicker">Chỉnh sửa khách hàng</div>
          <h2 className="crm2-wizard-title">{isNew ? 'Thêm khách hàng mới' : 'Cập nhật thông tin khách hàng'}</h2>
        </div>
        <button type="button" className="crm2-btn-icon crm2-wizard-close" aria-label="Đóng" onClick={close}>
          <X size={18} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="crm2-wizard-progress">
        <div className="crm2-wizard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Step labels */}
      <div className="crm2-wizard-steps">
        {WIZ_STEPS.map((s, i) => (
          <button key={i} className={`crm2-wizard-step${i < step ? ' crm2-wizard-step--done' : i === step ? ' crm2-wizard-step--active' : ''}`} onClick={() => { if (i < step) setStep(i); }}>
            <span className="crm2-wizard-step-num">{i < step ? '✓' : i + 1}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="crm2-wizard-summary">
        <span><Hash size={11}/>{form.customerCode || '—'}</span>
        <span>{isIndividual(form) ? <User size={11}/> : <Building2 size={11}/>} {displayName(form) || '—'}</span>
        <span className={`crm2-status-badge crm2-status-badge--${form.isLocked ? 'locked' : form.status}`}>{statusLabel(form)}</span>
      </div>

      {/* Locked banner */}
      {isLockedEdit && (
        <div className="crm2-alert crm2-alert--warning"><Lock size={14}/> Khách hàng đang bị khóa. Chỉ admin mở khóa mới sửa được dữ liệu quan trọng.</div>
      )}

      {/* Step 0: Công ty */}
      {step === 0 && (
        <div className="crm2-wizard-card" key="step-0">
          <div className="crm2-wizard-card-header">
            <div className="crm2-wizard-card-icon">{isIndividual(form) ? <User size={20}/> : <Building2 size={20}/>}</div>
            <div>
              <h3>{isIndividual(form) ? 'Thông tin cá nhân' : 'Thông tin doanh nghiệp'}</h3>
              <p>{isIndividual(form) ? 'Họ tên và nhóm khách hàng' : 'Mã số, tên và thông tin giao dịch'}</p>
            </div>
            <div className="crm2-type-toggle" role="tablist" aria-label="Loại khách hàng">
              <button type="button" className={form.customerType !== 'individual' ? 'crm2-type-toggle-btn crm2-type-toggle-btn--active' : 'crm2-type-toggle-btn'} onClick={() => set('customerType', 'company')}><Building2 size={13}/>DN</button>
              <button type="button" className={form.customerType === 'individual' ? 'crm2-type-toggle-btn crm2-type-toggle-btn--active' : 'crm2-type-toggle-btn'} onClick={() => set('customerType', 'individual')}><User size={13}/>CN</button>
            </div>
          </div>
          <div className="crm2-wizard-grid">
            {renderField({ k: 'customerCode', icon: <Hash size={12}/>, required: true, helper: isNew ? 'VD: KH001, KH2026-001' : 'Mã khách hàng không thay đổi sau khi đã tạo hồ sơ' })}
            {isIndividual(form)
              ? renderField({ k: 'contactName', icon: <User size={12}/>, required: true, helper: 'Họ tên khách hàng cá nhân' })
              : renderField({ k: 'companyName', icon: <Building2 size={12}/>, required: true, helper: 'Tên pháp lý hoặc tên giao dịch' })}
            {!isIndividual(form) && renderField({ k: 'taxCode', icon: <Hash size={12}/>, helper: 'Mã số thuế (dùng khi xuất hóa đơn)' })}
            {renderField({ k: 'customerGroup', icon: <Users size={12}/>, helper: 'VD: Key account, FMCG, Khách lẻ' })}
            {renderField({ k: 'address', icon: <MapPin size={12}/>, helper: 'Địa chỉ giao dịch/giao hàng' })}
            {renderField({ k: 'invoiceAddress', icon: <FileText size={12}/>, helper: 'Địa chỉ xuất hóa đơn (nếu khác địa chỉ giao hàng)' })}
          </div>
        </div>
      )}

      {/* Step 1: Liên hệ */}
      {step === 1 && (
        <div className="crm2-wizard-card" key="step-1">
          <div className="crm2-wizard-card-header">
            <div className="crm2-wizard-card-icon"><User size={20}/></div>
            <div>
              <h3>{isIndividual(form) ? 'Thông tin liên hệ' : 'Người liên hệ chính'}</h3>
              <p>{isIndividual(form) ? 'Số điện thoại và email của khách hàng' : 'Người nhận báo giá và trao đổi đơn hàng'}</p>
            </div>
          </div>
          <div className="crm2-wizard-grid">
            {!isIndividual(form) && renderField({ k: 'contactName', icon: <User size={12}/>, required: true, helper: 'Họ tên người liên hệ' })}
            {renderField({ k: 'phone', icon: <Phone size={12}/>, required: true, type: 'tel', helper: 'Số điện thoại liên hệ' })}
            {!isIndividual(form) && renderField({ k: 'contactTitle', icon: <Briefcase size={12}/>, helper: 'VD: Trưởng phòng mua hàng' })}
            {renderField({ k: 'email', icon: <Mail size={12}/>, required: true, type: 'email', helper: 'Email nhận thông tin và báo giá' })}
            {renderField({ k: 'contactNotes', icon: <FileText size={12}/>, helper: 'Ghi chú riêng cho liên hệ' })}
          </div>
        </div>
      )}

      {/* Step 2: Phân công */}
      {step === 2 && (
        <div className="crm2-wizard-card" key="step-2">
          <div className="crm2-wizard-card-header">
            <div className="crm2-wizard-card-icon"><Users size={20}/></div>
            <div>
              <h3>Phân công người phụ trách</h3>
              <p>Chọn nhiều tài khoản active làm người phụ trách khách hàng</p>
            </div>
          </div>
          <CustomerManagersPicker
            token={token}
            value={form.managers ?? []}
            disabled={!canManageManagers}
            onChange={managers => {
              setDirty(true);
              setForm(f => ({ ...f, managers }));
              setErrors(e => ({ ...e, managers: '' }));
            }}
          />
          {errors.managers && <span className="crm2-field-error" role="alert"><AlertCircle size={11}/>{errors.managers}</span>}
          <div className="crm2-wizard-grid">
            {renderField({ k: 'crmStatus', icon: <Shield size={12}/>, helper: 'Trạng thái quan hệ khách hàng' })}
            {renderField({ k: 'assignmentNote', icon: <FileText size={12}/>, helper: 'Lý do phân công/chuyển phụ trách/thu hồi' })}
            {renderField({ k: 'notes', icon: <FileText size={12}/>, helper: 'Điều khoản, thói quen đặt hàng, công nợ...' })}
          </div>
        </div>
      )}

      {duplicateWarnings.length > 0 && (
        <div className="crm2-alert crm2-alert--orange">
          <AlertCircle size={14}/> Cảnh báo trùng: {duplicateWarnings.join(' · ')}
        </div>
      )}

      {/* Floating action bar */}
      <div className="crm2-wizard-actions">
        <div className="crm2-wizard-actions-left">
          {step > 0 && <button className="crm2-btn crm2-btn--ghost" onClick={back}><ArrowLeft size={14}/> Quay lại</button>}
          <button className="crm2-btn crm2-btn--ghost" onClick={saveDraft}>Lưu nháp</button>
          {!customer && <button className="crm2-btn crm2-btn--ghost" onClick={loadDraft}>Tải nháp</button>}
          <button className="crm2-btn crm2-btn--ghost" onClick={close}>Hủy</button>
        </div>
        <div>
          {step < 2 ? (
            <button className="crm2-btn crm2-btn--primary" onClick={next}>
              Tiếp tục <ChevronRight size={14}/>
            </button>
          ) : (
            <button className="crm2-btn crm2-btn--primary" onClick={submit} disabled={saving}>
              <Save size={14}/>{saving ? 'Đang lưu...' : isNew ? 'Tạo khách hàng' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slide-in Detail Panel ────────────────────────────────────────────────────
function CustomerDetailPanel({ customer, role, currentSellerId, canUpdateCustomer, onClose, onEdit, onNavigate }: {
  customer: Customer; role: Role; currentSellerId?: string;
  canUpdateCustomer: boolean;
  onClose: () => void; onEdit: () => void;
  onNavigate: (module: string, filter: string, quoteMode?: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'versions'>('info');
  const history = dungCuaHangTinhGia(s => s.history);
  const loadHistoryItem = dungCuaHangTinhGia(s => s.loadHistoryItem);
  const setActiveModule = dungCuaHangTinhGia(s => s.setActiveModule);
  const auditLog = dungCuaHangTinhGia(s => s.auditLog);
  const panelRef = useRef<HTMLDivElement>(null);

  const { filled, total, missing } = getCompleteness(customer);
  const related = history.filter(h => normalize(h.customer).includes(normalize(displayName(customer))) || normalize(h.input?.customer).includes(normalize(displayName(customer))));
  const crmStatus = getCrmStatus(customer, related);
  const crmCfg = CRM_STATUS_CONFIG[crmStatus];
  const pct = Math.round((filled / total) * 100);
  const duocXemLienHe = canViewContact(role, customer, currentSellerId);
  const giaTriAn = 'Ẩn do chưa được phân công';
  const summary = managerSummary(customer);
  const versions = sapXepPhienBanKhachHang(customer.versions ?? []);

  // Customer-specific audit entries
  const customerAudit = auditLog?.filter(e =>
    (e.targetName && normalize(e.targetName).includes(normalize(displayName(customer)))) ||
    (e.targetId && e.targetId === customer.id)
  ) ?? [];

  const infoFields: [string, string | undefined | null][] = [
    ['Loại khách hàng', typeLabel(customer)],
    ['Mã khách hàng', customer.customerCode],
    ['Mã số thuế', customer.taxCode],
    ['Địa chỉ xuất HĐ', customer.invoiceAddress],
    ['Địa chỉ giao hàng', customer.address],
    ['Người liên hệ', duocXemLienHe ? customer.contactName : giaTriAn],
    ['Chức vụ', customer.contactTitle],
    ['Số điện thoại', duocXemLienHe ? customer.phone : giaTriAn],
    ['Email', customer.email],
    ['Nhóm khách hàng', customer.customerGroup],
    ['Người phụ trách', summary.primary],
    ['Ghi chú liên hệ', customer.contactNotes],
    ['Ghi chú phân công', customer.assignmentNote],
    ['Ghi chú', customer.notes],
    ['Ngày tạo', fmtDate(customer.createdAt)],
    ['Cập nhật', fmtDate(customer.updatedAt)],
  ];

  return (
    <>
      <div className="crm2-overlay crm2-overlay--open" onClick={onClose} />
      <div className="crm2-slide-panel crm2-slide-panel--open" ref={panelRef} role="dialog" aria-modal="true" aria-label={`Chi tiết khách hàng ${displayName(customer)}`}>
        {/* Panel header */}
        <div className="crm2-panel-header">
          <div className="crm2-panel-avatar" style={{ background: getAvatarColor(customer.id) }}>
            {getInitials(customer)}
          </div>
          <div className="crm2-panel-title">
            <h3>{displayName(customer)}</h3>
            <div className="crm2-panel-meta">
              <span>{customer.customerCode}</span>
              <span className="crm2-dot">·</span>
              <span>{typeLabel(customer)}</span>
              <span className="crm2-dot">·</span>
              <span className="crm2-crm-badge" style={{ background: crmCfg.bg, color: crmCfg.text, fontSize: 11 }}>
                {crmCfg.dot} {crmCfg.label}
              </span>
            </div>
            <div className="crm2-panel-progress">
              <div className="crm2-card-progress-bar" style={{ flex: 1 }}>
                <div className="crm2-card-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444' }} role="progressbar" aria-valuenow={filled} aria-valuemax={total} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted,#6b7280)', whiteSpace: 'nowrap' }}>{filled}/{total}</span>
            </div>
            <span className="crm2-panel-seller"><Users size={11}/> {summary.primary}{summary.secondary ? ` · ${summary.secondary}` : ''}</span>
          </div>
          <button className="crm2-btn-icon crm2-btn-icon--close" aria-label="Đóng" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Action bar */}
        <div className="crm2-panel-actions">
          {canUpdateCustomer && (
            <button className="crm2-btn crm2-btn--ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={onEdit}>
              <Pencil size={13}/> Chỉnh sửa
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="crm2-panel-tabs">
          <button className={`crm2-panel-tab${activeTab === 'info' ? ' crm2-panel-tab--active' : ''}`} onClick={() => setActiveTab('info')}>
            <Users size={14}/> Thông tin
          </button>
          <button className={`crm2-panel-tab${activeTab === 'versions' ? ' crm2-panel-tab--active' : ''}`} onClick={() => setActiveTab('versions')}>
            <FileText size={14}/> Lịch sử phiên bản
          </button>
        </div>

        {/* Tab content */}
        <div className="crm2-panel-body">
          {activeTab === 'info' && (
            <div>
              {missing.length > 0 && (
                <div className="crm2-alert crm2-alert--orange" style={{ marginBottom: 16 }}>
                  <AlertCircle size={14}/> Thiếu {missing.length} trường: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` và ${missing.length - 3} trường khác` : ''}
                </div>
              )}
              <div className="crm2-info-grid">
                {(customer.managers?.length ?? 0) > 0 && (
                  <div className="crm2-info-item crm2-info-item--full">
                    <span className="crm2-info-label">Người phụ trách</span>
                    <div className="crm2-manager-list crm2-manager-list--compact">
                      {customer.managers!.map(manager => (
                        <div className="crm2-manager-row" key={manager.userId}>
                          <span className="crm2-manager-main"><b>{manager.fullName || manager.account || manager.userId}</b>{manager.account && <small>@{manager.account}</small>}</span>
                          <span className="crm2-manager-badge">Người phụ trách</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {infoFields.map(([label, value]) => (
                  <div className="crm2-info-item" key={label}>
                    <span className="crm2-info-label">{label}</span>
                    <span className="crm2-info-value">{value || <span style={{ opacity: 0.4 }}>—</span>}</span>
                  </div>
                ))}
                {(customer.assignmentHistory?.length ?? 0) > 0 && (
                  <div className="crm2-info-item crm2-info-item--full">
                    <span className="crm2-info-label">Lịch sử phân công</span>
                    <div className="crm2-info-history">
                      {customer.assignmentHistory!.map((entry, i) => (
                        <div key={i} className="crm2-info-history-item">{entry}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="crm2-version-history">
              {versions.length === 0 ? (
                <div className="crm2-manager-empty">
                  <FileText size={22}/>
                  <b>Chưa có lịch sử phiên bản</b>
                  <span>Khách hàng này mới được tạo mã, chưa lưu thông tin chi tiết.</span>
                </div>
              ) : versions.map(version => (
                <div className="crm2-version-card" key={version.version}>
                  <div className="crm2-version-card-head">
                    <b>v{version.version}</b>
                    <span>{fmtDate(version.createdAt)}</span>
                    <span className={`crm2-status-badge crm2-status-badge--${version.status === 'inactive' ? 'inactive' : 'active'}`}>{version.status === 'inactive' ? 'Ngừng sử dụng' : 'Đang sử dụng'}</span>
                  </div>
                  <div className="crm2-version-title">{version.organizationName}</div>
                  <div className="crm2-version-grid">
                    <span><User size={11}/> {version.contactName}</span>
                    <span><Phone size={11}/> {version.phoneNumber}</span>
                    <span><Mail size={11}/> {version.email}</span>
                    <span><MapPin size={11}/> {version.address}</span>
                  </div>
                  {version.taxCode && <div className="crm2-version-note">MST: {version.taxCode}</div>}
                  {version.changeNote && <div className="crm2-version-note">Ghi chú: {version.changeNote}</div>}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Assign Managers Dialog ──────────────────────────────────────────────────
function AssignSellerDialog({ customer, token, saving = false, onSave, onClose }: { customer: Customer; token?: string; saving?: boolean; onSave: (managers: CustomerManagerUi[], note: string) => void; onClose: () => void }) {
  const [managers, setManagers] = useState<CustomerManagerUi[]>(customer.managers ?? []);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="crm2-overlay crm2-overlay--open" onClick={onClose}>
      <div className="crm2-confirm-dialog" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <h3>Phân công người phụ trách — {displayName(customer)}</h3>
        <p style={{ marginBottom: 16 }}>{customer.customerCode} · Chọn nhiều tài khoản active làm người phụ trách.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CustomerManagersPicker token={token} value={managers} onChange={next => { setManagers(next); setError(''); }} />
          <div className="crm2-field">
            <label className="crm2-field-label"><FileText size={12}/><span>Ghi chú phân công</span></label>
            <textarea className="crm2-input crm2-textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Lý do phân công, chuyển phụ trách..." />
          </div>
          {error && <span className="crm2-field-error" role="alert"><AlertCircle size={11}/>{error}</span>}
        </div>
        <div className="crm2-confirm-actions" style={{ marginTop: 16 }}>
          <button className="crm2-btn crm2-btn--ghost" onClick={onClose}>Hủy</button>
          <button className="crm2-btn crm2-btn--primary" disabled={saving} onClick={() => {
            if (managers.length === 0) {
              setError('Cần ít nhất 1 người phụ trách trước khi lưu.');
              return;
            }
            onSave(managers, note);
          }}>
            <Save size={14}/>{saving ? 'Đang lưu...' : 'Lưu phân công'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Card ────────────────────────────────────────────────────────────
function CustomerCard({ customer, role, currentSellerId, canUpdateCustomer, relatedQuotes = [], onView, onEdit, onToggleLock, onAssign, txCardOpen, setTxCardOpen, onNavigate }: {
  customer: Customer; role: Role; currentSellerId?: string; relatedQuotes?: { quoteStatus?: string; chotGia?: number }[];
  canUpdateCustomer: boolean;
  onView: () => void; onEdit: () => void;
  onToggleLock: () => void; onAssign: () => void;
  txCardOpen: string | null; setTxCardOpen: (id: string | null) => void;
  onNavigate: (module: string, filter: string, quoteMode?: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { filled, total, missing } = getCompleteness(customer);
  const crmStatus = getCrmStatus(customer, relatedQuotes);
  const crmCfg = CRM_STATUS_CONFIG[crmStatus];
  const pct = Math.round((filled / total) * 100);
  const hasWarning = missing.length > 0;
  const duocXemLienHe = canViewContact(role, customer, currentSellerId);
  const summary = managerSummary(customer);

  return (
    <article
      className="crm2-card"
      aria-label={`Khách hàng ${displayName(customer)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onView}
    >
      <div className="crm2-card-top">
        <div className="crm2-card-avatar" style={{ background: getAvatarColor(customer.id) }}>
          {getInitials(customer)}
        </div>
        <div className="crm2-card-identity">
          <span className="crm2-card-name">
            {hasWarning && <span className="crm2-missing-dot" aria-label={`Thiếu ${missing.length} trường thông tin bắt buộc`} title={`Thiếu: ${missing.slice(0,3).join(', ')}${missing.length > 3 ? '...' : ''}`}>!</span>}
            {displayName(customer)}
          </span>
          <span className="crm2-card-code">{customer.customerCode}</span>
        </div>
        <span className="crm2-crm-badge" style={{ background: crmCfg.bg, color: crmCfg.text }}>
          {crmCfg.dot} {crmCfg.label}
        </span>
      </div>
      <div className="crm2-card-info">
        {customer.phone && <span className="crm2-card-info-row"><Phone size={12}/>{duocXemLienHe ? customer.phone : 'Ẩn SĐT'}</span>}
        {customer.email && <span className="crm2-card-info-row crm2-card-info-row--truncate"><Mail size={12}/>{customer.email}</span>}
        <span className="crm2-card-info-row"><Users size={12}/>{summary.primary}{summary.secondary ? ` · ${summary.secondary}` : ''}</span>
        {summary.primary === 'Chưa phân công' && role === 'admin' && <span className="crm2-card-info-row crm2-card-info-row--warn"><Briefcase size={12}/>Chưa phân công <button className="crm2-assign-inline" onClick={e => { e.stopPropagation(); onAssign(); }}>+</button></span>}
      </div>
      {/* Completeness bar */}
      <div className="crm2-card-progress">
        <div className="crm2-card-progress-bar">
          <div className="crm2-card-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444' }} role="progressbar" aria-valuenow={filled} aria-valuemax={total} aria-label={`Hoàn thiện ${filled}/${total} trường`} />
        </div>
        <span className="crm2-card-progress-label">{filled}/{total}</span>
      </div>
      {hasWarning && (
        <div className="crm2-card-missing">Thiếu: {missing.slice(0, 2).join(', ')}{missing.length > 2 ? ` +${missing.length - 2}` : ''}</div>
      )}
      {/* Quick actions on hover */}
      <div className={`crm2-card-actions${hovered ? ' crm2-card-actions--visible' : ''}`}>
        <button className="crm2-btn-icon" title="Xem chi tiết" onClick={e => { e.stopPropagation(); onView(); }}><Eye size={14}/></button>
        {canUpdateCustomer && <button className="crm2-btn-icon" title="Chỉnh sửa" onClick={e => { e.stopPropagation(); onEdit(); }}><Pencil size={14}/></button>}
        {role === 'admin' && <button className="crm2-btn-icon" title="Phân công nhân viên" onClick={e => { e.stopPropagation(); onAssign(); }}><Briefcase size={14}/></button>}
        {canLock(role) && <button className="crm2-btn-icon" title={customer.isLocked ? 'Mở khóa' : 'Khóa'} onClick={e => { e.stopPropagation(); onToggleLock(); }}>{customer.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}</button>}
        <div style={{ position: 'relative', display: 'inline-block' }} onMouseDown={e => e.stopPropagation()}>
          <button className="crm2-btn-icon" title="Hồ sơ giao dịch" onClick={e => { e.stopPropagation(); setTxCardOpen(txCardOpen === customer.id ? null : customer.id); }}>
            <ClipboardList size={14}/>
          </button>
          {txCardOpen === customer.id && (
            <div className="crm2-dropdown-menu" style={{ position: 'absolute', top: 0, right: 'calc(100% + 8px)', left: 'auto', minWidth: 200, zIndex: 20 }}>
              <button onClick={e => { e.stopPropagation(); onNavigate('history_db', displayName(customer), true); setTxCardOpen(null); }}>
                <FileText size={13}/> Bảng báo giá
              </button>
              <button onClick={e => { e.stopPropagation(); onNavigate('lsx_list', displayName(customer)); setTxCardOpen(null); }}>
                <Package size={13}/> Danh sách LSX
              </button>
              <button onClick={e => { e.stopPropagation(); onNavigate('history_db', displayName(customer)); setTxCardOpen(null); }}>
                <ClipboardList size={13}/> Sản phẩm liên quan
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Customer Audit Tab ───────────────────────────────────────────────────────
type AuditTimeRange = 'today' | '7days' | '30days' | 'month' | 'custom';

const CUSTOMER_AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'create', label: 'Tạo mới (Tạo hồ sơ)' },
  { value: 'update', label: 'Chỉnh sửa thông tin' },
  { value: 'status_change', label: 'Thay đổi trạng thái KH' },
];

const CUSTOMER_DATA_FIELDS: { value: string; label: string }[] = [
  { key: 'companyName', label: 'Tên khách hàng / Tên công ty' },
  { key: 'taxCode', label: 'Mã số thuế (MST)' },
  { key: 'invoiceAddress', label: 'Địa chỉ xuất hóa đơn' },
  { key: 'contactName', label: 'Người liên hệ trực tiếp' },
  { key: 'phone', label: 'Số điện thoại liên hệ' },
  { key: 'email', label: 'Email chính' },
  { key: 'contactTitle', label: 'Chức vụ người liên hệ' },
  { key: 'address', label: 'Địa chỉ giao hàng' },
  { key: 'customerCode', label: 'Mã khách hàng' },
  { key: 'sellerId', label: 'Nhân viên Sale phụ trách' },
  { key: 'crmStatus', label: 'Tag trạng thái' },
  { key: 'isLocked', label: 'Trạng thái khóa' },
  { key: 'notes', label: 'Ghi chú (Note)' },
].map(f => ({ value: f.key, label: f.label }));

function formatAuditValue(fieldKey: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (fieldKey === 'isLocked') return value ? 'Đã khóa' : 'Chưa khóa';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

function auditDuplicateKey(entry: AuditEntry) {
  return [
    entry.timestamp.slice(0, 16),
    entry.userId,
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.targetName ?? '',
    entry.note ?? '',
    JSON.stringify(entry.before ?? {}),
    JSON.stringify(entry.after ?? {}),
  ].join('|');
}

function dedupeAuditEntries(entries: AuditEntry[]) {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = auditDuplicateKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CustomerAuditTab({ auditLog, customers, users, currentUser }: { auditLog: AuditEntry[]; customers: Customer[]; users?: { id: string; name: string }[]; currentUser?: { id: string; fullName?: string | null; account?: string | null } | null }) {
  // 4 filters per spec
  const [filterAction, setFilterAction] = useState<Set<string>>(new Set());
  const [filterUser, setFilterUser] = useState('');
  const [filterField, setFilterField] = useState<Set<string>>(new Set());
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<AuditTimeRange>('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');

  const allUsers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of auditLog) {
      if (!seen.has(e.userId)) seen.set(e.userId, resolveAuditActorName(e, { currentUser, users }));
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [auditLog, currentUser, users]);

  const filtered = useMemo(() => {
    // Time range
    const now = new Date();
    const end = new Date(now); end.setHours(23,59,59,999);
    const start = new Date(now);
    if (timeRange === 'today') start.setHours(0,0,0,0);
    else if (timeRange === '7days') { start.setDate(start.getDate() - 6); start.setHours(0,0,0,0); }
    else if (timeRange === '30days') { start.setDate(start.getDate() - 29); start.setHours(0,0,0,0); }
    else if (timeRange === 'month') { start.setDate(1); start.setHours(0,0,0,0); }
    else if (timeRange === 'custom') {
      const s = customFrom ? new Date(customFrom) : new Date(0);
      const e2 = customTo ? new Date(customTo) : end;
      s.setHours(0,0,0,0); e2.setHours(23,59,59,999);
      return filterEntries(s, e2);
    }

    return filterEntries(start, end);
  }, [auditLog, filterAction, filterUser, filterField, timeRange, customFrom, customTo, search, currentUser, users]);

  function filterEntries(start: Date, end: Date) {
    let entries = dedupeAuditEntries(auditLog)
      .filter(e => {
        const t = new Date(e.timestamp);
        return t >= start && t <= end;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filterAction.size > 0) entries = entries.filter(e => filterAction.has(e.action));
    if (filterUser) entries = entries.filter(e => e.userId === filterUser);

    // Filter by data field changed (check before/after keys)
    if (filterField.size > 0) {
      entries = entries.filter(e => {
        if (!e.before && !e.after) return false;
        const changedKeys = new Set([...Object.keys(e.before || {}), ...Object.keys(e.after || {})]);
        for (const f of filterField) {
          if (changedKeys.has(f)) return true;
        }
        return false;
      });
    }

    if (search.trim()) {
      const q = normalize(search);
      entries = entries.filter(e =>
        normalize(e.action).includes(q) ||
        normalize(resolveAuditActorName(e, { currentUser, users })).includes(q) ||
        normalize(e.targetName ?? '').includes(q) ||
        normalize(e.note ?? '').includes(q)
      );
    }
    return entries;
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtered) {
      const day = e.timestamp.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const ACTION_LABELS: Record<string, string> = {
    create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa', lock: 'Khóa', unlock: 'Mở khóa',
    assign: 'Phân công', export: 'Xuất dữ liệu', view: 'Xem', approve: 'Duyệt', reject: 'Từ chối',
    status_change: 'Đổi trạng thái',
  };
  const ACTION_COLORS: Record<string, string> = {
    create: '#22c55e', update: '#0891b2', delete: '#ef4444', lock: '#f59e0b', unlock: '#10b981',
    assign: '#8b5cf6', export: '#6b7280', view: '#9ca3af', approve: '#22c55e', reject: '#ef4444',
    status_change: '#4f46e5',
  };

  const toggleAction = (a: string) => {
    setFilterAction(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  };

  const toggleField = (f: string) => {
    setFilterField(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const toggleExpandedAudit = (id: string) => {
    setExpandedAuditIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (timeRange !== '7days') activeChips.push({ label: { today: 'Hôm nay', '7days': '7 ngày', '30days': '30 ngày', month: 'Tháng này', custom: 'Tùy chỉnh' }[timeRange], clear: () => setTimeRange('7days') });
  if (filterUser) {
    const u = allUsers.find(u => u.id === filterUser);
    activeChips.push({ label: u?.name || filterUser, clear: () => setFilterUser('') });
  }
  filterAction.forEach(a => activeChips.push({ label: ACTION_LABELS[a] ?? a, clear: () => toggleAction(a) }));
  filterField.forEach(f => {
    const field = CUSTOMER_DATA_FIELDS.find(x => x.value === f);
    activeChips.push({ label: field?.label ?? f, clear: () => toggleField(f) });
  });

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Filter bar */}
      <div style={{ background: 'var(--card,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Time range */}
          <select className="crm2-input" value={timeRange} onChange={e => setTimeRange(e.target.value as AuditTimeRange)} style={{ width: 130, fontSize: 13 }}>
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chỉnh</option>
          </select>

          {/* Action filter */}
          <div style={{ position: 'relative' }}>
            <select className="crm2-input" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: 160, fontSize: 13 }}>
              <option value="">Người thực hiện</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="crm2-search-bar" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <Search size={15} className="crm2-search-icon" />
            <input className="crm2-search-input" placeholder="Tìm theo hành động, người dùng, ghi chú..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="crm2-btn-icon crm2-search-clear" onClick={() => setSearch('')}><X size={13}/></button>}
          </div>
        </div>

        {/* Custom date range */}
        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted,#6b7280)' }}>Từ:</span>
            <input type="date" className="crm2-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: 'var(--muted,#6b7280)' }}>Đến:</span>
            <input type="date" className="crm2-input" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 140, fontSize: 13 }} />
          </div>
        )}

        {/* Advanced: Action type + Data field */}
        <div style={{ marginTop: 12 }}>
          {/* Action type checkboxes */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted,#6b7280)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Hành động</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CUSTOMER_AUDIT_ACTIONS.map(a => (
                <label key={a.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: `1px solid ${filterAction.has(a.value) ? 'var(--accent,#0891b2)' : 'var(--border,#e5e7eb)'}`, background: filterAction.has(a.value) ? 'color-mix(in srgb, var(--accent,#0891b2) 8%, transparent)' : 'transparent' }}>
                  <input type="checkbox" checked={filterAction.has(a.value)} onChange={() => toggleAction(a.value)} />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          {/* Data field checkboxes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted,#6b7280)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Trường thay đổi</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {CUSTOMER_DATA_FIELDS.map(f => (
                <label key={f.value} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, cursor: 'pointer', padding: '3px 6px', borderRadius: 4, border: `1px solid ${filterField.has(f.value) ? 'var(--accent,#0891b2)' : 'var(--border,#e5e7eb)'}`, background: filterField.has(f.value) ? 'color-mix(in srgb, var(--accent,#0891b2) 8%, transparent)' : 'transparent' }}>
                  <input type="checkbox" checked={filterField.has(f.value)} onChange={() => toggleField(f.value)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted,#6b7280)' }}>Đang lọc:</span>
            {activeChips.map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb, var(--accent,#0891b2) 12%, transparent)', color: 'var(--accent,#0891b2)', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                {c.label}
                <button onClick={c.clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}><X size={10}/></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: 'var(--muted,#6b7280)', marginBottom: 12 }}>{filtered.length} bản ghi</div>

      {/* Read-only notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 11.5, color: '#0369a1' }}>
        <Lock size={13} />
        Nhật ký thao tác không thể chỉnh sửa hoặc xóa bởi bất kỳ ai, kể cả quản trị viên.
      </div>

      {grouped.length === 0 ? (
        <div className="crm2-empty-state crm2-empty-state--large">
          <ClipboardList size={48} strokeWidth={1} />
          <p>Chưa có nhật ký thao tác</p>
          <span>Các thao tác trên khách hàng sẽ được ghi lại tại đây</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted,#6b7280)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                {new Date(day).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                <span style={{ marginLeft: 8, fontWeight: 400 }}>({entries.length} thao tác)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {entries.map(e => {
                  const color = ACTION_COLORS[e.action] ?? '#9ca3af';
                  const summary = getAuditSummary(e, { currentUser, users });
                  const changedFields = getAuditChangedFields(e);
                  const isExpanded = expandedAuditIds.has(e.id);
                  return (
                    <div key={e.id} className="crm2-audit-card">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}18`, padding: '2px 7px', borderRadius: 10 }}>{summary.actionLabel}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground,#111)' }}>{summary.targetName}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted,#6b7280)', marginLeft: 'auto' }}>{new Date(e.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted,#6b7280)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span><User size={11} style={{ display: 'inline', verticalAlign: 'middle' }}/> {summary.actorName}</span>
                          {e.note && <span>· {e.note}</span>}
                        </div>
                        <div className="crm2-audit-summary-text">{summary.description}</div>
                        {summary.compactFields.length > 0 && (
                          <div className="crm2-audit-compact-fields">
                            {summary.compactFields.map(field => <span key={field}>{field}</span>)}
                          </div>
                        )}
                        {changedFields.length > 0 && (
                          <button type="button" className="crm2-audit-expand" onClick={() => toggleExpandedAudit(e.id)}>
                            {changedFields.length} thay đổi · {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                          </button>
                        )}
                        {isExpanded && changedFields.length > 0 && (
                          <div className="crm2-audit-detail">
                            <table className="crm2-audit-detail-table">
                              <thead><tr><th>Trường</th><th>Trước</th><th>Sau</th></tr></thead>
                              <tbody>
                                {changedFields.map(field => (
                                  <tr key={field.key}>
                                    <td>{field.label}</td>
                                    <td>{field.before}</td>
                                    <td>{field.after}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="crm2-audit-detail-list">
                              {changedFields.map(field => (
                                <div className="crm2-audit-detail-item" key={field.key}>
                                  <b>{field.label}</b>
                                  <span>Trước: {field.before}</span>
                                  <span>Sau: {field.after}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerAuditView({ customers }: { customers: Customer[] }) {
  const auditLog = dungCuaHangTinhGia(s => s.auditLog);
  const currentUser = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  return <CustomerAuditTab auditLog={auditLog?.filter(e => e.targetType === 'customer') ?? []} customers={customers} currentUser={currentUser} />;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ModuleKhachHang({ role, currentSellerId = 'S1', menuDangChon }: { role: Role; currentSellerId?: string; menuDangChon?: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFilters>(emptyFilters);
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; desc: string; action: () => void } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Customer | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const setActiveModule = dungCuaHangTinhGia(s => s.setActiveModule);
  const ghiNhatKy = dungCuaHangTinhGia(s => s.ghiNhatKy);
  const [crmThresholds, setCrmThresholds] = useState<CrmThresholds>(() => loadCrmThresholds());
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [txCardOpen, setTxCardOpen] = useState<string | null>(null);
  const [dangLuuKhachHang, setDangLuuKhachHang] = useState(false);
  const [dangLuuPhanCong, setDangLuuPhanCong] = useState(false);
  const accessToken = dungCuaHangTinhGia(s => s.accessToken);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);
  const nguoiDungHienTai = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const coQuyenTaoKhachHang = !!nguoiDungHienTai?.policies.includes('CUSTOMER_CREATE');

  const getAuditActor = () => ({
    userId: nguoiDungHienTai?.id ?? currentSellerId,
    userName: nguoiDungHienTai?.fullName || nguoiDungHienTai?.account || SELLERS.find(s => s.id === currentSellerId)?.name || currentSellerId,
  });
  // Close transaction dropdown on click outside
  useEffect(() => {
    if (!txCardOpen) return;
    const handler = () => setTxCardOpen(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [txCardOpen]);

  const handleNavigate = (module: string, filter: string, quoteMode?: boolean) => {
    setDetail(null);
    // Pass customer name as pre-fill filter to target module
    try { localStorage.setItem('lts_navigate_filter', JSON.stringify({ module: quoteMode ? 'quote' : module, customerName: filter, ts: Date.now() })); } catch {}
    setActiveModule(module as Parameters<typeof setActiveModule>[0]);
  };

  const updateCustomerLocal = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    setDetail(d => d?.id === customer.id ? customer : d);
    setEditing(e => e && e.id === customer.id ? customer : e);
    return customer;
  };

  const refreshCustomersFromServer = async (token: string) => {
    const data = await layKhachHangService(token);
    const customersUi = (Array.isArray(data) ? data : []).map(chuyenCustomerApiSangUi) as Customer[];
    const customersWithManagers = await Promise.all(customersUi.map(async customer => {
      try {
        return {
          ...customer,
          managers: chuyenCustomerManagersApiSangUi(await layNguoiPhuTrachKhachHangService(customer.customerCode, token)),
        };
      } catch (error) {
        console.warn(`Không tải được người phụ trách của ${customer.customerCode}:`, error);
        return customer;
      }
    }));
    setCustomers(customersWithManagers);
    setDetail(current => current ? customersWithManagers.find(customer => customer.id === current.id) ?? current : current);
    setEditing(current => current ? customersWithManagers.find(customer => customer.id === current.id) ?? current : current);
    setAssigning(current => current ? customersWithManagers.find(customer => customer.id === current.id) ?? current : current);
  };

  const mergeCustomerRealtime = (payload: Parameters<typeof gopCustomerTheoSuKienRealtime>[1]) => {
    const merge = (current: Customer | undefined) => gopCustomerTheoSuKienRealtime(current, payload) as Customer;
    setCustomers(prev => {
      const index = prev.findIndex(customer => customer.id === payload.codeName || customer.customerCode === payload.codeName);
      if (index < 0) return [merge(undefined), ...prev];
      return prev.map((customer, customerIndex) => customerIndex === index ? merge(customer) : customer);
    });
    setDetail(current => current && (current.id === payload.codeName || current.customerCode === payload.codeName) ? merge(current) : current);
    setEditing(current => current && (current.id === payload.codeName || current.customerCode === payload.codeName) ? merge(current) : current);
    setAssigning(current => current && (current.id === payload.codeName || current.customerCode === payload.codeName) ? merge(current) : current);
  };

  const ensureManagers = async (customer: Customer): Promise<Customer> => {
    if (customer.managers) return customer;
    if (!isAuthenticated || !accessToken) return customer;
    const managers = chuyenCustomerManagersApiSangUi(await layNguoiPhuTrachKhachHangService(customer.customerCode, accessToken));
    return updateCustomerLocal({ ...customer, managers });
  };

  const openDetail = async (customer: Customer) => {
    setDetail(customer);
    try { await ensureManagers(customer); } catch (error) { console.warn('Không tải được người phụ trách:', error); }
  };

  const openEdit = async (customer: Customer | null) => {
    if (!customer) {
      setEditing(null);
      return;
    }
    setEditing(customer);
    try { setEditing(await ensureManagers(customer)); } catch (error) { console.warn('Không tải được người phụ trách:', error); }
  };

  const openAssign = async (customer: Customer) => {
    setAssigning(customer);
    try { setAssigning(await ensureManagers(customer)); } catch (error) { console.warn('Không tải được người phụ trách:', error); }
  };

  useEffect(() => {
    let cancelled = false;
    setCustomers(loadLocalCustomers());
    if (!isAuthenticated || !accessToken) return;
    refreshCustomersFromServer(accessToken)
      .catch(error => {
        if (!cancelled) console.warn('Không tải được danh sách khách hàng:', error);
      });
    return () => { cancelled = true; };
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') return;

    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ketNoiSuKienKhachHangService(accessToken, message => {
        if (message.type === 'heartbeat') return;
        const event = message.data;
        if (!('resource' in event) || event.resource !== 'customer') return;

        const customer = event.payload?.customer;
        if (!customer?.codeName) {
          refreshCustomersFromServer(accessToken).catch(error => console.warn('Không đồng bộ được khách hàng từ sự kiện:', error));
          return;
        }

        mergeCustomerRealtime({
          codeName: customer.codeName,
          latestVersion: customer.latestVersion,
          managers: customer.managers,
        });
      }, controller.signal).catch(error => {
        if (controller.signal.aborted) return;
        console.warn('Mất kết nối sự kiện khách hàng:', error);
        retryTimer = setTimeout(connect, 3000);
      });
    };

    connect();

    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [accessToken, isAuthenticated]);
  useEffect(() => { if (customers.length) saveLocalCustomers(customers); }, [customers]);
  useEffect(() => {
    setEditing(undefined);
  }, [menuDangChon]);

  // Check for quick-add customer from pricing module
  useEffect(() => {
    try {
      const quickName = localStorage.getItem('lts_customer_quick_name');
      if (quickName) {
        localStorage.removeItem('lts_customer_quick_name');
        setEditing({ ...blankCustomer, id: `C${Date.now()}`, customerCode: `KH${String(Date.now()).slice(-5)}`, companyName: quickName, sellerId: role === 'sale' ? currentSellerId : null, sellerName: role === 'sale' ? SELLERS.find(s => s.id === currentSellerId)?.name ?? '' : '', status: 'active', crmStatus: 'lead', createdAt: todayIso(), updatedAt: todayIso() });
      }
    } catch {}
  }, []);

  // Ctrl+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const options = useMemo(() => ({
    managers: layLuaChonNguoiPhuTrach(customers),
    groups: Array.from(new Set(customers.map(c => c.customerGroup).filter(Boolean))) as string[],
  }), [customers]);

  const visible = useMemo(() => customers, [customers]);

  const filtered = useMemo(() => visible.filter(c => {
    const q = normalize(filters.keyword);
    const hay = normalize([displayName(c),c.companyName,c.customerCode,c.contactName,c.phone,c.email,c.taxCode,typeLabel(c),managerNamesForTable(c).join(' ')].join(' '));
    if (q && !hay.includes(q)) return false;
    if (filters.sellerId && !(c.managers ?? []).some(manager => manager.userId === filters.sellerId)) return false;
    if (filters.customerGroup && c.customerGroup !== filters.customerGroup) return false;
    if (filters.status === 'locked' && !c.isLocked) return false;
    if (filters.status === 'unassigned' && (c.managers?.length ?? 0) > 0) return false;
    if (filters.status !== 'all' && filters.status !== 'locked' && filters.status !== 'unassigned' && c.status !== filters.status) return false;
    const created = (c.createdAt || '').slice(0,10);
    if (filters.createdFrom && created && created < filters.createdFrom) return false;
    if (filters.createdTo && created && created > filters.createdTo) return false;
    return true;
  }).sort((a, b) => displayName(a).localeCompare(displayName(b), 'vi')), [visible, filters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lts_customer_focus');
      if (!raw || customers.length === 0) return;
      const focus = JSON.parse(raw);
      localStorage.removeItem('lts_customer_focus');
      const found = customers.find(c => c.id === focus.targetId || normalize(displayName(c)).includes(normalize(focus.targetName)));
      if (found) setDetail(found);
    } catch {}
  }, [customers]);

  const upsertLocal = (c: Customer) => {
    const seller = SELLERS.find(s => s.id === c.sellerId);
    const secondary = SELLERS.find(s => s.id === c.secondarySellerId);
    const old = customers.find(x => x.id === c.id);
    const changedSeller = old && (old.sellerId !== c.sellerId || old.secondarySellerId !== c.secondarySellerId);
    const historyLine = changedSeller ? `${new Date().toLocaleString('vi-VN')}: chính ${old?.sellerName || old?.sellerId || 'Chưa phân'} → ${seller?.name || c.sellerId || 'Chưa phân'}; phụ ${old?.secondarySellerName || old?.secondarySellerId || 'Không có'} → ${secondary?.name || c.secondarySellerId || 'Không có'}${c.assignmentNote ? ` (${c.assignmentNote})` : ''}` : undefined;
    const saved = { ...c, sellerName: seller?.name ?? c.sellerName ?? '', secondarySellerName: secondary?.name ?? c.secondarySellerName ?? '', assignmentHistory: historyLine ? [...(old?.assignmentHistory ?? []), historyLine] : (c.assignmentHistory ?? []) };
    const isNew = !old;
    const actor = getAuditActor();
    const diff = diffCustomer(old, saved);

    setCustomers(prev => isNew ? [saved, ...prev] : prev.map(x => x.id === c.id ? saved : x));
    ghiNhatKy({
      userId: actor.userId,
      userName: actor.userName,
      action: isNew ? 'create' : 'update',
      targetType: 'customer',
      targetId: c.id,
      targetName: c.companyName || c.contactName || c.customerCode,
      before: isNew ? undefined : diff.before,
      after: diff.after,
    });
  };

  const upsert = async (c: Customer) => {
    const old = customers.find(x => x.id === c.id);
    if (!isAuthenticated || !accessToken) {
      upsertLocal(c);
      return c;
    }

    const checkCode = kiemTraMaKhachHang(c.customerCode);
    if (!checkCode.hopLe) throw new Error(checkCode.loi ?? 'Mã khách hàng chưa hợp lệ.');

    const codeName = checkCode.maKhachHang;
    const managersPayload = chuyenCustomerManagersSangPayload(c.managers ?? []);

    if (!old) {
      try {
        await taoMaKhachHangService(codeName, accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không tạo được khách hàng.';
        if (!message.includes('đã tồn tại') && !message.includes('xung đột')) throw error;
        throw new Error('Mã khách hàng này đã được sử dụng. Vui lòng chọn mã khác.');
      }
    }

    try {
      const savedApi = await luuThongTinKhachHangService(codeName, chuyenCustomerUiSangThongTinApi(c), accessToken);
      const managers = managersPayload.length > 0
        ? chuyenCustomerManagersApiSangUi((await luuNguoiPhuTrachKhachHangService(codeName, managersPayload, accessToken)).managers)
        : c.managers;
      const saved = { ...c, ...chuyenCustomerApiSangUi(savedApi), managers, sellerId: c.sellerId, sellerName: c.sellerName, secondarySellerId: c.secondarySellerId, secondarySellerName: c.secondarySellerName, customerGroup: c.customerGroup, customerType: c.customerType, contactTitle: c.contactTitle, contactNotes: c.contactNotes, assignmentNote: c.assignmentNote, assignmentHistory: c.assignmentHistory, crmStatus: c.crmStatus } as Customer;
      upsertLocal(saved);
      return saved;
    } catch (error) {
      if (!old) {
        const createdShell = { ...c, id: codeName, customerCode: codeName, notes: c.notes || 'Đã tạo mã khách hàng, nhưng chưa lưu được thông tin chi tiết. Vui lòng kiểm tra lại thông tin và bấm lưu lại.' };
        upsertLocal(createdShell);
      }
      throw error;
    }
  };
  const patch = (id: string, partial: Partial<Customer>) => {
    const old = customers.find(c => c.id === id);
    if (!old) return;
    const saved = { ...old, ...partial, updatedAt: todayIso() };
    const actor = getAuditActor();
    const action = partial.isLocked !== undefined && partial.isLocked !== old.isLocked
      ? (partial.isLocked ? 'lock' : 'unlock')
      : partial.status !== undefined && partial.status !== old.status
        ? 'status_change'
        : 'update';
    const diff = diffCustomer(old, saved);

    setCustomers(prev => prev.map(c => c.id === id ? saved : c));
    ghiNhatKy({
      userId: actor.userId,
      userName: actor.userName,
      action,
      targetType: 'customer',
      targetId: id,
      targetName: old.companyName || old.contactName || old.customerCode,
      before: diff.before,
      after: diff.after,
    });
  };

  const assignSeller = async (customer: Customer, managers: CustomerManagerUi[], note: string) => {
    const payload = chuyenCustomerManagersSangPayload(managers);
    if (payload.length === 0) throw new Error('Cần ít nhất 1 người phụ trách trước khi lưu phân công.');

    let savedManagers = managers;
    if (isAuthenticated && accessToken) {
      const saved = await luuNguoiPhuTrachKhachHangService(customer.customerCode, payload, accessToken);
      savedManagers = chuyenCustomerManagersApiSangUi(saved.managers);
    }

    const historyLine = `${new Date().toLocaleString('vi-VN')}: phân công ${savedManagers.length} người phụ trách${note ? ` (${note})` : ''}`;
    const next = {
      ...customer,
      managers: savedManagers,
      assignmentNote: note || customer.assignmentNote,
      assignmentHistory: [...(customer.assignmentHistory ?? []), historyLine],
      updatedAt: todayIso(),
    };
    updateCustomerLocal(next);

    const actor = getAuditActor();
    ghiNhatKy({
      userId: actor.userId,
      userName: actor.userName,
      action: 'assign',
      targetType: 'customer',
      targetId: customer.id,
      targetName: customer.companyName || customer.contactName || customer.customerCode,
      before: { managers: customer.managers ?? [] },
      after: { managers: savedManagers },
      note: note || undefined,
    });
    setAssigning(null);
  };

  const activeCount = visible.filter(c => c.status === 'active' && !c.isLocked).length;
  const lockedCount = visible.filter(c => c.isLocked).length;
  const showingAuditLog = menuDangChon === 'customers.audit_log';

  const statusChips: { key: CustomerFilters['status']; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: visible.length },
    { key: 'active', label: 'Đang dùng', count: activeCount },
    { key: 'inactive', label: 'Ngừng', count: visible.filter(c => c.status === 'inactive').length },
    { key: 'locked', label: 'Đã khóa', count: lockedCount },
    { key: 'unassigned', label: 'Chưa phân', count: visible.filter(c => (c.managers?.length ?? 0) === 0).length },
  ];

  return (
    <div className="crm2-root">
      <StyleInjector />
      {/* Slide-in detail panel */}
      {detail && (
        <CustomerDetailPanel
          customer={detail}
          role={role}
          currentSellerId={currentSellerId}
          canUpdateCustomer={canUpdateCustomerRecord(detail, nguoiDungHienTai?.id)}
          onClose={() => { setDetail(null); setEditing(undefined); }}
          onEdit={() => openEdit(detail)}
          onNavigate={handleNavigate}
        />
      )}

      {/* Edit/Create panel — slide-in từ phải */}
      {editing !== undefined && (
        <>
          <div className="crm2-overlay crm2-overlay--open" onClick={() => setEditing(undefined)} />
          <div className="crm2-edit-panel crm2-edit-panel--open">
            <CustomerForm
              customer={editing ?? undefined}
              role={role}
              currentSellerId={currentSellerId}
              customers={customers}
              token={accessToken ?? undefined}
              canManageManagers={editing ? canUpdateCustomerRecord(editing, nguoiDungHienTai?.id) : true}
              saving={dangLuuKhachHang}
              onSave={async c => {
                setDangLuuKhachHang(true);
                try {
                  const saved = await upsert(c);
                  if (detail) setDetail(saved);
                  setEditing(undefined);
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Không lưu được thông tin khách hàng.');
                } finally {
                  setDangLuuKhachHang(false);
                }
              }}
              onCancel={() => setEditing(undefined)}
            />
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="crm2-overlay crm2-overlay--open" onClick={() => setConfirm(null)}>
          <div className="crm2-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>{confirm.title}</h3>
            <p>{confirm.desc}</p>
            <div className="crm2-confirm-actions">
              <button className="crm2-btn crm2-btn--ghost" onClick={() => setConfirm(null)}>Hủy</button>
              <button className="crm2-btn crm2-btn--danger" onClick={() => { confirm.action(); setConfirm(null); }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign seller dialog */}
      {assigning && (
        <AssignSellerDialog
          customer={assigning}
          token={accessToken ?? undefined}
          saving={dangLuuPhanCong}
          onSave={async (managers, note) => {
            setDangLuuPhanCong(true);
            try {
              await assignSeller(assigning, managers, note);
            } catch (error) {
              alert(error instanceof Error ? error.message : 'Không lưu được phân công.');
            } finally {
              setDangLuuPhanCong(false);
            }
          }}
          onClose={() => setAssigning(null)}
        />
      )}

      {/* Compact header */}
      <header className="crm2-header">
        <div className="crm2-header-left">
          <div className="crm2-breadcrumb">
            <span>CRM</span>
            <ChevronRight size={12}/>
            <span className="crm2-breadcrumb-current">Khách hàng</span>
          </div>
          <h1 className="crm2-title">
            {showingAuditLog ? 'Nhật ký thao tác' : 'Khách hàng'}
            {!showingAuditLog && <span className="crm2-title-count"> ({filtered.length})</span>}
          </h1>
        </div>
        <div className="crm2-header-right">
          {!showingAuditLog && (
            <>
              <button className="crm2-btn crm2-btn--ghost" disabled={filtered.length === 0} onClick={() => exportCsv(filtered)}>
                <Download size={15}/> Xuất CSV
              </button>
              {coQuyenTaoKhachHang && (
                <button className="crm2-btn crm2-btn--primary" onClick={() => openEdit(null)}>
                  <Plus size={15}/> Thêm mới
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {showingAuditLog ? (
        <CustomerAuditView customers={customers} />
      ) : (
        <>
      {/* Search bar */}
      <div className="crm2-search-bar">
        <Search size={16} className="crm2-search-icon"/>
        <input
          ref={searchRef}
          className="crm2-search-input"
          aria-label="Tìm kiếm khách hàng"
          placeholder="Tìm tên, mã KH, SĐT, email, MST..."
          value={filters.keyword}
          onChange={e => setFilters(f => ({...f, keyword: e.target.value}))}
        />
        <kbd className="crm2-search-kbd">Ctrl+K</kbd>
        {filters.keyword && (
          <button className="crm2-btn-icon crm2-search-clear" aria-label="Xóa" onClick={() => setFilters(f => ({...f, keyword: ''}))}>
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Filter chips + dropdown filters */}
      <div className="crm2-toolbar">
        <div className="crm2-chips">
          {statusChips.map(chip => (
            <button
              key={chip.key}
              className={filters.status === chip.key ? 'crm2-chip crm2-chip--active' : 'crm2-chip'}
              onClick={() => setFilters(f => ({...f, status: chip.key}))}
            >
              {chip.label} {chip.count != null && <span className="crm2-chip-count">{chip.count}</span>}
            </button>
          ))}

          {/* Manager dropdown */}
          <div className="crm2-dropdown-wrap">
            <button className={`crm2-chip${filters.sellerId ? ' crm2-chip--active' : ''}`} onClick={() => setDropdownOpen(d => d === 'seller' ? null : 'seller')}>
              <Briefcase size={12}/> {filters.sellerId ? options.managers.find(s => s.id === filters.sellerId)?.name : 'Người phụ trách'} <ChevronDown size={12}/>
            </button>
            {dropdownOpen === 'seller' && (
              <div className="crm2-dropdown-menu">
                <button onClick={() => { setFilters(f => ({...f, sellerId: ''})); setDropdownOpen(null); }}>Tất cả người phụ trách</button>
                {options.managers.length ? options.managers.map(s => <button key={s.id} onClick={() => { setFilters(f => ({...f, sellerId: s.id})); setDropdownOpen(null); }}>{s.name}</button>) : <span style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>Chưa có dữ liệu</span>}
              </div>
            )}
          </div>

          {/* Group dropdown */}
          <div className="crm2-dropdown-wrap">
            <button className={`crm2-chip${filters.customerGroup ? ' crm2-chip--active' : ''}`} onClick={() => setDropdownOpen(d => d === 'group' ? null : 'group')}>
              <Users size={12}/> {filters.customerGroup || 'Nhóm'} <ChevronDown size={12}/>
            </button>
            {dropdownOpen === 'group' && (
              <div className="crm2-dropdown-menu">
                <button onClick={() => { setFilters(f => ({...f, customerGroup: ''})); setDropdownOpen(null); }}>Tất cả nhóm</button>
                {options.groups.length ? options.groups.map(g => <button key={g} onClick={() => { setFilters(f => ({...f, customerGroup: g})); setDropdownOpen(null); }}>{g}</button>) : <span style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>Chưa có dữ liệu</span>}
              </div>
            )}
          </div>
        </div>

        <div className="crm2-toolbar-right">
          {/* CRM threshold settings */}
          <div style={{ position: 'relative' }}>
            <button
              className={`crm2-btn crm2-btn--ghost${showThresholdSettings ? ' crm2-btn--active' : ''}`}
              style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => setShowThresholdSettings(v => !v)}
              title="Cài đặt mốc thời gian CRM"
            >
              <Settings size={13}/> Mốc CRM
            </button>
            {showThresholdSettings && (
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: 'var(--surface, #ffffff)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px 16px', zIndex: 200,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 280,
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text, #1e293b)' }}>
                  Mốc thời gian tự động CRM
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                      Tạm ngưng — không hoạt động từ (tháng)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number" min={1} max={60}
                        className="form-input"
                        style={{ width: 80 }}
                        value={crmThresholds.pausedMonths}
                        onChange={e => {
                          const v = Math.max(1, Math.min(60, Number(e.target.value) || 1));
                          const next = { ...crmThresholds, pausedMonths: v };
                          setCrmThresholds(next);
                          saveCrmThresholds(next);
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>tháng (mặc định: 6)</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                      Ngừng hợp tác — không hoạt động từ (tháng)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number" min={1} max={120}
                        className="form-input"
                        style={{ width: 80 }}
                        value={crmThresholds.inactiveMonths}
                        onChange={e => {
                          const v = Math.max(1, Math.min(120, Number(e.target.value) || 1));
                          const next = { ...crmThresholds, inactiveMonths: v };
                          setCrmThresholds(next);
                          saveCrmThresholds(next);
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>tháng (mặc định: 12)</span>
                    </div>
                  </div>
                  {crmThresholds.pausedMonths >= crmThresholds.inactiveMonths && (
                    <div style={{ fontSize: '0.75rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px' }}>
                      Mốc Tạm ngưng phải nhỏ hơn mốc Ngừng hợp tác.
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <button
                      className="crm2-btn crm2-btn--ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => {
                        setCrmThresholds(DEFAULT_CRM_THRESHOLDS);
                        saveCrmThresholds(DEFAULT_CRM_THRESHOLDS);
                      }}
                    >
                      Đặt lại mặc định
                    </button>
                    <button
                      className="crm2-btn crm2-btn--primary"
                      style={{ fontSize: 12 }}
                      onClick={() => setShowThresholdSettings(false)}
                    >
                      Xong
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      {filtered.length === 0 ? (
        <div className="crm2-empty-state crm2-empty-state--large">
          <Shield size={48} strokeWidth={1} />
          <p>Không có khách hàng phù hợp</p>
          <span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</span>
          <button className="crm2-btn crm2-btn--ghost" onClick={() => setFilters(emptyFilters)}>Xóa bộ lọc</button>
        </div>
      ) : (
        /* Table View */
        <div className="crm2-table-shell">
        <div className="crm2-table-wrap">
          <table className="crm2-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const { missing } = getCompleteness(c);
                const crmCfg = CRM_STATUS_CONFIG[getCrmStatus(c)];
                const duocXemLienHe = canViewContact(role, c, currentSellerId);
                const managerNames = managerNamesForTable(c);
                const canUpdateThisCustomer = canUpdateCustomerRecord(c, nguoiDungHienTai?.id);
                return (
                <tr key={c.id} className="crm2-table-row" onClick={() => openDetail(c)}>
                  <td>
                    <div className="crm2-table-customer">
                      <div className="crm2-table-avatar" style={{ background: getAvatarColor(c.id) }}>{getInitials(c)}</div>
                      <div>
                        <span className="crm2-table-name">
                          {missing.length > 0 && <span className="crm2-missing-dot" title={`Thiếu: ${missing.slice(0,3).join(', ')}${missing.length > 3 ? '...' : ''}`}>!</span>}
                          {displayName(c)}
                        </span>
                        <span className="crm2-table-code">{c.customerCode} · {typeLabel(c)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="crm2-table-contact">
                      <span>{duocXemLienHe ? (c.contactName || '-') : 'Ẩn liên hệ'}</span>
                      <span>{duocXemLienHe ? (c.phone || '-') : 'Ẩn SĐT'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="crm2-table-managers">
                      {managerNames.map((name, index) => <span key={`${c.id}-manager-${index}`}>{name}</span>)}
                    </div>
                  </td>
                  <td>
                    <span className="crm2-crm-badge" style={{ background: crmCfg.bg, color: crmCfg.text, fontSize: 11 }}>
                      {crmCfg.dot} {crmCfg.label}
                    </span>
                  </td>
                  <td>
                    <div className="crm2-table-actions" onClick={e => e.stopPropagation()}>
                      <button className="crm2-btn-icon" title="Xem" onClick={() => openDetail(c)}><Eye size={14}/></button>
                      {canUpdateThisCustomer && <button className="crm2-btn-icon" title="Sửa" onClick={() => openEdit(c)}><Pencil size={14}/></button>}
                      {canUpdateThisCustomer && <button className="crm2-btn-icon" title="Phân công" onClick={() => openAssign(c)}><Briefcase size={14}/></button>}
                      {canLock(role) && (
                        <button className="crm2-btn-icon" title={c.isLocked ? 'Mở khóa' : 'Khóa'} onClick={() => setConfirm({
                          title: c.isLocked ? 'Mở khóa?' : 'Khóa?',
                          desc: c.isLocked ? `${displayName(c)} sẽ được mở khóa.` : `${displayName(c)} sẽ bị khóa.`,
                          action: () => patch(c.id, { isLocked: !c.isLocked })
                        })}>
                          {c.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}
                        </button>
                      )}
                      <div style={{ position: 'relative', display: 'inline-block' }} onMouseDown={e => e.stopPropagation()}>
                        <button className="crm2-btn-icon" title="Hồ sơ giao dịch" onClick={() => setTxCardOpen(txCardOpen === c.id ? null : c.id)}>
                          <ClipboardList size={14}/>
                        </button>
                        {txCardOpen === c.id && (
                          <div className="crm2-dropdown-menu" style={{ position: 'absolute', top: 0, right: 'calc(100% + 8px)', left: 'auto', minWidth: 200, zIndex: 20 }}>
                            <button onClick={() => { handleNavigate('history_db', displayName(c), true); setTxCardOpen(null); }}>
                              <FileText size={13}/> Bảng báo giá
                            </button>
                            <button onClick={() => { handleNavigate('lsx_list', displayName(c)); setTxCardOpen(null); }}>
                              <Package size={13}/> Danh sách LSX
                            </button>
                            <button onClick={() => { handleNavigate('history_db', displayName(c)); setTxCardOpen(null); }}>
                              <ClipboardList size={13}/> Sản phẩm liên quan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ── Embedded Styles (crm2- prefix) ──────────────────────────────────────────
const CRM2_STYLES = `
.crm2-root {
  --card: var(--surface);
  --foreground: var(--text);
  --muted-bg: var(--surface2);
  position: relative;
  padding: 24px;
  min-width: 1120px;
  max-width: none;
  margin: 0;
  font-family: inherit;
  height: 100%;
  overflow: auto;
}
.crm2-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}
.crm2-header-left { display: flex; flex-direction: column; gap: 4px; }
.crm2-header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.crm2-breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--muted, #6b7280);
}
.crm2-breadcrumb-current { color: var(--foreground, #111); font-weight: 500; }
.crm2-title {
  font-size: 22px; font-weight: 700; margin: 0;
  color: var(--foreground, #111);
}
.crm2-title-count { font-weight: 400; color: var(--muted, #6b7280); font-size: 16px; }

/* Search */
.crm2-search-bar {
  position: relative;
  display: flex; align-items: center;
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 0 14px;
  margin-bottom: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.crm2-search-bar:focus-within {
  border-color: var(--accent, #0891b2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #0891b2) 12%, transparent);
}
.crm2-search-icon { color: var(--muted, #9ca3af); flex-shrink: 0; }
.crm2-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  padding: 12px 10px; font-size: 14px; color: var(--foreground, #111);
}
.crm2-search-input::placeholder { color: var(--muted, #9ca3af); }
.crm2-search-kbd {
  font-size: 11px; padding: 2px 6px; border-radius: 4px;
  background: var(--muted-bg, #f3f4f6); color: var(--muted, #6b7280);
  border: 1px solid var(--border, #e5e7eb); font-family: monospace;
  user-select: none; flex-shrink: 0;
}
.crm2-search-clear { margin-left: 4px; }

/* Toolbar */
.crm2-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
}
.crm2-chips {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap; padding-bottom: 2px;
}
.crm2-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 20px; font-size: 13px;
  border: 1px solid var(--border, #e5e7eb);
  background: var(--card, #fff); color: var(--foreground, #374151);
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
  font-weight: 500;
}
.crm2-chip:hover { border-color: var(--accent, #0891b2); color: var(--accent, #0891b2); }
.crm2-chip--active {
  background: var(--accent, #0891b2); color: #fff;
  border-color: var(--accent, #0891b2);
}
.crm2-chip--active:hover { opacity: 0.9; color: #fff; }
.crm2-chip-count {
  font-size: 11px; padding: 1px 6px; border-radius: 10px;
  background: color-mix(in srgb, currentColor 12%, transparent);
}
.crm2-chip--active .crm2-chip-count { background: rgba(255,255,255,0.25); }

/* Dropdown */
.crm2-dropdown-wrap { position: relative; }
.crm2-dropdown-menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
  min-width: 160px; background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1); padding: 4px;
  animation: crm2-dropdown-in 0.15s ease;
}
@keyframes crm2-dropdown-in { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
.crm2-dropdown-menu button {
  display: block; width: 100%; text-align: left;
  padding: 8px 12px; border: none; background: transparent;
  font-size: 13px; border-radius: 4px; cursor: pointer;
  color: var(--foreground, #374151);
}
.crm2-dropdown-menu button:hover { background: var(--muted-bg, #f3f4f6); }

/* Managers picker */
.crm2-managers-picker { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
.crm2-manager-section-title,
.crm2-manager-selected-head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: var(--muted, #6b7280); font-weight: 700;
}
.crm2-manager-suggestions,
.crm2-manager-list {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px; background: var(--card, #fff);
  overflow: hidden;
}
.crm2-manager-list--compact { margin-top: 4px; }
.crm2-manager-suggestion,
.crm2-manager-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px;
  border: 0; border-bottom: 1px solid var(--border, #e5e7eb);
  background: transparent; color: var(--foreground, #111); text-align: left;
}
.crm2-manager-suggestion:last-child,
.crm2-manager-row:last-child { border-bottom: 0; }
.crm2-manager-suggestion { cursor: pointer; }
.crm2-manager-suggestion:hover { background: color-mix(in srgb, var(--accent, #0891b2) 7%, transparent); }
.crm2-manager-avatar {
  width: 30px; height: 30px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto; background: #e0f2fe; color: #0369a1;
  font-size: 11px; font-weight: 800; letter-spacing: .02em;
}
.crm2-manager-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.crm2-manager-main b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crm2-manager-main small { font-size: 11px; color: var(--muted, #6b7280); }
.crm2-manager-add { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--accent, #0891b2); }
.crm2-manager-write { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted, #6b7280); white-space: nowrap; }
.crm2-manager-write input { accent-color: var(--accent, #0891b2); }
.crm2-manager-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 8px; border-radius: 999px;
  background: #f3f4f6; color: #4b5563;
  font-size: 11px; font-weight: 700; white-space: nowrap;
}
.crm2-manager-badge--write { background: #dcfce7; color: #166534; }
.crm2-manager-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 118px; gap: 6px; text-align: center;
  border: 1px dashed var(--border, #d1d5db); border-radius: 10px;
  color: var(--muted, #6b7280); background: color-mix(in srgb, var(--muted-bg, #f3f4f6) 55%, transparent);
}
.crm2-manager-empty b { color: var(--foreground, #111); }
.crm2-manager-empty span { font-size: 12px; }

/* Customer version history */
.crm2-version-history { display: flex; flex-direction: column; gap: 12px; }
.crm2-version-card {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  background: var(--card, #fff);
  padding: 14px;
}
.crm2-version-card-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 8px; font-size: 12px; color: var(--muted, #6b7280);
}
.crm2-version-card-head b { color: var(--accent, #0891b2); font-size: 13px; }
.crm2-version-title { font-weight: 700; color: var(--foreground, #111); margin-bottom: 8px; }
.crm2-version-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
.crm2-version-grid span { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted, #6b7280); }
.crm2-version-note { margin-top: 8px; font-size: 12px; color: var(--foreground, #374151); background: var(--muted-bg, #f3f4f6); border-radius: 8px; padding: 7px 9px; }

/* Audit log */
.crm2-audit-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: 10px;
  background: var(--card,#fff); border: 1px solid var(--border,#f3f4f6);
}
.crm2-audit-summary-text { margin-top: 6px; font-size: 12.5px; color: var(--foreground,#374151); font-weight: 600; }
.crm2-audit-compact-fields { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.crm2-audit-compact-fields span { font-size: 11.5px; color: var(--muted,#6b7280); background: var(--muted-bg,#f3f4f6); border-radius: 999px; padding: 3px 8px; }
.crm2-audit-expand { margin-top: 8px; border: 0; background: transparent; color: var(--accent,#0891b2); font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }
.crm2-audit-detail { margin-top: 10px; }
.crm2-audit-detail-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid var(--border,#e5e7eb); border-radius: 8px; overflow: hidden; }
.crm2-audit-detail-table th { background: var(--muted-bg,#f3f4f6); color: var(--muted,#6b7280); text-align: left; padding: 8px; font-weight: 700; }
.crm2-audit-detail-table td { padding: 8px; border-top: 1px solid var(--border,#e5e7eb); vertical-align: top; color: var(--foreground,#374151); }
.crm2-audit-detail-table td:first-child { font-weight: 700; width: 28%; }
.crm2-audit-detail-list { display: none; flex-direction: column; gap: 8px; }
.crm2-audit-detail-item { border: 1px solid var(--border,#e5e7eb); border-radius: 8px; padding: 9px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.crm2-audit-detail-item b { color: var(--foreground,#111); }
.crm2-audit-detail-item span { color: var(--muted,#6b7280); }

/* View toggle */
.crm2-toolbar-right { display: flex; align-items: center; gap: 8px; }
.crm2-view-toggle {
  display: flex; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; overflow: hidden;
}
.crm2-view-btn {
  padding: 7px 10px; border: none; background: var(--card, #fff);
  color: var(--muted, #9ca3af); cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center;
}
.crm2-view-btn:hover { color: var(--foreground, #374151); }
.crm2-view-btn--active { background: var(--accent, #0891b2); color: #fff; }
/* Card Grid */
.crm2-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.crm2-card {
  position: relative;
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.crm2-card:hover {
  border-color: var(--accent, #0891b2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.crm2-card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.crm2-card-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0;
  letter-spacing: 0.5px;
}
.crm2-card-identity { flex: 1; min-width: 0; }
.crm2-card-name {
  display: block; font-weight: 600; font-size: 14px;
  color: var(--foreground, #111); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.crm2-card-code { font-size: 12px; color: var(--muted, #6b7280); }
.crm2-card-info { display: flex; flex-direction: column; gap: 6px; }
.crm2-card-info-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--muted, #6b7280);
}
.crm2-card-info-row--truncate {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.crm2-card-actions {
  position: absolute; bottom: 12px; right: 12px;
  display: flex; gap: 2px; opacity: 0;
  transition: opacity 0.15s;
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 2;
}
.crm2-card-actions--visible { opacity: 1; }

/* Status badge */
.crm2-status-badge {
  display: inline-flex; align-items: center;
  padding: 3px 8px; border-radius: 12px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
}
.crm2-status-badge--active { background: #dcfce7; color: #166534; }
.crm2-status-badge--inactive { background: #fef3c7; color: #92400e; }
.crm2-status-badge--locked { background: #fee2e2; color: #991b1b; }

/* Table */
.crm2-table-shell { width: 100%; overflow: visible; }
.crm2-table-wrap {
  overflow: visible;
  max-width: 100%; width: 100%;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px; background: var(--card, #fff);
}
.crm2-table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 13px; }
.crm2-table th {
  text-align: left; padding: 12px 14px; font-weight: 600;
  color: var(--muted, #6b7280); font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.5px; border-bottom: 1px solid var(--border, #e5e7eb);
  background: var(--muted-bg, #f9fafb);
}
.crm2-table td { padding: 12px 14px; border-bottom: 1px solid var(--border, #f3f4f6); }
.crm2-table-row { cursor: pointer; transition: background 0.1s; }
.crm2-table-row:hover { background: var(--muted-bg, #f9fafb); }
.crm2-table-customer { display: flex; align-items: center; gap: 10px; }
.crm2-table-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 11px; flex-shrink: 0;
}
.crm2-table-name { display: block; font-weight: 600; color: var(--foreground, #111); }
.crm2-table-code { display: block; font-size: 12px; color: var(--muted, #6b7280); }
.crm2-table-contact { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--muted, #6b7280); }
.crm2-table-seller { font-size: 12px; }
.crm2-table-managers { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--foreground, #111); line-height: 1.35; }
.crm2-table-actions { display: flex; gap: 4px; }

/* Slide panel */
.crm2-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
}
.crm2-overlay--open { opacity: 1; pointer-events: auto; }
/* Edit panel — trượt nối tiếp từ mép phải của detail panel */
.crm2-edit-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 640px; max-width: 90vw;
  background: var(--card, #fff); z-index: 102;
  display: flex; flex-direction: column;
  box-shadow: -12px 0 40px rgba(0,0,0,0.14);
  overflow-y: auto;
  border-left: 1px solid var(--border, #e5e7eb);
}
.crm2-edit-panel--open { animation: crm2-edit-slide-in 0.28s cubic-bezier(0.4,0,0.2,1) both; }
@keyframes crm2-edit-slide-in {
  from { transform: translateX(100%); opacity: 0.96; }
  to { transform: translateX(0); opacity: 1; }
}
.crm2-edit-panel .crm2-wizard-wrap {
  max-width: 100%;
  padding: 0 24px 24px;
}
.crm2-wizard-header {
  position: sticky; top: 0; z-index: 2;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 24px 16px;
  background: var(--card, #fff);
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.crm2-wizard-kicker { font-size: 12px; font-weight: 600; color: var(--accent, #0891b2); text-transform: uppercase; letter-spacing: .04em; }
.crm2-wizard-title { margin: 4px 0 0; font-size: 20px; line-height: 1.25; font-weight: 700; color: var(--foreground, #111); }
.crm2-wizard-close { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }

.crm2-slide-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 480px; max-width: 100vw;
  background: var(--card, #fff); z-index: 101;
  transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.1);
}
.crm2-slide-panel--open { transform: translateX(0); }
.crm2-panel-header {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 24px 20px 16px; border-bottom: 1px solid var(--border, #e5e7eb);
}
.crm2-panel-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
}
.crm2-panel-title { flex: 1; min-width: 0; }
.crm2-panel-title h3 { margin: 0; font-size: 17px; font-weight: 700; }
.crm2-panel-meta {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 4px; font-size: 12px; color: var(--muted, #6b7280);
}
.crm2-dot { opacity: 0.4; }
.crm2-panel-seller { font-size: 12px; color: var(--muted, #6b7280); display: flex; align-items: center; gap: 4px; margin-top: 4px; }
/* Panel tabs */
.crm2-panel-tabs {
  display: flex; border-bottom: 1px solid var(--border, #e5e7eb);
  padding: 0 20px;
}
.crm2-panel-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px; border: none; background: transparent;
  font-size: 13px; font-weight: 500; cursor: pointer;
  color: var(--muted, #6b7280); border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.crm2-panel-tab:hover { color: var(--foreground, #374151); }
.crm2-panel-tab--active {
  color: var(--accent, #0891b2);
  border-bottom-color: var(--accent, #0891b2);
}
.crm2-panel-body { flex: 1; overflow-y: auto; padding: 20px; }

/* Info grid */
.crm2-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.crm2-info-item { display: flex; flex-direction: column; gap: 2px; }
.crm2-info-item--full { grid-column: 1 / -1; }
.crm2-info-label { font-size: 11px; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.3px; }
.crm2-info-value { font-size: 13px; color: var(--foreground, #111); }
.crm2-info-history { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.crm2-info-history-item { font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--border, #f3f4f6); color: var(--muted, #6b7280); }

/* Panel list items */
.crm2-panel-list { display: flex; flex-direction: column; gap: 2px; }
.crm2-panel-list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  transition: background 0.1s;
}
.crm2-panel-list-item:hover { background: var(--muted-bg, #f9fafb); }
.crm2-panel-list-icon { color: var(--muted, #9ca3af); flex-shrink: 0; }
.crm2-panel-list-content { flex: 1; min-width: 0; }
.crm2-panel-list-content b { display: block; font-size: 13px; font-weight: 600; }
.crm2-panel-list-content small { font-size: 12px; color: var(--muted, #6b7280); }
.crm2-panel-list-actions { display: flex; gap: 4px; }

/* Buttons */
.crm2-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px; font-size: 13px;
  font-weight: 500; border: none; cursor: pointer;
  transition: all 0.15s; white-space: nowrap;
}
.crm2-btn--primary {
  background: var(--accent, #0891b2); color: #fff;
}
.crm2-btn--primary:hover { opacity: 0.9; }
.crm2-btn--ghost {
  background: transparent; color: var(--foreground, #374151);
  border: 1px solid var(--border, #e5e7eb);
}
.crm2-btn--ghost:hover { background: var(--muted-bg, #f3f4f6); }
.crm2-btn--danger { background: #ef4444; color: #fff; }
.crm2-btn--danger:hover { background: #dc2626; }
.crm2-btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 6px;
  border: none; background: transparent; cursor: pointer;
  color: var(--muted, #6b7280); transition: all 0.15s;
}
.crm2-btn-icon:hover { background: var(--muted-bg, #f3f4f6); color: var(--foreground, #374151); }
.crm2-btn-icon--close { position: absolute; top: 16px; right: 16px; }

/* Empty state */
.crm2-empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 40px 20px; gap: 8px;
  color: var(--muted, #9ca3af); text-align: center;
}
.crm2-empty-state p { font-size: 15px; font-weight: 600; color: var(--foreground, #374151); margin: 8px 0 0; }
.crm2-empty-state span { font-size: 13px; }
.crm2-empty-state--large { padding: 80px 20px; }
.crm2-empty-state--large svg { opacity: 0.4; }

/* Confirm dialog */
.crm2-confirm-dialog {
  background: var(--card, #fff); border-radius: 12px;
  padding: 24px; max-width: 420px; margin: 100px auto;
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
}
.crm2-confirm-dialog h3 { margin: 0 0 8px; font-size: 16px; }
.crm2-confirm-dialog p { margin: 0 0 20px; font-size: 13px; color: var(--muted, #6b7280); }
.crm2-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* Wizard */
.crm2-wizard-wrap { max-width: 680px; margin: 0; }
.crm2-wizard-progress {
  height: 3px; background: var(--border, #e5e7eb);
  border-radius: 2px; margin-bottom: 20px; overflow: hidden;
}
.crm2-wizard-progress-bar {
  height: 100%; background: var(--accent, #0891b2);
  border-radius: 2px; transition: width 0.3s ease;
}
.crm2-wizard-steps {
  display: flex; gap: 4px; margin-bottom: 20px;
}
.crm2-wizard-step {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer; font-size: 13px;
  color: var(--muted, #9ca3af); font-weight: 500;
  transition: all 0.15s;
}
.crm2-wizard-step--active { background: var(--muted-bg, #f3f4f6); color: var(--foreground, #111); }
.crm2-wizard-step--done { color: var(--accent, #0891b2); }
.crm2-wizard-step-num {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  background: var(--border, #e5e7eb); color: var(--muted, #6b7280);
}
.crm2-wizard-step--active .crm2-wizard-step-num { background: var(--accent, #0891b2); color: #fff; }
.crm2-wizard-step--done .crm2-wizard-step-num { background: #dcfce7; color: #166534; }
/* Wizard summary */
.crm2-wizard-summary {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: 8px;
  background: var(--muted-bg, #f9fafb); margin-bottom: 16px;
  font-size: 12px; color: var(--muted, #6b7280);
}
.crm2-wizard-summary span { display: flex; align-items: center; gap: 4px; }

/* Wizard card */
.crm2-wizard-card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px; padding: 20px; margin-bottom: 16px;
}
.crm2-wizard-card-header {
  display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px;
}
.crm2-wizard-card-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent, #0891b2) 10%, transparent);
  color: var(--accent, #0891b2); flex-shrink: 0;
}
.crm2-wizard-card-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.crm2-wizard-card-header p { margin: 2px 0 0; font-size: 12px; color: var(--muted, #6b7280); }
.crm2-wizard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .crm2-wizard-grid { grid-template-columns: 1fr; } }

/* Type toggle */
.crm2-type-toggle { display: flex; margin-left: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; overflow: hidden; }
.crm2-type-toggle-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; border: none; background: transparent;
  font-size: 12px; cursor: pointer; color: var(--muted, #6b7280);
  transition: all 0.15s;
}
.crm2-type-toggle-btn--active { background: var(--accent, #0891b2); color: #fff; }

/* Form fields */
.crm2-field { display: flex; flex-direction: column; gap: 4px; }
.crm2-field-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 500; color: var(--foreground, #374151);
}
.crm2-req { color: #ef4444; }
.crm2-input {
  padding: 9px 12px; border-radius: 8px;
  border: 1px solid var(--border, #e5e7eb);
  font-size: 13px; color: var(--foreground, #111);
  background: var(--card, #fff);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.crm2-input:focus {
  border-color: var(--accent, #0891b2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #0891b2) 10%, transparent);
}
.crm2-input--error { border-color: #ef4444; }
.crm2-textarea { resize: vertical; min-height: 72px; }
.crm2-field-error { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ef4444; }
.crm2-field-hint { font-size: 11px; color: var(--muted, #9ca3af); }

/* Wizard actions */
.crm2-wizard-actions {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0; border-top: 1px solid var(--border, #e5e7eb);
  margin-top: 8px; gap: 8px; flex-wrap: wrap;
}
.crm2-wizard-actions-left { display: flex; gap: 8px; flex-wrap: wrap; }

/* Alert */
.crm2-alert {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px; font-size: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border, #e5e7eb);
}
.crm2-alert--warning { background: #fef3c7; border-color: #fbbf24; color: #92400e; }
.crm2-alert--orange { background: #fff7ed; border-color: #fb923c; color: #c2410c; }

/* Responsive */
@media (max-width: 768px) {
  .crm2-root { padding: 16px; }
  .crm2-card-grid { grid-template-columns: 1fr; }
  .crm2-slide-panel { width: 100vw; }
  .crm2-edit-panel { right: 0; width: 100vw; max-width: 100vw; z-index: 103; }
  .crm2-info-grid { grid-template-columns: 1fr; }
  .crm2-header { flex-direction: column; }
  .crm2-audit-detail-table { display: none; }
  .crm2-audit-detail-list { display: flex; }
}

/* CRM badge */
.crm2-crm-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  flex-shrink: 0;
}

/* Missing dot indicator */
.crm2-missing-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700;
  margin-right: 5px; flex-shrink: 0;
  vertical-align: middle;
}

/* Card completeness bar */
.crm2-card-progress {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px;
}
.crm2-card-progress-bar {
  flex: 1; height: 4px; border-radius: 2px;
  background: var(--border, #e5e7eb); overflow: hidden;
}
.crm2-card-progress-fill {
  height: 100%; border-radius: 2px;
  transition: width 0.3s ease;
}
.crm2-card-progress-label {
  font-size: 11px; color: var(--muted, #9ca3af); white-space: nowrap;
}

/* Card missing fields hint */
.crm2-card-missing {
  font-size: 11px; color: #ef4444; margin-top: 4px;
  padding: 3px 6px; background: #fef2f2; border-radius: 4px;
}

/* Card info row warn */
.crm2-card-info-row--warn {
  color: #f59e0b !important;
}

/* Inline assign button */
.crm2-assign-inline {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: #f59e0b; color: #fff;
  font-size: 13px; font-weight: 700; border: none; cursor: pointer;
  line-height: 1; padding: 0; margin-left: 4px;
  transition: background 0.15s;
}
.crm2-assign-inline:hover { background: #d97706; }

/* Panel action bar */
.crm2-panel-actions {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-bottom: 1px solid var(--border, #e5e7eb);
  flex-wrap: wrap;
}

/* Panel progress bar */
.crm2-panel-progress {
  display: flex; align-items: center; gap: 8px;
  margin-top: 6px;
}

/* Main tabs */
.crm2-main-tabs {
  display: flex; gap: 2px; margin-bottom: 20px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.crm2-main-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; border: none; background: transparent;
  font-size: 13px; font-weight: 500; cursor: pointer;
  color: var(--muted, #6b7280); border-bottom: 2px solid transparent;
  transition: all 0.15s; margin-bottom: -1px;
}
.crm2-main-tab:hover { color: var(--foreground, #374151); }
.crm2-main-tab--active {
  color: var(--accent, #0891b2);
  border-bottom-color: var(--accent, #0891b2);
}
`;

// Inject styles once
function StyleInjector() {
  useEffect(() => {
    const id = 'crm2-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = CRM2_STYLES;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
  return null;
}
