"use client";
import React, { useState } from 'react';
import {
  UserCircle, Mail, Phone, Plus, Trash2, X, Check,
  Users, TrendingUp, Briefcase, Search, Edit2, Save
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

// Shared mock data (in real app, these come from API/store)
export const MOCK_SELLERS: Seller[] = [
  { id: 'S1', name: 'Nguyễn Văn An',  email: 'an.nv@ltspricing.vn',    phone: '0901 234 567', joinDate: '2024-01-15', status: 'active' },
  { id: 'S2', name: 'Trần Thị Bình',  email: 'binh.tt@ltspricing.vn',  phone: '0912 345 678', joinDate: '2024-03-20', status: 'active' },
  { id: 'S3', name: 'Lê Hoàng Cường', email: 'cuong.lh@ltspricing.vn', phone: '0987 654 321', joinDate: '2024-06-01', status: 'active' },
];

// Number of customers each seller "owns" (mock)
const SELLER_CUSTOMER_COUNT: Record<string, number> = {
  S1: 2, S2: 3, S3: 2,
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
const avatarColor = (str: string) => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name: string) =>
  name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADD SELLER MODAL
// ════════════════════════════════════════════════════════════
function AddSellerModal({
  onAdd, onClose,
}: {
  onAdd: (s: Omit<Seller, 'id' | 'joinDate' | 'status'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = 'Vui lòng nhập tên';
    if (!form.email.trim()) e.email = 'Vui lòng nhập email';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập SĐT';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) { onAdd(form); onClose(); } };

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-header">
          <UserCircle size={20} style={{ color: '#4f46e5' }} />
          <h2 className="crm-modal-title">Thêm Seller Mới</h2>
          <button className="crm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="crm-modal-body">
          {([ 
            ['Họ và tên *', 'name', 'Nguyễn Văn X'],
            ['Email *',     'email', 'email@company.com'],
            ['Điện thoại *','phone', '09xx xxx xxx'],
          ] as [string, keyof typeof form, string][]).map(([label, key, placeholder]) => (
            <div className="crm-modal-field" key={key} style={{ marginBottom: 12 }}>
              <label className="crm-modal-label">{label}</label>
              <input
                className={`crm-modal-input${errors[key] ? ' crm-modal-input--error' : ''}`}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
              />
              {errors[key] && <div className="crm-field-error">{errors[key]}</div>}
            </div>
          ))}
        </div>
        <div className="crm-modal-footer">
          <button className="crm-btn crm-btn-ghost" onClick={onClose}>Hủy</button>
          <button className="crm-btn crm-btn-primary" onClick={handleSubmit}>
            <Plus size={15} /> Thêm Seller
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SELLER CARD
// ════════════════════════════════════════════════════════════
function SellerCard({
  seller,
  customerCount,
  onDelete,
  onUpdateStatus,
}: {
  seller: Seller;
  customerCount: number;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'active' | 'inactive') => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="slr-card">
      <div className="slr-card-left">
        <Avatar name={seller.name} size={52} />
        <div className="slr-info">
          <div className="slr-name">{seller.name}</div>
          <div className="slr-meta">
            <span><Mail size={12} /> {seller.email}</span>
            <span><Phone size={12} /> {seller.phone}</span>
          </div>
          <div className="slr-join">Tham gia: {new Date(seller.joinDate).toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <div className="slr-card-stats">
        <div className="slr-stat">
          <div className="slr-stat-num">{customerCount}</div>
          <div className="slr-stat-label">Khách hàng</div>
        </div>
        <div className="slr-stat">
          <div className="slr-stat-num" style={{ fontSize: '0.9rem' }}>
            {seller.status === 'active'
              ? <span style={{ color: 'var(--green)' }}>● Đang HĐ</span>
              : <span style={{ color: 'var(--red)' }}>● Ngừng HĐ</span>}
          </div>
          <div className="slr-stat-label">Trạng thái</div>
        </div>
      </div>

      <div className="slr-card-actions">
        <button
          className={`crm-btn ${seller.status === 'active' ? 'crm-btn-ghost' : 'crm-btn-primary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          onClick={() => onUpdateStatus(seller.id, seller.status === 'active' ? 'inactive' : 'active')}
        >
          {seller.status === 'active' ? 'Ngừng hoạt động' : '✓ Kích hoạt lại'}
        </button>

        {!confirmDelete ? (
          <button
            className="crm-btn-icon crm-btn-danger"
            title="Xóa seller"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <div className="slr-confirm-delete">
            <span>Xác nhận xóa?</span>
            <button className="crm-btn" style={{ background: 'var(--red)', color: '#fff', padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => onDelete(seller.id)}>
              Xóa
            </button>
            <button className="crm-btn crm-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => setConfirmDelete(false)}>
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════
export default function SellerModule() {
  const [sellers, setSellers] = useState<Seller[]>(MOCK_SELLERS);
  const [customerCounts] = useState<Record<string, number>>(SELLER_CUSTOMER_COUNT);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = sellers.filter(s => {
    const matchSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAdd = (data: Omit<Seller, 'id' | 'joinDate' | 'status'>) => {
    const newId = 'S' + (sellers.length + 1);
    setSellers(prev => [...prev, {
      ...data,
      id: newId,
      joinDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    }]);
  };

  const handleDelete = (id: string) => {
    setSellers(prev => prev.filter(s => s.id !== id));
  };

  const handleStatus = (id: string, status: 'active' | 'inactive') => {
    setSellers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const totalCustomers = Object.values(customerCounts).reduce((a, b) => a + b, 0);
  const activeSellers = sellers.filter(s => s.status === 'active').length;

  return (
    <div className="crm-root">
      {/* Toolbar */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={15} className="crm-search-icon" />
          <input
            className="crm-search-input"
            placeholder="Tìm tên, email, số điện thoại..."
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
          {/* Summary stats */}
          <div className="crm-stats-bar">
            <div className="crm-stat">
              <span className="crm-stat-num">{sellers.length}</span>
              <span className="crm-stat-label">Tổng Seller</span>
            </div>
            <div className="crm-stat-divider" />
            <div className="crm-stat">
              <span className="crm-stat-num" style={{ color: 'var(--green)' }}>{activeSellers}</span>
              <span className="crm-stat-label">Đang HĐ</span>
            </div>
            <div className="crm-stat-divider" />
            <div className="crm-stat">
              <span className="crm-stat-num">{totalCustomers}</span>
              <span className="crm-stat-label">Tổng KH</span>
            </div>
          </div>

          {/* Filter */}
          <div className="toolbar-group">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                className={`toolbar-btn ${filterStatus === s ? 'active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === 'all' ? 'Tất cả' : s === 'active' ? '● Đang HĐ' : '○ Ngừng HĐ'}
              </button>
            ))}
          </div>

          <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Thêm Seller
          </button>
        </div>
      </div>

      {/* List */}
      <div className="crm-list">
        {filtered.length === 0 ? (
          <div className="crm-empty">
            <Briefcase size={40} />
            <p>Không tìm thấy seller nào.</p>
          </div>
        ) : (
          <div className="slr-grid">
            {filtered.map(s => (
              <SellerCard
                key={s.id}
                seller={s}
                customerCount={customerCounts[s.id] ?? 0}
                onDelete={handleDelete}
                onUpdateStatus={handleStatus}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddSellerModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
