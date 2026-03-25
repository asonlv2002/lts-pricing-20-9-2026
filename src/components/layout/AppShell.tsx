"use client";
import React, { useState, useEffect } from 'react';
import { useCalculatorStore } from '../../store/calculatorStore';
import CustomerModule from '../CustomerModule';
import SellerModule from '../SellerModule';
import QuotationModule from '../QuotationModule';
import ConfigPage from '../ConfigPage';
import {
  Calculator, FileText, Users, Settings, Menu, Factory,
  Database, Printer, Briefcase, X, ChevronRight
} from 'lucide-react';

// ============================================================
// MODULE DEFINITION
// ============================================================
type ModuleId = 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'calculator',  label: 'Tính giá Sản phẩm',  icon: <Calculator size={20} />, roles: ['admin', 'sale', 'tech'] },
  { id: 'quotations',  label: 'Danh sách Báo giá',   icon: <FileText   size={20} />, roles: ['admin', 'sale']         },
  { id: 'history_db',  label: 'Lịch sử tính giá',    icon: <Database   size={20} />, roles: ['admin', 'sale']         },
  { id: 'master_data', label: 'Bảng định mức',        icon: <Factory    size={20} />, roles: ['admin', 'tech']         },
  { id: 'customers',   label: 'Khách hàng (CRM)',     icon: <Users      size={20} />, roles: ['admin', 'sale']         },
  { id: 'sellers',     label: 'Quản lý Seller',       icon: <Briefcase  size={20} />, roles: ['admin']                 },
  { id: 'settings',    label: 'Cài đặt hệ thống',     icon: <Settings   size={20} />, roles: ['admin']                 },
];

const MODULE_TITLES: Record<ModuleId, string> = {
  calculator:  'Tính giá Bao bì',
  quotations:  'Danh sách Báo giá',
  history_db:  'Lịch sử tính giá',
  master_data: 'Bảng định mức vật liệu',
  customers:   'Quản lý Khách hàng',
  sellers:     'Quản lý Seller',
  settings:    'Cài đặt hệ thống',
};

// ============================================================
// SIDEBAR
// ============================================================
interface SidebarProps {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  role: string;
  setRole: (r: string) => void;
  isOpen: boolean;        // desktop: collapsed/expanded | mobile: hidden/visible
  setIsOpen: (v: boolean) => void;
  isMobile: boolean;
}

function Sidebar({ activeModule, setActiveModule, role, setRole, isOpen, setIsOpen, isMobile }: SidebarProps) {
  const visibleMenu = MENU_ITEMS.filter(item => item.roles.includes(role));

  const handleNav = (id: ModuleId) => {
    setActiveModule(id);
    if (isMobile) setIsOpen(false); // close drawer on mobile after nav
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div className="lts-sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`lts-sidebar ${isMobile ? 'lts-sidebar--mobile' : ''} ${isMobile && !isOpen ? 'lts-sidebar--hidden' : ''}`}
        style={!isMobile ? { width: isOpen ? '240px' : '72px' } : undefined}
      >
        {/* Logo area */}
        <div className="lts-sidebar-logo">
          {(isOpen || isMobile) ? (
            <span className="lts-sidebar-brand">
              LTS<span className="lts-brand-accent">PRICING</span>
            </span>
          ) : <span className="lts-sidebar-brand-mini">LTS</span>}
          <button
            className="lts-sidebar-toggle"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Thu gọn menu" : "Mở menu"}
          >
            {isMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="lts-sidebar-nav">
          {visibleMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`lts-nav-item ${activeModule === item.id ? 'active' : ''}`}
              title={!isOpen && !isMobile ? item.label : undefined}
            >
              <span className="lts-nav-icon">{item.icon}</span>
              {(isOpen || isMobile) && <span className="lts-nav-label">{item.label}</span>}
              {(isOpen || isMobile) && <ChevronRight size={14} className="lts-nav-chevron" />}
            </button>
          ))}
        </nav>

        {/* Role switcher */}
        <div className="lts-sidebar-footer">
          {(isOpen || isMobile) && (
            <div className="lts-role-label">Góc nhìn / Phân quyền</div>
          )}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="lts-role-select"
            title="Chọn vai trò"
          >
            <option value="admin">👑 Quản trị (Admin)</option>
            <option value="sale">💼 Kinh doanh (Sale)</option>
            <option value="tech">⚙️ Kỹ thuật (Sản xuất)</option>
          </select>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// TOP HEADER
