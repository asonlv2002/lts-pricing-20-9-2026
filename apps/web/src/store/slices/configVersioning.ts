import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { ConfigSnapshot, ConfigScope, AppConstants } from '../../lib/types';
import { INITIAL_CONFIG_SNAPSHOTS } from '../../lib/data';
import { luuLocalStorage, LS_CONFIG_SNAPSHOTS } from '../helpers';

export interface ConfigVersioningSlice {
  configSnapshots: ConfigSnapshot[];
  selectedConfigSnapshotId: Record<ConfigScope, string | null>;

  taiPhienBanDinhMuc: (data: ConfigSnapshot[]) => void;
  taoPhienBanDinhMuc: (params: { scope: ConfigScope; name?: string; effectiveMode: 'date' | 'month'; effectiveFrom: string }) => void;
  xoaPhienBanDinhMuc: (id: string) => void;
  apDungPhienBanDinhMuc: (id: string) => void;
  timPhienBanDinhMucTheoNgay: (scope: ConfigScope, date: string) => ConfigSnapshot | null;
}

const sapXepTheoHieuLuc = (snapshots: ConfigSnapshot[]) =>
  [...snapshots].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt));

const SCOPE_EMPTY: Record<ConfigScope, string | null> = {
  materials: null, production: null, profit: null,
  surcharges: null, interest: null, waste: null, outsource: null,
};

const SCOPE_LABEL: Record<ConfigScope, string> = {
  materials: 'Vật liệu & giá khổ nhỏ',
  production: 'Chi phí sản xuất',
  profit: 'Bảng lợi nhuận',
  surcharges: 'Phụ phí & phụ kiện',
  interest: 'Lãi vay công nợ',
  waste: 'Tham số hao hụt',
  outsource: 'Gia công ngoài',
};

// Các key của AppConstants thuộc từng scope
const SCOPE_CONSTANT_KEYS: Record<ConfigScope, (keyof AppConstants)[]> = {
  materials: [],
  production: [
    'laborCost', 'ghepCPSX', 'cutBase', 'cutThreshold1', 'cutThreshold2',
    'cutMult1', 'cutMult2', 'cutMult3', 'cutRules', 'cylinderPricePerUnit', 'cylPriceA', 'cylPriceB',
    'nhuPrice', 'moPrice', 'colorSetup',
  ],
  profit: [],
  surcharges: [
    'zipperPrice', 'zipperWeight', 'tapePrice', 'tapeWeight',
    'handlePrice', 'handleWeight', 'handleOptions',
    'boxPriceDefault', 'bagsPerBoxDefault', 'boxOptions',
    'shippingPerKmDefault', 'shippingKmDefault',
  ],
  interest: ['interestBase', 'interestSpread', 'paymentDays'],
  waste: ['printWasteA', 'printWasteB', 'printWasteC', 'printWasteD', 'colorSetup',
          'ghepWasteA', 'ghepWasteB', 'ghepWasteC', 'cutWasteA', 'cutWasteB', 'cutWasteC'],
  outsource: [],
};

export const createConfigVersioningSlice: StateCreator<CuaHangTinhGia, [], [], ConfigVersioningSlice> = (set, get) => ({
  configSnapshots: INITIAL_CONFIG_SNAPSHOTS,
  selectedConfigSnapshotId: { ...SCOPE_EMPTY },

  taiPhienBanDinhMuc: (data) => set({ configSnapshots: sapXepTheoHieuLuc(data) }),

  taoPhienBanDinhMuc: ({ scope, name, effectiveMode, effectiveFrom }) => {
    const state = get();
    const now = new Date().toISOString();
    const snapshot: ConfigSnapshot = {
      id: crypto.randomUUID(),
      scope,
      name: name?.trim() || undefined,
      effectiveMode,
      effectiveFrom,
      createdAt: now,
      updatedAt: now,
      materials: structuredClone(state.materials),
      smallWidthPrices: structuredClone(state.smallWidthPrices),
      constants: structuredClone(state.constants),
      profitTable: structuredClone(state.profitTable),
    };

    set((s) => {
      const configSnapshots = sapXepTheoHieuLuc([snapshot, ...s.configSnapshots]);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return {
        configSnapshots,
        selectedConfigSnapshotId: { ...s.selectedConfigSnapshotId, [scope]: snapshot.id },
      };
    });
    state.ghiNhatKy({
      userId: state.currentSellerId,
      userName: state.currentSellerName,
      action: 'create',
      targetType: 'config',
      targetId: snapshot.id,
      targetName: snapshot.name || SCOPE_LABEL[scope],
      after: { scope, name: snapshot.name, effectiveMode, effectiveFrom },
      note: 'Tạo phiên bản định mức',
    });
  },

  xoaPhienBanDinhMuc: (id) => {
    const state = get();
    const old = state.configSnapshots.find(snapshot => snapshot.id === id);
    set((s) => {
      const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      const selected = { ...s.selectedConfigSnapshotId };
      for (const scope of Object.keys(selected) as ConfigScope[]) {
        if (selected[scope] === id) selected[scope] = null;
      }
      return { configSnapshots, selectedConfigSnapshotId: selected };
    });
    if (old) {
      state.ghiNhatKy({
        userId: state.currentSellerId,
        userName: state.currentSellerName,
        action: 'delete',
        targetType: 'config',
        targetId: id,
        targetName: old.name || SCOPE_LABEL[old.scope],
        before: { scope: old.scope, name: old.name, effectiveMode: old.effectiveMode, effectiveFrom: old.effectiveFrom },
        note: 'Xóa phiên bản định mức',
      });
    }
  },

  apDungPhienBanDinhMuc: (id) => {
    const state = get();
    const snapshot = state.configSnapshots.find(item => item.id === id);
    if (!snapshot) return;

    const scope = snapshot.scope ?? 'materials';
    const keys = SCOPE_CONSTANT_KEYS[scope] ?? [];

    if (scope === 'materials') {
      state.replaceFullConfig({
        materials: structuredClone(snapshot.materials),
        smallWidthPrices: structuredClone(snapshot.smallWidthPrices),
        constants: state.constants,
        profitTable: state.profitTable,
      });
    } else if (scope === 'profit') {
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: state.constants,
        profitTable: structuredClone(snapshot.profitTable),
      });
    } else if (keys.length > 0) {
      const constantsMoi = { ...state.constants };
      for (const key of keys) {
        (constantsMoi as any)[key] = structuredClone((snapshot.constants as any)[key]);
      }
      state.replaceFullConfig({
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: constantsMoi,
        profitTable: state.profitTable,
      });
    }

    set((s) => ({
      selectedConfigSnapshotId: { ...s.selectedConfigSnapshotId, [scope]: id },
    }));
    state.ghiNhatKy({
      userId: state.currentSellerId,
      userName: state.currentSellerName,
      action: 'version_restore',
      targetType: 'config',
      targetId: id,
      targetName: snapshot.name || SCOPE_LABEL[scope],
      after: { scope, name: snapshot.name, effectiveMode: snapshot.effectiveMode, effectiveFrom: snapshot.effectiveFrom },
      note: 'Áp dụng phiên bản định mức',
    });
  },

  timPhienBanDinhMucTheoNgay: (scope, date) => {
    const targetMonth = date.slice(0, 7);
    const candidates = get().configSnapshots.filter(snapshot => {
      if (snapshot.scope !== scope) return false;
      if (snapshot.effectiveMode === 'month') return snapshot.effectiveFrom <= targetMonth;
      return snapshot.effectiveFrom <= date;
    });
    return sapXepTheoHieuLuc(candidates)[0] ?? null;
  },
});
