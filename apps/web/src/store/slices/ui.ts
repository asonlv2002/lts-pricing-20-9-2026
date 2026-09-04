import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { BaoGiaApi } from '../../lib/api/service-lts';
import type { QuotationPricingSheetOrderApi, QuotationPricingSheetOrdersByQuotationApi, PricingSheetApi } from '../../lib/api/service-lts';

export interface UISlice {
  activeView: 'manager' | 'tech' | 'history' | 'config' | 'bento';
  activeModule: 'calculator' | 'quotations' | 'create_lsx' | 'lsx_list' | 'history_db' | 'master_data' | 'customers' | 'settings' | 'users' | 'audit_log' | 'system_metrics';
  /** pick = landing chọn mode (ẩn form); form = đang nhập liệu */
  pricingEntry: 'pick' | 'form';
  layoutType: 'default' | 'stacked' | 'wide' | 'bento';
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark';
  advancedOpen: boolean;
  /** true = đang ở tab "Tạo bảng tính giá (nâng cấp)" — giá lấy từ bảng đặc tả nâng cao */
  cheDoNangCao: boolean;
  /** true = đang ở tab "Tính giá thương mại" — input.pricingMode='commercial', form mua-bán-lại */
  cheDoThuongMai: boolean;
  currentSellerId: string;
  currentSellerName: string;
  role: string;
  baoGiaDangSua: BaoGiaApi | null;
  wizardNguon: 'list' | 'duyet' | null;
  quoteWizardSnapshot: any;
  lsxDangSua: { order: QuotationPricingSheetOrderApi; quotation: QuotationPricingSheetOrdersByQuotationApi } | null;
  lsxTaoTuSheet: {
    baoGia: BaoGiaApi;
    sheet: PricingSheetApi;
  } | null;

  setActiveView: (v: UISlice['activeView']) => void;
  setActiveModule: (v: UISlice['activeModule']) => void;
  setPricingEntry: (v: UISlice['pricingEntry']) => void;
  setLayoutType: (v: UISlice['layoutType']) => void;
  setDensity: (v: UISlice['density']) => void;
  setTheme: (v: UISlice['theme']) => void;
  setAdvancedOpen: (v: boolean) => void;
  setCheDoNangCao: (v: boolean) => void;
  setCurrentSeller: (id: string, name: string) => void;
  setRole: (r: string) => void;
  datBaoGiaDangSua: (bg: BaoGiaApi | null) => void;
  datNguonWizard: (nguon: 'list' | 'duyet' | null) => void;
  datLsxDangSua: (payload: UISlice['lsxDangSua']) => void;
  datLsxTaoTuSheet: (payload: UISlice['lsxTaoTuSheet']) => void;
  datManHinhDangMo: UISlice['setActiveView'];
  datPhanHeDangMo: UISlice['setActiveModule'];
  datQuoteWizardSnapshot: (s: any) => void;
}

export const createUISlice: StateCreator<CuaHangTinhGia, [], [], UISlice> = (set) => ({
  activeView: 'manager',
  activeModule: 'calculator',
  pricingEntry: 'pick',
  layoutType: 'default',
  density: 'comfortable',
  theme: 'light',
  advancedOpen: false,
  cheDoNangCao: false,
  cheDoThuongMai: false,
  currentSellerId: 'S1',
  currentSellerName: 'Nguyễn Văn An',
  role: 'admin',
  baoGiaDangSua: null,
  wizardNguon: null,
  quoteWizardSnapshot: null as any,
  lsxDangSua: null,
  lsxTaoTuSheet: null,

  setActiveView:    (v) => set({ activeView: v }),
  /** Chỉ set state. Điều hướng + URL: dùng dieuHuongModuleApp / dieuHuongMenuApp. */
  setActiveModule:  (v) => set({ activeModule: v }),
  setPricingEntry:  (v) => set({ pricingEntry: v }),
  setLayoutType:    (v) => set({ layoutType: v }),
  setDensity:       (v) => set({ density: v }),
  setTheme:         (v) => set({ theme: v }),
  setAdvancedOpen:  (v) => set({ advancedOpen: v }),
  setCheDoNangCao:  (v) => set({ cheDoNangCao: v }),
  setCheDoThuongMai: (v: boolean) => set({ cheDoThuongMai: v }),
  setCurrentSeller: (id, name) => set({ currentSellerId: id, currentSellerName: name }),
  setRole:          (r) => set({ role: r }),
  datBaoGiaDangSua: (bg) => set({ baoGiaDangSua: bg }),
  datNguonWizard: (nguon) => set({ wizardNguon: nguon }),
  datLsxDangSua: (payload) => set({ lsxDangSua: payload }),
  datLsxTaoTuSheet: (payload) => set({ lsxTaoTuSheet: payload }),
  datManHinhDangMo: (v) => set({ activeView: v }),
  datPhanHeDangMo:  (v) => set({ activeModule: v }),
  datQuoteWizardSnapshot: (s) => set({ quoteWizardSnapshot: s }),
});
