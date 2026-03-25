"use client";
import React, { useState, useMemo } from 'react';
import {
  Users, UserCircle, Search, Plus, Trash2, UserPlus, ChevronDown,
  ChevronRight, Building2, Phone, Mail, MapPin, X, Check, AlertCircle,
  Shield, Briefcase
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  sellerId: string | null; // null = chưa phân cho seller nào
  createdAt: string;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// ════════════════════════════════════════════════════════════
// MOCK DATA (sẽ thay bằng API sau)
// ════════════════════════════════════════════════════════════
const INITIAL_SELLERS: Seller[] = [
  { id: 'S1', name: 'Nguyễn Văn An',   email: 'an.nv@ltspricing.vn',   phone: '0901 234 567' },
  { id: 'S2', name: 'Trần Thị Bình',   email: 'binh.tt@ltspricing.vn', phone: '0912 345 678' },
  { id: 'S3', name: 'Lê Hoàng Cường',  email: 'cuong.lh@ltspricing.vn', phone: '0987 654 321' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'C01', name: 'Phan Văn Đức',    company: 'Công ty TNHH Đức Phát',       phone: '0909 111 222', email: 'duc@ducphat.com',   address: 'TP. Hồ Chí Minh', sellerId: 'S1', createdAt: '2025-01-10' },
  { id: 'C02', name: 'Lê Thị Giang',    company: 'Cty CP Giang Sơn Foods',      phone: '0908 333 444', email: 'giang@giangs.vn',   address: 'Bình Dương',      sellerId: 'S1', createdAt: '2025-02-05' },
  { id: 'C03', name: 'Trần Minh Hiếu',  company: 'Hiếu Long Packaging',         phone: '0901 555 666', email: 'hieu@hieulong.vn',  address: 'Đồng Nai',        sellerId: 'S2', createdAt: '2025-01-22' },
  { id: 'C04', name: 'Nguyễn Thị Kim',  company: 'Kim Ngân Trading',            phone: '0911 777 888', email: 'kim@kimngan.com',   address: 'Hà Nội',          sellerId: 'S2', createdAt: '2025-03-01' },
  { id: 'C05', name: 'Võ Quốc Linh',    company: 'DNTN Linh Vũ',               phone: '0933 999 000', email: 'linh@linhvu.vn',    address: 'Cần Thơ',         sellerId: 'S2', createdAt: '2025-03-15' },
  { id: 'C06', name: 'Phạm Thanh Mai',  company: 'Cty TNHH SX Thanh Mai',      phone: '0944 123 456', email: 'mai@thanhmai.vn',   address: 'Long An',         sellerId: 'S3', createdAt: '2025-02-20' },
  { id: 'C07', name: 'Bùi Đình Nam',    company: 'Siêu Thị Nam Bùi',           phone: '0955 234 567', email: 'nam@nambuist.com',  address: 'Bình Phước',      sellerId: 'S3', createdAt: '2025-03-10' },
  { id: 'C08', name: 'Đỗ Hải Oanh',    company: 'Oanh Hải Export Co.',         phone: '0966 345 678', email: 'oanh@oanhhai.vn',   address: 'Vũng Tàu',        sellerId: null, createdAt: '2025-03-20' },
  { id: 'C09', name: 'Huỳnh Văn Phú',   company: 'Phú Thịnh Agri',             phone: '0977 456 789', email: 'phu@phuthinh.com',  address: 'Tiền Giang',      sellerId: null, createdAt: '2025-03-22' },
  { id: 'C10', name: 'Cao Thị Quyên',   company: 'Quyên Cao Cosmetics',        phone: '0988 567 890', email: 'quyen@caocosm.vn',  address: 'Đà Nẵng',         sellerId: null, createdAt: '2025-03-25' },
];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
const AVATAR_COLORS = [
  '#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed','#dc2626','#0284c7'
];
const avatarColor = (str: string) => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name: string) => name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

/** Avatar circle */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      letterSpacing: '-0.5px',
    }}>
      {initials(name)}
    </div>
  );
}