// ============================================================
interface TopHeaderProps {
  activeModule: ModuleId;
  onExport: () => void;
  onMenuToggle: () => void;
  isMobile: boolean;
}

function TopHeader({ activeModule, onExport, onMenuToggle, isMobile }: TopHeaderProps) {
  const { theme, setTheme, layoutType, setLayoutType, density, setDensity, result } = useCalculatorStore();

  return (
    <header className="lts-topbar">
      {/* Mobile: hamburger | Desktop: title only */}
      <div className="lts-topbar-left">
        {isMobile && (
          <button className="lts-topbar-menu-btn" onClick={onMenuToggle} aria-label="Menu">
            <Menu size={22} />
          </button>
        )}
        <h1 className="lts-topbar-title">{MODULE_TITLES[activeModule]}</h1>
      </div>

      <div className="lts-topbar-actions">
        {/* Layout/Density toolbar — desktop only, calculator only */}
        {!isMobile && activeModule === 'calculator' && (
          <>
            <div className="toolbar-group" title="Bố cục">
              <button className={`toolbar-btn ${layoutType === 'default' ? 'active' : ''}`} onClick={() => setLayoutType('default')}>☰</button>
              <button className={`toolbar-btn ${layoutType === 'stacked' ? 'active' : ''}`} onClick={() => setLayoutType('stacked')}>▤</button>
              <button className={`toolbar-btn ${layoutType === 'wide'    ? 'active' : ''}`} onClick={() => setLayoutType('wide')}>⬚</button>
              <button className={`toolbar-btn ${layoutType === 'bento'   ? 'active' : ''}`} onClick={() => { setLayoutType('bento'); useCalculatorStore.setState({ activeView: 'bento' }); }}>◫</button>
            </div>
            <div className="toolbar-group" title="Mật độ">
              <button className={`toolbar-btn ${density === 'compact'     ? 'active' : ''}`} onClick={() => setDensity('compact')}>S</button>
              <button className={`toolbar-btn ${density === 'comfortable' ? 'active' : ''}`} onClick={() => setDensity('comfortable')}>M</button>
              <button className={`toolbar-btn ${density === 'spacious'    ? 'active' : ''}`} onClick={() => setDensity('spacious')}>L</button>
            </div>
          </>
        )}

        <button
          className="theme-toggle"
          title="Chuyển đổi Sáng/Tối"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />

        {!isMobile && (
          <button className="btn btn-sm btn-outline" onClick={() => window.print()}>
            <Printer size={14} style={{ display: 'inline', marginRight: '4px' }} />
            In
          </button>
        )}

        {result && !isMobile && (
          <button className="btn btn-sm btn-outline" onClick={onExport}>
            📥 Xuất
          </button>
        )}
      </div>
    </header>
  );
}

// ============================================================
// PLACEHOLDER
// ============================================================
function ModulePlaceholder({ moduleId }: { moduleId: ModuleId }) {
  return (
    <div className="lts-placeholder">
      <Database size={52} className="lts-placeholder-icon" />
      <h2 className="lts-placeholder-title">{MODULE_TITLES[moduleId]}</h2>
      <p className="lts-placeholder-desc">Giao diện đang được tích hợp…</p>
    </div>
  );
}

