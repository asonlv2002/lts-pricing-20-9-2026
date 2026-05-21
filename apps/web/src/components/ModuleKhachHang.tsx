"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Briefcase, Building2, ChevronDown, Download, Eye, FileText, Filter, Hash, Lock, Mail, MapPin, MoreHorizontal, Package, Pencil, Phone, Plus, Save, Search, Shield, Unlock, User, Users, X } from 'lucide-react';
import seedCustomers from '../data/customers.json';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';

type CustomerStatus = 'active' | 'inactive';
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
  address?: string;
  region?: string;
  customerGroup?: string;
  sellerId?: string | null;
  sellerName?: string;
  status: CustomerStatus;
  isLocked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFilters {
  keyword: string;
  sellerId: string;
  customerGroup: string;
  status: 'all' | CustomerStatus | 'locked';
  region: string;
  createdFrom: string;
  createdTo: string;
}

const LS_CUSTOMERS = 'lts_customers';
const SELLERS = [
  { id: 'S1', name: 'Nguyen Van An' },
  { id: 'S2', name: 'Tran Gia Bao' },
  { id: 'S3', name: 'Le Thu Ha' },
];
const emptyFilters: CustomerFilters = { keyword: '', sellerId: '', customerGroup: '', status: 'all', region: '', createdFrom: '', createdTo: '' };
const blankCustomer: Customer = { id: '', customerType: 'company', customerCode: '', companyName: '', taxCode: '', contactName: '', phone: '', email: '', address: '', region: '', customerGroup: '', sellerId: null, sellerName: '', status: 'active', isLocked: false, notes: '', createdAt: '', updatedAt: '' };

const FIELD_LABELS: Record<string, string> = {
  customerType: 'Loại khách hàng', customerCode: 'Mã khách hàng', companyName: 'Tên công ty', taxCode: 'Mã số thuế',
  contactName: 'Người liên hệ', phone: 'Số điện thoại', email: 'Email', address: 'Địa chỉ',
  region: 'Khu vực', customerGroup: 'Nhóm khách hàng', notes: 'Ghi chú',
};
const statusClass = (c: Customer) => c.isLocked ? 'crm-status--locked' : c.status === 'active' ? 'crm-status--active' : 'crm-status--inactive';
const getCustomerType = (c: Customer): CustomerType => c.customerType ?? 'company';
const isIndividual = (c: Customer) => getCustomerType(c) === 'individual';
const displayName = (c: Customer) => isIndividual(c) ? (c.contactName || c.companyName || 'Khách cá nhân') : (c.companyName || c.contactName || 'Khách doanh nghiệp');
const typeLabel = (c: Customer) => isIndividual(c) ? 'Cá nhân' : 'Doanh nghiệp';

