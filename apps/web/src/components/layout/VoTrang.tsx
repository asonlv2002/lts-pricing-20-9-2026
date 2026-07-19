"use client";
import React, { useState, useEffect, useRef } from 'react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import { getPricingDisplayMeta } from '../../lib/pricing-display';
import { normalizeDisplayText } from '../../lib/text-codec';
import DangNhapModal from '../auth/DangNhapModal';
import DoiMatKhauModal from '../auth/DoiMatKhauModal';
import ModuleKhachHang from '../ModuleKhachHang';
import ModuleBaoGia from '../ModuleBaoGia';
import ModuleDuyetBaoGia from '../ModuleDuyetBaoGia';
import ModuleLichSuDB from '../ModuleLichSuDB';
import ModuleDanhSachTinhGia from '../ModuleDanhSachTinhGia';
import TrangCauHinh from '../TrangCauHinh';
import ModulePhanQuyen from '../ModulePhanQuyen';
import ModuleTaoLenhSanXuat from '../ModuleTaoLenhSanXuat';
import ModuleDanhSachLSX from '../ModuleDanhSachLSX';
import ModuleNhatKy from '../ModuleNhatKy';
import { coTheXemNhomMenu, coTheXemMucMenu, vaiTroTuPolicies } from '../../lib/permissions';
import { tinhThoiGianChoLamMoiPhien, tokenCanLamMoiNgay } from '../../lib/auth-session';
import {
  docDeepLinkTuSearchParams,
  dongBoUrlDeepLinkClear,
  laLoiDeepLink,
  tieuDeDeepLinkLoi,
  type LoaiDeepLink,
  type TrangThaiDeepLink,
} from '../../lib/support-route';
import {
  TINH_GIA_QUERY,
  docIdTuSearchParams,
  dongBoUrlTinhGia,
  idChiaSeBangTinh,
} from '../../lib/tinh-gia-route';
import {
  BAO_GIA_QUERY,
  docBaoGiaIdTuSearchParams,
  dongBoUrlBaoGia,
} from '../../lib/bao-gia-route';
import { ModalCheDoTinhGia } from '../ModalCheDoTinhGia';
import {
  KHACH_HANG_QUERY,
  docKhachHangIdTuSearchParams,
} from '../../lib/khach-hang-route';
import { timMucLichSuTheoId } from '../../lib/history-identity';
import { layBaoGiaTheoIdService, LoiServiceLts, type PolicyCode } from '../../lib/api/service-lts';
import {
  Calculator, Users, Menu, Factory,
  X, ChevronRight, Plus, FileText, History, ClipboardList, UserCircle,
  BarChart3, Clock3, TrendingUp, PackageCheck, Settings2, Wrench, Percent,
  Coins, UserPlus, ListChecks, KeyRound as KeyRoundIcon,
  LayoutDashboard, Shield,
  LogOut, KeyRound, Search,
} from 'lucide-react';

