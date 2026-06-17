"use client";
import React, { useState, useEffect } from 'react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import { getPricingDisplayMeta } from '../../lib/pricing-display';
import { normalizeDisplayText } from '../../lib/text-codec';
import { OFFLINE_ACCOUNTS } from '../../store/slices/auth';
import DangNhapModal from '../auth/DangNhapModal';
import DoiMatKhauModal from '../auth/DoiMatKhauModal';
import ModuleKhachHang from '../ModuleKhachHang';
import ModuleNhanVienBan from '../ModuleNhanVienBan';
import ModuleBaoGia from '../ModuleBaoGia';
import ModuleDuyetBaoGia from '../ModuleDuyetBaoGia';
import ModuleLichSuDB from '../ModuleLichSuDB';
import TrangCauHinh from '../TrangCauHinh';
import ModulePhanQuyen from '../ModulePhanQuyen';
import ModuleTaoLenhSanXuat from '../ModuleTaoLenhSanXuat';
import ModuleDanhSachLSX from '../ModuleDanhSachLSX';
import ModuleNhatKy from '../ModuleNhatKy';
import { coTheXemNhomMenu, coTheXemMucMenu, vaiTroTuPolicies } from '../../lib/permissions';
import { tinhThoiGianChoLamMoiPhien, tokenCanLamMoiNgay } from '../../lib/auth-session';
import type { PolicyCode } from '../../lib/api/service-lts';
import {
  Calculator, Users, Menu, Factory,
  X, ChevronRight, Plus, FileText, History, ClipboardList, UserCircle,
  BarChart3, Clock3, TrendingUp, PackageCheck, Settings2, Wrench, Percent,
  Coins, UserPlus, BriefcaseBusiness, ListChecks, KeyRound as KeyRoundIcon,
  LayoutDashboard, Shield,
  LogOut, RefreshCw, KeyRound,
} from 'lucide-react';

// ============================================================
// MODULE DEFINITION
// ============================================================
type MaModule = 'calculator' | 'quotations' | 'create_lsx' | 'lsx_list' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'audit_log';

interface MucMenu {
  key: string;
  id: MaModule;
  label: string;
  icon?: React.ReactNode;
  vaiTros: string[];
  disabled?: boolean;
}

interface NhomMenu {
  id: string;
  soThuTu: number;
  label: string;
  icon: React.ReactNode;
  vaiTros: string[];
  mucCon: MucMenu[];
}

const CAC_NHOM_MENU: NhomMenu[] = [
  {
    id: 'overview',
    soThuTu: 1,
    label: 'Tổng quan',
    icon: <LayoutDashboard size={18} />,
    vaiTros: ['admin', 'sale', 'purchase'],
    mucCon: [
      { key: 'overview.quotes_created', id: 'quotations', label: 'Số báo giá đã tạo', vaiTros: ['admin', 'sale'] },
      { key: 'overview.quotes_pending', id: 'quotations', label: 'Báo giá chờ duyệt', vaiTros: ['admin', 'sale'] },
      { key: 'overview.new_customers', id: 'customers', label: 'Khách hàng mới', vaiTros: ['admin', 'sale'] },
      { key: 'overview.recent_products', id: 'history_db', label: 'Sản phẩm đã tính giá gần đây', vaiTros: ['admin', 'sale'] },
      { key: 'overview.expected_revenue', id: 'quotations', label: 'Doanh thu dự kiến', vaiTros: ['admin', 'sale'] },
      { key: 'overview.recent_activity', id: 'history_db', label: 'Hoạt động gần đây', vaiTros: ['admin', 'sale', 'purchase'] },
    ],
  },
  {
    id: 'pricing_quote',
    soThuTu: 2,
    label: 'Tính giá & Báo giá',
    icon: <Calculator size={18} />,
    vaiTros: ['admin', 'sale'],
    mucCon: [
      { key: 'pricing.create_calculation', id: 'calculator', label: 'Tạo bảng tính giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.create_quote', id: 'quotations', label: 'Tạo bảng báo giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.quote_review', id: 'quotations', label: 'Duyệt báo giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.create_lsx', id: 'create_lsx', label: 'Tạo LSX', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.lsx_list', id: 'lsx_list', label: 'Danh sách LSX', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.history', id: 'history_db', label: 'Lịch sử tính giá và báo giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.audit_log', id: 'audit_log', label: 'Nhật ký thao tác', vaiTros: ['admin', 'sale'] },
    ],
  },
  {
    id: 'customers',
    soThuTu: 3,
    label: 'Khách hàng',
    icon: <Users size={18} />,
    vaiTros: ['admin', 'sale'],
    mucCon: [
      { key: 'customers.list', id: 'customers', label: 'Danh sách khách hàng', vaiTros: ['admin', 'sale'] },
      { key: 'customers.audit_log', id: 'customers', label: 'Nhật ký thao tác', vaiTros: ['admin', 'sale'] },
    ],
  },
  {
    id: 'pricing_config',
    soThuTu: 4,
    label: 'Cấu hình tính giá',
    icon: <Factory size={18} />,
    vaiTros: ['admin', 'purchase'],
    mucCon: [
      { key: 'config.materials', id: 'master_data', label: 'Vật tư / nguyên vật liệu', vaiTros: ['admin', 'purchase'] },
      { key: 'config.production_costs', id: 'master_data', label: 'Chi phí sản xuất', vaiTros: ['admin', 'purchase'] },
      { key: 'config.outsource_costs', id: 'master_data', label: 'Chi phí gia công ngoài', vaiTros: ['admin', 'purchase'] },
      { key: 'config.profit_margin', id: 'master_data', label: 'Biên lợi nhuận', vaiTros: ['admin', 'purchase'] },
      { key: 'config.surcharges', id: 'master_data', label: 'Phụ phí', vaiTros: ['admin', 'purchase'] },
      { key: 'config.interest', id: 'master_data', label: 'Lãi vay công nợ', vaiTros: ['admin', 'purchase'] },
    ],
  },
  {
    id: 'system',
    soThuTu: 5,
    label: 'Quản trị hệ thống',
    icon: <Shield size={18} />,
    vaiTros: ['admin'],
    mucCon: [
      { key: 'system.users', id: 'users', label: 'Tài khoản & quyền', vaiTros: ['admin'] },
      { key: 'system.sellers', id: 'sellers', label: 'Nhân viên kinh doanh', vaiTros: ['admin'] },
      { key: 'system.roles', id: 'users', label: 'Vai trò', vaiTros: ['admin'] },
      { key: 'system.permissions', id: 'users', label: 'Bảng phân quyền', vaiTros: ['admin'] },
      { key: 'system.company_settings', id: 'settings', label: 'Cài đặt công ty', vaiTros: ['admin'] },
      { key: 'system.quote_templates', id: 'settings', label: 'Mẫu báo giá', vaiTros: ['admin'] },
      { key: 'system.audit_log', id: 'audit_log', label: 'Nhật ký hệ thống', vaiTros: ['admin'] },
    ],
  },
];

