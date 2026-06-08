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
  ChevronRight, Check, X, Trash2, Pencil, UserCircle2,
  ScrollText, Sparkles, FileKey2, ListChecks, Filter, Info,
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
  datLaiMatKhauTaiKhoanService,
  capQuyenService,
  thuHoiQuyenService,
  luuNhomQuyenService,
  xoaNhomQuyenService,
  layNhomQuyenService,
  chuyenTaiKhoanApi,
} from '../lib/api/service-lts';
import { normalizeDisplayText } from '../lib/text-codec';

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

function tacDongTheoRuiRo(ruiRo: Policy['rui_ro']): { title: string; desc: string } {
  if (ruiRo === 'cao') return {
    title: 'Quyền nhạy cảm',
    desc: 'Chỉ cấp cho admin được ủy quyền. Quyền này có thể tác động trực tiếp đến dữ liệu hoặc tài khoản người dùng khác.',
  };
  if (ruiRo === 'trung') return {
    title: 'Quyền thao tác',
    desc: 'Quyền này thay đổi dữ liệu hệ thống. Cần cấp đúng vai trò và kiểm tra định kỳ.',
  };
  return {
    title: 'Quyền đọc/xem',
    desc: 'Quyền này chủ yếu dùng để xem dữ liệu, ít rủi ro hơn các quyền tạo, sửa hoặc xóa.',
  };
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
  const displayName = normalizeDisplayText(user.fullName);
  return (
    <button className={`pq-row ${daChon ? 'pq-row--active' : ''}`} onClick={onClick}>
      <div className="pq-row__avatar" style={{ background: layMauAvatar(displayName) }}>
        {layChuCaiDau(displayName)}
      </div>
      <div className="pq-row__main">
        <div className="pq-row__name">
          {displayName}
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
  draftPolicies,
  onToggleDraftPolicy,
  onSavePolicyChanges,
  onCancelPolicyChanges,
  onApplyTemplate,
  onToggleActive,
  onToggleProtected,
  onResetPassword,
  templates,
  coQuyenPhanQuyen,
  coQuyenDatLaiMatKhau,
  dangLuuQuyen,
}: {
  user?: TaiKhoan;
  draftPolicies: PolicyCode[];
  onToggleDraftPolicy: (code: PolicyCode) => void;
  onSavePolicyChanges: () => void;
  onCancelPolicyChanges: () => void;
  onApplyTemplate: (template: NhomQuyen) => void;
  onToggleActive: () => void;
  onToggleProtected: () => void;
  onResetPassword: () => void;
  templates: NhomQuyen[];
  coQuyenPhanQuyen: boolean;
  coQuyenDatLaiMatKhau: boolean;
  dangLuuQuyen: boolean;
}) {
  const [tab, setTab] = useState<'policy' | 'template'>('policy');
  const [tuKhoa, setTuKhoa] = useState('');
  const [policyDangXem, setPolicyDangXem] = useState<Policy | null>(null);

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

  if (!user) {
    return (
      <aside className="pq-inspector pq-inspector--empty">
        <div className="pq-empty">Chưa có tài khoản để hiển thị. Hãy bấm “Thêm” để tạo tài khoản mới.</div>
      </aside>
    );
  }

  const savedPolicySet = new Set(user.policies);
  const draftPolicySet = new Set(draftPolicies);
  const soQuyenThem = draftPolicies.filter(code => !savedPolicySet.has(code)).length;
  const soQuyenThuHoi = user.policies.filter(code => !draftPolicySet.has(code)).length;
  const coThayDoiQuyen = soQuyenThem + soQuyenThuHoi > 0;
  const displayName = normalizeDisplayText(user.fullName);

  return (
    <aside className="pq-inspector">
      {/* Header */}
      <div className="pq-inspector__head">
        <div className="pq-inspector__avatar" style={{ background: layMauAvatar(displayName) }}>
          {layChuCaiDau(displayName)}
        </div>
        <div className="pq-inspector__title">
          <div className="pq-inspector__name">
            {displayName}
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
          {coQuyenDatLaiMatKhau && (
            <button className="pq-btn pq-btn--ghost" title="Đặt lại mật khẩu tài khoản" onClick={onResetPassword}>
              <Lock size={14} /> Đặt lại MK
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="pq-stats">
        <div className="pq-stat">
          <div className="pq-stat__num">{user.policies.length}/{POLICY_CATALOG.length}</div>
          <div className="pq-stat__lbl">Quyền đã cấp</div>
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
              <div className="pq-policy-list pq-policy-list--compact">
                {ds.map(policy => {
                  const granted = draftPolicySet.has(policy.code);
                  const changed = granted !== savedPolicySet.has(policy.code);
                  return (
                    <label key={policy.code} className={`pq-policy pq-policy--compact ${granted ? 'pq-policy--on' : ''} ${changed ? 'pq-policy--changed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={granted}
                        onChange={() => onToggleDraftPolicy(policy.code)}
                      />
                      <span className="pq-policy__check"><Check size={12} strokeWidth={3.5} /></span>
                      <div className="pq-policy__body">
                        <div className="pq-policy__top">
                          <span className="pq-policy__code">{policy.ten}</span>
                          <span className={`pq-risk pq-risk--${policy.rui_ro}`}>
                            {mauRuiRo(policy.rui_ro)}
                          </span>
                          <button type="button" className="pq-policy__info" aria-label={`Xem chi tiết ${policy.ten}`} onClick={e => { e.preventDefault(); setPolicyDangXem(policy); }}>
                            <Info size={13} />
                          </button>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {user.isActive && coQuyenPhanQuyen && tab === 'policy' && (
        <div className="pq-policy-savebar">
          <span>{coThayDoiQuyen ? `${soQuyenThem + soQuyenThuHoi} thay đổi chưa lưu` : 'Quyền đang đồng bộ'}</span>
          <div>
            <button className="pq-btn pq-btn--ghost pq-btn--sm" disabled={!coThayDoiQuyen || dangLuuQuyen} onClick={onCancelPolicyChanges}>Hủy thay đổi</button>
            <button className="pq-btn pq-btn--primary pq-btn--sm" disabled={!coThayDoiQuyen || dangLuuQuyen} onClick={onSavePolicyChanges}>{dangLuuQuyen ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
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

      {policyDangXem && (
        <div className="pq-modal-backdrop" onClick={() => setPolicyDangXem(null)}>
          <div className={`pq-modal pq-policy-detail pq-policy-detail--${policyDangXem.rui_ro}`} onClick={e => e.stopPropagation()}>
            <div className="pq-policy-detail__hero">
              <div>
                <span className="pq-policy-detail__risk">{mauRuiRo(policyDangXem.rui_ro)}</span>
                <h3>{policyDangXem.ten}</h3>
                <p>{policyDangXem.moTa}</p>
              </div>
              <button className="pq-policy-detail__close" onClick={() => setPolicyDangXem(null)} aria-label="Đóng"><X size={16} /></button>
            </div>
            <div className="pq-policy-detail__body">
              <div className="pq-policy-detail__impact">
                <b>{tacDongTheoRuiRo(policyDangXem.rui_ro).title}</b>
                <span>{tacDongTheoRuiRo(policyDangXem.rui_ro).desc}</span>
              </div>
              <div className="pq-policy-detail__meta">
                <span>Nhóm quyền</span>
                <b>{policyDangXem.nhom}</b>
              </div>
            </div>
          </div>
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
  users,
  onCreateRole,
  onDeleteRole,
}: {
  roles: NhomQuyen[];
  users: TaiKhoan[];
  onCreateRole: (role: NhomQuyen) => void;
  onDeleteRole: (role: NhomQuyen) => void;
}) {
  const [moForm, setMoForm] = useState(false);
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const [chon, setChon] = useState<PolicyCode[]>([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [locLoai, setLocLoai] = useState<'all' | 'system' | 'custom'>('all');
  const [locTrangThai, setLocTrangThai] = useState<'all' | 'active' | 'inactive'>('all');
  const [trang, setTrang] = useState(1);
  const kichThuocTrang = 4;

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

  const tongPolicyGan = roles.reduce((sum, role) => sum + role.policies.length, 0);
  const tongNguoiDungActive = users.filter(u => u.isActive).length;

  const rolesLoc = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase();
    return roles.filter(role => {
      const laSystem = role.code.includes('ADMIN') || role.code.includes('SYSTEM');
      const theoLoai = locLoai === 'all' || (locLoai === 'system' ? laSystem : !laSystem);
      const theoTrangThai = locTrangThai === 'all' || (locTrangThai === 'active' ? role.policies.length > 0 : role.policies.length === 0);
      const theoTuKhoa = !k || role.name.toLowerCase().includes(k) || role.code.toLowerCase().includes(k) || role.description.toLowerCase().includes(k);
      return theoLoai && theoTrangThai && theoTuKhoa;
    });
  }, [roles, tuKhoa, locLoai, locTrangThai]);

  const tongTrang = Math.max(1, Math.ceil(rolesLoc.length / kichThuocTrang));
  const trangHienTai = Math.min(trang, tongTrang);
  const duLieuTrang = rolesLoc.slice((trangHienTai - 1) * kichThuocTrang, trangHienTai * kichThuocTrang);

  useEffect(() => {
    setTrang(1);
  }, [tuKhoa, locLoai, locTrangThai]);

  return (
    <div className="pq-role-dashboard">
      <header className="pq-rd-header">
        <div>
          <h2>Vai trò & Nhóm quyền</h2>
          <p>Quản lý các nhóm quyền dùng để phân quyền chức năng cho người dùng.</p>
        </div>
        <button className="pq-btn pq-btn--primary" onClick={() => setMoForm(true)}>
          <Plus size={15} /> Tạo nhóm quyền
        </button>
      </header>

      <div className="pq-rd-stats">
        <div className="pq-rd-stat"><b>{users.length}</b><span>Tài khoản</span></div>
        <div className="pq-rd-stat"><b>{tongNguoiDungActive}</b><span>Đang hoạt động</span></div>
        <div className="pq-rd-stat"><b>{roles.length}</b><span>Vai trò</span></div>
        <div className="pq-rd-stat"><b>{tongPolicyGan}</b><span>Policy hệ thống</span></div>
      </div>

      <div className="pq-rd-toolbar">
        <div className="pq-search pq-search--lg">
          <Search size={15} />
          <input placeholder="Tìm kiếm nhóm quyền..." value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} />
        </div>
        <select value={locLoai} onChange={e => setLocLoai(e.target.value as 'all' | 'system' | 'custom')}>
          <option value="all">Loại nhóm</option>
          <option value="system">Nhóm hệ thống</option>
          <option value="custom">Nhóm tùy chỉnh</option>
        </select>
        <select value={locTrangThai} onChange={e => setLocTrangThai(e.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">Trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu</option>
        </select>
      </div>

      {moForm && (
        <form className="pq-role-form" onSubmit={submit}>
          <div className="pq-role-form__grid">
            <label><span>Tên nhóm quyền</span><input value={ten} onChange={e => setTen(e.target.value)} placeholder="Ví dụ: Quản lý tài khoản" required /></label>
            <label><span>Mô tả</span><input value={moTa} onChange={e => setMoTa(e.target.value)} placeholder="Mục đích sử dụng nhóm quyền" /></label>
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

      <div className="pq-rd-table-wrap">
        <table className="pq-rd-table">
          <thead>
            <tr>
              <th>Nhóm quyền</th><th>Loại</th><th>Số quyền</th><th>Người dùng</th><th>Quyền nổi bật</th><th>Cập nhật</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {duLieuTrang.length === 0 ? (
              <tr><td colSpan={7} className="pq-rd-empty">Không có nhóm quyền phù hợp.</td></tr>
            ) : duLieuTrang.map(role => {
              const laSystem = role.code.includes('ADMIN') || role.code.includes('SYSTEM');
              return (
                <tr key={role.code}>
                  <td><div className="pq-rd-role-name"><Shield size={14} /> {role.name}</div></td>
                  <td><span className={`pq-rd-tag ${laSystem ? 'pq-rd-tag--system' : 'pq-rd-tag--custom'}`}>{laSystem ? 'Nhóm hệ thống' : 'Nhóm tùy chỉnh'}</span></td>
                  <td>{role.policies.length} quyền</td>
                  <td>{Math.max(1, Math.ceil(role.policies.length / 3))} người dùng</td>
                  <td>
                    <div className="pq-rd-featured">{role.policies.slice(0, 3).map(c => <PolicyChip key={c} code={c} dense />)}{role.policies.length > 3 && <span className="pq-chip pq-chip--more">+{role.policies.length - 3}</span>}</div>
                  </td>
                  <td>{dinhDangNgay(role.updatedAt)}</td>
                  <td>
                    <div className="pq-rd-actions">
                      <button className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => { setTen(role.name); setMoTa(role.description); setChon(role.policies); setMoForm(true); }}>Sửa</button>
                      <button className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => onDeleteRole(role)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pq-rd-pagination">
        <button className="pq-btn pq-btn--ghost pq-btn--sm" disabled={trangHienTai <= 1} onClick={() => setTrang(p => Math.max(1, p - 1))}>‹</button>
        <span>{trangHienTai}</span>
        <button className="pq-btn pq-btn--ghost pq-btn--sm" disabled={trangHienTai >= tongTrang} onClick={() => setTrang(p => Math.min(tongTrang, p + 1))}>›</button>
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
        ten: normalizeDisplayText(u.fullName),
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
  const currentSellerId    = dungCuaHangTinhGia(s => s.currentSellerId);
  const currentSellerName  = dungCuaHangTinhGia(s => s.currentSellerName);
  const ghiNhatKy          = dungCuaHangTinhGia(s => s.ghiNhatKy);
  const coQuyenPhanQuyen   = !!(
    nguoiDungHienTai?.policies.includes('USER_POLICY_GRANT') &&
    nguoiDungHienTai?.policies.includes('USER_POLICY_REVOKE')
  );
  const coQuyenDatLaiMatKhau = !!nguoiDungHienTai?.policies.includes('ACCOUNT_PASSWORD_UPDATE_ALL');

  const [users, setUsers]     = useState<TaiKhoan[]>([]);
  const [roles, setRoles]      = useState<NhomQuyen[]>(NHOM_QUYEN_MAU);
  const [chonId, setChonId]   = useState<string>('');
  const [tuKhoa, setTuKhoa]   = useState('');
  const [locTrangThai, setLocTrangThai] = useState<'all' | 'active' | 'inactive' | 'protected'>('all');
  const [dangTai, setDangTai] = useState(false);
  const [dangLuuQuyen, setDangLuuQuyen] = useState(false);
  const [loiApi, setLoiApi] = useState<string | null>(null);
  const [moFormTaoTaiKhoan, setMoFormTaoTaiKhoan] = useState(false);
  const [taiKhoanMoi, setTaiKhoanMoi] = useState({ account: '', fullName: '', password: '' });
  const [draftPolicies, setDraftPolicies] = useState<PolicyCode[]>([]);
  const [resetPasswordUser, setResetPasswordUser] = useState<TaiKhoan | null>(null);
  const [matKhauDatLai, setMatKhauDatLai] = useState({ password: '', confirm: '' });
  const [dangDatLaiMatKhau, setDangDatLaiMatKhau] = useState(false);

  const userDangChon = users.find(u => u.id === chonId) ?? users[0];

  useEffect(() => {
    setDraftPolicies(userDangChon?.policies ?? []);
  }, [userDangChon?.id, userDangChon?.policies]);

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

  const napNhomQuyen = async () => {
    if (!accessToken) return;
    try {
      const data = await layNhomQuyenService(accessToken);
      setRoles(data);
    } catch {
      // giữ nguyên dữ liệu cũ nếu lỗi
    }
  };

  // Tải lần đầu khi có access token
  useEffect(() => {
    if (accessToken) {
      void napTaiKhoan();
      void napNhomQuyen();
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const ghiNhatKyPhanQuyen = (params: { action: 'create' | 'update' | 'delete' | 'status_change' | 'lock' | 'unlock' | 'assign'; targetId: string; targetName?: string; before?: Record<string, unknown>; after?: Record<string, unknown>; note?: string }) => {
    ghiNhatKy({
      userId: currentSellerId,
      userName: normalizeDisplayText(currentSellerName),
      targetType: 'permission',
      ...params,
    });
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
      ghiNhatKyPhanQuyen({ action: 'create', targetId: created.id, targetName: normalizeDisplayText(created.fullName || created.account), after: { account: created.account, fullName: normalizeDisplayText(created.fullName || created.account), isActive: created.isActive }, note: 'Tạo tài khoản' });
      setTaiKhoanMoi({ account: '', fullName: '', password: '' });
      setMoFormTaoTaiKhoan(false);
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
      ghiNhatKyPhanQuyen({ action: 'status_change', targetId: userDangChon.id, targetName: normalizeDisplayText(userDangChon.fullName || userDangChon.account), before: { isActive: userDangChon.isActive }, after: { isActive: !userDangChon.isActive }, note: userDangChon.isActive ? 'Vô hiệu tài khoản' : 'Kích hoạt tài khoản' });
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
      ghiNhatKyPhanQuyen({ action: userDangChon.isProtected ? 'unlock' : 'lock', targetId: userDangChon.id, targetName: normalizeDisplayText(userDangChon.fullName || userDangChon.account), before: { isProtected: userDangChon.isProtected }, after: { isProtected: !userDangChon.isProtected }, note: userDangChon.isProtected ? 'Bỏ bảo vệ tài khoản' : 'Bảo vệ tài khoản' });
      await napTaiKhoan();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không cập nhật được bảo vệ tài khoản.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyLuuNhomQuyen = async (role: NhomQuyen) => {
    if (!accessToken) return;
    const existed = roles.some(item => item.code === role.code);
    setDangTai(true);
    setLoiApi(null);
    try {
      await luuNhomQuyenService(accessToken, {
        code: role.code,
        name: role.name,
        description: role.description,
        policyCodes: role.policies,
      });
      ghiNhatKyPhanQuyen({ action: existed ? 'update' : 'create', targetId: role.code, targetName: role.name, after: { roleCode: role.code, roleName: role.name, policies: role.policies }, note: existed ? 'Cập nhật nhóm quyền' : 'Tạo nhóm quyền' });
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
      ghiNhatKyPhanQuyen({ action: 'delete', targetId: role.code, targetName: role.name, before: { roleCode: role.code, roleName: role.name, policies: role.policies }, note: 'Xóa nhóm quyền' });
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
  const statusChips = [
    { key: 'all', label: 'Tất cả', count: users.length },
    { key: 'active', label: 'Đang hoạt động', count: users.filter(u => u.isActive).length },
    { key: 'inactive', label: 'Đã vô hiệu', count: users.filter(u => !u.isActive).length },
    { key: 'protected', label: 'Được bảo vệ', count: users.filter(u => u.isProtected).length },
  ] as const;

  const capNhatQuyenTaiKhoan = (userId: string, policies: PolicyCode[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, policies } : u));
  };

  const toggleDraftPolicy = (code: PolicyCode) => {
    if (!userDangChon) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    setDraftPolicies(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
    setLoiApi(null);
  };

  const huyThayDoiQuyen = () => {
    setDraftPolicies(userDangChon?.policies ?? []);
    setLoiApi(null);
  };

  const luuThayDoiQuyen = async () => {
    if (!userDangChon || !accessToken) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    const userId = userDangChon.id;
    const saved = new Set(userDangChon.policies);
    const draft = new Set(draftPolicies);
    const canCap = draftPolicies.filter(code => !saved.has(code));
    const canThuHoi = userDangChon.policies.filter(code => !draft.has(code));
    if (!canCap.length && !canThuHoi.length) return;

    setDangLuuQuyen(true);
    setLoiApi(null);
    try {
      if (canCap.length) await capQuyenService(accessToken, userId, canCap);
      if (canThuHoi.length) await thuHoiQuyenService(accessToken, userId, canThuHoi);
      capNhatQuyenTaiKhoan(userId, draftPolicies);
      ghiNhatKyPhanQuyen({ action: 'assign', targetId: userId, targetName: normalizeDisplayText(userDangChon.fullName || userDangChon.account), before: { policies: userDangChon.policies }, after: { policies: draftPolicies, policiesAdded: canCap, policiesRemoved: canThuHoi }, note: 'Cập nhật quyền tài khoản' });
      await napTaiKhoan(tuKhoa.trim() || undefined);
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không lưu được thay đổi quyền.');
    } finally {
      setDangLuuQuyen(false);
    }
  };

  const applyTemplate = (tpl: NhomQuyen) => {
    if (!userDangChon) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    setDraftPolicies(prev => Array.from(new Set([...prev, ...tpl.policies])));
    setLoiApi(null);
  };

  const xuLyDatLaiMatKhau = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !accessToken) return;
    if (!matKhauDatLai.password || !matKhauDatLai.confirm) {
      setLoiApi('Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }
    if (matKhauDatLai.password.length < 6) {
      setLoiApi('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (matKhauDatLai.password !== matKhauDatLai.confirm) {
      setLoiApi('Mật khẩu xác nhận không khớp.');
      return;
    }
    setDangDatLaiMatKhau(true);
    setLoiApi(null);
    try {
      const updated = await datLaiMatKhauTaiKhoanService(accessToken, resetPasswordUser.id, matKhauDatLai.password);
      luuUserTuApi(updated);
      ghiNhatKyPhanQuyen({ action: 'update', targetId: resetPasswordUser.id, targetName: normalizeDisplayText(resetPasswordUser.fullName || resetPasswordUser.account), note: 'Đặt lại mật khẩu tài khoản' });
      setResetPasswordUser(null);
      setMatKhauDatLai({ password: '', confirm: '' });
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không đặt lại được mật khẩu.');
    } finally {
      setDangDatLaiMatKhau(false);
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
      {view !== 'users' && (
        <header className="pq-crm-header">
          <div className="pq-crm-header-left">
            <div className="pq-crm-breadcrumb">
              <span>Hệ thống</span>
              <ChevronRight size={12}/>
              <span className="pq-crm-breadcrumb-current">{view === 'roles' ? 'Vai trò' : 'Bảng phân quyền'}</span>
            </div>
            <h1 className="pq-crm-title">{view === 'roles' ? 'Vai trò' : 'Bảng phân quyền'}</h1>
          </div>
        </header>
      )}

      {view === 'users' && (
        <>
          <div className="pq-crm-stats">
            <span><b>{tongQuan.tongUser}</b> Tài khoản</span>
            <span><b>{tongQuan.activeUser}</b> Đang hoạt động</span>
            <span><b>{tongQuan.protectUser}</b> Được bảo vệ</span>
            <span><b>{tongQuan.tongRole}</b> Vai trò</span>
            <span><b>{tongQuan.tongPolicy}</b> Policy hệ thống</span>
          </div>

          <div className="pq-crm-search-bar">
            <Search size={16} className="pq-crm-search-icon"/>
            <input
              className="pq-crm-search-input"
              placeholder="Tìm tài khoản hoặc họ tên..."
              value={tuKhoa}
              onChange={e => setTuKhoa(e.target.value)}
            />
            <kbd className="pq-crm-search-kbd">Ctrl+K</kbd>
            {tuKhoa && <button className="pq-btn-icon pq-crm-search-clear" aria-label="Xóa" onClick={() => setTuKhoa('')}><X size={14}/></button>}
          </div>

          <div className="pq-crm-toolbar">
            <div className="pq-crm-chips">
              {statusChips.map(chip => (
                <button
                  key={chip.key}
                  className={locTrangThai === chip.key ? 'pq-crm-chip pq-crm-chip--active' : 'pq-crm-chip'}
                  onClick={() => setLocTrangThai(chip.key)}
                >
                  {chip.label} <span className="pq-crm-chip-count">{chip.count}</span>
                </button>
              ))}
            </div>
            <button className="pq-btn pq-btn--primary" onClick={() => setMoFormTaoTaiKhoan(true)}>
              <Plus size={15}/> Thêm mới
            </button>
          </div>
        </>
      )}

      {loiApi && <div className="pq-api-error">{loiApi}</div>}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {view === 'users' && (
        <>
          <div className="pq-split">
              {/* Cột danh sách user */}
              <section className="pq-list">
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
                draftPolicies={draftPolicies}
                onToggleDraftPolicy={toggleDraftPolicy}
                onSavePolicyChanges={luuThayDoiQuyen}
                onCancelPolicyChanges={huyThayDoiQuyen}
                onApplyTemplate={applyTemplate}
                onToggleActive={xuLyToggleActive}
                onToggleProtected={xuLyToggleProtected}
                onResetPassword={() => { if (userDangChon) setResetPasswordUser(userDangChon); }}
                templates={roles}
                coQuyenPhanQuyen={coQuyenPhanQuyen}
                coQuyenDatLaiMatKhau={coQuyenDatLaiMatKhau}
                dangLuuQuyen={dangLuuQuyen}
              />
            </div>
        </>
      )}

      {view === 'roles' && (
        <ViewNhomQuyen
          roles={roles}
          users={users}
          onCreateRole={xuLyLuuNhomQuyen}
          onDeleteRole={xuLyXoaNhomQuyen}
        />
      )}

      {view === 'matrix' && <ViewMaTran users={users} roles={roles} />}

      {moFormTaoTaiKhoan && (
        <div className="pq-modal-backdrop" onClick={() => setMoFormTaoTaiKhoan(false)}>
          <form className="pq-modal" onSubmit={xuLyTaoTaiKhoan} onClick={e => e.stopPropagation()}>
            <div className="pq-modal__head">
              <h3>Tạo tài khoản mới</h3>
              <button type="button" className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => setMoFormTaoTaiKhoan(false)}><X size={13} /> Đóng</button>
            </div>
            <div className="pq-modal__body">
              <label className="pq-modal__field">
                <b>Tài khoản đăng nhập</b>
                <input value={taiKhoanMoi.account} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, account: e.target.value }))} placeholder="Ví dụ: nguyenvana" autoFocus required />
              </label>
              <label className="pq-modal__field">
                <b>Họ tên người dùng</b>
                <input value={taiKhoanMoi.fullName} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, fullName: e.target.value }))} placeholder="Nguyễn Văn A" required />
              </label>
              <label className="pq-modal__field">
                <b>Mật khẩu tạm</b>
                <input type="password" value={taiKhoanMoi.password} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, password: e.target.value }))} placeholder="Nhập mật khẩu ban đầu" required />
              </label>
            </div>
            <div className="pq-modal__foot">
              <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMoFormTaoTaiKhoan(false)}>Hủy</button>
              <button type="submit" className="pq-btn pq-btn--primary" disabled={dangTai}>{dangTai ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
            </div>
          </form>
        </div>
      )}

      {resetPasswordUser && (
        <div className="pq-modal-backdrop" onClick={() => { setResetPasswordUser(null); setMatKhauDatLai({ password: '', confirm: '' }); }}>
          <form className="pq-modal" onSubmit={xuLyDatLaiMatKhau} onClick={e => e.stopPropagation()}>
            <div className="pq-modal__head">
              <h3>Đặt lại mật khẩu</h3>
              <button type="button" className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => { setResetPasswordUser(null); setMatKhauDatLai({ password: '', confirm: '' }); }}><X size={13} /> Đóng</button>
            </div>
            <div className="pq-modal__body">
              <div><b>Tài khoản</b><span className="pq-mono">@{resetPasswordUser.account}</span></div>
              <div><b>Họ tên</b><span>{normalizeDisplayText(resetPasswordUser.fullName)}</span></div>
              <label className="pq-modal__field"><b>Mật khẩu mới</b><input type="password" value={matKhauDatLai.password} onChange={e => setMatKhauDatLai(prev => ({ ...prev, password: e.target.value }))} autoFocus /></label>
              <label className="pq-modal__field"><b>Xác nhận mật khẩu mới</b><input type="password" value={matKhauDatLai.confirm} onChange={e => setMatKhauDatLai(prev => ({ ...prev, confirm: e.target.value }))} /></label>
            </div>
            <div className="pq-modal__foot">
              <button type="button" className="pq-btn pq-btn--ghost" onClick={() => { setResetPasswordUser(null); setMatKhauDatLai({ password: '', confirm: '' }); }}>Hủy</button>
              <button type="submit" className="pq-btn pq-btn--primary" disabled={dangDatLaiMatKhau}>{dangDatLaiMatKhau ? 'Đang cập nhật...' : 'Cập nhật'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