const todayIso = () => new Date().toISOString();
const fmtDate = (v?: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '-';
const statusLabel = (c: Customer) => c.isLocked ? 'Đã khóa' : c.status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng';
const normalize = (v?: string | null) => (v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const canEdit = (role: Role, c: Customer, sellerId?: string) => role === 'admin' || (role === 'sale' && c.sellerId === sellerId && !c.isLocked);
const canLock = (role: Role) => role === 'admin';

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
  const headers = ['Loai KH','Ma KH','Ten khach hang','MST','Nguoi lien he','SDT','Email','Dia chi','Khu vuc','Nhom','Seller','Trang thai','Khoa','Ngay tao','Ghi chu'];
  const body = rows.map(c => [typeLabel(c),c.customerCode,displayName(c),c.taxCode,c.contactName,c.phone,c.email,c.address,c.region,c.customerGroup,c.sellerName,statusLabel(c),c.isLocked ? 'Co' : 'Khong',fmtDate(c.createdAt),c.notes]);
  const csv = [headers, ...body].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `danh-sach-khach-hang-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

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

function CustomerForm({ customer, role, currentSellerId, onSave, onCancel }: { customer?: Customer; role: Role; currentSellerId?: string; onSave: (c: Customer) => void; onCancel: () => void }) {
  const isNew = !customer;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Customer>(makeInitialCustomer(customer, role, currentSellerId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const seller = SELLERS.find(s => s.id === form.sellerId);
  const isLockedEdit = !isNew && !!customer?.isLocked;

  const set = (key: keyof Customer, value: string | boolean | null) => {
    setForm(f => {
      if (key === 'customerType') {
        const nextType = value as CustomerType;
        return { ...f, customerType: nextType, companyName: nextType === 'individual' ? (f.companyName || f.contactName || '') : f.companyName, contactName: nextType === 'company' ? f.contactName : (f.contactName || f.companyName || '') };
      }
      return { ...f, [key]: value };
    });
    setErrors(e => ({ ...e, [String(key)]: '' }));
  };

  const stepFields: Record<number, (keyof Customer)[]> = {
    0: ['customerCode', 'companyName', 'taxCode', 'customerGroup', 'region', 'address'],
    1: ['contactName', 'phone', 'email'],
    2: ['sellerId', 'status', 'notes'],
  };

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    for (const f of (stepFields[s] ?? [])) {
      const v = form[f] as string | null | undefined;
      if (f === 'customerCode' && !String(v ?? '').trim()) e.customerCode = 'Nhập mã khách hàng.';
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
    if (!form.customerCode.trim()) e.customerCode = 'Nhập mã khách hàng.';
    if (!isIndividual(form) && !form.companyName.trim()) e.companyName = 'Nhập tên công ty.';
    if (!form.contactName?.trim()) e.contactName = isIndividual(form) ? 'Nhập họ tên khách hàng.' : 'Nhập người liên hệ.';
    if (!form.phone?.trim()) e.phone = 'Nhập số điện thoại.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email chưa đúng định dạng.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);
  const submit = () => {
    if (!validateAll()) { setStep(0); return; }
    onSave({ ...form, sellerName: seller?.name ?? form.sellerName ?? '', updatedAt: todayIso() });
  };

  const Field = ({ k, icon, required, type = 'text', helper }: { k: keyof Customer; icon: React.ReactNode; required?: boolean; type?: string; helper?: string }) => {
    const err = errors[String(k)];
    const isSelect = k === 'sellerId' || k === 'status';
    const disabled = isLockedEdit && k !== 'notes';
    return (
      <div className="crm-wiz-field">
        <label htmlFor={`wiz-${String(k)}`}>{icon}{FIELD_LABELS[String(k)] ?? String(k)} {required && <span className="req">*</span>}</label>
        {isSelect ? (
          <select id={`wiz-${String(k)}`} className={`crm-wiz-input${err ? ' crm-wiz-input--error' : ''}`} value={String(form[k] ?? '')} onChange={e => set(k, e.target.value || null)} disabled={k === 'status' && role !== 'admin' || disabled}>
            {k === 'sellerId' && <option value="">Chưa phân công</option>}
            {k === 'sellerId' && SELLERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            {k === 'status' && <><option value="active">Đang sử dụng</option><option value="inactive">Ngừng sử dụng</option></>}
          </select>
        ) : k === 'notes' ? (
          <textarea id={`wiz-${String(k)}`} className={`crm-wiz-input${err ? ' crm-wiz-input--error' : ''}`} rows={3} value={String(form[k] ?? '')} onChange={e => set(k, e.target.value)} placeholder="VD: Điều khoản, thói quen đặt hàng, lưu ý công nợ..." disabled={disabled} />
        ) : (
          <input id={`wiz-${String(k)}`} type={type} className={`crm-wiz-input${err ? ' crm-wiz-input--error' : ''}`} value={String(form[k] ?? '')} onChange={e => set(k, e.target.value)} disabled={disabled} aria-invalid={!!err} />
        )}
        {err ? (
          <span className="crm-wiz-error" role="alert"><AlertCircle size={11}/>{err}</span>
        ) : helper ? (
          <span className="crm-wiz-hint">{helper}</span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="crm-pro-create">
      {/* Summary strip */}
      <div className="crm-wiz-summary">
        <span><Hash size={11}/>{form.customerCode || '—'}</span>
        <span>{isIndividual(form) ? <User size={11}/> : <Building2 size={11}/>} {displayName(form) || '—'}</span>
        <span><User size={11}/>{form.contactName || '—'}</span>
        <span className={`crm-status-pill ${statusClass(form)}`}>{statusLabel(form)}</span>
      </div>

      {/* Locked banner */}
      {isLockedEdit && (
        <div className="crm-wiz-locked"><Lock size={14}/> Khách hàng đang bị khóa. Chỉ admin mở khóa mới sửa được dữ liệu quan trọng.</div>
      )}

      {/* Step indicator */}
      <div className="crm-wiz-steps">
        {WIZ_STEPS.map((s, i) => (
          <div key={i} className={`crm-wiz-step${i < step ? ' done' : i === step ? ' active' : ''}`}>
            <div className="crm-wiz-dot">{i < step ? <span style={{ fontWeight: 800 }}>✓</span> : s.icon}</div>
            <span className="crm-wiz-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Công ty */}
      {step === 0 && (
        <div className="crm-wiz-card" key="step-0">
          <div className="crm-wiz-card-title crm-wiz-card-title--with-toggle"><div style={{display:'flex',alignItems:'center',gap:8}}>{isIndividual(form) ? <User size={18} style={{ color: 'var(--accent)' }}/> : <Building2 size={18} style={{ color: 'var(--accent)' }}/>} 
            <div>
              <h3>{isIndividual(form) ? 'Thông tin cá nhân' : 'Thông tin doanh nghiệp'}</h3>
              <p>{isIndividual(form) ? 'Họ tên, khu vực và nhóm khách hàng' : 'Mã số, tên và khu vực giao dịch'}</p>
            </div></div><div className="crm-type-toggle-inline" role="tablist" aria-label="Loại khách hàng"><button type="button" className={form.customerType !== 'individual' ? 'active' : ''} onClick={() => set('customerType', 'company')}><Building2 size={14}/>Doanh nghiệp</button>
            <button type="button" className={form.customerType === 'individual' ? 'active' : ''} onClick={() => set('customerType', 'individual')}><User size={14}/>Cá nhân</button></div></div>
          <div className="crm-wiz-grid">
            <Field k="customerCode" icon={<Hash size={12}/>} required helper="VD: KH001, KH2026-001" />
            {isIndividual(form)
              ? <Field k="contactName" icon={<User size={12}/>} required helper="Họ tên khách hàng cá nhân" />
              : <Field k="companyName" icon={<Building2 size={12}/>} required helper="Tên pháp lý hoặc tên giao dịch" />}
            {!isIndividual(form) && <Field k="taxCode" icon={<Hash size={12}/>} helper="Mã số thuế (dùng khi xuất hóa đơn)" />}
            <Field k="customerGroup" icon={<Users size={12}/>} helper="VD: Key account, FMCG, Khách lẻ" />
            <Field k="region" icon={<MapPin size={12}/>} helper="Tỉnh/thành hoặc khu vực" />
            <Field k="address" icon={<MapPin size={12}/>} helper="Địa chỉ giao dịch/giao hàng" />
          </div>
        </div>
      )}

      {/* Step 1: Liên hệ */}
      {step === 1 && (
        <div className="crm-wiz-card" key="step-1">
          <div className="crm-wiz-card-title">
            <User size={18} style={{ color: 'var(--accent)' }}/>
            <div>
              <h3>{isIndividual(form) ? 'Thông tin liên hệ' : 'Người liên hệ chính'}</h3>
              <p>{isIndividual(form) ? 'Số điện thoại và email của khách hàng' : 'Người nhận báo giá và trao đổi đơn hàng'}</p>
            </div>
          </div>
          <div className="crm-wiz-grid">
            {!isIndividual(form) && <Field k="contactName" icon={<User size={12}/>} required helper="Họ tên người liên hệ" />}
            <Field k="phone" icon={<Phone size={12}/>} required type="tel" helper="Số điện thoại liên hệ" />
            <Field k="email" icon={<Mail size={12}/>} type="email" helper="Email (không bắt buộc)" />
          </div>
        </div>
      )}

      {/* Step 2: Phân công */}
      {step === 2 && (
        <div className="crm-wiz-card" key="step-2">
          <div className="crm-wiz-card-title">
            <Briefcase size={18} style={{ color: 'var(--accent)' }}/>
            <div>
              <h3>Phân công &amp; trạng thái</h3>
              <p>Sale phụ trách và trạng thái sử dụng</p>
            </div>
          </div>
          <div className="crm-wiz-grid">
            {role === 'admin' && <Field k="sellerId" icon={<Briefcase size={12}/>} helper="Sale được phân công sẽ thấy KH này" />}
            <Field k="status" icon={<Shield size={12}/>} />
            <Field k="notes" icon={<FileText size={12}/>} helper="Điều khoản, thói quen đặt hàng, công nợ..." />
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="crm-wiz-actions">
        <div>{step > 0 && <button className="crm-btn crm-wiz-btn-ghost" onClick={back}><ArrowLeft size={14}/> Quay lại</button>}</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {step < 2 ? (
            <button className="crm-btn crm-wiz-btn-primary" onClick={next}>
              Tiếp tục <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }}/>
            </button>
          ) : (
            <button className="crm-btn crm-wiz-btn-primary" onClick={submit}>
              <Save size={14}/>{isNew ? 'Tạo khách hàng' : 'Lưu thay đổi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const history = dungCuaHangTinhGia(s => s.history);
  const related = history.filter(h => normalize(h.customer).includes(normalize(displayName(customer))) || normalize(h.input?.customer).includes(normalize(displayName(customer))));
  const products = Array.from(new Map(related.map(h => [`${h.productName}-${h.structure}`, h])).values());
  return <div className="crm-modal-backdrop" onClick={onClose}><div className="crm-create-form-card" style={{maxWidth:980, margin:'40px auto'}} onClick={e => e.stopPropagation()}>
    <div className="crm-create-section-head"><div style={{display:'flex',gap:14,alignItems:'center'}}><div className="crm-avatar-lg"><Briefcase size={22}/></div><div><h3>{displayName(customer)}</h3><p>{customer.customerCode} · {typeLabel(customer)} · <span className={`crm-status-pill ${statusClass(customer)}`}>{statusLabel(customer)}</span> · Seller: {customer.sellerName || customer.sellerId || 'Chưa phân'}</p></div></div><button className="crm-btn crm-btn-ghost" aria-label="Đóng hồ sơ khách hàng" onClick={onClose}><X size={15}/> Đóng</button></div>
    <div className="crm-admin-tabs"><button className="crm-admin-tab active"><Users size={15}/> Thông tin</button><button className="crm-admin-tab"><FileText size={15}/> Báo giá ({related.length})</button><button className="crm-admin-tab"><Package size={15}/> Sản phẩm ({products.length})</button></div>
    <div className="crm-modal-grid crm-create-grid">{[['Loại khách hàng',typeLabel(customer)],['MST',customer.taxCode],['Người liên hệ',customer.contactName],['SĐT',customer.phone],['Email',customer.email],['Địa chỉ',customer.address],['Khu vực',customer.region],['Nhóm',customer.customerGroup],['Ghi chú',customer.notes]].map(([k,v]) => <div className="crm-modal-field" key={k}><label className="crm-modal-label">{k}</label><div className="crm-modal-input" style={{height:'auto',minHeight:38}}>{v || '-'}</div></div>)}</div>
    <h4><FileText size={16}/> Báo giá liên quan ({related.length})</h4>{related.slice(0,8).map(h => <div className="crm-customer-row" key={h.id}><FileText size={18}/><div className="crm-customer-main"><b>{h.productName}</b><small>{fmtDate(h.date)} · {Math.round(h.chotGia ?? h.finalPrice).toLocaleString('vi-VN')} đ</small></div></div>)}
    <h4><Package size={16}/> Sản phẩm liên quan ({products.length})</h4>{products.slice(0,8).map(h => <div className="crm-customer-row" key={h.id}><Package size={18}/><div className="crm-customer-main"><b>{h.productName}</b><small>{h.structure} · SL {h.quantity?.toLocaleString('vi-VN')}</small></div></div>)}
  </div></div>;
}

export default function ModuleKhachHang({ role, currentSellerId = 'S1', menuDangChon }: { role: Role; currentSellerId?: string; menuDangChon?: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFilters>(emptyFilters);
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; desc: string; action: () => void } | null>(null);
  useEffect(() => setCustomers(loadLocalCustomers()), []);
  useEffect(() => { if (customers.length) saveLocalCustomers(customers); }, [customers]);
  useEffect(() => { if (menuDangChon === 'customers.create') setEditing(null); }, [menuDangChon]);

  const options = useMemo(() => ({
    sellers: SELLERS,
    groups: Array.from(new Set(customers.map(c => c.customerGroup).filter(Boolean))) as string[],
    regions: Array.from(new Set(customers.map(c => c.region).filter(Boolean))) as string[],
  }), [customers]);
  const visible = useMemo(() => customers.filter(c => role === 'admin' || role === 'purchase' || c.sellerId === currentSellerId), [customers, role, currentSellerId]);
  const filtered = useMemo(() => visible.filter(c => {
    const q = normalize(filters.keyword);
    const hay = normalize([displayName(c),c.companyName,c.customerCode,c.contactName,c.phone,c.email,c.taxCode,typeLabel(c)].join(' '));
    if (q && !hay.includes(q)) return false;
    if (filters.sellerId && c.sellerId !== filters.sellerId) return false;
    if (filters.customerGroup && c.customerGroup !== filters.customerGroup) return false;
    if (filters.region && c.region !== filters.region) return false;
    if (filters.status === 'locked' && !c.isLocked) return false;
    if (filters.status !== 'all' && filters.status !== 'locked' && c.status !== filters.status) return false;
    if (filters.createdFrom && c.createdAt.slice(0,10) < filters.createdFrom) return false;
    if (filters.createdTo && c.createdAt.slice(0,10) > filters.createdTo) return false;
    return true;
  }), [visible, filters]);

  const upsert = (c: Customer) => setCustomers(prev => prev.some(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]);
  const patch = (id: string, partial: Partial<Customer>) => setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...partial, updatedAt: todayIso() } : c));
  if (editing !== undefined) return <CustomerForm customer={editing ?? undefined} role={role} currentSellerId={currentSellerId} onSave={c => { upsert(c); setEditing(undefined); }} onCancel={() => setEditing(undefined)} />;

  return <div className="crm-root">
    {detail && <CustomerDetail customer={detail} onClose={() => setDetail(null)} />}
    {confirm && <div className="crm-modal-backdrop" onClick={() => setConfirm(null)}><div className="crm-create-form-card" style={{maxWidth:460, margin:'70px auto'}} onClick={e => e.stopPropagation()}><h3>{confirm.title}</h3><p style={{color:'var(--muted)'}}>{confirm.desc}</p><div className="crm-create-actions"><button className="crm-btn crm-btn-ghost" onClick={() => setConfirm(null)}>Hủy</button><button className="crm-btn crm-btn-danger" onClick={() => { confirm.action(); setConfirm(null); }}>Xác nhận</button></div></div></div>}
    <div className="crm-toolbar">
      <div className="crm-search-box"><Search size={15} className="crm-search-icon"/><input className="crm-search-input" aria-label="Tìm kiếm khách hàng" placeholder="Tìm tên công ty, mã KH, liên hệ, SĐT, email, MST..." value={filters.keyword} onChange={e => setFilters(f => ({...f, keyword:e.target.value}))}/>{filters.keyword && <button aria-label="Xóa tìm kiếm" className="crm-search-clear" onClick={() => setFilters(f => ({...f, keyword:''}))}><X size={13}/></button>}</div>
      <div className="crm-toolbar-right"><button className="crm-btn crm-btn-outline" onClick={() => setFilterOpen(v => !v)}><Filter size={15}/> Bộ lọc <ChevronDown size={14}/></button><button className="crm-btn crm-btn-outline" disabled={filtered.length === 0} onClick={() => exportCsv(filtered)}><Download size={15}/> Xuất danh sách</button>{role !== 'purchase' && <button className="crm-btn crm-btn-primary" onClick={() => setEditing(null)}><Plus size={15}/> Thêm khách hàng</button>}</div>
    </div>
    {filterOpen && <div className="crm-filter-panel">
      <div className="crm-modal-field"><label className="crm-modal-label">Seller phụ trách</label><select className="crm-modal-input" value={filters.sellerId} onChange={e => setFilters(f => ({...f, sellerId:e.target.value}))}><option value="">Tất cả Seller</option>{options.sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="crm-modal-field"><label className="crm-modal-label">Nhóm khách hàng</label><select className="crm-modal-input" value={filters.customerGroup} onChange={e => setFilters(f => ({...f, customerGroup:e.target.value}))}><option value="">Tất cả nhóm</option>{options.groups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
      <div className="crm-modal-field"><label className="crm-modal-label">Trạng thái</label><select className="crm-modal-input" value={filters.status} onChange={e => setFilters(f => ({...f, status:e.target.value as CustomerFilters['status']}))}><option value="all">Tất cả trạng thái</option><option value="active">Đang sử dụng</option><option value="inactive">Ngừng sử dụng</option><option value="locked">Đã khóa</option></select></div>
      <div className="crm-modal-field"><label className="crm-modal-label">Khu vực</label><select className="crm-modal-input" value={filters.region} onChange={e => setFilters(f => ({...f, region:e.target.value}))}><option value="">Tất cả khu vực</option>{options.regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
      <div className="crm-modal-field"><label className="crm-modal-label">Tạo từ ngày</label><input className="crm-modal-input" type="date" value={filters.createdFrom} onChange={e => setFilters(f => ({...f, createdFrom:e.target.value}))}/></div>
      <div className="crm-modal-field"><label className="crm-modal-label">Đến ngày</label><input className="crm-modal-input" type="date" value={filters.createdTo} onChange={e => setFilters(f => ({...f, createdTo:e.target.value}))}/></div>
      <button className="crm-btn crm-btn-ghost" onClick={() => setFilters(emptyFilters)}>Xóa bộ lọc</button>
    </div>}
    <div className="crm-stats-bar"><div className="crm-stat"><span className="crm-stat-num">{filtered.length}</span><span className="crm-stat-label">Đang hiển thị</span></div><div className="crm-stat-divider"/><div className="crm-stat"><span className="crm-stat-num">{visible.length}</span><span className="crm-stat-label">Theo quyền</span></div><div className="crm-stat-divider"/><div className="crm-stat crm-stat--warn"><span className="crm-stat-num">{visible.filter(c=>c.isLocked).length}</span><span className="crm-stat-label">Đã khóa</span></div></div>
    <div className="crm-customer-list"><div className="crm-list-header"><span style={{flex:1}}>Khách hàng</span><span className="crm-col-contact">Liên hệ</span><span className="crm-col-location">Khu vực/Nhóm</span><span className="crm-col-seller">Seller</span><span className="crm-col-actions">Thao tác</span></div>{filtered.map(c => <div className="crm-customer-row" key={c.id}>
      <div className="crm-customer-main"><div className="crm-customer-name">{displayName(c)}</div><div className="crm-customer-company"><Hash size={11}/> {c.customerCode} · {typeLabel(c)}{!isIndividual(c) ? ` · MST ${c.taxCode || '-'}` : ''}</div><div className={`crm-status-pill ${statusClass(c)}`}>{statusLabel(c)}</div></div>
      <div className="crm-customer-contact"><span><Users size={11}/> {c.contactName || '-'}</span><span><Phone size={11}/> {c.phone || '-'}</span><span><Mail size={11}/> {c.email || '-'}</span></div>
      <div className="crm-customer-location"><MapPin size={11}/> {c.region || c.address || '-'}<br/>{c.customerGroup || '-'}</div>
      <div className="crm-customer-seller-badge"><span className="crm-badge crm-badge-seller"><Briefcase size={10}/> {c.sellerName || c.sellerId || 'Chưa phân'}</span></div>
      <div className="crm-customer-actions"><button className="crm-btn-icon" aria-label="Xem chi tiết khách hàng" title="Xem chi tiết" onClick={() => setDetail(c)}><Eye size={14}/></button>{canEdit(role,c,currentSellerId) && <button className="crm-btn-icon crm-btn-accent" aria-label="Chỉnh sửa khách hàng" title="Chỉnh sửa" onClick={() => setEditing(c)}><Pencil size={14}/></button>}{role === 'admin' && <button className="crm-btn-icon" aria-label="Chuyển trạng thái khách hàng" title="Chuyển trạng thái" onClick={() => setConfirm({title:'Chuyển trạng thái khách hàng?', desc:`${displayName(c)} sẽ chuyển sang ${c.status === 'active' ? 'ngừng sử dụng' : 'đang sử dụng'}.`, action:() => patch(c.id,{status:c.status === 'active' ? 'inactive' : 'active'})})}><AlertCircle size={14}/></button>}{canLock(role) && <button className="crm-btn-icon crm-btn-danger" aria-label="Khóa hoặc mở khóa khách hàng" title="Khóa/mở khóa" onClick={() => setConfirm({title:c.isLocked ? 'Mở khóa khách hàng?' : 'Khóa khách hàng?', desc:c.isLocked ? `${displayName(c)} sẽ được phép chỉnh sửa/tạo báo giá lại.` : `${displayName(c)} sẽ không được tạo báo giá mới hoặc sửa dữ liệu quan trọng.`, action:() => patch(c.id,{isLocked:!c.isLocked})})}>{c.isLocked ? <Unlock size={14}/> : <Lock size={14}/>}</button>}<MoreHorizontal size={14} style={{opacity:.35}}/></div>
    </div>)}</div>{filtered.length === 0 && <div className="crm-empty"><Shield size={36}/><p>Không có khách hàng phù hợp bộ lọc hoặc quyền được phân.</p><button className="crm-btn crm-btn-outline" onClick={() => setFilters(emptyFilters)}>Xóa bộ lọc</button></div>}
  </div>;
}