const CAC_MUC_MENU: MucMenu[] = CAC_NHOM_MENU.flatMap(nhom => nhom.mucCon);
const MOBILE_HUB_PREFIX = 'mobile.hub.';

const MOBILE_TAB_FALLBACK: Record<string, string> = {
  overview: `${MOBILE_HUB_PREFIX}overview`,
  pricing_quote: `${MOBILE_HUB_PREFIX}pricing_quote`,
  customers: `${MOBILE_HUB_PREFIX}customers`,
  pricing_config: `${MOBILE_HUB_PREFIX}pricing_config`,
  system: `${MOBILE_HUB_PREFIX}system`,
};

type MobileHubId = typeof CAC_NHOM_MENU[number]['id'];

type MobileHubAction =
  | { type: 'module'; key: string; module: MaModule }
  | { type: 'changePassword' }
  | { type: 'logout' };

interface MobileHubCardConfig {
  title: string;
  subtitle: string;
  tone: 'violet' | 'sky' | 'emerald' | 'orange' | 'slate' | 'rose';
  icon: React.ReactNode;
  action: MobileHubAction;
}

interface MobileHubConfig {
  id: MobileHubId;
  title: string;
  label: string;
  cards: MobileHubCardConfig[];
}

const laMobileHubKey = (key: string) => key.startsWith(MOBILE_HUB_PREFIX);

const layMobileHubId = (key: string): MobileHubId => {
  if (laMobileHubKey(key)) return key.slice(MOBILE_HUB_PREFIX.length) as MobileHubId;
  return timNhomTheoMenu(key) as MobileHubId;
};

const IS_OFFLINE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

const OFFLINE_ROLE_LABELS: Record<'admin' | 'sale' | 'purchase', string> = {
  admin: 'Admin',
  sale: 'Sale',
  purchase: 'Purchase',
};

