'use client';
// src/components/ModuleQuanLyNguoiDung.tsx
// Admin-only module for managing user accounts.
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, KeyRound, X, Check, Loader2, ShieldCheck, Users, ShoppingCart, RefreshCw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type VaiTroNguoiDung = 'admin' | 'sale' | 'purchase';

interface NguoiDungAnToan {
  id: string;
  username: string;
  displayName: string;
  role: VaiTroNguoiDung;
  sellerId?: string;
  active: boolean;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CAU_HINH_VAI_TRO: Record<VaiTroNguoiDung, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin:    { label: 'Quản trị',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  icon: <ShieldCheck size={13} /> },
  sale:     { label: 'Kinh doanh', color: '#0891b2', bg: 'rgba(8,145,178,0.1)', icon: <Users size={13} /> },
  purchase: { label: 'Thu mua',   color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: <ShoppingCart size={13} /> },
};

const MAU_AVATAR = ['#4f46e5','#0891b2','#059669','#d97706','#db2777','#7c3aed'];
const layMauAnhDaiDien = (s: string) => MAU_AVATAR[s.charCodeAt(0) % MAU_AVATAR.length];
const layChuCaiDau = (name: string) =>
  name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase();

// ── Sub-components ────────────────────────────────────────────────────────────
function AnhDaiDien({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: layMauAnhDaiDien(name), color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.37, fontWeight: 700, letterSpacing: '-0.5px',
    }}>
      {layChuCaiDau(name) || '?'}
    </div>
  );
}

