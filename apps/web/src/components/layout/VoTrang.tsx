"use client";
import React, { useState, useEffect } from 'react';
import { dungCuaHangTinhGia } from '../../store/CuaHangTinhGia';
import ModuleKhachHang from '../ModuleKhachHang';
import ModuleNhanVienBan from '../ModuleNhanVienBan';
import ModuleBaoGia from '../ModuleBaoGia';
import ModuleLichSuDB from '../ModuleLichSuDB';
import TrangCauHinh from '../TrangCauHinh';
import ModuleQuanLyNguoiDung from '../ModuleQuanLyNguoiDung';
import ModuleLenhSanXuat from '../ModuleLenhSanXuat';
import {
  Calculator, FileText, Users, Settings, Menu, Factory,
  Database, Printer, Briefcase, X, ChevronRight, Plus,
  UserCog, ClipboardList,
} from 'lucide-react';

// Map vaiTro → sellerId/sellerName tạm thời (sau này thay bằng auth thực)
const BAN_DO_ROLE_NHAN_VIEN: Record<string, { id: string; name: string }> = {
  admin:    { id: 'admin', name: 'Quản trị viên' },
  sale:     { id: 'S1',   name: 'Nguyễn Văn An' },
  purchase: { id: 'P1',   name: 'Thu mua' },
};

// ============================================================
// MODULE DEFINITION
// ============================================================
type MaModule = 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'production_orders';

interface MucMenu {
  id: MaModule;
  label: string;
  icon: React.ReactNode;
  vaiTros: string[];
}

const CAC_MUC_MENU: MucMenu[] = [
  { id: 'calculator',        label: 'Tính giá Sản phẩm',   icon: <Calculator    size={20} />, vaiTros: ['admin', 'sale']            },
  { id: 'quotations',        label: 'Danh sách Báo giá',    icon: <FileText      size={20} />, vaiTros: ['admin', 'sale']            },
  { id: 'history_db',        label: 'Lịch sử tính giá',     icon: <Database      size={20} />, vaiTros: ['admin', 'sale']            },
  { id: 'production_orders', label: 'Lệnh Sản Xuất',        icon: <ClipboardList size={20} />, vaiTros: ['admin', 'purchase']        },
  { id: 'master_data',       label: 'Bảng định mức',         icon: <Factory       size={20} />, vaiTros: ['admin', 'purchase']        },
  { id: 'customers',         label: 'Khách hàng (CRM)',      icon: <Users         size={20} />, vaiTros: ['admin', 'sale']            },
  { id: 'sellers',           label: 'Quản lý Seller',        icon: <Briefcase     size={20} />, vaiTros: ['admin']                   },
  { id: 'users',             label: 'Tài khoản hệ thống',    icon: <UserCog       size={20} />, vaiTros: ['admin']                   },
  { id: 'settings',          label: 'Cài đặt hệ thống',      icon: <Settings      size={20} />, vaiTros: ['admin']                   },
];

const TIEU_DE_MODULE: Record<MaModule, string> = {
  calculator:        'Tính giá Sản phẩm',
  quotations:        'Danh sách Báo giá',
  history_db:        'Lịch sử tính giá',
  master_data:       'Bảng định mức chung',
  production_orders: 'Danh sách Lệnh Sản Xuất',
  customers:         'Quản lý Khách hàng',
  sellers:           'Báo cáo Nhân sự',
  users:             'Tài khoản hệ thống',
  settings:          'Cài đặt hệ thống',
};

// ============================================================
// SIDEBAR
// ============================================================
interface ThuocTinhThanhBen {
  moduleDangMo: MaModule;
  datModuleDangMo: (id: MaModule) => void;
  vaiTro: string;
  datVaiTro: (r: string) => void;
  dangMo: boolean;
  datDangMo: (v: boolean) => void;
  laMobile: boolean;
}