// ============================================================
// OFFLINE ROLE SWITCHER
// ============================================================
function DoiVaiTroOffline({ compact }: { compact?: boolean }) {
  const nguoiDung = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const doiTaiKhoan = dungCuaHangTinhGia(s => s.doiTaiKhoanOffline);
  const [dangMo, datDangMo] = useState(false);

  const vaiTroHienTai = (Object.keys(OFFLINE_ACCOUNTS) as Array<'admin' | 'sale' | 'purchase'>).find(
    role => OFFLINE_ACCOUNTS[role].id === nguoiDung?.id
  ) ?? 'admin';

  if (!IS_OFFLINE) return null;

  return (
    <div className="lts-offline-switcher" style={{ position: 'relative' }}>
      <button
        className="lts-offline-switcher-btn"
        onClick={() => datDangMo(!dangMo)}
        title="Đổi tài khoản test"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 6,
          background: 'var(--surface-2, #f0f0f0)', border: '1px solid var(--border, #ddd)',
          cursor: 'pointer', fontSize: '0.8rem', width: '100%',
        }}
      >
        <RefreshCw size={13} />
        {!compact && <span style={{ flex: 1, textAlign: 'left' }}>{normalizeDisplayText(nguoiDung?.fullName || '')}</span>}
        {compact && <span style={{ flex: 1, textAlign: 'left' }}>{OFFLINE_ROLE_LABELS[vaiTroHienTai]}</span>}
      </button>

      {dangMo && (
        <div
          className="lts-offline-switcher-dropdown"
          style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0,
            marginBottom: 4, background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #ddd)', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {(Object.keys(OFFLINE_ACCOUNTS) as Array<'admin' | 'sale' | 'purchase'>).map(role => (
            <button
              key={role}
              onClick={() => { doiTaiKhoan(role); datDangMo(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 12px',
                border: 'none', background: vaiTroHienTai === role ? 'var(--primary-light, #e8f0fe)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem',
                fontWeight: vaiTroHienTai === role ? 600 : 400,
              }}
            >
              {OFFLINE_ROLE_LABELS[role]}
              {vaiTroHienTai === role && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const timNhomTheoMenu = (menuKey: string) => (
  CAC_NHOM_MENU.find(nhom => nhom.mucCon.some(item => item.key === menuKey))?.id ?? CAC_NHOM_MENU[0].id
);

const TIEU_DE_MODULE: Record<MaModule, string> = {
  calculator:        'Tạo bảng tính giá',
  quotations:        'Danh sách báo giá',
  create_lsx:        'Tạo LSX',
  lsx_list:          'Danh sách LSX',
  history_db:        'Lịch sử',
  master_data:       'Cấu hình tính giá',
  customers:         'Khách hàng',
  sellers:           'Nhân viên kinh doanh',
  users:             'Tài khoản & quyền',
  settings:          'Cài đặt hệ thống',
  audit_log:         'Nhật ký thao tác',
};

const MOBILE_HUBS: Record<string, MobileHubConfig> = {
  overview: {
    id: 'overview',
    title: 'Tổng quan',
    label: 'Tổng quan',
    cards: [
      { title: 'Số báo giá đã tạo', subtitle: 'Xem nhanh các báo giá trong hệ thống.', tone: 'violet', icon: <BarChart3 size={30} />, action: { type: 'module', key: 'overview.quotes_created', module: 'quotations' } },
      { title: 'Báo giá chờ duyệt', subtitle: 'Theo dõi báo giá cần xử lý tiếp.', tone: 'orange', icon: <Clock3 size={30} />, action: { type: 'module', key: 'overview.quotes_pending', module: 'quotations' } },
      { title: 'Khách hàng mới', subtitle: 'Xem danh sách khách hàng mới phát sinh.', tone: 'sky', icon: <UserPlus size={30} />, action: { type: 'module', key: 'overview.new_customers', module: 'customers' } },
      { title: 'Sản phẩm đã tính giá gần đây', subtitle: 'Mở lại các bảng tính giá đã lưu.', tone: 'emerald', icon: <History size={30} />, action: { type: 'module', key: 'overview.recent_products', module: 'history_db' } },
      { title: 'Doanh thu dự kiến', subtitle: 'Kiểm tra các báo giá có giá trị doanh thu.', tone: 'rose', icon: <TrendingUp size={30} />, action: { type: 'module', key: 'overview.expected_revenue', module: 'quotations' } },
      { title: 'Hoạt động gần đây', subtitle: 'Xem các thao tác mới nhất trong hệ thống.', tone: 'slate', icon: <ClipboardList size={30} />, action: { type: 'module', key: 'overview.recent_activity', module: 'history_db' } },
    ],
  },
  pricing_quote: {
    id: 'pricing_quote',
    title: 'Tính giá & Báo giá',
    label: 'Tính giá',
    cards: [
      { title: 'Tạo bảng tính giá', subtitle: 'Tạo mới bảng tính giá nhanh chóng.', tone: 'violet', icon: <FileText size={30} />, action: { type: 'module', key: 'pricing.create_calculation', module: 'calculator' } },
      { title: 'Tạo bảng báo giá', subtitle: 'Tạo bảng báo giá gửi khách hàng.', tone: 'sky', icon: <FileText size={30} />, action: { type: 'module', key: 'pricing.create_quote', module: 'quotations' } },
      { title: 'Tạo lệnh sản xuất', subtitle: 'Chuyển thông tin báo giá sang LSX.', tone: 'emerald', icon: <PackageCheck size={30} />, action: { type: 'module', key: 'pricing.create_lsx', module: 'create_lsx' } },
      { title: 'Danh sách lệnh sản xuất', subtitle: 'Theo dõi các LSX đã tạo.', tone: 'slate', icon: <ListChecks size={30} />, action: { type: 'module', key: 'pricing.lsx_list', module: 'lsx_list' } },
      { title: 'Lịch sử tính giá & báo giá', subtitle: 'Xem lại các bảng tính và báo giá đã tạo.', tone: 'emerald', icon: <History size={30} />, action: { type: 'module', key: 'pricing.history', module: 'history_db' } },
      { title: 'Nhật ký thao tác', subtitle: 'Theo dõi các thao tác trong hệ thống.', tone: 'orange', icon: <ClipboardList size={30} />, action: { type: 'module', key: 'pricing.audit_log', module: 'audit_log' } },
    ],
  },
  customers: {
    id: 'customers',
    title: 'Khách hàng',
    label: 'Khách hàng',
    cards: [
      { title: 'Danh sách khách hàng', subtitle: 'Quản lý hồ sơ, liên hệ và phân công.', tone: 'sky', icon: <Users size={30} />, action: { type: 'module', key: 'customers.list', module: 'customers' } },
      { title: 'Nhật ký thao tác', subtitle: 'Theo dõi thay đổi liên quan đến khách hàng.', tone: 'orange', icon: <ClipboardList size={30} />, action: { type: 'module', key: 'customers.audit_log', module: 'customers' } },
    ],
  },
  pricing_config: {
    id: 'pricing_config',
    title: 'Cấu hình',
    label: 'Cấu hình',
    cards: [
      { title: 'Vật tư / nguyên vật liệu', subtitle: 'Cập nhật danh mục vật liệu đầu vào.', tone: 'emerald', icon: <PackageCheck size={30} />, action: { type: 'module', key: 'config.materials', module: 'master_data' } },
      { title: 'Chi phí sản xuất', subtitle: 'Thiết lập các chi phí theo công đoạn.', tone: 'violet', icon: <Factory size={30} />, action: { type: 'module', key: 'config.production_costs', module: 'master_data' } },
      { title: 'Chi phí gia công ngoài', subtitle: 'Quản lý đơn giá thuê ngoài.', tone: 'sky', icon: <Wrench size={30} />, action: { type: 'module', key: 'config.outsource_costs', module: 'master_data' } },
      { title: 'Biên lợi nhuận', subtitle: 'Cấu hình bảng lợi nhuận áp dụng.', tone: 'rose', icon: <Percent size={30} />, action: { type: 'module', key: 'config.profit_margin', module: 'master_data' } },
      { title: 'Phụ phí', subtitle: 'Thiết lập phụ phí và khoản cộng thêm.', tone: 'orange', icon: <Settings2 size={30} />, action: { type: 'module', key: 'config.surcharges', module: 'master_data' } },
      { title: 'Lãi vay công nợ', subtitle: 'Cấu hình lãi vay theo thời hạn thanh toán.', tone: 'slate', icon: <Coins size={30} />, action: { type: 'module', key: 'config.interest', module: 'master_data' } },
    ],
  },
  system: {
    id: 'system',
    title: 'Tài khoản',
    label: 'Tài khoản',
    cards: [
      { title: 'Tài khoản & quyền', subtitle: 'Quản lý người dùng và quyền truy cập.', tone: 'violet', icon: <Shield size={30} />, action: { type: 'module', key: 'system.users', module: 'users' } },
      { title: 'Nhân viên kinh doanh', subtitle: 'Quản lý danh sách nhân viên bán hàng.', tone: 'sky', icon: <BriefcaseBusiness size={30} />, action: { type: 'module', key: 'system.sellers', module: 'sellers' } },
      { title: 'Vai trò', subtitle: 'Thiết lập nhóm vai trò trong hệ thống.', tone: 'emerald', icon: <Users size={30} />, action: { type: 'module', key: 'system.roles', module: 'users' } },
      { title: 'Bảng phân quyền', subtitle: 'Kiểm tra ma trận quyền theo chức năng.', tone: 'orange', icon: <ListChecks size={30} />, action: { type: 'module', key: 'system.permissions', module: 'users' } },
      { title: 'Cài đặt công ty', subtitle: 'Cấu hình thông tin doanh nghiệp.', tone: 'slate', icon: <Settings2 size={30} />, action: { type: 'module', key: 'system.company_settings', module: 'settings' } },
      { title: 'Mẫu báo giá', subtitle: 'Quản lý mẫu biểu báo giá xuất cho khách.', tone: 'rose', icon: <FileText size={30} />, action: { type: 'module', key: 'system.quote_templates', module: 'settings' } },
      { title: 'Nhật ký hệ thống', subtitle: 'Theo dõi hoạt động quản trị.', tone: 'orange', icon: <ClipboardList size={30} />, action: { type: 'module', key: 'system.audit_log', module: 'audit_log' } },
      { title: 'Đổi mật khẩu', subtitle: 'Cập nhật mật khẩu phiên làm việc hiện tại.', tone: 'violet', icon: <KeyRoundIcon size={30} />, action: { type: 'changePassword' } },
      { title: 'Đăng xuất', subtitle: 'Kết thúc phiên làm việc trên thiết bị này.', tone: 'slate', icon: <LogOut size={30} />, action: { type: 'logout' } },
    ],
  },
};

// ============================================================
// SIDEBAR
// ============================================================
interface ThuocTinhThanhBen {
  moduleDangMo: MaModule;
  menuDangChon: string;
  datMenuDangChon: (key: string) => void;
  datModuleDangMo: (id: MaModule) => void;
  dangMo: boolean;
  datDangMo: (v: boolean) => void;
  laMobile: boolean;
  policies: PolicyCode[];
  datHienDoiMatKhau: () => void;
}

function ThanhBen({ moduleDangMo, menuDangChon, datMenuDangChon, datModuleDangMo, dangMo, datDangMo, laMobile, policies, datHienDoiMatKhau }: ThuocTinhThanhBen) {
  const [nhomDangMo, datNhomDangMo] = useState(() => timNhomTheoMenu(menuDangChon));
  const nhomHienThi = CAC_NHOM_MENU.filter(nhom => coTheXemNhomMenu(policies, nhom.id));

  useEffect(() => {
    datNhomDangMo(timNhomTheoMenu(menuDangChon));
  }, [menuDangChon, datNhomDangMo]);

  const xuLyChonNhom = (id: string) => {
    if (!dangMo && !laMobile) datDangMo(true);
    datNhomDangMo(nhomDangMo === id ? '' : id);
  };

  const xuLyDieuHuong = (item: MucMenu) => {
    datMenuDangChon(item.key);
    datModuleDangMo(item.id);
    if (laMobile) datDangMo(false);
  };

  return (
    <>
      {laMobile && dangMo && (
        <div className="lts-sidebar-backdrop" onClick={() => datDangMo(false)} />
      )}

      <aside
        className={`lts-sidebar ${laMobile ? 'lts-sidebar--mobile' : ''} ${laMobile && !dangMo ? 'lts-sidebar--hidden' : ''} ${!laMobile && !dangMo ? 'lts-sidebar--collapsed' : ''}`}
      >
        {/* Logo area */}
        <div className="lts-sidebar-logo">
          {(dangMo || laMobile) ? (
            <span className="lts-sidebar-brand">
              LTS<span className="lts-brand-accent">PRICING</span>
            </span>
          ) : <span className="lts-sidebar-brand-mini">LTS</span>}
          <button
            className="lts-sidebar-toggle"
            onClick={() => datDangMo(!dangMo)}
            title={dangMo ? 'Thu gọn menu' : 'Mở menu'}
          >
            {laMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="lts-sidebar-nav lts-sidebar-nav--tree">
          {nhomHienThi.map((nhom) => {
            const laNhomDangChon = nhom.mucCon.some(item => item.key === menuDangChon);
            const laNhomDangMo = nhomDangMo === nhom.id;
            return (
              <div key={nhom.id} className={`lts-nav-group ${laNhomDangChon ? 'active' : ''} ${laNhomDangMo ? 'open' : ''}`}>
                <button
                  type="button"
                  className="lts-nav-group-title"
                  title={!dangMo && !laMobile ? nhom.label : undefined}
                  onClick={() => xuLyChonNhom(nhom.id)}
                >
                  <span className="lts-nav-group-number">{nhom.soThuTu}</span>
                  <span className="lts-nav-tree-line" />
                  <span className="lts-nav-icon">{nhom.icon}</span>
                  {(dangMo || laMobile) && <span className="lts-nav-group-label">{nhom.label}</span>}
                  {(dangMo || laMobile) && <ChevronRight size={14} className="lts-nav-group-chevron" />}
                </button>
                {(dangMo || laMobile) && laNhomDangMo && (
                  <div className="lts-nav-children">
                    {nhom.mucCon.filter(item => coTheXemMucMenu(policies, item.key)).map((item, index) => (
                      <button
                        key={item.key}
                        onClick={() => xuLyDieuHuong(item)}
                        className={`lts-nav-item lts-nav-item--child ${menuDangChon === item.key ? 'active' : ''}`}
                      >
                        <span className="lts-nav-branch" />
                        <span className="lts-nav-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="lts-sidebar-footer">
          {IS_OFFLINE ? (
            <DoiVaiTroOffline compact={!dangMo && !laMobile} />
          ) : (
            <>
              {(dangMo || laMobile) && (
                <div className="lts-vaiTro-label">Phiên làm việc</div>
              )}
              <div className="lts-sidebar-user">
                <div className="lts-sidebar-user-avatar">
                  {normalizeDisplayText(dungCuaHangTinhGia.getState().nguoiDungHienTai?.fullName || 'U').slice(0, 2).toUpperCase()}
                </div>
                {(dangMo || laMobile) && (
                  <div className="lts-sidebar-user-info">
                    <div className="lts-sidebar-user-name">
                      {normalizeDisplayText(dungCuaHangTinhGia.getState().nguoiDungHienTai?.fullName || 'Unknown')}
                    </div>
                    <div className="lts-sidebar-user-acc">
                      @{dungCuaHangTinhGia.getState().nguoiDungHienTai?.account || '—'}
                    </div>
                  </div>
                )}
                <button
                  className="lts-sidebar-logout lts-sidebar-logout--pw"
                  onClick={datHienDoiMatKhau}
                  title="Đổi mật khẩu"
                  aria-label="Đổi mật khẩu"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  className="lts-sidebar-logout"
                  onClick={() => dungCuaHangTinhGia.getState().logout()}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut size={14} />
                  {(dangMo || laMobile) && <span>Đăng xuất</span>}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function MobileHubScreen({ hub, onAction }: {
  hub: MobileHubConfig;
  onAction: (action: MobileHubAction) => void;
}) {
  return (
    <section className="lts-mobile-hub" aria-label={hub.title}>
      <header className="lts-mobile-hub-header">
        <div className="lts-mobile-hub-nav">
          <button className="lts-mobile-header-menu" type="button" aria-label="Mở menu">
            <Menu size={24} />
          </button>
          <h1>{hub.title}</h1>
          <button className="lts-mobile-primary-action" type="button">
            <Plus size={16} />
            <span>Mới</span>
          </button>
        </div>
      </header>

      <div className="lts-mobile-hub-content">
        {hub.cards.map(card => (
          <button
            key={card.title}
            type="button"
            className="lts-mobile-action-card"
            onClick={() => onAction(card.action)}
          >
            <span className={`lts-mobile-icon-box lts-mobile-icon-box--${card.tone}`}>
              {card.icon}
            </span>
            <span className="lts-mobile-card-copy">
              <strong>{card.title}</strong>
              <small>{card.subtitle}</small>
            </span>
            <ChevronRight className="lts-mobile-card-chevron" size={24} />
          </button>
        ))}
      </div>
    </section>
  );
}

function MobileBottomTabs({ menuDangChon, datMenuDangChon, datModuleDangMo, policies }: {
  menuDangChon: string;
  datMenuDangChon: (key: string) => void;
  datModuleDangMo: (id: MaModule) => void;
  policies: PolicyCode[];
}) {
  const nhomHienThi = CAC_NHOM_MENU.filter(nhom => coTheXemNhomMenu(policies, nhom.id));
  const nhomDangChon = layMobileHubId(menuDangChon);
  const nhanMobileTheoSpec: Partial<Record<NhomMenu['id'], string>> = {
    overview: 'Tổng quan',
    pricing_quote: 'Tính giá',
    crm: 'Khách hàng',
    production: 'Đơn hàng',
    admin: 'Thêm',
  };

  const chonNhom = (nhom: NhomMenu) => {
    const keyMacDinh = MOBILE_TAB_FALLBACK[nhom.id] ?? nhom.mucCon[0]?.key;
    if (!keyMacDinh) return;
    datMenuDangChon(keyMacDinh);
    if (laMobileHubKey(keyMacDinh)) return;

    const muc = CAC_MUC_MENU.find(item => item.key === keyMacDinh);
    if (muc) datModuleDangMo(muc.id);
  };

  return (
    <nav className="lts-mobile-tabbar" aria-label="Điều hướng chính">
      {nhomHienThi.map(nhom => {
        const active = nhom.id === nhomDangChon;
        return (
          <button
            key={nhom.id}
            type="button"
            className={`lts-mobile-tab ${active ? 'active' : ''}`}
            onClick={() => chonNhom(nhom)}
          >
            <span className="lts-mobile-tab-icon">{nhom.id === 'system' ? <UserCircle size={23} /> : nhom.icon}</span>
            <span>{nhanMobileTheoSpec[nhom.id] ?? MOBILE_HUBS[nhom.id]?.label ?? nhom.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================
// TOP HEADER
// ============================================================
interface DauTrangTrenProps {
  moduleDangMo: MaModule;
  onExport: () => void;
  onMenuToggle: () => void;
  laMobile: boolean;
}

function DauTrangTren({ moduleDangMo, onExport, onMenuToggle, laMobile }: DauTrangTrenProps) {
  const { result: ketQua, isDirty: dangBan, resetInput: datLaiDauVao } = dungCuaHangTinhGia();
  const [hienXacNhanMoi, datHienXacNhanMoi] = useState(false);

  const xuLyTaoMoi = () => {
    if (dangBan) datHienXacNhanMoi(true);
    else datLaiDauVao();
  };

  const xacNhanTaoMoi = () => {
    datLaiDauVao();
    datHienXacNhanMoi(false);
  };

  return (
    <>
      {hienXacNhanMoi && (
        <div className="lts-confirm-backdrop" onClick={() => datHienXacNhanMoi(false)}>
          <div className="lts-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="lts-confirm-icon">!</div>
            <h3 className="lts-confirm-title">Chưa lưu báo giá</h3>
            <p className="lts-confirm-desc">
              Bảng tính hiện tại có thay đổi chưa được lưu vào lịch sử.<br />
              Tạo mới sẽ xóa toàn bộ dữ liệu đang nhập.
            </p>
            <div className="lts-confirm-actions">
              <button className="btn btn-outline" onClick={() => datHienXacNhanMoi(false)}>Quay lại</button>
              <button className="btn btn-danger" onClick={xacNhanTaoMoi}>Tạo mới (không lưu)</button>
            </div>
          </div>
        </div>
      )}

      <header className="lts-topbar">
        <div className="lts-topbar-left">
          <h1 className="lts-topbar-title">{TIEU_DE_MODULE[moduleDangMo]}</h1>
          {moduleDangMo === 'calculator' && (
            <button className="lts-new-btn" onClick={xuLyTaoMoi} title="Tạo bảng tính giá mới">
              <Plus size={15} />
              <span>Mới</span>
              {dangBan && <span className="lts-dirty-dot" title="Có thay đổi chưa lưu" />}
            </button>
          )}
        </div>

        <div className="lts-topbar-actions">
          {ketQua && !laMobile && (
            <button className="btn btn-sm btn-outline" onClick={onExport}>
              📥 Xuất
            </button>
          )}
        </div>
      </header>
    </>
  );
}

// ============================================================
// APP SHELL
// ============================================================
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [thanhBenDangMo, datThanhBenDangMo] = useState(true);
  const [laMobile, datLaMobile] = useState(false);
  const [menuDangChon, datMenuDangChon] = useState('pricing.create_calculation');
  const [hienDoiMatKhau, datHienDoiMatKhau] = useState(false);
  const [daKhoiTaoHubMobile, datDaKhoiTaoHubMobile] = useState(false);

  const nguoiDung = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);
  const sessionChecked = dungCuaHangTinhGia(s => s.sessionChecked);
  const accessToken = dungCuaHangTinhGia(s => s.accessToken);
  const lamMoiPhien = dungCuaHangTinhGia(s => s.lamMoiPhien);
  const kiemTraVaKhoiPhucPhien = dungCuaHangTinhGia(s => s.kiemTraVaKhoiPhucPhien);
  const idNhanVienHienTai = dungCuaHangTinhGia(s => s.currentSellerId);
  const vaiTroHienTai = dungCuaHangTinhGia(s => s.role);

  const { result: ketQua, activeModule: moduleDangMo, setActiveModule: datModuleDangMo, setCurrentSeller: datNhanVienHienTai, setRole: datVaiTroStore } = dungCuaHangTinhGia();

  const policies = nguoiDung?.policies ?? [];

  // Restore session on mount
  useEffect(() => {
    if (!sessionChecked) {
      kiemTraVaKhoiPhucPhien();
    }
  }, [sessionChecked, kiemTraVaKhoiPhucPhien]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      lamMoiPhien().catch(error => console.warn('Không làm mới được phiên đăng nhập:', error));
    };

    const timer = setTimeout(refresh, tinhThoiGianChoLamMoiPhien(accessToken));

    const refreshIfNeeded = () => {
      if (document.visibilityState === 'hidden') return;
      if (tokenCanLamMoiNgay(accessToken)) refresh();
    };

    document.addEventListener('visibilitychange', refreshIfNeeded);
    window.addEventListener('focus', refreshIfNeeded);
    window.addEventListener('pageshow', refreshIfNeeded);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshIfNeeded);
      window.removeEventListener('focus', refreshIfNeeded);
      window.removeEventListener('pageshow', refreshIfNeeded);
    };
  }, [accessToken, isAuthenticated, lamMoiPhien]);

  // Sync user info to UISlice when authenticated
  useEffect(() => {
    if (isAuthenticated && nguoiDung) {
      datNhanVienHienTai(nguoiDung.id, nguoiDung.fullName);
      datVaiTroStore(vaiTroTuPolicies(policies));
    }
  }, [isAuthenticated, nguoiDung?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect mobile on mount and resize
  useEffect(() => {
    const kiemTraMobile = () => {
      const chieuRong = window.innerWidth;
      const laManHinhMobile = chieuRong <= 768;
      datLaMobile(laManHinhMobile);
      if (laManHinhMobile) datThanhBenDangMo(false);
      else if (chieuRong < 1280) datThanhBenDangMo(false);
    };
    kiemTraMobile();
    window.addEventListener('resize', kiemTraMobile);
    return () => window.removeEventListener('resize', kiemTraMobile);
  }, []);

  useEffect(() => {
    const key = '__lts_chunk_reload_once__';
    const xuLyLoiChunk = (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      const laLoiChunk = /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(msg);
      if (!laLoiChunk) return;
      if (window.sessionStorage.getItem(key) === '1') return;
      window.sessionStorage.setItem(key, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => xuLyLoiChunk(event.error ?? event.message);
    const onUnhandled = (event: PromiseRejectionEvent) => xuLyLoiChunk(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  useEffect(() => {
    window.sessionStorage.removeItem('__lts_chunk_reload_once__');
  }, [isAuthenticated]);

  useEffect(() => {
    if (!laMobile || daKhoiTaoHubMobile) return;
    datMenuDangChon(MOBILE_TAB_FALLBACK.pricing_quote);
    datDaKhoiTaoHubMobile(true);
  }, [laMobile, daKhoiTaoHubMobile]);

  // Sync menuDangChon when moduleDangMo changes programmatically
  useEffect(() => {
    if (laMobile && laMobileHubKey(menuDangChon)) return;
    // Kiểm tra xem menuDangChon hiện tại có thuộc module đang mở không
    const mucHienTai = CAC_MUC_MENU.find(m => m.key === menuDangChon);
    if (mucHienTai && mucHienTai.id === moduleDangMo) return; // đã đồng bộ

    // Tìm mục menu đầu tiên thuộc module đang mở
    const mucMoi = CAC_MUC_MENU.find(m => m.id === moduleDangMo);
    if (mucMoi) datMenuDangChon(mucMoi.key);
  }, [moduleDangMo, laMobile, menuDangChon]);

  // Sync html classes for overflow control
  useEffect(() => {
    const html = document.documentElement;
    if (moduleDangMo === 'master_data') {
      html.classList.add('in-config-page');
    } else {
      html.classList.remove('in-config-page');
    }
    if (moduleDangMo === 'customers' || moduleDangMo === 'sellers' ||
        moduleDangMo === 'quotations' || moduleDangMo === 'users') {
      html.classList.add('in-crm-page');
    } else {
      html.classList.remove('in-crm-page');
    }
    if (laMobile) html.classList.add('in-crm-page');
  }, [moduleDangMo, laMobile]);

  // Show loading while checking session
  if (!sessionChecked) {
    return (
      <div className="lts-login-root">
        <div className="lts-login-card">
          <div className="lts-login-spinner">
            <span>Đang kiểm tra phiên làm việc...</span>
          </div>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return <DangNhapModal />;
  }

  // Export handler
  const xuLyXuat = () => {
    if (!ketQua) return;
    const kq = ketQua;
    const dinhDangSo = (n: number, d = 1) => n.toLocaleString('vi-VN', { maximumFractionDigits: d });
    const dinhDangPhanTram = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const hienThiGia = getPricingDisplayMeta(kq.input);
    const noiDung = [
      hienThiGia.exportTitle,
      '═'.repeat(50),
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${kq.input.customer || 'N/A'}`,
      `Sản phẩm: ${kq.input.productName || 'N/A'}`,
      `Cấu trúc: ${kq.structureText}`,
      `Số lượng: ${kq.input.quantity.toLocaleString('vi-VN')} ${hienThiGia.quantityUnit}`,
      `Kích thước: ${+(kq.input.spreadWidth * 1000).toFixed(0)} × ${+(kq.input.cutStep * 1000).toFixed(0)} mm²`,
      `Độ dày: ${kq.totalThickness} mic`,
      hienThiGia.isFilm ? '' : `Trọng lượng: ${dinhDangSo(kq.tareWeight, 2)} gr/cái`,
      '',
      hienThiGia.detailTitle,
      '─'.repeat(40),
      `Giá vốn + LN:  ${dinhDangSo(kq.costPerUnit)} đ`,
      `Zipper:        ${dinhDangSo(kq.zipperPerUnit)} đ`,
      `Thùng giấy:    ${dinhDangSo(kq.boxPerUnit)} đ`,
      `${hienThiGia.shippingLabel}:    ${hienThiGia.isPrintFilm ? `${dinhDangSo(kq.shippingTotal, 0)} đ · ${dinhDangSo(kq.shippingPerUnit)} đ/${hienThiGia.unit}` : `${dinhDangSo(kq.shippingPerUnit)} đ`}`,
      `${hienThiGia.interestLabel(kq.interestBase || 0, kq.paymentDays)}:       ${dinhDangSo(kq.interestPerUnit)} đ${hienThiGia.isPrintFilm ? `/${hienThiGia.unit}` : ''}`,
      `Hoa hồng:      ${dinhDangSo(kq.commissionPerUnit)} đ`,
      '─'.repeat(40),
      `GIÁ ĐỀ XUẤT:  ${Math.round(kq.finalPrice).toLocaleString('vi-VN')} đ/${hienThiGia.unit} (chưa VAT)`,
      '',
      `Tỉ lệ LN: ${dinhDangPhanTram(kq.profitRate)}`,
      `Doanh thu: ${kq.revenue.toLocaleString('vi-VN')} đ`,
      `Giá trục in: ${kq.cylinderCost.toLocaleString('vi-VN')} đ (riêng)`,
    ].filter(Boolean).join('\n');

    const tepBlob = new Blob(['\ufeff' + noiDung], { type: 'text/plain;charset=utf-8' });
    const duongDan  = URL.createObjectURL(tepBlob);
    const theTai = document.createElement('a');
    theTai.href     = duongDan;
    theTai.download = `BaoGia_${kq.input.customer || 'N_A'}_${new Date().toISOString().slice(0, 10)}.txt`;
    theTai.click();
    URL.revokeObjectURL(duongDan);
  };

  const xuLyMobileHubAction = (action: MobileHubAction) => {
    if (action.type === 'changePassword') {
      datHienDoiMatKhau(true);
      return;
    }
    if (action.type === 'logout') {
      dungCuaHangTinhGia.getState().logout();
      return;
    }
    datMenuDangChon(action.key);
    datModuleDangMo(action.module);
  };

  const quayLaiHubMobile = () => {
    const hubId = layMobileHubId(menuDangChon);
    datMenuDangChon(MOBILE_TAB_FALLBACK[hubId] ?? MOBILE_TAB_FALLBACK.pricing_quote);
  };

  const hubMobileDangMo = laMobile && laMobileHubKey(menuDangChon)
    ? MOBILE_HUBS[layMobileHubId(menuDangChon)]
    : undefined;

  const tieuDeManHinhMobile = CAC_MUC_MENU.find(item => item.key === menuDangChon)?.label
    ?? TIEU_DE_MODULE[moduleDangMo];
  const tieuDeNhomMobile = MOBILE_HUBS[layMobileHubId(menuDangChon)]?.title
    ?? TIEU_DE_MODULE[moduleDangMo];

  return (
    <div className={`lts-shell ${laMobile ? 'lts-shell--mobile' : ''}`}>
      {!laMobile && (
        <ThanhBen
          moduleDangMo={moduleDangMo}
          menuDangChon={menuDangChon}
          datMenuDangChon={datMenuDangChon}
          datModuleDangMo={datModuleDangMo}
          dangMo={thanhBenDangMo}
          datDangMo={datThanhBenDangMo}
          laMobile={false}
          policies={policies}
          datHienDoiMatKhau={() => datHienDoiMatKhau(true)}
        />
      )}

      <div className="lts-shell-main">
        {!laMobile && moduleDangMo !== 'quotations' && (
          <DauTrangTren
            moduleDangMo={moduleDangMo}
            onExport={xuLyXuat}
            onMenuToggle={() => datThanhBenDangMo(v => !v)}
            laMobile={laMobile}
          />
        )}

        <div className="lts-shell-content lts-shell-content--scroll">
          {hubMobileDangMo ? (
            <MobileHubScreen hub={hubMobileDangMo} onAction={xuLyMobileHubAction} />
          ) : (
            <>
              {laMobile && (
                <header className="lts-mobile-module-header">
                  <button type="button" className="lts-mobile-module-back" onClick={quayLaiHubMobile}>
                    Quay lại
                  </button>
                  <div className="lts-mobile-module-title-stack">
                    <h1>{tieuDeManHinhMobile}</h1>
                    <p>{tieuDeNhomMobile}</p>
                  </div>
                  <span />
                </header>
              )}
              {moduleDangMo === 'calculator'        && children}
              {moduleDangMo === 'quotations'        && (menuDangChon === 'pricing.quote_review'
                ? <ModuleDuyetBaoGia />
                : <ModuleBaoGia role={vaiTroHienTai} menuDangChon={menuDangChon} />)}
              {moduleDangMo === 'create_lsx'        && <ModuleTaoLenhSanXuat />}
              {moduleDangMo === 'lsx_list'          && <ModuleDanhSachLSX />}
              {moduleDangMo === 'history_db'        && <ModuleLichSuDB khiDieuHuong={datModuleDangMo} menuDangChon={menuDangChon} />}
              {moduleDangMo === 'customers'         && <ModuleKhachHang role={vaiTroHienTai} currentSellerId={idNhanVienHienTai} menuDangChon={menuDangChon} />}
              {moduleDangMo === 'sellers'           && <ModuleNhanVienBan />}
              {moduleDangMo === 'master_data'       && <TrangCauHinh menuDangChon={menuDangChon} />}
              {moduleDangMo === 'users'             && <ModulePhanQuyen menuDangChon={menuDangChon} />}
              {moduleDangMo === 'settings'          && <div className="crm-root"><div className="crm-empty"><p>Module này chưa có màn hình chi tiết.</p><p style={{fontSize:'0.85rem',color:'var(--muted)'}}>Mục đang chọn: {CAC_MUC_MENU.find(i => i.key === menuDangChon)?.label ?? menuDangChon}</p></div></div>}
              {moduleDangMo === 'audit_log'         && <ModuleNhatKy menuDangChon={menuDangChon} />}
            </>
          )}
          {/* Fallback: TypeScript đảm bảo MaModule luôn có case ở trên — nếu không có sẽ bắt lỗi compile */}
        </div>
      </div>
      {laMobile && (
        <MobileBottomTabs
          menuDangChon={menuDangChon}
          datMenuDangChon={datMenuDangChon}
          datModuleDangMo={datModuleDangMo}
          policies={policies}
        />
      )}
      {hienDoiMatKhau && <DoiMatKhauModal dong={() => datHienDoiMatKhau(false)} />}
    </div>
  );
}
