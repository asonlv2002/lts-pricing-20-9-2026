"use client";
import React, { useState, useEffect } from 'react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import DangNhapModal from '../auth/DangNhapModal';
import ModuleKhachHang from '../ModuleKhachHang';
import ModuleNhanVienBan from '../ModuleNhanVienBan';
import ModuleBaoGia from '../ModuleBaoGia';
import ModuleLichSuDB from '../ModuleLichSuDB';
import TrangCauHinh from '../TrangCauHinh';
import ModulePhanQuyen from '../ModulePhanQuyen';
import ModuleLenhSanXuat from '../ModuleLenhSanXuat';
import ModuleNhatKy from '../ModuleNhatKy';
import { coTheXemNhomMenu, coTheXemMucMenu, vaiTroTuPolicies } from '../../lib/permissions';
import type { PolicyCode } from '../../lib/api/service-lts';
import {
  Calculator, FileText, Users, Settings, Menu, Factory,
  Database, Briefcase, X, ChevronRight, Plus,
  UserCog, ClipboardList, LayoutDashboard, Package, Shield,
  LogOut,
} from 'lucide-react';

// ============================================================
// MODULE DEFINITION
// ============================================================
type MaModule = 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'production_orders' | 'audit_log';

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
      { key: 'pricing.calculation_list', id: 'history_db', label: 'Danh sách bảng tính giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.calculation_history', id: 'history_db', label: 'Lịch sử tính giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.create_quote', id: 'quotations', label: 'Tạo bảng báo giá', vaiTros: ['admin', 'sale'] },
      { key: 'pricing.quote_list', id: 'quotations', label: 'Danh sách báo giá', vaiTros: ['admin', 'sale'] },
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
      { key: 'customers.create', id: 'customers', label: 'Thêm khách hàng', vaiTros: ['admin', 'sale'] },
      { key: 'customers.seller_assignment', id: 'customers', label: 'Phân công Seller phụ trách', vaiTros: ['admin'] },
      { key: 'customers.quote_history', id: 'quotations', label: 'Lịch sử báo giá theo khách hàng', vaiTros: ['admin', 'sale'] },
      { key: 'customers.product_history', id: 'history_db', label: 'Lịch sử sản phẩm theo khách hàng', vaiTros: ['admin', 'sale'] },
    ],
  },
  {
    id: 'products_orders',
    soThuTu: 4,
    label: 'Sản phẩm & Đơn hàng',
    icon: <Package size={18} />,
    vaiTros: ['admin', 'sale', 'purchase'],
    mucCon: [
      { key: 'products.list', id: 'history_db', label: 'Danh sách sản phẩm', vaiTros: ['admin', 'sale'] },
      { key: 'products.calculated', id: 'history_db', label: 'Sản phẩm đã tính giá', vaiTros: ['admin', 'sale'] },
      { key: 'orders.confirmed', id: 'quotations', label: 'Đơn hàng đã chốt', vaiTros: ['admin', 'sale'] },
      { key: 'orders.production_orders', id: 'production_orders', label: 'Lệnh sản xuất', vaiTros: ['admin', 'purchase'] },
    ],
  },
  {
    id: 'pricing_config',
    soThuTu: 5,
    label: 'Cấu hình tính giá',
    icon: <Factory size={18} />,
    vaiTros: ['admin', 'purchase'],
    mucCon: [
      { key: 'config.materials', id: 'master_data', label: 'Vật tư / nguyên vật liệu', vaiTros: ['admin', 'purchase'] },
      { key: 'config.waste_norms', id: 'master_data', label: 'Bảng định mức hao hụt', vaiTros: ['admin', 'purchase'] },
      { key: 'config.production_costs', id: 'master_data', label: 'Chi phí sản xuất', vaiTros: ['admin', 'purchase'] },
      { key: 'config.outsource_costs', id: 'master_data', label: 'Chi phí gia công ngoài', vaiTros: ['admin', 'purchase'] },
      { key: 'config.profit_margin', id: 'master_data', label: 'Biên lợi nhuận', vaiTros: ['admin', 'purchase'] },
      { key: 'config.surcharges', id: 'master_data', label: 'Phụ phí', vaiTros: ['admin', 'purchase'] },
      { key: 'config.interest', id: 'master_data', label: 'Lãi vay công nợ', vaiTros: ['admin', 'purchase'] },
      { key: 'config.formulas', id: 'master_data', label: 'Tham số / công thức tính giá', vaiTros: ['admin', 'purchase'] },
    ],
  },
  {
    id: 'system',
    soThuTu: 6,
    label: 'Quản trị hệ thống',
    icon: <Shield size={18} />,
    vaiTros: ['admin'],
    mucCon: [
      { key: 'system.users', id: 'users', label: 'Tài khoản & quyền', vaiTros: ['admin'] },
      { key: 'system.sellers', id: 'sellers', label: 'Seller / nhân sự kinh doanh', vaiTros: ['admin'] },
      { key: 'system.roles', id: 'users', label: 'Vai trò', vaiTros: ['admin'] },
      { key: 'system.permissions', id: 'users', label: 'Bảng phân quyền', vaiTros: ['admin'] },
      { key: 'system.company_settings', id: 'settings', label: 'Cài đặt công ty', vaiTros: ['admin'] },
      { key: 'system.quote_templates', id: 'settings', label: 'Mẫu báo giá', vaiTros: ['admin'] },
      { key: 'system.audit_log', id: 'audit_log', label: 'Nhật ký hệ thống', vaiTros: ['admin'] },
    ],
  },
];