/** Customer card (compact row) */
function CustomerRow({
  customer,
  sellers,
  onAssign,
  onUnassign,
  isAdmin,
  currentSellerId,
}: {
  customer: Customer;
  sellers: Seller[];
  onAssign?: (customerId: string, sellerId: string) => void;
  onUnassign?: (customerId: string) => void;
  isAdmin: boolean;
  currentSellerId?: string;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const seller = sellers.find(s => s.id === customer.sellerId);

  return (
    <div className="crm-customer-row">
      <Avatar name={customer.name} />
      <div className="crm-customer-main">
        <div className="crm-customer-name">{customer.name}</div>
        <div className="crm-customer-company">
          <Building2 size={11} /> {customer.company}
        </div>
      </div>
      <div className="crm-customer-contact">
        <span><Phone size={11} /> {customer.phone}</span>
        <span><Mail size={11} /> {customer.email}</span>
      </div>
      <div className="crm-customer-location">
        <MapPin size={11} /> {customer.address}
      </div>

      {isAdmin && (
        <div className="crm-customer-seller-badge">
          {seller ? (
            <span className="crm-badge crm-badge-seller">
              <Briefcase size={10} />
              {seller.name}
            </span>
          ) : (
            <span className="crm-badge crm-badge-unassigned">
              <AlertCircle size={10} />
              Chưa phân
            </span>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="crm-customer-actions" style={{ position: 'relative' }}>
          {customer.sellerId ? (
            <button
              className="crm-btn-icon crm-btn-danger"
              title="Thu hồi khỏi Seller"
              onClick={() => onUnassign?.(customer.id)}
            >
              <UserPlus size={14} />
            </button>
          ) : null}

          <div style={{ position: 'relative' }}>
            <button
              className="crm-btn-icon crm-btn-accent"
              title="Giao cho Seller"
              onClick={() => setAssignOpen(!assignOpen)}
            >
              <UserCircle size={14} />
            </button>
            {assignOpen && (
              <div className="crm-dropdown">
                <div className="crm-dropdown-title">Chọn Seller phụ trách</div>
                {sellers.map(s => (
                  <button
                    key={s.id}
                    className={`crm-dropdown-item ${customer.sellerId === s.id ? 'crm-dropdown-item--active' : ''}`}
                    onClick={() => { onAssign?.(customer.id, s.id); setAssignOpen(false); }}
                  >
                    <Avatar name={s.name} size={24} />
                    <span>{s.name}</span>
                    {customer.sellerId === s.id && <Check size={13} style={{ marginLeft: 'auto', color: '#4f46e5' }} />}
                  </button>
                ))}
                {customer.sellerId && (
                  <>
                    <div className="crm-dropdown-divider" />
                    <button
                      className="crm-dropdown-item crm-dropdown-item--danger"
                      onClick={() => { onUnassign?.(customer.id); setAssignOpen(false); }}
                    >
                      <X size={14} /> Thu hồi (bỏ Seller)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Seller card with expandable customer list */
function SellerCard({
  seller,
  customers,
  allCustomers,
  sellers,
  onAssign,
  onUnassign,
}: {
  seller: Seller;
  customers: Customer[];
  allCustomers: Customer[];
  sellers: Seller[];
  onAssign: (customerId: string, sellerId: string) => void;
  onUnassign: (customerId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const unassigned = allCustomers.filter(c => !c.sellerId);

  return (
    <div className="crm-seller-card">
      {/* Seller header */}
      <div className="crm-seller-header" onClick={() => setExpanded(!expanded)}>
        <Avatar name={seller.name} size={40} />
        <div className="crm-seller-info">
          <div className="crm-seller-name">{seller.name}</div>
          <div className="crm-seller-meta">
            <Mail size={11} /> {seller.email}
            <span style={{ margin: '0 6px' }}>·</span>
            <Phone size={11} /> {seller.phone}
          </div>
        </div>
        <div className="crm-seller-stats">
          <div className="crm-stat-bubble">{customers.length} KH</div>
        </div>
        <div className="crm-seller-chevron">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Customer list */}
      {expanded && (
        <div className="crm-seller-body">
          {customers.length === 0 ? (
            <div className="crm-empty-sub">Chưa có khách hàng nào được phân công.</div>
          ) : (
            customers.map(c => (
              <CustomerRow
                key={c.id}
                customer={c}
                sellers={sellers}
                onAssign={onAssign}
                onUnassign={onUnassign}
                isAdmin={true}
              />
            ))
          )}

          {/* Quick-assign unassigned customers */}
          {unassigned.length > 0 && (
            <div className="crm-quick-assign">
              <span className="crm-quick-assign-label">Thêm khách hàng chưa phân:</span>
              {unassigned.map(c => (
                <button
                  key={c.id}
                  className="crm-quick-assign-btn"
                  onClick={() => onAssign(c.id, seller.id)}
                  title={c.company}
                >
                  <Plus size={11} /> {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADD CUSTOMER MODAL
// ════════════════════════════════════════════════════════════
function AddCustomerModal({
  sellers,
  onAdd,
  onClose,
}: {
  sellers: Seller[];
  onAdd: (c: Omit<Customer, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '', company: '', phone: '', email: '', address: '', sellerId: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = 'Vui lòng nhập tên khách hàng';
    if (!form.company.trim()) e.company = 'Vui lòng nhập tên công ty';
    if (!form.phone.trim())   e.phone   = 'Vui lòng nhập số điện thoại';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) { onAdd(form); onClose(); }
  };

  const field = (
    label: string, key: keyof typeof form, placeholder: string,
    icon: React.ReactNode, required = false
  ) => (
    <div className="crm-modal-field">
      <label className="crm-modal-label">
        {icon} {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <input
        className={`crm-modal-input ${errors[key] ? 'crm-modal-input--error' : ''}`}
        placeholder={placeholder}
        value={form[key] as string || ''}
        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
      />
      {errors[key] && <div className="crm-field-error">{errors[key]}</div>}
    </div>
  );

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-header">
          <UserPlus size={20} style={{ color: '#4f46e5' }} />
          <h2 className="crm-modal-title">Thêm Khách Hàng Mới</h2>
          <button className="crm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="crm-modal-body">
          <div className="crm-modal-grid">
            {field('Tên khách hàng', 'name',    'Họ và tên đầy đủ',    <UserCircle size={13} />, true)}
            {field('Công ty',        'company',  'Tên công ty / DN',    <Building2  size={13} />, true)}
            {field('Điện thoại',     'phone',    '0xxx xxx xxx',        <Phone      size={13} />, true)}
            {field('Email',          'email',    'email@company.com',   <Mail       size={13} />)}
            {field('Địa chỉ',        'address',  'Tỉnh / Thành phố',   <MapPin     size={13} />)}
          </div>

          <div className="crm-modal-field">
            <label className="crm-modal-label"><Briefcase size={13} /> Phân công Seller</label>
            <select
              className="crm-modal-input"
              value={form.sellerId || ''}
              onChange={e => setForm(f => ({ ...f, sellerId: e.target.value || null }))}
            >
              <option value="">— Chưa phân công —</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="crm-modal-footer">
          <button className="crm-btn crm-btn-ghost" onClick={onClose}>Hủy</button>
          <button className="crm-btn crm-btn-primary" onClick={handleSubmit}>
            <Plus size={15} /> Thêm Khách Hàng
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
interface CustomerModuleProps {
  role: string;
  /** Seller ID của user đang đăng nhập (khi role = 'sale') */
  currentSellerId?: string;
}

export default function CustomerModule({ role, currentSellerId = 'S1' }: CustomerModuleProps) {
  const isAdmin = role === 'admin';

  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [sellers] = useState<Seller[]>(INITIAL_SELLERS);
  const [search, setSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'all' | 'by_seller'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Derived data ──
  const filteredCustomers = useMemo(() => {
    const base = isAdmin ? customers : customers.filter(c => c.sellerId === currentSellerId);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  }, [customers, search, isAdmin, currentSellerId]);

  const customersBySeller = useMemo(() =>
    sellers.map(s => ({
      seller: s,
      customers: customers.filter(c => c.sellerId === s.id),
    })),
    [sellers, customers]
  );

  const unassigned = useMemo(() => customers.filter(c => !c.sellerId), [customers]);

  // ── Actions ──
  const handleAssign = (customerId: string, sellerId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, sellerId } : c));
  };

  const handleUnassign = (customerId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, sellerId: null } : c));
  };

  const handleAddCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const newId = 'C' + String(customers.length + 1).padStart(2, '0');
    setCustomers(prev => [...prev, {
      ...data,
      id: newId,
      createdAt: new Date().toISOString().slice(0, 10),
    }]);
  };

  // ════════════════════ RENDER ════════════════════
  return (
    <div className="crm-root">
      {/* ── TOOLBAR ── */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm tên, công ty, số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="crm-search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="crm-toolbar-right">
          {/* Stats (admin only) */}
          {isAdmin && (
            <div className="crm-stats-bar">
              <div className="crm-stat"><span className="crm-stat-num">{customers.length}</span><span className="crm-stat-label">Tổng KH</span></div>
              <div className="crm-stat-divider" />
              <div className="crm-stat"><span className="crm-stat-num">{sellers.length}</span><span className="crm-stat-label">Seller</span></div>
              <div className="crm-stat-divider" />
              <div className="crm-stat crm-stat--warn"><span className="crm-stat-num">{unassigned.length}</span><span className="crm-stat-label">Chưa phân</span></div>
            </div>
          )}

          {isAdmin && (
            <button className="crm-btn crm-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Thêm Khách Hàng
            </button>
          )}
        </div>
      </div>

      {/* ── ADMIN TABS ── */}
      {isAdmin && (
        <div className="crm-admin-tabs">
          <button
            className={`crm-admin-tab ${adminTab === 'all' ? 'active' : ''}`}
            onClick={() => setAdminTab('all')}
          >
            <Users size={15} /> Tất cả Khách hàng
            <span className="crm-tab-badge">{filteredCustomers.length}</span>
          </button>
          <button
            className={`crm-admin-tab ${adminTab === 'by_seller' ? 'active' : ''}`}
            onClick={() => setAdminTab('by_seller')}
          >
            <Briefcase size={15} /> Theo Seller
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          VIEW: ALL CUSTOMERS (flat list)
      ───────────────────────────────────────────── */}
      {(adminTab === 'all' || !isAdmin) && (
        <div className="crm-list">
          {/* Role badge for seller view */}
          {!isAdmin && (
            <div className="crm-seller-view-banner">
              <Shield size={14} />
              Góc nhìn Seller · Hiển thị {filteredCustomers.length} khách hàng phụ trách của bạn
            </div>
          )}

          {filteredCustomers.length === 0 ? (
            <div className="crm-empty">
              <Users size={40} />
              <p>{search ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có khách hàng nào.'}</p>
            </div>
          ) : (
            <div className="crm-customer-list">
              {/* Header row */}
              <div className="crm-list-header">
                <span style={{ width: 36 }} />
                <span style={{ flex: 1 }}>Khách hàng</span>
                <span className="crm-col-contact">Liên hệ</span>
                <span className="crm-col-location">Khu vực</span>
                {isAdmin && <span className="crm-col-seller">Seller</span>}
                {isAdmin && <span className="crm-col-actions" />}
              </div>

              {filteredCustomers.map(c => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  sellers={sellers}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  isAdmin={isAdmin}
                  currentSellerId={currentSellerId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          VIEW: BY SELLER (accordion)
      ───────────────────────────────────────────── */}
      {isAdmin && adminTab === 'by_seller' && (
        <div className="crm-list crm-list--sellers">
          {customersBySeller.map(({ seller, customers: sellerCusts }) => (
            <SellerCard
              key={seller.id}
              seller={seller}
              customers={sellerCusts}
              allCustomers={customers}
              sellers={sellers}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
            />
          ))}

          {/* Unassigned pool */}
          {unassigned.length > 0 && (
            <div className="crm-seller-card crm-seller-card--unassigned">
              <div className="crm-seller-header" style={{ cursor: 'default' }}>
                <div className="crm-unassigned-icon"><AlertCircle size={20} /></div>
                <div className="crm-seller-info">
                  <div className="crm-seller-name" style={{ color: '#d97706' }}>Chưa phân công</div>
                  <div className="crm-seller-meta">Các khách hàng chưa có Seller phụ trách</div>
                </div>
                <div className="crm-seller-stats">
                  <div className="crm-stat-bubble crm-stat-bubble--warn">{unassigned.length} KH</div>
                </div>
              </div>
              <div className="crm-seller-body">
                {unassigned.map(c => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    sellers={sellers}
                    onAssign={handleAssign}
                    onUnassign={handleUnassign}
                    isAdmin={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      {showAddModal && (
        <AddCustomerModal
          sellers={sellers}
          onAdd={handleAddCustomer}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
