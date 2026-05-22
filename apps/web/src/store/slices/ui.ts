import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';

export interface UISlice {
  activeView: 'manager' | 'tech' | 'history' | 'config' | 'bento';
  activeModule: 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'production_orders' | 'audit_log';
  layoutType: 'default' | 'stacked' | 'wide' | 'bento';
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark';
  advancedOpen: boolean;
  currentSellerId: string;
  currentSellerName: string;
  role: string;

  setActiveView: (v: UISlice['activeView']) => void;
  setActiveModule: (v: UISlice['activeModule']) => void;
  setLayoutType: (v: UISlice['layoutType']) => void;
  setDensity: (v: UISlice['density']) => void;
  setTheme: (v: UISlice['theme']) => void;
  setAdvancedOpen: (v: boolean) => void;
  setCurrentSeller: (id: string, name: string) => void;
  setRole: (r: string) => void;
  datManHinhDangMo: UISlice['setActiveView'];
  datPhanHeDangMo: UISlice['setActiveModule'];
}

export const createUISlice: StateCreator<CuaHangTinhGia, [], [], UISlice> = (set) => ({
  activeView: 'manager',
  activeModule: 'calculator',
  layoutType: 'default',
  density: 'comfortable',
  theme: 'light',
  advancedOpen: false,
  currentSellerId: 'S1',
  currentSellerName: 'Nguyễn Văn An',
  role: 'admin',

  setActiveView:    (v) => set({ activeView: v }),
  setActiveModule:  (v) => set({ activeModule: v }),
  setLayoutType:    (v) => set({ layoutType: v }),
  setDensity:       (v) => set({ density: v }),
  setTheme:         (v) => set({ theme: v }),
  setAdvancedOpen:  (v) => set({ advancedOpen: v }),
  setCurrentSeller: (id, name) => set({ currentSellerId: id, currentSellerName: name }),
  setRole:          (r) => set({ role: r }),
  datManHinhDangMo: (v) => set({ activeView: v }),
  datPhanHeDangMo:  (v) => set({ activeModule: v }),
});