// ============================================================
// MODULE DEFINITION
// ============================================================
type MaModule = 'calculator' | 'quotations' | 'create_lsx' | 'lsx_list' | 'history_db' | 'master_data' | 'customers' | 'settings' | 'users' | 'audit_log';

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
      { key: 'pricing.create_lsx', id: 'create_lsx', label: 'Tạo LSX', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.history', id: 'history_db', label: 'Danh sách tính giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.quote_review', id: 'quotations', label: 'Danh sách báo giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.lsx_list', id: 'lsx_list', label: 'Danh sách LSX', vaiTros: ['admin', 'sale'] },
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
      { key: 'customers.audit_log', id: 'audit_log', label: 'Nhật ký thao tác', vaiTros: ['admin', 'sale'] },
    ],
  },
  {
    id: 'pricing_config',
    soThuTu: 4,
    label: 'Cấu hình tính giá',
    icon: <Factory size={18} />,
    vaiTros: [],
    mucCon: [
      { key: 'config.materials', id: 'master_data', label: 'Vật tư / nguyên vật liệu', vaiTros: [] },
      { key: 'config.production_costs', id: 'master_data', label: 'Chi phí sản xuất', vaiTros: [] },
      { key: 'config.outsource_costs', id: 'master_data', label: 'Chi phí gia công ngoài', vaiTros: [] },
      { key: 'config.profit_margin', id: 'master_data', label: 'Biên lợi nhuận', vaiTros: [] },
      { key: 'config.surcharges', id: 'master_data', label: 'Phụ phí', vaiTros: [] },
      { key: 'config.interest', id: 'master_data', label: 'Lãi vay công nợ', vaiTros: [] },
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
      { key: 'system.roles', id: 'users', label: 'Vai trò', vaiTros: ['admin'] },
      { key: 'system.permissions', id: 'users', label: 'Bảng phân quyền', vaiTros: ['admin'] },
      { key: 'system.company_settings', id: 'settings', label: 'Cài đặt hệ thống', vaiTros: ['admin'] },
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
      { title: 'Danh sách tính giá', subtitle: 'Xem lại các bảng tính giá đã lưu.', tone: 'emerald', icon: <History size={30} />, action: { type: 'module', key: 'pricing.history', module: 'history_db' } },
      { title: 'Danh sách báo giá', subtitle: 'Danh sách các báo giá đã tạo và gửi khách.', tone: 'sky', icon: <ClipboardList size={30} />, action: { type: 'module', key: 'pricing.quote_review', module: 'quotations' } },
      { title: 'Danh sách lệnh sản xuất', subtitle: 'Theo dõi các LSX đã tạo.', tone: 'slate', icon: <ListChecks size={30} />, action: { type: 'module', key: 'pricing.lsx_list', module: 'lsx_list' } },
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
      { title: 'Vai trò', subtitle: 'Thiết lập nhóm vai trò trong hệ thống.', tone: 'emerald', icon: <Users size={30} />, action: { type: 'module', key: 'system.roles', module: 'users' } },
      { title: 'Bảng phân quyền', subtitle: 'Kiểm tra ma trận quyền theo chức năng.', tone: 'orange', icon: <ListChecks size={30} />, action: { type: 'module', key: 'system.permissions', module: 'users' } },
      { title: 'Cài đặt hệ thống', subtitle: 'Cấu hình thông tin doanh nghiệp.', tone: 'slate', icon: <Settings2 size={30} />, action: { type: 'module', key: 'system.company_settings', module: 'settings' } },
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
  /** Intercept "Tạo bảng tính giá" → wizard mode (nội bộ / gia công) */
  onTaoBangTinhGia?: () => void;
}

function ThanhBen({ moduleDangMo, menuDangChon, datMenuDangChon, datModuleDangMo, dangMo, datDangMo, laMobile, policies, datHienDoiMatKhau, onTaoBangTinhGia }: ThuocTinhThanhBen) {
  const [cacNhomDangMo, datCacNhomDangMo] = useState<string[]>(() => [timNhomTheoMenu(menuDangChon)]);
  const [nhomMobileDangMo, datNhomMobileDangMo] = useState(() => timNhomTheoMenu(menuDangChon));
  const nhomHienThi = CAC_NHOM_MENU.filter(nhom => coTheXemNhomMenu(policies, nhom.id));

  useEffect(() => {
    const nhomTheoMenu = timNhomTheoMenu(menuDangChon);
    datCacNhomDangMo(cacNhom => cacNhom.includes(nhomTheoMenu) ? cacNhom : [...cacNhom, nhomTheoMenu]);
    datNhomMobileDangMo(nhomTheoMenu);
  }, [menuDangChon]);

  const xuLyChonNhom = (id: string) => {
    if (!dangMo && !laMobile) datDangMo(true);
    if (laMobile) {
      datNhomMobileDangMo(nhomMobileDangMo === id ? '' : id);
      return;
    }
    datCacNhomDangMo(cacNhom => cacNhom.includes(id) ? cacNhom.filter(nhom => nhom !== id) : [...cacNhom, id]);
  };

  const xuLyDieuHuong = (item: MucMenu) => {
    if (item.key === 'pricing.create_calculation' && onTaoBangTinhGia) {
      onTaoBangTinhGia();
      if (laMobile) datDangMo(false);
      return;
    }
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
            const laNhomTongQuan = nhom.id === 'overview';
            const laNhomDangChon = nhom.mucCon.some(item => item.key === menuDangChon);
            const laNhomDangMo = laMobile ? nhomMobileDangMo === nhom.id : cacNhomDangMo.includes(nhom.id);
            return (
              <div key={nhom.id} className={`lts-nav-group ${laNhomDangChon ? 'active' : ''} ${laNhomDangMo ? 'open' : ''}`}>
                <button
                  type="button"
                  className="lts-nav-group-title"
                  title={!dangMo && !laMobile ? nhom.label : undefined}
                  onClick={() => xuLyChonNhom(nhom.id)}
                  disabled={laNhomTongQuan}
                >
                  <span className="lts-nav-group-number">{nhom.soThuTu}</span>
                  <span className="lts-nav-tree-line" />
                  <span className="lts-nav-icon">{nhom.icon}</span>
                  {(dangMo || laMobile) && <span className="lts-nav-group-label">{nhom.label}</span>}
                  {(dangMo || laMobile) && <ChevronRight size={14} className="lts-nav-group-chevron" />}
                </button>
                {(dangMo || laMobile) && laNhomDangMo && (
                  <div className="lts-nav-children">
                    {nhom.mucCon.filter(item => coTheXemMucMenu(policies, item.key)).map((item) => {
                      const laMucTongQuan = item.key.startsWith('overview.');
                      return (
                        <button
                          key={item.key}
                          onClick={() => { if (!laMucTongQuan) xuLyDieuHuong(item); }}
                          className={`lts-nav-item lts-nav-item--child ${menuDangChon === item.key ? 'active' : ''}`}
                          disabled={laMucTongQuan}
                        >
                          <span className="lts-nav-branch" />
                          <span className="lts-nav-label">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="lts-sidebar-footer">
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
        </div>
      </aside>
    </>
  );
}

function MobileHubScreen({ hub, onAction }: {
  hub: MobileHubConfig;
  onAction: (action: MobileHubAction) => void;
}) {
  const laTongQuanBiKhoa = hub.id === 'overview';

  return (
    <section className="lts-mobile-hub" aria-label={hub.title}>
      <header className="lts-mobile-hub-header">
        <div className="lts-mobile-hub-nav">
          <button className="lts-mobile-header-menu" type="button" aria-label="Mở menu" disabled={laTongQuanBiKhoa}>
            <Menu size={24} />
          </button>
          <h1>{hub.title}</h1>
          <button className="lts-mobile-primary-action" type="button" disabled={laTongQuanBiKhoa}>
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
            className={`lts-mobile-action-card ${laTongQuanBiKhoa ? 'lts-mobile-action-card--locked' : ''}`}
            onClick={() => { if (!laTongQuanBiKhoa) onAction(card.action); }}
            disabled={laTongQuanBiKhoa}
            aria-disabled={laTongQuanBiKhoa}
          >
            <span className={`lts-mobile-icon-box lts-mobile-icon-box--${card.tone}`}>
              {card.icon}
            </span>
            <span className="lts-mobile-card-copy">
              <strong>{card.title}</strong>
              <small>{card.subtitle}</small>
            </span>
            {laTongQuanBiKhoa ? <span className="lts-mobile-card-lock">Chỉ xem</span> : <ChevronRight className="lts-mobile-card-chevron" size={24} />}
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
  const { result: ketQua, isDirty: dangBan, resetInput: datLaiDauVao, setInput: capNhatDauVao } = dungCuaHangTinhGia();
  const [hienXacNhanMoi, datHienXacNhanMoi] = useState(false);
  const [hienModalCheDo, datHienModalCheDo] = useState(false);

  const xuLyTaoMoi = () => {
    if (dangBan) datHienXacNhanMoi(true);
    else datHienModalCheDo(true);
  };

  const xacNhanTaoMoi = () => {
    datHienXacNhanMoi(false);
    datHienModalCheDo(true);
  };

  const xacNhanCheDo = (mode: import('../../lib/types').PricingMode, steps: import('../../lib/types').OutsourceStep[]) => {
    datLaiDauVao();
    capNhatDauVao({
      pricingMode: mode,
      outsource: mode === 'outsource' ? { steps } : undefined,
    });
    datHienModalCheDo(false);
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
      <ModalCheDoTinhGia
        open={hienModalCheDo}
        onClose={() => datHienModalCheDo(false)}
        onConfirm={xacNhanCheDo}
      />

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

  const {
    result: ketQua,
    activeModule: moduleDangMo,
    setActiveModule: datModuleDangMo,
    setCurrentSeller: datNhanVienHienTai,
    setRole: datVaiTroStore,
    loadedHistoryId,
    history: lichSu,
    moBangTinhVoiPin,
    taiBangTinhTuServer,
    taiLichSuTuServer,
    resetInput,
    baoGiaDangSua,
    datBaoGiaDangSua,
    datNguonWizard,
  } = dungCuaHangTinhGia();

  const policies = nguoiDung?.policies ?? [];
  const deepLinkDaXuLy = useRef<string | null>(null);
  const [deepLinkLoai, datDeepLinkLoai] = useState<LoaiDeepLink | null>(null);
  const [deepLinkTrangThai, datDeepLinkTrangThai] = useState<TrangThaiDeepLink>('idle');
  const [deepLinkRetryDem, datDeepLinkRetryDem] = useState(0);
  const [hienModalCheDoDeep, datHienModalCheDoDeep] = useState(false);

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

  // Sync user info to UISlice when authenticated / policies change (login, restore, grant/revoke)
  useEffect(() => {
    if (isAuthenticated && nguoiDung) {
      datNhanVienHienTai(nguoiDung.id, nguoiDung.fullName);
      datVaiTroStore(vaiTroTuPolicies(policies));
    }
  }, [isAuthenticated, nguoiDung?.id, policies.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rời màn cấu hình nếu user không còn PRICE_CONFIG_MANAGER (login user khác / revoke / restore)
  useEffect(() => {
    if (!isAuthenticated || !sessionChecked) return;

    const coQuyenConfig = policies.includes('PRICE_CONFIG_MANAGER');
    const dangOConfig =
      moduleDangMo === 'master_data' || menuDangChon.startsWith('config.');

    if (!coQuyenConfig && dangOConfig) {
      datMenuDangChon('pricing.create_calculation');
      datModuleDangMo('calculator');
    }
  }, [
    isAuthenticated,
    sessionChecked,
    policies,
    moduleDangMo,
    menuDangChon,
    datMenuDangChon,
    datModuleDangMo,
  ]);

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

    // Tìm mục menu đầu tiên thuộc module đang mở, ưu tiên menu nghiệp vụ thay vì thẻ tổng quan.
    const mucMoi = CAC_MUC_MENU.find(m => m.id === moduleDangMo && !m.key.startsWith('overview.'))
      ?? CAC_MUC_MENU.find(m => m.id === moduleDangMo);
    if (mucMoi) datMenuDangChon(mucMoi.key);
  }, [moduleDangMo, laMobile, menuDangChon]);

  // Deep-link: /?tinh-gia=<id> | /?bao-gia=<id> | /?khach-hang=<code>
  useEffect(() => {
    if (!isAuthenticated || !sessionChecked) return;
    const deep = docDeepLinkTuSearchParams(window.location.search, [
      { loai: 'tinh-gia', key: TINH_GIA_QUERY },
      { loai: 'bao-gia', key: BAO_GIA_QUERY },
      { loai: 'khach-hang', key: KHACH_HANG_QUERY },
    ]);
    if (!deep) {
      deepLinkDaXuLy.current = null;
      datDeepLinkLoai(null);
      datDeepLinkTrangThai('idle');
      return;
    }
    const keyXuLy = `${deep.loai}:${deep.id}`;
    if (deepLinkDaXuLy.current === keyXuLy) return;

    let huy = false;
    datDeepLinkLoai(deep.loai);
    // Khách hàng dùng panel — không full-page loading; ModuleKhachHang xử lý panel
    if (deep.loai !== 'khach-hang') {
      datDeepLinkTrangThai('loading');
    }

    const ganLoiDeepLink = (error: unknown) => {
      deepLinkDaXuLy.current = null;
      const status = error instanceof LoiServiceLts ? error.status : undefined;
      if (status === 429) datDeepLinkTrangThai('rate_limited');
      else if (status === 403) datDeepLinkTrangThai('forbidden');
      else if (status === 404) datDeepLinkTrangThai('not_found');
      else datDeepLinkTrangThai('error');
    };

    const moDeepLink = async () => {
      if (deep.loai === 'khach-hang') {
        if (huy) return;
        datMenuDangChon('customers.list');
        datModuleDangMo('customers');
        deepLinkDaXuLy.current = keyXuLy;
        datDeepLinkTrangThai('ok');
        return;
      }

      if (deep.loai === 'tinh-gia') {
        try {
          const local = timMucLichSuTheoId(dungCuaHangTinhGia.getState().history, deep.id);
          if (local && !local.isQuote) {
            if (huy) return;
            await moBangTinhVoiPin(local.id);
            if (huy) return;
            datModuleDangMo('calculator');
            deepLinkDaXuLy.current = keyXuLy;
            datDeepLinkTrangThai('ok');
            return;
          }

          await taiLichSuTuServer().catch(() => false);
          if (huy) return;

          const sauTai = timMucLichSuTheoId(dungCuaHangTinhGia.getState().history, deep.id);
          if (sauTai && !sauTai.isQuote) {
            await moBangTinhVoiPin(sauTai.id);
            if (huy) return;
            datModuleDangMo('calculator');
            deepLinkDaXuLy.current = keyXuLy;
            datDeepLinkTrangThai('ok');
            return;
          }

          const ok = await taiBangTinhTuServer(deep.id);
          if (huy) return;
          if (ok) {
            datModuleDangMo('calculator');
            deepLinkDaXuLy.current = keyXuLy;
            datDeepLinkTrangThai('ok');
            return;
          }

          deepLinkDaXuLy.current = null;
          datDeepLinkTrangThai('not_found');
        } catch (error) {
          if (huy) return;
          ganLoiDeepLink(error);
        }
        return;
      }

      if (deep.loai === 'bao-gia') {
        try {
          const bg = await layBaoGiaTheoIdService(deep.id, accessToken ?? undefined);
          if (huy) return;
          datBaoGiaDangSua(bg);
          datNguonWizard('list');
          datMenuDangChon('pricing.create_quote');
          datModuleDangMo('quotations');
          deepLinkDaXuLy.current = keyXuLy;
          datDeepLinkTrangThai('ok');
        } catch (error) {
          if (huy) return;
          ganLoiDeepLink(error);
        }
      }
    };

    void moDeepLink();
    return () => {
      huy = true;
    };
  }, [
    isAuthenticated,
    sessionChecked,
    accessToken,
    moBangTinhVoiPin,
    taiBangTinhTuServer,
    taiLichSuTuServer,
    datModuleDangMo,
    datBaoGiaDangSua,
    datNguonWizard,
    deepLinkRetryDem,
  ]);

  // Đồng bộ URL (copy-share): tính giá / báo giá — khách hàng do ModuleKhachHang giữ
  useEffect(() => {
    if (!isAuthenticated || !sessionChecked) return;
    if (deepLinkTrangThai === 'loading' || laLoiDeepLink(deepLinkTrangThai)) return;
    // Panel KH tự sync ?khach-hang= — không đụng ở đây
    if (moduleDangMo === 'customers') return;

    if (moduleDangMo === 'calculator' && loadedHistoryId) {
      const item = timMucLichSuTheoId(lichSu, loadedHistoryId);
      const idShare = idChiaSeBangTinh(item ?? { id: loadedHistoryId });
      dongBoUrlTinhGia(idShare);
      return;
    }

    if (
      moduleDangMo === 'quotations'
      && menuDangChon === 'pricing.create_quote'
      && baoGiaDangSua?.id
    ) {
      dongBoUrlBaoGia(baoGiaDangSua.id);
      return;
    }

    if (docIdTuSearchParams(window.location.search) || docBaoGiaIdTuSearchParams(window.location.search)) {
      dongBoUrlDeepLinkClear();
    }
  }, [
    isAuthenticated,
    sessionChecked,
    moduleDangMo,
    menuDangChon,
    loadedHistoryId,
    lichSu,
    baoGiaDangSua?.id,
    deepLinkTrangThai,
  ]);

  // Sync html classes for overflow control
  useEffect(() => {
    const html = document.documentElement;
    if (moduleDangMo === 'master_data') {
      html.classList.add('in-config-page');
    } else {
      html.classList.remove('in-config-page');
    }
    if (moduleDangMo === 'customers' ||
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

  const moWizardTaoBangTinh = () => {
    datHienModalCheDoDeep(true);
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
    if (action.key === 'pricing.create_calculation') {
      moWizardTaoBangTinh();
      return;
    }
    datMenuDangChon(action.key);
    datModuleDangMo(action.module);
  };

  const quayLaiHubMobile = () => {
    const hubId = layMobileHubId(menuDangChon);
    datMenuDangChon(MOBILE_TAB_FALLBACK[hubId] ?? MOBILE_TAB_FALLBACK.pricing_quote);
  };

  const dongDeepLinkLoi = () => {
    deepLinkDaXuLy.current = null;
    datDeepLinkLoai(null);
    datDeepLinkTrangThai('idle');
    dongBoUrlDeepLinkClear();
  };

  const thuLaiDeepLink = () => {
    deepLinkDaXuLy.current = null;
    datDeepLinkTrangThai('loading');
    datDeepLinkRetryDem((n) => n + 1);
  };

  const veDanhSachTinhGia = () => {
    dongDeepLinkLoi();
    datMenuDangChon('pricing.history');
    datModuleDangMo('history_db');
  };

  const taoBangTinhMoi = () => {
    dongDeepLinkLoi();
    moWizardTaoBangTinh();
  };
  const xacNhanCheDoDeep = (mode: import('../../lib/types').PricingMode, steps: import('../../lib/types').OutsourceStep[]) => {
    resetInput();
    dungCuaHangTinhGia.getState().setInput({
      pricingMode: mode,
      outsource: mode === 'outsource' ? { steps } : undefined,
    });
    datMenuDangChon('pricing.create_calculation');
    datModuleDangMo('calculator');
    datHienModalCheDoDeep(false);
  };

  const veDanhSachBaoGia = () => {
    dongDeepLinkLoi();
    datBaoGiaDangSua(null);
    datMenuDangChon('pricing.quote_review');
    datModuleDangMo('quotations');
  };

  const taoBaoGiaMoi = () => {
    dongDeepLinkLoi();
    datBaoGiaDangSua(null);
    datNguonWizard(null);
    datMenuDangChon('pricing.create_quote');
    datModuleDangMo('quotations');
  };

  const coTheThuLaiDeepLink =
    deepLinkTrangThai === 'rate_limited' || deepLinkTrangThai === 'error';

  const nutEmptyDeepLink = deepLinkLoai === 'bao-gia'
    ? {
        primary: coTheThuLaiDeepLink
          ? { label: 'Thử lại', onClick: thuLaiDeepLink }
          : { label: 'Về danh sách báo giá', onClick: veDanhSachBaoGia },
        outline: coTheThuLaiDeepLink
          ? { label: 'Về danh sách báo giá', onClick: veDanhSachBaoGia }
          : { label: 'Tạo báo giá mới', onClick: taoBaoGiaMoi },
        loading: 'Đang tải báo giá...',
      }
    : {
        primary: coTheThuLaiDeepLink
          ? { label: 'Thử lại', onClick: thuLaiDeepLink }
          : { label: 'Về danh sách tính giá', onClick: veDanhSachTinhGia },
        outline: coTheThuLaiDeepLink
          ? { label: 'Về danh sách tính giá', onClick: veDanhSachTinhGia }
          : { label: 'Tạo bảng tính mới', onClick: taoBangTinhMoi },
        loading: 'Đang tải bảng tính giá...',
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
      {/* Toast trượt từ phải — dùng chung mọi module (copy URL, v.v.) */}
      <div className="toast-container" id="toastContainer" />
      <ModalCheDoTinhGia
        open={hienModalCheDoDeep}
        onClose={() => datHienModalCheDoDeep(false)}
        onConfirm={xacNhanCheDoDeep}
      />
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
          onTaoBangTinhGia={moWizardTaoBangTinh}
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
          {deepLinkTrangThai === 'loading' ? (
            <div className="crm-root">
              <div className="crm-empty" role="status" aria-live="polite">
                <p>{nutEmptyDeepLink.loading}</p>
              </div>
            </div>
          ) : laLoiDeepLink(deepLinkTrangThai) && deepLinkLoai ? (
            <div className="crm-root">
              <div className="crm-empty lts-deep-link-empty" role="status">
                <Search size={40} style={{ opacity: 0.4 }} aria-hidden />
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground, #374151)', margin: 0 }}>
                  {tieuDeDeepLinkLoi(deepLinkLoai, deepLinkTrangThai)}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                  <button type="button" className="btn btn-primary" onClick={nutEmptyDeepLink.primary.onClick}>
                    {nutEmptyDeepLink.primary.label}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={nutEmptyDeepLink.outline.onClick}>
                    {nutEmptyDeepLink.outline.label}
                  </button>
                </div>
              </div>
            </div>
          ) : hubMobileDangMo ? (
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
                ? <ModuleDuyetBaoGia khiDieuHuong={(key) => { datMenuDangChon(key); datModuleDangMo('quotations'); }} />
                : <ModuleBaoGia role={vaiTroHienTai} menuDangChon={menuDangChon} khiDieuHuong={(key) => { datMenuDangChon(key); datModuleDangMo('quotations'); }} />)}
              {moduleDangMo === 'create_lsx'        && <ModuleTaoLenhSanXuat />}
              {moduleDangMo === 'lsx_list'          && <ModuleDanhSachLSX />}
              {moduleDangMo === 'history_db'        && (menuDangChon === 'pricing.history'
                ? <ModuleDanhSachTinhGia khiDieuHuong={(m) => datModuleDangMo(m)} />
                : <ModuleLichSuDB khiDieuHuong={datModuleDangMo} menuDangChon={menuDangChon} />)}
              {moduleDangMo === 'customers'         && (
                <ModuleKhachHang
                  role={vaiTroHienTai}
                  currentSellerId={idNhanVienHienTai}
                  menuDangChon={menuDangChon}
                  deepLinkCode={docKhachHangIdTuSearchParams(
                    typeof window !== 'undefined' ? window.location.search : null,
                  )}
                />
              )}
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
