import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { ConfigSnapshot, ConfigScope, AppConstants } from '../../lib/types';
import { INITIAL_CONFIG_SNAPSHOTS } from '../../lib/data';
import { luuLocalStorage, LS_CONFIG_SNAPSHOTS } from '../helpers';
import {
  upsertPriceConfigService,
  layLichSuPriceConfigService,
  type PriceConfigApi,
} from '../../lib/api/service-lts';
import {
  scopeToConfigName,
  trichXuatDuLieuScope,
  apDungDuLieuScope,
  priceConfigToSnapshot,
} from '../../lib/api/price-config-mapper';

export interface ConfigVersioningSlice {
  configSnapshots: ConfigSnapshot[];
  selectedConfigSnapshotId: Record<ConfigScope, string | null>;
  dangLuuPhienBan: boolean;
  dangTaiPhienBan: boolean;

  taiPhienBanDinhMuc: (data: ConfigSnapshot[]) => void;
  taoPhienBanDinhMuc: (params: { scope: ConfigScope; name?: string; effectiveMode: 'date' | 'month'; effectiveFrom: string }) => Promise<void>;
  xoaPhienBanDinhMuc: (id: string) => void;
  apDungPhienBanDinhMuc: (id: string, opts?: { silent?: boolean }) => void;
  taiLichSuPhienBanTuServer: (scope: ConfigScope) => Promise<void>;
  timPhienBanDinhMucTheoNgay: (scope: ConfigScope, date: string) => ConfigSnapshot | null;
}

const sapXepTheoHieuLuc = (snapshots: ConfigSnapshot[]) =>
  [...snapshots].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt));

const SCOPE_EMPTY: Record<ConfigScope, string | null> = {
  materials: null, production: null, profit: null,
  surcharges: null, interest: null, waste: null, outsource: null,
};

// Scope labels (ASCII-safe for server logs)
const SCOPE_LABEL: Record<ConfigScope, string> = {
  materials: 'Vat lieu & gia kho nho',
  production: 'Chi phi san xuat',
  profit: 'Bang loi nhuan',
  surcharges: 'Phu phi & phu kien',
  interest: 'Lai vay cong no',
  waste: 'Tham so hao hut',
  outsource: 'Gia cong ngoai',
};

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

function taoSnapshotLocal(
  scope: ConfigScope,
  name: string | undefined,
  effectiveMode: 'date' | 'month',
  effectiveFrom: string,
  state: { materials: ConfigSnapshot['materials']; smallWidthPrices: ConfigSnapshot['smallWidthPrices']; constants: ConfigSnapshot['constants']; profitTable: ConfigSnapshot['profitTable'] },
): ConfigSnapshot {
  const now = new Date().toISOString();
  return {
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
}

export const createConfigVersioningSlice: StateCreator<CuaHangTinhGia, [], [], ConfigVersioningSlice> = (set, get) => ({
  configSnapshots: INITIAL_CONFIG_SNAPSHOTS,
  selectedConfigSnapshotId: { ...SCOPE_EMPTY },
  dangLuuPhienBan: false,
  dangTaiPhienBan: false,

  taiPhienBanDinhMuc: (data) => set({ configSnapshots: sapXepTheoHieuLuc(data) }),

  taoPhienBanDinhMuc: async ({ scope, name, effectiveMode, effectiveFrom }) => {
    const state = get();
    const token = state.accessToken;

    if (state.isAuthenticated && token) {
      set({ dangLuuPhienBan: true });
      try {
        const configName = scopeToConfigName(scope);
        const scopeData = trichXuatDuLieuScope(scope, {
          materials: state.materials,
          smallWidthPrices: state.smallWidthPrices,
          constants: state.constants,
          profitTable: state.profitTable,
        });

        const inputValue = {
          name: name?.trim() || undefined,
          effectiveMode,
          effectiveFrom,
          ...scopeData,
        };

        const priceConfig = await upsertPriceConfigService({ configName, inputValue }, token);

        await get().taiLichSuPhienBanTuServer(scope);

        set((s) => ({
          dangLuuPhienBan: false,
          selectedConfigSnapshotId: { ...s.selectedConfigSnapshotId, [scope]: priceConfig.id },
        }));

        return;
      } catch (e) {
        console.warn('Luu phien ban len server that bai, fallback localStorage:', e);
        set({ dangLuuPhienBan: false });
      }
    }

    const snapshot = taoSnapshotLocal(scope, name, effectiveMode, effectiveFrom, state);
    set((s) => {
      const configSnapshots = sapXepTheoHieuLuc([snapshot, ...s.configSnapshots]);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return {
        configSnapshots,
        selectedConfigSnapshotId: { ...s.selectedConfigSnapshotId, [scope]: snapshot.id },
      };
    });
  },

  taiLichSuPhienBanTuServer: async (scope) => {
    const state = get();
    const token = state.accessToken;
    if (!state.isAuthenticated || !token) return;

    set({ dangTaiPhienBan: true });
    try {
      const configName = scopeToConfigName(scope);
      const versions = await layLichSuPriceConfigService(configName, token);

      const snapshots = versions.map((pc: PriceConfigApi) =>
        priceConfigToSnapshot(pc, scope, {
          materials: state.materials,
          smallWidthPrices: state.smallWidthPrices,
          constants: state.constants,
          profitTable: state.profitTable,
        }),
      );

      set((s) => {
        const otherScopes = s.configSnapshots.filter(snap => snap.scope !== scope);
        const merged = sapXepTheoHieuLuc([...snapshots, ...otherScopes]);
        luuLocalStorage(LS_CONFIG_SNAPSHOTS, merged);
        return { configSnapshots: merged, dangTaiPhienBan: false };
      });
    } catch (e) {
      console.warn('Tai lich su phien ban tu server that bai:', e);
      set({ dangTaiPhienBan: false });
    }
  },

  xoaPhienBanDinhMuc: (id) => {
    const state = get();
    set((s) => {
      const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      const selected = { ...s.selectedConfigSnapshotId };
      for (const scope of Object.keys(selected) as ConfigScope[]) {
        if (selected[scope] === id) selected[scope] = null;
      }
      return { configSnapshots, selectedConfigSnapshotId: selected };
    });
  },

  apDungPhienBanDinhMuc: (id, opts) => {
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
