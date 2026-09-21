'use client';
// ─────────────────────────────────────────────────────────────────────────────
// ModulePhanQuyen.tsx
// Phân quyền theo policy-based model của service-lts (NestJS + Prisma).
// 11 policies, role templates, user policies. Master-detail layout.
// Sử dụng shared auth store thay vì inline auth state.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Shield, Copy, RefreshCw,
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
  type VaiTro,
  type PasswordResetRequestApi,
  type PasswordResetReviewApi,
  POLICY_CATALOG,
  POLICY_CATALOG_UI,
  layTaiKhoanService,
  taoTaiKhoanService,
  kichHoatTaiKhoanService,
  capQuyenService,
  thuHoiQuyenService,
  replaceUserPriceConfigPoliciesService,
  laPolicyCpsxUpgrade,
  luuVaiTroService,
  xoaVaiTroService,
  layVaiTroService,
  chuyenTaiKhoanApi,
  canhBaoLechPolicyService,
  danhSachYeuCauDatLaiMatKhauService,
  duyetYeuCauDatLaiMatKhauService,
} from '../lib/api/service-lts';
import { normalizeDisplayText } from '../lib/text-codec';
import {
  ROLE_FORM_POLICY_CHOICES,
  collapseRolePoliciesToFormChoiceIds,
  expandRoleFormPolicyChoiceCodes,
} from '../lib/role-policy-form';
import { coQuyenQuanLyTaiKhoan } from '../lib/permissions';
import NhapPinDuyetModal from './auth/NhapPinDuyetModal';

// ═════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA  — chỉ dùng làm placeholder khi đang tải dữ liệu từ service-lts
// ═════════════════════════════════════════════════════════════════════════════
const TAI_KHOAN_MAU: TaiKhoan[] = [
  { id: '1', account: 'admin',       fullName: 'Quản trị hệ thống', isActive: true,
    policies: POLICY_CATALOG_UI.map(p => p.code), createdAt: '2025-08-12', lastLogin: '2026-05-25 08:42' },
  { id: '2', account: 'thu.lts',     fullName: 'Lê Thị Thu',         isActive: true,
    policies: ['ACCOUNT_MANAGER','ROLE_MANAGER','USER_POLICY_GRANT'], createdAt: '2025-09-03', lastLogin: '2026-05-24 17:21' },
  { id: '3', account: 'nguyen.an',   fullName: 'Nguyễn Văn An',      isActive: true,
    policies: ['ACCOUNT_MANAGER'], createdAt: '2025-10-19', lastLogin: '2026-05-25 09:05' },
  { id: '4', account: 'phuong.kt',   fullName: 'Trần Thanh Phương',  isActive: false,
    policies: [], createdAt: '2025-11-08' },
  { id: '5', account: 'quan.bd',     fullName: 'Lý Hoài Quân',       isActive: true,
    policies: ['ROLE_MANAGER'], createdAt: '2026-01-22', lastLogin: '2026-05-23 14:11' },
  { id: '6', account: 'mai.nv',      fullName: 'Phạm Hương Mai',     isActive: true,
    policies: [], createdAt: '2026-02-17', lastLogin: '2026-05-22 11:00' },
];