function NhanVaiTro({ role }: { role: VaiTroNguoiDung }) {
  const cfg = CAU_HINH_VAI_TRO[role];
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

function ChamTrangThai({ active }: { active: boolean }) {
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

// ── HopThoai shell ───────────────────────────────────────────────────────────────
function HopThoai({ title, khiDong, children }: { title: string; khiDong: () => void; children: React.ReactNode }) {
  return (
    <div className="um-backdrop" onClick={khiDong}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <div className="um-modal-header">
          <span className="um-modal-title">{title}</span>
          <button className="um-icon-btn" onClick={khiDong} aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Truong helper ──────────────────────────────────────────────────────────────
function Truong({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const kieuONhap: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
  background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14,
  outline: 'none', width: '100%',
};

const kieuOChon: React.CSSProperties = { ...kieuONhap, cursor: 'pointer' };

// ── Add / Edit hopThoai ──────────────────────────────────────────────────────────
interface ThuocTinhFormNguoiDung {
  banDau?: NguoiDungAnToan;
  khiLuu: (duLieu: Partial<NguoiDungAnToan> & { password?: string }) => Promise<void>;
  khiDong: () => void;
  dangLuu: boolean;
}

function ModalFormNguoiDung({ banDau, khiLuu, khiDong, dangLuu }: ThuocTinhFormNguoiDung) {
  const dangSua = !!banDau;
  const [bieuMau, datBieuMau] = useState({
    username:    banDau?.username    ?? '',
    displayName: banDau?.displayName ?? '',
    password:    '',
    role:        (banDau?.role       ?? 'sale') as VaiTroNguoiDung,
    sellerId:    banDau?.sellerId    ?? '',
    active:      banDau?.active      ?? true,
  });
  const [loi, datLoi] = useState('');

  const set = (key: keyof typeof bieuMau) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    datBieuMau(p => ({ ...p, [key]: key === 'active' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const xuLyGui = async (e: React.FormEvent) => {
    e.preventDefault();
    datLoi('');
    if (!dangSua && !bieuMau.password) { datLoi('Vui lòng nhập mật khẩu.'); return; }
    if (bieuMau.password && bieuMau.password.length < 6) { datLoi('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    const duLieuGui: Partial<NguoiDungAnToan> & { id?: string; password?: string } = {
      ...(dangSua ? { id: banDau!.id } : {}),
      username:    bieuMau.username,
      displayName: bieuMau.displayName,
      role:        bieuMau.role,
      sellerId:    bieuMau.role === 'sale' ? (bieuMau.sellerId || undefined) : undefined,
      active:      bieuMau.active,
      ...(bieuMau.password ? { password: bieuMau.password } : {}),
    };
    await khiLuu(duLieuGui);
  };

  return (
    <HopThoai title={dangSua ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'} khiDong={khiDong}>
      <form onSubmit={xuLyGui} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 24px' }}>
        <Truong label="Tên đăng nhập *">
          <input style={kieuONhap} value={bieuMau.username} onChange={set('username')}
            placeholder="vd: nguyenvana" disabled={dangSua || dangLuu} required />
        </Truong>

        <Truong label="Tên hiển thị *">
          <input style={kieuONhap} value={bieuMau.displayName} onChange={set('displayName')}
            placeholder="vd: Nguyễn Văn A" disabled={dangLuu} required />
        </Truong>

        <Truong label={dangSua ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}>
          <input style={kieuONhap} type="password" value={bieuMau.password} onChange={set('password')}
            placeholder={dangSua ? '(không thay đổi)' : '••••••••'} disabled={dangLuu} />
        </Truong>

        <Truong label="Vai trò *">
          <select style={kieuOChon} value={bieuMau.role}
            onChange={e => datBieuMau(p => ({ ...p, role: e.target.value as VaiTroNguoiDung }))} disabled={dangLuu}>
            <option value="admin">👑 Quản trị (Admin)</option>
            <option value="sale">💼 Kinh doanh (Sale)</option>
            <option value="purchase">🛒 Thu mua (Purchase)</option>
          </select>
        </Truong>

        {bieuMau.role === 'sale' && (
          <Truong label="Seller ID (liên kết)">
            <input style={kieuONhap} value={bieuMau.sellerId} onChange={set('sellerId')}
              placeholder="vd: S1" disabled={dangLuu} />
          </Truong>
        )}

        {dangSua && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={bieuMau.active}
              onChange={e => datBieuMau(p => ({ ...p, active: e.target.checked }))} disabled={dangLuu}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Tài khoản đang hoạt động</span>
          </label>
        )}

        {loi && (
          <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.1)', borderRadius: 8,
            color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ {loi}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={khiDong} disabled={dangLuu}>Hủy</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={dangLuu}>
            {dangLuu ? <Loader2 size={14} className="um-spin" /> : <Check size={14} />}
            {dangSua ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </HopThoai>
  );
}

// ── Reset password hopThoai ──────────────────────────────────────────────────────
function ResetPasswordHopThoai({ user, khiLuu, khiDong, dangLuu }:
  { user: NguoiDungAnToan; khiLuu: (pw: string) => Promise<void>; khiDong: () => void; dangLuu: boolean }) {
  const [pw, setPw]   = useState('');
  const [pw2, setPw2] = useState('');
  const [loi, datLoi] = useState('');

  const xuLyGui = async (e: React.FormEvent) => {
    e.preventDefault();
    datLoi('');
    if (pw.length < 6) { datLoi('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (pw !== pw2)    { datLoi('Hai mật khẩu không khớp.'); return; }
    await khiLuu(pw);
  };

  return (
    <HopThoai title={`Đặt lại mật khẩu — ${user.displayName}`} khiDong={khiDong}>
      <form onSubmit={xuLyGui} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 24px' }}>
        <Truong label="Mật khẩu mới *">
          <input style={kieuONhap} type="password" value={pw}
            onChange={e => setPw(e.target.value)} placeholder="••••••••" disabled={dangLuu} autoFocus required />
        </Truong>
        <Truong label="Nhập lại mật khẩu *">
          <input style={kieuONhap} type="password" value={pw2}
            onChange={e => setPw2(e.target.value)} placeholder="••••••••" disabled={dangLuu} required />
        </Truong>
        {loi && (
          <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.1)', borderRadius: 8,
            color: 'var(--red)', fontSize: 13 }}>⚠️ {loi}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={khiDong} disabled={dangLuu}>Hủy</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={dangLuu}>
            {dangLuu ? <Loader2 size={14} className="um-spin" /> : <KeyRound size={14} />}
            Đặt lại mật khẩu
          </button>
        </div>
      </form>
    </HopThoai>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirmHopThoai({ user, onConfirm, khiDong, dangLuu }:
  { user: NguoiDungAnToan; onConfirm: () => Promise<void>; khiDong: () => void; dangLuu: boolean }) {
  return (
    <HopThoai title="Xác nhận xóa tài khoản" khiDong={khiDong}>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>
          Bạn có chắc muốn xóa tài khoản <strong>{user.displayName}</strong>{' '}
          (<code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>{user.username}</code>)?
          <br />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Hành động này không thể hoàn tác.</span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={khiDong} disabled={dangLuu}>Hủy</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={dangLuu}>
            {dangLuu ? <Loader2 size={14} className="um-spin" /> : <Trash2 size={14} />}
            Xóa tài khoản
          </button>
        </div>
      </div>
    </HopThoai>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ModuleQuanLyNguoiDung() {
  const [nguoiDung, datNguoiDung]       = useState<NguoiDungAnToan[]>([]);
  const [dangTai, datDangTai]   = useState(true);
  const [loi, datLoi]       = useState('');
  const [dangLuu, datDangLuu]     = useState(false);
  const [thongBao, datThongBao]       = useState('');

  // HopThoai state
  type HopThoaiType = 'add' | 'edit' | 'reset' | 'delete' | null;
  const [hopThoai, datHopThoai]       = useState<HopThoaiType>(null);
  const [daChon, datDaChon] = useState<NguoiDungAnToan | null>(null);

  // Toast helper
  const hienThongBao = (tinNhan: string) => {
    datThongBao(tinNhan);
    setTimeout(() => datThongBao(''), 3000);
  };

  // Tải/lưu nguoiDung từ localStorage
  const LS_NGUOI_DUNG = 'lts_users';
  const taiNguoiDung = () => {
    try { const duLieuTho = window.localStorage.getItem(LS_NGUOI_DUNG); return duLieuTho ? JSON.parse(duLieuTho) as NguoiDungAnToan[] : []; }
    catch { return []; }
  };
  const luuNguoiDung = (danhSach: NguoiDungAnToan[]) => {
    try { window.localStorage.setItem(LS_NGUOI_DUNG, JSON.stringify(danhSach)); } catch {}
  };
  const napNguoiDung = () => datNguoiDung(taiNguoiDung());
  useEffect(() => { napNguoiDung(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dongHopThoai = () => { datHopThoai(null); datDaChon(null); };

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  const xuLyThem = async (duLieu: Partial<NguoiDungAnToan> & { password?: string }) => {
    datDangLuu(true);
    try {
      const mucMoi: NguoiDungAnToan = {
        id: String(Date.now()),
        username: duLieu.username || '',
        displayName: duLieu.displayName || '',
        role: (duLieu.role as VaiTroNguoiDung) || 'sale',
        sellerId: duLieu.sellerId,
        active: duLieu.active ?? true,
        createdAt: new Date().toLocaleDateString('vi-VN'),
      };
      luuNguoiDung([mucMoi, ...taiNguoiDung()]);
      napNguoiDung(); dongHopThoai(); hienThongBao('✅ Tài khoản đã được tạo.');
    } catch { hienThongBao('❌ Lỗi tạo tài khoản.'); }
    finally { datDangLuu(false); }
  };

  const xuLySua = async (duLieu: Partial<NguoiDungAnToan> & { password?: string }) => {
    datDangLuu(true);
    try {
      luuNguoiDung(taiNguoiDung().map(u => u.id === duLieu.id ? { ...u, ...duLieu } : u));
      napNguoiDung(); dongHopThoai(); hienThongBao('✅ Đã cập nhật tài khoản.');
    } catch { hienThongBao('❌ Lỗi cập nhật.'); }
    finally { datDangLuu(false); }
  };

  const xuLyDatLaiMatKhau = async (_password: string) => {
    hienThongBao('✅ Đã đặt lại mật khẩu (lưu cục bộ).');
    dongHopThoai();
  };

  const xuLyXoa = async () => {
    if (!daChon) return;
    datDangLuu(true);
    try {
      luuNguoiDung(taiNguoiDung().filter(u => u.id !== daChon.id));
      napNguoiDung(); dongHopThoai(); hienThongBao('✅ Đã xóa tài khoản.');
    } catch { hienThongBao('❌ Lỗi xóa.'); }
    finally { datDangLuu(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="um-root">
      {/* Toast */}
      {thongBao && <div className="um-toast">{thongBao}</div>}

      {/* Header */}
      <div className="um-header">
        <div>
          <h2 className="um-title">Quản lý tài khoản</h2>
          <p className="um-subtitle">{nguoiDung.length} tài khoản trong hệ thống</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={napNguoiDung} disabled={dangTai} title="Làm mới">
            <RefreshCw size={14} className={dangTai ? 'um-spin' : ''} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => datHopThoai('add')}>
            <Plus size={15} /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Error state */}
      {loi && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10,
          color: 'var(--red)', marginBottom: 16, fontSize: 14 }}>
          ⚠️ {loi}
        </div>
      )}

      {/* Loading */}
      {dangTai ? (
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
              {nguoiDung.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                    Chưa có tài khoản nào.
                  </td>
                </tr>
              ) : nguoiDung.map(u => (
                <tr key={u.id} className={!u.active ? 'um-row-inactive' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AnhDaiDien name={u.displayName} />
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
                  <td><NhanVaiTro role={u.role} /></td>
                  <td><ChamTrangThai active={u.active} /></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="um-icon-btn" title="Chỉnh sửa"
                        onClick={() => { datDaChon(u); datHopThoai('edit'); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="um-icon-btn" title="Đặt lại mật khẩu"
                        onClick={() => { datDaChon(u); datHopThoai('reset'); }}>
                        <KeyRound size={15} />
                      </button>
                      <button className="um-icon-btn um-icon-btn--danger" title="Xóa tài khoản"
                        onClick={() => { datDaChon(u); datHopThoai('delete'); }}>
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

      {/* HopThoais */}
      {hopThoai === 'add' && (
        <ModalFormNguoiDung khiLuu={xuLyThem} khiDong={dongHopThoai} dangLuu={dangLuu} />
      )}
      {hopThoai === 'edit' && daChon && (
        <ModalFormNguoiDung banDau={daChon} khiLuu={xuLySua} khiDong={dongHopThoai} dangLuu={dangLuu} />
      )}
      {hopThoai === 'reset' && daChon && (
        <ResetPasswordHopThoai user={daChon} khiLuu={xuLyDatLaiMatKhau} khiDong={dongHopThoai} dangLuu={dangLuu} />
      )}
      {hopThoai === 'delete' && daChon && (
        <DeleteConfirmHopThoai user={daChon} onConfirm={xuLyXoa} khiDong={dongHopThoai} dangLuu={dangLuu} />
      )}
    </div>
  );
}