const CAC_MUC_MENU: MucMenu[] = CAC_NHOM_MENU.flatMap(nhom => nhom.mucCon);

const timNhomTheoMenu = (menuKey: string) => (
  CAC_NHOM_MENU.find(nhom => nhom.mucCon.some(item => item.key === menuKey))?.id ?? CAC_NHOM_MENU[0].id
);

const TIEU_DE_MODULE: Record<MaModule, string> = {
  calculator:        'Tạo bảng tính giá',
  quotations:        'Danh sách báo giá',
  history_db:        'Lịch sử tính giá',
  master_data:       'Cấu hình tính giá',
  production_orders: 'Lệnh sản xuất',
  customers:         'Khách hàng',
  sellers:           'Seller / nhân sự kinh doanh',
  users:             'Người dùng',
  settings:          'Cài đặt hệ thống',
  audit_log:         'Nhật ký thao tác',
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
}

function ThanhBen({ moduleDangMo, menuDangChon, datMenuDangChon, datModuleDangMo, dangMo, datDangMo, laMobile, policies }: ThuocTinhThanhBen) {
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
                    {nhom.mucCon.map((item, index) => (
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
          {(dangMo || laMobile) && (
            <div className="lts-vaiTro-label">Phiên làm việc</div>
          )}
          <div className="lts-sidebar-user">
            <div className="lts-sidebar-user-avatar">
              {(dungCuaHangTinhGia.getState().nguoiDungHienTai?.fullName || 'U').slice(0, 2).toUpperCase()}
            </div>
            {(dangMo || laMobile) && (
              <div className="lts-sidebar-user-info">
                <div className="lts-sidebar-user-name">
                  {dungCuaHangTinhGia.getState().nguoiDungHienTai?.fullName || 'Unknown'}
                </div>
                <div className="lts-sidebar-user-acc">
                  @{dungCuaHangTinhGia.getState().nguoiDungHienTai?.account || '—'}
                </div>
              </div>
            )}
            <button
              className="lts-sidebar-logout"
              onClick={() => dungCuaHangTinhGia.getState().logout()}
              title="Đăng xuất"
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

// ============================================================
// MOBILE FLOATING MENU
// ============================================================
function MenuNoiMobile({ moduleDangMo, menuDangChon, datMenuDangChon, datModuleDangMo, policies }: {
  moduleDangMo: MaModule;
  menuDangChon: string;
  datMenuDangChon: (key: string) => void;
  datModuleDangMo: (id: MaModule) => void;
  policies: PolicyCode[];
}) {
  const [dangMo, datDangMo] = useState(false);
  const menuHienThi = CAC_NHOM_MENU.flatMap(nhom => nhom.mucCon).filter(item => coTheXemMucMenu(policies, item.key));
  const activeItem = menuHienThi.find(i => i.key === menuDangChon) || menuHienThi.find(i => i.id === moduleDangMo) || menuHienThi[0] || CAC_MUC_MENU[0];

  return (
    <>
      {dangMo && <div className="lts-fab-backdrop" onClick={() => datDangMo(false)} />}

      <div className={`lts-fab-container ${dangMo ? 'open' : ''}`}>
        {dangMo && (
          <div className="lts-fab-popup">
            <div className="lts-fab-header">
              <span>Chuyển tiếp phân hệ</span>
              <button onClick={() => datDangMo(false)}><X size={18} /></button>
            </div>

            <div className="lts-fab-list">
              {CAC_NHOM_MENU.filter(nhom => coTheXemNhomMenu(policies, nhom.id)).flatMap(nhom => nhom.mucCon).map(item => {
                const isActive = item.key === menuDangChon;
                return (
                  <button
                    key={item.key}
                    className={`lts-fab-item ${isActive ? 'active' : ''}`}
                    onClick={() => { datMenuDangChon(item.key); datModuleDangMo(item.id); datDangMo(false); }}
                  >
                    <span className="lts-fab-icon-wrap">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="lts-fab-user">
              <div className="lts-fab-user-info">
                <span>{dungCuaHangTinhGia.getState().nguoiDungHienTai?.fullName || '—'}</span>
              </div>
              <button
                className="lts-fab-logout"
                onClick={() => { dungCuaHangTinhGia.getState().logout(); datDangMo(false); }}
              >
                <LogOut size={14} /> Thoát
              </button>
            </div>
          </div>
        )}

        <button className="lts-fab-trigger" onClick={() => datDangMo(!dangMo)}>
          <span className="lts-fab-icon-wrap">{activeItem.icon}</span>
          <span className="lts-fab-label-below">{activeItem.label}</span>
        </button>
      </div>
    </>
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

  const nguoiDung = dungCuaHangTinhGia(s => s.nguoiDungHienTai);
  const isAuthenticated = dungCuaHangTinhGia(s => s.isAuthenticated);
  const sessionChecked = dungCuaHangTinhGia(s => s.sessionChecked);
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
      const laManHinhMobile = window.innerWidth < 768;
      datLaMobile(laManHinhMobile);
      if (laManHinhMobile) datThanhBenDangMo(false);
    };
    kiemTraMobile();
    window.addEventListener('resize', kiemTraMobile);
    return () => window.removeEventListener('resize', kiemTraMobile);
  }, []);

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
    const noiDung = [
      'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
      '═'.repeat(50),
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${kq.input.customer || 'N/A'}`,
      `Sản phẩm: ${kq.input.productName || 'N/A'}`,
      `Cấu trúc: ${kq.structureText}`,
      `Số lượng: ${kq.input.quantity.toLocaleString('vi-VN')} túi`,
      `Kích thước: ${+(kq.input.spreadWidth * 1000).toFixed(0)} × ${+(kq.input.cutStep * 1000).toFixed(0)} mm²`,
      `Độ dày: ${kq.totalThickness} mic`,
      `Trọng lượng: ${dinhDangSo(kq.tareWeight, 2)} gr/cái`,
      '',
      'CHI TIẾT GIÁ BÁN / TÚI',
      '─'.repeat(40),
      `Giá vốn + LN:  ${dinhDangSo(kq.costPerUnit)} đ`,
      `Zipper:        ${dinhDangSo(kq.zipperPerUnit)} đ`,
      `Thùng giấy:    ${dinhDangSo(kq.boxPerUnit)} đ`,
      `Vận chuyển:    ${dinhDangSo(kq.shippingPerUnit)} đ`,
      `Lãi vay:       ${dinhDangSo(kq.interestPerUnit)} đ`,
      `Hoa hồng:      ${dinhDangSo(kq.commissionPerUnit)} đ`,
      '─'.repeat(40),
      `GIÁ ĐỀ XUẤT:  ${Math.round(kq.finalPrice).toLocaleString('vi-VN')} đ/túi (chưa VAT)`,
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

  return (
    <div className={`lts-shell ${laMobile ? 'lts-shell--mobile' : ''}`}>
      {!laMobile ? (
        <ThanhBen
          moduleDangMo={moduleDangMo}
          menuDangChon={menuDangChon}
          datMenuDangChon={datMenuDangChon}
          datModuleDangMo={datModuleDangMo}
          dangMo={thanhBenDangMo}
          datDangMo={datThanhBenDangMo}
          laMobile={false}
          policies={policies}
        />
      ) : (
        <MenuNoiMobile
          moduleDangMo={moduleDangMo}
          menuDangChon={menuDangChon}
          datMenuDangChon={datMenuDangChon}
          datModuleDangMo={datModuleDangMo}
          policies={policies}
        />
      )}

      <div className="lts-shell-main">
        <DauTrangTren
          moduleDangMo={moduleDangMo}
          onExport={xuLyXuat}
          onMenuToggle={() => datThanhBenDangMo(v => !v)}
          laMobile={laMobile}
        />

        <div className="lts-shell-content lts-shell-content--scroll">
          {moduleDangMo === 'calculator'        && children}
          {moduleDangMo === 'quotations'        && <ModuleBaoGia role={vaiTroHienTai} menuDangChon={menuDangChon} />}
          {moduleDangMo === 'history_db'        && <ModuleLichSuDB khiDieuHuong={datModuleDangMo} menuDangChon={menuDangChon} />}
          {moduleDangMo === 'customers'         && <ModuleKhachHang role={vaiTroHienTai} currentSellerId={idNhanVienHienTai} menuDangChon={menuDangChon} />}
          {moduleDangMo === 'sellers'           && <ModuleNhanVienBan />}
          {moduleDangMo === 'master_data'       && <TrangCauHinh menuDangChon={menuDangChon} />}
          {moduleDangMo === 'users'             && <ModulePhanQuyen menuDangChon={menuDangChon} />}
          {moduleDangMo === 'settings'          && <div className="crm-root"><div className="crm-empty"><p>Module này chưa có màn hình chi tiết.</p><p style={{fontSize:'0.85rem',color:'var(--muted)'}}>Mục đang chọn: {CAC_MUC_MENU.find(i => i.key === menuDangChon)?.label ?? menuDangChon}</p></div></div>}
          {moduleDangMo === 'production_orders' && <ModuleLenhSanXuat />}
          {moduleDangMo === 'audit_log'         && <ModuleNhatKy />}
          {/* Fallback: TypeScript đảm bảo MaModule luôn có case ở trên — nếu không có sẽ bắt lỗi compile */}
        </div>
      </div>
    </div>
  );
}

