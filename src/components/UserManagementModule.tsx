'use client';
// src/components/UserManagementModule.tsx
// Admin-only module for managing user accounts.
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, KeyRound, X, Check, Loader2, ShieldCheck, Users, ShoppingCart, RefreshCw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRole = 'admin' | 'sale' | 'purchase';

interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  sellerId?: string;
  active: boolean;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin:    { label: 'Quản trị',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  icon: <ShieldCheck size={13} /> },
  sale:     { label: 'Kinh doanh', color: '#0891b2', bg: 'rgba(8,145,178,0.1)', icon: <Users size={13} /> },
  purchase: { label: 'Thu mua',   color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: <ShoppingCart size={13} /> },
};

const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
const avatarColor = (s: string) => AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase();

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name), color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.37, fontWeight: 700, letterSpacing: '-0.5px',
    }}>
      {initials(name) || '?'}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 500,
      color: active ? 'var(--green)' : 'var(--muted)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: active ? 'var(--green)' : 'var(--dim)',
        flexShrink: 0,
      }} />
      {active ? 'Hoạt động' : 'Đã tắt'}
    </span>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="um-backdrop" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal-header">
          <span className="um-modal-title">{title}</span>
          <button className="um-icon-btn" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
  background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14,
  outline: 'none', width: '100%',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