const VAI_TRO_MAU: VaiTro[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Quản trị tối cao',
    description: 'Toàn quyền hệ thống — chỉ dành cho 1–2 tài khoản gốc.',
    policies: POLICY_CATALOG_UI.map(p => p.code),
    granterName: 'Hệ thống',
    updatedAt: '2025-08-12',
  },
  {
    code: 'HR_MANAGER',
    name: 'Quản lý nhân sự',
    description: 'Tạo & quản lý tài khoản nhân viên, không động đến cấu hình quyền.',
    policies: ['ACCOUNT_MANAGER'],
    granterName: 'Nguyễn Văn An',
    updatedAt: '2026-03-04',
  },
  {
    code: 'ROLE_DESIGNER',
    name: 'Thiết kế vai trò',
    description: 'Tạo & sửa mẫu vai trò, không gán cho user.',
    policies: ['ROLE_MANAGER'],
    granterName: 'Lê Thị Thu',
    updatedAt: '2026-04-18',
  },
  {
    code: 'AUDITOR',
    name: 'Kiểm toán nội bộ',
    description: 'Chỉ đọc — phục vụ kiểm tra phân quyền & tài khoản.',
    policies: ['ACTIVITY_MONITOR'],
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

function layCpsxUpgradePolicies(user?: TaiKhoan | null): PolicyCode[] {
  const raw = (user?.priceConfigPolicies ?? [])
    .find(c => c.configName === 'PRODUCTION_UPGRADE')
    ?.policies ?? [];
  return raw.filter((c): c is PolicyCode => typeof c === 'string');
}

function gopQuyenTaiKhoan(user: TaiKhoan): PolicyCode[] {
  return [...new Set([...user.policies, ...layCpsxUpgradePolicies(user)])];
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
  if (nhom === 'Vai trò') return 'pq-chip--role';
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
        </div>
        <div className="pq-row__account">@{user.account}</div>
      </div>
      <div className="pq-row__meta">
        <span className={`pq-dot ${user.isActive ? 'pq-dot--on' : 'pq-dot--off'}`} />
        <span className="pq-row__count">
          {gopQuyenTaiKhoan(user).length}<span className="pq-row__count-sub">/{POLICY_CATALOG_UI.length}</span>
        </span>
      </div>
      <ChevronRight size={15} className="pq-row__chev" />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. INSPECTOR — chi tiết tài khoản + cấp/thu hồi policy
// ═════════════════════════════════════════════════════════════════════════════
function demNguocDen(expiresAt: string, nowMs: number): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (!Number.isFinite(ms) || ms <= 0) return 'Đã hết hạn';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}p ${String(s).padStart(2, '0')}s`;
}

function nhanTrangThaiReset(status: PasswordResetRequestApi['status']): string {
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'accepted') return 'Đã duyệt';
  return 'Đã xác thực mã';
}

function ViewYeuCauMatKhau({
  accessToken,
  coQuyen,
}: {
  accessToken: string | null;
  coQuyen: boolean;
}) {
  const [items, setItems] = useState<PasswordResetRequestApi[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXuLyId, setDangXuLyId] = useState<string | null>(null);
  const [maDaDuyet, setMaDaDuyet] = useState<PasswordResetReviewApi | null>(null);
  const [userDaDuyet, setUserDaDuyet] = useState<PasswordResetRequestApi['user'] | null>(null);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const nap = useCallback(async () => {
    if (!accessToken || !coQuyen) return;
    setDangTai(true);
    setLoi(null);
    try {
      const data = await danhSachYeuCauDatLaiMatKhauService(accessToken);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không tải được danh sách yêu cầu.');
    } finally {
      setDangTai(false);
    }
  }, [accessToken, coQuyen]);

  useEffect(() => {
    void nap();
  }, [nap]);

  useEffect(() => {
    if (!accessToken || !coQuyen) return;
    const t = window.setInterval(() => void nap(), 12_000);
    return () => window.clearInterval(t);
  }, [accessToken, coQuyen, nap]);

  const xuLyReview = async (row: PasswordResetRequestApi, decision: 'accepted' | 'rejected') => {
    if (!accessToken) return;
    setDangXuLyId(row.id);
    setLoi(null);
    try {
      const res = await duyetYeuCauDatLaiMatKhauService(accessToken, row.id, decision);
      if (decision === 'accepted' && res.code) {
        setMaDaDuyet(res);
        setUserDaDuyet(row.user ?? null);
        setCopied(false);
      }
      await nap();
    } catch (error) {
      setLoi(error instanceof Error ? error.message : 'Không xử lý được yêu cầu.');
    } finally {
      setDangXuLyId(null);
    }
  };

  const copyMa = async () => {
    if (!maDaDuyet?.code) return;
    try {
      await navigator.clipboard.writeText(maDaDuyet.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!coQuyen) {
    return (
      <div className="pq-empty">
        Bạn cần quyền <b>Quản lý tài khoản (ACCOUNT_MANAGER)</b> để xem và duyệt yêu cầu đặt lại mật khẩu.
      </div>
    );
  }

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <div className="pq-reset-req">
      <div className="pq-reset-req__toolbar">
        <div className="pq-reset-req__stats">
          <span><b>{items.length}</b> yêu cầu</span>
          <span><b>{pendingCount}</b> chờ duyệt</span>
        </div>
        <button type="button" className="pq-btn pq-btn--ghost" onClick={() => void nap()} disabled={dangTai}>
          <RefreshCw size={14} className={dangTai ? 'um-spin' : undefined} /> Làm mới
        </button>
      </div>

      {loi && <div className="pq-api-error">{loi}</div>}

      <div className="pq-reset-req__table-wrap">
        <table className="pq-reset-req__table">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Trạng thái</th>
              <th>Gửi lúc</th>
              <th>Hết hạn</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="pq-reset-req__empty">
                  {dangTai ? 'Đang tải...' : 'Chưa có yêu cầu đặt lại mật khẩu.'}
                </td>
              </tr>
            ) : (
              items.map(row => {
                const hetHan = new Date(row.expiresAt).getTime() <= nowMs;
                return (
                  <tr key={row.id}>
                    <td className="pq-mono">@{row.user?.account ?? '—'}</td>
                    <td>{normalizeDisplayText(row.user?.fullName || row.user?.account || '—')}</td>
                    <td>
                      <span className={`pq-reset-badge pq-reset-badge--${row.status}`}>
                        {nhanTrangThaiReset(row.status)}
                      </span>
                    </td>
                    <td>{dinhDangNgay(row.createdAt)}</td>
                    <td className={hetHan ? 'pq-reset-exp--bad' : ''}>
                      {demNguocDen(row.expiresAt, nowMs)}
                    </td>
                    <td className="pq-reset-req__actions">
                      {row.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="pq-btn pq-btn--primary pq-btn--sm"
                            disabled={dangXuLyId === row.id || hetHan}
                            onClick={() => void xuLyReview(row, 'accepted')}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="pq-btn pq-btn--ghost pq-btn--sm"
                            disabled={dangXuLyId === row.id}
                            onClick={() => void xuLyReview(row, 'rejected')}
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {maDaDuyet?.code && (
        <div className="pq-modal-backdrop" onClick={() => setMaDaDuyet(null)}>
          <div className="pq-modal pq-reset-code-modal" onClick={e => e.stopPropagation()}>
            <div className="pq-modal__head">
              <h3>Đã duyệt — mã xác thực</h3>
              <button type="button" className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => setMaDaDuyet(null)}>
                <X size={13} /> Đóng
              </button>
            </div>
            <div className="pq-modal__body">
              <div><b>Tài khoản</b><span className="pq-mono">@{userDaDuyet?.account ?? '—'}</span></div>
              <div><b>Họ tên</b><span>{normalizeDisplayText(userDaDuyet?.fullName || userDaDuyet?.account || '—')}</span></div>
              <p className="pq-reset-code-hint">
                Mã chỉ hiện một lần. Chuyển cho user qua kênh ngoài app (chat / gọi điện).
              </p>
              <div className="pq-reset-code-display">{maDaDuyet.code}</div>
              {maDaDuyet.expiresAt && (
                <p className="pq-reset-code-exp">
                  Hết hạn sau: <strong>{demNguocDen(maDaDuyet.expiresAt, nowMs)}</strong>
                </p>
              )}
            </div>
            <div className="pq-modal__foot">
              <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMaDaDuyet(null)}>Đóng</button>
              <button type="button" className="pq-btn pq-btn--primary" onClick={() => void copyMa()}>
                <Copy size={14} /> {copied ? 'Đã sao chép' : 'Sao chép mã'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InspectorTaiKhoan({
  user,
  draftPolicies,
  onToggleDraftPolicy,
  onSavePolicyChanges,
  onCancelPolicyChanges,
  onApplyTemplate,
  onToggleActive,
  templates,
  coQuyenPhanQuyen,
  dangLuuQuyen,
}: {
  user?: TaiKhoan;
  draftPolicies: PolicyCode[];
  onToggleDraftPolicy: (code: PolicyCode) => void;
  onSavePolicyChanges: () => void;
  onCancelPolicyChanges: () => void;
  onApplyTemplate: (template: VaiTro) => void;
  onToggleActive: () => void;
  templates: VaiTro[];
  coQuyenPhanQuyen: boolean;
  dangLuuQuyen: boolean;
}) {
  const [tab, setTab] = useState<'policy' | 'template'>('policy');
  const [tuKhoa, setTuKhoa] = useState('');
  const [policyDangXem, setPolicyDangXem] = useState<Policy | null>(null);

  const danhSachLoc = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase();
    if (!k) return POLICY_CATALOG_UI;
    return POLICY_CATALOG_UI.filter(p =>
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

  const savedAll = gopQuyenTaiKhoan(user);
  const savedPolicySet = new Set(savedAll);
  const draftPolicySet = new Set(draftPolicies);
  const soQuyenThem = draftPolicies.filter(code => !savedPolicySet.has(code)).length;
  const soQuyenThuHoi = savedAll.filter(code => !draftPolicySet.has(code as PolicyCode)).length;
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
        </div>
      </div>

      {/* Stats */}
      <div className="pq-stats">
        <div className="pq-stat">
          <div className="pq-stat__num">{draftPolicies.length}/{POLICY_CATALOG_UI.length}</div>
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
                  {ds.filter(p => draftPolicySet.has(p.code)).length}/{ds.length}
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
                <span>Vai trò</span>
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
// 7. ROLE CARDS — view "Vai trò"
// ═════════════════════════════════════════════════════════════════════════════
function ViewVaiTro({
  roles,
  users,
  onCreateRole,
  onDeleteRole,
}: {
  roles: VaiTro[];
  users: TaiKhoan[];
  onCreateRole: (role: VaiTro) => void;
  onDeleteRole: (role: VaiTro) => void;
}) {
  const [moForm, setMoForm] = useState(false);
  const [ten, setTen] = useState('');
  const [moTa, setMoTa] = useState('');
  const [chon, setChon] = useState<string[]>([]);
  const [tuKhoa, setTuKhoa] = useState('');
  const [locLoai, setLocLoai] = useState<'all' | 'system' | 'custom'>('all');
  const [locTrangThai, setLocTrangThai] = useState<'all' | 'active' | 'inactive'>('all');
  const [trang, setTrang] = useState(1);
  const kichThuocTrang = 4;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const policyCodes = expandRoleFormPolicyChoiceCodes(chon);
    if (!ten.trim() || !policyCodes.length) return;
    const code = ten.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    onCreateRole({ code, name: ten.trim(), description: moTa.trim() || 'Vai trò tùy chỉnh', policies: policyCodes, updatedAt: new Date().toISOString() });
    setTen('');
    setMoTa('');
    setChon([]);
    setMoForm(false);
  };

  const togglePolicy = (choiceId: string) => {
    setChon(prev => prev.includes(choiceId) ? prev.filter(id => id !== choiceId) : [...prev, choiceId]);
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
          <h2>Vai trò & Phân quyền</h2>
          <p>Quản lý các vai trò dùng để phân quyền chức năng cho người dùng.</p>
        </div>
        <button className="pq-btn pq-btn--primary" onClick={() => setMoForm(true)}>
          <Plus size={15} /> Tạo vai trò
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
          <input placeholder="Tìm kiếm vai trò..." value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} />
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
            <label><span>Tên vai trò</span><input value={ten} onChange={e => setTen(e.target.value)} placeholder="Ví dụ: Quản lý tài khoản" required /></label>
            <label><span>Mô tả</span><input value={moTa} onChange={e => setMoTa(e.target.value)} placeholder="Mục đích sử dụng vai trò" /></label>
          </div>
          <div className="pq-role-form__policies">
            {ROLE_FORM_POLICY_CHOICES.map(policy => (
              <label key={policy.id} className={`pq-role-form__policy ${chon.includes(policy.id) ? 'pq-role-form__policy--on' : ''}`}>
                <input type="checkbox" checked={chon.includes(policy.id)} onChange={() => togglePolicy(policy.id)} />
                <span>{policy.ten}</span>
              </label>
            ))}
          </div>
          <div className="pq-role-form__actions">
            <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMoForm(false)}>Hủy</button>
            <button type="submit" className="pq-btn pq-btn--primary">Lưu vai trò</button>
          </div>
        </form>
      )}

      <div className="pq-rd-table-wrap">
        <table className="pq-rd-table">
          <thead>
            <tr>
              <th>Vai trò</th><th>Loại</th><th>Số quyền</th><th>Người dùng</th><th>Quyền nổi bật</th><th>Cập nhật</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {duLieuTrang.length === 0 ? (
              <tr><td colSpan={7} className="pq-rd-empty">Không có vai trò phù hợp.</td></tr>
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
                      <button className="pq-btn pq-btn--ghost pq-btn--sm" onClick={() => { setTen(role.name); setMoTa(role.description); setChon(collapseRolePoliciesToFormChoiceIds(role.policies)); setMoForm(true); }}>Sửa</button>
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
function ViewMaTran({ users, roles }: { users: TaiKhoan[]; roles: VaiTro[] }) {
  const [moiTruong, setMoiTruong] = useState<'user' | 'role'>('user');
  const dong = moiTruong === 'user'
    ? users.map(u => ({
        id: u.id,
        ten: normalizeDisplayText(u.fullName),
        phu: `@${u.account}`,
        avatar: layChuCaiDau(u.fullName),
        avatarColor: layMauAvatar(u.fullName),
        policies: gopQuyenTaiKhoan(u),
        hoatDong: u.isActive,
      }))
    : roles.map(r => ({
        id: r.code,
        ten: r.name,
        phu: r.code,
        avatar: '',
        avatarColor: '',
        policies: r.policies,
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
            <Shield size={14} /> Theo vai trò
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
              {POLICY_CATALOG_UI.map(p => (
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
                {POLICY_CATALOG_UI.map(p => {
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
                  <span>{row.policies.length}</span>/{POLICY_CATALOG_UI.length}
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
// 9. MODULE ROOT — chuyển view theo menu (tai-khoan / .roles / .permissions)
// ═════════════════════════════════════════════════════════════════════════════
type ViewKey = 'users' | 'roles' | 'matrix' | 'password_resets';

function viewTuMenu(menuDangChon?: string): ViewKey {
  if (menuDangChon === 'vai-tro') return 'roles';
  if (menuDangChon === 'phan-quyen') return 'matrix';
  if (menuDangChon === 'yeu-cau-mat-khau') return 'password_resets';
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
  const coQuyenAccountManager = coQuyenQuanLyTaiKhoan(nguoiDungHienTai?.policies ?? []);

  const [users, setUsers]     = useState<TaiKhoan[]>([]);
  const [roles, setRoles]      = useState<VaiTro[]>(VAI_TRO_MAU);
  const [chonId, setChonId]   = useState<string>('');
  const [tuKhoa, setTuKhoa]   = useState('');
  const [locTrangThai, setLocTrangThai] = useState<'all' | 'active' | 'inactive'>('all');
  const [dangTai, setDangTai] = useState(false);
  const [dangLuuQuyen, setDangLuuQuyen] = useState(false);
  const [loiApi, setLoiApi] = useState<string | null>(null);
  const [moFormTaoTaiKhoan, setMoFormTaoTaiKhoan] = useState(false);
  const [taiKhoanMoi, setTaiKhoanMoi] = useState({ account: '', fullName: '', password: '', anhDaiDien: '', ngaySinh: '', gioiTinh: '', soDienThoai: '', email: '' });
  const [draftPolicies, setDraftPolicies] = useState<PolicyCode[]>([]);
  /** Mở modal nhập PIN xác nhận trước khi lưu thay đổi quyền. */
  const [nhapPinXacNhan, setNhapPinXacNhan] = useState(false);

  const userDangChon = users.find(u => u.id === chonId) ?? users[0];

  useEffect(() => {
    // draftPolicies = policies thường (từ user.policies) + CPSX policies (từ user.priceConfigPolicies)
    const base = userDangChon?.policies ?? [];
    const cpsxCodes = layCpsxUpgradePolicies(userDangChon);
    setDraftPolicies(prev => {
      const merged = [
        ...prev.filter(p => !laPolicyCpsxUpgrade(p) && base.includes(p)),
        ...base.filter(p => !laPolicyCpsxUpgrade(p)),
        ...cpsxCodes,
      ];
      return [...new Set(merged)] as PolicyCode[];
    });
  }, [userDangChon?.id, userDangChon?.policies, userDangChon?.priceConfigPolicies]);

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

  const napVaiTro = async () => {
    if (!accessToken) return;
    try {
      const data = await layVaiTroService(accessToken);
      setRoles(data);
    } catch {
      // giữ nguyên dữ liệu cũ nếu lỗi
    }
  };

  // Tải lần đầu khi có access token
  useEffect(() => {
    if (accessToken) {
      void napTaiKhoan();
      void napVaiTro();
      void canhBaoLechPolicyService(accessToken);
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
      setTaiKhoanMoi({ account: '', fullName: '', password: '', anhDaiDien: '', ngaySinh: '', gioiTinh: '', soDienThoai: '', email: '' });
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
      const updated = await kichHoatTaiKhoanService(accessToken, userDangChon.id, !userDangChon.isActive);
      luuUserTuApi(updated);
      await napTaiKhoan();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không cập nhật được trạng thái tài khoản.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyLuuVaiTro = async (role: VaiTro) => {
    if (!accessToken) return;
    const existed = roles.some(item => item.code === role.code);
    setDangTai(true);
    setLoiApi(null);
    try {
      await luuVaiTroService(accessToken, {
        code: role.code,
        name: role.name,
        description: role.description,
        policyCodes: role.policies,
      });
      await napVaiTro();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không lưu được vai trò.');
    } finally {
      setDangTai(false);
    }
  };

  const xuLyXoaVaiTro = async (role: VaiTro) => {
    if (!accessToken) return;
    setDangTai(true);
    setLoiApi(null);
    try {
      await xoaVaiTroService(accessToken, role.code);
      await napVaiTro();
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không xóa được vai trò.');
    } finally {
      setDangTai(false);
    }
  };

  const usersLoc = useMemo(() => {
    return users.filter(u => {
      if (locTrangThai === 'active'    && !u.isActive)    return false;
      if (locTrangThai === 'inactive'  &&  u.isActive)    return false;
      return true;
    });
  }, [users, locTrangThai]);
  const statusChips = [
    { key: 'all', label: 'Tất cả', count: users.length },
    { key: 'active', label: 'Đang hoạt động', count: users.filter(u => u.isActive).length },
    { key: 'inactive', label: 'Đã vô hiệu', count: users.filter(u => !u.isActive).length },
  ] as const;

  const capNhatQuyenTaiKhoan = (userId: string, policies: PolicyCode[]) => {
    // user.policies chỉ chứa policy thường — key CPSX nằm ở priceConfigPolicies (refresh từ server).
    const regular = policies.filter(p => !laPolicyCpsxUpgrade(p));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, policies: regular } : u));
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
    const base = userDangChon?.policies ?? [];
    setDraftPolicies([...base, ...layCpsxUpgradePolicies(userDangChon)]);
    setLoiApi(null);
  };

  const moModalPinXacNhan = () => {
    if (!userDangChon) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    setNhapPinXacNhan(true);
  };

  const luuThayDoiQuyen = async (pinToken: string) => {
    if (!userDangChon || !accessToken) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    const userId = userDangChon.id;
    const draft = new Set(draftPolicies);

    // ── Nguồn gốc: policy thường ở user.policies; key CPSX ở user.priceConfigPolicies ──
    const savedRegular = new Set(userDangChon.policies);
    const cpsxHienCo = layCpsxUpgradePolicies(userDangChon);
    const savedCpsx = new Set(cpsxHienCo);

    // Policy thường: cấp = có trong draft, không có trong saved; thu hồi = ngược lại.
    const regularCap = draftPolicies.filter(code =>
      !laPolicyCpsxUpgrade(code) && !savedRegular.has(code),
    );
    const regularThuHoi = userDangChon.policies.filter(code =>
      !laPolicyCpsxUpgrade(code) && !draft.has(code),
    );

    // Key CPSX: cấp = có trong draft, không có trong saved; thu hồi = ngược lại (từ cpsxHienCo).
    const cpsxCap = draftPolicies.filter(code =>
      laPolicyCpsxUpgrade(code) && !savedCpsx.has(code as PolicyCode),
    );
    const cpsxThuHoi = cpsxHienCo.filter(code => !draft.has(code as PolicyCode));

    if (
      !regularCap.length && !regularThuHoi.length &&
      !cpsxCap.length && !cpsxThuHoi.length
    ) return;

    setDangLuuQuyen(true);
    setLoiApi(null);
    try {
      // 1) Policy thường qua /policies/accounts/:id (PinGuard: x-pin-token)
      if (regularCap.length) await capQuyenService(accessToken, userId, regularCap, pinToken);
      if (regularThuHoi.length) await thuHoiQuyenService(accessToken, userId, regularThuHoi, pinToken);

      // 2) Key CPSX qua /price-config/:userId/configPolicies — REPLACE toàn bộ
      const cpsxFinal: string[] = [
        ...cpsxHienCo.filter(code => !cpsxThuHoi.includes(code)),
        ...cpsxCap,
      ];
      if (cpsxCap.length || cpsxThuHoi.length) {
        await replaceUserPriceConfigPoliciesService(accessToken, userId, [
          { configName: "PRODUCTION_UPGRADE", policies: cpsxFinal },
        ]);
      }

      capNhatQuyenTaiKhoan(userId, draftPolicies);
      await napTaiKhoan(tuKhoa.trim() || undefined);
    } catch (error) {
      setLoiApi(error instanceof Error ? error.message : 'Không lưu được thay đổi quyền.');
    } finally {
      setDangLuuQuyen(false);
    }
  };

  const applyTemplate = (tpl: VaiTro) => {
    if (!userDangChon) return;
    if (!userDangChon.isActive) {
      setLoiApi('Tài khoản này đã dừng hoạt động.');
      return;
    }
    setDraftPolicies(prev => Array.from(new Set([...prev, ...tpl.policies])));
    setLoiApi(null);
  };

  // Tổng quan top
  const tongQuan = useMemo(() => ({
    tongUser:    users.length,
    activeUser:  users.filter(u => u.isActive).length,
    tongRole:    roles.length,
    tongPolicy:  POLICY_CATALOG_UI.length,
  }), [users, roles]);

  const tieuDeView =
    view === 'roles'
      ? 'Vai trò'
      : view === 'matrix'
        ? 'Bảng phân quyền'
        : view === 'password_resets'
          ? 'Yêu cầu đặt lại MK'
          : 'Tài khoản';

  return (
    <div className="pq-root">
      {view !== 'users' && (
        <header className="pq-crm-header">
          <div className="pq-crm-header-left">
            <div className="pq-crm-breadcrumb">
              <span>Hệ thống</span>
              <ChevronRight size={12}/>
              <span className="pq-crm-breadcrumb-current">{tieuDeView}</span>
            </div>
            <h1 className="pq-crm-title">{tieuDeView}</h1>
          </div>
        </header>
      )}

      {view === 'users' && (
        <>
          <div className="pq-crm-stats">
            <span><b>{tongQuan.tongUser}</b> Tài khoản</span>
            <span><b>{tongQuan.activeUser}</b> Đang hoạt động</span>
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
                onSavePolicyChanges={moModalPinXacNhan}
                onCancelPolicyChanges={huyThayDoiQuyen}
                onApplyTemplate={applyTemplate}
                onToggleActive={xuLyToggleActive}
                templates={roles}
                coQuyenPhanQuyen={coQuyenPhanQuyen}
                dangLuuQuyen={dangLuuQuyen}
              />
            </div>
        </>
      )}

      {view === 'roles' && (
        <ViewVaiTro
          roles={roles}
          users={users}
          onCreateRole={xuLyLuuVaiTro}
          onDeleteRole={xuLyXoaVaiTro}
        />
      )}

      {view === 'matrix' && <ViewMaTran users={users} roles={roles} />}

      {view === 'password_resets' && (
        <ViewYeuCauMatKhau
          accessToken={accessToken}
          coQuyen={coQuyenAccountManager}
        />
      )}

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
              <hr className="pq-divider" />
              <label className="pq-modal__field">
                <b>Ảnh đại diện (URL)</b>
                <input value={taiKhoanMoi.anhDaiDien} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, anhDaiDien: e.target.value }))} placeholder="https://example.com/avatar.jpg" />
              </label>
              <div className="pq-modal__row">
                <label className="pq-modal__field">
                  <b>Ngày sinh</b>
                  <input type="date" value={taiKhoanMoi.ngaySinh} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, ngaySinh: e.target.value }))} />
                </label>
                <label className="pq-modal__field">
                  <b>Giới tính</b>
                  <select value={taiKhoanMoi.gioiTinh} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, gioiTinh: e.target.value }))}>
                    <option value="">Chưa chọn</option>
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </label>
              </div>
              <label className="pq-modal__field">
                <b>Số điện thoại</b>
                <input value={taiKhoanMoi.soDienThoai} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, soDienThoai: e.target.value }))} placeholder="0912 345 678" />
              </label>
              <label className="pq-modal__field">
                <b>Địa chỉ email</b>
                <input type="email" value={taiKhoanMoi.email} onChange={e => setTaiKhoanMoi(prev => ({ ...prev, email: e.target.value }))} placeholder="name@company.com" />
              </label>
            </div>
            <div className="pq-modal__foot">
              <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setMoFormTaoTaiKhoan(false)}>Hủy</button>
              <button type="submit" className="pq-btn pq-btn--primary" disabled={dangTai}>{dangTai ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
            </div>
          </form>
        </div>
      )}

      <NhapPinDuyetModal
        open={nhapPinXacNhan}
        title="Xác nhận lưu thay đổi quyền"
        message={
          userDangChon
            ? `Bạn sắp cập nhật quyền cho tài khoản @${userDangChon.account}. Nhập mã PIN 6 số để xác nhận.`
            : 'Nhập mã PIN 6 số để xác nhận.'
        }
        confirmLabel="Xác nhận lưu"
        onConfirm={async (pinToken) => {
          await luuThayDoiQuyen(pinToken);
        }}
        onClose={() => setNhapPinXacNhan(false)}
      />

    </div>
  );
}
