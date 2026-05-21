"use client";
import React, { useState } from 'react';
import {
  UserCircle, Mail, Phone, Plus, Trash2, X, Check,
  Users, TrendingUp, Briefcase, Search, Edit2, Save
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
export interface NhanVienBan {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

// Shared mock data (in real app, these come from API/store)
export const NHAN_VIEN_BAN_MAU: NhanVienBan[] = [
  { id: 'S1', name: 'Nguyễn Văn An',  email: 'an.nv@ltspricing.vn',    phone: '0901 234 567', joinDate: '2024-01-15', status: 'active' },
  { id: 'S2', name: 'Trần Thị Bình',  email: 'binh.tt@ltspricing.vn',  phone: '0912 345 678', joinDate: '2024-03-20', status: 'active' },
  { id: 'S3', name: 'Lê Hoàng Cường', email: 'cuong.lh@ltspricing.vn', phone: '0987 654 321', joinDate: '2024-06-01', status: 'active' },
];

// Number of customers each nhanVien "owns" (mock)
const SO_KHACH_THEO_NHAN_VIEN: Record<string, number> = {
  S1: 2, S2: 3, S3: 2,
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
const MAU_AVATAR = ['#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
const layMauAnhDaiDien = (str: string) => MAU_AVATAR[str.charCodeAt(0) % MAU_AVATAR.length];
const layChuCaiDau = (name: string) =>
  name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

function AnhDaiDien({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: layMauAnhDaiDien(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>
      {layChuCaiDau(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADD SELLER MODAL
// ════════════════════════════════════════════════════════════
function ModalThemNhanVienBan({
  onAdd, onClose,
}: {
  onAdd: (s: Omit<NhanVienBan, 'id' | 'joinDate' | 'status'>) => void;
  onClose: () => void;
}) {
  const [bieuMau, datBieuMau] = useState({ name: '', email: '', phone: '' });
  const [loi, datLoi] = useState<Record<string, string>>({});

  const kiemTra = () => {
    const e: Record<string, string> = {};
    if (!bieuMau.name.trim())  e.name  = 'Vui lòng nhập tên';
    if (!bieuMau.email.trim()) e.email = 'Vui lòng nhập email';
    if (!bieuMau.phone.trim()) e.phone = 'Vui lòng nhập SĐT';
    datLoi(e);
    return Object.keys(e).length === 0;
  };

  const xuLyGui = () => { if (kiemTra()) { onAdd(bieuMau); onClose(); } };

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-header">
          <UserCircle size={20} style={{ color: '#4f46e5' }} />
          <h2 className="crm-modal-title">Thêm nhân viên Mới</h2>
          <button className="crm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="crm-modal-body">
          {([ 
            ['Họ và tên *', 'name', 'Nguyễn Văn X'],
            ['Email *',     'email', 'email@company.com'],
            ['Điện thoại *','phone', '09xx xxx xxx'],
          ] as [string, keyof typeof bieuMau, string][]).map(([label, key, placeholder]) => (
            <div className="crm-modal-field" key={key} style={{ marginBottom: 12 }}>
              <label className="crm-modal-label">{label}</label>
              <input
                className={`crm-modal-input${loi[key] ? ' crm-modal-input--error' : ''}`}
                placeholder={placeholder}
                value={bieuMau[key]}
                onChange={e => { datBieuMau(f => ({ ...f, [key]: e.target.value })); datLoi(er => ({ ...er, [key]: '' })); }}
              />
              {loi[key] && <div className="crm-field-error">{loi[key]}</div>}
            </div>
          ))}
        </div>
        <div className="crm-modal-footer">
          <button className="crm-btn crm-btn-ghost" onClick={onClose}>Hủy</button>
          <button className="crm-btn crm-btn-primary" onClick={xuLyGui}>
            <Plus size={15} /> Thêm nhân viên
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SELLER CARD
// ════════════════════════════════════════════════════════════
function TheNhanVien({
  nhanVien,
  soKhach,
  khiXoa,
  khiCapNhatTrangThai,
}: {
  nhanVien: NhanVienBan;
  soKhach: number;
  khiXoa: (id: string) => void;
  khiCapNhatTrangThai: (id: string, status: 'active' | 'inactive') => void;
}) {
  const [xacNhanXoa, datXacNhanXoa] = useState(false);

  return (
    <div className="slr-card">
      <div className="slr-card-left">
        <AnhDaiDien name={nhanVien.name} size={52} />
        <div className="slr-info">
          <div className="slr-name">{nhanVien.name}</div>
          <div className="slr-meta">
            <span><Mail size={12} /> {nhanVien.email}</span>
            <span><Phone size={12} /> {nhanVien.phone}</span>
          </div>
          <div className="slr-join">Tham gia: {new Date(nhanVien.joinDate).toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <div className="slr-card-stats">
        <div className="slr-stat">
          <div className="slr-stat-num">{soKhach}</div>
          <div className="slr-stat-label">Khách hàng</div>
        </div>
        <div className="slr-stat">
          <div className="slr-stat-num" style={{ fontSize: '0.9rem' }}>
            {nhanVien.status === 'active'
              ? <span style={{ color: 'var(--green)' }}>● Đang HĐ</span>
              : <span style={{ color: 'var(--red)' }}>● Ngừng HĐ</span>}
          </div>
          <div className="slr-stat-label">Trạng thái</div>
        </div>
      </div>

      <div className="slr-card-actions">
        <button
          className={`crm-btn ${nhanVien.status === 'active' ? 'crm-btn-ghost' : 'crm-btn-primary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          onClick={() => khiCapNhatTrangThai(nhanVien.id, nhanVien.status === 'active' ? 'inactive' : 'active')}
        >
          {nhanVien.status === 'active' ? 'Ngừng hoạt động' : '✓ Kích hoạt lại'}
        </button>

        {!xacNhanXoa ? (
          <button
            className="crm-btn-icon crm-btn-danger"
            title="Xóa nhanVien"
            onClick={() => datXacNhanXoa(true)}
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <div className="slr-confirm-delete">
            <span>Xác nhận xóa?</span>
            <button className="crm-btn" style={{ background: 'var(--red)', color: '#fff', padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => khiXoa(nhanVien.id)}>
              Xóa
            </button>
            <button className="crm-btn crm-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => datXacNhanXoa(false)}>
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
export default function ModuleNhanVienBan() {
  const [danhSachNhanVien, datDanhSachNhanVien] = useState<NhanVienBan[]>(NHAN_VIEN_BAN_MAU);
  const [soKhachTheoNhanVien] = useState<Record<string, number>>(SO_KHACH_THEO_NHAN_VIEN);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = danhSachNhanVien.filter(s => {
    const matchSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const xuLyThem = (data: Omit<NhanVienBan, 'id' | 'joinDate' | 'status'>) => {
    const newId = 'S' + (danhSachNhanVien.length + 1);
    datDanhSachNhanVien(prev => [...prev, {
      ...data,
      id: newId,
      joinDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    }]);
  };

  const xuLyXoa = (id: string) => {
    datDanhSachNhanVien(prev => prev.filter(s => s.id !== id));
  };

  const xuLyTrangThai = (id: string, status: 'active' | 'inactive') => {
    datDanhSachNhanVien(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const tongSoKhach = Object.values(soKhachTheoNhanVien).reduce((a, b) => a + b, 0);
  const soNhanVienDangHoatDong = danhSachNhanVien.filter(s => s.status === 'active').length;

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
              <span className="crm-stat-num">{danhSachNhanVien.length}</span>
              <span className="crm-stat-label">Tổng nh?n vi?n</span>
            </div>
            <div className="crm-stat-divider" />
            <div className="crm-stat">
              <span className="crm-stat-num" style={{ color: 'var(--green)' }}>{soNhanVienDangHoatDong}</span>
              <span className="crm-stat-label">Đang HĐ</span>
            </div>
            <div className="crm-stat-divider" />
            <div className="crm-stat">
              <span className="crm-stat-num">{tongSoKhach}</span>
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
            <Plus size={15} /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* List */}
      <div className="crm-list">
        {filtered.length === 0 ? (
          <div className="crm-empty">
            <Briefcase size={40} />
            <p>Không tìm thấy nhanVien nào.</p>
          </div>
        ) : (
          <div className="slr-grid">
            {filtered.map(s => (
              <TheNhanVien
                key={s.id}
                nhanVien={s}
                soKhach={soKhachTheoNhanVien[s.id] ?? 0}
                khiXoa={xuLyXoa}
                khiCapNhatTrangThai={xuLyTrangThai}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && <ModalThemNhanVienBan onAdd={xuLyThem} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