// ── Add / Edit modal ──────────────────────────────────────────────────────────
interface UserFormProps {
  initial?: SafeUser;
  onSave: (data: Partial<SafeUser> & { password?: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function UserFormModal({ initial, onSave, onClose, saving }: UserFormProps) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    username:    initial?.username    ?? '',
    displayName: initial?.displayName ?? '',
    password:    '',
    role:        (initial?.role       ?? 'sale') as UserRole,
    sellerId:    initial?.sellerId    ?? '',
    active:      initial?.active      ?? true,
  });
  const [err, setErr] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: key === 'active' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!isEdit && !form.password) { setErr('Vui lòng nhập mật khẩu.'); return; }
    if (form.password && form.password.length < 6) { setErr('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    const payload: Partial<SafeUser> & { id?: string; password?: string } = {
      ...(isEdit ? { id: initial!.id } : {}),
      username:    form.username,
      displayName: form.displayName,
      role:        form.role,
      sellerId:    form.role === 'sale' ? (form.sellerId || undefined) : undefined,
      active:      form.active,
      ...(form.password ? { password: form.password } : {}),
    };
    await onSave(payload);
  };

  return (
    <Modal title={isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 24px' }}>
        <Field label="Tên đăng nhập *">
          <input style={inputStyle} value={form.username} onChange={set('username')}
            placeholder="vd: nguyenvana" disabled={isEdit || saving} required />
        </Field>

        <Field label="Tên hiển thị *">
          <input style={inputStyle} value={form.displayName} onChange={set('displayName')}
            placeholder="vd: Nguyễn Văn A" disabled={saving} required />
        </Field>

        <Field label={isEdit ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}>
          <input style={inputStyle} type="password" value={form.password} onChange={set('password')}
            placeholder={isEdit ? '(không thay đổi)' : '••••••••'} disabled={saving} />
        </Field>

        <Field label="Vai trò *">
          <select style={selectStyle} value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))} disabled={saving}>
            <option value="admin">👑 Quản trị (Admin)</option>
            <option value="sale">💼 Kinh doanh (Sale)</option>
            <option value="purchase">🛒 Thu mua (Purchase)</option>
          </select>
        </Field>

        {form.role === 'sale' && (
          <Field label="Seller ID (liên kết)">
            <input style={inputStyle} value={form.sellerId} onChange={set('sellerId')}
              placeholder="vd: S1" disabled={saving} />
          </Field>
        )}

        {isEdit && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} disabled={saving}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Tài khoản đang hoạt động</span>
          </label>
        )}

        {err && (
          <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.1)', borderRadius: 8,
            color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <Loader2 size={14} className="um-spin" /> : <Check size={14} />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onSave, onClose, saving }:
  { user: SafeUser; onSave: (pw: string) => Promise<void>; onClose: () => void; saving: boolean }) {
  const [pw, setPw]   = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 6) { setErr('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (pw !== pw2)    { setErr('Hai mật khẩu không khớp.'); return; }
    await onSave(pw);
  };

  return (
    <Modal title={`Đặt lại mật khẩu — ${user.displayName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 24px' }}>
        <Field label="Mật khẩu mới *">
          <input style={inputStyle} type="password" value={pw}
            onChange={e => setPw(e.target.value)} placeholder="••••••••" disabled={saving} autoFocus required />
        </Field>
        <Field label="Nhập lại mật khẩu *">
          <input style={inputStyle} type="password" value={pw2}
            onChange={e => setPw2(e.target.value)} placeholder="••••••••" disabled={saving} required />
        </Field>
        {err && (
          <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.1)', borderRadius: 8,
            color: 'var(--red)', fontSize: 13 }}>⚠️ {err}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <Loader2 size={14} className="um-spin" /> : <KeyRound size={14} />}
            Đặt lại mật khẩu
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirmModal({ user, onConfirm, onClose, saving }:
  { user: SafeUser; onConfirm: () => Promise<void>; onClose: () => void; saving: boolean }) {
  return (
    <Modal title="Xác nhận xóa tài khoản" onClose={onClose}>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>
          Bạn có chắc muốn xóa tài khoản <strong>{user.displayName}</strong>{' '}
          (<code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>{user.username}</code>)?
          <br />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Hành động này không thể hoàn tác.</span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 size={14} className="um-spin" /> : <Trash2 size={14} />}
            Xóa tài khoản
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UserManagementModule() {
  const [users, setUsers]       = useState<SafeUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');

  // Modal state
  type ModalType = 'add' | 'edit' | 'reset' | 'delete' | null;
  const [modal, setModal]       = useState<ModalType>(null);
  const [selected, setSelected] = useState<SafeUser | null>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
      else setError(data.message ?? 'Lỗi tải danh sách.');
    } catch {
      setError('Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const closeModal = () => { setModal(null); setSelected(null); };

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  const handleAdd = async (data: Partial<SafeUser> & { password?: string }) => {
    setSaving(true);
    try {
      const res  = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.success) { await fetchUsers(); closeModal(); showToast('✅ Tài khoản đã được tạo.'); }
      else showToast(`❌ ${json.message}`);
    } catch { showToast('❌ Lỗi máy chủ.'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (data: Partial<SafeUser> & { password?: string }) => {
    setSaving(true);
    try {
      const res  = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.success) { await fetchUsers(); closeModal(); showToast('✅ Đã cập nhật tài khoản.'); }
      else showToast(`❌ ${json.message}`);
    } catch { showToast('❌ Lỗi máy chủ.'); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async (password: string) => {
    if (!selected) return;
    await handleEdit({ id: selected.id, password });
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/users?id=${selected.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { await fetchUsers(); closeModal(); showToast('✅ Đã xóa tài khoản.'); }
      else showToast(`❌ ${json.message}`);
    } catch { showToast('❌ Lỗi máy chủ.'); }
    finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="um-root">
      {/* Toast */}
      {toast && <div className="um-toast">{toast}</div>}

      {/* Header */}
      <div className="um-header">
        <div>
          <h2 className="um-title">Quản lý tài khoản</h2>
          <p className="um-subtitle">{users.length} tài khoản trong hệ thống</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={fetchUsers} disabled={loading} title="Làm mới">
            <RefreshCw size={14} className={loading ? 'um-spin' : ''} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
            <Plus size={15} /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10,
          color: 'var(--red)', marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="um-loading">
          <Loader2 size={28} className="um-spin" style={{ color: 'var(--accent)' }} />
          <span>Đang tải danh sách tài khoản…</span>
        </div>
      ) : (
        /* Table */
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Tên đăng nhập</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                    Chưa có tài khoản nào.
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className={!u.active ? 'um-row-inactive' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.displayName} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{u.displayName}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code style={{ background: 'var(--surface2)', padding: '2px 7px', borderRadius: 5, fontSize: 13 }}>
                      {u.username}
                    </code>
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusDot active={u.active} /></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="um-icon-btn" title="Chỉnh sửa"
                        onClick={() => { setSelected(u); setModal('edit'); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="um-icon-btn" title="Đặt lại mật khẩu"
                        onClick={() => { setSelected(u); setModal('reset'); }}>
                        <KeyRound size={15} />
                      </button>
                      <button className="um-icon-btn um-icon-btn--danger" title="Xóa tài khoản"
                        onClick={() => { setSelected(u); setModal('delete'); }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <UserFormModal onSave={handleAdd} onClose={closeModal} saving={saving} />
      )}
      {modal === 'edit' && selected && (
        <UserFormModal initial={selected} onSave={handleEdit} onClose={closeModal} saving={saving} />
      )}
      {modal === 'reset' && selected && (
        <ResetPasswordModal user={selected} onSave={handleResetPassword} onClose={closeModal} saving={saving} />
      )}
      {modal === 'delete' && selected && (
        <DeleteConfirmModal user={selected} onConfirm={handleDelete} onClose={closeModal} saving={saving} />
      )}
    </div>
  );
}
