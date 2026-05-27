'use client';
// ─────────────────────────────────────────────────────────────────────────────
// ModulePhanQuyen.tsx
// Phân quyền theo policy-based model của service-lts (NestJS + Prisma).
// 11 policies, role templates, user policies. Master-detail layout.
// Sử dụng shared auth store thay vì inline auth state.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Shield, Lock,
  ChevronRight, Check, X, Trash2, Pencil, UserCircle2, Users2,
  ScrollText, Sparkles, FileKey2, ListChecks, Filter,
} from 'lucide-react';
import './phan-quyen.css';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import {
  type PolicyCode,
  type Policy,
  type TaiKhoanApi,
  type TaiKhoan,
  type NhomQuyen,
  POLICY_CATALOG,
  layTaiKhoanService,
  taoTaiKhoanService,
  kichHoatTaiKhoanService,
  voHieuTaiKhoanService,
  capNhatBaoVeService,
  capQuyenService,
  thuHoiQuyenService,
  luuNhomQuyenService,
  xoaNhomQuyenService,
  layNhomQuyenService,
  chuyenTaiKhoanApi,
} from '../lib/api/service-lts';

// ═════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA  — chỉ dùng làm placeholder khi đang tải dữ liệu từ service-lts
// ═════════════════════════════════════════════════════════════════════════════
const TAI_KHOAN_MAU: TaiKhoan[] = [
  { id: '1', account: 'admin',       fullName: 'Quản trị hệ thống', isActive: true,  isProtected: true,
    policies: POLICY_CATALOG.map(p => p.code), createdAt: '2025-08-12', lastLogin: '2026-05-25 08:42' },
  { id: '2', account: 'thu.lts',     fullName: 'Lê Thị Thu',         isActive: true,  isProtected: false,
    policies: ['ACCOUNT_READ','ACCOUNT_CREATE','ROLE_READ','USER_POLICY_GRANT'], createdAt: '2025-09-03', lastLogin: '2026-05-24 17:21' },
  { id: '3', account: 'nguyen.an',   fullName: 'Nguyễn Văn An',      isActive: true,  isProtected: false,
    policies: ['ACCOUNT_READ','ROLE_READ'], createdAt: '2025-10-19', lastLogin: '2026-05-25 09:05' },
  { id: '4', account: 'phuong.kt',   fullName: 'Trần Thanh Phương',  isActive: false, isProtected: false,
    policies: ['ACCOUNT_READ'], createdAt: '2025-11-08' },
  { id: '5', account: 'quan.bd',     fullName: 'Lý Hoài Quân',       isActive: true,  isProtected: false,
    policies: ['ACCOUNT_READ','ROLE_READ','ROLE_CREATE','ROLE_UPDATE'], createdAt: '2026-01-22', lastLogin: '2026-05-23 14:11' },
  { id: '6', account: 'mai.nv',      fullName: 'Phạm Hương Mai',     isActive: true,  isProtected: false,
    policies: ['ACCOUNT_READ'], createdAt: '2026-02-17', lastLogin: '2026-05-22 11:00' },
];