// ============================================================
// APP SHELL
// ============================================================
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activeModule, setActiveModule] = useState<ModuleId>('calculator');
  const [role, setRole] = useState('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const { result } = useCalculatorStore();

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On first load on mobile, close sidebar by default
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync html classes for overflow control
  useEffect(() => {
    const html = document.documentElement;
    if (activeModule === 'master_data') {
      html.classList.add('in-config-page');
    } else {
      html.classList.remove('in-config-page');
    }
    if (activeModule === 'customers' || activeModule === 'sellers' || activeModule === 'quotations') {
      html.classList.add('in-crm-page');
    } else {
      html.classList.remove('in-crm-page');
    }
    // Mobile always needs scroll
    if (isMobile) {
      html.classList.add('in-crm-page');
    }
  }, [activeModule, isMobile]);

  // Export handler
  const handleExport = () => {
    if (!result) return;
    const r = result;
    const fmtE = (n: number, d = 1) => n.toLocaleString('vi-VN', { maximumFractionDigits: d });
    const fmtPct = (n: number) => parseFloat((n * 100).toFixed(2)) + '%';
    const text = [
      'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
      '═'.repeat(50),
      `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
      `Khách hàng: ${r.input.customer || 'N/A'}`,
      `Sản phẩm: ${r.input.productName || 'N/A'}`,
      `Cấu trúc: ${r.structureText}`,
      `Số lượng: ${r.input.quantity.toLocaleString('vi-VN')} túi`,
      `Kích thước: ${+(r.input.spreadWidth * 1000).toFixed(0)} × ${+(r.input.cutStep * 1000).toFixed(0)} mm²`,
      `Độ dày: ${r.totalThickness} mic`,
      `Trọng lượng: ${fmtE(r.tareWeight, 2)} gr/cái`,
      '',
      'CHI TIẾT GIÁ BÁN / TÚI',
      '─'.repeat(40),
      `Giá vốn + LN:  ${fmtE(r.costPerUnit)} đ`,
      `Zipper:        ${fmtE(r.zipperPerUnit)} đ`,
      `Thùng giấy:    ${fmtE(r.boxPerUnit)} đ`,
      `Vận chuyển:    ${fmtE(r.shippingPerUnit)} đ`,
      `Lãi vay:       ${fmtE(r.interestPerUnit)} đ`,
      `Hoa hồng:      ${fmtE(r.commissionPerUnit)} đ`,
      '─'.repeat(40),
      `GIÁ ĐỀ XUẤT:  ${Math.round(r.finalPrice).toLocaleString('vi-VN')} đ/túi (chưa VAT)`,
      '',
      `Tỉ lệ LN: ${fmtPct(r.profitRate)}`,
      `Doanh thu: ${r.revenue.toLocaleString('vi-VN')} đ`,
      `Giá trục in: ${r.cylinderCost.toLocaleString('vi-VN')} đ (riêng)`,
    ].filter(Boolean).join('\n');

    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `BaoGia_${r.input.customer || 'N_A'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isScrollModule = activeModule !== 'calculator' || isMobile;

  return (
    <div className={`lts-shell ${isMobile ? 'lts-shell--mobile' : ''}`}>
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        role={role}
        setRole={setRole}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div className="lts-shell-main">
        <TopHeader
          activeModule={activeModule}
          onExport={handleExport}
          onMenuToggle={() => setIsSidebarOpen(v => !v)}
          isMobile={isMobile}
        />

        <div className={`lts-shell-content ${isScrollModule ? 'lts-shell-content--scroll' : ''}`}>
          {activeModule === 'calculator' && children}
          {activeModule === 'quotations' && <QuotationModule role={role} currentSellerId="S1" />}
          {activeModule === 'customers' && <CustomerModule role={role} currentSellerId="S1" />}
          {activeModule === 'sellers'   && <SellerModule />}
          {activeModule === 'master_data' && <ConfigPage />}
          
          {activeModule !== 'calculator' &&
           activeModule !== 'quotations' &&
           activeModule !== 'customers' &&
           activeModule !== 'sellers' &&
           activeModule !== 'master_data' && (
            <ModulePlaceholder moduleId={activeModule} />
          )}
        </div>
      </div>
    </div>
  );
}
