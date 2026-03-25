"use client";
import React, { useState } from 'react';
import { useCalculatorStore } from '../../store/calculatorStore';
import {
  Calculator, FileText, Users, Settings, Menu, Factory, Database, Printer, ChevronDown
} from 'lucide-react';

// ============================================================
// MODULE DEFINITION
// ============================================================
type ModuleId = 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'settings';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'calculator',   label: 'Tính giá Sản phẩm',  icon: <Calculator  size={20} />, roles: ['admin', 'sale', 'tech'] },
  { id: 'quotations',   label: 'Danh sách Báo giá',   icon: <FileText    size={20} />, roles: ['admin', 'sale']         },
  { id: 'history_db',   label: 'Lịch sử tính giá',    icon: <Database    size={20} />, roles: ['admin', 'sale']         },
  { id: 'master_data',  label: 'Bảng định mức',        icon: <Factory     size={20} />, roles: ['admin', 'tech']         },
  { id: 'customers',    label: 'Khách hàng',            icon: <Users       size={20} />, roles: ['admin', 'sale']         },
  { id: 'settings',     label: 'Cài đặt hệ thống',     icon: <Settings    size={20} />, roles: ['admin']                 },
];

// ============================================================
// SIDEBAR
// ============================================================
interface SidebarProps {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  role: string;
  setRole: (r: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

function Sidebar({ activeModule, setActiveModule, role, setRole, isOpen, setIsOpen }: SidebarProps) {
  const visibleMenu = MENU_ITEMS.filter(item => item.roles.includes(role));

  return (
    <aside
      className="lts-sidebar"
      style={{ width: isOpen ? '240px' : '72px' }}
    >
      {/* Logo area */}
      <div className="lts-sidebar-logo">
        {isOpen && (
          <span className="lts-sidebar-brand">
            LTS<span className="lts-brand-accent">PRICING</span>
          </span>
        )}
        <button
          className="lts-sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="lts-sidebar-nav">
        {visibleMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`lts-nav-item ${activeModule === item.id ? 'active' : ''}`}
            title={!isOpen ? item.label : undefined}
          >
            <span className="lts-nav-icon">{item.icon}</span>
            {isOpen && <span className="lts-nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Role switcher */}
      <div className="lts-sidebar-footer">
        {isOpen && (
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
  );
}

// ============================================================
// TOP HEADER (per module)
// ============================================================
interface TopHeaderProps {
  activeModule: ModuleId;
  onExport: () => void;
}

const MODULE_TITLES: Record<ModuleId, string> = {
  calculator:  'Hệ thống Tính giá Bao bì Phức hợp',
  quotations:  'Danh sách Báo giá',
  history_db:  'Lịch sử tính giá',
  master_data: 'Bảng định mức vật liệu',
  customers:   'Quản lý Khách hàng',
  settings:    'Cài đặt hệ thống',
};

function TopHeader({ activeModule, onExport }: TopHeaderProps) {
  const { theme, setTheme, layoutType, setLayoutType, density, setDensity, result } = useCalculatorStore();

  return (
    <header className="lts-topbar">
      <h1 className="lts-topbar-title">{MODULE_TITLES[activeModule]}</h1>

      <div className="lts-topbar-actions">
        {/* Layout toolbar – only for calculator */}
        {activeModule === 'calculator' && (
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
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>
          <Printer size={14} style={{ display: 'inline', marginRight: '4px' }} />
          In
        </button>
        {result && (
          <button className="btn btn-sm btn-outline" onClick={onExport}>
            📥 Xuất
          </button>
        )}
      </div>
    </header>
  );
}

// ============================================================
// PLACEHOLDER for non-calculator modules
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

  const { result } = useCalculatorStore();

  // Reuse the same export logic from the old Header
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

  return (
    <div className="lts-shell">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        role={role}
        setRole={setRole}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="lts-shell-main">
        <TopHeader activeModule={activeModule} onExport={handleExport} />

        <div className="lts-shell-content">
          {/* ─── Calculator module: render the existing page children ─── */}
          {activeModule === 'calculator' && children}

          {/* ─── Other modules: placeholder until implemented ─── */}
          {activeModule !== 'calculator' && (
            <ModulePlaceholder moduleId={activeModule} />
          )}
        </div>
      </div>
    </div>
  );
}