function ThanhBen({ moduleDangMo, datModuleDangMo, vaiTro, datVaiTro, dangMo, datDangMo, laMobile }: ThuocTinhThanhBen) {
  const menuHienThi = CAC_MUC_MENU.filter(item => item.vaiTros.includes(vaiTro));

  const xuLyDieuHuong = (id: MaModule) => {
    datModuleDangMo(id);
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
        <nav className="lts-sidebar-nav">
          {menuHienThi.map((item) => (
            <button
              key={item.id}
              onClick={() => xuLyDieuHuong(item.id)}
              className={`lts-nav-item ${moduleDangMo === item.id ? 'active' : ''}`}
              title={!dangMo && !laMobile ? item.label : undefined}
            >
              <span className="lts-nav-icon">{item.icon}</span>
              {(dangMo || laMobile) && <span className="lts-nav-label">{item.label}</span>}
              {(dangMo || laMobile) && <ChevronRight size={14} className="lts-nav-chevron" />}
            </button>
          ))}
        </nav>

        {/* Role switcher */}
        <div className="lts-sidebar-footer">
          {(dangMo || laMobile) && (
            <div className="lts-vaiTro-label">Góc nhìn / Phân quyền</div>
          )}
          <select
            value={vaiTro}
            onChange={(e) => datVaiTro(e.target.value)}
            className="lts-vaiTro-select"
            title="Chọn vai trò"
          >
            <option value="admin">👑 Quản trị (Admin)</option>
            <option value="sale">💼 Kinh doanh (Sale)</option>
            <option value="purchase">🛒 Thu mua</option>
          </select>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// MOBILE FLOATING MENU
// ============================================================
function MenuNoiMobile({ moduleDangMo, datModuleDangMo, vaiTro, datVaiTro }: {
  moduleDangMo: MaModule;
  datModuleDangMo: (id: MaModule) => void;
  vaiTro: string;
  datVaiTro: (r: string) => void;
}) {
  const [dangMo, datDangMo] = useState(false);
  const activeItem = CAC_MUC_MENU.find(i => i.id === moduleDangMo) || CAC_MUC_MENU[0];

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
              {CAC_MUC_MENU.filter(item => item.vaiTros.includes(vaiTro)).map(item => {
                const isActive = item.id === moduleDangMo;
                return (
                  <button
                    key={item.id}
                    className={`lts-fab-item ${isActive ? 'active' : ''}`}
                    onClick={() => { datModuleDangMo(item.id); datDangMo(false); }}
                  >
                    <span className="lts-fab-icon-wrap">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="lts-fab-vaiTro">
              <div className="lts-vaiTro-label">Chọn quyền xem:</div>
              <select
                value={vaiTro}
                onChange={e => { datVaiTro(e.target.value); datDangMo(false); }}
                className="lts-vaiTro-select"
              >
                <option value="admin">👑 Quản trị (Admin)</option>
                <option value="sale">💼 Kinh doanh (Sale)</option>
                <option value="purchase">🛒 Thu mua</option>
              </select>
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
  const { theme: chuDe, setTheme: datChuDe, layoutType: kieuBoCuc, setLayoutType: datKieuBoCuc, density: matDo, setDensity: datMatDo, result: ketQua, isDirty: dangBan, resetInput: datLaiDauVao } = dungCuaHangTinhGia();
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
            <div className="lts-confirm-icon">âš ï¸</div>
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
          {!laMobile && moduleDangMo === 'calculator' && (
            <>
              <div className="toolbar-group" title="Bố cục">
                <button className={`toolbar-btn ${kieuBoCuc === 'default' ? 'active' : ''}`} onClick={() => datKieuBoCuc('default')}>â˜°</button>
                <button className={`toolbar-btn ${kieuBoCuc === 'stacked' ? 'active' : ''}`} onClick={() => datKieuBoCuc('stacked')}>▤</button>
                <button className={`toolbar-btn ${kieuBoCuc === 'wide'    ? 'active' : ''}`} onClick={() => datKieuBoCuc('wide')}>â¬š</button>
                <button className={`toolbar-btn ${kieuBoCuc === 'bento'   ? 'active' : ''}`} onClick={() => { datKieuBoCuc('bento'); dungCuaHangTinhGia.setState({ activeView: 'bento' }); }}>â—«</button>
              </div>
              <div className="toolbar-group" title="Mật độ">
                <button className={`toolbar-btn ${matDo === 'compact'     ? 'active' : ''}`} onClick={() => datMatDo('compact')}>S</button>
                <button className={`toolbar-btn ${matDo === 'comfortable' ? 'active' : ''}`} onClick={() => datMatDo('comfortable')}>M</button>
                <button className={`toolbar-btn ${matDo === 'spacious'    ? 'active' : ''}`} onClick={() => datMatDo('spacious')}>L</button>
              </div>
            </>
          )}

          <button
            className="theme-toggle"
            title="Chuyển đổi Sáng/Tối"
            onClick={() => datChuDe(chuDe === 'dark' ? 'light' : 'dark')}
          />

          {!laMobile && (
            <button className="btn btn-sm btn-outline" onClick={() => window.print()}>
              <Printer size={14} style={{ display: 'inline', marginRight: '4px' }} />
              In
            </button>
          )}

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
  const [vaiTro, datVaiTro] = useState('admin');
  const [thanhBenDangMo, datThanhBenDangMo] = useState(true);
  const [laMobile, datLaMobile] = useState(false);

  const { result: ketQua, activeModule: moduleDangMo, setActiveModule: datModuleDangMo, setCurrentSeller: datNhanVienHienTai, setRole: datVaiTroStore } = dungCuaHangTinhGia();

  // Sync vaiTro → sellerId/sellerName + store.vaiTro mỗi khi đổi vaiTro
  const xuLyDatVaiTro = (r: string) => {
    datVaiTro(r);
    const nhanVien = BAN_DO_ROLE_NHAN_VIEN[r] ?? { id: r, name: r };
    datNhanVienHienTai(nhanVien.id, nhanVien.name);
    datVaiTroStore(r);
  };

  // Sync initial vaiTro on mount
  useEffect(() => {
    const nhanVien = BAN_DO_ROLE_NHAN_VIEN[vaiTro] ?? { id: vaiTro, name: vaiTro };
    datNhanVienHienTai(nhanVien.id, nhanVien.name);
    datVaiTroStore(vaiTro);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const idNhanVienHienTai = dungCuaHangTinhGia(s => s.currentSellerId);

  return (
    <div className={`lts-shell ${laMobile ? 'lts-shell--mobile' : ''}`}>
      {!laMobile ? (
        <ThanhBen
          moduleDangMo={moduleDangMo}
          datModuleDangMo={datModuleDangMo}
          vaiTro={vaiTro}
          datVaiTro={xuLyDatVaiTro}
          dangMo={thanhBenDangMo}
          datDangMo={datThanhBenDangMo}
          laMobile={false}
        />
      ) : (
        <MenuNoiMobile
          moduleDangMo={moduleDangMo}
          datModuleDangMo={datModuleDangMo}
          vaiTro={vaiTro}
          datVaiTro={xuLyDatVaiTro}
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
          {moduleDangMo === 'quotations'        && <ModuleBaoGia role={vaiTro} />}
          {moduleDangMo === 'history_db'        && <ModuleLichSuDB khiDieuHuong={datModuleDangMo} />}
          {moduleDangMo === 'customers'         && <ModuleKhachHang role={vaiTro} currentSellerId={idNhanVienHienTai} />}
          {moduleDangMo === 'sellers'           && <ModuleNhanVienBan />}
          {moduleDangMo === 'master_data'       && <TrangCauHinh />}
          {moduleDangMo === 'users'             && <ModuleQuanLyNguoiDung />}
          {moduleDangMo === 'production_orders' && <ModuleLenhSanXuat />}
          {/* Fallback: TypeScript đảm bảo MaModule luôn có case ở trên — nếu không có sẽ bắt lỗi compile */}
        </div>
      </div>
    </div>
  );
}