const NHOM_QUYEN_MAU: NhomQuyen[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Quản trị tối cao',
    description: 'Toàn quyền hệ thống — chỉ dành cho 1–2 tài khoản gốc.',
    policies: POLICY_CATALOG.map(p => p.code),
    granterName: 'Hệ thống',
    updatedAt: '2025-08-12',
  },
  {
    code: 'HR_MANAGER',
    name: 'Quản lý nhân sự',
    description: 'Tạo & quản lý tài khoản nhân viên, không động đến cấu hình quyền.',
    policies: ['ACCOUNT_READ','ACCOUNT_CREATE','ACCOUNT_ACTIVATE','ACCOUNT_DEACTIVATE'],
    granterName: 'Nguyễn Văn An',
    updatedAt: '2026-03-04',
  },
  {
    code: 'ROLE_DESIGNER',
    name: 'Thiết kế nhóm quyền',
    description: 'Tạo & sửa template nhóm quyền, không gán cho user.',
    policies: ['ROLE_READ','ROLE_CREATE','ROLE_UPDATE'],
    granterName: 'Lê Thị Thu',
    updatedAt: '2026-04-18',
  },
  {
    code: 'AUDITOR',
    name: 'Kiểm toán nội bộ',
    description: 'Chỉ đọc — phục vụ kiểm tra phân quyền & tài khoản.',
    policies: ['ACCOUNT_READ','ROLE_READ'],
    granterName: 'Lê Thị Thu',
    updatedAt: '2026-05-09',
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// 3. SHARED HELPERS
// ═════════════════════════════════════════════════════════════════════════════
const layChuCaiDau = (s: string) =>
  s.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase();

const MAU_AVATAR = ['#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed','#0ea5e9','#65a30d'];
const layMauAvatar = (s: string) => MAU_AVATAR[s.charCodeAt(0) % MAU_AVATAR.length];

const dinhDangNgay = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function tenPolicy(code: PolicyCode): string {
  return POLICY_CATALOG.find(p => p.code === code)?.ten ?? code;
}

function moTaPolicy(code: PolicyCode): string {
  return POLICY_CATALOG.find(p => p.code === code)?.moTa ?? code;
}

function mauRuiRo(ruiRo: Policy['rui_ro']): string {
  if (ruiRo === 'cao') return 'Rủi ro cao';
  if (ruiRo === 'trung') return 'Cần kiểm soát';
  return 'An toàn';
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. POLICY CHIP — hiển thị tên tiếng Việt, code backend chỉ giữ trong tooltip
// ═════════════════════════════════════════════════════════════════════════════
function mauNhom(nhom: Policy['nhom']): string {
  if (nhom === 'Tài khoản')  return 'pq-chip--account';
  if (nhom === 'Nhóm quyền') return 'pq-chip--role';
  return 'pq-chip--grant';
}

function PolicyChip({ code, onRemove, dense = false }: { code: PolicyCode; onRemove?: () => void; dense?: boolean }) {
  const policy = POLICY_CATALOG.find(p => p.code === code);
  if (!policy) return null;
  return (
    <span className={`pq-chip ${mauNhom(policy.nhom)} ${dense ? 'pq-chip--dense' : ''}`} title={`${policy.ten} — ${policy.moTa}`}>
      <span className="pq-chip__name">{policy.ten}</span>
      {onRemove && (
        <button className="pq-chip__x" onClick={onRemove} aria-label={`Bỏ ${code}`}>
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. USER ROW
// ═════════════════════════════════════════════════════════════════════════════
function HangTaiKhoan({ user, daChon, onClick }: { user: TaiKhoan; daChon: boolean; onClick: () => void }) {
  return (
    <button className={`pq-row ${daChon ? 'pq-row--active' : ''}`} onClick={onClick}>
      <div className="pq-row__avatar" style={{ background: layMauAvatar(user.fullName) }}>
        {layChuCaiDau(user.fullName)}
      </div>
      <div className="pq-row__main">
        <div className="pq-row__name">
          {user.fullName}
          {user.isProtected && (
            <span className="pq-row__lock" title="Tài khoản được bảo vệ">
              <Lock size={11} />
            </span>
          )}
        </div>
        <div className="pq-row__account">@{user.account}</div>
      </div>
      <div className="pq-row__meta">
        <span className={`pq-dot ${user.isActive ? 'pq-dot--on' : 'pq-dot--off'}`} />
        <span className="pq-row__count">
          {user.policies.length}<span className="pq-row__count-sub">/{POLICY_CATALOG.length}</span>
        </span>
      </div>
      <ChevronRight size={15} className="pq-row__chev" />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. INSPECTOR — chi tiết tài khoản + cấp/thu hồi policy
// ═════════════════════════════════════════════════════════════════════════════
function InspectorTaiKhoan({
  user,
  onTogglePolicy,
  onApplyTemplate,
  onToggleActive,
  onToggleProtected,
  templates,
  coQuyenPhanQuyen,
}: {
  user?: TaiKhoan;
  onTogglePolicy: (code: PolicyCode) => void;
  onApplyTemplate: (template: NhomQuyen) => void;
  onToggleActive: () => void;
  onToggleProtected: () => void;
  templates: NhomQuyen[];
  coQuyenPhanQuyen: boolean;
}) {
  const [tab, setTab] = useState<'policy' | 'template'>('policy');
  const [tuKhoa, setTuKhoa] = useState('');

  if (!user) {
    return (
      <aside className="pq-inspector pq-inspector--empty">
        <div className="pq-empty">Chưa có tài khoản để hiển thị. Hãy bấm “Thêm” để tạo tài khoản mới.</div>
      </aside>
    );
  }

  const danhSachLoc = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase();
    if (!k) return POLICY_CATALOG;
    return POLICY_CATALOG.filter(p =>
      p.code.toLowerCase().includes(k) ||
      p.ten.toLowerCase().includes(k) ||
      p.nhom.toLowerCase().includes(k),
    );
  }, [tuKhoa]);

  const nhomGom = useMemo(() => {
    const map: Record<string, Policy[]> = {};
    danhSachLoc.forEach(p => { (map[p.nhom] ||= []).push(p); });
    return map;
  }, [danhSachLoc]);

  return (
    <aside className="pq-inspector">
      {/* Header */}
      <div className="pq-inspector__head">
        <div className="pq-inspector__avatar" style={{ background: layMauAvatar(user.fullName) }}>
          {layChuCaiDau(user.fullName)}
        </div>
        <div className="pq-inspector__title">
          <div className="pq-inspector__name">
            {user.fullName}
            {user.isProtected && (
              <span className="pq-badge pq-badge--lock">
                <Lock size={11} /> Bảo vệ
              </span>
            )}
          </div>
          <div className="pq-inspector__account">
            <span className="pq-mono">@{user.account}</span>
            <span className="pq-dot-sep">·</span>
            <span className={user.isActive ? 'pq-state--on' : 'pq-state--off'}>
              {user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
            </span>
          </div>
        </div>
        <div className="pq-inspector__actions">
          <button className="pq-btn pq-btn--ghost" title={user.isActive ? 'Vô hiệu tài khoản' : 'Kích hoạt tài khoản'} onClick={onToggleActive}>
            <UserCircle2 size={14} /> {user.isActive ? 'Vô hiệu' : 'Kích hoạt'}
          </button>
          <button className="pq-btn pq-btn--ghost" title={user.isProtected ? 'Tắt bảo vệ tài khoản' : 'Bật bảo vệ tài khoản'} onClick={onToggleProtected}>
            <Lock size={14} /> {user.isProtected ? 'Bỏ bảo vệ' : 'Bảo vệ'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="pq-stats">
        <div className="pq-stat">
          <div className="pq-stat__num">{user.policies.length}</div>
          <div className="pq-stat__lbl">Quyền đã cấp</div>
        </div>
        <div className="pq-stat">
          <div className="pq-stat__num">{POLICY_CATALOG.length - user.policies.length}</div>
          <div className="pq-stat__lbl">Còn trống</div>
        </div>
        <div className="pq-stat">
          <div className="pq-stat__num">{dinhDangNgay(user.createdAt)}</div>
          <div className="pq-stat__lbl">Tạo lúc</div>
        </div>
        <div className="pq-stat">
          <div className="pq-stat__num pq-stat__num--mono">{user.lastLogin?.split(' ')[1] ?? '—'}</div>
          <div className="pq-stat__lbl">Đăng nhập</div>
        </div>
      </div>

      {/* Banner tài khoản dừng hoạt động */}
      {!user.isActive && (
        <div className="pq-banner pq-banner--inactive">
          Tài khoản này đã dừng hoạt động. Không thể thực hiện thao tác phân quyền.
        </div>
      )}

      {/* Banner thiếu quyền phân quyền */}
      {user.isActive && !coQuyenPhanQuyen && (
        <div className="pq-banner pq-banner--warn">
          Bạn cần có cả quyền <b>Cấp quyền cho user</b> và <b>Thu hồi quyền user</b> để thao tác phân quyền.
        </div>
      )}

      {/* Tabs — chỉ hiển thị khi tài khoản active và có đủ quyền */}
      {user.isActive && coQuyenPhanQuyen && (
      <div className="pq-inspector__tabs">
        <button className={`pq-tab ${tab === 'policy' ? 'pq-tab--active' : ''}`} onClick={() => setTab('policy')}>
          <ListChecks size={14} /> Quyền chi tiết
        </button>
        <button className={`pq-tab ${tab === 'template' ? 'pq-tab--active' : ''}`} onClick={() => setTab('template')}>
          <Sparkles size={14} /> Áp template
        </button>
      </div>
      )}

      {/* Body */}
      {user.isActive && coQuyenPhanQuyen && tab === 'policy' && (
        <div className="pq-inspector__body">
          <div className="pq-search">
            <Search size={14} />
            <input
              placeholder="Tìm policy theo mã, tên hoặc nhóm…"
              value={tuKhoa}
              onChange={e => setTuKhoa(e.target.value)}
            />
            {tuKhoa && (
              <button className="pq-search__clear" onClick={() => setTuKhoa('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {Object.entries(nhomGom).map(([nhom, ds]) => (
            <div key={nhom} className="pq-policy-group">
              <div className="pq-policy-group__head">
                <span className="pq-policy-group__name">{nhom}</span>
                <span className="pq-policy-group__count">
                  {ds.filter(p => user.policies.includes(p.code)).length}/{ds.length}
                </span>
              </div>
              <div className="pq-policy-list">
                {ds.map(policy => {
                  const granted = user.policies.includes(policy.code);
                  return (
                    <label key={policy.code} className={`pq-policy ${granted ? 'pq-policy--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={granted}
                        onChange={() => onTogglePolicy(policy.code)}
                      />
                      <span className="pq-policy__check"><Check size={12} strokeWidth={3.5} /></span>
                      <div className="pq-policy__body">
                        <div className="pq-policy__top">
                          <span className="pq-policy__code">{policy.ten}</span>
                          <span className={`pq-risk pq-risk--${policy.rui_ro}`}>
                            {mauRuiRo(policy.rui_ro)}
                          </span>
                        </div>
                        <div className="pq-policy__name">{policy.ten}</div>
                        <div className="pq-policy__desc">{policy.moTa}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {user.isActive && coQuyenPhanQuyen && tab === 'template' && (
        <div className="pq-inspector__body">
          <p className="pq-hint">
            Áp template sẽ <b>thêm</b> các policy chưa có trong template vào tài khoản. Không tự động bỏ quyền hiện có.
          </p>
          {templates.map(tpl => {
            const trungLap = tpl.policies.filter(p => user.policies.includes(p)).length;
            return (
              <div key={tpl.code} className="pq-template-row">
                <div className="pq-template-row__icon"><FileKey2 size={18} /></div>
                <div className="pq-template-row__body">
                  <div className="pq-template-row__name">
                    {tpl.name}
                    <span className="pq-template-row__code">{tpl.policies.length} quyền</span>
                  </div>
                  <div className="pq-template-row__desc">{tpl.description}</div>
                  <div className="pq-template-row__progress">
                    <div className="pq-progress">
                      <div
                        className="pq-progress__bar"
                        style={{ width: `${(trungLap / tpl.policies.length) * 100}%` }}
                      />
                    </div>
                    <span className="pq-template-row__count">
                      {trungLap}/{tpl.policies.length} đã có
                    </span>
                  </div>
                </div>
                <button className="pq-btn pq-btn--primary" onClick={() => onApplyTemplate(tpl)}>
                  Áp
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. ROLE CARDS — view "Nhóm quyền"
// ═════════════════════════════════════════════════════════════════════════════
function ViewNhomQuyen({
  roles,
  onCreateRole,
  onDeleteRole,
}: {
  roles: NhomQuyen[];
  onCreateRole: (role: NhomQuyen) => void;
  onDeleteRole: (role: NhomQuyen) => void;
}) {
  const [moForm, setMoForm] = useState(false);
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const [chon, setChon] = useState<PolicyCode[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ten.trim() || !chon.length) return;
    const code = ten.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    onCreateRole({ code, name: ten.trim(), description: moTa.trim() || 'Nhóm quyền tùy chỉnh', policies: chon, updatedAt: new Date().toISOString() });
    setTen('');
    setMoTa('');
    setChon([]);
    setMoForm(false);
  };

  const togglePolicy = (code: PolicyCode) => {
    setChon(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  return (
    <div className="pq-role-page">
      {moForm && (
        <form className="pq-role-form" onSubmit={submit}>
          <div className="pq-role-form__grid">
            <label>
              <span>Tên nhóm quyền</span>
              <input value={ten} onChange={e => setTen(e.target.value)} placeholder="Ví dụ: Quản lý tài khoản" required />
            </label>
            <label>
              <span>Mô tả</span>
              <input value={moTa} onChange={e => setMoTa(e.target.value)} placeholder="Mục đích sử dụng nhóm quyền" />
            </label>
          </div>
          <div className="pq-role-form__policies">
            {POLICY_CATALOG.map(policy => (
              <label key={policy.code} className={`pq-role-form__policy ${chon.includes(policy.code) ? 'pq-role-form__policy--on' : ''}`}>
                <input type="checkbox" checked={chon.includes(policy.code)} onChange={() => togglePolicy(policy.code)} />
                <span>{policy.ten}</span>
              </label>
            ))}
          </div>
          <div className="pq-role-form__actions">
            <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMoForm(false)}>Hủy</button>
            <button type="submit" className="pq-btn pq-btn--primary">Lưu nhóm quyền</button>
          </div>
        </form>
      )}

      <div className="pq-role-grid">
      {/* Card tạo mới */}
      <button className="pq-role-card pq-role-card--new" onClick={() => setMoForm(true)}>
        <div className="pq-role-card__plus"><Plus size={28} strokeWidth={2.5} /></div>
        <div className="pq-role-card__new-text">
          <div className="pq-role-card__new-title">Tạo nhóm quyền mới</div>
          <div className="pq-role-card__new-sub">Gom các policy thành 1 template để cấp nhanh</div>
        </div>
      </button>

      {roles.map(role => (
        <article key={role.code} className="pq-role-card">
          <header className="pq-role-card__head">
            <div className="pq-role-card__icon">
              <Shield size={18} />
            </div>
            <div className="pq-role-card__title">
              <h4>{role.name}</h4>
              <span className="pq-role-card__code">{role.policies.length} quyền trong nhóm</span>
            </div>
            <button className="pq-icon-btn" title="Sửa" onClick={() => {
              setTen(role.name);
              setMoTa(role.description);
              setChon(role.policies);
              setMoForm(true);
            }}><Pencil size={14} /></button>
            <button className="pq-icon-btn pq-icon-btn--danger" title="Xóa" onClick={() => onDeleteRole(role)}><Trash2 size={14} /></button>
          </header>

          <p className="pq-role-card__desc">{role.description}</p>

          <div className="pq-role-card__chips">
            {role.policies.slice(0, 6).map(c => <PolicyChip key={c} code={c} dense />)}
            {role.policies.length > 6 && (
              <span className="pq-chip pq-chip--more">+{role.policies.length - 6}</span>
            )}
          </div>

          <footer className="pq-role-card__foot">
            <span className="pq-role-card__meta">
              <Users2 size={12} /> {role.policies.length} quyền
            </span>
            <span className="pq-role-card__meta">
              <ScrollText size={12} /> Cập nhật {dinhDangNgay(role.updatedAt)}
            </span>
            {role.granterName && (
              <span className="pq-role-card__meta">
                <UserCircle2 size={12} /> {role.granterName}
              </span>
            )}
          </footer>
        </article>
      ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. PERMISSION MATRIX — view "Phân quyền tính năng"
// ═════════════════════════════════════════════════════════════════════════════
function ViewMaTran({ users, roles }: { users: TaiKhoan[]; roles: NhomQuyen[] }) {
  const [moiTruong, setMoiTruong] = useState<'user' | 'role'>('user');
  const dong = moiTruong === 'user'
    ? users.map(u => ({
        id: u.id,
        ten: u.fullName,
        phu: `@${u.account}`,
        avatar: layChuCaiDau(u.fullName),
        avatarColor: layMauAvatar(u.fullName),
        policies: u.policies,
        baoVe: u.isProtected,
        hoatDong: u.isActive,
      }))
    : roles.map(r => ({
        id: r.code,
        ten: r.name,
        phu: r.code,
        avatar: '',
        avatarColor: '',
        policies: r.policies,
        baoVe: false,
        hoatDong: true,
      }));

  return (
    <div className="pq-matrix-wrap">
      <div className="pq-matrix-toolbar">
        <div className="pq-segmented">
          <button
            className={`pq-segmented__opt ${moiTruong === 'user' ? 'pq-segmented__opt--active' : ''}`}
            onClick={() => setMoiTruong('user')}
          >
            <UserCircle2 size={14} /> Theo tài khoản
          </button>
          <button
            className={`pq-segmented__opt ${moiTruong === 'role' ? 'pq-segmented__opt--active' : ''}`}
            onClick={() => setMoiTruong('role')}
          >
            <Shield size={14} /> Theo nhóm quyền
          </button>
        </div>
        <div className="pq-matrix-legend">
          <span className="pq-legend"><span className="pq-legend__cell pq-legend__cell--on" /> Đã cấp</span>
          <span className="pq-legend"><span className="pq-legend__cell pq-legend__cell--off" /> Chưa cấp</span>
        </div>
      </div>

      <div className="pq-readable-table">
        <table>
          <thead>
            <tr>
              <th className="pq-readable-table__principal">
                {moiTruong === 'user' ? 'Tài khoản' : 'Vai trò'}
              </th>
              {POLICY_CATALOG.map(p => (
                <th key={p.code} className={`pq-readable-table__policy ${mauNhom(p.nhom).replace('pq-chip', 'pq-col')}`} title={moTaPolicy(p.code)}>
                  <div className="pq-readable-table__policy-name">{p.ten}</div>
                  <div className="pq-readable-table__policy-group">{p.nhom}</div>
                </th>
              ))}
              <th className="pq-readable-table__summary">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {dong.map(row => (
              <tr key={row.id}>
                <th className="pq-readable-table__principal pq-readable-table__principal--body">
                  <div className="pq-readable-table__who">
                    <span
                      className={`pq-readable-table__avatar ${moiTruong === 'role' ? 'pq-readable-table__avatar--role' : ''}`}
                      style={moiTruong === 'user' ? { background: row.avatarColor } : undefined}
                    >
                      {moiTruong === 'role' ? <Shield size={13} /> : row.avatar}
                    </span>
                    <div>
                      <div className="pq-readable-table__name">
                        {row.ten}
                        {row.baoVe && <Lock size={12} className="pq-readable-table__lock" />}
                      </div>
                      <div className="pq-readable-table__sub">
                        {row.phu}
                        {moiTruong === 'user' && (
                          <span className={row.hoatDong ? 'pq-state--on' : 'pq-state--off'}>
                            {row.hoatDong ? 'Hoạt động' : 'Vô hiệu'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </th>
                {POLICY_CATALOG.map(p => {
                  const has = row.policies.includes(p.code);
                  return (
                    <td key={p.code} className="pq-readable-table__cell">
                      <button
                        className={`pq-permission-pill ${has ? 'pq-permission-pill--on' : ''}`}
                        title={`${p.ten}: ${has ? 'Đã cấp' : 'Chưa cấp'}`}
                        aria-label={`${row.ten} - ${p.ten}: ${has ? 'Đã cấp' : 'Chưa cấp'}`}
                      >
                        {has ? <Check size={13} strokeWidth={3} /> : <X size={12} strokeWidth={2.5} />}
                        <span>{has ? 'Có' : 'Không'}</span>
                      </button>
                    </td>
                  );
                })}
                <td className="pq-readable-table__summary pq-readable-table__summary--body">
                  <span>{row.policies.length}</span>/{POLICY_CATALOG.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. MODULE ROOT — chuyển view theo menu (system.users / .roles / .permissions)
// ═════════════════════════════════════════════════════════════════════════════
type ViewKey = 'users' | 'roles' | 'matrix';

function viewTuMenu(menuDangChon?: string): ViewKey {
  if (menuDangChon === 'system.roles')       return 'roles';
  if (menuDangChon === 'system.permissions') return 'matrix';
  return 'users';
}

export default function ModulePhanQuyen({ menuDangChon }: { menuDangChon?: string }) {
  const view = viewTuMenu(menuDangChon);

  const accessToken        = dungCuaHangTinhGia(s => s.accessToken);
  const nguoiDungHienTai   = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const coQuyenPhanQuyen   = !!(
    nguoiDungHienTai?.policies.includes('USER_POLICY_GRANT') &&
    nguoiDungHienTai?.policies.includes('USER_POLICY_REVOKE')
  );

  const [users, setUsers]     = useState<TaiKhoan[]>([]);
  const [roles, setRoles]      = useState<NhomQuyen[]>(NHOM_QUYEN_MAU);
  const [chonId, setChonId]   = useState<string>('');
  const [tuKhoa, setTuKhoa]   = useState('');
  const [locTrangThai, setLocTrangThai] = useState<'all' | 'active' | 'inactive' | 'protected'>('all');
  const [tabNguoiDung, setTabNguoiDung] = useState<'list' | 'create'>('list');
  const [dangTai, setDangTai] = useState(false);
  const [loiApi, setLoiApi] = useState<string | null>(null);
  const [moFormTaoTaiKhoan, setMoFormTaoTaiKhoan] = useState(false);
  const [taiKhoanMoi, setTaiKhoanMoi] = useState({ account: '', fullName: '', password: '' });

  const userDangChon = users.find(u => u.id === chonId) ?? users[0];

  const napTaiKhoan = async (name?: string) => {
    if (!accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      const data = await layTaiKhoanService(accessToken, name);
      const mapped = (Array.isArray(data) ? data : [])
        .filter(user => !Boolean(user.isSystem ?? user.is_system))
        .map(chuyenTaiKhoanApi);
      setUsers(mapped);
      if (mapped.length && !mapped.some(u => u.id === chonId)) setChonId(mapped[0].id);
      if (!mapped.length) setChonId('');
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không tải được dữ liệu từ service-lts.');
    } finally {
      setDangTai(false);
    }
  };

  // Tải lần đầu khi có access token
  useEffect(() => {
    if (accessToken) {
      void napTaiKhoan();
      void napNhomQuyen();
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const napNhomQuyen = async () => {
    if (!accessToken) return;
    try {
      const data = await layNhomQuyenService(accessToken);
      setRoles(data);
    } catch {
      // giữ nguyên dữ liệu cũ nếu lỗi
    }
  };

  // Debounce 700ms: gọi API khi người dùng ngừng gõ
  useEffect(() => {
    if (!accessToken) return;
    const timer = setTimeout(() => {
      void napTaiKhoan(tuKhoa.trim() || undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [tuKhoa]); // eslint-disable-line react-hooks/exhaustive-deps

  const luuUserTuApi = (user: TaiKhoanApi) => {
    if (Boolean(user.isSystem ?? user.is_system)) return;
    const mapped = chuyenTaiKhoanApi(user);
    setUsers(prev => prev.some(u => u.id === mapped.id) ? prev.map(u => u.id === mapped.id ? mapped : u) : [mapped, ...prev]);
    setChonId(mapped.id);
  };

  const xuLyTaoTaiKhoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taiKhoanMoi.account.trim() || !taiKhoanMoi.fullName.trim() || !taiKhoanMoi.password) return;
    if (!accessToken) {
      setLoiApi('Vui lòng đăng nhập trước khi tạo tài khoản.');
      return;
    }
    setDangTai(true);
    setLoiApi(null);
    try {
      const created = await taoTaiKhoanService(accessToken, {
        account: taiKhoanMoi.account.trim(),
        fullName: taiKhoanMoi.fullName.trim(),
        password: taiKhoanMoi.password,
      });
      luuUserTuApi(created);
      setTaiKhoanMoi({ account: '', fullName: '', password: '' });
      setMoFormTaoTaiKhoan(false);
      setTabNguoiDung('list');
      await napTaiKhoan();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không tạo được tài khoản.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyToggleActive = async () => {
    if (!userDangChon || !accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      const updated = userDangChon.isActive
        ? await voHieuTaiKhoanService(accessToken, userDangChon.id)
        : await kichHoatTaiKhoanService(accessToken, userDangChon.id);
      luuUserTuApi(updated);
      await napTaiKhoan();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không cập nhật được trạng thái tài khoản.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyToggleProtected = async () => {
    if (!userDangChon || !accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      const updated = await capNhatBaoVeService(accessToken, userDangChon.id, !userDangChon.isProtected);
      luuUserTuApi(updated);
      await napTaiKhoan();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không cập nhật được bảo vệ tài khoản.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyLuuNhomQuyen = async (role: NhomQuyen) => {
    if (!accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      await luuNhomQuyenService(accessToken, {
        code: role.code,
        name: role.name,
        description: role.description,
        policyCodes: role.policies,
      });
      await napNhomQuyen();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không lưu được nhóm quyền.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyXoaNhomQuyen = async (role: NhomQuyen) => {
    if (!accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      await xoaNhomQuyenService(accessToken, role.code);
      await napNhomQuyen();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không xóa được nhóm quyền.');
    } finally {
      setDangTai(false);
    }
  };

  const usersLoc = useMemo(() => {
    return users.filter(u => {
      if (locTrangThai === 'active'    && !u.isActive)    return false;
      if (locTrangThai === 'inactive'  &&  u.isActive)    return false;
      if (locTrangThai === 'protected' && !u.isProtected) return false;
      return true;
    });
  }, [users, locTrangThai]);

  const capNhatQuyenTaiKhoan = (userId: string, policies: PolicyCode[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, policies } : u));
  };

  const togglePolicy = async (code: PolicyCode) => {
    if (!userDangChon || !accessToken) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    const userId = userDangChon.id;
    const policiesCu = userDangChon.policies;
    const has = policiesCu.includes(code);
    const policiesMoi = has ? policiesCu.filter(p => p !== code) : [...policiesCu, code];

    capNhatQuyenTaiKhoan(userId, policiesMoi);
    setLoiApi(null);
    try {
      if (has) {
        await thuHoiQuyenService(accessToken, userId, [code]);
      } else {
        await capQuyenService(accessToken, userId, [code]);
      }
    } catch (error) {
      capNhatQuyenTaiKhoan(userId, policiesCu);
      setLoiApi(error instanceof Error ? error.message : 'Không cập nhật được quyền.');
    }
  };

  const applyTemplate = async (tpl: NhomQuyen) => {
    if (!userDangChon || !accessToken) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    const userId = userDangChon.id;
    const policiesCu = userDangChon.policies;
    const canCap = tpl.policies.filter(code => !policiesCu.includes(code));
    if (!canCap.length) return;

    capNhatQuyenTaiKhoan(userId, [...policiesCu, ...canCap]);
    setLoiApi(null);
    try {
      await capQuyenService(accessToken, userId, canCap);
    } catch (error) {
      capNhatQuyenTaiKhoan(userId, policiesCu);
      setLoiApi(error instanceof Error ? error.message : 'Không áp được nhóm quyền.');
    }
  };

  // Tổng quan top
  const tongQuan = useMemo(() => ({
    tongUser:    users.length,
    activeUser:  users.filter(u => u.isActive).length,
    protectUser: users.filter(u => u.isProtected).length,
    tongRole:    roles.length,
    tongPolicy:  POLICY_CATALOG.length,
  }), [users, roles]);

  return (
    <div className="pq-root">
      {/* ── Hero / heading ─────────────────────────────────────────────── */}
      <header className="pq-hero">
        <div className="pq-hero__title">
          <h1 className="pq-hero__h1">
            {view === 'users'  ? 'Tài khoản & quyền'
            : view === 'roles' ? 'Vai trò'
            : 'Bảng phân quyền'}
          </h1>
        </div>

        <div className="pq-hero__stats">
          <div className="pq-stat-pill"><span className="pq-stat-pill__num">{tongQuan.tongUser}</span><span>Tài khoản</span></div>
          <div className="pq-stat-pill"><span className="pq-stat-pill__num pq-stat-pill__num--green">{tongQuan.activeUser}</span><span>Đang hoạt động</span></div>
          <div className="pq-stat-pill"><span className="pq-stat-pill__num pq-stat-pill__num--orange">{tongQuan.protectUser}</span><span>Được bảo vệ</span></div>
          <div className="pq-stat-pill"><span className="pq-stat-pill__num pq-stat-pill__num--accent">{tongQuan.tongRole}</span><span>Vai trò</span></div>
          <div className="pq-stat-pill"><span className="pq-stat-pill__num pq-stat-pill__num--cyan">{tongQuan.tongPolicy}</span><span>Policy hệ thống</span></div>
        </div>
      </header>

      {loiApi && <div className="pq-api-error">{loiApi}</div>}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {view === 'users' && (
        <>
          <div className="pq-user-tabs">
            <button
              className={`pq-user-tab ${tabNguoiDung === 'list' ? 'pq-user-tab--on' : ''}`}
              onClick={() => setTabNguoiDung('list')}
            >
              <Users2 size={15} /> Danh sách tài khoản
            </button>
            <button
              className={`pq-user-tab ${tabNguoiDung === 'create' ? 'pq-user-tab--on' : ''}`}
              onClick={() => setTabNguoiDung('create')}
            >
              <Plus size={15} /> Tạo tài khoản
            </button>
          </div>

          {tabNguoiDung === 'create' ? (
            <section className="pq-create-page">
              <div className="pq-create-card">
                <div className="pq-create-card__head">
                  <div className="pq-create-card__icon"><UserCircle2 size={22} /></div>
                  <div>
                    <h3>Tạo tài khoản mới</h3>
                    <p>Admin tạo account cho người dùng khác trên service-lts qua API <b>POST /auth/accounts</b>.</p>
                  </div>
                </div>
                <form className="pq-account-form pq-account-form--standalone" onSubmit={xuLyTaoTaiKhoan}>
                  <div className="pq-account-form__grid">
                    <label>
                      <span>Tài khoản đăng nhập</span>
                      <input
                        value={taiKhoanMoi.account}
                        onChange={e => setTaiKhoanMoi(prev => ({ ...prev, account: e.target.value }))}
                        placeholder="Ví dụ: nguyenvana"
                        required
                      />
                    </label>
                    <label>
                      <span>Họ tên người dùng</span>
                      <input
                        value={taiKhoanMoi.fullName}
                        onChange={e => setTaiKhoanMoi(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </label>
                    <label>
                      <span>Mật khẩu tạm</span>
                      <input
                        type="password"
                        value={taiKhoanMoi.password}
                        onChange={e => setTaiKhoanMoi(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Nhập mật khẩu ban đầu"
                        required
                      />
                    </label>
                  </div>
                  <div className="pq-account-form__actions">
                    <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setTaiKhoanMoi({ account: '', fullName: '', password: '' })}>
                      Xóa form
                    </button>
                    <button type="submit" className="pq-btn pq-btn--primary" disabled={dangTai}>
                      {dangTai ? 'Đang tạo…' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <div className="pq-split">
              {/* Cột danh sách user */}
              <section className="pq-list">
                <div className="pq-list__toolbar">
              <div className="pq-search pq-search--lg">
                <Search size={15} />
                <input
                  placeholder="Tìm tài khoản hoặc họ tên…"
                  value={tuKhoa}
                  onChange={e => setTuKhoa(e.target.value)}
                />
                {tuKhoa && (
                  <button className="pq-search__clear" onClick={() => setTuKhoa('')}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                className="pq-btn pq-btn--primary pq-btn--sm"
                onClick={() => setTabNguoiDung('create')}
              >
                <Plus size={14} /> Thêm
              </button>
            </div>

            {moFormTaoTaiKhoan && (
              <form className="pq-account-form" onSubmit={xuLyTaoTaiKhoan}>
                <div className="pq-account-form__grid">
                  <label>
                    <span>Tài khoản</span>
                    <input
                      value={taiKhoanMoi.account}
                      onChange={e => setTaiKhoanMoi(prev => ({ ...prev, account: e.target.value }))}
                      placeholder="Ví dụ: nguyenvana"
                      required
                    />
                  </label>
                  <label>
                    <span>Họ tên</span>
                    <input
                      value={taiKhoanMoi.fullName}
                      onChange={e => setTaiKhoanMoi(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </label>
                  <label>
                    <span>Mật khẩu tạm</span>
                    <input
                      type="password"
                      value={taiKhoanMoi.password}
                      onChange={e => setTaiKhoanMoi(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Nhập mật khẩu ban đầu"
                      required
                    />
                  </label>
                </div>
                <div className="pq-account-form__actions">
                  <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMoFormTaoTaiKhoan(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="pq-btn pq-btn--primary" disabled={dangTai}>
                    {dangTai ? 'Đang tạo…' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            )}

            <div className="pq-filter-row">
              <Filter size={12} />
              {([
                ['all',       'Tất cả'],
                ['active',    'Đang hoạt động'],
                ['inactive',  'Đã vô hiệu'],
                ['protected', 'Được bảo vệ'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  className={`pq-filter ${locTrangThai === key ? 'pq-filter--on' : ''}`}
                  onClick={() => setLocTrangThai(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pq-list__items">
              {usersLoc.length === 0 ? (
                <div className="pq-empty">Không có tài khoản phù hợp.</div>
              ) : usersLoc.map(u => (
                <HangTaiKhoan
                  key={u.id}
                  user={u}
                  daChon={u.id === chonId}
                  onClick={() => setChonId(u.id)}
                />
              ))}
            </div>
          </section>

          {/* Inspector phải */}
              <InspectorTaiKhoan
                user={userDangChon}
                onTogglePolicy={togglePolicy}
                onApplyTemplate={applyTemplate}
                onToggleActive={xuLyToggleActive}
                onToggleProtected={xuLyToggleProtected}
                templates={roles}
                coQuyenPhanQuyen={coQuyenPhanQuyen}
              />
            </div>
          )}
        </>
      )}

      {view === 'roles' && (
        <ViewNhomQuyen
          roles={roles}
          onCreateRole={xuLyLuuNhomQuyen}
          onDeleteRole={xuLyXoaNhomQuyen}
        />
      )}

      {view === 'matrix' && <ViewMaTran users={users} roles={roles} />}
    </div>
  );
}
