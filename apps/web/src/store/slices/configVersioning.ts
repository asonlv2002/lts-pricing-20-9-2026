import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { ConfigSnapshot, ConfigScope, AppConstants } from '../../lib/types';
import { INITIAL_CONFIG_SNAPSHOTS } from '../../lib/data';
import { luuLocalStorage, LS_CONFIG_SNAPSHOTS } from '../helpers';
import {
  upsertPriceConfigService,
  layLichSuPriceConfigService,
  layPriceConfigMoiNhatService,
  xoaPriceConfigService,
  type PriceConfigApi,
} from '../../lib/api/service-lts';
import {
  scopeToConfigName,
  configNameToScope,
  trichXuatDuLieuScope,
  apDungDuLieuScope,
  priceConfigToSnapshot,
} from '../../lib/api/price-config-mapper';
import { seedPriceConfigCache } from '../../lib/api/price-config-cache';

const CAC_SCOPE_CAU_HINH: ConfigScope[] = [
  'materials', 'production', 'profit', 'surcharges', 'interest', 'waste', 'outsource',
];

export interface ConfigVersioningSlice {
  configSnapshots: ConfigSnapshot[];
  dangLuuPhienBan: boolean;
  dangTaiPhienBan: boolean;
  dangXemPhienBan: boolean;
  phienBanDangXemId: string | null;

  taiPhienBanDinhMuc: (data: ConfigSnapshot[]) => void;
  taoPhienBanDinhMuc: (params: { scope: ConfigScope; name?: string; effectiveMode: 'date' | 'month'; effectiveFrom: string }) => Promise<void>;
  xoaPhienBanDinhMuc: (id: string) => Promise<{ success: true } | { success: false; pricingSheetNames: string[] }>;
  xemPhienBanDinhMuc: (id: string) => void;
  saoChepPhienBanDinhMuc: (id: string) => void;
  thoatXemPhienBan: () => void;
  taiLichSuPhienBanTuServer: (scope: ConfigScope) => Promise<void>;
  /** Bootstrap: 1 request latest-version thay vì 7× history. */
  taiCauHinhMoiNhatTuServer: () => Promise<void>;
}

const sapXepTheoHieuLuc = (snapshots: ConfigSnapshot[]) =>
  [...snapshots].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt));

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
    'laborCost', 'printPressLabor', 'printPressElectric', 'printPressTime',
    'laminatePressLabor', 'laminatePressElectric', 'laminatePressTime',
    'slitPressLabor', 'slitPressElectric', 'slitPressTime',
    'bagPressLabor', 'bagPressElectric', 'bagPressTime',
    'cpsxUpgradeElectric', 'cpsxUpgradeLabor', 'cpsxUpgradeInk',
    'ghepCPSX', 'cutBase', 'cutThreshold1', 'cutThreshold2',
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
  interest: ['interestBase', 'interestSpread', 'paymentDays', 'customPaymentDays'],
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
  dangLuuPhienBan: false,
  dangTaiPhienBan: false,
  dangXemPhienBan: false,
  phienBanDangXemId: null,

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
      return { configSnapshots };
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

  taiCauHinhMoiNhatTuServer: async () => {
    const state = get();
    const token = state.accessToken;
    if (!state.isAuthenticated || !token) return;

    set({ dangTaiPhienBan: true });
    try {
      const list = await layPriceConfigMoiNhatService(token);
      seedPriceConfigCache(list);
      const fallback = {
        materials: state.materials,
        smallWidthPrices: state.smallWidthPrices,
        constants: state.constants,
        profitTable: state.profitTable,
      };
      const snapshots = list
        .map((pc) => {
          const scope = configNameToScope(pc.configName);
          if (!scope) return null;
          return priceConfigToSnapshot(pc, scope, fallback) as ConfigSnapshot;
        })
        .filter((s): s is ConfigSnapshot => s !== null);

      set((s) => {
        const byScopeLatest = new Map(
          snapshots.map((sn) => [sn.scope ?? 'materials', sn] as const),
        );
        const others = s.configSnapshots.filter(
          (sn) => !byScopeLatest.has(sn.scope ?? 'materials'),
        );
        const merged = sapXepTheoHieuLuc([...snapshots, ...others]);
        luuLocalStorage(LS_CONFIG_SNAPSHOTS, merged);
        return { configSnapshots: merged, dangTaiPhienBan: false };
      });

      const after = get();
      for (const scope of CAC_SCOPE_CAU_HINH) {
        const candidates = after.configSnapshots.filter(
          (sn) => (sn.scope ?? 'materials') === scope,
        );
        if (!candidates.length) continue;
        const latest = [...candidates].sort(
          (a, b) =>
            b.effectiveFrom.localeCompare(a.effectiveFrom) ||
            b.updatedAt.localeCompare(a.updatedAt),
        )[0];
        if (latest) after.saoChepPhienBanDinhMuc(latest.id);
      }
      // Snapshot session sau khi apply latest — pin sheet restore về đây
      get().luuSessionConfigSnapshot();
    } catch (e) {
      console.warn('Tải cấu hình mới nhất thất bại:', e);
      set({ dangTaiPhienBan: false });
    }
  },

  xoaPhienBanDinhMuc: async (id) => {
    const state = get();
    const token = state.accessToken;

    if (state.isAuthenticated && token) {
      const ketQua = await xoaPriceConfigService(id, token);
      if (ketQua.success) {
        set((s) => {
          const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
          luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
          return { configSnapshots };
        });
      }
      return ketQua;
    }

    set((s) => {
      const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return { configSnapshots };
    });
    return { success: true as const };
  },

  xemPhienBanDinhMuc: (id) => {
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

    set({ dangXemPhienBan: true, phienBanDangXemId: id });
  },

  saoChepPhienBanDinhMuc: (id) => {
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

    set({ dangXemPhienBan: false, phienBanDangXemId: null });
  },

  thoatXemPhienBan: () => {
    const state = get();
    const phienBanDangXemId = state.phienBanDangXemId;
    if (!phienBanDangXemId) { set({ dangXemPhienBan: false }); return; }

    const snapshot = state.configSnapshots.find(s => s.id === phienBanDangXemId);
    const scope = snapshot?.scope ?? 'materials';
    const candidates = state.configSnapshots
      .filter(s => (s.scope ?? 'materials') === scope)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt));
    const latest = candidates[0];
    if (latest) {
      get().saoChepPhienBanDinhMuc(latest.id);
    } else {
      set({ dangXemPhienBan: false, phienBanDangXemId: null });
    }
  },
});
